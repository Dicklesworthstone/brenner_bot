/**
 * Tests for hypothesis-history.ts - Hypothesis Version History & Evolution Graph
 *
 * Tests the version tracking and evolution graph system.
 *
 * @see brenner_bot-7usw (bead)
 */
import { describe, expect, it } from "vitest";
import type { HypothesisCard } from "./hypothesis";
import { createHypothesisCard, generateHypothesisCardId } from "./hypothesis";
import {
  abandonHypothesis,
  addRootHypothesis,
  createHistoryStore,
  diffHypotheses,
  EVOLUTION_TRIGGER_LABELS,
  type EvolutionTrigger,
  evolveHypothesis,
  findByTimeRange,
  findByTrigger,
  findCommonAncestor,
  generateEvolutionGraph,
  generateLineageGraph,
  getAncestors,
  getDescendants,
  getEvolutionStats,
  getLeaves,
  getRoot,
  isAncestor,
} from "./hypothesis-history";

// ============================================================================
// Test Fixtures
// ============================================================================

function makeHypothesis(
  sessionId: string,
  seq: number,
  overrides: Partial<HypothesisCard> = {},
): HypothesisCard {
  return createHypothesisCard({
    id: overrides.id ?? generateHypothesisCardId(sessionId, seq),
    statement: overrides.statement ?? `Test hypothesis statement ${seq}`,
    mechanism: overrides.mechanism ?? `Test mechanism for ${seq}`,
    domain: overrides.domain ?? ["test"],
    predictionsIfTrue: overrides.predictionsIfTrue ?? ["Prediction true"],
    predictionsIfFalse: overrides.predictionsIfFalse ?? ["Prediction false"],
    impossibleIfTrue: overrides.impossibleIfTrue ?? ["Falsifier observation"],
    confidence: overrides.confidence ?? 50,
    sessionId,
  });
}

// ============================================================================
// Store Creation Tests
// ============================================================================

describe("hypothesis history store", () => {
  it("creates an empty store with createHistoryStore()", () => {
    const store = createHistoryStore();

    expect(store.versions).toEqual({});
    expect(store.roots).toEqual([]);
    expect(store.current).toEqual([]);
    expect(store.abandoned).toEqual([]);
  });
});

// ============================================================================
// Evolution Trigger Tests
// ============================================================================

describe("evolution triggers", () => {
  it("has labels for all triggers", () => {
    const triggers: EvolutionTrigger[] = [
      "manual",
      "level_split",
      "exclusion_test",
      "object_transpose",
      "scale_check",
      "evidence",
      "agent_feedback",
    ];

    for (const trigger of triggers) {
      expect(EVOLUTION_TRIGGER_LABELS[trigger]).toBeDefined();
      expect(EVOLUTION_TRIGGER_LABELS[trigger].length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Root Hypothesis Tests
// ============================================================================

describe("addRootHypothesis", () => {
  it("adds a root hypothesis to an empty store", () => {
    const store = createHistoryStore();
    const hypothesis = makeHypothesis("SESSION-1", 1);

    const { version, store: newStore } = addRootHypothesis(
      store,
      hypothesis,
      "Initial hypothesis",
      "user@test.com",
    );

    expect(version.id).toBe(hypothesis.id);
    expect(version.hypothesis).toEqual(hypothesis);
    expect(version.parentId).toBeUndefined();
    expect(version.children).toEqual([]);
    expect(version.trigger).toBe("manual");
    expect(version.message).toBe("Initial hypothesis");
    expect(version.createdBy).toBe("user@test.com");

    expect(newStore.versions[version.id]).toEqual(version);
    expect(newStore.roots).toContain(version.id);
    expect(newStore.current).toContain(version.id);
  });

  it("adds multiple root hypotheses", () => {
    const store = createHistoryStore();
    const h1 = makeHypothesis("SESSION-1", 1);
    const h2 = makeHypothesis("SESSION-1", 2);

    const { store: store1 } = addRootHypothesis(store, h1, "First hypothesis");
    const { store: store2 } = addRootHypothesis(store1, h2, "Second hypothesis");

    expect(store2.roots).toHaveLength(2);
    expect(store2.current).toHaveLength(2);
  });
});

// ============================================================================
// Hypothesis Evolution Tests
// ============================================================================

describe("evolveHypothesis", () => {
  it("creates a new version from an existing hypothesis", () => {
    const store = createHistoryStore();
    const hypothesis = makeHypothesis("SESSION-1", 1);
    const { store: store1, version: v1 } = addRootHypothesis(store, hypothesis, "Initial");

    const { version: v2, store: store2 } = evolveHypothesis(
      store1,
      v1.id,
      { statement: "Evolved statement" },
      "evidence",
      "Evidence caused refinement",
      "user@test.com",
      "EV-001",
    );

    expect(v2.hypothesis.statement).toBe("Evolved statement");
    expect(v2.parentId).toBe(v1.id);
    expect(v2.trigger).toBe("evidence");
    expect(v2.message).toBe("Evidence caused refinement");
    expect(v2.relatedEntityId).toBe("EV-001");

    // Parent should have child
    expect(store2.versions[v1.id].children).toContain(v2.id);

    // Current should be updated
    expect(store2.current).toContain(v2.id);
    expect(store2.current).not.toContain(v1.id);
  });

  it("throws for non-existent version", () => {
    const store = createHistoryStore();

    expect(() => {
      evolveHypothesis(store, "NON-EXISTENT", {}, "manual", "Test");
    }).toThrow("Hypothesis version not found");
  });
});

// ============================================================================
// Abandon Hypothesis Tests
// ============================================================================

describe("abandonHypothesis", () => {
  it("marks a hypothesis as abandoned", () => {
    const store = createHistoryStore();
    const hypothesis = makeHypothesis("SESSION-1", 1);
    const { store: store1, version } = addRootHypothesis(store, hypothesis, "Initial");

    const store2 = abandonHypothesis(store1, version.id);

    expect(store2.current).not.toContain(version.id);
    expect(store2.abandoned).toContain(version.id);
  });

  it("throws for non-existent version", () => {
    const store = createHistoryStore();

    expect(() => {
      abandonHypothesis(store, "NON-EXISTENT");
    }).toThrow("Hypothesis version not found");
  });
});

// ============================================================================
// Navigation Tests
// ============================================================================

describe("getAncestors", () => {
  it("returns empty array for root hypothesis", () => {
    const store = createHistoryStore();
    const hypothesis = makeHypothesis("SESSION-1", 1);
    const { store: store1, version } = addRootHypothesis(store, hypothesis, "Initial");

    const ancestors = getAncestors(store1, version.id);
    expect(ancestors).toEqual([]);
  });

  it("returns ancestors from child to root", () => {
    const store = createHistoryStore();
    const h = makeHypothesis("SESSION-1", 1);
    const { store: s1, version: v1 } = addRootHypothesis(store, h, "Initial");
    const { store: s2, version: v2 } = evolveHypothesis(s1, v1.id, {}, "manual", "Evolve 1");
    const { store: s3, version: v3 } = evolveHypothesis(s2, v2.id, {}, "manual", "Evolve 2");

    const ancestors = getAncestors(s3, v3.id);
    expect(ancestors).toHaveLength(2);
    expect(ancestors[0].id).toBe(v2.id);
    expect(ancestors[1].id).toBe(v1.id);
  });
});

describe("getDescendants", () => {
  it("returns empty array for leaf hypothesis", () => {
    const store = createHistoryStore();
    const hypothesis = makeHypothesis("SESSION-1", 1);
    const { store: store1, version } = addRootHypothesis(store, hypothesis, "Initial");

    const descendants = getDescendants(store1, version.id);
    expect(descendants).toEqual([]);
  });

  it("returns empty array for missing version id", () => {
    const store = createHistoryStore();
    expect(getDescendants(store, "NON-EXISTENT")).toEqual([]);
  });

  it("returns all descendants breadth-first", () => {
    const store = createHistoryStore();
    const h = makeHypothesis("SESSION-1", 1);
    const { store: s1, version: v1 } = addRootHypothesis(store, h, "Initial");
    const { store: s2, version: v2 } = evolveHypothesis(s1, v1.id, {}, "manual", "Evolve 1");
    const { store: s3, version: v3 } = evolveHypothesis(s2, v2.id, {}, "manual", "Evolve 2");

    const descendants = getDescendants(s3, v1.id);
    expect(descendants).toHaveLength(2);
    expect(descendants[0].id).toBe(v2.id);
    expect(descendants[1].id).toBe(v3.id);
  });
});

describe("getRoot", () => {
  it("returns the version itself if it is a root", () => {
    const store = createHistoryStore();
    const hypothesis = makeHypothesis("SESSION-1", 1);
    const { store: store1, version } = addRootHypothesis(store, hypothesis, "Initial");

    const root = getRoot(store1, version.id);
    expect(root?.id).toBe(version.id);
  });

  it("returns the root ancestor", () => {
    const store = createHistoryStore();
    const h = makeHypothesis("SESSION-1", 1);
    const { store: s1, version: v1 } = addRootHypothesis(store, h, "Initial");
    const { store: s2, version: v2 } = evolveHypothesis(s1, v1.id, {}, "manual", "Evolve 1");
    const { store: s3, version: v3 } = evolveHypothesis(s2, v2.id, {}, "manual", "Evolve 2");

    const root = getRoot(s3, v3.id);
    expect(root?.id).toBe(v1.id);
  });
});

describe("getLeaves", () => {
  it("returns root itself if no descendants", () => {
    const store = createHistoryStore();
    const hypothesis = makeHypothesis("SESSION-1", 1);
    const { store: store1, version } = addRootHypothesis(store, hypothesis, "Initial");

    const leaves = getLeaves(store1, version.id);
    expect(leaves).toHaveLength(1);
    expect(leaves[0].id).toBe(version.id);
  });

  it("returns leaves for all roots when versionId is omitted", () => {
    const store = createHistoryStore();
    const h1 = makeHypothesis("SESSION-1", 1);
    const h2 = makeHypothesis("SESSION-1", 2);

    const { store: s1, version: v1 } = addRootHypothesis(store, h1, "Root 1");
    const { store: s2 } = addRootHypothesis(s1, h2, "Root 2");
    const { store: s3, version: v2 } = evolveHypothesis(s2, v1.id, {}, "manual", "Evolve Root 1");

    const leaves = getLeaves(s3);
    const leafIds = new Set(leaves.map((v) => v.id));

    expect(leaves).toHaveLength(2);
    expect(leafIds.has(v2.id)).toBe(true);
    expect(leafIds.has(h2.id)).toBe(true);
  });

  it("returns all leaf descendants", () => {
    const store = createHistoryStore();
    const h = makeHypothesis("SESSION-1", 1);
    const { store: s1, version: v1 } = addRootHypothesis(store, h, "Initial");
    const { store: s2, version: v2 } = evolveHypothesis(s1, v1.id, {}, "manual", "Branch A");
    const { store: s3, version: v3 } = evolveHypothesis(s2, v2.id, {}, "manual", "Leaf A");

    const leaves = getLeaves(s3, v1.id);
    expect(leaves).toHaveLength(1);
    expect(leaves[0].id).toBe(v3.id);
  });
});

// ============================================================================
// Common Ancestor Tests
// ============================================================================

describe("findCommonAncestor", () => {
  it("returns undefined for unrelated hypotheses", () => {
    const store = createHistoryStore();
    const h1 = makeHypothesis("SESSION-1", 1);
    const h2 = makeHypothesis("SESSION-1", 2);
    const { store: s1, version: v1 } = addRootHypothesis(store, h1, "First");
    const { store: s2, version: v2 } = addRootHypothesis(s1, h2, "Second");

    const ancestor = findCommonAncestor(s2, v1.id, v2.id);
    expect(ancestor).toBeUndefined();
  });

  it("finds common ancestor for related hypotheses", () => {
    const store = createHistoryStore();
    const h = makeHypothesis("SESSION-1", 1);
    const { store: s1, version: v1 } = addRootHypothesis(store, h, "Initial");
    const { store: s2, version: v2 } = evolveHypothesis(s1, v1.id, {}, "manual", "Branch A");
    const { store: s3, version: v3 } = evolveHypothesis(s2, v2.id, {}, "manual", "Leaf A");

    const ancestor = findCommonAncestor(s3, v2.id, v3.id);
    expect(ancestor?.id).toBe(v2.id);
  });
});

// ============================================================================
// Diff Tests
// ============================================================================

describe("diffHypotheses", () => {
  it("identifies changes between versions", () => {
    const store = createHistoryStore();
    const h = makeHypothesis("SESSION-1", 1, { statement: "Original hypothesis statement" });
    const { store: s1, version: v1 } = addRootHypothesis(store, h, "Initial");
    const { version: v2 } = evolveHypothesis(
      s1,
      v1.id,
      { statement: "Changed hypothesis statement", mechanism: "New mechanism for testing" },
      "manual",
      "Updated",
    );

    const diff = diffHypotheses(v1.hypothesis, v2.hypothesis);

    expect(diff.changes.length).toBeGreaterThan(0);
    expect(diff.changes.some((c) => c.field === "statement")).toBe(true);
  });

  it("returns empty changes for identical hypotheses", () => {
    const h = makeHypothesis("SESSION-1", 1);
    const diff = diffHypotheses(h, h);

    expect(diff.changes).toHaveLength(0);
  });
});

// ============================================================================
// Graph Generation Tests
// ============================================================================

describe("generateEvolutionGraph", () => {
  it("generates a graph from the store", () => {
    const store = createHistoryStore();
    const h = makeHypothesis("SESSION-1", 1);
    const { store: s1, version: v1 } = addRootHypothesis(store, h, "Initial");
    const { store: s2, version: v2 } = evolveHypothesis(s1, v1.id, {}, "manual", "Evolved");

    const graph = generateEvolutionGraph(s2);

    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].from).toBe(v1.id);
    expect(graph.edges[0].to).toBe(v2.id);
  });

  it("generates empty graph for empty store", () => {
    const store = createHistoryStore();
    const graph = generateEvolutionGraph(store);

    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
  });
});

describe("generateLineageGraph", () => {
  it("generates a lineage graph for a specific hypothesis", () => {
    const store = createHistoryStore();
    const h = makeHypothesis("SESSION-1", 1);
    const { store: s1, version: v1 } = addRootHypothesis(store, h, "Initial");
    const { store: s2, version: v2 } = evolveHypothesis(s1, v1.id, {}, "manual", "Evolved");
    const { store: s3 } = evolveHypothesis(s2, v2.id, {}, "manual", "Further");

    const graph = generateLineageGraph(s3, v2.id);

    // Should include the version, its ancestors, and its descendants
    expect(graph.nodes.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Stats Tests
// ============================================================================

describe("getEvolutionStats", () => {
  it("calculates stats for the store", () => {
    const store = createHistoryStore();
    const h = makeHypothesis("SESSION-1", 1);
    const { store: s1, version: v1 } = addRootHypothesis(store, h, "Initial");
    const { store: s2 } = evolveHypothesis(s1, v1.id, {}, "evidence", "Evolved");

    const stats = getEvolutionStats(s2);

    expect(stats.totalVersions).toBe(2);
    expect(stats.rootCount).toBe(1);
    expect(stats.currentCount).toBe(1);
    expect(stats.abandonedCount).toBe(0);
    expect(stats.triggerCounts).toBeDefined();
  });

  it("returns zeros for empty store", () => {
    const store = createHistoryStore();
    const stats = getEvolutionStats(store);

    expect(stats.totalVersions).toBe(0);
  });
});

// ============================================================================
// Query Tests
// ============================================================================

describe("findByTrigger", () => {
  it("finds versions by trigger type", () => {
    const store = createHistoryStore();
    const h = makeHypothesis("SESSION-1", 1);
    const { store: s1, version: v1 } = addRootHypothesis(store, h, "Initial");
    const { store: s2, version: v2 } = evolveHypothesis(s1, v1.id, {}, "evidence", "By evidence");

    const evidenceVersions = findByTrigger(s2, "evidence");
    expect(evidenceVersions).toHaveLength(1);
    expect(evidenceVersions[0].id).toBe(v2.id);

    const manualVersions = findByTrigger(s2, "manual");
    expect(manualVersions).toHaveLength(1);
    expect(manualVersions[0].id).toBe(v1.id);
  });
});

describe("findByTimeRange", () => {
  it("finds versions within a time range", () => {
    const store = createHistoryStore();
    const h = makeHypothesis("SESSION-1", 1);
    const { store: s1, version: v1 } = addRootHypothesis(store, h, "Initial");

    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const hourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    const versions = findByTimeRange(s1, hourAgo, hourFromNow);
    expect(versions).toHaveLength(1);
    expect(versions[0].id).toBe(v1.id);
  });

  it("returns empty array when no versions in range", () => {
    const store = createHistoryStore();
    const h = makeHypothesis("SESSION-1", 1);
    const { store: s1 } = addRootHypothesis(store, h, "Initial");

    const future = new Date(Date.now() + 100000);
    const farFuture = new Date(Date.now() + 200000);

    const versions = findByTimeRange(s1, future, farFuture);
    expect(versions).toHaveLength(0);
  });
});

// ============================================================================
// Relationship Tests
// ============================================================================

describe("isAncestor", () => {
  it("returns true for actual ancestor", () => {
    const store = createHistoryStore();
    const h = makeHypothesis("SESSION-1", 1);
    const { store: s1, version: v1 } = addRootHypothesis(store, h, "Initial");
    const { store: s2, version: v2 } = evolveHypothesis(s1, v1.id, {}, "manual", "Evolved");

    expect(isAncestor(s2, v1.id, v2.id)).toBe(true);
  });

  it("returns false for non-ancestor", () => {
    const store = createHistoryStore();
    const h = makeHypothesis("SESSION-1", 1);
    const { store: s1, version: v1 } = addRootHypothesis(store, h, "Initial");
    const { store: s2, version: v2 } = evolveHypothesis(s1, v1.id, {}, "manual", "Evolved");

    // v2 is not an ancestor of v1
    expect(isAncestor(s2, v2.id, v1.id)).toBe(false);
  });

  it("returns false for same version", () => {
    const store = createHistoryStore();
    const h = makeHypothesis("SESSION-1", 1);
    const { store: s1, version: v1 } = addRootHypothesis(store, h, "Initial");

    expect(isAncestor(s1, v1.id, v1.id)).toBe(false);
  });
});
