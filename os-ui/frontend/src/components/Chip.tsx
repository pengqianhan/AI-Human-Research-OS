import type { ReactNode } from "react";

export type ChipTone = "ok" | "warn" | "signal" | "mute" | "ink";

const DOT: Record<ChipTone, string> = {
  ok: "bg-verify",
  warn: "bg-warn",
  signal: "bg-signal",
  mute: "bg-stale",
  ink: "bg-ink",
};

const TEXT: Record<ChipTone, string> = {
  ok: "text-verify",
  warn: "text-warn",
  signal: "text-signal",
  mute: "text-stale",
  ink: "text-ink",
};

interface Props {
  tone?: ChipTone;
  /** A colored dot before the label: the state is in the color, the word only names it. */
  dot?: boolean;
  /** Full text for hover; the chip itself stays one or two words. */
  title?: string;
  children: ReactNode;
}

/** One-word status chip: mono, pill-shaped, colored by tone. */
export function Chip({ tone = "mute", dot = false, title, children }: Props) {
  return (
    <span
      title={title}
      className={
        "font-mono-heading inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-grid bg-panel px-2 py-[2px] text-[10.5px] " +
        TEXT[tone]
      }
    >
      {dot && <span aria-hidden="true" className={"h-[6px] w-[6px] rounded-full " + DOT[tone]} />}
      {children}
    </span>
  );
}
