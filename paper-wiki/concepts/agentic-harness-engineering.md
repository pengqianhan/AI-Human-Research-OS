---
type: Method
title: Agentic Harness Engineering
description: AHE, a closed loop that evolves coding-agent harnesses through three observability pillars (file-level editable components, a distilled drill-down evidence corpus from trajectories, and edits paired with predictions checked in the next round); a frequent baseline for harness evolution.
resource: https://arxiv.org/abs/2604.25850
tags:
- agent-harness-engineering
- harness-evolution
- coding-agents
timestamp: 2026-11-09T00:00:00Z
---

# Definition

Agentic Harness Engineering (AHE; Lin, Liu, Pan, Lin, Dou, Huang, and others, arXiv:2604.25850) automates harness engineering for coding agents with three observability pillars. Component observability gives every editable harness component a file-level representation, so the action space is explicit and revertible. Experience observability distills millions of trajectory tokens into a layered evidence corpus an evolving agent can consume. Decision observability pairs each edit with a self-declared prediction that is checked against the next round's task outcomes, making every edit a falsifiable contract. Its abstract reports ten iterations raising Terminal-Bench 2 pass@1 from 69.7% to 77.0%, above Codex-CLI (71.9%), transfer of the frozen harness to SWE-bench Verified and to other model families, and ablations that place the gain in tools, middleware, and long-term memory rather than the system prompt. This description follows the paper's abstract; the full paper has not been ingested.

# Papers

* [Beneath the Surface](../papers/2611.07624.md) - one of four audited harness-evolution methods (newest-Parent selection, per-task debugger reports, one testable change per round, admit all valid evaluations); its MiniSWE Champion has the largest τ³-Banking coverage gain (+11.3 points), and its two τ³-Banking Champions show no significant interaction between their Components.
* [RRSI](../papers/2609.24972.md) - one of RRSI's compared harness-evolution baselines, with Meta-Harness, TTHE, and HarnessX.
* [SoL-Pi](../papers/2609.20519.md) - cites AHE as a direct automated-harness-optimization peer that evolves modular coding-harness components from trajectory evidence.
* [Harness²](../papers/2610.14224.md) - lists AHE among offline whole-harness search methods in its 27-method comparison table, against which it argues for adaptation at deployment.

# Notes

Beneath the Surface's version is a reimplementation inside a shared operator framework with GPT-5.4 and 20 generations. Its admission rule (accept any valid evaluation, select the newest Parent) means the next Parent can be a lower-scoring revision, which that paper separates from final Champion selection.

# Related

* [Meta-Harness](meta-harness.md) - the other common offline harness-optimization baseline.
* [HyperAgents](hyperagents.md) - the other implementation-centric harness-evolution method in the same audit.
* [Terminal-Bench](terminal-bench.md) - the benchmark of AHE's own headline result.
