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
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "playwright-core";
import type { ElectronApplication, Frame, Page } from "playwright-core";

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
  return { app, page, logs };
}

async function wikiFrame(page: Page): Promise<Frame> {
  for (let i = 0; i < 100; i++) {
    const frame = page.frames().find((f) => f.url().startsWith("app://paper-wiki/"));
    if (frame) {
      await frame.waitForLoadState("load");
      return frame;
    }
    await page.waitForTimeout(100);
  }
  throw new Error("the Paper Wiki frame never loaded");
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
      for (const dir of [workspace, userData, sessions]) if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  /** What the app knows about itself, for a failure message: its info() and the tail of its log. */
  async function diagnostics(): Promise<string> {
    const info = await page.evaluate(() => window.osDesktop?.info()).catch((error: Error) => `info() failed: ${error.message}`);
    return `--- osDesktop.info() ---\n${JSON.stringify(info, null, 2)}\n--- app log (tail) ---\n${logs.join("").slice(-6000)}`;
  }

  test("opens the desktop with a freshly generated snapshot", SLOW, async () => {
    try {
      await page.getByText("Desktop client", { exact: true }).waitFor({ timeout: 150_000 });
    } catch (error) {
      throw new Error(`${(error as Error).message}\n${await diagnostics()}`);
    }
    assert.ok(existsSync(join(workspace, "os-ui", "frontend", "public", "state.json")), "the generator wrote state.json in the workspace");
    await page.getByText("PORTFOLIO").first().waitFor();
    const title = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.getTitle());
    assert.equal(title, "Research OS");
    assert.equal(page.url(), "app://research-os/");
  });

  test("the System window shows the folder and a working Python", SLOW, async () => {
    await page.getByRole("button", { name: "System", exact: true }).click();
    await page.getByTestId("workspace").filter({ hasText: workspace }).waitFor();
    await page.locator('[data-check="workspace"][data-state="ok"]').waitFor();
    await page.locator('[data-check="python"][data-state="ok"]').waitFor({ timeout: 150_000 });
  });

  test("a root-agent turn runs through os-harness without a token prompt", SLOW, async () => {
    await page.getByRole("button", { name: "Root Agent", exact: true }).click();
    const composer = page.locator('textarea[placeholder^="Message"]');
    await composer.waitFor();
    assert.equal(await page.locator('input[placeholder="token"]').count(), 0, "the client supplies its own token");
    await composer.fill("hello from e2e");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await page.getByText("echo: hello from e2e", { exact: false }).first().waitFor({ timeout: 90_000 });
    assert.equal(readdirSync(sessions).filter((f) => f.endsWith(".jsonl")).length, 1);
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
    await page.getByRole("button", { name: "Paper Wiki", exact: true }).click();
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

  test("the dock regenerates the snapshot", SLOW, async () => {
    await page.getByRole("button", { name: "Regenerate the data snapshot" }).click();
    await page.getByText("Snapshot updated").first().waitFor({ timeout: 150_000 });
  });

  test("settings remember the folder", () => {
    const settings = JSON.parse(readFileSync(join(userData, "settings.json"), "utf8")) as { workspace: string; recentWorkspaces: string[] };
    assert.equal(settings.workspace, workspace);
    assert.equal(settings.recentWorkspaces[0], workspace);
  });

  test("no Content-Security-Policy violations in the app", () => {
    const violations = logs.filter((l) => /Refused to|Content Security Policy/.test(l) && !l.includes("example.com") && !l.includes("research-os/api"));
    assert.deepEqual(violations, []);
  });

  // Last on purpose: Playwright waits forever on a main-frame navigation the
  // app cancelled, and the refused frame navigation logs a CSP message.
  test("navigation never leaves the app; new windows are refused", async () => {
    // Targets Chromium itself allows, so only the app's guard (and the frame-src
    // policy) can stop them: the wiki frame must not become the app origin,
    // nor the top frame the wiki origin.
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
