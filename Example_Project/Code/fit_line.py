"""Smoke-test micro-experiment: fit a line to synthetic data.

Generates y = 2x + 1 + Gaussian noise (fixed seed), fits a degree-1 polynomial
with numpy.polyfit, prints the fitted parameters and MSE, and saves a
scatter+fit plot to ../Figs/linear_fit.png.

Run from this folder:  uv run python fit_line.py
"""

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

SEED = 42
N = 50
TRUE_SLOPE, TRUE_INTERCEPT, NOISE_STD = 2.0, 1.0, 0.5


def main() -> None:
    rng = np.random.default_rng(SEED)
    x = np.linspace(0.0, 5.0, N)
    y = TRUE_SLOPE * x + TRUE_INTERCEPT + rng.normal(0.0, NOISE_STD, N)

    slope, intercept = np.polyfit(x, y, 1)
    y_hat = slope * x + intercept
    mse = float(np.mean((y - y_hat) ** 2))

    print(f"true:   slope={TRUE_SLOPE:.4f} intercept={TRUE_INTERCEPT:.4f}")
    print(f"fitted: slope={slope:.4f} intercept={intercept:.4f} mse={mse:.4f}")

    fig_dir = Path(__file__).resolve().parent.parent / "Figs"
    fig_dir.mkdir(exist_ok=True)
    out = fig_dir / "linear_fit.png"

    plt.figure(figsize=(6, 4))
    plt.scatter(x, y, s=18, alpha=0.7, label="data (synthetic, seed=42)")
    plt.plot(x, y_hat, color="crimson",
             label=f"fit: y = {slope:.3f}x + {intercept:.3f}")
    plt.xlabel("x")
    plt.ylabel("y")
    plt.title("Linear fit on synthetic data")
    plt.legend()
    plt.tight_layout()
    plt.savefig(out, dpi=150)
    print(f"saved: {out}")


if __name__ == "__main__":
    main()
