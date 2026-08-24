# AI-Human Research OS

> "Be Water, My Friend.
> Empty your mind.
> Be formless, shapeless, like water.
> You put water into a cup, it becomes the cup.
> You put water into a bottle, it becomes the bottle.
> You put it into a teapot, it becomes the teapot.
> Now water can flow or it can crash.
> Be water, my friend."
>
> — Bruce Lee

An agent is like water: it has no fixed form, and takes on the abilities of
whatever container holds it. This repository is a container shaped for agents —
a stable environment that lets a code agent flow into long-horizon research and
do its best work.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Agents: Claude Code · Codex](<https://img.shields.io/badge/agents-Claude%20Code%20%C2%B7%20Codex-blue.svg>)](#quick-start)
[![No DB · No server · No CLI](<https://img.shields.io/badge/stack-folders%20%2B%20conventions-lightgrey.svg>)](#core-directories)

A lightweight, folder-based research operating system for humans working with
code agents such as Codex and Claude Code. The agent is the execution core; the
human steers in natural language. There is no database, server, or CLI — just a
stable directory layout, a few conventions, and reusable skills, so agents can
support long-term, iterative research with low token cost.

The folder structure is intentionally simple and non-linear. Research ideas,
references, experiments, figures, and writing often update each other, so the
folders are organized by material type rather than by a fixed workflow.

## Table of Contents

- [Current Design Stance](#current-design-stance)
- [Quick Start](#quick-start)
- [Core Directories](#core-directories)
- [Minimal Workflow](#minimal-workflow)
- [License](#license)
- [Roadmap](#roadmap-original-todo-list)
- [Reference Projects](#reference-projects)

## Current Design Stance

This OS is best understood as a file-system-native environment for long-horizon
human-agent research. The human user's research practice is the primary target;
reusable open-source templates are a byproduct, and product/platform ideas stay
future-compatible without driving current complexity.

The default operating policy is **portfolio always on, intra-project parallelism
on demand**. Multiple projects can be tracked at once, but multi-agent execution
inside a project should start only when the task is decomposable, verifiable, and
worth the merge cost. Agent-led research is controlled by the `agent_led_research`
policy in [memory/MEMORY.md](memory/MEMORY.md): `off`, `scout_only`, or
`full_gated`.

Human-led and agent-led work use the same evaluation stance: hard checks,
rubric scoring, and LLM critique evaluate complete artifacts such as code,
figures, references, and paper drafts, not empty ideas.

## Quick Start

1. Clone the repository and open it with Claude Code or Codex.
2. The agent entry files ([CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md)) direct
   the agent to [INSTRUCTION.md](INSTRUCTION.md), which defines startup order,
   core workflows, memory rules, and research-material protection rules.
3. Talk to the agent in natural language, e.g. "record this idea", "start a
   project from idea X", "add this paper to the references".

## Core Directories

| Path                                                                                              | Purpose                                                                           |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [ideas/](ideas/)                                                                                   | OKF bundle for research ideas, hypotheses, inspirations, and early discussions    |
| [human/](human/)                                                                                   | Stable user context, collaboration preferences, workflows, and privacy boundaries |
| [projects-folder/](projects-folder/)                                                               | Container for project instances and reusable project templates                    |
| [projects-folder/templates/ai_research_template/](projects-folder/templates/ai_research_template/) | AI-research paper template copied to start a new project                          |
| [memory/](memory/)                                                                                 | Global long-term memory across projects                                           |
| [research-skills-hub/](research-skills-hub/)                                                       | Store of reusable agent skills                                                    |
| `.agents/skills/`, `.claude/skills/`                                                          | Installed skills (two identical copies)                                           |
| [INSTRUCTION.md](INSTRUCTION.md)                                                                   | Agent operating guide (read first)                                                |
| [FILETREE.md](FILETREE.md)                                                                         | Auto-generated top-level navigation map                                           |

## Minimal Workflow

idea → [ideas/](ideas/) OKF concept or idea bundle → copy
[ai_research_template/](projects-folder/templates/ai_research_template/) to
`projects-folder/<ProjectName>/` → experiments in
`projects-folder/<ProjectName>/Code/`, figures in `Figs/` → write
`paper/main.tex` with local references in `paper/references.bib` → memory updated in
project `PROJECT_MEMORY.md` and
[memory/MEMORY.md](memory/MEMORY.md). Details: [INSTRUCTION.md](INSTRUCTION.md).
A complete worked example (code → figure → compiled PDF) lives in
[projects-folder/Example_Project/](projects-folder/Example_Project/).

## License

Original content in this repository is licensed under the [MIT License](LICENSE).
Third-party vendored or collected content keeps its original license. Currently
[research-skills-hub/science-skills/](research-skills-hub/science-skills/) is
provided under Apache-2.0 via its own
[LICENSE](research-skills-hub/science-skills/LICENSE), and
[research-skills-hub/collected-skills/](research-skills-hub/collected-skills/)
keeps per-skill upstream attribution and license terms.

## Roadmap (original TODO list)

> Note: the memory-mechanism items below are now partially implemented — see
> INSTRUCTION.md → Memory Layers (global `memory/MEMORY.md` + per-project
> `PROJECT_MEMORY.md`). The rest remains open.

- [ ] For projects-folder and templates, create a skill which can automatically create a new project from the template, and copy the template to the new project folder. The skill can also help the AI agent to manage the projects, including adding new projects, updating existing projects, and deleting old projects. Using skill makes the OS more flexible and the skill can be a plugin for other code agents. In the initial state the skill can help create a new project from the template, and then the AI agent can use the skill to manage the projects and understand the project structure. Futhermore, the ideas/ folder can also be managed by the research-ideas-manager skill.
- [X] A map of `research-skills-hub` or an index of all skills should be added to `research-skill-installer` so that the AI agent can quickly locate the required skills and install them into `.agents/skills/` or `.claude/skills/`. For this skill, please refer to [find-skills](https://github.com/vercel-labs/skills/blob/main/skills/find-skills/SKILL.md).
- [X] Regarding skills, is it sufficient to install them globally and activate them on demand for different projects? This way, a single configuration file can manage the installation and activation of skills, avoiding redundant installations and saving disk space.
- [ ] This OS should be able to accept any kind of input from users, such as an idea, a codebase, a paper draft, and so on. After users add these materials to the OS, it should automatically archive them, place them into the appropriate folders, and integrate them into the overall system.
- [ ] create a skill which can access them markdown files of paper, such as 'hf cli', 'https://github.com/timf34/arxiv2md','deepxive cli' and so on.
- [ ] Design this template as a CLI so agents can use commands to understand the whole research project.
- [ ] Design bash commands that make agents deterministically read specific files, such as `INSTRUCTION.md`, at the start of each session.
- [ ] Add a workspace where holding a group meeting with humans and AI, humans discuss research with the AI. Because AI can search paper and read fast, they can point out if the idea is feasible or not, and they can also point out relevant papers that humans might miss. This can be a good way to brainstorm research ideas and get feedback on them. After discussion, the AI can implement the idea or feedback immediately.
- [ ] The final goal of the repo is to build a Research OS.
- [ ] add interface according to [AlookAI](https://github.com/alookai/alook) and [Wanman](https://github.com/chekusu/wanman) and [不二的主页](https://hiesther.me/#home)
- [X] in References/ folder, maintain a paper-wiki, which includes the summary, key points, and relation to the research project for each paper. The paper-wiki can be implemented as a markdown file or a simple database. The paper-wiki can help the AI agent to quickly find relevant papers and understand their content. — Implemented as the [paper-wiki/](paper-wiki/) OKF paper wiki maintained by the `paper-wiki-manager` skill: per-paper pages, topic pages, concept entity pages (methods/datasets/benchmarks/metrics/terms/tools), optional `# Used In Projects` links, a generated `viz.html` graph, and an executable validator. - add `paper-wiki-manager` skill, which can help the AI agent to manage the paper-wiki, including adding new papers, updating existing papers, and deleting old papers. The skill can also help the AI agent to generate the `viz.html` graph and validate the paper-wiki. The skill can be used in both `ideas/` and `paper/` folders. remove the 'References/' folder, and move all the papers to `paper-wiki/` folder.
- [X] Add `read_paper` workflow， which manages the process of reading a paper, including summarizing it, extracting key points, and relating it to the research project. The workflow can be used in both `ideas/` and `References/` folders. Besides, when AI meet a problem that it cannot solve, it can use this workflow to read relevant papers and find solutions. All the new reading papers will be stored in `References/` folder, and the summary and key points will be stored in `ideas/` folder. - add `paper-wiki-manager` skill, which can help the AI agent to manage papers in paper-wiki.
- [X] add find-research-skills, which can help the AI agent to find the right research skills in `research-skills-hub/` folder or even online
- [X] Add memory mechanisim. Doing research is a long-term process, and the AI agent needs to remember the research progress, including the ideas, references, and experiments. The memory can be implemented as a simple database or a more complex knowledge graph. The memory can also be used to track the research progress and provide feedback to the human researcher.

  - [X] The memory should include global memory, which stores the overall research progress and important information, and local memory, which stores the right now research project. Because the research always can be cross domain. And for ADHDers, they may have multiple research projects at the same time, so the local memory can help them to focus on the current project.- `memory/MEMORY.md` is the global memory, and `PROJECT_MEMORY.md` is the local memory for each project. `human` in this folder, there are some files to store the human's preferences.

## Reference Projects

- [AutoR](https://github.com/AutoX-AI-Labs/AutoR): [code](os-build/references/AutoR)
- [autolab](https://github.com/autolabhq/autolab)
- [eve](https://github.com/vercel/eve)
- [maka-agent](https://github.com/jackwener/maka-agent)
- [awesome-AI-for-research](os-build/references/awesome-AI-for-research)
- [duoduo](https://github.com/openduo/duoduo)
- [FAROS](https://github.com/OpenNSWM-Lab/FAROS/tree/main)
- [science-skills](https://github.com/JimLiu/science-skills)
- [openscience](https://github.com/synthetic-sciences/openscience)
- [How to Make Codebases AI Agents Love](https://www.aihero.dev/how-to-make-codebases-ai-agents-love)
- [Microsoft Research Studio](https://github.com/microsoft/ResearchStudio/tree/main)
- [openscience](https://github.com/synthetic-sciences/openscience)
- [rome](https://github.com/rome-os/rome):Rome is the agentic OS.
