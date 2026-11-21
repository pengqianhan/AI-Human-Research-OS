import { useEffect, useId, useRef } from "react";
import type { KeyboardEvent } from "react";
import type { OsState, Project } from "../types";
import { AgentChat } from "../components/AgentChat";
import { ProjectOverview } from "../components/ProjectOverview";
import { PROJECT_EXAMPLES, projectIntro } from "../lib/agentCopy";
import { LIVE } from "../lib/mode";
import { Icon } from "../shell/icons";
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
}

/** The tab row, in mockup C's order. Idea, Skeleton, and Assets arrive in step 2. */
const TABS: { id: ViewTab | null; label: string; later?: string }[] = [
  { id: "overview", label: "Overview" },
  { id: null, label: "Idea", later: "The Idea view arrives in step 2." },
  { id: "code", label: "Code" },
  { id: null, label: "Skeleton", later: "The Skeleton view arrives in step 2." },
  { id: null, label: "Assets", later: "The Assets view arrives in step 2." },
  { id: "paper", label: "Paper" },
];

/**
 * One project's workspace (mockup C): its conversation on the left, which
 * collapses to a thin strip, and its views on the right. Overview is today's
 * project overview; Code and Paper hold a placeholder until their view
 * plugins arrive later in step 1.
 */
export function WorkspacePage({ state, project, tab, onTab, conversationCollapsed, onConversationCollapsed, onBack }: Props) {
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
              <span className="rotate-180 text-[12.5px] font-semibold tracking-[.02em] [writing-mode:vertical-rl]">Project conversation</span>
            </button>
          )}
        </aside>

        <div className="views-pane card flex min-h-0 min-w-0 flex-col">
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
            // focusable, so the arrow keys scroll it even when it holds no control (Code, Paper)
            tabIndex={0}
            className="min-h-0 flex-1 overflow-y-auto focus-visible:outline-offset-[-2px]"
          >
            {tab === "overview" && (
              <div className="mx-auto max-w-[880px] px-6 pb-12 pt-5">
                <ProjectOverview project={project} />
              </div>
            )}
            {tab === "code" && (
              <Placeholder
                title="Code"
                text="This view arrives with the Code view plugin later in step 1. It will show this project's files and its Git changes, read-only."
                path={`projects-folder/${project.name}/`}
              />
            )}
            {tab === "paper" && (
              <Placeholder
                title="Paper"
                text="This view arrives with the Paper view plugin later in step 1. It will render this project's paper from paper/main.tex, read-only."
                path={`projects-folder/${project.name}/paper/`}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Placeholder({ title, text, path }: { title: string; text: string; path: string }) {
  return (
    <div className="max-w-[520px] px-8 py-10">
      <h2 className="mb-2 font-serif text-[20px] font-medium text-ink">{title}</h2>
      <p className="prose-serif">{text}</p>
      <p className="src-note mt-3">
        <code>{path}</code>
      </p>
    </div>
  );
}
