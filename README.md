# P-J-C Workspace Dashboard

<!-- LIGHTHOUSE:START -->
| Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|
| 67 | 98 | 96 | 100 |

_Lighthouse 점수 자동 갱신: 2026-06-13 (UTC)_
<!-- LIGHTHOUSE:END -->

`jongcheol-pak` GitHub 계정의 public 저장소를 **Emerald Cybernetic** 대시보드로 보여주는 Astro 정적 사이트.

각 카드는 저장소 이름·설명·README 첫 이미지·Topic 칩(2개)·업데이트 시간을 표시하며, 클릭 시 해당 저장소의 **상세 페이지**로 이동합니다. 상세 페이지에서는 상태 배지·버전·Last Updated 와 함께 README 전문, Releases 타임라인, 다운로드/GitHub 버튼을 확인할 수 있습니다.

- **배포 URL**: https://jongcheol-pak.github.io/
- **디자인 테마**: Emerald Cybernetic (void 배경 #0B0E11 + 네온 에메랄드 #00FF9D, Inter / Noto Sans KR 단일 타이포, 8px radius, 1px 보더 + neon glow)

---

## 핵심 기능

### 메인 페이지 (Workspace Dashboard)
- **Top AppBar**: 좌 `P-J-C` 로고 + 중앙 검색(`SEARCH INFRASTRUCTURE...`) + 우 언어 드롭다운(`한국어 / English`)
- **Hero**: GitHub 아바타(에메랄드 glow) + `Workspace Dashboard` 타이틀 + 서브 텍스트 + `SORT BY` 정렬 드롭다운
- **Developer Insights Panel**: 4개 메트릭(`ACTIVE_PROJECTS`, `OPEN_ISSUES`, `SYSTEM_UPTIME`, `LAST_DEPLOY`) + 하단 `TOP_LANGUAGES` / `TOP_TOPICS` 두 줄 (각각 상위 3개 태그) glass-rim 패널
  - `ACTIVE_PROJECTS` = 카드 수, `OPEN_ISSUES` = 저장소별 open issue 합계, `SYSTEM_UPTIME` = 고정값 99.9%, `LAST_DEPLOY` = 전체 저장소 중 최신 `pushed_at` 상대 시간
  - `TOP_LANGUAGES` = 카드별 언어 분포 ratio 가중 합 기준 상위 3개, `TOP_TOPICS` = 카드별 topic 등장 횟수 기준 상위 3개. 1순위 태그는 강조 표시. 카드 0개 시 두 줄 모두 미렌더 폴백
- **Bento Card Grid**: 1/2/3 컬럼 반응형, 카드 = 이미지 + 제목(에메랄드) + 설명 + 칩 2개(`topics[0]` / `topics[1]`) + `Updated: XX AGO`
- **자동 저장소 수집**: 빌드 타임에 GitHub API 로 `jongcheol-pak` public 저장소 목록 조회
- **README 파싱**: 각 저장소 README 에서 첫 이미지 + 180자 요약 자동 추출
- **카드 이미지 정규화 (C-4)**: README 첫 이미지가 외부 URL 이면 빌드 타임에 `sharp` 로 **800w / WebP / quality 80** 변환 후 `public/thumbs/<repo>.webp` 로 저장 → 카드는 로컬 경로 사용 (LCP 개선 + 외부 의존 제거)
- **카드 이미지 폴백**: README 에 이미지가 없거나 원격 이미지 fetch 실패 / sharp 변환 실패 시 `public/Thumbnail.jpg` 표시 (try/catch 로 빌드 중단 차단)
- **카드 배지**: 저장소가 `archived` / `fork` 인 경우 카드 우상단에 배지 자동 표시
- **카드 언어 분포 미니 바**: 각 카드 푸터에 GitHub 언어 분포 **상위 3개** 의 비율을 4px stacked-bar 로 표시. hover 시 `언어 % ` 툴팁. 언어 데이터가 없는 저장소는 미렌더
- **북마크**: 카드 좌상단 별(★) 버튼으로 즐겨찾기 토글 — 북마크된 저장소는 정렬 결과의 **최상단으로 고정**. 상태는 브라우저 `localStorage` 에 보관
- **검색**: 저장소 이름 + description + Topics + **README 본문 (lazy fetch)** 대상 실시간 검색. README 인덱스(`/search-index.json`) 는 첫 idle 시점에 비동기 로드 — 도착 전에는 메타 검색만, 도착 후에는 README 본문 키워드도 매칭. 인덱스 도착 시점에 검색어가 입력되어 있으면 결과 자동 갱신
- **필터**: Topic **다중 선택 (AND 조합)** — 여러 topic 을 체크하면 **모두 포함한** 카드만 남음
- **카드 chip 클릭 필터 토글**: 카드의 Topic chip 을 클릭하면 해당 topic 이 Topic 다중 필터에 토글 추가/해제됨. 현재 선택된 topic 의 chip 은 강조 표시 (`aria-pressed='true'`)
- **카드 오픈 이슈 카운터**: 카드 푸터 우측에 `N OPEN ISSUES` 라벨 (숫자만 에메랄드 강조). `open_issues_count == 0` 인 카드는 미렌더 — 노이즈 회피
- **카드 stars 카운터**: 카드 푸터 우측 (오픈 이슈 좌측) 에 `★ N` 표시 (별 아이콘 + 숫자 모두 에메랄드). `stargazers_count == 0` 인 카드는 미렌더 — 노이즈 회피. stars + openIssues 둘 다 0 이면 우측 메타 영역 자체 미렌더
- **정렬**: 최근 업데이트순 / 스타순 / 이름순 / 생성일순 (4가지, Hero 우측 드롭다운)
- **URL 공유**: 현재 검색/필터/정렬/페이지 상태가 URL 쿼리(`?q=&topic=&sort=&page=`)에 자동 반영
- **페이지네이션**: 저장소 수가 12개를 초과하면 자동으로 페이지 네비게이션이 노출
- **자동 갱신**: GitHub Actions 스케줄로 **매일 UTC 00:00 (= KST 09:00)** 자동 재빌드 + 배포

### 상세 페이지 (저장소별)
- **URL 형식**: `/{repo-name}/`
- **Top AppBar**: `← Back` + 중앙 `P-J-C` 로고 + 우 언어 드롭다운 (sticky)
- **Project Header**: 상태 pulse 배지(`STABLE` / `BETA` / `ARCHIVED` / `FORK` / `ACTIVE`) + 최신 release tag(`vX.Y.Z_LATEST`) + **STARS 카운터(클릭 시 GitHub stargazers 페이지 새 탭, `stargazers_count == 0` 인 저장소는 미렌더)** + **OPEN ISSUES 카운터(클릭 시 GitHub 이슈 페이지 새 탭)** + 타이틀 + 설명 + `Last Updated` 상대 시간
- **2열 레이아웃**: 왼쪽 문서 카드(헤더바에 표시 파일명 라벨 + sanitize 된 prose-emerald 본문) + 오른쪽 최근 4주 commit sparkline + Releases 카드 + 액션 버튼
- **문서 우선순위**: 저장소에 `help.md`(대소문자 변형 `help.md`/`HELP.md`/`Help.md` 포함)가 있으면 README 대신 우선 표시하고, 없으면 README 로 폴백. 헤더 라벨도 표시 파일에 맞춰 `HELP.md` / `README.md` 로 동적 표기. 이 우선순위는 카드 썸네일·요약·검색 인덱스에도 동일 적용
- **문서 원본 복사 버튼**: 문서 카드 헤더 우측 상단에 복사 아이콘. 클릭 시 원본 Markdown(표시 중인 help.md 또는 README) 을 클립보드에 복사 + 아이콘이 2초간 ✓ 로 변경 + 화면 하단 `복사됨` 토스트 (HTTPS 환경 필요 — 로컬 `http://localhost` 에서는 `navigator.clipboard` 미작동)
- **최근 4주 commit sparkline**: 우측 상단에 GitHub `repos/{r}/commits?since=4주전` (paginated) 으로 받은 commit 들을 7일 단위 4 bucket 으로 카운트한 미니 그래프(SVG polyline + 4 노드, 노드 hover 시 `N commits` 툴팁) + 4주 합계. 0 커밋 저장소 / 404 / rate limit / 네트워크 실패 → **미렌더 폴백**
- **README 렌더링**: Markdown → 안전한 HTML 변환 (sanitize-html 로 XSS 방지)
- **상대 경로 자동 해결**: README 내 이미지/링크는 GitHub raw/blob 절대 경로로 변환
- **Releases 타임라인**: 세로 라인 + 원형 노드(최신은 에메랄드), 최신 1개(`Latest` 배지) + 과거 최대 3개 + `View all releases` 버튼
- **다운로드 버튼**: 저장소별 다운로드 URL 이 있을 때만 표시 (아래 "Download URL 관리" 참고)
- **GitHub 버튼**: 항상 표시 (에메랄드 테두리, 2-col 그리드)
- **Back to Top**: 300px 이상 스크롤 시 우하단에 에메랄드 버튼 노출
- **상태 분류 규칙**: `archived → ARCHIVED` / `releases[0].prerelease → BETA` / `releases 존재 → STABLE` / `fork → FORK` / 그 외 → `ACTIVE`

### 카드 표시 제외 규칙
- 홈페이지 자체 저장소(`jongcheol-pak.github.io`)는 카드에서 제외
- 표시할 문서(`help.md` 또는 `README.md`)가 없는 저장소는 카드에서 제외

### SEO / 공유 관련
- **sitemap.xml**: `@astrojs/sitemap` 이 빌드 타임에 자동 생성 (`/sitemap-index.xml`). `/search-index.json` 은 검색 엔진 노이즈가 되므로 sitemap 에서 제외
- **robots.txt**: 전체 크롤링 허용 + sitemap 위치 명시 (`public/robots.txt`)
- **RSS 피드**: 전체 저장소의 최신 릴리스 20건을 `/rss.xml` 로 노출. `Layout.astro` head 에 `<link rel="alternate" type="application/rss+xml">` 자동 주입
- **canonical / Open Graph / X Card**: 각 페이지별로 절대 URL 주입 — 저장소 상세 페이지를 메신저·SNS 에 붙여넣어도 해당 저장소 페이지 미리보기가 정확히 표시됨
- **저장소별 동적 OG 이미지**: `satori` + `@resvg/resvg-js` 로 빌드 타임에 저장소당 1장씩 1200×630 PNG 를 `/og/<repo>.png` 로 생성. **Emerald Cybernetic 톤** (void 배경 + 에메랄드 좌측 보더 + `P-J-C` 로고 + 에메랄드 PROJECT pill + URL)
  - 영문 폰트: Google Fonts 에서 빌드 타임에 Inter(400/700) TTF/WOFF 를 1회 fetch 후 메모리 캐싱
  - 한글 폰트: `@fontsource/noto-sans-kr` 번들의 korean 서브셋 WOFF 파일 직접 로드 → 한글 description 도 정상 렌더
- **404 페이지**: 존재하지 않는 경로 접근 시 Emerald Cybernetic 톤의 커스텀 404 페이지 (`src/pages/404.astro`) 반환

### PWA / 오프라인 지원
- **Web App Manifest**: `public/site.webmanifest` (`name`, `short_name`, `id`/`start_url`/`scope` 모두 `/`, `display: standalone`, theme `#00FF9D`, background `#0B0E11`, 192×192 / 512×512 maskable PNG icons). 모바일 홈 화면 추가 / standalone 실행 가능
- **Service Worker**: `src/pages/sw.js.ts` 가 빌드 타임에 `/sw.js` 로 동적 emit. CACHE_NAME 은 빌드마다 base36 timestamp 로 unique → activate 단계에서 이전 캐시 자동 정리 + `skipWaiting` / `clients.claim` 으로 새 SW 즉시 활성
- **캐시 정책**: HTML 은 **network-first** (사이트 갱신 즉시 반영, 오프라인 시에만 캐시 폴백) / JS·CSS·이미지·폰트는 **stale-while-revalidate** (캐시 즉시 응답 + 백그라운드 갱신). cross-origin (GitHub avatar / raw 이미지) 은 SW 통과
- **등록 위치**: `Layout.astro` `<head>` inline script 가 `load` 이벤트 후 `navigator.serviceWorker.register('/sw.js', { scope: '/' })`

### 접근성 (a11y)
- **스킵 링크**: 키보드 Tab 첫 포커스 시 좌상단에 "본문 바로가기" 버튼이 슬라이드-인되어 `<main id="main">` 랜드마크로 즉시 이동
- **focus-visible 포커스 링**: 모든 인터랙티브 요소에 키보드 포커스 전용 에메랄드 아웃라인. 마우스 클릭에는 노이즈 없음
- **aria-\* 보강**: 페이지네이션 prev/next `aria-label` + `#page-info` `aria-live="polite"`, Topic 필터 `aria-controls`/`aria-haspopup`/`aria-expanded`, 북마크 버튼 `aria-pressed`, 모든 aria-label 은 i18n 연동(언어 전환 시 자동 갱신)
- **키보드 단축키 (메인)**: `/` 검색 포커스, `Esc` 검색 비우고 나가기, `j`/`k` 보이는 카드 사이 이동, 카드 포커스 후 `Enter` 상세 진입. 입력 박스/드롭다운/`contenteditable` 안에서는 가로채지 않음 (정상 입력 보장)

### 다국어 (i18n)
- 한국어 / English 두 언어 지원
- 헤더 우측 🌐 드롭다운에서 선택, 첫 방문 시 `navigator.language` 자동 감지
- 선택 언어는 `localStorage` 의 `lang` 키에 보관
- 전환은 클라이언트 사이드 DOM 치환 — 새로고침 없이 즉시 반영

---

## 기술 스택

| 분류 | 라이브러리/도구 | 용도 |
|---|---|---|
| 프레임워크 | Astro 5.x | 정적 사이트 생성 (SSG) |
| 스타일 | Tailwind CSS 3.x | 유틸리티 + 자체 Neo-Brutalist 컴포넌트 클래스 |
| Markdown | marked + sanitize-html | README 전문 렌더링 + XSS 방지 |
| 이미지 정규화 | sharp (optionalDependencies) | 빌드 타임 800w/WebP 변환 (C-4) |
| E2E 테스트 | @playwright/test (chromium 만) | 메인 카드 렌더 + 검색 필터 회귀 방지 (C-2) |
| Sitemap | @astrojs/sitemap | 빌드 타임 sitemap.xml 자동 생성 |
| OG 이미지 | satori + satori-html + @resvg/resvg-js | 저장소별 OG PNG 빌드 타임 생성 |
| OG 한글 폰트 | @fontsource/noto-sans-kr | OG 이미지에서 한글 description 렌더 |
| 언어 | TypeScript 5.x (strict) | 타입 안전성 |
| 배포 | GitHub Pages + GitHub Actions | 정적 호스팅 + CI/CD |
| 폰트 | Inter, Noto Sans KR (Google Fonts, head `<link>` 직접 로드 + preconnect) | 본문·헤딩 |
| 아이콘 | Material Symbols Outlined 24dp SVG (정적, `src/assets/icons/`) — 외부 폰트 의존 제거 | 인라인 SVG (`Icon.astro`) |

---

## 디렉토리 구조

```
HomePage/
├── .github/workflows/
│   ├── deploy.yml                  # GitHub Pages 자동 배포
│   └── lighthouse.yml              # 배포 후 성능/접근성/SEO 점수 측정
├── src/
│   ├── layouts/
│   │   └── Layout.astro            # 전역 레이아웃 (폰트, 메타, canonical/OG URL)
│   ├── pages/
│   │   ├── index.astro             # 메인 대시보드
│   │   ├── [repo].astro            # 저장소 상세 페이지
│   │   ├── 404.astro               # 커스텀 404
│   │   ├── rss.xml.ts              # 전체 저장소 최신 릴리스 RSS
│   │   ├── search-index.json.ts    # 클라이언트 검색용 README plaintext 인덱스 (A-4)
│   │   ├── sw.js.ts                # Service Worker 동적 emit (C-1 PWA, CACHE_NAME 빌드 타임 토큰)
│   │   └── og/[repo].png.ts        # 저장소별 동적 OG 이미지
│   ├── components/
│   │   ├── Header.astro            # Top AppBar (메인 / 상세 variant)
│   │   ├── Footer.astro            # 1줄 저작권
│   │   ├── DashboardHero.astro     # 아바타 + 타이틀 + 정렬 드롭다운
│   │   ├── InsightsPanel.astro     # Developer Insights 4 메트릭
│   │   ├── FilterBar.astro         # Topic 다중 + 결과 카운트
│   │   ├── ProjectCard.astro       # Bento 카드 (이미지 + 칩 + updated)
│   │   └── detail/
│   │       ├── DetailHeader.astro  # 상태 pulse 배지 + 버전 + 타이틀 + Last Updated
│   │       ├── ReadmePanel.astro   # README 카드 (prose-emerald)
│   │       ├── ActivitySpark.astro # 최근 4주 commit sparkline (B-3)
│   │       ├── ReleasesCard.astro  # Releases 타임라인
│   │       └── ActionButtons.astro # Download / GitHub 2-col
│   ├── lib/
│   │   ├── github.ts               # GitHub API 호출 (메모이제이션 + 에러 분류)
│   │   ├── readme.ts               # Markdown 파싱
│   │   ├── search-index.ts         # 검색 인덱스용 plaintext 추출 + UTF-8 byte 절단 (A-4)
│   │   ├── thumbnail.ts            # 외부 이미지 fetch + sharp 800w/WebP 변환 (C-4)
│   │   ├── data.ts                 # 카드/상세/최근 릴리스 데이터 조립
│   │   ├── og.ts                   # 동적 OG 이미지 생성
│   │   ├── paths.ts                # base/canonical/이스케이프
│   │   └── types.ts                # TS 타입 정의
│   ├── i18n/
│   │   ├── ko.json                 # 한국어 사전
│   │   ├── en.json                 # 영어 사전
│   │   └── dictionary.ts           # i18n 유틸
│   ├── data/
│   │   └── repo-overrides.json     # 저장소별 커스텀 메타 (Download URL 등)
│   ├── scripts/
│   │   ├── filter.ts               # 검색/필터/정렬/북마크/페이지네이션/URL 동기화
│   │   ├── keyboard.ts             # 메인 키보드 단축키 (`/`, `Esc`, `j`/`k`, `Enter`)
│   │   └── i18n.ts                 # 클라이언트 언어 전환 런타임
│   └── styles/
│       └── global.css              # Emerald Cybernetic 디자인 토큰 + prose-emerald
├── public/
│   ├── Thumbnail.jpg               # 카드 이미지 폴백
│   ├── favicon.svg                 # SVG 파비콘
│   └── robots.txt                  # 크롤러 정책
├── .env.example                    # GITHUB_TOKEN 템플릿 (커밋 O)
├── .env                            # 로컬 전용 (커밋 X)
├── .gitignore
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
└── package.json
```

---

## 실행 방법

### 1) 의존성 설치
```bash
npm install
```

### 2) GitHub Personal Access Token 발급 (로컬 개발 권장)

GitHub API 비인증은 시간당 60회로 제한됩니다. Fine-grained PAT 발급 후 `.env` 에 저장하면 시간당 5,000회까지 허용됩니다.

1. https://github.com/settings/tokens?type=beta 접속
2. **Generate new token** → Token name `devhub-local`, Expiration 90 days
3. **Repository access**: "Public Repositories (read-only)"
4. **Generate token** → 발급된 토큰을 즉시 복사
5. 프로젝트 루트에 `.env` 파일 생성:

```
GITHUB_TOKEN=ghp_여기에_발급받은_토큰
```

> `.env` 는 `.gitignore` 에 포함되어 있어 커밋되지 않습니다.

### 3) 개발 서버
```bash
npm run dev
```
접속: http://localhost:4321/

### 4) 프로덕션 빌드
```bash
npm run build
```
결과: `dist/`

### 5) 빌드 결과 미리보기
```bash
npm run preview
```

### 6) E2E 스모크 테스트 (C-2)
```bash
npm run build
npm run test:e2e
```
- 사전 빌드된 `dist/` 가 필요 (Playwright 의 webServer 가 `npm run preview` 자동 기동)
- 테스트 케이스: ① 메인 카드 ≥1개 렌더 / ② 검색 필터 입력 시 visible 카드 수 감소
- chromium 만 사용 (Firefox/WebKit 미설치 — 표면 최소화)
- CI(`deploy.yml`) 에서도 빌드 직후 자동 실행 — 실패 시 `Upload Pages artifact` step 차단 → deploy job 스킵

---

## 배포

### 최초 설정
1. 저장소 **Settings → Pages → Source** 를 **GitHub Actions** 로 변경
2. `main` 브랜치에 push → 자동 빌드/배포 시작

### 배포 트리거
| 트리거 | 실행 조건 | 반영 소요 |
|---|---|---|
| `push` | `main` 브랜치 push 시 (commit message 가 `[lighthouse]` 또는 `[skip ci]` prefix 면 스킵 — C-3 가드) | 2~5분 |
| `schedule` | 매일 UTC 00:00 (KST 09:00) | 2~5분 |
| `workflow_dispatch` | GitHub Actions 탭에서 수동 실행 | 2~5분 |

### Lighthouse 점수 자동 README 뱃지 (C-3)
- `lighthouse.yml` 워크플로우가 deploy 완료 후 자동으로 https://jongcheol-pak.github.io/ 에 Lighthouse 측정 → 점수 4개(Performance/Accessibility/Best Practices/SEO) 를 README 상단 `<!-- LIGHTHOUSE:START -->
| Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|
| 67 | 98 | 96 | 100 |

_Lighthouse 점수 자동 갱신: 2026-06-13 (UTC)_
<!-- LIGHTHOUSE:END -->` 마커 사이에 markdown table 로 갱신
- auto-commit 메시지는 `[lighthouse] update README badge YYYY-MM-DD` — `deploy.yml` 의 build job 이 이 prefix 를 감지하면 스킵하여 트리거 루프 차단

### 수동으로 즉시 재배포
1. 저장소 **Actions** 탭
2. 좌측 **Deploy to GitHub Pages** 선택
3. 우측 **Run workflow** → Branch `main` → 초록 버튼

> 60일 이상 비활성 시 GitHub 가 schedule 트리거를 자동 중단합니다. 본 수동 실행 1회로 다시 활성화됩니다.

---

## 카드 등록 빠른 가이드

새 저장소를 카드로 노출시키려면 아래 조건만 만족하면 됩니다. 정보 입력은 모두 **GitHub 웹 UI** 에서 진행하며, **커스텀 다운로드 URL** 만 본 저장소의 `src/data/repo-overrides.json` 편집이 필요합니다.

### 필수 조건
- [x] 저장소 소유자가 **`jongcheol-pak`**
- [x] 저장소 공개 범위가 **Public**
- [x] 저장소 이름이 **`jongcheol-pak.github.io` 가 아닐 것** (홈페이지 자체)
- [x] 저장소 루트에 **`help.md` 또는 `README.md` 파일 존재** (`help.md` 우선 표시)

### 선택 항목 (카드 외관 개선)
| 항목 | 설정 위치 | 결과 |
|---|---|---|
| **Description** | 저장소 About → ⚙️ → Description | 카드 두 번째 라인 |
| **Topics** | 저장소 About → ⚙️ → Topics | 카드 chip + Topic 필터 옵션 |
| **README 첫 이미지** | README.md 본문 첫 `![](url)` | 카드 썸네일 |
| **Language** | GitHub 자동 판정 | 카드 chip (시안) |
| **커스텀 Download URL** | `src/data/repo-overrides.json` | 상세 페이지 다운로드 버튼 URL 교체 |

### Description 표시 우선순위
1. GitHub 저장소 `description`
2. README 앞부분 180자 요약 (Markdown 문법 제거 후)
3. 둘 다 없음 → 설명 영역 미렌더링

---

## Download URL 관리

상세 페이지 다운로드 버튼 URL 결정 우선순위:
1. `src/data/repo-overrides.json` 의 해당 저장소 `downloadUrl`
2. 해당 저장소 **최신(Latest) Release 의 첫 번째 Asset** `browser_download_url`
3. 둘 다 없으면 **다운로드 버튼 미표시**

### `repo-overrides.json` 작성법
```json
{
  "AppGroup": {
    "downloadUrl": "https://apps.microsoft.com/detail/9N99WJ23ZWW9?hl=ko-kr&gl=KR"
  },
  "DevDashboard_WinUI": {
    "downloadUrl": "https://apps.microsoft.com/detail/9PKTKD64X5L6?hl=ko-kr&gl=KR",
    "displayName": "프로젝트 대시보드"
  }
}
```
- key: GitHub 저장소 이름 (대소문자 그대로)
- downloadUrl: 클릭 시 이동할 URL (절대 경로)
- displayName: 카드 제목 / 상세 헤더 타이틀에 표시될 별칭. URL · 검색 · 북마크 · OG 이미지 · sitemap 등 식별자 키는 원본 저장소 이름을 그대로 사용 (식별자 안정성 보장). 미설정 시 저장소 이름 그대로 표시

---

## 라이선스

본 프로젝트는 [MIT 라이선스](LICENSE) 하에 배포됩니다.

자유롭게 사용·수정·재배포가 가능하지만, **재배포 시 원저작자 표시(Copyright © 2026 jongcheol-pak) 와 라이선스 전문을 함께 포함**해야 합니다.

