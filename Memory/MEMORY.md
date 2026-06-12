# Research Memory (Global)

> Cross-project long-term memory. Read this for broad or cross-project work.
> Keep under ~200 lines: prune aggressively. Per-project context lives in
> `<Project>/PROJECT_MEMORY.md`. Update rules: see [INSTRUCTION.md](../INSTRUCTION.md).

## Long-Term Research Goals

-

## Active Projects

| Project | Path | Status | Next action |
|---|---|---|---|
| Example_Project (OS smoke test) | `Example_Project/` | complete — kept as worked example | delete if unwanted (decision D6 in `CHANGE_SUMMARY.html`) |

## Key Decisions (cross-project)

| Date | Decision | Why |
|---|---|---|
| 2026-06-12 | Research OS normalized: entry chain (AGENTS/CLAUDE → INSTRUCTION → FILETREE → memory), six core workflows, 3-layer memory, hub-as-store skill lifecycle | task_en.md normalization task; see `CHANGE_SUMMARY.html` |
| 2026-06-12 | Projects are instantiated at the repository root (`cp -R Paper_Initial_template <Name>`) | keeps the template's relative links to `References/` and `Ideas/` working |
| 2026-06-12 | Plugin model: small fixed core (entry chain, memory layers, directory semantics) + two plugin types — skills and project templates; `Templates/` container deferred until a second template exists; no plugin manager / manifest / versioning / CLI | keeps the OS open and extensible without machinery (INSTRUCTION.md → Extending the OS) |

## Lessons and Principles

<!-- promote to Research-skills-hub/ only when useful across multiple projects -->

- latexmk ≥ 4.86 runs bibtex inside the output directory by default; with the
  shared root bibliography (`\bibliography{../References/refs}`), build with
  `-bibfudge-` so the path resolves from the project directory (found 2026-06-12
  in the smoke test).
