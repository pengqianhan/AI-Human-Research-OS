---
type: Benchmark
title: LIBERO-Pro
description: A perturbed variant of the LIBERO tabletop-manipulation benchmark that stress-tests a frozen vision-language-action policy under deployment perturbations such as instruction redirection and object-position swaps.
tags:
- benchmarks
- robot-manipulation
- vla
- agent-harness-engineering
timestamp: 2026-09-21T00:00:00Z
---

# Definition

LIBERO-Pro extends the standard LIBERO tabletop-manipulation benchmark with perturbed evaluation conditions that probe whether a policy's success generalizes beyond its exact training-time instruction/scene binding, rather than only measuring in-distribution task completion. As used in this wiki, it is organized into task families crossed with perturbation types such as instruction redirection (T) and object-position swap (S), and is used to evaluate whether an added planning or harness layer can extend a frozen VLA's effective operating range without finetuning it.

# Papers

* [Zetta](../papers/2608.16590.md) - uses LIBERO-Pro (alongside RoboCasa) as one of two simulation benchmarks for a closed-loop embodied harness that evolves runtime critics and recovery skills online around a frozen VLA policy, reporting large success-rate gains and an 11.1x inference speedup relative to a frozen-VLA baseline.
* [Harness VLA](../papers/2607.08448.md) - uses LIBERO-Pro as its primary perturbation-robustness benchmark: a memory-guided LLM-agent harness composing a frozen VLA with fixed analytic primitives reaches 82.4% (Claude Code) versus 43.8% for RATS, the strongest reported prior baseline the paper identifies, and versus 50.0% for the same frozen VLA backbone run directly under the paper's own protocol.

# Notes

The two papers are not directly comparable on LIBERO-Pro: Zetta evolves the harness itself online across rollouts (continuous critic/recovery-skill updates), while Harness VLA's harness is fixed after a one-time per-task bootstrapping phase and only re-grounds a stored trace at deployment. Neither paper's LIBERO-Pro number in this wiki has been independently replicated.
