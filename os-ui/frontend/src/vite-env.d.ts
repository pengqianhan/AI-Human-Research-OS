/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Repository page linked from the menu bar; .github/workflows/pages.yml sets it. */
  readonly VITE_REPO_URL?: string;
}
