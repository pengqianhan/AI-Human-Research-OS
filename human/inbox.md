---
type: Human Memory Inbox
title: Human Memory Inbox
description: Review queue for candidate profile facts, preferences, and workflow updates.
tags: [human-context, memory, review]
timestamp: 2026-06-22T01:24:11Z
---

# Human Memory Inbox

Use this file for candidate facts, preferences, or workflow updates awaiting
approval for the human's profile.

Agents may add entries here when a user preference appears important but has not
been explicitly approved for long-term storage. Do not promote entries into
[PROFILE.md](PROFILE.md) without confirmation. Cognition observations go directly
to the [cognition cache](human-cognition/index.md) under the
[Memory Policy](index.md#memory-policy), without an inbox review step.

## Pending

<!-- New candidate entries go here. -->

## 2026-07-04 - Candidate Memory

- proposed_entry: 用户不熟悉前端技术。涉及前端代码时:代码放独立自包含目录
  (如 `os-ui/frontend/`),实现/修改时边做边用非专业语言讲解;提供写给
  非前端人的 README;视觉决策用效果图(而非文字)供用户行使否决权。
- suggested_destination: PROFILE.md(协作偏好)
- evidence: 2026-07-04 os-ui 设计 grilling 会话,用户原话"对于前端技术我完全
  不懂,我建议把前端的代码单独放在一个文件夹,后续用 claude code 实现的时候
  可以单独编辑和给我讲解"。
- source: user-suggested
- confidence: high
- status: pending

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
