/**
 * The vendored PDF.js is exactly what vendor/README.md records (the Human
 * Owner's 2026-11-22 authorization, HANDOFF.md Decisions): three files, each
 * with the SHA-256 the README gives, from the version it names, and no npm
 * package anywhere in os-ui. A file changed, added, or swapped fails here.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { DOCUMENT_OPTIONS } from "./pdfjs.ts";

const SITE = dirname(fileURLToPath(import.meta.url));
const VENDOR = join(SITE, "vendor");
const OS_UI = join(SITE, "../../../..");
const README = readFileSync(join(VENDOR, "README.md"), "utf8");
const sha256 = (file: string) => createHash("sha256").update(readFileSync(join(VENDOR, file))).digest("hex");

/** The README's table: file name → SHA-256. */
function recorded(): Map<string, string> {
  const rows = [...README.matchAll(/^\| `([^`]+)` \| `[^`]+` \| `([0-9a-f]{64})` \|$/gm)];
  return new Map(rows.map((m) => [m[1]!, m[2]!]));
}

describe("the vendored PDF.js", () => {
  test("the folder holds the three files the README lists, and the README", () => {
    // Dot files (a Finder .DS_Store) are never tracked; anything else here would ship.
    assert.deepEqual(readdirSync(VENDOR).filter((f) => !f.startsWith(".")).sort(), ["LICENSE", "README.md", "pdf.min.mjs", "pdf.worker.min.mjs"]);
    assert.deepEqual([...recorded().keys()].sort(), ["LICENSE", "pdf.min.mjs", "pdf.worker.min.mjs"]);
  });

  test("each file's SHA-256 is the one the README records", () => {
    for (const [file, hash] of recorded()) assert.equal(sha256(file), hash, `${file} differs from vendor/README.md`);
  });

  test("the version the README names is the one in both files, and the licence is Apache-2.0", () => {
    const version = /`pdfjs-dist` (\d+\.\d+\.\d+)/.exec(README)?.[1];
    assert.equal(version, "6.5.438");
    for (const file of ["pdf.min.mjs", "pdf.worker.min.mjs"]) {
      assert.match(readFileSync(join(VENDOR, file), "utf8").slice(0, 2000), new RegExp(`pdfjsVersion = ${version!.replace(/\./g, "\\.")}\\b`), file);
    }
    assert.match(readFileSync(join(VENDOR, "LICENSE"), "utf8"), /^\s*Apache License\s+Version 2\.0, January 2004/);
    assert.match(README, /https:\/\/registry\.npmjs\.org\/pdfjs-dist\/-\/pdfjs-dist-6\.5\.438\.tgz/);
  });

  test("neither file evaluates code: there is no eval( or new Function( to switch off", () => {
    for (const file of ["pdf.min.mjs", "pdf.worker.min.mjs"]) {
      const text = readFileSync(join(VENDOR, file), "utf8");
      assert.doesNotMatch(text, /\bnew Function\s*\(/, file);
      assert.doesNotMatch(text, /(^|[^\w$.])eval\s*\(/, file);
    }
  });

  test("this PDF.js reads every option the page sets, and has no isEvalSupported", () => {
    const lib = readFileSync(join(VENDOR, "pdf.min.mjs"), "utf8");
    for (const option of Object.keys(DOCUMENT_OPTIONS)) assert.match(lib, new RegExp(`\\.${option}\\b`), option);
    assert.doesNotMatch(lib, /isEvalSupported/);
  });

  test("no package.json or lockfile in os-ui names pdfjs-dist or its native dependency", () => {
    const manifests: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name.startsWith(".") || entry.name === "out" || entry.name === "release" || entry.name === "dist") continue;
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (entry.name === "package.json" || entry.name === "package-lock.json") manifests.push(path);
      }
    };
    walk(OS_UI);
    assert.ok(manifests.length >= 4, `found the frontend's and the client's manifests: ${manifests.map((m) => relative(OS_UI, m)).join(", ")}`);
    for (const file of manifests) assert.doesNotMatch(readFileSync(file, "utf8"), /pdfjs-dist|@napi-rs\/canvas/, relative(OS_UI, file));
  });
});
