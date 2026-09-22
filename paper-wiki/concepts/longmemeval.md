---
type: Benchmark
title: LongMemEval
description: A 500-question benchmark spanning six categories (information extraction, multi-session reasoning, temporal reasoning, knowledge update, abstention, preferences) for evaluating long-term interactive memory in chat assistants, embedded in dialogues that can scale to over one million tokens across hundreds of sessions.
resource: https://arxiv.org/abs/2410.10813
tags:
- agent-memory
- long-term-memory
- benchmark
timestamp: 2026-09-13T00:00:00Z
---

# Definition

LongMemEval (Wu et al., ICLR 2025) is a large-scale benchmark for evaluating chat assistants' long-term interactive memory. It comprises 500 manually curated questions distributed across six categories — user-specific information, assistant responses, preferences, knowledge updates, temporal reasoning, and multi-session reasoning — embedded within extended multi-session dialogues (the standard "S" setting uses roughly 115K tokens across roughly 50 sessions, scaling to over a million tokens in harder settings). The benchmark's own analysis decomposes memory-system performance into indexing, retrieval, and reading stages, and finds that fine-grained session decomposition, enriched key representations, temporally-aware query expansion, and structured reading strategies each substantially affect accuracy — making it a benchmark that tests the full memory pipeline, not retrieval accuracy alone.

# Papers

* [Memanto](../papers/2604.22085.md) - reports 89.8% overall accuracy (Stage 5 of a five-stage ablation), the paper's headline result and its stated state-of-the-art among vector-only memory architectures; maps its D2 (temporal awareness) design desideratum directly onto this benchmark's Knowledge Update and Temporal Reasoning categories and attributes its largest single ablation gain (+20.4pp) to widening retrieval recall specifically to address this benchmark's multi-session questions, which require synthesizing facts distributed across disjoint sessions.
