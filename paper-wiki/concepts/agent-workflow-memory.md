---
type: Method
title: Agent Workflow Memory
description: Induces reusable, natural-language multi-step workflows from an agent's successful trajectories and adds them to later prompts, so routines learned on one task guide the next; a common baseline for skill and experience reuse in web and interactive agents.
resource: https://arxiv.org/abs/2409.07429
aliases:
- AWM
tags:
- agent-skill-libraries
- agent-self-evolution
- learning-from-experience
timestamp: 2026-10-09T00:00:00Z
---

# Definition

Agent Workflow Memory (AWM; Wang, Mao, Fried, and Neubig, arXiv:2409.07429, 2024) induces commonly reused routines ("workflows") from past experience and selectively provides them to the agent to guide later actions. Workflows can be induced offline from training examples or online from test queries as they are solved. Its abstract reports experiments on two web-navigation benchmarks, Mind2Web and WebArena. Papers in this wiki treat it as a representative of the "induce procedures from experience" family next to Voyager's executable skills and ExpeL's insights. In the form Learn2Play evaluates it, workflows come from successful episodes only, so failed attempts do not contribute.

# Papers

* [X-Tree](../papers/2609.32993.md) - one of four LLM-written skill baselines (with SkillWeaver, WALT, and WebXSkill) against which X-Tree's mined hierarchy is used as in-context advice on MiniWoB++ (Appendix C).
* [Learn2Play Bench](../papers/2610.08215.md) - one of six experience methods on games with hidden rules; it has the lowest Learning Slope of the non-Naive methods with all three backbones (+0.62 Kimi K3, +0.43 Opus 5, -0.98 GPT-5 Mini), consistent with a method that learns only from successes in games where most early episodes fail.
* [From Traces to Agentic Worlds (Trace2Env)](../papers/2610.06100.md) - cited as trace-to-procedure distillation that serves the acting agent; Trace2Env distills traces into a worldbook for the simulated environment instead.

# Notes

Learn2Play's explanation (only successful episodes are used) is the paper's own description of the method; the link between that design and the low slope is the note's reading, not an ablation. Other papers in this wiki mention AWM only in related work.
