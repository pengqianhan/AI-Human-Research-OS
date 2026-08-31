---
type: Topic
title: Agent environments
description: Papers about the environments, permissions, artifacts, budgets, and interfaces that shape agent behavior.
tags:
- agent-environments
- environment-engineering
- agent-reliability
timestamp: 2026-07-18T22:59:11Z
---

# Scope

This topic tracks papers where the main design object is not only the agent policy or workflow, but the surrounding environment that grants affordances, constrains failure modes, records artifacts, manages resources, and enables supervision.

# Papers

* [EurekAgent](../papers/2606.13662.md) - environment engineering for metric-driven autonomous scientific discovery with CLI agents.
* [Harness Handbook](../papers/2607.13285.md) - behavior-centric mapping from harness behavior to distributed implementation sites for safer modification planning.
* [AI Agents Do Not Fail Alone](../papers/2607.14275.md) - context-quality measurement for the instructions, tools, grounding, memory, policies, and trust boundaries that condition agent behavior.
* [ScientistOne](../papers/2605.26340.md) - evidence-bearing artifacts, canonical evaluators, and claim verification as controls on autonomous research outputs.
* [EnvHarness](../papers/2608.19880.md) - a composable plug-in layer that reshapes a static environment's initial state, interaction rules, or task composition through its own interface, plus EnvRigger, an automated designer that diagnoses a target policy's trajectories to synthesize new components while preserving the original verifier.
* [VibeWorlding](../papers/2608.15265.md) - a from-scratch sandbox (VibeWorlding-Gym) exposing five 3D-world-editing tools as MCP tools, paired with a dual-constraint verifier (deterministic physical-feasibility geometry checks gating an MLLM rubric judge) that is reused directly as the RL reward function, not only as a post-hoc evaluator.
* [UrbanGround](../papers/2608.27456.md) - a real-scale, georegistered urban sandbox built from official Hong Kong 3D geospatial data, purpose-built to test whether an MLLM agent's local spatial grounding composes into sustained navigation under continuous physics, dynamic pedestrians, and route invalidation.

# Synthesis

EurekAgent treats permissions, artifacts, budgets, evaluators, and interfaces as the environment that shapes autonomous research behavior. Harness Handbook addresses the maintainability of that same surrounding layer by mapping behavior to authoritative code. AI Agents Do Not Fail Alone turns the assembled instructions, tools, grounding, memory, policies, and trust boundaries into an explicit diagnostic object. ScientistOne adds an evidence boundary around the research output. EnvHarness targets a different control lever within the same environment concept: rather than adding permissions, budgets, or evidence requirements, it wraps the environment's own interface with programmable layers that can be authored automatically from a target policy's diagnosed weaknesses, turning the environment itself into a self-adapting control surface rather than a fixed backdrop. VibeWorlding adds a domain-specific instance built along a different axis than EnvHarness: rather than reshaping an *existing* environment around a frozen target policy via a diagnose-write-validate loop, VibeWorlding-Gym is engineered from scratch for one task domain (3D world construction), and its dual-constraint verifier serves double duty as both the fair-evaluation protocol and the RL reward signal that trains the policy in the first place — collapsing EnvHarness's separate diagnose/environment-modify/policy-train stages into one shared verifier object. UrbanGround is a second from-scratch sandbox in VibeWorlding's mold — built for one task domain (urban navigation) rather than reshaping an existing environment — but it is evaluation-only, with no RL reward role: its purpose-built signal (Pedestrian Network Adherence) is exactly the kind of locally-scored proxy this topic's environments must guard against, since UrbanGround's own headline finding is that agents can hold that proxy high while the global property it was meant to track (route-adaptive, collision-free progress) collapses. Together these environments frame agent environments as a control surface, a maintainable software artifact, a measurable preflight condition, a source of provenance for downstream claims, an artifact that can be reshaped in response to the specific agent it trains or evaluates, a purpose-built sandbox whose own verifier is the training signal, and — with UrbanGround — a purpose-built sandbox whose local compliance metric can mislead exactly when global task success is what matters.

# Open Questions

* Which environment controls prevent reward hacking without blocking useful exploration?
* What artifact formats make long-running agent work inspectable and resumable?
* How much human supervision should be built into the environment rather than handled through ad hoc prompts?
* How can user-visible environment behavior remain traceable to authoritative code and regression checks as the harness evolves?
* Which provenance records should the environment emit during execution so later paper writing does not have to reconstruct evidence?
* Which environment properties should be checked before a run, and which can only be validated through observed behavior?
