---
name: explain-paper-html
description: "Lesson builder for academic papers. Use when Codex needs a deep teaching-oriented paper/PDF explanation, a self-contained interactive HTML tutorial, separate or connected explanations for multiple papers, or a reader-facing paper explanation requested by another skill. Route a 1–4-page factual lookup to lightweight PDF reading and a format-only PDF-to-Markdown request to a converter."
---

# Explain Paper HTML

Build a **lesson** whose teaching claims stay traceable to the paper and whose final HTML has been exercised in a browser.

## 1. Resolve the contract

Resolve the input paper and accessible form, requested language, relationship among papers, reference page or visual style, output path, and need for related-work research. Honor an explicit output path. Otherwise use `resources/YYYY-MM-DD-explanation-<paper-slug>.html` when the project has `resources/`, or `/tmp/YYYY-MM-DD-explanation-<paper-slug>.html`. Ask only when an unresolved choice would materially change the result.

**Completion criterion:** The input, language, paper relationship, reference style, research scope, and output path are recorded.

## 2. Build the evidence ledger

Read [references/paper-analysis.md](references/paper-analysis.md) before analyzing the paper. For a multi-section PDF, invoke or follow `pdf-explore` and persist the whole parse. Inspect rendered pages or figure crops where the text layer cannot establish visual evidence. Record a page or section source and evidence type for every material claim, equation, and number intended for the lesson.

**Completion criterion:** Every planned technical claim, equation, experimental number, and visually derived conclusion maps to paper evidence and an evidence type.

## 3. Extract the design grammar

Read [references/explanation-contract.md](references/explanation-contract.md) before analyzing a reference page or designing the default page. When reference HTML is provided, inventory its information architecture, visual language, components, diagram conventions, interactions, responsive behavior, and pedagogical rhythm. Separate reusable style decisions from paper-specific content.

**Completion criterion:** A content outline and visual-component inventory identify the source of every major design decision.

## 4. Design the lesson

Reorder the evidence into the learning path background → intuition → mechanism → evidence → boundaries. Include positioning and a one-sentence conclusion, prerequisites, concrete toy values, the method/proof/system walkthrough, evidence-strength assessment, assumptions and likely misreadings, and five medium-difficulty multiple-choice questions. For a series, state what the previous paper established, what this paper adds, and which boundaries remain distinct.

**Completion criterion:** The outline lets a reader construct the correct mental model without first reading the full paper, and all five questions test that model.

## 5. Implement the explanation

Apply the loaded HTML and multi-paper contracts. Produce one responsive long-page file per paper with inline CSS, inline JavaScript, a table of contents, semantic evidence notes, HTML or inline-SVG diagrams, preserved-whitespace `<pre>` blocks, useful interactions, and explanatory quiz feedback. Use the requested language while retaining English technical terms where useful.

**Completion criterion:** Each output is a self-contained offline file with working navigation, five feedback-bearing questions, and previous/next links where the task is a series.

## 6. Verify and hand off

Read [references/html-verification.md](references/html-verification.md), run `scripts/verify_explanation.py` on every output, validate inline JavaScript, and exercise the browser matrix there. Recheck chart labels and numbers against the evidence ledger. Keep temporary artifacts outside the deliverable directory and remove them after inspection. Report every unrun check as unrun and set the run status to incomplete until all required checks pass.

**Completion criterion:** Static validation, JavaScript checks, desktop/mobile/tail rendering, quiz-state checks, extra-interaction checks, visual inspection, and evidence rechecks all pass for every file.
