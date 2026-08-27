---
type: Topic
title: Autonomous research
description: Papers about AI systems that autonomously generate, test, and refine research hypotheses or artifacts over long horizons.
tags:
- autonomous-research
- autonomous-optimization
- hypothesis-refinement
timestamp: 2026-08-28T00:00:00Z
---

# Scope

This topic tracks systems that turn research objectives into iterative, agent-run loops of hypothesis generation, experiment execution, evidence interpretation, and artifact improvement.

# Papers

* [Arbor](../papers/2606.11926.md) - persistent hypothesis-tree refinement for long-horizon autonomous optimization of research artifacts.
* [ScientistOne](../papers/2605.26340.md) - end-to-end autonomous research with claim provenance and cross-artifact integrity checks.
* [Spark-to-Paper](../papers/2608.11924.md) - end-to-end research paper generation as thirteen coding-assistant skills, with experiment planning separated from reporting and a bounded Self-Refutation Loop for unresolved hypotheses.
* [ARIS](../papers/2605.03042.md) - a research harness built on the stringent assumption that any single-agent long-horizon task is unreliable, pairing a cross-family executor/reviewer with a three-stage evidence-to-claim audit cascade and a rejected-idea-preserving research wiki.
* [AutoResearchClaw](../papers/2605.20025.md) - a 23-stage multi-agent pipeline combining two-stage role-differentiated debate, a self-healing Pivot/Refine executor, a verified-registry-plus-citation-pipeline anti-fabrication gate, seven human-in-the-loop intervention modes, and a time-decayed cross-run lesson store, reporting a 54.7% margin over AI Scientist v2 on a new 25-topic benchmark.
* [ASI-Bench](../papers/2608.17271.md) - a 60-task, 11-domain benchmark measuring exactly this topic's central concern from the outside: it progressively withdraws human methodological guidance (B1 full method to B4 goal-only-plus-distractors) within the same matched project instance, finding average performance collapses from 50.91 to 26.62 and that operationalizing a named method into an executable workflow, not selecting the method, is the dominant bottleneck.

# Synthesis

Arbor and ScientistOne both make durable evidence part of the control loop, but at different levels. Arbor attaches results and insights to a hypothesis tree so the system can decide what to test and merge; ScientistOne attaches evidence to paper claims so the system can decide what it may report. Spark-to-Paper adds a third variant of this same idea at the level of a single paper trajectory: it preregisters required evidence before running experiments, classifies claims by support level after, and names and bounds the failure mode where repeated experiment-critique-revision cycles never resolve the original hypothesis (the Self-Refutation Loop). ARIS generalizes the single-agent assumption underlying all three: rather than trusting one agent's self-critique, it makes cross-model adversarial review the default mechanism for catching "plausible unsupported success," and adds a persistent wiki that explicitly retains rejected ideas so future sessions don't re-explore dead ends. AutoResearchClaw adds a fifth variant that generalizes the evidence-gating idea across an entire pipeline rather than one artifact type: a deterministic verified registry (numeric claims must trace to an actually-executed measurement, not a model's account of one) and a four-layer citation-verification pipeline gate the drafting stage directly, while a same-family (rather than ARIS's cross-family) three-role debate panel does the disconfirmation work at two separate stages, and a persistent, severity-scored, time-decayed lesson store carries failures forward across runs rather than within a single wiki. Its own component ablation offers rare direct evidence for a question this topic can otherwise only pose: removing its verification gate alone raises apparent acceptance rate while a manual audit finds fabricated numbers in the newly "accepted" outputs, confirming that gate is catching real fabrication rather than only adding friction. Together they suggest that autonomous research needs decision provenance during exploration, claim provenance during communication, an explicit exit condition when the evidence keeps rejecting the premise, a structural reason to distrust any single model's own account of its progress, and — per AutoResearchClaw's HITL ablation — that human oversight should concentrate at a small number of high-leverage decision points rather than scale with how much of the pipeline runs autonomously. ASI-Bench supplies this topic's system-building papers with an external, graded yardstick for the very capability they build toward: its B1→B4 guidance gradient shows the collapse is concentrated at the step where a method must be turned into a working procedure (a 21.82-point drop) rather than at method selection itself (a further 2.48 points) — a decomposition none of Arbor's, ScientistOne's, ARIS's, or AutoResearchClaw's own evaluations currently reports, since each measures end-task success or claim integrity rather than isolating which stage of guidance withdrawal a system's capability actually depends on.

# Open Questions

* What state representation best captures hypotheses, failed attempts, evidence, and accepted artifacts over long runs?
* How should autonomous systems separate exploratory feedback from verified research claims?
* Which research domains can be evaluated with executable metrics, and which need richer human or formal review?
* What is the right human oversight point: ideation, execution, merge/admission, or final reporting?
* How should hypothesis-level evidence be transformed into claim-level evidence without losing provenance during writing?
* Does cross-model (vs. same-model) review measurably reduce unsupported claims, and does the answer depend on task difficulty or model-family choice rather than on cross-family review per se?
* AutoResearchClaw's HITL ablation finds more intervention does not monotonically improve quality (Step-by-Step underperforms CoPilot despite far more interventions) — does this hold outside its own ARC-Bench topics, and how should a system decide which few checkpoints are actually high-leverage for a given research domain?
* ASI-Bench's main results explicitly exclude external tool access — how much of its steep B1→B2 operationalization gap would close with tool access, and would that change which of this topic's systems (Arbor's hypothesis tree, ScientistOne's claim provenance, ARIS's cross-family review) contributes most to closing it?
