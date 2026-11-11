---
type: Method
title: ExpeL
description: An experiential-learning agent that gathers experience on training tasks, extracts natural-language insights from it without parameter updates, and recalls those insights and past experiences at inference; a standard baseline for experience memory in LLM agents.
resource: https://arxiv.org/abs/2308.10144
aliases:
- Experiential Learning agent
tags:
- agent-memory
- agent-self-evolution
- learning-from-experience
timestamp: 2026-11-11T00:00:00Z
---

# Definition

ExpeL (Zhao, Huang, Xu, Lin, Liu, and Huang, arXiv:2308.10144, 2023; "ExpeL: LLM Agents Are Experiential Learners") is an agent that learns from experience without updating model weights. According to its abstract, the agent autonomously gathers experiences on a collection of training tasks, extracts knowledge from them in natural language, and at inference recalls its extracted insights and past experiences to make decisions; the reported result is that performance improves as experience accumulates. Papers in this wiki use it as the representative "distill insights from trajectories" baseline, beside [Agent Workflow Memory](agent-workflow-memory.md) (induced workflows) and [ReasoningBank](reasoningbank.md) (reasoning strategies from successes and failures), and cite it in related work next to [Reflexion](reflexion.md) and Voyager.

# Papers

* [Code2Skill](../papers/2609.05571.md) - re-implemented as one of three trajectory-derived baselines under a shared retrieval interface; Code2Skill's code-derived skills outperform it on all seven shared benchmarks.
* [WikiTrace](../papers/2611.14320.md) - official implementation adapted to one offline pass over shared no-memory runs (successes only, no exemplar retrieval); 80.3 average over eight suites against 79.5 without memory, below No Memory on three suites, and the source of the paper's example of a wrong rule that breaks a solved task.

# Notes

Both wiki papers that run ExpeL change it. Code2Skill re-implements it from the paper, and WikiTrace removes the repeated attempts and exemplar retrieval to fit a single-pass offline protocol, so neither number is the original system's (reader observation). Many other notes mention ExpeL only in related work.

# Related

* [Agent Workflow Memory](agent-workflow-memory.md) - the workflow-induction baseline usually compared beside it.
* [ReasoningBank](reasoningbank.md) - a later memory that also learns from failed trajectories.
* [Reflexion](reflexion.md) - verbal self-reflection across attempts on the same task.
