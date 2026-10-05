---
type: Benchmark
title: WebShop
description: Simulated e-commerce environment of about 1.18 million real products and 12,087 crowd-sourced shopping instructions, in which a text agent searches, opens product pages, picks options, and buys, rewarded by how well the purchase matches the requested attributes, options, and price.
resource: https://arxiv.org/abs/2207.01206
tags:
- benchmarks
- web-agents
- text-environments
timestamp: 2026-10-05T00:00:00Z
---

# Definition

WebShop (Yao et al., arXiv:2207.01206, NeurIPS 2022) is a simulated shopping website with about 1.18 million scraped products and 12,087 natural-language instructions describing a desired product. The agent acts through text commands (search a query, click a product, option, or page control, buy), and the episode reward in [0, 1] scores how many of the requested attributes, options, and the price constraint the purchased item satisfies; a purchase meeting every requirement counts as a success. It is a standard small-horizon web-agent testbed for both skill-level and weight-level agent training.

# Papers

* [RASO](../papers/2609.38024.md) - one of four skill-optimization benchmarks (80 / 40 / 500 split, 500 test instructions). GPT-5.6-Luna gains are within about a point (RASO 46.61 vs GEPA 45.54), but with Qwen-3.5-9B retrieval-grounded initialization lifts the skill from 12.54 to 23.27 and RASO reaches 24.73 against 13.43 for the best baseline.
* [X-Tree](../papers/2609.32993.md) - online RLVR and on-policy self-distillation testbed: 48 skills mined from 1,824 trajectories; the adaptive skill bonus adds up to +3.6 success and +4.6 graded score over outcome-only GRPO at 1.5B-7B, and a tree mined from only 100 trajectories already helps.
* [Source Preference in the Wild](../papers/2610.03195.md) - uses 1,500 WebShop goals only as Shopping requests with structured requirements, while the items come from live Tavily web search rather than the simulator; WebShop-request products also form the DPO pairs for its fake-source and Amazon-rebalancing experiments.

# Notes

The two papers report different metrics (RASO a single score averaged over 500 test instructions; X-Tree success and graded score over 512 held-out episodes) and change different layers (a context skill vs the weights), so their numbers are not comparable. Both find WebShop among their smaller-margin benchmarks for a frontier backbone and a larger-margin one for small open models.
