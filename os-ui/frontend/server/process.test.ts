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

  test("a character split across two chunks is decoded whole, on stdout and stderr", async () => {
    // "中" is e4 b8 ad; the first byte and the rest are written 100 ms apart, so they arrive as two chunks.
    const script =
      "const w=(s,b)=>s.write(Buffer.from(b));w(process.stdout,[0xe4]);w(process.stderr,[0xe4]);" +
      "setTimeout(()=>{w(process.stdout,[0xb8,0xad]);w(process.stderr,[0xb8,0xad])},100)";
    const result = await run([node, "-e", script], { cwd: process.cwd() });
    assert.equal(result.stdout, "中");
    assert.equal(result.stderr, "中");
  });

  test("maxOutputBytes keeps the first bytes, kills the child, and says truncated (not timed out)", async () => {
    const started = Date.now();
    const forever = "const b=Buffer.alloc(65536,120);(function f(){process.stdout.write(b,f)})()";
    const result = await run([node, "-e", forever], { cwd: process.cwd(), maxOutputBytes: 100_000, timeoutMs: 30_000 });
    assert.equal(result.truncated, true);
    assert.equal(result.stdout, "x".repeat(100_000));
    assert.doesNotMatch(result.stderr, /timed out/);
    assert.ok(Date.now() - started < 10_000);
  });

  test("the cap applies to stderr too", async () => {
    const result = await run([node, "-e", "process.stderr.write('e'.repeat(5000))"], { cwd: process.cwd(), maxOutputBytes: 1000 });
    assert.equal(result.truncated, true);
    assert.equal(result.stderr, "e".repeat(1000));
  });

  test("output of exactly the cap is complete, not truncated", async () => {
    const result = await run([node, "-e", "process.stdout.write('y'.repeat(4096))"], { cwd: process.cwd(), maxOutputBytes: 4096 });
    assert.equal(result.code, 0);
    assert.equal(result.truncated, false);
    assert.equal(result.stdout.length, 4096);
  });

  test("a timeout is not reported as truncated", async () => {
    const result = await run([node, "-e", "setTimeout(()=>{}, 60000)"], { cwd: process.cwd(), timeoutMs: 300, maxOutputBytes: 10 });
    assert.equal(result.code, -1);
    assert.equal(result.truncated, false);
    assert.match(result.stderr, /timed out/);
  });

  test("options.env edits the runner's environment rather than replacing it", async () => {
    let seen: NodeJS.ProcessEnv = {};
    const env = (inherited: NodeJS.ProcessEnv) => {
      seen = inherited;
      const { EXTRA: _dropped, ...rest } = inherited;
      return { ...rest, OTHER: "set" };
    };
    const script = "console.log([process.env.EXTRA, process.env.OTHER, typeof process.env.PATH].join('|'))";
    const result = await run([node, "-e", script], { cwd: process.cwd(), env });
    assert.equal(seen.EXTRA, "from-env");
    assert.equal(result.stdout.trim(), "|set|string");
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
