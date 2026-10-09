---
type: Benchmark
title: ScienceWorld
description: Interactive text environment at the level of an elementary-school science curriculum in which an agent runs experiments (manipulating objects, measuring, interpreting feedback) to complete task-specific goals; a common long-horizon testbed for LLM agents, skill evolution, and agent RL.
resource: https://arxiv.org/abs/2203.07540
tags:
- benchmarks
- embodied-text-environments
- long-horizon-agents
- scientific-reasoning
timestamp: 2026-10-09T00:00:00Z
---

# Definition

ScienceWorld (Wang, Jansen, Côté, and Ammanabrolu, arXiv:2203.07540, EMNLP 2022) is a text-based simulator of an elementary-school science curriculum. The agent moves between rooms, picks up and combines objects, uses instruments, and observes the results in order to complete goals such as measuring a property of an unknown material or choosing the animal with the longest or shortest lifespan. It was built to test whether models can *use* science concepts in a grounded procedure rather than only answer questions about them; the original paper reports that a 1.5-million-parameter agent trained interactively outperformed an 11-billion-parameter model trained statically on scientific question answering. Tasks are grouped into task families with many variations, and scoring gives partial progress along the way and full success when the goal is met.

# Papers

* [EviSkill](../papers/2610.05030.md) - one of three skill-evolution environments (24 task families; 96 train, 48 validation, 211 official test tasks); several evolution baselines fall below the fixed initial skill here (with GPT-5.5: 54.50-67.30 against 76.78), while EviSkill is first with five of six backbones.
* [X-Tree](../papers/2609.32993.md) - online RLVR and on-policy self-distillation testbed with 80 mined skills from 1,673 AgentTraj-L trajectories, evaluated on seen (G0), unseen-variation (G1), and unseen-task (G2) folds; at 7B the X-Tree privileged context adds +5.8 success over outcome-only RLVR.
* [From Traces to Agentic Worlds (Trace2Env)](../papers/2610.06100.md) - SciWorld is simulated rather than played: a worldbook from 30 simulator-verified Measurement gold-path trajectories (1,119 turns) lets a language world model stand in for the environment on 40 tasks; 60% of simulated action sequences succeed on real replay (consistency ratio 0.706) against 45% (0.529) for a directly prompted simulator.

# Notes

The papers use ScienceWorld for different purposes and different splits (EviSkill a sampled training set and the full official test split for an in-context skill; X-Tree generalization folds for weight training; Trace2Env 40 Measurement tasks as an environment to simulate), so their numbers are not comparable. Both find that gains from trajectory-derived knowledge are fragile here: in EviSkill, three of four evolved-skill baselines fall below the unevolved skill with GPT-5.5; in X-Tree, a random tree slightly outscores the mined tree on the unseen-task fold (26.7 against 25.6).
