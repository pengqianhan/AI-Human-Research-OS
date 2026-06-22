---
type: Human Profile
title: Human Profile
description: Stable low-sensitivity profile, preferences, and recurring workflows for the human user.
tags: [human-context, preferences, workflows]
timestamp: 2026-06-22T01:24:11Z
---

# Human Profile

Stable, low-sensitivity facts and preferences about the human user. Leave
unknown fields blank instead of guessing.

## Identity

- Name:
- Preferred name:
- Preferred pronouns:
- Primary language:
- Secondary languages:
- Timezone:
- Location context:

## Roles

- Human role:
- Research role:
- Coding role:
- Writing role:

## Research Context

- Main research areas:
- Current long-term direction:
- Communities, venues, or fields of interest:
- Tools and platforms commonly used:

## Stable Constraints

- Availability patterns:
- Hardware or environment constraints:
- Accessibility or focus needs:

## Collaboration Preferences

Communication:

- Use the user's language for discussion unless the artifact itself needs
  another language.
- Prefer direct, concrete answers over broad generalities.
- Surface assumptions, tradeoffs, and verification status clearly.
- Avoid storing a preference permanently unless it is confirmed or repeatedly
  observed and then approved.

Research:

- Keep claims traceable to papers, notes, data, code, or figures.
- Prefer primary sources and exact metadata for papers and citations.
- Separate ideas, evidence, experiments, figures, and writing when useful.
- Promote a repeated research lesson to a reusable skill only when it is useful
  across multiple projects.

Coding:

- Prefer small, reversible changes.
- Follow the existing repository structure and local conventions.
- Update nearby documentation when runnable workflows, experiments, templates,
  or indexed files change.
- Verify changes with the narrowest meaningful checks before reporting done.

Writing and documents:

- Preserve source-backed claims.
- Keep drafts editable and traceable.
- Mark uncertain claims instead of presenting them as established facts.

## Recurring Workflows

Research idea to project:

1. Capture the idea under [Ideas/](../Ideas/).
2. Promote it into a project under [projects-folder/](../projects-folder/).
3. Keep claims traceable through project memory, references, code, figures, and
   writing.

Reading papers:

1. Identify the paper and fetch reliable metadata.
2. Read abstract, introduction, method, experiments, limitations, and references
   as needed for the task.
3. Record notes only in the appropriate project, paper library, or task context.
4. Do not invent citations, quotes, metrics, or claims.

Running experiments:

1. Write the hypothesis, expected result, and update rule before running.
2. Start with a small, cheap, reproducible run.
3. Inspect failures or examples by hand before adding complexity.
4. Record commands, inputs, outputs, and limitations in the nearest README or
   project memory when the result should persist.

Managing skills:

- Use [research-skill-installer](../Research-skills-hub/open-paper-skills/research-skill-installer/SKILL.md)
  to install, update, or sync back skills between the hub and the agent skill
  directories.
- Use [Research-skills-hub/](../Research-skills-hub/) as the canonical store.
- Installed copies live in `.agents/skills/` and `.claude/skills/` and should
  stay byte-identical.

## Entry Templates

Durable fact:

```markdown
- fact:
  source: user-confirmed | imported | inferred
  last_updated: YYYY-MM-DD
  confidence: high | medium | low
```

Preference:

```markdown
## Preference Title

- preference:
- why_it_matters:
- applies_when:
- source: user-confirmed | imported | inferred
- last_updated: YYYY-MM-DD
- confidence: high | medium | low
```

Workflow:

```markdown
## Workflow Name

- purpose:
- trigger:
- steps:
- outputs:
- should_not_do:
- source: user-confirmed | imported | inferred
- last_updated: YYYY-MM-DD
```
