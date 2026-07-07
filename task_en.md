# Task: Build and Evolve the AI-Human Research OS

## Background

This repository is building a lightweight Research OS for human researchers and code agents. It is a file-system-native agent research environment: stable directories, Markdown memory, a shared paper library, project templates, skills, and evaluation records support long-horizon iterative human-agent research.

The primary goal is the human user's own research practice. Reusable open-source templates are a byproduct, and future product or platform possibilities should remain compatible without driving current complexity. The goal is not to build a complex platform first; it is to help Codex, Claude Code, and similar code agents support long-term research with lower token cost, more stable path conventions, and clearer context-loading rules. Code agents can be understood as the execution core of this Research OS, while humans mainly interact with and supervise it through natural language.

The direction-layer long-term goal (an agent-agnostic, agent-native OS) lives in [GOAL.md](GOAL.md); this file is its operation-layer construction guide. This file is a live guide for building and evolving this OS. It is not a historical record and not a strict checklist. Start here to understand the construction goals, then treat `INSTRUCTION.md`, `Memory/MEMORY.md`, `FILETREE.md`, and the actual directory structure as the current sources of truth. You may deviate from the specific suggestions in this file, but explain the reason, impact, and tradeoffs.

## Overall Goal

Starting from this file, continue building and evolving this Research OS so it becomes a simple, efficient, evolvable research environment that code agents can operate over long horizons.

This OS should help agents quickly answer these questions:

1. Where are the current research goal, background, progress, and key memory?
2. Where should new ideas, references, experiment code, figures, and writing materials go?
3. Which files should an agent read first when entering the repository?
4. How should a feasible idea be turned into a new research project or paper draft?
5. When should experience be saved as project-local memory, a project-local skill, or a global reusable skill?
6. How should a multi-project portfolio be maintained, while starting intra-project parallel agents only when useful?
7. How should one evaluator protocol assess complete artifacts from both human-led and agent-led research?

## Design Principles

- Follow Occam's razor: do not add entities without necessity.
- Prioritize readability, searchability, and low token cost for code agents.
- Prioritize macOS and Linux compatibility; Windows compatibility is best effort.
- Keep the directory structure lightweight. Do not introduce databases, backend services, or heavy frameworks unless clearly necessary.
- All research claims, citations, data, and experiment results must be traceable. Do not invent citations, data, or results.
- Preserve original user-provided research materials. Do not delete or substantially rewrite them without confirmation.
- Allow the Research OS to evolve through use, but keep global experience general and avoid overfitting it to one research domain or project.
- This Research OS should remain open, so users can extend it through project templates, skills, and lightweight conventions.
- Treat the OS as an agent environment: constrain agents through artifacts, permissions, budgets, human oversight, and evaluators, not only through prompts.
- The default policy is `portfolio always on, intra-project parallelism on demand`: many projects may exist and queue in the portfolio, but intra-project multi-agent execution should start only when the task is decomposable, verifiable, and worth the merge cost.
- Agent-led research is controlled by `agent_led_research` in `Memory/MEMORY.md`; the default is `off`, with optional `scout_only` and `full_gated` modes.
- Human-led and agent-led research should use the same evaluator protocol: hard checks + rubric scoring + LLM critique, with final judgment on complete artifacts rather than empty ideas.

## Agent Autonomy Rules

- `task.md` and `task_en.md` provide construction direction; they do not replace inspection of the actual repository.
- When `task.md`, `task_en.md`, `INSTRUCTION.md`, `Memory/MEMORY.md`, `README.md`, `FILETREE.md`, or the actual directory structure conflict, prefer the actual directory structure, `INSTRUCTION.md`, and `Memory/MEMORY.md`, then record the conflict as an item for user decision.
- Prefer small, reversible changes. Do not create many empty directories, complex scripts, or heavy frameworks just to make the template feel complete.
- If you find a simpler and clearer design than the one suggested here, use your own judgment.
- For uncertain issues, make a conservative implementation or document the recommendation. Do not pretend the issue has been fully solved.
- In the final delivery, explain what you changed, why you changed it, and what you intentionally did not do.

## Current Key Directories and Files

The following list describes the current design intent. Use the repository's actual paths as the source of truth, and fix naming inconsistencies in documentation when needed.

- `Ideas/`: Stores research ideas, inspirations, hypotheses, early discussions, and idea logs.
- `paper-wiki/`: Repo-level shared paper wiki for single-paper notes, topic synthesis, and `viz.html`. Project-specific citations live in each project's `paper/references.bib`.
- `Memory/`: Stores long-term research memory, project memory, important background, and progress notes.
- `projects-folder/`: Stores project instances and reusable project templates.
- `projects-folder/templates/ai_research_template/`: Current template for starting an AI research paper project from a feasible idea.
- `Research-skills-hub/`: Stores reusable research skills, similar to an app store for research skills.
- `INSTRUCTION.md`: Global operating guide that agents must read first when entering the repository.
- `Memory/MEMORY.md`: Global research policy, Active Projects portfolio, cross-project decisions, and lessons.
- `FILETREE.md`: Repository navigation index that helps agents understand directory purposes quickly.
- `README.md`: Human-facing project overview, current capabilities, and roadmap.
- `AGENTS.md` / `CLAUDE.md`: Entry instructions for Codex and Claude Code.

## Suggested Exploration Directions

### 1. Review the Existing Structure

- Read `INSTRUCTION.md`, `README.md`, `FILETREE.md`, `AGENTS.md`, `CLAUDE.md`, and the actual directory structure.
- Identify inconsistencies between directory naming, responsibility descriptions, startup flow, and documentation entry points.
- Pay special attention to live docs that still reference old paths such as `References/`, `Paper_Initial_template/`, or `Paper_initial_template/`. Historical records may preserve old names, but construction guides and operating docs should use current paths.

### 2. Normalize the Research OS Usage Model

Prefer documenting these workflows:

- Which files a new agent session should read first, and in what order.
- How a human should record a new idea in `Ideas/`.
- How a feasible idea should be used to start a new research project or paper draft from `projects-folder/templates/ai_research_template/`.
- How papers should enter the shared `paper-wiki/`, and how to update single-paper notes, topic synthesis, project-local BibTeX, and claim/evidence records.
- Where to archive code, data, figures, baselines, and writing materials produced during research.
- How research experience should be saved to `Memory/`, project-local `.agents` / `.claude`, or global `Research-skills-hub/`.
- How the portfolio should be maintained in `Memory/MEMORY.md`, how project truth should live in `PROJECT_MEMORY.md`, and how `HANDOFF.md` should stay narrow.
- How agent-led research should be controlled by `off` / `scout_only` / `full_gated`.
- How the unified evaluator should assess complete research artifacts, with full reports stored in each project's `Evaluations/` folder.

### 3. Design Layered Memory

Define memory layers while keeping the system lightweight:

- Global memory: long-term goals, cross-project experience, and general research principles.
- Project memory: current project goals, context, progress, key decisions, and TODOs.
- Task memory: temporary findings, execution records, and follow-up actions from a single agent task.

Explain where each memory layer should live, when it should be updated, who should update it, and how to avoid accumulating low-value information.

### 4. Normalize Skill Evolution

Define a path from experience to reusable skills:

- If an experience only applies to the current project, save it in project memory or a project-local agent skill.
- If an experience has value across multiple research projects, then consider adding it to `Research-skills-hub/` or a global agent skill.
- Global skills must remain domain-independent or only lightly coupled to a specific domain. They should document scope, inputs, outputs, and limitations.
- When adding or modifying skills, update the relevant index documents so agents can discover and install them.

### 5. Design the Agent Research Environment

While keeping plain files and low complexity, define the four control surfaces of the agent environment:

- Artifact engineering: which files are durable state, and which are only scratch.
- Permission engineering: which materials cannot be deleted, rewritten, or published, and which evaluator or result files should be protected.
- Budget engineering: when agent-led research and intra-project parallelism may start, and when they should stop.
- Human oversight: how the human sets direction, grants permission, pauses work, reviews outputs, promotes work, or archives it.

### 6. Normalize Portfolio, Parallelism, and Evaluation

- The Active Projects table in `Memory/MEMORY.md` is the portfolio dashboard and should include owner, stage, priority, status, evaluator, and next action.
- `PROJECT_MEMORY.md` is the source of truth for project state; `index.md` is only a navigation summary.
- Intra-project parallel work should use isolated task workspaces such as `projects-folder/<Project>/Tasks/<task-id>/`, and only verified results should merge back into the project mainline.
- The evaluator should run hard checks first, then rubric scoring and LLM critique. The final evaluation target is paper/code/figures/references/reproducibility notes, not an idea description.

### 7. Update Documentation

Based on the exploration results, update or supplement these documents with minimal necessary changes:

- `README.md`: Explain what the Research OS is, how to start using it, and what the core directories are.
- `INSTRUCTION.md`: Define agent startup order, file read/write rules, memory rules, and research-material protection rules.
- `FILETREE.md`: Refresh the index if directory or file descriptions change.
- `Memory/MEMORY.md`: Update when research policy, portfolio, cross-project decisions, or general lessons change.
- `HANDOFF.md`: Record cross-session active work, reversible decisions, deviations, and intentionally-not-done items; do not turn it into a research dashboard.
- `AGENTS.md` and `CLAUDE.md`: Update only if needed, and keep them concise.
- If changes affect code, configuration, or experiment documentation under `projects-folder/templates/ai_research_template/Code/`, update both the English and Chinese README files there.

## Deliverables

When finished, provide:

1. A normalized Research OS repository with the necessary directory structure, files, and updated documentation. Codex and Claude Code should be able to start from the repository root, understand the project, and execute research tasks.
2. A bounded smoke test plan. If the local environment supports it, use Codex CLI or Claude Code to start from the repository root and complete a minimal example project, including runnable code, `main.tex`, and a compiled PDF. Do not design unbounded runs or recursive agent-calling tests.
3. An introduction document for the whole OS in HTML format.
4. A short change summary in HTML format explaining what changed and why.
5. A list of items that still require user decision, such as whether to implement evaluator scripts, whether to enable agent-led research, whether to add intra-project task templates, and whether a CLI/UI/monitor is needed.

## Acceptance Criteria

- A new agent that only reads `AGENTS.md` or `CLAUDE.md` is clearly directed to read `INSTRUCTION.md`.
- After reading `INSTRUCTION.md` and `FILETREE.md`, a new agent can understand the main directory responsibilities.
- A human can quickly understand the purpose and minimal workflow of this Research OS from `README.md`.
- Directory names in documentation match the actual repository directories.
- `task.md` and `task_en.md` are live construction guides and should stay aligned with the current OS design and paths; historical decisions and deviations belong in `HANDOFF.md`.
- The Research OS remains lightweight and does not introduce unnecessary tools, services, or complex workflows.
- The evaluation protocol for human-led and agent-led research is clear and does not judge only empty ideas.
- All updates follow the rules against inventing citations, data, or experiment results and against damaging original research materials.

## Non-Goals

- Do not turn this repository into a full web application or heavy platform.
- Do not introduce a database, backend service, complex CLI, or automation framework unless you first explain the necessity and get confirmation.
- Do not delete existing user research materials.
- Do not hard-code methods from a specific research domain as global rules.
- Do not create many empty files or deep directory structures just for formal completeness.
