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

### Research OS construction — status (route map deleted 2026-09-23)

The route map `os-build/map/` and the execution-contract slot
`os-build/build_phases/` were deleted by Human Owner decision on 2026-09-23
(see "Route-map deletion" under Decisions); their last version is
`git show 0f1805c:os-build/map/index.md`. Construction status lives here again:

- **Done:** installer generalization (GOAL M3, 2026-07-22); `research-project-manager`
  (2026-09-23; its acceptance is still to be run by the Human Owner, see Next
  session); Paper_VAE removal recorded (D10); [`os-harness/`](os-harness/README.md)
  (2026-09-26, ADR-0003): Claude Code and Codex adapters on the Human Owner's
  subscriptions, verified by 17 offline tests and live runs of both CLIs.
- **Governance debt (M0):** both items met: Paper_VAE recorded in D10; D4's stale
  `OS_INTRO.html` wording fixed 2026-09-23.
- **Not started:** adapter contract (GOAL M1).
- **Cancelled 2026-09-27:** the planned `circle_packing` first real project (an
  eleven-step checklist from the 2026-07-03 grilling session, never instantiated).
  The Human Owner kept `Example_Project` and `nanochat_cpu` as the two example
  projects, then deleted `Example_Project` on 2026-09-29, leaving `nanochat_cpu`
  as the only one; the checklist's last version is in Git history
  (`git log -S circle_packing -- HANDOFF.md`), and the kickoff decisions stay in
  Decisions, marked cancelled.
- **H2 root agent, awaiting Human Owner acceptance (2026-09-26; acceptance run
  moved 2026-09-29):** the `project-dispatch` skill and harness
  `--detach`/`stop`/status (ADR-0004). Its acceptance run is now `nanochat_cpu`'s
  dispatch, session `20260926-202021-claude-2302` (next item), because the Human
  Owner deleted `Example_Project` (see "Example-project decision"). The earlier
  run there, session `20260926-195626-claude-5ed5`, extended Example_Project to a
  20-seed stability analysis and ended `ok` after 86 s; the project's last version
  is at Git `2523ae9`. H3 (trace reflection) waits for this acceptance.
- **New project `nanochat_cpu`, delivered and awaiting Human Owner acceptance
  (2026-09-26):** OpenResearch's default nanochat demo as a runnable example for
  every Research OS user (idea `ideas/nanochat-cpu-baseline.md`). The root agent
  created and registered it and dispatched the work as session
  `20260926-202021-claude-2302` (three turns: the Human Owner twice narrowed the
  scope, from a ~30-minute d2 baseline to a ~3-minute d1 example). Delivered: the
  port with documented changes, `bash runs/runcpu_small.sh all` (tokenizer,
  pretraining, eval, SFT, chat, two probes, summary), READMEs in both languages,
  figures, results, and the Progress Log. Root-agent review: the command re-run
  by the root agent finished in 155 s with val bpb identical to the README, no
  change outside the project, 70 small files, ~0.95 GB on disk, portfolio row
  re-synced, `verify.sh` passing except the known symlink check. Creating the
  project exposed a Windows bug in `research-project-manager` (`new` wrote
  backslash links; 2 of 19 tests failed), fixed with `rel_link()`. On 2026-09-29
  it gained a short paper (`paper/main.pdf`) and became the only example project;
  accepting it also completes H2.
- **Superseded 2026-09-26:** the Pi Coding Agent file-workflow MVP (ADR-0002),
  stalled since 2026-07-19 without a human-verified run. The Human Owner replaced
  it with the subscription-CLI harness route (ADR-0003; see "Agent-harness
  decisions"). GOAL.md was revised the same day to the H1–H3 route.
- **Gated, not scheduled:** third-agent cold start (a sufficient M3 trigger) and
  the custom execution surface (M4), both defined in GOAL.md.

Historical section text: git history of this file.

### os-ui — read-only monitor UI (completed 2026-07-05)

The read-only monitor is delivered and verified. Its governing design is
[os-ui/DESIGN.md](os-ui/DESIGN.md), usage and launch instructions are in
[os-ui/README.md](os-ui/README.md), and completed implementation detail belongs
to Git history. Run it with `./os-ui/start.sh` (or `--watch`). Future execution
features remain behind the GOAL.md M4 evidence gate. Agents are currently driven
through [`os-harness/`](os-harness/README.md) (ADR-0003), not this browser UI.
2026-09-26: `state.json` and the Paper Wiki iframe are now loaded by relative
paths, so `npx vite build --base=./` produces a bundle that runs from any
origin; a snapshot was published as a private claude.ai artifact for the Human
Owner's remote viewing (link in the session, not in the repository). The Paper
Wiki viewer (4 MB) is replaced by a placeholder in that snapshot.
2026-09-27: at the Human Owner's direction (“尽量少的用文字，尽量用视觉元素来呈现信息。
用户如果想看详情的话，点击才可以就可以看到”), Dashboard and Project Overview were
rebuilt glance-first: stage bars, chips, progress bars, count tiles, and an
activity timeline, with every sentence behind a click (DESIGN.md §4). Checked
at desktop and phone widths with no text overflow.

### os-ui desktop client (built 2026-10-10, awaiting checks)

The Human Owner asked for the OS as a client for macOS, Linux, and Windows
(see "Desktop client decisions" below). Built in [`os-ui/client/`](os-ui/client/README.md);
plan and settled design in [os-ui/client/DESIGN.md](os-ui/client/DESIGN.md), record in
[ADR-0005](docs/adr/0005-desktop-client.md). Verified in the cloud session on Linux
x64: 90 client unit tests, 56 endpoint tests (`os-ui/frontend`, `npm test`), the
11-test Playwright E2E suite under Xvfb, `.deb` and AppImage packaging, and the
packaged app's smoke run.

- [ ] P5: [`desktop.yml`](.github/workflows/desktop.yml) passes on its pull request
      for all six rows (linux/macos/windows × x64/arm64), and `ci.yml`'s new
      `os-ui endpoint tests` step passes. All rows passed at `595c3d8`; the final
      review's fixes landed after it. Next action: read the run on the PR's head;
      fix or report.
- [ ] P6: the Human Owner runs the README checklist
      ([Check it on your machine](os-ui/client/README.md#check-it-on-your-machine)) on
      each OS with a real Claude Code or Codex login. Acceptance: every box ticked,
      or a failure reported with `main.log`.
- [ ] GOAL.md M4 annotation, for the Human Owner to confirm as one item (agents may
      not edit GOAL.md alone): after the 2026-07-22 slice paragraph, add
      "2026-10-10 Human Owner 授权 desktop wrapper（os-ui/client，ADR-0005），并就此项
      免除 H2 使用证据前提；它与 dev server 共用同一组端点，随应用退出而消失。"

### Next session

- Focus: the Human Owner accepts or revises the `nanochat_cpu` example, including
  its short paper; accepting its 2026-09-26 dispatch run also completes H2
  (evidence in the project's Progress Log, `Code/README.md`, and `paper/main.pdf`).
  No project is queued after it; the next OS milestone is H3. On acceptance, append
  `(accepted <date>)` to that Progress Log bullet; then H3 (trace reflection) is
  next per GOAL.md.
- Environment facts found on 2026-09-26 (Human Owner's machine, not repository
  state). The Human Owner updated the global `codex` from 0.142.4 to 0.157.1, which
  runs the configured model `gpt-5.6-luna`. Both Codex logins are ChatGPT `free`.
  Codex's Windows sandbox is `ready` in `~/.codex` but `updateRequired` in the
  `CODEX_HOME` that Orca sets for sessions it launches, so a harness started
  inside Orca needs `--mode full` for Codex.
- Also pending: the desktop client's P5 and P6 checks and the GOAL.md M4
  annotation (Active Work, "os-ui desktop client"). Its installers are CI
  artifacts of `desktop.yml`; publishing them stays unauthorized.
- Also pending: the Human Owner has not yet run the `research-project-manager`
  acceptance: `./verify.sh` shows `OK project contract`, and the skill's `status`
  and `validate` commands report `nanochat_cpu` registered with no errors.
- Authority: the Active Work section above is the construction-status record;
  Decisions hold the reasons and reversal paths.
- Suggested skills: `session-handoff` for this file; `research-project-manager`
  for project state.

## Decisions

Defaults taken during the normalization task (2026-06-12) and its follow-ups, each reversible.

| ID | Decision | Default taken | To reverse |
|---|---|---|---|
| D1 | Restore the `CLAUDE.md` pointer (a prior commit had removed it as "redundant")? | ~~**Restored** the one-line pointer to INSTRUCTION.md~~ **— superseded 2026-09-23 (commit 840cdaa):** `INSTRUCTION.md` content moved into `AGENTS.md`; `CLAUDE.md` and `INSTRUCTION.md` deleted, relying on Claude Code reading `AGENTS.md` natively | Delete `CLAUDE.md` and rely on Claude Code reading `AGENTS.md` — confirm your version does so |
| D2 | Template directory casing | ~~`Paper_Initial_template`~~ **— superseded 2026-06-17:** renamed to **`ai_research_template`** (all-lowercase) | `git mv` back and update README / AGENTS.md / the index files, then regenerate FILETREE.md |
| D3 | Track reference PDFs in git? | Status quo (tracked if added); none added yet | Add `References/*.pdf` to `.gitignore` |
| D4 | HTML as the format for operating docs | **— superseded 2026-06-17 and narrowed later:** `HANDOFF.md` is the durable Markdown hand-off record; `OS_INTRO.html` was deleted in commit 784f9e8, so Markdown is the only operating-doc format | Convert hand-off records back to HTML (not recommended — Markdown is cheaper to read/edit/grep/diff) |
| D5 | Build a CLI? | **No** — non-goal; conventions + skills suffice at this scale | Revisit only with explicit confirmation if navigation becomes slow |
| D6 | Keep `Example_Project/`? | ~~**Kept** as living documentation under `projects-folder/Example_Project/`~~ **— superseded 2026-09-29:** deleted by the Human Owner; see "Example-project decision" | Restore it with `git checkout 2523ae9 -- projects-folder/Example_Project`, then re-register it with `research-project-manager sync` |
| D7 | `.agents/skills` vs `.claude/skills` (vs hub) duplication | ~~Three identical copies kept in sync by a documented rule~~ **— superseded 2026-07-22 by the M3 authorization below.** Installs are now **mixed**: skills from Human-Owner-authored collections are **symlinked** to the hub (editing the installed path edits the hub, so drift is impossible); skills from vendored collections are **copied**, and any collection declared an auto-refreshed read-only mirror (`mattpocock-skills`) **must** stay copied so the copy acts as a version pin. Targets are table-driven, not the hardcoded two directories, so `.claude/skills` and `.agents/skills` are no longer required to be byte-identical | Revert `research-skill-installer` to copy-only into two hardcoded directories, restore the three-copy rule here and in AGENTS.md, and restore the four `diff -rq` checks in `verify.sh` |
| D8 | Where do instantiated projects live? | `projects-folder/<ProjectName>/`; reusable templates in `projects-folder/templates/<TemplateName>/` | Move projects back to the repo root and revert links + FILETREE rows |
| D9 | Structured (YAML/JSON) indexes? | **No** — Markdown tables are grep-able and token-cheap | Add YAML front-matter later if tooling needs to parse indexes |
| D10 | `Paper_VAE` project status | **Temporarily removed by the Human Owner on 2026-07-19.** It is not an active or exempt Research OS project. Restoring it requires a new Human Owner decision; before active use it must be registered in `memory/MEMORY.md` and gain `PROJECT_MEMORY.md` | Restore the deleted path from its own/Git history, explicitly authorize its return, then register and initialize it before treating it as active |

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
| What is this OS primarily? | Treat it as a **file-system-native environment for long-horizon human-agent research**. The human user's own research practice is primary; reusable open-source templates are a byproduct; product/platform possibilities stay future-compatible but do not drive current complexity. | Reposition README/AGENTS.md around an external product or template-first project, then revisit CLI/UI/database needs explicitly. |
| Paper library boundary | Shared paper understanding lives in `paper-wiki/papers/` and `paper-wiki/topics/`; project-specific use of a paper lives in the project (`references.bib`, `paper_skeleton.md`, `PROJECT_MEMORY.md`). | Allow full project-local copies of paper notes, accepting duplicate-note drift. |
| Topic pages | Topic pages are lightweight synthesis and research roadmaps, not mere tags or exhaustive surveys. | Downgrade topics to index-only pages, or promote them into full survey documents with a separate maintenance policy. |
| Experience promotion | Project-only facts stay in project memory; cross-project principles go to global memory; repeatable procedures become skills only when another project agent can execute them without local context. | Skill-ify more aggressively, accepting skill-library churn and validation overhead. |
| Agent-led research | Default `agent_led_research` is **`off`**. Optional modes are `scout_only` and `full_gated`; full gated agent-led work uses `scout → probe → develop → archived/passed`. | Change the value in `memory/MEMORY.md` and add budget/evaluator controls before running agent-led projects. |
| Parallelism | **Portfolio always on, intra-project parallelism on demand.** Multiple projects can be tracked, but project-internal multi-agent work starts only when decomposable, verifiable, and worth merge cost. | Make intra-project parallelism default, but add task queue, merge, budget, and evaluator machinery first. |
| Project state source | Global state is the Active Projects table in `memory/MEMORY.md`; per-project truth is `PROJECT_MEMORY.md`; project `index.md` is a navigation summary, not a state database. `HANDOFF.md` stays narrow. | Move state into a dashboard, CLI, issue tracker, or structured database after confirming Markdown tables are insufficient. |
| Evaluator | Use one evaluator protocol for human-led and agent-led research: hard checks + rubric scoring + LLM critique. Final judgment targets complete artifacts, not empty ideas. | Replace with a lightweight LLM-only judge, accepting weaker guarantees on reproducibility and traceability. |

**circle_packing kickoff decisions (2026-07-03, grilling session) — cancelled 2026-09-27:**
the Human Owner dropped the project (“我只需要保留 Example Project 和 Nano Chat 这两个
Project 作为示例就可以了。Circle Packing 我觉得可以删除”). The rows below are history; the
evaluator, autonomy-boundary, and OS-feedback conventions they define stay available to any
future project through the template and CONTEXT.md.

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
| Product boundary | **Superseded 2026-07-18:** plain Research OS files remain authoritative, but Git is optional enhancement rather than a prerequisite. Without Git the OS still owns Audit Events, Checkpoints, hashes, text diffs and limited recoverable before-images; product surfaces remain removable adapters | Require Git for all projects, or introduce another authoritative store only after defining migration, synchronization and conflict semantics |
| MVP runtime | **Superseded 2026-07-19:** use Pi Coding Agent's existing interactive TUI as the workflow shell. Research OS files own durable project/task/checkpoint/review state. Phase 01 was successfully exercised, but its uncommitted `os-runtime/` implementation was intentionally deleted so it cannot distract from the current route | Reopen embedded SDK/custom TUI only after studying the selected reference projects, workflow evidence identifies a concrete enforcement/recovery/session-management need, and the Human Owner makes a new decision |
| MVP autonomy | One Human Owner approves a file-based Run Contract for one Project + one Research Task at a time and keeps Pi's terminal open. The run is human-supervised and bounded by procedure plus review; it never implies deterministic permission/budget enforcement or automatic acceptance | Expand to unattended/custom-runtime autonomy only after the single-project workflow pilot and a new directional decision |
| First delivery | **Superseded 2026-07-19:** the first proof is a Pi Coding Agent file-workflow smoke test on `projects-folder/Example_Project/`, ending in declared validation, a Research Checkpoint, a Review Package, and transcript-independent takeover | Restore SDK/custom-TUI delivery only through a map redraw; deleted launcher prompts are historical and recoverable from Git, not an equivalent proof |
| Learning contract | Start with Markdown, file contracts, Pi's existing UI, and the project's Python validation. TypeScript/Pi SDK learning resumes only after the workflow is understood and a specific runtime mechanism is needed | Resume the seven SDK slices now and accept coupling product discovery to a steep TypeScript/event-driven learning path |
| GUI gate and shape | Existing `os-ui` remains read-only. Current execution uses Pi's existing terminal UI; any custom TUI, localhost GUI/server, or desktop wrapper waits for workflow evidence and a new Human Owner decision **— 2026-10-10:** the live os-ui is also an Electron desktop client (`os-ui/client/`, ADR-0005); see "Desktop client decisions" | Promote a custom UI into MVP and accept runtime/transport complexity before the file workflow is proven |
| Desktop future work | After the browser GUI stabilizes, evaluate one desktop wrapper rather than promise both; Electron is the initial candidate because pi SDK is Node-native, with Tauri + Node sidecar considered if its trade-offs become worthwhile **— resolved 2026-10-10:** Electron was built (`os-ui/client/`, ADR-0005); Tauri was weighed again and rejected | Select Tauri first if measured packaging/resource/security requirements justify the sidecar complexity |

**Orphan-skills decision (2026-07-04, user-set):**

| Decision | Default taken | To reverse |
|---|---|---|
| Orphan skills stay installed-only | The 2 skills present in `.claude/skills/` + `.agents/skills/` without a hub source (`session-handoff`, `skill-organizer`) are **intentionally not synced back to the hub**. `filetree-simple` was promoted to `research-skills-hub/open-paper-skills/` on 2026-07-17 and now follows D7's three-copy rule. The store UI shows the remaining orphans as `hub 无源`. | `install_research_skill.py sync-back <name> --from claude` for each remaining orphan, then remove this row |

**Direction decisions (2026-07-04, user-set):**

| Decision | Default taken | To reverse |
|---|---|---|
| End goal repositioned | Evolve the repo into an **agent-agnostic, agent-native Research OS** ([GOAL.md](os-build/GOAL.md)). This refines, not replaces, the 2026-07-03 positioning: the user's research practice stays first; machinery remains evidence-gated except for explicitly recorded M0/M1, the read-only monitor, and the current Pi Coding Agent file-workflow MVP. The former thin-launcher exception is superseded and its prompts are deleted. | Delete `GOAL.md`, remove this row and the OS-evolution Active Work entry; the 2026-07-03 positioning rows stand unchanged |
| Document layering | **Superseded again 2026-07-16:** `os-build/GOAL.md` is the Long-term Research OS vision and strategic-governance layer; `os-build/build_phases/` is the Research OS MVP execution-contract layer; CONTEXT.md defines their shared language; INSTRUCTION/memory/actual artifacts remain operating truth. | Merge MVP implementation detail back into GOAL.md and remove the scoped execution layer |
| Monitor-UI gate opened (read-only only) | Human authorized a **read-only monitor UI** (2026-07-04 grilling session): `os-ui/` = Python generator → schema-versioned `state.json` (gitignored) → static Vite/React frontend; 3 pages (dashboard / project / skills store); derived status only (no heartbeat; slot reserved with lease semantics); store shelves hub skills only; install = copy command. Design in [os-ui/DESIGN.md](os-ui/DESIGN.md), visual spec in [os-ui/mockup.html](os-ui/mockup.html). **This supersedes GOAL.md M4's evidence precondition for the read-only monitor UI only** (GOAL.md M4 annotated accordingly); the execution surface, SSE/resident services stay behind M4 (evidence + per-item human confirmation). | `rm -rf os-ui/`, remove this row + the Active Work entry, and drop the M4 exception note in GOAL.md; the OS has no dependency on os-ui |

**Skill-management decisions (2026-07-22, user-confirmed in a grilling session):**

| Decision | Default taken | To reverse |
|---|---|---|
| M3 gate opened, trigger condition amended | GOAL.md M3's trigger read "a real third agent passes the M1 cold start and needs hub skills". That was the only scenario foreseen when the clause was written; the actual driver is cross-project skill management, unrelated to a third agent. The Human Owner **amended the trigger** to "two or more install targets need unified management" rather than recording an override, so the archive states the real reason. Third-agent onboarding remains a sufficient trigger, no longer a necessary one | Restore the original M3 trigger text in `os-build/GOAL.md` and re-mark N11 as `proposed` in `os-build/map/index.md` |
| Install form is mixed, decided by source | **symlink** for collections the Human Owner authors and iterates (`open-paper-skills`) plus manually cherry-picked static vendored ones (`collected-skills`, `science-skills`, `claude-science-skills`) — 15 installed skills; **copy** for any collection declaring itself an auto-refreshed read-only mirror (`mattpocock-skills`, weekly CI `rsync --delete` per ADR 0001) — 6 installed skills. Rationale: a copy is a version pin, and only auto-refreshed mirrors move underneath you. Considered and rejected: asm's stricter "copy everything external" rule, since the three static vendored collections have 1–5 commits each and no automatic overwrite path | Set every collection to copy and restore D7's three-copy rule |
| Install targets are table-driven | Repo `.claude/skills` + `.agents/skills`; the three global directories that were verified to exist on 2026-07-22 — `~/.claude/skills`, `~/.codex/skills`, `~/.agents/skills` (2, 1, and 2 pre-existing skills respectively, none of them hub-sourced); and each `projects-folder/<Project>/` agent directory. In-repo targets use **relative** symlinks (committable); `~/` targets use **absolute** symlinks (outside Git anyway). **Known weak evidence:** there is exactly 1 project and 0 project-level skill installs today, so the project-target rows are built ahead of demonstrated need — the Human Owner accepted this after being shown the counts | Shrink the target table to the two repo directories; the installer is table-driven, so no code changes |
| Scope is this repository | The Research OS being built **is this repository**. Other directories under the same parent folder (`Research_folder/`) are not Research OS projects, are not in `projects-folder/`, and stay out of the installer's target table — confirmed by the Human Owner on 2026-07-23. Two of them keep their own copies of some hub skills; that duplication is knowingly left alone. Reaching them would require machine-local absolute paths that cannot be committed, so it would mean adding a `~/.config`-style local override the repository does not otherwise need. Do not treat this as pending work | Add the local override file and the extra target rows, and record a new authorization here first |
| `sync-back` deleted | The command's only purpose was promoting edits from an installed copy back to the hub. Symlinked skills need no promotion (the installed path *is* the hub); copied skills are the auto-refresh mirror, which ADR 0001 forbids editing in place. The two cases are exhaustive, so `sync-back`, `--force`, the digest comparison, and the conflict-stop logic all go | Restore the removed functions from Git history |
| M4 opened one narrow slice only | `os-ui` may disable/enable a skill **per install location**, and nothing else. A **copied** install renames `SKILL.md` ↔ `SKILL.md.disabled` (asm's mechanism); a **symlinked** install moves its link into the target's `.disabled/` directory. No skill content is created or deleted either way, and the toggle is offered only where an install already exists — installing stays a copied command. The write channel is a **Vite dev-server middleware** that shells out to the installer, alive only while `start.sh` runs, so DESIGN.md §2's "no resident daemon" invariant is untouched **— 2026-10-10:** the endpoint logic moved to `os-ui/frontend/server/`; the desktop client serves it too, and it still dies with its process | Remove the plugin from `os-ui/frontend/vite.config.ts` and the toggle from the store page; revert the DESIGN.md §1/§8 and GOAL.md M4 edits |
| Disable mechanism for symlinks — two rejected, one tested | Renaming `SKILL.md` inside a symlinked install writes through to the hub and disables every location at once. Deleting the link makes "disabled here" and "never installed here" identical, so re-enabling becomes an install — outside the M4 authorization. Renaming the link in place to `<name>.disabled` was **implemented and then disproved on 2026-07-23**: Claude Code re-registered the skill under the new directory name and it stayed callable, because discovery keys on the directory name, not on frontmatter. The `.disabled/` directory that replaced it was verified on **both** agents — the skill left Claude Code's live listing and returned when restored, and Codex did not list it after a restart. Dot-directory skipping is as undocumented as symlink following; re-test after an agent upgrade | Set the affected agent's targets to `copy`, whose `SKILL.md.disabled` rename is independent of directory-name behaviour |
| asm not adopted as a dependency | Only its ideas are reused. Investigation found the opening premise wrong: **asm does not install via symlink** — `asm install` copies, and `asm link` is a development-only live-reload tool. Its "pretty interface" is an Ink **terminal** TUI plus a public web catalog for browsing 4,300+ registry skills, not a local install GUI. Its own doctrine, "the CLI is the primary interface for agents and automation", matches this repo's direction. Also adopted: discovery-by-scanning instead of an install manifest | Not applicable — nothing was vendored |
| Symlink-following premise — **tested, holds** | Whether an agent follows a **symlinked** skill directory is undocumented; the official skills documentation never mentions symlinks. Tested 2026-07-22 on a `filetree-simple` pilot: the Human Owner confirmed **both Claude Code and Codex** see and execute the skill through the link. Also verified mechanically: no dangling links; `SKILL.md` readable at all 42 install paths; scripts run through the link, including `paper-wiki-manager`'s validator, which locates `assets/`, `templates/`, `vendor/`, and `static/` via `__file__` and passes. Git records the installs as `mode 120000` with relative targets, so a fresh clone resolves them. Re-test after any agent upgrade — this is implementation behavior, not a documented contract | If an agent stops following symlinks, set that agent's targets to copy in the target table |

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
| MVP architecture path (map N4 → N13 → N15) | ~~Pure session protocol~~ → ~~embedded Pi SDK + custom TUI~~ → **Pi Coding Agent existing TUI + file workflow (2026-07-19).** N13's Phase 01 succeeded technically, but the Human Owner's learning evidence showed the sequence was too steep. N4/N13 and dependent paths remain dead history. **Superseded 2026-09-26 by the subscription-CLI harness (ADR-0003; see Agent-harness decisions)** | Reopen SDK/custom runtime as a directional deviation only after workflow evidence; preserve both earlier paths and redraw dependents rather than silently restoring either |
| Workflow smoke test (map N17; old N14 dead) | Before circle_packing, prove the file workflow on `projects-folder/Example_Project/` by extending its reproducible single-seed line fit to multi-seed stability and returning declared validation, a Checkpoint, and a Review Package through Pi Coding Agent | Pick another low-risk project only through a directional map revision with equivalent executable validation and transcript-independent takeover |
| Smoke test vs first real project | `projects-folder/Example_Project/` is the low-risk workflow smoke test. The first real research project is `circle_packing`, reimplemented from the task specification under `os-build/references/EurekAgent/examples/circle_packing/` without copying AGPL code | Change either role only through a directional map revision, preserving an equivalent low-risk smoke test before the real project |
| OS-construction tracking | ~~`os-build/map/index.md` is the **single tracker** for OS-construction work (plus the circle_packing authoritative checklist until project instantiation); HANDOFF Active Work keeps a pointer only~~ **— superseded 2026-09-23:** the map was deleted and construction status returns to HANDOFF Active Work (see "Route-map deletion" below). On 2026-07-19 dead launcher/session/SDK prompts, an obsolete uncommitted tutorial, and an unreferenced proposed design report were deleted from `os-build/`; Git retains tracked history, while the tutorial is intentionally unrecoverable | Restore selected tracked files with `git show` only if a concrete audit or route revision needs them; do not reintroduce the whole historical tree by default |
| OS-build reference location | External repositories used to design and build the Research OS, together with their walk-through notes, live under `os-build/references/`; the former top-level `resource/` boundary is retired | Move `os-build/references/` back to `resource/` and restore all repository-owned links plus `FILETREE.md` |

**Navigation-index decisions (2026-07-17, user-confirmed):**

| Decision | Default taken | To reverse |
|---|---|---|
| FILETREE role and scope | `FILETREE.md` is an auto-generated, Git-independent cold-start map: five core files plus public top-level areas only. Every public top-level directory owns an English `index.md` summary of at most 20 words; true skill directories may fall back to `SKILL.md`. Hashes and nested inventory rows are removed. `filetree-simple generate` writes atomically; `lint` is read-only and runs from `verify.sh`. The canonical skill lives in `research-skills-hub/open-paper-skills/` and is synced to both installed copies. | Restore the previous detailed generator and manifest from Git history, then restore hash and nested-entry maintenance rules in `AGENTS.md` and `verify.sh` |

**Project-management decisions (2026-09-23, user-confirmed grilling session):**

New skill `research-skills-hub/open-paper-skills/research-project-manager/`, symlinked into
both repository agent directories (map waypoint N19 and edge E24 were added, then deleted
with the map the same day). Motivation: the README roadmap
item dates from the original TODO list; instantiation was a four-step manual procedure written
in two places; `Example_Project`'s Snapshot had drifted from the template (six labels missing,
`stage: smoke-test` outside the vocabulary); and the installer, the os-ui generator, and the
template contract each held their own definition of "project". Sixteen decisions were grilled
in three rounds and user-confirmed:

| Decision | Default taken | To reverse |
|---|---|---|
| Timing | Built now, before `circle_packing`; its instantiation is the skill's first real use (precedent: N18 built ahead of demonstrated need) | Delete the skill and restore the manual four-step contract in `projects-folder/templates/index.md` from Git |
| Operation set | `new`, `status [--json]`, `validate`, `set`, `sync`, `archive`. No `remove`: deleting a project stays a Human Owner git operation plus a row here, as with Paper_VAE. No `upgrade`: `validate` reports missing fields and the agent fills them by hand | Add the command; `remove` needs its own authorization row here first |
| Definition of a project | A directory directly under `projects-folder/` (never `templates/`) containing `PROJECT_MEMORY.md`; registered = has an Active Projects row. `validate` errors on unregistered (directory, no row), phantom (row, no directory), and stray (directory, no `PROJECT_MEMORY.md`) | Edit `[projects]` in the skill's `assets/project-contract.toml` |
| State source vs projection | Refines the 2026-07-03 "Project state source" row: where the Active Projects columns overlap the Snapshot (Owner, Stage, Priority, Status, Evaluator, Next action), the `PROJECT_MEMORY.md` Snapshot is the source and the row is a projection written by `sync`; `validate` reports `row_drift`. No new registry file, so D9 stands | Make the table primary: invert `sync` and drop `row_drift` |
| Interface form | `SKILL.md` plus one stdlib Python script with `--json`, the same shape as `research-skill-installer`. D5 ("no CLI") is untouched: it rejects a repository-wide CLI product, and skill-bundled scripts are the established plugin form; the script runs under any agent | Reduce the skill to a `SKILL.md`-only procedure |
| Contract location | `assets/project-contract.toml` holds required files, Snapshot fields with their table columns, and the stage/owner vocabularies; `validate` checks the contract against every template so the two cannot drift silently | Derive the contract from the template at run time |
| Idea promotion | `new --from-idea` sets the idea's `status: promoted` and `project:` back-link in the same run; `validate` checks the link both ways. Capturing or listing ideas stays outside this skill (`research-ideas-manager` remains a roadmap item) | Drop `--from-idea`; promotion becomes a manual frontmatter edit again |
| `archive` semantics | Stage `archived`; the directory and the Active Projects row stay (the template already enumerated `archived`, and the GUI needs no change). Moving directories was rejected because every `../../` link inside a project would break | Add an `## Archived Projects` table together with the generator swap below |
| Write-operation boundary | `set`, `sync`, and `archive` touch only Snapshot bullets and the portfolio row; the agent writes Progress Log and Key Decisions entries. `sync` never deletes a phantom row | Auto-append dated log lines |
| `validate` placement | Fourth check in `verify.sh`; AGENTS.md completion checks now include `projects-folder/`; SKILL.md positions it as the structural slice of CONTEXT.md's Project Integrity Gate (CONTEXT.md unchanged; Write Lease not implemented). Errors: missing file, missing Snapshot label, vocabulary, unregistered/phantom/stray, idea back-link, row drift, contract-template mismatch. Warnings: empty field, missing `projects-folder/index.md` bullet | Remove the `verify.sh` check and keep the command standalone |
| What `new` does | Copies the template, fills Project name / Started / Owner / Stage / Priority / Goal / Origin, adds the row, adds a `projects-folder/index.md` bullet, promotes the idea. It leaves agent directories to the installer, environments to `uv-env`, protection rules to the project, commits to the session; no submodule or external-repository import | Extend `new` with the corresponding flags |
| GUI boundary | `os-ui` stays read-only for projects, with no stage toggle. `status --json` keys mirror `state.json` (`portfolio`, `projects`, `unregistered_projects`) so the generator can later consume the script's output the way it consumes the installer's. Trigger for that swap: `circle_packing` instantiated through the skill, i.e. the output has run on two or more projects | Open a project write slice in os-ui under a new M4-style authorization row |
| Example_Project drift | Repaired in this session: six missing Snapshot labels added, Stage set to `probe` with the smoke-test role moved into Status and Origin, row re-projected by `sync`. The stage vocabulary is unchanged | Add `smoke-test` to `[vocabulary].stage` (rejected: an OS role is not a research stage) |
| Tracking | ~~Map waypoint N19 (executive) with edge E24 N19 → N6~~ **— superseded the same day by the route-map deletion**; the README roadmap item is ticked; `memory/MEMORY.md` has a Key Decisions row; `human/PROFILE.md`'s idea-to-project workflow points at the skill; the skill's acceptance is listed under Next session | Remove the pointers; the skill works without them |
| Verification | 19 stdlib unit tests on a temporary repository fixture; three injected faults (row removed, phantom row, `stage: smoke-test`) each made `./verify.sh` fail on `project contract` and were reverted byte-for-byte; `new`/`set`/`archive` exercised on a scratch copy of the repository, never in the working tree | n/a |

**Route-map deletion (2026-09-23, Human Owner decision after an evidence review):**

`os-build/map/` (the index and three never-run prompts) and `os-build/build_phases/`
(a one-file placeholder) were deleted; last version `git show 0f1805c:os-build/map/index.md`.
Evidence put to the Human Owner: of 20 waypoints only the start was verified; N15 had waited
for human verification since 2026-07-19; ten approved waypoints never started; the three
`ready` prompts were never executed and referenced the deleted `INSTRUCTION.md`; and no work
had moved through the map since 2026-07-23, while the OS work of that period (AGENTS.md
consolidation, the daily paper routine, `research-project-manager`) came from grilling
sessions and reached the map only after the fact. Three options were presented without a
recommendation (delete all; delete `build_phases/` and prune the map; keep and fix
references); the Human Owner chose delete all.

| Decision | Default taken | To reverse |
|---|---|---|
| Where construction status lives | HANDOFF Active Work again, as before 2026-07-17; GOAL.md keeps direction, milestones, and gates; ADRs keep architecture decisions | Restore the map from `0f1805c` and re-point AGENTS.md, GOAL.md §5, and Active Work at it |
| Waypoint IDs in older text | `N*` / `E*` identifiers in earlier decision rows, deviations, ADR-0001, and GOAL.md §5 refer to the deleted map and are left as written | Not applicable; `git show 0f1805c:os-build/map/index.md` resolves any ID |
| Idea ledger | The Human Owner's verbatim idea fragments from the map are preserved in the table below | Delete the table |
| `map-then-territory` skill | Stays in the hub and installed; the Research OS itself no longer has a live map bundle | Draw a new map only by a new Human Owner decision |
| Open route question | Whether the Pi Coding Agent file-workflow MVP (ADR-0002) continues was **not** decided by the deletion; it is recorded under Active Work and Next session as pending. **Resolved 2026-09-26:** replaced by the harness route (see Agent-harness decisions) | n/a |

Idea ledger carried over from the deleted map (verbatim; dispositions name the deleted map's nodes):

| ID | Idea (verbatim) | Original disposition |
| --- | --- | --- |
| I1 | “我打算用pi agent SDK来作为运行时来运行我的research OS” | N13、E16 |
| I2 | “这样不管对任何项目进行科研，都只需要打开这个Research OS的根目录，就可以统领全局。” | N13、N14 |
| I3 | “这个过程，当人类休息或者睡觉的时候，我在想可不可以让Agent自主地进行研究？” | N13、N14 |
| I4 | “默认应该支持无git，但是用户安装了git 可以实现更好的版本控制” | N13、N14 |
| I5 | “我同意，先从一个project开始” | N14 |
| I6 | “我尝试过之后发现学习路线太陡峭了，我对typescript语法完全啊不懂，pi agent SDK可以下阶段再接入，现在使用pi code agent是不是就可以实现一个MVP” | N15、N16、N17、E20–E23 |
| I7 | “我个人更倾向于现在先删除os-runtime， 这样会对路线造成干扰，也会让上下文变得更加复杂。等我根据参考的项目进行学习之后，再用Pi Agent SDK来构建。” | N15、E20 |
| I8 | “现在梳理os-build 下的文件，精简和删除多余的文件和内容” | N15、E20 |
| I9 | “我暂时删除了Paper_VAE，第一个真实示例项目采用os-build/references/EurekAgent 中的cirle packing任务。 smoke test 还是使用projects-folder/Example_Project” | N1、N3、N6、N17、E1、E22、E23 |
| I10 | “对于这个OS project-folder 的管理是不是也可以用一个skill，这样用skill来给code agent 提供接口来直接管理project-folder 下的不同project。整个OS 图形界面是给人看，code agent 来管理paper-wiki, skill,和project，现在paper-wiki 和 skill-hub 都有对应的 skill 来添加，删除和管理，但是projects 还没有skill。” | N19、E24 |

**Agent-harness decisions (2026-09-26, Human Owner decision after a reference study):**

The agent studied how Orca (`stablyai/orca`) and alphaXiv OpenResearch reuse coding-agent
subscriptions: both launch the vendors' official CLIs rather than calling model APIs. It
then recommended OpenResearch's adapter layering. The Human Owner's words: “后续我打算用
Pi Agent 作为引擎来驱动我的 OS，但是为了快速实现，我打算用 claude 或者 codex 的订阅来驱动”
and “基本照搬 OpenResearch 的适配器分层：先做 Claude 的流式模式和 codex app-server 两个适配器。
我想接受这个建议，采用这种方案来先把我的 OS 驱动起来”, asking for the simplest effective
implementation.

| Decision | Default taken | To reverse |
|---|---|---|
| Active route | Drive the OS through subscription-backed CLIs with [`os-harness/`](os-harness/README.md) ([ADR-0003](docs/adr/0003-subscription-cli-harness.md)). Supersedes ADR-0002 and GOAL.md's non-goal "no Codex/Claude runtime backend in the current MVP" | Return to ADR-0002 by a new Human Owner decision and delete `os-harness/` |
| Adapter shape | Claude `--print` with stream-json output, and `codex app-server` JSON-RPC; one CLI process per turn; Python standard library only; one JSONL trace per session, ignored by Git | Long-lived processes or a daemon once turn latency or mid-turn steering is a real need |
| Credentials | Launch only the official CLIs; never read, refresh, or copy their OAuth tokens (Orca's approach was rejected); strip `ANTHROPIC_API_KEY`/`ANTHROPIC_AUTH_TOKEN` from children and record the auth source per turn | Allow API-key billing explicitly |
| Pi's role | Intended long-term engine, off the critical path. Pi `/login` with a Claude subscription was rejected: Pi's own warning says third-party use is billed as per-token extra usage | Put Pi back on the critical path by a new decision |
| Permission modes | `read-only`, `workspace` (default), `full`. Claude refuses shell commands outside `full`; Codex runs with `approvalPolicy: "never"` and the harness declines any approval request; on Windows, Codex fails fast when its sandbox is not ready | Add finer allow-lists when a project needs shell commands without `full` |
| GOAL.md | **Revised 2026-09-26.** Asked which goal to execute (the draft, the unrevised GOAL.md, or a reworked draft), the Human Owner chose to adopt the draft. Merged into [os-build/GOAL.md](os-build/GOAL.md): new §1 goal, H1–H3 in §5 and §6, M2 marked superseded, the M4 gate no longer covers request-driven root-agent dispatch, and the non-goals replaced | Restore GOAL.md from Git (`0e185da`) by a new Human Owner decision |
| Root agent in os-ui | The Human Owner (2026-09-26 evening: “os 的界面里 claude code 和 codex 还是复制链接，不是接入，也没有一个对话框提供给人类给 root agent 对话”) asked for the conversation inside the UI. Added the **Root Agent** window and a serve-only Vite plugin (`os-ui/frontend/chat-plugin.ts`) with token-gated `/api/chat/*` endpoints that start, resume, stop, and read os-harness sessions at the repository root (`full` mode); the dock's Claude Code and Codex buttons first opened that window, then were removed the same evening at the Human Owner's request (“点击 root agent 里可以进行选择就可以了”): the window's own agent selector is the one place to choose. Then the Human Owner asked for a direct entry per project (“也应该提供 project 中的入口，让用户直接操作和管理project”): the Projects window gained an **Agent** view that runs turns inside `projects-folder/<Name>/`, with an agent and mode selector, the directory's sessions (including root-agent dispatches) listed for resumption, and one running agent per directory enforced by the endpoint (HTTP 409). This is the one GUI execution surface opened from GOAL.md M4; the token exists because the dev server is reachable through a public tunnel. Verified: typecheck and build pass, 401 without the token, and a real turn through the API answered a portfolio question in 27 s **2026-10-10:** the desktop client serves the same endpoints with a per-launch token of its own and no tunnel exposure | Remove the window and plugin; the dock buttons go back to copying launch commands |
| Root agent (H2) | Any code agent opened at the repository root that follows the hub skill [`project-dispatch`](research-skills-hub/open-paper-skills/project-dispatch/SKILL.md) ([ADR-0004](docs/adr/0004-root-agent-as-skill.md)). The harness adds `--detach` background turns, the session status `running`/`ok`/`failed`/`stopped`, and `stop`. At most one running session per project (Write Lease) | A dedicated root-agent program, only if a skill proves insufficient |
| Verification | 17 offline tests with fake CLIs (Python 3.9 and 3.12; 20 once H2 added detach, stop, and status). Bug found in use on 2026-09-26 and fixed: `claude --resume` replays the previous turn's init and result, which the adapter had taken as the new turn's `done`, so a resumed session read as finished while it ran; a result now counts only if nothing follows it, and the fake CLI replays too; live runs on the Human Owner's machine: Claude Code 2.1.283 (Max) passed reply, resume, and file-write turns; Codex passed the same turns with codex-cli 0.157.1 via `npx` in `full` mode; the workspace-mode fast failure was observed on Windows. After the Human Owner updated the global `codex` to 0.157.1, it passed with the default modes in `~/.codex` (sandbox ready) and in `full` mode in Orca's `CODEX_HOME` | n/a |

**Portfolio scope decision (2026-09-27, Human Owner):**

| Decision | Default taken | To reverse |
|---|---|---|
| circle_packing cancelled | The planned first real project is dropped before instantiation; `Example_Project` and `nanochat_cpu` are the portfolio's two example projects. Live references (Active Work, os-build status, os-ui empty states and docs, the project-manager examples, Example_Project's next action) were retired the same day; historical decision rows and deviations keep the name | Restore the checklist from Git history and add a new Human Owner decision |

**Project-template decisions (2026-09-29, Human Owner, after comparing three designs):**

The Human Owner stated the template's purpose: “template尽量作为不同project 的最大公约数，这样用template为起点，对新建立的project 都有助益”. Asked to choose among a navigation-only project index with shared rules kept only at the root, copying the template's shared parts, and linking back to the template, they answered that projects should be able to become standalone repositories (「希望项目能单独成独立仓库」), that the template changes only occasionally while the common divisor settles, and asked whether each project should carry its own `AGENTS.md`. They then accepted all three follow-ups (「a,b,c 都做」).

| Decision | Default taken | To reverse |
|---|---|---|
| Template role | A template is the greatest common divisor of its projects: projects copy its shared parts and extend them, which keeps each project usable as a standalone repository. The contract and a "Port template changes" procedure live in [projects-folder/templates/index.md](projects-folder/templates/index.md) | Move shared rules back to the root `AGENTS.md` and make project indexes navigation-only |
| Project `AGENTS.md` | The template ships `AGENTS.md` with the shared rules (workflow, parallel work, research integrity, and an "Inside the Research OS" section for links that leave the project) and an empty "Project-specific rules" section. It is a required file in the project contract; `Example_Project` and `nanochat_cpu` were aligned the same day; the root `AGENTS.md` "Work in a project" row and the `project-dispatch` brief point to it. The template's own copy tells agents editing the template to skip the project rules | Delete the project files, drop `AGENTS.md` from `required_files`, and move the workflow back into `index.md` |
| Template version (a) | A dated line, "Based on the `<template>` project template, last synced YYYY-MM-DD.", stamped by `new`; `validate` warns `template_sync_missing` when it is absent or undated. A date rather than a commit, because the template may be uncommitted when a project is created or aligned, and `git log --since=<date>` lists every later template change either way | Record commits, or drop the line and the warning |
| Project `index.md` (b) | Navigation only: title, summary, "Start here", "Project areas", and a "Setup after copying" checklist deleted once done. `new` sets the title to the project name and, with `--goal`, the summary; `validate` warns `index_title_is_template`. This replaced an uncommitted same-day whole-file `index_is_template` check that pushed projects to rewrite shared content | Drop the fill step and the warning |
| Verification | 21 research-project-manager tests pass; `validate` reports 2 projects, 0 warnings; an end-to-end `new` on a scratch copy of the real template set the index and template line with no new warnings; `./verify.sh` passes except the pre-existing installed-skills check (`core.symlinks=false` on this checkout); a read-only Claude Code 2.1.284 turn in `nanochat_cpu` confirmed it loads both the root and the project `AGENTS.md`. Codex was not checked: its Windows sandbox reported `updateRequired`, so the harness refused read-only mode | Run the Codex check once its sandbox is updated |

**Example-project decision (2026-09-29, Human Owner):**

Asked 「projects-folder\Example_Project 可以删除吗？已经有projects-folder\nanochat_cpu作为示例代码了」, the Human Owner was shown what only Example_Project covered: the writing workflow, a seconds-long smoke test, and the H2 acceptance run. They answered 「在projects-folder\nanochat_cpu\paper 中写简短的paper即可」 for the writing gap and chose to move H2 to `nanochat_cpu` (「选 b，开始执行」).

| Decision | Default taken | To reverse |
|---|---|---|
| Example_Project | Deleted; its last version is at Git `2523ae9`. Its idea bundle `ideas/idea_example/` is archived rather than deleted and records where the project went. Live references (README, os-build, os-harness, os-ui, skill READMEs) now use `nanochat_cpu`; historical decision rows, ADR-0001, and cognition evidence keep the name | Restore it from Git and re-register it (D6) |
| Writing example | `nanochat_cpu` carries a 4-page paper, `paper/main.tex` → `paper/main.pdf`, with every claim traced in `paper_skeleton.md`. Figure 1 is drawn by pgfplots from `Code/results/training_metrics.csv` at build time, because no SVG converter is installed. Each reference was checked against arXiv, GitHub, Hugging Face, or the author's page | Remove the paper and restore the project rule that the writing workflow is not in use |
| H2 acceptance | GOAL.md H2 now names `nanochat_cpu`; its acceptance run is dispatch session `20260926-202021-claude-2302`, still awaiting the Human Owner | Restore Example_Project and the GOAL.md wording |

**Paper reading-status decision (2026-09-30, Human Owner):**

The Human Owner observed that a human keeps a paper after reading it while an LLM keeps it only through the note, and asked for a viewer button that records the human's reading in the note file so later sessions can find it. Answers: 「只有人类改了status 才更新」, 「全部设置为unread， 取消summarized」, and approval of an os-ui write endpoint.

| Decision | Default taken | To reverse |
|---|---|---|
| `status` meaning | The human's reading state only: `unread`, `skimmed`, `read`. Agents write `unread` on every new paper and source, including ones they read in full, and change it only on the human's word (paper-wiki-manager Metadata Rules). `summarized` is removed from the validator | Restore `summarized` in `validate_paper_wiki.py` and the SKILL.md rule |
| Existing values | All 22 non-`unread` notes (19 papers, 2 sources, 1 `summarized`) reset to `unread`, because agent-set `read` could not be told apart from human reading | Restore those `status:` lines from commit `06124b3`, the last state before the reset |
| Write path | The viewer's Status row saves through os-ui's dev-server endpoint `/api/paper-wiki/status` → `scripts/set_status.py` (one frontmatter line) → `generate_viz.py`; the static viewer and GitHub Pages copy stay read-only (os-ui/DESIGN.md authorization boundary) | Remove `paper-status-plugin.ts` from `vite.config.ts` |

**CI gate decision (2026-09-30, Human Owner):**

Asked how contributors' pull requests should be gated, the Human Owner chose 「我自己也遵守规则」 (no owner bypass) and 「审批人数设为0，后续如果项目有新的maintainer 可以更改」.

| Decision | Default taken | To reverse |
|---|---|---|
| Gate | `main` changes only through pull requests whose `checks` job in [.github/workflows/ci.yml](.github/workflows/ci.yml) passes: `verify.sh`, the own-code unit tests, a fresh-`viz.html` comparison, and the os-ui build. No path filter, so the required check always reports | Delete the ruleset, or drop the required check |
| Bypass | None, the owner included. Local work goes on a topic branch; `autoreadpaper` reaches `main` through a PR; the nightly run still pushes only `autoreadpaper` | Add the repository-admin role to the ruleset's bypass list |
| Approvals | 0 required: only maintainers can merge, so a merge is the review. Raise it when a second maintainer joins | Set required approvals in the ruleset |
| Bot PRs | PRs opened with `GITHUB_TOKEN` start no workflows, so both bot workflows dispatch `ci.yml` on their branch; the mattpocock sync merges with `--auto`, which needs the repository's auto-merge setting on | Revert the two workflows to plain `gh pr merge` and add a bypass |

**Public site decision (2026-09-30, Human Owner):**

Offered `main` (CI-checked) or `autoreadpaper` as the GitHub Pages source for a view-only os-ui, the Human Owner chose 「autoreadpaper, 先保证更新的论文可以第一时间让读者访问到，main 更新后我会再merge 到autoreadpaper」.

| Decision | Default taken | To reverse |
|---|---|---|
| Site content | The view-only os-ui production build replaces the paper-wiki-only site; the wiki stays at `paper-wiki/viz.html`, so the old link works. Production builds hide the Root Agent window, project Agent view, skill toggles, and the copy-command dock button (`os-ui/frontend/src/lib/mode.ts`) The desktop client uses the same production build and shows those controls when its bridge is present (`mode.ts` `DESKTOP`) | Restore the previous `pages.yml` from Git (stage `paper-wiki/` plus a redirect `index.html`) |
| Source branch | `autoreadpaper`, deployed on every push; OS state on the site lags `main` until the Human Owner merges `main` into `autoreadpaper` | Switch the `pages.yml` trigger to `main` |

**Desktop client decisions (2026-10-10, Human Owner request):**

The Human Owner asked: 「我想把这个 Research OS 做成一个客户端，你给我一个方案，非常详细的方案，
完成方案之后，编写代码。如果云端环境无法执行，也告诉我，到时候我在我自己电脑上运行。尽可能多的完成代码和
测试。客户端要覆盖 Mac、Linux 和 Windows 三个系统。」 The plan was reviewed by five independent
lenses (security, cross-platform, parity, governance, tests) before and during the build;
their findings are folded into [os-ui/client/DESIGN.md](os-ui/client/DESIGN.md).

| Decision | Default taken | To reverse |
|---|---|---|
| Authorization | The request authorizes GOAL.md M4's desktop wrapper and waives M4's H2-evidence precondition for the wrapper only, as the 2026-07-04 decision did for the read-only monitor. The client exposes only the already-authorized endpoints (conversations, skill toggle, paper status, paper sources and keys); its own additions (folder choice, regenerating `state.json`, prerequisite probes, in-app snapshot push, notifications) run only while the app runs. GOAL.md is unchanged; its M4 annotation awaits the Human Owner (Active Work) | Delete `os-ui/client/`, ADR-0005, and `desktop.yml` (DESIGN.md §17) |
| Shell | Electron 44 (`os-ui/client/`), as the 2026-07-16 "Desktop future work" row expected: the endpoints are Node code, TypeScript only, Playwright-testable. Tauri and a browser-plus-localhost app were rejected (ADR-0005) | Rebuild on another shell; the shared endpoint core stays usable |
| Shared endpoints | The four Vite plugins' logic moved to `os-ui/frontend/server/`; the plugins are thin adapters with the same names, and the client calls the same handlers from its `app://` protocol. Deliberate deltas are listed in DESIGN.md §3.1 (UTF-8 for every child, real-path session matching, half-written trace lines skipped) | Fold the handlers back into the plugin files |
| Isolation | The Paper Wiki viewer, which renders note HTML, runs on its own origin `app://paper-wiki` under a strict CSP; app writes must be JSON; `/api/chat` and `/api/paper-sources` need a per-launch token; frames cannot navigate off the two origins; IPC answers only the app's top frame. Verified by E2E (DESIGN.md §3) | Not advisable: a note's HTML could then start a full-permission turn |
| Viewer status probe | paper-wiki-manager's `viz.js` probes `/api/paper-wiki/status` whenever the page is not opened from disk (before: only http/https), so the Status buttons work under `app://`; `paper-wiki/viz.html` regenerated | Restore the http/https test in `viz.js` and regenerate `viz.html` |
| No-Git generator | `generate.py` takes the root by layout first and skips `git` without `.git`; `state.json` is written atomically | Restore the `.git` walk and direct write from Git history |
| Environment | On macOS and Linux the client imports the login shell's whole environment once (PATH, `OS_HARNESS_*`, `CODEX_HOME`, proxies), removes AppImage paths, and prefers uv with the pinned Python, else a probed system Python ≥ 3.11 | Inherit the GUI environment and require uv |
| Refresh | The generator's inputs are polled every 4 s (no recursive watches), plus focus, every 5 minutes, and on request; the app quits with its last window on every OS | Recursive `fs.watch`, or keep running windowless on macOS |
| Distribution | Installers are CI artifacts only (`desktop.yml`: dmg, nsis, deb, AppImage on x64 and arm64); macOS builds are ad-hoc signed. Publishing releases, paid signing, and auto-update are not authorized, because the app drives users' subscriptions and provider terms come first (cog-20260926-001) | A new Human Owner decision after reviewing provider terms |
| CI | `ci.yml` (required) gains the endpoint tests; the client's own jobs live in the advisory, path-filtered `desktop.yml` | Make `desktop.yml` required in the ruleset (Human Owner's call) |

## Deviations from the original plan

- **2026-07-19 directional MVP sequencing reset** — After personally running the successful
  Phase 01 SDK hello and attempting the TypeScript debugger path, the Human Owner judged the
  combined TypeScript/event-driven/runtime learning curve too steep. The active route is now N15:
  Pi Coding Agent's existing TUI plus a file-native, human-supervised workflow. The uncommitted
  `os-runtime/` spike was then explicitly deleted to reduce route and context interference; the
  successful run remains a historical fact, not recoverable implementation evidence. Phase 02–07,
  custom TUI, deterministic enforcement, daemon autonomy, and proactive multi-session management
  are deferred until reference-project study and a new decision. ADR-0002 supersedes ADR-0001.
- **2026-07-18 directional MVP reset** — Human Owner formally replaced the approved pure-session
  N4 route with N13: embedded Pi Agent SDK, minimal local TUI, one Project/Task Run Contract and
  Autonomous Research Run. The old node/edges remain dead in the map; GOAL and ADR-0001 carry the
  new authority. Example_Project is the safe workflow smoke test before circle_packing.
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
- ~~**Sync tooling / git hooks for the three skill copies** — a documented convention suffices (D7).~~
  **— superseded 2026-07-22.** The three-copy premise is gone (D7). No git hooks were added either:
  symlinked skills cannot drift by construction, and copied skills are covered by `verify.sh`.
- **Evaluator implementation** — protocol recorded only; no evaluator script, grader service,
  scoring schema, or hidden-evaluator machinery added yet.
- **Agent-led project scaffolding** — policy recorded only; no new agent-led project, no
  `Evaluations/` directory, and no `Tasks/` workspace created until real work needs them.
- **EurekAgent-style controller/UI/Docker runtime** — intentionally not copied. The current MVP
  uses Pi Coding Agent's existing TUI and this OS's file contracts, not an EurekAgent clone.
- **Post-MVP runtime scope** — Pi SDK Phase 02+, custom TUI, deterministic permission/budget
  enforcement, multi-project concurrency, multi-worker scheduler, daemon, proactive multi-session
  manager, server, database, account system, remote access, GUI execution surface, or
  Codex/Claude runtime backend is not authorized by the N15 decision. `os-runtime/` is intentionally
  absent and must not be recreated as incidental cleanup or a prerequisite for E21/E22.
- **Project deletion, template upgrade, and an Archived Projects table** — `research-project-manager`
  ships no `remove` (deleting a project stays a Human Owner git operation plus a decision row here)
  and no `upgrade` (`validate` reports missing Snapshot fields; the agent fills them); archived
  projects keep their Active Projects row until the table grows enough to justify a second table.
- **os-ui generator consuming `status --json`** — deferred until the skill's output has run
  on two or more projects in real use; until then the generator keeps its own project parser
  and two definitions of "project" coexist knowingly.
- **`research-ideas-manager`** — still a roadmap item; `new --from-idea` writes only the promotion
  fields of one idea.
- **Desktop client extras** — no published releases, Developer ID or Windows code
  signing, notarization, auto-update, tray icon, bundled uv/Python/agent CLIs, Pi engine,
  or Chinese UI (os-ui/client/DESIGN.md §0). Google Fonts still load from the web (the
  UI falls back to local fonts offline); bundling them is open.
- **Route map and `build_phases/`** — deleted 2026-09-23 by Human Owner decision; not to be
  recreated as incidental cleanup. Recover from `git show 0f1805c:<path>` only for an audit.
