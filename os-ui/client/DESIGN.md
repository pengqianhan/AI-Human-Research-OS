# Research OS Desktop Client — Design

The desktop client is one installable app for macOS, Windows, and Linux that
opens the os-ui desktop on a Research OS folder, with its live features (agent
conversations, skill toggles, paper status, paper sources), without a
terminal, `bash`, or a dev server. It is a second shell around the same
frontend, not a second UI.

Usage and commands are in [README.md](README.md); this file is the plan and the
settled design, and it describes the code as built. Authority order is the
repository's: actual files, [AGENTS.md](../../AGENTS.md), then this file. The
decision record is [ADR-0005](../../docs/adr/0005-desktop-client.md).

## 0. Authorization

- **Request (Human Owner, 2026-10-10):** 「我想把这个 Research OS 做成一个客户端，
  你给我一个方案，非常详细的方案，完成方案之后，编写代码。… 客户端要覆盖 Mac、Linux
  和 Windows 三个系统。」
- **Gate:** [GOAL.md](../../os-build/GOAL.md) M4 lists the desktop wrapper
  among items that need H2 usage evidence and a new Human Owner authorization.
  This request is that authorization for the **wrapper only**, and it waives
  the evidence precondition for the wrapper only, as the 2026-07-04 decision
  did for the read-only monitor. [HANDOFF.md](../../HANDOFF.md) ("Desktop
  future work", 2026-07-16) had already named Electron as the first candidate.
  GOAL.md itself is unchanged: its M4 annotation is a Next-session item for the
  Human Owner to confirm.
- **Scope:** the client exposes exactly the execution surface os-ui already
  has on its dev server: the agent conversations (2026-09-26), the skill toggle
  (2026-07-22), the paper reading status (2026-09-30), and the paper-source
  switches and keys (2026-09-30). It adds no new write action on repository
  content. Its own additions run only while the app runs and touch nothing but
  the generator's cache and the app's own settings: choosing a folder,
  regenerating `state.json` (on start, on change, on request), the
  prerequisites check, the in-app snapshot push, and desktop notifications.
- **Not authorized here:** publishing installers (GitHub Releases or any other
  channel) — the app drives users' Claude Code and Codex subscriptions, so
  provider terms come first (human-cognition entry cog-20260926-001); auto-update;
  code signing with a paid identity; a resident service or tray agent that
  outlives the window; remote access; accounts; a database; bundled agent CLIs;
  the Pi SDK engine.

## 1. Goals and non-goals

| ID | Goal | Checked by |
|---|---|---|
| G1 | Double-click to open on macOS (arm64, x64), Windows (x64, arm64), and Linux (x64, arm64) | `desktop.yml` builds each pair natively and starts the packaged app; full E2E on linux-x64, macos-arm64, windows-x64 |
| G2 | Plain files stay the only research state; the client keeps only its own settings | Code review; the generator writes inside the workspace even when it has no `.git` |
| G3 | One frontend for browser and desktop | `os-ui/frontend` builds once; the client bundles that build |
| G4 | Claude Code and Codex treated alike (cog-20260724-001) | All agent work goes through `os-harness`; no agent-specific code in the client |
| G5 | Missing prerequisites are named, not discovered by failure | Settings page and welcome state; E2E with an unusable folder |
| G6 | Behaviour of the existing dev server is unchanged | `server/*.test.ts` on the shared core and a real Vite dev server (`devServer.test.ts`) |

Non-goals: bundling Python, uv, or the agent CLIs; auto-update; a tray icon;
replacing the browser os-ui; GitHub Pages changes; Chinese UI.

## 2. Shell choice

| Option | For | Against |
|---|---|---|
| **Electron** (chosen) | The four endpoints are Node code and run in the main process unchanged; TypeScript only, like the frontend; HANDOFF names it; the planned Pi engine is Node-native; Playwright drives it for E2E | ~100–125 MB installers, Chromium per app |
| Tauri 2 | Small installers, system WebView | Endpoints rewritten in Rust or shipped as a Node sidecar; WebKitGTK and WebView2 render differently; Rust toolchain for builds |
| Localhost server + system browser | Least code | Not an app (no dock icon, notifications, or folder picker); a port reachable by every local process and browser tab |

Human-cognition entry cog-20260716-003 records that TypeScript is unfamiliar
to the Human Owner. Electron keeps the language count at what os-ui already
uses (TypeScript, plus the Python scripts it calls); Tauri would add Rust.

## 3. Architecture

```text
┌───────────────────────── Electron main process (Node 24) ─────────────────────────┐
│ index.ts      lifecycle, single instance, window, IPC, wiring                     │
│ settings.ts   userData/settings.json: folder, recent, notifications, bounds       │
│ workspace.ts  what a Research OS folder is; first choice; real path               │
│ shellEnv.ts   the login shell's environment for GUI launches; AppImage cleanup    │
│ python.ts     uv + pinned Python, else a probed system Python ≥ 3.11               │
│ generator.ts  serialized runs of os-ui/generator/generate.py (120 s limit)         │
│ inputs.ts     polls the files generate.py reads (4 s) → regenerate on change       │
│ protocol.ts   app://research-os (app) and app://<plugin id> (sites) → files | API │
│ ../frontend/server  the os-ui endpoints and plugin registry, shared with Vite     │
│ notifier.ts   os-harness/sessions → native notification when a turn ends          │
│ doctor.ts     uv, Python, Git, `harness.py check` (Claude Code, Codex)            │
│ menu.ts, windowState.ts, log.ts                                                   │
└────────────────────────────────────────────────────────────────────────────────────┘
        │ contextBridge (preload): window.osDesktop — six calls and this launch's token
┌──────────── app://research-os — os-ui/frontend production build ────────────┐
│ LIVE = dev server OR window.osDesktop present                                │
│ Settings page (desktop only); Paper wiki iframe → app://paper-wiki/viz.html   │
└──────────────────────────────────────────────────────────────────────────────┘
        │ child processes: the login-shell environment, windowsHide, UTF-8
   uv / python → generate.py, os-harness/harness.py, paper_search.py,
                 set_status.py, generate_viz.py, install_research_skill.py
                 → claude / codex (official CLIs, the user's own login)
```

### 3.1 Shared API core

The endpoints' logic lives in `os-ui/frontend/server/`, one module per
endpoint, written against a transport-free interface
([server/types.ts](../frontend/server/types.ts)):

```ts
interface ApiRequest { method: string; path: string; query: URLSearchParams; json(): Promise<unknown> }
interface ApiResponse { status: number; body: unknown }
interface ApiContext {
  repoRoot: string;
  python(): [string, ...string[]];   // command prefix for the repository's Python
  run: Runner;                       // spawns children (tests pass a fake)
  sessionsDir: string;               // os-harness traces
  publicWikiDir: string | null;      // dev server's paper-wiki cache copy; null in the client
  regenerate(): Promise<string | null>;
}
```

- `json()` is lazy (the queued endpoints read the body inside their job), turns
  an empty body into `{}`, and throws on malformed JSON; each handler turns that
  into its own 500, as before.
- On the dev server, one serve-only Vite plugin
  ([frontend/api-plugin.ts](../frontend/api-plugin.ts)) is the adapter. It
  mounts every endpoint the plugin registry lists
  ([server/registry.ts](../frontend/server/registry.ts): the app's own
  endpoints, then each bundled plugin's handlers), each at its own prefix; a
  token endpoint checks the token first (so an unknown path without a token
  is still 401), then the Connect request becomes an `ApiRequest`, and every
  reply carries `Content-Type: application/json`. (Until 2026-11-21 these were
  four plugin files, one per endpoint, with the same behaviour.) The client
  serves the same registry, split by origin (§3.2): it loads the bundled
  plugins once at startup and builds their endpoints with the trunk's each
  time a workspace is opened. (Until S3 of
  [os-ui/PLUGINS.md](../PLUGINS.md) it had its own list, `createMounts`.)
- Kept route for route: validation rules, status codes, the per-endpoint
  serialization queues (a failed job never blocks the next), and the 409 Write
  Lease.
- Deliberate deltas: every child now gets `PYTHONIOENCODING=utf-8` (before,
  only chat and sources did); a child that cannot start reports Node's spawn
  error rather than execFile's `Command failed` text; a relative
  `OS_HARNESS_SESSIONS` resolves against the repository root, where the harness
  that reads it runs; session folders are compared by real path, so a
  workspace reached through a symlink still finds its sessions and the Write
  Lease still holds; a trace line that does not parse (one being appended, or
  left half-written by a dead worker) is skipped instead of turning every
  session list into a 500; in the client the skill toggle's snapshot refresh
  goes through the serialized generator.

### 3.2 The app's origin and one origin per plugin

Each loaded plugin is served on its own origin, `app://<plugin id>`, so no
plugin page shares an origin with the app's endpoints, storage, or bridge, or
with another plugin. The first plugin, Paper Wiki, shows why: its viewer
renders note bodies as HTML (`marked`), and notes are written from outside
papers and web pages, so a note can carry script.

The bundled plugins (`BUNDLED_IDS` in
[frontend/plugins/bundled.ts](../frontend/plugins/bundled.ts)) are loaded once
at startup from `out/plugins/<id>/plugin.json`, which `scripts/build.mjs`
copies there; every problem, and any bundled plugin that did not load, is
logged as an `ERROR`. Their ids are the hosts below, the app policy's
`frame-src`, and the subframe targets the navigation guard allows. Each folder
opened gets a registry of their endpoints and the trunk's, built before any
poller starts; if a loaded plugin's declared handlers and the compiled-in
factories disagree, the problem is logged as an `ERROR` and the folder opens
with the trunk's endpoints only.

| URL | Served from |
|---|---|
| `app://research-os/api/...` | the trunk's endpoints (`TRUNK_MOUNTS`) |
| `app://research-os/state.json` | `<workspace>/os-ui/frontend/public/state.json` |
| `app://research-os/...` | the bundled renderer; extension-less paths fall back to `index.html` |
| `app://<id>/api/<id>/...` | that plugin's own handlers only (Paper Wiki: `/api/paper-wiki/status`; the Code view: `/api/code-view/git`); other `api/` paths are 404 |
| `app://<id>/_os/files?path=<rel>`, `app://<id>/_os/list?path=<rel>` | the plugin's read channel: workspace files and folder listings inside the roots its manifest declares in `reads` (below); every other `_os/` path is 404 |
| `app://<id>/...` | the plugin's site: a workspace folder in place (Paper Wiki: `<workspace>/paper-wiki/`, no cache copy), or the `site/` folder beside its `plugin.json` (the Code, Paper, Skeleton, Assets, and Idea views: `index.html`, `style.css`, and `main.js`, which `scripts/build.mjs` bundles from the site's `main.ts`, no TypeScript ships; the Paper view also `vendor/`, PDF.js copied as it is) |
| any other host | 404 |

- Paths are decoded once; `..`, `\`, `:`, NUL, and Windows device names (CON,
  NUL, COM1, CONIN$, …, alone or with an extension, `nul.txt`) are refused
  before any file access. A device name followed by spaces or dots, which
  Windows also opens as the device (`nul `, `con .txt`), is not refused there
  (the manifest parser refuses such paths in a manifest); whether the real-path
  checks below stop it on Windows is not verified. Workspace files
  must also have their real path (symlinks and junctions resolved) inside
  their root; the renderer and a bundled plugin's `site/` folder, possibly
  inside an asar archive, are confined lexically; any other plugin's `site/`
  folder by real path.
- On a plugin's origin, `api` and `_os` are never files, in any case and
  without a trailing dot or space (`API/`, `_OS/`, `api./`), and neither is
  the bare `/`.
- On the app's origin, and below a plugin's own `/api/<id>/`, endpoints answer
  503 while no folder is open, then 404 (no such endpoint on this origin),
  415, and 401, in that order. Any other `api/` path on a plugin's origin is a
  plain 404, folder or not. A plugin's handlers never take the token, which
  never reaches a plugin's frame.
- The scheme is registered standard, secure, fetch-capable, and stream-capable,
  and **not** CORS-enabled, so pages of one origin cannot read another's.
- The viewer probes its status endpoint whenever it is not opened from disk
  (`location.protocol !== "file:"` in paper-wiki-manager's `viz.js`; before,
  only http and https), so its Status buttons work in the client. A workspace
  whose committed `paper-wiki/viz.html` predates this shows read-only status
  until `generate_viz.py` runs.

**The read channel** (S5 of [os-ui/PLUGINS.md](../PLUGINS.md); `serveRead` in
[src/main/protocol.ts](src/main/protocol.ts)). A plugin page reads workspace
files, read-only, inside the roots its manifest declares in `reads`, whether
the plugin is bundled or local. A `*` segment matches any one segment whose
name does not start with `.`, a file's name included:
`projects-folder/*/Code` matches `projects-folder/Alpha/Code`, and
`projects-folder/*` matches `projects-folder/notes.md` as well as a project.
A root names a path, not a kind of entry, so it may name a file
(`projects-folder/*/paper_skeleton.md`, the Skeleton view's). When that path is
a file, it is served by GET and HEAD, while a path below it, a listing of it, a
sibling, and the project folder are 404. When a project holds a folder of that
name, the folder is the root and its own contents are readable, as a folder
root's are (a link in it leaving the root is still 404). Every rule below
applies unchanged; `test/protocol.test.ts` ("a file root") pins those cases,
the folder case, links at the file root, `*` matching exactly one segment, and
Windows spellings.

- `GET app://<id>/_os/files?path=<rel>` returns the file's bytes;
  `GET app://<id>/_os/list?path=<rel>` returns
  `{"entries": [{"name": string, "dir": boolean, "size": number}]}`, sorted by
  name in UTF-16 code-unit order (JavaScript's default sort), `size` 0 for a
  folder, with `"truncated": true` added when the folder has more names than
  the cap. `<rel>` is relative to the workspace and is a query value: decoded
  once by the URL parser, so `+` is a space and `%2B` a plus.
- The file's path is in the query, never in the URL path: for an `app://` URL,
  Electron 44's Chromium runs a `<script src>` whose path ends in `.js` or
  `.mjs` whatever its Content-Type and `nosniff`. With the path in the query,
  the URL path is always `/_os/files`, which names no type, and a
  `text/plain` script sent with `nosniff` is refused. Verified in Electron
  44.4.5 under the real `PLUGIN_CSP`: classic scripts, module scripts,
  `import()`, and workers from the channel were all blocked, while a control
  path ending in `.js` with the same headers ran.
- Only the exact, lower-case paths `/_os/files` and `/_os/list` are the
  channel, compared before decoding, with exactly one `path` parameter (a
  missing, empty, or repeated one is 404; other parameters are ignored). Every
  other path under `_os` (`_OS/files`, `_os/Files`, `%5Fos/files`,
  `/_os/files/<rel>`) is 404, and nothing under `_os` is ever a site file. The
  app's origin has no channel (`_os/...` there is a renderer path like any
  other), nor has the dev server (A3 in [os-ui/PLUGINS.md](../PLUGINS.md)).
- GET and HEAD only: anything else is 405, folder open or not. HEAD answers
  with the headers and no body. With no folder open, 404.
- The path is checked as a URL path is (no `..`, `\`, `:`, NUL, or device
  names), without being decoded again. A segment starting with `.` (`.env`,
  `.git/config`, `a/.venv/x`) or an empty path is 404, as is a path below none
  of the plugin's roots, so a plugin without `reads` reads nothing.
- Where a root may resolve, symlinks and junctions resolved: the matched
  root's real path must lie inside the workspace's, must not be the workspace
  or a dot folder of it, and must itself be one of the plugin's roots as
  written. The declared pattern is the boundary, and a link planted in a
  cloned project cannot move it: `projects-folder/Evil/Code` linked to
  `human/private`, or a project folder linked into it, is 404, while a root
  linked to another root the plugin may read (`projects-folder/Mirror` linked
  to `projects-folder/Beta`) is followed. Each check can be reversed alone: to
  follow a root that links out of the workspace, as Paper Wiki's site folder
  does, drop `isInside(top, rootReal)`; to follow one that links to any other
  folder of the workspace, drop `declaredRoot(...)`. Both are in `serveRead`.
- On a case-insensitive file system (macOS, Windows), the root's real path is
  spelled as on disk. A `*` segment in another case reads the same root
  (`projects-folder/alpha/Code` is `Alpha/Code`); a literal segment in another
  case (`.../code`) is 404 before the disk is asked; and a folder spelled on
  disk otherwise than declared (`Alpha/code` where `reads` says `Code`) is 404
  by either spelling.
- The target's real path must lie inside the root's, with no segment below
  the root starting with `.`, so a link inside the root to its `.git` is 404
  too.
- A listing leaves out names starting with `.`, entries that resolve outside
  the root or onto a dot path, dangling links, and anything that is neither a
  regular file nor a folder once resolved (a FIFO, a socket). A listing of a
  file, or of nothing, is 404, and so is a file request for a folder.
- A file is checked by path first, so a FIFO is never opened and the cap needs
  no read access; it is then opened without following a link in its last
  segment and without blocking (`O_NOFOLLOW`, `O_NONBLOCK`, where the platform
  has them), and checked again as opened. Its body streams 64 KiB at a time as
  it is read, never past the size `stat` gave; the file is closed at the end,
  on an error, or when the reader cancels.
- Caps: a file above 32 MiB (`READ_MAX_BYTES`) answers 413 before a byte is
  read. A listing reads at most 5,000 names (`LIST_MAX_ENTRIES`), kept or not,
  in the file system's order, so a larger folder is listed from those names
  and says `"truncated": true`; HEAD on a listing stops at opening the folder.
  At most 16 files (`READ_MAX_STREAMS`) are open for reading at once per
  plugin origin, since every held response keeps a descriptor and a pipe
  buffer; above that, a file read answers 503 without opening the file. A
  slot is given back when its body ends, fails, or is cancelled, at once for
  HEAD and for a file that is refused or cannot be opened, and as soon as a
  file of one chunk (64 KiB or less) has been read. Other origins, listings,
  and refusals are not held back.
- Every answer, refusals included, carries `X-Content-Type-Options: nosniff`,
  `Cache-Control: no-store`, and the read policy (§3.3). `.js`, `.mjs`,
  `.cjs`, `.html`, `.htm`, and `.xhtml` files are sent as
  `text/plain; charset=utf-8`, listings as `application/json`, and other files
  by extension (SVG as `image/svg+xml`, which an `<img>` needs).
- The Code view declares `reads: ["projects-folder/*/Code"]`, the Paper view
  `reads: ["projects-folder/*/paper"]`, the Skeleton view
  `reads: ["projects-folder/*/paper_skeleton.md"]`, the Assets view the four
  folders `Figs`, `Baselines`, `Code/results`, `Code/Datasets` and the two files
  `Code/README.md` and `paper_skeleton.md` of `projects-folder/*`, the Idea view
  the two files `idea_graph.md` and `paper_skeleton.md` of `projects-folder/*`.
  Besides the fixture tests in [test/protocol.test.ts](test/protocol.test.ts)
  (for the Assets and Idea views, against their bundled origins: nothing else of
  a project is read, neither of the Idea view's files can be listed, and a link
  that leaves its root is 404), the end-to-end suite reads
  through all four: `+`, `#`, `%`, a space and Chinese text in names and
  files, a 33 MiB `main.pdf` (413), and 404 for `.env`, for a file outside
  each view's root, and for a path below or a listing of the Skeleton view's
  file.

**The Code view** (S6a-2 of [os-ui/PLUGINS.md](../PLUGINS.md)). Its page reads
only `./_os/files`, `./_os/list`, and `/api/code-view/git` on its own origin,
every value through `encodeURIComponent`, and puts every name, line, message,
and patch on screen as text (its `dom.test.ts` scans the site and
`plugins/site-kit.ts` for HTML sinks; `PLUGIN_CSP` has no inline script, the
second layer). The Git handler is mounted on `app://code-view` only, with no token; the
client builds it on the git it finds (`src/main/codeView.ts`: the children's
PATH, absolute entries outside the workspace, never the Command Line Tools
stub) and logs what Git prints on a failure to `main.log`, which no endpoint
serves. A selection in the page is posted to `app://research-os` as
`{type: "os.select", label, quote?}`; the workspace accepts it only from the
active view's frame at that view's origin, shows "Ask the agent about this",
and answers `{type: "os.select.clear"}` at the view's origin when the user
clears it there. While the workspace is hidden (another screen shown) the bar
does not change, but the last valid message the active view posts meanwhile
(a Reload that ends then) is kept and applied when the workspace shows again,
so the bar and the view agree (`heldWhileHidden` in
[../frontend/src/plugins/select.ts](../frontend/src/plugins/select.ts));
clearing the selection meanwhile drops it. Asking adds a reference chip to the project's composer; only
Send sends. What Send passes is exactly what the user can read in the
composer: the host never rewrites a label (runs of ASCII spaces pass as
they are, since they are part of a path), and a label with a tab, a space
other than U+0020, a line break, or an invisible character (control, format,
default-ignorable, or the Braille blank) is refused; a quote's line breaks are made line feeds (each
line gets its `> `) and its invisible characters shown as markers, in the text
shown and sent alike. The ask bar shows the start of the quote before asking,
and a chip just added shows its whole text under the chips without a click,
except one from a view that quotes exactly what it draws (`QUOTES_AS_DRAWN`:
the Code view), which is added closed and opens on a click
([os-ui/PLUGINS.md](../PLUGINS.md), S6a-2).

**The Paper view** (S6b of [os-ui/PLUGINS.md](../PLUGINS.md)). Its page reads
only `projects-folder/<project>/paper/main.pdf` through `./_os/files` (and
lists `paper/` when that is 404, to say why), and draws it with Mozilla's
PDF.js 6.5.438, vendored unmodified in its `site/vendor/` (the Human Owner's
yes of 2026-11-22; its README gives the source, the registry's integrity, and
each file's SHA-256, which `npm test` checks). The page imports `pdf.min.mjs`
at run time from its own origin and starts `pdf.worker.min.mjs` itself, one
module worker per document handed to PDF.js as a `PDFWorker` port
(`site/opener.ts`), so neither file is bundled, PDF.js builds no `blob:`
worker, and it never falls back to parsing on the page's thread. Opening a
document closes the one before without waiting on it (its worker is
terminated after 2 s at most), and an open that does not finish within 20 s
ends with a screen and Try again. The PDF is untrusted input: the document
options turn off XFA, WebAssembly, Chromium's font engine (glyphs are drawn
as paths on the canvas) and its JPEG decoder (PDF.js decodes JPEG itself),
system fonts, and every fetch, and cap each image at 4096 × 4096 pixels; no
annotation layer, attachment, or PDF JavaScript is ever asked for, so links
are inert; the text layer is PDF.js's own (text nodes), and outline titles go
only into the selection label, as text (`site.test.ts`; the end-to-end
suite's hostile PDF has JavaScript actions, a URI link, and a markup title).
A selection posts `os.select` with the label `paper/main.pdf p. <n>` (or
`pp. <n>–<m>`), naming the pages whose text the quote holds, and
` · <outline heading>` when the PDF has an outline, and the quote cut on the
page to 2,000 characters with `…[cut]`. In a browser the tab says the view
opens in the desktop app.

What a selection quotes is the PDF's text layer, which can differ from what
is drawn: text in the invisible render mode, white on white, a fifth of a
point tall, clipped, or covered is selected with what surrounds it, and a
font's `/ToUnicode` map can make glyphs drawn as "ABC" extract as a sentence.
The view cannot tell those apart, so it does not try: the workspace shows the
quote's start and size in the ask bar, and the composer shows exactly what
will be sent as soon as it is added. Read it before pressing Send.

Resource bounds of the Paper view, as measured on macOS arm64
([os-ui/PLUGINS.md](../PLUGINS.md), S6b, has the numbers): pages are drawn
near the view only; a far page gives back its canvas, what PDF.js kept to
draw it, and its text layer; each canvas holds at most 4096 × 4096 pixels;
a page that takes longer than 15 s to draw (counting only time it can be
seen: PDF.js's drawing waits while the tab is hidden) is stopped, noted, and
its worker replaced, and its text is cut at 10,000 runs and given the same
15 s; at
most 1,000 pages are laid out, never past what one scrolling column can
reach at 300%. Not bounded: memory within each page's 15 s, which adds up
over the pages of one paper, since a stopped page's memory is not all given
back before the next page is drawn (one page of nested forms reached about
3.5 GB in the frame's process before it was stopped; four such pages reached
4.8 GB in a review), the sum of many images on one page (twelve at the cap peaked at 1.8 GB), and
PDF.js's own work while it opens a file of up to 32 MiB.

**The Skeleton view** (2.1 of [os-ui/PLUGINS.md](../PLUGINS.md) Part 3). Its
page reads only `projects-folder/<project>/paper_skeleton.md` through
`./_os/files`, at most 1 MiB of it (a larger file is a screen), and reads it
with the plugins' shared Markdown reader, `plugins/md-kit.ts`, which returns
blocks and tokens, never HTML: the page draws them as text, a link's target
only as its tooltip (never followed) and an image only as its alt text (never
loaded), with the host's invisible characters marked. The page sets no style,
`href`, or `src` from its code (its `dom.test.ts` scans the site, md-kit, and
site-kit). It shows mockup alternative B: the Snapshot card, the claims with
each one's evidence beside them (under the claim when the view is narrower
than 780 px), and everything else in the file folded by section, so nothing is
hidden without the view saying so (the title and the paragraph under it, left
out, are named in a muted line). Line numbers are counted by LF, as `grep -n`
counts them: a lone CR is a character, drawn as a marker. A Snapshot line, a
claim row, or a paragraph, list item, table row, or code block of an open
section posts `os.select` with the label `paper_skeleton.md:<lines> · claim
<ID>` for a claim, or `· section “<title>”` for anything else (the title as
plain text, a middle dot and curly quotes in it replaced, so no title can
forge a claim's label), and its lines as written as the quote, cut on the
page to 2,000 characters ending in the host's own `…[cut]` (the host ignores
a longer quote); a lone CR, which the host would take for a line break, is
quoted as `⟨U+000D⟩`. Its chip
opens by itself: the quote is the line as written, not what the page draws
(the Human Owner's decision of 2026-11-23). In a browser the tab says the view
opens in the desktop app.

**The Assets view** (2.2 of [os-ui/PLUGINS.md](../PLUGINS.md) Part 3). Its page
lists `Figs/`, `Baselines/`, `Code/results/`, and `Code/Datasets/` through
`./_os/list`, depth first, stopping at 4 levels, 40 listings, or 500 files a
group and saying so beside the group, as it says when a listing was cut at
5,000 names or could not be made. It reads `paper_skeleton.md` and
`Code/README.md` (1 MiB each) for "Used in" and for the datasets of the Data
section, and each listed folder's `README.md` for the descriptions of the files
beside it, at most four at once and 8 MiB in all, each reduced to its
descriptions as soon as it is read. A picture is an `<img>` whose only source is
the channel's URL for a path a listing gave, with the Reload's generation
beside it (`&v=<n>`, so Reload draws a changed picture again), an empty `alt`,
and nothing else from the file; at most four load at once (`queue.ts`), a busy
one is tried once more after a second, and a failed one asks the channel for
its status with a `HEAD` in the same slot. An SVG is shown only that way, and
only after `svg.ts` has read its text (at most 4 MiB, in the same slot) and
counted what its `<use>` references draw: over 200,000 elements, a cycle,
another picture held inside as a `data:` URL other than a PNG, JPEG, GIF, or
WebP, or a file it cannot check waits for the human's **Show**. The end-to-end suite pins
that a hostile SVG (script, `onload`, external images, `@import`,
`foreignObject`, a `<use>` to an outside URL) runs nothing and that a local
HTTP listener its URLs name hears no request. Previews: a CSV's first 20 rows
by 30 columns from its first 2 MiB, read in one pass; a JSON or text file's
first 40 lines from 256 KiB; Markdown drawn by md-kit as text; no PDF. A card
or row posts `os.select` with a label and no quote: the file's project path,
its names' invisible characters, the look-alikes of a label's own separators
(`·`, curly quotes, `:`, slashes other than `/`), `⟨` and `⟩`, and a space at
either end of a name as `⟨U+XXXX⟩` markers, cut in the middle past 200
characters, or `Code/README.md:<line> · dataset <name>`; when the label is not
the item as written, the panel says what the agent gets. Its chip opens by
itself.

**The Idea view** (2.3 of [os-ui/PLUGINS.md](../PLUGINS.md) Part 3). Its page
reads `idea_graph.md` (512 KiB) and `paper_skeleton.md` (1 MiB, for the claims
a claim node points to) through `./_os/files`, and nothing else. A 404 for the
idea file is the empty state, which shows the header line an agent writes; the
page writes nothing. The map is the page's own SVG: its geometry is numbers
from `layout.ts` set as attributes (no `style` anywhere), its boxes the page's
HTML in `foreignObject`s, every statement and cell put on screen as text with
invisible characters marked, a link's target only as a tooltip; its
`dom.test.ts` pins every attribute the page sets and every tag it makes. A
node posts `os.select` with the label `idea_graph.md · <ID> (<kind>)` and the
row as written as its quote (cut to 2,000 characters by the host's rule, line
breaks inside it as markers); its chip opens by itself. Reload keeps a selected
node that is still in the file, open and marked, and posts it again with its
row as it is now, or posts `null`; every screen that replaces the map posts
`null` too, so the page and the workspace agree after any Reload, whatever
screen was shown while it read. An ID and a status are drawn whole (each box is
measured, and taller when they need it); a line that skips a column runs through
it in a lane its boxes keep clear of, and the word of an open node's line sits
beside the node it names, on no box the line does not join, no other word, or
the legend.

Known limits of the channel, not yet handled:

- A concurrent writer could swap a folder on the path for a link between the
  check and the open. `O_NOFOLLOW` covers the last segment only.
- A hard link inside a root to a file elsewhere is indistinguishable from a
  regular file and is served.
- The manifest parser accepts any plain root, `human/private` included. Before
  third-party manifests load in step 2, the host needs a deny-list or an
  explicit enable step that shows `reads`.


### 3.3 Security baseline

- `contextIsolation`, `sandbox`, no `nodeIntegration`, `webSecurity`; the
  preload exposes six calls and the token, no Node objects.
- **Content-Security-Policy** as a response header, chosen by the host, never
  by a manifest. App pages (HTML and the `index.html` fallback), with one
  `frame-src` entry per loaded plugin, in load order (`appCsp` in
  `protocol.ts`; `frame-src 'none'` if none loaded):
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src app://paper-wiki app://code-view app://paper-view app://skeleton-view app://assets-view app://idea-view; object-src 'none'; base-uri 'none'; form-action 'none'`.
  A site served from a workspace folder (the Paper Wiki viewer):
  `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'none'; form-action 'none'; base-uri 'none'`
  — its own inline code runs; remote fetches, images, frames, and forms do not.
  A site in its plugin folder (the Code, Paper, Skeleton, Assets, and Idea views') gets no inline code
  at all, since it shows untrusted names and text:
  `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src 'none'; form-action 'none'; base-uri 'none'`
  (`PLUGIN_CSP`; styles set through the DOM still apply, which is how PDF.js
  positions its text layer). The Paper view needed no change to it: with no
  `worker-src`, Chromium takes the worker's source from `script-src 'self'`
  (the CSP fallback order), so PDF.js's module worker loads from the site's
  own origin, and a worker from `blob:` or `data:` is not allowed by it. The
  end-to-end suite pins that the worker runs under `PLUGIN_CSP` as served
  (WebAssembly is refused in it, and the violation names exactly that
  policy); that a `worker-src 'none'` stops the worker was tried by hand, not
  by a test. No `'wasm-unsafe-eval'`, `blob:`, or font source is needed
  either, since the page turns WebAssembly and font loading off; the
  end-to-end suite fails on any policy violation, the Paper view's frame
  included, with PDFs holding text, a font they do not embed, and JPEG and
  raw pictures. The policy is not what keeps a PDF's fonts out of Chromium:
  a FontFace made from bytes fetches nothing, so no policy would stop it. The
  document option `disableFontFace` does, and the end-to-end suite checks
  the frame's `document.fonts` stays empty after drawing a paper that embeds
  its fonts. Either policy is sent with every file the site
  serves, not only HTML: an SVG a frame is sent to is a document too. Every
  read channel answer, refusals included, carries
  `sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'`
  (`READ_CSP`): a workspace file a frame is sent to is an inert document on an
  origin of its own. A plugin page's `script-src 'self'` would admit a
  workspace script named in `<script src>`; it is refused because the
  channel's URL path never names the file and scripts go as plain text with
  `nosniff` (§3.2). Elsewhere, a 404, a 405, or an endpoint's JSON reply
  carries no policy.
- **Endpoints:** writes must be `Content-Type: application/json`, which a form
  or a no-cors request cannot send (415 otherwise); `/api/chat` and
  `/api/paper-sources` need a random per-launch token, which the preload hands
  to the top frame only (`--os-desktop-token` argument), as the dev server
  needs `OS_UI_TOKEN`.
- **Navigation:** `will-frame-navigate` and `will-redirect` keep the top frame
  on `app://research-os/` and subframes on a loaded plugin's origin (or
  `about:blank`, `about:srcdoc`); an http(s) or mailto link opens in the
  default browser only after a dialog naming the URL is confirmed, one dialog
  at a time (Electron cannot tell which frame asked, and the viewer runs note
  HTML); every `window.open` is denied.
- **Downloads:** every session the app creates cancels `will-download`, so a
  frame sent to a file it cannot show (the read channel's
  `application/octet-stream`) saves nothing and opens no Save dialog.
- **IPC** answers only the top frame of `app://research-os/`; no channel takes
  a path.
- **Permissions:** all denied except `clipboard-sanitized-write` (the copy
  buttons; Electron has no `prompt()` fallback). Native notifications come
  from the main process and need no web permission.
- **Trust:** opening a folder runs its scripts with the user's rights. A folder
  chosen in the dialog for the first time is confirmed once ("Open only
  folders you trust"); folders in Open Recent were confirmed before.
- Single instance: a second launch focuses the window and opens its
  `--workspace`, if given, handed over through the instance lock's data
  (Chromium rewrites the argv the first instance receives). Second launches and
  Dock clicks wait until startup has finished, so no window loads before the
  protocol exists.
- The app never reads CLI credentials; agent turns run only through
  `os-harness`, which strips API-key variables (ADR-0003).

## 4. Workspace

- A folder is a Research OS workspace when it contains `AGENTS.md`,
  `os-harness/harness.py`, and `os-ui/generator/generate.py`. `.git` is
  optional (GOAL.md §1: no Git is the default mode). The generator therefore
  takes the root by layout first (two levels above itself, when it holds
  `AGENTS.md`) and skips its `git` calls when the root has no `.git`; a copy
  without Git inside another Git folder still writes its own `state.json`.
- First choice, first match wins: `--workspace <dir>`, `OS_CLIENT_WORKSPACE`,
  the saved setting, the checkout of a development run (two levels above
  `os-ui/client`, never a further ancestor; a packaged app adopts no folder it
  happens to sit in), else none — the welcome state with **Choose folder…**. An
  explicit choice that is not a workspace is reported, never silently replaced.
- Every choice is canonicalized with `realpath`, matching how os-harness
  records session folders (macOS `/var` → `/private/var`, symlinks, junctions,
  subst drives).
- **File → Open Research OS Folder…** validates, confirms trust, saves, adds to
  **Open Recent** (5 entries), restarts the generator, poller, and notifier,
  and reloads the window. When opens overlap, the latest wins: an earlier one
  still probing for Python is dropped.

## 5. Process environment

- **Environment.** An app started from Finder, the Dock, or a Linux launcher
  inherits a minimal environment: no PATH to uv, Claude Code, or Codex, and
  none of the user's `OS_HARNESS_*`, `CODEX_HOME`, or proxy variables. On
  macOS and Linux the client runs the login shell once (`$SHELL -ilc`; `-ic`
  for csh and tcsh, which take `-l` only alone; stdin closed, own process
  group, 5 s limit), has it print `process.env` as JSON between markers via
  the app's own binary (`ELECTRON_RUN_AS_NODE=1`), stops reading at the closing
  marker (a background job started by an rc file may hold the pipe open), and
  lays that over the
  inherited environment, minus the probe shell's own variables (`PWD`,
  `SHLVL`, `TERM*`, …). On Windows GUI apps already inherit the user's
  environment; set such variables as user environment variables, not in a
  PowerShell profile. `~/.local/bin`, `~/.cargo/bin`, `/usr/local/bin`,
  `/opt/homebrew/bin` (macOS), or `%USERPROFILE%\.local\bin` and
  `%APPDATA%\npm` (Windows) are appended to PATH.
- **AppImage:** its launcher points PATH, `LD_LIBRARY_PATH`, `XDG_DATA_DIRS`,
  and `GSETTINGS_SCHEMA_DIR` into its mount; those entries and `APPDIR`,
  `APPIMAGE`, `ARGV0`, `OWD` are removed before any child starts.
- **Python.** `uv run --no-project --python <.python-version> -- python`, with
  uv resolved to an absolute path, as `start.sh` and `verify.sh` run it. On
  Windows only `.com` and `.exe` count when searching PATH: children are
  spawned without a shell, which refuses `.bat` and `.cmd` shims.
  Without uv, the first system Python that runs and reports ≥ 3.11 (Windows:
  `py -3`, then `python`, skipping Microsoft Store aliases; macOS: never
  `/usr/bin/python3` without the Command Line Tools, whose stub opens an
  install dialog). The same check guards `/usr/bin/git` in the doctor.
- Children get `PYTHONIOENCODING=utf-8` and `windowsHide: true` (os-ui's fix
  for 0xC0000142 on Windows). os-harness finds the agent CLIs itself,
  including Windows `.cmd` shims and the `OS_HARNESS_CLAUDE` /
  `OS_HARNESS_CODEX` overrides.
- Detached turns (`--detach`) outlive the app by design, as they outlive the
  dev server; reopening the app shows them as running.

## 6. Snapshot generation

- `generate.py` runs at start, after a folder switch, on **View → Regenerate
  Snapshot** and the sidebar's Regenerate button, after a skill toggle, when the window regains
  focus more than 30 s after the last run, every 5 minutes, and when its inputs
  change.
- Inputs are polled every 4 s by `stat`: `HANDOFF.md`, `memory/`, `.git/HEAD`
  and `.git/logs/HEAD` (new commits), each project's `PROJECT_MEMORY.md`,
  `Code/runs/*/result.json`, `Evaluations/`, and project skill folders, hub
  collections and their skills' `SKILL.md`, and the installed skill folders. A
  poll is a few hundred `stat` calls on every platform. A project's code,
  virtual environments, and caches are never visited, and no inotify watch is
  held (recursive `fs.watch` on a 44k-file `.venv` cost 44k watches and 0.5 s
  of main-thread time in the review).
- Runs are serialized: a request during a run schedules exactly one more run.
  A run longer than 120 s is killed. Each outcome is pushed to the window
  (`onSnapshot`), which reloads `state.json` at once; its 5 s poll stays as a
  fallback. The generator writes `state.json` atomically (a temp file renamed
  into place, retried briefly while a Windows reader holds the file, and
  removed if the run fails), so a killed or failed run never leaves half a
  file; the window
  keeps showing the last snapshot and Settings shows the error.
- The pollers, the timer, and the notifier stop with the app; the app quits
  when its last window closes, on macOS too.

## 7. Agent-turn notifications

The notifier reads `os-harness/sessions/*.jsonl` (or `OS_HARNESS_SESSIONS`)
every 3 s by modification time. When a trace gains a `done` event for a turn
not seen before and the window is not focused, it shows one native
notification: `Agent turn finished` or `Agent turn failed`, with
`<Root agent | project> · <agent>: <first line of the result or error>`.
Turns that ended before the app started never notify; a half-written last line
is skipped. Clicking focuses the window. **View → Notify When Agent Turns End**
turns it off (saved). Windows needs the app's AppUserModelID, set at start.

## 8. Prerequisites (Settings page)

| Check | Probe | Required |
|---|---|---|
| Research OS folder | markers in §4 | yes |
| uv | `uv --version` | recommended (else a system Python) |
| Python ≥ 3.11 | `<python prefix> --version` | yes |
| Git | `git --version` | no (history and activity only) |
| Claude Code, Codex | `harness.py check` lines `name: version \| login` | at least one, logged in |

Each row is `ok`, `warn`, `missing`, or `error` with a version, one detail
line, and an install link. Probes run in parallel with timeouts (Python 120 s,
because uv may download the pinned interpreter on first use) and never fail
the report as a whole. **Settings** (left navigation, or **Help → System and
Prerequisites**) shows them glance-first
(cog-20260927-001): chips and versions, details on click; it also shows the
folder, the last snapshot run, and, under **About**, versions, the Python in
use, and where the environment came from.

## 9. Frontend changes

- `src/lib/mode.ts`: `DESKTOP` (bridge present) and `LIVE = DEV || DESKTOP`,
  so one production build is view-only on GitHub Pages and live in the client.
- `src/lib/desktop.ts`: the bridge's types and accessor.
- `AgentChat.tsx`: the token comes from the bridge in the client.
- `useOsState.ts`: reload on a snapshot event.
- `StateMissing.tsx`: in the client, a welcome state (folder, problem, last
  run, prerequisites, **Choose folder…**, **Regenerate**).
- `shell/SnapshotStatus.tsx`: in the client the sidebar footer says "Desktop
  client" and its button regenerates the snapshot.
- `src/plugins/pages.ts`: a plugin page's frame loads `app://<id>/<entry>`
  in the client (Paper wiki: `app://paper-wiki/viz.html`).
- Desktop-only folder and prerequisite controls (`SystemPage.tsx`,
  `DesktopStatus.tsx`), shown on the **Settings** page (`SettingsPage.tsx`);
  the Help menu's `open-system` command opens it (`shell/Shell.tsx`).
- **Hub skill:** paper-wiki-manager's `scripts/static/viz.js` status probe
  (§3.2), with `paper-wiki/viz.html` regenerated.

## 10. Bridge (`window.osDesktop`)

```ts
interface DesktopBridge {
  readonly token: string;                             // this launch's endpoint token
  info(): Promise<DesktopInfo>;                       // versions, platform, folder, problem, Python, env source, last run
  chooseWorkspace(): Promise<WorkspaceChoice>;        // native dialog, trust prompt, validate, switch
  regenerate(): Promise<SnapshotEvent>;               // one generator run
  doctor(): Promise<DoctorReport>;                    // §8
  onSnapshot(cb: (e: SnapshotEvent) => void): () => void;
  onCommand(cb: (command: "open-system") => void): () => void;  // Help menu → Settings
}
```

## 11. Settings

`<userData>/settings.json`, written atomically (temp file + rename), parsed
field by field so one bad value costs only itself: `workspace`,
`recentWorkspaces` (≤ 5), `notifications` (default true), `window` (bounds and
`maximized`; restored only where at least 120 px still overlap a connected
display). A plain log lives in `<userData>/logs/main.log` (truncated past
1 MB; no prompts, keys, or file contents); **Help → Show Log File** reveals it.
`OS_CLIENT_USER_DATA` redirects `userData` for tests.

## 12. Packaging

`electron-builder` 26, configured in [electron-builder.yml](electron-builder.yml):

| OS | Target | Arch | First open |
|---|---|---|---|
| macOS | `dmg` | arm64, x64 | Ad-hoc signed (`identity: "-"`, no hardened runtime). macOS 15+: open once, then System Settings → Privacy & Security → **Open Anyway**; fallback `xattr -dr com.apple.quarantine "/Applications/Research OS.app"` |
| Windows | `nsis` (per user, folder choosable, one installer per arch) | x64, arm64 | Unsigned: SmartScreen → More info → Run anyway |
| Linux | `deb`, `AppImage` | x64, arm64 | The `.deb` installs an AppArmor profile, so the sandbox works on Ubuntu 24.04; the AppImage needs `libfuse2` (`libfuse2t64`) and runs without Chromium's sandbox where user namespaces are restricted |

- App id `io.github.pengqianhan.researchos`, product **Research OS**, Linux
  executable `research-os`, artifacts `Research-OS-<version>-<os>-<arch>.<ext>`.
- Icon: `docs/brand/app-icon.png` (1024 px), copied to `out/icon.png` at build;
  electron-builder derives `.icns` and `.ico` from it.
- The package holds `out/main.cjs`, `out/preload.cjs`, `out/renderer/` (the
  frontend build without `state.json` or a `paper-wiki/` copy), `out/plugins/`
  (each bundled plugin's `plugin.json`, and its `site/` folder if it has one;
  the build fails if a `BUNDLED_IDS` entry is missing), and the icon. A
  plugin's handler code is compiled into `main.cjs`, never read from its
  folder. Python scripts and research files are always read from the chosen
  workspace, never bundled.
- Version skew: renderer and endpoint code are the app's, scripts are the
  workspace's. Settings shows the app version; rebuild the app after
  pulling os-ui changes.
- Signing with a Developer ID or a Windows certificate is possible through
  electron-builder's `CSC_*` variables and `-c.mac.identity=…`; it is not set up
  (§0).

## 13. Testing

| Layer | Tool | What it proves |
|---|---|---|
| Shared API core | `node --test` with Node's type stripping (no new dependency) | validation, status codes, queues, Write Lease (also through a symlink), runner timeouts and errors |
| API + real harness | `node --test` with `os-harness/tests/fake_claude.py` | `POST /send` → detached turn → trace; resume → turn 2 |
| Dev-server adapters | `node --test` on a real Vite dev server | token before routing, mounts, context root |
| Client modules | `node --test` | settings, workspace and real paths, env import and AppImage cleanup, Python choice per platform, generator serialization, input polling, notifier, doctor, protocol routing/traversal/symlinks/CSP/415/401, plugin sites and origin isolation (a second, fake plugin), the read channel on fixture plugins (routing, methods, dot paths, roots, link and junction escapes, listings, caps, headers), the navigation guard's targets, window bounds, menu |
| E2E | Playwright `_electron` on a copy of the repository **without** `.git` in the system temp folder, a throwaway `HOME` (uv keeps its real Python and cache), its own settings folder, and the fake agent CLI | snapshot generated, Settings, a Root Agent turn without a token prompt, the Code view (files, Git changes, selection to a reference chip, isolation), the Paper view (PDF.js draws `paper/main.pdf` lazily, pages and zoom, selection to a reference chip, every `paper/` state, a hostile PDF, text a PDF hides shown before Send, two Reloads at once, a stalled worker, a worker that never answers, a page over its time budget and time hidden not counted, a 300,000-page PDF and a page taller than the column, pictures and a non-embedded font read from the canvas, no FontFace, isolation, the worker under the plugin policy, the vendored files as shipped), endpoint refusals, Paper Wiki isolation (no bridge, no app API, no web), the viewer's Status buttons write the note, navigation guard, sidebar regenerate, settings, no CSP violations, unusable-folder welcome |
| Package smoke | the same E2E (`OS_CLIENT_E2E_EXECUTABLE=release`) on the unpacked app | the asar layout starts, generates, and isolates the viewer |
| CI | `ci.yml` (required) runs the shared-core tests; `desktop.yml` (advisory, path-filtered) runs everything above, those tests included, on six OS/arch rows and uploads installers as artifacts | |

`erasableSyntaxOnly` and `verbatimModuleSyntax` in both tsconfigs make `tsc`
reject what Node's type stripping cannot run. The endpoint tests need Node
22.18+; the dev server itself still runs on Node 18+.

## 14. Delivery phases

| Phase | Output | Acceptance | State |
|---|---|---|---|
| P0 | This plan, ADR-0005, HANDOFF and os-ui records | Human Owner reads it | done |
| P1 | Shared API core, thin plugins, tests | dev-server routes unchanged; core tests pass | done |
| P2 | Client: protocol, workspace, settings, environment, Python, window, menu | the app opens the desktop on this repository | done |
| P3 | Generator, poller, notifier, doctor, bridge, frontend changes, viewer probe | live controls work in the client; unit tests and `./verify.sh` pass | done |
| P4 | E2E and package smoke on Linux | Playwright suite passes under Xvfb; the packaged app starts | done in the cloud session |
| P5 | `desktop.yml`, `ci.yml` step, README | workflows run on the pull request | done: all six rows green on PR #22, installers uploaded |
| P6 | Human Owner installs on their machines | README "Check it on your machine" | pending |

## 15. What the cloud session can and cannot verify

- Verified there: all unit and integration tests, both typechecks, the
  frontend build, the E2E suite under Xvfb on Linux x64 (unsandboxed, because
  the container runs as root), Linux x64 `.deb` and AppImage packaging, and the
  packaged app's smoke run.
- Not verifiable there: macOS `.dmg` (needs macOS), Windows NSIS (needs Windows
  or Wine), real Claude Code and Codex logins, how notifications look,
  Gatekeeper and SmartScreen. `desktop.yml` builds and tests on macOS and
  Windows runners; logins and first-open behaviour need the Human Owner's
  machines.

## 16. Risks

| Risk | Mitigation |
|---|---|
| GUI launch misses tools or variables | login-shell environment (§5); Settings names what is missing |
| Hostile HTML in a paper note | the wiki on its own plugin origin, strict CSP, JSON-only writes, token, frame-aware navigation guard (§3) |
| Ubuntu 24.04 sandbox and AppImage | prefer `.deb`; document `libfuse2`; the app never adds `--no-sandbox` (tests do, as root) |
| Unsigned builds alarm users | ad-hoc macOS signature; documented first-open steps |
| App and workspace drift apart | versions shown; scripts read from the workspace; additive schema rule (os-ui DESIGN.md §2) |
| Shared-core refactor breaks the dev server | route tests plus a real Vite dev-server test in the required CI job |
| Polling cost | narrow input list; no recursive watches |
| Electron security drift | baseline in §3.3; Electron pinned and updated deliberately |

## 17. Reversal

Delete `os-ui/client/`, `docs/adr/0005-desktop-client.md`, and
`.github/workflows/desktop.yml`; drop the client lines from HANDOFF, os-ui's
README, DESIGN.md, and index, `docs/index.md`, the root README, and
`docs/brand/README.md`; revert the frontend's `mode.ts`, `desktop.ts`,
`SystemPage.tsx`, `DesktopStatus.tsx`, and the small component edits. These may
stay because they stand on their own: the shared API core and its `ci.yml`
step (the dev server uses them), the generator's no-Git root, and the viewer's
`file:`-only probe guard (revert `viz.js` and regenerate `viz.html` to undo).
