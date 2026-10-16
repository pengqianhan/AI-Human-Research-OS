---
type: Benchmark
title: Agents' Last Exam (ALE)
description: Living benchmark of long-horizon, economically valuable, real-world professional tasks with verifiable outcomes, built with 250+ industry experts across 13 industry clusters; also the source of a five-layer system view of agents (model, GUI perception, orchestration, tools, runtime).
resource: https://arxiv.org/abs/2606.05405
aliases:
- ALE
tags:
- benchmarks
- agent-benchmarks
- long-horizon-tasks
timestamp: 2026-10-16T00:00:00Z
---

# Definition

Agents' Last Exam (Sun, Han, Zhang, and others, arXiv:2606.05405, 2026) evaluates AI agents on long-horizon, economically valuable, real-world tasks whose outcomes can be verified. Its abstract describes tasks developed with more than 250 industry experts, covering non-physical industries defined with reference to the U.S. O*NET / SOC 2018 occupational taxonomy, and organized into 55 subfields in 13 industry clusters with over 1,000 tasks. Its hardest tier is far from saturated, with a 2.6% average full pass rate across mainstream harness and backbone configurations. It is designed as a living benchmark whose task pool grows. Papers here report it with a partial (mean task) score and a binary full-credit accuracy, on named subsets such as the 67-task Near-term set. OpenGCUA also credits it with a system-level view that splits an agent into five layers: the model (Brain), GUI perception (Eyes), orchestration (Body), tools (Hands), and a runtime (Feet).

# Papers

* [OpenGCUA](../papers/2610.22200.md) - adopts ALE's five-layer system view and refines it: a generalist computer-use agent is defined by three decisions its model makes each step (what to observe, how to act, how to organize), because having all five layers does not mean choosing well between GUI and programmatic actions. OpenGCUA does not evaluate on ALE.
* [RSIAgent](../papers/2609.15364.md) - evaluates on ALE Near-term (all 67 tasks): frozen autonomously built memory raises partial score from 83.75 to 84.82 and binary accuracy from 49.25 to 50.75, against 82.26 for GPT-6 Astra taken from official reports.
* [CompoWorld](../papers/2609.33665.md) - one of eight evaluation benchmarks, run in Claude Code; compositional environment scaling adds 5.82 points over the backbone.
* [MiMo-V2.6](../papers/2610.11959.md) - one of its agentic benchmarks; MiMo-V2.6-Pro ties the best frontier figure at 31.6.
* [RecreationWorld](../papers/2609.22000.md) - cited, with EdgeBench, as another line of long-horizon verifiable-task evaluation.

# Notes

The scores above are not comparable with each other: RSIAgent reports the 67-task Near-term subset, MiMo-V2.6's subset is not identified in its note, and the harnesses differ (RSIAgent's own memory-augmented agent, Claude Code for CompoWorld). The 2.6% average in the abstract refers to the hardest tier.

# Related

* [Agent benchmarks and evaluation](../topics/agent-benchmarks.md)
* [GUI and computer-use agents](../topics/gui-computer-use-agents.md)
* [GDPVal](gdpval.md) - another benchmark of economically valuable professional work, graded by expert rubrics rather than verifiable outcomes.
* [JobBench](jobbench.md) - end-to-end professional job tasks judged against weighted rubrics.
