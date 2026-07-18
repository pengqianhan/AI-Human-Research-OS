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

# Synthesis

ScientistOne carries typed evidence from literature and experiments into a research paper, then audits claim-to-artifact integrity. ResearchStudio-Idea acts earlier: it grounds a bottleneck, tests differentiation against retrieved prior art, preserves falsification and compute commitments, and can refuse to generate a proposal. Together they frame verifiability as a lifecycle property—from choosing a defensible idea through executing and reporting it—while also exposing a shared weak point: semantic checks still depend partly on LLM judges.

# Open Questions

* How can an audit measure false negatives rather than only validate flagged failures?
* What evidence-chain formats remain stable across code revisions, reruns, and manuscript rewrites?
* How should qualitative, causal, and conclusion claims be checked when exact numeric matching is insufficient?
* Which human verification steps are indispensable when audit components use LLM judgments?
* How should claim provenance work in domains without deterministic evaluators, such as wet-lab science or theory?
* Can ideation-stage evidence bundles be carried forward without drift into experiment records and final claim provenance?
