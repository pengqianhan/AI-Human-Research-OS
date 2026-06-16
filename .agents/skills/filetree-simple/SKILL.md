---
name: filetree-simple
description: Maintain a compact repository FILETREE.md index with one-line file purpose summaries and content hashes. Use this same skill when you are asked to create, update, or lint FILETREE.md. Claude Code project commands /filetree:init, /filetree:update, /filetree:lint wrap the same workflow.
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
`scripts/filetree.py`, found next to wherever this `SKILL.md` lives (e.g.
`.agents/skills/filetree-simple/scripts/filetree.py` or
`.claude/skills/filetree-simple/scripts/filetree.py`).

Run commands from the target repository root.

There are three workflows, matching `/filetree:init`, `/filetree:update`, and
`/filetree:lint` in Claude Code (wired as project commands under
`.claude/commands/filetree/`): **Init** creates `FILETREE.md` from scratch,
**Update** syncs an existing manifest with added/changed/removed/renamed
files, and **Lint** is a read-only, no-LLM drift check. Codex has no slash
commands, so run the same script invocations directly from the sections
below.

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

## Init

Use when `FILETREE.md` does not exist yet (or the user wants to regenerate it
from scratch).

1. If `FILETREE.md` already exists, confirm with the user before overwriting —
   they may have meant **Update** instead. Stop if they decline.
2. Run:
   ```bash
   python scripts/filetree.py todo
   ```
   With no prior manifest, every indexed item appears under `added`.
3. For every `added` item, read the file (or its `README.md`/`SKILL.md`
   entrypoint for folder entries) and write a fresh one-line summary per
   Summary Rules. `UNCHANGED` is never valid here — there is no prior summary
   to refresh.
4. Apply:
   ```bash
   python scripts/filetree.py apply
   ```
   stdin shape:
   ```json
   {"updates": [{"path": "...", "hash": "...", "summary": "..."}], "removals": [], "renames": []}
   ```
5. Run **Lint** to confirm exit code `0`.

## Update

Use when `FILETREE.md` already exists and the repo has since changed.

1. Run:
   ```bash
   python scripts/filetree.py todo
   ```
2. For each `added` indexed item, read the file and write a fresh summary.
3. For each `changed` indexed item, prefer `git diff HEAD -- <path>` over
   reading the whole file, and use `UNCHANGED` unless the old summary no
   longer describes the file's purpose.
4. Pass decisions to `apply`, including any `removed`/`renamed` paths from the
   `todo` output:
   ```bash
   python scripts/filetree.py apply
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
5. Run **Lint** to confirm exit code `0`.

## Lint

Run:

```bash
python scripts/filetree.py lint
```

Exit code `0` means clean. Exit code `1` means `FILETREE.md` has drift. This
check is read-only and never requires an LLM call — if there is drift, run
**Update** (or **Init** if no manifest exists yet) to fix it.

## Agent Wiring

To make agents discover this skill, reference this file from both instruction
entry points:

```markdown
- `.agents/skills/filetree-simple/SKILL.md` (or `.claude/skills/filetree-simple/SKILL.md`
  in Claude Code) - FILETREE.md maintenance skill. Read it before creating,
  updating, or linting FILETREE.md.
```

## Guardrails

- Do not commit automatically.
- Do not summarize skipped or compacted-away files; entrypoint files should
  cover their subtree at a navigational level.
- Do not rewrite summaries just because hashes changed.
- Do not overwrite an existing `FILETREE.md` in **Init** without the user's
  confirmation.
- Do not output `UNCHANGED` during **Init** — every item is new.

## Credits

Inspired by [nekocode/filetree-skill](https://github.com/nekocode/filetree-skill),
an MIT-licensed Claude Code plugin for maintaining `FILETREE.md`. This local
version adapts the idea for a compact, README/SKILL-first repository navigation
index.
