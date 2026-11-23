# Research OS Desktop Client

A desktop app for macOS, Windows, and Linux that opens the
[os-ui](../README.md) app on your Research OS folder, with everything the
dev server offers — the root agent and project agent conversations, skill
toggles, the Paper Wiki's reading status, and the Papers panel — without a
terminal, `bash`, or `./os-ui/start.sh`. It keeps the snapshot fresh by itself
and notifies you when an agent turn ends.

The plan and settled design are in [DESIGN.md](DESIGN.md); the decision record
is [ADR-0005](../../docs/adr/0005-desktop-client.md). The repository's plain
files stay the only research state: the app stores nothing but its own
settings, and removing it leaves the OS unaffected.

## What you need

| | Needed for | Get it |
|---|---|---|
| A Research OS folder | everything | a clone of this repository (Git optional) |
| [uv](https://docs.astral.sh/uv/getting-started/installation/) | the snapshot and every script (it fetches the pinned Python) | recommended; without it a system Python ≥ 3.11 is used |
| [Claude Code](https://docs.claude.com/en/docs/claude-code/setup) or [Codex](https://developers.openai.com/codex/cli), logged in | agent conversations | at least one |
| Git | Recent Activity and HEAD | optional |

**Settings** (bottom of the left navigation, or **Help → System and
Prerequisites**) checks each of these and links to the installer of anything
missing.

## Install

There are no published releases (DESIGN.md §0). Get an installer from a run of
the [Desktop client workflow](../../.github/workflows/desktop.yml) (Actions →
Desktop client → a run → Artifacts), or build one yourself (below).

- **macOS** (`Research-OS-<v>-mac-arm64.dmg` for Apple silicon, `-x64` for
  Intel): drag the app to Applications and open it. The build is ad-hoc
  signed, not notarized, so macOS blocks the first launch: open
  **System Settings → Privacy & Security** and click **Open Anyway**. If macOS
  says the app is damaged, run
  `xattr -dr com.apple.quarantine "/Applications/Research OS.app"` once.
- **Windows** (`Research-OS-<v>-win-x64.exe`, or `-arm64`): run the installer
  (per user; you can choose the folder). It is unsigned, so SmartScreen may
  warn: **More info → Run anyway**.
- **Linux** (`.deb` or `.AppImage`, x64 or arm64): on Ubuntu and Debian prefer
  `sudo apt install ./Research-OS-<v>-linux-amd64.deb`, which also installs an
  AppArmor profile so Chromium's sandbox works on Ubuntu 24.04. The AppImage
  needs `libfuse2` (`sudo apt install libfuse2t64` on Ubuntu 24.04), then
  `chmod +x` and run it.

## First start

1. Open **Research OS**. On first start it asks for your Research OS folder
   (the one containing `AGENTS.md`); a development run (`npm start`) opens its own clone.
2. Confirm the folder once: the app runs that folder's scripts (the snapshot
   generator now; os-harness and skill scripts when you use them).
3. **Home** appears once the snapshot is generated (the first run may take a
   minute while uv downloads the pinned Python).

Switch folders with **File → Open Research OS Folder…** or **Open Recent**.
**View → Regenerate Snapshot** (Ctrl/Cmd+Shift+R) refreshes on demand; the app
also refreshes when the files the app reads change, when you come back
to the window, and every five minutes. **View → Notify When Agent Turns End**
switches notifications off. A web or mail link (in a paper note, for example)
opens in your browser only after you confirm its address. Closing the window quits the app; a running agent
turn keeps going and shows up again on the next start.

An app opened from Finder, the Dock, or a desktop launcher does not see your
shell's settings, so on macOS and Linux the client reads your login shell's
environment once at start (PATH, `OS_HARNESS_*`, `CODEX_HOME`, proxies). On
Windows, set such variables as user environment variables.

## Develop and build

Run from `os-ui/client` (Node 22.18+; the build installs the frontend's
packages on first use):

```bash
npm ci
npm start                 # build, then open the app on this checkout
npm test                  # unit tests (node --test); a file fails, named, after 10 min (see ../frontend/README.md, Tests)
npm run typecheck
npm run test:e2e          # Playwright end-to-end; on Linux: xvfb-run -a npm run test:e2e
npm run package           # installers for this OS into release/
npm run package:dir       # unpacked app only (fast)
```

Per-OS installers: `npx electron-builder --mac dmg --arm64` (or `--x64`) on
macOS, `--win nsis --x64` (or `--arm64`) on Windows, `--linux deb AppImage
--x64` (or `--arm64`) on Linux, each after `npm run build`. macOS and Windows
installers can only be built on their own OS.

`npm run build` writes `out/`: the os-ui frontend build (`out/renderer/`), the
main process (`out/main.cjs`, bundled with the shared endpoints in
[../frontend/server](../frontend/server/)), the preload, each bundled plugin's
manifest from [../frontend/plugins](../frontend/plugins/) (`out/plugins/`;
the build fails if one is missing), and the icon from
[docs/brand](../../docs/brand/README.md). At start the app logs the plugins
it loaded (`plugins: paper-wiki`) and any it could not, as `ERROR` lines.

Useful variables:

| Variable | Effect |
|---|---|
| `OS_CLIENT_WORKSPACE` | open this folder (also `--workspace <dir>`) |
| `OS_CLIENT_USER_DATA` | keep settings and the log elsewhere (tests) |
| `OS_CLIENT_LOG_STDERR=1` | copy the log to stderr |
| `OS_CLIENT_E2E_EXECUTABLE` | run the E2E suite against a packaged app (`release` = the unpacked one in `release/`) |
| `OS_CLIENT_E2E_NO_SANDBOX=1` | tests only: start Electron with `--no-sandbox` (automatic as root) |

The log is `<userData>/logs/main.log` (**Help → Show Log File**): where the
environment came from, which Python is used, generator failures, and turn
endings — never prompts, keys, or file contents.

## Check it on your machine

The cloud session that built the client verified Linux x64, and `desktop.yml`
builds and tests every OS on CI runners (DESIGN.md §15). No runner has your
agent logins or a first open on a real desktop, so on each of your machines:

- [ ] The app opens, asks for (or finds) your folder, and shows **Home**: the
      root-agent bar, a card for each project, and the snapshot time at the
      bottom of the left navigation.
- [ ] **Settings** (left navigation, or **Help → System and Prerequisites**):
      Python and at least one agent are `ok`; Claude Code and Codex show your
      logins.
- [ ] **Home → Open conversation**: a short question to the root agent gets an
      answer from your own login; **Close conversation** folds it back into
      the bar.
- [ ] A project card (or **Projects**, or the project under **Quick access**)
      opens its workspace. **Overview** shows the project; the conversation on
      the left lists that project's sessions under **Conversations**, and
      collapses to a thin strip and back. **Paper** says it arrives later in
      step 1; **Idea**, **Skeleton**, and **Assets** are marked "step 2".
- [ ] **The Code view.** In a project's workspace, click the **Code** tab:
      - **Files** lists the project's `Code/` folder on the left; click a
        folder to open it and a file to read it on the right (it says
        "read-only"). A file that is not text, or larger than 32 MiB, says so
        instead.
      - Click **Changes**: the project's commits appear, newest first (with no
        Git history it says "No history to show"; if Git is missing or too
        old it says so and points to **Settings**). Click a commit: its
        changed files and a diff of the first one appear; click another file
        to see its diff.
      - Click a line of a file, or a commit, or a line of a diff: a dark bar at
        the bottom names it and, for a line or a commit, shows the start of
        its text and how long it is, with **Ask the agent about this**.
      - Click **Ask the agent about this**: the conversation opens (if it was
        collapsed) with a small chip above the input naming what you chose,
        the cursor in the input, and, under the chips, exactly what will be
        sent before your message ("Sent before your message, exactly:"),
        already open (when it is long, a line under it says how long and that it
        scrolls). Ask about a second thing: its text opens and the
        first one's closes; click a chip to open or close its text. Nothing
        is sent until you press Send.
      - Click the chip's **×**: it goes away.
- [ ] **Paper wiki**: a paper's Status buttons appear and change the note's
      `status:` line.
- [ ] **Skills**: a disable/enable toggle works and the store updates.
- [ ] **Regenerate** at the bottom of the left navigation ends with "Snapshot
      updated".
- [ ] **Collapse** shrinks the navigation to icons. Quit and reopen: the app
      comes back on the page and project you left, with the same panels
      collapsed.
- [ ] With the window in the background, a finished turn shows a notification.
- [ ] macOS: Open Anyway works; Windows: the installer and Start-menu entry
      work; Linux: the `.deb` starts from the application menu.

If something fails, **Help → Show Log File** and send `main.log` along with
what you saw.

## Layout

```text
os-ui/client/
  DESIGN.md              # plan and settled design
  electron-builder.yml   # packaging targets per OS
  scripts/build.mjs      # frontend build + esbuild bundles → out/
  src/main/              # main process: index.ts wires the modules
  src/preload/           # window.osDesktop bridge
  src/shared/            # IPC channel names
  test/                  # unit tests (node --test)
  e2e/                   # Playwright end-to-end tests
```
