---
type: Topic
title: Long-context reasoning
description: Papers about processing and reasoning over inputs that exceed, or degrade within, a model's usable context window.
tags:
- long-context-reasoning
- inference-time-scaling
- context-engineering
timestamp: 2026-07-21T00:00:00Z
---

# Scope

This topic tracks how language-model systems handle inputs that are too long, or too information-dense, for the model to process in a single forward pass: externalizing the prompt into an environment, chunking and recursive sub-calls, compaction and summarization, retrieval scaffolds, memory hierarchies, and the benchmark design needed to tell these apart. It also covers the measurement question — what "effective context length" means once it is understood to depend on the task rather than on token count alone.

Architectural approaches to long context (position encodings, attention variants, retraining for longer windows) are in scope only where a paper contrasts them with inference-time scaffolds.

# Papers

* [Recursive Language Models](../papers/2512.24601.md) - places the prompt in a Python REPL as a variable and lets the root LM inspect, decompose, and recursively sub-query it, reaching 10M+ token inputs with a 272K-window model.

# Open Questions

* When is externalizing the prompt worth its cost, given that base models still win below roughly 2^14 tokens and agentic trajectories have a heavy cost tail?
* Does recursion deeper than one level help, or does error accumulation and cost growth dominate?
* How should benchmarks vary information density — constant, linear, quadratic in input length — rather than only varying token count?
* Which parts of long-context competence are semantic and which are harness-use skills (batching, stopping, trusting a stored result)?
* Can context-management policies be trained into a model rather than prompted, and do trained policies transfer across task shapes?

# Related

* [Context engineering](context-engineering.md)
* [Agent harness engineering](agent-harness-engineering.md)
