export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Méthode non autorisée" });
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
    const currentContent = Buffer.from(fileData.content, "base64").toString("utf-8");
    const settings = JSON.parse(currentContent);
    return res.status(200).json(settings);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
