import type { ReactNode } from "react";

export type BadgeTone = "ok" | "warn" | "signal" | "mute";

const TONE_CLASSES: Record<BadgeTone, string> = {
  ok: "bg-accent-tint text-accent-ink",
  warn: "bg-warn-soft text-warn",
  signal: "bg-signal-soft text-signal",
  mute: "bg-mute-soft text-muted",
};

interface Props {
  tone: BadgeTone;
  /** A wrapping block for sentence-length content, instead of a one-token pill. */
  block?: boolean;
  children: ReactNode;
}

/** Four-state badge: a small soft rectangle coloured by tone. */
export function Badge({ tone, block = false, children }: Props) {
  return (
    <span
      className={
        "rounded-[5px] text-[11px] font-semibold " +
        (block ? "block break-words px-2 py-1 font-normal " : "inline-block px-1.5 py-px ") +
        TONE_CLASSES[tone]
      }
    >
      {children}
    </span>
  );
}
