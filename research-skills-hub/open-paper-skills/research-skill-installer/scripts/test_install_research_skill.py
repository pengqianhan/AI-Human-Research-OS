#!/usr/bin/env python3
"""Tests for install_research_skill.py, each case in a throwaway repository.

Run from this directory:  python -m unittest test_install_research_skill

The installer writes real skill folders, some of them in the home folder. So
no case runs it in place: each builds a temp repository holding a copy of the
script and its own target table (the script reads assets/targets.toml next to
itself), and runs that copy as a subprocess with --repo, the working
directory, HOME and USERPROFILE all inside the temp folder, and an explicit
--target. `run` asserts this before anything runs.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().with_name("install_research_skill.py")
INSTALLER = Path("research-skills-hub", "open-paper-skills", "research-skill-installer")
MUTATING = {"install", "remove", "disable", "enable"}

# No global rows: a case never needs one, so none can reach a home folder.
TARGETS = """\
[[target]]
name = "repo-claude"
path = ".claude/skills"
scope = "repo"
agent = "claude"
default = true

[[target]]
name = "repo-codex"
path = ".agents/skills"
scope = "repo"
agent = "codex"
default = true

[[target]]
name = "project-claude"
glob = "projects-folder/*"
subdir = ".claude/skills"
exclude = ["templates"]
scope = "project"
agent = "claude"
"""


def _can_link() -> bool:
    probe = Path(tempfile.mkdtemp(prefix="installer-link-probe-"))
    try:
        (probe / "d").mkdir()
        os.symlink("d", probe / "l", target_is_directory=True)
        return True
    except (OSError, NotImplementedError):
        return False
    finally:
        shutil.rmtree(probe, ignore_errors=True)


CAN_LINK = _can_link()


def skill_md(name: str) -> str:
    return f"---\nname: {name}\ndescription: A test fixture.\n---\n\n# {name}\n"


@unittest.skipUnless(CAN_LINK, "symbolic links cannot be made here")
class InstallerCase(unittest.TestCase):
    def setUp(self) -> None:
        # resolve(): on macOS the temp folder sits behind the /var link.
        self.tmp = Path(tempfile.mkdtemp(prefix="installer-test-")).resolve()
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.repo = self.tmp / "repo"
        self.home = self.tmp / "home"
        self.elsewhere = self.tmp / "elsewhere"   # outside every target
        for d in (self.repo, self.home, self.elsewhere):
            d.mkdir()

        hub = self.repo / "research-skills-hub"
        self.write(hub / "linked" / "SOURCE.md", "# linked\n\n- **Install form**: `symlink`.\n")
        self.write(hub / "linked" / "alpha" / "SKILL.md", skill_md("alpha"))
        self.write(hub / "linked" / "alpha" / "reference.md", "alpha's reference\n")
        self.write(hub / "copied" / "SOURCE.md", "# copied\n\n- **Install form**: `copy`.\n")
        self.write(hub / "copied" / "beta" / "SKILL.md", skill_md("beta"))
        self.write(hub / "copied" / "beta" / "scripts" / "tool.py", "print('beta')\n")
        self.alpha_hub = hub / "linked" / "alpha"
        self.beta_hub = hub / "copied" / "beta"

        self.script = self.repo / INSTALLER / "scripts" / SCRIPT.name
        self.script.parent.mkdir(parents=True)
        shutil.copy2(SCRIPT, self.script)
        self.write(self.repo / INSTALLER / "assets" / "targets.toml", TARGETS)

        self.claude = self.repo / ".claude" / "skills"
        self.codex = self.repo / ".agents" / "skills"
        self.claude.mkdir(parents=True)
        self.codex.mkdir(parents=True)

    # ------------------------------------------------------------- helpers

    def write(self, path: Path, text: str) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    def link(self, path: Path, to: Path) -> None:
        """A relative link, as the installer writes inside a repository."""
        path.parent.mkdir(parents=True, exist_ok=True)
        os.symlink(os.path.relpath(to, path.parent), path, target_is_directory=True)
        self.assertTrue(path.resolve().is_relative_to(self.tmp), f"fixture link leaves the temp folder: {path}")

    def projects(self, *names: str) -> list[Path]:
        dirs = []
        for name in names:
            d = self.repo / "projects-folder" / name / ".claude" / "skills"
            d.mkdir(parents=True)
            dirs.append(d)
        return dirs

    def run_installer(self, *args: str) -> subprocess.CompletedProcess[str]:
        repo, home, script = self.repo.resolve(), self.home.resolve(), self.script.resolve()
        for path in (repo, home, script):
            self.assertTrue(path.is_relative_to(self.tmp), f"outside the temp folder: {path}")
        self.assertNotEqual(repo, SCRIPT.parents[4].resolve(), "would run on the real repository")
        if args and args[0] in MUTATING:
            self.assertIn("--target", args, "a mutating run names its target")
            self.assertNotIn("--all-targets", args)
            named = [args[i + 1] for i, a in enumerate(args) if a == "--target"]
            self.assertFalse(any(t.startswith("global-") for t in named), named)
        env = dict(os.environ, HOME=str(home), USERPROFILE=str(home), PYTHONDONTWRITEBYTECODE="1")
        return subprocess.run(
            [sys.executable, str(script), "--repo", str(repo), *args],
            cwd=repo, env=env, capture_output=True, text=True, timeout=60,
        )

    def ok(self, *args: str) -> subprocess.CompletedProcess[str]:
        result = self.run_installer(*args)
        self.assertEqual(result.returncode, 0, f"{args}: {result.stdout}{result.stderr}")
        return result

    def snapshot(self) -> dict[str, tuple]:
        """Every entry under the temp folder: links by value, files by bytes."""
        out: dict[str, tuple] = {}

        def walk(d: Path) -> None:
            for entry in sorted(os.scandir(d), key=lambda e: e.name):
                rel = Path(entry.path).relative_to(self.tmp).as_posix()
                if entry.is_symlink():
                    out[rel] = ("link", os.readlink(entry.path))
                elif entry.is_dir():
                    out[rel] = ("dir",)
                    walk(Path(entry.path))
                else:
                    out[rel] = ("file", Path(entry.path).read_bytes())

        walk(self.tmp)
        return out

    def files(self, root: Path) -> dict[str, bytes]:
        return {p.relative_to(root).as_posix(): p.read_bytes() for p in sorted(root.rglob("*")) if p.is_file()}

    def assertRefused(self, result: subprocess.CompletedProcess[str], before: dict[str, tuple],
                      said: str) -> None:
        """Not one byte changed under the temp folder, a non-zero exit, and
        the one `error: <said>; nothing was changed.` line the app's panel shows."""
        after = self.snapshot()
        changes = {
            "lost": sorted(k for k in before if k not in after),
            "added": sorted(k for k in after if k not in before),
            "changed": sorted(k for k in before if k in after and before[k] != after[k]),
        }
        self.assertEqual(changes, {"lost": [], "added": [], "changed": []},
                         f"exit {result.returncode}\n{result.stdout}{result.stderr}")
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertEqual(result.stderr, f"error: {said}; nothing was changed.\n")

    # The refusals' words, one per rule.
    def linked_holding_area(self, target: Path) -> str:
        return f"{target / '.disabled'} is a symbolic link, not a folder of disabled skills"

    def real_folder(self, path: Path) -> str:
        return f"{path} is a real folder, not a symbolic link"

    def link_for_copy(self, path: Path) -> str:
        return f"{path} is a symbolic link, but this skill is installed as a copy"

    def rename_target_exists(self, path: Path) -> str:
        return f"{path} already exists, and the rename would replace it"


class GreenBeforeAndAfter(InstallerCase):
    """What the installer already does right; the hardening must not change it."""

    def test_link_form_round_trip(self) -> None:
        live, off = self.claude / "alpha", self.claude / ".disabled" / "alpha"
        self.ok("install", "alpha", "--target", "repo-claude")
        self.assertTrue(live.is_symlink())
        self.assertEqual(live.resolve(), self.alpha_hub.resolve())
        value = os.readlink(live)

        self.assertIn("disable:", self.ok("disable", "alpha", "--target", "repo-claude").stdout)
        self.assertFalse(live.is_symlink() or live.exists())
        self.assertTrue(off.is_symlink())
        self.assertEqual(off.resolve(), self.alpha_hub.resolve())
        state = json.loads(self.run_installer("status", "alpha", "--target", "repo-claude", "--json").stdout)
        self.assertEqual([i["disabled"] for i in state[0]["installs"]], [True])

        self.assertIn("enable:", self.ok("enable", "alpha", "--target", "repo-claude").stdout)
        self.assertTrue(live.is_symlink())
        self.assertEqual(os.readlink(live), value)
        self.assertFalse((self.claude / ".disabled").exists())

    def test_copy_form_round_trip(self) -> None:
        install = self.claude / "beta"
        hub_before = self.files(self.beta_hub)
        self.ok("install", "beta", "--target", "repo-claude")
        self.assertFalse(install.is_symlink())
        self.assertEqual(self.files(install), hub_before)

        self.ok("disable", "beta", "--target", "repo-claude")
        self.assertFalse((install / "SKILL.md").exists())
        self.assertEqual((install / "SKILL.md.disabled").read_bytes(), hub_before["SKILL.md"])

        self.ok("enable", "beta", "--target", "repo-claude")
        self.assertEqual(self.files(install), hub_before)
        self.assertEqual(self.files(self.beta_hub), hub_before)
        self.ok("status", "beta", "--target", "repo-claude")

    def test_copy_form_update_over_drifted_copy(self) -> None:
        install = self.claude / "beta"
        self.ok("install", "beta", "--target", "repo-claude")
        self.write(install / "SKILL.md", "edited by hand\n")
        self.write(install / "stray.txt", "not in the hub\n")
        drifted = self.run_installer("status", "beta", "--target", "repo-claude")
        self.assertEqual(drifted.returncode, 1)
        self.assertIn("drifted", drifted.stdout)

        self.ok("install", "beta", "--target", "repo-claude", "--update")
        self.assertEqual(self.files(install), self.files(self.beta_hub))
        self.ok("status", "beta", "--target", "repo-claude")

    def test_remove_each_form(self) -> None:
        hub_before = self.snapshot()
        hub_before = {k: v for k, v in hub_before.items() if k.startswith("repo/research-skills-hub/")}
        for skill in ("alpha", "beta"):
            self.ok("install", skill, "--target", "repo-claude", "--target", "repo-codex")
        self.ok("disable", "alpha", "--target", "repo-codex")   # a disabled install is removed too
        for skill in ("alpha", "beta"):
            self.ok("remove", skill, "--yes", "--target", "repo-claude", "--target", "repo-codex")
        for target in (self.claude, self.codex):
            for path in (target / "alpha", target / "beta", target / ".disabled" / "alpha"):
                self.assertFalse(path.is_symlink() or path.exists(), path)
        now = {k: v for k, v in self.snapshot().items() if k.startswith("repo/research-skills-hub/")}
        self.assertEqual(now, hub_before)

    def test_install_over_a_disabled_install(self) -> None:
        live = self.claude / "alpha"
        self.ok("install", "alpha", "--target", "repo-claude")
        value = os.readlink(live)
        self.ok("disable", "alpha", "--target", "repo-claude")
        self.assertIn("re-enable", self.ok("install", "alpha", "--target", "repo-claude").stdout)
        self.assertEqual(os.readlink(live), value)
        self.assertFalse((self.claude / ".disabled" / "alpha").is_symlink())

        self.ok("install", "beta", "--target", "repo-claude")
        self.ok("disable", "beta", "--target", "repo-claude")
        self.assertIn("re-enable", self.ok("install", "beta", "--target", "repo-claude").stdout)
        self.assertEqual(self.files(self.claude / "beta"), self.files(self.beta_hub))

    def test_missing_and_no_op_toggles_still_answer_as_before(self) -> None:
        for skill in ("alpha", "beta"):
            for verb in ("disable", "enable"):
                self.assertTrue(self.ok(verb, skill, "--target", "repo-claude").stdout.startswith("missing:"))
            self.ok("install", skill, "--target", "repo-claude")
            self.assertTrue(self.ok("enable", skill, "--target", "repo-claude").stdout.startswith("no-op:"))
            self.ok("disable", skill, "--target", "repo-claude")
            self.assertTrue(self.ok("disable", skill, "--target", "repo-claude").stdout.startswith("no-op:"))


class RefusedAfterHardening(InstallerCase):
    """Each setup made the installer delete or rewrite content through a link."""

    def test_a_disable_through_a_linked_holding_area(self) -> None:
        # .disabled is a link to another folder holding a real folder named after the skill.
        self.ok("install", "alpha", "--target", "repo-claude")
        self.write(self.elsewhere / "alpha" / "keep.txt", "an agent's own notes\n")
        self.link(self.claude / ".disabled", self.elsewhere)
        before = self.snapshot()
        self.assertRefused(self.run_installer("disable", "alpha", "--target", "repo-claude"), before,
                           self.linked_holding_area(self.claude))
        self.assertEqual((self.elsewhere / "alpha" / "keep.txt").read_text(), "an agent's own notes\n")

    def test_b_enable_over_a_real_folder_at_the_live_path(self) -> None:
        self.ok("install", "alpha", "--target", "repo-claude")
        self.ok("disable", "alpha", "--target", "repo-claude")
        self.write(self.claude / "alpha" / "notes.md", "an agent's own folder\n")
        before = self.snapshot()
        self.assertRefused(self.run_installer("enable", "alpha", "--target", "repo-claude"), before,
                           self.real_folder(self.claude / "alpha"))
        self.assertEqual((self.claude / "alpha" / "notes.md").read_text(), "an agent's own folder\n")

    def test_c_copy_form_install_that_is_a_link(self) -> None:
        self.link(self.claude / "beta", self.beta_hub)
        hub_skill = (self.beta_hub / "SKILL.md").read_bytes()
        before = self.snapshot()
        self.assertRefused(self.run_installer("disable", "beta", "--target", "repo-claude"), before,
                           self.link_for_copy(self.claude / "beta"))
        self.assertEqual((self.beta_hub / "SKILL.md").read_bytes(), hub_skill)

    def test_c_copy_form_link_in_the_holding_area(self) -> None:
        # The copy branch picks .disabled/<name> when there is no live folder.
        self.link(self.claude / ".disabled" / "beta", self.beta_hub)
        hub_skill = (self.beta_hub / "SKILL.md").read_bytes()
        before = self.snapshot()
        self.assertRefused(self.run_installer("disable", "beta", "--target", "repo-claude"), before,
                           self.link_for_copy(self.claude / ".disabled" / "beta"))
        self.assertEqual((self.beta_hub / "SKILL.md").read_bytes(), hub_skill)

    def test_d_disable_over_a_real_folder_in_a_real_holding_area(self) -> None:
        self.ok("install", "alpha", "--target", "repo-claude")
        self.write(self.claude / ".disabled" / "alpha" / "keep.txt", "an agent's own notes\n")
        before = self.snapshot()
        self.assertRefused(self.run_installer("disable", "alpha", "--target", "repo-claude"), before,
                           self.real_folder(self.claude / ".disabled" / "alpha"))
        self.assertEqual((self.claude / ".disabled" / "alpha" / "keep.txt").read_text(), "an agent's own notes\n")

    def test_a_dry_run_is_refused_as_the_run_would_be(self) -> None:
        self.ok("install", "alpha", "--target", "repo-claude")
        self.write(self.claude / ".disabled" / "alpha" / "keep.txt", "an agent's own notes\n")
        before = self.snapshot()
        self.assertRefused(self.run_installer("disable", "alpha", "--target", "repo-claude", "--dry-run"), before,
                           self.real_folder(self.claude / ".disabled" / "alpha"))

    def test_d_copy_form_toggle_through_a_linked_holding_area(self) -> None:
        # The copy branch renames inside .disabled/<name>; through a link that is another folder.
        self.write(self.elsewhere / "beta" / "SKILL.md.disabled", skill_md("beta"))
        self.link(self.claude / ".disabled", self.elsewhere)
        before = self.snapshot()
        self.assertRefused(self.run_installer("enable", "beta", "--target", "repo-claude"), before,
                           self.linked_holding_area(self.claude))

    def test_install_through_a_linked_holding_area(self) -> None:
        self.write(self.elsewhere / "alpha" / "keep.txt", "an agent's own notes\n")
        self.link(self.claude / ".disabled", self.elsewhere)
        before = self.snapshot()
        self.assertRefused(self.run_installer("install", "alpha", "--target", "repo-claude"), before,
                           self.linked_holding_area(self.claude))
        self.assertEqual((self.elsewhere / "alpha" / "keep.txt").read_text(), "an agent's own notes\n")

    def test_remove_through_a_linked_holding_area(self) -> None:
        self.ok("install", "alpha", "--target", "repo-claude")
        self.write(self.elsewhere / "alpha" / "keep.txt", "an agent's own notes\n")
        self.link(self.claude / ".disabled", self.elsewhere)
        before = self.snapshot()
        self.assertRefused(self.run_installer("remove", "alpha", "--yes", "--target", "repo-claude"), before,
                           self.linked_holding_area(self.claude))
        self.assertEqual((self.elsewhere / "alpha" / "keep.txt").read_text(), "an agent's own notes\n")

    def test_refusal_on_the_second_target_leaves_the_first_unchanged(self) -> None:
        first, second = self.projects("p1", "p2")
        self.ok("install", "alpha", "--target", "project-claude")
        self.write(second / ".disabled" / "alpha" / "keep.txt", "an agent's own notes\n")
        before = self.snapshot()
        self.assertRefused(self.run_installer("disable", "alpha", "--target", "project-claude"), before,
                           self.real_folder(second / ".disabled" / "alpha"))
        self.assertTrue((first / "alpha").is_symlink(), "the first project's install is still enabled")
        self.assertEqual((second / ".disabled" / "alpha" / "keep.txt").read_text(), "an agent's own notes\n")

    def test_copy_form_refusal_on_the_second_target_leaves_the_first_unchanged(self) -> None:
        first, second = self.projects("p1", "p2")
        self.ok("install", "beta", "--target", "project-claude:p1")
        self.link(second / "beta", self.beta_hub)
        hub_skill = (self.beta_hub / "SKILL.md").read_bytes()
        before = self.snapshot()
        self.assertRefused(self.run_installer("disable", "beta", "--target", "project-claude"), before,
                           self.link_for_copy(second / "beta"))
        self.assertTrue((first / "beta" / "SKILL.md").is_file(), "the first project's copy is still enabled")
        self.assertEqual((self.beta_hub / "SKILL.md").read_bytes(), hub_skill)

    def both_files(self, install: Path) -> None:
        """A copy holding SKILL.md and an older SKILL.md.disabled side by side."""
        self.write(install / "SKILL.md", "the current SKILL.md\n")
        self.write(install / "SKILL.md.disabled", "an older SKILL.md someone kept\n")

    def test_copy_form_enable_over_an_existing_skill_md(self) -> None:
        install = self.claude / "beta"
        self.ok("install", "beta", "--target", "repo-claude")
        self.both_files(install)
        before = self.snapshot()
        self.assertRefused(self.run_installer("enable", "beta", "--target", "repo-claude"), before,
                           self.rename_target_exists(install / "SKILL.md"))
        self.assertEqual((install / "SKILL.md").read_bytes(), b"the current SKILL.md\n")

    def test_copy_form_disable_over_an_existing_disabled_marker(self) -> None:
        install = self.claude / "beta"
        self.ok("install", "beta", "--target", "repo-claude")
        self.both_files(install)
        before = self.snapshot()
        self.assertRefused(self.run_installer("disable", "beta", "--target", "repo-claude"), before,
                           self.rename_target_exists(install / "SKILL.md.disabled"))
        self.assertEqual((install / "SKILL.md.disabled").read_bytes(), b"an older SKILL.md someone kept\n")

    def test_copy_form_rename_refusal_on_the_second_target_leaves_the_first_unchanged(self) -> None:
        first, second = self.projects("p1", "p2")
        self.ok("install", "beta", "--target", "project-claude")
        self.both_files(second / "beta")
        before = self.snapshot()
        self.assertRefused(self.run_installer("disable", "beta", "--target", "project-claude"), before,
                           self.rename_target_exists(second / "beta" / "SKILL.md.disabled"))
        self.assertTrue((first / "beta" / "SKILL.md").is_file(), "the first project's copy is still enabled")
        self.assertEqual((second / "beta" / "SKILL.md.disabled").read_bytes(), b"an older SKILL.md someone kept\n")


if __name__ == "__main__":
    unittest.main()
