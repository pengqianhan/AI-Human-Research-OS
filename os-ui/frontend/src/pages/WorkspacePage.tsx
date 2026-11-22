import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { OsState, Project } from "../types";
import { AgentChat } from "../components/AgentChat";
import { ProjectOverview } from "../components/ProjectOverview";
import { PROJECT_EXAMPLES, projectIntro } from "../lib/agentCopy";
import { LIVE } from "../lib/mode";
import { viewSrc } from "../plugins/pages";
import type { PluginPage } from "../plugins/pages";
import { usePlugins } from "../plugins/registry";
import { addReference, MAX_REFERENCES, readSelect, selectGate } from "../plugins/select";
import type { Reference } from "../plugins/select";
import { Icon } from "../shell/icons";
import { workspaceTabs } from "../shell/layoutState";
import type { ViewTab } from "../shell/layoutState";
import { useToast } from "../shell/Toast";

interface Props {
  state: OsState;
  project: Project;
  tab: ViewTab;
  onTab: (tab: ViewTab) => void;
  conversationCollapsed: boolean;
  onConversationCollapsed: (collapsed: boolean) => void;
  onBack: () => void;
  /** Whether the workspace is the screen shown; the Shell keeps it mounted, hidden, once visited. */
  visible: boolean;
}

/**
 * One project's workspace (mockup C): its conversation on the left, which
 * collapses to a thin strip, and its views on the right. Overview is today's
 * project overview; Code and Paper are the code-view and paper-view plugins'
 * pages, each framed on its own origin (each plugin project view gets a tab,
 * src/shell/layoutState.ts). A view's frame, once opened, stays loaded while
 * another tab is shown, so its place is kept.
 */
export function WorkspacePage({ state, project, tab, onTab, conversationCollapsed, onConversationCollapsed, onBack, visible }: Props) {
  const ids = useId();
  const toast = useToast();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const entry = state.portfolio.find((p) => p.project === project.name) ?? null;
  const stage = entry?.stage || project.snapshot.stage;
  const priority = entry?.priority || project.snapshot.priority;
  const owner = entry?.owner || project.snapshot.owner;
  const convId = `${ids}-conversation`;
  const collapseRef = useRef<HTMLButtonElement | null>(null);
  const stripRef = useRef<HTMLButtonElement | null>(null);
  const moveFocus = useRef(false);
  const { pages } = usePlugins();
  const views = pages.filter((p) => p.slot === "project");
  const TABS = workspaceTabs(views);
  const activeView = views.find((v) => v.key === tab) ?? null;
  // The plugin views opened so far; each frame stays mounted, hidden while another tab is shown.
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set(activeView === null ? [] : [activeView.key]));
  useEffect(() => {
    if (activeView !== null && !opened.has(activeView.key)) setOpened(new Set([...opened, activeView.key]));
  }, [activeView, opened]);

  // What the active view reports as selected (the ask bar), and the references
  // added to this project's composer. Both belong to this project: the page is
  // mounted once per project (keyed by its name), so another project starts empty.
  const frames = useRef(new Map<string, HTMLIFrameElement>());
  const [selection, setSelection] = useState<Reference | null>(null);
  const [references, setReferences] = useState<Reference[]>([]);
  const [focusRequest, setFocusRequest] = useState(0);
  // A selection counts only while this page is shown, its view's tab selected,
  // the Ask button not held down, and at most a few a second (selectGate).
  const gate = useRef(selectGate()).current;
  const now = useRef({ visible, tab });
  now.current = { visible, tab };
  /** The reference the bar showed when the pointer went down on Ask; what Ask adds. */
  const held = useRef<Reference | null>(null);

  /** Hides the ask bar; `tellView` also clears the highlight in the view that reported it. */
  function clearSelection(tellView: boolean) {
    setSelection(null);
    const page = activeView;
    const frame = page === null ? undefined : frames.current.get(page.key);
    if (tellView && page?.origin && frame?.contentWindow) frame.contentWindow.postMessage({ type: "os.select.clear" }, page.origin);
  }

  // Only the active view's frame, at its own origin, may report a selection (src/plugins/select.ts).
  useEffect(() => {
    setSelection(null);
    if (activeView === null) return;
    const onMessage = (event: MessageEvent) => {
      const frameWindow = frames.current.get(activeView.key)?.contentWindow ?? null;
      const message = readSelect(event, activeView, frameWindow);
      if (message === null || frameWindow === null) return;
      const verdict = gate(frameWindow, { visible: now.current.visible, tabSelected: now.current.tab === activeView.key, held: held.current !== null });
      if (verdict === "over") setSelection(null);
      if (verdict !== "accept") return;
      setSelection(message.kind === "select" ? message.reference : null);
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      // Leaving the view (another tab): its selection goes with the ask bar.
      if (activeView.origin !== null) frames.current.get(activeView.key)?.contentWindow?.postMessage({ type: "os.select.clear" }, activeView.origin);
    };
  }, [activeView]);

  useEffect(() => {
    if (selection === null) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") clearSelection(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /** "Ask the agent about this": a reference chip in the composer, the conversation open, the cursor in its input. Nothing is sent. */
  function ask(reference: Reference | null) {
    if (reference === null) return;
    const next = addReference(references, reference);
    if (next === null) {
      toast(`A message carries at most ${MAX_REFERENCES} references; remove one first.`);
      return;
    }
    setReferences(next);
    clearSelection(true);
    if (conversationCollapsed) onConversationCollapsed(false);
    setFocusRequest((n) => n + 1);
  }

  // Collapsing hides the focused button and opening removes the strip; hand
  // the keyboard focus to the control that takes their place.
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    (conversationCollapsed ? stripRef.current : collapseRef.current)?.focus();
  }, [conversationCollapsed]);

  function setCollapsed(collapsed: boolean) {
    moveFocus.current = true;
    onConversationCollapsed(collapsed);
  }

  /** Arrow keys move between tabs (disabled ones included, so their badge can be read); Enter or Space selects. */
  function onTabKey(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = TABS.length - 1;
    const next =
      e.key === "ArrowRight" ? (index === last ? 0 : index + 1) : e.key === "ArrowLeft" ? (index === 0 ? last : index - 1) : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (next === null) return;
    e.preventDefault();
    tabRefs.current[next]?.focus();
  }

  const selectedIndex = TABS.findIndex((t) => t.id === tab);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex min-w-0 shrink-0 flex-wrap items-center gap-3 px-[22px] pb-3 pt-[13px]">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-muted">
          <button type="button" onClick={onBack} className="rounded-[5px] px-1 py-0.5 hover:bg-accent-tint hover:text-accent">
            Projects
          </button>
          <Icon name="chev-right" size={14} />
        </nav>
        <h1 className="mx-0.5 font-serif text-[22px] font-medium leading-tight" tabIndex={-1} data-page-title>
          {project.name}
        </h1>
        <span className="pill">Stage · {stage ?? "not filled in"}</span>
        {priority && <span className="pill pill-neutral">{priority}</span>}
        <span className="ml-auto flex min-w-0 items-center gap-2.5">
          <span className="font-mono-heading truncate text-[11.5px] text-muted">projects-folder/{project.name}</span>
          {owner && <span className="pill pill-neutral">owner {owner}</span>}
        </span>
      </header>

      <div
        className={
          "grid min-h-0 flex-1 gap-3.5 px-3.5 pb-3.5 " +
          // the conversation narrows from 360px toward 300px on small windows, so the views keep room
          (conversationCollapsed ? "grid-cols-[44px_minmax(0,1fr)]" : "grid-cols-[clamp(300px,28vw,360px)_minmax(0,1fr)]")
        }
      >
        <aside aria-label="Project conversation" className="card flex min-h-0 min-w-0 flex-col">
          <div id={convId} hidden={conversationCollapsed} className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center gap-2 pb-2 pl-4 pr-2.5 pt-3">
              <h2 className="min-w-0 flex-1 text-[13.5px] font-semibold">Project conversation</h2>
              <button
                ref={collapseRef}
                type="button"
                className="icon-btn"
                aria-expanded={true}
                aria-controls={convId}
                aria-label="Collapse conversation"
                title="Collapse conversation"
                onClick={() => setCollapsed(true)}
              >
                <Icon name="panel" />
              </button>
            </div>
            {LIVE ? (
              <div className="mx-2.5 mb-2.5 min-h-0 flex-1 rounded-[11px] shadow-[inset_0_0_0_1px_var(--line)]">
                <AgentChat
                  cwd={`projects-folder/${project.name}`}
                  heading={`${project.name} agent`}
                  headingVisible={false}
                  intro={projectIntro(project.name)}
                  examples={PROJECT_EXAMPLES}
                  layout="stacked"
                  references={references}
                  onRemoveReference={(i) => setReferences(references.filter((_, j) => j !== i))}
                  onReferencesSent={() => setReferences([])}
                  focusRequest={focusRequest}
                />
              </div>
            ) : (
              <p className="px-4 pb-4 font-serif text-[14.5px] text-ink2">
                Project conversations run in the desktop app or with <code>./os-ui/start.sh</code>; this published copy is view only.
              </p>
            )}
          </div>
          {conversationCollapsed && (
            <button
              ref={stripRef}
              type="button"
              aria-expanded={false}
              aria-controls={convId}
              aria-label="Open conversation"
              title="Open conversation"
              onClick={() => setCollapsed(false)}
              className="flex h-full w-full flex-col items-center gap-3 rounded-card py-3 text-ink2 hover:bg-accent-tint"
            >
              <Icon name="panel-open" />
              {references.length > 0 && (
                <span className="min-w-5 rounded-full bg-accent px-[5px] text-center text-[11px] font-bold leading-5 text-on-accent" title="References waiting in the composer">
                  {references.length}
                </span>
              )}
              <span className="rotate-180 text-[12.5px] font-semibold tracking-[.02em] [writing-mode:vertical-rl]">Project conversation</span>
            </button>
          )}
        </aside>

        <div className="views-pane card relative flex min-h-0 min-w-0 flex-col">
          <div role="tablist" aria-label="Project views" className="flex shrink-0 items-end gap-0.5 overflow-x-auto px-3.5 pt-1.5 shadow-[inset_0_-1px_0_var(--line)] [scrollbar-width:none]">
            {TABS.map((t, i) => {
              const selected = t.id !== null && t.id === tab;
              const disabled = t.id === null;
              return (
                <button
                  key={t.label}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${ids}-tab-${t.label}`}
                  aria-selected={selected}
                  aria-controls={selected ? `${ids}-panel` : undefined}
                  aria-disabled={disabled || undefined}
                  aria-label={disabled ? `${t.label}, step 2` : undefined}
                  tabIndex={i === (selectedIndex < 0 ? 0 : selectedIndex) ? 0 : -1}
                  title={t.later}
                  onKeyDown={(e) => onTabKey(e, i)}
                  onClick={() => (t.id === null ? toast(t.later ?? "") : onTab(t.id))}
                  className={
                    "tab-btn inline-flex shrink-0 items-center gap-[7px] whitespace-nowrap rounded-t-[6px] border-b-2 px-2.5 pb-[11px] pt-2.5 text-[13.5px] font-medium focus-visible:outline-offset-[-2px] " +
                    (selected ? "border-accent text-ink" : disabled ? "cursor-not-allowed border-transparent text-faint" : "border-transparent text-ink2 hover:text-ink")
                  }
                >
                  {t.label}
                  {disabled && <span className="step-badge tab-step">step 2</span>}
                </button>
              );
            })}
            <span className="tab-lock mb-1 ml-auto inline-flex shrink-0 items-center gap-1.5 self-center whitespace-nowrap pl-2 text-[12px] text-muted" title="These views only read the project's files">
              <Icon name="lock" size={14} />
              <span className="tab-note">Read-only</span>
            </span>
          </div>

          <div role="tabpanel" id={`${ids}-panel`} aria-labelledby={`${ids}-tab-${TABS[selectedIndex]?.label ?? "Overview"}`}
            // focusable, so the arrow keys scroll it even when it holds no control (Overview); a view's frame takes the focus itself
            tabIndex={activeView === null ? 0 : -1}
            className={"relative min-h-0 flex-1 focus-visible:outline-offset-[-2px] " + (activeView === null ? "overflow-y-auto" : "overflow-hidden")}
          >
            {tab === "overview" && (
              <div className="mx-auto max-w-[880px] px-6 pb-12 pt-5">
                <ProjectOverview project={project} />
              </div>
            )}
            {views
              .filter((v) => opened.has(v.key) || v.key === activeView?.key)
              .map((v) => (
                <ViewFrame
                  key={v.key}
                  page={v}
                  project={project.name}
                  hidden={v.key !== activeView?.key}
                  frameRef={(el) => {
                    if (el === null) frames.current.delete(v.key);
                    else frames.current.set(v.key, el);
                  }}
                  // A reload starts with nothing selected.
                  onLoad={() => v.key === activeView?.key && setSelection(null)}
                />
              ))}
          </div>

          {selection !== null && LIVE && (
            <div
              role="region"
              aria-label="Selection"
              className="absolute bottom-[18px] left-1/2 z-[5] flex max-w-[calc(100%-36px)] -translate-x-1/2 items-center gap-2.5 rounded-full bg-[#22211e] py-1.5 pl-3.5 pr-1.5 text-[13px] text-[#f5efe4] shadow-[0_12px_32px_rgba(30,20,5,.28)]"
            >
              <span className="min-w-0 truncate font-mono text-[12px] opacity-[.82]" title={selection.quote ?? selection.label} data-selection-label>
                {selection.label}
              </span>
              <button
                type="button"
                onPointerDown={() => (held.current = selection)}
                onPointerCancel={() => (held.current = null)}
                onPointerLeave={() => (held.current = null)}
                onClick={() => {
                  const reference = held.current ?? selection;
                  held.current = null;
                  ask(reference);
                }}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[#f5efe4] px-[13px] py-1.5 text-[12.5px] font-semibold text-accent-ink hover:bg-white"
              >
                <Icon name="chat" size={14} />
                Ask the agent about this
              </button>
              <button
                type="button"
                aria-label="Clear selection"
                title="Clear selection"
                onClick={() => clearSelection(true)}
                className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full opacity-70 hover:bg-white/10 hover:opacity-100"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** A plugin's project view for this project, on the plugin's own origin; where this build cannot serve it, a note that it opens in the desktop app. */
function ViewFrame({
  page,
  project,
  hidden,
  frameRef,
  onLoad,
}: {
  page: PluginPage;
  project: string;
  hidden: boolean;
  frameRef: (el: HTMLIFrameElement | null) => void;
  onLoad: () => void;
}) {
  const src = viewSrc(page, project);
  if (src === null) {
    return (
      <div hidden={hidden} className="max-w-[520px] px-8 py-10">
        <h2 className="mb-2 font-serif text-[20px] font-medium text-ink">{page.title}</h2>
        <p className="prose-serif">The {page.title} view opens in the desktop app; this copy cannot serve it.</p>
        <p className="src-note mt-3">
          <code>projects-folder/{project}/</code>
        </p>
      </div>
    );
  }
  return <iframe ref={frameRef} src={src} title={`${page.title} view`} hidden={hidden} onLoad={onLoad} className="absolute inset-0 h-full w-full border-0" />;
}
