---
type: Method
title: Rollout Routing Replay (R3)
description: Records the expert routing chosen by the inference engine during RL rollouts and replays it in the trainer's forward pass, so that a mixture-of-experts model assigns the same probabilities to a trajectory in training as it did in inference.
resource: https://arxiv.org/abs/2510.11370
aliases:
- R3
tags:
- reinforcement-learning
- mixture-of-experts
- training-inference-consistency
timestamp: 2026-11-05T00:00:00Z
---

# Definition

Rollout Routing Replay (Ma et al., 2025) addresses a mismatch in mixture-of-experts (MoE) reinforcement learning: the inference engine and the training engine can route the same tokens to different experts, and the same framework can diverge across repeated forward passes, which can destabilize or collapse RL training. R3 records routing from the inference engine and replays it during training. Its authors report lower training-inference KL divergence and fewer extreme discrepancies without slowing training, and more stable training than GSPO and TIS. This description follows the R3 abstract; the full paper has not been ingested.

# Papers

* [Axion 1.0](../papers/2611.03233.md) - stores selected experts per token and MoE layer as uint8 tensors (about 20 MB per sample) between vLLM and Megatron. At 122B, on-off runs give mean gradient norm 1.998 to 1.922, mean PPO KL 0.0413 to 0.0396, and higher HLE-130 (74.6 against 72.3) and FrontierScience Research (66.7 against 61.7), but lower SEAL-0 (58.6 against 63.1) and a larger maximum gradient spike (26.8 against 21.1).
* [MiMo-V2.6](../papers/2610.11959.md) - named among the prior parts its long RL pipeline builds on for MoE train-inference consistency.

# Notes

Axion's own caveat applies generally: its log-probability diagnostics also reflect asynchronous policy staleness and context condensation, so benchmark differences cannot be attributed to R3 alone. R3 removes one source of mismatch. Token-In-Token-Out handles another, re-tokenization of reconstructed sessions, in the same pipeline.
