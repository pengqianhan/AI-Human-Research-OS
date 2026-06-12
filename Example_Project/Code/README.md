# Code

How to set up and run the experiments in this folder. Per repository rules
([INSTRUCTION.md](../../INSTRUCTION.md)), update this file — and
[README_zh.md](README_zh.md) — whenever code, configuration, or results change.

## Environment

- Managed with `uv` at this folder's scope. First time: `uv init --bare` (or the
  repo's `uv-env` skill), then `uv add <packages>`. Reproduce: `uv sync`.

## Run

- `uv run python fit_line.py` — fits a line to synthetic data
  (y = 2x + 1 + noise, N=50, seed 42), prints fitted slope/intercept/MSE, and
  saves the plot to `../Figs/linear_fit.png`.

## Data

- No external datasets: data is synthesized inside `fit_line.py` with a fixed
  seed (42). [Datasets/](Datasets/) stays empty in this example.

## Current Results

<!-- every number must be reproducible: state the command and commit -->

- `uv run python fit_line.py` (2026-06-12, numpy 2.4.6):
  fitted slope = 2.0452 (true 2.0), fitted intercept = 0.9325 (true 1.0),
  MSE = 0.1402. Figure: `../Figs/linear_fit.png`; reported in `../main.tex`.

## Known Limitations

- Synthetic single-run demo for the Research OS smoke test — no baselines, no
  real data, not a research result.
