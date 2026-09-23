# Templates

Reusable project scaffolds copied into `projects-folder/<ProjectName>/`.

## Instantiate a project

Use the `research-project-manager` skill from the repository root:

```bash
python research-skills-hub/open-paper-skills/research-project-manager/scripts/manage_research_project.py \
  new <ProjectName> --from-idea ideas/<idea>.md --owner human-led --stage scout
```

It performs the four steps that used to be manual: copy the chosen template
(`--template`, default `ai_research_template`) without modifying the reusable
source; fill the identity fields of the copied `PROJECT_MEMORY.md` Snapshot;
set the source idea to `status: promoted` and link idea and project both ways;
and add the project row to [memory/MEMORY.md](../../memory/MEMORY.md) plus a
bullet in [projects-folder/index.md](../index.md). Then follow the copied
project's `index.md`, fill every file it marks as immediate setup, and run
`validate <ProjectName>` until it reports no error.

## Template contract

A reusable template:

- keeps internal links valid from its copied location under
  `projects-folder/<ProjectName>/`;
- names the files that must be filled immediately after copying;
- keeps project-specific commands and directory semantics in its own
  `index.md` and local READMEs; and
- lives as a sibling under this directory when another discipline or output
  requires a different scaffold.

## Available templates

* [AI Research Template](ai_research_template/index.md) - ML/AI-research paper template for turning a research idea into a traceable project with code, figures, local references, writing state, and project memory.
