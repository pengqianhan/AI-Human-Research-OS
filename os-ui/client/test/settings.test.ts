import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { defaultSettings, loadSettings, MAX_RECENT, parseSettings, rememberWorkspace, saveSettings } from "../src/main/settings.ts";
import { tempTree } from "./helpers.ts";

describe("settings", () => {
  test("missing, malformed, or non-object files give defaults", () => {
    assert.deepEqual(parseSettings(null), defaultSettings());
    assert.deepEqual(parseSettings("{oops"), defaultSettings());
    assert.deepEqual(parseSettings("[1,2]"), defaultSettings());
    assert.deepEqual(parseSettings('"text"'), defaultSettings());
  });

  test("each field is checked on its own", () => {
    const s = parseSettings(
      JSON.stringify({
        workspace: "/w",
        recentWorkspaces: ["/a", 3, "", "/b", "/c", "/d", "/e", "/f"],
        notifications: "yes",
        window: { x: 10, y: "top", width: 1200, height: 800, maximized: true },
      }),
    );
    assert.equal(s.workspace, "/w");
    assert.deepEqual(s.recentWorkspaces, ["/a", "/b", "/c", "/d", "/e"]);
    assert.equal(s.notifications, true, "a non-boolean keeps the default");
    assert.deepEqual(s.window, { x: 10, y: null, width: 1200, height: 800, maximized: true });
  });

  test("a window too small or without size is dropped", () => {
    assert.equal(parseSettings(JSON.stringify({ window: { width: 50, height: 800 } })).window, null);
    assert.equal(parseSettings(JSON.stringify({ window: { x: 1 } })).window, null);
    assert.equal(parseSettings(JSON.stringify({ window: { width: Infinity, height: 800 } })).window, null);
  });

  test("save then load round-trips, atomically, creating the folder", () => {
    const dir = tempTree();
    const file = join(dir, "nested", "settings.json");
    const settings = { ...defaultSettings(), workspace: "/w", notifications: false };
    saveSettings(file, settings);
    assert.deepEqual(loadSettings(file), settings);
    assert.deepEqual(readdirSync(join(dir, "nested")), ["settings.json"], "no temp file left behind");
    assert.ok(readFileSync(file, "utf8").endsWith("\n"));
  });

  test("an unreadable file loads as defaults", () => {
    const dir = tempTree();
    assert.deepEqual(loadSettings(join(dir, "absent.json")), defaultSettings());
    writeFileSync(join(dir, "bad.json"), "\u0000\u0001");
    assert.deepEqual(loadSettings(join(dir, "bad.json")), defaultSettings());
    assert.ok(!existsSync(join(dir, "absent.json")));
  });

  test("rememberWorkspace moves the folder to the front, without duplicates", () => {
    let s = defaultSettings();
    for (const dir of ["/a", "/b", "/c"]) s = rememberWorkspace(s, dir, "linux");
    assert.deepEqual(s.recentWorkspaces, ["/c", "/b", "/a"]);
    s = rememberWorkspace(s, "/a", "linux");
    assert.equal(s.workspace, "/a");
    assert.deepEqual(s.recentWorkspaces, ["/a", "/c", "/b"]);
    for (let i = 0; i < 10; i++) s = rememberWorkspace(s, `/x${i}`, "linux");
    assert.equal(s.recentWorkspaces.length, MAX_RECENT);
  });

  test("on Windows and macOS, folder names differing only in case are the same folder", () => {
    let s = rememberWorkspace(defaultSettings(), "C:\\Research", "win32");
    s = rememberWorkspace(s, "c:\\research", "win32");
    assert.deepEqual(s.recentWorkspaces, ["c:\\research"]);
    let l = rememberWorkspace(defaultSettings(), "/Research", "linux");
    l = rememberWorkspace(l, "/research", "linux");
    assert.equal(l.recentWorkspaces.length, 2);
  });
});
