# EurekAgent 讲解 & 对 AI-Human Research OS 的启发

> 对 [`Resource/EurekAgent/`](EurekAgent/) 仓库的讲解,以及它对本仓库
> (AI-Human Research OS) 的可迁移启发。
> 资料来源:EurekAgent 的 [`README.md`](EurekAgent/README.md)、核心
> `src/` 控制流、`examples/` 问题定义,以及本仓库
> [`paper-library/papers/2606.13662.md`](../paper-library/papers/2606.13662.md)
> 的论文笔记。
>
> 注意:`Resource/` 是只读外部参考区。落地时不要导入 EurekAgent 代码;
> 应在本仓库自己的模板、skills 和项目文件里重新实现相应思想。

---

## 一、`Resource/EurekAgent` 是什么

EurekAgent 是一个 **metric-driven autonomous scientific discovery** 系统。
它让用户先定义问题和评价标准,然后协调现成 CLI agent 去:

1. 准备环境;
2. 提出多条候选路线;
3. 并行实现这些路线;
4. 调用隐藏评测器评分;
5. 根据排名继续下一轮迭代。

它的重点不是训练一个新模型,而是做 **agent environment engineering**:
给强 CLI agent 配好资源、限制、产物格式、预算、隔离、恢复和人类监督界面。
EurekAgent 的 README 明确把亮点写成:

- environment engineering first;
- end-to-end research loop;
- problem-defined evaluation;
- isolated execution;
- resumable long runs;
- TUI / web monitor。

和本项目的定位差异很清楚:

| 项目 | 核心定位 | 主要载体 |
|---|---|---|
| **AI-Human Research OS** | 人和 agent 长期协作的研究知识 OS | Markdown、文件夹约定、memory、skills、paper/project 模板 |
| **EurekAgent** | 面向可评分科学任务的自动实验运行时 | Docker、CLI agent session、隐藏 evaluator、ranked artifacts、monitor |

因此,对本 OS 来说,EurekAgent 最值得学的不是 Docker 控制器本身,
而是它把“研究循环”工程化为可验证环境的方式。

---

## 二、EurekAgent 的核心机制

### 1. 问题定义是第一等接口

一个 EurekAgent problem 至少需要:

- `INSTRUCTION.md`:任务、目标方向、约束、已知 best / target、`run()` 契约;
- `SUBMISSION_FORMAT.md`:候选答案 JSON schema、score 语义、无效提交行为;
- `hidden_eval_dir/evaluate.py`:隐藏评测器,定义 `grade_submission()` 和 `is_better()`;
- `run.sh`:把问题、评测器、格式、模型和预算传给控制器。

这个设计把“agent 该做什么”和“怎样算做得好”分开。
`INSTRUCTION.md` 面向 agent 理解任务,`evaluate.py` 面向系统裁决结果。

### 2. 控制流是 prepare -> propose -> implement 的有界循环

EurekAgent 的 `src/graph.py` 把状态机写得很直接:

```text
START -> entry -> prepare -> propose -> implement --+
                          ^                         |
                          +-------- loop -----------+
```

其中:

- `prepare`:验证问题设置、测试评价管线、准备环境;
- `propose`:生成多条不同初始 hypothesis / approach;
- `implement`:每条 approach 一个 session,并行实现、提交、根据 official feedback 迭代;
- `implement` 结束后,把有效结果写入 ranked history,再进入下一轮 propose。

这比“让一个 agent 一路自由探索”可靠,因为每个阶段都有明确职责和产物。

### 3. artifact readiness 由机器判定

EurekAgent 不靠 agent 说“我完成了”。它集中在
`src/artifacts.py` 里验证阶段产物:

- `prepare/complete.json` 是否存在且是 JSON object;
- `round_state/current_round_approaches.jsonl` 是否是合法 manifest;
- 每个 `approach_details/<id>/approach.md` 是否存在且非空;
- 每个 approach 是否产出有效 `best_result.jsonl`;
- result 是否 `valid: true`,score 是否可读。

这个机制的关键思想是:长周期 agent 系统里的“记忆”不仅是 Markdown 总结,
还应该包括 **可被控制器检查的 stage artifacts**。

### 4. 评测器独立于 agent,结果文件由系统写

EurekAgent 的实现 prompt 明确要求:

- 不要自己计算 fitness / score;
- 不要读取、复刻、绕过 hidden grader;
- 只能通过 grading service 提交候选;
- `intermediate_results.jsonl` 和 `best_result.jsonl` 由 grader 自动维护;
- 每个 submission 必须带独立完整的 `description`。

这条纪律非常重要:agent 负责生成候选,评测器负责裁决,控制器负责排名。
生成层和验证层不混在一起,可以降低 reward hacking、自我误判和结果污染。

### 5. 并行 approach 是隔离的,但历史是共享的

每轮 propose 产出 approach manifest。implement 阶段为每个 approach 创建:

- `approach_details/<id>/code/`;
- `submissions/`;
- `eval_feedback/`;
- `logs/`;
- 独立 session transcript;
- 独立 session map;
- 独立 `best_result.jsonl`。

同轮 approach 之间不能读写彼此目录,但后续轮次可以读取 prior rounds 的
ranked best solutions。也就是说:探索隔离,沉淀共享。

### 6. 预算、恢复和观察性是运行时的一部分

EurekAgent 把 time budget、cost limit、session transcript、run metadata、
pipeline state、resume config 和 monitor snapshot 都作为环境的一部分。
这说明“长时间运行”不是简单把 agent 放着不管,而是要有:

- 明确 round 上限;
- 每阶段时间预算;
- 成本上限;
- 断点恢复;
- 终止原因;
- 结果排名;
- 可离线审计的日志和 snapshot。

---

## 三、对 AI-Human Research OS 的启发

本 OS 当前已经有清晰的研究材料分层:
`Ideas/`、`paper-library/`、`projects-folder/`、`PROJECT_MEMORY.md`、
`paper_skeleton.md`、`Code/`、`Figs/`、`Baselines/`、skills hub。
EurekAgent 的启发是:在保持 plain files 的前提下,把其中的实验闭环做得更
**可验证、可恢复、可比较**。

### 1. 给项目模板加“Evaluation Contract”

当前 `paper_skeleton.md` 已经有 Problem Formulation、Experiments、
Claims and Evidence。但它更偏论文控制表,还没有把“什么算成功”独立成契约。

可在 `projects-folder/templates/ai_research_template/paper_skeleton.md`
或 `PROJECT_MEMORY.md` 中增加轻量字段:

```markdown
## Evaluation Contract

- Objective:
- Direction: maximize / minimize / approach target / qualitative review
- Primary metric:
- Secondary metrics:
- Valid output:
- Invalid output:
- Baselines or known best:
- Success criteria:
- Stop conditions:
- Verification method: script / manual review / citation check / replication
```

这不是要求所有研究都可自动评分,而是要求每个项目显式回答:
**我们怎样知道这条路线值得继续?**

### 2. 把实验产物变成机器可读 evidence

本 OS 已要求 claims traceable to references, notes, data, code, figures。
EurekAgent 进一步提醒:最好把某些关键证据写成稳定的结构化文件。

可以给项目代码区增加约定:

```text
Code/runs/<run-id>/
  run_summary.md
  run_metadata.json
  approaches/
    <approach-id>/
      approach.md
      code/
      logs/
      submissions/
      result.json
```

`paper_skeleton.md` 的 Claims and Evidence 表可以链接到 `result.json`
或 `run_summary.md`,而不是只写“见实验结果”。这样 agent 恢复项目时能快速判断:
哪个实验有效、哪个失败、哪个 claim 还只是 planned。

### 3. 把“多路线探索”纳入项目工作流

科研项目经常不是单一路径推进,而是多个 hypothesis / method / baseline
并行试错。EurekAgent 把 propose 和 implement 拆开,非常适合迁移成研究 OS
里的轻量流程:

1. `propose`:为当前 research question 写出 2-5 条路线,每条有 rationale、
   expected signal、risk、required evidence;
2. `implement`:每条路线独立跑实验或做文献验证;
3. `rank`:按 Evaluation Contract 排序;
4. `distill`:把耐用结论写入 `PROJECT_MEMORY.md`、`paper_skeleton.md`
   或 project-local skill。

这和本仓库已有的“lesson -> project skill -> hub skill”晋升路径很契合:
先让路线在项目内证明有用,再考虑抽象为通用 skill。

### 4. 引入 verifier/checker 思维,避免 agent 自证

EurekAgent 的 hidden grader 对应到本 OS,不一定总是 Python `evaluate.py`。
更通用的 verifier 可以是:

- 复现实验脚本;
- baseline comparison script;
- citation metadata checker;
- LaTeX build checker;
- figure provenance checker;
- 人类 reviewer rubric;
- 另一个 agent 的 critique / review pass。

原则是:重要 claim 不能只由写作 agent 标记“verified”。
至少要有一个独立检查路径,并把检查结果落盘。

### 5. 把预算和停止条件写进研究目标

本 OS 的 `PROJECT_MEMORY.md` 有 Status 和 Next action,但还可以更明确地吸收
EurekAgent 的 budget engineering:

```markdown
## Autonomy Boundary

- Current goal:
- Success criteria:
- Max rounds or time budget:
- Cost / compute budget:
- Stop and ask human when:
- Allowed tools / data:
- Forbidden actions:
```

这对长期 agent 运行尤其重要。先写边界,再谈自治。

### 6. 让 monitor 先以静态 snapshot 形式存在

EurekAgent 有 TUI 和 web monitor。本 OS 不需要马上引入服务器,但可以先借
“static snapshot”思想:

- 每次重要实验结束写 `Code/runs/<run-id>/run_summary.md`;
- 若需要可选生成 `run_summary.html`;
- summary 只收高信号内容:目标、approaches、结果、证据路径、失败原因、
  next action。

这符合本 OS 的 plain-file 风格,也让人类能快速 review agent 的长时间工作。

---

## 四、建议的最小落地路线

按本仓库“少而可逆”的原则,推荐从模板和 skill 层小步吸收:

### Step 1: 扩展项目模板

在 `ai_research_template` 里增加:

- `Evaluation Contract`;
- `Autonomy Boundary`;
- `Experiment Runs` / `Approaches` 跟踪表。

这一步只改 Markdown,没有运行时风险。

### Step 2: 约定 `Code/runs/` 结构

在模板的 `Code/README.md` 中说明:

- 每个重要实验一个 `runs/<YYYYMMDD_slug>/`;
- 每条路线一个 `approaches/<approach-id>/`;
- 结果汇总到 `run_summary.md`;
- 可选结构化结果写 `result.json`。

这能为并行 agent 和跨会话恢复提供最低成本的物理底座。

### Step 3: 做 project-local skills

先在项目内做轻量 skills,例如:

- `propose-research-approaches`;
- `run-and-record-experiment`;
- `verify-paper-claim`;
- `rank-experiment-results`;
- `distill-run-to-project-memory`。

只有当这些 skills 在多个项目中证明有用,再晋升到 `Research-skills-hub/`。

### Step 4: 再考虑自动编排

如果以后要做 autonomous research loop,先照 EurekAgent / sepo 的共同教训:

- 有 success criteria;
- 有 max rounds;
- 有 budget;
- 有 stop conditions;
- 有人类可审计 snapshot;
- 生成层和验证层分离。

不要先做“全自动”,先做“有边界的半自动”。

---

## 五、明确不该照搬的部分

### 1. 不要把本 OS 变成重型 Docker 控制器

EurekAgent 的 Docker agent/grader container 很适合高风险自动实验,但本仓库的
核心价值是低成本、plain files、易浏览。除非某个具体项目确实需要隔离执行,
否则不要把 Docker runtime 纳入 OS core。

### 2. 不要引入 plugin manager / manifest / CLI

本 OS 的 `INSTRUCTION.md` 已明确:core 保持稳定,plugins 只有 skills 和
project templates,不要加 plugin manager、manifest、versioning system 或 CLI。
EurekAgent 给的是环境工程启发,不是要求本 OS 复制一个控制平面。

### 3. 不要假设所有研究都能 metric-driven

EurekAgent 最强场景是数学优化、kernel engineering、MLE-Bench 这类可执行评测。
本 OS 还要服务:

- 文献综述;
- 理论构思;
- 论文写作;
- 研究计划;
- 多学科探索。

这些任务需要 qualitative review、引用证据、human judgment。可借鉴
Evaluation Contract,但不要强迫所有项目都有单一 score。

### 4. 不要直接复制 AGPL 代码

EurekAgent 使用 AGPL-3.0。本仓库的原创内容是 MIT。
因此只能把它放在 `Resource/` 中作为外部参考,落地时重新实现自己的轻量约定。

---

## 六、和已有启发笔记的关系

EurekAgent 与已有几篇 Resource 笔记形成互补:

- [`agentos-讲解与启发.md`](agentos-讲解与启发.md):
  强调核心/插件边界、显式信任模型、有界资源、可校验约定。
- [`sepo-讲解与启发.md`](sepo-讲解与启发.md):
  强调 memory vs rubrics、机器确定性记录 vs curated memory、成功标准和轮数上限。
- [`并行-自进化-经验共享-调研与启发.md`](并行-自进化-经验共享-调研与启发.md):
  强调每 agent 一个 worktree、一 run 一文件、append-only 研究流水。
- **EurekAgent**:
  最直接补上“metric-driven experiment loop”的手本:
  evaluation contract、artifact readiness、secure grading、ranked approaches、
  resume 和 monitor。

它们共同指向一条路线:

> 先把研究环境做成“可验证的文件系统”,再逐步增加 agent 自治。

---

## 一句话总结

EurekAgent 对 AI-Human Research OS 的最大启发是:
**把研究实验从“agent 的自然语言努力”提升为“有目标、有约束、有官方验证、
有机器可读产物、有预算、有恢复、有审计 snapshot 的环境”**。

本 OS 应该吸收它的 evaluation contract、artifact memory、parallel approach、
verifier/checker、budget boundary 和 snapshot 思想;但仍然保持 plain files、
模板和 skills 的轻量路线,不要把整个仓库变成重型自动实验平台。
