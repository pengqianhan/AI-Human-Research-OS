import { codeGitApi } from "./codeGit.ts";
import { paperStatusApi } from "./paperStatus.ts";
import type { HandlerFactory } from "./registry.ts";
import { skillToggleApi } from "./skillToggle.ts";

/**
 * The host-side code of the bundled plugins, compiled in: the one way plugin
 * code becomes a mount. Keyed `<plugin id>/<handler>`, each mounted at
 * /api/<plugin id>/<handler> for a bundled plugin whose plugin.json declares
 * that handler; registry.ts refuses a key nobody declares. Server only.
 *
 * Skills Hub's toggle is the skill toggle the app's Skills page used
 * (skillToggle.ts, unchanged), now reached only from app://skills-hub
 * (os-ui/PLUGINS.md Part 4).
 *
 * The desktop client mounts all of them, replacing code-view/git's factory
 * with one that runs the git it found and logs to its own log file
 * (client/src/main/codeView.ts).
 */
export const BUNDLED_HANDLERS: Readonly<Record<string, HandlerFactory>> = {
  "paper-wiki/status": paperStatusApi,
  "code-view/git": codeGitApi,
  "skills-hub/toggle": skillToggleApi,
};

/**
 * Handlers the dev server does not mount (createRegistry's `skip`). A plugin
 * handler takes no token, and the dev server may be reached through a tunnel
 * (A3 in os-ui/PLUGINS.md): the Code view's returns project files' history and
 * contents, and Skills Hub's toggle writes skill installs, also in the home
 * folder, from any body the dev server parses (it has no 415). Neither page
 * has a frame URL in a browser anyway. The desktop client skips none.
 */
export const DESKTOP_ONLY_HANDLERS: ReadonlySet<string> = new Set(["code-view/git", "skills-hub/toggle"]);
