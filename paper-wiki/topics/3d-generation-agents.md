---
type: Topic
title: 3D generation agents
description: Papers about MLLM/LLM agents that construct or edit 3D content — worlds, scenes, or CAD objects — through iterative tool use and verifier-gated feedback rather than single-pass generation.
tags:
- 3d-generation-agents
- procedural-modeling
- multimodal-agents
- verifier-gated-generation
timestamp: 2026-08-30T00:00:00Z
---

# Scope

This topic tracks papers where an agent produces 3D content (a scene, an open world, or a discrete object) through multi-turn tool use and feedback from a verifier or critic, rather than a single-pass generative model mapping a prompt directly to geometry. It covers both the target representation (procedural code, a text/asset-based world map) and the mechanism that closes the loop between a generated draft and a judged or checked correction.

# Papers

* [VibeWorlding](../papers/2608.15265.md) - an MCP-tool sandbox and RL training gym for multimodal agents that construct and refine open 3D worlds from a fixed asset library, scored by a dual-constraint verifier (deterministic physical-feasibility geometry checks gating an MLLM rubric judge) that also serves as the RL reward signal.
* [Procedura](../papers/2608.26238.md) - an agent that writes a discrete, many-part object as a procedural CSG assembly joined by typed, machine-checkable mates, solving part placement analytically and gating every commit on compile/mate/connectivity checks plus a decoupled vision critic.
* [Code as Worlds](../papers/2608.27549.md) - discovers an executable world representation (physical composition, dynamic evolution, and visual appearance as code) from text or video evidence through a propose-instantiate-execute-render-verify loop, where the verifier compares a physics simulator's executed state trajectory against the input evidence rather than checking a static rendered image or geometric/connectivity constraints.

# Synthesis

VibeWorlding and Procedura target different 3D generation problems — populating an open scene from a fixed asset library versus building one discrete, precisely-jointed object from parametric code — but converge on the same structural bet: single-pass generation is not enough, and what makes iteration productive is a verifier the agent cannot talk its way past. VibeWorlding's verifier is dual-constraint (deterministic geometry, then an MLLM rubric) and reused directly as an RL reward; Procedura's verification is entirely deterministic at the part-commit level (compile, mate-registration, connectivity gates) with a *separate* vision critic reserved for diagnosing higher-level defects, and that critic's diagnosis is itself rate-limited to one edit per diagnosis rather than folded into training. Neither paper lets the same model both propose and freely judge its own change — VibeWorlding's judge is a distinct rubric model from the acting policy, and Procedura explicitly decouples the critic from the fixer on the stated grounds that a self-judging model "carries the very assumptions that produced the error." Where they differ most is what the verifier is *for*: VibeWorlding's verifier trains a policy (its physical-feasibility-and-intent signal is the RL reward itself), while Procedura's gates operate purely at inference time on a frozen, non-3D-trained LLM, with no training loop at all. Code as Worlds adds a third axis to this comparison: rather than verifying a static scene composition (VibeWorlding) or a discrete assembly's structural validity (Procedura), it verifies a *continuous, simulated trajectory* — contacts, collisions, and motion over time — against real video or text evidence, and treats the discovered representation as an editable program whose physical dynamics, not just its appearance, can be counterfactually resimulated.

# Open Questions

* Does gating individual edits at inference time (Procedura) reach a capability ceiling that only training against the verifier as a reward signal (VibeWorlding) can break through, or can inference-time verification alone keep closing the gap as base models improve?
* How should a 3D-generation agent's verifier trade off deterministic geometric checks (cheap, exact, but blind to intent) against a learned rubric judge (captures intent, but only moderately agrees with human per-case judgment in VibeWorlding's own calibration)?
* Do the part-level typed-mate representation (Procedura) and the asset-library-plus-map representation (VibeWorlding) generalize to each other's domain — could open-world construction benefit from machine-checkable joint types, or could CAD assembly benefit from a rendered-image RL reward?
* What failure modes are specific to *editing* an existing 3D artifact (all three papers' refinement/edit query types) versus building one from scratch, and do the same verifier designs catch both?
* Is a physics-simulator execution trace (Code as Worlds) a categorically stronger verification signal than a rubric judge (VibeWorlding) or deterministic compile/mate/connectivity gates (Procedura), or just a different one suited to continuous dynamics rather than static geometry or discrete assembly — and could the other two papers' verifiers be strengthened by adding a simulated-trajectory check for the subset of their content that moves?

