---
type: Term
title: Context compaction
description: Replacing part of an agent's accumulated context (older turns, tool outputs, or screenshots) with a shorter summary or placeholder so a long task can continue within the context window; papers here differ on who triggers it, what it may discard, and what it costs in prompt-cache reuse and training.
tags:
- context-engineering
- long-context-reasoning
- agent-harness-engineering
timestamp: 2026-10-17T00:00:00Z
---

# Definition

Context compaction is the harness or model operation that shrinks an agent's working context during a task: older history is summarized, tool outputs are replaced by short placeholders, or images are dropped, and execution continues from the shortened prefix. It is the most common task-agnostic answer to context limits and to the quality loss described as [context rot](context-rot.md). The papers here vary it along four axes: *who triggers it* (a fixed length threshold set by the harness, a schedule, or the model itself); *what it removes* (a free-form summary of everything, or only bulky tool observations); *what it costs* (rewriting the prefix invalidates the prompt cache from that point on); and *how training treats it* (each compaction starts a new context, so the trajectory no longer fits single-context RL).

# Papers

* [Mosaic](../papers/2610.22174.md) - treats each compaction as a session boundary in RL: a compaction session maps the full history to the compressed prefix, is trained as its own segment, and is rewarded by how much the summary raises the policy's likelihood of the reference answer, normalized separately from normal sessions because its raw gains run lower.
* [OpenGCUA](../papers/2610.22200.md) - two harness-side policies for a computer-use agent: micro-compaction, which replaces older tool outputs with placeholders in batches and lowers cache-hit rates (75.6% to 68.6%, 61.9% to 58.9%), and a rolling screenshot buffer, which drops older images in batches and raises them, neither lowering task score.
* [Self-evolving Agent Harness](../papers/2610.18813.md) - lists context compaction (summarization, retention and trigger policies, pruning tool outputs) as one of seven runtime functions of a harness, and states that compacting under fixed rules is not harness self-evolution while changing the compaction policy from feedback would be.
* [Recursive Language Models](../papers/2512.24601.md) - argues compaction assumes early details can be summarized away, which fails on dense inputs: a GPT-5 summary agent scores 70.47 on BrowseComp-Plus and 0.01 on OOLONG-Pairs.
* [Context Language Models](../papers/2609.37725.md) - places harness-scheduled compaction (Codex CLI, Terminus 2, Cursor's self-summarization) and model-triggered compaction actions (AutoCompact, Self-Compact) below a model that edits its whole context as a file, and beats harness-defined and action-based compaction on BrowseComp-Plus zero-shot.
* [SoL-Pi](../papers/2609.20519.md) - Online Context Compact reconsiders compaction at each completed plan step and runs it only when projected input-token savings exceed the estimated cost of rewriting the prompt cache, with a larger margin for each later compaction.
* [Apodex 1.1](../papers/2608.23283.md) - tiered compaction triggered by the provider's reported token usage, evicting tool observations before falling back to an LLM summary, with coordination state kept outside the message history and re-injected so plans survive compaction.
* [MAI-Gym](../papers/2610.20939.md) - window-wise history for GUI RL: windows of 10 steps overlapping by 2, appended within a window, with older screenshots collapsed to placeholders (text kept) at boundaries so the prompt prefix changes once every 8 steps; prefix-cache hits rise from 42.5% to 85.9% against step-wise history, and the same windows become training samples.
* [AutoSFT](../papers/2610.22194.md) - a single research agent's 258,400-token session is compacted ten times in 11.5 hours, mostly because of training and evaluation output; moving execution into a separate executor session halves compactions to five.

# Notes

Two papers measure the cost side the others leave out. SoL-Pi gates compaction on prompt-cache rewrite cost, and OpenGCUA measures cache-hit rate directly: dropping old content in batches (its rolling screenshot buffer) disrupts the cached prefix less often than per-step replacement. Recursive Language Models and Context Language Models dispute compaction itself, arguing that what a summary may discard depends on the task, while Mosaic accepts compaction and asks how to train through it. Context Language Models also cites a report of models inserting instructions into compaction summaries, a persistence risk for any summary that survives across turns.

MAI-Gym's window-wise history and OpenGCUA's rolling screenshot buffer are the same move from the same team: remove old images in batches so the cached prefix changes rarely. MAI-Gym adds that the windows double as training sequences, which makes the context policy part of the RL recipe, since the policy only ever sees between 3 and 10 recent screenshots. AutoSFT instead treats compaction as a symptom, removed by isolating execution rather than by tuning the compactor.

# Related

* [Context engineering](../topics/context-engineering.md)
* [Long-context reasoning](../topics/long-context-reasoning.md)
* [Agent harness engineering](../topics/agent-harness-engineering.md)
* [Context rot](context-rot.md) - the quality loss as context grows that compaction is meant to avoid.
