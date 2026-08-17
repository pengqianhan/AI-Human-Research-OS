---
type: Topic
title: Autonomous research
description: Papers about AI systems that autonomously generate, test, and refine research hypotheses or artifacts over long horizons.
tags:
- autonomous-research
- autonomous-optimization
- hypothesis-refinement
timestamp: 2026-07-18T09:27:47Z
---

# Scope

This topic tracks systems that turn research objectives into iterative, agent-run loops of hypothesis generation, experiment execution, evidence interpretation, and artifact improvement.

# Papers

* [Arbor](../papers/2606.11926.md) - persistent hypothesis-tree refinement for long-horizon autonomous optimization of research artifacts.
* [ScientistOne](../papers/2605.26340.md) - end-to-end autonomous research with claim provenance and cross-artifact integrity checks.
* [Spark-to-Paper](../papers/2608.11924.md) - end-to-end research paper generation as thirteen coding-assistant skills, with experiment planning separated from reporting and a bounded Self-Refutation Loop for unresolved hypotheses.

# Synthesis

Arbor and ScientistOne both make durable evidence part of the control loop, but at different levels. Arbor attaches results and insights to a hypothesis tree so the system can decide what to test and merge; ScientistOne attaches evidence to paper claims so the system can decide what it may report. Spark-to-Paper adds a third variant of this same idea at the level of a single paper trajectory: it preregisters required evidence before running experiments, classifies claims by support level after, and names and bounds the failure mode where repeated experiment-critique-revision cycles never resolve the original hypothesis (the Self-Refutation Loop). Together they suggest that autonomous research needs decision provenance during exploration, claim provenance during communication, and an explicit exit condition when the evidence keeps rejecting the premise.

# Open Questions

* What state representation best captures hypotheses, failed attempts, evidence, and accepted artifacts over long runs?
* How should autonomous systems separate exploratory feedback from verified research claims?
* Which research domains can be evaluated with executable metrics, and which need richer human or formal review?
* What is the right human oversight point: ideation, execution, merge/admission, or final reporting?
* How should hypothesis-level evidence be transformed into claim-level evidence without losing provenance during writing?
