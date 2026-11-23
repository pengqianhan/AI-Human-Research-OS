/**
 * What the bundled plugins' pages share (os-ui/PLUGINS.md, S6a-2 and S6b):
 * building the DOM with text only, the read channel's URLs, the project a view
 * is opened for, and the host's rules for the selection a view reports
 * (src/plugins/select.ts). Each site's main.ts imports it and esbuild bundles
 * it into that site's main.js (client/scripts/build.mjs), so no site imports
 * another's folder. Pure but for `document` in the DOM helpers, which only
 * touch it when called, so `npm test` runs it in Node.
 *
 * File names, file contents, PDF text, and outline titles are untrusted: text
 * goes in as text (textContent), never as HTML, and icons are <use> references
 * to the static sprite in a site's index.html. Each site's tests scan its code
 * and this file for HTML sinks.
 */

// ---- the DOM, text only ---------------------------------------------------------------

/** An element with a class and, optionally, its text. */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls !== "") node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** A button of type "button". */
export function button(cls: string, text?: string): HTMLButtonElement {
  const b = el("button", cls, text);
  b.type = "button";
  return b;
}

const SVG = "http://www.w3.org/2000/svg";

/** One icon of the sprite in the site's index.html (`#i-<name>`). */
export function icon(name: string, cls = ""): SVGSVGElement {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", `ic${cls === "" ? "" : ` ${cls}`}`);
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(SVG, "use");
  use.setAttribute("href", `#i-${name}`);
  svg.append(use);
  return svg;
}

/** Empties a node. */
export function clear(node: Node): void {
  node.textContent = "";
}

// ---- the project and the read channel -------------------------------------------------

/** A project folder name, as the Git handler and chat.ts accept it. */
const PROJECT = /^[A-Za-z][A-Za-z0-9_-]*$/;

/** The project named in a page's `?project=`, or null when it is missing or not a folder name. */
export function projectFrom(search: string): string | null {
  const name = new URLSearchParams(search).get("project");
  return name !== null && PROJECT.test(name) ? name : null;
}

/** The read channel on the page's own origin (os-ui/client/DESIGN.md §3.2); `rel` is relative to the workspace. */
export const filesUrl = (rel: string) => `./_os/files?path=${encodeURIComponent(rel)}`;
export const listUrl = (rel: string) => `./_os/list?path=${encodeURIComponent(rel)}`;

// ---- the selection a view reports (os.select) -----------------------------------------

/** The host's limits for os.select (src/plugins/select.ts); a page cuts to them before posting. */
export const LABEL_MAX = 200;
export const QUOTE_MAX = 2000;

/** `text` cut to `max` characters, ending in "…" when cut. */
export function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** A label cut to the host's limit from the left, so a file's own name stays readable. */
export function clipLabel(label: string): string {
  return label.length <= LABEL_MAX ? label : `…${label.slice(label.length - (LABEL_MAX - 1))}`;
}

/**
 * Text as one line of visible characters, which the host requires of a label
 * (it refuses, never rewrites, anything else): a line break, a control,
 * format, or default-ignorable character, the Braille blank, or a space other
 * than U+0020 (a no-break or ideographic space, a tab) shows as a marker
 * naming it, "⟨U+200B⟩"; the class is the host's (src/plugins/select.ts).
 * Plain spaces stay. All of these are legal in a file name or an outline title.
 */
export const visibleName = (text: string) =>
  text.replace(/(?! )[\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}\p{Zs}\u2028\u2029\u2800]/gu, (c) => `⟨U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}⟩`);

/** Whether a message is the workspace clearing the selection: from the parent window, at the app's origin, and nothing else. */
export function isHostClear(event: { source: unknown; origin: string; data: unknown }, parent: unknown, host: string): boolean {
  if (event.source !== parent || event.origin !== host) return false;
  const data = event.data as { type?: unknown } | null;
  return typeof data === "object" && data !== null && data.type === "os.select.clear";
}
