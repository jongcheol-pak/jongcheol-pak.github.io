# jongcheol-pak.github.io

## 코딩 규칙 (Coding Conventions)

### Liquid 템플릿 경로 설정 (Critical)
**설명**: `relative_url` 필터를 사용할 때, 경로 문자열 시작 부분에 **절대 공백을 포함하지 마십시오**.
공백이 포함되면 브라우저가 경로를 `%20/path`로 해석하여 리소스를 찾지 못합니다.

**잘못된 예 (Do NOT use):**
```html
<link href="{{ " /assets/css/style.css" | relative_url }}">
<a href="{{ " /#games" | relative_url }}">
```

**올바른 예 (Correct):**
```html
<link href="{{ "/assets/css/style.css" | relative_url }}">
<a href="{{ "/#games" | relative_url }}">
```
