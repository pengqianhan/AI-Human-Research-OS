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
  children: ReactNode;
}

/** Four-state badge matching mockup.html's .badge / .b-ok / .b-warn / .b-signal / .b-mute. */
export function Badge({ tone, children }: Props) {
  return (
    <span
      className={
        "font-mono-heading inline-block rounded-[2px] px-2 py-px text-[10.5px] font-medium " +
        TONE_CLASSES[tone]
      }
    >
      {children}
    </span>
  );
}
