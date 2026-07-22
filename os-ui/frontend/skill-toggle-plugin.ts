import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { Connect, Plugin } from "vite";

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const INSTALLER = resolve(
  REPO_ROOT,
  "research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py",
);
const GENERATOR = resolve(REPO_ROOT, "os-ui/generator/generate.py");

/** Only these characters can appear in a skill, target, or collection name. */
const SAFE = /^[A-Za-z0-9._:-]+$/;

/** Tuple, not string[]: the caller destructures the binary out of the front. */
function python(): [string, ...string[]] {
  // Match verify.sh: the repository-pinned interpreter, no project sync.
  const version = readFileSync(resolve(REPO_ROOT, ".python-version"), "utf8").trim();
  return ["uv", "run", "--no-project", "--python", version, "--", "python"];
}

async function readJson(req: Connect.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

/**
 * The one write action os-ui is authorized to perform (GOAL.md M4, 2026-07-22):
 * disable or enable a single install location.
 *
 * It shells out to research-skill-installer rather than renaming or unlinking
 * anything itself. The installer already encodes the rule that a symlinked
 * install is disabled by dropping the link — renaming SKILL.md inside one
 * would edit the hub and disable every location at once — while a copied
 * install is disabled by renaming SKILL.md. Reimplementing that here would be
 * a second copy of a rule that must not diverge.
 *
 * This lives on the dev server, so it exists only while start.sh runs and dies
 * with Ctrl-C. No resident service is introduced (DESIGN.md §2).
 */
export function skillTogglePlugin(): Plugin {
  return {
    name: "os-ui-skill-toggle",
    apply: "serve", // never part of a production build
    configureServer(server) {
      server.middlewares.use("/api/skill/toggle", (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(body));
        };

        if (req.method !== "POST") return send(405, { error: "POST only" });

        void (async () => {
          try {
            const body = (await readJson(req)) as Record<string, unknown>;
            const skill = String(body.skill ?? "");
            const target = String(body.target ?? "");
            const collection = body.collection ? String(body.collection) : null;
            const enable = Boolean(body.enable);

            if (!SAFE.test(skill)) return send(400, { error: `bad skill name: ${skill}` });
            if (!SAFE.test(target)) return send(400, { error: `bad target name: ${target}` });
            if (collection !== null && !SAFE.test(collection)) {
              return send(400, { error: `bad collection name: ${collection}` });
            }

            const [bin, ...base] = python();
            const args = [
              ...base,
              INSTALLER,
              enable ? "enable" : "disable",
              skill,
              "--target",
              target,
              ...(collection ? ["--collection", collection] : []),
            ];
            const { stdout } = await run(bin, args, { cwd: REPO_ROOT });

            // Refresh the snapshot so the page reflects the change immediately
            // instead of waiting for the next generator poll. The toggle has
            // already happened by now, so a generator failure is reported
            // alongside a successful result rather than turning into a 500
            // that would wrongly suggest nothing was written.
            let snapshot: string | null = null;
            try {
              await run(bin, [...base, GENERATOR], {
                cwd: resolve(REPO_ROOT, "os-ui/generator"),
              });
            } catch (error) {
              const err = error as { stderr?: string; message?: string };
              snapshot = (err.stderr || err.message || String(error)).trim().slice(-500);
            }

            send(200, { ok: true, output: stdout.trim(), snapshotError: snapshot });
          } catch (error) {
            const err = error as { stderr?: string; message?: string };
            send(500, { error: (err.stderr || err.message || String(error)).trim() });
          }
        })();
      });
    },
  };
}
