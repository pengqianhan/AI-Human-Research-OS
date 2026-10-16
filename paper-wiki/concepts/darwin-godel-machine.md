---
type: Method
title: Darwin Gödel Machine (DGM)
description: Self-improving coding agent that rewrites its own code, validates each version empirically on coding benchmarks, and keeps every generated agent in an open-ended archive from which new parents are sampled; the usual reference point for self-modifying agents and archive-based harness search in this wiki.
resource: https://arxiv.org/abs/2505.22954
aliases:
- DGM
tags:
- recursive-self-improvement
- agent-self-evolution
- agent-harness-engineering
- evolutionary-search
timestamp: 2026-10-16T00:00:00Z
---

# Definition

The Darwin Gödel Machine (Zhang, Hu, Lu, Lange, and Clune, arXiv:2505.22954; ICLR 2026 per the citing papers) replaces the Gödel machine's requirement of a proof that each self-modification helps with empirical validation. A coding agent modifies its own codebase, which also changes its ability to modify that codebase, and each new version is scored on coding benchmarks. Every generated agent is kept in an archive; the archive grows by sampling an agent from it and having a foundation model produce a new version, so search proceeds along many branches of a tree rather than from a single incumbent. Its abstract reports SWE-bench rising from 20.0% to 50.0% and Polyglot from 14.2% to 30.7%, with sandboxing and human oversight as safety precautions. Papers here cite it as the canonical self-modifying agent and as the example of archive-based search over agent code.

# Papers

* [Self-evolving Agent Harness](../papers/2610.18813.md) - an exemplar of repository-level search that keeps implementation lineages for later selection, and of archive-based evolutionary search (with DarwinX and the Huxley-Gödel Machine) in its mapping of harness optimizers to EA structures; it notes the analogy does not imply tree-based genetic-programming operators, and that archive membership is not adoption until a program is promoted into the runtime.
* [The Last AI Built by Humans](../papers/2609.11873.md) - the autonomy-attribution case study: because DGM's archive-maintenance and parent-selection rules stay outside self-modification, better candidates do not by themselves show a better discovery mechanism; cites the 20% to 50% SWE-bench-subset gain.
* [Self-Improvements in Modern Agentic Systems](../papers/2607.13104.md) - classified as full-scaffold improvement that rewrites coding-agent scaffolds and keeps diverse verified descendants in an open-ended archive; one of the bounded propose-validate-replace loops the survey describes.
* [RSIAgent](../papers/2609.15364.md) - situates itself among DGM (self-modification evaluated on coding benchmarks), the Huxley-Gödel Machine, and Hyperagents.
* [ScienceBuddy](../papers/2609.17523.md) - cited with Hyperagents under recursive self-improvement as an editable improvement procedure; ScienceBuddy notes its own reflector stays fixed.
* [SoL-Pi](../papers/2609.20519.md) - cited, after the Gödel Machine, as a system that iteratively modifies and evaluates agent code.
* [RRSI](../papers/2609.24972.md) - listed in the self-modifying-agent line with the Huxley-Gödel Machine, Hyperagents, Agent0, and R-Zero.
* [Raven](../papers/2609.33439.md) - listed among harness-optimization methods as self-editing code.
* [Harness²](../papers/2610.14224.md) - cited in its recursive self-improvement related work with STOP and Hyperagents.

# Notes

None of these papers reruns DGM; each describes the original. Two of them draw the same boundary from different directions: The Last AI Built by Humans argues that DGM's fixed archive and parent-selection rules keep it short of improving its own discovery mechanism, and the Self-evolving Agent Harness paper separates keeping a candidate in an archive from deploying it. Both suggest reporting which parts of a self-modifying system are themselves editable.

# Related

* [Recursive self-improvement](../topics/recursive-self-improvement.md)
* [Agent self-evolution](../topics/agent-self-evolution.md)
* [Agent harness engineering](../topics/agent-harness-engineering.md)
* [AlphaEvolve](alphaevolve.md) - another LLM-driven evolutionary coding system, aimed at algorithm discovery rather than at the agent's own code.
* [Meta-Harness](meta-harness.md) - searches harness code around a frozen model from a history of candidates rather than from an open-ended archive of self-modified agents.
