// Recursively renders children of a node
// children: { "B": { "D": {} }, "C": {} }
// prefix:   string of "│   " or "    " for visual indentation
function renderChildren(children, prefix) {
  const entries = Object.entries(children);
  return entries
    .map(([key, grandchildren], i) => {
      const isLast = i === entries.length - 1;
      const connector = isLast ? "└── " : "├── ";
      const nextPrefix = prefix + (isLast ? "    " : "│   ");
      const hasChildren = Object.keys(grandchildren).length > 0;

      return `<div class="tree-line">
        <span class="tree-mono">${escHtml(prefix)}${escHtml(connector)}</span>
        <span class="tree-node-label">${escHtml(key)}</span>
      </div>
      ${hasChildren ? renderChildren(grandchildren, nextPrefix) : ""}`;
    })
    .join("");
}

// Renders one hierarchy object
function renderHierarchy(h, index) {
  const badge = h.has_cycle
    ? `<span class="badge badge-cycle">Cyclic</span>`
    : `<span class="badge badge-depth">Depth: ${h.depth}</span>`;

  let treeContent;
  if (h.has_cycle) {
    treeContent = `<div class="cycle-notice">
      <span class="cycle-icon">⟳</span>
      <span>This group forms a cycle — no tree structure.</span>
    </div>`;
  } else {
    const [rootKey, rootChildren] = Object.entries(h.tree)[0];
    const childrenHTML = renderChildren(rootChildren, "");
    treeContent = `
      <div class="tree-line">
        <span class="tree-node-label tree-root-label">${escHtml(rootKey)}</span>
      </div>
      ${childrenHTML}`;
  }

  return `<div class="hierarchy-card" style="animation-delay: ${index * 60}ms">
    <div class="hierarchy-header">
      <span class="hierarchy-root">Root: <strong>${escHtml(h.root)}</strong></span>
      ${badge}
    </div>
    <div class="tree-block">${treeContent}</div>
  </div>`;
}

// Renders the full API response into the results section
function renderResponse(data, container) {
  const { hierarchies, invalid_entries, duplicate_edges, summary } = data;

  container.innerHTML = `
    ${renderSummary(summary)}

    <div class="section-title">Hierarchies <span class="count">${hierarchies.length}</span></div>
    <div class="hierarchies-grid">
      ${hierarchies.length
        ? hierarchies.map(renderHierarchy).join("")
        : `<p class="empty-note">No hierarchies found.</p>`}
    </div>

    <div class="meta-grid">
      ${renderTagList("Invalid Entries", invalid_entries, "tag-invalid")}
      ${renderTagList("Duplicate Edges", duplicate_edges, "tag-duplicate")}
    </div>
  `;
}

function renderSummary(summary) {
  return `<div class="summary-bar">
    <div class="stat-card">
      <span class="stat-value">${summary.total_trees}</span>
      <span class="stat-label">Valid Trees</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">${summary.total_cycles}</span>
      <span class="stat-label">Cyclic Groups</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">${summary.largest_tree_root ?? "—"}</span>
      <span class="stat-label">Deepest Root</span>
    </div>
  </div>`;
}

function renderTagList(title, items, tagClass) {
  const tags = items.length
    ? items.map((i) => `<span class="tag ${tagClass}">${escHtml(i)}</span>`).join("")
    : `<span class="empty-note">None</span>`;

  return `<div class="meta-card">
    <div class="section-title">${title} <span class="count">${items.length}</span></div>
    <div class="tag-list">${tags}</div>
  </div>`;
}

function renderError(message, container) {
  container.innerHTML = `<div class="error-card">
    <span class="error-icon">✕</span>
    <span>${escHtml(message)}</span>
  </div>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
