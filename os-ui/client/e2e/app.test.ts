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
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, truncateSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "playwright-core";
import type { ElectronApplication, Frame, Locator, Page } from "playwright-core";
import { HOSTILE_TITLE, HOSTILE_URI, hostilePdf, noPagesPdf, notAPdf, passwordPdf } from "./pdfFixtures.ts";

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
    const zh = readFileSync(join(workspace, "projects-folder", PROJECT, "Code", "README_zh.md"), "utf8").split("\n").find((l) => /[一-鿿]/.test(l))!;
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
    const line = readFileSync(join(workspace, "projects-folder", PROJECT, "Code", "README.md"), "utf8").split("\n")[2]!;
    await code.locator('.row[data-line="3"]').click();
    await bar.getByText("Code/README.md:3", { exact: true }).waitFor();
    await bar.getByRole("button", { name: "Ask the agent about this" }).click();
    await chips.filter({ hasText: "Code/README.md:3" }).waitFor();
    assert.equal(await chips.first().getAttribute("title"), `About Code/README.md:3\n> ${line}`);
    assert.equal(await bar.count(), 0, "asking clears the selection");
    // The cursor moves to the composer on the next frame.
    await page.waitForFunction((label) => document.activeElement?.getAttribute("aria-label") === label, `Message ${PROJECT} agent`, { timeout: 5000 });

    await code.getByRole("button", { name: "Changes", exact: true }).click();
    const commit = code.locator(".commit.on");
    await commit.click(); // the open commit: selects it
    const short = (await commit.locator(".h").textContent())!;
    await bar.getByText(short, { exact: true }).waitFor();
    await bar.getByRole("button", { name: "Ask the agent about this" }).click();
    await chips.filter({ hasText: short }).waitFor();

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

    await bar.getByRole("button", { name: "Ask the agent about this" }).click();
    await chips.filter({ hasText: "paper/main.pdf p. 1 · Setup" }).waitFor();
    assert.equal(await bar.count(), 0, "asking clears the selection");
    assert.equal(await paper.evaluate(() => window.getSelection()?.isCollapsed), true, "and the page's own");
    await chat.getByRole("button", { name: "Show what will be sent for paper/main.pdf p. 1 · Setup" }).click();
    const preview = chat.locator("[data-reference-preview]");
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
    await label.filter({ hasText: /^paper\/main\.pdf pp\. 1–4$/ }).waitFor();
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
