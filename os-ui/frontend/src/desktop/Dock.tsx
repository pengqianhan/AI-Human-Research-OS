import { useRef, useState } from "react";
import type { AppDef, AppId } from "./apps";
import { DESKTOP, LIVE } from "../lib/mode";
import { desktop } from "../lib/desktop";

interface Props {
  apps: AppDef[];
  /** minimized=true → hollow indicator dot; absent from map → app closed. */
  openApps: Map<AppId, { minimized: boolean }>;
  onAppClick: (id: AppId) => void;
}

const GENERATE_COMMAND = "cd os-ui/generator && uv run python generate.py";

const refreshIcon = (
  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 9a5.5 5.5 0 1 1-1.6-3.9" />
    <path d="M14.5 3v3.2h-3.2" />
  </svg>
);

const terminalIcon = (
  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1.5" y="2.5" width="15" height="13" rx="2" />
    <path d="m5 7 2.5 2L5 11" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9.5 11.5H13" strokeLinecap="round" />
  </svg>
);


/**
 * Bottom-center dock. Left of the divider: the app windows, including the
 * Root Agent conversation (its window chooses the agent). Right of it: the
 * copy-only snapshot-regenerate command, or in the desktop client a button
 * that regenerates the snapshot itself.
 */
export function Dock({ apps, openApps, onAppClick }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyTimer = useRef<number | undefined>(undefined);
  const [regen, setRegen] = useState<{ state: "idle" | "running" | "ok" | "error"; error?: string }>({ state: "idle" });

  async function regenerate() {
    if (desktop === null || regen.state === "running") return;
    setRegen({ state: "running" });
    const event = await desktop.regenerate();
    setRegen(event.state === "ok" ? { state: "ok" } : { state: "error", error: event.error ?? "generator failed" });
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setRegen({ state: "idle" }), event.state === "ok" ? 1600 : 6000);
  }

  async function copyCommand(id: string, command: string) {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      // Clipboard can be unavailable (e.g. non-HTTPS); fall back to a prompt
      // the human can read and copy from manually.
      window.prompt("Copy this command and run it in a terminal:", command);
      return;
    }
    setCopiedId(id);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopiedId(null), 1600);
  }

  const tooltipClass =
    "font-mono-heading pointer-events-none absolute -top-8 whitespace-nowrap rounded border border-grid bg-panel px-2 py-[3px] text-[11px] text-ink opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100";

  return (
    <nav
      aria-label="Dock"
      className="dock-shadow absolute bottom-4 left-1/2 z-[9000] flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-grid bg-panel-glass px-3 py-1.5 backdrop-blur"
    >
      {apps.map((app) => {
        const open = openApps.get(app.id);
        return (
          <button
            key={app.id}
            type="button"
            data-dock-app={app.id}
            onClick={() => onAppClick(app.id)}
            aria-label={app.title + (open ? (open.minimized ? " (minimized)" : " (open)") : "")}
            className="group relative flex h-11 w-11 flex-col items-center justify-center rounded-xl text-ink transition-colors hover:bg-paper"
          >
            <span className="[&>svg]:h-[19px] [&>svg]:w-[19px]">{app.icon}</span>
            {/* running indicator: solid dot = visible, hollow = minimized */}
            <span
              aria-hidden="true"
              className={
                "absolute bottom-[3px] h-[4.5px] w-[4.5px] rounded-full " +
                (open === undefined
                  ? "opacity-0"
                  : open.minimized
                    ? "border border-ink-soft bg-transparent"
                    : "bg-ink")
              }
            />
            <span className={tooltipClass}>{app.title}</span>
          </button>
        );
      })}

      {DESKTOP && (
        <>
          <span aria-hidden="true" className="mx-1.5 h-6 w-px bg-grid" />
          <button
            type="button"
            onClick={() => void regenerate()}
            aria-label="Regenerate the data snapshot"
            className="group relative flex h-11 w-11 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-paper"
          >
            <span
              className={
                (regen.state === "running" ? "animate-spin text-signal " : regen.state === "ok" ? "text-verify " : regen.state === "error" ? "text-danger " : "") +
                "[&>svg]:h-[19px] [&>svg]:w-[19px]"
              }
            >
              {refreshIcon}
            </span>
            <span className={tooltipClass + " right-0"}>
              {regen.state === "running" ? (
                "Regenerating…"
              ) : regen.state === "ok" ? (
                <b className="text-verify">Snapshot updated</b>
              ) : regen.state === "error" ? (
                <b className="text-danger">Failed · see System</b>
              ) : (
                "Regenerate data snapshot"
              )}
            </span>
            <span aria-live="polite" className="sr-only">
              {regen.state === "ok" ? "Snapshot updated" : regen.state === "error" ? `Snapshot failed: ${regen.error}` : ""}
            </span>
          </button>
        </>
      )}

      {/* A published build is regenerated by its deploy, not by the visitor. */}
      {LIVE && !DESKTOP && (
        <>
          <span aria-hidden="true" className="mx-1.5 h-6 w-px bg-grid" />

          <button
            type="button"
            onClick={() => copyCommand("generate", GENERATE_COMMAND)}
            aria-label="Copy snapshot regeneration command"
            className="group relative flex h-11 w-11 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-paper"
          >
            <span
              className={
                (copiedId === "generate" ? "text-verify " : "") + "[&>svg]:h-[19px] [&>svg]:w-[19px]"
              }
            >
              {terminalIcon}
            </span>
            {/* right-0: the long command tooltip grows leftward instead of
                getting clipped at the right screen edge */}
            <span className={tooltipClass + " right-0"}>
              {copiedId === "generate" ? (
                <b className="text-verify">Copied. Run it in a terminal.</b>
              ) : (
                <>
                  Refresh data snapshot <span className="text-stale">· copy {GENERATE_COMMAND}</span>
                </>
              )}
            </span>
            <span aria-live="polite" className="sr-only">
              {copiedId === "generate" ? "Copied generation command; run it in a terminal" : ""}
            </span>
          </button>
        </>
      )}
    </nav>
  );
}
