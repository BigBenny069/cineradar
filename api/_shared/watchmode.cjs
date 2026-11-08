// ─────────────────────────────────────────────────────────────
// Second avis Watchmode sur la disponibilité des films.
//
// TMDB (données JustWatch) se trompe parfois : un film est annoncé sur une
// plateforme où il n'est pas. Watchmode est une seconde source. Le robot
// (scripts/update.cjs) compare les deux pour les plateformes que Watchmode
// couvre bien (Netflix, Disney+, Paramount+, Prime Video) et note le résultat
// dans la fiche (champ "wm") ; l'app affiche alors un badge.
//
// Pas de badge pour les autres plateformes (Canal+, Shadowz...) : Watchmode
// ne les voit pas bien, on ne veut pas de fausse alerte.
//
// Le budget d'appels est volontairement très serré (offre gratuite :
// 2 500 crédits par mois) : seuls les films nouveaux, ou dont les
// plateformes ont changé, ou pas revérifiés depuis 3 semaines sont contrôlés.
// Fonctions pures + appels réseau injectables, pour tout tester sans réseau.
// ─────────────────────────────────────────────────────────────

const { normalize } = require("./subscriptions.cjs");

const BASE = "https://api.watchmode.com/v1";
const RECHECK_DAYS = 21;
const DAY_MS = 24 * 60 * 60 * 1000;

// L'ordre compte : "Paramount+ (Via Amazon Prime)" doit être reconnu comme
// Paramount+, pas comme Prime Video.
const FAMILIES = [
  ["paramount", ["paramount"]],
  ["netflix", ["netflix"]],
  ["disney", ["disney"]],
  ["prime", ["prime video"]],
];

function platformFamily(name) {
  const n = normalize(name);
  for (const [family, keys] of FAMILIES) {
    if (keys.some((k) => n.includes(k))) return family;
  }
  return null;
}

function familiesOf(names) {
  return [...new Set((names || []).map(platformFamily).filter(Boolean))].sort();
}

// tmdbAbonnement : plateformes d'abonnement annoncées par TMDB.
// wmSubscriptionNames : plateformes en abonnement selon Watchmode (France).
// Renvoie null si aucune plateforme couverte n'est en jeu (pas de badge).
function compareWithWatchmode(tmdbAbonnement, wmSubscriptionNames) {
  const claimed = familiesOf(tmdbAbonnement);
  if (claimed.length === 0) return null;
  const confirmed = new Set(familiesOf(wmSubscriptionNames));
  const missing = claimed.filter((f) => !confirmed.has(f));
  return { status: missing.length > 0 ? "mismatch" : "ok", families: claimed, missing };
}

function needsCheck(previousWm, abonnement, now = Date.now()) {
  const families = familiesOf(abonnement);
  if (families.length === 0) return false;
  if (!previousWm || !previousWm.checkedAt) return true;
  if (families.join(",") !== (previousWm.families || []).join(",")) return true;
  const checkedAt = Date.parse(previousWm.checkedAt);
  if (Number.isNaN(checkedAt)) return true;
  return now - checkedAt > RECHECK_DAYS * DAY_MS;
}

// Interroge Watchmode pour un film. Résultats :
//   { ok: true, wmId, sources: [noms en abonnement en France] }
//   { ok: true, wmId: null, sources: [], unknown: true }   film inconnu de Watchmode
//   { ok: false, fatal: true }    clé refusée / quota atteint : on arrête tout
//   { ok: false, fatal: false }   souci ponctuel : on réessaiera plus tard
async function fetchWatchmodeSources({ tmdbId, wmId, apiKey, fetchImpl = fetch }) {
  const get = async (url) => {
    try {
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(10000) });
      const body = await res.json().catch(() => null);
      return { status: res.status, body };
    } catch {
      return { status: 0, body: null };
    }
  };
  const isFatal = (status) => status === 401 || status === 402 || status === 403 || status === 429;

  let id = wmId || null;
  if (!id) {
    const search = await get(
      `${BASE}/search/?apiKey=${encodeURIComponent(apiKey)}&search_field=tmdb_movie_id&search_value=${encodeURIComponent(tmdbId)}`
    );
    if (isFatal(search.status)) return { ok: false, fatal: true };
    if (search.status !== 200 || !search.body) return { ok: false, fatal: false };
    const hit = Array.isArray(search.body.title_results) ? search.body.title_results[0] : null;
    if (!hit) return { ok: true, wmId: null, sources: [], unknown: true };
    id = hit.id;
  }

  const src = await get(`${BASE}/title/${encodeURIComponent(id)}/sources/?apiKey=${encodeURIComponent(apiKey)}&regions=FR`);
  if (isFatal(src.status)) return { ok: false, fatal: true };
  if (src.status !== 200 || !Array.isArray(src.body)) return { ok: false, fatal: false };
  const sources = [...new Set(src.body.filter((s) => s && s.type === "sub").map((s) => s.name))];
  return { ok: true, wmId: id, sources };
}

// Complète les fiches (entries) avec le champ "wm". previousWm : { tmdbId → wm }
// du passage précédent. Les fiches non contrôlées gardent leur ancien résultat.
// Ne lève jamais d'exception : un souci Watchmode ne doit pas faire échouer
// le passage du robot.
async function applyWatchmodeChecks(entries, previousWm, options = {}) {
  const {
    apiKey,
    fetchImpl = fetch,
    maxChecks = 25,
    pauseMs = 300,
    now = Date.now(),
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    log = () => {},
  } = options;

  const stats = { checked: 0, mismatches: 0, skippedNoKey: false, stoppedEarly: false };
  const previous = previousWm || {};

  for (const entry of entries) {
    const prev = previous[entry.tmdbId];
    // Aucune plateforme couverte : pas de badge (on retire un éventuel ancien résultat).
    if (familiesOf(entry.providers?.abonnement).length === 0) {
      delete entry.wm;
      continue;
    }
    if (prev) entry.wm = prev;
  }

  if (!apiKey) {
    stats.skippedNoKey = true;
    return stats;
  }

  try {
    for (const entry of entries) {
      if (stats.checked >= maxChecks) {
        stats.stoppedEarly = true;
        break;
      }
      const abonnement = entry.providers?.abonnement || [];
      if (!needsCheck(entry.wm, abonnement, now)) continue;

      if (stats.checked > 0) await sleep(pauseMs);
      stats.checked += 1;
      const result = await fetchWatchmodeSources({
        tmdbId: entry.tmdbId,
        wmId: entry.wm?.id,
        apiKey,
        fetchImpl,
      });
      if (!result.ok) {
        log(`  Watchmode : ${entry.title} non contrôlé (${result.fatal ? "accès refusé ou quota atteint, arrêt" : "souci ponctuel"}).`);
        if (result.fatal) {
          stats.stoppedEarly = true;
          break;
        }
        continue;
      }
      const checkedAt = new Date(now).toISOString();
      if (result.unknown) {
        // Inconnu de Watchmode : pas de badge, revérifié dans 3 semaines.
        entry.wm = { status: "unknown", families: familiesOf(abonnement), missing: [], id: null, checkedAt };
        continue;
      }
      const comparison = compareWithWatchmode(abonnement, result.sources);
      entry.wm = { ...comparison, id: result.wmId, checkedAt };
      if (comparison.status === "mismatch") stats.mismatches += 1;
    }
  } catch (e) {
    log(`  Watchmode : arrêt (${e.message}). Le reste du passage continue normalement.`);
  }
  return stats;
}

module.exports = {
  RECHECK_DAYS,
  platformFamily,
  familiesOf,
  compareWithWatchmode,
  needsCheck,
  fetchWatchmodeSources,
  applyWatchmodeChecks,
};
