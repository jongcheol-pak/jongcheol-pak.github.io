// 클라이언트 사이드 검색 / Topic 필터(다중, AND) / 정렬 / 북마크 / 페이지네이션
// 카드의 data-* 속성을 읽어 DOM 을 조작하는 방식 (SSG 정적 사이트)
// - applyFilters : 입력·필터·정렬 변경 시 전체 필터링 + 정렬 + DOM 재배치 + 카운트
// - 북마크: localStorage 기반, 북마크된 카드는 정렬 결과의 최상단으로 고정
// - 페이지네이션: 필터 결과가 PAGINATION_THRESHOLD 초과일 때만 UI 노출
// - URL 쿼리 동기화: ?q=&topic=a,b,c&sort=&page=

import { dictionaries, formatTpl, getCurrentLang } from '../i18n/dictionary';
import { createDropdown } from './dom';
import { withBase } from '../lib/paths';

const BOOKMARK_KEY = 'bookmarked-repos';
const PAGE_SIZE = 12;
const PAGINATION_THRESHOLD = 12;
const SEARCH_DEBOUNCE_MS = 150;
const TOAST_DURATION_MS = 2500;

interface CardElement extends HTMLElement {
  dataset: DOMStringMap & {
    name: string;
    description: string;
    topics: string;
    stars: string;
    updated: string;
    created: string;
  };
}

type SortKey = 'updated' | 'stars' | 'name' | 'created';
const DEFAULT_SORT: SortKey = 'updated';
const VALID_SORTS: readonly SortKey[] = ['updated', 'stars', 'name', 'created'];

function loadBookmarks(): Set<string> {
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.filter((v): v is string => typeof v === 'string')) : new Set();
  } catch {
    return new Set();
  }
}
function saveBookmarks(s: Set<string>): void {
  try {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(Array.from(s)));
  } catch {
    // 저장 실패는 조용히 무시
  }
}

function initFilter() {
  const grid = document.getElementById('card-grid');
  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  const sortSelect = document.getElementById('sort-order') as HTMLSelectElement | null;
  const resultCount = document.getElementById('result-count');

  const topicFilterRoot = document.getElementById('topic-filter');
  const topicToggle = document.getElementById('topic-filter-toggle') as HTMLButtonElement | null;
  const topicPanel = document.getElementById('topic-filter-panel');
  const topicLabel = document.getElementById('topic-filter-label');
  const topicClear = document.getElementById('topic-filter-clear');
  const topicCheckboxes = Array.from(
    document.querySelectorAll<HTMLInputElement>('.topic-checkbox'),
  );

  const pagination = document.getElementById('pagination');
  const pagePrev = document.getElementById('page-prev') as HTMLButtonElement | null;
  const pageNext = document.getElementById('page-next') as HTMLButtonElement | null;
  const pageInfo = document.getElementById('page-info');

  if (!grid) return;

  const allCards = Array.from(grid.querySelectorAll<CardElement>('.repo-card'));
  let currentPage = 1;
  let lastFilteredOrder: CardElement[] = [];
  const bookmarks = loadBookmarks();

  // A-4: 검색 인덱스 — lazy fetch. 도착 전에는 기존 검색(name/desc/topics) 만으로 동작 (race 폴백)
  // 도착 시점에 현재 검색어가 있으면 결과를 자동으로 한 번 갱신
  let searchIndex: Map<string, string> | null = null;

  const getTotalPages = () => {
    const total = lastFilteredOrder.length;
    if (total <= PAGINATION_THRESHOLD) return 1;
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  };

  const toastEl = document.getElementById('global-toast');
  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  const showToast = (message: string) => {
    if (!toastEl) return;
    toastEl.textContent = message;
    if (toastTimer) clearTimeout(toastTimer);
    toastEl.classList.remove('opacity-0', 'translate-y-2');
    toastTimer = setTimeout(() => {
      toastEl.classList.add('opacity-0', 'translate-y-2');
    }, TOAST_DURATION_MS);
  };

  const getCardPageByName = (name: string): number | null => {
    const idx = lastFilteredOrder.findIndex((c) => c.dataset.name === name);
    if (idx < 0) return null;
    return Math.floor(idx / PAGE_SIZE) + 1;
  };

  const getSelectedTopics = (): string[] =>
    topicCheckboxes.filter((c) => c.checked).map((c) => c.value);

  const updateTopicLabel = () => {
    if (!topicLabel) return;
    const selected = getSelectedTopics();
    const dict = dictionaries[getCurrentLang()];
    topicLabel.textContent =
      selected.length === 0
        ? dict.topic_multi_placeholder
        : formatTpl(dict.topic_multi_summary, { count: selected.length });
  };

  const restoreFromQuery = () => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    const topicParam = params.get('topic');
    const sort = params.get('sort');
    const page = params.get('page');
    if (q !== null && searchInput) searchInput.value = q;
    if (topicParam !== null) {
      const wanted = new Set(topicParam.split(',').map((s) => s.trim()).filter(Boolean));
      for (const cb of topicCheckboxes) {
        cb.checked = wanted.has(cb.value);
      }
    }
    if (sort !== null && sortSelect && (VALID_SORTS as readonly string[]).includes(sort)) {
      sortSelect.value = sort;
    }
    if (page !== null) {
      const n = Number(page);
      if (Number.isFinite(n) && n >= 1) currentPage = Math.floor(n);
    }
  };

  const syncQuery = () => {
    const params = new URLSearchParams();
    const q = (searchInput?.value ?? '').trim();
    const selected = getSelectedTopics();
    const sort = sortSelect?.value ?? DEFAULT_SORT;
    if (q) params.set('q', q);
    if (selected.length > 0) params.set('topic', selected.join(','));
    if (sort && sort !== DEFAULT_SORT) params.set('sort', sort);
    if (currentPage > 1) params.set('page', String(currentPage));
    const qs = params.toString();
    const next = qs ? `${location.pathname}?${qs}${location.hash}` : `${location.pathname}${location.hash}`;
    history.replaceState(null, '', next);
  };

  const updateCount = () => {
    if (!resultCount) return;
    const total = allCards.length;
    const shown = lastFilteredOrder.length;
    const dict = dictionaries[getCurrentLang()];
    resultCount.textContent =
      shown === total
        ? formatTpl(dict.count_all, { total })
        : formatTpl(dict.count_filtered, { shown, total });
  };

  const applyFilters = () => {
    const query = (searchInput?.value ?? '').trim().toLowerCase();
    const selectedTopics = getSelectedTopics();
    const sortKey = (sortSelect?.value ?? DEFAULT_SORT) as SortKey;

    const filtered = allCards.filter((card) => {
      if (query) {
        // dataset.name/description 은 원문 케이스 그대로 렌더되므로 비교 시 소문자 정규화 필요
        const nameHit = card.dataset.name.toLowerCase().includes(query);
        const descHit = card.dataset.description.toLowerCase().includes(query);
        const topicsHit = card.dataset.topics.toLowerCase().includes(query);
        // A-4: README 인덱스 매칭 — 인덱스 미도착 시 false 로 폴백 (기존 검색 동작 유지)
        let readmeHit = false;
        if (searchIndex) {
          const text = searchIndex.get(card.dataset.name.toLowerCase());
          if (text) readmeHit = text.includes(query);
        }
        if (!nameHit && !descHit && !topicsHit && !readmeHit) return false;
      }
      if (selectedTopics.length > 0) {
        const cardTopics = card.dataset.topics.split(',').filter(Boolean);
        for (const t of selectedTopics) {
          if (!cardTopics.includes(t)) return false;
        }
      }
      return true;
    });

    filtered.sort((a, b) => {
      switch (sortKey) {
        case 'stars':
          return Number(b.dataset.stars) - Number(a.dataset.stars);
        case 'name':
          return a.dataset.name.localeCompare(b.dataset.name);
        case 'created':
          return new Date(b.dataset.created).getTime() - new Date(a.dataset.created).getTime();
        case 'updated':
        default:
          return new Date(b.dataset.updated).getTime() - new Date(a.dataset.updated).getTime();
      }
    });

    if (bookmarks.size > 0) {
      const bookmarked: CardElement[] = [];
      const rest: CardElement[] = [];
      for (const c of filtered) {
        if (bookmarks.has(c.dataset.name)) bookmarked.push(c);
        else rest.push(c);
      }
      filtered.length = 0;
      filtered.push(...bookmarked, ...rest);
    }

    lastFilteredOrder = filtered;

    const total = filtered.length;
    const paginated = total > PAGINATION_THRESHOLD;
    const totalPages = getTotalPages();
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const pageStart = paginated ? (currentPage - 1) * PAGE_SIZE : 0;
    const pageEnd = paginated ? pageStart + PAGE_SIZE : total;
    const visible = filtered.slice(pageStart, pageEnd);

    for (const card of allCards) {
      card.style.display = 'none';
    }
    const frag = document.createDocumentFragment();
    for (const card of visible) {
      card.style.display = '';
      frag.appendChild(card);
    }
    grid.appendChild(frag);

    if (pagination) {
      if (paginated) {
        pagination.classList.remove('hidden');
        if (pagePrev) pagePrev.disabled = currentPage <= 1;
        if (pageNext) pageNext.disabled = currentPage >= totalPages;
      } else {
        pagination.classList.add('hidden');
      }
    }

    updateCount();
    updateTopicLabel();
    updatePageInfo();
    syncQuery();
  };

  const updatePageInfo = () => {
    if (!pageInfo) return;
    const dict = dictionaries[getCurrentLang()];
    pageInfo.textContent = formatTpl(dict.pagination_info, {
      page: currentPage,
      total: getTotalPages(),
    });
  };

  const initBookmarkButtons = () => {
    const buttons = document.querySelectorAll<HTMLButtonElement>('.bookmark-btn');

    const syncState = (btn: HTMLButtonElement, pressed: boolean) => {
      const key = pressed ? 'bookmark_remove' : 'bookmark_add';
      btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      btn.dataset.i18nArialabel = key;
      btn.setAttribute('aria-label', dictionaries[getCurrentLang()][key]);
    };

    for (const btn of buttons) {
      const name = btn.dataset.repoName ?? '';
      syncState(btn, bookmarks.has(name));

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const nowPressed = !bookmarks.has(name);
        if (nowPressed) bookmarks.add(name);
        else bookmarks.delete(name);
        saveBookmarks(bookmarks);
        syncState(btn, nowPressed);
        applyFilters();

        const targetPage = getCardPageByName(name.toLowerCase());
        if (targetPage !== null && targetPage !== currentPage) {
          const dict = dictionaries[getCurrentLang()];
          showToast(formatTpl(dict.toast_card_moved, { page: targetPage }));
        }
      });
    }
  };

  createDropdown({
    root: topicFilterRoot,
    trigger: topicToggle,
    panel: topicPanel,
  });

  // 카드 chip(button[data-topic]) 의 aria-pressed 를 현재 선택 topic 셋과 동기화
  const syncChipPressed = () => {
    const selected = new Set(getSelectedTopics());
    const chips = grid.querySelectorAll<HTMLButtonElement>('.card-chip[data-topic]');
    for (const chip of chips) {
      const topic = chip.dataset.topic ?? '';
      chip.setAttribute('aria-pressed', selected.has(topic) ? 'true' : 'false');
    }
  };

  for (const cb of topicCheckboxes) {
    cb.addEventListener('change', () => {
      currentPage = 1;
      applyFilters();
      syncChipPressed();
    });
  }
  topicClear?.addEventListener('click', () => {
    for (const cb of topicCheckboxes) cb.checked = false;
    currentPage = 1;
    applyFilters();
    syncChipPressed();
  });

  // 카드 chip 클릭으로 Topic 토글 (event delegation)
  // - <button> 자체라 카드 진입 링크와 충돌 없음. stopPropagation 으로 미래 카드 click 핸들러 보호
  // - 알 수 없는 topic(필터 옵션에 없는 값) → 무시
  grid.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const chip = target.closest<HTMLButtonElement>('.card-chip[data-topic]');
    if (!chip) return;
    const topic = chip.dataset.topic;
    if (!topic) return;
    const cb = topicCheckboxes.find((c) => c.value === topic);
    if (!cb) return;
    e.preventDefault();
    e.stopPropagation();
    cb.checked = !cb.checked;
    currentPage = 1;
    applyFilters();
    syncChipPressed();
  });

  const resetToFirstPage = () => {
    currentPage = 1;
    applyFilters();
  };
  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  searchInput?.addEventListener('input', () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(resetToFirstPage, SEARCH_DEBOUNCE_MS);
  });
  sortSelect?.addEventListener('change', resetToFirstPage);

  pagePrev?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage -= 1;
      applyFilters();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  pageNext?.addEventListener('click', () => {
    if (currentPage < getTotalPages()) {
      currentPage += 1;
      applyFilters();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  initBookmarkButtons();

  window.addEventListener('langchange', () => {
    updateCount();
    updateTopicLabel();
    updatePageInfo();
  });

  restoreFromQuery();
  applyFilters();
  syncChipPressed();

  // A-4: 검색 인덱스 idle 로드 — 도착하면 현재 검색어가 있는 경우만 자동 재실행
  const loadIdx = () => {
    fetch(withBase('/search-index.json'))
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: Array<{ name: string; text: string }>) => {
        searchIndex = new Map(data.map((e) => [e.name, e.text]));
        const q = (searchInput?.value ?? '').trim();
        if (q) applyFilters();
      })
      .catch(() => {
        // 네트워크 실패는 조용히 무시 — 기존 검색(name/desc/topics) 동작 유지
      });
  };
  const ric = (window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  }).requestIdleCallback;
  if (typeof ric === 'function') {
    ric(loadIdx, { timeout: 2000 });
  } else {
    setTimeout(loadIdx, 200);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFilter);
} else {
  initFilter();
}
