// Builds everything the desktop client loads into out/:
//   out/renderer/   the os-ui frontend (vite build), without the generator's
//                   state.json or the paper-wiki cache copy: both are read
//                   from the open workspace at run time;
//   out/main.cjs    the main process, bundled with the shared os-ui endpoints;
//   out/preload.cjs the window's bridge;
//   out/icon.png    the app icon, copied from docs/brand/app-icon.png.
//
// Usage: node scripts/build.mjs   (installs the frontend's packages on first run)
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const CLIENT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FRONTEND = resolve(CLIENT, "../frontend");
const REPO = resolve(CLIENT, "../..");
const OUT = join(CLIENT, "out");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function step(message) {
  console.log(`> ${message}`);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

if (!existsSync(join(FRONTEND, "node_modules", "vite"))) {
  step("installing os-ui/frontend packages (first build)");
  execFileSync(npm, ["ci", "--no-audit", "--no-fund"], { cwd: FRONTEND, stdio: "inherit", shell: process.platform === "win32" });
}

step("building the renderer (os-ui/frontend)");
execFileSync(process.execPath, [join(FRONTEND, "node_modules", "vite", "bin", "vite.js"), "build", "--outDir", join(OUT, "renderer"), "--emptyOutDir"], {
  cwd: FRONTEND,
  stdio: "inherit",
});
// public/ holds the dev server's caches; the client serves both from the workspace.
rmSync(join(OUT, "renderer", "state.json"), { force: true });
rmSync(join(OUT, "renderer", "paper-wiki"), { recursive: true, force: true });

step("bundling the main process and preload");
const common = { bundle: true, platform: "node", format: "cjs", target: "node22", external: ["electron"], sourcemap: true, logLevel: "warning" };
await build({ ...common, entryPoints: [join(CLIENT, "src/main/index.ts")], outfile: join(OUT, "main.cjs") });
await build({ ...common, entryPoints: [join(CLIENT, "src/preload/index.ts")], outfile: join(OUT, "preload.cjs") });

copyFileSync(join(REPO, "docs/brand/app-icon.png"), join(OUT, "icon.png"));
step(`done: ${OUT}`);
