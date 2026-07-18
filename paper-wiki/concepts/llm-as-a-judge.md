---
type: Term
title: LLM-as-a-Judge
description: Using a language model to score, rank, or select other model outputs in place of human or programmatic evaluation.
tags:
- evaluation
- llm-agents
timestamp: 2026-07-18T22:59:11Z
---

# Definition

LLM-as-a-judge uses a language model as the evaluator of candidate outputs — scoring, ranking, or choosing among them — where ground-truth signals or human judging are unavailable or too expensive. Judge quality bounds any system built on it: a miscalibrated judge silently misdirects whatever selection, weighting, or filtering it drives.

# Papers

* [Self-Evolving Multi-Agent Systems via Decentralized Memory](../papers/2605.22721.md) - an LLM-as-a-judge reweights each agent's exploitation and exploration memory pools online from stage-wise feedback; the paper lists judge quality as a key dependency of the results.
* [ScientistOne](../papers/2605.26340.md) - uses LLM judgments for specification violations, method-code alignment, citation entailment, and review; a documented missed violation and sampled-only I4 validation show the judge's limits.
* [ResearchStudio-Idea](../papers/2607.04439.md) - uses blind repeated LLM-based skills to judge proposal quality and prior-art novelty; the authors explicitly scope the result as automated-judge evidence rather than human acceptance evidence.
* [AI Agents Do Not Fail Alone](../papers/2607.14275.md) - uses multi-juror consensus to score both context criteria and downstream behavior; score isolation prevents direct circularity but not shared-rater or shared-rubric bias.

# Notes

ScientistOne illustrates a useful hybrid pattern: use deterministic checks for exact numeric comparisons and artifact existence, reserve LLM judges for semantic alignment, apply repeated voting where possible, and retain human review for consequential flags. Its audit also shows that majority voting can still miss evaluator exploitation.

ResearchStudio-Idea exposes a complementary failure: “novel-but-empty” proposals can score highly on collision-based novelty because vagueness leaves little precise prior art to match. Idea-stage evaluation should therefore combine specificity, quality, and novelty rather than optimize a single judge score.

AI Agents Do Not Fail Alone adds a measurement-validity distinction: keeping a diagnostic score out of the outcome formula prevents direct score reuse, but two LLM-judged instruments can still correlate because they share judge models, rubric language, or latent preferences. Independent human calibration and cross-family judges are needed before interpreting such correlations as criterion validity.
