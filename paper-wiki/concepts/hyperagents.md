---
type: Method
title: HyperAgents
description: Self-referential agents that put a task agent and a meta agent into one editable program, so the procedure that generates improvements can itself be modified; instantiated as DGM-Hyperagents, an extension of the Darwin Gödel Machine.
resource: https://arxiv.org/abs/2603.19461
tags:
- recursive-self-improvement
- self-modification
- harness-evolution
timestamp: 2026-11-09T00:00:00Z
---

# Definition

HyperAgents (Zhang, Zhao, Yang, Foerster, Clune, Jiang, Devlin, and Shavrina, arXiv:2603.19461) are self-referential agents that integrate a task agent, which solves the target task, and a meta agent, which modifies both itself and the task agent, into a single editable program. Because the meta-level modification procedure is editable, the system can improve not only how it solves tasks but also how it generates future improvements. The paper instantiates this by extending the [Darwin Gödel Machine](darwin-godel-machine.md) to DGM-Hyperagents (DGM-H), removing DGM's assumption that coding skill and self-modification skill align, and reports gains over time across several domains, with meta-level improvements such as persistent memory and performance tracking that transfer across domains and accumulate across runs. This description follows the paper's abstract; the full paper has not been ingested.

# Papers

* [Beneath the Surface](../papers/2611.07624.md) - one of four harness-evolution methods audited, with score-weighted Parent sampling, a child-count penalty, and editable operators; its τ³-Banking Champions show significant negative interaction between their two Components (−6.3 and −6.6 points).
* [RSIAgent](../papers/2609.15364.md) - cites Hyperagents as a meta-agent that modifies itself and the task agent, noting that such methods need access to benchmark scores.
* [ScienceBuddy](../papers/2609.17523.md) - cites Hyperagents with the Darwin Gödel Machine as recursive self-improvement with editable improvement procedures.
* [SoL-Pi](../papers/2609.20519.md) - cites Hyperagents as an executable form of self-modification that makes the meta-level improvement procedure editable.
* [RRSI](../papers/2609.24972.md) - lists Hyperagents in its self-modifying-agent related work with the Darwin and Huxley-Gödel Machines.
* [Harness²](../papers/2610.14224.md) - cites Hyperagents in its recursive self-improvement related work as an editable meta-level procedure.
* [Dream-RSI](../papers/2609.14858.md) - cites Hyperagents among systems that optimize the self-improvement procedure itself, the category Dream-RSI places itself in.

# Notes

The audit in Beneath the Surface runs HyperAgents inside a shared operator framework with GPT-5.4, not the original DGM-H setup, so its results describe that reimplementation. There, HyperAgents' Champions improve reliability in all four settings, but on Terminal-Bench 2 they lose coverage with both harnesses.

# Related

* [Darwin Gödel Machine](darwin-godel-machine.md) - the system HyperAgents extends.
* [Agentic Harness Engineering](agentic-harness-engineering.md) - the other implementation-centric harness-evolution method in the same audit.
