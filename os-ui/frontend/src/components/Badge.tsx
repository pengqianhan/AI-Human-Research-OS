import type { ReactNode } from "react";

export type BadgeTone = "ok" | "warn" | "signal" | "mute";

const TONE_CLASSES: Record<BadgeTone, string> = {
  ok: "bg-[#E4F0ED] text-verify",
  warn: "bg-[#F7EEDB] text-warn",
  signal: "bg-[#FCE8DE] text-signal",
  mute: "bg-[#EDF0F1] text-stale",
};

interface Props {
  tone: BadgeTone;
  /** A wrapping block for sentence-length content, instead of a one-token pill. */
  block?: boolean;
  children: ReactNode;
}

/** Four-state badge matching mockup.html's .badge / .b-ok / .b-warn / .b-signal / .b-mute. */
export function Badge({ tone, block = false, children }: Props) {
  return (
    <span
      className={
        "font-mono-heading rounded-[2px] text-[10.5px] font-medium " +
        (block ? "block break-words px-2 py-1 " : "inline-block px-2 py-px ") +
        TONE_CLASSES[tone]
      }
    >
      {children}
    </span>
  );
}
