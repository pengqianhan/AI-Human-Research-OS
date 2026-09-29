# Related Projects

External projects that are related to the Research OS or served as design
references, but are not close enough to list under "Similar Projects" in the
[README](../../README.md#similar-projects). Descriptions follow each project's
own summary; links were checked on 2026-09-29. Add a project here when it
informs the OS without being a research environment of the same kind; move it
to the README list when it is. A weekly
[keyword scan](../../.github/workflows/scan-related-projects.yml) of GitHub
proposes new entries in a pull request; prune them there before merging.

## Research agents and workbenches

- [OpenScience](https://github.com/synthetic-sciences/openscience): an
  open-source AI workbench for scientific research, a research agent that plans,
  gathers evidence, runs code and experiments, and writes up results as a
  desktop app, CLI, or browser workspace.
- [Microsoft ResearchStudio](https://github.com/microsoft/ResearchStudio): a
  collection of Claude Code and Codex skills covering the research lifecycle,
  from an under-specified direction to a published paper, plus posters and
  videos. Its idea suite is vendored in
  [collected-skills/ResearchStudio-Idea](../../research-skills-hub/collected-skills/ResearchStudio-Idea/README.md).
- AutoR (`https://github.com/AutoX-AI-Labs/AutoR`): autonomous research
  workflow and artifact design. The upstream returned 404 on 2026-09-29, and
  [AutoR/](AutoR/) here is a submodule pointer without content.
- [autolab](https://github.com/autolabhq/autolab): a benchmark for evaluating AI
  agents on frontier, ultra-long-horizon auto-research tasks.

## Agent runtimes and operating systems

- [wanman](https://github.com/chekusu/wanman): an agent-matrix runtime in which
  a local supervisor runs a network of Claude Code or Codex CLI agents in
  company-like roles (CEO, dev, devops, marketing) while the human observes;
  hosted edition at [wanman.ai](https://wanman.ai/). The desktop shell of
  [os-ui](../../os-ui/README.md) was inspired by wanman.ai, and running agents
  as CLI subprocesses on the user's own login parallels
  [os-harness](../../os-harness/README.md).
- [Apache Maka](https://github.com/apache/maka) (formerly `jackwener/maka-agent`):
  an agent workspace that keeps a complete record of everything it did.
- [eve](https://github.com/vercel/eve): an open framework for building agents.
- [duoduo](https://github.com/openduo/duoduo): an autonomous agent runtime.
- [rome](https://github.com/rome-os/rome): a compounding agent OS for recursive
  agents.
- [EvoScientist](https://github.com/EvoScientist/EvoScientist): EvoScientist is an out-of-the-box, self-evolving AI research buddy that adopts a human-on-the-loop paradigm—autonomously exploring, refining scientific judgment, and co-evolving alongside human researchers.

## Skills and lists

- [science-skills](https://github.com/JimLiu/science-skills): the Claude
  Science asset bundle, vendored as
  [research-skills-hub/claude-science-skills](../../research-skills-hub/claude-science-skills/index.md).
- [awesome-AI-for-research](https://github.com/pengqianhan/awesome-AI-for-research):
  the Human Owner's field map of AI systems, infrastructure, benchmarks, and
  papers for scientific discovery; [awesome-AI-for-research/](awesome-AI-for-research/)
  here is a submodule pointer to it.

## Articles

- [How to Make Codebases AI Agents Love](https://www.aihero.dev/how-to-make-codebases-ai-agents-love):
  how deep modules and codebase architecture make AI coding more effective.
