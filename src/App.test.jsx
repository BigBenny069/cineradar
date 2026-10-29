import { describe, it, expect } from "vitest";
import { normalizeText, toPosterSize, getPlatformSearchUrl, mapToCinemaisonPlatform, formatRelativeDate, getInitialView, looksLikeLetterboxdLink, pickBestTmdbMatch, filterMoviesByTitle, describeLetterboxdSource } from "./App.jsx";

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
