import type { Plugin } from "vite";
import { devContext } from "./server/dev.ts";
import { serveNode } from "./server/node.ts";
import { paperStatusApi } from "./server/paperStatus.ts";

/**
 * The human's reading-status write (Human Owner, 2026-09-30), served by
 * server/paperStatus.ts. Like the skill toggle, it exists only while start.sh
 * runs (DESIGN.md §2).
 */
export function paperStatusPlugin(): Plugin {
  return {
    name: "os-ui-paper-status",
    apply: "serve", // never part of a production build
    configureServer(server) {
      const handler = paperStatusApi(devContext());
      server.middlewares.use("/api/paper-wiki/status", (req, res) => serveNode(handler, req, res));
    },
  };
}
