---
type: Topic
title: World models as agent environments
description: Papers that use a learned model (language, image, or video) to stand in for or render an agent's environment, and the split between what the model simulates and what stays in executable state.
tags:
- world-models
- agent-environments
- environment-simulation
timestamp: 2026-10-09T00:00:00Z
---

# Scope

This topic tracks papers where a learned generative model plays the environment for an agent: a language model that predicts the next observation, an image generator that draws the next screenshot, or a video model that renders the next frames. The organizing question is what the model is trusted with. At one end the model *is* the environment, holding state only in its generated history; at the other end executable code holds the state and rules and the model only renders or fills in gaps. Environment design in general belongs in [Agent environments](agent-environments.md); evaluating world models themselves, without agents acting in them, is out of scope.

# Papers

* [CompoWorld](../papers/2609.33665.md) - executable typed services, with a type-constrained LLM world model only for the 7.1% of tools that coding agents cannot implement reliably.
* [AutoGUIWorld](../papers/2610.01215.md) - a pretrained image generator renders each next GUI screenshot from the intended effect of a planned action; no explicit state, quality checked by a VLM judge on before/after pairs.
* [From Traces to Agentic Worlds (Trace2Env)](../papers/2610.06100.md) - a language world model run as an agent over a worldbook rebuilt from traces, with explicit episode state and a validation gate on every state change; judged by whether simulated action sequences still succeed in the real environment.
* [AgentGarten](../papers/2610.12374.md) - engine code holds state and rules; a real-time video model renders first-person frames from exported depth or normals, so rendering errors cannot enter the state.

# Synthesis

The four papers place the line between learned simulation and explicit state at different points. AutoGUIWorld trusts the model with everything and keeps no state, which removes deployment cost but also the ability to verify a task against state. CompoWorld trusts code with almost everything and uses a model only where code fails. Trace2Env and AgentGarten sit in between from opposite directions: Trace2Env lets a language model decide each transition but forces it to write explicit state effects that a harness validates and commits, while AgentGarten keeps all state in code and lets the model decide only appearance.

The evaluation criteria differ accordingly. Trace2Env argues that success inside a simulator is the wrong measure: a direct-prompting simulator lets ALFWorld tasks "succeed" 97% of the time, yet only 3% of those action sequences work in the real environment, against 85% for its state-tracked simulator. AgentGarten has no such check, because its state is the real engine state; its open question is instead whether rendering quality affects what agents learn, which it does not measure. AutoGUIWorld and CompoWorld measure downstream training value on real benchmarks. No paper here yet compares two of these designs on the same tasks.

# Open Questions

* Is replay transfer (Trace2Env's W2R and consistency ratio) the right general criterion for a simulated environment, and can it be applied when no real environment is available to replay in?
* Does training an agent inside a learned simulator improve it in the real environment, and how does that depend on where state is kept?
* How much does the observation renderer matter for agent learning when state is exact, for example AgentGarten's neural frames against plain engine graphics on the same worlds?
* When a model must simulate behavior never seen in traces or code, how should uncertainty be exposed to the acting agent rather than hidden behind a confident observation?
