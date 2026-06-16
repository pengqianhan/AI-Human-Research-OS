---
description: Sync FILETREE.md with current repository state — handles added / changed / removed / renamed.
allowed-tools: Read, Bash(git:*), Bash(python:*)
---

Sync `FILETREE.md` with the current state of the repository.

**First**, read `.claude/skills/filetree-simple/SKILL.md` in full — especially
the **Update** section and the Summary Rules' `UNCHANGED` guidance above it.

## Steps

1. Run:
   ```bash
   python .claude/skills/filetree-simple/scripts/filetree.py todo
   ```
   If `FILETREE.md` doesn't exist yet, tell the user to run `/filetree:init`
   instead and stop.
2. For each `added` item, read the file and write a fresh one-line summary.
3. For each `changed` item, prefer `git diff HEAD -- <path>` over reading the
   whole file. Output `UNCHANGED` unless the old summary no longer describes
   the file's purpose.
4. Apply everything in one call, including any `removed`/`renamed` paths from
   the `todo` output:
   ```bash
   python .claude/skills/filetree-simple/scripts/filetree.py apply
   ```
   stdin shape:
   ```json
   {
     "updates": [{"path": "...", "hash": "...", "summary": "..."}],
     "removals": ["..."],
     "renames": [{"old_path": "...", "new_path": "..."}]
   }
   ```
   `summary` may be `UNCHANGED` for changed files.
5. Run:
   ```bash
   python .claude/skills/filetree-simple/scripts/filetree.py lint
   ```
   and confirm it exits `0`. Report counts of added / changed / removed /
   renamed entries.

## Do not

- Commit. The user reviews and commits.
- Rewrite a summary just because its hash changed.
- Treat a `removed` path as `changed`.
