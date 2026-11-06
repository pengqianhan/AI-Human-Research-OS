---
type: Metric
title: Pass@K
description: Probability that at least one of K independently sampled attempts succeeds, used to probe what a model can reach rather than what it does on average; Pass@(K,T) adds a limit of T interaction turns per attempt.
tags:
- metrics
- test-time-scaling
- agent-evaluation
timestamp: 2026-11-06T00:00:00Z
---

# Definition

Pass@K is the probability that at least one of K independently sampled attempts at a task succeeds, averaged over tasks. Pass@1 is the ordinary success rate. From n samples with c successes, a common estimator is 1 − C(n−c, k)/C(n, k), the chance that a uniform draw of k without replacement contains a success, which has lower variance than repeatedly sampling groups of k. Pass@(K,T) adds a second axis for interactive agents: at least one of K trajectories succeeds within T turns. Fixing K and sweeping T gives Pass@T.

# Papers

* [What Does Multi-Turn RL Really Improve](../papers/2611.06483.md) - main metric, in the Pass@(K,T) form: RL exceeds the base model's Pass@K boundary at full budget but loses its advantage under tight T.
* [FrontierPhysics](../papers/2611.06910.md) - reports Pass@1 and Pass@3 with bootstrap intervals over tasks, 27.4% and 44.6% for its top configuration.
* [SoftwareGym](../papers/2610.12611.md) - reports Pass@3 over three rollouts on OSWorld (41.39% to 56.97%) beside the single-run average (28.40% to 46.77%).
* [ToolSpace](../papers/2611.05036.md) - uses Pass@16 as a data filter, keeping RL tasks with one or two correct rollouts in 16.
* [LLM-as-a-Verifier](../papers/2607.05391.md) - cites a high oracle Pass@K on Terminal-Bench to argue the bottleneck is selecting a trajectory, not generating one.
* [Harness-S](../papers/2611.04277.md) - reports Pass@3 beside Avg@3; on SWE-Gym its Pass@3 gain over GRPO (14.37 points at 4B) is more than twice its Avg@3 gain.

# Notes

Pass@K assumes something can identify the successful attempt. Without a selector or verifier it describes an upper bound, not a deployable system (reader note). Values with different K are not comparable, so check K before comparing a score against another paper's single-run average.

# Related

* [FrontierPhysics](frontierphysics.md) - benchmark that reports Pass@1 and Pass@3.
* [GRPO](grpo.md) - the primary training method in the Pass@(K,T) analysis listed above.
