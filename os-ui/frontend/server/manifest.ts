/**
 * The plugin manifest (`plugin.json`): its shape, its parser, and the path
 * rules every plugin path and URL path follows (ADR-0006). Pure, with no Node
 * imports, so the renderer can use it as well as the server and the client.
 */

/** The manifest contract this host implements. A plugin names the range it needs. */
export const CONTRACT = { major: 1, minor: 0 } as const;

/** Set by the loader from where the folder came from; never read from the manifest. */
export type PluginSource = "bundled" | "local";

export interface PluginManifest {
  /** "^1.0": this major, at least this minor. */
  contract: string;
  /** /^[a-z][a-z0-9-]{1,30}[a-z0-9]$/, not "research-os"; the host of app://<id>; permanent. */
  id: string;
  /** 1–40 characters. */
  name: string;
  /** Free text. */
  version: string;
  /** At most 200 characters. */
  description?: string;
  /** Bundled only: serve app://<id>/ from this workspace folder instead of <dir>/site/. */
  site?: { workspace: string };
  /** Workspace roots readable through app://<id>/_os/; a "*" segment matches exactly one segment. */
  reads?: string[];
  contributes: {
    homePanels?: HomePanel[];
    projectViews?: Page[];
    /** Bundled only: each is mounted at /api/<id>/<handler>. */
    handlers?: string[];
  };
}

/** `id` matches /^[a-z][a-z0-9-]*$/ and is unique within the plugin. */
export interface Page {
  id: string;
  title: string;
  entry: string;
}

/** "nav" (a left-navigation entry of its own) is for bundled plugins only in 1.0. */
export interface HomePanel extends Page {
  placement?: "home" | "nav";
}

export type Parsed = { ok: true; manifest: PluginManifest } | { ok: false; problems: string[] };

const ID = /^[a-z][a-z0-9-]{1,30}[a-z0-9]$/;
const PAGE_ID = /^[a-z][a-z0-9-]*$/;
const RANGE = /^\^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
/** The app's own host, app://research-os. */
const RESERVED_IDS = new Set(["research-os"]);
/** URL paths below a plugin's origin that the host keeps for itself. */
const RESERVED_ENTRIES = ["api", "_os"];

/**
 * Windows device names, which name a device in any folder (CON, NUL, COM1.txt,
 * CONIN$, ...); COM and LPT also take a superscript 1, 2 or 3.
 */
const DEVICE = /^(con|prn|aux|nul|conin\$|conout\$|com[0-9¹²³]|lpt[0-9¹²³])(\..*)?$/i;

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
  return safeDecodedRelative(decoded);
}

/**
 * A path that is decoded already (a query value the URL parser has decoded)
 * as a safe relative path, or null: safeRelative's checks, without decoding
 * it again.
 */
export function safeDecodedRelative(decoded: string): string | null {
  if (/[\\:\0]/.test(decoded)) return null;
  const segments = decoded.split("/").filter((s) => s !== "");
  if (segments.some((s) => s === "." || s === ".." || DEVICE.test(s))) return null;
  return segments.join("/");
}

/** Whether a manifest's contract range (`^M.m`) is one `host` implements: same major, no newer minor. */
export function contractAccepts(range: string, host: { readonly major: number; readonly minor: number } = CONTRACT): boolean {
  const m = RANGE.exec(range);
  return m !== null && Number(m[1]) === host.major && Number(m[2]) <= host.minor;
}

/**
 * The root in `roots` that `rel` (a path safeRelative returned) lies in, as
 * the concrete path it matched, or null. Roots match whole segments only, so
 * "paper" does not match "paper-wiki/x"; a "*" segment matches exactly one
 * segment that does not start with ".", so "projects-folder/*" turns
 * "projects-folder/Alpha/x" into "projects-folder/Alpha" and matches neither
 * "projects-folder" itself nor "projects-folder/.env". Segments below the
 * matched root are not looked at.
 */
export function matchRoot(rel: string, roots: readonly string[]): string | null {
  const parts = rel.split("/").filter((s) => s !== "");
  for (const root of roots) {
    const want = root.split("/");
    if (want.length > parts.length) continue;
    const matches = want.every((segment, i) => (segment === "*" ? !parts[i]!.startsWith(".") : segment === parts[i]));
    if (matches) return parts.slice(0, want.length).join("/");
  }
  return null;
}

type Fields = Record<string, unknown>;

function isFields(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const HOST_CONTRACT = `${CONTRACT.major}.${CONTRACT.minor}`;

/**
 * Checks `raw` (a parsed plugin.json) against contract 1.0 for a plugin from
 * `source`, and returns every problem found, not only the first:
 * - unknown keys are refused at every level, naming the key and this host's
 *   contract, so a plugin written for a newer minor says why it does not load;
 * - the contract range must be `^M.m` with this host's major and no newer minor;
 * - `site`, `handlers`, and `placement: "nav"` are for bundled plugins only;
 * - the id is a hostname label that stays itself: no "--" in its third and
 *   fourth characters, which hostnames keep for encoded names ("xn--");
 * - every path (`site.workspace`, `reads[]`, `entry`) is written in the plain
 *   form safeRelative gives back unchanged, is not empty, has no segment
 *   starting with "." or ending in a space or ".", and has none of
 *   ? # < > " |; `*` appears in `reads` only, as a whole segment and not the
 *   first; `entry` is not below `api/` or `_os/`;
 * - page ids are unique across home panels and project views, and handler
 *   names follow the page-id pattern, each listed once.
 */
export function parseManifest(raw: unknown, source: PluginSource): Parsed {
  const problems: string[] = [];
  const bundled = source === "bundled";

  const known = (fields: Fields, where: string, keys: readonly string[]) => {
    for (const key of Object.keys(fields)) {
      if (!keys.includes(key)) problems.push(`${where}: unknown key "${key}" (this host implements plugin contract ${HOST_CONTRACT})`);
    }
  };
  /** A string; `max` characters at most, and not empty unless `empty`. */
  const text = (value: unknown, where: string, max = Number.POSITIVE_INFINITY, empty = false): string => {
    if (typeof value !== "string") {
      problems.push(`${where} must be a string`);
      return "";
    }
    if (!empty && value === "") problems.push(`${where} must not be empty`);
    if (value.length > max) problems.push(`${where} must be at most ${max} characters`);
    return value;
  };
  /** A workspace or site path; in `reads` (`wildcard`), a whole "*" segment matches one segment. */
  const path = (value: unknown, where: string, wildcard = false): string => {
    if (typeof value !== "string" || value === "") {
      problems.push(`${where} must be a non-empty path`);
      return "";
    }
    // The checked string is the stored one: a path safeRelative would change
    // (a leading "/", "a//b", a %-escape) is refused rather than rewritten.
    if (safeRelative(value) !== value) {
      problems.push(`${where} "${value}" must be a plain relative path (no leading or trailing "/", empty segments, "..", "\\", ":", "%", or device names)`);
      return value;
    }
    const segments = value.split("/");
    if (segments.some((s) => s.startsWith("."))) problems.push(`${where} "${value}" has a segment starting with "."`);
    // Windows drops a trailing space or dot, so "con " and "aux." name devices.
    if (segments.some((s) => s.endsWith(" ") || s.endsWith("."))) problems.push(`${where} "${value}" has a segment ending in a space or "."`);
    // A URL path ends at "?" or "#"; Windows refuses the others in a file name.
    if (/[?#<>"|]/.test(value)) problems.push(`${where} "${value}" contains one of ? # < > " |`);
    if (!wildcard && value.includes("*")) problems.push(`${where} "${value}": "*" is allowed in reads only`);
    if (wildcard && segments.some((s) => s !== "*" && s.includes("*"))) problems.push(`${where} "${value}": "*" must be a whole segment`);
    if (wildcard && segments[0] === "*") problems.push(`${where} "${value}" starts with "*", which would admit every top-level folder`);
    return value;
  };
  const list = (value: unknown, where: string): unknown[] => {
    if (!Array.isArray(value)) {
      problems.push(`${where} must be a list`);
      return [];
    }
    return value;
  };

  if (!isFields(raw)) return { ok: false, problems: ["plugin.json must be a JSON object"] };
  known(raw, "plugin.json", ["contract", "id", "name", "version", "description", "site", "reads", "contributes"]);

  let contract = "";
  if (typeof raw.contract !== "string") problems.push('contract must be a string such as "^1.0"');
  else if (!contractAccepts(raw.contract)) problems.push(`contract "${raw.contract}" is not accepted by this host, which implements plugin contract ${HOST_CONTRACT}`);
  else contract = raw.contract;

  let id = "";
  if (typeof raw.id !== "string" || !ID.test(raw.id)) problems.push(`id must match ${ID.source}`);
  else if (RESERVED_IDS.has(raw.id)) problems.push(`id "${raw.id}" is reserved`);
  // "xn--abc" is an encoded hostname, which app://xn--abc would be read as.
  else if (raw.id.slice(2, 4) === "--") problems.push(`id "${raw.id}" has "--" as its third and fourth characters, which hostnames reserve`);
  else id = raw.id;

  const manifest: PluginManifest = {
    contract,
    id,
    name: text(raw.name, "name", 40),
    version: text(raw.version, "version", undefined, true),
    contributes: {},
  };
  if (raw.description !== undefined) manifest.description = text(raw.description, "description", 200, true);

  if (raw.site !== undefined) {
    if (!bundled) problems.push("site is for bundled plugins only");
    if (!isFields(raw.site)) problems.push("site must be an object such as {\"workspace\": \"<folder>\"}");
    else {
      known(raw.site, "site", ["workspace"]);
      manifest.site = { workspace: path(raw.site.workspace, "site.workspace") };
    }
  }

  if (raw.reads !== undefined) manifest.reads = list(raw.reads, "reads").map((r, i) => path(r, `reads[${i}]`, true));

  /** One home panel or project view; page ids are unique across both lists. */
  const pageIds = new Set<string>();
  const page = (value: Fields, where: string): Page => {
    let pageId = "";
    if (typeof value.id !== "string" || !PAGE_ID.test(value.id)) problems.push(`${where}.id must match ${PAGE_ID.source}`);
    else if (pageIds.has(value.id)) problems.push(`${where}.id "${value.id}" is used twice`);
    else pageIds.add((pageId = value.id));
    const entry = path(value.entry, `${where}.entry`);
    const first = entry.split("/")[0]!;
    if (RESERVED_ENTRIES.includes(first)) problems.push(`${where}.entry "${entry}" is below ${first}/, which the host keeps`);
    return { id: pageId, title: text(value.title, `${where}.title`), entry };
  };
  const pages = (value: unknown, where: string, keys: readonly string[]): { fields: Fields; where: string }[] =>
    list(value, where).flatMap((item, i) => {
      if (!isFields(item)) {
        problems.push(`${where}[${i}] must be an object`);
        return [];
      }
      known(item, `${where}[${i}]`, keys);
      return [{ fields: item, where: `${where}[${i}]` }];
    });

  if (!isFields(raw.contributes)) problems.push("contributes must be an object");
  else {
    const c = raw.contributes;
    known(c, "contributes", ["homePanels", "projectViews", "handlers"]);
    if (c.homePanels !== undefined) {
      manifest.contributes.homePanels = pages(c.homePanels, "contributes.homePanels", ["id", "title", "entry", "placement"]).map(
        ({ fields, where }) => {
          const panel: HomePanel = page(fields, where);
          const placement = fields.placement;
          if (placement === undefined) return panel;
          if (placement !== "home" && placement !== "nav") problems.push(`${where}.placement must be "home" or "nav"`);
          else if (placement === "nav" && !bundled) problems.push(`${where}.placement "nav" is for bundled plugins only`);
          else panel.placement = placement;
          return panel;
        },
      );
    }
    if (c.projectViews !== undefined) {
      manifest.contributes.projectViews = pages(c.projectViews, "contributes.projectViews", ["id", "title", "entry"]).map(
        ({ fields, where }) => page(fields, where),
      );
    }
    if (c.handlers !== undefined) {
      if (!bundled) problems.push("contributes.handlers is for bundled plugins only");
      const seen = new Set<string>();
      manifest.contributes.handlers = list(c.handlers, "contributes.handlers").map((h, i) => {
        if (typeof h !== "string" || !PAGE_ID.test(h)) problems.push(`contributes.handlers[${i}] must match ${PAGE_ID.source}`);
        else if (seen.has(h)) problems.push(`contributes.handlers[${i}] "${h}" is listed twice`);
        else seen.add(h);
        return String(h);
      });
    }
  }

  return problems.length > 0 ? { ok: false, problems } : { ok: true, manifest };
}
