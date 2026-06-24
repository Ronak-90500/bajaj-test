const VALID_EDGE_RE = /^[A-Z]->[A-Z]$/;

function processEntries(data) {
  const invalidEntries = [];
  const duplicateEdges = [];
  const validEdges = [];
  const seen = new Set();

  for (const raw of data) {
    const entry = typeof raw === "string" ? raw.trim() : String(raw).trim();

    if (!VALID_EDGE_RE.test(entry)) {
      invalidEntries.push(entry);
      continue;
    }

    const [parent, child] = entry.split("->");

    if (parent === child) {
      invalidEntries.push(entry);
      continue;
    }

    const key = `${parent}->${child}`;

    if (seen.has(key)) {
      if (!duplicateEdges.includes(key)) duplicateEdges.push(key);
      continue;
    }

    seen.add(key);
    validEdges.push({ parent, child });
  }

  return { invalidEntries, duplicateEdges, validEdges };
}

module.exports = { processEntries };
