import type { ReactNode } from "react";

/** The chevron that marks a click-to-expand row; rotates when its `group` details is open. */
export function Chevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className="h-3 w-3 shrink-0 text-stale transition-transform group-open:rotate-90"
    >
      <path d="M4 2.5 7.5 6 4 9.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface Props {
  summary: ReactNode;
  children: ReactNode;
  open?: boolean;
  className?: string;
}

/**
 * Detail on demand: a native <details> whose summary row stays glanceable
 * (a label, a chip, a truncated line) and whose body holds the full text.
 * Native so it needs no state, works with the keyboard, and survives a
 * republish of the page.
 */
export function Disclosure({ summary, children, open, className = "" }: Props) {
  return (
    <details open={open} className={"group " + className}>
      <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        <Chevron />
        {summary}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
