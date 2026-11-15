import { describe, it, expect } from "vitest";
import { collectProviderLogos, sortedLogoMap } from "./provider-logos.cjs";

describe("collectProviderLogos", () => {
  it("récolte les logos des abonnements, locations et achats", () => {
    const map = {};
    const n = collectProviderLogos(
      {
        flatrate: [{ provider_name: "Netflix", logo_path: "/n.jpg" }],
        rent: [{ provider_name: "Orange VOD", logo_path: "/o.jpg" }],
        buy: [{ provider_name: "Apple TV Store", logo_path: "/a.jpg" }],
      },
      map
    );
    expect(map).toEqual({ Netflix: "/n.jpg", "Orange VOD": "/o.jpg", "Apple TV Store": "/a.jpg" });
    expect(n).toBe(3);
  });

  it("ne compte pas un logo déjà connu et inchangé", () => {
    const map = { Netflix: "/n.jpg" };
    expect(collectProviderLogos({ flatrate: [{ provider_name: "Netflix", logo_path: "/n.jpg" }] }, map)).toBe(0);
  });

  it("met à jour un logo qui a changé", () => {
    const map = { Netflix: "/vieux.jpg" };
    expect(collectProviderLogos({ flatrate: [{ provider_name: "Netflix", logo_path: "/neuf.jpg" }] }, map)).toBe(1);
    expect(map.Netflix).toBe("/neuf.jpg");
  });

  it("ignore les entrées incomplètes ou invalides, sans planter", () => {
    const map = {};
    collectProviderLogos(
      {
        flatrate: [
          { provider_name: "Sans logo" },
          { logo_path: "/sans-nom.jpg" },
          { provider_name: "Chemin louche", logo_path: "https://evil.example/x.png" },
          null,
          "texte",
        ],
        rent: "pas une liste",
      },
      map
    );
    expect(map).toEqual({});
    expect(collectProviderLogos(undefined, map)).toBe(0);
    expect(collectProviderLogos({}, undefined)).toBe(0);
  });

  it("conserve les logos déjà connus des plateformes qui ne sont plus sur aucun film", () => {
    const map = { "Vieille plateforme": "/v.jpg" };
    collectProviderLogos({ flatrate: [{ provider_name: "Netflix", logo_path: "/n.jpg" }] }, map);
    expect(map["Vieille plateforme"]).toBe("/v.jpg");
  });
});

describe("sortedLogoMap", () => {
  it("trie les noms (fichier stable d'un passage à l'autre)", () => {
    expect(JSON.stringify(sortedLogoMap({ b: "/2", a: "/1" }))).toBe('{"a":"/1","b":"/2"}');
  });
});
