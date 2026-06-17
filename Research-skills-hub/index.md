# Collections

* [science-skills](science-skills/index.md) - Skills vendored from google-deepmind/science-skills: literature search (arXiv, bioRxiv, Europe PMC, OpenAlex), the uv prerequisite, and a workflow-to-skill creator.
* [open-paper-skills](open-paper-skills/index.md) - Repo-local custom skills: filetree-simple, session-handoff, and uv-env.

# Installing a skill

```bash
cp -R Research-skills-hub/science-skills/<skill> .agents/skills/<skill>
cp -R Research-skills-hub/science-skills/<skill> .claude/skills/<skill>
# (for open-paper-skills, the source is Research-skills-hub/open-paper-skills/<skill>)
```

Keep `.agents/skills/` and `.claude/skills/` byte-identical, then refresh `FILETREE.md`.
