// The service worker for offline play (see the offline() plugin in vite.config.ts, which fills in
// VERSION and FILES and saves this as sw.js in the built site; this file is never run as it is).
//
// How it works, in plain words:
// - install: download every file of the site into a cache named after this version. If any file
//   fails, the whole install fails and the browser simply tries again on the next visit, so a
//   half-saved copy is never used.
// - activate: take over straight away, and delete old versions except the one just before this,
//   so a page that is still open on the old version can still load its parts.
// - fetch: answer from the saved copy first (instant, and works with no connection); anything not
//   saved goes to the network as normal. Photos from Wikipedia and the historical maps are not
//   saved: they come from other sites and only work online.
/* eslint-disable no-restricted-globals */
const VERSION = "__VERSION__";
const FILES = [] /* __FILES__ */;
const PREFIX = "recall-arcade-";
const CACHE = PREFIX + VERSION;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const ours = (await caches.keys()).filter((k) => k.startsWith(PREFIX) && k !== CACHE);
      // caches.keys() lists caches in the order they were made, so the last one is the previous version.
      for (const old of ours.slice(0, -1)) await caches.delete(old);
      await self.clients.claim();
      for (const client of await self.clients.matchAll()) client.postMessage({ type: "offline-ready", version: VERSION });
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "version?") event.source?.postMessage({ type: "offline-ready", version: VERSION });
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // other sites: let the browser handle it
  event.respondWith(
    (async () => {
      const mine = await caches.open(CACHE);
      // Opening the site (any #page) is a visit to index.html.
      // ignoreVary: the saved copies were fetched without the headers a page's own request carries
      // (Origin, for scripts), and the server's "Vary" header would otherwise make them not match.
      const opts = { ignoreSearch: true, ignoreVary: true };
      const hit = req.mode === "navigate" ? await mine.match("./", opts) : await mine.match(req, opts);
      if (hit) return hit;
      const older = await caches.match(req, opts);
      if (older) return older;
      return fetch(req);
    })(),
  );
});
