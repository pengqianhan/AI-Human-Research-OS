#!/usr/bin/env python3
"""os-ui generator (U0).

Read-only scanner: walks the AI-Human-Research-OS repository and writes
``os-ui/frontend/public/state.json`` per the schema v0.1 contract in
``os-ui/DESIGN.md`` (Section 2). Standard library only.

Usage:
    uv run python generate.py            # one-shot generate + validate
    uv run python generate.py --watch    # foreground dev tool: poll mtimes
                                          # every 2s, regenerate on change,
                                          # Ctrl-C to exit

Hard rules (DESIGN.md Section 4/8): never invent data. Anything missing
becomes null or []. Parse failures are caught, logged to stderr, and degrade
to null/[] rather than crashing. This script only reads the repository and
writes state.json; it never mutates repo content and never runs git commit.
"""

from __future__ import annotations

import argparse
import filecmp
import json
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


# --------------------------------------------------------------------------
# Repo root discovery
# --------------------------------------------------------------------------


def find_repo_root(start: Path) -> Path:
    """Walk upward from `start` until a directory containing .git is found."""
    cur = start.resolve()
    for candidate in [cur, *cur.parents]:
        if (candidate / ".git").exists():
            return candidate
    raise SystemExit(f"error: no .git found above {start}")


def warn(msg: str) -> None:
    print(f"[generator] warning: {msg}", file=sys.stderr)


# --------------------------------------------------------------------------
# Small markdown helpers (stdlib only, deliberately permissive/tolerant)
# --------------------------------------------------------------------------


def read_text(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except (FileNotFoundError, OSError, UnicodeDecodeError) as e:
        warn(f"could not read {path}: {e}")
        return None


def iso_mtime(path: Path) -> str | None:
    try:
        ts = path.stat().st_mtime
    except OSError:
        return None
    return (
        time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(ts))
        + _tz_offset(ts)
    )


def iso_now() -> str:
    ts = time.time()
    return time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(ts)) + _tz_offset(ts)


def _tz_offset(ts: float) -> str:
    offset = -time.altzone if time.localtime(ts).tm_isdst else -time.timezone
    sign = "+" if offset >= 0 else "-"
    offset = abs(offset)
    return f"{sign}{offset // 3600:02d}:{(offset % 3600) // 60:02d}"


def find_section(text: str, heading: str) -> str | None:
    """Return the body of a top-level `## heading` section (until next `## `
    or `# ` heading), or None if not found."""
    pattern = re.compile(
        rf"^##\s+{re.escape(heading)}\s*$(.*?)(?=^#{{1,2}}\s+|\Z)",
        re.MULTILINE | re.DOTALL,
    )
    m = pattern.search(text)
    if not m:
        return None
    return m.group(1)


def parse_md_table(block: str) -> list[dict[str, str]]:
    """Parse a single GitHub-flavored markdown table found in `block`.
    Returns a list of row dicts keyed by header cell text. Tolerant: skips
    the separator row (---), strips markdown links to their [text] where
    a bare href is also present isn't required here (raw cell text kept).
    """
    lines = [l for l in block.splitlines() if l.strip().startswith("|")]
    if len(lines) < 2:
        return []

    def split_row(line: str) -> list[str]:
        cells = line.strip().strip("|").split("|")
        return [c.strip() for c in cells]

    header = split_row(lines[0])
    rows: list[dict[str, str]] = []
    for line in lines[2:]:  # skip header + separator
        cells = split_row(line)
        if not cells or all(c == "" for c in cells):
            continue
        row = {}
        for i, h in enumerate(header):
            row[h] = cells[i] if i < len(cells) else ""
        rows.append(row)
    return rows


def strip_md_link(cell: str) -> str:
    """`[text](path)` -> `text`; leaves plain text untouched."""
    m = re.match(r"^\[([^\]]+)\]\(([^)]+)\)$", cell.strip())
    if m:
        return m.group(1)
    return cell.strip()


def clean_inline_md(text: str) -> str:
    """Remove simple emphasis markers and code ticks, keep content."""
    text = text.strip()
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"~~([^~]+)~~", r"\1", text)
    return text


# --------------------------------------------------------------------------
# meta
# --------------------------------------------------------------------------


def build_meta(repo_root: Path) -> dict[str, Any]:
    repo_head = None
    try:
        out = subprocess.run(
            ["git", "-C", str(repo_root), "rev-parse", "--short", "HEAD"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if out.returncode == 0:
            repo_head = out.stdout.strip() or None
        else:
            warn(f"git rev-parse failed: {out.stderr.strip()}")
    except Exception as e:  # pragma: no cover - defensive
        warn(f"git rev-parse errored: {e}")

    return {
        "schema_version": "0.1",
        "generated_at": iso_now(),
        "repo_head": repo_head,
    }


# --------------------------------------------------------------------------
# policy (Memory/MEMORY.md "## Research Policy")
# --------------------------------------------------------------------------


def build_policy(repo_root: Path) -> dict[str, Any]:
    policy = {"agent_led_research": None, "parallelism": None}
    mem_path = repo_root / "Memory" / "MEMORY.md"
    text = read_text(mem_path)
    if text is None:
        return policy
    section = find_section(text, "Research Policy")
    if section is None:
        warn("Memory/MEMORY.md: '## Research Policy' section not found")
        return policy
    rows = parse_md_table(section)
    for row in rows:
        key_cell = row.get("Policy", "")
        key = strip_md_link(key_cell).strip("`")
        value = clean_inline_md(row.get("Value", "")).strip("`")
        if key in policy:
            policy[key] = value if value else None
    return policy


# --------------------------------------------------------------------------
# portfolio (Memory/MEMORY.md "## Active Projects")
# --------------------------------------------------------------------------


def build_portfolio(repo_root: Path) -> list[dict[str, Any]]:
    mem_path = repo_root / "Memory" / "MEMORY.md"
    text = read_text(mem_path)
    if text is None:
        return []
    section = find_section(text, "Active Projects")
    if section is None:
        warn("Memory/MEMORY.md: '## Active Projects' section not found")
        return []
    rows = parse_md_table(section)
    mtime = iso_mtime(mem_path)
    portfolio = []
    for row in rows:
        project = clean_inline_md(row.get("Project", "")) or None
        path_cell = row.get("Path", "")
        path = strip_md_link(path_cell).strip("`") or None
        owner = clean_inline_md(row.get("Owner", "")) or None
        stage = clean_inline_md(row.get("Stage", "")) or None
        priority = clean_inline_md(row.get("Priority", "")) or None
        status = clean_inline_md(row.get("Status", "")) or None
        evaluator = clean_inline_md(row.get("Evaluator", "")) or None
        next_action = clean_inline_md(row.get("Next action", "")) or None
        portfolio.append(
            {
                "project": project,
                "path": path,
                "owner": owner,
                "stage": stage,
                "priority": priority,
                "status": status,
                "evaluator": evaluator,
                "next_action": next_action,
                "evidence": {"source": "Memory/MEMORY.md", "mtime": mtime},
            }
        )
    return portfolio


# --------------------------------------------------------------------------
# active_work (HANDOFF.md "## Active Work" -> "### " subsections)
# --------------------------------------------------------------------------


def build_active_work(repo_root: Path) -> list[dict[str, Any]]:
    handoff_path = repo_root / "HANDOFF.md"
    text = read_text(handoff_path)
    if text is None:
        return []

    m = re.search(
        r"^##\s+Active Work\s*$(.*?)(?=^##\s+|\Z)", text, re.MULTILINE | re.DOTALL
    )
    if not m:
        warn("HANDOFF.md: '## Active Work' section not found")
        return []
    body = m.group(1)

    subsections = list(re.finditer(r"^###\s+(.+?)\s*$", body, re.MULTILINE))
    if not subsections:
        return []

    result = []
    for i, sm in enumerate(subsections):
        title = clean_inline_md(sm.group(1))
        start = sm.end()
        end = subsections[i + 1].start() if i + 1 < len(subsections) else len(body)
        chunk = body[start:end]
        items = []
        current: dict[str, Any] | None = None
        for line in chunk.splitlines():
            item_m = re.match(r"^\s*-\s+\[( |x|X)\]\s+(.*)$", line)
            if item_m:
                done = item_m.group(1).lower() == "x"
                current = {"text": item_m.group(2), "done": done}
                items.append(current)
                continue
            # Indented continuation line of the previous checklist item
            # (HANDOFF.md hard-wraps long bullets across lines).
            cont_m = re.match(r"^\s{2,}(\S.*)$", line)
            if cont_m and current is not None:
                current["text"] += " " + cont_m.group(1)
        for item in items:
            item["text"] = clean_inline_md(item["text"])
        result.append({"title": title, "items": items, "source": "HANDOFF.md"})
    return result


# --------------------------------------------------------------------------
# governance (Memory/MEMORY.md "## Key Decisions" + HANDOFF.md "## Decisions")
# --------------------------------------------------------------------------


def _truncate(text: str, limit: int = 200) -> str:
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def build_governance(repo_root: Path) -> list[dict[str, Any]]:
    governance: list[dict[str, Any]] = []

    # Memory/MEMORY.md "## Key Decisions" (has a Date column)
    mem_path = repo_root / "Memory" / "MEMORY.md"
    mem_text = read_text(mem_path)
    if mem_text is not None:
        section = find_section(mem_text, "Key Decisions (cross-project)") or find_section(
            mem_text, "Key Decisions"
        )
        if section is None:
            warn("Memory/MEMORY.md: '## Key Decisions' section not found")
        else:
            for row in parse_md_table(section):
                date = clean_inline_md(row.get("Date", "")) or None
                decision = clean_inline_md(row.get("Decision", ""))
                why = clean_inline_md(row.get("Why", ""))
                combined = decision
                if why:
                    combined = f"{decision} — {why}" if decision else why
                governance.append(
                    {
                        "date": date,
                        "decision": _truncate(combined) if combined else None,
                        "source": "Memory/MEMORY.md",
                    }
                )
    else:
        warn("Memory/MEMORY.md not found; Key Decisions skipped")

    # HANDOFF.md "## Decisions" -> each markdown table, with a date pulled
    # from a preceding bold heading like "**Foo (2026-07-04...)**" if present.
    handoff_path = repo_root / "HANDOFF.md"
    handoff_text = read_text(handoff_path)
    if handoff_text is not None:
        m = re.search(
            r"^##\s+Decisions\s*$(.*?)(?=^##\s+|\Z)",
            handoff_text,
            re.MULTILINE | re.DOTALL,
        )
        if not m:
            warn("HANDOFF.md: '## Decisions' section not found")
        else:
            body = m.group(1)
            # Split the body into chunks, each starting at a bold-heading
            # line (e.g. "**Orphan-skills decision (2026-07-04, user-set):**")
            # or at the very top (uses the ID/Decision/Default table with no
            # date prefix -> date null).
            bold_heading_re = re.compile(r"^\*\*(.+?)\*\*\s*$", re.MULTILINE)
            headings = list(bold_heading_re.finditer(body))

            def date_from_heading(h: str) -> str | None:
                dm = re.search(r"(\d{4}-\d{2}-\d{2})", h)
                return dm.group(1) if dm else None

            # Segment: (date, chunk_text)
            segments: list[tuple[str | None, str]] = []
            if headings:
                # content before first heading (top decisions table, no date)
                pre = body[: headings[0].start()]
                if pre.strip():
                    segments.append((None, pre))
                for i, hm in enumerate(headings):
                    date = date_from_heading(hm.group(1))
                    start = hm.end()
                    end = headings[i + 1].start() if i + 1 < len(headings) else len(body)
                    segments.append((date, body[start:end]))
            else:
                segments.append((None, body))

            for date, chunk in segments:
                rows = parse_md_table(chunk)
                for row in rows:
                    decision_cell = clean_inline_md(row.get("Decision", ""))
                    default_cell = clean_inline_md(
                        row.get("Default taken", "") or row.get("Default", "")
                    )
                    combined = decision_cell
                    if default_cell:
                        combined = (
                            f"{decision_cell} — {default_cell}"
                            if decision_cell
                            else default_cell
                        )
                    if not combined:
                        continue
                    governance.append(
                        {
                            "date": date,
                            "decision": _truncate(combined),
                            "source": "HANDOFF.md",
                        }
                    )
    else:
        warn("HANDOFF.md not found; Decisions skipped")

    return governance


# --------------------------------------------------------------------------
# projects (projects-folder/*/PROJECT_MEMORY.md) + unregistered_projects
# --------------------------------------------------------------------------

SNAPSHOT_FIELDS = [
    "owner",
    "origin",
    "stage",
    "priority",
    "evaluator_status",
    "current_question",
    "next_action",
]

# tolerate common label variants seen across templates / real projects
SNAPSHOT_LABEL_ALIASES = {
    "owner": ["owner"],
    "origin": ["origin", "started"],
    "stage": ["stage"],
    "priority": ["priority"],
    "evaluator_status": ["evaluator_status", "evaluator status", "status"],
    "current_question": [
        "current_question",
        "current question",
        "goal (one sentence)",
        "goal",
    ],
    "next_action": ["next_action", "next action"],
}


def join_wrapped_bullets(section: str) -> list[str]:
    """Join hard-wrapped '- ...' bullet lines: an indented continuation line
    (no leading '- ') is appended to the previous bullet. Returns one string
    per logical bullet (leading '- ' stripped from the raw source line kept
    intact so callers can still match on it)."""
    lines: list[str] = []
    for raw in section.splitlines():
        if re.match(r"^\s*-\s+\S", raw):
            lines.append(raw)
        elif re.match(r"^\s{2,}\S", raw) and lines:
            lines[-1] += " " + raw.strip()
    return lines


def parse_snapshot(text: str) -> dict[str, Any]:
    """Parse the '## Snapshot' section, tolerating both:
    - '- key: value' bullet lists
    - markdown tables with Field/Value-like columns
    Field lookup is alias- and case-insensitive; missing fields -> None.
    """
    snapshot = {k: None for k in SNAPSHOT_FIELDS}
    section = find_section(text, "Snapshot")
    if section is None:
        return snapshot

    # Build alias -> canonical lookup (lowercased)
    alias_to_field = {}
    for field_name, aliases in SNAPSHOT_LABEL_ALIASES.items():
        for a in aliases:
            alias_to_field[a.lower()] = field_name

    # 1) bullet list style: "- key: value" or "- **key**: value" (hard-wrapped
    # continuation lines are joined back onto the bullet first)
    for line in join_wrapped_bullets(section):
        bm = re.match(r"^\s*-\s+(.+?):\s*(.*)$", line)
        if not bm:
            continue
        label = clean_inline_md(bm.group(1)).lower()
        value = clean_inline_md(bm.group(2))
        field_name = alias_to_field.get(label)
        if field_name and value:
            snapshot[field_name] = value

    # 2) table style: | Field | Value | (or similar headers)
    if any(l.strip().startswith("|") for l in section.splitlines()):
        rows = parse_md_table(section)
        for row in rows:
            # try common header names
            label = None
            value = None
            for k, v in row.items():
                kl = k.lower()
                if kl in ("field", "key", "snapshot"):
                    label = clean_inline_md(v).lower()
                elif kl == "value":
                    value = clean_inline_md(v)
            if label is None and len(row) >= 2:
                keys = list(row.keys())
                label = clean_inline_md(row.get(keys[0], "")).lower()
                value = clean_inline_md(row.get(keys[1], ""))
            if label:
                field_name = alias_to_field.get(label)
                if field_name and value:
                    snapshot[field_name] = value

    return snapshot


def parse_evaluation_contract(text: str) -> dict[str, Any]:
    evaluation = {"target": None, "best_known": None, "source": None}
    section = find_section(text, "Evaluation Contract")
    if section is None:
        return evaluation
    evaluation["source"] = "PROJECT_MEMORY.md"
    for line in join_wrapped_bullets(section):
        bm = re.match(r"^\s*-\s+(.+?):\s*(.*)$", line)
        if not bm:
            continue
        label = clean_inline_md(bm.group(1)).lower()
        value = clean_inline_md(bm.group(2))
        if "target" in label and value:
            evaluation["target"] = value
        elif ("best" in label or "baseline" in label) and value:
            evaluation["best_known"] = value
    return evaluation


def parse_os_feedback(text: str) -> list[str]:
    section = find_section(text, "OS Feedback")
    if section is None:
        return []
    lines = []
    for line in join_wrapped_bullets(section):
        lm = re.match(r"^\s*-\s+(.*)$", line)
        if lm:
            content = clean_inline_md(lm.group(1))
            if content:
                lines.append(content)
    return lines


def read_rounds(code_dir: Path) -> list[dict[str, Any]]:
    runs_dir = code_dir / "runs"
    if not runs_dir.is_dir():
        return []
    rounds = []
    for round_dir in sorted(p for p in runs_dir.iterdir() if p.is_dir()):
        result_path = round_dir / "result.json"
        if not result_path.exists():
            continue
        try:
            data = json.loads(result_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError, UnicodeDecodeError) as e:
            warn(f"could not parse {result_path}: {e}")
            continue
        rounds.append(
            {
                "id": data.get("id", round_dir.name),
                "score": data.get("score"),
                "valid": data.get("valid"),
                "artifacts": data.get("artifacts", []),
                "tasks": data.get("tasks", []),
            }
        )
    return rounds


def read_evaluations(project_dir: Path) -> list[str]:
    eval_dir = project_dir / "Evaluations"
    if not eval_dir.is_dir():
        return []
    return sorted(p.name for p in eval_dir.iterdir() if p.is_file())


def read_local_skills(project_dir: Path) -> list[dict[str, Any]]:
    names: set[str] = set()
    for sub in (".claude/skills", ".agents/skills"):
        skills_dir = project_dir / sub
        if skills_dir.is_dir():
            for p in skills_dir.iterdir():
                if p.is_dir():
                    names.add(p.name)
    return [{"name": n, "promotion_candidate": None} for n in sorted(names)]


def build_projects(repo_root: Path) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    projects_folder = repo_root / "projects-folder"
    if not projects_folder.is_dir():
        warn("projects-folder/ not found")
        return [], []

    # registered projects from the portfolio table (for unregistered detection)
    portfolio = build_portfolio(repo_root)
    registered_paths: set[str] = set()
    for row in portfolio:
        p = row.get("path")
        if p:
            registered_paths.add(p.rstrip("/"))

    projects: list[dict[str, Any]] = []
    unregistered: list[dict[str, Any]] = []

    for entry in sorted(projects_folder.iterdir()):
        if not entry.is_dir() or entry.name == "templates":
            continue

        rel_path = f"projects-folder/{entry.name}/"
        is_registered = rel_path.rstrip("/") in registered_paths

        pm_path = entry / "PROJECT_MEMORY.md"
        if not pm_path.exists():
            # No PROJECT_MEMORY.md: not a "project" per schema, but still
            # eligible for unregistered_projects if not in the portfolio.
            if not is_registered:
                unregistered.append({"name": entry.name, "path": rel_path})
            continue

        text = read_text(pm_path)
        if text is None:
            text = ""

        snapshot = parse_snapshot(text)
        evaluation = parse_evaluation_contract(text)
        rounds = read_rounds(entry / "Code")
        evaluations = read_evaluations(entry)
        os_feedback = parse_os_feedback(text)
        local_skills = read_local_skills(entry)

        projects.append(
            {
                "name": entry.name,
                "snapshot": snapshot,
                "evaluation": evaluation,
                "rounds": rounds,
                "evaluations": evaluations,
                "os_feedback": os_feedback,
                "local_skills": local_skills,
            }
        )

        if not is_registered:
            unregistered.append({"name": entry.name, "path": rel_path})

    return projects, unregistered


# --------------------------------------------------------------------------
# store (Research-skills-hub/*, plus .claude/skills & .agents/skills)
# --------------------------------------------------------------------------

COLLECTION_LICENSE_FALLBACK = {
    "science-skills": None,  # resolved by reading its LICENSE file (Apache-2.0)
    "open-paper-skills": "MIT",
    "collected-skills": "上游许可",
}


def parse_frontmatter(text: str) -> dict[str, str]:
    """Minimal YAML frontmatter parser for `name:` / `description:` only.
    Supports plain scalars and simple `>-` folded block scalars."""
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.DOTALL)
    if not m:
        return {}
    fm_text = m.group(1)
    result: dict[str, str] = {}
    lines = fm_text.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        km = re.match(r"^(\w[\w-]*):\s*(.*)$", line)
        if not km:
            i += 1
            continue
        key, rest = km.group(1), km.group(2)
        rest_stripped = rest.strip()
        if rest_stripped in (">-", ">", "|-", "|"):
            # folded/literal block scalar: collect indented continuation lines
            block_lines = []
            i += 1
            while i < len(lines) and (lines[i].startswith((" ", "\t")) or lines[i].strip() == ""):
                block_lines.append(lines[i].strip())
                i += 1
            result[key] = " ".join(l for l in block_lines if l).strip()
            continue
        else:
            value = rest_stripped
            if (value.startswith('"') and value.endswith('"')) or (
                value.startswith("'") and value.endswith("'")
            ):
                value = value[1:-1]
            result[key] = value
        i += 1
    return result


def find_skill_dirs(collection_dir: Path) -> list[Path]:
    """Find all directories under collection_dir that directly contain a
    SKILL.md, including nested bundles (e.g. collected-skills/productivity/*)."""
    return sorted(p.parent for p in collection_dir.rglob("SKILL.md"))


def dirs_byte_equal(a: Path, b: Path) -> bool:
    """Recursively compare two directories byte-for-byte using filecmp."""
    if not a.is_dir() or not b.is_dir():
        return False
    cmp = filecmp.dircmp(a, b)
    if cmp.left_only or cmp.right_only or cmp.diff_files or cmp.funny_files:
        return False
    (matches, mismatches, errors) = filecmp.cmpfiles(
        a, b, cmp.common_files, shallow=False
    )
    if mismatches or errors:
        return False
    for sub in cmp.common_dirs:
        if not dirs_byte_equal(a / sub, b / sub):
            return False
    return True


def build_store(repo_root: Path) -> dict[str, Any]:
    hub_dir = repo_root / "Research-skills-hub"
    claude_dir = repo_root / ".claude" / "skills"
    agents_dir = repo_root / ".agents" / "skills"

    collections: list[dict[str, Any]] = []
    hub_skill_names: set[str] = set()

    if not hub_dir.is_dir():
        warn("Research-skills-hub/ not found")
    else:
        for collection_dir in sorted(p for p in hub_dir.iterdir() if p.is_dir()):
            collection_name = collection_dir.name
            skill_dirs = find_skill_dirs(collection_dir)
            skills = []
            for skill_dir in skill_dirs:
                name = skill_dir.name
                hub_skill_names.add(name)
                skill_md = skill_dir / "SKILL.md"
                text = read_text(skill_md) or ""
                fm = parse_frontmatter(text)
                fm_name = fm.get("name") or name
                description = fm.get("description")
                if description is None:
                    warn(f"{skill_md}: no description in frontmatter")

                license_ = fm.get("license")
                if not license_:
                    local_license = skill_dir / "LICENSE"
                    if local_license.exists():
                        if collection_name == "science-skills":
                            license_text = read_text(local_license) or ""
                            license_ = (
                                "Apache-2.0"
                                if "Apache License" in license_text
                                and "Version 2.0" in license_text
                                else "see LICENSE"
                            )
                        else:
                            license_ = "see LICENSE"
                    else:
                        license_ = COLLECTION_LICENSE_FALLBACK.get(
                            collection_name
                        )
                        if collection_name == "science-skills" and not license_:
                            hub_license = collection_dir / "LICENSE"
                            hub_license_text = read_text(hub_license) or ""
                            license_ = (
                                "Apache-2.0"
                                if "Apache License" in hub_license_text
                                and "Version 2.0" in hub_license_text
                                else "unknown"
                            )
                        if not license_:
                            license_ = "unknown"

                has_scripts = (skill_dir / "scripts").is_dir()

                installed_claude_dir = claude_dir / name
                installed_agents_dir = agents_dir / name
                installed = {
                    ".claude/skills": installed_claude_dir.is_dir(),
                    ".agents/skills": installed_agents_dir.is_dir(),
                }

                if installed[".claude/skills"] and installed[".agents/skills"]:
                    hub_vs_claude = dirs_byte_equal(skill_dir, installed_claude_dir)
                    hub_vs_agents = dirs_byte_equal(skill_dir, installed_agents_dir)
                    sync = (
                        "synced" if (hub_vs_claude and hub_vs_agents) else "drift"
                    )
                elif installed[".claude/skills"] or installed[".agents/skills"]:
                    # Only one of the two install dirs has this skill: per
                    # DESIGN.md this is "drift" regardless of content match
                    # (installed but not fully in sync across both dirs).
                    sync = "drift"
                else:
                    sync = "not_installed"

                skills.append(
                    {
                        "name": fm_name,
                        "description": description,
                        "license": license_,
                        "has_scripts": has_scripts,
                        "installed": installed,
                        "sync": sync,
                    }
                )
            collections.append({"name": collection_name, "skills": skills})

    # orphans: installed (claude or agents) but no hub source
    orphans: list[dict[str, Any]] = []
    installed_names: dict[str, Path] = {}
    for d in (claude_dir, agents_dir):
        if d.is_dir():
            for p in d.iterdir():
                if p.is_dir() and p.name not in installed_names:
                    installed_names[p.name] = p

    for name, sample_dir in sorted(installed_names.items()):
        if name in hub_skill_names:
            continue
        claude_path = claude_dir / name
        agents_path = agents_dir / name
        installed = {
            ".claude/skills": claude_path.is_dir(),
            ".agents/skills": agents_path.is_dir(),
        }
        skill_md = sample_dir / "SKILL.md"
        text = read_text(skill_md) or ""
        fm = parse_frontmatter(text)
        description = fm.get("description")
        if description is None:
            warn(f"{skill_md}: no description in frontmatter (orphan)")
        orphans.append(
            {
                "name": fm.get("name") or name,
                "description": description,
                "installed": installed,
                "sync": "installed_no_hub_source",
            }
        )

    return {"collections": collections, "orphans": orphans}


# --------------------------------------------------------------------------
# activity (git log -15 + per-project progress log latest entry)
# --------------------------------------------------------------------------

PROGRESS_LOG_DATE_RE = re.compile(r"(\d{4}-\d{2}-\d{2})")


def build_activity(repo_root: Path, projects: list[dict[str, Any]]) -> list[dict[str, Any]]:
    activity: list[dict[str, Any]] = []

    try:
        out = subprocess.run(
            [
                "git",
                "-C",
                str(repo_root),
                "log",
                "-15",
                "--pretty=format:%h|%aI|%s",
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if out.returncode == 0:
            for line in out.stdout.splitlines():
                parts = line.split("|", 2)
                if len(parts) != 3:
                    continue
                short_hash, date_iso, subject = parts
                activity.append(
                    {
                        "when": date_iso,
                        "what": subject,
                        "source": f"git {short_hash}",
                    }
                )
        else:
            warn(f"git log failed: {out.stderr.strip()}")
    except Exception as e:  # pragma: no cover - defensive
        warn(f"git log errored: {e}")

    projects_folder = repo_root / "projects-folder"
    for proj in projects:
        name = proj["name"]
        pm_path = projects_folder / name / "PROJECT_MEMORY.md"
        text = read_text(pm_path)
        if text is None:
            continue
        section = find_section(text, "Progress Log")
        if section is None:
            continue
        bullets = join_wrapped_bullets(section)
        first_bullet = None
        for line in bullets:
            bm = re.match(r"^\s*-\s+(.*)$", line)
            if bm:
                first_bullet = clean_inline_md(bm.group(1))
                break
        if not first_bullet:
            continue
        dm = PROGRESS_LOG_DATE_RE.search(first_bullet)
        when = dm.group(1) if dm else None
        activity.append(
            {
                "when": when,
                "what": first_bullet,
                "source": f"{name} progress log",
            }
        )

    # Sort descending by `when`, with entries missing a date placed last.
    with_date = [a for a in activity if a.get("when")]
    without_date = [a for a in activity if not a.get("when")]
    with_date.sort(key=lambda a: a["when"], reverse=True)
    return with_date + without_date


# --------------------------------------------------------------------------
# top-level assembly
# --------------------------------------------------------------------------


def build_state(repo_root: Path) -> dict[str, Any]:
    projects, unregistered = build_projects(repo_root)
    state = {
        "meta": build_meta(repo_root),
        "policy": build_policy(repo_root),
        "portfolio": build_portfolio(repo_root),
        "active_work": build_active_work(repo_root),
        "governance": build_governance(repo_root),
        "projects": projects,
        "unregistered_projects": unregistered,
        "store": build_store(repo_root),
        "activity": build_activity(repo_root, projects),
        "agent_activity": [],
    }
    return state


def write_state(repo_root: Path, state: dict[str, Any]) -> Path:
    out_dir = repo_root / "os-ui" / "frontend" / "public"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "state.json"
    out_path.write_text(
        json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    return out_path


# --------------------------------------------------------------------------
# validate
# --------------------------------------------------------------------------

TOP_LEVEL_KEYS = [
    "meta",
    "policy",
    "portfolio",
    "active_work",
    "governance",
    "projects",
    "unregistered_projects",
    "store",
    "activity",
    "agent_activity",
]


def validate(out_path: Path) -> bool:
    ok = True
    try:
        data = json.loads(out_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as e:
        print(f"[validate] FAIL: could not load {out_path}: {e}", file=sys.stderr)
        return False

    missing = [k for k in TOP_LEVEL_KEYS if k not in data]
    if missing:
        print(f"[validate] FAIL: missing top-level keys: {missing}", file=sys.stderr)
        ok = False

    hub_skill_count = sum(
        len(c.get("skills", [])) for c in data.get("store", {}).get("collections", [])
    )
    orphan_count = len(data.get("store", {}).get("orphans", []))
    total_store = hub_skill_count + orphan_count

    portfolio_count = len(data.get("portfolio", []))
    unregistered_names = {u.get("name") for u in data.get("unregistered_projects", [])}

    print("[validate] summary:")
    print(f"  meta.schema_version      = {data.get('meta', {}).get('schema_version')}")
    print(f"  meta.repo_head           = {data.get('meta', {}).get('repo_head')}")
    print(f"  policy                   = {data.get('policy')}")
    print(f"  portfolio rows           = {portfolio_count}")
    print(f"  active_work sections     = {len(data.get('active_work', []))}")
    print(f"  governance entries       = {len(data.get('governance', []))}")
    print(f"  projects (registered)    = {len(data.get('projects', []))}")
    print(f"  unregistered_projects    = {sorted(unregistered_names)}")
    print(f"  store hub skills         = {hub_skill_count}")
    print(f"  store orphans            = {orphan_count}")
    print(f"  store total (hub+orphan) = {total_store}")
    print(f"  activity entries         = {len(data.get('activity', []))}")
    print(f"  agent_activity           = {data.get('agent_activity')}")

    if hub_skill_count != 33:
        print(
            f"[validate] FAIL: expected 33 hub skills, got {hub_skill_count}",
            file=sys.stderr,
        )
        ok = False
    if orphan_count != 3:
        print(
            f"[validate] FAIL: expected 3 orphan skills, got {orphan_count}",
            file=sys.stderr,
        )
        ok = False
    if portfolio_count < 1:
        print("[validate] FAIL: portfolio has 0 rows, expected >= 1", file=sys.stderr)
        ok = False
    if "Paper_VAE" not in unregistered_names:
        print(
            "[validate] FAIL: 'Paper_VAE' not found in unregistered_projects",
            file=sys.stderr,
        )
        ok = False

    if ok:
        print("[validate] PASS")
    else:
        print("[validate] FAIL (see above)", file=sys.stderr)
    return ok


# --------------------------------------------------------------------------
# watch mode
# --------------------------------------------------------------------------

WATCH_GLOBS = [
    "Memory/MEMORY.md",
    "HANDOFF.md",
]
WATCH_DIR_GLOBS = [
    "projects-folder",
    "Research-skills-hub",
    ".claude/skills",
    ".agents/skills",
]


def collect_watch_targets(repo_root: Path) -> list[Path]:
    targets = []
    for rel in WATCH_GLOBS:
        p = repo_root / rel
        if p.exists():
            targets.append(p)
    for rel in WATCH_DIR_GLOBS:
        d = repo_root / rel
        if d.is_dir():
            for p in d.rglob("*"):
                if p.is_file():
                    targets.append(p)
    return targets


def snapshot_mtimes(paths: list[Path]) -> dict[str, float]:
    snap = {}
    for p in paths:
        try:
            snap[str(p)] = p.stat().st_mtime
        except OSError:
            pass
    return snap


def run_watch(repo_root: Path, poll_seconds: float = 2.0) -> None:
    print(
        "[generator] --watch: foreground dev tool, polling every "
        f"{poll_seconds}s. Ctrl-C to exit."
    )
    state = build_state(repo_root)
    out_path = write_state(repo_root, state)
    validate(out_path)
    watch_targets = collect_watch_targets(repo_root)
    last_snap = snapshot_mtimes(watch_targets)
    print(f"[generator] watching {len(watch_targets)} files for changes...")
    try:
        while True:
            time.sleep(poll_seconds)
            watch_targets = collect_watch_targets(repo_root)
            new_snap = snapshot_mtimes(watch_targets)
            if new_snap != last_snap:
                print("[generator] change detected, regenerating...")
                state = build_state(repo_root)
                out_path = write_state(repo_root, state)
                validate(out_path)
                last_snap = new_snap
    except KeyboardInterrupt:
        print("\n[generator] stopped (Ctrl-C).")


# --------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(description="os-ui state.json generator")
    parser.add_argument(
        "--watch",
        action="store_true",
        help="Foreground dev tool: poll source files every 2s and regenerate.",
    )
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    repo_root = find_repo_root(script_dir)

    if args.watch:
        run_watch(repo_root)
        return

    state = build_state(repo_root)
    out_path = write_state(repo_root, state)
    print(f"[generator] wrote {out_path}")
    ok = validate(out_path)
    if not ok:
        sys.exit(1)


if __name__ == "__main__":
    main()
