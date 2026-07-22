---
name: skill-organizer
description: "Registers a newly added skill into a Research-skills-hub collection by updating that collection's index.md and README.md. Handles two collections: collected-skills/ (external skills — needs a source URL and optional license) and open-paper-skills/ (skills the repo owner authored — provenance is Original or Adapted, no external URL required). Use whenever: a new SKILL.md has been dropped into research-skills-hub/collected-skills/ or research-skills-hub/open-paper-skills/; the user says they added a new skill (with or without a source URL); the user asks to update a collection's index or README. Always invoke when the user adds a skill to either collection — even if the request is phrased as 'update the index' or 'register this skill'."
---

## What this skill does

After a new skill folder is placed under a Research-skills-hub collection —
`research-skills-hub/<collection>/<skill-name>/` — this skill:

1. Reads the skill's `SKILL.md` frontmatter (`name`, `description`) and body
   (install instructions, attribution, example commands).
2. Updates `research-skills-hub/<collection>/index.md` — adds a bullet entry.
3. Updates `research-skills-hub/<collection>/README.md` — adds a table row, a
   Prerequisites line, and a `## <skill-name>` usage section.

It does **not** install the skill into `.claude/skills/` or `.agents/skills/`;
that stays a separate, explicit step (see [After updating](#after-updating)).

## Supported collections

| Collection | Nature of skills | Provenance handling |
| --- | --- | --- |
| `collected-skills/` | Collected/adapted from **external** sources | **Source URL required** (ask the user if missing); add license after the link when known. |
| `open-paper-skills/` | **Authored by the repo owner** (original or adapted) | No external URL required. Source is `Original, <author>` or `Adapted from <X>` — read it from the SKILL.md attribution footer; default author to Pengqian Han. |

Pick the collection from where the skill folder was actually dropped. If a new
`SKILL.md` exists in both, or the target is ambiguous, ask which collection
before editing. Other collections under `research-skills-hub/` (e.g.
`science-skills/`, `claude-science-skills/`) are vendored bundles maintained by
their own upstream sync, not by this skill — do not register into them here.

## Inputs needed

- **Collection** — `collected-skills` or `open-paper-skills` (infer from the new
  folder's location; ask if ambiguous).
- **Skill directory name** — the folder name under the collection (e.g. `hf-cli`
  or `explain-anything-html`).
- **Source URL** — required for `collected-skills` only. For `open-paper-skills`
  read attribution from the SKILL.md footer; ask only if none is present and the
  skill is clearly adapted from elsewhere.
- **License** (optional) — if visible in the source, include it after the source
  link (e.g. `, MIT`). Omit if unknown.

## Step-by-step

### 1. Read the skill's SKILL.md

Read `research-skills-hub/<collection>/<skill-name>/SKILL.md`.

Extract:
- `name` from frontmatter.
- `description` from frontmatter — use the full text; you'll shorten it for the
  table and bullet.
- **Install line** — look for a line starting with `Install:` near the top of
  the body, or a setup/prerequisites block. Use it for the Prerequisites entry.
  If there is none, the skill needs "no local setup required".
- **Attribution** — for `open-paper-skills`, look for an italic footer such as
  `_Adapted from … based on <name>'s original skill: <url>_`; turn it into the
  Source cell. For `collected-skills`, use the user-provided source URL.
- **Example commands** — pick 3–5 representative slash-command or usage examples
  from the body for the usage section. If none exist, synthesise plausible ones
  from the description.

### 2. Update index.md

File: `research-skills-hub/<collection>/index.md`

Insert a bullet in the existing order (these indexes are kept **alphabetical**
by skill name — place it accordingly, not blindly at the end):

```
* [<name>](<name>/SKILL.md) - <one-sentence summary derived from the description>
```

Keep the summary to one short sentence (≤ 20 words).

### 3. Update README.md — table row

File: `research-skills-hub/<collection>/README.md`

Append a row to the Skills table. The last column differs by collection:

- `collected-skills`:
  ```
  | [<name>](<name>/SKILL.md) | <one-sentence summary> | [<source-label>](<source-url>)<, license if known> |
  ```
  For the source label, use `<org>/<repo>` derived from the URL (e.g.
  `huggingface/skills`).
- `open-paper-skills`:
  ```
  | [<name>](<name>/SKILL.md) | <one-sentence summary> | Original, <author> |
  ```
  or, when the skill is adapted, `Adapted from <X>` with a link if the SKILL.md
  footer provides one.

### 4. Update README.md — Prerequisites entry

In the `## Prerequisites` section, add a line for the new skill (group it with
the other "no setup required" skills if applicable, rather than always
appending):

```
- `<name>`: <install instruction from SKILL.md, or "no additional local setup required" if none>.
```

### 5. Update README.md — usage section

Append a new `## <name>` section **before** the README's trailing license
section — `## Credits And License Boundary` in `collected-skills`, or
`## License` in `open-paper-skills`.

Template:

````markdown
## <name>

<One or two sentence description of what the skill does, drawn from the SKILL.md description.>

<If an Install/setup block exists in SKILL.md, include it:>

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
````

## Format guidance

- **Table / bullet summary**: trim the description to the core action, ≤ 20 words.
- **Prerequisites**: copy the install line from SKILL.md almost verbatim; if
  there is an `export VAR=...` pattern, mention setting the env var too.
- **Example requests**: prefer examples that show different capabilities
  (download, upload, list, search, explain, etc.).
- Preserve each file's existing ordering convention (index bullets are
  alphabetical; README tables and sections may follow a curated order — match
  the neighbours).

## After updating

Confirm to the user:
- Which collection and which locations were updated (index.md bullet, README
  table row, README Prerequisites line, README `## <name>` section).
- The provenance recorded (source URL + license for `collected-skills`, or
  Original/Adapted attribution for `open-paper-skills`).
- That the top-level `research-skills-hub/index.md` and `FILETREE.md` list
  collections only, so they need no per-skill edit.
- Optionally remind them to install the skill through the installer, never by
  hand: `python research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py install <name>`.
  It places a symlink or a copy depending on the collection's `SOURCE.md`.
