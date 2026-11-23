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

module.exports = { normalize, simplifyProduct, searchMediatheque, SEARCH_URL, FILM_BASE };
