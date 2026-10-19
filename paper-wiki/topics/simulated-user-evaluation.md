---
type: Topic
title: Simulated-user evaluation
description: Papers about using LLM-powered persona agents as stand-ins for real users to evaluate AI systems and digital products at scale.
tags:
- persona-agents
- user-simulation
- agent-benchmarks
timestamp: 2026-10-19T00:00:00Z
---

# Scope

This topic tracks papers that use LLM agents conditioned on human personas or profiles as simulated evaluators or participants — running them through surveys, conversations, or product interactions to measure how outcomes vary across user populations, rather than using agents as the system under test.

# Papers

* [MatrAIx](../papers/2608.04205.md) - population-scale simulated-user infrastructure pairing an 8.3-billion-record persona dataset with four interaction environments and 1,010 application tasks.
* [Foundations of Proactive Agents](../papers/2609.37267.md) - Proactivity-Gym's simulated users (three personas per scenario that differ in how much they delegate) respond to a proactive agent over several simulated days; a deterministic state machine decides each approval, decline, or deferral from the persona, history, and trust state, and Qwen 3.8-27B only phrases the reply, so the generated text cannot grant extra permission.
* [FDE-Gym](../papers/2610.22350.md) - more than 130 scripted customer stakeholders whose knowledge, misconceptions, disclosure conditions, patience, unavailability, and contact restrictions are fixed in advance, with a small model only mapping questions to topics; each message carries a hidden price, and the grader records which key facts the agent obtained.
* [BizBench](../papers/2610.20424.md) - an LLM customer (DeepSeek-V4.1-Flash by default) holds private facts and materials, discloses them when asked, and grants approvals bound to a request's current terms, one write or wait at a time; protocol violations fall from 4 of 50 tasks to none with a revised prompt, and strict success varies by at most 3.3 points across four simulator models for a Qwen3.8-27B agent.

# Synthesis

MatrAIx and Proactivity-Gym put the simulated user in different roles and constrain it differently. MatrAIx's persona agents stand in for users who try AI systems and digital products, so their interactions across user cohorts are the measurement; Proactivity-Gym's simulated user is part of the environment that a proactive agent is tested against, and the decisions that matter for scoring (approve, decline, defer) are taken out of the language model and given to rules. That makes Proactivity-Gym's trust-alignment score reproducible, but it measures agreement with the authors' persona rules rather than with real people; the paper's human study uses separate written vignettes rather than the simulated trajectories, so the simulator itself is not validated against humans.

FDE-Gym scripts more than Proactivity-Gym does: not only the decisions but every stakeholder's knowledge and disclosure rules are fixed in advance, and a small model only maps each question to a topic. The paper's reason is *Lost in Simulation*'s finding that switching the user-simulation model shifts measured success by several points, and its limitations state the cost: scripted people cannot change their minds or answer a different question from the one asked. In return it gains a channel this topic lacked, a log of which key facts each agent extracted. That log shows leading models obtaining 72-85% of the facts and still delivering only 0.60-0.70 of the reference uplift. Its online platform, where people face the same scripted stakeholders under the same grader, could test the scripts indirectly: if human experts extract facts at rates similar to agents', the scripts are at least not unusually easy or hard to question (reader suggestion).

BizBench gives a first measurement for this topic's question about the simulator's own backbone. With Qwen3.8-27B as the agent, swapping among four simulator models moves strict success between 30.7% and 36.0%, at most 3.3 points from the default. It keeps a language model in the role FDE-Gym scripted away, but constrains it by protocol: the customer answers factual questions first, performs one write or wait at a time, and its approval binds to the request's current terms, so changed terms need a new approval. The protocol is not cosmetic, since the original prompt let the simulator batch approvals or keep using tools on 4 of 50 tasks. Its information ablation also prices what the simulated customer withholds: putting all customer facts in the opening request lifts strict success from 43.3% to 70.0%. The default simulator, DeepSeek-V4.1-Flash, is also an evaluated agent, so some runs pair a model with a copy of itself, the case this topic's self-preference question asks about (reader observation).

# Open Questions

* How much does the persona-agent's own backbone model change measured outcomes, independent of the assigned persona?
* When the persona-agent model shares a backbone with the system under test, how can self-preference be separated from genuine quality signal?
* Does adherence to a declared persona trait in a single trajectory imply broader behavioral realism (disclosure, correction, refusal, abandonment)?
* What validation against real interaction logs is sufficient before a simulated-user result is used for a consequential product decision?
* When a simulator's key decisions are scripted (Proactivity-Gym's approval state machine) and only its wording comes from an LLM, which user behaviors are lost, such as gradually changing delegation preferences or inconsistent feedback, and does an agent tuned against scripted users transfer to real ones?
* FDE-Gym prices each stakeholder message at a hidden per-person rate that rises when the agent exceeds a patience limit. Can such prices be calibrated against real stakeholder time, and does an agent that learns to ask scripted stakeholders less also ask people better questions?
* BizBench measures simulator sensitivity for one mid-ranked agent (Qwen3.8-27B). Is the spread across simulator models larger for agents near the top, where a few tasks decide the ranking, and does a simulator from the agent's own model family make elicitation easier?
