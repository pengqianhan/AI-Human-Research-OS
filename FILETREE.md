# Project Filetree

_Auto-maintained compact navigation index by the filetree-simple skill. Indexed entries carry content hashes; mismatches indicate stale summaries._

## (root)/

- `.agents/` - Local agent configuration and workspace skills used by Codex and Claude workflows. <!--hash:c95340aa-->
- `.claude/` - Local Claude Code configuration and workspace skills for this research template. <!--hash:ec2eb0f6-->
- `Example_Project/` - Worked example from the OS smoke test: idea to runnable code, generated figure, and compiled PDF. <!--hash:435ece8f-->
- `Ideas/` - Research ideas, hypotheses, outlines, meeting notes, and reflections. <!--hash:bcb5bee2-->
- `Memory/` - Research memory area for long-term context, project notes, decisions, and progress. <!--hash:c62422af-->
- `paper-library/` - OKF-style paper library: paper and topic notes, indexes, and a generated graph visualization (viz.html). <!--hash:ce8d5022-->
- `Paper_Initial_template/` - Reusable project and paper starter template for developing feasible research ideas. <!--hash:417d33dd-->
- `Research-skills-hub/` - Optional research skills and helper files available for installation. <!--hash:ef77791c-->
- `.gitignore` - Ignores OS files, editor settings, local environments, caches, scratch directories, agent-local data, and LaTeX build output. <!--hash:f443f281-->
- `AGENTS.md` - Codex entry instruction directing agents to read INSTRUCTION.md at session start. <!--hash:306510c0-->
- `CHANGE_SUMMARY.html` - HTML change summary of the 2026-06 normalization: commits, per-problem fixes, deviations, user decisions D1-D9, acceptance results. <!--hash:fb88ce4e-->
- `CLAUDE.md` - Claude Code entry instruction directing agents to read INSTRUCTION.md at session start. <!--hash:b5dc49b2-->
- `INSTRUCTION.md` - Primary agent guide: startup order, core workflows, memory layers, skills lifecycle, plugin model, Python environments, and research safety rules. <!--hash:67aced84-->
- `OS_INTRO.html` - HTML introduction to the Research OS: orientation chain, directory map, five entry questions, workflows, memory layers, skills model. <!--hash:4f5c9d90-->
- `README.md` - Human-facing overview: quick start, core directory map, minimal workflow, preserved roadmap TODOs, and reference projects. <!--hash:f64ad651-->
- `task.md` - Structured exploratory task prompt for normalizing the AI-Human Research OS with code agents. <!--hash:9f3ac318-->
- `task_en.md` - English exploratory task prompt for normalizing the AI-Human Research OS with code agents. <!--hash:87862ef9-->
- `task_plan.html` - Detailed executed normalization plan with verified problem inventory, phased steps, decisions, and a live progress TODO table. <!--hash:64fc61bf-->

## .agents/

- `skills/` - Repository-local agent skills available for this research workspace. <!--hash:19201c86-->

## .agents/skills/

- `filetree-simple/` - Compact FILETREE.md maintenance skill and helper script. <!--hash:b7f64a85-->
- `literature_search_arxiv/` - arXiv paper search and retrieval skill with metadata and download scripts. <!--hash:d2895c25-->
- `literature_search_openalex/` - OpenAlex scholarly database search skill for papers, authors, institutions, and bibliometrics. <!--hash:c7a1b779-->
- `paper-library-manager/` - Repo-local OKF paper library manager skill: maintain paper/topic notes, indexes, schema, validation, and viz.html. <!--hash:6e6cfa51-->
- `science_skills_common/` - Shared HTTP client package used by Science Skills literature search tools. <!--hash:f5f8923c-->
- `session-handoff/` - Cross-session hand-off skill: maintain task_plan.html progress TODO and CHANGE_SUMMARY.html records for resuming work. <!--hash:fc396b60-->
- `uv/` - uv prerequisite skill for checking or installing the Python package manager used by science skills. <!--hash:08b9625a-->
- `uv-env/` - uv-based Python environment setup skill for research projects. <!--hash:66b388be-->

## .claude/

- `skills/` - Claude Code workspace skills mirrored from repository-local agent skills. <!--hash:28ce3af1-->

## .claude/skills/

- `filetree-simple/` - Compact FILETREE.md maintenance skill and helper script. <!--hash:b7f64a85-->
- `literature_search_arxiv/` - arXiv paper search and retrieval skill with metadata and download scripts. <!--hash:d2895c25-->
- `literature_search_openalex/` - OpenAlex scholarly database search skill for papers, authors, institutions, and bibliometrics. <!--hash:c7a1b779-->
- `paper-library-manager/` - Repo-local OKF paper library manager skill: maintain paper/topic notes, indexes, schema, validation, and viz.html. <!--hash:6e6cfa51-->
- `science_skills_common/` - Shared HTTP client package used by Science Skills literature search tools. <!--hash:f5f8923c-->
- `session-handoff/` - Cross-session hand-off skill: maintain task_plan.html progress TODO and CHANGE_SUMMARY.html records for resuming work. <!--hash:fc396b60-->
- `uv/` - uv prerequisite skill for checking or installing the Python package manager used by science skills. <!--hash:08b9625a-->
- `uv-env/` - uv-based Python environment setup skill for research projects. <!--hash:66b388be-->

## Example_Project/

- `Baselines/` - Baseline notes area inherited from the template; unused in this synthetic example. <!--hash:5c93fd7e-->
- `Code/` - Linear-fit smoke-test experiment: uv environment, fit_line.py, run commands, and reproducible results in bilingual READMEs. <!--hash:c4b68586-->
- `Figs/` - Generated figures for the example project, including the linear_fit.png output of fit_line.py. <!--hash:05d901fd-->
- `main.tex` - Compiled smoke-test manuscript reporting the linear-fit numbers with a real arXiv citation from the shared bibliography. <!--hash:f203ae18-->
- `paper_skeleton.md` - Manuscript control sheet filled with the smoke-test example's snapshot and source map. <!--hash:6ec8f34a-->
- `PROJECT_MEMORY.md` - Project memory for the smoke-test example: snapshot, build-convention decision, progress log. <!--hash:60389ec6-->

## Example_Project/Baselines/

- `Baseline_readme.md` - Reminder note emphasizing optimized baselines for research comparisons. <!--hash:2efac95c-->

## Ideas/

- `Ideas_log.md` - Append-style idea log with entry format; ideas tracked from raw to promoted with links to projects. <!--hash:91ffe95a-->

## Memory/

- `MEMORY.md` - Global research memory: long-term goals, active projects table, cross-project decisions, and lessons. <!--hash:05e18a0c-->

## Paper_Initial_template/

- `Baselines/` - Baseline experiment notes, comparisons, and related materials for new research projects. <!--hash:854903c4-->
- `Code/` - Template code area with uv environment conventions, bilingual README skeletons, and Datasets placeholder. <!--hash:87d4fafb-->
- `Figs/` - Template area for figures, tables, plots, screenshots, and visual outputs. <!--hash:5c8555d9-->
- `main.tex` - Minimal LaTeX scaffold that compiles out of the box; documents the latexmk build command and shared-bibliography path. <!--hash:ea6430e8-->
- `paper_skeleton.md` - Reusable manuscript control template with source maps, baselines, experiments, claim tracking, and writing TODOs. <!--hash:0bd9ac84-->
- `PROJECT_MEMORY.md` - Project-memory template: snapshot, key decisions, progress log, and open TODOs. <!--hash:dd7664f3-->

## Paper_Initial_template/Baselines/

- `Baseline_readme.md` - Reminder note emphasizing optimized baselines for research comparisons. <!--hash:2efac95c-->

## paper-library/

- `papers/` - Individual paper notes (one Markdown file per arXiv paper) plus an index of all papers. <!--hash:ae27ef61-->
- `topics/` - Topic summary pages grouping related papers by durable research theme, plus a topics index. <!--hash:dadb6b20-->
- `index.md` - Top-level entry point linking to the papers and topics indexes of the paper library. <!--hash:2dd97dfd-->
- `viz.html` - Generated interactive graph visualization of the paper library (papers, topics, and their links). <!--hash:923f839c-->

## paper-library/papers/

- `2605.22721.md` - Paper note: Self-Evolving Multi-Agent Systems via Decentralized Memory (DecentMem). <!--hash:c9fb039d-->
- `2605.28655.md` - Paper note: AutoScientists, self-organizing agent teams for long-running scientific experimentation. <!--hash:af7b1562-->
- `2605.31464.md` - Paper note: GPU Forecasters, LLM surrogates that forecast GPU kernel performance to speed up kernel search. <!--hash:d1150252-->
- `2606.06741.md` - Paper note: OpenSkill, open-world self-evolution for LLM agents via self-built skills and verification. <!--hash:be7afa30-->
- `2606.10662.md` - Paper note: decentralized multi-agent systems coordinating through shared verified context. <!--hash:c783e703-->
- `index.md` - Index of all paper notes in the library, one line per paper. <!--hash:2762fc7b-->

## paper-library/topics/

- `agent-self-evolution.md` - Topic: agents that improve their own skills, verification signals, or behavior after deployment. <!--hash:ac00bdb8-->
- `ai-for-science.md` - Topic: AI systems that design, run, and revise scientific experiments. <!--hash:25c7dcf2-->
- `gpu-kernel-optimization.md` - Topic: searching for and evaluating fast GPU kernels, including the cost of on-device measurement. <!--hash:633707a4-->
- `index.md` - Index of all topic pages in the library, one line per topic. <!--hash:97cad1f2-->
- `llm-agents.md` - Topic: language-model agents, skills, verification, and autonomous task execution. <!--hash:cca0d780-->
- `llm-surrogate-models.md` - Topic: LLMs used as predictive surrogates that forecast outcomes instead of generating or acting directly. <!--hash:49f9bb25-->
- `multi-agent-systems.md` - Topic: multiple agents coordinating work, state, and reasoning. <!--hash:c0be8304-->
