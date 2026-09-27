# Code

How to set up and run the experiments in this folder. Per repository rules
([AGENTS.md](../../../AGENTS.md)), update this file — and
[README_zh.md](README_zh.md) — whenever code, configuration, or results change.

## Environment

- Managed with `uv` at this folder's scope. First time: `uv init --bare` (or the
  repo's `uv-env` skill), then `uv add <packages>`. Reproduce: `uv sync`.

## Run

- `uv run python fit_line.py` — fits a line to synthetic data
  (y = 2x + 1 + noise, N=50, seed 42), prints fitted slope/intercept/MSE, and
  saves the plot to `../Figs/linear_fit.png`.
- `uv run python multi_seed.py` — repeats the same fit (constants imported from
  `fit_line.py`) for seeds 0-19, prints one line per seed and the mean and std
  (ddof=0) of slope, intercept, and MSE, and saves the per-seed plot to
  `../Figs/multi_seed_stability.png`.

## Data

- No external datasets: data is synthesized inside `fit_line.py` (seed 42) and
  `multi_seed.py` (seeds 0-19). [Datasets/](Datasets/) stays empty in this example.

## Current Results

<!-- every number must be reproducible: state the command and commit -->

- `uv run python fit_line.py` (2026-06-12, numpy 2.4.6):
  fitted slope = 2.0452 (true 2.0), fitted intercept = 0.9325 (true 1.0),
  MSE = 0.1402. Figure: `../Figs/linear_fit.png`; reported in `../paper/main.tex`.
- `uv run python multi_seed.py` (2026-09-26, numpy 2.4.6, uncommitted), mean ± std
  over seeds 0-19: slope = 2.0003 ± 0.0460, intercept = 0.9851 ± 0.1319,
  MSE = 0.2298 ± 0.0478. Figure: `../Figs/multi_seed_stability.png`; not in
  `../paper/main.tex`.

## Known Limitations

- Synthetic demo for the Research OS smoke test — no baselines, no real data,
  not a research result.
- The multi-seed analysis covers only 20 seeds of the same data model; the
  paper still reports the single seed-42 run.
- Seed 42's MSE (0.1402) is below every multi-seed MSE (range 0.1527-0.3078,
  noise variance 0.25), so the single-run MSE is a favourable draw.
