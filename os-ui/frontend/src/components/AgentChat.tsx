import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { Badge } from "./Badge";
import type { BadgeTone } from "./Badge";
import { PaperSources } from "./PaperSources";
import { getPreferredAgent, setPreferredAgent } from "../lib/agentPref";
import type { AgentId } from "../lib/agentPref";
import { relativeTime, stripInlineMarkdown } from "../lib/format";
import { desktop } from "../lib/desktop";
import { MESSAGE_MAX, messageWithReferences, referenceKey, referenceText } from "../plugins/select";
import type { Reference } from "../plugins/select";
import { Icon } from "../shell/icons";

interface Props {
  /** "" for the repository root (the root agent); "projects-folder/<Name>" for a project's agent. */
  cwd: string;
  /** Names the conversation: shown in the header unless headingVisible is false, and always its accessible name. */
  heading: string;
  /** Hide the heading when the surrounding card already shows a title. */
  headingVisible?: boolean;
  intro: ReactNode;
  examples: string[];
  /**
   * "split": the conversation list is a column on the left (wide places:
   * Home, the retired desktop window). "stacked": the list opens over the
   * thread from a header button (the workspace's narrow conversation pane).
   */
  layout?: "split" | "stacked";
  /** Home's closed prompt bar: only the latest conversation's line and the composer. */
  collapsed?: boolean;
  /** Asks the parent to open the full conversation (after sending from the bar, or "Continue"). */
  onExpand?: () => void;
  /**
   * Reference chips above the input (a project view's "Ask the agent about
   * this"). Send puts them before the typed text as messageWithReferences
   * writes them, which each chip's tooltip shows; they never send by themselves.
   */
  references?: readonly Reference[];
  onRemoveReference?: (index: number) => void;
  /** Called once a message carrying the references was sent. */
  onReferencesSent?: () => void;
  /** Each new value puts the cursor in the input (the conversation list closes if it is open). */
  focusRequest?: number;
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
  // The desktop client hands its per-launch token over through the bridge.
  if (desktop !== null) return desktop.token;
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

const COMPOSER_MAX_PX = 220;

/**
 * A conversation with one agent in one directory. Every message is one
 * os-harness turn there, on the human's own login: at the repository root
 * this is the root agent (GOAL.md H2), which reads AGENTS.md and follows
 * project-dispatch; inside a project it is that project's agent, which the
 * human can steer directly. The component only shows what the trace records,
 * polled while a turn runs; tool calls stay visible so the human can see
 * what was done. Sessions the root agent dispatched into a project appear in
 * that project's list too, and can be resumed with feedback from here.
 *
 * The same instance serves every presentation (collapsed bar, split, or
 * stacked), so the draft, the selected conversation, and the polling of a
 * running turn survive opening and closing it.
 */
export function AgentChat({
  cwd,
  heading,
  headingVisible = true,
  intro,
  examples,
  layout = "split",
  collapsed = false,
  onExpand,
  references = [],
  onRemoveReference,
  onReferencesSent,
  focusRequest = 0,
}: Props) {
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
  const [listOpen, setListOpen] = useState(false);
  /** Which reference chip shows its text under the chips. */
  // Kept by the reference itself, not its place, so removing another chip never opens a different one.
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  // A chip just added shows its text at once: what Send passes is on screen
  // before Send, not only behind a click. The newest opens; the one before closes.
  const added = useRef(references.length);
  useEffect(() => {
    const newest = references[references.length - 1];
    if (references.length > added.current && newest !== undefined) setPreviewKey(referenceKey(newest));
    added.current = references.length;
  }, [references]);
  const previewed = references.find((r) => referenceKey(r) === previewKey) ?? null;
  const logRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

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
  }, [session?.events.length, collapsed, listOpen]);

  // A reference was added: show the composer and put the cursor in it.
  useEffect(() => {
    if (focusRequest === 0) return;
    setListOpen(false);
    window.requestAnimationFrame(() => composerRef.current?.focus());
  }, [focusRequest]);

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

  function newConversation() {
    setActiveId(null);
    setSession(null);
    setError(null);
    setListOpen(false);
  }

  function openConversation(id: string) {
    setActiveId(id);
    setError(null);
    setListOpen(false);
  }

  /** From the closed bar: open the full conversation on this session and put the cursor in its composer. */
  function expandOn(id: string) {
    openConversation(id);
    onExpand?.();
    window.requestAnimationFrame(() => composerRef.current?.focus());
  }

  function fitComposer() {
    const el = composerRef.current;
    if (el === null) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_PX)}px`;
  }

  async function sendMessage() {
    const text = messageWithReferences(references, draft);
    if (text === "" || busy) return;
    if (text.length > MESSAGE_MAX) {
      setError(`The message and its references are ${text.length.toLocaleString("en-US")} characters, more than the ${MESSAGE_MAX.toLocaleString("en-US")} an agent takes; remove a reference or shorten the text.`);
      return;
    }
    const carried = references.length > 0;
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
      if (carried) onReferencesSent?.();
      window.requestAnimationFrame(fitComposer);
      setActiveId(data.session);
      setListOpen(false);
      onExpand?.();
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
  const selectClass = "rounded-[7px] border border-line2 bg-card px-1.5 py-[3px] text-[12px] text-ink";

  const tokenForm = (
    <form onSubmit={saveToken} className="card-flat m-4 max-w-md p-4">
      <p className="text-[13px] text-ink">
        This conversation talks to the agent through the local dev server. Paste the
        <b> Root Agent token</b> that <code>./os-ui/start.sh</code> printed.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          id={`${ids}-token`}
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="token"
          aria-label="Root Agent token"
          className="font-mono-heading min-w-0 flex-1 rounded-[8px] border border-line2 bg-paper px-2.5 py-1.5 text-[12.5px] text-ink"
        />
        <button type="submit" className="btn btn-primary">
          Save
        </button>
      </div>
    </form>
  );

  const composer = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void sendMessage();
      }}
      className={collapsed ? "" : "px-3 pb-3 pt-2"}
    >
      {error && <p className="mb-2 text-[12px] text-danger">{error}</p>}
      <div className="flex flex-col gap-1.5 rounded-[12px] bg-paper py-2 pl-[13px] pr-2 shadow-[inset_0_0_0_1px_var(--line2)] focus-within:shadow-[inset_0_0_0_1.5px_var(--accent)]">
        {references.length > 0 && (
          <div className="flex flex-col gap-1">
            <ul aria-label="References" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {references.map((ref, i) => (
                <li
                  key={`${ref.label}\u0000${ref.quote ?? ""}`}
                  data-reference
                  // Exactly the lines Send puts before the typed text.
                  title={referenceText(ref)}
                  className="inline-flex min-w-0 max-w-full items-center gap-[5px] rounded-[7px] bg-accent-soft py-[3px] pl-2 pr-[3px] font-mono text-[12px] leading-[1.3] text-accent-ink"
                >
                  <button
                    type="button"
                    aria-expanded={referenceKey(ref) === previewKey}
                    aria-controls={`${ids}-preview`}
                    aria-label={`Show what will be sent for ${ref.label}`}
                    onClick={() => setPreviewKey(referenceKey(ref) === previewKey ? null : referenceKey(ref))}
                    className="inline-flex min-w-0 items-center gap-[5px] rounded-[5px] hover:underline"
                  >
                    <Icon name="quote" size={14} />
                    <span className="min-w-0 truncate">{ref.label}</span>
                    {ref.quote !== undefined && (
                      <span className="shrink-0 font-sans text-[11px] opacity-75">
                        · {ref.quote.split("\n").length} line{ref.quote.split("\n").length === 1 ? "" : "s"}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove reference ${ref.label}`}
                    title="Remove reference"
                    onClick={() => onRemoveReference?.(i)}
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-[5px] hover:bg-[rgba(30,90,86,.14)]"
                  >
                    <Icon name="x" size={12} />
                  </button>
                </li>
              ))}
            </ul>
            {previewed !== null ? (
              <div id={`${ids}-preview`} role="region" aria-label="What will be sent" className="rounded-[8px] bg-card px-2.5 py-2 shadow-[inset_0_0_0_1px_var(--line)]">
                <p className="m-0 mb-1 text-[11.5px] text-muted">Sent before your message, exactly:</p>
                {/* Plain text, the same string Send passes (referenceText). */}
                <pre data-reference-preview className="m-0 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[11.5px] leading-[1.45] text-ink">
                  {referenceText(previewed)}
                </pre>
              </div>
            ) : (
              <p className="m-0 text-[11.5px] text-muted">Sent before your message as “About …” lines; click a reference to see exactly what is sent.</p>
            )}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            id={`${ids}-composer`}
            ref={composerRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              fitComposer();
            }}
            onKeyDown={onComposerKey}
            rows={2}
            disabled={running || busy}
            aria-label={`Message ${heading}`}
            placeholder={
              running
                ? "The agent is working; wait for it to finish or stop it."
                : `Message ${AGENT_LABEL[activeAgent]} (Enter to send, Shift+Enter for a new line)`
            }
            className="min-h-[44px] min-w-0 flex-1 resize-none bg-transparent py-0.5 text-[14px] leading-normal text-ink outline-none placeholder:text-faint disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={running || busy || (draft.trim() === "" && references.length === 0)}
            aria-label={busy ? "Sending…" : "Send"}
            title="Send (Enter)"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-accent text-on-accent hover:bg-accent-ink disabled:opacity-40"
          >
            <Icon name="send" size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 text-[11.5px] text-muted">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-tint px-2 py-[2px] font-medium text-accent-ink">
            <span aria-hidden="true" className="h-[6px] w-[6px] rounded-full bg-accent" />
            {AGENT_LABEL[activeAgent]}
          </span>
          <span>{session === null ? `new conversation · ${mode}` : `continues this conversation · ${session.meta.mode}`}</span>
        </div>
      </div>
    </form>
  );

  // ---- Home's closed bar: the latest conversation's line and the composer -------
  if (collapsed) {
    if (needToken) return tokenForm;
    const current = activeId === null ? null : (sessions.find((row) => row.id === activeId) ?? null);
    const latest = current ?? sessions[0] ?? null;
    return (
      <div role="region" aria-label={heading} className="flex flex-col gap-3">
        <p className="m-0 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-serif text-[15.5px] leading-normal text-ink2">
          <b className="label mr-1">{current ? "This conversation" : "Latest conversation"}</b>
          {latest === null ? (
            <span className="text-muted">No conversations here yet.</span>
          ) : (
            <>
              <span className="min-w-0 truncate">{stripInlineMarkdown(latest.first_prompt) || "(empty)"}</span>
              <span className="font-sans text-[12px] text-muted">
                {latest.turns} turn{latest.turns === 1 ? "" : "s"}
                {latest.updated ? ` · ${relativeTime(latest.updated)}` : ""}
              </span>
              <Badge tone={STATUS_TONE[latest.status] ?? "mute"}>{latest.status}</Badge>
              <button
                type="button"
                onClick={() => expandOn(latest.id)}
                className="btn btn-ghost btn-sm font-sans"
              >
                {current ? "Show" : "Continue"}
              </button>
            </>
          )}
        </p>
        {composer}
      </div>
    );
  }

  // ---- The conversation list --------------------------------------------------
  const listId = `${ids}-list`;
  const list = (
    <div id={listId} className="flex min-h-0 flex-1 flex-col">
      {layout === "split" && (
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="label">Conversations</span>
          <button type="button" onClick={newConversation} className="btn btn-sm">
            + New
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
        {sessions.length === 0 && <p className="px-2 py-3 text-[12.5px] text-muted">No conversations here yet.</p>}
        {sessions.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => openConversation(row.id)}
            aria-pressed={row.id === activeId}
            className={"block w-full rounded-[9px] px-2.5 py-2 text-left hover:bg-hover " + (row.id === activeId ? "bg-card shadow-sh1" : "")}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted">
                {AGENT_LABEL[row.agent] ?? row.agent} · {row.mode}
              </span>
              <Badge tone={STATUS_TONE[row.status] ?? "mute"}>{row.status}</Badge>
            </div>
            <div className="mt-0.5 truncate text-[13px] text-ink">{row.first_prompt || "(empty)"}</div>
            <div className="text-[11px] text-muted">
              {row.turns} turn{row.turns === 1 ? "" : "s"} · {row.updated ? relativeTime(row.updated) : ""}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ---- Header: list control, agent and mode, Papers, status, Stop -------------
  const header = (
    <header className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-b border-line px-3.5 py-2">
      {layout === "stacked" && !needToken && (
        <>
          <button type="button" className="btn btn-sm" aria-expanded={listOpen} aria-controls={listId} onClick={() => setListOpen((v) => !v)}>
            Conversations <span className="text-muted">{sessions.length}</span>
            <Icon name="chev-down" size={13} className={listOpen ? "rotate-180" : ""} />
          </button>
          <button type="button" onClick={newConversation} className="btn btn-sm">
            + New
          </button>
        </>
      )}
      {headingVisible && <span className="text-[13px] font-semibold text-ink">{heading}</span>}
      {session === null ? (
        <>
          <label className="flex items-center gap-1.5 text-[12px] text-ink2">
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
          <label className="flex items-center gap-1.5 text-[12px] text-ink2" title={MODE_HINT[mode]}>
            mode
            <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className={selectClass}>
              <option value="full">full</option>
              <option value="workspace">workspace</option>
              <option value="read-only">read-only</option>
            </select>
          </label>
        </>
      ) : (
        <span className="text-[12px] text-ink2">
          {AGENT_LABEL[session.meta.agent] ?? session.meta.agent}
          {session.meta.model ? ` · ${session.meta.model}` : ""} · {session.meta.mode}
        </span>
      )}
      <span className="ml-auto flex items-center gap-2">
        {!needToken && <PaperSources token={readToken()} />}
        <Badge tone={STATUS_TONE[status] ?? "mute"}>{status}</Badge>
        {running && (
          <button type="button" onClick={() => void stopTurn()} className="btn btn-sm btn-danger">
            Stop
          </button>
        )}
      </span>
    </header>
  );

  const thread = (
    <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
      {session === null ? (
        <div className="mx-auto max-w-[60ch] py-6 font-serif text-[15px] leading-relaxed text-ink2">
          <p className="text-ink">{intro}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            {examples.map((example) => (
              <li key={example}>{example}</li>
            ))}
          </ul>
        </div>
      ) : (
        <ol className="mx-auto max-w-[72ch] space-y-2.5">
          {session.events.map((ev, i) => (
            <EventRow key={i} ev={ev} agentLabel={AGENT_LABEL[session.meta.agent] ?? session.meta.agent} previous={session.events[i - 1]?.type} />
          ))}
          {running && <li className="text-[12px] font-medium text-accent">working…</li>}
        </ol>
      )}
    </div>
  );

  return (
    <div role="region" aria-label={heading} className="flex h-full min-h-0 rounded-[inherit] bg-paper">
      {layout === "split" && (
        <aside aria-label="Conversations" className="flex w-60 shrink-0 flex-col rounded-l-[inherit] border-r border-line bg-side">
          {list}
        </aside>
      )}
      <section className="flex min-w-0 flex-1 flex-col">
        {header}
        {needToken ? (
          tokenForm
        ) : layout === "stacked" && listOpen ? (
          list
        ) : (
          <>
            {thread}
            {composer}
          </>
        )}
      </section>
    </div>
  );
}

function EventRow({ ev, agentLabel, previous }: { ev: TraceEvent; agentLabel: string; previous: string | undefined }) {
  switch (ev.type) {
    case "prompt":
      return (
        <li className="text-right">
          <div className="label mb-1">You</div>
          <div className="inline-block max-w-[88%] whitespace-pre-wrap rounded-[13px_13px_4px_13px] bg-bubble px-3 py-2 text-left text-[13.5px] text-ink">
            {ev.text}
          </div>
        </li>
      );
    case "text":
      return (
        <li>
          {previous !== "text" && <div className="label mb-1">{agentLabel}</div>}
          <div className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-ink">{stripInlineMarkdown(ev.text ?? "")}</div>
        </li>
      );
    case "tool":
      return (
        <li className="font-mono-heading rounded-[8px] bg-mute-soft px-2.5 py-1.5 text-[11.5px] text-muted">
          → {ev.name}: {oneLine(ev.input)}
        </li>
      );
    case "tool_result":
      return (
        <li className="pl-2">
          <details className="font-mono-heading text-[11px] text-muted">
            <summary className="cursor-pointer">
              {ev.ok ? "← ok" : <span className="text-warn">← error</span>}: {oneLine(ev.output, 100)}
            </summary>
            <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded-[8px] bg-card p-2 text-[10.5px] text-ink2 shadow-[inset_0_0_0_1px_var(--line)]">
              {ev.output}
            </pre>
          </details>
        </li>
      );
    case "warning":
      return <li className="pl-2 text-[12px] text-warn">! {ev.message}</li>;
    case "declined":
      return <li className="pl-2 text-[12px] text-warn">× declined {ev.request}</li>;
    case "started":
      return (
        <li className="font-mono-heading pl-2 text-[10.5px] text-faint">
          {ev.model ?? "model ?"} · {ev.auth ?? "auth ?"}
        </li>
      );
    case "done":
      return ev.ok ? (
        <li className="pl-2 text-[11.5px] text-accent">done{typeof ev.duration_ms === "number" ? ` · ${(ev.duration_ms / 1000).toFixed(1)} s` : ""}</li>
      ) : (
        <li className="pl-2 text-[12px] text-danger">failed: {ev.error}</li>
      );
    default:
      return null;
  }
}
