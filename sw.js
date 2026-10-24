// Home-screen app helper. Network first, so the plan is always current when online;
// the last copy is kept for when the signal drops (ferries, islands). Shared state still syncs through Supabase when back online.
const CACHE = "th26-v1";
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const u = new URL(req.url);
  const mine = u.origin === location.origin || /unpkg\.com|cdn\.jsdelivr\.net/.test(u.host);
  if (!mine || u.pathname.includes("/rest/") || u.pathname.includes("/realtime/")) return;
  e.respondWith(fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })
    .catch(() => caches.match(req, { ignoreSearch: u.origin === location.origin }).then(r => r || caches.match("L.html", { ignoreSearch: true }))));
});
