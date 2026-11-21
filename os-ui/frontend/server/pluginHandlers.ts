import { paperStatusApi } from "./paperStatus.ts";
import type { HandlerFactory } from "./registry.ts";

/**
 * The host-side code of the bundled plugins, compiled in: the one way plugin
 * code becomes a mount. Keyed `<plugin id>/<handler>`, each mounted at
 * /api/<plugin id>/<handler> for a bundled plugin whose plugin.json declares
 * that handler; registry.ts refuses a key nobody declares. Server only.
 */
export const BUNDLED_HANDLERS: Readonly<Record<string, HandlerFactory>> = {
  "paper-wiki/status": paperStatusApi,
};
