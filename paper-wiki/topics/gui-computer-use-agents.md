---
type: Topic
title: GUI and computer-use agents
description: Papers about agents that perceive screen state and operate GUIs, desktops, or native applications directly, including training pipelines, demonstration-guided execution, and computer-use benchmarks.
tags:
- gui-agents
- computer-use-agents
- desktop-automation
- in-context-demonstration-learning
timestamp: 2026-09-24T00:00:00Z
---

# Scope

This topic tracks agents that act directly on graphical interfaces — desktops, native applications, and browsers — by perceiving screenshots and emitting GUI-level actions (clicks, keystrokes, drags), as distinct from agents that act through text-only tool calls or APIs. It covers training data/pipelines for such agents, mechanisms for conditioning execution on demonstrations or other in-context guidance, and benchmarks that evaluate long-horizon or cross-application GUI workflows.

# Papers

* [UI-Mate](../papers/2608.15930.md) - an open-weight foundation GUI agent combining a closed-loop environment-grounded training pipeline with DemoCUA, which converts multimodal demonstrations into adaptive subtask-level workflows rather than rigid replay; introduces OSWorkerBench, a 100-task long-horizon office benchmark with a controlled paired protocol for isolating demonstration value from instruction-only capability.
* [MAI-UI](../papers/2512.22047.md) - a 2B-235B foundation GUI agent family adding native agent-user-interaction (`ask_user`) and MCP-tool-use (`mcp_call`) actions, a device-cloud collaboration system with a trajectory monitor and privacy gate, and large-scale online RL (up to 512 parallel environments); new SOTA on five grounding benchmarks and AndroidWorld (76.7%).
* [RecreationWorld](../papers/2609.22000.md) - a five-platform (Ubuntu, macOS, Windows, Android, Web) framework built around application recreation: given a running reference and no prescribed workflow, an agent must interleave GUI exploration, coding, and execution-grounded self-verification to build a faithful implementation, scored by reference-validated hidden programmatic and visual test suites; training on 35,000 rejection-sampled recreation trajectories transfers to five out-of-distribution benchmarks (up to +17.9 points), while on the released 250-task RecreationBench the strongest model passes all programmatic tests on only 2.8% of tasks.
* [GameHorizon Suite](../papers/2609.25001.md) - evaluates models on AAA video games in the same raw keyboard-mouse action space as desktop computer use; both GUI agents tested (GELab-Zero-4B-Preview, UI-TARS-1.5-7B) fall into its lowest tier, and UI-TARS-1.5-7B scores 3.7 points below its own general-purpose base (Qwen2.5-VL-7B), suggesting GUI post-training can reduce transfer to other screen-and-control domains.

# Synthesis

UI-Mate and MAI-UI both target the gap between static-trajectory training and real-world deployment robustness, but through different levers: UI-Mate injects procedural structure at inference time via demonstrations, while MAI-UI extends the action space itself (clarification, tool calls) and pairs that with a deployment-time architecture (device-cloud routing) rather than a demonstration mechanism. Both introduce their own realistic benchmark (OSWorkerBench, MobileWorld) specifically because existing GUI benchmarks under-test the capability each paper adds. RecreationWorld answers a different question than either: not how to make a GUI agent robust to deployment variation, but whether an agent can autonomously fuse GUI operation with code authorship into one coordinated loop when the specification itself must be discovered by operating a reference rather than read from an instruction. Where UI-Mate's demonstrations and MAI-UI's `ask_user`/`mcp_call` actions both still start from a given task instruction, RecreationWorld's recreation task removes the instruction's specificity entirely — the agent must reverse-engineer *what* to build before it can decide *how* — making its own benchmark (RecreationBench) a test of specification-recovery-plus-implementation-plus-verification jointly, rather than execution robustness against a known goal. Its own trajectory analysis gives this topic's first evidence that even the strongest model (GPT-6 Astra, 58.1% overall) reproduces an interface's static structure far more reliably than its interactions and computed outputs, and that GUI activity does not fall off as implementation activity rises — a hybrid-workflow signature neither UI-Mate's nor MAI-UI's own analyses directly measure.

# Open Questions

* How should a demonstration-guided GUI agent transfer procedural structure across related-but-non-identical tasks (the variant-demo problem), rather than only replaying guidance from the same task?
* Can demonstrations be acquired at scale from passive sources (documentation, instructional video) rather than per-task recording, without losing the grounding that makes a recorded demonstration useful?
* How should training-data pipelines detect and rebalance systematic coverage gaps (long-horizon, cross-application, error-recovery tasks) that are expensive to generate relative to short single-application tasks?
* What is the right balance between deterministic milestone verification and learned judges for progress-based reward credit in long-horizon GUI tasks?
* How should a GUI agent's action space and context representation avoid invalidating KV-cache reuse as task state (e.g. a demonstration workflow pointer) updates mid-episode?
* How should a device-cloud collaboration system's deviation-detection threshold trade off false handoffs (cost/latency) against missed handoffs (task failure), and does that tradeoff transfer across the demonstration-guided and native-action-space approaches to real-world robustness in this topic?
* RecreationWorld finds recreated applications are typically far smaller and more structurally concentrated than their references (median 16.9% of reference LOC) yet the highest-scoring model has the *lowest* median code volume — what implementation choices, beyond raw code volume, actually explain higher behavioral fidelity, and would UI-Mate's demonstration-guided procedural structure or MAI-UI's expanded action space change that relationship if applied to recreation-style tasks?
