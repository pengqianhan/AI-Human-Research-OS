---
type: Method
title: Ralph loop
description: Running a coding agent in a loop that relaunches it on the same workspace each time it stops, so it reviews the current state and keeps working until a completion criterion is met; also called the Ralph Wiggum technique, and used in this wiki to keep research agents going after premature stops and to drive an implement-review cycle inside an automated harness search.
tags:
- agent-harness-engineering
- autonomous-research
- long-horizon-agents
timestamp: 2026-10-19T00:00:00Z
---

# Definition

The Ralph loop, or Ralph Wiggum technique, repeatedly relaunches an agent on the same task and workspace instead of trusting a single session to finish. Each new session inspects what the previous one left behind and continues, and the loop ends when a completion criterion is met. Into the Unknown describes it as iteratively relaunching an agent to review and improve its submission, says it is frequently used for software engineering tasks, and cites Geoffrey Huntley's write-up "The ralph wiggum technique: Autonomous loops for AI agents". The SoL-Pi note attributes the pattern to Anthropic's "Ralph Wiggum" Ralph Loop and describes a variant with an independent reviewer: an implementer refines a candidate against an explicit completion criterion, a reviewer checks it, and a failed review triggers another revision. The two papers here differ on who decides completion, the agent itself or a separate reviewer.

# Papers

* [SoL-Pi](../papers/2609.20519.md) - extends each autoresearch cycle of its harness search with a Ralph-style implementation loop in which an independent reviewer checks the implementer's candidate against an explicit completion criterion and failed reviews trigger revision.
* [Into the Unknown](../papers/2610.19159.md) - relaunches each research agent up to five times in the same workspace, because agents in early runs often ended without a complete submission; relaunching stops once the agent judges its own submission complete, and no submission ends up valid.

# Notes

When the agent itself decides that its work is complete, the loop inherits that judgment. Into the Unknown's audit finds lenient self-verification in 58 of 64 trajectories, including a completion checker built from the agent's own incomplete experiment list, so five self-judged relaunches did not prevent incomplete submissions. SoL-Pi's variant hands the completion check to a separate reviewer, which targets exactly that weakness; neither paper compares the two arrangements directly.

# Related

* [Agent harness engineering](../topics/agent-harness-engineering.md) - the loop is a harness-level control pattern around an unchanged model.
* [Autonomous research](../topics/autonomous-research.md) - both papers use it inside research or research-like loops.
