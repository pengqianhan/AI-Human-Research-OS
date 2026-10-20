# Related Projects

External projects that are related to the Research OS or served as design
references, but are not close enough to list under "Similar Projects" in the
[README](../../README.md#similar-projects). Descriptions follow each project's
own summary; links were checked on 2026-09-29. Add a project here when it
informs the OS without being a research environment of the same kind; move it
to the README list when it is. A weekly
[keyword scan](../../.github/workflows/scan-related-projects.yml) of GitHub
proposes new entries in a pull request; prune them there before merging.

When pruning, drop loops that modify, measure, and keep changes against one
codebase metric (Karpathy-style autoresearch): they optimize code rather than
carry long-horizon research. Prefer system-level projects, with their own
infrastructure and extension points, to skill collections, which simplify as
models improve.

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
- [AutoScholarLoop](https://github.com/damonwan1/AutoScholarLoop): A multi-agent
  AUTO Research loop for idea discovery, experiment execution, evidence-grounded
  paper writing, quality audit, and live Web observation from AI group, CNIC,
  CAS.
- [AutoResearchClaw](https://github.com/aiming-lab/AutoResearchClaw): Fully
  autonomous & self-evolving research from idea to paper. Chat an Idea. Get a
  Paper.
- [AutoResearch](https://github.com/EvoMap/AutoResearch): AI/ML research agents
  from idea to paper-ready evidence. An EvoMap open-source project.
- [NanoResearch](https://github.com/OpenRaiser/NanoResearch): NanoResearch: The
  Autonomous AI Research Assistant.
- [Arbor](https://github.com/RUC-NLPIR/Arbor): A generalist autonomous research
  agent — runs experiments, researches, and iteratively optimizes, autonomously.
- [Principia](https://github.com/pzqpzq/Principia): Principia extracts reusable
  principles, composes those principles into traceable research ideas, and helps
  researchers inspect why an idea may be worth testing.
- [Anti-Autoresearch](https://github.com/wanshuiyin/Anti-Autoresearch): Don't
  trust an autoresearch paper at face value. Reviewer-side integrity forensics
  (self-consistency + fabrication), deterministic verdict.
- [XScientist](https://github.com/smileformylove/XScientist): Turn ideas into
  autonomous research with Git-like evidence histories—inspectable,
  reproducible, and reversible.
- [agi](https://github.com/hyperspaceai/agi): The first distributed AGI system.
  Thousands of autonomous AI agents collaboratively train models, share
  experiments via P2P gossip, and push breakthroughs here. Fully peer-to-peer.
  Join from your browser or CLI.
- [aideml](https://github.com/WecoAI/aideml): AIDE: an LLM agent for machine
  learning engineering - the research Weco grew out of. Referenced in OpenAI
  MLE-bench.
- [luxas](https://github.com/Muuuun/luxas): An autonomous research colleague —
  from a question to a compiled manuscript, while you sleep.
- [CORAL](https://github.com/Human-Agent-Society/CORAL): Open-source
  autoresearch powered by autonomous coding agents. Run Claude Code, OpenCode,
  and Codex with grading, shared knowledge, and multi-agent evolution. Accepted
  at COLM 2026.
- [FOREST](https://github.com/mikamikasuki/FOREST): FOREST is a research agent
  for long-horizon science, where evidence gets lost, errors compound, and goals
  drift.
- [wisp-science](https://github.com/xuzhougeng/wisp-science): Open-source,
  local-first desktop AI research workbench for scientific computing with
  Python/R, MCP bioinformatics tools, SSH/WSL/GPU runtimes, and OpenAI/Anthropic
  models.
- [scholaraio](https://github.com/ZimoLiao/scholaraio): Scholar All-In-One: A
  research infrastructure for AI agents.
- [ResearchClawBench](https://github.com/InternScience/ResearchClawBench):
  ResearchClawBench: Evaluating AI Agents for Automated Research from
  Re-Discovery to New-Discovery.
- [Polaris](https://github.com/ZJU-REAL/Polaris): Toward Autonomous Scientific
  Discovery.
- [Agon](https://github.com/AutoResearch-Factory/Agon): Claude Code plugin for
  autonomous AI research — multi-agent loops take a bare topic all the way to
  running experiments, with no human-written experimental code.
- [station](https://github.com/dualverse-ai/station): The Station is an
  open-world multi-agent environment where AI agents pursue autonomous
  scientific discovery and build a shared literature.
- [EAR (EffectiveAutoResearch)](https://github.com/liyingze07-svg/EffectiveAutoResearch-EAR-):
  An open research workbench for idea discovery, autonomous mathematics, and
  evidence-grounded rebuttals.
- [PaperBanana](https://github.com/dwzhu-pku/PaperBanana): a reference-driven
  multi-agent framework for automated academic illustration generation. The
  hub's
  [drawio-paper](../../research-skills-hub/open-paper-skills/drawio-paper/SKILL.md)
  skill follows its pipeline and uses its PaperBananaBench references.
- [claude-scholar](https://github.com/Galaxy-Dawn/claude-scholar):
  Semi-automated research assistant for academic research and software
  development. Supports Claude Code, Codex CLI, Kimi Code CLI, and OpenCode
  across ideation, coding, experiments, writing, and publication.

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

## Self-improving systems (RSI)

- [autocontext](https://github.com/greyhaven-ai/autocontext): a recursive
  self-improving harness designed to help your agents (and future iterations of
  those agents) succeed on any task.
- [ScienceBuddy](https://github.com/Gen-Verse/ScienceBuddy): ScienceBuddy:
  Recursive-in-Recursive Self-Improvement for Interactive Scientific Agents.

## Skills and lists

- [science-skills](https://github.com/JimLiu/science-skills): the Claude
  Science asset bundle, vendored as
  [research-skills-hub/claude-science-skills](../../research-skills-hub/claude-science-skills/index.md).
- [awesome-AI-for-research](https://github.com/pengqianhan/awesome-AI-for-research):
  the Human Owner's field map of AI systems, infrastructure, benchmarks, and
  papers for scientific discovery; [awesome-AI-for-research/](awesome-AI-for-research/)
  here is a submodule pointer to it.
- [Auto-Research-Skills](https://github.com/brycewang-stanford/Auto-Research-Skills):
  A curated hub of autonomous-research skills & agents — from idea to paper, on
  autopilot.
- [de-anthropocentric-research-engine](https://github.com/yogsoth-ai/de-anthropocentric-research-engine):
  A 267-skill research graph in pure markdown — 51 research operations built
  from 216 single-purpose steps, composed in any order with explicit
  backtracking. One npx install, no runtime, no MCP bindings.
- [skills](https://github.com/dzhng/skills): Reusable AI agent skills for
  software factories: explore ideas, write specs, implement, review, and run
  autonomous research. Works with Claude Code, Codex, and other skill-compatible
  agents.
- [scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills):
  Turn any AI agent into an AI Scientist. The #1 Agent Skills library for
  science, used by 250,000+ scientists worldwide.
- [open-science](https://github.com/ai4s-research/open-science): Open Science
  Desktop — local-first, model-agnostic AI research workbench for macOS, Windows
  & Linux. Open-source Claude Science desktop alternative built on Tauri + MCP +
  agent skills.
- [Aut_Sci_Write](https://github.com/ShZhao27208/Aut_Sci_Write): Academic
  research skills suite for AI Agent — literature search/download
  (WoS+Elsevier+Springer), PDF extraction, figure cropping, review writing,
  Zotero sync, and PPT/Html generation.
- [academic-research-skills](https://github.com/Imbad0202/academic-research-skills):
  Academic Research Skills for Claude Code: research → write → review → revise →
  finalize. Its Codex-native sibling is
  [ARS-Codex](https://github.com/Imbad0202/academic-research-skills-codex).
- [Auto-claude-code-research-in-sleep](https://github.com/wanshuiyin/Auto-claude-code-research-in-sleep):
  ARIS (Auto-Research-In-Sleep) — Lightweight Markdown-only skills for
  autonomous ML research: cross-model review loops, idea discovery, and
  experiment automation.
- [AI-Research-SKILLs](https://github.com/Orchestra-Research/AI-Research-SKILLs):
  Comprehensive open-source library of AI research and engineering skills for
  any AI model. Package the skills and your claude code/codex/gemini agent will
  be an AI research agent with full horsepower. The hub's
  [ml-paper-writing](../../research-skills-hub/collected-skills/ml-paper-writing/SKILL.md)
  is vendored from it.

## Articles

- [How to Make Codebases AI Agents Love](https://www.aihero.dev/how-to-make-codebases-ai-agents-love):
  how deep modules and codebase architecture make AI coding more effective.
