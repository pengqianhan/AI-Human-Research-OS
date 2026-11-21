import { useEffect, useRef, useState } from "react";
import type { Meta } from "../types";
import { formatSnapshotTime, minutesSince } from "../lib/format";
import { DESKTOP, LIVE } from "../lib/mode";
import { desktop } from "../lib/desktop";
import { Icon } from "./icons";

const STALE_THRESHOLD_MINUTES = 10;
const GENERATE_COMMAND = "cd os-ui/generator && uv run python generate.py";

/** Which build this is: the desktop client, the dev server, or a published view-only copy. */
export const MODE_LABEL = DESKTOP ? "Desktop client" : LIVE ? "Dev server" : "Public snapshot · view only";

/**
 * The sidebar footer: how fresh the data snapshot is, which build this is,
 * and the way to refresh the snapshot. The desktop client regenerates it
 * with a button; the dev server copies the generator command for a
 * terminal; a published build is refreshed by its deploy, so it has neither.
 *
 * This is DESIGN.md's "honest staleness over lying realtime": if
 * generated_at is more than 10 minutes old on a live build, the chip turns
 * amber and says "stale" instead of pretending to be live.
 */
export function SnapshotStatus({ meta, collapsed }: { meta: Meta; collapsed: boolean }) {
  const [, forceTick] = useState(0);
  // Re-check staleness once a minute even if no new state.json arrives.
  useEffect(() => {
    const id = window.setInterval(() => forceTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const ageMinutes = minutesSince(meta.generated_at);
  // A published snapshot is as old as its last deploy by design; only a live build can go stale.
  const isStale = LIVE && ageMinutes !== null && ageMinutes > STALE_THRESHOLD_MINUTES;
  const details = `Generated at ${meta.generated_at} · schema v${meta.schema_version} · HEAD ${meta.repo_head}`;
  const when = formatSnapshotTime(meta.generated_at);

  return (
    <div className={"mx-0.5 mb-1 rounded-[10px] " + (collapsed ? "flex flex-col items-center gap-1 py-1" : "bg-card px-2.5 py-2 shadow-sh1")}>
      {collapsed ? (
        <span
          role="img"
          aria-label={`Snapshot ${when}${isStale ? ", stale" : ""}`}
          title={`Snapshot ${when}${isStale ? " (stale)" : ""} · ${MODE_LABEL}\n${details}`}
          className={"my-1 h-[9px] w-[9px] rounded-full " + (isStale ? "bg-warn" : "bg-accent")}
        />
      ) : (
        <>
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink2" title={details}>
            <span aria-hidden="true" className={"h-[7px] w-[7px] shrink-0 rounded-full " + (isStale ? "bg-warn" : "bg-accent")} />
            Snapshot
            {isStale && <b className="ml-auto rounded-full bg-warn-soft px-1.5 text-[10.5px] font-semibold text-warn">stale</b>}
          </div>
          <div className="mt-0.5 pl-[13px] text-[11.5px] tabular-nums text-ink2" title={details}>
            {when}
          </div>
          <div className="pl-[13px] text-[11px] text-muted">{MODE_LABEL}</div>
        </>
      )}
      {DESKTOP && <RegenerateButton collapsed={collapsed} />}
      {LIVE && !DESKTOP && <CopyCommandButton collapsed={collapsed} />}
    </div>
  );
}

const footerButton = (collapsed: boolean) =>
  "flex items-center gap-2 rounded-[8px] text-left text-[12px] leading-tight text-ink2 hover:bg-hover hover:text-ink " +
  (collapsed ? "mt-0.5 h-8 w-8 justify-center" : "mt-1.5 w-full px-1.5 py-1");

/** Desktop client: run the generator now. The success text "Snapshot updated" is what the E2E suite waits for. */
function RegenerateButton({ collapsed }: { collapsed: boolean }) {
  const [regen, setRegen] = useState<{ state: "idle" | "running" | "ok" | "error"; error?: string }>({ state: "idle" });
  const timer = useRef<number | undefined>(undefined);

  async function regenerate() {
    if (desktop === null || regen.state === "running") return;
    setRegen({ state: "running" });
    const event = await desktop.regenerate();
    setRegen(event.state === "ok" ? { state: "ok" } : { state: "error", error: event.error ?? "generator failed" });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setRegen({ state: "idle" }), event.state === "ok" ? 1600 : 6000);
  }

  const text =
    regen.state === "running"
      ? "Regenerating…"
      : regen.state === "ok"
        ? "Snapshot updated"
        : regen.state === "error"
          ? "Failed · see Settings"
          : "Regenerate";

  return (
    <button
      type="button"
      onClick={() => void regenerate()}
      aria-label="Regenerate the data snapshot"
      title={collapsed ? text : "Run the snapshot generator now"}
      className={footerButton(collapsed)}
    >
      <span className={regen.state === "running" ? "animate-spin text-accent" : regen.state === "ok" ? "text-accent" : regen.state === "error" ? "text-danger" : ""}>
        <Icon name="refresh" size={15} />
      </span>
      {!collapsed && (
        <span className={regen.state === "ok" ? "font-semibold text-accent" : regen.state === "error" ? "font-semibold text-danger" : ""}>{text}</span>
      )}
      <span aria-live="polite" className="sr-only">
        {regen.state === "ok" ? "Snapshot updated" : regen.state === "error" ? `Snapshot failed: ${regen.error}` : ""}
      </span>
    </button>
  );
}

/** Dev server: copy the generator command for a terminal; the browser cannot run it. */
function CopyCommandButton({ collapsed }: { collapsed: boolean }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  async function copy() {
    try {
      await navigator.clipboard.writeText(GENERATE_COMMAND);
    } catch {
      // Clipboard can be unavailable (e.g. non-HTTPS); show the command to copy by hand.
      window.prompt("Copy this command and run it in a terminal:", GENERATE_COMMAND);
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  }

  const text = copied ? "Copied. Run it in a terminal." : "Copy refresh command";
  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label="Copy snapshot regeneration command"
      title={`Refresh the data snapshot: copy ${GENERATE_COMMAND}`}
      className={footerButton(collapsed)}
    >
      <span className={copied ? "text-accent" : ""}>
        <Icon name="terminal" size={15} />
      </span>
      {!collapsed && <span className={copied ? "font-semibold text-accent" : ""}>{text}</span>}
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied generation command; run it in a terminal" : ""}
      </span>
    </button>
  );
}
