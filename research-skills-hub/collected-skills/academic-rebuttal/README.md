# Rebuttal Skill

A structured AI skill for generating academic rebuttals to peer review. Designed for AI coding assistants (OpenCode, Claude Code, Gemini CLI) to produce rigorous, evidence-grounded author responses for venues like NeurIPS, ICML, ACL, and CVPR.

## Features

**Two-Stage Workflow**
- **Stage 1 – Triage & Experiment Planning:** Parses reviews into atomic concerns, infers underlying reviewer intent, classifies severity (FATAL → MINOR), and produces a prioritized P0–P3 experiment plan — not an unranked wishlist.
- **Stage 2 – Rebuttal Drafting:** Runs after author results arrive. Validates evidence against claimed concerns, drafts responses using a "Direct Answer → Evidence → Revision" structure, and produces a concrete manuscript revision list.

**Rebuttal vs. Resubmission Gate (Stage 0)**
- Assesses whether rebuttal is worthwhile (`PROMISING` / `BORDERLINE` / `LOW EXPECTED RETURN`).
- For low-return cases, provides a detailed resubmission roadmap with rejection diagnosis, revision backlog, and next-submission experiment plan.

**Response Patterns**
- Templates for: correcting misunderstandings, acknowledging limitations, reporting experiments, novelty defense, missing baselines, statistical reliability, score-text mismatch, and more.

**Five Output Modes**
- `TRIAGE_AND_EXPERIMENT_PLAN` — before results are available
- `RESULT_INTEGRATION` — after partial results arrive
- `FULL_REBUTTAL` — complete rebuttal with opening summary and revision list
- `RESUBMISSION_PLAN` — when rebuttal has low expected return
- `QUALITY_REVIEW` — audit an existing rebuttal draft

**Evidence Integrity**
- Strictly prohibits fabricating values, presenting planned work as completed, or hiding negative results. Uses visible placeholders for missing information.

## Usage

This is a skill definition, not a standalone application. Load it in any AI coding assistant that supports skills, then provide your paper's reviews:

```
Analyze this paper's reviews before drafting a rebuttal.

Venue and score scale: [venue, scale, borderline if known]
Deadline and resources: [time remaining, compute, author bandwidth]
Abstract: [abstract]
Reviews, scores, and confidences: [reviews]

First assess rebuttal viability. Infer the underlying concern behind every
review comment and visibly flag uncertain interpretations. Then produce a
prioritized P0-P3 experiment and analysis plan...
```

## Required Inputs

| Stage 1 | Stage 2 (additional) |
|---------|---------------------|
| Paper abstract | Completed experiment results |
| All review texts | Exact experimental settings |
| Reviewer scores | Verified manuscript locations |
| Venue & score scale | Changes authors are willing to make |
| Deadline / time remaining | Claims authors are willing to narrow |
| Available compute & bandwidth | |
