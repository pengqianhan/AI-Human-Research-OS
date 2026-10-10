import { resolve } from "node:path";
import { errorText } from "./process.ts";
import { json } from "./types.ts";
import type { ApiContext, ApiHandler } from "./types.ts";

/** Only these characters can appear in a skill, target, or collection name. */
const SAFE = /^[A-Za-z0-9._:-]+$/;

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
 */
export function skillToggleApi(ctx: ApiContext): ApiHandler {
  const installer = resolve(
    ctx.repoRoot,
    "research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py",
  );

  return async (req) => {
    if (req.method !== "POST") return json(405, { error: "POST only" });
    try {
      const body = (await req.json()) as Record<string, unknown>;
      const skill = String(body.skill ?? "");
      const target = String(body.target ?? "");
      const collection = body.collection ? String(body.collection) : null;
      const enable = Boolean(body.enable);

      if (!SAFE.test(skill)) return json(400, { error: `bad skill name: ${skill}` });
      if (!SAFE.test(target)) return json(400, { error: `bad target name: ${target}` });
      if (collection !== null && !SAFE.test(collection)) {
        return json(400, { error: `bad collection name: ${collection}` });
      }

      const command = [
        ...ctx.python(),
        installer,
        enable ? "enable" : "disable",
        skill,
        "--target",
        target,
        ...(collection ? ["--collection", collection] : []),
      ];
      const result = await ctx.run(command, { cwd: ctx.repoRoot });
      if (result.code !== 0) {
        return json(500, { error: (result.stderr || result.stdout).trim() || `installer exited ${result.code}` });
      }

      // Refresh the snapshot so the page reflects the change immediately
      // instead of waiting for the next generator run. The toggle has already
      // happened by now, so a generator failure is reported alongside a
      // successful result rather than turning into a 500 that would wrongly
      // suggest nothing was written.
      let snapshot: string | null;
      try {
        snapshot = await ctx.regenerate();
      } catch (error) {
        snapshot = errorText(error, 500);
      }
      return json(200, { ok: true, output: result.stdout.trim(), snapshotError: snapshot });
    } catch (error) {
      return json(500, { error: errorText(error) });
    }
  };
}
