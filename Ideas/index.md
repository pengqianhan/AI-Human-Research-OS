# Ideas Log

> One `##` block per idea. Add new entries directly below the `---` line, newest
> first. When an idea becomes a project, set Status to `promoted` and link the
> project directory (see [INSTRUCTION.md](../INSTRUCTION.md), workflow "Idea → Project").

Entry format (copy this block):

```markdown
## YYYY-MM-DD — <short title>
- Status: raw | exploring | feasible | promoted | dropped
- One-liner:
- Context / source: (paper, discussion, observation…)
- Evidence so far: (links into References/ or experiments)
- Smallest next probe:
- Project: (path, once promoted)
```

---

## 2026-06-12 — Demo: validate the OS pipeline with a linear-fit micro-experiment
- Status: promoted
- One-liner: Walk one idea through the full OS loop (idea → project → code → figure → PDF) to verify the template and conventions work end to end.
- Context / source: Smoke test required by [task_en.md](../task_en.md) deliverable 2.
- Evidence so far: local toolchain verified (latexmk, uv); template compiles out of the box.
- Smallest next probe: fit a line to synthetic data, put the figure in a compiled PDF.
- Project: [Example_Project/](../Example_Project/)
