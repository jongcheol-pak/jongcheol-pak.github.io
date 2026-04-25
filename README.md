# P-J-C Workspace Dashboard

`jongcheol-pak` GitHub 계정의 public 저장소를 **Emerald Cybernetic** 대시보드로 보여주는 Astro 정적 사이트.

각 카드는 저장소 이름·설명·README 첫 이미지·Topic 칩(2개)·업데이트 시간을 표시하며, 클릭 시 해당 저장소의 **상세 페이지**로 이동합니다. 상세 페이지에서는 상태 배지·버전·Last Updated 와 함께 README 전문, Releases 타임라인, 다운로드/GitHub 버튼을 확인할 수 있습니다.

- **배포 URL**: https://jongcheol-pak.github.io/
- **디자인 테마**: Emerald Cybernetic (void 배경 #0B0E11 + 네온 에메랄드 #00FF9D, Space Grotesk 단일 타이포, 8px radius, 1px 보더 + neon glow)

---

## 핵심 기능

### 메인 페이지 (Workspace Dashboard)
- **Top AppBar**: 좌 `P-J-C` 로고 + 중앙 검색(`SEARCH INFRASTRUCTURE...`) + 우 언어 드롭다운(`한국어 / English`)
- **Hero**: GitHub 아바타(에메랄드 glow) + `Workspace Dashboard` 타이틀 + 서브 텍스트 + `SORT BY` 정렬 드롭다운
- **Developer Insights Panel**: 4개 메트릭(`ACTIVE_PROJECTS`, `OPEN_ISSUES`, `SYSTEM_UPTIME`, `LAST_DEPLOY`) glass-rim 패널
  - `ACTIVE_PROJECTS` = 카드 수, `OPEN_ISSUES` = 저장소별 open issue 합계, `SYSTEM_UPTIME` = 고정값 99.9%, `LAST_DEPLOY` = 전체 저장소 중 최신 `pushed_at` 상대 시간
- **Bento Card Grid**: 1/2/3 컬럼 반응형, 카드 = 이미지 + 제목(에메랄드) + 설명 + 칩 2개(`topics[0]` / `topics[1]`) + `Updated: XX AGO`
- **자동 저장소 수집**: 빌드 타임에 GitHub API 로 `jongcheol-pak` public 저장소 목록 조회
- **README 파싱**: 각 저장소 README 에서 첫 이미지 + 180자 요약 자동 추출
- **카드 이미지 폴백**: README 에 이미지가 없거나 원격 이미지 로딩 실패 시 `public/Thumbnail.jpg` 표시
- **카드 배지**: 저장소가 `archived` / `fork` 인 경우 카드 우상단에 배지 자동 표시
- **북마크**: 카드 좌상단 별(★) 버튼으로 즐겨찾기 토글 — 북마크된 저장소는 정렬 결과의 **최상단으로 고정**. 상태는 브라우저 `localStorage` 에 보관
- **검색**: 저장소 이름 + description + Topics 대상 실시간 검색
- **필터**: Topic **다중 선택 (AND 조합)** — 여러 topic 을 체크하면 **모두 포함한** 카드만 남음
- **정렬**: 최근 업데이트순 / 스타순 / 이름순 / 생성일순 (4가지, Hero 우측 드롭다운)
- **URL 공유**: 현재 검색/필터/정렬/페이지 상태가 URL 쿼리(`?q=&topic=&sort=&page=`)에 자동 반영
- **페이지네이션**: 저장소 수가 12개를 초과하면 자동으로 페이지 네비게이션이 노출
- **자동 갱신**: GitHub Actions 스케줄로 **매일 UTC 00:00 (= KST 09:00)** 자동 재빌드 + 배포

### 상세 페이지 (저장소별)
- **URL 형식**: `/{repo-name}/`
- **Top AppBar**: `← Back` + 중앙 `P-J-C` 로고 + 우 언어 드롭다운 (sticky)
- **Project Header**: 상태 pulse 배지(`STABLE` / `BETA` / `ARCHIVED` / `FORK` / `ACTIVE`) + 최신 release tag(`vX.Y.Z_LATEST`) + 타이틀 + 설명 + `Last Updated` 상대 시간
- **2열 레이아웃**: 왼쪽 README 카드(헤더바 + sanitize 된 prose-emerald 본문) + 오른쪽 Releases 카드 + 액션 버튼
- **README 렌더링**: Markdown → 안전한 HTML 변환 (sanitize-html 로 XSS 방지)
- **상대 경로 자동 해결**: README 내 이미지/링크는 GitHub raw/blob 절대 경로로 변환
- **Releases 타임라인**: 세로 라인 + 원형 노드(최신은 에메랄드), 최신 1개(`Latest` 배지) + 과거 최대 3개 + `View all releases` 버튼
- **다운로드 버튼**: 저장소별 다운로드 URL 이 있을 때만 표시 (아래 "Download URL 관리" 참고)
- **GitHub 버튼**: 항상 표시 (에메랄드 테두리, 2-col 그리드)
- **Back to Top**: 300px 이상 스크롤 시 우하단에 에메랄드 버튼 노출
- **상태 분류 규칙**: `archived → ARCHIVED` / `releases[0].prerelease → BETA` / `releases 존재 → STABLE` / `fork → FORK` / 그 외 → `ACTIVE`

### 카드 표시 제외 규칙
- 홈페이지 자체 저장소(`jongcheol-pak.github.io`)는 카드에서 제외
- README.md 파일이 없는 저장소는 카드에서 제외

### SEO / 공유 관련
- **sitemap.xml**: `@astrojs/sitemap` 이 빌드 타임에 자동 생성 (`/sitemap-index.xml`)
- **robots.txt**: 전체 크롤링 허용 + sitemap 위치 명시 (`public/robots.txt`)
- **RSS 피드**: 전체 저장소의 최신 릴리스 20건을 `/rss.xml` 로 노출. `Layout.astro` head 에 `<link rel="alternate" type="application/rss+xml">` 자동 주입
- **canonical / Open Graph / X Card**: 각 페이지별로 절대 URL 주입 — 저장소 상세 페이지를 메신저·SNS 에 붙여넣어도 해당 저장소 페이지 미리보기가 정확히 표시됨
- **저장소별 동적 OG 이미지**: `satori` + `@resvg/resvg-js` 로 빌드 타임에 저장소당 1장씩 1200×630 PNG 를 `/og/<repo>.png` 로 생성. **Emerald Cybernetic 톤** (void 배경 + 에메랄드 좌측 보더 + `P-J-C` 로고 + 에메랄드 PROJECT pill + URL)
  - 영문 폰트: Google Fonts 에서 빌드 타임에 Inter(400/700) TTF/WOFF 를 1회 fetch 후 메모리 캐싱
  - 한글 폰트: `@fontsource/noto-sans-kr` 번들의 korean 서브셋 WOFF 파일 직접 로드 → 한글 description 도 정상 렌더
- **404 페이지**: 존재하지 않는 경로 접근 시 Emerald Cybernetic 톤의 커스텀 404 페이지 (`src/pages/404.astro`) 반환

### 접근성 (a11y)
- **스킵 링크**: 키보드 Tab 첫 포커스 시 좌상단에 "본문 바로가기" 버튼이 슬라이드-인되어 `<main id="main">` 랜드마크로 즉시 이동
- **focus-visible 포커스 링**: 모든 인터랙티브 요소에 키보드 포커스 전용 에메랄드 아웃라인. 마우스 클릭에는 노이즈 없음
- **aria-\* 보강**: 페이지네이션 prev/next `aria-label` + `#page-info` `aria-live="polite"`, Topic 필터 `aria-controls`/`aria-haspopup`/`aria-expanded`, 북마크 버튼 `aria-pressed`, 모든 aria-label 은 i18n 연동(언어 전환 시 자동 갱신)

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
| Sitemap | @astrojs/sitemap | 빌드 타임 sitemap.xml 자동 생성 |
| OG 이미지 | satori + satori-html + @resvg/resvg-js | 저장소별 OG PNG 빌드 타임 생성 |
| OG 한글 폰트 | @fontsource/noto-sans-kr | OG 이미지에서 한글 description 렌더 |
| 언어 | TypeScript 5.x (strict) | 타입 안전성 |
| 배포 | GitHub Pages + GitHub Actions | 정적 호스팅 + CI/CD |
| 폰트 | Space Grotesk, Noto Sans KR, Material Symbols Outlined | 본문·헤딩·아이콘 |

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
│   │       ├── ReleasesCard.astro  # Releases 타임라인
│   │       └── ActionButtons.astro # Download / GitHub 2-col
│   ├── lib/
│   │   ├── github.ts               # GitHub API 호출 (메모이제이션 + 에러 분류)
│   │   ├── readme.ts               # Markdown 파싱
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

---

## 배포

### 최초 설정
1. 저장소 **Settings → Pages → Source** 를 **GitHub Actions** 로 변경
2. `main` 브랜치에 push → 자동 빌드/배포 시작

### 배포 트리거
| 트리거 | 실행 조건 | 반영 소요 |
|---|---|---|
| `push` | `main` 브랜치 push 시 | 2~5분 |
| `schedule` | 매일 UTC 00:00 (KST 09:00) | 2~5분 |
| `workflow_dispatch` | GitHub Actions 탭에서 수동 실행 | 2~5분 |

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
- [x] 저장소 루트에 **`README.md` 파일 존재**

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
  }
}
```
- key: GitHub 저장소 이름 (대소문자 그대로)
- downloadUrl: 클릭 시 이동할 URL (절대 경로)

---

## 라이선스

본 프로젝트의 코드 구조 및 기능은 [bitleader-dev/bitleader](https://github.com/bitleader-dev/bitleader) (MIT) 를 기반으로 이식·재가공한 것입니다. Emerald Cybernetic 디자인은 본 저장소의 자체 작업입니다.
