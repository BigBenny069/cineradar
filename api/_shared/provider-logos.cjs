// ─────────────────────────────────────────────────────────────
// Logos officiels des plateformes (ceux fournis par TMDB / JustWatch).
//
// TMDB indique, pour chaque plateforme d'un film, le chemin de son logo
// (ex. "/abc123.jpg"). Le robot les récolte au passage (aucune requête en
// plus) dans public/data/provider-logos.json : { "Netflix": "/abc.jpg", ... }.
// L'app affiche l'image si elle existe, sinon l'ancienne pastille.
// Un logo déjà connu est conservé même si la plateforme disparaît des films.
// ─────────────────────────────────────────────────────────────

// fr : bloc « watch/providers » de TMDB pour la France (flatrate, rent, buy).
// Ajoute à `map` les couples nom → logo trouvés. Renvoie le nombre de
// nouveautés ou de changements.
function collectProviderLogos(fr, map) {
  let changed = 0;
  if (!fr || !map) return changed;
  for (const group of [fr.flatrate, fr.rent, fr.buy, fr.free, fr.ads]) {
    if (!Array.isArray(group)) continue;
    for (const p of group) {
      if (!p || typeof p !== "object") continue;
      const name = p.provider_name;
      const logo = p.logo_path;
      if (typeof name !== "string" || !name) continue;
      if (typeof logo !== "string" || !logo.startsWith("/")) continue;
      if (map[name] !== logo) {
        map[name] = logo;
        changed += 1;
      }
    }
  }
  return changed;
}

// Trie les noms pour que le fichier ne change que lorsqu'un logo change
// vraiment (sinon le robot ferait un commit inutile à chaque passage).
function sortedLogoMap(map) {
  return Object.fromEntries(Object.keys(map).sort().map((k) => [k, map[k]]));
}

module.exports = { collectProviderLogos, sortedLogoMap };
