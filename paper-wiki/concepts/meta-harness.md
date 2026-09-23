---
type: Method
title: Meta-Harness
description: End-to-end outer-loop optimization of an agent's executable harness code, in which an agentic proposer reads the source, scores, and execution traces of earlier candidates to propose improved harnesses; the most common reference baseline for automated harness evolution in this wiki.
resource: https://arxiv.org/abs/2603.28052
tags:
- agent-harness-engineering
- harness-evolution
timestamp: 2026-09-23T00:00:00Z
---

# Definition

Meta-Harness (Lee, Nair, Zhang, Lee, Khattab, and Finn, arXiv:2603.28052, COLM 2026) formulates harness engineering as an outer-loop optimization problem over executable harness code with a frozen backbone model. An agentic proposer has access to the source code, evaluation scores, and execution traces of previously tried harnesses, and uses that accumulated history to propose new candidates. The candidates are kept or discarded by their score on an evolution set. Later papers use it as the canonical "evolve the harness, not the weights" baseline, and as the reference point when asking whether evolved harnesses transfer beyond the tasks they were searched on.

# Papers

* [MemoHarness](../papers/2607.14159.md) - names Meta-Harness as its closest conceptual predecessor for treating harness code as the optimization object, then adds a dual-layer experience bank and per-case test-time adaptation.
* [AutoSaddler](../papers/2608.23041.md) - compares against Meta-Harness on GAIA2 and Terminal-Bench 2.0 and uses it as the reference for its efficiency claim of needing about 10× fewer traces to reach peak dev accuracy.
* [SoL-Pi](../papers/2609.20519.md) - cites Meta-Harness as a direct automated-harness-optimization peer (search over executable harness programs with held-out transfer and a performance/context-cost Pareto frontier) and builds its search/validation separation in response to the generalization concern such methods raise.
* [RRSI](../papers/2609.24972.md) - runs Meta-Harness as a same-budget baseline. It is the strongest evolve-set method on Harvey LAB (93.0 vs. H₀ 89.4) but adds only +0.9 to the out-of-distribution average, which is RRSI's central evidence that unregularized evolution overfits.

# Notes

Across these papers Meta-Harness serves two roles: a strong in-distribution optimizer, and the foil for generalization critiques. Whether its evolve-set gains transfer depends heavily on the evaluation split. The numbers above come from each citing paper's own reruns under their own budgets, not from the original Meta-Harness paper, which this wiki has not yet ingested.
