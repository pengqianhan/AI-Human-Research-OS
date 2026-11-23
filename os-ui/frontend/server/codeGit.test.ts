import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { before, describe, test } from "node:test";
import { codeGitHandler, gitEnv, guardArgs, MIN_GIT, openable, parseGitVersion, refusal } from "./codeGit.ts";
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
/** Names Windows forbids in a path. The handler's handling of them is tested on POSIX only. */
const NO_ODD_NAMES = WINDOWS ? "Git for Windows refuses to create a file named * or starting with a newline (fast-import: invalid path), so this history cannot be built there" : false;
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
  GIT_CONFIG_GLOBAL: "/dev/null",
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

/** What the handlers in this file wrote to their server log, newest last. */
const LOGGED: string[] = [];
const logged = (line: string) => LOGGED.push(line);

/** The handler with a real runner whose environment is `env` (a clean one by default). */
function handler(root: string, env: NodeJS.ProcessEnv = cleanEnv(), git = "git"): ApiHandler {
  return codeGitHandler(context(root, { run: processRunner(env) }), git, logged);
}

function cleanEnv(dir = home()): NodeJS.ProcessEnv {
  return { ...scrubbed(process.env), HOME: dir, XDG_CONFIG_HOME: join(dir, ".config") };
}

/** Every fixture lies below these; no answer may name them. */
const TEMP = [...new Set([tmpdir(), realpathSync.native(tmpdir())])].flatMap((t) => [t, t.replace(/\\/g, "/")]);

/** A request; every answer, refusal and failure included, is checked to carry no absolute fixture path. */
async function get(api: ApiHandler, path: string, params: Record<string, string>): Promise<ApiResponse> {
  const response = await api(request("GET", path, undefined, new URLSearchParams(params).toString()));
  const text = JSON.stringify(response.body);
  for (const t of TEMP) assert.ok(!text.includes(t) && !text.includes(JSON.stringify(t).slice(1, -1)), `${path} answered an absolute path: ${text.slice(0, 300)}`);
  return response;
}

/** A full hash no fixture holds. */
const NO_SUCH = "e".repeat(40);

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

  test("a hash that is not a full 40- or 64-digit lower-case hex object id is 400 (a short one could name a ref first)", async () => {
    for (const hash of ["--output=x", "HEAD", "ABCDEF0", "abcdef0", "a".repeat(39), "a".repeat(41), "a".repeat(63), "a".repeat(65), "A".repeat(40), `${"a".repeat(39)}^`, ""]) {
      assert.equal((await get(api, "/commit", { project: P, hash })).status, 400, hash);
      assert.equal((await get(api, "/diff", { project: P, hash, path: "a.txt" })).status, 400, hash);
    }
  });

  test("a path that is not plain and relative, or has a dot segment, is 400", async () => {
    const hash = NO_SUCH;
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
    const commit = await body<Commit>(get(api, "/commit", { project: P, hash: m[2]! }));
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
      assert.deepEqual(await body(get(codeGitHandler(context(root, { run }), "git", logged), path, { project: P })), { repo: null });
    }
    assert.deepEqual(await body(get(handler(root), "/commit", { project: P, hash: NO_SUCH })), { repo: null });
    assert.deepEqual(calls, [], "git is not even probed");
  });

  test("an empty repository and a project no commit touches have no head and no commits", async () => {
    const empty = workspace();
    init(empty);
    const api = handler(empty);
    assert.equal((await body<Summary>(get(api, "/", { project: P }))).head, null);
    assert.deepEqual(await body<Log>(get(api, "/log", { project: P })), { repo: "workspace", root: "", filter: "projects-folder/P", commits: [], more: false });
    assert.equal((await get(api, "/commit", { project: P, hash: NO_SUCH })).status, 404);

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
      const answer = await body<{ repo: null; problem: string }>(get(api, path, { project: P, hash: NO_SUCH, path: "x" }));
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

  // Links and odd files below the top of .git, which Git would read and echo.
  const env = (g: string) => join(dirname(g), ".env");
  const secret = (g: string) => (writeFileSync(env(g), "API_KEY=sk-live-0123456789abcdef\n"), env(g));
  test("a linked info/grafts (to the project's own .env)", (t) =>
    refused(t, (g) => (init(dirname(g)), symlinkSync("../../.env", join(g, "info", "grafts")), secret(g)), /has info\/grafts, which is not a plain file/));
  test("a linked info/attributes (to a file outside the workspace)", (t) =>
    refused(t, (g) => (init(dirname(g)), symlinkSync(join(elsewhere(), "config"), join(g, "info", "attributes"))), /has info\/attributes, which is not a plain file/));
  test("a linked commit-graph", (t) =>
    refused(t, (g) => (init(dirname(g)), mkdirSync(join(g, "objects", "info"), { recursive: true }), symlinkSync(secret(g), join(g, "objects", "info", "commit-graph"))), /has objects\/info\/commit-graph, which is not a plain file/));
  test("a linked commit-graph chain", (t) =>
    refused(t, (g) => {
      init(dirname(g));
      mkdirSync(join(g, "objects", "info", "commit-graphs"), { recursive: true });
      symlinkSync(secret(g), join(g, "objects", "info", "commit-graphs", "commit-graph-chain"));
    }, /has objects\/info\/commit-graphs\/commit-graph-chain, which is not a plain file/));
  test("a loose object linked into another repository", (t) =>
    refused(t, (g) => {
      init(dirname(g));
      const other = elsewhere();
      const id = fx(dirname(other), ["hash-object", "-w", "--stdin"], "TOP SECRET\n");
      mkdirSync(join(g, "objects", id.slice(0, 2)));
      symlinkSync(join(other, "objects", id.slice(0, 2), id.slice(2)), join(g, "objects", id.slice(0, 2), id.slice(2)));
    }, /has objects\/[0-9a-f]{2}\/[0-9a-f]{38}, which is not a plain file/));
  test("a pack file linked into another repository", (t) =>
    refused(t, (g) => {
      init(dirname(g));
      const other = elsewhere();
      fx(dirname(other), ["repack", "-q", "-a", "-d"]);
      const pack = readdirSync(join(other, "objects", "pack")).find((f) => f.endsWith(".pack"))!;
      symlinkSync(join(other, "objects", "pack", pack), join(g, "objects", "pack", pack));
    }, /has objects\/pack\/pack-[0-9a-f]+\.pack, which is not a plain file/));
  test("a link in reftable/", (t) =>
    refused(t, (g) => (init(dirname(g)), mkdirSync(join(g, "reftable")), symlinkSync(join(elsewhere(), "HEAD"), join(g, "reftable", "tables.list"))), /has reftable\/tables\.list, which is not a plain file/));
  test("a ref linked to another repository's ref", (t) =>
    refused(t, (g) => (init(dirname(g)), mkdirSync(join(g, "refs", "tags"), { recursive: true }), symlinkSync(join(elsewhere(), "HEAD"), join(g, "refs", "tags", "x"))), /has refs\/tags\/x, which is not a plain file/));
  test("a loose ref larger than 4 KiB", (t) =>
    refused(t, (g) => (init(dirname(g)), mkdirSync(join(g, "refs", "heads"), { recursive: true }), writeFileSync(join(g, "refs", "heads", "main"), "0".repeat(5000))), /has refs\/heads\/main, larger than 4 KiB/));
  test("a config larger than 1 MiB", (t) => refused(t, (g) => (init(dirname(g)), writeFileSync(join(g, "config"), `[core]\n${"#".repeat(1024 * 1024)}\n`)), /has config, larger than 1024 KiB/));
  test("FIFOs as HEAD, config, or in info/", { skip: WINDOWS ? "Windows has no FIFOs in the file system" : false }, async (t) => {
    for (const name of ["HEAD", "config", join("info", "attributes")]) {
      await refused(t, (g) => (init(dirname(g)), rmSync(join(g, name), { force: true }), assert.equal(spawnSync("mkfifo", [join(g, name)]).status, 0)), new RegExp(`has ${name.replace(/\\/g, "/")}, which is not a plain file`));
    }
  });
  test("more entries than one check walks", () => {
    const repo = init(mkdtempSync(join(tmpdir(), "os-ui-git-many-")));
    for (let i = 0; i < 30; i++) {
      mkdirSync(join(repo, ".git", "refs", "tags"), { recursive: true });
      writeFileSync(join(repo, ".git", "refs", "tags", `t${i}`), `${"1".repeat(40)}\n`);
    }
    const gitDir = join(repo, ".git");
    assert.match(refusal(gitDir, lstatSync(gitDir), ".git", 20) ?? "", /has more than 20 entries to check/);
    assert.equal(refusal(gitDir, lstatSync(gitDir), ".git"), null, "the real limit is 100,000");
  });

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

  test("a path is literal: a glob matches only its own name, and a leading - is no option", { skip: NO_ODD_NAMES }, async () => {
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

  test("a .gitattributes in the working tree or in the commit (--attr-source=<the empty tree>)", async () => {
    const { api, m, root } = configured({}, [
      { mark: 1, message: "root", files: [["projects-folder/P/t.txt", "1\n"], ["projects-folder/P/中文.md", "一\n"], [".gitattributes", "*.md -diff\n"]] },
      { mark: 2, message: "edit", files: [["projects-folder/P/t.txt", "1\n2\n"], ["projects-folder/P/中文.md", "一\n二\n"]] },
    ]);
    writeFileSync(join(root, ".gitattributes"), "*.txt -diff\n");
    writeFileSync(join(root, "projects-folder", P, ".gitattributes"), "*.txt binary\n");
    const commit = await body<Commit>(get(api, "/commit", { project: P, hash: m[2]! }));
    assert.deepEqual(commit.files.map((f) => [f.path, f.added]), [["t.txt", 1], ["中文.md", 1]], "neither the working tree's nor the committed one counts");
    assert.equal((await body<Log>(get(api, "/log", { project: P }))).commits[0]!.added, 2);
    assert.match((await body<Diff>(get(api, "/diff", { project: P, hash: m[2]!, path: "t.txt" }))).diff, /\n\+2\n/);
  });

  test("an info/attributes over 1 MiB is refused (Git parses it whole)", async () => {
    const root = workspace();
    init(root);
    fastImport(root, [{ mark: 1, message: "one", files: [["projects-folder/P/a.txt", "a\n"]] }]);
    writeFileSync(join(root, ".git", "info", "attributes"), "*.x a\n".repeat(200_000));
    const answer = await body<{ repo: null; problem: string }>(get(handler(root), "/", { project: P }));
    assert.match(answer.problem, /has info\/attributes, larger than 1024 KiB/);
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
    // A plain HEAD Git does not accept, so Git's discovery would skip this .git and climb.
    const gitDir = join(root, "projects-folder", P, ".git");
    mkdirSync(join(gitDir, "objects"), { recursive: true });
    mkdirSync(join(gitDir, "refs"));
    writeFileSync(join(gitDir, "HEAD"), "not a ref\n");
    const api = handler(root);
    for (const path of ["/", "/log"]) {
      const r = await get(api, path, { project: P });
      assert.deepEqual([r.status, r.body], [500, { error: "git rev-parse HEAD failed (exit 128)" }], "a fixed text, and not the workspace's history");
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
    for (const other of ["v22.23.1\n", "2.45.0\n", " git version 2.45.0", "ERROR: Invalid argument or option - '--version'.\n"]) {
      assert.equal(parseGitVersion(other), null, `no other program passes the floor: ${other}`);
    }
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
    assert.deepEqual(env, { PATH: "/bin", HOME: "/h", GITX: "kept", PYTHONIOENCODING: "utf-8", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_GRAFT_FILE: "/dev/null", GIT_ALLOC_LIMIT: "256m" });
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
      assert.equal(options.maxErrorBytes, 16 * 1024, "stderr, which nobody sees, is kept small");
      assert.equal(options.lookup, "path");
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
    // HEAD: a commit whose blob is missing, as in a partial clone (only HEAD's history is served).
    const missing = fx(root, ["hash-object", "--stdin"], "lazy\n");
    const tree = (entries: string) => fx(root, ["mktree", "--missing"], entries);
    const lazyTree = tree(`040000 tree ${tree(`040000 tree ${tree(`100644 blob ${missing}\tlazy.txt\n`)}\tP\n`)}\tprojects-folder\n`);
    const lazy = fx(root, ["commit-tree", lazyTree, "-p", signed, "-m", "lazy"]);
    fx(root, ["update-ref", "refs/heads/main", lazy]);
    fx(root, ["read-tree", "main"]); // an index, which a gitlink makes show read
    // The driver, from the one attributes file Git still reads (a committed one is never read).
    writeFileSync(join(root, ".git", "info", "attributes"), "* diff=evil filter=evil merge=evil\n");
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
    assert.deepEqual(answers.slice(0, 2).map((a) => a.status), [200, 500], "the log's stat needs the missing blob");
    assert.deepEqual(answers.slice(2, 10).map((a) => a.status), [200, 200, 200, 200, 200, 200, 200, 200]);
    assert.deepEqual(answers.slice(10).map((a) => a.status), [500, 500], "the missing blob fails; nothing fetches it");
    assert.deepEqual([...new Set(answers.filter((a) => a.status === 500).map((a) => (a.body as { error: string }).error))].sort(), [
      "git log failed (exit 128)",
      "git show --numstat failed (exit 128)",
      "git show --patch failed (exit 128)",
    ]);
  });
  test("textconv, and the filters its temporary files go through (--no-textconv)", () => none("textconv", "filter-clean", "filter-smudge", "filter-process"));
  test("signature verification (--no-show-signature)", () => none("gpg", "gpg-openpgp", "gpg-ssh", "gpg-x509"));
  test("the file system monitor (--ignore-submodules=none stops the index read that would start it; core.fsmonitor=false too)", () =>
    none("fsmonitor", "hook-fsmonitor-watchman"));
  test("lazy fetch and its transport (--no-lazy-fetch, with protocol.allow=never beneath)", () => none("ssh", "uploadpack", "git-proxy", "askpass", "credential"));
  test("hooks, which only a ref update starts, as textconv's notes cache would make (--no-textconv)", () =>
    none("config-hook", "hook-reference-transaction"));
  test("external diff drivers, which log and show leave off by themselves", () => none("diff-external", "diff-command"));
  test("keys these commands never reach", () =>
    none("pager", "pager-log", "pager-show", "editor", "sequence-editor", "alias-log", "alias-show", "alternate-refs", "gc-hook", "diff-filter", "trailer", "pack-objects-hook", "merge-driver", "hook-post-index-change", "hook-pre-auto-gc", "hook-post-checkout"));
  test(".git is byte for byte unchanged after every route", () => assert.equal(unchanged, true));
});

describe("the user's environment cannot change that either", () => {
  /** A workspace repository whose info/attributes (the attributes Git still reads) selects the driver "evil". */
  function repo() {
    const root = workspace();
    init(root);
    const m = fastImport(root, [
      { mark: 1, message: "first", files: [["projects-folder/P/a.txt", "one\n"]] },
      { mark: 2, message: "second", files: [["projects-folder/P/a.txt", "one\ntwo\n"]] },
    ]);
    writeFileSync(join(root, ".git", "info", "attributes"), "* diff=evil\n");
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

/** HEAD becomes a commit adding projects-folder/P/lazy.txt, whose blob is missing (as in a partial clone). */
function missingBlobOnTop(root: string, parent: string): string {
  const missing = fx(root, ["hash-object", "--stdin"], "never written\n");
  const tree = (entries: string) => fx(root, ["mktree", "--missing"], entries);
  const top = tree(`040000 tree ${tree(`040000 tree ${tree(`100644 blob ${missing}\tlazy.txt\n`)}\tP\n`)}\tprojects-folder\n`);
  const commit = fx(root, ["commit-tree", top, "-p", parent, "-m", "lazy"]);
  fx(root, ["update-ref", "refs/heads/main", commit]);
  return commit;
}

describe("what Git reads and prints stays on the server", () => {
  test("a failure answers a fixed text; what Git printed goes to the server's log only", async () => {
    const root = workspace();
    init(root);
    const m = fastImport(root, [{ mark: 1, message: "one", files: [["projects-folder/P/a.txt", "a\n"]] }]);
    missingBlobOnTop(root, m[1]!);
    // Tokens Git echoes in its warnings, from a plain file Git reads.
    writeFileSync(join(root, ".git", "info", "attributes"), "a.txt SECRET-TOKEN-0123!\n!negated-secret-xyz\n");
    const from = LOGGED.length;
    const r = await get(handler(root), "/log", { project: P });
    assert.deepEqual([r.status, r.body], [500, { error: "git log failed (exit 128)" }]);
    const log = LOGGED.slice(from).join("\n");
    assert.match(log, /SECRET-TOKEN-0123|negated-secret-xyz/, `the log has what Git printed: ${log}`);
    assert.match(log, /^code-view git \/log log: /);
  });

  test("a plain info/grafts is not read (GIT_GRAFT_FILE): a commit keeps its parent, and no line of it is echoed", async () => {
    const root = workspace();
    init(root);
    const m = fastImport(root, [
      { mark: 1, message: "one", files: [["projects-folder/P/a.txt", "1\n"]] },
      { mark: 2, message: "two", files: [["projects-folder/P/a.txt", "1\n2\n"]] },
    ]);
    writeFileSync(join(root, ".git", "info", "grafts"), `${m[2]}\nAPI_KEY=sk-live-0123456789abcdef\n`);
    const api = handler(root);
    const commit = await body<Commit>(get(api, "/commit", { project: P, hash: m[2]! }));
    assert.deepEqual(commit.files.map((f) => [f.path, f.status, f.added]), [["a.txt", "M", 1]], "with the graft, two would be a root that adds a.txt");
    const from = LOGGED.length;
    missingBlobOnTop(root, m[2]!);
    assert.equal((await get(api, "/log", { project: P })).status, 500);
    assert.doesNotMatch(LOGGED.slice(from).join("\n"), /sk-live/, "Git never read the grafts file");
  });
});

describe("an error the file system raises", () => {
  const skip = WINDOWS ? "chmod 000 does not make a folder unreadable on Windows" : process.getuid?.() === 0 ? "root reads a folder whatever its mode" : false;
  test("a .git folder that cannot be read answers a fixed text with the error's code", { skip }, async () => {
    const root = workspace();
    init(root);
    fastImport(root, [{ mark: 1, message: "one", files: [["projects-folder/P/a.txt", "a\n"]] }]);
    const objects = join(root, ".git", "objects");
    chmodSync(objects, 0o000);
    try {
      const from = LOGGED.length;
      const r = await get(handler(root), "/", { project: P });
      assert.deepEqual([r.status, r.body], [500, { error: "the Code view could not read this repository (EACCES)" }]);
      assert.match(LOGGED.slice(from).join("\n"), /EACCES/, "the details go to the log");
    } finally {
      chmodSync(objects, 0o755);
    }
  });
});

describe("which git runs", () => {
  test("a git planted in the workspace or the project never runs, even through an empty PATH entry", { skip: NO_SCRIPTS }, async () => {
    const root = workspace();
    const own = init(join(root, "projects-folder", P));
    const m = fastImport(own, [{ mark: 1, message: "one", files: [["a.txt", "a\n"]] }]);
    const marker = join(mkdtempSync(join(tmpdir(), "os-ui-git-planted-")), "ran");
    for (const dir of [root, own]) {
      writeFileSync(join(dir, "git"), `#!/bin/sh\necho "$0 $*" >> '${marker}'\nexit 0\n`);
      chmodSync(join(dir, "git"), 0o755);
    }
    const api = handler(root, { ...cleanEnv(), PATH: `:.:${process.env.PATH}` });
    for (const [path, extra] of [["/", {}], ["/log", {}], ["/commit", { hash: m[1]! }], ["/diff", { hash: m[1]!, path: "a.txt" }]] as const) {
      assert.equal((await get(api, path, { project: P, ...extra })).status, 200, path);
    }
    assert.ok(!existsSync(marker), existsSync(marker) ? readFileSync(marker, "utf8") : "");
  });

  test("Windows: a git.exe planted in the workspace or the project never runs", { skip: WINDOWS ? false : "spawn() tries the working folder before PATH on Windows only" }, async (t) => {
    const where = join(process.env.SystemRoot ?? "C:\\Windows", "System32", "where.exe");
    if (!existsSync(where)) {
      t.skip(`no ${where} to plant`);
      return;
    }
    const root = workspace();
    const own = init(join(root, "projects-folder", P));
    const m = fastImport(own, [{ mark: 1, message: "one", files: [["a.txt", "a\n"]] }]);
    // A copy of where.exe as git.exe. Run in git's place, it prints no
    // "git version" for --version, so the probe would answer that problem,
    // and it fails git's other commands; the answers below are the signal.
    for (const target of [root, own]) copyFileSync(where, join(target, "git.exe"));
    const api = handler(root);
    assert.deepEqual(await body<Summary>(get(api, "/", { project: P })), { repo: "project", root: "projects-folder/P", filter: ".", head: { hash: m[1]!, short: m[1]!.slice(0, 7), date: "2026-09-21" } });
    assert.deepEqual((await body<Log>(get(api, "/log", { project: P }))).commits.map((c) => c.hash), [m[1]]);
  });

  test("a git that is null, or neither absolute nor a bare name, is not run", async () => {
    const root = workspace();
    init(root);
    fastImport(root, [{ mark: 1, message: "one", files: [["projects-folder/P/a.txt", "a\n"]] }]);
    for (const git of ["./git", "bin/git", "..\\git", null]) {
      const { run, calls } = fakeRunner();
      const answer = await body(get(codeGitHandler(context(root, { run }), git, logged), "/", { project: P }));
      assert.deepEqual(answer, { repo: null, problem: "git was not found; see Settings" }, String(git));
      assert.deepEqual(calls, [], String(git));
    }
  });
});

describe("bounded work", () => {
  test("a blob over 4 MiB is binary, with its sizes (core.bigFileThreshold=4m)", async () => {
    const root = workspace();
    init(root);
    const big = "a line of text\n".repeat(350_000); // 5.25 MB
    const m = fastImport(root, [{ mark: 1, message: "big", files: [["projects-folder/P/big.txt", big], ["projects-folder/P/small.txt", "s\n"]] }]);
    const api = handler(root);
    const commit = await body<Commit>(get(api, "/commit", { project: P, hash: m[1]! }));
    assert.deepEqual(commit.files.map((f) => [f.path, f.added, f.sizes]), [["big.txt", null, { old: 0, new: big.length }], ["small.txt", 1, null]]);
    assert.deepEqual(commit.stat, { files: 2, added: 1, deleted: 0 });
    assert.deepEqual((await body<Log>(get(api, "/log", { project: P }))).commits.map((c) => [c.files, c.added]), [[2, 1]]);
    assert.match((await body<Diff>(get(api, "/diff", { project: P, hash: m[1]!, path: "big.txt" }))).diff, /\nBinary files \/dev\/null and b\/big\.txt differ\n/);
  });

  test("each project gets 2 of 5 git processes and 8 of 20 requests, so two stalled projects leave a third 1 and 4; past that 503, before .git is walked", { timeout: 20_000 }, async (t) => {
    // Four projects with their own .git: P and F busy, G the third project, and R,
    // whose walk would throw (objects/ unreadable) where chmod can show it, else a gitfile.
    const root = tempTree({
      "projects-folder/P/PROJECT_MEMORY.md": "# P\n",
      "projects-folder/F/PROJECT_MEMORY.md": "# F\n",
      "projects-folder/G/PROJECT_MEMORY.md": "# G\n",
      "projects-folder/R/PROJECT_MEMORY.md": "# R\n",
    });
    for (const name of ["P", "F", "G"]) init(join(root, "projects-folder", name));
    const unreadable = !WINDOWS && process.getuid?.() !== 0;
    const rObjects = join(root, "projects-folder", "R", ".git", "objects");
    if (unreadable) {
      init(join(root, "projects-folder", "R"));
      chmodSync(rObjects, 0o000);
    } else {
      writeFileSync(join(root, "projects-folder", "R", ".git"), "gitdir: /elsewhere\n");
    }
    t.after(() => (unreadable ? chmodSync(rObjects, 0o755) : undefined));
    let open = true;
    let release: () => void = () => {};
    const gate = new Promise<void>((go) => (release = go));
    const running = new Map<string, number>();
    const most = new Map<string, number>();
    const total = () => [...running.values()].reduce((a, b) => a + b, 0);
    let onRun: () => void = () => {};
    const { run } = fakeRunner(async (call) => {
      if (call.command[1] === "--version") return ok("git version 2.55.0\n");
      const key = ["F", "G"].find((k) => call.cwd.endsWith(join("projects-folder", k))) ?? "P";
      running.set(key, (running.get(key) ?? 0) + 1);
      most.set(key, Math.max(most.get(key) ?? 0, running.get(key)!));
      onRun();
      if (!open) await gate;
      running.set(key, running.get(key)! - 1);
      return ok(call.command.includes("rev-parse") ? `${"a".repeat(40)}\n` : "");
    });
    const api = codeGitHandler(context(root, { run }), "git", logged);
    assert.equal((await get(api, "/", { project: P })).status, 200, "the probe is kept from here on");
    open = false;
    most.clear();
    // No timing: wait for counts the handler alone decides.
    /** `n` requests for `project`; `away` resolves once `expected` of them have been turned away. */
    const send = (project: string, n: number, expected: number) => {
      let left = expected;
      let done: () => void = () => {};
      const away = new Promise<void>((go) => (done = go));
      const answers = Array.from({ length: n }, () =>
        get(api, "/", { project }).then((r) => {
          if (r.status === 503 && --left === 0) done();
          return r;
        }),
      );
      return { answers, away };
    };
    const p = send(P, 25, 17);
    await p.away;
    assert.deepEqual([running.get("P"), total()], [2, 2], "P runs 2 while 6 more of its 8 wait");
    const fourRunning = new Promise<void>((go) => (onRun = () => total() === 4 && go()));
    const f = send("F", 11, 3);
    await Promise.all([fourRunning, f.away]);
    assert.deepEqual([running.get("P"), running.get("F")], [2, 2], "F runs at once beside the busy P");
    const fiveRunning = new Promise<void>((go) => (onRun = () => total() === 5 && go()));
    const g = send("G", 6, 2);
    await Promise.all([fiveRunning, g.away]);
    assert.deepEqual([running.get("P"), running.get("F"), running.get("G")], [2, 2, 1], "a third project still runs beside two busy ones");
    const refused = await get(api, "/", { project: "R" });
    assert.deepEqual([refused.status, refused.body], [503, { error: "the Code view is busy with other requests; try again" }], "20 in flight: turned away before its .git is looked at");
    release();
    const statuses = async (answers: Promise<ApiResponse>[]) => {
      const s = (await Promise.all(answers)).map((r) => r.status);
      return [s.filter((x) => x === 200).length, s.filter((x) => x === 503).length];
    };
    assert.deepEqual(await statuses(p.answers), [8, 17]);
    assert.deepEqual(await statuses(f.answers), [8, 3]);
    assert.deepEqual(await statuses(g.answers), [4, 2]);
    assert.deepEqual([most.get("P"), most.get("F"), most.get("G")], [2, 2, 1]);
    // Admitted again once the others are done, R's .git is now walked: an unreadable
    // objects/ throws there (500), which proves the 503 above came before any walk.
    const later = await get(api, "/", { project: "R" });
    if (unreadable) assert.deepEqual([later.status, later.body], [500, { error: "the Code view could not read this repository (EACCES)" }]);
    else assert.match((later.body as { problem: string }).problem, /is a file that points/);
  });
});

describe("the diff algorithm", () => {
  test("diff.algorithm=patience in the repository's config no longer breaks the allocation limit: myers is pinned", { timeout: 120_000 }, async () => {
    const root = workspace();
    init(root);
    // Two files just under 4 MiB of one- and two-byte lines: about 96 MiB in one allocation under myers, 320 MiB under patience.
    const size = 4 * 1024 * 1024 - 64;
    const m = fastImport(root, [
      { mark: 1, message: "one", files: [["projects-folder/P/data.txt", "\n".repeat(size)]] },
      { mark: 2, message: "rewrite", files: [["projects-folder/P/data.txt", "a\nb\n".repeat(Math.floor(size / 4))]] },
    ]);
    fx(root, ["config", "diff.algorithm", "patience"]);
    const api = handler(root);
    assert.equal((await get(api, "/log", { project: P })).status, 200);
    assert.equal((await get(api, "/commit", { project: P, hash: m[2]! })).status, 200);
    assert.equal((await get(api, "/diff", { project: P, hash: m[2]!, path: "data.txt" })).status, 200);
  });

  test("a driver's diff.<driver>.algorithm=patience, picked by info/attributes, cannot bring patience back either", { timeout: 120_000 }, async () => {
    const root = workspace();
    init(root);
    const size = 4 * 1024 * 1024 - 64;
    const m = fastImport(root, [
      { mark: 1, message: "one", files: [["projects-folder/P/data.txt", "\n".repeat(size)]] },
      { mark: 2, message: "rewrite", files: [["projects-folder/P/data.txt", "a\nb\n".repeat(Math.floor(size / 4))]] },
    ]);
    fx(root, ["config", "diff.x.algorithm", "patience"]);
    writeFileSync(join(root, ".git", "info", "attributes"), "* diff=x\n");
    const api = handler(root);
    const statuses = [
      (await get(api, "/log", { project: P })).status,
      (await get(api, "/commit", { project: P, hash: m[2]! })).status,
      (await get(api, "/diff", { project: P, hash: m[2]!, path: "data.txt" })).status,
    ];
    assert.deepEqual(statuses, [200, 200, 200]);
  });
});

describe("which commit a hash names", () => {
  test("a tag named like a commit's full hash does not change which commit answers", async () => {
    const root = workspace();
    init(root);
    const m = fastImport(root, [
      { mark: 1, message: "first", files: [["projects-folder/P/a.txt", "1\n"]] },
      { mark: 2, message: "second", files: [["projects-folder/P/a.txt", "1\n2\n"]] },
    ]);
    fx(root, ["tag", m[1]!, m[2]!]);
    const commit = await body<Commit>(get(handler(root), "/commit", { project: P, hash: m[1]! }));
    assert.deepEqual([commit.hash, commit.subject], [m[1], "first"]);
  });

  test("a repository Git cannot read is a failure (500) on /commit, not a missing commit; an unknown hash stays 404", async () => {
    const root = workspace();
    init(root);
    const m = fastImport(root, [{ mark: 1, message: "one", files: [["projects-folder/P/a.txt", "a\n"]] }]);
    const api = handler(root);
    assert.deepEqual((await get(api, "/commit", { project: P, hash: NO_SUCH })).status, 404);
    const bad = join(tempTree(), "inc");
    writeFileSync(bad, "not config\n");
    fx(root, ["config", "include.path", bad]);
    const r = await get(api, "/commit", { project: P, hash: m[1]! });
    assert.deepEqual([r.status, r.body], [500, { error: "git cat-file --batch-check failed (exit 128)" }]);
    const d = await get(api, "/diff", { project: P, hash: m[1]!, path: "a.txt" });
    assert.deepEqual([d.status, d.body], [500, { error: "git cat-file --batch-check failed (exit 128)" }]);
  });

  test("a commit lookup that times out is a failure (500), not a missing commit", async () => {
    const root = workspace();
    init(root);
    const { run } = fakeRunner((call) =>
      call.command[1] === "--version" ? ok("git version 2.55.0\n") : { code: -1, stdout: "", stderr: "\n[timed out after 10 s]", timedOut: true },
    );
    const r = await get(codeGitHandler(context(root, { run }), "git", logged), "/commit", { project: P, hash: NO_SUCH });
    assert.deepEqual([r.status, r.body], [500, { error: "git cat-file --batch-check took longer than 10 s" }]);
  });

  test("a hash naming something other than a commit is 404 with a fixed text, though Git says why", async () => {
    const root = workspace();
    init(root);
    const m = fastImport(root, [{ mark: 1, message: "first", files: [["projects-folder/P/a.txt", "1\n"]] }]);
    const tree = fx(root, ["rev-parse", `${m[1]}^{tree}`]);
    const r = await get(handler(root), "/commit", { project: P, hash: tree });
    assert.deepEqual([r.status, r.body], [404, { error: `no commit ${tree}` }]);
  });

  test("only HEAD's history: a commit on another branch, or one reset away, is 404", async () => {
    const root = workspace();
    init(root);
    const m = fastImport(root, [
      { mark: 1, message: "first", files: [["projects-folder/P/a.txt", "1\n"]] },
      { mark: 2, message: "on a side branch", ref: "refs/heads/side", from: 1, files: [["projects-folder/P/b.txt", "b\n"]] },
      { mark: 3, message: "reset away", ref: "refs/heads/gone", from: 1, files: [["projects-folder/P/c.txt", "c\n"]] },
    ]);
    fx(root, ["update-ref", "-d", "refs/heads/gone"]);
    const api = handler(root);
    for (const [mark, path] of [[2, "b.txt"], [3, "c.txt"]] as const) {
      assert.equal((await get(api, "/commit", { project: P, hash: m[mark]! })).status, 404, `commit ${mark}`);
      assert.equal((await get(api, "/diff", { project: P, hash: m[mark]!, path })).status, 404, `diff ${mark}`);
    }
    assert.equal((await get(api, "/commit", { project: P, hash: m[1]! })).status, 200);
  });
});

describe("odd but legal repositories", () => {
  test("warnings that overflow stderr's cap are not cut output (info/attributes of 20,000 bad lines)", async () => {
    const root = workspace();
    init(root);
    const m = fastImport(root, [
      { mark: 1, message: "one", files: [["projects-folder/P/a.txt", "1\n"]] },
      { mark: 2, message: "two", files: [["projects-folder/P/a.txt", "1\n2\n"]] },
    ]);
    writeFileSync(join(root, ".git", "info", "attributes"), Array.from({ length: 20_000 }, (_, i) => `a.txt bad-${i}! !x\n`).join(""));
    const api = handler(root);
    assert.equal((await body<Summary>(get(api, "/", { project: P }))).head?.hash, m[2]);
    assert.deepEqual((await body<Log>(get(api, "/log", { project: P }))).commits.map((c) => c.subject), ["two", "one"]);
    assert.deepEqual((await body<Commit>(get(api, "/commit", { project: P, hash: m[2]! }))).files.map((f) => f.path), ["a.txt"]);
    assert.match((await body<Diff>(get(api, "/diff", { project: P, hash: m[2]!, path: "a.txt" }))).diff, /\n\+2\n/);
  });

  test("file names that start with a newline", { skip: NO_ODD_NAMES }, async () => {
    const root = workspace();
    init(root);
    const m = fastImport(root, [{ mark: 1, message: "odd", files: [["projects-folder/P/\nlead.txt", "n\n"], ["projects-folder/P/x", "plain x\n"], ["projects-folder/P/\nx", "newline x\n"]] }]);
    const api = handler(root);
    const commit = await body<Commit>(get(api, "/commit", { project: P, hash: m[1]! }));
    assert.deepEqual(commit.files.map((f) => f.path), ["\nlead.txt", "\nx", "x"]);
    const diff = await body<Diff>(get(api, "/diff", { project: P, hash: m[1]!, path: "x" }));
    assert.match(diff.diff, /\n\+plain x\n/);
    assert.doesNotMatch(diff.diff, /newline x/);
  });

  test("core.abbrev does not change `short`, which is the first 7 digits", async () => {
    const root = workspace();
    init(root);
    const m = fastImport(root, [{ mark: 1, message: "one", files: [["projects-folder/P/a.txt", "1\n"]] }]);
    for (const abbrev of ["4", "40"]) {
      fx(root, ["config", "core.abbrev", abbrev]);
      const api = handler(root);
      const short = m[1]!.slice(0, 7);
      assert.equal((await body<Summary>(get(api, "/", { project: P }))).head?.short, short, abbrev);
      assert.equal((await body<Log>(get(api, "/log", { project: P }))).commits[0]!.short, short, abbrev);
      assert.equal((await body<Commit>(get(api, "/commit", { project: P, hash: m[1]! }))).short, short, abbrev);
    }
  });

  test("a project named in another case than its folder is 404, not another Git path", async () => {
    const root = workspace();
    init(root);
    fastImport(root, [
      { mark: 1, message: "inside P", files: [["projects-folder/P/a.txt", "a\n"]] },
      { mark: 2, message: "lower-case p in Git only", files: [["projects-folder/p/secret.txt", "s\n"]] },
    ]);
    assert.equal((await get(handler(root), "/log", { project: "p" })).status, 404);
  });
});

describe("protocol.allow=never under --no-lazy-fetch", { skip: NO_SCRIPTS }, () => {
  test("a fetch that starts anyway runs no transport (the guards with --no-lazy-fetch taken out)", () => {
    const root = workspace();
    init(root);
    const m = fastImport(root, [{ mark: 1, message: "one", files: [["projects-folder/P/a.txt", "a\n"]] }]);
    const lazy = missingBlobOnTop(root, m[1]!);
    const markers = join(mkdtempSync(join(tmpdir(), "os-ui-git-proto-")), "markers");
    mkdirSync(markers);
    const config: [string, string][] = [
      ["core.repositoryformatversion", "1"],
      ["extensions.partialClone", "origin"],
      ["remote.origin.url", "ssh://example.invalid/repo"],
      ["remote.origin.promisor", "true"],
      ["core.sshCommand", markerScript(markers, "ssh")],
    ];
    for (const [key, value] of config) fx(root, ["config", key, value]);
    const gitDir = join(root, ".git");
    const blob = fx(root, ["rev-parse", `${lazy}:projects-folder/P/lazy.txt`]);
    const catFile = (drop: string[]) => {
      const args = guardArgs(gitDir, root).filter((a, i, all) => !drop.includes(a) && !(a === "-c" && drop.includes(all[i + 1]!)));
      spawnSync("git", [...args, "cat-file", "-p", blob], { cwd: root, env: gitEnv(cleanEnv()), encoding: "utf8" });
      return readdirSync(markers);
    };
    assert.deepEqual(catFile(["--no-lazy-fetch"]), [], "protocol.allow=never alone stops the ssh command");
    assert.deepEqual(catFile(["--no-lazy-fetch", "protocol.allow=never"]), ["ssh"], "without both, the fetch runs it (the hazard is real)");
  });
});

/** Writes a commit object of about `bytes` (a short header, then repeated text), streamed to git, never held in this process. */
function bigCommit(root: string, parent: string, bytes: number): Promise<string> {
  return new Promise((done, fail) => {
    const child = spawn("git", ["hash-object", "-t", "commit", "-w", "--stdin", "--literally"], { cwd: root, env: FIXTURE_ENV });
    let out = "";
    child.stdout.on("data", (d: Buffer) => (out += d.toString()));
    child.on("error", fail);
    child.on("close", (code) => (code === 0 ? done(out.trim()) : fail(new Error(`hash-object exited ${code}`))));
    const tree = fx(root, ["rev-parse", `${parent}^{tree}`]);
    child.stdin.write(`tree ${tree}\nparent ${parent}\nauthor A U Thor <author@example.com> 1790000000 +0000\ncommitter A U Thor <author@example.com> 1790000000 +0000\n\nhuge\n\n`);
    const chunk = Buffer.from("a line of the message\n".repeat(50_000));
    let left = bytes;
    const pump = () => {
      while (left > 0) {
        const piece = left >= chunk.length ? chunk : chunk.subarray(0, left);
        left -= piece.length;
        if (!child.stdin.write(piece)) return void child.stdin.once("drain", pump);
      }
      child.stdin.end();
    };
    pump();
  });
}

describe("what Git looks up by name, which git it starts, and what it loads whole", () => {
  test("a FIFO in .git named like HEAD's full hash is never opened (core.warnAmbiguousRefs=false)", { skip: WINDOWS ? "Windows has no FIFOs in the file system" : false, timeout: 90_000 }, async () => {
    const root = workspace();
    init(root);
    const m = fastImport(root, [
      { mark: 1, message: "one", files: [["projects-folder/P/a.txt", "1\n"]] },
      { mark: 2, message: "two", files: [["projects-folder/P/a.txt", "1\n2\n"]] },
    ]);
    for (const hash of [m[1]!, m[2]!]) assert.equal(spawnSync("mkfifo", [join(root, ".git", hash)]).status, 0);
    const api = handler(root);
    for (const [path, extra] of [["/", {}], ["/log", {}], ["/commit", { hash: m[1]! }], ["/diff", { hash: m[2]!, path: "a.txt" }]] as const) {
      const r = await get(api, path, { project: P, ...extra });
      assert.equal(r.status, 200, `${path}: ${JSON.stringify(r.body)}`);
    }
  });

  test("a commit object over GIT_ALLOC_LIMIT (256m) fails with the fixed text instead of being loaded", { timeout: 120_000 }, async () => {
    const root = workspace();
    init(root);
    const m = fastImport(root, [{ mark: 1, message: "one", files: [["projects-folder/P/a.txt", "1\n"]] }]);
    const huge = await bigCommit(root, m[1]!, 270_000_000);
    fx(root, ["update-ref", "refs/heads/main", huge]);
    const from = LOGGED.length;
    const api = handler(root);
    const r = await get(api, "/", { project: P });
    assert.deepEqual([r.status, r.body], [500, { error: "git rev-parse HEAD failed (exit 128)" }]);
    assert.match(LOGGED.slice(from).join("\n"), /over limit/, "Git stopped at the allocation limit");
    const c = await get(api, "/commit", { project: P, hash: huge });
    assert.deepEqual([c.status, c.body], [500, { error: "git rev-parse HEAD failed (exit 128)" }], "a failure, not a missing commit: the hash is looked up by its header (cat-file --batch-check)");
  });

  test("a git in an absolute PATH entry inside the workspace, or linked into it from outside, never runs", { skip: NO_SCRIPTS }, async () => {
    const root = workspace();
    const own = init(join(root, "projects-folder", P));
    fastImport(own, [{ mark: 1, message: "one", files: [["a.txt", "a\n"]] }]);
    const marker = join(mkdtempSync(join(tmpdir(), "os-ui-git-planted-")), "ran");
    const bin = join(root, "node_modules", ".bin");
    mkdirSync(bin, { recursive: true });
    writeFileSync(join(bin, "git"), `#!/bin/sh\necho "$0 $*" >> '${marker}'\nexit 0\n`);
    chmodSync(join(bin, "git"), 0o755);
    const links = mkdtempSync(join(tmpdir(), "os-ui-git-links-"));
    symlinkSync(join(bin, "git"), join(links, "git"));
    // As `npm run` puts <workspace>/node_modules/.bin first, with a trailing slash.
    for (const PATH of [`${bin}/:${process.env.PATH}`, `${links}:${process.env.PATH}`]) {
      const api = handler(root, { ...cleanEnv(), PATH });
      assert.equal((await get(api, "/", { project: P })).status, 200, PATH.slice(0, 80));
      assert.equal((await get(api, "/log", { project: P })).status, 200);
    }
    const absolute = await body(get(handler(root, cleanEnv(), join(bin, "git")), "/", { project: P }));
    assert.deepEqual(absolute, { repo: null, problem: "git was not found; see Settings" }, "an absolute git inside the workspace is refused too");
    assert.ok(!existsSync(marker), existsSync(marker) ? readFileSync(marker, "utf8") : "");
  });

  test("objects/pack/multi-pack-index.d/ of plain files is accepted; a link in it is refused", (t) => {
    const repo = init(mkdtempSync(join(tmpdir(), "os-ui-git-midx-")));
    const gitDir = join(repo, ".git");
    const layers = join(gitDir, "objects", "pack", "multi-pack-index.d");
    mkdirSync(layers, { recursive: true });
    writeFileSync(join(layers, "multi-pack-index-chain"), "");
    assert.equal(refusal(gitDir, lstatSync(gitDir), ".git"), null);
    try {
      symlinkSync(join(gitDir, "HEAD"), join(layers, "multi-pack-index-1.midx"));
    } catch (error) {
      t.skip(`cannot create a link here: ${(error as Error).message}`);
      return;
    }
    assert.match(refusal(gitDir, lstatSync(gitDir), ".git") ?? "", /has objects\/pack\/multi-pack-index\.d\/multi-pack-index-1\.midx, which is not a plain file/);
  });
});
