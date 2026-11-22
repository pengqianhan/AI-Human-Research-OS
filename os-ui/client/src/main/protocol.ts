import { readFile, realpath, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";
import * as path from "node:path";
import { matchMount } from "../../../frontend/server/api.ts";
import type { Mount } from "../../../frontend/server/api.ts";
import { safeRelative } from "../../../frontend/server/manifest.ts";
import type { PluginSource } from "../../../frontend/server/manifest.ts";
import { createRegistry } from "../../../frontend/server/registry.ts";
import type { HandlerFactory, LoadedPlugin, Registry, TrunkMount } from "../../../frontend/server/registry.ts";
import type { ApiContext, ApiRequest } from "../../../frontend/server/types.ts";

/**
 * A URL path as a safe relative path, or null. It lives with the plugin
 * manifest, whose paths follow the same rule, and is re-exported here for
 * this module's callers.
 */
export { safeRelative };

export const SCHEME = "app";
/** The app itself: renderer, state.json, and the trunk's endpoints. */
export const APP_HOST = "research-os";
export const ORIGIN = `${SCHEME}://${APP_HOST}`;
export const HOME_URL = `${ORIGIN}/`;

/**
 * Where one loaded plugin's origin, app://<id>, takes its pages from. Each
 * plugin has an origin of its own, so no plugin page shares storage, the
 * bridge, or endpoints with the app or with another plugin: Paper Wiki's
 * viewer, for one, renders note bodies written from outside sources as HTML.
 * - `workspace`: a folder of the open workspace, served in place and confined
 *   by real path (Paper Wiki: paper-wiki/; bundled plugins only);
 * - `plugin`: the `site/` folder beside the plugin's plugin.json. A bundled
 *   plugin's is the app's own and may sit inside the asar archive, where
 *   realpath is not available, so it is confined lexically; any other
 *   plugin's is confined by real path, so a link in it cannot leave it.
 * `reads` are the workspace roots the plugin's read channel will serve (S5).
 */
export interface PluginSite {
  id: string;
  source: PluginSource;
  reads: readonly string[];
  files: { kind: "plugin"; dir: string } | { kind: "workspace"; rel: string };
}

/**
 * The site of each loaded plugin, by id, in load order (the order of the app
 * policy's frame-src). Only a bundled plugin may serve a workspace folder; the
 * manifest parser refuses `site` from any other source as well.
 */
export function pluginSites(plugins: readonly LoadedPlugin[]): ReadonlyMap<string, PluginSite> {
  const sites = new Map<string, PluginSite>();
  for (const { manifest, source, dir } of plugins) {
    const files: PluginSite["files"] =
      source === "bundled" && manifest.site !== undefined
        ? { kind: "workspace", rel: manifest.site.workspace }
        : { kind: "plugin", dir: path.join(dir, "site") };
    sites.set(manifest.id, { id: manifest.id, source, reads: manifest.reads ?? [], files });
  }
  return sites;
}

/**
 * Content-Security-Policy for the app's own pages; `hosts` are the plugin
 * origins its pages may frame, in order.
 */
export function appCsp(hosts: readonly string[]): string {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data:",
    "connect-src 'self'",
    `frame-src ${hosts.length === 0 ? "'none'" : hosts.map((h) => `${SCHEME}://${h}`).join(" ")}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
}

/**
 * Content-Security-Policy for a plugin site served from a workspace folder
 * (Paper Wiki's viewer): its own inline scripts and styles, its own origin
 * for its endpoints, nothing else — no remote images, frames, forms, or
 * fetches, whatever a note contains.
 */
export const WORKSPACE_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

/** Content-Security-Policy for a site shipped in its plugin folder: WORKSPACE_CSP plus its own script and style files. */
export const PLUGIN_CSP = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

/**
 * Whether a frame may navigate to `url`: the top frame stays on the app's
 * origin; a subframe may load a loaded plugin's origin (`hosts`) or a blank
 * document, and nothing else.
 */
export function allowedNavigation(url: string, isMainFrame: boolean, hosts: readonly string[]): boolean {
  if (isMainFrame) return url.startsWith(`${ORIGIN}/`);
  return hosts.some((h) => url.startsWith(`${SCHEME}://${h}/`)) || url === "about:blank" || url === "about:srcdoc";
}

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
};

export function contentType(file: string): string {
  return TYPES[extname(file).toLowerCase()] ?? "application/octet-stream";
}

export type Route =
  /** `host`: whose mounts answer, the app's (APP_HOST) or one plugin's (its id). */
  | { kind: "api"; pathname: string; host: string }
  /** `confined`: resolve symlinks and refuse a real path outside `root` (workspace files). */
  | { kind: "file"; root: string; rel: string; fallback: string | null; csp: string | null; confined: boolean }
  | { kind: "not-found" };

/** URL paths below a plugin's origin that the host keeps for itself: never files. */
const RESERVED = ["api", "_os"];

/**
 * Whether `rel` is "" or lies below a reserved first segment, compared the way
 * a case-insensitive file system, or Windows (which also drops a trailing dot
 * or space), would resolve it: "API/x", "_OS/x" and "api./x" are reserved too.
 */
function reserved(rel: string): boolean {
  const first = rel.split("/")[0]!.toLowerCase().replace(/[. ]+$/, "");
  return rel === "" || RESERVED.includes(first);
}

/**
 * Where one app:// URL is served from.
 * - app://research-os/api/... → the trunk's endpoints;
 * - app://research-os/state.json → the workspace's generated snapshot;
 * - app://research-os/... → the bundled renderer, `index.html` as the
 *   fallback for extension-less paths;
 * - app://<id>/api/<id>/... → that plugin's own endpoints, and no others;
 * - app://<id>/... → that plugin's site (PluginSite); "", api/ and _os/ are
 *   never files (_os/ is kept for the read channel);
 * - any other host → not found.
 */
export function route(
  url: string,
  roots: { renderer: string; workspace: string | null },
  sites: ReadonlyMap<string, PluginSite>,
): Route {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { kind: "not-found" };
  }
  if (parsed.protocol !== `${SCHEME}:`) return { kind: "not-found" };
  const pathname = parsed.pathname;

  if (parsed.host !== APP_HOST) {
    const site = sites.get(parsed.host);
    return site === undefined ? { kind: "not-found" } : siteRoute(site, pathname, roots.workspace);
  }

  if (pathname === "/api" || pathname.startsWith("/api/")) return { kind: "api", pathname, host: APP_HOST };
  const rel = safeRelative(pathname);
  if (rel === null) return { kind: "not-found" };
  if (rel === "state.json") {
    if (roots.workspace === null) return { kind: "not-found" };
    return { kind: "file", root: path.join(roots.workspace, "os-ui", "frontend", "public"), rel, fallback: null, csp: null, confined: true };
  }
  const file = rel === "" ? "index.html" : rel;
  const fallback = extname(file) === "" ? "index.html" : null;
  // The renderer is the app's own bundle (possibly inside an asar archive, where
  // realpath is not available), so it is confined lexically only.
  const page = extname(file).toLowerCase() === ".html" || fallback !== null;
  return { kind: "file", root: roots.renderer, rel: file, fallback, csp: page ? appCsp([...sites.keys()]) : null, confined: false };
}

/** One URL on a plugin's own origin. */
function siteRoute(site: PluginSite, pathname: string, workspace: string | null): Route {
  const own = `/api/${site.id}`;
  if (pathname === own || pathname.startsWith(`${own}/`)) return { kind: "api", pathname, host: site.id };
  const rel = safeRelative(pathname);
  if (rel === null || reserved(rel)) return { kind: "not-found" };
  // Every file the site serves carries its policy, not only HTML: an SVG a
  // frame is sent to is a document too, and would otherwise run its scripts unfenced.
  if (site.files.kind === "plugin") {
    return { kind: "file", root: site.files.dir, rel, fallback: null, csp: PLUGIN_CSP, confined: site.source !== "bundled" };
  }
  if (workspace === null) return { kind: "not-found" };
  return { kind: "file", root: path.join(workspace, site.files.rel), rel, fallback: null, csp: WORKSPACE_CSP, confined: true };
}

/** True when `child` is `parent` or inside it (`p` is path.win32 or path.posix in tests). */
export function isInside(parent: string, child: string, p: typeof path.posix = path): boolean {
  const rel = p.relative(parent, child);
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${p.sep}`) && !p.isAbsolute(rel));
}

/**
 * Reads `rel` under `root`. A confined read also resolves symlinks and
 * refuses a file whose real path leaves `root`.
 */
async function readInside(root: string, rel: string, confined: boolean): Promise<Buffer | null> {
  try {
    let file = resolve(root, rel);
    if (!isInside(resolve(root), file)) return null;
    if (confined) {
      const real = await realpath(file);
      if (!isInside(await realpath(root), real)) return null;
      file = real;
    }
    if (!(await stat(file)).isFile()) return null;
    return await readFile(file);
  } catch {
    return null;
  }
}

function notFound(): Response {
  return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export async function serveFile(route: Extract<Route, { kind: "file" }>): Promise<Response> {
  let rel = route.rel;
  let body = await readInside(route.root, rel, route.confined);
  if (body === null && route.fallback !== null) {
    rel = route.fallback;
    body = await readInside(route.root, rel, route.confined);
  }
  if (body === null) return notFound();
  const headers: Record<string, string> = {
    "Content-Type": contentType(rel),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (route.csp !== null) headers["Content-Security-Policy"] = route.csp;
  return new Response(new Uint8Array(body), { status: 200, headers });
}

/** A Fetch request below a mount, as the shared core's ApiRequest. */
export function toApiRequest(request: Request, path: string, query: URLSearchParams): ApiRequest {
  return {
    method: request.method,
    path,
    query,
    async json() {
      const text = await request.text();
      return JSON.parse(text || "{}") as unknown;
    },
  };
}

function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/**
 * One endpoint call. Writes must be `Content-Type: application/json`, which a
 * form or a no-cors fetch from another origin cannot send; token mounts also
 * need this launch's token, as on the dev server.
 */
export async function serveApi(request: Request, mounts: readonly Mount[] | null, token: string): Promise<Response> {
  const url = new URL(request.url);
  if (mounts === null) return reply(503, { error: "no Research OS folder is open; choose one first" });
  const hit = matchMount(mounts, url.pathname);
  if (hit === null) return reply(404, { error: `no endpoint ${url.pathname}` });
  if (request.method !== "GET" && request.method !== "HEAD") {
    const type = (request.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
    if (type !== "application/json") return reply(415, { error: "writes must be application/json" });
  }
  if (hit.mount.token && request.headers.get("x-os-ui-token") !== token) return reply(401, { error: "token required" });
  try {
    const response = await hit.mount.handler(toApiRequest(request, hit.path, url.searchParams));
    return reply(response.status, response.body);
  } catch (error) {
    return reply(500, { error: String((error as Error).message ?? error) });
  }
}

/**
 * The endpoints for one open workspace: createRegistry's, or, when it throws
 * (a bundled plugin's declared handlers and the compiled-in factories
 * disagree, a bundling bug), the trunk's alone. The problem is reported once,
 * and the drifted plugins lose their endpoints instead of the window.
 */
export function workspaceRegistry(
  input: {
    ctx: ApiContext;
    trunk: readonly TrunkMount[];
    plugins: readonly LoadedPlugin[];
    factories: Readonly<Record<string, HandlerFactory>>;
  },
  report: (problem: string) => void,
): Registry {
  try {
    return createRegistry(input);
  } catch (error) {
    report(`plugin endpoints not mounted, only the app's own: ${String((error as Error).message ?? error)}`);
    return createRegistry({ ctx: input.ctx, trunk: input.trunk, plugins: [], factories: {} });
  }
}

/**
 * The mounts an origin reaches: the trunk's on the app's own, a plugin's own
 * handlers on its origin (none when the registry has no entry for it), and
 * null while no workspace is open.
 */
function mountsFor(registry: Registry | null, host: string): readonly Mount[] | null {
  if (registry === null) return null;
  return host === APP_HOST ? registry.app : (registry.byPlugin.get(host) ?? []);
}

/**
 * The whole app:// handler, Electron-free so it can be tested in plain Node.
 * `sites` are the plugins loaded at startup; `registry` holds the open
 * workspace's endpoints, or is null while none is open. The app policy is
 * derived from `sites` (see route), so it always frames exactly those origins.
 */
export function createHandler(
  state: () => {
    renderer: string;
    workspace: string | null;
    sites: ReadonlyMap<string, PluginSite>;
    registry: Registry | null;
    token: string;
  },
) {
  return async (request: Request): Promise<Response> => {
    const current = state();
    const r = route(request.url, current, current.sites);
    if (r.kind === "api") return serveApi(request, mountsFor(current.registry, r.host), current.token);
    if (r.kind === "file") {
      if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
      return serveFile(r);
    }
    return notFound();
  };
}
