import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export interface WindowBounds {
  x: number | null;
  y: number | null;
  width: number;
  height: number;
  maximized: boolean;
}

/** The client's own state, kept in <userData>/settings.json. Research state never lives here. */
export interface Settings {
  version: 1;
  workspace: string | null;
  recentWorkspaces: string[];
  notifications: boolean;
  window: WindowBounds | null;
}

export const MAX_RECENT = 5;

export function defaultSettings(): Settings {
  return { version: 1, workspace: null, recentWorkspaces: [], notifications: true, window: null };
}

const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function parseBounds(raw: unknown): WindowBounds | null {
  if (typeof raw !== "object" || raw === null) return null;
  const b = raw as Record<string, unknown>;
  if (!isNumber(b.width) || !isNumber(b.height) || b.width < 200 || b.height < 200) return null;
  return {
    x: isNumber(b.x) ? b.x : null,
    y: isNumber(b.y) ? b.y : null,
    width: Math.round(b.width),
    height: Math.round(b.height),
    maximized: b.maximized === true,
  };
}

/** Field by field, so one damaged value does not cost the others. */
export function parseSettings(text: string | null): Settings {
  const settings = defaultSettings();
  if (text === null) return settings;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return settings;
  }
  if (typeof raw !== "object" || raw === null) return settings;
  const r = raw as Record<string, unknown>;
  if (typeof r.workspace === "string" && r.workspace !== "") settings.workspace = r.workspace;
  if (Array.isArray(r.recentWorkspaces)) {
    settings.recentWorkspaces = r.recentWorkspaces
      .filter((p): p is string => typeof p === "string" && p !== "")
      .slice(0, MAX_RECENT);
  }
  if (typeof r.notifications === "boolean") settings.notifications = r.notifications;
  settings.window = parseBounds(r.window);
  return settings;
}

export function loadSettings(file: string): Settings {
  let text: string | null = null;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    // first run, or unreadable: start from defaults
  }
  return parseSettings(text);
}

/** Write to a sibling temp file, then rename, so a crash never leaves half a file. */
export function saveSettings(file: string, settings: Settings): void {
  mkdirSync(dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(settings, null, 2) + "\n", "utf8");
  renameSync(temp, file);
}

function samePath(a: string, b: string, platform: NodeJS.Platform): boolean {
  return platform === "win32" || platform === "darwin" ? a.toLowerCase() === b.toLowerCase() : a === b;
}

/** Open `dir`: it becomes the workspace and moves to the front of the recent list. */
export function rememberWorkspace(settings: Settings, dir: string, platform: NodeJS.Platform = process.platform): Settings {
  const recent = [dir, ...settings.recentWorkspaces.filter((p) => !samePath(p, dir, platform))].slice(0, MAX_RECENT);
  return { ...settings, workspace: dir, recentWorkspaces: recent };
}
