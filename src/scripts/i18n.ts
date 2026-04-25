// 클라이언트 사이드 언어 전환 런타임
// - 초기 언어: localStorage STORAGE_KEY > navigator.language > 'ko'
// - 지원 속성:
//   - data-i18n="key"             : textContent 교체
//   - data-i18n-placeholder="key" : placeholder 속성 교체
//   - data-i18n-arialabel="key"   : aria-label 속성 교체
//   - data-iso="2025-01-01T..."   : 상대 시간 포맷으로 textContent 교체
//   - data-i18n-tpl="key"         : 템플릿, 변수는 data-i18n-var-<name> 로 수집
// - 언어 변경 시 window 에 'langchange' CustomEvent 발생 → filter.ts 등 재계산
//
// 본 사이트는 헤더에 button 기반 드롭다운(.lang-switcher)을 사용하므로
// `[data-set-lang]` 속성이 붙은 모든 요소를 클릭 핸들러로 등록한다.

import {
  STORAGE_KEY,
  dictionaries,
  formatRelative,
  formatTpl,
  type LangCode,
} from '../i18n/dictionary';
import { createDropdown } from './dom';

function getInitialLang(): LangCode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'ko' || stored === 'en') return stored;
  } catch {
    // localStorage 접근 불가 환경 대비
  }
  const nav = (navigator.language || 'ko').toLowerCase();
  return nav.startsWith('en') ? 'en' : 'ko';
}

const VAR_PREFIX = 'i18nVar';
function collectVars(el: HTMLElement): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const key in el.dataset) {
    if (key.startsWith(VAR_PREFIX) && key.length > VAR_PREFIX.length) {
      const rest = key.slice(VAR_PREFIX.length);
      const name = rest.charAt(0).toLowerCase() + rest.slice(1);
      vars[name] = el.dataset[key] ?? '';
    }
  }
  return vars;
}

let currentLang: LangCode | null = null;

function applyLang(lang: LangCode) {
  // 동일 언어 재적용 시 DOM 전체 순회 + 포맷 재계산 불필요
  if (currentLang === lang) return;
  currentLang = lang;

  const dict = dictionaries[lang];
  const now = Date.now();

  document.documentElement.lang = lang;

  const selector =
    '[data-i18n],[data-i18n-placeholder],[data-i18n-arialabel],[data-iso],[data-i18n-tpl]';
  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    const textKey = el.dataset.i18n as keyof typeof dict | undefined;
    if (textKey && dict[textKey]) el.textContent = dict[textKey];

    const phKey = el.dataset.i18nPlaceholder as keyof typeof dict | undefined;
    if (phKey && dict[phKey]) el.setAttribute('placeholder', dict[phKey]);

    const arKey = el.dataset.i18nArialabel as keyof typeof dict | undefined;
    if (arKey && dict[arKey]) el.setAttribute('aria-label', dict[arKey]);

    const iso = el.dataset.iso;
    if (iso) el.textContent = formatRelative(iso, lang, now);

    const tplKey = el.dataset.i18nTpl as keyof typeof dict | undefined;
    if (tplKey && dict[tplKey]) {
      el.textContent = formatTpl(dict[tplKey], collectVars(el));
    }
  });

  // meta description 갱신
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', dict.meta_description);

  // 현재 언어 표시: 네이티브 명칭으로 풀어서 표기
  const LANG_NATIVE: Record<LangCode, string> = { ko: '한국어', en: 'English' };
  const langLabel = document.getElementById('lang-current-label');
  if (langLabel) langLabel.textContent = LANG_NATIVE[lang];
  document.querySelectorAll<HTMLButtonElement>('[data-set-lang]').forEach((btn) => {
    const isActive = btn.dataset.setLang === lang;
    btn.setAttribute('aria-current', isActive ? 'true' : 'false');
  });

  window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

function init() {
  const lang = getInitialLang();

  // 드롭다운 토글
  const switcher = document.querySelector<HTMLElement>('.lang-switcher');
  const { close: closeMenu } = createDropdown({
    root: switcher,
    trigger: document.getElementById('lang-trigger'),
    panel: document.getElementById('lang-menu'),
  });

  // 언어 선택 버튼
  document.querySelectorAll<HTMLButtonElement>('[data-set-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.setLang as LangCode | undefined;
      if (next !== 'ko' && next !== 'en') return;
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // 저장 실패는 조용히 무시
      }
      applyLang(next);
      closeMenu();
    });
  });

  applyLang(lang);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
