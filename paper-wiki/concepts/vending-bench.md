---
type: Benchmark
title: Vending-Bench
description: A simulated environment where an LLM agent runs a single vending machine over a long horizon (inventory, orders, prices, daily fees), built to test sustained coherent decision-making and scored by the business outcome.
resource: https://arxiv.org/abs/2502.15840
tags:
- benchmarks
- long-horizon-agents
- business-operations
timestamp: 2026-11-10T00:00:00Z
---

# Definition

Vending-Bench (Backlund and Petersson, 2025, arXiv:2502.15840) is a simulated environment that tests whether an LLM agent can manage a simple, long-running business: operating one vending machine. The agent balances inventory, places orders, sets prices, and pays daily fees. Each task is simple, but together, over runs of more than 20M tokens, they stress sustained and coherent decision-making. The original paper reports high variance across models: Claude 3.5 Sonnet and o3-mini turn a profit in most runs, but every model has runs that derail, by misreading delivery schedules, forgetting orders, or entering "meltdown" loops, and the authors find no clear link between these failures and the point where the context window fills. The paper also presents the benchmark as a test of a model's ability to acquire capital.

# Papers

* [AutoVend](../papers/2610.36980.md) - names Vending-Bench as the single-machine predecessor (with Vending-Bench 2 extending it to a simulated year and an Arena of competing agents) and extends the setting to 20 heterogeneous machines with a shared warehouse, lead times, and paid restocking visits.
* [FDE-Gym](../papers/2610.22350.md) - cited among delivery-and-outcome benchmarks as an executable business simulation that replaces human judges.

# Notes

Neither paper in this wiki reports a score on Vending-Bench itself; AutoVend's comparison table lists it as one operating unit, no real commercial data, physical operations, and not open source.
