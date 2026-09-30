import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { skillTogglePlugin } from "./skill-toggle-plugin";
import { paperStatusPlugin } from "./paper-status-plugin";
import { chatPlugin } from "./chat-plugin";
import { paperSourcesPlugin } from "./paper-sources-plugin";

// https://vitejs.dev/config/
export default defineConfig({
  // skillTogglePlugin, paperStatusPlugin, and paperSourcesPlugin serve the
  // three file-write endpoints os-ui is authorized to expose (DESIGN.md
  // authorization boundary). They apply to `serve` only, so a production build
  // has no write surface at all. chatPlugin is the root-agent conversation
  // (GOAL.md H2), also serve-only.
  plugins: [react(), skillTogglePlugin(), paperStatusPlugin(), paperSourcesPlugin(), chatPlugin()],
});
