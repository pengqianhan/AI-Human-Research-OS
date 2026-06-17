# Example Project Update Log

Newest entries first. Keep this log compact; durable decisions belong in
[PROJECT_MEMORY.md](PROJECT_MEMORY.md).

## 2026-06-17

* Added [index.md](index.md) and this log so agents can orient from a compact
  folder-level entry point before reading detailed project files.
* Updated the build convention so `latexmk` runs from [paper/](paper/) and writes
  [paper/main.pdf](paper/main.pdf) directly.
* Moved bibliography entries to [paper/references.bib](paper/references.bib)
  and changed `main.tex` to use `\bibliography{references}`.

## 2026-06-12

* Created the worked example from the promoted
  [linear-fit micro-experiment](../Ideas/idea_example/linear-fit-micro-experiment.md).
* Ran the synthetic linear-fit code, generated [Figs/linear_fit.png](Figs/linear_fit.png),
  wrote [paper/main.tex](paper/main.tex), and compiled the PDF.
