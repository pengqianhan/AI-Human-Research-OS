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
- cog-20260926-001 - Is subscription reuse seen as a technical question only? Hypothesis: provider terms, not code, may bound what a distributed product can do with users' subscriptions.
- cog-20261020-001 - Is LLM-led research and RSI a change to the OS's north star? Hypothesis: the stated end goal outruns GOAL.md's human-research-first rule and `agent_led_research: off`, which stay unrevised.

## Entries

## cog-20261020-001 Is LLM-led research and RSI a change to the OS's north star?

- content: Hypothesis, not a finding. On 2026-10-20 the human named the OS's end goal as making research easy for LLMs, or enabling RSI, meaning both the OS improving itself and research on recursive self-improvement. GOAL.md §1 still puts the human's own research practice first (研究实践优先), and the research policy keeps `agent_led_research: off`. The human may not read the statement as changing either. An OS built toward RSI would need both settled: who may run research unattended, and which frozen evaluator self-improvement is judged against.
- source: inferred
- confidence: low
- evidence: The agent named the gap in the same reply that asked three scan questions. The human answered only those three, so silence may mean "not now" rather than unawareness.
- created: 2026-10-20
- last_updated: 2026-10-20
- status: active
- domain: Research OS direction and governance
- scope: How the stated end goal relates to GOAL.md and the research policy; no claim about the human's understanding of RSI itself.
- last_verified: 2026-10-20
- freshness: current
- responsibility_relevance:
  - Before building OS machinery justified by RSI or agent-led research, ask whether GOAL.md and `agent_led_research` should be revised first; GOAL.md changes only by the human's hand.
- next_learning_edge: When H3 (trace reflection) or GOAL.md next comes up, ask whether RSI belongs in the north star and what evaluator would judge it.
- related:
  - [cog-20260716-002](known_knowns.md#cog-20260716-002-outcome-level-research-os-vision)
  - [cog-20260716-006](known_unknowns.md#cog-20260716-006-autonomous-research-runtime-design)

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

- status: superseded
- moved_to: [known_knowns.md#cog-20260923-002](known_knowns.md#cog-20260923-002-recommended-defaults-in-grilling-rounds-are-accepted-without-close-reading)
- reason: Asked directly on 2026-09-23, the human confirmed the behaviour (「我基本没细看，直接接受了推荐」); the hypothesis became a stated fact about their decision process.
- last_updated: 2026-09-23

## cog-20260926-001 Is subscription reuse seen as a technical question only?

- content: Hypothesis, not a finding. The human framed "reuse the user's code-agent subscription instead of buying an API key" as an implementation question to study in Orca and OpenResearch. Whether a distributed product may drive a user's consumer subscription is also set by each provider's usage terms, which can change and can differ between launching the official CLI and handling its OAuth tokens directly.
- source: inferred
- confidence: low
- evidence: 2026-09-26 request asked only "how do they implement it" and named subscription reuse as a selling point; neither studied repo discusses provider terms, and Orca refreshes Claude OAuth tokens and calls usage endpoints itself. Later the same day, shown the terms risk and Pi's own warning that third-party use of a Claude subscription is billed as extra usage, the human chose the official-CLI route. That choice fits the hypothesis being addressed, but the personal-versus-public question was not answered, so the blind spot is not yet resolved. 2026-09-30: answered the learning edge: “我的research OS 以后要发布为产品，让其他用户使用” (public release to other users). Asked which way the product should reach the literature APIs, and accepted per-user keys over a shared one. Told that alphaXiv's third-party terms still needed checking, they replied with the access mechanism (“alphaxiv的mcp 应该是需要登录的 … 我登录后就可以用了”) rather than the terms. This fits the hypothesis, now widened from subscriptions to data-source APIs; still low confidence.
- created: 2026-09-26
- last_updated: 2026-09-30
- status: active
- domain: Research OS product and distribution
- scope: Access to third-party services (agent subscriptions, literature APIs) in a product publicly released to other users; no claim about the human's personal local use.
- last_verified: 2026-09-30
- freshness: current
- responsibility_relevance:
  - Before designing credential handling or public distribution, point to the current provider terms and prefer launching official CLIs over touching their tokens.
- next_learning_edge: Before public release, go through each provider's terms with the human (alphaXiv's public API first) and see whether they treat the terms, not the login, as the gate.
