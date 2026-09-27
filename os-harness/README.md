# Research OS Harness

The harness lets the Research OS hand a task to Claude Code or Codex and get a
structured, recorded result back. It runs the vendors' own CLIs, so each
turn uses the login you already have (a Claude Pro/Max or ChatGPT
subscription), not an API key. Decision record:
[ADR-0003](../docs/adr/0003-subscription-cli-harness.md).

## Goal

One uniform call runs one agent turn in one directory:

- Claude Code and Codex are driven through the same commands and the same
  event vocabulary.
- Every turn is billed to the CLI's own login, and the trace says so (`auth`).
- Every session can be resumed, and its full trace stays on disk for later
  review and reflection.

The root agent (the `project-dispatch` skill) and a human in a terminal both
use it as their building block. Out of scope: daemons, UIs, and parallel
scheduling.

## Commands

Run from the repository root with any Python 3.9+. There are no dependencies.

```bash
python os-harness/harness.py check
python os-harness/harness.py run --agent claude --cwd projects-folder/Example_Project "Summarize the project status"
python os-harness/harness.py resume <session-id> "Now list the open questions"
python os-harness/harness.py sessions
python os-harness/harness.py show <session-id>
python os-harness/harness.py stop <session-id>
```

- `check` prints each CLI's version and login state.
- `run` starts a session and runs its first turn. It takes `--agent`
  (`claude` or `codex`), `--cwd`, `--mode`, and `--model`.
- `resume` runs the next turn of a session, keeping its agent, directory, mode,
  and model.
- `run` and `resume` also accept these options:
  - `--detach`: returns as soon as the turn is recorded, while a background
    worker runs it.
  - `--timeout SECONDS`: stops the turn after that long.
  - `--json`: prints one ASCII-escaped JSON event per line, for a calling
    program.

  A prompt of `-` is read from stdin. `resume` refuses a session whose turn is
  still running.
- `sessions` lists sessions with their status; add `--json` for machine
  output, including `last_result`. The status is one of:
  - `running`: a turn is in progress.
  - `ok` or `failed`: how the last turn ended.
  - `stopped`: the process running a turn died before the turn ended.
- `show` replays one trace. `stop` ends a running turn, including its CLI
  process, and records it as failed.

The exit status is:

- 0 when the turn succeeded.
- 1 when the turn failed.
- 2 when no turn could start: bad arguments, an unknown session, or a missing
  CLI.

## Permission modes

| `--mode` | Claude Code | Codex | Use for |
|---|---|---|---|
| `read-only` | `--permission-mode dontAsk` | sandbox `read-only` | questions and reviews |
| `workspace` (default) | `--permission-mode acceptEdits` | sandbox `workspace-write` | editing files in `--cwd` |
| `full` | `--permission-mode bypassPermissions` | sandbox `danger-full-access` | trusted directories that need shell commands |

The two agents do not behave identically in each mode:

- **Claude.** In `read-only` and `workspace` mode, anything that would need
  approval, including shell commands, is refused. The final `done` event lists
  refused tools under `denied`. Use `full` when the agent must run code.
- **Codex.** Every mode runs with `approvalPolicy: "never"`. If Codex asks for
  approval anyway, the harness declines and records a `declined` event.
- **Codex on Windows.** The `read-only` and `workspace` modes need Codex's
  Windows sandbox. When it is not ready, the turn fails within seconds and
  names the sandbox status, instead of stalling on the first tool call. Finish
  the sandbox setup in Codex, or use `full`.
- **Codex home.** The sandbox state and the login belong to the Codex home the
  harness inherits. Orca, for example, sets `CODEX_HOME` to its own managed
  directory, and that directory's sandbox can be unready while `~/.codex` is
  ready.

## Subscription login

The harness removes `ANTHROPIC_API_KEY` and `ANTHROPIC_AUTH_TOKEN` from the
child environment, so Claude Code falls back to its own login. It also
removes the variables that a parent Claude Code session sets for its own
process tree, so the harness also works from inside a Claude Code session.

Each turn's `started` event records `auth`:

- `subscription` for a Claude login with no API key, or a ChatGPT login for
  Codex.
- Otherwise the key source, together with a `warning` event.

Codex's `started` event also records the account's `plan`.

## Session traces

Each session is one JSONL file in `os-harness/sessions/`. Git ignores it. Set
`OS_HARNESS_SESSIONS` to use another directory.

- The first line is the session header: `id`, `agent`, `cwd`, `mode`, `model`,
  `created`.
- Each turn then adds a `prompt` record followed by its events, each stamped
  with `turn` and `time`.

| Event | Fields | Meaning |
|---|---|---|
| `started` | `native_id`, `model`, `auth`, `plan` | the vendor session is ready |
| `text` | `text` | a complete assistant message |
| `tool` / `tool_result` | `name`, `input` / `ok`, `output` | a tool call and its outcome (output is clipped to 2,000 characters) |
| `warning`, `declined`, `rate_limit` | `message`, `request`, `info` | things a caller should know |
| `done` | `ok`, `result`, `error`, `native_id`, `duration_ms`, `usage`, `denied`, `cost_usd` | the turn ended; always the last event |

`native_id` is the vendor's own session or thread id. `resume` passes it back,
and it also locates the vendor's full native log:

- Claude: `~/.claude/projects/`
- Codex: `$CODEX_HOME/sessions/`

## Using a different CLI build

`OS_HARNESS_CLAUDE` and `OS_HARNESS_CODEX` override the command. Each takes a
path or a JSON list. For example, this runs a newer Codex without changing the
global install:

```bash
export OS_HARNESS_CODEX='["npx", "-y", "@openai/codex@latest"]'
```

On Windows, use the full path that `where npx` prints, such as
`C:\\Users\\<you>\\AppData\\Roaming\\npm\\npx.cmd`.

## Tests

```bash
python -m unittest discover -s os-harness/tests            # offline, fake CLIs, ~3 s
OS_HARNESS_LIVE=1 python -m unittest os-harness/tests/test_live.py   # real CLIs, small quota use
```

The live tests run three turns per agent:

1. The agent replies `pong`.
2. A resumed turn recalls `pong`.
3. The agent writes a file.

They accept these variables:

- `OS_HARNESS_LIVE_CLAUDE_MODEL`: the Claude model (default `haiku`).
- `OS_HARNESS_LIVE_CODEX_MODEL`: the Codex model (default: Codex's own).
- `OS_HARNESS_LIVE_MODE=full`: runs every turn in full mode, for machines where
  Codex's Windows sandbox is not set up.

## Limitations

- **One process per turn.** Each turn starts a fresh CLI process: about 2 s of
  startup for Claude, and more for Codex through `npx`. A `--detach` worker
  lives only for its turn. There is no long-lived process and no daemon.
  Detached output is logged to `sessions/<id>.log`.
- **One turn per session at a time.** Running two turns of the same session
  concurrently is not guarded against.
- **Whole messages only.** Assistant text arrives as complete messages, not
  token streams. Codex sub-agent threads are left out of the trace.
- **Model and CLI must match.** A model that is too new for the installed CLI
  fails the turn and shows the vendor's error. Update the CLI, or pass
  `--model`.

## Design notes

The adapter layering follows alphaXiv OpenResearch (MIT): one adapter per
vendor, each launching its official CLI in headless mode, with events
normalized into one vocabulary. The code is a small reimplementation in
Python; none of it was copied.

Protocol details come from two sources:

- The installed CLIs: `claude --help`, and `codex app-server
  generate-json-schema` for codex-cli 0.142.4.
- Live runs on 2026-09-26, with Claude Code 2.1.283 and codex-cli 0.157.1.
  One of them showed that `claude --resume` replays the previous turn's init
  and result before the new turn's messages, so the adapter treats a result as
  final only when nothing follows it.
