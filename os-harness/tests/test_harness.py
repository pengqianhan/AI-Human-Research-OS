"""Offline tests: the adapters and CLI run against fake vendor CLIs."""

import contextlib
import io
import json
import os
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest import mock

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

import harness  # noqa: E402
from adapter_claude import ClaudeAdapter  # noqa: E402
from adapter_codex import CodexAdapter  # noqa: E402
from core import SessionStore, child_env, run_turn  # noqa: E402

FAKE_CLAUDE = [sys.executable, str(HERE / "fake_claude.py")]
FAKE_CODEX = [sys.executable, str(HERE / "fake_codex.py")]


def kinds(events):
    return [item["type"] for item in events]


class ClaudeAdapterTest(unittest.TestCase):
    def setUp(self):
        self.cwd = tempfile.mkdtemp()

    def test_turn_maps_stream_json_to_events(self):
        events = list(ClaudeAdapter(FAKE_CLAUDE).run_turn("hello", self.cwd, mode="read-only", model="haiku"))
        self.assertEqual(kinds(events), ["started", "tool", "tool_result", "text", "rate_limit", "done"])
        started, tool, result, text, _, done = events
        self.assertEqual(started["auth"], "subscription")
        self.assertEqual(tool, {"type": "tool", "name": "Bash", "input": {"command": "echo hi"}})
        self.assertEqual((result["ok"], result["output"]), (True, "hi"))
        self.assertIn("echo: hello", text["text"])
        self.assertIn("--permission-mode dontAsk", text["text"])
        self.assertIn("--model haiku", text["text"])
        self.assertTrue(done["ok"])
        self.assertEqual(done["native_id"], started["native_id"])
        self.assertEqual(done["denied"], ["WebFetch"])

    def test_resume_passes_the_native_session_id_and_skips_the_replay(self):
        events = list(ClaudeAdapter(FAKE_CLAUDE).run_turn("again", self.cwd, native_id="abc-123"))
        self.assertIn("--resume abc-123", events[-1]["result"])
        self.assertEqual(events[-1]["native_id"], "abc-123")
        # `claude --resume` replays the previous turn's init and result; only the final result counts
        self.assertEqual(kinds(events).count("started"), 1)
        self.assertEqual(kinds(events).count("done"), 1)
        self.assertNotIn("REPLAYED", events[-1]["result"])

    def test_crash_reports_exit_code_and_stderr(self):
        done = list(ClaudeAdapter(FAKE_CLAUDE).run_turn("CRASH", self.cwd))[-1]
        self.assertFalse(done["ok"])
        self.assertIn("code 3", done["error"])
        self.assertIn("fake claude crashed", done["error"])

    def test_timeout_kills_the_process(self):
        start = time.monotonic()
        done = list(ClaudeAdapter(FAKE_CLAUDE).run_turn("SLEEP", self.cwd, timeout=1))[-1]
        self.assertLess(time.monotonic() - start, 30)
        self.assertEqual((done["ok"], done["error"]), (False, "timed out after 1s"))

    def test_api_key_source_warns(self):
        from adapter_claude import translate

        items = translate({"type": "system", "subtype": "init", "session_id": "s", "apiKeySource": "ANTHROPIC_API_KEY"})
        self.assertEqual(kinds(items), ["started", "warning"])
        self.assertEqual(items[0]["auth"], "ANTHROPIC_API_KEY")


class CodexAdapterTest(unittest.TestCase):
    def setUp(self):
        self.cwd = tempfile.mkdtemp()

    def test_turn_maps_notifications_to_events(self):
        events = list(CodexAdapter(FAKE_CODEX).run_turn("hello", self.cwd, mode="workspace"))
        self.assertEqual(kinds(events), ["started", "warning", "tool", "declined", "tool_result", "text", "done"])
        started, warning, tool, declined, result, text, done = events
        self.assertEqual(warning["message"], "fake model metadata missing")
        self.assertEqual((started["native_id"], started["auth"], started["plan"]), ("thread-new", "subscription", "plus"))
        self.assertEqual((tool["name"], tool["input"]), ("shell", "echo hi"))
        self.assertEqual(declined["request"], "item/commandExecution/requestApproval")
        self.assertEqual((result["ok"], result["output"]), (True, "hi\n"))
        self.assertEqual(text["text"], "echo: hello | thread: thread-new | sandbox: workspace-write | decision: decline")
        self.assertTrue(done["ok"])
        self.assertEqual(done["result"], text["text"])
        self.assertEqual(done["usage"], {"total": {"totalTokens": 42}})

    def test_resume_uses_thread_resume(self):
        done = list(CodexAdapter(FAKE_CODEX).run_turn("again", self.cwd, mode="read-only", native_id="thread-7"))[-1]
        self.assertTrue(done["ok"])
        self.assertIn("thread: thread-7 | sandbox: read-only", done["result"])

    def test_failed_turn_reports_the_error(self):
        done = list(CodexAdapter(FAKE_CODEX).run_turn("FAIL please", self.cwd))[-1]
        self.assertEqual((done["ok"], done["error"]), (False, "boom"))

    def test_windows_sandbox_not_ready_fails_fast_unless_full(self):
        with mock.patch.dict(os.environ, {"FAKE_CODEX_PLATFORM": "windows", "FAKE_CODEX_SANDBOX": "updateRequired"}):
            done = list(CodexAdapter(FAKE_CODEX).run_turn("hi", self.cwd, mode="workspace"))[-1]
            self.assertFalse(done["ok"])
            self.assertIn("'updateRequired'", done["error"])
            done = list(CodexAdapter(FAKE_CODEX).run_turn("hi", self.cwd, mode="full"))[-1]
            self.assertTrue(done["ok"], done.get("error"))
            self.assertIn("sandbox: danger-full-access", done["result"])
        with mock.patch.dict(os.environ, {"FAKE_CODEX_PLATFORM": "windows", "FAKE_CODEX_SANDBOX": "ready"}):
            done = list(CodexAdapter(FAKE_CODEX).run_turn("hi", self.cwd, mode="workspace"))[-1]
            self.assertTrue(done["ok"], done.get("error"))

    def test_missing_binary_is_a_failed_turn(self):
        done = list(CodexAdapter([str(HERE / "no-such-codex")]).run_turn("hi", self.cwd))[-1]
        self.assertFalse(done["ok"])
        self.assertIn("could not start", done["error"])


class SessionAndCliTest(unittest.TestCase):
    def setUp(self):
        self.store_dir = tempfile.mkdtemp()
        self.cwd = tempfile.mkdtemp()
        env = {
            "OS_HARNESS_SESSIONS": self.store_dir,
            "OS_HARNESS_CLAUDE": json.dumps(FAKE_CLAUDE),
            "OS_HARNESS_CODEX": json.dumps(FAKE_CODEX),
        }
        patcher = mock.patch.dict(os.environ, env)
        patcher.start()
        self.addCleanup(patcher.stop)

    def cli(self, *argv):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = harness.main(list(argv))
        return code, out.getvalue()

    def test_run_resume_and_list(self):
        for agent in ("claude", "codex"):
            code, out = self.cli("run", "--agent", agent, "--cwd", self.cwd, "--json", "first")
            self.assertEqual(code, 0, out)
            events = [json.loads(line) for line in out.splitlines()]
            session_id = events[-1]["session"]
            self.assertEqual(events[-1]["type"], "done")

            code, out = self.cli("resume", session_id, "--json", "second")
            self.assertEqual(code, 0, out)
            done = json.loads(out.splitlines()[-1])
            self.assertEqual(done["turn"], 2)
            self.assertEqual(done["native_id"], events[0]["native_id"])

            session = SessionStore().load(session_id)
            self.assertEqual((session.agent, session.turns, session.cwd), (agent, 2, str(Path(self.cwd).resolve())))
            self.assertEqual(kinds(session.records)[:2], ["session", "prompt"])

        code, out = self.cli("sessions", "--json")
        rows = [json.loads(line) for line in out.splitlines()]
        self.assertEqual(sorted(row["agent"] for row in rows), ["claude", "codex"])
        self.assertTrue(all(row["turns"] == 2 and row["status"] == "ok" for row in rows))

        code, out = self.cli("show", rows[0]["id"])
        self.assertEqual(code, 0)
        self.assertIn("> second", out)

    def test_chinese_survives_pipes_in_both_output_formats(self):
        prompt = "研究操作系统测试通过"
        script = str(HERE.parent / "harness.py")
        base = [sys.executable, script, "run", "--agent", "claude", "--cwd", self.cwd]
        piped = subprocess.run(base + ["--json", prompt], capture_output=True, timeout=60)
        self.assertEqual(piped.returncode, 0, piped.stderr)
        done = json.loads(piped.stdout.decode("ascii").splitlines()[-1])
        self.assertIn(f"echo: {prompt}", done["result"])

        from_stdin = subprocess.run(base + ["-"], input=prompt.encode("utf-8"), capture_output=True, timeout=60)
        self.assertEqual(from_stdin.returncode, 0, from_stdin.stderr)
        self.assertIn(f"echo: {prompt}", from_stdin.stdout.decode("utf-8"))

    def wait_until_finished(self, session_id, timeout=30):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            session = SessionStore().load(session_id)
            if session.status not in ("new", "running"):
                return session
            time.sleep(0.2)
        self.fail(f"session {session_id} did not finish within {timeout}s")

    def dispatch(self, *argv):
        code, out = self.cli(*argv, "--detach", "--json")
        self.assertEqual(code, 0, out)
        dispatched = json.loads(out.splitlines()[-1])
        self.assertEqual(dispatched["type"], "dispatched")
        return dispatched["session"]

    def test_detach_returns_at_once_and_the_turn_finishes_in_the_background(self):
        session_id = self.dispatch("run", "--agent", "claude", "--cwd", self.cwd, "背景任务")
        session = self.wait_until_finished(session_id)
        self.assertEqual(session.status, "ok")
        self.assertIn("echo: 背景任务", session.last_done["result"])
        self.assertFalse(session.path.with_suffix(".prompt").exists())

        self.dispatch("resume", session_id, "again")
        session = self.wait_until_finished(session_id)
        self.assertEqual((session.turns, session.status), (2, "ok"))
        self.assertIn("--resume", session.last_done["result"])

    def test_stop_ends_a_running_turn_and_resume_waits_for_it(self):
        session_id = self.dispatch("run", "--agent", "claude", "--cwd", self.cwd, "SLEEP")
        self.assertEqual(SessionStore().load(session_id).status, "running")
        with contextlib.redirect_stderr(io.StringIO()):
            code, _ = self.cli("resume", session_id, "too early")
        self.assertEqual(code, 2)

        code, out = self.cli("stop", session_id)
        self.assertEqual(code, 0, out)
        session = SessionStore().load(session_id)
        self.assertEqual(session.status, "failed")
        self.assertRegex(session.last_done["error"], "stopped|interrupted")

    def test_a_turn_whose_process_died_reads_as_stopped(self):
        finished = subprocess.Popen([sys.executable, "-c", "pass"])
        finished.wait()
        session = SessionStore().create("claude", self.cwd, "workspace", None)
        session.append({"type": "prompt", "text": "x", "pid": finished.pid, "turn": 1})
        self.assertEqual(SessionStore().load(session.id).status, "stopped")
        code, out = self.cli("sessions", "--json")
        self.assertEqual(json.loads(out.splitlines()[0])["status"], "stopped")

    def test_failed_turn_exits_nonzero_and_is_recorded(self):
        code, out = self.cli("run", "--agent", "claude", "--cwd", self.cwd, "CRASH")
        self.assertEqual(code, 1)
        self.assertIn("FAILED", out)
        session = SessionStore().all()[0]
        self.assertFalse(session.last_done["ok"])

    def test_run_turn_records_before_yielding(self):
        session = SessionStore().create("claude", self.cwd, "workspace", None)
        for item in run_turn(session, ClaudeAdapter(), "hi"):
            self.assertEqual(session.records[-1], item)
        reloaded = SessionStore().load(session.id)
        self.assertEqual(reloaded.records, session.records)

    def test_child_env_drops_session_and_key_variables(self):
        with mock.patch.dict(os.environ, {"CLAUDECODE": "1", "ANTHROPIC_API_KEY": "k", "KEEP_ME": "1"}):
            env = child_env()
        self.assertNotIn("CLAUDECODE", env)
        self.assertNotIn("ANTHROPIC_API_KEY", env)
        self.assertEqual(env["KEEP_ME"], "1")


if __name__ == "__main__":
    unittest.main()
