/**
 * Pomodoroz Service Worker (App Shell & Offline Support)
 * 注意：本 Service Worker 仅管理外壳静态资产缓存，绝不清理或修改用户本地业务数据（localStorage / IndexedDB）
 */

const CACHE_VERSION = "pomodoroz-shell-v1";
const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./favicon.ico",
  "./icons/icon-192.png",
  "./icons/icon-256.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name.startsWith("pomodoroz-shell-") && name !== CACHE_VERSION) {
              return caches.delete(name);
            }
            return Promise.resolve();
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // 只处理 GET 请求；忽略第三方 API（如 Supabase）及跨域非静态资源
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  // 避免缓存 Supabase API 接口
  if (url.hostname.includes("supabase.co") || url.pathname.includes("/rest/v1/")) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 如果网络请求成功，且为本源静态资源，则异步更新到缓存
        if (
          response &&
          response.status === 200 &&
          response.type === "basic" &&
          (url.origin === self.location.origin)
        ) {
          const responseToCache = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // 离线状态下回退到 Cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // 若为导航请求，回退到主页外壳
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return new Response("Offline", {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "text/plain" }
          });
        });
      })
  );
});
