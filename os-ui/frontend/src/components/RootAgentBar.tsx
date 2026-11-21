import { useId } from "react";
import { AgentChat } from "./AgentChat";
import { LIVE } from "../lib/mode";
import { ROOT_EXAMPLES, ROOT_INTRO } from "../lib/agentCopy";
import { Icon } from "../shell/icons";

/**
 * Home's root-agent card (GOAL.md H2: one root agent, visible as soon as the
 * app opens). Closed, it is mockup C's prompt bar: the latest conversation's
 * line and a composer. Open, the same conversation expands in place, with
 * its conversation list. A published build has no chat endpoints, so it
 * says so in one line instead.
 */
export function RootAgentBar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const bodyId = useId();
  return (
    <section className="card mb-[38px] mt-[22px] px-[18px] pb-4 pt-4" aria-label="Root agent">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold">
          <span className="text-accent">
            <Icon name="chat" />
          </span>
          Root agent
        </h2>
        {LIVE && (
          <button type="button" className="btn ml-auto" aria-expanded={open} aria-controls={bodyId} onClick={() => onOpenChange(!open)}>
            {open ? "Close conversation" : "Open conversation"}
            <Icon name="chev-down" size={14} className={"transition-transform " + (open ? "rotate-180" : "")} />
          </button>
        )}
      </div>
      {LIVE ? (
        <div
          id={bodyId}
          className={open ? "mt-3.5 h-[min(64vh,640px)] min-h-[400px] rounded-[12px] shadow-[inset_0_0_0_1px_var(--line)]" : "mt-2.5"}
        >
          <AgentChat
            cwd=""
            heading="Root agent conversation"
            headingVisible={false}
            intro={ROOT_INTRO}
            examples={ROOT_EXAMPLES}
            layout="split"
            collapsed={!open}
            onExpand={() => onOpenChange(true)}
          />
        </div>
      ) : (
        <p className="mt-2.5 font-serif text-[15.5px] text-ink2">
          The root-agent conversation runs in the desktop app or with <code>./os-ui/start.sh</code>; this published copy is view only.
        </p>
      )}
    </section>
  );
}
