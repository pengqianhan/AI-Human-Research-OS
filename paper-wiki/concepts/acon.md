---
type: Method
title: ACON (Agent Context Optimization)
description: A context-compression framework for long-horizon LLM agents that condenses both environment observations and interaction histories, with a compression guideline optimized in natural language from cases where full context succeeds and compressed context fails; a common compression baseline in context-management papers.
resource: https://arxiv.org/abs/2510.00615
tags:
- context-engineering
- context-compression
- long-context-reasoning
timestamp: 2026-11-12T00:00:00Z
---

# Definition

ACON (Kang et al., arXiv:2510.00615, 2025; "ACON: Optimizing Context Compression for Long-horizon LLM Agents") compresses an agent's environment observations and its interaction history into shorter condensations. According to its abstract, the compression guideline is optimized in natural-language space: given paired trajectories where the full context succeeds and the compressed context fails, a capable LLM analyzes the cause of failure and the guideline is updated. The optimized LLM compressor can then be distilled into a smaller model to reduce the overhead of the extra module. The abstract reports 26 to 54% lower peak tokens on AppWorld, OfficeBench, and Multi-objective QA while largely preserving task performance.

# Papers

* [SparseRead](../papers/2608.22237.md) - baseline with both observation and history compression enabled and compressor calls counted in cost; loses score against the unmodified agent in five of 15 settings and raises both tokens and time in six.
* [PoS](../papers/2610.01415.md) - compression baseline inside one ReAct harness, run without its guideline optimization and distillation; the strongest baseline on LOCA-Bench with GLM-5.3 (65.90 against PoS's 70.86).
* [CarryOn](../papers/2610.18784.md) - reuses ACON's FIFO-truncation and summarization baselines but does not compare against ACON's optimized compressor.

# Notes

None of the three wiki papers runs ACON as its authors describe it: PoS drops the guideline optimization and distillation, CarryOn uses only its simpler baselines, and SparseRead does not say which guideline or compressor model it uses (reader observation). ACON numbers in this wiki are therefore lower bounds on the method. Other notes mention it only in related work. The ACON paper itself has not been added to the wiki; this definition follows its abstract.

# Related

* [Context compaction](context-compaction.md) - the general operation ACON performs on histories and observations.
