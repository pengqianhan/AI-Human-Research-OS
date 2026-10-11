import { desktop } from "./desktop";

/** True inside the desktop client (os-ui/client), whose preload provides window.osDesktop. */
export const DESKTOP = desktop !== null;

/**
 * True where os-ui's write and agent endpoints exist: the dev server that
 * start.sh runs (their Vite plugins apply to `serve` only) and the desktop
 * client, which serves the same endpoints in-process. Every other production
 * build — the public GitHub Pages site, a claude.ai snapshot — is a read-only
 * view, so it hides the controls that would call those endpoints.
 */
export const LIVE = import.meta.env.DEV || DESKTOP;
