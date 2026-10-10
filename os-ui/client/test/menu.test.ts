import assert from "node:assert/strict";
import { test } from "node:test";
import type { MenuItemConstructorOptions } from "electron";
import { menuTemplate } from "../src/main/menu.ts";
import type { MenuActions } from "../src/main/menu.ts";

function actions(log: string[]): MenuActions {
  const record = (name: string) => (arg?: unknown) => log.push(arg === undefined ? name : `${name}:${String(arg)}`);
  return {
    openWorkspace: record("open"),
    openRecent: record("recent"),
    revealWorkspace: record("reveal"),
    regenerate: record("regenerate"),
    showSystem: record("system"),
    setNotifications: record("notify"),
    showLog: record("log"),
    openDocs: record("docs"),
  };
}

const find = (items: MenuItemConstructorOptions[], label: string): MenuItemConstructorOptions | undefined => {
  for (const item of items) {
    if (item.label === label) return item;
    if (Array.isArray(item.submenu)) {
      const hit = find(item.submenu, label);
      if (hit) return hit;
    }
  }
  return undefined;
};

const click = (item: MenuItemConstructorOptions | undefined, checked?: boolean) =>
  (item!.click as unknown as (i: { checked?: boolean }) => void)({ checked });

test("macOS gets an app menu; others get Quit and About under File and Help", () => {
  const base = { appName: "Research OS", recent: [], hasWorkspace: true, notifications: true, actions: actions([]) };
  const mac = menuTemplate({ ...base, platform: "darwin" });
  assert.equal(mac[0]!.label, "Research OS");
  const win = menuTemplate({ ...base, platform: "win32" });
  assert.equal(win[0]!.label, "File");
  assert.ok((win[0]!.submenu as MenuItemConstructorOptions[]).some((i) => i.role === "quit"));
  assert.equal(find(win, "Reveal Folder in Explorer")?.enabled, true);
  assert.ok(find(menuTemplate({ ...base, platform: "linux" }), "Reveal Folder in File Manager"));
  assert.ok(find(mac, "Reveal Folder in Finder"));
});

test("items call their actions", () => {
  const log: string[] = [];
  const items = menuTemplate({ platform: "linux", appName: "Research OS", recent: ["/a", "/b"], hasWorkspace: true, notifications: false, actions: actions(log) });
  click(find(items, "Open Research OS Folder…"));
  click(find(items, "/b"));
  click(find(items, "Regenerate Snapshot"));
  click(find(items, "System and Prerequisites"));
  click(find(items, "Notify When Agent Turns End"), true);
  assert.deepEqual(log, ["open", "recent:/b", "regenerate", "system", "notify:true"]);
  assert.equal(find(items, "Notify When Agent Turns End")?.checked, false);
  assert.equal(find(items, "Open Research OS Folder…")?.accelerator, "CmdOrCtrl+O");
});

test("without a folder, folder actions are disabled and Open Recent says it is empty", () => {
  const items = menuTemplate({ platform: "linux", appName: "x", recent: [], hasWorkspace: false, notifications: true, actions: actions([]) });
  assert.equal(find(items, "Regenerate Snapshot")?.enabled, false);
  assert.equal(find(items, "Reveal Folder in File Manager")?.enabled, false);
  assert.equal(find(items, "No Recent Folders")?.enabled, false);
});
