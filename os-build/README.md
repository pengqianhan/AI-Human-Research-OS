# Research OS 构建执行手册

本目录只保留当前施工入口、长期目标、路线状态和参考材料。历史 prompt 与被推翻的
实现方案从工作树删除，需要时从 Git 历史恢复。

## 权威顺序

1. [map/index.md](map/index.md)：唯一构建状态源，决定现在能执行哪条 edge。
2. [build_phases/README.md](build_phases/README.md)：当前 MVP 的阶段合同入口。
3. [GOAL.md](GOAL.md)：长期愿景、非目标和 M3/M4 闸门。
4. [CONTEXT.md](../CONTEXT.md)：领域词汇。
5. [HANDOFF.md](../HANDOFF.md)：跨会话决策与偏差，不复制 map 进度。

发生冲突时，以实际仓库制品和 `map/index.md` 为准。

## 当前状态

- 当前 MVP 路线：N15 → N16 → N17。
- N15 已由 Agent 交付，等待 Human Owner 按 waypoint acceptance 确认。
- N15 验证后，E21 才会生成三份文件工作流 prompt：合同准备、Example_Project
  有界执行、无 transcript 接管。
- `Example_Project` 是 smoke test；通过后，`circle_packing` 才是第一个真实研究项目。
- `os-runtime/`、Pi SDK phases、自定义 TUI 和旧 launcher 不在当前工作树或执行路径。

## 可执行 prompts

只有 map 标为 `ready` 的 edge 才能执行。当前保留：

- [E1 — M0 治理](map/prompts/E1-governance-m0.md)
- [E2 — Adapter 契约](map/prompts/E2-adapter-contract-m1.md)
- [E3 — MVP 验收场景](map/prompts/E3-acceptance-scenario.md)

这些治理 edge 与 N15 的产品路线并列存在；实际优先级以 map 和 Human Owner 当前指令为准。

## 执行循环

1. 确认来源 waypoint 已到达且 edge 为 `ready`。
2. 在 fresh Agent 任务中只执行一条 edge。
3. Agent 开始时写 `running`；自检通过后写 `done`，目标 waypoint 写 `delivered`，附证据。
4. Human Owner 亲自运行 acceptance；通过后才能写 `human_verdict: pass` 和 `verified`。
5. 验收失败时退回 `ready` / `in-progress`，记录偏差，不伪造完成。

每次交付至少运行 prompt 指定检查、`git diff --check` 和仓库根目录 `./verify.sh`。

## 历史恢复

已删除且曾被 Git 跟踪的 launcher、纯 session、embedded SDK、自定义 TUI prompts
和 proposed 报告只用于解释旧决策，不应占用当前上下文。需要审计时使用：

```bash
git log --oneline -- os-build/
git show <commit>:<path>
```

Dead waypoint、edge、post-mortem 和关键验证事实继续保留在
[map/index.md](map/index.md)，无需保留每一份历史施工文件。未提交的 Phase 01 教程与
`os-runtime/` 一样不可从 Git 恢复，未来应从参考项目和最新 API 重新学习。
