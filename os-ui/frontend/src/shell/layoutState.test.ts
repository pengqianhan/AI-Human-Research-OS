import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { BUNDLED_IDS } from "../../plugins/bundled.ts";
import { bundledManifests, pluginPages } from "../plugins/pages.ts";
import { DEFAULT_LAYOUT, readLayout } from "./layoutState.ts";

const PLUGINS = resolve(dirname(fileURLToPath(import.meta.url)), "../../plugins");

/** The keys of the real bundled plugins' left-navigation pages, as the Shell passes them. */
function navKeys(): string[] {
  const raw = Object.fromEntries(BUNDLED_IDS.map((id) => [id, JSON.parse(readFileSync(resolve(PLUGINS, id, "plugin.json"), "utf8")) as unknown]));
  return pluginPages(bundledManifests(raw, BUNDLED_IDS).plugins, { desktop: true })
    .filter((p) => p.slot === "nav")
    .map((p) => p.key);
}

describe("the saved layout (localStorage osui.layout.v1)", () => {
  test('a screen saved as "wiki", before S4, opens the Paper wiki page', () => {
    const keys = navKeys();
    assert.ok(keys.includes("paper-wiki/viewer"), `the Paper wiki page is loaded: ${JSON.stringify(keys)}`);
    assert.equal(readLayout({ screen: "wiki" }, keys).screen, "paper-wiki/viewer");
    assert.equal(readLayout({ screen: "paper-wiki/viewer" }, keys).screen, "paper-wiki/viewer");
  });

  test("a saved plugin page whose plugin is not loaded opens Home", () => {
    assert.equal(readLayout({ screen: "gone/viewer" }, navKeys()).screen, "home");
    assert.equal(readLayout({ screen: "paper-wiki/viewer" }, []).screen, "home");
    assert.equal(readLayout({ screen: "wiki" }, []).screen, "home");
  });

  test("the app's own pages are kept; anything else opens Home", () => {
    for (const screen of ["home", "projects", "skills", "plugins", "settings", "workspace"]) {
      assert.equal(readLayout({ screen }, []).screen, screen);
    }
    for (const screen of ["dash", "", 1, null, "constructor", "paper-wiki"]) {
      assert.equal(readLayout({ screen }, navKeys()).screen, "home", JSON.stringify(screen));
    }
  });

  test("the other fields keep their valid values and drop the rest", () => {
    assert.deepEqual(
      readLayout({ screen: "workspace", project: "nanochat_cpu", sidebarCollapsed: true, homeConversationOpen: true, conversationCollapsed: true, tab: "code" }, []),
      { screen: "workspace", project: "nanochat_cpu", sidebarCollapsed: true, homeConversationOpen: true, conversationCollapsed: true, tab: "code" },
    );
    assert.deepEqual(readLayout({ project: 3, sidebarCollapsed: "yes", tab: "idea" }, []), DEFAULT_LAYOUT);
    for (const raw of [null, [], "x", 1]) assert.deepEqual(readLayout(raw, []), DEFAULT_LAYOUT);
  });
});
