---
type: Topic
title: Agentic robot manipulation
description: Papers about LLM, VLM, and coding agents that solve robot manipulation tasks by writing control programs, orchestrating frozen policies through a harness, or generating demonstrations that train robot policies.
tags:
- robot-manipulation
- coding-agents
- vision-language-action
- embodied-harness
timestamp: 2026-09-29T00:00:00Z
---

# Scope

This topic covers papers where a language-model agent, not only a learned visuomotor policy, does the work of robot manipulation. The agent may act as a *programmer* that writes control code against a simulator or a robot API, as a *planner behind a harness* that calls a frozen VLA or low-level controller through a fixed interface, or as a *teacher* whose verified solutions become demonstrations for training a policy. Papers about the base navigation policy itself belong in [Embodied navigation](embodied-navigation.md). Papers about the software layer around a model in general belong in [Agent harness engineering](agent-harness-engineering.md); embodied harnesses are listed here too when manipulation is the task.

# Papers

* [Zetta](../papers/2608.16590.md) - keeps the VLA frozen and evolves code-based runtime critics and recovery skills online through three timescale-separated loops, with gains on LIBERO-Pro and RoboCasa.
* [Harness VLA](../papers/2607.08448.md) - an LLM coding agent (Claude Code or Codex) plans over a frozen VLA exposed as a tool, with a one-time bootstrapping phase that writes a per-task memory, reaching 82.4% on LIBERO-Pro.
* [Show-Harness](../papers/2609.10522.md) - a frozen or LoRA-adapted VLM acts through nine view-relative semantic action units that a deterministic per-embodiment interpreter grounds, on real Franka and AgileX arms.
* [EmbodiedSWE](../papers/2609.27308.md) - coding agents write full `solve(env)` programs for 28 long-horizon, contact-rich simulated tasks (11%-82% solved across six frontier models), and one verified solution is diversified into many demonstrations that train a VLA, including a sim-only policy that completes a real lamp-disassembly task.
* [Self-Evolving Coding Agents (HexaAnything)](../papers/2609.35432.md) - a coding agent keeps task state as an executable world program and calls a frozen XR-1 VLA as one tool, gated by a typed verifier that ignores the VLA's stop signal; RoboCasa365 Composite-Unseen rises from 34.3% to 38.3%, a Qwen3.8-27B planner fine-tuned on the harness's verified traces reaches 39.5%, and agent-revised tools raise three RoboDojo tasks to 80-100%.

# Synthesis

The four papers split on *when* the agent's reasoning is spent. Zetta, Harness VLA, and Show-Harness put the agent in the loop at deployment time: the policy or VLM stays fixed and the agent (or its evolved critics) decides, retries, and recovers during execution. EmbodiedSWE spends agent effort offline instead: the coding agent solves the task once with full simulator state, and that solution is turned into training data, so the deployed VLA runs without an agent. The trade-off is visible in their evidence. The deployment-time harnesses report perturbation robustness and task/embodiment generalization on tabletop manipulation, while EmbodiedSWE reaches much longer horizons (up to half an hour) but needs privileged state to solve them and reports low absolute held-out VLA scores (0.233 mean rubric). All four rely on a fixed interface between the language model and the robot (a VLA tool call, a semantic action vocabulary, or a simulator API), and none trains the language model with reinforcement learning on robot-task outcomes except EmbodiedSWE's preliminary coding-agent RL, which lacks a held-out evaluation (Show-Harness adapts small VLMs from demonstrations instead).

HexaAnything sits between the two camps. Like Zetta and Harness VLA, it puts the agent in the loop at deployment time around a frozen VLA, and like Zetta it refuses to take the VLA's own stop signal as success. But it also feeds verified traces back into training, as EmbodiedSWE does; the difference is *what* gets trained. EmbodiedSWE trains the VLA from agent-generated demonstrations, while HexaAnything fine-tunes the *planner* (HexaModel v0.1, an open 27B model) on the harness's own traces, by SFT rather than RL. Its verifier works only from images, proprioception, and tool outputs, in contrast with Zetta's fallback to privileged simulator signals and EmbodiedSWE's full-state solvers. Its measured gains are modest (4.0 points on Composite-Unseen with one VLA on one benchmark, and 1.6 points overall over Codex driving the same VLA), so the case for an executable world program rests more on the per-task case studies than on the aggregate numbers.

# Open Questions

* On the same tasks, is agent effort better spent at deployment (planning over a frozen VLA) or offline (generating demonstrations to fine-tune the VLA)? No paper here compares the two directly. HexaAnything adds a third option, distilling harness traces into the planner, which also has not been compared with the other two.
* EmbodiedSWE's solvers use full simulator state. Can a coding agent that sees only rendered frames, as the deployment-time harnesses do, still solve long-horizon contact tasks?
* Reward hacking is frequent when a coding agent can touch the simulator (up to 43% of runs in EmbodiedSWE). Do deployment-time harnesses that call a real robot face an equivalent risk, such as false-success reports, and how should it be measured?
* Do fixed action vocabularies (Show-Harness) and fixed VLA tool interfaces (Harness VLA) limit which tasks can be solved compared with free-form control code (EmbodiedSWE)?
