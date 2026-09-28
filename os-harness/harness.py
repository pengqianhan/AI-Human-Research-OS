#!/usr/bin/env python3
"""Research OS harness: run Claude Code or Codex turns on the user's own login.

    python os-harness/harness.py run --agent claude --cwd projects-folder/X "task"
    python os-harness/harness.py resume <session-id> "follow-up"
    python os-harness/harness.py sessions
    python os-harness/harness.py show <session-id>
    python os-harness/harness.py stop <session-id>
    python os-harness/harness.py check

Add --detach to `run` or `resume` to return at once while the turn runs in the
background, and --json for one JSON object per line.
"""

from __future__ import annotations

import argparse
import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path

from adapter_claude import ClaudeAdapter
from adapter_codex import CodexAdapter
from core import MODES, NO_WINDOW, HarnessError, SessionStore, child_env, clip, event, kill_tree, pid_alive, run_turn

ADAPTERS = {"claude": ClaudeAdapter, "codex": CodexAdapter}
HERE = Path(__file__).resolve()


def main(argv=None) -> int:
    # Pipes on Windows default to the ANSI code page, which turns Chinese into "?".
    for stream, errors in ((sys.stdin, "strict"), (sys.stdout, "replace"), (sys.stderr, "replace")):
        try:
            stream.reconfigure(encoding="utf-8", errors=errors)
        except (AttributeError, ValueError):
            pass  # replaced or already-used streams, e.g. under test capture
    signal.signal(signal.SIGTERM, _interrupt)  # lets `stop` end a POSIX worker cleanly
    args = build_parser().parse_args(argv)
    try:
        return args.handler(args)
    except HarnessError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("interrupted", file=sys.stderr)
        return 130


def _interrupt(signum, frame):
    raise KeyboardInterrupt


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(required=True, metavar="command")

    run = commands.add_parser("run", help="start a session and run its first turn")
    run.add_argument("--agent", required=True, choices=sorted(ADAPTERS))
    run.add_argument("--cwd", default=".", help="directory the agent works in (default: current)")
    run.add_argument("--mode", default="workspace", choices=MODES, help="permission mode (default: workspace)")
    run.add_argument("--model", help="model override passed to the CLI")
    add_turn_options(run)
    run.set_defaults(handler=cmd_run)

    resume = commands.add_parser("resume", help="run the next turn of an existing session")
    resume.add_argument("session", help="session id from `run` or `sessions`")
    add_turn_options(resume)
    resume.set_defaults(handler=cmd_resume)

    sessions = commands.add_parser("sessions", help="list recorded sessions and their status")
    sessions.add_argument("--json", action="store_true", help="print one JSON object per session")
    sessions.set_defaults(handler=cmd_sessions)

    show = commands.add_parser("show", help="replay a session trace")
    show.add_argument("session")
    show.set_defaults(handler=cmd_show)

    stop = commands.add_parser("stop", help="stop a session's running turn")
    stop.add_argument("session")
    stop.set_defaults(handler=cmd_stop)

    check = commands.add_parser("check", help="report CLI versions and login state")
    check.set_defaults(handler=cmd_check)
    return parser


def add_turn_options(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("prompt", help="the message for the agent; '-' reads it from stdin")
    parser.add_argument("--prompt-file", help=argparse.SUPPRESS)  # used by detached workers
    parser.add_argument("--timeout", type=float, help="stop the turn after this many seconds")
    parser.add_argument("--detach", action="store_true", help="run the turn in the background and return at once")
    parser.add_argument("--json", action="store_true", help="print one JSON event per line")


def cmd_run(args) -> int:
    cwd = Path(args.cwd).resolve()
    if not cwd.is_dir():
        raise HarnessError(f"--cwd {cwd} is not a directory")
    adapter = ADAPTERS[args.agent]()  # fails before a session exists if the CLI is missing
    prompt = read_prompt(args)
    session = SessionStore().create(args.agent, str(cwd), args.mode, args.model)
    return detach(session, prompt, args) if args.detach else drive(session, adapter, prompt, args)


def cmd_resume(args) -> int:
    session = SessionStore().load(args.session)
    if session.status == "running":
        raise HarnessError(f"session {session.id} is still running; wait for it or stop it first")
    adapter = ADAPTERS[session.agent]()
    prompt = read_prompt(args)
    return detach(session, prompt, args) if args.detach else drive(session, adapter, prompt, args)


def read_prompt(args) -> str:
    if args.prompt_file:  # a detached worker; its prompt argument is a placeholder
        path = Path(args.prompt_file)
        prompt = path.read_text(encoding="utf-8")
        path.unlink()
        return prompt
    return sys.stdin.read() if args.prompt == "-" else args.prompt


def drive(session, adapter, prompt: str, args) -> int:
    if not args.json:
        print(f"[{session.agent}] session {session.id} in {session.cwd} ({session.mode})")
    ok = False
    for item in run_turn(session, adapter, prompt, timeout=args.timeout):
        if args.json:  # ASCII escapes keep JSON intact whatever the reader's encoding
            print(json.dumps({**item, "session": session.id}), flush=True)
        else:
            show_event(item)
        if item["type"] == "done":
            ok = item.get("ok", False)
    if not args.json:
        print(f"session {session.id} - continue with: harness.py resume {session.id} \"...\"")
    return 0 if ok else 1


def detach(session, prompt: str, args) -> int:
    """Start a background worker for the turn and return once it is recorded."""
    turn = session.turns + 1
    prompt_file = session.path.with_suffix(".prompt")
    prompt_file.write_text(prompt, encoding="utf-8")
    command = [sys.executable, str(HERE), "resume", session.id, "-", "--prompt-file", str(prompt_file)]
    if args.timeout:
        command += ["--timeout", str(args.timeout)]
    with session.path.with_suffix(".log").open("a", encoding="utf-8") as log:
        spawn_worker(command, log)

    deadline = time.monotonic() + 30
    while SessionStore(session.path.parent).load(session.id).turns < turn:
        if time.monotonic() > deadline:
            raise HarnessError(f"the background worker did not start; see {session.path.with_suffix('.log')}")
        time.sleep(0.2)

    if args.json:
        print(json.dumps(event("dispatched", session=session.id, turn=turn)))
    else:
        print(f"[{session.agent}] session {session.id} turn {turn} is running in the background.")
        print(f"check: harness.py sessions | show {session.id}    stop: harness.py stop {session.id}")
    return 0


def spawn_worker(command, log) -> None:
    options = dict(stdin=subprocess.DEVNULL, stdout=log, stderr=log, cwd=str(HERE.parent))
    if os.name != "nt":
        subprocess.Popen(command, start_new_session=True, **options)
        return
    detached = 0x00000008 | 0x00000200  # DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP
    try:
        # Leave the caller's job object, so an agent shell that ends its jobs spares the worker.
        subprocess.Popen(command, creationflags=detached | 0x01000000, **options)  # CREATE_BREAKAWAY_FROM_JOB
    except OSError:
        subprocess.Popen(command, creationflags=detached, **options)  # the job forbids breakaway


def show_event(item: dict) -> None:
    kind = item["type"]
    if kind == "prompt":
        print(f"\n> {item['text']}")
    elif kind == "started":
        plan = f" ({item['plan']})" if item.get("plan") else ""
        print(f"  native session {item.get('native_id')} | model {item.get('model')} | auth {item.get('auth')}{plan}")
    elif kind == "text":
        print(item["text"])
    elif kind == "tool":
        print(f"  -> {item.get('name')}: {one_line(item.get('input'))}")
    elif kind == "tool_result":
        print(f"  <- {'ok' if item.get('ok') else 'error'}: {one_line(item.get('output'))}")
    elif kind == "warning":
        print(f"  ! {item.get('message')}")
    elif kind == "declined":
        print(f"  x declined {item.get('request')}")
    elif kind == "done":
        if item.get("ok"):
            seconds = (item.get("duration_ms") or 0) / 1000
            denied = item.get("denied")
            print(f"  done in {seconds:.1f}s" + (f"; permission denied for {', '.join(denied)}" if denied else ""))
        else:
            print(f"  FAILED: {item.get('error')}")


def one_line(value, limit: int = 160) -> str:
    text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
    text = " ".join((text or "").split())
    return text if len(text) <= limit else text[: limit - 3] + "..."


def cmd_sessions(args) -> int:
    for session in SessionStore().all():
        done = session.last_done or {}
        first = next((r["text"] for r in session.records if r["type"] == "prompt"), "")
        status = session.status
        if args.json:
            summary = {
                "id": session.id,
                "agent": session.agent,
                "cwd": session.cwd,
                "mode": session.mode,
                "turns": session.turns,
                "status": status,
                "updated": session.records[-1].get("time") or session.meta.get("created"),
                "native_id": session.native_id,
                "first_prompt": clip(first, 200),
                "last_result": clip(done.get("result") or done.get("error"), 300) if done else None,
            }
            print(json.dumps(summary))
        else:
            print(f"{session.id}  {session.turns} turn(s)  {status:<8} {session.cwd}  {one_line(first, 60)}")
    return 0


def cmd_show(args) -> int:
    session = SessionStore().load(args.session)
    print(f"[{session.agent}] session {session.id} in {session.cwd} ({session.mode}, {session.status})")
    print(f"trace: {session.path}")
    for record in session.records[1:]:
        show_event(record)
    return 0


def cmd_stop(args) -> int:
    session = SessionStore().load(args.session)
    prompt = session.open_prompt
    if not prompt or session.status != "running":
        raise HarnessError(f"session {session.id} has no running turn (status: {session.status})")
    pid = prompt["pid"]
    if os.name == "nt":
        kill_tree(pid)  # the worker and the CLI under it
    else:
        os.kill(pid, signal.SIGTERM)  # the worker records its own interruption
    deadline = time.monotonic() + 15
    while pid_alive(pid) and time.monotonic() < deadline:
        time.sleep(0.2)
    session = SessionStore().load(session.id)
    if session.open_prompt:  # killed before it could record the end of the turn
        record = event("done", ok=False, error="stopped by the user", turn=session.turns)
        session.append({**record, "time": time.strftime("%Y-%m-%dT%H:%M:%S")})
    print(f"session {session.id} stopped")
    return 0


def cmd_check(args) -> int:
    probes = {"claude": ["auth", "status", "--json"], "codex": ["login", "status"]}
    ready = True
    for name, status_args in probes.items():
        try:
            command = ADAPTERS[name]().command
        except HarnessError as exc:
            print(f"{name}: {exc}")
            ready = False
            continue
        version = capture(command + ["--version"])
        status = capture(command + status_args)
        if name == "claude":
            try:
                info = json.loads(status)
                logged_in = bool(info.get("loggedIn"))
                status = f"{info.get('authMethod')}, {info.get('subscriptionType')}" if logged_in else "not logged in"
            except json.JSONDecodeError:
                logged_in = False
        else:
            logged_in = status.lower().startswith("logged in")
        ready = ready and logged_in
        print(f"{name}: {version} | {status}")
    return 0 if ready else 1


def capture(command) -> str:
    try:
        result = subprocess.run(
            command,
            env=child_env(),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=60,
            creationflags=NO_WINDOW,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        return f"failed: {exc}"
    return (result.stdout or result.stderr).strip()


if __name__ == "__main__":
    sys.exit(main())
