---
type: Topic
title: Proactive agents
description: Papers about LLM agents that act on a user's needs without an explicit request, and about deciding what to do, when to compute and present it, and how far to proceed without approval.
tags:
- proactive-agents
- mixed-initiative
- intervention-depth
- sleep-time-compute
- user-trust
timestamp: 2026-10-13T00:00:00Z
---

# Scope

This topic tracks agents that take initiative: anticipating needs the user has not stated, preparing work in idle or sleep time, and deciding whether to only prepare, suggest for review, or execute. It covers principles and design spaces for such agents, the user and environment modeling they need, and benchmarks that score the consequences of proactive actions over time (relevance, timing, compute allocation, and user trust) rather than how well one explicit request is fulfilled. Agents that manage their own context window ("proactive context management") belong in [Context engineering](context-engineering.md) instead; the user-facing initiative is what puts a paper here.

# Papers

* [Foundations of Proactive Agents](../papers/2609.37267.md) - proposes three jointly required objectives (task capability, temporal allocation of compute between interaction and sleep time, and trust measured through intervention depth), a five-dimension design space, and Proactivity-Gym, a multi-day simulated testbed; across 23 model-harness configurations the best agent defers competing work correctly in about half of the decision windows and others in under a fifth, and a 30-person study finds one misaligned intervention costs more trust than an aligned one restores.
* [ExpActivator](../papers/2609.33304.md) - for personal mobile agents, decides whether to suggest a routine with an explicit rule before the language model is called: a routine fires only with at least 12 past occurrences, 4 of them in the current scenario, and enough time-of-day-weighted support, and otherwise the agent abstains; on 315 AndroidIntent states (68% positive) it reaches MCC 39-45 against 14-22 for the best baseline with a 21-37% false-alarm rate, and argues F1 cannot evaluate proactivity when always suggesting scores 81.1.

# Synthesis

The two papers here work at different scales of the same question. Proactivity-Gym scores agents over simulated days on what to do, when to spend compute, and how deep to intervene, and finds trust is lost faster than it is regained. ExpActivator isolates the smallest piece, whether to speak at all at a given time and place, and shows that small models given a user's raw history nearly always speak (false-alarm rates of 70-100% for most baselines), which by Proactivity-Gym's trust result is the costly direction to err in. ExpActivator's fix is to take the decision away from the model and give it to a support rule; its own ablations suggest most of the benefit comes from having an explicit gate at all (reader inference). The two also agree that evaluation can hide the failure: F1 rewards speaking when most states are positive, and Proactivity-Gym found judged trust tracking task capability instead of intervention fit.

# Open Questions

* How should an agent estimate a user's preferred intervention depth per task from sparse feedback, and how quickly should it lower its autonomy after a mistake, given that people lose trust faster than they regain it?
* Can temporal allocation be measured against real compute budgets and task durations rather than scripted conflicts, and does training on such signals teach agents to defer explicitly?
* Do LLM judges systematically discount intervention-depth misalignment when rating trust, as indirect evidence suggests, and what evaluation protocol would test that on the same trajectories humans rate?
* How do proactive behaviors measured on simulated multi-day scenarios carry over to real users over weeks, where needs, trust, and tolerance for interruptions drift?
* ExpActivator's gate is a fixed rule over time of day and scenario with constants set once for all users. Can the thresholds be learned per user from accepted and dismissed suggestions, and does a rule tuned for few false alarms on single states stay calibrated over the multi-day sequences Proactivity-Gym simulates?
