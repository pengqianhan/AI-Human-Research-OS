import { useEffect, useRef, useState } from "react";
import type { DisplaySkill } from "../lib/skills";
import { copyButtonLabel, installCommand } from "../lib/skills";
import { SyncBadge } from "./SyncBadge";

interface Props {
  skill: DisplaySkill | null;
  triggerRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}

const SYNC_NOTE: Partial<Record<DisplaySkill["sync"], string>> = {
  drift: "— 副本与 hub 不一致,建议重新安装同步",
  installed_no_hub_source: "— 安装目录中有副本,但 hub 无源(违反 D7 三方一致),建议 sync-back 回灌 hub 或移除",
};

/**
 * Skill detail drawer: role=dialog, aria-modal, focus moves to the close
 * button on open and returns to the trigger card on close; Escape and
 * backdrop click both close it. Matches mockup.html's #drawer semantics.
 */
export function SkillDrawer({ skill, triggerRef, onClose }: Props) {
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
      setCopyLabel("已复制 ✓");
    } catch {
      setCopyLabel("复制失败 — 请手动选中命令");
    }
    window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopyLabel(null), 1600);
  }

  return (
    <>
      <div
        className={
          "scrim fixed inset-0 z-20 bg-[rgba(23,38,46,.18)] " + (isOpen ? "block" : "hidden")
        }
        onClick={handleClose}
        aria-hidden="true"
      />
      <aside
        className={
          "drawer fixed top-0 z-30 h-screen w-[400px] overflow-y-auto border-l-2 border-ink bg-panel p-6 transition-[right] duration-[220ms] ease-in-out max-[900px]:w-screen " +
          (isOpen ? "right-0 shadow-[-8px_0_30px_rgba(23,38,46,.15)]" : "-right-[420px] max-[900px]:-right-full")
        }
        role="dialog"
        aria-modal="true"
        aria-label="技能详情"
        aria-hidden={!isOpen}
      >
        <button
          ref={closeBtnRef}
          type="button"
          onClick={handleClose}
          className="close float-right rounded-[3px] border border-grid bg-panel px-2.5 py-0.5 font-mono-heading text-[12px]"
        >
          关闭 ✕
        </button>
        <h3 className="font-mono-heading mt-1 break-all text-[16px]">{skill?.name ?? "—"}</h3>
        <div className="font-mono-heading mb-3.5 text-[11px] text-stale">
          {skill ? `Research-skills-hub / ${skill.collection}` : "—"}
        </div>

        <dl className="my-3.5 text-[12.5px]">
          <dt className="font-mono-heading mt-2.5 text-[10.5px] uppercase tracking-[.05em] text-stale">
            描述
          </dt>
          <dd className="mt-0.5">{skill?.description ?? "—"}</dd>

          <dt className="font-mono-heading mt-2.5 text-[10.5px] uppercase tracking-[.05em] text-stale">
            同步状态(hub / .claude / .agents 三方哈希)
          </dt>
          <dd className="mt-0.5">
            {skill ? (
              <>
                <SyncBadge sync={skill.sync} /> {SYNC_NOTE[skill.sync] ?? ""}
              </>
            ) : (
              "—"
            )}
          </dd>

          <dt className="font-mono-heading mt-2.5 text-[10.5px] uppercase tracking-[.05em] text-stale">
            license / 上游
          </dt>
          <dd className="mt-0.5">{skill?.license ?? "unknown(见上游)"}</dd>

          <dt className="font-mono-heading mt-2.5 text-[10.5px] uppercase tracking-[.05em] text-stale">
            脚本
          </dt>
          <dd className="mt-0.5">
            {skill?.hasScripts ? "含 scripts/ — 安装前请先浏览脚本内容" : "无脚本,纯文档技能"}
          </dd>
        </dl>

        <div className="cmd mt-3.5 break-all rounded bg-ink px-3.5 py-3 font-mono-heading text-[11px] leading-[1.6] text-[#E8EDEF]">
          {skill ? installCommand(skill) : "—"}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-live="polite"
          className="copy-btn mt-2 block w-full rounded-[3px] border border-ink bg-panel py-2.5 font-mono-heading text-[12.5px] font-semibold hover:bg-ink hover:text-white"
        >
          {copyLabel ?? (skill ? copyButtonLabel(skill) : "复制安装命令")}
        </button>
        <p className="note mt-2.5 text-[11.5px] text-stale">
          只读仪表盘不执行安装。把命令粘贴到终端运行。对第三方来源(collected-skills)技能,INSTRUCTION.md
          要求装前浏览 scripts/;本界面从严,对所有含 scripts/ 的技能都给出提示。
        </p>
      </aside>
    </>
  );
}
