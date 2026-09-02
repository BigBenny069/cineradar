function normalize(str) {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// ─────────────────────────────────────────────────────────────
// Même table de correspondance que scripts/update.cjs et api/add-movie.js
// — à garder synchro si l'une des trois est modifiée.
// ─────────────────────────────────────────────────────────────
const CANONICAL_SUBSCRIPTIONS = {
  netflix: ["Netflix"],
  prime: ["Amazon Prime Video", "Prime Video"],
  disney: ["Disney Plus", "Disney+"],
  canal: ["Canal+"],
  canalseries: ["Canal+ Séries"],
  appletv: ["Apple TV+", "Apple TV Plus"],
  paramount: ["Paramount Plus", "Paramount+"],
  ocs: ["OCS", "Cine+ OCS", "Ciné+ OCS"],
  max: ["Max", "HBO Max"],
};
const DEFAULT_ENABLED = ["netflix", "prime", "disney", "canal", "canalseries", "appletv", "paramount", "ocs"];

async function githubGet(apiUrl, token) {
  const res = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (res.status === 404) return { content: null, sha: null };
  if (!res.ok) throw new Error(`Lecture impossible (${res.status})`);
  const fileData = await res.json();
  const content = Buffer.from(fileData.content, "base64").toString("utf-8");
  return { content: JSON.parse(content), sha: fileData.sha };
}

async function githubPut(apiUrl, token, data, sha, message) {
  const body = { message, content: Buffer.from(JSON.stringify(data, null, 2), "utf-8").toString("base64") };
  if (sha) body.sha = sha;
  const res = await fetch(apiUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const details = await res.text();
    throw new Error(`Écriture impossible (${res.status}) : ${details}`);
  }
}

// Redemande une vérification immédiate auprès de TMDB pour un film précis
// (affiche, synopsis, casting, plateformes, note TMDB) — sans attendre le
// prochain passage du robot. La note Letterboxd n'est pas retouchée ici
// (scraping séparé, plus lent, laissé au robot).
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  const { tmdbId, password } = req.body || {};
  if (password !== process.env.ADD_MOVIE_PASSWORD) {
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }
  if (!tmdbId) {
    return res.status(400).json({ error: "tmdbId manquant" });
  }
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "TMDB_API_KEY manquante côté serveur" });
  }
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;

  try {
    const detailsUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&language=fr-FR&append_to_response=credits,watch/providers`;
    const detailsRes = await fetch(detailsUrl);
    if (!detailsRes.ok) {
      return res.status(500).json({ error: `TMDB a répondu ${detailsRes.status}` });
    }
    const details = await detailsRes.json();

    const settingsUrl = `https://api.github.com/repos/${repo}/contents/data/settings.json`;
    let enabledKeys = DEFAULT_ENABLED;
    try {
      const { content } = await githubGet(settingsUrl, token);
      if (content?.enabled) enabledKeys = content.enabled;
    } catch {}
    const mySubscriptions = enabledKeys.flatMap((key) => CANONICAL_SUBSCRIPTIONS[key] || []).map(normalize);
    const isMySubscription = (name) => {
      const n = normalize(name);
      return mySubscriptions.some((sub) => n === sub || n.includes(sub) || sub.includes(n));
    };

    const fr = details["watch/providers"]?.results?.FR;
    const allFlatrate = (fr?.flatrate || []).map((p) => p.provider_name);
    const abonnement = [...new Set(allFlatrate.filter(isMySubscription))];
    const vod = [
      ...new Set(
        [...allFlatrate.filter((n) => !isMySubscription(n)), ...(fr?.rent || []), ...(fr?.buy || [])].map((p) =>
          typeof p === "string" ? p : p.provider_name
        )
      ),
    ];

    const director = details.credits?.crew?.find((c) => c.job === "Director");
    const cast = (details.credits?.cast || []).slice(0, 5).map((c) => c.name);
    const posterUrl = details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null;

    const enrichedUrl = `https://api.github.com/repos/${repo}/contents/public/data/enriched.json`;
    const { content: enrichedList, sha: enrichedSha } = await githubGet(enrichedUrl, token);
    const list = enrichedList || [];
    const existingIndex = list.findIndex((m) => String(m.tmdbId) === String(tmdbId));
    const existing = existingIndex >= 0 ? list[existingIndex] : null;
    if (!existing) {
      return res.status(404).json({ error: "Cette fiche n'existe pas dans enriched.json" });
    }

    // On préserve la disponibilité connue si elle existait déjà et reste
    // valable, sinon on marque une nouvelle disponibilité à partir de
    // maintenant — même logique que le robot.
    const availableSince = abonnement.length > 0 ? existing.availableSince || new Date().toISOString() : null;

    const updatedEntry = {
      ...existing,
      title: details.title,
      year: details.release_date?.slice(0, 4) || existing.year,
      director: director?.name || existing.director,
      poster: posterUrl,
      synopsis: details.overview,
      genres: (details.genres || []).map((g) => g.name),
      cast,
      tmdbRating: details.vote_average,
      tmdbVotes: details.vote_count,
      imdbId: details.imdb_id,
      providers: { abonnement, vod },
      availableSince,
      lastChecked: new Date().toISOString(),
    };

    const newList = [...list];
    newList[existingIndex] = updatedEntry;
    await githubPut(enrichedUrl, token, newList, enrichedSha, `Vérification redemandée : "${details.title}"`);

    return res.status(200).json({ success: true, movie: updatedEntry });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
