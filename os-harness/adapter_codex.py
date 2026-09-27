"""Codex adapter: one `codex app-server` process per turn, JSON-RPC over stdio.

Protocol checked against `codex app-server generate-json-schema` (codex-cli
0.142.4): initialize -> initialized -> account/read -> thread/start or
thread/resume -> turn/start, then notifications until turn/completed.
The app-server signs in with the CLI's own login (`codex login`).
"""

from __future__ import annotations

import itertools
import json
from typing import Iterator, List, Optional

from core import Child, HarnessError, clip, event, find_cli

SANDBOX_MODES = {
    "read-only": "read-only",
    "workspace": "workspace-write",
    "full": "danger-full-access",
}
# Turns run with approvalPolicy "never", so Codex should not ask. If it asks
# anyway, the harness declines rather than approving on the human's behalf.
DECLINE = {
    "item/commandExecution/requestApproval": {"decision": "decline"},
    "item/fileChange/requestApproval": {"decision": "decline"},
    "execCommandApproval": {"decision": "denied"},
    "applyPatchApproval": {"decision": "denied"},
}
CLIENT_INFO = {"name": "research-os-harness", "title": "Research OS harness", "version": "0.1.0"}


class CodexAdapter:
    name = "codex"

    def __init__(self, command: Optional[List[str]] = None):
        self.command = command or find_cli("codex", "OS_HARNESS_CODEX")

    def run_turn(
        self,
        prompt: str,
        cwd: str,
        mode: str = "workspace",
        model: Optional[str] = None,
        native_id: Optional[str] = None,
        timeout: Optional[float] = None,
    ) -> Iterator[dict]:
        try:
            child = Child(self.command + ["app-server"], cwd, timeout)
        except HarnessError as exc:
            yield event("done", ok=False, error=str(exc))
            return
        turn = _Turn(child)
        try:
            yield from turn.run(prompt, cwd, mode, model, native_id)
        except HarnessError as exc:
            error = child.failure() if child.timed_out else str(exc)
            yield event("done", ok=False, native_id=turn.thread_id, error=error)
        finally:
            child.finish(grace=10 if turn.done else 1)  # an unfinished turn is killed promptly


class _Turn:
    """State for one turn on one app-server connection."""

    def __init__(self, child: Child):
        self.child = child
        self.ids = itertools.count(1)
        self.pending: List[dict] = []  # events that arrived while awaiting a response
        self.thread_id: Optional[str] = None
        self.last_text: Optional[str] = None
        self.usage = None
        self.error: Optional[str] = None
        self.done: Optional[dict] = None

    def call(self, method: str, params: Optional[dict] = None) -> dict:
        request_id = next(self.ids)
        request = {"id": request_id, "method": method}
        if params is not None:
            request["params"] = params
        self.child.send_json(request)
        for message in self.child.messages():
            if message.get("id") == request_id and "method" not in message:
                if "error" in message:
                    raise HarnessError(f"codex {method} failed: {message['error'].get('message')}")
                return message.get("result") or {}
            self.pending.extend(self.handle(message))
        raise HarnessError(f"codex app-server stopped before answering {method}; {self.child.failure()}")

    def flush(self) -> List[dict]:
        items, self.pending = self.pending, []
        return items

    def run(self, prompt: str, cwd: str, mode: str, model: Optional[str], native_id: Optional[str]) -> Iterator[dict]:
        server = self.call("initialize", {"clientInfo": CLIENT_INFO})
        self.child.send_json({"method": "initialized"})
        account = self.call("account/read", {}).get("account")
        if not account:
            raise HarnessError("Codex is not logged in; run `codex login` first.")
        if server.get("platformFamily") == "windows" and mode != "full":
            # A sandboxed tool call waits indefinitely while this sandbox is not ready.
            status = self.call("windowsSandbox/readiness").get("status")
            if status != "ready":
                raise HarnessError(
                    f"Codex's Windows sandbox is {status!r}, so {mode} mode would stall on its first "
                    "tool call. Complete the Windows sandbox setup in Codex, or use --mode full."
                )

        settings = {"cwd": cwd, "sandbox": SANDBOX_MODES[mode], "approvalPolicy": "never"}
        if model:
            settings["model"] = model
        if native_id:
            thread = self.call("thread/resume", {**settings, "threadId": native_id})
        else:
            thread = self.call("thread/start", settings)
        self.thread_id = thread["thread"]["id"]

        subscription = account.get("type") == "chatgpt"
        yield event(
            "started",
            native_id=self.thread_id,
            model=thread.get("model"),
            auth="subscription" if subscription else account.get("type"),
            plan=account.get("planType"),
        )
        if not subscription:
            yield event("warning", message=f"Codex is using {account.get('type')}, not a ChatGPT subscription login.")

        yield from self.flush()
        self.call("turn/start", {"threadId": self.thread_id, "input": [{"type": "text", "text": prompt}]})
        yield from self.flush()
        if self.done:
            return
        for message in self.child.messages():
            yield from self.handle(message)
            if self.done:
                return
        raise HarnessError(f"codex app-server stopped before the turn completed; {self.child.failure()}")

    def handle(self, message: dict) -> List[dict]:
        """React to one server message and return the events it produces."""
        method = message.get("method")
        if method and "id" in message:  # a request from the server to us
            reply = DECLINE.get(method)
            if reply:
                self.child.send_json({"id": message["id"], "result": reply})
            else:
                error = {"code": -32601, "message": f"{method} is not supported by the Research OS harness"}
                self.child.send_json({"id": message["id"], "error": error})
            return [event("declined", request=method)]

        params = message.get("params") or {}
        if self.thread_id and params.get("threadId") not in (None, self.thread_id):
            return []  # sub-agent threads are not part of this turn's record
        item = params.get("item") or {}

        if method == "item/started":
            call = _tool_call(item)
            return [call] if call else []
        if method == "item/completed":
            if item.get("type") == "agentMessage":
                self.last_text = item.get("text", "")
                return [event("text", text=self.last_text)]
            result = _tool_result(item)
            return [result] if result else []
        if method == "warning":
            return [event("warning", message=params.get("message"))]
        if method == "thread/tokenUsage/updated":
            self.usage = params.get("tokenUsage")
        elif method == "error" and not params.get("willRetry"):
            self.error = (params.get("error") or {}).get("message")
        elif method == "turn/completed":
            turn = params.get("turn") or {}
            ok = turn.get("status") == "completed"
            self.done = event(
                "done",
                ok=ok,
                result=self.last_text,
                native_id=self.thread_id,
                duration_ms=turn.get("durationMs"),
                usage=self.usage,
            )
            if not ok:
                self.done["error"] = (turn.get("error") or {}).get("message") or self.error or turn.get("status")
            return [self.done]
        return []


def _tool_call(item: dict) -> Optional[dict]:
    kind = item.get("type")
    if kind == "commandExecution":
        return event("tool", name="shell", input=item.get("command"))
    if kind == "fileChange":
        return event("tool", name="edit", input=[change.get("path") for change in item.get("changes") or []])
    if kind == "mcpToolCall":
        return event("tool", name=f"{item.get('server')}.{item.get('tool')}", input=item.get("arguments"))
    if kind == "dynamicToolCall":
        return event("tool", name=item.get("tool"), input=item.get("arguments"))
    if kind == "webSearch":
        return event("tool", name="web_search", input=item.get("query"))
    return None


def _tool_result(item: dict) -> Optional[dict]:
    kind = item.get("type")
    completed = item.get("status") == "completed"
    if kind == "commandExecution":
        ok = completed and item.get("exitCode") in (0, None)
        return event("tool_result", ok=ok, output=clip(item.get("aggregatedOutput") or item.get("status")))
    if kind == "fileChange":
        paths = ", ".join(change.get("path", "") for change in item.get("changes") or [])
        return event("tool_result", ok=completed, output=paths if completed else item.get("status"))
    if kind in ("mcpToolCall", "dynamicToolCall"):
        output = item.get("error") or item.get("result") or item.get("contentItems")
        return event("tool_result", ok=completed, output=clip(json.dumps(output, ensure_ascii=False)))
    return None
