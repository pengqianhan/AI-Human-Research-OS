/**
 * End-to-end: the real Electron app, driven by Playwright, on a temporary copy
 * of this repository (without .git, so the OS's no-Git mode is exercised too).
 * Agent turns use os-harness's fake Claude CLI, so no login or quota is needed.
 *
 *   npm run build && npm run test:e2e          (Linux: under xvfb-run)
 *   OS_CLIENT_E2E_EXECUTABLE=release npm run test:e2e   (the unpacked app electron-builder left in release/)
 *   OS_CLIENT_E2E_EXECUTABLE=<path to an app binary> npm run test:e2e
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, truncateSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "playwright-core";
import type { ElectronApplication, Frame, Locator, Page } from "playwright-core";
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

function copyWorkspace(): string {
  const dest = tempDir("os-client-ws-");
  cpSync(REPO, dest, {
    recursive: true,
    // Windows: a copied relative link to a folder can come out as a file
    // symlink, which Python cannot stat (WinError 5), so copy what the links
    // point at. Elsewhere keep the links as they are, as a checkout has them.
    ...(process.platform === "win32" ? { dereference: true } : { verbatimSymlinks: true }),
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
function isolatedHome(): Record<string, string> {
  const home = tempDir("os-client-home-");
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
function screen(page: Page, id: "home" | "projects" | "workspace" | "wiki" | "skills" | "plugins" | "settings"): Locator {
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
    // Code is the code-view plugin's page on its own origin (Paper, the paper-view plugin's, has its own tests below); Idea, Skeleton, Assets are step 2.
    await ws.getByRole("tab", { name: "Code" }).click();
    const code = await pluginFrame(page, "app://code-view/");
    assert.equal(code.url(), `app://code-view/index.html?project=${encodeURIComponent(name)}`);
    await code.getByText(`${name}/Code/`, { exact: true }).waitFor();
    assert.equal(await ws.getByRole("tab", { name: "Idea, step 2" }).getAttribute("aria-disabled"), "true");
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
    const before = logs.length;
    const inline = await code.evaluate(() => {
      const script = document.createElement("script");
      script.textContent = "window.__inline = 1";
      document.body.append(script);
      script.remove();
      return (window as { __inline?: unknown }).__inline;
    });
    assert.equal(inline, undefined, "an inline script ran in the Code view's page");
    await page.waitForTimeout(300);
    for (let i = logs.length - 1; i >= before; i--) if (/inline script/.test(logs[i]!)) logs.splice(i, 1);
    await app.evaluate(() => {
      const seen = (globalThis as { __console?: string[] }).__console!;
      for (let i = seen.length - 1; i >= 0; i--) if (/^frame app:\/\/code-view\/.*inline script/.test(seen[i]!)) seen.splice(i, 1);
    });
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
    const before = logs.length;
    const inline = await paper.evaluate(() => {
      const script = document.createElement("script");
      script.textContent = "window.__inline = 1";
      document.body.append(script);
      script.remove();
      return (window as { __inline?: unknown }).__inline;
    });
    assert.equal(inline, undefined, "an inline script ran in the Paper view's page");
    await page.waitForTimeout(300);
    for (let i = logs.length - 1; i >= before; i--) if (/inline script/.test(logs[i]!)) logs.splice(i, 1);
    await app.evaluate(() => {
      const seen = (globalThis as { __console?: string[] }).__console!;
      for (let i = seen.length - 1; i >= 0; i--) if (/^frame app:\/\/paper-view\/.*inline script/.test(seen[i]!)) seen.splice(i, 1);
    });
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
    const before = logs.length;
    const inline = await sk.evaluate(() => {
      const script = document.createElement("script");
      script.textContent = "window.__inline = 1";
      document.body.append(script);
      script.remove();
      return (window as { __inline?: unknown }).__inline;
    });
    assert.equal(inline, undefined, "an inline script ran in the Skeleton view's page");
    await page.waitForTimeout(300);
    for (let i = logs.length - 1; i >= before; i--) if (/inline script/.test(logs[i]!)) logs.splice(i, 1);
    await app.evaluate(() => {
      const seen = (globalThis as { __console?: string[] }).__console!;
      for (let i = seen.length - 1; i >= 0; i--) if (/^frame app:\/\/skeleton-view\/.*inline script/.test(seen[i]!)) seen.splice(i, 1);
    });
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

  test("the app's endpoints refuse forms, a missing token, and traversal", async () => {
    const results = await page.evaluate(async () => {
      const status = async (url: string, init?: RequestInit) => (await fetch(url, init)).status;
      return {
        form: await status("/api/chat/send", { method: "POST", body: new URLSearchParams({ text: "x" }) }),
        plain: await status("/api/skill/toggle", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}" }),
        noToken: await status("/api/chat/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"text":"x"}' }),
        withToken: await status("/api/chat/sessions?cwd=", { headers: { "X-OS-UI-Token": window.osDesktop!.token } }),
        state: await status("/state.json"),
        // package.json really is two steps up from the renderer, in the dev build and in the asar.
        traversal: await status("/..%2f..%2fpackage.json"),
        wikiHere: await status("/paper-wiki/viz.html"),
      };
    });
    assert.deepEqual(results, { form: 415, plain: 415, noToken: 401, withToken: 200, state: 200, traversal: 404, wikiHere: 404 });
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
    const violations = [...logs, ...(await consoleLog())].filter(
      (l) =>
        /Refused to|Content Security Policy/.test(l) &&
        // The isolation probes above, which the policies are meant to refuse.
        !l.includes("example.com") &&
        !l.includes("research-os/api") &&
        !l.includes("paper-wiki/api") &&
        !l.includes("code-view/api") &&
        !l.includes("csp-canary.invalid"),
    );
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
