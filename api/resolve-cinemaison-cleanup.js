function normalize(str) {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

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

// Supprime définitivement une fiche que l'envoi automatique vers CinéMaison
// n'avait pas réussi à retirer de CinéRadar, ET la retire de la file
// d'attente "À nettoyer" affichée dans Historique — un seul appel pour les
// deux actions, déclenché par le bouton "Supprimer" de cette file.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  const { title, year, tmdbId, password } = req.body || {};
  if (password !== process.env.ADD_MOVIE_PASSWORD) {
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;

  try {
    // 1. Retire la fiche de data/movies.json (source de vérité)
    const moviesUrl = `https://api.github.com/repos/${repo}/contents/data/movies.json`;
    const { content: movies, sha: moviesSha } = await githubGet(moviesUrl, token);
    if (movies) {
      let matchIndex = -1;
      if (tmdbId) matchIndex = movies.findIndex((m) => String(m.tmdbId) === String(tmdbId));
      if (matchIndex === -1 && title && year) {
        matchIndex = movies.findIndex((m) => normalize(m.title) === normalize(title) && String(m.year) === String(year));
      }
      if (matchIndex >= 0) {
        movies.splice(matchIndex, 1);
        await githubPut(moviesUrl, token, movies, moviesSha, `Nettoyage : suppression de "${title}" via l'app`);
      }
    }

    // 2. Retire aussi la fiche de public/data/enriched.json, pour une
    // disparition immédiate de l'app (sans attendre le robot)
    const enrichedUrl = `https://api.github.com/repos/${repo}/contents/public/data/enriched.json`;
    const { content: enriched, sha: enrichedSha } = await githubGet(enrichedUrl, token);
    if (enriched) {
      const filteredEnriched = enriched.filter((m) => {
        if (tmdbId && m.tmdbId) return String(m.tmdbId) !== String(tmdbId);
        return !(normalize(m.title) === normalize(title) && String(m.year) === String(year));
      });
      if (filteredEnriched.length !== enriched.length) {
        await githubPut(enrichedUrl, token, filteredEnriched, enrichedSha, `Nettoyage : retrait de "${title}" (enriched.json)`);
      }
    }

    // 3. Retire l'entrée de la file d'attente "À nettoyer"
    const cleanupUrl = `https://api.github.com/repos/${repo}/contents/public/data/cinemaison-cleanup.json`;
    const { content: cleanup, sha: cleanupSha } = await githubGet(cleanupUrl, token);
    if (cleanup) {
      const filteredCleanup = cleanup.filter((item) => {
        if (tmdbId && item.tmdbId) return String(item.tmdbId) !== String(tmdbId);
        return !(normalize(item.title) === normalize(title) && String(item.year) === String(year));
      });
      await githubPut(cleanupUrl, token, filteredCleanup, cleanupSha, `Nettoyage : file d'attente mise à jour`);
    }

    // 4. Trace dans le journal de suppression, visible dans Historique
    try {
      const logUrl = `https://api.github.com/repos/${repo}/contents/public/data/deletion-log.json`;
      const { content: log, sha: logSha } = await githubGet(logUrl, token);
      const newLog = [...(log || []), { title, year, tmdbId: tmdbId || null, reason: "cinemaison", deletedAt: new Date().toISOString() }];
      await githubPut(logUrl, token, newLog.slice(-100), logSha, `Journal : suppression de "${title}" (cinemaison)`);
    } catch (e) {
      console.log("Journalisation de la suppression échouée (pas grave) :", e.message);
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
