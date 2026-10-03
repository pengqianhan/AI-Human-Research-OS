---
type: Benchmark
title: WebArena
description: Self-hosted realistic web environment of 812 long-horizon tasks across e-commerce, shop admin, GitLab, Reddit-style forum, map, and wiki sites, scored by functional evaluators; the standard testbed for browser agents and, through its sites and the smaller WebArena-Lite subset, for web-agent fine-tuning.
resource: https://arxiv.org/abs/2307.13854
tags:
- benchmarks
- web-agents
- browser-agents
timestamp: 2026-10-03T00:00:00Z
---

# Definition

WebArena (Zhou et al., arXiv:2307.13854) hosts fully functional, self-contained websites (an online store, its admin panel, GitLab, a Reddit-like forum, a map, and a wiki) and poses 812 natural-language tasks whose outcomes are checked by programmatic evaluators (exact or fuzzy matches on answers, or checks on the resulting site state). Agents act through a browser interface over the page's accessibility tree or screenshots. Papers in this wiki use the full task set, deterministic subsets, or WebArena-Lite, a smaller subset used for training-focused studies.

# Papers

* [OpenHands](../papers/2407.16741.md) - one of 15 integrated benchmarks; its BrowsingAgent with Claude-3.5-Sonnet reaches 15.5% on the 812 tasks, competitive among zero-shot prompting agents but below trained specialists.
* [Agentic ESOpt](../papers/2608.17310.md) - full-parameter evolution-strategies fine-tuning of Qwen3.5-27B on WebArena-Lite: 29.47% → 36.16% without skills and 33.94% → 36.36% with a Trace2Skill bank, with per-category gains on GitLab, OSS, and Map.
* [EnvHarness](../papers/2608.19880.md) - one of five existing environments it wraps with plug-in components that reshape initial state, rules, or task composition while preserving the original verifier.
* [X-Tree](../papers/2609.32993.md) - offline RL testbed with no environment at training time: 256 skills mined from 7,974 Go-Browse trajectories; Qwen2.5-7B normalized SR on 694 deterministic tasks rises from 18.4 (SFT) to 22.9, with gains concentrated on the procedure-heavy admin, GitLab, and shopping sites.

# Notes

Scores are not comparable across these papers: OpenHands reports the full 812 tasks with a prompting agent, Agentic ESOpt the WebArena-Lite subset, and X-Tree a normalized SR on 694 deterministic tasks that also credits exact-match tasks when the gold string appears in the output. X-Tree's per-site breakdown is a useful reading of the benchmark itself: gains from procedural structure land on admin, GitLab, and shopping, while Reddit, map, and wiki tasks depend more on query formulation.
