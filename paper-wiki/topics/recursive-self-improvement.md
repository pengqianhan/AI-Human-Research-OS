---
type: Topic
title: Recursive self-improvement
description: Papers about AI systems whose improvement mechanisms themselves persistently improve, and the taxonomies, metrics, and safety challenges used to assess how close a system is to genuine RSI.
tags:
- recursive-self-improvement
- ai-safety
- agent-self-evolution
timestamp: 2026-09-15T00:00:00Z
---

# Scope

This topic tracks papers that treat recursive self-improvement (RSI) — an AI system's improvement mechanism itself becoming subject to persistent, self-directed change, not just the artifact the mechanism produces — as their own explicit unit of analysis: taxonomies of autonomy levels, cross-domain progress metrics, and the safety/verification challenges specific to a system revising its own improvement process. This is distinct from [Agent self-evolution](agent-self-evolution.md), which tracks concrete diagnose-write-validate mechanisms (skills, harnesses, environments, memory) that mostly operate under a fixed, externally-set objective — most of those mechanisms sit at the lower autonomy levels this topic's papers define, rather than at the self-referential top level RSI formally requires.

# Papers

* [The Last AI Built by Humans](../papers/2609.11873.md) - defines a five-level autonomy taxonomy (improvement-execution → improvement-strategy → experience-acquisition → environment-adaptation → recursive-inheritance autonomy) and the Headroom-Closed Index, a benchmark-family-normalized progress metric applied to 393 model–benchmark observations across ten domains, then grounds three RSI-specific challenges — safe inheritance, autonomy attribution, reliable verification — in named case studies (Gödel Agent, Darwin Gödel Machine, Anthropic's automated research).

# Open Questions

* Is the Headroom-Closed Index stable under different choices of its entry-year-percentile anchor, or does it need cross-validation against an alternative progress metric before its cross-domain rankings (e.g., tool agents far behind mathematics) can be trusted quantitatively rather than only directionally?
* Which of this wiki's own [Agent self-evolution](agent-self-evolution.md) mechanisms (SkillOpt's textual-learning-rate training analogy, Recuris's structured-trace localization, AutoSaddler's typed patch taxonomy) actually cross from this topic's L2–L4 autonomy levels into genuine L5 recursive-inheritance territory — i.e., do any of them revise the *mechanism* that decides what to improve next, rather than only the artifact (skill, harness, environment) being improved?
* The paper's three challenges were each illustrated with a single case study drawn from one external source — do the same failure patterns (regression despite persistence, attribution confounds between search quality and mechanism quality, evaluator-gaming under repeated self-assessment) reproduce across a wider sample of self-evolving systems, including ones already tracked in [Agent self-evolution](agent-self-evolution.md)?
