# Research OS Harness

Python adapters that run Claude Code and Codex turns on the user's own subscriptions.

* [README.md](README.md) - Goal, commands, permission modes, session traces, tests, and limitations.
* [harness.py](harness.py) - Command-line entry: `run`, `resume` (optionally `--detach`), `sessions`, `show`, `stop`, `check`.
* [adapter_claude.py](adapter_claude.py) - Claude Code adapter (`claude --print`, stream-json).
* [adapter_codex.py](adapter_codex.py) - Codex adapter (`codex app-server`, JSON-RPC).
* [core.py](core.py) - Shared events, child processes, and JSONL session traces.
* [tests/](tests/) - Offline tests with fake CLIs and opt-in live tests.
