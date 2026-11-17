---
type: Benchmark
title: TheAgentCompany
description: A self-contained simulated software company with internal websites, data, and simulated coworkers, used to benchmark LLM agents on consequential professional tasks that require browsing, coding, running programs, and communicating with colleagues.
resource: https://arxiv.org/abs/2412.14161
tags:
- benchmarks
- workplace-agents
- simulated-coworkers
- long-horizon-agents
timestamp: 2026-11-17T00:00:00Z
---

# Definition

TheAgentCompany (arXiv:2412.14161) is an extensible benchmark that evaluates AI agents the way a digital worker would be used: by browsing the web, writing code, running programs, and communicating with coworkers. It builds a self-contained environment of internal websites and data that mimics a small software company and defines tasks a worker there might perform. Its abstract reports that the most competitive agent tested completed 24% of tasks autonomously, with simpler tasks often solvable and long-horizon ones still out of reach. Later work treats it as the reference point for evaluating agents inside a simulated organization. This description follows the paper's abstract; the paper itself has not been ingested.

# Papers

* [SWE-CoWork](../papers/2611.20218.md) - cites it as the simulated-company precedent and moves the setting to software delivery: 26 rule-governed colleagues per task hold requirements, and every requirement is tied to executable F2P/P2P tests.
* [FDE-Gym](../papers/2610.22350.md) - names it the closest benchmark in form (a self-contained simulated company), while noting it assumes a correctly specified task.

# Notes

The two papers above both keep the simulated-workplace idea but change what is scored: SWE-CoWork grades code against per-requirement tests and traces where each requirement was lost, and FDE-Gym grades the change in a customer's business metric. Neither reports results on TheAgentCompany itself.

# Related

* [DeepSWE](deepswe.md) - a repository benchmark with an identified objective, the setting SWE-CoWork contrasts with an organizational one.
