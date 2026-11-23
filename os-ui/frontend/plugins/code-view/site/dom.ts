/**
 * The only way the Code view's page builds its DOM. File names, file
 * contents, diffs, and commit text are untrusted, and PLUGIN_CSP allows
 * inline script, so an `onerror=` that reached markup would run: text goes in
 * as text (textContent), never as HTML, and icons are <use> references to the
 * static sprite in index.html. dom.test.ts scans the site for HTML sinks.
 */

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

/** One icon of the sprite in index.html (`#i-<name>`). */
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
