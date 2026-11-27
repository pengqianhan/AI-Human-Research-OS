import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Mount } from "./api.ts";
import { parseManifest, safeRelative } from "./manifest.ts";
import type { PluginManifest, PluginSource } from "./manifest.ts";
import type { ApiContext, ApiHandler } from "./types.ts";

/**
 * The plugin registry (ADR-0006): which plugins are loaded and which
 * endpoints the trunk and those plugins mount. Server only.
 *
 * Host-side handlers are for bundled plugins only, held by three independent
 * locks: the loader is told the source and never reads it from a manifest;
 * the parser refuses `handlers` from any other source; and handler code
 * exists only in the compiled-in factories (pluginHandlers.ts), which
 * createRegistry mounts for bundled plugins alone. Nothing here imports code
 * from a plugin folder; a folder supplies only its plugin.json.
 */

export type HandlerFactory = (ctx: ApiContext) => ApiHandler;

/** One of the app's own endpoints, before its handler is built for a workspace. */
export interface TrunkMount {
  prefix: string;
  factory: HandlerFactory;
  /** Whether the endpoint needs this launch's X-OS-UI-Token. */
  token: boolean;
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  source: PluginSource;
  /** The plugin's folder. */
  dir: string;
}

/** Whether /api/<id> and a trunk prefix share a path at a segment boundary, either way round. */
function overlaps(base: string, prefix: string): boolean {
  return base === prefix || prefix.startsWith(`${base}/`) || base.startsWith(`${prefix}/`);
}

/**
 * Reads `<root>/<id>/plugin.json` for each id, in order. A plugin that cannot
 * load is reported and skipped, never thrown: an unreadable or unparsable
 * manifest, a manifest whose id is not its folder's, an id that is loaded
 * already, a local plugin taking a bundled plugin's id, or an /api/<id> that
 * overlaps a trunk prefix.
 */
export function loadPlugins(
  root: string,
  ids: readonly string[],
  source: PluginSource,
  taken: { trunk: readonly TrunkMount[]; plugins: readonly LoadedPlugin[] },
): { plugins: LoadedPlugin[]; problems: string[] } {
  const plugins: LoadedPlugin[] = [];
  const problems: string[] = [];
  for (const id of ids) {
    if (id.includes("/") || safeRelative(id) !== id) {
      problems.push(`"${id}" is not a plugin folder name`);
      continue;
    }
    const dir = resolve(root, id);
    let raw: unknown;
    try {
      // A byte-order mark, which some Windows editors write, is not JSON.
      raw = JSON.parse(readFileSync(resolve(dir, "plugin.json"), "utf8").replace(/^\uFEFF/, ""));
    } catch (error) {
      problems.push(`${id}: cannot read plugin.json: ${(error as Error).message ?? error}`);
      continue;
    }
    const parsed = parseManifest(raw, source);
    if (!parsed.ok) {
      problems.push(...parsed.problems.map((p) => `${id}: ${p}`));
      continue;
    }
    const manifest = parsed.manifest;
    if (manifest.id !== id) {
      problems.push(`${id}: plugin.json names the id "${manifest.id}"; a plugin's folder is named after its id`);
      continue;
    }
    const earlier = [...taken.plugins, ...plugins].find((p) => p.manifest.id === id);
    if (earlier !== undefined) {
      problems.push(
        source === "local" && earlier.source === "bundled"
          ? `${id}: a local plugin cannot take the id of a bundled plugin`
          : `${id}: a plugin with this id is loaded already`,
      );
      continue;
    }
    const clash = taken.trunk.find((t) => overlaps(`/api/${id}`, t.prefix));
    if (clash !== undefined) {
      problems.push(`${id}: /api/${id} overlaps the app's endpoint ${clash.prefix}`);
      continue;
    }
    plugins.push({ manifest, source, dir });
  }
  return { plugins, problems };
}

export interface Registry {
  plugins: readonly LoadedPlugin[];
  /** app://superresearch-os: the trunk's endpoints only. */
  app: readonly Mount[];
  /** app://<id>: that plugin's handlers only, always without the token. */
  byPlugin: ReadonlyMap<string, readonly Mount[]>;
  /** The dev server's single origin: the trunk's endpoints, then each plugin's. */
  all: readonly Mount[];
}

/**
 * The endpoints for one open workspace. Handlers are mounted for bundled
 * plugins only, at /api/<id>/<handler>, and never take the token: the token
 * never reaches a plugin's frame. It does not trust its input to come from
 * loadPlugins, and throws on a list the loader would never produce: a
 * repeated plugin id, or an /api/<id> overlapping a trunk prefix (either
 * could replace or shadow an endpoint). It also throws on factory drift, a
 * declared handler without a factory or a factory nobody declares, which is
 * a bundling bug the tests catch.
 *
 * `skip` holds handler keys (`<plugin id>/<handler>`) that a bundled manifest
 * may declare without a factory being required or mounted, such as a
 * desktop-only handler on the dev server. A skipped key's factory, when
 * there is one, is never built; it still counts as declared, so it is no
 * orphan, while a factory nobody declares stays drift whether skipped or not.
 * A skipped key no bundled plugin declares is drift too (a stale key after a
 * rename).
 */
export function createRegistry(input: {
  ctx: ApiContext;
  trunk: readonly TrunkMount[];
  plugins: readonly LoadedPlugin[];
  factories: Readonly<Record<string, HandlerFactory>>;
  skip?: ReadonlySet<string>;
}): Registry {
  const { ctx, trunk, plugins, factories } = input;
  const skip = input.skip ?? new Set<string>();
  const ids = new Set<string>();
  for (const { manifest } of plugins) {
    if (ids.has(manifest.id)) throw new Error(`plugin registry: the id "${manifest.id}" is listed twice`);
    ids.add(manifest.id);
    const clash = trunk.find((t) => overlaps(`/api/${manifest.id}`, t.prefix));
    if (clash !== undefined) throw new Error(`plugin registry: /api/${manifest.id} overlaps the app's endpoint ${clash.prefix}`);
  }

  const declared = plugins
    .filter((p) => p.source === "bundled")
    .flatMap((p) => (p.manifest.contributes.handlers ?? []).map((h) => `${p.manifest.id}/${h}`));
  const missing = declared.filter((key) => !skip.has(key) && !Object.prototype.hasOwnProperty.call(factories, key));
  const orphans = Object.keys(factories).filter((key) => !declared.includes(key));
  const stale = [...skip].filter((key) => !declared.includes(key));
  if (missing.length > 0 || orphans.length > 0 || stale.length > 0) {
    const parts = [
      ...missing.map((key) => `${key} is declared but has no factory`),
      ...orphans.map((key) => `${key} has a factory but no bundled plugin declares it`),
      ...stale.map((key) => `${key} is skipped but no bundled plugin declares it`),
    ];
    throw new Error(`plugin handler drift: ${parts.join("; ")}`);
  }

  const app: Mount[] = trunk.map((t) => ({ prefix: t.prefix, handler: t.factory(ctx), token: t.token }));
  const byPlugin = new Map<string, readonly Mount[]>();
  for (const plugin of plugins) {
    const id = plugin.manifest.id;
    const handlers =
      plugin.source === "bundled" ? (plugin.manifest.contributes.handlers ?? []).filter((h) => !skip.has(`${id}/${h}`)) : [];
    byPlugin.set(
      id,
      handlers.map((h) => ({ prefix: `/api/${id}/${h}`, handler: factories[`${id}/${h}`]!(ctx), token: false })),
    );
  }
  return { plugins, app, byPlugin, all: [...app, ...[...byPlugin.values()].flat()] };
}
