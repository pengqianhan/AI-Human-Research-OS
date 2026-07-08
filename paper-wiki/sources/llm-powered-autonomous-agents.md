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

Lilian Weng's post frames an LLM-powered autonomous agent as an LLM "brain"
wrapped by three components — **planning**, **memory**, and **tool use**. It is a
synthesis of others' work, not new experiments; its lasting value is the
organizing taxonomy (which became the canonical mental model for agents) and a
curated, mechanism-level map of the techniques under each component.

# Framework

`Agent = LLM controller + Planning + Memory + Tool use`, with memory modelled on
human memory types:

* **Planning** — turn a goal into ordered subgoals (task decomposition) and
  critique/repair past actions (self-reflection).
* **Memory** — *sensory* ≈ learned input embeddings; *short-term* ≈ what fits in
  the context window (in-context learning); *long-term* ≈ an external vector
  store the agent writes to and later retrieves from, giving persistence beyond
  the weights and the context limit.
* **Tool use** — call external APIs / expert modules for what the LLM is bad at
  (fresh facts, exact arithmetic, code execution, domain actions).

# Key Techniques

## Planning — task decomposition

* **Chain-of-Thought (CoT):** "think step by step" spends test-time compute to
  break a hard problem into interpretable substeps. The baseline everything else
  builds on.
* **Tree-of-Thoughts (ToT):** generalizes CoT from one linear chain to a *tree* —
  generate several candidate thoughts per step, then search the tree
  (breadth-/depth-first) with an evaluator (a classifier or majority vote) to
  pick promising branches. Turns reasoning into explicit search.
* **LLM+P:** offload long-horizon planning to a *classical planner*. The LLM
  translates the problem into PDDL, a domain planner solves it optimally, and the
  LLM translates the plan back to language — trading the LLM's weak long-range
  planning for a solver's guarantees.

## Planning — self-reflection

* **ReAct:** interleave **Thought → Action → Observation**. The action space is
  extended to include both tool calls and natural-language reasoning, so the
  agent reasons and acts in one loop and leaves an interpretable trace. This is
  the pattern most modern tool-using agents inherit.
* **Reflexion:** wraps ReAct with an improvement loop across trials. After an
  episode a heuristic flags inefficiency or hallucination; the failure plus an
  ideal correction is stored as a *reflection* in memory and prepended on the
  next attempt, so the agent learns from its own mistakes without weight updates.
* One-line: **Chain-of-Hindsight** (fine-tune on sequences of ranked past
  attempts + feedback so the model learns to produce the best next completion)
  and **Algorithm Distillation** (behavior-clone across concatenated multi-episode
  RL histories to get in-context RL). Both bake self-improvement into *training*
  rather than the inference loop.

## Memory — long-term store + retrieval

The load-bearing idea: long-term memory is an external vector store queried by
**Maximum Inner Product Search (MIPS)** — approximate nearest-neighbor search
that trades a little accuracy for a large speed-up, which is what makes retrieval
over a huge memory tractable.

* One-line, the ANN families the post lists: **LSH** (hash similar vectors to the
  same bucket), **ANNOY** (random-projection trees), **HNSW** (hierarchical
  small-world graphs — shortcuts on top, refine downward), **FAISS** (cluster +
  coarse-to-fine quantized search), **ScaNN** (anisotropic quantization that
  preserves inner-product ranking). Same job, different accuracy/speed/memory
  tradeoffs.

# Tool Use

* **MRKL:** route each query to the right specialized module (neural or symbolic)
  — the LLM decides *who* handles it and delegates the actual computation,
  because LLMs are unreliable at precise argument extraction and exact math.
* **Toolformer / TALM:** *learn* to call tools by fine-tuning on self-annotated
  API calls, keeping a call in the training data only if it demonstrably improves
  the output — so the model learns *when* a tool helps, not just how to format it.
* **HuggingGPT:** the LLM is a *controller* — it parses the request into a task
  plan, selects Hugging Face models by matching task type to model description,
  runs them, and synthesizes the results. An agent orchestrating a zoo of expert
  models.
* One-line: **API-Bank** — benchmark grading three levels of tool skill: call an
  API correctly, retrieve the right API, and plan a sequence of API calls.

# Case Studies

* **ChemCrow** — an LLM + 13 expert chemistry tools driven in ReAct style. The
  sharp finding: human experts rated it well above GPT-4, while an LLM-based
  evaluation did not — evidence that **an LLM often lacks the domain expertise to
  judge its own failures**, so self-evaluation can be misleading.
* **Generative Agents** — 25 sandbox characters whose architecture is a clean
  instance of the whole framework: a **memory stream** (timestamped
  observations), a **retrieval** module ranking by recency + importance +
  relevance, a **reflection** step that distills memories into higher-level
  takeaways, and a **planning/reaction** layer. Produces emergent social behavior
  (information spreading, coordinating events).
* One-line: **AutoGPT** and **GPT-Engineer** — early proof-of-concept autonomous
  task/coding agents that made the ideas concrete (and exposed the reliability
  gaps below).

# Takeaways

How this maps onto this Research OS's own agent work:

* **The three-component lens is a checklist for our agents.** For any agent the
  OS runs, ask: what is its *planning* (decomposition + reflection), its *memory*
  (what persists vs. what's in context), and its *tools*? The circle_packing /
  experiment agents can be audited against exactly these three.
* **Long-term memory = external store + on-demand retrieval** is *precisely* the
  paper-wiki / OKF design: durable notes on disk, pulled in by relevance when
  needed. This post is a conceptual ancestor of the wiki's progressive-disclosure
  idea, and the Generative-Agents retrieval score (recency + importance +
  relevance) is a concrete ranking recipe our memory layers could borrow.
* **Tool use = capability installed on demand** parallels the Research-skills-hub
  install-a-skill model — the LLM controller routes to a skill the way HuggingGPT
  routes to a model.
* **Reflexion's "store the failure + its correction, prepend next time"** is a
  reusable pattern for the OS's `OS Feedback` / evaluator loop: keep negative
  results as reusable constraints, not just scores.

# Open Questions

The post's three limitations, and where they stand from 2026:

* **Finite context length** — caps history, instructions, and tool outputs;
  retrieval helps but its representation is weaker than full attention.
  **2026 note:** long-context models (100K–1M+ tokens) blunted this, but the
  retrieval-vs-attention tradeoff and "lost in the middle" degradation persist.
* **Long-horizon planning & error recovery** — agents stay brittle: they lose the
  thread over long tasks and recover poorly from surprises, unlike humans who
  learn by trial and error. **2026 note:** still the core open problem; hypothesis
  trees / persistent research state (e.g. Arbor) are attempts at exactly this.
* **Natural-language interface reliability** — LLM↔tool glue is flaky (formatting
  errors, non-compliance), so systems need heavy output-parsing. **2026 note:**
  largely addressed in practice by structured function-calling / tool schemas and
  protocols like MCP, rather than parsing free text.

# Related

* [LLM agents](../topics/llm-agents.md) — this post is a foundational map of the area.

This synthesis is a natural hub: ReAct, Reflexion, Toolformer, and Generative
Agents could each become their own wiki paper or concept page later.

# Citations

[1] [Lilian Weng, "LLM Powered Autonomous Agents" (2023-06-23)](https://lilianweng.github.io/posts/2023-06-23-agent/) — synthesis; individual techniques are attributed to their original papers within the post. Mechanism summaries here are distilled from that post; the "2026 note" lines are the reader's own hindsight, not the post's claims.
