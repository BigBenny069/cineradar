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
      letterboxdWatchlists: {
        benoit: parsed.letterboxdWatchlists?.benoit || "",
        romy: parsed.letterboxdWatchlists?.romy || "",
      },
    };
  } catch (e) {
    console.log("  data/settings.json introuvable ou invalide, utilisation des valeurs par défaut.");
    return { enabled: DEFAULT_ENABLED, notifyEmail: null, letterboxdWatchlists: { benoit: "", romy: "" } };
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
    const availableSinceMap = {};
    for (const m of parsed) {
      map[m.tmdbId] = new Set(m.providers?.abonnement || []);
      if (m.availableSince) availableSinceMap[m.tmdbId] = m.availableSince;
    }
    return { abonnements: map, availableSince: availableSinceMap };
  } catch (e) {
    return { abonnements: {}, availableSince: {} };
  }
}

function loadHistory() {
  try {
    const raw = fs.readFileSync("public/data/history.json", "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

async function findMovie(title, year) {
  const url = `${BASE}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(title)}&year=${year}&language=fr-FR`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results?.[0] || null;
}

// Utilisée pour les titres venus d'une watchlist Letterboxd, où l'année
// n'est pas disponible côté scraping — on prend le résultat le plus
// populaire (tri par défaut de TMDB), qui correspond en pratique presque
// toujours au bon film pour un titre suffisamment précis.
async function findMovieByTitleOnly(title) {
  const url = `${BASE}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(title)}&language=fr-FR`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results?.[0] || null;
}

// ─────────────────────────────────────────────────────────────
// WATCHLISTS LETTERBOXD — scraping "best effort" des pages publiques.
// Comme pour les notes Letterboxd, il n'y a pas d'API officielle : on
// extrait les titres depuis le HTML. Plusieurs motifs de repli sont
// tentés, et un avertissement clair est loggé si rien n'est trouvé (utile
// si Letterboxd change la structure de sa page un jour).
// ─────────────────────────────────────────────────────────────
function decodeHtmlEntities(str) {
  return str
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?34;/g, '"');
}

function extractWatchlistTitles(html) {
  // On retourne des triplets {title, year, slug} — year peut être null si
  // non trouvée. Le texte alt des affiches Letterboxd est généralement au
  // format "Titre (Année)" : on sépare les deux plutôt que de chercher le
  // titre brut sur TMDB avec l'année collée dedans (ce qui fait échouer la
  // recherche à tous les coups). Le "slug" (ex: "dune-1984") est capturé
  // séparément puis recollé par position d'apparition dans la page, pour
  // reconstruire le vrai lien Letterboxd du film (plutôt que de le deviner
  // depuis le titre, ce qui risquerait de tomber sur la mauvaise fiche).
  function splitTitleYear(raw) {
    const m = raw.match(/^(.*)\s\((\d{4})\)$/);
    if (m) return { title: m[1].trim(), year: m[2] };
    return { title: raw.trim(), year: null };
  }

  // Slugs, dans l'ordre d'apparition (ex: /film/dune-1984/ -> "dune-1984")
  const slugs = [];
  let slugRe = /data-target-link="\/film\/([^"\/]+)\/"/g;
  let sm;
  while ((sm = slugRe.exec(html))) slugs.push(sm[1]);

  // Titres (+ année si dispo), dans l'ordre d'apparition — même ordre que
  // les slugs puisque chaque affiche a les deux dans son bloc HTML.
  const rawItems = [];
  function pushRaw(rawTitle, rawYear) {
    const { title, year } = rawYear ? { title: rawTitle.trim(), year: rawYear } : splitTitleYear(rawTitle);
    if (!title || title.length < 2) return;
    rawItems.push({ title, year });
  }

  let re = /data-film-name="([^"]+)"[^>]*data-film-release-year="(\d{4})"/g;
  let m;
  while ((m = re.exec(html))) pushRaw(decodeHtmlEntities(m[1]), m[2]);

  if (rawItems.length === 0) {
    re = /data-film-name="([^"]+)"/g;
    while ((m = re.exec(html))) pushRaw(decodeHtmlEntities(m[1]), null);
  }

  if (rawItems.length === 0) {
    re = /data-item-name="([^"]+)"/g;
    while ((m = re.exec(html))) pushRaw(decodeHtmlEntities(m[1]), null);
  }

  if (rawItems.length === 0) {
    re = /<img[^>]+alt="([^"]+)"[^>]*class="image"/g;
    while ((m = re.exec(html))) {
      const t = decodeHtmlEntities(m[1]);
      if (t && t.length > 1) pushRaw(t, null);
    }
  }

  // Recolle titre/année avec le slug au même index (même ordre d'apparition
  // dans la page). Si les décomptes ne correspondent pas (structure de page
  // inattendue), on garde quand même les titres, juste sans lien direct.
  const items = new Map();
  rawItems.forEach((it, i) => {
    const key = `${it.title}::${it.year || ""}`;
    if (!items.has(key)) {
      items.set(key, { ...it, slug: slugs[i] || null });
    }
  });

  return [...items.values()];
}

async function fetchWatchlistPage(username, page) {
  const url = `https://letterboxd.com/${username}/watchlist/page/${page}/`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });
    if (!res.ok) return { items: [], hasNext: false };
    const html = await res.text();
    const items = extractWatchlistTitles(html);
    const hasNext = html.includes(`/${username}/watchlist/page/${page + 1}/`);
    return { items, hasNext };
  } catch (e) {
    console.log(`  Erreur en lisant la watchlist de ${username} (page ${page}) : ${e.message}`);
    return { items: [], hasNext: false };
  }
}

async function fetchFullWatchlist(username) {
  const all = new Map();
  let page = 1;
  while (page <= 15) {
    const { items, hasNext } = await fetchWatchlistPage(username, page);
    items.forEach((it) => all.set(`${it.title}::${it.year || ""}`, it));
    if (items.length === 0 || !hasNext) break;
    page++;
  }
  if (all.size === 0) {
    console.log(
      `  ⚠️ Aucun film trouvé sur la watchlist de ${username} — soit elle est vide, soit la structure de la page Letterboxd a changé.`
    );
  }
  return [...all.values()];
}

function loadWatchlistDismissed() {
  try {
    const raw = fs.readFileSync("public/data/watchlist-dismissed.json", "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

async function syncWatchlists(inputMovies, history) {
  const watchlists = SETTINGS.letterboxdWatchlists || {};
  const people = Object.entries(watchlists).filter(([, username]) => username && username.trim());
  if (people.length === 0) return { newEntries: [], review: [] };

  const knownTitleYear = new Set(
    inputMovies.map((m) => `${normalize(m.title)}::${m.year}`).concat(history.map((h) => `${normalize(h.title)}::${h.year}`))
  );
  const knownTmdbIds = new Set(
    [...inputMovies.map((m) => m.tmdbId), ...history.map((h) => h.tmdbId)].filter(Boolean).map(String)
  );

  // Mémoire permanente des conflits déjà "Ignorés" via l'app — sans ça, le
  // fichier de file d'attente étant régénéré à chaque passage, un film
  // ignoré réapparaissait à la synchronisation suivante (bug signalé).
  const dismissedKeys = new Set(loadWatchlistDismissed());

  const newEntries = [];
  const review = [];

  for (const [person, username] of people) {
    console.log(`Lecture de la watchlist Letterboxd de ${person} (${username})...`);
    const items = await fetchFullWatchlist(username);
    console.log(`  ${items.length} film(s) trouvé(s) sur la watchlist.`);

    for (const { title, year, slug } of items) {
      // Repli rapide : si le titre normalisé existe déjà tel quel (n'importe
      // quelle année), pas la peine d'interroger TMDB à nouveau.
      const alreadyKnownByTitle = [...knownTitleYear].some((k) => k.startsWith(`${normalize(title)}::`));
      if (alreadyKnownByTitle) continue;

      const found = year ? await findMovie(title, year) : await findMovieByTitleOnly(title);
      if (!found) {
        const key = `title:${normalize(title)}:${person}`;
        if (dismissedKeys.has(key)) continue;
        review.push({
          key,
          title: year ? `${title} (${year})` : title,
          person,
          reason: "introuvable",
          detectedAt: new Date().toISOString(),
        });
        continue;
      }

      if (knownTmdbIds.has(String(found.id))) {
        const key = `tmdb:${found.id}:${person}`;
        if (dismissedKeys.has(key)) continue;
        const inActive = inputMovies.some((m) => String(m.tmdbId) === String(found.id));
        review.push({
          key,
          title: found.title,
          person,
          reason: inActive ? "deja_present" : "deja_recherche",
          detectedAt: new Date().toISOString(),
        });
        continue;
      }

      const newEntry = {
        title: found.title,
        year: found.release_date ? parseInt(found.release_date.slice(0, 4), 10) : null,
        director: "",
        // Priorité au vrai slug capturé sur la page (le plus précis) ; à
        // défaut, letterboxd.com/tmdb/{id} redirige automatiquement vers la
        // bonne fiche — fiable à 100%, contrairement à une estimation basée
        // sur le titre qui pouvait tomber sur un homonyme.
        letterboxdUrl: slug ? `https://letterboxd.com/film/${slug}/` : `https://letterboxd.com/tmdb/${found.id}/`,
        tmdbId: found.id,
        wantedBy: person,
        updatedAt: new Date().toISOString(),
      };
      newEntries.push(newEntry);
      knownTmdbIds.add(String(found.id));
      knownTitleYear.add(`${normalize(newEntry.title)}::${newEntry.year}`);
      console.log(`  + Nouveau film détecté : "${newEntry.title}" (${newEntry.year}) — voulu par ${person}`);
    }
  }

  return { newEntries, review };
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

function buildMovieRowHtml(item) {
  const posterCell = item.poster
    ? `<img src="${item.poster}" width="60" height="90" style="display:block;border-radius:4px;object-fit:cover;" alt="${item.title}" />`
    : `<div style="width:60px;height:90px;background:#241D16;border-radius:4px;"></div>`;

  const letterboxdButton = item.letterboxdUrl
    ? `<a href="${item.letterboxdUrl}" style="display:inline-block;margin-top:10px;padding:6px 12px;border:1px solid #E7A23A;border-radius:4px;font-family:'Courier New',monospace;font-size:10px;color:#E7A23A;text-decoration:none;letter-spacing:0.5px;">VOIR SUR LETTERBOXD →</a>`
    : "";

  return `
    <tr>
      <td style="padding:14px 20px;border-top:1px solid #37301F;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td width="60" valign="top">${posterCell}</td>
            <td style="padding-left:14px;" valign="top">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#F3ECDF;line-height:1.2;">${item.title}</div>
              <div style="font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.5px;color:#E7A23A;margin-top:6px;text-transform:uppercase;">
                Disponible sur ${item.providers.join(", ")}
              </div>
              ${letterboxdButton}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function buildEmailHtml(newlyAvailable) {
  const rows = newlyAvailable.map(buildMovieRowHtml).join("");
  const intro =
    newlyAvailable.length > 1
      ? `${newlyAvailable.length} films sont maintenant disponibles sur tes abonnements :`
      : "Un film est maintenant disponible sur tes abonnements :";

  return `
    <div style="background:#0D0B08;padding:32px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:480px;margin:0 auto;background:#1D1812;border:1px solid #37301F;border-radius:10px;overflow:hidden;">
        <tr>
          <td style="padding:24px 20px 18px;text-align:center;border-bottom:1px solid #37301F;">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;letter-spacing:1px;color:#F3ECDF;">
              CINÉ<span style="color:#E7A23A;">RADAR</span>
            </div>
            <div style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:2px;color:#93877A;margin-top:6px;text-transform:uppercase;">
              Nouvelle disponibilité
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 20px 6px;">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#F3ECDF;">
              ${intro}
            </div>
          </td>
        </tr>
        <tr>
          <td>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              ${rows}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 20px 22px;text-align:center;">
            <div style="font-family:'Courier New',monospace;font-size:10px;color:#5A5148;">
              Envoyé automatiquement par CinéRadar
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;
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
  const textVersion = newlyAvailable
    .map((item) => `${item.title} - disponible sur ${item.providers.join(", ")}`)
    .join("\n");
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
        html: buildEmailHtml(newlyAvailable),
        text: textVersion,
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
  const history = loadHistory();
  const historyIds = new Set(history.map((h) => String(h.tmdbId)));

  // Watchlists Letterboxd : les nouveaux films détectés sont ajoutés à
  // `input` avant la boucle d'enrichissement, pour être traités dans la
  // même passe (affiche, disponibilité, etc. calculés directement).
  const { newEntries: watchlistNewEntries, review: watchlistReview } = await syncWatchlists(input, history);
  input.push(...watchlistNewEntries);

  const newlyAvailable = [];
  const unmatched = [];
  const output = [];

  for (const movie of input) {
    console.log(`Recherche : ${movie.title} (${movie.year})`);
    // Si le tmdbId est déjà connu (film ajouté via recherche en direct ou
    // via une watchlist), on va droit au but au lieu de re-chercher par
    // titre/année — plus fiable, et indispensable si l'année est absente.
    const found = movie.tmdbId ? { id: movie.tmdbId } : await findMovie(movie.title, movie.year);
    if (!found) {
      console.log(`  Introuvable sur TMDB, marqué en erreur.`);
      unmatched.push({
        title: movie.title,
        year: movie.year,
        director: movie.director,
        letterboxdUrl: movie.letterboxdUrl || null,
        updatedAt: movie.updatedAt || null,
      });
      continue;
    }
    const details = await getDetails(found.id);

    // Mémorise le tmdbId dès la première synchronisation (pas seulement à
    // l'édition) : ça fiabilise tout futur matching (édition, suppression)
    // même si le titre/année saisis à l'origine diffèrent légèrement de
    // ceux que TMDB renvoie — évite les fiches en double.
    if (String(movie.tmdbId) !== String(details.id)) {
      movie.tmdbId = details.id;
    }

    // Historique permanent : mémorise ce film comme "déjà recherché" une
    // bonne fois pour toutes, même s'il est supprimé de la bibliothèque
    // plus tard — sert à prévenir les doublons (ajout manuel ou watchlist).
    if (!historyIds.has(String(details.id))) {
      historyIds.add(String(details.id));
      history.push({
        title: details.title,
        year: details.release_date?.slice(0, 4) || movie.year,
        tmdbId: details.id,
        addedAt: movie.updatedAt || new Date().toISOString(),
      });
    }

    const director = details.credits?.crew?.find((c) => c.job === "Director");
    const cast = (details.credits?.cast || []).slice(0, 5).map((c) => c.name);
    const fr = details["watch/providers"]?.results?.FR;
    const providers = splitProviders(fr);
    const posterUrl = details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null;

    const prevSet = previousAbonnements.abonnements[details.id] || new Set();
    const newProviders = providers.abonnement.filter((p) => !prevSet.has(p));
    if (newProviders.length > 0) {
      newlyAvailable.push({
        title: details.title,
        providers: newProviders,
        poster: posterUrl,
        letterboxdUrl: movie.letterboxdUrl || null,
      });
    }

    // Date à laquelle le film est devenu disponible sur un abonnement : ne change
    // que si un nouveau fournisseur vient d'apparaître, sinon on garde la valeur
    // précédente (pour ne pas faire "remonter" un film déjà disponible depuis longtemps).
    let availableSinceValue = null;
    if (providers.abonnement.length > 0) {
      const previousValue = previousAbonnements.availableSince[details.id];
      availableSinceValue = newProviders.length > 0 || !previousValue ? new Date().toISOString() : previousValue;
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
      poster: posterUrl,
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
      availableSince: availableSinceValue,
      wantedBy: movie.wantedBy || null,
      updatedAt: movie.updatedAt || null,
      lastChecked: new Date().toISOString(),
    });
  }

  fs.mkdirSync(path.dirname("public/data/enriched.json"), { recursive: true });
  fs.writeFileSync("public/data/enriched.json", JSON.stringify(output, null, 2));
  fs.writeFileSync("public/data/unmatched.json", JSON.stringify(unmatched, null, 2));
  fs.writeFileSync("public/data/history.json", JSON.stringify(history, null, 2));
  fs.writeFileSync("public/data/watchlist-review.json", JSON.stringify(watchlistReview, null, 2));
  // Réécrit data/movies.json avec les tmdbId mémorisés au passage (voir plus
  // haut) — sans effet si rien n'a changé, le workflow ne commitera rien.
  fs.writeFileSync("data/movies.json", JSON.stringify(input, null, 2) + "\n");
  console.log(
    `Terminé : ${output.length} film(s) mis à jour, ${unmatched.length} en erreur, ${watchlistNewEntries.length} ajouté(s) via watchlist, ${watchlistReview.length} à vérifier.`
  );

  if (newlyAvailable.length > 0) {
    console.log(`${newlyAvailable.length} film(s) nouvellement disponible(s), envoi de la notification...`);
    await sendNotificationEmail(newlyAvailable, SETTINGS.notifyEmail);
  } else {
    console.log("Aucune nouvelle disponibilité à notifier.");
  }
}

main();
