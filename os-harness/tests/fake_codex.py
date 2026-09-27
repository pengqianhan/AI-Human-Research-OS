"""Stand-in for `codex app-server` (JSON-RPC over stdio) in the tests.

Each turn runs one shell command, asks the client for an approval it should
decline, and replies with the prompt, thread, sandbox, and that decision.
Prompts starting with FAIL end the turn with status "failed".
FAKE_CODEX_PLATFORM and FAKE_CODEX_SANDBOX set the reported platform family
and Windows sandbox readiness.
"""

import json
import os
import sys

thread_id = None
sandbox = None


def send(message):
    print(json.dumps(message), flush=True)


def receive():
    line = sys.stdin.readline()
    return json.loads(line) if line else None


def notify(method, **params):
    send({"method": method, "params": {"threadId": thread_id, "turnId": "turn-1", **params}})


while True:
    message = receive()
    if message is None:
        break
    method, request_id, params = message.get("method"), message.get("id"), message.get("params") or {}
    if method == "initialize":
        platform = os.environ.get("FAKE_CODEX_PLATFORM", "unix")
        send({"id": request_id, "result": {"userAgent": "fake", "codexHome": "", "platformFamily": platform, "platformOs": platform}})
    elif method == "initialized":
        pass
    elif method == "windowsSandbox/readiness":
        send({"id": request_id, "result": {"status": os.environ.get("FAKE_CODEX_SANDBOX", "ready")}})
    elif method == "account/read":
        send({"id": request_id, "result": {"account": {"type": "chatgpt", "planType": "plus"}, "requiresOpenaiAuth": True}})
    elif method in ("thread/start", "thread/resume"):
        thread_id = params.get("threadId", "thread-new")
        sandbox = params.get("sandbox")
        send({"method": "thread/started", "params": {"thread": {"id": thread_id}}})
        send({"method": "warning", "params": {"threadId": thread_id, "message": "fake model metadata missing"}})
        send({"id": request_id, "result": {"thread": {"id": thread_id}, "model": "fake-codex"}})
    elif method == "turn/start":
        text = params["input"][0]["text"]
        send({"id": request_id, "result": {"turn": {"id": "turn-1", "status": "inProgress", "items": []}}})
        command = {"type": "commandExecution", "id": "c1", "command": "echo hi", "cwd": ".", "commandActions": []}
        notify("item/started", item={**command, "status": "inProgress"})
        send({"id": 900, "method": "item/commandExecution/requestApproval", "params": {"threadId": thread_id, "itemId": "c1"}})
        decision = (receive().get("result") or {}).get("decision")
        notify("item/completed", item={**command, "status": "completed", "exitCode": 0, "aggregatedOutput": "hi\n"})
        send({"method": "item/completed", "params": {"threadId": "sub-agent", "item": {"type": "agentMessage", "id": "x", "text": "IGNORED"}}})
        notify("thread/tokenUsage/updated", tokenUsage={"total": {"totalTokens": 42}})
        if text.startswith("FAIL"):
            notify("error", error={"message": "boom"}, willRetry=False)
            notify("turn/completed", turn={"id": "turn-1", "status": "failed", "error": {"message": "boom"}, "items": []})
        else:
            reply = f"echo: {text} | thread: {thread_id} | sandbox: {sandbox} | decision: {decision}"
            notify("item/completed", item={"type": "agentMessage", "id": "m1", "text": reply})
            notify("turn/completed", turn={"id": "turn-1", "status": "completed", "durationMs": 7, "items": []})
    elif request_id is not None:
        send({"id": request_id, "error": {"code": -32601, "message": f"unknown method {method}"}})
