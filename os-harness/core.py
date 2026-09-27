"""Shared pieces of the harness: events, child processes, and session traces.

Every adapter turns one vendor CLI turn into the same small event vocabulary:

    started      native_id, model, auth   the vendor session is ready
    text         text                     a complete assistant message
    tool         name, input              the agent started a tool call
    tool_result  ok, output               a tool call finished
    warning      message                  something the caller should know
    declined     request                  the harness refused a vendor request
    rate_limit   info                     subscription usage window (Claude)
    done         ok, result, error, ...   the turn ended; always the last event
"""

from __future__ import annotations

import json
import os
import secrets
import shutil
import signal
import subprocess
import threading
from collections import deque
from datetime import datetime
from pathlib import Path
from typing import Iterator, List, Optional

MODES = ("read-only", "workspace", "full")
OUTPUT_LIMIT = 2000  # characters of tool output kept per event

# Set by a parent Claude Code session for its own process tree. A child
# `claude` that inherits them can refuse to start as a nested session or
# attach to the parent's messaging socket, so the harness removes them.
SESSION_VARS = (
    "CLAUDECODE",
    "CLAUDE_PID",
    "CLAUDE_EFFORT",
    "CLAUDE_CODE_ENTRYPOINT",
    "CLAUDE_CODE_EXECPATH",
    "CLAUDE_CODE_SESSION_ID",
    "CLAUDE_CODE_CHILD_SESSION",
    "CLAUDE_CODE_SESSION_ATTENDED",
    "CLAUDE_CODE_BRIDGE_SESSION_ID",
    "CLAUDE_CODE_MESSAGING_SOCKET",
    "CLAUDE_CODE_MESSAGING_TOKEN",
    "CLAUDE_CODE_SSE_PORT",
)
# Removed so the CLIs run on the user's subscription login, never an API key.
API_KEY_VARS = ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN")

DEFAULT_SESSIONS = Path(__file__).resolve().parent / "sessions"
# Console programs started from a background worker would otherwise open a window.
NO_WINDOW = 0x08000000 if os.name == "nt" else 0  # CREATE_NO_WINDOW


class HarnessError(Exception):
    """A failure reported as a failed turn or a CLI error, not a traceback."""


def event(kind: str, **fields) -> dict:
    return {"type": kind, **fields}


def clip(text, limit: int = OUTPUT_LIMIT) -> str:
    text = "" if text is None else str(text)
    if len(text) <= limit:
        return text
    return f"{text[:limit]}... [{len(text) - limit} more characters]"


def child_env() -> dict:
    env = dict(os.environ)
    for name in SESSION_VARS + API_KEY_VARS:
        env.pop(name, None)
    return env


def pid_alive(pid: Optional[int]) -> bool:
    if not pid:
        return False
    if os.name == "nt":
        import ctypes

        kernel32 = ctypes.windll.kernel32
        handle = kernel32.OpenProcess(0x1000, False, pid)  # PROCESS_QUERY_LIMITED_INFORMATION
        if not handle:
            return False
        code = ctypes.c_ulong()
        ok = kernel32.GetExitCodeProcess(handle, ctypes.byref(code))
        kernel32.CloseHandle(handle)
        return bool(ok) and code.value == 259  # STILL_ACTIVE
    try:
        os.kill(pid, 0)  # signal 0 only checks; on Windows os.kill would terminate
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def kill_tree(pid: int) -> None:
    """Kill a process and its children (on POSIX: its process group)."""
    if os.name == "nt":
        # The CLIs can be .cmd shims; /T also ends the real binary below them.
        subprocess.run(
            ["taskkill", "/T", "/F", "/PID", str(pid)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=NO_WINDOW,
        )
    else:
        try:
            os.killpg(pid, signal.SIGKILL)
        except ProcessLookupError:
            pass


def find_cli(name: str, override_var: str) -> List[str]:
    """Command prefix for a vendor CLI: the override variable, else PATH.

    The override holds a path, or a JSON list such as
    '["python", "tests/fake_claude.py"]' for a command with arguments.
    """
    override = os.environ.get(override_var)
    if override:
        return json.loads(override) if override.lstrip().startswith("[") else [override]
    path = shutil.which(name)
    if not path:
        raise HarnessError(f"`{name}` was not found on PATH; install it or set {override_var}.")
    return [path]


class Child:
    """A vendor CLI subprocess that prints one JSON object per stdout line."""

    def __init__(self, command: List[str], cwd: str, timeout: Optional[float] = None):
        try:
            self.proc = subprocess.Popen(
                command,
                cwd=cwd,
                env=child_env(),
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                errors="replace",
                bufsize=1,
                start_new_session=os.name != "nt",
                creationflags=NO_WINDOW,
            )
        except OSError as exc:
            raise HarnessError(f"could not start {command[0]}: {exc}") from exc
        self.timeout = timeout
        self.timed_out = False
        self._stderr: deque = deque(maxlen=20)
        self._stderr_reader = threading.Thread(target=self._drain_stderr, daemon=True)
        self._stderr_reader.start()
        self._timer = None
        if timeout:
            self._timer = threading.Timer(timeout, self._expire)
            self._timer.daemon = True
            self._timer.start()

    def _drain_stderr(self) -> None:
        try:
            for line in self.proc.stderr:
                if line.strip():
                    self._stderr.append(line.rstrip())
        except (OSError, ValueError):
            pass  # the pipe was closed by finish()

    def _expire(self) -> None:
        self.timed_out = True
        self.kill()

    def send(self, text: str) -> None:
        try:
            self.proc.stdin.write(text)
            self.proc.stdin.flush()
        except (OSError, ValueError) as exc:
            raise HarnessError(f"the agent process closed its input: {exc}") from exc

    def send_json(self, message: dict) -> None:
        self.send(json.dumps(message) + "\n")

    def close_stdin(self) -> None:
        try:
            self.proc.stdin.close()
        except OSError:
            pass

    def messages(self) -> Iterator[dict]:
        """Yield each JSON object the child prints; other lines are skipped."""
        for line in self.proc.stdout:
            line = line.strip()
            if not line.startswith("{"):
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue

    def failure(self, code: Optional[int] = None) -> str:
        """Explain why the child stopped without finishing its turn."""
        if self.timed_out:
            return f"timed out after {self.timeout:g}s"
        if code is None:
            try:
                code = self.proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                pass
        self._stderr_reader.join(timeout=2)
        tail = "\n".join(self._stderr)
        reason = f"the agent process exited with code {code}"
        return f"{reason}: {tail}" if tail else reason

    def kill(self) -> None:
        if self.proc.poll() is None:
            kill_tree(self.proc.pid)  # the child leads its own process group on POSIX

    def finish(self, grace: float = 10.0) -> int:
        """Close stdin, let the child exit within `grace` seconds, else kill it."""
        self.close_stdin()
        try:
            code = self.proc.wait(timeout=grace)
        except subprocess.TimeoutExpired:
            self.kill()
            code = self.proc.wait()
        finally:
            if self._timer:
                self._timer.cancel()
        self._stderr_reader.join(timeout=2)
        for stream in (self.proc.stdout, self.proc.stderr):
            try:
                stream.close()
            except OSError:
                pass
        return code


class Session:
    """One OS-level conversation with one agent, stored as a JSONL trace."""

    def __init__(self, path: Path, records: List[dict]):
        self.path = path
        self.records = records
        self.meta = records[0]

    @property
    def id(self) -> str:
        return self.meta["id"]

    @property
    def agent(self) -> str:
        return self.meta["agent"]

    @property
    def cwd(self) -> str:
        return self.meta["cwd"]

    @property
    def mode(self) -> str:
        return self.meta["mode"]

    @property
    def model(self) -> Optional[str]:
        return self.meta.get("model")

    @property
    def native_id(self) -> Optional[str]:
        """The vendor's own session or thread id, used to resume."""
        for record in reversed(self.records):
            if record.get("native_id"):
                return record["native_id"]
        return None

    @property
    def turns(self) -> int:
        return sum(1 for record in self.records if record["type"] == "prompt")

    @property
    def last_done(self) -> Optional[dict]:
        for record in reversed(self.records):
            if record["type"] == "done":
                return record
        return None

    @property
    def open_prompt(self) -> Optional[dict]:
        """The prompt of a turn that has no `done` record yet, if any."""
        for record in reversed(self.records):
            if record["type"] == "done":
                return None
            if record["type"] == "prompt":
                return record
        return None

    @property
    def status(self) -> str:
        """new, running, ok, failed, or stopped (its process died mid-turn)."""
        prompt = self.open_prompt
        if prompt:
            return "running" if pid_alive(prompt.get("pid")) else "stopped"
        done = self.last_done
        if done:
            return "ok" if done.get("ok") else "failed"
        return "new"

    def append(self, record: dict) -> None:
        with self.path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, ensure_ascii=False) + "\n")
        self.records.append(record)


class SessionStore:
    """Session traces: one `<id>.jsonl` file per session in one directory."""

    def __init__(self, root: Optional[Path] = None):
        self.root = Path(root or os.environ.get("OS_HARNESS_SESSIONS") or DEFAULT_SESSIONS)

    def create(self, agent: str, cwd: str, mode: str, model: Optional[str]) -> Session:
        self.root.mkdir(parents=True, exist_ok=True)
        now = datetime.now()
        session_id = f"{now:%Y%m%d-%H%M%S}-{agent}-{secrets.token_hex(2)}"
        meta = event(
            "session",
            id=session_id,
            agent=agent,
            cwd=cwd,
            mode=mode,
            model=model,
            created=now.isoformat(timespec="seconds"),
        )
        path = self.root / f"{session_id}.jsonl"
        path.write_text(json.dumps(meta, ensure_ascii=False) + "\n", encoding="utf-8")
        return Session(path, [meta])

    def load(self, session_id: str) -> Session:
        path = self.root / f"{session_id}.jsonl"
        if not path.is_file():
            raise HarnessError(f"no session {session_id} in {self.root}")
        records = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
        return Session(path, records)

    def all(self) -> List[Session]:
        if not self.root.is_dir():
            return []
        return [self.load(path.stem) for path in sorted(self.root.glob("*.jsonl"))]


def run_turn(session: Session, adapter, prompt: str, timeout: Optional[float] = None) -> Iterator[dict]:
    """Run one turn, record every event in the session trace, and yield it."""
    turn = session.turns + 1

    def record(item: dict) -> dict:
        item = {**item, "turn": turn, "time": datetime.now().isoformat(timespec="seconds")}
        session.append(item)
        return item

    record(event("prompt", text=prompt, pid=os.getpid()))  # the pid tells running from stopped
    finished = False
    try:
        for item in adapter.run_turn(
            prompt,
            cwd=session.cwd,
            mode=session.mode,
            model=session.model,
            native_id=session.native_id,
            timeout=timeout,
        ):
            finished = finished or item["type"] == "done"
            yield record(item)
    except KeyboardInterrupt:
        record(event("done", ok=False, error="interrupted by the user"))
        raise
    if not finished:
        yield record(event("done", ok=False, error="the adapter ended without a result"))
