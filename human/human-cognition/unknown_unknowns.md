---
type: HumanCognitionQuadrant
title: Unknown Unknowns
description: Candidate blind spots the human may not yet realize, recorded as questions or hypotheses.
quadrant: unknown_unknowns
tags: [human-cognition, unknown-unknowns]
timestamp: 2026-07-04T00:00:00+12:00
---

# Unknown Unknowns

## Active Index

- cog-20260908-002 - Does the paper-wiki graph match the human's mental model of it? Hypothesis: it may be read as a citation network when 74% of its edges are filing structure.

## Entries

## cog-20260908-002 Does the paper-wiki graph match the human's mental model of it?

- content: Hypothesis, not a finding. The human may picture `paper-wiki/viz.html` as a citation network, while the graph it actually draws is dominated by paper-to-topic/concept membership — that is, by how the human filed the papers rather than by how the papers cite each other. If so, graph structure could be read as evidence about the literature when it mostly reflects the wiki's own organization.
- source: inferred
- confidence: low
- evidence: The human opened the timeline request by naming the existing view 「引用图谱」 (citation graph). Measured edge composition at that moment: 288/391 membership edges (74%), 77 paper-to-paper links (20%), 26 topic-to-concept (7%). Shown these numbers, the human moved to the neutral name `Graph` but did not comment on the composition itself, so it is unknown whether the underlying model changed or the naming was simply deferred to the agent.
- created: 2026-09-08
- last_updated: 2026-09-08
- status: active
- domain: paper-wiki knowledge graph
- scope: The human's reading of what the `viz.html` graph encodes; no claim about their understanding of citation graphs in general.
- last_verified: 2026-09-08
- freshness: current
- responsibility_relevance:
  - Raise the edge composition explicitly before any task that would treat the graph as citation evidence, such as clustering papers by citation or inferring influence from graph structure.
- next_learning_edge: Ask whether paper-to-paper links should be visually distinguished from membership edges, which would make the distinction visible instead of implicit.
