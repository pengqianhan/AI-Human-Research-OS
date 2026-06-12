# 代码说明

本文件说明如何配置环境并运行此文件夹中的实验。按仓库规则
（[INSTRUCTION.md](../../INSTRUCTION.md)），代码、配置或结果发生变化时，
需同时更新本文件与 [README.md](README.md)。

## 环境

- 使用 `uv` 在本文件夹范围内管理。首次：`uv init --bare`（或使用仓库的
  `uv-env` skill），然后 `uv add <packages>`。复现：`uv sync`。

## 运行

- `uv run python fit_line.py` — 对合成数据拟合直线
  （y = 2x + 1 + 噪声，N=50，seed 42），打印拟合斜率/截距/MSE，
  并将图保存到 `../Figs/linear_fit.png`。

## 数据

- 无外部数据集：数据在 `fit_line.py` 内用固定 seed（42）合成。
  [Datasets/](Datasets/) 在本示例中保持为空。

## 当前结果

<!-- 每个数字都必须可复现：注明命令与 commit -->

- `uv run python fit_line.py`（2026-06-12，numpy 2.4.6）：
  拟合斜率 = 2.0452（真值 2.0），拟合截距 = 0.9325（真值 1.0），
  MSE = 0.1402。图：`../Figs/linear_fit.png`；结果写入 `../main.tex`。

## 已知局限

- 仅为 Research OS 冒烟测试的单次合成数据演示——无基线、无真实数据，
  不构成研究结论。
