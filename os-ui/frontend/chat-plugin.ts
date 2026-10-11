import { randomBytes } from "node:crypto";
import type { Connect, Plugin } from "vite";
import { chatApi } from "./server/chat.ts";
import { devContext } from "./server/dev.ts";
import { sendNode, serveNode } from "./server/node.ts";

/**
 * Every /api/chat request must carry this token in `X-OS-UI-Token`. The dev
 * server is sometimes reached through a public tunnel, and this endpoint runs
 * an agent with full permissions at the repository root, so a bare URL must
 * not be enough to drive it. Set OS_UI_TOKEN to choose it; otherwise a random
 * one is printed when the server starts.
 */
const TOKEN = process.env.OS_UI_TOKEN || randomBytes(6).toString("hex");

/** The same gate for the agent windows' other endpoints (paper-sources-plugin.ts). */
export function hasToken(req: Connect.IncomingMessage): boolean {
  return req.headers["x-os-ui-token"] === TOKEN;
}

/**
 * The agent conversations (GOAL.md H2), served by server/chat.ts: each message
 * becomes one os-harness turn at the repository root or inside one registered
 * project. Like the skill toggle, it lives on the dev server and dies with it;
 * the desktop client serves the same handler in-process.
 */
export function chatPlugin(): Plugin {
  return {
    name: "os-ui-agent-chat",
    apply: "serve",
    configureServer(server) {
      server.httpServer?.once("listening", () => {
        server.config.logger.info(`  ➜  Root Agent token: ${TOKEN}  (paste it into the Root Agent window)`);
      });
      const handler = chatApi(devContext());
      server.middlewares.use("/api/chat", (req, res) => {
        if (!hasToken(req)) return sendNode(res, { status: 401, body: { error: "token required" } });
        serveNode(handler, req, res);
      });
    },
  };
}
