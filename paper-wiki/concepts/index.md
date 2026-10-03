# Concept

* [AgentScope](agentscope.md) - Open-source, Alibaba-developed multi-agent LLM platform providing model/memory/tool abstractions, a ReAct-based agent core, and infrastructure for both population-scale simulation and developer-facing agentic application deployment.
* [ALFWorld](alfworld.md) - Text-based household-task environment aligned with ALFRED, a common long-horizon testbed for LLM agents, skill optimization, and context management.
* [AlphaEvolve](alphaevolve.md) - Google DeepMind's LLM-powered evolutionary coding agent for algorithm and mathematical discovery, a common reference baseline for LLM-driven evolutionary discovery systems.
* [BFCL](bfcl.md) - Berkeley Function-Calling Leaderboard for evaluating tool selection and argument correctness across unseen function schemas, in single-turn, multi-turn, and relevance-detection categories.
* [BrowseComp](browsecomp.md) - Benchmark of hard-to-find factual questions identified only through indirect, mutually constraining clues, for evaluating web-browsing search agents.
* [BrowseComp-Plus](browsecomp-plus.md) - Multi-hop deep-research QA benchmark with a verified offline corpus of gold, evidence, and hard-negative documents.
* [Context rot](context-rot.md) - Degradation of model quality as context grows, even inside the physical context window.
* [DeepSearchQA](deepsearchqa.md) - Deep-research question-answering benchmark for evaluating agent search-and-synthesis capability.
* [DSPy](dspy.md) - Framework for compiling declarative multi-stage language-model programs into self-improving pipelines via prompt- and (more recently) weight-optimization.
* [GAIA2](gaia2.md) - Simulated-smartphone benchmark of dynamic, asynchronous assistant tasks grouped into persona Universes, used for Universe-disjoint harness-optimization splits.
* [GDPVal](gdpval.md) - 1,320-task, 44-occupation benchmark of economically valuable work graded by expert rubrics and pairwise Elo against human deliverables; GDPVal-AA is its 220-task gold subset.
* [GEPA](gepa.md) - Reflective prompt evolution with Pareto-based candidate selection; a standard prompt-optimization baseline for skill and harness optimizers.
* [GISA](gisa.md) - General information-seeking benchmark with structured item, set, list, and table answers.
* [GraphRAG](graphrag.md) - Microsoft's graph-based RAG that builds an LLM-extracted entity graph and community summaries over a corpus and answers global questions by map-reducing over them.
* [GRPO](grpo.md) - Value-free RL algorithm that estimates advantage from a group of same-prompt responses rather than a learned critic.
* [Humanity's Last Exam](humanitys-last-exam.md) - 2,500-question expert-written multimodal academic benchmark built to stay hard for frontier LLMs; agent papers usually report its text-only subset.
* [LIBERO-Pro](libero-pro.md) - A perturbed variant of the LIBERO tabletop-manipulation benchmark that stress-tests a frozen vision-language-action policy under deployment perturbations such as instruction redirection and object-position swaps.
* [LLM-as-a-Judge](llm-as-a-judge.md) - Using a language model to score, rank, or select other model outputs.
* [LoCoMo](locomo.md) - Very-long-term conversational memory benchmark spanning single-hop, multi-hop, open-domain, and temporal reasoning.
* [LongMemEval](longmemeval.md) - 500-question, six-category benchmark for long-term interactive memory in chat assistants.
* [Meta-Harness](meta-harness.md) - Outer-loop optimization of executable agent-harness code by an agentic proposer reading past candidates' code, scores, and traces; the common baseline for automated harness evolution.
* [MLE-Bench Lite](mle-bench-lite.md) - Lighter subset of MLE-Bench for Kaggle-derived ML-engineering agent evaluation.
* [Model Context Protocol (MCP)](model-context-protocol.md) - Standard for how a language-model application discovers and invokes external tools via named, schema-described servers.
* [OfficeQA](officeqa.md) - 246 numeric questions over about 89,000 pages of U.S. Treasury Bulletins requiring document parsing, cross-table retrieval, and numerical reasoning within a relative error tolerance.
* [OOLONG](oolong.md) - Long-context benchmark requiring semantic transformation and aggregation over nearly every input entry.
* [OSWorld](osworld.md) - Benchmark for evaluating multimodal computer-use agents on open-ended, real-world desktop tasks executed inside real operating-system environments.
* [On-policy distillation](on-policy-distillation.md) - Training a student on its own trajectories by matching a teacher's per-token distribution.
* [PaperBench](paperbench.md) - Benchmark where agents replicate 20 ICML 2024 papers from scratch, graded against 8,316 rubric sub-tasks.
* [Reward hacking](reward-hacking.md) - An agent or policy raising its measured reward or benchmark score by exploiting the grader, environment, or evaluation channel instead of accomplishing the intended task.
* [ScreenSpot-Pro](screenspot-pro.md) - GUI grounding benchmark of high-resolution professional-application screenshots scored by point-in-box accuracy.
* [Search-R1](search-r1.md) - Outcome-reward RL that trains an LLM to interleave reasoning with search calls, masking retrieved tokens from the loss; a standard baseline for RL-trained search agents.
* [SkillsBench](skillsbench.md) - 87-task, 8-domain benchmark with curated Agent Skills and deterministic verifiers, run with and without Skills to measure how much they help.
* [SpreadsheetBench](spreadsheetbench.md) - Forum-derived spreadsheet-manipulation tasks judged by producing the expected result on several test workbooks; SpreadsheetBench II extends it to end-to-end business workflows.
* [SWE-bench Pro](swe-bench-pro.md) - Enterprise repository-level software-engineering benchmark spanning multiple real codebases.
* [SWE-bench Verified](swe-bench-verified.md) - Human-validated subset of SWE-bench for repository-level issue resolution.
* [Terminal-Bench](terminal-bench.md) - Benchmark suite for evaluating AI agents on hard, realistic tasks in command-line environments.
* [τ²-Bench](tau2-bench.md) - Dual-control conversational tool-use benchmark (Airline, Retail, Telecom) where both the agent and a simulated user act on shared state, scored by an environment verifier.
* [WebArena](webarena.md) - 812 long-horizon tasks on self-hosted shop, admin, GitLab, forum, map, and wiki sites with functional evaluators; the standard browser-agent testbed and, via WebArena-Lite, a web-agent fine-tuning target.
* [WebShop](webshop.md) - Simulated e-commerce site of 1.18 million products and 12,087 instructions where a text agent searches, selects options, and buys, rewarded by attribute, option, and price match.
* [WideSearch](widesearch.md) - Bilingual benchmark for collecting broad sets of verifiable facts into complete tables.
