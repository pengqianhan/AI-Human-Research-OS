# OpenResearch nanochat demo: reference run

These are unchanged copies of the reference run's evidence from
[alphaXiv/OpenResearch](https://github.com/alphaXiv/OpenResearch) at commit
`27cb342`, path `demo/nanochat/evidence/`:

- [training-metrics.csv](training-metrics.csv): base and SFT loss, validation
  bpb, throughput, and elapsed time by step.
- [evaluation-metrics.json](evaluation-metrics.json): base bpb, the CORE tasks
  that were completed, and the final headline metrics.

Run: depth 6, 73.5M parameters, vocabulary 32,768, 5,000 base steps and 1,500
SFT steps on an Apple M3 Max (`mps`). Base validation bpb was 1.940739 at step
100, 1.762539 at step 200, and 1.165758 at the end. SFT validation bpb was
0.7389. The chat answer was "Paris".

The CPU example in [../../Code/README.md](../../Code/README.md) is about 90×
smaller (0.84M parameters, 300 steps). Its numbers are not comparable to these
beyond the shape of the curves.
