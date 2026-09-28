"""Multi-seed stability analysis of the line fit in fit_line.py.

Repeats the fit_line.py experiment (y = 2x + 1 + Gaussian noise, same N, x
range, and noise std) for seeds 0-19, prints the fitted slope, intercept, and
MSE per seed plus their mean and standard deviation across seeds, and saves a
per-seed plot to ../Figs/multi_seed_stability.png.

Run from this folder:  uv run python multi_seed.py
"""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from fit_line import N, NOISE_STD, TRUE_INTERCEPT, TRUE_SLOPE

SEEDS = range(20)


def fit_seed(seed: int) -> tuple[float, float, float]:
    rng = np.random.default_rng(seed)
    x = np.linspace(0.0, 5.0, N)
    y = TRUE_SLOPE * x + TRUE_INTERCEPT + rng.normal(0.0, NOISE_STD, N)

    slope, intercept = np.polyfit(x, y, 1)
    mse = float(np.mean((y - (slope * x + intercept)) ** 2))
    return float(slope), float(intercept), mse


def main() -> None:
    seeds = np.array(list(SEEDS))
    results = np.array([fit_seed(int(s)) for s in seeds])

    for s, (slope, intercept, mse) in zip(seeds, results):
        print(f"seed={s:2d} slope={slope:.4f} intercept={intercept:.4f} mse={mse:.4f}")

    # Population std (ddof=0) across seeds.
    mean, std = results.mean(axis=0), results.std(axis=0)
    names = ("slope", "intercept", "mse")
    print(f"summary over {len(seeds)} seeds (mean +/- std, ddof=0):")
    for name, m, sd in zip(names, mean, std):
        print(f"  {name:9s} mean={m:.4f} std={sd:.4f}")

    fig_dir = Path(__file__).resolve().parent.parent / "Figs"
    fig_dir.mkdir(exist_ok=True)
    out = fig_dir / "multi_seed_stability.png"

    truths = (TRUE_SLOPE, TRUE_INTERCEPT, NOISE_STD**2)
    truth_labels = ("true slope", "true intercept", "noise variance")
    fig, axes = plt.subplots(3, 1, figsize=(8, 7), sharex=True)
    for i, ax in enumerate(axes):
        ax.plot(seeds, results[:, i], "o", ms=5, label="per-seed estimate")
        ax.axhline(mean[i], color="crimson", label=f"mean = {mean[i]:.4f}")
        ax.axhspan(mean[i] - std[i], mean[i] + std[i], color="crimson",
                   alpha=0.12, label=f"± std ({std[i]:.4f})")
        ax.axhline(truths[i], color="gray", ls="--", label=truth_labels[i])
        ax.set_ylabel(names[i])
        ax.legend(fontsize=7, loc="upper left", bbox_to_anchor=(1.01, 1.0))
    axes[-1].set_xlabel("seed")
    axes[-1].set_xticks(seeds)
    fig.suptitle(f"Line-fit stability over seeds 0-{seeds[-1]} (N={N})")
    fig.tight_layout()
    fig.savefig(out, dpi=150)
    print(f"saved: {out}")


if __name__ == "__main__":
    main()
