import { accessSync, constants, readFileSync, statSync } from "node:fs";
import { join, posix, win32 } from "node:path";

export type Exists = (file: string) => boolean;

export const isExecutableFile: Exists = (file) => {
  try {
    if (!statSync(file).isFile()) return false;
    if (process.platform !== "win32") accessSync(file, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

/** `which`: the first executable called `name` on `path`, honouring PATHEXT on Windows. */
export function which(
  name: string,
  path: string,
  platform: NodeJS.Platform = process.platform,
  exists: Exists = isExecutableFile,
  pathext = ".COM;.EXE;.BAT;.CMD",
): string | null {
  const windows = platform === "win32";
  const dirs = path.split(windows ? ";" : ":").filter(Boolean);
  const exts = windows && !/\.[A-Za-z0-9]+$/.test(name) ? pathext.split(";").filter(Boolean) : [""];
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = windows ? win32.join(dir, name + ext.toLowerCase()) : posix.join(dir, name);
      if (exists(candidate)) return candidate;
    }
  }
  return null;
}

/** The Microsoft Store's python.exe stubs open the Store instead of running Python. */
export function isStoreAlias(file: string): boolean {
  return /[\\/]WindowsApps[\\/]/i.test(file);
}

export interface PythonChoice {
  kind: "uv" | "python" | "none";
  /** Command prefix that runs a Python script; null when nothing usable is installed. */
  prefix: [string, ...string[]] | null;
  detail: string;
}

export function pinnedVersion(repoRoot: string): string | null {
  try {
    return readFileSync(join(repoRoot, ".python-version"), "utf8").trim() || null;
  } catch {
    return null;
  }
}

/** Runs a short command and resolves to its exit code and combined output. */
export type Probe = (command: string[]) => Promise<{ code: number; output: string }>;

/** "Python 3.12.4" → true when at least 3.11 (what the generator needs). */
export function isRecentPython(output: string): boolean {
  const match = /Python (\d+)\.(\d+)/.exec(output);
  if (match === null) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return major > 3 || (major === 3 && minor >= 11);
}

/**
 * On a Mac without the Command Line Tools, /usr/bin/python3 and /usr/bin/git
 * are stubs that pop an install dialog when run; ask xcode-select first.
 */
export async function isXcodeStub(bin: string, platform: NodeJS.Platform, probe: Probe): Promise<boolean> {
  if (platform !== "darwin" || !bin.startsWith("/usr/bin/")) return false;
  const tools = await probe(["/usr/bin/xcode-select", "-p"]);
  return tools.code !== 0;
}

/**
 * uv with the repository's pinned interpreter, as start.sh and verify.sh use
 * it; otherwise the first system Python that runs and is at least 3.11 (every
 * script the client calls is standard-library only).
 */
export async function choosePython(options: {
  repoRoot: string;
  path: string;
  probe: Probe;
  platform?: NodeJS.Platform;
  exists?: Exists;
  version?: string | null;
}): Promise<PythonChoice> {
  const platform = options.platform ?? process.platform;
  const find = (name: string) => which(name, options.path, platform, options.exists);
  const version = options.version !== undefined ? options.version : pinnedVersion(options.repoRoot);

  const uv = find("uv");
  if (uv !== null) {
    const pin = version ? ["--python", version] : [];
    return {
      kind: "uv",
      prefix: [uv, "run", "--no-project", ...pin, "--", "python"],
      detail: version ? `uv with Python ${version} (.python-version)` : "uv with its default Python",
    };
  }
  const candidates: [string, string[]][] =
    platform === "win32" ? [["py", ["-3"]], ["python", []], ["python3", []]] : [["python3", []], ["python", []]];
  const tried: string[] = [];
  for (const [name, args] of candidates) {
    const bin = find(name);
    if (bin === null || isStoreAlias(bin) || (await isXcodeStub(bin, platform, options.probe))) continue;
    const result = await options.probe([bin, ...args, "--version"]);
    if (result.code === 0 && isRecentPython(result.output)) {
      return { kind: "python", prefix: [bin, ...args], detail: `${bin} ${args.join(" ")}`.trim() + " (uv not found)" };
    }
    tried.push(`${bin}: ${result.output.trim() || `exit ${result.code}`}`);
  }
  const why = tried.length > 0 ? `; tried ${tried.join(", ")}` : "";
  return { kind: "none", prefix: null, detail: `uv not found and no Python 3.11+ on PATH${why}` };
}
