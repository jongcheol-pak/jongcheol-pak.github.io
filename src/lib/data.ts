// 빌드 타임 데이터 페칭: GitHub에서 저장소 목록 + README 를 가져와
// 카드 렌더링용 RepoCardData 배열로 정규화
// 또한 상세 페이지용 RepoDetailData 조립 (README 전문 HTML + Releases + Download URL)

import {
  fetchPublicRepos,
  fetchReadme,
  fetchReleases,
  fetchLanguages,
  fetchCommitActivity,
  mapLimit,
  OWNER,
} from './github';
import { extractFirstImage, extractSummary, renderMarkdown } from './readme';
import { toPlainText, truncateBytes, SEARCH_INDEX_MAX_BYTES_PER_DOC } from './search-index';
import { localizeThumbnail } from './thumbnail';

// GitHub API 동시 inflight 상한 (secondary rate limit ~100/min 회피)
const API_CONCURRENCY = 8;
import overridesData from '../data/repo-overrides.json';
import type {
  RepoCardData,
  RepoDetailData,
  GitHubRepo,
  GitHubRelease,
  RepoOverridesMap,
  RecentReleaseItem,
  WorkspaceInsights,
  OwnerProfile,
} from './types';

// 홈페이지 자체 저장소: user pages 의 호스트 저장소 이름 패턴
// jongcheol-pak.github.io 가 본인 사이트 자체이므로 카드에서 제외
const HOMEPAGE_REPO = 'jongcheol-pak.github.io';

const overrides = overridesData as RepoOverridesMap;

// 언어 분포(bytes 맵)에서 상위 3개만 추출하고, 그 셋의 합 기준으로 ratio 정규화 (합 = 1.0)
// 자잘한 4번째 이하 언어는 시각 노이즈가 되므로 미니 바에서 제외
function normalizeTopLanguages(
  data: Record<string, number> | null,
): Array<{ name: string; ratio: number }> | undefined {
  if (!data) return undefined;
  const entries = Object.entries(data).filter(([, bytes]) => bytes > 0);
  if (entries.length === 0) return undefined;
  const top = entries.sort((a, b) => b[1] - a[1]).slice(0, 3);
  const topTotal = top.reduce((sum, [, bytes]) => sum + bytes, 0);
  if (topTotal === 0) return undefined;
  return top.map(([name, bytes]) => ({ name, ratio: bytes / topTotal }));
}

async function buildCardData(repo: GitHubRepo): Promise<RepoCardData | null> {
  // README 와 언어 분포는 독립 호출 → 병렬화
  const [readme, languagesData] = await Promise.all([
    fetchReadme(repo.name),
    fetchLanguages(repo.name),
  ]);

  // README 없으면 카드 목록에서 제외
  if (!readme) return null;

  const rawImageUrl = extractFirstImage(readme, repo.name, repo.default_branch);
  // C-4: 외부 이미지를 빌드 타임에 800w/WebP 로 정규화 → 로컬 경로로 교체
  // 변환 실패 시 원본 URL 그대로 (ProjectCard.astro 가 다시 Thumbnail.jpg 폴백)
  const localizedUrl = await localizeThumbnail(repo.name, rawImageUrl);
  const imageUrl = localizedUrl ?? rawImageUrl;
  const summary = extractSummary(readme);
  const languages = normalizeTopLanguages(languagesData);

  return {
    name: repo.name,
    description: repo.description,
    url: repo.html_url,
    language: repo.language,
    stars: repo.stargazers_count,
    topics: repo.topics ?? [],
    updatedAt: repo.updated_at,
    createdAt: repo.created_at,
    imageUrl,
    summary,
    archived: repo.archived,
    fork: repo.fork,
    languages,
    openIssues: repo.open_issues_count ?? 0,
  };
}

async function fetchTargetRepos(): Promise<GitHubRepo[]> {
  const repos = await fetchPublicRepos();
  return repos.filter((r) => r.name !== HOMEPAGE_REPO);
}

// 이름 키 기반 lookup 용 Map (빌드 1회 내 메모이제이션)
// getRepoDetail / getRepoMeta 가 여러 번 호출되어도 O(1) 조회
let repoMapPromise: Promise<Map<string, GitHubRepo>> | null = null;
function getRepoMap(): Promise<Map<string, GitHubRepo>> {
  if (repoMapPromise) return repoMapPromise;
  repoMapPromise = fetchTargetRepos().then(
    (repos) => new Map(repos.map((r) => [r.name, r])),
  );
  return repoMapPromise;
}

export async function getAllRepoCards(): Promise<RepoCardData[]> {
  const repos = await fetchTargetRepos();
  if (repos.length === 0) return [];

  const results = await mapLimit(repos, API_CONCURRENCY, buildCardData);
  return results.filter((c): c is RepoCardData => c !== null);
}

export function collectTopics(cards: RepoCardData[]): string[] {
  const set = new Set<string>();
  for (const c of cards) {
    for (const t of c.topics) set.add(t);
  }
  return Array.from(set).sort();
}

// 카드별 languages 의 ratio 를 가중 합산해 상위 N개 언어 이름 반환
// (단순 등장 횟수가 아닌 비중 합 — 한 저장소에서 큰 비중인 언어가 더 위로)
function collectTopLanguages(cards: RepoCardData[], topN: number): string[] {
  const acc = new Map<string, number>();
  for (const c of cards) {
    if (!c.languages) continue;
    for (const l of c.languages) {
      acc.set(l.name, (acc.get(l.name) ?? 0) + l.ratio);
    }
  }
  return Array.from(acc.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name]) => name);
}

// 카드별 topics 등장 횟수 기준 상위 N개 topic 반환 (원문 그대로 = lowercase)
function collectTopTopics(cards: RepoCardData[], topN: number): string[] {
  const counts = new Map<string, number>();
  for (const c of cards) {
    for (const t of c.topics) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name]) => name);
}

// Developer Insights Panel 용 집계
// - activeProjects: 표시되는 카드 수 (README 존재 + 홈페이지 제외 후)
// - openIssues: 표시 대상 저장소들의 open_issues_count 합계
// - uptime: 고정값
// - lastDeployAt: 표시 대상 저장소 중 가장 최근 pushed_at
// - topLanguages / topTopics: 카드 0개여도 빈 배열 반환 → InsightsPanel 의 length 가드로 미렌더
export async function collectInsights(cards: RepoCardData[]): Promise<WorkspaceInsights> {
  const repos = await fetchTargetRepos();
  // 카드에 실제로 노출되는 저장소만 집계 대상
  const shownNames = new Set(cards.map((c) => c.name));
  const shownRepos = repos.filter((r) => shownNames.has(r.name));

  const openIssues = shownRepos.reduce((sum, r) => sum + (r.open_issues_count ?? 0), 0);
  const lastDeployAt = shownRepos
    .map((r) => r.pushed_at)
    .filter((v): v is string => !!v)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

  return {
    activeProjects: cards.length,
    openIssues,
    uptime: '99.9%',
    lastDeployAt,
    topLanguages: collectTopLanguages(cards, 3),
    topTopics: collectTopTopics(cards, 3),
  };
}

// Hero 아바타용 owner 프로필 — GitHub 의 {username}.png 리다이렉트 활용 (추가 API 호출 없음)
export function getOwnerProfile(): OwnerProfile {
  return {
    login: OWNER,
    avatarUrl: `https://github.com/${OWNER}.png?size=256`,
  };
}

// 메인 페이지 하이라이트용: 발행일 기준 최신 N개
export async function collectRecentReleases(limit = 3): Promise<RecentReleaseItem[]> {
  const repos = await fetchTargetRepos();
  const perRepoTop = await mapLimit(repos, API_CONCURRENCY, async (r) => {
    const rs = await fetchReleases(r.name);
    const filtered: RecentReleaseItem[] = [];
    for (const rel of rs) {
      if (rel.draft || !rel.published_at) continue;
      filtered.push({
        repoName: r.name,
        tag: rel.tag_name,
        title: rel.name?.trim() || rel.tag_name,
        publishedAt: rel.published_at,
        url: rel.html_url,
      });
    }
    filtered.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    return filtered.slice(0, limit);
  });
  const merged = perRepoTop.flat();
  merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return merged.slice(0, limit);
}

// 클라이언트 검색 인덱스 (A-4) — 카드별 README plaintext + 4KB 절단
// `name` 은 ProjectCard.dataset.name 과 매칭되도록 lowercase, `text` 도 검색 매칭 효율을 위해 lowercase
// fetchReadme 가 모듈 메모이제이션되어 있어 buildCardData 와 중복 fetch 발생 안 함
export async function getSearchIndex(): Promise<Array<{ name: string; text: string }>> {
  const cards = await getAllRepoCards();
  const entries = await mapLimit(cards, API_CONCURRENCY, async (c) => {
    const md = await fetchReadme(c.name);
    if (!md) return null;
    const text = truncateBytes(toPlainText(md), SEARCH_INDEX_MAX_BYTES_PER_DOC);
    if (!text) return null;
    return { name: c.name.toLowerCase(), text: text.toLowerCase() };
  });
  return entries.filter((e): e is { name: string; text: string } => e !== null);
}

// 상세 페이지 라우트용 (getStaticPaths)
export async function getDetailRouteList(): Promise<Array<{ name: string; defaultBranch: string }>> {
  const repos = await fetchTargetRepos();
  const checks = await mapLimit(repos, API_CONCURRENCY, async (r) => {
    const readme = await fetchReadme(r.name);
    return readme ? { name: r.name, defaultBranch: r.default_branch } : null;
  });
  return checks.filter((r): r is { name: string; defaultBranch: string } => r !== null);
}

// Download URL 결정 (하이브리드)
function resolveDownloadUrl(repoName: string, releases: GitHubRelease[]): string | null {
  const override = overrides[repoName]?.downloadUrl;
  if (override) return override;

  const latest = releases[0];
  if (!latest || !latest.assets || latest.assets.length === 0) return null;

  return latest.assets[0].browser_download_url;
}

// OG 이미지 등 name/description 만 필요한 경량 호출용
// getRepoDetail 과 달리 README/Releases fetch 와 Markdown 렌더를 건너뜀
export async function getRepoMeta(
  repoName: string,
): Promise<{ name: string; description: string | null } | null> {
  const repo = (await getRepoMap()).get(repoName);
  if (!repo) return null;
  return { name: repo.name, description: repo.description };
}

export async function getRepoDetail(repoName: string): Promise<RepoDetailData | null> {
  const repo = (await getRepoMap()).get(repoName);
  if (!repo) return null;

  // README/Releases 와 commit_activity 는 독립 호출 → 병렬 (B-3 빌드 시간 영향 최소화)
  const [readme, releases, recentCommits] = await Promise.all([
    fetchReadme(repoName),
    fetchReleases(repoName),
    fetchCommitActivity(repoName),
  ]);

  if (!readme) return null;

  const readmeHtml = renderMarkdown(readme, repoName, repo.default_branch);
  const downloadUrl = resolveDownloadUrl(repoName, releases);

  return {
    name: repo.name,
    description: repo.description,
    url: repo.html_url,
    defaultBranch: repo.default_branch,
    readmeHtml,
    releases,
    downloadUrl,
    updatedAt: repo.updated_at,
    archived: repo.archived,
    fork: repo.fork,
    recentCommits: recentCommits ?? undefined,
    openIssues: repo.open_issues_count ?? 0,
  };
}
