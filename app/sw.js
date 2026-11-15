const V = "dotcalc-2.0.0";
const FILES = ["./", "index.html", "style.css", "script.js", "converter.js", "icons.js", "privacy.html", "manifest.webmanifest",
  "fonts/dotty.ttf", "fonts/Tiny5-SolidRegular.ttf", "icons/icon-192.png", "icons/icon-512.png", "icons/favicon-32.png"];
self.addEventListener("install", e => e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
