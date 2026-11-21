# GOAL：订阅驱动、单一入口的 Research OS

> **方向层目标(北极星)**。2026-07-04 由用户确立:在"服务用户自身研究实践"的前提下,
> 把本仓库演化为 agent-agnostic 的 agent-native Research OS(决策记录见
> [HANDOFF.md](../HANDOFF.md) Decisions)。2026-09-26 Human Owner 采用 agent 起草的
> 修订稿:目标改为订阅驱动、单一入口,主线改为 H1–H3(见 HANDOFF "Agent-harness
> decisions" 与 [ADR-0003](../docs/adr/0003-subscription-cli-harness.md))。
> 2026-11-21 Human Owner 重新定位:面向本机已有 Claude Code、Codex 等 coding agent 的
> 研究者,做成免费、开源、只在本地运行的桌面应用,结构为主干加插件;主线改为步骤 1–4
> (见 HANDOFF "Positioning and architecture decisions (2026-11-21)" 与
> [ADR-0006](../docs/adr/0006-desktop-workspace-trunk-and-plugins.md))。"服务用户自身研究
> 实践"的前提由此被取代;修订前全文见 Git commit `afe0461`,下文各处修订均标注日期。
>
> **长期愿景层**:本文件描述 Long-term Research OS 的方向、长期设计原则与战略
> 治理闸门,不充当当前 MVP 的逐步实施说明。两个旧 task 文件已删除,其仍有效原则已
> 吸收为本文的长期约束,原文保存在 Git commit
> `38d79be74b463dc41b0b651e5510ac7346502cbd`。MVP 的正式定义见 [CONTEXT.md](../CONTEXT.md)；
> 原执行合同层 `build_phases/` 与路线图 `map/` 已于 2026-09-23 按 Human Owner 决定删除,
> 施工状态记录在 [HANDOFF.md](../HANDOFF.md) Active Work,最后版本见 Git commit `0f1805c`。
> 运行事实源 = 实际目录结构、[AGENTS.md](../AGENTS.md)、
> [memory/MEMORY.md](../memory/MEMORY.md)、[HANDOFF.md](../HANDOFF.md)(Decisions)、
> [FILETREE.md](../FILETREE.md)。
>
> 本文与运行事实源冲突时,优先相信实际目录结构、AGENTS.md 和
> memory/MEMORY.md,把冲突记为待决策事项并暂停受影响的工作。实际实现完成后
> 仍以仓库制品和验证结果为事实。本文只能由人类(或经人类逐条确认的 agent 提案)修订。

## 1. 最终目的

**目标**:人只和一个 root agent 对话,就能推进和跟进所有研究项目;在项目内,人也可以
直接和该项目的 agent 对话(2026-11-21 补充)。各项目里的工作由用户本机已有的 coding
agent(内置 Claude Code 与 Codex,其余经 ACP 接入)在用户自己的订阅下完成,全过程留下
可复盘的 session trace。

同时保持两条根约束:

- **面向其他研究者**(2026-11-21 取代"研究实践优先"):OS 面向本机已有 coding agent 的
  其他研究者。定位是否成立的验收:另一个人在一台干净的机器上装好应用,不经协助,在
  nanochat_cpu 上完成"派发 → 运行 → 汇报";在此之前不对外宣称可供他人使用。研究由人
  主导(human-led)是每个 workspace 的默认值,沿用 `agent_led_research` 的取值;
  agent-led 留待以后。已授权的构建工作是 §5 的步骤 1–4,更重的机制仍走 M4 闸门。
- **领域 agent-agnostic**:Codex、Claude Code、pi 以及任何"能读文件、能执行 shell"的
  code agent 都能读取并构建本 OS;Research Project、Task、Claim、Evidence、Artifact
  与 Audit Event 不依赖具体 agent。主干不自带模型与 agent loop(2026-11-21);项目 agent
  经 agent 层以官方 CLI 运行(步骤 4 之前是 [`os-harness/`](../os-harness/README.md)),
  Agent Session 与 session trace 都不是权威状态。

"OS"的定义:Research Workspace 根目录为 Human Owner 与 root agent(CONTEXT.md 中的
Manager Agent)提供共享 Skill Hub、Paper Wiki、Memory、Ideas、Inbox 与多个 Research
Project。root agent 在根目录与人对话,把 Research Task 派发给各项目里的 agent,并依据
项目文件汇报;权威研究状态仍是可读文件。Git 是前置条件(2026-11-21 取代"无 Git 是默认
模式"):每个 Research Project 是独立的 Git 仓库,每次运行记录所在的 commit;按实验分
branch、按对话分 worktree 等到确有并行运行的需要时再做。边界主要靠任务合同、验证与人类
复核;确定性权限和恢复保证属于后续证据闸门。构建工作由 code agent 执行,人类定方向、
授权与审查。

产品与 workspace 分离(2026-11-21):产品是桌面应用,一个小主干加插件(Paper Wiki、
Skills Hub 与 Idea、Code、Skeleton、Assets、Paper 五个项目视图都是插件);应用从空模板
创建 workspace,本仓库是其中一个 workspace 实例。workspace 不开应用、只用 Claude Code
或 Codex 也能完整使用,应用不提供只在 GUI 里才有的写操作。

这个 OS 应让新进入的 agent 能快速定位:启动入口;当前 portfolio 与项目事实;idea、
论文、代码、图表和写作材料的归属;经验向 memory/skill 的晋升边界;并行与 agent-led
research 的开闸条件;完整 artifact 的统一评估方式。具体操作契约以
[AGENTS.md](../AGENTS.md) 为准,当前目录以 [FILETREE.md](../FILETREE.md) 为准。

## 2. 长期设计原则与自主判断

以下内容由原 task 构建指南归并而来,作为长期演化约束:

- **奥卡姆剃刀**:如无必要,勿增实体;优先小而可逆的改动,不为形式完整创建空目录、
  复杂脚本或重型框架。
- **agent 可用性**:优先可读、可检索、低 token 成本的文件与路径约定;macOS/Linux
  优先,Windows best-effort,除非具体任务另有验证目标。
- **证据与材料保护**:所有研究主张、引用、数据和实验结果可追溯;不编造;未经确认不
  删除或大幅改写用户提供的原始研究材料。
- **开放演化**:通过 plain files、project templates、skills、插件(小型声明式 manifest,
  2026-11-21 增加)和轻量约定扩展;项目经验
  先留在项目,跨项目验证后再晋升为全局规则或 skill。
- **环境约束优先**:用 artifacts、permissions、budgets、human oversight 和 evaluator
  约束 agent,不把正确性只寄托在提示词上。
- **先检查再改变**:构建建议不替代仓库检查。遇到冲突时相信实际制品与操作事实源;
  对不确定事项采用保守、可逆方案或报告 blocked,不假装已经解决。
- **交付诚实**:完成状态必须绑定真实验证;最终说明做了什么、为什么、检查结果、已知
  限制以及刻意未做的范围。

原 task 中的目录清单、工作流说明和文档更新规则已由 AGENTS.md/FILETREE.md
承载;旧 normalization 交付物已完成并留在 git 历史,不再作为当前验收清单重复维护。

## 3. OS 抽象对照表(词汇与现状,不是工作清单)

> 本表是一次性类比与现状描述,不作为仓库规范术语(正文与验收一律使用
> AGENTS.md 的既有词汇),也**不是工作来源**——除 M0、只读 monitor UI、2026-09-26
> 采用的 H1–H3 与 2026-11-21 授权的步骤 1–4 外,任何缺口转为工作项都需要 OS Feedback
> 证据或人类显式授权。下表是 2026-07-04 的历史快照,未随 2026-11-21 的重新定位更新;
> 表中标为"M1 认领"的事项见 §5 M1 的退役说明。

| OS 概念 | 本仓库对应物 | 现状(2026-07-04 核实)|
|---|---|---|
| 内核 | 入口链 + 三层记忆 + 目录语义(AGENTS.md 定义的 core)| 已有;但 AGENTS.md Skills 节(两处)与 README 仍硬编码两个 agent 目录,尚不满足铁律 1,由 M1 认领 |
| 文件系统 | 仓库本身(git 版本化)| 已有 |
| 引导协议 | AGENTS.md 即入口文件;按其 Read by task 表与 Human cognition 节按需加载(含 HANDOFF.md、human/index.md)| 链条已有;adapter 契约未成文(M1)|
| 驱动(adapter)| 共享入口 `AGENTS.md` + 每 agent 一个适配目录(`.claude/`、`.agents/`);`CLAUDE.md` 已于 2026-09-23 删除(HANDOFF D1)| 已注册两个;`.gitignore` 中 `.antigravitycli/` 痕迹表明存在第三个未注册 agent;原 `projects-folder/Paper_VAE/` 已由 Human Owner 暂时删除，恢复边界由 M0/D10 记录 |
| 进程 | 有边界的 agent 任务:`Tasks/<task-id>/` 工作区 + 预算 + 状态 | 工作区约定已写(AGENTS.md);预算/回合制词汇目前仅存在于 HANDOFF 的 circle_packing 计划;均未实战(M2)|
| 调度器 | 人类 + `memory/MEMORY.md` Active Projects 表 | 人工调度可用;自动排队属 M4 闸门 |
| 内存管理 | 全局/项目/任务三层记忆 + 卫生规则 | 已有;progress log 已在示例项目中实战 |
| 权限 | 保护规则(评测器、权威结果、用户材料、`human/private/`)| 纯约定;唯一已部署的强制机制是 `.gitignore` 对 `human/private/` 的忽略(agent 无关);项目级 settings deny 已决策未部署(HANDOFF circle_packing tier-2),且为 Claude 专属 |
| 系统调用/标准库 | skills(hub 为源,装进各 adapter 目录)| 安装器硬编码两个目录(`TARGET_DIRS`);`SKILL.md` frontmatter 是事实上的跨 agent 格式但未成文;5 个 hub 技能带 per-agent 附件(`agents/openai.yaml`)(M1 成文,M3 泛化)|
| secrets / 外部工具 | `.env` 约定痕迹 + 各 agent 的 MCP/工具与凭据机制 | 无 OS 级约定;adapter 契约应声明外部工具能力与凭据机制(M1 给一行定位,更多属 M4 闸门)|
| IPC | HANDOFF.md、结构化 artifacts | 已有;任务工作区同"进程"行(未实战)|
| 可观测性 | progress log(已实战)、run summary、评审报告(`Evaluations/`)| 后两者未实战;由 M2 的回灌批次基于证据决定是否成文 |

## 4. Agent-Agnostic 三条铁律

1. **内核不新增专属假设**:内核文件(AGENTS.md、memory/MEMORY.md、各入口指针
   文件、目录语义)不得**新增**任何特定 agent 的假设;存量硬编码原由 M1 认领,M1 已于 2026-11-21
   退役,这项清理目前没有认领者。FILETREE.md 的例行刷新不计为内核改动。
2. **统一引导契约**:所有 agent 走同一条引导链;每个 agent 的原生入口文件只允许是
   一行指针(现状 `AGENTS.md` 已满足)。新增一个 agent = 新增一个 ACP 插件,主干 0 处
   改动;内置的 Claude Code 与 Codex 除外(2026-11-21 取代"≤2 个顶层路径 + adapter
   契约表一行"的条款)。
3. **降级优先于专属**:agent 缺少强制机制(hooks、deny 规则、sandbox)或外部工具
   (MCP)时,OS 必须仍能以"约定 + 事后检查"降级运行。机制增强安全,正确性不依赖机制。

**项目层边界**:铁律约束 OS 内核与仓库级约定。项目内部允许 agent 专属适配
(项目局部 skills / 子代理本就是 AGENTS.md 认可的晋升路径),但项目必须登记进
portfolio 并保有 `PROJECT_MEMORY.md`;项目是否 agent 锁定由 owner 在
`PROJECT_MEMORY.md` 中声明。

## 5. 里程碑

OS 构建主线顺序:步骤 1 → 2 → 3 → 4(2026-11-21 由 Human Owner 采用,取代 2026-09-26
的 H1 → H2 → H3 主线)。H1 已完成;H2 保留,验收仍待 Human Owner;H3 排到步骤 4 之后。
M0 已满足、M3 已完成、M1 已退役;M4 是条件闸门,不排期。M2(Pi Coding Agent 文件工作流 MVP,
[ADR-0002](../docs/adr/0002-pi-coding-agent-workflow-mvp.md))与更早的 SDK 路线
([ADR-0001](../docs/adr/0001-pi-sdk-autonomous-mvp.md))都已被取代,只作历史保留;
`os-runtime/`、SDK phase prompts 与旧 launcher 不得作为新主路径复活。
跨会话进度记录在 [HANDOFF.md](../HANDOFF.md) Active Work(路线图 `map/` 已于 2026-09-23
删除,最后版本见 Git commit `0f1805c`);当前理由见
[ADR-0003](../docs/adr/0003-subscription-cli-harness.md) 与
[ADR-0006](../docs/adr/0006-desktop-workspace-trunk-and-plugins.md)。

每个步骤的每个页面先出可点击的 mockup 由 Human Owner 选定再实现;TypeScript 由 agent
编写和评审,验收一律是 Human Owner 不读代码就能执行的检查。

- **步骤 1 — 主干外壳**
  用注册表取代写死的窗口列表与端点挂载;新布局(首页是 root agent 对话加项目卡片,
  项目内是左侧对话、右侧视图标签);Code 与 Paper 视图;Paper Wiki 作为第一个插件。
  验收:Human Owner 在 macOS 上按桌面端检查清单走通新布局。
- **步骤 2 — 其余视图**
  Idea(DAG)、Skeleton、Assets 视图;Skills Hub 作为第二个插件;从本地文件夹加载插件。
  验收:Human Owner 在 nanochat_cpu 上点开全部五个视图。
- **步骤 3 — 产品与 workspace 分离、Git 绑定**
  应用内"新建 workspace";每个项目是独立的 Git 仓库;每次运行记录 commit。
  验收:另一个人在干净机器上装好应用,不经协助在 nanochat_cpu 上完成派发、运行、汇报。
  测试者只在 Human Owner 明确同意后拿到 CI 构建产物。
- **步骤 4 — agent 层**
  harness 移植为 TypeScript 并提供命令行入口;Agents 设置页;每个对话一个常驻进程,
  权限请求转给界面由人回答;ACP 适配器。
  验收:在 Agents 页切换 Claude Code 与 Codex 各完成一轮对话;`project-dispatch` 经新
  入口可用之后才删除 Python 版 harness。

- **H1 — 适配层(已完成 2026-09-26)**
  `os-harness` 能在任意项目目录运行、续接 Claude Code 与 Codex 的对话,走订阅登录,
  记录 trace。
  验收:离线测试与两种 CLI 的真实运行通过(记录见 HANDOFF "Agent-harness decisions")。
- **H2 — root agent**
  人在一个对话里下达任务、询问进度;root agent 经 os-harness 派发给项目 agent,并依据
  项目文件(`PROJECT_MEMORY.md`)汇报。
  验收:在 nanochat_cpu 跑通一次"派发 → 执行 → 汇报 → 人类验收"(2026-09-29 由
  Example_Project 改为 nanochat_cpu,见 HANDOFF "Example-project decision")。
- **H3 — trace 反思(2026-11-21:排到步骤 4 之后)**
  agent 能检索过往 session trace,把经验提炼写回记忆层,并在后续任务中用上。
  验收:同类任务第二次执行时引用了第一次的经验。
- **(已取代 2026-11-21)长期:Pi Agent 引擎**
  Pi 不再是预定的长期引擎;它是经 ACP 接入的可选 agent 之一,与其他 agent 并列。

- **M0 — 治理对齐(纯文档)**
  1) 原 task 构建指南归并进本文并删除旧入口后,修正 HANDOFF D4 中
     `OS_INTRO.html` 的陈旧表述(该文件已于 commit 784f9e8 删除);
  2) 验证 Human Owner 已暂时删除 **Paper_VAE**，并在 HANDOFF 记录：当前不登记为
  活动项目；恢复需 Human Owner 新授权；恢复后若进入活动 portfolio，必须先登记并补
  `PROJECT_MEMORY.md`。不得在 M0 中恢复它或处理其他已删除项目。
  验收:`grep -ri OS_INTRO` 仅命中历史性说明；`test ! -e projects-folder/Paper_VAE`
  成功；HANDOFF Decisions 有恢复与重新登记边界。
- **M1 —(已退役 2026-11-21)适配器契约成文 + 内核去硬编码**
  由步骤 4 的 agent 注册表与 Agents 设置页取代;skills 仍是普通的 `SKILL.md`。原条款
  全文见 Git 历史(commit `afe0461` 及之前)。
- **M2 —(已取代)Pi Coding Agent 单项目文件工作流 MVP**
  2026-09-26 由 ADR-0003 取代:Human Owner 改走订阅驱动的 CLI harness(H1–H3)。
  原条款全文见 Git 历史(commit `0e185da` 及之前)。
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
- **M4(闸门:H2 使用证据 + 人类逐项确认)— 自定义 runtime 与更重机制**
  Pi Agent SDK backend、自定义 TUI、确定性权限/预算执行、常驻 daemon、无人值守的自动
  排队与并行调度、数据库、远程访问、账户系统、OS 级 secrets、完整通用版本控制都需真实
  使用证据与 Human Owner 新授权。2026-11-21:桌面应用的执行面、插件宿主与 TypeScript
  harness 已由 Human Owner 授权(步骤 1–4),不再在本闸门内;随应用启停的每对话 agent
  进程不算常驻 daemon。root agent 按人类
  请求经 os-harness 派发和跟进项目任务属于 H2,自 2026-09-26 起不在本闸门内。
  H1–H3 与步骤 1–4 的授权不自动扩展这些范围。
  2026-07-22 Human Owner 授权一条**最小细缝**,其余部分闸门不变:`os-ui` 可启用/停用
  单个安装位置。具体机制按安装形态而定——symlink 安装把链接移入该目标目录下的
  `.disabled/`,copy 安装重命名 `SKILL.md` ↔ `SKILL.md.disabled`。原条款只写了后者,
  但对 symlink 安装重命名 `SKILL.md` 等于改 hub 本体并一次停用所有位置,故
  2026-07-22 更正。两种形态都不新建也不删除任何 skill 内容。
  不用"删除链接"实现停用,是因为那会让"已停用"与"从未安装"在磁盘上无从区分,
  于是重新启用就等同于安装,而 GUI 安装不在本授权范围内。
  2026-07-23 实测记录:曾先尝试把链接原地改名为 `<name>.disabled`,失败——Claude Code
  按目录名重新注册,skill 依旧可调用,即改名根本不构成停用。改用前缀点号的目录后,
  Claude Code 与 Codex **均实测跳过该目录**(前者会话内即时消失并在恢复后回归,后者
  重启后列表中不再出现)。该行为同样未见于官方文档,升级后需复测。
  授权理由:该操作零破坏性(内容不丢失、可逆、git 可见),且写通道挂在 `start.sh` 已
  启动的 Vite dev server 上,随 Ctrl-C 一同消失,不新增常驻进程,
  `os-ui/DESIGN.md` §2 的 "no resident daemon is left behind" 不变式不受影响。
  本细缝**不**包含:GUI 内执行安装或删除、常驻服务、SSE、以及任何其他动作端点;
  安装与卸载仍走命令行,GUI 只提供命令复制。
  2026-11-21:上面"不包含 GUI 内执行安装或删除"一条由 Skills Hub 插件取代——用户在应用内
  发起的安装或删除可以写入 skill 目录;常驻服务等其余排除项不变。

## 6. 总验收(与里程碑一一对应)

- M0:陈旧引用清零；Paper_VAE 临时删除及恢复/重新登记边界有人类决策记录。
- M1:已退役(2026-11-21),不再作为验收对象。
- M2:已取代(ADR-0003),不再作为验收对象。
- H1:os-harness 离线测试与 Claude Code、Codex 真实运行通过。
- H2:nanochat_cpu 上"派发 → 执行 → 汇报 → 人类验收"跑通;汇报以项目文件和
  验证结果为依据,不夸大流程边界为确定性 runtime enforcement。
- H3:同类任务第二次执行时引用了第一次的经验。
- 步骤 1:Human Owner 在 macOS 上按桌面端检查清单走通新布局。
- 步骤 2:Human Owner 在 nanochat_cpu 上点开全部五个视图。
- 步骤 3:另一个人在干净机器上不经协助完成 nanochat_cpu 的派发、运行、汇报。
- 步骤 4:Claude Code 与 Codex 各完成一轮对话;`project-dispatch` 经新入口可用。
- 文档归并:长期方向与构建原则只在 GOAL.md 维护;原 task.md/task_en.md 已删除,
  历史原文可由记录的 Git commit 恢复。
- 执行合同层:`build_phases/` 与路线图 `map/` 已于 2026-09-23 删除；历史 launcher/SDK
  prompts 已删除且不是当前验收对象，`os-runtime/` 不存在且不应重建。
- 全程:权威研究状态仍为 plain files；Git 是前置条件(2026-11-21 取代"可选增强")；所有被推翻的既有
  决策在 HANDOFF 与 ADR 有显式 supersession 记录。

## 7. 非目标

- 不做 Web 平台、后端服务、数据库、守护进程、远程访问或账户系统(M4 闸门前);没有
  真实需求就不做并行调度。桌面应用的执行面已于 2026-11-21 授权(§5 步骤 1–4)。
- 不做托管版或付费版;不捆绑、修改、代为安装或更新任何厂商 CLI;产品名不含厂商名称或
  标识(2026-11-21)。
- 应用不代付、不转售、不中转用量;使用 API key 的 agent 属于用户自己的配置(2026-11-21
  取代"不用 API key 计费")。不读取、刷新或复制 CLI 的 OAuth token,只启动用户已登录的
  官方 CLI;不改写 agent 的设置、凭据、hooks 或 MCP 配置。
- 不实现完整通用版本控制:版本历史交给 Git,OS 只记录每次运行所在的 commit(2026-11-21
  取代无 Git 模式下的恢复保证)。
- 第一版不做 Canvas 视图、实验树、算力派发;在有权限模型之前,第三方插件不得携带宿主
  侧代码(2026-11-21)。
- 不让派发到项目的 agent 直接改写 Paper Wiki、Memory、Ideas、Skill Hub 或其他
  Project;当前通过任务合同与 Human Owner 复核约束,未来再决定是否机械强制。
- 不复制 EurekAgent 运行时(AGPL;只吸收其环境工程思想)。
- 不追求支持"所有" agent:内置的是 Claude Code 与 Codex,其余以能经 ACP 接入为准
  (2026-11-21 取代"通过 M1 冷启动测试")。
- 不为假想需求造机制:没有使用证据和 Human Owner 新授权,就不做 M4 闸门内的事项
  (2026-11-21 取代"没有真实第三 agent 就不做 M3,没有摩擦证据就不做 M4";M3 已完成)。
