# Handoff — AI-Human Research OS

Cross-session record for the **decisions**, **deviations**, and **what was intentionally
not done** that git history alone can't explain. Active unfinished work, when any
exists, is recorded in this file under **Active Work**. Maintained by the
`session-handoff` skill.

**Commits are not duplicated here** — read them from git, which is the source of truth:

```bash
git log --oneline            # what happened, in order
git show <hash>              # the actual diff for any change
```

> Full detail of the completed 2026-06 normalization task (verified problem inventory P1–P14,
> phased execution, smoke-test results, acceptance table) lives in git history —
> `git show d4edf3f:CHANGE_SUMMARY-2026-06.html` (and `:task_plan-2026-06.html`).
> This file keeps only the durable, non-git content.

## Active Work

No active tasks.

When work is active, use a Markdown checklist:

- [ ] Pending item — next action / verification needed.
- [x] ~~Completed item~~ — verified.

## Decisions

Defaults taken during the normalization task (2026-06-12) and its follow-ups, each reversible.

| ID | Decision | Default taken | To reverse |
|---|---|---|---|
| D1 | Restore the `CLAUDE.md` pointer (a prior commit had removed it as "redundant")? | **Restored** the one-line pointer to INSTRUCTION.md | Delete `CLAUDE.md` and rely on Claude Code reading `AGENTS.md` — confirm your version does so |
| D2 | Template directory casing | ~~`Paper_Initial_template`~~ **— superseded 2026-06-17:** renamed to **`ai_research_template`** (all-lowercase) | `git mv` back and update README / INSTRUCTION / OS_INTRO / the index files, then regenerate FILETREE.md |
| D3 | Track reference PDFs in git? | Status quo (tracked if added); none added yet | Add `References/*.pdf` to `.gitignore` |
| D4 | HTML as the format for operating docs | **— superseded 2026-06-17 and narrowed later:** `HANDOFF.md` is the durable Markdown hand-off record; `OS_INTRO.html` stays HTML as a static delivered intro | Convert hand-off records back to HTML (not recommended — Markdown is cheaper to read/edit/grep/diff) |
| D5 | Build a CLI? | **No** — non-goal; conventions + skills suffice at this scale | Revisit only with explicit confirmation if navigation becomes slow |
| D6 | Keep `Example_Project/`? | **Kept** as living documentation under `projects-folder/Example_Project/` | `rm -rf projects-folder/Example_Project` + remove its README/MEMORY/Ideas links and FILETREE rows |
| D7 | `.agents/skills` vs `.claude/skills` (vs hub) duplication | **Three** identical copies (two installed + the canonical `Research-skills-hub/` source) kept in sync by a documented rule | Symlink the installed dirs (macOS/Linux only) |
| D8 | Where do instantiated projects live? | `projects-folder/<ProjectName>/`; reusable templates in `projects-folder/templates/<TemplateName>/` | Move projects back to the repo root and revert links + FILETREE rows |
| D9 | Structured (YAML/JSON) indexes? | **No** — Markdown tables are grep-able and token-cheap | Add YAML front-matter later if tooling needs to parse indexes |

**Follow-up decisions (2026-06-17):**

| Decision | Default taken | To reverse |
|---|---|---|
| FILETREE.md scope when renaming the template | **Full regen** (re-indexed the whole `projects-folder/` reorg that the manifest had missed) over a minimal rename-only patch | n/a — full sync is the correct state and `filetree.py lint` enforces it |
| Role of `task.md` / `task_en.md` | **Superseded 2026-07-03:** treat them as live OS construction guides, not historical records; keep them aligned with current paths and design stance | Move them to an archive folder and create new live task files if a historical/original prompt record is needed |
| Where decisions are recorded | **Deduped to this file** (durable cross-project subset mirrored in `Memory/MEMORY.md`) | Re-add a decisions table elsewhere (not recommended — invites drift) |
| Active work lifecycle | **Retired separate plan files**; unfinished cross-session work now lives in this file under `## Active Work` | Restore the separate-plan convention from git if future tasks need a dedicated file |

**Research-environment decisions (2026-07-03):**

| Decision | Default taken | To reverse |
|---|---|---|
| What is this OS primarily? | Treat it as a **file-system-native environment for long-horizon human-agent research**. The human user's own research practice is primary; reusable open-source templates are a byproduct; product/platform possibilities stay future-compatible but do not drive current complexity. | Reposition README/INSTRUCTION around an external product or template-first project, then revisit CLI/UI/database needs explicitly. |
| Paper library boundary | Shared paper understanding lives in `paper-library/papers/` and `paper-library/topics/`; project-specific use of a paper lives in the project (`references.bib`, `paper_skeleton.md`, `PROJECT_MEMORY.md`). | Allow full project-local copies of paper notes, accepting duplicate-note drift. |
| Topic pages | Topic pages are lightweight synthesis and research roadmaps, not mere tags or exhaustive surveys. | Downgrade topics to index-only pages, or promote them into full survey documents with a separate maintenance policy. |
| Experience promotion | Project-only facts stay in project memory; cross-project principles go to global memory; repeatable procedures become skills only when another project agent can execute them without local context. | Skill-ify more aggressively, accepting skill-library churn and validation overhead. |
| Agent-led research | Default `agent_led_research` is **`off`**. Optional modes are `scout_only` and `full_gated`; full gated agent-led work uses `scout → probe → develop → archived/passed`. | Change the value in `Memory/MEMORY.md` and add budget/evaluator controls before running agent-led projects. |
| Parallelism | **Portfolio always on, intra-project parallelism on demand.** Multiple projects can be tracked, but project-internal multi-agent work starts only when decomposable, verifiable, and worth merge cost. | Make intra-project parallelism default, but add task queue, merge, budget, and evaluator machinery first. |
| Project state source | Global state is the Active Projects table in `Memory/MEMORY.md`; per-project truth is `PROJECT_MEMORY.md`; project `index.md` is a navigation summary, not a state database. `HANDOFF.md` stays narrow. | Move state into a dashboard, CLI, issue tracker, or structured database after confirming Markdown tables are insufficient. |
| Evaluator | Use one evaluator protocol for human-led and agent-led research: hard checks + rubric scoring + LLM critique. Final judgment targets complete artifacts, not empty ideas. | Replace with a lightweight LLM-only judge, accepting weaker guarantees on reproducibility and traceability. |

## Deviations from the original plan

- **Build runs in place from `paper/`** — `main.tex` writes `paper/main.pdf` and reads
  `paper/references.bib`, avoiding repo-level reference-path assumptions.
- **Reference intake was bib-entry-only** for the smoke test (no PDF downloaded), pending D3.
- **History caveat:** the old change-summary (`git show d4edf3f:CHANGE_SUMMARY-2026-06.html`) lists
  commit hashes (`1157410`, `73ed6df`, …) that are **not** on the current `forfable` branch — the
  repo was re-committed since. Trust `git log`, never those frozen tables.
- **2026-07-03 design discussion was documented as durable operating policy**, not as a
  transcript. The full reasoning remains in the conversation; `INSTRUCTION.md` and
  `Memory/MEMORY.md` carry the operational subset.

## Intentionally not done

- **README roadmap features** (paper-wiki, read_paper workflow, group-meeting workspace, CLI,
  deterministic-read bash hooks) — roadmap, not normalization; several need explicit confirmation.
- **Archive copy of the original 2026-06 task prompt** — not created. If needed later, recover it
  from git history instead of keeping a duplicate live file.
- **Root `Templates/` container** — deferred until a second project template exists.
- **Sync tooling / git hooks for the three skill copies** — a documented convention suffices (D7).
- **Evaluator implementation** — protocol recorded only; no evaluator script, grader service,
  scoring schema, or hidden-evaluator machinery added yet.
- **Agent-led project scaffolding** — policy recorded only; no new agent-led project, no
  `Evaluations/` directory, and no `Tasks/` workspace created until real work needs them.
- **EurekAgent-style controller/UI/Docker runtime** — intentionally not copied; current default
  remains plain files plus agent conventions.
