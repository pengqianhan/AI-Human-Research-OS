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

- cog-20260716-003 - TypeScript implementation: explicitly unfamiliar with TypeScript and wants to learn it through real MVP artifacts.
- cog-20260716-004 - pi SDK: explicitly unfamiliar with pi SDK concepts and integration patterns.
- cog-20260716-005 - Frontend design: explicitly unfamiliar with frontend architecture and implementation.
- cog-20260716-006 - Autonomous research runtime design: recognizes that detailed orchestration, safety, budget, evaluation, and subagent design exceed current knowledge.
- cog-20260718-001 - LLM tool call and Codex Harness boundary: currently building a stable model of how tool-call JSON moves from the model through `codex-rs` to process execution.

## Entries

## cog-20260716-003 TypeScript implementation

- content: The human reports not knowing TypeScript and wants to learn the required parts while the Research OS MVP is built.
- source: user-confirmed
- confidence: high
- evidence: Explicit self-report in the Research OS MVP clarification.
- created: 2026-07-16
- last_updated: 2026-07-16
- status: active
- domain: software implementation
- scope: TypeScript needed for this repository's future pi SDK, local-server, and frontend artifacts.
- capability_level: awareness
- evidence_type: self-report
- last_verified: 2026-07-16
- freshness: current
- responsibility_relevance:
  - The human will need to operate and review delivered TypeScript components.
- next_learning_edge: Read, run, and make a bounded verified change to a small TypeScript module using Python analogies.

## cog-20260716-004 pi SDK

- content: The human reports not understanding pi SDK and wants implementation-grounded teaching while the MVP is built.
- source: user-confirmed
- confidence: high
- evidence: Explicit self-report in the Research OS MVP clarification.
- created: 2026-07-16
- last_updated: 2026-07-16
- status: active
- domain: agent runtime integration
- scope: pi SDK sessions, events, tools, resources, persistence, and application embedding relevant to this Research OS.
- capability_level: awareness
- evidence_type: self-report
- last_verified: 2026-07-16
- freshness: current
- responsibility_relevance:
  - The human will own product direction and must be able to operate and review the embedded agent runtime.
- next_learning_edge: Explain and operate one real AgentSession lifecycle, including prompt, streaming events, tool execution, abort, and session persistence.

## cog-20260716-005 Frontend design

- content: The human reports not understanding frontend design and wants to learn it from the real product interface as it is built.
- source: user-confirmed
- confidence: high
- evidence: Explicit self-report in the Research OS MVP clarification.
- created: 2026-07-16
- last_updated: 2026-07-16
- status: active
- domain: product interface
- scope: Frontend component, state, API, streaming, and interaction design needed for the local Research OS interface.
- capability_level: awareness
- evidence_type: self-report
- last_verified: 2026-07-16
- freshness: current
- responsibility_relevance:
  - The human must be able to use, inspect, and redirect the GUI without maintaining every implementation detail.
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
- freshness: current
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
- next_learning_edge: Trace one real `shell_command` call from user request to model arguments, schema validation, process spawn, and returned tool result.
