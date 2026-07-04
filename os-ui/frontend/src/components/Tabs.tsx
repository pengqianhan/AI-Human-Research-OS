import { useRef } from "react";
import type { KeyboardEvent } from "react";

export interface TabDef {
  id: string;
  label: string;
  controls: string;
}

interface Props {
  tabs: TabDef[];
  activeId: string;
  onSelect: (id: string) => void;
}

/**
 * Accessible tab list: role=tablist/tab, aria-selected, aria-controls, and a
 * roving tabindex with Left/Right arrow-key navigation — mirrors the
 * behavior implemented in mockup.html's <script> block.
 */
export function Tabs({ tabs, activeId, onSelect }: Props) {
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const ids = tabs.map((t) => t.id);
    const activeElId = (document.activeElement as HTMLElement | null)?.dataset.tabId;
    const i = ids.indexOf(activeElId ?? activeId);
    if (i < 0) return;
    e.preventDefault();
    const nextIndex = (i + (e.key === "ArrowRight" ? 1 : ids.length - 1)) % ids.length;
    const nextId = ids[nextIndex] as string;
    onSelect(nextId);
    btnRefs.current[nextId]?.focus();
  }

  return (
    <nav className="mx-auto max-w-[1080px] px-6">
      <div
        className="tablist flex gap-0.5"
        role="tablist"
        aria-label="页面切换"
        onKeyDown={handleKeyDown}
      >
        {tabs.map((t) => {
          const selected = t.id === activeId;
          return (
            <button
              key={t.id}
              ref={(el) => {
                btnRefs.current[t.id] = el;
              }}
              data-tab-id={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-controls={t.controls}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(t.id)}
              className={
                "font-mono-heading -mb-0.5 border-b-[3px] px-[18px] py-[9px] text-[13px] " +
                (selected
                  ? "border-signal font-semibold text-ink"
                  : "border-transparent text-ink-soft hover:text-ink")
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
