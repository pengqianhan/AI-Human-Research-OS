import { randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Connect, Plugin } from "vite";
import { BUNDLED_IDS } from "./plugins/bundled.ts";
import { TRUNK_MOUNTS } from "./server/api.ts";
import { devContext } from "./server/dev.ts";
import { sendNode, serveNode } from "./server/node.ts";
import { BUNDLED_HANDLERS } from "./server/pluginHandlers.ts";
import { createRegistry, loadPlugins } from "./server/registry.ts";

/** The bundled plugins' folders, one `<id>/plugin.json` each. */
const PLUGINS = resolve(dirname(fileURLToPath(import.meta.url)), "plugins");

/**
 * Every token mount (/api/chat, /api/paper-sources) needs this token in
 * `X-OS-UI-Token`. The dev server is sometimes reached through a public
 * tunnel, and the chat endpoint runs an agent with full permissions at the
 * repository root, so a bare URL must not be enough to drive it. Set
 * OS_UI_TOKEN to choose it; otherwise a random one is printed when the server
 * starts, and the human pastes it into the Root Agent window.
 */
const TOKEN = process.env.OS_UI_TOKEN || randomBytes(6).toString("hex");

function hasToken(req: Connect.IncomingMessage): boolean {
  return req.headers["x-os-ui-token"] === TOKEN;
}

/**
 * Every os-ui endpoint on the dev server, from the plugin registry
 * (server/registry.ts): the app's own endpoints (server/api.ts TRUNK_MOUNTS:
 * the skill toggle, the Papers button's switches and keys, and the agent
 * conversations, GOAL.md H2) and each bundled plugin's handlers (Paper Wiki's
 * reading status). The logic lives in server/, shared with the desktop
 * client, which serves the same handlers in-process.
 *
 * Each endpoint is its own Connect mount, so the handler sees the path below
 * its prefix, and a token mount checks the token before any routing (an
 * unknown path without the token is still 401). Like every os-ui endpoint,
 * they exist only while start.sh runs and die with Ctrl-C; no resident
 * service is introduced (DESIGN.md §2).
 */
export function apiPlugin(): Plugin {
  return {
    name: "os-ui-api",
    apply: "serve", // never part of a production build
    configureServer(server) {
      server.httpServer?.once("listening", () => {
        server.config.logger.info(`  ➜  Root Agent token: ${TOKEN}  (paste it into the Root Agent window)`);
      });
      const loaded = loadPlugins(PLUGINS, BUNDLED_IDS, "bundled", { trunk: TRUNK_MOUNTS, plugins: [] });
      for (const problem of loaded.problems) server.config.logger.warn(`  os-ui plugin not loaded: ${problem}`);
      const registry = createRegistry({ ctx: devContext(), trunk: TRUNK_MOUNTS, plugins: loaded.plugins, factories: BUNDLED_HANDLERS });
      for (const mount of registry.all) {
        server.middlewares.use(mount.prefix, (req, res) => {
          if (mount.token && !hasToken(req)) return sendNode(res, { status: 401, body: { error: "token required" } });
          serveNode(mount.handler, req, res);
        });
      }
    },
  };
}
