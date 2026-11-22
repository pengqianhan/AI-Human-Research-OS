import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { devNull, tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { before, describe, test } from "node:test";
import { codeGitHandler, gitEnv, MIN_GIT, openable, parseGitVersion } from "./codeGit.ts";
import type { Commit, Diff, Log, Summary } from "./codeGit.ts";
import { processRunner } from "./process.ts";
import { context, fakeRunner, ok, request, tempTree } from "./testkit.ts";
import type { ApiHandler, ApiResponse, RunOptions, Runner } from "./types.ts";

/*
 * Every fixture is a temporary folder outside the repository these tests run
 * in, built by git under a hermetic environment: no GIT_* from the caller,
 * no global or system config, fixed names and dates, the default branch
 * "main", and no hooks (a new repository has only the inactive *.sample
 * ones). History is written with fast-import, so names Windows or macOS
 * could not hold as files (`*`, a byte that is not UTF-8) live only in Git.
 * The handler itself then runs with a clean or a hostile environment.
 */

const WINDOWS = process.platform === "win32";
const NO_SCRIPTS = WINDOWS
  ? "marker programs here are POSIX shell scripts (#!/bin/sh, chmod +x); how Git for Windows starts configured programs is not modelled, so these tests would prove nothing there"
  : false;

const scrubbed = (env: NodeJS.ProcessEnv): NodeJS.ProcessEnv =>
  Object.fromEntries(Object.entries(env).filter(([key]) => !/^git_/i.test(key)));

function home(): string {
  const dir = mkdtempSync(join(tmpdir(), "os-ui-git-home-"));
  mkdirSync(join(dir, ".config"));
  return dir;
}

const FIXTURE_HOME = home();
const FIXTURE_ENV: NodeJS.ProcessEnv = {
  ...scrubbed(process.env),
  HOME: FIXTURE_HOME,
  XDG_CONFIG_HOME: join(FIXTURE_HOME, ".config"),
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: devNull,
  GIT_AUTHOR_NAME: "A U Thor",
  GIT_AUTHOR_EMAIL: "author@example.com",
  GIT_COMMITTER_NAME: "C O Mitter",
  GIT_COMMITTER_EMAIL: "committer@example.com",
  GIT_AUTHOR_DATE: "1790000000 +0000",
  GIT_COMMITTER_DATE: "1790000000 +0000",
  GIT_TERMINAL_PROMPT: "0",
};

/** Runs git for a fixture; throws on failure. */
function fx(cwd: string, args: string[], input?: string | Buffer): string {
  const r = spawnSync("git", args, { cwd, env: FIXTURE_ENV, input: input === undefined ? undefined : Buffer.from(input) });
  if (r.status !== 0) throw new Error(`fixture: git ${args.join(" ")}: ${r.error ?? r.stderr.toString()}`);
  return r.stdout.toString("utf8").trim();
}

type Content = string | Buffer | null | { gitlink: string };
interface FiCommit {
  mark: number;
  message: string | Buffer;
  ref?: string;
  from?: number;
  merge?: number;
  files?: [string | Buffer, Content][];
}

/** A path as fast-import's C-style quoted string, byte by byte. */
function fiPath(path: string | Buffer): string {
  let out = '"';
  for (const b of Buffer.from(path)) {
    if (b === 0x22) out += '\\"';
    else if (b === 0x5c) out += "\\\\";
    else if (b === 0x0a) out += "\\n";
    else if (b < 0x20 || b >= 0x7f) out += `\\${b.toString(8).padStart(3, "0")}`;
    else out += String.fromCharCode(b);
  }
  return `${out}"`;
}

/** Writes `commits` into the repository at `dir` with fast-import; returns each mark's commit hash. */
function fastImport(dir: string, commits: FiCommit[]): Record<number, string> {
  const parts: Buffer[] = [];
  const text = (s: string) => parts.push(Buffer.from(s));
  const data = (d: string | Buffer) => {
    const b = Buffer.from(d);
    text(`data ${b.length}\n`);
    parts.push(b);
    text("\n");
  };
  for (const c of commits) {
    const who = `A U Thor <author@example.com> ${1790000000 + c.mark * 60} +0000`;
    text(`commit ${c.ref ?? "refs/heads/main"}\nmark :${c.mark}\nauthor ${who}\ncommitter ${who}\n`);
    data(c.message);
    if (c.from !== undefined) text(`from :${c.from}\n`);
    if (c.merge !== undefined) text(`merge :${c.merge}\n`);
    for (const [path, content] of c.files ?? []) {
      if (content === null) text(`D ${fiPath(path)}\n`);
      else if (typeof content === "object" && !Buffer.isBuffer(content)) text(`M 160000 ${content.gitlink} ${fiPath(path)}\n`);
      else {
        text(`M 100644 inline ${fiPath(path)}\n`);
        data(content);
      }
    }
    text("\n");
  }
  const marks = join(mkdtempSync(join(tmpdir(), "os-ui-git-marks-")), "marks");
  fx(dir, ["fast-import", "--quiet", `--export-marks=${marks}`], Buffer.concat(parts));
  const out: Record<number, string> = {};
  for (const line of readFileSync(marks, "utf8").split("\n")) {
    const m = /^:(\d+) ([0-9a-f]+)$/.exec(line);
    if (m !== null) out[Number(m[1])] = m[2]!;
  }
  return out;
}

/** A workspace with the registered project projects-folder/P (and its PROJECT_MEMORY.md on disk). */
function workspace(): string {
  return tempTree({ "projects-folder/P/PROJECT_MEMORY.md": "# P\n", "AGENTS.md": "root\n" });
}

/** `git init` with the fixed default branch. */
function init(dir: string): string {
  mkdirSync(dir, { recursive: true });
  fx(dir, ["init", "-q", "-b", "main"]);
  return dir;
}

/** The handler with a real runner whose environment is `env` (a clean one by default). */
function handler(root: string, env: NodeJS.ProcessEnv = cleanEnv()): ApiHandler {
  return codeGitHandler(context(root, { run: processRunner(env) }));
}

function cleanEnv(dir = home()): NodeJS.ProcessEnv {
  return { ...scrubbed(process.env), HOME: dir, XDG_CONFIG_HOME: join(dir, ".config") };
}

function get(api: ApiHandler, path: string, params: Record<string, string>): Promise<ApiResponse> {
  return api(request("GET", path, undefined, new URLSearchParams(params).toString()));
}

async function body<T>(response: Promise<ApiResponse> | ApiResponse, status = 200): Promise<T> {
  const r = await response;
  assert.equal(r.status, status, JSON.stringify(r.body));
  return r.body as T;
}

/** A hash of every file and folder below `dir`: names, modes, sizes, mtimes, contents. */
function hashTree(dir: string): string {
  const h = createHash("sha256");
  const walk = (d: string) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      const st = lstatSync(p);
      h.update(`${p.slice(dir.length)}\0${st.mode}\0${st.size}\0${st.mtimeMs}\0`);
      if (st.isDirectory()) walk(p);
      else if (st.isSymbolicLink()) h.update(readlinkSync(p));
      else h.update(readFileSync(p));
    }
  };
  walk(dir);
  return h.digest("hex");
}

/** A program that appends a line to `<markers>/<name>` and prints the file it is given, if any. */
function markerScript(markers: string, name: string): string {
  const path = join(markers, "..", "bin", name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `#!/bin/sh\necho "$@" >> '${join(markers, name)}'\n[ -f "$1" ] && cat "$1"\nexit 0\n`);
  chmodSync(path, 0o755);
  return path;
}

const P = "P";

describe("requests that never reach git", () => {
  const { run, calls } = fakeRunner();
  const api = codeGitHandler(context(workspace(), { run }));

  test("only GET, only the four routes", async () => {
    for (const path of ["/", "/log", "/commit", "/diff"]) {
      for (const method of ["POST", "PUT", "DELETE", "HEAD"]) assert.equal((await api(request(method, path))).status, 405, `${method} ${path}`);
    }
    assert.equal((await get(api, "/files", { project: P })).status, 404);
  });

  test("a malformed project is 400, an unregistered one 404", async () => {
    for (const project of ["", "../x", "a/b", "-x", "x y", "P/", "1P", "P%2F.."]) {
      assert.equal((await get(api, "/", { project })).status, 400, project);
    }
    assert.equal((await api(request("GET", "/", undefined, ""))).status, 400, "missing");
    assert.equal((await api(request("GET", "/", undefined, "project=P&project=P"))).status, 400, "repeated");
    assert.equal((await get(api, "/", { project: "Missing" })).status, 404);
  });

  test("a hash that is not 7 to 64 lower-case hex digits is 400", async () => {
    for (const hash of ["--output=x", "HEAD", "ABCDEF0", "abcdef", "a".repeat(65), "abcdefg", "abcdef0^", ""]) {
      assert.equal((await get(api, "/commit", { project: P, hash })).status, 400, hash);
      assert.equal((await get(api, "/diff", { project: P, hash, path: "a.txt" })).status, 400, hash);
    }
  });

  test("a path that is not plain and relative, or has a dot segment, is 400", async () => {
    const hash = "abcdef0";
    for (const path of ["", "../AGENTS.md", "/etc/passwd", "a//b", "a/", "a\\b", ":x", ":(top)x", "a/./b", "con", "x".repeat(1001)]) {
      assert.equal((await get(api, "/diff", { project: P, hash, path })).status, 400, path);
    }
    for (const path of [".env", "a/.secret/x", ".git/config", "Code/.venv/bin/x"]) {
      const r = await get(api, "/diff", { project: P, hash, path });
      assert.equal(r.status, 400, path);
      assert.match((r.body as { error: string }).error, /segment starting with "\."/);
    }
  });

  test("skip is a whole number from 0 to 10000", async () => {
    for (const skip of ["-1", "10001", "1.5", "01", "abc", "", " 1"]) {
      assert.equal((await get(api, "/log", { project: P, skip })).status, 400, skip);
    }
  });

  test("none of them ran a program", () => {
    assert.deepEqual(calls, []);
  });
});

describe("which repository is read", () => {
  test("the workspace's repository, filtered to the project, with project-relative paths", async () => {
    const root = workspace();
    init(root);
    const m = fastImport(root, [
      { mark: 1, message: "start", files: [["projects-folder/P/Code/README.md", "one\n"], ["outside.txt", "x\n"]] },
      { mark: 2, message: "edit the project", files: [["projects-folder/P/Code/README.md", "one\ntwo\n"], ["projects-folder/P/index.md", "i\n"]] },
      { mark: 3, message: "outside only", files: [["outside.txt", "x\ny\n"]] },
    ]);
    const api = handler(root);
    const summary = await body<Summary>(get(api, "/", { project: P }));
    assert.deepEqual(summary, {
      repo: "workspace",
      root: "",
      filter: "projects-folder/P",
      head: { hash: m[2]!, short: m[2]!.slice(0, 7), date: "2026-09-21" },
    });
    const log = await body<Log>(get(api, "/log", { project: P }));
    assert.deepEqual(
      log.commits.map((c) => [c.hash, c.subject, c.files, c.added, c.deleted]),
      [
        [m[2], "edit the project", 2, 2, 0],
        [m[1], "start", 1, 1, 0],
      ],
    );
    assert.equal(log.more, false);
    const commit = await body<Commit>(get(api, "/commit", { project: P, hash: m[2]!.slice(0, 7) }));
    assert.equal(commit.hash, m[2]);
    assert.deepEqual(commit.files.map((f) => [f.path, f.status, f.added, f.deleted]), [
      ["Code/README.md", "M", 1, 0],
      ["index.md", "A", 1, 0],
    ]);
    assert.deepEqual(commit.stat, { files: 2, added: 2, deleted: 0 });
    assert.deepEqual([commit.author, commit.subject, commit.body, commit.date], ["A U Thor", "edit the project", "", "2026-09-21"]);
    const diff = await body<Diff>(get(api, "/diff", { project: P, hash: m[2]!, path: "Code/README.md" }));
    assert.equal(diff.diff.split("\n")[0], "diff --git a/Code/README.md b/Code/README.md");
    assert.match(diff.diff, /\n\+two\n/);
    assert.equal(diff.truncated, false);
    assert.equal((await get(api, "/commit", { project: P, hash: m[3]! })).status, 404, "a commit that changes nothing in the project");
    assert.equal((await get(api, "/diff", { project: P, hash: m[3]!, path: "outside.txt" })).status, 404);
  });

  test("the project's own repository comes first, and is read whole", async () => {
    const root = workspace();
    init(root);
    fastImport(root, [{ mark: 1, message: "workspace history", files: [["projects-folder/P/w.txt", "w\n"]] }]);
    const own = init(join(root, "projects-folder", P));
    const m = fastImport(own, [{ mark: 1, message: "project history", files: [["Code/main.py", "print(1)\n"]] }]);
    const api = handler(root);
    const summary = await body<Summary>(get(api, "/", { project: P }));
    assert.deepEqual([summary.repo, summary.root, summary.filter, summary.head?.hash], ["project", "projects-folder/P", ".", m[1]]);
    const log = await body<Log>(get(api, "/log", { project: P }));
    assert.deepEqual(log.commits.map((c) => c.subject), ["project history"]);
    const commit = await body<Commit>(get(api, "/commit", { project: P, hash: m[1]! }));
    assert.deepEqual(commit.files.map((f) => f.path), ["Code/main.py"]);
  });

  test("no repository: repo null, without asking a repository above the workspace", async () => {
    const outer = init(mkdtempSync(join(tmpdir(), "os-ui-git-outer-")));
    fastImport(outer, [{ mark: 1, message: "outer", files: [["ws/projects-folder/P/x", "x\n"]] }]);
    const root = join(outer, "ws");
    mkdirSync(join(root, "projects-folder", P), { recursive: true });
    writeFileSync(join(root, "projects-folder", P, "PROJECT_MEMORY.md"), "# P\n");
    const { run, calls } = fakeRunner();
    for (const path of ["/", "/log"]) {
      assert.deepEqual(await body(codeGitHandler(context(root, { run }))(request("GET", path, undefined, "project=P"))), { repo: null });
    }
    assert.deepEqual(await body(handler(root)(request("GET", "/commit", undefined, "project=P&hash=abcdef0"))), { repo: null });
    assert.deepEqual(calls, [], "git is not even probed");
  });

  test("an empty repository and a project no commit touches have no head and no commits", async () => {
    const empty = workspace();
    init(empty);
    const api = handler(empty);
    assert.equal((await body<Summary>(get(api, "/", { project: P }))).head, null);
    assert.deepEqual(await body<Log>(get(api, "/log", { project: P })), { repo: "workspace", root: "", filter: "projects-folder/P", commits: [], more: false });
    assert.equal((await get(api, "/commit", { project: P, hash: "abcdef0" })).status, 404);

    const untouched = workspace();
    init(untouched);
    const m = fastImport(untouched, [{ mark: 1, message: "elsewhere", files: [["outside.txt", "x\n"]] }]);
    const api2 = handler(untouched);
    assert.equal((await body<Summary>(get(api2, "/", { project: P }))).head, null);
    assert.deepEqual((await body<Log>(get(api2, "/log", { project: P }))).commits, []);
    assert.equal((await get(api2, "/commit", { project: P, hash: m[1]! })).status, 404);
  });

  test("a project folder whose real path lies outside projects-folder is 404", async (t) => {
    const root = workspace();
    const outside = tempTree({ "PROJECT_MEMORY.md": "# elsewhere\n" });
    try {
      symlinkSync(outside, join(root, "projects-folder", "Link"), "junction");
    } catch (error) {
      t.skip(`cannot create a link here: ${(error as Error).message}`);
      return;
    }
    assert.equal((await get(handler(root), "/", { project: "Link" })).status, 404);
  });
});

describe("repositories that are refused", () => {
  /** A project whose own .git is set up by `make`, in a workspace that has a repository too. */
  async function refused(t: { skip(reason: string): void }, make: (gitDir: string) => void, why: RegExp): Promise<void> {
    const root = workspace();
    init(root);
    fastImport(root, [{ mark: 1, message: "workspace", files: [["projects-folder/P/x", "x\n"]] }]);
    const gitDir = join(root, "projects-folder", P, ".git");
    try {
      make(gitDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EPERM") {
        t.skip(`cannot create a link here: ${(error as Error).message}`);
        return;
      }
      throw error;
    }
    const { run, calls } = fakeRunner();
    const api = codeGitHandler(context(root, { run }));
    for (const path of ["/", "/log", "/commit", "/diff"]) {
      const answer = await body<{ repo: null; problem: string }>(api(request("GET", path, undefined, "project=P&hash=abcdef0&path=x")));
      assert.equal(answer.repo, null, "never the workspace's repository instead");
      assert.match(answer.problem, why);
    }
    assert.deepEqual(calls, []);
  }

  const elsewhere = () => {
    const dir = init(mkdtempSync(join(tmpdir(), "os-ui-git-elsewhere-")));
    fastImport(dir, [{ mark: 1, message: "elsewhere", files: [["secret.txt", "secret\n"]] }]);
    return join(dir, ".git");
  };

  test("a .git file (gitdir:)", (t) => refused(t, (g) => writeFileSync(g, `gitdir: ${elsewhere()}\n`), /is a file that points to a repository elsewhere/));
  test("a .git link", (t) => refused(t, (g) => symlinkSync(elsewhere(), g, "junction"), /is a link/));
  test("a commondir", (t) => refused(t, (g) => (init(dirname(g)), writeFileSync(join(g, "commondir"), `${elsewhere()}\n`)), /commondir/));
  test("objects/info/alternates", (t) =>
    refused(t, (g) => (init(dirname(g)), writeFileSync(join(g, "objects", "info", "alternates"), `${join(elsewhere(), "objects")}\n`)), /alternates/));
  test("a linked objects folder", (t) =>
    refused(t, (g) => (init(dirname(g)), rmSync(join(g, "objects"), { recursive: true }), symlinkSync(join(elsewhere(), "objects"), join(g, "objects"), "junction")), /has a link, objects/));
  test("a linked loose-object folder", (t) =>
    refused(t, (g) => (init(dirname(g)), symlinkSync(join(elsewhere(), "objects", "info"), join(g, "objects", "ab"), "junction")), /has a link, objects\/ab/));
  test("a linked config", (t) => refused(t, (g) => (init(dirname(g)), rmSync(join(g, "config")), symlinkSync(join(elsewhere(), "config"), join(g, "config"))), /has a link, config/));

  test("a workspace that is a linked worktree", async () => {
    const main = init(mkdtempSync(join(tmpdir(), "os-ui-git-main-")));
    fastImport(main, [{ mark: 1, message: "main", files: [["projects-folder/P/PROJECT_MEMORY.md", "# P\n"]] }]);
    const root = join(mkdtempSync(join(tmpdir(), "os-ui-git-wt-")), "ws");
    fx(main, ["worktree", "add", "-q", "--detach", root, "main"]);
    const answer = await body<{ repo: null; problem: string }>(get(handler(root), "/log", { project: P }));
    assert.equal(answer.repo, null);
    assert.match(answer.problem, /^\.git is a file that points to a repository elsewhere/);
  });
});

describe("what the answers hold", () => {
  test("log pages of 50 with more, and skip continues", async () => {
    const root = workspace();
    init(root);
    const commits: FiCommit[] = Array.from({ length: 55 }, (_, i) => ({ mark: i + 1, message: `c${i + 1}`, files: [["projects-folder/P/n.txt", `${i}\n`]] }));
    const m = fastImport(root, commits);
    const api = handler(root);
    const first = await body<Log>(get(api, "/log", { project: P }));
    assert.equal(first.commits.length, 50);
    assert.equal(first.more, true);
    const second = await body<Log>(get(api, "/log", { project: P, skip: "50" }));
    assert.deepEqual(second.commits.map((c) => c.subject), ["c5", "c4", "c3", "c2", "c1"]);
    assert.equal(second.more, false);
    assert.equal(second.commits[4]!.hash, m[1]);
  });

  test("more stops where the next skip would pass 10000", async () => {
    const root = workspace();
    init(root);
    fastImport(root, Array.from({ length: 10_040 }, (_, i) => ({ mark: i + 1, message: `c${i + 1}`, files: [["projects-folder/P/n.txt", `${i}\n`]] as [string, Content][] })));
    const api = handler(root);
    const below = await body<Log>(get(api, "/log", { project: P, skip: "9950" }));
    assert.deepEqual([below.commits.length, below.more], [50, true], "skip 10000 is still allowed");
    const last = await body<Log>(get(api, "/log", { project: P, skip: "9980" }));
    assert.deepEqual([last.commits.length, last.more], [50, false], "60 commits are left, but skip 10030 would be refused");
  });

  test("0x1e and 0x1f in a message spoil nothing, not even their own record; a message ends at a NUL", async () => {
    const root = workspace();
    init(root);
    const m = fastImport(root, [
      { mark: 1, message: "before", files: [["projects-folder/P/a", "1\n"]] },
      { mark: 2, message: Buffer.from("evil \x1e sub \x1f ject\n\nbody \x1e and \x1f\nline 2\n\0hidden\n"), files: [["projects-folder/P/a", "2\n"]] },
      { mark: 3, message: "after", files: [["projects-folder/P/a", "3\n"]] },
    ]);
    const api = handler(root);
    const log = await body<Log>(get(api, "/log", { project: P }));
    assert.deepEqual(log.commits.map((c) => [c.subject, c.files]), [["after", 1], ["evil \x1e sub \x1f ject", 1], ["before", 1]]);
    const commit = await body<Commit>(get(api, "/commit", { project: P, hash: m[2]! }));
    assert.equal(commit.subject, "evil \x1e sub \x1f ject");
    assert.equal(commit.body, "body \x1e and \x1f\nline 2");
  });

  test("UTF-8 survives a large diff; other bytes become U+FFFD and such a name cannot be opened", async () => {
    const root = workspace();
    init(root);
    const zh = Array.from({ length: 6000 }, (_, i) => `中文内容第${i}行，一个测试\n`).join("");
    const m = fastImport(root, [
      {
        mark: 1,
        message: "中文提交",
        files: [
          ["projects-folder/P/Code/README_zh.md", zh],
          ["projects-folder/P/latin1.txt", Buffer.from("caf\xe9\n", "latin1")],
          [Buffer.concat([Buffer.from("projects-folder/P/"), Buffer.from([0xff]), Buffer.from("bad.txt")]), "x\n"],
        ],
      },
    ]);
    const api = handler(root);
    const diff = await body<Diff>(get(api, "/diff", { project: P, hash: m[1]!, path: "Code/README_zh.md" }));
    assert.ok(Buffer.byteLength(diff.diff) > 200_000, "several pipe chunks");
    assert.ok(!diff.diff.includes("�"));
    assert.ok(diff.diff.includes("+中文内容第5999行，一个测试\n"));
    const latin = await body<Diff>(get(api, "/diff", { project: P, hash: m[1]!, path: "latin1.txt" }));
    assert.match(latin.diff, /\n\+caf�\n/);
    const commit = await body<Commit>(get(api, "/commit", { project: P, hash: m[1]! }));
    assert.equal(commit.subject, "中文提交");
    const bad = commit.files.find((f) => f.path === "�bad.txt");
    assert.ok(bad, JSON.stringify(commit.files.map((f) => f.path)));
    assert.equal(bad.openable, false);
  });

  test("a binary file has no line counts, its sizes, and counts as a file", async () => {
    const root = workspace();
    init(root);
    const pdf = (n: number) => Buffer.alloc(n, 0);
    const m = fastImport(root, [
      { mark: 1, message: "add", files: [["projects-folder/P/paper/main.pdf", pdf(3000)], ["projects-folder/P/t.txt", "t\n"]] },
      { mark: 2, message: "grow", files: [["projects-folder/P/paper/main.pdf", pdf(5000)]] },
      { mark: 3, message: "drop", files: [["projects-folder/P/paper/main.pdf", null]] },
    ]);
    const api = handler(root);
    const sizes = async (mark: number) => (await body<Commit>(get(api, "/commit", { project: P, hash: m[mark]! }))).files.map((f) => [f.path, f.added, f.sizes]);
    assert.deepEqual(await sizes(1), [["paper/main.pdf", null, { old: 0, new: 3000 }], ["t.txt", 1, null]]);
    assert.deepEqual(await sizes(2), [["paper/main.pdf", null, { old: 3000, new: 5000 }]]);
    assert.deepEqual(await sizes(3), [["paper/main.pdf", null, { old: 5000, new: 0 }]]);
    const first = await body<Commit>(get(api, "/commit", { project: P, hash: m[1]! }));
    assert.deepEqual(first.stat, { files: 2, added: 1, deleted: 0 });
    const log = await body<Log>(get(api, "/log", { project: P }));
    assert.deepEqual(log.commits.map((c) => [c.files, c.added, c.deleted]), [[1, 0, 0], [1, 0, 0], [2, 1, 0]]);
  });

  test("a rename is a deletion and an addition; a root commit adds; a merge shows its first parent", async () => {
    const root = workspace();
    init(root);
    const m = fastImport(root, [
      { mark: 1, message: "root", files: [["projects-folder/P/old.txt", "same\ncontent\n"]] },
      { mark: 2, message: "move", files: [["projects-folder/P/old.txt", null], ["projects-folder/P/new.txt", "same\ncontent\n"]] },
      { mark: 3, message: "side", ref: "refs/heads/side", from: 2, files: [["projects-folder/P/side.txt", "s\n"]] },
      { mark: 4, message: "main", files: [["outside.txt", "o\n"]] },
      { mark: 5, message: "merge side", from: 4, merge: 3, files: [["projects-folder/P/side.txt", "s\n"]] },
    ]);
    const api = handler(root);
    const files = async (mark: number) => (await body<Commit>(get(api, "/commit", { project: P, hash: m[mark]! }))).files.map((f) => [f.path, f.status, f.added, f.deleted]);
    assert.deepEqual(await files(1), [["old.txt", "A", 2, 0]]);
    assert.deepEqual(await files(2), [["new.txt", "A", 2, 0], ["old.txt", "D", 0, 2]]);
    assert.deepEqual(await files(5), [["side.txt", "A", 1, 0]]);
    const log = await body<Log>(get(api, "/log", { project: P }));
    assert.deepEqual(log.commits.map((c) => c.subject), ["side", "move", "root"], "merges are left out of the list");
    assert.equal((await body<Summary>(get(api, "/", { project: P }))).head?.hash, m[3], "and of the head");
  });

  test("dot paths are listed with their counts but cannot be opened, not even through their folder", async () => {
    const root = workspace();
    init(root);
    const m = fastImport(root, [
      { mark: 1, message: "dots", files: [["projects-folder/P/.env", "SECRET=1\n"], ["projects-folder/P/a/.secret/x", "s\n"], ["projects-folder/P/a/visible.txt", "v\n"], ["projects-folder/P/Code/.env", "K=1\n"]] },
    ]);
    const api = handler(root);
    const commit = await body<Commit>(get(api, "/commit", { project: P, hash: m[1]! }));
    assert.deepEqual(commit.files.map((f) => [f.path, f.added, f.openable]), [
      [".env", 1, false],
      ["Code/.env", 1, false],
      ["a/.secret/x", 1, false],
      ["a/visible.txt", 1, true],
    ]);
    for (const path of [".env", "a/.secret/x"]) assert.equal((await get(api, "/diff", { project: P, hash: m[1]!, path })).status, 400, path);
    for (const path of ["a", "Code"]) {
      const r = await get(api, "/diff", { project: P, hash: m[1]!, path });
      assert.equal(r.status, 404, `${path}: a folder is not a file`);
      assert.doesNotMatch(JSON.stringify(r.body), /SECRET|K=1|\+s/);
    }
    assert.equal((await get(api, "/diff", { project: P, hash: m[1]!, path: "a/visible.txt" })).status, 200);
    assert.equal((await get(api, "/diff", { project: P, hash: m[1]!, path: "nope.txt" })).status, 404);
  });

  test("caps: a long diff, a long file list, and long log records are cut at whole records", async () => {
    const root = workspace();
    init(root);
    const many: [string, Content][] = Array.from({ length: 6000 }, (_, i) => [`projects-folder/P/f/${String(i).padStart(4, "0")}-${"x".repeat(60)}.txt`, `${i}\n`]);
    const subjects: FiCommit[] = Array.from({ length: 60 }, (_, i) => ({ mark: i + 3, message: `s${i}-${"y".repeat(6000)}`, files: [["projects-folder/P/n.txt", `${i}\n`]] }));
    const m = fastImport(root, [
      { mark: 1, message: "big file", files: [["projects-folder/P/big.txt", "line of text\n".repeat(100_000)]] },
      { mark: 2, message: "many files", files: many },
      ...subjects,
    ]);
    const api = handler(root);
    const diff = await body<Diff>(get(api, "/diff", { project: P, hash: m[1]!, path: "big.txt" }));
    assert.equal(diff.truncated, true);
    assert.ok(diff.diff.endsWith("+line of text\n"));
    assert.ok(Buffer.byteLength(diff.diff) <= 1024 * 1024);
    const commit = await body<Commit>(get(api, "/commit", { project: P, hash: m[2]! }));
    assert.equal(commit.truncated, true);
    assert.ok(commit.files.length > 1000 && commit.files.length < 6000, String(commit.files.length));
    assert.deepEqual(commit.stat, { files: 6000, added: 6000, deleted: 0 }, "the total does not come from the cut list");
    const seen: string[] = [];
    for (let skip = 0, more = true; more; ) {
      const page = await body<Log>(get(api, "/log", { project: P, skip: String(skip) }));
      assert.ok(page.commits.length > 0 && page.commits.length < 50, `a page of ${page.commits.length}`);
      seen.push(...page.commits.map((c) => c.hash));
      assert.ok(page.commits.every((c) => c.files === 1 || c.files === 6000));
      skip += page.commits.length;
      more = page.more;
      if (seen.length > 100) break;
    }
    assert.equal(seen.length, 62);
    assert.equal(new Set(seen).size, 62);
  });

  test("a path is literal: a glob matches only its own name, and a leading - is no option", async () => {
    const root = workspace();
    init(root);
    const m = fastImport(root, [{ mark: 1, message: "odd names", files: [["projects-folder/P/*", "star\n"], ["projects-folder/P/a", "a\n"], ["projects-folder/P/-n", "dash\n"]] }]);
    const api = handler(root);
    const star = await body<Diff>(get(api, "/diff", { project: P, hash: m[1]!, path: "*" }));
    assert.deepEqual(star.diff.split("\n").filter((l) => l.startsWith("diff --git")), ["diff --git a/* b/*"]);
    const dash = await body<Diff>(get(api, "/diff", { project: P, hash: m[1]!, path: "-n" }));
    assert.match(dash.diff, /^diff --git a\/-n b\/-n\n/);
  });

  test("a path that looks like an option is a path, in the project's own repository too", async () => {
    const root = workspace();
    const own = init(join(root, "projects-folder", P));
    const m = fastImport(own, [{ mark: 1, message: "one", files: [["a.txt", "a\n"]] }]);
    const r = await get(handler(root), "/diff", { project: P, hash: m[1]!, path: "--output=evil" });
    assert.equal(r.status, 404);
    assert.ok(!existsSync(join(own, "evil")) && !existsSync(join(own, "--output=evil")));
  });
});

describe("output the repository's config cannot reshape", () => {
  /** A workspace repository with history `commits` and the repository config `config`. */
  function configured(config: Record<string, string>, commits: FiCommit[]) {
    const root = workspace();
    init(root);
    const m = fastImport(root, commits);
    for (const [key, value] of Object.entries(config)) fx(root, ["config", key, value]);
    return { api: handler(root), m, root };
  }
  const simple: FiCommit[] = [
    { mark: 1, message: "root", files: [["projects-folder/P/t.txt", "1\n"], ["projects-folder/P/中文.md", "一\n"]] },
    { mark: 2, message: "中文提交", files: [["projects-folder/P/t.txt", "1\n2\n"], ["projects-folder/P/中文.md", "一\n二\n"]] },
  ];

  test("log.showRoot=false (--root)", async () => {
    const { api, m } = configured({ "log.showRoot": "false" }, simple);
    const log = await body<Log>(get(api, "/log", { project: P }));
    assert.deepEqual(log.commits.map((c) => c.files), [2, 2]);
    assert.equal((await body<Commit>(get(api, "/commit", { project: P, hash: m[1]! }))).files.length, 2);
  });

  test("i18n.logOutputEncoding (--encoding=UTF-8)", async () => {
    // A subject Latin-1 can hold: Git re-encodes it rather than falling back to the original bytes.
    const { api, m } = configured({ "i18n.logOutputEncoding": "ISO-8859-1" }, [{ mark: 1, message: "café crème", files: [["projects-folder/P/t.txt", "1\n"]] }]);
    assert.equal((await body<Log>(get(api, "/log", { project: P }))).commits[0]!.subject, "café crème");
    assert.equal((await body<Commit>(get(api, "/commit", { project: P, hash: m[1]! }))).subject, "café crème");
  });

  test("color.ui=always (--no-color)", async () => {
    const { api, m } = configured({ "color.ui": "always", "color.diff": "always" }, simple);
    const diff = await body<Diff>(get(api, "/diff", { project: P, hash: m[2]!, path: "t.txt" }));
    assert.ok(!diff.diff.includes("\x1b"), JSON.stringify(diff.diff));
  });

  test("diff.noprefix and diff.mnemonicPrefix (--src-prefix, --dst-prefix)", async () => {
    const { api, m } = configured({ "diff.noprefix": "true", "diff.mnemonicPrefix": "true" }, simple);
    const diff = await body<Diff>(get(api, "/diff", { project: P, hash: m[2]!, path: "t.txt" }));
    assert.deepEqual(diff.diff.split("\n").slice(0, 1), ["diff --git a/t.txt b/t.txt"]);
    assert.match(diff.diff, /\n--- a\/t\.txt\n\+\+\+ b\/t\.txt\n/);
  });

  test("core.quotePath=true (-c core.quotePath=false)", async () => {
    const { api, m } = configured({ "core.quotePath": "true" }, simple);
    const diff = await body<Diff>(get(api, "/diff", { project: P, hash: m[2]!, path: "中文.md" }));
    assert.equal(diff.diff.split("\n")[0], "diff --git a/中文.md b/中文.md");
  });

  test("log.follow=true (--no-follow): no commit from outside the project", async () => {
    const { api } = configured({ "log.follow": "true" }, [
      { mark: 1, message: "private diary", files: [["human/private/diary.txt", "secret\nlines\n"]] },
      { mark: 2, message: "move it to P as a file", files: [["human/private/diary.txt", null], ["projects-folder/P", "secret\nlines\n"]] },
      { mark: 3, message: "P becomes a project", files: [["projects-folder/P", null], ["projects-folder/P/PROJECT_MEMORY.md", "# P\n"]] },
    ]);
    const log = await body<Log>(get(api, "/log", { project: P }));
    assert.deepEqual(log.commits.map((c) => c.subject), ["P becomes a project", "move it to P as a file"]);
  });

  test("diff.renames=copies (--no-renames)", async () => {
    const { api, m } = configured({ "diff.renames": "copies" }, [
      { mark: 1, message: "root", files: [["projects-folder/P/old.txt", "same\ncontent\n"]] },
      { mark: 2, message: "move", files: [["projects-folder/P/old.txt", null], ["projects-folder/P/new.txt", "same\ncontent\n"]] },
    ]);
    const commit = await body<Commit>(get(api, "/commit", { project: P, hash: m[2]! }));
    assert.deepEqual(commit.files.map((f) => [f.path, f.status]), [["new.txt", "A"], ["old.txt", "D"]]);
  });

  test("a merge (--diff-merges=first-parent)", async () => {
    const { api, m } = configured({}, [
      { mark: 1, message: "root", files: [["projects-folder/P/a", "a\n"]] },
      { mark: 2, message: "side", ref: "refs/heads/side", from: 1, files: [["projects-folder/P/a", "a\nside\n"]] },
      { mark: 3, message: "main", files: [["projects-folder/P/a", "main\na\n"]] },
      { mark: 4, message: "merge", from: 3, merge: 2, files: [["projects-folder/P/a", "main\na\nside\nresolved\n"]] },
    ]);
    const commit = await body<Commit>(get(api, "/commit", { project: P, hash: m[4]! }));
    assert.deepEqual(commit.files.map((f) => [f.path, f.status, f.added, f.deleted]), [["a", "M", 2, 0]]);
    const diff = await body<Diff>(get(api, "/diff", { project: P, hash: m[4]!, path: "a" }));
    assert.match(diff.diff, /^diff --git a\/a b\/a\n/);
  });

  test("diff.submodule=log (--submodule=short): the submodule's repository is not read", async () => {
    const root = workspace();
    const sub = init(join(root, "projects-folder", P, "sub"));
    const s = fastImport(sub, [
      { mark: 1, message: "sub one", files: [["s.txt", "1\n"]] },
      { mark: 2, message: "sub two", files: [["s.txt", "2\n"]] },
    ]);
    init(root);
    const m = fastImport(root, [
      { mark: 1, message: "add sub", files: [["projects-folder/P/sub", { gitlink: s[1]! }]] },
      { mark: 2, message: "bump sub", files: [["projects-folder/P/sub", { gitlink: s[2]! }]] },
    ]);
    for (const value of ["log", "diff"]) {
      fx(root, ["config", "diff.submodule", value]);
      const diff = await body<Diff>(get(handler(root), "/diff", { project: P, hash: m[2]!, path: "sub" }));
      assert.match(diff.diff, new RegExp(`\\n-Subproject commit ${s[1]}\\n\\+Subproject commit ${s[2]}\\n`), value);
      assert.doesNotMatch(diff.diff, /sub two|s\.txt/, value);
    }
  });

  test("a .gitattributes in the working tree (--attr-source=<commit>)", async () => {
    const { api, m, root } = configured({}, simple);
    writeFileSync(join(root, ".gitattributes"), "*.txt -diff\n");
    writeFileSync(join(root, "projects-folder", P, ".gitattributes"), "*.txt binary\n");
    const commit = await body<Commit>(get(api, "/commit", { project: P, hash: m[2]! }));
    assert.deepEqual(commit.files.map((f) => [f.path, f.added]), [["t.txt", 1], ["中文.md", 1]]);
    assert.equal((await body<Log>(get(api, "/log", { project: P }))).commits[0]!.added, 2);
    assert.match((await body<Diff>(get(api, "/diff", { project: P, hash: m[2]!, path: "t.txt" }))).diff, /\n\+2\n/);
  });

  test("a replace ref (--no-replace-objects): a hash shows its own commit", async () => {
    const { api, m, root } = configured({}, simple);
    const raw = fx(root, ["cat-file", "commit", m[2]!]).replace("中文提交", "replacement");
    const replacement = fx(root, ["hash-object", "-t", "commit", "-w", "--stdin"], `${raw}\n`);
    fx(root, ["replace", m[2]!, replacement]);
    assert.equal((await body<Commit>(get(api, "/commit", { project: P, hash: m[2]! }))).subject, "中文提交");
    assert.equal((await body<Log>(get(api, "/log", { project: P }))).commits[0]!.subject, "中文提交");
  });

  test("an unusable project .git does not fall through to the workspace's repository (--git-dir)", async () => {
    const root = workspace();
    init(root);
    fastImport(root, [{ mark: 1, message: "workspace commit", files: [["projects-folder/P/w.txt", "w\n"]] }]);
    const gitDir = join(root, "projects-folder", P, ".git");
    mkdirSync(join(gitDir, "objects"), { recursive: true });
    mkdirSync(join(gitDir, "refs"));
    const api = handler(root);
    for (const path of ["/", "/log"]) {
      const r = await get(api, path, { project: P });
      assert.equal(r.status, 500, JSON.stringify(r.body));
      assert.doesNotMatch(JSON.stringify(r.body), /workspace commit/);
      const error = (r.body as { error: string }).error;
      assert.ok(error.includes("<workspace>") && !error.includes(realpathSync.native(root)) && !error.includes(root), `no absolute path: ${error}`);
    }
  });

  test("diff.orderFile naming a missing file (-O<null device>)", async () => {
    const { api, m } = configured({ "diff.orderFile": join(tmpdir(), "os-ui-no-such-order-file") }, simple);
    assert.equal((await get(api, "/log", { project: P })).status, 200);
    assert.equal((await get(api, "/commit", { project: P, hash: m[2]! })).status, 200);
    assert.equal((await get(api, "/diff", { project: P, hash: m[2]!, path: "t.txt" })).status, 200);
  });

  test("core.attributesFile naming a file outside the workspace (-c core.attributesFile=<null device>)", async () => {
    const outside = tempTree({ attributes: "*.txt -diff\n" });
    const { api, m } = configured({ "core.attributesFile": join(outside, "attributes") }, simple);
    const commit = await body<Commit>(get(api, "/commit", { project: P, hash: m[2]! }));
    assert.deepEqual(commit.files.map((f) => [f.path, f.added]), [["t.txt", 1], ["中文.md", 1]]);
  });

  test("diff.ignoreSubmodules, and a working tree .gitmodules saying ignore = all (--ignore-submodules=none)", async () => {
    const gitmodules = (extra: string) => `[submodule "s"]\n\tpath = projects-folder/P/sub\n\turl = ./s\n${extra}`;
    for (const [config, working] of [[{ "diff.ignoreSubmodules": "all" }, null], [{}, gitmodules("\tignore = all\n")]] as const) {
      const { api, m, root } = configured(config, [
        { mark: 1, message: "add sub", files: [[".gitmodules", gitmodules("")], ["projects-folder/P/sub", { gitlink: "1".repeat(40) }]] },
        { mark: 2, message: "bump sub", files: [["projects-folder/P/sub", { gitlink: "2".repeat(40) }]] },
      ]);
      if (working !== null) writeFileSync(join(root, ".gitmodules"), working);
      const commit = await body<Commit>(get(api, "/commit", { project: P, hash: m[2]! }), 200);
      assert.deepEqual(commit.files.map((f) => [f.path, f.status]), [["sub", "M"]], JSON.stringify(config));
      assert.deepEqual((await body<Log>(get(api, "/log", { project: P }))).commits.map((c) => c.files), [1, 1]);
    }
  });

  test("files the config or the working tree name that are FIFOs: mailmap.file, .mailmap, .gitmodules (--no-use-mailmap, --ignore-submodules=none)", { skip: WINDOWS ? "Windows has no FIFOs in the file system" : false }, async () => {
    const outside = mkdtempSync(join(tmpdir(), "os-ui-git-fifo-"));
    const fifo = (path: string) => assert.equal(spawnSync("mkfifo", [path]).status, 0, `mkfifo ${path}`);
    fifo(join(outside, "mailmap"));
    const { api, m, root } = configured({ "mailmap.file": join(outside, "mailmap") }, [
      { mark: 1, message: "add sub", files: [["projects-folder/P/a.txt", "a\n"], ["projects-folder/P/sub", { gitlink: "1".repeat(40) }]] },
    ]);
    fifo(join(root, ".mailmap"));
    fifo(join(root, ".gitmodules"));
    const started = Date.now();
    for (const [path, extra] of [["/log", {}], ["/commit", { hash: m[1]! }], ["/diff", { hash: m[1]!, path: "sub" }]] as const) {
      assert.equal((await get(api, path, { project: P, ...extra })).status, 200, path);
    }
    assert.ok(Date.now() - started < 9_000, "no command waited on a FIFO");
  });
});

describe("git itself", () => {
  test("a missing git is a problem to show, once a repository exists", async () => {
    const root = workspace();
    init(root);
    fastImport(root, [{ mark: 1, message: "one", files: [["projects-folder/P/a", "a\n"]] }]);
    const api = codeGitHandler(context(root, { run: processRunner(cleanEnv()) }), "os-ui-no-such-git");
    assert.deepEqual(await body(get(api, "/log", { project: P })), { repo: null, problem: "git was not found; see Settings" });
  });

  test("a git older than the minimum runs nothing else; a failed probe is asked again", async () => {
    const root = workspace();
    init(root);
    let version = "git version 2.44.2";
    const { run, calls } = fakeRunner((call) => (call.command[1] === "--version" ? ok(version) : ok("")));
    const api = codeGitHandler(context(root, { run }));
    const answer = await body<{ repo: null; problem: string }>(get(api, "/", { project: P }));
    assert.equal(answer.repo, null);
    assert.match(answer.problem, /^Git 2\.44\.2 is too old for the Code view, which needs Git 2\.45 or later; see Settings$/);
    assert.deepEqual(calls.map((c) => c.command), [["git", "--version"]]);
    version = "git version 2.45.0";
    await get(api, "/", { project: P });
    assert.equal(calls[1]!.command[1], "--version", "probed again after a failure");
    assert.ok(calls.length > 2, "and then went on");
    const count = calls.length;
    await get(api, "/", { project: P });
    assert.ok(calls.slice(count).every((c) => c.command[1] !== "--version"), "a good probe is kept");
  });

  test("versions parse as git prints them on each platform", () => {
    assert.deepEqual(parseGitVersion("git version 2.47.1.windows.2\n"), [2, 47, 1]);
    assert.deepEqual(parseGitVersion("git version 2.39.5 (Apple Git-154)\n"), [2, 39, 5]);
    assert.deepEqual(parseGitVersion("git version 2.45\n"), [2, 45, 0]);
    assert.equal(parseGitVersion("command not found"), null);
    assert.deepEqual([...MIN_GIT], [2, 45]);
  });

  test("the git these tests run is at least the minimum (they fail rather than skip below it)", () => {
    const version = parseGitVersion(spawnSync("git", ["--version"], { encoding: "utf8" }).stdout);
    assert.ok(version !== null && (version[0] > 2 || (version[0] === 2 && version[1] >= MIN_GIT[1])), String(version));
  });

  test("openable", () => {
    assert.equal(openable("Code/README.md"), true);
    for (const path of ["", ".env", "a/.b", "a:b", "a\\b", "a//b", "nul", "x�", "y".repeat(1001)]) assert.equal(openable(path), false, path);
  });

  test("the environment git gets: no GIT_* in any case, no global or system config, the rest kept", () => {
    const env = gitEnv({ PATH: "/bin", HOME: "/h", GIT_DIR: "/x", git_external_diff: "/y", Git_Config_Count: "1", GITX: "kept", PYTHONIOENCODING: "utf-8" });
    assert.deepEqual(env, { PATH: "/bin", HOME: "/h", GITX: "kept", PYTHONIOENCODING: "utf-8", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: devNull });
  });

  test("every call runs in the repository's top with the guards no output can show (--work-tree, --no-optional-locks, core.fsmonitor=false, --no-ext-diff)", async () => {
    const root = workspace();
    init(root);
    const m = fastImport(root, [{ mark: 1, message: "one", files: [["projects-folder/P/a", "a\n"]] }]);
    const real = processRunner(cleanEnv());
    const seen: { command: readonly string[]; options: RunOptions }[] = [];
    const run: Runner = (command, options) => (seen.push({ command, options }), real(command, options));
    const api = codeGitHandler(context(root, { run }));
    for (const [path, extra] of [["/", {}], ["/log", {}], ["/commit", { hash: m[1]! }], ["/diff", { hash: m[1]!, path: "a" }]] as const) {
      await body(get(api, path, { project: P, ...extra }));
    }
    const top = seen.find((s) => s.command.some((a) => a.startsWith("--work-tree=")))!.options.cwd;
    for (const { command, options } of seen) {
      assert.equal(command[0], "git");
      assert.equal(options.env, gitEnv);
      assert.equal(options.timeoutMs, 10_000);
      assert.ok(options.maxOutputBytes !== undefined);
      if (command[1] === "--version") continue;
      assert.equal(options.cwd, top);
      assert.ok(command.includes(`--git-dir=${join(top, ".git")}`) && command.includes(`--work-tree=${top}`), command.join(" "));
      assert.ok(command.includes("--no-optional-locks"), command.join(" "));
      assert.ok(command.join("\n").includes("\n-c\ncore.fsmonitor=false\n"), command.join(" "));
      if (command.includes("log") || command.includes("show")) assert.ok(command.includes("--no-ext-diff"), command.join(" "));
    }
  });
});

describe("no program runs and nothing reaches the network, whatever the repository's config says", { skip: NO_SCRIPTS }, () => {
  let found: Set<string>;
  let unchanged: boolean;
  let answers: ApiResponse[];

  before(async () => {
    const root = workspace();
    init(root);
    const markers = join(mkdtempSync(join(tmpdir(), "os-ui-git-markers-")), "markers");
    mkdirSync(markers);
    const mk = (name: string) => markerScript(markers, name);
    const m = fastImport(root, [
      { mark: 1, message: "first", files: [[".gitattributes", "* diff=evil filter=evil merge=evil\n"], ["projects-folder/P/a.txt", "one\n"], ["outside.txt", "x\n"]] },
      { mark: 2, message: "second", files: [["projects-folder/P/a.txt", "one\ntwo\n"]] },
      { mark: 3, message: "gitlink", files: [["projects-folder/P/sub", { gitlink: "1".repeat(40) }]] },
      { mark: 4, message: "to be signed", files: [["projects-folder/P/signed.txt", "s\n"]] },
    ]);
    // A signed commit: commit 4's object with a gpgsig header.
    const object = fx(root, ["cat-file", "commit", m[4]!]).replace(/\ncommitter [^\n]*/, (line) => `${line}\ngpgsig -----BEGIN PGP SIGNATURE-----\n \n iQEzBAABCAAdFiEE\n -----END PGP SIGNATURE-----`);
    const signed = fx(root, ["hash-object", "-t", "commit", "-w", "--stdin"], `${object}\n`);
    fx(root, ["update-ref", "refs/heads/main", signed]);
    // A commit on another branch whose blob is missing, as in a partial clone.
    const missing = fx(root, ["hash-object", "--stdin"], "lazy\n");
    const tree = (entries: string) => fx(root, ["mktree", "--missing"], entries);
    const lazyTree = tree(`040000 tree ${tree(`040000 tree ${tree(`100644 blob ${missing}\tlazy.txt\n`)}\tP\n`)}\tprojects-folder\n`);
    const lazy = fx(root, ["commit-tree", lazyTree, "-p", m[2]!, "-m", "lazy"]);
    fx(root, ["update-ref", "refs/heads/lazy", lazy]);
    fx(root, ["read-tree", "main"]); // an index, which a gitlink makes show read
    mkdirSync(join(markers, "..", "hooks"));
    for (const hook of ["reference-transaction", "post-index-change", "pre-auto-gc", "post-checkout", "fsmonitor-watchman"]) {
      writeFileSync(join(markers, "..", "hooks", hook), `#!/bin/sh\necho x >> '${join(markers, `hook-${hook}`)}'\n`);
      chmodSync(join(markers, "..", "hooks", hook), 0o755);
    }
    const config: [string, string][] = [
      ["diff.evil.textconv", mk("textconv")],
      ["diff.evil.cachetextconv", "true"],
      ["filter.evil.clean", mk("filter-clean")],
      ["filter.evil.smudge", mk("filter-smudge")],
      ["filter.evil.process", mk("filter-process")],
      ["diff.external", mk("diff-external")],
      ["diff.evil.command", mk("diff-command")],
      ["merge.evil.driver", mk("merge-driver")],
      ["log.showSignature", "true"],
      ["gpg.program", mk("gpg")],
      ["gpg.openpgp.program", mk("gpg-openpgp")],
      ["gpg.ssh.program", mk("gpg-ssh")],
      ["gpg.x509.program", mk("gpg-x509")],
      ["core.fsmonitor", mk("fsmonitor")],
      ["core.repositoryformatversion", "1"],
      ["extensions.partialClone", "origin"],
      ["remote.origin.url", "ssh://example.invalid/repo"],
      ["remote.origin.promisor", "true"],
      ["remote.origin.uploadpack", mk("uploadpack")],
      ["core.sshCommand", mk("ssh")],
      ["core.gitProxy", mk("git-proxy")],
      ["core.askPass", mk("askpass")],
      ["credential.helper", `!${mk("credential")}`],
      ["core.hooksPath", join(markers, "..", "hooks")],
      ["hook.evil.command", mk("config-hook")],
      ["hook.evil.event", "reference-transaction"],
      ["core.pager", mk("pager")],
      ["pager.log", mk("pager-log")],
      ["pager.show", mk("pager-show")],
      ["core.editor", mk("editor")],
      ["sequence.editor", mk("sequence-editor")],
      ["alias.log", `!${mk("alias-log")}`],
      ["alias.show", `!${mk("alias-show")}`],
      ["core.alternateRefsCommand", mk("alternate-refs")],
      ["gc.auto", "1"],
      ["gc.autoDetach", "false"],
      ["gc.recentObjectsHook", mk("gc-hook")],
      ["maintenance.auto", "true"],
      ["interactive.diffFilter", mk("diff-filter")],
      ["trailer.evil.command", mk("trailer")],
      ["uploadpack.packObjectsHook", mk("pack-objects-hook")],
    ];
    for (const [key, value] of config) fx(root, ["config", "--add", key, value]);

    const gitDir = join(root, ".git");
    const before = hashTree(gitDir);
    const api = handler(root);
    answers = [await get(api, "/", { project: P }), await get(api, "/log", { project: P })];
    for (const [hash, path] of [[m[1]!, "a.txt"], [m[2]!, "a.txt"], [m[3]!, "sub"], [signed, "signed.txt"], [lazy, "lazy.txt"]] as const) {
      answers.push(await get(api, "/commit", { project: P, hash }), await get(api, "/diff", { project: P, hash, path }));
    }
    unchanged = hashTree(gitDir) === before;
    found = new Set(readdirSync(markers));
  });

  const none = (...names: string[]) => {
    const seen = names.filter((n) => found.has(n));
    assert.deepEqual(seen, [], `ran: ${seen.join(", ")}`);
  };

  test("the routes answered", () => {
    assert.deepEqual(answers.slice(0, 2).map((a) => a.status), [200, 200]);
    assert.deepEqual(answers.slice(2, 10).map((a) => a.status), [200, 200, 200, 200, 200, 200, 200, 200]);
    assert.deepEqual(answers.slice(10).map((a) => a.status), [500, 500], "the missing blob fails; nothing fetches it");
  });
  test("textconv, and the filters its temporary files go through (--no-textconv)", () => none("textconv", "filter-clean", "filter-smudge", "filter-process"));
  test("signature verification (--no-show-signature)", () => none("gpg", "gpg-openpgp", "gpg-ssh", "gpg-x509"));
  test("the file system monitor (--ignore-submodules=none stops the index read that would start it; core.fsmonitor=false too)", () =>
    none("fsmonitor", "hook-fsmonitor-watchman"));
  test("lazy fetch and its transport (--no-lazy-fetch)", () => none("ssh", "uploadpack", "git-proxy", "askpass", "credential"));
  test("hooks, which only a ref update starts, as textconv's notes cache would make (--no-textconv)", () =>
    none("config-hook", "hook-reference-transaction"));
  test("external diff drivers, which log and show leave off by themselves", () => none("diff-external", "diff-command"));
  test("keys these commands never reach", () =>
    none("pager", "pager-log", "pager-show", "editor", "sequence-editor", "alias-log", "alias-show", "alternate-refs", "gc-hook", "diff-filter", "trailer", "pack-objects-hook", "merge-driver", "hook-post-index-change", "hook-pre-auto-gc", "hook-post-checkout"));
  test(".git is byte for byte unchanged after every route", () => assert.equal(unchanged, true));
});

describe("the user's environment cannot change that either", () => {
  /** A workspace repository whose committed .gitattributes selects the driver "evil". */
  function repo() {
    const root = workspace();
    init(root);
    const m = fastImport(root, [
      { mark: 1, message: "first", files: [[".gitattributes", "* diff=evil\n"], ["projects-folder/P/a.txt", "one\n"]] },
      { mark: 2, message: "second", files: [["projects-folder/P/a.txt", "one\ntwo\n"]] },
    ]);
    return { root, m };
  }
  async function allRoutes(api: ApiHandler, hash: string): Promise<number[]> {
    const statuses = [];
    for (const [path, extra] of [["/", {}], ["/log", {}], ["/commit", { hash }], ["/diff", { hash, path: "a.txt" }]] as const) {
      statuses.push((await get(api, path, { project: P, ...extra })).status);
    }
    return statuses;
  }
  /** Hostile global settings: trace2 files (any platform) and, where scripts run, a textconv program. */
  function hostile() {
    const dir = mkdtempSync(join(tmpdir(), "os-ui-git-hostile-"));
    const markers = join(dir, "markers");
    mkdirSync(markers);
    const entries: [string, string][] = [
      ["trace2.eventTarget", join(dir, "trace2-event.json")],
      ["trace2.normalTarget", join(dir, "trace2-normal.txt")],
      ["safe.directory", "*"],
    ];
    if (!WINDOWS) entries.push(["diff.evil.textconv", markerScript(markers, "textconv")], ["core.fsmonitor", markerScript(markers, "fsmonitor")]);
    const file = `[trace2]\n\teventTarget = ${entries[0]![1]}\n\tnormalTarget = ${entries[1]![1]}\n` + (WINDOWS ? "" : `[diff "evil"]\n\ttextconv = ${entries[3]![1]}\n`);
    const written = () => [join(dir, "trace2-event.json"), join(dir, "trace2-normal.txt")].filter(existsSync).concat(readdirSync(markers));
    return { dir, entries, file, written };
  }

  test("a hostile global config, through each channel, writes and runs nothing", async () => {
    const { root, m } = repo();
    const channels: [string, (h: ReturnType<typeof hostile>) => NodeJS.ProcessEnv][] = [
      ["~/.gitconfig", (h) => (writeFileSync(join(h.dir, ".gitconfig"), h.file), { ...cleanEnv(), HOME: h.dir })],
      ["$XDG_CONFIG_HOME/git/config", (h) => (mkdirSync(join(h.dir, "xdg", "git"), { recursive: true }), writeFileSync(join(h.dir, "xdg", "git", "config"), h.file), { ...cleanEnv(), XDG_CONFIG_HOME: join(h.dir, "xdg") })],
      ["GIT_CONFIG_GLOBAL", (h) => (writeFileSync(join(h.dir, "global"), h.file), { ...cleanEnv(), GIT_CONFIG_GLOBAL: join(h.dir, "global") })],
      ["GIT_CONFIG_COUNT", (h) => ({ ...cleanEnv(), GIT_CONFIG_COUNT: String(h.entries.length), ...Object.fromEntries(h.entries.flatMap(([k, v], i) => [[`GIT_CONFIG_KEY_${i}`, k], [`GIT_CONFIG_VALUE_${i}`, v]])) })],
      ["GIT_CONFIG_PARAMETERS", (h) => ({ ...cleanEnv(), GIT_CONFIG_PARAMETERS: h.entries.map(([k, v]) => `'${k}'='${v}'`).join(" ") })],
    ];
    const before = hashTree(join(root, ".git"));
    for (const [channel, envFor] of channels) {
      const h = hostile();
      assert.deepEqual(await allRoutes(handler(root, envFor(h)), m[2]!), [200, 200, 200, 200], channel);
      assert.deepEqual(h.written(), [], channel);
    }
    assert.equal(hashTree(join(root, ".git")), before);
  });

  test("trace2 in the repository's own config writes nothing (Git reads it from protected config only)", async () => {
    const { root, m } = repo();
    const dir = mkdtempSync(join(tmpdir(), "os-ui-git-trace-"));
    fx(root, ["config", "trace2.eventTarget", join(dir, "event.json")]);
    fx(root, ["config", "trace2.normalTarget", join(dir, "normal.txt")]);
    assert.deepEqual(await allRoutes(handler(root), m[2]!), [200, 200, 200, 200]);
    assert.deepEqual(readdirSync(dir), []);
  });

  test("inherited GIT_* variables are dropped: no trace files, no borrowed objects, no other repository", async () => {
    const { root, m } = repo();
    const other = init(mkdtempSync(join(tmpdir(), "os-ui-git-other-")));
    const o = fastImport(other, [{ mark: 1, message: "from another repository", files: [["projects-folder/P/secret.txt", "secret\n"]] }]);
    const dir = mkdtempSync(join(tmpdir(), "os-ui-git-trace-"));
    const env: NodeJS.ProcessEnv = {
      ...cleanEnv(),
      GIT_TRACE: join(dir, "trace.txt"),
      GIT_TRACE2_EVENT: join(dir, "trace2.json"),
      GIT_ALTERNATE_OBJECT_DIRECTORIES: [join(other, ".git", "objects")].join(delimiter),
      GIT_DIR: join(other, ".git"),
      GIT_WORK_TREE: other,
      GIT_NAMESPACE: "elsewhere",
      GIT_INDEX_FILE: join(dir, "index"),
    };
    const api = handler(root, env);
    assert.deepEqual(await allRoutes(api, m[2]!), [200, 200, 200, 200]);
    assert.equal((await get(api, "/commit", { project: P, hash: o[1]! })).status, 404, "the other repository's commit is not found");
    assert.deepEqual(readdirSync(dir), []);
  });
});
