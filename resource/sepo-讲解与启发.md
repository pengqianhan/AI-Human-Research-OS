# sepo(self-evolving repository)讲解 & 对 AI-Human Research OS 的启发

> 对 [`resource/repo/`](repo/) 仓库的讲解,以及它对本仓库(AI-Human Research OS)的可迁移启发。
> 资料来源:sepo 的 `README.md`、`AGENT.md`,以及 `.agent/docs/` 下的 overview / architecture / technical-details 文档(memory、rubrics、orchestrator、request-lifecycle、key-concepts、goals)。

---

## 一、`resource/repo`(sepo)是什么

它的全名是 **sepo: self-evolving repository(自进化仓库)**。一句话:**把一个 GitHub 仓库本身变成一个能听懂请求、会改自己代码、还会积累记忆和偏好的 agent 系统**。

它和本项目又一次"撞名"——都在讲"让人和 AI 协作"。但定位不同:

- **本项目**:本地文件驱动的**研究知识 OS**,协作发生在你的工作目录里(Markdown + 文件夹约定 + 记忆层 + skills)。
- **sepo**:**GitHub 原生**的 agent 运行时,协作发生在 **issue / PR / discussion** 里。你 `@sepo-agent` 一句话,它在 GitHub Actions 里跑起来,直接在原地回答、提 PR、评审、修 PR。**刻意不把协作搬到单独的聊天工具里。**

### 它能做什么(routes)

在任何 GitHub 文本框里 `@sepo-agent`,或给 PR 打 `agent/*` 标签,触发一条"路线":

- `answer`(就地答疑)、`implement`(实现 issue)、`review`(评审 PR)、`fix-pr`(修 PR 分支)
- `add-rubrics`(提议偏好规则)、`orchestrate`(编排多步)、`skill`(调用技能)
- `agent-self-approve` / `agent-self-merge`(自我审批 / 自我合并,默认关闭)

每个请求都汇聚到一个 portal 工作流 `agent-router.yml`:鉴权 → 判断是否真被 @ 到 → 显式 slash 命令直接路由 / 否则用模型做一次 triage 分类 → 分发到对应工作流或就地回答。会话用 git ref 持久化,**下一次 @ 能接着上次的上下文继续**。

### 架构里最值得学的三件事

**(1)记忆 vs 规则,两套完全独立的持久化状态。** 这是 sepo 最精炼的设计:

| 状态 | 存在哪 | 是什么 | 默认写权限 |
|---|---|---|---|
| **Memory(记忆)** | `agent/memory` 分支 | **描述性**:agent 对项目/历史/自身工作的连续性认知 | 默认 **可读可写** |
| **Rubrics(规则)** | `agent/rubrics` 分支 | **规范性**:用户/团队希望未来工作"优化什么、评审打分依据什么" | 默认 **只读** |

关键在于**这条非对称默认值**:普通任务可以随手更新"记忆",但**不能随手改"规则"**——规则只能由专门的学习工作流(从已合并 PR 的讨论里保守地蒸馏)来写。描述性的"我观察到什么"和规范性的"你应该怎么做"被彻底分开了。

**(2)记忆分四层,机器写的和人/agent curated 的分开。**
- `PROJECT.md`:慢变的项目目标 / 约束 / 开放问题
- `MEMORY.md`:沉淀下来的、要带去未来的约定和教训
- `daily/YYYY-MM-DD.md`:**只追加**的每日活动流水
- `github/<owner>/<repo>/*.json`:对 issue/PR/discussion 的**确定性镜像**,由定时工作流原样 dump `gh --json`,**从不手改**,可以用 `jq` 查询

→ "人来 curate 的 Markdown" 和 "机器确定性写入的原始镜像" 物理隔离。还配了 `memory/update.js` 这种受校验的 CLI 做 bullet 级编辑(保证分节、去重、格式一致),而不是让 agent 随意改文件。

**(3)Rubrics 是带 schema 的、可被"提示期检索"的加权规则。** 每条 rubric 是一个 YAML(`id` / `title` / `description` / `applies_to`(哪条 route)/ `severity`(must/should/consider)/ `weight`(1-10)/ `status`)。运行时按 **route 适用性 + severity + weight + 和请求文本的 token 匹配**排序,只把 Top-N 注入 prompt——本质是一次**提示期的 retrieval**。例如 `answer` 路线只加载 communication 域的规则。

### 编排与自治(和你的研究方向高度相关)

- **bounded orchestrator**:`/orchestrate` 是一个有界状态机(implement→review→fix-pr→…),有**最大轮数上限**(默认 12),并在"成功标准不清 / 需要产品或研究判断 / 只剩可选清理"时**主动停下来等人**。
- **goal issue 层级**:用 `agent-goal` 标签把大目标做成 issue,展开成 `目标 → 子目标 → 具体实现 issue → PR → 编排进度评论` 的层级。**目标的"成功标准"就是 scope 边界**——所有子任务都要说明自己如何推进该目标,偏离了就停。
- **自进化但处处有门闸**:agent 可以改自己的工作流;但 self-approve / self-merge 默认关闭,要显式开 `AGENT_ALLOW_SELF_APPROVE/MERGE`;goal issue 始终把停止条件摆在明面上。

### 安全姿态:deny-by-default + 分层信任

- 一套 `AGENT_*_POLICY` 变量集中管访问:`AGENT_ACCESS_POLICY`(谁能触发)、`AGENT_MEMORY_POLICY`(默认全开)、`AGENT_RUBRICS_POLICY`(**默认只读**)、`AGENT_SCHEDULE_POLICY`(定时任务)。
- **review 是信任最低的路线**(它要吃任意 PR diff):评审 job 强制 `contents: read` + memory 只读,只有 synthesize job 拿到写权限。
- **fork 安全**:PR 关闭时的记忆 curation 跳过"未合并的 fork PR",避免攻击者控制的内容带着写 token 进 LLM。
- **记忆提交三重门闸**:agent 干净退出(exit 0)+ 策略允许写 + 记忆成功挂载,三者全真才提交;失败/中断绝不推半成品。

---

## 二、对本 Research OS 的启发

本项目是本地文件驱动、单/小团队、知识中心的;sepo 是 GitHub 原生、多人异步、工程中心的。**能迁移的不是它的 GitHub Actions 管线,是几条结构性设计**。每条都对应本仓库里已有的东西:

### 1.(最值钱)把"记忆"和"偏好规则"拆成两套状态——描述性 vs 规范性

本项目目前把两种东西混在一起:
- **描述性**:`memory/MEMORY.md`、`PROJECT_MEMORY.md` 里"项目进展、决策、学到的教训"。
- **规范性**:`human/PROFILE.md` 的协作偏好、以及散落的 feedback 类经验("用户希望我怎么做")。

sepo 告诉你:这两类应该**分开存、用不同的写策略管**。描述性记忆可以随任务更新;规范性偏好应当**默认只读、只能经过审核才改**。

→ **可以引入一个轻量的 "rubrics 层"**:把"用户希望 agent 优化什么"做成结构化、可被复用的规则(而不只是 `PROFILE.md` 里的散文),并约定普通任务只读、不得擅自改写。这对一个会接 Codex / Claude Code 两个 agent 的 OS 尤其有用——偏好集中、显式、可校验。

### 2. 把偏好做成"带 schema + 按任务检索"的规则,而不是一段散文

sepo 的 rubric 有 `applies_to`(适用哪种任务)、`severity`、`weight`,运行时按相关性排序只注入 Top-N。本项目现在是把 `human/index.md`、`PROFILE.md` 整段读进来。

→ 可以给偏好/经验加最小元数据:**适用场景**(写论文 / 跑实验 / 文献综述 / 文档)+ **强度**。让 agent 在"写 LaTeX"时只加载写作类偏好,"跑实验"时只加载实验类偏好——正好节省 LLM 的有限上下文。这是 sepo "`answer` 只加载 communication 规则"的研究版。

### 3. `human/inbox.md` 的"候选→晋升"其实就是 sepo 的规则学习闸,把它做实

本项目已经有 [`human/inbox.md`](../human/inbox.md)("候选人类记忆,审核后再晋升进 PROFILE"),这正是 sepo "draft PR 提议规则 → 专门工作流校验 → 才提交到 `agent/rubrics`" 的轻量版,**思路完全一致**。sepo 多了两点纪律:**写路径严格校验(schema + 唯一 id),读路径尽力而为**;以及**只从可信来源保守学习**(只从已合并 PR、可信贡献者蒸馏)。

→ 给 `inbox.md` 的晋升加一条明确的 gate:晋升进 `PROFILE.md` 前校验格式 + 标注来源(哪次会话/哪个决策),并坚持"不确定就留在 inbox,别污染稳定档案"。

### 4. "确定性机器记录" 和 "curated 记忆" 物理分开 + 每日流水

本项目的记忆规则现在是"别存噪声命令输出"(一条**禁令**)。sepo 把它升级成**结构分离**:机器确定性写入的原始镜像(`github/*.json`)和人 curate 的 Markdown 各占各的位置,互不污染。

→ 研究场景的对应物:**实验原始日志 / run 输出 / 文献元数据**(机器写、确定性、从不手改)vs **沉淀的教训和决策**(`memory/MEMORY.md`)。可以给项目加一个 `runs/` 或 `daily/YYYY-MM-DD.md` 式的**只追加研究流水**,把"今天跑了什么、出了什么数"自动记下来,再由 agent 定期把其中**耐用的发现**蒸馏上提到 `PROJECT_MEMORY.md`——这正好补上你现在"Task 层 → Project 层"蒸馏路径缺的那个原始底座。

### 5.(和你的 paper-library 主题强相关)有界编排 + goal-issue 层级,是"自主研究循环"的安全模板

你的 [`paper-library/`](../paper-library/) 收的全是 *autonomous research / self-evolving agent* 的论文(Arbor、AutoScientists、OpenSkill、EurekAgent…),说明你对"让 agent 自主跑研究循环"很感兴趣。sepo 的 orchestrator 给了一个**可直接照搬的安全骨架**:

- **目标做成一等对象**,带显式 **success criteria**,而且"成功标准就是 scope 边界";
- **最大轮数上限** + **明确的停止条件**(成功标准不清 / 需要研究判断 / 只剩可选清理 → 停下等人);
- **自治但门闸默认关闭**(self-approve/merge 要显式开)。

→ 若以后给本 OS 加"自主推进一个 idea→project"的编排层,**别先抄自治,先抄它的边界**:每个研究目标先写死成功标准 + 轮数上限 + 停止条件,实验子任务必须申报"如何推进该目标"。这把你 `INSTRUCTION.md` 里"小而可逆、不加重型结构"的克制,延伸到了自动化循环上。

### 6. 会话连续性:thread key + 可恢复会话 ←→ 你的 HANDOFF

sepo 用 `thread_key = repo:target_kind:target_number:route:lane` 给每条工作线一个稳定身份,下次能精确找回会话状态。本项目有 [`HANDOFF.md`](../HANDOFF.md) + `session-handoff` skill。

→ 启发是给 handoff 一个**更明确的"线程身份"**:同一个 project / 同一类任务,恢复时能对应到上次的确切状态;并坚持让 Codex 和 Claude Code 恢复同一份工作时行为一致(你已经在做 `.agents/skills` 与 `.claude/skills` 字节一致,这是同一种"agent 无关"纪律)。

### 7. 一个要明确"不抄"的点:状态放分支 vs 放工作树

sepo 把记忆/规则放在**单独的 `agent/memory` / `agent/rubrics` 分支**、操作游标放在**单独 git ref**,目的是让主工作树干净。本项目刻意相反——**所有东西都是人可浏览的文件**,这正是它的价值。

→ 所以不要照搬"把记忆藏进分支"。但**底层原则可借**:**派生/操作性状态 与 人 curate 的内容 应该可区分**。本项目用 `.gitignore`(scratch、私有 Human context、agent-local 数据)已经在做这件事,继续保持即可。

---

## 三、一个可选的具体结合点

如果本 Research OS 以后想走向**多人异步研究协作**(比如让合作者在某个 PR/issue 上 @ agent 评审一段分析、或异步推进一个实验),sepo 的 GitHub 原生模式就是一条现成的路:协作留在 GitHub、记忆和偏好沉淀在仓库分支、评审有 rubrics 打分。不过现在本项目是本地、单/小团队、知识中心的,这条属于"远期可选的分叉路口",不是当下重点。

当下最该落地的,是 **第 1、3、4 条**——它们不依赖任何 GitHub Actions,纯粹是把你已有的 `memory/`、`human/inbox.md`、记忆 hygiene 规则**结构化得更彻底一点**。

---

## 一句话总结

sepo 是"把仓库本身变成会自进化的 agent",本项目是"研究知识操作系统";最该借鉴的不是它的 GitHub Actions 管线,而是它**把"描述性记忆"和"规范性规则"拆成两套独立、写策略非对称的状态,把机器确定性记录和人 curated 记忆物理分开,以及用"成功标准 + 轮数上限 + 默认关闭的门闸"给自治划边界**这套设计——很多地方又一次反向印证了 `INSTRUCTION.md` 里已经做对的克制。

> 需要的话,可以先落地一条:把 `human/` 里的协作偏好抽成一个最小的、按任务类型加载的"rubrics 层",并给 `inbox.md` 的晋升加一个带来源标注的校验 gate。
