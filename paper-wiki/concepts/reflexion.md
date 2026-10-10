---
type: Method
title: Reflexion
description: Verbal self-reflection for language agents - after each attempt the agent writes a natural-language lesson about what went wrong and carries the accumulated lessons into later attempts, improving without weight updates; a standard baseline and reference point for learning from experience in context.
resource: https://arxiv.org/abs/2303.11366
tags:
- agent-self-evolution
- learning-from-experience
- agent-memory
timestamp: 2026-10-10T00:00:00Z
---

# Definition

Reflexion (Shinn, Cassano, Labash, Gopinath, Narasimhan, and Yao, "Reflexion: Language Agents with Verbal Reinforcement Learning", arXiv:2303.11366, 2023) improves a language agent across repeated attempts at a task without changing its weights. After an attempt, the agent reflects in words on the task feedback (scalar or free-form, external or self-generated) and keeps the reflective text in an episodic memory buffer that guides later attempts; in Learn2Play's implementation the lessons cover discovered rules, successful and failed actions, and next steps. Papers in this wiki use it in two ways: as a baseline for methods that reuse experience in context, and as the starting point of a lineage (ExpeL, Voyager, Agent Workflow Memory, ReasoningBank, playbooks and skill files) that stores experience as text rather than in weights.

# Papers

* [AutoDev](../papers/2403.08299.md) - a HumanEval-leaderboard baseline (with LATS); AutoDev calls its own 91.5% Pass@1 the best among approaches needing no extra training data, a group that includes Reflexion, using leaderboard rather than rerun numbers.
* [EvoOntology](../papers/2609.15779.md) - part of the ReAct+Memory baseline family (with Voyager and Self-Refine): episodic memory lifts DDR-Bench Trajectory-Wise from 69.5 to 75.8, still 13.7 points below EvoOntology's typed ontology.
* [Learn2Play Bench](../papers/2610.08215.md) - one of six experience methods run under one protocol on games with hidden rules: best three-backbone average Max (60.0), but below raw interaction histories on Learning Gain and Slope with Kimi K3 (+14.8 against +16.9 LG).
* [AgentGarten](../papers/2610.12374.md) - places its round-by-round written playbooks in the Reflexion, ExpeL, and Voyager family, with agents that perceive only rendered frames and hand lessons to fresh agents.
* [Memento 3](../papers/2610.11794.md) - cited, alongside AutoManual and WALL-E, as textual memory that keeps linguistic reflections on task feedback; Memento 3 contrasts its own rulebook, which states revisable rules about environment dynamics and must be matched by code that replays the interaction record.

# Notes

The Reflexion numbers in these papers come from each paper's own setting (a leaderboard entry in AutoDev, a combined ReAct+Memory baseline in EvoOntology, a common game protocol in Learn2Play), not from the original paper, which this wiki has not ingested. Learn2Play's cases show the risk any lesson-writing method shares: a lesson drawn from too little evidence can stop later exploration, which raw histories avoid by keeping the original evidence available for revision. Many other papers in this wiki cite Reflexion only as related work; they are not listed here.
