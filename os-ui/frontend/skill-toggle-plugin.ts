import type { Plugin } from "vite";
import { devContext } from "./server/dev.ts";
import { serveNode } from "./server/node.ts";
import { skillToggleApi } from "./server/skillToggle.ts";

/**
 * The one write action os-ui is authorized to perform on skills (GOAL.md M4,
 * 2026-07-22), served by server/skillToggle.ts: disable or enable a single
 * install location through research-skill-installer.
 *
 * This lives on the dev server, so it exists only while start.sh runs and dies
 * with Ctrl-C. No resident service is introduced (DESIGN.md §2).
 */
export function skillTogglePlugin(): Plugin {
  return {
    name: "os-ui-skill-toggle",
    apply: "serve", // never part of a production build
    configureServer(server) {
      const handler = skillToggleApi(devContext());
      server.middlewares.use("/api/skill/toggle", (req, res) => serveNode(handler, req, res));
    },
  };
}
