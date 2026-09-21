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
    // TMDB trie par pertinence mêlée à la popularité, pas par correspondance
    // exacte : un film confidentiel dont le titre est un mot isolé (ex.
    // "Wrong") peut se retrouver noyé sous des franchises plus populaires
    // dont le titre original contient le même mot (ex. "Wrong Turn"). On fait
    // donc remonter les correspondances exactes du titre en tête, avant de
    // repasser à l'ordre TMDB pour le reste — tri stable, donc à rang égal
    // l'ordre de popularité TMDB est conservé.
    const norm = (s) =>
      String(s || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    const q = norm(query);
    const results = (data.results || [])
      .filter((m) => m.release_date)
      .map((m) => {
        const t = norm(m.title);
        const ot = norm(m.original_title);
        let rank = 2;
        if (t === q || ot === q) rank = 0;
        else if (t.startsWith(q) || ot.startsWith(q)) rank = 1;
        return { m, rank };
      })
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 10)
      .map(({ m }) => ({
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
