# Research Skills Hub

Canonical store of reusable research skills ("app store"). Installed copies live
in `.agents/skills/` (Codex) and `.claude/skills/` (Claude Code) at the
repository root; the two installed directories must stay byte-identical. Use
this file as the lightweight index; open an individual `SKILL.md` only when that
skill is relevant to the current task. Skills are one of the OS's two plugin
types (the other is project templates); see `INSTRUCTION.md` → Extending the OS.

## Install / update a skill

```bash
cp -R Research-skills-hub/science-skills/skills/<skill> .agents/skills/<skill>
cp -R Research-skills-hub/science-skills/skills/<skill> .claude/skills/<skill>
# (for open-paper-skills, the source is Research-skills-hub/open-paper-skills/<skill>)
```

Then refresh `FILETREE.md` with the `filetree-simple` skill. To add a new skill
to the hub, see `INSTRUCTION.md` → Skills (scope, inputs, outputs, and
limitations are required in its `SKILL.md`). Skills contain runnable scripts:
skim a skill's `scripts/` before installing one that did not originate in this
repository.

## science-skills/

From [google-deepmind/science-skills](https://github.com/google-deepmind/science-skills/tree/main/skills)
(see [science-skills/LICENSE](science-skills/LICENSE)). Sources live under
[science-skills/skills/](science-skills/skills/).

| Skill | Purpose | Installed? |
|---|---|---|
| `uv` | Checks/installs the `uv` Python package manager required by script-based skills | yes |
| `literature_search_arxiv` | Searches arXiv metadata; downloads PDFs, HTML, or source archives | yes |
| `literature_search_biorxiv` | Searches bioRxiv/medRxiv metadata by DOI or date/category ranges | no |
| `literature_search_europepmc` | Searches Europe PMC open-access literature; retrieves PDFs, full text, citations | no |
| `literature_search_openalex` | Queries OpenAlex for works, authors, institutions, topics, bibliometrics | yes |
| `science_skills_common` | Shared HTTP client package used by the literature-search skills (support package, not standalone) | yes |
| `workflow_skill_creator` | Distills a completed research workflow into a reusable agent skill | no |

## open-paper-skills/

Repo-local custom skills. Sources live under [open-paper-skills/](open-paper-skills/).

| Skill | Purpose | Installed? |
|---|---|---|
| `uv-env` | uv-based Python environment setup for research projects | yes |
| `filetree-simple` | Maintains and lints the compact `FILETREE.md` index | yes |
| `session-handoff` | Maintains `task_plan.html` + `CHANGE_SUMMARY.html` as cross-session hand-off records (resume from the progress TODO, record changes/decisions/deviations) | yes |
