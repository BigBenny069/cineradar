import { describe, it, expect } from "vitest";
import { sameService, evaluateReport, applyReportEvaluation } from "./reports.cjs";

const NOW = "2026-11-09T06:00:00.000Z";
const reported = (platforms, extra = {}) => ({ platforms, at: "2026-11-08T08:00:00.000Z", ...extra });

describe("sameService", () => {
  it("reconnaît les variantes d'un même service", () => {
    expect(sameService("Disney Plus", "Disney+")).toBe(true);
    expect(sameService("Netflix Standard with Ads", "Netflix")).toBe(true);
    expect(sameService("Paramount+ Amazon Channel", "Paramount Plus")).toBe(true);
    expect(sameService("Amazon Prime Video", "Prime Video")).toBe(true);
  });
  it("distingue deux services différents", () => {
    expect(sameService("Netflix", "Disney Plus")).toBe(false);
    expect(sameService("Canal+", "Disney+")).toBe(false);
  });
});

describe("evaluateReport", () => {
  it("pas de signalement : rien à faire", () => {
    expect(evaluateReport(undefined, ["Netflix"], NOW)).toEqual({ reported: null, event: "none" });
  });

  it("TMDB annonce toujours la même plateforme, sans interruption : le signalement reste", () => {
    const r = reported(["Disney Plus"]);
    expect(evaluateReport(r, ["Disney Plus"], NOW)).toEqual({ reported: r, event: "none" });
  });

  it("variante du même service (Netflix avec pub) : toujours le même signalement", () => {
    const r = reported(["Netflix"]);
    expect(evaluateReport(r, ["Netflix", "Netflix Standard with Ads"], NOW).event).toBe("none");
  });

  it("TMDB retire la plateforme : on le note, sans effacer le signalement", () => {
    const out = evaluateReport(reported(["Disney Plus"]), [], NOW);
    expect(out.event).toBe("dropped");
    expect(out.reported).toMatchObject({ platforms: ["Disney Plus"], dropped: true, droppedAt: NOW });
  });

  it("déjà noté comme retiré et toujours absent : aucun changement", () => {
    const r = reported(["Disney Plus"], { dropped: true, droppedAt: "2026-11-09T06:00:00.000Z" });
    expect(evaluateReport(r, [], "2026-11-10T06:00:00.000Z")).toEqual({ reported: r, event: "none" });
  });

  it("la plateforme réapparaît après avoir disparu : vrai retour, signalement effacé", () => {
    const r = reported(["Disney Plus"], { dropped: true, droppedAt: NOW });
    expect(evaluateReport(r, ["Disney Plus"], "2026-11-12T06:00:00.000Z")).toEqual({ reported: null, event: "returned" });
  });

  it("une autre plateforme apparaît : nouvelle disponibilité non contestée, signalement effacé", () => {
    expect(evaluateReport(reported(["Disney Plus"]), ["Disney Plus", "Netflix"], NOW)).toEqual({ reported: null, event: "new-platform" });
    const dropped = reported(["Disney Plus"], { dropped: true, droppedAt: NOW });
    expect(evaluateReport(dropped, ["Netflix"], NOW)).toEqual({ reported: null, event: "new-platform" });
  });

  it("plusieurs plateformes signalées : « retirée » seulement quand aucune ne reste", () => {
    const r = reported(["Netflix", "Disney Plus"]);
    expect(evaluateReport(r, ["Netflix"], NOW).event).toBe("none");
    expect(evaluateReport(r, [], NOW).event).toBe("dropped");
  });

  it("ne modifie pas l'objet d'origine", () => {
    const r = reported(["Disney Plus"]);
    evaluateReport(r, [], NOW);
    expect(r.dropped).toBeUndefined();
  });
});

describe("applyReportEvaluation", () => {
  it("applique l'évaluation aux fiches signalées et compte les événements", () => {
    const entries = [
      { tmdbId: 1, providers: { abonnement: ["Disney Plus"] }, reported: reported(["Disney Plus"]) }, // inchangé
      { tmdbId: 2, providers: { abonnement: [] }, reported: reported(["Netflix"]) }, // retiré
      { tmdbId: 3, providers: { abonnement: ["Netflix"] }, reported: reported(["Netflix"], { dropped: true }) }, // retour
      { tmdbId: 4, providers: { abonnement: ["Netflix"] } }, // pas signalé
      { tmdbId: 5, providers: { abonnement: ["Prime Video"] }, reported: reported(["Netflix"]) }, // autre plateforme
    ];
    const stats = applyReportEvaluation(entries, NOW);
    expect(stats).toEqual({ dropped: 1, returned: 1, newPlatform: 1 });
    expect(entries[0].reported.dropped).toBeUndefined();
    expect(entries[1].reported.dropped).toBe(true);
    expect(entries[2].reported).toBeUndefined();
    expect(entries[3].reported).toBeUndefined();
    expect(entries[4].reported).toBeUndefined();
  });
});
