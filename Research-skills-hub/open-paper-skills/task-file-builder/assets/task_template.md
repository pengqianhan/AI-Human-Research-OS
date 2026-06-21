# Claude Code Task Template

> Based on Opus 4.7 best practices: front-load all context in the first turn to minimize back-and-forth.

---

## Task Template

```
## Objective
<!-- What do you want to achieve? Be specific. -->

## Background & Intent
<!-- Why does this need to be done? What is the broader goal or context? -->

## Constraints
<!-- Tech stack limits, style requirements, version pins, etc. -->

## Acceptance Criteria
- [ ] ...

## Relevant Files / Entry Points
- `path/to/file.py` — description

## Known Context
<!-- Already investigated, known pitfalls, reference material. -->

## Questions (if any)
1. ...
```

---

## Field Reference

| Field | Priority | Notes |
|-------|----------|-------|
| Objective | ★★★ | Required — the more specific, the better |
| Acceptance Criteria | ★★★ | Helps Claude self-check and reduces rework |
| Relevant Files | ★★★ | Provide paths directly; avoid blind exploration |
| Background & Intent | ★★☆ | Helps Claude make better judgment calls |
| Constraints | ★★☆ | Required when hard limits exist |
| Known Context | ★☆☆ | Include to avoid repeating mistakes |
| Questions | ★☆☆ | Batch all questions when there are multiple |

---

## Effort Levels

| Effort | Best For |
|--------|----------|
| `low` | Latency-sensitive, simple scoped tasks |
| `medium` | Cost-sensitive, moderate complexity |
| `high` | Balance of quality and cost |
| `xhigh` *(default)* | Most coding and agentic tasks |
| `max` | Eval ceilings, extremely hard one-off problems |

---

## Common Prompt Snippets

For copy-pasteable examples, refer to the [Anthropic Prompting Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices). Key topics:

- **Verbosity / tone** — `Response length and verbosity`, `Tone and writing style`
- **Thinking depth** — `Calibrating effort and thinking depth`
- **Tool use** — `Tool use triggering`, `Optimize parallel tool calling`
- **Subagent control** — `Controlling subagent spawning`
- **Code review recall** — `Code review harnesses`
- **Hallucination prevention** — `Minimizing hallucinations in agentic coding`
- **Reversible actions** — `Balancing autonomy and safety`
- **Over-engineering** — `Overeagerness`
- **Research tasks** — `Research and information gathering`

---

*References:*
- *[Best practices for Opus 4.7 with Claude Code](https://claude.com/blog/best-practices-for-using-claude-opus-4-7-with-claude-code)*
- *[Anthropic Prompting Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)*
