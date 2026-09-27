---
type: Idea
title: "OpenResearch's default nanochat demo, scaled to train on this workstation's CPU"
description: "Rebuild OpenResearch's first-run nanochat project small enough to train end to end on an i7-12700 CPU."
status: promoted
created: 2026-09-26
tags: [nanochat, llm-pretraining, cpu, openresearch-demo]
source: "https://github.com/alphaXiv/OpenResearch/tree/27cb342/demo/nanochat"
project: ../projects-folder/nanochat_cpu/
---

# One-liner

Train OpenResearch's default example, Karpathy's nanochat, end to end on a CPU:
tokenizer, pretraining, SFT, and chat, with the model as small as needed.

# Context / Source

OpenResearch seeds every new install with a nanochat demo project
(`demo/nanochat`, MIT, at commit `27cb342`). It has three parts:

- **Baseline.** A depth-6 model (73.5M parameters) runs 5,000 pretraining steps
  and 1,500 SFT steps, about 30 minutes on an Apple M3 Max.
- **Two 200-step probes.** A doubled Muon matrix learning rate, and an
  8,192-token vocabulary.
- **Diagnosis report.** It names insufficient pretraining as the main
  bottleneck.

The Human Owner asked for this example as a Research Project, with the model
made as small as necessary to train on their own computer. That computer has
an i7-12700 CPU, 32 GB of RAM, and a 2 GB Quadro P600 GPU, which is not usable
for this.

# Evidence So Far

Checked on 2026-09-26:

- nanochat's CPU path needs `torch.compile`. On Windows that requires MSVC on
  `PATH`: Build Tools 2022 are installed, but `cl.exe` is not on `PATH`.
- The `rustbpe` tokenizer dependency ships Windows wheels.
- At the demo's size, CPU pretraining would take several hours.

# Smallest Next Probe

Scale the demo recipe down until the whole baseline finishes in about 30
minutes on this CPU. Then run both probes at matched steps.

# Project

Promoted to [nanochat_cpu](../projects-folder/nanochat_cpu/).

# Citations

[1] [alphaXiv/OpenResearch `demo/nanochat` at 27cb342](https://github.com/alphaXiv/OpenResearch/tree/27cb342/demo/nanochat)
[2] [karpathy/nanochat](https://github.com/karpathy/nanochat)
