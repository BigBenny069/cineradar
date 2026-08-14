import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────
// SYSTÈME DE THÈMES
// T (couleurs/formes) et F (polices) sont mutés en place via
// Object.assign() à chaque changement de thème, jamais réaffectés.
// Tous les composants lisent T.xxx / F.xxx au moment du rendu, donc
// un simple re-rendu global (themeTick) suffit à tout propager.
// ─────────────────────────────────────────────────────────────
const THEMES = {
  sombre: {
    label: "Guichet Nocturne",
    colors: {
      bg: "#13100C",
      surface: "#1D1812",
      surfaceRaised: "#241D16",
      accent: "#E7A23A",
      accentDim: "#8A6A34",
      accentSoft: "rgba(231,162,58,0.12)",
      accentSecondary: "#B23A32",
      accentSecondarySoft: "rgba(178,58,50,0.14)",
      cream: "#F3ECDF",
      muted: "#93877A",
      mutedDim: "#5F5648",
      line: "#37301F",
      alert: "#B23A32",
      alertSoft: "rgba(178,58,50,0.14)",
      radius: 8,
      radiusSm: 4,
      shadow: "none",
      borderWidth: 1,
    },
    fonts: {
      marquee: "'Bebas Neue', sans-serif",
      serif: "'Source Serif 4', serif",
      mono: "'IBM Plex Mono', monospace",
    },
  },
  clair: {
    label: "Matinée",
    colors: {
      bg: "#F5F1E8",
      surface: "#FFFFFF",
      surfaceRaised: "#EFE8D8",
      accent: "#B8792E",
      accentDim: "#D8B98A",
      accentSoft: "rgba(184,121,46,0.10)",
      accentSecondary: "#A83232",
      accentSecondarySoft: "rgba(168,50,50,0.10)",
      cream: "#241D16",
      muted: "#8A7F70",
      mutedDim: "#C7BFAF",
      line: "#E3DACB",
      alert: "#C23B3B",
      alertSoft: "rgba(194,59,59,0.10)",
      radius: 10,
      radiusSm: 6,
      shadow: "0 1px 3px rgba(0,0,0,0.08)",
      borderWidth: 1,
    },
    fonts: {
      marquee: "'Bebas Neue', sans-serif",
      serif: "'Source Serif 4', serif",
      mono: "'IBM Plex Mono', monospace",
    },
  },
  neon: {
    label: "Vidéoclub 88",
    colors: {
      bg: "#0D0620",
      surface: "#1A0E33",
      surfaceRaised: "#241442",
      accent: "#FF2E88",
      accentDim: "#7A1A48",
      accentSoft: "rgba(255,46,136,0.14)",
      accentSecondary: "#2EE6D6",
      accentSecondarySoft: "rgba(46,230,214,0.14)",
      cream: "#F5E9FF",
      muted: "#8A79B8",
      mutedDim: "#4E4380",
      line: "#3D2A66",
      alert: "#FF3B5C",
      alertSoft: "rgba(255,59,92,0.16)",
      radius: 4,
      radiusSm: 3,
      shadow: "0 0 14px rgba(255,46,136,0.30)",
      borderWidth: 2,
    },
    fonts: {
      marquee: "'Bebas Neue', sans-serif",
      serif: "'Source Serif 4', serif",
      mono: "'IBM Plex Mono', monospace",
    },
  },
  noir: {
    label: "Film Noir",
    colors: {
      bg: "#0A0A0A",
      surface: "#161616",
      surfaceRaised: "#1F1F1F",
      accent: "#E8E8E8",
      accentDim: "#5C5C5C",
      accentSoft: "rgba(232,232,232,0.10)",
      accentSecondary: "#8B1E1E",
      accentSecondarySoft: "rgba(139,30,30,0.16)",
      cream: "#EDEDED",
      muted: "#8C8C8C",
      mutedDim: "#4A4A4A",
      line: "#2E2E2E",
      alert: "#8B1E1E",
      alertSoft: "rgba(139,30,30,0.16)",
      radius: 0,
      radiusSm: 0,
      shadow: "0 2px 10px rgba(0,0,0,0.6)",
      borderWidth: 1,
    },
    fonts: {
      marquee: "'Bebas Neue', sans-serif",
      serif: "'Source Serif 4', serif",
      mono: "'IBM Plex Mono', monospace",
    },
  },
  sepia: {
    label: "Pellicule Vintage",
    colors: {
      bg: "#2B2013",
      surface: "#3A2C1A",
      surfaceRaised: "#453520",
      accent: "#C08A3E",
      accentDim: "#7A5C2E",
      accentSoft: "rgba(192,138,62,0.14)",
      accentSecondary: "#9C4A35",
      accentSecondarySoft: "rgba(156,74,53,0.16)",
      cream: "#EDE0C8",
      muted: "#A08C6D",
      mutedDim: "#5E5138",
      line: "#57452C",
      alert: "#9C4A35",
      alertSoft: "rgba(156,74,53,0.16)",
      radius: 6,
      radiusSm: 4,
      shadow: "none",
      borderWidth: 1,
    },
    fonts: {
      marquee: "'Bebas Neue', sans-serif",
      serif: "'Source Serif 4', serif",
      mono: "'IBM Plex Mono', monospace",
    },
  },
  imax: {
    label: "Salle IMAX",
    colors: {
      bg: "#060B14",
      surface: "#0E1826",
      surfaceRaised: "#142234",
      accent: "#3FA9F5",
      accentDim: "#1E4A6B",
      accentSoft: "rgba(63,169,245,0.14)",
      accentSecondary: "#F5A623",
      accentSecondarySoft: "rgba(245,166,35,0.14)",
      cream: "#E8F1FA",
      muted: "#7C93AC",
      mutedDim: "#3D5066",
      line: "#1D3048",
      alert: "#E5484D",
      alertSoft: "rgba(229,72,77,0.16)",
      radius: 10,
      radiusSm: 6,
      shadow: "0 0 18px rgba(63,169,245,0.22)",
      borderWidth: 1,
    },
    fonts: {
      marquee: "'Bebas Neue', sans-serif",
      serif: "'Source Serif 4', serif",
      mono: "'IBM Plex Mono', monospace",
    },
  },
  drivein: {
    label: "Ciné Plein Air",
    colors: {
      bg: "#1B1B3A",
      surface: "#262650",
      surfaceRaised: "#303066",
      accent: "#FF6F59",
      accentDim: "#8A3B30",
      accentSoft: "rgba(255,111,89,0.14)",
      accentSecondary: "#2FBFA6",
      accentSecondarySoft: "rgba(47,191,166,0.14)",
      cream: "#FCEEDD",
      muted: "#9B93C9",
      mutedDim: "#524C87",
      line: "#3A3A6E",
      alert: "#FF4D6A",
      alertSoft: "rgba(255,77,106,0.16)",
      radius: 16,
      radiusSm: 10,
      shadow: "none",
      borderWidth: 2,
    },
    fonts: {
      marquee: "'Bebas Neue', sans-serif",
      serif: "'Source Serif 4', serif",
      mono: "'IBM Plex Mono', monospace",
    },
  },
  cannes: {
    label: "Tapis Rouge",
    colors: {
      bg: "#1A0A0C",
      surface: "#240F13",
      surfaceRaised: "#2E1418",
      accent: "#D4AF37",
      accentDim: "#7A6420",
      accentSoft: "rgba(212,175,55,0.14)",
      accentSecondary: "#7A1128",
      accentSecondarySoft: "rgba(122,17,40,0.18)",
      cream: "#F5E9D8",
      muted: "#9C837A",
      mutedDim: "#553F3A",
      line: "#3D1D22",
      alert: "#7A1128",
      alertSoft: "rgba(122,17,40,0.18)",
      radius: 4,
      radiusSm: 3,
      shadow: "0 4px 14px rgba(0,0,0,0.5)",
      borderWidth: 1,
    },
    fonts: {
      marquee: "'Bebas Neue', sans-serif",
      serif: "'Source Serif 4', serif",
      mono: "'IBM Plex Mono', monospace",
    },
  },
  ticket: {
    label: "Ticket de cinéma",
    colors: {
      bg: "#14100C",
      surface: "#1F1912",
      surfaceRaised: "#2A2216",
      accent: "#C58D29",
      accentDim: "#6E5A22",
      accentSoft: "#3A2C13",
      accentSecondary: "#56929F",
      accentSecondarySoft: "#16262A",
      cream: "#F3EEE3",
      muted: "#9C9284",
      mutedDim: "#6B6355",
      line: "#332B22",
      alert: "#B85C4A",
      alertSoft: "#2E1A15",
      radius: 16,
      radiusSm: 8,
      shadow: "none",
      borderWidth: 1,
    },
    fonts: {
      marquee: "'Bebas Neue', sans-serif",
      serif: "'Source Serif 4', serif",
      mono: "'IBM Plex Mono', monospace",
    },
  },
  bleu: {
    label: "Bleu moderne",
    colors: {
      bg: "#0B0E14",
      surface: "#131720",
      surfaceRaised: "#1B212C",
      accent: "#3D7DFF",
      accentDim: "#1F3F80",
      accentSoft: "#152244",
      accentSecondary: "#7FB4FF",
      accentSecondarySoft: "#16223F",
      cream: "#EDEFF3",
      muted: "#7C8494",
      mutedDim: "#4E5666",
      line: "#1F2530",
      alert: "#E85D6E",
      alertSoft: "#301A20",
      radius: 16,
      radiusSm: 8,
      shadow: "none",
      borderWidth: 1,
    },
    fonts: {
      marquee: "'Sora', sans-serif",
      serif: "'Source Serif 4', serif",
      mono: "'IBM Plex Mono', monospace",
    },
  },
  table: {
    label: "Table lumineuse",
    colors: {
      bg: "#EDEEE8",
      surface: "#FFFFFF",
      surfaceRaised: "#E2E3DB",
      accent: "#E8432F",
      accentDim: "#8A2A1E",
      accentSoft: "#F5D9D4",
      accentSecondary: "#6B6E64",
      accentSecondarySoft: "#DEDFD8",
      cream: "#14171C",
      muted: "#4A4D45",
      mutedDim: "#7A7D75",
      line: "#14171C22",
      alert: "#E8432F",
      alertSoft: "#F5D9D4",
      radius: 2,
      radiusSm: 2,
      shadow: "none",
      borderWidth: 2,
    },
    fonts: {
      marquee: "'Source Serif 4', serif",
      serif: "'Source Serif 4', serif",
      mono: "'IBM Plex Mono', monospace",
    },
  },
  affiche: {
    label: "Affiche de festival",
    colors: {
      bg: "#F2F0E8",
      surface: "#FFFFFF",
      surfaceRaised: "#F0F0EA",
      accent: "#00D9C0",
      accentDim: "#0A6E62",
      accentSoft: "#FF7A1A",
      accentSecondary: "#2F6BFF",
      accentSecondarySoft: "#FFF1DC",
      gold: "#FFD400",
      cream: "#0D0D0D",
      muted: "#0D0D0DB3",
      mutedDim: "#0D0D0D80",
      line: "#0D0D0D33",
      alert: "#FF7A1A",
      alertSoft: "#FFE9D6",
      radius: 0,
      radiusSm: 0,
      shadow: "4px 4px 0 #0D0D0D",
      borderWidth: 3,
    },
    fonts: {
      marquee: "'Archivo Black', sans-serif",
      serif: "'Source Serif 4', serif",
      mono: "'IBM Plex Mono', monospace",
    },
  },
  minitel: {
    label: "Minitel",
    colors: {
      bg: "#000000",
      surface: "#000000",
      surfaceRaised: "#0A0A0A",
      accent: "#00D9C0",
      accentDim: "#0A6E62",
      accentSoft: "#FF7A1A",
      accentSecondary: "#2F6BFF",
      accentSecondarySoft: "#0A1830",
      gold: "#FFD400",
      cream: "#F0F0F0",
      muted: "#F0F0F099",
      mutedDim: "#F0F0F066",
      line: "#F0F0F033",
      alert: "#FF7A1A",
      alertSoft: "#2A1400",
      radius: 0,
      radiusSm: 0,
      shadow: "none",
      borderWidth: 1,
    },
    fonts: {
      marquee: "'IBM Plex Mono', monospace",
      serif: "'IBM Plex Mono', monospace",
      mono: "'IBM Plex Mono', monospace",
    },
  },
  salle: {
    label: "Salle privée",
    colors: {
      bg: "#1B1720",
      surface: "#241F2C",
      surfaceRaised: "#2E2836",
      accent: "#C9A876",
      accentDim: "#7A6544",
      accentSoft: "#3A3226",
      accentSecondary: "#8E7F9E",
      accentSecondarySoft: "#332C42",
      cream: "#F0EAE2",
      muted: "#A69AAE",
      mutedDim: "#6E637A",
      line: "#332C3D",
      alert: "#C97C6E",
      alertSoft: "#3A2620",
      radius: 20,
      radiusSm: 16,
      shadow: "0 8px 20px rgba(0,0,0,0.35)",
      borderWidth: 1,
    },
    fonts: {
      marquee: "'Playfair Display', serif",
      serif: "'Source Serif 4', serif",
      mono: "'Inter', sans-serif",
    },
  },
  letterboxd: {
    label: "Letterboxd",
    colors: {
      bg: "#14181C",
      surface: "#1C2228",
      surfaceRaised: "#242C33",
      accent: "#00E054",
      accentDim: "#0A6E2A",
      accentSoft: "#0F2A1C",
      accentSecondary: "#40BCF4",
      accentSecondarySoft: "#0F222E",
      gold: "#FF8000",
      cream: "#F5F5F5",
      muted: "#8CA3B3",
      mutedDim: "#5A6E7B",
      line: "#2A333A",
      alert: "#FF8000",
      alertSoft: "#2E1F0A",
      radius: 6,
      radiusSm: 4,
      shadow: "none",
      borderWidth: 1,
    },
    fonts: {
      marquee: "'Inter', sans-serif",
      serif: "'Source Serif 4', serif",
      mono: "'IBM Plex Mono', monospace",
    },
  },
};

let T = { ...THEMES.sombre.colors };
let F = { ...THEMES.sombre.fonts };
let CURRENT_THEME = "sombre";

function applyTheme_(name) {
  const theme = THEMES[name] || THEMES.sombre;
  Object.assign(T, theme.colors);
  Object.assign(F, theme.fonts);
  CURRENT_THEME = THEMES[name] ? name : "sombre";
  try {
    localStorage.setItem("cineradar_theme", name);
  } catch {}
}

function getStoredTheme_() {
  try {
    return localStorage.getItem("cineradar_theme") || "sombre";
  } catch {
    return "sombre";
  }
}

// ─────────────────────────────────────────────────────────────
// MOT DE PASSE MÉMORISÉ SUR L'APPAREIL
// Demandé une seule fois via window.prompt(), stocké en localStorage.
// Effacé automatiquement si le serveur répond 401 (mauvais mot de passe).
// ─────────────────────────────────────────────────────────────
const PWD_KEY = "cineradar_pwd";

function getStoredPassword() {
  try {
    return localStorage.getItem(PWD_KEY) || "";
  } catch {
    return "";
  }
}

function askAndStorePassword() {
  const pwd = window.prompt("Mot de passe CinéRadar :");
  if (pwd) {
    try {
      localStorage.setItem(PWD_KEY, pwd);
    } catch {}
  }
  return pwd || "";
}

async function apiWrite(url, body) {
  let password = getStoredPassword();
  if (!password) password = askAndStorePassword();
  if (!password) return { ok: false, error: "Mot de passe requis" };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, password }),
  });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    try {
      localStorage.removeItem(PWD_KEY);
    } catch {}
    return { ok: false, error: "Mot de passe incorrect (redemandé au prochain essai)" };
  }
  if (!res.ok) return { ok: false, error: data.error || "Erreur serveur" };
  return { ok: true, data };
}

const PROVIDER_META = {
  "Canal+": { bg: "#000000", fg: "#FFFFFF", label: "CANAL+", weight: 800, category: "abonnement" },
  Netflix: { bg: "#E50914", fg: "#FFFFFF", label: "N", weight: 800, category: "abonnement" },
  "Disney+": { bg: "#0E1A2B", fg: "#FFFFFF", label: "D+", weight: 800, category: "abonnement" },
  "Prime Video": { bg: "#00A8E1", fg: "#0E1E25", label: "prime", weight: 700, category: "abonnement" },
  Max: { bg: "#001A1A", fg: "#FFFFFF", label: "max", weight: 700, italic: true, category: "abonnement" },
  "Orange VOD": { bg: "#FF7900", fg: "#FFFFFF", label: "orange", weight: 400, category: "vod" },
  "Apple TV Store": { bg: "#000000", fg: "#FFFFFF", label: "", weight: 700, category: "vod" },
  "Google Play Movies": { bg: "#FFFFFF", fg: "#5F6368", label: "▶", weight: 700, category: "vod" },
  "Canal VOD": { bg: "#000000", fg: "#FFFFFF", label: "CANAL+", weight: 800, category: "vod" },
  YouTube: { bg: "#FF0000", fg: "#FFFFFF", label: "▶", weight: 700, category: "vod" },
};

const SUBSCRIPTION_OPTIONS = [
  { key: "netflix", label: "Netflix" },
  { key: "prime", label: "Prime Video" },
  { key: "disney", label: "Disney+" },
  { key: "canal", label: "Canal+" },
  { key: "canalseries", label: "Canal+ Séries" },
  { key: "appletv", label: "Apple TV+" },
  { key: "paramount", label: "Paramount+" },
  { key: "ocs", label: "OCS" },
  { key: "max", label: "Max (HBO)" },
];

function normalizeText(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatRelativeDate(iso) {
  if (!iso) return "Date inconnue";
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return `Aujourd'hui à ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return date.toLocaleDateString("fr-FR");
}

function LetterboxdMark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label="Letterboxd">
      <circle cx="28" cy="50" r="22" fill="#FF8000" />
      <circle cx="50" cy="50" r="22" fill="#00E054" />
      <circle cx="72" cy="50" r="22" fill="#40BCF4" />
      <ellipse cx="21" cy="39" rx="7.5" ry="4.5" fill="rgba(255,255,255,0.32)" />
      <ellipse cx="43" cy="39" rx="7.5" ry="4.5" fill="rgba(255,255,255,0.32)" />
      <ellipse cx="65" cy="39" rx="7.5" ry="4.5" fill="rgba(255,255,255,0.32)" />
    </svg>
  );
}

function PlatformBadge({ name }) {
  const meta = PROVIDER_META[name] || {
    bg: T.surfaceRaised,
    fg: T.cream,
    label: name.slice(0, 1),
    weight: 700,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: meta.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          border: meta.bg === "#FFFFFF" ? `1px solid ${T.line}` : "none",
        }}
      >
        <span
          style={{
            color: meta.fg,
            fontWeight: meta.weight,
            fontStyle: meta.italic ? "italic" : "normal",
            fontSize: meta.label.length > 2 ? 8 : 13,
          }}
        >
          {meta.label}
        </span>
      </div>
      <span style={{ fontFamily: F.serif, fontSize: 14, color: T.cream }}>{name}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// INTRO RADAR — jouée UNE FOIS au vrai lancement de l'appli, pas à
// chaque navigation. Couleurs et polices volontairement FIXES (pas
// liées au thème actif T/F) : la vision bleue d'origine reste la même
// quel que soit le thème choisi ensuite dans Paramètres — même principe
// que le rideau de CinéMaison, qui garde sa propre palette indépendamment
// du thème actif.
//
// Séquence, calée sur `ready` plutôt que sur un minutage fixe : le
// balayage tourne en boucle tant que les données ne sont pas prêtes
// (le balayage EST l'indicateur de chargement, pas besoin d'un spinner
// séparé), puis seulement une fois `ready` vrai la séquence de
// verrouillage → révélation → maintien → fondu se déclenche.
// ─────────────────────────────────────────────────────────────
function playRadarPing_() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.35);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  } catch {
    // Contexte audio indisponible/bloqué — silencieux, pas grave.
  }
}

// ─────────────────────────────────────────────────────────────
// GLYPHE DU LOGO — cadre de visée + ondes radar concentriques + point
// central. Même dessin que l'icône de l'app (voir icon-512.png), réutilisé
// à la fois dans la révélation de l'intro (couleur bleue fixe) et dans le
// Header présent sur tous les écrans (couleur qui suit le thème actif).
// ─────────────────────────────────────────────────────────────
function LogoGlyph({ size = 36, color = "#3D7DFF" }) {
  const corners = [
    { sx: -1, sy: -1 },
    { sx: 1, sy: -1 },
    { sx: -1, sy: 1 },
    { sx: 1, sy: 1 },
  ];
  const half = 25.5;
  const arm = 11.5;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {corners.map(({ sx, sy }, i) => {
        const x0 = 50 + sx * half;
        const y0 = 50 + sy * half;
        const x1 = x0 - sx * arm;
        const y1 = y0 - sy * arm;
        return (
          <g key={i}>
            <line x1={x0} y1={y0} x2={x1} y2={y0} stroke={color} strokeWidth="3.6" strokeLinecap="round" />
            <line x1={x0} y1={y0} x2={x0} y2={y1} stroke={color} strokeWidth="3.6" strokeLinecap="round" />
          </g>
        );
      })}
      <circle cx="50" cy="50" r="17.5" fill="none" stroke={color} strokeWidth="1.7" opacity="0.45" />
      <circle cx="50" cy="50" r="11.5" fill="none" stroke={color} strokeWidth="1.9" opacity="0.68" />
      <circle cx="50" cy="50" r="3.6" fill={color} />
    </svg>
  );
}

function RadarIntro({ ready, onDone }) {
  const [phase, setPhase] = useState("sweep"); // sweep -> lock -> reveal -> fadeout
  const [hidden, setHidden] = useState(false);
  const [showSkip, setShowSkip] = useState(false);

  const MIN_SWEEP_DURATION = 3000;
  const LOCK_DELAY = 450;
  const LOCK_DURATION = 900;
  const HOLD_DURATION = 1700;
  const FADE_OUT_DURATION = 800;

  const [minSweepDone, setMinSweepDone] = useState(false);

  // Couleurs fixes — la "vision bleue" d'origine, indépendante du thème actif.
  const BLUE = "#3D7DFF";
  const BLUE_LIGHT = "#7FB4FF";
  const BG = "#0B0E14";
  const SURFACE = "#131720";
  const CREAM = "#EDEFF3";
  const MUTED = "#7C8494";
  const LINE = "#1F2530";
  const MONO = "'IBM Plex Mono', monospace";
  const MARQUEE = "'Bebas Neue', sans-serif";

  useEffect(() => {
    const t = setTimeout(() => setShowSkip(true), 1400);
    return () => clearTimeout(t);
  }, []);

  // Durée minimale de balayage, même si les données arrivent plus vite —
  // sans ça, sur une connexion rapide, le balayage ne dure quasiment rien.
  useEffect(() => {
    const t = setTimeout(() => setMinSweepDone(true), MIN_SWEEP_DURATION);
    return () => clearTimeout(t);
  }, []);

  // sweep -> lock : uniquement déclenché par `ready` ET le minimum de
  // balayage écoulé, aucune minuterie propre à cet effet (voir la note
  // dans le composant précédent sur le piège d'un setTimeout programmé
  // dans le même effet que celui qui change la dépendance qui le déclenche).
  useEffect(() => {
    if (!ready || !minSweepDone) return;
    const t = setTimeout(() => setPhase("lock"), LOCK_DELAY);
    return () => clearTimeout(t);
  }, [ready, minSweepDone]);

  // lock -> reveal
  useEffect(() => {
    if (phase !== "lock") return;
    playRadarPing_();
    try {
      navigator.vibrate && navigator.vibrate([20, 30, 20]);
    } catch {}
    const t = setTimeout(() => setPhase("reveal"), LOCK_DURATION);
    return () => clearTimeout(t);
  }, [phase]);

  // reveal -> fadeout (maintien du logo affiché quelques instants)
  useEffect(() => {
    if (phase !== "reveal") return;
    const t = setTimeout(() => setPhase("fadeout"), HOLD_DURATION);
    return () => clearTimeout(t);
  }, [phase]);

  // fadeout -> fin
  useEffect(() => {
    if (phase !== "fadeout") return;
    const t = setTimeout(() => {
      setHidden(true);
      onDone?.();
    }, FADE_OUT_DURATION);
    return () => clearTimeout(t);
  }, [phase]);

  if (hidden) return null;

  const blips = [
    { top: "28%", left: "62%", delay: "0s" },
    { top: "58%", left: "72%", delay: "0.4s" },
    { top: "70%", left: "38%", delay: "0.9s" },
    { top: "35%", left: "30%", delay: "1.3s" },
  ];
  const lockTarget = blips[0];
  const revealed = phase === "reveal" || phase === "fadeout";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        overflow: "hidden",
        opacity: phase === "fadeout" ? 0 : 1,
        transition: `opacity ${FADE_OUT_DURATION}ms ease`,
      }}
    >
      {/* Écran radar */}
      <div
        style={{
          position: "relative",
          width: 230,
          height: 230,
          opacity: revealed ? 0 : 1,
          transform: revealed ? "scale(0.9)" : "scale(1)",
          transition: "opacity 0.35s ease, transform 0.35s ease",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: -20,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${BLUE}14 0%, transparent 70%)`,
          }}
        />

        {[1, 0.66, 0.33].map((s) => (
          <div
            key={s}
            style={{
              position: "absolute",
              top: `${(1 - s) * 50}%`,
              left: `${(1 - s) * 50}%`,
              width: `${s * 100}%`,
              height: `${s * 100}%`,
              borderRadius: "50%",
              border: `1px solid ${LINE}`,
              opacity: 0.8,
            }}
          />
        ))}
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: LINE, opacity: 0.5 }} />
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: LINE, opacity: 0.5 }} />

        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden" }}>
          <div
            style={{
              width: "100%",
              height: "100%",
              filter: "blur(2px)",
              background: `conic-gradient(from 0deg, transparent 0deg, transparent 250deg, ${BLUE}22 300deg, ${BLUE_LIGHT}CC 340deg, ${BLUE_LIGHT} 360deg)`,
              animation: "cr-radar-spin 3.2s linear infinite",
              animationPlayState: phase === "sweep" ? "running" : "paused",
            }}
          />
        </div>

        {blips.map((b, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: b.top,
              left: b.left,
              width: 7,
              height: 7,
              marginTop: -3.5,
              marginLeft: -3.5,
              borderRadius: "50%",
              background: BLUE_LIGHT,
              boxShadow: `0 0 6px 1px ${BLUE_LIGHT}99`,
              animation: phase === "sweep" ? "cr-radar-pulse 1.8s ease-in-out infinite" : "none",
              animationDelay: b.delay,
              opacity: phase === "sweep" ? undefined : 1,
            }}
          />
        ))}

        {phase !== "sweep" && (
          <div
            style={{
              position: "absolute",
              top: lockTarget.top,
              left: lockTarget.left,
              width: 36,
              height: 36,
              marginTop: -18,
              marginLeft: -18,
              animation: `cr-radar-lock ${LOCK_DURATION}ms ease-out forwards`,
            }}
          >
            {[
              { top: 0, left: 0, borderWidth: "2px 0 0 2px" },
              { top: 0, right: 0, borderWidth: "2px 2px 0 0" },
              { bottom: 0, left: 0, borderWidth: "0 0 2px 2px" },
              { bottom: 0, right: 0, borderWidth: "0 2px 2px 0" },
            ].map((corner, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: 12,
                  height: 12,
                  borderStyle: "solid",
                  borderColor: BLUE_LIGHT,
                  ...corner,
                }}
              />
            ))}
          </div>
        )}

        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 4,
            height: 4,
            marginTop: -2,
            marginLeft: -2,
            borderRadius: "50%",
            background: CREAM,
            boxShadow: `0 0 5px 1px ${CREAM}88`,
          }}
        />
      </div>

      {phase === "sweep" && (
        <p style={{ marginTop: 22, fontFamily: MONO, fontSize: 9.5, letterSpacing: 3, color: MUTED }}>
          SCAN EN COURS…
        </p>
      )}

      {/* Révélation : badge + wordmark + tagline, maintenus affichés     */}
      {/* jusqu'au fondu final (voir HOLD_DURATION).                      */}
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          opacity: revealed ? 1 : 0,
          transform: revealed ? "scale(1)" : "scale(0.85)",
          transition: "opacity 0.4s ease 0.1s, transform 0.4s ease 0.1s",
        }}
      >
        <div style={{ filter: `drop-shadow(0 0 10px ${BLUE}66)` }}>
          <LogoGlyph size={76} color={BLUE} />
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 12 }}>
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: "50%",
                  background: i % 3 === 0 ? BLUE : LINE,
                }}
              />
            ))}
          </div>
          <div
            style={{
              padding: "8px 18px",
              borderRadius: 4,
              background: SURFACE,
              boxShadow: `0 0 26px ${BLUE}33`,
            }}
          >
            <div
              style={{
                fontFamily: MARQUEE,
                fontSize: 30,
                letterSpacing: 1,
                color: CREAM,
                lineHeight: 1,
                textShadow: `0 0 16px ${BLUE}77`,
              }}
            >
              CINÉ<span style={{ color: BLUE_LIGHT }}>RADAR</span>
            </div>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED, letterSpacing: 2, marginTop: 12 }}>
            SÉANCE PRIVÉE · 2 PLACES
          </div>
        </div>
      </div>

      {showSkip && !revealed && (
        <button
          onClick={() => onDone?.()}
          style={{
            position: "absolute",
            bottom: 36,
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: 0.5,
            color: MUTED,
          }}
        >
          Passer →
        </button>
      )}
    </div>
  );
}


function Header({ onBack }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px 16px",
        paddingTop: "calc(14px + env(safe-area-inset-top))",
      }}
    >
      {onBack && (
        <button onClick={onBack} style={{ padding: 4, marginLeft: -4 }} aria-label="Retour">
          <span style={{ color: T.cream, fontSize: 22 }}>←</span>
        </button>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <LogoGlyph size={36} color={T.accent} />
        <div>
          <div
            style={{
              fontFamily: F.marquee,
              fontSize: 24,
              letterSpacing: 1,
              color: T.cream,
              lineHeight: 1,
            }}
          >
            CINÉ<span style={{ color: T.accent }}>RADAR</span>
          </div>
          <div
            style={{
              fontFamily: F.mono,
              fontSize: 9,
              color: T.muted,
              letterSpacing: 1,
            }}
          >
            SÉANCE PRIVÉE · 2 PLACES
          </div>
        </div>
      </div>
    </div>
  );
}

function MarqueeBadge({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        background: "rgba(231,162,58,0.12)",
        color: T.accent,
        border: `1px solid ${T.accentDim}`,
        borderRadius: 3,
        fontFamily: F.mono,
        fontSize: 11,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: T.accent,
          boxShadow: `0 0 6px ${T.accent}`,
        }}
      />
      {children}
    </span>
  );
}

function StampBadge({ children, size = "normal" }) {
  const pad = size === "small" ? "3px 8px" : "5px 12px";
  const fontSize = size === "small" ? 9 : 11;
  return (
    <div
      style={{
        display: "inline-block",
        transform: "rotate(-7deg)",
        padding: pad,
        border: `2px solid ${T.accent}`,
        borderRadius: 4,
        boxShadow: `0 0 0 2px ${T.bg}, 0 0 0 3px ${T.accent}`,
        background: "rgba(19,16,12,0.6)",
        color: T.accent,
        fontFamily: F.mono,
        fontSize,
        letterSpacing: 1.5,
        textTransform: "uppercase",
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

function CompactCard({ movie, onOpen, colorIndex = 0 }) {
  const borderColors = [T.accent, T.accentSecondary, T.accentDim];
  const borderColor = borderColors[colorIndex % borderColors.length];
  const rating = movie.letterboxdRating ?? movie.tmdbRating;
  const providerLabel = movie.providers?.abonnement?.[0] || movie.providers?.vod?.[0] || null;

  return (
    <button
      onClick={() => onOpen(movie)}
      style={{
        flexShrink: 0,
        width: 108,
        textAlign: "left",
        background: T.surface,
        borderRadius: T.radiusSm,
        overflow: "hidden",
        border: `2px solid ${borderColor}`,
      }}
    >
      <div style={{ width: 108, height: 152, background: "#000" }}>
        {movie.poster ? (
          <img src={movie.poster} alt={movie.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: T.muted,
              fontFamily: F.mono,
              fontSize: 9,
            }}
          >
            —
          </div>
        )}
      </div>
      <div style={{ padding: "7px 8px 9px" }}>
        <div
          style={{
            fontFamily: F.serif,
            fontWeight: 600,
            fontSize: 11.5,
            lineHeight: 1.25,
            color: T.cream,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: 28,
          }}
        >
          {movie.title}
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 8.5, color: T.muted, marginTop: 4, lineHeight: 1.4 }}>
          {providerLabel && <span style={{ color: T.accent }}>{providerLabel}</span>}
          {providerLabel ? " · " : ""}
          {movie.year}
          {rating != null ? ` · ★ ${rating}` : ""}
        </div>
      </div>
    </button>
  );
}

function HorizontalRow({ icon, label, movies, onOpen, emptyText }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontFamily: F.marquee, fontSize: 17, color: T.cream, whiteSpace: "nowrap" }}>{label}</span>
        <span style={{ flex: 1, height: 1, background: T.line }} />
      </div>
      {movies.length === 0 ? (
        <div style={{ fontFamily: F.mono, fontSize: 11, color: T.muted }}>{emptyText}</div>
      ) : (
        <div style={{ display: "flex", gap: 10, overflowX: "auto", margin: "0 -16px", padding: "0 16px 4px" }}>
          {movies.map((m, i) => (
            <CompactCard key={m.tmdbId} movie={m} onOpen={onOpen} colorIndex={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function MovieCard({ movie, onOpen }) {
  return (
    <button
      onClick={() => onOpen(movie)}
      style={{
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: T.surface,
        border: `${T.borderWidth}px solid ${T.line}`,
        borderRadius: T.radius,
        boxShadow: T.shadow,
      }}
    >
      <div style={{ aspectRatio: "2 / 3", position: "relative", background: "#000" }}>
        {movie.poster ? (
          <img src={movie.poster} alt={movie.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: T.muted,
              fontFamily: F.mono,
              fontSize: 10,
            }}
          >
            Affiche indisponible
          </div>
        )}
        {movie.providers?.abonnement?.length > 0 && (
          <div style={{ position: "absolute", top: 6, right: 6 }}>
            <StampBadge size="small">Abonné</StampBadge>
          </div>
        )}
      </div>
      <div style={{ padding: "8px 10px" }}>
        <div style={{ fontFamily: F.marquee, fontSize: 16, color: T.cream, lineHeight: 1 }}>
          {movie.title}
        </div>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: T.muted, marginTop: 3 }}>
          {movie.year} · {movie.director}
        </div>
      </div>
    </button>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontFamily: F.marquee, fontSize: 20, color: T.cream, marginBottom: 10 }}>
      {children}
    </div>
  );
}

function BottomNav({ view, onChange }) {
  const items = [
    { key: "home", label: "Accueil", icon: "🏠" },
    { key: "search", label: "Recherche", icon: "🔍" },
    { key: "library", label: "Bibliothèque", icon: "📚" },
    { key: "history", label: "Historique", icon: "🕘" },
    { key: "settings", label: "Paramètres", icon: "⚙️" },
  ];
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 480,
        display: "flex",
        background: T.surface,
        borderTop: `1px solid ${T.line}`,
        paddingBottom: "env(safe-area-inset-bottom)",
        zIndex: 10,
      }}
    >
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            padding: "10px 0 8px",
            color: view === item.key ? T.accent : T.muted,
          }}
        >
          <span style={{ fontSize: 18 }}>{item.icon}</span>
          <span style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: 0.5 }}>
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}

function DetailView({ movie, onBack, onEdit, onDeleted }) {
  const [showLinks, setShowLinks] = useState(false);
  const [showVod, setShowVod] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const abonnement = movie.providers?.abonnement || [];
  const vod = movie.providers?.vod || [];

  const confirmDelete = async () => {
    setDeleteStatus("loading");
    setDeleteError("");
    const result = await apiWrite("/api/delete-movie", {
      title: movie.title,
      year: movie.year,
      tmdbId: movie.tmdbId,
    });
    if (!result.ok) {
      setDeleteStatus("error");
      setDeleteError(result.error);
      return;
    }
    setDeleteStatus("success");
    setTimeout(() => onDeleted?.(), 1200);
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, maxWidth: 480, margin: "0 auto" }}>
      <Header onBack={onBack} />
      <div style={{ padding: "0 16px 96px" }}>
        <div style={{ background: T.surface, border: `${T.borderWidth}px solid ${T.line}`, borderRadius: T.radius, boxShadow: T.shadow, overflow: "hidden" }}>
          <div style={{ height: "42vh", background: "#000" }}>
            {movie.poster && (
              <img src={movie.poster} alt={movie.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            )}
          </div>
          <div style={{ padding: "14px 16px 18px" }}>
            {abonnement.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <StampBadge>Abonné</StampBadge>
              </div>
            )}
            <div style={{ fontFamily: F.marquee, fontSize: 32, color: T.cream, lineHeight: 1 }}>
              {movie.title}
            </div>
            <div style={{ fontFamily: F.mono, fontSize: 12, color: T.muted, marginTop: 6 }}>
              {movie.year} · {movie.director}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {(movie.genres || []).map((g) => (
                <span
                  key={g}
                  style={{
                    padding: "4px 10px",
                    fontFamily: F.mono,
                    fontSize: 10,
                    color: T.cream,
                    border: `1px solid ${T.line}`,
                    borderRadius: 3,
                  }}
                >
                  {g}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  border: `2px solid ${T.accentSecondary}`,
                  transform: "rotate(-6deg)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ color: T.accentSecondary, fontSize: 12 }}>★</span>
                <span style={{ fontFamily: F.marquee, fontSize: 20, color: T.accentSecondary, lineHeight: 1 }}>
                  {movie.letterboxdRating ?? movie.tmdbRating}
                </span>
              </div>
              <div>
                <div style={{ fontFamily: F.mono, fontSize: 10, color: T.muted }}>
                  {movie.letterboxdRating ? "LETTERBOXD" : "TMDB (Letterboxd indisponible)"}
                </div>
                <div style={{ fontFamily: F.mono, fontSize: 13, color: T.cream }}>
                  {movie.letterboxdVotes
                    ? `${movie.letterboxdVotes.toLocaleString("fr-FR")} votes`
                    : `${movie.tmdbVotes} votes TMDB`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {movie.letterboxdUrl && (
          <a
            href={movie.letterboxdUrl}
            style={{
              display: "flex",
              marginTop: 16,
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "12px 0",
              background: T.surface,
              border: `1.5px solid ${T.accent}`,
              borderRadius: 6,
              fontFamily: F.mono,
              fontSize: 13,
              color: T.accent,
              letterSpacing: 0.5,
            }}
          >
            <LetterboxdMark size={30} /> OUVRIR DANS LETTERBOXD
          </a>
        )}

        {movie.synopsis && (
          <div style={{ marginTop: 24 }}>
            <SectionTitle>Synopsis</SectionTitle>
            <p style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 1.6, color: T.cream }}>
              {movie.synopsis}
            </p>
          </div>
        )}

        {movie.cast && movie.cast.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <SectionTitle>Casting principal</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {movie.cast.map((c) => (
                <div
                  key={c}
                  style={{
                    padding: "10px 12px",
                    background: T.surface,
                    border: `1px solid ${T.line}`,
                    borderRadius: 6,
                    fontFamily: F.serif,
                    fontSize: 14,
                    color: T.cream,
                  }}
                >
                  {c}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <SectionTitle>Informations</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ padding: 12, background: T.surface, border: `${T.borderWidth}px solid ${T.line}`, borderRadius: T.radiusSm }}>
              <div style={{ fontFamily: F.mono, fontSize: 9, color: T.muted }}>
                RÉALISATION
              </div>
              <div style={{ fontFamily: F.mono, fontSize: 13, color: T.cream, marginTop: 4 }}>
                {movie.director}
              </div>
            </div>
            <button
              onClick={() => setShowLinks((v) => !v)}
              style={{ padding: 12, background: T.surface, border: `${T.borderWidth}px solid ${T.line}`, borderRadius: T.radiusSm, textAlign: "left" }}
            >
              <div style={{ fontFamily: F.mono, fontSize: 9, color: T.muted }}>
                NOTE TMDB · toucher
              </div>
              <div style={{ fontFamily: F.mono, fontSize: 13, color: T.cream, marginTop: 4 }}>
                {movie.tmdbRating}/10
              </div>
            </button>
          </div>
          {showLinks && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <a
                href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "10px 0",
                  border: `1px solid ${T.line}`,
                  borderRadius: 6,
                  fontFamily: F.mono,
                  fontSize: 12,
                  color: T.cream,
                }}
              >
                TMDB ↗
              </a>
              {movie.imdbId && (
                <a
                  href={`https://www.imdb.com/title/${movie.imdbId}/`}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "10px 0",
                    border: `1px solid ${T.line}`,
                    borderRadius: 6,
                    fontFamily: F.mono,
                    fontSize: 12,
                    color: T.cream,
                  }}
                >
                  IMDb ↗
                </a>
              )}
            </div>
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          <SectionTitle>Où regarder</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {abonnement.length > 0 && (
              <div style={{ padding: 12, background: T.surface, border: `${T.borderWidth}px solid ${T.line}`, borderRadius: T.radiusSm }}>
                <div style={{ fontFamily: F.mono, fontSize: 10, color: T.accent, marginBottom: 8 }}>
                  MES ABONNEMENTS
                </div>
                {abonnement.map((p) => (
                  <div
                    key={p}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderTop: `1px solid ${T.line}`,
                    }}
                  >
                    <PlatformBadge name={p} />
                    <span style={{ fontFamily: F.mono, fontSize: 11, color: T.accent }}>
                      Voir →
                    </span>
                  </div>
                ))}
              </div>
            )}
            {vod.length > 0 && (
              <div style={{ padding: 12, background: T.surface, border: `${T.borderWidth}px solid ${T.line}`, borderRadius: T.radiusSm }}>
                <button
                  onClick={() => setShowVod((v) => !v)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontFamily: F.mono, fontSize: 10, color: T.muted }}>
                    VOD · LOCATION / ACHAT ({vod.length})
                  </span>
                  <span style={{ fontFamily: F.mono, fontSize: 12, color: T.accent }}>
                    {showVod ? "▲" : "▼"}
                  </span>
                </button>
                {showVod && (
                  <div style={{ marginTop: 8 }}>
                    {vod.map((p) => (
                      <div
                        key={p}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 0",
                          borderTop: `1px solid ${T.line}`,
                        }}
                      >
                        <PlatformBadge name={p} />
                        <span style={{ fontFamily: F.mono, fontSize: 11, color: T.accent }}>
                          Voir →
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {abonnement.length === 0 && vod.length === 0 && (
              <div style={{ fontFamily: F.mono, fontSize: 12, color: T.muted }}>
                Aucune offre trouvée en France pour le moment.
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => onEdit(movie)}
          style={{
            width: "100%",
            marginTop: 24,
            padding: "12px 0",
            border: `1px solid ${T.line}`,
            borderRadius: 6,
            fontFamily: F.mono,
            fontSize: 12,
            color: T.muted,
            letterSpacing: 0.5,
          }}
        >
          MODIFIER CETTE FICHE
        </button>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "12px 0",
              border: `1px solid ${T.accentSecondary}`,
              borderRadius: 6,
              fontFamily: F.mono,
              fontSize: 12,
              color: T.accentSecondary,
              letterSpacing: 0.5,
            }}
          >
            SUPPRIMER CETTE FICHE
          </button>
        ) : (
          <div
            style={{
              marginTop: 10,
              padding: 14,
              border: `1px solid ${T.accentSecondary}`,
              borderRadius: 6,
            }}
          >
            <div style={{ fontFamily: F.mono, fontSize: 12, color: T.cream, marginBottom: 10 }}>
              Confirmer la suppression de « {movie.title} » ?
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteStatus(null);
                }}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  border: `1px solid ${T.line}`,
                  borderRadius: 6,
                  fontFamily: F.mono,
                  fontSize: 12,
                  color: T.muted,
                }}
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteStatus === "loading"}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  background: T.accentSecondary,
                  borderRadius: 6,
                  fontFamily: F.mono,
                  fontSize: 12,
                  color: T.cream,
                  opacity: deleteStatus === "loading" ? 0.5 : 1,
                }}
              >
                {deleteStatus === "loading" ? "Suppression..." : "Confirmer"}
              </button>
            </div>
            {deleteStatus === "success" && (
              <div style={{ marginTop: 10, fontFamily: F.mono, fontSize: 12, color: T.accent }}>
                Supprimé ! Retour à l'accueil...
              </div>
            )}
            {deleteStatus === "error" && (
              <div style={{ marginTop: 10, fontFamily: F.mono, fontSize: 12, color: T.accentSecondary }}>
                Erreur : {deleteError}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 16, textAlign: "center", fontFamily: F.mono, fontSize: 10, color: T.muted }}>
          Dernière vérification · {new Date(movie.lastChecked).toLocaleString("fr-FR")}
        </div>
      </div>
    </div>
  );
}

function HomeView({ movies, onOpen, loading, error, onAdd, onRefresh, refreshing }) {
  const recentlyAvailable = [...movies]
    .filter((m) => m.availableSince)
    .sort((a, b) => new Date(b.availableSince) - new Date(a.availableSince))
    .slice(0, 5);

  const lastAdded = [...movies]
    .filter((m) => m.updatedAt)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, maxWidth: 480, margin: "0 auto" }}>
      <Header />
      <div style={{ padding: "0 16px 90px" }}>
        <div style={{ fontFamily: F.mono, fontSize: 11, color: T.accent, letterSpacing: 1 }}>
          GUICHET
        </div>
        <div style={{ fontFamily: F.marquee, fontSize: 32, color: T.cream, marginTop: 4, lineHeight: 1.05 }}>
          Où regarder votre prochain film ?
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <div style={{ flex: 1, textAlign: "center", padding: "16px 8px", background: T.surface, border: `${T.borderWidth}px solid ${T.line}`, borderRadius: T.radiusSm }}>
            <div style={{ fontFamily: F.marquee, fontSize: 28, color: T.cream }}>{movies.length}</div>
            <div style={{ fontFamily: F.mono, fontSize: 10, color: T.muted }}>SUIVIS</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            onClick={onAdd}
            style={{
              flex: 1,
              padding: "12px 0",
              border: `1px solid ${T.accent}`,
              borderRadius: 6,
              fontFamily: F.mono,
              fontSize: 13,
              color: T.accent,
              letterSpacing: 0.5,
            }}
          >
            + AJOUTER UN FILM
          </button>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            style={{
              padding: "12px 16px",
              border: `1px solid ${T.line}`,
              borderRadius: 6,
              fontFamily: F.mono,
              fontSize: 12,
              color: T.muted,
              opacity: refreshing ? 0.5 : 1,
            }}
          >
            {refreshing ? "..." : "↻"}
          </button>
        </div>

        {loading && (
          <div style={{ fontFamily: F.mono, fontSize: 12, color: T.muted, marginTop: 20 }}>
            Chargement des données...
          </div>
        )}
        {error && (
          <div style={{ fontFamily: F.mono, fontSize: 12, color: T.accentSecondary, marginTop: 20 }}>
            Erreur : {error}
          </div>
        )}

        <HorizontalRow
          icon="✨"
          label="Récemment disponibles"
          movies={recentlyAvailable}
          onOpen={onOpen}
          emptyText="Rien de nouveau sur tes abonnements pour l'instant."
        />

        <HorizontalRow
          icon="🎬"
          label="Derniers ajouts"
          movies={lastAdded}
          onOpen={onOpen}
          emptyText="Aucun film ajouté récemment."
        />
      </div>
    </div>
  );
}

function SearchView({ movies, onOpen }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeText(query);
  const filtered = query.trim() ? movies.filter((m) => normalizeText(m.title).includes(normalizedQuery)) : movies;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, maxWidth: 480, margin: "0 auto" }}>
      <Header />
      <div style={{ padding: "0 16px 90px" }}>
        <div style={{ fontFamily: F.mono, fontSize: 11, color: T.accent, letterSpacing: 1 }}>
          RECHERCHE
        </div>
        <div style={{ fontFamily: F.marquee, fontSize: 26, color: T.cream, marginTop: 4, marginBottom: 16 }}>
          Trouver un film
        </div>
        <input
          placeholder="Rechercher un titre..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%",
            marginBottom: 20,
            background: T.surface,
            border: `1px solid ${T.line}`,
            borderRadius: 6,
            color: T.cream,
            fontFamily: F.serif,
            fontSize: 15,
            padding: "12px 14px",
          }}
        />
        {filtered.length === 0 ? (
          <div style={{ fontFamily: F.mono, fontSize: 12, color: T.muted }}>
            Aucun film ne correspond à cette recherche.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {filtered.map((m) => (
              <MovieCard key={m.tmdbId} movie={m} onOpen={onOpen} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LibraryView({ movies, onOpen }) {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState("az");
  const [genre, setGenre] = useState("Tous");

  let filtered = movies;
  if (query.trim()) {
    const nq = normalizeText(query);
    filtered = filtered.filter((m) => normalizeText(m.title).includes(nq));
  }
  if (genre !== "Tous") {
    filtered = filtered.filter((m) => (m.genres || []).includes(genre));
  }

  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === "az") return normalizeText(a.title).localeCompare(normalizeText(b.title));
    if (sortMode === "za") return normalizeText(b.title).localeCompare(normalizeText(a.title));
    const ra = a.letterboxdRating ?? a.tmdbRating ?? 0;
    const rb = b.letterboxdRating ?? b.tmdbRating ?? 0;
    if (sortMode === "ratingDesc") return rb - ra;
    if (sortMode === "ratingAsc") return ra - rb;
    return 0;
  });

  const genreOptions = ["Tous", ...[...new Set(movies.flatMap((m) => m.genres || []))].sort((a, b) => a.localeCompare(b))];

  const sortOptions = [
    { key: "az", label: "A → Z" },
    { key: "za", label: "Z → A" },
    { key: "ratingDesc", label: "★ ↓" },
    { key: "ratingAsc", label: "★ ↑" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, maxWidth: 480, margin: "0 auto" }}>
      <Header />
      <div style={{ padding: "0 16px 90px" }}>
        <div style={{ fontFamily: F.mono, fontSize: 11, color: T.accent, letterSpacing: 1 }}>
          BIBLIOTHÈQUE
        </div>
        <div style={{ fontFamily: F.marquee, fontSize: 26, color: T.cream, marginTop: 4, marginBottom: 16 }}>
          Toute ta collection
        </div>

        <input
          placeholder="Rechercher un titre..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%",
            marginBottom: 14,
            background: T.surface,
            border: `1px solid ${T.line}`,
            borderRadius: 6,
            color: T.cream,
            fontFamily: F.serif,
            fontSize: 15,
            padding: "12px 14px",
          }}
        />

        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortMode(opt.key)}
              style={{
                flex: 1,
                padding: "9px 4px",
                background: T.surface,
                border: `1px solid ${sortMode === opt.key ? T.accent : T.line}`,
                borderRadius: 6,
                fontFamily: F.mono,
                fontSize: 10,
                color: sortMode === opt.key ? T.accent : T.muted,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {genreOptions.length > 1 && (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", margin: "0 -16px 16px", padding: "0 16px" }}>
            {genreOptions.map((g) => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                style={{
                  flexShrink: 0,
                  padding: "6px 13px",
                  borderRadius: 20,
                  border: `1px solid ${genre === g ? T.accent : T.line}`,
                  background: genre === g ? T.accent : T.surface,
                  fontFamily: F.mono,
                  fontSize: 10.5,
                  color: genre === g ? "#1A1206" : T.muted,
                  whiteSpace: "nowrap",
                }}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        {sorted.length === 0 ? (
          <div style={{ fontFamily: F.mono, fontSize: 12, color: T.muted }}>
            Aucun film ne correspond à ces critères.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 108px)", gap: 10 }}>
            {sorted.map((m, i) => (
              <CompactCard key={m.tmdbId} movie={m} onOpen={onOpen} colorIndex={i} />
            ))}
          </div>
        )}

        <div style={{ marginTop: 16, fontFamily: F.mono, fontSize: 10, color: T.mutedDim, textAlign: "center" }}>
          {sorted.length} film{sorted.length > 1 ? "s" : ""} affiché{sorted.length > 1 ? "s" : ""} sur {movies.length}
        </div>
      </div>
    </div>
  );
}

function UnmatchedItem({ item, onDeleted, onEdit }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const confirmDelete = async () => {
    setStatus("loading");
    setErrorMsg("");
    const result = await apiWrite("/api/delete-unmatched", {
      title: item.title,
      year: item.year,
      director: item.director,
      updatedAt: item.updatedAt,
    });
    if (!result.ok) {
      setStatus("error");
      setErrorMsg(result.error);
      return;
    }
    onDeleted(item);
  };

  return (
    <div style={{ padding: 12, background: T.surface, border: `1px solid ${T.accentSecondary}`, borderRadius: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <div style={{ fontFamily: F.marquee, fontSize: 16, color: T.cream, lineHeight: 1 }}>
            {item.title}
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: T.muted, marginTop: 4 }}>
            {item.year} · {item.director}
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 10, color: T.accentSecondary, marginTop: 6 }}>
            Introuvable sur TMDB · vérifie le titre / l'année
          </div>
        </div>
        {!showConfirm && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => onEdit(item)}
              style={{
                padding: "6px 10px",
                border: `1px solid ${T.accent}`,
                borderRadius: 6,
                fontFamily: F.mono,
                fontSize: 10,
                color: T.accent,
              }}
            >
              Modifier
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              style={{
                padding: "6px 10px",
                border: `1px solid ${T.accentSecondary}`,
                borderRadius: 6,
                fontFamily: F.mono,
                fontSize: 10,
                color: T.accentSecondary,
              }}
            >
              Supprimer
            </button>
          </div>
        )}
      </div>
      {showConfirm && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                setShowConfirm(false);
                setStatus(null);
              }}
              style={{
                flex: 1,
                padding: "8px 0",
                border: `1px solid ${T.line}`,
                borderRadius: 6,
                fontFamily: F.mono,
                fontSize: 11,
                color: T.muted,
              }}
            >
              Annuler
            </button>
            <button
              onClick={confirmDelete}
              disabled={status === "loading"}
              style={{
                flex: 1,
                padding: "8px 0",
                background: T.accentSecondary,
                borderRadius: 6,
                fontFamily: F.mono,
                fontSize: 11,
                color: T.cream,
                opacity: status === "loading" ? 0.5 : 1,
              }}
            >
              {status === "loading" ? "..." : "Confirmer"}
            </button>
          </div>
          {status === "error" && (
            <div style={{ marginTop: 8, fontFamily: F.mono, fontSize: 10, color: T.accentSecondary }}>
              Erreur : {errorMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryView({ movies, unmatched, onOpen, onEditUnmatched }) {
  const [localUnmatched, setLocalUnmatched] = useState(unmatched || []);

  useEffect(() => {
    setLocalUnmatched(unmatched || []);
  }, [unmatched]);

  const sorted = [...movies]
    .filter((m) => m.updatedAt)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  return (
    <div style={{ minHeight: "100vh", background: T.bg, maxWidth: 480, margin: "0 auto" }}>
      <Header />
      <div style={{ padding: "0 16px 90px" }}>
        <div style={{ fontFamily: F.mono, fontSize: 11, color: T.accent, letterSpacing: 1 }}>
          HISTORIQUE
        </div>
        <div style={{ fontFamily: F.marquee, fontSize: 26, color: T.cream, marginTop: 4, marginBottom: 16 }}>
          Activité récente
        </div>

        {localUnmatched.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: F.mono, fontSize: 11, color: T.accentSecondary, letterSpacing: 1, marginBottom: 10 }}>
              ERREURS ({localUnmatched.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {localUnmatched.map((item, i) => (
                <UnmatchedItem
                  key={item.updatedAt || `${item.title}-${i}`}
                  item={item}
                  onEdit={onEditUnmatched}
                  onDeleted={(deletedItem) => {
                    setLocalUnmatched((prev) => prev.filter((u) => u !== deletedItem));
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {sorted.length === 0 ? (
          <div style={{ fontFamily: F.mono, fontSize: 12, color: T.muted }}>
            Aucune activité récente pour l'instant.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sorted.map((m) => (
              <button
                key={m.tmdbId}
                onClick={() => onOpen(m)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 10,
                  background: T.surface,
                  border: `1px solid ${T.line}`,
                  borderRadius: 8,
                  textAlign: "left",
                }}
              >
                <div style={{ width: 44, height: 66, borderRadius: 4, overflow: "hidden", background: "#000", flexShrink: 0 }}>
                  {m.poster && (
                    <img src={m.poster} alt={m.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: F.marquee, fontSize: 16, color: T.cream, lineHeight: 1 }}>
                    {m.title}
                  </div>
                  <div style={{ fontFamily: F.mono, fontSize: 10, color: T.muted, marginTop: 4 }}>
                    Mis à jour · {formatRelativeDate(m.updatedAt)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsView({ theme, onChangeTheme }) {
  const [enabled, setEnabled] = useState([]);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/get-settings")
      .then((res) => {
        if (!res.ok) throw new Error("Impossible de charger les paramètres");
        return res.json();
      })
      .then((data) => {
        setEnabled(data.enabled || []);
        setNotifyEmail(data.notifyEmail || "");
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const toggle = (key) => {
    setEnabled((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
    setStatus(null);
  };

  const save = async () => {
    setStatus("loading");
    setErrorMsg("");
    const result = await apiWrite("/api/update-settings", { enabled, notifyEmail: notifyEmail.trim() });
    if (!result.ok) {
      setStatus("error");
      setErrorMsg(result.error);
      return;
    }
    setStatus("success");
  };

  const forgetPassword = () => {
    try {
      localStorage.removeItem(PWD_KEY);
    } catch {}
    window.alert("Mot de passe oublié. Il sera redemandé à la prochaine action.");
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, maxWidth: 480, margin: "0 auto" }}>
      <Header />
      <div style={{ padding: "0 16px 90px" }}>
        <div style={{ fontFamily: F.mono, fontSize: 11, color: T.accent, letterSpacing: 1 }}>PARAMÈTRES</div>

        <div style={{ marginTop: 4, marginBottom: 4 }}>
          <SectionTitle>Apparence</SectionTitle>
        </div>
        <p style={{ fontFamily: F.serif, fontSize: 13, color: T.muted, marginBottom: 12 }}>
          Choisis l'ambiance visuelle de l'app.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 28 }}>
          {Object.entries(THEMES).map(([key, def]) => {
            const isActive = theme === key;
            return (
              <button
                key={key}
                onClick={() => onChangeTheme(key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  background: T.surface,
                  border: `${isActive ? 2 : 1}px solid ${isActive ? T.accent : T.line}`,
                  borderRadius: T.radiusSm,
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: def.colors.accent,
                    border: `1px solid ${def.colors.line}`,
                    flexShrink: 0,
                    boxShadow: `0 0 0 3px ${def.colors.bg} inset`,
                  }}
                />
                <span style={{ fontFamily: F.serif, fontSize: 12, color: T.cream }}>{def.label}</span>
              </button>
            );
          })}
        </div>

        <SectionTitle>Mes abonnements</SectionTitle>
        <p style={{ fontFamily: F.serif, fontSize: 13, color: T.muted, marginBottom: 16 }}>
          Active uniquement les plateformes auxquelles tu es abonné. Les autres apparaîtront en "VOD" sur les fiches
          films.
        </p>

        {loading && <div style={{ fontFamily: F.mono, fontSize: 12, color: T.muted }}>Chargement...</div>}
        {error && <div style={{ fontFamily: F.mono, fontSize: 12, color: T.accentSecondary }}>Erreur : {error}</div>}

        {!loading && !error && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {SUBSCRIPTION_OPTIONS.map((opt) => {
                const isOn = enabled.includes(opt.key);
                return (
                  <button
                    key={opt.key}
                    onClick={() => toggle(opt.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      background: T.surface,
                      border: `1px solid ${isOn ? T.accent : T.line}`,
                      borderRadius: 8,
                    }}
                  >
                    <span style={{ fontFamily: F.serif, fontSize: 14, color: T.cream }}>{opt.label}</span>
                    <span
                      style={{
                        width: 40,
                        height: 22,
                        borderRadius: 11,
                        background: isOn ? T.accent : T.line,
                        position: "relative",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: 2,
                          left: isOn ? 20 : 2,
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: T.bg,
                        }}
                      />
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 28 }}>
              <SectionTitle>Notifications</SectionTitle>
              <p style={{ fontFamily: F.serif, fontSize: 13, color: T.muted, marginBottom: 10 }}>
                Reçois un email dès qu'un film de ta liste devient disponible sur l'un de tes abonnements.
              </p>
              <input
                placeholder="ton.email@exemple.com"
                type="email"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                style={{
                  width: "100%",
                  background: T.surface,
                  border: `1px solid ${T.line}`,
                  borderRadius: 6,
                  color: T.cream,
                  fontFamily: F.serif,
                  fontSize: 14,
                  padding: "10px 12px",
                }}
              />
            </div>

            <div style={{ marginTop: 20 }}>
              <button
                onClick={save}
                disabled={status === "loading"}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  background: T.accent,
                  borderRadius: 6,
                  fontFamily: F.mono,
                  fontSize: 13,
                  color: "#1A1206",
                  letterSpacing: 0.5,
                  opacity: status === "loading" ? 0.5 : 1,
                }}
              >
                {status === "loading" ? "ENREGISTREMENT..." : "ENREGISTRER"}
              </button>
              {status === "success" && (
                <div style={{ marginTop: 12, fontFamily: F.mono, fontSize: 12, color: T.accent }}>
                  Paramètres enregistrés !
                </div>
              )}
              {status === "error" && (
                <div style={{ marginTop: 12, fontFamily: F.mono, fontSize: 12, color: T.accentSecondary }}>
                  Erreur : {errorMsg}
                </div>
              )}
            </div>

            <button
              onClick={forgetPassword}
              style={{
                width: "100%",
                marginTop: 24,
                padding: "10px 0",
                border: `1px solid ${T.line}`,
                borderRadius: 6,
                fontFamily: F.mono,
                fontSize: 11,
                color: T.muted,
              }}
            >
              Oublier le mot de passe enregistré sur cet appareil
            </button>
          </>
        )}
      </div>
    </div>
  );
}


function AddView({ onCancel, editingMovie, onSuccess }) {
  const isEditing = Boolean(editingMovie);
  const [title, setTitle] = useState(editingMovie?.title || "");
  const [year, setYear] = useState(editingMovie ? String(editingMovie.year) : "");
  const [director, setDirector] = useState(editingMovie?.director || "");
  const [letterboxdUrl, setLetterboxdUrl] = useState(editingMovie?.letterboxdUrl || "");
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const fieldStyle = {
    background: T.surface,
    border: `1px solid ${T.line}`,
    borderRadius: 6,
    color: T.cream,
    fontFamily: F.serif,
    fontSize: 14,
    padding: "10px 12px",
    width: "100%",
  };

  const canSubmit = title && director && /^\d{4}$/.test(year) && status !== "loading";

  const submit = async () => {
    setStatus("loading");
    setErrorMsg("");
    const result = await apiWrite("/api/add-movie", {
      title,
      year,
      director,
      letterboxdUrl,
      originalTitle: editingMovie?.title,
      originalYear: editingMovie?.year,
      originalTmdbId: editingMovie?.tmdbId,
      originalUpdatedAt: editingMovie?.updatedAt,
    });
    if (!result.ok) {
      setStatus("error");
      setErrorMsg(result.error);
      return;
    }
    setStatus("success");
    setTitle("");
    setYear("");
    setDirector("");
    setLetterboxdUrl("");
    setTimeout(() => onSuccess?.(), 1400);
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, maxWidth: 480, margin: "0 auto" }}>
      <Header onBack={onCancel} />
      <div style={{ padding: "0 16px 60px" }}>
        <div style={{ fontFamily: F.mono, fontSize: 11, color: T.accent, letterSpacing: 1 }}>
          COMMANDE
        </div>
        <div
          style={{
            fontFamily: F.marquee,
            fontSize: 30,
            color: T.cream,
            margin: "4px 0 20px",
          }}
        >
          {isEditing ? "Modifier la fiche" : "Ajouter un film"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input placeholder="Titre *" value={title} onChange={(e) => setTitle(e.target.value)} style={fieldStyle} />
          <input
            placeholder="Année * (ex. 1997)"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            style={fieldStyle}
          />
          <input
            placeholder="Réalisateur *"
            value={director}
            onChange={(e) => setDirector(e.target.value)}
            style={fieldStyle}
          />
          <input
            placeholder="Lien Letterboxd (optionnel)"
            value={letterboxdUrl}
            onChange={(e) => setLetterboxdUrl(e.target.value)}
            style={fieldStyle}
          />
        </div>

        <button
          onClick={submit}
          disabled={!canSubmit}
          style={{
            width: "100%",
            marginTop: 16,
            padding: "12px 0",
            background: T.accent,
            borderRadius: 6,
            fontFamily: F.mono,
            fontSize: 13,
            color: "#1A1206",
            letterSpacing: 0.5,
            opacity: canSubmit ? 1 : 0.5,
          }}
        >
          {status === "loading" ? "ENVOI EN COURS..." : isEditing ? "METTRE À JOUR" : "AJOUTER À LA LISTE"}
        </button>

        {status === "success" && (
          <div style={{ marginTop: 16, fontFamily: F.mono, fontSize: 12, color: T.accent }}>
            {isEditing
              ? "Fiche mise à jour ! Les changements seront visibles d'ici quelques minutes."
              : "Film ajouté ! Il apparaîtra sur l'accueil d'ici quelques minutes, le temps que les infos se récupèrent automatiquement."}
          </div>
        )}
        {status === "error" && (
          <div style={{ marginTop: 16, fontFamily: F.mono, fontSize: 12, color: T.accentSecondary }}>
            Erreur : {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [movies, setMovies] = useState([]);
  const [unmatched, setUnmatched] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("home");
  const [previousView, setPreviousView] = useState("home");
  const [editingMovie, setEditingMovie] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [theme, setTheme] = useState("sombre");
  const [, setThemeTick] = useState(0);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const stored = getStoredTheme_();
    setTheme(stored);
    applyTheme_(stored);
    setThemeTick((n) => n + 1);
  }, []);

  const changeTheme = (name) => {
    setTheme(name);
    applyTheme_(name);
    setThemeTick((n) => n + 1);
  };

  const fetchMovies = () => {
    const moviesPromise = fetch(`/data/enriched.json?t=${Date.now()}`).then((res) => {
      if (!res.ok) throw new Error("fichier introuvable");
      return res.json();
    });
    const unmatchedPromise = fetch(`/data/unmatched.json?t=${Date.now()}`)
      .then((res) => (res.ok ? res.json() : []))
      .catch(() => []);
    return Promise.all([moviesPromise, unmatchedPromise])
      .then(([moviesData, unmatchedData]) => {
        setMovies(moviesData);
        setUnmatched(unmatchedData);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
      });
  };

  useEffect(() => {
    fetchMovies().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [selected, view]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMovies().finally(() => setRefreshing(false));
  };

  if (showIntro) {
    return <RadarIntro ready={!loading} onDone={() => setShowIntro(false)} />;
  }

  if (view === "add") {
    return (
      <AddView
        editingMovie={editingMovie}
        onCancel={() => {
          setEditingMovie(null);
          setView(previousView);
        }}
        onSuccess={() => {
          setEditingMovie(null);
          setView(previousView);
        }}
      />
    );
  }

  if (selected) {
    return (
      <DetailView
        movie={selected}
        onBack={() => setSelected(null)}
        onEdit={(movie) => {
          setEditingMovie(movie);
          setSelected(null);
          setPreviousView(view);
          setView("add");
        }}
        onDeleted={() => setSelected(null)}
      />
    );
  }

  return (
    <>
      {view === "home" && (
        <HomeView
          movies={movies}
          onOpen={setSelected}
          loading={loading}
          error={error}
          onAdd={() => {
            setEditingMovie(null);
            setPreviousView(view);
            setView("add");
          }}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      )}
      {view === "search" && <SearchView movies={movies} onOpen={setSelected} />}
      {view === "library" && <LibraryView movies={movies} onOpen={setSelected} />}
      {view === "history" && (
        <HistoryView
          movies={movies}
          unmatched={unmatched}
          onOpen={setSelected}
          onEditUnmatched={(item) => {
            setEditingMovie({
              title: item.title,
              year: item.year,
              director: item.director,
              letterboxdUrl: item.letterboxdUrl || null,
              updatedAt: item.updatedAt,
            });
            setPreviousView(view);
            setView("add");
          }}
        />
      )}
      {view === "settings" && <SettingsView theme={theme} onChangeTheme={changeTheme} />}
      <BottomNav view={view} onChange={setView} />
    </>
  );
}
