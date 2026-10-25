// ─────────────────────────────────────────────────────────────
// Lecture d'un lien Letterboxd partagé (ex. https://boxd.it/RTVm) pour
// retrouver le film. Fonctions pures, sans accès réseau : le réseau est géré
// par api/resolve-letterboxd.js, ce qui permet de tout tester ici.
//
// Sécurité : seuls boxd.it et letterboxd.com (en https) sont autorisés. Le
// serveur ne suit jamais une redirection vers un autre site.
// ─────────────────────────────────────────────────────────────

const ALLOWED_HOSTS = new Set(["boxd.it", "www.boxd.it", "letterboxd.com", "www.letterboxd.com"]);

// Retrouve le premier lien boxd.it / letterboxd.com dans un texte collé
// (le partage Letterboxd ajoute parfois du texte autour du lien).
function extractLink(text) {
  const match = String(text || "").match(/(?:https?:\/\/)?(?:www\.)?(?:boxd\.it|letterboxd\.com)\/[^\s"'<>]+/i);
  if (!match) return null;
  let link = match[0].replace(/[.,;:!?)\]]+$/, "");
  if (!/^https?:\/\//i.test(link)) link = `https://${link}`;
  return link.replace(/^http:\/\//i, "https://");
}

function isAllowedUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

// À partir d'une adresse letterboxd.com déjà résolue : identifie la fiche
// film (slug) ou un lien direct /tmdb/{id}. Retourne null pour tout le reste
// (profil, liste, page de recherche...).
function parseFilmPath(value) {
  try {
    const url = new URL(value);
    const film = url.pathname.match(/\/film\/([a-z0-9][a-z0-9-]*)(?:\/|$)/i);
    if (film) return { slug: film[1].toLowerCase() };
    const tmdb = url.pathname.match(/^\/tmdb\/(\d+)\/?$/);
    if (tmdb) return { tmdbId: Number(tmdb[1]) };
    return null;
  } catch {
    return null;
  }
}

// Letterboxd distingue les homonymes en ajoutant l'année au slug
// (ex. "dune-2021"). Sans ça, on retombe simplement sur le slug en clair.
function titleFromSlug(slug) {
  let base = String(slug || "");
  let year = null;
  const withYear = base.match(/^(.*)-(\d{4})$/);
  if (withYear) {
    base = withYear[1];
    year = Number(withYear[2]);
  }
  return { title: base.replace(/-/g, " ").trim(), year };
}

function decodeEntities(str) {
  return String(str || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function getMeta(html, property) {
  const a = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`, "i"));
  if (a) return decodeEntities(a[1]);
  const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`, "i"));
  return b ? decodeEntities(b[1]) : null;
}

// Extrait ce qu'on peut d'une fiche film Letterboxd : identifiant TMDB,
// titre et année. Chaque information est facultative : si Letterboxd change
// sa page, on renvoie simplement moins de choses plutôt que de planter.
function parseFilmPage(html) {
  const source = String(html || "");

  let tmdbId = null;
  const typeMatch = source.match(/data-tmdb-type=["'](\w+)["']/i);
  if (!typeMatch || typeMatch[1].toLowerCase() === "movie") {
    const direct = source.match(/data-tmdb-id=["'](\d+)["']/i) || source.match(/themoviedb\.org\/movie\/(\d+)/i);
    if (direct) tmdbId = Number(direct[1]);
  }

  let title = null;
  let year = null;
  const ogTitle = getMeta(source, "og:title");
  const titleTag = source.match(/<title[^>]*>([^<]*)<\/title>/i);
  for (const candidate of [ogTitle, titleTag ? decodeEntities(titleTag[1]) : null]) {
    if (!candidate) continue;
    const m = candidate.match(/^(.*?)\s*\((\d{4})\)/);
    if (m && m[1].trim()) {
      title = m[1].trim();
      year = Number(m[2]);
      break;
    }
  }

  return { tmdbId, title, year };
}

module.exports = { ALLOWED_HOSTS, extractLink, isAllowedUrl, parseFilmPath, titleFromSlug, parseFilmPage };
