/**
 * The transport-free shape of os-ui's endpoints. The Vite dev server
 * (../api-plugin.ts) and the desktop client (../../client) each turn their own
 * requests into an ApiRequest and send back the ApiResponse, so the endpoint
 * rules live in one place.
 */

export interface ApiRequest {
  method: string;
  /** The path below the endpoint's mount point, always starting with "/". */
  path: string;
  query: URLSearchParams;
  /** The parsed JSON body; `{}` when empty. Throws on malformed JSON. */
  json(): Promise<unknown>;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}

export type ApiHandler = (req: ApiRequest) => Promise<ApiResponse>;

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
  /** Stdout passed maxOutputBytes: the child was killed and stdout holds what came before the cap. */
  truncated?: boolean;
  /** The child outlived timeoutMs and was killed (code -1). */
  timedOut?: boolean;
}

export interface RunOptions {
  cwd: string;
  input?: string;
  /** Kill the child after this long; the result then has code -1, `timedOut`, and says so in stderr. */
  timeoutMs?: number;
  /** Stop collecting stdout at this many bytes and kill the child; the result is then `truncated`. */
  maxOutputBytes?: number;
  /** Keep at most this many bytes of stderr and drop the rest; the child runs on and its exit code counts. */
  maxErrorBytes?: number;
  /** The child's environment, made from the runner's own (which keeps the PATH that finds the program). */
  env?: (inherited: NodeJS.ProcessEnv) => NodeJS.ProcessEnv;
  /**
   * "path": find a bare program name in the absolute entries of the child's
   * PATH only (never the working folder, an empty entry, or a relative one,
   * which spawn would search), and fail with ENOENT when none holds it.
   */
  lookup?: "path";
}

/** Runs one child process to completion; rejects only when it cannot start. */
export type Runner = (command: readonly string[], options: RunOptions) => Promise<RunResult>;

export interface ApiContext {
  repoRoot: string;
  /** Command prefix that runs the repository's Python, e.g. `uv run ... -- python`. */
  python(): [string, ...string[]];
  run: Runner;
  /** Where os-harness writes session traces. */
  sessionsDir: string;
  /** The dev server's cache copy of paper-wiki/ for the iframe; null when the wiki is served in place. */
  publicWikiDir: string | null;
  /** Refreshes state.json; resolves to an error text, or null on success. */
  regenerate(): Promise<string | null>;
}

export function json(status: number, body: unknown): ApiResponse {
  return { status, body };
}
