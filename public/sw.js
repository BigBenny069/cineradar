// ─────────────────────────────────────────────────────────────
// SERVICE WORKER — rend l'application elle-même (HTML/JS/CSS) disponible
// hors-ligne, en complément du cache local des données (localStorage) géré
// dans App.jsx. Sans ce fichier, le téléphone doit toujours re-télécharger
// l'app depuis Internet avant de pouvoir exécuter le moindre code — donc
// en coupure réseau totale (mode avion), rien ne s'affiche du tout, même
// si les données étaient déjà en cache.
//
// Stratégie : "réseau d'abord, cache en secours" (network-first). Chaque
// requête réussie est mise en cache au passage ; si le réseau échoue, on
// ressert la dernière version connue depuis le cache.
//
// Les fichiers /data/*.json sont volontairement exclus de ce cache : App.jsx
// les appelle avec un paramètre `?t=` (horodatage) différent à chaque fois
// pour forcer une lecture fraîche, donc leur URL change en permanence — le
// cache ne retrouverait jamais une correspondance exacte en mode hors-ligne
// et ne ferait qu'accumuler des copies inutilisables. Ces fichiers ont déjà
// leur propre filet de secours hors-ligne, via localStorage, dans App.jsx.
// ─────────────────────────────────────────────────────────────
const CACHE_NAME = "cineradar-shell-v2";
const PRECACHE_URLS = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {
        // Pas grave si le précache échoue (ex: hors ligne dès l'installation
        // elle-même) — le cache "au fil de l'eau" prendra le relais dès que
        // le réseau sera disponible.
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.pathname.startsWith("/data/")) {
    // Pas de mise en cache pour ces fichiers (voir le commentaire en tête de
    // fichier) — simple passe-plat réseau, App.jsx gère déjà son propre
    // repli hors-ligne pour ces données via localStorage.
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (e) {
        const cached = await cache.match(request);
        if (cached) return cached;
        // Repli ultime pour une navigation directe vers l'app (ex: ouverture
        // depuis l'écran d'accueil) : ressert la page principale en cache.
        if (request.mode === "navigate") {
          const shell = await cache.match("/");
          if (shell) return shell;
        }
        throw e;
      }
    })
  );
});
