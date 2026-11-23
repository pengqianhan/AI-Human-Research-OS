import { lstatSync, opendirSync, realpathSync } from "node:fs";
import type { Dirent, Stats } from "node:fs";
import { isAbsolute, join, sep } from "node:path";
import { resolveCwd } from "./chat.ts";
import { safeDecodedRelative } from "./manifest.ts";
import { errorText, failureText } from "./process.ts";
import type { HandlerFactory } from "./registry.ts";
import { json } from "./types.ts";
import type { ApiContext, ApiHandler, ApiResponse, RunOptions, RunResult } from "./types.ts";

/**
 * The Code view's Git data (os-ui/PLUGINS.md, Part 2, Gap 1): one project's
 * history, read-only, for the "Changes" pane. The code-view plugin declares
 * it; the desktop client mounts it at /api/code-view/git on app://code-view
 * only, and the dev server not at all (DESKTOP_ONLY_HANDLERS).
 *
 * GET /        ?project              Summary: which repository, and the last commit touching the project
 * GET /log     ?project&skip         Log: 50 commits from `skip`, newest first, merges left out
 * GET /commit  ?project&hash         Commit: its message and the files it changes in the project
 * GET /diff    ?project&hash&path    Diff: what `git show <hash> -- <path>` prints for one file
 *
 * The query string is untrusted, and so is the repository: a workspace can be
 * a copied folder or written by an agent, so its .git (layout and config) and
 * the user's environment may be hostile or just unusual. What holds whatever
 * they say, each part pinned by codeGit.test.ts:
 *
 * 1. Only the git found in an absolute PATH entry runs, never one whose real
 *    path lies in the workspace (nor the working folder), as an argument
 *    list with no shell, and with no network: the guards below, and the
 *    table at the end of this file, which accounts for every `git help
 *    config` key that names a command, program, helper, hook, filter, or
 *    driver.
 * 2. Nothing Git writes reaches the caller: every failure is a fixed text
 *    naming the step, and Git's stderr goes to the server's log only.
 * 3. Read-only and confined. The repository is a plain .git folder inside
 *    the workspace (`refusal`): HEAD, config, config.worktree, packed-refs,
 *    shallow and every file in info/ are plain files under their caps, refs/
 *    and reftable/ hold only folders and plain files (loose refs under
 *    4 KiB), the object store holds no link and nothing but plain files
 *    (whose sizes are not checked), and it borrows no objects (no alternates,
 *    no commondir); .git/<hash> is never opened (core.warnAmbiguousRefs).
 *    Every diff compares two committed trees of HEAD's history; no
 *    .gitattributes is read (neither the working tree's nor a committed
 *    one), .mailmap and .gitmodules in the working tree are not opened, nor
 *    is info/grafts, nor any file the config names (diff.orderFile,
 *    core.attributesFile, mailmap.file) except through include.path, which
 *    reads another file as config under the same guards and with none of
 *    these checks; no command writes to .git. The check runs before git
 *    does, so a file swapped in between is not caught.
 * 4. Bounded work, per handler (one open workspace): 20 requests in flight
 *    and 5 git processes, each project at most 8 and 2 of them (so two
 *    stalled projects leave a third 4 and 1), a request past its share 503
 *    before its .git is walked; each command with 10 s, an
 *    output cap, blobs over 4 MiB treated as binary, and no single heap
 *    allocation over 256 MiB (GIT_ALLOC_LIMIT). What is not bounded is
 *    listed in PLUGINS.md and at the end of this file.
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
  /** The first 7 hex digits of `hash`, for display; not necessarily unique. */
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
  /** Whether a request with `skip` + commits.length may find more (false once that skip would pass 10000). */
  more: boolean;
}

export interface FileChange {
  /** Relative to the project folder. Invalid UTF-8 in a name arrives as U+FFFD. */
  path: string;
  /** A added, D deleted, M modified, T type changed. Renames are never detected: a moved file is a D and an A. */
  status: string;
  /** null for a binary file: one with a NUL byte near its start, one over 4 MiB, or one info/attributes marks; no .gitattributes counts. */
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

/**
 * The null device as Git documents it for GIT_CONFIG_GLOBAL, used literally
 * on every platform rather than Node's os.devNull ("\\.\nul" on Windows). That
 * Git for Windows maps only this literal name, in compat/mingw.c's open() and
 * fopen(), is a reviewer's reading of its source, not run on Windows here.
 * Where it is not mapped it names a missing file, which is as neutral for
 * GIT_CONFIG_GLOBAL, GIT_GRAFT_FILE and core.attributesFile; -O would fail
 * every diff instead, which the diff.orderFile test would show.
 */
const DEV_NULL = "/dev/null";

/**
 * The empty tree in a SHA-1 and a SHA-256 repository, which Git knows without
 * storing it. Every command that diffs takes its attributes from it, so no
 * .gitattributes is read, neither the working tree's nor a committed one: a
 * committed 90 MB .gitattributes that compressed to almost nothing took 1.1 GB
 * and 3 s per command when read from the commit.
 */
const EMPTY_TREE: Readonly<Record<number, string>> = {
  40: "4b825dc642cb6eb9a060e54bf8d69288fbee4904",
  64: "6ef19b41225c5369f1c104d45d8d85efa9b057b53b14b4b9b939dd74decc5321",
};

const NAME = /^[A-Za-z][A-Za-z0-9_-]*$/; // a project folder name, as chat.ts's PROJECT_DIR
const FULL = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const SKIP = /^(?:0|[1-9][0-9]{0,4})$/;
const MAX_SKIP = 10_000;
const MAX_PATH = 1000;
const PAGE = 50;
const TIMEOUT_MS = 10_000;
const KIB = 1024;
const MIB = 1024 * KIB;
const CAP = { line: 4 * KIB, log: 256 * KIB, list: 512 * KIB, message: 64 * KIB, diff: 1024 * KIB, stderr: 16 * KIB };
/**
 * Per handler, that is per open workspace: requests in flight, and git
 * processes running. Each project's share is under half, so two projects
 * whose commands stall leave a third some of both: 8 of 20 requests (a third
 * project still gets 4) and 2 of 5 processes (a third still gets 1). A
 * request past its share is 503 before anything is read.
 */
const MAX_REQUESTS = 20;
const PROJECT_REQUESTS = 8;
const MAX_GIT = 5;
const PROJECT_GIT = 2;
/**
 * GIT_ALLOC_LIMIT: Git dies rather than make one heap allocation larger than
 * this (wrapper.c's memory_limit_check, in xmalloc, xmallocz, xrealloc,
 * xcalloc, which xdiff uses too; not mmap). Commit and tree objects are read
 * whole whatever core.bigFileThreshold says: a 400 MB commit message took 392
 * MB in log -1 and 773 MB in show -s, and dies at 9 MB with this limit. The
 * largest ordinary allocation under the 4 MiB blob threshold is xdiff's
 * diagonal array, about 134 MB for two 4 MiB files of one-byte lines.
 */
const ALLOC_LIMIT = "256m";
const BUSY = "the Code view is busy with other requests; try again";
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
 *   remote helpers, credential helpers, proxies) would run;
 *   protocol.allow=never refuses every transport should a fetch start anyway.
 * - --no-replace-objects: a commit shows its own content, not a replacement's.
 * - --no-optional-locks: the documented switch for readers in the background.
 * - --literal-pathspecs: a path is a path; no globs, no magic.
 * - core.fsmonitor=false: a gitlink made show read the index, which started
 *   the configured monitor; --ignore-submodules=none (below) stops that read,
 *   so this one is kept for a Git that reads the index some other way.
 * - core.attributesFile=/dev/null: no attributes from a file the
 *   repository's config names anywhere (a FIFO there stalls every command).
 * - core.bigFileThreshold=4m: a blob over 4 MiB is binary, so Git neither
 *   loads nor diffs it (two 500 MB text blobs took 3.4 GB in log --shortstat).
 * - core.quotePath=false: names in diff headers stay readable.
 * - core.warnAmbiguousRefs=false: for a full hash Git otherwise looks for a
 *   ref of that name, opening .git/<hash> (a FIFO there stalled every route).
 * - diff.algorithm=myers here, and --diff-algorithm=myers on every log and
 *   show (HISTORY), which is what pins it: a per-driver
 *   diff.<driver>.algorithm, picked by info/attributes, beats the -c setting
 *   but not the command-line option. So the output does not depend on the
 *   repository's config, and the allocation limit holds: two files just under
 *   4 MiB of one- or two-byte lines need about 96 MiB in one allocation under
 *   myers, 160 to 320 MiB under patience, which died at GIT_ALLOC_LIMIT on
 *   every route.
 * Per command that diffs, --attr-source=<the empty tree> (EMPTY_TREE): no
 * .gitattributes from the working tree or the commit.
 */
export function guardArgs(gitDir: string, top: string): string[] {
  return [
    `--git-dir=${gitDir}`,
    `--work-tree=${top}`,
    "--no-lazy-fetch",
    "--no-replace-objects",
    "--no-optional-locks",
    "--literal-pathspecs",
    "-c",
    "protocol.allow=never",
    "-c",
    "core.fsmonitor=false",
    "-c",
    `core.attributesFile=${DEV_NULL}`,
    "-c",
    "core.bigFileThreshold=4m",
    "-c",
    "core.quotePath=false",
    "-c",
    "core.warnAmbiguousRefs=false",
    "-c",
    "diff.algorithm=myers",
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
  `-O${DEV_NULL}`, // diff.orderFile names a file anywhere; a missing one fails every diff, a FIFO stalls it
  "--no-follow", // log.follow would follow a path out of the project (a file once renamed to the project's name)
  "--diff-algorithm=myers", // beats diff.algorithm and every diff.<driver>.algorithm an attribute picks (Git 2.42+); see guardArgs
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
 * names them, with the user's global and the system configuration not read,
 * and with no grafts. trace2.*Target in global config writes trace files
 * (Git 2.55 honoured it from ~/.gitconfig and $XDG_CONFIG_HOME/git/config,
 * not from the repository's config, GIT_CONFIG_COUNT or
 * GIT_CONFIG_PARAMETERS); every other key there the repository's own config
 * could set as well, so the guards above cover it. GIT_GRAFT_FILE replaces
 * info/grafts, which Git reads line by line and echoes back in its errors.
 * GIT_ALLOC_LIMIT caps each single heap allocation (ALLOC_LIMIT).
 */
export function gitEnv(inherited: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(inherited)) {
    if (!/^git_/i.test(key)) env[key] = value;
  }
  env.GIT_CONFIG_NOSYSTEM = "1";
  env.GIT_CONFIG_GLOBAL = DEV_NULL;
  env.GIT_GRAFT_FILE = DEV_NULL;
  env.GIT_ALLOC_LIMIT = ALLOC_LIMIT;
  return env;
}

/** "git version 2.47.1.windows.2" → [2, 47, 1]; anything not starting "git version " → null, so no other program passes the floor. */
export function parseGitVersion(text: string): [number, number, number] | null {
  const m = /^git version (\d+)\.(\d+)(?:\.(\d+))?/.exec(text);
  return m === null ? null : [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
}

/** Whether a path from a commit may be opened with /diff (see FileChange.openable). */
export function openable(path: string): boolean {
  return (
    path !== "" &&
    path.length <= MAX_PATH &&
    safeDecodedRelative(path) === path &&
    !path.split("/").some((s) => s.startsWith(".")) &&
    !path.includes("\uFFFD")
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

/** Whether `dir` holds an entry spelled exactly `name`, among its first 10,000. */
function hasEntry(dir: string, name: string): boolean {
  const handle = opendirSync(dir);
  try {
    for (let i = 0, entry = handle.readSync(); entry !== null && i < 10_000; i++, entry = handle.readSync()) {
      if (entry.name === name) return true;
    }
    return false;
  } finally {
    handle.closeSync();
  }
}

function lstatOrNull(path: string): Stats | null {
  try {
    return lstatSync(path);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return null;
    throw error;
  }
}

/** Files Git reads by name in a .git folder, with the most each may hold. */
const READ_FILES: readonly (readonly [string, number])[] = [
  ["HEAD", 4 * KIB], // "ref: refs/heads/<name>" or a hash
  ["config", MIB],
  ["config.worktree", MIB],
  ["packed-refs", 64 * MIB], // one line per ref; Git maps it
  ["shallow", 16 * MIB], // one hash per line
  [join("info", "attributes"), MIB], // parsed whole into memory: 16 MiB of short lines took 204 MB
];
/** A loose ref is a hash (41 or 65 bytes with its newline) or "ref: <name>". */
const LOOSE_REF = 4 * KIB;
/** Text lists: info/*, objects/info/packs, commit-graphs/commit-graph-chain. */
const LIST_FILE = 16 * MIB;
/** commit-graph files and reftable tables, which Git maps or reads in blocks. */
const INDEX_FILE = 512 * MIB;
/** Entries under refs/, reftable/ and objects/ that one check walks; past this it refuses rather than stall the server. */
const MAX_ENTRIES = 100_000;

/**
 * Why the repository at `gitDir` is not read, or null. It must be a plain
 * folder (not a link, and not a gitfile, which a linked worktree or a
 * submodule checkout uses to point elsewhere) with:
 * - no link directly inside it, and no commondir (a linked worktree's shared
 *   repository);
 * - HEAD, config, config.worktree, packed-refs and shallow, where present,
 *   plain files under their caps (no link, FIFO or device);
 * - every entry of info/ a plain file under 16 MiB;
 * - under refs/ and reftable/ only folders and plain files, loose refs under
 *   4 KiB;
 * - an object store of its own: no link anywhere among objects/<xx>/,
 *   objects/pack/ or objects/info/ (and commit-graphs/), only plain files
 *   there, and no objects/info/alternates.
 * The index and other names (logs/, hooks/, modules/, FETCH_HEAD, ...) are
 * not read by these commands and not looked at; a socket such as
 * fsmonitor--daemon.ipc is fine. Lifting a refusal later means resolving the
 * target and allowing it when its real path lies inside the workspace.
 * It is synchronous and runs once per admitted request, uncached: about
 * 15 ms on an ordinary .git, 90 to 150 ms at the entry budget.
 */
export function refusal(gitDir: string, stat: Stats, label: string, maxEntries = MAX_ENTRIES): string | null {
  const why = (text: string) => `${label} ${text}; the Code view reads only a plain .git folder inside the workspace that keeps its objects to itself`;
  if (stat.isSymbolicLink()) return why("is a link");
  if (stat.isFile()) return why('is a file that points to a repository elsewhere ("gitdir:", as a linked worktree or a submodule checkout has)');
  if (!stat.isDirectory()) return why("is not a folder");

  // Folders are read entry by entry and given up past the budget, so even a
  // folder of millions of names costs at most `maxEntries` reads.
  let budget = maxEntries;
  const tooMany = () => why(`has more than ${maxEntries} entries to check (git gc packs objects and refs)`);
  const list = (dir: string): Dirent[] | null => {
    const handle = opendirSync(dir);
    try {
      const entries: Dirent[] = [];
      for (let entry = handle.readSync(); entry !== null; entry = handle.readSync()) {
        if (--budget < 0) return null;
        entries.push(entry);
      }
      return entries;
    } finally {
      handle.closeSync();
    }
  };

  const top = list(gitDir);
  if (top === null) return tooMany();
  for (const entry of top) {
    if (entry.isSymbolicLink()) return why(`has a link, ${entry.name}`);
  }
  if (lstatOrNull(join(gitDir, "commondir")) !== null) return why("shares another repository's objects and refs (commondir, as a linked worktree has)");

  const rel = (path: string) => path.slice(gitDir.length + 1).replace(/\\/g, "/");
  /** null when `path` is absent or a plain file of at most `cap` bytes. */
  const plain = (path: string, cap: number): string | null => {
    const st = lstatOrNull(path);
    if (st === null) return null;
    if (!st.isFile()) return why(`has ${rel(path)}, which is not a plain file`);
    if (st.size > cap) return why(`has ${rel(path)}, larger than ${cap / KIB} KiB`);
    return null;
  };
  for (const [name, cap] of READ_FILES) {
    const problem = plain(join(gitDir, name), cap);
    if (problem !== null) return problem;
  }
  if (lstatOrNull(join(gitDir, "HEAD")) === null) return why("has no HEAD");

  /** Every entry below `dir`: folders when `folders`, else plain files under `cap` (no size check when cap is Infinity). */
  /** `folders`: every subfolder is walked the same way (true), none is allowed (false), or only the one named (walked with none below it). */
  const walk = (dir: string, cap: number, folders: boolean | string): string | null => {
    const st = lstatOrNull(dir);
    if (st === null) return null;
    if (!st.isDirectory()) return why(`has ${rel(dir)}, which is not a folder`);
    const entries = list(dir);
    if (entries === null) return tooMany();
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory() && (folders === true || folders === entry.name)) {
        const problem = walk(path, cap, folders === true);
        if (problem !== null) return problem;
      } else if (!entry.isFile()) {
        return why(`has ${rel(path)}, which is not a plain file`);
      } else if (cap !== Infinity) {
        const problem = plain(path, cap);
        if (problem !== null) return problem;
      }
    }
    return null;
  };
  const checks: [string, number, boolean | string][] = [
    [join(gitDir, "info"), LIST_FILE, false],
    [join(gitDir, "refs"), LOOSE_REF, true],
    [join(gitDir, "reftable"), INDEX_FILE, false],
    // `git multi-pack-index write --incremental` keeps its layers in multi-pack-index.d/.
    [join(gitDir, "objects", "pack"), Infinity, "multi-pack-index.d"],
  ];
  for (const [dir, cap, folders] of checks) {
    const problem = walk(dir, cap, folders);
    if (problem !== null) return problem;
  }

  const objects = join(gitDir, "objects");
  if (lstatOrNull(objects)?.isDirectory() !== true) return why("has no objects folder");
  const stores = list(objects);
  if (stores === null) return tooMany();
  for (const entry of stores) {
    if (entry.isSymbolicLink()) return why(`has a link, objects/${entry.name}`);
    if (/^[0-9a-f]{2}$/.test(entry.name)) {
      if (!entry.isDirectory()) return why(`has objects/${entry.name}, which is not a folder`);
      const problem = walk(join(objects, entry.name), Infinity, false);
      if (problem !== null) return problem;
    }
  }
  const info = join(objects, "info");
  const infoStat = lstatOrNull(info);
  if (infoStat !== null && !infoStat.isDirectory()) return why("has objects/info, which is not a folder");
  if (lstatOrNull(join(info, "alternates")) !== null) return why("borrows objects from another repository (objects/info/alternates)");
  if (infoStat === null) return null;
  const infoEntries = list(info);
  if (infoEntries === null) return tooMany();
  for (const entry of infoEntries) {
    const path = join(info, entry.name);
    if (entry.name === "commit-graphs" && entry.isDirectory()) {
      const graphs = list(path);
      if (graphs === null) return tooMany();
      for (const graph of graphs) {
        const problem = plain(join(path, graph.name), graph.name.endsWith(".graph") ? INDEX_FILE : LIST_FILE);
        if (problem !== null) return problem;
      }
      continue;
    }
    const problem = plain(path, entry.name === "commit-graph" ? INDEX_FILE : LIST_FILE);
    if (problem !== null) return problem;
  }
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

/** The display form of a hash: its first 7 digits, whatever core.abbrev says. */
const shortOf = (hash: string) => hash.slice(0, 7);

/**
 * `log --format=%x1e%H%x1f%cs%x1f%s --shortstat`: a record is a line
 * starting with 0x1e, then its stat line. %s never holds a newline, so a
 * subject holding 0x1e or 0x1f stays inside its own line, and the subject is
 * the rest of that line after the second 0x1f.
 */
function parseLog(text: string): LogCommit[] {
  const commits: LogCommit[] = [];
  for (const line of text.split("\n")) {
    if (line.startsWith("\x1e")) {
      const fields = line.slice(1).split("\x1f");
      const hash = fields[0] ?? "";
      commits.push({ hash, short: shortOf(hash), date: fields[1] ?? "", subject: fields.slice(2).join("\x1f"), files: 0, added: 0, deleted: 0 });
      continue;
    }
    const stat = parseShortstat(line);
    const last = commits[commits.length - 1];
    if (stat !== null && last !== undefined) Object.assign(last, stat);
  }
  return commits;
}

/**
 * NUL-terminated tokens; whatever follows the last NUL is a token the cap
 * cut, and is dropped. Only a newline before the first token is not part of
 * one (a name may itself start with a newline).
 */
function tokens(text: string): string[] {
  const all = text.replace(/^\n+/, "").split("\0");
  all.pop();
  return all;
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

/** A failed git step as the caller sees it: the step and how it ended, never what Git printed. */
function failed(step: string, result: RunResult): string {
  if (result.timedOut === true) return `git ${step} took longer than ${TIMEOUT_MS / 1000} s`;
  if (result.truncated === true) return `git ${step} printed more than its cap`;
  return `git ${step} failed (exit ${result.code})`;
}

/**
 * The handler. `git` is an absolute path (the desktop client passes the one
 * it found, client/src/main/codeView.ts) or a bare name, looked up in the
 * absolute PATH entries of the runner's environment; either way never a
 * program whose real path lies in the workspace. null (the caller found no
 * usable git), or anything else, is "git was not found". `log` takes what
 * Git printed on failures, for the server's own log.
 */
export function codeGitHandler(ctx: ApiContext, git: string | null = "git", log: (line: string) => void = (line) => console.error(line)): ApiHandler {
  const usable = git !== null && (isAbsolute(git) || !/[\\/]/.test(git));
  const program = git ?? "";
  let ready: Promise<string | null> | null = null;

  // Requests in flight, and git processes running, each per handler and per project.
  let requests = 0;
  const requestsBy = new Map<string, number>();
  let running = 0;
  const runningBy = new Map<string, number>();
  const queue: { key: string; go: () => void }[] = [];
  const bump = (map: Map<string, number>, key: string, by: number) => {
    const n = (map.get(key) ?? 0) + by;
    if (n === 0) map.delete(key);
    else map.set(key, n);
  };

  /** Counts a request for `project` against both shares, or 503; returns its release. */
  function admit(project: string): () => void {
    if (requests >= MAX_REQUESTS || (requestsBy.get(project) ?? 0) >= PROJECT_REQUESTS) refuse(503, BUSY);
    requests++;
    bump(requestsBy, project, 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      requests--;
      bump(requestsBy, project, -1);
    };
  }

  /** Runs `work` once a slot is free: MAX_GIT in all, PROJECT_GIT for `key`; waiters are bounded by admission. */
  async function limited<T>(key: string, work: () => Promise<T>): Promise<T> {
    if (running < MAX_GIT && (runningBy.get(key) ?? 0) < PROJECT_GIT) {
      running++;
      bump(runningBy, key, 1);
    } else {
      await new Promise<void>((go) => queue.push({ key, go }));
    }
    try {
      return await work();
    } finally {
      running--;
      bump(runningBy, key, -1);
      for (let i = 0; i < queue.length && running < MAX_GIT; i++) {
        const next = queue[i]!;
        if ((runningBy.get(next.key) ?? 0) >= PROJECT_GIT) continue;
        queue.splice(i--, 1);
        running++;
        bump(runningBy, next.key, 1);
        next.go();
      }
    }
  }

  let outside: string | undefined;
  const workspaceReal = (): string => {
    outside ??= realpathSync.native(ctx.repoRoot);
    return outside;
  };
  const options = (cwd: string, cap: number, input?: string): RunOptions => ({
    cwd,
    env: gitEnv,
    timeoutMs: TIMEOUT_MS,
    maxOutputBytes: cap,
    maxErrorBytes: CAP.stderr,
    lookup: "path",
    lookupOutside: workspaceReal(),
    input,
  });

  /** null when git can run with every guard, else the problem to show. */
  async function probe(): Promise<string | null> {
    if (!usable) return "git was not found; see Settings";
    let result: RunResult;
    try {
      result = await limited("", () => ctx.run([program, "--version"], options(ctx.repoRoot, CAP.line)));
    } catch (error) {
      if (error instanceof Answer) throw error;
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") return "git was not found; see Settings";
      log(`code-view git --version: ${errorText(error, 300)}`);
      return `git could not start (${code ?? "unknown error"}); see Settings`;
    }
    const version = result.code === 0 ? parseGitVersion(result.stdout) : null;
    if (version === null) {
      log(`code-view git --version: ${failureText(result, 300)}`);
      return `git --version printed no version (${failed("--version", result)}); see Settings`;
    }
    const [major, minor] = version;
    if (major < MIN_GIT[0] || (major === MIN_GIT[0] && minor < MIN_GIT[1])) {
      return `Git ${version.join(".")} is too old for the Code view, which needs Git ${MIN_GIT.join(".")} or later; see Settings`;
    }
    return null;
  }

  /** A failed probe is not kept, so installing git and asking again works. */
  async function gitProblem(): Promise<string | null> {
    ready ??= probe();
    try {
      const problem = await ready;
      if (problem !== null) ready = null;
      return problem;
    } catch (error) {
      ready = null;
      throw error;
    }
  }

  return async (req) => {
    let release = () => {};
    try {
      if (req.method !== "GET") return json(405, { error: "GET only" });
      if (!["/", "/log", "/commit", "/diff"].includes(req.path)) return json(404, { error: `no endpoint ${req.path}` });

      const name = one(req.query, "project")!;
      if (!NAME.test(name)) refuse(400, `bad project name ${quoted(name)}`);
      const skipText = req.path === "/log" ? one(req.query, "skip", false) : null;
      if (skipText !== null && (!SKIP.test(skipText) || Number(skipText) > MAX_SKIP)) refuse(400, "skip must be a whole number from 0 to 10000");
      const skip = Number(skipText ?? 0);
      const hash = req.path === "/commit" || req.path === "/diff" ? one(req.query, "hash")! : null;
      if (hash !== null && !FULL.test(hash)) refuse(400, "hash must be a full commit hash: 40 or 64 lower-case hexadecimal digits");
      const path = req.path === "/diff" ? one(req.query, "path")! : null;
      if (path !== null && path.split("/").some((s) => s.startsWith("."))) refuse(400, 'a path with a segment starting with "." cannot be opened');
      if (path !== null && !openable(path)) refuse(400, `bad path ${quoted(path)}`);

      // A registered project, named as its folder is (not merely matching it
      // on a case-insensitive disk), whose real folder lies inside the
      // workspace's projects-folder.
      const cwd = resolveCwd(ctx.repoRoot, `projects-folder/${name}`);
      if (cwd === null || !hasEntry(join(ctx.repoRoot, "projects-folder"), name)) refuse(404, `no registered project ${name}`);
      const workspace = realpathSync.native(ctx.repoRoot);
      const project = realpathSync.native(cwd);
      if (!project.startsWith(join(workspace, "projects-folder") + sep)) refuse(404, `projects-folder/${name} lies outside projects-folder`);

      // Admitted before the synchronous walk of .git, so a request past the
      // shares costs nothing more.
      release = admit(name);
      const chosen = chooseRepo(workspace, project, name);
      if (chosen.repo === null) return json(200, chosen);
      const problem = await gitProblem();
      if (problem !== null) return json(200, { repo: null, problem } satisfies Unavailable);
      const repo = chosen;
      const source: Source = { repo: repo.repo, root: repo.root, filter: repo.filter };

      const guards = guardArgs(repo.gitDir, repo.top);
      /** `diffs`, a full hash of this repository, marks a command that diffs: it gets no in-tree attributes. */
      const run = (args: string[], cap: number, diffs?: string, input?: string): Promise<RunResult> =>
        limited(name, () => ctx.run([program, ...guards, ...(diffs === undefined ? [] : [`--attr-source=${EMPTY_TREE[diffs.length]}`]), ...args], options(repo.top, cap, input)));
      const must = (result: RunResult, step: string): RunResult => {
        if (result.timedOut === true || (!result.truncated && result.code !== 0)) {
          log(`code-view git ${req.path} ${step}: ${failureText(result, 2000)}`);
          refuse(500, failed(step, result));
        }
        return result;
      };
      const fullHash = (result: RunResult, step: string): string => {
        const full = result.stdout.trim();
        return FULL.test(full) ? full : unexpected(step);
      };
      /** HEAD's commit, or null on an unborn branch (a repository with no commits yet). */
      const head = async (): Promise<string | null> => {
        const result = await run(["rev-parse", "--verify", "--quiet", "HEAD^{commit}"], CAP.line);
        if (result.code === 1 && result.stdout.trim() === "") return null;
        return fullHash(must(result, "rev-parse HEAD"), "rev-parse HEAD");
      };
      const relative = repo.relative === null ? [] : [`--relative=${repo.relative}`];

      if (req.path === "/") {
        const tip = await head();
        if (tip === null) return json(200, { ...source, head: null } satisfies Summary);
        const result = must(await run(["log", "--no-merges", "--max-count=1", "--format=%H%x1f%cs", ...HISTORY, tip, "--", repo.filter], CAP.line), "log");
        const [full = "", date = ""] = (result.stdout.split("\n")[0] ?? "").split("\x1f");
        return json(200, { ...source, head: full === "" ? null : { hash: full, short: shortOf(full), date } } satisfies Summary);
      }

      if (req.path === "/log") {
        const tip = await head();
        if (tip === null) return json(200, { ...source, commits: [], more: false } satisfies Log);
        const args = ["log", "--no-merges", `--max-count=${PAGE + 1}`, `--skip=${skip}`, "--format=%x1e%H%x1f%cs%x1f%s", "--shortstat"];
        const result = must(await run([...args, ...HISTORY, tip, "--", repo.filter], CAP.log, tip), "log");
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

      // /commit and /diff: a full hash naming a commit in HEAD's history.
      // cat-file --batch-check reads only the object's header (rev-parse
      // <hash>^{commit} loads it whole, so a huge commit would die there). It
      // prints "<hash> missing" and exits 0 for no such object, and exits 128
      // when Git cannot read the repository at all (a bad include.path), which
      // is a failure (500), not a missing commit. So are a timeout and cut output.
      const resolved = await run(["cat-file", "--batch-check"], CAP.line, undefined, `${hash!}\n`);
      if (resolved.timedOut === true || resolved.truncated === true || resolved.code !== 0) {
        log(`code-view git ${req.path} cat-file --batch-check: ${failureText(resolved, 2000)}`);
        refuse(500, failed("cat-file --batch-check", resolved));
      }
      if (/^\S+ (\S+)/.exec(resolved.stdout)?.[1] !== "commit") refuse(404, `no commit ${hash!}`);
      const full = hash!;
      const tip = await head();
      const ancestor = tip === null ? null : await run(["merge-base", "--is-ancestor", full, tip], CAP.line);
      if (ancestor === null || ancestor.code === 1) refuse(404, `commit ${full} is not in this repository's history from HEAD`);
      must(ancestor, "merge-base");

      if (req.path === "/commit") {
        const tail = [...HISTORY, ...relative, full, "--", repo.filter];
        const [raw, num] = await Promise.all([
          run(["show", "--format=", "--raw", "--no-abbrev", "-z", ...tail], CAP.list, full),
          run(["show", "--format=", "--numstat", "-z", ...tail], CAP.list, full),
        ]);
        const entries = parseRaw(must(raw, "show --raw").stdout);
        const counts = parseNumstat(must(num, "show --numstat").stdout);
        const cut = raw.truncated === true || num.truncated === true;
        if (!cut && entries.length !== counts.length) unexpected("show (raw and numstat disagree)");
        const files: FileChange[] = [];
        for (let i = 0; i < Math.min(entries.length, counts.length); i++) {
          const entry = entries[i]!;
          const count = counts[i]!;
          if (entry.path !== count.path) unexpected("show (raw and numstat disagree)");
          files.push({ path: entry.path, status: entry.status, added: count.added, deleted: count.deleted, sizes: null, openable: openable(entry.path) });
        }
        if (files.length === 0 && !cut) refuse(404, `commit ${shortOf(full)} changes nothing in ${repo.filter}`);

        // "Bin 0 → 140601 bytes": numstat has no sizes, so ask for the blobs' sizes.
        const binary = files.map((f, i) => (f.added === null ? i : -1)).filter((i) => i >= 0);
        const ids = [...new Set(binary.flatMap((i) => [entries[i]!.oldId, entries[i]!.newId]).filter((id) => !/^0+$/.test(id)))];
        if (ids.length > 0) {
          const sizes = new Map<string, number>();
          const check = must(await run(["cat-file", "--batch-check"], CAP.list, undefined, ids.map((id) => `${id}\n`).join("")), "cat-file");
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
          const short = must(await run(["show", "--format=", "--shortstat", ...tail], CAP.line, full), "show --shortstat");
          stat = short.stdout.split("\n").map(parseShortstat).find((s) => s !== null) ?? unexpected("show --shortstat");
        }

        const meta = must(await run(["show", "-s", "--format=%H%x00%cs%x00%an%x00%s%x00%b", ...HISTORY, full], CAP.message, full), "show -s");
        const [, date = "", author = "", subject = "", ...body] = meta.stdout.split("\0");
        return json(200, {
          ...source,
          hash: full,
          short: shortOf(full),
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
      const listed = must(await run(["show", "--format=", "--raw", "--no-abbrev", "-z", ...tail], CAP.list, full), "show --raw");
      const entries = parseRaw(listed.stdout);
      if (listed.truncated || entries.length !== 1 || entries[0]!.path !== path) {
        refuse(404, `${quoted(path!)} is not a file that commit ${shortOf(full)} changes`);
      }
      const patch = must(await run(["show", "--format=", "--patch", ...tail], CAP.diff, full), "show --patch");
      const diff = patch.truncated ? patch.stdout.slice(0, patch.stdout.lastIndexOf("\n") + 1) : patch.stdout;
      return json(200, { ...source, hash: full, path: path!, diff, truncated: patch.truncated === true } satisfies Diff);
    } catch (error) {
      if (error instanceof Answer) return error.response;
      log(`code-view git ${req.path}: ${errorText(error, 300)}`);
      return json(500, { error: `the Code view could not read this repository (${(error as NodeJS.ErrnoException).code ?? "internal error"})` });
    } finally {
      release();
    }
  };
}

export const codeGitApi: HandlerFactory = (ctx) => codeGitHandler(ctx);

/*
 * Every `git help config` (2.55) key whose name or text mentions a command,
 * program, helper, hook, filter, or driver, and the git(1) environment, for
 * the commands this file runs (log, show, rev-parse, merge-base --is-ancestor,
 * cat-file --batch-check, --version), with stdout and stderr pipes and stdin
 * closed after `input`. Leaving out keys where those words only mean "on the
 * command line".
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
 *     and the hooks of the fetch's ref updates       --no-lazy-fetch, and -c protocol.allow=never under it, which
 *                                                    stops the transport only: a fetch that starts still writes
 *                                                    remote.<name>.partialclonefilter into .git/config (seen on
 *                                                    2.55), so --no-lazy-fetch is what keeps .git unchanged
 *   core.useReplaceRefs                              --no-replace-objects
 *   info/grafts                                      GIT_GRAFT_FILE=/dev/null (Git printed each line of it, which
 *                                                    a linked grafts file turned into a way to read any file)
 *   trace2.*Target and every other key in the
 *     user's global or the system config             GIT_CONFIG_GLOBAL=/dev/null, GIT_CONFIG_NOSYSTEM=1
 *   every GIT_* variable (GIT_EXTERNAL_DIFF,
 *     GIT_SSH*, GIT_ASKPASS, GIT_PAGER, GIT_EDITOR,
 *     GIT_CONFIG_COUNT/_KEY_/_VALUE_, GIT_CONFIG_PARAMETERS,
 *     GIT_TRACE*, GIT_DIR, GIT_OBJECT_DIRECTORY,
 *     GIT_ALTERNATE_OBJECT_DIRECTORIES, GIT_EXEC_PATH,
 *     GIT_ATTR_SOURCE, ...)                          removed by gitEnv
 *   core.worktree                                    --work-tree
 *   in-tree .gitattributes (working tree and commit) --attr-source=<the empty tree>
 *   core.attributesFile                              -c core.attributesFile=/dev/null
 *   diff.orderFile                                   -O/dev/null (a missing file failed every diff)
 *   mailmap.file, mailmap.blob, in-tree .mailmap     --no-use-mailmap (read even though %an is printed)
 *   diff.ignoreSubmodules, submodule.<name>.ignore
 *     in the working tree's .gitmodules              --ignore-submodules=none (which also stops the read)
 *   core.bigFileThreshold                            -c core.bigFileThreshold=4m (blobs only: commit and tree objects
 *                                                    are read whole, which GIT_ALLOC_LIMIT=256m bounds instead)
 *   core.warnAmbiguousRefs                           -c core.warnAmbiguousRefs=false (else a full hash makes Git
 *                                                    look for a ref of that name, opening .git/<hash>)
 *   core.abbrev                                      not used: `short` is the hash's first 7 digits
 *
 * Cannot be reached by these commands
 *   core.pager, pager.<cmd>, PAGER                   a pager starts only when stdout is a terminal; it is a pipe
 *   core.editor, sequence.editor, EDITOR             nothing here edits a message
 *   alias.*                                          built-in commands cannot be aliased
 *   hooks (core.hooksPath, hook.<name>.*)            log, show, rev-parse, merge-base and cat-file run none
 *                                                    themselves; only a ref update would: textconv's cache (seen in
 *                                                    a test without --no-textconv) or a lazy fetch that got
 *                                                    objects, both neutralised above
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
 *   include.path, includeIf.*                        another file read as config, from anywhere and unchecked (not
 *                                                    its type, size or links, so neither the 1 MiB config cap nor
 *                                                    the FIFO checks apply): its keys fall under the same guards,
 *                                                    but whether it exists or parses can show (a bad one makes
 *                                                    every command fail), what it sets shapes the output (an
 *                                                    outside include changed diff.context), and a FIFO or a huge
 *                                                    file there stalls or loads until the 10 s limit
 *   info/attributes                                  a plain file under 1 MiB inside the checked .git; it can pick
 *                                                    a driver, which the flags above neutralise, or mark binary
 *
 * Not bounded
 *   the sum of many heap allocations each under 256 MiB (a commit of many
 *   files just under 4 MiB, a diff with very many lines), for up to 10 s;
 *   mapped files (packs, the commit-graph), which GIT_ALLOC_LIMIT does not
 *   cover; packed objects, which are not checked one by one; loose object
 *   files, checked by type and not by size (for a blob over the threshold
 *   Git reads only its header; a commit or tree is read whole, up to the
 *   allocation limit); what an include.path file holds; and how long a request
 *   waits for a git process when others hold them all (each holds one for at
 *   most 10 s). Time is bounded per command only: a request runs several
 *   commands, so one can take tens of seconds.
 */
