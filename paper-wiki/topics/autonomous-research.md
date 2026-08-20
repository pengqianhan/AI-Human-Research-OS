---
type: Topic
title: Autonomous research
description: Papers about AI systems that autonomously generate, test, and refine research hypotheses or artifacts over long horizons.
tags:
- autonomous-research
- autonomous-optimization
- hypothesis-refinement
timestamp: 2026-08-20T00:00:00Z
---

# Scope

This topic tracks systems that turn research objectives into iterative, agent-run loops of hypothesis generation, experiment execution, evidence interpretation, and artifact improvement.

# Papers

* [Arbor](../papers/2606.11926.md) - persistent hypothesis-tree refinement for long-horizon autonomous optimization of research artifacts.
* [ScientistOne](../papers/2605.26340.md) - end-to-end autonomous research with claim provenance and cross-artifact integrity checks.
* [Spark-to-Paper](../papers/2608.11924.md) - end-to-end research paper generation as thirteen coding-assistant skills, with experiment planning separated from reporting and a bounded Self-Refutation Loop for unresolved hypotheses.
* [ARIS](../papers/2605.03042.md) - a research harness built on the stringent assumption that any single-agent long-horizon task is unreliable, pairing a cross-family executor/reviewer with a three-stage evidence-to-claim audit cascade and a rejected-idea-preserving research wiki.

# Synthesis

Arbor and ScientistOne both make durable evidence part of the control loop, but at different levels. Arbor attaches results and insights to a hypothesis tree so the system can decide what to test and merge; ScientistOne attaches evidence to paper claims so the system can decide what it may report. Spark-to-Paper adds a third variant of this same idea at the level of a single paper trajectory: it preregisters required evidence before running experiments, classifies claims by support level after, and names and bounds the failure mode where repeated experiment-critique-revision cycles never resolve the original hypothesis (the Self-Refutation Loop). ARIS generalizes the single-agent assumption underlying all three: rather than trusting one agent's self-critique, it makes cross-model adversarial review the default mechanism for catching "plausible unsupported success," and adds a persistent wiki that explicitly retains rejected ideas so future sessions don't re-explore dead ends. Together they suggest that autonomous research needs decision provenance during exploration, claim provenance during communication, an explicit exit condition when the evidence keeps rejecting the premise, and — per ARIS — a structural reason to distrust any single model's own account of its progress.

# Open Questions

* What state representation best captures hypotheses, failed attempts, evidence, and accepted artifacts over long runs?
* How should autonomous systems separate exploratory feedback from verified research claims?
* Which research domains can be evaluated with executable metrics, and which need richer human or formal review?
* What is the right human oversight point: ideation, execution, merge/admission, or final reporting?
* How should hypothesis-level evidence be transformed into claim-level evidence without losing provenance during writing?
* Does cross-model (vs. same-model) review measurably reduce unsupported claims, and does the answer depend on task difficulty or model-family choice rather than on cross-family review per se?
