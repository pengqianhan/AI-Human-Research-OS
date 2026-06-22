---
type: Human Memory Inbox
title: Human Memory Inbox
description: Review queue for candidate facts, preferences, and workflow updates before durable promotion.
tags: [human-context, memory, review]
timestamp: 2026-06-22T01:24:11Z
---

# Human Memory Inbox

Use this file for candidate facts, preferences, or workflow updates about the
human user that need review before becoming durable memory.

Agents may add entries here when a user preference appears important but has not
been explicitly approved for long-term storage. Do not promote entries into
[PROFILE.md](PROFILE.md) without confirmation.

## Pending

<!-- New candidate entries go here. -->

## Accepted

<!-- Move accepted entries here after promoting them to the appropriate file. -->

## Rejected

<!-- Move rejected entries here with a short reason. -->

## Template

```markdown
## YYYY-MM-DD - Candidate Memory

- proposed_entry:
- suggested_destination:
- evidence:
- source: inferred | imported | user-suggested
- confidence: low | medium | high
- status: pending
```
