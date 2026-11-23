# os-ui - Research OS App

`os-ui/` is the app of the AI-Human Research OS: it shows the repository's
current state and holds the agent conversations. It ships as an app for
macOS, Windows, and Linux, the [desktop client](client/README.md), and runs in a
browser as its development shell. Apart from the narrow writes listed in
[DESIGN.md](DESIGN.md), it does not execute actions or write source files; the
filesystem remains the only source of truth. Removing `os-ui/` does not affect
the OS itself.

A Chinese copy of the previous overview is kept at [README_zh.md](README_zh.md).
The current build direction is English-first; Chinese UI support can be added
later when the OS is more mature.

## Interface

The layout follows mockup C, "document first", which the Human Owner chose on
2026-11-21 ([mockups/step1/c-document.html](mockups/step1/c-document.html); DESIGN.md §4). It replaced
the desktop-OS shell of draggable windows and a dock, which stays in
`frontend/src/desktop/` unused until a later change deletes it.

- **Left navigation**: **Home**, **Projects**, **Paper wiki**, **Skills**,
  **Plugins**, a **Quick access** list of the registered projects, and at the
  bottom the snapshot status, **Settings**, and **Collapse** (icons only). The
  snapshot status shows when the data was generated (amber and "stale" after
  10 minutes; hover for the timestamp, schema version, and repository HEAD),
  which build this is, and the refresh control: **Regenerate** in the desktop
  client, a copy-the-command button in a browser.
- **Home**: the root agent's prompt bar, which opens in place to the whole
  conversation (below); one card per project; and a closed **Workspace
  status** with Active Work, Recent Activity, Governance, and the
  `agent_led_research` policy chips.
- **Projects** lists every project; a row or a Home card opens the project's
  **workspace**: its conversation on the left, collapsible to a thin strip,
  and its views on the right. **Overview** is the project overview; **Code**
  (desktop app only) shows the project's `Code/` files and Git changes;
  **Paper** (desktop app only) shows the project's `paper/main.pdf`, read-only,
  with page and zoom controls, or says why it cannot (not built yet, no
  `paper/` folder, not a PDF, password-protected, too large); **Skeleton**
  (desktop app only) shows the project's `paper_skeleton.md`, read-only: its
  Snapshot, its claims with each one's evidence, and the rest folded by
  section. In each, "Ask the agent about this" puts what you selected (a
  line, a commit, text of the paper, a claim) in the conversation's input as
  a reference; **Idea** and **Assets** come in step 2.
- **Paper wiki**: the standalone `paper-wiki/viz.html` graph and timeline
  viewer, embedded by iframe (DESIGN.md §4); a note's Status row saves your
  unread / skimmed / read state into the note's file.
- **Skills**: the skill store. **Plugins**: what is built in and what is
  coming. **Settings**: in the desktop client, the folder, the snapshot, and
  the prerequisites and logins.

The app remembers which page and project were open and what was collapsed.

## Agent conversations

Two entry points share one chat component:

- **Root agent** (Home): the conversation with the root agent (GOAL.md
  H2). Each message is one [os-harness](../os-harness/README.md) turn at the
  repository root; the agent reads AGENTS.md there and hands project work to
  project agents through the `project-dispatch` skill.
- **Project conversation** (a project's workspace): the conversation with one
  project's agent. Each message is one turn inside `projects-folder/<Name>/`,
  so the human can operate a project directly. Runs the root agent dispatched
  into that project appear in the same list and can be continued with
  feedback.

Every turn runs on your own Claude Code or Codex login. For a new
conversation the header picks the agent (remembered) and the permission mode
(`full` by default; `workspace` and `read-only` as in os-harness). The
header's **Papers** button shows which literature sources the
[paper-search](../research-skills-hub/open-paper-skills/paper-search/SKILL.md)
skill may query (alphaXiv, OpenAlex, bioRxiv, PubMed, Hugging Face, Papers
with Code, arXiv) and switches each on or off, as OpenResearch does in its
composer; bioRxiv and PubMed start off. Its **Read order** section is a chain of
tiles for the sources a paper's full text is read from, first tried first:
click a tile to move it one step earlier, and a switched-off source shows dimmed
and is skipped. The switches and the read order live in
[memory/paper-sources.json](../memory/paper-sources.json) and apply to every
agent, in every conversation and outside the UI. The panel's **Keys** section takes
your own optional keys (OpenAlex, NCBI, Hugging Face), each with a link to get
one free, and stores them in the repository's gitignored `.env`. A saved key
is never shown again; the panel only marks it `set` (or `env` when an
environment variable provides it). The list
shows the harness sessions of that directory; the trace replays with the
agent's tool calls, polls every 2 s while a turn runs, and a running turn can
be stopped. One agent runs per directory at a time: starting a second
conversation while one is running is refused (HTTP 409), the same Write
Lease rule that `project-dispatch` follows.

It needs the **Root Agent token** that `start.sh` prints when the dev server
starts (`OS_UI_TOKEN` sets it; otherwise it is random per start; the desktop
client supplies its own). The conversation
asks for it once and keeps it in `localStorage`. The token exists because the
dev server may be reached through a public tunnel and this endpoint runs an
agent with full permissions: without the token, `/api/chat/*` answers 401.

Endpoints (dev server and desktop client; the logic is in
[frontend/server/](frontend/server/), and the dev server mounts every endpoint
through [frontend/api-plugin.ts](frontend/api-plugin.ts)):
`GET /api/chat/sessions?cwd=`, `GET /api/chat/session?id=`,
`POST /api/chat/send` (`{cwd, agent, mode, session?, text}`), and
`POST /api/chat/stop` (`{session}`); the Papers button uses
`GET`/`POST /api/paper-sources` (`{source, enabled}`),
`POST /api/paper-sources/read-order` (`{order}`), and
`POST /api/paper-sources/key` (`{name, value}`; an empty value clears), in
[frontend/server/paperSources.ts](frontend/server/paperSources.ts), behind
the same token. `cwd` is empty for the repository root or
`projects-folder/<Name>` for a registered project; anything else is refused.
The chat endpoint only starts, resumes, stops, and reads harness sessions; the traces
live in `os-harness/sessions/`. A static build has no chat, like it has no
skill toggle.

Home and a project's Overview show state visually (stage bars, chips,
progress bars, counts, a timeline) and keep most sentences behind a click,
following the Human Owner's 2026-09-27 direction; DESIGN.md §4 lists what each
page shows.

All displayed data comes from one cache file:
`frontend/public/state.json`. The generator creates that file by scanning the
repository's Markdown files. The frontend polls it every five seconds. Missing
data renders as honest empty states; neither generator nor frontend invents
facts.

## Quick Start

Run from the repository root:

```bash
./os-ui/start.sh
./os-ui/start.sh --watch
```

`--watch` keeps the generator running in the foreground so changes in the
repository are reflected in `state.json`. Ctrl-C stops both generator and
frontend.

Manual two-step flow:

```bash
cd os-ui/generator
uv run python generate.py
# or:
uv run python generate.py --watch
```

```bash
cd os-ui/frontend
npm install
npm run dev
```

The dev server prints a URL, usually `http://localhost:5173/`.

To view the live app from another device for a while, open a Cloudflare
quick tunnel to it (no account needed; the URL is public to anyone who has it
and dies with the process):

```bash
cloudflared tunnel --url http://localhost:5173 --http-host-header localhost:5173
```

`--http-host-header` is required: Vite rejects requests whose Host header is
not a local one. The tunnel also exposes the skill enable/disable endpoint;
the Root Agent endpoints stay behind their token.

Build a static bundle:

```bash
cd os-ui/frontend
npm run build
```

The output goes to `frontend/dist/`, which is gitignored. The frontend loads
`state.json` and the Paper Wiki viewer by relative paths, so a bundle built with
`npx vite build --base=./` also works from a sub-path or another origin, such as
a private claude.ai artifact.

Any production build is view-only outside the desktop client: the write and
agent endpoints exist only on the dev server and in the client, and
[src/lib/mode.ts](frontend/src/lib/mode.ts) hides their controls: Home and a
project's workspace say in one line that conversations run in the desktop app
or the dev server; there are no skill toggles and no snapshot-refresh button;
and the Paper Wiki Status row reads without buttons.

The public copy is built this way by
[.github/workflows/pages.yml](../.github/workflows/pages.yml) on every push to
`autoreadpaper` and served at
<https://pengqianhan.github.io/AI-Human-Research-OS/>, with the paper wiki at
`paper-wiki/viz.html` under it. It is built from the checkout, so only tracked
files reach it; changes on `main` appear once `main` is merged into
`autoreadpaper`.

## Design Stance

1. **Read-only dashboard plus agent conversations**. Every other apparent
   action copies a command for the human to run elsewhere. The conversations
   (root agent, and each project's agent) are the one execution surface,
   authorized by the Human Owner on 2026-09-26; they run turns through
   os-harness rather than executing anything themselves.
2. **`state.json` is the only contract** between generator and frontend. The
   generator knows Markdown; the frontend knows schema.
3. **Honest state beats fake realtime**. The UI shows evidence sources,
   timestamps, staleness, and empty states instead of pretending to know more
   than the files contain.
4. **Document first**. Since 2026-11-22 the app reads like a research
   document: a left navigation, warm paper surfaces, serif titles and reading
   text, and the agent conversation beside the project it works on (mockup C,
   DESIGN.md §4 and §7). The earlier desktop shell, inspired by
   [wanman.ai](https://wanman.ai/) and
   [chekusu/wanman](https://github.com/chekusu/wanman), and its graph-paper
   palette are superseded.

## Follow-up Queue

- [ ] Delete the superseded desktop shell in `frontend/src/desktop/` (and the
      pages only it uses) once the new layout has been accepted.
- [ ] Feed the round score track from real `Code/runs/<round-id>/result.json`
      files once a project produces them.
- [ ] M4-gated: replace polling with a small file-watching service plus SSE.
      (The desktop client pushes snapshot events to its own window over IPC;
      that lives and dies with the app and is not this item.)
- [ ] M4-gated: add real execution endpoints and buttons.
- [ ] M4-gated: add `agent_activity` heartbeat semantics only if OS Feedback
      proves that observed repository state is insufficient.

## Directory

```text
os-ui/
  README.md          # English overview and launch guide
  README_zh.md       # Chinese overview retained for reference
  start.sh           # one-command launcher
  DESIGN.md          # architecture, schema, state semantics, and visual spec
  mockup.html        # 2026-07-04 visual mockup with fake data (panel content; palette superseded)
  generator/         # Python read-only scanner -> state.json
  frontend/          # Vite + React + TypeScript + Tailwind app UI
    server/          # the endpoints, shared by the dev server and the client
  client/            # Electron desktop client (macOS, Windows, Linux)
```
