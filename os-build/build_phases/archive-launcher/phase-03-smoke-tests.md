Execute this task in the current workspace. Inspect the implemented launcher, add the permanent offline smoke-test harness, run it, and create every required artifact. Do not stop after proposing a plan.

# Phase 03 — Add deterministic offline smoke tests

## Outcome

Create a dependency-free, network-free shell smoke-test suite for `bin/research-os`. The suite must exercise the real launcher with temporary Git repositories and a fake `pi`, never a real model or provider.

## Prerequisite gate

Read before editing:

- `INSTRUCTION.md`
- `HANDOFF.md` `research-os` Active Work and pi product-shell decisions
- `build_phases/README.md`
- `build_phases/phase-02-launcher.md`
- `build_phases/phase-02-launcher-tutorial.html`
- `bin/research-os`
- `.agents/skills/filetree-simple/SKILL.md`

Run `git status --short --branch`. Confirm `bin/research-os` exists, is executable, passes a POSIX syntax check, and the HANDOFF launcher implementation item is complete. If not, return `Status: blocked`; do not rewrite the launcher from scratch or absorb Phase 02.

## Required artifact

Create an executable test runner at:

```text
bin/tests/test-research-os.sh
```

Use POSIX shell and standard local utilities only. Do not add a package manager, test framework, Python environment, npm dependency, container, fixture committed outside `bin/tests/`, or network call.

## Required test design

The test runner must create isolated temporary fixtures and clean them on exit. Each valid fixture must be a temporary Git repository containing the minimum Research OS markers expected by the real launcher. Place a fake `pi` at the front of a temporary `PATH`; configure it through environment variables or fixture files so it can report versions, record cwd/arguments, and return controlled exit codes.

Cover at least these observable cases:

1. launch from a valid Research OS root;
2. launch from a nested project directory while preserving that nested cwd;
3. explicit target-directory form;
4. pi arguments after `--` are preserved exactly, including whitespace and shell-sensitive characters passed as literal arguments;
5. unsupported launcher arguments or malformed invocation fail with usage;
6. a non-directory target fails clearly;
7. a Git repository without the Research OS entry chain fails clearly;
8. execution outside any Git repository fails clearly;
9. missing pi prints installation guidance and does not try to install;
10. pi version `0.80.7` launches without an old-version warning;
11. a version below `0.80.7` prints `pi update` guidance and still launches;
12. an unparseable pi version warns and still launches;
13. a dirty worktree is reported but does not block;
14. a clean worktree is reported honestly;
15. the fake pi’s nonzero exit status is preserved;
16. no real `pi`, model, provider, npm, update command, or network endpoint is invoked.

Tests must emit concise PASS/FAIL output, return nonzero on any failure, show useful diagnostics, and avoid depending on the user’s global Git configuration. Keep assertions focused on public behavior rather than duplicating the launcher implementation.

If testing reveals a launcher bug, make the smallest correction to `bin/research-os`, rerun the focused failing case, then rerun the full suite. Document the deviation in the tutorial and final response. Do not broaden launcher scope.

## Verification and completion bar

Run at minimum:

```bash
sh -n bin/research-os
sh -n bin/tests/test-research-os.sh
bin/tests/test-research-os.sh
```

Run the suite twice to catch leaked temporary state. Confirm no test process remains and inspect `git status --short` afterward.

After all tests pass, mark the smoke-test checklist item complete in `HANDOFF.md`. Do not mark documentation, final verification, or real-project validation complete.

## HTML tutorial contract

Create `build_phases/phase-03-smoke-tests-tutorial.html`, a detailed self-contained Chinese tutorial for a Python programmer who is new to shell testing.

It must explain the actual final test code, including:

- why these are integration-style smoke tests rather than unit tests;
- temporary directories and cleanup traps, compared with Python `tempfile.TemporaryDirectory` and `try/finally`;
- fake executables and `PATH` injection, compared with Python dependency injection or monkeypatching;
- stdout/stderr and exit-code assertions;
- quoting tests and why whitespace-sensitive arguments matter;
- how the suite guarantees it never invokes a real model or network;
- what each test case proves and what it does not prove;
- any launcher bug found and the exact verified correction.

Include sections titled `测试架构`, `逐段阅读真实测试代码`, `与 pytest 的对应关系`, `每个测试保护什么`, and `如何安全地重新运行`. Link to real paths from `build_phases/`, including at least `../bin/research-os`, `../bin/tests/test-research-os.sh`, `../HANDOFF.md`, and `../build_phases/phase-03-smoke-tests.md`. Use excerpts copied from the final files, identify their source paths, avoid fabricated line numbers/results, embed CSS, and use no CDN.

Run a Python standard-library local-link audit and fail if any local tutorial target is missing.

## Repository index and final checks

After code, HANDOFF, and tutorial are final:

- refresh `FILETREE.md` with the local filetree-simple skill;
- run FILETREE lint;
- run `./verify.sh`.

Status is `complete` only when the permanent suite passes twice, tutorial links resolve, FILETREE is current, and repository checks pass. A missing standard utility or platform incompatibility produces `blocked` with the exact probe and smallest fallback; do not claim unrun tests passed.

## Final response

Report:

- `Status: complete | incomplete | blocked`;
- files changed;
- test cases implemented;
- exact commands and pass/fail results;
- any launcher correction made;
- tutorial path and link-audit result;
- known coverage limits;
- next phase: `build_phases/phase-04-documentation-and-verification.md`.
