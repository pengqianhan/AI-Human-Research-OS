# Concept

* [Agent Workflow Memory](agent-workflow-memory.md) - Induces reusable multi-step workflows from an agent's past experience and supplies them to later tasks; a common baseline for procedure reuse in web and interactive agents.
* [Agent World Model (AWM)](agent-world-model.md) - Synthesis of executable tool environments with persistent backend state for agentic RL, used as training data and as an environment-scaling baseline.
* [Agent-World](agent-world.md) - Environment synthesis that mines databases from real service themes, validates generated tools against them, and co-evolves environments and policies.
* [Agentic Context Engineering (ACE)](agentic-context-engineering.md) - Context adaptation that keeps an evolving playbook updated by generation, reflection, and curation with incremental edits; a reference method for improving agents without weight updates.
* [Agents' Last Exam (ALE)](agents-last-exam.md) - Living benchmark of long-horizon, economically valuable professional tasks with verifiable outcomes, and the source of a five-layer system view of agents.
* [AgentScope](agentscope.md) - Open-source, Alibaba-developed multi-agent LLM platform providing model/memory/tool abstractions, a ReAct-based agent core, and infrastructure for both population-scale simulation and developer-facing agentic application deployment.
* [ALFWorld](alfworld.md) - Text-based household-task environment aligned with ALFRED, a common long-horizon testbed for LLM agents, skill optimization, and context management.
* [AlphaEvolve](alphaevolve.md) - Google DeepMind's LLM-powered evolutionary coding agent for algorithm and mathematical discovery, a common reference baseline for LLM-driven evolutionary discovery systems.
* [AndroidWorld](androidworld.md) - Live Android environment with 116 parameterized task workflows across 20 real apps, rewarded from system state; the standard online benchmark for mobile GUI agents.
* [AppWorld](appworld.md) - Nine simulated everyday apps behind 457 APIs with 750 interactive-coding tasks scored by state-based unit tests that also check for collateral damage.
* [ARC-AGI-3](arc-agi-3.md) - Interactive benchmark of grid games with unknown rules and goals, scored by action efficiency relative to humans (RHAE), used to test agents that learn an environment through interaction.
* [AutomationBench](automationbench.md) - Benchmark of cross-application workflow orchestration through REST APIs in simulated SaaS environments, including API discovery and adherence to business rules.
* [BFCL](bfcl.md) - Berkeley Function-Calling Leaderboard for evaluating tool selection and argument correctness across unseen function schemas, in single-turn, multi-turn, and relevance-detection categories.
* [BrowseComp](browsecomp.md) - Benchmark of hard-to-find factual questions identified only through indirect, mutually constraining clues, for evaluating web-browsing search agents.
* [BrowseComp-Plus](browsecomp-plus.md) - Multi-hop deep-research QA benchmark with a verified offline corpus of gold, evidence, and hard-negative documents.
* [Claw-Eval](claw-eval.md) - 300 human-verified agent tasks across service orchestration, multimodal, and multi-turn dialogue groups, graded from traces, audit logs, and snapshots for completion, safety, and robustness with Pass@k and Pass^k.
* [Context compaction](context-compaction.md) - Shortening an agent's accumulated context mid-task by summarizing history or replacing tool outputs and images, with costs in what is lost, prompt-cache reuse, and RL training.
* [Context rot](context-rot.md) - Degradation of model quality as context grows, even inside the physical context window.
* [Darwin Gödel Machine (DGM)](darwin-godel-machine.md) - Self-improving coding agent that rewrites its own code, validates each version on coding benchmarks, and keeps an open-ended archive of agents; the standard reference for self-modifying agents and archive-based search.
* [DeepSearchQA](deepsearchqa.md) - Deep-research question-answering benchmark for evaluating agent search-and-synthesis capability.
* [DSPy](dspy.md) - Framework for compiling declarative multi-stage language-model programs into self-improving pipelines via prompt- and (more recently) weight-optimization.
* [EnvScaler](envscaler.md) - Programmatic synthesis of tool-interactive training environments with executable tools and verifiable tasks, and the RL task pool built that way.
* [GAIA2](gaia2.md) - Simulated-smartphone benchmark of dynamic, asynchronous assistant tasks grouped into persona Universes, used for Universe-disjoint harness-optimization splits.
* [GameCraft-Bench](gamecraft-bench.md) - 140-task benchmark of complete games built end to end by agents in a real game engine, scored through replayed gameplay against game-specific rubrics on Mechanics, Depth, Visuals, and Art.
* [GDPVal](gdpval.md) - 1,320-task, 44-occupation benchmark of economically valuable work graded by expert rubrics and pairwise Elo against human deliverables; GDPVal-AA is its 220-task gold subset.
* [GEPA](gepa.md) - Reflective prompt evolution with Pareto-based candidate selection; a standard prompt-optimization baseline for skill and harness optimizers.
* [GiGPO](gigpo.md) - Critic-free agent RL that adds step-level advantages from actions taken at matching states across trajectories to GRPO's episode-level advantages; a standard temporal credit-assignment method.
* [GISA](gisa.md) - General information-seeking benchmark with structured item, set, list, and table answers.
* [GraphRAG](graphrag.md) - Microsoft's graph-based RAG that builds an LLM-extracted entity graph and community summaries over a corpus and answers global questions by map-reducing over them.
* [GRPO](grpo.md) - Value-free RL algorithm that estimates advantage from a group of same-prompt responses rather than a learned critic.
* [Harvey LAB](harvey-lab.md) - Harvey's 1,251-task legal-work benchmark across 24 practice areas, scored by an LLM judge against per-task criteria.
* [Humanity's Last Exam](humanitys-last-exam.md) - 2,500-question expert-written multimodal academic benchmark built to stay hard for frontier LLMs; agent papers usually report its text-only subset.
* [JobBench](jobbench.md) - 65 end-to-end professional job tasks in seven occupational domains, with deliverables judged against a weighted rubric.
* [LIBERO-Pro](libero-pro.md) - A perturbed variant of the LIBERO tabletop-manipulation benchmark that stress-tests a frozen vision-language-action policy under deployment perturbations such as instruction redirection and object-position swaps.
* [LLM-as-a-Judge](llm-as-a-judge.md) - Using a language model to score, rank, or select other model outputs.
* [LoCoMo](locomo.md) - Very-long-term conversational memory benchmark spanning single-hop, multi-hop, open-domain, and temporal reasoning.
* [LongMemEval](longmemeval.md) - 500-question, six-category benchmark for long-term interactive memory in chat assistants.
* [Meta-Harness](meta-harness.md) - Outer-loop optimization of executable agent-harness code by an agentic proposer reading past candidates' code, scores, and traces; the common baseline for automated harness evolution.
* [mini-swe-agent](mini-swe-agent.md) - Minimal Bash-interface coding-agent harness from the SWE-agent line, used as a neutral scaffold, shared baseline harness, held-out transfer harness, and skeleton.
* [MLE-Bench Lite](mle-bench-lite.md) - Lighter subset of MLE-Bench for Kaggle-derived ML-engineering agent evaluation.
* [MobileWorld](mobileworld.md) - 201-task, 20-app mobile benchmark with long cross-app tasks plus agent-user-interaction and MCP categories, built as a harder successor to AndroidWorld.
* [Model Context Protocol (MCP)](model-context-protocol.md) - Standard for how a language-model application discovers and invokes external tools via named, schema-described servers.
* [OfficeQA](officeqa.md) - 246 numeric questions over about 89,000 pages of U.S. Treasury Bulletins requiring document parsing, cross-table retrieval, and numerical reasoning within a relative error tolerance.
* [OOLONG](oolong.md) - Long-context benchmark requiring semantic transformation and aggregation over nearly every input entry.
* [OpenCode](opencode.md) - Open-source coding-agent harness used as a vendor-neutral fixed harness for building or running agents and as a baseline in same-backbone harness comparisons.
* [OSWorld](osworld.md) - Benchmark for evaluating multimodal computer-use agents on open-ended, real-world desktop tasks executed inside real operating-system environments.
* [On-policy distillation](on-policy-distillation.md) - Training a student on its own trajectories by matching a teacher's per-token distribution.
* [PaperBench](paperbench.md) - Benchmark where agents replicate 20 ICML 2024 papers from scratch, graded against 8,316 rubric sub-tasks.
* [PinchBench](pinchbench.md) - Practical productivity and data-analysis tasks for LLMs running as OpenClaw agents, each scored from 0 to 100.
* [ProgramBench](programbench.md) - 200 program-reproduction tasks: rebuild a program's observable behavior from an execute-only reference binary and its documentation, scored by black-box test pass rates.
* [Ralph loop](ralph-loop.md) - Relaunching an agent on the same workspace each time it stops until a completion criterion is met, judged by the agent itself or by a separate reviewer.
* [Reflexion](reflexion.md) - Verbal self-reflection for language agents: lessons written after each attempt are kept in an episodic memory and guide later attempts, with no weight updates; a standard baseline for learning from experience in context.
* [Reward hacking](reward-hacking.md) - An agent or policy raising its measured reward or benchmark score by exploiting the grader, environment, or evaluation channel instead of accomplishing the intended task.
* [ScienceWorld](scienceworld.md) - Interactive text environment of elementary-school science experiments; a long-horizon testbed for LLM agents, skill evolution, and agent RL.
* [ScreenSpot-Pro](screenspot-pro.md) - GUI grounding benchmark of high-resolution professional-application screenshots scored by point-in-box accuracy.
* [Search-R1](search-r1.md) - Outcome-reward RL that trains an LLM to interleave reasoning with search calls, masking retrieved tokens from the loss; a standard baseline for RL-trained search agents.
* [Self-Harness](self-harness.md) - An agent improves its own harness by mining weaknesses from traces, proposing minimal edits, and accepting them after regression tests; the self-proposed harness-only baseline beside Meta-Harness.
* [SkillsBench](skillsbench.md) - 87-task, 8-domain benchmark with curated Agent Skills and deterministic verifiers, run with and without Skills to measure how much they help.
* [SpreadsheetBench](spreadsheetbench.md) - Forum-derived spreadsheet-manipulation tasks judged by producing the expected result on several test workbooks; SpreadsheetBench II extends it to end-to-end business workflows.
* [SWE-bench Pro](swe-bench-pro.md) - Enterprise repository-level software-engineering benchmark spanning multiple real codebases.
* [SWE-bench Verified](swe-bench-verified.md) - Human-validated subset of SWE-bench for repository-level issue resolution.
* [Terminal-Bench](terminal-bench.md) - Benchmark suite for evaluating AI agents on hard, realistic tasks in command-line environments.
* [Terminus 2](terminus-2.md) - General-purpose terminal-agent harness from the Harbor framework; the usual plain baseline on Terminal-Bench and the starting point that harness optimizers patch.
* [ToolSandbox](toolsandbox.md) - Stateful, conversational tool-use benchmark scored against ordered milestones, reported in this wiki on scenario subsets with a similarity metric.
* [τ²-Bench](tau2-bench.md) - Dual-control conversational tool-use benchmark (Airline, Retail, Telecom) where both the agent and a simulated user act on shared state, scored by an environment verifier.
* [VitaBench](vitabench.md) - Interactive multi-turn tasks in everyday service applications, run against an LLM user simulator and scored by a rubric-based trajectory evaluator.
* [WebArena](webarena.md) - 812 long-horizon tasks on self-hosted shop, admin, GitLab, forum, map, and wiki sites with functional evaluators; the standard browser-agent testbed and, via WebArena-Lite, a web-agent fine-tuning target.
* [WebShop](webshop.md) - Simulated e-commerce site of 1.18 million products and 12,087 instructions where a text agent searches, selects options, and buys, rewarded by attribute, option, and price match.
* [WideSearch](widesearch.md) - Bilingual benchmark for collecting broad sets of verifiable facts into complete tables.
* [WorkBuddy-Bench](workbuddy-bench.md) - Tencent's Code, Web, and Office agent benchmark graded by hidden tests, file checks, and LLM or VLM judge items.
