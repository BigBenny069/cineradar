const fs = require("fs");
const path = require("path");

const API_KEY = process.env.TMDB_API_KEY;
const BASE = "https://api.themoviedb.org/3";

// Table de correspondance entre les clés utilisées dans data/settings.json (pilotées
// depuis l'écran Paramètres de l'app) et les noms de fournisseurs tels que TMDB les renvoie.
// Si un film affiche un mauvais fournisseur, ajoute son nom exact dans le tableau correspondant.
const CANONICAL_SUBSCRIPTIONS = {
  netflix: ["Netflix"],
  prime: ["Amazon Prime Video", "Prime Video"],
  disney: ["Disney Plus", "Disney+"],
  canal: ["Canal+"],
  canalseries: ["Canal+ Séries"],
  appletv: ["Apple TV+", "Apple TV Plus"],
  paramount: ["Paramount Plus", "Paramount+"],
  ocs: ["OCS", "Cine+ OCS", "Ciné+ OCS"],
  max: ["Max", "HBO Max"],
};

// Valeurs par défaut utilisées si data/settings.json est absent ou illisible.
const DEFAULT_ENABLED = ["netflix", "prime", "disney", "canal", "canalseries", "appletv", "paramount", "ocs"];

function loadSettings() {
  try {
    const raw = fs.readFileSync("data/settings.json", "utf-8");
    const parsed = JSON.parse(raw);
    return {
      enabled: Array.isArray(parsed.enabled) ? parsed.enabled : DEFAULT_ENABLED,
      notifyEmail: parsed.notifyEmail || null,
    };
  } catch (e) {
    console.log("  data/settings.json introuvable ou invalide, utilisation des valeurs par défaut.");
    return { enabled: DEFAULT_ENABLED, notifyEmail: null };
  }
}

const SETTINGS = loadSettings();
const ENABLED_KEYS = SETTINGS.enabled;
const MY_SUBSCRIPTIONS = ENABLED_KEYS.flatMap((key) => CANONICAL_SUBSCRIPTIONS[key] || []);

function normalize(str) {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const NORMALIZED_SUBSCRIPTIONS = MY_SUBSCRIPTIONS.map(normalize);

function isMySubscription(providerName) {
  const n = normalize(providerName);
  return NORMALIZED_SUBSCRIPTIONS.some((sub) => n === sub || n.includes(sub) || sub.includes(n));
}

function loadPreviousAbonnements() {
  try {
    const raw = fs.readFileSync("public/data/enriched.json", "utf-8");
    const parsed = JSON.parse(raw);
    const map = {};
    for (const m of parsed) {
      map[m.tmdbId] = new Set(m.providers?.abonnement || []);
    }
    return map;
  } catch (e) {
    return {};
  }
}

async function findMovie(title, year) {
  const url = `${BASE}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(title)}&year=${year}&language=fr-FR`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results?.[0] || null;
}

async function getDetails(id) {
  const url = `${BASE}/movie/${id}?api_key=${API_KEY}&language=fr-FR&append_to_response=credits,watch/providers`;
  const res = await fetch(url);
  return res.json();
}

function splitProviders(fr) {
  const allFlatrate = (fr?.flatrate || []).map((p) => p.provider_name);

  // Seuls tes abonnements réels (activés dans Paramètres) sont classés en "abonnement"
  const abonnement = allFlatrate.filter((name) => isMySubscription(name));

  // Le reste (location/achat, + les abonnements TMDB que tu n'as pas activés) va en "vod"
  const flatrateNonAbonnes = allFlatrate.filter((name) => !isMySubscription(name));
  const vod = [...flatrateNonAbonnes, ...(fr?.rent || []), ...(fr?.buy || [])].map((p) =>
    typeof p === "string" ? p : p.provider_name
  );

  return {
    abonnement: [...new Set(abonnement)],
    vod: [...new Set(vod)],
  };
}

async function getLetterboxdRating(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });
    if (!res.ok) return { rating: null, votes: null };
    const html = await res.text();

    const ldJsonMatch = html.match(/"ratingValue"\s*:\s*"?([\d.]+)"?[\s\S]{0,200}?"ratingCount"\s*:\s*"?([\d,]+)"?/);
    if (ldJsonMatch) {
      const rating = parseFloat(ldJsonMatch[1]);
      const votes = parseInt(ldJsonMatch[2].replace(/,/g, ""), 10);
      if (!isNaN(rating) && !isNaN(votes)) {
        return { rating, votes };
      }
    }

    const tooltipMatch = html.match(/Weighted average of ([\d.]+) based on ([\d,]+)\s*ratings?/i);
    if (tooltipMatch) {
      const rating = parseFloat(tooltipMatch[1]);
      const votes = parseInt(tooltipMatch[2].replace(/,/g, ""), 10);
      if (!isNaN(rating) && !isNaN(votes)) {
        return { rating, votes };
      }
    }

    const metaMatch = html.match(/name="twitter:data2" content="([\d.]+) out of 5"/);
    if (metaMatch) {
      const rating = parseFloat(metaMatch[1]);
      if (!isNaN(rating)) {
        return { rating, votes: null };
      }
    }

    return { rating: null, votes: null };
  } catch (e) {
    console.log(`  Letterboxd indisponible (${e.message})`);
    return { rating: null, votes: null };
  }
}

async function sendNotificationEmail(newlyAvailable, notifyEmail) {
  if (!notifyEmail) {
    console.log("Aucune adresse email configurée dans Paramètres, notification ignorée.");
    return;
  }
  if (!process.env.RESEND_API_KEY) {
    console.log("RESEND_API_KEY absent, impossible d'envoyer l'email.");
    return;
  }
  const listHtml = newlyAvailable
    .map((item) => `<li><strong>${item.title}</strong> est maintenant disponible sur ${item.providers.join(", ")}</li>`)
    .join("");
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CinéRadar <onboarding@resend.dev>",
        to: [notifyEmail],
        subject: `CinéRadar : ${newlyAvailable.length} film(s) disponible(s) sur vos abonnements`,
        html: `<h2>Bonne nouvelle !</h2><ul>${listHtml}</ul>`,
      }),
    });
    if (!res.ok) {
      const details = await res.text();
      console.log(`Erreur d'envoi d'email (${res.status}) : ${details}`);
      return;
    }
    console.log(`Email envoyé à ${notifyEmail} (${newlyAvailable.length} film(s)).`);
  } catch (e) {
    console.log(`Erreur d'envoi d'email : ${e.message}`);
  }
}

async function main() {
  const input = JSON.parse(fs.readFileSync("data/movies.json", "utf-8"));
  const previousAbonnements = loadPreviousAbonnements();
  const newlyAvailable = [];
  const output = [];

  for (const movie of input) {
    console.log(`Recherche : ${movie.title} (${movie.year})`);
    const found = await findMovie(movie.title, movie.year);
    if (!found) {
      console.log(`  Introuvable sur TMDB, ignoré.`);
      continue;
    }
    const details = await getDetails(found.id);
    const director = details.credits?.crew?.find((c) => c.job === "Director");
    const cast = (details.credits?.cast || []).slice(0, 5).map((c) => c.name);
    const fr = details["watch/providers"]?.results?.FR;
    const providers = splitProviders(fr);

    const prevSet = previousAbonnements[details.id] || new Set();
    const newProviders = providers.abonnement.filter((p) => !prevSet.has(p));
    if (newProviders.length > 0) {
      newlyAvailable.push({ title: details.title, providers: newProviders });
    }

    let letterboxdRating = null;
    let letterboxdVotes = null;
    if (movie.letterboxdUrl) {
      console.log(`  Récupération de la note Letterboxd...`);
      const lb = await getLetterboxdRating(movie.letterboxdUrl);
      letterboxdRating = lb.rating;
      letterboxdVotes = lb.votes;
    }

    output.push({
      tmdbId: details.id,
      title: details.title,
      year: details.release_date?.slice(0, 4),
      director: director?.name || movie.director,
      poster: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
      synopsis: details.overview,
      genres: (details.genres || []).map((g) => g.name),
      cast,
      tmdbRating: details.vote_average,
      tmdbVotes: details.vote_count,
      letterboxdRating,
      letterboxdVotes,
      imdbId: details.imdb_id,
      letterboxdUrl: movie.letterboxdUrl || null,
      providers,
      updatedAt: movie.updatedAt || null,
      lastChecked: new Date().toISOString(),
    });
  }

  fs.mkdirSync(path.dirname("public/data/enriched.json"), { recursive: true });
  fs.writeFileSync("public/data/enriched.json", JSON.stringify(output, null, 2));
  console.log(`Terminé : ${output.length} film(s) mis à jour.`);

  if (newlyAvailable.length > 0) {
    console.log(`${newlyAvailable.length} film(s) nouvellement disponible(s), envoi de la notification...`);
    await sendNotificationEmail(newlyAvailable, SETTINGS.notifyEmail);
  } else {
    console.log("Aucune nouvelle disponibilité à notifier.");
  }
}

main();
