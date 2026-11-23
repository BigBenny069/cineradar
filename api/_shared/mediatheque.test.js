import { describe, it, expect } from "vitest";
import { normalize, simplifyProduct, searchMediatheque } from "./mediatheque.cjs";

const fakeFetch = (status, body) => async () => ({ status, ok: status >= 200 && status < 300, json: async () => body });

describe("normalize", () => {
  it("retire accents, casse et ponctuation", () => {
    expect(normalize("L'Amour, c'est surcoté !")).toBe("l amour c est surcote");
  });
});

describe("simplifyProduct", () => {
  it("garde les champs utiles et construit l'adresse de la fiche", () => {
    const p = simplifyProduct({ title: "Parasite", productionYear: 2019, directors: ["Bong Joon-ho"], slug: "parasite", movieType: "LONG", productType: "PROGRAM", outOfCatalog: false });
    expect(p).toEqual({ title: "Parasite", year: 2019, directors: ["Bong Joon-ho"], slug: "parasite", url: "https://vod.mediatheque-numerique.com/films/parasite", movieType: "LONG", productType: "PROGRAM", outOfCatalog: false });
  });
  it("supporte l'absence de réalisateurs et de slug", () => {
    const p = simplifyProduct({ title: "X" });
    expect(p.directors).toEqual([]);
    expect(p.url).toBeNull();
  });
});

describe("searchMediatheque", () => {
  it("204 = aucun résultat", async () => {
    expect(await searchMediatheque("zzz", fakeFetch(204, null))).toEqual({ total: 0, results: [] });
  });
  it("lit la liste de produits", async () => {
    const out = await searchMediatheque("parasite", fakeFetch(200, { content: { products: { totalElements: 1, content: [{ title: "Parasite", productionYear: 2019, slug: "parasite" }] } } }));
    expect(out.total).toBe(1);
    expect(out.results[0].title).toBe("Parasite");
  });
  it("erreur HTTP = exception", async () => {
    await expect(searchMediatheque("x", fakeFetch(500, {}))).rejects.toThrow(/500/);
  });
});

import { pickMediathequeMatch, lookupViaParis, checkMediatheque, withMediathequeProvider, PLATFORM_NAME } from "./mediatheque.cjs";

const R = (o) => ({ title: "X", year: 2000, directors: [], slug: "x", url: "https://vod.mediatheque-numerique.com/films/x", movieType: "LONG", productType: "PROGRAM", outOfCatalog: false, ...o });

describe("pickMediathequeMatch", () => {
  const film = { titles: ["Parasite"], year: "2019", director: "Bong Joon Ho" };
  it("retient le même titre, année et réalisateur", () => {
    const m = pickMediathequeMatch([R({ title: "Les Parasites", year: 1998 }), R({ title: "Parasite", year: 2019, directors: ["Bong  Joon-ho"], slug: "parasite" })], film);
    expect(m.slug).toBe("parasite");
  });
  it("accepte une année à ±1 près, pas plus", () => {
    expect(pickMediathequeMatch([R({ title: "Parasite", year: 2018 })], film)).not.toBeNull();
    expect(pickMediathequeMatch([R({ title: "Parasite", year: 2015 })], film)).toBeNull();
  });
  it("ignore courts métrages, séries, packs et films hors catalogue", () => {
    expect(pickMediathequeMatch([R({ title: "Parasite", year: 2019, movieType: "COURT" })], film)).toBeNull();
    expect(pickMediathequeMatch([R({ title: "Parasite", year: 2019, productType: "SERIE" })], film)).toBeNull();
    expect(pickMediathequeMatch([R({ title: "Parasite", year: 2019, outOfCatalog: true })], film)).toBeNull();
  });
  it("sans année au catalogue, le réalisateur doit confirmer", () => {
    expect(pickMediathequeMatch([R({ title: "Parasite", year: null, directors: ["Autre Personne"] })], film)).toBeNull();
    expect(pickMediathequeMatch([R({ title: "Parasite", year: null, directors: ["Bong Joon-ho"] })], film)).not.toBeNull();
  });
  it("préfère l'année exacte quand plusieurs titres identiques", () => {
    const m = pickMediathequeMatch([R({ title: "Parasite", year: 2018, slug: "a" }), R({ title: "Parasite", year: 2019, slug: "b" })], film);
    expect(m.slug).toBe("b");
  });
  it("accepte le titre alternatif (titre Letterboxd)", () => {
    const m = pickMediathequeMatch([R({ title: "L'Amour, c'est surcoté", year: 2024, slug: "s" })], { titles: ["Love Is Overrated", "L'amour c'est surcoté"], year: "2024", director: "Mourad Winter" });
    expect(m.slug).toBe("s");
  });
});

const jsonFetch = (status, body) => async () => ({ ok: status < 400, status, json: async () => body });

describe("lookupViaParis / checkMediatheque", () => {
  const film = { title: "Parasite", year: "2019", director: "Bong Joon Ho" };
  const goodBody = { region: "cdg1", total: 1, results: [R({ title: "Parasite", year: 2019, directors: ["Bong Joon-ho"], slug: "parasite", url: "https://vod.mediatheque-numerique.com/films/parasite" })] };
  it("trouve le film", async () => {
    const r = await lookupViaParis(film, { fetchImpl: jsonFetch(200, goodBody) });
    expect(r.status).toBe("found");
    expect(r.mn.url).toContain("/films/parasite");
  });
  it("absent quand la recherche réussit sans correspondance", async () => {
    const r = await lookupViaParis(film, { fetchImpl: jsonFetch(200, { region: "cdg1", total: 0, results: [] }) });
    expect(r.status).toBe("absent");
  });
  it("refuse un résultat qui ne vient pas de la région Paris", async () => {
    const r = await lookupViaParis(film, { fetchImpl: jsonFetch(200, { ...goodBody, region: "iad1" }) });
    expect(r.status).toBe("error");
  });
  it("erreur HTTP ou réseau = error, jamais d'exception", async () => {
    expect((await lookupViaParis(film, { fetchImpl: jsonFetch(500, {}) })).status).toBe("error");
    expect((await lookupViaParis(film, { fetchImpl: async () => { throw new Error("réseau"); } })).status).toBe("error");
  });
  it("en cas d'erreur, conserve le résultat précédent", async () => {
    const prev = { url: "https://vod.mediatheque-numerique.com/films/parasite", checkedAt: "2026-11-01T00:00:00Z" };
    const r = await checkMediatheque(film, prev, { fetchImpl: jsonFetch(500, {}) });
    expect(r).toMatchObject({ mn: prev, kept: true });
  });
  it("un « absent » réussi retire la disponibilité", async () => {
    const prev = { url: "u" };
    const r = await checkMediatheque(film, prev, { fetchImpl: jsonFetch(200, { region: "cdg1", total: 0, results: [] }) });
    expect(r).toEqual({ mn: null, kept: false });
  });
});

describe("withMediathequeProvider", () => {
  it("remet la plateforme quand la fiche a un état Médiathèque", () => {
    expect(withMediathequeProvider(["Netflix"], { mn: { url: "u" } })).toEqual(["Netflix", PLATFORM_NAME]);
  });
  it("ne change rien sans état Médiathèque ni doublon", () => {
    expect(withMediathequeProvider(["Netflix"], {})).toEqual(["Netflix"]);
    expect(withMediathequeProvider([PLATFORM_NAME], { mn: {} })).toEqual([PLATFORM_NAME]);
  });
});
