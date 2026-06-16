---
type: Topic
title: GPU kernel optimization
description: Papers about searching for and evaluating fast GPU kernels, including the cost of on-device measurement.
tags:
- gpu-kernel-optimization
- systems-for-ml
- kernel-search
timestamp: 2026-06-16T00:00:00Z
---

# Scope

This topic tracks papers about generating, searching over, and evaluating GPU kernels for performance, especially work that targets the cost of repeated on-device measurement during search.

# Papers

* [GPU Forecasters](../papers/2605.31464.md) - uses LLM surrogates to forecast kernel runtime and cut the number of real GPU measurements needed during kernel search.

# Open Questions

* How well do learned or LLM-based kernel evaluators generalize across GPU architectures and kernel families?
* What is the right budget split between cheap surrogate evaluation and expensive ground-truth GPU measurement during search?
* Can surrogate-accelerated kernel search be combined with LLM-driven kernel code generation in a single closed loop?
