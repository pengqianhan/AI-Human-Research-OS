---
type: Benchmark
title: SpreadsheetBench
description: Real-world spreadsheet-manipulation benchmark built from online Excel-forum questions, judged online-judge style by producing the expected result on several test workbooks per task; SpreadsheetBench II extends it to end-to-end business workflows over multi-sheet workbooks built from authentic business data.
resource: https://arxiv.org/abs/2406.14991
aliases:
- SpreadsheetBench II
- SpreadsheetBench 2
tags:
- benchmarks
- spreadsheet-agents
- data-agents
timestamp: 2026-10-03T00:00:00Z
---

# Definition

SpreadsheetBench (Ma et al., arXiv:2406.14991, NeurIPS 2024) collects spreadsheet-manipulation instructions from online Excel forums. Each task asks the agent to read and modify workbook files and is scored like an online judge: a solution counts only if it produces the expected result on multiple spreadsheet files serving as test cases. SpreadsheetBench II (Zhu et al., arXiv:2606.29955, 2026) is the successor used for working-agent evaluation: expert-annotated end-to-end business workflows (generation, debugging, visualization) over multi-sheet workbooks built from authentic business data, reported as execution accuracy. Papers in this wiki use the original as a skill-optimization and environment-wrapping benchmark and the second version as a training-outcome benchmark.

# Papers

* [SkillOpt](../papers/2605.23904.md) - one of six benchmarks across seven target models; its largest single ablation degradation (−22.5 points) is on SpreadsheetBench.
* [SkillOpt-Lite](../papers/2607.03451.md) - one of six benchmarks, and the single case study for HarnessOpt, where a GPT-5.4-nano harness-plus-skill pair reaches 0.7758 against 0.7620 for GPT-5.5 with the standard harness.
* [EnvHarness](../papers/2608.19880.md) - one of five existing environments it wraps with plug-in components while preserving the original verifier.
* [RASO](../papers/2609.38024.md) - 400 tasks split 80 / 40 / 280; the benchmark with its largest gains (GPT-5.6-Luna 63.33 vs 57.02 for SkillOpt) and where 92.9% of retrieved skills come from a different harness, motivating Cross-Harness Adaptation.
* [GraphForge](../papers/2609.38923.md) - SpreadsheetBench II as one of three working-agent evaluation benchmarks: SFT on 2,169 synthesized trajectories lifts Qwen3.6-27B from 10.3 to 24.0 under Claude Code, and evidence-anchored rubric selection gives the clearest rejection-fine-tuning advantage here (+1.0 vs −1.8 for an unanchored judge).

# Notes

The two versions are different task sets and metrics, so GraphForge's SpreadsheetBench II numbers are not comparable with the others' SpreadsheetBench scores. Within the original benchmark, SkillOpt, SkillOpt-Lite, and RASO use the same 400-task pool but RASO's splits follow SkillOpt's while SkillOpt-Lite reports its own protocol; the three agree that spreadsheet tasks are where skill text and harness changes move scores most, because the deliverable is checked deterministically.
