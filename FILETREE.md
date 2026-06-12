# Project Filetree

_Auto-maintained compact navigation index by the filetree-simple skill. Indexed entries carry content hashes; mismatches indicate stale summaries._

## (root)/

- `.agents/` - Local agent configuration and workspace skills used by Codex and Claude workflows. <!--hash:c95340aa-->
- `.claude/` - Local Claude Code configuration and workspace skills for this research template. <!--hash:ec2eb0f6-->
- `Ideas/` - Research ideas, hypotheses, outlines, meeting notes, and reflections. <!--hash:bcb5bee2-->
- `Memory/` - Research memory area for long-term context, project notes, decisions, and progress. <!--hash:c62422af-->
- `Paper_initial_template/` - Reusable project and paper starter template for developing feasible research ideas. <!--hash:6ada95b4-->
- `References/` - Bibliographic files, literature notes, source PDFs, and citation material. <!--hash:6f2b1f2b-->
- `Research-skills-hub/` - Optional research skills and helper files available for installation. <!--hash:ef77791c-->
- `.gitignore` - Ignores local environment files, editor settings, caches, scratch directories, and agent-local data. <!--hash:0cb2335a-->
- `AGENTS.md` - Codex entry instruction directing agents to read INSTRUCTION.md at session start. <!--hash:306510c0-->
- `CLAUDE.md` - Claude Code entry instruction directing agents to read INSTRUCTION.md at session start. <!--hash:306510c0-->
- `INSTRUCTION.md` - Primary guide for research workflow, Python environment, documentation links, filetree maintenance, and agent collaboration rules. <!--hash:aab2846a-->
- `README.md` - Human-facing overview, roadmap TODOs, and reference projects for the AI-Human Research OS template. <!--hash:0acaccce-->
- `task.md` - Structured exploratory task prompt for normalizing the AI-Human Research OS with code agents. <!--hash:9f39f189-->
- `task_en.md` - English exploratory task prompt for normalizing the AI-Human Research OS with code agents. <!--hash:c9ee1439-->

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

## Ideas/

- `Ideas_log.md` - Empty log placeholder for research ideas and notes. <!--hash:e69de29b-->

## Memory/

- `MEMORY.md` - Placeholder for research memory, project context, decisions, and progress notes. <!--hash:e69de29b-->

## Paper_initial_template/

- `Baselines/` - Baseline experiment notes, comparisons, and related materials for new research projects. <!--hash:2907687a-->
- `Code/` - Template code area for scripts, datasets, analyses, and experiment documentation. <!--hash:2f747bf0-->
- `Figs/` - Template area for figures, tables, plots, screenshots, and visual outputs. <!--hash:0d04c3f2-->
- `paper_skeleton.md` - Reusable manuscript control template with source maps, baselines, experiments, claim tracking, and writing TODOs. <!--hash:6d4d86e1-->

## Paper_initial_template/Baselines/

- `Baseline_readme.md` - Reminder note emphasizing optimized baselines for research comparisons. <!--hash:2efac95c-->

## Paper_initial_template/Code/

- `Datasets/` - Placeholder folder for datasets used by template project code and analyses. <!--hash:59f2542c-->
- `READEME.md` - Empty English code workflow documentation placeholder. <!--hash:e69de29b-->
- `READEME_zh.md` - Empty Chinese code workflow documentation placeholder. <!--hash:e69de29b-->

## References/

- `paper_notes.md` - Empty workspace for shared paper-reading notes and key takeaways. <!--hash:e69de29b-->
- `paper_notes_template.md` - Template for adding structured paper-reading notes to paper_notes.md. <!--hash:0a932b9d-->
- `refs.bib` - Empty BibTeX bibliography placeholder for project references. <!--hash:e69de29b-->
