import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { apiPlugin } from "./api-plugin";

// https://vitejs.dev/config/
export default defineConfig({
  // apiPlugin serves every os-ui endpoint from one list, the plugin registry
  // (server/registry.ts): the file-write endpoints os-ui is authorized to
  // expose (DESIGN.md authorization boundary: the skill toggle, the Paper
  // Wiki reading status, and the paper-source switches and keys) and the
  // root-agent conversation (GOAL.md H2). It applies to `serve` only, so a
  // production build has no write surface at all.
  plugins: [react(), apiPlugin()],
});
