import { useEffect, useRef, useState } from "react";
import type { OsState } from "./types";

const POLL_INTERVAL_MS = 5000;
const STATE_URL = "/state.json";

export type OsStateStatus =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ok"; state: OsState };

/**
 * Fetches /state.json and re-polls every 5s. Polling pauses while the tab
 * is hidden (document.hidden) and resumes immediately on visibilitychange.
 * A 404 or any fetch failure is surfaced as `{ kind: "error" }` so the app
 * can render the full-page empty state instructing the human to run the
 * generator — the frontend never fabricates data.
 */
export function useOsState(): OsStateStatus {
  const [status, setStatus] = useState<OsStateStatus>({ kind: "loading" });
  const timerRef = useRef<number | undefined>(undefined);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function load() {
      try {
        const res = await fetch(STATE_URL, { cache: "no-store" });
        if (!res.ok) {
          if (mountedRef.current) setStatus({ kind: "error" });
          return;
        }
        const data = (await res.json()) as OsState;
        if (mountedRef.current) setStatus({ kind: "ok", state: data });
      } catch {
        if (mountedRef.current) setStatus({ kind: "error" });
      }
    }

    function scheduleNext() {
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(async () => {
        if (!document.hidden) {
          await load();
        }
        scheduleNext();
      }, POLL_INTERVAL_MS);
    }

    function onVisibilityChange() {
      if (!document.hidden) {
        // Refresh immediately when the tab regains focus, then resume the
        // regular 5s cadence.
        void load();
      }
    }

    void load();
    scheduleNext();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      mountedRef.current = false;
      window.clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return status;
}
