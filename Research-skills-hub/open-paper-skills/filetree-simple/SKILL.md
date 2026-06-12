---
name: filetree-simple
description: Maintain a compact repository FILETREE.md index with one-line file purpose summaries and content hashes. Use this same skill from Codex or Claude Code when asked to create, update, or lint FILETREE.md.
license: MIT
---

# Filetree

Maintain `FILETREE.md`: a compact navigation index grouped by directory, with
folder and file entries. Each indexed entry carries an 8-character hash.

Prefer folder entries over exhaustive file listings. If a directory has a
`README.md` or `SKILL.md`, `FILETREE.md` should list the directory itself
(`folder/`) and use that entrypoint file as the source for its hash. Auxiliary
files below that directory are omitted. Nested directories with their own
`README.md` or `SKILL.md` remain indexed as folder entries because they are
entrypoints for their own subtrees. Files in directories without an entrypoint
are still listed individually.

This is a plain shared skill, not a Claude Code plugin. Codex and Claude Code
should both read this `SKILL.md` directly and run the same helper script:
`scripts/filetree.py`.

Run commands from the target repository root.

## Summary Rules

- One line, max 25 words.
- Describe what the file is for, not its internal implementation details.
- Summarize folder entries by what belongs in that folder, not by the entrypoint
  filename.
- Match the language of existing entries when updating an existing manifest.
- For changed files, output `UNCHANGED` when the old summary still describes the
  file purpose. Prefer `git diff HEAD -- <path>` before reading the full file.
- Write a new summary only when the file purpose meaningfully changed.

## Index Selection Rules

- Always index root-level useful text/code files.
- Always index repository directories as `folder/` entries unless they are
  auxiliary directories covered by an ancestor entrypoint.
- If a non-root directory has `README.md` or `SKILL.md`, index the directory as
  `folder/`, not the entrypoint file itself.
- Use `README.md` before `SKILL.md` when both exist in a directory.
- If a folder entry has an entrypoint file, its hash is the entrypoint file hash.
- If a folder entry has no entrypoint file, its hash is a deterministic
  structural hash of its immediate children.
- If a non-root directory has `README.md` or `SKILL.md`, omit auxiliary files
  below that directory from `FILETREE.md`.
- If a directory has no `README.md` or `SKILL.md`, index its useful text/code
  files individually.
- README-indexed subtrees may be configured in the script when one README is
  intended to index a large, frequently changing subtree. For this repository,
  `Research-skills-hub/` keeps only `README.md` and `skills/` visible; individual
  skill directories are found through `Research-skills-hub/README.md`.
- The script filters `FILETREE.md`, lock files, `.gitkeep`, and common
  binary/asset formats before applying these compacting rules.

## Create Or Update

1. Run:
   ```bash
   python filetree-skill-simple/scripts/filetree.py todo
   ```
2. For each `added` indexed item, read the file and write a fresh summary.
3. For each `changed` indexed item, use `UNCHANGED` unless the old summary no longer
   describes the file purpose.
4. Pass decisions to `apply`:
   ```bash
   python filetree-skill-simple/scripts/filetree.py apply
   ```
   stdin shape:
   ```json
   {
     "updates": [{"path": "...", "hash": "...", "summary": "..." }],
     "removals": ["..."],
     "renames": [{"old_path": "...", "new_path": "..."}]
   }
   ```
   `summary` may be `UNCHANGED` for changed files.

## Lint

Run:

```bash
python filetree-skill-simple/scripts/filetree.py lint
```

Exit code `0` means clean. Exit code `1` means `FILETREE.md` has drift.

## Agent Wiring

To make agents discover this skill, reference this file from both instruction
entry points:

```markdown
- `./filetree-skill-simple/SKILL.md` - FILETREE.md maintenance skill. Read it
  before creating, updating, or linting FILETREE.md.
```

## Guardrails

- Do not commit automatically.
- Do not summarize skipped or compacted-away files; entrypoint files should
  cover their subtree at a navigational level.
- Do not rewrite summaries just because hashes changed.

## Credits

Inspired by [nekocode/filetree-skill](https://github.com/nekocode/filetree-skill),
an MIT-licensed Claude Code plugin for maintaining `FILETREE.md`. This local
version adapts the idea for a compact, README/SKILL-first repository navigation
index.
