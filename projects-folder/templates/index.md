# Templates

Reusable project scaffolds copied into `projects-folder/<ProjectName>/`.

## Instantiate a project

1. Copy the chosen template without modifying the reusable source:

   ```bash
   cp -R projects-folder/templates/<TemplateName> projects-folder/<ProjectName>
   ```

2. Follow the copied project's `index.md` and fill every file it marks as
   immediate setup.
3. When the project came from an idea, set that idea to `status: promoted` and
   link the project.
4. Add or update the project row in
   [memory/MEMORY.md](../../memory/MEMORY.md).

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
