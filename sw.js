/* 333 背书房 · 离线缓存（stale-while-revalidate） */
var CACHE = "k333-v6";
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) {
  e.waitUntil((async function () {
    var keys = await caches.keys();
    await Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;
  e.respondWith((async function () {
    var cache = await caches.open(CACHE);
    var hit = await cache.match(req);
    var net = fetch(req).then(function (res) {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(function () { return null; });
    if (hit) { e.waitUntil(net.then(function () {}).catch(function () {})); return hit; }
    var res = await net;
    return res || new Response("", { status: 504, statusText: "offline" });
  })());
});
