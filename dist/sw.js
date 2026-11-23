// ─────────────────────────────────────────────────────────────
// SERVICE WORKER — rend l'application elle-même (HTML/JS/CSS) disponible
// hors-ligne, en complément du cache local des données (localStorage) géré
// dans App.jsx.
//
// Stratégies, selon le type de fichier :
//  • Pages (navigation) : "réseau d'abord" avec délai maximum de 4 s. Si le
//    réseau ne répond pas à temps (mauvaise 4G, wifi captif), on affiche tout
//    de suite la dernière version connue au lieu de laisser l'écran figé.
//  • /assets/* (fichiers au nom unique, ex. index-AbC123.js) : "cache d'abord".
//    Leur contenu ne change jamais sous le même nom, donc inutile de
//    re-télécharger ; une nouvelle version de l'app a de nouveaux noms.
//  • Autres fichiers du même site (icônes, manifest, polices locales) :
//    "stale-while-revalidate" — réponse immédiate depuis le cache, puis
//    mise à jour discrète en arrière-plan.
//  • /data/*.json et /api/* : jamais interceptés (toujours le réseau).
//    App.jsx appelle les données avec un paramètre ?t= différent à chaque
//    fois et gère déjà son propre repli hors-ligne via localStorage.
//  • Fichiers d'autres sites (polices Google, affiches TMDB) : jamais
//    interceptés. Leurs réponses ne peuvent pas être lues par le service
//    worker et leur mise en cache pèserait lourd sur le quota du téléphone.
// ─────────────────────────────────────────────────────────────
const CACHE_NAME = "cineradar-shell-v3";
const SHELL_URL = "/";
const PRECACHE_URLS = [SHELL_URL, "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png"];
const NAVIGATION_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Un fichier par un : si l'un d'eux échoue (ex: absent), les autres
      // sont quand même mis en cache. (cache.addAll, lui, annule tout dès
      // qu'un seul fichier échoue.)
      Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
    )
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

async function putInCache(key, response) {
  if (!response || response.status !== 200) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(key, response);
}

// Pages : réseau d'abord (avec délai maximum), cache en secours.
// La page est toujours rangée sous la clé "/" : l'app n'a qu'une seule page,
// et ça évite d'empiler une copie par variante d'adresse (ex: /?view=add).
function handleNavigation(event) {
  const networkPromise = fetch(event.request).then((response) => {
    if (response && response.status === 200) {
      event.waitUntil(putInCache(SHELL_URL, response.clone()));
    }
    return response;
  });

  const timeoutPromise = new Promise((resolve) => {
    setTimeout(async () => {
      const cache = await caches.open(CACHE_NAME);
      resolve(await cache.match(SHELL_URL));
    }, NAVIGATION_TIMEOUT_MS);
  });

  // Le premier qui répond gagne ; si le délai expire sans copie en cache
  // (tout premier lancement), on attend simplement le réseau.
  return Promise.race([networkPromise, timeoutPromise]).then((winner) => winner || networkPromise);
}

// Fichiers au nom unique : cache d'abord.
async function handleImmutableAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.status === 200) {
    await cache.put(request, response.clone());
  }
  return response;
}

// Autres fichiers du site : réponse immédiate depuis le cache, mise à jour
// en arrière-plan.
async function handleStaleWhileRevalidate(event) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(event.request);
  const refresh = fetch(event.request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(event.request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) {
    event.waitUntil(refresh);
    return cached;
  }
  const fresh = await refresh;
  return fresh || Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/data/") || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      handleNavigation(event).catch(async () => {
        // Réseau coupé et délai non atteint : ressert la page en cache.
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(SHELL_URL)) || Response.error();
      })
    );
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(handleImmutableAsset(request));
    return;
  }

  event.respondWith(handleStaleWhileRevalidate(event));
});
