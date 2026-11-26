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
- cog-20261020-001 - Is LLM-led research and RSI a change to the OS's north star? Partly answered 2026-11-21: human-led now, agent-led later. Still open: where RSI sits and what evaluator would judge it.
- cog-20261121-002 - Does a product for other researchers need the human's own real research on it first? Hypothesis: the audience moved to outside users while the portfolio holds one example and no research project.
- cog-20261127-001 - Is how one Git repository sits inside another familiar? Hypothesis: step 3 nests each project's repository in the workspace's, and what the outer repository then sees may not be in view.

## Entries

## cog-20261020-001 Is LLM-led research and RSI a change to the OS's north star?

- content: Hypothesis, narrowed. On 2026-10-20 the human named the OS's end goal as making research easy for LLMs, or enabling RSI, in both senses. On 2026-11-21 they settled the order: human-led research is the product's default, and agent-led research comes later. What remains unexamined is RSI: whether it belongs in the direction text at all, who may run research unattended when the later stage comes, and which frozen evaluator self-improvement would be judged against.
- source: inferred
- confidence: low
- evidence: The agent named the gap in the same reply that asked three scan questions. The human answered only those three, so silence may mean "not now" rather than unawareness. 2026-11-21: asked directly in a grilling round whether the OS is human-led or agent-led, the human answered human-led, with agent-led to be considered later (「Q2A,之后考虑B」), and accepted shipping that as each workspace's default through the existing `agent_led_research` values. They also agreed that GOAL.md needs an item-by-item revision. So the human does see the direction text as something to revise; the gap between the 2026-10-20 end goal and the policy is now a stated sequence. RSI was not discussed in the session, and no evaluator question was raised.
- created: 2026-10-20
- last_updated: 2026-11-21
- status: active
- domain: Research OS direction and governance
- scope: How the stated end goal relates to GOAL.md and the research policy; no claim about the human's understanding of RSI itself.
- last_verified: 2026-11-21
- freshness: current
- responsibility_relevance:
  - Before building OS machinery justified by RSI or agent-led research, ask whether GOAL.md and `agent_led_research` should be revised first; GOAL.md changes only by the human's hand.
- next_learning_edge: GOAL.md was revised on 2026-11-21 without any RSI sentence, and the agent told the human so in the closing report. When H3 or agent-led work next comes up, ask whether RSI gets a sentence in the direction text and what evaluator would judge it.
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
- evidence: 2026-09-26 request asked only "how do they implement it" and named subscription reuse as a selling point; neither studied repo discusses provider terms, and Orca refreshes Claude OAuth tokens and calls usage endpoints itself. Later the same day, shown the terms risk and Pi's own warning that third-party use of a Claude subscription is billed as extra usage, the human chose the official-CLI route. That choice fits the hypothesis being addressed, but the personal-versus-public question was not answered, so the blind spot is not yet resolved. 2026-09-30: answered the learning edge: “我的research OS 以后要发布为产品，让其他用户使用” (public release to other users). Asked which way the product should reach the literature APIs, and accepted per-user keys over a shared one. Told that alphaXiv's third-party terms still needed checking, they replied with the access mechanism (“alphaxiv的mcp 应该是需要登录的 … 我登录后就可以用了”) rather than the terms. This fits the hypothesis, now widened from subscriptions to data-source APIs; still low confidence. 2026-11-21: the positioning session put the vendors' terms in front of the human as a subagent report. Their requirement stayed framed by a reference product's behaviour (「默认要像ohmygame 那样支持使用claude code ,codex, agy」). They accepted the terms-driven limits as recommended defaults: free and local only, no vendor names in the product name, and Antigravity through `agy acp` only, off by default with a risk notice. Whether to ask Anthropic and Google the two open questions before a release was put to them and is unanswered. The hypothesis is weaker: the terms now shape recorded decisions, but each limit came from the agent.
- created: 2026-09-26
- last_updated: 2026-11-21
- status: active
- domain: Research OS product and distribution
- scope: Access to third-party services (agent subscriptions, literature APIs) in a product publicly released to other users; no claim about the human's personal local use.
- last_verified: 2026-11-21
- freshness: current
- responsibility_relevance:
  - Before designing credential handling or public distribution, point to the current provider terms and prefer launching official CLIs over touching their tokens.
- next_learning_edge: Before the step 3 outside test, put the two open vendor questions in ADR-0006 to the human again and see whether they choose to ask the vendors.

## cog-20261121-002 Does a product for other researchers need the human's own real research on it first?

- content: Hypothesis, not a finding. On 2026-11-21 the human moved the OS's audience from their own research practice to other researchers and committed to four build steps. The portfolio holds one example project, no real research project, and no outside user; the first outside evidence arrives at step 3. The human may not be weighing that the product's fit for research is so far judged only from reference products, not from anyone doing research in it, themselves included.
- source: inferred
- confidence: low
- evidence: 2026-09-27 they cancelled the only planned real project to focus on the OS. In the 2026-11-21 session the agent listed "no real-research or external-user evidence until step 3" among the accepted risks in the final table, and the human confirmed the whole table in three words (「确认，落盘」) without taking that item up; per cog-20260923-002 a batch confirmation does not show the item was weighed. They did choose `nanochat_cpu` as the test vehicle themselves (「q4 还是nanochat项目」).
- created: 2026-11-21
- last_updated: 2026-11-21
- status: active
- domain: Research OS product evidence
- scope: How the product's fitness for research gets validated before step 3; no claim about the human's research ability or plans outside this repository.
- last_verified: 2026-11-21
- freshness: current
- responsibility_relevance:
  - Do not describe the app as usable by others, or the views as suited to research, before the step 3 outside test; say what evidence a claim rests on.
  - When a view's design is uncertain (Idea DAG vocabulary, Skeleton), offer to try it on a small real question of the human's own, not only on `nanochat_cpu`.
- next_learning_edge: At the step 2 check, ask whether the five views would have helped a past project of theirs, and whether they want a real project of their own in the workspace before the outside test.
- related:
  - [cog-20260716-002](known_knowns.md#cog-20260716-002-outcome-level-research-os-vision)
  - [cog-20260923-002](known_knowns.md#cog-20260923-002-recommended-defaults-in-grilling-rounds-are-accepted-without-close-reading)

## cog-20261127-001 Is how one Git repository sits inside another familiar?

- content: Hypothesis, not a finding. Step 3 makes each project its own Git repository inside the workspace's repository, with an ignore line so the outer one does not see it. The human may not have in view what a repository placed inside another does to the outer one: an untracked entry, `git add -A` failing or recording a link, and this repository's own checks reading the new folder as a top-level area.
- source: inferred
- confidence: low
- evidence: 2026-11-26, one action: asked to prepare the product's repository, the human made its folder inside this repository's checkout and asked for `git init` there. Told the four effects the agent had measured (among them `./verify.sh` already failing on the folder), they chose to move it beside the checkout in one reply (「移到旁边」). The first placement may have been convenience and not a gap; they had decided the same day that the product gets a repository of its own.
- created: 2026-11-27
- last_updated: 2026-11-27
- status: active
- domain: Git and repository layout
- scope: Repositories placed inside other repositories, in this workspace and in step 3's design. No claim about everyday Git use (branches, pull requests, merging), which the human does routinely.
- last_verified: 2026-11-27
- freshness: current
- responsibility_relevance:
  - When a step puts a repository inside another (a project becoming its own repository, the example's first commit), say first what the outer repository will show and which command would go wrong, then ask for the word.
  - Do not read the step 3 answers on project repositories (design §8, questions 5 and 7) as showing this is understood; they accepted defaults.
- next_learning_edge: When `nanochat_cpu` becomes its own repository, show `git status` of the workspace before and after the ignore line, and ask what they expect `git add -A` to do there.
- related:
  - [cog-20260923-002](known_knowns.md#cog-20260923-002-recommended-defaults-in-grilling-rounds-are-accepted-without-close-reading)
