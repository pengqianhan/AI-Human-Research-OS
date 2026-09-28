#!/bin/bash

# Tiny CPU version of runs/runcpu.sh (the OpenResearch nanochat demo), meant as a first example that
# any Research OS user can run once in a few minutes. Same stages as the demo (tokenizer, base
# pretraining, base eval, SFT, one chat reply) plus the demo's two probes, at the smallest scale that
# still runs every stage. The model is far too small to answer correctly; the point is the pipeline.
# See ../README.md for expected runtime, memory, downloads, the recipe, and the changes from the demo.

# Run from Code/nanochat:
#   bash runs/runcpu_small.sh all          # everything below, in order
#   bash runs/runcpu_small.sh STAGE...     # setup data tok base eval sft chat probe_lr probe_vocab summary

set -euo pipefail

export NANOCHAT_BASE_DIR="$PWD/.cache/nanochat"
export NANOCHAT_COMPILE=0                 # no torch.compile: Inductor on Windows CPU needs MSVC cl.exe on PATH
export ARROW_DEFAULT_MEMORY_POOL=system   # mimalloc keeps freed Arrow memory, inflating peak RAM
export PYTHONUNBUFFERED=1 PYTHONIOENCODING=utf-8
LOG_DIR="../results/logs"
PY=".venv/Scripts/python"; [ -x "$PY" ] || PY=".venv/bin/python"
# run NAME CMD...: tee output to $LOG_DIR/NAME.log and append wall time and peak RSS
run() { local name=$1; shift; mkdir -p "$LOG_DIR"; "$PY" ../tools/run_logged.py "$LOG_DIR/$name.log" -- "$@"; }

# Base pretraining recipe shared by the baseline and both probes (same schedule, compared at every eval)
BASE_ARGS=(
    --depth=1 --aspect-ratio=64 --head-dim=64 --window-pattern=L
    --max-seq-len=256 --device-batch-size=16 --total-batch-size=4096
    --eval-every=25 --eval-tokens=65536
    --core-metric-every=-1 --sample-every=100
    --num-iterations=300
)
TOK_ARGS=(--max-chars=50000000)
PROMPT="What is the capital of France?"

stage() {
    case "$1" in
    setup)
        # --frozen installs exactly uv.lock (a uv older than the lock format would otherwise re-resolve it)
        uv sync --extra cpu --frozen ;;
    data)
        mkdir -p "$NANOCHAT_BASE_DIR"
        run data python -m nanochat.dataset -n 1 ;;   # the minimum: 1 train shard + the pinned val shard (~184 MB)
    tok)
        run tok_train python -m scripts.tok_train "${TOK_ARGS[@]}" --vocab-size=4096
        run tok_eval python -m scripts.tok_eval ;;
    base)
        run base_train python -m scripts.base_train "${BASE_ARGS[@]}" ;;
    eval)
        # bpb + samples only; add "core" to --eval for the CORE tasks (+26 MB download, +160 MB disk)
        run base_eval python -m scripts.base_eval --eval=bpb,sample --device-batch-size=1 --split-tokens=16384 ;;
    sft)
        # --data-keep-every=128 downloads ~1/128 of each SFT split (~14 MB instead of ~980 MB);
        # --init-lr-frac=0.1 because SFT inherits the unscaled pretraining LRs (base applied a 0.088 batch-size factor)
        run chat_sft python -m scripts.chat_sft \
            --load-optimizer=0 --eval-every=10 --eval-tokens=32768 --chatcore-every=-1 \
            --num-iterations=40 --init-lr-frac=0.1 --data-keep-every=128 ;;
    chat)
        run chat_cli python -m scripts.chat_cli -p "$PROMPT" ;;
    probe_lr)
        # Probe 1: Muon matrix learning rate doubled (0.02 -> 0.04)
        run probe_lr2x python -m scripts.base_train "${BASE_ARGS[@]}" --matrix-lr=0.04 --model-tag=probe_lr2x ;;
    probe_vocab)
        # Probe 2: 2,048-token vocabulary (baseline 4,096). A separate base dir keeps the baseline tokenizer;
        # the data shards are hard-linked (copied if the filesystem cannot link).
        export NANOCHAT_BASE_DIR="$PWD/.cache/nanochat_v2048"
        mkdir -p "$NANOCHAT_BASE_DIR/base_data_climbmix"
        for f in .cache/nanochat/base_data_climbmix/*.parquet; do
            dst="$NANOCHAT_BASE_DIR/base_data_climbmix/$(basename "$f")"
            [ -e "$dst" ] || ln "$f" "$dst" 2>/dev/null || cp "$f" "$dst"
        done
        run probe_vocab2048_tok python -m scripts.tok_train "${TOK_ARGS[@]}" --vocab-size=2048
        run probe_vocab2048 python -m scripts.base_train "${BASE_ARGS[@]}" --model-tag=probe_vocab2048 ;;
    summary)
        "$PY" ../tools/summarize_results.py ;;
    baseline)
        for s in setup data tok base eval sft chat; do stage "$s"; done ;;
    all)
        for s in baseline probe_lr probe_vocab summary; do stage "$s"; done ;;
    *)
        echo "unknown stage: $1" >&2; exit 2 ;;
    esac
}

[ $# -ge 1 ] || { echo "usage: bash runs/runcpu_small.sh all | STAGE..." >&2; exit 2; }
for s in "$@"; do stage "$s"; done
