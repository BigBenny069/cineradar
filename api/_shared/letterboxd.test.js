import { describe, it, expect } from "vitest";
import { extractLink, isAllowedUrl, parseFilmPath, titleFromSlug, parseFilmPage } from "./letterboxd.cjs";

describe("extractLink", () => {
  it("retrouve un lien court seul ou noyé dans du texte", () => {
    expect(extractLink("https://boxd.it/RTVm")).toBe("https://boxd.it/RTVm");
    expect(extractLink("Regarde ça : https://boxd.it/RTVm !")).toBe("https://boxd.it/RTVm");
    expect(extractLink("boxd.it/RTVm")).toBe("https://boxd.it/RTVm");
  });
  it("accepte un lien complet de fiche film, force le https", () => {
    expect(extractLink("http://letterboxd.com/film/clayface/")).toBe("https://letterboxd.com/film/clayface/");
  });
  it("retourne null si aucun lien Letterboxd", () => {
    expect(extractLink("https://exemple.com/film/clayface/")).toBe(null);
    expect(extractLink("")).toBe(null);
    expect(extractLink(null)).toBe(null);
  });
});

describe("isAllowedUrl", () => {
  it("n'autorise que boxd.it et letterboxd.com en https", () => {
    expect(isAllowedUrl("https://boxd.it/RTVm")).toBe(true);
    expect(isAllowedUrl("https://letterboxd.com/film/clayface/")).toBe(true);
    expect(isAllowedUrl("http://letterboxd.com/film/clayface/")).toBe(false);
    expect(isAllowedUrl("https://letterboxd.com.evil.com/film/x/")).toBe(false);
    expect(isAllowedUrl("https://boxd.it@evil.com/x")).toBe(false);
    expect(isAllowedUrl("https://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isAllowedUrl("pas une url")).toBe(false);
  });
});

describe("parseFilmPath", () => {
  it("reconnaît une fiche film, y compris depuis un avis ou un journal", () => {
    expect(parseFilmPath("https://letterboxd.com/film/clayface/")).toEqual({ slug: "clayface" });
    expect(parseFilmPath("https://letterboxd.com/ben_benny/film/clayface/")).toEqual({ slug: "clayface" });
    expect(parseFilmPath("https://letterboxd.com/film/clayface/reviews/")).toEqual({ slug: "clayface" });
  });
  it("reconnaît un lien direct /tmdb/{id}", () => {
    expect(parseFilmPath("https://letterboxd.com/tmdb/311/")).toEqual({ tmdbId: 311 });
  });
  it("refuse tout ce qui n'est pas une fiche film", () => {
    expect(parseFilmPath("https://letterboxd.com/ben_benny/")).toBe(null);
    expect(parseFilmPath("https://letterboxd.com/films/popular/")).toBe(null);
  });
});

describe("titleFromSlug", () => {
  it("transforme le slug en titre et détecte l'année d'un homonyme", () => {
    expect(titleFromSlug("le-retour-des-morts-vivants-3")).toEqual({ title: "le retour des morts vivants 3", year: null });
    expect(titleFromSlug("dune-2021")).toEqual({ title: "dune", year: 2021 });
  });
});

describe("parseFilmPage", () => {
  const page = (head, body = "") => `<html><head>${head}</head><body ${body}></body></html>`;

  it("lit l'identifiant TMDB, le titre et l'année", () => {
    const html = page('<meta property="og:title" content="Clayface (2026)" />', 'class="film" data-tmdb-id="1234" data-tmdb-type="movie"');
    expect(parseFilmPage(html)).toEqual({ tmdbId: 1234, title: "Clayface", year: 2026 });
  });
  it("décode les caractères spéciaux du titre", () => {
    const html = page('<meta content="L&#039;Évadé d&amp;Alcatraz (1979)" property="og:title">');
    expect(parseFilmPage(html)).toEqual({ tmdbId: null, title: "L'Évadé d&Alcatraz", year: 1979 });
  });
  it("retombe sur le lien TMDb de la page si l'attribut manque", () => {
    const html = page('<title>Climax (2018) • Letterboxd</title>') + '<a href="https://www.themoviedb.org/movie/487558/">TMDb</a>';
    expect(parseFilmPage(html)).toEqual({ tmdbId: 487558, title: "Climax", year: 2018 });
  });
  it("ignore un identifiant TMDB de série", () => {
    const html = page('<meta property="og:title" content="X (2020)">', 'data-tmdb-id="99" data-tmdb-type="tv"');
    expect(parseFilmPage(html).tmdbId).toBe(null);
  });
  it("ne plante pas sur une page vide ou inattendue", () => {
    expect(parseFilmPage("")).toEqual({ tmdbId: null, title: null, year: null });
    expect(parseFilmPage("<html>Accès refusé</html>")).toEqual({ tmdbId: null, title: null, year: null });
    expect(parseFilmPage(null)).toEqual({ tmdbId: null, title: null, year: null });
  });
});
