// Naikkan versi setiap kali file aplikasi berubah agar cache lama dibuang.
const CACHE_VERSION = "absensi-pwa-v2";

// App shell: dicache saat install supaya aplikasi bisa dibuka offline.
const APP_SHELL = [
  "./",
  "./index.html",
  "./index.js",
  "./style.css",
  "./manifest.json",
  "./icon/icon-192.png",
  "./icon/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // allSettled: satu file gagal (mis. style.css belum ada) tidak menggagalkan seluruh install.
      Promise.allSettled(APP_SHELL.map((url) => cache.add(url))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

// Network-first: selalu ambil versi terbaru, jatuh ke cache saat offline.
async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match("./index.html"));
  }
}

// Stale-while-revalidate: aset CDN (Tailwind, html2pdf, SweetAlert, font) jarang berubah.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      // response.type "opaque" (CDN no-cors) tetap boleh dicache.
      if (response.ok || response.type === "opaque") cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || refresh;
}

// self.addEventListener("fetch", (event) => {
//   const { request } = event;
//   if (request.method !== "GET") return;

//   const url = new URL(request.url);
//   const isSameOrigin = url.origin === self.location.origin;

//   event.respondWith(isSameOrigin ? networkFirst(request) : staleWhileRevalidate(request));
// });
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cache API hanya mendukung http(s); abaikan chrome-extension://, data:, dll.
  if (!url.protocol.startsWith("http")) return;

  const isSameOrigin = url.origin === self.location.origin;

  event.respondWith(isSameOrigin ? networkFirst(request) : staleWhileRevalidate(request));
});
