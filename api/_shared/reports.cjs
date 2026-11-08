// ─────────────────────────────────────────────────────────────
// Retour automatique des films signalés « pas disponible sur cette
// plateforme » (champ "reported" posé depuis l'app, voir
// api/reverify-movie.js).
//
// Au signalement, on mémorise les plateformes annoncées par TMDB à ce moment
// (reported.platforms). Chaque jour, le robot compare avec les plateformes
// actuelles :
//   • TMDB retire la plateforme signalée → il s'est corrigé : on le note
//     (reported.dropped), le film n'est de toute façon plus « Disponible » ;
//   • la plateforme réapparaît après avoir disparu → vrai retour : le
//     signalement est effacé, le film revient dans « Disponible » ;
//   • une plateforme différente apparaît → nouvelle disponibilité non
//     contestée : le signalement est effacé aussi.
// Tant que TMDB continue d'annoncer la même plateforme sans interruption, le
// signalement reste : c'est exactement le cas d'une erreur persistante.
// ─────────────────────────────────────────────────────────────

const { normalize } = require("./subscriptions.cjs");

// "Disney Plus" et "Disney+" sont le même service ; "Netflix Standard with
// Ads" et "Netflix" aussi (comparaison par inclusion, comme pour les
// abonnements).
function serviceKey(name) {
  return normalize(name).replace(/\s*plus\b/g, "+");
}

function sameService(a, b) {
  const ka = serviceKey(a);
  const kb = serviceKey(b);
  return ka === kb || ka.includes(kb) || kb.includes(ka);
}

// reported : { platforms, at, dropped?, droppedAt? } ou absent.
// abonnement : plateformes d'abonnement annoncées aujourd'hui par TMDB.
// Renvoie { reported: nouvel état (null = signalement effacé), event }.
function evaluateReport(reported, abonnement, nowIso) {
  if (!reported) return { reported: null, event: "none" };

  const reportedPlatforms = reported.platforms || [];
  const current = abonnement || [];
  const stillThere = current.some((c) => reportedPlatforms.some((r) => sameService(c, r)));
  const somethingNew = current.some((c) => !reportedPlatforms.some((r) => sameService(c, r)));

  if (somethingNew) return { reported: null, event: "new-platform" };

  if (stillThere) {
    if (reported.dropped) return { reported: null, event: "returned" };
    return { reported, event: "none" };
  }

  // Plus aucune des plateformes signalées.
  if (reported.dropped) return { reported, event: "none" };
  return { reported: { ...reported, dropped: true, droppedAt: nowIso }, event: "dropped" };
}

// Applique evaluateReport à toutes les fiches (modifie entries sur place).
function applyReportEvaluation(entries, nowIso) {
  const stats = { dropped: 0, returned: 0, newPlatform: 0 };
  for (const entry of entries) {
    if (!entry.reported) continue;
    const { reported, event } = evaluateReport(entry.reported, entry.providers?.abonnement, nowIso);
    if (reported) entry.reported = reported;
    else delete entry.reported;
    if (event === "dropped") stats.dropped += 1;
    if (event === "returned") stats.returned += 1;
    if (event === "new-platform") stats.newPlatform += 1;
  }
  return stats;
}

module.exports = { serviceKey, sameService, evaluateReport, applyReportEvaluation };
