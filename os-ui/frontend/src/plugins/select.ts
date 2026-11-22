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

/** C0 and C1 controls, and the bidirectional overrides and isolates that could make a label read as another. */
const LABEL_BANNED = /[\u0000-\u001f\u007f-\u009f؜‎‏‪-‮⁦-⁩]/;
/** A quote may hold tabs and line breaks, no other control character. */
const QUOTE_BANNED = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/;

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
  if (typeof label !== "string" || label.trim() === "" || label.length > LABEL_MAX || LABEL_BANNED.test(label)) return null;
  if (quote !== undefined && (typeof quote !== "string" || quote.length > QUOTE_MAX || QUOTE_BANNED.test(quote))) return null;
  return { kind: "select", reference: quote === undefined || quote === "" ? { label } : { label, quote } };
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
    .split(/\r\n|\r|\n/)
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
