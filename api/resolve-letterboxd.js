import { checkRateLimit, recordFailedAttempt, recordSuccess, getClientIdentifier } from "./_shared/rateLimiter.cjs";
import { extractLink, isAllowedUrl, parseFilmPath, titleFromSlug, parseFilmPage } from "./_shared/letterboxd.cjs";

// Retrouve un film à partir d'un lien Letterboxd partagé (boxd.it/xxxx ou
// letterboxd.com/film/xxxx). Protégé par le même mot de passe que les autres
// écritures : cette fonction fait des requêtes sortantes, on évite qu'elle
// soit utilisable par n'importe qui.

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const MAX_HOPS = 4;
const TIMEOUT_MS = 8000;

// Suit les redirections à la main pour pouvoir vérifier chaque étape : on ne
// va jamais ailleurs que sur boxd.it / letterboxd.com.
async function fetchAllowed(startUrl) {
  let url = startUrl;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    if (!isAllowedUrl(url)) throw new Error("redirection vers un site non autorisé");
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error("redirection sans destination");
      url = new URL(location, url).href;
      continue;
    }
    return { res, url };
  }
  throw new Error("trop de redirections");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const identifier = getClientIdentifier(req);
  const rateLimit = checkRateLimit(identifier);
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: `Trop de tentatives. Réessaie dans ${rateLimit.retryAfterSeconds}s.` });
  }
  const { link, password } = req.body || {};
  if (password !== process.env.ADD_MOVIE_PASSWORD) {
    recordFailedAttempt(identifier);
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }
  recordSuccess(identifier);

  const extracted = extractLink(link);
  if (!extracted) {
    return res.status(400).json({ error: "Aucun lien Letterboxd reconnu (boxd.it/… ou letterboxd.com/film/…)." });
  }

  try {
    // 1) Résolution du lien (boxd.it → letterboxd.com/film/…)
    const first = await fetchAllowed(extracted);
    const parsedPath = parseFilmPath(first.url);
    if (!parsedPath) {
      return res.status(422).json({ error: "Ce lien ne mène pas à une fiche de film Letterboxd." });
    }

    // Lien direct /tmdb/{id} : l'identifiant est déjà connu, pas besoin de la page.
    if (parsedPath.tmdbId) {
      return res.status(200).json({
        slug: null,
        letterboxdUrl: `https://letterboxd.com/tmdb/${parsedPath.tmdbId}/`,
        tmdbId: parsedPath.tmdbId,
        title: null,
        year: null,
        source: "tmdb",
      });
    }

    const slug = parsedPath.slug;
    const filmUrl = `https://letterboxd.com/film/${slug}/`;

    // 2) Lecture de la fiche. La réponse de l'étape 1 est déjà la page du
    // film quand le lien pointait directement dessus (cas courant : boxd.it
    // redirige vers /film/{slug}/) — on la réutilise au lieu de la redemander.
    // Si Letterboxd refuse (blocage, panne...), on retombe sur ce qu'on
    // déduit du slug : l'app proposera alors une recherche TMDB à confirmer.
    let page = { tmdbId: null, title: null, year: null };
    let source = "slug";
    try {
      const alreadyOnFilmPage = new URL(first.url).pathname === `/film/${slug}/`;
      const filmRes = alreadyOnFilmPage ? first : await fetchAllowed(filmUrl);
      if (filmRes.res.status === 200) {
        page = parseFilmPage(await filmRes.res.text());
        if (page.tmdbId || page.title) source = "page";
      }
    } catch {
      // volontairement ignoré : voir plus haut
    }

    const guess = titleFromSlug(slug);
    return res.status(200).json({
      slug,
      letterboxdUrl: filmUrl,
      tmdbId: page.tmdbId,
      title: page.title || guess.title,
      year: page.year || guess.year,
      source,
    });
  } catch (e) {
    return res.status(502).json({ error: `Impossible de lire le lien Letterboxd (${e.message}).` });
  }
}
