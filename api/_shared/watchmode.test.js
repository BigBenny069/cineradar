import { describe, it, expect } from "vitest";
import {
  platformFamily,
  familiesOf,
  compareWithWatchmode,
  needsCheck,
  fetchWatchmodeSources,
  applyWatchmodeChecks,
} from "./watchmode.cjs";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-11-08T08:00:00Z");

// Fausse API Watchmode : searchTable (tmdbId → résultat de recherche),
// sourcesTable (id Watchmode → liste de sources). Compte les appels.
function fakeWatchmode({ searchTable = {}, sourcesTable = {}, failWith = null } = {}) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    if (failWith) return { status: failWith, json: async () => ({}) };
    const u = new URL(url);
    if (u.pathname.endsWith("/search/")) {
      const hit = searchTable[u.searchParams.get("search_value")];
      return { status: 200, json: async () => ({ title_results: hit ? [hit] : [] }) };
    }
    const id = u.pathname.split("/")[3];
    return { status: 200, json: async () => sourcesTable[id] || [] };
  };
  return { fetchImpl, calls };
}

describe("platformFamily", () => {
  it("reconnaît les plateformes couvertes, quelle que soit la graphie", () => {
    expect(platformFamily("Netflix")).toBe("netflix");
    expect(platformFamily("Netflix Standard with Ads")).toBe("netflix");
    expect(platformFamily("Disney Plus")).toBe("disney");
    expect(platformFamily("Disney+")).toBe("disney");
    expect(platformFamily("Paramount Plus")).toBe("paramount");
    expect(platformFamily("Amazon Prime Video")).toBe("prime");
    expect(platformFamily("Prime Video")).toBe("prime");
  });

  it("classe Paramount+ via Amazon comme Paramount+, pas comme Prime Video", () => {
    expect(platformFamily("Paramount+ Amazon Channel")).toBe("paramount");
    expect(platformFamily("Paramount+ (Via Amazon Prime)")).toBe("paramount");
  });

  it("ignore les plateformes non couvertes (Canal+, Shadowz, location Amazon)", () => {
    expect(platformFamily("Canal+")).toBeNull();
    expect(platformFamily("Shadowz Amazon Channel")).toBeNull();
    expect(platformFamily("Amazon")).toBeNull();
    expect(platformFamily("AppleTV")).toBeNull();
  });
});

describe("compareWithWatchmode", () => {
  it("ok : les deux sources donnent la même plateforme", () => {
    expect(compareWithWatchmode(["Netflix", "Netflix Standard with Ads"], ["Netflix"])).toMatchObject({
      status: "ok",
      families: ["netflix"],
      missing: [],
    });
  });

  it("mismatch : TMDB annonce Disney+ que Watchmode ne confirme pas", () => {
    expect(compareWithWatchmode(["Disney Plus"], [])).toMatchObject({ status: "mismatch", missing: ["disney"] });
    expect(compareWithWatchmode(["Disney Plus"], ["Netflix"])).toMatchObject({ status: "mismatch", missing: ["disney"] });
  });

  it("plusieurs plateformes : une seule non confirmée suffit à signaler", () => {
    const r = compareWithWatchmode(["Netflix", "Disney Plus"], ["Netflix"]);
    expect(r.status).toBe("mismatch");
    expect(r.missing).toEqual(["disney"]);
  });

  it("null : aucune plateforme couverte (Shadowz, Canal+) → pas de badge", () => {
    expect(compareWithWatchmode(["Shadowz Amazon Channel"], [])).toBeNull();
    expect(compareWithWatchmode(["Canal+"], ["Netflix"])).toBeNull();
    expect(compareWithWatchmode([], ["Netflix"])).toBeNull();
  });

  it("Paramount+ via Amazon confirmé des deux côtés", () => {
    expect(compareWithWatchmode(["Paramount+ Amazon Channel"], ["Paramount+ (Via Amazon Prime)"]).status).toBe("ok");
  });
});

describe("needsCheck", () => {
  const wm = (over = {}) => ({ status: "ok", families: ["netflix"], checkedAt: new Date(NOW - DAY).toISOString(), ...over });

  it("jamais contrôlé → à contrôler", () => {
    expect(needsCheck(undefined, ["Netflix"], NOW)).toBe(true);
  });
  it("aucune plateforme couverte → jamais", () => {
    expect(needsCheck(undefined, ["Canal+"], NOW)).toBe(false);
    expect(needsCheck(undefined, [], NOW)).toBe(false);
  });
  it("contrôlé récemment avec les mêmes plateformes → pas de nouvel appel", () => {
    expect(needsCheck(wm(), ["Netflix"], NOW)).toBe(false);
  });
  it("les plateformes ont changé → à recontrôler", () => {
    expect(needsCheck(wm(), ["Netflix", "Disney Plus"], NOW)).toBe(true);
  });
  it("contrôle vieux de plus de 3 semaines → à recontrôler", () => {
    expect(needsCheck(wm({ checkedAt: new Date(NOW - 22 * DAY).toISOString() }), ["Netflix"], NOW)).toBe(true);
  });
  it("date illisible → à recontrôler", () => {
    expect(needsCheck(wm({ checkedAt: "n'importe quoi" }), ["Netflix"], NOW)).toBe(true);
  });
});

describe("fetchWatchmodeSources", () => {
  it("2 appels : recherche puis sources, seules les offres d'abonnement sont gardées", async () => {
    const { fetchImpl, calls } = fakeWatchmode({
      searchTable: { 111: { id: 777 } },
      sourcesTable: {
        777: [
          { name: "Netflix", type: "sub" },
          { name: "AppleTV", type: "rent" },
          { name: "Netflix", type: "sub" },
        ],
      },
    });
    const r = await fetchWatchmodeSources({ tmdbId: 111, apiKey: "k", fetchImpl });
    expect(r).toEqual({ ok: true, wmId: 777, sources: ["Netflix"] });
    expect(calls).toHaveLength(2);
    expect(calls[1]).toContain("regions=FR");
  });

  it("identifiant Watchmode déjà connu : un seul appel", async () => {
    const { fetchImpl, calls } = fakeWatchmode({ sourcesTable: { 777: [] } });
    await fetchWatchmodeSources({ tmdbId: 111, wmId: 777, apiKey: "k", fetchImpl });
    expect(calls).toHaveLength(1);
  });

  it("film inconnu de Watchmode", async () => {
    const { fetchImpl } = fakeWatchmode();
    expect(await fetchWatchmodeSources({ tmdbId: 5, apiKey: "k", fetchImpl })).toMatchObject({ ok: true, unknown: true });
  });

  it("clé refusée ou quota atteint → fatal", async () => {
    for (const code of [401, 403, 429]) {
      const { fetchImpl } = fakeWatchmode({ failWith: code });
      expect(await fetchWatchmodeSources({ tmdbId: 1, apiKey: "k", fetchImpl })).toEqual({ ok: false, fatal: true });
    }
  });

  it("panne ponctuelle → non fatal", async () => {
    const { fetchImpl } = fakeWatchmode({ failWith: 500 });
    expect(await fetchWatchmodeSources({ tmdbId: 1, apiKey: "k", fetchImpl })).toEqual({ ok: false, fatal: false });
    const boom = async () => {
      throw new Error("réseau");
    };
    expect(await fetchWatchmodeSources({ tmdbId: 1, apiKey: "k", fetchImpl: boom })).toEqual({ ok: false, fatal: false });
  });
});

describe("applyWatchmodeChecks", () => {
  const movie = (tmdbId, abonnement, extra = {}) => ({ tmdbId, title: `Film ${tmdbId}`, providers: { abonnement, vod: [] }, ...extra });
  const noSleep = async () => {};

  it("sans clé : ne contacte pas Watchmode et garde l'ancien résultat", async () => {
    const entries = [movie(1, ["Netflix"])];
    const previous = { 1: { status: "ok", families: ["netflix"], checkedAt: new Date(NOW).toISOString() } };
    const { fetchImpl, calls } = fakeWatchmode();
    const stats = await applyWatchmodeChecks(entries, previous, { apiKey: "", fetchImpl, now: NOW, sleep: noSleep });
    expect(calls).toHaveLength(0);
    expect(stats.skippedNoKey).toBe(true);
    expect(entries[0].wm.status).toBe("ok");
  });

  it("marque ok / mismatch, et ne touche pas aux films sans plateforme couverte", async () => {
    const entries = [movie(1, ["Netflix"]), movie(2, ["Disney Plus"]), movie(3, ["Shadowz Amazon Channel"])];
    const { fetchImpl } = fakeWatchmode({
      searchTable: { 1: { id: 10 }, 2: { id: 20 } },
      sourcesTable: { 10: [{ name: "Netflix", type: "sub" }], 20: [{ name: "AppleTV", type: "buy" }] },
    });
    const stats = await applyWatchmodeChecks(entries, {}, { apiKey: "k", fetchImpl, now: NOW, sleep: noSleep });
    expect(entries[0].wm).toMatchObject({ status: "ok", id: 10 });
    expect(entries[1].wm).toMatchObject({ status: "mismatch", missing: ["disney"], id: 20 });
    expect(entries[2].wm).toBeUndefined();
    expect(stats).toMatchObject({ checked: 2, mismatches: 1 });
  });

  it("ne recontrôle pas un film déjà vérifié récemment (aucun appel)", async () => {
    const entries = [movie(1, ["Netflix"])];
    const previous = { 1: { status: "ok", families: ["netflix"], id: 10, checkedAt: new Date(NOW - DAY).toISOString() } };
    const { fetchImpl, calls } = fakeWatchmode();
    await applyWatchmodeChecks(entries, previous, { apiKey: "k", fetchImpl, now: NOW, sleep: noSleep });
    expect(calls).toHaveLength(0);
    expect(entries[0].wm.id).toBe(10);
  });

  it("retire l'ancien résultat quand le film n'est plus sur une plateforme couverte", async () => {
    const entries = [movie(1, ["Canal+"])];
    const previous = { 1: { status: "mismatch", families: ["disney"], checkedAt: new Date(NOW).toISOString() } };
    await applyWatchmodeChecks(entries, previous, { apiKey: "k", fetchImpl: fakeWatchmode().fetchImpl, now: NOW, sleep: noSleep });
    expect(entries[0].wm).toBeUndefined();
  });

  it("respecte le plafond d'appels par passage", async () => {
    const entries = [1, 2, 3, 4].map((id) => movie(id, ["Netflix"]));
    const searchTable = Object.fromEntries([1, 2, 3, 4].map((id) => [id, { id: id * 10 }]));
    const sourcesTable = Object.fromEntries([1, 2, 3, 4].map((id) => [id * 10, [{ name: "Netflix", type: "sub" }]]));
    const { fetchImpl } = fakeWatchmode({ searchTable, sourcesTable });
    const stats = await applyWatchmodeChecks(entries, {}, { apiKey: "k", fetchImpl, now: NOW, sleep: noSleep, maxChecks: 2 });
    expect(stats.checked).toBe(2);
    expect(stats.stoppedEarly).toBe(true);
    expect(entries.filter((e) => e.wm).length).toBe(2);
  });

  it("s'arrête dès que l'accès est refusé (quota atteint) sans faire échouer le passage", async () => {
    const entries = [movie(1, ["Netflix"]), movie(2, ["Netflix"])];
    const { fetchImpl, calls } = fakeWatchmode({ failWith: 429 });
    const stats = await applyWatchmodeChecks(entries, {}, { apiKey: "k", fetchImpl, now: NOW, sleep: noSleep });
    expect(calls).toHaveLength(1);
    expect(stats.stoppedEarly).toBe(true);
    expect(entries[0].wm).toBeUndefined();
  });

  it("film inconnu de Watchmode : statut unknown (pas de badge), recontrôlé plus tard", async () => {
    const entries = [movie(9, ["Disney Plus"])];
    await applyWatchmodeChecks(entries, {}, { apiKey: "k", fetchImpl: fakeWatchmode().fetchImpl, now: NOW, sleep: noSleep });
    expect(entries[0].wm).toMatchObject({ status: "unknown", id: null });
  });
});
