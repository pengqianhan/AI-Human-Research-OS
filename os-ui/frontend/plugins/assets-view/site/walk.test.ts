/**
 * The Assets view's walk (os-ui/PLUGINS.md Part 3, §4.2 "Walk") on the frozen
 * fixture project (../../fixtures/README.md) and on listings made to hit
 * each cap: every state the view words, and every place the walk stops.
 */
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { walk, WALK } from "./walk.ts";
import type { Entry, ListAnswer } from "./walk.ts";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "../../fixtures");

/** A listing of a folder on disk as the read channel gives it: dot names left out, sorted by UTF-16 code unit; 404 when it is not a folder. */
function diskList(root: string): (path: string) => Promise<ListAnswer> {
  return async (path) => {
    const dir = join(root, path);
    try {
      if (!statSync(dir).isDirectory()) return { ok: false, status: 404 };
      const entries = readdirSync(dir)
        .sort()
        .filter((name) => !name.startsWith("."))
        .map((name): Entry => {
          const info = statSync(join(dir, name));
          return { name, dir: info.isDirectory(), size: info.isDirectory() ? 0 : info.size };
        });
      return { ok: true, entries, truncated: false };
    } catch {
      return { ok: false, status: 404 };
    }
  };
}

/** A listing from a table of folders: each path's entries, `truncated` where given, a status for a path that fails. */
function tableList(folders: Record<string, (Entry | string)[] | number | { entries: (Entry | string)[]; truncated: true }>): { list: (path: string) => Promise<ListAnswer>; asked: string[] } {
  const asked: string[] = [];
  const entry = (e: Entry | string): Entry => (typeof e === "string" ? (e.endsWith("/") ? { name: e.slice(0, -1), dir: true, size: 0 } : { name: e, dir: false, size: e.length }) : e);
  return {
    asked,
    list: async (path) => {
      asked.push(path);
      const at = folders[path];
      if (at === undefined) return { ok: false, status: 404 };
      if (typeof at === "number") return { ok: false, status: at };
      if (Array.isArray(at)) return { ok: true, entries: at.map(entry), truncated: false };
      return { ok: true, entries: at.entries.map(entry), truncated: true };
    },
  };
}

const sizeOf = (rel: string) => statSync(join(FIXTURES, "assets_project", rel)).size;

describe("§4.2 the walk, on the frozen fixture project", () => {
  const list = diskList(join(FIXTURES, "assets_project"));

  test("Figs/: its two figures, in the channel's order, with their sizes; .gitkeep never appears", async () => {
    const figs = await walk("Figs", list);
    assert.equal(figs.root, "ok");
    assert.equal(figs.empty, false);
    assert.deepEqual(
      figs.files.map((f) => [f.path, f.rel, f.size]),
      ["baseline_training_curves.svg", "probe_comparison.svg"].map((name) => [`Figs/${name}`, name, sizeOf(`Figs/${name}`)]),
    );
    assert.deepEqual(figs.folders, ["Figs"]);
    assert.deepEqual(figs.readmes, []);
  });

  test("Baselines/: depth first, names relative to the group's folder, its README.md found for the descriptions", async () => {
    const baselines = await walk("Baselines", list);
    assert.deepEqual(
      baselines.files.map((f) => [f.rel, f.folder]),
      [
        ["Baseline_readme.md", "Baselines"],
        ["openresearch-demo/README.md", "Baselines/openresearch-demo"],
        ["openresearch-demo/evaluation-metrics.json", "Baselines/openresearch-demo"],
        ["openresearch-demo/training-metrics.csv", "Baselines/openresearch-demo"],
      ],
    );
    assert.deepEqual(baselines.folders, ["Baselines", "Baselines/openresearch-demo"]);
    assert.deepEqual(baselines.readmes, ["Baselines/openresearch-demo/README.md"], "Baseline_readme.md is not a README.md");
  });

  test("Code/results/ and Code/Datasets/: two files, and a folder that holds only a dot file reads as empty", async () => {
    const results = await walk("Code/results", list);
    assert.deepEqual(results.files.map((f) => f.path), ["Code/results/summary.json", "Code/results/training_metrics.csv"]);
    const data = await walk("Code/Datasets", list);
    assert.equal(data.root, "ok");
    assert.equal(data.empty, true);
    assert.deepEqual(data.files, []);
  });

  test("the template's folders: Figs/ empty, Code/results/ missing", async () => {
    const template = diskList(join(FIXTURES, "assets_template"));
    assert.deepEqual([(await walk("Figs", template)).root, (await walk("Figs", template)).empty], ["ok", true]);
    const results = await walk("Code/results", template);
    assert.deepEqual([results.root, results.status, results.files], ["missing", 404, []]);
  });
});

describe("§4.2 the walk's states and caps", () => {
  test("a missing folder (404), and one the app could not list (500, or no answer), are told apart from an empty one", async () => {
    assert.deepEqual(await walk("Figs", tableList({}).list).then((w) => [w.root, w.status, w.empty]), ["missing", 404, false]);
    assert.deepEqual(await walk("Figs", tableList({ Figs: 500 }).list).then((w) => [w.root, w.status]), ["error", 500]);
    assert.deepEqual(await walk("Figs", tableList({ Figs: 0 }).list).then((w) => [w.root, w.status]), ["error", 0]);
    assert.deepEqual(await walk("Figs", tableList({ Figs: [] }).list).then((w) => [w.root, w.empty, w.files.length]), ["ok", true, 0]);
    // Only empty folders: not "empty", and no files.
    const folders = await walk("Figs", tableList({ Figs: ["a/"], "Figs/a": [] }).list);
    assert.deepEqual([folders.empty, folders.files.length, folders.folders], [false, 0, ["Figs", "Figs/a"]]);
  });

  test("a listing the channel cut at 5,000 names is recorded, at the root and below", async () => {
    const { list } = tableList({ Figs: { entries: ["a.png", "sub/"], truncated: true }, "Figs/sub": { entries: ["b.png"], truncated: true } });
    const w = await walk("Figs", list);
    assert.deepEqual(w.truncated, ["Figs", "Figs/sub"]);
    assert.equal(w.empty, false);
    // A cut listing with no entry left is not "empty".
    assert.equal((await walk("Figs", tableList({ Figs: { entries: [], truncated: true } }).list)).empty, false);
  });

  test(`depth: folders ${WALK.depth} levels below the group's are listed, the next level is named and not listed`, async () => {
    const { list, asked } = tableList({
      Figs: ["a/"],
      "Figs/a": ["b/"],
      "Figs/a/b": ["c/"],
      "Figs/a/b/c": ["d/"],
      "Figs/a/b/c/d": ["deep.png", "e/"],
      "Figs/a/b/c/d/e": ["deeper.png"],
    });
    const w = await walk("Figs", list);
    assert.deepEqual(w.files.map((f) => f.rel), ["a/b/c/d/deep.png"]);
    assert.deepEqual(w.deeper, ["Figs/a/b/c/d/e"]);
    assert.ok(!asked.includes("Figs/a/b/c/d/e"), "the folder past the depth is never listed");
  });

  test("a link leading back up (the channel lists the group again under a longer path) ends at the depth cap", async () => {
    const list = async (): Promise<ListAnswer> => ({ ok: true, entries: [{ name: "x.png", dir: false, size: 1 }, { name: "loop", dir: true, size: 0 }], truncated: false });
    const w = await walk("Figs", list);
    assert.deepEqual(w.files.map((f) => f.rel), ["x.png", "loop/x.png", "loop/loop/x.png", "loop/loop/loop/x.png", "loop/loop/loop/loop/x.png"]);
    assert.deepEqual(w.deeper, ["Figs/loop/loop/loop/loop/loop"]);
  });

  test(`listings: at most ${WALK.listings} a group, its own included; the folders past it are named`, async () => {
    const folders: Record<string, string[]> = { Figs: Array.from({ length: 45 }, (_, k) => `f${String(k).padStart(2, "0")}/`) };
    for (let k = 0; k < 45; k++) folders[`Figs/f${String(k).padStart(2, "0")}`] = [`p${k}.png`];
    const { list, asked } = tableList(folders);
    const w = await walk("Figs", list);
    assert.equal(asked.length, WALK.listings);
    assert.equal(w.files.length, WALK.listings - 1);
    assert.deepEqual(w.unlisted, ["Figs/f39", "Figs/f40", "Figs/f41", "Figs/f42", "Figs/f43", "Figs/f44"]);
  });

  test(`files: at most ${WALK.files} a group; the walk stops there and says so`, async () => {
    const names = Array.from({ length: 300 }, (_, k) => `x${String(k).padStart(3, "0")}.csv`);
    const { list, asked } = tableList({ Baselines: [...names, "more/", "zlast/"], "Baselines/more": names, "Baselines/zlast": names });
    const w = await walk("Baselines", list);
    assert.equal(w.files.length, WALK.files);
    assert.equal(w.capped, true);
    assert.equal(w.files[WALK.files - 1]!.rel, `more/${names[WALK.files - 300 - 1]}`);
    assert.ok(!asked.includes("Baselines/zlast"), "nothing is listed past the cap");
    // Exactly the cap is not "more".
    const exact = await walk("Baselines", tableList({ Baselines: Array.from({ length: WALK.files }, (_, k) => `y${k}.csv`) }).list);
    assert.deepEqual([exact.files.length, exact.capped], [WALK.files, false]);
  });

  test("a subfolder that cannot be listed is recorded with its status, and the walk goes on", async () => {
    const { list } = tableList({ Figs: ["a/", "b/", "z.png"], "Figs/a": 404, "Figs/b": ["b.png"] });
    const w = await walk("Figs", list);
    assert.deepEqual(w.failed, [{ folder: "Figs/a", status: 404 }]);
    assert.deepEqual(w.files.map((f) => f.rel), ["b/b.png", "z.png"]);
  });

  test("identity is the path: one name in two folders is two files", async () => {
    const { list } = tableList({ Figs: ["a/", "b/", "plot.png"], "Figs/a": ["plot.png", "README.md"], "Figs/b": ["plot.png", "README.md"] });
    const w = await walk("Figs", list);
    assert.deepEqual(w.files.filter((f) => f.name === "plot.png").map((f) => f.path), ["Figs/a/plot.png", "Figs/b/plot.png", "Figs/plot.png"]);
    assert.deepEqual(w.readmes, ["Figs/a/README.md", "Figs/b/README.md"]);
  });

  test("a dot name in a listing is skipped even if a listing gave one", async () => {
    const w = await walk("Figs", tableList({ Figs: [".gitkeep", ".hidden/", "a.png"] }).list);
    assert.deepEqual(w.files.map((f) => f.name), ["a.png"]);
    assert.deepEqual(w.folders, ["Figs"]);
  });
});
