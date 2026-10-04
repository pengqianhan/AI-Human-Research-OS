---
type: Benchmark
title: Terminal-Bench
description: A benchmark suite for evaluating AI agents on hard, realistic tasks in command-line environments.
resource: https://arxiv.org/abs/2601.11868
tags:
- benchmarks
- shell-agents
- coding-agents
- agent-harness-engineering
timestamp: 2026-10-04T00:00:00Z
---

# Definition

Terminal-Bench evaluates AI agents on multi-step tasks performed through a command-line environment, including tool use, file manipulation, process management, and other long-horizon interactions with verifiable outcomes. It is useful for separating the contribution of a base model from the surrounding terminal-agent harness, although comparisons are only clean when models, tools, runtime surfaces, task splits, and scoring protocols are aligned.

# Papers

* [Toward Generalist Autonomous Research via Hypothesis-Tree Refinement](../papers/2606.11926.md) - uses Terminal-Bench 2.0 harness engineering as one of six Autonomous Optimization tasks for Arbor.
* [MemoHarness](../papers/2607.14159.md) - uses an 18-task held-out Terminal-Bench split for its main fixed-harness comparison, cross-model transfer study, and cost analysis.
* [LongHorizon-Harness](../papers/2608.01964.md) - evaluates on Terminal-Bench 2.1 via Harbor/Docker, improving Qwen 3.7-Plus with Claude Code from 69.7% to 77.2% success rate.
* [LLM-as-a-Verifier](../papers/2607.05391.md) - uses Terminal-Bench V2/2.0 as the primary testbed for its verification-scaling ablations (granularity, repeated evaluation, criteria decomposition) and its headline best-of-N selection result (86.5% vs. an 83.1% Pass@1 baseline, with a 98.9% oracle Pass@K ceiling).
* [StateM](../papers/2608.15089.md) - reports a 95.28% raw public-submission score on Terminal-Bench 2.1 with GPT-5.6 Sol xhigh via a frozen, GPT-5.5-developed control-layer runbook, while explicitly disclosing adjudication sensitivity (four/nine flagged trajectories scored as zero would give 94.38%/93.26%).
* [Recuris](../papers/2608.24876.md) - uses Terminal-Bench 2.1 (87 tasks, Terminus-2 agent) for its test-time adaptation mode specifically, because the benchmark's tasks share no tools or policies across each other — cross-task memory evolution admits no patch in thirteen runs, so only within-task retry-plus-adaptation applies, and the paper's own decomposition shows the attempt-budget/retry effect (+26.4 points) dominates the learning effect from adaptation itself (+2.3 points, interval including zero).
* [AutoSaddler](../papers/2608.23041.md) - automatically optimizes a Terminus 2 base harness on Terminal-Bench 2.0 (40 test tasks), raising Pass@1 from a 40.0% base to 50.0%, surpassing both automated baselines (GEPA 42.5%, Meta-Harness 43.3%) and the manually expert-tuned Terminus KIRA harness (47.5%).
* [Code2Skill](../papers/2609.05571.md) - uses TerminalBench (Merrill et al., 2026) as one of eight evaluation benchmarks; retrieved code-derived skills from CodeSkillBank show large gains under generation-time prompting for DS4-Flash specifically (Sec. 5.4), among the paper's strongest single-benchmark results.
* [RRSI](../papers/2609.24972.md) - evolves the coding harness on Terminal-Bench 2.1 (89 tasks): Claude Opus 4.8 74.2 → 80.2, Gemini 3.5 Flash 64.6 → 78.7, and the Gemini-evolved harness lifts the unseen Gemini 3.1 Flash Lite 11.2 → 14.6.
* [ZGCM-1](../papers/2609.13356.md) - appendix diagnostic on Terminal-Bench 2.0: its best audited 7B run resolves 2 of 89 tasks (2.25%).
* [TraceDance](../papers/2609.33295.md) - cited, not run: Terminal-Bench is the paper's example of outcome-only evaluation by final container state, and GPT-5.6-Sol's higher reported Terminal-Bench 2.1 score than DeepSeek-V4-Pro and GLM-5.2 does not carry over to TraceDance's behavior-at-decision-point benchmarks.
* [Raven](../papers/2609.33439.md) - reuses HarnessBank's result on Terminal-Bench-2: evolving the harness around a frozen Qwen3.6-27B raises held-out Pass@1 from 36.1 to 45.4 (three attempts per task).
* [Mid-Harness](../papers/2609.39982.md) - main evaluation on TerminalBench-Lite (98 tasks, three runs each): per-step action verification lifts TMAX-9B Pass@1 from 50.00% to 57.14% (distilled verifier) and 68.03% (GPT-5.6 Sol); on Terminal-Bench 2.1 (89 tasks) TMAX-9B rises from 21.72% to 27.34% and Nemotron3 Ultra from 50.94% to 56.18%.
* [ActiveSaddler](../papers/2610.00906.md) - optimizes Terminus 2 on Terminal-Bench 2.0 (30 train, 19 dev, 40 test) with gpt-5.5: 80.0 ± 2.5 test Pass@1 against 72.5 for AutoSaddler with a fixed scenario order and 69.2 for the hand-engineered Terminus-KIRA; the 7.5-point gain is 3 of 40 tasks.
* [Context Language Models](../papers/2609.37725.md) - Terminal-Bench 2.1 and TBLite as the coding testbeds for zero-shot context management with Qwen3.6-27B at a 32K limit and 100-turn cap: CLM matches Codex-style summarization on TB2.1 at 70% of its prefix-reuse FLOPs and exceeds it on TBLite (73.7% against 67.0%) at 91% of its FLOPs, with MEM1, Self-Compact, ACM, and RLM as the other baselines.

# Notes

Results across these papers are not automatically comparable: they use Terminal-Bench in different optimization settings, model configurations, and evaluation protocols. StateM's own paper is a useful worked example of why: it reports its 95.28% figure as a raw, pre-adjudication public-submission score and separately discloses the adjudicated alternatives, rather than presenting one leaderboard number as final. Recuris is a further example from the other direction: it uses Terminal-Bench 2.1 specifically as a *negative* control for cross-task evolution, since the benchmark's lack of shared task structure is what forces the paper's within-task adaptation mode rather than its main cross-task loop. AutoSaddler is on the 2.0 rather than 2.1 split, so its numbers are not directly comparable to the 2.1-split papers above (StateM, LongHorizon-Harness, Recuris) despite the shared benchmark name; its own within-split comparison (against GEPA, Meta-Harness, and the manually-tuned Terminus KIRA, all also on 2.0) is the paper's actual apples-to-apples evidence. Code2Skill cites the same underlying benchmark (Merrill et al., arXiv:2601.11868) as "TerminalBench" without the hyphen and does not report a specific version split in the retrieved text, so its results are not version-matched against any of the other papers here.
