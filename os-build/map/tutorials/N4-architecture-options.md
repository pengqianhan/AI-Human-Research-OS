# N4 教程：MVP 架构路径的三个候选，到底各是什么东西

> 目的：让你不懂 shell/TypeScript 也能对 N4 做出知情选择，并能向别人复述所选路径和排除理由。
> 锚定的真实文件：[INSTRUCTION.md](../../../INSTRUCTION.md)、[GOAL.md](../../GOAL.md)、
> [HANDOFF.md](../../../HANDOFF.md)（pi product-shell decisions）、
> [build_phases/README.md](../../build_phases/README.md)、
> [build_phases/phase-02-launcher.md](../../build_phases/archive-launcher/phase-02-launcher.md)。

## 你要做的选择是什么

MVP 环有七步：接收输入 → 放置 → 理解 → 有界续研 → 评估 → 经验捕获 → 交还人类。
问题是：**用什么机制把一个全新的 agent 会话正确地带进这个环并跑完？**
这就是"架构路径"。三个候选按机制从少到多排列。

## 候选 1：纯会话协议（约定驱动，零新机制）

**物理上是什么**：什么都不新建。"启动"= 你打开 Claude Code（或任何 agent），它按
[INSTRUCTION.md](../../../INSTRUCTION.md) 的 Session Startup 六步自己读文件进入状态
（INSTRUCTION → 认知缓存 → HANDOFF → FILETREE → human/index → memory）。MVP 环的每一步
由 N5 的阶段合同 + 现有 skills 承载（paper-wiki-manager 管文献、session-handoff 管交接、
map-then-territory 管路线）。

**Python 类比**：不写 `main()` 入口函数，而是靠包的 `README` 约定 + import 顺序保证初始化。
"程序"就是一份所有人都遵守的协议。

**优点**：零新代码；天然 agent-agnostic（任何能读文件的 agent 都能走这条链，GOAL 铁律 2
自动满足）；完全可逆（改约定 = 改文档）。
**缺点**：引导正确性靠 agent 自觉——agent 不读文件就会跑偏，没有强制校验（GOAL 铁律 3
说这是可接受的降级模式：约定 + 事后检查）。

## 候选 2：薄启动器 bootstrap（bin/research-os）

**物理上是什么**：[phase-02-launcher.md](../../build_phases/archive-launcher/phase-02-launcher.md) 定义的
一个 POSIX shell 脚本 `bin/research-os`。它做三件事：① 校验仓库是合法 Research OS
（AGENTS.md、INSTRUCTION.md、FILETREE.md、memory/MEMORY.md 四个文件存在）；② 打印
preflight（根目录、git 分支、pi 版本）；③ 用 `exec` 把自己替换成 **pi** 进程。

**pi 是什么**：`@earendil-works/pi-coding-agent`，一个用 npm 安装的终端 code agent——
和 Claude Code 同类的另一家产品。注意关键事实：**启动器最后一步是 `exec pi`，
它只服务 pi**。你日常用的是 Claude Code，启动器不会带起 Claude Code。

**Python 类比**：像一个 `run.sh`：先 `assert os.path.exists(...)` 检查项目结构，
再 `os.execvp("pi", ...)` 把当前进程换成另一个程序。它是"门廊"，不是"房子"。

**优点**：入口统一成一条命令；结构校验从"自觉"变成"强制"。
**缺点**：[build_phases/README.md](../../build_phases/README.md)（2026-07-17 起
launcher 阶段已归档至 `archive-launcher/`）承认：四个 launcher 阶段不覆盖 MVP 的
intake、project continuation、research tools、evaluation、experience promotion、
bounded autonomy、human handoff——即 MVP 七步它一步不碰；
且它是 pi 专属 adapter，对你的 Claude Code 日常零增益。HANDOFF 2026-07-16 已把它降级为
"只是可能的 bootstrap 切片"。

## 候选 3：启动器 + Research Run 状态文件

**物理上是什么**：在候选 2 之上，再为每个 Research Run 维护机器可读的运行状态/清单文件，
向自动调度靠拢。

**为什么现在不可选**：[GOAL.md](../../GOAL.md) M4 闸门和非目标条款明确：机器可读
manifest、工作流 CLI、自动排队，每一项都要先有 OS Feedback 里"文件原生方案不够用"的
具体证据，再经你逐项确认。现在一条证据都没有——这条路被你自己定的规则挡住了。

## 对照表

| | 候选 1 纯协议 | 候选 2 +薄启动器 | 候选 3 +状态文件 |
|---|---|---|---|
| 新增机制 | 0 | 1 个 shell 脚本 | 脚本 + 状态文件约定 |
| agent-agnostic | 天然满足 | pi 专属 adapter | pi 专属且引入 manifest |
| 对 MVP 七步的贡献 | 全部由合同+skills 承载 | 0（只管进门） | 0 + 违反 M4 闸门 |
| 对你日常（Claude Code）| 直接可用 | 无增益 | 无增益 |
| 可逆成本 | 改文档 | 删一个文件 | 删文件 + 清约定 |

## 撤销方式

- 选 1 后想加启动器：GOAL 的授权仍在，随时可以把 launcher 弧作为并行 adapter 任务重启，不动 MVP 主线。
- 选 2 后想撤：删 `bin/research-os` 与相关 build_phases 阶段，HANDOFF 加 supersession 行。
