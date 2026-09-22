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
* [Dream-RSI](../papers/2609.14858.md) - cuts the cost of a different stage of kernel search than GPU Forecasters: not on-device measurement itself, but *meta*-level exploration-policy evaluation, by replaying candidate exploration policies against a completed KernelBench discovery tree at zero execution cost; on VGG16 and LayerNorm reaches comparable final performance using 2.43x and 1.79x fewer generations than a fixed-policy baseline, and on ConvDiv/ConvMax reaches 2.09x/1.44x higher performance under matched generation budgets.

# Synthesis

GPU Forecasters and Dream-RSI target complementary, non-overlapping cost centers in the same kernel-search loop. GPU Forecasters makes each individual on-device measurement cheaper to approximate (a learned surrogate predicts runtime instead of running the kernel). Dream-RSI leaves every on-device measurement real but makes the *choice of which candidates to generate and in what order* cheaper to improve, by treating a completed discovery tree of already-measured kernels as a replay simulator that many alternative exploration policies can be evaluated against for free. Nothing in this topic yet combines the two: a forecaster-accelerated online exploration phase feeding Dream-RSI's replay-based meta-optimization is an open combination neither paper's own evaluation tests.

# Open Questions

* How well do learned or LLM-based kernel evaluators generalize across GPU architectures and kernel families?
* What is the right budget split between cheap surrogate evaluation and expensive ground-truth GPU measurement during search?
* Can surrogate-accelerated kernel search be combined with LLM-driven kernel code generation in a single closed loop?
* Dream-RSI's replay-based policy evaluation and GPU Forecasters' runtime-prediction surrogate both cut cost in this topic's search loop but at different layers (meta-level exploration-policy evaluation vs. per-candidate measurement) — would composing them (a forecaster-accelerated online exploration phase feeding Dream-RSI's offline dreaming) compound their reported gains, or would forecaster noise undermine the fidelity Dream-RSI's replay mechanism depends on (since replay assumes recorded outcomes are ground truth, not predictions)?
* Dream-RSI evaluates only 4 of KernelBench's tasks (VGG16, LayerNorm, ConvDiv, ConvMax) with uneven gains across them (1.44x-2.43x depending on task and metric) — does the replay-simulator approach's advantage hold across KernelBench's full task and hardware-architecture diversity, or is it concentrated in tasks whose search space happens to reward reorganizing already-discovered patterns (which replay evaluates well) over discovering genuinely novel kernel structures (which replay cannot credit, since it can only reveal already-recorded outcomes)?
