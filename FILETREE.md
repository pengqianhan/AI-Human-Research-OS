# Project Filetree

_Auto-maintained compact navigation index by the filetree-simple skill. Indexed entries carry content hashes; mismatches indicate stale summaries._

## (root)/

- `.agents/` - Local agent configuration and workspace skills used by Codex and Claude workflows. <!--hash:c95340aa-->
- `.claude/` - Local Claude Code configuration and workspace skills for this research template. <!--hash:ec2eb0f6-->
- `Example_Project/` - Worked example from the OS smoke test: idea to runnable code, generated figure, and compiled PDF. <!--hash:435ece8f-->
- `Ideas/` - Research ideas, hypotheses, outlines, meeting notes, and reflections. <!--hash:bcb5bee2-->
- `Memory/` - Research memory area for long-term context, project notes, decisions, and progress. <!--hash:c62422af-->
- `Paper_Initial_template/` - Reusable project and paper starter template for developing feasible research ideas. <!--hash:417d33dd-->
- `References/` - Bibliographic files, literature notes, source PDFs, and citation material. <!--hash:6f2b1f2b-->
- `Research-skills-hub/` - Optional research skills and helper files available for installation. <!--hash:ef77791c-->
- `.gitignore` - Ignores OS files, editor settings, local environments, caches, scratch directories, agent-local data, and LaTeX build output. <!--hash:f443f281-->
- `AGENTS.md` - Codex entry instruction directing agents to read INSTRUCTION.md at session start. <!--hash:306510c0-->
- `CHANGE_SUMMARY.html` - HTML change summary of the 2026-06 normalization: commits, per-problem fixes, deviations, user decisions D1-D9, acceptance results. <!--hash:fb88ce4e-->
- `CLAUDE.md` - Claude Code entry instruction directing agents to read INSTRUCTION.md at session start. <!--hash:b5dc49b2-->
- `INSTRUCTION.md` - Primary agent guide: startup order, core workflows, memory layers, skills lifecycle, Python environments, documentation links, and research safety rules. <!--hash:8c722efa-->
- `OS_INTRO.html` - HTML introduction to the Research OS: orientation chain, directory map, five entry questions, workflows, memory layers, skills model. <!--hash:4f5c9d90-->
- `README.md` - Human-facing overview: quick start, core directory map, minimal workflow, preserved roadmap TODOs, and reference projects. <!--hash:f64ad651-->
- `task.md` - Structured exploratory task prompt for normalizing the AI-Human Research OS with code agents. <!--hash:9f39f189-->
- `task_en.md` - English exploratory task prompt for normalizing the AI-Human Research OS with code agents. <!--hash:c9ee1439-->
- `task_plan.html` - Detailed executed normalization plan with verified problem inventory, phased steps, decisions, and a live progress TODO table. <!--hash:c2a2e633-->

## .agents/

- `skills/` - Repository-local agent skills available for this research workspace. <!--hash:78bee326-->

## .agents/skills/

- `filetree-simple/` - Compact FILETREE.md maintenance skill and helper script. <!--hash:0a82c6f3-->
- `literature_search_arxiv/` - arXiv paper search and retrieval skill with metadata and download scripts. <!--hash:d2895c25-->
- `literature_search_openalex/` - OpenAlex scholarly database search skill for papers, authors, institutions, and bibliometrics. <!--hash:c7a1b779-->
- `science_skills_common/` - Shared HTTP client package used by Science Skills literature search tools. <!--hash:f5f8923c-->
- `uv/` - uv prerequisite skill for checking or installing the Python package manager used by science skills. <!--hash:08b9625a-->
- `uv-env/` - uv-based Python environment setup skill for research projects. <!--hash:66b388be-->

## .claude/

- `skills/` - Claude Code workspace skills mirrored from repository-local agent skills. <!--hash:abb90fdc-->

## .claude/skills/

- `filetree-simple/` - Compact FILETREE.md maintenance skill and helper script. <!--hash:0a82c6f3-->
- `literature_search_arxiv/` - arXiv paper search and retrieval skill with metadata and download scripts. <!--hash:d2895c25-->
- `literature_search_openalex/` - OpenAlex scholarly database search skill for papers, authors, institutions, and bibliometrics. <!--hash:c7a1b779-->
- `science_skills_common/` - Shared HTTP client package used by Science Skills literature search tools. <!--hash:f5f8923c-->
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

- `MEMORY.md` - Global research memory: long-term goals, active projects table, cross-project decisions, and lessons. <!--hash:25134ce3-->

## Paper_Initial_template/

- `Baselines/` - Baseline experiment notes, comparisons, and related materials for new research projects. <!--hash:854903c4-->
- `Code/` - Template code area with uv environment conventions, bilingual README skeletons, and Datasets placeholder. <!--hash:87d4fafb-->
- `Figs/` - Template area for figures, tables, plots, screenshots, and visual outputs. <!--hash:5c8555d9-->
- `main.tex` - Minimal LaTeX scaffold that compiles out of the box; documents the latexmk build command and shared-bibliography path. <!--hash:ea6430e8-->
- `paper_skeleton.md` - Reusable manuscript control template with source maps, baselines, experiments, claim tracking, and writing TODOs. <!--hash:0bd9ac84-->
- `PROJECT_MEMORY.md` - Project-memory template: snapshot, key decisions, progress log, and open TODOs. <!--hash:dd7664f3-->

## Paper_Initial_template/Baselines/

- `Baseline_readme.md` - Reminder note emphasizing optimized baselines for research comparisons. <!--hash:2efac95c-->

## References/

- `paper_notes.md` - Shared paper-reading notes; entries appended sequentially via paper_notes_template.md. <!--hash:dae35496-->
- `paper_notes_template.md` - Template for adding structured paper-reading notes to paper_notes.md. <!--hash:9ef45e2b-->
- `refs.bib` - Shared BibTeX bibliography for all projects; entries built only from fetched metadata. <!--hash:f24539cc-->
