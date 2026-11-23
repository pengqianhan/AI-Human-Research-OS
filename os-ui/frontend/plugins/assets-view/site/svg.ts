/**
 * The Assets view's check before it draws an SVG (review M2). A 1.2 KB SVG
 * whose <use> elements reference groups of <use> elements, six levels of
 * ten, expands to millions of drawn elements and freezes the page as it
 * draws: the time-out cannot help, it runs on the same thread. So the page
 * reads an SVG's text first (in the picture's queue slot, at most
 * SVG_CHECK.bytes) and counts what it would draw, through <use> references
 * (`href` and `xlink:href`, same-document `#id` only), before it gives the
 * file to an <img>.
 *
 * Pure and inert: a small scanner over the text, never a parser that builds
 * a document, so nothing from the file reaches the page. Linear in the
 * text's length: one scan for the elements, one depth-first pass for the
 * counts, memoised (each element is counted once), cycle-safe, without
 * recursion. It fails closed: what it cannot read as it expects (an
 * unclosed tag, mismatched tags, a document type with its own declarations,
 * which could define entities) is refused, as is a reference cycle or a
 * count over the bound. The human may still draw it with Show.
 *
 * It bounds <use> expansion only: other costly SVG (filters, patterns, an
 * embedded data: picture) and a file changed between the check and the
 * draw are declared limits (os-ui/PLUGINS.md, the Assets view).
 */

export const SVG_CHECK = {
  /** Bytes of an SVG read for the check; a larger one is refused (the real figures of the projects are 9-12 KB). */
  bytes: 4 * 1024 * 1024,
  /** Elements an SVG may expand to through <use> and be drawn without a click (measurements in os-ui/PLUGINS.md). */
  elements: 200_000,
} as const;

/** Counts stop here: past it the sentence says "more than". */
export const SATURATED = 1e12;

export type SvgCount =
  | { kind: "count"; elements: number }
  | { kind: "unreadable"; why: string }
  | { kind: "cycle" };

/** XML's character references and its five named entities, in an attribute's value. */
function unescape(value: string): string | null {
  let bad = false;
  const out = value.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);|&/g, (whole: string, ref: string | undefined) => {
    if (ref === undefined) {
      bad = true;
      return whole;
    }
    if (ref === "amp") return "&";
    if (ref === "lt") return "<";
    if (ref === "gt") return ">";
    if (ref === "quot") return '"';
    if (ref === "apos") return "'";
    const code = ref.startsWith("#x") ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
    if (!(code >= 0 && code <= 0x10ffff)) {
      bad = true;
      return whole;
    }
    return String.fromCodePoint(code);
  });
  return bad ? null : out;
}

const isSpace = (c: number) => c === 32 || c === 9 || c === 10 || c === 13;
/** A name ends at white space, "/", ">", "=", "<", or the end. */
const endsName = (c: number) => isSpace(c) || c === 47 || c === 62 || c === 61 || c === 60 || Number.isNaN(c);

/**
 * How many elements `text` (an SVG) draws: each element once, and for each
 * <use> that references an element of the same document by `#id`, that
 * element's count again; at most SATURATED (an exponential file would
 * otherwise overflow).
 */
export function svgExpansion(text: string): SvgCount {
  const n = text.length;
  const parent: number[] = [];
  const target: (string | null)[] = [];
  const ids = new Map<string, number>();
  const open: { index: number; name: string }[] = [];
  let i = 0;
  const fail = (why: string): SvgCount => ({ kind: "unreadable", why });
  while (i < n) {
    const lt = text.indexOf("<", i);
    if (lt === -1) break;
    i = lt;
    if (text.startsWith("<!--", i)) {
      const end = text.indexOf("-->", i + 4);
      if (end === -1) return fail("a comment is not closed");
      i = end + 3;
      continue;
    }
    if (text.startsWith("<![CDATA[", i)) {
      const end = text.indexOf("]]>", i + 9);
      if (end === -1) return fail("a CDATA section is not closed");
      i = end + 3;
      continue;
    }
    if (text.startsWith("<?", i)) {
      const end = text.indexOf("?>", i + 2);
      if (end === -1) return fail("a processing instruction is not closed");
      i = end + 2;
      continue;
    }
    if (text.startsWith("<!", i)) {
      // A document type: its own declarations (an internal subset in [ ]) could define entities; refused.
      const end = text.indexOf(">", i + 2);
      if (end === -1) return fail("a declaration is not closed");
      if (text.slice(i, end).includes("[")) return fail("it declares its own document type entries");
      i = end + 1;
      continue;
    }
    if (text.charCodeAt(i + 1) === 47) {
      // A closing tag: </name>, which must close the element open last.
      let j = i + 2;
      while (j < n && !endsName(text.charCodeAt(j))) j++;
      const name = text.slice(i + 2, j);
      while (j < n && isSpace(text.charCodeAt(j))) j++;
      if (text.charCodeAt(j) !== 62) return fail("a closing tag is not closed");
      const top = open.pop();
      if (top === undefined || top.name !== name) return fail("its tags do not match");
      i = j + 1;
      continue;
    }
    // A start tag: <name attr="value" ...> or ... />.
    let j = i + 1;
    while (j < n && !endsName(text.charCodeAt(j))) j++;
    const name = text.slice(i + 1, j);
    if (name === "") return fail("a tag has no name");
    const local = name.slice(name.lastIndexOf(":") + 1);
    let id: string | null = null;
    let href: string | null = null;
    let selfClosing = false;
    for (;;) {
      while (j < n && isSpace(text.charCodeAt(j))) j++;
      const c = text.charCodeAt(j);
      if (c === 62) {
        j++;
        break;
      }
      if (c === 47 && text.charCodeAt(j + 1) === 62) {
        selfClosing = true;
        j += 2;
        break;
      }
      if (j >= n || c === 60) return fail("a tag is not closed");
      const at = j;
      while (j < n && !endsName(text.charCodeAt(j))) j++;
      const attr = text.slice(at, j);
      if (attr === "") return fail("an attribute has no name");
      while (j < n && isSpace(text.charCodeAt(j))) j++;
      if (text.charCodeAt(j) !== 61) return fail("an attribute has no value");
      j++;
      while (j < n && isSpace(text.charCodeAt(j))) j++;
      const quote = text.charCodeAt(j);
      if (quote !== 34 && quote !== 39) return fail("an attribute's value is not quoted");
      const close = text.indexOf(quote === 34 ? '"' : "'", j + 1);
      if (close === -1) return fail("an attribute's value is not closed");
      const raw = text.slice(j + 1, close);
      j = close + 1;
      if (attr === "id" || ((attr === "href" || attr === "xlink:href") && local === "use")) {
        const value = unescape(raw);
        if (value === null) return fail("an attribute holds an entity the check does not know");
        if (attr === "id") id ??= value;
        else href = value;
      }
    }
    const index = parent.length;
    parent.push(open.length === 0 ? -1 : open[open.length - 1]!.index);
    let ref: string | null = null;
    if (href !== null) {
      const url = href.trim();
      // Same document only: "#id", decoded as a URL's fragment is. Anything else draws nothing in an <img>.
      if (url.startsWith("#")) {
        try {
          ref = decodeURIComponent(url.slice(1));
        } catch {
          return fail("a reference is not a valid URL fragment");
        }
      }
    }
    target.push(ref);
    if (id !== null && !ids.has(id)) ids.set(id, index);
    if (!selfClosing) open.push({ index, name });
    i = j;
  }
  if (open.length > 0) return fail("an element is not closed");

  // Children by parent, in one array (each element's children are a run).
  const count = parent.length;
  const childCount = new Int32Array(count + 1);
  for (let k = 0; k < count; k++) if (parent[k]! >= 0) childCount[parent[k]!]!++;
  const first = new Int32Array(count + 1);
  for (let k = 0; k < count; k++) first[k + 1] = first[k]! + childCount[k]!;
  const children = new Int32Array(Math.max(1, first[count]!));
  const fill = first.slice();
  for (let k = 0; k < count; k++) if (parent[k]! >= 0) children[fill[parent[k]!]!++] = k;
  const refOf = new Int32Array(count).fill(-1);
  for (let k = 0; k < count; k++) {
    const id = target[k];
    if (id !== null && id !== undefined) refOf[k] = ids.get(id) ?? -1;
  }

  // Each element's count, after its children's and its reference's: depth first, iterative, each element once.
  const total = new Float64Array(count);
  const state = new Uint8Array(count); // 0 not seen, 1 being counted (on the path), 2 counted
  const stack: number[] = [];
  for (let start = 0; start < count; start++) {
    if (state[start] !== 0) continue;
    stack.push(start);
    while (stack.length > 0) {
      const v = stack[stack.length - 1]!;
      if (state[v] === 0) {
        state[v] = 1;
        const deps = [refOf[v]!];
        for (let c = first[v]!; c < first[v + 1]!; c++) deps.push(children[c]!);
        for (const d of deps) {
          if (d < 0) continue;
          if (state[d] === 1) return { kind: "cycle" };
          if (state[d] === 0) stack.push(d);
        }
      } else if (state[v] === 1) {
        let sum = 1;
        for (let c = first[v]!; c < first[v + 1]!; c++) sum += total[children[c]!]!;
        if (refOf[v]! >= 0) sum += total[refOf[v]!]!;
        total[v] = Math.min(sum, SATURATED);
        state[v] = 2;
        stack.pop();
      } else stack.pop();
    }
  }
  let all = 0;
  for (let k = 0; k < count; k++) if (parent[k] === -1) all = Math.min(all + total[k]!, SATURATED);
  return { kind: "count", elements: all };
}

/** Whether an SVG may be drawn without a click, and if not, why, in one sentence. */
export type SvgVerdict = { draw: true } | { draw: false; words: string };

/** The check on the bytes read (`cut`: the file goes on past SVG_CHECK.bytes). */
export function svgVerdict(text: string | null, cut: boolean): SvgVerdict {
  const cost = "drawing it may freeze the view";
  if (cut) return { draw: false, words: `This SVG is larger than ${SVG_CHECK.bytes / 1024 / 1024} MiB, more than the view checks before drawing; ${cost}.` };
  if (text === null) return { draw: false, words: `This SVG is not UTF-8 text the view can check before drawing; ${cost}.` };
  const counted = svgExpansion(text);
  if (counted.kind === "cycle") return { draw: false, words: `This SVG refers to itself through <use>; ${cost}.` };
  if (counted.kind === "unreadable") return { draw: false, words: `The view could not check this SVG before drawing (${counted.why}); ${cost}.` };
  if (counted.elements > SVG_CHECK.elements) {
    const times = counted.elements >= SATURATED ? `more than ${SATURATED.toLocaleString("en-US")}` : counted.elements.toLocaleString("en-US");
    return { draw: false, words: `This SVG repeats its parts ${times} times over; ${cost}.` };
  }
  return { draw: true };
}
