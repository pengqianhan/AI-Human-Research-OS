import importlib.util
import os
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "filetree.py"
SPEC = importlib.util.spec_from_file_location("filetree_simple", SCRIPT)
assert SPEC and SPEC.loader
filetree = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = filetree
SPEC.loader.exec_module(filetree)


class FiletreeTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)

    def tearDown(self):
        self.temporary.cleanup()

    def write(self, relative, content):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return path

    def index(self, directory, description, title=None):
        title = title or directory.replace("-", " ").title()
        return self.write(f"{directory}/index.md", f"# {title}\n\n{description}\n")

    def test_generate_two_section_map_without_git_or_hashes(self):
        self.write("README.md", "# Repo\n")
        self.index("zeta", "Zeta stores final research outputs.")
        self.index("alpha", "Alpha receives new research materials.")

        self.assertTrue(filetree.generate_repo(self.root))
        output = (self.root / "FILETREE.md").read_text(encoding="utf-8")

        self.assertIn("## Core Files", output)
        self.assertIn("## Main Areas", output)
        self.assertLess(output.index("[alpha/]"), output.index("[zeta/]"))
        self.assertNotIn("hash:", output)
        self.assertFalse((self.root / ".git").exists())

    def test_add_delete_and_rename_are_reflected(self):
        self.index("alpha", "Alpha stores research notes.")
        filetree.generate_repo(self.root)

        (self.root / "alpha").rename(self.root / "beta")
        self.index("gamma", "Gamma stores research artifacts.")
        self.assertTrue(filetree.generate_repo(self.root))
        output = (self.root / "FILETREE.md").read_text(encoding="utf-8")

        self.assertNotIn("[alpha/]", output)
        self.assertIn("[beta/]", output)
        self.assertIn("[gamma/]", output)

    def test_invalid_input_leaves_existing_manifest_unchanged(self):
        self.write("FILETREE.md", "sentinel\n")
        (self.root / "missing-index").mkdir()

        with self.assertRaises(filetree.FiletreeError):
            filetree.generate_repo(self.root)

        self.assertEqual((self.root / "FILETREE.md").read_text(encoding="utf-8"), "sentinel\n")

    def test_invalid_index_summaries_are_rejected(self):
        invalid = {
            "missing": "# Missing\n",
            "list": "# List\n\n- Not a paragraph.\n",
            "cjk": "# Cjk\n\nThis summary contains 中文 text.\n",
            "long": "# Long\n\n" + " ".join(["word"] * 21) + ".\n",
            "two-sentences": "# Two Sentences\n\nFirst sentence. Second sentence.\n",
        }
        for name, content in invalid.items():
            with self.subTest(name=name):
                case_root = self.root / name
                case_root.mkdir()
                (case_root / "index.md").write_text(content, encoding="utf-8")
                with self.assertRaises(filetree.FiletreeError):
                    filetree.expected_filetree(self.root)
                (case_root / "index.md").unlink()
                case_root.rmdir()

    def test_hidden_and_temporary_directories_are_excluded(self):
        for name in (".agents", ".github", "scratch", "tmp", "node_modules", "build"):
            (self.root / name).mkdir()
        self.index("public", "Public contains durable research materials.")

        output = filetree.expected_filetree(self.root)

        self.assertIn("[public/]", output)
        for name in (".agents", ".github", "scratch", "tmp", "node_modules", "build"):
            self.assertNotIn(f"[{name}/]", output)

    def test_skill_directory_uses_single_line_frontmatter(self):
        self.write(
            "tool/SKILL.md",
            "---\nname: tool\ndescription: Tool performs a bounded research operation.\n---\n",
        )

        output = filetree.expected_filetree(self.root)

        self.assertIn("[tool/](tool/SKILL.md)", output)

    def test_non_skill_directory_requires_index(self):
        (self.root / "plain").mkdir()
        with self.assertRaises(filetree.FiletreeError):
            filetree.expected_filetree(self.root)

    def test_lint_is_read_only(self):
        self.index("alpha", "Alpha stores research notes.")
        self.write("FILETREE.md", "stale\n")

        current, diff = filetree.lint_repo(self.root)

        self.assertFalse(current)
        self.assertIn("expected/FILETREE.md", diff)
        self.assertEqual((self.root / "FILETREE.md").read_text(encoding="utf-8"), "stale\n")

    def test_generate_is_idempotent(self):
        self.index("alpha", "Alpha stores research notes.")
        self.assertTrue(filetree.generate_repo(self.root))
        self.assertFalse(filetree.generate_repo(self.root))

    @unittest.skipUnless(hasattr(os, "symlink"), "symlinks are unavailable")
    def test_top_level_directory_symlink_is_rejected(self):
        target = self.root / "outside"
        target.mkdir()
        (target / "index.md").write_text("# Outside\n\nOutside stores research notes.\n", encoding="utf-8")
        os.symlink(target, self.root / "linked", target_is_directory=True)

        with self.assertRaises(filetree.FiletreeError):
            filetree.expected_filetree(self.root)


if __name__ == "__main__":
    unittest.main()
