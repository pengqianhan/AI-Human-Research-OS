---
type: Method
title: AI Scientist-v2
description: An end-to-end agentic research system from Sakana AI that formulates hypotheses, runs experiments, analyzes results, and writes manuscripts using a progressive agentic tree search, without the human-written code templates its predecessor needed; a frequent baseline for AI-scientist systems.
resource: https://arxiv.org/abs/2504.08066
tags:
- autonomous-research
- ai-scientist
- agentic-tree-search
timestamp: 2026-11-10T00:00:00Z
---

# Definition

The AI Scientist-v2 (arXiv:2504.08066) is an end-to-end agentic system that iteratively formulates scientific hypotheses, designs and executes experiments, analyzes and visualizes data, and writes scientific manuscripts. Compared with The AI Scientist (v1, arXiv:2408.06292), it removes the reliance on human-authored code templates, generalizes across machine-learning domains, and uses a progressive agentic tree search managed by a dedicated experiment-manager agent; its AI reviewer adds a vision-language-model feedback loop for figures. Its paper reports submitting three fully autonomous manuscripts to a peer-reviewed ICLR workshop, one of which scored above the average human acceptance threshold. Code is open-sourced at https://github.com/SakanaAI/AI-Scientist-v2.

# Papers

* [Sage-Taiyi](../papers/2611.12762.md) - the strongest baseline on Taiyi-Bench (47.85 Overall against Sage-Taiyi's 53.95, both on GPT-5.6-Sol) and on AgentIdeaBench (6.852 against 7.195), run with its ideation stage only.
* [EvoScientist](../papers/2603.08127.md) - one of the open-source baselines compared directly, and the source of the paper-writing module EvoScientist reuses for its end-to-end evaluation.
* [Spark-to-Paper](../papers/2608.11924.md) - compared in a table on citation validity, figure editability, cost, and wall-clock time, using figures from AI Scientist-v2's public documentation rather than a rerun.
* [ARIS](../papers/2605.03042.md) - contrasted as end-to-end idea-to-paper automation.
* [ResearchStudio-Idea](../papers/2607.04439.md) - listed among end-to-end AI scientists that automate more of the research lifecycle, while ResearchStudio-Idea stops before experiments.
* [ASI-Bench](../papers/2608.17271.md) - cited among AI Scientist systems for agentic tree search that reduces reliance on human templates.
* [PaperGym](../papers/2608.31119.md) - cited with The AI Scientist as an agent-based pipeline with dedicated per-stage modules.

# Notes

In this wiki only Sage-Taiyi and EvoScientist run AI Scientist-v2 as a baseline; Sage-Taiyi runs it without its experiment and writing stages, so that comparison covers ideation only.
