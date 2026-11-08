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
    const norm = (s) =>
      String(s || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    const q = norm(query);
    const isExactMatch = (m) => {
      const t = norm(m.title);
      const ot = norm(m.original_title);
      return t === q || ot === q;
    };

    const fetchPage = async (params) => {
      const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&${params}`;
      const r = await fetch(url);
      if (!r.ok) return null;
      return r.json();
    };

    // Un mot isolé et courant (ex. "Wrong") peut faire remonter des dizaines
    // de films plus populaires (franchises, titres composés...) avant le
    // véritable film cherché, au point qu'il sorte carrément de la première
    // page de résultats TMDB (20 par page) — dans ce cas, retrier ce qu'on a
    // déjà reçu ne sert à rien, il faut aller chercher plus loin. On tente
    // dans l'ordre, en s'arrêtant dès qu'une correspondance exacte du titre
    // apparaît : page 1 en français, page 2 en français, puis page 1 en
    // anglais (au cas où le film ne serait pas indexé côté fr-FR).
    const first = await fetchPage("language=fr-FR&page=1");
    if (!first) {
      return res.status(500).json({ error: "Erreur TMDB" });
    }
    let pool = first.results || [];

    if (!pool.some(isExactMatch) && (first.total_pages || 1) > 1) {
      const second = await fetchPage("language=fr-FR&page=2");
      if (second?.results) pool = pool.concat(second.results);
    }
    if (!pool.some(isExactMatch)) {
      const englishFirst = await fetchPage("page=1");
      if (englishFirst?.results) {
        const knownIds = new Set(pool.map((m) => m.id));
        pool = pool.concat(englishFirst.results.filter((m) => !knownIds.has(m.id)));
      }
    }

    // TMDB trie par pertinence mêlée à la popularité, pas par correspondance
    // exacte : un film confidentiel dont le titre est un mot isolé (ex.
    // "Wrong") peut se retrouver noyé sous des franchises plus populaires
    // dont le titre original contient le même mot (ex. "Wrong Turn"). On fait
    // donc remonter les correspondances exactes du titre en tête, avant de
    // repasser à l'ordre TMDB pour le reste — tri stable, donc à rang égal
    // l'ordre de popularité TMDB est conservé.
    const results = pool
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
