// GitHub API 응답 및 카드 데이터 타입 정의

// GitHub REST API /users/{user}/repos 응답 중 사용하는 필드만
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  topics: string[];
  updated_at: string;
  created_at: string;
  pushed_at: string;
  archived: boolean;
  fork: boolean;
  open_issues_count: number;
}

// GitHub REST API /repos/{owner}/{repo}/readme 응답
export interface GitHubReadme {
  content: string; // base64 인코딩
  encoding: string; // 보통 'base64'
  path: string;
  name: string;
}

// 카드 렌더링에 사용하는 정규화된 데이터
export interface RepoCardData {
  name: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
  topics: string[];
  updatedAt: string;
  createdAt: string;
  imageUrl: string | null;
  summary: string;
  archived: boolean;
  fork: boolean;
}

// GitHub Release Asset
export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

// GitHub REST API /repos/{owner}/{repo}/releases 응답 요소
export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  published_at: string | null;
  created_at: string;
  prerelease: boolean;
  draft: boolean;
  assets: ReleaseAsset[];
}

// 상세 페이지 렌더링에 사용하는 정규화된 데이터
export interface RepoDetailData {
  name: string;
  description: string | null;
  url: string;
  defaultBranch: string;
  readmeHtml: string;
  releases: GitHubRelease[];
  downloadUrl: string | null;
  // DetailHeader 에 필요한 저장소 메타 (repo 원본 재전달 제거용)
  updatedAt: string;
  archived: boolean;
  fork: boolean;
}

// 저장소별 커스텀 오버라이드 (repo-overrides.json)
export interface RepoOverride {
  downloadUrl?: string;
}

export type RepoOverridesMap = Record<string, RepoOverride>;

// 최근 릴리스 피드 아이템
export interface RecentReleaseItem {
  repoName: string;
  tag: string;
  title: string;
  publishedAt: string;
  url: string;
}

// 대시보드 Insights Panel 집계
export interface WorkspaceInsights {
  activeProjects: number;
  openIssues: number;
  uptime: string; // 고정값 "99.9%"
  lastDeployAt: string | null; // 가장 최근 pushed_at (ISO)
}

// 메인 히어로 아바타 등 사용자 프로필 요약
export interface OwnerProfile {
  login: string;
  avatarUrl: string;
}
