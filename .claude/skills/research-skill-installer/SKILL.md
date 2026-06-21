---
name: research-skill-installer
description: Install, update, list, inspect, or remove skills from this repository's Research-skills-hub into both Codex (.agents/skills) and Claude Code (.claude/skills). Use when the user wants Codex or Claude Code to use a hub skill, sync installed skills across both agent directories, check which research skills are installed, or manage Research-skills-hub collections.
---

# Research Skill Installer

Use this skill to manage skills stored under `Research-skills-hub/`.

The installer always treats both agent directories as the target:

- `.agents/skills/` for Codex.
- `.claude/skills/` for Claude Code.

Run commands from the repository root unless you pass `--repo`.

## Commands

List available hub skills:

```bash
python Research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py list
```

Check installed status:

```bash
python Research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py status
python Research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py status research-bible
```

Install a skill into both Codex and Claude Code:

```bash
python Research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py install research-bible
```

If the skill exists in more than one collection, specify the collection:

```bash
python Research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py install uv --collection science-skills
```

Update an already-installed skill:

```bash
python Research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py install research-bible --update
```

Preview without writing:

```bash
python Research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py install research-bible --dry-run
```

Remove a skill from both installed locations:

```bash
python Research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py remove research-bible --yes
```

## Workflow

1. Use `list` or `status` first if the requested skill name is uncertain.
2. Use `install <skill>` for new installs.
3. Use `install <skill> --update` only when replacing an installed copy is intended.
4. After installing or updating, run `status <skill>` to confirm both targets are installed and match the hub source.
5. If repository documentation or indexed files changed in the same task, refresh `FILETREE.md` separately with `filetree-simple`.

## Guardrails

- Do not manually copy a hub skill when this script can do it.
- Do not use `--update` unless the user asked to update/reinstall or the installed copy is known to be stale.
- Do not remove a skill without an explicit user request; `remove` requires `--yes`.
- Review a collected skill's `SKILL.md` and bundled scripts before installing it from `collected-skills` or another third-party collection.
