# GOAL: 从文件系统到 Agent-Native Research OS

> **方向层目标(北极星)**。2026-07-04 由用户确立:在"服务用户自身研究实践"的前提下,
> 把本仓库演化为 agent-agnostic 的 agent-native Research OS(决策记录见
> [HANDOFF.md](HANDOFF.md) Decisions)。
>
> **长期愿景层**:本文件描述 Long-term Research OS 的方向、长期设计原则与战略
> 治理闸门,不充当当前 MVP 的逐步实施说明。两个旧 task 文件已删除,其仍有效原则已
> 吸收为本文的长期约束,原文保存在 Git commit
> `38d79be74b463dc41b0b651e5510ac7346502cbd`。[build_phases/](build_phases/)
> 是 Research OS MVP 的阶段执行合同;MVP 的正式定义见 [CONTEXT.md](CONTEXT.md)。
> 运行事实源 = 实际目录结构、[INSTRUCTION.md](INSTRUCTION.md)、
> [memory/MEMORY.md](memory/MEMORY.md)、[HANDOFF.md](HANDOFF.md)(Decisions)、
> [FILETREE.md](FILETREE.md)。
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
  monitor UI,以及 [build_phases/](build_phases/) 定义的只读、无状态薄启动器。
- **agent-agnostic 是硬约束**:Codex、Claude Code、pi 以及任何"能读文件、能执行
  shell"的 code agent 都能引导进入本 OS 执行任务。agent 专属内容只允许存在于
  适配层(adapter),不得新增进内核。

"OS"的定义:为运行其上的 agent 进程提供完整、稳定、可组合的抽象——引导、驱动
(adapter)、进程、调度、内存、权限、系统调用(skills)、IPC、可观测性——载体仍是
plain files + git,不是守护进程、数据库或图形界面(见 M4 闸门)。薄启动器只是可删除
adapter,不改变 OS 的事实源或内核定义。构建工作由 code agent 执行(当前实际由
Claude Code 承担),人类定方向、授权与审查。

这个 OS 应让新进入的 agent 能快速定位:启动入口;当前 portfolio 与项目事实;idea、
论文、代码、图表和写作材料的归属;经验向 memory/skill 的晋升边界;并行与 agent-led
research 的开闸条件;完整 artifact 的统一评估方式。具体操作契约以
[INSTRUCTION.md](INSTRUCTION.md) 为准,当前目录以 [FILETREE.md](FILETREE.md) 为准。

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
| 驱动(adapter)| 每 agent 一个一行入口指针文件 + 适配目录(`CLAUDE.md`+`.claude/`、`AGENTS.md`+`.agents/`)| 已注册两个;`.gitignore` 中 `.antigravitycli/` 痕迹表明存在第三个未注册 agent;项目层存在深度 Claude 锁定且未登记的 `projects-folder/Paper_VAE/`(M0 待决策)|
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

OS 内核演化主线顺序:M0 → M1 → M2;M3、M4 是条件闸门,不排期。另有一个经人类
授权、可并行执行的 adapter 任务弧:按 [build_phases/](build_phases/) 的编号顺序完成
薄启动器治理对齐 → launcher → offline smoke tests → 文档与总验证。该任务弧不改变
M0–M4 的内部顺序,但不必等待 M0/M1/M2 完成。跨会话进度记录在
[HANDOFF.md](HANDOFF.md) Active Work 对应条目下。

- **M0 — 治理对齐(纯文档)**
  1) 原 task 构建指南归并进本文并删除旧入口后,修正 HANDOFF D4 中
     `OS_INTRO.html` 的陈旧表述(该文件已于 commit 784f9e8 删除);
  2) 把 **Paper_VAE 的地位**整理成带选项的待决策项交人类拍板:(a) 登记入
  Active Projects 并补 `PROJECT_MEMORY.md`,或 (b) 声明为嵌套仓库豁免区并写明
  豁免边界(不登记、不受 OS 约定约束、FILETREE 不索引)。
  验收:`grep -ri OS_INTRO` 仅命中历史性说明;Paper_VAE 决策连同人类选择记入
  HANDOFF Decisions。
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
- **M2 — 用户态实战(circle_packing)**
  按 [HANDOFF.md](HANDOFF.md) Active Work 的 circle_packing 清单执行——**该清单
  是权威工作分解,其内部顺序优先于本文件**(含 rounds 开始前的 tier-2 评测器保护、
  并行回合、两次制品评审、OS Feedback、两批回灌)。可观测性不单独立项:在两批回灌
  中依据 OS Feedback 判断 round wrap-up 产物(progress log 条目 + `result.json` +
  OS Feedback 条目 + git commit)是否已满足"人类不读 transcript 即可复述该轮
  结论";只为有证据的缺口提约定。
  验收:HANDOFF circle_packing 清单全部勾选;OS Feedback 幸存条目完成回灌。
- **M3(闸门:真实第三 agent 接入)— 安装器泛化**
  触发条件:某个真实第三 agent 通过 M1 冷启动测试并需要安装 hub skills。
  内容:`research-skill-installer` 的 `TARGET_DIRS` 从硬编码两目录改为 adapter
  对照表所列目录;此变更推翻 D7 的"两份拷贝"前提,需同步 HANDOFF 决策行。
  验收:一条命令把同一 hub skill 装进全部已注册 adapter 目录;新增 adapter 不改
  安装器逻辑。
- **M4(闸门:OS Feedback 证据 + 人类逐项确认)— 更重的机制**
  自动排队/调度、monitor UI 的执行面与常驻服务、数据库、守护进程、每 adapter
  强制机制矩阵、OS 级 secrets 方案、任何机器可读 manifest 或工作流 CLI:每一项都
  必须先有 OS Feedback 中"文件原生方案不够用"的具体证据,再经人类显式确认,才可开工。
  已由人类开闸的窄例外只有:
  1) **只读 monitor UI**(2026-07-04):设计见 `os-ui/DESIGN.md`;其执行面、SSE 与
     常驻服务仍受本闸门约束;
  2) **只读、无状态薄启动器**(2026-07-16):仅按 [build_phases/](build_phases/)
     构建 repo-local `bin/research-os`,调用原生 pi,不嵌入 SDK、不编码研究工作流、
     不创建服务/数据库/manifest,不改变 pi 默认权限与 session 行为。
  GUI 执行面仍需先用启动器完成一个真实项目阶段,记录具体 OS Feedback,再由人类重新
  确认。开闸后的首选方向是扩展现有 `os-ui`:localhost-only TypeScript server + pi SDK
  + HTTP/SSE Agent Console;持久仓库快照与 pi 实时状态内部隔离。Electron/Tauri 仅在
  浏览器方案稳定后择一评估,当前不属于已授权实现范围。

## 6. 总验收(与里程碑一一对应)

- M0:陈旧引用清零;Paper_VAE 地位有人类决策记录。
- M1:adapter 契约成文;INSTRUCTION 内核文本(adapter 表除外)无具体 agent 假设;
  (条件项)真实第三 agent 冷启动通过。
- M2:circle_packing 全清单完成,OS Feedback 产出并回灌。
- 文档归并:长期方向与构建原则只在 GOAL.md 维护;原 task.md/task_en.md 已删除,
  历史原文可由记录的 Git commit 恢复。
- 薄启动器任务弧:`build_phases/` 四阶段按序完成;每阶段的真实制品、验证与中文 HTML
  教程齐备;这不等于 GUI 执行闸门已经通过。
- 全程:仓库仍是 plain files + git;除上述两项窄例外外,M3/M4 闸门未凭空打开;所有
  被推翻的既有决策在 HANDOFF Decisions 有显式 supersession 行。

## 7. 非目标

- 不做 Web 平台、后端服务、数据库、守护进程(M4 闸门前)。
- 不引入机器可读 manifest、plugin manager、versioning 或工作流 CLI。唯一例外是
  `build_phases/` 定义的 repo-local 薄启动器;它不是研究命令系统。M1 的 adapter 表
  仍是人读文档,M3 仅让安装器读取该表所列目录。
- 不复制 EurekAgent 运行时(AGPL;只吸收其环境工程思想)。
- 不追求支持"所有" agent:"支持"的定义 = 通过 M1 冷启动测试。
- 不为假想需求造机制:没有真实第三 agent 就不做 M3,没有摩擦证据就不做 M4。
