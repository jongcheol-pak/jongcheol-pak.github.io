## [2026-02-11] - Fixing Path Issues & Adding Favicon
### 변경사항:
- **`assets/favicon`**: 파비콘 이미지들을 이 경로로 이동
- **`_layouts/default.html`**:
  - 파비콘 링크 추가
  - **Critical Fix**: `relative_url` 필터 내의 경로 문자열 시작 부분 공백 제거 (e.g., `{{ " /path" }}` -> `{{ "/path" }}`)
  - 내비게이션 및 로고 링크의 공백 제거
- **`README.md`**: 코딩 규칙(Liquid 템플릿 경로 설정) 추가

### 메모:
- `relative_url` 사용 시 공백이 들어가면 브라우저가 경로를 잘못 인식하여 리소스 로딩 실패 발생
- 향후 수정 시 공백이 추가되지 않도록 주의 필요
