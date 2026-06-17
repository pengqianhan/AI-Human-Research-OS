# Research Memory (Global)

> Cross-project long-term memory. Read this for broad or cross-project work.
> Keep under ~200 lines: prune aggressively. Per-project context lives in
> `projects-folder/<ProjectName>/PROJECT_MEMORY.md`. Update rules: see
> [INSTRUCTION.md](../INSTRUCTION.md).

## Long-Term Research Goals

-

## Active Projects

| Project | Path | Status | Next action |
|---|---|---|---|
| Example_Project (OS smoke test) | `projects-folder/Example_Project/` | complete — kept as worked example | delete if unwanted (decision D6 in `CHANGE_SUMMARY.html`) |

## Key Decisions (cross-project)

| Date | Decision | Why |
|---|---|---|
| 2026-06-12 | Research OS normalized: entry chain (AGENTS/CLAUDE → INSTRUCTION → FILETREE → memory), six core workflows, 3-layer memory, hub-as-store skill lifecycle | task_en.md normalization task; see `CHANGE_SUMMARY.html` |
| 2026-06-17 | Projects live under `projects-folder/<ProjectName>/`; templates live under `projects-folder/templates/<TemplateName>/` | keeps the repository root compact as project count grows, while leaving room for discipline- or format-specific templates |
| 2026-06-12 | Plugin model: small fixed core (entry chain, memory layers, directory semantics) + two plugin types — skills and project templates; `Templates/` container deferred until a second template exists; no plugin manager / manifest / versioning / CLI | keeps the OS open and extensible without machinery (INSTRUCTION.md → Extending the OS) |

## Lessons and Principles

<!-- promote to Research-skills-hub/ only when useful across multiple projects -->

- Keep project bibliography entries in
  `projects-folder/<ProjectName>/paper/references.bib` and build in place from
  `projects-folder/<ProjectName>/paper/`. This writes
  `projects-folder/<ProjectName>/paper/main.pdf` directly and avoids external-output-directory
  BibTeX path issues.
