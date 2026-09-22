---
type: Topic
title: Data agents
description: Papers about LLM agents that fulfill natural-language instructions over heterogeneous structured and unstructured data — tables, files, and databases — and the intermediate layers that bridge agent tools and domain semantics.
tags:
- data-agents
- text-to-sql
- semantic-layer
- heterogeneous-data
timestamp: 2026-09-22T00:00:00Z
---

# Scope

This topic tracks agents that operate over heterogeneous data sources (relational databases, spreadsheets, files, documents) to answer natural-language requests, and the mechanisms — raw exploration, static semantic layers, or interactive intermediate layers — that let such agents discover and use domain structure they cannot see in advance. It is distinct from [Agent memory](agent-memory.md), which tracks persistent memory of conversational or task interaction, and from [Context engineering](context-engineering.md), which tracks context assembly more broadly; a data agent's ontology or semantic layer is one specific instance of governing what an agent knows about its environment, scoped to the data itself rather than task history or instructions.

# Papers

* [EvoOntology](../papers/2609.15779.md) - encapsulates a self-evolving ontology (typed content graph, schema, and tool layers) as an MCP server that a builder agent grounds in executable probe queries and an evolution agent then refines through attribution-guided, backbone-conditional typed edits; improves Trajectory-Wise accuracy on DDR-Bench by an average of +17.8 points across six LLM backbones, while a static-prompt semantic-layer baseline is inconsistent and sometimes regresses performance.

# Open Questions

* How should an ontology or semantic layer represent source authority, freshness, and precedence when multiple heterogeneous data sources disagree or overlap?
* Does exposing domain semantics through queryable MCP tools rather than static prompt injection generalize as a design principle beyond ontology layers, to other forms of agent-accessible structured knowledge?
* How should a self-evolving ontology's accepted edits be audited or rolled back when a backbone-conditional paired-validation gate admits a change that later proves harmful on genuinely new data?
* Since EvoOntology shows evolved ontologies do not transfer well across LLM backbones (every cross-backbone cell drops at least 6.6 points from the same-backbone diagonal), is backbone-specific evolution a fundamental limit of trajectory-grounded refinement, or an artifact of this paper's specific attribution/patch mechanism that a more backbone-agnostic design could avoid?
