// GitHub API 호출 로직
// 빌드 타임에 실행되며 .env 의 GITHUB_TOKEN 이 있으면 인증 요청, 없으면 비인증 폴백
//
// 빌드 1회 내 중복 호출 방지를 위한 모듈 스코프 메모이제이션:
// - 같은 빌드에서 getAllRepoCards / getStaticPaths / getRepoDetail 이 같은 URL 을 호출해도
//   실제 네트워크 fetch 는 1번만 일어나도록 Promise 단위로 캐시한다

import type { GitHubRepo, GitHubReadme, GitHubRelease } from './types';

// jongcheol-pak 계정 고정
const OWNER = 'jongcheol-pak';
const API_BASE = 'https://api.github.com';

// MOCK_REPOS=1 로 빌드 시 로컬 fixture 로 대체
declare const __BUILD_MOCK__: boolean;
const USE_MOCK = __BUILD_MOCK__;

type MockFixtures = {
  makeMockRepos: (count?: number) => GitHubRepo[];
  makeMockReadme: (repoName: string) => string;
  makeMockReleases: (repoName: string) => GitHubRelease[];
};

let mockFixturesPromise: Promise<MockFixtures | null> | null = null;
function loadMockFixtures(): Promise<MockFixtures | null> {
  if (!__BUILD_MOCK__) return Promise.resolve(null);
  if (mockFixturesPromise) return mockFixturesPromise;
  mockFixturesPromise = (async () => {
    try {
      const mod = (await import('../test-fixtures/mock-repos')) as MockFixtures;
      console.log('[github] MOCK_REPOS=1 감지 — fixture 저장소로 빌드합니다.');
      return mod;
    } catch (err) {
      console.warn(
        '[github] MOCK_REPOS=1 이지만 fixture 파일을 로드하지 못했습니다. 실제 GitHub API 로 폴백:',
        (err as Error).message,
      );
      return null;
    }
  })();
  return mockFixturesPromise;
}

// 네트워크/Rate Limit 실패 전용 에러
export class GitHubFetchError extends Error {
  status: number;
  url: string;
  constructor(message: string, status: number, url: string) {
    super(message);
    this.name = 'GitHubFetchError';
    this.status = status;
    this.url = url;
  }
}

interface FetchOptions {
  notFoundIsNull?: boolean;
}

async function githubFetch<T>(
  url: string,
  opts: FetchOptions = {},
): Promise<{ data: T | null; response: Response }> {
  const { notFoundIsNull = true } = opts;
  const token = import.meta.env.GITHUB_TOKEN ?? process.env.GITHUB_TOKEN;

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'jongcheol-pak-homepage',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, { headers });
    if (res.status === 404) {
      if (notFoundIsNull) return { data: null, response: res };
      throw new GitHubFetchError(`404 Not Found`, 404, url);
    }
    if (!res.ok) {
      const remaining = res.headers.get('x-ratelimit-remaining');
      const rateLimited = remaining === '0';
      console.error(`[github] ${res.status} ${res.statusText} for ${url}`);
      if (rateLimited) {
        console.error('[github] Rate limit exceeded. Set GITHUB_TOKEN in .env to increase limit.');
      }
      throw new GitHubFetchError(
        `${res.status} ${res.statusText}${rateLimited ? ' (rate limit)' : ''}`,
        res.status,
        url,
      );
    }
    const data = (await res.json()) as T;
    return { data, response: res };
  } catch (err) {
    if (err instanceof GitHubFetchError) throw err;
    console.error(`[github] fetch error for ${url}:`, err);
    throw new GitHubFetchError(`network error: ${(err as Error).message}`, 0, url);
  }
}

async function githubFetchData<T>(url: string, opts: FetchOptions = {}): Promise<T | null> {
  return (await githubFetch<T>(url, opts)).data;
}

// GitHub Link 헤더에서 rel="next" URL 파싱
function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(',')) {
    const m = part.match(/<([^>]+)>\s*;\s*rel="next"/);
    if (m) return m[1];
  }
  return null;
}

// 동시성 제한 순회 (secondary rate limit 회피)
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, idx: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array(Math.min(Math.max(1, limit), items.length))
    .fill(0)
    .map(async () => {
      while (true) {
        const i = next++;
        if (i >= items.length) return;
        results[i] = await fn(items[i], i);
      }
    });
  await Promise.all(workers);
  return results;
}

// 모듈 스코프 메모이제이션
let reposPromise: Promise<GitHubRepo[]> | null = null;
const readmeCache = new Map<string, Promise<string | null>>();
const releasesCache = new Map<string, Promise<GitHubRelease[]>>();
const languagesCache = new Map<string, Promise<Record<string, number> | null>>();
const commitActivityCache = new Map<string, Promise<number[] | null>>();

// public 저장소 전수 조회 (Link 헤더 기반 페이지네이션)
export function fetchPublicRepos(): Promise<GitHubRepo[]> {
  if (reposPromise) return reposPromise;
  const firstUrl = `${API_BASE}/users/${OWNER}/repos?type=public&per_page=100&sort=updated`;
  reposPromise = (async () => {
    if (USE_MOCK) {
      const fx = await loadMockFixtures();
      if (fx) return fx.makeMockRepos();
    }
    const acc: GitHubRepo[] = [];
    let nextUrl: string | null = firstUrl;
    while (nextUrl) {
      const { data, response } = await githubFetch<GitHubRepo[]>(nextUrl);
      if (!data) break;
      acc.push(...data);
      nextUrl = parseNextLink(response.headers.get('Link'));
    }
    return acc;
  })();
  return reposPromise;
}

// README 조회 (base64 디코딩된 raw markdown)
export function fetchReadme(repoName: string): Promise<string | null> {
  const cached = readmeCache.get(repoName);
  if (cached) return cached;

  const url = `${API_BASE}/repos/${OWNER}/${repoName}/readme`;
  const p = (async () => {
    if (USE_MOCK) {
      const fx = await loadMockFixtures();
      if (fx) return fx.makeMockReadme(repoName);
    }
    try {
      const data = await githubFetchData<GitHubReadme>(url);
      if (!data || data.encoding !== 'base64') return null;
      return Buffer.from(data.content, 'base64').toString('utf-8');
    } catch (err) {
      console.error(`[github] README fetch failed for ${repoName}, skipping:`, err);
      return null;
    }
  })();
  readmeCache.set(repoName, p);
  return p;
}

// 릴리스 목록 (최신 순, 최대 20개)
export function fetchReleases(repoName: string): Promise<GitHubRelease[]> {
  const cached = releasesCache.get(repoName);
  if (cached) return cached;

  const url = `${API_BASE}/repos/${OWNER}/${repoName}/releases?per_page=20`;
  const p = (async () => {
    if (USE_MOCK) {
      const fx = await loadMockFixtures();
      if (fx) return fx.makeMockReleases(repoName);
    }
    try {
      const data = await githubFetchData<GitHubRelease[]>(url);
      return data ?? [];
    } catch (err) {
      console.error(`[github] releases fetch failed for ${repoName}, using empty list:`, err);
      return [];
    }
  })();
  releasesCache.set(repoName, p);
  return p;
}

// 저장소 언어 분포 — { Language: bytes } 형태. 빈 저장소나 미감지 시 빈 객체 반환
// 실패(404/네트워크/rate limit) 시 null 반환 → 카드 푸터 미니 바 미렌더 폴백
export function fetchLanguages(repoName: string): Promise<Record<string, number> | null> {
  const cached = languagesCache.get(repoName);
  if (cached) return cached;

  const url = `${API_BASE}/repos/${OWNER}/${repoName}/languages`;
  const p = (async () => {
    if (USE_MOCK) {
      // mock 모드는 fixture 인터페이스에 languages 가 없어 항상 null 폴백
      return null;
    }
    try {
      return await githubFetchData<Record<string, number>>(url);
    } catch (err) {
      console.error(`[github] languages fetch failed for ${repoName}, skipping:`, err);
      return null;
    }
  })();
  languagesCache.set(repoName, p);
  return p;
}

// 최근 4주 주별 commit 수 — GitHub stats API
// - 202: stats 캐시 워밍업 중. 1.5s 대기 × 최대 3회 재시도 후 실패 시 null
// - 404/451: 빈/접근 불가 → null (sparkline 미렌더 폴백)
// - 정상 응답: 52주 중 마지막 4주의 total 만 추출 (오래된 주 → 최신 주 순)
// - mock 모드는 항상 null
export function fetchCommitActivity(repoName: string): Promise<number[] | null> {
  const cached = commitActivityCache.get(repoName);
  if (cached) return cached;

  const url = `${API_BASE}/repos/${OWNER}/${repoName}/stats/commit_activity`;
  const p = (async () => {
    if (USE_MOCK) return null;

    const token = import.meta.env.GITHUB_TOKEN ?? process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'jongcheol-pak-homepage',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url, { headers });
        if (res.status === 202) {
          // 워밍업 중: 1.5s 대기 후 재시도
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        if (res.status === 404 || res.status === 451) return null;
        if (!res.ok) {
          console.error(
            `[github] commit_activity ${res.status} ${res.statusText} for ${repoName}`,
          );
          return null;
        }
        const data = (await res.json()) as Array<{ total: number; week: number }>;
        if (!Array.isArray(data) || data.length === 0) return null;
        // 마지막 4주만 추출 (오래된 주 → 최신 주 순서)
        return data.slice(-4).map((w) => w.total);
      } catch (err) {
        console.error(`[github] commit_activity fetch failed for ${repoName}:`, err);
        return null;
      }
    }
    // 3회 시도해도 워밍업 끝나지 않음 — 미렌더 폴백
    console.warn(`[github] commit_activity warm-up timed out for ${repoName}`);
    return null;
  })();
  commitActivityCache.set(repoName, p);
  return p;
}

export { OWNER };
