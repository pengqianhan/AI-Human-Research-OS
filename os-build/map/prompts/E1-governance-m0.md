# E1: 清零治理债务 — GOAL M0（N0 → N1）

Map: `os-build/map/index.md` — read the N0 and N1 entries before starting. <!-- ← bundle path -->

## Start of work

Before executing, edit the map's `index.md`: E1 → `running`, N1 →
`in-progress`（and bundle `status` → `executing` if this is the map's first
launch）, updating the Mermaid overview in the same edit.

## Outcome

完成 GOAL.md M0 治理对齐：<!-- ← N1.state -->

1. HANDOFF.md 决策行 D4 中关于 `OS_INTRO.html` 的陈旧表述改为历史性说明（该文件已于
   commit 784f9e8 删除）；仓库内其余 `OS_INTRO` 引用同样只余历史性说明。
2. 把 `projects-folder/Paper_VAE/` 的地位整理成带证据的二选一交用户拍板：
   (a) 登记入 memory/MEMORY.md Active Projects 并补 `PROJECT_MEMORY.md`；
   (b) 声明为嵌套仓库豁免区并写明豁免边界（不登记、不受 OS 约定约束、FILETREE 不索引）。
   执行用户所选项，并把决策连同理由记入 HANDOFF.md Decisions。

## Current state and evidence

先读，后动手：<!-- ← N0.state + survey -->

- [INSTRUCTION.md](../../../INSTRUCTION.md) — 会话启动序列与 Agent Rules。
- [GOAL.md](../../GOAL.md) M0 — 本任务的授权与验收来源（纯文档工作，无需 OS Feedback 证据）。
- [HANDOFF.md](../../../HANDOFF.md) — Active Work 的路线图指针段 + Decisions D4 行。
- `grep -rni OS_INTRO --include='*.md' .` — 找全残留引用。
- `projects-folder/Paper_VAE/` — 调查其内容、大小、git 状态、Claude 锁定程度，作为二选一的证据。

## Approach

悬而未决的治理项让每个新会话重复消化矛盾，这是本边存在的理由。<!-- ← E1.transition_logic -->
措辞与决策行格式由你定，跟随 HANDOFF 既有表格风格；Paper_VAE 的选择权在用户，你只
准备证据和利弊，不代拍板。<!-- ← E1.action -->

## Completion bar

- Self-verify by running: `grep -rni OS_INTRO --include='*.md' .` 输出只含历史性说明；
  打开 HANDOFF.md Decisions 能看到 Paper_VAE 决策行（含用户选择与理由）。<!-- ← N1.acceptance -->
- 被索引文件（HANDOFF.md 等）变更后，用 `filetree-simple` 刷新哈希，`./verify.sh` 全绿。
- Record the result as `agent_verdict` with `evidence`（commands, outputs, artifact
  paths）in the map's `index.md`. `delivered` requires a passing self-check; if you
  must stop without passing, log a dated line under E1 `deviations`, set E1 back to
  `ready`, leave N1 `in-progress`, and report back instead of marking delivered.

## Write-back obligations

On a passing self-check, edit the map's `index.md`: N1 → `delivered` with
`agent_verdict` and `evidence`; E1 → `done`; update the Mermaid overview node
classes in the same edit as the ledger. Leave `verified` untouched — that
transition belongs to the human（用户将亲自跑上面的 grep 与 HANDOFF 检查）.

## Deviation policy

- Executive（换条实现路仍能到达同一状态）: take the conservative detour, log one
  dated line under E1 `deviations`, continue.
- Directional（发现 N1 状态本身站不住，例如 M0 范围与仓库现状冲突）: stop, log what
  you found under E1 `deviations`, and report back. Do not improvise a new map.
