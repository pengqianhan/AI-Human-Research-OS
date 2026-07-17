Execute this task in the current workspace. Inspect the completed launcher and tests, finish user documentation and governance bookkeeping, run the full local acceptance checks, and create every required artifact. Do not stop after proposing a plan.

# Phase 04 — Document, teach, and verify the complete launcher

## Outcome

Deliver a novice-usable, honestly documented v0 of the repo-local `research-os` thin launcher. Align human-facing documentation with actual behavior, run the complete offline acceptance suite, close only the completed HANDOFF items, and leave real-project validation and GUI execution gated.

## Prerequisite gate

Read before editing:

- `INSTRUCTION.md`
- `README.md`
- `GOAL.md`
- `HANDOFF.md` Active Work, D5, and pi product-shell decisions
- `FILETREE.md`
- `build_phases/README.md`
- all prior phase prompts and generated tutorials under `build_phases/`
- `bin/research-os`
- `bin/tests/test-research-os.sh`
- `.agents/skills/filetree-simple/SKILL.md`

Run `git status --short --branch`. Confirm Phase 01 governance, Phase 02 launcher, and Phase 03 tests are complete in repository evidence, not merely claimed in a transcript. Run the existing smoke suite once before editing documentation. If any prerequisite is absent or failing, return `Status: blocked` and point to the earliest phase that must be rerun.

## Required documentation

1. Create `bin/README.md` as the nearest operational documentation for the launcher. It must cover:
   - purpose and non-goals;
   - tested platform and pi minimum-tested version `0.80.7`;
   - manual pi install and update commands;
   - all supported invocation forms;
   - argument separator behavior;
   - default new-session behavior and explicit pi `-c`/`-r` passthrough examples;
   - native pi authentication, project trust, skills/context discovery, and default permissions;
   - the explicit statement that the launcher and pi are not a sandbox;
   - preflight output, dirty-tree behavior, errors, recovery, and exit semantics;
   - how to run the offline smoke tests;
   - known limitations: no Windows support, no workflow subcommands, no auto-install/update, no SDK, no extension, no GUI execution.
2. Update the root `README.md` only where needed so it no longer falsely claims the repository has no CLI at all. Describe `bin/research-os` as an optional thin launcher, not a workflow engine. Add a concise Quick Start path for pi without displacing the agent-agnostic entry chain.
3. Keep the existing roadmap item for a deterministic workflow CLI unresolved unless its wording is directly contradictory; the thin launcher does not satisfy a full workflow CLI.
4. Do not create duplicate English/Chinese operational README files unless an existing pair in `bin/` requires it. The required Chinese teaching artifact is the HTML tutorial below.

If documentation review uncovers a behavioral bug, apply only the smallest code/test correction, rerun all affected checks, and report it. Do not add features during documentation.

## HANDOFF closure

After all acceptance checks pass:

- mark the concise documentation checklist item complete;
- mark the FILETREE/`verify.sh` checklist item complete;
- ensure implementation and smoke-test items remain honestly checked only if repository evidence passes;
- leave “Use the launcher for one real research-project stage and record concrete OS Feedback” unchecked;
- leave GUI execution gated and do not modify `os-ui`.

Do not mark the overall product arc complete and do not claim the future GUI gate has passed.

## Final HTML tutorial contract

Create `build_phases/phase-04-final-tutorial.html` as a detailed, self-contained Chinese end-to-end tutorial for a user who knows Python but is new to shell, TypeScript, pi SDK development, and local-agent product architecture.

The tutorial must be based on the final verified repository and include:

- `你现在拥有了什么`: launcher, tests, docs, and governance boundary;
- `从 Python 视角理解整个启动过程`: map shell concepts to `sys.argv`, `pathlib`, `shutil.which`, `subprocess`, `os.execvp`, and return codes;
- `一次真实启动会发生什么`: trace target parsing → Git root → OS validation → pi/version/Git preflight → `exec`;
- `pi 默认负责什么`: auth, models, TUI, sessions, context files, skills, tools, permissions;
- `Research OS 启动器负责什么以及不负责什么`;
- `如何安装、更新、启动、继续 session、选择历史 session、排查失败`;
- `如何运行并理解 smoke tests`;
- `为什么现在没有 TypeScript`: explain why SDK/TypeScript is intentionally deferred rather than omitted accidentally;
- `未来 GUI 路线`: one real project stage + concrete OS Feedback + renewed human confirmation, then localhost-only Agent Console using a TypeScript server and pi SDK; repository snapshots and live runtime state remain internally separated; Electron/Tauri is later a choose-one evaluation with Electron the initial candidate;
- `安全边界`: native user permissions, trusted repositories/resources, no sandbox, no remote GUI mode;
- `下一次迭代前应观察的证据`: concrete friction to capture during a real project.

Every code excerpt must be copied from the final real files and labeled with its source path. Add relative clickable links from `build_phases/` to all important real artifacts, including at least:

- `../bin/research-os`
- `../bin/README.md`
- `../bin/tests/test-research-os.sh`
- `../README.md`
- `../GOAL.md`
- `../HANDOFF.md`
- `../INSTRUCTION.md`
- `../FILETREE.md`
- all four phase prompt Markdown files
- the three prior tutorial HTML files

Do not invent line numbers, outputs, files, or future implementation. Use embedded CSS and optional embedded vanilla JavaScript only; no CDN, external fonts, or remote assets. Make navigation and code blocks readable in a desktop browser.

Run a Python standard-library local-link audit and fail if any local target is missing.

## Full verification and completion bar

Run at minimum:

```bash
sh -n bin/research-os
sh -n bin/tests/test-research-os.sh
bin/tests/test-research-os.sh
python .agents/skills/filetree-simple/scripts/filetree.py lint
./verify.sh
```

Also:

- inspect all four HTML tutorials in rendered form when browser tooling is available; otherwise perform an HTML parse plus local-link audit and report rendered inspection as unrun;
- inspect `git diff --check`;
- inspect `git status --short` and preserve unrelated pre-existing changes;
- confirm no real pi model, npm install/update, network request, commit, push, or GUI execution was performed by the acceptance process.

Refresh `FILETREE.md` only after all final docs, HANDOFF changes, and the final tutorial are stable, then rerun lint and `./verify.sh`.

Status is `complete` only when the documented behavior matches the real launcher, the smoke suite passes, all tutorial local links resolve, FILETREE is current, and required repository checks pass. Distinguish failed, blocked, and unrun checks explicitly.

## Final response

Report:

- `Status: complete | incomplete | blocked`;
- user-visible outcome;
- files changed;
- exact acceptance commands and results;
- all tutorial paths and whether rendered inspection occurred;
- local-link audit result;
- known limitations and native-permission warning;
- the still-open real-project validation item;
- next action: use `research-os` for one real project stage, record OS Feedback, and return to the human before any GUI execution work.
