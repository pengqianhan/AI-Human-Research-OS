---
name: collected-skills-organizer
description: "Registers a newly added skill into Research-skills-hub/collected-skills/ by updating index.md and README.md. Use whenever: a new SKILL.md has been dropped into the collected-skills directory; the user says they added a new skill and provides a source URL; the user asks to update the collected-skills index or README. Always invoke this skill when the user adds a skill to Research-skills-hub/collected-skills/ and mentions the source URL — even if the request is phrased as 'update the index' or 'register this skill'."
---

## What this skill does

After a new skill folder is placed under `Research-skills-hub/collected-skills/<skill-name>/`, this skill:

1. Reads the skill's `SKILL.md` frontmatter (`name`, `description`) and body (install instructions, example commands).
2. Updates `Research-skills-hub/collected-skills/index.md` — adds a bullet entry.
3. Updates `Research-skills-hub/collected-skills/README.md` — adds a table row, a Prerequisites line, and a `## <skill-name>` usage section.

## Inputs needed

- **Skill directory name** — the folder name under `collected-skills/` (e.g. `hf-cli`).
- **Source URL** — upstream repo or file URL for provenance (e.g. `https://github.com/huggingface/skills/blob/main/skills/hf-cli/SKILL.md`). Ask the user if not provided.
- **License** (optional) — if visible in the source, include it after the source link (e.g. `, MIT`). Omit if unknown.

## Step-by-step

### 1. Read the skill's SKILL.md

Read `Research-skills-hub/collected-skills/<skill-name>/SKILL.md`.

Extract:
- `name` from frontmatter.
- `description` from frontmatter — use the full text; you'll shorten it for the table.
- **Install line** — look for a line starting with `Install:` near the top of the body. Use it verbatim for the Prerequisites entry.
- **Example commands** — pick 3–5 representative slash-command examples from the body to put in the usage section. If none exist, synthesise plausible ones from the description.

### 2. Update index.md

File: `Research-skills-hub/collected-skills/index.md`

Append a bullet after the last existing entry:

```
* [<name>](<name>/SKILL.md) - <one-sentence summary derived from the description>
```

Keep the summary to one short sentence (≤ 15 words).

### 3. Update README.md — table row

File: `Research-skills-hub/collected-skills/README.md`

Append a row to the Skills table (after the last `|` row, before the blank line):

```
| [<name>](<name>/SKILL.md) | <one-sentence summary> | [<source-label>](<source-url>)<, license if known> |
```

For the source label, use `<org>/<repo>` derived from the URL (e.g. `huggingface/skills`).

### 4. Update README.md — Prerequisites entry

In the `## Prerequisites` section, append a line after the last existing `-` bullet:

```
- `<name>`: <install instruction from SKILL.md, or "no local setup required" if none>.
```

### 5. Update README.md — usage section

Append a new `## <name>` section **before** the `## Credits And License Boundary` line.

Template:

```markdown
## <name>

<One or two sentence description of what the skill does, drawn from the SKILL.md description.>

<If an Install block exists in SKILL.md, include it:>

Install:

```bash
<install command>
```

Example requests:

```text
/<name> <example 1>
/<name> <example 2>
/<name> <example 3>
```
```

## Format guidance

- **Table summary**: trim the description to the core action, ≤ 20 words.
- **Bullet summary**: same as table summary.
- **Prerequisites**: copy the install line from SKILL.md almost verbatim; if there is an `export VAR=...` pattern, mention setting the env var too.
- **Example requests**: prefer examples that show different capabilities (download, upload, list, search, etc.).

## After updating

Confirm to the user:
- Which three locations were updated (index.md bullet, README table row, README ## section).
- The source attribution recorded.
- Optionally remind them to install the skill: `cp -R Research-skills-hub/collected-skills/<name> .claude/skills/<name>`.
