---
type: Term
title: Context rot
description: The degradation of language-model output quality as context grows, even when the input remains within the physical context window.
resource: https://research.trychroma.com/context-rot
tags:
- long-context-reasoning
- context-engineering
- agent-reliability
timestamp: 2026-07-21T00:00:00Z
---

# Definition

Context rot (Hong et al., 2025) names the observation that model quality falls as the context lengthens, well before the physical window is exhausted. It underpins the distinction between a model's **physical context length** — how many tokens a forward pass accepts — and its **effective context length** — how many tokens it can actually use reliably on a given task.

The RLM paper pushes this further: effective context length cannot be defined independently of the task. Since more information-dense tasks degrade at shorter lengths than sparse ones, an "effective window" is a property of the (model, task) pair rather than of the model alone. This is why a system can look strong on million-token needle-in-a-haystack retrieval and still fail on a 131K-token aggregation task.

Context rot is the motivation for most inference-time long-context scaffolding — compaction, memory hierarchies, retrieval, and prompt externalization — since these all reduce how much material the model must attend to at once.

# Papers

* [Recursive Language Models](../papers/2512.24601.md) - cites context rot as the core motivation, shows GPT-5 degrading faster on denser tasks, and uses small-context sub-LM calls to avoid it.

# Related

* [Context engineering](../topics/context-engineering.md)
* [Long-context reasoning](../topics/long-context-reasoning.md)
