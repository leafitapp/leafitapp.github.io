const CACHE = "leafit-site-1";
const CORE = [
  "/",
  "/assets/favicon.svg",
  "/assets/fonts/roboto-flex-400.woff2",
  "/assets/fonts/roboto-flex-500.woff2",
  "/assets/fonts/roboto-flex-600.woff2",
  "/assets/fonts/roboto-flex-700.woff2"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok && (url.pathname === "/" || url.pathname === "/index.html")) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put("/", copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match("/")))
    );
    return;
  }

  e.respondWith(
    caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req)
        .then(async res => {
          if (res.ok) {
            if (url.search) {
              const old = await c.keys();
              await Promise.all(old.filter(k => {
                const u = new URL(k.url);
                return u.pathname === url.pathname && u.search !== url.search;
              }).map(k => c.delete(k)));
            }
            await c.put(req, res.clone());
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
