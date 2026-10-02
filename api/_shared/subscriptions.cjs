// ─────────────────────────────────────────────────────────────
// Table de correspondance partagée entre data/settings.json (clés pilotées
// depuis l'écran Paramètres de l'app) et les noms de fournisseurs tels que
// TMDB les renvoie. Utilisée par api/add-movie.js, api/reverify-movie.js et
// scripts/update.cjs — avant cette extraction, elle existait en 3 copies
// identiques, ce qui a déjà causé un bug réel (un ajout de plateforme
// appliqué à 2 copies sur 3, la 3e étant restée silencieusement
// désynchronisée). Un seul endroit à modifier désormais.
// Si un film affiche un mauvais fournisseur, ajoute son nom exact dans le
// tableau correspondant ci-dessous.
// ─────────────────────────────────────────────────────────────

function normalize(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const CANONICAL_SUBSCRIPTIONS = {
  netflix: ["Netflix"],
  prime: ["Amazon Prime Video", "Prime Video"],
  disney: ["Disney Plus", "Disney+"],
  // Toutes les chaînes/services du bouquet Ciné+ inclus dans la formule
  // Canal+ (Pack Ciné Séries+) sont regroupées ici avec "Canal+" lui-même,
  // puisqu'ils sont tous couverts par le même abonnement.
  canal: ["Canal+", "Canal+ Cinéma", "Insomnia", "Polar+", "Ciné+ Frisson", "Ciné+ Émotion", "Ciné+ Family", "Ciné+ Festival", "Ciné+ Classic"],
  canalseries: ["Canal+ Séries"],
  appletv: ["Apple TV+", "Apple TV Plus"],
  paramount: ["Paramount Plus", "Paramount+"],
  ocs: ["OCS", "Cine+ OCS", "Ciné+ OCS"],
  max: ["Max", "HBO Max"],
};

// Valeurs par défaut utilisées si data/settings.json est absent ou illisible.
const DEFAULT_ENABLED = ["netflix", "prime", "disney", "canal", "canalseries", "appletv", "paramount", "ocs"];

// Construit la fonction de test "ce fournisseur fait-il partie de mes
// abonnements actifs ?" à partir de la liste des clés activées (vient de
// data/settings.json — différente à chaque appel côté API puisqu'elle peut
// changer à tout moment depuis l'écran Paramètres, donc pas de valeur figée
// au chargement du module ici, contrairement à scripts/update.cjs qui la
// charge une seule fois en local).
function createIsMySubscription(enabledKeys) {
  const normalized = (enabledKeys && enabledKeys.length ? enabledKeys : DEFAULT_ENABLED)
    .flatMap((key) => CANONICAL_SUBSCRIPTIONS[key] || [])
    .map(normalize);
  return function isMySubscription(providerName) {
    const n = normalize(providerName);
    return normalized.some((sub) => n === sub || n.includes(sub) || sub.includes(n));
  };
}

module.exports = { normalize, CANONICAL_SUBSCRIPTIONS, DEFAULT_ENABLED, createIsMySubscription };
