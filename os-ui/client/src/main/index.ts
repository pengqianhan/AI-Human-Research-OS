/**
 * Research OS desktop client: the Electron main process. It owns the window,
 * the app:// protocol (renderer files, workspace files, and the shared os-ui
 * endpoints), the snapshot generator, agent-turn notifications, and the
 * prerequisites check. Everything with logic lives in the sibling modules;
 * this file wires them to Electron.
 */
import { app, BrowserWindow, dialog, ipcMain, Menu, Notification, protocol, screen, session, shell } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createMounts } from "../../../frontend/server/api.ts";
import { processRunner } from "../../../frontend/server/process.ts";
import type { ApiContext } from "../../../frontend/server/types.ts";
import type { DesktopInfo, SnapshotEvent, WorkspaceChoice } from "../../../frontend/src/lib/desktop.ts";
import { CHANNELS } from "../shared/channels.ts";
import { runDoctor } from "./doctor.ts";
import { Generator, GENERATOR_TIMEOUT_MS } from "./generator.ts";
import { InputPoller } from "./inputs.ts";
import { createLog } from "./log.ts";
import { menuTemplate } from "./menu.ts";
import { describeTurn, TurnWatcher } from "./notifier.ts";
import type { TurnEnd } from "./notifier.ts";
import { createHandler, HOME_URL, ORIGIN, SCHEME, splitMounts, WIKI_ORIGIN } from "./protocol.ts";
import type { ApiMounts } from "./protocol.ts";
import { choosePython, isXcodeStub, which } from "./python.ts";
import type { Probe, PythonChoice } from "./python.ts";
import { loadSettings, rememberWorkspace, saveSettings } from "./settings.ts";
import type { Settings } from "./settings.ts";
import { resolveEnv } from "./shellEnv.ts";
import type { ResolvedEnv } from "./shellEnv.ts";
import { canonical, describeProblem, initialWorkspace, missingMarkers, workspaceArgument } from "./workspace.ts";
import { MIN_SIZE, restoreBounds } from "./windowState.ts";

const APP_ID = "io.github.pengqianhan.researchos";
const DOCS_URL = "https://github.com/pengqianhan/AI-Human-Research-OS/blob/main/os-ui/client/README.md";
/**
 * This launch's token for the token-gated endpoints, as on the dev server. The
 * preload hands it to the top frame only; the Paper Wiki frame is another
 * origin and never sees it.
 */
const TOKEN = randomBytes(16).toString("hex");
const NOTIFY_POLL_MS = 3000;
const INPUT_POLL_MS = 4000;
const FOCUS_REFRESH_MS = 30_000;
/** A safety net for inputs the poller does not list (global skill folders, deep hub skills). */
const PERIODIC_REFRESH_MS = 5 * 60_000;

if (process.env.OS_CLIENT_USER_DATA) app.setPath("userData", resolve(process.env.OS_CLIENT_USER_DATA));

// Must happen before `ready`: app:// behaves like https for fetch, storage, and iframes.
protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, codeCache: true } },
]);

interface OpenWorkspace {
  dir: string;
  python: PythonChoice;
  mounts: ApiMounts;
  generator: Generator;
  inputs: InputPoller;
  turns: TurnWatcher;
  timers: NodeJS.Timeout[];
}

const settingsFile = join(app.getPath("userData"), "settings.json");
const logFile = join(app.getPath("userData"), "logs", "main.log");
const log = createLog(logFile);
const rendererDir = join(__dirname, "renderer");

let settings: Settings = loadSettings(settingsFile);
let resolvedEnv: ResolvedEnv = { env: process.env, source: "inherited", problem: null };
let childEnv: NodeJS.ProcessEnv = process.env;
let current: OpenWorkspace | null = null;
let workspaceProblem: string | null = null;
let win: BrowserWindow | null = null;

function persist(): void {
  try {
    saveSettings(settingsFile, settings);
  } catch (error) {
    log(`settings not saved: ${String(error)}`);
  }
}

function sendToRenderer(channel: string, payload: unknown): void {
  if (win !== null && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function closeWorkspace(): void {
  if (current === null) return;
  for (const timer of current.timers) clearInterval(timer);
  current.inputs.stop();
  current = null;
}

/** A short command for probing tools; never rejects. */
function probe(cwd: string): Probe {
  const run = processRunner(childEnv);
  return (command) =>
    run(command, { cwd, timeoutMs: 15_000 }).then(
      (r) => ({ code: r.code, output: r.stdout + r.stderr }),
      (error: unknown) => ({ code: -1, output: String((error as Error).message ?? error) }),
    );
}

async function openWorkspace(dir: string): Promise<void> {
  closeWorkspace();
  workspaceProblem = null;
  const python = await choosePython({ repoRoot: dir, path: childEnv.PATH ?? "", probe: probe(dir) });
  log(`workspace ${dir}; python: ${python.detail}`);
  const run = processRunner(childEnv);
  const prefix = (): [string, ...string[]] => {
    if (python.prefix === null) throw new Error(`${python.detail}; install uv from https://docs.astral.sh/uv/`);
    return python.prefix;
  };
  const generator = new Generator(
    () =>
      run([...prefix(), join(dir, "os-ui", "generator", "generate.py")], {
        cwd: join(dir, "os-ui", "generator"),
        timeoutMs: GENERATOR_TIMEOUT_MS,
      }),
    (event: SnapshotEvent) => {
      if (event.state === "error") log(`generator failed: ${event.error}`);
      sendToRenderer(CHANNELS.snapshot, event);
    },
  );
  // The harness reads OS_HARNESS_SESSIONS from the environment it is given
  // (the login shell's included), relative to the workspace where it runs.
  const sessionsDir = resolve(dir, childEnv.OS_HARNESS_SESSIONS || join("os-harness", "sessions"));
  const ctx: ApiContext = {
    repoRoot: dir,
    python: prefix,
    run,
    sessionsDir,
    publicWikiDir: null, // the protocol serves paper-wiki/ in place
    async regenerate() {
      const event = await generator.request();
      return event.state === "ok" ? null : (event.error ?? "generator failed");
    },
  };
  const inputs = new InputPoller(dir, () => void generator.request());
  inputs.start(INPUT_POLL_MS);
  const turns = new TurnWatcher(sessionsDir, notifyTurn);
  turns.prime();
  const timers = [
    setInterval(() => turns.poll(), NOTIFY_POLL_MS),
    setInterval(() => void generator.request(), PERIODIC_REFRESH_MS),
  ];
  current = { dir, python, mounts: splitMounts(createMounts(ctx)), generator, inputs, turns, timers };
  void generator.request();

  settings = rememberWorkspace(settings, dir);
  persist();
  buildMenu();
}

function notifyTurn(end: TurnEnd): void {
  log(`turn ended: ${end.session} turn ${end.turn} ${end.ok ? "ok" : "failed"}`);
  if (!settings.notifications || current === null || !Notification.isSupported()) return;
  if (win !== null && !win.isDestroyed() && win.isFocused()) return;
  const { title, body } = describeTurn(end, current.dir);
  const notification = new Notification({ title, body });
  notification.on("click", showWindow);
  notification.show();
}

/** Validate, open, and reload the window onto `dir`; the error text when it is not a workspace. */
async function switchWorkspace(raw: string): Promise<string | null> {
  const dir = canonical(raw);
  const problem = describeProblem(dir, missingMarkers(dir));
  if (problem !== null) return problem;
  await openWorkspace(dir);
  if (win !== null && !win.isDestroyed()) win.webContents.reload();
  return null;
}

async function chooseWorkspace(): Promise<WorkspaceChoice> {
  const options: Electron.OpenDialogOptions = {
    title: "Open a Research OS folder",
    buttonLabel: "Open",
    properties: ["openDirectory"],
  };
  const picked = win !== null ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
  const dir = picked.filePaths[0];
  if (picked.canceled || dir === undefined) return { ok: false, canceled: true };
  const problem = describeProblem(dir, missingMarkers(dir));
  if (problem === null && !(await trustFolder(dir))) return { ok: false, canceled: true };
  const error = await switchWorkspace(dir);
  if (error !== null) {
    log(`not a workspace: ${error}`);
    return { ok: false, canceled: false, error };
  }
  return { ok: true, workspace: dir };
}

/**
 * Opening a folder runs its own scripts (the generator at once; the harness and
 * skill scripts on request) with the user's rights. A folder opened for the
 * first time is confirmed once; folders in Open Recent were confirmed before.
 */
async function trustFolder(dir: string): Promise<boolean> {
  const known = settings.recentWorkspaces.some((p) => canonical(p) === canonical(dir));
  if (known) return true;
  const options: Electron.MessageBoxOptions = {
    type: "question",
    buttons: ["Open", "Cancel"],
    defaultId: 0,
    cancelId: 1,
    message: "Open this Research OS folder?",
    detail: `${dir}\n\nThe client runs this folder's scripts (the snapshot generator now; os-harness and skill scripts when you use them). Open only folders you trust.`,
  };
  const answer = win !== null ? await dialog.showMessageBox(win, options) : await dialog.showMessageBox(options);
  return answer.response === 0;
}

function noWorkspaceEvent(): SnapshotEvent {
  return { state: "error", at: new Date().toISOString(), error: "No Research OS folder is open.", durationMs: null };
}

function info(): DesktopInfo {
  return {
    appVersion: app.getVersion(),
    versions: { electron: process.versions.electron, chrome: process.versions.chrome, node: process.versions.node },
    platform: process.platform,
    arch: process.arch,
    workspace: current?.dir ?? null,
    workspaceProblem,
    python: current?.python.detail ?? "not chosen until a folder is open",
    envSource: resolvedEnv.source + (resolvedEnv.problem ? ` (${resolvedEnv.problem})` : ""),
    snapshot: current?.generator.last ?? null,
  };
}

function buildMenu(): void {
  const template = menuTemplate({
    platform: process.platform,
    appName: app.name,
    recent: settings.recentWorkspaces,
    hasWorkspace: current !== null,
    notifications: settings.notifications,
    actions: {
      openWorkspace: () => void chooseWorkspace().then((r) => !r.ok && !r.canceled && dialog.showErrorBox("Not a Research OS folder", r.error)),
      openRecent: (dir) =>
        void switchWorkspace(dir).then((error) => error !== null && dialog.showErrorBox("Not a Research OS folder", error)),
      revealWorkspace: () => current !== null && void shell.openPath(current.dir),
      regenerate: () => current !== null && void current.generator.request(),
      showSystem: () => {
        showWindow();
        sendToRenderer(CHANNELS.command, "open-system");
      },
      setNotifications: (on) => {
        settings = { ...settings, notifications: on };
        persist();
      },
      showLog: () => shell.showItemInFolder(logFile),
      openDocs: () => void shell.openExternal(DOCS_URL),
    },
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function isExternal(url: string): boolean {
  return /^(https?:|mailto:)/i.test(url);
}

function allowedNavigation(url: string, isMainFrame: boolean): boolean {
  if (isMainFrame) return url.startsWith(`${ORIGIN}/`);
  return url.startsWith(`${WIKI_ORIGIN}/`) || url === "about:blank" || url === "about:srcdoc";
}

function showWindow(): void {
  if (win === null || win.isDestroyed()) {
    createWindow();
    return;
  }
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function createWindow(): void {
  const bounds = restoreBounds(
    settings.window,
    screen.getAllDisplays().map((d) => d.workArea),
  );
  const icon = join(__dirname, "icon.png");
  win = new BrowserWindow({
    ...bounds,
    minWidth: MIN_SIZE.width,
    minHeight: MIN_SIZE.height,
    show: false,
    title: "Research OS",
    backgroundColor: "#F2F4F3",
    ...(process.platform === "linux" && existsSync(icon) ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      additionalArguments: [`--os-desktop-token=${TOKEN}`],
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false,
    },
  });
  if (settings.window?.maximized) win.maximize();
  win.on("page-title-updated", (event) => event.preventDefault()); // keep "Research OS"
  win.once("ready-to-show", () => win?.show());

  const contents = win.webContents;
  contents.setWindowOpenHandler(({ url }) => {
    if (isExternal(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  // The window stays on the app's origin and frames on the Paper Wiki's; any
  // other navigation is cancelled, and a web link opens in the browser instead.
  const guard = (event: Electron.Event, url: string, isMainFrame: boolean) => {
    if (allowedNavigation(url, isMainFrame)) return;
    event.preventDefault();
    if (isExternal(url)) void shell.openExternal(url);
  };
  contents.on("will-frame-navigate", (event) => guard(event, event.url, event.isMainFrame));
  contents.on("will-redirect", (event) => guard(event, event.url, event.isMainFrame));
  contents.on("render-process-gone", (_event, details) => log(`renderer gone: ${details.reason}`));

  win.on("focus", () => {
    const last = current?.generator.last;
    if (current !== null && (last === null || last === undefined || Date.now() - Date.parse(last.at) > FOCUS_REFRESH_MS)) {
      void current.generator.request();
    }
  });
  win.on("close", () => {
    if (win === null) return;
    const normal = win.getNormalBounds();
    settings = { ...settings, window: { ...normal, maximized: win.isMaximized() } };
    persist();
  });
  win.on("closed", () => {
    win = null;
  });
  void win.loadURL(HOME_URL);
}

/** IPC is answered only for the app's own top frame (the preload exists only there). */
function trusted(event: IpcMainInvokeEvent): boolean {
  const frame = event.senderFrame;
  return frame !== null && frame.parent === null && frame.url.startsWith(`${ORIGIN}/`);
}

function registerIpc(): void {
  const handle = <T>(channel: string, fn: () => T | Promise<T>) =>
    ipcMain.handle(channel, (event) => {
      if (!trusted(event)) throw new Error("untrusted sender");
      return fn();
    });
  handle(CHANNELS.info, info);
  handle(CHANNELS.chooseWorkspace, chooseWorkspace);
  handle(CHANNELS.regenerate, () => (current === null ? noWorkspaceEvent() : current.generator.request()));
  handle(CHANNELS.doctor, async () => {
    const cwd = current?.dir ?? app.getPath("home");
    const path = childEnv.PATH ?? "";
    const git = which("git", path);
    return runDoctor({
      workspace: current?.dir ?? null,
      workspaceProblem,
      python: current?.python ?? (await choosePython({ repoRoot: cwd, path, probe: probe(cwd), version: null })),
      uvPath: which("uv", path),
      gitPath: git !== null && (await isXcodeStub(git, process.platform, probe(cwd))) ? null : git,
      exec: processRunner(childEnv),
    });
  });
}

async function start(): Promise<void> {
  if (process.platform === "win32") app.setAppUserModelId(APP_ID);
  app.setAboutPanelOptions({
    applicationName: "Research OS",
    applicationVersion: app.getVersion(),
    copyright: "MIT License",
    website: "https://github.com/pengqianhan/AI-Human-Research-OS",
  });

  resolvedEnv = await resolveEnv({ platform: process.platform, env: process.env, home: homedir(), execPath: process.execPath });
  childEnv = resolvedEnv.env;
  log(`start ${app.getVersion()} on ${process.platform}-${process.arch}; environment from ${resolvedEnv.source}${resolvedEnv.problem ? ` (${resolvedEnv.problem})` : ""}`);

  const handler = createHandler(() => ({
    renderer: rendererDir,
    workspace: current?.dir ?? null,
    mounts: current?.mounts ?? null,
    token: TOKEN,
  }));
  protocol.handle(SCHEME, handler);
  // Deny every web permission except writing text to the clipboard (the copy
  // buttons). Native notifications come from this process and need none.
  session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) =>
    callback(permission === "clipboard-sanitized-write"),
  );
  session.defaultSession.setPermissionCheckHandler((_contents, permission) => permission === "clipboard-sanitized-write");
  registerIpc();

  const initial = initialWorkspace({
    argv: process.argv,
    env: process.env,
    saved: settings.workspace,
    appPath: app.getAppPath(),
    cwd: process.cwd(),
  });
  if (initial.dir !== null) {
    await openWorkspace(initial.dir);
  } else {
    workspaceProblem = initial.problem;
    if (initial.problem) log(initial.problem);
    buildMenu();
  }
  createWindow();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv, cwd) => {
    const requested = workspaceArgument(argv);
    if (requested !== null) {
      void switchWorkspace(resolve(cwd, requested)).then(
        (error) => error !== null && dialog.showErrorBox("Not a Research OS folder", error),
      );
    }
    showWindow();
  });
  // Quit with the last window on every platform, macOS included: the pollers
  // and the notifier never run without a window (no background agent).
  app.on("window-all-closed", () => app.quit());
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  app.on("before-quit", closeWorkspace);
  void app.whenReady().then(start);
}
