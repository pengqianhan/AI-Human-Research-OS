/** Shared helpers for the server tests (node --test); not loaded by the app. */
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { ApiContext, ApiRequest, RunResult } from "./types.ts";

export interface Call {
  command: string[];
  cwd: string;
  input?: string;
}

/** A Runner that records each call and answers with `answer(call)`. */
export function fakeRunner(answer: (call: Call) => RunResult | Promise<RunResult> = () => ok("")) {
  const calls: Call[] = [];
  const run = async (command: readonly string[], options: { cwd: string; input?: string }) => {
    const call = { command: [...command], cwd: options.cwd, input: options.input };
    calls.push(call);
    return answer(call);
  };
  return { run, calls };
}

export function ok(stdout: string): RunResult {
  return { code: 0, stdout, stderr: "" };
}

export function fail(code: number, stderr: string, stdout = ""): RunResult {
  return { code, stdout, stderr };
}

/** A temporary directory with the given files (path → content). */
export function tempTree(files: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), "os-ui-server-"));
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

export function context(repoRoot: string, overrides: Partial<ApiContext> = {}): ApiContext {
  return {
    repoRoot,
    python: () => ["py"],
    run: fakeRunner().run,
    sessionsDir: join(repoRoot, "os-harness/sessions"),
    publicWikiDir: null,
    regenerate: async () => null,
    ...overrides,
  };
}

export function request(method: string, path: string, body?: unknown, query = ""): ApiRequest {
  return {
    method,
    path,
    query: new URLSearchParams(query),
    json: async () => (typeof body === "string" ? (JSON.parse(body) as unknown) : (body ?? {})),
  };
}

/** One JSONL trace in os-harness's format: a header, then records. */
export function writeTrace(sessionsDir: string, id: string, meta: Record<string, unknown>, events: Record<string, unknown>[]) {
  mkdirSync(sessionsDir, { recursive: true });
  const lines = [{ id, ...meta }, ...events].map((r) => JSON.stringify(r));
  writeFileSync(join(sessionsDir, `${id}.jsonl`), lines.join("\n") + "\n");
}
