"""Live tests against the real CLIs; they use a little subscription quota.

Skipped unless OS_HARNESS_LIVE=1. Pick models with OS_HARNESS_LIVE_CLAUDE_MODEL
(default "haiku") and OS_HARNESS_LIVE_CODEX_MODEL (default: Codex's own).
Chat turns run read-only and the file-writing turn runs in workspace mode;
OS_HARNESS_LIVE_MODE=full runs every turn in full mode instead, for machines
where Codex's Windows sandbox is not set up.
"""

import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from adapter_claude import ClaudeAdapter  # noqa: E402
from adapter_codex import CodexAdapter  # noqa: E402
from core import SessionStore, run_turn  # noqa: E402

LIVE = os.environ.get("OS_HARNESS_LIVE") == "1"
MODELS = {
    "claude": os.environ.get("OS_HARNESS_LIVE_CLAUDE_MODEL", "haiku"),
    "codex": os.environ.get("OS_HARNESS_LIVE_CODEX_MODEL"),
}
FORCED_MODE = os.environ.get("OS_HARNESS_LIVE_MODE")
ADAPTERS = {"claude": ClaudeAdapter, "codex": CodexAdapter}
TIMEOUT = 300


@unittest.skipUnless(LIVE, "set OS_HARNESS_LIVE=1 to run against the real CLIs")
class LiveTest(unittest.TestCase):
    def turn(self, session, prompt):
        events = list(run_turn(session, ADAPTERS[session.agent](), prompt, timeout=TIMEOUT))
        done = events[-1]
        self.assertTrue(done["ok"], done.get("error"))
        return events, done

    def check_agent(self, agent):
        store = SessionStore(Path(tempfile.mkdtemp()))
        workdir = tempfile.mkdtemp()

        session = store.create(agent, workdir, FORCED_MODE or "read-only", MODELS[agent])
        events, done = self.turn(session, "Reply with exactly the word: pong")
        self.assertEqual(events[0]["type"], "started")
        self.assertEqual(events[0]["auth"], "subscription")
        self.assertIn("pong", done["result"].lower())

        _, done = self.turn(session, "Which single word did you reply with in your previous message? Answer with that word only.")
        self.assertIn("pong", done["result"].lower())
        self.assertEqual(session.turns, 2)

        session = store.create(agent, workdir, FORCED_MODE or "workspace", MODELS[agent])
        self.turn(session, f"Create a file named hello.txt in the current directory containing exactly: hi from {agent}")
        written = Path(workdir, "hello.txt").read_text(encoding="utf-8").strip()
        self.assertEqual(written, f"hi from {agent}")

    def test_claude(self):
        self.check_agent("claude")

    def test_codex(self):
        self.check_agent("codex")


if __name__ == "__main__":
    unittest.main()
