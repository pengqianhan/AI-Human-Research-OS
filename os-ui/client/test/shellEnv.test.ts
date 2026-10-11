import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { extraDirs, MARKER, mergePath, parseShellEnv, probeCommand, resolveEnv, runLoginShell, withoutAppImage } from "../src/main/shellEnv.ts";

const wrap = (env: Record<string, unknown>) => `motd noise\n${MARKER}${JSON.stringify(env)}${MARKER}\nbye`;

describe("login-shell environment", () => {
  test("parses the JSON between the markers and drops the probe shell's own variables", () => {
    const env = parseShellEnv(wrap({ PATH: "/a:/b", CODEX_HOME: "/c", PWD: "/tmp", SHLVL: "2", TERM: "dumb", TERM_PROGRAM: "x", ELECTRON_RUN_AS_NODE: "1", N: 3 }));
    assert.deepEqual(env, { PATH: "/a:/b", CODEX_HOME: "/c" });
  });

  test("no markers, one marker, or bad JSON give null", () => {
    assert.equal(parseShellEnv("PATH=/a"), null);
    assert.equal(parseShellEnv(`${MARKER}{}`), null);
    assert.equal(parseShellEnv(`${MARKER}{nope${MARKER}`), null);
    assert.equal(parseShellEnv(`${MARKER}[1]${MARKER}`), null);
  });

  test("probe command quotes the executable; a quote in the path is refused", () => {
    assert.equal(probeCommand("/Applications/Research OS.app/Contents/MacOS/Research OS")?.startsWith("'/Applications/Research OS.app/"), true);
    assert.equal(probeCommand("/tmp/it's/electron"), null);
  });

  test("mergePath keeps the first occurrence, per platform", () => {
    assert.equal(mergePath(["/a:/b/", "/b:/c", null, "", "/a"], "linux"), "/a:/b/:/c");
    assert.equal(mergePath(["C:\\A;C:\\b\\", "c:\\a;C:\\B;D:\\x"], "win32"), "C:\\A;C:\\b\\;D:\\x");
  });

  test("extra install directories per platform", () => {
    assert.deepEqual(extraDirs("linux", "/home/u", {}), ["/home/u/.local/bin", "/home/u/.cargo/bin", "/usr/local/bin"]);
    assert.ok(extraDirs("darwin", "/Users/u", {}).includes("/opt/homebrew/bin"));
    const win = extraDirs("win32", "C:\\Users\\u", { APPDATA: "C:\\Users\\u\\AppData\\Roaming" });
    assert.equal(win.length, 2);
    assert.ok(win[1]!.endsWith("npm"));
  });

  test("an AppImage's own paths never reach children", () => {
    const env = withoutAppImage({
      APPIMAGE: "/home/u/Research.AppImage",
      APPDIR: "/tmp/.mount_Res",
      ARGV0: "x",
      OWD: "/home/u",
      PATH: "/tmp/.mount_Res:/tmp/.mount_Res/usr/bin:/usr/bin",
      LD_LIBRARY_PATH: "/tmp/.mount_Res/usr/lib",
      XDG_DATA_DIRS: "/tmp/.mount_Res/usr/share:/usr/share",
      HOME: "/home/u",
    });
    assert.deepEqual(env, { PATH: "/usr/bin", XDG_DATA_DIRS: "/usr/share", HOME: "/home/u" });
    const plain = { PATH: "/usr/bin" };
    assert.equal(withoutAppImage(plain), plain);
  });

  test("macOS/Linux: the shell's environment is laid over the inherited one", async () => {
    let seen: { shell: string; args: string[]; env: NodeJS.ProcessEnv } | null = null;
    const r = await resolveEnv({
      platform: "darwin",
      env: { PATH: "/usr/bin:/bin", HOME: "/Users/u", KEEP: "1" },
      home: "/Users/u",
      execPath: "/App/electron",
      runShell: async (shell, args, env) => {
        seen = { shell, args, env };
        return wrap({ PATH: "/Users/u/.local/bin:/usr/bin", CODEX_HOME: "/Users/u/.orca", HTTPS_PROXY: "http://p" });
      },
    });
    assert.equal(r.source, "login-shell");
    assert.equal(r.env.CODEX_HOME, "/Users/u/.orca");
    assert.equal(r.env.HTTPS_PROXY, "http://p");
    assert.equal(r.env.KEEP, "1");
    assert.equal(r.env.PATH, "/Users/u/.local/bin:/usr/bin:/bin:/Users/u/.cargo/bin:/usr/local/bin:/opt/homebrew/bin");
    assert.equal(seen!.shell, "/bin/zsh", "macOS default shell when SHELL is unset");
    assert.equal(seen!.args[0], "-ilc");
    assert.equal(seen!.env.ELECTRON_RUN_AS_NODE, "1");
    assert.equal(r.env.ELECTRON_RUN_AS_NODE, undefined);
  });

  test("a failing or silent shell falls back to the inherited environment", async () => {
    const failing = await resolveEnv({
      platform: "linux",
      env: { PATH: "/usr/bin", SHELL: "/bin/fish" },
      home: "/home/u",
      execPath: "/e",
      runShell: async () => {
        throw new Error("took too long");
      },
    });
    assert.equal(failing.source, "inherited");
    assert.match(failing.problem!, /took too long/);
    assert.ok(failing.env.PATH!.startsWith("/usr/bin:"));

    const silent = await resolveEnv({ platform: "linux", env: { PATH: "/usr/bin" }, home: "/h", execPath: "/e", runShell: async () => "nothing" });
    assert.equal(silent.source, "inherited");
    assert.match(silent.problem!, /printed no environment/);
  });

  test("Windows keeps the inherited environment and one PATH spelling", async () => {
    const r = await resolveEnv({
      platform: "win32",
      env: { Path: "C:\\Windows", USERPROFILE: "C:\\Users\\u" },
      home: "C:\\Users\\u",
      execPath: "C:\\x.exe",
      runShell: async () => {
        throw new Error("never called on Windows");
      },
    });
    assert.equal(r.source, "inherited");
    assert.equal(r.env.Path, undefined);
    assert.ok(r.env.PATH!.startsWith("C:\\Windows;"));
  });

  test("csh and tcsh get -ic; other shells -ilc", async () => {
    const seen: string[] = [];
    const runShell = async (_shell: string, args: string[]) => (seen.push(args[0]!), wrap({ PATH: "/bin" }));
    for (const shell of ["/bin/tcsh", "/bin/csh", "/bin/zsh", "/usr/local/bin/fish"]) {
      await resolveEnv({ platform: "darwin", env: { SHELL: shell }, home: "/h", execPath: "/e", runShell });
    }
    assert.deepEqual(seen, ["-ic", "-ic", "-ilc", "-ilc"]);
  });

  test("a background job left by an rc file does not hold the probe (POSIX only)", { skip: process.platform === "win32" }, async () => {
    const started = Date.now();
    const command = `${probeCommand(process.execPath)!}; sleep 30 &`;
    const stdout = await runLoginShell("/bin/sh", ["-c", command], { ...process.env, ELECTRON_RUN_AS_NODE: "1" });
    assert.ok(parseShellEnv(stdout) !== null);
    assert.ok(Date.now() - started < 4000, `took ${Date.now() - started} ms`);
  });

  test("the real login shell runs (POSIX only)", { skip: process.platform === "win32" }, async () => {
    const command = probeCommand(process.execPath)!;
    const stdout = await runLoginShell("/bin/sh", ["-c", command], { ...process.env, ELECTRON_RUN_AS_NODE: "1" });
    const env = parseShellEnv(stdout);
    assert.ok(env !== null && typeof env.PATH === "string");
  });
});
