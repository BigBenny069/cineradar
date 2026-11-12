// ─────────────────────────────────────────────────────────────
// Notification « nouvelle disponibilité » mise en attente.
//
// Le workflow du robot recalcule tout quand l'enregistrement est refusé
// (une modification faite dans l'app entre-temps). Si l'e-mail partait
// pendant le calcul, il partirait à chaque tentative, donc en double.
// À la place, le calcul dépose la liste dans un petit fichier (jamais
// enregistré dans le dépôt) et le workflow n'envoie l'e-mail qu'une fois
// l'enregistrement réussi.
// ─────────────────────────────────────────────────────────────
const fs = require("fs");

const PENDING_FILE = ".pending-notification.json";

function clearPending(file = PENDING_FILE) {
  try {
    fs.unlinkSync(file);
  } catch {
    // pas de fichier : rien à retirer
  }
}

// Liste vide : on retire l'éventuel fichier d'une tentative précédente.
function savePending(list, file = PENDING_FILE) {
  if (!Array.isArray(list) || list.length === 0) {
    clearPending(file);
    return false;
  }
  fs.writeFileSync(file, JSON.stringify(list));
  return true;
}

function loadPending(file = PENDING_FILE) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

module.exports = { PENDING_FILE, savePending, loadPending, clearPending };
