import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { skillTogglePlugin } from "./skill-toggle-plugin";
import { chatPlugin } from "./chat-plugin";

// https://vitejs.dev/config/
export default defineConfig({
  // skillTogglePlugin serves the single write endpoint os-ui is authorized to
  // expose (GOAL.md M4). It applies to `serve` only, so a production build has
  // no write surface at all.
  // chatPlugin is the root-agent conversation (GOAL.md H2), also serve-only.
  plugins: [react(), skillTogglePlugin(), chatPlugin()],
});
