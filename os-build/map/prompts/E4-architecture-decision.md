# E4: 落成 MVP 架构决策 — 纯会话协议（N3 → N4 ★directional）

Map: `os-build/map/index.md` — read the N3 and N4 entries before starting. <!-- ← bundle path -->

> 本边指向方向性节点。用户已于 2026-07-17 选择“纯会话协议”；本任务负责用 N3
> 场景复核并正式落成该选择，不重新开放偏好投票。若场景证据推翻选择，按方向性偏差停止。
> <!-- ← N4.state + E4.action -->

## Prerequisite gate

开始前确认 map 中 N3 为 `verified`，且其 `evidence` 指向已获用户批准的
`os-build/build_phases/mvp-acceptance-scenario.md`。若任一条件不满足，返回
`Status: blocked`，说明最小缺口；不要修改 E4、N4 或 bundle 状态。<!-- ← N3.status + N3.evidence -->

## Start of work

Before executing, edit the map's `index.md`: E4 → `running`, N4 →
`in-progress` (and bundle `status` → `executing` if this is the map's first
launch), updating the Mermaid overview in the same edit.

## Outcome

创建 `os-build/build_phases/mvp-architecture-decision.md`：写明 N3 场景由什么机制
承载、每个被排除方案的理由，以及用户已选择的纯会话协议——MVP 环由 N5 阶段合同与
现有 skills 承载，零新机制；thin launcher 授权保留但保持 dormant。让该正式决策与
`os-build/map/tutorials/N4-architecture-options.md` 互相链接。<!-- ← N4.state -->

## Current state and evidence

先读，后动手：<!-- ← N3.state + N3.evidence + survey -->

- `os-build/build_phases/mvp-acceptance-scenario.md` — 已验证的七步场景与逐步证据。
- `os-build/map/index.md` — N3、N4、E4、E5 的状态、验收和 transition logic。
- `os-build/map/tutorials/N4-architecture-options.md` — 用户做出选择前使用的三方案教程。
- `CONTEXT.md` — Research OS MVP、Research Continuation、Research Artifact、Experience Promotion 的权威定义。
- `os-build/GOAL.md` — 纯文件 + Git 原则、M2、M4 闸门和非目标。
- `HANDOFF.md` — MVP autonomy、MVP architecture path 与 circle_packing 决策。
- `INSTRUCTION.md` — 当前会话启动、项目、评估、经验晋升和人类交接协议。
- `os-build/build_phases/README.md` — 当前 awaiting-rewrite 状态与 archive-launcher 边界。

## Approach

逐步映射 N3 场景的“接收、放置、理解、有界续研、评估、经验捕获、交还人类”到
现有文件约定、skills 和未来 N5 阶段合同；明确每一步为何不需要 launcher、状态数据库、
常驻服务或工作流 CLI。记录候选 2（thin launcher）和候选 3（launcher + 机器状态）
被排除的证据性理由。只允许为事实一致性更新既有 N4 教程，不得借机新增机制。<!-- ← E4.action + E4.transition_logic -->

决策文档至少包含：决策摘要、场景→机制矩阵、现有机制清单、排除方案及理由、权限与
自治边界、E5 的阶段合同约束、风险/降级方式、撤销条件和权威来源。它必须区分“目前
不存在的新机制”和“已存在但由阶段合同编排的文件/skills”。

## Authority and scope

可自主创建决策文档，并为事实一致性小幅更新 N4 教程、`build_phases/README.md` 和 map。
不得实现 launcher、代码、服务、数据库、manifest、GUI 执行面或研究项目；不得重开用户
已经完成的架构选择。不得提交、推送、安装依赖、访问网络或改写无关工作。
<!-- ← N4.state + E4.action + survey -->

## Completion bar

- Self-verify by checking that the decision document and tutorial let the human explain the
  selected path and at least two exclusion reasons without reopening the choice. <!-- ← N4.acceptance -->
- 检查七个场景步骤均在机制矩阵中恰好有落点；所有本地 Markdown 链接可解析；全文与
  CONTEXT、GOAL、HANDOFF 和 map 无矛盾。
- 运行 `python research-skills-hub/open-paper-skills/filetree-simple/scripts/filetree.py lint`
  和 `./verify.sh`，记录准确结果。
- Record the result as `agent_verdict` with `evidence` (commands, outputs,
  artifact paths) in the map's `index.md`. `delivered` requires a passing
  self-check; if you must stop without passing, log a dated line under E4
  `deviations`, set E4 back to `ready`, leave N4 `in-progress`, and
  report back instead of marking delivered.

## Write-back obligations

On a passing self-check, edit the map's `index.md`: N4 → `delivered` with
`agent_verdict` and `evidence`; E4 → `done`; update the Mermaid overview
node classes in the same edit as the ledger. Leave `verified` untouched —
that transition belongs to the human.

## Deviation policy

- Executive (another route reaches the same state): take the conservative
  detour, log one dated line under E4 `deviations`, continue.
- Directional (the N3 scenario shows that pure session protocol cannot carry a required step,
  or a gated mechanism is actually necessary): stop, log what you found under E4
  `deviations`, and report back. Do not improvise a new map or silently switch architecture.

## Final response

Report `Status: complete | incomplete | blocked`, files changed, the selected mechanism and
two exclusion reasons, the seven-step mapping result, exact verification evidence, any
deviation, and the human acceptance check required before E5 can become `ready`.

