/**
 * The renderer's view of the plugins (ADR-0006; os-ui/PLUGINS.md, S4): which
 * bundled manifests load, and the pages they contribute, each with the URL
 * its frame loads here. Pure, and imported with .ts extensions, so `node
 * --test` runs it as well as Vite. It may import only the manifest parser
 * and the bundled list: server/registry.ts reads files and stays out of the
 * browser bundle.
 */
import { parseManifest } from "../../server/manifest.ts";
import type { PluginManifest, PluginSource } from "../../server/manifest.ts";

/** Where a page shows: its own left-navigation item, a panel on Home, or a project workspace tab. */
export type Slot = "nav" | "home" | "project";

/** What the Plugins page and a plugin page's band say about a plugin. */
export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  /** The manifest's description, or "" when it has none. */
  description: string;
  source: PluginSource;
}

export interface PluginPage {
  /** "<plugin>/<page>", unique across plugins. */
  key: `${string}/${string}`;
  plugin: string;
  slot: Slot;
  title: string;
  /** The URL the page's frame loads, or null where this environment cannot serve it. */
  src: string | null;
  /** The origin the frame runs on, where it is its own: app://<id> in the desktop client; null in a browser. */
  origin: string | null;
}

/**
 * Parses each bundled plugin's raw plugin.json (`raw`, by folder name) in
 * `ids` order. A plugin that cannot load is reported and skipped, never
 * thrown: no plugin.json, a manifest that fails to parse, or one whose id is
 * not its folder's. Folders not in `ids` are ignored, as on the server.
 */
export function bundledManifests(
  raw: Readonly<Record<string, unknown>>,
  ids: readonly string[],
): { plugins: PluginManifest[]; problems: string[] } {
  const plugins: PluginManifest[] = [];
  const problems: string[] = [];
  for (const id of ids) {
    if (!Object.prototype.hasOwnProperty.call(raw, id)) {
      problems.push(`${id}: no plugin.json`);
      continue;
    }
    const parsed = parseManifest(raw[id], "bundled");
    if (!parsed.ok) {
      problems.push(`${id}: ${parsed.problems.join("; ")}`);
      continue;
    }
    if (parsed.manifest.id !== id) {
      problems.push(`${id}: plugin.json names the id "${parsed.manifest.id}"; a plugin's folder is named after its id`);
      continue;
    }
    plugins.push(parsed.manifest);
  }
  return { plugins, problems };
}

export function pluginInfo(manifest: PluginManifest, source: PluginSource): PluginInfo {
  return { id: manifest.id, name: manifest.name, version: manifest.version, description: manifest.description ?? "", source };
}

/**
 * Left-navigation pages that draw their own top, as the app's own pages do:
 * the layout shows only their frame, filling the page area, with no host band
 * or title above it. Skills Hub's Skills page draws today's Skills header
 * under mockup C's band itself (os-ui/PLUGINS.md Part 4, Q1, top C). Bundled
 * pages only; every other page keeps the host's band (Paper wiki).
 */
export const OWN_TOP: ReadonlySet<string> = new Set(["skills-hub/skills"]);

/**
 * Left-navigation pages whose frame may write text to the clipboard: the
 * Skills page's copy buttons. A cross-origin frame needs
 * allow="clipboard-write" for navigator.clipboard.writeText (Part 4 §5, C0:
 * refused by the permissions policy without it). Bundled pages only; never
 * Paper Wiki's, which runs inline script and draws note HTML.
 */
export const CLIPBOARD_WRITE: ReadonlySet<string> = new Set(["skills-hub/skills"]);

/** How the layout frames a left-navigation page here: its own top or the host's band, and its frame's `allow`. */
export function navFrame(page: PluginPage, plugin: PluginInfo): { ownTop: boolean; allow: string | undefined } {
  const ours = plugin.source === "bundled" && plugin.id === page.plugin && page.src !== null;
  return {
    ownTop: ours && OWN_TOP.has(page.key),
    allow: ours && CLIPBOARD_WRITE.has(page.key) ? "clipboard-write" : undefined,
  };
}

/**
 * A project view's frame URL for one project: its `src` with
 * `?project=<folder name>` (or `&project=` when it has a query already), the
 * name encoded, so `+`, `&`, or `#` stay part of it. null where the page has
 * no frame URL here.
 */
export function viewSrc(page: PluginPage, project: string): string | null {
  if (page.src === null) return null;
  return `${page.src}${page.src.includes("?") ? "&" : "?"}project=${encodeURIComponent(project)}`;
}

/**
 * Every page the plugins contribute, in plugin order and, within a plugin,
 * its home panels and then its project views, each in manifest order. A
 * home panel with `placement: "nav"` gets the slot "nav".
 *
 * The frame URL: in the desktop client, the plugin's own origin,
 * app://<id>/<entry>. In a browser (the dev server and the static build),
 * the copy of a `site.workspace` folder those serve beside the app,
 * ./<folder>/<entry>; a plugin without one cannot be served there (null).
 */
export function pluginPages(plugins: readonly PluginManifest[], env: { desktop: boolean }): PluginPage[] {
  return plugins.flatMap((manifest) => {
    const { id, site, contributes } = manifest;
    const at = (entry: string) => (env.desktop ? `app://${id}/${entry}` : site !== undefined ? `./${site.workspace}/${entry}` : null);
    const origin = env.desktop ? `app://${id}` : null;
    const page = (p: { id: string; title: string; entry: string }, slot: Slot): PluginPage => ({
      key: `${id}/${p.id}`,
      plugin: id,
      slot,
      title: p.title,
      src: at(p.entry),
      origin,
    });
    return [
      ...(contributes.homePanels ?? []).map((p) => page(p, p.placement === "nav" ? "nav" : "home")),
      ...(contributes.projectViews ?? []).map((p) => page(p, "project")),
    ];
  });
}
