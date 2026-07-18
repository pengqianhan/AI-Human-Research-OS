---
type: DesignReport
title: "从 Harness Handbook 到 Research Behavior Handbook：Research OS 导航与执行设计报告"
status: proposed
created: 2026-07-18
last_updated: 2026-07-18
---

# 从 Harness Handbook 到 Research Behavior Handbook

本报告分析如何将 Harness Handbook 的行为定位思想用于文件系统原生 Research OS，并说明 `codebase-design` 在其中应承担的辅助角色。它是后续改进的设计输入，不是新的运行事实源、构建状态表或已授权实施计划；实际状态仍以仓库制品、Git、Evaluator 和现有权威文件为准。

## 1. 结论

如果只能选择一个作为 Research OS 的顶层设计范式，应优先选择 **Harness Handbook**，再用 **codebase-design** 约束局部代码、Skill 和执行模块的内部结构。Runta 提供第三种互补视角：当 Agent 的决定变成真实文件、进程、网络和凭据操作时，由独立执行层实施强制约束和记录；这一层应作为经过现有 M4 闸门后才评估的未来能力，而不是当前 MVP 的前置依赖。

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

## 2. 三种方法解决的问题不同

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

### 2.3 Runta

[Runta](https://runta.com/blog/runta-the-execution-layer-for-agents/) 将自己定位为 Agent 下方的执行层。Agent 或 Harness 仍然决定下一步行动；Runta 在行动变成进程、文件、网络和凭据使用时，根据预先定义的策略控制其实际可达范围，并试图记录真实发生的动作。官方架构文档列出隔离 Runtime、资源控制、文件操作、Egress、Checkpoint、Secret Stub、Token X-Ray 和自动休眠等能力。[Runta Architecture](https://runta.com/docs/overview/)

它主要回答：

> Agent 已经决定执行某个动作时，系统实际允许它做什么，并以什么证据记录真实执行？

Runta 不解决研究意图的行为定位，也不替代 Harness 或 Skill；它提供的是更低一层的运行时治理。其产品发布文章中的毫秒级启动、成本收益和“所有生产 Agent 都需要执行层”等表述属于厂商主张，不能在缺少独立基准和安全审计时当作已验证事实。

### 2.4 对 Research OS 的分工建议

| 层次 | 首选方法 | 作用 |
|---|---|---|
| Research OS 顶层导航与任务执行 | Harness Handbook | 从研究意图定位到权威文件、状态、动作和证据 |
| 工作流与 Skill 契约 | 两者结合 | Handbook 负责发现和路由，deep module 原则负责减少调用者需要理解的细节 |
| `os-ui`、Evaluator、安装器、执行器等代码 | codebase-design | 设计较小 Interface、真实 Seam、Adapter 和稳定测试表面 |
| 未来的强制权限与隔离执行 | Runta 式 execution layer | 在文件、进程、网络、Secret 和资源边界强制实施 Research Run policy |

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
├── execution_policy      文件、网络、Secret、资源和运行时限制
├── expected_outputs      应产生什么制品
├── verification          怎样判断完成
├── execution_evidence    实际发生了什么，而不只是 Agent 声称什么
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

## 10. Runta：导航之后的执行与治理层

### 10.1 Runta 解决的核心问题

传统软件通常沿预先写好的路径执行，API gateway 可以在入口处做认证、授权、限流和熔断。Agent 则会在运行时根据模型输出、工具结果和新读取的数据决定下一步；恶意或错误指令可能被转化为看似正常的工具调用。因此，Runta 主张治理点不能只放在 Agent 或 API 入口，还要放在动作真正成为操作系统和网络行为的位置。[Runta 发布文章](https://runta.com/blog/runta-the-execution-layer-for-agents/)

它形成以下分层：

```text
Research Behavior Handbook
决定应读取什么、执行什么流程、产生什么证据
               ↓
Agent / Harness / Skills
根据上下文规划并发起工具调用
               ↓
Runta-like Execution Layer
在文件、进程、网络、Secret 和资源边界执行 policy
               ↓
OS / filesystem / network / external services
产生真实动作和可审计证据
```

Handbook 管的是 **semantic reach**：为了任务应去哪里。Runta 管的是 **enforced reach**：无论 Agent 怎样推理，它实际上能到哪里。Research OS 最终需要同时处理两者，但当前阶段应先证明导航与制品闭环，再用真实 OS Feedback 决定是否引入强制执行层。

### 10.2 官方资料能够确认的产品表面

| 能力 | 官方资料显示的机制 | 对 Research OS 的意义 |
|---|---|---|
| Isolated Runtime | Runtime 是可创建、暂停、恢复、调整资源和删除的隔离计算环境 | Research Run 可以拥有独立生命周期和资源边界 |
| Structured command execution | Python 和 TypeScript SDK 的 `exec` 支持 timeout、结构化 `env`，返回 exit code、stdout、stderr、duration 和截断标志 | 命令、环境和结果可成为明确执行合同，而不是只拼接 Shell 字符串 |
| Egress policy | 支持 hostname/wildcard 的 allowlist 或 denylist | 研究任务可以只访问声明过的模型、数据源和包仓库 |
| Secret Stubs | 真实 Secret 存在执行层；出站请求匹配 host/path 后由 gateway 注入 header | Agent 可以引用凭据，但不必接触真实值 |
| Checkpoints | 捕获 Runtime 文件系统和运行进程；恢复会创建新 Runtime，同一 Checkpoint 可多次 fork | 长任务可恢复或分叉执行，但不能替代语义化 research handoff |
| Token X-Ray / Compression | 可捕获工具输入输出、发现重复或过大内容，并在模型上下文前压缩受支持的工具输出 | 可以分析上下文浪费，但捕获内容本身形成新的敏感数据面 |
| Auto suspend/wake | Runtime 空闲后暂停，有新请求时恢复 | 长时间等待的 Agent 不必持续占用计算资源 |

上述能力分别由官方 [Architecture](https://runta.com/docs/overview/)、[Runtime Basics](https://runta.com/docs/runtime/runtime-basic/)、[Egress](https://runta.com/docs/runtime/egress/)、[Secret Stubs](https://runta.com/docs/runtime/secrets-and-secret-injection/)、[Checkpoints](https://runta.com/docs/runtime/checkpoints/)、[Token Saving](https://runta.com/docs/runtime/token-x-ray/) 和 [Auto Suspend and Wake-Up](https://runta.com/docs/runtime/auto-suspend-and-wake-up/) 文档描述。

一个与本报告前文环境变量讨论直接相关的例子是：Runta SDK 将环境变量作为命令执行参数，而不是要求模型把它们拼进 Shell 文本：

```python
result = runtime.exec(
    ["sh", "-lc", "python backtest.py"],
    timeout=30,
    env={"START_DATE": "2022-01-01"},
)
```

这表明 per-command `env` 可以由 Harness 原生实现，也可以由更低层的 Runtime Interface 实现。二者的差别在于信任边界：Harness 字段主要改善结构化调用；执行层还可以把它与任务权限、Secret、网络和审计结合。

### 10.3 Consume、Reach、Record

Runta 的发布文章将价值主张概括为三个方面：

1. **Consume**：在计算和模型调用层观察资源使用，暂停空闲 Runtime，并寻找 Token 浪费；
2. **Reach**：按任务 policy 限制文件、网络、凭据和外部目的地；
3. **Record**：记录实际系统调用、网络调用、文件写入、凭据使用及其对应 policy，而不只记录 Agent 声称要做什么。

其中 Reach 与 Record 对 Research OS 最重要。当前 Research OS 已经坚持“不读 transcript 也能验收”，Runta 进一步提醒：稳定制品仍然主要证明最终状态，完整治理还需要区分三类证据：

```text
Intent evidence       Agent/plan 声称准备做什么
Execution evidence    进程、文件和网络实际上发生了什么
Outcome evidence      Evaluator、测试和研究制品证明结果如何
```

这三类证据不能相互替代。执行成功不证明研究结论正确；Evaluator 结果也不自动证明执行期间没有访问越权资源。

### 10.4 对 Research OS 的具体启发

#### A. 为每个 Research Run 定义 task-scoped execution policy

未来的行为条目除了导航信息，还可以在概念上声明：

```yaml
execution_policy:
  filesystem:
    read:
      - projects-folder/<project>/**
      - paper-wiki/**
    write:
      - projects-folder/<project>/Code/runs/<run-id>/**
    deny:
      - projects-folder/<project>/Code/evaluator/**
  network:
    allow:
      - api.openai.com
      - arxiv.org
  secrets:
    references:
      - OPENAI_API_KEY
    expose_raw_value_to_agent: false
  resources:
    wall_time: 600s
    cpu_budget: 2h
    max_parallel_tasks: 3
  checkpoints:
    before_destructive_or_long_step: true
```

这只是未来 policy 的概念模型，不是建议现在新增 YAML manifest。当前阶段仍可由 phase contract、sandbox、项目规则和人工验收承载；只有真实 Run 证明约定不够时，才选择机器强制方式。

#### B. Secret 应以引用而不是明文进入任务

Runta 的 Secret Stub 将凭据与 Agent Runtime 分开，并在匹配的出站 host/path 上注入请求 header。[Secret Stubs](https://runta.com/docs/runtime/secrets-and-secret-injection/)

Research OS 应吸收的原则是：

```text
Agent 知道 secret reference 和允许用途
              ≠
Agent 获得 secret raw value
```

这比把 API Key 写进 prompt、命令字符串或项目 `.env` 更接近最小暴露原则。未来即使不采用 Runta，也应优先评估操作系统 Keychain、外部 Secret manager、受信任代理或短期令牌。

#### C. 网络策略应优先使用显式 allowlist

Runta 文档说明 Egress 支持 allowlist/denylist，但空 denylist 是默认开放策略；调用 `set policy` 还会替换整份策略。[Egress](https://runta.com/docs/runtime/egress/)

这说明“存在 Egress 功能”不等于“默认最小权限”。Research OS 若未来引入执行层，应：

- 为每个 Research Run 显式列出必要目的地；
- 把默认开放和策略覆盖行为纳入验收；
- 区分包安装、模型 API、论文检索、数据源和发布目的地；
- 将发布、上传、邮件和外部写操作继续置于人类批准之后。

#### D. Checkpoint 不能替代 Research Handoff

Runta Checkpoint 捕获文件系统和运行进程，适合恢复或 fork Runtime。[Checkpoints](https://runta.com/docs/runtime/checkpoints/) 但它不能回答：

- 当前研究问题是什么；
- 哪些实验结果可信；
- 为什么选择这条路线；
- 哪些假设已经被否定；
- 下一步需要什么人类决定。

因此需要同时保留：

```text
Operational checkpoint   恢复计算环境和进程
Semantic handoff          恢复研究理解、证据和决策状态
```

Research OS 目前以 plain files、Git、`PROJECT_MEMORY.md`、结果制品和 `HANDOFF.md` 承担 semantic handoff；未来 Runtime Checkpoint 只能作为补充。

#### E. Token 观测本身需要隐私和真实性边界

Runta 的 Token X-Ray 默认关闭，会捕获工具输入输出，使用 `ceil(characters / 4)` 估计 Token；官方明确说明估计值不是账单数据，捕获 payload 可能包含应用数据，应视为不可信输入。[Token Saving](https://runta.com/docs/runtime/token-x-ray/)

Research OS 若未来记录工具 I/O，应明确：

- 是否可能捕获论文全文、未发布结果、个人信息或 Secret；
- 捕获数据由谁读取、保存多久、怎样删除；
- Token 估计和真实计费怎样区分；
- 压缩后的上下文是否仍保留决定所需的证据；
- 原始制品仍然是事实源，压缩内容只是模型视图。

#### F. 资源生命周期应与 Research Run 对齐

Auto suspend/wake 说明 Runtime 可以在无任务时暂停并在请求到达时恢复。[Auto Suspend and Wake-Up](https://runta.com/docs/runtime/auto-suspend-and-wake-up/) 对长周期科研而言，更重要的原则是：

- 计算资源属于有边界的 Research Run；
- 空闲、等待人类批准和完成是不同状态；
- 暂停不能被误认为完成；
- 恢复后必须重新验证事实源、权限和停止条件；
- 资源节省需要真实测量，而不是只依赖平台宣传。

### 10.5 三层 Research OS 架构

综合三种来源，建议长期采用以下概念分层：

| 层 | 核心问题 | 主要设计来源 | 当前 Research OS 对应物 |
|---|---|---|---|
| Behavior/navigation layer | 应做什么、去哪里、相信什么、如何验收 | Harness Handbook | `INSTRUCTION.md`、`index.md`、Skills、State Registers |
| Module/harness layer | 怎样规划工具调用并把复杂度藏在稳定 Interface 后 | codebase-design | Skills、Evaluator、adapters、未来执行代码 |
| Execution/governance layer | 实际允许什么、真实发生什么 | Runta | 当前主要是 sandbox、权限约定、预算和人工验收；强制层受 M4 闸门约束 |

这三层必须保持职责分离：

- Handbook 不拥有动态状态，也不实施权限；
- Harness 不应凭 Agent 自述自行扩大 policy；
- Execution layer 不判断研究结论是否正确；
- Evaluator 和人类仍负责 outcome correctness 与方向性决定。

### 10.6 证据边界与采用条件

截至 2026-07-18，可确认 Runta 提供官方文档、CLI、Python/TypeScript SDK 和 REST API 表面；其公开 GitHub 组织展示 `clawshell` 与 Homebrew tap，但未明显公开完整平台实现。[Runta GitHub](https://github.com/runta-dev) 发布文章中的系统调用级审计、毫秒级启动、成本收益和融资信息均来自厂商自身，报告未找到独立性能基准、安全审计或生产对照研究。

因此，本报告不建议当前 Research OS 直接依赖 Runta。更合适的决策顺序是：

1. 先在现有七步 MVP 和 `circle_packing` Research Run 中记录实际权限、Secret、网络、资源和恢复摩擦；
2. 继续使用现有 sandbox、Evaluator、Git 和人类闸门形成基线；
3. 只有 OS Feedback 证明约定和现有 sandbox 不足，才进入 M4 评估；
4. 在 M4 比较 Runta、容器、操作系统 sandbox、网络代理和其他执行层，而不是预设供应商；
5. 采用前验证数据边界、Secret 模型、默认 Egress、审计完整性、Checkpoint 语义、成本、退出与迁移路径。

### 10.7 NeoSigma Agent Workspaces：高保真的执行工作空间

NeoSigma 将 Agent Workspace 定义为接近真实开发机、同时隔离、可复现和可销毁的完整运行环境，而不是普通任务文件夹或只提供 Shell 的 Sandbox。其架构分为四个平面：Control Plane 通过 warm pool、版本化 snapshot 和 readiness check 管理生命周期与启动延迟；Execution Plane 提供文件系统、仓库、Docker、MCP 和配套服务；Security and Network Plane 通过多层隔离、双向 allowlist 和外部凭据注入代理限制后果；Data Plane 通过共享 reference snapshot 与 database branching，为每次运行提供独立、可写且起点一致的数据状态。[NeoSigma: Workspaces — How We Built Sandbox Infrastructure for Autonomous Agents](https://www.neosigma.ai/blog/agent-workspaces)

其最有价值的抽象是把一次 Sandbox Run 看成受控实验：

```text
known starting state
    + observable execution trace
    + measurable outcome
```

对 Research OS，应明确区分：

```text
Research Workspace   持久保存问题、代码、论文、结果、决策和 handoff
Execution Workspace  临时运行 Agent、代码、服务和数据分支的隔离环境
```

Research Run 从前者取得任务、事实源、policy 和输入，把执行 trace、文件差异与结果交给独立 Evaluator，只有验证后的稳定制品再写回 Research Workspace。运行时 snapshot 或完整 trace 不能替代 semantic handoff：前者回答“从哪里开始、发生了什么”，后者回答“这些结果意味着什么、下一步是什么”。

当前可直接吸收的是已知初始状态、执行前 readiness check、Secret 不进入 Sandbox、出站 allowlist、execution trace 与 outcome evidence 分离等原则。Warm pool、Docker-in-sandbox、database branching 和硬件级隔离属于高成本基础设施；文章未提供独立安全审计、启动延迟/成本基准或多租户污染测试，因此只能作为 M4 后的候选架构参考，不能视为当前 MVP 的必要机制。

## 11. 建议的渐进落地路线

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

## 12. 成功标准

Research Behavior Handbook 的成功不应以“文档数量”衡量，而应以 Agent 是否更可靠地完成任务衡量：

1. Agent 能从自然语言意图找到完整且最小的任务上下文；
2. Agent 能区分导航文件、历史记录与唯一事实源；
3. 跨文件状态、权限和人类闸门不再依赖偶然搜索发现；
4. Agent 不读全部仓库也能找到正确 Skill、输出位置和验证方法；
5. 人类不读 transcript，也能依据稳定制品验收和继续；
6. Handbook 不复制项目状态，不成为新的漂移来源；
7. 导航收益高于维护和同步成本。

## 13. 主要风险与防护

| 风险 | 后果 | 防护 |
|---|---|---|
| 把所有文件都建成叶节点 | Handbook 比仓库更难读 | 只记录真实行为所需的最小闭包 |
| 复制动态状态 | 多个事实源发生漂移 | 只存定位器和更新规则 |
| 把文件边界当模块边界 | 错误理解行为结构 | 模块按 Interface/Seam 判断，文件仅是 Locator |
| 只记录 happy path | 漏掉权限、回退、清理和 blocked 状态 | State Register 显式覆盖转换和失败路径 |
| 一开始自动化过重 | 产生新基础设施债务 | 先手工试点并记录 OS Feedback |
| 只优化“找到更多文件” | 上下文膨胀、Scope 失控 | 同时衡量 Recall、无关读取和验证完成度 |
| Handbook 变成静态说明书 | 不能指导实际执行 | 每条工作流必须链接 procedure、output 和 verification |
| 把“有 execution layer”等同于默认安全 | 默认开放网络、错误 policy 或审计盲点被忽略 | 验证默认值、负向用例、Secret 暴露和越权失败行为 |
| 运行时日志捕获敏感研究内容 | 新增隐私、保留和访问风险 | 默认最小捕获、显式授权、保留期限和敏感字段清理 |
| 用 Runtime Checkpoint 替代研究交接 | 能恢复进程但无法恢复研究理解 | 始终同时维护 semantic handoff 和 outcome evidence |

## 14. 推荐决策

建议采用以下架构判断：

```text
顶层设计范式：Harness Handbook
目标：research-intent-to-artifact-and-action localization

局部设计范式：codebase-design
目标：让 Skills 和代码模块具有较小 Interface、较深 Implementation 和良好 Locality

未来执行治理范式：Runta-like execution layer
目标：在 Research Run 的文件、进程、网络、Secret 和资源边界强制实施 policy，并记录 execution evidence

事实源：plain files + Git + Evaluator
Handbook 角色：导航与验证定位，不拥有动态状态

实施策略：从七步 MVP 和三个真实工作流开始；先用现有 sandbox 建立基线，经过 fresh Agent 对照和真实 OS Feedback 后，再决定导航自动化或 M4 执行层
```

近期最有价值的下一步不是开发 Handbook generator 或接入 Runta，而是把已批准的 MVP 七步逐项写成可验证的行为条目，并在首次真实 Research Run 中同时测量导航错误、状态遗漏、无关文件读取、权限摩擦、Secret/网络需求和执行证据缺口。

## 15. 参考资料

- [Harness Handbook 论文笔记](../paper-wiki/papers/2607.13285.md)
- [Harness Handbook 本地参考仓库](references/Harness_Handbook/README.zh-CN.md)
- [codebase-design](../research-skills-hub/mattpocock-skills/engineering/codebase-design/SKILL.md)
- [codebase-design：Deepening](../research-skills-hub/mattpocock-skills/engineering/codebase-design/DEEPENING.md)
- [codebase-design：Design It Twice](../research-skills-hub/mattpocock-skills/engineering/codebase-design/DESIGN-IT-TWICE.md)
- [Research OS 操作合同](../INSTRUCTION.md)
- [Research OS 构建目标](GOAL.md)
- [Research OS 构建路线图](map/index.md)
- [Runta 发布文章：The execution layer for agents](https://runta.com/blog/runta-the-execution-layer-for-agents/)
- [Runta Architecture](https://runta.com/docs/overview/)
- [Runta Runtime Basics](https://runta.com/docs/runtime/runtime-basic/)
- [Runta Egress](https://runta.com/docs/runtime/egress/)
- [Runta Secret Stubs](https://runta.com/docs/runtime/secrets-and-secret-injection/)
- [Runta Checkpoints](https://runta.com/docs/runtime/checkpoints/)
- [Runta Token Saving](https://runta.com/docs/runtime/token-x-ray/)
- [Runta Auto Suspend and Wake-Up](https://runta.com/docs/runtime/auto-suspend-and-wake-up/)
- [Runta GitHub organization](https://github.com/runta-dev)
- [NeoSigma: Workspaces — How We Built Sandbox Infrastructure for Autonomous Agents](https://www.neosigma.ai/blog/agent-workspaces)
