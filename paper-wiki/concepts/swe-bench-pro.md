---
type: Benchmark
title: SWE-bench Pro
description: An enterprise-software-engineering benchmark evaluating coding agents on repository-level tasks across multiple real codebases.
resource: https://arxiv.org/abs/2608.23041
tags:
- benchmarks
- software-engineering
- coding-agents
- agent-harness-engineering
timestamp: 2026-08-29T00:00:00Z
---

# Definition

SWE-bench Pro evaluates coding agents on enterprise-style, repository-level software-engineering tasks spanning multiple real codebases, distinct from SWE-bench Verified's GitHub-issue-resolution framing. As used in this wiki, it spans at least three repositories (Ansible, Flipt, Element-web) with tasks scored against a SWE-agent-framework baseline.

# Papers

* [MemoHarness](../papers/2607.14159.md) - uses SWE-Bench Pro as a secondary cross-dataset transfer target: a harness trained on Terminal-Bench transfers to SWE-Bench Pro with a +0.059 gain, one of the selective-transfer results in the paper's cross-dataset study.
* [AutoSaddler](../papers/2608.23041.md) - uses SWE-Bench Pro as one of three primary training/evaluation benchmarks (96 Ansible + 85 Flipt + 56 Element-web tasks), automatically optimizing a SWE-agent base harness from 37.3% to 46.9% Pass@1, ahead of both GEPA (42.5%) and Meta-Harness (35.3%).

# Notes

The two papers use SWE-Bench Pro differently and are not directly comparable: MemoHarness measures how well a harness *trained elsewhere* (on Terminal-Bench) transfers to SWE-Bench Pro, while AutoSaddler trains and evaluates a dedicated harness directly on SWE-Bench Pro's own training split. AutoSaddler's 46.9% Pass@1 is not a transfer number and should not be read as directly beating MemoHarness's +0.059 transfer delta, since the two report different quantities (absolute accuracy of a dedicated harness vs. a transfer gain over an untrained-on-this-benchmark base).
