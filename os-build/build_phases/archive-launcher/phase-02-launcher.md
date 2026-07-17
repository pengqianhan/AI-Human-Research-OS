Execute this task in the current workspace. Inspect the repository evidence, perform the authorized implementation, validate the behavior, and create every required artifact. Do not stop after proposing a plan.

# Phase 02 — Implement the read-only native-pi launcher

## Outcome

Create an executable, dependency-free POSIX shell launcher at `bin/research-os`. It locates and validates the Research OS, performs read-only local preflight checks, then replaces itself with the user’s native `pi` process. Preserve native pi authentication, permissions, project trust, resource discovery, session behavior, TUI, arguments, and exit behavior.

## Prerequisite gate

Read before editing:

- `INSTRUCTION.md`
- `GOAL.md` M4
- `HANDOFF.md` Active Work, D5, and pi product-shell decisions
- `build_phases/README.md`
- `build_phases/phase-01-governance-tutorial.html`
- the installed pi README at `/Users/pengqianhan/.nvm/versions/node/v22.23.1/lib/node_modules/@earendil-works/pi-coding-agent/README.md` when that path exists; if it does not, use `pi --help` and `pi update --help` without network access
- `.agents/skills/filetree-simple/SKILL.md`

Run `git status --short --branch` and preserve unrelated work. Confirm Phase 01 actually recorded the narrow exception and marked its governance checklist item complete. If either prerequisite is missing, stop with `Status: blocked`; do not silently perform Phase 01 inside this phase.

## Invocation contract

Support exactly these forms:

```bash
./bin/research-os
./bin/research-os projects-folder/<project>
./bin/research-os -- <pi arguments...>
./bin/research-os projects-folder/<project> -- <pi arguments...>
```

Rules:

- no target means the current directory;
- an explicit target must be an existing directory;
- pi arguments are accepted only after `--`, keeping target parsing unambiguous;
- reject unsupported launcher arguments with concise usage and a nonzero exit;
- retain the selected target directory as pi’s working directory rather than forcing the repository root.

## Required behavior

Implement `bin/research-os` with these invariants:

1. Use POSIX `sh`, not Bash-only syntax. Validate on macOS; Linux is best effort; Windows is out of scope.
2. Discover the Git root from the selected working directory without changing repository state.
3. Treat a root as a valid Research OS only when these real entry-chain files exist:
   - `AGENTS.md`
   - `INSTRUCTION.md`
   - `FILETREE.md`
   - `memory/MEMORY.md`
4. Detect `pi` from `PATH` with no install or update side effect.
5. If pi is missing, fail clearly and print both:
   - `npm install -g --ignore-scripts @earendil-works/pi-coding-agent`
   - the instruction to rerun `research-os` afterward.
6. Read the local pi version. Use `0.80.7` as the minimum tested version. If the detected semantic version is older, warn and guide the user to run `pi update`, but continue launching. Do not query npm or the network. If the version format cannot be parsed, warn and continue.
7. Print a concise preflight containing the Research OS root, selected working directory, pi version, current Git branch when available, and whether the worktree has changes. Dirty, detached, unborn, or no-remote states must not block launch.
8. Print a concise notice that pi runs with the current user’s permissions and is not a sandbox.
9. Do not pass `--approve`, force project trust, force a model, force session restore, alter telemetry, set a custom system prompt, or create `.pi/`.
10. Use `exec` for the final pi launch so signals and the pi exit status behave natively.
11. The launcher itself must not write repository files, logs, caches, sessions, settings, or telemetry, and must not access the network.
12. Make `bin/research-os` executable.

Do not add SDK code, TypeScript, an extension, a workflow subcommand, project selector, service, GUI code, database, installer, updater, or Windows compatibility layer.

## Focused verification

Before creating the tutorial:

- run a POSIX shell syntax check on `bin/research-os`;
- use a temporary directory and a fake `pi` earlier on `PATH` to prove one root launch and one nested-directory launch without invoking a model;
- verify the fake pi observes the intended cwd and exact arguments;
- verify a fake nonzero pi exit status is preserved;
- inspect `git status --short` and confirm the launcher’s verification did not modify unrelated repository state.

Do not add the full permanent test suite in this phase; Phase 03 owns it.

After checks pass, mark the launcher implementation checklist item complete in `HANDOFF.md`. Keep the native-behavior scope item as an invariant; do not falsely mark tests, documentation, final verification, or real-project validation complete.

## HTML tutorial contract

Create `build_phases/phase-02-launcher-tutorial.html`, a detailed self-contained Chinese tutorial for a Python programmer who is new to shell.

It must explain the final real implementation, including:

- shebang and POSIX `sh` versus Python execution;
- positional arguments, `shift`, quoting, and `"$@"` using Python `sys.argv` analogies;
- cwd versus Git root using `pathlib.Path.cwd()` analogies;
- `PATH` and `command -v` using Python import/executable lookup analogies;
- semantic-version warning behavior;
- read-only Git preflight;
- why `exec pi ...` differs from spawning and waiting in Python;
- exit codes, signals, native pi permissions, and the non-sandbox boundary;
- every user-visible error path and how to recover.

Include sections titled `逐段阅读真实启动器`, `Python 对照表`, `失败路径与恢复`, and `本阶段验证证据`. Link to real paths from `build_phases/`, including at least `../bin/research-os`, `../AGENTS.md`, `../INSTRUCTION.md`, `../HANDOFF.md`, and `../build_phases/phase-02-launcher.md`. Copy excerpts from the final launcher, label them with `bin/research-os`, and do not invent line numbers or outputs. Use embedded CSS only and no CDN.

Run a Python standard-library audit of all local tutorial links and fail if a target does not exist.

## Repository index and verification

After implementation, HANDOFF update, and tutorial are final:

- refresh `FILETREE.md` using `.agents/skills/filetree-simple/SKILL.md`;
- run FILETREE lint;
- run `./verify.sh`.

Status is `complete` only if behavior exists, focused fake-pi checks pass, the tutorial passes its local-link audit, FILETREE is current, and repository verification passes.

## Final response

Report:

- `Status: complete | incomplete | blocked`;
- files changed;
- launcher behavior and explicit non-goals;
- exact verification commands and results;
- tutorial path and link-audit result;
- remaining risks or platform caveats;
- next phase: `build_phases/phase-03-smoke-tests.md`.
