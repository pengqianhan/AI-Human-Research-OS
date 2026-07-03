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

### circle_packing — first real project / OS shakedown (planned 2026-07-03, grilling session)

Purpose: reimplement the `circle_packing` task from `Resource/EurekAgent/examples/circle_packing/`
inside the OS as its first real project. **Primary goal is stress-testing and refining the OS**;
the math result is secondary. Decisions table: see "circle_packing kickoff decisions" below.

- [ ] Create idea card `Ideas/circle-packing-os-shakedown.md` (OKF concept, `type: Idea`);
      update [Ideas/index.md](Ideas/index.md); set `status: promoted` at instantiation.
- [ ] Instantiate: `cp -R projects-folder/templates/ai_research_template projects-folder/circle_packing`
      (template unchanged — route B). Fill `index.md`, `PROJECT_MEMORY.md` Snapshot
      (`owner: human-led`, `origin: EurekAgent example task`, `stage: probe`),
      `paper_skeleton.md` Snapshot; add row to Active Projects in
      [Memory/MEMORY.md](Memory/MEMORY.md); refresh `FILETREE.md` (filetree-simple + lint).
- [ ] Add project-experimental sections to `PROJECT_MEMORY.md`:
      `## Evaluation Contract` (3-tier goals below; stop condition: 5 consecutive rounds
      with best-score gain < 0.001 → switch to writing),
      `## Autonomy Boundary` (per-run budget 600 s; ≤ 2 h CPU per round; ≤ 8 optimization
      rounds; parallel width ≤ 3; ≤ 2 retries per round; human review between rounds),
      `## OS Feedback` (one line per entry: `date | OS mechanism | expected vs actual |
      severity | suggested change`; **every round must add an entry or an explicit "none"**).
- [ ] Phase 0 — independent evaluator at `projects-folder/circle_packing/Code/evaluator/evaluate.py`:
      spec = n=26, shapes (26,2)/(26,), radii ≥ 0, reported vs actual sum atol 1e-6,
      circles inside unit square, pairwise non-overlap tol 1e-6, score = sum of radii.
      Reimplement from the problem spec — **no code copied from `Resource/EurekAgent/` (AGPL)**.
      Fixed self-tests before freeze: single circle r=0.5, k×k grid, overlapping pair,
      out-of-bounds, sum-mismatch. Freeze = git commit after tests pass.
- [ ] Protection (tier 2): project-local `.claude/settings.json` deny rules for Edit/Write on
      `Code/evaluator/**` and `Code/runs/**/result.json`. Rule: solver code never self-reports
      final scores; every recorded score comes from evaluator-written `result.json`.
- [ ] Verify provenance of best-known 2.63598844 with the literature-search skills; cite it in
      Evaluation Contract "Baselines or known best" (or record honestly as "taken from
      EurekAgent task definition, provenance unverified"). Add AlphaEvolve note to
      [paper-library/papers/](paper-library/papers/) (minimal profile) + bib entry in project
      `paper/references.bib`. Bounded intake: 3–5 sources total, no new topic page.
- [ ] Rounds 1–2 (single-threaded): baseline construction (grid/greedy) then one improvement
      round; artifacts under `Code/runs/<round-id>/`. Round wrap-up (manual, not yet a skill):
      progress log entry, evaluator `result.json`, OS Feedback entry, git commit on `main`.
- [ ] Round 3+: one deliberate parallel round — 2–3 heterogeneous approaches in
      `Tasks/<approach-id>/` workspaces, ranked by the frozen evaluator; merge winner only.
- [ ] Mid-term artifact review after the parallel round: separate read-only agent session,
      hard checks on the evidence chain (evaluator tests pass, claims ↔ result.json, citation
      metadata real); report → `projects-folder/circle_packing/Evaluations/`.
      Then OS back-port batch 1 (template fields proven useful).
- [ ] Writing phase after stop condition: `paper/main.tex` (claims table in
      `paper_skeleton.md` is live from round 1). Final review = full protocol (hard checks +
      8-dimension rubric + LLM critique), isolated session → `Evaluations/`.
- [ ] Project end: OS back-port batch 2 + update HANDOFF / Memory/MEMORY.md; paper is an
      honest methods + experiment report (not a record-attempt paper).

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

**circle_packing kickoff decisions (2026-07-03, grilling session):**

| Decision | Default taken | To reverse |
|---|---|---|
| First real project | Reimplement EurekAgent's `circle_packing` (26 circles in unit square, maximize sum of radii) as `projects-folder/circle_packing/`; **primary purpose = OS shakedown**, math result secondary | Pick another EurekAgent task (`ac1`, `erdos_min_overlap`; kernel task needs an NVIDIA GPU) or a fresh human-led topic |
| Success criteria | 3 tiers: (1) floor — independent evaluator + reproducible `runs/` pipeline + monotone score trajectory; (2) target — ≥ 2.60 via an explainable method mix; (3) stretch, not promised — approach/beat 2.63598844. Paper = honest methods/experiment report | Re-scope as a record attempt; rewrite Evaluation Contract |
| Template strategy (route B) | Instantiate from the **unchanged** template; prototype Evaluation Contract / Autonomy Boundary / `Code/runs/` in-project; back-port to `ai_research_template` only after real use | Route A: extend the template first, then instantiate |
| Execution model | Phased hybrid: rounds 1–2 single-threaded; round 3+ one deliberate parallel round via `Tasks/<approach-id>/` (≤ 3 approaches, same frozen evaluator ranks, merge winner only) | All-sequential (defer `Tasks/` test to a later project) or EurekAgent-style parallel from round 1 |
| Evaluator protection | Tier 2: freeze after self-tests + project-local `.claude/settings.json` deny rules on `Code/evaluator/**` and `runs/**/result.json`; scores only from evaluator-written files | Tier 1 (convention only) or tier 3 (PreToolUse hook script) — escalate to 3 only on an observed bypass, recorded as an OS lesson |
| OS friction capture | `## OS Feedback` section in project `PROJECT_MEMORY.md`, fixed one-line format, mandatory entry (or explicit "none") every round; survivors promoted at phase ends | Ad-hoc progress-log notes, or logging straight into global memory (rejected: pollutes ≤200-line budget) |
| Literature scope | Bounded: 3–5 sources; 1–2 paper-library notes (minimal profile, AlphaEvolve first); no new topic page until ≥ 3 related notes; provenance of 2.63598844 must be verified or honestly flagged | Skip paper-library entirely (bib-only) or run a fuller packing-literature survey |
| Artifact-level review | Exactly two: mid-term hard-check review after the parallel round; final full review (hard checks + rubric + LLM critique) after `main.tex`. Reviewer = fresh read-only agent session; reports in project `Evaluations/` | Single final review, or per-round reviews (rejected: cost without new signal) |
| Leaf defaults | Full idea→project path via `Ideas/`; lowercase project name; commits on `main` per round; `paper_skeleton.md` live from round 1, `main.tex` after stop condition; round wrap-up **not** skill-ified before round 3; two OS back-port batches | Each independently reversible; see Active Work items |

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
