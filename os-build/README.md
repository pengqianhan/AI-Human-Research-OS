# Research OS 构建执行手册

本目录只保留长期目标、本手册和参考材料。路线图 `map/`、执行合同槽
`build_phases/`、历史 prompt 与被推翻的实现方案都已从工作树删除，需要时从 Git
历史恢复。

## 权威顺序

1. [HANDOFF.md](../HANDOFF.md) Active Work：当前施工状态、已完成项与待 Human Owner
   决定的事项；Decisions 保存理由与撤销路径。
2. [GOAL.md](GOAL.md)：长期愿景、里程碑、非目标和 M3/M4 闸门。
3. [CONTEXT.md](../CONTEXT.md)：领域词汇。
4. [docs/adr/](../docs/adr/)：被采纳与被取代的架构决策。

发生冲突时，以实际仓库制品和 HANDOFF Decisions 为准。

## 当前状态（2026-09-23）

- 已完成：安装器泛化（M3，2026-07-22）；`research-project-manager`（2026-09-23，
  Human Owner 尚未运行其验收）；Paper_VAE 暂时删除已记录（D10）。
- 治理债务（M0）：两项均已满足（Paper_VAE 见 D10；HANDOFF D4 里关于 `OS_INTRO.html`
  的陈旧表述已于 2026-09-23 修正）。
- 未开始：adapter 契约成文（M1）；`circle_packing` 项目（清单在 HANDOFF Active Work）。
- 停滞待决：Pi Coding Agent 文件工作流 MVP（ADR-0002，2026-07-19 选定）自 7 月起等待
  Human Owner 验证，三份工作流 prompt 从未编译；是否继续由 Human Owner 决定，验收
  标准见 GOAL.md M2。
- `os-runtime/`、Pi SDK phases、自定义 TUI 和旧 launcher 不在当前工作树或执行路径。

## 执行纪律

1. 一次只做一件有界的事，开始前确认它在 HANDOFF 或 GOAL 里有授权来源。
2. 交付时至少运行相关检查、`git diff --check` 和仓库根目录 `./verify.sh`。
3. Human Owner 亲自运行验收；验收失败时记录偏差，不伪造完成。
4. 会话结束按 `session-handoff` 更新 HANDOFF。

## 历史恢复

```bash
git log --oneline -- os-build/
git show 0f1805c:os-build/map/index.md            # 路线图最后版本：idea ledger、全部 waypoint 与 edge
git show 0f1805c:os-build/build_phases/README.md  # 执行合同槽最后版本
git show <commit>:<path>
```

未提交的 Phase 01 教程与 `os-runtime/` 不可从 Git 恢复，未来应从参考项目和最新 API
重新学习。
