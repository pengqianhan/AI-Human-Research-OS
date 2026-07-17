# E5: 重写完整 MVP 阶段合同（N4 → N5）

Map: `os-build/map/index.md` — read the N4 and N5 entries before starting. <!-- ← bundle path -->

## Prerequisite gate

开始前确认 map 中 N4 为 `verified`，且其 `evidence` 指向
`os-build/build_phases/mvp-architecture-decision.md`；同时确认 N3 的验收场景仍存在。
若任一条件不满足，返回 `Status: blocked`，说明最小缺口；不要修改 E5、N5 或 bundle
状态。<!-- ← N4.status + N4.evidence + survey -->

## Start of work

Before executing, edit the map's `index.md`: E5 → `running`, N5 →
`in-progress` (and bundle `status` → `executing` if this is the map's first
launch), updating the Mermaid overview in the same edit.

## Outcome

把 `os-build/build_phases/` 重写为覆盖完整 Research OS MVP 环的阶段合同：每阶段都有
目标、输入、授权边界、真实制品、验收、失败/阻塞规则，以及基于真实仓库文件的中文
HTML 教程要求；`README.md` 能把全部阶段与 N3 七步场景一一对应，且没有孤儿阶段。
保留 `archive-launcher/` 作为冻结证据，不把它纳入执行序列。<!-- ← N5.state -->

## Current state and evidence

先读，后动手：<!-- ← N4.state + N4.evidence + survey -->

- `os-build/build_phases/mvp-architecture-decision.md` — 已验证的纯会话协议约束。
- `os-build/build_phases/mvp-acceptance-scenario.md` — 七步 MVP 验收场景与 circle_packing 实例化。
- `os-build/map/index.md` — N5–N10 状态、E5–E13 transition logic 和执行次序。
- `CONTEXT.md` — MVP 与 Research Artifact、Task、Round、Continuation、Experience Promotion 定义。
- `os-build/GOAL.md` — M2、M3/M4 闸门、总验收和非目标。
- `HANDOFF.md` — circle_packing 权威分解、MVP autonomy、评测器、并行、评审和回灌决策。
- `INSTRUCTION.md` — 当前操作协议、skills、项目状态和人类交接规则。
- `.agents/skills/writing-great-prompt/SKILL.md` — 每个阶段 prompt 的合同写法。
- `os-build/build_phases/README.md` 与 `archive-launcher/` — 待替换说明和不可执行的历史切片。

## Approach

先从 N3 七步证据和 HANDOFF circle_packing 顺序反推最少阶段，再把阶段写成可在全新
Code Agent 会话中直接执行的 prompt。阶段数量和命名由你决定，但必须保持稳定的输入→
产物→验收→交接链，且完整覆盖 intake、放置、理解、有界续研、评估、经验捕获和交还
人类。阶段合同是纯会话协议的施工顺序化；不得先造机制再找用途。<!-- ← E5.action + E5.transition_logic -->

`os-build/build_phases/README.md` 必须包含一张矩阵，至少列出：阶段、对应 N3 步骤、
circle_packing 工作项、输入、主要产物、人类验收和下一阶段。矩阵应说明 E6–E10 如何
消费这些合同，避免把 map 之外再造一个进度来源。

每个 live phase prompt 必须：

- 以直接执行指令开头，可脱离当前对话在 fresh session 使用；
- 指向真实权威文件，不复制一份会漂移的领域模型；
- 明确安全本地操作的授权，以及 destructive、external、publishing、paid、全局政策和
  Hub-skill promotion 的人类确认边界；
- 规定可追溯制品、预算/停止条件、针对性验证和准确的 complete/incomplete/blocked；
- 不以 transcript 作为输入或验收证据；
- 要求该阶段结束时生成一份中文 HTML 教程，内容来自最终真实文件，使用内嵌样式、无
  远程资源，并验证所有本地链接；
- 明确下一阶段的稳定 handoff，而不是要求未来 Agent 猜测上下文。

## Authority and scope

可重写 `os-build/build_phases/README.md`，并在 `os-build/build_phases/` 创建、重命名或
删除尚未执行的 live phase prompt；必须完整保留 `archive-launcher/` 和两份 MVP 输入
文档。可更新 map 的执行证据。不得执行任何 phase、实例化 circle_packing、运行研究或
评测、实现 launcher/CLI/service/database/manifest/GUI，亦不得修改项目模板、skills 或
OS 操作政策。不得提交、推送、安装依赖、访问网络或触碰无关未跟踪参考仓库。
<!-- ← N5.state + E5.action + survey -->

## Completion bar

- Self-verify by reading `os-build/build_phases/README.md`: every phase maps to one or more
  N3 scenario steps, every N3 step is covered, and no phase lacks a predecessor, acceptance
  check, or downstream consumer. <!-- ← N5.acceptance -->
- 审核每个 live phase prompt 是否可独立复制执行，是否包含可验证完成标准、权限边界、
  blocked 路径、中文 HTML 教程合同和稳定 handoff；确认 archive 文件未被改写。
- 运行所有适用的本地 Markdown 链接检查、
  `python research-skills-hub/open-paper-skills/filetree-simple/scripts/filetree.py lint`、
  `./verify.sh` 与 `git diff --check`，记录准确结果。
- Record the result as `agent_verdict` with `evidence` (commands, outputs,
  artifact paths) in the map's `index.md`. `delivered` requires a passing
  self-check; if you must stop without passing, log a dated line under E5
  `deviations`, set E5 back to `ready`, leave N5 `in-progress`, and
  report back instead of marking delivered.

## Write-back obligations

On a passing self-check, edit the map's `index.md`: N5 → `delivered` with
`agent_verdict` and `evidence`; E5 → `done`; update the Mermaid overview
node classes in the same edit as the ledger. Leave `verified` untouched —
that transition belongs to the human.

## Deviation policy

- Executive (another phase split reaches the same N5 state): take the conservative
  detour, log one dated line under E5 `deviations`, continue.
- Directional (the verified N3/N4 inputs cannot produce a coherent zero-new-mechanism phase
  chain, or a required phase would cross an unopened M3/M4 gate): stop, log what you found
  under E5 `deviations`, and report back. Do not improvise a new architecture or execute
  archived launcher prompts.

## Final response

Report `Status: complete | incomplete | blocked`, live phase order, files created/changed,
the N3 coverage matrix result, exact validation evidence, preserved archive boundary, any
unresolved gate, and the human acceptance check required before downstream execution.

