/**
 * tests/bfhl.test.js
 *
 * Full test-suite for POST /bfhl.
 * Covers:  PDF example | validation | duplicates | cycle | multi-parent |
 *          depth | summary | edge cases | error handling
 */

const request = require("supertest");
const app = require("../app");

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
async function post(data) {
  return request(app).post("/bfhl").send({ data });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1.  Identity fields present
// ─────────────────────────────────────────────────────────────────────────────
describe("Identity fields", () => {
  test("Response always contains user_id, email_id, college_roll_number", async () => {
    const res = await post(["A->B"]);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("user_id");
    expect(res.body).toHaveProperty("email_id");
    expect(res.body).toHaveProperty("college_roll_number");
    expect(typeof res.body.user_id).toBe("string");
    expect(res.body.user_id.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2.  Validation — invalid entries
// ─────────────────────────────────────────────────────────────────────────────
describe("Validation – invalid_entries", () => {
  test('"hello" → invalid', async () => {
    const res = await post(["hello"]);
    expect(res.body.invalid_entries).toContain("hello");
  });

  test('"1->2" → invalid (not uppercase)', async () => {
    const res = await post(["1->2"]);
    expect(res.body.invalid_entries).toContain("1->2");
  });

  test('"AB->C" → invalid (multi-char parent)', async () => {
    const res = await post(["AB->C"]);
    expect(res.body.invalid_entries).toContain("AB->C");
  });

  test('"A-B" → invalid (wrong separator)', async () => {
    const res = await post(["A-B"]);
    expect(res.body.invalid_entries).toContain("A-B");
  });

  test('"A->" → invalid (missing child)', async () => {
    const res = await post(["A->"]);
    expect(res.body.invalid_entries).toContain("A->");
  });

  test('"A->A" → invalid (self-loop)', async () => {
    const res = await post(["A->A"]);
    expect(res.body.invalid_entries).toContain("A->A");
  });

  test('"" → invalid (empty string)', async () => {
    const res = await post([""]);
    expect(res.body.invalid_entries).toContain("");
  });

  test('" A->B " → trimmed first, then VALID', async () => {
    const res = await post([" A->B "]);
    expect(res.body.invalid_entries).not.toContain("A->B");
    expect(res.body.hierarchies.some((h) => h.root === "A")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3.  Duplicate edges
// ─────────────────────────────────────────────────────────────────────────────
describe("Duplicate edges", () => {
  test("Second occurrence of A->B goes to duplicate_edges", async () => {
    const res = await post(["A->B", "A->B"]);
    expect(res.body.duplicate_edges).toContain("A->B");
  });

  test("Three occurrences → only ONE entry in duplicate_edges", async () => {
    const res = await post(["A->B", "A->B", "A->B"]);
    const count = res.body.duplicate_edges.filter((e) => e === "A->B").length;
    expect(count).toBe(1);
  });

  test("First occurrence is still used in tree", async () => {
    const res = await post(["A->B", "A->B"]);
    const treeA = res.body.hierarchies.find((h) => h.root === "A");
    expect(treeA).toBeDefined();
    expect(treeA.tree["A"]).toHaveProperty("B");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4.  Simple tree
// ─────────────────────────────────────────────────────────────────────────────
describe("Simple tree construction", () => {
  test("A->B, A->C produces tree with A as root, depth 2", async () => {
    const res = await post(["A->B", "A->C"]);
    const h = res.body.hierarchies.find((h) => h.root === "A");
    expect(h).toBeDefined();
    expect(h.depth).toBe(2);
    expect(h.tree["A"]).toHaveProperty("B");
    expect(h.tree["A"]).toHaveProperty("C");
    expect(h.has_cycle).toBeUndefined();
  });

  test("A->B->C chain has depth 3", async () => {
    const res = await post(["A->B", "B->C"]);
    const h = res.body.hierarchies.find((h) => h.root === "A");
    expect(h.depth).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5.  Cycle detection
// ─────────────────────────────────────────────────────────────────────────────
describe("Cycle detection", () => {
  test("X->Y->Z->X is a cycle: has_cycle=true, tree={}", async () => {
    const res = await post(["X->Y", "Y->Z", "Z->X"]);
    const h = res.body.hierarchies.find((h) => h.has_cycle === true);
    expect(h).toBeDefined();
    expect(h.tree).toEqual({});
    expect(h.depth).toBeUndefined();
  });

  test("Cyclic group: no depth field", async () => {
    const res = await post(["A->B", "B->A"]);
    const h = res.body.hierarchies.find((h) => h.has_cycle);
    expect(h.depth).toBeUndefined();
  });

  test("Non-cyclic tree: has_cycle NOT present", async () => {
    const res = await post(["A->B"]);
    const h = res.body.hierarchies.find((h) => h.root === "A");
    expect(h.has_cycle).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6.  Multi-parent (diamond) — first edge wins
// ─────────────────────────────────────────────────────────────────────────────
describe("Multi-parent (diamond) handling", () => {
  test("A->D and B->D: first wins, second silently discarded", async () => {
    const res = await post(["A->D", "B->D"]);
    // D should be child of A (first encountered)
    const hA = res.body.hierarchies.find((h) => h.root === "A");
    expect(hA.tree["A"]).toHaveProperty("D");
    // B->D discarded → B becomes its own root (no children, no parent)
    const hB = res.body.hierarchies.find((h) => h.root === "B");
    expect(hB).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7.  PDF full example
// ─────────────────────────────────────────────────────────────────────────────
describe("PDF exact example", () => {
  let body;

  beforeAll(async () => {
    const res = await post([
      "A->B", "A->C", "B->D", "C->E", "E->F",
      "X->Y", "Y->Z", "Z->X",
      "P->Q", "G->R",
      "G->H", "G->H", "G->I",
      "hello", "1->2", "A->",
    ]);
    body = res.body;
  });

  test("status 200", async () => {
    const res = await post(["A->B"]);
    expect(res.status).toBe(200);
  });

  test("invalid_entries contains hello, 1->2, A->", () => {
    expect(body.invalid_entries).toContain("hello");
    expect(body.invalid_entries).toContain("1->2");
    expect(body.invalid_entries).toContain("A->");
  });

  test("duplicate_edges contains G->H", () => {
    expect(body.duplicate_edges).toContain("G->H");
  });

  test("A tree: root=A, depth=4", () => {
    const h = body.hierarchies.find((h) => h.root === "A");
    expect(h).toBeDefined();
    expect(h.depth).toBe(4);
    expect(h.has_cycle).toBeUndefined();
  });

  test("A tree structure correct", () => {
    const h = body.hierarchies.find((h) => h.root === "A");
    expect(h.tree["A"]["B"]["D"]).toEqual({});
    expect(h.tree["A"]["C"]["E"]["F"]).toEqual({});
  });

  test("X cycle detected", () => {
    const h = body.hierarchies.find((h) => h.has_cycle);
    expect(h).toBeDefined();
    expect(h.tree).toEqual({});
  });

  test("P tree: root=P, depth=2", () => {
    const h = body.hierarchies.find((h) => h.root === "P");
    expect(h).toBeDefined();
    expect(h.depth).toBe(2);
  });

  test("G tree: root=G, depth=2, children R,H,I", () => {
    const h = body.hierarchies.find((h) => h.root === "G");
    expect(h).toBeDefined();
    expect(h.depth).toBe(2);
    expect(h.tree["G"]).toHaveProperty("R");
    expect(h.tree["G"]).toHaveProperty("H");
    expect(h.tree["G"]).toHaveProperty("I");
  });

  test("summary: total_trees=3, total_cycles=1, largest_tree_root=A", () => {
    expect(body.summary.total_trees).toBe(3);
    expect(body.summary.total_cycles).toBe(1);
    expect(body.summary.largest_tree_root).toBe("A");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8.  Summary rules
// ─────────────────────────────────────────────────────────────────────────────
describe("Summary rules", () => {
  test("largest_tree_root: tiebreak by lex smallest root", async () => {
    // A->B (depth 2) and C->D (depth 2) → largest = A (lex smaller)
    const res = await post(["A->B", "C->D"]);
    expect(res.body.summary.largest_tree_root).toBe("A");
  });

  test("total_trees counts only non-cyclic trees", async () => {
    const res = await post(["A->B", "X->Y", "Y->X"]);
    expect(res.body.summary.total_trees).toBe(1);
    expect(res.body.summary.total_cycles).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9.  Error handling
// ─────────────────────────────────────────────────────────────────────────────
describe("Error handling", () => {
  test("Missing data field → 400", async () => {
    const res = await request(app).post("/bfhl").send({});
    expect(res.status).toBe(400);
  });

  test("data not array → 400", async () => {
    const res = await request(app).post("/bfhl").send({ data: "A->B" });
    expect(res.status).toBe(400);
  });

  test("Empty data array → 200 with empty hierarchies", async () => {
    const res = await post([]);
    expect(res.status).toBe(200);
    expect(res.body.hierarchies).toEqual([]);
    expect(res.body.invalid_entries).toEqual([]);
    expect(res.body.duplicate_edges).toEqual([]);
  });

  test("Unknown route → 404", async () => {
    const res = await request(app).get("/unknown");
    expect(res.status).toBe(404);
  });

  test("GET /health → 200", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
  });
});
