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
  const {
    title,
    year,
    director,
    letterboxdUrl,
    password,
    originalTitle,
    originalYear,
    originalTmdbId,
  } = req.body || {};
  if (password !== process.env.ADD_MOVIE_PASSWORD) {
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }
  if (!title || !director || !/^\d{4}$/.test(String(year))) {
    return res.status(400).json({ error: "Titre, réalisateur et une année à 4 chiffres sont obligatoires" });
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

    // Priorité au matching par tmdbId (fiable et stable)
    if (originalTmdbId) {
      matchIndex = movies.findIndex((m) => String(m.tmdbId) === String(originalTmdbId));
    }

    // Repli : titre + année, normalisés (sans accents, casse ignorée)
    if (matchIndex === -1 && originalTitle && originalYear) {
      matchIndex = movies.findIndex(
        (m) => normalize(m.title) === normalize(originalTitle) && String(m.year) === String(originalYear)
      );
    }

    const newEntry = {
      title: title.trim(),
      year: parseInt(year, 10),
      director: director.trim(),
      letterboxdUrl: letterboxdUrl?.trim() || null,
    };

    // On conserve le tmdbId connu pour fiabiliser les futures modifications
    if (originalTmdbId) {
      newEntry.tmdbId = originalTmdbId;
    } else if (matchIndex >= 0 && movies[matchIndex].tmdbId) {
      newEntry.tmdbId = movies[matchIndex].tmdbId;
    }

    let commitMessage;
    if (matchIndex >= 0) {
      movies[matchIndex] = newEntry;
      commitMessage = `Modification de "${title}" via l'app`;
    } else {
      movies.push(newEntry);
      commitMessage = `Ajout de "${title}" via l'app`;
    }

    const newContentBase64 = Buffer.from(JSON.stringify(movies, null, 2), "utf-8").toString("base64");
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({
        message: commitMessage,
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
