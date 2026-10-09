---
type: Tool
title: Terminus 2
description: The general-purpose terminal-agent harness from the Harbor framework, widely used as the plain baseline harness on Terminal-Bench and as the starting point that harness-optimization papers modify.
aliases:
- Terminus-2
tags:
- agent-harness-engineering
- terminal-agents
- coding-agents
timestamp: 2026-10-09T00:00:00Z
---

# Definition

Terminus 2 is a general-purpose harness for terminal tasks distributed with Harbor, a framework for evaluating agents and models in container environments. The model issues shell commands, reads their output, and decides how to proceed and when to finish, with relatively little built-in workflow control (no persistent state machine, no external verifier loop). Because it is simple and standard on [Terminal-Bench](terminal-bench.md), papers use it in three roles: as the fixed baseline harness when comparing models, as the starting harness that an optimizer patches, and as a small, readable code base to study harness modification. Terminus-KIRA, a hand-tuned harness from KRAFTON AI and Ludo Robotics, is a common reference point next to it.

# Papers

* [LLM-as-a-Verifier](../papers/2607.05391.md) - generalization check in its Appendix B.1 on Terminal-Bench, using Terminus-2 with GPT-5.3-Codex (and Terminus-Kira with Claude Opus 4.6) as the trajectory sources.
* [Harness Handbook](../papers/2607.13285.md) - one of two modification-target repositories (a Python terminal agent with 6 source files and 103 internal-function nodes); Handbook assistance raises plan-quality win rate from 26.7% to 45.6% on Terminus-2 requests.
* [AutoSaddler](../papers/2608.23041.md) - the base harness optimized on Terminal-Bench 2.0: Pass@1 40.0% to 50.0%, above the hand-tuned Terminus KIRA (47.5%).
* [Recuris](../papers/2608.24876.md) - the agent used for its Terminal-Bench 2.1 test-time adaptation mode (87 tasks).
* [RRSI](../papers/2609.24972.md) - the starting harness H₀ for the coding domain, which RRSI and four other methods (Meta-Harness, AHE, TTHE, HarnessX) evolve on Terminal-Bench 2.1 under the same budget.
* [Mid-Harness](../papers/2609.39982.md) - the second harness in its transfer runs (Qwen3.5-9B, Nemotron3.5 Lightning, Nemotron3 Ultra), showing per-step action verification works without changing the harness loop.
* [ActiveSaddler](../papers/2610.00906.md) - the base harness optimized on Terminal-Bench 2.0 with gpt-5.5: 64.2 unoptimized, 80.0 ± 2.5 after optimization, against 69.2 for Terminus-KIRA.
* [Recursive Self-Rewrite](../papers/2610.02826.md) - the general target harness: harness-assisted successes from StateM and a Terminus 2 continuation variant (RSRT) are rewritten into fresh Terminus 2 trajectories for SFT, and the trained model runs under Terminus 2 alone (Terminal-Bench 2 pass@3 74.2% against 57.0% for the base model).
* [From Traces to Agentic Worlds (Trace2Env)](../papers/2610.06100.md) - a gpt-5.6-sol Terminus-2 agent, run on Terminal-Bench 2.0 through Harbor, produced the 20 construction trajectories from which the Terminal worldbook is built; Terminus 2's tmux-keystroke actions and terminal-screen observations define the action and observation interface the simulator reproduces.

# Notes

Scores labeled "Terminus 2" are not comparable across papers unless the Terminal-Bench version (2.0, 2.1, Lite), task split, model, and attempt count match; ActiveSaddler's 64.2 and AutoSaddler's 40.0 baselines are both Terminus 2 on a 40-task Terminal-Bench 2.0 test split, but with different frozen models (gpt-5.5 against AutoSaddler's default Claude Opus 4.6), so the harness name alone does not fix the baseline.
