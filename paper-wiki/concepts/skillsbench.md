---
type: Benchmark
title: SkillsBench
description: An 87-task, 8-domain benchmark with curated Agent Skills and deterministic verifiers that measures how much Skills help LLM agents by running each task with and without them.
resource: https://arxiv.org/abs/2602.12670
tags:
- benchmarks
- agent-skills
- paired-evaluation
timestamp: 2026-09-30T00:00:00Z
---

# Definition

SkillsBench (Li et al., 2026) measures whether Agent Skills, structured packages of procedural knowledge loaded by an agent at inference time, actually improve task success. Its current inventory has 87 tasks across 8 domains, each paired with curated Skills and a deterministic verifier, and every task is run under matched no-Skills and curated-Skills conditions. In the benchmark's own latest aggregate evaluation over 18 model-harness configurations, curated Skills raise the average pass rate from 33.9% to 50.5% (+16.6 points), with per-configuration gains from +4.1 to +25.7 points, and focused Skills of at most three modules beat larger bundles.

# Papers

* [Raven](../papers/2609.33439.md) - in the reused SkillCorpus experiments, skills *retrieved* from a large catalog (at most two bodies) rather than the curated per-task Skills lift pooled Pass@1 by +7.5±2.3 points; Raven gains 6.5 and 13.4 points against OpenClaw's 4.2 and 5.8, reaching 22.6% from a 9.2% no-skill baseline with Qwen3.5-397B-A17B.
* [Omni-IO Skills](../papers/2609.31847.md) - cited as evidence that curated Skills help agents on expert tasks, motivating its multimodal Skill library; not evaluated on SkillsBench.
* [SkillOpt](../papers/2605.23904.md) - cited in related work as framing skills as reusable procedural knowledge; its own evaluation uses six other benchmarks.
* [Atria Dawn](../papers/2609.15818.md) - one of the 12 General Agentic Intelligence benchmarks in its model table, where it places second within 2 points of the top reported score, using scores from the official release website.
* [CompoWorld](../papers/2609.33665.md) - run with OpenHands and skills (Avg@3); training on composed environments adds 15.19 points over the backbone, peaking at 45.13 with 1K SFT examples and falling to 40.91 at 3K.

# Notes

Scores are not comparable across these papers because the Skill condition differs. SkillsBench's own protocol gives each task its curated Skills; the SkillCorpus experiments reported in Raven retrieve at most two skills per task from a curated catalog built from a crawl of about 821,000 skill files, and start near 10% Pass@1 with Qwen3.5 models; and CompoWorld treats SkillsBench as one of eight general agent benchmarks for a fine-tuned model. Harness choice also matters: with identical skill selections, Raven turned skills into larger gains than OpenClaw on both backbones.

# Related

* [Agent skill libraries](../topics/agent-skill-libraries.md) - the topic this benchmark most directly measures: whether a library of reusable procedures changes downstream task success.
