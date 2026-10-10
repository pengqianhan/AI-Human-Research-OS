import { useCallback, useEffect, useState } from "react";
import { desktop } from "../lib/desktop";
import type { CheckState, DesktopInfo, DoctorReport, SnapshotEvent } from "../lib/desktop";
import { Chip } from "./Chip";
import type { ChipTone } from "./Chip";
import { Disclosure } from "./Disclosure";

const TONE: Record<CheckState, ChipTone> = { ok: "ok", warn: "warn", missing: "signal", error: "signal" };
const WORD: Record<CheckState, string> = { ok: "ok", warn: "check", missing: "missing", error: "error" };

/** The desktop client's facts, refreshed on each snapshot event. Null outside the client. */
export function useDesktopInfo(): [DesktopInfo | null, () => void] {
  const [info, setInfo] = useState<DesktopInfo | null>(null);
  const refresh = useCallback(() => {
    void desktop?.info().then(setInfo);
  }, []);
  useEffect(() => {
    refresh();
    return desktop?.onSnapshot(() => refresh());
  }, [refresh]);
  return [info, refresh];
}

/** The prerequisites check, run once on mount and again on request. */
export function usePrerequisites(): [DoctorReport | null, boolean, () => void] {
  const [report, setReport] = useState<DoctorReport | null>(null);
  const [checking, setChecking] = useState(false);
  const run = useCallback(() => {
    if (desktop === null) return;
    setChecking(true);
    void desktop
      .doctor()
      .then(setReport)
      .finally(() => setChecking(false));
  }, []);
  useEffect(run, [run]);
  return [report, checking, run];
}

export function ChooseFolderButton({ label = "Choose folder…" }: { label?: string }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={() => {
          setError(null);
          void desktop?.chooseWorkspace().then((r) => {
            if (!r.ok && !r.canceled) setError(r.error);
          });
        }}
        className="font-mono-heading rounded border border-ink bg-ink px-3 py-1 text-[12px] text-white"
      >
        {label}
      </button>
      {error && <span className="text-[12px] text-danger">{error}</span>}
    </span>
  );
}

/** One tile per prerequisite: a coloured chip and a version; the detail and install link on click. */
export function PrerequisiteGrid({ report, checking, onRecheck }: { report: DoctorReport | null; checking: boolean; onRecheck: () => void }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="font-mono-heading text-[11px] uppercase tracking-[.08em] text-stale">Prerequisites</h3>
        {report && (
          <Chip tone={report.ready ? "ok" : "warn"} dot>
            {report.ready ? "ready" : "not ready"}
          </Chip>
        )}
        <button
          type="button"
          onClick={onRecheck}
          disabled={checking}
          className="font-mono-heading ml-auto rounded border border-grid px-2 py-[2px] text-[11px] text-ink-soft hover:bg-paper disabled:opacity-50"
        >
          {checking ? "checking…" : "re-check"}
        </button>
      </div>
      {report === null ? (
        <p className="font-mono-heading text-[12px] text-stale">{checking ? "checking…" : "not checked"}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {report.checks.map((c) => (
            <li key={c.id} data-check={c.id} data-state={c.state} className="rounded border border-grid bg-panel px-3 py-2">
              <Disclosure
                summary={
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="font-mono-heading truncate text-[12.5px] text-ink">{c.label}</span>
                    {!c.required && <span className="font-mono-heading text-[10px] text-stale">optional</span>}
                    <span className="ml-auto flex items-center gap-2">
                      {c.version && <span className="font-mono-heading text-[11px] text-ink-soft">{c.version}</span>}
                      <Chip tone={TONE[c.state]} dot>
                        {WORD[c.state]}
                      </Chip>
                    </span>
                  </span>
                }
              >
                <p className="break-words font-mono-heading text-[11.5px] text-ink-soft">{c.detail}</p>
                {c.help && c.state !== "ok" && (
                  <a href={c.help} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[12px] text-signal underline">
                    How to install
                  </a>
                )}
              </Disclosure>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function SnapshotLine({ snapshot }: { snapshot: SnapshotEvent | null }) {
  if (snapshot === null) return <Chip tone="mute">no run yet</Chip>;
  if (snapshot.state === "running") return <Chip tone="signal" dot>regenerating</Chip>;
  if (snapshot.state === "ok") {
    const seconds = snapshot.durationMs === null ? "" : ` · ${(snapshot.durationMs / 1000).toFixed(1)} s`;
    return (
      <Chip tone="ok" dot title={snapshot.at}>
        {new Date(snapshot.at).toLocaleTimeString()}
        {seconds}
      </Chip>
    );
  }
  return (
    <Disclosure summary={<Chip tone="signal" dot>failed</Chip>}>
      <pre className="font-mono-heading max-h-48 overflow-auto whitespace-pre-wrap rounded bg-ink px-3 py-2 text-[11px] text-[#E8EDEF]">
        {snapshot.error}
      </pre>
    </Disclosure>
  );
}
