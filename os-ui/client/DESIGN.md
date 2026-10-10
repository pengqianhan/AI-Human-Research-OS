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
| G5 | Missing prerequisites are named, not discovered by failure | System window and welcome state; E2E with an unusable folder |
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
│ protocol.ts   app://research-os (app) and app://paper-wiki (viewer) → files | API │
│ ../frontend/server  the os-ui endpoints, shared with the Vite dev server          │
│ notifier.ts   os-harness/sessions → native notification when a turn ends          │
│ doctor.ts     uv, Python, Git, `harness.py check` (Claude Code, Codex)            │
│ menu.ts, windowState.ts, log.ts                                                   │
└────────────────────────────────────────────────────────────────────────────────────┘
        │ contextBridge (preload): window.osDesktop — six calls and this launch's token
┌──────────── app://research-os — os-ui/frontend production build ────────────┐
│ LIVE = dev server OR window.osDesktop present                                │
│ System window (desktop only); Paper Wiki iframe → app://paper-wiki/viz.html   │
└──────────────────────────────────────────────────────────────────────────────┘
        │ child processes: the login-shell environment, windowsHide, UTF-8
   uv / python → generate.py, os-harness/harness.py, paper_search.py,
                 set_status.py, generate_viz.py, install_research_skill.py
                 → claude / codex (official CLIs, the user's own login)
```

### 3.1 Shared API core

The four Vite plugins' logic lives in `os-ui/frontend/server/`, one module per
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
- The plugin files keep their names and exports (`vite.config.ts` untouched)
  and become adapters: the token check runs first (so an unknown path without
  a token is still 401), then the Connect request becomes an `ApiRequest`, and
  every reply carries `Content-Type: application/json`.
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

### 3.2 Two origins

The Paper Wiki viewer renders note bodies as HTML (`marked`), and notes are
written from outside papers and web pages, so a note can carry script. It must
not share an origin with the app's endpoints, storage, or bridge.

| URL | Served from |
|---|---|
| `app://research-os/api/...` | shared API core, all endpoints except the wiki's status |
| `app://research-os/state.json` | `<workspace>/os-ui/frontend/public/state.json` |
| `app://research-os/...` | the bundled renderer; extension-less paths fall back to `index.html` |
| `app://paper-wiki/api/paper-wiki/status` | the reading-status endpoint only |
| `app://paper-wiki/...` | `<workspace>/paper-wiki/...` in place (no cache copy) |
| any other host | 404 |

- Paths are decoded once; `..`, `\`, `:`, NUL, and Windows device names (CON,
  NUL, COM1, …) are refused before any file access. Workspace files must also
  have their real path (symlinks and junctions resolved) inside their root; the
  renderer, possibly inside an asar archive, is confined lexically.
- The scheme is registered standard, secure, fetch-capable, and stream-capable,
  and **not** CORS-enabled, so pages of one origin cannot read the other.
- The viewer probes its status endpoint whenever it is not opened from disk
  (`location.protocol !== "file:"` in paper-wiki-manager's `viz.js`; before,
  only http and https), so its Status buttons work in the client. A workspace
  whose committed `paper-wiki/viz.html` predates this shows read-only status
  until `generate_viz.py` runs.

### 3.3 Security baseline

- `contextIsolation`, `sandbox`, no `nodeIntegration`, `webSecurity`; the
  preload exposes six calls and the token, no Node objects.
- **Content-Security-Policy** as a response header. App pages:
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-src app://paper-wiki; object-src 'none'; base-uri 'none'; form-action 'none'`.
  The viewer: `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'none'; form-action 'none'; base-uri 'none'`
  — its own inline code runs; remote fetches, images, frames, and forms do not.
- **Endpoints:** writes must be `Content-Type: application/json`, which a form
  or a no-cors request cannot send (415 otherwise); `/api/chat` and
  `/api/paper-sources` need a random per-launch token, which the preload hands
  to the top frame only (`--os-desktop-token` argument), as the dev server
  needs `OS_UI_TOKEN`.
- **Navigation:** `will-frame-navigate` and `will-redirect` keep the top frame
  on `app://research-os/` and subframes on `app://paper-wiki/` (or
  `about:blank`); http(s) and mailto links open in the default browser; every
  `window.open` is denied.
- **IPC** answers only the top frame of `app://research-os/`; no channel takes
  a path.
- **Permissions:** all denied except `clipboard-sanitized-write` (the copy
  buttons; Electron has no `prompt()` fallback). Native notifications come
  from the main process and need no web permission.
- **Trust:** opening a folder runs its scripts with the user's rights. A folder
  chosen in the dialog for the first time is confirmed once ("Open only
  folders you trust"); folders in Open Recent were confirmed before.
- Single instance: a second launch focuses the window (and opens its
  `--workspace`, if given).
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
  the saved setting, the checkout containing the running client (development
  runs), else none — the welcome state with **Choose folder…**. An explicit
  choice that is not a workspace is reported, never silently replaced.
- Every choice is canonicalized with `realpath`, matching how os-harness
  records session folders (macOS `/var` → `/private/var`, symlinks, junctions,
  subst drives).
- **File → Open Research OS Folder…** validates, confirms trust, saves, adds to
  **Open Recent** (5 entries), restarts the generator, poller, and notifier,
  and reloads the window.

## 5. Process environment

- **Environment.** An app started from Finder, the Dock, or a Linux launcher
  inherits a minimal environment: no PATH to uv, Claude Code, or Codex, and
  none of the user's `OS_HARNESS_*`, `CODEX_HOME`, or proxy variables. On
  macOS and Linux the client runs the login shell once (`$SHELL -ilc`, stdin
  closed, own process group, 5 s limit), has it print `process.env` as JSON
  via the app's own binary (`ELECTRON_RUN_AS_NODE=1`), and lays that over the
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
  uv resolved to an absolute path, as `start.sh` and `verify.sh` run it.
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
  Snapshot** and the dock button, after a skill toggle, when the window regains
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
  into place), so a killed or failed run never leaves half a file; the window
  keeps showing the last snapshot and the System window shows the error.
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

## 8. Prerequisites (System window)

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
the report as a whole. The window shows them glance-first
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
- `Dock.tsx`: in the client the right-hand button regenerates the snapshot.
- `PaperWikiPage.tsx`: the iframe loads `app://paper-wiki/viz.html` in the
  client.
- `SnapshotHeader.tsx`: "Desktop client" label.
- New desktop-only **System** app (`SystemPage.tsx`, `DesktopStatus.tsx`).
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
  onCommand(cb: (command: "open-system") => void): () => void;  // Help menu → System window
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
  frontend build without `state.json` or a `paper-wiki/` copy), and the icon.
  Python scripts and research files are always read from the chosen
  workspace, never bundled.
- Version skew: renderer and endpoint code are the app's, scripts are the
  workspace's. The System window shows the app version; rebuild the app after
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
| Client modules | `node --test` | settings, workspace and real paths, env import and AppImage cleanup, Python choice per platform, generator serialization, input polling, notifier, doctor, protocol routing/traversal/symlinks/CSP/415/401, window bounds, menu |
| E2E | Playwright `_electron` on a copy of the repository **without** `.git` in the system temp folder, a throwaway `HOME` (uv keeps its real Python and cache), its own settings folder, and the fake agent CLI | snapshot generated, System window, a Root Agent turn without a token prompt, endpoint refusals, Paper Wiki isolation (no bridge, no app API, no web), the viewer's Status buttons write the note, navigation guard, dock regenerate, settings, no CSP violations, unusable-folder welcome |
| Package smoke | the same E2E (`OS_CLIENT_E2E_EXECUTABLE=release`) on the unpacked app | the asar layout starts, generates, and isolates the viewer |
| CI | `ci.yml` (required) runs the shared-core tests; `desktop.yml` (advisory, path-filtered) runs everything above on six OS/arch rows and uploads installers as artifacts | |

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
| P5 | `desktop.yml`, `ci.yml` step, README | workflows run on the pull request | pending the PR's CI |
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
| GUI launch misses tools or variables | login-shell environment (§5); System window names what is missing |
| Hostile HTML in a paper note | separate wiki origin, strict CSP, JSON-only writes, token, frame-aware navigation guard (§3) |
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
