// TEMPORAIRE (branché sur /api/search-tmdb?saTest=1&token=…, car le plan Vercel
// gratuit limite à 12 fonctions) — comparaison Streaming Availability / TMDB
// sur les films en erreur. Protégé par le jeton jetable WATCHMODE_TEST_TOKEN.
// À supprimer après le test.

const HOST = "streaming-availability.p.rapidapi.com";

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

const TYPES = { subscription: "abonnement", addon: "abonnement via chaîne", rent: "location", buy: "achat", free: "gratuit" };

async function getJson(url, key) {
  try {
    const r = await fetch(url, {
      headers: key ? { "x-rapidapi-key": key, "x-rapidapi-host": HOST } : {},
      signal: AbortSignal.timeout(8000),
    });
    const text = await r.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text.slice(0, 200); }
    return { status: r.status, body, remaining: r.headers.get("x-ratelimit-requests-remaining") };
  } catch (e) {
    return { status: 0, body: String(e.message), remaining: null };
  }
}

function describeOptions(show) {
  const options = (show && show.streamingOptions && show.streamingOptions.fr) || [];
  const seen = new Set();
  return options
    .map((o) => {
      const name = (o.service && o.service.name) || (o.service && o.service.id) || "?";
      const via = o.addon && o.addon.name ? ` via ${o.addon.name}` : "";
      return `${name}${via} (${TYPES[o.type] || o.type})`;
    })
    .filter((x) => !seen.has(x) && seen.add(x));
}

async function handleStreamingAvailabilityTest(req, res) {
  const expected = process.env.WATCHMODE_TEST_TOKEN;
  const token = String((req.query && req.query.token) || "");
  if (!expected || token.length !== expected.length || token !== expected) {
    return res.status(401).json({ error: "Non autorisé" });
  }
  const key = process.env.RAPIDAPI_KEY;
  const tmdb = process.env.TMDB_API_KEY;
  if (!key) return res.status(500).json({ error: "RAPIDAPI_KEY manquante" });

  let remaining = null;

  const rows = await Promise.all(
    FILMS.map(async (f) => {
      const row = { film: f.label };
      let r;
      if (f.tmdbId) {
        r = await getJson(`https://${HOST}/shows/movie/${f.tmdbId}?country=fr`, key);
        if (r.remaining !== null) remaining = r.remaining;
        if (r.status === 200 && r.body && r.body.title) {
          row.streamingAvailability = { titre: r.body.title, annee: r.body.releaseYear, sources: describeOptions(r.body) };
        } else {
          row.streamingAvailability = { erreur: `statut ${r.status}`, detail: r.body };
        }
      } else {
        r = await getJson(
          `https://${HOST}/shows/search/title?title=${encodeURIComponent(f.name)}&country=fr&show_type=movie`,
          key
        );
        if (r.remaining !== null) remaining = r.remaining;
        const hit = Array.isArray(r.body) && r.body[0];
        row.streamingAvailability = hit
          ? { titre: hit.title, annee: hit.releaseYear, sources: describeOptions(hit) }
          : { erreur: `statut ${r.status}`, detail: r.body };
      }
      if (f.tmdbId && tmdb) {
        const t = await getJson(`https://api.themoviedb.org/3/movie/${f.tmdbId}/watch/providers?api_key=${tmdb}`, "");
        const fr = t.body && t.body.results && t.body.results.FR;
        row.tmdb = fr
          ? { abonnement: (fr.flatrate || []).map((p) => p.provider_name), gratuit: (fr.free || []).map((p) => p.provider_name) }
          : { erreur: `tmdb ${t.status}` };
      }
      return row;
    })
  );

  // Plateformes connues en France (pour voir si Shadowz y figure)
  const c = await getJson(`https://${HOST}/countries/fr`, key);
  const services =
    c.status === 200 && c.body && Array.isArray(c.body.services)
      ? c.body.services.map((s) => s.name || s.id)
      : { erreur: `statut ${c.status}`, detail: c.body };
  if (c.remaining !== null) remaining = c.remaining;

  return res.status(200).json({ quotaRestant: remaining, films: rows, plateformesFrance: services });
}

module.exports = { handleStreamingAvailabilityTest };
