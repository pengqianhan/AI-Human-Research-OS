# Science Skills

Skills vendored from
[google-deepmind/science-skills](https://github.com/google-deepmind/science-skills/tree/main/skills)
(see [LICENSE](LICENSE)). Part of the [Research Skills Hub](../index.md). Open a skill's
`SKILL.md` only when it is relevant to the current task; install via the commands in the
[hub index](../index.md).

| Skill | Purpose | Installed? |
|---|---|---|
| [`uv`](uv/SKILL.md) | Checks/installs the `uv` Python package manager required by script-based skills | yes |
| [`literature_search_arxiv`](literature_search_arxiv/SKILL.md) | Searches arXiv metadata; downloads PDFs, HTML, or source archives | yes |
| [`literature_search_biorxiv`](literature_search_biorxiv/SKILL.md) | Searches bioRxiv/medRxiv metadata by DOI or date/category ranges | no |
| [`literature_search_europepmc`](literature_search_europepmc/SKILL.md) | Searches Europe PMC open-access literature; retrieves PDFs, full text, citations | no |
| [`literature_search_openalex`](literature_search_openalex/SKILL.md) | Queries OpenAlex for works, authors, institutions, topics, bibliometrics | yes |
| [`science_skills_common`](science_skills_common/SKILL.md) | Shared HTTP client package used by the literature-search skills (support package, not standalone) | yes |
| [`workflow_skill_creator`](workflow_skill_creator/SKILL.md) | Distills a completed research workflow into a reusable agent skill | no |
