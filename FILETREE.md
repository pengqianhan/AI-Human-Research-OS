# Project Filetree

_Auto-maintained compact navigation index by the filetree-simple skill. Indexed entries carry content hashes; mismatches indicate stale summaries._

## (root)/

- `.agents/` - Local agent configuration and workspace skills used by Codex and Claude workflows. <!--hash:c95340aa-->
- `.claude/` - Local Claude Code configuration and workspace skills for this research template. <!--hash:ec2eb0f6-->
- `Ideas/` - OKF bundle for research ideas, including nested idea bundles, concept notes, and update logs. <!--hash:4da8f0bb-->
- `Memory/` - Research memory area for long-term context, project notes, decisions, and progress. <!--hash:c62422af-->
- `paper-library/` - OKF-style paper library: paper and topic notes, indexes, and a generated graph visualization (viz.html). <!--hash:ce8d5022-->
- `projects-folder/` - Container for project instances and reusable project templates, with an index of all projects. <!--hash:01eb9fbf-->
- `Research-skills-hub/` - Canonical hub of reusable research skills (science-skills/, open-paper-skills/); see its index.md for the catalog and install steps. <!--hash:28c252a1-->
- `.gitignore` - Ignores OS files, editor settings, local environments, caches, scratch directories, agent-local data, and LaTeX build output. <!--hash:4c2a20c7-->
- `AGENTS.md` - Codex entry instruction directing agents to read INSTRUCTION.md at session start. <!--hash:306510c0-->
- `CHANGE_SUMMARY.md` - Backward-looking record: decisions with how-to-reverse, deviations, and intentionally-not-done; commits are read from git, not duplicated. <!--hash:854bf478-->
- `CLAUDE.md` - Claude Code entry instruction directing agents to read INSTRUCTION.md at session start. <!--hash:b5dc49b2-->
- `INSTRUCTION.md` - Primary agent guide: startup order, core workflows, memory layers, skills lifecycle, plugin model, Python environments, and research safety rules. <!--hash:f1c4bb60-->
- `OS_INTRO.html` - HTML introduction to the Research OS: orientation chain, directory map, five entry questions, workflows, memory layers, skills model. <!--hash:d003ed31-->
- `README.md` - Human-facing overview: quick start, core directory map, minimal workflow, preserved roadmap TODOs, and reference projects. <!--hash:60aae52b-->
- `task.md` - Structured exploratory task prompt for normalizing the AI-Human Research OS with code agents. <!--hash:9f3ac318-->
- `task_en.md` - English exploratory task prompt for normalizing the AI-Human Research OS with code agents. <!--hash:87862ef9-->
- `task_plan.md` - Forward-looking session hand-off: resume point, live Progress TODO, standing guardrails, and a pointer to the decisions record. <!--hash:f45909cd-->

## .agents/

- `skills/` - Repository-local agent skills available for this research workspace. <!--hash:19201c86-->

## .agents/skills/

- `filetree-simple/` - Compact FILETREE.md maintenance skill and helper script. <!--hash:372f3743-->
- `literature_search_arxiv/` - arXiv paper search and retrieval skill with metadata and download scripts. <!--hash:d2895c25-->
- `literature_search_openalex/` - OpenAlex scholarly database search skill for papers, authors, institutions, and bibliometrics. <!--hash:c7a1b779-->
- `paper-library-manager/` - Repo-local OKF paper library manager skill: maintain paper/topic notes, indexes, schema, validation, and viz.html. <!--hash:6e6cfa51-->
- `science_skills_common/` - Shared HTTP client package used by Science Skills literature search tools. <!--hash:f5f8923c-->
- `session-handoff/` - Cross-session hand-off skill: maintain task_plan.md + CHANGE_SUMMARY.md (resume TODO, decisions, deviations) for resuming work. <!--hash:37837e8d-->
- `uv/` - uv prerequisite skill for checking or installing the Python package manager used by science skills. <!--hash:08b9625a-->
- `uv-env/` - uv-based Python environment setup skill for research projects. <!--hash:66b388be-->

## .claude/

- `skills/` - Claude Code workspace skills mirrored from repository-local agent skills. <!--hash:28ce3af1-->

## .claude/skills/

- `filetree-simple/` - Compact FILETREE.md maintenance skill and helper script. <!--hash:372f3743-->
- `literature_search_arxiv/` - arXiv paper search and retrieval skill with metadata and download scripts. <!--hash:d2895c25-->
- `literature_search_openalex/` - OpenAlex scholarly database search skill for papers, authors, institutions, and bibliometrics. <!--hash:c7a1b779-->
- `paper-library-manager/` - Repo-local OKF paper library manager skill: maintain paper/topic notes, indexes, schema, validation, and viz.html. <!--hash:6e6cfa51-->
- `science_skills_common/` - Shared HTTP client package used by Science Skills literature search tools. <!--hash:f5f8923c-->
- `session-handoff/` - Cross-session hand-off skill: maintain task_plan.md + CHANGE_SUMMARY.md (resume TODO, decisions, deviations) for resuming work. <!--hash:37837e8d-->
- `uv/` - uv prerequisite skill for checking or installing the Python package manager used by science skills. <!--hash:08b9625a-->
- `uv-env/` - uv-based Python environment setup skill for research projects. <!--hash:66b388be-->

## Ideas/

- `idea_example/` - Nested OKF idea bundle demonstrating folder-shaped idea representation for the promoted linear-fit smoke test. <!--hash:bf5133ae-->
- `index.md` - OKF bundle entry point for research ideas, status profile, and nested idea bundle links. <!--hash:452de361-->
- `log.md` - Chronological update log for the Ideas OKF bundle. <!--hash:85961789-->

## Ideas/idea_example/

- `index.md` - Entry point listing the example idea concept and related project/task assets. <!--hash:b84829fe-->
- `linear-fit-micro-experiment.md` - OKF Idea concept for the promoted linear-fit micro-experiment that validates the OS pipeline. <!--hash:05ab486d-->
- `log.md` - Chronological update log for the nested idea_example OKF bundle. <!--hash:481b0659-->

## Memory/

- `MEMORY.md` - Global research memory: long-term goals, active projects table, cross-project decisions, and lessons. <!--hash:04cb026d-->

## Research-skills-hub/

- `index.md` - Index of the Research Skills Hub: links to the science-skills and open-paper-skills collections plus the install procedure. <!--hash:85c1e3de-->

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

## projects-folder/

- `Example_Project/` - Worked example from the OS smoke test: idea to runnable code, generated figure, and compiled PDF. <!--hash:897b989b-->
- `templates/` - Reusable project templates copied into projects-folder/ to start new projects, plus a template index. <!--hash:16fd6937-->
- `index.md` - Project index linking each project instance and the reusable templates, with instructions for adding a project. <!--hash:685b13fb-->

## projects-folder/Example_Project/

- `Baselines/` - Baseline notes area inherited from the template; unused in this synthetic example. <!--hash:2bfe64c6-->
- `Code/` - Linear-fit smoke-test experiment: uv environment, fit_line.py, run commands, and reproducible results in bilingual READMEs. <!--hash:d99584ba-->
- `Figs/` - Generated figures for the example project, including the linear_fit.png output of fit_line.py. <!--hash:8c1d3ba6-->
- `paper/` - LaTeX source area for the worked example paper, including local references; final PDF is generated in place as paper/main.pdf. <!--hash:a352390e-->
- `index.md` - Folder entry point for the smoke-test project, linking state, source map, code, paper, references, and log. <!--hash:bcfe90b9-->
- `log.md` - Folder-level update log for the smoke-test project. <!--hash:570a64fe-->
- `paper_skeleton.md` - Manuscript control sheet filled with the smoke-test example's snapshot and source map. <!--hash:aebcb48c-->
- `PROJECT_MEMORY.md` - Project memory for the smoke-test example: snapshot, build-convention decision, progress log. <!--hash:6a4cb44d-->

## projects-folder/Example_Project/Baselines/

- `Baseline_readme.md` - Reminder note emphasizing optimized baselines for research comparisons. <!--hash:2efac95c-->

## projects-folder/Example_Project/paper/

- `main.tex` - Compiled smoke-test manuscript source reporting the linear-fit numbers with the local bibliography. <!--hash:37ba3aca-->
- `references.bib` - Project-local BibTeX bibliography for the worked example paper. <!--hash:0f02951b-->

## projects-folder/templates/

- `ai_research_template/` - Reusable AI-research paper starter template for turning a feasible idea into a traceable project. <!--hash:21492d4a-->
- `index.md` - Index of available project templates with copy-to-start instructions. <!--hash:d3f6409c-->

## projects-folder/templates/ai_research_template/

- `Baselines/` - Baseline experiment notes, comparisons, and related materials for new research projects. <!--hash:84ac5af2-->
- `Code/` - Template code area with uv environment conventions, bilingual README skeletons, and Datasets placeholder. <!--hash:87d4fafb-->
- `Figs/` - Template area for figures, tables, plots, screenshots, and visual outputs. <!--hash:bc34b778-->
- `paper/` - Template LaTeX source area for new project papers, including local references; final PDF is generated in place as paper/main.pdf. <!--hash:c729d852-->
- `index.md` - Folder entry point for the reusable AI-research template and its post-copy starting files. <!--hash:aacca729-->
- `log.md` - Template-level update log for changes to the project starter. <!--hash:e10d8d5f-->
- `paper_skeleton.md` - Reusable manuscript control template with source maps, baselines, experiments, claim tracking, and writing TODOs. <!--hash:38fc034f-->
- `PROJECT_MEMORY.md` - Project-memory template: snapshot, key decisions, progress log, and open TODOs. <!--hash:78d9eb36-->

## projects-folder/templates/ai_research_template/Baselines/

- `Baseline_readme.md` - Reminder note emphasizing optimized baselines for research comparisons. <!--hash:2efac95c-->

## projects-folder/templates/ai_research_template/paper/

- `main.tex` - Minimal LaTeX scaffold for project papers with figure and bibliography path conventions. <!--hash:64ffa6bf-->
- `references.bib` - Placeholder project-local BibTeX bibliography for new project papers. <!--hash:64796636-->
