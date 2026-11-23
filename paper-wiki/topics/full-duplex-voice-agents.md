---
type: Topic
title: Full-duplex voice agents
description: Papers about speech models that listen while speaking and also carry out tasks, either by calling tools themselves or by delegating to a backend agent, and about how task execution interacts with turn-taking.
tags:
- full-duplex
- voice-agents
- speech-language-models
- tool-use
- agent-delegation
timestamp: 2026-11-23T00:00:00Z
---

# Scope

This topic covers spoken agents that run in full-duplex mode (deciding continuously when to listen, speak, stop or resume) and that must also complete tasks during the conversation. Two architectures recur: a *frontend-backend* split, where a realtime speech model hands natural-language requests to a separate tool-using agent, and *direct* tool calling by the speech model itself. Papers here measure task success together with conversational behavior (turn-taking, interruptions, backchannels) and speech quality. General voice assistants without task execution, and speech recognition or synthesis alone, are out of scope.

# Papers

* [Gander](../papers/2609.08977.md) - a Cerebellum-Brain design: a streaming Thinker-Talker front predicts listen/speak/interrupt each one-second chunk and delegates to a training-free back brain (Codex or Claude Code) through structured task tool calls; best turn-taking timing on Full-Duplex-Bench v3 but Pass@1 0.400, below its own back-brain-only condition (0.520).
* [Duopra](../papers/2611.25773.md) - trains a full-duplex model to emit private JSON tool calls with the backend as one more tool, query(task); shows the frontend-backend baseline fails at initiation (hand-offs in 11.0% of sessions) and lifts Full-Duplex-Bench v3 Pass@1 from 4.7% to 44.7% with the same backend, while losing backchannels.

# Synthesis

The two papers point to the same bottleneck from opposite directions. Gander's back brain alone passes more Full-Duplex-Bench v3 tasks than the full system (0.520 vs. 0.400), so something is lost between the realtime front and the agent behind it; Duopra measures what that is for a Realtime-Venus frontend: Pass@1 factors into hand-off coverage times conditional success, and the baseline almost never hands off. A stronger backend raises conditional success but cannot send requests the frontend never sent. Duopra's answer is to train the frontend to act, after which it barely delegates at all when tools are visible. Both papers also report a conversational cost or trade-off of task execution (Gander's filler rate while a task runs; Duopra's lost backchannels and slower turn-taking), so task agency and conversational agency are not yet free to combine (reader synthesis).

# Open Questions

* When should a full-duplex agent delegate rather than call a tool itself? Duopra's model almost never delegates when tools are visible, and Gander is built to route tasks to its back brain; neither tests routing under a cost for latency or backend use.
* Can task training keep spontaneous backchanneling, or does any reward for acting suppress it?
* Wrong arguments become the dominant failure once agents initiate reliably, often on spelled-out identifiers; is a confirm-before-call behavior worth its turn-taking cost?
* Full-Duplex-Bench v3 uses prerecorded requests and simulated APIs; how do these systems behave with users whose next words depend on the agent's replies?
