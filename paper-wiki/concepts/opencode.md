---
type: Tool
title: OpenCode
description: Open-source coding-agent harness with a terminal CLI and a non-interactive run mode; papers in this wiki use it as a vendor-neutral fixed harness for building or running agents and as a baseline in same-backbone harness comparisons.
resource: https://github.com/anomalyco/opencode
tags:
- coding-agents
- agent-harness-engineering
- agent-harness
timestamp: 2026-10-15T00:00:00Z
---

# Definition

OpenCode (OpenCode Contributors, 2025) is an open-source coding-agent framework run from the terminal. Its non-interactive entry point, `opencode run`, advances a session by one turn per call and resumes it with `--continue`; the session compacts its history automatically as it nears the context limit. It is not developed by a model vendor, which is why benchmark authors pick it when they want one harness for models from many families. The repository URL above is the one Doc2Harness cites.

# Papers

* [Doc2Harness](../papers/2610.20344.md) - the fixed builder harness for every build (1.17.0, one compiled executable): `opencode run` resumed with `--continue` for up to 24 turns, compaction at 80% of the context window, chosen over Claude Code and Codex CLI to avoid a home advantage for their vendors' models. OpenCode is also one of the twelve harnesses whose documentation forms the specification, and 5,438 of its public issues were mined for test cases.
* [Learn2Play Bench](../papers/2610.08215.md) - the common harness for nine backbones; on the same backbone Claude Code lifts Claude Opus 5 from Max 74.5 to 81.8 and Codex lifts GPT-5.6-SOL from 57.0 to 74.3 over OpenCode, while OpenCode itself beats six per-action self-evolving methods at lower token cost.
* [Harness²](../papers/2610.14224.md) - one of two executor harnesses (with Codex) for Gemini 3.5 Flash and GLM-5; the editor, composer, reflector, and selector also run as Claude Opus 4.8 under OpenCode.
* [JIT-Agent](../papers/2608.25593.md) - one of five fixed real-system harness baselines (with Claude Code, Codex, Hermes, and NanoBot) under the same backbone; OpenCode scores 75.9 on DeepSearchQA, 65.0 on xBench-DS, and 48.1 on AgentIF.
* [SoL-Pi](../papers/2609.20519.md) - one of four third-party comparison harnesses run under GPT-5.6 Sol on EdgeBench.
* [AgentSWE](../papers/2610.13361.md) - one of the coding harnesses paired with builder models in its harness-model comparison runs.

# Notes

Two of these papers point the same way from different tasks: OpenCode trails vendor harnesses on the same backbone (Learn2Play Bench), and Doc2Harness chose it precisely because it is not tuned alongside any one vendor's models. Whether it is neutral across model families, rather than equally unfavorable to all of them, has not been tested in the papers here.

# Related

* [Agent harness engineering](../topics/agent-harness-engineering.md)
* [mini-swe-agent](mini-swe-agent.md) - the other open, model-neutral harness papers here use as a fixed scaffold, much smaller and bash-only.
