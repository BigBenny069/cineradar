import { describe, it, expect } from "vitest";
import { normalizeText, toPosterSize, getPlatformSearchUrl, mapToCinemaisonPlatform, formatRelativeDate, getInitialView, looksLikeLetterboxdLink, pickBestTmdbMatch, filterMoviesByTitle, describeLetterboxdSource, applyPendingChanges, getWatchmodeBadge, describeWatchmodeMismatch, isReportedUnavailable, splitHomeSections } from "./App.jsx";

describe("normalizeText", () => {
  it("retire les accents, met en minuscule, retire les espaces superflus", () => {
    expect(normalizeText("  Ça Va ?  ")).toBe("ca va ?");
  });
  it("gère les valeurs vides sans planter", () => {
    expect(normalizeText(null)).toBe("");
    expect(normalizeText(undefined)).toBe("");
  });
});

describe("toPosterSize", () => {
  it("remplace w500 par la taille demandée", () => {
    expect(toPosterSize("https://image.tmdb.org/t/p/w500/abc.jpg", "w185")).toBe(
      "https://image.tmdb.org/t/p/w185/abc.jpg"
    );
  });
  it("laisse passer une valeur vide sans planter", () => {
    expect(toPosterSize(null, "w185")).toBe(null);
    expect(toPosterSize(undefined, "w185")).toBe(undefined);
  });
});

describe("getPlatformSearchUrl", () => {
  it("route les chaînes 'X Amazon Channel' (quel que soit X) vers l'appli Prime Video", () => {
    const url = getPlatformSearchUrl("Insomnia Amazon Channel", "Bone Tomahawk", 2015);
    expect(url).toContain("app.primevideo.com");
    expect(url).toContain("Bone%20Tomahawk");
  });
  it("route Canal+ vers myCANAL", () => {
    expect(getPlatformSearchUrl("Canal+", "Titre", 2020)).toContain("canalplus.com");
  });
  it("route Insomnia seul (sans 'Amazon Channel') vers myCANAL, pas Prime Video", () => {
    expect(getPlatformSearchUrl("Insomnia", "Titre", 2020)).toContain("canalplus.com");
  });
  it("retombe sur une recherche Google pour une plateforme inconnue", () => {
    expect(getPlatformSearchUrl("SFR Play", "Titre", 2020)).toContain("google.com/search");
  });
});

describe("mapToCinemaisonPlatform", () => {
  it("mappe les variantes du bouquet Canal+ vers 'Canal+'", () => {
    expect(mapToCinemaisonPlatform("Cine+ OCS Amazon Channel")).toBe("Canal+");
    expect(mapToCinemaisonPlatform("Apple TV Plus")).toBe("Canal+");
  });
  it("mappe Netflix/Disney+/Prime Video vers eux-mêmes", () => {
    expect(mapToCinemaisonPlatform("Netflix")).toBe("Netflix");
    expect(mapToCinemaisonPlatform("Disney Plus")).toBe("Disney+");
    expect(mapToCinemaisonPlatform("Amazon Prime Video")).toBe("Prime Video");
  });
  it("mappe Shadowz (et Shadowz Amazon Channel) vers 'Shadowz', pas Prime Video", () => {
    expect(mapToCinemaisonPlatform("Shadowz")).toBe("Shadowz");
    expect(mapToCinemaisonPlatform("Shadowz Amazon Channel")).toBe("Shadowz");
  });
  it("mappe Paramount+ (et Paramount Plus Amazon Channel) vers 'Paramount+', plus vers Canal+", () => {
    expect(mapToCinemaisonPlatform("Paramount Plus")).toBe("Paramount+");
    expect(mapToCinemaisonPlatform("Paramount+")).toBe("Paramount+");
    expect(mapToCinemaisonPlatform("Paramount Plus Amazon Channel")).toBe("Paramount+");
  });
  it("retourne null pour une plateforme non transférable vers CinéMaison", () => {
    expect(mapToCinemaisonPlatform("Google Play Movies")).toBe(null);
  });
});

describe("formatRelativeDate", () => {
  it("retourne 'Date inconnue' si rien n'est fourni", () => {
    expect(formatRelativeDate(null)).toBe("Date inconnue");
  });
  it("reconnaît une date d'aujourd'hui", () => {
    const now = new Date().toISOString();
    expect(formatRelativeDate(now)).toContain("Aujourd'hui");
  });
});

describe("getInitialView", () => {
  it("ouvre l'écran demandé par un raccourci connu", () => {
    expect(getInitialView("?view=add")).toBe("add");
    expect(getInitialView("?view=search")).toBe("search");
    expect(getInitialView("?view=history")).toBe("history");
  });
  it("retombe sur l'accueil pour une valeur inconnue, absente ou vide", () => {
    expect(getInitialView("?view=settings")).toBe("home");
    expect(getInitialView("?view=<script>")).toBe("home");
    expect(getInitialView("")).toBe("home");
    expect(getInitialView(undefined)).toBe("home");
  });
});

describe("looksLikeLetterboxdLink", () => {
  it("reconnaît les liens courts et complets, seuls ou dans un texte", () => {
    expect(looksLikeLetterboxdLink("https://boxd.it/RTVm")).toBe(true);
    expect(looksLikeLetterboxdLink("boxd.it/RTVm")).toBe(true);
    expect(looksLikeLetterboxdLink("Clayface https://letterboxd.com/film/clayface/")).toBe(true);
  });
  it("refuse le reste", () => {
    expect(looksLikeLetterboxdLink("https://exemple.com/film/clayface")).toBe(false);
    expect(looksLikeLetterboxdLink("Clayface")).toBe(false);
    expect(looksLikeLetterboxdLink("")).toBe(false);
    expect(looksLikeLetterboxdLink(null)).toBe(false);
  });
});

describe("pickBestTmdbMatch", () => {
  const results = [
    { tmdbId: 1, title: "Dune", year: "1984" },
    { tmdbId: 2, title: "Dune", year: "2021" },
    { tmdbId: 3, title: "Dune : Deuxième partie", year: "2024" },
  ];
  it("choisit le film au titre et à l'année identiques parmi des homonymes", () => {
    expect(pickBestTmdbMatch(results, "Dune", 2021).tmdbId).toBe(2);
    expect(pickBestTmdbMatch(results, "dune", 1984).tmdbId).toBe(1);
  });
  it("accepte un an d'écart quand un seul film correspond", () => {
    expect(pickBestTmdbMatch([{ tmdbId: 9, title: "Climax", year: "2018" }], "Climax", 2019).tmdbId).toBe(9);
  });
  it("renvoie null en cas de doute plutôt que de se tromper de film", () => {
    expect(pickBestTmdbMatch(results, "Dune", 2000)).toBe(null);
    expect(pickBestTmdbMatch(results, "Dune", null)).toBe(null);
    expect(pickBestTmdbMatch(results, "Inconnu", 2021)).toBe(null);
    expect(pickBestTmdbMatch([], "Dune", 2021)).toBe(null);
  });
});

describe("filterMoviesByTitle", () => {
  const movies = [
    { tmdbId: 1, title: "Le Retour des morts-vivants 3" },
    { tmdbId: 2, title: "L'Évadé d'Alcatraz" },
    { tmdbId: 3, title: "La Nuit des morts-vivants" },
    { tmdbId: 4, title: "Dune" },
    { tmdbId: 5, title: "Dune : Deuxième partie" },
  ];
  it("ignore les accents et la casse", () => {
    expect(filterMoviesByTitle(movies, "evade").map((m) => m.tmdbId)).toEqual([2]);
    expect(filterMoviesByTitle(movies, "ÉVADÉ").map((m) => m.tmdbId)).toEqual([2]);
  });
  it("accepte plusieurs mots dans n'importe quel ordre", () => {
    expect(filterMoviesByTitle(movies, "morts retour").map((m) => m.tmdbId)).toEqual([1]);
    expect(filterMoviesByTitle(movies, "morts").map((m) => m.tmdbId)).toEqual([3, 1]);
  });
  it("met en premier les titres qui commencent par la recherche", () => {
    expect(filterMoviesByTitle(movies, "dune").map((m) => m.tmdbId)).toEqual([4, 5]);
    expect(filterMoviesByTitle([{ tmdbId: 8, title: "Avant Dune" }, ...movies], "dune").map((m) => m.tmdbId)).toEqual([4, 5, 8]);
  });
  it("renvoie une liste vide pour une recherche vide ou sans résultat", () => {
    expect(filterMoviesByTitle(movies, "")).toEqual([]);
    expect(filterMoviesByTitle(movies, "   ")).toEqual([]);
    expect(filterMoviesByTitle(movies, "zzz")).toEqual([]);
    expect(filterMoviesByTitle(undefined, "dune")).toEqual([]);
  });
});

describe("describeLetterboxdSource", () => {
  it("indique si la page Letterboxd a été lue", () => {
    expect(describeLetterboxdSource("page")).toContain("page Letterboxd lue");
  });
  it("indique le repli sur le titre déduit du lien", () => {
    expect(describeLetterboxdSource("slug")).toContain("déduit du lien");
  });
  it("indique l'identifiant TMDB direct", () => {
    expect(describeLetterboxdSource("tmdb")).toContain("TMDB");
  });
  it("renvoie une chaîne vide si la source est inconnue", () => {
    expect(describeLetterboxdSource(undefined)).toBe("");
  });
});

describe("applyPendingChanges", () => {
  const now = 1_000_000;
  const list = [
    { tmdbId: 1, title: "A", updatedAt: "2026-01-01T00:00:00Z" },
    { tmdbId: 2, title: "B", updatedAt: "2026-01-01T00:00:00Z" },
  ];

  it("ne change rien sans changement récent", () => {
    expect(applyPendingChanges(list, [], now)).toBe(list);
    expect(applyPendingChanges(list, undefined, now)).toBe(list);
  });

  it("retire une fiche supprimée que le site affiche encore", () => {
    const out = applyPendingChanges(list, [{ type: "removed", tmdbId: 1, until: now + 1000 }], now);
    expect(out.map((m) => m.tmdbId)).toEqual([2]);
  });

  it("ajoute une fiche que le site ne contient pas encore", () => {
    const movie = { tmdbId: 3, title: "C", updatedAt: "2026-02-01T00:00:00Z" };
    const out = applyPendingChanges(list, [{ type: "upserted", tmdbId: 3, movie, until: now + 1000 }], now);
    expect(out.map((m) => m.tmdbId)).toEqual([1, 2, 3]);
  });

  it("remplace une fiche modifiée si la version du site est plus ancienne", () => {
    const movie = { tmdbId: 2, title: "B modifié", updatedAt: "2026-03-01T00:00:00Z" };
    const out = applyPendingChanges(list, [{ type: "upserted", tmdbId: 2, movie, until: now + 1000 }], now);
    expect(out.find((m) => m.tmdbId === 2).title).toBe("B modifié");
  });

  it("garde la version du site quand elle est aussi récente (vraies données à jour)", () => {
    const movie = { tmdbId: 2, title: "B provisoire", updatedAt: "2026-01-01T00:00:00Z" };
    const out = applyPendingChanges(list, [{ type: "upserted", tmdbId: 2, movie, until: now + 1000 }], now);
    expect(out.find((m) => m.tmdbId === 2).title).toBe("B");
  });

  it("ignore un changement expiré", () => {
    const out = applyPendingChanges(list, [{ type: "removed", tmdbId: 1, until: now - 1 }], now);
    expect(out.map((m) => m.tmdbId)).toEqual([1, 2]);
  });

  it("ne modifie pas la liste d'origine", () => {
    applyPendingChanges(list, [{ type: "removed", tmdbId: 1, until: now + 1000 }], now);
    expect(list).toHaveLength(2);
  });
});

describe("getWatchmodeBadge", () => {
  const base = { providers: { abonnement: ["Netflix"], vod: [] } };

  it("✓ 2 sources quand Watchmode confirme", () => {
    expect(getWatchmodeBadge({ ...base, wm: { status: "ok" } })).toEqual({ kind: "ok", label: "✓ 2 sources" });
  });
  it("⚠️ À vérifier en cas de désaccord", () => {
    expect(getWatchmodeBadge({ ...base, wm: { status: "mismatch" } })).toEqual({ kind: "warn", label: "⚠️ À vérifier" });
  });
  it("pas de badge sans second avis, ou quand Watchmode ne connaît pas le film", () => {
    expect(getWatchmodeBadge(base)).toBeNull();
    expect(getWatchmodeBadge({ ...base, wm: { status: "unknown" } })).toBeNull();
    expect(getWatchmodeBadge(null)).toBeNull();
  });
  it("pas de badge si le film n'est sur aucun de mes abonnements", () => {
    expect(getWatchmodeBadge({ providers: { abonnement: [], vod: ["AppleTV"] }, wm: { status: "mismatch" } })).toBeNull();
  });
});

describe("describeWatchmodeMismatch", () => {
  it("nomme les plateformes non confirmées", () => {
    expect(describeWatchmodeMismatch({ wm: { status: "mismatch", missing: ["disney"] } })).toContain("Disney+");
    expect(describeWatchmodeMismatch({ wm: { status: "mismatch", missing: ["netflix", "prime"] } })).toContain("Netflix et Prime Video");
  });
  it("chaîne vide sans désaccord", () => {
    expect(describeWatchmodeMismatch({ wm: { status: "ok" } })).toBe("");
    expect(describeWatchmodeMismatch({})).toBe("");
  });
});

describe("isReportedUnavailable / splitHomeSections", () => {
  const abo = { abonnement: ["Netflix"], vod: [] };
  const films = [
    { tmdbId: 1, title: "A", providers: abo, availableSince: "2026-11-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" },
    { tmdbId: 2, title: "B", providers: abo, availableSince: "2026-11-05T00:00:00Z", updatedAt: "2026-10-02T00:00:00Z", reported: { platforms: ["Netflix"], at: "2026-11-06T00:00:00Z" } },
    { tmdbId: 3, title: "C", providers: abo, availableSince: "2026-11-03T00:00:00Z", updatedAt: "2026-10-03T00:00:00Z" },
    { tmdbId: 4, title: "D", providers: abo, availableSince: "2026-11-02T00:00:00Z", updatedAt: "2026-10-04T00:00:00Z", reported: { platforms: ["Netflix"], at: "2026-11-07T00:00:00Z" } },
    { tmdbId: 5, title: "E", providers: { abonnement: [], vod: [] }, availableSince: null, updatedAt: "2026-10-05T00:00:00Z" },
  ];

  it("reconnaît un film signalé", () => {
    expect(isReportedUnavailable(films[1])).toBe(true);
    expect(isReportedUnavailable(films[0])).toBe(false);
    expect(isReportedUnavailable({ reported: null })).toBe(false);
    // TMDB a retiré la plateforme : plus « douteux », juste plus disponible.
    expect(isReportedUnavailable({ reported: { platforms: ["Netflix"], dropped: true } })).toBe(false);
    expect(isReportedUnavailable(undefined)).toBe(false);
  });

  it("« Disponible » ne contient que les films vraiment disponibles, du plus récent au plus ancien", () => {
    expect(splitHomeSections(films).available.map((m) => m.tmdbId)).toEqual([3, 1]);
  });

  it("« Disponibilité douteuse » contient les films signalés, le plus récent signalement d'abord", () => {
    expect(splitHomeSections(films).doubtful.map((m) => m.tmdbId)).toEqual([4, 2]);
  });

  it("« Derniers ajouts » garde tous les films, signalés ou non", () => {
    expect(splitHomeSections(films).lastAdded.map((m) => m.tmdbId)).toEqual([5, 4, 3, 2, 1]);
  });

  it("aucun film : trois listes vides, sans erreur", () => {
    expect(splitHomeSections(undefined)).toEqual({ available: [], doubtful: [], lastAdded: [] });
  });

  it("pas de badge Watchmode sur un film signalé", () => {
    expect(getWatchmodeBadge({ providers: { abonnement: ["Netflix"] }, wm: { status: "mismatch" }, reported: { at: "x" } })).toBeNull();
  });
});

describe("applyPendingChanges — modification légère (patched)", () => {
  const now = 1_000_000;
  const list = [{ tmdbId: 1, title: "A" }, { tmdbId: 2, title: "B" }];

  it("applique le signalement même si le site publié ne l'a pas encore", () => {
    const out = applyPendingChanges(list, [{ type: "patched", tmdbId: 1, patch: { reported: { at: "x" } }, until: now + 1000 }], now);
    expect(out[0].reported).toEqual({ at: "x" });
    expect(out[1]).toEqual(list[1]);
  });

  it("retire le signalement quand le patch le remet à null", () => {
    const withReport = [{ tmdbId: 1, title: "A", reported: { at: "x" } }];
    const out = applyPendingChanges(withReport, [{ type: "patched", tmdbId: 1, patch: { reported: null }, until: now + 1000 }], now);
    expect(isReportedUnavailable(out[0])).toBe(false);
  });

  it("ne fait rien si la fiche n'est plus dans la liste", () => {
    const out = applyPendingChanges(list, [{ type: "patched", tmdbId: 99, patch: { reported: { at: "x" } }, until: now + 1000 }], now);
    expect(out).toHaveLength(2);
  });
});
