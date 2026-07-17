# Vendored viewer libraries

These JavaScript libraries are inlined into the generated `viz.html` so the
paper-wiki graph viewer is fully self-contained and works offline (no CDN, no
network). `generate_viz.py` concatenates them into the page at build time.

All are MIT-licensed. Files are unmodified copies fetched from the jsDelivr npm
mirror.

| File | Package | Version | Source |
|---|---|---|---|
| `cytoscape.min.js` | cytoscape | 3.28.1 | https://cdn.jsdelivr.net/npm/cytoscape@3.28.1/dist/cytoscape.min.js |
| `layout-base.js` | layout-base | 2.0.1 | https://cdn.jsdelivr.net/npm/layout-base@2.0.1/layout-base.js |
| `cose-base.js` | cose-base | 2.2.0 | https://cdn.jsdelivr.net/npm/cose-base@2.2.0/cose-base.js |
| `cytoscape-fcose.js` | cytoscape-fcose | 2.2.0 | https://cdn.jsdelivr.net/npm/cytoscape-fcose@2.2.0/cytoscape-fcose.js |
| `marked.min.js` | marked | 12.0.0 | https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js |

`layout-base` and `cose-base` are load-order dependencies of `cytoscape-fcose`
(the deterministic force layout); keep all five and load them in the order
listed above. To update a library, replace the file with the same-named build
from the matching npm version and bump the version in this table.
