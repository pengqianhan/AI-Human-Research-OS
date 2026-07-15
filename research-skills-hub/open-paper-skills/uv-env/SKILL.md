---
name: uv-env
description: Create and manage Python project environments with the uv package manager. Use whenever the user wants to set up a new Python project, create a virtual environment, initialize a pyproject.toml, install/add Python packages, lock or sync dependencies, or pin a Python version — even if they don't explicitly mention "uv". Prefer this skill over raw pip/venv/conda for any Python environment work in a project directory.
---

# uv-env

Set up and maintain Python project environments using [uv](https://docs.astral.sh/uv/). uv is fast, replaces pip + venv + pip-tools, and works from a single `pyproject.toml`.

## When to use

- "Create a Python environment for this project"
- "Set up a `pyproject.toml`"
- "Install / add the `numpy` package"
- "Lock the dependencies"
- "Pin Python to 3.11"
- Any request to bootstrap a Python project where the manager is unspecified — default to uv.

## Prerequisites

Check that uv is installed:

```bash
uv --version
```

If missing, install it (Linux/macOS):

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Then ensure it's on PATH (the installer prints the line to source, usually `~/.local/bin`).

## Core workflow

### 1. Initialize a project

If the directory has no `pyproject.toml`, create a minimal one. Keep dependencies empty at start — only add what's needed.

```toml
[project]
name = "<project-name>"
version = "0.1.0"
description = "<short description>"
requires-python = ">=3.10"
dependencies = []
```

Use `>=3.10` as a sensible default unless the user specifies otherwise. Pick `name` from the directory name (kebab-case).

Avoid `uv init` when the user already has files in the directory — it can scaffold extra files (`README.md`, `hello.py`, `.python-version`) the user didn't ask for. Writing the `pyproject.toml` directly is cleaner.

### 2. Create the virtual environment

```bash
uv sync
```

This:
- Creates `.venv/` in the project root
- Resolves dependencies from `pyproject.toml`
- Writes/updates `uv.lock`

If the user requested a specific Python version, set it first:

```bash
uv python pin 3.11
uv sync
```

### 3. Add packages later

Always use `uv add` rather than `pip install` — it updates `pyproject.toml` and `uv.lock` together.

```bash
uv add numpy pandas
uv add --dev pytest ruff      # dev-only deps
uv remove <package>           # remove
```

### 4. Run commands inside the environment

Prefer `uv run` over manually activating `.venv`:

```bash
uv run python script.py
uv run pytest
```

`uv run` ensures the environment is in sync before executing.

If the user explicitly wants to activate the venv (e.g., for an interactive shell session), use the traditional approach:

```bash
source .venv/bin/activate   # bash/zsh
deactivate                  # exit
```

Prefer `uv run` for one-off commands and scripts — it's stateless and avoids the "wrong env activated" footgun.

## Quick reference

| Task | Command |
|------|---------|
| Create env from `pyproject.toml` | `uv sync` |
| Add a package | `uv add <pkg>` |
| Add a dev package | `uv add --dev <pkg>` |
| Remove a package | `uv remove <pkg>` |
| Run a command in the env | `uv run <cmd>` |
| Pin Python version | `uv python pin <version>` |
| Update lockfile | `uv lock` |
| Upgrade all deps | `uv sync --upgrade` |

## Notes

- Commit `pyproject.toml` and `uv.lock`. Don't commit `.venv/`.
- The skill defaults to a minimal `pyproject.toml` and grows it incrementally — don't preinstall packages the user hasn't asked for. This keeps the lockfile small and avoids dragging in transitive deps that might cause version conflicts later.
- If the user runs into a resolution conflict, check whether `requires-python` is too tight; loosening to `>=3.10` usually fixes it.