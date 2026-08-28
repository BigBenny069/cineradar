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

    // Retire aussi immédiatement la fiche de public/data/enriched.json —
    // sans ça, elle resterait visible dans l'app jusqu'au prochain passage
    // du robot GitHub Actions (symétrique à l'enrichissement instantané
    // fait à l'ajout). Best effort : si ça échoue, pas grave, le robot
    // corrigera à son prochain passage.
    try {
      const enrichedUrl = `https://api.github.com/repos/${repo}/contents/public/data/enriched.json`;
      const enrichedGetRes = await fetch(enrichedUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      });
      if (enrichedGetRes.ok) {
        const enrichedFileData = await enrichedGetRes.json();
        const enrichedList = JSON.parse(Buffer.from(enrichedFileData.content, "base64").toString("utf-8"));
        const filtered = enrichedList.filter((m) => {
          if (removed.tmdbId && m.tmdbId) return String(m.tmdbId) !== String(removed.tmdbId);
          return !(normalize(m.title) === normalize(removed.title) && String(m.year) === String(removed.year));
        });
        if (filtered.length !== enrichedList.length) {
          await fetch(enrichedUrl, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
            body: JSON.stringify({
              message: `Retrait instantané de "${removed.title}" (enriched.json)`,
              content: Buffer.from(JSON.stringify(filtered, null, 2), "utf-8").toString("base64"),
              sha: enrichedFileData.sha,
            }),
          });
        }
      }
    } catch (e) {
      console.log("Retrait instantané de enriched.json échoué (pas grave) :", e.message);
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
