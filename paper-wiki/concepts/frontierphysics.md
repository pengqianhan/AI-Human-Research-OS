---
type: Benchmark
title: FrontierPhysics
description: End-to-end physics research benchmark of 56 tasks built by 42 physicists from their own projects, across nine domains. Agents deliver verifiable numerical outputs and a manuscript, and a pass requires a deterministic verifier plus all blocker rubrics graded by a reviewer agent.
resource: https://arxiv.org/abs/2611.06910
tags:
- benchmarks
- ai-for-science
- physics
- rubric-grading
timestamp: 2026-11-05T00:00:00Z
---

# Definition

FrontierPhysics (v0.1) gives an agent a high-level brief resembling a principal investigator's instructions, with no stated method, and asks it to review literature, plan and run the research, and deliver numerical artifacts and `paper.pdf`. A deterministic verifier checks the artifacts, and a reviewer agent grades the trajectory and manuscript against an expert rubric of binary blockers and weighted non-blockers. A rollout's score is its weighted non-blocker percentage if every test and blocker passes, and 0 otherwise. Tasks cover theoretical, computational, and experimental physics, and 56 were accepted from 182 submissions after general, domain-peer, and failure-mode review.

# Papers

* [FrontierPhysics](../papers/2611.06910.md) - introduces it: 26 configurations with three trials per task; best Pass@1 is 27.4% (Claude Opus 5.5, in Claude Code), and an expert audit of GPT-6 Astra rollouts finds nine false failures of 168.

# Notes

Results come from a single reviewer agent, GPT-5.6 Sol (xhigh), and only GPT-6 Astra's pass rate has been corrected for rollout-level false negatives, so comparisons between model families carry that asymmetry.

# Related

* [FrontierScience](frontierscience.md) - rubric-graded research sub-tasks, without a deterministic verifier or graded write-up.
* [LLM-as-a-Judge](llm-as-a-judge.md) - the rubric review uses a sandboxed agent with trajectory access instead of a single LLM call.
* [Pass@K](pass-at-k.md) - results are reported as Pass@1 and Pass@3.
