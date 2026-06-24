function buildGraph(validEdges) {
  const childToParent = new Map();
  const children = new Map();
  const allNodes = new Set();

  for (const { parent, child } of validEdges) {
    allNodes.add(parent);
    allNodes.add(child);

    if (!children.has(parent)) children.set(parent, []);
    if (!children.has(child)) children.set(child, []);

    if (childToParent.has(child)) continue;

    childToParent.set(child, parent);
    children.get(parent).push(child);
  }

  return { children, childToParent, allNodes };
}

function findComponents(allNodes, children, childToParent) {
  const visited = new Set();
  const components = [];

  const neighbours = new Map();
  for (const node of allNodes) {
    if (!neighbours.has(node)) neighbours.set(node, new Set());
    for (const c of (children.get(node) || [])) {
      neighbours.get(node).add(c);
      if (!neighbours.has(c)) neighbours.set(c, new Set());
      neighbours.get(c).add(node);
    }
  }

  for (const node of allNodes) {
    if (visited.has(node)) continue;
    const component = new Set();
    const queue = [node];
    while (queue.length) {
      const cur = queue.shift();
      if (visited.has(cur)) continue;
      visited.add(cur);
      component.add(cur);
      for (const nb of (neighbours.get(cur) || [])) {
        if (!visited.has(nb)) queue.push(nb);
      }
    }
    components.push(component);
  }

  return components;
}

function hasCycleInComponent(nodes, children) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map();
  for (const n of nodes) color.set(n, WHITE);

  function dfs(u) {
    color.set(u, GRAY);
    for (const v of (children.get(u) || [])) {
      if (color.get(v) === GRAY) return true;
      if (color.get(v) === WHITE && dfs(v)) return true;
    }
    color.set(u, BLACK);
    return false;
  }

  for (const n of nodes) {
    if (color.get(n) === WHITE && dfs(n)) return true;
  }
  return false;
}

function buildTree(root, children) {
  const subtree = {};
  for (const child of (children.get(root) || [])) {
    subtree[child] = buildTree(child, children)[child];
  }
  return { [root]: subtree };
}

function calcDepth(node, children) {
  const kids = children.get(node) || [];
  if (kids.length === 0) return 1;
  return 1 + Math.max(...kids.map((c) => calcDepth(c, children)));
}

function buildHierarchies(validEdges) {
  const { children, childToParent, allNodes } = buildGraph(validEdges);
  const components = findComponents(allNodes, children, childToParent);
  const hierarchies = [];

  for (const component of components) {
    const cyclic = hasCycleInComponent(component, children);

    const nonChildNodes = [...component]
      .filter((n) => !childToParent.has(n))
      .sort();

    if (cyclic) {
      const root =
        nonChildNodes.length > 0
          ? nonChildNodes[0]
          : [...component].sort()[0];

      hierarchies.push({ root, tree: {}, has_cycle: true });
    } else {
      const roots = nonChildNodes.length > 0 ? nonChildNodes : [[...component].sort()[0]];

      for (const root of roots) {
        const tree = buildTree(root, children);
        const depth = calcDepth(root, children);
        hierarchies.push({ root, tree, depth });
      }
    }
  }

  hierarchies.sort((a, b) => {
    if (a.has_cycle && !b.has_cycle) return 1;
    if (!a.has_cycle && b.has_cycle) return -1;
    return a.root.localeCompare(b.root);
  });

  return hierarchies;
}

function buildSummary(hierarchies) {
  const nonCyclic = hierarchies.filter((h) => !h.has_cycle);
  const total_trees = nonCyclic.length;
  const total_cycles = hierarchies.length - total_trees;

  let largest_tree_root = null;
  let maxDepth = -1;

  for (const h of nonCyclic) {
    if (
      h.depth > maxDepth ||
      (h.depth === maxDepth && h.root.localeCompare(largest_tree_root) < 0)
    ) {
      maxDepth = h.depth;
      largest_tree_root = h.root;
    }
  }

  return { total_trees, total_cycles, largest_tree_root };
}

module.exports = { buildHierarchies, buildSummary };
