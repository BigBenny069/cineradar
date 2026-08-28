async function githubGet(apiUrl, token) {
  const res = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (res.status === 404) return { content: [], sha: null };
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

// Appelé quand l'envoi vers CinéMaison a réussi mais que le retrait
// automatique de CinéRadar a échoué (souci réseau ponctuel) — place la
// fiche dans une file d'attente "À nettoyer" visible dans Historique, pour
// une suppression manuelle en un tap plutôt que de la perdre de vue.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  const { title, year, tmdbId, password } = req.body || {};
  if (password !== process.env.ADD_MOVIE_PASSWORD) {
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }
  if (!title) {
    return res.status(400).json({ error: "Titre manquant" });
  }
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  const cleanupUrl = `https://api.github.com/repos/${repo}/contents/public/data/cinemaison-cleanup.json`;

  try {
    const { content: cleanup, sha } = await githubGet(cleanupUrl, token);
    const alreadyThere = cleanup.some((item) =>
      tmdbId && item.tmdbId ? String(item.tmdbId) === String(tmdbId) : item.title === title && item.year === year
    );
    if (!alreadyThere) {
      const newCleanup = [...cleanup, { title, year, tmdbId: tmdbId || null, detectedAt: new Date().toISOString() }];
      await githubPut(cleanupUrl, token, newCleanup, sha, `Nettoyage : ajout de "${title}" à la file d'attente`);
    }
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
