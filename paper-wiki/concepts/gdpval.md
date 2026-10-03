---
type: Benchmark
title: GDPVal
description: Benchmark of 1,320 economically valuable work tasks across 44 occupations, graded on produced deliverables by expert-written rubrics and reported as win rates or Elo from pairwise comparisons against human work; GDPVal-AA is its 220-task gold subset.
resource: https://arxiv.org/abs/2510.04374
aliases:
- GDPval
- GDPVal-AA
tags:
- benchmarks
- working-agents
- professional-work
timestamp: 2026-10-03T00:00:00Z
---

# Definition

GDPVal (Patwardhan et al., arXiv:2510.04374, 2025) evaluates AI on real-world, economically valuable work: 1,320 tasks drawn from 44 occupations that contribute most to U.S. GDP, each with reference deliverables produced by professionals. Outputs are graded with expert-written rubrics and compared pairwise against human work, yielding win rates or Elo-style ratings. The 220-task gold subset (GDPVal-AA) is what training papers in this wiki report on; because it draws from the O*NET occupation taxonomy, papers that seed training data from O*NET audit it for overlap.

# Papers

* [Apodex 1.1](../papers/2608.23283.md) - one of its professional-work benchmarks (with APEX-Agents), where Apodex 1.1 Agent Team scores below Claude Opus 5 in the paper's own table.
* [Atria Dawn](../papers/2609.15818.md) - one of the 12 General Agentic Intelligence benchmarks in its model-evaluation table.
* [RRSI](../papers/2609.24972.md) - an out-of-distribution transfer target for the agentic-workspace domain, scored by a three-judge cross-vendor panel in both presentation orders; RRSI reaches 52.3 against 48.8 for the starting harness, while two other evolved harnesses end below it.
* [Raven](../papers/2609.33439.md) - in the reused SkillCorpus experiments, retrieved skills add +1.51 ± 0.49 points pooled; Raven-Design deliverables are also scored by an internal GPT-5.6-Luna grader, and the MAOB planning benchmark is patterned on GDPVal's occupations without reusing its text.
* [GraphForge](../papers/2609.38923.md) - primary evaluation as Bradley-Terry Elo over GDPVal-AA anchored at GLM-5.3 (OpenHands) = 1667: SFT lifts Qwen3.6-27B from 1380.0 to 1445.7 under OpenHands with overlapping bootstrap intervals; a contamination audit finds zero shared files and 13 of 44 occupations covered, with SFT gains no smaller on uncovered occupations.

# Notes

GDPVal results here are judge-scored and reported on different scales (win rates, internal Elo pools, panel judgments), so they are not comparable across papers. GraphForge's confidence intervals show how noisy 220 pairwise-judged tasks are: its rejection-fine-tuning arms cannot be separated on GDPVal even where the other two benchmarks order them cleanly. RRSI uses deterministic engineering simulators in a separate domain specifically to rule out judge-pleasing as the source of its GDPVal transfer.

# Related

* [LLM-as-a-Judge](llm-as-a-judge.md) - GDPVal grading is rubric-guided judging of deliverables, which is why RRSI pairs it with simulator-scored domains and GraphForge anchors the judge to the files that verify each criterion.
