import type { ActiveWorkSection } from "../types";
import { stripInlineMarkdown } from "../lib/format";

interface Props {
  section: ActiveWorkSection;
}

/**
 * One Active Work checklist block. Progress bar = done / total. Title and
 * item text may contain inline Markdown ([text](path), **bold**, ~~strike~~)
 * per HANDOFF.md's authoring convention — stripInlineMarkdown removes the
 * syntax so only plain text reaches the DOM.
 */
export function ActiveWorkPanel({ section }: Props) {
  const total = section.items.length;
  const doneCount = section.items.filter((i) => i.done).length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  // First not-done item is "now" (in progress), matching mockup's ▸ marker.
  const firstNotDoneIndex = section.items.findIndex((i) => !i.done);

  return (
    <div className="panel work rounded border border-grid bg-panel p-4 px-[18px]">
      <div className="work-title flex items-baseline justify-between font-mono-heading text-[12.5px] font-semibold">
        <span>{stripInlineMarkdown(section.title)}</span>
        <span className="font-mono-heading text-verify">
          {doneCount}/{total}
        </span>
      </div>
      <div className="bar my-2 h-1.5 overflow-hidden rounded-full bg-paper">
        <i className="block h-full rounded-full bg-verify" style={{ width: `${pct}%` }} />
      </div>
      <ul>
        {section.items.map((item, idx) => (
          <li
            key={idx}
            className={
              "list-none py-[3px] text-[12.5px] " +
              (item.done
                ? "text-stale line-through"
                : idx === firstNotDoneIndex
                  ? "font-medium text-ink before:mr-1 before:text-signal before:content-['▸']"
                  : "text-ink-soft")
            }
          >
            {stripInlineMarkdown(item.text)}
          </li>
        ))}
      </ul>
    </div>
  );
}
