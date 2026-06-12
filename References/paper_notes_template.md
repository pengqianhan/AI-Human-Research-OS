# Paper Note Template

> Template for entries in [`paper_notes.md`](paper_notes.md). When a new paper is added to `References/`,
> copy the block below, fill in every field, and **append** it to the end of `paper_notes.md`
> (do not reorder existing entries). Increment the heading number `N` to continue the sequence.
>
> Conventions:
> - Wrap file paths, filenames, and code symbols in backticks; **Paper path** must point to the local PDF under `References/`.
> - Use `$...$` for inline math (matches existing entries).
> - Keep **One-line positioning** to a single sentence; expand detail in the later fields.
> - If the paper ships no local code, write the **Code** line as a project/GitHub link and note "(no local code directory bundled)".

---

## N. <Paper Title>

- **Authors/Venue**: <First Author, Second Author, et al. (Affiliations), Month Year or Venue>
- **arXiv**: <arXiv ID, or "preprint (Year)" if none>
- **Paper path**: `References/<exact PDF filename>.pdf`
- **One-line positioning**: <One sentence: what this paper is and the angle that makes it distinctive.>
- **Core problem**: <The gap or limitation in prior work that this paper targets.>
- **Method**:
  - <Key mechanism / formulation 1.>
  - <Key mechanism / formulation 2.>
  - <Add bullets as needed; name the central artifact, loss, or algorithm.>
- **Main results**: <Headline numbers and benchmarks — be concrete (deltas, baselines beaten, scope of evaluation).>
- **Relation to this project**: <Why it matters for the current project — what to borrow, contrast, or build on; note if it is a core vs. background reference.>
- **Code**: <`References/<local-dir>/` if bundled locally (note correspondence to this PDF, GitHub link, license), otherwise project page / GitHub link with "(no local code directory bundled)".>

---
