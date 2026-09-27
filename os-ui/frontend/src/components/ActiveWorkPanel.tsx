import type { ActiveWorkSection } from "../types";
import { stripInlineMarkdown } from "../lib/format";
import { Chip } from "./Chip";
import { Disclosure } from "./Disclosure";

interface Props {
  section: ActiveWorkSection;
}

/**
 * One Active Work section as a row: its title, and, when it is a checklist,
 * a progress bar with done/total. The items open on click. A section with
 * no checklist items is prose in HANDOFF.md; the row says so and stays flat.
 * Title and item text may contain inline Markdown, which stripInlineMarkdown
 * removes so only plain text reaches the DOM.
 */
export function ActiveWorkPanel({ section }: Props) {
  const total = section.items.length;
  const doneCount = section.items.filter((i) => i.done).length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const title = stripInlineMarkdown(section.title);
  const firstNotDoneIndex = section.items.findIndex((i) => !i.done);

  const head = (
    <>
      <span className="font-mono-heading min-w-0 flex-1 truncate text-[12px] font-semibold text-ink" title={title}>
        {title}
      </span>
      {total > 0 ? (
        <>
          <span className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-paper" aria-hidden="true">
            <i className="block h-full rounded-full bg-verify" style={{ width: `${pct}%` }} />
          </span>
          <span className="font-mono-heading shrink-0 text-[11px] tabular-nums text-verify">
            {doneCount}/{total}
          </span>
        </>
      ) : (
        <Chip tone="mute" title="A status section in HANDOFF.md without a checklist">
          prose
        </Chip>
      )}
    </>
  );

  if (total === 0) {
    return <div className="flex items-center gap-2 rounded border border-grid bg-panel px-3.5 py-2.5 pl-[34px]">{head}</div>;
  }

  return (
    <Disclosure className="rounded border border-grid bg-panel px-3.5 py-2.5" summary={head}>
      <ul className="pl-5">
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
    </Disclosure>
  );
}
