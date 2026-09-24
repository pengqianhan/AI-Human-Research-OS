---
type: Topic
title: Research verifiability
description: Papers about tracing scientific claims to supporting artifacts and auditing the integrity of research outputs.
tags:
- research-verifiability
- scientific-integrity
- provenance
timestamp: 2026-09-24T00:00:00Z
---

# Scope

This topic tracks systems, standards, and audits that connect scientific claims to literature, code, data, evaluator outputs, and reasoning records. It focuses on whether a research artifact can be checked against its evidence, which is distinct from whether the prose is persuasive or the headline result is competitive.

# Papers

* [ScientistOne](../papers/2605.26340.md) - defines Chain-of-Evidence, builds claim provenance into an autonomous-research pipeline, and audits score, specification, reference, and method-code integrity.
* [ResearchStudio-Idea](../papers/2607.04439.md) - gates research ideation on retrieved evidence, checks mechanism-level prior-art collision, preserves falsification commitments, and abstains when grounding or audit conditions fail.
* [Spark-to-Paper](../papers/2608.11924.md) - splits deterministic integrity gates (citation, manuscript-evidence, figure, compilation) from model-based self-critique (self-review, adversarial review), lifting seeded-fabrication detection from 14% to 92% in a controlled ablation.
* [ARIS](../papers/2605.03042.md) - names "plausible unsupported success" as the central failure mode of single-agent long-horizon research and answers it with a three-stage evidence-to-claim audit cascade (experiment-integrity audit, result-to-claim mapping, fresh-reviewer paper-claim audit against a claim ledger).
* [AutoResearchClaw](../papers/2605.20025.md) - gates numeric claims against a deterministic verified registry of executed measurements (rejecting or placeholder-masking unmatched claims in strict sections) and citations against a four-layer external-database pipeline, with a component ablation directly showing that removing the verification gate lets fabricated numbers reach "accepted" outputs.
* [AutoResearch](../papers/2608.17906.md) - gates execution-time claim acceptance with a fresh-context critic that receives only the hypothesis, plan, evidence, and criteria (not the producer agent's own reasoning trajectory), and reports comparative audit-confirmed issue-event counts across five autonomous research systems (5 for AutoResearch vs. 11-27 for four established baselines on the same task) rather than only auditing its own outputs.
* [Lean Pool](../papers/2609.25199.md) - an AI-maintained archive of 211 Lean formalization projects where correctness is delegated to the Lean kernel plus mechanical admission rules (no `sorry`, restricted axioms, provenance cards naming human/AI/mixed proof authorship), leaving statement faithfulness to an LLM review service whose accuracy was never labeled; its operating record also shows agent upgrade repairs can strengthen theorem hypotheses while still passing the build.

# Synthesis

ScientistOne carries typed evidence from literature and experiments into a research paper, then audits claim-to-artifact integrity. ResearchStudio-Idea acts earlier: it grounds a bottleneck, tests differentiation against retrieved prior art, preserves falsification and compute commitments, and can refuse to generate a proposal. Spark-to-Paper contributes a concrete, measured breakdown of *why* a verification stack works: its ablation isolates how much detection improvement comes from deterministic gates alone versus adding self-review versus adding adversarial review, and its adversarial-review stage requires every raised issue to quote the exact passage it challenges. ARIS names specific integrity failure modes at the code/evaluation level (model-derived reference labels, self-normalized scores, phantom results, dead-code metric inflation, scope inflation) that its Stage 1 audit checks for before a claim is even formed, then propagates any Stage 1 failure into the Stage 2 claim ledger and Stage 3 manuscript audit — making integrity a gate that blocks claim promotion rather than a separate downstream check. Together they frame verifiability as a lifecycle property—from choosing a defensible idea through executing, reporting, and auditing it—while also exposing a shared weak point: semantic checks still depend partly on LLM judges, Spark-to-Paper's own fabrication-detection numbers are measured only against seeded probes rather than naturally occurring fabrications, and ARIS's audit cascade is validated by only one documented end-to-end run rather than a controlled benchmark. AutoResearchClaw contributes the clearest causal evidence in this topic that a verification gate is doing real integrity work rather than only adding friction: its component ablation removes the verification gate alone and finds apparent acceptance rate rises (3/10 to 5/10) precisely because fabricated values — absent from any measurement record — now pass through, a controlled counterfactual none of the other three papers' audits directly demonstrate. Its two-layer design (a registry gating numbers, a four-layer external-database pipeline gating citations) is also more deterministic than Spark-to-Paper's mixed deterministic-gate-plus-LLM-self-review stack for the numeric-claim half specifically, though its citation relevance check still depends on an LLM classifier. AutoResearch contributes a cross-system rather than a within-system comparison: instead of ablating its own verification component, it runs four independent published autonomous-research systems under the same task-specific contract and audits all five for confirmed issue events, giving this topic its first multi-system reliability comparison — though the retrieved text reports only AutoResearch's own task-outcome numbers alongside all five systems' issue-event counts, so it establishes "AutoResearch's execution trace is more reliably audited" more directly than "AutoResearch's underlying research outcomes are comparably good or better." Lean Pool sits at the far end of this topic's spectrum: a kernel-checked proof removes the doubt that every other paper here audits with registries, critics, or judges, which isolates what remains — whether the formal *statement* faithfully matches the informal claim and its attribution. It hands exactly that residue to an LLM reviewer, and its own record (repeated reviews of the same PR agreeing 37 of 69 times; upgrade repairs that strengthened auxiliary hypotheses while still compiling) shows the statement-level check is the weak link even when proof-level verification is perfect.

# Open Questions

* How can an audit measure false negatives rather than only validate flagged failures?
* What evidence-chain formats remain stable across code revisions, reruns, and manuscript rewrites?
* How should qualitative, causal, and conclusion claims be checked when exact numeric matching is insufficient?
* Which human verification steps are indispensable when audit components use LLM judgments?
* How should claim provenance work in domains without deterministic evaluators, such as wet-lab science or theory?
* Can ideation-stage evidence bundles be carried forward without drift into experiment records and final claim provenance?
* Do fabrication-detection rates measured against seeded, author-designed probes generalize to naturally occurring fabrications?
* Does gating claim promotion on an upstream integrity audit (ARIS's Stage 1 → Stage 2 propagation) catch more unsupported claims than auditing the finished manuscript alone, or does it just move the same false negatives earlier in the pipeline?
* When a proof checker makes correctness mechanical (as in Lean Pool), how should statement drift — an agent repair that weakens or strengthens a theorem's hypotheses while still compiling — be detected and routed to human sign-off?
