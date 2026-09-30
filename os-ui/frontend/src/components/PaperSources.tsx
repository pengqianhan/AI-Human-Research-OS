import { useCallback, useEffect, useRef, useState } from "react";

interface SourceRow {
  id: string;
  name: string;
  about: string;
  enabled: boolean;
}

/** A per-user key as the server reports it: never its value. */
interface KeyRow {
  name: string;
  label: string;
  sources: string[];
  set: boolean;
  from: "environment" | ".env" | null;
  get_url: string;
}

interface Status {
  sources: SourceRow[];
  keys: KeyRow[];
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

function KeyItem({ row, busy, onSave }: { row: KeyRow; busy: boolean; onSave: (value: string) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const fromEnv = row.from === "environment";

  async function save(next: string) {
    if (await onSave(next)) {
      setValue("");
      setEditing(false);
    }
  }

  return (
    <div className="px-3 py-1.5" title={fromEnv ? "Set in the environment, which overrides .env" : undefined}>
      <div className="flex items-center gap-2">
        <span className="flex -space-x-[3px]">
          {row.sources.map((source) => (
            <Tile key={source} id={source} size={16} />
          ))}
        </span>
        <span className="flex-1 text-[12.5px] text-ink">{row.label}</span>
        <span
          className={
            "font-mono-heading rounded-[2px] px-1.5 py-px text-[10px] " +
            (row.set ? "bg-[#E4F0ED] text-verify" : "bg-[#EDF0F1] text-stale")
          }
        >
          {row.set ? (fromEnv ? "env" : "set") : "none"}
        </span>
        {!fromEnv && (
          <button
            type="button"
            aria-expanded={editing}
            aria-label={`${row.set ? "Change" : "Add"} ${row.label} key`}
            onClick={() => setEditing((v) => !v)}
            className="font-mono-heading rounded border border-grid px-1.5 text-[10.5px] text-ink hover:bg-paper"
          >
            {row.set ? "edit" : "add"}
          </button>
        )}
      </div>
      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save(value);
          }}
          className="mt-1.5 flex flex-col gap-1.5"
        >
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={row.name}
            aria-label={`${row.label} key`}
            className="font-mono-heading min-w-0 rounded border border-grid bg-paper px-2 py-1 text-[11.5px] text-ink"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={busy || value.trim() === ""}
              className="font-mono-heading rounded border border-ink bg-ink px-2 py-[2px] text-[11px] text-white disabled:opacity-40"
            >
              Save
            </button>
            {row.set && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void save("")}
                className="font-mono-heading rounded border border-grid px-2 py-[2px] text-[11px] text-danger hover:bg-paper disabled:opacity-40"
              >
                Clear
              </button>
            )}
            <a
              href={row.get_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-[11px] text-signal hover:underline"
            >
              Get a key ↗
            </a>
          </div>
        </form>
      )}
    </div>
  );
}

/**
 * The Papers button in an agent window's header: which literature sources the
 * paper-search skill may query, switched on and off here the way OpenResearch
 * does in its composer, and the user's own keys that raise those sources'
 * limits. Switches live in memory/paper-sources.json and keys in the
 * gitignored .env, both shared by every agent, so each open re-reads them. A
 * key goes in and is never shown again: the server reports only whether it is set.
 */
export function PaperSources({ token }: { token: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const call = useCallback(
    async (path = "", body?: unknown) => {
      const res = await fetch(`/api/paper-sources${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: { "X-OS-UI-Token": token, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as Partial<Status> & { error?: string };
      if (!res.ok || data.sources === undefined) throw new Error(data.error ?? `HTTP ${res.status}`);
      return { sources: data.sources, keys: data.keys ?? [] };
    },
    [token],
  );

  useEffect(() => {
    let live = true;
    call()
      .then((next) => live && setStatus(next))
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

  /** One write at a time; `busy` names what is saving. True when it succeeded. */
  async function write(busy: string, path: string, body: unknown): Promise<boolean> {
    if (saving !== null) return false;
    setSaving(busy);
    setError(null);
    try {
      setStatus(await call(path, body));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setSaving(null);
    }
  }

  if (status === null && error === null) return null;
  const rows = status?.sources ?? null;
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
        <div className="window-shadow absolute right-0 top-full z-20 mt-1 max-h-[70vh] w-64 overflow-y-auto rounded-lg border border-grid bg-panel py-1">
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
              onClick={() => void write(row.id, "", { source: row.id, enabled: !row.enabled })}
              title={row.about}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-paper disabled:cursor-wait"
            >
              <Tile id={row.id} size={16} dim={!row.enabled} />
              <span className={"flex-1 text-[12.5px] " + (row.enabled ? "text-ink" : "text-stale")}>{row.name}</span>
              <Switch on={row.enabled} busy={saving === row.id} />
            </button>
          ))}
          {status !== null && status.keys.length > 0 && (
            <>
              <div className="font-mono-heading mt-1 border-t border-grid px-3 pb-1 pt-2 text-[10px] uppercase tracking-[.05em] text-stale">
                Keys
              </div>
              {status.keys.map((row) => (
                <KeyItem
                  key={row.name}
                  row={row}
                  busy={saving !== null}
                  onSave={(value) => write(row.name, "/key", { name: row.name, value })}
                />
              ))}
            </>
          )}
          {error !== null && <p className="px-3 py-1 text-[11px] text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
