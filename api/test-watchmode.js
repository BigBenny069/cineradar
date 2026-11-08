// TEMPORAIRE — comparaison Watchmode / TMDB (JustWatch) sur les films en erreur.
// Protégé par un jeton jetable (WATCHMODE_TEST_TOKEN). À supprimer après le test.

const FILMS = [
  { tmdbId: 311, label: "Il était une fois en Amérique" },
  { tmdbId: 262, label: "La Valse des pantins" },
  { tmdbId: 1158416, label: "En attendant la nuit" },
  { tmdbId: 1645, label: "Le Droit de tuer ?" },
  { tmdbId: 111, label: "Scarface" },
  { tmdbId: 81481, label: "Silenced" },
  { tmdbId: 2163, label: "Breakdown" },
  { tmdbId: 507076, label: "Climax" },
  { tmdbId: 34647, label: "Enter the Void" },
  { name: "Return of the Living Dead III", label: "Le Retour des morts-vivants 3" },
];

const TYPES = { sub: "abonnement", rent: "location", buy: "achat", free: "gratuit" };

async function getJson(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const text = await r.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text.slice(0, 200); }
    return { status: r.status, body };
  } catch (e) {
    return { status: 0, body: String(e.message) };
  }
}

export default async function handler(req, res) {
  const expected = process.env.WATCHMODE_TEST_TOKEN;
  const token = String((req.query && req.query.token) || "");
  if (!expected || token.length !== expected.length || token !== expected) {
    return res.status(401).json({ error: "Non autorisé" });
  }
  const wm = process.env.WATCHMODE_API_KEY;
  const tmdb = process.env.TMDB_API_KEY;
  if (!wm) return res.status(500).json({ error: "WATCHMODE_API_KEY manquante" });

  const out = await Promise.all(FILMS.map(async (f) => {
    const row = { film: f.label };

    // Watchmode : identifiant puis sources en France
    const search = f.tmdbId
      ? `https://api.watchmode.com/v1/search/?apiKey=${wm}&search_field=tmdb_movie_id&search_value=${f.tmdbId}`
      : `https://api.watchmode.com/v1/search/?apiKey=${wm}&search_field=name&search_value=${encodeURIComponent(f.name)}&types=movie`;
    const s = await getJson(search);
    const hit = s.body && s.body.title_results && s.body.title_results[0];
    if (!hit) {
      row.watchmode = { erreur: `recherche ${s.status}`, detail: s.body };
    } else {
      const src = await getJson(`https://api.watchmode.com/v1/title/${hit.id}/sources/?apiKey=${wm}&regions=FR`);
      if (Array.isArray(src.body)) {
        const seen = new Set();
        row.watchmode = {
          titre: hit.name,
          annee: hit.year,
          sources: src.body
            .map((x) => `${x.name} (${TYPES[x.type] || x.type})`)
            .filter((x) => !seen.has(x) && seen.add(x)),
        };
      } else {
        row.watchmode = { erreur: `sources ${src.status}`, detail: src.body };
      }
    }

    // TMDB / JustWatch en direct, pour comparer
    if (f.tmdbId && tmdb) {
      const t = await getJson(`https://api.themoviedb.org/3/movie/${f.tmdbId}/watch/providers?api_key=${tmdb}`);
      const fr = t.body && t.body.results && t.body.results.FR;
      row.tmdb = fr
        ? { abonnement: (fr.flatrate || []).map((p) => p.provider_name), gratuit: (fr.free || []).map((p) => p.provider_name) }
        : { erreur: `tmdb ${t.status}` };
    }
    return row;
  }));
  return res.status(200).json(out);
}
