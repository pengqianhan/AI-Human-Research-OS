---
type: HumanCognitionQuadrant
title: Known Unknowns
description: Questions, gaps, or uncertainties the human knows they have.
quadrant: known_unknowns
tags: [human-cognition, known-unknowns]
timestamp: 2026-07-04T00:00:00+12:00
---

# Known Unknowns

## Active Index

- cog-20260716-003 - TypeScript implementation: explicitly unfamiliar; since 2026-11-21 the trunk is TypeScript written by agents, and the human accepts by behaviour, not by reading code.
- cog-20260716-004 - pi SDK: ran the historical Phase 01 hello with guidance; off the route since 2026-11-21, when Pi became an optional ACP agent.
- cog-20260716-005 - Frontend design: explicitly unfamiliar with frontend architecture and implementation; interface judgment from rendered options is reliable.
- cog-20260716-006 - Autonomous research runtime design: recognizes that detailed orchestration, safety, budget, evaluation, and subagent design exceed current knowledge.
- cog-20260718-001 - LLM tool call and Codex Harness boundary: currently building a stable model of how tool-call JSON moves from the model through `codex-rs` to process execution.

## Entries

## cog-20260716-003 TypeScript implementation

- content: The human reports no TypeScript fluency. Until 2026-11-21 they deferred TypeScript work until they could learn it; they have since chosen TypeScript for the whole app trunk and delegated writing and reviewing it to agents, accepting results by behaviour.
- source: user-confirmed
- confidence: high
- evidence: Explicit self-report on 2026-07-19 after successfully running the SDK hello, finding the TypeScript/event-debugging route too steep, and requesting deletion of the old runtime before learning from reference projects. 2026-10-10: asked for the desktop client and left the shell technology to the agent; the client was built in TypeScript without their review of the code. 2026-11-21: chose TypeScript for the client and trunk for ecosystem reasons, not familiarity (「我决定把客户端也像deepseek harness 和ohmygame那样采用typescript」), and accepted that agents own the TypeScript while every acceptance is a mockup, checklist, or end-to-end test. No new evidence of TypeScript skill.
- created: 2026-07-16
- last_updated: 2026-11-21
- status: active
- domain: software implementation
- scope: TypeScript needed for this repository's future pi SDK, local-server, and frontend artifacts.
- capability_level: awareness
- evidence_type: self-report
- last_verified: 2026-11-21
- freshness: current
- responsibility_relevance:
  - The human operates delivered TypeScript components and does not review their code: give every TypeScript deliverable a check they can run (mockup choice, checklist, end-to-end test), and have a second agent review the code.
  - They cannot judge the plugin contract's design quality directly; say so when it changes and state what was checked instead.
- next_learning_edge: Optional, at the human's request only: trace one plugin from its manifest to the rendered view using Python analogies. Learning TypeScript is no longer a precondition for any step.

## cog-20260716-004 pi SDK

- content: The human ran the former Phase 01 Pi SDK hello with guidance but prefers to delete that implementation, learn from reference projects, and restart SDK construction later.
- source: user-confirmed
- confidence: high
- evidence: On 2026-07-19 the human personally ran the real SDK hello, chose Pi Coding Agent for the MVP, and explicitly requested deletion of `os-runtime/` before future reference-project-based SDK learning. 2026-11-21: after reading how OpenResearch and OhMyGame place Pi, the human dropped Pi as an embedded engine and accepted it as one optional agent reached through ACP (「可以」), so the Pi SDK is no longer something they need to operate or review.
- created: 2026-07-16
- last_updated: 2026-11-21
- status: active
- domain: agent runtime integration
- scope: pi SDK sessions, events, tools, resources, persistence, and application embedding relevant to this Research OS.
- capability_level: awareness
- evidence_type: self-report
- last_verified: 2026-11-21
- freshness: current
- responsibility_relevance:
  - None while Pi is an optional ACP agent; this entry matters again only if an embedded runtime returns by a new decision.
- next_learning_edge: None planned. Revisit only if the human reopens an embedded engine.

## cog-20260716-005 Frontend design

- content: The human reports not understanding frontend design and wants to learn it from the real product interface as it is built. Observed behaviour narrows the gap to implementation and architecture: given rendered options, their interface judgment is reliable and needs no scaffolding.
- source: user-confirmed
- confidence: high
- evidence: Explicit self-report in the Research OS MVP clarification (2026-07-16). Narrowed 2026-09-08 during the `viz.html` timeline task: presented with ASCII mockups, the human chose reading layout and row density without hesitation, rejected the description-heavy card variant, declined an optional status filter as scope creep, and pulled back an over-reaching language switch — five interface calls, none of which needed explanation first. They asked nothing about the implementation. Corroborated 2026-09-29 on the README hero: the human proposed replacing the text epigraph with an os-ui screenshot, asked for the Paper Wiki window to be included, and on seeing four windows tiled edge to edge judged it 「有点拥挤」 and asked for resized windows — composition calls made straight from the rendered image. 2026-11-21: shown two inline mockups of the new layout, they directed structure from a reference product and from use (「可以参考ohmygame 的project内的布局，同时root agent 在打开OS 之后就可以看到」), named the six project views themselves, and accepted that every page gets a clickable mockup before it is built.
- created: 2026-07-16
- last_updated: 2026-11-21
- status: active
- domain: product interface
- scope: Frontend component, state, API, streaming, and interaction *implementation* for the local Research OS interface. Does not cover interface and information-design judgment, which the human exercises reliably when options are rendered concretely.
- capability_level: awareness
- evidence_type: self-report
- last_verified: 2026-11-21
- freshness: current
- responsibility_relevance:
  - The human must be able to use, inspect, and redirect the GUI without maintaining every implementation detail.
  - Put UI choices to them as rendered options (mockups, previews), not as prose descriptions or implementation questions.
- next_learning_edge: Trace one verified UI interaction from component event through local API/state update to rendered result.

## cog-20260716-006 Autonomous research runtime design

- content: The human recognizes that the detailed route for autonomous intake, research continuation, experience promotion, and multi-agent parallelism requires agent-led technical design.
- source: user-confirmed
- confidence: high
- evidence: The human supplied desired outcomes and explicitly stated that detailed instructions for reaching them are beyond current cognition.
- created: 2026-07-16
- last_updated: 2026-07-16
- status: active
- domain: Research OS architecture and governance
- scope: Orchestration, permissions, budgets, evaluators, stopping criteria, subagent scheduling, merge policy, and failure recovery.
- capability_level: awareness
- evidence_type: explanation
- last_verified: 2026-07-16
- freshness: possibly-stale
- responsibility_relevance:
  - Human decisions remain required for autonomy level, risk tolerance, budgets, protected data, and acceptance criteria; technical investigation and reversible architecture are agent-owned.
- next_learning_edge: Review a concrete MVP control-loop design and choose its autonomy, budget, and human-approval boundaries with artifact-grounded trade-offs.

## cog-20260718-001 LLM tool call and Codex Harness boundary

- content: The human recognizes a current gap in distinguishing user prompts, model-generated tool-call JSON, Harness tool schemas, and OS process execution.
- source: inferred
- confidence: medium
- evidence: Repeatedly asked who sends the two command JSON forms to whom, then explicitly requested a minimal cognition update about unfamiliarity with LLM tool calls and `codex-rs`.
- created: 2026-07-18
- last_updated: 2026-07-18
- status: active
- domain: agent runtime integration
- scope: LLM tool-call message flow and the `codex-rs` command schema/execution path; no broader claim about JSON, LLMs, or Codex usage.
- capability_level: awareness
- freshness: possibly-stale
- next_learning_edge: Trace one real `shell_command` call from user request to model arguments, schema validation, process spawn, and returned tool result.
