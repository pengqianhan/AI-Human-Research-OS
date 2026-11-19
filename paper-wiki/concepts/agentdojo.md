---
type: Benchmark
title: AgentDojo
description: An extensible environment for evaluating prompt-injection attacks and defenses on tool-calling LLM agents, with realistic tasks such as email, e-banking, and travel booking, security test cases that pair user tasks with injection tasks, and standard attack templates.
resource: https://arxiv.org/abs/2406.13352
tags:
- benchmarks
- agent-security
- prompt-injection
- tool-use
timestamp: 2026-11-19T00:00:00Z
---

# Definition

AgentDojo (Debenedetti et al., NeurIPS 2024 Datasets and Benchmarks, arXiv:2406.13352) is an evaluation framework for agents that call tools over untrusted data. Rather than a fixed test suite, it is an extensible environment in which new agent tasks, defenses, and adaptive attacks can be added. The original release has 97 realistic tasks (for example managing an email client, navigating an e-banking site, or booking travel) and 629 security test cases, each pairing a user task with an injection task whose instruction is planted in data the agent later reads; the abstract reports that state-of-the-art LLMs fail many tasks even without attacks and that existing injections break some security properties but not all. Its suites (Banking, Slack, Travel, Workspace) and its `important_instructions` attack template are the usual reference setting for indirect prompt-injection defenses. This description follows the paper's abstract and its use in wiki papers; the AgentDojo paper itself has not been ingested.

# Papers

* [SPILLWAY](../papers/2611.07222.md) - main benchmark (suite v1.2.2, full grid, 949 attacked pairs per backbone): a typed-identity egress floor plus rule-based sanitizer holds in-scope attack success at zero on all twelve backbone-by-suite cells, with AgentDojo's checks rescored by executed effect.
* [CoworkEnv](../papers/2610.24960.md) - cites AgentDojo, with ToolEmu, as an evaluation of safety risks for coworker agents.
* [PIPETTE](../papers/2611.24362.md) - held-out evaluation for defenders trained only on AgentDyn: five static attacks on 420 pairs each (average attack success 0.48% and 0.43% on two small models), TAP and Genetic search on 40 pairs, benign utility on the 97 clean tasks.

# Notes

SPILLWAY separates three scoring levels that differ on AgentDojo: trace-level hits (a blocked call still in the transcript counts), executed-effect hits, and an in-scope level that drops content-manipulation tasks no target check can bound. Comparing defenses across papers requires knowing which level and which suite version each reports.

# Related

* [Model Context Protocol](model-context-protocol.md) - the standard tool interface through which the attack surface AgentDojo models reaches deployed agents.
