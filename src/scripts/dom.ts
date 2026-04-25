// 클라이언트 스크립트 공용 DOM 헬퍼

// data-open/aria-expanded 기반 드롭다운 open/close + 바깥 클릭 닫힘
// filter.ts 의 Topic 드롭다운, i18n.ts 의 언어 선택 드롭다운이 공유
export interface DropdownRefs {
  root: HTMLElement | null;   // 외부 클릭 판정 기준 컨테이너
  trigger: HTMLElement | null; // 열기/닫기 버튼
  panel: HTMLElement | null;   // 실제로 열리는 패널
}

export interface DropdownHandle {
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function createDropdown({ root, trigger, panel }: DropdownRefs): DropdownHandle {
  const close = () => {
    panel?.removeAttribute('data-open');
    trigger?.setAttribute('aria-expanded', 'false');
  };
  const open = () => {
    panel?.setAttribute('data-open', 'true');
    trigger?.setAttribute('aria-expanded', 'true');
  };
  const toggle = () => {
    if (!panel) return;
    const isOpen = panel.getAttribute('data-open') === 'true';
    if (isOpen) close();
    else open();
  };

  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });
  document.addEventListener('click', (e) => {
    if (!root) return;
    if (!root.contains(e.target as Node)) close();
  });
  panel?.addEventListener('click', (e) => e.stopPropagation());

  return { open, close, toggle };
}
