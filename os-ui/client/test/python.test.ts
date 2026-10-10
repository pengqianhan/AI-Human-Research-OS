import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { choosePython, isRecentPython, isStoreAlias, isXcodeStub, pinnedVersion, which } from "../src/main/python.ts";
import type { Probe } from "../src/main/python.ts";
import { tempTree } from "./helpers.ts";

const has = (...files: string[]) => (file: string) => files.includes(file);
const answers = (table: Record<string, { code: number; output: string }>): Probe & { calls: string[][] } => {
  const calls: string[][] = [];
  const probe = (async (command: string[]) => {
    calls.push(command);
    return table[command.join(" ")] ?? { code: 127, output: "not found" };
  }) as Probe & { calls: string[][] };
  probe.calls = calls;
  return probe;
};

describe("which", () => {
  test("POSIX: first match on PATH", () => {
    assert.equal(which("uv", "/a:/b:/c", "linux", has("/b/uv", "/c/uv")), "/b/uv");
    assert.equal(which("uv", "/a::/b", "darwin", has()), null);
  });

  test("Windows: PATHEXT order, lower-case extensions, explicit extension honoured", () => {
    const exists = has("C:\\tools\\uv.exe", "C:\\npm\\claude.cmd");
    assert.equal(which("uv", "C:\\none;C:\\tools", "win32", exists), "C:\\tools\\uv.exe");
    assert.equal(which("claude", "C:\\npm", "win32", exists), "C:\\npm\\claude.cmd");
    assert.equal(which("uv.exe", "C:\\tools", "win32", exists), "C:\\tools\\uv.exe");
  });
});

describe("python choice", () => {
  const repo = tempTree({ ".python-version": "3.12\n" });

  test("pinned version", () => {
    assert.equal(pinnedVersion(repo), "3.12");
    assert.equal(pinnedVersion(tempTree()), null);
  });

  test("uv with the pinned interpreter wins, without probing", async () => {
    const probe = answers({});
    const choice = await choosePython({ repoRoot: repo, path: "/opt/bin:/usr/bin", platform: "linux", exists: has("/opt/bin/uv", "/usr/bin/python3"), probe });
    assert.equal(choice.kind, "uv");
    assert.deepEqual(choice.prefix, ["/opt/bin/uv", "run", "--no-project", "--python", "3.12", "--", "python"]);
    assert.equal(probe.calls.length, 0);
  });

  test("uv without a pin uses its default interpreter", async () => {
    const choice = await choosePython({ repoRoot: repo, path: "/b", platform: "linux", exists: has("/b/uv"), probe: answers({}), version: null });
    assert.deepEqual(choice.prefix, ["/b/uv", "run", "--no-project", "--", "python"]);
  });

  test("without uv: the first Python that runs and is ≥ 3.11", async () => {
    const probe = answers({
      "/usr/bin/python3 --version": { code: 0, output: "Python 3.9.6\n" },
      "/usr/local/bin/python --version": { code: 0, output: "Python 3.12.1\n" },
    });
    const choice = await choosePython({
      repoRoot: repo,
      path: "/usr/bin:/usr/local/bin",
      platform: "linux",
      exists: has("/usr/bin/python3", "/usr/local/bin/python"),
      probe,
    });
    assert.equal(choice.kind, "python");
    assert.deepEqual(choice.prefix, ["/usr/local/bin/python"]);
  });

  test("Windows: py -3 first, Store aliases skipped", async () => {
    const probe = answers({ "C:\\py\\py.exe -3 --version": { code: 0, output: "Python 3.13.0" } });
    const store = "C:\\Users\\u\\AppData\\Local\\Microsoft\\WindowsApps";
    const choice = await choosePython({
      repoRoot: repo,
      path: `${store};C:\\py`,
      platform: "win32",
      exists: has(`${store}\\python.exe`, "C:\\py\\py.exe"),
      probe,
    });
    assert.deepEqual(choice.prefix, ["C:\\py\\py.exe", "-3"]);
    assert.ok(!probe.calls.some((c) => c[0]!.includes("WindowsApps")));
  });

  test("macOS without Command Line Tools: /usr/bin/python3 is never run", async () => {
    const probe = answers({ "/usr/bin/xcode-select -p": { code: 2, output: "error: unable to get active developer directory" } });
    const choice = await choosePython({ repoRoot: repo, path: "/usr/bin", platform: "darwin", exists: has("/usr/bin/python3"), probe });
    assert.equal(choice.kind, "none");
    assert.deepEqual(probe.calls, [["/usr/bin/xcode-select", "-p"]]);
  });

  test("nothing usable names what was tried", async () => {
    const probe = answers({ "/usr/bin/python3 --version": { code: 0, output: "Python 3.8.10" } });
    const choice = await choosePython({ repoRoot: repo, path: "/usr/bin", platform: "linux", exists: has("/usr/bin/python3"), probe });
    assert.equal(choice.kind, "none");
    assert.equal(choice.prefix, null);
    assert.match(choice.detail, /3\.8\.10/);
  });

  test("helpers", async () => {
    assert.equal(isRecentPython("Python 3.11.0"), true);
    assert.equal(isRecentPython("Python 3.10.12"), false);
    assert.equal(isRecentPython("Python 4.0"), true);
    assert.equal(isRecentPython("Python was not found"), false);
    assert.equal(isStoreAlias("C:\\Users\\u\\AppData\\Local\\Microsoft\\WindowsApps\\python.exe"), true);
    assert.equal(isStoreAlias("C:\\Python312\\python.exe"), false);
    assert.equal(await isXcodeStub("/opt/homebrew/bin/git", "darwin", answers({})), false);
    assert.equal(await isXcodeStub("/usr/bin/git", "linux", answers({})), false);
    assert.equal(await isXcodeStub("/usr/bin/git", "darwin", answers({ "/usr/bin/xcode-select -p": { code: 0, output: "/Library/Developer/CommandLineTools" } })), false);
  });
});
