"""Stand-in for `claude --print --output-format stream-json` in the tests.

Prompts starting with CRASH exit with an error; SLEEP hangs so a timeout fires.
The reply echoes the prompt and the arguments so tests can check both.
"""

import json
import sys
import time
import uuid

args = sys.argv[1:]
prompt = sys.stdin.buffer.read().decode("utf-8")  # like the real CLI, whatever the code page
session_id = args[args.index("--resume") + 1] if "--resume" in args else str(uuid.uuid4())


def emit(message):
    print(json.dumps(message), flush=True)


if prompt.startswith("CRASH"):
    print("fake claude crashed", file=sys.stderr)
    sys.exit(3)
if prompt.startswith("SLEEP"):
    time.sleep(60)

emit({"type": "system", "subtype": "hook_started", "session_id": session_id})
if "--resume" in args:  # like the real CLI, replay the previous turn's init and result first
    emit({"type": "system", "subtype": "init", "session_id": session_id, "model": "fake-claude", "apiKeySource": "none"})
    emit({"type": "result", "subtype": "success", "is_error": False, "result": "REPLAYED previous result",
          "session_id": session_id, "duration_ms": 94})
emit({"type": "system", "subtype": "init", "session_id": session_id, "model": "fake-claude", "apiKeySource": "none"})
emit({"type": "assistant", "message": {"content": [
    {"type": "thinking", "thinking": ""},
    {"type": "tool_use", "id": "t1", "name": "Bash", "input": {"command": "echo hi"}},
]}})
emit({"type": "user", "message": {"content": [
    {"type": "tool_result", "tool_use_id": "t1", "content": [{"type": "text", "text": "hi"}], "is_error": False},
]}})
reply = f"echo: {prompt.strip()} | args: {' '.join(args)}"
emit({"type": "assistant", "message": {"content": [{"type": "text", "text": reply}]}})
emit({"type": "rate_limit_event", "rate_limit_info": {"status": "allowed", "rateLimitType": "five_hour"}})
emit({
    "type": "result",
    "subtype": "success",
    "is_error": False,
    "result": reply,
    "session_id": session_id,
    "duration_ms": 5,
    "total_cost_usd": 0.0,
    "usage": {"input_tokens": 1, "output_tokens": 1},
    "permission_denials": [{"tool_name": "WebFetch"}],
})
