---
type: Topic
title: Research verifiability
description: Papers about tracing scientific claims to supporting artifacts and auditing the integrity of research outputs.
tags:
- research-verifiability
- scientific-integrity
- provenance
timestamp: 2026-07-18T09:29:54Z
---

# Scope

This topic tracks systems, standards, and audits that connect scientific claims to literature, code, data, evaluator outputs, and reasoning records. It focuses on whether a research artifact can be checked against its evidence, which is distinct from whether the prose is persuasive or the headline result is competitive.

# Papers

* [ScientistOne](../papers/2605.26340.md) - defines Chain-of-Evidence, builds claim provenance into an autonomous-research pipeline, and audits score, specification, reference, and method-code integrity.
* [ResearchStudio-Idea](../papers/2607.04439.md) - gates research ideation on retrieved evidence, checks mechanism-level prior-art collision, preserves falsification commitments, and abstains when grounding or audit conditions fail.
* [Spark-to-Paper](../papers/2608.11924.md) - splits deterministic integrity gates (citation, manuscript-evidence, figure, compilation) from model-based self-critique (self-review, adversarial review), lifting seeded-fabrication detection from 14% to 92% in a controlled ablation.

# Synthesis

ScientistOne carries typed evidence from literature and experiments into a research paper, then audits claim-to-artifact integrity. ResearchStudio-Idea acts earlier: it grounds a bottleneck, tests differentiation against retrieved prior art, preserves falsification and compute commitments, and can refuse to generate a proposal. Spark-to-Paper contributes a concrete, measured breakdown of *why* a verification stack works: its ablation isolates how much detection improvement comes from deterministic gates alone versus adding self-review versus adding adversarial review, and its adversarial-review stage requires every raised issue to quote the exact passage it challenges. Together they frame verifiability as a lifecycle property—from choosing a defensible idea through executing, reporting, and auditing it—while also exposing a shared weak point: semantic checks still depend partly on LLM judges, and Spark-to-Paper's own fabrication-detection numbers are measured only against seeded probes rather than naturally occurring fabrications.

# Open Questions

* How can an audit measure false negatives rather than only validate flagged failures?
* What evidence-chain formats remain stable across code revisions, reruns, and manuscript rewrites?
* How should qualitative, causal, and conclusion claims be checked when exact numeric matching is insufficient?
* Which human verification steps are indispensable when audit components use LLM judgments?
* How should claim provenance work in domains without deterministic evaluators, such as wet-lab science or theory?
* Can ideation-stage evidence bundles be carried forward without drift into experiment records and final claim provenance?
* Do fabrication-detection rates measured against seeded, author-designed probes generalize to naturally occurring fabrications?
