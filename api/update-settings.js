export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  const { enabled, notifyEmail, letterboxdWatchlists, password } = req.body || {};
  if (password !== process.env.ADD_MOVIE_PASSWORD) {
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }
  if (!Array.isArray(enabled)) {
    return res.status(400).json({ error: "Liste d'abonnements invalide" });
  }
  if (notifyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail)) {
    return res.status(400).json({ error: "Adresse email invalide" });
  }
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  const filePath = "data/settings.json";
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
      return res.status(500).json({ error: `Impossible de lire settings.json (${getRes.status})`, details });
    }
    const fileData = await getRes.json();
    const newContentBase64 = Buffer.from(
      JSON.stringify(
        {
          enabled,
          notifyEmail: notifyEmail || null,
          letterboxdWatchlists: {
            benoit: letterboxdWatchlists?.benoit?.trim() || "",
            romy: letterboxdWatchlists?.romy?.trim() || "",
          },
        },
        null,
        2
      ),
      "utf-8"
    ).toString("base64");
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({
        message: "Mise à jour des abonnements via l'app",
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
