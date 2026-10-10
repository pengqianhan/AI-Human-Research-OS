/** Shared helpers for the client's unit tests (node --test). */
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/** A temporary directory (real path, so macOS /var → /private/var does not bite) with the given files. */
export function tempTree(files: Record<string, string> = {}): string {
  const root = realpathSync.native(mkdtempSync(join(tmpdir(), "os-client-")));
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

/** The three files that make a folder a Research OS workspace. */
export const WORKSPACE_FILES = {
  "AGENTS.md": "# agents\n",
  "os-harness/harness.py": "",
  "os-ui/generator/generate.py": "",
};
