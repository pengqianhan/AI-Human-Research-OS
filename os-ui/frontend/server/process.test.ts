import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { failureText, processRunner, uvPython } from "./process.ts";
import { tempTree } from "./testkit.ts";

const node = process.execPath;

describe("processRunner", () => {
  const run = processRunner({ ...process.env, EXTRA: "from-env" });

  test("passes stdin, env, and UTF-8 output through", async () => {
    const script = "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(s+'|'+process.env.EXTRA+'|'+process.env.PYTHONIOENCODING);console.error('é')})";
    const result = await run([node, "-e", script], { cwd: process.cwd(), input: "ünïcode" });
    assert.equal(result.code, 0);
    assert.equal(result.stdout.trim(), "ünïcode|from-env|utf-8");
    assert.equal(result.stderr.trim(), "é");
  });

  test("reports the exit code", async () => {
    const result = await run([node, "-e", "process.exit(3)"], { cwd: process.cwd() });
    assert.equal(result.code, 3);
  });

  test("a child that ignores stdin is fine", async () => {
    const result = await run([node, "-e", "process.exit(0)"], { cwd: process.cwd(), input: "x".repeat(1 << 20) });
    assert.equal(result.code, 0);
  });

  test("kills a child that outlives its timeout", async () => {
    const started = Date.now();
    const result = await run([node, "-e", "setTimeout(()=>{}, 60000)"], { cwd: process.cwd(), timeoutMs: 300 });
    assert.equal(result.code, -1);
    assert.match(result.stderr, /timed out/);
    assert.ok(Date.now() - started < 10_000);
  });

  test("rejects when the program does not exist", async () => {
    await assert.rejects(run(["definitely-not-a-program-os-ui"], { cwd: process.cwd() }), /ENOENT/);
  });
});

test("uvPython pins the repository's interpreter", () => {
  const root = tempTree({ ".python-version": "3.12\n" });
  assert.deepEqual(uvPython(root, "/opt/uv"), ["/opt/uv", "run", "--no-project", "--python", "3.12", "--", "python"]);
});

test("failureText prefers the child's own words", () => {
  assert.equal(failureText({ code: 2, stdout: "out", stderr: " err \n" }), "err (exit 2)");
  assert.equal(failureText({ code: 2, stdout: "out", stderr: "" }), "out (exit 2)");
  assert.equal(failureText({ code: 9, stdout: "", stderr: "" }), "process failed (exit 9)");
});
