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
