import type { ReactNode } from "react";

export type ChipTone = "ok" | "warn" | "signal" | "mute" | "ink";

const DOT: Record<ChipTone, string> = {
  ok: "bg-accent",
  warn: "bg-warn",
  signal: "bg-signal",
  mute: "bg-faint",
  ink: "bg-ink",
};

const TONE: Record<ChipTone, string> = {
  ok: "bg-accent-tint text-accent-ink",
  warn: "bg-warn-soft text-warn",
  signal: "bg-signal-soft text-signal",
  mute: "bg-mute-soft text-muted",
  ink: "bg-mute-soft text-ink2",
};

interface Props {
  tone?: ChipTone;
  /** A colored dot before the label: the state is in the color, the word only names it. */
  dot?: boolean;
  /** Full text for hover; the chip itself stays one or two words. */
  title?: string;
  children: ReactNode;
}

/** One-word status chip: a soft pill, coloured by tone. */
export function Chip({ tone = "mute", dot = false, title, children }: Props) {
  return (
    <span
      title={title}
      className={
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-[3px] text-[11px] font-semibold leading-none " +
        TONE[tone]
      }
    >
      {dot && <span aria-hidden="true" className={"h-[6px] w-[6px] rounded-full " + DOT[tone]} />}
      {children}
    </span>
  );
}
