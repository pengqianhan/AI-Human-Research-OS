(function () {
  const bundle = window.BUNDLE;
  const bundleName = window.BUNDLE_NAME;
  document.title = `${bundleName} — OKF Viewer`;
  document.getElementById("bundle-name").textContent = bundleName;

  // ---------- data prep ----------
  const nodeIndex = {};
  for (const n of bundle.nodes) nodeIndex[n.data.id] = n.data;
  const isPaper = (id) => nodeIndex[id] && nodeIndex[id].type === "Paper";

  // Directed backlinks (for the detail pane "Cited by" list)
  const dirBacklinks = {};
  for (const e of bundle.edges) {
    const { source, target } = e.data;
    (dirBacklinks[target] ||= []).push(source);
  }

  // Undirected, deduplicated edge set (for drawing: A->B and B->A become one line)
  const pairKey = (a, b) => (a < b ? a + "|" + b : b + "|" + a);
  const undirected = new Map();
  for (const e of bundle.edges) {
    const { source, target } = e.data;
    if (!nodeIndex[source] || !nodeIndex[target] || source === target) continue;
    undirected.set(pairKey(source, target), { a: source, b: target });
  }
  const neighbors = {};
  for (const { a, b } of undirected.values()) {
    (neighbors[a] ||= new Set()).add(b);
    (neighbors[b] ||= new Set()).add(a);
  }

  const containerNodes = bundle.nodes.filter((n) => n.data.type !== "Paper");
  const paperNodes = bundle.nodes.filter((n) => n.data.type === "Paper");

  const countPapers = (cid) =>
    [...(neighbors[cid] || [])].filter((x) => isPaper(x)).length;

  const paperContainers = (pid) =>
    [...(neighbors[pid] || [])].filter((x) => !isPaper(x)).sort();

  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  function shortLabel(text, max) {
    if (!text) return text;
    return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
  }
  function containerEl(n) {
    const cnt = countPapers(n.data.id);
    return {
      data: {
        ...n.data,
        kind: "container",
        count: cnt,
        size: 26 + Math.min(28, cnt * 4),
      },
    };
  }
  function paperEl(n) {
    return {
      data: {
        ...n.data,
        kind: "paper",
        size: 16,
        shortLabel: shortLabel(n.data.label, 20),
      },
    };
  }
  const paperElById = {};
  for (const p of paperNodes) paperElById[p.data.id] = paperEl(p);

  // ---------- boot: containers only, deterministic grid ----------
  // Collapsed, the containers have no edges between them, so a force layout
  // just clumps them. A grid is deterministic and keeps labels from colliding.
  const sortedContainers = [...containerNodes].sort((x, y) =>
    x.data.id < y.data.id ? -1 : 1
  );
  const CELL_W = 300;
  const CELL_H = 210;
  const MAX_FIT_ZOOM = 1.15;
  function fitClamped() {
    cy.fit(null, 45);
    if (cy.zoom() > MAX_FIT_ZOOM) {
      cy.zoom(MAX_FIT_ZOOM);
      cy.center();
    }
  }
  function gridPosition(i, total) {
    const cols = Math.max(1, Math.ceil(Math.sqrt(total * 1.6)));
    const rows = Math.ceil(total / cols);
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      x: (col - (cols - 1) / 2) * CELL_W,
      y: (row - (rows - 1) / 2) * CELL_H,
    };
  }
  const seeded = sortedContainers.map((n, i) => ({
    ...containerEl(n),
    position: gridPosition(i, sortedContainers.length),
  }));

  const expanded = new Set();
  let searchRevealed = new Set();
  let typeFilter = null;

  const cy = cytoscape({
    container: document.getElementById("graph"),
    elements: seeded,
    style: [
      {
        selector: "node",
        style: {
          "background-color": "data(color)",
          label: (ele) => {
            const d = ele.data();
            if (d.kind === "container")
              return d.count > 0 && !expanded.has(d.id)
                ? `${d.label}  (${d.count})`
                : d.label;
            return d.shortLabel || d.label;
          },
          color: (ele) => (ele.data("kind") === "container" ? "#0f172a" : "#475569"),
          "font-size": (ele) => (ele.data("kind") === "container" ? 11 : 9),
          "font-weight": (ele) => (ele.data("kind") === "container" ? 700 : 500),
          "text-valign": "bottom",
          "text-margin-y": 4,
          "text-wrap": "wrap",
          "text-max-width": (ele) =>
            ele.data("kind") === "container" ? 120 : 110,
          "text-background-color": "#ffffff",
          "text-background-opacity": 0.72,
          "text-background-padding": 1,
          "min-zoomed-font-size": 6,
          width: "data(size)",
          height: "data(size)",
          "border-width": 1.5,
          "border-color": "#0f172a",
          "transition-property": "opacity",
          "transition-duration": "150ms",
        },
      },
      {
        selector: 'node[kind = "container"].open',
        style: { "border-width": 4, "border-color": "#334155" },
      },
      {
        selector: "node:selected",
        style: { "border-width": 4, "border-color": "#f59e0b" },
      },
      {
        selector: "edge",
        style: {
          width: 1.5,
          "line-color": "#cbd5e1",
          "curve-style": "bezier",
          "transition-property": "opacity",
          "transition-duration": "150ms",
        },
      },
      {
        selector: "edge.citation",
        style: { "line-style": "dashed", "line-color": "#94a3b8" },
      },
      {
        selector: "edge:selected",
        style: { "line-color": "#f59e0b", width: 2.5 },
      },
      { selector: ".dim", style: { opacity: 0.12 } },
    ],
    layout: { name: "preset" },
    wheelSensitivity: 0.2,
  });

  // Home positions = the deterministic grid (used by collapse / reset).
  const home = {};
  sortedContainers.forEach((n, i) =>
    (home[n.data.id] = gridPosition(i, sortedContainers.length))
  );
  fitClamped();

  // ---------- expand / collapse ----------
  function requiredPaperIds() {
    const req = new Set();
    for (const p of paperNodes) {
      const pid = p.data.id;
      const cs = paperContainers(pid);
      if (cs.length === 0 || cs.some((c) => expanded.has(c))) req.add(pid);
    }
    for (const pid of searchRevealed) req.add(pid);
    return req;
  }

  function placeNewPapers(pids, anchorId) {
    // Group new papers by the container they should fan around.
    const groups = {};
    for (const pid of [...pids].sort()) {
      const cs = paperContainers(pid);
      let host =
        anchorId && cs.includes(anchorId)
          ? anchorId
          : cs.find((c) => expanded.has(c)) || cs[0];
      (groups[host || "__free__"] ||= []).push(pid);
    }
    for (const [host, ids] of Object.entries(groups)) {
      const hostNode = host !== "__free__" ? cy.$id(host) : null;
      const cx = hostNode && hostNode.length ? hostNode.position("x") : 0;
      const cyy = hostNode && hostNode.length ? hostNode.position("y") : 0;
      const r =
        (hostNode && hostNode.length ? hostNode.data("size") / 2 : 20) + 85;
      ids.forEach((pid, i) => {
        const angle = (2 * Math.PI * i) / ids.length + 0.5;
        cy.add({
          ...paperElById[pid],
          position: { x: cx + r * Math.cos(angle), y: cyy + r * Math.sin(angle) },
        });
      });
    }
  }

  function rebuildEdges() {
    const want = new Map();
    for (const [key, { a, b }] of undirected) {
      if (cy.$id(a).length && cy.$id(b).length) want.set("u|" + key, { a, b });
    }
    cy.edges().forEach((e) => {
      if (!want.has(e.id())) e.remove();
      else want.delete(e.id());
    });
    for (const [id, { a, b }] of want) {
      const cls = isPaper(a) && isPaper(b) ? "citation" : "membership";
      cy.add({ data: { id, source: a, target: b }, classes: cls });
    }
  }

  function refreshContainers() {
    cy.nodes('[kind = "container"]').forEach((n) => {
      n.toggleClass("open", expanded.has(n.id()));
    });
    cy.style().update(); // re-evaluate label/size functions
  }

  function sync(anchorId) {
    const req = requiredPaperIds();
    cy.nodes('[kind = "paper"]').forEach((n) => {
      if (!req.has(n.id())) n.remove();
    });
    const missing = [...req].filter((pid) => !cy.$id(pid).length);
    placeNewPapers(missing, anchorId);
    rebuildEdges();
    refreshContainers();
    applyDimming();
  }

  function toggleContainer(id) {
    if (expanded.has(id)) expanded.delete(id);
    else expanded.add(id);
    sync(id);
    if (currentDetail === id) renderExpandButton(id);
  }

  function expandAll() {
    for (const c of containerNodes) expanded.add(c.data.id);
    sync();
    cy.layout({
      name: "fcose",
      quality: "proof",
      randomize: false,
      animate: false,
      padding: 40,
      nodeRepulsion: 16000,
      idealEdgeLength: 120,
      nodeSeparation: 140,
    }).run();
    fitClamped();
  }

  function collapseAll() {
    expanded.clear();
    searchRevealed.clear();
    document.getElementById("search").value = "";
    sync();
    cy.nodes('[kind = "container"]').positions((n) => home[n.id()]);
    fitClamped();
  }

  function resetView() {
    typeFilter = null;
    renderLegend();
    collapseAll();
    clearSelection();
  }

  // ---------- dimming: selection > search > type filter ----------
  let selectedId = null;

  function applyDimming() {
    cy.elements().removeClass("dim");
    const q = document.getElementById("search").value.trim().toLowerCase();
    if (selectedId && cy.$id(selectedId).length) {
      const hood = cy.$id(selectedId).closedNeighborhood();
      cy.elements().not(hood).addClass("dim");
      return;
    }
    if (q) {
      cy.nodes().forEach((n) => {
        const d = n.data();
        const hay =
          (d.label || "").toLowerCase() +
          " " +
          d.id.toLowerCase() +
          " " +
          (d.tags || []).join(" ").toLowerCase();
        n.toggleClass("dim", !hay.includes(q));
      });
    } else if (typeFilter) {
      cy.nodes().forEach((n) =>
        n.toggleClass("dim", n.data("type") !== typeFilter)
      );
    }
    cy.edges().forEach((e) =>
      e.toggleClass(
        "dim",
        e.source().hasClass("dim") || e.target().hasClass("dim")
      )
    );
  }

  // ---------- legend ----------
  function renderLegend() {
    const el = document.getElementById("legend");
    el.innerHTML = "";
    const present = bundle.types.filter((t) =>
      bundle.nodes.some((n) => n.data.type === t)
    );
    for (const t of present) {
      const item = document.createElement("button");
      item.className = "legend-item" + (typeFilter === t ? " active" : "");
      const dot = document.createElement("span");
      dot.className = "legend-dot";
      dot.style.background = bundle.palette[t] || "#64748b";
      item.appendChild(dot);
      item.appendChild(document.createTextNode(t));
      item.addEventListener("click", () => {
        typeFilter = typeFilter === t ? null : t;
        selectedId = null;
        cy.elements().unselect();
        renderLegend();
        applyDimming();
      });
      el.appendChild(item);
    }
  }

  // ---------- interactions ----------
  let lastTap = { id: null, t: 0 };
  cy.on("tap", "node", (evt) => {
    const id = evt.target.id();
    const now = Date.now();
    if (lastTap.id === id && now - lastTap.t < 350) {
      lastTap = { id: null, t: 0 };
      if (evt.target.data("kind") === "container") toggleContainer(id);
      return;
    }
    lastTap = { id, t: now };
    showDetail(id);
  });
  cy.on("tap", (evt) => {
    if (evt.target === cy) clearSelection();
  });

  document.getElementById("expand-all").addEventListener("click", expandAll);
  document.getElementById("collapse-all").addEventListener("click", collapseAll);
  document.getElementById("reset").addEventListener("click", resetView);
  document.getElementById("search").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    selectedId = null;
    cy.elements().unselect();
    if (!q) {
      searchRevealed.clear();
      sync();
      return;
    }
    // reveal hidden papers that match
    searchRevealed = new Set(
      paperNodes
        .filter((p) => {
          const d = p.data;
          const hay =
            (d.label || "").toLowerCase() +
            " " +
            d.id.toLowerCase() +
            " " +
            (d.tags || []).join(" ").toLowerCase();
          return hay.includes(q);
        })
        .map((p) => p.data.id)
    );
    sync();
  });

  // ---------- detail pane ----------
  let currentDetail = null;

  function clearSelection() {
    selectedId = null;
    currentDetail = null;
    cy.elements().unselect();
    applyDimming();
    document.getElementById("detail-empty").hidden = false;
    document.getElementById("detail-content").hidden = true;
  }

  function ensureVisible(id) {
    if (cy.$id(id).length) return;
    if (isPaper(id)) {
      searchRevealed.add(id);
      sync();
    }
  }

  function renderExpandButton(id) {
    const holder = document.getElementById("detail-actions");
    holder.innerHTML = "";
    const d = nodeIndex[id];
    if (!d || d.type === "Paper") return;
    const cnt = countPapers(id);
    if (!cnt) return;
    const btn = document.createElement("button");
    btn.id = "detail-toggle";
    btn.textContent = expanded.has(id)
      ? `Collapse ${plural(cnt, "paper")}`
      : `Expand ${plural(cnt, "paper")}`;
    btn.addEventListener("click", () => {
      toggleContainer(id);
      renderExpandButton(id);
      selectedId = id;
      applyDimming();
    });
    holder.appendChild(btn);
  }

  function showDetail(conceptId) {
    const data = nodeIndex[conceptId];
    if (!data) return;
    ensureVisible(conceptId);
    cy.elements().unselect();
    const node = cy.$id(conceptId);
    if (node.length) node.select();
    selectedId = conceptId;
    currentDetail = conceptId;
    applyDimming();

    document.getElementById("detail-empty").hidden = true;
    document.getElementById("detail-content").hidden = false;

    const chip = document.getElementById("detail-type");
    chip.textContent = data.type;
    chip.style.background = data.color;

    document.getElementById("detail-title").textContent = data.label;
    document.getElementById("detail-id").textContent = conceptId;
    document.getElementById("detail-description").textContent =
      data.description || "—";

    renderExpandButton(conceptId);

    const resourceEl = document.getElementById("detail-resource");
    resourceEl.innerHTML = "";
    if (data.resource) {
      const a = document.createElement("a");
      a.href = data.resource;
      a.textContent = data.resource;
      a.target = "_blank";
      a.rel = "noopener";
      a.className = "external";
      resourceEl.appendChild(a);
    } else {
      resourceEl.textContent = "—";
    }

    const tagsEl = document.getElementById("detail-tags");
    tagsEl.innerHTML = "";
    if (data.tags && data.tags.length) {
      for (const t of data.tags) {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = t;
        tagsEl.appendChild(span);
      }
    } else {
      tagsEl.textContent = "—";
    }

    const body = bundle.bodies[conceptId] || "";
    const bodyEl = document.getElementById("detail-body");
    bodyEl.innerHTML = marked.parse(body, { breaks: false, gfm: true });
    rewriteInternalLinks(bodyEl, conceptId);

    const bl = dirBacklinks[conceptId] || [];
    const blSection = document.getElementById("detail-backlinks");
    const blList = document.getElementById("backlinks-list");
    blList.innerHTML = "";
    if (bl.length) {
      blSection.hidden = false;
      for (const src of bl) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.textContent = (nodeIndex[src] && nodeIndex[src].label) || src;
        a.addEventListener("click", () => showDetail(src));
        li.appendChild(a);
        blList.appendChild(li);
      }
    } else {
      blSection.hidden = true;
    }

    if (node.length)
      cy.animate(
        { center: { eles: node }, zoom: Math.max(cy.zoom(), 1.0) },
        { duration: 200 }
      );
  }

  // Resolve both /abs.md and relative ../topics/x.md links to concept ids
  function resolveConceptHref(baseId, href) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//")) return null;
    let path = href.split("#")[0];
    if (!path.endsWith(".md")) return null;
    if (path.startsWith("/")) path = path.slice(1);
    else {
      const dir = baseId.includes("/")
        ? baseId.slice(0, baseId.lastIndexOf("/") + 1)
        : "";
      path = dir + path;
    }
    const parts = [];
    for (const seg of path.split("/")) {
      if (seg === "." || seg === "") continue;
      if (seg === "..") parts.pop();
      else parts.push(seg);
    }
    const id = parts.join("/").replace(/\.md$/, "");
    return nodeIndex[id] ? id : null;
  }

  function rewriteInternalLinks(root, baseId) {
    root.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      if (!href) return;
      const target = resolveConceptHref(baseId, href);
      if (target) {
        a.className = "internal";
        a.setAttribute("href", "javascript:void(0)");
        a.addEventListener("click", (e) => {
          e.preventDefault();
          showDetail(target);
        });
        return;
      }
      a.className = "external";
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    });
  }

  // ---------- empty-state stats ----------
  (function initEmptyState() {
    const nPapers = paperNodes.length;
    const nTopics = containerNodes.filter((n) => n.data.type === "Topic").length;
    const nConcepts = containerNodes.length - nTopics;
    document.getElementById("stats").textContent =
      `${plural(nPapers, "paper")} · ${plural(nTopics, "topic")} · ${plural(
        nConcepts,
        "concept"
      )}`;
  })();

  renderLegend();
})();
