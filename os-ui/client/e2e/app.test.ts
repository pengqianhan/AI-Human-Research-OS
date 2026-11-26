/**
 * End-to-end: the real Electron app, driven by Playwright, on a temporary copy
 * of this repository (without .git, so the OS's no-Git mode is exercised too).
 * Agent turns use os-harness's fake Claude CLI, so no login or quota is needed.
 *
 *   npm run build && npm run test:e2e          (Linux: under xvfb-run)
 *   OS_CLIENT_E2E_EXECUTABLE=release npm run test:e2e   (the unpacked app electron-builder left in release/)
 *   OS_CLIENT_E2E_EXECUTABLE=<path to an app binary> npm run test:e2e
 *   OS_CLIENT_E2E_DEREFERENCE=1 npm run test:e2e        (copy the workspace as on Windows: links replaced by what they point at)
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, truncateSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { crc32, deflateSync } from "node:zlib";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "playwright-core";
import type { ElectronApplication, Frame, Locator, Page } from "playwright-core";
import { sizeWords } from "../../frontend/plugins/assets-view/site/logic.ts";
import { PLUGIN_CSP } from "../src/main/protocol.ts";
import { HIDDEN_RUNS, hiddenPdf, HOSTILE_TITLE, HOSTILE_URI, hostilePdf, IMAGE_PAGE, imagePdf, manyPagesPdf, nestedFormsPdf, noPagesPdf, notAPdf, oddSizesPdf, passwordPdf, REMAP, transparencyGroupsPdf } from "./pdfFixtures.ts";

const CLIENT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = resolve(CLIENT, "../..");
const require = createRequire(import.meta.url);
const SLOW = { timeout: 180_000 };

/** Folders never copied into the test workspace: VCS data, dependencies, environments, build output, caches. */
const SKIP_NAMES = new Set(["node_modules", ".venv", ".cache", "__pycache__"]);
const SKIP_PATHS = new Set([
  ".git",
  "os-ui/client/out",
  "os-ui/client/release",
  "os-ui/frontend/dist",
  "os-ui/frontend/public/state.json",
  "os-ui/frontend/public/paper-wiki",
  "os-harness/sessions",
]);

function tempDir(prefix: string): string {
  return realpathSync.native(mkdtempSync(join(tmpdir(), prefix)));
}

/** The workspace is copied as on Windows, links replaced by what they point at: there, or anywhere with OS_CLIENT_E2E_DEREFERENCE=1. */
const DEREFERENCE = process.platform === "win32" || process.env.OS_CLIENT_E2E_DEREFERENCE === "1";

function copyWorkspace(): string {
  const dest = tempDir("os-client-ws-");
  cpSync(REPO, dest, {
    recursive: true,
    // Windows: a copied relative link to a folder can come out as a file
    // symlink, which Python cannot stat (WinError 5), so copy what the links
    // point at. Elsewhere keep the links as they are, as a checkout has them.
    // A copy made this way lists some hub skills twice (a collection's links
    // to its own skills become folders the generator finds), so the switch
    // lets another OS run the suite on the copy Windows gets.
    ...(DEREFERENCE ? { dereference: true } : { verbatimSymlinks: true }),
    filter: (src) => {
      const rel = relative(REPO, src).split("\\").join("/");
      return !SKIP_NAMES.has(basename(src)) && !SKIP_PATHS.has(rel);
    },
  });
  return dest;
}

function findPython(): string {
  for (const candidate of [process.env.PYTHON, "python3", "python"]) {
    if (!candidate) continue;
    const probe = spawnSync(candidate, ["-c", "import sys; print(sys.executable)"], { encoding: "utf8" });
    if (probe.status === 0) return probe.stdout.trim();
  }
  throw new Error("the E2E suite needs Python 3 for the fake agent CLI");
}

/**
 * A throwaway home folder, so the run never reads the developer's shell
 * profile or global skill folders (~/.claude/skills, ...) and never touches
 * them; uv keeps its real Python and cache folders so nothing is downloaded.
 */
/** The throwaway home of the last launch, where its global skill targets resolve. */
let throwawayHome: string | null = null;

function isolatedHome(): Record<string, string> {
  const home = tempDir("os-client-home-");
  throwawayHome = home;
  const env: Record<string, string> = { HOME: home };
  if (process.platform === "win32") env.USERPROFILE = home;
  for (const [name, args] of [
    ["UV_PYTHON_INSTALL_DIR", ["python", "dir"]],
    ["UV_CACHE_DIR", ["cache", "dir"]],
  ] as const) {
    const probe = spawnSync("uv", [...args], { encoding: "utf8" });
    if (probe.status === 0 && probe.stdout.trim() !== "") env[name] = process.env[name] ?? probe.stdout.trim();
  }
  return env;
}

/** Linux CI and root containers cannot use Chromium's sandbox; the app itself never disables it. */
function sandboxArgs(): string[] {
  const root = typeof process.getuid === "function" && process.getuid() === 0;
  return process.platform === "linux" && (root || process.env.OS_CLIENT_E2E_NO_SANDBOX === "1") ? ["--no-sandbox"] : [];
}

/** The executable electron-builder left unpacked in release/ for this platform. */
function releasedExecutable(): string {
  const release = join(CLIENT, "release");
  const dirs = existsSync(release) ? readdirSync(release) : [];
  const candidates =
    process.platform === "darwin"
      ? dirs.filter((d) => d.startsWith("mac")).map((d) => join(release, d, "Research OS.app", "Contents", "MacOS", "Research OS"))
      : process.platform === "win32"
        ? dirs.filter((d) => /^win.*unpacked$/.test(d)).map((d) => join(release, d, "Research OS.exe"))
        : dirs.filter((d) => /^linux.*unpacked$/.test(d)).map((d) => join(release, d, "research-os"));
  const found = candidates.find((c) => existsSync(c));
  if (found === undefined) throw new Error(`no unpacked app in ${release}; run electron-builder first`);
  return found;
}

async function launch(env: Record<string, string>): Promise<{ app: ElectronApplication; page: Page; logs: string[] }> {
  const requested = process.env.OS_CLIENT_E2E_EXECUTABLE;
  const packaged = requested === "release" ? releasedExecutable() : requested;
  const app = await electron.launch({
    executablePath: packaged ?? (require("electron") as string),
    args: [...(packaged ? [] : [CLIENT]), ...sandboxArgs()],
    env: { ...(process.env as Record<string, string>), ...isolatedHome(), OS_CLIENT_LOG_STDERR: "1", ...env },
    timeout: 90_000,
  });
  const logs: string[] = [];
  app.process().stderr?.on("data", (d: Buffer) => logs.push(d.toString()));
  const page = await app.firstWindow();
  page.on("console", (m) => logs.push(`console.${m.type()}: ${m.text()}`));
  // Playwright's page console does not carry every message of a plugin's frame
  // (another origin, so another process); the window's own console-message
  // event does, CSP reports included. Collected in the main process, read by consoleLog().
  await app.evaluate(({ BrowserWindow }) => {
    const seen: string[] = [];
    (globalThis as { __console?: string[] }).__console = seen;
    const win = BrowserWindow.getAllWindows()[0]!;
    win.webContents.on("console-message", (event) => seen.push(`frame ${event.frame?.url ?? "?"}: ${event.message}`));
  });
  return { app, page, logs };
}

/** A button of the left navigation, by name (the names hold when the sidebar is collapsed to icons). */
function nav(page: Page, name: string): Locator {
  return page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name, exact: true });
}

/** One page of the layout. Pages stay mounted, hidden, once opened, so scope locators to the one in view. */
function screen(page: Page, id: "home" | "projects" | "workspace" | "wiki" | "skills-hub/skills" | "plugins" | "settings"): Locator {
  return page.locator(`[data-screen="${id}"]`);
}

/** The frame of a plugin's page on its own origin ("app://paper-wiki/"), once it has loaded. */
async function pluginFrame(page: Page, origin: string): Promise<Frame> {
  for (let i = 0; i < 100; i++) {
    const frame = page.frames().find((f) => f.url().startsWith(origin));
    if (frame) {
      await frame.waitForLoadState("load");
      return frame;
    }
    await page.waitForTimeout(100);
  }
  throw new Error(`no frame on ${origin} ever loaded`);
}

const wikiFrame = (page: Page) => pluginFrame(page, "app://paper-wiki/");

/** The project the Code view checks open, and the files the suite adds under its Code/. */
const PROJECT = "nanochat_cpu";
/** A file name and a commit subject that would run script if any of them reached the DOM as markup. */
const MARKUP_NAME = "<img src=x onerror=window.top.__pwned=1>.txt";
const MARKUP_TEXT = `<script>window.top.__pwned=2</script><img src=x onerror="window.top.__pwned=3">`;
const MARKUP_SUBJECT = `e2e <img src=x onerror=window.top.__pwned=4> <script>window.__pwned=5</script>`;
/** Names the channel must take through encodeURIComponent: "+" would read as a space, "#" end the URL, "%" start an escape. */
const ODD_NAMES = ["a+b.txt", "has#hash.txt", "100%.txt", "with space.txt"];

function codeFixtures(workspace: string): void {
  const dir = join(workspace, "projects-folder", PROJECT, "Code", "e2e");
  mkdirSync(dir, { recursive: true });
  for (const name of ODD_NAMES) writeFileSync(join(dir, name), `content of ${name}\n`);
  // Windows refuses < and > in a file name; the subject below still carries the markup there.
  if (process.platform !== "win32") writeFileSync(join(dir, MARKUP_NAME), `${MARKUP_TEXT}\n`);
  writeFileSync(join(dir, ".env"), "SECRET=1\n");
  writeFileSync(join(dir, "binary.dat"), Buffer.from([0x89, 0x50, 0x00, 0x00, 0x01, 0x02]));
  // Sparse, so it costs no disk: the channel refuses it (413) by its size alone.
  writeFileSync(join(dir, "huge.txt"), "");
  truncateSync(join(dir, "huge.txt"), 33 * 1024 * 1024);
  writeFileSync(join(workspace, ".env"), "SECRET=1\n");
}

/**
 * The Skeleton view's fixtures: the frozen copies of nanochat_cpu's and the
 * template's paper_skeleton.md (os-ui/frontend/plugins/fixtures/README.md),
 * so what the suite pins (line 116, lines 113–119, line 83) is its own and not
 * the live file's. A second project, made from the template, in the temporary
 * workspace only.
 */
const SKELETON_FIXTURES = join(REPO, "os-ui", "frontend", "plugins", "fixtures");
const TEMPLATE_PROJECT = "skeleton_e2e";
/** A fixture's line `n` (from 1), whatever line endings the checkout gave it. */
const fixtureLine = (name: string, n: number) => readFileSync(join(SKELETON_FIXTURES, name), "utf8").split(/\r?\n/)[n - 1]!;

function skeletonFixtures(workspace: string): void {
  copyFileSync(join(SKELETON_FIXTURES, "nanochat_cpu.paper_skeleton.md"), join(workspace, "projects-folder", PROJECT, "paper_skeleton.md"));
  const made = join(workspace, "projects-folder", TEMPLATE_PROJECT);
  cpSync(join(workspace, "projects-folder", "templates", "ai_research_template"), made, { recursive: true });
  copyFileSync(join(SKELETON_FIXTURES, "template.paper_skeleton.md"), join(made, "paper_skeleton.md"));
}

/**
 * The Assets view's fixtures (os-ui/frontend/plugins/fixtures/README.md): a
 * project made from the template with the frozen copy of nanochat_cpu's
 * Figs/, Baselines/, Code/results/, Code/Datasets/, Code/README.md, and
 * paper_skeleton.md laid over it, so what the suite pins is its own and not
 * the live project's; the template project's asset folders as the frozen
 * template copy has them; and a project of hostile names and files. All in
 * the temporary workspace.
 */
const ASSETS_FIXTURES = join(SKELETON_FIXTURES, "assets_project");
const ASSETS_TEMPLATE = join(SKELETON_FIXTURES, "assets_template");
const ASSETS_PROJECT = "assets_e2e";
const ODD_PROJECT = "assets_odd";
/** The four places the Assets view lists. */
const ASSET_FOLDERS = ["Figs", "Baselines", "Code/results", "Code/Datasets"];
/** Names for the Assets view's groups (os-ui/PLUGINS.md Part 3, §6 "2.2"): "+", "#", "%", and a space, of four kinds. */
const ODD_ASSETS = ["a+b.csv", "has#hash.svg", "100%.json", "with space.md"];
/** A fixture line's text, whatever line endings the checkout gave it. */
const assetLines = (rel: string) => readFileSync(join(ASSETS_FIXTURES, rel), "utf8").split(/\r?\n/);
const lineWith = (lines: readonly string[], needle: string) => lines.findIndex((l) => l.includes(needle)) + 1;

const BOMB_PROJECT = "assets_bomb";
/** The review's SVG bomb: `levels` groups of `fan` <use> elements, each referencing the group below (1.2 KB at 6 × 10). */
function useBomb(levels: number, fan: number): string {
  let defs = `<g id="l0"><rect width="1" height="1"/></g>`;
  for (let l = 1; l <= levels; l++) defs += `<g id="l${l}">${Array.from({ length: fan }, () => `<use href="#l${l - 1}"/>`).join("")}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><defs>${defs}</defs><use href="#l${levels}"/></svg>\n`;
}

/** A small SVG picture with a caption (the caption is plain words, never a name). */
const svgPicture = (caption: string, fill: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="320" height="180" fill="${fill}"/><text x="16" y="96" font-family="sans-serif" font-size="22" fill="#1c1a17">${caption}</text></svg>\n`;

/** A PNG of `width` × `height` pixels of one colour. */
function png(width: number, height: number, rgb: readonly [number, number, number]): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // truecolour
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x++) row.set(rgb, 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", header), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

/** A project made from the template whose asset folders are `tree`'s (a fixture folder), or empty when it is null. */
function assetProject(workspace: string, name: string, tree: string | null): string {
  const projects = join(workspace, "projects-folder");
  const dir = join(projects, name);
  if (!existsSync(dir)) cpSync(join(projects, "templates", "ai_research_template"), dir, { recursive: true });
  for (const folder of ASSET_FOLDERS) rmSync(join(dir, folder), { recursive: true, force: true });
  if (tree !== null) cpSync(tree, dir, { recursive: true });
  return dir;
}

function assetsFixtures(workspace: string): void {
  const made = assetProject(workspace, ASSETS_PROJECT, ASSETS_FIXTURES);
  copyFileSync(join(SKELETON_FIXTURES, "nanochat_cpu.paper_skeleton.md"), join(made, "paper_skeleton.md"));
  // The template project the Skeleton view's tests made: its asset folders as the frozen template copy has them.
  assetProject(workspace, TEMPLATE_PROJECT, ASSETS_TEMPLATE);
  // Hostile names and files, each where the view lists it.
  const odd = assetProject(workspace, ODD_PROJECT, ASSETS_TEMPLATE);
  const put = (rel: string, content: string | Buffer) => {
    mkdirSync(dirname(join(odd, rel)), { recursive: true });
    writeFileSync(join(odd, rel), content);
  };
  const content: Record<string, string> = {
    "a+b.csv": "name,value\r\n\"a, b\",1\r\n\"say \"\"hi\"\"\",2\r\n",
    "has#hash.svg": svgPicture("has hash", "#dcebe8"),
    "100%.json": '{\n  "percent": 100\n}\n',
    "with space.md": "# With space\n\nA [link](https://link.invalid/x) and `code`.\n",
  };
  for (const folder of ["Figs", "Code/results"]) for (const name of ODD_ASSETS) put(`${folder}/${name}`, content[name]!);
  // Windows refuses < and > in a file name.
  if (process.platform !== "win32") {
    put(`Figs/${MARKUP_NAME}`, `${MARKUP_TEXT}\n`);
    put(`Figs/${MARKUP_NAME.replace(/\.txt$/, ".svg")}`, svgPicture("markup name", "#f3e6cc"));
    put(`Code/results/${MARKUP_NAME}`, `${MARKUP_TEXT}\n`);
  }
  // A name whose label is not the path: a no-break space (legal on every OS) is a marker in it.
  put("Code/results/no break.csv", "h\n1\n");
  // One name in two folders: two items.
  put("Figs/a/plot.svg", svgPicture("plot in a", "#e2efe1"));
  put("Figs/b/plot.svg", svgPicture("plot in b", "#f1e5cb"));
  // Sixty small pictures, for the queue.
  for (let k = 0; k < 60; k++) put(`Figs/e2e/p${String(k).padStart(2, "0")}.png`, png(48, 27, [40 + ((k * 37) % 200), 90 + ((k * 53) % 150), 120 + ((k * 29) % 120)]));
  // A cell with markup, a file the channel refuses (sparse, so it costs no disk), binary data, and a folder past the depth cap.
  put("Code/results/markup.csv", `cell,other\n"${MARKUP_TEXT.replace(/"/g, '""')}",2\n`);
  put("Code/results/huge.csv", "");
  truncateSync(join(odd, "Code/results/huge.csv"), 33 * 1024 * 1024);
  put("Code/results/binary.dat", Buffer.from([0x89, 0x50, 0x00, 0x00, 0x01, 0x02]));
  put("Code/results/deep/a/b/c/d/past-the-depth.txt", "deep\n");
  put("Code/results/deep/a/b/c/within-the-depth.txt", "within\n");
  // The reviewer's <use> bombs (review M2), in a project of their own: 6 levels of 10 in Figs/ (a card) and in
  // Code/results/ (a row), 5 of 10 (refused too, but quick enough to draw with Show), and a plain figure.
  const bombProject = assetProject(workspace, BOMB_PROJECT, ASSETS_TEMPLATE);
  const putBomb = (rel: string, content: string) => {
    mkdirSync(dirname(join(bombProject, rel)), { recursive: true });
    writeFileSync(join(bombProject, rel), content);
  };
  putBomb("Figs/bomb.svg", useBomb(6, 10));
  putBomb("Figs/five.svg", useBomb(5, 10));
  putBomb("Figs/plain.svg", svgPicture("plain", "#dcebe8"));
  putBomb("Code/results/bomb.svg", useBomb(6, 10));
  putBomb("Code/results/ok.json", "{}\n");
  // Code/README.md: a dataset table with markup and one name twice.
  put(
    "Code/README.md",
    ["# Code", "", "## Data", "", `Words before the table, with ${MARKUP_TEXT} in them.`, "", "| Data | Source | Used |", "|---|---|---|", `| first | [twice](https://data.invalid/one) | ${MARKUP_TEXT} |`, "| second | [twice](https://data.invalid/two) | b |", ""].join("\n"),
  );
}

/**
 * The Idea view's fixtures (os-ui/frontend/plugins/fixtures/README.md): the
 * project's own idea_graph.md is deleted in the copy of nanochat_cpu, so the view
 * first shows its empty state there, and the tests then write the mockup's graph
 * into the copy; what they pin is the fixture's, never the live file's.
 * Malformed, hostile, and changing files go to a project of their own, made from
 * the template (its empty idea_graph.md overwritten) with the frozen nanochat_cpu
 * skeleton, so they never change what the first checks.
 */
const IDEA_FIXTURES = join(SKELETON_FIXTURES, "idea_graph");
const IDEA_PROJECT = "idea_e2e";
/** An idea fixture's lines, whatever line endings the checkout gave it. */
const ideaLines = (name: string) => readFileSync(join(IDEA_FIXTURES, name), "utf8").split(/\r?\n/);
const IDEA_HEAD = "| ID | Kind | Statement | Status | Links | Points to | Source |\n|---|---|---|---|---|---|---|";

function ideaFixtures(workspace: string): void {
  rmSync(join(workspace, "projects-folder", PROJECT, "idea_graph.md"), { force: true });
  const made = join(workspace, "projects-folder", IDEA_PROJECT);
  cpSync(join(workspace, "projects-folder", "templates", "ai_research_template"), made, { recursive: true });
  copyFileSync(join(SKELETON_FIXTURES, "nanochat_cpu.paper_skeleton.md"), join(made, "paper_skeleton.md"));
  writeFileSync(join(made, "idea_graph.md"), ideaLines("example.idea_graph.md").join("\n"));
}

/**
 * Skills Hub's fixtures (os-ui/PLUGINS.md Part 4, §5 C2), in the temporary
 * workspace only. The toggle cases click copy-form skills' copies, so the
 * installer renames a SKILL.md on every OS (the copy of the workspace
 * dereferences links on Windows, which would make a symlink-form skill's
 * install a folder the installer does not toggle): one in the copy's own
 * .claude/skills, and one of two projects' copies of another skill (its own
 * collection, e2e-projects), the other project's copy left as it is. The orphan is in a fixture project's .claude/skills: the generator
 * lists an orphan of the repository's own folders without installs, so only
 * one found in another target has the toggle the handler refuses (F2); a
 * second one there has a folder name of shell syntax (HOSTILE_ORPHAN). A hub
 * skill's description carries markup. A collection of its own holds three
 * skills with one name (TWINS), two of them byte for byte the same, as a copy
 * made the Windows way lists a collection's links to its own skills.
 */
const SKILLS_COLLECTION = "e2e-copy";
const COPIED_SKILL = "e2e-copied";
const MARKUP_SKILL = "e2e-markup";
const ORPHAN_SKILL = "e2e-orphan";
/** A second orphan beside it, whose folder name is shell syntax (review, note 4): no command may carry it. */
const HOSTILE_ORPHAN = "e2e-o;echo INJECTED-$(id -u)";
/** The page's line where it offers no command (skills-hub site/logic.ts UNSAFE_COMMAND). */
const NO_COMMAND = "No command: a name here has characters a command cannot carry safely.";
/** A copy-form skill with a copy in each of two fixture projects: the suite disables and enables one project's install. */
const PROJECTS_COLLECTION = "e2e-projects";
const PROJECTS_SKILL = "e2e-in-projects";
/** A hub skill beside it whose description holds a bidi control (review, note 5), drawn as a marker. */
const BIDI_SKILL = "e2e-bidi";
const BIDI_TEXT = "Looks like \u202Eevil.exe\u202C text.";
const TWINS_COLLECTION = "e2e-twins";
const TWIN_SKILL = "e2e-twin";
/** The twins' folders under the collection, in the generator's order, and each one's description. */
const TWINS = [
  ["a", "One of two identical skills named e2e-twin."],
  ["b", "One of two identical skills named e2e-twin."],
  ["c", "A third skill named e2e-twin, with words of its own."],
] as const;
const skillMd = (name: string, description: string) => `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\nAn end-to-end fixture.\n`;

function skillsFixtures(workspace: string): void {
  const hub = join(workspace, "research-skills-hub", SKILLS_COLLECTION);
  mkdirSync(join(hub, COPIED_SKILL), { recursive: true });
  mkdirSync(join(hub, MARKUP_SKILL), { recursive: true });
  // research-skill-installer's install_form reads this line (install_research_skill.py install_form).
  writeFileSync(join(hub, "SOURCE.md"), "# e2e-copy\n\nInstall form: `copy`\n");
  writeFileSync(join(hub, COPIED_SKILL, "SKILL.md"), skillMd(COPIED_SKILL, "A copy-form skill the end-to-end suite disables and enables again."));
  writeFileSync(join(hub, MARKUP_SKILL, "SKILL.md"), skillMd(MARKUP_SKILL, MARKUP_TEXT));
  // Its one install: a byte-for-byte copy, in the workspace's .claude/skills (target repo-claude).
  const installed = join(workspace, ".claude", "skills", COPIED_SKILL);
  mkdirSync(installed, { recursive: true });
  copyFileSync(join(hub, COPIED_SKILL, "SKILL.md"), join(installed, "SKILL.md"));
  const orphan = join(workspace, "projects-folder", TEMPLATE_PROJECT, ".claude", "skills", ORPHAN_SKILL);
  mkdirSync(orphan, { recursive: true });
  writeFileSync(join(orphan, "SKILL.md"), skillMd(ORPHAN_SKILL, "An install with no hub source."));
  const hostile = join(workspace, "projects-folder", TEMPLATE_PROJECT, ".claude", "skills", HOSTILE_ORPHAN);
  mkdirSync(hostile, { recursive: true });
  writeFileSync(join(hostile, "SKILL.md"), skillMd("hostile-orphan", "An orphan whose folder name is shell syntax."));
  const projects = join(workspace, "research-skills-hub", PROJECTS_COLLECTION);
  mkdirSync(join(projects, PROJECTS_SKILL), { recursive: true });
  writeFileSync(join(projects, "SOURCE.md"), `# ${PROJECTS_COLLECTION}\n\nInstall form: \`copy\`\n`);
  writeFileSync(join(projects, PROJECTS_SKILL, "SKILL.md"), skillMd(PROJECTS_SKILL, "A copy-form skill installed in two projects; the suite toggles one project's install."));
  mkdirSync(join(projects, BIDI_SKILL), { recursive: true });
  writeFileSync(join(projects, BIDI_SKILL, "SKILL.md"), skillMd(BIDI_SKILL, BIDI_TEXT));
  for (const project of [TEMPLATE_PROJECT, IDEA_PROJECT]) {
    const there = join(workspace, "projects-folder", project, ".claude", "skills", PROJECTS_SKILL);
    mkdirSync(there, { recursive: true });
    copyFileSync(join(projects, PROJECTS_SKILL, "SKILL.md"), join(there, "SKILL.md"));
  }
  for (const [folder, description] of TWINS) {
    const twin = join(workspace, "research-skills-hub", TWINS_COLLECTION, folder, TWIN_SKILL);
    mkdirSync(twin, { recursive: true });
    writeFileSync(join(twin, "SKILL.md"), skillMd(TWIN_SKILL, description));
  }
}

/** The home folder the suite's git commands share; removed with the workspace. */
let gitHome: string | null = null;

/** git, hermetic: no user or system config, a fixed author and committer, no signing. */
function git(cwd: string, args: string[]): string {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined && !/^git_/i.test(k)) env[k] = v;
  if (gitHome === null) {
    gitHome = tempDir("os-client-git-home-");
    writeFileSync(join(gitHome, "empty.gitconfig"), "");
  }
  const home = gitHome;
  Object.assign(env, {
    HOME: home,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: join(home, "empty.gitconfig"),
    GIT_AUTHOR_NAME: "E2E Author",
    GIT_AUTHOR_EMAIL: "e2e@example.invalid",
    GIT_COMMITTER_NAME: "E2E Author",
    GIT_COMMITTER_EMAIL: "e2e@example.invalid",
    GIT_AUTHOR_DATE: "2026-11-20T12:00:00Z",
    GIT_COMMITTER_DATE: "2026-11-20T12:00:00Z",
  });
  const run = spawnSync("git", ["-c", "commit.gpgsign=false", "-c", "core.autocrlf=false", ...args], { cwd, env, encoding: "utf8" });
  if (run.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${run.stderr}`);
  return run.stdout;
}

/** The suite needs the Git the Code view's handler accepts; without it, it fails rather than pass with nothing checked. */
function requireGit(): void {
  const probe = spawnSync("git", ["--version"], { encoding: "utf8" });
  const m = /^git version (\d+)\.(\d+)/.exec(probe.stdout ?? "");
  if (m === null || Number(m[1]) < 2 || (Number(m[1]) === 2 && Number(m[2]) < 45)) {
    throw new Error(`the Code view's end-to-end checks need Git 2.45 or later on PATH (the handler's floor); found: ${probe.stdout?.trim() || probe.error?.message || "no git"}`);
  }
}

/** Saves a screenshot when OS_CLIENT_E2E_SHOTS names a folder (the reviewer compares them with mockup C). */
async function shot(page: Page, name: string): Promise<void> {
  const dir = process.env.OS_CLIENT_E2E_SHOTS;
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: join(dir, `${name}.png`) });
}

/** A script's hash as Chromium names it when it refuses the script inline ("a hash ('sha256-…')"). */
function scriptHash(text: string): string {
  return `'sha256-${createHash("sha256").update(text).digest("base64")}'`;
}

/** The script each plugin frame's inline-script probe appends; the frame's policy (no 'unsafe-inline') must refuse it. */
const INLINE_PROBE = "window.__inline = 1";
const INLINE_PROBE_HASH = scriptHash(INLINE_PROBE);

/**
 * A console or log line the final policy check fails on: a Content-Security-Policy
 * report none of the suite's own probes caused. A probe's report is known by what
 * it names, not by when it arrives.
 */
function unexpectedCspReport(line: string): boolean {
  return (
    /Refused to|Content Security Policy/.test(line) &&
    // The isolation probes, which the policies are meant to refuse.
    !line.includes("example.com") &&
    !line.includes("research-os/api") &&
    !line.includes("paper-wiki/api") &&
    !line.includes("code-view/api") &&
    !line.includes("skills-hub/api") &&
    !line.includes("csp-canary.invalid") &&
    // The inline-script probes, by their script's hash: another inline script has another.
    !line.includes(INLINE_PROBE_HASH)
  );
}

describe("the final policy check's filter, without the app", () => {
  // An inline-script probe's own report, verbatim as case 76 failed on it once on CI (it arrived after the probe's trim).
  const CI_LINE =
    "console.error: Executing inline script violates the following Content Security Policy directive 'script-src 'self''. Either the 'unsafe-inline' keyword, a hash ('sha256-SlHSUXvpUrZZqHBPWfdJaR/1l5NR39l5yPTcF2NGT3I='), or a nonce ('nonce-...') is required to enable inline execution. The action has been blocked.";

  test("an inline-script probe's report is exempt, whenever it arrives", () => {
    assert.equal(unexpectedCspReport(CI_LINE), false);
  });

  test("the same report as the main process sees it, from a plugin's frame, is exempt", () => {
    assert.equal(unexpectedCspReport(CI_LINE.replace("console.error: ", "frame app://code-view/index.html?project=nanochat_cpu: ")), false);
  });

  test("the same refusal of another inline script, with its own hash, is flagged", () => {
    const other = CI_LINE.replace("'sha256-SlHSUXvpUrZZqHBPWfdJaR/1l5NR39l5yPTcF2NGT3I='", scriptHash("window.__inline = 2"));
    assert.notEqual(other, CI_LINE);
    assert.equal(unexpectedCspReport(other), true);
  });

  test("the isolation probes' reports stay exempt", () => {
    for (const line of [
      "frame app://paper-wiki/viz.html: Fetch API cannot load https://example.com/. Refused to connect because it violates the document's Content Security Policy.",
      `console.error: Connecting to 'app://research-os/api/chat/sessions?cwd=' violates the following Content Security Policy directive: "connect-src 'self'". The action has been blocked.`,
      `frame app://code-view/index.html?project=nanochat_cpu: Connecting to 'app://paper-wiki/api/paper-wiki/status' violates the following Content Security Policy directive: "connect-src 'self'". The action has been blocked.`,
      "console.error: Fetch API cannot load app://code-view/api/code-view/git/log?project=nanochat_cpu. Refused to connect because it violates the document's Content Security Policy.",
      `frame app://paper-wiki/viz.html: Connecting to 'app://skills-hub/api/skills-hub/toggle' violates the following Content Security Policy directive: "connect-src 'self'". The action has been blocked.`,
      `console.error: Loading the image 'https://csp-canary.invalid/x.png' violates the following Content Security Policy directive: "img-src 'self' data:". The action has been blocked.`,
    ]) {
      assert.equal(unexpectedCspReport(line), false, line);
    }
  });

  test("an ordinary refusal is flagged", () => {
    assert.equal(
      unexpectedCspReport(`console.error: Refused to load the stylesheet 'https://fonts.invalid/a.css' because it violates the following Content Security Policy directive: "style-src 'self'".`),
      true,
    );
  });
});

describe("desktop client on a Research OS folder", () => {
  let workspace: string;
  let userData: string;
  let sessions: string;
  let app: ElectronApplication;
  let page: Page;
  let logs: string[];

  before(async () => {
    workspace = copyWorkspace();
    codeFixtures(workspace);
    skeletonFixtures(workspace);
    assetsFixtures(workspace);
    ideaFixtures(workspace);
    skillsFixtures(workspace);
    userData = tempDir("os-client-data-");
    sessions = tempDir("os-client-sessions-");
    ({ app, page, logs } = await launch({
      OS_CLIENT_WORKSPACE: workspace,
      OS_CLIENT_USER_DATA: userData,
      OS_HARNESS_SESSIONS: sessions,
      OS_HARNESS_CLAUDE: JSON.stringify([findPython(), join(workspace, "os-harness", "tests", "fake_claude.py")]),
    }));
  }, SLOW);

  after(async () => {
    await app?.close();
    if (process.env.OS_CLIENT_E2E_KEEP !== "1") {
      for (const dir of [workspace, userData, sessions, gitHome]) if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  /** Every console message of the window's frames, plugin frames included, as the main process saw them. */
  const consoleLog = () => app.evaluate(() => [...((globalThis as { __console?: string[] }).__console ?? [])]);

  /** What the app knows about itself, for a failure message: its info() and the tail of its log. */
  async function diagnostics(): Promise<string> {
    const info = await page.evaluate(() => window.osDesktop?.info()).catch((error: Error) => `info() failed: ${error.message}`);
    return `--- osDesktop.info() ---\n${JSON.stringify(info, null, 2)}\n--- app log (tail) ---\n${logs.join("").slice(-6000)}`;
  }

  test("opens Home with a freshly generated snapshot", SLOW, async () => {
    try {
      // The sidebar footer names the build next to the snapshot time.
      await page.getByText("Desktop client", { exact: true }).waitFor({ timeout: 150_000 });
    } catch (error) {
      throw new Error(`${(error as Error).message}\n${await diagnostics()}`);
    }
    assert.ok(existsSync(join(workspace, "os-ui", "frontend", "public", "state.json")), "the generator wrote state.json in the workspace");
    await screen(page, "home").getByRole("heading", { name: "Home", exact: true }).waitFor();
    await screen(page, "home").getByRole("heading", { name: "Projects", exact: true }).waitFor();
    assert.equal(await nav(page, "Home").getAttribute("aria-current"), "page");
    const title = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.getTitle());
    assert.equal(title, "Research OS");
    assert.equal(page.url(), "app://research-os/");
  });

  test("Settings shows the folder and a working Python", SLOW, async () => {
    await nav(page, "Settings").click();
    await page.getByTestId("workspace").filter({ hasText: workspace }).waitFor();
    await page.locator('[data-check="workspace"][data-state="ok"]').waitFor();
    await page.locator('[data-check="python"][data-state="ok"]').waitFor({ timeout: 150_000 });
  });

  test("Help → System and Prerequisites opens Settings", async () => {
    await nav(page, "Home").click();
    await screen(page, "home").getByRole("heading", { name: "Home", exact: true }).waitFor();
    // Click the real menu item, so the menu → IPC command → layout path is exercised.
    const clicked = await app.evaluate(({ Menu }) => {
      const find = (items: Electron.MenuItem[]): Electron.MenuItem | undefined =>
        items.map((i) => (i.label === "System and Prerequisites" ? i : i.submenu ? find(i.submenu.items) : undefined)).find((i) => i !== undefined);
      const item = find(Menu.getApplicationMenu()?.items ?? []);
      item?.click();
      return item !== undefined;
    });
    assert.ok(clicked, "the Help menu has System and Prerequisites");
    await screen(page, "settings").getByRole("heading", { name: "Settings", exact: true }).waitFor();
    assert.equal(await nav(page, "Settings").getAttribute("aria-current"), "page");
  });

  test("a root-agent turn runs through os-harness without a token prompt", SLOW, async () => {
    await nav(page, "Home").click();
    // Home's root-agent bar opens in place to the whole conversation.
    const root = page.getByRole("region", { name: "Root agent", exact: true });
    const toggle = root.getByRole("button", { name: "Open conversation" });
    await toggle.click();
    assert.equal(await root.getByRole("button", { name: "Close conversation" }).getAttribute("aria-expanded"), "true");
    await root.getByRole("complementary", { name: "Conversations" }).waitFor();
    const composer = root.locator('textarea[placeholder^="Message"]');
    await composer.waitFor();
    assert.equal(await page.locator('input[placeholder="token"]').count(), 0, "the client supplies its own token");
    await composer.fill("hello from e2e");
    await root.getByRole("button", { name: "Send", exact: true }).click();
    await root.getByText("echo: hello from e2e", { exact: false }).first().waitFor({ timeout: 90_000 });
    assert.equal(readdirSync(sessions).filter((f) => f.endsWith(".jsonl")).length, 1);
  });

  test("a project workspace shows its conversation and its views", SLOW, async () => {
    await nav(page, "Projects").click();
    const open = screen(page, "projects").getByRole("button", { name: /^Open workspace: / }).first();
    const name = (await open.getAttribute("aria-label"))!.replace("Open workspace: ", "");
    await open.click();
    const ws = screen(page, "workspace");
    await ws.getByRole("heading", { name, exact: true }).waitFor();
    assert.equal(await nav(page, name).getAttribute("aria-current"), "page", "Quick access marks the open project");
    // Overview is the default tab and holds the project overview.
    assert.equal(await ws.getByRole("tab", { name: "Overview" }).getAttribute("aria-selected"), "true");
    await ws.getByText("Round score track").waitFor();
    // The project's own conversation, with its session list, in projects-folder/<name>.
    const chat = ws.getByRole("region", { name: `${name} agent`, exact: true });
    const list = chat.getByRole("button", { name: /^Conversations/ });
    await list.click();
    assert.equal(await list.getAttribute("aria-expanded"), "true");
    // The root agent's turn ran at the repository root, so this project's list is empty.
    await chat.getByText("No conversations here yet.").waitFor();
    await list.click();
    await chat.locator('textarea[placeholder^="Message"]').waitFor();
    assert.equal(await page.locator('input[placeholder="token"]').count(), 0);
    // Code is the code-view plugin's page on its own origin (Paper, Idea, Skeleton, and Assets, each its plugin's, have their own tests below).
    await ws.getByRole("tab", { name: "Code" }).click();
    const code = await pluginFrame(page, "app://code-view/");
    assert.equal(code.url(), `app://code-view/index.html?project=${encodeURIComponent(name)}`);
    await code.getByText(`${name}/Code/`, { exact: true }).waitFor();
    // No tab is a later step's badge any more: Idea is the idea-view plugin's.
    assert.equal(await ws.getByRole("tab", { name: "Idea", exact: true }).getAttribute("aria-disabled"), null);
    assert.equal(await ws.getByRole("tab", { name: /step 2/ }).count(), 0);
    await ws.getByRole("tab", { name: "Overview" }).click();
    // The conversation collapses to a strip and opens again.
    await ws.getByRole("button", { name: "Collapse conversation" }).click();
    const strip = ws.getByRole("button", { name: "Open conversation" });
    assert.equal(await strip.getAttribute("aria-expanded"), "false");
    await strip.click();
    await chat.waitFor();
  });

  /** The project's workspace with its Code tab open, and the Code view's frame. */
  async function openCode(): Promise<{ ws: Locator; code: Frame }> {
    await nav(page, "Projects").click();
    await screen(page, "projects").getByRole("button", { name: `Open workspace: ${PROJECT}` }).click();
    const ws = screen(page, "workspace");
    await ws.getByRole("heading", { name: PROJECT, exact: true }).waitFor();
    await ws.getByRole("tab", { name: "Code" }).click();
    const code = await pluginFrame(page, `app://code-view/index.html?project=${PROJECT}`);
    return { ws, code };
  }
  const pwned = async (code: Frame) => [await page.evaluate(() => (window as { __pwned?: unknown }).__pwned), await code.evaluate(() => (window as { __pwned?: unknown }).__pwned)];

  test("the Code view's Files: Code/ through the read channel, every name and line as text", SLOW, async () => {
    const { code } = await openCode();
    await code.locator(".tree-root").filter({ hasText: `${PROJECT}/Code/` }).waitFor();
    // README.md opens first; its first line is a Markdown heading.
    await code.locator(".vpath").filter({ hasText: /^Code\/README\.md$/ }).waitFor();
    await code.locator(".row.hd .tx").filter({ hasText: "# Code: nanochat CPU example" }).waitFor();
    await shot(page, "1-files-with-a-file-open");

    // Chinese text arrives intact.
    const zh = readFileSync(join(workspace, "projects-folder", PROJECT, "Code", "README_zh.md"), "utf8").split(/\r?\n/).find((l) => /[一-鿿]/.test(l))!;
    await code.locator(".tnode").filter({ hasText: /^README_zh\.md$/ }).click();
    await code.locator(".row .tx").filter({ hasText: zh }).first().waitFor();

    // Names that only an encoded query reaches.
    await code.locator(".tnode.dir").filter({ hasText: /^e2e$/ }).click();
    for (const name of ODD_NAMES) {
      await code.locator(".tnode").filter({ hasText: name }).click();
      await code.locator(".row .tx").filter({ hasText: `content of ${name}` }).waitFor();
    }
    // A dot file is never listed; binary and oversized files get their own screen.
    assert.equal(await code.locator(".tnode").filter({ hasText: ".env" }).count(), 0);
    await code.locator(".tnode").filter({ hasText: "binary.dat" }).click();
    await code.getByText("Not a text file").waitFor();
    await code.locator(".tnode").filter({ hasText: "huge.txt" }).click();
    await code.getByText("Too large to show").waitFor();

    // Markup in a file's name and in its text stays text.
    // The workspace takes at most 10 selections a second from a view; the clicks above came quickly.
    await page.waitForTimeout(1100);
    if (process.platform !== "win32") {
      await code.locator(".tnode .tname").filter({ hasText: MARKUP_NAME }).click();
      await code.locator(".row .tx").filter({ hasText: MARKUP_TEXT }).waitFor();
      await page.locator("[data-selection-label]").filter({ hasText: `Code/e2e/${MARKUP_NAME}` }).waitFor();
    }
    assert.equal(await code.evaluate(() => document.querySelectorAll("img, script:not([src])").length), 0, "no element came from a name or a file");
    assert.equal(await page.locator('img[src="x"]').count(), 0);
    assert.deepEqual(await pwned(code), [undefined, undefined]);
  });

  test("the Code view's frame is sealed off: no bridge, its own read roots and endpoint only", SLOW, async () => {
    const { code } = await openCode();
    const status = (url: string) => code.evaluate(async (u) => (await fetch(u)).status, url);
    const rel = (p: string) => `./_os/files?path=${encodeURIComponent(p)}`;
    assert.deepEqual(
      {
        readme: await status(rel(`projects-folder/${PROJECT}/Code/README.md`)),
        plus: await status(rel(`projects-folder/${PROJECT}/Code/e2e/a+b.txt`)),
        outsideCode: await status(rel(`projects-folder/${PROJECT}/AGENTS.md`)),
        dotEnvRoot: await status(rel(".env")),
        dotEnvCode: await status(rel(`projects-folder/${PROJECT}/Code/e2e/.env`)),
        listing: await status(`./_os/list?path=${encodeURIComponent(`projects-folder/${PROJECT}/Code`)}`),
        badProject: await status("/api/code-view/git/log?project=..%2Fx"),
        badHash: await status(`/api/code-view/git/diff?project=${PROJECT}&hash=--output%3Dx&path=index.md`),
        chat: await status("/api/chat/sessions"),
        wikiStatus: await status("/api/paper-wiki/status"),
      },
      { readme: 200, plus: 200, outsideCode: 404, dotEnvRoot: 404, dotEnvCode: 404, listing: 200, badProject: 400, badHash: 400, chat: 404, wikiStatus: 404 },
    );
    const probe = await code.evaluate(async () => {
      const outcome = async (fn: () => Promise<unknown>) => {
        try {
          return String(await fn());
        } catch (error) {
          return `blocked: ${(error as Error).name}`;
        }
      };
      return {
        own: typeof (window as { osDesktop?: unknown }).osDesktop,
        parent: await outcome(async () => typeof (window.parent as Window & { osDesktop?: unknown }).osDesktop),
        appApi: await outcome(async () => (await fetch("app://research-os/api/chat/sessions?cwd=")).status),
        wikiOrigin: await outcome(async () => (await fetch("app://paper-wiki/api/paper-wiki/status")).status),
      };
    });
    assert.equal(probe.own, "undefined");
    assert.match(probe.parent, /^blocked: SecurityError/);
    assert.match(probe.appApi, /^blocked/);
    assert.match(probe.wikiOrigin, /^blocked/);
    // No inline script runs in the page (PLUGIN_CSP has no 'unsafe-inline'), whatever reaches its DOM.
    const inline = await code.evaluate((text) => {
      const script = document.createElement("script");
      script.textContent = text;
      document.body.append(script);
      script.remove();
      return (window as { __inline?: unknown }).__inline;
    }, INLINE_PROBE);
    assert.equal(inline, undefined, "an inline script ran in the Code view's page");
    // The frame's CSP reports reach the suite, so the final check sees this frame too.
    await code.evaluate(() => {
      const img = new Image();
      img.src = "https://csp-canary.invalid/x.png";
      document.body.append(img);
      img.remove();
    });
    const canary = (lines: string[]) => lines.some((l) => /csp-canary\.invalid.*Content Security Policy/.test(l));
    for (let i = 0; i < 50 && !canary(await consoleLog()); i++) await page.waitForTimeout(100);
    assert.ok(canary(await consoleLog()), "a CSP violation inside the Code view's frame is seen");
  });

  test("the Code view's Changes: no repository, then a commit, its files and a diff", SLOW, async () => {
    requireGit();
    const { code } = await openCode();
    await code.getByRole("button", { name: "Changes", exact: true }).click();
    await code.getByText("No history to show").waitFor();
    await shot(page, "4-no-history-to-show");

    const dir = join(workspace, "projects-folder", PROJECT);
    rmSync(join(dir, "Code", "e2e", "huge.txt"));
    git(dir, ["init", "-q", "-b", "main"]);
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-q", "-m", "e2e: the project as copied"]);
    writeFileSync(join(dir, "Code", "README.md"), `${readFileSync(join(dir, "Code", "README.md"), "utf8")}A line the e2e commit adds.\n`);
    writeFileSync(join(dir, "Code", "e2e", "pic.bin"), Buffer.concat([Buffer.from([0, 1, 2, 3]), Buffer.alloc(1000, 7)]));
    writeFileSync(join(dir, "Code", "e2e", ".hidden"), "a dot file\n");
    git(dir, ["add", "-A"]);
    git(dir, ["commit", "-q", "-m", MARKUP_SUBJECT]);
    const hash = git(dir, ["rev-parse", "HEAD"]).trim();

    await code.getByRole("button", { name: "Try again" }).click();
    const problem = code.getByText("Git cannot be used here");
    const commit = code.locator(".commit").filter({ hasText: MARKUP_SUBJECT });
    await Promise.race([commit.waitFor(), problem.waitFor()]);
    if (await problem.isVisible()) throw new Error(`the handler refused git: ${await code.locator(".placeholder p").textContent()}`);
    assert.equal(await code.locator(".commit").count(), 2);
    assert.equal(await code.locator(".cmd").textContent(), `git -C projects-folder/${PROJECT} log -- .`);
    await commit.click();
    // Its files: a text file, a binary one with its sizes, and a dot file that is listed but not opened.
    const fstat = code.locator(".fstat");
    await fstat.getByRole("button", { name: "Code/README.md", exact: true }).waitFor();
    await fstat.getByText("Bin 0 → 1004 bytes").waitFor();
    await fstat.locator(".fpath.closed").filter({ hasText: "Code/e2e/.hidden" }).waitFor();
    assert.equal(await fstat.getByRole("button", { name: "Code/e2e/.hidden" }).count(), 0);
    await fstat.getByText("3 files changed, 2 insertions(+)").waitFor();
    // The first text file's diff opens.
    await code.getByText("Diff · Code/README.md").waitFor();
    await code.locator(".drow.add .tx").filter({ hasText: "+A line the e2e commit adds." }).waitFor();
    assert.equal(await code.locator(".cmeta .mono").textContent(), hash);
    await shot(page, "2-changes-with-a-commit-and-a-diff");
    assert.equal(await code.evaluate(() => document.querySelectorAll("img, script:not([src])").length), 0);
    assert.deepEqual(await pwned(code), [undefined, undefined]);
  });

  test("a selection becomes a reference chip in the composer, and nothing is sent", SLOW, async () => {
    const sessionFiles = readdirSync(sessions).length;
    const { ws, code } = await openCode();
    const bar = ws.getByRole("region", { name: "Selection" });
    const chat = ws.getByRole("region", { name: `${PROJECT} agent`, exact: true });
    const chips = chat.getByRole("list", { name: "References" }).getByRole("listitem");

    // A message from anything but the view's frame is ignored.
    if ((await bar.count()) > 0) await bar.getByRole("button", { name: "Clear selection" }).click();
    assert.equal(await bar.count(), 0);
    await page.evaluate(() => window.postMessage({ type: "os.select", label: "forged by the host page" }, "*"));
    await page.waitForTimeout(300);
    assert.equal(await bar.count(), 0);

    await code.getByRole("button", { name: "Files", exact: true }).click();
    await code.locator(".tnode").filter({ hasText: /^README\.md$/ }).first().click();
    const line = readFileSync(join(workspace, "projects-folder", PROJECT, "Code", "README.md"), "utf8").split(/\r?\n/)[2]!;
    await code.locator('.row[data-line="3"]').click();
    await bar.getByText("Code/README.md:3", { exact: true }).waitFor();
    // Before asking, the bar shows the start of the text that would be quoted, as text on the page.
    const barText = (await bar.textContent()) ?? "";
    await shot(page, "5-ask-bar-before-asking");
    await bar.getByRole("button", { name: "Ask the agent about this" }).click();
    await chips.filter({ hasText: "Code/README.md:3" }).waitFor();
    // The cursor moves to the composer on the next frame.
    await page.waitForFunction((label) => document.activeElement?.getAttribute("aria-label") === label, `Message ${PROJECT} agent`, { timeout: 5000 });
    assert.ok(barText.includes(line.slice(0, 40)), `the ask bar shows the quote's start: ${JSON.stringify(barText)}`);
    // The Code view quotes what it draws, so its chip is added closed (the Human Owner's decision, 2026-11-23):
    // the label, its line count, and the hint; the quote's text is not on screen until the chip is clicked.
    const sent = `About Code/README.md:3\n> ${line}`;
    const shown = chat.locator("[data-reference-preview]");
    await chat.getByText("click a reference to see exactly what is sent", { exact: false }).waitFor();
    await page.waitForTimeout(300); // a chip that opened by itself would have opened by now
    assert.equal(await shown.count(), 0, "the Code view's chip starts closed");
    assert.equal(await chat.getByText(line.slice(0, 40), { exact: false }).count(), 0, "the quote's text is not on screen");
    assert.match((await chips.first().textContent()) ?? "", /Code\/README\.md:3\s*· 1 line/);
    await shot(page, "6-composer-after-asking");
    await chat.getByRole("button", { name: "Show what will be sent for Code/README.md:3" }).click();
    assert.equal(await shown.textContent(), sent, "a click shows exactly what Send would pass");
    assert.equal(await chat.locator("[data-reference-overflow]").count(), 0, "a text that fits its box says nothing about scrolling");
    await shot(page, "6b-composer-after-a-click");
    await chat.getByRole("button", { name: "Show what will be sent for Code/README.md:3" }).click();
    assert.equal(await shown.count(), 0, "a second click closes it");
    assert.equal(await chips.first().getAttribute("title"), sent);
    assert.equal(await bar.count(), 0, "asking clears the selection");

    await code.getByRole("button", { name: "Changes", exact: true }).click();
    const commit = code.locator(".commit.on");
    await commit.click(); // the open commit: selects it
    const short = (await commit.locator(".h").textContent())!;
    await bar.getByText(short, { exact: true }).waitFor();
    await bar.getByRole("button", { name: "Ask the agent about this" }).click();
    await chips.filter({ hasText: short }).waitFor();
    await page.waitForTimeout(300);
    assert.equal(await chat.locator("[data-reference-preview]").count(), 0, "a second Code view chip is added closed too");

    // A chip opens what it will send, as plain text in the composer: exactly the reference's text.
    await chat.getByRole("button", { name: "Show what will be sent for Code/README.md:3" }).click();
    const preview = chat.locator("[data-reference-preview]");
    assert.equal(await preview.textContent(), `About Code/README.md:3\n> ${line}`);

    await code.locator(".drow.add").first().click();
    await bar.getByText(`${short} · Code/README.md · added line`, { exact: false }).waitFor();
    await shot(page, "3-selection-ask-bar-and-chips");
    await bar.getByRole("button", { name: "Clear selection" }).click();
    assert.equal(await bar.count(), 0);
    assert.equal(await code.locator(".picked").count(), 0, "clearing in the workspace clears the view's highlight");

    assert.equal(await chips.count(), 2);
    await chat.getByRole("button", { name: "Remove reference Code/README.md:3" }).click();
    const left = await chips.allTextContents();
    assert.equal(left.length, 1);
    assert.ok(left[0]!.startsWith(short), left[0]);
    // A long quote: its text scrolls in its box, and a line under it says so.
    await code.getByRole("button", { name: "Files", exact: true }).click();
    await code.locator(".tnode").filter({ hasText: /^README\.md$/ }).first().click();
    await code.locator('.row[data-line="40"]').waitFor();
    await page.waitForTimeout(1100); // the workspace takes at most 10 selections a second from a view
    await code.evaluate(() => {
      const rows = document.querySelectorAll(".code-in .row");
      const first = rows[0]!.querySelector(".tx")!;
      const last = rows[39]!.querySelector(".tx")!;
      const range = document.createRange();
      range.setStart(first.firstChild!, 0);
      range.setEnd(last.firstChild!, last.textContent!.length);
      const selection = getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      first.closest(".code-in")!.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    });
    await bar.getByText("Code/README.md:1–40", { exact: true }).waitFor();
    await bar.getByRole("button", { name: "Ask the agent about this" }).click();
    await chips.filter({ hasText: "Code/README.md:1–40" }).waitFor();
    await chat.getByRole("button", { name: "Show what will be sent for Code/README.md:1–40" }).click();
    await chat.locator("[data-reference-preview]").filter({ hasText: "About Code/README.md:1–40" }).waitFor();
    const overflow = chat.locator("[data-reference-overflow]");
    await overflow.waitFor({ timeout: 5000 });
    assert.match((await overflow.textContent()) ?? "", /^\d+ lines · [\d,]+ characters — scroll to read all of it$/);
    await shot(page, "7-long-quote-scroll-note");

    assert.equal(readdirSync(sessions).length, sessionFiles, "no message was sent");
  });

  test("every answer of the handler has its screen: busy, a refusal, a failure, more, and what was cut", SLOW, async () => {
    const { code } = await openCode();
    await code.getByRole("button", { name: "Changes", exact: true }).click();
    // Canned answers for the next requests to the handler, in order; anything else goes through.
    await code.evaluate(() => {
      const real = window.fetch.bind(window);
      const queue: Record<string, { status: number; body: unknown }[]> = {};
      (window as { __answers?: typeof queue }).__answers = queue;
      window.fetch = async (input, init) => {
        const route = /\/api\/code-view\/git\/(\w*)\?/.exec(String(input))?.[1];
        const next = route === undefined ? undefined : queue[route]?.shift();
        if (next === undefined) return real(input, init);
        return new Response(JSON.stringify(next.body), { status: next.status, headers: { "Content-Type": "application/json" } });
      };
    });
    const answer = (route: string, status: number, body: unknown) =>
      code.evaluate(
        ([r, s, b]) => {
          const queue = (window as { __answers?: Record<string, unknown[]> }).__answers!;
          (queue[r as string] ??= []).push({ status: s, body: b });
        },
        [route, status, body] as const,
      );
    const source = { repo: "project", root: `projects-folder/${PROJECT}`, filter: "." };
    const hash = "1".repeat(40);
    const one = { hash, short: "1111111", date: "2026-11-21", subject: "a canned commit", files: 5, added: 9, deleted: 0 };
    const reload = () => code.locator(".cmdrow").getByRole("button", { name: "Reload" }).click();

    await answer("log", 503, { error: "the Code view is busy with other requests; try again" });
    await answer("log", 200, { ...source, commits: [one], more: true });
    await reload();
    await code.getByText("Not available right now").waitFor();
    await code.getByText("the Code view is busy with other requests; try again").waitFor();
    await code.getByRole("button", { name: "Try again" }).click();
    await code.locator(".commit").filter({ hasText: "a canned commit" }).waitFor();

    await answer("log", 500, { error: "git log failed (exit 128)" });
    await code.getByRole("button", { name: "Load more" }).click();
    await code.getByText("Git could not read this project's history").waitFor();
    await code.getByText("git log failed (exit 128)").waitFor();

    await answer("commit", 200, {
      ...source,
      hash,
      short: "1111111",
      date: "2026-11-21",
      author: "Canned",
      subject: "a canned commit",
      body: "",
      files: [{ path: "Code/a.txt", status: "M", added: 9, deleted: 0, sizes: null, openable: true }],
      stat: { files: 5, added: 9, deleted: 0 },
      truncated: true,
    });
    await answer("diff", 200, { ...source, hash, path: "Code/a.txt", diff: "diff --git a/Code/a.txt b/Code/a.txt\n@@ -1 +1 @@\n-a\n+b\n", truncated: true });
    await code.locator(".commit").filter({ hasText: "a canned commit" }).click();
    await code.getByText("This commit changes 5 files; the list shows the first 1.").waitFor();
    await code.getByText("This diff is longer than 1 MiB; only its beginning is shown.").waitFor();

    await answer("diff", 404, { error: '"Code/a.txt" is not a file that commit 1111111 changes' });
    await code.locator(".fstat").getByRole("button", { name: "Code/a.txt" }).click();
    await code.getByText("This change is no longer in the history").waitFor();
    await code.getByRole("button", { name: "Reload the list" }).waitFor();

    await answer("log", 200, { repo: null, problem: "Git 2.39.5 is too old for the Code view, which needs Git 2.45.0 or later; see Settings" });
    await reload();
    await code.getByText("Git cannot be used here").waitFor();
    await code.getByText("Git 2.39.5 is too old for the Code view, which needs Git 2.45.0 or later; see Settings").waitFor();
    // Nothing canned is left: the real history comes back.
    await code.getByRole("button", { name: "Try again" }).click();
    await code.locator(".commit").filter({ hasText: MARKUP_SUBJECT }).waitFor();
  });

  test("a frame sent to a file it cannot show starts no download", SLOW, async () => {
    const { code } = await openCode();
    const downloads = tempDir("os-client-downloads-");
    await app.evaluate(({ app: electronApp, session }, dir) => {
      electronApp.setPath("downloads", dir);
      const seen: boolean[] = [];
      (globalThis as { __downloads?: boolean[] }).__downloads = seen;
      // Registered after the client's own listener: records whether it cancelled, then cancels anyway (no Save dialog).
      session.defaultSession.on("will-download", (event, item) => {
        seen.push(event.defaultPrevented);
        if (!event.defaultPrevented) item.cancel();
      });
    }, downloads);
    await code.evaluate((url) => {
      location.href = url;
    }, `./_os/files?path=${encodeURIComponent(`projects-folder/${PROJECT}/Code/e2e/binary.dat`)}`);
    let seen: boolean[] = [];
    for (let i = 0; i < 50 && seen.length === 0; i++) {
      await page.waitForTimeout(100);
      seen = await app.evaluate(() => (globalThis as { __downloads?: boolean[] }).__downloads ?? []);
    }
    assert.deepEqual(seen, [true], "the client cancelled the download");
    assert.deepEqual(readdirSync(downloads), []);
  });

  /** The project's workspace with its Paper tab open, and the Paper view's frame once the paper is drawn. */
  async function openPaper(): Promise<{ ws: Locator; paper: Frame }> {
    await nav(page, "Projects").click();
    await screen(page, "projects").getByRole("button", { name: `Open workspace: ${PROJECT}` }).click();
    const ws = screen(page, "workspace");
    await ws.getByRole("heading", { name: PROJECT, exact: true }).waitFor();
    await ws.getByRole("tab", { name: "Paper" }).click();
    const paper = await pluginFrame(page, `app://paper-view/index.html?project=${PROJECT}`);
    return { ws, paper };
  }
  const paperDir = () => join(workspace, "projects-folder", PROJECT, "paper");
  /** Drags across an element's text, as a reader selects it; Playwright's boxes are in the window's coordinates, frames included. */
  async function dragAcross(target: Locator): Promise<void> {
    await target.scrollIntoViewIfNeeded();
    const box = (await target.boundingBox())!;
    await page.mouse.move(box.x + 1, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
    await page.mouse.move(box.x + box.width - 1, box.y + box.height / 2, { steps: 4 });
    await page.mouse.up();
  }
  /** The README's SHA-256 for each vendored file. */
  const vendorHashes = () =>
    new Map(
      [...readFileSync(join(REPO, "os-ui/frontend/plugins/paper-view/site/vendor/README.md"), "utf8").matchAll(/^\| `([^`]+)` \| `[^`]+` \| `([0-9a-f]{64})` \|$/gm)].map((m) => [m[1]!, m[2]!]),
    );

  test("the Paper view draws paper/main.pdf on app://paper-view: canvases near the view, its text, pages, and zoom", SLOW, async () => {
    const { ws, paper } = await openPaper();
    assert.equal(paper.url(), `app://paper-view/index.html?project=${PROJECT}`);
    // The tab row as mockup C has it.
    assert.deepEqual(
      (await ws.getByRole("tablist", { name: "Project views" }).getByRole("tab").allTextContents()).map((t) => t.replace(/step 2$/, "").trim()),
      ["Overview", "Idea", "Code", "Skeleton", "Assets", "Paper"],
    );
    await paper.locator('.sheet[data-page="1"] canvas.pg').waitFor({ timeout: 60_000 });
    // PDF.js's text layer holds the paper's own words, selectable.
    await paper.locator('.sheet[data-page="1"] .textLayer').getByText("nanochat on a Laptop CPU", { exact: false }).first().waitFor();
    await paper.getByText("Page 1 of 4", { exact: true }).waitFor();
    assert.match((await paper.locator(".paperbar .grp").nth(1).locator(".lbl2").textContent())!, /^Fit · \d+%$/);
    assert.equal(await paper.getByRole("button", { name: "Fit width" }).getAttribute("aria-pressed"), "true");
    // Only pages near the view are drawn.
    assert.equal(await paper.locator('.sheet[data-page="4"] canvas.pg').count(), 0, "page 4 is not drawn while page 1 shows");
    // The paper embeds its fonts, and none of them reaches Chromium as a FontFace (disableFontFace; the policy would not stop one).
    assert.equal(await paper.evaluate(() => document.fonts.size), 0, "no font from the PDF was loaded");
    await shot(page, "5-paper-page-1-fit-width");

    await paper.getByRole("button", { name: "Next page" }).click();
    await paper.getByText("Page 2 of 4", { exact: true }).waitFor();
    await paper.locator('.sheet[data-page="2"] canvas.pg').waitFor();
    const before = await paper.locator('.sheet[data-page="2"]').evaluate((s) => s.getBoundingClientRect().width);
    await paper.getByRole("button", { name: "Zoom in" }).click();
    await paper.getByRole("button", { name: "Zoom in" }).click();
    const label = (await paper.locator(".paperbar .grp").nth(1).locator(".lbl2").textContent())!;
    assert.match(label, /^\d+%$/, "a zoom step leaves Fit");
    assert.equal(await paper.getByRole("button", { name: "Fit width" }).getAttribute("aria-pressed"), "false");
    const after = await paper.locator('.sheet[data-page="2"]').evaluate((s) => s.getBoundingClientRect().width);
    assert.ok(Math.abs(after / before - Number(label.replace("%", "")) / 100 / (before / 640)) < 0.02, `${before} → ${after} at ${label}`);
    // The canvas is drawn again for the new size, not stretched: as many pixels as the sheet's CSS pixels times the display's ratio.
    await paper.waitForFunction(() => {
      const sheet = document.querySelector('.sheet[data-page="2"]') as HTMLElement;
      const canvas = sheet.querySelector("canvas.pg") as HTMLCanvasElement | null;
      return canvas !== null && Math.abs(canvas.width - Math.floor(sheet.offsetWidth * devicePixelRatio)) <= 2;
    });
    await paper.getByText("Page 2 of 4", { exact: true }).waitFor();
    await shot(page, "6-paper-page-2-zoomed");
    // Another tab hides the frame; coming back, the reader is where they were.
    await ws.getByRole("tab", { name: "Overview" }).click();
    await ws.getByText("Round score track").waitFor();
    await ws.getByRole("tab", { name: "Paper" }).click();
    await page.waitForTimeout(300);
    await paper.getByText("Page 2 of 4", { exact: true }).waitFor();
    assert.equal(await paper.locator(".paperbar .grp").nth(1).locator(".lbl2").textContent(), label);

    // At the highest zoom the canvas stays under its pixel cap, and far pages' canvases are released.
    for (let i = 0; i < 12; i++) await paper.getByRole("button", { name: "Zoom in" }).click();
    await paper.getByText("300%", { exact: true }).waitFor();
    const nextPage = paper.getByRole("button", { name: "Next page" });
    for (let i = 0; i < 4 && !(await nextPage.isDisabled()); i++) await nextPage.click();
    await paper.getByText("Page 4 of 4", { exact: true }).waitFor();
    await paper.locator('.sheet[data-page="4"] canvas.pg').waitFor();
    const pixels = await paper.locator('.sheet[data-page="4"] canvas.pg').evaluate((c: HTMLCanvasElement) => c.width * c.height);
    assert.ok(pixels <= 4096 * 4096, `page 4's canvas holds ${pixels} pixels`);
    assert.equal(await paper.locator('.sheet[data-page="1"] canvas.pg').count(), 0, "page 1's canvas was released");
    assert.equal(await paper.getByRole("button", { name: "Next page" }).isDisabled(), true);

    await paper.getByRole("button", { name: "Fit width" }).click();
    await paper.getByRole("button", { name: "Previous page" }).click();
    await paper.getByRole("button", { name: "Previous page" }).click();
    await paper.getByRole("button", { name: "Previous page" }).click();
    await paper.getByText("Page 1 of 4", { exact: true }).waitFor();
    assert.equal(await paper.getByRole("button", { name: "Previous page" }).isDisabled(), true);
    await paper.locator('.sheet[data-page="1"] canvas.pg').waitFor();
  });

  test("selected paper text becomes the ask bar and a reference chip, cut to the host's limits; nothing is sent", SLOW, async () => {
    const sessionFiles = readdirSync(sessions).length;
    const { ws, paper } = await openPaper();
    const bar = ws.getByRole("region", { name: "Selection" });
    const chat = ws.getByRole("region", { name: `${PROJECT} agent`, exact: true });
    const chips = chat.getByRole("list", { name: "References" }).getByRole("listitem");
    await paper.locator('.sheet[data-page="1"] .textLayer span').first().waitFor({ timeout: 60_000 });
    if ((await bar.count()) > 0) await bar.getByRole("button", { name: "Clear selection" }).click();
    for (let i = (await chips.count()) - 1; i >= 0; i--) await chips.nth(i).getByRole("button", { name: /^Remove reference / }).click();

    // A run of text under the "Setup" heading of page 1.
    const index = await paper.evaluate(() => {
      const spans = [...document.querySelectorAll('.sheet[data-page="1"] .textLayer span')];
      const heading = spans.findIndex((s) => s.textContent?.trim() === "Setup");
      return spans.findIndex((s, i) => i > heading && (s.textContent ?? "").trim().length > 25);
    });
    assert.ok(index > 0, "page 1 has text under its Setup heading");
    const run = paper.locator('.sheet[data-page="1"] .textLayer span').nth(index);
    await page.waitForTimeout(1100); // the workspace takes at most 10 selections a second from a view
    await dragAcross(run);
    const selected = (await paper.evaluate(() => window.getSelection()?.toString() ?? "")).trim();
    assert.ok(selected.length > 10, `the drag selected ${JSON.stringify(selected)}`);
    const label = bar.locator("[data-selection-label]");
    await label.filter({ hasText: "paper/main.pdf p. 1 · Setup" }).waitFor();
    assert.equal(await label.textContent(), "paper/main.pdf p. 1 · Setup");
    assert.equal(await label.getAttribute("title"), selected, "the bar's tooltip is the quote");

    // Before asking, the bar shows the start of the quote and its size as text on the page.
    const glimpse = (await bar.locator("[data-selection-quote]").textContent())!;
    assert.ok(glimpse.startsWith(selected.slice(0, 20)) && glimpse.endsWith(`1 line · ${selected.length} characters`), glimpse);
    await bar.getByRole("button", { name: "Ask the agent about this" }).click();
    await chips.filter({ hasText: "paper/main.pdf p. 1 · Setup" }).waitFor();
    assert.equal(await bar.count(), 0, "asking clears the selection");
    assert.equal(await paper.evaluate(() => window.getSelection()?.isCollapsed), true, "and the page's own");
    // The chip just added shows what it will send, with no click.
    const preview = chat.locator("[data-reference-preview]");
    await preview.waitFor({ timeout: 5000 });
    assert.equal(await preview.textContent(), `About paper/main.pdf p. 1 · Setup\n${selected.split(/\r?\n/).map((l) => (l === "" ? ">" : `> ${l}`)).join("\n")}`);

    // Select again: the bar, the chip, and what it will send, together.
    await page.waitForTimeout(1100);
    await dragAcross(paper.locator('.sheet[data-page="1"] .textLayer span').filter({ hasText: "nanochat on a Laptop CPU" }).first());
    await label.waitFor();
    assert.equal(await label.textContent(), "paper/main.pdf p. 1", "the title comes before the first heading");
    await shot(page, "7-paper-selection-ask-bar-and-chip");

    // Clearing in the frame hides the bar; clearing in the workspace clears the frame.
    await paper.locator(".paper-scroll").click({ position: { x: 6, y: 6 } });
    await bar.waitFor({ state: "detached" });
    await page.waitForTimeout(1100);
    await dragAcross(paper.locator('.sheet[data-page="1"] .textLayer span').filter({ hasText: "nanochat on a Laptop CPU" }).first());
    await label.waitFor();
    await bar.getByRole("button", { name: "Clear selection" }).click();
    await paper.waitForFunction(() => window.getSelection()?.isCollapsed === true);
    // Reload drops the text the selection was in, and the bar with it. From the
    // keyboard, so no pointer press clears the selection before Reload does.
    await page.waitForTimeout(1100);
    await dragAcross(paper.locator('.sheet[data-page="1"] .textLayer span').filter({ hasText: "nanochat on a Laptop CPU" }).first());
    await label.waitFor();
    await page.waitForTimeout(600); // past the page's 400 ms settle timer, so only Reload can clear the bar
    await paper.getByRole("button", { name: "Reload" }).press("Enter");
    await bar.waitFor({ state: "detached" });
    await paper.locator('.sheet[data-page="1"] .textLayer span').filter({ hasText: "nanochat on a Laptop CPU" }).first().waitFor({ timeout: 60_000 });

    // A selection of the whole paper is cut on the page, before the host's 2,000 characters, with a visible mark.
    await page.waitForTimeout(1100);
    await paper.locator('.sheet[data-page="1"] .textLayer span').first().click();
    await paper.evaluate(() => {
      const range = document.createRange();
      range.selectNodeContents(document.querySelector(".pages")!);
      window.getSelection()!.removeAllRanges();
      window.getSelection()!.addRange(range);
      document.dispatchEvent(new MouseEvent("mouseup"));
    });
    // The label names the pages whose text is quoted: those whose text layer is built (near the view).
    await label.filter({ hasText: /^paper\/main\.pdf pp\. 1–[2-4]$/ }).waitFor();
    const quote = (await label.getAttribute("title"))!;
    assert.ok(quote.length <= 2000 && quote.endsWith("…[cut]"), `${quote.length} characters, ending ${JSON.stringify(quote.slice(-12))}`);
    await bar.getByRole("button", { name: "Clear selection" }).click();

    assert.equal(await chips.count(), 1);
    await chat.getByRole("button", { name: "Remove reference paper/main.pdf p. 1 · Setup" }).click();
    assert.equal(await chips.count(), 0);
    assert.equal(readdirSync(sessions).length, sessionFiles, "no message was sent");
  });

  test("paper text selected just before Home is shown is still in the ask bar back in the workspace, as the page still selects it", SLOW, async () => {
    const sessionFiles = readdirSync(sessions).length;
    const size = await windowSize({ width: 1440, height: 900 });
    const { ws, paper } = await openPaper();
    const bar = ws.getByRole("region", { name: "Selection" });
    const label = bar.locator("[data-selection-label]");
    const title = paper.locator('.sheet[data-page="1"] .textLayer span').filter({ hasText: "nanochat on a Laptop CPU" }).first();
    type Timed = { __realSetTimeout?: typeof window.setTimeout; __settled: number[] };
    try {
      await title.waitFor({ timeout: 60_000 });
      await clearAsk(ws, PROJECT);
      // Each run of the page's 400 ms settle timer (main.ts) records whether the page was laid out then (its scroller's boxes).
      await paper.evaluate(() => {
        const w = window as unknown as Timed;
        w.__settled = [];
        const real = (w.__realSetTimeout ??= window.setTimeout);
        const settle = (fn: () => void) => () => {
          w.__settled.push(document.querySelector(".paper-scroll")!.getClientRects().length);
          fn();
        };
        const timed = (fn: () => void, ms?: number, ...rest: unknown[]) => real(ms === 400 ? settle(fn) : fn, ms, ...rest);
        window.setTimeout = timed as unknown as typeof window.setTimeout;
      });
      await page.waitForTimeout(1100); // the workspace takes at most 10 selections a second from a view
      await dragAcross(title);
      await label.waitFor();
      const before = await label.evaluate((l) => ({ label: l.textContent, quote: l.getAttribute("title") }));
      // Home at once: the settle timer fires while the workspace, and this frame, are hidden.
      await nav(page, "Home").click();
      await screen(page, "home").getByRole("heading", { name: "Home", exact: true }).waitFor();
      await page.waitForTimeout(2000);
      await nav(page, "Projects").click();
      await screen(page, "projects").getByRole("button", { name: `Open workspace: ${PROJECT}` }).click();
      await ws.getByRole("heading", { name: PROJECT, exact: true }).waitFor();
      await page.waitForTimeout(800);
      const settled = await paper.evaluate(() => (window as unknown as Timed).__settled);
      assert.ok(settled.includes(0), `the page's settle timer ran while it was hidden (its scroller's boxes at each run: ${JSON.stringify(settled)})`);
      const selected = (await paper.evaluate(() => window.getSelection()?.toString() ?? "")).trim();
      const after = (await bar.count()) === 0 ? null : await label.evaluate((l) => ({ label: l.textContent, quote: l.getAttribute("title") }));
      const says = `back in the workspace the ask bar holds ${JSON.stringify(after)} and the page selects ${JSON.stringify(selected)}; before Home the bar held ${JSON.stringify(before)}`;
      assert.ok(selected.length > 10, says);
      assert.deepEqual(after, before, says);
      assert.equal(after?.quote, selected, says);
      assert.equal(readdirSync(sessions).length, sessionFiles, "nothing was sent");
    } finally {
      if (await bar.isVisible()) await bar.getByRole("button", { name: "Clear selection" }).click();
      await paper.evaluate(() => {
        const w = window as unknown as Timed;
        if (w.__realSetTimeout !== undefined) window.setTimeout = w.__realSetTimeout;
        window.getSelection()?.removeAllRanges();
      });
      await windowSize(size);
    }
    assert.equal(await paper.evaluate(() => window.getSelection()?.isCollapsed ?? true), true, "nothing is selected after");
    assert.equal(await bar.count(), 0, "and the ask bar is gone");
  });

  test("every state of paper/ has its screen; Reload reads the file again", SLOW, async () => {
    const { ws, paper } = await openPaper();
    const pdf = join(paperDir(), "main.pdf");
    const kept = join(paperDir(), "main.pdf.e2e-kept");
    const reload = () => paper.getByRole("button", { name: "Reload" }).click();
    const again = () => paper.getByRole("button", { name: "Try again" }).click();
    await paper.locator('.sheet[data-page="1"] canvas.pg').waitFor({ timeout: 60_000 });
    renameSync(pdf, kept);
    try {
      await reload();
      await paper.getByText("The paper has not been built yet: paper/main.tex exists, paper/main.pdf does not.", { exact: true }).waitFor();
      await shot(page, "8-paper-not-built-yet");
      // paper/main.tex can still be asked about.
      await page.waitForTimeout(1100);
      await paper.getByRole("button", { name: "paper/main.tex" }).click();
      const bar = ws.getByRole("region", { name: "Selection" });
      await bar.locator("[data-selection-label]").filter({ hasText: /^paper\/main\.tex$/ }).waitFor();
      await bar.getByRole("button", { name: "Clear selection" }).click();
      await paper.locator(".fileref.picked").waitFor({ state: "detached" });

      for (const [bytes, words] of [
        [notAPdf(), "paper/main.pdf could not be opened (it is not a valid PDF file)."],
        [passwordPdf(), "paper/main.pdf is protected by a password, and the Paper view does not open protected files."],
        [noPagesPdf(), "paper/main.pdf opened, but it has no pages to show."],
      ] as const) {
        writeFileSync(pdf, bytes);
        await again();
        await paper.getByText(words, { exact: true }).waitFor();
      }
      // Sparse, so it costs no disk: the channel refuses it (413) by its size alone.
      writeFileSync(pdf, "");
      truncateSync(pdf, 33 * 1024 * 1024);
      await again();
      await paper.getByText("paper/main.pdf is larger than 32 MiB, the most the Paper view reads.", { exact: true }).waitFor();
      rmSync(pdf);
      renameSync(paperDir(), `${paperDir()}.e2e-kept`);
      try {
        await again();
        await paper.getByText("This project has no paper/ folder.", { exact: true }).waitFor();
      } finally {
        renameSync(`${paperDir()}.e2e-kept`, paperDir());
      }
    } finally {
      rmSync(pdf, { force: true });
      renameSync(kept, pdf);
    }
    await again();
    await paper.locator('.sheet[data-page="1"] canvas.pg').waitFor({ timeout: 60_000 });
    await paper.getByText("Page 1 of 4", { exact: true }).waitFor();
  });

  test("a hostile PDF runs nothing, follows no link, and its outline title shows as text", SLOW, async () => {
    const { ws, paper } = await openPaper();
    const pdf = join(paperDir(), "main.pdf");
    const kept = join(paperDir(), "main.pdf.e2e-kept");
    // Every navigation any frame asks for, and every "open in your browser?" dialog, recorded in the main process.
    await app.evaluate(({ BrowserWindow, dialog }) => {
      const seen: string[] = [];
      (globalThis as { __navigations?: string[] }).__navigations = seen;
      BrowserWindow.getAllWindows()[0]!.webContents.on("will-frame-navigate", (event) => seen.push(event.url));
      dialog.showMessageBox = (async (...args: unknown[]) => {
        seen.push(`dialog: ${JSON.stringify(args.at(-1))}`);
        return { response: 1, checkboxChecked: false };
      }) as typeof dialog.showMessageBox;
    });
    renameSync(pdf, kept);
    try {
      writeFileSync(pdf, hostilePdf());
      await paper.getByRole("button", { name: "Reload" }).click();
      await paper.locator('.sheet[data-page="1"] canvas.pg').waitFor({ timeout: 60_000 });
      await paper.getByText("Page 1 of 1", { exact: true }).waitFor();
      const link = paper.locator(".textLayer span").filter({ hasText: "Click this line" });
      await link.click();
      await link.dblclick();
      await page.waitForTimeout(800);
      const navigations = await app.evaluate(() => (globalThis as { __navigations?: string[] }).__navigations ?? []);
      assert.deepEqual(navigations.filter((u) => u.includes(HOSTILE_URI) || u.includes("example.invalid")), [], "the link annotation is inert");
      assert.equal(paper.url(), `app://paper-view/index.html?project=${PROJECT}`);
      // The outline title is the heading the title text falls under: in the label, as text.
      await page.waitForTimeout(1100);
      await dragAcross(paper.locator(".textLayer span").filter({ hasText: "Hostile fixture title" }));
      const label = ws.getByRole("region", { name: "Selection" }).locator("[data-selection-label]");
      await label.filter({ hasText: "paper/main.pdf p. 1 · " }).waitFor();
      assert.equal(await label.textContent(), `paper/main.pdf p. 1 · ${HOSTILE_TITLE}`);
      await ws.getByRole("region", { name: "Selection" }).getByRole("button", { name: "Clear selection" }).click();
      assert.equal(await paper.evaluate(() => document.querySelectorAll("img, script:not([src]), a, iframe, embed, object").length), 0, "nothing in the frame came from the PDF as markup");
      assert.equal(await page.locator('img[src="x"]').count(), 0);
      assert.deepEqual(await pwned(paper), [undefined, undefined], "the PDF's JavaScript did not run");
    } finally {
      rmSync(pdf, { force: true });
      renameSync(kept, pdf);
    }
    await paper.getByRole("button", { name: "Reload" }).click();
    await paper.getByText("Page 1 of 4", { exact: true }).waitFor({ timeout: 60_000 });
  });

  /** Drags from the start of one element to the end of another, as a reader selects several lines. */
  async function dragFromTo(from: Locator, to: Locator): Promise<void> {
    await from.scrollIntoViewIfNeeded();
    const a = (await from.boundingBox())!;
    const b = (await to.boundingBox())!;
    await page.mouse.move(a.x + 1, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move((a.x + b.x) / 2, (a.y + b.y + b.height) / 2, { steps: 6 });
    await page.mouse.move(b.x + b.width - 1, b.y + b.height / 2, { steps: 6 });
    await page.mouse.up();
  }

  test("text the page does not show but its text layer holds is on screen before Send: in the ask bar, then in the composer", SLOW, async () => {
    const sessionFiles = readdirSync(sessions).length;
    const { ws, paper } = await openPaper();
    const bar = ws.getByRole("region", { name: "Selection" });
    const chat = ws.getByRole("region", { name: `${PROJECT} agent`, exact: true });
    const chips = chat.getByRole("list", { name: "References" }).getByRole("listitem");
    const pdf = join(paperDir(), "main.pdf");
    const kept = join(paperDir(), "main.pdf.e2e-kept");
    const remapped = `${REMAP.A}${REMAP.B}${REMAP.C}`;
    renameSync(pdf, kept);
    try {
      writeFileSync(pdf, hiddenPdf());
      await paper.getByRole("button", { name: "Reload" }).click();
      await paper.getByText("Page 1 of 1", { exact: true }).waitFor({ timeout: 60_000 });
      await paper.locator(".textLayer span").filter({ hasText: "VISIBLE-END" }).waitFor();
      if ((await bar.count()) > 0) await bar.getByRole("button", { name: "Clear selection" }).click();
      for (let i = (await chips.count()) - 1; i >= 0; i--) await chips.nth(i).getByRole("button", { name: /^Remove reference / }).click();
      await page.waitForTimeout(1100);
      await dragFromTo(paper.locator(".textLayer span").filter({ hasText: "VISIBLE-START" }).first(), paper.locator(".textLayer span").filter({ hasText: "VISIBLE-END" }).first());
      // What a PDF's selection quotes is its text layer: the hidden runs and the remapped sentence are in it.
      const selected = (await paper.evaluate(() => window.getSelection()?.toString() ?? "")).trim();
      for (const run of [...HIDDEN_RUNS, remapped]) assert.ok(selected.includes(run), `the text layer holds ${run}`);
      const lines = selected.split(/\r?\n/).length;

      // Before asking: the bar shows the quote's start, hidden runs included, and its whole size, as text on the page.
      const glimpse = bar.locator("[data-selection-quote]");
      await glimpse.waitFor();
      const shownBefore = (await glimpse.textContent())!;
      assert.ok(shownBefore.startsWith(`VISIBLE-START first line ↵ ${HIDDEN_RUNS[0]}`), shownBefore);
      assert.ok(shownBefore.endsWith(`${lines} lines · ${selected.length} characters`), shownBefore);
      assert.ok(await glimpse.isVisible());
      await shot(page, "9-hidden-text-ask-bar-before-asking");

      // After asking: every hidden run and the remapped sentence are text in the composer, with no click or hover.
      await bar.getByRole("button", { name: "Ask the agent about this" }).click();
      await chips.filter({ hasText: "paper/main.pdf p. 1" }).waitFor();
      const shown = chat.locator("[data-reference-preview]");
      await shown.waitFor({ timeout: 5000 });
      assert.ok(await shown.isVisible());
      const sent = (await shown.textContent())!;
      for (const run of [...HIDDEN_RUNS, remapped]) assert.ok(sent.includes(`> ${run}`), `the composer shows ${run}: ${sent}`);
      await shot(page, "10-hidden-text-composer-after-asking");
      await chips.first().getByRole("button", { name: /^Remove reference / }).click();
      assert.equal(readdirSync(sessions).length, sessionFiles, "nothing was sent");
    } finally {
      rmSync(pdf, { force: true });
      renameSync(kept, pdf);
    }
    await paper.getByRole("button", { name: "Reload" }).click();
    await paper.getByText("Page 1 of 4", { exact: true }).waitFor({ timeout: 60_000 });
  });

  test("a selection that only touches a page boundary is labelled by the pages and heading of the text it quotes", SLOW, async () => {
    const { ws, paper } = await openPaper();
    const bar = ws.getByRole("region", { name: "Selection" });
    await paper.getByText(/^Page \d of 4$/).waitFor({ timeout: 60_000 });
    await paper.evaluate(() => {
      const scroller = document.querySelector(".paper-scroll") as HTMLElement;
      scroller.scrollTop = (document.querySelector('.sheet[data-page="2"]') as HTMLElement).offsetTop - 300;
    });
    await paper.locator('.sheet[data-page="2"] .textLayer span').nth(2).waitFor({ timeout: 30_000 });
    await paper.locator('.sheet[data-page="1"] .textLayer span').last().waitFor({ timeout: 30_000 });
    if ((await bar.count()) > 0) await bar.getByRole("button", { name: "Clear selection" }).click();
    await page.waitForTimeout(1100);
    // From just after the last character of page 1's text to inside page 2's: page 1 contributes nothing to the quote.
    const quote = await paper.evaluate(() => {
      const texts = (root: Element) => {
        const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const out: Text[] = [];
        while (walk.nextNode()) if ((walk.currentNode as Text).data.trim() !== "") out.push(walk.currentNode as Text);
        return out;
      };
      const one = texts(document.querySelector('.sheet[data-page="1"] .textLayer')!);
      const two = texts(document.querySelector('.sheet[data-page="2"] .textLayer')!);
      const last = one[one.length - 1]!;
      const range = document.createRange();
      range.setStart(last, last.data.length);
      range.setEnd(two[2]!, two[2]!.data.length);
      window.getSelection()!.removeAllRanges();
      window.getSelection()!.addRange(range);
      document.dispatchEvent(new MouseEvent("mouseup"));
      return window.getSelection()!.toString();
    });
    const label = bar.locator("[data-selection-label]");
    await label.waitFor({ timeout: 10_000 });
    assert.equal(await label.textContent(), "paper/main.pdf p. 2 · Setup", `quote ${JSON.stringify(quote)}`);
    await bar.getByRole("button", { name: "Clear selection" }).click();
  });

  test("two Reloads at once leave one document, every page drawn, and one PDF.js worker", SLOW, async () => {
    const { paper } = await openPaper();
    await paper.getByText(/^Page \d of 4$/).waitFor({ timeout: 60_000 });
    await paper.evaluate(() => {
      (document.querySelector(".paper-scroll") as HTMLElement).scrollTop = 0;
    });
    await paper.getByText("Page 1 of 4", { exact: true }).waitFor();
    const before = (await consoleLog()).length;
    await paper.evaluate(() => {
      const reload = document.querySelector("button.reload") as HTMLButtonElement;
      reload.click();
      reload.click();
    });
    await paper.locator('.sheet[data-page="1"] canvas.pg').waitFor({ timeout: 60_000 });
    await page.waitForTimeout(1500);
    assert.equal(await paper.locator(".sheet").count(), 4, "one document's sheets");
    for (let n = 2; n <= 4; n++) {
      await paper.getByRole("button", { name: "Next page" }).click();
      await paper.locator(`.sheet[data-page="${n}"] canvas.pg`).waitFor({ timeout: 30_000 });
    }
    await paper.getByText("Page 4 of 4", { exact: true }).waitFor();
    for (let i = 0; i < 50 && page.workers().filter((w) => w.url().includes("pdf.worker.min.mjs")).length !== 1; i++) await page.waitForTimeout(100);
    assert.equal(page.workers().filter((w) => w.url().includes("pdf.worker.min.mjs")).length, 1, "the first load's worker is gone");
    assert.deepEqual((await consoleLog()).slice(before).filter((l) => /^frame app:\/\/paper-view\/.*(Uncaught|Unhandled)/.test(l)), []);
    await paper.getByRole("button", { name: "Fit width" }).click();
  });

  test("a PDF.js worker that stops answering is replaced on Reload: the paper is drawn again, with no stuck screen or uncaught error", SLOW, async () => {
    const { paper } = await openPaper();
    await paper.locator(".sheet canvas.pg").first().waitFor({ timeout: 60_000 });
    const before = (await consoleLog()).length;
    const worker = page.workers().find((w) => w.url().includes("pdf.worker.min.mjs"))!;
    assert.ok(worker !== undefined, "PDF.js's worker runs");
    // Busy for 25 s, as a page whose decoding never yields would keep it.
    const stall = worker
      .evaluate(() => {
        const end = Date.now() + 25_000;
        while (Date.now() < end);
      })
      .catch(() => {});
    try {
      await page.waitForTimeout(500);
      const reloadedAt = Date.now();
      await paper.getByRole("button", { name: "Reload" }).click();
      // Polled with evaluate: Playwright's locators in this frame wait for its pending evaluate in the stalled worker.
      const drawn = async () => paper.evaluate(() => ({ canvases: document.querySelectorAll(".sheet canvas.pg").length, app: (document.getElementById("app")!.textContent ?? "").slice(0, 60) }));
      let state = await drawn();
      while (state.canvases === 0 && Date.now() - reloadedAt < 10_000) {
        await page.waitForTimeout(200);
        state = await drawn();
      }
      assert.ok(state.canvases > 0, `the page in view is drawn by a fresh worker within 10 s of Reload, while the old one is still busy: ${JSON.stringify(state)}`);
      assert.match(state.app, /^Page \d of 4/);
      assert.ok(Date.now() - reloadedAt < 20_000, "before the stalled worker would have answered");
    } finally {
      // The page terminates the stalled worker after the closed document's grace (opener.test.ts shows it with
      // stand-ins, and the next test with a page that stalls it); a loop Playwright itself runs in a worker is
      // not cut short by that, so the suite waits it out before using this frame again.
      await stall;
    }
    assert.deepEqual((await consoleLog()).slice(before).filter((l) => /^frame app:\/\/paper-view\/.*(Uncaught|Unhandled)/.test(l)), []);
  });

  test("a page that takes longer than its budget is stopped, its worker replaced, and the rest of the paper drawn", SLOW, async () => {
    const { paper } = await openPaper();
    const pdf = join(paperDir(), "main.pdf");
    const kept = join(paperDir(), "main.pdf.e2e-kept");
    const pdfWorkers = () => page.workers().filter((w) => w.url().includes("pdf.worker.min.mjs"));
    renameSync(pdf, kept);
    try {
      // 60,000 full-page transparency groups: at the rate measured for 6,000 with no GPU at a scale factor
      // of 1 (the faster way here), about seven times the budget to draw, at a peak of about 0.5 GB in the
      // frame's process (2^20 nested forms, stopped at the same 15 s, took that process to about 3.2 GB).
      writeFileSync(pdf, transparencyGroupsPdf(60_000));
      const started = Date.now();
      await paper.getByRole("button", { name: "Reload" }).click();
      await paper.getByText(/^Page [12] of 2$/).waitFor({ timeout: 30_000 });
      const ended: string[] = [];
      for (const w of pdfWorkers()) w.on("close", () => ended.push(w.url()));
      // Page 1 passes the 15 s budget: it is stopped and says so.
      const note = paper.locator('.sheet[data-page="1"] .page-note');
      await note.filter({ hasText: "Page 1 took longer than 15 s to draw" }).waitFor({ timeout: 60_000 });
      const stoppedAfter = Date.now() - started;
      assert.ok(stoppedAfter < 40_000, `stopped ${stoppedAfter} ms after Reload`);
      assert.equal(await paper.locator('.sheet[data-page="1"] canvas.pg').count(), 0);
      // The rest of the paper is drawn, by a fresh worker; the one that read page 1 is ended.
      await paper.locator('.sheet[data-page="2"] canvas.pg').waitFor({ timeout: 30_000 });
      await paper.locator('.sheet[data-page="2"] .textLayer span').filter({ hasText: "AFTER-GROUPS" }).waitFor();
      for (let i = 0; i < 100 && ended.length === 0; i++) await page.waitForTimeout(100);
      assert.equal(ended.length, 1, "the worker that read page 1 was terminated");
      assert.equal(pdfWorkers().length, 1);
      assert.match((await paper.locator(".paperbar .hint").textContent())!, /^paper\/main\.pdf · 2 pages/);
    } finally {
      rmSync(pdf, { force: true });
      renameSync(kept, pdf);
    }
    await paper.getByRole("button", { name: "Reload" }).click();
    await paper.locator('.sheet[data-page="1"] canvas.pg').waitFor({ timeout: 60_000 });
    assert.equal(await paper.locator(".page-note").count(), 0, "Reload tries every page again");
  });

  test("time with the Paper tab hidden does not count against a page's budget", SLOW, async () => {
    const { ws, paper } = await openPaper();
    const pdf = join(paperDir(), "main.pdf");
    const kept = join(paperDir(), "main.pdf.e2e-kept");
    renameSync(pdf, kept);
    try {
      // 2^16 nested rectangles: about 1.5 s from Reload to the drawn page on the machine this was written on
      // (2^17 took 3.1 s), so a runner several times slower still finishes well inside the 15 s budget of
      // visible time, and a faster one is still drawing when the tab is left.
      writeFileSync(pdf, nestedFormsPdf(16));
      await paper.getByRole("button", { name: "Reload" }).click();
      await paper.getByText(/^Page [12] of 2$/).waitFor({ timeout: 30_000 });
      // Two animation frames after the layout, the page's drawing has begun (update, then drawSlot); then the tab is left.
      await paper.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await ws.getByRole("tab", { name: "Overview" }).click();
      assert.equal(await paper.evaluate(() => document.querySelectorAll('.sheet[data-page="1"] canvas.pg').length), 0, "still drawing when the tab was left");
      await page.waitForTimeout(17_000);
      const back = Date.now();
      await ws.getByRole("tab", { name: "Paper" }).click();
      // Drawn, or stopped (had the hidden time counted, the 15 s would have run out while away).
      const sheet = paper.locator('.sheet[data-page="1"]');
      await sheet.locator("canvas.pg").or(sheet.locator(".page-note")).first().waitFor({ timeout: 30_000 });
      assert.equal(await paper.locator(".page-note").filter({ hasText: "took longer" }).count(), 0, "not stopped for time it was hidden");
      assert.equal(await sheet.locator("canvas.pg").count(), 1, `drawn ${Date.now() - back} ms after the tab came back`);
    } finally {
      rmSync(pdf, { force: true });
      renameSync(kept, pdf);
    }
    await paper.getByRole("button", { name: "Reload" }).click();
    await paper.getByText(/^Page \d of 4$/).waitFor({ timeout: 60_000 });
  });

  test("a worker that never answers is ended after 20 s with a screen and Try again, which opens the paper", SLOW, async () => {
    const { paper } = await openPaper();
    await paper.locator(".sheet canvas.pg").first().waitFor({ timeout: 60_000 });
    const before = (await consoleLog()).length;
    // A stand-in for the next worker the page starts: it says "ready", then never answers PDF.js.
    await paper.evaluate(() => {
      const real = window.Worker;
      const record = { made: 0, terminated: 0 };
      class Silent extends EventTarget {
        constructor() {
          super();
          record.made++;
          setTimeout(() => this.dispatchEvent(new MessageEvent("message", { data: { sourceName: "worker", targetName: "main", action: "ready", data: null } })), 0);
        }
        postMessage(): void {}
        terminate(): void {
          record.terminated++;
        }
      }
      Object.assign(window, { __silent: record, __realWorker: real, Worker: Silent });
    });
    try {
      const started = Date.now();
      await paper.getByRole("button", { name: "Reload" }).click();
      await paper.getByText("The paper took too long to open", { exact: true }).waitFor({ timeout: 40_000 });
      const waited = Date.now() - started;
      assert.ok(waited >= 19_000 && waited < 30_000, `the screen came after ${waited} ms`);
      await paper.getByText("PDF.js did not open paper/main.pdf within 20 s, so it was stopped.", { exact: false }).waitFor();
      await page.waitForTimeout(2500); // the closed document's grace
      assert.deepEqual(await paper.evaluate(() => (window as unknown as { __silent: unknown }).__silent), { made: 1, terminated: 1 }, "the silent worker was ended");
    } finally {
      await paper.evaluate(() => Object.assign(window, { Worker: (window as unknown as { __realWorker: unknown }).__realWorker }));
    }
    await paper.getByRole("button", { name: "Try again" }).click();
    await paper.locator(".sheet canvas.pg").first().waitFor({ timeout: 30_000 });
    assert.deepEqual((await consoleLog()).slice(before).filter((l) => /^frame app:\/\/paper-view\/.*(Uncaught|Unhandled)/.test(l)), []);
  });

  test("a page read later that is taller than one scrolling column can hold is not laid out, and the view says so", SLOW, async () => {
    const { paper } = await openPaper();
    const pdf = join(paperDir(), "main.pdf");
    const kept = join(paperDir(), "main.pdf.e2e-kept");
    renameSync(pdf, kept);
    try {
      writeFileSync(pdf, oddSizesPdf());
      await paper.getByRole("button", { name: "Reload" }).click();
      // Laid out at first as two pages of page 1's size; page 2, once read, is 14,400 points tall.
      await paper.getByText("The Paper view shows the first 1 of this PDF's 2 pages", { exact: false }).waitFor({ timeout: 30_000 });
      assert.equal(await paper.locator(".sheet").count(), 1);
      assert.equal(await paper.locator(".paperbar .hint").textContent(), "paper/main.pdf · first 1 of 2 pages · select text to ask the agent about it");
      await paper.getByText("Page 1 of 1", { exact: true }).waitFor();
      const height = await paper.evaluate(() => (document.querySelector(".paper-scroll") as HTMLElement).scrollHeight);
      assert.ok(height < 16_777_216, `${height} px`);
    } finally {
      rmSync(pdf, { force: true });
      renameSync(kept, pdf);
    }
    await paper.getByRole("button", { name: "Reload" }).click();
    await paper.getByText(/^Page \d of 4$/).waitFor({ timeout: 60_000 });
  });

  test("a PDF of 300,000 pages lays out the first 1,000, says so, and every page laid out can be scrolled to", SLOW, async () => {
    const { paper } = await openPaper();
    const pdf = join(paperDir(), "main.pdf");
    const kept = join(paperDir(), "main.pdf.e2e-kept");
    renameSync(pdf, kept);
    try {
      writeFileSync(pdf, manyPagesPdf(300_000));
      await paper.getByRole("button", { name: "Reload" }).click();
      await paper.getByText(/^Page \d of 1000$/).waitFor({ timeout: 60_000 });
      assert.equal(await paper.locator(".sheet").count(), 1000);
      assert.equal(await paper.locator(".paperbar .hint").textContent(), "paper/main.pdf · first 1,000 of 300,000 pages · select text to ask the agent about it");
      await paper.getByText("The Paper view shows the first 1,000 of this PDF's 300,000 pages", { exact: false }).waitFor();
      // At the largest zoom, the last page laid out is inside what the column can scroll to.
      for (let i = 0; i < 12; i++) await paper.getByRole("button", { name: "Zoom in" }).click();
      await paper.getByText("300%", { exact: true }).waitFor();
      const reach = await paper.evaluate(async () => {
        const scroller = document.querySelector(".paper-scroll") as HTMLElement;
        const last = document.querySelector('.sheet[data-page="1000"]') as HTMLElement;
        scroller.scrollTop = scroller.scrollHeight;
        const t = performance.now();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return { scrollHeight: scroller.scrollHeight, lastBottom: last.offsetTop + last.offsetHeight, frameMs: performance.now() - t };
      });
      assert.ok(reach.scrollHeight < 16_777_216 && reach.lastBottom <= reach.scrollHeight, JSON.stringify(reach));
      await paper.getByText("Page 1000 of 1000", { exact: true }).waitFor();
      await paper.getByRole("button", { name: "Fit width" }).click();
      await paper.evaluate(() => {
        (document.querySelector(".paper-scroll") as HTMLElement).scrollTop = 0;
      });
      await paper.getByText("Page 1 of 1000", { exact: true }).waitFor();
    } finally {
      rmSync(pdf, { force: true });
      renameSync(kept, pdf);
    }
    await paper.getByRole("button", { name: "Reload" }).click();
    await paper.getByText("Page 1 of 4", { exact: true }).waitFor({ timeout: 60_000 });
  });

  test("a PDF's pictures (JPEG and raw) and a font it does not embed are drawn, under the same policy", SLOW, async () => {
    const { paper } = await openPaper();
    const pdf = join(paperDir(), "main.pdf");
    const kept = join(paperDir(), "main.pdf.e2e-kept");
    // A magenta JPEG made by Electron itself, so the repository holds no binary fixture (magenta survives a BGRA/RGBA mix-up).
    const made = await app.evaluate(({ nativeImage }) => {
      const size = 32;
      const pixels = Buffer.alloc(size * size * 4);
      for (let i = 0; i < size * size; i++) pixels.set([255, 0, 255, 255], i * 4);
      return nativeImage.createFromBitmap(pixels, { width: size, height: size }).toJPEG(95).toString("base64");
    });
    /** Page 1's canvas over a box in PDF units of a US-letter page: how many pixels are not white, and the colour at its centre. */
    const sample = (box: { x: number; y: number; w: number; h: number }) =>
      paper.evaluate(({ x, y, w, h }) => {
        const canvas = document.querySelector('.sheet[data-page="1"] canvas.pg') as HTMLCanvasElement;
        const context = canvas.getContext("2d")!;
        const sx = canvas.width / 612;
        const sy = canvas.height / 792;
        const [left, top, width, height] = [Math.round(x * sx), Math.round((792 - y - h) * sy), Math.max(1, Math.round(w * sx)), Math.max(1, Math.round(h * sy))];
        const data = context.getImageData(left, top, width, height).data;
        let ink = 0;
        for (let i = 0; i < data.length; i += 4) if (data[i]! < 200 || data[i + 1]! < 200 || data[i + 2]! < 200) ink++;
        const centre = context.getImageData(left + (width >> 1), top + (height >> 1), 1, 1).data;
        return { ink, centre: [centre[0]!, centre[1]!, centre[2]!] };
      }, box);
    renameSync(pdf, kept);
    try {
      writeFileSync(pdf, imagePdf(Buffer.from(made, "base64"), 32, 32));
      await paper.getByRole("button", { name: "Reload" }).click();
      await paper.getByText("Page 1 of 1", { exact: true }).waitFor({ timeout: 60_000 });
      await paper.locator('.sheet[data-page="1"] canvas.pg').waitFor();
      const { jpeg, raw, text } = IMAGE_PAGE;
      const magenta = await sample({ x: jpeg.x, y: jpeg.y, w: jpeg.size, h: jpeg.size });
      assert.ok(magenta.centre[0]! > 200 && magenta.centre[1]! < 80 && magenta.centre[2]! > 200, `the JPEG: ${magenta.centre}`);
      const green = await sample({ x: raw.x, y: raw.y, w: raw.size, h: raw.size });
      assert.ok(green.centre[0]! < 80 && green.centre[1]! > 200 && green.centre[2]! < 80, `the raw picture: ${green.centre}`);
      const line = await sample({ x: text.x, y: text.y, w: 220, h: text.size * 0.75 });
      assert.ok(line.ink > 50, `the Helvetica line drew ${line.ink} dark pixels`);
      await paper.locator(".textLayer span").filter({ hasText: text.line }).waitFor();
    } finally {
      rmSync(pdf, { force: true });
      renameSync(kept, pdf);
    }
    await paper.getByRole("button", { name: "Reload" }).click();
    await paper.getByText("Page 1 of 4", { exact: true }).waitFor({ timeout: 60_000 });
  });

  test("the Paper view's frame is sealed off: no bridge, paper/ only, no other origin's endpoints, PDF.js as vendored", SLOW, async () => {
    const { paper } = await openPaper();
    const status = (url: string) => paper.evaluate(async (u) => (await fetch(u)).status, url);
    const rel = (p: string) => `./_os/files?path=${encodeURIComponent(p)}`;
    assert.deepEqual(
      {
        pdf: await status(rel(`projects-folder/${PROJECT}/paper/main.pdf`)),
        tex: await status(rel(`projects-folder/${PROJECT}/paper/main.tex`)),
        listing: await status(`./_os/list?path=${encodeURIComponent(`projects-folder/${PROJECT}/paper`)}`),
        outsidePaper: await status(rel(`projects-folder/${PROJECT}/AGENTS.md`)),
        code: await status(rel(`projects-folder/${PROJECT}/Code/README.md`)),
        dotEnvRoot: await status(rel(".env")),
        codeViewGit: await status(`/api/code-view/git/log?project=${PROJECT}`),
        chat: await status("/api/chat/sessions"),
        wikiStatus: await status("/api/paper-wiki/status"),
      },
      { pdf: 200, tex: 200, listing: 200, outsidePaper: 404, code: 404, dotEnvRoot: 404, codeViewGit: 404, chat: 404, wikiStatus: 404 },
    );
    const probe = await paper.evaluate(async (project) => {
      const outcome = async (fn: () => Promise<unknown>) => {
        try {
          return String(await fn());
        } catch (error) {
          return `blocked: ${(error as Error).name}`;
        }
      };
      return {
        own: typeof (window as { osDesktop?: unknown }).osDesktop,
        parent: await outcome(async () => typeof (window.parent as Window & { osDesktop?: unknown }).osDesktop),
        appApi: await outcome(async () => (await fetch("app://research-os/api/chat/sessions?cwd=")).status),
        codeViewGit: await outcome(async () => (await fetch(`app://code-view/api/code-view/git/log?project=${project}`)).status),
      };
    }, PROJECT);
    assert.equal(probe.own, "undefined");
    assert.match(probe.parent, /^blocked: SecurityError/);
    assert.match(probe.appApi, /^blocked/);
    assert.match(probe.codeViewGit, /^blocked/);
    // What the page loads is the vendored PDF.js byte for byte, as vendor/README.md records it.
    const served = await paper.evaluate(async () => {
      const hex = async (url: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", await (await fetch(url)).arrayBuffer()))].map((b) => b.toString(16).padStart(2, "0")).join("");
      return { "pdf.min.mjs": await hex("./vendor/pdf.min.mjs"), "pdf.worker.min.mjs": await hex("./vendor/pdf.worker.min.mjs"), LICENSE: await hex("./vendor/LICENSE") };
    });
    assert.deepEqual(served, Object.fromEntries(vendorHashes()));
    for (const [file, hash] of vendorHashes()) {
      assert.equal(createHash("sha256").update(readFileSync(join(CLIENT, "out/plugins/paper-view/site/vendor", file))).digest("hex"), hash, `out/ ${file}`);
    }
    assert.doesNotMatch(readFileSync(join(CLIENT, "out/plugins/paper-view/site/main.js"), "utf8"), /pdfjsVersion/, "PDF.js is not bundled into the page's script");
    // PDF.js's worker runs under the plugin policy as served: no WebAssembly ('wasm-unsafe-eval' is not in it), and a violation reports exactly PLUGIN_CSP.
    const worker = page.workers().find((w) => w.url() === "app://paper-view/vendor/pdf.worker.min.mjs");
    assert.ok(worker !== undefined, "PDF.js's worker runs from the site's own origin");
    const marked = (await consoleLog()).length;
    const inWorker = await worker.evaluate(async () => {
      const policies: string[] = [];
      self.addEventListener("securitypolicyviolation", (event) => policies.push(`${event.effectiveDirective} | ${event.originalPolicy}`));
      let wasm = "compiled";
      try {
        await WebAssembly.compile(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
      } catch (error) {
        wasm = `${(error as Error).name}: ${(error as Error).message}`;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { wasm, policies };
    });
    assert.match(inWorker.wasm, /^CompileError: .*Content Security policy.*script-src 'self'/);
    assert.deepEqual(inWorker.policies, [`script-src | ${PLUGIN_CSP}`]);
    // That refusal is the probe's own, not something PDF.js asked for: out of the final policy check.
    await page.waitForTimeout(300);
    await app.evaluate((_electron, from) => {
      const seen = (globalThis as { __console?: string[] }).__console!;
      for (let i = seen.length - 1; i >= from; i--) if (/WebAssembly/.test(seen[i]!)) seen.splice(i, 1);
    }, marked);
    for (let i = logs.length - 1; i >= 0; i--) if (/WebAssembly module violates/.test(logs[i]!)) logs.splice(i, 1);
    // No inline script runs in the page, whatever reaches its DOM.
    const inline = await paper.evaluate((text) => {
      const script = document.createElement("script");
      script.textContent = text;
      document.body.append(script);
      script.remove();
      return (window as { __inline?: unknown }).__inline;
    }, INLINE_PROBE);
    assert.equal(inline, undefined, "an inline script ran in the Paper view's page");
    // The frame's CSP reports reach the suite, so the final check sees this frame too.
    await paper.evaluate(() => {
      const img = new Image();
      img.src = "https://csp-canary.invalid/paper.png";
      document.body.append(img);
      img.remove();
    });
    const canary = (lines: string[]) => lines.some((l) => /^frame app:\/\/paper-view\/.*csp-canary\.invalid.*Content Security Policy/.test(l));
    for (let i = 0; i < 50 && !canary(await consoleLog()); i++) await page.waitForTimeout(100);
    assert.ok(canary(await consoleLog()), "a CSP violation inside the Paper view's frame is seen");
    // PDF.js ran in its own worker, never on the page's thread.
    assert.deepEqual([...logs, ...(await consoleLog())].filter((l) => /fake worker|could not start/i.test(l)), []);
  });

  /** A project's workspace with its Skeleton tab open, and the Skeleton view's frame once the file is drawn or a screen shows. */
  async function openSkeleton(project: string = PROJECT): Promise<{ ws: Locator; sk: Frame }> {
    await nav(page, "Projects").click();
    await screen(page, "projects").getByRole("button", { name: `Open workspace: ${project}` }).click();
    const ws = screen(page, "workspace");
    await ws.getByRole("heading", { name: project, exact: true }).waitFor();
    await ws.getByRole("tab", { name: "Skeleton" }).click();
    const sk = await pluginFrame(page, `app://skeleton-view/index.html?project=${project}`);
    await sk.locator(".sk-claims, .placeholder").first().waitFor();
    return { ws, sk };
  }
  /** Clears the ask bar and removes every reference chip of the project's composer. */
  async function clearAsk(ws: Locator, project: string): Promise<void> {
    const bar = ws.getByRole("region", { name: "Selection" });
    if ((await bar.count()) > 0) await bar.getByRole("button", { name: "Clear selection" }).click();
    const chips = ws.getByRole("region", { name: `${project} agent`, exact: true }).getByRole("list", { name: "References" }).getByRole("listitem");
    for (let i = (await chips.count()) - 1; i >= 0; i--) await chips.nth(i).getByRole("button", { name: /^Remove reference / }).click();
  }
  /** Sets the window's width, keeping its height; returns the width it had. */
  const windowWidth = (width: number | null) =>
    app.evaluate(({ BrowserWindow }, w) => {
      const win = BrowserWindow.getAllWindows()[0]!;
      const [before, height] = win.getSize();
      if (w !== null) win.setSize(w, height!);
      return before!;
    }, width);
  /** Sets the window's size; returns the size it had. */
  const windowSize = (size: { width: number; height: number }) =>
    app.evaluate(({ BrowserWindow }, to) => {
      const win = BrowserWindow.getAllWindows()[0]!;
      const [width, height] = win.getSize();
      win.setSize(to.width, to.height);
      return { width: width!, height: height! };
    }, size);
  const skeletonFile = (project: string) => join(workspace, "projects-folder", project, "paper_skeleton.md");

  test("the Skeleton view on nanochat_cpu: the Snapshot card, the claims, C2's evidence, and a chip; nothing is sent", SLOW, async () => {
    const sessionFiles = readdirSync(sessions).length;
    const width = await windowWidth(1440);
    try {
      const { ws, sk } = await openSkeleton();
      assert.equal(sk.url(), `app://skeleton-view/index.html?project=${PROJECT}`);
      const bar = ws.getByRole("region", { name: "Selection" });
      const chat = ws.getByRole("region", { name: `${PROJECT} agent`, exact: true });
      const chips = chat.getByRole("list", { name: "References" }).getByRole("listitem");
      await clearAsk(ws, PROJECT);
      // The bar, the Snapshot card, the claims, and the rest of the file, folded.
      assert.equal(await sk.locator(".subbar .vpath").textContent(), `projects-folder/${PROJECT}/paper_skeleton.md`);
      await sk.locator(".subbar").getByRole("button", { name: "Reload" }).waitFor();
      assert.equal(await sk.locator(".sk-snap h2").textContent(), "nanochat on a Laptop CPU: a Three-Minute End-to-End Example for the AI-Human Research OS");
      assert.equal(await sk.locator(".sk-snap .eyebrow .stp").textContent(), "draft");
      assert.deepEqual(await sk.locator(".sk-snap p b").allTextContents(), ["Thesis", "Audience", "Research question"]);
      assert.equal(await sk.locator(".sk-claims .sk-h small").textContent(), "5 claims · 5 verified · paper_skeleton.md:113–119");
      assert.deepEqual(await sk.locator(".ctable tbody tr.blk td.id").allTextContents(), ["C1verified", "C2verified", "C3verified", "C4verified", "C5verified"]);
      assert.equal(await sk.locator(".sk-rest details").count(), 13);
      assert.equal(await sk.locator(".sk-rest details[open]").count(), 0, "folded");
      // Nothing is hidden without the view saying so: the Snapshot items the card does not draw, then each section.
      assert.deepEqual(
        (await sk.locator(".sk-rest summary").allTextContents()).slice(0, 2).map((t) => t.replace(/\s+/g, " ")),
        ["Snapshot, other itemsline 17 · 1 entry", "Source Mapline 23 · 9 entries"],
      );
      assert.deepEqual(await sk.locator(".sk-rest > p.table-note").allTextContents(), [
        "The title and opening paragraph (lines 1–4) are not shown.",
        "Headings with nothing under them: Tracking (line 109).",
      ]);
      assert.equal(await sk.getByText("Nothing else in paper_skeleton.md.").count(), 0);
      await sk.locator(".sk-side .nd-empty").waitFor({ state: "attached" });
      if ((await sk.evaluate(() => innerWidth)) >= 780) {
        // As in the mockup, the Snapshot card and the evidence panel start on the same line.
        const tops = await sk.evaluate(() => [".sk-snap", ".sk-side"].map((s) => document.querySelector(s)!.getBoundingClientRect().top));
        assert.ok(Math.abs(tops[0]! - tops[1]!) < 1, `Snapshot card at ${tops[0]}, evidence panel at ${tops[1]}`);
      }
      await shot(page, "skeleton-1-nanochat-nothing-selected");

      // C2: its evidence beside the table (under its row if the screen leaves the view under 780 px), and the ask bar.
      await page.waitForTimeout(1100); // the workspace takes at most 10 selections a second from a view
      await sk.locator('.ctable tr.blk[data-line="116"]').click();
      await sk.locator(".sk-side h4").filter({ hasText: "Claim C2 · paper_skeleton.md:116" }).waitFor({ state: "attached" });
      const wide = (await sk.evaluate(() => innerWidth)) >= 780;
      const evidence = wide ? sk.locator(".sk-side") : sk.locator(".ctable tr.evrow.nar");
      await evidence.waitFor({ state: "visible" });
      assert.deepEqual(await evidence.locator(".files li").allTextContents(), ["Code/results/summary.json"]);
      const sideText = (await evidence.textContent()) ?? "";
      assert.ok(sideText.includes("Files it names") && sideText.includes("Used by") && sideText.includes("Main result (paper_skeleton.md:83)"), sideText);
      assert.ok(!sideText.includes("What the source file says"), "the cited file's own text is left out (the Human Owner's decision)");
      const label = bar.locator("[data-selection-label]");
      await label.filter({ hasText: "paper_skeleton.md:116 · claim C2" }).waitFor();
      assert.equal(await label.textContent(), "paper_skeleton.md:116 · claim C2");
      const row = fixtureLine("nanochat_cpu.paper_skeleton.md", 116);
      assert.equal(await label.getAttribute("title"), row, "the quote is the row as written");
      const glimpse = (await bar.locator("[data-selection-quote]").textContent())!;
      assert.ok(glimpse.startsWith(row.slice(0, 40)) && glimpse.endsWith(`1 line · ${row.length} characters`), glimpse);
      assert.equal(await sk.locator(".ctable tr.picked").count(), 1);
      await shot(page, "skeleton-2-claim-C2-selected-evidence-and-ask-bar");

      // Ask: a chip whose text opens by itself (the Skeleton view quotes the line as written, not what it draws).
      await bar.getByRole("button", { name: "Ask the agent about this" }).click();
      await chips.filter({ hasText: "paper_skeleton.md:116 · claim C2" }).waitFor();
      const preview = chat.locator("[data-reference-preview]");
      await preview.waitFor({ timeout: 5000 });
      assert.equal(await preview.textContent(), `About paper_skeleton.md:116 · claim C2\n> ${row}`);
      assert.equal(await bar.count(), 0, "asking clears the selection");
      await sk.locator(".picked").waitFor({ state: "detached" }); // and the view's highlight
      await sk.locator(".sk-side h4").filter({ hasText: "Claim C2" }).waitFor({ state: "attached" }); // the evidence stays open
      await shot(page, "skeleton-3-composer-after-ask-chip-open");
      await chat.getByRole("button", { name: "Remove reference paper_skeleton.md:116 · claim C2" }).click();
      assert.equal(await chips.count(), 0);
      assert.equal(readdirSync(sessions).length, sessionFiles, "no message was sent");
    } finally {
      await windowWidth(width);
    }
  });

  test("a folded section opens and its line is selected; in a narrow window the evidence opens under its claim", SLOW, async () => {
    const width = await windowWidth(1440);
    try {
      const { ws, sk } = await openSkeleton();
      await clearAsk(ws, PROJECT);
      const bar = ws.getByRole("region", { name: "Selection" });
      const experiments = sk.locator(".sk-rest details").filter({ has: sk.locator("summary", { hasText: "Experiments" }) });
      await experiments.locator("summary").click();
      await experiments.locator("tr.blk").first().waitFor();
      assert.equal(await experiments.locator("tbody tr.blk").count(), 3);
      /** Whether the page, or a section's card, is wider than its box: a wide table scrolls inside its section instead. */
      const overflows = () => sk.evaluate(() => [...document.querySelectorAll(".sk2, .sk-rest details")].some((e) => e.scrollWidth > e.clientWidth + 1));
      assert.equal(await overflows(), false, "an open section's table stays in its card");
      await page.waitForTimeout(1100);
      await experiments.locator("tbody tr.blk").filter({ hasText: "Main result" }).click();
      const label = bar.locator("[data-selection-label]");
      await label.filter({ hasText: "paper_skeleton.md:83 · section “Experiments”" }).waitFor();
      assert.equal(await label.getAttribute("title"), fixtureLine("nanochat_cpu.paper_skeleton.md", 83));
      await experiments.locator("tr.blk.picked").scrollIntoViewIfNeeded();
      await shot(page, "skeleton-4-folded-section-open-line-selected");
      // A list item of another open section, and Escape clears it.
      const limits = sk.locator(".sk-rest details").filter({ has: sk.locator("summary", { hasText: "Limitations" }) });
      await limits.locator("summary").click();
      await page.waitForTimeout(1100);
      await limits.locator("li.blk").first().click();
      await label.filter({ hasText: "paper_skeleton.md:98 · section “Limitations”" }).waitFor();
      await sk.locator("body").press("Escape");
      await bar.waitFor({ state: "detached" });
      assert.equal(await sk.locator(".picked").count(), 0);

      // Narrow: the panel goes, and the open claim's evidence is under its row.
      await windowWidth(1000);
      await sk.locator(".sk-side").waitFor({ state: "hidden" });
      assert.ok((await sk.evaluate(() => innerWidth)) < 780);
      await page.waitForTimeout(1100);
      await sk.locator('.ctable tr.blk[data-line="115"]').click();
      const under = sk.locator(".ctable tr.evrow.nar");
      await under.waitFor({ state: "visible" });
      assert.equal(await under.evaluate((tr) => (tr.previousElementSibling as HTMLElement).dataset.line), "115", "under C1's row");
      assert.ok(((await under.textContent()) ?? "").includes("Code/README.md"));
      assert.equal(await overflows(), false, "nothing scrolls sideways in a narrow window");
      assert.equal(await sk.locator('.ctable tr.blk[data-line="115"] .stp').evaluate((p) => p.scrollWidth <= p.clientWidth), true, "the status pill is not cut");
      await under.scrollIntoViewIfNeeded();
      await shot(page, "skeleton-5-narrow-window-evidence-under-claim");
      await bar.getByRole("button", { name: "Clear selection" }).click();
      await sk.locator(".picked").waitFor({ state: "detached" });
    } finally {
      await windowWidth(width);
    }
  });

  test("a project made from the template shows no claims yet; markup, a javascript: link, and an image in its file run, follow, and load nothing", SLOW, async () => {
    const width = await windowWidth(1440);
    const file = skeletonFile(TEMPLATE_PROJECT);
    const original = readFileSync(file, "utf8");
    try {
      const { sk } = await openSkeleton(TEMPLATE_PROJECT);
      await sk.getByText("No claims yet: the Claims and Evidence table has no filled row", { exact: true }).waitFor();
      assert.equal(await sk.locator(".sk-snap .eyebrow .stp").textContent(), "idea / outline / draft / submitted / revised");
      assert.equal(await sk.locator(".sk-snap h2").textContent(), "not filled in");
      assert.deepEqual(await sk.locator(".sk-snap p .unfilled").allTextContents(), ["not filled in", "not filled in", "not filled in"]);
      await shot(page, "skeleton-6-template-project-no-claims-yet");

      // The file rewritten: markup in a claim and a section title, a javascript: link, and an image on another host.
      const lines = original.split(/\r?\n/);
      const claimRow = lines.findIndex((l) => l.includes("planned / verified / weak / removed"));
      lines[claimRow] = `| C1: ${MARKUP_TEXT} | ![x](https://md-image.invalid/a.png) | [x](javascript:window.top.__pwned=6) | r | verified |`;
      const sourceMap = lines.indexOf("## Source Map");
      lines[sourceMap] = `## Source Map ${MARKUP_TEXT}`;
      // A fence whose info string carries markup: on screen as text, as it is in the quote.
      lines.push("", "## Fenced", "", `\`\`\`${MARKUP_TEXT}`, "code", "```");
      writeFileSync(file, lines.join("\n"));
      await sk.locator(".subbar").getByRole("button", { name: "Reload" }).click();
      await sk.locator(".sk-claims .sk-h small").filter({ hasText: "1 claim · 1 verified" }).waitFor();
      assert.equal(await sk.locator(".ctable td.cl").textContent(), MARKUP_TEXT, "the claim's markup is its text");
      await sk.locator(".sk-rest summary").filter({ hasText: MARKUP_TEXT }).waitFor();
      const fenced = sk.locator(".sk-rest details").filter({ has: sk.locator("summary", { hasText: "Fenced" }) });
      await fenced.locator("summary").click();
      assert.equal(await fenced.locator(".fence-info").textContent(), MARKUP_TEXT, "the info string is drawn, as text");
      assert.equal(await fenced.locator("pre").textContent(), "code");
      const link = sk.locator(".ctable tr.blk .mdlink");
      assert.equal(await link.getAttribute("title"), "javascript:window.top.__pwned=6");
      assert.equal(await link.getAttribute("href"), null);
      await page.waitForTimeout(1100);
      await link.click();
      await page.waitForTimeout(400);
      assert.equal(sk.url(), `app://skeleton-view/index.html?project=${TEMPLATE_PROJECT}`, "the link is not followed");
      assert.equal(await sk.locator(".ctable tr.blk .mdimg").textContent(), "x", "the image is its alt text");
      // The click selected the claim's row, whose evidence names the link's target as text.
      await sk.locator(".sk-side h4").filter({ hasText: "Claim C1" }).waitFor({ state: "attached" });
      assert.deepEqual(await sk.locator(".sk-side .files li").allTextContents(), ["javascript:window.top.__pwned=6 (an address, not a file of the project)"]);
      assert.equal(await sk.evaluate(() => document.querySelectorAll("img, a, iframe, object, embed, script:not([src])").length), 0, "nothing in the frame came from the file as markup");
      assert.deepEqual(await pwned(sk), [undefined, undefined]);
      assert.equal(await page.locator('img[src="x"]').count(), 0);
      const bar = screen(page, "workspace").getByRole("region", { name: "Selection" });
      if ((await bar.count()) > 0) await bar.getByRole("button", { name: "Clear selection" }).click();
    } finally {
      writeFileSync(file, original);
      await windowWidth(width);
    }
  });

  test("two claims with one ID: each row opens its own evidence, and a note names the ID", SLOW, async () => {
    const width = await windowWidth(1440);
    const file = skeletonFile(TEMPLATE_PROJECT);
    const original = readFileSync(file, "utf8");
    try {
      const { ws, sk } = await openSkeleton(TEMPLATE_PROJECT);
      await clearAsk(ws, TEMPLATE_PROJECT);
      const lines = original.split(/\r?\n/);
      const at = lines.findIndex((l) => l.includes("planned / verified / weak / removed"));
      lines.splice(at, 1, "| C3: first C3 | e1 | [one](Code/one.py) | r1 | verified |", "| C3: second C3 | e2 | [two](Code/two.py) | r2 | removed |");
      writeFileSync(file, lines.join("\n"));
      const [first, second] = [at + 1, at + 2];
      await sk.locator(".subbar").getByRole("button", { name: "Reload" }).click();
      await sk.locator(".sk-claims .sk-h small").filter({ hasText: "2 claims · 1 verified" }).waitFor();
      await page.waitForTimeout(1100);
      await sk.locator(`.ctable tr.blk[data-line="${second}"]`).click();
      await sk.locator(".sk-side h4").filter({ hasText: `Claim C3 · paper_skeleton.md:${second}` }).waitFor({ state: "attached", timeout: 5000 });
      assert.deepEqual(await sk.locator(".sk-side .files li").allTextContents(), ["Code/two.py"], "the second row's evidence, not the first's");
      assert.deepEqual(await sk.locator(".ctable tr.on").evaluateAll((trs) => trs.map((tr) => (tr as HTMLElement).dataset.line)), [String(second)]);
      await page.waitForTimeout(1100);
      await sk.locator(`.ctable tr.blk[data-line="${first}"]`).click();
      await sk.locator(".sk-side h4").filter({ hasText: `Claim C3 · paper_skeleton.md:${first}` }).waitFor({ state: "attached" });
      assert.deepEqual(await sk.locator(".sk-side .files li").allTextContents(), ["Code/one.py"]);
      await sk.getByText(`C3 is used by 2 rows: lines ${first} and ${second}.`, { exact: true }).waitFor({ timeout: 5000 });
      const bar = ws.getByRole("region", { name: "Selection" });
      if ((await bar.count()) > 0) await bar.getByRole("button", { name: "Clear selection" }).click();
    } finally {
      writeFileSync(file, original);
      await windowWidth(width);
    }
  });

  test("a missing paper_skeleton.md has its screen; renaming it back and Try again restores the view", SLOW, async () => {
    const { sk } = await openSkeleton(TEMPLATE_PROJECT);
    const file = skeletonFile(TEMPLATE_PROJECT);
    renameSync(file, `${file}.e2e-kept`);
    try {
      await sk.locator(".subbar").getByRole("button", { name: "Reload" }).click();
      await sk.getByText("No paper_skeleton.md to show", { exact: true }).waitFor();
      await sk
        .getByText(`projects-folder/${TEMPLATE_PROJECT}/paper_skeleton.md is not there, or it is a link the Skeleton view may not follow (one leading outside the project's paper_skeleton.md).`, { exact: true })
        .waitFor();
      await shot(page, "skeleton-7-missing-file-screen");
    } finally {
      renameSync(`${file}.e2e-kept`, file);
    }
    await sk.getByRole("button", { name: "Try again" }).click();
    await sk.getByText("No claims yet: the Claims and Evidence table has no filled row", { exact: true }).waitFor();
  });

  test("the Skeleton view's frame is sealed off: no bridge, paper_skeleton.md only, no other origin's endpoints", SLOW, async () => {
    const { sk } = await openSkeleton();
    const status = (url: string) => sk.evaluate(async (u) => (await fetch(u)).status, url);
    const rel = (p: string) => `./_os/files?path=${encodeURIComponent(p)}`;
    assert.deepEqual(
      {
        skeleton: await status(rel(`projects-folder/${PROJECT}/paper_skeleton.md`)),
        otherProject: await status(rel(`projects-folder/${TEMPLATE_PROJECT}/paper_skeleton.md`)),
        agents: await status(rel(`projects-folder/${PROJECT}/AGENTS.md`)),
        code: await status(rel(`projects-folder/${PROJECT}/Code/README.md`)),
        below: await status(rel(`projects-folder/${PROJECT}/paper_skeleton.md/x`)),
        dotEnvRoot: await status(rel(".env")),
        listing: await status(`./_os/list?path=${encodeURIComponent(`projects-folder/${PROJECT}`)}`),
        listingFile: await status(`./_os/list?path=${encodeURIComponent(`projects-folder/${PROJECT}/paper_skeleton.md`)}`),
        codeViewGit: await status(`/api/code-view/git/log?project=${PROJECT}`),
        chat: await status("/api/chat/sessions"),
        wikiStatus: await status("/api/paper-wiki/status"),
      },
      { skeleton: 200, otherProject: 200, agents: 404, code: 404, below: 404, dotEnvRoot: 404, listing: 404, listingFile: 404, codeViewGit: 404, chat: 404, wikiStatus: 404 },
    );
    const probe = await sk.evaluate(async () => {
      const outcome = async (fn: () => Promise<unknown>) => {
        try {
          return String(await fn());
        } catch (error) {
          return `blocked: ${(error as Error).name}`;
        }
      };
      return {
        own: typeof (window as { osDesktop?: unknown }).osDesktop,
        parent: await outcome(async () => typeof (window.parent as Window & { osDesktop?: unknown }).osDesktop),
        appApi: await outcome(async () => (await fetch("app://research-os/api/chat/sessions?cwd=")).status),
        wikiOrigin: await outcome(async () => (await fetch("app://paper-wiki/api/paper-wiki/status")).status),
      };
    });
    assert.equal(probe.own, "undefined");
    assert.match(probe.parent, /^blocked: SecurityError/);
    assert.match(probe.appApi, /^blocked/);
    assert.match(probe.wikiOrigin, /^blocked/);
    // No inline script runs in the page (PLUGIN_CSP has no 'unsafe-inline'), whatever reaches its DOM.
    const inline = await sk.evaluate((text) => {
      const script = document.createElement("script");
      script.textContent = text;
      document.body.append(script);
      script.remove();
      return (window as { __inline?: unknown }).__inline;
    }, INLINE_PROBE);
    assert.equal(inline, undefined, "an inline script ran in the Skeleton view's page");
    // The frame's CSP reports reach the suite, so the final check sees this frame too.
    await sk.evaluate(() => {
      const img = new Image();
      img.src = "https://csp-canary.invalid/skeleton.png";
      document.body.append(img);
      img.remove();
    });
    const canary = (lines: string[]) => lines.some((l) => /^frame app:\/\/skeleton-view\/.*csp-canary\.invalid.*Content Security Policy/.test(l));
    for (let i = 0; i < 50 && !canary(await consoleLog()); i++) await page.waitForTimeout(100);
    assert.ok(canary(await consoleLog()), "a CSP violation inside the Skeleton view's frame is seen");
  });

  /** A project's workspace with its Assets tab open, and the Assets view's frame once its groups or a screen show. */
  async function openAssets(project: string = ASSETS_PROJECT): Promise<{ ws: Locator; as: Frame }> {
    await nav(page, "Projects").click();
    await screen(page, "projects").getByRole("button", { name: `Open workspace: ${project}` }).click();
    const ws = screen(page, "workspace");
    await ws.getByRole("heading", { name: project, exact: true }).waitFor();
    await ws.getByRole("tab", { name: "Assets" }).click();
    const as = await pluginFrame(page, `app://assets-view/index.html?project=${project}`);
    await as.locator(".as-group, .placeholder").first().waitFor();
    return { ws, as };
  }
  /** A file of a project in the temporary workspace. */
  const assetFile = (project: string, rel: string) => join(workspace, "projects-folder", project, rel);
  /** The read channel's URL for a project path, as the page writes it. */
  const channelUrl = (project: string, rel: string) => `./_os/files?path=${encodeURIComponent(`projects-folder/${project}/${rel}`)}`;
  /** A picture's src without the page's Reload token (`&v=<generation>`, review M1), which it must carry. */
  const untoken = (src: string | null) => {
    assert.match(src ?? "", /&v=\d+$/, `a Reload token in ${src}`);
    return src!.replace(/&v=\d+$/, "");
  };
  /** The figure cards' pictures, once each has loaded: their src and natural width. */
  const pictures = (as: Frame) => as.locator(".fcard .thumb img").evaluateAll((imgs) => imgs.map((i) => [i.getAttribute("src"), (i as HTMLImageElement).naturalWidth] as const));
  /** The workspace takes at most 10 selections a second from a view. */
  const pause = () => page.waitForTimeout(1100);

  test("the Assets view on nanochat_cpu as copied: four groups, nothing selected", SLOW, async () => {
    // A look at the live project's copy, for the screenshot; what the suite pins is the frozen copy's, below.
    const width = await windowWidth(1440);
    try {
      const { as } = await openAssets(PROJECT);
      assert.deepEqual(await as.locator(".as-group h3").allTextContents(), ["FiguresFigs/", "Reference runsBaselines/", "ResultsCode/results/", "Datasetslisted in Code/README.md"]);
      await as.locator(".as-prev .empty").waitFor();
      await as
        .locator(".fcard .thumb img")
        .first()
        .waitFor({ timeout: 10_000 })
        .catch(() => {});
      await shot(page, "assets-1-nanochat-cpu-nothing-selected");
    } finally {
      await windowWidth(width);
    }
  });

  test("the Assets view on the frozen copy of nanochat_cpu's assets: groups, figures from the read channel, sizes, descriptions, datasets", SLOW, async () => {
    const width = await windowWidth(1440);
    try {
      const { as } = await openAssets();
      assert.equal(as.url(), `app://assets-view/index.html?project=${ASSETS_PROJECT}`);
      assert.equal(await as.locator(".subbar .vpath").textContent(), "12 items · Figs/ · Baselines/ · Code/results/ · datasets");
      await as.locator(".subbar").getByRole("button", { name: "Reload" }).waitFor();
      assert.deepEqual(await as.locator(".as-group h3").allTextContents(), ["FiguresFigs/", "Reference runsBaselines/", "ResultsCode/results/", "Datasetslisted in Code/README.md"]);
      // Two figure cards, each an <img> whose src is the read channel's URL for the file, drawn.
      const figures = ["baseline_training_curves.svg", "probe_comparison.svg"];
      assert.deepEqual(await as.locator(".fcard .nm").allTextContents(), figures);
      await as.locator(".fcard .thumb img").nth(1).waitFor();
      assert.deepEqual(
        (await pictures(as)).map(([src, w]) => [untoken(src), w > 0]),
        figures.map((name) => [channelUrl(ASSETS_PROJECT, `Figs/${name}`), true]),
      );
      assert.equal(await as.locator(".fcard .thumb img").evaluateAll((imgs) => imgs.every((i) => i.getAttribute("alt") === "" && i.attributes.length === 2)), true, "src and alt only");
      // Sizes from the listing, as the files in the workspace have them (a CRLF checkout changes them).
      assert.deepEqual(await as.locator(".fcard .mt").allTextContents(), figures.map((name) => sizeWords(statSync(assetFile(ASSETS_PROJECT, `Figs/${name}`)).size)));
      const rows = (group: string) => as.locator(".as-group").filter({ has: as.locator("h3", { hasText: group }) }).locator(".frow");
      assert.deepEqual(await rows("Reference runs").locator(".nm").allTextContents(), [
        "Baseline_readme.md",
        "openresearch-demo/README.md",
        "openresearch-demo/evaluation-metrics.json",
        "openresearch-demo/training-metrics.csv",
      ]);
      assert.deepEqual(
        await rows("Reference runs").locator(".sz").allTextContents(),
        ["Baselines/Baseline_readme.md", "Baselines/openresearch-demo/README.md", "Baselines/openresearch-demo/evaluation-metrics.json", "Baselines/openresearch-demo/training-metrics.csv"].map((rel) =>
          sizeWords(statSync(assetFile(ASSETS_PROJECT, rel)).size),
        ),
      );
      // Only the two files the folder's README.md describes have a second line.
      assert.deepEqual(await rows("Reference runs").locator(".mt").allTextContents(), [
        "base bpb, the CORE tasks that were completed, and the final headline metrics.",
        "base and SFT loss, validation bpb, throughput, and elapsed time by step.",
      ]);
      assert.deepEqual(await rows("Results").locator(".nm").allTextContents(), ["summary.json", "training_metrics.csv"]);
      await as.getByText("The Code view also lists these files.", { exact: true }).waitFor();
      // The datasets Code/README.md lists, its words before the table as the note, and an empty Code/Datasets/.
      const data = as.locator(".as-group").filter({ has: as.locator("h3", { hasText: "Datasets" }) });
      assert.deepEqual(await data.locator(".frow .nm").allTextContents(), ["karpathy/climbmix-400b-shuffle", "HuggingFaceTB/smol-smoltalk", "cais/mmlu", "openai/gsm8k"]);
      assert.deepEqual(await data.locator(".frow .sz").allTextContents(), ["listed", "listed", "listed", "listed"]);
      assert.ok(((await data.locator(".gnote").textContent()) ?? "").startsWith("Data is downloaded on demand into Code/nanochat/.cache/nanochat/"));
      await data.getByText("Code/Datasets/ is empty", { exact: true }).waitFor();
      await as.locator(".as-prev .empty").filter({ hasText: "Select a figure or a file to preview it here." }).waitFor();
      assert.equal(await as.locator(".picked, .on").count(), 0);
    } finally {
      await windowWidth(width);
    }
  });

  test("a figure, a CSV, a JSON file, and a dataset each open their own preview; a chip opens by itself; nothing is sent", SLOW, async () => {
    const sessionFiles = readdirSync(sessions).length;
    const width = await windowWidth(1440);
    try {
      const { ws, as } = await openAssets();
      const bar = ws.getByRole("region", { name: "Selection" });
      const chat = ws.getByRole("region", { name: `${ASSETS_PROJECT} agent`, exact: true });
      const chips = chat.getByRole("list", { name: "References" }).getByRole("listitem");
      await clearAsk(ws, ASSETS_PROJECT);
      const label = bar.locator("[data-selection-label]");
      const panel = as.locator(".as-prev");
      const field = (name: string) => panel.locator("dt").filter({ hasText: new RegExp(`^${name}$`) }).locator("xpath=following-sibling::dd[1]");
      const readme = assetLines("Code/README.md");

      // A figure: drawn large through the channel, where it is used, and the ask bar with its path and no quote.
      await pause();
      await as.locator(".fcard").filter({ hasText: "probe_comparison.svg" }).click();
      await panel.locator("h4").filter({ hasText: "Figure" }).waitFor();
      assert.equal(await panel.locator(".pn").textContent(), "Figs/probe_comparison.svg");
      await panel.locator(".big img").waitFor();
      assert.deepEqual(
        await panel.locator(".big img").evaluate((i) => [i.getAttribute("src"), (i as HTMLImageElement).naturalWidth > 0] as const).then(([src, drawn]) => [untoken(src), drawn]),
        [channelUrl(ASSETS_PROJECT, "Figs/probe_comparison.svg"), true],
      );
      assert.equal(await field("What").textContent(), "—");
      assert.deepEqual(await field("Used in").locator("li").allTextContents(), [`Code/README.md:${lineWith(readme, "![Probe comparison]")}`]);
      await label.filter({ hasText: "Figs/probe_comparison.svg" }).waitFor();
      assert.equal(await label.textContent(), "Figs/probe_comparison.svg");
      assert.equal(await bar.locator("[data-selection-quote]").count(), 0, "no quote");
      assert.equal(await as.locator(".fcard.picked.on").count(), 1);
      await shot(page, "assets-2-figure-selected-preview-and-ask-bar");
      await bar.getByRole("button", { name: "Ask the agent about this" }).click();
      await chips.filter({ hasText: "Figs/probe_comparison.svg" }).waitFor();
      // The chip opens by itself: the Assets view is not among the views that quote what they draw.
      const preview = chat.locator("[data-reference-preview]");
      await preview.waitFor({ timeout: 5000 });
      assert.equal(await preview.textContent(), "About Figs/probe_comparison.svg");
      await as.locator(".picked").waitFor({ state: "detached" });
      assert.equal(await as.locator(".fcard.on").count(), 1, "the preview stays open");
      await shot(page, "assets-6-composer-after-ask-chip-open");
      await chat.getByRole("button", { name: "Remove reference Figs/probe_comparison.svg" }).click();

      // A CSV: its header and first 20 rows, and how many rows it has, in the panel (not the list).
      const csvLines = assetLines("Code/results/training_metrics.csv").filter((l) => l !== "");
      await pause();
      await as.locator(".frow").filter({ hasText: "training_metrics.csv" }).click();
      await panel.locator("h4").filter({ hasText: "Table (CSV)" }).waitFor();
      await panel.locator(".mini tbody tr").first().waitFor();
      assert.deepEqual(await panel.locator(".mini th").allTextContents(), csvLines[0]!.split(","));
      assert.equal(await panel.locator(".mini tbody tr").count(), 20);
      assert.deepEqual(await panel.locator(".mini tbody tr").first().locator("td").allTextContents(), csvLines[1]!.split(","));
      const total = csvLines.length - 1;
      await panel.getByText(`First 20 of ${total.toLocaleString("en-US")} rows.`, { exact: true }).waitFor();
      assert.equal(await field("Size").textContent(), `${sizeWords(statSync(assetFile(ASSETS_PROJECT, "Code/results/training_metrics.csv")).size)} · ${total.toLocaleString("en-US")} rows`);
      await label.filter({ hasText: "Code/results/training_metrics.csv" }).waitFor();
      await shot(page, "assets-3-csv-first-rows-and-row-count");

      // A JSON file: its first 40 lines as written, and where it is used.
      const json = assetLines("Code/results/summary.json");
      const jsonLines = json[json.length - 1] === "" ? json.length - 1 : json.length;
      await pause();
      await as.locator(".frow").filter({ hasText: "summary.json" }).click();
      await panel.locator("h4").filter({ hasText: "Data (JSON)" }).waitFor();
      await panel.locator("pre").waitFor();
      assert.equal(await panel.locator("pre").textContent(), json.slice(0, 40).join("\n"));
      await panel.getByText(`First 40 of ${jsonLines} lines.`, { exact: true }).waitFor();
      const skeleton = readFileSync(join(SKELETON_FIXTURES, "nanochat_cpu.paper_skeleton.md"), "utf8").split(/\r?\n/);
      const used = await field("Used in").locator("li").allTextContents();
      assert.equal(used.length, 8);
      assert.equal(used[0], `paper_skeleton.md:${lineWith(skeleton, "| Empirical support |")} · Empirical support`);
      assert.ok(used.includes(`paper_skeleton.md:${lineWith(skeleton, "| C2: ")} · C2: base val bpb 3.4564 → 2.2882; SFT 2.2892 → 2.1456`), used.join("\n"));
      assert.equal(used[7], `Code/README.md:${lineWith(readme, "[results/summary.json](results/summary.json)):")}`);
      await shot(page, "assets-4-json-selected");

      // A described file: its description and where it comes from.
      await pause();
      await as.locator(".frow").filter({ hasText: "openresearch-demo/evaluation-metrics.json" }).click();
      await panel.locator(".pn").filter({ hasText: "Baselines/openresearch-demo/evaluation-metrics.json" }).waitFor();
      const demo = readFileSync(join(ASSETS_FIXTURES, "Baselines/openresearch-demo/README.md"), "utf8").split(/\r?\n/);
      assert.equal(
        await field("What").textContent(),
        `base bpb, the CORE tasks that were completed, and the final headline metrics.from Baselines/openresearch-demo/README.md:${lineWith(demo, "[evaluation-metrics.json]")}`,
      );

      // A dataset: its README line in the label, and what Code/README.md says about it.
      const first = lineWith(readme, "| Pretraining text |");
      await pause();
      await as.locator(".frow").filter({ hasText: "karpathy/climbmix-400b-shuffle" }).click();
      await label.filter({ hasText: "dataset karpathy/climbmix-400b-shuffle" }).waitFor();
      assert.equal(await label.textContent(), `Code/README.md:${first} · dataset karpathy/climbmix-400b-shuffle`);
      await panel.locator("h4").filter({ hasText: "Dataset · listed in Code/README.md" }).waitFor();
      assert.deepEqual(await panel.locator("dt").allTextContents(), ["Data", "Source", "Used", "Listed in"]);
      assert.equal(await field("Source").textContent(), "karpathy/climbmix-400b-shuffle (https://huggingface.co/datasets/karpathy/climbmix-400b-shuffle)");
      assert.equal(await field("Listed in").textContent(), `Code/README.md:${first}`);
      assert.equal(await panel.locator("a, img").count(), 0, "an address is text, never a link");
      await as.locator(".as-group").filter({ has: as.locator("h3", { hasText: "Datasets" }) }).scrollIntoViewIfNeeded();
      await shot(page, "assets-5-datasets-group");
      // The same click again clears the selection and keeps the preview.
      await pause();
      await as.locator(".frow").filter({ hasText: "karpathy/climbmix-400b-shuffle" }).click();
      await bar.waitFor({ state: "detached" });
      assert.equal(await as.locator(".frow.on").count(), 1);
      assert.equal(readdirSync(sessions).length, sessionFiles, "no message was sent");
    } finally {
      await windowWidth(width);
    }
  });

  test("in a narrow window the preview sits above the list, and nothing scrolls sideways", SLOW, async () => {
    const width = await windowWidth(1440);
    try {
      const { ws, as } = await openAssets();
      await clearAsk(ws, ASSETS_PROJECT);
      await windowWidth(1000);
      await page.waitForTimeout(300);
      assert.ok((await as.evaluate(() => innerWidth)) < 760, `the view is ${await as.evaluate(() => innerWidth)} px wide`);
      await pause();
      await as.locator(".fcard").filter({ hasText: "baseline_training_curves.svg" }).click();
      await as.locator(".as-prev .big img").waitFor();
      const [prev, list] = await as.evaluate(() => [".as-prev", ".as-list"].map((s) => document.querySelector(s)!.getBoundingClientRect().top));
      assert.ok(prev! < list!, `the preview (${prev}) is above the list (${list})`);
      assert.equal(await as.evaluate(() => [...document.querySelectorAll(".as-body, .as-list, .as-prev")].some((e) => e.scrollWidth > e.clientWidth + 1)), false);
      await shot(page, "assets-7-narrow-window");
      const bar = ws.getByRole("region", { name: "Selection" });
      if ((await bar.count()) > 0) await bar.getByRole("button", { name: "Clear selection" }).click();
    } finally {
      await windowWidth(width);
    }
  });

  test("a project made from the template: an empty Figs/, no Code/results/, the Data section's bullet as the note; an absent folder reads otherwise than an empty one", SLOW, async () => {
    const width = await windowWidth(1440);
    const figs = assetFile(TEMPLATE_PROJECT, "Figs");
    try {
      const { as } = await openAssets(TEMPLATE_PROJECT);
      assert.equal(await as.locator(".subbar .vpath").textContent(), "1 item · Figs/ · Baselines/ · datasets");
      await as.getByText("Figs/ is empty", { exact: true }).waitFor();
      await as.getByText("No Code/results/ folder this view can read", { exact: true }).waitFor();
      await as.getByText("No dataset table in Code/README.md's Data section", { exact: true }).waitFor();
      const data = as.locator(".as-group").filter({ has: as.locator("h3", { hasText: "Datasets" }) });
      assert.equal(await data.locator(".gnote li").textContent(), "Datasets live in Datasets/. Record source, version, and license per dataset.");
      await data.getByText("Code/Datasets/ is empty", { exact: true }).waitFor();
      assert.deepEqual(await as.locator(".frow .nm").allTextContents(), ["Baseline_readme.md"]);
      await shot(page, "assets-8-template-project-empty-states");
      // Figs/ gone: no longer "empty", but not there.
      renameSync(figs, `${figs}.e2e-kept`);
      await as.locator(".subbar").getByRole("button", { name: "Reload" }).click();
      await as.getByText("No Figs/ folder this view can read", { exact: true }).waitFor();
      assert.equal(await as.getByText("Figs/ is empty", { exact: true }).count(), 0);
    } finally {
      if (existsSync(`${figs}.e2e-kept`)) renameSync(`${figs}.e2e-kept`, figs);
      await windowWidth(width);
    }
  });

  test("hostile names and files: markup and odd names stay text, one name in two folders is two items, a 33 MiB CSV is refused, a depth cap is said", SLOW, async () => {
    const width = await windowWidth(1440);
    try {
      const { ws, as } = await openAssets(ODD_PROJECT);
      await clearAsk(ws, ODD_PROJECT);
      const bar = ws.getByRole("region", { name: "Selection" });
      const label = bar.locator("[data-selection-label]");
      const panel = as.locator(".as-prev");
      // Odd names reach the channel through encodeURIComponent: each opens its own file. The card is past
      // the sixty pictures, so its picture loads once it comes near the view.
      const hash = as.locator(".fcard").filter({ hasText: "has#hash.svg" });
      await hash.scrollIntoViewIfNeeded();
      await hash.locator(".thumb img").waitFor();
      assert.equal(untoken(await hash.locator(".thumb img").getAttribute("src")), channelUrl(ODD_PROJECT, "Figs/has#hash.svg"));
      assert.ok(channelUrl(ODD_PROJECT, "Figs/has#hash.svg").includes("has%23hash.svg"));
      for (const [folder, name, expect] of [
        ["Code/results", "a+b.csv", "a, b"],
        ["Code/results", "100%.json", '"percent": 100'],
        ["Code/results", "with space.md", "A link and code."],
        ["Figs", "a+b.csv", "a, b"],
      ] as const) {
        await pause();
        await as.locator(".as-group").filter({ has: as.locator("h3 small", { hasText: `${folder}/` }) }).locator(".frow").filter({ hasText: name }).click();
        await panel.locator(".pn").filter({ hasText: `${folder}/${name}` }).waitFor();
        await panel.getByText(expect, { exact: false }).first().waitFor();
        await label.filter({ hasText: `${folder}/${name}` }).waitFor();
      }
      // A label that is not the path: posted exactly, and the panel says what the agent gets (review S1).
      await pause();
      // The list draws the name with its no-break space as a marker too.
      await as.locator(".frow").filter({ hasText: "no⟨U+00A0⟩break.csv" }).click();
      await label.filter({ hasText: "Code/results/no⟨U+00A0⟩break.csv" }).waitFor();
      assert.equal(await label.textContent(), "Code/results/no⟨U+00A0⟩break.csv");
      assert.equal(
        await panel.locator(".label-note").textContent(),
        "The agent gets this name: Code/results/no⟨U+00A0⟩break.csv (characters that could be misread are written as ⟨U+…⟩).",
      );
      // One name in two folders: each opens its own preview and label.
      for (const sub of ["b", "a"]) {
        await pause();
        await as.locator(".fcard").filter({ hasText: `${sub}/plot.svg` }).click();
        await panel.locator(".pn").filter({ hasText: `Figs/${sub}/plot.svg` }).waitFor();
        assert.equal(await label.textContent(), `Figs/${sub}/plot.svg`);
        await panel.locator(".big img").waitFor();
        assert.equal(untoken(await panel.locator(".big img").getAttribute("src")), channelUrl(ODD_PROJECT, `Figs/${sub}/plot.svg`));
      }
      // Markup in names, a CSV cell, and Code/README.md's dataset table stays text.
      if (process.platform !== "win32") {
        await as.locator(".frow .nm").filter({ hasText: MARKUP_NAME }).first().waitFor();
        await as.locator(".fcard .nm").filter({ hasText: MARKUP_NAME.replace(/\.txt$/, ".svg") }).waitFor();
        await pause();
        await as.locator(".as-group").filter({ has: as.locator("h3 small", { hasText: "Code/results/" }) }).locator(".frow").filter({ hasText: MARKUP_NAME }).click();
        await panel.locator("pre").filter({ hasText: MARKUP_TEXT }).waitFor();
        await label.filter({ hasText: `Code/results/${MARKUP_NAME}` }).waitFor();
      }
      await pause();
      await as.locator(".frow").filter({ hasText: "markup.csv" }).click();
      await panel.locator(".mini td").filter({ hasText: MARKUP_TEXT }).waitFor();
      const data = as.locator(".as-group").filter({ has: as.locator("h3", { hasText: "Datasets" }) });
      assert.equal(await data.locator(".gnote").textContent(), `Words before the table, with ${MARKUP_TEXT} in them.`);
      // Two datasets of one name are two rows, each with its own line.
      await pause();
      await data.locator(".frow").nth(1).click();
      const readmeLines = readFileSync(assetFile(ODD_PROJECT, "Code/README.md"), "utf8").split(/\r?\n/);
      await label.filter({ hasText: "· dataset twice" }).waitFor();
      assert.equal(await label.textContent(), `Code/README.md:${lineWith(readmeLines, "| second |")} · dataset twice`);
      assert.equal(await panel.locator("dd").first().textContent(), "second");
      // A file over the channel's 32 MiB, binary data, and a folder past the depth cap.
      await pause();
      await as.locator(".frow").filter({ hasText: "huge.csv" }).click();
      await panel.getByText("Too large to show", { exact: true }).waitFor();
      await pause();
      await as.locator(".frow").filter({ hasText: "binary.dat" }).click();
      await panel.getByText("binary.dat holds binary data.", { exact: true }).waitFor();
      await as.locator(".frow .nm").filter({ hasText: "deep/a/b/c/within-the-depth.txt" }).waitFor();
      assert.equal(await as.locator(".frow .nm").filter({ hasText: "past-the-depth.txt" }).count(), 0);
      const note = as.getByText("More files than shown: folders more than 4 levels below Code/results/ are not listed (Code/results/deep/a/b/c/d/).", { exact: true });
      await note.waitFor();
      await note.scrollIntoViewIfNeeded();
      await shot(page, "assets-9-capped-group-depth-note");
      assert.equal(await as.evaluate(() => document.querySelectorAll("script:not([src]), iframe, object, embed, a").length), 0, "nothing in the frame came from a name or a file as markup");
      assert.equal(await page.locator('img[src="x"]').count(), 0);
      assert.deepEqual(await pwned(as), [undefined, undefined]);
      if ((await bar.count()) > 0) await bar.getByRole("button", { name: "Clear selection" }).click();
    } finally {
      await windowWidth(width);
    }
  });

  test("sixty pictures all load in the end, a few at a time, with no busy card left, also across a Reload and leaving the tab in the middle", SLOW, async () => {
    // About the window windows-x64 CI opens on its 1024 × 768 screen, a little narrower so that macOS, without a
    // window border, lays it out alike: the preview above the list, the cards in one column, some 19,000 px of them
    // seen through a view a few hundred pixels tall.
    const size = await windowSize({ width: 1000, height: 728 });
    try {
      const { ws, as } = await openAssets(ODD_PROJECT);
      // By the name: a card's text starts with its picture box's ("Loading…" while it loads).
      const cards = as.locator(".fcard").filter({ has: as.locator(".nm", { hasText: /^e2e\/p\d\d\.png$/ }) });
      assert.equal(await cards.count(), 60);
      const list = as.locator(".as-list");
      // Scroll part way, Reload while pictures load, leave the tab and come back, then scroll through all of them.
      await list.evaluate((l) => (l.scrollTop = l.scrollHeight / 3));
      await as.locator(".subbar").getByRole("button", { name: "Reload" }).click();
      await page.waitForTimeout(50);
      await ws.getByRole("tab", { name: "Overview" }).click();
      await page.waitForTimeout(400);
      await ws.getByRole("tab", { name: "Assets" }).click();
      for (let i = 0; i < 300; i++) {
        const drawn = await as.locator(".fcard .thumb img").count();
        const loadedAll = await cards.evaluateAll((cs) => cs.every((c) => (c.querySelector(".thumb img") as HTMLImageElement | null)?.naturalWidth === 48));
        if (loadedAll) break;
        // One view down from where the list is, back to the top from the bottom: every card passes through the view.
        // The page asks for a card's picture only once the card comes near the view, so a walk that jumps further than
        // that leaves the cards between its stops unasked for, and empty: in tenths of the list, as it once went, it
        // jumped some 1,900 px at a time past a view some 220 px tall here, and on windows-x64 six cards were never
        // near the view.
        await list.evaluate((l) => (l.scrollTop = l.scrollTop + l.clientHeight >= l.scrollHeight - 1 ? 0 : l.scrollTop + l.clientHeight));
        await page.waitForTimeout(drawn > 0 ? 100 : 200);
      }
      // Each card left without its picture, its box's words, and where it lies in the list; and where the list's view is.
      // A card the view never came near was never asked for (its box is empty); one it did shows what its load did.
      const undrawn = await cards.evaluateAll((cs) =>
        cs
          .filter((c) => (c.querySelector(".thumb img") as HTMLImageElement | null)?.naturalWidth !== 48)
          .map((c) => {
            const l = c.closest(".as-list")!;
            const box = c.getBoundingClientRect();
            const top = Math.round(box.top - l.getBoundingClientRect().top + l.scrollTop);
            return `${c.querySelector(".nm")?.textContent}: ${JSON.stringify(c.querySelector(".thumb")?.textContent)} at ${top}–${top + Math.round(box.height)} px`;
          }),
      );
      const view = await list.evaluate((l) => `the list's view is ${l.clientWidth} × ${l.clientHeight} px, at ${Math.round(l.scrollTop)} of ${l.scrollHeight} px`);
      assert.deepEqual(undrawn, [], `every picture is drawn; ${view}`);
      assert.equal(await cards.locator(".thumb-note").count(), 0, "no card is left waiting, busy, failed, or loading");
    } finally {
      await windowSize(size);
    }
  });

  test("Reload draws each picture as the file is now: two pictures that swapped their contents on disk swap on screen, card and panel", SLOW, async () => {
    const dir = assetFile(ODD_PROJECT, "Figs/swap");
    const one = join(dir, "one.svg");
    const two = join(dir, "two.svg");
    const wide = svgPicture("wide", "#dcebe8").replace(/width="320"/, 'width="300"');
    const narrow = svgPicture("narrow", "#f1e5cb").replace(/width="320"/, 'width="120"');
    mkdirSync(dir, { recursive: true });
    writeFileSync(one, wide);
    writeFileSync(two, narrow);
    try {
      const { ws, as } = await openAssets(ODD_PROJECT);
      await clearAsk(ws, ODD_PROJECT);
      const reload = () => as.locator(".subbar").getByRole("button", { name: "Reload" }).click();
      const cardOf = (name: string) => as.locator(".fcard").filter({ has: as.locator(".nm", { hasText: new RegExp(`^swap/${name}$`) }) });
      const widths = async () => {
        for (const name of ["one.svg", "two.svg"]) {
          await cardOf(name).scrollIntoViewIfNeeded();
          await cardOf(name).locator(".thumb img").waitFor();
        }
        await as.locator(".as-prev .big img").waitFor();
        return {
          one: await cardOf("one.svg").locator(".thumb img").evaluate((i) => (i as HTMLImageElement).naturalWidth),
          two: await cardOf("two.svg").locator(".thumb img").evaluate((i) => (i as HTMLImageElement).naturalWidth),
          panel: await as.locator(".as-prev .big img").evaluate((i) => (i as HTMLImageElement).naturalWidth),
        };
      };
      await reload();
      await cardOf("one.svg").waitFor();
      await pause();
      await cardOf("one.svg").click();
      assert.deepEqual(await widths(), { one: 300, two: 120, panel: 300 });
      // The two files swap their contents on disk; Reload draws them as they are now.
      writeFileSync(one, narrow);
      writeFileSync(two, wide);
      await reload();
      await as.locator(".as-prev .pn").filter({ hasText: "Figs/swap/one.svg" }).waitFor();
      await page.waitForTimeout(300);
      assert.deepEqual(await widths(), { one: 120, two: 300, panel: 120 }, "each card and the panel show the file as it is on disk now");
      const bar = ws.getByRole("region", { name: "Selection" });
      if ((await bar.count()) > 0) await bar.getByRole("button", { name: "Clear selection" }).click();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a click during Reload: after it, the workspace's selection and the page's marked item agree (review S3)", SLOW, async () => {
    const gone = assetFile(ODD_PROJECT, "Code/results/gone.csv");
    writeFileSync(gone, "x\nGONE\n");
    try {
      const { ws, as } = await openAssets(ODD_PROJECT);
      await clearAsk(ws, ODD_PROJECT);
      const bar = ws.getByRole("region", { name: "Selection" });
      const label = bar.locator("[data-selection-label]");
      const reload = () => as.locator(".subbar").getByRole("button", { name: "Reload" }).click();
      const row = (name: string) => as.locator(".as-group").filter({ has: as.locator("h3 small", { hasText: "Code/results/" }) }).locator(".frow").filter({ has: as.locator(".nm", { hasText: new RegExp(`^${name.replace(/[.%]/g, "\\$&")}$`) }) });
      /** The next read of paper_skeleton.md waits 3 s, so the old list stays on screen, clickable, while Reload reads. */
      const slowReload = async () => {
        await as.evaluate(() => {
          const real = window.fetch.bind(window);
          let once = true;
          window.fetch = async (input, init) => {
            if (once && String(input).includes("paper_skeleton.md")) {
              once = false;
              await new Promise((r) => setTimeout(r, 3000));
            }
            return real(input, init);
          };
        });
        await reload();
        await page.waitForTimeout(200);
      };
      await reload();
      await row("gone.csv").waitFor();
      // A file the Reload no longer finds: clicked while it reads, it is not selected afterwards, on either side.
      rmSync(gone);
      await slowReload();
      await pause();
      await row("gone.csv").click();
      await label.filter({ hasText: "Code/results/gone.csv" }).waitFor();
      await row("gone.csv").waitFor({ state: "detached", timeout: 10_000 });
      await bar.waitFor({ state: "detached", timeout: 5000 });
      assert.equal(await as.locator(".picked").count(), 0);
      // A file the Reload finds again: clicked while it reads, it is open, marked, and the workspace's selection afterwards.
      await slowReload();
      await pause();
      await row("100%.json").click();
      await label.filter({ hasText: "Code/results/100%.json" }).waitFor();
      await as.locator(".as-prev .pn").filter({ hasText: "Code/results/100%.json" }).waitFor();
      await page.waitForTimeout(3500); // the Reload ends
      assert.equal(await row("100%.json").evaluate((r) => r.classList.contains("picked") && r.classList.contains("on")), true, "marked and open after the Reload");
      assert.equal(await label.textContent(), "Code/results/100%.json");
      assert.equal(await as.locator(".picked").count(), 1);
      await bar.getByRole("button", { name: "Clear selection" }).click();
      await as.locator(".picked").waitFor({ state: "detached" });
    } finally {
      rmSync(gone, { force: true });
    }
  });

  test("an SVG that repeats its parts millions of times is not drawn without a click: the page answers, says why, and draws the rest (review M2)", SLOW, async () => {
    const { ws, as } = await openAssets(BOMB_PROJECT);
    await clearAsk(ws, BOMB_PROJECT);
    /** The page answers within 5 s, or this says it did not. */
    const answers = () => Promise.race([as.evaluate(() => "answers"), new Promise((r) => setTimeout(() => r("NO ANSWER in 5 s"), 5000))]);
    const cardOf = (name: string) => as.locator(".fcard").filter({ has: as.locator(".nm", { hasText: new RegExp(`^${name.replace(/\./g, "\\.")}$`) }) });
    const refused = "This SVG repeats its parts 6,802,462 times over; drawing it may freeze the view.";
    await cardOf("plain.svg").locator(".thumb img").waitFor({ timeout: 15_000 });
    await cardOf("bomb.svg").getByText(refused, { exact: false }).waitFor({ timeout: 15_000 });
    assert.equal(await answers(), "answers");
    assert.equal(await cardOf("bomb.svg").locator(".thumb img").count(), 0, "not drawn");
    await cardOf("bomb.svg").getByRole("button", { name: "Show" }).waitFor();
    assert.equal(await cardOf("plain.svg").locator(".thumb img").evaluate((i) => (i as HTMLImageElement).naturalWidth), 320);
    // As a row (Code/results/), it is checked when clicked, for the panel's large picture.
    await pause();
    await as.locator(".frow").filter({ has: as.locator(".nm", { hasText: /^bomb\.svg$/ }) }).click();
    await as.locator(".as-prev").getByText(refused, { exact: false }).waitFor({ timeout: 15_000 });
    assert.equal(await answers(), "answers");
    assert.equal(await as.locator(".as-prev .big img").count(), 0);
    // Show draws a refused SVG anyway: the human's choice. 5 of 10 (680,241 elements) draws in a moment.
    await cardOf("five.svg").getByRole("button", { name: "Show" }).click();
    await cardOf("five.svg").locator(".thumb img").waitFor({ timeout: 30_000 });
    assert.equal(await cardOf("five.svg").locator(".thumb img").evaluate((i) => (i as HTMLImageElement).naturalWidth), 100);
    const bar = ws.getByRole("region", { name: "Selection" });
    if ((await bar.count()) > 0) await bar.getByRole("button", { name: "Clear selection" }).click();
  });

  test("a hostile SVG shown as an <img> runs nothing and requests nothing outside the app", SLOW, async () => {
    const hits: string[] = [];
    const server = createServer((req, res) => {
      hits.push(req.url ?? "");
      res.end("x");
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const at = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const file = assetFile(ODD_PROJECT, "Figs/hostile.svg");
    try {
      // The listener does hear a request: what follows would see one.
      await fetch(`${at}/control`);
      assert.deepEqual(hits.splice(0), ["/control"]);
      writeFileSync(
        file,
        [
          `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="320" height="180" onload="window.top.__pwned=11">`,
          `<style>@import url("${at}/style.css");</style>`,
          `<script>window.top.__pwned=12; fetch("${at}/script");</script>`,
          `<rect width="320" height="180" fill="#f3e6cc"/>`,
          `<image href="${at}/image.png" width="60" height="60"/>`,
          `<image xlink:href="${at}/xlink.png" x="70" width="60" height="60"/>`,
          `<use href="${at}/use.svg#shape"/>`,
          `<foreignObject width="320" height="180"><div xmlns="http://www.w3.org/1999/xhtml"><img src="${at}/fo.png" onerror="window.top.__pwned=13"/><iframe src="${at}/frame"></iframe></div></foreignObject>`,
          `<a href="javascript:window.top.__pwned=14"><text x="16" y="160">hostile</text></a>`,
          `</svg>`,
        ].join("\n"),
      );
      const { as } = await openAssets(ODD_PROJECT);
      await as.locator(".subbar").getByRole("button", { name: "Reload" }).click();
      const card = as.locator(".fcard").filter({ has: as.locator(".nm", { hasText: /^hostile\.svg$/ }) });
      // The list on screen may be the one the Reload is about to replace: scroll to the card again if it was.
      for (let k = 0; k < 5; k++) {
        try {
          await card.scrollIntoViewIfNeeded({ timeout: 5000 });
          break;
        } catch {
          await page.waitForTimeout(300);
        }
      }
      await card.locator(".thumb img").waitFor();
      // Drawn: the image loaded (so its references had their chance), as a card and large in the panel.
      assert.equal(await card.locator(".thumb img").evaluate((i) => (i as HTMLImageElement).naturalWidth), 320);
      await pause();
      await card.click();
      await as.locator(".as-prev .big img").waitFor();
      assert.equal(await as.locator(".as-prev .big img").evaluate((i) => (i as HTMLImageElement).naturalWidth), 320);
      await card.locator(".thumb img").click();
      await page.waitForTimeout(1500);
      assert.deepEqual(hits, [], "no request left the app");
      assert.deepEqual(await pwned(as), [undefined, undefined], "no script in the SVG ran");
      // Nothing from the SVG reached the page's DOM: the only <use> elements are the page's own icons.
      assert.equal(await as.evaluate(() => document.querySelectorAll("script:not([src]), iframe, object, embed, a, foreignObject, image").length), 0);
      assert.deepEqual(await as.evaluate(() => [...new Set([...document.querySelectorAll("use")].map((u) => u.getAttribute("href")))].sort()), ["#i-db", "#i-file", "#i-table"]);
      assert.equal(as.url(), `app://assets-view/index.html?project=${ODD_PROJECT}`, "no navigation");
      const bar = screen(page, "workspace").getByRole("region", { name: "Selection" });
      if ((await bar.count()) > 0) await bar.getByRole("button", { name: "Clear selection" }).click();
    } finally {
      rmSync(file, { force: true });
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test("the Assets view's frame is sealed off: no bridge, its six roots only, no other origin's endpoints", SLOW, async () => {
    const { as } = await openAssets();
    const status = (url: string) => as.evaluate(async (u) => (await fetch(u)).status, url);
    const rel = (p: string) => `./_os/files?path=${encodeURIComponent(p)}`;
    const relList = (p: string) => `./_os/list?path=${encodeURIComponent(p)}`;
    const P = `projects-folder/${ASSETS_PROJECT}`;
    // Every refused path is a file or folder that is there in the temporary workspace.
    for (const there of ["AGENTS.md", "PROJECT_MEMORY.md", "Code/README_zh.md", "paper"]) assert.ok(existsSync(assetFile(ASSETS_PROJECT, there)), there);
    assert.ok(existsSync(join(workspace, "projects-folder", PROJECT, "Code", "e2e", "a+b.txt")));
    assert.deepEqual(
      {
        figure: await status(rel(`${P}/Figs/probe_comparison.svg`)),
        baseline: await status(rel(`${P}/Baselines/openresearch-demo/training-metrics.csv`)),
        result: await status(rel(`${P}/Code/results/summary.json`)),
        readme: await status(rel(`${P}/Code/README.md`)),
        skeleton: await status(rel(`${P}/paper_skeleton.md`)),
        figsListing: await status(relList(`${P}/Figs`)),
        datasetsListing: await status(relList(`${P}/Code/Datasets`)),
        agents: await status(rel(`${P}/AGENTS.md`)),
        memory: await status(rel(`${P}/PROJECT_MEMORY.md`)),
        readmeZh: await status(rel(`${P}/Code/README_zh.md`)),
        codeOfAnother: await status(rel(`projects-folder/${PROJECT}/Code/e2e/a+b.txt`)),
        codeListing: await status(relList(`${P}/Code`)),
        paperListing: await status(relList(`${P}/paper`)),
        projectListing: await status(relList(P)),
        dotEnvRoot: await status(rel(".env")),
        codeViewGit: await status(`/api/code-view/git/log?project=${PROJECT}`),
        chat: await status("/api/chat/sessions"),
        wikiStatus: await status("/api/paper-wiki/status"),
      },
      {
        figure: 200,
        baseline: 200,
        result: 200,
        readme: 200,
        skeleton: 200,
        figsListing: 200,
        datasetsListing: 200,
        agents: 404,
        memory: 404,
        readmeZh: 404,
        codeOfAnother: 404,
        codeListing: 404,
        paperListing: 404,
        projectListing: 404,
        dotEnvRoot: 404,
        codeViewGit: 404,
        chat: 404,
        wikiStatus: 404,
      },
    );
    const probe = await as.evaluate(async () => {
      const outcome = async (fn: () => Promise<unknown>) => {
        try {
          return String(await fn());
        } catch (error) {
          return `blocked: ${(error as Error).name}`;
        }
      };
      return {
        own: typeof (window as { osDesktop?: unknown }).osDesktop,
        parent: await outcome(async () => typeof (window.parent as Window & { osDesktop?: unknown }).osDesktop),
        appApi: await outcome(async () => (await fetch("app://research-os/api/chat/sessions?cwd=")).status),
        wikiOrigin: await outcome(async () => (await fetch("app://paper-wiki/api/paper-wiki/status")).status),
      };
    });
    assert.equal(probe.own, "undefined");
    assert.match(probe.parent, /^blocked: SecurityError/);
    assert.match(probe.appApi, /^blocked/);
    assert.match(probe.wikiOrigin, /^blocked/);
    // No inline script runs in the page (PLUGIN_CSP has no 'unsafe-inline').
    const inline = await as.evaluate((text) => {
      const script = document.createElement("script");
      script.textContent = text;
      document.body.append(script);
      script.remove();
      return (window as { __inline?: unknown }).__inline;
    }, INLINE_PROBE);
    assert.equal(inline, undefined, "an inline script ran in the Assets view's page");
    // The frame's CSP reports reach the suite, so the final check sees this frame too.
    await as.evaluate(() => {
      const img = new Image();
      img.src = "https://csp-canary.invalid/assets.png";
      document.body.append(img);
      img.remove();
    });
    const canary = (lines: string[]) => lines.some((l) => /^frame app:\/\/assets-view\/.*csp-canary\.invalid.*Content Security Policy/.test(l));
    for (let i = 0; i < 50 && !canary(await consoleLog()); i++) await page.waitForTimeout(100);
    assert.ok(canary(await consoleLog()), "a CSP violation inside the Assets view's frame is seen");
  });

  /** A project's workspace with its Idea tab open, and the Idea view's frame once its map or a screen shows. */
  async function openIdea(project: string = PROJECT): Promise<{ ws: Locator; iv: Frame }> {
    await nav(page, "Projects").click();
    await screen(page, "projects").getByRole("button", { name: `Open workspace: ${project}` }).click();
    const ws = screen(page, "workspace");
    await ws.getByRole("heading", { name: project, exact: true }).waitFor();
    await ws.getByRole("tab", { name: "Idea", exact: true }).click();
    const iv = await pluginFrame(page, `app://idea-view/index.html?project=${project}`);
    await iv.locator(".idea-main, .placeholder").first().waitFor();
    return { ws, iv };
  }
  const ideaFile = (project: string) => join(workspace, "projects-folder", project, "idea_graph.md");
  const reloadIdea = (iv: Frame) => iv.locator(".subbar").getByRole("button", { name: "Reload" }).click();
  /** A node of the map by its ID. */
  const nodeOf = (iv: Frame, id: string) => iv.locator("button.gnode").filter({ has: iv.locator(".gn-top .kb", { hasText: new RegExp(`^${id}$`) }) });
  /** Where the map lies in the view and where a node lies on it: a failure on a machine the suite cannot reach names its cause. */
  const ideaGeometry = (iv: Frame, id?: string) =>
    iv.evaluate((which) => {
      const c = document.querySelector(".canvas")!;
      const svg = document.querySelector("svg.gmap");
      const node = which === undefined ? null : [...document.querySelectorAll("button.gnode")].find((b) => b.querySelector(".kb")?.textContent === which);
      const r = node?.getBoundingClientRect();
      const cr = c.getBoundingClientRect();
      return `the view is ${innerWidth} × ${innerHeight} px; the map's box ${c.clientWidth} × ${c.clientHeight} px at ${Math.round(cr.left)},${Math.round(cr.top)}, scrolled to ${Math.round(c.scrollLeft)},${Math.round(c.scrollTop)} of ${c.scrollWidth} × ${c.scrollHeight}; the map ${svg?.getAttribute("width")} × ${svg?.getAttribute("height")} for ${svg?.getAttribute("viewBox")}${r === undefined ? "" : `; ${which} at ${Math.round(r.left)},${Math.round(r.top)} (${Math.round(r.width)} × ${Math.round(r.height)})`}`;
    }, id);

  test("the Idea view on nanochat_cpu: the empty state, then the mockup's graph after Reload; columns, lines, E2's details, and a chip; nothing is sent", SLOW, async () => {
    const sessionFiles = readdirSync(sessions).length;
    const width = await windowWidth(1440);
    const file = ideaFile(PROJECT);
    try {
      const { ws, iv } = await openIdea();
      assert.equal(iv.url(), `app://idea-view/index.html?project=${PROJECT}`);
      await clearAsk(ws, PROJECT);
      // No idea_graph.md: the empty state, with the header line an agent writes.
      assert.ok(!existsSync(file), "the copy has no idea_graph.md");
      await iv.getByText("No idea file to draw", { exact: true }).waitFor();
      assert.equal(await iv.locator(".placeholder pre.header").textContent(), "| ID | Kind | Statement | Status | Links | Points to | Source |");
      assert.equal(await iv.locator(".subbar .vpath").textContent(), `projects-folder/${PROJECT}/idea_graph.md`);
      await shot(page, "idea-1-empty-state");

      // The mockup's graph written into the copy, and Reload.
      const lines = ideaLines("mockup.idea_graph.md");
      writeFileSync(file, lines.join("\n"));
      await reloadIdea(iv);
      await iv.locator("button.gnode").nth(19).waitFor();
      assert.equal(await iv.locator("button.gnode").count(), 20);
      assert.equal(await iv.locator(".subbar .count").textContent(), "20 nodes · 9 links");
      assert.equal(await iv.locator("details.problems").count(), 0, "no problem");
      assert.deepEqual(await iv.locator(".ghead").allTextContents(), ["QQuestions · 4", "EExperiments · 5", "RResults · 6", "CClaims · 5"]);
      // One line for each link and each result's experiment.
      assert.equal(await iv.locator(".glines path").count(), 9 + 6);
      assert.equal(await iv.locator(".glines path.from").count(), 6);
      const legend = (await iv.locator(".glegend").textContent()) ?? "";
      assert.ok(legend.includes("refutes · none") && legend.includes("hypotheses · none") && legend.includes("the result'sexperiment(from Points to)"), legend);
      // Every row of the legend fits its box: none is cut.
      const cut = await iv.locator(".glegend div").evaluateAll((rows) => rows.filter((r) => r.scrollWidth > r.clientWidth + 1).map((r) => `${r.textContent}: ${r.scrollWidth} > ${r.clientWidth}`));
      assert.deepEqual(cut, [], "legend rows wider than the legend");
      // Columns by kind: every question left of every experiment, and so on.
      const xs = await iv.locator("button.gnode").evaluateAll((bs) => bs.map((b) => [b.querySelector(".kb")!.textContent!, Math.round(b.getBoundingClientRect().left)] as const));
      for (const [id, x] of xs) assert.equal(x, xs.find(([other]) => other[0] === id[0])![1], `${id} sits in its kind's column`);
      assert.ok(xs.find(([id]) => id === "Q1")![1] < xs.find(([id]) => id === "E1")![1] && xs.find(([id]) => id === "E1")![1] < xs.find(([id]) => id === "R1")![1] && xs.find(([id]) => id === "R1")![1] < xs.find(([id]) => id === "C1")![1]);
      const panel = iv.locator(".ndetail");
      assert.equal(await panel.locator(".nd-text").textContent(), "20 nodes: 4 questions, 5 experiments, 6 results, 5 claims; none is a hypothesis.");
      assert.ok(((await panel.textContent()) ?? "").includes("5 of 5 verified in paper_skeleton.md"));
      await shot(page, "idea-2-graph-nothing-selected");

      // E2: its details above the map, its lines labelled, the ask bar.
      const bar = ws.getByRole("region", { name: "Selection" });
      const label = bar.locator("[data-selection-label]");
      await pause();
      await nodeOf(iv, "E2").click();
      await label.filter({ hasText: "idea_graph.md · E2 (experiment)" }).waitFor();
      assert.equal(await label.textContent(), "idea_graph.md · E2 (experiment)");
      const row = lines.find((l) => l.startsWith("| E2 |"))!;
      assert.equal(await label.getAttribute("title"), row, "the quote is the row as written");
      assert.equal(await iv.locator("button.gnode.picked").count(), 1);
      assert.equal(await nodeOf(iv, "E2").evaluate((b) => b.classList.contains("on") && b.classList.contains("picked")), true);
      const detail = (await panel.textContent()) ?? "";
      for (const part of ["experiment", "Every stage:", "Tests", "Motivated by", "Its results", "Commit: none recorded by the run", "Code/results/summary.json", "Code/results/training_metrics.csv", "Code/README.md:122"]) assert.ok(detail.includes(part), `${part} in: ${detail}`);
      assert.deepEqual(await panel.locator(".lgroup").evaluateAll((gs) => gs.map((g) => g.textContent)), ["TestsQ1", "Motivated byR1", "Its resultsR2R3R4"]);
      assert.equal(await iv.locator(".glines path.hot").count(), 5, "E2's five lines");
      assert.deepEqual((await iv.locator(".labels .elabel").allTextContents()).sort(), ["came from", "came from", "came from", "motivates", "tests"]);
      // Each word whole, inside the slot layout.ts gave it (beside the node it names), and on no node's ID, status, or statement.
      const words = await iv.locator(".labels .elabel").evaluateAll((ls) =>
        ls.map((l) => {
          const r = l.getBoundingClientRect();
          const s = l.closest("foreignObject")!.getBoundingClientRect();
          const onText = [...document.querySelectorAll("button.gnode .gn-tx, button.gnode .gn-top .kb, button.gnode .gn-top .st")].some((t) => {
            const q = t.getBoundingClientRect();
            return Math.min(r.right, q.right) - Math.max(r.left, q.left) > 1 && Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top) > 1;
          });
          return { text: l.textContent, cut: l.scrollWidth > l.clientWidth + 1, outside: r.left < s.left - 0.5 || r.right > s.right + 0.5 || r.top < s.top - 0.5 || r.bottom > s.bottom + 0.5, onText };
        }),
      );
      assert.deepEqual(words.filter((w) => w.cut || w.outside || w.onText), [], "a word cut, outside its slot, or on a node's text");
      await shot(page, "idea-3-node-E2-selected-details-and-ask-bar");

      // Ask: a chip whose text opens by itself (the quote is the row as written, not what the map draws).
      const chat = ws.getByRole("region", { name: `${PROJECT} agent`, exact: true });
      const chips = chat.getByRole("list", { name: "References" }).getByRole("listitem");
      await bar.getByRole("button", { name: "Ask the agent about this" }).click();
      await chips.filter({ hasText: "idea_graph.md · E2 (experiment)" }).waitFor();
      const preview = chat.locator("[data-reference-preview]");
      await preview.waitFor({ timeout: 5000 });
      assert.equal(await preview.textContent(), `About idea_graph.md · E2 (experiment)\n> ${row}`);
      assert.equal(await bar.count(), 0, "asking clears the selection");
      await iv.locator(".picked").waitFor({ state: "detached" });
      await panel.locator(".nd-head .nd-kind", { hasText: "experiment" }).waitFor(); // E2 stays open
      await chat.getByRole("button", { name: "Remove reference idea_graph.md · E2 (experiment)" }).click();
      assert.equal(await chips.count(), 0);

      // A chip in the panel opens and selects the node it names; a second click on a node clears the selection, Escape too.
      await pause();
      await panel.locator(".lchip", { hasText: "R3" }).click();
      await label.filter({ hasText: "idea_graph.md · R3 (result)" }).waitFor();
      assert.equal(await nodeOf(iv, "R3").evaluate((b) => b.classList.contains("on") && b.classList.contains("picked")), true);
      assert.ok(((await panel.textContent()) ?? "").includes("Supports"));
      await pause();
      await nodeOf(iv, "R3").click();
      await bar.waitFor({ state: "detached" });
      assert.equal(await iv.locator(".picked").count(), 0);
      await pause();
      await nodeOf(iv, "C2").click();
      await label.filter({ hasText: "idea_graph.md · C2 (claim)" }).waitFor();
      assert.ok(((await panel.textContent()) ?? "").includes("Row C2 of the Claims and Evidence table, paper_skeleton.md:116"));
      await iv.locator("body").press("Escape");
      await bar.waitFor({ state: "detached" });
      assert.equal(readdirSync(sessions).length, sessionFiles, "no message was sent");
    } finally {
      await windowWidth(width);
    }
  });

  test("the Idea view in a narrow and a wide window: the map fits at a scale between 0.8 and 1, scrolls inside its box, and a node far right is selected", SLOW, async () => {
    // About the window windows-x64 CI opens (1024 × 768 screen), then a wide one.
    const size = await windowSize({ width: 1000, height: 728 });
    try {
      const { ws, iv } = await openIdea();
      await clearAsk(ws, PROJECT);
      await nodeOf(iv, "C5").waitFor();
      const bar = ws.getByRole("region", { name: "Selection" });
      const label = bar.locator("[data-selection-label]");
      for (const [name, set] of [
        ["narrow", () => windowSize({ width: 1000, height: 728 })],
        ["wide", () => windowSize({ width: 1440, height: 900 })],
      ] as const) {
        await set();
        await page.waitForTimeout(400);
        const scale = await iv.locator("svg.gmap").evaluate((s) => Number(s.getAttribute("width")) / Number(s.getAttribute("viewBox")!.split(" ")[2]));
        assert.ok(scale >= 0.799 && scale <= 1, `${name}: scale ${scale}; ${await ideaGeometry(iv)}`);
        // Nothing scrolls sideways but the map's own box.
        assert.equal(await iv.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1 && document.querySelector(".idea-main")!.scrollWidth <= document.querySelector(".idea-main")!.clientWidth + 1), true, `${name}: ${await ideaGeometry(iv)}`);
        await pause();
        await nodeOf(iv, "C5").click();
        await label.filter({ hasText: "idea_graph.md · C5 (claim)" }).waitFor({ timeout: 5000 }).catch(async (error: Error) => {
          throw new Error(`${name}: C5 was not selected (${error.message}); ${await ideaGeometry(iv, "C5")}`);
        });
        const seen = await nodeOf(iv, "C5").evaluate((b) => {
          const r = b.getBoundingClientRect();
          const c = document.querySelector(".canvas")!.getBoundingClientRect();
          return r.left >= c.left - 1 && r.right <= c.right + 1 && r.top >= c.top - 1 && r.bottom <= c.bottom + 1;
        });
        assert.ok(seen, `${name}: C5 is in view after its click; ${await ideaGeometry(iv, "C5")}`);
        if (name === "narrow") await shot(page, "idea-5-narrow-window-node-selected");
        else await shot(page, "idea-6-wide-window-node-selected");
        await iv.locator("body").press("Escape");
        await bar.waitFor({ state: "detached" });
      }
    } finally {
      await windowSize(size);
    }
  });

  test("a file with no graph table has its screen; one with bad rows lists its problems; markup in a statement runs nothing; a missing file is the empty state again", SLOW, async () => {
    const width = await windowWidth(1440);
    const file = ideaFile(IDEA_PROJECT);
    const original = readFileSync(file, "utf8");
    try {
      const { ws, iv } = await openIdea(IDEA_PROJECT);
      await clearAsk(ws, IDEA_PROJECT);
      await nodeOf(iv, "C2").waitFor();
      // A header with inline marks is another header: the screen names what it searched and what it found.
      writeFileSync(file, `# Idea graph\n\n| **ID** | Kind | Statement | Status | Links | Points to | Source |\n|---|---|---|---|---|---|---|\n| Q1 | question | q | open |  |  |  |\n`);
      await reloadIdea(iv);
      await iv.getByText("No idea graph table", { exact: true }).waitFor();
      await iv.getByText("No table with the expected header was found in idea_graph.md.", { exact: true }).waitFor();
      assert.equal(await iv.locator(".placeholder .found").textContent(), "The first table's header, on line 3: | **ID** | Kind | Statement | Status | Links | Points to | Source |");
      await iv.locator(".placeholder").getByRole("button", { name: "Try again" }).waitFor();
      await shot(page, "idea-7-no-table-screen");

      // The design's example, a row with two problems, a link to nothing, and markup in a statement.
      const lines = ideaLines("example.idea_graph.md").filter((l) => l !== "");
      writeFileSync(
        file,
        [...lines, "| Q2 | Question | a kind spelled otherwise | done |  |  |  |", "| X1 | question | x | open | tests Q9 |  |  |", `| M1 | question | ${MARKUP_TEXT} | open |  |  | ![x](https://md-image.invalid/a.png) [y](javascript:window.top.__pwned=6) |`, ""].join("\n"),
      );
      await reloadIdea(iv);
      await nodeOf(iv, "M1").waitFor();
      const problems = iv.locator("details.problems");
      assert.equal(await problems.locator("summary").textContent(), "2 problems in idea_graph.md");
      await problems.locator("summary").click();
      // The example's blank line is left out above, so its rows are on lines 4 to 7, and these on 8 to 10.
      assert.deepEqual(await problems.locator("li").allTextContents(), [
        "line 8: the row is left out: its kind “Question” is not question, hypothesis, experiment, result, or claim.",
        "line 9: X1's link “tests Q9” is left out: no node in the table has the ID Q9.",
      ]);
      await shot(page, "idea-4-problems-open");
      // The longest legend rows ("motivates · none") fit too.
      const legend = (await iv.locator(".glegend").textContent()) ?? "";
      assert.ok(legend.includes("motivates · none") && legend.includes("refutes · none"), legend);
      assert.deepEqual(await iv.locator(".glegend div").evaluateAll((rows) => rows.filter((r) => r.scrollWidth > r.clientWidth + 1).map((r) => r.textContent)), [], "legend rows wider than the legend");
      assert.equal(await nodeOf(iv, "M1").locator(".gn-tx").textContent(), MARKUP_TEXT, "the statement's markup is its text");
      await pause();
      await nodeOf(iv, "M1").click();
      const panel = iv.locator(".ndetail");
      await panel.locator(".nd-text").filter({ hasText: MARKUP_TEXT }).waitFor();
      const link = panel.locator(".mdlink");
      assert.equal(await link.getAttribute("title"), "javascript:window.top.__pwned=6");
      assert.equal(await link.getAttribute("href"), null);
      await link.click();
      await page.waitForTimeout(400);
      assert.equal(iv.url(), `app://idea-view/index.html?project=${IDEA_PROJECT}`, "the link is not followed");
      assert.equal(await panel.locator(".mdimg").textContent(), "x", "the image is its alt text");
      assert.equal(await iv.evaluate(() => document.querySelectorAll("img, a, iframe, object, embed, script:not([src])").length), 0, "nothing in the frame came from the file as markup");
      assert.deepEqual(await pwned(iv), [undefined, undefined]);
      assert.equal(await page.locator('img[src="x"]').count(), 0);
      await problems.locator("summary").click();

      // The file gone: the empty state, and the selection with it; back, and Reload draws it again.
      const bar = ws.getByRole("region", { name: "Selection" });
      await bar.locator("[data-selection-label]").filter({ hasText: "idea_graph.md · M1 (question)" }).waitFor();
      renameSync(file, `${file}.e2e-kept`);
      await reloadIdea(iv);
      await iv.getByText("No idea file to draw", { exact: true }).waitFor();
      await bar.waitFor({ state: "detached", timeout: 5000 });
      renameSync(`${file}.e2e-kept`, file);
      await reloadIdea(iv);
      await nodeOf(iv, "M1").waitFor();
      assert.equal(await iv.locator(".picked").count(), 0, "a node gone and back is not selected again");
    } finally {
      if (existsSync(`${file}.e2e-kept`)) renameSync(`${file}.e2e-kept`, file);
      writeFileSync(file, original);
      await windowWidth(width);
    }
  });

  test("a click during Reload: after it, the workspace's selection and the page's marked node agree, and a changed row is posted again", SLOW, async () => {
    const width = await windowWidth(1440);
    const file = ideaFile(IDEA_PROJECT);
    const original = readFileSync(file, "utf8");
    const write = (q1: string, gone: boolean) =>
      writeFileSync(file, [`# Idea graph`, "", IDEA_HEAD, `| Q1 | question | ${q1} | open |  |  |  |`, "| E1 | experiment | e | planned | tests Q1 |  |  |", ...(gone ? ["| GONE1 | question | soon gone | open |  |  |  |"] : []), ""].join("\n"));
    try {
      write("first words", true);
      const { ws, iv } = await openIdea(IDEA_PROJECT);
      await clearAsk(ws, IDEA_PROJECT);
      await reloadIdea(iv);
      await nodeOf(iv, "GONE1").waitFor();
      const bar = ws.getByRole("region", { name: "Selection" });
      const label = bar.locator("[data-selection-label]");
      /** The next read of paper_skeleton.md waits 3 s, so the old map stays on screen, clickable, while Reload reads. */
      const slowReload = async () => {
        await iv.evaluate(() => {
          const real = window.fetch.bind(window);
          let once = true;
          window.fetch = async (input, init) => {
            if (once && String(input).includes("paper_skeleton.md")) {
              once = false;
              await new Promise((r) => setTimeout(r, 3000));
            }
            return real(input, init);
          };
        });
        await reloadIdea(iv);
        await page.waitForTimeout(200);
      };
      // A node the Reload no longer finds: clicked while it reads, it is not selected afterwards, on either side.
      write("first words", false);
      await slowReload();
      await pause();
      await nodeOf(iv, "GONE1").click();
      await label.filter({ hasText: "idea_graph.md · GONE1 (question)" }).waitFor();
      await nodeOf(iv, "GONE1").waitFor({ state: "detached", timeout: 10_000 });
      await bar.waitFor({ state: "detached", timeout: 5000 });
      assert.equal(await iv.locator(".picked").count(), 0);
      // A node the Reload finds again, its row changed: clicked while it reads, it is open, marked, and posted again with its new row.
      write("second words", false);
      await slowReload();
      await pause();
      await nodeOf(iv, "Q1").click();
      await label.filter({ hasText: "idea_graph.md · Q1 (question)" }).waitFor();
      assert.equal(await label.getAttribute("title"), "| Q1 | question | first words | open |  |  |  |", "the row as the old file had it");
      await iv.locator(".ndetail .nd-text").filter({ hasText: "second words" }).waitFor({ timeout: 10_000 });
      await page.waitForTimeout(300);
      assert.equal(await nodeOf(iv, "Q1").evaluate((b) => b.classList.contains("picked") && b.classList.contains("on")), true, "marked and open after the Reload");
      assert.equal(await label.textContent(), "idea_graph.md · Q1 (question)");
      assert.equal(await label.getAttribute("title"), "| Q1 | question | second words | open |  |  |  |", "posted again with the row as it is now");
      assert.equal(await iv.locator(".picked").count(), 1);
      await bar.getByRole("button", { name: "Clear selection" }).click();
      await iv.locator(".picked").waitFor({ state: "detached" });
    } finally {
      writeFileSync(file, original);
      await windowWidth(width);
    }
  });

  test("a Reload that ends while Home is shown: back in the workspace, the ask bar and the page agree, a changed row as it is now, a removed node on neither, a selection cleared on Home on neither", SLOW, async () => {
    const width = await windowWidth(1440);
    const file = ideaFile(IDEA_PROJECT);
    const original = readFileSync(file, "utf8");
    const write = (q1: string, gone: boolean) =>
      writeFileSync(file, [`# Idea graph`, "", IDEA_HEAD, `| Q1 | question | ${q1} | open |  |  |  |`, ...(gone ? [] : ["| GONE1 | question | soon gone | open |  |  |  |"]), ""].join("\n"));
    /** What the page marks: the picked node's ID, or null (read without waiting: the frame is hidden while Home shows). */
    const picked = (iv: Frame) => iv.evaluate(() => document.querySelector("button.gnode.picked .kb")?.textContent ?? null);
    try {
      write("first words", false);
      const { ws, iv } = await openIdea(IDEA_PROJECT);
      await clearAsk(ws, IDEA_PROJECT);
      const bar = ws.getByRole("region", { name: "Selection" });
      const label = bar.locator("[data-selection-label]");
      for (const [what, pick, change] of [
        ["a changed row", "Q1", () => write("second words", false)],
        ["a removed node", "GONE1", () => write("first words", true)],
        ["a changed row, then Escape on Home", "Q1", () => write("second words", false)],
      ] as const) {
        write("first words", false);
        await reloadIdea(iv);
        await nodeOf(iv, "GONE1").waitFor();
        await pause();
        await nodeOf(iv, pick).click();
        await label.filter({ hasText: `idea_graph.md · ${pick} (question)` }).waitFor();
        change();
        // The next read of paper_skeleton.md waits 3 s, so the Reload ends while Home is shown.
        await iv.evaluate(() => {
          const real = window.fetch.bind(window);
          let once = true;
          window.fetch = async (input, init) => {
            if (once && String(input).includes("paper_skeleton.md")) {
              once = false;
              await new Promise((r) => setTimeout(r, 3000));
            }
            return real(input, init);
          };
        });
        await reloadIdea(iv);
        await page.waitForTimeout(100);
        await nav(page, "Home").click();
        await iv.waitForFunction((changed) => (changed ? document.querySelector("button.gnode .gn-tx")?.textContent === "second words" : document.querySelectorAll("button.gnode").length === 1), what !== "a removed node", { polling: 100, timeout: 10_000 });
        await page.waitForTimeout(300);
        // The workspace's Escape clears the selection, on Home too: the page's post held meanwhile goes with it.
        if (what === "a changed row, then Escape on Home") await page.keyboard.press("Escape");
        await nav(page, "Projects").click();
        await screen(page, "projects").getByRole("button", { name: `Open workspace: ${IDEA_PROJECT}` }).click();
        await ws.getByRole("heading", { name: IDEA_PROJECT, exact: true }).waitFor();
        await page.waitForTimeout(500);
        if (what === "a changed row") {
          assert.equal(await picked(iv), "Q1", `${what}: the page still marks Q1`);
          assert.equal(await bar.count(), 1, `${what}: the ask bar holds the node the page marks`);
          assert.equal(await label.textContent(), "idea_graph.md · Q1 (question)");
          assert.equal(await label.getAttribute("title"), "| Q1 | question | second words | open |  |  |  |", `${what}: the ask bar holds the row as it is now`);
          await bar.getByRole("button", { name: "Clear selection" }).click();
          await iv.locator(".picked").waitFor({ state: "detached" });
        } else {
          await iv.waitForFunction(() => document.querySelector("button.gnode.picked") === null, null, { polling: 100, timeout: 5000 }).catch(() => {});
          assert.equal(await picked(iv), null, `${what}: the page marks nothing`);
          assert.equal(await bar.count(), 0, `${what}: the ask bar offers nothing`);
        }
      }
    } finally {
      writeFileSync(file, original);
      await windowWidth(width);
    }
  });

  test("two Reloads, the first one's answer held past the second's: the map keeps the second, the file as it is now", SLOW, async () => {
    const width = await windowWidth(1440);
    const file = ideaFile(IDEA_PROJECT);
    const original = readFileSync(file, "utf8");
    const write = (q1: string) => writeFileSync(file, [`# Idea graph`, "", IDEA_HEAD, `| Q1 | question | ${q1} | open |  |  |  |`, ""].join("\n"));
    try {
      write("before both");
      const { ws, iv } = await openIdea(IDEA_PROJECT);
      await clearAsk(ws, IDEA_PROJECT);
      await reloadIdea(iv);
      await nodeOf(iv, "Q1").filter({ hasText: "before both" }).waitFor();
      // The next read of idea_graph.md takes the file's bytes at once and hands them to the page 3 s later.
      await iv.evaluate(() => {
        const real = window.fetch.bind(window);
        let once = true;
        window.fetch = async (input, init) => {
          const res = await real(input, init);
          if (!once || !String(input).includes("idea_graph.md")) return res;
          once = false;
          const bytes = await res.arrayBuffer();
          (window as { __held?: boolean }).__held = true;
          await new Promise((r) => setTimeout(r, 3000));
          return new Response(bytes, { status: res.status, headers: res.headers });
        };
      });
      write("read by the first Reload");
      await reloadIdea(iv);
      await iv.waitForFunction(() => (window as { __held?: boolean }).__held === true, null, { polling: 100, timeout: 10_000 });
      write("read by the second Reload");
      await reloadIdea(iv);
      await nodeOf(iv, "Q1").filter({ hasText: "read by the second Reload" }).waitFor();
      // Past the first Reload's answer: it is dropped, so the map still draws the file as it is now.
      await page.waitForTimeout(3500);
      assert.equal(await nodeOf(iv, "Q1").locator(".gn-tx").textContent(), "read by the second Reload");
      assert.equal(await iv.evaluate(() => (window as { __held?: boolean }).__held), true, "the first read was held");
    } finally {
      writeFileSync(file, original);
      await windowWidth(width);
    }
  });

  test("IDs of sixteen wide characters in every kind and status: each ID and status drawn whole, no two boxes alike or overlapping, the tooltip names all four; a short ID's box is as before", SLOW, async () => {
    const width = await windowWidth(1440);
    const file = ideaFile(IDEA_PROJECT);
    const original = readFileSync(file, "utf8");
    // §5.1 allows 16 characters; W is about the widest. Each ID differs from the others only in its last one.
    const STATUSES: [string, string][] = [
      ["question", "open"], ["question", "answered"], ["hypothesis", "open"], ["hypothesis", "supported"], ["hypothesis", "refuted"],
      ["experiment", "planned"], ["experiment", "running"], ["experiment", "done"], ["experiment", "failed"], ["result", "recorded"],
      ["claim", "planned"], ["claim", "verified"], ["claim", "weak"], ["claim", "removed"],
    ];
    const rows = STATUSES.map(([kind, status], k) => {
      const id = `${"W".repeat(15)}${String.fromCharCode(65 + k)}`;
      const points = kind === "experiment" && status !== "planned" ? "commit: none; files: none" : kind === "result" ? `from: ${"W".repeat(15)}H` : "";
      return { id, kind, status, row: `| ${id} | ${kind} | Statement of ${kind} ${status} | ${status} |  | ${points} |  |` };
    });
    try {
      writeFileSync(file, [`# Idea graph`, "", IDEA_HEAD, "| Q1 | question | A short ID | open |  |  |  |", ...rows.map((r) => r.row), ""].join("\n"));
      const { ws, iv } = await openIdea(IDEA_PROJECT);
      await clearAsk(ws, IDEA_PROJECT);
      await reloadIdea(iv);
      await nodeOf(iv, rows[rows.length - 1]!.id).waitFor();
      assert.equal(await iv.locator("details.problems").count(), 0, "no problem");
      const drawn = await iv.locator("button.gnode").evaluateAll((bs) =>
        bs.map((b) => {
          const kb = b.querySelector(".gn-top .kb")!;
          const st = b.querySelector(".gn-top .st")!;
          const r = b.getBoundingClientRect();
          const inside = (e: Element) => {
            const q = e.getBoundingClientRect();
            return q.left >= r.left - 0.5 && q.right <= r.right + 0.5 && q.top >= r.top - 0.5 && q.bottom <= r.bottom + 0.5;
          };
          return {
            id: kb.textContent!,
            status: st.textContent!,
            idCut: kb.scrollWidth > kb.clientWidth + 1 || kb.scrollHeight > kb.clientHeight + 1 || !inside(kb),
            statusCut: st.scrollWidth > st.clientWidth + 1 || !inside(st),
            title: (b as HTMLButtonElement).title,
            box: { x: r.left, y: r.top, w: r.width, h: r.height },
            height: Number(b.closest("foreignObject")!.getAttribute("height")),
          };
        }),
      );
      assert.equal(drawn.length, rows.length + 1);
      for (const r of rows) {
        const d = drawn.find((x) => x.id === r.id);
        assert.ok(d !== undefined, `${r.id} is drawn whole: ${drawn.map((x) => x.id).join(", ")}`);
        assert.equal(d.status, r.status);
        assert.equal(d.idCut, false, `${r.id}'s ID is cut`);
        assert.equal(d.statusCut, false, `${r.id}'s status ${r.status} is cut`);
        assert.equal(d.title, `${r.id} (${r.kind}), ${r.status}: Statement of ${r.kind} ${r.status}`);
      }
      assert.equal(new Set(drawn.map((d) => d.id)).size, drawn.length, "no two nodes draw the same ID");
      for (let i = 0; i < drawn.length; i++) {
        for (let j = i + 1; j < drawn.length; j++) {
          const [a, b] = [drawn[i]!.box, drawn[j]!.box];
          assert.ok(!(a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5), `${drawn[i]!.id} and ${drawn[j]!.id} overlap`);
        }
      }
      assert.equal(drawn.find((d) => d.id === "Q1")!.height, 48, "a short ID's box is the mockup's 48 px");
      await shot(page, "idea-8-long-ids");
      // A Reload that renders while the frame is hidden (another tab shown) measures nothing; back on the tab, the boxes
      // are measured and placed again, so nothing is cut.
      writeFileSync(file, [`# Idea graph`, "", IDEA_HEAD, "| Q1 | question | A short ID, read again | open |  |  |  |", ...rows.map((r) => r.row), ""].join("\n"));
      await ws.getByRole("tab", { name: "Code", exact: true }).click();
      await iv.evaluate(() => (document.querySelector(".subbar .reload") as HTMLButtonElement).click());
      // A hidden frame runs no animation frames: poll by time.
      await iv.waitForFunction(() => document.querySelector("button.gnode .gn-tx")?.textContent === "A short ID, read again", null, { polling: 100, timeout: 10_000 });
      await ws.getByRole("tab", { name: "Idea", exact: true }).click();
      await nodeOf(iv, rows[0]!.id).waitFor();
      await page.waitForTimeout(300);
      const again = await iv.locator("button.gnode .gn-top .kb").evaluateAll((ks) => ks.filter((k) => k.scrollWidth > k.clientWidth + 1 || k.scrollHeight > k.clientHeight + 1 || k.getBoundingClientRect().bottom > k.closest("button")!.getBoundingClientRect().bottom + 0.5).map((k) => k.textContent));
      assert.deepEqual(again, [], "IDs cut after a Reload drawn while the frame was hidden");
    } finally {
      writeFileSync(file, original);
      await windowWidth(width);
    }
  });

  test("the Idea view's frame is sealed off: no bridge, idea_graph.md and paper_skeleton.md only, no other origin's endpoints", SLOW, async () => {
    const { iv } = await openIdea();
    const status = (url: string) => iv.evaluate(async (u) => (await fetch(u)).status, url);
    const rel = (p: string) => `./_os/files?path=${encodeURIComponent(p)}`;
    const P = `projects-folder/${PROJECT}`;
    for (const there of ["AGENTS.md", "Code/README.md", "idea_graph.md", "paper_skeleton.md"]) assert.ok(existsSync(join(workspace, P, there)), there);
    assert.deepEqual(
      {
        idea: await status(rel(`${P}/idea_graph.md`)),
        skeleton: await status(rel(`${P}/paper_skeleton.md`)),
        otherIdea: await status(rel(`projects-folder/${IDEA_PROJECT}/idea_graph.md`)),
        agents: await status(rel(`${P}/AGENTS.md`)),
        code: await status(rel(`${P}/Code/README.md`)),
        below: await status(rel(`${P}/idea_graph.md/x`)),
        dotEnvRoot: await status(rel(".env")),
        listing: await status(`./_os/list?path=${encodeURIComponent(P)}`),
        listingFile: await status(`./_os/list?path=${encodeURIComponent(`${P}/idea_graph.md`)}`),
        codeViewGit: await status(`/api/code-view/git/log?project=${PROJECT}`),
        chat: await status("/api/chat/sessions"),
        wikiStatus: await status("/api/paper-wiki/status"),
      },
      { idea: 200, skeleton: 200, otherIdea: 200, agents: 404, code: 404, below: 404, dotEnvRoot: 404, listing: 404, listingFile: 404, codeViewGit: 404, chat: 404, wikiStatus: 404 },
    );
    const probe = await iv.evaluate(async () => {
      const outcome = async (fn: () => Promise<unknown>) => {
        try {
          return String(await fn());
        } catch (error) {
          return `blocked: ${(error as Error).name}`;
        }
      };
      return {
        own: typeof (window as { osDesktop?: unknown }).osDesktop,
        parent: await outcome(async () => typeof (window.parent as Window & { osDesktop?: unknown }).osDesktop),
        appApi: await outcome(async () => (await fetch("app://research-os/api/chat/sessions?cwd=")).status),
        wikiOrigin: await outcome(async () => (await fetch("app://paper-wiki/api/paper-wiki/status")).status),
      };
    });
    assert.equal(probe.own, "undefined");
    assert.match(probe.parent, /^blocked: SecurityError/);
    assert.match(probe.appApi, /^blocked/);
    assert.match(probe.wikiOrigin, /^blocked/);
    // No inline script runs in the page (PLUGIN_CSP has no 'unsafe-inline').
    const inline = await iv.evaluate((text) => {
      const script = document.createElement("script");
      script.textContent = text;
      document.body.append(script);
      script.remove();
      return (window as { __inline?: unknown }).__inline;
    }, INLINE_PROBE);
    assert.equal(inline, undefined, "an inline script ran in the Idea view's page");
    // The frame's CSP reports reach the suite, so the final check sees this frame too.
    await iv.evaluate(() => {
      const img = new Image();
      img.src = "https://csp-canary.invalid/idea.png";
      document.body.append(img);
      img.remove();
    });
    const canary = (lines: string[]) => lines.some((l) => /^frame app:\/\/idea-view\/.*csp-canary\.invalid.*Content Security Policy/.test(l));
    for (let i = 0; i < 50 && !canary(await consoleLog()); i++) await page.waitForTimeout(100);
    assert.ok(canary(await consoleLog()), "a CSP violation inside the Idea view's frame is seen");
  });

  /*
   * Skills (os-ui/PLUGINS.md Part 4): the bundled plugin skills-hub's page on
   * app://skills-hub, as the Human Owner chose it from
   * os-ui/mockups/step2/skills.html: top C, panel 1, and today's three small
   * faults kept (Q4). Its toggle clicks are on copy-form fixtures' installs
   * (skillsFixtures): one in this copy's .claude/skills and one in a fixture
   * project's, each checked to be inside the copy first; no test clicks any
   * other install.
   */
  interface SnapInstall {
    target: string;
    path: string;
    form: string;
    disabled: boolean;
  }
  interface Snap {
    store: {
      collections: { name: string; skills: { name: string; installs?: SnapInstall[] }[] }[];
      orphans: { name: string; installs?: SnapInstall[] }[];
      targets: { name: string; path: string; display_path?: string; scope: string }[];
    };
  }
  /** The workspace's snapshot, as the generator last wrote it: the file the page reads. */
  const snapshot = () => JSON.parse(readFileSync(join(workspace, "os-ui", "frontend", "public", "state.json"), "utf8")) as Snap;
  const reEscape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  /** The Skills page, opened from the left menu, and its frame once its cards (or a screen) show. */
  async function openSkills(): Promise<{ section: Locator; sh: Frame }> {
    await nav(page, "Skills").click();
    const section = screen(page, "skills-hub/skills");
    await section.waitFor();
    const sh = await pluginFrame(page, "app://skills-hub/");
    await sh.locator(".cards .skill, .status").first().waitFor({ timeout: 30_000 });
    // A panel a failed test left open would cover the cards; close it, so one failure does not fail the next tests.
    const left = sh.getByRole("dialog", { name: "Skill details" });
    if (await left.isVisible()) await left.getByRole("button", { name: "Close", exact: true }).click();
    return { section, sh };
  }
  /** A card by its skill's exact name. */
  const skillCard = (sh: Frame, name: string) => sh.locator(".cards .skill").filter({ has: sh.locator(".nm", { hasText: new RegExp(`^${reEscape(name)}$`) }) });
  const detailsPanel = (sh: Frame) => sh.getByRole("dialog", { name: "Skill details" });
  /** The open panel's row of one target, by its name and shown path exactly. */
  const installRow = (sh: Frame, target: string) => {
    const t = snapshot().store.targets.find((x) => x.name === target)!;
    return sh.locator(".drawer .irow").filter({ has: sh.locator(".iname", { hasText: new RegExp(`^${reEscape(target + (t.display_path ?? t.path))}$`) }) });
  };
  /** Opens a skill's details from the search, which narrows the cards to it. */
  async function openSkill(sh: Frame, name: string): Promise<Locator> {
    await sh.getByRole("searchbox", { name: "Search skills" }).fill(name);
    await skillCard(sh, name).click();
    const panel = detailsPanel(sh);
    await panel.getByRole("heading", { name, exact: true }).waitFor();
    return panel;
  }
  async function closeSkill(sh: Frame): Promise<void> {
    await detailsPanel(sh).getByRole("button", { name: "Close", exact: true }).click();
    await detailsPanel(sh).waitFor({ state: "hidden" });
    await sh.getByRole("searchbox", { name: "Search skills" }).fill("");
  }
  /** The text of the frame's focused element and whether it is a card. */
  const focused = (sh: Frame) => sh.evaluate(() => ({ text: document.activeElement?.textContent ?? "", card: document.activeElement?.classList.contains("skill") ?? false }));
  const copiedInstall = () => join(workspace, ".claude", "skills", COPIED_SKILL);

  test("Skills is Skills Hub's page on app://skills-hub: the band above today's header, and the workspace's skills as state.json has them", SLOW, async () => {
    // One Skills item, the plugin's, after Paper wiki and before Plugins.
    const titles = await page.getByRole("navigation", { name: "Main navigation" }).getByRole("button").evaluateAll((bs) => bs.map((b) => b.getAttribute("title")));
    assert.deepEqual(titles.slice(0, 5), ["Home", "Projects", "Paper wiki", "Skills", "Plugins"]);
    const { section, sh } = await openSkills();
    assert.equal(sh.url(), "app://skills-hub/index.html");
    assert.equal(await nav(page, "Skills").getAttribute("aria-current"), "page");
    // The host shows the bare frame here (pages.ts OWN_TOP): no title or band of its own, the frame filling the page area.
    assert.equal(await section.locator("h1").count(), 0);
    const iframe = section.locator("iframe");
    assert.equal(await iframe.count(), 1);
    assert.equal(await iframe.getAttribute("title"), "Skills Hub");
    assert.equal(await iframe.getAttribute("allow"), "clipboard-write");
    assert.deepEqual(await iframe.boundingBox(), await section.boundingBox());
    // No other frame may write the clipboard: the views' and, when opened, Paper wiki's.
    assert.deepEqual(await page.locator("iframe").evaluateAll((fs) => fs.filter((f) => f.hasAttribute("allow")).map((f) => (f as HTMLIFrameElement).src)), ["app://skills-hub/index.html"]);
    // Top C: mockup C's one-line band, then today's small line, title, and sentence.
    assert.equal(await sh.locator(".band").textContent(), "Skills Hub · bundled plugin — The research skills hub and where each skill is installed; disable or enable one install.");
    assert.equal(await sh.locator(".eyebrow").textContent(), "research-skills-hub/");
    assert.equal(await sh.getByRole("heading", { level: 1 }).textContent(), "Skills");
    assert.equal(
      await sh.locator(".lede").textContent(),
      "The research skills hub and where each skill is installed. Installing copies a command for a terminal; the one change made here is disabling or enabling a single install.",
    );
    // The skills of this workspace, as its state.json has them: All counts the orphans too.
    const { store } = snapshot();
    const total = store.collections.reduce((n, c) => n + c.skills.length, 0) + store.orphans.length;
    assert.ok(store.collections.some((c) => c.name === SKILLS_COLLECTION), "the fixture collection is in the snapshot");
    const bar = sh.getByRole("group", { name: "Filter by collection" });
    assert.deepEqual(await bar.getByRole("button").allTextContents(), [`All · ${total}`, ...store.collections.map((c) => c.name), "no hub source"]);
    assert.equal(await bar.getByRole("button", { name: `All · ${total}` }).getAttribute("aria-pressed"), "true");
    await sh.locator(".cards .skill").nth(total - 1).waitFor();
    assert.equal(await sh.locator(".cards .skill").count(), total);
    assert.equal(await skillCard(sh, COPIED_SKILL).locator(".badge").textContent(), "installed · drift ⚠", "one of the two repository folders");
    assert.equal(await skillCard(sh, ORPHAN_SKILL).locator(".badge").textContent(), "installed · no hub source ⚠");
    await shot(page, "skills-1-top-c");
  });

  test("Skills: the search and the pills narrow the cards; nonsense shows today's words", SLOW, async () => {
    const { sh } = await openSkills();
    const search = sh.getByRole("searchbox", { name: "Search skills" });
    assert.equal(await search.getAttribute("placeholder"), "Search skills...");
    await search.fill("  E2E-COP  ");
    assert.deepEqual(await sh.locator(".cards .skill .nm").allTextContents(), [COPIED_SKILL]);
    await search.fill("zzz-no-such-skill");
    await sh.getByText("No matching skills.", { exact: true }).waitFor();
    await search.fill("");
    const bar = sh.getByRole("group", { name: "Filter by collection" });
    await bar.getByRole("button", { name: SKILLS_COLLECTION, exact: true }).click();
    assert.deepEqual(await sh.locator(".cards .skill .nm").allTextContents(), [COPIED_SKILL, MARKUP_SKILL]);
    assert.equal(await bar.getByRole("button", { name: SKILLS_COLLECTION, exact: true }).getAttribute("aria-pressed"), "true");
    await bar.getByRole("button", { name: /^All · / }).click();
  });

  test("Skills: three skills with one collection and name are three cards; each opens its own skill and gets its own focus back", SLOW, async () => {
    const twins = snapshot().store.collections.find((c) => c.name === TWINS_COLLECTION)!.skills;
    assert.deepEqual(twins.map((s) => s.name), TWINS.map(() => TWIN_SKILL), "the snapshot lists the three");
    const { sh } = await openSkills();
    const bar = sh.getByRole("group", { name: "Filter by collection" });
    await bar.getByRole("button", { name: TWINS_COLLECTION, exact: true }).click();
    try {
      const cards = sh.locator(".cards .skill");
      await cards.nth(TWINS.length - 1).waitFor({ timeout: 10_000 });
      assert.deepEqual(await cards.locator(".desc").allTextContents(), TWINS.map(([, words]) => words));
      const panel = detailsPanel(sh);
      for (let i = 0; i < TWINS.length; i++) {
        await cards.nth(i).click();
        await panel.getByRole("heading", { name: TWIN_SKILL, exact: true }).waitFor();
        assert.equal(await panel.locator(".d-desc").textContent(), TWINS[i]![1], `card ${i} opens its own skill`);
        await panel.getByRole("button", { name: "Close", exact: true }).click();
        await panel.waitFor({ state: "hidden" });
        assert.equal(await sh.evaluate(() => [...document.querySelectorAll(".cards .skill")].indexOf(document.activeElement!)), i, `card ${i} gets the focus back`);
      }
    } finally {
      await bar.getByRole("button", { name: /^All · / }).click();
    }
  });

  test("Skills: a card's details slide in over the Skills area only; the left menu stays bright and clickable, and the panel is still open on return", SLOW, async () => {
    const { section, sh } = await openSkills();
    const name = "filetree-simple";
    const collection = snapshot().store.collections.find((c) => c.skills.some((s) => s.name === name))!.name;
    const panel = await openSkill(sh, name);
    assert.equal((await focused(sh)).text, "Close", "the focus moves to Close");
    assert.equal(await panel.locator(".d-src").textContent(), `Research-skills-hub / ${collection}`);
    assert.equal(await panel.locator(".cmd").textContent(), `python research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py install ${name} --collection ${collection}`);
    // Panel 1: the panel and its shading cover the frame, which is the Skills area; the left menu is beside it.
    const area = (await section.boundingBox())!;
    // The panel slides in over 220 ms: measured once it has arrived.
    await sh.locator(".drawer").evaluate((d) => Promise.all(d.getAnimations().map((a) => a.finished)).then(() => true));
    const drawer = (await sh.locator(".drawer").boundingBox())!;
    const scrim = (await sh.locator(".scrim").boundingBox())!;
    assert.deepEqual(scrim, area);
    assert.equal(drawer.width, 420);
    assert.ok(Math.abs(drawer.x + drawer.width - (area.x + area.width)) < 1 && Math.abs(drawer.y - area.y) < 1 && Math.abs(drawer.height - area.height) < 1, JSON.stringify({ drawer, area }));
    const menu = (await page.getByRole("navigation", { name: "Main navigation" }).boundingBox())!;
    assert.ok(menu.x + menu.width <= area.x, JSON.stringify({ menu, area }));
    // The menu works with the panel open: Home, then back to Skills, where the panel is as it was.
    await nav(page, "Home").click();
    await screen(page, "home").getByRole("heading", { name: "Home", exact: true }).waitFor();
    await nav(page, "Skills").click();
    await panel.getByRole("heading", { name, exact: true }).waitFor();
    assert.equal(await sh.locator(".drawer").getAttribute("aria-hidden"), "false");
    // Close gives the focus back to the card.
    await panel.getByRole("button", { name: "Close", exact: true }).click();
    await panel.waitFor({ state: "hidden" });
    assert.deepEqual(await focused(sh), { text: (await skillCard(sh, name).textContent())!, card: true });
    // Escape closes it too, and, as today, leaves the focus off the card (F3 of Part 4 §1.7).
    await skillCard(sh, name).click();
    await panel.getByRole("heading", { name, exact: true }).waitFor();
    await page.keyboard.press("Escape");
    await panel.waitFor({ state: "hidden" });
    assert.equal((await focused(sh)).card, false);
    // A click on the shading closes it and gives the focus back.
    await skillCard(sh, name).click();
    await panel.getByRole("heading", { name, exact: true }).waitFor();
    await sh.locator(".scrim").click({ position: { x: 20, y: 20 } });
    await panel.waitFor({ state: "hidden" });
    assert.equal((await focused(sh)).card, true);
    await sh.getByRole("searchbox", { name: "Search skills" }).fill("");
  });

  test("Skills: disable then enable the copy-form fixture's one install through app://skills-hub's handler; the files change, and the page shows it as today's did", SLOW, async () => {
    // The one install this suite clicks: repo-claude, copy form, in this copy's own .claude/skills.
    const { store } = snapshot();
    const repoClaude = store.targets.find((t) => t.name === "repo-claude")!;
    assert.equal(repoClaude.path, join(workspace, ".claude", "skills"));
    const install = store.collections.find((c) => c.name === SKILLS_COLLECTION)!.skills.find((s) => s.name === COPIED_SKILL)!.installs!;
    assert.deepEqual(install.map((i) => [i.target, i.path, i.form, i.disabled]), [["repo-claude", copiedInstall(), "copy", false]]);
    assert.ok(copiedInstall().startsWith(workspace + sep), "inside the copy");
    // The global targets resolve in the suite's throwaway home, not the real one (isolatedHome); none is clicked.
    const globals = store.targets.filter((x) => x.scope === "global");
    assert.equal(globals.length, 3);
    for (const t of globals) assert.ok(throwawayHome !== null && t.path.startsWith(throwawayHome + sep), `${t.name}: ${t.path}`);
    const { sh } = await openSkills();
    const panel = await openSkill(sh, COPIED_SKILL);
    assert.equal(await panel.locator(".inst-head").textContent(), `copy → hub1 of ${store.targets.length} installed`);
    const row = installRow(sh, "repo-claude");
    assert.equal(await row.getByRole("button").getAttribute("aria-pressed"), "true");
    await row.getByRole("button", { name: "disable", exact: true }).click();
    await row.getByRole("button", { name: "working...", exact: true }).waitFor();
    assert.equal(await row.getByRole("button").isDisabled(), true);
    // Done: the copy's SKILL.md is renamed, the snapshot was regenerated first, and the open panel keeps its word (F1).
    await row.locator("button:not([disabled])").waitFor({ timeout: 150_000 });
    assert.equal(await sh.locator(".drawer .ierr").isVisible(), false, (await sh.locator(".drawer .ierr").textContent()) ?? "");
    assert.ok(existsSync(join(copiedInstall(), "SKILL.md.disabled")) && !existsSync(join(copiedInstall(), "SKILL.md")), "disabled on disk");
    assert.equal(snapshot().store.collections.find((c) => c.name === SKILLS_COLLECTION)!.skills.find((s) => s.name === COPIED_SKILL)!.installs![0]!.disabled, true);
    assert.equal(await row.getByRole("button").textContent(), "disable", "the open panel still says disable, as today (F1)");
    // Closed and opened again, it says enable; the card's focus came back after the page read the snapshot again.
    await panel.getByRole("button", { name: "Close", exact: true }).click();
    await panel.waitFor({ state: "hidden" });
    assert.equal((await focused(sh)).card, true);
    await skillCard(sh, COPIED_SKILL).click();
    await row.getByRole("button", { name: "enable", exact: true }).waitFor();
    assert.equal(await row.getByRole("button").getAttribute("aria-pressed"), "false");
    await row.getByRole("button", { name: "enable", exact: true }).click();
    await row.getByRole("button", { name: "working...", exact: true }).waitFor();
    await row.locator("button:not([disabled])").waitFor({ timeout: 150_000 });
    assert.ok(existsSync(join(copiedInstall(), "SKILL.md")) && !existsSync(join(copiedInstall(), "SKILL.md.disabled")), "enabled on disk");
    assert.equal(await row.getByRole("button").textContent(), "enable", "F1 again");
    await closeSkill(sh);
    await openSkill(sh, COPIED_SKILL);
    await installRow(sh, "repo-claude").getByRole("button", { name: "disable", exact: true }).waitFor();
    assert.equal(await sh.locator(".drawer .ierr").isVisible(), false);
    await closeSkill(sh);
  });

  test("Skills: disable then enable one project's install of a skill two projects have; the other project's install never changes", SLOW, async () => {
    const at = (project: string) => join(workspace, "projects-folder", project, ".claude", "skills", PROJECTS_SKILL);
    const [mine, other] = [TEMPLATE_PROJECT, IDEA_PROJECT];
    const installs = snapshot().store.collections.find((c) => c.name === PROJECTS_COLLECTION)!.skills.find((s) => s.name === PROJECTS_SKILL)!.installs!;
    assert.deepEqual(
      installs.map((i) => [i.target, i.path, i.form, i.disabled]).sort(),
      [
        [`project-claude:${other}`, at(other), "copy", false],
        [`project-claude:${mine}`, at(mine), "copy", false],
      ].sort(),
    );
    for (const project of [mine, other]) assert.ok(at(project).startsWith(join(workspace, "projects-folder") + sep), `inside the copy: ${at(project)}`);
    const theirs = readFileSync(join(at(other), "SKILL.md"), "utf8");
    const untouched = () => {
      assert.equal(readFileSync(join(at(other), "SKILL.md"), "utf8"), theirs, `${other}'s install is as it was`);
      assert.ok(!existsSync(join(at(other), "SKILL.md.disabled")), `${other}'s install has no SKILL.md.disabled`);
    };
    const { sh } = await openSkills();
    await openSkill(sh, PROJECTS_SKILL);
    const row = installRow(sh, `project-claude:${mine}`);
    await row.getByRole("button", { name: "disable", exact: true }).click();
    await row.locator("button:not([disabled])").waitFor({ timeout: 150_000 });
    assert.equal(await sh.locator(".drawer .ierr").isVisible(), false, (await sh.locator(".drawer .ierr").textContent()) ?? "");
    assert.ok(existsSync(join(at(mine), "SKILL.md.disabled")) && !existsSync(join(at(mine), "SKILL.md")), `${mine}'s install is disabled on disk`);
    untouched();
    await closeSkill(sh);
    await openSkill(sh, PROJECTS_SKILL);
    await installRow(sh, `project-claude:${mine}`).getByRole("button", { name: "enable", exact: true }).click();
    await installRow(sh, `project-claude:${mine}`).locator("button:not([disabled])").waitFor({ timeout: 150_000 });
    assert.equal(await sh.locator(".drawer .ierr").isVisible(), false, (await sh.locator(".drawer .ierr").textContent()) ?? "");
    assert.ok(existsSync(join(at(mine), "SKILL.md")) && !existsSync(join(at(mine), "SKILL.md.disabled")), `${mine}'s install is enabled again`);
    untouched();
    await closeSkill(sh);
  });

  test("Skills: an orphan's toggle is refused with today's words, and nothing changes on disk (F2)", SLOW, async () => {
    const orphan = snapshot().store.orphans.find((o) => o.name === ORPHAN_SKILL)!;
    const target = `project-claude:${TEMPLATE_PROJECT}`;
    const file = join(workspace, "projects-folder", TEMPLATE_PROJECT, ".claude", "skills", ORPHAN_SKILL, "SKILL.md");
    assert.deepEqual(orphan.installs!.map((i) => [i.target, i.path]), [[target, dirname(file)]]);
    const before = readFileSync(file, "utf8");
    const { sh } = await openSkills();
    await sh.getByRole("group", { name: "Filter by collection" }).getByRole("button", { name: "no hub source", exact: true }).click();
    await skillCard(sh, ORPHAN_SKILL).click();
    const panel = detailsPanel(sh);
    await panel.getByRole("heading", { name: ORPHAN_SKILL, exact: true }).waitFor();
    assert.equal(await panel.locator(".d-src").textContent(), "Research-skills-hub / no hub source");
    assert.equal(await panel.getByRole("button", { name: "Copy status command" }).count(), 1);
    await installRow(sh, target).getByRole("button", { name: "disable", exact: true }).click();
    await sh.locator(".drawer .ierr").filter({ hasText: "bad collection name: no hub source" }).waitFor({ timeout: 30_000 });
    await installRow(sh, target).getByRole("button", { name: "disable", exact: true }).waitFor();
    assert.equal(readFileSync(file, "utf8"), before);
    assert.ok(!existsSync(join(dirname(file), "SKILL.md.disabled")));
    await closeSkill(sh);
    await sh.getByRole("group", { name: "Filter by collection" }).getByRole("button", { name: /^All · / }).click();
  });

  test("Skills: a name a command cannot carry safely gets no command and no copy button but one line, and the clipboard is never written", SLOW, async () => {
    const orphan = snapshot().store.orphans.find((o) => o.name === HOSTILE_ORPHAN)!;
    assert.deepEqual(orphan.installs!.map((i) => i.target), [`project-claude:${TEMPLATE_PROJECT}`]);
    const saved = await app.evaluate(({ clipboard }) => clipboard.readText());
    try {
      await app.evaluate(({ clipboard }) => clipboard.writeText("before"));
      const { sh } = await openSkills();
      await sh.getByRole("group", { name: "Filter by collection" }).getByRole("button", { name: "no hub source", exact: true }).click();
      await skillCard(sh, HOSTILE_ORPHAN).click();
      const panel = detailsPanel(sh);
      await panel.getByRole("heading", { name: HOSTILE_ORPHAN, exact: true }).waitFor();
      // In the panel and under the installs, the line; no command on screen and no copy button.
      assert.deepEqual([await sh.locator(".drawer > .nocmd").textContent(), await sh.locator(".drawer .inst .nocmd").textContent()], [NO_COMMAND, NO_COMMAND]);
      assert.equal(await panel.getByText(NO_COMMAND, { exact: true }).count(), 2);
      for (const line of await panel.getByText(NO_COMMAND, { exact: true }).all()) assert.equal(await line.isVisible(), true);
      assert.equal(await panel.locator(".cmd").isVisible(), false);
      assert.equal(await panel.locator(".copy-btn").isVisible(), false);
      assert.ok(!(await panel.innerText()).includes("install_research_skill.py"), "no command anywhere in the panel");
      // The one button left in the installs is the toggle where it is installed (F2's, which the handler refuses).
      assert.deepEqual(await panel.locator(".irow button").allTextContents(), ["disable"]);
      // Even the hidden copy button, clicked from code, writes nothing.
      await sh.evaluate(() => (document.querySelector(".copy-btn") as HTMLButtonElement).click());
      await page.waitForTimeout(500);
      assert.equal(await app.evaluate(({ clipboard }) => clipboard.readText()), "before");
      await closeSkill(sh);
      // A safe name's panel still has its command and copy button, and no line.
      const safe = await openSkill(sh, ORPHAN_SKILL);
      assert.equal(await safe.locator(".cmd").textContent(), `python research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py status ${ORPHAN_SKILL}`);
      assert.equal(await safe.getByRole("button", { name: "Copy status command" }).isVisible(), true);
      assert.equal(await sh.locator(".drawer > .nocmd").isVisible(), false);
      // Nor under its installs: each row where it is not installed offers "install ⧉", the trunk's command, which carries
      // the page's own label, "no hub source" (not a name, so not tested). Every target's name here is one a command can carry.
      const { targets } = snapshot().store;
      assert.ok(targets.every((t) => /^[A-Za-z0-9._:-]+$/.test(t.name)), JSON.stringify(targets.map((t) => t.name)));
      assert.equal(await sh.locator(".drawer .nocmd:visible").count(), 0);
      const shown = ["repo", "global", "project"].flatMap((scope) => targets.filter((t) => t.scope === scope));
      assert.deepEqual(await safe.locator(".irow button").allTextContents(), shown.map((t) => (t.name === `project-claude:${TEMPLATE_PROJECT}` ? "disable" : "install ⧉")));
      assert.equal(await installRow(sh, "repo-codex").getByRole("button").textContent(), "install ⧉");
      await closeSkill(sh);
      await sh.getByRole("group", { name: "Filter by collection" }).getByRole("button", { name: /^All · / }).click();
    } finally {
      await app.evaluate(({ clipboard }, text) => clipboard.writeText(text), saved);
    }
  });

  test("Skills: a bidi control in a description is drawn as a marker on the card and in the panel", SLOW, async () => {
    const skill = snapshot().store.collections.find((c) => c.name === PROJECTS_COLLECTION)!.skills.find((s) => s.name === BIDI_SKILL) as { description?: string } | undefined;
    assert.equal(skill?.description, BIDI_TEXT, "the snapshot has the text as written");
    const { sh } = await openSkills();
    const shown = "Looks like ⟨U+202E⟩evil.exe⟨U+202C⟩ text.";
    await sh.getByRole("searchbox", { name: "Search skills" }).fill(BIDI_SKILL);
    assert.equal(await skillCard(sh, BIDI_SKILL).locator(".desc").textContent(), shown);
    await skillCard(sh, BIDI_SKILL).click();
    const panel = detailsPanel(sh);
    await panel.getByRole("heading", { name: BIDI_SKILL, exact: true }).waitFor();
    assert.equal(await panel.locator(".d-desc").textContent(), shown);
    assert.equal(await sh.evaluate(() => /[\u202A-\u202E\u2066-\u2069]/.test(document.body.textContent ?? "")), false, "no bidi control in the page's text");
    await closeSkill(sh);
    // The search reads the description as written, control and all.
    await sh.getByRole("searchbox", { name: "Search skills" }).fill("\u202Eevil");
    assert.deepEqual(await sh.locator(".cards .skill .nm").allTextContents(), [BIDI_SKILL]);
    await sh.getByRole("searchbox", { name: "Search skills" }).fill("");
  });

  test("Skills: markup in a skill's description is text on the card and in the panel, and runs nothing", SLOW, async () => {
    const { sh } = await openSkills();
    await sh.getByRole("searchbox", { name: "Search skills" }).fill(MARKUP_SKILL);
    assert.equal(await skillCard(sh, MARKUP_SKILL).locator(".desc").textContent(), MARKUP_TEXT);
    await skillCard(sh, MARKUP_SKILL).click();
    const panel = detailsPanel(sh);
    await panel.getByRole("heading", { name: MARKUP_SKILL, exact: true }).waitFor();
    assert.equal(await panel.locator(".d-desc").textContent(), MARKUP_TEXT);
    assert.equal(await sh.locator("img, script:not([src])").count(), 0);
    assert.deepEqual([await page.evaluate(() => (window as { __pwned?: unknown }).__pwned), await sh.evaluate(() => (window as { __pwned?: unknown }).__pwned)], [undefined, undefined]);
    await closeSkill(sh);
  });

  test("Skills: the copy buttons put the command on the clipboard from inside the frame", SLOW, async () => {
    const saved = await app.evaluate(({ clipboard }) => clipboard.readText());
    try {
      const { sh } = await openSkills();
      const panel = await openSkill(sh, COPIED_SKILL);
      await app.evaluate(({ clipboard }) => clipboard.writeText("before"));
      await panel.getByRole("button", { name: "Copy install command" }).click();
      await panel.getByRole("button", { name: "Copied ✓" }).waitFor();
      assert.equal(await app.evaluate(({ clipboard }) => clipboard.readText()), `python research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py install ${COPIED_SKILL} --collection ${SKILLS_COLLECTION}`);
      // After 1.6 s the button says its own word again.
      await panel.getByRole("button", { name: "Copy install command" }).waitFor();
      // Where nothing is installed, "install ⧉" copies the command for that target.
      const row = installRow(sh, "repo-codex");
      await row.getByRole("button", { name: "install ⧉" }).click();
      await row.getByRole("button", { name: "copied ✓" }).waitFor();
      assert.equal(await row.getByRole("button").getAttribute("title"), "Copy the install command for this target");
      assert.equal(
        await app.evaluate(({ clipboard }) => clipboard.readText()),
        `python research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py install ${COPIED_SKILL} --collection ${SKILLS_COLLECTION} --target repo-codex`,
      );
      await closeSkill(sh);
      // An orphan's row copies the trunk's command, the page's label "no hub source" and all (ported as it is: the installer's parser refuses it).
      await openSkill(sh, ORPHAN_SKILL);
      const orphanRow = installRow(sh, "repo-codex");
      await orphanRow.getByRole("button", { name: "install ⧉" }).click({ timeout: 10_000 });
      await orphanRow.getByRole("button", { name: "copied ✓" }).waitFor();
      assert.equal(
        await app.evaluate(({ clipboard }) => clipboard.readText()),
        `python research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py install ${ORPHAN_SKILL} --collection no hub source --target repo-codex`,
      );
      await closeSkill(sh);
    } finally {
      await app.evaluate(({ clipboard }, text) => clipboard.writeText(text), saved);
    }
  });

  test("Skills: a failed read after a good one keeps the list, and the 5 s read pauses while the window is hidden", SLOW, async () => {
    const { sh } = await openSkills();
    const cards = sh.locator(".cards .skill");
    const shown = await cards.count();
    assert.ok(shown > 0);
    // The page's reads of the snapshot, counted, and answered badly on demand, in the frame only: the file is not touched.
    await sh.evaluate(() => {
      const w = window as unknown as { __reads: number; __answer: "as is" | "404" | "not json"; __fetch: typeof fetch };
      w.__reads = 0;
      w.__answer = "as is";
      w.__fetch = window.fetch;
      window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
        if (!String(input).includes("_os/files")) return w.__fetch(input, init);
        w.__reads++;
        if (w.__answer === "404") return Promise.resolve(new Response("", { status: 404 }));
        if (w.__answer === "not json") return Promise.resolve(new Response("not json", { status: 200 }));
        return w.__fetch(input, init);
      }) as typeof fetch;
    });
    const reads = () => sh.evaluate(() => (window as unknown as { __reads: number }).__reads);
    const nextRead = async () => {
      const before = await reads();
      for (let i = 0; i < 80 && (await reads()) === before; i++) await page.waitForTimeout(100);
      assert.ok((await reads()) > before, "the page read the snapshot again within 8 s");
      await page.waitForTimeout(300);
    };
    try {
      for (const answer of ["404", "not json"] as const) {
        await sh.evaluate((a) => ((window as unknown as { __answer: string }).__answer = a), answer);
        await nextRead();
        assert.equal(await cards.count(), shown, `after a read answered ${answer}, the list stays (src/useOsState.ts)`);
        assert.equal(await sh.locator(".status").count(), 0, `no first-load line after ${answer}`);
      }
      await sh.evaluate(() => ((window as unknown as { __answer: string }).__answer = "as is"));
      await nextRead();
      // The window hidden, as the frame sees it: no read for two of the page's 5 s rounds; shown again, they resume.
      await sh.evaluate(() => Object.defineProperty(document, "hidden", { configurable: true, get: () => true }));
      const hiddenFrom = await reads();
      await page.waitForTimeout(11_000);
      assert.equal(await reads(), hiddenFrom, "no read while the window is hidden");
      await sh.evaluate(() => delete (document as unknown as { hidden?: boolean }).hidden);
      assert.equal(await sh.evaluate(() => document.hidden), false);
      await nextRead();
      assert.equal(await cards.count(), shown);
    } finally {
      await sh.evaluate(() => {
        const w = window as unknown as { __fetch: typeof fetch };
        window.fetch = w.__fetch;
        delete (document as unknown as { hidden?: boolean }).hidden;
      });
    }
  });

  test("Skills at 1440 × 900 and 1000 × 720: the panel is 420 px inside the frame, open or with the menu collapsed", SLOW, async () => {
    const size = await windowSize({ width: 1440, height: 900 });
    try {
      for (const [w, h] of [[1440, 900], [1000, 720]] as const) {
        await windowSize({ width: w, height: h });
        const { section, sh } = await openSkills();
        await page.waitForTimeout(300);
        await shot(page, `skills-${w}-top-c`);
        // Opened from the whole list, whose box scrolls: the panel and its shading cover that box's scrollbar too.
        const scroller = sh.locator(".scroller");
        assert.ok(await scroller.evaluate((b) => b.scrollHeight > b.clientHeight), `${w}: the list scrolls`);
        await scroller.evaluate((b) => b.scrollBy(0, 400));
        await sh.locator(".cards .skill").nth(8).click();
        await detailsPanel(sh).waitFor();
        await sh.locator(".drawer").evaluate((d) => Promise.all(d.getAnimations().map((a) => a.finished)).then(() => true));
        const whole = (await section.boundingBox())!;
        const open = (await sh.locator(".drawer").boundingBox())!;
        assert.deepEqual(await sh.locator(".scrim").boundingBox(), whole, `${w}: the shading covers the whole frame`);
        assert.ok(open.width === 420 && Math.abs(open.x + open.width - (whole.x + whole.width)) < 1, `${w}: ${JSON.stringify({ open, whole })}`);
        await shot(page, `skills-${w}-panel-open-scrolled-list`);
        await closeSkill(sh);
        assert.ok(await scroller.evaluate((b) => b.scrollTop > 0), `${w}: the list kept its place`);
        const panel = await openSkill(sh, "filetree-simple");
        await sh.locator(".drawer").evaluate((d) => Promise.all(d.getAnimations().map((a) => a.finished)).then(() => true));
        const area = (await section.boundingBox())!;
        const drawer = (await sh.locator(".drawer").boundingBox())!;
        assert.equal(drawer.width, 420, `${w}: the panel is 420 px`);
        assert.ok(drawer.x >= area.x && Math.abs(drawer.x + drawer.width - (area.x + area.width)) < 1, `${w}: inside the frame`);
        await shot(page, `skills-${w}-panel-open`);
        await page.getByRole("button", { name: "Collapse sidebar" }).click();
        await page.waitForTimeout(400);
        assert.equal(await panel.isVisible(), true);
        assert.equal((await sh.locator(".drawer").boundingBox())!.width, 420);
        await shot(page, `skills-${w}-panel-open-menu-collapsed`);
        await page.getByRole("button", { name: "Expand sidebar" }).click();
        await closeSkill(sh);
        await nav(page, "Plugins").click();
        await screen(page, "plugins").getByRole("heading", { name: "Plugins", exact: true }).waitFor();
        await shot(page, `skills-${w}-plugins-page`);
      }
    } finally {
      await windowSize(size);
    }
  });

  test("the Plugins page lists Skills Hub as enabled, with its page, and nothing as not yet available", SLOW, async () => {
    await nav(page, "Plugins").click();
    const plugins = screen(page, "plugins");
    await plugins.getByRole("heading", { name: "Bundled · enabled" }).waitFor();
    const card = plugins.locator("article").filter({ has: page.getByRole("heading", { name: /^Skills Hub/ }) });
    assert.equal(await card.count(), 1);
    assert.equal(await card.locator(".pill").textContent(), "Enabled");
    assert.deepEqual(await card.locator(".rounded-full").allTextContents(), ["Page · Skills"]);
    assert.ok((await card.textContent())!.includes("The research skills hub and where each skill is installed; disable or enable one install."));
    assert.equal(await plugins.getByRole("heading", { name: "Bundled · not yet available" }).count(), 0);
    assert.equal(await plugins.getByText("The enabled list is read from the plugins themselves.", { exact: true }).count(), 1);
  });

  test("Skills Hub's frame is sealed off: no bridge, the snapshot only, its own toggle only; another plugin's frame cannot reach it", SLOW, async () => {
    const { sh } = await openSkills();
    const status = (url: string, init?: RequestInit) => sh.evaluate(async ([u, i]) => (await fetch(u, i)).status, [url, init] as const);
    const rel = (p: string) => `./_os/files?path=${encodeURIComponent(p)}`;
    assert.deepEqual(
      {
        snapshot: await status(rel("os-ui/frontend/public/state.json")),
        agents: await status(rel("AGENTS.md")),
        index: await status(rel("os-ui/frontend/index.html")),
        listing: await status(`./_os/list?path=${encodeURIComponent("os-ui/frontend/public")}`),
        plain: await status("/api/skills-hub/toggle", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}" }),
        get: await status("/api/skills-hub/toggle"),
        trunkToggle: await status("/api/skill/toggle", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
        chat: await status("/api/chat/sessions"),
        wikiStatus: await status("/api/paper-wiki/status"),
        codeViewGit: await status(`/api/code-view/git/log?project=${PROJECT}`),
      },
      { snapshot: 200, agents: 404, index: 404, listing: 404, plain: 415, get: 405, trunkToggle: 404, chat: 404, wikiStatus: 404, codeViewGit: 404 },
    );
    const probe = await sh.evaluate(async () => {
      const outcome = async (fn: () => Promise<unknown>) => {
        try {
          return String(await fn());
        } catch (error) {
          return `blocked: ${(error as Error).name}`;
        }
      };
      return {
        own: typeof (window as { osDesktop?: unknown }).osDesktop,
        parent: await outcome(async () => typeof (window.parent as Window & { osDesktop?: unknown }).osDesktop),
        appApi: await outcome(async () => (await fetch("app://research-os/api/chat/sessions?cwd=")).status),
      };
    });
    assert.equal(probe.own, "undefined");
    assert.match(probe.parent, /^blocked: SecurityError/);
    assert.match(probe.appApi, /^blocked/);
    // No inline script runs in the page (PLUGIN_CSP has no 'unsafe-inline').
    const inline = await sh.evaluate((text) => {
      const script = document.createElement("script");
      script.textContent = text;
      document.body.append(script);
      script.remove();
      return (window as { __inline?: unknown }).__inline;
    }, INLINE_PROBE);
    assert.equal(inline, undefined, "an inline script ran in Skills Hub's page");
    await sh.evaluate(() => {
      const img = new Image();
      img.src = "https://csp-canary.invalid/skills.png";
      document.body.append(img);
      img.remove();
    });
    const canary = (lines: string[]) => lines.some((l) => /^frame app:\/\/skills-hub\/.*csp-canary\.invalid.*Content Security Policy/.test(l));
    for (let i = 0; i < 50 && !canary(await consoleLog()); i++) await page.waitForTimeout(100);
    assert.ok(canary(await consoleLog()), "a CSP violation inside Skills Hub's frame is seen");
    // Another origin's POST to the toggle never reaches the handler. The request it sends is a real one: from
    // Skills Hub's own frame, the same body disables the copy's install (inside the copy), and it is enabled again.
    // That answer's time bounds how long the handler would take, so the wait below cannot end before it would act.
    const skillFile = join(copiedInstall(), "SKILL.md");
    assert.ok(skillFile.startsWith(join(workspace, ".claude", "skills") + sep), "inside the copy");
    const body = JSON.stringify({ skill: COPIED_SKILL, collection: SKILLS_COLLECTION, target: "repo-claude", enable: false });
    const own = async (enable: boolean) =>
      sh.evaluate(
        async ([b, on]) => {
          const t0 = performance.now();
          const res = await fetch("/api/skills-hub/toggle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...JSON.parse(b), enable: on }) });
          return { status: res.status, ms: performance.now() - t0 };
        },
        [body, enable] as const,
      );
    const off = await own(false);
    assert.equal(off.status, 200);
    assert.ok(existsSync(join(copiedInstall(), "SKILL.md.disabled")) && !existsSync(skillFile), "the same body, sent by Skills Hub's page, disables the install");
    const on = await own(true);
    assert.equal(on.status, 200);
    assert.ok(existsSync(skillFile) && !existsSync(join(copiedInstall(), "SKILL.md.disabled")), "and enables it again");
    const disk = readFileSync(skillFile, "utf8");
    await nav(page, "Paper wiki").click();
    const wiki = await wikiFrame(page);
    const sent = await wiki.evaluate(async (b) => {
      const U = "app://skills-hub/api/skills-hub/toggle";
      const outcome = async (send: () => Promise<Response>) => {
        try {
          const res = await send();
          return `answered ${res.type} ${res.status}`;
        } catch (error) {
          return `blocked: ${(error as Error).name}`;
        }
      };
      return {
        // A JSON POST, which a CORS-enabled scheme would preflight; this one is not.
        corsJson: await outcome(() => fetch(U, { method: "POST", headers: { "Content-Type": "application/json" }, body: b })),
        // A body typed as JSON, without CORS: a no-cors request cannot carry that type (the handler would answer 415).
        noCorsJsonBlob: await outcome(() => fetch(U, { method: "POST", mode: "no-cors", body: new Blob([b], { type: "application/json" }) })),
        noCorsPlain: await outcome(() => fetch(U, { method: "POST", mode: "no-cors", body: b })),
      };
    }, body);
    await page.waitForTimeout(Math.max(3000, 3 * Math.max(off.ms, on.ms)));
    assert.ok(existsSync(skillFile) && !existsSync(join(copiedInstall(), "SKILL.md.disabled")), `another origin's POST reached the toggle: ${JSON.stringify(sent)}`);
    assert.equal(readFileSync(skillFile, "utf8"), disk);
    // Each was stopped in the frame: Paper wiki's page may connect to its own origin only (connect-src 'self').
    assert.match(sent.corsJson, /^blocked: TypeError/);
    assert.match(sent.noCorsJsonBlob, /^blocked: TypeError/);
    assert.match(sent.noCorsPlain, /^blocked: TypeError/);
  });

  test("another plugin's frame cannot become Skills Hub's page: Paper wiki's frame sent to app://skills-hub/ stays Paper wiki's, and nothing changes on disk", SLOW, async () => {
    const skillFile = join(copiedInstall(), "SKILL.md");
    const disk = readFileSync(skillFile, "utf8");
    await nav(page, "Paper wiki").click();
    await wikiFrame(page);
    const wikiArea = page.locator('[data-screen="paper-wiki/viewer"] iframe');
    const inWikiArea = async () => (await (await wikiArea.elementHandle())!.contentFrame())!.url();
    const before = await inWikiArea();
    assert.match(before, /^app:\/\/paper-wiki\//);
    const skillsFrames = () => page.frames().filter((f) => f.url().startsWith("app://skills-hub/")).length;
    const frames = skillsFrames();
    // Each frame navigation the main process is asked for, so the check below runs after the attempt reached it.
    await app.evaluate(({ BrowserWindow }) => {
      const seen: string[] = [];
      const listener = (event: Electron.Event<Electron.WebContentsWillFrameNavigateEventParams>) => seen.push(event.url);
      Object.assign(globalThis, { __navigations: seen, __navigationListener: listener });
      BrowserWindow.getAllWindows()[0]!.webContents.on("will-frame-navigate", listener);
    });
    try {
      // The reviewer's script, run in the frame by evaluation from the suite.
      await (await wikiFrame(page)).evaluate(() => {
        location.href = "app://skills-hub/index.html";
      });
      const asked = () => app.evaluate(() => (globalThis as unknown as { __navigations: string[] }).__navigations.includes("app://skills-hub/index.html"));
      for (let i = 0; i < 100 && !(await asked()); i++) await page.waitForTimeout(100);
      assert.ok(await asked(), "the navigation reached the main process");
      await page.waitForTimeout(1500);
      assert.equal(await inWikiArea(), before, "Paper wiki's area still shows Paper wiki");
      assert.equal(skillsFrames(), frames, "no second Skills Hub page");
      assert.equal(await page.locator('[data-screen="paper-wiki/viewer"]').locator("iframe").count(), 1);
    } finally {
      await app.evaluate(({ BrowserWindow }) => {
        const { __navigationListener: listener } = globalThis as unknown as { __navigationListener: (...args: unknown[]) => void };
        BrowserWindow.getAllWindows()[0]!.webContents.removeListener("will-frame-navigate", listener);
      });
    }
    assert.equal(readFileSync(skillFile, "utf8"), disk);
    assert.ok(!existsSync(join(copiedInstall(), "SKILL.md.disabled")));
  });

  test("a layout saved on the trunk's old Skills page reopens on Skills Hub's page", SLOW, async () => {
    await page.evaluate(() => {
      localStorage.setItem("osui.layout.v1", JSON.stringify({ screen: "skills" }));
      location.reload();
    });
    await page.getByText("Desktop client", { exact: true }).waitFor({ timeout: 60_000 });
    await screen(page, "skills-hub/skills").waitFor();
    assert.equal(await nav(page, "Skills").getAttribute("aria-current"), "page");
    const sh = await pluginFrame(page, "app://skills-hub/");
    await sh.locator(".cards .skill").first().waitFor({ timeout: 30_000 });
    assert.equal(await sh.getByRole("heading", { level: 1 }).textContent(), "Skills");
  });

  test("the app's endpoints refuse forms, a missing token, and traversal", async () => {
    const results = await page.evaluate(async () => {
      const status = async (url: string, init?: RequestInit) => (await fetch(url, init)).status;
      return {
        form: await status("/api/chat/send", { method: "POST", body: new URLSearchParams({ text: "x" }) }),
        // Before the token: a write that is not JSON is 415 on a token mount too (protocol.ts serveApi).
        plain: await status("/api/paper-sources", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}" }),
        // The trunk's skill toggle went with step 2.5: Skills Hub's own origin alone reaches its toggle.
        skillToggle: await status("/api/skill/toggle", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
        noToken: await status("/api/chat/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"text":"x"}' }),
        withToken: await status("/api/chat/sessions?cwd=", { headers: { "X-OS-UI-Token": window.osDesktop!.token } }),
        state: await status("/state.json"),
        // package.json really is two steps up from the renderer, in the dev build and in the asar.
        traversal: await status("/..%2f..%2fpackage.json"),
        wikiHere: await status("/paper-wiki/viz.html"),
      };
    });
    assert.deepEqual(results, { form: 415, plain: 415, skillToggle: 404, noToken: 401, withToken: 200, state: 200, traversal: 404, wikiHere: 404 });
    const body = await page.evaluate(async () => (await fetch("/..%2f..%2fpackage.json")).text());
    assert.ok(!body.includes("research-os-desktop"), "a file outside the renderer must not be served");
  });

  test("the Paper Wiki runs on its own origin, sealed off from the app", SLOW, async () => {
    const sessionFiles = readdirSync(sessions).length;
    await nav(page, "Paper wiki").click();
    const frame = await wikiFrame(page);
    assert.equal(frame.url(), "app://paper-wiki/viz.html");
    const probe = await frame.evaluate(async () => {
      const outcome = async (fn: () => Promise<unknown>) => {
        try {
          return String(await fn());
        } catch (error) {
          return `blocked: ${(error as Error).name}`;
        }
      };
      return {
        bridge: await outcome(async () => typeof (window.parent as Window & { osDesktop?: unknown }).osDesktop),
        appApi: await outcome(async () => (await fetch("app://research-os/api/chat/sessions?cwd=")).status),
        appApiPost: await outcome(
          async () =>
            (await fetch("app://research-os/api/chat/send", { method: "POST", mode: "no-cors", body: '{"text":"from the wiki"}' })).status,
        ),
        ownChat: await outcome(async () => (await fetch("/api/chat/sessions")).status),
        web: await outcome(async () => (await fetch("https://example.com/")).status),
        status: await outcome(async () => JSON.stringify(await (await fetch("/api/paper-wiki/status")).json())),
      };
    });
    assert.match(probe.bridge, /^blocked: SecurityError/);
    assert.match(probe.appApi, /^blocked/);
    assert.match(probe.appApiPost, /^blocked/);
    assert.equal(probe.ownChat, "404");
    assert.match(probe.web, /^blocked/);
    assert.equal(probe.status, '{"writable":true,"values":["unread","skimmed","read"]}');
    assert.equal(readdirSync(sessions).length, sessionFiles, "nothing from the wiki reached the agent endpoint");
  });

  test("the reading status is saved from the viewer's own buttons", SLOW, async () => {
    const frame = await wikiFrame(page);
    await frame.evaluate(() => {
      location.hash = "#timeline";
    });
    const row = frame.locator('#timeline-list .tl-row[data-id^="papers/"]').first();
    const id = (await row.getAttribute("data-id"))!;
    await row.click();
    const choices = frame.locator("#detail-status .status-choices button");
    await choices.first().waitFor({ timeout: 30_000 });
    assert.equal(await choices.count(), 3, "unread, skimmed, read");
    const current = /^status: (\w+)$/m.exec(readFileSync(join(workspace, "paper-wiki", `${id}.md`), "utf8"))?.[1];
    // "read" is a substring of "unread", so alternate between the two unambiguous labels.
    const target = current === "skimmed" ? "unread" : "skimmed";
    await choices.filter({ hasText: target }).click();
    // On success the row re-renders with the new value pressed; a failure says "Not saved".
    await frame.locator("#detail-status .status-choices button.active").filter({ hasText: target }).waitFor({ timeout: 90_000 });
    assert.match(readFileSync(join(workspace, "paper-wiki", `${id}.md`), "utf8"), new RegExp(`^status: ${target}$`, "m"));
  });

  test("the sidebar regenerates the snapshot", SLOW, async () => {
    // The control sits in the sidebar footer, so the Paper Wiki stays on screen.
    await page.getByRole("button", { name: "Regenerate the data snapshot" }).click();
    await page.getByText("Snapshot updated").first().waitFor({ timeout: 150_000 });
  });

  test("settings remember the folder", () => {
    const settings = JSON.parse(readFileSync(join(userData, "settings.json"), "utf8")) as { workspace: string; recentWorkspaces: string[] };
    assert.equal(settings.workspace, workspace);
    assert.equal(settings.recentWorkspaces[0], workspace);
  });

  test("no Content-Security-Policy violations in the app or its plugins' frames", async () => {
    const violations = [...logs, ...(await consoleLog())].filter(unexpectedCspReport);
    assert.deepEqual(violations, []);
  });

  // Last on purpose: Playwright waits forever on a main-frame navigation the
  // app cancelled, and the refused frame navigation logs a CSP message.
  test("navigation never leaves the app; new windows are refused", async () => {
    // Targets Chromium itself allows, so only the app's guard (and the frame-src
    // policy) can stop them: neither the Paper view's frame nor the wiki frame
    // may become the app origin, nor the top frame the wiki origin.
    const { paper } = await openPaper();
    await paper.evaluate(() => {
      location.href = "app://research-os/";
    });
    await page.waitForTimeout(800);
    assert.ok(!paper.url().startsWith("app://research-os"), paper.url());
    await nav(page, "Paper wiki").click();
    const frame = await wikiFrame(page);
    await frame.evaluate(() => {
      location.href = "app://research-os/";
    });
    await page.waitForTimeout(800);
    // Blocked either by the guard (the frame stays) or by frame-src (an error page).
    assert.ok(!frame.url().startsWith("app://research-os"), frame.url());
    await page.evaluate(() => {
      window.open("app://research-os/");
      location.href = "app://paper-wiki/viz.html";
    });
    await page.waitForTimeout(800);
    assert.equal(page.url(), "app://research-os/");
    assert.equal(app.windows().length, 1);
    assert.equal(await page.evaluate(() => location.href), "app://research-os/");
  });
});

describe("desktop client without a usable folder", () => {
  test("names the problem and offers the folder picker", SLOW, async () => {
    const notWorkspace = tempDir("os-client-empty-");
    const { app, page } = await launch({ OS_CLIENT_WORKSPACE: notWorkspace, OS_CLIENT_USER_DATA: tempDir("os-client-data-") });
    try {
      const welcome = page.getByTestId("desktop-welcome");
      await welcome.waitFor({ timeout: 60_000 });
      await welcome.getByText("is not a Research OS folder").first().waitFor();
      await welcome.getByRole("button", { name: "Choose folder…" }).waitFor();
      await page.locator('[data-check="workspace"][data-state="missing"]').waitFor({ timeout: 60_000 });
    } finally {
      await app.close();
      rmSync(notWorkspace, { recursive: true, force: true });
    }
  });
});
