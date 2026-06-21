# Change Summary — AI-Human Research OS

Backward-looking record: the **decisions**, **deviations**, and **what was intentionally not done**
that git history alone can't explain. There is currently no active forward-looking
task plan; create `task_plan.md` only when unfinished work needs a cross-session
resume point. Maintained by the `session-handoff` skill.

**Commits are not duplicated here** — read them from git, which is the source of truth:

```bash
git log --oneline            # what happened, in order
git show <hash>              # the actual diff for any change
```

> Full detail of the completed 2026-06 normalization task (verified problem inventory P1–P14,
> phased execution, smoke-test results, acceptance table) lives in git history —
> `git show d4edf3f:CHANGE_SUMMARY-2026-06.html` (and `:task_plan-2026-06.html`).
> This file keeps only the durable, non-git content.

## Decisions

Defaults taken during the normalization task (2026-06-12) and its follow-ups, each reversible.

| ID | Decision | Default taken | To reverse |
|---|---|---|---|
| D1 | Restore the `CLAUDE.md` pointer (a prior commit had removed it as "redundant")? | **Restored** the one-line pointer to INSTRUCTION.md | Delete `CLAUDE.md` and rely on Claude Code reading `AGENTS.md` — confirm your version does so |
| D2 | Template directory casing | ~~`Paper_Initial_template`~~ **— superseded 2026-06-17:** renamed to **`ai_research_template`** (all-lowercase) | `git mv` back and update README / INSTRUCTION / OS_INTRO / the index files, then regenerate FILETREE.md |
| D3 | Track reference PDFs in git? | Status quo (tracked if added); none added yet | Add `References/*.pdf` to `.gitignore` |
| D4 | HTML as the format for operating docs | **— superseded 2026-06-17 and narrowed later:** hand-off records are **Markdown** when present; `CHANGE_SUMMARY.md` is the durable record and `task_plan.md` is optional for unfinished work; `OS_INTRO.html` stays HTML as a static delivered intro | Convert hand-off records back to HTML (not recommended — Markdown is cheaper to read/edit/grep/diff) |
| D5 | Build a CLI? | **No** — non-goal; conventions + skills suffice at this scale | Revisit only with explicit confirmation if navigation becomes slow |
| D6 | Keep `Example_Project/`? | **Kept** as living documentation under `projects-folder/Example_Project/` | `rm -rf projects-folder/Example_Project` + remove its README/MEMORY/Ideas links and FILETREE rows |
| D7 | `.agents/skills` vs `.claude/skills` (vs hub) duplication | **Three** identical copies (two installed + the canonical `Research-skills-hub/` source) kept in sync by a documented rule | Symlink the installed dirs (macOS/Linux only) |
| D8 | Where do instantiated projects live? | `projects-folder/<ProjectName>/`; reusable templates in `projects-folder/templates/<TemplateName>/` | Move projects back to the repo root and revert links + FILETREE rows |
| D9 | Structured (YAML/JSON) indexes? | **No** — Markdown tables are grep-able and token-cheap | Add YAML front-matter later if tooling needs to parse indexes |

**Follow-up decisions (2026-06-17):**

| Decision | Default taken | To reverse |
|---|---|---|
| FILETREE.md scope when renaming the template | **Full regen** (re-indexed the whole `projects-folder/` reorg that the manifest had missed) over a minimal rename-only patch | n/a — full sync is the correct state and `filetree.py lint` enforces it |
| Historical task docs still naming `Paper_Initial_template` | **Left untouched** (`task.md`, `task_en.md`, archived plan/summary) — they are records/quotes | Add clarifying footnotes (not in-place renames) if one canonical name is wanted everywhere |
| Where decisions are recorded | **Deduped to this file** (durable cross-project subset mirrored in `Memory/MEMORY.md`); active task plans link here only when they exist | Re-add a decisions table elsewhere (not recommended — invites drift) |
| Active task plan lifecycle | **Deleted the completed root `task_plan.md`**; create a new one only for unfinished work that must survive a session boundary | Restore the file from git or create a new active task plan for an unfinished task |

## Deviations from the original plan

- **Build runs in place from `paper/`** — `main.tex` writes `paper/main.pdf` and reads
  `paper/references.bib`, avoiding repo-level reference-path assumptions.
- **Reference intake was bib-entry-only** for the smoke test (no PDF downloaded), pending D3.
- **History caveat:** the old change-summary (`git show d4edf3f:CHANGE_SUMMARY-2026-06.html`) lists
  commit hashes (`1157410`, `73ed6df`, …) that are **not** on the current `forfable` branch — the
  repo was re-committed since. Trust `git log`, never those frozen tables.

## Intentionally not done

- **README roadmap features** (paper-wiki, read_paper workflow, group-meeting workspace, CLI,
  deterministic-read bash hooks) — roadmap, not normalization; several need explicit confirmation.
- **In-place rename inside the historical task docs** — would falsify the record of the 2026-06-12
  task and its D2 decision; those strings are quotes, not live links.
- **Root `Templates/` container** — deferred until a second project template exists.
- **Sync tooling / git hooks for the three skill copies** — a documented convention suffices (D7).
