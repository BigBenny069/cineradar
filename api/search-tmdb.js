export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "TMDB_API_KEY manquante côté serveur (variable d'environnement Vercel)" });
  }

  // Mode "détails" : récupère les infos complètes d'un film précis (dont le
  // réalisateur, absent des résultats de recherche simple) — utilisé quand
  // l'utilisateur choisit un résultat dans la liste déroulante.
  const id = (req.query.id || "").trim();
  if (id) {
    try {
      const url = `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=fr-FR&append_to_response=credits`;
      const r = await fetch(url);
      if (!r.ok) {
        const details = await r.text();
        return res.status(500).json({ error: `Erreur TMDB (${r.status})`, details });
      }
      const data = await r.json();
      const director = data.credits?.crew?.find((c) => c.job === "Director");
      return res.status(200).json({
        tmdbId: data.id,
        title: data.title,
        year: data.release_date ? data.release_date.slice(0, 4) : null,
        director: director?.name || "",
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  const query = (req.query.q || "").trim();
  if (query.length < 2) {
    return res.status(200).json({ results: [] });
  }
  try {
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=fr-FR`;
    const r = await fetch(url);
    if (!r.ok) {
      const details = await r.text();
      return res.status(500).json({ error: `Erreur TMDB (${r.status})`, details });
    }
    const data = await r.json();
    const results = (data.results || [])
      .filter((m) => m.release_date)
      .slice(0, 8)
      .map((m) => ({
        tmdbId: m.id,
        title: m.title,
        year: m.release_date.slice(0, 4),
        poster: m.poster_path ? `https://image.tmdb.org/t/p/w92${m.poster_path}` : null,
      }));
    return res.status(200).json({ results });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
