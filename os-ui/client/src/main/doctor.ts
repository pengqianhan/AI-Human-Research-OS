import type { CheckState, DoctorCheck, DoctorReport } from "../../../frontend/src/lib/desktop.ts";
import type { RunOptions, RunResult } from "../../../frontend/server/types.ts";
import type { PythonChoice } from "./python.ts";

export type Exec = (command: readonly string[], options: RunOptions) => Promise<RunResult>;

const HELP = {
  uv: "https://docs.astral.sh/uv/getting-started/installation/",
  python: "https://www.python.org/downloads/",
  git: "https://git-scm.com/downloads",
  claude: "https://docs.claude.com/en/docs/claude-code/setup",
  codex: "https://developers.openai.com/codex/cli",
};

/** The first dotted version number in `text`, e.g. "uv 0.11.32 (x86_64)" → "0.11.32". */
export function parseVersion(text: string): string | null {
  return /\d+\.\d+(?:\.\d+)?/.exec(text)?.[0] ?? null;
}

function atLeast(version: string, major: number, minor: number): boolean {
  const [a = 0, b = 0] = version.split(".").map(Number);
  return a > major || (a === major && b >= minor);
}

export interface AgentLine {
  state: CheckState;
  version: string | null;
  detail: string;
}

/**
 * `harness.py check` prints one line per agent: `name: <version> | <login>`,
 * or `name: <why it cannot run>` when the CLI is missing.
 */
export function parseHarnessCheck(stdout: string): Partial<Record<"claude" | "codex", AgentLine>> {
  const out: Partial<Record<"claude" | "codex", AgentLine>> = {};
  for (const line of stdout.split(/\r?\n/)) {
    const match = /^(claude|codex):\s*(.*)$/.exec(line.trim());
    if (match === null) continue;
    const name = match[1] as "claude" | "codex";
    const rest = match[2]!;
    const bar = rest.lastIndexOf(" | ");
    if (bar === -1) {
      out[name] = { state: /not found/i.test(rest) ? "missing" : "error", version: null, detail: rest };
      continue;
    }
    const version = parseVersion(rest.slice(0, bar));
    const login = rest.slice(bar + 3).trim();
    const loggedOut = login === "" || /not logged in/i.test(login);
    out[name] = { state: loggedOut ? "warn" : "ok", version, detail: loggedOut ? "installed, not logged in" : `logged in: ${login}` };
  }
  return out;
}

function check(id: DoctorCheck["id"], label: string, required: boolean, state: CheckState, version: string | null, detail: string, help: string | null): DoctorCheck {
  return { id, label, state, required, version, detail, help };
}

/** Every prerequisite the client and the scripts it runs depend on, probed in parallel. */
export async function runDoctor(deps: {
  workspace: string | null;
  workspaceProblem: string | null;
  python: PythonChoice;
  uvPath: string | null;
  gitPath: string | null;
  exec: Exec;
  now?: () => Date;
}): Promise<DoctorReport> {
  const { workspace, python } = deps;
  const cwd = workspace ?? process.cwd();
  // A probe that cannot even start (a vanished binary) is a failed probe, not a failed report.
  const exec: Exec = (command, options) =>
    deps.exec(command, options).catch((error: unknown) => ({ code: -1, stdout: "", stderr: String((error as Error).message ?? error) }));

  const workspaceCheck =
    workspace !== null
      ? check("workspace", "Research OS folder", true, "ok", null, workspace, null)
      : check("workspace", "Research OS folder", true, "missing", null, deps.workspaceProblem ?? "No folder chosen yet.", null);

  const uvCheck = (async () => {
    if (deps.uvPath === null) return check("uv", "uv", false, "warn", null, "Not found; a system Python is used instead.", HELP.uv);
    const result = await exec([deps.uvPath, "--version"], { cwd, timeoutMs: 30_000 });
    return result.code === 0
      ? check("uv", "uv", false, "ok", parseVersion(result.stdout), deps.uvPath, HELP.uv)
      : check("uv", "uv", false, "error", null, (result.stderr || result.stdout).trim().slice(-300), HELP.uv);
  })();

  const pythonCheck = (async () => {
    if (python.prefix === null) return check("python", "Python ≥ 3.11", true, "missing", null, python.detail, HELP.python);
    // uv may download the pinned interpreter on first use, hence the long timeout.
    const result = await exec([...python.prefix, "--version"], { cwd, timeoutMs: 120_000 });
    const version = parseVersion(result.stdout + result.stderr);
    if (result.code !== 0 || version === null) {
      return check("python", "Python ≥ 3.11", true, "error", null, (result.stderr || result.stdout).trim().slice(-300) || python.detail, HELP.python);
    }
    return atLeast(version, 3, 11)
      ? check("python", "Python ≥ 3.11", true, "ok", version, python.detail, HELP.python)
      : check("python", "Python ≥ 3.11", true, "error", version, `${python.detail}: the generator needs 3.11 or newer`, HELP.python);
  })();

  const gitCheck = (async () => {
    if (deps.gitPath === null) return check("git", "Git", false, "warn", null, "Not found; history and activity stay empty.", HELP.git);
    const result = await exec([deps.gitPath, "--version"], { cwd, timeoutMs: 30_000 });
    return check("git", "Git", false, result.code === 0 ? "ok" : "error", parseVersion(result.stdout), deps.gitPath, HELP.git);
  })();

  const agentChecks = (async (): Promise<DoctorCheck[]> => {
    const labels = { claude: "Claude Code", codex: "Codex" } as const;
    const unknown = (detail: string) =>
      (["claude", "codex"] as const).map((id) => check(id, labels[id], false, "error", null, detail, HELP[id]));
    if (workspace === null || python.prefix === null) return unknown("Needs a Research OS folder and Python to check.");
    // `check` asks each CLI for its version and login in turn; a slow CLI can take a while.
    const result = await exec([...python.prefix, "os-harness/harness.py", "check"], { cwd: workspace, timeoutMs: 150_000 });
    const lines = parseHarnessCheck(result.stdout);
    return (["claude", "codex"] as const).map((id) => {
      const line = lines[id];
      if (line === undefined) {
        return check(id, labels[id], false, "error", null, (result.stderr || result.stdout).trim().slice(-300) || "harness check printed nothing", HELP[id]);
      }
      return check(id, labels[id], false, line.state, line.version, line.detail, HELP[id]);
    });
  })();

  const checks = [workspaceCheck, await uvCheck, await pythonCheck, await gitCheck, ...(await agentChecks)];
  const byId = new Map(checks.map((c) => [c.id, c]));
  const ready =
    byId.get("workspace")?.state === "ok" &&
    byId.get("python")?.state === "ok" &&
    (byId.get("claude")?.state === "ok" || byId.get("codex")?.state === "ok");
  return { at: (deps.now ?? (() => new Date()))().toISOString(), ready, checks };
}
