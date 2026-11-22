# Vendored PDF.js

The Paper view draws `paper/main.pdf` with Mozilla's PDF.js. The Human Owner
authorized vendoring it on 2026-11-22 ([HANDOFF.md](../../../../../../HANDOFF.md)
Decisions, "Paper view renderer"): only the two files below and the package's
licence, copied unmodified, never installed through npm (the package's optional
native dependency `@napi-rs/canvas` would otherwise enter `npm ci`).

- Package: `pdfjs-dist` 6.5.438 (`latest` on the npm registry on 2026-11-23;
  PDF.js build `0a4153349`), Apache License 2.0.
- Source: <https://registry.npmjs.org/pdfjs-dist/-/pdfjs-dist-6.5.438.tgz>,
  checked before anything was copied against the registry's published
  integrity
  `sha512-vg8Pw1x+AFKy4AMDvhuWl5cOYV8d698UoEANoFFhc79hqXDnZQqnOXoxw3HG907WHOg1JYOvLhP756boddFxpA==`
  (and its SHA-1 `e7f8986ec4ea04057b5d9d2f0e5b63ea94d2303f`).
- `LICENSE` is the package's own; it is byte-identical to `LICENSE` at the tag
  `v6.5.438` of <https://github.com/mozilla/pdf.js>. The package has no
  `NOTICE` file.

| File | From the package | SHA-256 |
|---|---|---|
| `pdf.min.mjs` | `build/pdf.min.mjs` | `3a88402882cfa3e7e72c2c9b5149f52f0f88baf1c5b62aa11a41abdbc2072440` |
| `pdf.worker.min.mjs` | `build/pdf.worker.min.mjs` | `1e64c8240e54735ec5913b37acd5134747799cb8c6bb3777c70adbc01232d2aa` |
| `LICENSE` | `LICENSE` | `0d542e0c8804e39aa7f37eb00da5a762149dc682d7829451287e11b938e94594` |

`../vendor.test.ts` recomputes these hashes on every `npm test`, checks that
this folder holds exactly these files and this README, and that no
`package.json` or lockfile in `os-ui/` names `pdfjs-dist` or `@napi-rs/canvas`.
`.gitattributes` marks the three files `binary`, so no checkout converts their
line endings. `client/scripts/build.mjs` copies the folder as it is into
`out/plugins/paper-view/site/vendor/`; the page loads both files at run time
(`../pdfjs.ts`), so neither is bundled or rewritten.

Not vendored, so not available to the view: the package's `cmaps/`,
`standard_fonts/`, `iccs/`, and `wasm/` folders (CJK fonts without embedded
data, JPX and JBIG2 images, and ICC colour profiles do not render as in a full
PDF reader), `pdf.renderer.min.mjs` (drawing in a worker), `pdf.sandbox.min.mjs`
(the PDF's own JavaScript, which the view never runs), and `web/` (the
viewer). The text layer's style rules in `../style.css` are written for the
markup PDF.js's `TextLayer` produces and follow `web/pdf_viewer.css`'s
`.textLayer` section.

To update: download the new `pdfjs-dist` tarball from the registry into an
empty folder, check its SHA-512 against `npm view pdfjs-dist@<version>
dist.integrity`, copy the same three files over these, and update the version,
the integrity, and the table above; `npm test` fails until they match.
