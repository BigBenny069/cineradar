import { describe, it, expect } from "vitest";
import { normalizeText, toPosterSize, getPlatformSearchUrl, mapToCinemaisonPlatform, formatRelativeDate } from "./App.jsx";

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
