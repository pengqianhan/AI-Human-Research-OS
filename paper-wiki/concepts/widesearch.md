---
type: Benchmark
title: WideSearch
description: A bilingual benchmark for broad information-seeking agents that must collect large sets of verifiable facts into tables.
resource: https://arxiv.org/abs/2508.07999
tags:
- benchmarks
- information-seeking
- web-agents
- table-completion
timestamp: 2026-07-21T22:58:23Z
---

# Definition

WideSearch is a benchmark for agentic broad information seeking. It contains 200 manually curated questions—100 English and 100 Chinese—from real user queries across more than 15 domains. Each task asks an agent to gather a large set of objectively verifiable atomic facts and organize them into a complete table.

Its item-level metrics score cells independently, while row-level metrics require every cell in a row to be correct. The latter is stricter and makes omissions or one incorrect attribute invalidate the whole entity record.

# Papers

* [SearchOS-V1](../papers/2607.15257.md) - uses WideSearch for its main table-completion results and its schema, scheduling, middleware, and skill analyses.

# Notes

SearchOS reports best-of-three (`Max@3`) results, so its numbers should not be compared with single-run or mean-run WideSearch results without aligning the protocol, model, tools, search budget, and time limit.

# Related

* [GISA](gisa.md) — complements broad table collection with item, set, list, and table question formats.
