import { useCallback, useEffect, useRef, useState } from "react";

interface SourceRow {
  id: string;
  name: string;
  about: string;
  enabled: boolean;
}

/** A monogram in each source's colour; the OS ships no third-party logos. */
const TILE: Record<string, { label: string; bg: string; fg: string }> = {
  alphaxiv: { label: "αX", bg: "#B31B1B", fg: "#FFFFFF" },
  openalex: { label: "OA", bg: "#4B4BA8", fg: "#FFFFFF" },
  biorxiv: { label: "bR", bg: "#8E2A5D", fg: "#FFFFFF" },
  pubmed: { label: "PM", bg: "#1F6FA8", fg: "#FFFFFF" },
  huggingface: { label: "HF", bg: "#FFD21E", fg: "#17262E" },
  pwc: { label: "PC", bg: "#1C9C9A", fg: "#FFFFFF" },
};
const FALLBACK_TILE = { label: "?", bg: "#52646E", fg: "#FFFFFF" };

function Tile({ id, size, dim = false }: { id: string; size: number; dim?: boolean }) {
  const tile = TILE[id] ?? FALLBACK_TILE;
  return (
    <span
      aria-hidden="true"
      className="font-mono-heading inline-flex shrink-0 items-center justify-center rounded-[3px] font-semibold leading-none ring-1 ring-panel"
      style={{
        width: size,
        height: size,
        background: tile.bg,
        color: tile.fg,
        fontSize: Math.round(size * 0.5),
        opacity: dim ? 0.3 : 1,
      }}
    >
      {size >= 14 ? tile.label : null}
    </span>
  );
}

function Switch({ on, busy }: { on: boolean; busy: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={
        "relative inline-block h-[14px] w-[24px] shrink-0 rounded-full transition-colors motion-reduce:transition-none " +
        (on ? "bg-verify" : "bg-grid") +
        (busy ? " opacity-50" : "")
      }
    >
      <span
        className={
          "absolute top-[2px] h-[10px] w-[10px] rounded-full bg-white shadow transition-[left] motion-reduce:transition-none " +
          (on ? "left-[12px]" : "left-[2px]")
        }
      />
    </span>
  );
}

/**
 * The Papers button in an agent window's header: which literature sources the
 * paper-search skill may query, switched on and off here the way OpenResearch
 * does in its composer. The switches are one repository file
 * (memory/paper-sources.json) shared by every agent, so each open re-reads it.
 */
export function PaperSources({ token }: { token: string }) {
  const [rows, setRows] = useState<SourceRow[] | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const call = useCallback(
    async (change?: { source: string; enabled: boolean }) => {
      const res = await fetch("/api/paper-sources", {
        method: change ? "POST" : "GET",
        headers: { "X-OS-UI-Token": token, ...(change ? { "Content-Type": "application/json" } : {}) },
        body: change ? JSON.stringify(change) : undefined,
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as { sources?: SourceRow[]; error?: string };
      if (!res.ok || data.sources === undefined) throw new Error(data.error ?? `HTTP ${res.status}`);
      return data.sources;
    },
    [token],
  );

  useEffect(() => {
    let live = true;
    call()
      .then((next) => live && setRows(next))
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [call, open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function toggle(row: SourceRow) {
    if (saving !== null) return;
    setSaving(row.id);
    setError(null);
    try {
      setRows(await call({ source: row.id, enabled: !row.enabled }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(null);
    }
  }

  if (rows === null && error === null) return null;
  const on = rows?.filter((row) => row.enabled) ?? [];

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        title="Paper sources the agents may search"
        className="font-mono-heading flex items-center gap-1.5 rounded border border-grid bg-panel px-1.5 py-[2px] text-[11.5px] text-ink hover:bg-paper"
      >
        Papers
        {rows === null ? (
          <span className="text-warn">!</span>
        ) : (
          <>
            <span className="flex -space-x-[3px]">
              {on.map((row) => (
                <Tile key={row.id} id={row.id} size={11} />
              ))}
            </span>
            <span className="text-stale">
              {on.length}/{rows.length}
            </span>
          </>
        )}
      </button>

      {open && (
        <div className="window-shadow absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-grid bg-panel py-1">
          <div className="font-mono-heading px-3 pb-1 pt-1.5 text-[10px] uppercase tracking-[.05em] text-stale">
            Paper sources
          </div>
          {rows?.map((row) => (
            <button
              key={row.id}
              type="button"
              role="switch"
              aria-checked={row.enabled}
              disabled={saving !== null}
              onClick={() => void toggle(row)}
              title={row.about}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-paper disabled:cursor-wait"
            >
              <Tile id={row.id} size={16} dim={!row.enabled} />
              <span className={"flex-1 text-[12.5px] " + (row.enabled ? "text-ink" : "text-stale")}>{row.name}</span>
              <Switch on={row.enabled} busy={saving === row.id} />
            </button>
          ))}
          {error !== null && <p className="px-3 py-1 text-[11px] text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
