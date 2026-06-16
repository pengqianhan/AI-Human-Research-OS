---
description: Generate FILETREE.md from scratch. Confirms overwrite if it already exists.
allowed-tools: Read, Bash(python:*)
---

Generate `FILETREE.md` from scratch for the current repository.

**First**, read `.claude/skills/filetree-simple/SKILL.md` in full — especially
the **Init** section and the Summary Rules / Index Selection Rules above it.
Everything below is just that section turned into a checklist.

## Steps

1. If `FILETREE.md` already exists, ask the user to confirm overwrite — they
   may have meant `/filetree:update` instead. Stop if they decline.
2. Run:
   ```bash
   python .claude/skills/filetree-simple/scripts/filetree.py todo
   ```
   With no prior manifest, every indexed item appears under `added`.
3. For every `added` item, read the file (or its `README.md`/`SKILL.md`
   entrypoint when it's a folder entry) and write a fresh one-line summary
   per the Summary Rules. Never output `UNCHANGED` here — there is no prior
   summary to refresh.
4. Apply everything in one call:
   ```bash
   python .claude/skills/filetree-simple/scripts/filetree.py apply
   ```
   stdin shape:
   ```json
   {"updates": [{"path": "...", "hash": "...", "summary": "..."}], "removals": [], "renames": []}
   ```
5. Run:
   ```bash
   python .claude/skills/filetree-simple/scripts/filetree.py lint
   ```
   and confirm it exits `0`. Report the total number of entries written.

## Do not

- Commit. The user reviews and commits.
- Overwrite an existing `FILETREE.md` without confirmation.
- Output `UNCHANGED` for any item.
