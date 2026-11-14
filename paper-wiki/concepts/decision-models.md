---
type: Term
title: Decision models
description: Pretrained models that answer a question about a context with a typed output, such as a choice among given options with a probability for each or a score in [0,1], instead of generated text; also called System One models, with TypeSafe's Jev as the first public example.
aliases:
- System One models
- Jev
- JEV
tags:
- decision-models
- system-one-models
- typed-outputs
timestamp: 2026-11-13T00:00:00Z
---

# Definition

A decision model takes a question and a context and returns a typed answer instead of free text: for a multiple-choice question, a selected option and a probability for every option; for a yes/no question, a single score in [0,1]. Because no long token sequence is generated, a query is fast and cheap, so an agent can ask many of them, to choose its next action, to evaluate an action already taken, or to score every step of a rollout. The definition here follows "Actor, Judge, or Teacher?" (arXiv:2611.17167), which names three dedicated models: JEV from TypeSafe AI (closed, base model undisclosed, described there as the earliest public one), Decider v1.2 from Perplexity AI (open weights, fine-tuned from Qwen3.8-27B), and GPT Decisions from OpenAI (closed, built on GPT-6 Luna). A general LLM can be given the same interface by prompting for JSON probabilities or by reading first-token probabilities over answer labels. TypeSafe's own term for the class is "System One models".

# Papers

* [Jev-Mem](../papers/2609.23986.md) - uses Jev as a batched typed-probability controller for memory decisions (typing, relation judgment, routing, retrieval budget, stopping), keeping a generative LLM for answer synthesis only.
* [Actor, Judge, or Teacher?](../papers/2611.17167.md) - compares three dedicated decision models and three general LLMs given the same questions as actors and judges on ALFWorld, and trains policies with JEV's per-action scores: poor at ordered subgoals when acting, useful as hindsight judges and as step-level teachers.

# Notes

The two papers use the same model in opposite positions. Jev-Mem puts it in the control path, making decisions online. "Actor, Judge, or Teacher?" finds decision models weakest exactly there when a decision has consequences that are not yet visible, and strongest when scoring after the fact. Jev-Mem's decisions (which memory type, whether two items are related) are mostly local classifications, so the two results are compatible (reader observation). Papers cited by the second study but not in this wiki report further acting failures in agent loops (arXiv 2610.18579, 2610.13092, 2610.01834) and shared control with an LLM (arXiv 2610.21412).

# Related

* [LLM-as-a-Judge](llm-as-a-judge.md) - a decision model used as judge returns a calibrated-looking score directly instead of generated text to parse.
* [GRPO](grpo.md) - the RL method whose outcome advantage decision-model scores are added to.
