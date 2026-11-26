# SuperResearch OS Desktop Client

A desktop app for macOS, Windows, and Linux that opens the
[os-ui](../README.md) app on your Research OS folder, with everything the
dev server offers — the root agent and project agent conversations, the
Paper Wiki's reading status, and the Papers panel — and the Skills page's
disable and enable, which only the desktop app offers, without a terminal,
`bash`, or `./os-ui/start.sh`. It keeps the snapshot fresh by itself
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

- **macOS** (`SuperResearch-OS-<v>-mac-arm64.dmg` for Apple silicon, `-x64` for
  Intel): drag the app to Applications and open it. The build is ad-hoc
  signed, not notarized, so macOS blocks the first launch: open
  **System Settings → Privacy & Security** and click **Open Anyway**. If macOS
  says the app is damaged, run
  `xattr -dr com.apple.quarantine "/Applications/SuperResearch OS.app"` once.
- **Windows** (`SuperResearch-OS-<v>-win-x64.exe`, or `-arm64`): run the installer
  (per user; you can choose the folder). It is unsigned, so SmartScreen may
  warn: **More info → Run anyway**.
- **Linux** (`.deb` or `.AppImage`, x64 or arm64): on Ubuntu and Debian prefer
  `sudo apt install ./SuperResearch-OS-<v>-linux-amd64.deb`, which also installs an
  AppArmor profile so Chromium's sandbox works on Ubuntu 24.04. The AppImage
  needs `libfuse2` (`sudo apt install libfuse2t64` on Ubuntu 24.04), then
  `chmod +x` and run it.

## First start

1. Open **SuperResearch OS**. On first start it asks for your Research OS folder
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
| `OS_CLIENT_E2E_DEREFERENCE=1` | tests only: copy the workspace as the E2E suite does on Windows, links replaced by what they point at |
| `OS_CLIENT_E2E_TRACE=<file.zip>` | tests only: write a Playwright trace of the main E2E suite; the trace holds the whole launch environment, so keep it private and never upload one |

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
      collapses to a thin strip and back. The tabs are **Overview**, **Idea**,
      **Code**, **Skeleton**, **Assets**, **Paper**.
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
        collapsed) with a small chip above the input naming what you chose
        and how many lines it carries, the cursor in the input, and the hint
        "click a reference to see exactly what is sent". The chip's text is
        not shown yet.
      - Click the chip: under the chips, exactly what will be sent before
        your message appears ("Sent before your message, exactly:"); when it
        is long, a line under it says how long it is and that it scrolls.
        Click the chip again to close it. Nothing is sent until you press
        Send.
      - Click the chip's **×**: it goes away.
- [ ] **The Skeleton view.** In the `nanochat_cpu` workspace, click the
      **Skeleton** tab:
      - A card shows the paper's working title, thesis, audience, and
        research question, with its status (*draft*). Under it, **Claims and
        evidence** lists C1 to C5, each *verified*; below that, the rest of
        `paper_skeleton.md` is folded by section, each with its line and how
        many entries it holds.
      - Click C2: on the right, its evidence as the skeleton states it, the
        file it names (`Code/results/summary.json`), and the study that uses
        it (*Main result*). The dark bar at the bottom names the claim's
        line, `paper_skeleton.md:116 · claim C2`, with the start of the row
        and its size.
      - Click **Ask the agent about this**: a chip appears above the
        conversation's input and, under it without a click, the exact text
        that will be sent: the claim's row as written in the file, link
        addresses and `|` included. Nothing is sent until you press Send;
        remove the chip with its **×**.
      - Open a section (**Experiments**, say) and click a row or a line: the
        bar names that line and the section.
      - Make the window narrower until the evidence column on the right goes:
        the evidence of the claim you clicked opens under its row instead.
      - Ask the agent to change C5's status from `verified` to `weak` in
        `paper_skeleton.md`, then click **Reload**: C5 shows *weak* and the
        count says 4 verified. Ask it to change the status back to
        `verified`, click **Reload** again, and check C5 is *verified*, so
        the project is as it was.
- [ ] **The Assets view.** In the `nanochat_cpu` workspace, click the
      **Assets** tab. Nothing here changes a file.
      - **Figures** (`Figs/`) shows the two training-curve pictures as cards;
        **Reference runs** (`Baselines/`), **Results** (`Code/results/`),
        and **Datasets** list their files, each with its size, and the four
        datasets of `Code/README.md`'s Data section, each marked *listed*.
        The two files of `Baselines/openresearch-demo/` that its `README.md`
        describes have that description under their name.
      - Click a figure: on the right it appears large, with its size and
        where it is used (`Code/README.md:131` or `:150`). The dark bar at
        the bottom names its path, `Figs/…`.
      - Both figures are drawn without a click, and no panel shows "The
        agent gets this name: …". That sentence appears only when the name
        the agent gets differs from the path (a character that could be
        misread, written as `⟨U+…⟩`, or a path over 200 characters); a
        picture that would freeze the view shows **Show** and why instead.
      - Click `training_metrics.csv` under **Results**: its first rows, and
        "First 20 of 943 rows"; the size line says how many rows it has.
        Click `summary.json`: its first 40 lines, and the lines of
        `paper_skeleton.md` and `Code/README.md` that name it.
      - Click a dataset (`karpathy/climbmix-400b-shuffle`): what
        `Code/README.md` says about it, its address as text, and "Listed in
        `Code/README.md:208`"; the bar names that line and the dataset.
      - Select any of them and click **Ask the agent about this**: a chip
        appears above the conversation's input and, under it without a
        click, the exact text that will be sent, `About <the path or line>`.
        Nothing is sent until you press Send; remove the chip with its **×**.
      - Make the window narrower until the preview column goes: the preview
        then sits above the list.
- [ ] **The Idea view.** In the `nanochat_cpu` workspace, click **Idea**: the
      questions, experiments, results, and claims of `nanochat_cpu` as boxes
      in columns, joined by coloured lines. Click a node: its full text, its
      links, and what it points to appear above the map. Ask about it: a chip
      appears, and nothing is sent until you press Send. **Reload** in its bar
      reads `idea_graph.md` again; the view writes nothing. A project made
      from the template starts with an empty table, drawn as
      **0 nodes · 0 links**; a project with no `idea_graph.md` says
      **No idea file to draw** and shows the header line an agent writes.
- [ ] **The Paper view.** In the `nanochat_cpu` workspace, click the **Paper**
      tab:
      - The paper appears as pages, like a PDF reader, read-only. The bar
        above it says **Page 1 of 4** and **Fit · …%**.
      - Click **›** (next page) and **‹** (previous page): the page number
        changes and the view moves to that page. Scroll with the mouse or
        trackpad: the page number follows.
      - Click **+** and **−**: the pages get bigger and smaller (the label
        shows a percentage); **Fit width** makes a page as wide as the view
        again. Make the window narrower or wider: in Fit width the pages
        follow.
      - Drag across some text of the paper, as you would to copy it: the text
        is highlighted and the dark bar at the bottom names it, for example
        `paper/main.pdf p. 1 · Setup` (the page, and the section it is in),
        with the start of the selected text and its size under it.
        Click **Ask the agent about this**: a chip appears above the
        conversation's input, and under it, without a click, the exact text
        that will be sent. Nothing is sent until you press Send.
      - **Read that text before you press Send.** A PDF can hold text you do
        not see on the page (white on white, hidden, or a font that shows
        other letters than it stands for), and selecting across it quotes it
        too. The bar and the composer show what will really be sent; if it
        holds words you did not select, remove the chip.
      - Switch to **Overview** and back to **Paper**: you are on the same page.
      - With the agent (or by hand), rename `paper/main.pdf`, then click
        **Reload**: the view says the paper has not been built yet and offers
        `paper/main.tex` to ask about. Rename it back and click **Try again**:
        the paper is back.
- [ ] **Paper wiki**: a paper's Status buttons appear and change the note's
      `status:` line.
- [ ] **Skills** (left menu, between **Paper wiki** and **Plugins**): the page
      looks as before, with a green "Skills Hub · bundled plugin" line above the
      title. Type `filetree` in the search box and click the card
      **filetree-simple**: its details slide in from the right, and the
      shading covers the Skills area but not the left menu.
      Click **Home** in the left menu, then **Skills** again: the details are
      still open. Under **Installs**, click **disable** beside `repo-claude`:
      it says *working...*, then *disable* again (the open details keep the old
      word, as before; the mockup showed *enable* at once). Close the details
      and open them again: the button now says *enable*. Click **enable** to put
      it back. Click **Copy install command** and paste into a text editor: the
      command shown. Quit and reopen while on Skills: the app comes back on
      Skills.
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
