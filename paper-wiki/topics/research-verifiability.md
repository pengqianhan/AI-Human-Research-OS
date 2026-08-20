---
type: Topic
title: Research verifiability
description: Papers about tracing scientific claims to supporting artifacts and auditing the integrity of research outputs.
tags:
- research-verifiability
- scientific-integrity
- provenance
timestamp: 2026-08-20T00:00:00Z
---

# Scope

This topic tracks systems, standards, and audits that connect scientific claims to literature, code, data, evaluator outputs, and reasoning records. It focuses on whether a research artifact can be checked against its evidence, which is distinct from whether the prose is persuasive or the headline result is competitive.

# Papers

* [ScientistOne](../papers/2605.26340.md) - defines Chain-of-Evidence, builds claim provenance into an autonomous-research pipeline, and audits score, specification, reference, and method-code integrity.
* [ResearchStudio-Idea](../papers/2607.04439.md) - gates research ideation on retrieved evidence, checks mechanism-level prior-art collision, preserves falsification commitments, and abstains when grounding or audit conditions fail.
* [Spark-to-Paper](../papers/2608.11924.md) - splits deterministic integrity gates (citation, manuscript-evidence, figure, compilation) from model-based self-critique (self-review, adversarial review), lifting seeded-fabrication detection from 14% to 92% in a controlled ablation.
* [ARIS](../papers/2605.03042.md) - names "plausible unsupported success" as the central failure mode of single-agent long-horizon research and answers it with a three-stage evidence-to-claim audit cascade (experiment-integrity audit, result-to-claim mapping, fresh-reviewer paper-claim audit against a claim ledger).

# Synthesis

ScientistOne carries typed evidence from literature and experiments into a research paper, then audits claim-to-artifact integrity. ResearchStudio-Idea acts earlier: it grounds a bottleneck, tests differentiation against retrieved prior art, preserves falsification and compute commitments, and can refuse to generate a proposal. Spark-to-Paper contributes a concrete, measured breakdown of *why* a verification stack works: its ablation isolates how much detection improvement comes from deterministic gates alone versus adding self-review versus adding adversarial review, and its adversarial-review stage requires every raised issue to quote the exact passage it challenges. ARIS names specific integrity failure modes at the code/evaluation level (model-derived reference labels, self-normalized scores, phantom results, dead-code metric inflation, scope inflation) that its Stage 1 audit checks for before a claim is even formed, then propagates any Stage 1 failure into the Stage 2 claim ledger and Stage 3 manuscript audit — making integrity a gate that blocks claim promotion rather than a separate downstream check. Together they frame verifiability as a lifecycle property—from choosing a defensible idea through executing, reporting, and auditing it—while also exposing a shared weak point: semantic checks still depend partly on LLM judges, Spark-to-Paper's own fabrication-detection numbers are measured only against seeded probes rather than naturally occurring fabrications, and ARIS's audit cascade is validated by only one documented end-to-end run rather than a controlled benchmark.

# Open Questions

* How can an audit measure false negatives rather than only validate flagged failures?
* What evidence-chain formats remain stable across code revisions, reruns, and manuscript rewrites?
* How should qualitative, causal, and conclusion claims be checked when exact numeric matching is insufficient?
* Which human verification steps are indispensable when audit components use LLM judgments?
* How should claim provenance work in domains without deterministic evaluators, such as wet-lab science or theory?
* Can ideation-stage evidence bundles be carried forward without drift into experiment records and final claim provenance?
* Do fabrication-detection rates measured against seeded, author-designed probes generalize to naturally occurring fabrications?
* Does gating claim promotion on an upstream integrity audit (ARIS's Stage 1 → Stage 2 propagation) catch more unsupported claims than auditing the finished manuscript alone, or does it just move the same false negatives earlier in the pipeline?
