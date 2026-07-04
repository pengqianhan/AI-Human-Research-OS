# Collections

* [science-skills](science-skills/index.md) - Skills vendored from google-deepmind/science-skills: literature search (arXiv, bioRxiv, Europe PMC, OpenAlex), the uv prerequisite, and a workflow-to-skill creator.
* [open-paper-skills](open-paper-skills/index.md) - Original or repo-maintained Open Paper skills, plus local support skills.
* [collected-skills](collected-skills/index.md) - Skills collected, adapted, or locally added for research workflows; preserve upstream attribution and license terms.

# Installing a skill

```bash
cp -R Research-skills-hub/<collection>/<skill> .agents/skills/<skill>
cp -R Research-skills-hub/<collection>/<skill> .claude/skills/<skill>
```

Review a skill's `SKILL.md` and bundled scripts before installing it from
outside this repository. Keep `.agents/skills/` and `.claude/skills/`
byte-identical, then refresh `FILETREE.md`.
