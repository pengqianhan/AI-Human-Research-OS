# Code: nanochat CPU example

The OpenResearch default demo, Andrej Karpathy's nanochat, shrunk until every
stage runs on a laptop-class CPU in a few minutes. It is a first example that
any Research OS user can run once, **not a research result**. The model has
0.84M parameters and cannot answer questions; its chat reply is expected to be
nonsense. Success means every stage completes and validation bits per byte
(bpb) falls during pretraining.

## What to expect

Measured on 2026-09-26 on Windows 11 with an Intel i7-12700 (12 cores, 20
threads), 32 GB RAM, CPU only. The run started with an empty data cache but an
existing `uv` package cache.

| | Whole example (`all`) | Baseline stages only |
|---|---|---|
| Wall-clock time | **2 min 57 s** | 1 min 29 s (+ `uv sync`) |
| Peak RAM per process | 1.0 GB (data download); training ≤ 0.94 GB | same |
| Data downloads | ~0.20 GB: 2 pretraining shards (~184 MB) + ~14 MB of SFT data | same |
| Python packages (first setup only) | ~0.2 GB of wheels, mostly the 106 MB CPU `torch` wheel | same |
| Disk inside the project | ~0.9 GB: `.venv` 0.68 GB, `.cache` ~0.21 GB | same |

Slower machines should scale roughly with single-socket CPU speed; nothing
needs a GPU.

## Setup

Prerequisites: [`uv`](https://docs.astral.sh/uv/) and `bash`. On Windows, use
Git Bash's `bash`. Nothing is installed system-wide. `uv` creates
`Code/nanochat/.venv`, and all data, checkpoints, and logs stay under
`Code/nanochat/.cache/` and `Code/results/`.

## Run it (one command)

```bash
cd Code/nanochat
bash runs/runcpu_small.sh all
```

`all` runs these stages in order. Each stage is also a separate command,
e.g. `bash runs/runcpu_small.sh base eval`:

| Stage | What it runs ([runs/runcpu_small.sh](nanochat/runs/runcpu_small.sh)) | Measured |
|---|---|---|
| `setup` | `uv sync --extra cpu --frozen` | < 1 s with a warm uv cache |
| `data` | `python -m nanochat.dataset -n 1`: 1 train shard + the pinned val shard | 13.2 s |
| `tok` | `tok_train --max-chars=50000000 --vocab-size=4096`, then `tok_eval` | 3.2 s + 3.5 s |
| `base` | `base_train --depth=1 --aspect-ratio=64 --head-dim=64 --window-pattern=L --max-seq-len=256 --device-batch-size=16 --total-batch-size=4096 --eval-every=25 --eval-tokens=65536 --core-metric-every=-1 --sample-every=100 --num-iterations=300` | 42.3 s |
| `eval` | `base_eval --eval=bpb,sample --device-batch-size=1 --split-tokens=16384` | 3.7 s |
| `sft` | `chat_sft --load-optimizer=0 --eval-every=10 --eval-tokens=32768 --chatcore-every=-1 --num-iterations=40 --init-lr-frac=0.1 --data-keep-every=128` (downloads its data) | 20.5 s |
| `chat` | `chat_cli -p "What is the capital of France?"` | 2.7 s |
| `probe_lr` | `base` recipe with `--matrix-lr=0.04 --model-tag=probe_lr2x` | 47.1 s |
| `probe_vocab` | 2,048-token tokenizer in `.cache/nanochat_v2048`, then the `base` recipe with `--model-tag=probe_vocab2048` | 3.3 s + 35.1 s |
| `summary` | [tools/summarize_results.py](tools/summarize_results.py) writes tables and figures | < 1 s |

Every stage runs through [tools/run_logged.py](tools/run_logged.py). It tees
output to `Code/results/logs/<stage>.log` and appends exit code, wall time, and
peak resident memory. The runner sets `NANOCHAT_BASE_DIR`,
`NANOCHAT_COMPILE=0`, and `ARROW_DEFAULT_MEMORY_POOL=system`. To run a script by
hand, set the same variables.

## Provenance

- Source: [alphaXiv/OpenResearch](https://github.com/alphaXiv/OpenResearch) at
  commit `27cb342` (`27cb34200fe82957d33d37c143adf086408281d0`), path
  `demo/nanochat`. `base/` was copied into [nanochat/](nanochat/), then the
  demo's `experiment/` overrides were applied: `runs/runcpu.sh`,
  `scripts/chat_sft.py`, `scripts/chat_cli.py`, and `.gitignore`.
- nanochat is by Andrej Karpathy, MIT license. [nanochat/LICENSE](nanochat/LICENSE)
  and [nanochat/README.md](nanochat/README.md) are kept unchanged.
- The demo's reference run (depth 6, 73.5M parameters, 5,000 base and 1,500 SFT
  steps on an Apple M3 Max) is in
  [../Baselines/openresearch-demo/](../Baselines/openresearch-demo/). Its base
  val bpb was 1.940739 at step 100, 1.762539 at step 200, and 1.165758 final.

## Changes from the demo

### Recipe

| Knob | Demo (`runs/runcpu.sh`) | This example | Why |
|---|---|---|---|
| Pretraining data | 8 shards (~0.8 GB) | 1 train + 1 val shard (~184 MB) | the fewest the dataset script allows |
| Tokenizer | 32,768 vocab, 2B chars | 4,096 vocab, 50M chars | embeddings and the LM head dominate a tiny model; 3.2 s to train |
| Model | depth 6, width 384, 73.5M params | depth 1, width 64 (1 head of 64), 0.84M params | smallest config that runs; 80 ms per 4,096-token step |
| Context / batch | 512 / 32 × 512 = 16,384 tokens | 256 / 16 × 256 = 4,096 tokens | throughput is flat above this batch on CPU |
| Base steps | 5,000 (81.9M tokens, 3.5 tokens per scaling param) | 300 (1.23M tokens, 3.95 tokens per scaling param) | similar data:param ratio, 42 s |
| Val eval | every 100 steps, 524,288 tokens | every 25 steps, 65,536 tokens | more curve points, low cost |
| Base eval | CORE (16 per task) + bpb + samples | bpb + samples (`--eval=bpb,sample`) | CORE needs a 26 MB zip that unpacks to 160 MB and is near chance for tiny models (CORE 0.0018 in a 30-step d2 check). Add `core` to re-enable |
| SFT data | full SmolTalk, MMLU, GSM8K (~980 MB) | ~1/128 of every split (~14 MB), same mixture ratios | download size and RAM (full SmolTalk alone is ~3 GB in RAM) |
| SFT steps / LR | 1,500 steps, `--init-lr-frac` 0.8 | 40 steps, `--init-lr-frac=0.1` | at 0.8, SFT val bpb spiked from 2.29 to 2.63 and ended above its start (see the SFT learning-rate note below); at 0.1 it falls steadily |
| SFT eval | every 200, 524,288 tokens | every 10, 32,768 tokens | fits the 40-step run |
| Probes | 200-step probes against a 5,000-step baseline | full 300-step runs, compared at every eval step | a full run costs only ~40 s |
| Vocab probe | 32,768 → 8,192 | 4,096 → 2,048 | same direction (smaller vocabulary) at this scale |

SFT learning rate: `chat_sft` inherits the pretraining *arguments*
(matrix lr 0.02, embedding lr 0.3). `base_train` scaled those by
√(4096/524288) = 0.088 for the small batch, so SFT at `--init-lr-frac=0.8`
starts about 9× hotter than pretraining ended. `0.1` roughly cancels that.

### Code

`git diff --no-index <source>/base nanochat` (or `<source>/experiment` for the
overridden files) shows only these changes. Everything else, including
`uv.lock`, is byte-identical to the source.

| File | Change | Why |
|---|---|---|
| `nanochat/common.py` | adds `COMPILE_ENABLED` and `maybe_compile()`. `torch.compile` runs only when `NANOCHAT_COMPILE=1`, which defaults to on with CUDA and off otherwise | Inductor on Windows CPU needs MSVC `cl.exe` on `PATH` (not available here). Eager mode needs no compiler |
| `nanochat/optim.py`, `scripts/base_train.py`, `scripts/chat_sft.py` | `torch.compile(...)` → `maybe_compile(...)` | same switch |
| `tasks/common.py` | new `KEEP_EVERY` setting (default 1 = unchanged). When > 1, each parquet shard is read over HTTP range requests; only evenly spaced row groups are fetched, then thinned to ceil(rows/k) rows, and the result is cached in `task_data/.../<split>_keep<k>/` | download ~1/k of the SFT data instead of ~980 MB, and never hold the full table in RAM |
| `scripts/chat_sft.py` | `--data-keep-every` flag (sets `KEEP_EVERY`), with val-mixture caps scaled by 1/k; downloads the six splits in parallel before building the mixtures | the same mixture ratios at 1/k size. Subsampled downloads are latency-bound (~2 s per request on the HF CDN) |
| `nanochat/core_eval.py` | when a model has no `max_seq_len`, crop prompts to the rotary cache length | with a small vocabulary, 10-shot SQuAD prompts (2,745 tokens) exceeded the cache (2,560) and crashed CORE. Only used if CORE is re-enabled |
| `runs/runcpu_small.sh` (new) | the staged runner above | one command, each stage under 1 min |

Outside the port: [tools/run_logged.py](tools/run_logged.py) (stage logging),
[tools/summarize_results.py](tools/summarize_results.py) (tables and SVG figures,
standard library only).

## Results

All numbers come from `bash runs/runcpu_small.sh all` on 2026-09-26 and are
in [results/summary.json](results/summary.json),
[results/training_metrics.csv](results/training_metrics.csv), both tracked.
The raw stage logs in `results/logs/` are regenerated by each run and are not
tracked (the repository ignores `*.log`). Two fresh runs gave identical val bpb to 6
decimals: training is deterministic on this machine.

![Baseline training curves](../Figs/baseline_training_curves.svg)

**Baseline base pretraining (val bpb on 65,536 val tokens):**

| Step | 0 | 25 | 50 | 100 | 150 | 200 | 250 | 300 |
|---|---|---|---|---|---|---|---|---|
| val bpb | 3.4564 | 3.2644 | 2.8124 | 2.5360 | 2.4136 | 2.3436 | 2.3053 | **2.2882** |

- Base eval (`base_eval`, 16,384 tokens per split): train bpb 2.2947, val bpb 2.3622.
- SFT val bpb: 2.2892 (step 0) → 2.2211 (10) → 2.1877 (20) → 2.1551 (30) → **2.1456** (39).
- Chat reply from the SFT checkpoint to "What is the capital of France?"
  (whitespace runs collapsed; the raw reply is `chat_reply` in
[results/summary.json](results/summary.json)):
  `ATedning the date that is - min B`. This is expected nonsense for a
  0.84M-parameter model. The demo's 73.5M model answered "Paris" and then
  looped.

**Probes (same 300-step schedule; Δ = probe − baseline; lower bpb is better):**

![Probe comparison](../Figs/probe_comparison.svg)

| Step | Baseline | Probe 1: matrix lr 0.04 | Δ | Probe 2: vocab 2,048 | Δ |
|---|---|---|---|---|---|
| 0 | 3.4564 | 3.4564 | 0.0000 | 3.6833 | +0.2269 |
| 50 | 2.8124 | 2.8155 | +0.0031 | 2.9829 | +0.1704 |
| 100 | 2.5360 | 2.5358 | −0.0002 | 2.6756 | +0.1396 |
| 200 | 2.3436 | 2.3337 | −0.0100 | 2.4474 | +0.1038 |
| 300 | 2.2882 | 2.2761 | −0.0121 | 2.3840 | +0.0958 |

- Probe 1: doubling the Muon matrix learning rate is neutral through step 100,
  then slightly better; by step 300 it is 0.012 bpb lower.
- Probe 2: the 2,048-token vocabulary is worse at every step. The gap narrows
  from 0.23 to 0.10 bpb but does not close in 300 steps.
- The demo's probe results are not part of the copied evidence, so whether
  these directions match the demo's is not checked here.

**Wall-clock per stage and peak RAM** (final run): data 13.2 s / 1.0 GB,
tokenizer 3.2 s / 0.28 GB, tok_eval 3.5 s / 0.35 GB, base 42.3 s / 0.87 GB,
base eval 3.7 s / 0.35 GB, SFT 20.5 s / 0.68 GB, chat 2.7 s / 0.25 GB,
probe 1 47.1 s / 0.87 GB, probe 2 3.3 s + 35.1 s / 0.94 GB.

## Scaling notes: making it bigger

The knobs are in `BASE_ARGS` and `TOK_ARGS` in
[runs/runcpu_small.sh](nanochat/runs/runcpu_small.sh). Width = `--depth` ×
`--aspect-ratio` (64), rounded up to a multiple of `--head-dim`. These costs
were measured on the same machine, eager mode, 12 threads:

| Config (vocab 8,192 unless noted) | Params | Throughput | Notes |
|---|---|---|---|
| d1, width 64, vocab 4,096, T 256 (this example) | 0.84M | ~52k tok/s (80 ms / 4,096-token step) | vocab 2,048: 0.44M params, ~80k tok/s |
| d2, width 128, T 256 / T 512 | 3.54M | ~15.5k tok/s (profiler); 470 ms per 8,192-token step in `base_train` at T 512 | base_train peak RAM 1.9 GB. The earlier plan was 800 steps (~8 min) + 500 SFT steps (~5 min) |
| d3, width 192 | 7.62M | ~8.9k tok/s | |
| d4, width 256 (vocab 4,096) | 11.5M (7.3M) | ~6.4k tok/s (8.1k) | 8 or 20 threads were slower than the default 12 |
| d6, width 384 (the demo's model) | 26.4M at vocab 8,192 (73.5M at 32,768) | ~2.4k tok/s | the demo's 5,000 × 16,384 tokens would take over 9 h here |

- SFT memory: loading the full SmolTalk train split takes ~3 GB of RAM; the full
  SFT process peaked at 5.1–5.5 GB. Use `--data-keep-every` > 1 on machines
  with little free RAM, and keep `ARROW_DEFAULT_MEMORY_POOL=system` (the default
  mimalloc pool held ~2.3 GB of freed Arrow memory).
- CORE eval (`--eval=core,bpb,sample --max-per-task=16`) took ~26 s at d2 plus
  a one-time 26 MB download.
- Keep `--total-batch-size` a multiple of `--device-batch-size` × `--max-seq-len`.
  `base_train` rescales learning rates by √(batch/524,288); `chat_sft` does not
  (see the SFT learning-rate note above).
- On a machine with a working C++ compiler, try `NANOCHAT_COMPILE=1`. It is
  untested here.

## Data

Data is downloaded on demand into `Code/nanochat/.cache/nanochat/`
(`NANOCHAT_BASE_DIR`), not [Datasets/](Datasets/). That keeps nanochat's own
layout, and none of it is tracked. License terms were not checked in this
session; see each dataset card.

| Data | Source | Used |
|---|---|---|
| Pretraining text | [karpathy/climbmix-400b-shuffle](https://huggingface.co/datasets/karpathy/climbmix-400b-shuffle) | `shard_00000` (train), `shard_06542` (val) |
| SFT conversations | [HuggingFaceTB/smol-smoltalk](https://huggingface.co/datasets/HuggingFaceTB/smol-smoltalk) | 3,600 of 460K train rows, 190 of 24K test rows |
| SFT multiple choice | [cais/mmlu](https://huggingface.co/datasets/cais/mmlu) `all` | 781 of 99,842 `auxiliary_train` rows (×3 in the mixture), 110 test rows |
| SFT math | [openai/gsm8k](https://huggingface.co/datasets/openai/gsm8k) `main` | 59 of 7,473 train rows (×4), 11 test rows |

## Known limitations

- This is a demonstration of the pipeline, not a model. The chat reply is
  nonsense, and base-eval and probe numbers say nothing about larger models.
- Probes use one seed. Runs are deterministic, so the deltas are not
  run-to-run noise, but seed-to-seed variance was not measured. Probe 1's
  −0.012 bpb is small and may not be meaningful.
- Probe 2 changes more than the vocabulary. The 2,048-vocab model has fewer
  parameters (0.44M vs 0.84M), and at a fixed 4,096 tokens per step it sees
  fewer bytes of text per step. bpb normalizes the metric, not the training
  budget.
- `base_train`'s automatic weight-decay scaling gives λ = 7.0 at this size
  (from 0.28 at the d12 reference). Training still converges, but this recipe
  is far outside the range the scaling rules were tuned for.
- The SFT data is a subsample of 1/128 of each split. With 256-token contexts,
  the SFT loader skips longer conversations (the demo's override), so the model
  sees mostly short ones.
- Only this Windows machine was tested. On Linux and macOS,
  `runcpu_small.sh` falls back to `.venv/bin/python` and `cp`, but those paths
  have not been run.
- The original `runs/runcpu.sh` is kept as the demo wrote it (it sets
  `UV_CACHE_DIR` inside the repo). It is not used by this example.
