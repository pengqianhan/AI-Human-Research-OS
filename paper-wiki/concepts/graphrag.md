---
type: Method
title: GraphRAG
description: Microsoft's graph-based retrieval-augmented generation, which uses an LLM to build an entity knowledge graph and pregenerated community summaries over a corpus and answers global questions by map-reducing over those summaries.
resource: https://arxiv.org/abs/2404.16130
aliases:
- Graph RAG
tags:
- retrieval-augmented-generation
- knowledge-graphs
- query-focused-summarization
timestamp: 2026-09-30T00:00:00Z
---

# Definition

GraphRAG (Edge et al., 2024, Microsoft) targets "global" questions about a whole corpus, such as "what are the main themes in the dataset?", which ordinary retrieval-augmented generation handles poorly because they are query-focused summarization rather than retrieval. An LLM builds a graph index in two stages: it derives an entity knowledge graph from the source documents, then pregenerates summaries for communities of closely related entities. At query time, each community summary produces a partial answer, and the partial answers are summarized into the final response. On datasets of about one million tokens, the original paper reports more comprehensive and more diverse answers than a conventional RAG baseline.

# Papers

* [Zep](../papers/2501.13956.md) - takes community detection and map-reduce-style community summarization from GraphRAG for its memory graph, while stating that its own retrieval (three search functions plus rerankers) differs from GraphRAG's map-reduce approach.
* [Jev-Mem](../papers/2609.23986.md) - lists GraphRAG among retrieval-side relatives (with RAPTOR, LightRAG, and HippoRAG) of its multi-graph agent memory; not run as a baseline.
* [Follow the Entities (CorpusMap)](../papers/2609.37226.md) - a retrieve-then-generate baseline on EnterpriseRAG-Bench, where it scores lowest of the four retrieval baselines (47.95 with GPT-5.5 and 43.46 with GPT-5.6 Luna) against CorpusMap's 76.60 and 73.20.

# Notes

GraphRAG and CorpusMap both build entity structure offline, but use it differently: GraphRAG folds the graph into retrieval and summarization, and the generator sees only what that step returns, whereas CorpusMap stores entity pages as files that an agent reads and follows. CorpusMap's benchmarks ask multi-document factual questions rather than the global sensemaking questions GraphRAG was designed for, so its low score there reflects task fit as well as the index (reader note).
