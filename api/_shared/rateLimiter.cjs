// ─────────────────────────────────────────────────────────────
// Limiteur de tentatives anti brute-force, en mémoire — pas de base de
// données externe à payer/gérer pour un risque déjà jugé très faible (app
// privée, non référencée). Compte les ÉCHECS de mot de passe par appareil
// (identifié par son adresse IP) : au-delà de 5 échecs en 10 minutes,
// l'accès est bloqué 15 minutes. Les tentatives réussies remettent le
// compteur à zéro, pour ne jamais gêner un usage normal.
//
// Limite honnête à connaître : cette mémoire vit tant que l'instance Vercel
// reste "chaude" entre deux appels — un redémarrage de l'instance (cold
// start) réinitialise le compteur. Ça bloque donc efficacement un script qui
// testerait des mots de passe en boucle rapide, mais n'offre pas une
// garantie absolue face à un attaquant qui éviterait délibérément de
// déclencher plusieurs requêtes rapprochées.
// ─────────────────────────────────────────────────────────────
const attempts = new Map(); // identifiant (IP) -> { count, firstAttemptAt, lockedUntil }

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(identifier) {
  const now = Date.now();
  const entry = attempts.get(identifier);

  if (entry?.lockedUntil && now < entry.lockedUntil) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000) };
  }
  if (!entry || now - entry.firstAttemptAt > WINDOW_MS) {
    return { allowed: true };
  }
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
    return { allowed: false, retryAfterSeconds: Math.ceil(LOCKOUT_MS / 1000) };
  }
  return { allowed: true };
}

function recordFailedAttempt(identifier) {
  const now = Date.now();
  const entry = attempts.get(identifier);
  if (!entry || now - entry.firstAttemptAt > WINDOW_MS) {
    attempts.set(identifier, { count: 1, firstAttemptAt: now, lockedUntil: null });
  } else {
    entry.count += 1;
  }
}

function recordSuccess(identifier) {
  attempts.delete(identifier);
}

function getClientIdentifier(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return ip?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
}

module.exports = { checkRateLimit, recordFailedAttempt, recordSuccess, getClientIdentifier };
