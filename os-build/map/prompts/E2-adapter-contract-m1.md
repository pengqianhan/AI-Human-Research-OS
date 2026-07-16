# E2: Agent adapter 契约成文 — GOAL M1（N0 → N2）

Map: `os-build/map/index.md` — read the N0 and N2 entries before starting. <!-- ← bundle path -->

## Start of work

Before executing, edit the map's `index.md`: E2 → `running`, N2 →
`in-progress`（and bundle `status` → `executing` if this is the map's first
launch）, updating the Mermaid overview in the same edit.

## Outcome

完成 GOAL.md M1 适配器契约成文 + 内核去硬编码（纯文档）：<!-- ← N2.state -->

1. INSTRUCTION.md「Extending the OS」下新增「Agent adapters」小节（建议 ≤30 行）：
   人读对照表（agent、入口文件、技能目录、可用强制机制、外部工具/凭据机制、降级方式），
   并明确声明这是文档约定、不是机器可读 manifest。
2. skills 格式一并成文：`SKILL.md`（frontmatter: name/description）+ `scripts/` 为跨
   agent 格式；`agents/<vendor>.yaml` 类 per-agent 附件允许存在、其他 agent 忽略。
3. INSTRUCTION.md Skills 节与 README 中的两-agent 硬编码改为引用该表。
4. HANDOFF.md D7 加注：拷贝数 = 已注册 adapter 数。

## Current state and evidence

先读，后动手：<!-- ← N0.state + survey -->

- [GOAL.md](../../GOAL.md) M1 全文与第 4 节三条铁律 — 授权与验收来源。
- [INSTRUCTION.md](../../../INSTRUCTION.md) Skills 节 — 两处 `.agents/skills/`、`.claude/skills/` 硬编码。
- [README.md](../../../README.md) — 对应硬编码段落。
- [HANDOFF.md](../../../HANDOFF.md) D7 行与 Orphan-skills 决策行。
- `.gitignore` 中 `.antigravitycli/` 痕迹 — 第三个未注册 agent 的证据；是否入表按 GOAL M1 文本处理。

## Approach

agent-agnostic 是铁律：内核零专属假设，任何能读文件的 agent 走同一引导链——这是终点
"人类无缝加入"的 agent 侧含义。<!-- ← E2.transition_logic -->
表的措辞与栏目顺序由你定；M1 的冷启动测试是条件项（仅当真实第三 agent 可用），
不在本边范围内。<!-- ← E2.action -->

## Completion bar

- Self-verify by running: 在 INSTRUCTION.md 全文搜 `.claude` 与 `.agents`，除
  「Agent adapters」表本身外零命中；README 硬编码段已改为引用该表。<!-- ← N2.acceptance -->
- 被索引文件（INSTRUCTION.md、README.md、HANDOFF.md）变更后，用 `filetree-simple`
  刷新哈希，`./verify.sh` 全绿。
- Record the result as `agent_verdict` with `evidence` in the map's `index.md`.
  `delivered` requires a passing self-check; if you must stop without passing, log a
  dated line under E2 `deviations`, set E2 back to `ready`, leave N2 `in-progress`,
  and report back instead of marking delivered.

## Write-back obligations

On a passing self-check, edit the map's `index.md`: N2 → `delivered` with
`agent_verdict` and `evidence`; E2 → `done`; update the Mermaid overview node
classes in the same edit as the ledger. Leave `verified` untouched — that
transition belongs to the human（用户将亲自在 INSTRUCTION.md 里执行搜索检查）.

## Deviation policy

- Executive: take the conservative detour, log one dated line under E2
  `deviations`, continue.
- Directional（例如发现去硬编码会破坏某个既有 skill 的运行前提）: stop, log what you
  found under E2 `deviations`, and report back. Do not improvise a new map.
