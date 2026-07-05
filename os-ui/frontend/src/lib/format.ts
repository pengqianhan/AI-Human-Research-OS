/**
 * Small formatting/parsing helpers shared across pages. Kept dependency-free
 * on purpose — this whole app is a read-only viewer for one JSON file, it
 * doesn't need a markdown or date library.
 */

/**
 * Strip common inline Markdown syntax so plain UI text (titles, checklist
 * items) doesn't leak raw "**", "~~", or "[text](path)" into the DOM.
 * Only inline syntax is handled (bold/strike/links) — active_work text
 * pulled from HANDOFF.md only ever uses these three per DESIGN.md.
 */
export function stripInlineMarkdown(input: string): string {
  let out = input;
  // [text](path) -> text
  out = out.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  // **bold** -> bold
  out = out.replace(/\*\*([^*]+)\*\*/g, "$1");
  // ~~strike~~ -> strike
  out = out.replace(/~~([^~]+)~~/g, "$1");
  return out;
}

/**
 * Render a timestamp (or plain date string) as a human relative-time label
 * in compact English, matching the mockup's "3 hours ago" / "yesterday" idiom.
 * Returns "—" for null/unparseable input rather than guessing.
 */
export function relativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "—";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return iso;

  const diffMs = now.getTime() - then.getTime();
  if (diffMs < 0) return formatAbsoluteDate(then);

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "just now";
  if (diffMs < hour) {
    const n = Math.floor(diffMs / minute);
    return `${n} minute${n === 1 ? "" : "s"} ago`;
  }
  if (diffMs < day) {
    const n = Math.floor(diffMs / hour);
    return `${n} hour${n === 1 ? "" : "s"} ago`;
  }
  if (diffMs < 2 * day) return "yesterday";
  if (diffMs < 30 * day) {
    const n = Math.floor(diffMs / day);
    return `${n} days ago`;
  }
  return formatAbsoluteDate(then);
}

function formatAbsoluteDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Minutes between now and an ISO timestamp; null if unparseable. */
export function minutesSince(iso: string, now: Date = new Date()): number | null {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  return (now.getTime() - then.getTime()) / 60000;
}

/** Format generated_at for the header snapshot card, e.g. "2026-07-04 15:42". */
export function formatSnapshotTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}
