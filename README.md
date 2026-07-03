# AI-Human Research OS

A lightweight, folder-based research operating system for humans working with
code agents such as Codex and Claude Code. The agent is the execution core; the
human steers in natural language. There is no database, server, or CLI — just a
stable directory layout, a few conventions, and reusable skills, so agents can
support long-term, iterative research with low token cost.

The folder structure is intentionally simple and non-linear. Research ideas,
references, experiments, figures, and writing often update each other, so the
folders are organized by material type rather than by a fixed workflow.

## Current Design Stance

This OS is best understood as a file-system-native environment for long-horizon
human-agent research. The human user's research practice is the primary target;
reusable open-source templates are a byproduct, and product/platform ideas stay
future-compatible without driving current complexity.

The default operating policy is **portfolio always on, intra-project parallelism
on demand**. Multiple projects can be tracked at once, but multi-agent execution
inside a project should start only when the task is decomposable, verifiable, and
worth the merge cost. Agent-led research is controlled by the `agent_led_research`
policy in [Memory/MEMORY.md](Memory/MEMORY.md): `off`, `scout_only`, or
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

| Path | Purpose |
|---|---|
| [Ideas/](Ideas/) | OKF bundle for research ideas, hypotheses, inspirations, and early discussions |
| [Human/](Human/) | Stable user context, collaboration preferences, workflows, and privacy boundaries |
| [projects-folder/](projects-folder/) | Container for project instances and reusable project templates |
| [projects-folder/templates/ai_research_template/](projects-folder/templates/ai_research_template/) | AI-research paper template copied to start a new project |
| [Memory/](Memory/) | Global long-term memory across projects |
| [Research-skills-hub/](Research-skills-hub/) | Store of reusable agent skills |
| `.agents/skills/`, `.claude/skills/` | Installed skills (two identical copies) |
| [INSTRUCTION.md](INSTRUCTION.md) | Agent operating guide (read first) |
| [FILETREE.md](FILETREE.md) | Auto-maintained repository index |

## Minimal Workflow

idea → [Ideas/](Ideas/) OKF concept or idea bundle → copy
[ai_research_template/](projects-folder/templates/ai_research_template/) to
`projects-folder/<ProjectName>/` → experiments in
`projects-folder/<ProjectName>/Code/`, figures in `Figs/` → write
`paper/main.tex` with local references in `paper/references.bib` → memory updated in
project `PROJECT_MEMORY.md` and
[Memory/MEMORY.md](Memory/MEMORY.md). Details: [INSTRUCTION.md](INSTRUCTION.md).
A complete worked example (code → figure → compiled PDF) lives in
[projects-folder/Example_Project/](projects-folder/Example_Project/).

## License

Original content in this repository is licensed under the [MIT License](LICENSE).
Third-party vendored or collected content keeps its original license. Currently
[Research-skills-hub/science-skills/](Research-skills-hub/science-skills/) is
provided under Apache-2.0 via its own
[LICENSE](Research-skills-hub/science-skills/LICENSE), and
[Research-skills-hub/collected-skills/](Research-skills-hub/collected-skills/)
keeps per-skill upstream attribution and license terms.

## Roadmap (original TODO list)

> Note: the memory-mechanism items below are now partially implemented — see
> INSTRUCTION.md → Memory Layers (global `Memory/MEMORY.md` + per-project
> `PROJECT_MEMORY.md`). The rest remains open.

- [ ] add find-research-skills, which can help the AI agent to find the right research skills in `Research-skills-hub/` folder or even online
- [ ] create a skill which can access them markdown files of paper, such as 'hf cli', 'https://github.com/timf34/arxiv2md','deepxive cli' and so on.
- [ ] in References/ folder, maintain a paper-wiki, which includes the summary, key points, and relation to the research project for each paper. The paper-wiki can be implemented as a markdown file or a simple database. The paper-wiki can help the AI agent to quickly find relevant papers and understand their content.
- [ ] Design this template as a CLI so agents can use commands to understand the whole
   research project.
- [ ] Design bash commands that make agents deterministically read specific files, such as `INSTRUCTION.md`, at the start of each session.
- [ ] Add memory mechanisim. Doing research is a long-term process, and the AI agent needs to remember the research progress, including the ideas, references, and experiments. The memory can be implemented as a simple database or a more complex knowledge graph. The memory can also be used to track the research progress and provide feedback to the human researcher. 
   - [ ] The memory should include global memory, which stores the overall research progress and important information, and local memory, which stores the right now research project. Because the research always can be cross domain. And for ADHDers, they may have multiple research projects at the same time, so the local memory can help them to focus on the current project.
- [ ] Add `read_paper` workflow， which manages the process of reading a paper, including summarizing it, extracting key points, and relating it to the research project. The workflow can be used in both `Ideas/` and `References/` folders. Besides, when AI meet a problem that it cannot solve, it can use this workflow to read relevant papers and find solutions. All the new reading papers will be stored in `References/` folder, and the summary and key points will be stored in `Ideas/` folder.
- [ ] Add a workspace where holding a group meeting with humans and AI, humans discuss research with the AI. Because AI can search paper and read fast, they can point out if the idea is feasible or not, and they can also point out relevant papers that humans might miss. This can be a good way to brainstorm research ideas and get feedback on them. After discussion, the AI can implement the idea or feedback immediately.
- [ ] The final goal of the repo is to build a Research OS.
- [ ] add interface according to [AlookAI](https://github.com/alookai/alook) and [Wanman](https://github.com/chekusu/wanman)

## Reference projects

- [AutoR](https://github.com/AutoX-AI-Labs/AutoR)
- [autolab](https://github.com/autolabhq/autolab)
- [eve](https://github.com/vercel/eve)
- [maka-agent](https://github.com/jackwener/maka-agent)
- [awesome-AI-for-research](Resource/awesome-AI-for-research)
- [duoduo](https://github.com/openduo/duoduo)
- [FAROS](https://github.com/OpenNSWM-Lab/FAROS/tree/main)
