# Task: 构建和演化 AI-Human Research OS

## 背景

本仓库正在构建一个面向人类研究者和 code agent 共同使用的轻量级 Research OS。它是一个 file-system-native 的 agent research environment：用稳定的目录、Markdown 记忆、论文库、项目模板、技能和评估记录来支撑长期、迭代式的人机协同研究。

这个系统的第一目标是服务人类用户自己的研究实践；可复用开源模板是副产物，未来产品化可能性保持兼容但不驱动当前复杂度。它不是优先构建一个复杂平台，而是让 Codex、Claude Code 等 code agent 能够用更少 token、更稳定的路径约定、更清晰的上下文读取方式，协助人类完成长期研究任务。可以把 code agent 理解为这个 Research OS 的执行核心，人类主要通过自然语言与它交互和监督。

方向层的长期目标（agent-agnostic 的 agent-native OS）见 [GOAL.md](GOAL.md)；本文件是其操作层构建指南。本文件是构建和演化这个 OS 的活指导文件，不是历史记录，也不是逐条执行清单。请从这里开始理解构建目标，再以 `INSTRUCTION.md`、`Memory/MEMORY.md`、`FILETREE.md` 和实际目录为当前事实源。可以偏离本文的具体建议，但需要说明偏离原因、影响和权衡。

## 总目标

请从本文件出发，持续构建和演化本仓库的 Research OS，使其成为一个简单、高效、可演化、便于 code agent 长期运行的研究环境。

这个 OS 应帮助 agent 快速回答以下问题：

1. 当前研究项目的目标、背景、进展和关键记忆在哪里？
2. 新想法、参考文献、实验代码、图表、写作材料应该放在哪里？
3. agent 每次进入仓库后应该优先读取哪些文件？
4. 如何从一个 idea 启动一个新的研究项目或论文草稿？
5. 什么时候应该把经验沉淀为项目内记忆、项目内 skill，或全局通用 skill？
6. 如何在多个项目之间维护 portfolio，并只在必要时启动项目内并行 agent？
7. 如何用统一评委协议评估 human-led 和 agent-led research 的完整 artifacts？

## 设计原则

- 遵循奥卡姆剃刀原则：如无必要，勿增实体。
- 优先服务 code agent 的可读性、可检索性和低 token 消耗。
- 优先适配 macOS 和 Linux；Windows 只做 best-effort 兼容。
- 保持目录结构轻量，不引入复杂数据库、服务端或重型框架，除非有明确必要。
- 所有研究主张、引用、数据和实验结果都必须可追溯，不允许编造引用、数据或结果。
- 保留用户提供的原始研究材料；不要在未确认的情况下删除或大幅改写原始资料。
- 允许 Research OS 在使用中演化，但全局经验必须保持通用，避免过拟合到某个具体领域或项目。
- 这个 Research OS 需要开放，方便用户通过 project templates、skills 和轻量约定扩展功能。
- 把 OS 视为 agent environment：通过 artifacts、permissions、budgets、human oversight 和 evaluator 约束 agent，而不是只靠提示词。
- 默认策略是 `portfolio always on, intra-project parallelism on demand`：多个项目可同时存在和排队，但项目内多 agent 并行只在任务可拆解、可验证、值得合并成本时启动。
- agent-led research 由 `Memory/MEMORY.md` 中的 `agent_led_research` 控制，默认 `off`，可选 `scout_only` 或 `full_gated`。
- human-led 和 agent-led research 都应使用同一个统一评委协议：硬检查 + rubric scoring + LLM critique，最终评价完整 artifact 而不是空 idea。

## 自主判断规则

- `task.md` 提供构建方向，不替代对仓库现状的检查。
- 当 `task.md`、`INSTRUCTION.md`、`Memory/MEMORY.md`、`README.md`、`FILETREE.md` 或实际目录结构冲突时，优先相信实际目录结构、`INSTRUCTION.md` 和 `Memory/MEMORY.md`，并把冲突记录为待决策事项。
- 优先做小而可逆的改动；不要为了“完整”创建大量空目录、复杂脚本或重型框架。
- 如果发现比本文建议更简单、更清晰的设计，可以采用自己的方案。
- 对不确定事项先给出保守实现或文档化建议，不要假装已经解决。
- 最终交付时说明做了什么、为什么这样做、哪些地方刻意没有做。

## 当前关键目录和文件

以下是当前设计意图的参考。请以仓库中实际存在的路径为准，并在必要时修正文档中的命名不一致问题。

- `Ideas/`：保存研究想法、灵感、假设、初步讨论和 idea 日志。
- `paper-library/`：repo 级共享论文库，保存单篇论文笔记、topic synthesis 和 `viz.html`。项目特定引用放在项目内 `paper/references.bib`。
- `Memory/`：保存长期研究记忆、项目记忆、重要背景和阶段性进展。
- `projects-folder/`：保存项目实例和 reusable project templates。
- `projects-folder/templates/ai_research_template/`：从可行 idea 启动 AI research paper 项目的当前模板。
- `Research-skills-hub/`：保存可复用研究技能，类似 research skills 的 app store。
- `INSTRUCTION.md`：agent 每次进入仓库后必须优先读取的全局操作指南。
- `Memory/MEMORY.md`：全局 research policy、Active Projects portfolio、跨项目决策和经验。
- `FILETREE.md`：仓库结构导航索引，供 agent 快速理解目录用途。
- `README.md`：面向人类的项目概览、当前能力和 roadmap。
- `AGENTS.md` / `CLAUDE.md`：分别面向 Codex 和 Claude Code 的入口说明。

## 建议探索方向

### 1. 梳理现有结构

- 阅读 `INSTRUCTION.md`、`README.md`、`FILETREE.md`、`AGENTS.md`、`CLAUDE.md` 和现有目录结构。
- 找出目录命名、职责描述、启动流程、文档入口之间的不一致。
- 特别检查 live docs 是否仍引用旧路径，例如 `References/`、`Paper_Initial_template/`、`Paper_initial_template/`。历史记录可保留旧名，但构建指导文件和操作文档应使用当前路径。

### 2. 规范 Research OS 的使用模型

优先考虑在文档中明确以下流程：

- agent 新会话启动时应该读取哪些文件，以及读取顺序是什么。
- 人类如何把一个新想法记录到 `Ideas/`。
- 一个 idea 被判断为可行后，如何基于 `projects-folder/templates/ai_research_template/` 启动新的研究项目或论文草稿。
- 论文如何进入共享 `paper-library/`，如何更新单篇笔记、topic synthesis、项目内 BibTeX 和 claim/evidence 记录。
- 研究过程中产生的代码、数据、图表、baseline、写作材料应该如何归档。
- 研究经验如何沉淀到 `Memory/`、项目内 `.agents` / `.claude`，或全局 `Research-skills-hub/`。
- portfolio 如何在 `Memory/MEMORY.md` 中维护，项目事实源如何放在 `PROJECT_MEMORY.md`，以及 `HANDOFF.md` 如何保持窄边界。
- agent-led research 如何受 `off` / `scout_only` / `full_gated` 控制。
- 统一评委如何评估完整 research artifact，并把完整报告放入项目内 `Evaluations/`。

### 3. 设计分层记忆机制

在保持轻量的前提下，明确记忆分层：

- 全局记忆：长期目标、跨项目经验、通用研究原则。
- 项目记忆：当前项目的目标、上下文、阶段性进展、关键决策和待办。
- 任务记忆：单次 agent 任务中产生的临时发现、执行记录和后续行动。

请说明每类记忆适合存放在哪里、何时更新、由谁更新，以及如何避免过度积累无用信息。

### 4. 规范 skill 演化机制

请定义从经验到 skill 的沉淀流程：

- 如果经验只适用于当前项目，应保存在该项目的记忆或项目内 agent skill 中。
- 如果经验对多个研究项目有通用价值，才考虑进入 `Research-skills-hub/` 或全局 agent skill。
- 全局 skill 必须保持领域无关或低领域耦合，并说明适用范围、输入、输出和限制。
- 新增或修改 skill 时，应同步更新相关索引文档，方便 agent 发现和安装。

### 5. 设计 agent research environment

在保持 plain files 和低复杂度的前提下，明确 agent 运行环境的四个控制面：

- Artifact engineering：哪些文件是 durable state，哪些只是 scratch。
- Permission engineering：哪些材料不能删除、重写、发布，哪些 evaluator 或结果文件应受保护。
- Budget engineering：agent-led research 和项目内并行何时允许启动，何时停止。
- Human oversight：人类如何定方向、授权、暂停、审核、提升或归档研究任务。

### 6. 规范 portfolio、并行和评估

- `Memory/MEMORY.md` 的 Active Projects 表是 portfolio dashboard，应包含 owner、stage、priority、status、evaluator、next action。
- `PROJECT_MEMORY.md` 是项目状态事实源，`index.md` 只是导航摘要。
- 项目内并行应使用独立 task workspace，例如 `projects-folder/<Project>/Tasks/<task-id>/`，只把可验证结果合并回主线。
- evaluator 应先做硬检查，再做 rubric scoring 和 LLM critique；最终评价对象是 paper/code/figures/references/reproducibility notes，而不是 idea 描述。

### 7. 更新文档

根据探索结果，在尽量少改动的前提下，更新或补充以下文档：

- `README.md`：面向人类解释 Research OS 是什么、如何开始使用、核心目录是什么。
- `INSTRUCTION.md`：面向 agent 明确启动顺序、文件读写规则、记忆规则和研究材料保护规则。
- `FILETREE.md`：如果目录或文件说明发生变化，需要刷新索引。
- `Memory/MEMORY.md`：当 research policy、portfolio、跨项目决策或通用经验发生变化时更新。
- `HANDOFF.md`：记录跨 session 的 active work、可逆决策、偏离和 intentionally not done；不要让它变成研究 dashboard。
- 必要时更新 `AGENTS.md` 和 `CLAUDE.md`，但保持它们简洁。
- 如涉及 `projects-folder/templates/ai_research_template/Code/` 下的代码、配置或实验说明，需同步更新英文和中文 README。

## 交付物

完成后请提供：

1. 一个规范化后的 Research OS 仓库，包含必要的目录结构、文件和更新后的文档。Codex 和 Claude Code 应能从仓库根目录开始理解项目并执行研究任务。
2. 一个有边界的 smoke test 方案。若本地环境可用，可以用 Codex CLI 或 Claude Code 从根目录启动测试；目标是完成一个最小示例项目，包括可运行 code、`main.tex`，以及可编译出的 PDF。不要设计无界运行或递归调用 agent 的测试。
3. 整个 OS 的介绍文档，HTML 格式。
4. 一份简短的变更总结，说明改了什么、为什么改，HTML 格式。
5. 一份待用户决策的问题列表，例如是否需要 evaluator 脚本、是否开启 agent-led research、是否需要项目内并行任务模板、是否需要 CLI/UI/monitor。

## 验收标准

- 新 agent 只读 `AGENTS.md` 或 `CLAUDE.md` 后，能被明确引导去读 `INSTRUCTION.md`。
- 新 agent 读完 `INSTRUCTION.md` 和 `FILETREE.md` 后，能理解仓库主要目录职责。
- 人类能从 `README.md` 快速理解这个 Research OS 的用途和最小使用流程。
- 文档中的目录名与仓库实际目录保持一致。
- `task.md` / `task_en.md` 作为活指导文件，应与当前 OS 设计和路径保持一致；历史决策和偏离放入 `HANDOFF.md`。
- Research OS 的设计保持轻量，没有引入不必要的新工具、服务或复杂流程。
- human-led 和 agent-led research 的评估协议清楚，且不会只评价空 idea。
- 所有更新都遵守“不编造引用、数据、实验结果”和“保护原始研究材料”的规则。

## 非目标

- 不要把本仓库改造成完整 Web 应用或重型平台。
- 不要引入数据库、后端服务、复杂 CLI 或自动化框架，除非先说明必要性并获得确认。
- 不要删除用户已有研究材料。
- 不要把特定研究领域的方法硬编码为全局规则。
- 不要为了形式完整而创建大量空文件或深层目录。
