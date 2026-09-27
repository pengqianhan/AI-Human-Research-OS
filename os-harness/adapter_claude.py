"""Claude Code adapter: one `claude --print` process per turn, stream-json output.

The prompt goes in on stdin, so no shell quoting is involved. The CLI signs in
with its own login; `apiKeySource` in its init message says whether that is the
subscription ("none") or an API key.
"""

from __future__ import annotations

from typing import Iterator, List, Optional

from core import Child, HarnessError, clip, event, find_cli

PERMISSION_MODES = {
    "read-only": "dontAsk",  # tools that would ask for permission are refused
    "workspace": "acceptEdits",  # file edits are accepted; other asks are refused
    "full": "bypassPermissions",  # everything runs without asking
}


class ClaudeAdapter:
    name = "claude"

    def __init__(self, command: Optional[List[str]] = None):
        self.command = command or find_cli("claude", "OS_HARNESS_CLAUDE")

    def arguments(self, mode: str, model: Optional[str] = None, native_id: Optional[str] = None) -> List[str]:
        args = ["--print", "--output-format", "stream-json", "--verbose", "--permission-mode", PERMISSION_MODES[mode]]
        if model:
            args += ["--model", model]
        if native_id:
            args += ["--resume", native_id]
        return args

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
            child = Child(self.command + self.arguments(mode, model, native_id), cwd, timeout)
        except HarnessError as exc:
            yield event("done", ok=False, error=str(exc))
            return
        done = None
        started = False
        try:
            try:
                child.send(prompt)
            except HarnessError:
                pass  # the exit code and stderr below explain what happened
            child.close_stdin()
            for message in child.messages():
                for item in translate(message):
                    # `--resume` replays the previous turn's init and result before this
                    # turn's own messages, so a result is final only if nothing follows it.
                    done = None
                    if item["type"] == "done":
                        done = item
                    elif item["type"] == "started" and started:
                        continue  # the replayed init, or the real one after it
                    else:
                        started = started or item["type"] == "started"
                        yield item
        finally:
            code = child.finish(grace=10 if done else 1)  # an unfinished turn is killed promptly
        if done is None:
            yield event("done", ok=False, error=child.failure(code))
        else:
            yield done


def translate(message: dict) -> List[dict]:
    """Map one stream-json line from `claude` to harness events."""
    kind = message.get("type")
    if kind == "system" and message.get("subtype") == "init":
        source = message.get("apiKeySource")
        subscription = source in (None, "none")
        items = [
            event(
                "started",
                native_id=message.get("session_id"),
                model=message.get("model"),
                auth="subscription" if subscription else source,
            )
        ]
        if not subscription:
            items.append(event("warning", message=f"Claude is using {source}, not the subscription login."))
        return items
    if kind == "assistant":
        items = []
        for block in message.get("message", {}).get("content") or []:
            if block.get("type") == "text" and block.get("text"):
                items.append(event("text", text=block["text"]))
            elif block.get("type") == "tool_use":
                items.append(event("tool", name=block.get("name"), input=block.get("input")))
        return items
    if kind == "user":
        content = message.get("message", {}).get("content")
        if not isinstance(content, list):
            return []
        return [
            event("tool_result", ok=not block.get("is_error"), output=clip(_text(block.get("content"))))
            for block in content
            if isinstance(block, dict) and block.get("type") == "tool_result"
        ]
    if kind == "rate_limit_event":
        return [event("rate_limit", info=message.get("rate_limit_info"))]
    if kind == "result":
        ok = message.get("subtype") == "success" and not message.get("is_error")
        done = event(
            "done",
            ok=ok,
            result=message.get("result"),
            native_id=message.get("session_id"),
            duration_ms=message.get("duration_ms"),
            cost_usd=message.get("total_cost_usd"),
            usage=message.get("usage"),
            denied=[denial.get("tool_name") for denial in message.get("permission_denials") or []],
        )
        if not ok:
            done["error"] = message.get("result") or message.get("subtype")
        return [done]
    return []


def _text(content) -> str:
    """Tool results arrive as a string or as a list of content blocks."""
    if isinstance(content, list):
        return "\n".join(block.get("text", "") for block in content if isinstance(block, dict))
    return "" if content is None else str(content)
