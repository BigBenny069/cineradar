function normalize(str) {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// ─────────────────────────────────────────────────────────────
// Même table de correspondance que scripts/update.cjs — à garder synchro
// si l'une des deux est modifiée (ex: ajout d'un nouveau service).
// ─────────────────────────────────────────────────────────────
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
const DEFAULT_ENABLED = ["netflix", "prime", "disney", "canal", "canalseries", "appletv", "paramount", "ocs"];

async function githubGet(apiUrl, token) {
  const res = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (res.status === 404) return { content: null, sha: null, notFound: true };
  if (!res.ok) throw new Error(`Lecture impossible (${res.status})`);
  const fileData = await res.json();
  const content = Buffer.from(fileData.content, "base64").toString("utf-8");
  return { content: JSON.parse(content), sha: fileData.sha };
}

async function githubPut(apiUrl, token, data, sha, message) {
  const body = { message, content: Buffer.from(JSON.stringify(data, null, 2), "utf-8").toString("base64") };
  if (sha) body.sha = sha;
  const res = await fetch(apiUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const details = await res.text();
    throw new Error(`Écriture impossible (${res.status}) : ${details}`);
  }
}

async function findMovieOnTmdb(title, year, apiKey) {
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(title)}&year=${year}&language=fr-FR`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results?.[0] || null;
}

// Enrichissement "instantané" au moment de l'ajout — reprend exactement la
// même logique que scripts/update.cjs pour l'affiche, le synopsis, le
// casting et les plateformes, afin que le film soit immédiatement complet
// dans l'app plutôt que d'attendre le prochain passage du robot (30 à 90s).
// La note Letterboxd (scraping plus lent) reste laissée à ce passage-là.
// Met aussi à jour public/data/history.json (mémoire permanente utilisée
// pour éviter les doublons, y compris via les watchlists Letterboxd) — sans
// ça, un film ajouté puis supprimé avant le premier passage du robot
// n'aurait jamais laissé de trace et pourrait être réintroduit plus tard
// comme s'il était neuf.
async function quickEnrich({ tmdbId, movieEntry, repo, token }) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return; // pas grave, le robot GitHub Actions prendra le relais

  let effectiveTmdbId = tmdbId;
  if (!effectiveTmdbId) {
    const found = await findMovieOnTmdb(movieEntry.title, movieEntry.year, apiKey);
    if (!found) return; // le robot réessaiera plus tard
    effectiveTmdbId = found.id;
  }

  const detailsUrl = `https://api.themoviedb.org/3/movie/${effectiveTmdbId}?api_key=${apiKey}&language=fr-FR&append_to_response=credits,watch/providers`;
  const detailsRes = await fetch(detailsUrl);
  if (!detailsRes.ok) return;
  const details = await detailsRes.json();

  const settingsUrl = `https://api.github.com/repos/${repo}/contents/data/settings.json`;
  let enabledKeys = DEFAULT_ENABLED;
  try {
    const { content } = await githubGet(settingsUrl, token);
    if (content?.enabled) enabledKeys = content.enabled;
  } catch {}
  const mySubscriptions = enabledKeys.flatMap((key) => CANONICAL_SUBSCRIPTIONS[key] || []).map(normalize);
  const isMySubscription = (name) => {
    const n = normalize(name);
    return mySubscriptions.some((sub) => n === sub || n.includes(sub) || sub.includes(n));
  };

  const fr = details["watch/providers"]?.results?.FR;
  const allFlatrate = (fr?.flatrate || []).map((p) => p.provider_name);
  const abonnement = [...new Set(allFlatrate.filter(isMySubscription))];
  const vod = [
    ...new Set(
      [...allFlatrate.filter((n) => !isMySubscription(n)), ...(fr?.rent || []), ...(fr?.buy || [])].map((p) =>
        typeof p === "string" ? p : p.provider_name
      )
    ),
  ];

  const director = details.credits?.crew?.find((c) => c.job === "Director");
  const cast = (details.credits?.cast || []).slice(0, 5).map((c) => c.name);
  const posterUrl = details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null;

  const enrichedUrl = `https://api.github.com/repos/${repo}/contents/public/data/enriched.json`;
  const { content: enrichedList, sha: enrichedSha } = await githubGet(enrichedUrl, token);
  const list = enrichedList || [];
  const existingIndex = list.findIndex((m) => String(m.tmdbId) === String(effectiveTmdbId));
  const existing = existingIndex >= 0 ? list[existingIndex] : null;

  const newEntry = {
    tmdbId: effectiveTmdbId,
    title: details.title,
    year: details.release_date?.slice(0, 4),
    director: director?.name || movieEntry.director,
    poster: posterUrl,
    synopsis: details.overview,
    genres: (details.genres || []).map((g) => g.name),
    cast,
    tmdbRating: details.vote_average,
    tmdbVotes: details.vote_count,
    // Note Letterboxd laissée au prochain passage du robot (scraping plus
    // lent) — on garde la précédente si elle existe déjà (cas d'une
    // modification), sinon null en attendant.
    letterboxdRating: existing?.letterboxdRating ?? null,
    letterboxdVotes: existing?.letterboxdVotes ?? null,
    imdbId: details.imdb_id,
    letterboxdUrl: movieEntry.letterboxdUrl || null,
    providers: { abonnement, vod },
    availableSince: abonnement.length > 0 ? existing?.availableSince || new Date().toISOString() : null,
    wantedBy: movieEntry.wantedBy || existing?.wantedBy || null,
    updatedAt: movieEntry.updatedAt,
    lastChecked: new Date().toISOString(),
  };

  const newList = [...list];
  if (existingIndex >= 0) newList[existingIndex] = newEntry;
  else newList.push(newEntry);

  await githubPut(enrichedUrl, token, newList, enrichedSha, `Enrichissement instantané de "${details.title}"`);

  // Mémoire permanente — même logique que scripts/update.cjs : on
  // n'ajoute le film que s'il n'y figure pas déjà (par tmdbId).
  try {
    const historyUrl = `https://api.github.com/repos/${repo}/contents/public/data/history.json`;
    const { content: historyList, sha: historySha } = await githubGet(historyUrl, token);
    const history = historyList || [];
    const alreadyThere = history.some((h) => String(h.tmdbId) === String(effectiveTmdbId));
    if (!alreadyThere) {
      const newHistory = [
        ...history,
        {
          title: details.title,
          year: details.release_date?.slice(0, 4) || movieEntry.year,
          tmdbId: effectiveTmdbId,
          addedAt: movieEntry.updatedAt,
        },
      ];
      await githubPut(historyUrl, token, newHistory, historySha, `Mémoire permanente : "${details.title}"`);
    }
  } catch (e) {
    console.log("Mise à jour de history.json échouée (pas grave) :", e.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  const {
    title,
    year,
    director,
    letterboxdUrl,
    password,
    originalTitle,
    originalYear,
    originalTmdbId,
    originalUpdatedAt,
    confirmedTmdbId,
  } = req.body || {};
  if (password !== process.env.ADD_MOVIE_PASSWORD) {
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }
  if (!title || !director || !/^\d{4}$/.test(String(year))) {
    return res.status(400).json({ error: "Titre, réalisateur et une année à 4 chiffres sont obligatoires" });
  }
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  const filePath = "data/movies.json";
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
      return res.status(500).json({ error: `Impossible de lire movies.json (${getRes.status})`, details });
    }
    const fileData = await getRes.json();
    const currentContent = Buffer.from(fileData.content, "base64").toString("utf-8");
    const movies = JSON.parse(currentContent);

    let matchIndex = -1;

    // Priorité absolue : l'horodatage unique posé à chaque ajout/modif (fiable même
    // pour les fiches jamais retrouvées sur TMDB, qui n'ont pas encore de tmdbId)
    if (originalUpdatedAt) {
      matchIndex = movies.findIndex((m) => m.updatedAt === originalUpdatedAt);
    }

    // Repli : matching par tmdbId (fiable et stable pour les fiches déjà enrichies)
    if (matchIndex === -1 && originalTmdbId) {
      matchIndex = movies.findIndex((m) => String(m.tmdbId) === String(originalTmdbId));
    }

    // Filet de sécurité : si le film choisi via la recherche TMDB en direct
    // correspond déjà à une fiche existante (même tmdbId), on la met à jour
    // au lieu de créer un vrai doublon — un tmdbId identique, c'est toujours
    // exactement le même film.
    if (matchIndex === -1 && confirmedTmdbId) {
      matchIndex = movies.findIndex((m) => String(m.tmdbId) === String(confirmedTmdbId));
    }

    // Dernier repli : titre + année, normalisés (sans accents, casse ignorée)
    if (matchIndex === -1 && originalTitle && originalYear) {
      matchIndex = movies.findIndex(
        (m) => normalize(m.title) === normalize(originalTitle) && String(m.year) === String(originalYear)
      );
    }

    const newEntry = {
      title: title.trim(),
      year: parseInt(year, 10),
      director: director.trim(),
      letterboxdUrl: letterboxdUrl?.trim() || null,
      updatedAt: new Date().toISOString(),
    };

    // On conserve le tmdbId connu pour fiabiliser les futures modifications
    if (originalTmdbId) {
      newEntry.tmdbId = originalTmdbId;
    } else if (matchIndex >= 0 && movies[matchIndex].tmdbId) {
      newEntry.tmdbId = movies[matchIndex].tmdbId;
    } else if (confirmedTmdbId) {
      newEntry.tmdbId = confirmedTmdbId;
    }

    // wantedBy peut déjà exister sur la fiche modifiée (film venu d'une
    // watchlist) — on le conserve pour l'enrichissement instantané plus bas.
    if (matchIndex >= 0 && movies[matchIndex].wantedBy) {
      newEntry.wantedBy = movies[matchIndex].wantedBy;
    }

    let commitMessage;
    if (matchIndex >= 0) {
      movies[matchIndex] = newEntry;
      commitMessage = `Modification de "${title}" via l'app`;
    } else {
      movies.push(newEntry);
      commitMessage = `Ajout de "${title}" via l'app`;
    }

    const newContentBase64 = Buffer.from(JSON.stringify(movies, null, 2), "utf-8").toString("base64");
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({
        message: commitMessage,
        content: newContentBase64,
        sha: fileData.sha,
      }),
    });
    if (!putRes.ok) {
      const details = await putRes.text();
      return res.status(500).json({ error: `Impossible d'enregistrer (${putRes.status})`, details });
    }

    // Enrichissement instantané — best effort : si ça échoue pour une
    // raison ou une autre, ce n'est pas grave, le film est déjà bien
    // enregistré ci-dessus et le robot GitHub Actions le complètera à son
    // prochain passage, comme avant cette amélioration.
    try {
      await quickEnrich({ tmdbId: newEntry.tmdbId, movieEntry: newEntry, repo, token });
    } catch (e) {
      console.log("Enrichissement instantané échoué (pas grave) :", e.message);
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
