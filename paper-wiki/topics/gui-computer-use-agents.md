---
type: Topic
title: GUI and computer-use agents
description: Papers about agents that perceive screen state and operate GUIs, desktops, or native applications directly, including training pipelines, demonstration-guided execution, and computer-use benchmarks.
tags:
- gui-agents
- computer-use-agents
- desktop-automation
- in-context-demonstration-learning
timestamp: 2026-08-20T00:00:00Z
---

# Scope

This topic tracks agents that act directly on graphical interfaces — desktops, native applications, and browsers — by perceiving screenshots and emitting GUI-level actions (clicks, keystrokes, drags), as distinct from agents that act through text-only tool calls or APIs. It covers training data/pipelines for such agents, mechanisms for conditioning execution on demonstrations or other in-context guidance, and benchmarks that evaluate long-horizon or cross-application GUI workflows.

# Papers

* [UI-Mate](../papers/2608.15930.md) - an open-weight foundation GUI agent combining a closed-loop environment-grounded training pipeline with DemoCUA, which converts multimodal demonstrations into adaptive subtask-level workflows rather than rigid replay; introduces OSWorkerBench, a 100-task long-horizon office benchmark with a controlled paired protocol for isolating demonstration value from instruction-only capability.
* [MAI-UI](../papers/2512.22047.md) - a 2B-235B foundation GUI agent family adding native agent-user-interaction (`ask_user`) and MCP-tool-use (`mcp_call`) actions, a device-cloud collaboration system with a trajectory monitor and privacy gate, and large-scale online RL (up to 512 parallel environments); new SOTA on five grounding benchmarks and AndroidWorld (76.7%).

# Synthesis

UI-Mate and MAI-UI both target the gap between static-trajectory training and real-world deployment robustness, but through different levers: UI-Mate injects procedural structure at inference time via demonstrations, while MAI-UI extends the action space itself (clarification, tool calls) and pairs that with a deployment-time architecture (device-cloud routing) rather than a demonstration mechanism. Both introduce their own realistic benchmark (OSWorkerBench, MobileWorld) specifically because existing GUI benchmarks under-test the capability each paper adds.

# Open Questions

* How should a demonstration-guided GUI agent transfer procedural structure across related-but-non-identical tasks (the variant-demo problem), rather than only replaying guidance from the same task?
* Can demonstrations be acquired at scale from passive sources (documentation, instructional video) rather than per-task recording, without losing the grounding that makes a recorded demonstration useful?
* How should training-data pipelines detect and rebalance systematic coverage gaps (long-horizon, cross-application, error-recovery tasks) that are expensive to generate relative to short single-application tasks?
* What is the right balance between deterministic milestone verification and learned judges for progress-based reward credit in long-horizon GUI tasks?
* How should a GUI agent's action space and context representation avoid invalidating KV-cache reuse as task state (e.g. a demonstration workflow pointer) updates mid-episode?
* How should a device-cloud collaboration system's deviation-detection threshold trade off false handoffs (cost/latency) against missed handoffs (task failure), and does that tradeoff transfer across the demonstration-guided and native-action-space approaches to real-world robustness in this topic?
