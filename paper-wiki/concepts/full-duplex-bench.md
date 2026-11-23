---
type: Benchmark
title: Full-Duplex-Bench
description: A benchmark series for full-duplex spoken dialogue models; v1.0 measures turn-taking, pauses, backchannels and interruptions through takeover rates, v1.5 measures overlap behavior, and v3 adds tool use on real, disfluent spoken requests.
tags:
- full-duplex
- voice-agents
- speech-evaluation
- tool-use
timestamp: 2026-11-23T00:00:00Z
---

# Definition

Full-Duplex-Bench (Lin et al.) is a series of benchmarks for speech models that listen while they speak. The earlier versions evaluate conversational behavior: v1.0 scores pause handling, backchannels, smooth turn-taking and user interruptions, largely through takeover rates (how often the model takes the turn in each situation), and v1.5 adds overlap cases such as resuming after a user's backchannel or after background speech. Version 3 extends evaluation to tool use on real, disfluent speech: 100 English recordings against 12 simulated APIs, where 66, 18 and 16 recordings need one, two and three calls, scored by tool selection, argument accuracy, response quality, a strict Pass@1 (exact calls with correct arguments) and timing metrics. This description follows how the two papers below use it; the benchmark papers themselves are not in this wiki.

# Papers

* [Gander](../papers/2609.08977.md) - v3 with its released scoring scripts end to end; Gander leads turn-taking timing (100.0% appropriately timed turns, 8.0% premature interruptions) but trails GPT-Realtime on task accuracy (Pass@1 0.400 vs. 0.600).
* [Duopra](../papers/2611.25773.md) - v3 Pass@1 decomposed into call coverage times conditional success over 300 sessions per configuration (three decoding seeds), plus v1.0 takeover rates calibrated on MiniCPM-o 4.5 and v1.5 overlap measures; reports Duopra 44.7% to 49.3% against 4.7% for its base frontend.

# Notes

The two papers report v3 with different pipelines and judges (Gander uses the released scripts with a GPT-4o response judge; Duopra uses its own streaming pipeline with a Qwen3.8-27B judge and lists published numbers, Gander's included, only as reference points). Pass@1 is the most comparable column because it rests on call matching rather than a judge.

# Related

* [Full-duplex voice agents](../topics/full-duplex-voice-agents.md)
