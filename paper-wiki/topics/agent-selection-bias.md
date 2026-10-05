---
type: Topic
title: Agent selection bias
description: Papers about systematic biases in what LLM agents choose on a user's behalf (items, sources, sites, tools), measured against how well the options actually meet the request.
tags:
- agent-selection-bias
- source-preference
- agentic-commerce
- provider-fairness
timestamp: 2026-10-05T00:00:00Z
---

# Scope

This topic tracks how LLM agents decide *which* of several acceptable options to pick when they act for a user: which product, hotel, paper, website, or tool. The question is whether something other than fit to the request, such as the option's source, provider, position, or name, steers the choice, how large the effect is, where it comes from, and how to reduce it. It is distinct from [Search agents](search-agents.md), which tracks how well agents find and synthesize evidence, and from [Agent security and red teaming](agent-security.md), which tracks adversarial manipulation; biases here arise without an attacker.

# Papers

* [Source Preference in the Wild](../papers/2610.03195.md) - measures source preference in end-to-end web search for 12 agent models across shopping, accommodation, and scholarly search, using requirement-matched item pairs, cyclic position rotation, and a Bradley-Terry score; preferred sources beat better items from dispreferred sources about two-thirds of the time, swapping only the displayed source changes selection, DPO that pairs a source with better items creates the preference, and supplying missing information or a counter-prompt reduces it.

# Open Questions

* How much of an agent's source preference is an unwarranted shortcut and how much a reasonable prior about attributes the agent cannot see (price, reliability)? Answering this needs ground truth beyond the search snippet.
* Do agents that open and read pages show the same preferences, or do the effects mostly come from snippet-only evidence where the URL is the most informative cue?
* Which post-training data (preference pairs, RL rewards, citation corpora) carries source-satisfaction correlations strong enough to create these preferences, and can balancing it remove them without hurting selection quality?
* Do the same matched-comparison methods reveal provider bias in tool and MCP-server choice, or source bias in which papers deep-research agents cite?
* If agent selections feed back into training data or into which providers get traffic, do preferences amplify over time, and how should exposure across providers be audited?
