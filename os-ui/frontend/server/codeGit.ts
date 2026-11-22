import { lstatSync, readdirSync, realpathSync } from "node:fs";
import type { Stats } from "node:fs";
import { devNull } from "node:os";
import { join, sep } from "node:path";
import { resolveCwd } from "./chat.ts";
import { safeDecodedRelative } from "./manifest.ts";
import { errorText, failureText } from "./process.ts";
import type { HandlerFactory } from "./registry.ts";
import { json } from "./types.ts";
import type { ApiContext, ApiHandler, ApiResponse, RunResult } from "./types.ts";

/**
 * The Code view's Git data (os-ui/PLUGINS.md, Part 2, Gap 1): one project's
 * history, read-only, for the "Changes" pane. Not mounted yet: S6a-2 adds the
 * code-view plugin that declares it and mounts it at /api/code-view/git on
 * app://code-view.
 *
 * GET /        ?project              Summary: which repository, and the last commit touching the project
 * GET /log     ?project&skip         Log: 50 commits from `skip`, newest first, merges left out
 * GET /commit  ?project&hash         Commit: its message and the files it changes in the project
 * GET /diff    ?project&hash&path    Diff: what `git show <hash> -- <path>` prints for one file
 *
 * The query string is untrusted, and so is the repository: a workspace can be
 * a copied folder or written by an agent, so its .git (layout and config) and
 * the user's environment may be hostile or just unusual. Two properties hold
 * whatever they say, each pinned by codeGit.test.ts:
 *
 * 1. Only git runs, with no network. Git is run as an argument list (no
 *    shell) with the guards below; the table at the end of this file accounts
 *    for every `git help config` key that names a command, program, helper,
 *    hook, filter, or driver.
 * 2. Read-only and confined. The repository is a plain .git folder inside the
 *    workspace that keeps its objects to itself (`refusal`), every diff
 *    compares two committed trees, nothing in the working tree is read
 *    (attributes come from the commit; .mailmap and .gitmodules are not
 *    opened), and no command writes to .git.
 */

export interface Source {
  /** Which repository the answer comes from: the project's own .git, or the workspace's. */
  repo: "project" | "workspace";
  /** That repository's top, relative to the workspace: "projects-folder/<name>", or "" for the workspace. */
  root: string;
  /** The path filter every command uses, relative to `root`: "." or "projects-folder/<name>". File paths in answers are always relative to the project folder. */
  filter: string;
}

/** No repository to read (no `problem`), or one that cannot be read, or no usable git (`problem` says why). Status 200. */
export interface Unavailable {
  repo: null;
  problem?: string;
}

export interface Summary extends Source {
  /** The newest commit reachable from HEAD that changes something under `filter`, merges left out as in Log; null when there is none. */
  head: { hash: string; short: string; date: string } | null;
}

export interface LogCommit {
  hash: string;
  short: string;
  /** Committer date, YYYY-MM-DD. */
  date: string;
  subject: string;
  /** Under the filter only: "9 files in this project · +350 −135". A binary file counts as a file with no lines. */
  files: number;
  added: number;
  deleted: number;
}

export interface Log extends Source {
  commits: LogCommit[];
  /** Whether a request with `skip` + commits.length may find more. */
  more: boolean;
}

export interface FileChange {
  /** Relative to the project folder. Invalid UTF-8 in a name arrives as U+FFFD. */
  path: string;
  /** A added, D deleted, M modified, T type changed. Renames are never detected: a moved file is a D and an A. */
  status: string;
  /** null for a binary file. */
  added: number | null;
  deleted: number | null;
  /** A binary file's blob sizes in bytes, 0 for the side that does not exist ("Bin 0 → 140601 bytes"); null for a text file, or when a blob is missing. */
  sizes: { old: number; new: number } | null;
  /** Whether /diff opens it: false for a segment starting with ".", a name safeDecodedRelative refuses, over 1,000 characters, or with U+FFFD. */
  openable: boolean;
}

export interface Commit extends Source {
  hash: string;
  short: string;
  date: string;
  author: string;
  subject: string;
  body: string;
  /** In git's order; cut at the cap when `truncated`. A merge is compared with its first parent. */
  files: FileChange[];
  /** "9 files changed, 350 insertions(+), 135 deletions(−)": exact even when `files` is cut. */
  stat: { files: number; added: number; deleted: number };
  /** The file list, or the message past 64 KiB, was cut at its cap. */
  truncated: boolean;
}

export interface Diff extends Source {
  hash: string;
  path: string;
  /** The patch text, `diff --git a/<path> b/<path>` onwards, cut back to a whole line when `truncated`. */
  diff: string;
  truncated: boolean;
}

/** Git 2.45.0 added --no-lazy-fetch (Documentation/RelNotes/2.45.0); every other option used here is older. */
export const MIN_GIT = [2, 45] as const;

const NAME = /^[A-Za-z][A-Za-z0-9_-]*$/; // a project folder name, as chat.ts's PROJECT_DIR
const HASH = /^[0-9a-f]{7,64}$/;
const FULL = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const SKIP = /^(?:0|[1-9][0-9]{0,4})$/;
const MAX_SKIP = 10_000;
const MAX_PATH = 1000;
const PAGE = 50;
const TIMEOUT_MS = 10_000;
const KIB = 1024;
const CAP = { line: 4 * KIB, log: 256 * KIB, list: 512 * KIB, message: 64 * KIB, diff: 1024 * KIB };
const SHORTSTAT = /^ (\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?$/;
const RAW = /^:(\d{6}) (\d{6}) ([0-9a-f]+) ([0-9a-f]+) ([A-Z])\d*$/;
const NUMSTAT = /^(\d+|-)\t(\d+|-)\t/;

/**
 * Before the subcommand, on every git call.
 * - --git-dir, --work-tree: no discovery, so an unusable .git is an error
 *   rather than a step up to a repository above it, and core.worktree is
 *   overridden.
 * - --no-lazy-fetch: a partial clone's missing object fails instead of
 *   starting a fetch, which is where every transport setting (ssh commands,
 *   remote helpers, credential helpers, proxies) and the fetch's own hooks
 *   would run.
 * - --no-replace-objects: a commit shows its own content, not a replacement's.
 * - --no-optional-locks: the documented switch for readers in the background.
 * - --literal-pathspecs: a path is a path; no globs, no magic.
 * - core.fsmonitor=false: a gitlink made show read the index, which started
 *   the configured monitor; --ignore-submodules=none (below) stops that read,
 *   so this one is kept for a Git that reads the index some other way.
 * - core.attributesFile=<null device>: no attributes from a file the
 *   repository's config names anywhere (a FIFO there stalls every command).
 * - core.quotePath=false: names in diff headers stay readable.
 * Per command, --attr-source=<commit> reads .gitattributes from the commit
 * instead of the working tree.
 */
function guardArgs(gitDir: string, top: string): string[] {
  return [
    `--git-dir=${gitDir}`,
    `--work-tree=${top}`,
    "--no-lazy-fetch",
    "--no-replace-objects",
    "--no-optional-locks",
    "--literal-pathspecs",
    "-c",
    "core.fsmonitor=false",
    "-c",
    `core.attributesFile=${devNull}`,
    "-c",
    "core.quotePath=false",
  ];
}

/** For every log and show: which programs they may start and the shape of what they print. */
const HISTORY = [
  "--no-show-signature", // log.showSignature would run gpg.program on a signed commit
  "--no-ext-diff", // log and show leave external diff off unless --ext-diff; kept as stated intent
  "--no-textconv", // diff.<driver>.textconv, and the filters its temporary files go through
  "--submodule=short", // diff.submodule=log|diff would read the submodule's repository in the working tree
  "--ignore-submodules=none", // else the working tree's .gitmodules is read, and its `ignore` (or diff.ignoreSubmodules) hides gitlink changes
  "--no-use-mailmap", // %an is printed, but log.mailmap still reads .mailmap and mailmap.file (a FIFO there stalls every command)
  `-O${devNull}`, // diff.orderFile names a file anywhere; a missing one fails every diff, a FIFO stalls it
  "--no-follow", // log.follow would follow a path out of the project (a file once renamed to the project's name)
  "--no-renames", // a moved file is a deletion and an addition, so -z output has one path per entry
  "--diff-merges=first-parent", // a merge is compared with its first parent, in the plain raw format
  "--root", // log.showRoot=false would hide a root commit's changes
  "--encoding=UTF-8", // i18n.logOutputEncoding would re-encode messages
  "--no-color", // color.ui=always would put escapes in the patch
  "--src-prefix=a/", // diff.noprefix and diff.mnemonicPrefix would change the patch headers
  "--dst-prefix=b/",
];

/**
 * The child's environment: the runner's own (PATH, HOME, ...) without any
 * GIT_* variable (GIT_DIR, GIT_EXTERNAL_DIFF, GIT_CONFIG_*, GIT_TRACE*,
 * GIT_ALTERNATE_OBJECT_DIRECTORIES, ...), case-insensitively as Windows
 * names them, and with the user's global and the system configuration not
 * read. trace2.*Target there writes trace files (Git 2.55 honoured it from
 * ~/.gitconfig and $XDG_CONFIG_HOME/git/config, not from the repository's
 * config, GIT_CONFIG_COUNT or GIT_CONFIG_PARAMETERS); every other key there
 * the repository's own config could set as well, so the guards above cover
 * it. The null device is the documented way to skip GIT_CONFIG_GLOBAL.
 */
export function gitEnv(inherited: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(inherited)) {
    if (!/^git_/i.test(key)) env[key] = value;
  }
  env.GIT_CONFIG_NOSYSTEM = "1";
  env.GIT_CONFIG_GLOBAL = devNull;
  return env;
}

/** "git version 2.47.1.windows.2" → [2, 47, 1]. */
export function parseGitVersion(text: string): [number, number, number] | null {
  const m = /(\d+)\.(\d+)(?:\.(\d+))?/.exec(text);
  return m === null ? null : [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
}

/** Whether a path from a commit may be opened with /diff (see FileChange.openable). */
export function openable(path: string): boolean {
  return (
    path !== "" &&
    path.length <= MAX_PATH &&
    safeDecodedRelative(path) === path &&
    !path.split("/").some((s) => s.startsWith(".")) &&
    !path.includes("�")
  );
}

/** An answer decided before the end of a route. */
class Answer extends Error {
  readonly response: ApiResponse;
  constructor(response: ApiResponse) {
    super(String((response.body as { error?: string }).error ?? response.status));
    this.response = response;
  }
}

function refuse(status: number, error: string): never {
  throw new Answer(json(status, { error }));
}

function one(query: URLSearchParams, name: string, required = true): string | null {
  const values = query.getAll(name);
  if (values.length > 1) refuse(400, `${name} is given more than once`);
  if (values.length === 0) {
    if (required) refuse(400, `${name} is missing`);
    return null;
  }
  return values[0]!;
}

const quoted = (text: string) => JSON.stringify(text.length > 100 ? `${text.slice(0, 100)}…` : text);

function lstatOrNull(path: string): Stats | null {
  try {
    return lstatSync(path);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return null;
    throw error;
  }
}

/**
 * Why the repository at `gitDir` is not read, or null. It must be a plain
 * folder (not a link, and not a gitfile, which a linked worktree or a
 * submodule checkout uses to point elsewhere), with no link directly inside
 * it (objects, refs, config, HEAD, ...), no commondir (a linked worktree's
 * shared repository), and an object store of its own: no link among
 * objects/<xx>, objects/pack, or objects/info entries, and no
 * objects/info/alternates. Loose object files are not looked at one by one.
 * Lifting a refusal later means resolving the target and allowing it when
 * its real path lies inside the workspace.
 */
function refusal(gitDir: string, stat: Stats, label: string): string | null {
  const why = (text: string) => `${label} ${text}; the Code view reads only a .git folder inside the workspace that keeps its objects to itself`;
  if (stat.isSymbolicLink()) return why("is a link");
  if (stat.isFile()) return why('is a file that points to a repository elsewhere ("gitdir:", as a linked worktree or a submodule checkout has)');
  if (!stat.isDirectory()) return why("is not a folder");
  for (const entry of readdirSync(gitDir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) return why(`has a link, ${entry.name}`);
  }
  if (lstatOrNull(join(gitDir, "commondir")) !== null) return why("shares another repository's objects and refs (commondir, as a linked worktree has)");
  const objects = join(gitDir, "objects");
  if (lstatOrNull(objects)?.isDirectory() !== true) return why("has no objects folder");
  for (const dir of [objects, join(objects, "pack"), join(objects, "info")]) {
    if (lstatOrNull(dir) === null) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) return why(`has a link, ${join(dir, entry.name).slice(gitDir.length + 1).replace(/\\/g, "/")}`);
    }
  }
  if (lstatOrNull(join(objects, "info", "alternates")) !== null) return why("borrows objects from another repository (objects/info/alternates)");
  return null;
}

interface Repo extends Source {
  gitDir: string;
  /** Where git runs, the working tree's top. */
  top: string;
  /** For the workspace's repository: --relative=projects-folder/<name>/. */
  relative: string | null;
}

/** The repository table in Part 2: the project's own .git, else the workspace's, else none; never Git's discovery. */
function chooseRepo(workspace: string, project: string, name: string): Repo | Unavailable {
  const own = join(project, ".git");
  const ownStat = lstatOrNull(own);
  if (ownStat !== null) {
    const problem = refusal(own, ownStat, `projects-folder/${name}/.git`);
    if (problem !== null) return { repo: null, problem };
    return { repo: "project", root: `projects-folder/${name}`, filter: ".", gitDir: own, top: project, relative: null };
  }
  const shared = join(workspace, ".git");
  const sharedStat = lstatOrNull(shared);
  if (sharedStat === null) return { repo: null };
  const problem = refusal(shared, sharedStat, ".git");
  if (problem !== null) return { repo: null, problem };
  const filter = `projects-folder/${name}`;
  return { repo: "workspace", root: "", filter, gitDir: shared, top: workspace, relative: `${filter}/` };
}

function parseShortstat(line: string): { files: number; added: number; deleted: number } | null {
  const m = SHORTSTAT.exec(line);
  return m === null ? null : { files: Number(m[1]), added: Number(m[2] ?? 0), deleted: Number(m[3] ?? 0) };
}

/**
 * `log --format=%x1e%H%x1f%h%x1f%cs%x1f%s --shortstat`: a record is a line
 * starting with 0x1e, then its stat line. %s never holds a newline, so a
 * subject holding 0x1e or 0x1f stays inside its own line, and the subject is
 * the rest of that line after the third 0x1f.
 */
function parseLog(text: string): LogCommit[] {
  const commits: LogCommit[] = [];
  for (const line of text.split("\n")) {
    if (line.startsWith("\x1e")) {
      const fields = line.slice(1).split("\x1f");
      commits.push({
        hash: fields[0] ?? "",
        short: fields[1] ?? "",
        date: fields[2] ?? "",
        subject: fields.slice(3).join("\x1f"),
        files: 0,
        added: 0,
        deleted: 0,
      });
      continue;
    }
    const stat = parseShortstat(line);
    const last = commits[commits.length - 1];
    if (stat !== null && last !== undefined) Object.assign(last, stat);
  }
  return commits;
}

/** NUL-terminated tokens; whatever follows the last NUL is a token the cap cut, and is dropped. */
function tokens(text: string): string[] {
  const all = text.split("\0");
  all.pop();
  return all.map((t) => t.replace(/^\n+/, ""));
}

function unexpected(what: string): never {
  return refuse(500, `unexpected output from git ${what}`);
}

/** `show --raw --no-abbrev -z`: ":<mode> <mode> <old id> <new id> <status>", NUL, path, NUL. */
function parseRaw(text: string): { path: string; status: string; oldId: string; newId: string }[] {
  const list = tokens(text);
  const out = [];
  for (let i = 0; i + 1 < list.length; i += 2) {
    const m = RAW.exec(list[i]!) ?? unexpected("show --raw");
    out.push({ status: m[5]!, oldId: m[3]!, newId: m[4]!, path: list[i + 1]! });
  }
  return out;
}

/** `show --numstat -z`: "<added>\t<deleted>\t<path>", NUL; "-" for a binary file. */
function parseNumstat(text: string): { path: string; added: number | null; deleted: number | null }[] {
  return tokens(text).map((token) => {
    const m = NUMSTAT.exec(token) ?? unexpected("show --numstat");
    const count = (v: string) => (v === "-" ? null : Number(v));
    return { added: count(m[1]!), deleted: count(m[2]!), path: token.slice(m[0].length) };
  });
}

/** The handler, with the git program to run (S6a-2 may pass the path Settings found). */
export function codeGitHandler(ctx: ApiContext, git = "git"): ApiHandler {
  let ready: Promise<string | null> | null = null;

  /** null when git can run with every guard, else the problem to show. */
  async function probe(): Promise<string | null> {
    let result: RunResult;
    try {
      result = await ctx.run([git, "--version"], { cwd: ctx.repoRoot, env: gitEnv, timeoutMs: TIMEOUT_MS, maxOutputBytes: CAP.line });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return "git was not found; see Settings";
      return `git could not start (${errorText(error, 200)}); see Settings`;
    }
    const version = result.code === 0 ? parseGitVersion(result.stdout) : null;
    if (version === null) return `git --version gave no version (${failureText(result, 200)}); see Settings`;
    const [major, minor] = version;
    if (major < MIN_GIT[0] || (major === MIN_GIT[0] && minor < MIN_GIT[1])) {
      return `Git ${version.join(".")} is too old for the Code view, which needs Git ${MIN_GIT.join(".")} or later; see Settings`;
    }
    return null;
  }

  /** A failed probe is not kept, so installing git and asking again works. */
  async function gitProblem(): Promise<string | null> {
    ready ??= probe();
    const problem = await ready;
    if (problem !== null) ready = null;
    return problem;
  }

  return async (req) => withoutWorkspace(await answer(req), ctx.repoRoot);

  async function answer(req: Parameters<ApiHandler>[0]): Promise<ApiResponse> {
    try {
      if (req.method !== "GET") return json(405, { error: "GET only" });
      if (!["/", "/log", "/commit", "/diff"].includes(req.path)) return json(404, { error: `no endpoint ${req.path}` });

      const name = one(req.query, "project")!;
      if (!NAME.test(name)) refuse(400, `bad project name ${quoted(name)}`);
      const skipText = req.path === "/log" ? one(req.query, "skip", false) : null;
      if (skipText !== null && (!SKIP.test(skipText) || Number(skipText) > MAX_SKIP)) refuse(400, "skip must be a whole number from 0 to 10000");
      const skip = Number(skipText ?? 0);
      const hash = req.path === "/commit" || req.path === "/diff" ? one(req.query, "hash")! : null;
      if (hash !== null && !HASH.test(hash)) refuse(400, "hash must be 7 to 64 lower-case hexadecimal digits");
      const path = req.path === "/diff" ? one(req.query, "path")! : null;
      if (path !== null && path.split("/").some((s) => s.startsWith("."))) refuse(400, 'a path with a segment starting with "." cannot be opened');
      if (path !== null && !openable(path)) refuse(400, `bad path ${quoted(path)}`);

      // A registered project whose real folder lies inside the workspace's projects-folder.
      const cwd = resolveCwd(ctx.repoRoot, `projects-folder/${name}`);
      if (cwd === null) refuse(404, `no registered project ${name}`);
      const workspace = realpathSync.native(ctx.repoRoot);
      const project = realpathSync.native(cwd);
      if (!project.startsWith(join(workspace, "projects-folder") + sep)) refuse(404, `projects-folder/${name} lies outside projects-folder`);

      const chosen = chooseRepo(workspace, project, name);
      if (chosen.repo === null) return json(200, chosen);
      const problem = await gitProblem();
      if (problem !== null) return json(200, { repo: null, problem } satisfies Unavailable);
      const repo = chosen;
      const source: Source = { repo: repo.repo, root: repo.root, filter: repo.filter };

      const guards = guardArgs(repo.gitDir, repo.top);
      const run = (args: string[], cap: number, attrSource?: string, input?: string): Promise<RunResult> =>
        ctx.run([git, ...guards, ...(attrSource === undefined ? [] : [`--attr-source=${attrSource}`]), ...args], {
          cwd: repo.top,
          env: gitEnv,
          timeoutMs: TIMEOUT_MS,
          maxOutputBytes: cap,
          input,
        });
      const must = (result: RunResult): RunResult => {
        if (!result.truncated && result.code !== 0) refuse(500, failureText(result));
        return result;
      };
      const fullHash = (result: RunResult): string => {
        const full = result.stdout.trim();
        return FULL.test(full) ? full : unexpected("rev-parse");
      };
      /** HEAD's commit, or null on an unborn branch (a repository with no commits yet). */
      const head = async (): Promise<string | null> => {
        const result = await run(["rev-parse", "--verify", "--quiet", "HEAD^{commit}"], CAP.line);
        if (result.code === 1 && result.stdout.trim() === "") return null;
        return fullHash(must(result));
      };
      /** The full hash of a commit named by `hash`, else 404. */
      const resolve = async (short: string): Promise<string> => {
        const result = await run(["rev-parse", "--verify", "--quiet", `${short}^{commit}`], CAP.line);
        if (result.code !== 0 || result.truncated) refuse(404, `no commit ${short}${result.stderr.trim() ? ` (${result.stderr.trim().slice(0, 200)})` : ""}`);
        return fullHash(result);
      };
      const relative = repo.relative === null ? [] : [`--relative=${repo.relative}`];

      if (req.path === "/") {
        const tip = await head();
        if (tip === null) return json(200, { ...source, head: null } satisfies Summary);
        const result = must(await run(["log", "--no-merges", "--max-count=1", "--format=%H%x1f%h%x1f%cs", ...HISTORY, tip, "--", repo.filter], CAP.line));
        const [full = "", short = "", date = ""] = (result.stdout.split("\n")[0] ?? "").split("\x1f");
        return json(200, { ...source, head: full === "" ? null : { hash: full, short, date } } satisfies Summary);
      }

      if (req.path === "/log") {
        const tip = await head();
        if (tip === null) return json(200, { ...source, commits: [], more: false } satisfies Log);
        const args = ["log", "--no-merges", `--max-count=${PAGE + 1}`, `--skip=${skip}`, "--format=%x1e%H%x1f%h%x1f%cs%x1f%s", "--shortstat"];
        const result = must(await run([...args, ...HISTORY, tip, "--", repo.filter], CAP.log, tip));
        const commits = parseLog(result.stdout);
        let more = commits.length > PAGE;
        if (result.truncated) {
          commits.pop(); // the record the cap cut, whose stat line may be missing
          more = true;
          if (commits.length === 0) refuse(500, `the commit after the first ${skip} is larger than the ${CAP.log / KIB} KiB cap`);
        }
        const page = commits.slice(0, PAGE);
        // The next skip would be refused past 10000, so the list ends there.
        return json(200, { ...source, commits: page, more: more && skip + page.length <= MAX_SKIP } satisfies Log);
      }

      const full = await resolve(hash!);

      if (req.path === "/commit") {
        const tail = [...HISTORY, ...relative, full, "--", repo.filter];
        const [raw, num] = await Promise.all([
          run(["show", "--format=", "--raw", "--no-abbrev", "-z", ...tail], CAP.list, full),
          run(["show", "--format=", "--numstat", "-z", ...tail], CAP.list, full),
        ]);
        const entries = parseRaw(must(raw).stdout);
        const counts = parseNumstat(must(num).stdout);
        const cut = raw.truncated === true || num.truncated === true;
        if (!cut && entries.length !== counts.length) unexpected("show (raw and numstat disagree)");
        const files: FileChange[] = [];
        for (let i = 0; i < Math.min(entries.length, counts.length); i++) {
          const entry = entries[i]!;
          const count = counts[i]!;
          if (entry.path !== count.path) unexpected("show (raw and numstat disagree)");
          files.push({ path: entry.path, status: entry.status, added: count.added, deleted: count.deleted, sizes: null, openable: openable(entry.path) });
        }
        if (files.length === 0 && !cut) refuse(404, `commit ${full.slice(0, 12)} changes nothing in ${repo.filter}`);

        // "Bin 0 → 140601 bytes": numstat has no sizes, so ask for the blobs' sizes.
        const binary = files.map((f, i) => (f.added === null ? i : -1)).filter((i) => i >= 0);
        const ids = [...new Set(binary.flatMap((i) => [entries[i]!.oldId, entries[i]!.newId]).filter((id) => !/^0+$/.test(id)))];
        if (ids.length > 0) {
          const sizes = new Map<string, number>();
          const check = must(await run(["cat-file", "--batch-check"], CAP.list, undefined, ids.map((id) => `${id}\n`).join("")));
          for (const line of check.stdout.split("\n")) {
            const m = /^([0-9a-f]+) blob (\d+)$/.exec(line);
            if (m !== null) sizes.set(m[1]!, Number(m[2]));
          }
          const size = (id: string) => (/^0+$/.test(id) ? 0 : sizes.get(id));
          for (const i of binary) {
            const [before, after] = [size(entries[i]!.oldId), size(entries[i]!.newId)];
            if (before !== undefined && after !== undefined) files[i]!.sizes = { old: before, new: after };
          }
        }

        let stat = { files: files.length, added: 0, deleted: 0 };
        for (const f of files) {
          stat.added += f.added ?? 0;
          stat.deleted += f.deleted ?? 0;
        }
        if (cut) {
          const short = must(await run(["show", "--format=", "--shortstat", ...tail], CAP.line, full));
          stat = short.stdout.split("\n").map(parseShortstat).find((s) => s !== null) ?? unexpected("show --shortstat");
        }

        const meta = must(await run(["show", "-s", "--format=%H%x00%h%x00%cs%x00%an%x00%s%x00%b", ...HISTORY, full], CAP.message, full));
        const [, short = "", date = "", author = "", subject = "", ...body] = meta.stdout.split("\0");
        return json(200, {
          ...source,
          hash: full,
          short,
          date,
          author,
          subject,
          body: body.join("\0").replace(/\n+$/, ""),
          files,
          stat,
          truncated: cut || meta.truncated === true,
        } satisfies Commit);
      }

      // /diff: the path must be exactly one file the commit changes, so a
      // folder (whose patch would include its dot files) is never diffed.
      const spec = repo.relative === null ? path! : `${repo.filter}/${path!}`;
      const tail = [...HISTORY, ...relative, full, "--", spec];
      const listed = must(await run(["show", "--format=", "--raw", "--no-abbrev", "-z", ...tail], CAP.list, full));
      const entries = parseRaw(listed.stdout);
      if (listed.truncated || entries.length !== 1 || entries[0]!.path !== path) {
        refuse(404, `${quoted(path!)} is not a file that commit ${full.slice(0, 12)} changes`);
      }
      const patch = must(await run(["show", "--format=", "--patch", ...tail], CAP.diff, full));
      const diff = patch.truncated ? patch.stdout.slice(0, patch.stdout.lastIndexOf("\n") + 1) : patch.stdout;
      return json(200, { ...source, hash: full, path: path!, diff, truncated: patch.truncated === true } satisfies Diff);
    } catch (error) {
      if (error instanceof Answer) return error.response;
      return json(500, { error: errorText(error) });
    }
  }
}

/**
 * An error answer with the workspace's absolute path (Git names it in
 * "fatal: ..." lines, as given or real, with either slash on Windows)
 * written as <workspace>, so a plugin page never learns where it lives.
 */
function withoutWorkspace(response: ApiResponse, repoRoot: string): ApiResponse {
  const body = response.body as { error?: unknown };
  if (response.status < 400 || typeof body.error !== "string") return response;
  let real = repoRoot;
  try {
    real = realpathSync.native(repoRoot);
  } catch {
    // a workspace that is gone has only the name it was given
  }
  const roots = [...new Set([real, repoRoot].flatMap((r) => [r, r.replace(/\\/g, "/")]))]
    .filter((r) => r.length > 1)
    .sort((a, b) => b.length - a.length);
  let error = body.error;
  for (const root of roots) error = error.split(root).join("<workspace>");
  return { status: response.status, body: { ...body, error } };
}

export const codeGitApi: HandlerFactory = (ctx) => codeGitHandler(ctx);

/*
 * Every `git help config` (2.55) key whose name or text mentions a command,
 * program, helper, hook, filter, or driver, and the git(1) environment, for
 * the commands this file runs (log, show, rev-parse, cat-file --batch-check,
 * --version), with stdout and stderr pipes and stdin closed after `input`.
 * Leaving out keys where those words only mean "on the command line".
 *
 * Neutralised
 *   diff.<driver>.textconv, .cachetextconv          --no-textconv (the cache writes refs/notes/textconv/<driver>,
 *                                                    a ref update that changes .git and fires reference-transaction)
 *   filter.<driver>.clean/.smudge/.process          reached only through textconv's temporary files: --no-textconv
 *   diff.external, diff.<driver>.command            --no-ext-diff (log and show never use them without --ext-diff)
 *   gpg.program, gpg.<format>.program,
 *     gpg.ssh.allowedSignersFile, log.showSignature --no-show-signature (no %G placeholder is used)
 *   core.fsmonitor, core.fsmonitorHookVersion,
 *     fsmonitor.*                                    --ignore-submodules=none, which stops the index read a gitlink
 *                                                    caused, and -c core.fsmonitor=false for any other read
 *   diff.submodule, status.submoduleSummary          --submodule=short (status.* is not read by show)
 *   log.follow                                       --no-follow
 *   extensions.partialClone, remote.<name>.promisor,
 *     and through the fetch they would start:
 *     core.sshCommand, core.gitProxy, core.askPass,
 *     credential.*, http.*, ssh.variant, protocol.*,
 *     url.<base>.insteadOf, remote.<name>.vcs
 *     (git-remote-<vcs>), .uploadpack, .proxy,
 *     bundle.*, transfer.*, fetch.*, promisor.*,
 *     and the hooks of the fetch's ref updates       --no-lazy-fetch
 *   core.useReplaceRefs                              --no-replace-objects
 *   trace2.*Target and every other key in the
 *     user's global or the system config             GIT_CONFIG_GLOBAL=<null device>, GIT_CONFIG_NOSYSTEM=1
 *   every GIT_* variable (GIT_EXTERNAL_DIFF,
 *     GIT_SSH*, GIT_ASKPASS, GIT_PAGER, GIT_EDITOR,
 *     GIT_CONFIG_COUNT/_KEY_/_VALUE_, GIT_CONFIG_PARAMETERS,
 *     GIT_TRACE*, GIT_DIR, GIT_OBJECT_DIRECTORY,
 *     GIT_ALTERNATE_OBJECT_DIRECTORIES, GIT_EXEC_PATH,
 *     GIT_ATTR_SOURCE, ...)                          removed by gitEnv
 *   core.worktree                                    --work-tree
 *   in-tree .gitattributes                           --attr-source=<commit>
 *   core.attributesFile                              -c core.attributesFile=<null device>
 *   diff.orderFile                                   -O<null device> (a missing file failed every diff)
 *   mailmap.file, mailmap.blob, in-tree .mailmap     --no-use-mailmap (read even though %an is printed)
 *   diff.ignoreSubmodules, submodule.<name>.ignore
 *     in the working tree's .gitmodules              --ignore-submodules=none (which also stops the read)
 *
 * Cannot be reached by these commands
 *   core.pager, pager.<cmd>, PAGER                   a pager starts only when stdout is a terminal; it is a pipe
 *   core.editor, sequence.editor, EDITOR             nothing here edits a message
 *   alias.*                                          built-in commands cannot be aliased
 *   hooks (core.hooksPath, hook.<name>.*)            log, show, rev-parse and cat-file run none themselves; only a ref
 *                                                    update would: textconv's cache (seen in a test without
 *                                                    --no-textconv) or a lazy fetch that got objects, both
 *                                                    neutralised above
 *   interactive.diffFilter                           add -p and friends only
 *   difftool.*, mergetool.*, merge.<driver>.driver   difftool, mergetool, merge only
 *   core.alternateRefsCommand                        receive-pack and fetch negotiation only; alternates are refused
 *   gc.recentObjectsHook, gc.auto, maintenance.*     gc and maintenance only; these commands trigger neither
 *   uploadpack.packObjectsHook, receive.*            server side only
 *   trailer.<key>.command/.cmd                       interpret-trailers and commit --trailer only
 *   gpg.ssh.defaultKeyCommand, user.signingKey       signing only
 *   submodule.<name>.update                          submodule update only
 *   imap.tunnel, sendemail.*, browser.<tool>.cmd,
 *     web.browser, instaweb.*, man.*, help.*,
 *     guitool.*, gitcvs.*                            other commands only
 *   safe.directory                                   not consulted with an explicit --git-dir (verified with
 *                                                    GIT_TEST_ASSUME_DIFFERENT_OWNER=1 on 2.55: discovery and -C
 *                                                    refuse, --git-dir reads), so these guards are the only ones
 *
 * Read, and left as they are
 *   include.path, includeIf.*                        more config, under the same guards
 *   info/attributes                                  inside the checked .git; it can only pick a driver
 *   info/grafts                                      honoured (deprecated; --no-replace-objects does not cover it);
 *                                                    it lies inside the checked .git and changes parents only
 *   a FIFO among the files Git opens in .git         stalls each command until the 10 s limit, then a 500
 *                                                    (seen with info/attributes); no option skips those reads
 */
