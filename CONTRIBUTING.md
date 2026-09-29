# Contributing

Thanks for helping build the AI-Human Research OS.

## How a change lands

Every change reaches `main` through a pull request, including the
maintainer's own:

1. Fork the repository (or create a branch if you have write access) and
   commit there.
2. Open a pull request into `main`.
3. The [CI workflow](.github/workflows/ci.yml) runs its `checks` job. A pull
   request can merge only when that job passes. For a first-time
   contributor, a maintainer approves the run before it starts.
4. A maintainer reviews and merges.

## Before you open a pull request

Run the same checks locally. You need [uv](https://docs.astral.sh/uv/) and the
Python version pinned in [.python-version](.python-version)
(`uv python install "$(cat .python-version)"`).

```bash
./verify.sh
```

[ci.yml](.github/workflows/ci.yml) lists every step CI runs, including the
unit tests and the os-ui build; copy a step from it to reproduce a failure.

- Editing `paper-wiki/`: follow the
  [paper-wiki-manager](research-skills-hub/open-paper-skills/paper-wiki-manager/SKILL.md)
  skill and commit the regenerated `paper-wiki/viz.html`; CI fails when it is
  stale. A note's `status` is the maintainer's own reading record, so new notes
  stay `unread`.
- Editing skills: change the canonical copy under `research-skills-hub/`.
  Mirrored collections (for example `mattpocock-skills/`) are refreshed from
  upstream; adapt a mirrored skill by copying it into `collected-skills/`.
- Adding a top-level directory: regenerate [FILETREE.md](FILETREE.md) as
  [AGENTS.md](AGENTS.md) describes.

On Windows, a checkout with `core.symlinks=false` turns installed skills into
plain files, and `verify.sh` then fails its installed-skills check. Clone with
`git clone -c core.symlinks=true` (requires Developer Mode), or rely on CI for
that check.

## Conventions

[AGENTS.md](AGENTS.md) is the operating contract for agents and humans alike:
plain files, small reversible changes, and research claims traceable to
sources. Keep credentials and personal data out of commits. Original content is
MIT-licensed; vendored content keeps its upstream license (see
[README](README.md#license)).
