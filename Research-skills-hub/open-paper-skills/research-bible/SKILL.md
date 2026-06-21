---
name: research-bible
description: Research operating-system guidance for ML/AI research. Use this skill when you need to help choose research problems, design experiment loops, improve research taste, debug model training or eval workflows, inspect failures, keep research logs, build reading plans, or turn how_to_be_good_at_research.md principles into concrete plans, checklists, habits, or advice.
author: Pengqian Han
version: 0.0.1
---

# Research Bible

## Overview

Use this skill to turn the principles in `references/how_to_be_good_at_research.md` into concrete research behavior. Keep the original essay's claims and voice intact when adapting it; prefer adding structure around it rather than rewriting it.

## Reference Loading

Read `references/how_to_be_good_at_research.md` first when the user asks for research advice, a research workflow, or a plan inspired by this skill.

Load source notes only when attribution or deeper context matters:

- `references/YouAndYourResearch.md` for Hamming, important problems, open doors, prepared minds, and compounding.
- `references/SchulmanGuideToMLResearch.md` for the attributed outcome-backward research framing; treat its source as unverified until replaced.
- `references/CreativeThinking.md` for Shannon's simplification heuristic.
- `references/TheBitterLesson.md` for Sutton's scaling-computation argument.
- `references/PuttingIdeasIntoWords.md` for writing as a test of thought.
- `references/CargoCultScience.md` for Feynman's self-honesty rule.
- `references/TheAutobiographyOfCharlesDarwin.md` for writing down contrary evidence.
- `references/ResearchDebt.md` for research distillation and public explanations.
- `references/ARecipeForTrainingNeuralNetworks.md` for Karpathy's training/debugging recipe.
- `references/MachineLearningYearning.md` for Andrew Ng-style error analysis.
- `references/AdaptiveMixturesOfLocalExperts.md`, `references/LongShortTermMemory.md`, and `references/LearningRepresentationsByBackPropagatingErrors.md` for old-but-useful ML lineage examples.

## Core Workflow

When helping with a research task, shape the answer around the smallest useful subset of these moves:

1. Pick the problem deliberately. Ask what outcome should exist, why it matters, what would falsify the direction, and whether the user has a plausible attack.
2. Upgrade inputs. Suggest older sources, adjacent fields, primary papers, appendices, and direct artifact inspection instead of relying on threads or summaries.
3. Forecast before running. Record the expected result, the reason for that expectation, and the update rule before experiments begin.
4. Tighten the loop. Reduce the first version until it is cheap: one command to run, one command to plot, one config to reproduce, one small case to overfit or validate.
5. Inspect outputs by hand. Pull failures or transcripts, sort them into piles, attack the largest pile, and only then ask for new aggregate metrics.
6. Protect against self-deception. Keep a log with `hypothesis`, `setup`, `expectation`, `result`, and `updated belief`; write down contrary evidence immediately.
7. Tune baselines and ablate. Treat gains as provisional until baselines are strong and the component carrying the result is known.
8. Distill publicly when useful. Turn hard-won understanding into clear notes, posts, diagrams, or tools when that would reduce research debt.

## Research Checklist

Before starting:

- Problem is chosen deliberately, not absorbed from hype.
- Desired outcome is explicit.
- Plausible attack and falsification condition are written down.
- Old and adjacent-field sources have been checked.

Before running experiments:

- Hypothesis, setup, expectation, and update rule are logged.
- First run is cheap and reproducible.
- Baseline is strong enough to be meaningful.
- Small-case or single-batch validation has passed.

After results:

- Failures or transcripts were inspected by hand.
- Errors were sorted into piles.
- The largest pile has a concrete next action.
- Ablations identify which component carries the result.
- Updated belief is written down.

## Output Patterns

For a research plan, produce a compact checklist with sections for problem, prior art, experiment loop, failure analysis, baseline/ablation plan, and logging.

For debugging model training or evals, start with data inspection, dumb baselines, single-batch overfit or small-case validation, then failure-pile analysis.

For reading plans, mix old foundations, current primary papers, appendices, and adjacent-field material. Explain why each source changes the user's model of the problem.

For research logs, use this template:

```markdown
## YYYY-MM-DD - Experiment Name

Hypothesis:
Setup:
Expectation:
Result:
Updated belief:
Next action:
```

## Style Constraints

Be concrete and operational. Avoid generic motivation. Do not turn `how_to_be_good_at_research.md` into a rewritten essay unless the user asks for a rewrite. If quoting or adapting the essay, preserve wording where possible and add links to the local reference files.
