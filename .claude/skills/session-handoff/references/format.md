# HANDOFF.md Format

Read this reference only when creating `HANDOFF.md` or repairing its structure.

```markdown
# Handoff — TASK OR REPOSITORY

Commits live in Git: `git log` / `git show <hash>`.

## Active Work

No active tasks.

When work is active:

- [ ] Task — next action; acceptance check; blocker if present.
- [x] ~~Completed task~~ — verified with command, result, or artifact.

### Next session

- Focus: concise intended outcome.
- Suggested skills: include only skills that change routing.

## Decisions

| Decision | Default taken | To reverse |
|---|---|---|

## Deviations from the plan

## Intentionally not done
```

Omit `Next session` when there is no planned continuation. Keep decisions reversible, blockers
attached to open work, and completed implementation detail in Git or linked artifacts.
