/**
 * The desktop client's bridge (os-ui/client/src/preload). The client's preload
 * script puts it on `window.osDesktop`; in a browser it is absent, so every
 * caller must treat `desktop` as possibly null.
 */

export type CheckState = "ok" | "warn" | "missing" | "error";

export interface DoctorCheck {
  id: "workspace" | "uv" | "python" | "git" | "claude" | "codex";
  label: string;
  state: CheckState;
  required: boolean;
  version: string | null;
  detail: string;
  help: string | null;
}

export interface DoctorReport {
  at: string;
  /** Workspace and Python are usable, and at least one agent CLI is logged in. */
  ready: boolean;
  checks: DoctorCheck[];
}

export interface SnapshotEvent {
  state: "running" | "ok" | "error";
  at: string;
  error: string | null;
  durationMs: number | null;
}

export interface DesktopInfo {
  appVersion: string;
  versions: { electron: string; chrome: string; node: string };
  platform: string;
  arch: string;
  /** The open Research OS folder, or null when none is chosen yet. */
  workspace: string | null;
  /** Why the saved or requested folder is not usable, if it is not. */
  workspaceProblem: string | null;
  python: string;
  /** Where the environment for child processes came from: the login shell, or inherited. */
  envSource: string;
  snapshot: SnapshotEvent | null;
}

export type WorkspaceChoice =
  | { ok: true; workspace: string }
  | { ok: false; canceled: true }
  | { ok: false; canceled: false; error: string };

export type DesktopCommand = "open-system";

export interface DesktopBridge {
  /** This launch's token for the token-gated endpoints (/api/chat, /api/paper-sources). */
  readonly token: string;
  info(): Promise<DesktopInfo>;
  chooseWorkspace(): Promise<WorkspaceChoice>;
  regenerate(): Promise<SnapshotEvent>;
  doctor(): Promise<DoctorReport>;
  onSnapshot(callback: (event: SnapshotEvent) => void): () => void;
  onCommand(callback: (command: DesktopCommand) => void): () => void;
}

declare global {
  interface Window {
    osDesktop?: DesktopBridge;
  }
}

export const desktop: DesktopBridge | null = typeof window !== "undefined" ? (window.osDesktop ?? null) : null;
