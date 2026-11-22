/**
 * The page-to-host message of contract 1.0 (os-ui/PLUGINS.md Part 2,
 * "Manifests and contract"): a project view reports what the user selected,
 * and the workspace shows mockup C's "Ask the agent about this" bar. Asking
 * adds a reference chip to the project's composer; nothing is ever sent to
 * the agent without the user pressing Send. Pure, so `node --test` runs it.
 *
 *   { type: "os.select", label: string, quote?: string }   a selection
 *   { type: "os.select", label: null }                     no selection
 *
 * The host answers `{ type: "os.select.clear" }` to the frame, at the page's
 * origin only, when the user clears the selection or asks about it in the host.
 */
import type { PluginPage } from "./pages.ts";

/** A label is one line of at most this many characters ("Code/README.md:12"). */
export const LABEL_MAX = 200;
/** A quote, the selected text, at most this many characters. */
export const QUOTE_MAX = 2000;
/** References one message carries at most. The composer still refuses a message over chat.ts's 20,000 characters (MESSAGE_MAX). */
export const MAX_REFERENCES = 8;
/** chat.ts's MAX_PROMPT: the longest message the agent endpoint takes. */
export const MESSAGE_MAX = 20_000;

/** What a view reported and the user may ask about. */
export interface Reference {
  label: string;
  quote?: string;
}

export type SelectMessage = { kind: "select"; reference: Reference } | { kind: "clear" };

/**
 * The rule: what Send passes is exactly what the user can read in the
 * composer. Every line break Unicode knows (CR LF, CR, LF, VT, FF, NEL,
 * U+2028, U+2029) is a line break here too.
 */
const LINE_BREAK = /\r\n|[\n\v\f\r\u0085\u2028\u2029]/u;
const LINE_BREAKS = /\r\n|[\n\v\f\r\u0085\u2028\u2029]/gu;
/**
 * Characters that show nothing or change how others show: controls (Cc) and
 * format characters (Cf: zero-width spaces and joiners, U+2060, U+FEFF, the
 * soft hyphen, bidirectional marks, embeddings, overrides and isolates,
 * U+FFF9-FFFB, tag characters). A label with any, or with a line break, is
 * refused. Homoglyphs are not: a real file can be named so.
 */
const INVISIBLE = /[\p{Cc}\p{Cf}]/u;
/** In a quote, all of them but tab and line feed (line breaks are LF by then), each shown as a marker. */
const QUOTE_INVISIBLE = /(?![\t\n])[\p{Cc}\p{Cf}]/gu;
/** Ends a quote that its markers made longer than QUOTE_MAX. */
export const CUT_MARK = "…[cut]";

/**
 * The selection a message reports, or null to ignore it. Only a message from
 * the active view's frame (`frameWindow`, its contentWindow) at that page's
 * own origin counts; its data must be exactly `os.select` with a label (one
 * line, 1 to LABEL_MAX characters, not blank) or null, and an optional quote
 * (at most QUOTE_MAX characters; "" is none). Anything else is ignored.
 */
export function readSelect(event: { origin: string; source: unknown; data: unknown }, page: PluginPage | null, frameWindow: unknown): SelectMessage | null {
  if (page === null || page.origin === null || frameWindow === null || frameWindow === undefined) return null;
  if (event.source !== frameWindow || event.origin !== page.origin) return null;
  const data = event.data;
  if (typeof data !== "object" || data === null || Array.isArray(data) || Object.getPrototypeOf(data) !== Object.prototype) return null;
  const keys = Object.keys(data);
  if (!keys.every((k) => k === "type" || k === "label" || k === "quote")) return null;
  const { type, label, quote } = data as Record<string, unknown>;
  if (type !== "os.select") return null;
  if (label === null) return keys.includes("quote") ? null : { kind: "clear" };
  if (typeof label !== "string" || label.trim() === "" || label.length > LABEL_MAX || INVISIBLE.test(label) || LINE_BREAK.test(label)) return null;
  if (quote !== undefined && (typeof quote !== "string" || quote.length > QUOTE_MAX)) return null;
  const shown = quote === undefined ? "" : visibleQuote(quote);
  return { kind: "select", reference: shown === "" ? { label } : { label, quote: shown } };
}

/**
 * A quote as the composer shows it and Send passes it: every line break as
 * LF, and every invisible or format character but tab as a marker naming it
 * ("⟨U+200B⟩"). If the markers take it past QUOTE_MAX, it is cut to
 * QUOTE_MAX characters ending in CUT_MARK, never inside a marker or a pair.
 */
export function visibleQuote(quote: string): string {
  const text = quote
    .replace(LINE_BREAKS, "\n")
    .replace(QUOTE_INVISIBLE, (c) => `⟨U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}⟩`);
  if (text.length <= QUOTE_MAX) return text;
  let end = QUOTE_MAX - CUT_MARK.length;
  const open = text.lastIndexOf("⟨", end - 1);
  if (open !== -1 && text.indexOf("⟩", open) >= end) end = open;
  const last = text.charCodeAt(end - 1);
  if (last >= 0xd800 && last <= 0xdbff) end--;
  return text.slice(0, end) + CUT_MARK;
}

/**
 * One reference as it travels in the message, exactly as its chip's tooltip
 * shows it: "About <label>", then the quote as a Markdown blockquote, every
 * line prefixed "> ".
 */
export function referenceText(reference: Reference): string {
  const head = `About ${reference.label}`;
  if (reference.quote === undefined) return head;
  const quoted = reference.quote
    .split(LINE_BREAKS)
    .map((line) => (line === "" ? ">" : `> ${line}`))
    .join("\n");
  return `${head}\n${quoted}`;
}

/** The text Send passes on: each reference, a blank line between, then what the user typed. */
export function messageWithReferences(references: readonly Reference[], typed: string): string {
  return [...references.map(referenceText), typed.trim()].filter((part) => part !== "").join("\n\n");
}

/** `list` with `reference` added at the end, unless the same one is there already or the list is full. */
export function addReference(list: readonly Reference[], reference: Reference): Reference[] | null {
  if (list.some((r) => r.label === reference.label && r.quote === reference.quote)) return [...list];
  if (list.length >= MAX_REFERENCES) return null;
  return [...list, reference];
}

/** Selection messages a frame may have accepted in any one second; more are ignored. */
export const SELECT_PER_SECOND = 10;

/**
 * Whether the workspace takes a valid selection message from `frame` now:
 * only while its screen is the one shown (the Shell keeps visited screens
 * mounted, hidden), the frame's tab is the selected one, the "Ask the agent
 * about this" button is not held down (so the bar cannot change between
 * pointer-down and click), and the frame has had fewer than
 * SELECT_PER_SECOND messages accepted in the last second ("accept"). Past
 * that a message is "over": the bar is hidden rather than left showing an
 * older selection than the page now marks. Otherwise "ignore". `now` is the clock.
 */
export function selectGate(now: () => number = Date.now) {
  const accepted = new WeakMap<object, number[]>();
  return (frame: object, state: { visible: boolean; tabSelected: boolean; held: boolean }): "accept" | "ignore" | "over" => {
    if (!state.visible || !state.tabSelected || state.held) return "ignore";
    const at = now();
    const recent = (accepted.get(frame) ?? []).filter((t) => at - t < 1000);
    accepted.set(frame, recent);
    if (recent.length >= SELECT_PER_SECOND) return "over";
    recent.push(at);
    return "accept";
  };
}
