# Step 3: product and workspace split, and the Git binding: working design

Read-only design, written 2026-11-26 against `main` at commit `6a5ab1b`. Nothing in
the repository was changed, built, or committed for it apart from this file and its
line in [index.md](index.md). Every `path:line` is relative to the repository root
and refers to that commit; the revision of 2026-11-26 below was checked against
`b5fa10f`, at which every file but this one, two `index.md` lines, and the mockup
reads as it does at `6a5ab1b`. **Shown** means I read the file or ran the command;
**not established** means I did not, and says what would settle it. **Proposed**
means this design chooses it. The settled rows this design builds on are in
[HANDOFF.md](../HANDOFF.md) Decisions, "Positioning and architecture decisions
(2026-11-21)", and in [ADR-0006](../docs/adr/0006-desktop-workspace-trunk-and-plugins.md);
they are cited, not repeated. The client as built is in
[os-ui/client/DESIGN.md](../os-ui/client/DESIGN.md), its checklist in
[os-ui/client/README.md](../os-ui/client/README.md), and steps 1 and 2 in
[os-ui/PLUGINS.md](../os-ui/PLUGINS.md). The skills this design changes are
[project-dispatch](../research-skills-hub/open-paper-skills/project-dispatch/SKILL.md)
and [research-project-manager](../research-skills-hub/open-paper-skills/research-project-manager/SKILL.md);
the harness is [os-harness](../os-harness/README.md).

> **Revision of 2026-11-26: two repositories.** After this design was written, the
> Human Owner decided §8 Q6. The product moves to a new repository named
> SuperResearch OS (`SuperResearch-OS` on GitHub, private at first), and this
> repository keeps its name and stays their workspace. The same day they answered
> Q1, Q3, Q5, Q7, and two questions the split raised (§8 Q12, Q13). The design's
> default for Q6, one repository with two roles, is withdrawn. This revision rewrites
> §1, §2 where it changes, §4, §5 (5.1, 5.3, 5.7, 5.8), §6, §7, §8, and §9 for the
> two-repository form, and adds facts to §3, including how OpenResearch ships its
> demo and pins a run to a commit. It was written against commit `b5fa10f` of branch
> `step3-design`. Between `6a5ab1b` and `b5fa10f` only this file, two `index.md`
> lines, and the mockup changed, so every `path:line` in any other file reads the
> same at both commits.
>
> **Revised:** every section listed above, §9 included.

> **Superseded in part on 2026-11-27.** The Human Owner then settled what the
> product repository takes and when; the record, with their words, is
> [HANDOFF.md](../HANDOFF.md) Decisions, row "Product repository: contents and
> timing". Where this design differs, that row holds:
>
> - **§4, §5.7:** the product repository takes only what building, testing,
>   running, and understanding the app needs. The classes R (development
>   record) and most of Dv stay in this repository; the product repository has
>   no `HANDOFF.md`.
> - **§7:** step 3 is built here first and imported after. "The other order"
>   at the end of §7 is the order; R3's transitional workspace is not part of
>   the import, and W5 and W9 are not needed.
> - **§8:** Q13 (import early) is reversed; the app is renamed "SuperResearch
>   OS" and its id follows; the repository becomes public at the import.
>
> The rest stands: the tester's path (§2), the facts (§3), the workspace and
> Git design (§5.1 to §5.6, §5.8), and the screens (§6). The sections above
> are not rewritten; read them with this note.

## 1. Outcome

**What the tester does.** You send one person an installer from a CI run of the
product repository, SuperResearch OS, and only when you say so. Before they open
it, they install uv, Git, and Claude Code or Codex, signed in. On Windows, Git for
Windows also gives them bash, which the example needs. They open the app, click
**New workspace**, pick an empty folder, and leave **Add the example project
nanochat_cpu** ticked. The app fills the folder from a template built into the app:

- the scripts the agents use;
- five skills;
- empty memory, ideas, inbox, and paper-wiki files;
- the project template;
- `nanochat_cpu` as its own Git repository, with one commit already in it, so the
  tester needs no Git name or email.

On Home they ask the root agent to run the example. The root agent hands the work to
`nanochat_cpu`'s own agent, which runs the three-minute training example. When it is
done, they ask the root agent for the report. Every agent turn now notes three
things: the commit the project was on when the turn started, the commit when it
ended, and how many files were left uncommitted. The conversation shows that line
and the report quotes it. Nothing the tester sees names a repository.

**What changes for your own workspace.** This repository keeps its name and becomes
your workspace only; your files stay where they are. The product's source moves to a
new repository, SuperResearch OS (`SuperResearch-OS` on GitHub, private at first).
Four things change here:

- The product's code, design record, and CI move to the new repository, which
  starts with one commit and none of this repository's history. What stays of the
  product here is what every workspace has: the agent scripts, the generator, the
  project template, and five skills, refreshed from the product by pull requests
  you approve.
- `HANDOFF.md` is split: the product's work and decisions go with the product, and
  this workspace's stay here, with a pointer each way.
- `nanochat_cpu` stops being tracked here and becomes its own repository, whose
  first commit you make. A copy is the example the app ships.
- CI here checks only workspace content: the paper wiki, your portfolio, your
  skills, and that the app's scripts still read this folder. The product's CI builds
  fresh workspaces and never sees your files.

**What you do by hand.** On GitHub: create `SuperResearch-OS`, private and empty,
then turn on Actions, the required check if your plan allows it on a private
repository, and the review secret (§5.7). Each step that creates or changes a
repository, moves tracked files, or changes what CI runs or what the installer
holds waits for your yes at the moment it is done (§7).

**What needs your answer.** Seven of §8's questions are decided; fourteen are open,
each with a default. These four decide the most:

- what GitHub Pages publishes once the product leaves this repository (Q16).
  Default: the paper wiki's own viewer alone;
- what your GitHub plan allows on a private repository: the required check, and
  the desktop builds on macOS, Windows, and arm64 (Q20);
- whether the example ships with the lines that name you (Q2). Default: as it is;
- which prerequisites the tester sheet names (Q9). Default: all of them, on a sheet
  that stands alone while the product repository is private.

## 2. The tester's path

Each step names the part that does it: one that exists (`file:line`) or one this step
must build (**build**) or change (**change**).

| # | What happens | Done by |
|---|---|---|
| 1 | They receive one installer file from a run of the product repository's Desktop client workflow, downloaded and sent by you (a private repository's artifacts are open only to people with access), only on your explicit word (`HANDOFF.md:261-262`), with a one-page tester sheet that stands alone | Artifact upload exists (`.github/workflows/desktop.yml:145-154`; the workflow moves to the product repository, §5.7). The tester sheet: **build** (PR 11) |
| 2 | They have installed beforehand: uv, which fetches the pinned Python 3.12 (`os-ui/client/src/main/python.ts:53-55`, `.python-version`); Git; Claude Code or Codex, signed in; bash (`projects-folder/nanochat_cpu/Code/README.md:29-30`; on Windows from Git for Windows); network for about 0.2 GB of data and 0.2 GB of Python wheels (`Code/README.md:20-21`) and about 1 GB of disk (`:22`). The Decisions name only uv and Python (`HANDOFF.md:262-263`); §8 Q9 asks about the rest | Settings' prerequisite rows exist (`os-ui/client/src/main/doctor.ts:101-105` for Git, which is "not required" today): **change** Git to required |
| 3 | They install and open the app as the README says for their OS | `os-ui/client/README.md:29-48` (exists) |
| 4 | No folder is saved, so the welcome page appears. Today it says to clone this repository (`os-ui/frontend/src/components/StateMissing.tsx:52-63`), which after the split would hand them your workspace | **change** to screen S1 (§6): **New workspace…** and **Open a workspace…**, with no link to any repository |
| 5 | They click **New workspace…**, choose an empty folder, keep the example ticked, and click **Create** | Screen S2: **build**. The app runs the template's `new_workspace.py` with the Python it already chose (`os-ui/client/src/main/index.ts:134`, `python.ts`) from the installer's resources: **build** (PRs 6, 7, 8) |
| 6 | The folder now holds the workspace (list below) | `new_workspace.py`: **build** (PR 6) |
| 7 | The app opens it without the trust question (it wrote the folder itself), runs the snapshot generator, and Home shows the `nanochat_cpu` card | Opening exists (`index.ts:130-196`, `:209-215`); the trust question (`index.ts:241-254`): **change** to skip a folder the app just created. The generator passes here because `new_workspace.py` registers the example with `adopt`, which writes its portfolio row and index bullet (§5.2); an empty workspace fails today (§5.8 a) |
| 8 | **Dispatch.** They type into Home's root-agent bar, for example "Run the nanochat_cpu example and report". The app starts one harness turn at the workspace root, in mode `full` | `os-ui/frontend/src/components/AgentChat.tsx:166` (mode `full`), `os-ui/frontend/server/chat.ts:124-126`, `:159-161` (exist) |
| 9 | The root agent reads the workspace's `AGENTS.md` and the `project-dispatch` skill, proposes a brief, and dispatches when the tester says yes: `python os-harness/harness.py run --agent claude --cwd projects-folder/nanochat_cpu --mode full --detach -` | Skill text exists (`research-skills-hub/open-paper-skills/project-dispatch/SKILL.md:35-43`). **change** (PR 5): the skill's `H` is a bare `python os-harness/harness.py` (`SKILL.md:14-15`). The app itself avoids a bare Python (`os-ui/client/DESIGN.md:592-599`), and a clean machine with only uv may have no `python` on PATH (not established, §9), so `H` becomes `uv run --no-project --python 3.12 -- python os-harness/harness.py`. Its baseline step (`SKILL.md:31-34`) reads the workspace repository: **change** to read the project's own repository when it has one (PR 5). The workspace edition of `AGENTS.md`: **build** (PR 6) |
| 10 | **Run.** The harness writes the project repository's state into the turn's first record. The project agent runs `bash runs/runcpu_small.sh all` from `Code/nanochat/` and writes `Code/results/` and a Progress Log line. The harness writes the end state into the turn's last record. A notification shows when the turn ends | The run command (`Code/README.md:36-39`) and notification (`os-ui/client/DESIGN.md` §7) exist. The state records: **build** (PR 2); today the first record holds only the prompt and a process id (`os-harness/core.py:362`) |
| 11 | **Report.** They ask the root agent how it went. It reads the trace, checks the work, and reports files changed, each criterion met or not, and the commit the run started and ended on | Track and Review exist (`SKILL.md:67-91`); the review's diff (`SKILL.md:83-85`): **change** to the project's repository (PR 5) |
| 12 | They also see it themselves: in `nanochat_cpu`'s workspace, under **Conversations**, the run's lines show the commits; the **Code** tab's **Changes** lists the commit | Turn lines exist (`AgentChat.tsx:714-725`): **change** (PR 3). Changes reads a project's own repository first (`os-ui/frontend/server/codeGit.ts:529-536`, exists; needs Git 2.45 or later, `HANDOFF.md:803`) |

**Answers to the five questions.**

1. **What they receive and need.** One installer file and the tester sheet (rows 1, 2).
2. **What is on disk after New workspace (proposed).** Paths are inside the chosen
   folder; "copy" means copied from the product repository through the installer,
   "stub" a new file kept in the template. The list is the same for two
   repositories: it was always built from an allowlist.

   | Path | Origin |
   |---|---|
   | `.git/` | `git init`, no commit (§8 Q5, decided) |
   | `.gitignore` | stub: `.env`; `os-harness/sessions/`; `os-ui/frontend/public/state.json*`; `.venv/`, `__pycache__/`, `.DS_Store`; then one line per registered project, `/projects-folder/<Name>/`, written by `adopt` or `new` (§5.6) |
   | `.python-version`, `.env.example` | copy |
   | `AGENTS.md` | stub: the workspace edition (marker, `os-ui/client/src/main/workspace.ts:5`) |
   | `.claude/skills/<5>`, `.agents/skills/<5>` | links into the hub copy below, one per skill (§5.8 d on Windows) |
   | `os-harness/harness.py`, `core.py`, `adapter_claude.py`, `adapter_codex.py`, `README.md`, `index.md`, `.gitignore` | copy (marker `os-harness/harness.py`) |
   | `os-ui/generator/generate.py`, `README.md`, `pyproject.toml`, `uv.lock`, `.python-version` | copy (marker `os-ui/generator/generate.py`) |
   | `os-ui/frontend/public/state.json` | written by the generator on first open (`os-ui/generator/generate.py:1093-1108`), ignored |
   | `memory/index.md`, `memory/MEMORY.md`, `memory/paper-sources.json` | stubs: empty Research Policy (human-led defaults), Active Projects, and Key Decisions tables; paper-search's default switches. With the example, `adopt` then writes its Active Projects row |
   | `ideas/index.md`, `ideas/log.md`, `inbox/index.md` | stubs, empty |
   | `ideas/nanochat-cpu-baseline.md` | copy, with the example only (its project's `Started` links to it, and `validate` requires the file: `research-project-manager/scripts/manage_research_project.py:749-753`) |
   | `paper-wiki/index.md` and its collections' empty `index.md` files, `paper-wiki/viz.html` | stubs; `viz.html` rendered from the empty wiki at creation (not established that the renderer accepts an empty wiki, §9) |
   | `research-skills-hub/open-paper-skills/{project-dispatch, research-project-manager, research-skill-installer, paper-search, paper-wiki-manager}/` | copy (§8 Q8) |
   | `projects-folder/index.md` | stub; with the example, `adopt` adds its bullet |
   | `projects-folder/templates/index.md`, `templates/ai_research_template/` (14 files today, plus a `.gitignore`, PR 4) | copy |
   | `projects-folder/nanochat_cpu/` | cloned from a Git bundle in the installer: the 73 tracked files of today plus `.git/` with one commit (§5.3); then registered with `adopt` |
   | `os-harness/sessions/` | created by the first turn (`core.py:323-324`), ignored |

3. **Where `nanochat_cpu` comes from.** From the installer, as one Git bundle file
   holding one commit of the example (§5.3; §8 Q1, decided: inside the app).
4. **What runs dispatch, and from where.** The root agent, in a harness turn whose
   working folder is the workspace root, runs `os-harness/harness.py` from the
   workspace's own copy (rows 8-9). The same command works in a terminal with no app
   running (§5.1).
5. **Where the run's commit is recorded and seen.** It is recorded in the session
   trace `os-harness/sessions/<id>.jsonl` of the workspace (`core.py:52`, `:320-321`),
   in new fields of the turn's first and last records (§5.4). It is seen in three
   places: the conversation's turn lines, the root agent's report, and the Code tab.
   If the agent copies it into `idea_graph.md`, the Idea view shows "Commit <hash>"
   too (`os-ui/frontend/plugins/idea-view/site/logic.ts:955`).

### Not in step 3

Each item is neither on the tester's path nor required by a Decisions row.

- **Updating an existing workspace's scripts from a newer app.** The tester's
  workspace is fresh, and step 4 replaces the Python. This workspace's refresh from
  a product checkout is in step 3, because the split makes its scripts copies
  (§5.1).
- **A New project screen.** The tester uses the example; agents create projects with
  `research-project-manager new`.
- **A branch per experiment and a worktree per conversation.** The Git row puts them
  in its second step, "only when parallel runs are needed" (`HANDOFF.md:790`).
- **Commits made automatically before or after runs.** Decided: the app does not
  commit for the user (§8 Q3; §5.4 default a).
- **Remotes, pushing, or any GitHub repository for projects.** No row asks for them,
  and they need network and accounts.
- **Run records written into the project (`Code/runs/`).** The session trace already
  holds the commit, and a written file would change the tree it records.
- **A runs list on the project's Overview.** The conversation shows every run.
- **Moving `state.json` out of `os-ui/frontend/public/`.** It works as it is
  (`protocol.ts:302-305`).
- **Bundling uv, Python, or agent CLIs.** The Decisions name uv and Python as
  prerequisites until step 4 (`HANDOFF.md:262-263`).
- **Publishing installers.** Not authorized (`HANDOFF.md:765`).
- **Third-party hub collections in new workspaces.** Their licences need review
  first (§8 Q8).
- **Letting the Code view read a `.git` file or a linked worktree.** Only the Git
  row's second step needs it (§9, item 8).
- **Changing what GitHub Pages publishes before W-R.** It is yours
  (`HANDOFF.md:775`); §8 Q16 asks what it becomes when the frontend leaves.
- **Making the product repository public.** It is private at first, and when it
  opens is yours (§8 Q12).

## 3. Facts

All shown unless marked.

**Workspace and app**

- A folder is a workspace when it holds `AGENTS.md`, `os-harness/harness.py`, and
  `os-ui/generator/generate.py` (`os-ui/client/src/main/workspace.ts:5`). A
  development run opens the checkout two levels above the client
  (`workspace.ts:43-47`).
- The app runs the generator and the harness from the open workspace, never from the
  app (`index.ts:143-148`, `chat.ts:124-126`). The client design says "Python scripts
  and research files are always read from the chosen workspace, never bundled"
  (`os-ui/client/DESIGN.md:719-725`), and accepts that the app's code and the
  workspace's scripts can be of different versions (`DESIGN.md:726-728`).
- The client's design still says Git is optional (`DESIGN.md:553-558`; `:650`, "no
  (history and activity only)"), as do its README (`os-ui/client/README.md:20`,
  `:23`) and the doctor (`doctor.ts:101-105`, `required` false). The Git row says
  required (`HANDOFF.md:790`).
- The client's scope says it "adds no new write action on repository content"
  (`DESIGN.md:27-35`). New workspace is one.
- The File menu has Open Research OS Folder…, Open Recent, and Reveal Folder
  (`os-ui/client/src/main/menu.ts:54-59`). There is no New workspace anywhere.
- The welcome page, shown when no folder is open, points to this repository and says
  to clone it first (`StateMissing.tsx:52-63`). A new user who follows it receives
  this instance's `human/`, `memory/`, and `HANDOFF.md`.
- The generator writes `state.json` inside the workspace at
  `os-ui/frontend/public/state.json` (`generate.py:1094`). The app serves it from
  there (`os-ui/client/src/main/protocol.ts:302-305`).
- A plugin page for the Paper wiki is served from the workspace's `paper-wiki/`
  folder (`os-ui/frontend/plugins/paper-wiki/plugin.json`, `"site": { "workspace":
  "paper-wiki" }`).
- Three handlers run hub scripts from the workspace: paper status
  (`os-ui/frontend/server/paperStatus.ts:27`), paper sources (`paperSources.ts:26`),
  and the skill toggle (`skillToggle.ts:23`).

**Installer**

- electron-builder packs `out/**/*` (no `.map` files) and `package.json` into an asar
  archive (`os-ui/client/electron-builder.yml:10-15`).
- `out/` holds `main.cjs`, `preload.cjs`, `renderer/` without `state.json` or the
  `paper-wiki/` copy, `plugins/<id>/` (manifest and `site/` minus `.ts`, plus a
  bundled `main.js`), and `icon.png` (`os-ui/client/scripts/build.mjs:1-11`, `:43-45`,
  `:59-81`, `:87`).
- So the installer holds no Python, no skill, and no workspace file today. Whether
  the renderer's compiled JavaScript contains any text from this instance's files was
  not established; I did not read the bundle.
- The repository's `LICENSE` is not in the packed file list (`electron-builder.yml:10-13`).
  Whether electron-builder adds it was not established.

**Harness and runs**

- `os-harness/` is 1,684 lines: 1,485 of Python and 199 of `README.md` and
  `index.md` (shown by `wc -l`). Of the Python, 1,041 lines are the harness itself
  and 444 its tests.
- The harness runs no Git command at all (shown by search).
- A session's first line holds `id`, `agent`, `cwd`, `mode`, `model`, `created`
  (`core.py:323-338`). Each turn starts with a `prompt` record holding the text and
  the process id (`core.py:362`) and ends with a `done` record (`core.py:353-379`).
- Traces live in `os-harness/sessions/` beside the script unless
  `OS_HARNESS_SESSIONS` says otherwise (`core.py:52`, `:320-321`). That folder is
  ignored by `os-harness/.gitignore:1-2`, because it "can hold private research
  content".
- A detached turn's worker is started with the harness's own Python and the
  harness's folder as its working folder (`os-harness/harness.py:148`, `:168-169`).
- The app and bare-CLI dispatch both reach agents only through `harness.py`
  (`chat.ts:124-126`; `project-dispatch/SKILL.md:14-15`, `:37-43`). It is the one
  place both pass through.
- Who reads a trace today:
  - the conversation endpoint, which lists and replays sessions by working folder
    (`chat.ts:89-110`), for `AgentChat`, which draws the events
    (`AgentChat.tsx:673-728`);
  - the notifier, which looks for a new `done` record
    (`os-ui/client/src/main/notifier.ts:38`, `:92`, `:112`);
  - `project-dispatch`, through `H sessions --json` and `H show`
    (`project-dispatch/SKILL.md:67-73`).

  The generator reads none: its `agent_activity` is always empty
  (`generate.py:1088`).
- `project-dispatch` calls the harness with a bare `python`
  (`project-dispatch/SKILL.md:14-15`). The app instead runs it through uv, or through
  a system Python it has probed (`DESIGN.md:592-599`).
- "Run" means three things in the repository today:
  - an Agent Run, one harness turn (`CONTEXT.md:71-72`);
  - a round, `Code/runs/<id>/result.json`, which the generator reads as `id`,
    `score`, `valid`, `artifacts`, and `tasks`, with no commit (`generate.py:543-566`).
    `nanochat_cpu` has no `Code/runs/` (its tracked files);
  - an experiment row's `commit:` cell in `idea_graph.md`, written by an agent,
    which the Idea view shows (`logic.ts:955`). `nanochat_cpu`'s say
    `commit: none` (`projects-folder/nanochat_cpu/idea_graph.md:18-21`).
- The step's sense is the first (§5.4).

**Generator**

- On a minimal workspace I built in the scratch folder, the generator wrote
  `state.json` and exited 1. The folder held the three markers, `.python-version`,
  the project template, and a `memory/MEMORY.md` with empty tables. The three
  failures were: no hub skills, 0 portfolio rows, and no install targets.
- After I added the five skills of §2 answer 2, only "portfolio has 0 rows, expected
  >= 1" failed. That is `generate.py:1188-1190`; the other two are `:1178-1183` and
  `:1194-1200`.
- The app treats any nonzero exit as a failed snapshot (`os-ui/client/src/main/generator.ts:53-61`).
- The generator reads the user's global skill folders as install targets (shown:
  the scratch run listed thirteen installs from the home folder as orphans).
- It calls `git -C <root>` only when the root has `.git` (`generate.py:159-180`,
  `:999-1033`). On an empty repository it only warns (not run; read from the code).

**Projects, dispatch, and the project contract**

- `research-project-manager new` copies the template with `shutil.copytree`
  (`manage_research_project.py:978`), fills the Snapshot, and writes the portfolio
  row and the index bullet. It runs no Git command (shown by search).
- The skill says commits "happen at session end" and that "importing an external
  repository as a project is out of scope" (`research-project-manager/SKILL.md:100-106`).
  The Project repositories row says `new` initializes the repository from step 3
  (`HANDOFF.md:789`).
- On that minimal scratch workspace, `manage_research_project.py --repo . validate`
  printed `validate: ok (0 project(s), 0 warning(s))`.
- `validate` errors on a portfolio row with no directory (`phantom_row`,
  `manage_research_project.py:774`). It also errors on a promoted idea whose
  `project:` is not a project (`:776-781`) and on a project whose `Started` links to
  a missing idea (`:749-753`).
- `./verify.sh` runs `validate` (`verify.sh:89-94`), and `ci.yml` runs `verify.sh`
  (`.github/workflows/ci.yml:44-45`).
- This repository's portfolio has the `nanochat_cpu` row (`memory/MEMORY.md:24`).
  `ideas/nanochat-cpu-baseline.md:9` points to `../projects-folder/nanochat_cpu/`.
- `project-dispatch` takes its baseline with a workspace-repository command,
  `git status --porcelain -- projects-folder/<P>` (`SKILL.md:31-34`).
- Its review diffs `git status --porcelain` against that baseline (`SKILL.md:83-85`).
- Its brief tells the project agent to "leave commits to the Human Owner"
  (`SKILL.md:57-58`).
- Accept "offer[s] to commit; the human decides" (`SKILL.md:95-96`).
- `project-dispatch` links `../../../CONTEXT.md` (`SKILL.md:15`). The link is text
  only and dangles in a workspace without `CONTEXT.md`.

**Code view**

- The handler picks a project's own `.git` first. Otherwise it uses the workspace's
  `.git` with the path filter `projects-folder/<name>`, and failing both answers
  that there is no repository. It never uses Git's discovery (`codeGit.ts:529-544`).
- It refuses a `.git` that is a link, or a file pointing elsewhere ("as a linked
  worktree or a submodule checkout has"), and one with `commondir`
  (`codeGit.ts:404-408`, `:433`).
- Its guards are explicit `--git-dir` and `--work-tree` and a fixed set of `-c`
  settings (`codeGit.ts:230`). The environment drops every `GIT_*` variable and
  reads no global or system config (`codeGit.ts:288-298`).
- The end-to-end suite already runs `git init` inside the copied
  `projects-folder/nanochat_cpu`. The view then shows that repository's commits
  (`os-ui/client/e2e/app.test.ts:795-819`).

**CI and tests**

- The end-to-end suite copies this whole repository, minus `.git` and build output,
  into a temporary folder and runs the app on it (`app.test.ts:34-44`, `:53-70`).
  Its project is `nanochat_cpu` (`:176`). The fake Claude is taken from the copied
  workspace (`:571`).
- The packaged-app smoke step runs `--test-name-pattern='opens the desktop|names the
  problem|Paper Wiki runs'` (`desktop.yml:138`). No test name contains "opens the
  desktop" (shown by search). Two cases match: `app.test.ts:4091` and `:4194`.
  `HANDOFF.md:177-179` says three named cases run.
- `desktop.yml` is advisory and path-filtered to `os-ui/**`, `os-harness/**`, one hub
  skill, `.python-version`, and itself (`desktop.yml:16-29`). `ci.yml` is required
  and unfiltered (`ci.yml:3-6`).
- The plugin unit tests I searched read frozen copies in
  `os-ui/frontend/plugins/fixtures/` rather than `projects-folder/`
  (`skeleton-view/site/logic.test.ts:36-37`, `idea-view/site/logic.test.ts:50-52`).

**`nanochat_cpu`**

- It has 73 tracked files, 1.5 MB in a checkout without its `.venv` and `.cache`
  (shown by `git ls-files` and `du`).
- Its `.gitignore` has no `*.log` or LaTeX rules
  (`projects-folder/nanochat_cpu/.gitignore:1-11`). Those come from the root
  `.gitignore` (`.gitignore:41`, `:46`). Its README says "the repository ignores
  `*.log`" (`Code/README.md:125-126`).
- The project template ships no `.gitignore` at all (its 14 tracked files).
- A run writes `Code/results/` and `Code/results/logs/` (`Code/README.md:57-61`).
- The example has been run only on Windows (`Code/README.md:230-232`).
- Several lines in it name this instance:
  - `Started` links to `../../ideas/nanochat-cpu-baseline.md`
    (`PROJECT_MEMORY.md:10`);
  - `Origin` says it was requested by the Human Owner (`:13`);
  - an open to-do names your review and a session id (`:38`).

**Two repositories (added 2026-11-26)**

- Tracked files: 1,890 at `b5fa10f`, classed in §4. Ten of them are links to other
  repositories (mode 160000) under `os-build/references/`, with no `.gitmodules`.
- The only `secrets.` references in `.github/workflows/*.yml` are
  `CLAUDE_CODE_OAUTH_TOKEN` in `claude.yml:37` and `claude-code-review.yml:38`
  (shown by search). `desktop.yml` says it "has no secrets to expose"
  (`desktop.yml:63`).
- `ci.yml` is the required gate, with no path filter (`ci.yml:3-6`). The two bot
  workflows open pull requests and then dispatch `ci.yml` on their branch
  (`scan-related-projects.yml:57-62`, `sync-mattpocock-skills.yml:71-79`); the
  mirror's sync also turns on auto-merge (`:79`).
- `pages.yml` builds the frontend with this repository's snapshot and its
  `paper-wiki/` (`pages.yml:46-50`, `:59-63`) and deploys from `autoreadpaper`
  (`:14-16`). Its three latest runs, on 2026-11-19, -20, and -23, succeeded (`gh run
  list`).
- The app names this repository in four places: the Help link
  (`os-ui/client/src/main/index.ts:43`), the About panel's website (`:442`), the
  package's `homepage` (`os-ui/client/package.json:14`), and today's welcome page
  (`os-ui/frontend/src/components/StateMissing.tsx:5`). The generator's docstring
  does too (`generate.py:4`).
- The displayed name is "Research OS" (`electron-builder.yml:4`, `package.json:3`);
  the Settings page says "AI-Human Research OS" (`SettingsPage.tsx:17`); the Name row
  says the name is unchanged, AI-Human Research OS (`HANDOFF.md:800`).
- No pull request was open on 2026-11-26 (`gh pr list`); #53 to #60 are merged.
- This repository's recent commits carry personal email addresses (shown by `git
  log`; not copied here).
- Markdown links that would cross the boundary, by file: §5.7, "Links".

**OpenResearch (read 2026-11-26)** at `alphaXiv/OpenResearch` commit `e9b80a6`
(`e9b80a661ef260729816b3e2675f2143f64ffa34`, the head of its `main` that day),
public and MIT-licensed. A subagent read it with `gh api` GET requests only and sent
nothing about this project; one search was sent as `gh api -X GET … -f q=…`, a read
with the query as a field. Code search misses large files, so no claim below that it
"never" does something rests on a search. `nanochat_cpu` was ported from its
`demo/nanochat` at an earlier commit, `27cb342` (`PROJECT_MEMORY.md:13`). Each
path is at `e9b80a6`.

- **The demo's files** are plain folders under `demo/nanochat/` (`base/`,
  `experiment/`, `quick/`, `figures/`, `evidence/`, and others: 76 files, about
  3.6 MB, summed from the tree listing), not a repository, bundle, or submodule.
  Five folders are compiled into the app (`src/local/demo.rs:169-187`). The module
  calls it the first-run project, with "deterministic local Git history"
  (`src/local/demo.rs:1-2`).
- **Its repository is built on the user's machine:** `git init`, then three commits
  on four branches from `base/`, `experiment/`, and `quick/`
  (`src/local/demo.rs:1601-1671`), as author and committer "OpenResearch Demo" with
  dates fixed at 2026-08-04 12:00 UTC (`:1790-1812`, `:1865-1870`). Hooks and signing
  are off, and global and system configuration are ignored (`:1814-1871`). The
  resulting hashes are constants in the source (`:65-74`), and the installed
  repository is checked against them (`:1727-1775`).
- **Where and when.** It goes under the app's data folder,
  `<data_dir>/repos/openresearch-demo/nanochat` (`src/local/git.rs:49-55`), with a
  local bare `origin` (`src/local/demo.rs:287-288`). It is built in a temporary
  folder and renamed into place; an unrecognised folder already there is refused and
  kept (`:1560-1597`). The app prepares it in the background at start while
  onboarding is unfinished, and installs it when the last onboarding button is
  pressed (`src/commands/up.rs:299-308`, `:2065-2079`;
  `ui/src/components/Onboarding.tsx:232-251`). Installing needs no network; running
  some of it downloads data (`src/local/demo.rs:107`, `:524`).
- **A run** is an experiment launch, not an agent turn. Each experiment is a branch
  (`src/store.rs:1424-1439`; `src/local/git.rs:1970-1980`). At submission the tip of
  the experiment's branch is archived with `git archive` into a content-addressed
  file and stored as the run's `commit_sha` (`src/compute.rs:40-49`, `:126-150`;
  `src/engine/runtime.rs:1587`). A run record's fields are in `src/store.rs:286-309`.
- **Uncommitted files are never part of a run**; its agent skill tells the agent to
  check that `git status --short` is empty before launching
  (`agent-skills/orx-git/SKILL.md:33-36`). The agent makes the experiment commits
  (`:24-31`). The app's own commits found are the demo's and three imports': a new project from a plain folder, a paper's snapshot, and a repository from GitHub (`src/local/git.rs:748-790`, `:1616-1650`, `:1535-1585`); none per run or per turn.
- **Per chat turn no Git state is stored**: the `chat_turns` table has no Git
  column (`src/store.rs:1473-1492`). A live view computes a chat's branch, changed
  files, and diff on request (`src/commands/up.rs:4424-4456`). Each chat gets a
  worktree under the data folder (`src/local/git.rs:71-77`).
- **Where the commit is shown:** the command line prints it with each experiment
  (`src/plane/local_plane.rs:244-249`); the run's popover shows a diff stat against
  the parent experiment (`ui/src/components/run/RunStatus.tsx:46`, `:128`).

What this design takes from it is in §5.3 and §8 Q1 and Q3, marked as suggestions
apart from what is decided. No code or text of it is copied.

**Git experiments.** The design agent ran none: the worktree guard of its session
refused any Git command with `HOME` or `GIT_CONFIG_GLOBAL` redirected. The directing
agent ran these afterwards, in a throwaway folder outside the repository, on macOS
with Git 2.54.0 and no global or system configuration (shown, that one machine):

- **A nested repository with no ignore line.** `git status` at the outer root lists
  the folder as untracked. `git add -A` there **fails outright** while the inner
  repository has no commit ("does not have a commit checked out … adding files
  failed"), so nothing else is staged either. Once the inner repository has a
  commit, `git add -A` warns "adding embedded git repository" and records it as a
  link entry (mode 160000) with none of its files.
- **With the line `/projects-folder/P/` in the outer `.gitignore`.** `git status` no
  longer lists it, and `git clean -ndx` says "Would skip repository".
- **A commit with no name or email set.** Git did not refuse. It made the commit
  with a name taken from the operating-system account and an email made of the
  account's short name and the machine's host name, and printed a notice. Windows
  and Linux were not tried.
- **A bundle.** A commit made with a fixed author, committer, and date was written
  to a bundle file, cloned from it into a new folder, and `git remote remove origin`
  left a repository with that one commit and a clean status. Whether two operating
  systems give the same hash was not tried.

Not run: `git submodule add` on an existing nested repository, and anything on
Windows or Linux (§9).

## 4. The inventory

Redone for two repositories (revision of 2026-11-26). Counts are tracked files at
`b5fa10f` (`git ls-files`: 1,890 in all, 69 of them symbolic links (the 40 install links and 29 inside
`claude-science-skills/`) and 10 of them
links to other repositories, mode 160000). The product repository keeps today's
paths for everything it receives, so its tests, manifests, and internal links stay
valid at the import (§5.7).

The classes:

- **M**: moves to the product repository, SuperResearch OS, and later leaves this
  one (§5.7, "This repository afterwards").
- **W**: stays here as this workspace's own content. It never enters the product
  repository.
- **B**: both. The product repository holds the source. This repository keeps the
  copy that any workspace gets from the template; the files are named.
- **R**: the product's development record: documents, not code. The side that
  keeps it is named.
- **Dv**: development only: CI, tests, mockups, preview settings. The side is
  named.
- **S**: split. One file holds a product part and a workspace part. Each repository
  gets its own edition, written as §5.7 says; no S file is moved whole.

| Entry | Files | Class | Note |
|---|---|---|---|
| `.agents/skills/`, `.claude/skills/` | 20 links each | W | This workspace's installs. Five point at B copies below, fifteen at W skills (shown with `readlink`). The product repository has none |
| `.claude/launch.json` | 1 | Dv, product | Preview servers for the dev server and the mockups (`.claude/launch.json:5`, `:11`) |
| `.env.example` | 1 | B | Paper-search key names, no values |
| `.gitattributes` | 1 | S | The `paper-wiki/viz.html` rule (`.gitattributes:1-8`) stays; the PDF.js rules (`:10-16`) go to the product's edition |
| `.github/workflows/ci.yml` | 1 | S | Split by step (§5.7, "CI on each side") |
| `.github/workflows/desktop.yml` | 1 | Dv, product | |
| `.github/workflows/claude.yml`, `claude-code-review.yml` | 2 | Dv, both | Pull-request review on each side; both use the secret `CLAUDE_CODE_OAUTH_TOKEN` (`claude.yml:37`, `claude-code-review.yml:38`) |
| `.github/pull_request_template.md` | 1 | Dv, both | |
| `.github/workflows/pages.yml`, `.nojekyll` | 2 | W, with a question | Builds the frontend (product) with `paper-wiki/` and this workspace's snapshot (`pages.yml:46-50`, `:59-63`), from the `autoreadpaper` branch (`:14-16`). It cannot simply move: §8 Q16 |
| `.github/workflows/scan-related-projects.yml`, `.github/scripts/` (2) | 3 | W | Appends to `os-build/references/related-projects.md` (`scan-related-projects.yml:53`), which stays |
| `.github/workflows/sync-mattpocock-skills.yml` | 1 | W | Refreshes the mirror, which stays (`sync-mattpocock-skills.yml:38`) |
| `.gitignore` | 1 | S | Lines 1-36 and 40-48 are general and go to both editions; `human/private/` (`:38`) stays here only. The product's edition adds `os-ui/`'s own rules |
| `.python-version` | 1 | B | The app reads it from the workspace (`python.ts:53-55`) |
| `AGENTS.md` | 1 | S | Marker (`workspace.ts:5`). Two editions (§5.7) |
| `CHANGELOG.md` | 1 | R, product | Empty (0 lines) |
| `CONTEXT.md` | 1 | R, product | The domain language; `project-dispatch` links it (`SKILL.md:15`) |
| `CONTRIBUTING.md` | 1 | R, product | This workspace keeps its two-line pull-request rule in its own `AGENTS.md` |
| `FILETREE.md` | 1 | W | Regenerated here by `filetree-simple`. The product repository has none at first (§5.7) |
| `HANDOFF.md` | 1 | S (R) | Split by section and decision group: §5.7, "The development record" |
| `LICENSE` | 1 | B | MIT; the product needs it, and this repository's own content stays MIT (`README.md:170`) |
| `README.md` | 1 | S | Two editions (§5.7) |
| `verify.sh` | 1 | S | Two editions: §5.7, "verify.sh" |
| `docs/adr/` | 6 | R, product | |
| `docs/index.md`, `docs/presentAHROS.md` | 2 | R, product | The presentation draft is a seven-line narrative of the product |
| `docs/brand/` | 16 | M | `app-icon.png` becomes `out/icon.png`; `verify.sh:142-154` checks two copies in `os-ui/frontend/public/` |
| `docs/screenshots/` | 1 | M | The product README's image |
| `human/` | 8 | W | `PROFILE.md`, `inbox.md`, `index.md`, and the cognition cache (5). `human/private/` is ignored (`.gitignore:38`) and was not read. §5.7 says how product sessions reach it |
| `ideas/` | 7 | W | `nanochat-cpu-baseline.md` also goes, as a copy, with the example (§5.3) |
| `inbox/` | 2 | W | |
| `memory/` | 3 | W | The product's template gets new stubs, not copies (§2 answer 2) |
| `os-build/GOAL.md`, `README.md`, `index.md`, `step3-split-and-git.md` | 4 | R, product | |
| `os-build/references/` | 16 | W, read-only | Its own row, below |
| `os-harness/` runtime: `harness.py`, `core.py`, `adapter_claude.py`, `adapter_codex.py`, `README.md`, `index.md`, `.gitignore` | 7 | B | Marker `os-harness/harness.py`. The workspace's copy is refreshed from the product (§5.1) |
| `os-harness/tests/` | 4 | Dv, product | |
| `os-ui/client/` | 39 | M | The app's source, with its `DESIGN.md`, `README.md`, `e2e/`, and `test/` |
| `os-ui/frontend/` | 196 | M | Renderer, plugins, server code, tests, fixtures |
| `os-ui/generator/` | 5 | B | `generate.py`, `README.md`, `pyproject.toml`, `uv.lock`, `.python-version`. Marker `os-ui/generator/generate.py` |
| `os-ui/DESIGN.md`, `PLUGINS.md`, `README.md`, `README_zh.md`, `index.md` | 5 | R, product | |
| `os-ui/mockup.html`, `mockups/` (4), `start.sh`, `.gitignore` | 7 | Dv, product | |
| `paper-wiki/` | 224 | W | Notes (`papers/` 90, `papers_zh/` 78, `topics/` 27, `concepts/` 24, `sources/` 3), indexes, and `viz.html`. The template's stubs are new files |
| `projects-folder/index.md` | 1 | W | Lists `nanochat_cpu`; the template has a stub |
| `projects-folder/templates/` | 15 | B | The project template |
| `projects-folder/nanochat_cpu/` | 73 | W | Your project. It becomes its own repository here (§5.3, Q7). A copy of its 73 files is the example's source in the product (§5.3) |
| `research-skills-hub/open-paper-skills/` five shipped skills: `project-dispatch` (1), `research-project-manager` (5), `research-skill-installer` (5), `paper-search` (3), `paper-wiki-manager` (21) | 35 | B | The product owns the canonical copy (§5.7, "The skills hub") |
| `research-skills-hub/open-paper-skills/`, the other skills and the collection's `README.md` and `index.md` | 68 | W | Your own skills, canonical here. They include `filetree-simple`, `session-handoff`, `human-cognition-cache`, and `map-then-territory`; the last two "stay the Human Owner's own workspace skills" (`HANDOFF.md:799`) |
| `research-skills-hub/claude-science-skills/`, `science-skills/`, `collected-skills/`, `mattpocock-skills/` | 480, 229, 282, 84 | W | Third-party mirrors under their upstream terms (`README.md:170-181`) |
| `research-skills-hub/` top files and `docs/` | 6 | W | `MANAGING-SKILLS.md` and the hub's ADR 0002, which the installer's `SKILL.md` links (§5.7, "Links") |

**Totals by class (1,890):** W 1,530; M 252; B 65; R 20; Dv 16 (13 on the
product side, 3 on both); S 7. In words: the product repository receives the
252 M files, the 20 records, 13 development files, 3 shared development files,
and the 65 B files: 353 of today's files. It also gets a copy of the example's 73
files and its idea file, its own editions of the 7 S files, and new files (the
template of PR 6 and the transitional workspace of §7 step R3). This repository keeps 1,530 files as they are (73 of them, your `nanochat_cpu`,
stop being tracked at W10 and stay on disk as its own repository),
the 65 B files as its workspace copies, its editions of the 7 S files, and its
copies of the 3 shared development files: 1,605 files.

**`os-build/references/` (W, read-only).** Sixteen entries, in two kinds:

- **Ten links to other repositories** (mode 160000, shown by `git ls-files -s`):
  `AutoR`, `EurekAgent`, `Harness_Handbook`, `agentos`, `awesome-AI-for-research`,
  `maka-agent-pq`, `ml-intern`, `openscience`, `repo` (sepo), `tau-pq`. There is no
  `.gitmodules` at `b5fa10f`, so the repository records no URL for them, and a
  checkout holds an empty folder for each. The brief calls some entries "other
  projects' code"; at this commit none of their code is tracked here, only the ten
  commit pointers.
- **Six notes:** `index.md`, `related-projects.md`, and four guided notes in Chinese
  (`EurekAgent-讲解与启发.md`, `agentos-讲解与启发.md`, `sepo-讲解与启发.md`,
  `并行-自进化-经验共享-调研与启发.md`).

Each entry's licence, as the repository records it:

| Entry | Licence recorded |
|---|---|
| `EurekAgent` | AGPL-3.0 (`EurekAgent-讲解与启发.md:345`) |
| `agentos` | Apache-2.0 (`agentos-讲解与启发.md:30`) |
| `AutoR` | not recorded; the upstream returned 404 on 2026-09-29 and the entry is "a submodule pointer without content" (`related-projects.md:29-31`) |
| `awesome-AI-for-research` | not recorded; the Human Owner's own field map (`related-projects.md:272-275`) |
| `Harness_Handbook`, `maka-agent-pq`, `ml-intern`, `openscience`, `repo`, `tau-pq` | not recorded |
| the six notes | this repository's MIT (`README.md:170`); `index.md:25` says the repositories' contents and licences "remain owned by their upstream projects" |

Default: the whole folder stays here, read-only, with the weekly scan that writes to
it. Product documents that cite it keep their links as links into this repository
(§5.7, "Links"). Ten pointers with no URL cannot be carried by a file-copy import
anyway: a copy of a checkout holds ten empty folders.

**What the installer bundles after step 3 (proposed).** Unchanged by the split.
Everything `out/` holds today, plus `resources/workspace-template/`:

- the copies and stubs of §2 answer 2, built from the product repository;
- `new_workspace.py`;
- `examples/nanochat_cpu.bundle`.

`build.mjs` assembles that folder as `out/workspace-template/`. It copies what the
manifest names and calls `new_workspace.py --build-example-bundle` for the bundle
(§5.3). electron-builder then copies `out/workspace-template/` outside the asar
archive with `extraResources`. The reason is known Electron behaviour, not tested
here: a Python process cannot open files inside `app.asar`, which only Electron's
own file functions read.

**The separation check, after the split (proposed).** The old check proved that
nothing of yours could leave a repository that held both. With two repositories,
the product repository holds no file of yours by construction, so most of that
proof moves to one moment, the import. What remains to prove:

1. **At the import, once (step R3 of §7).** `import_check.py`, run by the directing
   agent in a scratch folder and kept with the import's record:
   - **Allowlist.** Every file of the import is on the allowlist (§5.7, "How the
     new repository is born"); nothing else is copied. A path outside it fails.
   - **Real content.** Hash every W-class file of this repository at the import's
     source commit. Fail if any file of the import has the same SHA-256. Two
     exceptions, both named in the allowlist: the example's 73 files and its idea
     file, which are meant to ship, and empty files, whose hash every empty file
     shares.
   - **No history.** The new repository has exactly one commit, whose tree is the
     import (`git rev-list --count HEAD` is 1).
   - **The workspace works.** The steps of today's `ci.yml` run on the import
     before it is committed (the rehearsal, step R1).
2. **Afterwards, in the product's CI, on every pull request:**
   - **Installer allowlist** (part 3 of the old check): fail if
     `os-ui/client/out/` holds a path outside `main.cjs`, `preload.cjs`,
     `renderer/**`, `plugins/<bundled id>/**`, `icon.png`, and `workspace-template/`
     as its manifest lists it, or if `electron-builder.yml` names any `files` or
     `extraResources` source outside `out/` and `package.json`.
   - **The workspace works** (part 4): the generator and `validate` pass on two
     fresh workspaces, with and without the example.
   - **The builder reads only its own repository.** `new_workspace.py` refuses a
     manifest entry that resolves outside the product checkout. This replaces the
     canaries: with no instance content in the product repository, a canary planted
     there proves nothing, and a manifest that points outside it is the only way
     instance content could reach a workspace.
3. **No longer needed:** the canaries in `human/`, `memory/`, and the rest, and the
   hash comparison on every pull request. Both tested a mix that the product
   repository no longer holds.

This repository's CI keeps no separation step: nothing here is packaged.

Step 3 still needs the client's `out/` in the product's required job, so its
`ci.yml` gains `ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci --prefix os-ui/client && npm
run build --prefix os-ui/client`. What that adds to the job's time was not
established.

## 5. Design

### 5.1 Product code inside the workspace

**Facts.**

- The markers are `workspace.ts:5`. The app runs the workspace's own copies
  (`index.ts:143-148`, `chat.ts:124-126`).
- The Bare-CLI row requires a workspace to stay "fully usable from Claude Code or
  Codex with no app running" (`HANDOFF.md:781`). The port to TypeScript is step 4
  (`HANDOFF.md:264-269`, `:795`).
- An AppImage runs from a mount, whose paths the client strips from child processes
  (`DESIGN.md:589-591`). That the mount, and the files in it, are gone while the app
  is not running is known AppImage behaviour, not shown here.
- The harness puts traces beside itself (`core.py:52`). The generator finds the root
  two levels above itself (`generate.py:40-54`).

**Options.**

| Option | Cost | Breaks |
|---|---|---|
| **A. Copy into each workspace** (as today) | About 2,350 lines of Python (harness 1,041, generator 1,306) and five skills per workspace. Copies drift from the app; the drift is already accepted (`DESIGN.md:726-728`), and fields are added, never renamed (`DESIGN.md:781`). A later "update scripts" action needs a command-line twin | Nothing: markers, paths, and `project-dispatch`'s `H` stay |
| B. Only in the app | The workspace holds no product code; one version | Bare-CLI for an AppImage that is not running, and for any machine where the app is uninstalled. `H` becomes an install path per OS. Traces would land in the app bundle (`core.py:52`). Markers (`workspace.ts:5`) and the generator's root rule (`generate.py:40-54`) change |
| C. One shared copy per user, outside workspaces | One copy per version | The app writes outside the workspace and its settings, against "the app stores nothing but its own settings" (`os-ui/client/README.md:12-14`). `H` becomes a per-user path. Updating it is a GUI-only write unless it gets a twin |

**Default: A.** The Python lives in the workspace at the paths it has today.

**Updates.** A tester's workspace is fresh, and step 4 replaces the Python, so
updating a workspace from a newer *app* stays out of step 3. This workspace is the
exception the split creates. Its harness, generator, project template, and five
skills become copies of product source (the B class of §4), and step 3 itself
changes that source: PR 2's Git record, PR 5's `adopt` and `validate --absent-ok`.
The app runs the workspace's copies, not its own (`index.ts:143-148`,
`chat.ts:124-126`), so without a refresh this workspace would never show a run's
commit and could not run `adopt` on its own `nanochat_cpu`.

- **Default:** step 3 adds one narrow command, `new_workspace.py --refresh <dir>`
  (PR 6), run from a product checkout. It rewrites only the files the manifest marks
  as copies, never a stub and never any other file, and prints each file it changed.
- In this repository a refresh is a pull request whose message names the product
  commit it came from: W5 by hand, before the command exists, and W9 with it (§7). Between refreshes the copies are frozen; the
  drift is the kind the client already accepts (`DESIGN.md:726-728`).
- The same command, run from the installed app's resources, is the later update for
  any workspace.
- **Reversal:** copy the files by hand in each refresh pull request; the manifest
  still says which.

**Reversal.** At step 4 the TypeScript entry can move to B or C. The port already has
to replace these files.

### 5.2 A write that exists only in the GUI

**Facts.**

- No code creates a workspace today (§3).
- The Bare-CLI row forbids a write action "that exists only in the GUI"
  (`HANDOFF.md:781`).
- uv and Python are prerequisites until step 4 (`HANDOFF.md:262-263`); Node is not.
- `research-project-manager new` runs no Git (§3).

**Options.**

| Option | Cost | Breaks |
|---|---|---|
| **A. One Python script, `new_workspace.py`, in the product source** (`os-ui/workspace-template/`), shipped in the installer's resources | More Python to port at step 4. The app runs bundled Python for the first time | Nothing. Without the app, the same command runs from a clone of the product repository (while it is private, §8 Q12, only for people it is shared with), or from the installed app's resources folder (`uv run --no-project --python 3.12 -- python new_workspace.py <dir> [--example nanochat_cpu]`). From a clone there is no bundle yet, so the script builds the example's commit itself, the same way `build.mjs` asks it to (§5.3) |
| B. TypeScript in the app only | No new Python | The Bare-CLI row, unless option D is written as well |
| C. The app as a command (`"Research OS" --new-workspace <dir>`) | A second command-line surface before step 4's; the single-instance lock (`index.ts:498-503`) has to let it through | Works only where the app is installed |
| D. Written manual steps (copy a folder, `git init`) | No code | Error-prone: the template is assembled from several sources, and nothing tests the steps |

**Default: A.** It is the only option in step 3 whose path without the app needs
nothing beyond the named prerequisites.

**Who runs `git init`.**

- For a **workspace**, `new_workspace.py` (§8 Q5).
- For a **new project**, `research-project-manager new`, as the row says. Its
  repository function is shared with a new `adopt <Name>` command for a project
  folder that already exists. `adopt` does four things:
  - `git init` when the folder has no `.git` of its own, with no commit;
  - write its portfolio row, as `sync` does (`manage_research_project.py:484`);
  - add its index bullet, as `new` does (`:543`); `sync` adds none (`:1039-1055`);
  - add `/projects-folder/<Name>/` to the workspace's `.gitignore` when the workspace
    is a Git repository. `new` adds the same line.

  This instance needs `adopt` (W10, after the refresh W5 brings it here), and so does
  any workspace made before step 3.
- The **example** is a `git clone` of the bundle (§5.3), not an init.
  `new_workspace.py` then runs `adopt nanochat_cpu`, which finds the `.git` and only
  registers the project.

The app calls only `new_workspace.py`. Agents call the project manager.

**Reversal.** Replace the script with step 4's TypeScript entry, which then serves
both callers.

### 5.3 Where `nanochat_cpu` lives

**Facts.**

- 73 tracked files (§3), every one mode 100644, its `runs/*.sh` scripts included
  (`git ls-files -s`); the example runs them with `bash` (`Code/README.md:36-39`).
- It is a port of OpenResearch's default demo, `demo/nanochat` at OpenResearch's
  commit `27cb342` (`projects-folder/nanochat_cpu/PROJECT_MEMORY.md:13`;
  `HANDOFF.md:316`).
- The Project repositories row ends its tracking in the workspace repository
  (`HANDOFF.md:789`).
- Decided on 2026-11-26 (§8): the example ships inside the app with a nanochat demo
  by default (Q1), and your own copy stops being tracked here and becomes its own
  repository, whose first commit you make (Q7).
- What uses it today, all in this repository:
  - **End-to-end suite.** It copies this repository and works in its
    `nanochat_cpu` (`app.test.ts:53-70`, `:176`).
  - **CI's packaged-app cases.** They run inside the same `describe` and use the
    same copy (`app.test.ts:550-573`, `:4091`).
  - **`./verify.sh`.** It validates this repository's portfolio, which lists
    `nanochat_cpu` (`memory/MEMORY.md:24`), and the idea that points to it
    (`ideas/nanochat-cpu-baseline.md:9`).
  - **The required generator step** (`ci.yml:74-75`). It passes while the portfolio
    has a row.

**What happens to each (proposed).**

1. **The example's source, in the product repository.** The import (§7, step R3)
   copies the 73 files and the idea file into the product repository. Until PR 9
   they sit at `projects-folder/nanochat_cpu/` and `ideas/nanochat-cpu-baseline.md`
   inside the transitional workspace at the product root (§7), so the suite and the
   generator step run there as they do here today. PR 9 moves them to
   `os-ui/workspace-template/examples/nanochat_cpu/`, with the idea file beside it,
   and points the manifest there. Either way the copy is product source, and no
   workspace tracks it. The question the old Q7 asked (is a product copy acceptable
   under "what ends is tracking project files in the workspace repository"?) no
   longer arises: the copy is in the product repository, which is no workspace.
2. **The installer.** One Python step, `new_workspace.py --build-example-bundle`,
   turns the example *as committed in the product repository* into one commit:
   - in a temporary repository;
   - with a fixed author ("Research OS example") and a fixed date;
   - from the committed files, not the checkout, so Windows line endings cannot
     change it; the modes stay 100644.

   It writes that commit as `nanochat_cpu.bundle`. Three callers use the same step:
   - `build.mjs`, for the installer (Python is installed on every `desktop.yml` row,
     `desktop.yml:70-72`);
   - the product's `ci.yml` template check (PR 6);
   - `new_workspace.py` itself, when run from a clone of the product repository.

   New workspace clones the bundle into `projects-folder/nanochat_cpu/`, removes the
   clone's `origin`, and runs `adopt nanochat_cpu`.
   - The tester's project then has a commit without a Git name or email, and
     offline.
   - Every machine gets the same commit hash for the same app build, so you can
     match the hash in a tester's report to a build. This is a claim for the build
     PR to show: build on two OS rows and compare the hashes.
3. **Your own `projects-folder/nanochat_cpu/` (Q7, decided).** In this repository,
   in its own pull request (W10 in §7):
   - This repository stops tracking it (`git rm --cached -r`, which leaves the
     files on disk).
   - `adopt nanochat_cpu` then gives it its own repository and adds
     `/projects-folder/nanochat_cpu/` to this repository's `.gitignore`. You make its
     first commit.
   - The old history stays in this repository's log.
   - On your other machines, pulling that commit deletes the tracked files there.
     Their ignored `.venv/` and `.cache/` stay. Each machine then copies the folder
     back and runs `adopt`. W10's runbook says so.
   - `adopt` exists here only after the refresh that follows PR 5 (W5, §5.1).
4. **End-to-end suite and packaged cases**, in the product repository. Until PR 9
   they copy the product checkout, whose transitional workspace holds the example.
   From PR 9 they build their workspace with `new_workspace.py --example
   nanochat_cpu`. The Code view case then starts from a project that already has a
   commit (`app.test.ts:799` expects "No history to show" today and changes).
5. **`./verify.sh`, in this repository.** After W10 the portfolio row and the idea
   point to a folder that a CI checkout of this repository cannot have. The flag of
   the old plan is still needed, but only here: the product's CI never validates
   your portfolio.
   - `validate` gets `--absent-ok` (PR 5, in the product's copy of the skill). With
     it, a registered project whose folder is missing, and whose line is in the
     workspace's `.gitignore`, is a warning, `project_not_in_checkout`, not a
     `phantom_row` or `promoted_idea_without_project` error.
   - This workspace's `verify.sh` passes the flag only when `CI` is `true`; on your
     machine a missing folder stays an error. The edit lands with the refresh that
     brings the flag (W5), before W10.
   - Any workspace a user keeps in Git meets the same case once its projects are
     ignored, so the flag belongs in the skill, not in this repository. §8 Q10.
6. **The tester.** They get the bundle (§2).

**What the two-repository form removes from the old plan.**

- PR 10's copy of the example into `os-ui/workspace-template/examples/` inside this
  repository: the import makes that copy, in the other repository.
- The question whether a product copy may sit in the workspace repository (old Q7's
  second bullet).
- The product CI's dependence on your portfolio: from the import, nothing the
  product's CI runs reads `memory/MEMORY.md` of this repository.
- Landing the flag together with PR 5 "because a project an agent creates here is
  its own repository from that merge": a merge in the product repository changes
  nothing here until a refresh brings it, so the flag arrives here with W5.

**The tester's copy** is decided (Q1): inside the app. How the app writes it stays
this design's choice:

- **the bundle (default):** one commit, built once per app build;
- **built on the user's machine from plain files,** as OpenResearch does: embedded
  files, `git init`, and commits with a fixed name, email, and date, with global and
  system configuration ignored and hooks and signing off, checked afterwards
  against hashes stored in the app (`src/local/demo.rs:65-74`, `:1790-1871`,
  `:1727-1775` at `e9b80a6`). It needs Git at the moment of creation, which S2
  requires anyway, and it puts the fixed identity into the user's repository either
  way. Kept as the alternative for the build PR.

**Suggestions from OpenResearch for the build PR** (not decided; ideas to reimplement,
not code to copy):

- Build in a temporary folder and rename it into place, refuse an existing
  unrecognised folder, and return the existing example when it is already there
  (`src/local/demo.rs:1560-1597`). S2 already builds under a temporary name (§6);
  the build PR can add the second and third rules for the example's folder.
- After the clone, compare the example's head with the hash the build recorded, and
  fail with a fixed message when they differ (`src/local/demo.rs:1727-1775`).
- Tell the agent, in the example's own files, what the example leaves out and what
  running it downloads (OpenResearch's demo says so on every demo turn,
  `src/local/demo.rs:75-77`, `:310-312`). `nanochat_cpu`'s `Code/README.md:20-22`
  already gives the downloads.

### 5.4 What "runs record their commit" means

**Facts.**

- The harness records nothing about Git (§3).
- The generator's rounds carry no commit (`generate.py:543-566`).
- The Idea view shows a commit only when an agent writes it (`logic.ts:955`).
- `project-dispatch` leaves commits to you (`SKILL.md:57-58`, `:95-96`).
- ADR-0006 records OpenResearch only as "a run is pinned to a commit"
  (`docs/adr/0006-desktop-workspace-trunk-and-plugins.md:54-55`). Read since at its
  commit `e9b80a6` (§3, "OpenResearch"): its run is an experiment launch, not an
  agent turn. The commit is the experiment branch's tip at submission, archived with
  `git archive`, so uncommitted files are never part of a run. The agent makes the
  experiment commits; the app writes none per run or per turn, and stores no Git
  state per chat turn.
- So this design's run differs on purpose. The Git row's step one names a run's
  commit (`HANDOFF.md:790`), and the step's sense of a run is a harness turn (§3),
  so the record is taken per turn and says what was left uncommitted, which an
  archived branch tip cannot show.

**Definition (proposed).** A run is one harness turn (an Agent Run). It records the
state of the Git repository at its working folder twice: in its `prompt` record
before the agent starts, and in its `done` record after the agent ends.

- **Fields.** Each record gets a `git` field: `head` (full hash, or null when there
  is no commit yet), `branch` (null when detached), `changed` (tracked paths
  differing from `head`), and `untracked` (paths neither tracked nor ignored). When
  there is no Git, or the folder is no repository of its own, the field holds a
  reason instead.
- **No discovery.** Only `<cwd>/.git` counts. A project without its own `.git` never
  records the workspace's commit; that is the Code view's rule (`codeGit.ts:529-544`).
  A root-agent turn records the workspace's own repository.
- **Read only.** No commit, stash, or ref is made, and `--no-optional-locks` keeps
  even the index's stat refresh from being written (`codeGit.ts` passes it too). No
  Git name or email is needed.
- **Readers.**
  - The conversation's turn lines (`AgentChat.tsx:714-725`): "on c4d4a85 · clean"
    or "on c4d4a85 · 3 changed, 1 new", then at the end "ended on c4d4a85 · 7
    changed, not committed".
  - `project-dispatch`'s baseline and review, which replace the workspace `git
    status` (`SKILL.md:31-34`, `:83-85`).
  - The agent, when it fills an experiment's `commit:` cell in `idea_graph.md`.

**On a dirty tree, who commits, and when.** Four options:

| Option | Pins the code exactly | Writes to the user's repository | Needs a Git identity |
|---|---|---|---|
| **a. Record only (default)** | No: the record says how many files were uncommitted | No | No |
| b. Snapshot under its own ref (`refs/research-os/runs/<session>-<turn>`), branch and files untouched | Yes | Yes, every turn: objects and refs grow, including data files the `.gitignore` misses | Yes, or a fixed placeholder |
| c. Commit on the user's branch before the run | Yes | Yes: half-done work lands in history | Yes |
| d. Commit the run's results after it | The results, yes | Yes: unreviewed agent output in history, before you accept it (`SKILL.md:93-104`) | Yes |

**Default a.** Nobody commits automatically. On Accept, the root agent offers to
commit in the project's repository (`git -C projects-folder/<P> commit`), and you
decide, as today (`SKILL.md:95-96`). Decided on 2026-11-26: the app does not commit
on the user's behalf (§8 Q3).

**No Git identity.** Option a needs none, and neither does the bundle clone. An
Accept commit is another matter: on macOS, Git does not refuse it but writes the
account's name and the machine's host name into the commit (§3 "Git experiments";
Windows and Linux not tried). So before the root agent offers a commit, it shows the
name and email the commit would carry, and when none is set it shows the two `git
config` commands for the human to run and does not run them itself.

**Reversal.** Option b can be added later behind a workspace setting. The fields
stay, so old traces still read.

### 5.5 What an empty workspace template holds

The inventory and the check are in §4. Three findings shape it:

- **It cannot be only the three markers.** Handlers run hub scripts (§3). The root
  agent dispatches only through the skill links. The generator fails without a hub
  skill and the installer (scratch run).
- **Every workspace file a program needs has a stub with its shape.**
  `memory/MEMORY.md` is the case: the generator and the project manager read and
  write its tables. The stub is a new file with empty tables, not a cleaned copy of
  yours. So the import check can compare by content (§4).
- **The empty workspace must pass the generator** (§5.8 a).

### 5.6 Which repository the Code view reads

**Facts.** §3 Code view. Once a project has a plain `.git` folder, the handler
already reads it with filter `.` (`codeGit.ts:529-536`), and the end-to-end suite
already exercises that case (`app.test.ts:802-819`). **No handler change is needed
for nested repositories.** The workspace branch (`codeGit.ts:537-543`) stays for workspaces
made before step 3. For this instance it shows `nanochat_cpu`'s old history only
until `adopt`.

**What the workspace repository does about the nested folders.**

| Option | Cost | Breaks |
|---|---|---|
| **Ignored**, one line per project (`/projects-folder/<Name>/`, written by `new` and `adopt`) (default) | One line per project. A folder made by hand, without the manager, shows as untracked until it is adopted | Nothing known. A single `/projects-folder/*/` rule was considered and set aside: in this repository it would hide new files inside `nanochat_cpu` while that folder is still tracked (until W10) |
| Submodule | Each project needs a URL. A clone of the workspace cannot restore projects that have no remote | The Code view: a submodule's `.git` is a file, which the handler refuses (`codeGit.ts:407`) |
| Nothing | No rule | Every `git status` at the root lists each project as untracked. A `git add -A` or `git add .` at the root records the project as an embedded-repository entry (Git's documented behaviour; not run here, §9) |

**What a security review of any new Git write (init, clone, commit) must cover.** The
read handler's review is the model (`codeGit.ts:11-57`, `:923-1022`). The review must
cover each item below and pin each with a test, in CI, against hostile fixtures:

1. **Which repository.**
   - Explicit `--git-dir` and `--work-tree`, never discovery.
   - The target's real path lies in the workspace's `projects-folder/` (or is the
     new workspace).
   - Refuse a `.git` that is a link or a file, as `codeGit.ts:404-408` does.
2. **Which Git.** Absolute PATH entries only, not inside the workspace, and not the
   macOS Command Line Tools stub, which opens an install dialog
   (`os-ui/client/src/main/codeView.ts:21-33`). The harness's own lookup has no such
   check today (`core.py:119-131` covers only the agent CLIs).
3. **Configuration.**
   - Read no global or system config (`codeGit.ts:288-298`), except one explicit,
     read-only lookup of `user.name` and `user.email` when a commit is made.
   - `init.templateDir` would copy hooks into a new repository, so pass an empty
     `--template=`.
   - Neutralise these, each of which runs a program:
     - hooks: `core.hooksPath`, and `post-commit`, which `--no-verify` does not skip
       (Git's documentation; not run here);
     - `core.fsmonitor`;
     - clean filters from a `.gitattributes` an agent wrote. `codeGit.ts` uses
       `--attr-source` with the empty tree for its diffs; whether `git add` honours
       it the same way was not established, and the review has to show it;
     - signing: `commit.gpgsign` and `gpg.program`. Whether to keep the user's
       signing is a choice the review states.
4. **What gets committed.** Only what `.gitignore` allows, with caps on file count
   and size (`nanochat_cpu`'s `.venv` is 0.68 GB, `Code/README.md:22`). Never `.env`.
   Say what happens to links.
5. **Identity.** Never written. When it is absent, there is no commit and a fixed
   message.
6. **Concurrency.** No write while a turn runs in that folder: the Write Lease,
   `chat.ts:154-158`.
7. **Environment.** Every `GIT_*` variable dropped. Line-ending conversion off. Long
   paths on Windows.
8. **Bounds.** A timeout per command, output caps, and failures as fixed texts with
   Git's stderr to the log only (`codeGit.ts:33-34`).
9. **Twin.** The command-line path runs the same guards.
10. **Threat model, stated.** The harness's read before a `full` turn hands the same
    folder to an agent with a shell. The review says whether a hostile `.git/config`
    there needs more guarding than that already concedes. The app's reads on open,
    and `new_workspace.py`, need the full set.

### 5.7 Two repositories

**Facts.**

- The Product and workspace row says "this repository becomes one workspace
  instance" (`HANDOFF.md:788`). The Human Owner's decision of 2026-11-26 (§8 Q6)
  keeps that sentence and puts the product in a repository of its own, named
  SuperResearch OS; this repository keeps its name.
- The new repository is `SuperResearch-OS`, private at first (§8 Q12). This one is
  public on GitHub (read by the directing agent with `gh repo view`), so `human/`
  (without `human/private/`), `memory/`, and `HANDOFF.md` are published with it,
  history included.
- The app's displayed name is "Research OS" (`os-ui/client/electron-builder.yml:4`,
  `os-ui/client/package.json:3`). Its `appId` holds no repository name
  (`electron-builder.yml:3`). The Name row says "Unchanged: AI-Human Research OS"
  (`HANDOFF.md:800`).
- Today this repository holds the product's whole source and is the workspace a
  development run opens (`workspace.ts:43-47`).

**The form.** SuperResearch OS holds the product: the app, its plugins, the template
a new workspace is made from, the example, CI, and the product's development
record. This repository, AI-Human-Research-OS, holds your workspace: `human/`,
`memory/`, `ideas/`, `inbox/`, the paper wiki, your projects (each its own
repository), your skills and the mirrors, and the copies of product files that
every workspace has. §4 classes every file.

**The development record, file by file (default).** One rule: a record lives on the
side whose work it governs, once; the other side links to it.

| File | Goes to | How |
|---|---|---|
| `os-build/GOAL.md`, `README.md`, `index.md`, this file | product | Moved whole. `os-build/references/` stays here (§4) |
| `docs/adr/` (6), `docs/index.md`, `docs/presentAHROS.md` | product | Moved whole |
| `CONTEXT.md` | product | Moved whole. Its terms (Research Workspace, Paper Wiki) describe workspaces; this workspace's `AGENTS.md` links the product's copy |
| `CONTRIBUTING.md`, `CHANGELOG.md` (empty) | product | Moved. This workspace keeps its pull-request rule in its own `AGENTS.md` |
| `HANDOFF.md` | split | By section and decision group, at the import. Product: Active Work's "Repositioning" (`HANDOFF.md:22-277`), "Research OS construction" (`:279-338`), "os-ui — read-only monitor UI" (`:340-357`), "os-ui desktop client" (`:359-380`); the Decisions groups os-ui shell (`:442`), pi product-shell (`:479`), Direction (`:497`), route-map (`:555`), Project-management (`:572`), Route-map deletion (`:601`), Agent-harness (`:637`), Project-template (`:665`), Example-project (`:677`), Desktop client (`:717`), Positioning and architecture (`:747`); "Deviations" (`:807`) and "Intentionally not done" (`:838`) except their workspace items. Here: the normalization table D1-D10 and its follow-ups (`:418-440`), Research-environment (`:448`), circle_packing (`:461`), Orphan-skills (`:491`), Skill-management (`:505`), Paper-wiki (`:519`), map-then-territory (`:530`), Navigation-index (`:566`), Portfolio scope (`:659`), Paper reading-status (`:687`), CI gate (`:697`), Public site (`:708`), Mirror install form (`:738`). "Next session" (`:382-414`) is split by bullet: the environment facts of your machine (`:400-405`) and the `nanochat_cpu` acceptance (`:395-399`) stay; the rest moves. Each moved group leaves a one-line pointer here, and the reverse. The CI gate group stays because it governs this repository's `main`; the product's gate is a new row there (§8 Q20) |
| `memory/MEMORY.md` | here | Stays whole. Its Key Decisions rows about building the OS stay as this workspace's history; their eight links into product files become links to the product repository |

The Human Owner's quotations in moved rows move with them. They are already public
in this repository; the product repository is private until you say otherwise
(§8 Q17).

**This repository afterwards (a workspace like any other).**

- **Markers.** It still passes `workspace.ts:5`: its `AGENTS.md` (the workspace
  edition) and its copies of `os-harness/harness.py` and
  `os-ui/generator/generate.py` stay.
- **Product files that stay, as this workspace's copies:** the 65 B files of §4:
  the harness runtime (7), the generator (5), the project template (15), the five
  shipped skills (35), `.python-version`, `.env.example`, `LICENSE`. They are
  refreshed from the product, never edited here (§5.1).
- **Product files that leave:** the M, R, and product-side Dv files of §4 (285),
  in one pull request here after the product repository's CI has passed and you
  have built the app from it (W-R in §7). Until then both copies exist and the
  product repository's is the one that changes; this repository's are frozen.
  Their history stays in this repository's log. §8 Q17.
- **`AGENTS.md`.** The workspace edition: the "Read by task" rows for memory,
  projects, ideas, the paper wiki, the hub, and `human/`; the Human cognition
  section as it is; research integrity; maintenance and completion checks for this
  repository. The row "Build the Research OS" points to the product repository
  instead of `os-build/`. The template's workspace `AGENTS.md` (PR 6) is the same
  edition without this instance's lines.
- **`memory/MEMORY.md`.** Unchanged, apart from the links above. It keeps the
  portfolio and the Research Policy.
- **`README.md`.** A short page: what this workspace holds, how to open it in the
  app, and a link to the product repository. Today's product sections (Quick Start,
  Current Design Stance, Roadmap, Similar Projects) go to the product's README.
- **`FILETREE.md`.** Regenerated by `filetree-simple` from this repository's
  top-level entries; `os-ui/` and `os-harness/` keep entries for the workspace
  copies, `docs/` leaves.
- **`verify.sh`.** The workspace edition keeps the paper-wiki validation
  (`verify.sh:82-83`), the FILETREE lint (`:86-87`), the project contract (`:93-94`,
  with `--absent-ok` under CI from W5), and the installed-skills check (`:97-140`).
  The brand-copies check (`:142-154`) goes to the product.
- **The skills hub.** The product owns the canonical copy of the five shipped
  skills; their tests run in the product's CI. This repository's copies of the five
  are workspace copies, refreshed like the harness, and its links point at them as
  today. Every other skill (your own 68 files, `filetree-simple` and
  `session-handoff` among them) and the four mirrors stay canonical here. The
  installer keeps working here unchanged: it reads `research-skills-hub/` of the
  workspace it runs in.

**The product repository afterwards.**

- **`AGENTS.md`.** A development edition: how to build, test, and review the
  product; the record files; and one paragraph on the Human Owner's context (next
  point). It names no file of `human/`.
- **`README.md`.** Today's product sections, with the client's install steps.
- **`FILETREE.md`: none at first.** Its lint needs `filetree-simple`, which stays
  canonical here; the README's layout section and the per-directory `index.md` files
  are the map. Reversal: copy `filetree-simple` into the product as a development
  tool and generate one.
- **`verify.sh`.** The product edition: the brand-copies check, and the project
  contract and generator on the transitional workspace (§7), then on workspaces
  built by `new_workspace.py`. From PR 9 it has no paper-wiki
  validation and no installed-skills check, because the product repository then has
  neither; until PR 9 the transitional workspace's stub wiki and its five links are
  checked as this repository's are today.
- **The five skills** at their present paths, `research-skills-hub/open-paper-skills/<name>/`,
  so the template's manifest, `ci.yml`'s `discover` lines, and `desktop.yml`'s path
  filter keep their paths. The collection's `index.md` there lists only the five.

**Where sessions that build the product get `human/`.** `AGENTS.md` has every
session skim the cognition cache at startup and capture cognition at the end
("Human cognition"). The cache stays here, and nothing of it is copied into the
product repository.

- **Default:** the session that directs product work starts in this workspace, as
  this one does. It reads the cache at startup, writes each brief with what an
  implementing agent needs, and runs the capture at the end, here. Implementing
  agents work in a product checkout from the brief.
- The product's `AGENTS.md` says that the Human Owner's cognition cache lives in
  their workspace, not in this repository, and that a session started directly in
  the product works without it and creates none.
- **Where the product checkout lives:** a sibling folder of this checkout, outside
  both repositories. Nothing is nested, so nothing needs an ignore line, and no
  agent finds this workspace's `AGENTS.md` above the product's (whether agents look
  upward is not established, §5.8 e).
- **Cost for this session's agents.** Their worktrees are made under this checkout's
  `.claude/worktrees/` (shown: this revision's own), so they are worktrees of this
  repository. For product work the directing agent makes worktrees of the product
  clone itself (`git -C <product clone> worktree add <path> -b <branch>`) and hands
  the path to the implementing agent, as this brief handed a path.
- **Alternative:** start product sessions in the product checkout, with a line in
  your own user-level agent instructions that points at the cache. That file is
  yours; an agent writes it only on your word.
- **Reversal:** either way, nothing in either repository changes.

**The product repository's root is not a workspace.** It still holds `AGENTS.md`,
`os-harness/harness.py`, and `os-ui/generator/generate.py`, so it passes the three
markers (`workspace.ts:5`), and a development run would open it
(`checkoutOf`, `workspace.ts:43-47`, `:94-95`).

| Option | Cost | Breaks |
|---|---|---|
| **A. A rule that the product's source is not a workspace** (default): a folder that holds `os-ui/client/package.json` is refused with "This is the Research OS source, not a workspace" | One rule in `missingMarkers`, and its cases in `test/workspace.test.ts:26-29` | The checkout fallback then finds nothing in a product checkout. A development run opens `--workspace`, `OS_CLIENT_WORKSPACE`, or the saved folder (`workspace.ts:82-93`), else S1. The README's "npm start … open the app on this checkout" (`os-ui/client/README.md:79`, `:53`) changes |
| B. Drop `checkoutOf` | Removes the fallback and its tests | Same as A for development runs, but a user who opens the product folder by hand gets no clear refusal |
| C. A development workspace made on `npm start` with `new_workspace.py` in an ignored folder | A script and an ignore line | Needs PR 6 first |

During the transition (from the import to PR 9) the product root is a workspace on
purpose: the transitional workspace of §7, which holds no file of yours, so a
development run opens it. Option A lands in PR 9, with that workspace's removal.
You open your own workspace in a development build once with **Open a workspace…**;
from then on the saved folder is tried before the checkout (`workspace.ts:85`, `:94`).

**How the new repository is born.**

- **The import is an allowlist.** The files of §4's M, R, product-side and shared
  Dv, and B classes, at their present paths; the product editions of the 7 S files;
  the example's 73 files and its idea file; and the transitional workspace's stubs
  (§7, R3). The list is written once, kept in the import's record
  (`os-build/import.md` in the product repository: the source repository, its
  commit, the list, and the check's result), and checked by `import_check.py` (§4).
- **No history** (default, §8 Q15). The first commit holds the import's tree and no
  parent. Nothing of this repository's past, and so none of `human/`, `memory/`, or
  `HANDOFF.md` as it was, is in the new repository.
- **Who commits, and as whom** (§8 Q18). The directing agent prepares the tree in a
  scratch folder (a copy, no Git), runs the check and the rehearsal (§7 R1), and,
  on your go-ahead, makes the one commit in a fresh clone of the empty repository
  and pushes it. Before committing it shows the name and email the commit would
  carry. On macOS, Git with no identity set does not refuse a commit: it writes the
  account's name and an email made of the account's short name and the machine's
  host name (§3, "Git experiments"). So if none is set, nothing is committed until
  you set one. Default: your GitHub no-reply address, so no personal address enters
  the new history. This repository's recent commits carry personal addresses (shown
  by `git log`, not copied here).
- **What you do by hand on GitHub**, in this order (none of it can be done by an
  agent under this design's rules):
  1. Create `SuperResearch-OS`, private, empty: no README, licence, or ignore
     file, so the import is the first commit.
  2. Actions: enabled. Whether the account's plan runs `desktop.yml`'s six rows on
     a private repository is not established: macOS and Windows minutes count
     several times over against a private repository's quota, and the
     `ubuntu-24.04-arm` and `windows-11-arm` rows (`desktop.yml:51`, `:53`) use
     arm64 runners whose free use GitHub states for public repositories (GitHub's
     terms as recalled, not checked here). §8 Q20.
  3. The ruleset on `main` that requires the `checks` job, as this repository has
     (CI gate decision, `HANDOFF.md:697-706`). Whether a private repository on the
     account's plan can have one is not established. §8 Q20.
  4. The secret `CLAUDE_CODE_OAUTH_TOKEN`, if the two review workflows go along
     (`claude.yml:37`, `claude-code-review.yml:38`), and the Claude GitHub app on the
     new repository. These are the only `secrets.` references in
     `.github/workflows/*.yml` (shown by search).
  5. Pages: off. `pages.yml` stays here (§8 Q16).
  6. Nothing for the bot workflows: both stay here, with their settings (pull
     requests from Actions, auto-merge, `sync-mattpocock-skills.yml:79`).
- **Visibility later.** Making it public is yours to say; the Distribution row says
  free and open-source (`HANDOFF.md:765`).

**CI on each side (proposed).**

| Today (`ci.yml` unless named) | Product repository | This repository |
|---|---|---|
| Checkout, uv, pinned Python (`:35-42`) | yes | yes |
| `verify.sh` (`:44-45`) | its edition | its edition |
| Unit tests: paper-wiki-manager, research-project-manager, paper-search, research-skill-installer (`:51-54`) | yes: canonical source | no: copies of tested code |
| Unit tests: filetree-simple (`:55`) | no | yes |
| Unit tests: os-harness (`:57`) | yes | no |
| Unit tests: `.github/scripts` (`:58`) | no | yes: the scan script stays |
| `viz.html` regenerated (`:62-70`) | no | yes |
| `state.json` generates (`:74-75`) | on the transitional workspace, then on built workspaces (PR 6) | yes: this workspace, with its copies, still opens |
| Frontend type-check and build (`:77-87`) | yes | no, unless §8 Q16 keeps Pages building it |
| Endpoint tests (`:93-95`) | yes | no |
| New: client build, installer allowlist, template check (§4) | yes | no |
| `desktop.yml` (all steps) | yes | no |
| `pages.yml` | no | §8 Q16 |
| `claude.yml`, `claude-code-review.yml` | yes, with the secret | yes |
| `scan-related-projects.yml`, `sync-mattpocock-skills.yml` | no | yes |

What this repository's CI still checks once the product has left: the paper wiki
(validation and `viz.html`), the project contract with `--absent-ok`, the installed
skills, the FILETREE, the two skills' tests that stay, and that the generator still
reads this workspace.

**Links that cross the boundary.** Counted by a script over every tracked Markdown
file's relative links, after §4's classes (the third-party mirrors excluded; none
of the hub's other files links across):

| Direction | Links | Files |
|---|---|---|
| Product documents to workspace content | 7 | ADR-0006 → `related-projects.md` (1); `os-build/GOAL.md` → `memory/MEMORY.md` (1); `os-build/index.md` → `references/index.md` (1); `os-ui/DESIGN.md` → `research-skills-hub/MANAGING-SKILLS.md` (1); `os-ui/PLUGINS.md` → `nanochat_cpu/idea_graph.md` (1); `os-ui/README.md` → `pages.yml`, `memory/paper-sources.json` (2) |
| Workspace documents to product files | 13 | `memory/MEMORY.md` (8: `GOAL.md` 6, `CONTEXT.md` 1, ADR-0006 1); `ideas/idea_example/` (2, `GOAL.md`); `related-projects.md` (2: ADR-0006, `os-ui/README.md`); `projects-folder/index.md` (1, `os-ui/index.md`) |
| Template copies to product-only files | 4 | `os-harness/README.md` → ADR-0003; `os-harness/index.md` → `os-harness/tests`; `os-ui/generator/README.md` → `os-ui/DESIGN.md`; `project-dispatch/SKILL.md` → `CONTEXT.md` |
| Template copies to workspace-only files | 5 | `projects-folder/templates/index.md` → `memory/MEMORY.md`, `projects-folder/index.md`; `paper-search/SKILL.md` → `memory/paper-sources.json`; `research-skill-installer/SKILL.md` → `MANAGING-SKILLS.md`, the hub's ADR 0002 |
| Into `HANDOFF.md` | 27 | From product documents 17 (`os-ui/PLUGINS.md` 7, `GOAL.md` 4, one each from ADR-0006, `os-build/README.md`, this file, `os-ui/client/DESIGN.md`, `os-ui/frontend/README.md`, the PDF.js `vendor/README.md`); from workspace documents 10 (`memory/MEMORY.md` 8, `sepo-讲解与启发.md` 1, `projects-folder/index.md` 1) |
| Inside the split files | 116 | `HANDOFF.md` 52 (47 to product files, 5 to workspace files), `README.md` 43 (15, 28), `FILETREE.md` 11 (4, 7), `AGENTS.md` 10 (3, 7) |

What becomes of each kind (default):

- **The 20 one-way links between documents** become absolute links to the file in
  the other repository on `main`. A link from this public workspace into the
  private product 404s for anyone without access until it is public.
- **The 4 template links to product-only files** break in every workspace today
  already, this one included after the move. PR 6 makes them absolute links to the
  product repository.
- **The 5 template links to workspace files:** the three into `memory/` and
  `projects-folder/` resolve in every workspace (the template has those stubs). The
  installer's two links into the hub's own documents become plain text naming them;
  a new workspace has neither document.
- **The 27 links into `HANDOFF.md`** resolve to the edition on their own side. Each
  one whose row moved to the other side becomes an absolute link; which ones moved
  is checked row by row when the two editions are written (not established here).
- **The 116 inside split files** are rewritten with their edition: each keeps the
  links to its own side and turns the rest into absolute links.

**Pull-request numbers and commit hashes in moved documents.** With no history in
the new repository, a moved document's `#42` or `` `6a5ab1b` `` names this
repository's pull request or commit. Counted by pattern (a `#` and up to three
digits; a 7-to-40-character hex word in backquotes or after `git show`), so a few
are other repositories' commits, such as the example's OpenResearch `27cb342`:
`HANDOFF.md` 24 numbers and 25 hashes, `os-ui/PLUGINS.md` 7 and 9, `os-build/GOAL.md`
0 and 6, `os-build/README.md` 0 and 2, `os-ui/client/DESIGN.md` 1 and 0, ADR-0001 0
and 1, `os-ui/frontend/plugins/fixtures/` READMEs 0 and 11, the PDF.js
`vendor/README.md` 0 and 2, and this file. Code comments were not counted.

- **What they mean afterwards:** this repository keeps its name and its whole
  history, so every one of them stays resolvable here: `#42` at
  `github.com/<owner>/AI-Human-Research-OS/pull/42`, a hash with `git show` in a
  checkout of this repository. In the new repository the same `#42` would name a
  different pull request once it has 42, and `git show 6a5ab1b` fails there.
  Whether GitHub turns them into links in rendered files was not checked.
- **Default:** the moved text is not rewritten. The import's record
  (`os-build/import.md`) says that every pull-request number and commit hash in a
  document dated before the import refers to AI-Human-Research-OS, and gives the
  import's source commit. The moved `HANDOFF.md` and `os-build/README.md` repeat
  that line where they explain `git show`. After the import, new citations in the
  product name its own pull requests.
- **Reversal:** rewrite them as absolute links in one pass; the counts above say
  where.

### 5.8 Questions the brief did not list

a. **The generator fails on an empty workspace.** Shown on the scratch workspace:
   `generate.py:1188-1190` fails on zero portfolio rows, so a workspace made without
   the example opens on a failed snapshot (`generator.ts:53-61`).
   - **Default:** zero rows becomes a warning.
   - The other two rules stay, because the template satisfies them.
   - This workspace's CI is unaffected; its portfolio has a row. The product's CI
     needs it before the transitional workspace goes (PR 9), because workspaces
     built without the example then have none.
   - Must land before New workspace (PR 1, in the product repository).

b. **Untracking `nanochat_cpu` reds this workspace's required CI.** After the split
   this concerns only this repository; the product's CI never reads your portfolio.
   - Keep its portfolio row and `validate` reports `phantom_row` and
     `promoted_idea_without_project`.
   - Drop the row and the generator step (`ci.yml:74-75`, kept here, §5.7) fails
     until this workspace's generator copy has PR 1's rule.
   - Hence the refresh with PR 1 and PR 5 (W5) before W10.

c. **A project repository is dirty after every run.**
   - A nested repository does not use the workspace's ignore rules, so `*.log` and
     LaTeX output show as new files in it (`.gitignore:41`, `:46`;
     `nanochat_cpu/.gitignore:1-11`).
   - The template has no `.gitignore` at all.
   - **Default:** add `*.log`, the LaTeX outputs, `.env`, `.venv/`, `__pycache__/`,
     and `.DS_Store` to both (PR 4), before any `git init`.

d. **Skill links on Windows.**
   - The installer makes links with `symlink_to` (`install_research_skill.py:250-251`).
   - The end-to-end suite copies link targets on Windows, because a copied link can
     break there (`app.test.ts:57-63`).
   - Whether `new_workspace.py` can make links on a tester's Windows machine without
     Developer Mode was not established.
   - **Default:** try a link, fall back to a copy, and say so in the result.

e. **Do the agents still read the workspace's `AGENTS.md` inside a project
   repository?**
   - The project template says the root's `AGENTS.md` "applies as well" (`nanochat_cpu/AGENTS.md:53-56`).
   - How Claude Code and Codex look upward for instructions when the working folder
     is its own Git repository was not checked.
   - Probe: one `read-only` turn per agent in a nested repository, asking for a
     sentence only the root file holds (§9).

f. **The trust question.** It protects folders from elsewhere (`index.ts:241-254`).
   - A folder the app has just built from its own template needs no question.
   - **Default:** skip it for that folder alone, and add the folder to Open Recent.

g. **`project-dispatch` has to change.**
   - Its baseline and review read the workspace repository (§3).
   - With the project ignored there, they see no change at all.
   - **Default:** the baseline is the harness's start record plus `git -C
     projects-folder/<P> status --porcelain`; the review compares against that.
   - A project with no `.git` of its own keeps today's commands. That is this
     instance's `nanochat_cpu` until W10, and any project not yet adopted.
   - A change outside the project is still found with the workspace's own `git
     status`.
   - `H` goes through uv, not a bare `python` (§2 row 9).

h. **The harness finds Git differently from the app.**
   - The harness has no check for the macOS stub (point 2 of the review list).
   - On a Mac without the Command Line Tools, the first recorded turn would open an
     install dialog.

i. **Instance lines inside the example** (§3 `nanochat_cpu`). Ship them as they are,
   with the idea file, or ship an edition without them: §8 Q2. With two
   repositories the edition, if chosen, is written once in the product repository
   at the import, and your own copy here keeps its lines.

j. **The app's links point at this repository.** The Help link
   (`os-ui/client/src/main/index.ts:43`, this repository's `os-ui/client/README.md`),
   the About panel's website (`index.ts:442`), the package's `homepage`
   (`os-ui/client/package.json:14`), and today's welcome page (`StateMissing.tsx:5`)
   name this repository. After W-R the README they open is gone from here; pointed
   at the product repository, they 404 for anyone without access while it is
   private, a tester included. §8 Q19.

k. **Three names.** The Name row says "Unchanged: AI-Human Research OS"
   (`HANDOFF.md:800`); the app shows "Research OS" (`electron-builder.yml:4`); its
   Settings page says "AI-Human Research OS has no model of its own…"
   (`os-ui/frontend/src/pages/SettingsPage.tsx:17`); the product repository is now
   SuperResearch OS. Default: the displayed name stays "Research OS" and nothing in
   the app changes for the repository's name (§8 Q14).

l. **What a private repository changes** (§8 Q12, Q20): the required check, Actions
   minutes and arm64 runners for `desktop.yml`, Pages, the app's links (j), and who
   can download a run's installer artifact (people with read access; you send the
   file to the tester, as §1 already says). Each depends on the account's plan,
   which was not established.

m. **`pages.yml` needs both sides.** It builds the frontend (product) with this
   workspace's snapshot and `paper-wiki/` (`pages.yml:46-50`, `:59-63`), deployed
   from `autoreadpaper` (`:14-16`; its latest run succeeded on 2026-11-23, read with
   `gh run list`). Once the frontend leaves (W-R), it cannot build here as it is.
   What Pages publishes is yours (`HANDOFF.md:775`): §8 Q16.

n. **The development run opens the product checkout.** §5.7, "The product
   repository's root is not a workspace".

## 6. Every new or changed screen

The mockup is drawn from this list. Words in quotation marks are proposed text.
The clickable mockup is [os-ui/mockups/step3/workspace.html](../os-ui/mockups/step3/workspace.html).

**Chosen by the Human Owner on 2026-11-26** from that mockup, by accepting its three
recommendations (「全按推荐」): **S1 with S2, alternative A**, New workspace is a
separate step after Welcome, so one S2 serves Welcome and the File menu; **S5,
alternative A**, a turn shows its commit as a text line in the type of the lines
around it, not a chip; **S3, alternative B**, the File menu's item reads "Open
Workspace…". Where the text below still says a choice is yours, it is made. To
reverse one, build the other alternative from the same mockup.

Revised 2026-11-26 in two ways. The points where the mockup departed from this
list, and the gaps it found, are adopted here (each marked *adopted from the
mockup*); the words it suggested are adopted too. The split itself changes no
screen's behaviour: no screen of step 3 names a repository. **What the mockup must
change to match** is listed at the end of this section.

**S1. Welcome (no workspace open).**

- **For:** a first start, or a start after the saved folder became unusable.
- **When:** no folder is saved, or the saved one fails the markers
  (`workspace.ts:74-96`). Today's version is `StateMissing.tsx:40-92`.
- **Shows:**
  - the title "Start with a workspace";
  - the sentence "Research OS has no model of its own: it starts your own Claude
    Code or Codex, on your own plan." (the Distribution row's first-run sentence,
    `HANDOFF.md:765`);
  - the problem with the saved folder, if there is one;
  - the prerequisite rows (S4), as they read before any workspace is open: no
    Folder row; Claude Code and Codex read "Checked once a workspace is open." in
    the neutral state, not today's "error" with "Needs a Research OS folder and
    Python to check." (`doctor.ts:108-111`); the header says "ready" when uv or
    Python and Git are found, since nothing else can be checked yet.
- **Where a workspace comes from.** S1 names no repository and has no link to clone
  one. Today's "No folder yet? Get the Research OS and clone it first", which links
  this repository (`StateMissing.tsx:5`, `:57-63`), is gone: after the split, that
  link would hand a user your workspace. A workspace comes from **New workspace…**,
  or is one the user already has, opened with **Open a workspace…**.
- **Can do:** **New workspace…** (opens S2), **Open a workspace…** (today's folder
  picker), and **Check again** on the prerequisites, which renames today's
  "re-check" (`DesktopStatus.tsx:78`).
- **Failures:**
  - *No Git:* New workspace is disabled, beside "Git is needed for projects and
    runs. Install it, then Check again.", with the Git row's link, which keeps
    today's text "How to install" (*adopted from the mockup*). Open still works.
  - *No uv or Python:* both buttons are disabled with today's row text and a link
    to uv's installation page in place of python.org; nothing runs without Python.
  - *No Git identity:* nothing changes here (S4 shows it).
  - *Folder not empty:* not applicable.

**S2. New workspace.**

- **For:** creating a workspace.
- **When:** from S1, or from File → **New Workspace…** (S3). From the menu it is a
  dialog over the open workspace, and **Cancel** returns there. Whether S2 is a step
  after S1 (alternative A, the mockup's recommendation) or part of S1's card (B) is
  your choice in the mockup; in B the form has no **Cancel**, because there is
  nothing to go back to (*adopted from the mockup*).
- **Shows:**
  - the heading "New workspace" (*adopted from the mockup*);
  - a field labelled "Folder", with **Choose…**. The folder may not exist yet; if
    it exists, it must be empty, hidden files included;
  - a ticked box "Add the example project nanochat_cpu (a three-minute training
    run; it downloads about 0.4 GB when you run it)";
  - under the label "Will be written" (*adopted from the mockup*), a short list:
    "agent scripts, five skills, empty memory, ideas, inbox and paper wiki, the
    project template, and the example as its own Git repository". With the box
    unticked it ends "…, and the project template" (*adopted from the mockup*);
  - the line "The workspace and the example are Git repositories. Nothing is
    committed under your name."; unticked, "The workspace is a Git repository.
    Nothing is committed under your name." (*adopted from the mockup*);
  - the prerequisite rows (S4), as on S1 (*adopted from the mockup*: S4 already
    said its rows appear inside S2);
  - **Create** and **Cancel**.
- **While creating:** a line of progress ("Copying files…", "Making the example's
  repository…", "Reading the workspace…"; unticked, without the second). **Create**
  and **Cancel** are both disabled (*adopted from the mockup*).
- **After:**
  - success: the app opens the new workspace on Home;
  - failure: the progress stops, and the screen stays with the message and
    **Show log**.
  - The folder is built under a temporary name beside the target and renamed at the
    end, so a failure leaves nothing at the chosen path.
- **Failures:**
  - *No Git:* **Create** is disabled with S1's sentence.
  - *No uv or Python:* **Create** is disabled with the row's text and uv's link.
  - *Folder not empty:* "This folder is not empty. Choose an empty or new folder.";
    **Create** is disabled. The app never writes into a folder with files in it.
  - *No Git identity:* nothing is blocked, because no commit needs it. The line
    under the list reads "Your Git name and email are not set; you will need them to
    commit your own work (see Git name and email below)." On a first start there is
    no Settings page to point to, and the row is on the same screen (*the mockup's
    suggested words*).
  - *Cannot write there:* found when **Create** runs, not when the folder is
    chosen: the progress stops, and "Research OS cannot write to this folder:
    <reason>." shows with **Show log** (*adopted from the mockup*).
  - *Folder inside another Git repository:* a warning, not a block: "This folder is
    inside the Git repository at <path>; the new workspace will be a repository
    inside it." **Create** stays enabled.

**S3. File menu.**

- **For:** reaching S2 when a workspace is already open.
- **Shows:** "New Workspace…", with the shortcut CmdOrCtrl+N (⌘N on macOS), above
  today's "Open Research OS Folder…" (`menu.ts:56`). The menu uses CmdOrCtrl+O and
  CmdOrCtrl+Shift+R today (`menu.ts:56`, `:67`); whether the renderer binds
  CmdOrCtrl+N was not checked.
- **Your choice in the mockup:** the Open item keeps "Open Research OS Folder…" (A)
  or becomes "Open Workspace…" (B, the mockup's recommendation, so that the menu and
  S1 name the same thing the same way) (*adopted from the mockup*).
- **Can do:** open S2.
- **Failures:** as S2.

**S4. Settings → prerequisites (changed rows).**

- **For:** seeing what is missing.
- **When:** in Settings, and inside S1 and S2.
- **Shows:**
  - **Git** becomes required, "needed for projects and runs; the Code tab's
    Changes needs 2.45 or later" (today `doctor.ts:101-105`). The tiles' "ready"
    then needs Git too; today's rule needs only the folder, Python, and one agent
    (*adopted from the mockup*);
  - a new row, **Git name and email**: *ok* with the two values, or *not set* with
    the two lines `git config --global user.name "Your Name"` and
    `git config --global user.email "you@example.com"` and the button "Copy the two
    lines" (*adopted from the mockup*; the placeholders are its suggestion). It is
    not required. The app never sets them.
- **Can do:** copy the two lines, and **Check again**.
- **Failures:** *No Git:* the Git row is *missing* and the identity row reads
  "needs Git". *No uv or Python:* as today, with uv's link.

**S5. Conversation turn lines (changed).**

- **For:** showing the commit a run started and ended on.
- **When:** in every conversation, Home's root agent and each project's. The root
  agent's turns read "no commit yet" until you commit in the workspace's own
  repository, because a new workspace starts with no commit (§8 Q5, decided).
- **Shows:**
  - under the existing "model · login" line of a turn (`AgentChat.tsx:714-719`),
    in that line's size and font but the muted colour, not its faint one (*adopted
    from the mockup*): "on c4d4a85 · clean", or "on c4d4a85 · 3 changed, 1 new", or
    "no commit yet", or "not a Git repository", or "Git not found";
  - after "done · 12.3 s" (`:720-725`): "ended on c4d4a85 · <n> changed, not
    committed", with ", <m> new" before "not committed" when the turn leaves
    untracked files, or "ended on 9f1e2b0 (new commit)" when the agent committed.
    The counts are whatever the run left; which files a real run of the example
    changes was not established. A turn with no commit, no repository, or no Git
    repeats its start words after "done" (*adopted from the mockup*).
- **Can do:** click the short hash to copy the full one (the mockup keeps it, in
  both alternatives).
- **Failures:**
  - *No Git:* "Git not found"; the turn runs as before.
  - *No uv or Python:* no turn starts. In a workspace that already has a snapshot,
    the conversation's existing error shows; where no snapshot can be made, the app
    stays on today's "Preparing the snapshot" card (`StateMissing.tsx:49`) and no
    conversation is reachable (*a gap the mockup found*).
  - *Folder not empty:* not applicable.
  - *No Git identity:* nothing changes; recording needs none.
  - A trace from before step 3 has no field and shows nothing.

**S6. Home with no projects (changed).**

- **For:** a workspace made without the example.
- **When:** the portfolio is empty.
- **Shows:** under **Projects**, "No projects yet. Ask the root agent to start one,
  for example: Start a project called …".
- **Can do:** use the root-agent bar as today.
- **Failures:** none of its own. No Git or no uv or Python shows as on any Home
  today; a non-empty folder and a missing Git identity do not apply.

**Not a screen of step 3, but changed by the split:** the Help link and the About
panel's website, which name this repository today (§5.8 j, §8 Q19), and the
Settings sentence "AI-Human Research OS has no model of its own…"
(`SettingsPage.tsx:17`), which stays unless you rename the app (§8 Q14). The card
of the shipped example shows this workspace's lines to a tester (§8 Q2).

**What the mockup must change to match this section:**

1. S2's identity line ends "(see Git name and email below)." instead of "(see
   Settings)".
2. S1 and S2 before a workspace is open: no Folder row; Claude Code and Codex read
   "Checked once a workspace is open." in the neutral state; the header's "ready"
   counts only uv or Python and Git.
3. S5's end line gains ", <m> new" when the turn leaves untracked files, and one of
   the line choices shows such an end line.
4. File → New Workspace… shows the shortcut ⌘N.
5. Every sentence of §6 ends with a full stop: S1's sentence, the No Git line, Folder
   not empty, the two Git lines, the identity line, Cannot write there, and the
   nested warning.
6. The No uv or Python link goes to uv's installation page, not python.org.
7. The identity row's two lines read `user.name "Your Name"` and
   `user.email "you@example.com"`.

Everything else the mockup draws now agrees with this section, the end count "3
changed" included, which is a sample of "<n> changed".

## 7. Build sequence

Revised for two repositories, in the order the Human Owner asked for: the new
repository is created and the product imported early, and step 3's product pull
requests land there (§8 Q13). Steps marked **R** make the new repository; **W**
steps are pull requests in this repository; numbered PRs are in the product
repository. Each pull request leaves its repository's `ci.yml` green.

**Word** marks a step that creates or changes a repository, moves or untracks
tracked files, or changes what CI runs or what the installer contains: it waits for
your explicit yes at the moment it is done, even where you agreed to its direction.
Every pull request that adds a page or changes one waits for your choice from the
mockup.

**Making the new repository.**

| Step | Where | What | Acceptance | What you can check | Word |
|---|---|---|---|---|---|
| R0 | here | `step3-design` (this file and the mockup) merges into `main` through its pull request, so the import carries the design | `ci.yml` passes | You read the merged design | no (documents) |
| R1 | scratch | **Rehearsal.** The directing agent copies the allowlist (§5.7) and the transitional workspace (R3) into a scratch folder, with no Git, and runs there the product's editions of `verify.sh`, the unit tests, the generator, the frontend build, the endpoint tests, and the end-to-end suite once, plus `import_check.py` (§4) | Every step passes, or each failure is named and fixed in the allowlist or the stubs. Which of today's frontend and client tests read the checkout's own `memory/`, `paper-wiki/`, or `HANDOFF.md` is not established (§9); this run settles it | The run's summary | no (scratch only) |
| R2 | GitHub | **You create `SuperResearch-OS`** and set it up by hand: the six items of §5.7, "What you do by hand on GitHub" | The empty private repository exists; Actions are on | It is listed under your account | **Word**, and your own hands |
| R3 | product | **The import.** One commit with no parent (§5.7, "How the new repository is born"): the allowlist at today's paths; the product editions of the S files, `HANDOFF.md`'s included; `os-build/import.md`; and a **transitional workspace** at the root, made by hand once from what `new_workspace.py` will write (§2 answer 2): stub `memory/` with the example's one portfolio row, stub `ideas/` with the example's idea file, stub `inbox/` and `paper-wiki/`, `projects-folder/index.md`, `projects-folder/nanochat_cpu/` (the example's 73 files), and `.claude/skills` and `.agents/skills` links to the five. It holds no file of yours, which `import_check.py` proves, and it lets every CI step and the end-to-end suite run as they do here today | `import_check.py` passes; the product's CI passes on the first commit | You see one commit in the new repository and read `os-build/import.md` | **Word** |
| W3 | here | This repository's record edition, the same day: `HANDOFF.md` without the moved groups, each replaced by a one-line pointer; `AGENTS.md`'s "Build the Research OS" row and the README point to the product repository | `./verify.sh` passes | You read both `HANDOFF.md` editions side by side | **Word**, with R3's |
| R4 | product | **Your build from the new repository.** You clone it beside this checkout, run `npm ci` and `npm start` in `os-ui/client`, and open this workspace with **Open a workspace…** (a development run opens the transitional workspace first, §5.7). If you have not yet run the client checklist on macOS (`HANDOFF.md:389-391`), this is that run; it also settles P6 for macOS (`HANDOFF.md:373-376`). Then the ruleset of §5.7 item 3, if the plan allows it | The app builds and shows your workspace's Home; with the checklist, every box ticked or a failure reported with `main.log` | The checklist | yours to run |

**Step 3, after the import.** The PRs keep their numbers; PR 10 becomes W10.

| PR | Where | What | Acceptance (CI) | What you can check | Word |
|---|---|---|---|---|---|
| 1 | product | Generator: zero portfolio rows is a warning | A new unit test runs the generator on an empty workspace and expects exit 0 | none visible | **Word**: adds a test line to `ci.yml` |
| 2 | product | Harness records the repository state at a turn's start and end (§5.4), with the read guards of §5.6 and the stub check (§5.8 h) | New offline tests: clean, changed, no commit yet, no repository, a project without `.git` inside a workspace with one, no Git; the existing 18 offline tests still pass | none visible | no (the existing `discover` line runs the tests) |
| 3 | product | S5 in the conversation, after the mockup | An end-to-end case: a project repository with one commit; a turn shows "on <short> · clean" | A checklist line: send a project turn, read the line | no |
| 4 | product | `.gitignore` for the project template, and the example's gains the rules of §5.8 c | `./verify.sh` passes | none | no (edits, no moves) |
| 5 | product | `research-project-manager`: `new` runs a guarded `git init` (no commit) and writes the project's ignore line; `adopt <Name>`; `validate --absent-ok`. `project-dispatch` text: `H` through uv; baseline, review, and Accept in the project's own repository when it has one, today's commands when it has none | Unit tests in the skill's `scripts/`: hostile fixtures (hooks, `fsmonitor`, a `.gitattributes` filter, a `.git` file or link, a templateDir); a project absent from a checkout passes with the flag and fails without it | none until W5 | **Word**: changes what the skill checks |
| W5 | here | **First refresh**, by hand: this workspace's copies of the files PRs 1, 2, 4, and 5 changed (each PR lists them; the refresh command does not exist yet); this workspace's `verify.sh` passes `--absent-ok` when `CI` is `true` | `./verify.sh` passes; the pull request names the product commit | Turns run here record their commit once the harness copy has PR 2, and show it in an app built with PR 3 | **Word**: changes what `verify.sh` checks in CI |
| 6 | product | `os-ui/workspace-template/`: manifest (naming the example at `projects-folder/nanochat_cpu/` of the transitional workspace for now, and marking which files are copies), stubs, the workspace `AGENTS.md`, `new_workspace.py` with `--build-example-bundle` and `--refresh`, and the checks of §4 (workspace works; the builder reads only its own repository) | `ci.yml` builds the example's bundle and two workspaces into temporary folders and checks them | none visible | **Word**: new `ci.yml` step |
| 7 | product | `build.mjs` assembles `out/workspace-template/` and calls `new_workspace.py --build-example-bundle`; `electron-builder.yml` copies it with `extraResources`; the installer allowlist check runs on `out/` and `electron-builder.yml` in `ci.yml` | The bundle builds on two `desktop.yml` rows with the same hash; the allowlist check passes in `ci.yml` | none visible | **Word**: changes what the installer contains and what CI runs |
| 8 | product | S1, S2, S3, S4, S6 after the mockup; the trust question skipped for a folder the app made | End-to-end cases: S2 makes a workspace with the example, Home shows the card, a project turn shows S5's line; each S2 failure (no Git, folder not empty) | Checklist lines for New workspace, its failures, and the Settings rows | no |
| 9 | product | End-to-end and packaged cases build their workspace with `new_workspace.py`; the smoke pattern names real cases; the transitional workspace leaves the root and the example moves to `os-ui/workspace-template/examples/` (§5.3); the rule that the product's source is not a workspace (§5.7, option A) | The three full rows pass; the packaged rows run the cases they name; a development run of a product checkout shows S1 | none | **Word**: changes what CI runs and moves the example |
| W9 | here | **Second refresh**, with `new_workspace.py --refresh` from a product checkout at PR 9 | `./verify.sh` passes; the pull request names the product commit | none | **Word** |
| W10 | here | This workspace's `nanochat_cpu`: `git rm --cached -r projects-folder/nanochat_cpu`; `adopt nanochat_cpu`, which writes its ignore line; a runbook for `adopt` on each of your machines | This repository's whole `checks` job passes on a checkout without the folder: `./verify.sh` with `--absent-ok`, and also the generator step and the frozen frontend and endpoint tests, which still run here until W-R. Whether those two pass with a portfolio row whose folder is absent was not established; if not, W10 waits for W-R. On your machine, `./verify.sh` passes after `adopt` | You run the runbook, open the app on this repository, and see `nanochat_cpu`'s Code tab list your first commit | **Word**: untracks tracked files |
| 11 | product | Tester sheet; client README "What you need" and checklist; `DESIGN.md` §0, §4, §8 for Git required and the new write; the product's `HANDOFF.md` by the directing agent | Links resolve | You read the tester sheet | no |
| W-R | here | Product files leave this repository: the M, R, and product-side Dv files of §4 (285); this repository's editions of `README.md`, `verify.sh`, `ci.yml`, `.gitignore`, `.gitattributes`, and `FILETREE.md`; the links of §5.7 rewritten; `pages.yml` as you answer §8 Q16 | `./verify.sh` and this repository's CI pass; the app opens this workspace from an installer built in the product repository | You open this workspace in the app built from SuperResearch OS | **Word**: deletes tracked files here (their history stays) |

**After PR 11 and W-R:**

1. You run the client checklist on macOS against a new workspace made by the app.
2. On your word, a tester receives one CI artifact of the product repository,
   downloaded and sent by you. Before that, the example should be run once on the
   tester's OS (§8 Q9).

**Other work in flight, placed.** No pull request was open on 2026-11-26 (`gh pr
list`); every branch named in `HANDOFF.md` Active Work up to #60 is merged.

- **The macOS checklist run** ("a fresh build of `main`", `HANDOFF.md:389-391`):
  at R4, on the product repository's first `main`, unless you run it on this
  repository's `main` before R3. It does not hold R1 to R3.
- **P6**, the checklist on each OS (`HANDOFF.md:373-376`): product side, on builds
  from the product repository, any time after R4.
- **S8**, deleting `os-ui/frontend/src/desktop/` (`HANDOFF.md:72-73`): a product pull
  request after the checklist run, whose hold it waits for (`HANDOFF.md:775`). If
  the checklist runs here before R3, S8 may land here first, and the import is then
  smaller by that folder.
- **2.6**, loading a plugin from a local folder (`HANDOFF.md:256-257`, waiting on
  Q-PO1, `:76-79`): a product pull request, whenever Q-PO1 is answered; it does not
  depend on step 3's order.
- **A branch still unmerged at R3** is carried as patches: `git format-patch` here,
  `git am` in the product clone. Paths are kept, so the patches apply without shared
  history.

**The other order: built here, then imported.** PRs 1 to 9 and 11 land in this
repository as first written; R1 to R3 follow PR 11. The import then carries a
product that already builds its own workspaces, so its first commit needs no
transitional workspace, and option A of §5.7 can land before the import. The costs:
every step 3 change is made in a repository that is about to stop holding the
product, and then copied out; the new repository waits for about ten pull requests,
against your "as soon as possible" (Q13); step 3's pull-request numbers and commits
are this repository's, so the product cites them across repositories from its first
day; and the refreshes (W5, W9) are not needed, because the product's files here are
the source until the import. For this session's agents it is cheaper: they keep
working in this checkout with the worktrees they use today until R3.

## 8. Questions for the Human Owner

Seven are decided, in the Human Owner's words of 2026-11-26. Each open one has a
default that holds if you do not answer, and a way back. Q12 and Q13 are the
directing agent's questions D and E, which the split raised.

Their answer to the six questions, verbatim: 「1 接受默认，你可以参考OpenResearch
的做法，默认带一个nanochat的demo，3接受默认，你也可以参考OpenResearch的做法，5接受 7
接受默认 D  SuperResearch-OS 先private  E 接受默认，但是我建议尽快新建仓库」

1. **Where does the tester's `nanochat_cpu` come from? Decided:** inside the app; a
   nanochat demo is there by default (「1 接受默认，你可以参考OpenResearch 的做法，默认带一个nanochat的demo」).
   How OpenResearch ships its demo is in §3; what this design takes from it is
   marked as suggestions in §5.3, apart from the decision.
   - **How it is written (this design's default):** one ready-made commit in the
     installer that New workspace unpacks when the box is ticked. It needs no Git
     name and no network, and every machine gets the same commit for the same build.
   - **Alternative for the build PR:** built on the user's machine from embedded
     files with a fixed identity and date, as OpenResearch does (§5.3).
   - **Reverse:** drop the bundle from the installer and the box from S2.

2. **Is the example shipped as it is?** Open. Three lines name you or this workspace:
   `Started` links to your idea file; `Origin` says you asked for it; an open to-do
   names your review and a session. The project card shows them to a tester:
   "awaiting Human Owner review" and "…also completes GOAL.md H2", in a workspace
   with no `GOAL.md` (`PROJECT_MEMORY.md:19`, `:38`; the mockup draws them).
   - **Default:** as it is, with a copy of its idea file. No research record is
     edited, and `validate` passes.
   - **Alternative:** an "example edition" with those lines rewritten, written once
     in the product repository at the import (R3); your own copy here keeps its lines.
   - **Reverse:** write the edition later; the bundle is rebuilt from it.

3. **Does the app ever commit for the user? Decided:** no, the default
   (「3接受默认，你也可以参考OpenResearch的做法」). Runs only note the commit they
   started and ended on and what was left uncommitted. The example arrives already
   committed. A new workspace and a new project start with no commit. Commits stay
   yours, offered by the root agent when you accept a run. OpenResearch's app makes
   no commit per run or per turn either; its agent commits (§3). A suggestion from it
   for later, not decided: record the merge-base with a baseline at a turn's end, so
   a turn's diff can be rebuilt from recorded hashes alone.
   - **Reverse:** add a snapshot under its own ref behind a setting; old traces still
     read.

4. **When the user has no Git name and email.** Open.
   - **Default:** nothing is blocked, because nothing commits under their name.
     Settings shows the two lines to set them, and the app never sets them.
   - **Alternative:** S2 refuses to create a workspace until they are set.
   - **Reverse:** one condition on **Create**.

5. **Is a new workspace itself a Git repository? Decided:** yes (「5接受」).
   `git init`, no commit, projects ignored. So the root agent's turns read "no commit
   yet" until the user commits in the workspace's own repository (S5).
   - **Reverse:** drop the init step from `new_workspace.py`.

6. **One repository with two roles, or two repositories? Decided: two.** The
   product moves to a new repository named SuperResearch OS; this repository keeps
   its name, AI-Human-Research-OS, and is from now on your workspace. The Human
   Owner's words, in order:
   1. On this question: 「本仓库主要作为产品源码，我的工作区相关的文件可以放在human
      这个文件夹下；你来评估一下，如果拆成两个仓库更合适的话可以拆」.
   2. Then: 「那就拆成两个仓库，把research os 客户端的仓库命名为SuperResearch OS」.
   3. Then, correcting the directing agent, who had read that as renaming this
      repository: 「SuperResearch OS 是客户端的仓库的名字，本仓库可以继续保留AI-Human-Research-OS的名字不用动」.
   4. Asked "this repository is from now on your workspace, and the product's source
      moves to the new repository, right?": 「对」.

   That is the Product and workspace row as written ("this repository becomes one
   workspace instance", `HANDOFF.md:788`), with the product in a repository of its
   own. The design's earlier default, one repository with two roles, is withdrawn.
   - **Reverse:** import the product back into this repository and archive the new
     one; the separation check of the old design would then be needed again.

7. **This repository's `nanochat_cpu`. Decided:** the default (「7 接受默认」). Restated
   for two repositories: your `projects-folder/nanochat_cpu/` stops being tracked in
   this workspace repository and becomes its own repository, and you make its first
   commit (W10). Its earlier history stays in this repository's log. Your other
   machines need the runbook once. The example's source is a copy in the product
   repository, so the old question whether a product copy may sit here is gone.
   - **Reverse:** track `projects-folder/nanochat_cpu/` again and remove its ignore
     line.

8. **Which skills ship in a new workspace?** Open.
   - **Default:** the five the app and the root agent need: project-dispatch,
     research-project-manager, research-skill-installer, paper-search,
     paper-wiki-manager. Their canonical copy is in the product repository (§5.7).
   - **Alternatives:** more of your own skills (about 1.6 MB with these five), which
     would first have to be copied into the product repository, so that each then
     has two copies to keep in step; or the whole hub (41 MB, with third-party
     licences to review).
   - **Reverse:** one list in the manifest, and the files copied into the product.

9. **What the tester sheet asks for, and on which computer.** Open. The Decisions
   name uv and Python. The path also needs Git, Claude Code or Codex signed in, bash
   (from Git for Windows on Windows), network for about 0.4 GB, and about 1 GB of
   disk. The example has been run only on Windows. While the product repository is
   private the tester cannot read its README, so the sheet is all they have.
   - **Default:** the sheet lists all of them and stands alone. Before the tester
     gets the file, the example runs once on the tester's OS, by you or by a CI job.
   - **Reverse:** shorten the sheet.

10. **Should this workspace's CI still fail when your portfolio lists a project CI
    cannot see?** Open. Only this repository's CI meets the case now (§5.3).
    - **Default:** no. Its CI warns ("not in this checkout"); your own machine still
      fails on a missing project folder. The flag lives in `research-project-manager`,
      so any user's workspace kept in Git can use it.
    - **Reverse:** remove the flag from this workspace's `verify.sh`, which then means
      dropping that row from tracked files.

11. **The packaged-app check names three cases but runs two** (§3). Open.
    - **Default:** PR 9 names the case "opens Home with a freshly generated
      snapshot" in place of the stale name.
    - **Reverse:** one pattern in `desktop.yml`.

12. **(D) Is the new repository public or private? Decided:** private at first, and
    named `SuperResearch-OS` (「D  SuperResearch-OS 先private」), which also settles
    the spelling (a name cannot hold a space). When it becomes public is yours to
    say; the Distribution row says free and open-source (`HANDOFF.md:765`). §5.8 l
    and Q20 list what private changes.
    - **Reverse:** change its visibility on GitHub.

13. **(E) When is the new repository created? Decided in direction:** soon
    (「E 接受默认，但是我建议尽快新建仓库」). §7's order follows: the repository is
    created and the product imported early, and step 3's product pull requests land
    there. Creating it (R2) and the import (R3) each still wait for your explicit
    go-ahead at the moment they are done; R2 is yours to do on GitHub.
    - **Reverse:** the other order of §7, built here and imported after PR 11.

14. **Does the app's displayed name change?** Open.
    - **Default:** no. The app stays "Research OS" (`electron-builder.yml:4`), and
      SuperResearch OS is the repository's name. The Name row stands (`HANDOFF.md:800`).
    - **Alternative:** rename the app SuperResearch OS: `productName` in two files,
      the window and menu titles, the Settings sentence (`SettingsPage.tsx:17`), and
      the mockups.
    - **Reverse:** the same few lines.

15. **Does the new repository start without history?** Open.
    - **Default:** yes. One commit holding the import (§5.7), so nothing of yours is
      in its past.
    - **Alternative:** a filtered copy of this repository's history limited to the
      product's paths. Old versions of moved files would come along, and every path
      ever tracked would have to be checked for your content first.
    - **Reverse:** none once others have cloned it; before that, replace the
      repository.

16. **What does GitHub Pages publish once the product leaves?** Open; yours
    (`HANDOFF.md:775`). `pages.yml` builds the frontend with this workspace's
    snapshot and paper wiki from `autoreadpaper` (§5.8 m), so it cannot build here
    after W-R as it is.
    - **Default:** from W-R, Pages publishes the paper wiki's own viewer
      (`paper-wiki/`) alone, the plan the Existing milestones row already names for
      when the old shell goes (`HANDOFF.md:799`). W-R waits for your word on it.
      Whether `viz.html` works on its own as a site was not established.
    - **Alternatives:** the product page you planned (`HANDOFF.md:775`), from the
      product repository once public; or keep today's site by building the frontend
      from a product checkout inside `pages.yml`.
    - **Reverse:** restore `pages.yml` from Git history.

17. **The development record, and product code here after the move.** Open.
    - **Default:** as §5.7 tabulates: the design record moves to the product
      repository, `HANDOFF.md` is split by group with pointers both ways, and your
      quotations move with their rows into the private repository. This repository
      keeps a frozen copy of the product files only until W-R, then only its B
      copies.
    - **Alternatives:** keep `HANDOFF.md` whole here and start an empty one in the
      product; or keep all product files here, frozen, after W-R.
    - **Reverse:** move a group back; restore deleted files from this repository's
      history.

18. **Who makes the import's commit, and as whom?** Open.
    - **Default:** the directing agent, on your go-ahead, after showing the name and
      email the commit would carry: your GitHub no-reply address. With no identity
      set, nothing is committed (§5.7).
    - **Alternative:** you make the commit yourself from the prepared folder.
    - **Reverse:** before anyone clones it, replace the commit.

19. **Where do the app's links go while the product repository is private?** Open.
    The Help link, About's website, and the package's homepage name this repository
    today (§5.8 j).
    - **Default:** at the import they point at the product repository. They work
      for you; a tester gets a page they cannot open, so the tester sheet carries
      what they need (Q9).
    - **Alternative:** remove the Help link until the repository is public.
    - **Reverse:** one constant each.

20. **What does the account's plan allow on a private repository?** Not
    established; you can see it on GitHub. It decides: a ruleset requiring the
    `checks` job (the CI gate decision, `HANDOFF.md:697-706`), the minutes for
    `desktop.yml`'s macOS and Windows rows, and whether the two arm64 rows run.
    - **Default:** the same gate as here if the plan allows it. If not, agents still
      open pull requests and merge only green ones, without enforcement, until the
      repository is public. `desktop.yml` keeps its six rows; a row that cannot get a
      runner is reported after the first run, and dropping it is yours.
    - **Reverse:** turn the ruleset on when it becomes possible.

21. **Where do sessions that build the product start?** Open.
    - **Default:** in this workspace, as today, with the product clone as a sibling
      folder; the directing agent makes product worktrees and briefs (§5.7).
    - **Alternative:** in the product clone, with a pointer to your cognition cache
      in your own user-level agent instructions, written only on your word.
    - **Reverse:** start the next session in the other place.

## 9. Contradictions, impossibilities, and what was not established

### Contradictions and impossibilities found

1. **The Git row against the client.** Git is required (`HANDOFF.md:790`). The
   client's design, README, doctor, and end-to-end header still call it optional
   (`DESIGN.md:553-558`, `:650`; `os-ui/client/README.md:20`, `:23`;
   `doctor.ts:101-105`; `app.test.ts:2-3`).
2. **The client's scope against New workspace.** "Adds no new write action on
   repository content" (`DESIGN.md:27-35`). New workspace is such an action; PR 11
   updates the text under the Product and workspace row.
3. **An empty workspace fails the generator** (`generate.py:1188-1190`), shown on a
   scratch workspace, while New workspace makes empty workspaces.
4. **Untracking `nanochat_cpu` reds this workspace's required CI either way**
   (§5.8 b). After the split the product's CI is not affected.
5. **`project-dispatch` against nested repositories.** It reads the workspace
   repository for its baseline and review (`SKILL.md:31-34`, `:83-85`), which sees
   nothing of an ignored project.
6. **`research-project-manager` against the Project repositories row.** Its text says
   commits happen at session end and importing a repository is out of scope
   (`SKILL.md:100-106`). The row makes `new` initialize a repository.
7. **Bare-CLI against product code only in the app.** Impossible for an uninstalled
   app, and, by known AppImage behaviour not shown here, for an AppImage that is not
   running (§5.1 B).
8. **Submodules against the Code view.** A submodule's `.git` is a file, which the
   handler refuses (`codeGit.ts:407`). The Git row's later "worktree per
   conversation" meets the same refusal (`:407`, `:433`). That is beyond step 3, but
   the handler would have to change first.
9. **The welcome page sends a new user to clone this repository**
   (`StateMissing.tsx:52-63`; `os-ui/client/README.md:20`), which would hand them
   your `human/`, `memory/`, and `HANDOFF.md`. After the split it would hand them
   your workspace and no product source at all.
10. **The smoke pattern.** "opens the desktop" matches no test name (`desktop.yml:138`).
    `HANDOFF.md:177-179` says three named cases run against the packaged app; two
    do.
11. **Line count.** The brief and ADR-0006 (`docs/adr/0006-desktop-workspace-trunk-and-plugins.md:89-90`)
    say `os-harness/` is about 2,300 lines. `wc -l` gives 1,684, of which 1,485 are
    Python.
12. **The Language row against step 3.** The trunk is to become TypeScript only
    (`HANDOFF.md:795`). This design adds Python in step 3 (`new_workspace.py`, the
    harness's Git record, the project manager's `git init`). The reason: Python is
    the only runtime a command-line twin can count on before step 4. Step 4 has that
    much more to port.
13. **The Product and workspace row's reversal text** ("Keep one repository and add a
    script that clears personal content", `HANDOFF.md:788`) could be read as ruling
    out one repository. Resolved: the Human Owner chose two repositories (§8 Q6), and
    the row's sentence "this repository becomes one workspace instance" now holds as
    written.
14. **`nanochat_cpu`'s README** says the repository ignores `*.log`
    (`Code/README.md:125-126`). That stops being true once it is its own repository,
    unless PR 4 lands first.
15. **The brief against the design agent's guard.** The brief asks for Git
    experiments with `HOME` redirected. The worktree guard refused both `HOME` and
    `GIT_CONFIG_GLOBAL` redirects for the design agent, so it ran none; the
    directing agent ran them afterwards (§3 "Git experiments").
16. **A new project with no commit breaks `git add -A` at the workspace root** unless
    its ignore line is already there (§3 "Git experiments"). So `new` and `adopt`
    must write the ignore line before, or together with, the `git init`, and a
    project folder made by hand is not harmless.
17. **A commit with no identity set is not refused on macOS.** Git writes the
    account's name and the machine's host name into it (§3 "Git experiments"). So
    §5.4's "An Accept commit fails with Git's own message" does not hold there, and
    any commit the root agent offers should first show the name and email it would
    carry. The import's commit is held to the same rule (§5.7).
18. **The Name row against the new repository's name.** "Unchanged: AI-Human
    Research OS" (`HANDOFF.md:800`), while the product's repository is now
    SuperResearch OS and the app shows "Research OS" (`electron-builder.yml:4`).
    The decision names only the repository; the default keeps the app's name
    (§5.8 k, §8 Q14).
19. **A private product repository against the app's own links and the tester's
    help.** The Help link, About's website, and the package's homepage would open a
    page a tester cannot see (§5.8 j, §8 Q19), and the tester cannot read the
    product's README (§8 Q9).
20. **A private repository against the CI gate and `desktop.yml`, possibly.**
    `main` accepts changes only through pull requests whose CI passes (CI gate
    decision, `HANDOFF.md:697-706`; `AGENTS.md`, "Completion checks"). Whether the
    account's plan allows a ruleset, the macOS and Windows minutes, and the two arm64
    rows on a private repository was not established (§5.8 l, §8 Q20).
21. **The product's own checkout is a workspace by today's rule.** Its root keeps
    all three markers (`workspace.ts:5`), so a development run would open it
    (`workspace.ts:43-47`). §5.7 adds a rule against it in PR 9.
22. **`pages.yml` needs both repositories.** It builds the product's frontend from
    this workspace's snapshot and paper wiki (§5.8 m), and what it publishes is the
    Human Owner's (`HANDOFF.md:775`, §8 Q16).
23. **The brief against `os-build/references/`.** The brief calls some entries
    "other projects' code"; at `b5fa10f` the ten repositories there are commit
    pointers with no `.gitmodules` and no tracked content, and a licence is recorded
    for two of them (§4).
24. **"Updating a workspace's scripts is not in step 3" against the split.** This
    workspace's scripts become copies of product source that step 3 changes, so step
    3 needs a refresh here (§5.1).
25. **An early import against CI's use of this repository as its own fixture.**
    `ci.yml:74-75` runs the generator at the root, `verify.sh` validates the paper
    wiki and your portfolio, and the end-to-end suite copies the whole checkout
    (`app.test.ts:53-70`). An import without your content is red at its first commit
    unless it carries a workspace of its own: the transitional workspace of R3.
26. **The cognition cache against sessions in another repository.** `AGENTS.md` has
    every session read and capture cognition in `human/human-cognition/`, and the
    Existing milestones row keeps the cache a workspace skill (`HANDOFF.md:799`). A
    session that works in the product repository has no `human/`; §5.7 keeps the
    directing session in this workspace (§8 Q21).

### Not read or not established

- **Git behaviours beyond one Mac.** §3 "Git experiments" lists what was run, on
  macOS only. Still open, each to be run in a throwaway folder with `HOME` and
  `GIT_CONFIG_GLOBAL` pointed at empty ones:
  - the same probes on Windows and Ubuntu, above all the commit with no
    `user.name` or `user.email`: whether Git guesses an identity there or refuses;
  - building the example commit from the committed tree on two operating systems
    and comparing hashes;
  - `git submodule add` on an existing nested repository: whether its `.git` stays a
    folder.
- **Agents in nested repositories.** Whether Claude Code and Codex read the
  workspace's root `AGENTS.md` when the working folder is its own repository
  (§5.8 e).
- **A first turn on a clean account.** The first headless `full` turn in a folder
  neither agent has seen, on an account with no earlier use, was not tried for
  either agent. One such turn, root and project, belongs before the tester gets the
  file.
- **A bare `python` on a clean machine.** Whether a machine with only uv has
  `python` on PATH for the root agent's shell. If not, today's `H`
  (`project-dispatch/SKILL.md:14-15`) fails at dispatch.
- **Windows links.** Whether links can be made on Windows by `new_workspace.py`
  without Developer Mode (§5.8 d).
- **Paper wiki.** Whether `generate_viz.py` and `validate_paper_wiki.py` accept an
  empty wiki, and which index files it must hold. Not run. The same question decides
  whether the transitional workspace's stub wiki passes the product's CI (R1), and
  whether `viz.html` works as a site on its own (§8 Q16).
- **Which tests read the checkout's own content.** Many frontend and client test
  files name `projects-folder`, `paper-wiki`, `memory/MEMORY`, or `HANDOFF`
  (shown by `git grep -l`); whether they read the real checkout or fixtures was not
  read. The rehearsal (R1) settles it.
- **The GitHub plan.** What a private repository allows on the Human Owner's
  account: a ruleset, Actions minutes, arm64 runners, Pages (§8 Q20).
- **Links.** Which of the 27 links into `HANDOFF.md` target a group that moves
  (§5.7); whether GitHub renders `#N` in Markdown files as links; whether the
  renderer binds CmdOrCtrl+N (S3).
- **OpenResearch beyond what was read.** Its other chat files and its harness
  modules were not read, nor where its tour labels render (§3).
- **Branches.** Local `main` (`dc3c269`) and `origin/main` (`6a5ab1b`) differ in this
  checkout; squash merges hide whether a branch's work is on `main`, so "every branch
  named in Active Work is merged" rests on the pull requests' states (`gh pr list
  --state all`), not on Git.
- **Installer contents.** Whether the renderer bundle contains text from this
  instance's files: the bundle was not read; the §4 check compares whole files, so a
  string check would be its own addition. Whether electron-builder packs a licence
  file.
- **CI cost.** What building the client in `ci.yml` adds to the job's time.
- **Bash time limits.** Whether a Claude Code shell call outlives the example's
  three-minute `all` (the brief template tells the agent to split long commands,
  `SKILL.md:59-60`).
- **Files not read:**
  - the 4,208-line end-to-end suite beyond `copyWorkspace`, its Git helper, its
    first cases, the Code view's Git case, and the two packaged cases. So which other
    cases depend on `HANDOFF.md` or `memory/` content is not established;
  - `os-ui/PLUGINS.md` beyond Part 2's Gap 1 and parts of Part 4;
  - `os-build/references/` beyond searches of its notes for licences and of
    `related-projects.md`;
  - `GOAL.md`; the root `README.md` beyond its headings, its licence section, and
    its links; `human/` beyond its file list (`human/private/` not at all);
  - the mockup beyond its word table, its notes, and the strings it draws;
  - every `HANDOFF.md` row outside the Active Work steps, the Next session list, the
    Decisions groups' headings, and the rows cited here.
- **Revision scope.** The revision of 2026-11-26 checked with a script that every
  `path:line` in this file names a file of this repository and a line within it at
  `b5fa10f` (OpenResearch's paths excluded; they are at `e9b80a6`), and read the
  lines behind the references it added. References kept from the first version
  were not re-read one by one; their files are unchanged since `6a5ab1b`.
