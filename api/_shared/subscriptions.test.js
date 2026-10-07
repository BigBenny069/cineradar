import { describe, it, expect } from "vitest";
import { normalize, CANONICAL_SUBSCRIPTIONS, createIsMySubscription } from "./subscriptions.cjs";

describe("normalize", () => {
  it("retire les accents et met en minuscule", () => {
    expect(normalize("Ciné+ Émotion")).toBe("cine+ emotion");
  });
  it("gère les valeurs vides sans planter", () => {
    expect(normalize(null)).toBe("");
    expect(normalize(undefined)).toBe("");
  });
});

describe("createIsMySubscription", () => {
  // Cas réel qui a déjà cassé en prod : "Insomnia Amazon Channel" doit être
  // reconnu comme couvert par l'abonnement Canal+ (voir CANONICAL_SUBSCRIPTIONS.canal).
  it("reconnaît Insomnia Amazon Channel comme couvert par Canal+", () => {
    const isMySub = createIsMySubscription(["canal"]);
    expect(isMySub("Insomnia Amazon Channel")).toBe(true);
  });

  it("reconnaît les variantes Ciné+/Cine+ OCS comme couvertes par OCS", () => {
    const isMySub = createIsMySubscription(["ocs"]);
    expect(isMySub("Cine+ OCS")).toBe(true);
    expect(isMySub("Ciné+ OCS")).toBe(true);
  });

  it("reconnaît Shadowz Amazon Channel comme couvert par l'abonnement Shadowz", () => {
    const isMySub = createIsMySubscription(["shadowz"]);
    expect(isMySub("Shadowz Amazon Channel")).toBe(true);
    expect(isMySub("Shadowz")).toBe(true);
  });

  it("ne classe pas Shadowz en abonnement si l'interrupteur est désactivé", () => {
    const isMySub = createIsMySubscription(["netflix"]);
    expect(isMySub("Shadowz Amazon Channel")).toBe(false);
  });

  it("ne reconnaît pas une plateforme non activée", () => {
    const isMySub = createIsMySubscription(["netflix"]);
    expect(isMySub("Canal+")).toBe(false);
  });

  it("ne confond pas Canal VOD (location) avec Canal+ (abonnement)", () => {
    const isMySub = createIsMySubscription(["canal"]);
    expect(isMySub("Canal VOD")).toBe(false);
  });

  it("utilise les valeurs par défaut si la liste activée est vide", () => {
    const isMySub = createIsMySubscription([]);
    expect(isMySub("Netflix")).toBe(true); // "netflix" fait partie de DEFAULT_ENABLED
  });

  it("chaque clé de CANONICAL_SUBSCRIPTIONS a au moins une chaîne associée", () => {
    for (const [key, names] of Object.entries(CANONICAL_SUBSCRIPTIONS)) {
      expect(Array.isArray(names), `${key} doit être un tableau`).toBe(true);
      expect(names.length, `${key} ne doit pas être vide`).toBeGreaterThan(0);
    }
  });
});
