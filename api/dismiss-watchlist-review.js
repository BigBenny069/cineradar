async function readGithubFile(apiUrl, token) {
  const res = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (res.status === 404) {
    // Le fichier n'existe pas encore (ex: première fois qu'on ignore un
    // film) — on part d'un tableau vide, sha=null indique une création.
    return { content: [], sha: null };
  }
  if (!res.ok) {
    const details = await res.text();
    throw new Error(`Impossible de lire le fichier (${res.status}) : ${details}`);
  }
  const fileData = await res.json();
  const content = Buffer.from(fileData.content, "base64").toString("utf-8");
  return { content: JSON.parse(content), sha: fileData.sha };
}

async function writeGithubFile(apiUrl, token, data, sha, message) {
  const body = {
    message,
    content: Buffer.from(JSON.stringify(data, null, 2), "utf-8").toString("base64"),
  };
  if (sha) body.sha = sha;
  const res = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const details = await res.text();
    throw new Error(`Impossible d'enregistrer (${res.status}) : ${details}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  const { key, title, person, password } = req.body || {};
  if (password !== process.env.ADD_MOVIE_PASSWORD) {
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }
  if (!key && !(title && person)) {
    return res.status(400).json({ error: "Informations manquantes pour identifier la fiche à ignorer" });
  }
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;

  try {
    // 1. Retire l'entrée de la file d'attente affichée (effet immédiat dans l'app)
    const reviewUrl = `https://api.github.com/repos/${repo}/contents/public/data/watchlist-review.json`;
    const { content: review, sha: reviewSha } = await readGithubFile(reviewUrl, token);
    const filteredReview = review.filter((item) => {
      // Repli pour les entrées générées avant l'ajout de la clé permanente
      if (!item.key) return !(item.title === title && item.person === person);
      return item.key !== key;
    });
    await writeGithubFile(reviewUrl, token, filteredReview, reviewSha, `Watchlist : ignorer "${title}" via l'app`);

    // 2. Mémorise cet oubli de façon permanente, pour que le prochain
    // passage du robot ne le remette pas dans la file d'attente (c'était le
    // bug signalé : la file était entièrement régénérée à chaque fois).
    // Seulement possible si on a une vraie clé (les anciennes entrées sans
    // clé seront régénérées proprement au prochain passage, et pourront
    // alors être ignorées durablement).
    if (key) {
      const dismissedUrl = `https://api.github.com/repos/${repo}/contents/public/data/watchlist-dismissed.json`;
      const { content: dismissed, sha: dismissedSha } = await readGithubFile(dismissedUrl, token);
      if (!dismissed.includes(key)) {
        const newDismissed = [...dismissed, key];
        await writeGithubFile(dismissedUrl, token, newDismissed, dismissedSha, `Watchlist : mémoriser l'oubli de "${title}"`);
      }
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
