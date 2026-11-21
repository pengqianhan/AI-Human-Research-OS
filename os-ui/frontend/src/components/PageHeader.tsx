import type { ReactNode } from "react";

/**
 * The top of a page in mockup C: a small eyebrow, the serif title, a one- or
 * two-line lede, and an optional control on the right. The title can take
 * focus (tabIndex -1) so the layout can move focus to a page it opened.
 */
export function PageHeader({ eyebrow, title, lede, right }: { eyebrow: ReactNode; title: string; lede?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="min-w-0 flex-1">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="page-title" tabIndex={-1} data-page-title>
          {title}
        </h1>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {right}
    </div>
  );
}
