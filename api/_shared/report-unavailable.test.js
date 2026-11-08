import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import handler from "../reverify-movie.js";

function makeRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (payload) => ((res.body = payload), res);
  return res;
}
const req = (body) => ({ method: "POST", headers: { "x-forwarded-for": "10.1.0." + Math.floor(Math.random() * 250) }, body });

const encode = (data) => Buffer.from(JSON.stringify(data), "utf-8").toString("base64");
const getOk = (data, sha = "sha1") => ({ ok: true, status: 200, json: async () => ({ content: encode(data), sha }) });
const putOk = { ok: true, status: 200, text: async () => "" };
const putConflict = { ok: false, status: 409, text: async () => "conflit" };

const FILMS = () => [
  { tmdbId: 1, title: "Film A", providers: { abonnement: ["Disney Plus"], vod: [] } },
  { tmdbId: 2, title: "Film B", providers: { abonnement: ["Netflix"], vod: [] }, reported: { platforms: ["Netflix"], at: "2026-11-01T00:00:00Z" } },
];

describe("api/reverify-movie — signalement « pas disponible »", () => {
  beforeEach(() => {
    process.env.ADD_MOVIE_PASSWORD = "secret";
    process.env.GITHUB_REPO = "o/r";
    process.env.GITHUB_TOKEN = "t";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refuse sans le bon mot de passe, sans aucune requête réseau", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const res = makeRes();
    await handler(req({ tmdbId: 1, action: "report-unavailable", password: "faux" }), res);
    expect(res.statusCode).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("signale : pose reported avec les plateformes du moment, et ne touche pas aux autres fiches", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(getOk(FILMS())).mockResolvedValueOnce(putOk);
    vi.stubGlobal("fetch", fetchMock);
    const res = makeRes();
    await handler(req({ tmdbId: 1, action: "report-unavailable", password: "secret" }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.movie.reported.platforms).toEqual(["Disney Plus"]);
    expect(Date.parse(res.body.movie.reported.at)).not.toBeNaN();

    const written = JSON.parse(Buffer.from(JSON.parse(fetchMock.mock.calls[1][1].body).content, "base64").toString("utf-8"));
    expect(written).toHaveLength(2);
    expect(written[0].reported.platforms).toEqual(["Disney Plus"]);
    expect(written[1]).toEqual(FILMS()[1]); // intacte
    expect(fetchMock.mock.calls[1][0]).toContain("public/data/enriched.json");
  });

  it("retire le signalement", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(getOk(FILMS())).mockResolvedValueOnce(putOk);
    vi.stubGlobal("fetch", fetchMock);
    const res = makeRes();
    await handler(req({ tmdbId: 2, action: "clear-report", password: "secret" }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.movie.reported).toBeUndefined();
    const written = JSON.parse(Buffer.from(JSON.parse(fetchMock.mock.calls[1][1].body).content, "base64").toString("utf-8"));
    expect(written[1].reported).toBeUndefined();
    expect(written[1].title).toBe("Film B");
  });

  it("fiche introuvable : 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(getOk(FILMS())));
    const res = makeRes();
    await handler(req({ tmdbId: 999, action: "report-unavailable", password: "secret" }), res);
    expect(res.statusCode).toBe(404);
  });

  it("conflit avec le robot : relit la version la plus récente et réessaie", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(getOk(FILMS(), "ancien"))
      .mockResolvedValueOnce(putConflict)
      .mockResolvedValueOnce(getOk([...FILMS(), { tmdbId: 3, title: "Film C", providers: { abonnement: [], vod: [] } }], "recent"))
      .mockResolvedValueOnce(putOk);
    vi.stubGlobal("fetch", fetchMock);
    const res = makeRes();
    await handler(req({ tmdbId: 1, action: "report-unavailable", password: "secret" }), res);
    expect(res.statusCode).toBe(200);
    const secondPut = JSON.parse(fetchMock.mock.calls[3][1].body);
    expect(secondPut.sha).toBe("recent");
    const written = JSON.parse(Buffer.from(secondPut.content, "base64").toString("utf-8"));
    expect(written).toHaveLength(3); // la fiche ajoutée entre-temps n'est pas perdue
  });

  it("deux conflits de suite : erreur claire, rien d'écrit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(getOk(FILMS())).mockResolvedValueOnce(putConflict).mockResolvedValueOnce(getOk(FILMS())).mockResolvedValueOnce(putConflict)
    );
    const res = makeRes();
    await handler(req({ tmdbId: 1, action: "report-unavailable", password: "secret" }), res);
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toContain("Écriture impossible");
  });

  it("sans action (« Redemander une vérification » existant) : comportement inchangé, passe par TMDB", async () => {
    delete process.env.TMDB_API_KEY;
    vi.stubGlobal("fetch", vi.fn());
    const res = makeRes();
    await handler(req({ tmdbId: 1, password: "secret" }), res);
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toContain("TMDB_API_KEY");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("action inconnue : 400, aucune requête réseau", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const res = makeRes();
    await handler(req({ tmdbId: 1, action: "n-importe-quoi", password: "secret" }), res);
    expect(res.statusCode).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
