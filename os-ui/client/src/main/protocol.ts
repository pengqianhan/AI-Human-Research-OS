import { readFile, realpath, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";
import * as path from "node:path";
import { matchMount } from "../../../frontend/server/api.ts";
import type { Mount } from "../../../frontend/server/api.ts";
import type { ApiRequest } from "../../../frontend/server/types.ts";

export const SCHEME = "app";
/** The app itself: renderer, state.json, and the os-ui endpoints. */
export const APP_HOST = "research-os";
/**
 * The Paper Wiki viewer, on its own origin. The viewer renders note bodies
 * as HTML, and notes are written from outside sources, so it must not share
 * an origin (storage, bridge, endpoints) with the app. It reaches only its
 * own status endpoint.
 */
export const WIKI_HOST = "paper-wiki";
export const ORIGIN = `${SCHEME}://${APP_HOST}`;
export const WIKI_ORIGIN = `${SCHEME}://${WIKI_HOST}`;
export const HOME_URL = `${ORIGIN}/`;
const WIKI_STATUS = "/api/paper-wiki/status";

/** Content-Security-Policy for the app's own pages. */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  `frame-src ${WIKI_ORIGIN}`,
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

/**
 * Content-Security-Policy for the Paper Wiki viewer: its own inline scripts
 * and styles, its own origin for the status endpoint, nothing else — no
 * remote images, frames, forms, or fetches, whatever a note contains.
 */
export const WIKI_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

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
  | { kind: "api"; pathname: string; mounts: "app" | "wiki" }
  /** `confined`: resolve symlinks and refuse a real path outside `root` (workspace files). */
  | { kind: "file"; root: string; rel: string; fallback: string | null; csp: string | null; confined: boolean }
  | { kind: "not-found" };

/** Windows device names, which name a device in any folder (CON, NUL, COM1.txt, ...). */
const DEVICE = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;

/**
 * A URL path as a safe relative path, or null. Percent-decoding happens once,
 * after which "..", backslashes, colons (drive letters, NTFS streams), NUL
 * bytes, and Windows device names are refused outright.
 */
export function safeRelative(pathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (/[\\:\0]/.test(decoded)) return null;
  const segments = decoded.split("/").filter((s) => s !== "");
  if (segments.some((s) => s === "." || s === ".." || DEVICE.test(s))) return null;
  return segments.join("/");
}

/**
 * Where one app:// URL is served from.
 * - app://research-os/api/... → the os-ui endpoints (all but the wiki's);
 * - app://research-os/state.json → the workspace's generated snapshot;
 * - app://research-os/... → the bundled renderer, `index.html` as the
 *   fallback for extension-less paths;
 * - app://paper-wiki/api/paper-wiki/status → the reading-status endpoint;
 * - app://paper-wiki/... → the workspace's paper-wiki/ folder, in place.
 */
export function route(url: string, roots: { renderer: string; workspace: string | null }): Route {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { kind: "not-found" };
  }
  if (parsed.protocol !== `${SCHEME}:`) return { kind: "not-found" };
  const pathname = parsed.pathname;

  if (parsed.host === WIKI_HOST) {
    if (pathname === WIKI_STATUS || pathname.startsWith(`${WIKI_STATUS}/`)) return { kind: "api", pathname, mounts: "wiki" };
    if (roots.workspace === null) return { kind: "not-found" };
    const rel = safeRelative(pathname);
    if (rel === null || rel === "" || rel === "api" || rel.startsWith("api/")) return { kind: "not-found" };
    const csp = extname(rel).toLowerCase() === ".html" ? WIKI_CSP : null;
    return { kind: "file", root: path.join(roots.workspace, "paper-wiki"), rel, fallback: null, csp, confined: true };
  }
  if (parsed.host !== APP_HOST) return { kind: "not-found" };

  if (pathname === "/api" || pathname.startsWith("/api/")) return { kind: "api", pathname, mounts: "app" };
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
  return { kind: "file", root: roots.renderer, rel: file, fallback, csp: CSP, confined: false };
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
  if (route.csp !== null && extname(rel).toLowerCase() === ".html") headers["Content-Security-Policy"] = route.csp;
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

export interface ApiMounts {
  /** Mounts on app://research-os: every endpoint except the wiki's status. */
  app: Mount[];
  /** Mounts on app://paper-wiki: the reading-status endpoint only. */
  wiki: Mount[];
}

export function splitMounts(mounts: Mount[]): ApiMounts {
  return {
    app: mounts.filter((m) => m.prefix !== WIKI_STATUS),
    wiki: mounts.filter((m) => m.prefix === WIKI_STATUS),
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
export async function serveApi(request: Request, mounts: Mount[] | null, token: string): Promise<Response> {
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

/** The whole app:// handler, Electron-free so it can be tested in plain Node. */
export function createHandler(state: () => { renderer: string; workspace: string | null; mounts: ApiMounts | null; token: string }) {
  return async (request: Request): Promise<Response> => {
    const current = state();
    const r = route(request.url, current);
    if (r.kind === "api") return serveApi(request, current.mounts === null ? null : current.mounts[r.mounts], current.token);
    if (r.kind === "file") {
      if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
      return serveFile(r);
    }
    return notFound();
  };
}
