# os-ui Design - Research OS Read-only Dashboard

This document is the implementation contract for `os-ui/`. The layout and the
visual tokens in force follow mockup C, "document first"
(`os-ui/mockups/step1/c-document.html`), which the Human Owner chose on
2026-11-21 (§4, §7). The earlier static mockup, [mockup.html](mockup.html),
still specifies the content of the dashboard panels; its palette and its tab
shell are superseded.

Authorization boundary: the human authorized a read-only monitor UI on
2026-07-04. That exception applies only to observation. On 2026-07-22 the Human
Owner authorized exactly one narrow write action on top of it — disabling or
enabling a single install location — because it is non-destructive,
reversible, and visible in Git. On 2026-09-26 the Human Owner asked for the
root-agent conversation inside the UI (GOAL.md H2: one root agent as the
human's single point of contact) and, the same evening, a direct entry to each
project's agent, so the **Root Agent** window, the Projects window's **Agent**
view, and their token-gated `/api/chat/*` endpoints were added; they start,
resume, stop, and read os-harness sessions at the repository root or inside one
registered project, and execute nothing themselves.
On 2026-09-30 the Human Owner authorized a second narrow write: setting one
paper or source note's reading `status` (unread, skimmed, read) from the Paper
Wiki viewer, because the status is the human's own reading record and the
static viewer had no way to capture it. It rewrites one frontmatter line,
regenerates `paper-wiki/viz.html`, and is reversible and visible in Git.
Later on 2026-09-30 the Human Owner asked for OpenResearch-style buttons that
switch literature sources on and off, authorizing a third narrow write: the
agent windows' **Papers** button flips one source in
`memory/paper-sources.json` through the `paper-search` skill's `sources`
command. The switches bind the agents' paper search, so they sit next to the
conversation, behind the same token; the write is one boolean, reversible and
visible in Git.
The same day, preparing the OS for public release, the Human Owner authorized
a fourth: the Papers panel's **Keys** section stores or clears one of the
per-user keys `paper-search` knows (`OPENALEX_API_KEY`, `NCBI_API_KEY`,
`HF_TOKEN`) in the repository's gitignored `.env`, through the skill's `keys`
command. Unlike the other writes it is deliberately invisible to Git: the
value travels on stdin, is refused unless Git ignores `.env`, and never comes
back to the browser, which learns only whether each key is set.
On 2026-10-10 the Human Owner asked for the OS as a desktop client for macOS,
Windows, and Linux, which authorizes the GOAL.md M4 desktop wrapper only
([client/DESIGN.md](client/DESIGN.md) §0, ADR-0005). The client serves the same
endpoints as the dev server, from the same code (`frontend/server/`), and adds
no write action on repository content; its own additions — regenerating the
cache `state.json`, the prerequisites check, the in-app snapshot push, and
notifications when a turn ends — run only while the app runs.
Everything else, including install and delete buttons, resident services, SSE,
and any further action endpoint, remains gated by GOAL.md M4: evidence first,
then explicit human confirmation.

## 1. Positioning

- `os-ui` is an observation dashboard with agent conversations. Its write
  actions are the skill enable/disable toggle (2026-07-22), the paper
  reading-status buttons (2026-09-30), the paper-source switches and keys
  (2026-09-30), and the agent
  conversations (2026-09-26: the root agent, now on Home, and each project's
  agent, now in its workspace; §4), which send messages to os-harness sessions.
- It renders repository state and copies commands for the human to run; it does
  not execute commands. Skill install and removal are copy-only, like every
  other command. The desktop client also runs the generator itself (on
  change and on request) and its prerequisite probes; both only read the
  repository.
- The filesystem remains the source of truth. It is also the only write
  surface: the toggle renames a file, the status buttons rewrite one
  frontmatter line, and the source switches rewrite one JSON boolean, rather
  than mutating hidden state. The one exception is the Keys section, whose
  `.env` line stays out of Git on purpose because it holds a secret.
- Removing `os-ui/` must leave the Research OS unaffected.
- The UI is infrastructure, not a project in `projects-folder/` and not a
  portfolio row.

## 2. Architecture And Contract

```text
plain repository files -> generator (Python, uv) -> state.json -> frontend
                          one-shot/watch tool        schema-only static UI
```

- `frontend/public/state.json` is the only generator/frontend contract.
- `state.json` includes `schema_version`. Schema changes are additive; old
  fields are not removed.
- The file is gitignored because it is a cache, not a durable source of truth.
- Generator modes:
  - one-shot: `uv run python generate.py`
  - foreground watch: `uv run python generate.py --watch`
- The frontend polls `state.json` every few seconds.
- Future realtime service + SSE is an M4-gated resident-service upgrade. The
  component layer should not need to change for that upgrade.

### Schema v0.1

```jsonc
{
  "meta": { "schema_version": "0.1", "generated_at": "...", "repo_head": "..." },
  "policy": { "agent_led_research": "off", "parallelism": "..." },
  "portfolio": [
    {
      "project": "...",
      "path": "...",
      "owner": "...",
      "stage": "...",
      "priority": "...",
      "status": "...",
      "evaluator": "...",
      "next_action": "...",
      "evidence": { "source": "...", "mtime": "..." }
    }
  ],
  "active_work": [
    { "title": "...", "items": [{ "text": "...", "done": false }], "source": "..." }
  ],
  "governance": [{ "date": "...", "decision": "...", "source": "..." }],
  "projects": [
    {
      "name": "...",
      "snapshot": {
        "owner": null,
        "origin": null,
        "stage": null,
        "priority": null,
        "evaluator_status": null,
        "current_question": null,
        "next_action": null
      },
      "evaluation": { "target": null, "best_known": null, "source": null },
      "rounds": [{ "id": "...", "score": null, "valid": true, "artifacts": [], "tasks": [] }],
      "evaluations": [],
      "os_feedback": [],
      "local_skills": [{ "name": "...", "promotion_candidate": null }]
    }
  ],
  "unregistered_projects": [{ "name": "...", "path": "..." }],
  "store": {
    "collections": [
      {
        "name": "...",
        "skills": [
          {
            "name": "...",
            "description": "...",
            "license": "...",
            "has_scripts": false,
            "installed": { ".claude/skills": true, ".agents/skills": true },
            "sync": "synced"
          }
        ]
      }
    ],
    "orphans": []
  },
  "activity": [{ "when": "...", "what": "...", "source": "..." }],
  "agent_activity": []
}
```

## 3. Data Sources

| UI element | Source | Current state |
|---|---|---|
| Portfolio strips | `memory/MEMORY.md` Active Projects table | available |
| Policy panel | `memory/MEMORY.md` Research Policy table | available |
| Active Work | `HANDOFF.md` Active Work checklists | available |
| Governance log | `HANDOFF.md` Decisions + `memory/MEMORY.md` decisions | available |
| Project snapshot | `projects-folder/<P>/PROJECT_MEMORY.md` Snapshot | available |
| Evaluation lines | `PROJECT_MEMORY.md` Evaluation Contract | pending a project with rounds |
| Round track | `projects-folder/<P>/Code/runs/<round-id>/result.json` | pending a project with rounds |
| Parallel branches | `projects-folder/<P>/Tasks/<task-id>/` | pending a project with rounds |
| Review reports | `projects-folder/<P>/Evaluations/` | pending a project with reviews |
| OS Feedback | `PROJECT_MEMORY.md` OS Feedback section | pending a project that records it |
| Local skills | project-local `.claude/skills` / `.agents/skills` | partial |
| Skill Store | `research-skills-hub/*/index.md` + `SKILL.md` frontmatter | available |
| License | skill LICENSE -> collection LICENSE/README -> fallback | available |
| Sync status | hub / `.claude/skills` / `.agents/skills` byte comparison | available |
| Activity | `git log` + project progress logs | available |

Pending sources must render empty states. The generator must not fabricate
sample records.

## 4. Information Architecture

Since 2026-11-22 the UI follows mockup C, "document first"
(`os-ui/mockups/step1/c-document.html`; HANDOFF.md Decisions, "Layout", and
[ADR-0006](../docs/adr/0006-desktop-workspace-trunk-and-plugins.md)): a left
navigation and one page at a time, built in `frontend/src/shell/`. It
supersedes the desktop shell of 2026-07-05 (menu bar, dock, and draggable
windows), which is still in `frontend/src/desktop/` but no longer rendered;
`frontend/src/App.tsx` says how to switch back, and a later change deletes it.
The tab shell before that is long gone. The mockup fixes structure, palette,
and type; where it drew sample data or controls with nothing behind them, the
app shows the real snapshot or nothing (list below).

- **Left navigation**: Home, Projects, Paper wiki, Skills, Plugins; Quick
  access with one entry per registered project; at the bottom the snapshot
  status, Settings, and a control that collapses the bar to icons. Buttons keep
  their names as `aria-label` when collapsed, and the current page carries
  `aria-current`.
- **Snapshot status** (sidebar footer): the snapshot time, amber and "stale"
  after 10 minutes on a live build, with generated time, schema, and HEAD on
  hover; the build ("Desktop client", "Dev server", or "Public snapshot · view
  only"); and the refresh control: a Regenerate button in the desktop client,
  a copy-the-command button on the dev server, nothing in a published build.
- **Home**: the root agent (GOAL.md H2) as a prompt bar that opens in place to
  the whole conversation with its session list; one card per project built
  from the portfolio row and the project's Snapshot (path, stage, priority,
  current question, status, next action, evaluator, owner, evidence), plus an
  amber card for each unregistered folder; and below them a closed **Workspace
  status** with the policy chips, Active Work, Recent Activity, and the
  governance log, which mockup C has no place for (the Human Owner confirmed
  this placement on 2026-11-21).
- **Projects**: one row per project with its stage, status, next action, and
  evidence in full; a row opens the workspace.
- **Project workspace**: the project's conversation on the left (collapsible
  to a thin strip) and its view tabs on the right. **Overview** comes first
  and is the default: a header (stage bar, owner/priority/evaluator chips,
  four counts), the Snapshot sentences as one-line previews that open on
  click, and collapsed sections for the round score track, evaluations, OS
  Feedback, and local skills. **Code** and **Paper** show a placeholder until
  their view plugins arrive later in step 1; **Idea**, **Skeleton**, and
  **Assets** are disabled with a "step 2" badge.
  Rule for Home and Overview, set by the Human Owner on 2026-09-27: show state
  with visual elements and as few words as possible; sentences appear only
  when the human clicks.
- **Skills**: hub collections, orphan skills, sync badges, script
  warnings, license labels, per-target install state, and a per-location
  enable/disable toggle; installing elsewhere stays a copied command. How this
  splits between the human and the agent is documented in
  [research-skills-hub/MANAGING-SKILLS.md](../research-skills-hub/MANAGING-SKILLS.md).
- **Plugins**: a fixed list, marked temporary in the code until the plugin
  registry replaces it: Paper Wiki enabled; the Code and Paper views later in
  step 1; the Idea, Skeleton, and Assets views and the Skills Hub in step 2;
  "Load from folder" disabled until step 2.
- **Settings**: in the desktop client, the workspace folder, the snapshot
  generator's last run, the prerequisites and agent logins, and "About this
  client"; the client's Help → System and Prerequisites opens it. In a
  browser it says these controls live in the desktop app. Agent selection is
  one line pointing to step 4.

A page stays mounted, hidden, once opened, so a conversation's draft and
selected session, a running turn's polling, and the Paper Wiki viewer survive
moving between pages. The sidebar and conversation collapse states, the open
page, the open project, and its tab are kept in `localStorage`
(`osui.layout.v1`). A published (non-LIVE) build mounts no conversation: Home
and the workspace show one line saying conversations run in the desktop app or
the dev server.

Mockup C elements not built, because nothing in the repository backs them yet:
the "New project" card and button, the card's one-line purpose (the current
question stands in for it), the latest-commit pill and "Last change" fact
(the portfolio row's evidence and its age stand in), the Agents toggles in
Settings, and the "Ask the agent about this" bar of the Code and Paper views.

- **Paper wiki**: the paper-wiki viewer (Graph and Timeline tabs), embedded by `<iframe>` from
   `paper-wiki/viz.html` rather than reimplemented natively. That file is a
   generated artifact (source: `research-skills-hub/open-paper-skills/
   paper-wiki-manager/scripts/{templates/viz.html,static/viz.{css,js}}`) that
   already vendors its own force-directed graph engine (fcose + cytoscape.js)
   and stays usable on its own — the GitHub Pages workflow at
   `.github/workflows/pages.yml` serves it at `paper-wiki/viz.html` inside the
   published os-ui build. Reimplementing that graph natively in React
   would duplicate a working, self-contained viewer for no benefit; the iframe
   keeps a single source of truth. `frontend/public/paper-wiki/` is a
   gitignored cache copy synced by `start.sh` (same treatment as
   `state.json`) — re-run `./start.sh` after editing paper-wiki content or the
   viewer templates. On the Paper wiki page it sits under mockup C's "Paper
   Wiki · bundled plugin" band and fills the rest of the page, managing its own
   scrolling. The viewer probes `GET /api/paper-wiki/status`
   ([frontend/paper-status-plugin.ts](frontend/paper-status-plugin.ts)); when
   it answers, a note's Status row becomes unread / skimmed / read buttons.
   `POST` runs paper-wiki-manager's `set_status.py`, regenerates `viz.html`,
   and copies the note and viewer into the cache copy, so a reload keeps the
   change without re-running `start.sh`.

## 5. State Semantics

- Honest stale state is better than fake realtime.
- Every derived status should expose source and timestamp when available.
- Missing fields render as explicit empty states or `not filled in`.
- The UI does not display "running" unless a durable file contract exists.
- `agent_activity` is reserved for a future leased-heartbeat design. If added,
  it must include `expires_at` so stale heartbeats degrade automatically.

## 6. Technology

- Frontend: Vite + React + TypeScript + Tailwind.
- Generator: Python, uv-managed, standard library only.
- Scope: all code and generated cache paths stay inside `os-ui/`.
- No database, resident service, server action surface, or agent transcript
  parser in v0.

## 7. Visual Spec

Ported from mockup C on 2026-11-22. Every value lives once, as a CSS variable
in [frontend/src/index.css](frontend/src/index.css); `tailwind.config.js` only
names them, and components use the names rather than hex codes.

- Mood: a quiet research document: warm paper surfaces, soft shadows instead
  of borders, serif headings and reading text.
- Palette (surfaces, back to front, then text, accent, states):
  - `--bg #f3eee5` page, `--side #ece5d8` navigation, `--paper #faf7f1`
    inputs and wells, `--card #fffdf9` cards
  - `--ink #1c1a17`, `--ink2 #4a453d`, `--muted #80786b`, `--faint #b0a796`
  - `--accent #1e5a56` (selection, links, focus, "ok"), with `--accent-ink`,
    `--accent-soft`, `--accent-tint`
  - `--warn #86581a` ("step 2", needs a look), `--signal #a4462c` (P1,
    running, missing, needs decision), `--danger #a33a2f` (failed, stop),
    each with a soft background
  - lines `rgba(70,55,30,.10)` and `.18`; shadows `--sh1`, `--sh2`, `--sh3`
  - The pre-2026-11-22 names (`--panel`, `--ink-soft`, `--grid`, `--verify`,
    `--stale`) remain as aliases of these, so older components and the
    retired desktop shell take the new palette.
- Fonts: system stacks only, so the app makes no font request: a serif
  (Iowan Old Style, Palatino, Georgia) for titles and reading text, the
  system sans for chrome, and a mono (SF Mono, Menlo, Consolas) for paths and
  code.
- Shape: 14px card radius, 9px for buttons and small boxes.
- Signature elements: the project's round score track; the stage bar
  (passed stages pale accent, the current one solid accent).
- Width: designed for windows from 1100px to 1600px with no horizontal page
  scroll; panes scroll inside themselves, and page text is held to a
  readable measure (1080px page column, 880px Overview). When the views pane
  narrows (both side panels open at 1100px), its "step 2" badges shrink to
  amber dots.
- Motion: restrained hover lift, the sidebar's width change, and the drawer
  slide; respect `prefers-reduced-motion`.
- Focus: one 2px accent ring on every control; a whole card shows the ring
  when its open button has focus.

## 8. Non-goals

- No write operations beyond the skill enable/disable toggle, the paper
  reading-status buttons, and the paper-source switches and keys. The toggle: a
  symlinked install moves into the
  target's `.disabled/` directory, a copied one renames its `SKILL.md` to
  `SKILL.md.disabled`. No skill content is created or deleted, and installing
  remains a copied command — the toggle is offered only where an install
  already exists. The status buttons change only the `status:` line of a note
  under `paper-wiki/papers/` or `paper-wiki/sources/`, never note content.
  The source switches change only one source's boolean in
  `memory/paper-sources.json`; os-ui itself runs no paper search. The Keys
  section sets or removes only the `.env` line of one of those three names and
  never reads a value back.
- No resident services or SSE until M4. All the write endpoints are served by
  the Vite dev server or by the desktop client (`client/`, 2026-10-10), from
  the same code in `frontend/server/`: they exist only while `start.sh` or the
  app runs and die with it.
- No execution buttons until M4, except the desktop client's Regenerate
  (it runs the read-only generator). Install and remove stay copy-only.
- No user accounts, multi-user collaboration, or remote deployment of the live
  desktop. The one remote copy is the view-only production build that
  `.github/workflows/pages.yml` publishes to GitHub Pages from `autoreadpaper`
  (Human Owner, 2026-09-30); it carries no endpoints and hides their controls
  (`frontend/src/lib/mode.ts`).
- No agent transcript parser or dependence on one specific agent.
- No Chinese UI/i18n layer for now; the current build is English-first. Keep
  `README_zh.md` as a reference copy, and add Chinese UI support later when the
  OS is mature enough to justify it.
