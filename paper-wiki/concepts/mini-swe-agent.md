---
type: Tool
title: mini-swe-agent
description: Minimal coding-agent harness from the SWE-agent line that acts through a Bash interface; used in this wiki's papers as a neutral scaffold for benchmark runs, a shared baseline harness, a held-out transfer harness, and a skeleton to build on.
tags:
- coding-agents
- agent-harness-engineering
- agent-harness
timestamp: 2026-10-15T00:00:00Z
---

# Definition

mini-swe-agent is a minimal agent harness associated with the SWE-agent project; Doc2Harness cites it through the SWE-agent paper (Yang et al., NeurIPS 2024). The papers in this wiki describe it as a minimal agent loop in which the model acts through a Bash interface. That minimalism is why it is used where the harness should contribute as little as possible: as the scaffold for reference benchmark runs, as the common backbone when comparing context-management methods, and as a starting skeleton.

# Papers

* [Doc2Harness](../papers/2610.20344.md) - stripped down to five Python files of about seventy lines, plus an install script, an entry script, and a project config, to form the interface-only contract skeleton from which build models write complete harnesses.
* [Context Language Models](../papers/2609.37725.md) - the minimal harness (with a Bash interface) shared by every zero-shot comparison, mostly at a 32K context limit, and a baseline in its ContextBench pilot.
* [MiMo-V2.6](../papers/2610.11959.md) - one of three held-out harnesses (with codex and claude code) on which DeepSWE Pass@1 is tracked during multi-harness RL.
* [ProgramGym](../papers/2610.13395.md) - ProgramBench's release-time flagship rows, which ProgramGym copies, were run under mini-SWE-agent, so they are not directly comparable with ProgramGym's Claude Code runs.
* [LLM-as-a-Verifier](../papers/2607.05391.md) - the scaffold for its SWE-Bench Verified experiments, with a heterogeneous pool of three candidate trajectories.
* [ZGCM-1](../papers/2609.13356.md) - mini-SWE-agent v2 at 250 steps for its SWE-bench Verified Mini50 diagnostic.

# Notes

Version matters: ZGCM-1 names v2, and the other papers do not state a version. Scores obtained under mini-swe-agent and under a production harness such as Claude Code differ by harness as well as model, a point ProgramGym's comparison makes explicit.

# Related

* [Agent harness engineering](../topics/agent-harness-engineering.md)
* [OpenCode](opencode.md) - a larger open harness used the same way, as a fixed, vendor-neutral setting.
* [SWE-bench Verified](swe-bench-verified.md) - the benchmark most often run under mini-swe-agent in these papers.
