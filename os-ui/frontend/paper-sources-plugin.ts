import type { Plugin } from "vite";
import { hasToken } from "./chat-plugin";
import { devContext } from "./server/dev.ts";
import { sendNode, serveNode } from "./server/node.ts";
import { paperSourcesApi } from "./server/paperSources.ts";

/**
 * The Papers button's switches, read order, and keys (Human Owner,
 * 2026-09-30), served by server/paperSources.ts behind the agent-window
 * token. Like every os-ui endpoint, it exists only while start.sh runs
 * (DESIGN.md §2).
 */
export function paperSourcesPlugin(): Plugin {
  return {
    name: "os-ui-paper-sources",
    apply: "serve", // never part of a production build
    configureServer(server) {
      const handler = paperSourcesApi(devContext());
      server.middlewares.use("/api/paper-sources", (req, res) => {
        if (!hasToken(req)) return sendNode(res, { status: 401, body: { error: "token required" } });
        serveNode(handler, req, res);
      });
    },
  };
}
