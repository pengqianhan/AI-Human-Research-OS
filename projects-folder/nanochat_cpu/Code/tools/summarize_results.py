"""Parse the stage logs in Code/results/logs/ into tables and SVG figures (standard library only).

Run from Code/nanochat after the stages finish (the runner's "summary" stage does this):
    .venv/Scripts/python ../tools/summarize_results.py

Writes:
    Code/results/training_metrics.csv   per-step train loss, val bpb, throughput for every training run
    Code/results/summary.json           per-stage exit code, wall time, peak RAM; headline metrics; probe deltas
    Figs/baseline_training_curves.svg   base train loss, base val bpb, SFT val bpb
    Figs/probe_comparison.svg           val bpb of the baseline and both probes at matched steps
"""
import csv
import json
import math
import re
from html import escape
from pathlib import Path

CODE = Path(__file__).resolve().parents[1]
LOGS = CODE / "results" / "logs"
FIGS = CODE.parent / "Figs"

# log name -> (run label, phase) for training runs
RUNS = {
    "base_train": ("baseline", "base"),
    "chat_sft": ("baseline", "sft"),
    "probe_lr2x": ("probe_lr2x", "base"),
    "probe_vocab2048": ("probe_vocab2048", "base"),
}
BASELINE_STAGES = ["data", "tok_train", "tok_eval", "base_train", "base_eval", "chat_sft", "chat_cli"]
PROBE_STAGES = ["probe_lr2x", "probe_vocab2048_tok", "probe_vocab2048"]
LABELS = {
    "baseline": "baseline (matrix lr 0.02, vocab 4096)",
    "probe_lr2x": "probe 1: matrix lr 0.04",
    "probe_vocab2048": "probe 2: vocab 2048",
}
SHORT = {"baseline": "baseline", "probe_lr2x": "lr x2", "probe_vocab2048": "vocab 2048"}
# Reference default palette (dataviz skill): categorical slots 1-3 in fixed order, text inks, recessive grid
COLORS = {"baseline": "#2a78d6", "probe_lr2x": "#eb6834", "probe_vocab2048": "#1baf7a"}
INK, INK2, MUTED, GRID, SURFACE = "#0b0b0b", "#52514e", "#898781", "#e6e5e0", "#fcfcfb"

TRAIN_RE = re.compile(r"^step (\d+)\S* .*?\| loss: ([\d.]+) .*?\| dt: ([\d.]+)ms \| tok/sec: ([\d,]+)")
VAL_RE = re.compile(r"^Step (\d+) \| Validation bpb: ([\d.]+)")
SUMMARY_RE = re.compile(r"^\[run_logged\] exit=(-?\d+) wall_s=([\d.]+) peak_rss_mb=(\d+)")

def read(name):
    path = LOGS / f"{name}.log"
    return path.read_text(encoding="utf-8").splitlines() if path.exists() else None

def parse_run(lines):
    rows = {}
    for line in lines:
        if m := TRAIN_RE.match(line):
            rows.setdefault(int(m[1]), {}).update(train_loss=float(m[2]), dt_ms=float(m[3]), tok_per_sec=int(m[4].replace(",", "")))
        elif m := VAL_RE.match(line):
            rows.setdefault(int(m[1]), {})["val_bpb"] = float(m[2])
    return rows

def curve(rows, key):
    return sorted((s, r[key]) for s, r in rows.items() if key in r)

# ---------------------------------------------------------------------------- SVG
def nice_ticks(lo, hi, n=5):
    span = hi - lo or 1.0
    step = 10 ** math.floor(math.log10(span / n))
    step *= min((m for m in (1, 2, 2.5, 5, 10) if span / (step * m) <= n), default=10)
    first = math.ceil(lo / step) * step
    return [round(first + i * step, 10) for i in range(int((hi - first) / step + 1e-9) + 1)]

def panel_svg(x0, y0, w, h, panel):
    """One line chart: title, axes with ticks, one line per series, end-of-line value labels."""
    pts = [p for s in panel["series"] for p in s["points"]]
    xmin, xmax = 0, max(x for x, _ in pts)
    ylo, yhi = min(y for _, y in pts), max(y for _, y in pts)
    pad = (yhi - ylo) * 0.08 or 0.1
    ylo, yhi = ylo - pad, yhi + pad
    L, R, T, B = 52, 52 + 60 * any("short" in s for s in panel["series"]), 30, 38  # plot margins inside the panel
    pw, ph = w - L - R, h - T - B
    X = lambda x: x0 + L + (x - xmin) / (xmax - xmin or 1) * pw
    Y = lambda y: y0 + T + (yhi - y) / (yhi - ylo) * ph
    out = [f'<text x="{x0 + L}" y="{y0 + 16}" font-size="13" font-weight="600" fill="{INK}">{escape(panel["title"])}</text>']
    for t in nice_ticks(ylo, yhi):
        out.append(f'<line x1="{x0 + L}" x2="{x0 + L + pw}" y1="{Y(t):.1f}" y2="{Y(t):.1f}" stroke="{GRID}" stroke-width="1"/>')
        out.append(f'<text x="{x0 + L - 6}" y="{Y(t) + 4:.1f}" font-size="11" fill="{MUTED}" text-anchor="end">{t:g}</text>')
    for t in nice_ticks(xmin, xmax):
        out.append(f'<text x="{X(t):.1f}" y="{y0 + T + ph + 16}" font-size="11" fill="{MUTED}" text-anchor="middle">{t:g}</text>')
    out.append(f'<line x1="{x0 + L}" x2="{x0 + L + pw}" y1="{y0 + T + ph}" y2="{y0 + T + ph}" stroke="{MUTED}" stroke-width="1"/>')
    out.append(f'<text x="{x0 + L + pw / 2:.1f}" y="{y0 + h - 6}" font-size="11" fill="{INK2}" text-anchor="middle">{escape(panel["xlabel"])}</text>')
    out.append(f'<text transform="translate({x0 + 13},{y0 + T + ph / 2:.1f}) rotate(-90)" font-size="11" fill="{INK2}" text-anchor="middle">{escape(panel["ylabel"])}</text>')
    for s in panel["series"]:
        path = " ".join(f"{'M' if i == 0 else 'L'}{X(x):.1f},{Y(y):.1f}" for i, (x, y) in enumerate(s["points"]))
        out.append(f'<path d="{path}" fill="none" stroke="{s["color"]}" stroke-width="2" stroke-linejoin="round"><title>{escape(s["label"])}</title></path>')
        if s.get("markers"):
            for x, y in s["points"]:
                out.append(f'<circle cx="{X(x):.1f}" cy="{Y(y):.1f}" r="4" fill="{s["color"]}" stroke="{SURFACE}" stroke-width="2"><title>{escape(s["label"])}: step {x}, {y:.4f}</title></circle>')
    # end labels in text ink, nudged apart when they would overlap
    ends = sorted(((Y(s["points"][-1][1]), f"{s['points'][-1][1]:.3f} {s.get('short', '')}".strip()) for s in panel["series"]), key=lambda e: e[0])
    last = -1e9
    for ypix, text in ends:
        ypix = max(ypix, last + 13)
        last = ypix
        out.append(f'<text x="{X(xmax) + 6:.1f}" y="{ypix + 4:.1f}" font-size="11" fill="{INK}">{escape(text)}</text>')
    return out

def write_svg(path, panels, title, legend=None, panel_w=330, panel_h=260):
    legend_h = 22 * len(legend) + 6 if legend else 0
    width, height = panel_w * len(panels) + 20, panel_h + 44 + legend_h
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">',
           f'<rect width="100%" height="100%" fill="{SURFACE}"/>',
           f'<text x="12" y="24" font-size="15" font-weight="600" fill="{INK}">{escape(title)}</text>']
    for i, p in enumerate(panels):
        out += panel_svg(10 + i * panel_w, 36, panel_w, panel_h, p)
    for i, (label, color) in enumerate(legend or []):
        y = 36 + panel_h + 14 + 22 * i
        out.append(f'<line x1="22" x2="46" y1="{y}" y2="{y}" stroke="{color}" stroke-width="2"/><circle cx="34" cy="{y}" r="4" fill="{color}"/>')
        out.append(f'<text x="54" y="{y + 4}" font-size="12" fill="{INK}">{escape(label)}</text>')
    out.append("</svg>")
    path.write_text("\n".join(out) + "\n", encoding="utf-8")

# ---------------------------------------------------------------------------- main
def main():
    runs, stages = {}, {}
    for name in BASELINE_STAGES + PROBE_STAGES:
        lines = read(name)
        if lines is None:
            continue
        for line in lines:
            if m := SUMMARY_RE.match(line):
                stages[name] = {"exit": int(m[1]), "wall_s": float(m[2]), "peak_rss_mb": int(m[3])}
        if name in RUNS:
            runs[name] = parse_run(lines)

    with open(CODE / "results" / "training_metrics.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["run", "phase", "step", "train_loss", "val_bpb", "tok_per_sec", "dt_ms"])
        for name, rows in runs.items():
            run, phase = RUNS[name]
            for step in sorted(rows):
                r = rows[step]
                w.writerow([run, phase, step, r.get("train_loss", ""), r.get("val_bpb", ""), r.get("tok_per_sec", ""), r.get("dt_ms", "")])

    summary = {
        "stages": stages,
        "baseline_wall_s_sum": round(sum(v["wall_s"] for k, v in stages.items() if k in BASELINE_STAGES), 1),
        "probes_wall_s_sum": round(sum(v["wall_s"] for k, v in stages.items() if k in PROBE_STAGES), 1),
    }
    if "base_train" in runs:
        summary["base_val_bpb"] = {s: v for s, v in curve(runs["base_train"], "val_bpb")}
    if "chat_sft" in runs:
        summary["sft_val_bpb"] = {s: v for s, v in curve(runs["chat_sft"], "val_bpb")}
    for line in read("base_eval") or []:
        if m := re.search(r"(train|val) bpb: ([\d.]+)", line):
            summary[f"base_eval_{m[1]}_bpb"] = float(m[2])
    chat = read("chat_cli")
    if chat:
        reply = [l for l in chat if l.startswith("Assistant:")]
        summary["chat_reply"] = reply[-1][len("Assistant:"):].strip() if reply else None
    base_val = dict(curve(runs.get("base_train", {}), "val_bpb"))
    summary["probes_val_bpb"] = {
        name: {s: {"probe": v, "baseline": base_val.get(s), "delta": None if s not in base_val else round(v - base_val[s], 6)}
               for s, v in curve(runs[name], "val_bpb")}
        for name in ("probe_lr2x", "probe_vocab2048") if name in runs
    }
    (CODE / "results" / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")

    FIGS.mkdir(exist_ok=True)
    if "base_train" in runs:
        base_color = COLORS["baseline"]
        panels = [
            {"title": "Base pretraining: train loss (EMA)", "xlabel": "step", "ylabel": "loss (nats/token)",
             "series": [{"label": "train loss", "color": base_color, "points": curve(runs["base_train"], "train_loss")}]},
            {"title": "Base pretraining: validation bpb", "xlabel": "step", "ylabel": "bits per byte",
             "series": [{"label": "val bpb", "color": base_color, "points": curve(runs["base_train"], "val_bpb"), "markers": True}]},
        ]
        if "chat_sft" in runs:
            panels.append({"title": "SFT: validation bpb", "xlabel": "SFT step", "ylabel": "bits per byte",
                           "series": [{"label": "SFT val bpb", "color": base_color, "points": curve(runs["chat_sft"], "val_bpb"), "markers": True}]})
        write_svg(FIGS / "baseline_training_curves.svg", panels, "nanochat CPU example: d1, width 64, 0.84M params, vocab 4096")
    if summary["probes_val_bpb"] and "base_train" in runs:
        names = ["baseline"] + list(summary["probes_val_bpb"])
        series = [{"label": LABELS[n], "short": SHORT[n], "color": COLORS[n], "markers": True,
                   "points": curve(runs["base_train" if n == "baseline" else n], "val_bpb")} for n in names]
        panel = {"title": "Validation bpb at matched steps (same 300-step schedule)", "xlabel": "step", "ylabel": "bits per byte", "series": series}
        write_svg(FIGS / "probe_comparison.svg", [panel], "Probes vs baseline", legend=[(LABELS[n], COLORS[n]) for n in names], panel_w=700, panel_h=340)

    print(json.dumps({k: v for k, v in summary.items() if k != "stages"}, indent=2))

if __name__ == "__main__":
    main()
