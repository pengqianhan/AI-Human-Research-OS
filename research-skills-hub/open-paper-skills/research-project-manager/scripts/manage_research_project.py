#!/usr/bin/env python3
"""Manage Research Projects under projects-folder/ against one contract.

A project is a directory directly under projects-folder/ (templates/ excluded)
that contains PROJECT_MEMORY.md. Its `## Snapshot` is the source of project
state; the project's row in memory/MEMORY.md `## Active Projects` is a
projection of that Snapshot, written by `sync` and never by hand. `validate`
reports drift and never edits.

The contract (required files, Snapshot fields, vocabularies, portfolio
columns) lives in assets/project-contract.toml beside this skill.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import shutil
import sys
import tomllib
from dataclasses import dataclass, field
from pathlib import Path

CONTRACT_ASSET = Path(__file__).resolve().parents[1] / "assets" / "project-contract.toml"
COPY_IGNORE = shutil.ignore_patterns(".DS_Store", "__pycache__", "*.pyc", ".venv")
NAME_PATTERN = re.compile(r"^[A-Za-z][A-Za-z0-9_-]*$")
SECTION_END = re.compile(r"^#{1,2}\s+")       # a `#` or `##` heading closes a section
BULLET = re.compile(r"^\s*[-*]\s+(.+?)\s*$")
IDEA_LINK = re.compile(r"\[([^\]]*)\]\(([^)\s]+\.md)\)")
FRONTMATTER_FENCE = re.compile(r"^---\s*$")
SNAPSHOT_HEADING = "Snapshot"
# Keys `set` may change, mapped to their flags. Project name and Started are
# identity, written once by `new`.
SETTABLE = {
    "goal": "--goal",
    "owner": "--owner",
    "origin": "--origin",
    "stage": "--stage",
    "priority": "--priority",
    "status": "--status",
    "evaluator_status": "--evaluator",
    "current_question": "--question",
    "next_action": "--next-action",
}


def fail(message: str) -> None:
    print(f"error: {message}", file=sys.stderr)
    raise SystemExit(1)


# ------------------------------------------------------------------- contract


@dataclass(frozen=True)
class SnapshotField:
    label: str
    key: str


@dataclass(frozen=True)
class Column:
    name: str
    field: str            # a Snapshot key, or "path"


@dataclass(frozen=True)
class Contract:
    projects_root: str
    exclude: frozenset[str]
    memory_file: str
    index_file: str
    index_heading: str
    templates_root: str
    default_template: str
    required_files: tuple[str, ...]
    portfolio_file: str
    portfolio_heading: str
    columns: tuple[Column, ...]
    fields: tuple[SnapshotField, ...]
    stage_vocab: tuple[str, ...]
    owner_vocab: tuple[str, ...]
    ideas_root: str

    def label_for(self, key: str) -> str:
        for f in self.fields:
            if f.key == key:
                return f.label
        raise KeyError(key)

    @property
    def keys(self) -> list[str]:
        return [f.key for f in self.fields]


def load_contract(path: Path = CONTRACT_ASSET) -> Contract:
    if not path.is_file():
        fail(f"contract is missing: {path}")
    with path.open("rb") as handle:
        data = tomllib.load(handle)
    try:
        projects, templates = data["projects"], data["templates"]
        portfolio, vocab = data["portfolio"], data["vocabulary"]
        columns = tuple(Column(c["name"], c["field"]) for c in portfolio["columns"])
        fields = tuple(SnapshotField(f["label"], f["key"]) for f in data["snapshot"]["fields"])
        contract = Contract(
            projects_root=projects["root"],
            exclude=frozenset(projects.get("exclude", [])),
            memory_file=projects["memory_file"],
            index_file=projects["index_file"],
            index_heading=projects["index_heading"],
            templates_root=templates["root"],
            default_template=templates["default"],
            required_files=tuple(templates["required_files"]),
            portfolio_file=portfolio["file"],
            portfolio_heading=portfolio["heading"],
            columns=columns,
            fields=fields,
            stage_vocab=tuple(vocab["stage"]),
            owner_vocab=tuple(vocab["owner"]),
            ideas_root=data["ideas"]["root"],
        )
    except KeyError as exc:
        fail(f"contract {path} is missing key {exc}")
    keys = set(contract.keys)
    for column in contract.columns:
        if column.field != "path" and column.field not in keys:
            fail(f"contract column {column.name!r} maps to unknown Snapshot key {column.field!r}")
    return contract


def find_repo_root(start: Path, contract: Contract) -> Path:
    for candidate in (start.resolve(), *start.resolve().parents):
        if (candidate / contract.projects_root).is_dir() and (candidate / contract.portfolio_file).is_file():
            return candidate
    fail(
        f"could not find the Research OS root ({contract.projects_root}/ and "
        f"{contract.portfolio_file}); run from the repository root or pass --repo"
    )


def repo_root(args: argparse.Namespace, contract: Contract) -> Path:
    if args.repo:
        root = Path(args.repo).expanduser().resolve()
        if not (root / contract.projects_root).is_dir():
            fail(f"{root} does not contain {contract.projects_root}/")
        return root
    return find_repo_root(Path.cwd(), contract)


# ------------------------------------------------------------ markdown helpers


def read_lines(path: Path) -> list[str]:
    return path.read_text(encoding="utf-8").splitlines()


def write_lines(path: Path, lines: list[str]) -> None:
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def section_range(lines: list[str], heading: str, level: int = 2) -> tuple[int, int] | None:
    """Line range [start, end) of the body under `#`*level + heading. The body
    ends at the next `#` or `##` heading, so deeper headings stay inside."""
    pattern = re.compile(rf"^{'#' * level}\s+{re.escape(heading)}\s*$")
    for i, line in enumerate(lines):
        if pattern.match(line):
            end = len(lines)
            for j in range(i + 1, len(lines)):
                if SECTION_END.match(lines[j]):
                    end = j
                    break
            return i + 1, end
    return None


def clean_inline_md(text: str) -> str:
    text = text.strip()
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    return text


def squash(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


@dataclass
class Bullet:
    label: str            # cleaned label text (before the first colon)
    value: str            # raw value, continuation lines joined by one space
    start: int            # first line index
    end: int              # one past the last line


def parse_bullets(lines: list[str], start: int, end: int) -> list[Bullet]:
    """`- label: value` bullets in lines[start:end]; an indented non-bullet line
    continues the previous bullet, as the templates hard-wrap long values."""
    bullets: list[Bullet] = []
    i = start
    while i < end:
        match = BULLET.match(lines[i])
        if match and ":" in match.group(1):
            label, _, value = match.group(1).partition(":")
            j = i + 1
            while (
                j < end
                and lines[j].strip()
                and lines[j].startswith((" ", "\t"))
                and not BULLET.match(lines[j])
            ):
                value += " " + lines[j].strip()
                j += 1
            bullets.append(Bullet(clean_inline_md(label), value.strip(), i, j))
            i = j
        else:
            i += 1
    return bullets


def parse_frontmatter(lines: list[str]) -> tuple[dict[str, str], int, int] | None:
    """(data, first body line index, closing fence index) or None."""
    if not lines or not FRONTMATTER_FENCE.match(lines[0]):
        return None
    for j in range(1, len(lines)):
        if FRONTMATTER_FENCE.match(lines[j]):
            data: dict[str, str] = {}
            for line in lines[1:j]:
                match = re.match(r"^([A-Za-z_][\w-]*):\s*(.*)$", line)
                if match:
                    data[match.group(1)] = match.group(2).strip().strip('"').strip("'")
            return data, 1, j
    return None


def set_frontmatter(lines: list[str], updates: dict[str, str]) -> list[str]:
    parsed = parse_frontmatter(lines)
    if parsed is None:
        fail("file has no YAML frontmatter block")
    _, start, end = parsed
    lines = list(lines)
    for key, value in updates.items():
        for i in range(start, end):
            if re.match(rf"^{re.escape(key)}:", lines[i]):
                lines[i] = f"{key}: {value}"
                break
        else:
            lines.insert(end, f"{key}: {value}")
            end += 1
    return lines


# --------------------------------------------------------------------- model


@dataclass
class Snapshot:
    present: bool
    values: dict[str, str]          # key -> value ("" when empty), present labels only
    missing: list[str]              # contract labels absent from the section
    extra: list[str]                # labels present but unknown to the contract


def parse_snapshot(lines: list[str], contract: Contract) -> Snapshot:
    rng = section_range(lines, SNAPSHOT_HEADING)
    if rng is None:
        return Snapshot(False, {}, [f.label for f in contract.fields], [])
    by_label = {f.label.lower(): f for f in contract.fields}
    values: dict[str, str] = {}
    extra: list[str] = []
    for bullet in parse_bullets(lines, *rng):
        spec = by_label.get(bullet.label.lower())
        if spec is None:
            extra.append(bullet.label)
        elif spec.key not in values:
            values[spec.key] = bullet.value
    missing = [f.label for f in contract.fields if f.key not in values]
    return Snapshot(True, values, missing, extra)


@dataclass
class Project:
    name: str
    dir: Path
    rel_path: str                   # "projects-folder/<name>/"
    snapshot: Snapshot

    def idea_link(self) -> tuple[str, str] | None:
        """(title, relative target) of the idea link in Started, if any."""
        match = IDEA_LINK.search(self.snapshot.values.get("started", ""))
        return (match.group(1), match.group(2)) if match else None

    def idea_path(self) -> Path | None:
        link = self.idea_link()
        return Path(os.path.normpath(self.dir / link[1])) if link else None


def load_project(root: Path, contract: Contract, name: str) -> Project:
    directory = root / contract.projects_root / name
    memory = directory / contract.memory_file
    if name in contract.exclude or not memory.is_file():
        fail(f"{contract.projects_root}/{name}/ is not a project (no {contract.memory_file})")
    lines = read_lines(memory)
    return Project(name, directory, f"{contract.projects_root}/{name}/", parse_snapshot(lines, contract))


def discover(root: Path, contract: Contract) -> tuple[list[Project], list[Path]]:
    """Projects (directories holding PROJECT_MEMORY.md) and stray directories."""
    base = root / contract.projects_root
    projects: list[Project] = []
    strays: list[Path] = []
    for entry in sorted(base.iterdir()):
        if not entry.is_dir() or entry.name in contract.exclude or entry.name.startswith("."):
            continue
        if not (entry / contract.memory_file).is_file():
            strays.append(entry)
            continue
        projects.append(load_project(root, contract, entry.name))
    return projects, strays


def update_snapshot(memory_path: Path, updates: dict[str, str], contract: Contract) -> None:
    """Rewrite Snapshot bullets in place; every other line is left untouched."""
    lines = read_lines(memory_path)
    rng = section_range(lines, SNAPSHOT_HEADING)
    if rng is None:
        fail(f"{memory_path}: no '## {SNAPSHOT_HEADING}' section")
    by_label = {b.label.lower(): b for b in parse_bullets(lines, *rng)}
    edits: list[tuple[int, int, str]] = []
    for key, value in updates.items():
        label = contract.label_for(key)
        bullet = by_label.get(label.lower())
        if bullet is None:
            fail(f"{memory_path}: Snapshot has no '{label}' bullet; add the label first (see validate)")
        edits.append((bullet.start, bullet.end, f"- {label}: {squash(value)}".rstrip()))
    for start, end, text in sorted(edits, reverse=True):
        lines[start:end] = [text]
    write_lines(memory_path, lines)


# ----------------------------------------------------------------- portfolio


def split_cells(line: str) -> list[str]:
    inner = line.strip()
    inner = inner[1:] if inner.startswith("|") else inner
    inner = inner[:-1] if inner.endswith("|") else inner
    return [cell.strip() for cell in re.split(r"(?<!\\)\|", inner)]


def format_row(cells: list[str]) -> str:
    return "| " + " | ".join(cells) + " |"


def normalize_path_cell(cell: str) -> str:
    text = cell.strip()
    match = re.match(r"^\[([^\]]*)\]\(([^)]+)\)$", text)
    if match:
        text = match.group(1)
    return text.strip().strip("`").strip().rstrip("/")


def escape_cell(value: str) -> str:
    return squash(value).replace("|", "\\|")


def unescape_cell(value: str) -> str:
    return squash(value.replace("\\|", "|"))


@dataclass
class Row:
    cells: dict[str, str]           # column name -> raw cell text
    line: int

    def path(self) -> str:
        return normalize_path_cell(self.cells.get("Path", ""))


@dataclass
class Portfolio:
    path: Path
    lines: list[str]
    columns: list[str] = field(default_factory=list)
    header_line: int | None = None
    rows: list[Row] = field(default_factory=list)
    problems: list[str] = field(default_factory=list)


def load_portfolio(root: Path, contract: Contract) -> Portfolio:
    path = root / contract.portfolio_file
    if not path.is_file():
        return Portfolio(path, [], problems=[f"{contract.portfolio_file} is missing"])
    lines = read_lines(path)
    portfolio = Portfolio(path, lines)
    rng = section_range(lines, contract.portfolio_heading)
    if rng is None:
        portfolio.problems.append(
            f"{contract.portfolio_file}: section '## {contract.portfolio_heading}' not found"
        )
        return portfolio
    table = [i for i in range(*rng) if lines[i].lstrip().startswith("|")]
    if len(table) < 2:
        portfolio.problems.append(
            f"{contract.portfolio_file}: no table under '## {contract.portfolio_heading}'"
        )
        return portfolio
    portfolio.header_line = table[0]
    portfolio.columns = split_cells(lines[table[0]])
    expected = [column.name for column in contract.columns]
    if portfolio.columns != expected:
        portfolio.problems.append(
            f"{contract.portfolio_file}: table header is {portfolio.columns}, contract expects {expected}"
        )
        return portfolio
    for i in table[2:]:
        cells = split_cells(lines[i])
        if all(cell == "" for cell in cells):
            continue
        row = {name: (cells[k] if k < len(cells) else "") for k, name in enumerate(portfolio.columns)}
        portfolio.rows.append(Row(row, i))
    return portfolio


def project_cells(project: Project, contract: Contract) -> dict[str, str]:
    cells: dict[str, str] = {}
    for column in contract.columns:
        if column.field == "path":
            cells[column.name] = f"`{project.rel_path}`"
        else:
            cells[column.name] = escape_cell(project.snapshot.values.get(column.field, ""))
    return cells


def differing_columns(actual: dict[str, str], expected: dict[str, str], contract: Contract) -> list[str]:
    diff: list[str] = []
    for column in contract.columns:
        have, want = actual.get(column.name, ""), expected[column.name]
        if column.field == "path":
            same = normalize_path_cell(have) == normalize_path_cell(want)
        else:
            same = unescape_cell(have) == unescape_cell(want)
        if not same:
            diff.append(column.name)
    return diff


def sync_rows(root: Path, contract: Contract, projects: list[Project], dry_run: bool) -> list[tuple[str, str]]:
    """Project each Snapshot onto its portfolio row. Rows without a project
    (phantoms) are left alone; `validate` reports them."""
    portfolio = load_portfolio(root, contract)
    if portfolio.problems:
        fail("; ".join(portfolio.problems))
    by_path = {row.path(): row for row in portfolio.rows}
    lines = portfolio.lines
    changes: list[tuple[str, str]] = []
    inserts: list[str] = []
    dirty = False
    for project in projects:
        cells = project_cells(project, contract)
        text = format_row([cells[name] for name in portfolio.columns])
        row = by_path.get(project.rel_path.rstrip("/"))
        if row is None:
            inserts.append(text)
            changes.append((project.name, "added"))
        else:
            diff = differing_columns(row.cells, cells, contract)
            if diff:
                lines[row.line] = text
                dirty = True
                changes.append((project.name, "updated: " + ", ".join(diff)))
            else:
                changes.append((project.name, "unchanged"))
    if inserts:
        last = portfolio.rows[-1].line if portfolio.rows else portfolio.header_line + 1
        lines[last + 1:last + 1] = inserts
        dirty = True
    if dirty and not dry_run:
        write_lines(portfolio.path, lines)
    return changes


# --------------------------------------------------------------------- index


def index_heading_parts(contract: Contract) -> tuple[str, int]:
    match = re.match(r"^(#+)\s+(.*)$", contract.index_heading)
    if not match:
        fail(f"contract index_heading must be a Markdown heading, got {contract.index_heading!r}")
    return match.group(2).strip(), len(match.group(1))


def index_bullet_present(root: Path, contract: Contract, name: str) -> bool | None:
    """True/False when the index section exists, None when it does not."""
    path = root / contract.index_file
    if not path.is_file():
        return None
    lines = read_lines(path)
    heading, level = index_heading_parts(contract)
    rng = section_range(lines, heading, level)
    if rng is None:
        return None
    pattern = re.compile(rf"^\s*[*-]\s+\[[^\]]*\]\({re.escape(name)}/")
    return any(pattern.match(lines[i]) for i in range(*rng))


def add_index_bullet(root: Path, contract: Contract, project: Project) -> None:
    path = root / contract.index_file
    lines = read_lines(path)
    heading, level = index_heading_parts(contract)
    rng = section_range(lines, heading, level)
    if rng is None:
        fail(f"{contract.index_file}: heading {contract.index_heading!r} not found")
    title = squash(project.snapshot.values.get("project_name", "")) or project.name
    summary = squash(project.snapshot.values.get("goal", "")) or "Newly instantiated project; fill PROJECT_MEMORY.md."
    bullet = f"* [{title}]({project.name}/index.md) - {summary}"
    body = lines[rng[0]:rng[1]]
    bullet_idx = [i for i, line in enumerate(body) if re.match(r"^\s*[*-]\s+", line)]
    if bullet_idx:
        body.insert(bullet_idx[-1] + 1, bullet)
    else:
        while body and not body[-1].strip():
            body.pop()
        body += ["", bullet] if body else [bullet]
        if rng[1] < len(lines):
            body.append("")
    lines[rng[0]:rng[1]] = body
    write_lines(path, lines)


# --------------------------------------------------------------------- ideas


def load_idea(path: Path) -> dict[str, str]:
    if not path.is_file():
        fail(f"idea file not found: {path}")
    parsed = parse_frontmatter(read_lines(path))
    if parsed is None or parsed[0].get("type", "").lower() != "idea":
        fail(f"{path} is not an idea concept (frontmatter needs `type: Idea`)")
    return parsed[0]


def promoted_ideas(root: Path, contract: Contract) -> list[tuple[Path, str]]:
    """(idea path, project value) for every idea whose status is promoted."""
    base = root / contract.ideas_root
    found: list[tuple[Path, str]] = []
    if not base.is_dir():
        return found
    for path in sorted(base.rglob("*.md")):
        parsed = parse_frontmatter(read_lines(path))
        if parsed is None:
            continue
        data = parsed[0]
        if data.get("type", "").lower() == "idea" and data.get("status", "").lower() == "promoted":
            found.append((path, data.get("project", "")))
    return found


# ------------------------------------------------------------------ validate


@dataclass
class Finding:
    level: str            # error | warning
    scope: str            # project name, "portfolio", "template:<name>", "ideas"
    code: str
    message: str


def validate_repo(root: Path, contract: Contract) -> list[Finding]:
    findings: list[Finding] = []

    def error(scope: str, code: str, message: str) -> None:
        findings.append(Finding("error", scope, code, message))

    def warning(scope: str, code: str, message: str) -> None:
        findings.append(Finding("warning", scope, code, message))

    # Contract and templates must describe the same scaffold.
    templates_dir = root / contract.templates_root
    template_dirs = [p for p in sorted(templates_dir.iterdir()) if p.is_dir()] if templates_dir.is_dir() else []
    if not template_dirs:
        error("templates", "no_templates", f"no template directories under {contract.templates_root}/")
    if not (templates_dir / contract.default_template).is_dir():
        error("templates", "default_template_missing",
              f"default template {contract.default_template!r} is not under {contract.templates_root}/")
    for template in template_dirs:
        scope = f"template:{template.name}"
        for rel in contract.required_files:
            if not (template / rel).is_file():
                error(scope, "template_lacks_required_file",
                      f"contract requires {rel} but the template does not ship it")
        memory = template / contract.memory_file
        if memory.is_file():
            snapshot = parse_snapshot(read_lines(memory), contract)
            for label in snapshot.missing:
                error(scope, "template_lacks_snapshot_label", f"template Snapshot has no '{label}' bullet")
            for label in snapshot.extra:
                warning(scope, "template_extra_snapshot_label",
                        f"template Snapshot bullet '{label}' is not in the contract")

    portfolio = load_portfolio(root, contract)
    for problem in portfolio.problems:
        error("portfolio", "portfolio_table", problem)
    rows_by_path = {row.path(): row for row in portfolio.rows}

    projects, strays = discover(root, contract)
    project_dirs = {project.dir for project in projects}
    for stray in strays:
        error(stray.name, "stray_directory",
              f"{contract.projects_root}/{stray.name}/ has no {contract.memory_file}; it is neither a project nor a template")

    for project in projects:
        scope = project.name
        for rel in contract.required_files:
            if not (project.dir / rel).is_file():
                error(scope, "missing_required_file", f"required file {rel} is missing")
        snapshot = project.snapshot
        if not snapshot.present:
            error(scope, "snapshot_missing", f"{contract.memory_file} has no '## {SNAPSHOT_HEADING}' section")
        for label in snapshot.missing:
            error(scope, "snapshot_missing_label", f"Snapshot has no '{label}' bullet")
        for key, value in snapshot.values.items():
            if not value:
                warning(scope, "snapshot_empty", f"'{contract.label_for(key)}' is empty")
        stage = snapshot.values.get("stage", "")
        if stage and stage not in contract.stage_vocab:
            error(scope, "stage_vocabulary",
                  f"Stage {stage!r} is not one of {', '.join(contract.stage_vocab)}")
        owner = snapshot.values.get("owner", "")
        if owner and owner not in contract.owner_vocab:
            error(scope, "owner_vocabulary",
                  f"Owner {owner!r} is not one of {', '.join(contract.owner_vocab)}")

        row = rows_by_path.get(project.rel_path.rstrip("/"))
        if row is None:
            if not portfolio.problems:
                error(scope, "unregistered", f"no row in {contract.portfolio_file} '## {contract.portfolio_heading}'; run sync")
        else:
            diff = differing_columns(row.cells, project_cells(project, contract), contract)
            if diff:
                error(scope, "row_drift",
                      f"portfolio row differs from the Snapshot in: {', '.join(diff)}; run sync")

        link = project.idea_link()
        if link:
            idea_path = project.idea_path()
            if not idea_path.is_file():
                error(scope, "idea_missing", f"Started links to {link[1]} but the file does not exist")
            else:
                parsed = parse_frontmatter(read_lines(idea_path))
                data = parsed[0] if parsed else {}
                if data.get("type", "").lower() != "idea":
                    error(scope, "idea_type", f"{link[1]} is not `type: Idea`")
                if data.get("status", "").lower() != "promoted":
                    error(scope, "idea_not_promoted", f"{link[1]} has status {data.get('status', '')!r}, expected 'promoted'")
                target = data.get("project", "")
                if not target or Path(os.path.normpath(idea_path.parent / target)) != project.dir:
                    error(scope, "idea_backlink", f"{link[1]} `project:` does not point back to {project.rel_path}")

        present = index_bullet_present(root, contract, project.name)
        if present is False:
            warning(scope, "index_bullet_missing",
                    f"{contract.index_file} has no bullet for {project.name}/ under {contract.index_heading!r}")

    for row in portfolio.rows:
        path = row.path()
        directory = root / path if path else None
        if directory is None or directory not in project_dirs:
            error("portfolio", "phantom_row", f"row {row.cells.get('Path', '')!r} has no project directory")

    for idea_path, target in promoted_ideas(root, contract):
        rel = idea_path.relative_to(root)
        if not target:
            error("ideas", "promoted_idea_without_project", f"{rel} is promoted but has no `project:`")
        elif Path(os.path.normpath(idea_path.parent / target)) not in project_dirs:
            error("ideas", "promoted_idea_without_project", f"{rel} `project:` {target} is not a project directory")
    return findings


def print_findings(findings: list[Finding], project_count: int) -> None:
    by_scope: dict[str, list[Finding]] = {}
    for finding in findings:
        by_scope.setdefault(finding.scope, []).append(finding)
    for scope, items in by_scope.items():
        print(scope)
        for finding in items:
            print(f"  {finding.level.upper():8} {finding.code:32} {finding.message}")
    errors = sum(1 for f in findings if f.level == "error")
    warnings = len(findings) - errors
    if errors:
        print(f"validate: {errors} error(s), {warnings} warning(s)")
    else:
        print(f"validate: ok ({project_count} project(s), {warnings} warning(s))")


# ------------------------------------------------------------------ commands


def command_status(args: argparse.Namespace) -> None:
    contract = load_contract()
    root = repo_root(args, contract)
    portfolio = load_portfolio(root, contract)
    projects, strays = discover(root, contract)
    project_paths = {project.rel_path.rstrip("/") for project in projects}
    rows_by_path = {row.path(): row for row in portfolio.rows}

    portfolio_json = []
    for row in portfolio.rows:
        cells = {name: unescape_cell(row.cells.get(name, "")) for name in portfolio.columns}
        portfolio_json.append({
            "project": cells.get("Project") or None,
            "path": row.path() + "/" if row.path() else None,
            "owner": cells.get("Owner") or None,
            "stage": cells.get("Stage") or None,
            "priority": cells.get("Priority") or None,
            "status": cells.get("Status") or None,
            "evaluator": cells.get("Evaluator") or None,
            "next_action": cells.get("Next action") or None,
            "registered_dir": row.path() in project_paths,
        })
    projects_json = []
    for project in projects:
        link = project.idea_link()
        projects_json.append({
            "name": project.name,
            "path": project.rel_path,
            "registered": project.rel_path.rstrip("/") in rows_by_path,
            "snapshot": {key: (project.snapshot.values.get(key) or None) for key in contract.keys},
            "missing_labels": project.snapshot.missing,
            "idea": link[1] if link else None,
        })
    unregistered = [{"name": p.name, "path": p.rel_path} for p in projects
                    if p.rel_path.rstrip("/") not in rows_by_path]
    phantoms = [{"project": unescape_cell(row.cells.get("Project", "")), "path": row.path() + "/"}
                for row in portfolio.rows if row.path() not in project_paths]
    stray_json = [{"name": p.name, "path": f"{contract.projects_root}/{p.name}/"} for p in strays]

    if args.json:
        print(json.dumps({
            "portfolio": portfolio_json,
            "projects": projects_json,
            "unregistered_projects": unregistered,
            "phantom_rows": phantoms,
            "stray_directories": stray_json,
            "portfolio_problems": portfolio.problems,
        }, indent=2, ensure_ascii=False))
        return

    for problem in portfolio.problems:
        print(f"PROBLEM  {problem}")
    if not projects:
        print(f"no projects under {contract.projects_root}/")
    for entry in projects_json:
        snap = entry["snapshot"]
        flag = "registered" if entry["registered"] else "UNREGISTERED"
        print(f"{entry['name']}  {flag}  stage={snap['stage'] or '-'}  owner={snap['owner'] or '-'}  priority={snap['priority'] or '-'}")
        print(f"    status: {snap['status'] or '-'}")
        print(f"    next:   {snap['next_action'] or '-'}")
        if entry["missing_labels"]:
            print(f"    missing Snapshot labels: {', '.join(entry['missing_labels'])}")

    def listing(title: str, items: list[str]) -> None:
        print(f"{title}: {', '.join(items) if items else 'none'}")

    listing("unregistered projects (directory, no portfolio row)", [u["name"] for u in unregistered])
    listing("phantom rows (portfolio row, no directory)", [p["path"] for p in phantoms])
    listing(f"stray directories (no {contract.memory_file})", [s["name"] for s in stray_json])


def command_validate(args: argparse.Namespace) -> None:
    contract = load_contract()
    root = repo_root(args, contract)
    findings = validate_repo(root, contract)
    projects, _ = discover(root, contract)
    if args.project:
        if not any(project.name == args.project for project in projects):
            fail(f"{args.project!r} is not a project under {contract.projects_root}/")
        findings = [f for f in findings if f.scope in (args.project, "portfolio", "templates")
                    or f.scope.startswith("template:")]
    errors = sum(1 for f in findings if f.level == "error")
    if args.json:
        print(json.dumps({
            "ok": errors == 0,
            "errors": errors,
            "warnings": len(findings) - errors,
            "findings": [f.__dict__ for f in findings],
        }, indent=2, ensure_ascii=False))
    else:
        print_findings(findings, 1 if args.project else len(projects))
    raise SystemExit(1 if errors else 0)


def resolve_under_root(root: Path, raw: str) -> Path:
    path = Path(raw).expanduser()
    path = path if path.is_absolute() else root / path
    path = Path(os.path.normpath(path))
    if root not in path.parents:
        fail(f"{raw} is outside the repository root {root}")
    return path


def command_new(args: argparse.Namespace) -> None:
    contract = load_contract()
    root = repo_root(args, contract)
    name = args.name
    if not NAME_PATTERN.match(name) or name in contract.exclude:
        fail(f"project name {name!r} must match {NAME_PATTERN.pattern} and not be one of {sorted(contract.exclude)}")
    dest = root / contract.projects_root / name
    if dest.exists():
        fail(f"{contract.projects_root}/{name}/ already exists")
    template_name = args.template or contract.default_template
    templates_dir = root / contract.templates_root
    template = templates_dir / template_name
    if not template.is_dir():
        available = sorted(p.name for p in templates_dir.iterdir() if p.is_dir()) if templates_dir.is_dir() else []
        fail(f"unknown template {template_name!r}; available: {', '.join(available) or 'none'}")
    if not (template / contract.memory_file).is_file():
        fail(f"template {template_name!r} has no {contract.memory_file}")
    if args.stage not in contract.stage_vocab:
        fail(f"--stage must be one of {', '.join(contract.stage_vocab)}")
    if args.owner not in contract.owner_vocab:
        fail(f"--owner must be one of {', '.join(contract.owner_vocab)}")
    portfolio = load_portfolio(root, contract)
    if portfolio.problems:
        fail("; ".join(portfolio.problems))

    idea_path: Path | None = None
    idea_title = ""
    if args.from_idea:
        idea_path = resolve_under_root(root, args.from_idea)
        data = load_idea(idea_path)
        idea_title = data.get("title", "") or idea_path.stem
        target = data.get("project", "")
        if data.get("status", "").lower() == "promoted" and target:
            existing = Path(os.path.normpath(idea_path.parent / target))
            if existing != dest:
                fail(f"{idea_path.relative_to(root)} is already promoted to {target}")

    today = dt.date.today().isoformat()
    started = today
    if idea_path is not None:
        rel_idea = os.path.relpath(idea_path, dest)
        started = f"{today} — from idea: [{idea_title}]({rel_idea})"
    updates = {
        "project_name": name,
        "started": started,
        "owner": args.owner,
        "stage": args.stage,
        "priority": args.priority,
    }
    if args.goal:
        updates["goal"] = args.goal
    origin = args.origin or (f"promoted from idea {idea_title}" if idea_path is not None else "")
    if origin:
        updates["origin"] = origin

    plan = [
        f"copy {contract.templates_root}/{template_name}/ -> {contract.projects_root}/{name}/",
        "fill Snapshot: " + ", ".join(f"{contract.label_for(k)}={v!r}" for k, v in updates.items()),
        f"add row to {contract.portfolio_file} '## {contract.portfolio_heading}'",
        f"add bullet to {contract.index_file} under {contract.index_heading!r}",
    ]
    if idea_path is not None:
        plan.append(f"promote {idea_path.relative_to(root)}: status=promoted, project={os.path.relpath(dest, idea_path.parent)}/")
    if args.dry_run:
        print("dry run; would:")
        for step in plan:
            print(f"  - {step}")
        return

    shutil.copytree(template, dest, ignore=COPY_IGNORE)
    update_snapshot(dest / contract.memory_file, updates, contract)
    project = load_project(root, contract, name)
    sync_rows(root, contract, [project], dry_run=False)
    add_index_bullet(root, contract, project)
    if idea_path is not None:
        rel_project = os.path.relpath(dest, idea_path.parent) + "/"
        write_lines(idea_path, set_frontmatter(read_lines(idea_path), {"status": "promoted", "project": rel_project}))

    print(f"created {contract.projects_root}/{name}/ from {template_name}")
    for step in plan[1:]:
        print(f"  - {step}")
    empty = [contract.label_for(k) for k, v in project.snapshot.values.items() if not v]
    print("next: fill the remaining Snapshot fields (" + ", ".join(empty) + "), "
          "paper_skeleton.md Snapshot, and paper/main.tex title; then run validate")


def command_set(args: argparse.Namespace) -> None:
    contract = load_contract()
    root = repo_root(args, contract)
    project = load_project(root, contract, args.project)
    updates = {key: getattr(args, key) for key in SETTABLE if getattr(args, key) is not None}
    if not updates:
        fail("nothing to set; pass at least one of " + ", ".join(SETTABLE.values()))
    apply_updates(root, contract, project, updates, args.dry_run)


def command_archive(args: argparse.Namespace) -> None:
    contract = load_contract()
    root = repo_root(args, contract)
    project = load_project(root, contract, args.project)
    updates = {"stage": "archived"}
    if args.status is not None:
        updates["status"] = args.status
    apply_updates(root, contract, project, updates, args.dry_run)


def apply_updates(root: Path, contract: Contract, project: Project, updates: dict[str, str], dry_run: bool) -> None:
    if "stage" in updates and updates["stage"] not in contract.stage_vocab:
        fail(f"--stage must be one of {', '.join(contract.stage_vocab)}")
    if "owner" in updates and updates["owner"] not in contract.owner_vocab:
        fail(f"--owner must be one of {', '.join(contract.owner_vocab)}")
    for key in updates:
        if key not in project.snapshot.values:
            fail(f"{project.rel_path}{contract.memory_file}: Snapshot has no '{contract.label_for(key)}' bullet; add the label first (see validate)")
    if dry_run:
        print(f"dry run; would set on {project.rel_path}: " + ", ".join(f"{contract.label_for(k)}={v!r}" for k, v in updates.items()))
        return
    update_snapshot(project.dir / contract.memory_file, updates, contract)
    refreshed = load_project(root, contract, project.name)
    changes = sync_rows(root, contract, [refreshed], dry_run=False)
    print(f"{project.rel_path}: set " + ", ".join(f"{contract.label_for(k)}={v!r}" for k, v in updates.items()))
    for name, change in changes:
        print(f"  portfolio row: {change}")


def command_sync(args: argparse.Namespace) -> None:
    contract = load_contract()
    root = repo_root(args, contract)
    projects, _ = discover(root, contract)
    if args.project:
        chosen = [p for p in projects if p.name in args.project]
        unknown = set(args.project) - {p.name for p in chosen}
        if unknown:
            fail(f"not a project: {', '.join(sorted(unknown))}")
        projects = chosen
    changes = sync_rows(root, contract, projects, dry_run=args.dry_run)
    prefix = "dry run; would " if args.dry_run else ""
    for name, change in changes:
        print(f"{prefix}{name}: {change}")
    if not changes:
        print(f"no projects under {contract.projects_root}/")


# -------------------------------------------------------------------- parser


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--repo", help="repository root; defaults to searching upward from cwd")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("status", help="show every project, its Snapshot, and portfolio consistency")
    p.add_argument("--json", action="store_true")
    p.set_defaults(func=command_status)

    p = sub.add_parser("validate", help="check projects against the contract; exit 1 on errors")
    p.add_argument("project", nargs="?", help="restrict findings to one project")
    p.add_argument("--all", action="store_true", help="every project (the default)")
    p.add_argument("--json", action="store_true")
    p.set_defaults(func=command_validate)

    p = sub.add_parser("new", help="instantiate a project from a template and register it")
    p.add_argument("name", help="directory name under projects-folder/")
    p.add_argument("--template", default=None, help="template directory name (default from the contract)")
    p.add_argument("--from-idea", help="idea concept file to promote and link")
    p.add_argument("--owner", default="human-led")
    p.add_argument("--stage", default="scout")
    p.add_argument("--priority", default="P2")
    p.add_argument("--goal", help="one-sentence goal")
    p.add_argument("--origin", help="where the project came from")
    p.add_argument("--dry-run", action="store_true", help="print the plan without writing")
    p.set_defaults(func=command_new)

    p = sub.add_parser("set", help="change Snapshot fields and re-project the portfolio row")
    p.add_argument("project")
    for key, flag in SETTABLE.items():
        p.add_argument(flag, dest=key)
    p.add_argument("--dry-run", action="store_true")
    p.set_defaults(func=command_set)

    p = sub.add_parser("sync", help="rewrite portfolio rows from every Snapshot")
    p.add_argument("project", nargs="*", help="restrict to these projects")
    p.add_argument("--dry-run", action="store_true")
    p.set_defaults(func=command_sync)

    p = sub.add_parser("archive", help="set Stage to archived; the directory and row stay")
    p.add_argument("project")
    p.add_argument("--status", help="also set Status")
    p.add_argument("--dry-run", action="store_true")
    p.set_defaults(func=command_archive)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
