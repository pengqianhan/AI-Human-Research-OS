# agentos 讲解 & 对 AI-Human Research OS 的启发

> 对 [`resource/agentos/`](agentos/) 仓库的讲解,以及它对本仓库(AI-Human Research OS)的可迁移启发。
> 资料来源:agentos 的 `README.md`、`CLAUDE.md`、内部架构图 `docs-internal/kernel-runtime-subsystem-map.md`。

---

## 一、`resource/agentos` 是什么

先澄清一个容易混淆的点:它和本项目**都叫 "OS",但不是一回事**。

- **本项目**是**知识/研究组织 OS**——用 Markdown + 文件夹约定 + 记忆层 + skills 来组织"人和 AI 一起做研究"的流程。"OS" 是隐喻。
- **agentos** 是 Rivet 公司做的**真正意义上的、给 AI agent 跑代码用的轻量操作系统/虚拟机**。"OS" 是字面架构。

### 它解决的问题

AI agent 要执行它自己生成的代码、shell 命令、跑工具,传统做法是开一个完整的 Linux 沙箱(E2B、Daytona 这类)。沙箱启动慢(几百毫秒到几秒)、占内存大(~1 GB)、贵。agentos 把这套东西做成一个**跑在你自己进程里的微内核 VM**:

| 指标 | agentos | 最快沙箱(E2B) |
|---|---|---|
| 冷启动 p50 | **4.8 ms** | 440 ms |
| 内存/实例(完整 agent) | ~131 MB | ~1024 MB |

核心卖点:

- **进程内运行**(无需启 VM / 拉容器)
- **嵌入你的后端**(agent 通过 "bindings" 直接调用你的 JS 函数,当成 CLI 命令用)
- **默认拒绝的细粒度权限**(文件 / 网络 / 进程)
- **一个 npm 包到处部署**
- Apache-2.0 开源

### 架构(关键)

它建在一个**进程内 OS 内核**上,内核管理虚拟文件系统(VFS)、进程表、管道、PTY、虚拟网络栈——一切都在内核里跑,主机上什么都不执行。隔离用的是浏览器同款技术(V8 isolate / WASM),设计标杆是 Cloudflare Workers(~128 MiB/isolate、默认拒绝出网)。

最值得学的是它**清晰的分层 + 核心/插件边界**:

- **secure-exec**(下层,通用):内核、VFS、语言执行引擎(JS 走独立 V8 daemon、Python 走 Pyodide、WASM)、权限、通用软件 registry。
- **agentos**(上层,面向 agent):ACP 会话、agent 适配器(Pi / Claude Code / OpenCode / Codex)、公开的 `AgentOs` 客户端 API、文档、quickstart。
- 上层**只能**依赖下层,边界由 CI 脚本(`scripts/check-*-boundary.mjs`)强制检查,不允许越界。
- 一个 **registry**:把 coreutils、git、ripgrep、jq 等编译成 WASM 包,像 apt 一样安装;还有 `common` / `everything` 这样的**元包**(bundle)。
- 三个明确的角色构成**信任模型**:Client(可信,除了它提交执行的代码)↔ Sidecar(可信的执行裁决点 / TCB)↔ Executor(V8/WASM,假定为敌对)。安全边界是 sidecar↔executor。

### 工程纪律(它的 `CLAUDE.md` 里最值钱的部分)

- **核心保持最小且稳定,价值在可替换的插件层**;明确写"不要加插件管理器 / manifest / 版本系统"。
- **协议无向后兼容**:client 和 sidecar 同版本锁步发布,刻意不做版本协商——用简单换可维护性。
- **一切都要有界**:每个 limit、timeout、队列都默认有上限、接近时告警、失败时明确报错。
- **派生状态只能由脚本生成**,绝不手改版本 pin。
- agent 的工作文件放在用户级 `~/.agents/`,**绝不进仓库**。

---

## 二、对本 Research OS 的启发

本项目是文档驱动的,agentos 是系统工程驱动的——**能迁移的不是代码,是设计哲学和纪律**。挑出最有价值的几条,每条都对应本仓库里已有的东西:

### 1. 把"核心/插件边界"从约定升级为可校验的检查

`INSTRUCTION.md` 已经写了"小而稳的 core + 可加的 plugins(skills + templates)",这和 agentos 的 secure-exec / agentos 分层是同一个思想。区别是 agentos 用 `check-*-boundary` 脚本**自动强制**边界,本项目目前只靠文字约定 + `filetree-simple` lint。

→ **可加一个轻量校验脚本**:检查每个 template 是否满足你写的"模板契约"(能 `cp -R` 实例化、相对链接正确、列出待填文件)、每个 skill 的 `SKILL.md` 是否声明了 scope/inputs/outputs/limitations、`FILETREE.md` 是否最新。这是把"克制不加结构"的原则做实。

### 2. "克制"的本能被 agentos 反向验证了,继续保持

agentos 明确禁止加插件管理器 / 版本系统 / CLI——和本项目 Agent Rule #8("优先小而可逆的改动,不要加重型结构")完全一致。一个成熟得多的系统级项目得出同样结论,说明这条不是偷懒,是对的。

### 3. 把"信任/隐私模型"做成中心化、显式的一等公民

agentos 把"谁可信、边界在哪、默认拒绝"写在最显眼处。本项目现在的隐私边界散落在 `human/index.md` 和几条 Agent Rule("先问再删""保留原始数据/引用")里。

→ **可以仿照 agentos 的"deny-by-default + 显式信任模型"**,在一处集中声明:哪些研究材料 agent 只能读不能改、哪些数据绝不能外发(尤其是这个 OS 会接 web / MCP 工具)、哪些操作需要人确认。把零散规则收敛成一个清晰的边界声明。

### 4. "有界 + 接近时告警"——正好治 LLM 上下文膨胀

agentos 的"一切有界、接近上限告警、明确失败"和本项目记忆层的 hygiene 上限(`MEMORY.md` ≤200 行、progress log ≤30 行)是同一个直觉。

→ 本项目只有"上限"没有"接近告警"。**可加一条 lint**:当 `MEMORY.md` / `PROJECT_MEMORY.md` 接近上限时提示该剪枝。对管理 agent 的有限上下文窗口,这正是关键。

### 5. "统一转录格式 + 可恢复会话" ←→ 你的 handoff

agentos 有"跨所有 agent 的统一 transcript 格式 + 自动持久化 + 可恢复会话"。本项目有 `HANDOFF.md` + `session-handoff` skill + `PROJECT_MEMORY.md` progress log,而且坚持 `.agents/skills` 与 `.claude/skills` 字节一致(已经是"agent 无关"了)。

→ 启发是把 handoff **更结构化、更标准化**,使 Codex 和 Claude Code 恢复同一份工作时行为完全一致——agentos 的"一种格式服务所有 agent"就是这条规则的成熟形态。

### 6. registry / 元包模式 ←→ 你的 skills-hub,可引入"技能套装"

本项目的 `Research-skills-hub` = agentos 的 registry(canonical 存储 + 每个 collection 的 index + 安装流程 + "安装前先 skim scripts" 的安全提示),思路完全对上。agentos 多了一层:**元包**(`common`、`build-essential`、`everything` 一次装一组)。

→ 可以引入**学科技能套装**:比如"AI 论文写作套装""文献综述套装",一次性为某个研究方向装好一组 skills,而不是逐个装。

### 7. 每个工作单元隔离 + 显式"晋升路径"

agentos 给每个 agent 独立 VM、无共享状态;本项目按项目隔离(uv 环境按文件夹、`PROJECT_MEMORY` 按项目、项目级 skill)。agentos 的发布晋升(local hack → preview → pinned release)和本项目的晋升路径(Task→Project→Global 记忆;lesson→项目级 skill→hub skill,"只有跨多项目证明有用才提升")是同构的——**"证明有用前不要过早泛化"** 这个 gate 两边都有,值得继续坚持。

---

## 三、一个可选的具体结合点

如果本 Research OS 以后需要**安全地执行 agent 生成的实验代码**(比如让 agent 跑数据处理脚本而不污染主机、或并行跑多个实验互不干扰),agentos 不只是"启发",它本身就是一个可直接采用的运行时。不过现在是文档 / 知识中心的,这条属于"远期可选",不是当下重点。

---

## 一句话总结

agentos 是"字面的 agent 操作系统",本项目是"研究知识操作系统";最该借鉴的不是它的 Rust 内核,而是它**把核心做到最小、用自动检查强制边界、一切有界且可观测、用显式信任模型管理风险、用 registry + 晋升路径管理可复用资产**这套纪律——而且它在很多地方反向印证了 `INSTRUCTION.md` 里已经做对的克制。

> 需要的话,可以落地其中某一条,比如写一个校验"模板契约 + skill 元数据完整性"的轻量脚本,或给记忆层加"接近上限告警"的 lint。
