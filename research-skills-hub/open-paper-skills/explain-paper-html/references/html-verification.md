# HTML verification

Use this reference after implementation. A check is either passed, failed, or unrun; only passed checks support a complete status.

## Static and script checks

Run the bundled verifier from the skill directory or with its full path:

```sh
python scripts/verify_explanation.py /absolute/path/to/explanation.html
```

The verifier checks structural parsing, unique IDs, table-of-contents targets, local cross-page links, self-contained resources, required semantic sections, exactly five quiz questions, preserved `<pre>` whitespace, quiz feedback hooks, residual placeholders/build expressions, and inline JavaScript syntax through Node.

Run it on every file in a multi-paper task. Treat exit code `0` as pass, `1` as a failed check, and `2` as an explicitly unrun JavaScript check. Use `--skip-js` only when reporting JavaScript validation as unrun.

## Browser matrix

Render each output directly from its local file URL at:

- desktop long-page width around 1366 px;
- mobile width around 390 px;
- the page tail or other dense target sections when a full-page image makes details unreadable.

Use the available browser automation or headless browser. Inspect the actual pixels, not only successful screenshot creation. Check:

- title and one-sentence conclusion;
- table of contents and anchor navigation;
- every SVG, equation, table, and callout;
- mobile type size, table/diagram overflow, and controls;
- the final section and page navigation.

Reject clipping, overlap, blank diagrams, accidental horizontal viewport overflow, unreadable labels, and excessive empty space.

## Behavior matrix

In a real browser:

1. Click one correct quiz option and verify the correct styling plus explanatory feedback.
2. Click one incorrect option and verify both the selected-wrong state and canonical-correct state plus feedback.
3. Exercise every state of each finite discrete control. For continuous controls, exercise the initial value, a representative transition, and every boundary input.
4. For each stateful visualization, assert that its causal input or event, availability/readiness facts, decision or output, diagram marks, labels, summary, and feedback all match its state contract and change together. Capture every semantically distinct state when a stale or contradictory panel could misteach the mechanism.
5. Follow every previous/next link and one table-of-contents link.

Use DOM state assertions together with screenshots of important states. Static source inspection does not count as a browser behavior pass.

## Evidence recheck and cleanup

Compare chart labels, units, equation signs, theorem conditions, and reported numbers with the evidence ledger and source paper. Mark redrawings and approximate values visibly. Store screenshots, extracted scripts, and browser profiles in a temporary directory, then remove that directory after inspection.

The verification phase passes only when the verifier, JavaScript syntax, browser matrix, behavior matrix, visual inspection, and evidence recheck pass for every output. Report the exact commands, result for each file, and any unrun condition.
