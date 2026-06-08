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

// GitHub REST API 공통 헤더 (githubFetch / fetchCommitActivity 의 raw fetch 양쪽에서 사용)
function buildGithubHeaders(): Record<string, string> {
  const token = import.meta.env.GITHUB_TOKEN ?? process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'jongcheol-pak-homepage',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function githubFetch<T>(
  url: string,
  opts: FetchOptions = {},
): Promise<{ data: T | null; response: Response }> {
  const { notFoundIsNull = true } = opts;
  const headers = buildGithubHeaders();

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

// 상세 헤더 라벨용 정규화 파일명 + 본문을 함께 전달
type ReadmeDoc = { content: string; fileName: 'README.md' | 'HELP.md' };

// 모듈 스코프 메모이제이션
let reposPromise: Promise<GitHubRepo[]> | null = null;
const readmeCache = new Map<string, Promise<ReadmeDoc | null>>();
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
    let skippedCount = 0;
    while (nextUrl) {
      const { data, response } = await githubFetch<GitHubRepo[]>(nextUrl);
      if (!data) break;
      // M-2: 응답 무결성 게이트 — `name` 이 비정상이면 후속 메모이제이션 키/URL 조립이 깨지므로 폴백
      // (GitHub API 스키마 침묵 변경 대비. 게이트 실패는 reject 가 아닌 skip + warn — fail-soft 유지)
      for (const repo of data) {
        if (typeof repo?.name === 'string' && repo.name.length > 0) {
          acc.push(repo);
        } else {
          skippedCount += 1;
        }
      }
      nextUrl = parseNextLink(response.headers.get('Link'));
    }
    if (skippedCount > 0) {
      console.warn(`[github] fetchPublicRepos: skipped ${skippedCount} entries without a valid name.`);
    }
    return acc;
  })();
  return reposPromise;
}

// 상세/카드/검색에서 우선 표시할 help.md 변형 (contents API 는 케이스 구분 → 변형 순차 시도)
const HELP_VARIANTS = ['help.md', 'HELP.md', 'Help.md'] as const;

// contents API 로 단일 파일 raw 텍스트 조회 — 404/디렉터리(배열)/비base64/빈내용이면 null
async function fetchFileViaContents(repoName: string, path: string): Promise<string | null> {
  const url = `${API_BASE}/repos/${OWNER}/${repoName}/contents/${path}`;
  // 경로가 디렉터리면 배열(요소에 content 없음) → Array.isArray 로 먼저 배제 후 단일 파일로 좁힘
  const data = await githubFetchData<unknown>(url);
  if (!data || Array.isArray(data)) return null;
  const file = data as GitHubReadme;
  if (file.encoding !== 'base64' || !file.content) return null;
  return Buffer.from(file.content, 'base64').toString('utf-8');
}

// 문서 조회 (base64 디코딩된 raw markdown)
// help.md(대소문자 변형 포함) 가 있으면 우선, 없으면 README 폴백.
// fileName 은 상세 헤더 라벨용 정규화 값
export function fetchReadme(repoName: string): Promise<ReadmeDoc | null> {
  const cached = readmeCache.get(repoName);
  if (cached) return cached;

  const readmeUrl = `${API_BASE}/repos/${OWNER}/${repoName}/readme`;
  const p = (async (): Promise<ReadmeDoc | null> => {
    if (USE_MOCK) {
      const fx = await loadMockFixtures();
      if (fx) {
        const md = fx.makeMockReadme(repoName);
        return md ? { content: md, fileName: 'README.md' } : null;
      }
    }
    try {
      // 1) help.md 변형 우선 시도 (첫 성공 시 중단)
      for (const variant of HELP_VARIANTS) {
        const help = await fetchFileViaContents(repoName, variant);
        if (help) return { content: help, fileName: 'HELP.md' };
      }
      // 2) README 폴백 (/readme 엔드포인트는 케이스 자동 탐지)
      const data = await githubFetchData<GitHubReadme>(readmeUrl);
      if (!data || data.encoding !== 'base64') return null;
      return { content: Buffer.from(data.content, 'base64').toString('utf-8'), fileName: 'README.md' };
    } catch (err) {
      console.error(`[github] README/help fetch failed for ${repoName}, skipping:`, err);
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

// 최근 4주 주별 commit 수 — GitHub commits API (plan v4 후속, stats endpoint 워밍업
// 미작동 이슈 회피). 이전에 사용하던 `stats/commit_activity` 는 활동 적은 저장소에서는
// GitHub 가 stats 캐시를 만들지 않아 25s+ 대기해도 202 만 반환 → commits 엔드포인트로 전환.
//
// - `commits?since=<28일전 ISO>&per_page=100` paginated 호출 (활동 적은 저장소는 1회로 완결)
// - 각 commit 의 `commit.author.date` 를 7일 단위 4 bucket 에 카운트
// - 반환: [week-3, week-2, week-1, week-0] (오래된 주 → 최신 주, ActivitySpark 입력 호환)
// - 4주 commit 0건 / 404 / rate limit / 네트워크 실패 → null (sparkline 미렌더 폴백)
// - mock 모드는 항상 null

interface GitHubCommitListItem {
  commit: {
    author: { date: string } | null;
    committer: { date: string } | null;
  };
}

const COMMIT_ACTIVITY_DAYS = 28;

export function fetchCommitActivity(repoName: string): Promise<number[] | null> {
  const cached = commitActivityCache.get(repoName);
  if (cached) return cached;

  const p = (async () => {
    if (USE_MOCK) return null;

    const since = new Date(Date.now() - COMMIT_ACTIVITY_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const firstUrl =
      `${API_BASE}/repos/${OWNER}/${repoName}/commits` +
      `?since=${encodeURIComponent(since)}&per_page=100`;

    try {
      const allCommits: GitHubCommitListItem[] = [];
      let nextUrl: string | null = firstUrl;
      while (nextUrl) {
        const { data, response } = await githubFetch<GitHubCommitListItem[]>(nextUrl);
        if (!data) break;
        allCommits.push(...data);
        nextUrl = parseNextLink(response.headers.get('Link'));
      }

      if (allCommits.length === 0) return null;

      // 7일 단위 4 bucket: index 0 = 28~22일 전, index 3 = 지난 7일
      const now = Date.now();
      const buckets = [0, 0, 0, 0];
      // M-2: date 파싱 실패는 침묵 continue 였으나, 빌드 투명성 위해 1회만 warn 노출
      // (반복 경고로 빌드 로그가 오염되지 않도록 저장소 단위 1회 제한)
      let dateParseWarnedThisRepo = false;
      for (const c of allCommits) {
        const dateStr = c.commit?.author?.date ?? c.commit?.committer?.date;
        if (!dateStr) continue;
        const ts = new Date(dateStr).getTime();
        if (Number.isNaN(ts)) {
          if (!dateParseWarnedThisRepo) {
            console.warn(
              `[github] commit_activity: invalid date "${dateStr}" for ${repoName}, skipping malformed entries.`,
            );
            dateParseWarnedThisRepo = true;
          }
          continue;
        }
        const daysAgo = Math.floor((now - ts) / (24 * 60 * 60 * 1000));
        if (daysAgo < 0 || daysAgo >= COMMIT_ACTIVITY_DAYS) continue;
        const weekIdx = 3 - Math.floor(daysAgo / 7);
        if (weekIdx >= 0 && weekIdx < 4) buckets[weekIdx] += 1;
      }
      // 모든 주가 0 이면 미렌더 (가드 `.some((v) => v > 0)` 와 동일 효과)
      if (buckets.every((v) => v === 0)) return null;
      return buckets;
    } catch (err) {
      console.error(`[github] commit_activity fetch failed for ${repoName}:`, err);
      return null;
    }
  })();
  commitActivityCache.set(repoName, p);
  return p;
}

export { OWNER };
