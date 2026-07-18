---
type: DesignReport
title: "从 Harness Handbook 到 Research Behavior Handbook：Research OS 导航与执行设计报告"
status: proposed
created: 2026-07-18
---

# 从 Harness Handbook 到 Research Behavior Handbook

本报告分析如何将 Harness Handbook 的行为定位思想用于文件系统原生 Research OS，并说明 `codebase-design` 在其中应承担的辅助角色。它是后续改进的设计输入，不是新的运行事实源、构建状态表或已授权实施计划；实际状态仍以仓库制品、Git、Evaluator 和现有权威文件为准。

## 1. 结论

如果只能选择一个作为 Research OS 的顶层设计范式，应优先选择 **Harness Handbook**，再用 **codebase-design** 约束局部代码、Skill 和执行模块的内部结构。

原因是 Research OS 当前最核心的问题不是单个代码模块的接口设计，而是：

> Agent 收到自然语言研究任务后，怎样快速定位正确的事实源、当前状态、操作流程、工具、允许写入的位置和验收证据？

这与 Harness Handbook 的 **behavior localization** 高度一致。需要做的不是照搬代码中心的 `behavior-to-code` 表示，而是把它推广为：

```text
research intent
    → research workflow
    → authoritative artifacts and state
    → skill / tool / command
    → output artifact
    → verification evidence
```

本报告将这种推广称为 **Research Behavior Handbook**。

## 2. 两种方法解决的问题不同

### 2.1 codebase-design

[`codebase-design`](../research-skills-hub/mattpocock-skills/engineering/codebase-design/SKILL.md) 关注如何设计深模块：在清晰的 Seam 上提供较小的 Interface，将大量复杂 Implementation 隐藏在后面，从而提高：

- **Depth**：调用者学习较少的 Interface，获得较多行为能力；
- **Leverage**：一份实现服务多个调用者和测试；
- **Locality**：修改、知识、错误和验证集中在一个位置；
- **Testability**：调用者和测试通过同一个 Interface 使用模块。

它主要回答：

> 一个行为应该封装在哪里？Interface、Seam 和 Adapter 应该怎样设计？

配套的 [`DEEPENING.md`](../research-skills-hub/mattpocock-skills/engineering/codebase-design/DEEPENING.md) 讨论如何把浅模块簇重构为深模块；[`DESIGN-IT-TWICE.md`](../research-skills-hub/mattpocock-skills/engineering/codebase-design/DESIGN-IT-TWICE.md) 讨论如何提出并比较多个 Interface 方案。

### 2.2 Harness Handbook

[`Harness Handbook`](../paper-wiki/papers/2607.13285.md) 关注行为定位：用户用行为语言提出修改请求，但现有仓库按文件、函数、模块和调用关系组织。一个行为可能跨越工具 Schema、共享状态、执行路径、回退分支和测试，因此 Agent 需要一个从行为到权威实现位置的导航层。

它主要回答：

> 一个行为现在实际上分布在哪里？为完成修改，哪些实现位置必须被找到和验证？

论文采用：

- L1 系统总览；
- L2 阶段或组件说明；
- L3 文件或函数叶节点；
- 跨阶段 State Register；
- Behavior-Guided Progressive Disclosure；
- 以实时仓库为最终权威的 Source Locator 验证与同步。

### 2.3 对 Research OS 的分工建议

| 层次 | 首选方法 | 作用 |
|---|---|---|
| Research OS 顶层导航与任务执行 | Harness Handbook | 从研究意图定位到权威文件、状态、动作和证据 |
| 工作流与 Skill 契约 | 两者结合 | Handbook 负责发现和路由，deep module 原则负责减少调用者需要理解的细节 |
| `os-ui`、Evaluator、安装器、执行器等代码 | codebase-design | 设计较小 Interface、真实 Seam、Adapter 和稳定测试表面 |

两者不是替代关系。Handbook 让 Agent **完整找到变化**；codebase-design 让未来的变化尽可能**集中在更少、更深的模块中**。

## 3. 为什么 Handbook 可以推广到非纯代码系统

论文的实验对象是 Codex 和 Terminus-2，因此它的构建方法依赖函数、文件、调用图和代码位置。但其一般问题并不局限于代码：

> 用户的行为语言与系统内部事实组织方式不一致。

Research OS 仍然是一个 repository，只是它的运行语义由多种制品共同实现：

- Markdown 规范、索引和决策；
- paper notes、topic synthesis 和引用；
- 项目状态、研究记忆和 handoff；
- Skills、prompts、scripts 和 agent adapters；
- 源代码、配置、数据、实验产物和图表；
- Evaluator、测试、验证命令和评审报告；
- 权限、预算、人类批准和停止条件；
- Git 历史及其可验证变更。

因此，Research OS 需要把论文中的代码叶节点扩展为多类型叶节点：

```text
Artifact   论文、数据、配置、图表、报告、结果
State      项目阶段、预算、权限、当前结论、待决策项
Procedure  操作合同、阶段 prompt、runbook
Skill      可复用研究能力
Command    脚本、测试、Evaluator、验证命令
Policy     允许、禁止、审批与保护规则
Decision   人类选择及其理由
Evidence   测试输出、result.json、评审与引用来源
```

代码调用图中的 `calls` 关系也应扩展成适合研究活动的关系：

```text
reads        读取
writes       写入
produces     产生
consumes     消费
verifies     验证
authorizes   授权
blocks       阻止
supersedes   取代
promotes     晋升
routes-to    路由到
```

这使 Handbook 从 `behavior-to-code localization` 变成：

> `research-intent-to-artifact-and-action localization`。

## 4. 现有 Research OS 已具备的 Handbook 雏形

Research OS 不需要从零建立导航体系。当前仓库已经包含以下组成部分：

| 现有制品 | 当前职责 | Handbook 角色 |
|---|---|---|
| [`FILETREE.md`](../FILETREE.md) | 顶层结构导航 | 结构地图；回答“有什么”，但不充分回答“怎样完成行为” |
| [`INSTRUCTION.md`](../INSTRUCTION.md) | Agent 操作合同与 workflow routing | 最接近 L1 行为入口和全局权威关系 |
| 各目录 `index.md` | 目录语义和局部导航 | L2 局部入口 |
| [`CONTEXT.md`](../CONTEXT.md) | Research OS 领域词汇和 MVP 定义 | 行为语言与目标语义 |
| [`HANDOFF.md`](../HANDOFF.md) | 跨会话工作、决策和偏差 | 跨会话 State Register |
| `memory/MEMORY.md` | portfolio 和全局研究状态 | 全局 State Register |
| `PROJECT_MEMORY.md` | 项目状态、进展和 OS Feedback | 项目 State Register |
| `research-skills-hub/` | 可复用研究流程 | Procedure / Skill 叶节点 |
| `verify.sh` | 仓库一致性检查 | Verification anchor |
| 项目 Evaluator 和 `result.json` | 独立评分与结果事实 | Evidence 叶节点和保护边界 |
| [`os-build/map/index.md`](map/index.md) | 构建 waypoint、edge、证据和人类验收 | 构建领域的行为图和状态转换表 |

当前主要缺口不是新的文件树，而是这些制品之间缺少统一、显式的行为关系。例如 Agent 收到“继续这个研究”后，还需要自行推断：

- 哪些文件必须先读；
- 哪个文件表示当前状态；
- 哪些文件只是导航或历史说明；
- 应调用哪个 Skill 或命令；
- 可以写入什么、不得修改什么；
- 应产生哪些制品；
- 什么证据才表示完成；
- 哪些选择必须交还人类。

## 5. 目标：从文件定位升级为任务定位

“让 Agent 更方便地找到文件”应升级为更完整的目标：

> 让 Agent 从自然语言研究意图定位到一个最小、完整、可验证的任务执行包。

这个执行包可以概念化为：

```text
Task Context
├── authoritative_files   必须相信哪些事实源
├── current_state         当前研究处于什么状态
├── procedure             应遵循什么流程
├── tools_and_skills      应使用什么能力
├── allowed_writes        允许修改什么
├── protected_artifacts   不得修改什么
├── expected_outputs      应产生什么制品
├── verification          怎样判断完成
└── human_decisions       哪些选择必须交还人类
```

完整性比返回更多文件更重要。理想输出是完成任务所需的**最小闭包**：既不遗漏必要状态和冷路径，也不让 Agent 阅读整个仓库。

## 6. Research Behavior Handbook 的建议表示

### 6.1 L1：研究行为总览

L1 回答：Research OS 能支持哪些主要研究行为，各行为进入哪个工作流？

建议从已经确定的 MVP 七步闭环开始：

1. 接收 Research Input Artifact；
2. 放置到正确 OS 边界；
3. 理解并记录当前研究状态；
4. 在授权和预算内续研；
5. 用可追溯证据评估；
6. 捕获并按证据晋升经验；
7. 不读 transcript 也能交还人类。

这些步骤已经体现在现有构建路线中，应成为首批行为骨架，而不是另行发明一套生命周期。

### 6.2 L2：工作流条目

每个真实工作流至少记录：

| 字段 | 含义 |
|---|---|
| User intent | 用户会怎样表达这个任务 |
| Preconditions | 任务开始前必须成立什么 |
| Read authority | 必须先读取哪些权威文件 |
| Current state | 当前状态存在哪里 |
| Procedure | 使用哪个 Skill、prompt 或 runbook |
| Allowed writes | 可以修改哪些范围 |
| Protected artifacts | 哪些制品不得修改或只能由特定工具写入 |
| Outputs | 应交付哪些稳定制品 |
| Verification | 运行什么检查，什么结果算通过 |
| Human gate | 哪些决定必须由人类做出 |
| Next route | 完成、失败或 blocked 后去哪里 |

示例：

| 用户意图 | 先读 | 状态源 | 使用 | 输出 | 验证 |
|---|---|---|---|---|---|
| 添加论文 | `paper-wiki/index.md` | paper index | `paper-wiki-manager` | paper note、必要索引 | `./verify.sh` |
| 开始项目 | idea、template index | `memory/MEMORY.md` | 项目模板 | 项目目录和项目记忆 | 模板及链接检查 |
| 继续实验 | project index、`PROJECT_MEMORY.md`、Code README | 项目记忆、真实 run 产物 | 实验脚本、Evaluator | `runs/`、结果和进展记录 | evaluator、项目检查 |
| 晋升 Skill | 项目经验、hub index | 项目证据 | skill installer/organizer | hub 与 adapter copies | `./verify.sh` |
| 恢复中断任务 | HANDOFF、项目记忆、真实制品 | 最近稳定状态 | 对应 Skill | 新进展和稳定 handoff | 项目验收 |

### 6.3 L3：权威定位器

L3 不应复制源文件内容，而应给出可验证定位器：

- 文件路径；
- Markdown 标题或表格名称；
- JSON/YAML 字段；
- Skill 入口；
- 可执行命令；
- 预期输出路径；
- 相关保护规则；
- 最近一次验证方式。

文件不是天然的模块边界。同一个行为可能跨多个文件；一个文件也可能承载多个行为。L3 的任务是可靠定位，而不是把目录结构重新包装成行为结构。

### 6.4 State Register

对跨工作流状态建立小型 State Register，记录：

| 字段 | 含义 |
|---|---|
| State | 状态名称 |
| Authority | 唯一事实源 |
| Readers | 哪些工作流读取 |
| Writers | 哪些工作流或工具可以写入 |
| Transitions | 允许的状态转换 |
| Clear/archive | 何时清理或归档 |
| Verification | 怎样确认状态真实有效 |

首批候选状态包括：

- portfolio 中的项目阶段；
- 项目当前假设和下一步；
- Research Run 预算与停止条件；
- 允许/禁止的操作；
- Evaluator 冻结和保护状态；
- 实验结果与主张证据；
- 待人类决定的事项；
- 经验从项目到 memory 或 Skill 的晋升状态。

## 7. Research OS 版渐进披露

建议的导航顺序是：

```text
用户研究意图
    ↓
L1：选择工作流
    ↓
L2：确定项目、阶段、事实源和权限
    ↓
State Register：追踪跨文件状态和人类闸门
    ↓
L3：打开最少必要的文件、Skill、命令和证据
    ↓
在实时制品中重新验证定位器
    ↓
执行、验收、写回稳定状态
```

这与当前“先读入口链，再按最近 `index.md` 深入”的设计兼容。Handbook 应增强路由，不应要求每次把全部 L1-L3 内容加载进上下文。

## 8. 与现有权威文件的集成原则

### 8.1 不建立第二事实源

Handbook 只描述“去哪里读写和验证”，不复制不断变化的状态。

错误方式：

```text
在 Handbook 中复制当前项目阶段、最新分数和待办事项。
```

正确方式：

```text
声明项目阶段以 PROJECT_MEMORY.md 为准；
实验分数只相信冻结 Evaluator 生成的 result.json；
构建进度只以 os-build/map/index.md 为准。
```

### 8.2 先扩展现有路由，再决定是否新增目录

最小落地路径是扩展 `INSTRUCTION.md` 已有的 workflow routing，使其逐步包含：

```text
intent → authority → state → procedure → writes → outputs → verification
```

只有当真实 Research Run 表明该表过大或难以渐进读取时，才考虑新增独立的 `research-behaviors/` 目录。没有 OS Feedback 证据前，不需要数据库、机器可读 manifest、知识图谱或常驻生成服务。

### 8.3 结构地图与行为地图并存

- `FILETREE.md` 继续回答“仓库里有什么”；
- Research Behavior Handbook 回答“为了完成这个行为应该去哪里”；
- 两者均指向同一批实时权威制品，但不互相复制状态。

## 9. codebase-design 在 Research OS 中的具体作用

### 9.1 Skill 可以被视为深模块

```text
Interface       SKILL.md 的触发条件、输入、输出和限制
Implementation  scripts、references、templates 和内部步骤
Leverage        Agent 学习一个入口即可完成复杂流程
Locality        流程变化集中在 Skill 内，而不是散落在多个 prompt
```

Handbook 负责把任务路由到正确 Skill；deep module 原则负责让该 Skill 的 Interface 足够小且稳定。

### 9.2 代码模块使用 deep module 原则

以下区域更直接适合 `codebase-design`：

- `os-ui` 的 TypeScript server 和前端状态；
- Evaluator 与实验运行器；
- Skill 安装与同步逻辑；
- agent adapter；
- 未来经过闸门批准的执行器、CLI 或服务。

例如，当 Handbook 显示一个简单行为每次都必须修改大量机械转发层时，应检查：

- 是否存在浅模块；
- Schema 是否重复声明；
- 状态读写是否过度分散；
- Seam 是否放错位置；
- 是否可以建立一个更深的执行模块和稳定测试表面。

Handbook 可以暴露 Locality 问题；codebase-design 可以修正这些问题。重构完成后，再同步行为定位器。

## 10. 建议的渐进落地路线

### 阶段 A：用现有 MVP 七步建立手工行为地图

目标：不新增运行机制，只补足行为到权威制品的显式映射。

1. 以七步 MVP 为 L1；
2. 为每一步记录 authority、state、procedure、output 和 verification；
3. 只链接现有文件，不复制状态；
4. 与 `INSTRUCTION.md`、目录 `index.md` 和 `os-build/map/` 对齐；
5. 用 `circle_packing` 首次 Research Run 验证。

### 阶段 B：选择三个高频工作流做试点

建议首批试点：

1. 添加并理解一篇论文；
2. 从 partial artifact 恢复一个研究项目；
3. 运行一次实验、评估结果并完成稳定 handoff。

这三类任务分别覆盖知识摄取、状态恢复和证据闭环，比一次性枚举所有行为更有代表性。

### 阶段 C：用 fresh Agent 做对照验证

对同一任务比较：

- 仅使用现有结构导航；
- 使用 Research Behavior Handbook 路由。

至少记录：

| 指标 | 含义 |
|---|---|
| Relevant-file recall | 必要权威文件是否全部找到 |
| Irrelevant reads | 是否读取大量无关文件 |
| Authority errors | 是否相信了错误或陈旧的文件 |
| State omissions | 是否遗漏预算、权限、当前阶段或待决策项 |
| Wrong writes | 是否写入错误位置或破坏受保护制品 |
| Verification completion | 是否运行了正确检查并提供证据 |
| Context cost | 阅读文件数、上下文 token 或完成时间 |
| Handoff quality | 人类能否不读 transcript 验收和继续 |

### 阶段 D：只对已证实的维护成本自动化

只有真实使用证明手工同步成为明显摩擦时，才考虑：

- 检查失效链接和不存在的 Source Locator；
- 检查行为条目是否缺少 authority 或 verification；
- 从稳定索引生成只读导航摘要；
- 在相关 diff 后提示需要复核的行为条目。

在此之前，不建议直接复制论文的函数级静态分析器或构建新的机器状态系统。

## 11. 成功标准

Research Behavior Handbook 的成功不应以“文档数量”衡量，而应以 Agent 是否更可靠地完成任务衡量：

1. Agent 能从自然语言意图找到完整且最小的任务上下文；
2. Agent 能区分导航文件、历史记录与唯一事实源；
3. 跨文件状态、权限和人类闸门不再依赖偶然搜索发现；
4. Agent 不读全部仓库也能找到正确 Skill、输出位置和验证方法；
5. 人类不读 transcript，也能依据稳定制品验收和继续；
6. Handbook 不复制项目状态，不成为新的漂移来源；
7. 导航收益高于维护和同步成本。

## 12. 主要风险与防护

| 风险 | 后果 | 防护 |
|---|---|---|
| 把所有文件都建成叶节点 | Handbook 比仓库更难读 | 只记录真实行为所需的最小闭包 |
| 复制动态状态 | 多个事实源发生漂移 | 只存定位器和更新规则 |
| 把文件边界当模块边界 | 错误理解行为结构 | 模块按 Interface/Seam 判断，文件仅是 Locator |
| 只记录 happy path | 漏掉权限、回退、清理和 blocked 状态 | State Register 显式覆盖转换和失败路径 |
| 一开始自动化过重 | 产生新基础设施债务 | 先手工试点并记录 OS Feedback |
| 只优化“找到更多文件” | 上下文膨胀、Scope 失控 | 同时衡量 Recall、无关读取和验证完成度 |
| Handbook 变成静态说明书 | 不能指导实际执行 | 每条工作流必须链接 procedure、output 和 verification |

## 13. 推荐决策

建议采用以下架构判断：

```text
顶层设计范式：Harness Handbook
目标：research-intent-to-artifact-and-action localization

局部设计范式：codebase-design
目标：让 Skills 和代码模块具有较小 Interface、较深 Implementation 和良好 Locality

事实源：plain files + Git + Evaluator
Handbook 角色：导航与验证定位，不拥有动态状态

实施策略：从七步 MVP 和三个真实工作流开始，经过 fresh Agent 对照后再决定自动化
```

近期最有价值的下一步不是开发 Handbook generator，而是把已批准的 MVP 七步逐项写成可验证的行为条目，并在首次真实 Research Run 中测量它是否减少错误定位、状态遗漏和无关文件读取。

## 14. 参考资料

- [Harness Handbook 论文笔记](../paper-wiki/papers/2607.13285.md)
- [Harness Handbook 本地参考仓库](references/Harness_Handbook/README.zh-CN.md)
- [codebase-design](../research-skills-hub/mattpocock-skills/engineering/codebase-design/SKILL.md)
- [codebase-design：Deepening](../research-skills-hub/mattpocock-skills/engineering/codebase-design/DEEPENING.md)
- [codebase-design：Design It Twice](../research-skills-hub/mattpocock-skills/engineering/codebase-design/DESIGN-IT-TWICE.md)
- [Research OS 操作合同](../INSTRUCTION.md)
- [Research OS 构建目标](GOAL.md)
- [Research OS 构建路线图](map/index.md)

