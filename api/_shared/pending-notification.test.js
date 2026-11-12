import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { savePending, loadPending, clearPending } from "./pending-notification.cjs";

let dir;
let file;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "pending-"));
  file = path.join(dir, "pending.json");
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const film = { title: "Film A", providers: ["Netflix"], poster: null, letterboxdUrl: null };

describe("notification en attente", () => {
  it("enregistre puis relit la liste", () => {
    expect(savePending([film], file)).toBe(true);
    expect(loadPending(file)).toEqual([film]);
  });

  it("une liste vide retire le fichier d'une tentative précédente (pas de renvoi périmé)", () => {
    savePending([film], file);
    expect(savePending([], file)).toBe(false);
    expect(fs.existsSync(file)).toBe(false);
    expect(loadPending(file)).toEqual([]);
  });

  it("la seconde tentative remplace la première : un seul envoi possible, pas de cumul", () => {
    savePending([film], file);
    savePending([film], file);
    expect(loadPending(file)).toHaveLength(1);
  });

  it("fichier absent ou illisible : liste vide, sans erreur", () => {
    expect(loadPending(file)).toEqual([]);
    fs.writeFileSync(file, "pas du json");
    expect(loadPending(file)).toEqual([]);
    fs.writeFileSync(file, '{"a":1}');
    expect(loadPending(file)).toEqual([]);
  });

  it("clearPending ne plante pas sans fichier", () => {
    expect(() => clearPending(file)).not.toThrow();
  });
});
