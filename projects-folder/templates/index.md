# Templates

Reusable project scaffolds copied into `projects-folder/<ProjectName>/`.

## Instantiate a project

Use the `research-project-manager` skill from the repository root:

```bash
python research-skills-hub/open-paper-skills/research-project-manager/scripts/manage_research_project.py \
  new <ProjectName> --from-idea ideas/<idea>.md --owner human-led --stage scout
```

It copies the chosen template (`--template`, default `ai_research_template`)
without modifying the reusable source; fills the identity fields of the copied
`PROJECT_MEMORY.md` Snapshot, the title and summary of the copied `index.md`,
and the template line in the copied `AGENTS.md`; sets the source idea to
`status: promoted` and links idea and project both ways; and adds the project
row to [memory/MEMORY.md](../../memory/MEMORY.md) plus a bullet in
[projects-folder/index.md](../index.md). Then follow the "Setup after copying"
section of the copied `index.md` and run `validate <ProjectName>` until it
reports no error.

## Template contract

A template is the greatest common divisor of the projects built from it: it
holds what every such project needs, so each new project starts from it rather
than from scratch. A reusable template:

- carries the shared agent rules in `AGENTS.md`, which each project keeps as
  shipped and extends under its "Project-specific rules" section, so a project
  also works as a standalone repository;
- keeps internal links valid from its copied location under
  `projects-folder/<ProjectName>/`; links that leave the project (to ideas,
  global memory, or the paper wiki) work only inside the Research OS, and the
  rules that depend on them sit under "Inside the Research OS" in `AGENTS.md`;
- names the setup steps left after copying in its `index.md`;
- keeps project-specific commands and directory semantics in its own
  `index.md` and local READMEs; and
- lives as a sibling under this directory when another discipline or output
  requires a different scaffold.

## Port template changes

An improvement that every project needs goes into the template first. Each
project's `AGENTS.md` records when it last matched its template, in the line
"Based on the `<template>` project template, last synced YYYY-MM-DD." To
bring a project up to date:

1. List the template changes since that date:
   `git log -p --since=<date> -- projects-folder/templates/<template>`.
2. Apply the changes that fit the project, keeping its project-specific
   content.
3. Set the date in that line to today.

## Available templates

* [AI Research Template](ai_research_template/index.md) - ML/AI-research paper template for turning a research idea into a traceable project with code, figures, local references, writing state, and project memory.
