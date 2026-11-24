/**
 * The check before an SVG is drawn (review M2): the count of elements it
 * expands to through <use>, cycle-safe and linear, failing closed; the bound
 * against the reviewer's bombs, the frozen copies of the projects' real
 * figures, and a matplotlib-style figure.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { assertOnePass, growth } from "../../growth.ts";
import { SATURATED, SVG_CHECK, svgExpansion, svgVerdict } from "./svg.ts";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "../../fixtures");
const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" height="100">${body}</svg>`;
const count = (text: string) => {
  const c = svgExpansion(text);
  assert.equal(c.kind, "count", JSON.stringify(c));
  return c.kind === "count" ? c.elements : -1;
};
/** The reviewer's bomb: `levels` groups of `fan` <use> elements, each referencing the group below. */
const bomb = (levels: number, fan: number, attr = "href") => {
  let defs = `<g id="l0"><rect width="1" height="1"/></g>`;
  for (let l = 1; l <= levels; l++) defs += `<g id="l${l}">${Array.from({ length: fan }, () => `<use ${attr}="#l${l - 1}"/>`).join("")}</g>`;
  return svg(`<defs>${defs}</defs><use ${attr}="#l${levels}"/>`);
};

describe("the count of elements an SVG draws through <use>", () => {
  test("each element once; a <use> adds what it references, nested references multiply", () => {
    assert.equal(count(svg("")), 1);
    assert.equal(count(svg(`<rect/><circle/>`)), 3);
    // <g id="a"> with two children (3), and a <use> of it: 1 + 3.
    assert.equal(count(svg(`<g id="a"><rect/><rect/></g><use href="#a"/>`)), 1 + 3 + 4);
    // Two levels of two: a = 2, b = 1 + 2 × (1 + 2) = 7, the use of b = 8.
    assert.equal(count(svg(`<g id="a"><rect/></g><g id="b"><use href="#a"/><use href="#a"/></g><use href="#b"/>`)), 1 + 2 + 7 + 8);
    // A forward reference counts the same.
    assert.equal(count(svg(`<use href="#a"/><g id="a"><rect/></g>`)), 1 + 3 + 2);
  });

  test("both forms of the reference, xlink:href and href, with escapes and percent-encoding; another document or a missing id adds nothing", () => {
    const target = `<g id="a b"><rect/><rect/><rect/></g>`;
    for (const ref of [`href="#a b"`, `xlink:href="#a b"`, `href="&#35;a b"`, `href="&#x23;a&#32;b"`, `href=" #a%20b "`, `svg:href="#nope" href='#a b'`]) {
      assert.equal(count(svg(`${target}<use ${ref}/>`)), 1 + 4 + 5, ref);
    }
    for (const ref of [`href="other.svg#a b"`, `href="#missing"`, `href=""`, `data-href="#a b"`]) assert.equal(count(svg(`${target}<use ${ref}/>`)), 1 + 4 + 1, ref);
    // A reference on an element that is not <use> is not followed.
    assert.equal(count(svg(`${target}<image href="#a b"/>`)), 1 + 4 + 1);
    // With a namespace prefix, <svg:use> is a <use>.
    assert.equal(count(`<svg:svg xmlns:svg="http://www.w3.org/2000/svg"><svg:g id="a"><svg:rect/></svg:g><svg:use href="#a"/></svg:svg>`), 1 + 2 + 3);
  });

  test("on a <use>, every attribute whose local name is href is a reference, whatever its prefix; with more than one, each target counts (recheck)", () => {
    const target = `<g id="a"><rect/><rect/><rect/></g>`;
    // Any prefix bound to XLink draws: x:href, my:href. Counted as href is.
    for (const ref of [`x:href="#a"`, `my:href="#a"`, `a:b:href="#a"`]) assert.equal(count(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:x="http://www.w3.org/1999/xlink" xmlns:my="http://www.w3.org/1999/xlink">${target}<use ${ref}/></svg>`), 1 + 4 + 5, ref);
    // Two references on one <use>: both targets count, more than a browser draws, the safe side.
    assert.equal(count(svg(`${target}<g id="b"><rect/></g><use href="#a" xlink:href="#b"/>`)), 1 + 4 + 2 + (1 + 4 + 2));
    assert.equal(count(svg(`${target}<use href="#a" x:href="#a" xlink:href="#a"/>`)), 1 + 4 + (1 + 3 * 4));
    // The recheck's 6×10 bomb written with a prefix of its own is refused like the plain one.
    const prefixed = bomb(6, 10, "x:href").replace("<svg ", `<svg xmlns:x="http://www.w3.org/1999/xlink" `);
    assert.deepEqual(svgVerdict(prefixed, false), { draw: false, words: "This SVG repeats its parts 6,802,462 times over; drawing it may freeze the view." });
    // A name that only ends in "href" is not one.
    assert.equal(count(svg(`${target}<use data-href="#a" xhref="#a"/>`)), 1 + 4 + 1);
  });

  test("a picture inside the SVG as a data: URL is not drawn without a click, unless it is a PNG, JPEG, GIF, or WebP (recheck: data-wrap)", () => {
    const WORDS = "This SVG holds another picture the view cannot check; drawing it may freeze the view.";
    const inner = Buffer.from(bomb(6, 10)).toString("base64");
    // The recheck's data-wrap: the 6×10 bomb as an <image>'s data: URL.
    assert.deepEqual(svgVerdict(svg(`<image width="100" height="100" href="data:image/svg+xml;base64,${inner}"/>`), false), { draw: false, words: WORDS });
    // Any attribute of any element, in any case, after white space, escaped, or broken by a tab or line break (a URL drops them).
    for (const attr of [
      `xlink:href="data:image/svg+xml,&lt;svg/&gt;"`,
      `href="  DATA:Image/SVG+XML;base64,${inner}"`,
      `href="&#100;ata:image/svg+xml,x"`,
      `href="da&#10;ta:image/svg+xml,x"`,
      `href="data:,x"`,
      `href="data:text/html,x"`,
      `href="data:image/pngx;base64,AAAA"`,
      `src="data:image/svg+xml,x"`,
      `style="fill: url(data:image/svg+xml;base64,${inner})"`,
      `style="fill: URL( 'data:image/svg+xml,x')"`,
      `style="fill: url(&quot; data:image/svg+xml,x&quot;)"`,
      `fill="url(data:image/svg+xml,x#p)"`,
    ]) {
      assert.deepEqual(svgExpansion(svg(`<image ${attr}/>`)), { kind: "embedded" }, attr);
      assert.deepEqual(svgVerdict(svg(`<feImage ${attr}/>`), false), { draw: false, words: WORDS }, attr);
    }
    // A raster, as matplotlib embeds one, draws without a click; so does a url() of the document's own.
    for (const attr of [
      `xlink:href="data:image/png;base64,&#10;iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk"`,
      `href="data:image/jpeg,x"`,
      `href=" Data:Image/GIF;base64,R0lGOD"`,
      `href="data:image/webp;base64,UklGR"`,
      `style="fill: url(#gradient)"`,
      `style="fill: url('data:image/png;base64,AAAA')"`,
      `title="no data: here"`,
    ]) {
      assert.deepEqual(svgVerdict(svg(`<image ${attr}/>`), false), { draw: true }, attr);
    }
  });

  test("a reference cycle is refused, through itself, an ancestor, or another element", () => {
    for (const body of [`<use id="a" href="#a"/>`, `<g id="a"><g><use href="#a"/></g></g>`, `<g id="a"><use href="#b"/></g><g id="b"><use href="#a"/></g>`]) {
      assert.deepEqual(svgExpansion(svg(body)), { kind: "cycle" }, body);
      assert.deepEqual(svgVerdict(svg(body), false), { draw: false, words: "This SVG refers to itself through <use>; drawing it may freeze the view." });
    }
  });

  test("what the scanner reads: comments, CDATA, a declaration, quotes holding '>' and the other quote; it fails closed on the rest", () => {
    assert.equal(count(`<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">${svg(`<!-- <use href="#x"/> --><style><![CDATA[ a > b { } <use> ]]></style><text title='a > "b"'>x &lt; y</text>`)}`), 3);
    for (const [text, why] of [
      [svg(`<rect`), "a tag is not closed"],
      [`<svg><g></svg>`, "its tags do not match"],
      [`<svg><g>`, "an element is not closed"],
      [svg(`<rect width=1/>`), "an attribute's value is not quoted"],
      [svg(`<!-- open`), "a comment is not closed"],
      [`<!DOCTYPE svg [<!ENTITY a "aaaa">]>${svg("")}`, "it declares its own document type entries"],
      [svg(`<use href="#a&b;"/>`), "an attribute holds an entity the check does not know"],
      [svg(`<use href="#%zz"/>`), "a reference is not a valid URL fragment"],
    ] as const) {
      assert.deepEqual(svgExpansion(text), { kind: "unreadable", why }, text);
      assert.equal((svgVerdict(text, false) as { words: string }).words, `The view could not check this SVG before drawing (${why}); drawing it may freeze the view.`);
    }
  });

  test(`the bound, ${SVG_CHECK.elements.toLocaleString("en-US")} elements: the reviewer's 6×10 and 7×10 bombs are refused, and 5×10; 4×10 is drawn`, () => {
    assert.equal(count(bomb(4, 10)), 68_020);
    assert.deepEqual(svgVerdict(bomb(4, 10), false), { draw: true });
    for (const [levels, words] of [
      [5, "This SVG repeats its parts 680,241 times over; drawing it may freeze the view."],
      [6, "This SVG repeats its parts 6,802,462 times over; drawing it may freeze the view."],
      [7, "This SVG repeats its parts 68,024,683 times over; drawing it may freeze the view."],
    ] as const) {
      assert.deepEqual(svgVerdict(bomb(levels, 10), false), { draw: false, words }, `${levels}x10`);
      assert.deepEqual(svgVerdict(bomb(levels, 10, "xlink:href"), false), { draw: false, words }, `${levels}x10, xlink:href`);
    }
    // An exponential file saturates rather than overflow.
    assert.equal(count(bomb(40, 10)), SATURATED);
    assert.match((svgVerdict(bomb(40, 10), false) as { words: string }).words, /^This SVG repeats its parts more than 1,000,000,000,000 times over;/);
  });

  test("the projects' real figures (frozen copies of nanochat_cpu's Figs/) and a matplotlib-style figure are drawn without a click", () => {
    for (const name of ["baseline_training_curves.svg", "probe_comparison.svg"]) {
      const text = readFileSync(join(FIXTURES, "assets_project/Figs", name), "utf8");
      assert.deepEqual(svgVerdict(text, false), { draw: true }, name);
      assert.ok(count(text) < 200, name);
    }
    // As matplotlib writes one: glyphs and a marker in <defs>, each label's characters and each point a <use>.
    const glyphs = Array.from({ length: 60 }, (_, k) => `<path id="DejaVuSans-${(0x30 + k).toString(16)}" d="M 0 0 L 10 ${k} z" transform="scale(0.015625)"/>`).join("\n");
    const labels = Array.from({ length: 400 }, (_, k) => `<g transform="translate(${k} 0)">${Array.from({ length: 5 }, (__, c) => `<use xlink:href="#DejaVuSans-${(0x30 + ((k + c) % 60)).toString(16)}" x="${c * 63}"/>`).join("")}</g>`).join("\n");
    const points = Array.from({ length: 3000 }, (_, k) => `<use xlink:href="#m0" x="${k}" y="${(k * 7) % 300}" style="fill: #1f77b4"/>`).join("\n");
    const figure = `<?xml version="1.0" encoding="utf-8" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns:xlink="http://www.w3.org/1999/xlink" width="460.8pt" height="345.6pt" viewBox="0 0 460.8 345.6" xmlns="http://www.w3.org/2000/svg" version="1.1">
 <metadata><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"/></metadata>
 <defs><style type="text/css">*{stroke-linejoin: round; stroke-linecap: butt}</style>
  <path id="m0" d="M 0 3 C 0.8 3 1.5 2.7 2.1 2.1 z" style="stroke: #1f77b4"/>
  ${glyphs}
 </defs>
 <g id="figure_1"><g id="axes_1">
  <image xlink:href="data:image/png;base64,
iVBORw0KGgoAAAANSUhEUgAAAfEAAAFzCAYAAAD2Lr4cAAAABHNCSVQICAgIfAhkiAAAIABJREFU
eJzt3XuMXGd5x/HfM7Prtb3r9XrX6/Xa3ovXu/bG3tjxJXHsOHESx3ESJ7ZJAkmTQEKhpRUUqBBC
" id="image3b3e0ed0d2" transform="scale(1 -1) translate(0 -266.4)" x="57.6" y="-41.472" width="357.12" height="266.4"/>
  ${labels}${points}</g></g>
</svg>
`;
    const elements = count(figure);
    assert.ok(elements > 10_000 && elements < SVG_CHECK.elements, String(elements));
    assert.deepEqual(svgVerdict(figure, false), { draw: true });
  });

  test("over the byte cap, or not UTF-8: refused, with the reason", () => {
    assert.deepEqual(svgVerdict(svg(""), true), { draw: false, words: "This SVG is larger than 4 MiB, more than the view checks before drawing; drawing it may freeze the view." });
    assert.deepEqual(svgVerdict(null, false), { draw: false, words: "This SVG is not UTF-8 text the view can check before drawing; drawing it may freeze the view." });
  });

  test("hostile SVG costs one pass: 256 KiB against 1 MiB (4× the input, well under 16× the time)", (t) => {
    // 1 MiB at 4n keeps one pass far under GROWTH.floorMs on a slow runner; the 4 MiB cap costs four times that (os-ui/PLUGINS.md).
    const MiB = 1024 * 1024;
    const cases: [string, (n: number) => string][] = [
      ["one target, a <use> of it again and again", (n) => svg(`<g id="a"><rect/></g>${'<use href="#a"/>'.repeat(n / 16)}`)],
      ["a chain, each <use> of the one before", (n) => svg(Array.from({ length: n / 40 }, (_, k) => `<g id="c${k}"><use href="#c${k - 1}"/></g>`).join(""))],
      ["elements nested n / 7 deep", (n) => `<svg>${"<g>".repeat(n / 7)}${"</g>".repeat(n / 7)}</svg>`],
      ["one attribute value of n characters", (n) => svg(`<use href="#${"x".repeat(n)}"/>`)],
      ["n '<' in a comment", (n) => svg(`<!--${"<".repeat(n)}-->`)],
      ["entities in an id", (n) => svg(`<g id="${"&#97;".repeat(n / 5)}"/>`)],
      ["one <use> with n / 12 prefixed hrefs", (n) => svg(`<g id="a"><rect/></g><use ${'x:href="#a" '.repeat(n / 12)}/>`)],
      ["n / 40 images, each a data:image/png", (n) => svg('<image href="data:image/png;base64,AAAA"/>'.repeat(n / 40))],
      ["one style of n / 4 'url('", (n) => svg(`<rect style="${"url(".repeat(n / 4)}"/>`)],
      ["'url(' with n spaces and a quote after it", (n) => svg(`<rect style="url(${" ".repeat(n)}'${" ".repeat(n / 8)}x"/>`)],
      ["n / 5 '&#10;' before data:", (n) => svg(`<image href="${"&#10;".repeat(n / 5)}data:image/png,x"/>`)],
    ];
    for (const [name, make] of cases) {
      assert.ok(make(MiB).length >= MiB * 0.95, `${name}: ${make(MiB).length}`);
      assertOnePass(t, `svgExpansion, ${name}`, growth(make, svgExpansion, MiB / 4));
    }
  });
});
