# GOAL: 从文件系统到 Agent-Native Research OS

> **方向层目标(北极星)**。2026-07-04 由用户确立:在"服务用户自身研究实践"的前提下,
> 把本仓库演化为 agent-agnostic 的 agent-native Research OS(决策记录见
> [HANDOFF.md](../HANDOFF.md) Decisions)。
>
> **长期愿景层**:本文件描述 Long-term Research OS 的方向、长期设计原则与战略
> 治理闸门,不充当当前 MVP 的逐步实施说明。两个旧 task 文件已删除,其仍有效原则已
> 吸收为本文的长期约束,原文保存在 Git commit
> `38d79be74b463dc41b0b651e5510ac7346502cbd`。[build_phases/](build_phases/)
> 是 Research OS MVP 的阶段执行合同;MVP 的正式定义见 [CONTEXT.md](../CONTEXT.md)。
> 运行事实源 = 实际目录结构、[INSTRUCTION.md](../INSTRUCTION.md)、
> [memory/MEMORY.md](../memory/MEMORY.md)、[HANDOFF.md](../HANDOFF.md)(Decisions)、
> [FILETREE.md](../FILETREE.md)。
>
> 本文与运行事实源冲突时,优先相信实际目录结构、INSTRUCTION.md 和
> memory/MEMORY.md,把冲突记为待决策事项并暂停受影响的工作。对 Research OS MVP,
> 若本文与完成设计后的 `build_phases/` 有执行范围、顺序或验收冲突,以
> `build_phases/` 为准并回写本文;该优先级不自动扩展到 Long-term Research OS 的
> 其他工作。实际实现完成后
> 仍以仓库制品和验证结果为事实。本文只能由人类(或经人类逐条确认的 agent 提案)修订。

## 1. 最终目的

把本仓库从"组织良好的文件系统"演化为**真正的 agent-native Research OS**,同时保持两条根约束:

- **研究实践优先**:OS 演化始终服务于用户自己的长期研究。真实研究项目产生的摩擦证据
  (项目 `PROJECT_MEMORY.md` 的 OS Feedback 条目)决定大多数缺口何时变成工作项;
  无需先有 OS Feedback 的已授权例外只有文档层治理与契约工作(M0、M1)、只读
  monitor UI,以及 2026-07-19 经 Human Owner 确认的 Pi Coding Agent 文件工作流
  MVP（ADR-0002）。
- **领域 agent-agnostic、当前操作壳明确**:Codex、Claude Code、pi 以及任何"能读文件、
  能执行 shell"的 code agent 都能读取并构建本 OS；Research Project、Task、Claim、
  Evidence、Artifact 与 Audit Event 不依赖具体 agent。当前 MVP 使用 Pi Coding Agent
  的现成交互 TUI 验证工作流，不把 Pi Session 变成权威状态，也不承诺已有自定义 runtime。

"OS"的定义:Research Workspace 根目录为 Human Owner 与根层 agent 提供共享 Skill Hub、
Paper Wiki、Memory、Ideas、Inbox 与多个 Research Project。当前产品证明从 Pi Coding
Agent 的现成交互 TUI 开始；权威研究状态仍是可读文件。无 Git 是默认模式，检测到 Git
时才增强 diff、历史、branch/worktree 与恢复。当前 Research OS 通过 Run Contract、
验证、Checkpoint 与 Review Package 组织项目语义和交接，但边界主要靠流程与复核；
自定义 runtime 的确定性权限和恢复保证属于后续证据闸门。构建工作由 code agent 执行,
人类定方向、授权与审查。

这个 OS 应让新进入的 agent 能快速定位:启动入口;当前 portfolio 与项目事实;idea、
论文、代码、图表和写作材料的归属;经验向 memory/skill 的晋升边界;并行与 agent-led
research 的开闸条件;完整 artifact 的统一评估方式。具体操作契约以
[INSTRUCTION.md](../INSTRUCTION.md) 为准,当前目录以 [FILETREE.md](../FILETREE.md) 为准。

## 2. 长期设计原则与自主判断

以下内容由原 task 构建指南归并而来,作为长期演化约束:

- **奥卡姆剃刀**:如无必要,勿增实体;优先小而可逆的改动,不为形式完整创建空目录、
  复杂脚本或重型框架。
- **agent 可用性**:优先可读、可检索、低 token 成本的文件与路径约定;macOS/Linux
  优先,Windows best-effort,除非具体任务另有验证目标。
- **证据与材料保护**:所有研究主张、引用、数据和实验结果可追溯;不编造;未经确认不
  删除或大幅改写用户提供的原始研究材料。
- **开放演化**:通过 plain files、project templates、skills 和轻量约定扩展;项目经验
  先留在项目,跨项目验证后再晋升为全局规则或 skill。
- **环境约束优先**:用 artifacts、permissions、budgets、human oversight 和 evaluator
  约束 agent,不把正确性只寄托在提示词上。
- **先检查再改变**:构建建议不替代仓库检查。遇到冲突时相信实际制品与操作事实源;
  对不确定事项采用保守、可逆方案或报告 blocked,不假装已经解决。
- **交付诚实**:完成状态必须绑定真实验证;最终说明做了什么、为什么、检查结果、已知
  限制以及刻意未做的范围。

原 task 中的目录清单、工作流说明和文档更新规则已由 INSTRUCTION.md/FILETREE.md
承载;旧 normalization 交付物已完成并留在 git 历史,不再作为当前验收清单重复维护。

## 3. OS 抽象对照表(词汇与现状,不是工作清单)

> 本表是一次性类比与现状描述,不作为仓库规范术语(正文与验收一律使用
> INSTRUCTION.md 的既有词汇),也**不是工作来源**——除 M0/M1、只读 monitor UI 与
> `build_phases/` 薄启动器外,任何缺口转为工作项都需要 OS Feedback 证据或人类显式授权。

| OS 概念 | 本仓库对应物 | 现状(2026-07-04 核实)|
|---|---|---|
| 内核 | 入口链 + 三层记忆 + 目录语义(INSTRUCTION.md 定义的 core)| 已有;但 INSTRUCTION.md Skills 节(两处)与 README 仍硬编码两个 agent 目录,尚不满足铁律 1,由 M1 认领 |
| 文件系统 | 仓库本身(git 版本化)| 已有 |
| 引导协议 | 入口文件 → INSTRUCTION.md →(完整启动序列见 INSTRUCTION.md Session Startup,含 HANDOFF.md、human/index.md)| 链条已有;adapter 契约未成文(M1)|
| 驱动(adapter)| 每 agent 一个一行入口指针文件 + 适配目录(`CLAUDE.md`+`.claude/`、`AGENTS.md`+`.agents/`)| 已注册两个;`.gitignore` 中 `.antigravitycli/` 痕迹表明存在第三个未注册 agent;原 `projects-folder/Paper_VAE/` 已由 Human Owner 暂时删除，恢复边界由 M0/D10 记录 |
| 进程 | 有边界的 agent 任务:`Tasks/<task-id>/` 工作区 + 预算 + 状态 | 工作区约定已写(INSTRUCTION.md);预算/回合制词汇目前仅存在于 HANDOFF 的 circle_packing 计划;均未实战(M2)|
| 调度器 | 人类 + `memory/MEMORY.md` Active Projects 表 | 人工调度可用;自动排队属 M4 闸门 |
| 内存管理 | 全局/项目/任务三层记忆 + 卫生规则 | 已有;progress log 已在 Example_Project 实战 |
| 权限 | 保护规则(评测器、权威结果、用户材料、`human/private/`)| 纯约定;唯一已部署的强制机制是 `.gitignore` 对 `human/private/` 的忽略(agent 无关);项目级 settings deny 已决策未部署(HANDOFF circle_packing tier-2),且为 Claude 专属 |
| 系统调用/标准库 | skills(hub 为源,装进各 adapter 目录)| 安装器硬编码两个目录(`TARGET_DIRS`);`SKILL.md` frontmatter 是事实上的跨 agent 格式但未成文;5 个 hub 技能带 per-agent 附件(`agents/openai.yaml`)(M1 成文,M3 泛化)|
| secrets / 外部工具 | `.env` 约定痕迹 + 各 agent 的 MCP/工具与凭据机制 | 无 OS 级约定;adapter 契约应声明外部工具能力与凭据机制(M1 给一行定位,更多属 M4 闸门)|
| IPC | HANDOFF.md、结构化 artifacts | 已有;任务工作区同"进程"行(未实战)|
| 可观测性 | progress log(已实战)、run summary、评审报告(`Evaluations/`)| 后两者未实战;由 M2 的回灌批次基于证据决定是否成文 |

## 4. Agent-Agnostic 三条铁律

1. **内核不新增专属假设**:内核文件(INSTRUCTION.md、memory/MEMORY.md、各入口指针
   文件、目录语义)不得**新增**任何特定 agent 的假设;存量硬编码由 M1 一次性迁往
   adapter 契约表。FILETREE.md 的例行刷新不计为内核改动。
2. **统一引导契约**:所有 agent 走同一条引导链;每个 agent 的原生入口文件只允许是
   一行指针(现状 `CLAUDE.md` / `AGENTS.md` 已满足)。M1 落地后,新增一个 agent =
   新增 ≤2 个顶层路径(1 个入口指针文件 + 1 个可选适配目录,目录内文件数不限)+
   在 adapter 契约表加一行;除此之外 0 处内核改动。
3. **降级优先于专属**:agent 缺少强制机制(hooks、deny 规则、sandbox)或外部工具
   (MCP)时,OS 必须仍能以"约定 + 事后检查"降级运行。机制增强安全,正确性不依赖机制。

**项目层边界**:铁律约束 OS 内核与仓库级约定。项目内部允许 agent 专属适配
(项目局部 skills / 子代理本就是 INSTRUCTION 认可的晋升路径),但项目必须登记进
portfolio 并保有 `PROJECT_MEMORY.md`;项目是否 agent 锁定由 owner 在
`PROJECT_MEMORY.md` 中声明。

## 5. 里程碑

OS 构建主线顺序:M0 → M1 → M2;M3、M4 是 MVP 之后的条件闸门,不排期。2026-07-19
Human Owner 根据亲自运行 Phase 01 后的学习证据，把 N13 的 SDK 路线延后，选择 N15:
先用 Pi Coding Agent 现成 TUI 验证单项目文件工作流。Phase 01 的成功运行作为历史事实
记录，但其未提交的 `os-runtime/` 实现和依赖已按 Human Owner 决定删除；Phase 02–07
冻结，不是当前前置条件。旧 launcher 与 SDK phase prompts 已从工作树删除，只能从
Git 历史恢复用于审计，不得作为新主路径复活。
跨会话进度以 [map/index.md](map/index.md) 为唯一追踪器；当前理由见
[ADR-0002](../docs/adr/0002-pi-coding-agent-workflow-mvp.md)，被取代的 SDK 决策见
[ADR-0001](../docs/adr/0001-pi-sdk-autonomous-mvp.md)。

- **M0 — 治理对齐(纯文档)**
  1) 原 task 构建指南归并进本文并删除旧入口后,修正 HANDOFF D4 中
     `OS_INTRO.html` 的陈旧表述(该文件已于 commit 784f9e8 删除);
  2) 验证 Human Owner 已暂时删除 **Paper_VAE**，并在 HANDOFF 记录：当前不登记为
  活动项目；恢复需 Human Owner 新授权；恢复后若进入活动 portfolio，必须先登记并补
  `PROJECT_MEMORY.md`。不得在 M0 中恢复它或处理其他已删除项目。
  验收:`grep -ri OS_INTRO` 仅命中历史性说明；`test ! -e projects-folder/Paper_VAE`
  成功；HANDOFF Decisions 有恢复与重新登记边界。
- **M1 — 适配器契约成文 + 内核去硬编码(纯文档)**
  在 INSTRUCTION.md「Extending the OS」下新增一小节(建议 ≤30 行)「Agent
  adapters」:人读的 adapter 对照表(agent、入口文件、技能目录、可用强制机制、
  外部工具/凭据机制、降级方式),并明确声明**这是文档约定,不是机器可读
  manifest**(与既有 no-manifest 决策一致)。skills 格式一并成文:`SKILL.md`
  (frontmatter: name/description)+ `scripts/` 为跨 agent 格式;
  `agents/<vendor>.yaml` 类 per-agent 附件允许存在,其他 agent 忽略。
  同一批次:INSTRUCTION.md Skills 节与 README 中的两 agent 硬编码改为引用该表;
  HANDOFF D7 加注(拷贝数 = 已注册 adapter 数)。
  验收:INSTRUCTION.md 除 adapter 表外 grep 不到具体 agent 目录名;新增 agent 的
  接入成本满足铁律 2。冷启动测试:**仅当真实第三 agent 可用时**执行(候选:pi,
  或已留下 `.antigravitycli/` 痕迹的 agent)——仅凭其一行入口文件完成一个只读任务
  (如"总结当前 portfolio 状态");不做人工模拟。
- **M2 — Pi Coding Agent 单项目文件工作流 MVP**
  Human Owner 从 Research Workspace 根目录启动 Pi Coding Agent，选择一个 Project 和
  一个 Research Task，先让 Pi 起草文件化 Run Contract，再由人类批准。Pi 在终端保持
  打开的前提下执行有界工作，运行合同声明的 Executable/Review Validation，并把
  Research Checkpoint 与 Review Package 写入项目文件。首个 pilot 使用
  `projects-folder/Example_Project/` 的可复现线性拟合，把单 seed 扩展为多 seed 稳定性
  分析。Human Owner 或 fresh agent 必须能只靠项目文件接管，不依赖 transcript 或同一
  Session。Git 是可选增强；无 Git 模式仍必须留下足以审查和继续的文件产物。当前写范围、
  预算和停止条件靠 Run Contract、Pi 操作纪律与事后验证，不宣称有自定义 runtime 的
  确定性拒绝。学习优先 Markdown、项目文件和已有 Python 验证；暂不要求 TypeScript。
  `Example_Project` 只承担 smoke test；通过后第一个真实项目是从 EurekAgent 任务规范
  重新实现的 `circle_packing`，不是复制其 AGPL 代码。
- **M3(闸门:存在多安装目标)— 安装器泛化**
  触发条件:存在两个以上需要统一管理的安装目标(全局目录、项目级目录、多 agent
  适配目录),且重复副本已产生实际维护成本。2026-07-22 由 Human Owner 修订:原
  条件写的是"某个真实第三 agent 通过 M1 冷启动测试并需要安装 hub skills",那是
  立条款时预估的唯一触发场景;真实驱动力是跨项目的 skill 管理,与第三 agent 无
  关,故据此扩充。第三 agent 接入仍是本闸门的充分条件之一,不再是必要条件。变更
  理由见 HANDOFF 决策行。
  内容:`research-skill-installer` 的 `TARGET_DIRS` 从硬编码两目录改为目标对照表
  所列目录;此变更推翻 D7 的"两份拷贝"前提,需同步 HANDOFF 决策行。
  安装形态按来源区分:Human Owner 自撰且在迭代的 collection 用 symlink(编辑安装
  路径即编辑 hub,无漂移);外部 vendored collection 用 copy(副本兼作版本钉)。凡
  声明为自动刷新只读镜像者(现为 `mattpocock-skills`,CI 每周 `rsync --delete`)
  一律只能 copy,否则上游改动会绕过 review 直达在用 skill,并在上游重命名时产生
  悬空链接。
  验收:一条命令把同一 hub skill 装进全部已注册目标;新增目标不改安装器逻辑;
  symlink 被各 agent 正确跟随一事有实测证据(该行为未见于任何 agent 的官方文档)。
- **M4(闸门:M2 使用证据 + 人类逐项确认)— 自定义 runtime 与更重机制**
  Pi Agent SDK backend、自定义 TUI、确定性权限/预算执行、关闭 TUI 后继续运行的 daemon、
  主动跨 Session 管理、多项目/多 Worker 调度、数据库、远程访问、账户系统、OS 级
  secrets、完整通用版本控制、GUI 执行面及 desktop wrapper 都需真实 M2 摩擦证据与
  Human Owner 新授权。当前工作树不保留 SDK runtime 实现。
  M2 授权不自动扩展这些范围。
  2026-07-22 Human Owner 授权一条**最小细缝**,其余部分闸门不变:`os-ui` 可对已安装
  skill 执行 `SKILL.md` ↔ `SKILL.md.disabled` 重命名,以启用/停用单个安装位置。
  授权理由:该操作零破坏性(不删内容、可逆、git 可见),且写通道挂在 `start.sh` 已
  启动的 Vite dev server 上,随 Ctrl-C 一同消失,不新增常驻进程,
  `os-ui/DESIGN.md` §2 的 "no resident daemon is left behind" 不变式不受影响。
  本细缝**不**包含:GUI 内执行安装或删除、常驻服务、SSE、以及任何其他动作端点;
  安装与卸载仍走命令行,GUI 只提供命令复制。

## 6. 总验收(与里程碑一一对应)

- M0:陈旧引用清零；Paper_VAE 临时删除及恢复/重新登记边界有人类决策记录。
- M1:adapter 契约成文;INSTRUCTION 内核文本(adapter 表除外)无具体 agent 假设;
  (条件项)真实第三 agent 冷启动通过。
- M2:Example_Project 的 Pi-Assisted Research Run 文件闭环通过；Human Owner 不读
  transcript 即可审查和接管；声明的验证、Checkpoint、Review Package 与无 Git 接续
  能力均有真实证据，且报告不夸大流程边界为确定性 runtime enforcement。
- 文档归并:长期方向与构建原则只在 GOAL.md 维护;原 task.md/task_en.md 已删除,
  历史原文可由记录的 Git commit 恢复。
- `build_phases/`:当前 Pi Coding Agent 文件工作流合同按序完成；历史 launcher/SDK
  prompts 已删除且不是当前验收对象，`os-runtime/` 不存在且不应重建。
- 全程:权威研究状态仍为 plain files；Git 是可选增强而非前置条件；所有被推翻的既有
  决策在 map、HANDOFF 与 ADR 有显式 supersession 记录。

## 7. 非目标

- 不做 Web 平台、后端服务、数据库、守护进程、远程访问或账户系统(M4 闸门前)。
- 不在当前 MVP 实现 `AgentBackend`、Pi SDK runtime 或 Codex/Claude runtime backend；
  agent-agnostic 约束属于领域文件和可接续状态，Pi Coding Agent 只是当前操作壳。
- 不实现完整通用版本控制；无 Git 只保证权威状态、Audit Event、Checkpoint 和 Agent
  修改过的小型文本可恢复，Git adapter 才提供完整历史/branch/merge。
- 不让 Pi-Assisted Research Run 直接改写 Paper Wiki、Memory、Ideas、Skill Hub 或其他
  Project；当前通过 Run Contract 与 Human Owner 复核约束，未来再决定是否机械强制。
- 不复制 EurekAgent 运行时(AGPL;只吸收其环境工程思想)。
- 不追求支持"所有" agent:"支持"的定义 = 通过 M1 冷启动测试。
- 不为假想需求造机制:没有真实第三 agent 就不做 M3,没有摩擦证据就不做 M4。
