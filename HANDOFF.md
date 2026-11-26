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

### Repositioning: desktop workspace over installed coding agents (decided 2026-11-21, step 1 in progress)

The Human Owner repositioned the OS in a grilling session on 2026-11-21: a free,
local desktop app for researchers who already have Claude Code or Codex, built as
a trunk with plugins. Rows are under "Positioning and architecture decisions
(2026-11-21)" in Decisions; reasons, rejected options, and evidence are in
[ADR-0006](docs/adr/0006-desktop-workspace-trunk-and-plugins.md). That session
changed documents only.

[GOAL.md](os-build/GOAL.md), the README's "Current Design Stance", and the opening
line of [AGENTS.md](AGENTS.md) were revised the same day to match (first item
below). GOAL.md §3's table is left as its 2026-07-04 snapshot and says so.

- [x] ~~Direction-text revision. The agent lists each change to GOAL.md (§1 root
      constraints, §3 table, §5 milestones, §6 acceptance, §7 non-goals), the
      README stance, and the AGENTS.md opening line; the Human Owner confirms item
      by item.~~ Done 2026-11-21: twelve items were listed and the Human Owner
      confirmed them together (「全部按提议改」). Each replaced GOAL.md clause carries
      a dated note; the earlier text is at commit `afe0461`.
- [ ] Step 1, trunk shell: a registry replaces the compiled-in window list
      (`os-ui/frontend/src/desktop/apps.tsx`) and the fixed endpoint mounts
      (`os-ui/frontend/server/api.ts`); the new layout (home with the root agent,
      project workspace); Code and Paper views; Paper Wiki as the first plugin.
      Acceptance: the Human Owner runs the
      [client checklist](os-ui/client/README.md#check-it-on-your-machine) on macOS
      against the new layout (this also settles P6 below).
      Started 2026-11-21. The Human Owner chose mockup C, "document first"
      (「选 C」), from three clickable mockups of the same screens;
      [`os-ui/mockups/step1/c-document.html`](os-ui/mockups/step1/c-document.html)
      is the reference for the layout, the Code view, and the Paper view (open it
      with the `mockups` preview in `.claude/launch.json`).
      State on 2026-11-23, with the design and its remaining order in
      [os-ui/PLUGINS.md](os-ui/PLUGINS.md):
      - Done: the manifest parser and the server-side registry (S1, S2), the
        new layout as a shell that re-houses every existing page (S7), the
        client serving plugin origins from the registry (S3), the frontend
        registry (S4), and the path-checked read channel on plugin origins
        (S5, merged as PR #42). The Paper wiki navigation item, its page, and
        the Plugins page's enabled list come from the bundled manifests.
        Overview is the default project tab. S6 is split into S6a-1 (the Code view's read-only Git handler) and S6a-2
        (the Code view plugin: the Code tab's page on `app://code-view`, its
        Files and Changes, and "Ask the agent about this" adding a reference
        chip to the project's composer), and S6b (the Paper view plugin: the
        Paper tab draws `paper/main.pdf` on `app://paper-view` with PDF.js
        6.5.438 vendored as authorized on 2026-11-22, see Decisions). All
        three are merged (PRs #43, #44, and #45 on 2026-11-23); #45 carried
        the fixes from the second independent review of the Code view
        (PR #47). The plugins' policy needed no change for PDF.js's worker.
      - Next, in order: the Human Owner runs the
        [client checklist](os-ui/client/README.md#check-it-on-your-machine),
        which now covers the Code and Paper views; then deleting
        `os-ui/frontend/src/desktop/` (S8). The Code view's handler needs Git
        2.45 or later, which stock Ubuntu 24.04 and Debian 12 do not ship
        ([os-ui/PLUGINS.md](os-ui/PLUGINS.md), S6a-1).
      - Waiting on the Human Owner: whether a third-party plugin may add its
        own left-navigation item, or only home panels and project views
        (Q-PO1 in [os-ui/PLUGINS.md](os-ui/PLUGINS.md); needed before step 2's
        loading of a plugin from a local folder, not before its views).
- [ ] Step 2, remaining views: Idea, Skeleton, Assets; Skills Hub as the second
      plugin; then loading a plugin from a local folder. Acceptance: the Human
      Owner opens all five views on `nanochat_cpu`.
      Mockup C draws these three views as disabled tabs, so a second
      clickable mockup, in C's look and filled from `nanochat_cpu`, offers two
      alternatives for each:
      [`os-ui/mockups/step2/views.html`](os-ui/mockups/step2/views.html)
      (2026-11-23; it opens from disk). The Human Owner chose the same day
      (「全按推荐」): Idea as a drawn graph (A), Skeleton claims-first (B),
      Assets with results and datasets (B); rows "Step 2 view designs" and
      "Assets view" in Decisions.
      The design is [os-ui/PLUGINS.md](os-ui/PLUGINS.md) Part 3: where each
      thing a view shows comes from for any project, what the first version
      leaves out of the mockup, and the order, one pull request a view:
      Skeleton (2.1), Assets (2.2), Idea (2.3), then `nanochat_cpu`'s own
      idea file and the template's (2.4). Its §7 lists the questions for the
      Human Owner; on 2026-11-23 they answered I-1 to I-4, N-1, and N-3 with
      the defaults proposed (Decisions: "Idea file format", "Step 2 views,
      first version"), so nothing waits on them before 2.1 to 2.4.
      2.1, the Skeleton view, is merged (PR #50, 2026-11-23): the Skeleton
      tab draws `paper_skeleton.md` on `app://skeleton-view`, and the client
      checklist has its line. #50 was merged while its independent review
      was running; the review's two must-fix findings (two claims with one
      ID showed the first one's evidence; a lone carriage return shifted
      every later line number) and nine smaller ones are fixed on branch
      `step2-skeleton-review-fixes`, whose pull request follows #50.
      Those fixes are merged too (PR #51). 2.2, the Assets view, is built on
      branch `step2-assets-view` (PR #52); a pull request that still needs
      review is opened as a draft from now on. Its independent review found
      three must-fix problems (Reload kept old pictures, a 1.2 KB SVG froze
      the view, two files could share one label) and seven smaller ones; all
      are fixed on the same branch, with the limits that stay recorded in
      [os-ui/PLUGINS.md](os-ui/PLUGINS.md). The fixes were checked against
      the reviewer's own probes but not reviewed a second time. 2.3, the
      Idea view, is built on branch `step2-idea-view`, which starts from
      `step2-assets-view` (pull request #54; #52 is merged and `main` is
      merged in). Its independent review found four must-fix problems
      (a line under boxes it does not join and its word on the wrong node,
      long IDs cut, the ask bar and the page apart after a Reload that ended
      while Home was shown, tests that could not fail) and six smaller ones;
      eight are fixed on the branch and two are recorded as limits in
      [os-ui/PLUGINS.md](os-ui/PLUGINS.md). The fixes were checked against
      the reviewer's own probes but not reviewed a second time. The fix for
      the ask bar is in the host and so applies to every view: what a view
      posts while the workspace is hidden is now applied on return. That
      broke the Paper view in one race (text selected, Home shown within
      0.4 s: the bar was gone on return), which the directing agent's probe
      found after the fix round; the Paper view no longer reports while its
      page is not laid out, with a test that failed before. The view
      accepts `files: none` (Decisions: "Idea file format") and looks for
      cycles by the rule in Decisions, "Idea graph cycle rule". Still open with the Human Owner: the new drawing of lines and
      their words departs from Part 3 §5.3 rule 4 and no mockup shows it
      (before and after screenshots were sent). Reload keeps a surviving
      selection in the Idea view and clears it in the Skeleton and Assets
      views; the Human Owner chose to leave that as it is (Decisions:
      "Reload and the selection"). The view's timed tests (cost at n
      against 4n) failed the macos-x64 CI job twice on #54. One real cost
      was found and fixed (a line number formatted for every bad link);
      the rest was the collector on one line over about 128 KiB, which
      comes from md-kit's `splitCells` building a cell a character at a
      time. md-kit is shared and was left as it is there; the Human
      Owner asked on 2026-11-25 for it to be fixed in a pull request of
      its own (branch `md-kit-splitcells`). The Idea
      view's nine remaining cases are sized by one rule, and two
      departures from the design are recorded in
      [os-ui/PLUGINS.md](os-ui/PLUGINS.md): no test times 512 KiB of
      hostile input any more (the largest is 384 KiB), and the layout is
      no longer timed at thousands of nodes (that case could not tell
      right from wrong on macos-x64; the caps of 200 nodes and 1,000
      links bound it). macos-x64 moves single timed cases by up to
      about ten times between runs, cases on `main` included; the one
      that has come nearest the 500 ms floor is the Assets view's
      "Used in, '](' again and again" (402.5 ms in one run, 43.4 in the
      next), so a growth case red there is first compared with its time
      on the run before
      ([os-ui/PLUGINS.md](os-ui/PLUGINS.md), status of 2.3). Since
      2026-11-25 (branch `growth-interleaved`, asked for by the Human
      Owner, 「修计时测试」) the timing helper reads n and 4n in turn,
      five rounds before any pass, and a failure prints every reading.
      That removes a bias the CI logs show on every runner (the best of
      five at n against one reading at 4n); why macos-x64's two Assets
      cases went red is not established, so the next red there is read
      by its rounds before any choice between smaller sizes and skipping
      the timed cases on that runner, which is the Human Owner's. A
      second kind of red, also on unchanged code: on #59 the client's
      end-to-end case "no Content-Security-Policy violations in the app
      or its plugins' frames" failed once on macos-arm64 and passed on a
      rerun, and failed the same way on `main` at `21d3072`, after #59
      merged. The line it printed carries the hash of the suite's own
      inline-script probe, so it was a probe's report that arrived after
      the probe's fixed 300 ms wait; which of the six probes, and why it
      was late, is not established. Since 2026-11-26 (branch
      `e2e-csp-probe`, asked for by the Human Owner, 「修 CSP 用例」) the
      final check knows those reports by that hash and the six waits are
      gone; the suite is 83 cases. One wait of the same shape stays, the
      Paper view's WebAssembly probe: on macOS arm64 its trims removed
      nothing in one scratch run, other platforms were not checked. The
      full end-to-end suite runs on three CI jobs (linux-x64,
      macos-arm64, windows-x64); the other three run a pattern of three names
      against the packaged app, of which two match a case (the third,
      "opens the desktop", matches none; found 2026-11-26). A third red, on the same branch: the
      case "Skills at 1440 × 900 and 1000 × 720…" failed macos-arm64
      twice in a row at `50e7337`, after 10 passes there. One failure
      was the skill's panel staying open after Close was clicked; that
      error was made to happen on a Mac with the Skills frame's renderer
      slowed 15 times and 60 ms between press and release: the menu's
      200 ms widening moves the frame under the pointer, the press lands
      on Close and the release beside it, so nothing closes. The same
      happened with `main`'s test file, so the race is not new on the
      branch. The case now waits for the menu's widening to end before
      it clicks Close (no fixed wait; 0 of 50 presses came while the
      menu moved, against 21 of 47 before). Not established: that CI
      took this path, and why two runs in a row went red at that commit.
      The other failure, the Plugins page not opening after its button
      was clicked, was not made to happen and the change does not claim
      to cover it; if it comes back, the case should first be made to
      print what was under the pointer. 2.4, the idea files, is on branch
      `step2-idea-graph-files`, which starts from `step2-idea-view` (a
      draft pull request until #54 is merged): `nanochat_cpu`'s
      `idea_graph.md`, written from the project's files with each row's
      source named (20 nodes, 9 links), and the template's, a table with
      no row, so a new project opens the Idea tab on an empty map.
      `R1 motivates E2` in `nanochat_cpu`'s file rests on one step of
      inference, stated in its Source cell; the Human Owner chose on
      2026-11-25 to keep it (「留着」). Next is
      2.5, the Skills Hub plugin, on branch `step2-skills-hub`, which
      starts from `step2-idea-graph-files`. Its read-only design
      ([os-ui/PLUGINS.md](os-ui/PLUGINS.md) Part 4) finds that the present
      page cannot be kept unchanged (its details panel covers the whole
      window, which a framed page cannot do). The Human Owner chose on
      2026-11-25 from the clickable mockup
      [`os-ui/mockups/step2/skills.html`](os-ui/mockups/step2/skills.html):
      top C, panel 1, and in browsers a sentence in place of the page
      (Decisions: "Skills page as a plugin", "Browser builds and
      GitHub Pages"). It is built on that branch (pull request #56):
      the bundled plugin `skills-hub` with its page on
      `app://skills-hub` and the handler `toggle`, which only that origin
      reaches; the trunk's Skills page and `/api/skill/toggle` are gone
      from the app, and the dev server no longer offers the toggle. The
      three small faults of the old page are ported as they are; one of
      them differs from the mockup (the open panel keeps the old word
      after disable or enable until it is reopened). The Human Owner was
      asked twice whether to fix it and did not answer, so "ported as it
      is" stands as a default taken; the fix is one line (`shownSkill` in
      `os-ui/frontend/plugins/skills-hub/site/main.ts`, written out in its
      comment). An independent review at `bdedf32` found no must-fix, two
      should-fix, and seven notes, and CI's windows-x64 run failed one
      end-to-end case; a fix round on the same branch dealt with the
      failed case (two skills with one collection and name drew as one
      card), the missing test of which target a project's row sends, a
      plugin's frame navigating itself to another plugin's origin (the
      client's navigation guard, for every plugin), names going unquoted
      into copied commands, invisible characters, and tests that could
      not fail ([os-ui/PLUGINS.md](os-ui/PLUGINS.md), the 2.5 bullet, with
      the limits). One default taken there, for the Human Owner to
      reverse: where a skill's name, its collection, or a target is
      outside the toggle endpoint's pattern the page shows no command and
      the new line "No command: a name here has characters a command
      cannot carry safely." An installed-only skill's rows keep the old
      page's "install ⧉", whose command carries "no hub source" and is
      refused by the installer: a fourth small fault ported as it is.
      The review also showed the installer following links in three
      cases, where disable or enable deleted or renamed real content; the
      Human Owner asked for it to be hardened (2026-11-25, 「加固安装器」),
      and on branch `installer-link-guards`, which starts from
      `step2-skills-hub`, a toggle now refuses in those cases and in two
      more found on the way (a real folder in `.disabled/`, and a
      copy-form rename over a file already there), checks every selected
      location before changing any, and has its first tests, which CI
      runs ([research-skills-hub/MANAGING-SKILLS.md](research-skills-hub/MANAGING-SKILLS.md),
      "Disable, precisely"). `install` replacing what is at an install's
      path and `remove --yes` deleting a copy are as before. Open,
      outside these pull requests: the shell stops on a
      snapshot of the wrong shape; and macos-x64's timed cases still fail
      now and then (two of the Assets view's on this branch's run of
      `90d5bd5`, on `main`'s code; all eight CI jobs passed at `ff7f174`,
      windows-x64 with 78 of 78 end-to-end cases). Not verified: Windows
      and Linux beyond CI, and the Human Owner's checklist line. 2.6 waits on
      Q-PO1.
- [ ] Step 3, split and Git binding: product separated from the workspace, **New
      workspace**, each project its own Git repository, runs record their commit.
      Acceptance: another person installs the app on a clean machine and completes
      dispatch, run, and report on `nanochat_cpu` without help. The tester gets a
      CI artifact only on the Human Owner's explicit word, and the instructions
      name uv and Python as prerequisites until step 4.
      Design started 2026-11-26 (Human Owner: 「开始第 3 步设计」): the working
      design is [os-build/step3-split-and-git.md](os-build/step3-split-and-git.md)
      and the clickable mockup of its screens is
      [`os-ui/mockups/step3/workspace.html`](os-ui/mockups/step3/workspace.html)
      (it opens from disk). The Human Owner decided the same day that the
      product gets a repository of its own, SuperResearch OS, and answered six
      of the design's questions (row "Two repositories" in Decisions).
      The Human Owner merged the design (#61) and chose from the mockup the
      same day, by accepting its three recommendations (「全按推荐」): New
      workspace as a separate step after Welcome, a turn's commit as a text
      line, and the menu item "Open Workspace…" (row "Step 3 screens" in
      Decisions). Waiting on the Human Owner: the design's open questions
      (§8, fourteen, each with a default).
      The import was rehearsed on 2026-11-26 and 27 (design §7, R1) with the
      kit in [os-build/import/](os-build/import/README.md): a manifest that
      names what the product takes, an export script, and a check. The
      exported tree (482 files, a plain folder outside this repository, with a
      placeholder workspace at its root) passed its import check, `verify.sh`,
      the unit tests, the generator, the
      frontend and client builds and tests, and, in a disposable copy made
      into a Git repository, `verify.sh` and the generator again. The
      end-to-end suite passed 83 of 83 from the export once two cases stopped
      relying on this workspace's own skills and papers (the suite now writes
      what it reads into its copy). Not explained: two end-to-end runs on the
      developer's Mac in which, by the implementing agent's reading of the
      traces (since deleted: a trace holds the launch environment), the app's
      state changed with no action from the suite. In one a Skills details
      panel was found open; in the other the app went from Skills to Home two
      seconds after local midnight (2026-11-27 00:00:02) and twelve cases
      failed after it. The same tree passed before and after. In the shell
      only `navigate` changes the page, no timer and nothing keyed on the date
      calls it, and the Skills frame was not reloaded, so the Home item was
      activated; by what is not established (a real key or click reaching the
      test window, or something at the date change, are both open). On
      Windows and Linux the export has not been run.
      On 2026-11-26 the Human Owner had the empty private repository
      `SuperResearch-OS` created on GitHub (「你来建」), with an empty local
      repository beside this checkout, not inside it (R2). Nothing has been
      imported, moved, or untracked.
      On 2026-11-27 the Human Owner settled what the product repository takes
      and when (row "Product repository: contents and timing" in Decisions):
      only what building, testing, running, and understanding the app needs;
      step 3 is built here first and imported after; the app is renamed
      "SuperResearch OS". That reverses the design's order (§7) and its
      classes R and Dv (§4). The kit's manifest is rewritten to that rule, and
      the export has two modes: the real import (415 files, no workspace at
      the root) and a rehearsal that adds a placeholder workspace (439 files).
      **The import's condition** is the command sequence in
      [os-build/import/README.md](os-build/import/README.md), run on the real
      import. On 2026-11-27 it stops at the product's `verify.sh`: its
      paper-wiki validation, project contract, and generator each need a
      workspace at the root (the generator: "portfolio has 0 rows"), and the
      end-to-end suite cannot start without one. The unit tests and the
      frontend's and client's builds and tests already pass there; with the
      placeholder workspace everything passes (end-to-end 83 of 83). Also to
      mend before the import: 77 relative links in 25 exported files point at
      files that stay here (`HANDOFF.md`, `os-build/GOAL.md`, ADR-0003, and
      workspace files; the check lists them). Next, in this repository: step
      3's pull requests, starting with the rename, each page after its
      mockup. Every step 3 pull request that adds or removes a product file
      updates [`os-build/import/manifest.json`](os-build/import/manifest.json)
      in the same pull request. The import, making the repository public,
      and removing the product's files from here each wait for the Human
      Owner's word at the moment they are done.
- [ ] Step 4, agent layer: the harness ported to TypeScript with a command-line
      entry, the Agents page, one resident process per conversation with
      permission requests relayed to the UI, and an ACP adapter. Acceptance: one
      turn each on Claude Code and Codex chosen from the Agents page, and
      `project-dispatch` works through the new entry before `os-harness/*.py` is
      removed.

Standing rules for these steps: every page gets a clickable mockup the Human Owner
chooses from before it is built; TypeScript is written and reviewed by agents, and
every acceptance is a check the Human Owner can run without reading code.

Waiting on the Human Owner, none of it decided by the session: whether to ask
Anthropic and Google the two open terms questions in ADR-0006 before any release;
authorization to publish installers.

### Research OS construction — status (route map deleted 2026-09-23)

2026-11-21: the milestone list below predates the repositioning above. H2 stays and
its acceptance is still open; H3 moves after step 4; M1 is replaced by step 4's
agent registry; the desktop execution surface, the plugin host, and the TypeScript
harness leave the M4 gate, and everything else it lists stays gated. GOAL.md §5
says the same since its 2026-11-21 revision.

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

### os-ui desktop client (built 2026-10-10, awaiting the Human Owner's checks)

The Human Owner asked for the OS as a client for macOS, Linux, and Windows
(see "Desktop client decisions" below). Built in [`os-ui/client/`](os-ui/client/README.md);
plan and settled design in [os-ui/client/DESIGN.md](os-ui/client/DESIGN.md), record in
[ADR-0005](docs/adr/0005-desktop-client.md). Verified in the cloud session on Linux
x64: 90 client unit tests, 56 endpoint tests (`os-ui/frontend`, `npm test`), the
11-test Playwright E2E suite under Xvfb, `.deb` and AppImage packaging, and the
packaged app's smoke run.

- [x] ~~P5: [`desktop.yml`](.github/workflows/desktop.yml) passes on its pull request
      for all six rows (linux/macos/windows × x64/arm64), and `ci.yml`'s new
      `os-ui endpoint tests` step passes.~~ Passed at `3f097fd` (PR #22, Desktop client
      run 6), installers uploaded as that run's artifacts.
- [ ] P6: the Human Owner runs the README checklist
      ([Check it on your machine](os-ui/client/README.md#check-it-on-your-machine)) on
      each OS with a real Claude Code or Codex login. Acceptance: every box ticked,
      or a failure reported with `main.log`.
- [x] ~~GOAL.md M4 annotation, for the Human Owner to confirm as one item: record the
      2026-10-10 desktop-wrapper authorization after the 2026-07-22 slice
      paragraph.~~ Superseded 2026-11-21: the GOAL.md revision took the desktop
      execution surface out of the M4 gate, so the annotation is no longer needed.

### Next session

- Focus (2026-11-23): the Code view and the Paper view are merged (PRs #43,
  #44, #45; [os-ui/PLUGINS.md](os-ui/PLUGINS.md), under "Repositioning"
  above). Agent defaults still to confirm in Decisions: the Git version
  floor, the ask bar's extra lines (in "Selected text on screen"), and how
  the Paper view reads. Next is the Human Owner's run of the client checklist
  in [os-ui/client/README.md](os-ui/client/README.md) on a fresh build of
  `main` (`npm ci`, then `npm start`, in `os-ui/client`), which covers the
  Code and Paper views, then S8. Step 2's Idea, Skeleton, and Assets views
  follow the alternatives the Human Owner chose in
  [`os-ui/mockups/step2/views.html`](os-ui/mockups/step2/views.html) (Step 2
  above). The older items below are still open.
- Also pending: the Human Owner accepts or revises the `nanochat_cpu` example, including
  its short paper; accepting its 2026-09-26 dispatch run also completes H2
  (evidence in the project's Progress Log, `Code/README.md`, and `paper/main.pdf`).
  No project is queued after it. On acceptance, append `(accepted <date>)` to that
  Progress Log bullet; H3 (trace reflection) now follows step 4 per GOAL.md.
- Environment facts found on 2026-09-26 (Human Owner's machine, not repository
  state). The Human Owner updated the global `codex` from 0.142.4 to 0.157.1, which
  runs the configured model `gpt-5.6-luna`. Both Codex logins are ChatGPT `free`.
  Codex's Windows sandbox is `ready` in `~/.codex` but `updateRequired` in the
  `CODEX_HOME` that Orca sets for sessions it launches, so a harness started
  inside Orca needs `--mode full` for Codex.
- Also pending: the desktop client's P6 checks (Active Work, "os-ui desktop client"). Its installers are CI
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
| D7 | `.agents/skills` vs `.claude/skills` (vs hub) duplication | ~~Three identical copies kept in sync by a documented rule~~ **— superseded 2026-07-22 by the M3 authorization below.** Installs are now **mixed**: skills from Human-Owner-authored collections are **symlinked** to the hub (editing the installed path edits the hub, so drift is impossible); skills from vendored collections are **copied**, and any collection declared an auto-refreshed read-only mirror (`mattpocock-skills`) **must** stay copied so the copy acts as a version pin **— mirror clause superseded 2026-10-14, see the mirror install form decision below**. Targets are table-driven, not the hardcoded two directories, so `.claude/skills` and `.agents/skills` are no longer required to be byte-identical | Revert `research-skill-installer` to copy-only into two hardcoded directories, restore the three-copy rule here and in AGENTS.md, and restore the four `diff -rq` checks in `verify.sh` |
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
| Monitor-UI gate opened (read-only only) | Human authorized a **read-only monitor UI** (2026-07-04 grilling session): `os-ui/` = Python generator → schema-versioned `state.json` (gitignored) → static Vite/React frontend; 3 pages (dashboard / project / skills store); derived status only (no heartbeat; slot reserved with lease semantics); store shelves hub skills only; install = copy command. Design in [os-ui/DESIGN.md](os-ui/DESIGN.md), visual spec in `os-ui/mockup.html` (removed 2026-11-27 on the Human Owner's word; in Git history, last at `49788ee`). **This supersedes GOAL.md M4's evidence precondition for the read-only monitor UI only** (GOAL.md M4 annotated accordingly); the execution surface, SSE/resident services stay behind M4 (evidence + per-item human confirmation). | `rm -rf os-ui/`, remove this row + the Active Work entry, and drop the M4 exception note in GOAL.md; the OS has no dependency on os-ui |

**Skill-management decisions (2026-07-22, user-confirmed in a grilling session):**

| Decision | Default taken | To reverse |
|---|---|---|
| M3 gate opened, trigger condition amended | GOAL.md M3's trigger read "a real third agent passes the M1 cold start and needs hub skills". That was the only scenario foreseen when the clause was written; the actual driver is cross-project skill management, unrelated to a third agent. The Human Owner **amended the trigger** to "two or more install targets need unified management" rather than recording an override, so the archive states the real reason. Third-agent onboarding remains a sufficient trigger, no longer a necessary one | Restore the original M3 trigger text in `os-build/GOAL.md` and re-mark N11 as `proposed` in `os-build/map/index.md` |
| Install form is mixed, decided by source | **symlink** for collections the Human Owner authors and iterates (`open-paper-skills`) plus manually cherry-picked static vendored ones (`collected-skills`, `science-skills`, `claude-science-skills`) — 15 installed skills; **copy** for any collection declaring itself an auto-refreshed read-only mirror (`mattpocock-skills`, weekly CI `rsync --delete` per ADR 0001) — 6 installed skills **— superseded 2026-10-14, see the mirror install form decision below**. Rationale: a copy is a version pin, and only auto-refreshed mirrors move underneath you. Considered and rejected: asm's stricter "copy everything external" rule, since the three static vendored collections have 1–5 commits each and no automatic overwrite path | Set every collection to copy and restore D7's three-copy rule |
| Install targets are table-driven | Repo `.claude/skills` + `.agents/skills`; the three global directories that were verified to exist on 2026-07-22 — `~/.claude/skills`, `~/.codex/skills`, `~/.agents/skills` (2, 1, and 2 pre-existing skills respectively, none of them hub-sourced); and each `projects-folder/<Project>/` agent directory. In-repo targets use **relative** symlinks (committable); `~/` targets use **absolute** symlinks (outside Git anyway). **Known weak evidence:** there is exactly 1 project and 0 project-level skill installs today, so the project-target rows are built ahead of demonstrated need — the Human Owner accepted this after being shown the counts | Shrink the target table to the two repo directories; the installer is table-driven, so no code changes |
| Scope is this repository | The Research OS being built **is this repository**. Other directories under the same parent folder (`Research_folder/`) are not Research OS projects, are not in `projects-folder/`, and stay out of the installer's target table — confirmed by the Human Owner on 2026-07-23. Two of them keep their own copies of some hub skills; that duplication is knowingly left alone. Reaching them would require machine-local absolute paths that cannot be committed, so it would mean adding a `~/.config`-style local override the repository does not otherwise need. Do not treat this as pending work | Add the local override file and the extra target rows, and record a new authorization here first |
| `sync-back` deleted | The command's only purpose was promoting edits from an installed copy back to the hub. Symlinked skills need no promotion (the installed path *is* the hub); copied skills are the auto-refresh mirror, which ADR 0001 forbids editing in place. The two cases are exhaustive, so `sync-back`, `--force`, the digest comparison, and the conflict-stop logic all go | Restore the removed functions from Git history |
| M4 opened one narrow slice only | `os-ui` may disable/enable a skill **per install location**, and nothing else. A **copied** install renames `SKILL.md` ↔ `SKILL.md.disabled` (asm's mechanism); a **symlinked** install moves its link into the target's `.disabled/` directory. No skill content is created or deleted either way, and the toggle is offered only where an install already exists — installing stays a copied command. The write channel is a **Vite dev-server middleware** that shells out to the installer, alive only while `start.sh` runs, so DESIGN.md §2's "no resident daemon" invariant is untouched **— 2026-10-10:** the endpoint logic moved to `os-ui/frontend/server/`; the desktop client serves it too, and it still dies with its process **— 2026-11-25 (step 2.5, on branch `step2-skills-hub`):** the endpoint is the bundled plugin `skills-hub`'s handler `toggle`, served by the desktop client on `app://skills-hub` only; the dev server no longer serves it, and the trunk's `/api/skill/toggle` is gone | Remove the `skills-hub` plugin's `toggle` handler (`os-ui/frontend/server/pluginHandlers.ts`) and the buttons from its page; before step 2.5: remove the plugin from `os-ui/frontend/vite.config.ts` and the toggle from the store page; revert the DESIGN.md §1/§8 and GOAL.md M4 edits |
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
| Shared endpoints | The four Vite plugins' logic moved to `os-ui/frontend/server/`; the plugins are thin adapters with the same names, and the client calls the same handlers from its `app://` protocol. (2026-11-21: the four adapter files became one, `os-ui/frontend/api-plugin.ts`, built from the plugin registry in `server/registry.ts`; rows above that name `chat-plugin.ts` or the other three describe the earlier files.) Deliberate deltas are listed in DESIGN.md §3.1 (UTF-8 for every child, real-path session matching, half-written trace lines skipped) | Fold the handlers back into the plugin files |
| Isolation | The Paper Wiki viewer, which renders note HTML, runs on its own origin `app://paper-wiki` under a strict CSP; app writes must be JSON; `/api/chat` and `/api/paper-sources` need a per-launch token; frames cannot navigate off the two origins; IPC answers only the app's top frame. Verified by E2E (DESIGN.md §3) | Not advisable: a note's HTML could then start a full-permission turn |
| Viewer status probe | paper-wiki-manager's `viz.js` probes `/api/paper-wiki/status` whenever the page is not opened from disk (before: only http/https), so the Status buttons work under `app://`; `paper-wiki/viz.html` regenerated | Restore the http/https test in `viz.js` and regenerate `viz.html` |
| No-Git generator | `generate.py` takes the root by layout first and skips `git` without `.git`; `state.json` is written atomically | Restore the `.git` walk and direct write from Git history |
| Environment | On macOS and Linux the client imports the login shell's whole environment once (PATH, `OS_HARNESS_*`, `CODEX_HOME`, proxies), removes AppImage paths, and prefers uv with the pinned Python, else a probed system Python ≥ 3.11 | Inherit the GUI environment and require uv |
| Refresh | The generator's inputs are polled every 4 s (no recursive watches), plus focus, every 5 minutes, and on request; the app quits with its last window on every OS | Recursive `fs.watch`, or keep running windowless on macOS |
| Distribution | Installers are CI artifacts only (`desktop.yml`: dmg, nsis, deb, AppImage on x64 and arm64); macOS builds are ad-hoc signed. Publishing releases, paid signing, and auto-update are not authorized, because the app drives users' subscriptions and provider terms come first (cog-20260926-001) | A new Human Owner decision after reviewing provider terms |
| CI | `ci.yml` (required) gains the endpoint tests; the client's own jobs live in the advisory, path-filtered `desktop.yml` | Make `desktop.yml` required in the ruleset (Human Owner's call) |

**Mirror install form decision (2026-10-14, Human Owner):**

The 2026-10-12 `mattpocock-skills` refresh ([PR #24](https://github.com/pengqianhan/AI-Human-Research-OS/pull/24)) failed the required check: `verify.sh` requires a copied install to equal the hub, so a refresh that touches an installed skill could not merge until someone reinstalled it. Offered a version pin that survives syncs, a reinstall step in the sync workflow, or symlinks, the Human Owner chose 「走软链接」.

| Decision | Default taken | To reverse |
|---|---|---|
| Mirror installs are symlinks | `mattpocock-skills` declares `Install form: symlink`; `grilling`, `wayfinder`, and `writing-for-agents` are links in both repository targets, so every install in the repository is a symlink. The copy form stays in the installer and `verify.sh`, unused. Supersedes the mirror clause of D7 and of the 2026-07-22 "Install form is mixed" row; reasoning and rejected alternatives are in the [ADR 0002](research-skills-hub/docs/adr/0002-skill-install-form-and-targets.md) amendment | Restore the `Install form: copy` block in [refresh.sh](research-skills-hub/mattpocock-skills/scripts/refresh.sh) and `SOURCE.md`, then `install --update` the three skills; sync PRs touching them fail again unless `verify.sh` learns to accept a lagging copy |
| Accepted risk | A merged upstream refresh, which auto-merges unreviewed ([ADR 0001](research-skills-hub/docs/adr/0001-external-skill-intake-and-sync.md)), changes installed mirror skills in place; "inert until installed" now covers only skills that are not installed. An upstream rename or removal dangles the link and fails that sync PR in `verify.sh` before it merges | Same as the row above |

**Positioning and architecture decisions (2026-11-21, user-confirmed grilling session):**

The Human Owner opened with 「我个人倾向于定位成claude code 和 codex之上的一层排布层，在本地已经有
claude code codex 或者antigravity cli 等工具的情况下，帮助用户更方便的进行research」 and settled
thirty-nine questions over seven rounds. Surveys of similar projects, vendor terms, and the
DeepSeek Harness and OhMyGame plugin systems were run by subagents during the session; what
each row rests on, and how far it was verified, is in
[ADR-0006](docs/adr/0006-desktop-workspace-trunk-and-plugins.md). Three rows differ from the
Human Owner's own words and were shown to them as such before the final confirmation: Canvas
is deferred from their six views, Git becomes required against the 2026-07 「默认应该支持无git」,
and third-party plugins may not ship host-side code although Q29 said 「允许」.

| Decision | Default taken | To reverse |
|---|---|---|
| Audience | Other researchers who already have Claude Code, Codex, or similar tools installed. **Supersedes** the 2026-07-03 "own research practice is primary" row and GOAL.md §1's rule that the owner's project friction decides what gets built | Restore the 2026-07-03 row and drop the external-tester acceptance |
| Human role | Human-led. It ships as each workspace's default setting, reusing the `agent_led_research` values; nothing agent-led is built until a user asks (「Q2 A, 之后考虑 B」) | Change the default value and add evaluator and budget controls first |
| Wedge | 「openresearch 和 ohmygame的结合版」: OpenResearch's Git binding plus an OhMyGame-style multi-view project workspace. No experiment tree, compute dispatch, or database | Reopen as a new directional question; nothing is built on the excluded parts |
| Evidence source | The positioning counts as proven when another person installs the app on a clean machine and completes dispatch, run, and report on `nanochat_cpu` without help. Until then nothing is claimed as usable by others | Return to owner-project OS Feedback as the trigger |
| Distribution | Free, open-source, local only: no hosted or paid version; no vendor CLI bundled, modified, installed, or updated by the app; no vendor name or logo in the product name; a first-run sentence says the app launches the user's own CLI on the user's own plan. Publishing installers still needs a separate authorization | A hosted or paid form needs a new decision and, for Codex, OpenAI's partner process |
| Primary surface | The desktop client, continued from `os-ui/client`. **Supersedes** os-ui's read-only-monitor role; the browser dev server stays as the development shell of the same frontend | Keep the client as an optional wrapper around the monitor |
| Root agent and project chat | GOAL.md §1's sentence stands: one root agent, visible as soon as the app opens, moves every project forward. Each project also has its own conversation for work inside it (「两个都留」) | Drop either conversation |
| Layout | Left navigation (Home, Projects, Paper wiki, Skills, Plugins, quick access, Settings); Home opens on the root agent above the project cards; a project shows the conversation on the left and view tabs on the right. **Supersedes** the 2026-07-05 desktop-OS shell, which is removed once the new layout works. The two session mockups fix structure only. Visual direction, chosen 2026-11-21 from three clickable mockups (「选 C」): C, "document first" — warm and editorial, project cards carry Home with the root agent as a prompt bar that expands in place, and a project's conversation collapses so a view can be read almost full width. The rejected A (lab notebook) and B (dense workbench) are at commit `d780271` | Keep `os-ui/frontend/src/desktop/`; for the visual direction, rebuild from A or B at `d780271` |
| Panels mockup C has no place for | Kept reachable (「按默认放」, 2026-11-21): the Dashboard's Active Work, Recent Activity, Governance, and Policy go into one closed "Workspace status" disclosure under the project cards on Home; the project overview (round scores, Evaluations, OS Feedback, Local skills) becomes an **Overview** tab, first in the project's tab row and its default. Overview is a trunk tab, not a sixth project view | Drop the panels, or move Overview behind the project header |
| Project views | Five: Idea, Code, Skeleton, Assets, Paper. Canvas, the sixth the Human Owner named, is deferred until they can say what it holds | Add Canvas as a plugin |
| Idea view | A DAG stored as one Markdown file per project: nodes are question, hypothesis, experiment, result, claim, each with a status; edges are motivates, tests, supports, refutes. An experiment node points to a run (commit plus result file), a claim node to a `paper_skeleton.md` row | Replace the node vocabulary; the file format stays a table |
| View editing | Views render workspace files. First version: read-only, plus selecting an item to ask the agent about it. Later, direct editing opens per view, Idea and Skeleton first. **Loosens** "the GUI is for reading, agents write through skills" (cog-20260923-001) | Keep every view read-only |
| Step 2 view designs | Chosen 2026-11-23 from the clickable mockup [`os-ui/mockups/step2/views.html`](os-ui/mockups/step2/views.html), two alternatives a view, by accepting the agent's three recommendations (「全按推荐」): **Idea** as A, a drawn graph with small nodes and every link always shown as a line, full text in a detail panel on selection; **Skeleton** as B, the claims table with each claim's evidence beside it and the rest of `paper_skeleton.md` folded; **Assets** as B (next row). All three are read-only with the same ask bar and reference chip as the Code and Paper views | Build the other alternative of that view from the same mockup |
| Skills page as a plugin | Chosen by the Human Owner on 2026-11-25 from the clickable mockup [`os-ui/mockups/step2/skills.html`](os-ui/mockups/step2/skills.html) (「选C」, panel 1, 「我倾向于乙」): **top C**, the one-line band "Skills Hub · bundled plugin — …" above today's small line, large title, and sentence, all scrolling with the skills; **panel 1**, the details panel and its shading cover the Skills area only, the left menu stays bright and clickable, and the panel is still open on return; **in browsers** (the dev server and the static build) the Skills item stays and its page says it opens in the desktop app, and the dev server no longer offers the toggle. The other questions of [os-ui/PLUGINS.md](os-ui/PLUGINS.md) Part 4 §4.2 keep their stated defaults: today's three small faults are ported as they are (Q4), the Plugins page shows Skills Hub as enabled (Q5), and the framed page's small differences are accepted (Q6) | Top: remove the page's key from the list that lets a plugin page draw its own top, for Paper wiki's look (A), or drop the band element (B). Panel: a few lines in the page (close on a click outside). Browsers: keep the trunk's Skills page and `/api/skill/toggle` for browser builds |
| Browser builds and GitHub Pages | Stated by the Human Owner on 2026-11-25: the work is the desktop client; the web part will not be used afterwards, and the Human Owner will replace the GitHub Pages site with a page presenting the product. So a view need not work in a browser build, and browser-only behaviour is not kept when a page moves into a plugin. This does not lift the hold on S8, which still waits for the macOS checklist run, and changing what `pages.yml` publishes remains the Human Owner's | Keep browser builds working: serve plugin pages from the dev server and the static build, or keep trunk copies of the pages |
| Assets view | Holds a project's `Figs/`, `Baselines/`, `Code/results/`, and the list of datasets its code downloads (Human Owner, 2026-11-23, alternative B of the mockup). Nothing defined the view before; `Code/results/` also stays visible in the Code view | Alternative A: `Figs/` and `Baselines/` only |
| Idea file format | Confirmed by the Human Owner on 2026-11-23 (「按提议」): one file `idea_graph.md` at the project root beside `paper_skeleton.md`; one Markdown table, one row a node, with the columns ID, Kind, Statement, Status, Links, Points to, Source; a claim node uses the status words of `paper_skeleton.md`'s claims table (planned, verified, weak, removed); a claim is pointed to by the short name its skeleton row starts with (`C1:`). The full grammar is [os-ui/PLUGINS.md](os-ui/PLUGINS.md) Part 3 §5.1. New projects get an empty `idea_graph.md` from the template, and the project check does not require the file (「带，但不强制」). `nanochat_cpu` records no hypotheses and its 2026-09-26 run recorded no commit, so its graph has no hypothesis node and its experiments say `commit: none`. On 2026-11-24 the Human Owner allowed `files: none` (「允许」) for a done, running, or failed experiment that has no result file, as `commit: none` does for a run with no commit; the Idea view accepts it since the fix round of its pull request (#54) | Rename the file or change the columns before the first project other than `nanochat_cpu` has one; drop the template's file |
| Idea graph cycle rule | Taken as a default by the directing agent on 2026-11-24 and confirmed by the Human Owner on 2026-11-25 (「保持默认」). The idea file must be a DAG ([os-ui/PLUGINS.md](os-ui/PLUGINS.md) Part 3 §5.1); when the Idea view looks for a cycle it counts each link from what must exist first to what follows from it: `A motivates B` is A → B, `E tests X` is X → E, `R supports` or `refutes X` is X → R, and a result's `from: E` is E → R. So a hypothesis that motivates the experiment testing it is no cycle, and a result that motivates its own experiment is one. The first build counted each link from its row to its target and listed the first case as a cycle | Set `tests`, `supports`, and `refutes` to `"row"` in `FIRST` in [os-ui/frontend/plugins/idea-view/site/logic.ts](os-ui/frontend/plugins/idea-view/site/logic.ts) and update the eight pinned cases in its test and §5.1 |
| Reload and the selection | Decided by the Human Owner on 2026-11-24 (「先保持现状」): the three step 2 views stay as built. In the Idea view a selected node that is still in the file stays selected after Reload, with its row as it is now; the Skeleton and Assets views clear the selection when Reload starts | Make the Skeleton and Assets views keep a surviving selection as the Idea view does (its "Selection and Reload" point in [os-ui/PLUGINS.md](os-ui/PLUGINS.md)), each with an end-to-end test |
| Step 2 views, first version | Human Owner, 2026-11-23, on the design's questions ([os-ui/PLUGINS.md](os-ui/PLUGINS.md) Part 3 §7): the Skeleton view leaves out the cited file's own text next to a claim, which the mockup showed and no general rule can produce, and lists the files the claim names (「先不显示」); a reference chip from the Idea, Skeleton, or Assets view opens by itself, since the quote is the line as written in the file and not what the page draws (「自动展开」). The other departures from the mockup stand on the agent's defaults there (N-4 to N-7): no "Committed" line and no "Made by" in Assets, no jumps between Skeleton and Idea, a result's experiment drawn as a dotted line | Add the source excerpt as its own change with a wider `reads`; add a view to `QUOTES_AS_DRAWN` once its quote is what it draws |
| Bare-CLI use | A workspace stays fully usable from Claude Code or Codex with no app running; the app adds no write action that exists only in the GUI | Allow GUI-only features |
| Trunk and plugins | A small trunk; Paper Wiki, Skills Hub, and the five views are plugins (「先做好主干，然后把其他功能做成插件」). **Supersedes** the 2026-06-12 plugin model in [memory/MEMORY.md](memory/MEMORY.md) (two plugin types only: skills and project templates). D9 still holds for indexes; a plugin manifest is the one structured file added, and skills stay plain `SKILL.md` | Compile the features back into the app |
| Plugin contract | An own, small, declarative manifest in OhMyGame's shape with five contribution kinds: home panel, project view, skill, host-side handler, ACP agent. Plugin pages run on their own origin, as the Paper Wiki viewer already does; the contract only grows compatibly, with a declared version range | Adopt another host's format |
| DeepSeek Harness | Not a host and not a format to match. Shared ground is `SKILL.md` skills in `.agents/skills`, MCP, and ACP, through which DeepSeek Harness can itself be added as an agent. **Supersedes** the same-session wish to stay compatible with its plugin system | Build the views as DeepSeek Harness plugins, accepting its own agent loop as the main chat |
| Third-party plugins | Allowed, including ones users make (「允许，同时可以让用户自己制作plugin」). They may contribute pages, skills, and ACP agent definitions (the launch command is shown for confirmation). Host-side handlers are for bundled plugins until a permission model exists. A plugin an agent installs does nothing until a person enables it | Open host-side handlers to third parties, or close third-party install |
| Plugin authoring | Load from a local folder with reload; a plugin-authoring skill and template so the user's own agent writes the plugin; bundled plugins use the same contract. Git and npm sources come after step 3 | Remove local-folder loading |
| Plugin code and data | A plugin is code on the app side; its data are plain workspace files, so removing a plugin deletes no notes | Let plugins own private stores |
| Product and workspace | Separated. The app creates a workspace from an empty template; this repository becomes one workspace instance. **Supersedes** the "Scope is this repository" row (2026-07-22) | Keep one repository and add a script that clears personal content |
| Two repositories | Decided by the Human Owner on 2026-11-26, during step 3's design. On whether this repository keeps both roles: 「本仓库主要作为产品源码，我的工作区相关的文件可以放在human 这个文件夹下；你来评估一下，如果拆成两个仓库更合适的话可以拆」; then 「那就拆成两个仓库，把research os 客户端的仓库命名为SuperResearch OS」; then, correcting the agent, who had read that as renaming this repository, 「SuperResearch OS 是客户端的仓库的名字，本仓库可以继续保留AI-Human-Research-OS的名字不用动」; and 「对」 to "this repository is from now on your workspace, and the product's source moves to the new repository". So the product (the desktop client and what it ships) moves to a new repository, SuperResearch OS, and this repository keeps its name and stays the Human Owner's workspace; the "Product and workspace" row above stands, now with the product outside. Answered the same day (「1 接受默认，你可以参考OpenResearch 的做法，默认带一个nanochat的demo，3接受默认，你也可以参考OpenResearch的做法，5接受 7 接受默认 D  SuperResearch-OS 先private  E 接受默认，但是我建议尽快新建仓库」): the example ships inside the app, with a nanochat demo by default; the app never commits for the user; a new workspace is itself a Git repository; this workspace's `nanochat_cpu` becomes its own repository whose first commit the Human Owner makes; the new repository is written `SuperResearch-OS` and is private at first; it is created soon. Not decided, on the agent's defaults in [os-build/step3-split-and-git.md](os-build/step3-split-and-git.md) §8: the app's displayed name stays "Research OS" (the "Name" row), the new repository starts with no history from this one, and where each development-record file goes. Creating the repository, the import, and every move or untracking of tracked files each wait for the Human Owner's explicit word when they are done | Before the import: drop the new repository from the design and build step 3 here ("the other order" in the design's §7). After it: copy the product's files back from the new repository and archive it |
| Step 3 screens | Chosen by the Human Owner on 2026-11-26 from the clickable mockup [`os-ui/mockups/step3/workspace.html`](os-ui/mockups/step3/workspace.html) by accepting its three recommendations (「全按推荐」): **New workspace** is a separate step after the Welcome page (A), so the same screen serves Welcome and the File menu; a conversation turn shows the commit it started and ended on as a **text line** in the type of the lines around it (A), not a chip; the File menu's item reads **"Open Workspace…"** (B) in place of "Open Research OS Folder…". The screens and their words are the design's §6 ([os-build/step3-split-and-git.md](os-build/step3-split-and-git.md)) | Build the other alternative of that screen from the same mockup |
| Product repository: contents and timing | Decided by the Human Owner on 2026-11-27 in three rounds of questions. It began with their correction of the agent, who had listed an old screenshot among what the product takes: 「superagent-os是客户端相关的代码，旧截图应该是human ai research os 的截图，这个截图完全不用放在superagent-os 里的」 (the name stays `SuperResearch-OS`; they confirmed it). They accepted each round's recommendations (「全按推荐」, three times) and the summary (「一致了可以动手」). **What the product repository takes:** only what a person who clones it alone needs to build, test, and run the app and to understand its architecture. That is `os-ui/` with the mockups the Human Owner chose from; what the app runs (`os-harness/`, the five shipped skills, the project template); the example `nanochat_cpu`; `docs/brand/`; ADR-0005, ADR-0006, and `CONTEXT.md`; a short `AGENTS.md`, `CONTRIBUTING.md`, `LICENSE`, CI, and `verify.sh`; and a `README.md` written for the client. **What stays here:** `HANDOFF.md` (the product repository has none: its progress, decisions, and open work are recorded here), `os-build/` (GOAL, the step designs, the import kit), ADR-0001 to 0004, `CHANGELOG.md`, the presentation, the screenshots, and everything of the workspace. `os-ui/mockup.html` was deleted on their word (「已经完全没用了,可以删除」). **When:** step 3 is built in this repository first, on their question whether to open the new repository now or keep its code here. The import happens when an export with no placeholder workspace passes the product's checks, so the first commit holds no `memory/`, `ideas/`, `inbox/`, or `paper-wiki/`. Until then `SuperResearch-OS` stays as created on 2026-11-26, empty and private. **Identity:** the app is renamed "SuperResearch OS"; its id keeps the `io.github.<account>` prefix and its last part follows the name; both in one pull request here, before the import and before any tester installs. The repository becomes public at the import. **Supersedes**, in row "Two repositories" and in [the design](os-build/step3-split-and-git.md): "private at first" as the state after the import; the import before step 3's pull requests (§7: its "other order" is now the order, and the refreshes W5 and W9 are not needed); the classes R and Dv going with the product (§4, §5.7); and the default that the app keeps the name "Research OS" (§8). **Each still waits for the Human Owner's word at the moment it is done:** the import, making the repository public, and removing the product's files from this repository | Add a file to the product repository in a pull request there: adding later is free, while a file removed later stays in that repository's history. Import earlier with a placeholder workspace at the root, which the kit still writes for rehearsals. Keep the app's name and id: free until the first tester installs |
| Project repositories | Each project is its own Git repository. D8's location, `projects-folder/<ProjectName>/`, is unchanged; what ends is tracking project files in the workspace repository. `research-project-manager new` initializes the repository from step 3 | Keep projects in the workspace repository |
| Git | Required. Step one: each run records its commit, and the Code view shows files and changes. Step two, only when parallel runs are needed: a branch per experiment and a worktree per conversation. **Supersedes** idea I4 and the "Product boundary" row as amended 2026-07-18 (Git as an optional enhancement) | Restore the no-Git mode in the generator and client |
| Agents built in | Claude Code and Codex, detected automatically with version, sign-in, and usage; switched on when signed in; an installation guide when missing | Add or remove a built-in adapter |
| Other agents | Antigravity, Pi, OpenCode, and DeepSeek Harness come through ACP plugins. The Human Owner asked for 「默认要像ohmygame 那样支持使用claude code ,codex, agy」; Antigravity is bundled but **off until the user enables it**, uses `agy acp` only, and shows a risk notice when enabled, because Google's FAQ does not support wrapping `agy -p` on consumer plans | Make any of them built in |
| No engine of its own | The trunk has no model and no agent loop. Pi is an optional agent beside the others. **Supersedes** "Pi stays the intended long-term engine" (2026-09-26) and the same-session Q22 answer | Embed Pi as a default runtime, as OhMyGame does |
| Process model | One resident process per conversation, with permission requests relayed to the UI for the human to answer. **Supersedes** the Agent-harness rows "one CLI process per turn" and "the harness declines any approval request" | Keep per-turn processes |
| Language | The trunk becomes TypeScript only: `os-harness` and the state generator are ported at step 4, behind the existing 20 harness tests (18 offline, 2 live), with a command-line entry for `project-dispatch`. Python remains in plugin skill scripts, declared by the plugin. **Supersedes** ADR-0003's standard-library-Python form | Keep the Python harness and the uv prerequisite |
| Who writes TypeScript | Agents. The Human Owner accepts by behaviour: mockups, checklists, end-to-end tests | Resume the Human Owner's own TypeScript learning path first |
| API keys | The app never pays for, resells, or relays usage; agents that use API keys are the user's own configuration. The built-in Claude Code adapter keeps the "Credentials" row: it still strips API-key variables and never touches OAuth tokens. Replaces GOAL.md's non-goal "不用 API key 计费" in the direction-text revision | Restore the non-goal |
| Agent configuration | The app never edits an agent's settings, credentials, hooks, or MCP configuration. Skill directories are outside that rule but are written only when the user asks for an install | Not advisable |
| Existing milestones | H2 kept; H3 after step 4; M1 retired; M4 narrowed; the Pages site returns to publishing only the Paper Wiki viewer when the old shell goes; the cognition cache and `map-then-territory` stay the Human Owner's own workspace skills, not product features | Restore the GOAL.md milestone text |
| Name | Unchanged: AI-Human Research OS | Rename after the first outside user's feedback |
| GOAL.md | **Revised 2026-11-21** to these rows: twelve listed items (GOAL.md §1–§7, the README design stance, the AGENTS.md opening lines), confirmed together by the Human Owner (「全部按提议改」). The edit also wrote clauses the twelve-item table did not spell out, each taken from a row above unless marked: (a) §5 M4, the 2026-07-22 slice's "no install or removal from the GUI" is superseded by the Skills Hub plugin; (b) §5 M4, a per-conversation agent process that lives and dies with the app is not a resident daemon (**the agent's reading of the gate**); (c) §5 M4, the plugin host and the TypeScript harness leave the gate along with the desktop execution surface; (d) §5, the mockup-first rule and "agents write TypeScript, acceptance by checks"; (e) §7, no vendor names in the product name, no editing of agent configuration, no third-party host-side code, no Canvas, experiment tree, or compute dispatch in the first version; (f) §4, rule 1 now says the hard-coding cleanup M1 owned has no owner, and rule 2 no longer cites the deleted `CLAUDE.md`. These were reported to the Human Owner after the edit, who kept all six (「全部保留」, 2026-11-21). RSI is not mentioned in the revised text, and CONTEXT.md was not checked against it | Restore GOAL.md, README.md, and AGENTS.md from commit `afe0461` by a new Human Owner decision |
| Paper view renderer | The Paper view may vendor Mozilla's PDF.js to render `paper/main.pdf` (Human Owner, 2026-11-22: 「可以内置 PDF.js」). As [os-ui/PLUGINS.md](os-ui/PLUGINS.md) Part 2 specifies: only `pdf.min.mjs`, `pdf.worker.min.mjs`, and the Apache-2.0 licence, copied into the plugin's `site/vendor/` with a README giving version, source URL, and SHA-256; not installed through npm | Remove the vendored files; the view then says the paper opens in a PDF reader |
| Git version for the Code view | The Code view's Git handler needs Git 2.45 or later (for `--no-lazy-fetch`) and says so below that, rather than running with fewer guards; stock Ubuntu 24.04 (2.43) and Debian 12 (2.39) fall short. Default taken by the agent on 2026-11-22 after an independent security review, reported to the Human Owner, not yet confirmed by them | Serve Git 2.41 to 2.44 by refusing repositories with a promisor remote, as recorded under S6a-1 in [os-ui/PLUGINS.md](os-ui/PLUGINS.md); it needs its own CI job on stock Ubuntu 24.04 Git |
| Selected text on screen | When a view offers a selection, the ask bar shows the start and size of the text. A reference chip opens its "Sent before your message, exactly:" text by itself only when the quote comes from a PDF (Human Owner, 2026-11-23, choosing among screenshots: 「仅 PDF 自动展开」): a chip from the Code view is added closed, as in mockup C, and opens on a click; a chip from the Paper view, or from any view the host has not listed as quoting exactly what it draws, opens by itself, because an independent review showed a PDF's text layer putting text the page does not show into a quote. The ask bar's extra lines depart from mockup C on the agent's default, shown to the Human Owner in the same screenshots | The list is `QUOTES_AS_DRAWN` in `os-ui/frontend/src/plugins/select.ts` (rule in [os-ui/PLUGINS.md](os-ui/PLUGINS.md)): add a view to close its chips, empty it to open every chip; the one-line ask bar is commit `270a829` reversed |
| How the Paper view reads | Pages scroll continuously and are drawn as they come into view (mockup C pages one at a time); zoom steps go up to 300%; PDF.js draws glyphs itself (`disableFontFace`), so no font from a PDF is loaded and text can look slightly different from a system viewer; the first 1,000 pages are laid out, a page that takes more than 15 s of visible time to draw is stopped with a note, and images over 4096 × 4096 are left out. Defaults taken by the agent on 2026-11-23, the bounds after an independent review; reported to the Human Owner, not yet confirmed by them | Each is one constant or option in `os-ui/frontend/plugins/paper-view/site/` (`logic.ts`, `pdfjs.ts`), described with its measured cost in [os-ui/PLUGINS.md](os-ui/PLUGINS.md); paging one page at a time would be a change to the page's layout code |

## Deviations from the original plan

- **2026-11-21 directional repositioning** — The 2026-07-03 stance (the owner's own
  research first, machinery only on OS Feedback evidence) is replaced by a desktop product
  for other researchers, with a plugin host, a required Git binding, and no engine of its
  own. The Human Owner chose this with no real research project in the portfolio and no
  outside user; ADR-0006 lists that and the unresolved vendor-terms points as accepted
  risks. Pi leaves the route as an engine for the second time (after ADR-0003).

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

- **2026-11-21 repositioning: scope left out on purpose** — no code in the deciding
  session; no embedded agent or model; no download or update of vendor CLIs;
  no multi-account profiles; no Cursor adapter; no experiment tree, compute dispatch, or
  database; no Canvas view; no hosted or paid form; no published installers; no
  third-party host-side plugin code.
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
