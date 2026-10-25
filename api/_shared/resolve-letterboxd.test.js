import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import handler from "../resolve-letterboxd.js";

function makeRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (payload) => ((res.body = payload), res);
  return res;
}
const req = (body) => ({ method: "POST", headers: { "x-forwarded-for": "10.0.0." + Math.floor(Math.random() * 250) }, body });

const redirect = (location) => ({ status: 302, headers: { get: (h) => (h.toLowerCase() === "location" ? location : null) } });
const page = (status, html = "") => ({ status, headers: { get: () => null }, text: async () => html });
const FILM_HTML = '<meta property="og:title" content="Clayface (2026)"><body data-tmdb-id="777" data-tmdb-type="movie"></body>';

describe("api/resolve-letterboxd", () => {
  beforeEach(() => {
    process.env.ADD_MOVIE_PASSWORD = "secret";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refuse sans le bon mot de passe", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const res = makeRes();
    await handler(req({ link: "https://boxd.it/RTVm", password: "faux" }), res);
    expect(res.statusCode).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuse un texte sans lien Letterboxd, sans aucune requête réseau", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const res = makeRes();
    await handler(req({ link: "https://exemple.com/x", password: "secret" }), res);
    expect(res.statusCode).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("résout un lien boxd.it vers la fiche, avec identifiant TMDB, titre et année", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirect("https://letterboxd.com/film/clayface/"))
      .mockResolvedValueOnce(page(200, FILM_HTML));
    vi.stubGlobal("fetch", fetchMock);
    const res = makeRes();
    await handler(req({ link: "Regarde https://boxd.it/RTVm", password: "secret" }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ slug: "clayface", tmdbId: 777, title: "Clayface", year: 2026, source: "page" });
    expect(res.body.letterboxdUrl).toBe("https://letterboxd.com/film/clayface/");
    expect(fetchMock).toHaveBeenCalledTimes(2); // lien court + page du film, jamais la page deux fois
  });

  it("depuis un lien d'avis, va chercher la fiche canonique du film", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirect("https://letterboxd.com/ben_benny/film/clayface/"))
      .mockResolvedValueOnce(page(200, "<html>page d'avis sans infos</html>"))
      .mockResolvedValueOnce(page(200, FILM_HTML));
    vi.stubGlobal("fetch", fetchMock);
    const res = makeRes();
    await handler(req({ link: "https://boxd.it/avis", password: "secret" }), res);
    expect(res.body).toMatchObject({ slug: "clayface", tmdbId: 777, source: "page" });
    expect(fetchMock.mock.calls[2][0]).toBe("https://letterboxd.com/film/clayface/");
  });

  it("retombe sur le slug si Letterboxd refuse de livrer la page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(redirect("https://letterboxd.com/film/dune-2021/")).mockResolvedValueOnce(page(403))
    );
    const res = makeRes();
    await handler(req({ link: "https://boxd.it/abc", password: "secret" }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ slug: "dune-2021", tmdbId: null, title: "dune", year: 2021, source: "slug" });
  });

  it("ne suit jamais une redirection vers un autre site", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(redirect("https://evil.example/film/x/"));
    vi.stubGlobal("fetch", fetchMock);
    const res = makeRes();
    await handler(req({ link: "https://boxd.it/abc", password: "secret" }), res);
    expect(res.statusCode).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refuse un lien Letterboxd qui n'est pas une fiche de film", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(page(200)));
    const res = makeRes();
    await handler(req({ link: "https://letterboxd.com/ben_benny/", password: "secret" }), res);
    expect(res.statusCode).toBe(422);
  });
});
