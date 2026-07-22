# os-ui Design - Research OS Read-only Dashboard

This document is the implementation contract for `os-ui/`. The static visual
mockup lives in [mockup.html](mockup.html).

Authorization boundary: the human authorized a read-only monitor UI on
2026-07-04. That exception applies only to observation. On 2026-07-22 the Human
Owner authorized exactly one narrow write action on top of it — toggling an
installed skill between `SKILL.md` and `SKILL.md.disabled` — because that
rename is non-destructive, reversible, and visible in Git. Everything else,
including install and delete buttons, resident services, SSE, and any further
action endpoint, remains gated by GOAL.md M4: evidence first, then explicit
human confirmation.

## 1. Positioning

- `os-ui` is an observation dashboard, not a control console. Its only write
  action is the skill enable/disable toggle authorized on 2026-07-22.
- It renders repository state and copies commands for the human to run; it does
  not execute commands. Skill install and removal are copy-only, like every
  other command.
- The filesystem remains the source of truth. It is also the only write
  surface: the toggle writes by renaming a file, not by mutating hidden state.
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
| Evaluation lines | `PROJECT_MEMORY.md` Evaluation Contract | pending circle_packing M2 |
| Round track | `projects-folder/<P>/Code/runs/<round-id>/result.json` | pending circle_packing M2 |
| Parallel branches | `projects-folder/<P>/Tasks/<task-id>/` | pending circle_packing M2 |
| Review reports | `projects-folder/<P>/Evaluations/` | pending circle_packing M2 |
| OS Feedback | `PROJECT_MEMORY.md` OS Feedback section | pending circle_packing M2 |
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

1. **Dashboard**: portfolio strips, unregistered project warnings, Active Work,
   recent activity, research policy, and governance log.
2. **Projects**: snapshot cards, round score track, round cards, evaluations,
   OS Feedback, and local skills.
3. **Skill Store**: hub collections, orphan skills, sync badges, script
   warnings, license labels, and copy-only install/sync-back commands.

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

- No write operations beyond the skill enable/disable toggle (`SKILL.md` ↔
  `SKILL.md.disabled`). No other file is created, modified, or deleted.
- No resident services or SSE until M4. The toggle endpoint is a Vite dev-server
  middleware: it exists only while `start.sh` runs and dies with Ctrl-C.
- No execution buttons until M4. Install and remove stay copy-only.
- No user accounts, multi-user collaboration, or remote deployment.
- No agent transcript parser or dependence on one specific agent.
- No Chinese UI/i18n layer for now; the current build is English-first. Keep
  `README_zh.md` as a reference copy, and add Chinese UI support later when the
  OS is mature enough to justify it.
