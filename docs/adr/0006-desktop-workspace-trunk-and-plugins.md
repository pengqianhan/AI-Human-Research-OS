---
status: accepted
---

# Reposition the Research OS as a desktop workspace over installed coding agents

On 2026-11-21 the Human Owner reopened the positioning: 「我个人倾向于定位成claude code 和
codex之上的一层排布层，在本地已经有claude code codex 或者antigravity cli 等工具的情况下，帮助用户
更方便的进行research」. A grilling session settled thirty-nine questions. The decision rows,
each with its way back, are in [HANDOFF.md](../../HANDOFF.md) under "Positioning and
architecture decisions (2026-11-21)". This record holds the reasons, the rejected options,
and the evidence. It decides direction only; no code changed with it.

The Research OS becomes a free, open-source, local desktop app for researchers who already
have Claude Code, Codex, or a similar coding agent installed. It has four parts.

- **Trunk.** The app shell, a registry, the root-agent conversation, the project list, and
  the agent layer. It continues [`os-ui/client/`](../../os-ui/client/README.md)
  ([ADR-0005](0005-desktop-client.md)) and ends up TypeScript only.
- **Plugins.** Everything else: the Paper Wiki, the Skills Hub, and five project views
  (Idea, Code, Skeleton, Assets, Paper). A plugin is described by a small declarative
  manifest and contributes home panels, project views, skills, host-side handlers, or
  ACP agents.
- **Agent layer.** No model and no agent loop of its own. Claude Code and Codex are built
  in and detected on the machine. Other agents arrive as plugins that speak the
  [Agent Client Protocol](https://agentclientprotocol.com) (ACP).
- **Workspace.** Plain files and Git, usable without the app. The app creates a workspace
  from an empty template; this repository becomes one workspace. Each project is its own
  Git repository, and a run records the commit it ran on.

Three earlier decisions end here. The audience was the Human Owner's own research practice
(2026-07-03); it is now other researchers. Pi was the intended long-term engine
([ADR-0003](0003-subscription-cli-harness.md)); it is now one optional agent. os-ui was a
read-only monitor with a narrow execution surface; it is now the main way in.

## What the session found

Five subagents surveyed similar projects, the two named reference apps, DeepSeek Harness,
and the vendors' terms. Star counts and repository descriptions were checked with `gh api`
on 2026-11-21. Everything else below was read by a subagent from the cited source and not
re-read by the Human Owner.

**Shapes of "a layer above coding agents".** The survey sorted the field into five: skill
and prompt packs that live inside one agent; terminal owners that drive agents through
tmux or a pty; control planes that speak the agents' headless protocols; compilers that
write each agent's configuration; and services that hold shared state. This repository
already had the first (the skills hub), the third ([`os-harness/`](../../os-harness/README.md)),
and the fourth (`research-skill-installer`). The surveyed projects are listed in
[related-projects.md](../../os-build/references/related-projects.md).

**[OpenResearch](https://github.com/alphaXiv/OpenResearch)** (alphaXiv, MIT, Rust, about
8,300 stars). It has no model of its own. One harness interface covers detection, chat turns,
and skill installation, behind a registry. Pi, DeepSeek Harness, and MiniMax Code are ACP
presets in its Agents settings. A chat gets a Git worktree, an experiment a branch, and a
run is pinned to a commit. It never edits the user's agent configuration. Its database is
the authority for transcripts.

**[OhMyGame](https://github.com/WhiteTowerAI/ohmygame)** (WhiteTowerAI, Apache-2.0,
Electron and TypeScript, about 2,500 stars). Its views render project files that the agent edits
with ordinary file tools, and the user's own edits save to the same files. Claude Code,
Codex, and OpenCode are optional runtimes beside an embedded Pi, which appears as "Built
in" and takes API keys on a Providers page. More agents come through ACP plugins. A plugin
is a manifest with `contributes` keys; plugin panels run in a sandboxed frame with
capability checks, native plugin code is fully trusted, and the API changes only by
addition. The Human Owner's screenshot of the shipped app showed Claude Code and Codex
switched on and usable; the design document read by the subagent said they were off by
default. The shipped behaviour is taken as the fact.

**[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)** (MIT, TypeScript,
created 2026-08-13, about 285,000 stars). It runs its own agent loop. Claude Code and Codex
appear only as one-shot subagents on bundled runtimes. Its plugins are in-process modules
against roughly a hundred host services, and the plugin API is pre-stable: about 170
upgrade guides across 16 releases. Embedding it is supported only by spawning `dsh`. It
scans `.agents/skills` and has an ACP profile.

**Vendor terms.** A subagent read the vendors' pages on 2026-11-21. This is fact-finding,
not legal advice, and the pages carry no stable dates.

| Vendor | What the pages say | Still open |
|---|---|---|
| Anthropic | [Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance) allows running Claude Code in a product on four conditions: the product's maker accepts the Commercial Terms, the binary is unmodified with its sign-in methods intact, each user signs in with their own plan and is billed directly, and the product does not pay for, resell, or relay usage. A product handling the claude.ai login itself is prohibited. The [headless page](https://code.claude.com/docs/en/headless) says `--bare` will become the default for `claude -p`, and bare mode does not read the stored login | Whether a free local app that starts the user's own install is "running Claude Code in your products"; whether a flag will keep the plan login once `--bare` is the default |
| OpenAI | The [app-server documentation](https://learn.chatgpt.com/docs/app-server) lets local and open-source apps keep using app-server authentication and says it was never permitted for commercial or hosted services. [Sign in with ChatGPT](https://developers.openai.com/siwc/token-sharing-open-source) is the recommended path | Whether a company's app, or paid add-ons, fall outside "local or open-source" |
| Google | The [FAQ](https://antigravity.google/docs/faq) says wrapping `agy -p` in third-party apps is not supported on consumer plans and that third-party access can lead to suspension. The [ACP page](https://antigravity.google/docs/ide/extensions/acp) says any ACP client can launch `agy acp` | Whether a custom desktop ACP client counts as wrapping |

**This repository.** [`os-ui/client/`](../../os-ui/client/DESIGN.md) is already an Electron
client in TypeScript that opens a workspace folder and runs the Paper Wiki viewer on its
own origin. Its window list (`os-ui/frontend/src/desktop/apps.tsx`) and endpoint mounts
(`os-ui/frontend/server/api.ts`) are compiled in; a registry is the one missing layer
between that and a plugin host. `os-harness/` is about 2,300 lines of standard-library
Python with 20 tests, 18 offline against fake CLIs and 2 live. `projects-folder/nanochat_cpu/` already holds the files
four of the five views would render. The portfolio has that one example project, no real
research project, and no outside user.

## Considered options

- **Keep the 2026-09-26 direction.** The Human Owner's opening sentence largely matched
  it; the new elements were the audience, the desktop as the main surface, and the plugin
  host. They chose all three, and the desktop first because 「讨论结束之后我决定制作桌面端，
  之后也主推桌面端」.
- **Follow OpenResearch whole,** with its experiment tree, compute dispatch, and database.
  The Human Owner took only the Git binding: 「openresearch 的git 绑定我觉得很适合ressearch」.
  The rest is where OpenResearch is strongest and this repository has nothing.
- **Build on DeepSeek Harness.** Three routes were weighed: match its plugin format, be a
  plugin inside it, or run it as the engine. All three make its own agent loop the main
  conversation, which contradicts "a layer above Claude Code and Codex", and all three bind
  the trunk to a pre-stable in-process API. The Human Owner first wanted compatibility
  (「方便之后兼容deepseek harness 的插件系统」) and accepted the replacement: share
  `SKILL.md`, MCP, and ACP, and let DeepSeek Harness join as an ACP agent.
- **Embed Pi as the default runtime,** as OhMyGame does. The Human Owner chose this
  mid-session, then reversed it after reading how OpenResearch and OhMyGame place Pi. An
  embedded engine needs API keys and its own provider settings, which the stated audience
  does not need; Pi through ACP gives the same capability without a second engine.
- **A terminal owner** (tmux or pty, as ClawTeam and herdr do). It works with any agent but
  cannot relay permission requests or render structured turns, and ClawTeam skips
  permissions by default.
- **Keep the Python harness.** It works today. It also leaves every user installing uv and
  Python for a TypeScript app, and leaves two languages in the trunk. The port waits for
  step 4 and must pass the existing tests first.
- **Bundled plugins only.** Safer, and recommended to the Human Owner, who chose to allow
  third-party and user-made plugins. The compromise is in Consequences.
- **Six views including Canvas.** Deferred: the Human Owner listed Canvas but could not yet
  say what a research canvas holds.

## Consequences

- **Order of work.** Four steps, each ending in a check the Human Owner can run: the trunk
  shell; the remaining views and local plugin loading; the product and workspace split with
  the Git binding; the agent layer. They are in HANDOFF.md's Active Work.
- **Direction text.** [GOAL.md](../../os-build/GOAL.md), the README's design stance, and
  the first lines of AGENTS.md describe the earlier direction until the Human Owner
  confirms a revision item by item. GOAL.md's sentence that one root agent moves every
  project forward stays.
- **Plugin trust.** A third-party plugin may add pages, skills, and ACP agent definitions.
  Pages run on their own origin and reach files only through a path-checked channel; an
  ACP definition shows its launch command for the user to confirm. Host-side handlers are
  for bundled plugins until a permission model exists. A plugin installed by an agent does
  nothing until a person enables it.
- **Who checks the TypeScript.** Agents write and review it. The Human Owner does not read
  TypeScript, so every acceptance is a mockup choice, a checklist, or an end-to-end test.
  The quality of the plugin contract itself is therefore not something the Human Owner can
  judge directly; that is an accepted risk.
- **Agent configuration.** The app never edits an agent's settings, credentials, hooks, or
  MCP configuration, and never downloads or updates a vendor CLI. Skill directories are
  written only when the user asks for an install.
- **Antigravity.** Shipped as a bundled ACP plugin that is off until the user enables it,
  with a notice about Google's terms. `agy -p` is not used.
- **Evidence.** Until step 3's outside tester, the positioning rests on a survey and one
  example project. Nothing in the README may say the app is usable by others before then.
  The tester receives a CI artifact only on the Human Owner's explicit word.
- **Vendor terms.** The open points in the table are unresolved. Whether to ask Anthropic
  and Google before any release is the Human Owner's call. Publishing installers stays
  unauthorized, as in ADR-0005.
- **`claude -p`.** If `--bare` becomes the default without a way to keep the plan login,
  the built-in Claude Code adapter stops working on subscriptions. The step 4 port should
  re-check the headless page before choosing the launch arguments.
- **Not taken from OpenResearch.** Managed CLI installs, multi-account profiles, a Cursor
  adapter, and database-held transcripts.
