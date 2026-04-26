// Service Worker emit (C-1) — `/sw.js` 로 정적 출력
// CACHE_NAME 은 빌드 타임마다 base36 timestamp 로 unique → 새 빌드는 새 캐시
// 정책: HTML = network-first (사이트 갱신 즉시 반영), 정적 자산 = stale-while-revalidate
//       skipWaiting + clients.claim 으로 새 SW 즉시 활성화
import type { APIRoute } from 'astro';

export const prerender = true;

const CACHE_VERSION = `pjc-v${Date.now().toString(36)}`;

const SW_BODY = `// 자동 생성된 Service Worker (src/pages/sw.js.ts)
// CACHE_NAME 은 빌드마다 새 값 → activate 단계에서 이전 캐시 정리 + clients.claim 으로 즉시 활성
const CACHE_NAME = '${CACHE_VERSION}';

self.addEventListener('install', () => {
  // 새 SW 즉시 활성 (사용자가 탭 닫지 않아도 다음 fetch 부터 새 SW 가 응답)
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // cross-origin (GitHub avatar / raw.githubusercontent.com 이미지 / 폰트 CDN 등) 은 통과
  if (url.origin !== self.location.origin) return;

  const accept = req.headers.get('Accept') || '';
  const isHtml = req.mode === 'navigate' || accept.includes('text/html');

  if (isHtml) {
    event.respondWith(networkFirst(req));
  } else {
    event.respondWith(staleWhileRevalidate(req));
  }
});

// HTML: 네트워크 우선, 실패 시 캐시 폴백 (오프라인 모드 지원)
async function networkFirst(req) {
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch (err) {
    const cached = await caches.match(req);
    if (cached) return cached;
    throw err;
  }
}

// 정적 자산(JS/CSS/이미지/폰트): 캐시 즉시 반환 + 백그라운드 갱신 (다음 방문에 새 버전)
async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  const networkPromise = fetch(req)
    .then((res) => {
      if (res && res.status === 200) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || networkPromise;
}
`;

export const GET: APIRoute = async () =>
  new Response(SW_BODY, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      // SW 본체는 자주 갱신되어야 하므로 캐싱 금지 (브라우저 기본 SW 정책 보호)
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
