// Déclenche à la demande le même robot GitHub Actions que celui qui tourne
// chaque matin à 6h (scripts/update.cjs) — plutôt que de refaire tout
// l'enrichissement ici même, ce qui risquerait de dépasser la limite de
// temps d'exécution d'une fonction Vercel sur une bibliothèque de plusieurs
// dizaines de films. Le workflow accepte déjà le déclenchement manuel
// (workflow_dispatch dans .github/workflows/update.yml) : on se contente
// d'appeler l'API GitHub pour le lancer immédiatement.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  const { password } = req.body || {};
  if (password !== process.env.ADD_MOVIE_PASSWORD) {
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  try {
    const dispatchUrl = `https://api.github.com/repos/${repo}/actions/workflows/update.yml/dispatches`;
    const dispatchRes = await fetch(dispatchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({ ref: "main" }),
    });
    if (!dispatchRes.ok) {
      const details = await dispatchRes.text();
      return res.status(500).json({ error: `Déclenchement impossible (${dispatchRes.status})`, details });
    }
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
