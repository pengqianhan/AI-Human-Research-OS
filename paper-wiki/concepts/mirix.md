---
type: Method
title: MIRIX
description: A multi-agent memory system for LLM agents with six typed memory components (Core, Episodic, Semantic, Procedural, Resource, Knowledge Vault), each managed by its own agent under a coordinating manager; a common baseline in agent-memory comparisons and the base of MIRIX-2.0.
resource: https://arxiv.org/abs/2507.07957
tags:
- agent-memory
- multi-agent-systems
- multimodal-memory
timestamp: 2026-11-16T00:00:00Z
---

# Definition

MIRIX (arXiv:2507.07957, 2025; "MIRIX: Multi-Agent Memory System for LLM-Based Agents", Yu Wang and Xi Chen) is a modular memory system that splits long-term memory into six structured types, Core, Episodic, Semantic, Procedural, Resource Memory, and Knowledge Vault, and uses a multi-agent framework to coordinate updates and retrieval across them. According to its abstract, it handles multimodal input such as streams of computer screenshots: on ScreenshotVQA it reports 35% higher accuracy than a RAG baseline with 99.9% less storage, and on LoCoMo it reports 85.4%. It also ships as an application that builds a personal memory base from the user's screen.

# Papers

* [MIRIX-2.0](../papers/2611.12068.md) - keeps the six typed writers as the system of record and adds a provenance hypergraph index, budgeted retrieval, and AutoDream consolidation; MIRIX-1.0 serves as the flat-memory configuration M0 (85.7% on LoCoMo in that paper's runs).
* [MemOS](../papers/2507.03724.md) - one of the memory baselines MemOS reports outperforming on LoCoMo, LongMemEval, PreFEval, and PersonaMem, all on a shared GPT-4o-mini backbone.
* [Seeing, Maintaining, and Learning](../papers/2610.19366.md) - survey example of perception-to-text memory: MIRIX routes screens and dialogue to six specialized textual memory components.

# Related

* [Agent memory](../topics/agent-memory.md) - the topic where MIRIX-style typed memories are compared with graph, OS-style, and parametric designs.
