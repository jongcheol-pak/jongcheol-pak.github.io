# 작업 노트

## 최근 변경

- 2026-04-26: **Phase 1 (A-3) 롤백 — archived / fork 숨기기 토글 기능 제거**. 사용자 요청으로 같은 날 추가된 토글을 모두 되돌리고 archived/fork 카드도 항상 표시되는 기존 동작으로 복귀. 변경: `FilterBar.astro` 토글 마크업 / `global.css` `.filter-toggle` 스타일 / `filter.ts` 토글 변수·조건·이벤트·URL 쿼리(`hideArchived`, `hideFork`) 동기화 / `ko.json`·`en.json` `filter_hide_archived`·`filter_hide_fork` 키 모두 삭제. 검증: `MOCK_REPOS=1 npm run build` 성공, `dist/index.html` 에 토글 흔적 0건, src 전수 검색에서 잔존 참조 없음. `README.md` 의 "숨기기 토글" 라인도 함께 제거.

- 2026-04-26: **Phase 1 (A-3) — archived / fork 숨기기 토글 추가**. `FilterBar.astro` 에 토글 2개 + i18n 키(`filter_hide_archived`, `filter_hide_fork`) 추가, `filter.ts` `applyFilters` 에 토글 조건 추가, `restoreFromQuery`/`syncQuery` 에 `?hideArchived=1`/`?hideFork=1` 동기화 추가, `global.css` 에 `.filter-toggle` 스타일(기존 `--emerald` / `--bg-surface` / `--bg-elevated` 토큰만 재사용). 토글 기본값 OFF, 카드 0건이어도 자동 비활성/숨김 처리 안 함(plan v3 §2 A-3 범위 제한). 검증: `MOCK_REPOS=1 npm run build` 성공, `dist/index.html` 에 두 토글 마크업 정상 렌더 확인. **2026-04-26 추가 요청으로 같은 날 롤백됨 (위 항목 참조).**

- 2026-04-25: `RepoDetailData` 확장 — `updatedAt/archived/fork` 3필드 추가 (`types.ts`). `data.ts` `getRepoDetail` 에서 채워 반환. `[repo].astro` 에서 `fetchPublicRepos` + `repoMap` 구성, `repo` prop 전달, `repo` 기준 메타 재구성(`updatedAt/archived/fork` fallback) 로직 제거. 공개 타입 *추가*만 있으므로 기존 호출자 호환. DetailHeader prop 시그니처는 그대로 유지(스코프 내 변경 최소화).

- 2026-04-25: 코드리뷰(/simplify) 반영 — 버그 2건 + 중복 제거/경량화 7건.
  - `filter.ts` 검색 대소문자 버그: `dataset.name/description` 을 원문 케이스로 비교해 대문자 포함 이름/설명이 검색에서 누락되던 문제 수정 (`toLowerCase()` 추가)
  - `ReleasesCard.astro` 잘못된 HTML 중첩(`<ul>` 직계 자식으로 `<div>`) → `.releases-timeline` div 래퍼 + 내부 `<ul class="releases-timeline-list">` 구조로 교정. `global.css` 의 `list-style/padding/margin` 규칙을 새 클래스로 이동
  - `readme.ts` `normalizeImageUrl`/`resolveImageSrc` 중복 통합 — `extractFirstImage` 에서 `rawBase` 를 구성해 `resolveImageSrc` 하나만 사용
  - `src/components/GithubIcon.astro` 신설 — Footer/ActionButtons 에 중복되던 octicon SVG path 제거
  - `src/scripts/dom.ts` 신설(`createDropdown`) — `filter.ts` Topic 패널 / `i18n.ts` 언어 메뉴의 open·close·outside-click 로직 공통화
  - `src/lib/data.ts` `getRepoMap()` 신설 — `getRepoDetail` 의 `repos.find(O(N))` 를 Map 조회(O(1))로 교체
  - `src/lib/data.ts` `getRepoMeta()` 신설 + `src/pages/og/[repo].png.ts` 교체 — OG 라우트가 불필요한 README 렌더링을 거치지 않도록 경량 meta 조회 사용
  - `i18n.ts` `applyLang` 에 동일 언어 early-return 추가 — 같은 언어 재적용 시 DOM 전체 순회·포맷 재계산 스킵
  - 검증: `MOCK_REPOS=1 npm run build` 성공

- 2026-04-24: 메인 화면 우측 "프로젝트 N개" 카운트 표시 제거 (`FilterBar.astro` 의 `#result-count` 제거). `filter.ts` 는 요소 미존재 시 자동 no-op.

- 2026-04-24: **Emerald Cybernetic 재디자인 완료**. Neo-Brutalist(라임) 테마에서 Emerald Cybernetic(에메랄드 네온 #00FF9D + Space Grotesk + glass-rim + neon glow) 로 전면 교체.
  - 토큰: `tailwind.config.mjs`, `src/styles/global.css` 전면 재작성 (`prose-dark` → `prose-emerald`)
  - Layout/Header/Footer: Top AppBar 신설(P-J-C 로고 + 검색 + 언어), Footer 1줄 축소
  - 메인: `DashboardHero` 재작성(아바타+타이틀+정렬), `InsightsPanel` **신규**(4 메트릭), `RecentReleases` 제거(파일 삭제), `FilterBar` Topic 전용, `ProjectCard` Bento 스타일
  - 상세: `DetailHeader` 재작성(상태 pulse + 버전 + Last Updated 자동 규칙), `ReadmePanel` 카드 헤더바 추가, `ReleasesCard` 타임라인, `ActionButtons` 2-col
  - 데이터: `types.ts` 에 `pushed_at`, `open_issues_count` 필드 추가. `data.ts` 에 `collectInsights()`, `getOwnerProfile()` 신규. 아바타는 `github.com/{owner}.png` 리다이렉트 활용 (추가 API 호출 없음)
  - i18n: `ko.json`/`en.json` 재작성(대시보드 톤), 시간 단위 확장(`time_hours_ago`, `time_minutes_ago`, `time_just_now`). `dictionary.ts` `formatRelative` 가 분/시간 단위까지 상대 포맷
  - 404·OG: Emerald 톤 재작성
  - `.env` 신설 (사용자 PAT 등록 → rate-limit 5000/h 로 확장)
  - 검증: `npm run build` 성공 (5 페이지 + 3 OG + RSS + sitemap, 약 19s). `git tag pre-emerald-redesign` 로 롤백 지점 확보

- 2026-04-24: **Jekyll → Astro 5 전환 완료**. bitleader-dev-HomePage 의 모든 기능을 이식하고 Neo-Brutalist 디자인은 그대로 보존.
  - 신설: `package.json`, `astro.config.mjs`, `tailwind.config.mjs`, `tsconfig.json`, `scripts/ensure-mock-stub.js`, `.env.example`, `.github/workflows/deploy.yml`, `.github/workflows/lighthouse.yml`
  - `src/styles/global.css` — 기존 `assets/css/style.css` 전면 이식 + `prose-dark`(README 렌더링) + 스킵 링크 + focus-visible 포커스 링
  - `src/lib/{types,github,readme,data,og,paths}.ts` — bitleader 데이터 레이어 이식. OWNER 를 `jongcheol-pak` 으로, HOMEPAGE_REPO 를 `jongcheol-pak.github.io` 로 교체
  - `src/i18n/{ko,en}.json + dictionary.ts` — DevHub 톤으로 사전 재작성
  - `src/scripts/{filter,i18n}.ts` — 검색/Topic 다중/정렬/북마크/페이지네이션 + 언어 전환. 헤더 언어 드롭다운(`[data-set-lang]`)에 맞춰 i18n.ts 수정
  - `src/layouts/Layout.astro` — 전역 메타/canonical/OG/RSS link/스킵 링크/토스트
  - `src/components/{Header,Footer,DashboardHero,RecentReleases,FilterBar,ProjectCard}.astro` + `detail/{DetailHeader,ReadmePanel,ReleasesCard,ActionButtons}.astro`
  - `src/pages/{index,[repo],404}.astro + rss.xml.ts + og/[repo].png.ts`
  - `public/{Thumbnail.png, favicon.svg, robots.txt}`
  - 폐기: `_layouts/`, `_projects/`, `_data/`, `_manuals/`, `assets/`, `bin/`, `Gemfile`, `Gemfile.lock`, `_config.yml`, `admin.html`, `carousel_manager.html`, `index.md`, `NOTES.md`, `scripts/local_api.py`, `scripts/create_project.py`, `_site/`, `*.log`
  - 검증: `npm run build` 성공 (5 페이지 + 3 OG PNG + sitemap + RSS, 약 5.7s)
  - 백업: git tag `pre-astro-migration` 로 전환 직전 상태 보존
