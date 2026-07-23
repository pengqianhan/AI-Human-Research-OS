# Paper analysis and evidence ledger

Use this reference while building the evidence ledger. Parse once and keep the resulting text or ledger available throughout the run.

## Resolve and parse

- Prefer the local PDF or user-provided source over derivative summaries.
- Use `pdf-explore` for conclusions that span sections: obtain the outline, persist the relevant text, and scan the complete document for limitations, experiments, figures, tables, and appendices.
- Use a lightweight 1–4-page read only for a single lookup answered immediately.
- Render a page and crop the relevant figure when axes, labels, topology, layout, or plotted values matter. Record whether a value is exact from text/table or approximate from a plot.
- Treat external related work as a separate research branch. Cite it separately from paper evidence.

## Ledger schema

Maintain one row per material conclusion:

| Field | Record |
|---|---|
| Topic | Problem, prerequisite, intuition, mechanism, formal result, experiment, limitation, or future work |
| Explanation claim | The statement the reader-facing page will make |
| Evidence kind | `formal`, `experimental`, `author-interpretation`, or `teaching-inference` |
| Locator | PDF page plus section, theorem/equation, figure, or table when available |
| Support | Concise quotation-free paraphrase or exact numeric value |
| Confidence | Direct, visually read, approximate, or inferred |
| Use | Narrative section, diagram, toy example, quiz, or omission |

Keep teaching analogies and derived examples labeled as explanation rather than as author claims. A formal theorem supports only its stated assumptions; an experiment supports only its setup and measured outcomes; author discussion remains interpretation unless proved or measured.

## Coverage pass

Account for all of these before outlining:

- problem, motivation, and claimed contribution;
- prerequisite concepts and notation;
- core intuition and the smallest concrete example;
- method, architecture, algorithm, argument, or proof structure;
- key definitions, equations, theorems, and algorithms;
- datasets or systems, comparison methods, metrics, protocol, and numerical results;
- assumptions, threats to validity, limitations, negative results, and future work;
- figures and tables whose visual form carries information not recoverable from text.

For every chart reconstructed in HTML, store the source figure/table, transcription status, units, labels, and whether points are exact or approximate.

## Multiple papers

Build a separate ledger for each paper. Add a cross-paper boundary table with three columns: prior result, current addition, and unsupported conflation. Shared terminology may be introduced once, but each file must remain understandable on its own and source claims to the paper that actually makes them.

The ledger is complete only when every planned material statement has a locator and type, every important visual has been inspected or explicitly deemed unnecessary, and every numeric claim is sourced from the ledger.
