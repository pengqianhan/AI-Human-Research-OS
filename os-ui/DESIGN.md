# os-ui Design - Research OS Read-only Dashboard

This document is the implementation contract for `os-ui/`. The static visual
mockup lives in [mockup.html](mockup.html).

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
Everything else, including install and delete buttons, resident services, SSE,
and any further action endpoint, remains gated by GOAL.md M4: evidence first,
then explicit human confirmation.

## 1. Positioning

- `os-ui` is an observation dashboard with agent conversations. Its write
  actions are the skill enable/disable toggle (2026-07-22), the paper
  reading-status buttons (2026-09-30), the paper-source switches and keys
  (2026-09-30), and the agent
  conversations (2026-09-26: the Root Agent window and each project's Agent
  view), which send messages to os-harness sessions.
- It renders repository state and copies commands for the human to run; it does
  not execute commands. Skill install and removal are copy-only, like every
  other command.
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

Since 2026-07-05 the UI uses a desktop shell: a persistent menu bar, a bottom
dock, and draggable/zoomable/minimizable windows under `frontend/src/desktop/`.
The old tab-shell concept is superseded.

1. **Dashboard**: portfolio strips (stage bar and chips; the status, evaluator,
   and next-action sentences open on click), unregistered project warnings,
   Active Work rows (progress bar; checklist opens on click), an activity
   timeline (first line; full text opens on click), policy chips, and the
   collapsed governance log.
2. **Projects**: a header (stage bar, owner/priority/evaluator chips, four
   counts), the Snapshot sentences as one-line previews that open on click,
   and collapsed sections for the round score track, evaluations, OS
   Feedback, and local skills; plus the Agent view (§1).
   Rule for both pages, set by the Human Owner on 2026-09-27: show state with
   visual elements and as few words as possible; sentences appear only when
   the human clicks.
3. **Skill Store**: hub collections, orphan skills, sync badges, script
   warnings, license labels, per-target install state, and a per-location
   enable/disable toggle; installing elsewhere stays a copied command. How this
   splits between the human and the agent is documented in
   [research-skills-hub/MANAGING-SKILLS.md](../research-skills-hub/MANAGING-SKILLS.md).
4. **Paper Wiki**: the paper-wiki viewer (Graph and Timeline tabs), embedded by `<iframe>` from
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
   viewer templates. Its window skips the padded content area every other app
   uses (`AppDef.fill`), so the viewer fills the window edge-to-edge and
   manages its own scrolling. The viewer probes `GET /api/paper-wiki/status`
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

- Mood: research control room, air-traffic progress strips, engineering graph
  paper.
- Palette:
  - `--paper #F2F4F3`
  - `--panel #FFFFFF`
  - `--ink #17262E`
  - `--ink-soft #52646E`
  - `--grid #D9E0E2`
  - `--signal #E8590C`
  - `--verify #2F7D6D`
  - `--warn #B7791F`
  - `--danger #C4564A`
- Fonts: IBM Plex Mono for headings/data, IBM Plex Sans for body text.
- Signature elements:
  - Dashboard portfolio flight strip
  - Project round score track
- Motion: restrained hover lift and drawer slide; respect
  `prefers-reduced-motion`.
- Desktop shell: white panel windows, 12px radius, soft shadow, centered mono
  title, traffic lights mapped to semantic colors, and a glass dock.

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
- No resident services or SSE until M4. All the write endpoints are Vite
  dev-server middleware: they exist only while `start.sh` runs and die with
  Ctrl-C.
- No execution buttons until M4. Install and remove stay copy-only.
- No user accounts, multi-user collaboration, or remote deployment of the live
  desktop. The one remote copy is the view-only production build that
  `.github/workflows/pages.yml` publishes to GitHub Pages from `autoreadpaper`
  (Human Owner, 2026-09-30); it carries no endpoints and hides their controls
  (`frontend/src/lib/mode.ts`).
- No agent transcript parser or dependence on one specific agent.
- No Chinese UI/i18n layer for now; the current build is English-first. Keep
  `README_zh.md` as a reference copy, and add Chinese UI support later when the
  OS is mature enough to justify it.
