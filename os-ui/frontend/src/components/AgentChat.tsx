import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { Badge } from "./Badge";
import type { BadgeTone } from "./Badge";
import { PaperSources } from "./PaperSources";
import { getPreferredAgent, setPreferredAgent } from "../lib/agentPref";
import type { AgentId } from "../lib/agentPref";
import { relativeTime, stripInlineMarkdown } from "../lib/format";

interface Props {
  /** "" for the repository root (the root agent); "projects-folder/<Name>" for a project's agent. */
  cwd: string;
  heading: string;
  intro: ReactNode;
  examples: string[];
}

interface SessionRow {
  id: string;
  agent: AgentId;
  mode: string;
  turns: number;
  status: string;
  updated: string | null;
  first_prompt: string;
}

interface TraceEvent {
  type: string;
  turn?: number;
  time?: string;
  text?: string;
  name?: string;
  input?: unknown;
  ok?: boolean;
  output?: string;
  message?: string;
  request?: string;
  result?: string | null;
  error?: string;
  model?: string | null;
  auth?: string;
  duration_ms?: number | null;
}

interface Session {
  id: string;
  meta: { agent: AgentId; mode: string; model: string | null; created: string };
  events: TraceEvent[];
  status: string;
}

type Mode = "read-only" | "workspace" | "full";

const TOKEN_KEY = "osui.token";
const AGENT_LABEL: Record<AgentId, string> = { claude: "Claude Code", codex: "Codex" };
const MODE_HINT: Record<Mode, string> = {
  "read-only": "questions and reviews; no edits",
  workspace: "file edits only; no shell commands",
  full: "edits and commands",
};
const STATUS_TONE: Record<string, BadgeTone> = {
  running: "signal",
  ok: "ok",
  failed: "warn",
  stopped: "warn",
  new: "mute",
};

class TokenError extends Error {}

function readToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/chat${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "X-OS-UI-Token": readToken(),
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (res.status === 401) throw new TokenError("token required");
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

function oneLine(value: unknown, limit = 160): string {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > limit ? flat.slice(0, limit - 1) + "…" : flat;
}

/**
 * A conversation with one agent in one directory. Every message is one
 * os-harness turn there, on the human's own login: at the repository root
 * this is the root agent (GOAL.md H2), which reads AGENTS.md and follows
 * project-dispatch; inside a project it is that project's agent, which the
 * human can steer directly. The component only shows what the trace records,
 * polled while a turn runs; tool calls stay visible so the human can see
 * what was done. Sessions the root agent dispatched into a project appear in
 * that project's list too, and can be resumed with feedback from here.
 */
export function AgentChat({ cwd, heading, intro, examples }: Props) {
  const ids = useId();
  const [token, setToken] = useState(readToken);
  const [needToken, setNeedToken] = useState(readToken() === "");
  const [agent, setAgent] = useState<AgentId>(getPreferredAgent);
  const [mode, setMode] = useState<Mode>("full");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  // A different directory is a different conversation list.
  useEffect(() => {
    setActiveId(null);
    setSession(null);
    setSessions([]);
    setError(null);
  }, [cwd]);

  const fail = useCallback((e: unknown) => {
    if (e instanceof TokenError) {
      setNeedToken(true);
      return;
    }
    setError(e instanceof Error ? e.message : String(e));
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const data = await api<{ sessions: SessionRow[] }>(`/sessions?cwd=${encodeURIComponent(cwd)}`);
      setSessions([...data.sessions].reverse());
      setNeedToken(false);
    } catch (e) {
      fail(e);
    }
  }, [cwd, fail]);

  const loadSession = useCallback(
    async (id: string) => {
      try {
        setSession(await api<Session>(`/session?id=${encodeURIComponent(id)}`));
      } catch (e) {
        fail(e);
      }
    },
    [fail],
  );

  // Session list: refresh on a slow cadence; the active trace: fast while running.
  useEffect(() => {
    if (needToken) return;
    void loadSessions();
    const timer = window.setInterval(() => void loadSessions(), 8000);
    return () => window.clearInterval(timer);
  }, [needToken, loadSessions]);

  useEffect(() => {
    if (needToken || activeId === null) return;
    void loadSession(activeId);
    const running = session?.status === "running";
    const timer = window.setInterval(() => void loadSession(activeId), running ? 2000 : 8000);
    return () => window.clearInterval(timer);
  }, [needToken, activeId, session?.status, loadSession]);

  useEffect(() => {
    const el = logRef.current;
    if (el !== null) el.scrollTop = el.scrollHeight;
  }, [session?.events.length]);

  function saveToken(e: FormEvent) {
    e.preventDefault();
    try {
      localStorage.setItem(TOKEN_KEY, token.trim());
    } catch {
      // storage unavailable: the in-memory value still works for this page
    }
    setNeedToken(false);
    setError(null);
    void loadSessions();
  }

  async function sendMessage() {
    const text = draft.trim();
    if (text === "" || busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ session: string }>("/send", {
        text,
        agent: session?.meta.agent ?? agent,
        mode,
        session: activeId,
        cwd,
      });
      setDraft("");
      setActiveId(data.session);
      await loadSession(data.session);
      await loadSessions();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function stopTurn() {
    if (activeId === null) return;
    setError(null);
    try {
      await api("/stop", { session: activeId });
      await loadSession(activeId);
      await loadSessions();
    } catch (e) {
      fail(e);
    }
  }

  function onComposerKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  const status = session?.status ?? "new";
  const running = status === "running";
  const activeAgent = session?.meta.agent ?? agent;
  const selectClass =
    "rounded border border-grid bg-panel px-1.5 py-[2px] font-mono-heading text-[11.5px] text-ink";

  return (
    <div className="flex h-full min-h-0 bg-paper">
      <aside className="flex w-56 shrink-0 flex-col border-r border-grid bg-panel">
        <div className="flex items-center justify-between border-b border-grid px-3 py-2">
          <span className="font-mono-heading text-[10px] uppercase tracking-[.05em] text-stale">Conversations</span>
          <button
            type="button"
            onClick={() => {
              setActiveId(null);
              setSession(null);
              setError(null);
            }}
            className="font-mono-heading rounded border border-grid px-2 py-[2px] text-[11px] text-ink hover:bg-paper"
          >
            + New
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {sessions.length === 0 && (
            <p className="px-3 py-3 text-[11.5px] text-stale">No conversations here yet.</p>
          )}
          {sessions.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => {
                setActiveId(row.id);
                setError(null);
              }}
              aria-pressed={row.id === activeId}
              className={
                "block w-full border-b border-grid px-3 py-2 text-left hover:bg-paper " +
                (row.id === activeId ? "bg-paper" : "")
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono-heading text-[10.5px] text-ink-soft">
                  {AGENT_LABEL[row.agent] ?? row.agent} · {row.mode}
                </span>
                <Badge tone={STATUS_TONE[row.status] ?? "mute"}>{row.status}</Badge>
              </div>
              <div className="mt-0.5 truncate text-[12px] text-ink">{row.first_prompt || "(empty)"}</div>
              <div className="font-mono-heading text-[10px] text-stale">
                {row.turns} turn{row.turns === 1 ? "" : "s"} · {row.updated ? relativeTime(row.updated) : ""}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-grid bg-panel px-4 py-2">
          <span className="font-mono-heading text-[12px] font-medium text-ink">{heading}</span>
          {session === null ? (
            <>
              <label className="flex items-center gap-1.5 text-[11.5px] text-ink-soft">
                via
                <select
                  value={agent}
                  onChange={(e) => {
                    const next = e.target.value as AgentId;
                    setAgent(next);
                    setPreferredAgent(next);
                  }}
                  className={selectClass}
                >
                  <option value="claude">Claude Code</option>
                  <option value="codex">Codex</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-[11.5px] text-ink-soft" title={MODE_HINT[mode]}>
                mode
                <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className={selectClass}>
                  <option value="full">full</option>
                  <option value="workspace">workspace</option>
                  <option value="read-only">read-only</option>
                </select>
              </label>
            </>
          ) : (
            <span className="font-mono-heading text-[11px] text-ink-soft">
              {AGENT_LABEL[session.meta.agent] ?? session.meta.agent}
              {session.meta.model ? ` · ${session.meta.model}` : ""} · {session.meta.mode}
            </span>
          )}
          <span className="ml-auto flex items-center gap-2">
            {!needToken && <PaperSources token={readToken()} />}
            <Badge tone={STATUS_TONE[status] ?? "mute"}>{status}</Badge>
            {running && (
              <button
                type="button"
                onClick={() => void stopTurn()}
                className="font-mono-heading rounded border border-grid px-2 py-[2px] text-[11px] text-danger hover:bg-paper"
              >
                Stop
              </button>
            )}
          </span>
        </header>

        {needToken ? (
          <form onSubmit={saveToken} className="m-4 max-w-md rounded border border-grid bg-panel p-4">
            <p className="text-[12.5px] text-ink">
              This window talks to the agent through the local dev server. Paste the
              <b> Root Agent token</b> that <code className="font-mono-heading">./os-ui/start.sh</code> printed.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                id={`${ids}-token`}
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="token"
                className="min-w-0 flex-1 rounded border border-grid bg-paper px-2 py-1 font-mono-heading text-[12px] text-ink"
              />
              <button type="submit" className="rounded border border-ink bg-ink px-3 py-1 font-mono-heading text-[12px] text-white">
                Save
              </button>
            </div>
          </form>
        ) : (
          <>
            <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {session === null ? (
                <div className="mx-auto max-w-lg py-8 text-[12.5px] text-ink-soft">
                  <p className="text-ink">{intro}</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5">
                    {examples.map((example) => (
                      <li key={example}>{example}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <ol className="space-y-2">
                  {session.events.map((ev, i) => (
                    <EventRow key={i} ev={ev} />
                  ))}
                  {running && <li className="font-mono-heading text-[11px] text-signal">working…</li>}
                </ol>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendMessage();
              }}
              className="border-t border-grid bg-panel px-4 py-3"
            >
              {error && <p className="mb-2 text-[11.5px] text-danger">{error}</p>}
              <div className="flex items-end gap-2">
                <textarea
                  id={`${ids}-composer`}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onComposerKey}
                  rows={2}
                  disabled={running || busy}
                  placeholder={
                    running
                      ? "The agent is working; wait for it to finish or stop it."
                      : `Message ${AGENT_LABEL[activeAgent]} (Enter to send, Shift+Enter for a new line)`
                  }
                  className="min-h-[44px] flex-1 resize-y rounded border border-grid bg-paper px-2.5 py-1.5 text-[13px] text-ink disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={running || busy || draft.trim() === ""}
                  className="font-mono-heading rounded border border-ink bg-ink px-3 py-1.5 text-[12px] text-white disabled:opacity-40"
                >
                  {busy ? "Sending…" : "Send"}
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

function EventRow({ ev }: { ev: TraceEvent }) {
  switch (ev.type) {
    case "prompt":
      return (
        <li className="flex justify-end">
          <div className="max-w-[85%] whitespace-pre-wrap rounded-lg border border-ink bg-ink px-3 py-2 text-[13px] text-white">
            {ev.text}
          </div>
        </li>
      );
    case "text":
      return (
        <li className="flex">
          <div className="max-w-[85%] whitespace-pre-wrap rounded-lg border border-grid bg-panel px-3 py-2 text-[13px] text-ink">
            {stripInlineMarkdown(ev.text ?? "")}
          </div>
        </li>
      );
    case "tool":
      return (
        <li className="font-mono-heading pl-2 text-[11px] text-ink-soft">
          → {ev.name}: {oneLine(ev.input)}
        </li>
      );
    case "tool_result":
      return (
        <li className="pl-2">
          <details className="font-mono-heading text-[11px] text-stale">
            <summary className="cursor-pointer">
              {ev.ok ? "← ok" : <span className="text-warn">← error</span>}: {oneLine(ev.output, 100)}
            </summary>
            <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded border border-grid bg-panel p-2 text-[10.5px] text-ink-soft">
              {ev.output}
            </pre>
          </details>
        </li>
      );
    case "warning":
      return <li className="font-mono-heading pl-2 text-[11px] text-warn">! {ev.message}</li>;
    case "declined":
      return <li className="font-mono-heading pl-2 text-[11px] text-warn">× declined {ev.request}</li>;
    case "started":
      return (
        <li className="font-mono-heading pl-2 text-[10.5px] text-stale">
          {ev.model ?? "model ?"} · {ev.auth ?? "auth ?"}
        </li>
      );
    case "done":
      return ev.ok ? (
        <li className="font-mono-heading pl-2 text-[10.5px] text-verify">
          done{typeof ev.duration_ms === "number" ? ` · ${(ev.duration_ms / 1000).toFixed(1)} s` : ""}
        </li>
      ) : (
        <li className="font-mono-heading pl-2 text-[11px] text-danger">failed: {ev.error}</li>
      );
    default:
      return null;
  }
}
