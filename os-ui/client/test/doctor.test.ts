import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseHarnessCheck, parseVersion, runDoctor } from "../src/main/doctor.ts";
import type { Exec } from "../src/main/doctor.ts";
import type { PythonChoice } from "../src/main/python.ts";

const UV_PYTHON: PythonChoice = { kind: "uv", prefix: ["/bin/uv", "run", "--", "python"], detail: "uv with Python 3.12" };

function exec(table: Record<string, { code: number; stdout?: string; stderr?: string } | Error>): Exec & { calls: string[] } {
  const calls: string[] = [];
  const fn = (async (command: readonly string[]) => {
    const key = command.join(" ");
    calls.push(key);
    const answer = table[key];
    if (answer instanceof Error) throw answer;
    return { code: answer?.code ?? 127, stdout: answer?.stdout ?? "", stderr: answer?.stderr ?? "" };
  }) as unknown as Exec & { calls: string[] };
  fn.calls = calls;
  return fn;
}

const HEALTHY = {
  "/bin/uv --version": { code: 0, stdout: "uv 0.11.32 (x86_64-unknown-linux-gnu)\n" },
  "/bin/uv run -- python --version": { code: 0, stdout: "Python 3.12.7\n" },
  "/usr/bin/git --version": { code: 0, stdout: "git version 2.47.1\n" },
  "/bin/uv run -- python os-harness/harness.py check": {
    code: 1,
    stdout: "claude: 2.1.283 (Claude Code) | claude.ai, max\ncodex: `codex` was not found on PATH; install it or set OS_HARNESS_CODEX.\n",
  },
};

describe("doctor parsing", () => {
  test("versions", () => {
    assert.equal(parseVersion("uv 0.11.32 (x86_64)"), "0.11.32");
    assert.equal(parseVersion("Python 3.12"), "3.12");
    assert.equal(parseVersion("no digits"), null);
  });

  test("harness check lines", () => {
    const parsed = parseHarnessCheck(
      [
        "claude: 2.1.283 (Claude Code) | claude.ai, max",
        "codex: codex-cli 0.157.1 | Not logged in",
        "noise line",
      ].join("\r\n"),
    );
    assert.deepEqual(parsed.claude, { state: "ok", version: "2.1.283", detail: "logged in: claude.ai, max" });
    assert.deepEqual(parsed.codex, { state: "warn", version: "0.157.1", detail: "installed, not logged in" });
    const missing = parseHarnessCheck("claude: `claude` was not found on PATH; install it or set OS_HARNESS_CLAUDE.");
    assert.equal(missing.claude?.state, "missing");
    assert.equal(parseHarnessCheck("codex: could not start codex: [WinError 5]").codex?.state, "error");
    assert.equal(parseHarnessCheck("claude: 1.0 | not logged in").claude?.state, "warn");
  });
});

describe("runDoctor", () => {
  const base = { workspace: "/w", workspaceProblem: null, python: UV_PYTHON, uvPath: "/bin/uv", gitPath: "/usr/bin/git", now: () => new Date("2026-10-10T00:00:00Z") };

  test("a healthy machine with one logged-in agent is ready", async () => {
    const report = await runDoctor({ ...base, exec: exec(HEALTHY) });
    const byId = Object.fromEntries(report.checks.map((c) => [c.id, c]));
    assert.equal(report.ready, true);
    assert.equal(report.at, "2026-10-10T00:00:00.000Z");
    assert.deepEqual(report.checks.map((c) => c.id), ["workspace", "uv", "python", "git", "claude", "codex"]);
    assert.equal(byId.python!.version, "3.12.7");
    assert.equal(byId.claude!.state, "ok");
    assert.equal(byId.codex!.state, "missing");
    assert.ok(byId.codex!.help!.startsWith("https://"));
  });

  test("the harness check runs in the workspace with the chosen Python", async () => {
    const e = exec(HEALTHY);
    await runDoctor({ ...base, exec: e });
    assert.ok(e.calls.includes("/bin/uv run -- python os-harness/harness.py check"));
  });

  test("no folder: workspace missing and agents not checked", async () => {
    const report = await runDoctor({ ...base, workspace: null, workspaceProblem: "/x is not a Research OS folder", exec: exec(HEALTHY) });
    assert.equal(report.ready, false);
    assert.equal(report.checks[0]!.state, "missing");
    assert.equal(report.checks[0]!.detail, "/x is not a Research OS folder");
    assert.equal(report.checks.find((c) => c.id === "claude")!.state, "error");
  });

  test("an old Python is an error even though it runs", async () => {
    const report = await runDoctor({ ...base, exec: exec({ ...HEALTHY, "/bin/uv run -- python --version": { code: 0, stdout: "Python 3.10.4" } }) });
    const python = report.checks.find((c) => c.id === "python")!;
    assert.equal(python.state, "error");
    assert.equal(report.ready, false);
  });

  test("no uv, no Python, no git", async () => {
    const report = await runDoctor({
      ...base,
      python: { kind: "none", prefix: null, detail: "uv not found and no Python 3.11+ on PATH" },
      uvPath: null,
      gitPath: null,
      exec: exec({}),
    });
    const states = Object.fromEntries(report.checks.map((c) => [c.id, c.state]));
    assert.deepEqual(states, { workspace: "ok", uv: "warn", python: "missing", git: "warn", claude: "error", codex: "error" });
    assert.equal(report.ready, false);
  });

  test("a probe that cannot start is a failed check, not a failed report", async () => {
    const report = await runDoctor({ ...base, exec: exec({ ...HEALTHY, "/bin/uv --version": new Error("spawn /bin/uv EACCES") }) });
    const uv = report.checks.find((c) => c.id === "uv")!;
    assert.equal(uv.state, "error");
    assert.match(uv.detail, /EACCES/);
  });

  test("harness check output that names no agent is reported as is", async () => {
    const report = await runDoctor({ ...base, exec: exec({ ...HEALTHY, "/bin/uv run -- python os-harness/harness.py check": { code: 2, stderr: "SyntaxError: bad" } }) });
    assert.match(report.checks.find((c) => c.id === "claude")!.detail, /SyntaxError/);
  });
});
