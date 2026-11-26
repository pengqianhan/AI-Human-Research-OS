# The import kit

What makes the product repository, SuperResearch-OS, from one commit of this
repository ([design](../step3-split-and-git.md) §4, §5.7, §7 R1 and R3). It
writes a plain folder; it creates no repository and pushes nothing.

| File | What it is |
|---|---|
| [manifest.json](manifest.json) | The allowlist: every tracked file's class (W is what no entry names), the example's files, the editions, the stubs, the links |
| [export.py](export.py) | Writes the product tree from `--commit` into `--dest` |
| [import_check.py](import_check.py) | Checks a written tree against the commit and the manifest, and searches it for personal data |
| [importkit.py](importkit.py) | Code the two scripts share |
| [editions/](editions/) | The product editions of the seven split files; `HANDOFF.md` and `README.md` are templates cut from the source at export time |
| [transitional/](transitional/) | The transitional workspace's stubs |

## Rehearse

From the repository root, with the pinned Python:

```bash
py() { uv run --no-project --python 3.12 -- python "$@"; }
py os-build/import/export.py --dest <empty folder outside the repository>
py os-build/import/import_check.py --export <that folder> --patterns <file> --json <file> --record
```

- Both read the kit from the commit (default `HEAD`), so commit the kit first, or
  pass `--kit-from-worktree` to both while iterating.
- `--patterns` names a file kept outside the export and the repository, one
  `label<TAB>text` per line: the owner's names, email addresses, home folder,
  and host names, derived at run time. Never commit it. The check prints files
  and line counts only.
- The file holds every written form of each name, one line each: joined and
  spaced (a credit line writes a name with a space where a login joins it),
  with hyphen or dot where one is used, and in every other script the person
  writes it in. The search compares bytes line by line, folding ASCII case
  only, so it finds exactly the forms listed. It cannot see text inside images
  or compressed streams (a PDF's, an archive's), text in another encoding
  (UTF-16, escapes such as `\u…` or `&#…;`), a name broken across two lines,
  or a name in a script or spelling the file does not hold; a clean result
  covers the listed forms in plain text only.
- Then run the product's checks inside the folder, each with a throwaway
  `HOME` (and `USERPROFILE`), `CODEX_HOME` and `CLAUDE_CONFIG_DIR` unset: its
  `verify.sh`, the unit tests of its `ci.yml`, the generator, and the
  `os-ui/frontend` and `os-ui/client` steps. Run `import_check.py` again at the
  end: files the checks created are allowed only where the product's
  `.gitignore` files ignore them.
- The export is a plain folder, but the import makes a repository of it, and
  `verify.sh` and the generator read Git when a `.git` is there. So also copy
  the final export to a disposable folder, run `git init` and one commit there
  with a made-up identity on the command line
  (`git -c user.name=Rehearsal -c user.email=rehearsal@example.invalid commit …`)
  and no remote, and run `verify.sh` and the generator in that copy; report
  them apart from the plain folder's results. Never run `git init` in the
  export itself.

Every relative link in the `HANDOFF.md` and `README.md` editions whose target is
not product content becomes a link to the workspace repository, whose address
the export reads from the source's `origin` remote (`--workspace-url` overrides
it, `--no-workspace-url` keeps the links as they are).
