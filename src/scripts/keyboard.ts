// 메인 대시보드 키보드 단축키
// - `/`     : 검색 input 포커스 + 텍스트 선택 (검색창 안에서는 정상 입력으로 통과)
// - `Esc`   : 검색창 포커스 시 값 비우고 blur (다른 위치에서는 기본 동작 유지)
// - `j`/`k` : 보이는 카드 사이 다음/이전 이동 (입력 박스 안에서는 가로채지 않음)
// - `Enter` : 카드 자체에 포커스된 상태에서 상세 페이지 진입
//
// 카드(`<article class="repo-card">`)는 기본 focusable 이 아니므로 첫 j/k 시점에 tabindex="-1" 을 부여한다.
// filter.ts 가 숨긴 카드는 inline `style.display = 'none'` 이므로 visible 판별에 사용한다.

// 텍스트 입력 가능 요소(키 가로채기 금지 대상)
const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

// 입력 박스 / contenteditable 여부 판정
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (EDITABLE_TAGS.has(target.tagName)) return true;
  if (target.isContentEditable) return true;
  return false;
}

// 현재 화면에 보이는 카드만 필터.ts 가 정렬한 순서대로 반환
function getVisibleCards(): HTMLElement[] {
  const grid = document.getElementById('card-grid');
  if (!grid) return [];
  return Array.from(grid.querySelectorAll<HTMLElement>('.repo-card')).filter(
    (c) => c.style.display !== 'none',
  );
}

// 카드를 키보드 포커스 가능 상태로 보장 (마크업은 변경하지 않고 런타임에 부여)
function ensureCardFocusable(cards: HTMLElement[]): void {
  for (const card of cards) {
    if (!card.hasAttribute('tabindex')) card.tabIndex = -1;
  }
}

// 현재 활성 요소가 카드 자체 또는 카드 내부일 때의 visible 카드 인덱스 반환
function getFocusedCardIndex(cards: HTMLElement[]): number {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return -1;
  const direct = cards.indexOf(active);
  if (direct >= 0) return direct;
  const ancestor = active.closest<HTMLElement>('.repo-card');
  if (ancestor instanceof HTMLElement) {
    const idx = cards.indexOf(ancestor);
    if (idx >= 0) return idx;
  }
  return -1;
}

// 카드에 포커스 + 화면 중앙으로 스크롤 (브라우저 기본 스크롤 점프 방지를 위해 preventScroll 후 부드럽게)
function focusCard(card: HTMLElement): void {
  card.focus({ preventScroll: true });
  card.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function initKeyboard(): void {
  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;

  document.addEventListener('keydown', (e) => {
    // 브라우저 단축키 / OS 단축키 보호 — 모디파이어 조합은 절대 가로채지 않음
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const target = e.target;
    const editable = isEditableTarget(target);

    // `/` : 검색 input 포커스 (입력 박스 밖에서만)
    if (e.key === '/' && !editable) {
      if (searchInput) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
      return;
    }

    // `Esc` : 검색창 포커스 시 값 비우고 blur. filter.ts 의 input 이벤트로 결과 갱신 트리거
    if (e.key === 'Escape') {
      if (target === searchInput && searchInput) {
        if (searchInput.value !== '') {
          searchInput.value = '';
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        searchInput.blur();
        e.preventDefault();
      }
      return;
    }

    // 입력 박스 안에서는 j/k/Enter 를 가로채지 않음 (정상 입력 보장)
    if (editable) return;

    // `j` / `k` : 보이는 카드 사이 다음/이전 이동
    if (e.key === 'j' || e.key === 'k') {
      const cards = getVisibleCards();
      if (cards.length === 0) return;
      ensureCardFocusable(cards);
      const idx = getFocusedCardIndex(cards);
      let next: number;
      if (e.key === 'j') {
        next = idx < 0 ? 0 : Math.min(cards.length - 1, idx + 1);
      } else {
        next = idx < 0 ? 0 : Math.max(0, idx - 1);
      }
      focusCard(cards[next]);
      e.preventDefault();
      return;
    }

    // `Enter` : 카드 자체에 포커스된 경우 상세 페이지 진입 (카드 안의 링크/버튼 포커스 시는 기본 동작 유지)
    if (e.key === 'Enter') {
      if (!(target instanceof HTMLElement)) return;
      if (!target.matches('.repo-card')) return;
      const link = target.querySelector<HTMLAnchorElement>('.card-title a, .card-image a');
      if (link) {
        e.preventDefault();
        link.click();
      }
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initKeyboard);
} else {
  initKeyboard();
}
