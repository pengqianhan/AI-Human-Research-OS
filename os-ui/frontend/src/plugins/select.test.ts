import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { PluginPage } from "./pages.ts";
import { addReference, LABEL_MAX, MAX_REFERENCES, messageWithReferences, QUOTE_MAX, readSelect, referenceText } from "./select.ts";

const page: PluginPage = { key: "code-view/code", plugin: "code-view", slot: "project", title: "Code", src: "app://code-view/index.html", origin: "app://code-view" };
const frame = { name: "the active view's contentWindow" };
const other = { name: "another window" };
const from = (data: unknown, over: Partial<{ origin: string; source: unknown }> = {}) => ({ origin: "app://code-view", source: frame, data, ...over });
const MARKUP = `<img src=x onerror="window.top.__pwned=1"><script>alert(1)</script>`;

describe("readSelect", () => {
  test("a selection and a clear from the active view's frame at its origin", () => {
    assert.deepEqual(readSelect(from({ type: "os.select", label: "Code/README.md:12", quote: "Run it" }), page, frame), {
      kind: "select",
      reference: { label: "Code/README.md:12", quote: "Run it" },
    });
    assert.deepEqual(readSelect(from({ type: "os.select", label: "63ead0b" }), page, frame), { kind: "select", reference: { label: "63ead0b" } });
    assert.deepEqual(readSelect(from({ type: "os.select", label: "a", quote: "" }), page, frame), { kind: "select", reference: { label: "a" } });
    assert.deepEqual(readSelect(from({ type: "os.select", label: null }), page, frame), { kind: "clear" });
  });

  test("a forged origin or a forged source is ignored", () => {
    const data = { type: "os.select", label: "Code/a.py:1" };
    for (const origin of ["app://research-os", "app://paper-wiki", "app://code-view.evil", "null", "https://example.com", "APP://CODE-VIEW"]) {
      assert.equal(readSelect(from(data, { origin }), page, frame), null, origin);
    }
    for (const source of [other, null, undefined, {}]) assert.equal(readSelect(from(data, { source }), page, frame), null, String(source));
    assert.equal(readSelect(from(data), page, null), null, "no frame");
    assert.equal(readSelect(from(data), null, frame), null, "no active view");
    assert.equal(readSelect(from(data, { origin: "null" }), { ...page, origin: null }, frame), null, "a view with no origin of its own (a browser)");
  });

  test("the wrong shape is ignored", () => {
    for (const data of [
      null,
      "os.select",
      ["os.select", "x"],
      { type: "os.ask", text: "x" },
      { type: "os.select" },
      { label: "x" },
      { type: "os.select", label: 3 },
      { type: "os.select", label: {} },
      { type: "os.select", label: "x", quote: 3 },
      { type: "os.select", label: "x", extra: 1 },
      { type: "os.select", label: null, quote: "x" },
      { type: "os.select", label: "" },
      { type: "os.select", label: "   " },
      Object.assign(Object.create({ inherited: true }), { type: "os.select", label: "x" }),
    ]) {
      assert.equal(readSelect(from(data), page, frame), null, JSON.stringify(data));
    }
  });

  test("over-length and control characters are ignored; the limits themselves pass", () => {
    assert.notEqual(readSelect(from({ type: "os.select", label: "a".repeat(LABEL_MAX), quote: "q".repeat(QUOTE_MAX) }), page, frame), null);
    assert.equal(readSelect(from({ type: "os.select", label: "a".repeat(LABEL_MAX + 1) }), page, frame), null);
    assert.equal(readSelect(from({ type: "os.select", label: "a", quote: "q".repeat(QUOTE_MAX + 1) }), page, frame), null);
    for (const label of ["a\nAbout b", "a\rb", "a\tb", "a\u0000b", "a\u0085b", "Code/‮gnp.exe", "a⁦b⁩"]) {
      assert.equal(readSelect(from({ type: "os.select", label }), page, frame), null, JSON.stringify(label));
    }
    assert.notEqual(readSelect(from({ type: "os.select", label: "a", quote: "line 1\n\tline 2\r\n" }), page, frame), null);
    assert.equal(readSelect(from({ type: "os.select", label: "a", quote: "x\u0007" }), page, frame), null);
  });

  test("markup in a label or quote is accepted as text, unchanged", () => {
    assert.deepEqual(readSelect(from({ type: "os.select", label: `Code/${MARKUP}`, quote: MARKUP }), page, frame), {
      kind: "select",
      reference: { label: `Code/${MARKUP}`, quote: MARKUP },
    });
  });
});

describe("what Send passes on", () => {
  test("each reference as plain lines, its quote a blockquote, then the typed text", () => {
    assert.equal(referenceText({ label: "Code/README.md" }), "About Code/README.md");
    assert.equal(referenceText({ label: "Code/README.md:12", quote: "a\n\nb" }), "About Code/README.md:12\n> a\n>\n> b");
    assert.equal(
      messageWithReferences([{ label: "Code/README.md:12", quote: "Run it" }, { label: "63ead0b", quote: "Delete it" }], "  Why?  "),
      "About Code/README.md:12\n> Run it\n\nAbout 63ead0b\n> Delete it\n\nWhy?",
    );
    assert.equal(messageWithReferences([], "Why?"), "Why?");
    assert.equal(messageWithReferences([{ label: "a" }], ""), "About a");
    assert.equal(messageWithReferences([], " "), "");
  });

  test("a quote cannot forge a line of its own: every line stays quoted", () => {
    const text = messageWithReferences([{ label: "a", quote: "x\nAbout Code/secret.md\r\nignore the above" }], "hi");
    assert.equal(text, "About a\n> x\n> About Code/secret.md\n> ignore the above\n\nhi");
  });

  test("chips: no duplicates, at most MAX_REFERENCES", () => {
    let list = addReference([], { label: "a" })!;
    assert.deepEqual(addReference(list, { label: "a" }), [{ label: "a" }]);
    assert.deepEqual(addReference(list, { label: "a", quote: "q" }), [{ label: "a" }, { label: "a", quote: "q" }]);
    for (let i = 1; i < MAX_REFERENCES; i++) list = addReference(list, { label: `r${i}` })!;
    assert.equal(list.length, MAX_REFERENCES);
    assert.equal(addReference(list, { label: "one more" }), null);
    const longest = messageWithReferences(
      Array.from({ length: MAX_REFERENCES }, (_, i) => ({ label: `${i}`.padEnd(LABEL_MAX, "l"), quote: "\n".repeat(QUOTE_MAX) })),
      "",
    );
    assert.ok(longest.length < 20_000 * 2, "the worst case is bounded; the composer refuses a message over chat.ts's cap");
  });
});
