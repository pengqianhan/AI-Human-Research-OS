/**
 * Preloaded by `npm test` here and in os-ui/client (`node --test --import`),
 * so it runs in the runner and in every test file's process; it does nothing
 * in the runner, nor anywhere but Windows unless OS_UI_TEST_GUARD=1. There it
 * says, on stderr (which the runner prints as "# [test-guard] ..." lines),
 * what keeps a file from ending:
 * - when the file's tests are done but its process is still up GRACE_MS
 *   later, so something holds its event loop open;
 * - a minute before the runner's --test-timeout, if the file is still
 *   running then: whatever is still waiting, a test, a hook, or the exit.
 * Each lists the event loop's resources by type, the child processes still
 * open (pid and command), the tests started and not ended, and the git the
 * Code view's handler would run. Nothing is asserted, both timers are
 * unref'd so neither keeps a process up, and a healthy file ends long
 * before either fires. Added for Windows CI's stalls after the last suite of
 * codeGit.test.ts (os-ui/frontend/README.md, Tests).
 */
import { ChildProcess } from "node:child_process";
import { relative } from "node:path";
import { after, afterEach, beforeEach } from "node:test";
import { findProgram } from "./process.ts";

const GRACE_MS = 5_000;
const BEFORE_LIMIT_MS = 60_000;

if (process.env.NODE_TEST_CONTEXT !== undefined && (process.platform === "win32" || process.env.OS_UI_TEST_GUARD === "1")) {
  const file = relative(process.cwd(), process.argv[1] ?? "?");
  const running = new Set<string>();
  let lastEnded = "none";
  let testsDone = false;
  const name = (t: unknown) => String((t as { fullName?: string; name?: string }).fullName ?? (t as { name?: string }).name);

  const dump = (why: string) => {
    try {
      const types = new Map<string, number>();
      for (const type of process.getActiveResourcesInfo()) types.set(type, (types.get(type) ?? 0) + 1);
      const handles = (process as unknown as { _getActiveHandles?: () => unknown[] })._getActiveHandles?.() ?? [];
      const children = handles.filter((h): h is ChildProcess => h instanceof ChildProcess).map((c) => `${c.pid} ${c.spawnargs.join(" ")}`.slice(0, 300));
      const lines = [
        `${file} (pid ${process.pid}): ${why}`,
        `event loop: ${[...types].map(([type, n]) => `${type} ${n}`).join(", ") || "nothing"}`,
        `child processes: ${children.length === 0 ? "none" : children.join(" | ")}`,
        `tests started and not ended: ${running.size === 0 ? "none" : [...running].join(" | ")}; last ended: ${lastEnded}; all tests done: ${testsDone}`,
        `git on PATH: ${findProgram("git", process.env) ?? "none"}`,
      ];
      process.stderr.write(lines.map((line) => `[test-guard] ${line}\n`).join(""));
    } catch (error) {
      process.stderr.write(`[test-guard] ${file}: ${why}; the dump failed: ${String(error)}\n`);
    }
  };

  beforeEach((t) => {
    try {
      running.add(name(t));
    } catch {
      // the guard never fails a test
    }
  });
  afterEach((t) => {
    try {
      running.delete(name(t));
      lastEnded = name(t);
    } catch {
      // the guard never fails a test
    }
  });
  after(() => {
    try {
      testsDone = true;
      setTimeout(() => dump(`all tests done ${GRACE_MS / 1000} s ago and the process is still up`), GRACE_MS).unref();
    } catch {
      // the guard never fails a test
    }
  });

  const limit = /--test-timeout[= ](\d+)/.exec(process.execArgv.join(" "));
  if (limit !== null && Number(limit[1]) > BEFORE_LIMIT_MS) {
    setTimeout(() => dump(`still running a minute before the runner's limit of ${Number(limit[1]) / 1000} s`), Number(limit[1]) - BEFORE_LIMIT_MS).unref();
  }
}
