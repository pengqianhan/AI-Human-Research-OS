---
type: Benchmark
title: JobBench
description: Benchmark of 65 end-to-end professional job tasks in seven occupational domains, each with input documents and requested deliverables that a model judge scores against a weighted rubric.
resource: https://arxiv.org/abs/2605.26329
tags:
- benchmarks
- professional-work
- long-horizon-agents
- llm-as-a-judge
timestamp: 2026-10-14T00:00:00Z
---

# Definition

JobBench (Li et al., 2026, "JobBench: Aligning Agent Work with Human Will", arXiv:2605.26329) evaluates agents on end-to-end professional tasks. As described by Harness², it contains 65 tasks grouped into seven occupational domains; each task supplies input documents and asks for a set of deliverables, and the deliverables are judged against a weighted rubric, the task score being the weighted total over the maximum. Executions are long: in Harness²'s base runs with Gemini 3.5 Flash under OpenCode a task takes about 64 model turns.

# Papers

* [Harness²](../papers/2610.14224.md) - evaluates on the 34 test tasks of a frozen 31/34 split with Claude Opus 4.8 as judge; one improvement step adds 1.2 to 4.5 points over the base harness across four executor-harness pairs, and parallel recursion 3.0 to 4.2 more.
* [RRSI](../papers/2609.24972.md) - out-of-distribution target for harnesses evolved on Harvey LAB; RRSI reaches 40.7 against 36.0 for the starting harness, the best of five evolution methods.
* [Atria Dawn](../papers/2609.15818.md) - listed among the General Agentic Intelligence benchmarks in its model-evaluation table, with scores reported as published on the official release website.
* [Raven](../papers/2609.33439.md) - its new MAOB planning benchmark (140 requests from 137 occupations) is patterned on GDPval and JobBench without reusing their text.

# Notes

Scores are judge outputs and are not comparable across these papers: Harness² uses Claude Opus 4.8 as judge (the same model as its harness editor and selector), and the RRSI note records Gemini 3.5 Flash as that paper's judge. The splits also differ. This page's definition follows Harness²'s benchmark appendix; the JobBench paper itself has not been added to the wiki.
