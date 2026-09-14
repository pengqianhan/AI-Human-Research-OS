# Collections

Canonical collection of reusable research skills and upstream skill mirrors.

New here? [MANAGING-SKILLS.md](MANAGING-SKILLS.md) explains how skills reach the
agents and the human, who does what, and what each interface may do.

* [science-skills](science-skills/index.md) - Skills vendored from [google-deepmind/science-skills](https://github.com/google-deepmind/science-skills/tree/main): literature search (arXiv, bioRxiv, Europe PMC, OpenAlex), the uv prerequisite, and a workflow-to-skill creator.
* [open-paper-skills](open-paper-skills/index.md) - Original or repo-maintained Open Paper skills, including cognition-aware delegation and local support skills.
* [collected-skills](collected-skills/index.md) - Skills collected, adapted, or locally added for research workflows; preserve upstream attribution and license terms.
* [mattpocock-skills](mattpocock-skills/index.md) - Read-only vendored mirror of [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills) (MIT): the `engineering/` and `productivity/` bundles, refreshed wholesale from upstream. Do not edit; adapt by cherry-picking into collected-skills. See [ADR 0001](docs/adr/0001-external-skill-intake-and-sync.md).
* [claude-science-skills](claude-science-skills/index.md) - Claude Science asset bundle (prompt, agents, MCP servers, skills) vendored from [JimLiu/science-skills](https://github.com/JimLiu/science-skills/tree/main).

## Installing a skill

Use [research-skill-installer](open-paper-skills/research-skill-installer/SKILL.md)
for installation commands, target selection, and verification. It selects
destinations from its target table and symlink or copy form from the collection's
`SOURCE.md`; do not place hub skills by hand.

Review third-party skills' `SKILL.md`, scripts, provenance, and license before
installation. For the lifecycle and source-policy rationale, see
[Managing skills](MANAGING-SKILLS.md).
