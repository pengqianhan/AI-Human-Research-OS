import { constants } from "node:fs";
import { open, opendir, readFile, realpath, stat } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { extname, resolve } from "node:path";
import * as path from "node:path";
import { matchMount } from "../../../frontend/server/api.ts";
import type { Mount } from "../../../frontend/server/api.ts";
import { matchRoot, safeDecodedRelative, safeRelative } from "../../../frontend/server/manifest.ts";
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
export const APP_HOST = "superresearch-os";
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
 * `reads` are the workspace roots the plugin's read channel serves (serveRead).
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

/**
 * Content-Security-Policy for a site shipped in its plugin folder (the Code
 * view's): its own script and style files only, no inline script or style,
 * since such a page shows untrusted names and text (WORKSPACE_CSP keeps
 * inline code for Paper Wiki's generated viewer). Styles set through the DOM
 * (element.style) are not inline styles and still apply.
 */
export const PLUGIN_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

/**
 * Content-Security-Policy for every read channel response: a workspace file a
 * frame is sent to is an inert document, with no script, no frames or forms,
 * and an origin of its own (`sandbox`), whatever the file holds.
 */
export const READ_CSP = "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'";

/**
 * The read channel's limits. A project's Code/ may hold checkpoints and
 * datasets, which no view shows: a file larger than this answers 413 without
 * being read. 32 MiB is well above a paper's PDF or a source file, which are
 * what the Code and Paper views show.
 */
export const READ_MAX_BYTES = 32 * 1024 * 1024;
/**
 * At most this many names are read from a folder for one listing, in the
 * order the file system gives them, so one listing costs at most this many
 * name lookups; a folder with more is listed from those and says
 * `"truncated": true`.
 */
export const LIST_MAX_ENTRIES = 5000;
/**
 * At most this many files open for reading at once per plugin origin: every
 * held response keeps a file descriptor and a pipe buffer, so a page that
 * holds responses unread could otherwise exhaust them. Above it, a file read
 * answers 503 without opening the file.
 */
export const READ_MAX_STREAMS = 16;

/**
 * Open-file counts per plugin id (one per handler). `acquire` takes a slot
 * and returns its release, which is safe to call more than once, or null at
 * the cap.
 */
export function streamLimit(max = READ_MAX_STREAMS): { acquire(id: string): (() => void) | null } {
  const counts = new Map<string, number>();
  return {
    acquire(id) {
      const now = counts.get(id) ?? 0;
      if (now >= max) return null;
      counts.set(id, now + 1);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        const left = (counts.get(id) ?? 1) - 1;
        if (left === 0) counts.delete(id);
        else counts.set(id, left);
      };
    },
  };
}

/** Who asks for a subframe's navigation, as the main process sees it: the frame's URL now ("" before its first load) and the initiating frame's, if any. */
export interface NavigationFrom {
  frame: string;
  initiator: string | null;
}

/**
 * Whether a frame may navigate to `url`: the top frame stays on the app's
 * origin; a subframe may load a loaded plugin's origin (`hosts`) or a blank
 * document, and nothing else. With `from`, a subframe goes to another
 * plugin's origin only when the app's own page starts the navigation (the
 * host gives a frame its plugin); started by the frame itself, another
 * plugin's frame, or nothing, it stays on the host it already shows, so no
 * plugin's frame can turn itself into another plugin's page (os-ui/PLUGINS.md
 * Part 4, the step 2.5 review's note 3).
 */
export function allowedNavigation(url: string, isMainFrame: boolean, hosts: readonly string[], from?: NavigationFrom): boolean {
  if (isMainFrame) return url.startsWith(`${ORIGIN}/`);
  if (url === "about:blank" || url === "about:srcdoc") return true;
  const host = hosts.find((h) => url.startsWith(`${SCHEME}://${h}/`));
  if (host === undefined) return false;
  if (from === undefined || (from.initiator !== null && from.initiator.startsWith(`${ORIGIN}/`))) return true;
  return from.frame.startsWith(`${SCHEME}://${host}/`);
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

/**
 * Types the read channel sends as plain text. A plugin page's `script-src 'self'`
 * admits a workspace script it names in `<script src>` or a worker, and a
 * script ignores its response's CSP. What stops it is that the channel's URL
 * path never carries the file's name (READ_PATHS) and that a script sent with
 * `nosniff` and a non-script type is refused; scripts go as text for that.
 * HTML and XHTML have no use in a plugin page beside being framed, which
 * PLUGIN_CSP forbids, so they go as text too and stay inert even if
 * READ_CSP's sandbox is ever relaxed. SVG keeps its type: an `<img>` needs it,
 * an image never runs script, and as a document READ_CSP sandboxes it.
 */
const READ_AS_TEXT = new Set([".js", ".mjs", ".cjs", ".html", ".htm", ".xhtml"]);

/** The Content-Type a workspace file is sent with on the read channel. */
export function readContentType(file: string): string {
  return READ_AS_TEXT.has(extname(file).toLowerCase()) ? "text/plain; charset=utf-8" : contentType(file);
}

export type Route =
  /** `host`: whose mounts answer, the app's (APP_HOST) or one plugin's (its id). */
  | { kind: "api"; pathname: string; host: string }
  /** `confined`: resolve symlinks and refuse a real path outside `root` (workspace files). */
  | { kind: "file"; root: string; rel: string; fallback: string | null; csp: string | null; confined: boolean }
  /**
   * The read channel (`list`: `/_os/list`, else `/_os/files`): `paths` are the
   * URL's `path` parameters, decoded once by the URL parser; serveRead takes
   * exactly one.
   */
  | { kind: "read"; site: PluginSite; paths: readonly string[]; list: boolean }
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
 * - app://superresearch-os/api/... → the trunk's endpoints;
 * - app://superresearch-os/state.json → the workspace's generated snapshot;
 * - app://superresearch-os/... → the bundled renderer, `index.html` as the
 *   fallback for extension-less paths;
 * - app://<id>/api/<id>/... → that plugin's own endpoints, and no others;
 * - app://<id>/_os/files?path=... and app://<id>/_os/list?path=..., spelled
 *   exactly so → that plugin's read channel (serveRead);
 * - app://<id>/... → that plugin's site (PluginSite); "", api/ and _os/ are
 *   never files;
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
    return site === undefined ? { kind: "not-found" } : siteRoute(site, pathname, parsed.searchParams, roots.workspace);
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

/**
 * The read channel's URL paths on a plugin's origin (true: a listing),
 * compared whole with the URL path as sent, before any decoding. The file's
 * path goes in the query, `?path=<rel>`, never in the URL path: for an app://
 * URL, Chromium runs a `<script src>` whose path ends in `.js` or `.mjs`
 * whatever its Content-Type, so a path that named the file would let a page
 * run a workspace script. Every other spelling (`_OS/files`, `_os/Files`,
 * `%5Fos/files`), and anything below them (`/_os/files/x`), stays reserved.
 */
const READ_PATHS: ReadonlyMap<string, boolean> = new Map([
  ["/_os/files", false],
  ["/_os/list", true],
]);

/** One URL on a plugin's own origin. */
function siteRoute(site: PluginSite, pathname: string, query: URLSearchParams, workspace: string | null): Route {
  const own = `/api/${site.id}`;
  if (pathname === own || pathname.startsWith(`${own}/`)) return { kind: "api", pathname, host: site.id };
  const list = READ_PATHS.get(pathname);
  if (list !== undefined) return { kind: "read", site, paths: query.getAll("path"), list };
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

/** Sent with every read channel response, refusals included. */
const READ_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store",
  "Content-Security-Policy": READ_CSP,
} as const;

const TEXT = "text/plain; charset=utf-8";
const JSON_TYPE = "application/json";

/** One listing entry; `size` is 0 for a directory. */
export interface ListEntry {
  name: string;
  dir: boolean;
  size: number;
}

/**
 * Whether `child` has a segment below `parent` that starts with ".". A path
 * not inside `parent` is not this check's business (containment is checked
 * on its own), so it answers false: dropping one check never hides another.
 */
function hiddenBelow(parent: string, child: string): boolean {
  return isInside(parent, child) && path.relative(parent, child).split(path.sep).some((s) => s.startsWith("."));
}

/**
 * Whether a root's real path, if it lies inside the workspace's real path
 * `top`, is itself one of `reads` as a root: a link planted at or above a
 * root (a cloned project's `Code` pointing at `human/private`) may lead to
 * another root the plugin may read, and nowhere else. A root outside the
 * workspace is not this check's business (`isInside(top, rootReal)` is).
 */
function declaredRoot(top: string, rootReal: string, reads: readonly string[]): boolean {
  if (!isInside(top, rootReal)) return true;
  const rel = path.relative(top, rootReal).split(path.sep).join("/");
  return matchRoot(rel, reads) === rel;
}

/**
 * How the channel opens a file, a resolved real path: never following a link
 * in its last segment (one swapped in since it was resolved) and never
 * blocking on a FIFO. Windows has neither flag, nor FIFOs.
 */
const READ_FLAGS = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0);

/**
 * Opens `file` (a resolved real path) for the channel and checks the file
 * actually opened: a regular file (404 otherwise) of at most READ_MAX_BYTES
 * (413 otherwise). On success the caller owns the handle and must close it.
 */
export async function openRegular(file: string): Promise<{ handle: FileHandle; size: number } | 404 | 413> {
  const handle = await open(file, READ_FLAGS);
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > READ_MAX_BYTES) {
      await handle.close();
      return info.isFile() ? 413 : 404;
    }
    return { handle, size: info.size };
  } catch (error) {
    await handle.close();
    throw error;
  }
}

/** Bytes read per chunk of a streamed file. */
const READ_CHUNK_BYTES = 64 * 1024;

/**
 * The first `size` bytes of the open `handle` as a stream, a chunk at a time
 * as the consumer pulls, so concurrent reads hold a chunk each rather than a
 * file each. It never reads past `size` (a file that grew since its stat) and
 * ends at end of file (one that shrank). The handle is closed, and `onClose`
 * called once, when the stream ends, fails, or is cancelled.
 */
export function fileStream(handle: FileHandle, size: number, onClose: () => void = () => {}): ReadableStream<Uint8Array> {
  let offset = 0;
  let closing: Promise<void> | null = null;
  const close = () => (closing ??= handle.close().catch(() => {}).finally(onClose));
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const want = Math.min(READ_CHUNK_BYTES, size - offset);
        const { bytesRead, buffer } = want > 0 ? await handle.read(new Uint8Array(want), 0, want, offset) : { bytesRead: 0, buffer: new Uint8Array(0) };
        if (closing !== null) return; // cancelled while reading
        if (bytesRead > 0) {
          offset += bytesRead;
          controller.enqueue(buffer.subarray(0, bytesRead));
        }
        if (bytesRead === 0 || offset >= size) {
          await close();
          controller.close();
        }
      } catch (error) {
        await close();
        controller.error(error);
      }
    },
    cancel: close,
  });
}

/**
 * One entry of a listed folder, or null when the listing drops it: it
 * resolves outside `root` or onto a dot path below it, it is neither a regular
 * file nor a folder once resolved (a FIFO, a socket), or it cannot be resolved
 * (a dangling link).
 */
async function listEntry(file: string, root: string, name: string): Promise<ListEntry | null> {
  try {
    const real = await realpath(file);
    if (!isInside(root, real)) return null;
    if (hiddenBelow(root, real)) return null;
    const info = await stat(real);
    if (info.isFile()) return { name, dir: false, size: info.size };
    if (info.isDirectory()) return { name, dir: true, size: 0 };
    return null;
  } catch {
    return null;
  }
}

/**
 * The folder `dir` (a real path inside the real path `root`) as the channel
 * lists it. At most LIST_MAX_ENTRIES names are read, in the file system's
 * order; they are sorted by UTF-16 code unit (JavaScript's default sort), and
 * names starting with "." and the entries listEntry drops are left out. A
 * folder with more names says `truncated: true`.
 */
async function listing(dir: string, root: string): Promise<{ entries: ListEntry[]; truncated?: true }> {
  const names: string[] = [];
  let truncated = false;
  // Leaving the loop early closes the folder.
  for await (const entry of await opendir(dir)) {
    if (names.length === LIST_MAX_ENTRIES) {
      truncated = true;
      break;
    }
    names.push(entry.name);
  }
  const entries: ListEntry[] = [];
  for (const name of names.sort()) {
    if (name.startsWith(".")) continue;
    const entry = await listEntry(path.join(dir, name), root, name);
    if (entry !== null) entries.push(entry);
  }
  return truncated ? { entries, truncated: true } : { entries };
}

/**
 * One read channel request on a plugin's origin, against the open workspace.
 * Every answer carries READ_HEADERS, and a HEAD answer has no body. In order:
 * 1. GET and HEAD only, folder or not (405 otherwise);
 * 2. a folder is open;
 * 3. exactly one `path` parameter, decoded once (by the URL parser) and
 *    checked as safeRelative checks a URL path, not empty, with no segment
 *    starting with "." (`.env`, `.git/config`, `a/.venv/x`);
 * 4. it lies in one of the plugin's `reads` roots (matchRoot), and so a
 *    plugin with no `reads` reads nothing;
 * 5. the matched root's real path lies inside the workspace's real path (a
 *    root that is a link leaving the workspace is refused; Paper Wiki's site
 *    folder follows one, and to do the same here, drop that one check), is not
 *    the workspace itself nor a dot folder of it, and is itself one of the
 *    plugin's roots (declaredRoot; to follow a link to any other folder of the
 *    workspace, drop that one check);
 * 6. the target's real path lies inside the root's real path and has no
 *    segment below it starting with "." (a link named `x` to `.git`);
 * 7. a file is a regular file, by path and again once opened (openRegular),
 *    sent with readContentType as a stream (fileStream), or 413 above
 *    READ_MAX_BYTES before a byte is read; a listing is a folder (listing),
 *    and HEAD on it stops at opening the folder;
 * 8. a file is opened only while its origin has fewer than READ_MAX_STREAMS
 *    open (`streams`); 503 otherwise. The slot is released when the stream
 *    ends, fails or is cancelled, and at once if the file is not served.
 * Anything else, and any file system error, is 404.
 */
export async function serveRead(
  route: Extract<Route, { kind: "read" }>,
  method: string,
  workspace: string | null,
  streams: ReturnType<typeof streamLimit>,
): Promise<Response> {
  const head = method === "HEAD";
  const answer = (status: number, type: string, body: BodyInit | null, extra: Record<string, string> = {}): Response =>
    new Response(head ? null : body, { status, headers: { ...READ_HEADERS, "Content-Type": type, ...extra } });
  const missing = () => answer(404, TEXT, "Not found");
  const tooLarge = () => answer(413, TEXT, "Too large for the read channel");

  if (method !== "GET" && !head) return answer(405, TEXT, "Method not allowed", { Allow: "GET, HEAD" });
  if (workspace === null) return missing();
  if (route.paths.length !== 1) return missing();
  const rel = safeDecodedRelative(route.paths[0]!);
  if (rel === null || rel === "") return missing();
  if (rel.split("/").some((s) => s.startsWith("."))) return missing();
  const root = matchRoot(rel, route.site.reads);
  if (root === null) return missing();
  try {
    const top = await realpath(workspace);
    const rootReal = await realpath(path.join(top, root));
    if (!isInside(top, rootReal)) return missing();
    if (path.relative(top, rootReal) === "") return missing();
    if (hiddenBelow(top, rootReal)) return missing();
    if (!declaredRoot(top, rootReal, route.site.reads)) return missing();
    const real = await realpath(path.join(top, rel));
    if (!isInside(rootReal, real)) return missing();
    if (hiddenBelow(rootReal, real)) return missing();
    // By path first: a FIFO is never opened, and the cap needs no read access.
    const info = await stat(real);
    if (route.list) {
      if (!info.isDirectory()) return missing();
      if (head) {
        await (await opendir(real)).close();
        return answer(200, JSON_TYPE, null);
      }
      return answer(200, JSON_TYPE, JSON.stringify(await listing(real, rootReal)));
    }
    if (!info.isFile()) return missing();
    if (info.size > READ_MAX_BYTES) return tooLarge();
    const release = streams.acquire(route.site.id);
    if (release === null) return answer(503, TEXT, "Too many files open for reading; try again");
    let opened: Awaited<ReturnType<typeof openRegular>> | undefined;
    try {
      opened = await openRegular(real);
    } finally {
      // Refused or failed: nothing holds the slot.
      if (typeof opened !== "object") release();
    }
    if (opened === 404) return missing();
    if (opened === 413) return tooLarge();
    const type = readContentType(rel);
    if (head) {
      try {
        await opened.handle.close();
      } finally {
        release();
      }
      return answer(200, type, null);
    }
    return answer(200, type, fileStream(opened.handle, opened.size, release));
  } catch {
    return missing();
  }
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
  const streams = streamLimit();
  return async (request: Request): Promise<Response> => {
    const current = state();
    const r = route(request.url, current, current.sites);
    if (r.kind === "api") return serveApi(request, mountsFor(current.registry, r.host), current.token);
    if (r.kind === "read") return serveRead(r, request.method, current.workspace, streams);
    if (r.kind === "file") {
      if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
      return serveFile(r);
    }
    return notFound();
  };
}
