---
type: Term
title: LLM-as-a-Judge
description: Using a language model to score, rank, or select other model outputs in place of human or programmatic evaluation.
tags:
- evaluation
- llm-agents
timestamp: 2026-07-07T00:00:00Z
---

# Definition

LLM-as-a-judge uses a language model as the evaluator of candidate outputs — scoring, ranking, or choosing among them — where ground-truth signals or human judging are unavailable or too expensive. Judge quality bounds any system built on it: a miscalibrated judge silently misdirects whatever selection, weighting, or filtering it drives.

# Papers

* [Self-Evolving Multi-Agent Systems via Decentralized Memory](../papers/2605.22721.md) - an LLM-as-a-judge reweights each agent's exploitation and exploration memory pools online from stage-wise feedback; the paper lists judge quality as a key dependency of the results.

# Notes

Candidate future links: papers that use LLM judges for skill validation or for constructing verification signals.
