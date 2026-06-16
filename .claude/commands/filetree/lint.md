---
description: Report drift between FILETREE.md and the current repo, read-only. Prompts to run /filetree:update on drift.
allowed-tools: Bash(python:*)
---

Run the drift check and present results to the user:

```bash
python .claude/skills/filetree-simple/scripts/filetree.py lint
```

The script outputs JSON and exits `1` if there is any drift, `0` if clean.

Format the JSON for the user, grouped by category (`added` / `changed` /
`removed` / `renamed`) with counts. If there is any drift, remind the user to
run `/filetree:update` to sync (or `/filetree:init` if `FILETREE.md` doesn't
exist at all).

Do not call any LLM. Do not modify any files. Do not read the filetree
`SKILL.md` — lint is pure script invocation, no shared rules apply here.

Do not echo the raw JSON back to the user verbatim. A summary of counts plus
the drift paths (truncated if many) is enough.
