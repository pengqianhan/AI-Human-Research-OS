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
          color: (ele) => (ele.data("kind") === "container" ? "#17262E" : "#52646E"),
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
          "border-color": "#17262E",
          "transition-property": "opacity",
          "transition-duration": "150ms",
        },
      },
      {
        selector: 'node[kind = "container"].open',
        style: { "border-width": 4, "border-color": "#E8590C" },
      },
      {
        selector: "node:selected",
        style: { "border-width": 4, "border-color": "#B7791F" },
      },
      {
        selector: "edge",
        style: {
          width: 1.5,
          "line-color": "#D9E0E2",
          "curve-style": "bezier",
          "transition-property": "opacity",
          "transition-duration": "150ms",
        },
      },
      {
        selector: "edge.citation",
        style: { "line-style": "dashed", "line-color": "#8A979E" },
      },
      {
        selector: "edge:selected",
        style: { "line-color": "#B7791F", width: 2.5 },
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
    if (currentDetail === id) renderDetailActions(id);
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
    // reveal hidden papers that match
    searchRevealed = q
      ? new Set(
          paperNodes
            .filter((p) => matchesQuery(p.data, q))
            .map((p) => p.data.id)
        )
      : new Set();
    sync();
    renderTimeline();
  });

  function matchesQuery(d, q) {
    if (!q) return true;
    const hay =
      (d.label || "").toLowerCase() +
      " " +
      d.id.toLowerCase() +
      " " +
      (d.tags || []).join(" ").toLowerCase();
    return hay.includes(q);
  }

  // ---------- detail pane ----------
  let currentDetail = null;
  let currentLanguage = "en";

  function clearSelection() {
    selectedId = null;
    currentDetail = null;
    cy.elements().unselect();
    applyDimming();
    highlightTimelineRow(null);
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

  function renderDetailActions(id) {
    const holder = document.getElementById("detail-actions");
    holder.innerHTML = "";
    const d = nodeIndex[id];
    if (!d) return;
    const localized = bundle.localizedNotes && bundle.localizedNotes[id];
    if (d.type === "Paper" && localized) {
      const languageBtn = document.createElement("button");
      languageBtn.id = "detail-language-toggle";
      languageBtn.textContent = currentLanguage === "en" ? "中文" : "English";
      languageBtn.title =
        currentLanguage === "en" ? "Show Chinese note" : "Show English note";
      languageBtn.setAttribute("aria-label", languageBtn.title);
      languageBtn.addEventListener("click", () => {
        currentLanguage = currentLanguage === "en" ? "zh" : "en";
        renderNoteBody(id);
        renderDetailActions(id);
      });
      holder.appendChild(languageBtn);
      return;
    }
    if (d.type === "Paper") return;
    const cnt = countPapers(id);
    if (!cnt) return;
    const btn = document.createElement("button");
    btn.id = "detail-toggle";
    btn.textContent = expanded.has(id)
      ? `Collapse ${plural(cnt, "paper")}`
      : `Expand ${plural(cnt, "paper")}`;
    btn.addEventListener("click", () => {
      toggleContainer(id);
      renderDetailActions(id);
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
    highlightTimelineRow(conceptId);

    document.getElementById("detail-empty").hidden = true;
    document.getElementById("detail-content").hidden = false;

    const chip = document.getElementById("detail-type");
    chip.textContent = data.type;
    chip.style.background = data.color;

    document.getElementById("detail-title").textContent = data.label;
    document.getElementById("detail-id").textContent = conceptId;
    document.getElementById("detail-description").textContent =
      data.description || "—";

    renderDetailActions(conceptId);

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

    renderNoteBody(conceptId);

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

  function renderNoteBody(conceptId) {
    const data = nodeIndex[conceptId];
    const localized = bundle.localizedNotes && bundle.localizedNotes[conceptId];
    const showChinese = currentLanguage === "zh" && localized;
    const body = showChinese ? localized.body : bundle.bodies[conceptId] || "";
    document.getElementById("detail-title").textContent =
      showChinese && localized.title ? localized.title : data.label;
    const bodyEl = document.getElementById("detail-body");
    bodyEl.innerHTML = marked.parse(body, { breaks: false, gfm: true });
    rewriteInternalLinks(bodyEl, conceptId);
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

  // ---------- timeline ----------
  // Reading surface: papers and non-paper sources in date order. Topics and
  // concepts are left out — they are rewritten repeatedly, so their timestamp
  // means "last touched", which reads as noise in a chronological feed.
  const TIMELINE_TYPES = new Set(["Paper", "Reference"]);
  const STATUS_GLYPH = { unread: "●", summarized: "○", read: "✓" };
  const SORT_KEYS = {
    added: (d) => d.timestamp || "",
    published: (d) => d.submitted || d.published || "",
  };
  const timelineEntries = bundle.nodes
    .map((n) => n.data)
    .filter((d) => TIMELINE_TYPES.has(d.type));
  let sortKey = "added";
  let sortDesc = true;

  function sortedTimelineEntries() {
    const dateOf = SORT_KEYS[sortKey];
    const q = document.getElementById("search").value.trim().toLowerCase();
    const rows = timelineEntries.filter((d) => matchesQuery(d, q));
    const dir = sortDesc ? 1 : -1;
    rows.sort((a, b) => {
      const da = dateOf(a);
      const db = dateOf(b);
      // Undated entries sink to the bottom whichever way the rest is running.
      if (!da !== !db) return da ? -1 : 1;
      if (da !== db) return da < db ? dir : -dir;
      // Same day (timestamps are often midnight): keep a stable, meaningful
      // order instead of letting the sort drift between reloads.
      const sa = SORT_KEYS.published(a);
      const sb = SORT_KEYS.published(b);
      if (sa !== sb) return sa < sb ? 1 : -1;
      return a.id < b.id ? -1 : 1;
    });
    return rows;
  }

  function timelineGroupKey(d) {
    const date = SORT_KEYS[sortKey](d);
    return date ? date.slice(0, 7) : "undated";
  }

  function monthHeader(key, count) {
    const li = document.createElement("li");
    li.className = "tl-month";
    const label = document.createElement("span");
    label.textContent = key === "undated" ? "No date" : key;
    const n = document.createElement("span");
    n.textContent = count;
    li.append(label, n);
    return li;
  }

  function timelineRow(d) {
    const date = SORT_KEYS[sortKey](d);
    const li = document.createElement("li");
    li.className = "tl-row";
    li.dataset.id = d.id;
    if (d.id === selectedId) li.classList.add("selected");
    if (d.description) li.title = d.description;

    const day = document.createElement("span");
    day.className = "tl-day";
    day.textContent = date ? date.slice(8, 10) : "—";

    const status = document.createElement("span");
    status.className = "tl-status " + (d.status || "");
    status.textContent = STATUS_GLYPH[d.status] || "·";
    if (d.status) status.title = d.status;

    const title = document.createElement("span");
    title.className = "tl-title";
    title.textContent = d.label;

    li.append(day, status, title);
    li.addEventListener("click", () => showDetail(d.id));
    return li;
  }

  function renderTimeline() {
    const list = document.getElementById("timeline-list");
    list.innerHTML = "";
    const rows = sortedTimelineEntries();
    if (!rows.length) {
      const li = document.createElement("li");
      li.className = "tl-empty";
      li.textContent = "No entry matches the search.";
      list.appendChild(li);
      return;
    }
    const counts = new Map();
    for (const d of rows) {
      const key = timelineGroupKey(d);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    let group = null;
    for (const d of rows) {
      const key = timelineGroupKey(d);
      if (key !== group) {
        group = key;
        list.appendChild(monthHeader(key, counts.get(key)));
      }
      list.appendChild(timelineRow(d));
    }
  }

  function highlightTimelineRow(id) {
    document.querySelectorAll("#timeline-list .tl-row").forEach((li) => {
      li.classList.toggle("selected", li.dataset.id === id);
    });
  }

  function updateSortControls() {
    for (const key of Object.keys(SORT_KEYS)) {
      document
        .getElementById("sort-" + key)
        .classList.toggle("active", sortKey === key);
    }
    const btn = document.getElementById("sort-direction");
    btn.textContent = sortDesc ? "↓" : "↑";
    btn.title = sortDesc ? "Newest first" : "Oldest first";
  }

  for (const key of Object.keys(SORT_KEYS)) {
    document.getElementById("sort-" + key).addEventListener("click", () => {
      if (sortKey === key) return;
      sortKey = key;
      updateSortControls();
      renderTimeline();
    });
  }
  document.getElementById("sort-direction").addEventListener("click", () => {
    sortDesc = !sortDesc;
    updateSortControls();
    renderTimeline();
  });

  // ---------- view tabs ----------
  const VIEW_HINTS = {
    graph: "Click a node for details · double-click a topic to expand",
    timeline: "Click an entry to read its note · sort by added or published date",
  };
  const graphOnlyControls = ["expand-all", "collapse-all", "reset"].map((id) =>
    document.getElementById(id)
  );
  let currentView = "graph";
  let graphNeedsFit = false;

  function setView(view, updateHash) {
    currentView = view;
    document.getElementById("graph-wrap").hidden = view !== "graph";
    document.getElementById("timeline-wrap").hidden = view !== "timeline";
    document.getElementById("hints-graph").hidden = view !== "graph";
    document.getElementById("hints-timeline").hidden = view !== "timeline";
    for (const btn of graphOnlyControls) btn.hidden = view !== "graph";
    for (const name of ["graph", "timeline"]) {
      document
        .getElementById("tab-" + name)
        .classList.toggle("active", name === view);
    }
    document.getElementById("view-hint").textContent = VIEW_HINTS[view];

    if (view === "graph") {
      // Cytoscape measured a hidden (zero-sized) container while the timeline
      // was up, so it has to re-measure before it draws again.
      cy.resize();
      if (graphNeedsFit) {
        fitClamped();
        graphNeedsFit = false;
      }
    } else {
      const row = document.querySelector("#timeline-list .tl-row.selected");
      if (row) row.scrollIntoView({ block: "nearest" });
    }
    if (updateHash !== false && location.hash !== "#" + view)
      location.hash = view;
  }

  document
    .getElementById("tab-graph")
    .addEventListener("click", () => setView("graph"));
  document
    .getElementById("tab-timeline")
    .addEventListener("click", () => setView("timeline"));
  window.addEventListener("hashchange", () => {
    const view = location.hash === "#timeline" ? "timeline" : "graph";
    if (view !== currentView) setView(view, false);
  });

  renderLegend();
  updateSortControls();
  renderTimeline();
  const bootView = location.hash === "#timeline" ? "timeline" : "graph";
  graphNeedsFit = bootView === "timeline";
  setView(bootView, false);
})();
