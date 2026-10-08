---
type: Topic
title: Game development agents
description: Papers about coding agents that build playable games and improve them across rounds through playtesting, review, and version retention, and about benchmarks that score agent-built games.
tags:
- game-development-agents
- coding-agents
- playtesting
- iterative-refinement
timestamp: 2026-10-08T00:00:00Z
---

# Scope

This topic tracks agents whose output is a game: systems that generate a game from a brief and then revise it by playing it, diagnosing problems, and deciding which version to keep, and the benchmarks that score such builds (mechanics, content, visuals, runtime requirements). Agents that *play* existing games belong in [Game-playing agents](game-agents.md). Generic self-improvement loops belong in [Agent self-evolution](agent-self-evolution.md) or [Recursive self-improvement](recursive-self-improvement.md); a paper belongs here when the game-building loop itself is the contribution.

# Papers

* [RSIGame](../papers/2609.39045.md) - a local explore-diagnose-improve loop (controller, explorer, editor, verifier over a shared checklist) under a quality monitor that keeps the best build and stops at saturation, then fine-tunes the generator on verified development traces; on all 140 GameCraft-Bench tasks in Godot and Phaser it beats Play2Code at matched budgets.
* [Recursive Game Creator](../papers/2610.08621.md) - a Designer, Builder, coding-native Player, and experience-oriented Reviewer, where the Player writes policies that play through the game's programmatic interface and the Reviewer turns trajectories, screenshots, and user preferences into revision feedback and an A/B version choice; it raises a 45-task GameCraft-Bench subset from 71.26 to 77.89 over three rounds.

# Synthesis

Both systems treat a game as an artifact improved over rounds, and both protect progress by keeping the better version instead of always accepting the latest edit: RSIGame through a quality monitor that never reads the benchmark's rubric, Recursive Game Creator through an anonymized A/B comparison by its Reviewer. They differ in what they treat as evidence. RSIGame's explorer plays along a direction the controller chose and its verifier replays the game to confirm a fix, so evidence is targeted at one issue per round. Recursive Game Creator's Player writes several policies of different skill and risk, and its Reviewer reads success rates and playtime as signs of difficulty and engagement, aiming for a suitable difficulty rather than maximum success, and records which preferences were inferred and which a user stated. The evaluations are not comparable. RSIGame runs the full benchmark in two engines with matched budgets, paired statistics, a cross-judge check, and a free-play study. Recursive Game Creator reports a 45-task subset, compares against baselines built on other models, and offers a user study without sample sizes. Neither isolates its key component (RSIGame's checklist or verifier; Recursive Game Creator's code-written Player or preference record).

# Open Questions

* Do synthetic-play proxies (policy success rates, playtime, coverage) track human enjoyment, or do they teach the builder to lengthen and complicate games? What human study design would show this with stated sample sizes and blinded version order?
* Is code-written play through a game's programmatic interface cheaper and more informative than screenshot-driven play at a matched budget, and which defects does each channel miss?
* How much of the reported gains comes from the loop rather than from extra rounds of compute or a stronger base model, when baselines are run with the same model and budget?
* Benchmark scores for agent-built games rely on model judges reading replays and screenshots. How stable are rankings across judges, and can a builder learn the judge's preferences rather than the player's?
* Do these loops scale from compact 2D and browser games to large engine projects with long progression, where one round of play cannot reach most of the content?
