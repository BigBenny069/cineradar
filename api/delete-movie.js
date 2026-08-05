function normalize(str) {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

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
  const filePath = "data/movies.json";
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  try {
    const getRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (!getRes.ok) {
      const details = await getRes.text();
      return res.status(500).json({ error: `Impossible de lire movies.json (${getRes.status})`, details });
    }
    const fileData = await getRes.json();
    const currentContent = Buffer.from(fileData.content, "base64").toString("utf-8");
    const movies = JSON.parse(currentContent);

    let matchIndex = -1;
    if (tmdbId) {
      matchIndex = movies.findIndex((m) => String(m.tmdbId) === String(tmdbId));
    }
    if (matchIndex === -1 && title && year) {
      matchIndex = movies.findIndex(
        (m) => normalize(m.title) === normalize(title) && String(m.year) === String(year)
      );
    }

    if (matchIndex === -1) {
      return res.status(404).json({ error: "Film introuvable dans la liste" });
    }

    const removed = movies.splice(matchIndex, 1)[0];

    const newContentBase64 = Buffer.from(JSON.stringify(movies, null, 2), "utf-8").toString("base64");
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({
        message: `Suppression de "${removed.title}" via l'app`,
        content: newContentBase64,
        sha: fileData.sha,
      }),
    });
    if (!putRes.ok) {
      const details = await putRes.text();
      return res.status(500).json({ error: `Impossible d'enregistrer (${putRes.status})`, details });
    }
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
