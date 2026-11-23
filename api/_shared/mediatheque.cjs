// Médiathèque numérique (ARTE / UniversCiné) — recherche par titre dans son
// catalogue public. Le catalogue complet n'est servi qu'aux visiteurs situés en
// France : cette fonction doit donc tourner depuis la région Paris de Vercel.

const SEARCH_URL = "https://vod.mediatheque-numerique.com/api/proxy/api/product/search";
const FILM_BASE = "https://vod.mediatheque-numerique.com/films/";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function normalize(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Ne garde que les champs utiles d'un produit renvoyé par l'API.
function simplifyProduct(p) {
  return {
    title: p.title || "",
    year: p.productionYear || null,
    directors: Array.isArray(p.directors) ? p.directors.map((d) => (typeof d === "string" ? d : d?.name || "")).filter(Boolean) : [],
    slug: p.slug || null,
    url: p.slug ? FILM_BASE + p.slug : null,
    movieType: p.movieType || null,
    productType: p.productType || null,
    outOfCatalog: Boolean(p.outOfCatalog),
  };
}

async function searchMediatheque(term, fetchImpl = fetch) {
  const r = await fetchImpl(SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": UA,
      Referer: "https://vod.mediatheque-numerique.com/products",
      Origin: "https://vod.mediatheque-numerique.com",
    },
    body: JSON.stringify({ withAggregations: false, sortType: "SCORE", pageNumber: 0, searchTerm: term }),
    signal: AbortSignal.timeout(8000),
  });
  // 204 = aucun résultat
  if (r.status === 204) return { total: 0, results: [] };
  if (!r.ok) throw new Error(`Médiathèque numérique : HTTP ${r.status}`);
  const data = await r.json();
  const page = data?.content?.products ?? data?.content ?? {};
  const list = Array.isArray(page.content) ? page.content : [];
  return { total: page.totalElements ?? list.length, results: list.map(simplifyProduct) };
}

const PLATFORM_NAME = "Médiathèque numérique";
const DEFAULT_BASE_URL = "https://cineradar-nu.vercel.app";

function lastName(fullName) {
  const parts = normalize(fullName).split(" ").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

// Choisit, parmi les résultats (recherche floue), LE film qui correspond :
// même titre (au sens normalisé, sur l'un des titres connus), année à ±1 près
// (ou réalisateur identique quand l'année du catalogue manque), long métrage
// uniquement, encore au catalogue. Renvoie null si aucun ne convient.
function pickMediathequeMatch(results, { titles, year, director }) {
  const wanted = new Set((titles || []).map(normalize).filter(Boolean));
  if (!wanted.size) return null;
  const wantedLast = lastName(director);
  const y = parseInt(year, 10);
  const scored = [];
  for (const r of results || []) {
    if (r.outOfCatalog || r.productType !== "PROGRAM") continue;
    if (r.movieType && r.movieType !== "LONG") continue;
    if (!wanted.has(normalize(r.title))) continue;
    const dirMatch = Boolean(wantedLast) && r.directors.some((d) => normalize(d).split(" ").includes(wantedLast));
    let yearOk;
    if (r.year && y) yearOk = Math.abs(r.year - y) <= 1;
    else yearOk = dirMatch; // année inconnue d'un côté : le réalisateur doit confirmer
    if (!yearOk) continue;
    scored.push({ r, score: (r.year === y ? 2 : 0) + (dirMatch ? 1 : 0) });
  }
  if (!scored.length) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0].r;
}

// Interroge la fonction Paris de CinéRadar (le catalogue complet n'est servi
// qu'aux visiteurs situés en France) pour un film. Ne lève jamais d'exception :
//   { status: "found", mn }  — film trouvé
//   { status: "absent" }     — recherche réussie, film absent du catalogue
//   { status: "error", why } — recherche impossible (on garde le résultat précédent)
async function lookupViaParis(film, { baseUrl = DEFAULT_BASE_URL, fetchImpl = fetch } = {}) {
  const titles = [...new Set([film.title, film.altTitle].filter(Boolean))];
  try {
    for (const t of titles) {
      const r = await fetchImpl(`${baseUrl}/api/search-tmdb?mn=${encodeURIComponent(t)}`, { signal: AbortSignal.timeout(15000) });
      if (!r.ok) return { status: "error", why: `HTTP ${r.status}` };
      const data = await r.json();
      // Garde-fou : hors de France, le catalogue est tronqué — un « absent »
      // n'aurait aucune valeur. On exige donc la région Paris.
      if (data.region !== "cdg1") return { status: "error", why: `région ${data.region || "inconnue"}` };
      if (data.error) return { status: "error", why: data.error };
      const m = pickMediathequeMatch(data.results, { titles, year: film.year, director: film.director });
      if (m) return { status: "found", mn: { url: m.url, checkedAt: new Date().toISOString() } };
    }
    return { status: "absent" };
  } catch (e) {
    return { status: "error", why: e.message };
  }
}

// Résultat final pour une fiche, en tenant compte du passage précédent :
// en cas d'erreur de recherche, on garde l'ancien état plutôt que de faire
// clignoter la disponibilité.
async function checkMediatheque(film, previousMn, opts = {}) {
  const res = await lookupViaParis(film, opts);
  if (res.status === "found") return { mn: res.mn, kept: false };
  if (res.status === "absent") return { mn: null, kept: false };
  return { mn: previousMn || null, kept: true, why: res.why };
}

// Après une modification manuelle (ajout, revérification), la fiche garde son
// état « Médiathèque » connu : on remet la plateforme dans les abonnements.
function withMediathequeProvider(abonnement, existing) {
  const list = Array.isArray(abonnement) ? [...abonnement] : [];
  if (existing && existing.mn && !list.includes(PLATFORM_NAME)) list.push(PLATFORM_NAME);
  return list;
}

module.exports = {
  normalize,
  simplifyProduct,
  searchMediatheque,
  pickMediathequeMatch,
  lookupViaParis,
  checkMediatheque,
  withMediathequeProvider,
  PLATFORM_NAME,
  DEFAULT_BASE_URL,
  SEARCH_URL,
  FILM_BASE,
};
