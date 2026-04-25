// 빌드 타임 데이터 페칭: GitHub에서 저장소 목록 + README 를 가져와
// 카드 렌더링용 RepoCardData 배열로 정규화
// 또한 상세 페이지용 RepoDetailData 조립 (README 전문 HTML + Releases + Download URL)

import { fetchPublicRepos, fetchReadme, fetchReleases, mapLimit, OWNER } from './github';
import { extractFirstImage, extractSummary, renderMarkdown } from './readme';

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

async function buildCardData(repo: GitHubRepo): Promise<RepoCardData | null> {
  const readme = await fetchReadme(repo.name);

  // README 없으면 카드 목록에서 제외
  if (!readme) return null;

  const imageUrl = extractFirstImage(readme, repo.name, repo.default_branch);
  const summary = extractSummary(readme);

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

// Developer Insights Panel 용 집계
// - activeProjects: 표시되는 카드 수 (README 존재 + 홈페이지 제외 후)
// - openIssues: 표시 대상 저장소들의 open_issues_count 합계
// - uptime: 고정값
// - lastDeployAt: 표시 대상 저장소 중 가장 최근 pushed_at
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

  const [readme, releases] = await Promise.all([
    fetchReadme(repoName),
    fetchReleases(repoName),
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
  };
}
