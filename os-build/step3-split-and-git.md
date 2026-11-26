# Step 3: product and workspace split, and the Git binding: working design

Read-only design, written 2026-11-26 against `main` at commit `6a5ab1b`. Nothing in
the repository was changed, built, or committed for it apart from this file and its
line in [index.md](index.md). Every `path:line` refers to that commit and is relative
to the repository root. **Shown** means I read the file or ran the command;
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

## 1. Outcome

**What the tester does.** You send one person an installer from a CI run, and only
when you say so. Before they open it, they install uv, Git, and Claude Code or
Codex, signed in. On Windows, Git for Windows also gives them bash, which the
example needs. They open the app, click **New workspace**, pick an empty folder, and
leave **Add the example project nanochat_cpu** ticked. The app fills the folder from
a template built into the app:

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
and the report quotes it.

**What changes for your own workspace.** This repository stays one repository, and
your files stay where they are. Three things change:

- `nanochat_cpu` stops being tracked here. A copy becomes the example the app ships.
  Your own `projects-folder/nanochat_cpu/` becomes a Git repository of its own, which
  this repository ignores.
- CI stops copying this repository, with `human/`, `memory/`, and `HANDOFF.md`, into
  its test folders. It builds a fresh workspace instead.
- A new CI check fails if any file of yours could reach an installer or a new
  workspace.

**What needs your answer.** There are eleven questions in §8. These four decide the
most:

- whether the app ever makes a commit for the user. Default: never during runs; the
  example arrives already committed.
- where the tester's example comes from. Default: inside the app.
- whether this repository may keep both roles, the product's source and your
  workspace. Default: yes.
- which prerequisites the tester is told about.

Moving `nanochat_cpu`'s files, changing what CI runs, and changing what the installer
holds each wait for your word before they are built (§7).

## 2. The tester's path

Each step names the part that does it: one that exists (`file:line`) or one this step
must build (**build**) or change (**change**).

| # | What happens | Done by |
|---|---|---|
| 1 | They receive one installer file from a run of the Desktop client workflow, only on your explicit word (`HANDOFF.md:261-262`), with a one-page tester sheet | Artifact upload exists (`.github/workflows/desktop.yml:145-154`). The tester sheet: **build** (PR 11) |
| 2 | They have installed beforehand: uv, which fetches the pinned Python 3.12 (`os-ui/client/src/main/python.ts:53-55`, `.python-version`); Git; Claude Code or Codex, signed in; bash (`projects-folder/nanochat_cpu/Code/README.md:29-30`; on Windows from Git for Windows); network for about 0.2 GB of data and 0.2 GB of Python wheels (`Code/README.md:20-21`) and about 1 GB of disk (`:22`). The Decisions name only uv and Python (`HANDOFF.md:262-263`); §8 Q9 asks about the rest | Settings' prerequisite rows exist (`os-ui/client/src/main/doctor.ts:101-105` for Git, which is "not required" today): **change** Git to required |
| 3 | They install and open the app as the README says for their OS | `os-ui/client/README.md:29-48` (exists) |
| 4 | No folder is saved, so the welcome page appears. Today it says to clone this repository (`os-ui/frontend/src/components/StateMissing.tsx:52-63`) | **change** to screen S1 (§6): **New workspace…** and **Open a workspace…** |
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
   folder; "copy" means copied from this repository through the installer, "stub" a
   new file kept in the template.

   | Path | Origin |
   |---|---|
   | `.git/` | `git init`, no commit (§8 Q5) |
   | `.gitignore` | stub: `.env`; `os-harness/sessions/`; `os-ui/frontend/public/state.json*`; `.venv/`, `__pycache__/`, `.DS_Store`; then one line per registered project, `/projects-folder/<Name>/`, written by `adopt` or `new` (§5.6) |
   | `.python-version`, `.env.example` | copy |
   | `AGENTS.md` | stub: the workspace edition (marker, `os-ui/client/src/main/workspace.ts:5`) |
   | `.claude/skills/<5>`, `.agents/skills/<5>` | links into the hub copy below, one per skill (§5.8 d on Windows) |
   | `os-harness/harness.py`, `core.py`, `adapter_claude.py`, `adapter_codex.py`, `README.md`, `index.md`, `.gitignore` | copy (marker `os-harness/harness.py`) |
   | `os-ui/generator/generate.py`, `README.md`, `pyproject.toml`, `uv.lock` | copy (marker `os-ui/generator/generate.py`) |
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
   holding one commit of the example (§5.3, §8 Q1).
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
  workspace is fresh, and step 4 replaces the Python.
- **A New project screen.** The tester uses the example; agents create projects with
  `research-project-manager new`.
- **A branch per experiment and a worktree per conversation.** The Git row puts them
  in its second step, "only when parallel runs are needed" (`HANDOFF.md:790`).
- **Commits made automatically before or after runs.** §5.4 default a; it is your
  decision (§8 Q3).
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
- **Changing what GitHub Pages publishes.** It is yours (`HANDOFF.md:775`).

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

The brief's three classes do not cover CI, design documents, and tests, which ship
neither in the app nor in a workspace. I added a fourth:

- **P**: ships in the app as app code.
- **T**: ships in the app as template and is copied on New workspace, either as a
  *copy* of a file here or as a *stub*, a new file kept in the template.
- **I**: this instance only; never ships.
- **D**: development source; ships in neither.

| Entry | Tracked files | Class | Note |
|---|---|---|---|
| `.agents/skills/`, `.claude/skills/` | 20 links each | I | This instance's install set; the template writes its own five links |
| `.claude/launch.json` | 1 | D | Preview servers for mockups |
| `.env.example` | 1 | T copy | Paper-search key names, no values |
| `.gitattributes` | 1 | D | Rules for this repository's `paper-wiki/viz.html` and the vendored PDF.js |
| `.github/` | 10 | D | |
| `.gitignore` | 1 | I/D | This repository's; the template has its own stub |
| `.nojekyll` | 1 | D | Pages |
| `.python-version` | 1 | T copy | The app reads it from the workspace (`python.ts:53-55`) |
| `AGENTS.md` | 1 | I | Marker; its text names `os-build/`, `HANDOFF.md`, `human/`. The template has a workspace stub |
| `CHANGELOG.md`, `CONTRIBUTING.md`, `README.md`, `FILETREE.md`, `verify.sh` | 5 | D | |
| `LICENSE` | 1 | D, should be P | Not packed today (§3 Installer) |
| `CONTEXT.md` | 1 | D | |
| `HANDOFF.md` | 1 | I | The generator reads it when present and only warns when absent (scratch run) |
| `docs/` | 25 | D | Except `docs/brand/app-icon.png`, which becomes `out/icon.png`: P |
| `human/` | 8 (`human/private/` ignored, `.gitignore:38`) | I | Includes the cognition cache `human/human-cognition/` (5) |
| `ideas/` | 7 | mixed | `index.md`, `log.md`: T stub (empty). `nanochat-cpu-baseline.md`: I, and a copy goes with the example. `idea_example/` (3): I |
| `inbox/` | 2 | mixed | `index.md`: T stub. Content: I |
| `memory/` | 3 | mixed | `MEMORY.md` and `paper-sources.json`: I. The template has stubs with the same headings and the skill's defaults, because the generator and the project manager need them (`generate.py:188-221`; `project-contract.toml:36-38`). `index.md`: T stub |
| `os-build/` | 19 | D | `references/` read-only |
| `os-harness/` | 11 | mixed | The four `.py` files, `README.md`, `index.md`, `.gitignore`: T copy (Python until step 4). `tests/` (4): D |
| `os-ui/client/` | 39 | P / D | Source of the app; `DESIGN.md`, `README.md`, `e2e/`, `test/`: D |
| `os-ui/frontend/` | 196 | P / D | Renderer and plugin sites: P. Server code is compiled into `main.cjs`: P. Tests and fixtures: D |
| `os-ui/generator/` | 5 | T copy | `generate.py`, `README.md`, `pyproject.toml`, `uv.lock` |
| `os-ui/mockups/`, `DESIGN.md`, `PLUGINS.md`, `README*.md`, `index.md`, `mockup.html`, `start.sh`, `.gitignore` | 11 | D | |
| `paper-wiki/` | 224 | mixed | Notes (`papers/` 90, `papers_zh/` 78, `topics/` 27, `concepts/` 24, `sources/` 3) and `viz.html`: I. `index.md` and collection indexes: T stub |
| `projects-folder/index.md` | 1 | I | Lists `nanochat_cpu`; the template has a stub |
| `projects-folder/templates/` | 15 | T copy | Also this instance's template |
| `projects-folder/nanochat_cpu/` | 73 | I, and the source of the bundled example (T) | §5.3 |
| `research-skills-hub/open-paper-skills/` | 103 (1.6 MB) | T copy for five skills; D for the rest | §8 Q8 |
| `research-skills-hub/claude-science-skills/`, `science-skills/`, `collected-skills/`, `mattpocock-skills/` | 480, 229, 282, 84 (30 MB, 3.2 MB, 5.9 MB, 0.46 MB) | D | Third-party mirrors; licences to review before any ships |
| `research-skills-hub/` top files and `docs/` | 6 | D | |

**What the installer bundles after step 3 (proposed).** Everything `out/` holds
today, plus `resources/workspace-template/`:

- the T copies and stubs above;
- `new_workspace.py`;
- `examples/nanochat_cpu.bundle`.

`build.mjs` assembles that folder as `out/workspace-template/`. It copies what the
manifest names and calls `new_workspace.py --build-example-bundle` for the bundle
(§5.3). electron-builder then copies `out/workspace-template/` outside the asar
archive with `extraResources`. The reason is known Electron behaviour, not tested
here: a Python process cannot open files inside `app.asar`, which only Electron's
own file functions read.

**The check that proves separation (proposed, run by `ci.yml`).** A script,
`os-ui/workspace-template/check_separation.py`, does four things and fails on any
hit.

1. **Canaries.** Copy the sources the template draws from into a temporary root.
   Plant one canary file with a unique token in each of: `human/`,
   `human/private/`, `human/human-cognition/`, `memory/`, `ideas/`, `inbox/`,
   `paper-wiki/papers/`, `paper-wiki/topics/`, and the root (`HANDOFF.md`). Run
   `new_workspace.py` from that root twice, with and without the example. Fail if
   the token appears in either workspace. This proves the builder reads nothing it
   should not, whatever the real files say.
2. **Real content.** Hash every tracked file of this repository in the I class
   (table above). Fail if any file of the two workspaces, or of `os-ui/client/out/`,
   has the same SHA-256. Two exceptions, both explicit in the manifest:
   - the example's own files, its idea file included, which are meant to ship;
   - empty files such as `.gitkeep`, whose hash every empty file shares.
3. **Allowlist.** Fail if `os-ui/client/out/` holds a path outside a fixed list:
   `main.cjs`, `preload.cjs`, `renderer/**`, `plugins/<bundled id>/**`, `icon.png`,
   and `workspace-template/` as its manifest lists it. Also fail if
   `electron-builder.yml` names any `files` or `extraResources` source outside
   `out/` and `package.json`, so nothing can reach the installer around the check.
4. **The workspace works.** Run the generator and
   `manage_research_project.py --repo <tmp> validate` on both workspaces. Both
   must pass.

Step 3 needs the client's `out/` in the required job, so `ci.yml` gains
`ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci --prefix os-ui/client && npm run build
--prefix os-ui/client`. What that adds to the job's time was not established.

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

**Updates.** Not in step 3. The tester's workspace is fresh, and step 4 replaces the
Python. A later update would be `new_workspace.py --update <dir>`, run by the app or
in a terminal.

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
| **A. One Python script, `new_workspace.py`, in the product source** (`os-ui/workspace-template/`), shipped in the installer's resources | More Python to port at step 4. The app runs bundled Python for the first time | Nothing. Without the app, the same command runs from a clone of the product repository, or from the installed app's resources folder (`uv run --no-project --python 3.12 -- python new_workspace.py <dir> [--example nanochat_cpu]`). From a clone there is no bundle yet, so the script builds the example's commit itself, the same way `build.mjs` asks it to (§5.3) |
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

  This instance needs `adopt` (PR 10), and so does any workspace made before step 3.
- The **example** is a `git clone` of the bundle (§5.3), not an init.
  `new_workspace.py` then runs `adopt nanochat_cpu`, which finds the `.git` and only
  registers the project.

The app calls only `new_workspace.py`. Agents call the project manager.

**Reversal.** Replace the script with step 4's TypeScript entry, which then serves
both callers.

### 5.3 Where `nanochat_cpu` lives

**Facts.**

- 73 tracked files (§3). The Project repositories row ends their tracking in the
  workspace repository (`HANDOFF.md:789`).
- What uses it today:
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

1. **The example's source.** Until PR 10 the template's manifest names the example
   at its present path. PR 10 copies the 73 files to
   `os-ui/workspace-template/examples/nanochat_cpu/`, with a copy of its idea file
   beside it, and points the manifest there. That copy is product source, not a
   project of this workspace: it is not under `projects-folder/` and not in the
   portfolio. Whether that satisfies "what ends is tracking project files" is §8 Q7.
2. **The installer.** One Python step, `new_workspace.py --build-example-bundle`,
   turns the example *as committed in this repository* into one commit:
   - in a temporary repository;
   - with a fixed author ("Research OS example") and a fixed date;
   - from the committed files, not the checkout, so Windows line endings cannot
     change it.

   It writes that commit as `nanochat_cpu.bundle`. Three callers use the same step:
   - `build.mjs`, for the installer (Python is installed on every `desktop.yml` row,
     `desktop.yml:70-72`);
   - `ci.yml`'s template check (PR 6);
   - `new_workspace.py` itself, when run from a clone of this repository.

   New workspace clones the bundle into `projects-folder/nanochat_cpu/`, removes the
   clone's `origin`, and runs `adopt nanochat_cpu`.
   - The tester's project then has a commit without a Git name or email, and
     offline.
   - Every machine gets the same commit hash for the same app build, so you can
     match the hash in a tester's report to a build. This is a claim for the build
     PR to show: build on two OS rows and compare the hashes.
3. **Your own `projects-folder/nanochat_cpu/`.**
   - This repository stops tracking it (`git rm --cached`, which leaves the files
     on disk).
   - `adopt nanochat_cpu` then gives it its own repository and adds
     `/projects-folder/nanochat_cpu/` to this repository's `.gitignore`. You make its
     first commit.
   - The old history stays in this repository's log.
   - On your other machines, pulling that commit deletes the tracked files there.
     Their ignored `.venv/` and `.cache/` stay. Each machine then copies the
     example back and runs `adopt`. PR 10's runbook says so.
4. **End-to-end suite and packaged cases.** They build their workspace with
   `new_workspace.py --example nanochat_cpu` instead of copying this repository. The
   Code view case starts from a project that already has a commit
   (`app.test.ts:799` expects "No history to show" today and changes).
5. **`./verify.sh`.** Under CI the portfolio row and the idea point to a folder the
   checkout cannot have. `validate` gets a `--absent-ok` flag, which `verify.sh`
   passes only when `CI` is `true`:
   - with the flag, a registered project whose folder is missing, and whose line is
     in the workspace's `.gitignore`, is a warning, `project_not_in_checkout`, not a
     `phantom_row` or `promoted_idea_without_project` error;
   - on your machine, without the flag, a missing folder stays an error.

   The flag and the `verify.sh` edit land in PR 5, together with `new`'s ignore
   line. From that merge, a project an agent creates here is its own repository, so
   CI must already tolerate its absence. §8 Q10 asks about this.
6. **The tester.** They get the bundle (§2).

**Options for the tester's copy** (§8 Q1):

- **the bundle (default);**
- plain files copied and committed with the tester's identity, which needs a Git name
  and email;
- a new public repository the app clones, which needs repository creation and
  network;
- none: the tester makes a project, which is not the acceptance.

### 5.4 What "runs record their commit" means

**Facts.**

- The harness records nothing about Git (§3).
- The generator's rounds carry no commit (`generate.py:543-566`).
- The Idea view shows a commit only when an agent writes it (`logic.ts:955`).
- `project-dispatch` leaves commits to you (`SKILL.md:57-58`, `:95-96`).
- What OpenResearch does is recorded only as "a run is pinned to a commit"
  (`docs/adr/0006-desktop-workspace-trunk-and-plugins.md:54-55`). `os-build/references/`
  adds nothing: OpenResearch appears only as "the closest reference"
  (`related-projects.md:164-167`). Who commits there, when, and under which name is
  not recorded, so this design claims nothing about it.

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
decide, as today (`SKILL.md:95-96`). Committing on the user's behalf is yours to
decide: §8 Q3.

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
- **Every I-class file has a T stub where a program needs the shape.**
  `memory/MEMORY.md` is the case: the generator and the project manager read and
  write its tables. The stub is a new file with empty tables, not a cleaned copy of
  yours. So the check can compare by content.
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
| **Ignored**, one line per project (`/projects-folder/<Name>/`, written by `new` and `adopt`) (default) | One line per project. A folder made by hand, without the manager, shows as untracked until it is adopted | Nothing known. A single `/projects-folder/*/` rule was considered and set aside: in this repository it would hide new files inside `nanochat_cpu` while that folder is still tracked (PRs 5 to 10) |
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

### 5.7 This repository after the split

**Facts.**

- The Product and workspace row says "this repository becomes one workspace
  instance". Its reversal reads "Keep one repository and add a script that clears
  personal content" (`HANDOFF.md:788`).
- This repository holds the product's whole source and is the workspace the
  development run opens (`workspace.ts:43-47`).

**Least disruptive form (default): one repository with two roles.**

- **Product source** stays where it is: `os-ui/`, `os-harness/`,
  `research-skills-hub/`, `projects-folder/templates/`, `docs/`, `.github/`,
  `verify.sh`.
- **New: `os-ui/workspace-template/`.** It holds:
  - a manifest of what is copied from where;
  - the stubs;
  - `new_workspace.py` and `check_separation.py`, with their tests;
  - `examples/nanochat_cpu/` and its idea file.

  It sits under `os-ui/`, so `desktop.yml`'s filter already covers it
  (`desktop.yml:16-29`) and no top-level entry or `FILETREE.md` line changes.
- **Instance content stays where it is:** `human/`, `memory/`, `HANDOFF.md`,
  `ideas/`, `inbox/`, the paper-wiki notes, the skill links, and the ignored
  `projects-folder/<P>/` repositories.
- **Separation is an allowlist.** Only what the manifest names can reach a workspace
  or the installer, and the §4 check proves it. That is not "a script that clears
  personal content", which would be a denylist over a copy of this repository.

**CI after the split.**

- `ci.yml` gains the template build and check, and the client build for `out/` (§4).
  Its existing `discover` lines pick up the new harness and project-manager tests.
- `verify.sh` passes `--absent-ok` under CI, from PR 5 (§5.3).
- `desktop.yml` builds its test workspace with `new_workspace.py` and fixes the
  smoke-step pattern (§3).
- `pages.yml` is untouched. What it publishes stays your call (`HANDOFF.md:775`).

**Alternative: two repositories.** A public product repository, and a private one
for your workspace that holds `human/`, `memory/`, `HANDOFF.md`, `ideas/`, `inbox/`,
and the notes. This keeps your files out of the product's history. It costs:

- creating a repository;
- splitting history;
- moving CI;
- every link from `HANDOFF.md` and memory into product files;
- the development run's "open the checkout" rule.

It is §8 Q6. This repository is public on GitHub (read by the directing agent
with `gh repo view`), so `human/` (without `human/private/`), `memory/`, and
`HANDOFF.md` are already published with it, history included; the alternative
would change that only from the move onward.

### 5.8 Questions the brief did not list

a. **The generator fails on an empty workspace.** Shown on the scratch workspace:
   `generate.py:1188-1190` fails on zero portfolio rows, so a workspace made without
   the example opens on a failed snapshot (`generator.ts:53-61`).
   - **Default:** zero rows becomes a warning.
   - The other two rules stay, because the template satisfies them.
   - CI on this repository is unaffected; its portfolio has a row.
   - Must land before New workspace (PR 1).

b. **Untracking `nanochat_cpu` reds required CI.**
   - Keep its portfolio row and `validate` reports `phantom_row` and
     `promoted_idea_without_project`.
   - Drop the row and point (a) fails `ci.yml:74-75`.
   - Hence PR 1 and PR 5 before PR 10.

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
     instance's `nanochat_cpu` between PR 5 and PR 10, and any project not yet
     adopted.
   - A change outside the project is still found with the workspace's own `git
     status`.
   - `H` goes through uv, not a bare `python` (§2 row 9).

h. **The harness finds Git differently from the app.**
   - The harness has no check for the macOS stub (point 2 of the review list).
   - On a Mac without the Command Line Tools, the first recorded turn would open an
     install dialog.

i. **Instance lines inside the example** (§3 `nanochat_cpu`). Ship them as they are,
   with the idea file, or ship an edition without them: §8 Q2.

## 6. Every new or changed screen

The mockup is drawn from this list. Words in quotation marks are proposed text.

**S1. Welcome (no workspace open).**

- **For:** a first start, or a start after the saved folder became unusable.
- **When:** no folder is saved, or the saved one fails the markers
  (`workspace.ts:74-96`). Today's version is `StateMissing.tsx:40-92`.
- **Shows:**
  - the title "Start with a workspace";
  - the sentence "Research OS has no model of its own: it starts your own Claude
    Code or Codex, on your own plan" (the Distribution row's first-run sentence,
    `HANDOFF.md:765`);
  - the problem with the saved folder, if there is one;
  - the prerequisite rows (S4).
- **Can do:** **New workspace…** (opens S2), **Open a workspace…** (today's folder
  picker), and **Check again** on the prerequisites.
- **Failures:**
  - *No Git:* New workspace is disabled, beside "Git is needed for projects and
    runs. Install it, then Check again", with the download link. Open still works.
  - *No uv or Python:* both buttons are disabled with today's row text and link;
    nothing runs without Python.
  - *No Git identity:* nothing changes here (S4 shows it).
  - *Folder not empty:* not applicable.

**S2. New workspace.**

- **For:** creating a workspace.
- **When:** from S1, or from File → **New Workspace…** (S3).
- **Shows:**
  - a field for the folder, with **Choose…**. The folder may not exist yet; if it
    exists, it must be empty, hidden files included;
  - a ticked box "Add the example project nanochat_cpu (a three-minute training
    run; it downloads about 0.4 GB when you run it)";
  - a short list of what will be written: "agent scripts, five skills, empty memory,
    ideas, inbox and paper wiki, the project template, and the example as its own
    Git repository";
  - the line "The workspace and the example are Git repositories. Nothing is
    committed under your name";
  - **Create** and **Cancel**.
- **While creating:** a line of progress ("Copying files…", "Making the example's
  repository…", "Reading the workspace…"). **Cancel** is disabled.
- **After:**
  - success: the app opens the new workspace on Home;
  - failure: the screen stays, with the message and **Show log**.
  - The folder is built under a temporary name beside the target and renamed at the
    end, so a failure leaves nothing at the chosen path.
- **Failures:**
  - *No Git:* **Create** is disabled with S1's sentence.
  - *No uv or Python:* **Create** is disabled with the row's text and link.
  - *Folder not empty:* "This folder is not empty. Choose an empty or new folder";
    **Create** is disabled. The app never writes into a folder with files in it.
  - *No Git identity:* nothing is blocked, because no commit needs it. The line
    under the list reads "Your Git name and email are not set; you will need them to
    commit your own work (see Settings)".
  - *Cannot write there:* "Research OS cannot write to this folder: <reason>".
  - *Folder inside another Git repository:* a warning, not a block: "This folder is
    inside the Git repository at <path>; the new workspace will be a repository
    inside it".

**S3. File menu.**

- **For:** reaching S2 when a workspace is already open.
- **Shows:** "New Workspace…" above today's "Open Research OS Folder…"
  (`menu.ts:56`).
- **Can do:** open S2. Whether the "Open…" label changes to "Open Workspace…" is for
  the mockup.
- **Failures:** as S2.

**S4. Settings → prerequisites (changed rows).**

- **For:** seeing what is missing.
- **When:** in Settings, and inside S1 and S2.
- **Shows:**
  - **Git** becomes required, "needed for projects and runs; the Code tab's
    Changes needs 2.45 or later" (today `doctor.ts:101-105`);
  - a new row, **Git name and email**: *ok* with the two values, or *not set* with
    the two `git config --global user.name "…"` and `user.email "…"` lines to copy.
    It is not required. The app never sets them.
- **Can do:** copy the two lines, and **Check again**.
- **Failures:** *No Git:* the Git row is *missing* and the identity row reads
  "needs Git". *No uv or Python:* as today.

**S5. Conversation turn lines (changed).**

- **For:** showing the commit a run started and ended on.
- **When:** in every conversation, Home's root agent and each project's.
- **Shows:**
  - under the existing "model · login" line of a turn (`AgentChat.tsx:714-719`):
    "on c4d4a85 · clean", or "on c4d4a85 · 3 changed, 1 new", or "no commit yet", or
    "not a Git repository", or "Git not found";
  - after "done · 12.3 s" (`:720-725`): "ended on c4d4a85 · 7 changed, not
    committed", or "ended on 9f1e2b0 (new commit)" when the agent committed.
- **Can do:** click the short hash to copy the full one, if the mockup keeps that.
- **Failures:**
  - *No Git:* "Git not found"; the turn runs as before.
  - *No uv or Python:* no turn starts at all; the conversation's existing error shows.
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

## 7. Build sequence

One pull request each, in this order, each leaving `ci.yml` green. **Word** marks a
pull request that moves tracked files or changes what CI runs or what the installer
contains: it waits for your yes before it is built. Every pull request that adds a
page or changes one waits for your choice from the mockup.

| PR | What | Acceptance (CI) | What you can check | Word |
|---|---|---|---|---|
| 1 | Generator: zero portfolio rows is a warning | A new unit test runs the generator on an empty workspace and expects exit 0 | none visible | **Word**: adds a test line to `ci.yml` |
| 2 | Harness records the repository state at a turn's start and end (§5.4), with the read guards of §5.6 and the stub check (§5.8 h) | New offline tests: clean, changed, no commit yet, no repository, a project without `.git` inside a workspace with one, no Git; the existing 18 offline tests still pass | none visible | no (the existing `discover` line runs the tests) |
| 3 | S5 in the conversation, after the mockup | An end-to-end case: a project repository with one commit; a turn shows "on <short> · clean" | A checklist line: send a project turn, read the line | no |
| 4 | `.gitignore` for the project template, and `nanochat_cpu`'s gains the rules of §5.8 c | `./verify.sh` passes | none | no (edits, no moves) |
| 5 | `research-project-manager`: `new` runs a guarded `git init` (no commit) and writes the project's ignore line; `adopt <Name>`; `validate --absent-ok`. `verify.sh` passes the flag when `CI` is `true`. `project-dispatch` text: `H` through uv; baseline, review, and Accept in the project's own repository when it has one, today's commands when it has none | Unit tests in the skill's `scripts/`: hostile fixtures (hooks, `fsmonitor`, a `.gitattributes` filter, a `.git` file or link, a templateDir); a project absent from a checkout passes with the flag and fails without it; `./verify.sh` passes | none until PR 10. The skills are linked into this workspace, so `new` makes repositories here from the merge on | **Word**: changes what `verify.sh` checks in CI |
| 6 | `os-ui/workspace-template/`: manifest (naming the example at `projects-folder/nanochat_cpu/` for now), stubs, the workspace `AGENTS.md`, `new_workspace.py` with `--build-example-bundle`, `check_separation.py` (canary, content, workspace-works parts) | `ci.yml` builds the example's bundle and two workspaces into temporary folders and checks them (§4) | none visible | **Word**: new `ci.yml` step |
| 7 | `build.mjs` assembles `out/workspace-template/` and calls `new_workspace.py --build-example-bundle`; `electron-builder.yml` copies it with `extraResources`; `check_separation.py`'s allowlist part runs on `out/` and `electron-builder.yml` in `ci.yml` | The bundle builds on two `desktop.yml` rows with the same hash; the payload check passes in `ci.yml` | none visible | **Word**: changes what the installer contains and what CI runs |
| 8 | S1, S2, S3, S4, S6 after the mockup; the trust question skipped for a folder the app made | End-to-end cases: S2 makes a workspace with the example, Home shows the card, a project turn shows S5's line; each S2 failure (no Git, folder not empty) | Checklist lines for New workspace, its failures, and the Settings rows | no |
| 9 | End-to-end and packaged cases build their workspace with `new_workspace.py`; the smoke pattern names real cases; `desktop.yml` stops copying this repository | The three full rows pass; the packaged rows run the cases they name | none | **Word**: changes what CI runs |
| 10 | This instance: copy `nanochat_cpu` and its idea file to `os-ui/workspace-template/examples/` and point the manifest there; `git rm --cached -r projects-folder/nanochat_cpu`; `adopt nanochat_cpu`, which writes its ignore line; a runbook for `adopt` on each of your machines | `./verify.sh` passes in CI with `--absent-ok`; on your machine, after `adopt` | You run the runbook, open the app on this repository, and see `nanochat_cpu`'s Code tab list your first commit | **Word**: untracks tracked files |
| 11 | Tester sheet; client README "What you need" and checklist; `DESIGN.md` §0, §4, §8 for Git required and the new write; HANDOFF by the directing agent | Links resolve (`./verify.sh`) | You read the tester sheet | no |

**After PR 11:**

1. You run the client checklist on macOS against a new workspace.
2. On your word, a tester receives one CI artifact. Before that, the example should
   be run once on the tester's OS (§8 Q9).

## 8. Questions for the Human Owner

Each has a default that holds if you do not answer, and a way back.

1. **Where does the tester's `nanochat_cpu` come from?**
   - **Default:** inside the app, as one ready-made commit that New workspace unpacks
     when the box is ticked. It needs no Git name, no network, and every machine gets
     the same commit for the same build.
   - **Alternatives:** plain files the app commits under the tester's name, which
     needs their Git name and email; or a new public repository the app downloads,
     which needs that repository created and network.
   - **Reverse:** drop the bundle from the installer and the box from S2.

2. **Is the example shipped as it is?** Three lines name you or this workspace:
   `Started` links to your idea file; `Origin` says you asked for it; an open to-do
   names your review and a session.
   - **Default:** as it is, with a copy of its idea file. No research record is
     edited, and `validate` passes.
   - **Alternative:** an "example edition" with those lines rewritten.
   - **Reverse:** write the edition later; the bundle is rebuilt from it.

3. **Does the app ever commit for the user?**
   - **Default:** no. Runs only note the commit they started and ended on and how
     many files were uncommitted. The example arrives already committed. A new
     workspace and a new project start with no commit. Commits stay yours, offered by
     the root agent when you accept a run.
   - **Alternatives:** a hidden snapshot of every run under its own name, with your
     branch and files untouched; or a commit before each run; or one after each run.
   - **Reverse:** add one of them later behind a setting; old traces still read.

4. **When the user has no Git name and email.**
   - **Default:** nothing is blocked, because nothing commits under their name.
     Settings shows the two lines to set them, and the app never sets them.
   - **Alternative:** S2 refuses to create a workspace until they are set.
   - **Reverse:** one condition on **Create**.

5. **Is a new workspace itself a Git repository?**
   - **Default:** yes. `git init`, no commit, projects ignored.
   - **Alternative:** a plain folder; only projects are repositories.
   - **Reverse:** drop the init step from `new_workspace.py`.

6. **One repository with two roles, or two repositories?** This repository is both
   the app's source and your workspace.
   - **Default:** keep one. The template is a fixed list, and a CI check proves none
     of your files can reach an installer or a new workspace.
   - **Alternative:** move your workspace files into a new private repository and
     keep this one as the product.
   - **Reverse:** that move, at any later time.

7. **This repository's `nanochat_cpu`.**
   - **Default:** a copy becomes the app's example under `os-ui/`, outside
     `projects-folder/` and the portfolio. Your `projects-folder/nanochat_cpu/` stops
     being tracked here and becomes its own repository; you make its first commit.
     Its earlier history stays in this repository's log. Your other machines need the
     runbook once.
   - Is a product copy under `os-ui/` acceptable under "what ends is tracking project
     files in the workspace repository"?
   - **Reverse:** track `projects-folder/nanochat_cpu/` again and remove its ignore
     line.

8. **Which skills ship in a new workspace?**
   - **Default:** the five the app and the root agent need: project-dispatch,
     research-project-manager, research-skill-installer, paper-search,
     paper-wiki-manager.
   - **Alternatives:** all your own skills (about 1.6 MB); or the whole hub (41 MB,
     with third-party licences to review).
   - **Reverse:** one list in the manifest.

9. **What the tester sheet asks for, and on which computer.** The Decisions name uv
   and Python. The path also needs Git, Claude Code or Codex signed in, bash (from
   Git for Windows on Windows), network for about 0.4 GB, and about 1 GB of disk.
   The example has been run only on Windows.
   - **Default:** the sheet lists all of them. Before the tester gets the file, the
     example runs once on the tester's OS, by you or by a CI job.
   - **Reverse:** shorten the sheet.

10. **Should CI still fail when your portfolio lists a project CI cannot see?**
    - **Default:** no. CI warns ("not in this checkout"); your own machine still
      fails on a missing project folder.
    - **Reverse:** remove the flag, which then means dropping that row from tracked
      files.

11. **The packaged-app check names three cases but runs two** (§3).
    - **Default:** PR 9 names the case "opens Home with a freshly generated
      snapshot" in place of the stale name.
    - **Reverse:** one pattern in `desktop.yml`.

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
4. **Untracking `nanochat_cpu` reds required CI either way** (§5.8 b).
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
   your `human/`, `memory/`, and `HANDOFF.md`.
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
    script that clears personal content", `HANDOFF.md:788`) can be read as ruling
    out one repository. This design keeps one repository but builds workspaces from
    an allowlist, not by clearing a copy (§5.7, §8 Q6).
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
    carry.

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
  empty wiki, and which index files it must hold. Not run.
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
  - `os-build/references/` beyond a search of `related-projects.md`;
  - `GOAL.md`, the root `README.md`, `human/`, and the mockups;
  - every `HANDOFF.md` row outside the Active Work steps and the Decisions rows
    cited here.
