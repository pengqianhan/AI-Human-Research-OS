import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { processRunner, uvPython } from "./process.ts";
import type { ApiContext } from "./types.ts";

const FRONTEND = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = resolve(FRONTEND, "..", "..");

let context: ApiContext | null = null;

/**
 * The dev server's context: the checkout this file is in, the pinned Python
 * through uv on the inherited PATH, and the public/paper-wiki cache copy that
 * start.sh makes for the iframe. One context is shared by all four plugins.
 */
export function devContext(): ApiContext {
  if (context !== null) return context;
  const run = processRunner(process.env);
  const python = () => uvPython(REPO_ROOT);
  context = {
    repoRoot: REPO_ROOT,
    python,
    run,
    // Relative to the repository root, where the harness that reads it runs.
    sessionsDir: resolve(REPO_ROOT, process.env.OS_HARNESS_SESSIONS || "os-harness/sessions"),
    publicWikiDir: resolve(FRONTEND, "public/paper-wiki"),
    async regenerate() {
      const result = await run([...python(), resolve(REPO_ROOT, "os-ui/generator/generate.py")], {
        cwd: resolve(REPO_ROOT, "os-ui/generator"),
      });
      return result.code === 0 ? null : (result.stderr || result.stdout || `exit ${result.code}`).trim().slice(-500);
    },
  };
  return context;
}
