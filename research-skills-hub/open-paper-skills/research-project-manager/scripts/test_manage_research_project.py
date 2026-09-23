#!/usr/bin/env python3
"""Tests for manage_research_project on a throwaway repository fixture.

Run from this directory:  python -m unittest test_manage_research_project
"""

from __future__ import annotations

import contextlib
import io
import shutil
import tempfile
import unittest
from pathlib import Path

import manage_research_project as mrp

TEMPLATE_MEMORY = """# Project Memory

> Project-local memory.

## Snapshot

- Project name:
- Started: YYYY-MM-DD — from idea: link the source OKF idea concept under [Ideas](../../ideas/)
- Goal (one sentence):
- Owner: human-led | agent-led | mixed
- Origin:
- Stage: scout | probe | develop | writing | paused | complete | archived
- Priority:
- Status:
- Evaluator status:
- Current question:
- Next action:

## Key Decisions

| Date | Decision | Why | Where reflected |
|---|---|---|---|

## Progress Log

-
"""

MEMORY = """# Research Memory (Global)

## Research Policy

| Policy | Value |
|---|---|
| `agent_led_research` | `off` |

## Active Projects

| Project | Path | Owner | Stage | Priority | Status | Evaluator | Next action |
|---|---|---|---|---|---|---|---|

## Key Decisions (cross-project)

| Date | Decision | Why |
|---|---|---|
"""

PROJECTS_INDEX = """# Projects

Active research projects and reusable project templates.

# Templates

* [AI Research Template](templates/index.md) - Reusable project templates.
"""

IDEA = """---
type: Idea
title: "Demo idea"
description: "An idea used by the tests."
status: draft
created: 2026-09-23
---

# One-liner

Demo.
"""

REQUIRED = ["index.md", "paper_skeleton.md", "log.md", "paper/main.tex",
            "paper/references.bib", "Code/README.md"]


def make_repo(base: Path) -> Path:
    root = base / "repo"
    template = root / "projects-folder" / "templates" / "ai_research_template"
    for rel in REQUIRED:
        target = template / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(f"# {rel}\n", encoding="utf-8")
    (template / "PROJECT_MEMORY.md").write_text(TEMPLATE_MEMORY, encoding="utf-8")
    (root / "projects-folder" / "index.md").write_text(PROJECTS_INDEX, encoding="utf-8")
    (root / "memory").mkdir()
    (root / "memory" / "MEMORY.md").write_text(MEMORY, encoding="utf-8")
    (root / "ideas").mkdir()
    (root / "ideas" / "index.md").write_text("# Ideas\n", encoding="utf-8")
    (root / "ideas" / "demo.md").write_text(IDEA, encoding="utf-8")
    return root


def run(root: Path, *argv: str) -> tuple[int, str, str]:
    out, err = io.StringIO(), io.StringIO()
    code = 0
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        try:
            args = mrp.build_parser().parse_args(["--repo", str(root), *argv])
            args.func(args)
        except SystemExit as exc:
            code = int(exc.code or 0)
    return code, out.getvalue(), err.getvalue()


def codes(root: Path, *argv: str) -> set[str]:
    contract = mrp.load_contract()
    return {f.code for f in mrp.validate_repo(root, contract)}


def errors(root: Path) -> set[str]:
    contract = mrp.load_contract()
    return {f.code for f in mrp.validate_repo(root, contract) if f.level == "error"}


class FixtureCase(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp(prefix="rpm-test-"))
        self.root = make_repo(self.tmp)
        self.addCleanup(shutil.rmtree, self.tmp, True)

    def new_demo(self) -> None:
        code, out, err = run(self.root, "new", "Demo", "--from-idea", "ideas/demo.md",
                             "--goal", "Test the manager.", "--stage", "probe", "--priority", "P1")
        self.assertEqual(code, 0, err)

    def memory(self) -> str:
        return (self.root / "memory" / "MEMORY.md").read_text(encoding="utf-8")

    def project_memory(self) -> Path:
        return self.root / "projects-folder" / "Demo" / "PROJECT_MEMORY.md"


class NewTests(FixtureCase):
    def test_new_creates_fills_registers_and_promotes(self) -> None:
        self.new_demo()
        project_dir = self.root / "projects-folder" / "Demo"
        for rel in REQUIRED + ["PROJECT_MEMORY.md"]:
            self.assertTrue((project_dir / rel).is_file(), rel)
        text = self.project_memory().read_text(encoding="utf-8")
        self.assertIn("- Project name: Demo", text)
        self.assertIn("from idea: [Demo idea](../../ideas/demo.md)", text)
        self.assertIn("- Owner: human-led", text)
        self.assertIn("- Stage: probe", text)
        self.assertIn("- Priority: P1", text)
        self.assertIn("- Goal (one sentence): Test the manager.", text)
        self.assertIn("- Origin: promoted from idea Demo idea", text)
        self.assertIn("- Status:\n", text)               # left for the agent
        self.assertIn("| Demo | `projects-folder/Demo/` | human-led | probe | P1 |  |  |  |", self.memory())
        index = (self.root / "projects-folder" / "index.md").read_text(encoding="utf-8")
        self.assertIn("* [Demo](Demo/index.md) - Test the manager.", index)
        self.assertLess(index.index("* [Demo]"), index.index("# Templates"))
        idea = (self.root / "ideas" / "demo.md").read_text(encoding="utf-8")
        self.assertIn("status: promoted", idea)
        self.assertIn("project: ../projects-folder/Demo/", idea)
        self.assertEqual(errors(self.root), set())
        self.assertIn("snapshot_empty", codes(self.root))     # warnings only

    def test_new_dry_run_writes_nothing(self) -> None:
        before = {p: p.read_text(encoding="utf-8") for p in self.root.rglob("*.md")}
        code, out, _ = run(self.root, "new", "Demo", "--from-idea", "ideas/demo.md", "--dry-run")
        self.assertEqual(code, 0)
        self.assertIn("dry run", out)
        self.assertFalse((self.root / "projects-folder" / "Demo").exists())
        after = {p: p.read_text(encoding="utf-8") for p in self.root.rglob("*.md")}
        self.assertEqual(before, after)

    def test_new_rejects_bad_inputs(self) -> None:
        self.new_demo()
        cases = [
            (["new", "Demo"], "already exists"),
            (["new", "bad name"], "must match"),
            (["new", "templates"], "must match"),
            (["new", "Other", "--template", "nope"], "unknown template"),
            (["new", "Other", "--stage", "flying"], "--stage must be one of"),
            (["new", "Other", "--owner", "robot"], "--owner must be one of"),
            (["new", "Other", "--from-idea", "ideas/index.md"], "not an idea concept"),
            (["new", "Other", "--from-idea", "ideas/demo.md"], "already promoted"),
        ]
        for argv, expected in cases:
            code, _, err = run(self.root, *argv)
            self.assertEqual(code, 1, argv)
            self.assertIn(expected, err, argv)
            self.assertFalse((self.root / "projects-folder" / "Other").exists(), argv)


class ValidateTests(FixtureCase):
    def setUp(self) -> None:
        super().setUp()
        self.new_demo()

    def test_unregistered_project_is_an_error_and_sync_repairs_it(self) -> None:
        memory = self.memory().replace(
            "| Demo | `projects-folder/Demo/` | human-led | probe | P1 |  |  |  |\n", "")
        (self.root / "memory" / "MEMORY.md").write_text(memory, encoding="utf-8")
        self.assertIn("unregistered", errors(self.root))
        code, out, _ = run(self.root, "sync")
        self.assertEqual(code, 0)
        self.assertIn("Demo: added", out)
        self.assertNotIn("unregistered", errors(self.root))

    def test_phantom_row_is_an_error_and_sync_keeps_it(self) -> None:
        memory = self.memory().replace(
            "|---|---|---|---|---|---|---|---|\n",
            "|---|---|---|---|---|---|---|---|\n| Ghost | `projects-folder/Ghost/` | mixed | probe | P2 | x | y | z |\n")
        (self.root / "memory" / "MEMORY.md").write_text(memory, encoding="utf-8")
        self.assertIn("phantom_row", errors(self.root))
        run(self.root, "sync")
        self.assertIn("| Ghost |", self.memory())
        self.assertIn("phantom_row", errors(self.root))

    def test_stage_outside_vocabulary_is_an_error(self) -> None:
        path = self.project_memory()
        path.write_text(path.read_text(encoding="utf-8").replace("- Stage: probe", "- Stage: smoke-test"), encoding="utf-8")
        run(self.root, "sync")
        self.assertIn("stage_vocabulary", errors(self.root))

    def test_missing_label_is_an_error(self) -> None:
        path = self.project_memory()
        path.write_text(path.read_text(encoding="utf-8").replace("- Evaluator status:\n", ""), encoding="utf-8")
        run(self.root, "sync")
        self.assertIn("snapshot_missing_label", errors(self.root))

    def test_row_drift_is_an_error_and_sync_repairs_it(self) -> None:
        memory = self.memory().replace("| human-led | probe | P1 |", "| human-led | develop | P1 |")
        (self.root / "memory" / "MEMORY.md").write_text(memory, encoding="utf-8")
        self.assertIn("row_drift", errors(self.root))
        code, out, _ = run(self.root, "sync")
        self.assertEqual(code, 0)
        self.assertIn("Demo: updated: Stage", out)
        self.assertNotIn("row_drift", errors(self.root))

    def test_hand_edited_snapshot_is_projected_by_sync(self) -> None:
        path = self.project_memory()
        path.write_text(path.read_text(encoding="utf-8").replace(
            "- Next action:", "- Next action: run the first\n  baseline round"), encoding="utf-8")
        self.assertIn("row_drift", errors(self.root))
        run(self.root, "sync")
        self.assertIn("| run the first baseline round |", self.memory())
        self.assertNotIn("row_drift", errors(self.root))

    def test_broken_idea_backlink_is_an_error(self) -> None:
        idea = self.root / "ideas" / "demo.md"
        idea.write_text(idea.read_text(encoding="utf-8").replace("status: promoted", "status: draft"), encoding="utf-8")
        self.assertIn("idea_not_promoted", errors(self.root))
        idea.write_text(idea.read_text(encoding="utf-8")
                        .replace("status: draft", "status: promoted")
                        .replace("project: ../projects-folder/Demo/", "project: ../projects-folder/Elsewhere/"),
                        encoding="utf-8")
        found = errors(self.root)
        self.assertIn("idea_backlink", found)
        self.assertIn("promoted_idea_without_project", found)

    def test_stray_directory_and_missing_file_are_errors(self) -> None:
        (self.root / "projects-folder" / "Stray").mkdir()
        (self.root / "projects-folder" / "Demo" / "log.md").unlink()
        found = errors(self.root)
        self.assertIn("stray_directory", found)
        self.assertIn("missing_required_file", found)

    def test_contract_and_template_must_agree(self) -> None:
        (self.root / "projects-folder" / "templates" / "ai_research_template" / "log.md").unlink()
        self.assertIn("template_lacks_required_file", errors(self.root))

    def test_missing_index_bullet_is_a_warning(self) -> None:
        index = self.root / "projects-folder" / "index.md"
        index.write_text(PROJECTS_INDEX, encoding="utf-8")
        contract = mrp.load_contract()
        findings = {f.code: f.level for f in mrp.validate_repo(self.root, contract)}
        self.assertEqual(findings.get("index_bullet_missing"), "warning")

    def test_portfolio_header_mismatch_is_an_error(self) -> None:
        memory = self.memory().replace("| Evaluator | Next action |", "| Evaluator | Next step |")
        (self.root / "memory" / "MEMORY.md").write_text(memory, encoding="utf-8")
        self.assertIn("portfolio_table", errors(self.root))
        code, _, err = run(self.root, "sync")
        self.assertEqual(code, 1)
        self.assertIn("contract expects", err)

    def test_validate_exit_codes_and_json(self) -> None:
        code, out, _ = run(self.root, "validate", "--json")
        self.assertEqual(code, 0)
        self.assertIn('"ok": true', out)
        (self.root / "projects-folder" / "Stray").mkdir()
        code, out, _ = run(self.root, "validate")
        self.assertEqual(code, 1)
        self.assertIn("stray_directory", out)


class SetTests(FixtureCase):
    def setUp(self) -> None:
        super().setUp()
        self.new_demo()

    def test_set_changes_snapshot_and_row(self) -> None:
        code, out, err = run(self.root, "set", "Demo", "--stage", "develop", "--next-action", "round 1")
        self.assertEqual(code, 0, err)
        text = self.project_memory().read_text(encoding="utf-8")
        self.assertIn("- Stage: develop", text)
        self.assertIn("- Next action: round 1", text)
        self.assertIn("| develop | P1 |  |  | round 1 |", self.memory())
        self.assertNotIn("row_drift", errors(self.root))

    def test_set_rejects_vocabulary_and_empty_calls(self) -> None:
        code, _, err = run(self.root, "set", "Demo", "--stage", "flying")
        self.assertEqual(code, 1)
        self.assertIn("--stage must be one of", err)
        code, _, err = run(self.root, "set", "Demo")
        self.assertEqual(code, 1)
        self.assertIn("nothing to set", err)

    def test_archive_keeps_directory_and_row(self) -> None:
        code, _, err = run(self.root, "archive", "Demo", "--status", "done")
        self.assertEqual(code, 0, err)
        self.assertTrue((self.root / "projects-folder" / "Demo").is_dir())
        self.assertIn("| archived | P1 | done |", self.memory())
        self.assertEqual(errors(self.root), set())

    def test_status_json_shape(self) -> None:
        code, out, _ = run(self.root, "status", "--json")
        self.assertEqual(code, 0)
        for key in ('"portfolio"', '"projects"', '"unregistered_projects"', '"phantom_rows"'):
            self.assertIn(key, out)
        self.assertIn('"registered": true', out)


if __name__ == "__main__":
    unittest.main()
