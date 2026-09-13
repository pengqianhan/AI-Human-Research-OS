---
type: Benchmark
title: LoCoMo
description: A very-long-term conversational memory benchmark of multi-session dialogues (averaging 35 sessions, 300 turns, ~9K tokens) spanning single-hop, multi-hop, open-domain, and temporal reasoning categories.
resource: https://arxiv.org/abs/2402.17753
tags:
- agent-memory
- long-term-memory
- benchmark
timestamp: 2026-09-13T00:00:00Z
---

# Definition

LoCoMo (Maharana et al., ACL 2024, "Evaluating Very Long-Term Conversational Memory of LLM Agents") is a benchmark of long-form, multi-session dialogues designed to test very long-term conversational memory. Individual dialogues extend to an average of 35 sessions, 300 turns, and roughly 9,000 tokens, with questions spanning four reasoning categories — single-hop, multi-hop, open-domain, and temporal — emphasizing conversational continuity and reasoning depth over disjoint sessions rather than single-session recall.

# Papers

* [Memanto](../papers/2604.22085.md) - reports 87.1% overall accuracy (Stage 5 of a five-stage ablation) alongside its LongMemEval result, using LoCoMo as a shorter-dialogue complementary benchmark; the paper's per-category breakdown shows Multi-Hop as its weakest category (70.8%) against a strongest Open Domain category (92.4%), and it reports the benchmark's own label-quality limitation (an estimated 6-7% of questions have ambiguous or unverifiable ground truth).
