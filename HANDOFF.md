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

### Research OS construction — tracked in the route map (since 2026-07-17)

All OS-construction work formerly tracked here as "Agent-native OS evolution"
(GOAL M0–M4) and "Research OS MVP — architecture and phase redesign" now lives
in the route map [os-build/map/index.md](os-build/map/index.md):
waypoints N1–N12 carry states, human-runnable acceptance checks, dual verdicts,
and per-edge launch prompts under `os-build/map/prompts/`. Mapping:
M0 → N1, M1 → N2, MVP scenario/architecture/phase-contract → N3/N4/N5
(N3 and N4 decided 2026-07-17 — see the route-map Decisions block below),
circle_packing arc → N6–N9, end-to-end acceptance → N10, M3/M4 gates → N11/N12.
Read the map before opening any construction task; do not re-add construction
checklists here. The circle_packing checklist below remains the authoritative
work breakdown (referenced by map edge E6) until the project is instantiated.
Historical section text: git history of this file.

### os-ui — read-only monitor UI (designed 2026-07-04, grilling session)

Design settled in [os-ui/DESIGN.md](os-ui/DESIGN.md); pixel spec in
[os-ui/mockup.html](os-ui/mockup.html). User is a frontend novice — implement in
small explained steps (see `human/inbox.md` candidate entry). Read-only only;
execution surface stays behind GOAL.md M4.

- [x] ~~Design doc + clickable mockup (3 pages, fake data)~~ — delivered 2026-07-04.
- [x] ~~U0 — `os-ui/generator/` (Python, uv, stdlib-only): schema v0.1 →
      `frontend/public/state.json` (gitignored); `--watch` mtime polling~~ —
      verified: built-in validate PASS (33 hub + 3 orphans, portfolio 1,
      unregistered = Paper_VAE); independent schema-shape check passed.
- [x] ~~U1 — Vite + React + TS + Tailwind scaffold; Dashboard reads real
      state.json~~ — verified in browser: strips, unregistered alert,
      active-work progress, policy, activity, governance; console clean.
- [x] ~~U2 — Project page~~ — verified: honest nulls (未填写), round-track
      empty state (real rounds land with circle_packing M2), fixture-tested
      non-empty branch.
- [x] ~~U3 — Store page~~ — verified: 36 cards (incl. hub skills added by a
      parallel session — pipeline auto-picks-up), 4-state sync badges, orphan
      filter, drawer (dialog semantics, focus, sync-back command for orphans).
- [x] ~~U4 — novice README + wrap-up~~ — `os-ui/frontend/README.md`;
      build/tsc clean; mobile breakpoint verified; committed.
- [x] ~~U5 (2026-07-05) — desktop-OS shell rewrite (user directive, referencing
      wanman.ai): tab shell → menu bar + dock + draggable/zoomable/minimizable
      windows (`frontend/src/desktop/`); pages/data contract untouched~~ —
      verified in browser (spawn/cascade/zoom/minimize/dock indicators/mobile
      375px), tsc + build clean; adversarial review confirmed 2 a11y defects
      (focus loss on close/minimize; hover-only copy feedback) — both fixed,
      plus glass tokens (Tailwind `/80` on var() colors silently no-ops) and
      keep-last-good-state polling.
- [x] ~~U6 (2026-07-05) — user-feedback polish: one-command `os-ui/start.sh`
      (--watch mode, orphan-process bug found & fixed in testing); dock gains
      Claude Code / Codex launch-command copy buttons (agent-driven hint, per
      user, wanman-style); menu bar decluttered (details moved to hover
      tooltips); `os-ui/README.md` created (intro/launch/philosophy/TODO)~~ —
      verified in browser at 5199 (user's own 5173 untouched), tsc + build
      clean.

Run: `./os-ui/start.sh` (or `--watch`); the manual two-step alternative is in
`os-ui/README.md`. Next iteration ideas stay demand-driven
(OS Feedback), per DESIGN.md.

### circle_packing — first real project / OS shakedown (planned 2026-07-03, grilling session)

Purpose: reimplement the `circle_packing` task from `os-build/references/EurekAgent/examples/circle_packing/`
inside the OS as its first real project. **Primary goal is stress-testing and refining the OS**;
the math result is secondary. Decisions table: see "circle_packing kickoff decisions" below.

- [ ] Create idea card `ideas/circle-packing-os-shakedown.md` (OKF concept, `type: Idea`);
      update [ideas/index.md](ideas/index.md); set `status: promoted` at instantiation.
- [ ] Instantiate: `cp -R projects-folder/templates/ai_research_template projects-folder/circle_packing`
      (template unchanged — route B). Fill `index.md`, `PROJECT_MEMORY.md` Snapshot
      (`owner: human-led`, `origin: EurekAgent example task`, `stage: probe`),
      `paper_skeleton.md` Snapshot; add row to Active Projects in
      [memory/MEMORY.md](memory/MEMORY.md).
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
      Reimplement from the problem spec — **no code copied from `os-build/references/EurekAgent/` (AGPL)**.
      Fixed self-tests before freeze: single circle r=0.5, k×k grid, overlapping pair,
      out-of-bounds, sum-mismatch. Freeze = git commit after tests pass.
- [ ] Protection (tier 2): project-local `.claude/settings.json` deny rules for Edit/Write on
      `Code/evaluator/**` and `Code/runs/**/result.json`. Rule: solver code never self-reports
      final scores; every recorded score comes from evaluator-written `result.json`.
- [ ] Verify provenance of best-known 2.63598844 with the literature-search skills; cite it in
      Evaluation Contract "Baselines or known best" (or record honestly as "taken from
      EurekAgent task definition, provenance unverified"). Add AlphaEvolve note to
      [paper-wiki/papers/](paper-wiki/papers/) (minimal profile) + bib entry in project
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
- [ ] Project end: OS back-port batch 2 + update HANDOFF / memory/MEMORY.md; paper is an
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
| D7 | `.agents/skills` vs `.claude/skills` (vs hub) duplication | **Three** identical copies (two installed + the canonical `research-skills-hub/` source) kept in sync by a documented rule | Symlink the installed dirs (macOS/Linux only) |
| D8 | Where do instantiated projects live? | `projects-folder/<ProjectName>/`; reusable templates in `projects-folder/templates/<TemplateName>/` | Move projects back to the repo root and revert links + FILETREE rows |
| D9 | Structured (YAML/JSON) indexes? | **No** — Markdown tables are grep-able and token-cheap | Add YAML front-matter later if tooling needs to parse indexes |

**Follow-up decisions (2026-06-17):**

| Decision | Default taken | To reverse |
|---|---|---|
| FILETREE.md scope when renaming the template | **Full regen** (re-indexed the whole `projects-folder/` reorg that the manifest had missed) over a minimal rename-only patch | n/a — full sync is the correct state and `filetree.py lint` enforces it |
| Role of `task.md` / `task_en.md` | ~~Treat them as live guides, then compatibility entrypoints~~ **— superseded 2026-07-16:** durable construction guidance is merged into `GOAL.md`, both files are deleted, and the historical originals remain at commit `38d79be74b463dc41b0b651e5510ac7346502cbd` | Restore either file from the recorded commit; if restoring it as a live guide, split direction/construction ownership out of GOAL.md again |
| Where decisions are recorded | **Deduped to this file** (durable cross-project subset mirrored in `memory/MEMORY.md`) | Re-add a decisions table elsewhere (not recommended — invites drift) |
| Active work lifecycle | **Retired separate plan files**; unfinished cross-session work now lives in this file under `## Active Work` | Restore the separate-plan convention from git if future tasks need a dedicated file |

**os-ui shell decision (2026-07-05):**

| Decision | Default taken | To reverse |
|---|---|---|
| os-ui shell metaphor | **Desktop-OS shell** (menu bar + dock + draggable windows in `os-ui/frontend/src/desktop/`), per user directive referencing wanman.ai; supersedes the 2026-07-04 tab shell. Content pages, `state.json` contract, read-only semantics, and the token palette/fonts all unchanged (deliberately not cloning wanman's warm-cream look). `mockup.html` remains the in-window content spec; its tab-shell portion is superseded by DESIGN.md §3 note. | `git revert` the shell commit; the old tab shell lives in git history (`Tabs.tsx`, pre-2026-07-05 `App.tsx`) |

**Research-environment decisions (2026-07-03):**

| Decision | Default taken | To reverse |
|---|---|---|
| What is this OS primarily? | Treat it as a **file-system-native environment for long-horizon human-agent research**. The human user's own research practice is primary; reusable open-source templates are a byproduct; product/platform possibilities stay future-compatible but do not drive current complexity. | Reposition README/INSTRUCTION around an external product or template-first project, then revisit CLI/UI/database needs explicitly. |
| Paper library boundary | Shared paper understanding lives in `paper-wiki/papers/` and `paper-wiki/topics/`; project-specific use of a paper lives in the project (`references.bib`, `paper_skeleton.md`, `PROJECT_MEMORY.md`). | Allow full project-local copies of paper notes, accepting duplicate-note drift. |
| Topic pages | Topic pages are lightweight synthesis and research roadmaps, not mere tags or exhaustive surveys. | Downgrade topics to index-only pages, or promote them into full survey documents with a separate maintenance policy. |
| Experience promotion | Project-only facts stay in project memory; cross-project principles go to global memory; repeatable procedures become skills only when another project agent can execute them without local context. | Skill-ify more aggressively, accepting skill-library churn and validation overhead. |
| Agent-led research | Default `agent_led_research` is **`off`**. Optional modes are `scout_only` and `full_gated`; full gated agent-led work uses `scout → probe → develop → archived/passed`. | Change the value in `memory/MEMORY.md` and add budget/evaluator controls before running agent-led projects. |
| Parallelism | **Portfolio always on, intra-project parallelism on demand.** Multiple projects can be tracked, but project-internal multi-agent work starts only when decomposable, verifiable, and worth merge cost. | Make intra-project parallelism default, but add task queue, merge, budget, and evaluator machinery first. |
| Project state source | Global state is the Active Projects table in `memory/MEMORY.md`; per-project truth is `PROJECT_MEMORY.md`; project `index.md` is a navigation summary, not a state database. `HANDOFF.md` stays narrow. | Move state into a dashboard, CLI, issue tracker, or structured database after confirming Markdown tables are insufficient. |
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
| Literature scope | Bounded: 3–5 sources; 1–2 paper-wiki notes (minimal profile, AlphaEvolve first); no new topic page until ≥ 3 related notes; provenance of 2.63598844 must be verified or honestly flagged | Skip paper-wiki entirely (bib-only) or run a fuller packing-literature survey |
| Artifact-level review | Exactly two: mid-term hard-check review after the parallel round; final full review (hard checks + rubric + LLM critique) after `main.tex`. Reviewer = fresh read-only agent session; reports in project `Evaluations/` | Single final review, or per-round reviews (rejected: cost without new signal) |
| Leaf defaults | Full idea→project path via `ideas/`; lowercase project name; commits on `main` per round; `paper_skeleton.md` live from round 1, `main.tex` after stop condition; round wrap-up **not** skill-ified before round 3; two OS back-port batches | Each independently reversible; see Active Work items |

**pi product-shell decisions (2026-07-16, user-confirmed grilling session):**

| Decision | Default taken | To reverse |
|---|---|---|
| Product boundary | Keep plain Research OS files + Git as the source of truth; product surfaces are removable adapters, not a database-backed replacement | Introduce a new authoritative store only after defining migration, synchronization, and conflict semantics |
| MVP autonomy | Human initiates a bounded Research Run; agents may autonomously perform non-destructive intake, literature work, local code/experiments, project-memory updates, and Project Skill candidate creation. Destructive/external/publishing/paid/global-policy/Hub-promotion actions require approval. A baseline must precede at most two parallel Research Tasks under shared evaluation and stopping criteria | Expand autonomy only after a verified MVP run and a new human decision; reduce it by making intake or every experiment human-gated |
| First delivery | ~~Treat `bin/research-os` thin launcher as the first product delivery~~ **— superseded 2026-07-16:** the launcher is only a possible bootstrap slice. `os-build/build_phases/` must deliver the full Research OS MVP end-to-end acceptance loop defined in CONTEXT.md | Restore the launcher-only phase pack and accept that it does not prove intake, continuation, evaluation, experience capture, or handoff |
| Existing CLI gate | Narrow exception to D5/GOAL M4: the thin launcher is authorized without prior OS Feedback; heavier workflow CLI remains gated | Remove `bin/research-os` and restore the absolute no-CLI wording |
| GUI gate and shape | Existing `os-ui` stays read-only until one real project stage yields specific OS Feedback and the human reauthorizes execution. Then add a localhost-only Agent Console to the existing shell: TypeScript server + pi SDK + HTTP/SSE, with repository snapshots and live runtime state internally separated; no IDE, credential store, transcript DB, or remote access in the first GUI | Open the execution gate earlier only through a new explicit human decision; replace SDK with RPC if process isolation or a non-Node backend becomes required |
| Desktop future work | After the browser GUI stabilizes, evaluate one desktop wrapper rather than promise both; Electron is the initial candidate because pi SDK is Node-native, with Tauri + Node sidecar considered if its trade-offs become worthwhile | Select Tauri first if measured packaging/resource/security requirements justify the sidecar complexity |

**Orphan-skills decision (2026-07-04, user-set):**

| Decision | Default taken | To reverse |
|---|---|---|
| Orphan skills stay installed-only | The 2 skills present in `.claude/skills/` + `.agents/skills/` without a hub source (`session-handoff`, `skill-organizer`) are **intentionally not synced back to the hub**. `filetree-simple` was promoted to `research-skills-hub/open-paper-skills/` on 2026-07-17 and now follows D7's three-copy rule. The store UI shows the remaining orphans as `hub 无源`. | `install_research_skill.py sync-back <name> --from claude` for each remaining orphan, then remove this row |

**Direction decisions (2026-07-04, user-set):**

| Decision | Default taken | To reverse |
|---|---|---|
| End goal repositioned | Evolve the repo into an **agent-agnostic, agent-native Research OS** ([GOAL.md](os-build/GOAL.md)). This refines, not replaces, the 2026-07-03 positioning: the user's research practice stays first; machinery remains evidence-gated except for the explicitly recorded M0/M1, read-only monitor, and thin-launcher exceptions. | Delete `GOAL.md`, remove this row and the OS-evolution Active Work entry; the 2026-07-03 positioning rows stand unchanged |
| Document layering | **Superseded again 2026-07-16:** `os-build/GOAL.md` is the Long-term Research OS vision and strategic-governance layer; `os-build/build_phases/` is the Research OS MVP execution-contract layer; CONTEXT.md defines their shared language; INSTRUCTION/memory/actual artifacts remain operating truth. | Merge MVP implementation detail back into GOAL.md and remove the scoped execution layer |
| Monitor-UI gate opened (read-only only) | Human authorized a **read-only monitor UI** (2026-07-04 grilling session): `os-ui/` = Python generator → schema-versioned `state.json` (gitignored) → static Vite/React frontend; 3 pages (dashboard / project / skills store); derived status only (no heartbeat; slot reserved with lease semantics); store shelves hub skills only; install = copy command. Design in [os-ui/DESIGN.md](os-ui/DESIGN.md), visual spec in [os-ui/mockup.html](os-ui/mockup.html). **This supersedes GOAL.md M4's evidence precondition for the read-only monitor UI only** (GOAL.md M4 annotated accordingly); the execution surface, SSE/resident services stay behind M4 (evidence + per-item human confirmation). | `rm -rf os-ui/`, remove this row + the Active Work entry, and drop the M4 exception note in GOAL.md; the OS has no dependency on os-ui |

**Paper-wiki decisions (2026-07-07, user-confirmed):**

| Decision | Default taken | To reverse |
|---|---|---|
| Skill rename | `paper-library-manager` → **`paper-wiki-manager`** in `research-skills-hub/open-paper-skills/` and both installs (`.claude/skills/`, `.agents/skills/`); old skill removed everywhere; hub index/README, INSTRUCTION.md reference-intake, and README roadmap item checked off accordingly | `mv` the hub dir back, revert SKILL.md/schema/scripts naming, `install_research_skill.py remove paper-wiki-manager --yes` + reinstall old name, revert doc references |
| Wiki data root | ~~Keep `paper-library/` as the bundle root~~ **— superseded 2026-07-07 (user request): renamed to `paper-wiki/`.** Skill default root, config asset (now `assets/paper-wiki.toml`), validator script (now `scripts/validate_paper_wiki.py`), INSTRUCTION.md, README, the then-live task guides, and FILETREE.md were updated; wiki re-validated after the rename. The task guides were later merged into GOAL.md and deleted. | `mv paper-wiki paper-library` and revert the path/name updates in the skill and current docs |
| Concept entity pages | New third collection `paper-wiki/concepts/` with `type` ∈ Method/Dataset/Benchmark/Metric/Term/Tool; body needs `# Definition` + `# Papers`; create only for entities referenced by ≥ 2 papers, durable field-level entities, or on user request — **not** for a method only its own paper describes. Validator enforces fields, sections, `concepts/index.md`, and bidirectional paper↔concept links | Delete `concepts/` and revert the validator/schema/SKILL.md concept sections (single hub commit) |
| Paper→project links | Optional `# Used In Projects` paper-body section links a project's `index.md` (must end in `.md` — the validator skips bare-directory links); target existence checked, no project backlink required. The 2026-07-03 "Paper library boundary" decision stands: the wiki stores only the pointer, project-specific use stays in the project | Drop the section from schema/SKILL.md and remove any such sections from paper pages |
| Non-paper sources (2026-07-08) | Wiki gains a 4th collection `paper-wiki/sources/` for blogs/docs/talks, `type: Reference` (single type; `medium` is an optional field, not a type enum). `SOURCE_REQUIRED` = type/title/description/resource/tags/status/priority/timestamp; `authors`/`published`/`medium` optional; `resource` (URL) is identity; filename = title→kebab-slug (convention, unvalidated). Source→topic links are **one-way** (not bidirectional-enforced) — sources are a lighter tier than papers. New `synthesis-source` body profile (keyed on content type, so arXiv surveys use it too); default profile unchanged. Decided in a grilling session; validator branch negative-tested. | Delete `sources/`, revert the validator `SOURCE_REQUIRED`/branch/index-check, the schema.md Source Frontmatter section, the SKILL.md Source Documents section, and remove the `synthesis-source` profile from `paper-wiki.toml` |
| viz.html viewer redesign (2026-07-08) | **Collapse/expand knowledge map** replaces the flat force graph. Default view = topics/concepts only on a deterministic grid (stable across reloads) with paper counts; double-click or a detail-pane button fans a topic's papers locally; "Expand all" runs fcose; click highlights neighbors + dims rest; type legend filters; search reveals hidden papers. Graph libs (cytoscape, fcose + layout-base/cose-base, marked) are **vendored** in `scripts/vendor/` and inlined by `generate_viz.py` (`__VIZ_LIBS__` marker) so `viz.html` is fully offline. Viewer UI is English. Design settled in a grilling session; verified in-browser (0 label collisions collapsed). | Restore the old CDN-based flat-graph viewer from git (`scripts/static/viz.js`, template) and drop `scripts/vendor/` + the `_load_libs` injection |

**map-then-territory skill decisions (2026-07-17, user-confirmed grilling session):**

New skill `research-skills-hub/open-paper-skills/map-then-territory/` (installed to both
agent dirs). Motivation: the user knows an endeavor's start and destination but — lacking
the tech stacks — cannot draw the directed path between them; existing skills interrogate
plans (`grill-for-unknowns`) or record cognition (`human-cognition-cache`) but none
constructs the route. Nine decisions were grilled one-by-one and user-confirmed:

| Decision | Default taken | To reverse |
|---|---|---|
| Scope | Generic skeleton only (no domain vocabulary file); first territory = building the Research OS itself | Add a research-vocabulary reference file if cold-start cost proves high |
| Data model | Waypoint = verifiable **state** with a human-runnable acceptance check (never a task); edge = action + transition logic; map = DAG; waypoints typed `directional` / `executive`. Human owns the points, agent owns the lines | Switch to task-DAG nodes and rewrite references/map-schema.md |
| Teaching tiers | Directional waypoints taught **before** map approval (`tutorials/`); executive ones agent-autonomous, taught post-hoc on demand; all via `human-cognition-cache` | Teach everything pre-approval (slow) or everything post-hoc |
| Proposal mode | One trunk map + 2–3 contrasting options inline at each directional waypoint (resolved one at a time via `grilling`); full alternative maps only when the whole approach is contested, with declared rationale | Always produce multiple full candidate maps |
| Artifact | Markdown + Mermaid bundle is canonical, at the territory root (`maps/<slug>/` or `<project>/map/`); HTML views generated/disposable | Move the source of truth to HTML/JSON (rejected: diff/merge cost) |
| Prompt assembly | Auto-generated per edge via `writing-great-prompt` with provenance annotations (`<!-- ← N7.acceptance -->`); new-session-ready; human reviews prompts into directional waypoints only | Co-write every prompt by hand |
| Execution loop | Agent self-verifies → `delivered` + `agent_verdict` + evidence; human runs the same check → `human_verdict` → `verified` (human-only flip); deviations tiered (executive = detour + log, directional = stop and redraw); dead waypoints keep post-mortems; calibration ledger justifies later `spot-check` delegation by explicit dated human decision | Drop dual verification and trust agent self-reports |
| Dependencies | **Hard** dependency on `grilling`, `human-cognition-cache`, `writing-great-prompt` (no fallbacks) | Add graceful-degradation paths for use outside this repo |
| writing-great-prompt adoption | Was a fourth orphan skill (`.agents/`-only, postdating the 2026-07-04 orphan decision); synced **into the hub** and installed to both dirs because map-then-territory hard-depends on it | `install_research_skill.py remove writing-great-prompt --yes` and delete the hub copy (breaks map-then-territory) |

Post-build multi-agent review (4 lenses + adversarial verification) fixed state-machine
gaps before install: fail path for self-verification, edge reversion on verdict
disagreement, `ready` = prompt assembled + reviewed + source reached, bundle-status
vocabulary, Mermaid-update duty in the launch packet.

**Research OS route-map decisions (2026-07-17, os-build/map, user-confirmed):**

| Decision | Default taken | To reverse |
|---|---|---|
| MVP acceptance-scenario vehicle (map N3) | **circle_packing** carries the MVP acceptance scenario; paper-reproduction and synthetic scenarios rejected; the N10 final acceptance run uses a fresh Research Input Artifact to prove the loop is reusable beyond the vehicle | Directional deviation on N3: stop the N6–N9 lane, pick a new vehicle, redraw the map |
| MVP architecture path (map N4) | **Pure session protocol** — the MVP loop is carried by the rewritten `build_phases/` contract + existing skills, zero new machinery; the authorized thin-launcher arc stays dormant (GOAL M4 narrow exception retained, not scheduled); tutorial: `os-build/map/tutorials/N4-architecture-options.md` | Reopen N4; the launcher arc can restart anytime as a parallel adapter task without touching the MVP trunk |
| OS-construction tracking | `os-build/map/index.md` is the **single tracker** for OS-construction work; HANDOFF Active Work keeps a pointer only (plus the circle_packing authoritative checklist until project instantiation); launcher phase prompts archived to `os-build/build_phases/archive-launcher/` | Restore the two Active Work sections from git history, un-archive the phase prompts, and mark the map bundle `paused` |
| OS-build reference location | External repositories used to design and build the Research OS, together with their walk-through notes, live under `os-build/references/`; the former top-level `resource/` boundary is retired | Move `os-build/references/` back to `resource/` and restore all repository-owned links plus `FILETREE.md` |

**Navigation-index decisions (2026-07-17, user-confirmed):**

| Decision | Default taken | To reverse |
|---|---|---|
| FILETREE role and scope | `FILETREE.md` is an auto-generated, Git-independent cold-start map: five core files plus public top-level areas only. Every public top-level directory owns an English `index.md` summary of at most 20 words; true skill directories may fall back to `SKILL.md`. Hashes and nested inventory rows are removed. `filetree-simple generate` writes atomically; `lint` is read-only and runs from `verify.sh`. The canonical skill lives in `research-skills-hub/open-paper-skills/` and is synced to both installed copies. | Restore the previous detailed generator and manifest from Git history, then restore hash and nested-entry maintenance rules in `INSTRUCTION.md` and `verify.sh` |

## Deviations from the original plan

- **Build runs in place from `paper/`** — `main.tex` writes `paper/main.pdf` and reads
  `paper/references.bib`, avoiding repo-level reference-path assumptions.
- **Reference intake was bib-entry-only** for the smoke test (no PDF downloaded), pending D3.
- **History caveat:** the old change-summary (`git show d4edf3f:CHANGE_SUMMARY-2026-06.html`) lists
  commit hashes (`1157410`, `73ed6df`, …) that are **not** on the current `forfable` branch — the
  repo was re-committed since. Trust `git log`, never those frozen tables.
- **2026-07-03 design discussion was documented as durable operating policy**, not as a
  transcript. The full reasoning remains in the conversation; `INSTRUCTION.md` and
  `memory/MEMORY.md` carry the operational subset.

## Intentionally not done

- **README roadmap features** (read_paper workflow, group-meeting workspace, CLI,
  deterministic-read bash hooks) — roadmap, not normalization; several need explicit
  confirmation. The paper-wiki item was implemented 2026-07-07 (see Paper-wiki decisions).
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
