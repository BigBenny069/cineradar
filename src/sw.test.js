import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// Charge public/sw.js dans un faux environnement de service worker (cache,
// fetch et événements simulés) pour vérifier ses règles sans navigateur.
function loadServiceWorker({ fetchImpl }) {
  const stores = new Map();
  const makeCache = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      match: async (req) => store.get(typeof req === "string" ? new URL(req, "https://x.test").pathname : req.url),
      put: async (req, res) => store.set(typeof req === "string" ? req : req.url, res),
      add: async (url) => {
        const res = await fetchImpl({ url: new URL(url, "https://x.test").href, method: "GET" });
        if (!res.ok) throw new Error("add failed " + url);
        store.set(new URL(url, "https://x.test").pathname, res);
      },
    };
  };
  const listeners = {};
  const self = {
    location: { origin: "https://x.test" },
    addEventListener: (type, fn) => (listeners[type] = fn),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  };
  const caches = {
    open: async (n) => makeCache(n),
    keys: async () => [...stores.keys()],
    delete: async (n) => stores.delete(n),
  };
  class FakeResponse {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status ?? 200;
      this.ok = this.status >= 200 && this.status < 300;
    }
    clone() {
      return new FakeResponse(this.body, { status: this.status });
    }
    static error() {
      const r = new FakeResponse(null, { status: 0 });
      r.isError = true;
      return r;
    }
  }
  const context = { self, caches, fetch: (req) => fetchImpl(req), Response: FakeResponse, URL, Promise, setTimeout, clearTimeout };
  vm.createContext(context);
  vm.runInContext(readFileSync("public/sw.js", "utf-8"), context);
  return { listeners, stores, FakeResponse };
}

function fetchEvent(url, { mode = "cors", method = "GET" } = {}) {
  let responded;
  return {
    request: { url, method, mode },
    respondWith: (p) => (responded = p),
    waitUntil: () => {},
    get responded() {
      return responded;
    },
  };
}

describe("service worker", () => {
  let calls;
  const ok = (body) => ({ ok: true, status: 200, body, clone() { return this; } });
  beforeEach(() => {
    calls = [];
  });

  it("précache les fichiers un par un : un fichier absent n'empêche pas les autres", async () => {
    const fetchImpl = async (req) => {
      calls.push(req.url);
      return req.url.endsWith("/manifest.webmanifest") ? { ok: false, status: 404 } : ok("x");
    };
    const { listeners, stores } = loadServiceWorker({ fetchImpl });
    let done;
    await listeners.install({ waitUntil: (p) => (done = p) });
    await done;
    const cache = stores.get("cineradar-shell-v3");
    expect(cache.has("/")).toBe(true);
    expect(cache.has("/icon-192.png")).toBe(true);
    expect(cache.has("/manifest.webmanifest")).toBe(false);
  });

  it("ne touche jamais /data, /api, les requêtes POST ni les autres sites", () => {
    const { listeners } = loadServiceWorker({ fetchImpl: async () => ok("x") });
    for (const e of [
      fetchEvent("https://x.test/data/enriched.json?t=1"),
      fetchEvent("https://x.test/api/add-movie"),
      fetchEvent("https://x.test/api/search-tmdb?q=a", { mode: "cors" }),
      fetchEvent("https://fonts.googleapis.com/css2?family=Inter"),
      fetchEvent("https://image.tmdb.org/t/p/w500/a.jpg"),
      fetchEvent("https://x.test/", { method: "POST" }),
    ]) {
      listeners.fetch(e);
      expect(e.responded).toBeUndefined();
    }
  });

  it("sert un fichier /assets/ depuis le cache sans repasser par le réseau", async () => {
    let networkCalls = 0;
    const { listeners } = loadServiceWorker({
      fetchImpl: async () => {
        networkCalls++;
        return ok("js");
      },
    });
    const first = fetchEvent("https://x.test/assets/index-ABC.js");
    listeners.fetch(first);
    await first.responded;
    const second = fetchEvent("https://x.test/assets/index-ABC.js");
    listeners.fetch(second);
    await second.responded;
    expect(networkCalls).toBe(1);
  });

  it("navigation hors-ligne : ressert la page en cache plutôt que de planter", async () => {
    let online = true;
    const { listeners } = loadServiceWorker({
      fetchImpl: async () => {
        if (!online) throw new Error("offline");
        return ok("<html>app</html>");
      },
    });
    const first = fetchEvent("https://x.test/?view=add", { mode: "navigate" });
    listeners.fetch(first);
    await first.responded;
    online = false;
    const second = fetchEvent("https://x.test/", { mode: "navigate" });
    listeners.fetch(second);
    const res = await second.responded;
    expect(res.body).toBe("<html>app</html>");
  });

  it("supprime les anciens caches à l'activation", async () => {
    const { listeners, stores } = loadServiceWorker({ fetchImpl: async () => ok("x") });
    stores.set("cineradar-shell-v2", new Map());
    stores.set("cineradar-shell-v3", new Map());
    let done;
    await listeners.activate({ waitUntil: (p) => (done = p) });
    await done;
    expect(stores.has("cineradar-shell-v2")).toBe(false);
    expect(stores.has("cineradar-shell-v3")).toBe(true);
  });
});
