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
- cog-20260923-002 - Is the veto in grilling rounds still being exercised? Hypothesis: recommendation-first rounds with reversal paths may be read as a briefing to ratify; 16 of 16 defaults were accepted on 2026-09-23.

## Entries

## cog-20260908-002 Does the paper-wiki graph match the human's mental model of it?

- content: Hypothesis, not a finding. The human may picture `paper-wiki/viz.html` as a citation network, while the graph it actually draws is dominated by paper-to-topic/concept membership — that is, by how the human filed the papers rather than by how the papers cite each other. If so, graph structure could be read as evidence about the literature when it mostly reflects the wiki's own organization.
- source: inferred
- confidence: low
- evidence: The human opened the timeline request by naming the existing view 「引用图谱」 (citation graph). Measured edge composition at that moment: 288/391 membership edges (74%), 77 paper-to-paper links (20%), 26 topic-to-concept (7%). Shown these numbers, the human moved to the neutral name `Graph` but did not comment on the composition itself, so it is unknown whether the underlying model changed or the naming was simply deferred to the agent. 2026-09-11: the human asked for a Timeline button to see 「paper 在整个graph 处在什么位置」 (where a paper sits in the whole graph). The request treats position in the graph as meaningful but does not say whether that means topic/concept filing or citation links, so it neither supports nor weakens the hypothesis. What the delivered jump actually shows is the paper's topics and concepts plus its paper-to-paper links; where topics and concepts sit on the grid is set by sorting concept IDs, so on-screen location alone carries no meaning.
- created: 2026-09-08
- last_updated: 2026-09-11
- status: active
- domain: paper-wiki knowledge graph
- scope: The human's reading of what the `viz.html` graph encodes, including what a node's place in it means; no claim about their understanding of citation graphs in general.
- last_verified: 2026-09-11
- freshness: current
- responsibility_relevance:
  - Raise the edge composition explicitly before any task that would treat the graph as citation evidence, such as clustering papers by citation or inferring influence from graph structure.
  - When presenting where a node sits in the graph, separate filing (topics and concepts) from paper-to-paper links, and note that grid placement follows concept-ID order.
- next_learning_edge: Ask whether paper-to-paper links should be visually distinguished from membership edges, which would make the distinction visible instead of implicit.

## cog-20260923-002 Is the veto in grilling rounds still being exercised?

- content: Hypothesis, not a finding. The grilling format exists to elicit the human's independent judgement on each design branch. When every round places the agent's recommendation first, with a reversal path attached, the human may be reading the rounds as a briefing to ratify rather than as decisions to make, so a wrong recommendation would pass through undetected. The alternative reading is equally open: the recommendations were grounded in repository facts the human recognized, and agreement at every step is the format working as designed.
- source: inferred
- confidence: low
- evidence: 2026-09-23, `research-project-manager` design: three rounds, 16 numbered questions, each with a recommended default; the human's three replies were 「接受你的推荐」, 「接受建议」, 「这一轮也接受」, and no non-recommended option was chosen. Counter-evidence at the directional level: on 2026-07-19 the human overrode the whole SDK route after trying it (HANDOFF "2026-07-19 directional MVP sequencing reset"), and on 2026-07-22 amended GOAL.md M3's trigger text rather than accept an override. So any blind spot, if real, is confined to executive and mechanical decisions inside a round, not to direction.
- created: 2026-09-23
- last_updated: 2026-09-23
- status: active
- domain: human-agent decision process in this repository
- scope: Executive and mechanical design decisions taken inside grilling rounds; no claim about the human's directional judgement, which has demonstrated vetoes.
- last_verified: 2026-09-23
- freshness: current
- responsibility_relevance:
  - In future grilling rounds, put the one or two decisions that matter most without a recommendation, or with two genuinely balanced options, and ask which the human would reverse first; a cheap probe of whether the veto is live.
  - Keep every recommendation's repository evidence in the question text so ratification at least happens against the facts.
- next_learning_edge: Ask the human directly whether they read each recommendation's evidence before accepting, or trust the format; either answer resolves this entry.
