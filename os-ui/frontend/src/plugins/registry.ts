/**
 * The plugins the renderer shows (ADR-0006; os-ui/PLUGINS.md, S4). Vite
 * only: in step 1 these are the bundled manifests, compiled in from
 * plugins/<id>/plugin.json and kept in BUNDLED_IDS order, with no request at
 * run time. Step 2 adds local plugins fetched from the desktop client;
 * usePlugins() hides where they came from, so its callers do not change.
 */
import { BUNDLED_IDS } from "../../plugins/bundled.ts";
import { DESKTOP } from "../lib/mode";
import type { IconName } from "../shell/icons";
import { bundledManifests, pluginInfo, pluginPages } from "./pages.ts";
import type { PluginInfo, PluginPage } from "./pages.ts";

const files = import.meta.glob<unknown>("../../plugins/*/plugin.json", { eager: true, import: "default" });

/** Each raw plugin.json by its folder name: "../../plugins/<id>/plugin.json" → <id>. */
const raw = Object.fromEntries(Object.entries(files).map(([path, json]) => [path.split("/").slice(-2, -1)[0]!, json]));

const loaded = bundledManifests(raw, BUNDLED_IDS);
// A plugin that does not load is left out; the app still renders.
for (const problem of loaded.problems) console.error(`os-ui plugin not loaded: ${problem}`);

const PLUGINS: readonly PluginInfo[] = loaded.plugins.map((m) => pluginInfo(m, "bundled"));
const PAGES: readonly PluginPage[] = pluginPages(loaded.plugins, { desktop: DESKTOP });

/** The loaded plugins, in menu order, and every page they contribute. */
export function usePlugins(): { plugins: readonly PluginInfo[]; pages: readonly PluginPage[] } {
  return { plugins: PLUGINS, pages: PAGES };
}

/**
 * A bundled plugin's icon in the left navigation and on the Plugins page.
 * The manifest has no icon field, so the renderer keeps this short list;
 * any other plugin shows the puzzle piece.
 */
const ICONS: ReadonlyMap<string, IconName> = new Map<string, IconName>([
  ["paper-wiki", "book"],
  ["code-view", "file"],
  ["paper-view", "projects"],
]);

export function pluginIcon(id: string): IconName {
  return ICONS.get(id) ?? "puzzle";
}
