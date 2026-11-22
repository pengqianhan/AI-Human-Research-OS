# Plugin registry and view plugins: working design

The design the step 1 work follows (ADR-0006; [HANDOFF.md](../HANDOFF.md) Active
Work). It was written by a design agent on 2026-11-21 and reviewed before
implementation; the two parts below are its reports, kept as written, so "I" is that
agent and line numbers refer to the code as it was that day.

Status on 2026-11-22:

- **S1 to S5 are done**: the manifest parser, the server-side registry with the dev
  server built from it, the client serving plugin origins from the registry (S3), the
  frontend registry (S4), and the read channel (S5, merged as PR #42).
  `createMounts`, `splitMounts`, and the client's `WIKI_*` constants are gone. The
  code is the authority where it differs from Part 1:
  - Manifests (S1): paths must be plain, a `reads` root may not start with `*`, and `*`
    does not match a dot segment.
  - On `app://<id>`, only `/api/<id>` and `/api/<id>/...` reach the plugin's mounts. Any
    other `api/` path is a plain 404 file miss, as it was for the wiki, also when no
    folder is open. What changed on Paper Wiki's origin:
    - its own unknown endpoint paths (`/api/paper-wiki/other`) answer a JSON
      `no endpoint` 404, or 503 with no folder open, where they were a plain 404;
    - `_os/` is never a file, so a file under `paper-wiki/_os/` that was served (200)
      is 404, and a write there 404 rather than 405;
    - `api` and `_os` are reserved in any case and without a trailing dot or space
      (`API/`, `_OS/`, `api./`), which a case-insensitive file system or Windows would
      otherwise resolve to `paper-wiki/api/` or `paper-wiki/_os/`.
  - `createHandler`'s state has no `csp`: `route` derives the app policy from `sites`,
    so the framed origins and the served sites cannot disagree.
  - The app policy no longer allows Google Fonts, which the frontend does not load, so
    `appCsp(["paper-wiki"])` is not byte-identical to the old `CSP`; the test pins the
    new literal. `appCsp([])` gives `frame-src 'none'`.
  - `WIKI_CSP` is `WORKSPACE_CSP` (any workspace-folder site); `PLUGIN_CSP` is built for
    plugin-folder sites, which are tested on a fixture only (no plugin has `site/` until
    S6). They need no open folder and have no index fallback (`app://<id>/` is 404). A
    bundled plugin's `site/` is confined lexically (it may sit in the asar archive);
    any other plugin's by real path, so a link inside it cannot leave it.
  - A bundled plugin that fails to load is logged as `ERROR` and its compiled-in
    handlers are left out. If a loaded plugin's declared handlers and the compiled-in
    factories disagree (a bundling bug), `createRegistry` still throws; the client's
    `workspaceRegistry` then logs an `ERROR` and serves the trunk's endpoints alone. It
    is built before any poller or timer starts, so a folder never opens half-way and
    the window still opens.
  - The end-to-end suite runs through the new layout, not the dock. The Help menu item
    keeps its label, "System and Prerequisites": it opens Settings, which holds that
    check, and the suite and the client README name it by that label.
  - The frontend registry (S4) is `frontend/src/plugins/`. `pages.ts` exports
    `pluginPages(plugins, { desktop })` with no `selfOrigin`: a page's `origin` is
    `app://<id>` in the client and `null` in a browser. It has no `viewSrc`,
    `AskMessage`, or `readAsk` yet; project views and the page-to-host message come
    with S6. It adds `bundledManifests`, which parses each bundled manifest and skips
    one that fails, or whose id is not its folder's, with a reason that `registry.ts`
    logs as a console error.
  - Paper Wiki's manifest differs from §2's example: its panel title is "Paper wiki"
    (the left-navigation label the end-to-end suite clicks), and its description is
    the Plugins page card's text. `src/plugins/pages.test.ts` pins that label and both
    frame URLs against the real `plugins/` folder in the required CI, since
    `npm test` now also runs `src/**/*.test.ts`.
  - A plugin's left-navigation page is a `PluginScreen`, remembered in the saved
    layout by its key, `paper-wiki/viewer`; a layout saved as `wiki` opens it.
    `PaperWikiPage` stays, with no props, for the dock alone. There is no `icon`
    field (A8): the renderer maps a bundled plugin's id to an icon. The Plugins card
    has one chip per page; handlers get none.
  - The read channel (S5) is `serveRead` in
    [client/src/main/protocol.ts](client/src/main/protocol.ts), described with its
    known limits in [client/DESIGN.md](client/DESIGN.md) §3.2. No bundled plugin
    declares `reads` until S6, so it is proven by fixture tests in
    `client/test/protocol.test.ts` only. Where it differs from §3's "The read
    channel", after an independent security review:
    - The URL shape is `app://<id>/_os/files?path=<rel>` and
      `app://<id>/_os/list?path=<rel>`, not `_os/files/<rel>`. For an `app://`
      URL, Chromium runs a `<script src>` whose path ends in `.js` or `.mjs`
      whatever its Content-Type and `nosniff` (the review showed it in Electron
      44), so a path naming the file let a plugin page run a workspace script.
      With the path in the query the URL path names no type, and a probe under the
      real `PLUGIN_CSP` saw classic, module, `import()` and worker loads all
      blocked. The contract is not frozen until step 2 (A1).
    - Only the exact, lower-case `/_os/files` and `/_os/list` are the channel,
      with exactly one `path` parameter, which the URL parser decodes once (`+` is
      a space) and `serveRead` checks as `safeRelative` would, without decoding
      again (`safeDecodedRelative` in `frontend/server/manifest.ts`). A missing,
      empty or repeated `path` is 404; other parameters are ignored. Every other
      `_os` path, `/_os/files/<rel>` included, stays 404.
    - The declared pattern is the boundary: a root's real path must itself be one
      of the plugin's roots as written, so a link planted at or above a root (a
      cloned project's `Code` pointing at `human/private`) is 404, while a root
      linked to another declared root is followed. To follow links to any folder
      of the workspace again, drop the one check `declaredRoot(...)` in
      `serveRead`. On a case-insensitive file system a `*` segment in another case
      reads the same root, and a folder spelled on disk otherwise than declared is
      404 by either spelling ([client/DESIGN.md](client/DESIGN.md) §3.2).
    - The root must also lie inside the workspace, not be it, and not be a dot
      folder of it; the dot check also runs below the root's real path (a link
      named `x` to the root's `.git` is 404). Paper Wiki's site folder follows a
      link out of the workspace; the channel deliberately does not. To reverse
      that, drop the one check `isInside(top, rootReal)` in `serveRead`; the
      declared-root check applies inside the workspace only, so that alone lets
      such a root be read (a test shows it).
    - A file is checked by path, opened with `O_NOFOLLOW` and `O_NONBLOCK`,
      checked again as opened, and streamed 64 KiB at a time, never past its
      `stat` size, closing on end, error and cancel. A file above 32 MiB
      (`READ_MAX_BYTES`) answers 413 before a byte is read, also when it is
      unreadable. At most 16 files (`READ_MAX_STREAMS`) are open for reading at
      once per plugin origin; above that a file read answers 503 without opening
      the file, and the slot comes back on end, error, cancel, HEAD, or refusal.
      Part 1 had no such cap.
    - A listing reads at most 5,000 names (`LIST_MAX_ENTRIES`), kept or not, in
      the file system's order, sorts them in UTF-16 code-unit order, and adds
      `"truncated": true` when the folder has more; HEAD on a listing stops at
      opening the folder. Listings also leave out dangling links and anything that
      is neither a regular file nor a folder (a FIFO).
    - Every answer carries `nosniff`, `no-store`, and `READ_CSP`. `.html`, `.htm`,
      and `.xhtml` are sent as `text/plain` too, besides `.js`, `.mjs`, and `.cjs`;
      SVG keeps `image/svg+xml`, which an `<img>` needs. Anything but GET and HEAD
      is 405 (with `Allow: GET, HEAD`) before the no-folder 404.
    - `safeRelative` also refuses `CONIN$`, `CONOUT$`, and `COM¹`-`COM³`,
      `LPT¹`-`LPT³`.
- **The layout shell is built** (Part 1's S7), ahead of S3 to S6, with Code and Paper as
  placeholder tabs. The dock shell in `frontend/src/desktop/` is unreferenced and is
  deleted in S8.
- **S6 is split in three.** S6a-1, the Code view's Git handler, is done (pending its
  pull request's merge) and not mounted; S6a-2, the Code view plugin (its manifest,
  the mount at `/api/code-view/git` on `app://code-view`, and the page), is next; S6b,
  the Paper view, waits on the Human Owner's answer about PDF.js (below; A9). S5's
  proof stays the fixture tests that `npm test` in `os-ui/client` runs, which only the
  advisory `desktop.yml` runs in CI; the end-to-end suite reaches the channel from
  S6a-2 on.
- **S6a-1** is [frontend/server/codeGit.ts](frontend/server/codeGit.ts) with
  `codeGit.test.ts` in the required CI job. Nothing declares or mounts it yet: no
  `BUNDLED_HANDLERS` entry, no manifest, no `DESKTOP_ONLY_HANDLERS`. The code is the
  authority where it differs from Part 2's Gap 1, after the S5 review:
  - Answers: every route answers `{ repo: null }`, or `{ repo: null, problem }`
    when git is missing, too old, or the repository is refused, with status 200.
    Otherwise each answer carries `repo` ("project" or "workspace"), `root` (the
    repository's top, relative to the workspace) and `filter` (the path filter,
    relative to `root`: `.` or `projects-folder/<name>`), so the view can name the
    command it reflects; file paths are always relative to the project. `/` gives
    `head` (merges left out, as in `/log`). `/log` gives commits with `files`,
    `added`, `deleted` under the filter. `/commit` gives `files` (each with
    `status`, null counts for a binary file, the blobs' `sizes` for a binary file
    from `cat-file --batch-check`, and `openable`), plus `stat`, the exact totals
    even when the list is cut. `/diff` gives the patch.
  - Git 2.45 or later, for `--no-lazy-fetch` (release notes 2.45.0), not 2.31.
    Stock Ubuntu 24.04 (2.43.0), Ubuntu 22.04 (2.34.1) and Debian 12 (2.39.5) are
    below it; Debian 13 (2.47.3) and Fedora (2.56.1) are not.
  - More guards than `--no-ext-diff` and `--no-textconv`: no `GIT_*` from the
    caller, the global and system config not read (`trace2.*Target` there writes
    files), `--no-lazy-fetch`, `--no-replace-objects`, `--literal-pathspecs`,
    `core.fsmonitor=false`, `--no-show-signature`, `--submodule=short`,
    `--no-follow`, and flags that keep the output's shape (`--root`,
    `--no-renames`, `--diff-merges=first-parent`, `--encoding=UTF-8`, `--no-color`,
    prefixes, `core.quotePath=false`). Nothing in the working tree is read:
    `--attr-source=<commit>` for `.gitattributes`, `--no-use-mailmap` for
    `.mailmap`, and `--ignore-submodules=none` for `.gitmodules`, whose
    `ignore = all` would otherwise hide gitlink changes. Files the repository's
    config names anywhere are not read either (`-O<null device>` for
    `diff.orderFile`, which failed every diff when missing,
    `core.attributesFile=<null device>`, and `mailmap.file` through
    `--no-use-mailmap`). A FIFO among the files Git opens inside `.git` (such as
    `info/attributes`) still stalls each command until the 10 s limit. The table at
    the end of the file accounts for every `git help config` key that names a
    program, and `RunOptions.env` (an edit of the runner's environment) carries the
    environment. An explicit `--git-dir` skips Git's `safe.directory` check (tried
    with `GIT_TEST_ASSUME_DIFFERENT_OWNER=1`), so these guards are the only ones.
  - Refused with a `problem`, never falling back to the workspace's repository: a
    `.git` that is a link or a gitfile (a linked worktree, as an agent's worktree
    is, or a submodule checkout), a link directly inside `.git`, a `commondir`,
    `objects/info/alternates`, or a link among `objects/<xx>`, `objects/pack` or
    `objects/info`. Loose object files are not checked one by one.
  - `/commit` of a commit that changes nothing under the filter is 404, so other
    workspace commits' messages stay out. `/diff` opens exactly one file the commit
    changes, never a folder; a path with a segment starting with "." is 400, and
    `/commit` lists such files with their counts and `openable: false`.
  - Caps: 4 KiB for one line, 256 KiB for `/log`, 512 KiB for a file list, 64 KiB
    for a message, 1 MiB for a patch, cut back to whole records; 10 s per command.
    `/log` answers `more: false` once the next `skip` would pass 10,000, so the list
    ends at about 10,050 commits. An error's text names the workspace as
    `<workspace>`, never by its absolute path.
    `processRunner` now decodes output once (a split character survives) and gains
    `maxOutputBytes` and `truncated`.
  - `createRegistry` takes `skip`: declared handler keys that need no factory and are
    not mounted; a factory for a skipped key is no orphan.
  - Each guard has a test that fails without it (checked by removing each in turn),
    except `--work-tree`, `--no-optional-locks`, `--no-ext-diff`,
    `GIT_CONFIG_NOSYSTEM`, and `core.fsmonitor=false` (which
    `--ignore-submodules=none` now makes a second layer: removing both starts the
    monitor), which no output of these commands can show; tests of the arguments
    and the environment pin them. The tests whose marker programs are
    shell scripts skip on Windows. `info/grafts` is honoured, as
    `--no-replace-objects` does not cover it.
  - For S6a-2: `codeGitHandler(ctx, git)` takes the git program, so the client can
    pass the path its Settings check found instead of `git` from `PATH`, which on a
    Mac without the Command Line Tools is the stub that offers to install them.
- **Waiting on the Human Owner:** whether the Paper view may vendor PDF.js (Part 2), and
  whether a third-party plugin may add a left-navigation item (Part 1, Q-PO1).

---

# Part 1. Registry and manifest


The design keeps the five decided contribution kinds and closes two gaps the decided rows leave open:
- **Left-menu pages.** A home panel gets a `placement: "home" | "nav"` field, so Paper Wiki can have its own left-menu item without a sixth kind.
- **Code and Paper views.** They are framed pages on their own `app://<id>` origin, reading files through a new path-checked channel.

Steps S1 to S5 of the change sequence can land before the layout is chosen; S6 to S8 must wait for mockups. One question needs the product owner (Q-PO1). Nothing was written or run: this is a read-only design.

All paths are relative to the repository root.

## 1. Findings

**The window list.** `APPS` (`os-ui/frontend/src/desktop/apps.tsx:78-138`) holds six apps. Each has an id, title, icon, default size, `fill` and `render(state)`. The `LIVE`/`DESKTOP` filter is at :136-138. Every consumer is in the dock shell:
- `Desktop.tsx:19-27` reads the size.
- `:59` opens `dash` at start.
- `:72-74` maps the Help-menu `open-system` command to `system`.
- `:158-181` renders the windows and the Dock.
- `Dock.tsx:2-10` and `:79-81` use `data-dock-app` and title-as-aria-label.
- The e2e tests click by those titles: `os-ui/client/e2e/app.test.ts:182` "System", `:189` "Root Agent", `:220` "Paper Wiki".
- `frontend/README.md:45,112` documents the list.

**The mount list exists twice.**
- `createMounts` (`os-ui/frontend/server/api.ts:15-22`) is used only by the client (`os-ui/client/src/main/index.ts:158`).
- The dev server never calls it. Four Vite plugins repeat the prefix and token: `skill-toggle-plugin.ts:20`, `paper-status-plugin.ts:17`, `paper-sources-plugin.ts:19-20`, `chat-plugin.ts:36-37`. They are registered at `vite.config.ts:15`.
- Tests pin both: `api.test.ts:12-22` (order and flags) and `devServer.test.ts:44-67` (real Vite).

**Paper Wiki is also compiled in at six more places:**
- `protocol.ts:17-21`: host and status prefix.
- `protocol.ts:31`: `frame-src`.
- `protocol.ts:126-134`: wiki routing, which reserves `api/`.
- `protocol.ts:219-224`: `splitMounts`.
- `index.ts:302-305`: subframe navigation.
- `PaperWikiPage.tsx:15`: the frame src.

The dev server and Pages also get a cache copy (`start.sh:28-33`, `pages.yml:49-50`). The registry must own all of these.

**The security model to preserve.** The registry supplies data; the adapters keep their rules.
- **Token.** Created per launch at `index.ts:44`. Reaches only the top frame (`index.ts:333`, `preload/index.ts:21-24`). On the dev server it comes from `chat-plugin.ts:14`. It gates `/api/chat` and `/api/paper-sources` only.
- **The two adapters order checks differently, on purpose.** The dev server checks the token before routing and has no 415. The client returns 404, then 415, then 401 (`protocol.ts:241-247`).
- **Each origin reaches only its own mounts.** Covered by `protocol.test.ts:202-207` and e2e `:218-251`. The scheme is not CORS-enabled (`index.ts:55`).
- **CSP.** `frame-src` names only the wiki (`protocol.ts:31`). `WIKI_CSP` goes on every wiki response (`:131-133`).
- **Paths.** `safeRelative` is at `:94-105`. Workspace files are confined by real path, renderer files lexically (`:162-176`, tests `:153-174`).
- **Electron guards in `index.ts`.** The navigation guard is at `:302-359`, `window.open` is denied, IPC answers the top frame only (`:379-382`), and permissions are at `:430-433`.

**Two gaps in the decided rows:**
- **(a) Left-menu pages.** The Layout row puts Paper wiki (and later Skills) in the left menu, but none of the five kinds is a menu page. I read "home panel" as a page that belongs to the workspace rather than to one project, with `placement: "home" | "nav"`. `"nav"` is for bundled plugins only until Q-PO1 is answered. No sixth kind.
- **(b) Framed views.** Rows 558 and 561 mean the Code and Paper views are framed pages on their own origin, so they need a file channel in step 1 (§3).

**CI.** The required `ci.yml` runs only `os-ui/frontend` `npm test` (`server/**/*.test.ts`) and `npm run build`. All client tests and the e2e suite run in the advisory `desktop.yml`.

## 2. Manifest

- **File.** One `plugin.json` per plugin. JSON is row 557's "one structured file".
- **Location.** Bundled plugins live in `os-ui/frontend/plugins/<id>/`. That package is the one the dev server and the client already build from, so plugin tests run in the required job and `tsc` checks them with no new package. Step 3's split moves them with the app.
- **Version.** The host's contract version is `CONTRACT` in `server/manifest.ts`. Each manifest declares a caret range.

```ts
// os-ui/frontend/server/manifest.ts — pure, no Node imports (the renderer imports it too)
export const CONTRACT = { major: 1, minor: 0 } as const;
/** Set by the loader from where the folder came from; never read from the manifest. */
export type PluginSource = "bundled" | "local";       // "local" loads from step 2; validated from day one
export interface PluginManifest {
  contract: string;              // "^1.0": this major, at least this minor
  id: string;                    // /^[a-z][a-z0-9-]{1,30}[a-z0-9]$/, not "research-os"; host of app://<id>; permanent
  name: string;                  // 1–40 chars (Plugins page)
  version: string;               // free text
  description?: string;          // ≤ 200 chars
  site?: { workspace: string };  // bundled only: serve app://<id>/ from this workspace folder, not <dir>/site/
  reads?: string[];              // workspace roots readable via app://<id>/_os/; "*" = exactly one segment
  contributes: {
    homePanels?: HomePanel[];
    projectViews?: Page[];
    handlers?: string[];         // bundled only: mounted at /api/<id>/<handler>, on app://<id> only
  };
}
export interface Page { id: string; title: string; entry: string }   // id /^[a-z][a-z0-9-]*$/, unique per plugin
export interface HomePanel extends Page { placement?: "home" | "nav" } // "nav": bundled only in 1.0
export type Parsed = { ok: true; manifest: PluginManifest } | { ok: false; problems: string[] };
export function parseManifest(raw: unknown, source: PluginSource): Parsed;
export function contractAccepts(range: string, host?: typeof CONTRACT): boolean;
export function safeRelative(pathname: string): string | null; // moved from protocol.ts, re-exported there
export function matchRoot(rel: string, roots: readonly string[]): string | null; // concrete matched root or null
```

**Parse rules:**
- Unknown keys are refused at any level, with the key and the host contract named in the message.
- The range must be `^M.m`, with the same major as the host and a minor no higher than the host's.
- `site`, `handlers` and `placement: "nav"` are refused unless the source is `bundled`.
- Every path must pass `safeRelative`, be non-empty, and contain no segment starting with `.`.
- `entry` may not start with `api/` or `_os/`.

**Deferred.** `skills` and `agents` come later as compatible 1.x minors. `paper-wiki-manager` stays in the hub, because `ci.yml` and `desktop.yml` reference its path.

```jsonc
// os-ui/frontend/plugins/paper-wiki/plugin.json   (S2)
{ "contract": "^1.0", "id": "paper-wiki", "name": "Paper Wiki", "version": "1.0.0",
  "description": "The paper-wiki/ graph viewer and its reading-status buttons.",
  "site": { "workspace": "paper-wiki" },
  "contributes": { "homePanels": [{ "id": "viewer", "title": "Paper Wiki", "entry": "viz.html", "placement": "nav" }],
                   "handlers": ["status"] } }      // → /api/paper-wiki/status: today's prefix, which viz.html fetches
// os-ui/frontend/plugins/code-view/plugin.json    (S6)
{ "contract": "^1.0", "id": "code-view", "name": "Code view", "version": "0.1.0",
  "description": "A project's code files, read-only.", "reads": ["projects-folder/*/Code"],
  "contributes": { "projectViews": [{ "id": "code", "title": "Code", "entry": "index.html" }] } }
// os-ui/frontend/plugins/paper-view/plugin.json   (S6)
{ "contract": "^1.0", "id": "paper-view", "name": "Paper view", "version": "0.1.0",
  "description": "A project's paper: main.pdf and its LaTeX sources, read-only.", "reads": ["projects-folder/*/paper"],
  "contributes": { "projectViews": [{ "id": "paper", "title": "Paper", "entry": "index.html" }] } }
```

## 3. Registry

### Server side

```ts
// os-ui/frontend/plugins/bundled.ts — pure; the list order is the menu and project-tab order
export const BUNDLED_IDS = ["paper-wiki"] as const;  // S6 → ["paper-wiki", "code-view", "paper-view"]

// os-ui/frontend/server/pluginHandlers.ts — server only; the one way plugin code becomes a mount
export const BUNDLED_HANDLERS: Readonly<Record<string, HandlerFactory>> = { "paper-wiki/status": paperStatusApi };

// os-ui/frontend/server/api.ts — Mount and matchMount unchanged
export const TRUNK_MOUNTS: readonly TrunkMount[] = [
  { prefix: "/api/skill/toggle", factory: skillToggleApi, token: false },
  { prefix: "/api/paper-sources", factory: paperSourcesApi, token: true },
  { prefix: "/api/chat", factory: chatApi, token: true },
];

// os-ui/frontend/server/registry.ts
export type HandlerFactory = (ctx: ApiContext) => ApiHandler;
export interface TrunkMount { prefix: string; factory: HandlerFactory; token: boolean }
export interface LoadedPlugin { manifest: PluginManifest; source: PluginSource; dir: string }
/** <root>/<id>/plugin.json per id, in order. Reported and skipped, never thrown: a manifest that fails
 *  to parse, a repeated id, a local plugin taking a bundled id, or /api/<id> overlapping a trunk prefix. */
export function loadPlugins(root: string, ids: readonly string[], source: PluginSource,
  taken: { trunk: readonly TrunkMount[]; plugins: readonly LoadedPlugin[] }): { plugins: LoadedPlugin[]; problems: string[] };
export interface Registry {
  plugins: readonly LoadedPlugin[];
  app: readonly Mount[];                            // app://research-os: trunk only
  byPlugin: ReadonlyMap<string, readonly Mount[]>;  // app://<id>: its handlers only, always token: false
  all: readonly Mount[];                            // dev server's single origin: trunk, then plugins
}
/** Per open workspace. Mounts handlers only for source "bundled". Throws only on factory drift
 *  (declared handler without factory, factory nobody declares): a bundling bug the tests catch. */
export function createRegistry(input: { ctx: ApiContext; trunk: readonly TrunkMount[];
  plugins: readonly LoadedPlugin[]; factories: Readonly<Record<string, HandlerFactory>> }): Registry;
```

**How "host-side handlers are bundled-only" is enforced.** Three independent locks:
1. `source` is an argument to the loader, never a manifest field.
2. The parser refuses `handlers` unless the source is bundled.
3. Handler code exists only in the compiled-in `BUNDLED_HANDLERS`. `createRegistry` mounts a factory only for a bundled plugin. No code path ever `import()`s from a folder.

Tests prove that a local plugin that declares a handler is reported as a problem and gets no mount.

**The token flag.** Trunk mounts keep `Mount.token` as it is. Plugin mounts are always `token: false`, with no manifest switch:
- The token never reaches a plugin frame, so a token-gated plugin handler could not be called from its own page.
- What protects a plugin handler is its own origin plus JSON-only writes.
- On the dev server it is exactly as exposed as today's status endpoint.
- A handler that runs an agent or touches keys belongs in the trunk.

A test asserts that every `byPlugin` mount has `token: false` and that none appears in `app`.

**Dev server.** A serve-only `api-plugin.ts` replaces the four plugin files:
- It mounts `all`, loading plugins from `<frontend>/plugins`.
- Token mounts call `hasToken` before routing.
- `TOKEN`, `hasToken` and the startup line move there.

### Client side

```ts
// os-ui/client/src/main/protocol.ts
export interface PluginSite { id: string; reads: readonly string[];
  files: { kind: "plugin"; dir: string } | { kind: "workspace"; rel: string } }  // lexical | real-path confined
export function pluginSites(plugins: readonly LoadedPlugin[]): ReadonlyMap<string, PluginSite>;
export function appCsp(hosts: readonly string[]): string;   // frame-src app://<id> per host
export function allowedNavigation(url: string, isMainFrame: boolean, hosts: readonly string[]): boolean; // from index.ts
export type Route =
  | { kind: "api"; pathname: string; host: string }        // "research-os" → registry.app, else byPlugin.get(host)
  | { kind: "file"; root: string; rel: string; fallback: string | null; csp: string | null; confined: boolean }
  | { kind: "read"; site: PluginSite; rel: string; list: boolean }
  | { kind: "not-found" };
export function route(url: string, roots: { renderer: string; workspace: string | null },
  sites: ReadonlyMap<string, PluginSite>): Route;
export function createHandler(state: () => { renderer: string; workspace: string | null;
  sites: ReadonlyMap<string, PluginSite>; registry: Registry | null; token: string; csp: string }): (r: Request) => Promise<Response>;
```

**CSP.** The host picks the profile; a manifest never supplies one:
- `WIKI_CSP`, unchanged, for workspace sites.
- `PLUGIN_CSP` for plugin-folder sites: `WIKI_CSP` plus `'self'` in `script-src` and `style-src`.
- `READ_CSP` (`sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'`) on channel responses.

`appCsp(["paper-wiki"])` is byte-identical to today's `CSP`, and a test pins the literal.

**The read channel.** `app://<id>/_os/files/<rel>` returns bytes; `app://<id>/_os/list/<rel>` returns `{entries: {name, dir, size}[]}`. Rules:
- GET and HEAD only; otherwise 405. 404 when no workspace is open.
- The path is decoded once with `safeRelative`. Any segment starting with `.` is refused: `.env`, `.git`, `.venv`.
- `matchRoot` must succeed, and the target's real path must lie inside the matched root's real path.
- Listings drop dot entries and anything that resolves outside the root.
- Responses carry `nosniff`, and `.js`/`.mjs`/`.cjs` are served as `text/plain`.
- Served on plugin origins only: not on the app origin, and not on the dev server in step 1 (A3).

### Frontend side

```ts
// os-ui/frontend/src/plugins/pages.ts — pure, node-testable (imports only ../../server/manifest.ts)
export type Slot = "nav" | "home" | "project";
export interface PluginInfo { id: string; name: string; version: string; description: string; source: PluginSource }
export interface PluginPage { key: string /* "<plugin>/<page>" */; plugin: string; slot: Slot; title: string;
  src: string | null /* null where this environment cannot serve it */; origin: string /* accepted message origin */ }
export function pluginPages(plugins: readonly PluginManifest[], env: { desktop: boolean; selfOrigin: string }): PluginPage[];
export function viewSrc(page: PluginPage, project: string): string | null;   // appends ?project=<folder name>
export interface AskMessage { type: "os.ask"; text: string }                  // contract 1.0's only page→host message
export function readAsk(event: { origin: string; data: unknown }, page: PluginPage): AskMessage | null;

// os-ui/frontend/src/plugins/registry.ts — Vite only
/** Step 1: import.meta.glob("../../plugins/*/plugin.json"), parsed, ordered by BUNDLED_IDS.
 *  Step 2: plus local plugins fetched from the main process; callers do not change. */
export function usePlugins(): { plugins: readonly PluginInfo[]; pages: readonly PluginPage[] };
```

**`src` per environment:**
- Desktop client: `app://<id>/<entry>`.
- Browser and Pages: `./<site.workspace>/<entry>` (the existing cache copy), or `null`, in which case the view says "open in the desktop app".

**Avoiding double duty.** The dock consumes the registry only through `PaperWikiPage`'s src. Its six apps do not map onto the new menu (Home is Dashboard plus Root Agent), so a dock adapter would be throwaway work. Trunk pages stay React and keep the `LIVE`/`DESKTOP` filter. `apps.tsx` goes away by deletion in S8.

## 4. Migration

| Today | Goes to |
|---|---|
| `dash` Dashboard | Trunk Home. The portfolio becomes the project cards; the Home mockup places Active Work, Activity and Governance. |
| `proj` Projects | Trunk Projects and the project workspace: the conversation on the left, `project`-slot tabs on the right. |
| `store` Skill Store | Trunk Skills page (`StorePage` unchanged) in step 1; the `skills-hub` plugin in step 2. |
| `paperwiki` | Plugin `paper-wiki`, panel `viewer`, placement `nav`. |
| `agent` Root Agent | Trunk Home, above the project cards. |
| `system` System | Trunk Settings; the `open-system` command opens it. |
| `/api/skill/toggle` (no token) | Trunk in step 1; a `skills-hub` handler `toggle` in step 2. |
| `/api/paper-wiki/status` (no token) | `paper-wiki` handler `status`, same prefix, on `app://paper-wiki` only. |
| `/api/paper-sources` (token) | Trunk (the conversation's Papers button). |
| `/api/chat` (token) | Trunk. |

## 5. Sequence

S1 to S5 can land before the layout is chosen. S6 to S8 must wait.

**S1. Manifest.** Adds `manifest.ts` and its test. Checked by required CI.

**S2. Server registry; dev server built from it.**
- Adds `paper-wiki/plugin.json`, `bundled.ts`, `registry.ts`, `pluginHandlers.ts` and `api-plugin.ts`, and deletes the four plugin files.
- `createMounts` stays unchanged for the client.
- Tests:
  - A new test shows `createRegistry(...).all` has exactly `createMounts`' prefixes and token flags.
  - `devServer.test.ts` and `api.test.ts` pass unchanged.
  - New registry and loader tests cover factory drift, local handlers getting no mount, trunk overlap being reported, and the real `plugins/` folder matching `BUNDLED_IDS`.
- Checked by required CI.

**S3. Client serves plugin origins.**
- Changes `protocol.ts` and `index.ts`.
- `build.mjs` copies every `plugins/*/` folder that has a `plugin.json` (manifest plus `site/`) into `out/plugins/`.
- Removes `createMounts`, `splitMounts` and `WIKI_*`.
- Test edits: `protocol.test.ts` keeps every assertion except `:68` and `:87` (`host`) and the `CSP` pin. `api.test.ts:12-22` is rewritten against the registry.
- The e2e suite is unchanged: endpoint refusals, isolation, Status buttons and the navigation guard, all through the dock.
- Advisory CI only: require a green `desktop.yml` run before merging.

**S4. Frontend registry.**
- Adds `pages.ts` (with tests; the `npm test` script gains `"src/**/*.test.ts"`) and `registry.ts`.
- `PaperWikiPage` takes its src from the registry.
- Proof: unit tests, the required build, and the advisory e2e check at `:222`.

**S5. Read channel.** Protocol tests on a fake site cover traversal, dot segments, `.env`, symlink and junction escapes, paths outside the roots, 405, listing filters and headers. Advisory CI.

**S6. Code and Paper view plugins** (waits for the view mockups).
- Adds both ids and updates the pinned CSP literal to three hosts.
- e2e: each frame loads on its own origin, reads a `nanochat_cpu` file, gets 404 for `.env`, and sees `typeof window.osDesktop === "undefined"`.

**S7. New layout** (waits for the layout mockup).
- `App.tsx` switches to it; `src/desktop/` is left unreferenced, so reverting is one line.
- The e2e suite is rewritten for the new menu with every security assertion carried over, and the README checklist is rewritten.

**S8. Remove the dock shell.** `pages.yml` then publishes only `viz.html`. This lands after the owner's checklist run.

## 6. Open questions

**The implementing agent decides (my recommendation in each):**
- **A1. When the contract freezes.** It may still change until step 2's folder loader lands, since no third-party plugin can exist before then. Freeze it in that commit.
- **A2. Unknown keys** are refused, not ignored.
- **A3. No read channel on the dev server in step 1.** It would expose project files to a tunnel without the token.
- **A4. Plugin sites** are static files, with `site/main.ts` bundled by esbuild in `build.mjs`.
- **A5. Code view scope.** It reads `projects-folder/*/Code` unless its mockup says otherwise; changing it is a one-line manifest edit.
- **A6. `os.ask`** only fills in the conversation input and never sends. At most 4,000 characters, and only from the active frame at its own origin.
- **A7.** `paperStatus.ts` stays in `server/` for step 1.
- **A8.** One plugin per view, and no `icon` field until the menu mockup needs one.
- **A9. How the Paper view shows `main.pdf` (verify in the client first).** As specified, `PLUGIN_CSP` inherits `frame-src 'none'` and no `object-src`, and `READ_CSP` sandboxes the PDF response. I recommend trying a narrow PDF path first: allow `frame-src 'self'` in `PLUGIN_CSP` and serve `.pdf` without `sandbox`. Check that Electron's built-in viewer renders it inside the sandboxed window before committing. If it does not, bundle a JS PDF renderer, which is a new dependency, and fetch the bytes over the channel. I did not verify Electron's PDF behaviour.

**The product owner decides:**
- **Q-PO1.** "Paper wiki has its own item in the left-hand menu. When you install a plugin someone else made, may it add its own menu item too, or only panels on Home and tabs inside a project?" Needed before step 2's folder loading.

## 7. Risks

1. **The plugin id is permanent.** It is the origin host and the handler namespace, so renaming a plugin breaks its URLs and its saved storage. Ids are validated strictly now and bundled ids are chosen once.
2. **`site.workspace` is an exception.** The Paper Wiki viewer's code is generated into workspace data, against "a plugin is code on the app side". It is bundled-only, so no third party depends on it. The way out: move `viz.js` and `viz.css` into the plugin and read the notes through the channel.
3. **Read access is coarse.** `*` gives a view every project, and the listing format becomes a third-party API in step 2. It is kept GET-only and minimal and freezes with A1. Step 2's enable screen should show `reads`.
4. **Enablement must live outside the workspace.** In step 2 it goes in `userData`, written only through top-frame IPC, because agents write workspace files.
5. **Framed pages lack the app's styles.** A trunk `/_os/theme.css` can be added later as a 1.x change.
6. **Two manifest sources from step 2.** The renderer will read bundled manifests at build time and fetch local ones at runtime. `usePlugins()` hides this, so switching to fetch-only changes no caller.
7. **The security-boundary steps have the weakest checks.** S3 and S5 move the boundary but are verified only by the advisory `desktop.yml`.

### Critical Files for Implementation
- os-ui/frontend/server/api.ts
- os-ui/client/src/main/protocol.ts
- os-ui/client/src/main/index.ts
- os-ui/client/test/protocol.test.ts
- os-ui/frontend/src/desktop/apps.tsx
---

# Part 2. Code view Git data and Paper view rendering


Both gaps can be closed without any new manifest field. The Code view gets one desktop-only Git handler. The Paper view should render with a bundled copy of PDF.js, because as the client is configured, Chromium's built-in PDF viewer will not render the file at all. Bundling PDF.js needs the product owner's yes. One message in the contract changes: `os.ask` becomes `os.select`, because the chosen mockup puts the "Ask the agent about this" bar in the host.

All paths are relative to the repository root. I read the S1/S2 code in `.claude/worktrees/agent-a0508108fb31fb6ee`.

## Gap 1: Code view, Git data

**Design.** One bundled handler, `git`, mounted at `/api/code-view/git`. It lives in a new `os-ui/frontend/server/codeGit.ts` and is listed in `pluginHandlers.ts` as `"code-view/git": codeGitApi`. All routes are GET only; anything else gets 405.

**Validating the project.**
- The name must match `^[A-Za-z][A-Za-z0-9_-]*$` (the rule in `chat.ts:8`).
- `resolveCwd(ctx.repoRoot, "projects-folder/<name>")` must be non-null. That function (`chat.ts:79-86`) accepts only registered projects, meaning folders with a `PROJECT_MEMORY.md`.
- The project folder's real path must lie inside `realpath(repoRoot)/projects-folder`.
- A malformed name gets 400; a project that is not registered gets 404.

**Validating the commit hash.**
- It must match `^[0-9a-f]{7,64}$`, otherwise 400. Because it is lowercase hex, it can never be read as an option.
- `git rev-parse --verify --quiet <hash>^{commit}` must then print one full hash, otherwise 404. Every later command uses the full hash.

**Validating the file path** (for diffs): `safeRelative(path) === path`, non-empty, at most 1,000 characters. **The `skip` value** must be an integer from 0 to 10,000.

**Which repository is read.** The handler never relies on Git's own discovery, so it can never pick up a repository above the workspace:

| Case | Repository used | Path filter | Diff paths |
|---|---|---|---|
| `projects-folder/<name>/.git` exists (step 3 layout) | the project's own | `.` | already project-relative |
| else `<repoRoot>/.git` exists (today) | the workspace's | `projects-folder/<name>` | made project-relative with `--relative=projects-folder/<name>/` |
| neither | none | | answers `{ repo: null }` with status 200 |

In both repository cases the file paths come back relative to the project, as the mockup shows ("Files changed in projects-folder/nanochat_cpu"). The `kind` field lets the view show which command it reflects. When `git` itself is missing, the answer is `{ repo: null, problem: "git was not found; see Settings" }`.

**How git is run.** Always as an argument list through `ctx.run`; `processRunner` spawns without a shell.
- `--git-dir=<root>/.git --work-tree=<root>` is always passed. This overrides any `GIT_DIR` in the user's environment, and as far as I know Git also accepts a `.git` file there.
- `--no-ext-diff --no-textconv` stop programs configured in the repository from running.
- Each command has a 10-second limit.
- Output is capped by size. This needs one small host change: `RunOptions.maxOutputBytes` and `RunResult.truncated` in `server/types.ts` and `process.ts`. The runner stops collecting and kills the child at the cap, and the handler cuts the output back to the last complete record.

```text
git --git-dir=<root>/.git --work-tree=<root> -c core.quotePath=false <subcommand…>    cwd = <root>

GET /        ?project              log --max-count=1 --format=%H%x1f%h%x1f%cs -- <spec>               (header pill)
GET /log     ?project&skip         log --no-merges --max-count=51 --skip=<n>
                                       --format=%x1e%H%x1f%h%x1f%cs%x1f%s --shortstat -- <spec>        cap 256 KiB
GET /commit  ?project&hash         show --no-ext-diff --no-textconv --no-renames --diff-merges=first-parent
                                       --numstat -z --format=%H%x1f%h%x1f%cs%x1f%an%x1f%s%x1f%b%x1e
                                       [--relative=projects-folder/<name>/] <full> -- <spec>            cap 512 KiB
GET /diff    ?project&hash&path    show --no-ext-diff --no-textconv --no-renames --diff-merges=first-parent
                                       --no-color --format= [--relative=…] <full> -- <spec>/<path>      cap 1 MiB
```

`--diff-merges` needs Git 2.31 or later; this machine has 2.55.0.

```ts
type Summary = { repo: "project" | "workspace" | null; head: { hash: string; short: string; date: string } | null; problem?: string };
type Log     = { commits: { hash: string; short: string; date: string; subject: string; files: number; added: number; deleted: number }[]; more: boolean };
type Commit  = { hash: string; short: string; date: string; author: string; subject: string; body: string;
                 files: { path: string; added: number | null; deleted: number | null }[]; truncated: boolean }; // null = binary
type Diff    = { path: string; diff: string; truncated: boolean };
```

**Files sub-view scope.** It keeps `reads: ["projects-folder/*/Code"]`, which matches the mockup's tree root `nanochat_cpu/Code/`.
- Paths outside `Code/` that appear in Changes (`index.md`, `paper/main.tex`) come only from Git, as file lists and diffs. They cannot be opened in Files.
- If they should be, widening the scope to `projects-folder/*` is a one-line manifest edit.

**Dev server: desktop only.** Plugin handlers carry no token, and diffs return project file contents, which A3 already keeps off a dev server that may be reached through a tunnel. The Code view's page cannot load in the browser anyway, because its `src` is null there. Two host-only changes make this work:
- `pluginHandlers.ts` exports `DESKTOP_ONLY_HANDLERS = new Set(["code-view/git"])`.
- `createRegistry` gains `skip?: ReadonlySet<string>`, for declared handlers that are neither required nor mounted. `api-plugin.ts` passes that set.

## Gap 2: Paper view

**What I read.**
- `os-ui/client/package.json` pins Electron 44.4.5.
- The window's `webPreferences` (`index.ts:331-339`) set preload, `contextIsolation`, `sandbox: true`, no `nodeIntegration`, `webSecurity` and no spellcheck. There is no `plugins` key, and Electron's WebPreferences page says `plugins` defaults to `false`.
- Subframes may navigate only to the wiki origin, `about:blank` or `about:srcdoc` (`index.ts:302-305`, `:358-359`).
- Every web permission except clipboard writes is denied (`:430-433`).
- `PLUGIN_CSP` inherits `default-src 'none'` and `frame-src 'none'` from `WIKI_CSP` (`protocol.ts:42-51`), so `object-src` falls back to `'none'`. `READ_CSP` sandboxes every channel response.
- Electron's own issue reports set `plugins: true` to view PDFs: electron/electron#25350, #33519, and #33907 ("Can't embed remote or local PDFs in iframes or webviews; crash when using custom protocol"). None of these is about Electron 44.

**Conclusion.** As configured, the built-in viewer cannot render `app://paper-view/_os/files/…/main.pdf`: plugins are off, the CSP forbids framing or embedding the file, the response is sandboxed, and the navigation guard will likely cancel the viewer's own internal frame. It also fails the mockup by design. The mockup's host-owned ask bar needs the reader's selection and page from the view's script, but the built-in viewer is a closed, separate document. That last point is from my knowledge of Chromium; I did not verify it.

**The one experiment** (about an hour, on a scratch branch, in `npm start`):
1. Set `plugins: true`.
2. Serve `main.pdf` without `sandbox`, and add `frame-src 'self'` to `PLUGIN_CSP`.
3. Log every `will-frame-navigate` URL and allow each one.
4. In the view page, put `<iframe src="./_os/files/projects-folder/nanochat_cpu/paper/main.pdf">` and a button that reads `iframe.contentDocument?.getSelection()?.toString()`.

Choose the built-in viewer only if the PDF renders, the selected text is readable from the view's script, and the owner accepts `plugins: true` for the whole window, which would include step 2's third-party plugin pages. I expect the selection check to fail.

**Fallback: PDF.js.** The npm package is `pdfjs-dist` 6.5.438 (latest when I checked), licensed Apache-2.0. The package is 37.6 MB unpacked, but the app would ship only two files: `build/pdf.min.mjs` (474 kB) and `build/pdf.worker.min.mjs` (1.27 MB), about 1.75 MB in total.
- **How to include it:** copy those two files, plus its LICENSE, into `plugins/paper-view/site/vendor/`, with a README giving the version, source URL and SHA-256. That is the same precedent as `paper-wiki-manager/scripts/vendor/`.
- **Why vendor:** installing the package through npm would also pull its optional native dependency `@napi-rs/canvas` into `npm ci`.
- **How the page uses it:** fetch the bytes over the channel and call `getDocument({ data, isEvalSupported: false })`. No eval, no wasm, no character maps.
- **Host change:** `PLUGIN_CSP` gains `worker-src 'self'`.
- **What will not render:** JPX images inside a PDF; pdfTeX output embeds its fonts.

Adding it needs the owner's yes: *"To show the paper inside the app with your selection passed to the agent, the app needs to include Mozilla's PDF.js (Apache-2.0 licence, about 1.8 MB). May it?"*

**What the Paper view shows**, based on a listing of `paper/`:

| Situation | The view shows |
|---|---|
| `main.pdf` exists | The rendered paper. |
| No `main.pdf`, but `main.tex` exists | "The paper has not been built yet: paper/main.tex exists, paper/main.pdf does not." `paper/main.tex` is selectable, so the user can ask the agent about it. |
| No `paper/` folder | "This project has no paper/ folder." |
| The PDF cannot be parsed | "paper/main.pdf could not be opened (\<error\>)." |

The view never builds the PDF itself, because the Bare-CLI row forbids write actions that exist only in the GUI.

## Manifests and contract

```jsonc
// os-ui/frontend/plugins/code-view/plugin.json
{ "contract": "^1.0", "id": "code-view", "name": "Code view", "version": "0.1.0",
  "description": "A project's files and its Git changes, read-only.",
  "reads": ["projects-folder/*/Code"],
  "contributes": { "projectViews": [{ "id": "code", "title": "Code", "entry": "index.html" }],
                   "handlers": ["git"] } }
// os-ui/frontend/plugins/paper-view/plugin.json
{ "contract": "^1.0", "id": "paper-view", "name": "Paper view", "version": "0.1.0",
  "description": "Renders the project's paper/main.pdf, read-only.",
  "reads": ["projects-folder/*/paper"],
  "contributes": { "projectViews": [{ "id": "paper", "title": "Paper", "entry": "index.html" }] } }
```

**Changes to contract 1.0** (it is not frozen yet, see A1):
- **The manifest schema does not change.**
- **The page-to-host message changes.** A6's `os.ask` becomes `{ type: "os.select", label: string, quote?: string }`, and `{ type: "os.select", label: null }` clears it. In the mockup (`c-document.html:674-678`, `:1185-1224`), the host owns the "Ask the agent about this" bar and the reference chips in the composer, so the view reports a selection rather than asking. Labels look like "Code/README.md:12", "63ead0b" or "main.pdf p. 2 · §2 Setup", the last taken from the PDF's outline. A quote is at most 2,000 characters.
- **`PLUGIN_CSP` gains `worker-src 'self'`**, if PDF.js is used.
- **From the S1/S2 implementer notes:**
  - The parser should refuse a `reads` root whose first segment is `*`.
  - S5 must apply the dot-segment rule to the whole requested path.
  - S3 copies `plugins/` into `out/plugins/`.

## Verification

**Required CI** (covers the parts that do not need the read channel):
- `server/codeGit.test.ts` runs against real temporary repositories:
  - the workspace layout, the project's-own-repository layout, and no repository at all;
  - a bad name, `../x`, an unregistered project, `hash=--output=x`, an unknown hash, and `path=../AGENTS.md`;
  - truncation at the cap;
  - a repository whose `.git/config` sets `diff.external` and a textconv to a script that writes a marker file, which must never appear.
- `process.test.ts`: `maxOutputBytes`.
- The registry test: a `skip`ped handler raises no drift error.
- `devServer.test.ts`: `/api/code-view/git?project=nanochat_cpu` is not answered with the handler's JSON.
- The loader and pages tests: both manifests load, and both views get a null `src` in the browser.

**Advisory e2e** (`desktop.yml`). The e2e workspace is copied without `.git` (`e2e/app.test.ts:25-35`), so the test asserts `repo: null` first, then runs `git init` inside the copied project:

```ts
writeFileSync(join(workspace, ".env"), "SECRET=1");
const frame = await pluginFrame(page, "app://code-view/");           // generalizes wikiFrame (:123-133)
const q = (p: string) => frame.evaluate(async (u) => (await fetch(u)).status, p);
assert.equal((await frame.evaluate(async () => (await fetch("/api/code-view/git?project=nanochat_cpu")).json())).repo, null);
gitCommit(join(workspace, "projects-folder/nanochat_cpu"), "e2e commit");  // fixed author/committer env
assert.deepEqual(await Promise.all([
  q("./_os/files/projects-folder/nanochat_cpu/Code/README.md"), q("./_os/files/projects-folder/nanochat_cpu/AGENTS.md"),
  q("./_os/files/.env"), q("/api/code-view/git/log?project=..%2Fx"), q("/api/code-view/git/diff?project=nanochat_cpu&hash=--output%3Dx&path=index.md"),
]), [200, 404, 404, 400, 400]);
assert.equal(await frame.evaluate(() => typeof (window as { osDesktop?: unknown }).osDesktop), "undefined");
await frame.getByText("e2e commit").waitFor();

const paper = await pluginFrame(page, "app://paper-view/");
await paper.locator("canvas").first().waitFor();
await paper.getByText("nanochat on a Laptop CPU", { exact: false }).first().waitFor();   // PDF.js text layer
// select text → host ask bar → "Ask the agent about this" → a chip appears in the project composer
renameSync(pdf, `${pdf}.bak`); await paper.evaluate(() => location.reload());
await paper.getByText("has not been built yet", { exact: false }).waitFor(); renameSync(`${pdf}.bak`, pdf);
```

The existing CSP-violation test (`:283-286`) should then come back empty with both frames loaded. Whether it actually sees console messages from subframes needs checking.

### Critical Files for Implementation
- os-ui/frontend/server/registry.ts
- os-ui/frontend/server/process.ts
- os-ui/frontend/server/chat.ts
- os-ui/client/src/main/index.ts
- os-ui/mockups/step1/c-document.html