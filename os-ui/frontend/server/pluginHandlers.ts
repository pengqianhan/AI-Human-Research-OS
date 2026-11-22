import { codeGitApi } from "./codeGit.ts";
import { paperStatusApi } from "./paperStatus.ts";
import type { HandlerFactory } from "./registry.ts";

/**
 * The host-side code of the bundled plugins, compiled in: the one way plugin
 * code becomes a mount. Keyed `<plugin id>/<handler>`, each mounted at
 * /api/<plugin id>/<handler> for a bundled plugin whose plugin.json declares
 * that handler; registry.ts refuses a key nobody declares. Server only.
 *
 * The desktop client mounts all of them, replacing code-view/git's factory
 * with one that runs the git it found and logs to its own log file
 * (client/src/main/codeView.ts).
 */
export const BUNDLED_HANDLERS: Readonly<Record<string, HandlerFactory>> = {
  "paper-wiki/status": paperStatusApi,
  "code-view/git": codeGitApi,
};

/**
 * Handlers the dev server does not mount (createRegistry's `skip`). A plugin
 * handler takes no token, and the Code view's returns project files' history
 * and contents, while the dev server may be reached through a tunnel (A3 in
 * os-ui/PLUGINS.md); its page has no frame URL in a browser anyway. The
 * desktop client skips none.
 */
export const DESKTOP_ONLY_HANDLERS: ReadonlySet<string> = new Set(["code-view/git"]);
