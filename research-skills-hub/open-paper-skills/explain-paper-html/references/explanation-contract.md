# Explanation and HTML contract

Use this reference to turn the evidence ledger into a reader-facing lesson and to implement the output.

## Reference-page analysis

When a reference page exists, inventory:

- section sequence and argumentative rhythm;
- typography, color roles, spacing, cards, callouts, tables, and evidence notes;
- diagram families, visual encodings, captions, and accessibility labels;
- interaction purpose, state changes, and feedback;
- table-of-contents behavior, long-page navigation, and mobile adaptations.

Reuse that grammar while deriving content, diagrams, and examples from the current paper. Record which decisions came from the reference and which came from the paper.

## Teaching narrative

Prefer this sequence, merging adjacent sections when it improves flow:

1. Position the paper and state its conclusion in one sentence.
2. Establish broad prerequisites, then the narrow gap the paper addresses.
3. Give the core intuition with a concrete toy example.
4. Walk through the mechanism, proof, system, or argument in causal order.
5. Explain the decisive experiments and grade the strength of their evidence.
6. Separate contributions, assumptions, limitations, and likely misreadings.
7. End with exactly five medium-difficulty multiple-choice questions.

Use a small reusable diagram vocabulary: system/data flow, timeline, state transition, before/after comparison, causal structure, or proof dependency. Put concrete values in diagrams when they clarify the invariant. Treat a control as warranted only when manipulating it teaches a paper-specific relationship.

For a connected series, each page states the prior paper's established result, the current paper's addition, and the boundary between them. Generate separate files and provide previous/next navigation. Independent multi-paper requests use separate standalone pages and claim continuity only where the ledgers support it.

## HTML contract

- Produce one semantic long-page HTML document with a title, one `h1`, a table of contents, and sections for background, intuition, mechanism, evidence, limitations, and quiz.
- Add `data-explain-role` to the principal sections using these canonical values: `background`, `intuition`, `mechanism`, `evidence`, `limitations`, and `quiz`. A section may carry multiple space-separated roles.
- Inline CSS and JavaScript. Use system fonts and inline HTML/SVG so the document remains readable and interactive offline.
- Give every section and SVG definition a unique stable ID. Make every table-of-contents anchor resolve.
- Put equations, code, and preformatted passages in `<pre>` elements. Give each `<pre>` an effective `white-space: pre` or `pre-wrap` rule and horizontal overflow behavior.
- Place paper page/section citations beside the claims they support. Mark teaching inferences, redrawings, and approximate chart readings as such.
- Give SVGs a `viewBox`, readable labels, a caption, and an accessible name. Use an overflow container or responsive redesign when a diagram cannot shrink safely.
- Make wide tables scroll or reflow on narrow screens. Preserve readable type and touch targets near 390 px width.
- Render exactly five quiz questions. A click reveals the canonical correct choice, distinguishes a selected incorrect choice, and explains why.
- Keep visible content free of build expressions and template placeholders. Emit final SVG marks, labels, and quiz data rather than generator-source fragments.

## Interaction contract

Give each extra interaction a teaching objective, deterministic initial state, visible control label, and textual state feedback. Before implementation, write a compact state contract for every stateful visualization: for each state, record the causal input or event, availability/readiness facts, decision or output, and explanatory conclusion. Derive every state-dependent diagram mark, label, summary, and feedback panel from one state definition so they change together. The visible state must let a reader infer its textual conclusion without relying on the feedback sentence alone.

For a finite discrete control, cover every state in its state contract. For a continuous control, cover its initial value, representative transition, and boundary inputs. An equation calculator should preserve units and rounding rules; a timeline or pipeline control should identify the active state in text as well as color.

The implementation is complete when it opens directly from disk, all content and interactions work offline, the semantic roles are present, and a reader can navigate the complete lesson by heading or table of contents.
