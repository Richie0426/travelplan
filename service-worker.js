// =====================================================================
// 智慧旅遊規劃書 — Service Worker
// 變更版本號會強制觸發 SW 更新並清掉舊快取
// =====================================================================
const VERSION = '1.0.1';
const CACHE_PREFIX = 'tw-travel';
const CORE_CACHE = `${CACHE_PREFIX}-core-${VERSION}`;
const TILE_CACHE = `${CACHE_PREFIX}-tiles-${VERSION}`;

// 核心檔案:首次安裝就 precache
const CORE_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
];

// CDN host:cache first(資源不太變,變了改版本號)
const CDN_HOST_PATTERNS = [
  'unpkg.com',
  'cdn.tailwindcss.com',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// OSM 圖磚 host:cache first(山區重要)
const TILE_HOST_PATTERNS = [
  'tile.openstreetmap.org',
];

// 即時 API:永不快取(直接走網路)
const REALTIME_HOST_PATTERNS = [
  'overpass-api.de',
  'router.project-osrm.org',
  'nominatim.openstreetmap.org',
  'media.taiwan.net.tw',
  'firestore.googleapis.com',
  'firebaseio.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'apis.google.com',
  'corsproxy.io',
  'api.qrserver.com',
];

// =====================================================================
// Install:預先快取核心檔案
// =====================================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE)
      .then((cache) => cache.addAll(CORE_FILES))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[SW] install precache failed', err))
  );
});

// =====================================================================
// Activate:清掉舊版快取
// =====================================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names
        .filter((n) => n.startsWith(CACHE_PREFIX) && n !== CORE_CACHE && n !== TILE_CACHE)
        .map((n) => caches.delete(n))
    )).then(() => self.clients.claim())
  );
});

// =====================================================================
// Fetch:依路由規則決定策略
// =====================================================================
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // 即時 API:bypass
  if (REALTIME_HOST_PATTERNS.some((h) => url.hostname.endsWith(h))) {
    return; // 不攔截,直接走 network
  }

  // OSM 圖磚:cache first
  if (TILE_HOST_PATTERNS.some((h) => url.hostname.endsWith(h))) {
    event.respondWith(cacheFirst(req, TILE_CACHE));
    return;
  }

  // CDN:cache first
  if (CDN_HOST_PATTERNS.some((h) => url.hostname.endsWith(h))) {
    event.respondWith(cacheFirst(req, CORE_CACHE));
    return;
  }

  // 同網域:cache first(HTML/JS/CSS/icons)
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req, CORE_CACHE));
    return;
  }

  // 其他第三方:bypass
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const resp = await fetch(req);
    if (resp && (resp.status === 200 || resp.status === 0 /* opaque */)) {
      cache.put(req, resp.clone()).catch(() => { /* quota or non-cacheable */ });
    }
    return resp;
  } catch (e) {
    // 離線且沒快取
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// =====================================================================
// 來自主執行緒的訊息
// =====================================================================
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (data.type === 'CLEAR_TILES') {
    caches.delete(TILE_CACHE).then((ok) => {
      if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok });
    });
    return;
  }
  if (data.type === 'CACHE_TILES') {
    // 預下載地圖:從主執行緒傳一批 tile URL 過來
    cacheTileBatch(data.urls || []).then((report) => {
      if (event.ports && event.ports[0]) event.ports[0].postMessage(report);
    });
    return;
  }
  if (data.type === 'COUNT_TILES') {
    caches.open(TILE_CACHE).then((c) => c.keys()).then((keys) => {
      if (event.ports && event.ports[0]) event.ports[0].postMessage({ count: keys.length });
    });
  }
});

async function cacheTileBatch(urls) {
  const cache = await caches.open(TILE_CACHE);
  let ok = 0;
  let fail = 0;
  // 平行抓 6 個一批,避免一次太多被 OSM 擋
  const BATCH = 6;
  for (let i = 0; i < urls.length; i += BATCH) {
    const chunk = urls.slice(i, i + BATCH);
    await Promise.all(chunk.map(async (u) => {
      try {
        const match = await cache.match(u);
        if (match) { ok++; return; }
        const resp = await fetch(u);
        if (resp && resp.status === 200) {
          await cache.put(u, resp);
          ok++;
        } else {
          fail++;
        }
      } catch (_) { fail++; }
    }));
  }
  return { ok, fail, total: urls.length };
}
