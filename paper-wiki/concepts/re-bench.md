---
type: Benchmark
title: RE-Bench
description: Seven open-ended ML research-engineering environments in which agents and human experts improve a working starting solution within time budgets of up to eight hours, scored against strong reference solutions, with 71 eight-hour expert attempts as a human baseline.
resource: https://arxiv.org/abs/2411.15114
tags:
- benchmarks
- ai-research-automation
- long-horizon-agents
- human-baseline
timestamp: 2026-11-17T00:00:00Z
---

# Definition

RE-Bench (Research Engineering Benchmark v1, arXiv:2411.15114) measures frontier AI research-and-development capability with seven challenging, open-ended ML research-engineering environments and data from 71 eight-hour attempts by 61 human experts. Its abstract reports that 82% of expert attempts score above zero and 24% match or beat the strong reference solutions; that the best AI agents score four times higher than experts at a two-hour total budget per environment, while humans show better returns to time, narrowly exceeding the top agent at eight hours and doubling it at 32 hours; and that an agent wrote a faster custom Triton kernel than any expert. Scores are normalized between the starting solution and the reference. This description follows the paper's abstract; the paper itself has not been ingested.

# Papers

* [Accelerate Bench](../papers/2611.20882.md) - names RE-Bench closest in format (improve a working solution within up to eight hours) and differs by scoring runtime ratios to the supplied baseline on private inputs instead of normalizing to an expert solution.
* [ASI-Bench](../papers/2608.17271.md) - scores RE-Bench among eight prior benchmarks as execution-oriented ML engineering that does not withdraw human methodological guidance.

# Related

* [PaperBench](paperbench.md) - another research-automation benchmark, scoring replication of papers with rubrics rather than improvement of a working solution.
* [ProgramBench](programbench.md) - a behavioral-specification benchmark that Accelerate Bench pairs with RE-Bench's working-solution format.
