#!/usr/bin/env bash
# os-ui one-command launcher: generate state.json, install frontend deps on
# first run, then start the development server.
#
# Usage (can be run from anywhere in the repository):
#   ./os-ui/start.sh            # generate one snapshot, then start frontend
#   ./os-ui/start.sh --watch    # also keep the generator watching for changes
#
# Runs in the foreground. Ctrl-C stops all child processes; no resident daemon
# is left behind.
set -euo pipefail
cd "$(dirname "$0")"

# ---- Prerequisite checks --------------------------------------------------
if ! command -v uv >/dev/null 2>&1; then
  echo "x uv was not found. Install it from https://docs.astral.sh/uv/" >&2
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "x npm was not found. Install Node.js 18+ from https://nodejs.org/" >&2
  exit 1
fi

# ---- Step 1: generate data snapshot --------------------------------------
echo "> Generating state.json snapshot..."
(cd generator && uv run python generate.py)

# ---- Step 2: install frontend deps on first run ---------------------------
if [ ! -d frontend/node_modules ]; then
  echo "> First run: installing frontend dependencies..."
  (cd frontend && npm install)
fi

# ---- Optional: --watch keeps snapshots tracking repository changes --------
# The generator runs as this script's child process and exits with Ctrl-C or
# terminal close. It is not a background resident service; see DESIGN.md §2.
if [ "${1:-}" = "--watch" ]; then
  echo "> Generator entering watch mode; it will exit with this script..."
  # exec replaces the subshell with uv, so $! points at uv itself and the EXIT
  # trap can kill the actual child process instead of an empty shell wrapper.
  (cd generator && exec uv run python generate.py --watch) &
  WATCH_PID=$!
  trap 'kill "$WATCH_PID" 2>/dev/null || true' EXIT
fi

# ---- Step 3: start the frontend dev server -------------------------------
echo "> Starting frontend. Open the URL printed below, usually http://localhost:5173/"
cd frontend && npm run dev
