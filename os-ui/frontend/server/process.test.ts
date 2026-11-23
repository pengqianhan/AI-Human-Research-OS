import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { failureText, findProgram, processRunner, uvPython } from "./process.ts";
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
    assert.equal(result.timedOut, false);
    assert.equal(result.stdout, "x".repeat(100_000));
    assert.doesNotMatch(result.stderr, /timed out/);
    assert.ok(Date.now() - started < 10_000);
  });

  test("stderr past maxErrorBytes is dropped: the child runs on, its exit code counts, stdout is not truncated", async () => {
    const script = "process.stderr.write('e'.repeat(200000));process.stdout.write('done');process.exitCode=7";
    const result = await run([node, "-e", script], { cwd: process.cwd(), maxOutputBytes: 1000, maxErrorBytes: 100 });
    assert.deepEqual([result.code, result.stdout, result.stderr, result.truncated], [7, "done", "e".repeat(100), false]);
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
    assert.equal(result.timedOut, true);
    assert.match(result.stderr, /timed out/);
  });

  test("a killed child settles once it exits, though a process it started still holds its stdout and stderr", async () => {
    // As Git for Windows' cmd\git.exe, which starts mingw64\bin\git.exe on the same pipes and waits for it: kill() ends the launcher only.
    const launcher = (then: string) =>
      `const c=require('child_process').spawn(process.execPath,['-e','setTimeout(()=>{},15000)'],{stdio:'inherit'});process.stderr.write('pid '+c.pid+'\\n');${then}`;
    const cases = [
      ["timeout", launcher("setTimeout(()=>{},60000)"), { timeoutMs: 500 }],
      ["cap", launcher("const b=Buffer.alloc(65536,120);setTimeout(function f(){process.stdout.write(b,f)},200)"), { maxOutputBytes: 100_000 }],
    ] as const;
    for (const [name, script, limit] of cases) {
      const started = Date.now();
      const result = await run([node, "-e", script], { cwd: process.cwd(), ...limit });
      const elapsed = Date.now() - started;
      const pid = Number(/pid (\d+)/.exec(result.stderr)?.[1]);
      try {
        process.kill(pid);
      } catch {
        // already gone
      }
      assert.equal(name === "timeout" ? result.timedOut : result.truncated, true, name);
      assert.ok(elapsed < 5_000, `${name}: settled after ${elapsed} ms, not when the process it started let go`);
    }
  });

  test("lookup: path runs the program from an absolute PATH entry, never from the working folder", { skip: process.platform === "win32" ? "the planted program is a shell script; findProgram's Windows rules are tested below" : false }, async () => {
    const cwd = tempTree();
    const elsewhere = tempTree();
    const marker = join(cwd, "ran");
    for (const dir of [cwd, join(cwd, "rel")]) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "os-ui-prog"), `#!/bin/sh\necho "$0" >> '${marker}'\n`);
      chmodSync(join(dir, "os-ui-prog"), 0o755);
    }
    // An empty entry and a relative one would both name the working folder's copies.
    const planted = processRunner({ ...process.env, PATH: `:rel:${elsewhere}` });
    await assert.rejects(planted(["os-ui-prog"], { cwd, lookup: "path" }), (e: NodeJS.ErrnoException) => e.code === "ENOENT");
    assert.ok(!existsSync(marker), "nothing ran from the working folder");
    writeFileSync(join(elsewhere, "os-ui-prog"), `#!/bin/sh\necho "$0" >> '${marker}'\n`);
    chmodSync(join(elsewhere, "os-ui-prog"), 0o755);
    assert.equal((await planted(["os-ui-prog"], { cwd, lookup: "path" })).code, 0);
    assert.equal(readFileSync(marker, "utf8").trim(), join(elsewhere, "os-ui-prog"));
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

describe("findProgram", () => {
  const files = (...present: string[]) => (file: string) => present.includes(file);

  test("POSIX: absolute entries only, in order; a name with a folder is refused", () => {
    const env = { PATH: ":.:bin:/usr/local/bin:/usr/bin" };
    assert.equal(findProgram("git", env, "linux", files("/usr/bin/git", "git", "./git", "bin/git")), "/usr/bin/git");
    assert.equal(findProgram("git", env, "linux", files("/usr/local/bin/git", "/usr/bin/git")), "/usr/local/bin/git");
    assert.equal(findProgram("git", env, "linux", files("git", "bin/git")), null);
    assert.equal(findProgram("./git", env, "linux", files("./git")), null);
    assert.equal(findProgram("/opt/git", env, "linux", files()), "/opt/git", "an absolute name is taken as it is");
    assert.equal(findProgram("git", {}, "linux", files("/usr/bin/git")), null, "no PATH, nothing found");
  });

  test("with `outside`: no entry or program whose real path lies inside it, links included", { skip: process.platform === "win32" ? "the folders and links here are POSIX ones" : false }, () => {
    const inside = tempTree();
    const elsewhere = tempTree();
    const links = tempTree();
    const bin = join(inside, "node_modules", ".bin");
    mkdirSync(bin, { recursive: true });
    for (const dir of [bin, elsewhere]) {
      writeFileSync(join(dir, "prog"), "#!/bin/sh\n");
      chmodSync(join(dir, "prog"), 0o755);
    }
    symlinkSync(join(bin, "prog"), join(links, "prog"));
    const env = { PATH: `${bin}/:${links}:${elsewhere}` };
    assert.equal(findProgram("prog", env), join(bin, "prog"), "without outside, the first entry wins");
    assert.equal(findProgram("prog", env, "linux", undefined, inside), join(elsewhere, "prog"), "the entry inside and the link into it are skipped");
    assert.equal(findProgram("prog", { PATH: `${bin}:${links}` }, "linux", undefined, inside), null);
    assert.equal(findProgram(join(bin, "prog"), {}, "linux", undefined, inside), null, "an absolute name inside is refused");
    assert.equal(findProgram(join(elsewhere, "prog"), {}, "linux", undefined, inside), join(elsewhere, "prog"));
  });

  test("Windows: Path in any case, drive or UNC entries only, .com and .exe only, quotes stripped", () => {
    const env = { Path: ';.;bin;"C:\\Program Files\\Git\\cmd";\\\\server\\tools;D:\\x' };
    const exists = files("C:\\Program Files\\Git\\cmd\\git.exe", "git.exe", ".\\git.exe", "bin\\git.exe");
    assert.equal(findProgram("git", env, "win32", exists), "C:\\Program Files\\Git\\cmd\\git.exe");
    assert.equal(findProgram("git", env, "win32", files("\\\\server\\tools\\git.com", "D:\\x\\git.exe")), "\\\\server\\tools\\git.com");
    assert.equal(findProgram("git", env, "win32", files("D:\\x\\git.cmd", "D:\\x\\git.bat")), null, "never a .cmd or .bat");
    assert.equal(findProgram("git.cmd", env, "win32", files("D:\\x\\git.cmd")), null);
    assert.equal(findProgram("git.exe", env, "win32", files("D:\\x\\git.exe")), "D:\\x\\git.exe");
    assert.equal(findProgram("git", { Path: "C:relative;\\rootless" }, "win32", files("C:relative\\git.exe")), null);
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
