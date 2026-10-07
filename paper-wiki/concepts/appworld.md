---
type: Benchmark
title: AppWorld
description: Controllable world of 9 day-to-day apps operable through 457 APIs and populated with about 100 simulated users, with 750 tasks that an agent solves by writing interactive code and that are scored by state-based unit tests that also check for collateral damage.
resource: https://arxiv.org/abs/2407.18901
tags:
- benchmarks
- tool-use
- coding-agents
- stateful-environments
timestamp: 2026-10-07T00:00:00Z
---

# Definition

AppWorld (Trivedi et al., arXiv:2407.18901, ACL 2024) has two parts. The AppWorld Engine is an execution environment of 9 everyday apps (such as notes, messaging, and shopping) reachable through 457 APIs and filled with realistic activity for about 100 fictitious users. The AppWorld Benchmark is a suite of 750 tasks that require the agent to write code with real control flow, calling APIs iteratively and reacting to what they return, rather than issuing a short fixed sequence of calls. Scoring uses state-based unit tests on the final database, which accept different valid ways to finish a task and also flag unexpected changes (collateral damage). Tasks come in train and dev splits and in "normal" and "challenge" test sets; at release GPT-4o solved about 49% of normal and 30% of challenge tasks.

# Papers

* [EviSkill](../papers/2610.05030.md) - one of three skill-evolution environments (official 90 train, 57 dev, 168 test_normal tasks); EviSkill's least consistent environment, first or tied first with three of six action backbones and below at least one baseline with the other three.
* [Raven](../papers/2609.33439.md) - one of the seven HarnessBank benchmarks whose published harness-evolution results Raven reuses: held-out Pass@1 41.3 → 56.7 with a frozen Qwen3.6-27B.
* [From Evidence to Action (SafeActBench)](../papers/2610.07753.md) - a reference point in its benchmark comparison: stateful, but with no explicit scoring of trajectory checks, pre-action evidence, entity/state binding, result propagation, or investigated non-action.

# Notes

The state-based tests make AppWorld an outcome benchmark: they check what the database looks like at the end, not whether each API call was justified by something the agent had read first. SafeActBench's comparison table draws exactly that line. EviSkill's AppWorld margins also show how coarse the test split is for method comparisons: one of its 168 test_normal tasks is worth 0.60 points.
