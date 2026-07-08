---
type: Reference
title: "LLM Powered Autonomous Agents"
description: A synthesis of LLM-agent architecture into three components — planning, memory, and tool use — with case studies and open challenges.
resource: https://lilianweng.github.io/posts/2023-06-23-agent/
authors:
- Lilian Weng
published: 2023-06-23
tags:
- llm-agents
- agent-architecture
- survey
status: read
priority: high
timestamp: 2026-07-08T00:00:00Z
---

# Overview

Lilian Weng's post (2023-06-23) frames an LLM-powered autonomous agent as an LLM
"brain" wrapped by three components: **planning**, **memory**, and **tool use**.
It is a synthesis of others' work rather than new experiments — its value is the
organizing taxonomy and a curated map of techniques and example systems.

# Framework

Agent = LLM core + three components:

* **Planning** — break a task into subgoals and self-correct over past actions.
* **Memory** — mirror human memory: sensory → input embeddings; short-term → the
  in-context window; long-term → an external vector store queried by fast
  approximate-nearest-neighbor (ANN) search.
* **Tool use** — call external APIs / expert modules for capabilities the LLM
  lacks (search, code execution, domain tools).

# Key Techniques

* **Planning:** Chain-of-Thought, Tree-of-Thoughts, LLM+P (offload to a classical
  planner), ReAct (interleave reasoning and acting), Reflexion (verbal
  self-reflection stored in memory), Chain-of-Hindsight, Algorithm Distillation.
* **Memory / retrieval:** ANN indexes for long-term memory — LSH, ANNOY, HNSW,
  FAISS, ScaNN.
* **Tool use:** MRKL, TALM, Toolformer (LLM learns to call APIs), HuggingGPT (LLM
  routes to Hugging Face models), API-Bank (benchmark).

# Case Studies

* **ChemCrow** — chemistry agent with 13 expert-designed tools.
* **Generative Agents** — 25 sandbox characters combining memory, reflection, and
  planning (Sims-like simulation).
* **Autonomous scientific-discovery agent** — drug design and experiment planning.
* **AutoGPT / GPT-Engineer** — proof-of-concept autonomous task/coding agents.

# Takeaways

Reader notes for this Research OS's own agent work:

* The three-component split (planning / memory / tool use) is a clean lens for
  evaluating any agent system, including this OS's agents.
* "Long-term memory = external store + on-demand retrieval" mirrors the
  OKF/paper-wiki design: durable notes on disk, pulled in when needed — this post
  is a conceptual ancestor of the wiki's progressive-disclosure idea.
* "Tool use = add capability on demand" parallels the Research-skills-hub
  install-a-skill model.

# Open Questions

The post's stated limitations, still open:

* Finite context length caps how much history and instruction fit.
* Long-horizon planning and error recovery remain weak versus humans.
* Natural-language interfaces between the LLM and its tools are unreliable
  (formatting and parsing failures).

# Related

* [LLM agents](../topics/llm-agents.md) — this post is a foundational map of the area.

This synthesis is a natural hub: ReAct, Reflexion, Toolformer, and Generative
Agents could each become their own wiki paper or concept page later.

# Citations

[1] [Lilian Weng, "LLM Powered Autonomous Agents" (2023-06-23)](https://lilianweng.github.io/posts/2023-06-23-agent/) — synthesis; individual techniques are attributed to their original papers within the post.
