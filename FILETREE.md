# Project Filetree

_Auto-maintained compact navigation index by the filetree-simple skill. Indexed entries carry content hashes; mismatches indicate stale summaries._

## (root)/

- `.github/` - GitHub repository configuration, including Actions automation workflows. <!--hash:b7b0effb-->
- `build_phases/` - Research OS MVP execution-contract prompts; current launcher-only draft is blocked pending end-to-end autonomy and acceptance redesign. <!--hash:484577b9-->
- `docs/` - Narrative and presentation drafts about the Research OS. <!--hash:14b16388-->
- `human/` - User context area with profile, policies, preferences, workflows, human cognition cache, candidate updates, and ignored private context. <!--hash:546515d3-->
- `ideas/` - OKF bundle for research ideas, including nested idea bundles, concept notes, and update logs. <!--hash:e38f67ea-->
- `inbox/` - Temporary intake workspace with drop, archive, and processing-script subdirectories. <!--hash:f0eb06bd-->
- `memory/` - Research memory area for long-term context, project notes, decisions, and progress. <!--hash:39f15197-->
- `os-ui/` - English-first read-only desktop UI for the Research OS: launch README, retained Chinese README, design spec, mockup, generator, and frontend. <!--hash:49a97eab-->
- `paper-wiki/` - OKF paper wiki: paper, topic, and concept entity pages, non-paper sources, indexes, and a generated graph visualization (viz.html). <!--hash:0d0a0b2f-->
- `projects-folder/` - Container for project instances and reusable project templates, with an index of all projects. <!--hash:01eb9fbf-->
- `research-skills-hub/` - Canonical hub of reusable research skills: Open Paper, collected, vendored science-skills, claude-science-skills, and the read-only mattpocock-skills upstream mirror. <!--hash:86f71cfe-->
- `resource/` - Read-only external reference area: vendored copies of other agent and research repositories plus walk-through notes distilled from them for study and inspiration. <!--hash:5450ee7b-->
- `.gitignore` - Ignores OS files, editor settings, local environments, caches, scratch, private human context, agent-local data, and LaTeX build output. <!--hash:d6fc7790-->
- `AGENTS.md` - Codex entry instruction directing agents to read INSTRUCTION.md at session start. <!--hash:306510c0-->
- `CLAUDE.md` - Claude Code entry instruction directing agents to read INSTRUCTION.md at session start. <!--hash:b5dc49b2-->
- `CONTEXT.md` - Domain glossary for Long-term Research OS, Research OS MVP, research artifacts, continuation, skills, tasks, parallel rounds, and experience promotion. <!--hash:9d960dde-->
- `GOAL.md` - Long-term Research OS vision: strategic principles, milestones, agent-agnostic rules, governance gates, and the boundary with MVP execution contracts. <!--hash:793c7ca0-->
- `HANDOFF.md` - Cross-session handoff record: active work, decisions with how-to-reverse, deviations, and intentionally-not-done. <!--hash:3e322967-->
- `INSTRUCTION.md` - Primary agent guide: startup order, research-environment policy, workflows, portfolio/evaluator rules, memory layers, skills, references, and safety. <!--hash:19af5b56-->
- `LICENSE` - MIT license for the repository's original content. <!--hash:498c3fd3-->
- `README.md` - Human-facing overview: design stance, quick start, directory map, workflow, license, roadmap TODOs, and reference projects. <!--hash:c6f42de7-->
- `verify.sh` - Read-only, agent-neutral consistency check: paper-wiki validator, FILETREE lint, and three-copy skill-sync diff; reports drift without fixing. <!--hash:5313ad5b-->

## .github/

- `workflows/` - GitHub Actions workflow definitions. <!--hash:cecfbb42-->

## .github/workflows/

- `sync-mattpocock-skills.yml` - Weekly workflow that refreshes the read-only mattpocock-skills mirror from upstream and opens a review PR (never auto-merges). <!--hash:013c1db8-->

## docs/

- `presentAHROS.md` - Narrative draft on the OS's motivation and design: manual paper reading to an agent-friendly OKF environment, skills hub, and orchestrator. <!--hash:c5701e64-->

## human/

- `human-cognition/` - Human cognition cache with OKF quadrant files and a navigation index. <!--hash:7d1f016a-->
- `inbox.md` - Review queue for candidate human memories before they are promoted into the durable profile. <!--hash:227e6291-->
- `index.md` - Entry point explaining Human folder read order, scope, boundaries, memory policy, and agent rules. <!--hash:7fec06a8-->
- `PROFILE.md` - Stable user profile combining low-sensitivity identity fields, collaboration preferences, recurring workflows, and entry templates. <!--hash:170a3ac1-->

## human/human-cognition/

- `index.md` - Entry point for the human cognition cache: startup read instructions, quadrant links, focus, transitions, and privacy boundary. <!--hash:3367986a-->
- `known_knowns.md` - Human-confirmed Python/PyTorch familiarity and outcome-level Research OS vision capability, with scoped evidence. <!--hash:60c2fb0b-->
- `known_unknowns.md` - Human-recognized learning gaps in TypeScript, pi SDK, frontend design, and autonomous research-runtime architecture. <!--hash:1bcde5b3-->
- `unknown_knowns.md` - Empty OKF quadrant for implicit human criteria and assumptions revealed through interaction. <!--hash:1ffefd95-->
- `unknown_unknowns.md` - Empty OKF quadrant for candidate blind spots recorded as questions or hypotheses. <!--hash:a98fd852-->

## ideas/

- `idea_example/` - Nested OKF idea bundle demonstrating folder-shaped idea representation for the promoted linear-fit smoke test. <!--hash:4a8c0b4d-->
- `index.md` - OKF bundle entry point for research ideas, status profile, and nested idea bundle links. <!--hash:452de361-->
- `log.md` - Chronological update log for the Ideas OKF bundle. <!--hash:85961789-->

## ideas/idea_example/

- `index.md` - Entry point listing the example idea concept and related project/task assets. <!--hash:1fa13f60-->
- `linear-fit-micro-experiment.md` - OKF Idea concept for the promoted linear-fit micro-experiment that validates the OS pipeline. <!--hash:e04f927e-->
- `log.md` - Chronological update log for the nested idea_example OKF bundle. <!--hash:de04ef17-->

## memory/

- `MEMORY.md` - Global research memory: research policy, active project portfolio, cross-project decisions, and lessons. <!--hash:2a3354b0-->

## os-ui/

- `frontend/` - Vite + React + TypeScript read-only desktop UI: dock plus draggable app windows rendering state.json, with an English frontend README. <!--hash:43a0a270-->
- `generator/` - Stdlib-only Python generator (uv) that scans the repo into schema-versioned state.json; supports --watch polling. <!--hash:0fa15dc6-->

## paper-wiki/

- `concepts/` - Concept entity pages naming methods, datasets, benchmarks, metrics, terms, and tools referenced across papers. <!--hash:7178e9b2-->
- `papers/` - Individual paper notes (one Markdown file per arXiv paper) plus an index of all papers. <!--hash:6a927189-->
- `sources/` - Non-paper reading (blogs, docs, talks) captured with the experimental synthesis-source lens. <!--hash:0233f545-->
- `topics/` - Topic summary pages grouping related papers by durable research theme, plus a topics index. <!--hash:ab46f887-->
- `index.md` - Wiki home linking the papers, topics, concepts, and sources indexes of the paper wiki. <!--hash:4f04fdb1-->
- `viz.html` - Generated interactive graph visualization of the paper wiki (papers, topics, concepts, and their links). <!--hash:94fa3c27-->

## paper-wiki/concepts/

- `index.md` - Index of concept entity pages with one-line descriptions. <!--hash:7f1505be-->
- `llm-as-a-judge.md` - Term page: LLM-as-a-judge evaluation, defining the technique and linking papers that rely on it. <!--hash:cf72f061-->
- `mle-bench-lite.md` - Benchmark page: MLE-Bench Lite, linking papers reporting any-medal results on it. <!--hash:458774c4-->
- `swe-bench-verified.md` - Benchmark page: SWE-bench Verified, linking papers reporting repository-level issue-resolution results. <!--hash:d0c04e3e-->

## paper-wiki/papers/

- `2604.03964.md` - Paper note: SkillFoundry, a self-evolving framework that mines heterogeneous scientific resources into validated, reusable agent skill libraries. <!--hash:1ffeb9f5-->
- `2605.22721.md` - Paper note: Self-Evolving Multi-Agent Systems via Decentralized Memory (DecentMem). <!--hash:73316a45-->
- `2605.28655.md` - Paper note: AutoScientists, self-organizing agent teams for long-running scientific experimentation. <!--hash:38d77a69-->
- `2605.31464.md` - Paper note: GPU Forecasters, LLM surrogates that forecast GPU kernel performance to speed up kernel search. <!--hash:74b18429-->
- `2606.06741.md` - Paper note: OpenSkill, open-world self-evolution for LLM agents via self-built skills and verification. <!--hash:e8a4b288-->
- `2606.10662.md` - Paper note: decentralized multi-agent systems coordinating through shared verified context. <!--hash:1c72f720-->
- `2606.11926.md` - Paper note: Arbor, hypothesis-tree refinement for long-horizon autonomous research and artifact optimization. <!--hash:87f46f44-->
- `2606.13662.md` - Paper note: EurekAgent, environment engineering for metric-driven autonomous scientific discovery with CLI agents. <!--hash:3581df4a-->
- `index.md` - Index of all paper notes in the library, one line per paper. <!--hash:5041c89a-->

## paper-wiki/sources/

- `harness-engineering-for-self-improvement.md` - Reference note: Lilian Weng's synthesis on harness engineering — evolving the harness (workflow, memory, tools, evaluators) as the near-term path to self-improvement. <!--hash:dc286198-->
- `index.md` - Index of non-paper reading sources. <!--hash:f262cc63-->
- `llm-powered-autonomous-agents.md` - Reference note: Lilian Weng's synthesis of LLM-agent architecture — planning, memory, tool use, case studies, and open challenges. <!--hash:8e812bdb-->

## paper-wiki/topics/

- `agent-environments.md` - Topic: environments, permissions, artifacts, budgets, and interfaces that shape agent behavior. <!--hash:a42cb900-->
- `agent-self-evolution.md` - Topic: agents that improve their own skills, verification signals, or behavior after deployment. <!--hash:df07eb44-->
- `agent-skill-libraries.md` - Topic: building, validating, and maintaining reusable libraries of executable agent skills. <!--hash:c54d6035-->
- `ai-for-science.md` - Topic: AI systems that design, run, and revise scientific experiments. <!--hash:7322c3ec-->
- `autonomous-research.md` - Topic: AI systems that autonomously generate, test, and refine research hypotheses or artifacts. <!--hash:50f6352f-->
- `gpu-kernel-optimization.md` - Topic: searching for and evaluating fast GPU kernels, including the cost of on-device measurement. <!--hash:633707a4-->
- `index.md` - Index of all topic pages in the library, one line per topic. <!--hash:10b1a460-->
- `llm-agents.md` - Topic: language-model agents, skills, verification, and autonomous task execution. <!--hash:c32df4b0-->
- `llm-surrogate-models.md` - Topic: LLMs used as predictive surrogates that forecast outcomes instead of generating or acting directly. <!--hash:49f9bb25-->
- `multi-agent-systems.md` - Topic: multiple agents coordinating work, state, and reasoning. <!--hash:c0be8304-->

## projects-folder/

- `Example_Project/` - Worked example from the OS smoke test: idea to runnable code, generated figure, and compiled PDF. <!--hash:897b989b-->
- `templates/` - Reusable project templates copied into projects-folder/ to start new projects, plus a template index. <!--hash:16fd6937-->
- `index.md` - Project index linking each project instance and the reusable templates, with instructions for adding a project. <!--hash:685b13fb-->

## projects-folder/Example_Project/

- `Baselines/` - Baseline notes area inherited from the template; unused in this synthetic example. <!--hash:2bfe64c6-->
- `Code/` - Linear-fit smoke-test experiment: uv environment, fit_line.py, run commands, and reproducible results in bilingual READMEs. <!--hash:d99584ba-->
- `Figs/` - Generated figures for the example project, including the linear_fit.png output of fit_line.py. <!--hash:8c1d3ba6-->
- `paper/` - LaTeX source area for the worked example paper, including local references; final PDF is generated in place as paper/main.pdf. <!--hash:e38e6585-->
- `index.md` - Folder entry point for the smoke-test project, linking state, source map, code, paper, references, and log. <!--hash:cb133d4e-->
- `log.md` - Folder-level update log for the smoke-test project. <!--hash:7d3285a5-->
- `paper_skeleton.md` - Manuscript control sheet filled with the smoke-test example's snapshot and source map. <!--hash:0645c99d-->
- `PROJECT_MEMORY.md` - Project memory for the smoke-test example: snapshot, build-convention decision, progress log. <!--hash:9d206b39-->

## projects-folder/Example_Project/Baselines/

- `Baseline_readme.md` - Reminder note emphasizing optimized baselines for research comparisons. <!--hash:2efac95c-->

## projects-folder/Example_Project/paper/

- `main.tex` - Compiled smoke-test manuscript source reporting the linear-fit numbers with the local bibliography. <!--hash:37ba3aca-->
- `references.bib` - Project-local BibTeX bibliography for the worked example paper. <!--hash:0f02951b-->

## projects-folder/templates/

- `ai_research_template/` - Reusable AI-research paper starter template for turning a feasible idea into a traceable project. <!--hash:21492d4a-->
- `index.md` - Index of available project templates with copy-to-start instructions. <!--hash:d3f6409c-->

## projects-folder/templates/ai_research_template/

- `Baselines/` - Baseline experiment notes, comparisons, and related materials for new research projects. <!--hash:84ac5af2-->
- `Code/` - Template code area with uv environment conventions, bilingual README skeletons, and Datasets placeholder. <!--hash:87d4fafb-->
- `Figs/` - Template area for figures, tables, plots, screenshots, and visual outputs. <!--hash:bc34b778-->
- `paper/` - Template LaTeX source area for new project papers, including local references; final PDF is generated in place as paper/main.pdf. <!--hash:c729d852-->
- `index.md` - Folder entry point for the reusable AI-research template and its post-copy starting files. <!--hash:aacca729-->
- `log.md` - Template-level update log for changes to the project starter. <!--hash:e10d8d5f-->
- `paper_skeleton.md` - Reusable manuscript control template with source maps, baselines, experiments, claim tracking, and writing TODOs. <!--hash:fec8d3c5-->
- `PROJECT_MEMORY.md` - Project-memory template: snapshot, key decisions, progress log, and open TODOs. <!--hash:e9dbaba8-->

## projects-folder/templates/ai_research_template/Baselines/

- `Baseline_readme.md` - Reminder note emphasizing optimized baselines for research comparisons. <!--hash:2efac95c-->

## projects-folder/templates/ai_research_template/paper/

- `main.tex` - Minimal LaTeX scaffold for project papers with figure and bibliography path conventions. <!--hash:64ffa6bf-->
- `references.bib` - Placeholder project-local BibTeX bibliography for new project papers. <!--hash:64796636-->

## research-skills-hub/

- `index.md` - Hub index linking skill collections (science-skills, open-paper-skills, collected-skills, mattpocock-skills, claude-science-skills) and install steps. <!--hash:8691082e-->

## resource/

- `agentos-讲解与启发.md` - Walk-through of the agentos in-process agent VM (Rivet) and what its kernel, permissions, and bindings design suggests for this Research OS. <!--hash:2c15c7d0-->
- `EurekAgent-讲解与启发.md` - Walk-through of EurekAgent environment engineering for metric-driven research loops and lessons for evaluation contracts, artifacts, budgets, and snapshots. <!--hash:5050ec4e-->
- `sepo-讲解与启发.md` - Walk-through of sepo, a GitHub-native self-evolving repository agent, and lessons from its memory-versus-rubrics state split for this Research OS. <!--hash:56490406-->
- `并行-自进化-经验共享-调研与启发.md` - GitHub survey note on parallel execution, self-evolution, and cross-agent experience sharing, with borrowing points and a recommended rollout path. <!--hash:2251349f-->
