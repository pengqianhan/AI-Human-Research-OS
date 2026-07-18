# E3: 起草 MVP 验收场景文档（N0 → N3 ★directional）

Map: `os-build/map/index.md` — read the N0 and N3 entries before starting. <!-- ← bundle path -->

> 本边指向方向性节点：会话是交互式的，用户在场逐题确认；文档未经用户批准不得定稿。

## Start of work

Before executing, edit the map's `index.md`: E3 → `running`, N3 →
`in-progress`（and bundle `status` → `executing` if this is the map's first
launch）, updating the Mermaid overview in the same edit.

## Outcome

产出 `os-build/build_phases/mvp-acceptance-scenario.md`：把 CONTEXT.md 的 Research OS MVP 定义
翻译成可判定的验收清单。<!-- ← N3.state -->

- 首个真实项目/载体已定（不重开）：**circle_packing**（用户确认，记录在地图 N3 条目）；
  `projects-folder/Example_Project/` 只承担此前的 Pi 文件工作流 smoke test。
- 覆盖 MVP 七步：接收 Research Input Artifact → 放置 → 理解 → 有界续研 → 评估 →
  经验捕获 → 交还人类；每步写明"验收时看哪个文件、跑哪条命令、通过标准是什么"。
- 每步证据必须是用户**不读 transcript** 就能亲自检查的产物。
- 终点复用条款：N10 验收将用一个全新的 partial Research Input Artifact 重走全环
  （见地图 N10 条目），场景清单须写成与载体解耦的形式 + circle_packing 实例化两栏。

## Current state and evidence

先读，后动手：<!-- ← N0.state + survey -->

- [CONTEXT.md](../../../CONTEXT.md) — MVP 与全部领域词汇的定义，措辞必须与之一致。
- [HANDOFF.md](../../../HANDOFF.md) — 「Research OS MVP」Active Work 条目、
  「pi product-shell decisions」中 MVP autonomy 行（自治边界是清单第 4 步的输入）、
  circle_packing kickoff decisions（评测器、并行、评审既有决策，不得与之冲突）。
- [GOAL.md](../../GOAL.md) M2 与非目标条款。
- [os-build/map/index.md](../index.md) — N3、N10 的 state 与 acceptance。

## Approach

"完成"不可判定则一切不可验收，这是本边存在的理由。<!-- ← E3.transition_logic -->
起草后用 `grilling` skill 的单题格式与用户逐步确认每一步的证据项（一次一题，附推荐
答案）；用户对某步说不出"怎么判"就重写该步。<!-- ← E3.action -->

## Completion bar

- Self-verify: 文档存在、七步齐全、每步有文件路径或命令级的通过标准、与 CONTEXT.md
  词汇一致、与 HANDOFF 既有决策无冲突；**用户已在会话中明确批准全文**。<!-- ← N3.acceptance -->
- `mvp-acceptance-scenario.md` 是 `os-build/` 内部制品，不应在顶层 `FILETREE.md` 新增一行。
  运行 `python research-skills-hub/open-paper-skills/filetree-simple/scripts/filetree.py lint`
  与 `./verify.sh`，两者均须通过。
- Record the result as `agent_verdict` with `evidence` in the map's `index.md`.
  `delivered` requires a passing self-check（含用户批准）; if you must stop without
  passing, log a dated line under E3 `deviations`, set E3 back to `ready`, leave N3
  `in-progress`, and report back instead of marking delivered.

## Write-back obligations

On a passing self-check, edit the map's `index.md`: N3 → `delivered` with
`agent_verdict` and `evidence`（含场景文档链接）; E3 → `done`; update the Mermaid
overview node classes in the same edit as the ledger. Leave `verified` untouched —
that transition belongs to the human（用户将亲自逐步复读文档并确认每步可判）.

## Deviation policy

- Executive（文档结构、措辞、存放细节）: take the conservative detour, log one dated
  line under E3 `deviations`, continue.
- Directional（发现载体或七步框架本身站不住，例如 circle_packing 无法承载某一步）:
  stop, log what you found under E3 `deviations`, and report back. Do not improvise
  a new map — 回地图会话重画。
