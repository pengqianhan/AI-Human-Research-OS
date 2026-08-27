---
type: Topic
title: AI for science
description: Papers about AI systems that design, run, and revise scientific experiments.
tags:
- ai-for-science
- scientific-discovery
- experiments
timestamp: 2026-08-28T00:00:00Z
---

# Scope

This topic tracks papers about AI systems used to plan, run, and revise scientific experiments over repeated cycles.

# Papers

* [AutoScientists](../papers/2605.28655.md) - self-organizing agent teams for long-running computational scientific experimentation.
* [Arbor](../papers/2606.11926.md) - hypothesis-tree refinement for autonomous optimization of research artifacts.
* [EurekAgent](../papers/2606.13662.md) - environment engineering for metric-driven autonomous scientific discovery.
* [SkillFoundry](../papers/2604.03964.md) - mines scientific resources into validated agent skills and designs task-specific skills on demand for genomics workflows (cell type annotation, scDRS).
* [SWE-bench Science](../papers/2608.19799.md) - a 119-task, 98-repository benchmark for repairing scientific software repositories under domain contracts (units, invariants, formats); even the best coding agent scores under 50% pass@1, with a paired ablation showing scientific guidance is not uniformly helpful.
* [ASI-Bench](../papers/2608.17271.md) - a 60-task benchmark spanning 11 scientific domains (mathematics, physics, chemistry, biology, astronomy, materials science, earth science, medicine/biostatistics, computer science, robotics, electrical engineering) that measures autonomous scientific research capability directly by progressively withdrawing human methodological guidance within the same matched project, rather than proposing a discovery system itself.

# Synthesis

AutoScientists emphasizes decentralized team organization for sustained experimentation, Arbor emphasizes persistent hypothesis management and held-out admission, while EurekAgent emphasizes the surrounding execution environment: hidden evaluators, durable artifacts, budget controls, and supervision interfaces. All three treat scientific discovery as iterative agent work, but they put the main design pressure on different layers. SWE-bench Science shifts the topic's object from *conducting* science to *maintaining the software science depends on*: rather than an agent proposing or running experiments, the agent repairs existing scientific-computing repositories while preserving domain contracts (units, coordinate systems, numerical invariants) that no general-purpose coding benchmark exposes — a complementary failure mode to the discovery-oriented papers above, since a repair that silently breaks a scientific contract could corrupt the evidence an AutoScientists- or EurekAgent-style discovery loop would later rely on. ASI-Bench occupies a fifth, evaluation-only role distinct from all four system papers above: rather than proposing a discovery architecture, it cross-domain-tests whatever architecture an Agent×Model pairing uses, and its finding that current systems' average score collapses from 50.91 to 26.62 as guidance is withdrawn — with the collapse concentrated in turning a named method into a working procedure, not in choosing the method — gives this topic's system-building papers a concrete, externally validated failure point (operationalization, not method selection) that none of AutoScientists, Arbor, or EurekAgent currently reports isolating in their own evaluations.

# Open Questions

* How should failed experiments be captured so future agents avoid repeating them?
* Which parts of scientific experimentation map onto long-running literature review workflows?
* How should compute budgets shape agent critique and proposal acceptance?
* Which environment boundaries are necessary before autonomous discovery results should be trusted?
* How should hypothesis trees connect to project memory, paper skeletons, and durable experiment logs?
* How should autonomous-discovery agents (AutoScientists, Arbor, EurekAgent) verify that the scientific software they depend on has not silently violated a domain contract SWE-bench Science-style failure modes would catch?
* ASI-Bench's main results explicitly exclude external tool access — would AutoScientists', Arbor's, or EurekAgent's own designs (each of which grants agents tool and environment access as a core mechanism) close a meaningful share of the B1→B2 operationalization gap ASI-Bench measures, or does that gap persist even with tools?
