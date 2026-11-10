---
type: Topic
title: Research ideation
description: Papers about turning literature evidence, unresolved bottlenecks, and prior-art checks into defensible research proposals.
tags:
- research-ideation
- literature-grounding
- novelty-assessment
- scientific-agents
timestamp: 2026-11-10T00:00:00Z
---

# Scope

This topic tracks methods and systems for the pre-experimental stage of research: grounding a direction in literature, identifying a structural bottleneck, constructing a differentiated candidate, checking prior-art collision, and exposing falsification and feasibility risks before implementation.

# Papers

* [ResearchStudio-Idea](../papers/2607.04439.md) - induces failure-aware ideation patterns from ML conference outcomes and operationalizes literature search, pattern-guided generation, prior-art checking, and audit as a three-skill suite.
* [Sage-Taiyi](../papers/2611.12762.md) - an ideation harness with an explicit meta level: a Cognitive State records what the search has established and which premises ideas share, and a monitoring and control loop picks targets and one of ten methodological heuristics; first on all eight metrics of the authors' Taiyi-Bench (53.95 Overall against 47.85 for AI Scientist-v2), with no ablation of the meta level.

# Synthesis

With two papers the topic has two ways of supplying ideation methods. ResearchStudio-Idea induces failure-aware patterns from ML conference outcomes and applies them through literature search, generation, and prior-art audit, stopping before experiments. Sage-Taiyi starts from cognitive science: ten methodological heuristics and a set of reasoning operators, chosen at each step by a control process that reads an explicit record of what the search has established, including which untested premises several ideas share. Sage-Taiyi reports large benchmark margins, but on a benchmark its authors built, scored by an LLM verifier, and without removing the meta level to see what it contributes; its five collaborations show proposals reaching experiments with experts choosing the route. Neither paper compares against the other, though Sage-Taiyi cites ResearchStudio-Idea (reader comparison).

# Open Questions

* Which idea-stage metrics predict implementation success, expert preference, or eventual scientific impact?
* How should research-ideation systems represent negative evidence, prior-art uncertainty, and reasons to abstain?
* Do ideation patterns induced from mainstream ML conferences transfer to systems, benchmarks, other scientific fields, or non-paper research artifacts?
* Where should human judgment enter: problem selection, bottleneck confirmation, novelty review, feasibility commitments, or experiment design?
* Sage-Taiyi's largest margin is on Novelty, scored by an LLM verifier on the authors' own benchmark. Do rediscovery metrics, which check proposals against decisions real studies made, rank ideation systems the same way as judged novelty, and which predicts expert preference?
* ResearchStudio-Idea induces its ideation patterns from conference outcomes; Sage-Taiyi derives its heuristics from cognitive science and specializes them per domain. On the same tasks, which kind of method library transfers better to fields outside the one it was built from?
