/**
 * True only on the dev server that start.sh runs: the one place os-ui's write
 * and agent endpoints exist (their Vite plugins apply to `serve` only). Every
 * production build — the public GitHub Pages site, a claude.ai snapshot — is a
 * read-only view, so it hides the controls that would call those endpoints.
 */
export const LIVE = import.meta.env.DEV;
