import { useEffect, useRef, useState } from "react";
import type { StoreTarget } from "../types";
import type { DisplaySkill } from "../lib/skills";
import { copyButtonLabel, installCommand } from "../lib/skills";
import { SkillInstalls } from "./SkillInstalls";

interface Props {
  skill: DisplaySkill | null;
  targets: StoreTarget[];
  triggerRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}

/**
 * Skill detail drawer: role=dialog, aria-modal, focus moves to the close
 * button on open and returns to the trigger card on close; Escape and
 * backdrop click both close it. Matches the first dashboard mockup's #drawer semantics.
 */
export function SkillDrawer({ skill, targets, triggerRef, onClose }: Props) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [copyLabel, setCopyLabel] = useState<string | null>(null);
  const copyTimerRef = useRef<number | undefined>(undefined);

  const isOpen = skill !== null;

  useEffect(() => {
    if (isOpen) {
      closeBtnRef.current?.focus();
      setCopyLabel(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  function handleClose() {
    onClose();
    // Restore focus to whatever card triggered the drawer.
    triggerRef.current?.focus();
  }

  async function handleCopy() {
    if (!skill) return;
    const cmd = installCommand(skill);
    try {
      await navigator.clipboard.writeText(cmd);
      setCopyLabel("Copied ✓");
    } catch {
      setCopyLabel("Copy failed - select the command manually");
    }
    window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopyLabel(null), 1600);
  }

  return (
    <>
      <div
        className={
          "scrim fixed inset-0 z-20 bg-line2 " + (isOpen ? "block" : "hidden")
        }
        onClick={handleClose}
        aria-hidden="true"
      />
      <aside
        className={
          // invisible when closed, so its buttons leave the tab order once it has slid away
          "drawer fixed top-0 z-30 h-screen w-[420px] overflow-y-auto bg-card p-6 transition-[right,visibility] duration-[220ms] ease-in-out max-[900px]:w-screen " +
          (isOpen ? "visible right-0 shadow-sh3" : "invisible -right-[460px] max-[900px]:-right-full")
        }
        role="dialog"
        aria-modal="true"
        aria-label="Skill details"
        aria-hidden={!isOpen}
      >
        <button
          ref={closeBtnRef}
          type="button"
          onClick={handleClose}
          className="close btn btn-sm float-right"
        >
          Close
        </button>
        <h3 className="mt-1 break-all font-serif text-[22px] font-medium leading-tight">{skill?.name ?? "—"}</h3>
        <div className="font-mono-heading mb-3.5 mt-1 text-[11.5px] text-muted">
          {skill ? `Research-skills-hub / ${skill.collection}` : "—"}
        </div>

        <dl className="my-3.5 text-[13px]">
          <dt className="label mt-3">
            Description
          </dt>
          <dd className="prose-serif mt-0.5 text-[14.5px] text-ink">{skill?.description ?? "—"}</dd>

          <dt className="label mt-3">
            Installs
          </dt>
          <dd className="mt-0.5">
            {skill ? <SkillInstalls skill={skill} targets={targets} /> : "—"}
          </dd>

          <dt className="label mt-3">
            license / upstream
          </dt>
          <dd className="mt-0.5">{skill?.license ?? "unknown (see upstream)"}</dd>

          <dt className="label mt-3">
            Scripts
          </dt>
          <dd className="mt-0.5">
            {skill?.hasScripts ? "Has scripts/ - inspect them before installation" : "No scripts; documentation-only skill"}
          </dd>
        </dl>

        <div className="cmd cmd-block mt-3.5 break-all px-3.5 py-3 text-[11.5px]">
          {skill ? installCommand(skill) : "—"}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-live="polite"
          className="copy-btn btn btn-primary mt-2 w-full justify-center py-2.5"
        >
          {copyLabel ?? (skill ? copyButtonLabel(skill) : "Copy install command")}
        </button>
        <p className="note mt-2.5 text-[12px] text-muted">
          This app does not install or delete skills; paste the command into a terminal.
          Its only write action is the per-location disable/enable above.
          AGENTS.md requires script review before installing third-party collected skills;
          this UI applies that warning to every skill with scripts/.
        </p>
      </aside>
    </>
  );
}
