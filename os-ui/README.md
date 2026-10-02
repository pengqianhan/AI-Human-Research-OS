# os-ui - Research OS Read-only Desktop

`os-ui/` is a read-only observation window for the AI-Human Research OS. It
renders the repository's current state in a browser using a desktop-OS
metaphor. It does not execute actions or write source files; the filesystem
remains the only source of truth. Removing `os-ui/` does not affect the OS
itself.

A Chinese copy of the previous overview is kept at [README_zh.md](README_zh.md).
The current build direction is English-first; Chinese UI support can be added
later when the OS is more mature.

## Interface

The UI opens as a dot-grid desktop with three layers:

- **Menu bar**: the OS name, a snapshot freshness chip, and the
  `agent_led_research` policy chip. Hover the snapshot chip to see the full
  generated timestamp, schema version, and repository HEAD.
- **Windows**: five draggable, resizable, minimizable macOS-style windows:
  **Dashboard**, **Projects**, **Skill Store**, **Paper Wiki** (the
  standalone `paper-wiki/viz.html` graph and timeline viewer, embedded by iframe — see
  DESIGN.md §4; here a note's Status row saves your unread / skimmed / read
  state into the note's file), and **Root Agent** (below).
- **Dock**: the five app icons on the left, and one copy-only button for
  snapshot regeneration on the right.

## Agent conversations

Two entry points share one chat component:

- **Root Agent window** (dock): the conversation with the root agent (GOAL.md
  H2). Each message is one [os-harness](../os-harness/README.md) turn at the
  repository root; the agent reads AGENTS.md there and hands project work to
  project agents through the `project-dispatch` skill.
- **Projects window → Agent**: the conversation with one project's agent. Each
  message is one turn inside `projects-folder/<Name>/`, so the human can
  operate a project directly. Runs the root agent dispatched into that project
  appear in the same list and can be continued with feedback.

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
agent, in every window and outside the UI. The panel's **Keys** section takes
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
starts (`OS_UI_TOKEN` sets it; otherwise it is random per start). The window
asks for it once and keeps it in `localStorage`. The token exists because the
dev server may be reached through a public tunnel and this endpoint runs an
agent with full permissions: without the token, `/api/chat/*` answers 401.

Endpoints (dev server only, in [frontend/chat-plugin.ts](frontend/chat-plugin.ts)):
`GET /api/chat/sessions?cwd=`, `GET /api/chat/session?id=`,
`POST /api/chat/send` (`{cwd, agent, mode, session?, text}`), and
`POST /api/chat/stop` (`{session}`); the Papers button uses
`GET`/`POST /api/paper-sources` (`{source, enabled}`),
`POST /api/paper-sources/read-order` (`{order}`), and
`POST /api/paper-sources/key` (`{name, value}`; an empty value clears), in
[frontend/paper-sources-plugin.ts](frontend/paper-sources-plugin.ts), behind
the same token. `cwd` is empty for the repository root or
`projects-folder/<Name>` for a registered project; anything else is refused.
The plugin only starts, resumes, stops, and reads harness sessions; the traces
live in `os-harness/sessions/`. A static build has no chat, like it has no
skill toggle.

Dashboard and Projects show state visually (stage bars, chips, progress bars,
counts, a timeline) and keep sentences behind a click, following the Human
Owner's 2026-09-27 direction; DESIGN.md §4 lists what each page shows.

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

To view the live dashboard from another device for a while, open a Cloudflare
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

Any production build is view-only: the write and agent endpoints exist only on
the dev server, and [src/lib/mode.ts](frontend/src/lib/mode.ts) hides their
controls — no Root Agent window, no project Agent view, no skill toggles, no
copy-command dock button, and the Paper Wiki Status row reads without buttons.

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
4. **Desktop shell, research cockpit content**. The visual identity is
   engineering graph paper plus flight-progress strips, not a generic product
   dashboard.

The desktop shell was inspired by [wanman.ai](https://wanman.ai/) and
[chekusu/wanman](https://github.com/chekusu/wanman), but keeps this OS's own
palette, typography, and read-only semantics.

## Follow-up Queue

- [ ] Persist window layout in `localStorage`.
- [ ] Add keyboard move/resize controls for windows.
- [ ] Feed the round score track from real `Code/runs/<round-id>/result.json`
      files once a project produces them.
- [ ] Split governance or activity into separate dock apps only if real use
      shows that the Dashboard is too dense.
- [ ] M4-gated: replace polling with a small file-watching service plus SSE.
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
  mockup.html        # static visual mockup with fake data
  generator/         # Python read-only scanner -> state.json
  frontend/          # Vite + React + TypeScript + Tailwind desktop UI
```
