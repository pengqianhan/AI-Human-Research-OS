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
2. 验证 Human Owner 已暂时删除 `projects-folder/Paper_VAE/`，并把该决定记入
   HANDOFF.md Decisions：当前不登记为活动项目；恢复必须由 Human Owner 新授权；恢复后
   若要进入 Research OS 活动 portfolio，须先登记 `memory/MEMORY.md` 并补
   `PROJECT_MEMORY.md`。

## Current state and evidence

先读，后动手：<!-- ← N0.state + survey -->

- [INSTRUCTION.md](../../../INSTRUCTION.md) — 会话启动序列与 Agent Rules。
- [GOAL.md](../../GOAL.md) M0 — 本任务的授权与验收来源（纯文档工作，无需 OS Feedback 证据）。
- [HANDOFF.md](../../../HANDOFF.md) — Active Work 的路线图指针段 + Decisions D4 行。
- `git grep -n OS_INTRO -- '*.md'` — 只检查本仓库跟踪的 Markdown，避免把 `os-build/references/` 下的嵌套参考仓库误当成 OS 治理文本。
- `test ! -e projects-folder/Paper_VAE` 与 `git status --short -- projects-folder/Paper_VAE`
  — 验证 Human Owner 已执行的临时删除，不恢复、不修改其他已删除项目。

## Approach

悬而未决的治理项让每个新会话重复消化矛盾，这是本边存在的理由。<!-- ← E1.transition_logic -->
措辞与决策行格式由你定，跟随 HANDOFF 既有表格风格；该选择已经由 Human Owner 做出，
不得重新打开二选一，也不得恢复 Paper_VAE。<!-- ← E1.action -->

## Completion bar

- Self-verify by running: `git grep -n OS_INTRO -- '*.md'` 输出只含历史性说明；
  `test ! -e projects-folder/Paper_VAE` 成功；HANDOFF.md Decisions 能看到临时删除、
  恢复授权和重新登记边界。<!-- ← N1.acceptance -->
- `FILETREE.md` 只索引核心文件和公开顶层区域，本边不应新增嵌套条目或哈希。运行
  `python research-skills-hub/open-paper-skills/filetree-simple/scripts/filetree.py lint`
  与 `./verify.sh`，两者均须通过。
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
