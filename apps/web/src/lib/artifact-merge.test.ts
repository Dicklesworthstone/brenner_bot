/**
 * Tests for artifact merge algorithm.
 *
 * Verifies deterministic merging per artifact_delta_spec_v0.1.md
 *
 * Run with: cd apps/web && bun run test -- src/lib/artifact-merge.test.ts
 */

import { describe, expect, test } from "vitest";
import {
  createEmptyArtifact,
  createInterventionMetadata,
  extractReferences,
  formatLintReportHuman,
  formatLintReportJson,
  lintArtifact,
  mergeArtifact,
  mergeArtifactWithTimestamps,
  renderArtifactMarkdown,
  type Reference,
  type ReferenceRelation,
  type ResearchThreadItem,
  type HypothesisItem,
  type PredictionItem,
  type TestItem,
  type AssumptionItem,
  type AnomalyItem,
  type CritiqueItem,
  type ArtifactMetadata,
} from "./artifact-merge";
import {
  createEmptyInterventionSummary,
  type InterventionSummary,
} from "./schemas/operator-intervention";
import { type ValidDelta, type DeltaSection } from "./delta-parser";

// ============================================================================
// Test Helpers
// ============================================================================

function makeValidDelta(
  operation: "ADD" | "EDIT" | "KILL",
  section: DeltaSection,
  target_id: string | null,
  payload: Record<string, unknown>,
  rationale = "test",
): ValidDelta {
  return {
    valid: true,
    operation,
    section,
    target_id,
    payload,
    rationale,
    raw: JSON.stringify({ operation, section, target_id, payload }),
  };
}

function makeTimestampedDelta(
  operation: "ADD" | "EDIT" | "KILL",
  section: DeltaSection,
  target_id: string | null,
  payload: Record<string, unknown>,
  timestamp: string,
  agent: string,
): ValidDelta & { timestamp: string; agent: string } {
  return {
    ...makeValidDelta(operation, section, target_id, payload),
    timestamp,
    agent,
  };
}

// ============================================================================
// Tests: createEmptyArtifact
// ============================================================================

describe("createEmptyArtifact", () => {
  test("creates artifact with correct structure", () => {
    const artifact = createEmptyArtifact("TEST-001");

    expect(artifact.metadata.session_id).toBe("TEST-001");
    expect(artifact.metadata.version).toBe(0);
    expect(artifact.metadata.status).toBe("draft");
    expect(artifact.metadata.contributors).toEqual([]);

    expect(artifact.sections.research_thread).toBeNull();
    expect(artifact.sections.hypothesis_slate).toEqual([]);
    expect(artifact.sections.predictions_table).toEqual([]);
    expect(artifact.sections.discriminative_tests).toEqual([]);
    expect(artifact.sections.assumption_ledger).toEqual([]);
    expect(artifact.sections.anomaly_register).toEqual([]);
    expect(artifact.sections.adversarial_critique).toEqual([]);
  });
});

// ============================================================================
// Tests: ADD operations
// ============================================================================

describe("ADD operations", () => {
  test("adds hypothesis with auto-generated ID", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const delta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "Test Hypothesis",
      claim: "Something is true",
      mechanism: "Via some process",
    });

    const result = mergeArtifact(artifact, [delta], "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifact.sections.hypothesis_slate).toHaveLength(1);
    expect(result.artifact.sections.hypothesis_slate[0].id).toBe("H1");
    expect(result.artifact.sections.hypothesis_slate[0].name).toBe("Test Hypothesis");
  });

  test("ignores system-owned fields in ADD payload", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const delta = makeValidDelta("ADD", "hypothesis_slate", null, {
      id: "H999",
      killed: true,
      killed_by: "EvilAgent",
      killed_at: "2025-01-01T00:00:00Z",
      kill_reason: "override",
      name: "Test Hypothesis",
      claim: "Something is true",
      mechanism: "Via some process",
    });

    const result = mergeArtifact(artifact, [delta], "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const h1 = result.artifact.sections.hypothesis_slate[0];
    expect(h1.id).toBe("H1");
    expect(h1.killed).not.toBe(true);
    expect(h1.killed_by).toBeUndefined();
    expect(h1.killed_at).toBeUndefined();
    expect(h1.kill_reason).toBeUndefined();
  });

  test("warns and ignores forbidden payload keys in ADD payload (prototype pollution)", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const payload = JSON.parse(
      '{"__proto__":{"polluted":true},"name":"Test Hypothesis","claim":"Something is true","mechanism":"Via some process"}',
    ) as Record<string, unknown>;
    const delta = makeValidDelta("ADD", "hypothesis_slate", null, payload);

    const result = mergeArtifact(artifact, [delta], "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.warnings.some((w) => w.code === "FORBIDDEN_PAYLOAD_KEY")).toBe(true);

    const h1 = result.artifact.sections.hypothesis_slate[0] as unknown as Record<string, unknown>;
    expect(h1.name).toBe("Test Hypothesis");
    expect(h1.polluted).toBeUndefined();
    expect(Object.getPrototypeOf(h1)).toBe(Object.prototype);
  });

  test("sorts discriminative tests by score even when some score fields are missing", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const deltas: ValidDelta[] = [
      makeValidDelta("ADD", "discriminative_tests", null, {
        name: "Partial score",
        procedure: "Procedure",
        discriminates: "H1 vs H2",
        expected_outcomes: { H1: "A", H2: "B" },
        potency_check: "Control",
        score: { likelihood_ratio: 2 },
      }),
      makeValidDelta("ADD", "discriminative_tests", null, {
        name: "Missing LR score",
        procedure: "Procedure",
        discriminates: "H1 vs H2",
        expected_outcomes: { H1: "A", H2: "B" },
        potency_check: "Control",
        score: { cost: 1, speed: 1, ambiguity: 1 },
      }),
      makeValidDelta("ADD", "discriminative_tests", null, {
        name: "Full score",
        procedure: "Procedure",
        discriminates: "H1 vs H2",
        expected_outcomes: { H1: "A", H2: "B" },
        potency_check: "Control",
        score: { likelihood_ratio: 1, cost: 1, speed: 1, ambiguity: 1 },
      }),
      makeValidDelta("ADD", "discriminative_tests", null, {
        name: "No score",
        procedure: "Procedure",
        discriminates: "H1 vs H2",
        expected_outcomes: { H1: "A", H2: "B" },
        potency_check: "Control",
      }),
    ];

    const result = mergeArtifact(artifact, deltas, "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const names = result.artifact.sections.discriminative_tests.map((t) => t.name);
    expect(names).toEqual(["Full score", "Missing LR score", "Partial score", "No score"]);
  });

  test("assigns sequential IDs for multiple ADDs", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const deltas = [
      makeValidDelta("ADD", "hypothesis_slate", null, { name: "H1", claim: "A", mechanism: "M" }),
      makeValidDelta("ADD", "hypothesis_slate", null, { name: "H2", claim: "B", mechanism: "M" }),
      makeValidDelta("ADD", "hypothesis_slate", null, { name: "H3", claim: "C", mechanism: "M" }),
    ];

    const result = mergeArtifact(artifact, deltas, "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const hypotheses = result.artifact.sections.hypothesis_slate;
    expect(hypotheses).toHaveLength(3);
    expect(hypotheses[0].id).toBe("H1");
    expect(hypotheses[1].id).toBe("H2");
    expect(hypotheses[2].id).toBe("H3");
  });

  test("rejects ADD on research_thread", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const delta = makeValidDelta("ADD", "research_thread", null, {
      statement: "What is X?",
      context: "Background",
      why_it_matters: "Important",
    });

    const result = mergeArtifact(artifact, [delta], "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.errors[0].code).toBe("RT_ADD_NOT_ALLOWED");
  });

  test("enforces section limits", () => {
    const artifact = createEmptyArtifact("TEST-001");

    // Add 6 hypotheses (the limit)
    const deltas: ValidDelta[] = [];
    for (let i = 0; i < 7; i++) {
      deltas.push(
        makeValidDelta("ADD", "hypothesis_slate", null, {
          name: `H${i + 1}`,
          claim: `Claim ${i + 1}`,
          mechanism: "M",
        }),
      );
    }

    const result = mergeArtifact(artifact, deltas, "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.errors.some((e) => e.code === "SECTION_LIMIT_EXCEEDED")).toBe(true);
    expect(result.applied_count).toBe(6);
  });
});

// ============================================================================
// Tests: EDIT operations
// ============================================================================

describe("EDIT operations", () => {
  test("edits existing item", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const addDelta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "Original",
      claim: "Original claim",
      mechanism: "Original mechanism",
    });

    const afterAdd = mergeArtifact(artifact, [addDelta], "Agent1", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const editDelta = makeValidDelta("EDIT", "hypothesis_slate", "H1", {
      claim: "Updated claim",
    });

    const result = mergeArtifact(afterAdd.artifact, [editDelta], "Agent2", "2025-01-01T00:01:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifact.sections.hypothesis_slate[0].name).toBe("Original");
    expect(result.artifact.sections.hypothesis_slate[0].claim).toBe("Updated claim");
    expect(result.artifact.sections.hypothesis_slate[0].mechanism).toBe("Original mechanism");
  });

  test("ignores system-owned fields in EDIT payload", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const addDelta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "Original",
      claim: "Original claim",
      mechanism: "Original mechanism",
    });

    const afterAdd = mergeArtifact(artifact, [addDelta], "Agent1", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const editDelta = makeValidDelta("EDIT", "hypothesis_slate", "H1", {
      id: "H999",
      killed: true,
      killed_by: "EvilAgent",
      killed_at: "2025-01-01T00:01:00Z",
      kill_reason: "override",
      claim: "Updated claim",
    });

    const result = mergeArtifact(afterAdd.artifact, [editDelta], "Agent2", "2025-01-01T00:01:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const h1 = result.artifact.sections.hypothesis_slate[0];
    expect(h1.id).toBe("H1");
    expect(h1.killed).not.toBe(true);
    expect(h1.killed_by).toBeUndefined();
    expect(h1.killed_at).toBeUndefined();
    expect(h1.kill_reason).toBeUndefined();
    expect(h1.claim).toBe("Updated claim");
  });

  test("ignores forbidden payload keys (prototype pollution)", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const addDelta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "Original",
      claim: "Original claim",
      mechanism: "Original mechanism",
    });

    const afterAdd = mergeArtifact(artifact, [addDelta], "Agent1", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const payload = JSON.parse('{"__proto__":{"polluted":true},"claim":"Updated claim"}') as Record<string, unknown>;
    const editDelta = makeValidDelta("EDIT", "hypothesis_slate", "H1", payload);

    const result = mergeArtifact(afterAdd.artifact, [editDelta], "Agent2", "2025-01-01T00:01:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.warnings.some((w) => w.code === "FORBIDDEN_PAYLOAD_KEY")).toBe(true);

    const h1 = result.artifact.sections.hypothesis_slate[0] as unknown as Record<string, unknown>;
    expect(h1.claim).toBe("Updated claim");
    expect(h1.polluted).toBeUndefined();
    expect(Object.getPrototypeOf(h1)).toBe(Object.prototype);
  });

  test("creates research_thread on first EDIT", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const delta = makeValidDelta("EDIT", "research_thread", null, {
      id: "RT999",
      statement: "What is X?",
      context: "Background",
      why_it_matters: "Important",
    });

    const result = mergeArtifact(artifact, [delta], "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifact.sections.research_thread).not.toBeNull();
    expect(result.artifact.sections.research_thread?.id).toBe("RT");
    expect(result.artifact.sections.research_thread?.statement).toBe("What is X?");
  });

  test("ignores forbidden payload keys on research_thread (prototype pollution)", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const payload = JSON.parse('{"__proto__":{"polluted":true},"statement":"What is X?","context":"Background","why_it_matters":"Important"}') as Record<string, unknown>;
    const delta = makeValidDelta("EDIT", "research_thread", null, payload);

    const result = mergeArtifact(artifact, [delta], "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.warnings.some((w) => w.code === "FORBIDDEN_PAYLOAD_KEY")).toBe(true);

    const rt = result.artifact.sections.research_thread as unknown as Record<string, unknown> | null;
    expect(rt).not.toBeNull();
    if (!rt) return;

    expect(rt.polluted).toBeUndefined();
    expect(Object.getPrototypeOf(rt)).toBe(Object.prototype);
  });

  test("research_thread EDIT requires a payload object", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const delta: ValidDelta = {
      valid: true,
      operation: "EDIT",
      section: "research_thread",
      target_id: null,
      payload: "not-an-object" as unknown as ValidDelta["payload"],
      rationale: "test",
      raw: JSON.stringify({
        operation: "EDIT",
        section: "research_thread",
        target_id: null,
        payload: "not-an-object",
      }),
    };

    const result = mergeArtifact(artifact, [delta], "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]?.code).toBe("MISSING_REQUIRED_FIELD");
  });

  test("research_thread merges anchors by default and replaces when requested", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const create = makeValidDelta("EDIT", "research_thread", null, {
      statement: "What is X?",
      context: "Background",
      why_it_matters: "Important",
      anchors: "§1",
    });

    const afterCreate = mergeArtifact(artifact, [create], "Agent1", "2025-01-01T00:00:00Z");
    expect(afterCreate.ok).toBe(true);
    if (!afterCreate.ok) return;

    const mergeAnchors = makeValidDelta("EDIT", "research_thread", null, {
      anchors: ["§2", "§3"],
    });

    const afterMerge = mergeArtifact(afterCreate.artifact, [mergeAnchors], "Agent2", "2025-01-01T00:01:00Z");
    expect(afterMerge.ok).toBe(true);
    if (!afterMerge.ok) return;

    expect(afterMerge.artifact.sections.research_thread?.anchors).toEqual(["§2", "§3"]);

    const replaceAnchors = makeValidDelta("EDIT", "research_thread", null, {
      anchors: ["§9"],
      replace: true,
    });

    const afterReplace = mergeArtifact(afterMerge.artifact, [replaceAnchors], "Agent3", "2025-01-01T00:02:00Z");
    expect(afterReplace.ok).toBe(true);
    if (!afterReplace.ok) return;

    expect(afterReplace.artifact.sections.research_thread?.anchors).toEqual(["§9"]);

    const badAnchors: ValidDelta = {
      valid: true,
      operation: "EDIT",
      section: "research_thread",
      target_id: null,
      payload: { anchors: "§10" },
      rationale: "test",
      raw: JSON.stringify({
        operation: "EDIT",
        section: "research_thread",
        target_id: null,
        payload: { anchors: "§10" },
      }),
    };

    const afterBad = mergeArtifact(afterReplace.artifact, [badAnchors], "Agent4", "2025-01-01T00:03:00Z");
    expect(afterBad.ok).toBe(true);
    if (!afterBad.ok) return;

    expect(afterBad.artifact.sections.research_thread?.anchors).toEqual(["§9"]);
  });

  test("merges array fields by default", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const addDelta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "H1",
      claim: "Claim",
      mechanism: "M",
      anchors: ["§1", "§2"],
    });

    const afterAdd = mergeArtifact(artifact, [addDelta], "Agent1", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const editDelta = makeValidDelta("EDIT", "hypothesis_slate", "H1", {
      anchors: ["§3", "§4"],
    });

    const result = mergeArtifact(afterAdd.artifact, [editDelta], "Agent2", "2025-01-01T00:01:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const anchors = result.artifact.sections.hypothesis_slate[0].anchors;
    expect(anchors).toContain("§1");
    expect(anchors).toContain("§2");
    expect(anchors).toContain("§3");
    expect(anchors).toContain("§4");
  });

  test("replaces array fields when replace=true", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const addDelta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "H1",
      claim: "Claim",
      mechanism: "M",
      anchors: ["§1", "§2"],
    });

    const afterAdd = mergeArtifact(artifact, [addDelta], "Agent1", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const editDelta = makeValidDelta("EDIT", "hypothesis_slate", "H1", {
      anchors: ["§3"],
      replace: true,
    });

    const result = mergeArtifact(afterAdd.artifact, [editDelta], "Agent2", "2025-01-01T00:01:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifact.sections.hypothesis_slate[0].anchors).toEqual(["§3"]);
  });

  test("rejects EDIT on non-existent item", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const delta = makeValidDelta("EDIT", "hypothesis_slate", "H999", {
      claim: "Updated",
    });

    const result = mergeArtifact(artifact, [delta], "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.errors[0].code).toBe("INVALID_TARGET");
  });
});

// ============================================================================
// Tests: KILL operations
// ============================================================================

describe("KILL operations", () => {
  test("marks item as killed", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const addDelta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "H1",
      claim: "Claim",
      mechanism: "M",
    });

    const afterAdd = mergeArtifact(artifact, [addDelta], "Agent1", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const killDelta = makeValidDelta("KILL", "hypothesis_slate", "H1", {
      reason: "Superseded",
    });

    const result = mergeArtifact(afterAdd.artifact, [killDelta], "Agent2", "2025-01-01T00:01:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const h1 = result.artifact.sections.hypothesis_slate[0];
    expect(h1.killed).toBe(true);
    expect(h1.killed_by).toBe("Agent2");
    expect(h1.kill_reason).toBe("Superseded");
  });

  test("KILL is idempotent", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const addDelta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "H1",
      claim: "Claim",
      mechanism: "M",
    });

    const afterAdd = mergeArtifact(artifact, [addDelta], "Agent1", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const killDelta1 = makeValidDelta("KILL", "hypothesis_slate", "H1", { reason: "First" });
    const killDelta2 = makeValidDelta("KILL", "hypothesis_slate", "H1", { reason: "Second" });

    const result = mergeArtifact(afterAdd.artifact, [killDelta1, killDelta2], "Agent2", "2025-01-01T00:01:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // First kill should stick
    expect(result.artifact.sections.hypothesis_slate[0].kill_reason).toBe("First");
  });

  test("EDIT on killed item is skipped with warning", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const addDelta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "H1",
      claim: "Original",
      mechanism: "M",
    });

    const afterAdd = mergeArtifact(artifact, [addDelta], "Agent1", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const killDelta = makeValidDelta("KILL", "hypothesis_slate", "H1", { reason: "Done" });
    const editDelta = makeValidDelta("EDIT", "hypothesis_slate", "H1", { claim: "Updated" });

    const result = mergeArtifact(afterAdd.artifact, [killDelta, editDelta], "Agent2", "2025-01-01T00:01:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Edit should be skipped, claim should remain original
    expect(result.artifact.sections.hypothesis_slate[0].claim).toBe("Original");
    expect(result.warnings.some((w) => w.code === "TARGET_KILLED")).toBe(true);
  });

  test("warns when killing the last third alternative hypothesis", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const deltas: ValidDelta[] = [
      makeValidDelta("ADD", "hypothesis_slate", null, { name: "H1", claim: "A", mechanism: "M" }),
      makeValidDelta("ADD", "hypothesis_slate", null, { name: "H2", claim: "B", mechanism: "M" }),
      makeValidDelta("ADD", "hypothesis_slate", null, {
        name: "Third alternative",
        claim: "Both could be wrong",
        mechanism: "Misspecification",
        third_alternative: true,
      }),
    ];

    const afterAdd = mergeArtifact(artifact, deltas, "Agent1", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const killThird = makeValidDelta("KILL", "hypothesis_slate", "H3", { reason: "Removed" });
    const result = mergeArtifact(afterAdd.artifact, [killThird], "Agent2", "2025-01-01T00:01:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.warnings.some((w) => w.code === "NO_THIRD_ALTERNATIVE")).toBe(true);
  });

  test("warns when killing the last scale check assumption", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const deltas: ValidDelta[] = [
      makeValidDelta("ADD", "assumption_ledger", null, {
        name: "A1",
        statement: "S1",
        load: "L1",
        test: "T1",
        scale_check: true,
      }),
      makeValidDelta("ADD", "assumption_ledger", null, { name: "A2", statement: "S2", load: "L2", test: "T2" }),
      makeValidDelta("ADD", "assumption_ledger", null, { name: "A3", statement: "S3", load: "L3", test: "T3" }),
    ];

    const afterAdd = mergeArtifact(artifact, deltas, "Agent1", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const killScale = makeValidDelta("KILL", "assumption_ledger", "A1", { reason: "Removed" });
    const result = mergeArtifact(afterAdd.artifact, [killScale], "Agent2", "2025-01-01T00:01:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.warnings.some((w) => w.code === "NO_SCALE_CHECK")).toBe(true);
  });

  test("rejects KILL on research_thread", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const delta: ValidDelta = {
      valid: true,
      operation: "KILL",
      section: "research_thread",
      target_id: "RT",
      payload: { reason: "Nope" },
      rationale: "test",
      raw: JSON.stringify({ operation: "KILL", section: "research_thread", target_id: "RT", payload: { reason: "Nope" } }),
    };

    const result = mergeArtifact(artifact, [delta], "Agent1", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]?.code).toBe("INVALID_TARGET");
  });

  test("rejects KILL when target_id is missing", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const delta: ValidDelta = {
      valid: true,
      operation: "KILL",
      section: "hypothesis_slate",
      target_id: null,
      payload: { reason: "No target" },
      rationale: "test",
      raw: JSON.stringify({ operation: "KILL", section: "hypothesis_slate", target_id: null, payload: { reason: "No target" } }),
    };

    const result = mergeArtifact(artifact, [delta], "Agent1", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]?.code).toBe("INVALID_TARGET");
  });

  test("rejects KILL when target does not exist", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const delta = makeValidDelta("KILL", "hypothesis_slate", "H1", { reason: "Missing" });

    const result = mergeArtifact(artifact, [delta], "Agent1", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]?.code).toBe("INVALID_TARGET");
  });

  test("does not warn when a third alternative remains after KILL", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const deltas: ValidDelta[] = [
      makeValidDelta("ADD", "hypothesis_slate", null, { name: "H1", claim: "A", mechanism: "M" }),
      makeValidDelta("ADD", "hypothesis_slate", null, { name: "H2", claim: "B", mechanism: "M" }),
      makeValidDelta("ADD", "hypothesis_slate", null, {
        name: "Third alternative",
        claim: "Both could be wrong",
        mechanism: "Misspecification",
        third_alternative: true,
      }),
    ];

    const afterAdd = mergeArtifact(artifact, deltas, "Agent1", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const killH1 = makeValidDelta("KILL", "hypothesis_slate", "H1", { reason: 123 as unknown as string });
    const result = mergeArtifact(afterAdd.artifact, [killH1], "Agent2", "2025-01-01T00:01:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.warnings.some((w) => w.code === "NO_THIRD_ALTERNATIVE")).toBe(false);
    expect(result.artifact.sections.hypothesis_slate[0].kill_reason).toBe("");
  });

  test("does not warn when a scale check remains after KILL", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const deltas: ValidDelta[] = [
      makeValidDelta("ADD", "assumption_ledger", null, {
        name: "A1",
        statement: "S1",
        load: "L1",
        test: "T1",
        scale_check: true,
      }),
      makeValidDelta("ADD", "assumption_ledger", null, { name: "A2", statement: "S2", load: "L2", test: "T2" }),
      makeValidDelta("ADD", "assumption_ledger", null, { name: "A3", statement: "S3", load: "L3", test: "T3" }),
    ];

    const afterAdd = mergeArtifact(artifact, deltas, "Agent1", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const killA2 = makeValidDelta("KILL", "assumption_ledger", "A2", { reason: "Removed" });
    const result = mergeArtifact(afterAdd.artifact, [killA2], "Agent2", "2025-01-01T00:01:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.warnings.some((w) => w.code === "NO_SCALE_CHECK")).toBe(false);
  });
});

// ============================================================================
// Tests: Determinism
// ============================================================================

describe("Deterministic merging", () => {
  test("same deltas produce same result regardless of input order", () => {
    const base = createEmptyArtifact("TEST-001");

    const delta1 = makeTimestampedDelta(
      "ADD",
      "hypothesis_slate",
      null,
      { name: "From Agent1", claim: "C1", mechanism: "M" },
      "2025-01-01T00:00:00Z",
      "Agent1",
    );

    const delta2 = makeTimestampedDelta(
      "ADD",
      "hypothesis_slate",
      null,
      { name: "From Agent2", claim: "C2", mechanism: "M" },
      "2025-01-01T00:01:00Z",
      "Agent2",
    );

    // Merge in order [delta1, delta2]
    const result1 = mergeArtifactWithTimestamps(base, [delta1, delta2]);

    // Merge in order [delta2, delta1] (should produce same result due to timestamp sorting)
    const result2 = mergeArtifactWithTimestamps(base, [delta2, delta1]);

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    if (!result1.ok || !result2.ok) return;

    // Both should have same hypothesis order (sorted by timestamp)
    expect(result1.artifact.sections.hypothesis_slate[0].name).toBe("From Agent1");
    expect(result1.artifact.sections.hypothesis_slate[1].name).toBe("From Agent2");

    expect(result2.artifact.sections.hypothesis_slate[0].name).toBe("From Agent1");
    expect(result2.artifact.sections.hypothesis_slate[1].name).toBe("From Agent2");

    // IDs should be identical
    expect(result1.artifact.sections.hypothesis_slate[0].id).toBe(result2.artifact.sections.hypothesis_slate[0].id);
    expect(result1.artifact.sections.hypothesis_slate[1].id).toBe(result2.artifact.sections.hypothesis_slate[1].id);
  });

  test("concurrent edits resolved by timestamp (last-write-wins)", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const addDelta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "H1",
      claim: "Original",
      mechanism: "M",
    });

    const afterAdd = mergeArtifact(artifact, [addDelta], "Agent0", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const edit1 = makeTimestampedDelta(
      "EDIT",
      "hypothesis_slate",
      "H1",
      { claim: "Edit from Agent1" },
      "2025-01-01T00:01:00Z",
      "Agent1",
    );

    const edit2 = makeTimestampedDelta(
      "EDIT",
      "hypothesis_slate",
      "H1",
      { claim: "Edit from Agent2" },
      "2025-01-01T00:02:00Z",
      "Agent2",
    );

    // Last timestamp wins
    const result = mergeArtifactWithTimestamps(afterAdd.artifact, [edit1, edit2]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifact.sections.hypothesis_slate[0].claim).toBe("Edit from Agent2");
  });

  test("KILL takes precedence over concurrent EDIT", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const addDelta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "H1",
      claim: "Original",
      mechanism: "M",
    });

    const afterAdd = mergeArtifact(artifact, [addDelta], "Agent0", "2025-01-01T00:00:00Z");
    expect(afterAdd.ok).toBe(true);
    if (!afterAdd.ok) return;

    const kill = makeTimestampedDelta(
      "KILL",
      "hypothesis_slate",
      "H1",
      { reason: "Killed" },
      "2025-01-01T00:01:00Z",
      "Agent1",
    );

    const edit = makeTimestampedDelta(
      "EDIT",
      "hypothesis_slate",
      "H1",
      { claim: "Updated" },
      "2025-01-01T00:02:00Z",
      "Agent2",
    );

    const result = mergeArtifactWithTimestamps(afterAdd.artifact, [kill, edit]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Item should be killed, edit should be skipped
    expect(result.artifact.sections.hypothesis_slate[0].killed).toBe(true);
    expect(result.artifact.sections.hypothesis_slate[0].claim).toBe("Original");
  });
});

// ============================================================================
// Tests: mergeArtifactWithTimestamps metadata
// ============================================================================

describe("mergeArtifactWithTimestamps metadata", () => {
  test("backfills missing contributor contributed_at", () => {
    const base = createEmptyArtifact("TEST-001");
    base.metadata.contributors.push({ agent: "Agent1" });

    const delta = makeTimestampedDelta(
      "ADD",
      "hypothesis_slate",
      null,
      { name: "H1", claim: "C", mechanism: "M" },
      "2025-01-01T00:00:00Z",
      "Agent1",
    );

    const result = mergeArtifactWithTimestamps(base, [delta]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifact.metadata.contributors).toHaveLength(1);
    expect(result.artifact.metadata.contributors[0].agent).toBe("Agent1");
    expect(result.artifact.metadata.contributors[0].contributed_at).toBe("2025-01-01T00:00:00Z");
  });
});

// ============================================================================
// Tests: Test ranking
// ============================================================================

describe("Test ranking by score", () => {
  test("tests are sorted by score (highest first)", () => {
    const artifact = createEmptyArtifact("TEST-001");

    const lowScore = makeValidDelta("ADD", "discriminative_tests", null, {
      name: "Low Score Test",
      procedure: "P",
      discriminates: "H1 vs H2",
      expected_outcomes: { H1: "A", H2: "B" },
      potency_check: "Check",
      score: { likelihood_ratio: 1, cost: 1, speed: 1, ambiguity: 1 },
    });

    const highScore = makeValidDelta("ADD", "discriminative_tests", null, {
      name: "High Score Test",
      procedure: "P",
      discriminates: "H1 vs H2",
      expected_outcomes: { H1: "A", H2: "B" },
      potency_check: "Check",
      score: { likelihood_ratio: 3, cost: 3, speed: 3, ambiguity: 3 },
    });

    // Add low score first, then high score
    const result = mergeArtifact(artifact, [lowScore, highScore], "TestAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // High score should be first after sorting
    expect(result.artifact.sections.discriminative_tests[0].name).toBe("High Score Test");
    expect(result.artifact.sections.discriminative_tests[1].name).toBe("Low Score Test");
  });
});

// ============================================================================
// Tests: Metadata
// ============================================================================

describe("Metadata updates", () => {
  test("increments version on merge", () => {
    const artifact = createEmptyArtifact("TEST-001");
    expect(artifact.metadata.version).toBe(0);

    const delta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "H1",
      claim: "C",
      mechanism: "M",
    });

    const result = mergeArtifact(artifact, [delta], "Agent1", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifact.metadata.version).toBe(1);
  });

  test("adds contributor on merge", () => {
    const artifact = createEmptyArtifact("TEST-001");
    expect(artifact.metadata.contributors).toHaveLength(0);

    const delta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "H1",
      claim: "C",
      mechanism: "M",
    });

    const result = mergeArtifact(artifact, [delta], "NewAgent", "2025-01-01T00:00:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.artifact.metadata.contributors).toHaveLength(1);
    expect(result.artifact.metadata.contributors[0].agent).toBe("NewAgent");
  });

  test("updates existing contributor timestamp", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const delta1 = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "H1",
      claim: "C",
      mechanism: "M",
    });

    const after1 = mergeArtifact(artifact, [delta1], "Agent1", "2025-01-01T00:00:00Z");
    expect(after1.ok).toBe(true);
    if (!after1.ok) return;

    const delta2 = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "H2",
      claim: "C2",
      mechanism: "M",
    });

    const result = mergeArtifact(after1.artifact, [delta2], "Agent1", "2025-01-01T01:00:00Z");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Still one contributor, but timestamp updated
    expect(result.artifact.metadata.contributors).toHaveLength(1);
    expect(result.artifact.metadata.contributors[0].contributed_at).toBe("2025-01-01T01:00:00Z");
  });
});

// ============================================================================
// Tests: Rendering + Linting
// ============================================================================

describe("renderArtifactMarkdown", () => {
  test("renders canonical markdown with required section headers", () => {
    const artifact = createEmptyArtifact("TEST-RENDER");

    const deltas: ValidDelta[] = [
      makeValidDelta("EDIT", "research_thread", null, {
        statement: "What is X?",
        context: "Background context.",
        why_it_matters: "It matters because Y.",
        anchors: ["§1"],
      }),
      makeValidDelta("ADD", "hypothesis_slate", null, {
        name: "H1",
        claim: "A",
        mechanism: "M",
        anchors: ["§2"],
      }),
      makeValidDelta("ADD", "hypothesis_slate", null, {
        name: "H2",
        claim: "B",
        mechanism: "M",
        anchors: ["§3"],
      }),
      makeValidDelta("ADD", "hypothesis_slate", null, {
        name: "Third Alternative",
        claim: "Both could be wrong",
        mechanism: "Misspecification",
        anchors: ["inference"],
        third_alternative: true,
      }),
      makeValidDelta("ADD", "predictions_table", null, {
        condition: "Condition 1",
        predictions: { H1: "A", H2: "B", H3: "?" },
      }),
      makeValidDelta("ADD", "predictions_table", null, {
        condition: "Condition 2",
        predictions: { H1: "A", H2: "B", H3: "?" },
      }),
      makeValidDelta("ADD", "predictions_table", null, {
        condition: "Condition 3",
        predictions: { H1: "A", H2: "B", H3: "?" },
      }),
      makeValidDelta("ADD", "discriminative_tests", null, {
        name: "T1",
        procedure: "P",
        discriminates: "H1 vs H2",
        expected_outcomes: { H1: "A", H2: "B" },
        potency_check: "Control",
        score: { likelihood_ratio: 3, cost: 2, speed: 2, ambiguity: 3 },
      }),
      makeValidDelta("ADD", "discriminative_tests", null, {
        name: "T2",
        procedure: "P",
        discriminates: "H1 vs H2",
        expected_outcomes: { H1: "A", H2: "B" },
        potency_check: "Control",
        score: { likelihood_ratio: 2, cost: 2, speed: 2, ambiguity: 2 },
      }),
      makeValidDelta("ADD", "assumption_ledger", null, {
        name: "A1",
        statement: "S1",
        load: "L1",
        test: "T1",
        scale_check: true,
        calculation: "1e3 > 1e2",
      }),
      makeValidDelta("ADD", "assumption_ledger", null, {
        name: "A2",
        statement: "S2",
        load: "L2",
        test: "T2",
      }),
      makeValidDelta("ADD", "assumption_ledger", null, {
        name: "A3",
        statement: "S3",
        load: "L3",
        test: "T3",
      }),
      makeValidDelta("ADD", "adversarial_critique", null, {
        name: "C1",
        attack: "A",
        evidence: "E",
        current_status: "S",
        real_third_alternative: true,
      }),
      makeValidDelta("ADD", "adversarial_critique", null, {
        name: "C2",
        attack: "A",
        evidence: "E",
        current_status: "S",
      }),
    ];

    const merged = mergeArtifact(artifact, deltas, "Agent1", "2025-01-01T00:00:00Z");
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;

    const md = renderArtifactMarkdown(merged.artifact);
    expect(md).toContain('session_id: "TEST-RENDER"');
    expect(md).toContain("# Brenner Protocol Artifact: TEST-RENDER");

    expect(md).toContain("## 1. Research Thread");
    expect(md).toContain("## 2. Hypothesis Slate");
    expect(md).toContain("## 3. Predictions Table");
    expect(md).toContain("## 4. Discriminative Tests");
    expect(md).toContain("## 5. Assumption Ledger");
    expect(md).toContain("## 6. Anomaly Register");
    expect(md).toContain("## 7. Adversarial Critique");

    // Predictions table should include hypothesis ID columns
    expect(md).toContain("| ID | Observation/Condition | H1 | H2 | H3 |");

    // Empty anomaly register should be explicit
    expect(md).toContain("None registered.");
  });

  test("renders inference when anchors list contains only whitespace", () => {
    const artifact = createEmptyArtifact("TEST-ANCHORS-WHITESPACE");
    artifact.sections.research_thread = {
      id: "RT",
      statement: "What is X?",
      context: "Context",
      why_it_matters: "Matters",
      anchors: ["   "],
    };

    const md = renderArtifactMarkdown(artifact);
    expect(md).toContain("**Anchors**: inference");
  });

  test("renders contributor metadata including optional fields", () => {
    const artifact = createEmptyArtifact("TEST-CONTRIBUTORS");
    artifact.metadata.contributors = [
      {
        agent: "Agent1",
        program: "codex-cli",
        model: "gpt-5.2",
        contributed_at: "2025-01-01T00:00:00Z",
      },
    ];

    const md = renderArtifactMarkdown(artifact);
    expect(md).toContain('  - agent: "Agent1"');
    expect(md).toContain('    program: "codex-cli"');
    expect(md).toContain('    model: "gpt-5.2"');
    expect(md).toContain('    contributed_at: "2025-01-01T00:00:00Z"');
  });

  test("renders Research Thread section even when missing", () => {
    const artifact = createEmptyArtifact("TEST-MISSING-RT");
    artifact.sections.research_thread = null;

    const md = renderArtifactMarkdown(artifact);
    expect(md).toContain("## 1. Research Thread");
    expect(md).toContain("**Anchors**: inference");
  });

  test("renders kill metadata when present", () => {
    const artifact = createEmptyArtifact("TEST-KILL-METADATA");
    artifact.sections.research_thread = {
      id: "RT",
      statement: "What is X?",
      context: "Context",
      why_it_matters: "Matters",
      anchors: ["§1"],
      killed: true,
      killed_by: "human",
      killed_at: "2025-01-01T00:00:00Z",
      kill_reason: "Invalid research question",
    } as unknown as ResearchThreadItem;

    const md = renderArtifactMarkdown(artifact);
    expect(md).toContain("**Killed**: true");
    expect(md).toContain("**Killed by**:");
    expect(md).toContain("**Killed at**:");
    expect(md).toContain("**Kill reason**:");
  });
});

describe("lintArtifact (legacy checks)", () => {
  test("warns on incomplete artifact", () => {
    const artifact = createEmptyArtifact("TEST-001");
    const report = lintArtifact(artifact);
    const violations = report.violations;

    // Should warn about missing minimums
    expect(violations.some((v) => v.id === "EH-001")).toBe(true); // H < 3
    expect(violations.some((v) => v.id === "EH-003")).toBe(true); // NO_THIRD_ALTERNATIVE
    expect(violations.some((v) => v.id === "EA-002")).toBe(true); // NO_SCALE_CHECK
  });

  test("executes third-alternative / scale-check callbacks on non-empty sections", () => {
    const artifact = createEmptyArtifact("TEST-002");
    // Add dummy RT to pass RT checks (not focus of this test)
    artifact.sections.research_thread = {
      id: "RT",
      statement: "S",
      context: "C",
      why_it_matters: "W",
      anchors: ["§1"],
    };

    artifact.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "A", mechanism: "M", anchors: ["§1"] },
      { id: "H2", name: "H2", claim: "B", mechanism: "M", anchors: ["§1"] },
      { id: "H3", name: "H3", claim: "C", mechanism: "M", anchors: ["§1"], killed: true },
    ];

    artifact.sections.predictions_table = [
      { id: "P1", condition: "C1", predictions: { H1: "A", H2: "B" } },
      { id: "P2", condition: "C2", predictions: { H1: "A", H2: "B" }, killed: true },
    ];

    artifact.sections.discriminative_tests = [
      {
        id: "T1",
        name: "T1",
        procedure: "P",
        discriminates: "H1 vs H2",
        expected_outcomes: { H1: "A", H2: "B" },
        potency_check: "Control",
        score: { likelihood_ratio: 3, cost: 2, speed: 2, ambiguity: 3 },
      },
      {
        id: "T2",
        name: "T2",
        procedure: "P",
        discriminates: "H1 vs H2",
        expected_outcomes: { H1: "A", H2: "B" },
        potency_check: "Control",
        score: { likelihood_ratio: 3, cost: 2, speed: 2, ambiguity: 3 },
      },
    ];

    artifact.sections.assumption_ledger = [
      { id: "A1", name: "A1", statement: "S1_debug", load: "L1", test: "T1" },
      { id: "A2", name: "A2", statement: "S2", load: "L2", test: "T2" },
      { id: "A3", name: "A3", statement: "S3", load: "L3", test: "T3", killed: true },
    ];

    artifact.sections.adversarial_critique = [
      { id: "C1", name: "C1", attack: "A", evidence: "E", current_status: "active", real_third_alternative: true },
      { id: "C2", name: "C2", attack: "A", evidence: "E", current_status: "active" },
    ];

    const report = lintArtifact(artifact);
    const violations = report.violations;

    expect(violations.some((v) => v.id === "EH-003")).toBe(true); // NO_THIRD_ALTERNATIVE
    expect(violations.some((v) => v.id === "EA-002")).toBe(true); // NO_SCALE_CHECK
  });

  test("returns no warnings for a minimally complete artifact", () => {
    const artifact = createEmptyArtifact("TEST-003");
    artifact.metadata.contributors.push({ agent: "test" });
    artifact.sections.research_thread = {
      id: "RT",
      statement: "S",
      context: "C",
      why_it_matters: "W",
      anchors: ["§1"],
    };

    artifact.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "A", mechanism: "M", anchors: ["§1"] },
      { id: "H2", name: "H2", claim: "B", mechanism: "M", anchors: ["§1"] },
      { id: "H3", name: "Third alternative", claim: "Both could be wrong", mechanism: "Misspecification", anchors: ["§1"] },
    ];

    artifact.sections.predictions_table = [
      { id: "P1", condition: "C1", predictions: { H1: "A", H2: "B", H3: "?" } },
      { id: "P2", condition: "C2", predictions: { H1: "A", H2: "B", H3: "?" } },
      { id: "P3", condition: "C3", predictions: { H1: "A", H2: "B", H3: "?" } },
    ];

    artifact.sections.discriminative_tests = [
      {
        id: "T1",
        name: "T1",
        procedure: "P",
        discriminates: "H1 vs H2",
        expected_outcomes: { H1: "A", H2: "B" },
        potency_check: "Control (cite §50)",
        score: { likelihood_ratio: 3, cost: 2, speed: 2, ambiguity: 3 },
      },
      {
        id: "T2",
        name: "T2",
        procedure: "P",
        discriminates: "H1 vs H2",
        expected_outcomes: { H1: "A", H2: "B" },
        potency_check: "Control (cite §50)",
        score: { likelihood_ratio: 3, cost: 2, speed: 2, ambiguity: 3 },
      },
    ];

    artifact.sections.assumption_ledger = [
      { id: "A1", name: "A1", statement: "S1", load: "L1", test: "T1", scale_check: true, calculation: "1e2" },
      { id: "A2", name: "A2", statement: "S2", load: "L2", test: "T2" },
      { id: "A3", name: "A3", statement: "S3", load: "L3", test: "T3" },
    ];

    artifact.sections.adversarial_critique = [
      { id: "C1", name: "C1", attack: "A", evidence: "E", current_status: "active", real_third_alternative: true },
      { id: "C2", name: "C2", attack: "A", evidence: "E", current_status: "active" },
    ];

    const report = lintArtifact(artifact);
    const errors = report.violations.filter((v) => v.severity === "error");
    const warnings = report.violations.filter((v) => v.severity === "warning");

    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  });
});

// ============================================================================
// Coverage-focused tests (exercise rarely-hit branches)
// ============================================================================

describe("artifact-merge additional coverage", () => {
  test("ADD rejects non-object payload (MISSING_REQUIRED_FIELD)", () => {
    const artifact = createEmptyArtifact("TEST-ADD-BAD-PAYLOAD");
    const delta = makeValidDelta("ADD", "hypothesis_slate", null, {});
    // Force payload to be non-object to hit the guardrail
    const deltaWithPayload = delta as unknown as { payload: unknown };
    deltaWithPayload.payload = ["not-an-object"];

    const result = mergeArtifact(artifact, [delta], "Agent", "2025-01-01T00:00:00Z");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.code === "MISSING_REQUIRED_FIELD")).toBe(true);
  });

  test("EDIT rejects missing target_id for non-research_thread sections", () => {
    const artifact = createEmptyArtifact("TEST-EDIT-NO-TARGET");
    const delta = makeValidDelta("EDIT", "hypothesis_slate", null, { claim: "x" });
    const result = mergeArtifact(artifact, [delta], "Agent", "2025-01-01T00:00:00Z");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.code === "INVALID_TARGET")).toBe(true);
  });

  test("research_thread anchors merge by default on EDIT when replace is not set", () => {
    const base = createEmptyArtifact("TEST-RT-ANCHORS");

    const first = mergeArtifact(
      base,
      [
        makeValidDelta("EDIT", "research_thread", null, {
          statement: "S",
          context: "C",
          why_it_matters: "W",
          anchors: ["§1"],
        }),
      ],
      "Agent",
      "2025-01-01T00:00:00Z",
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = mergeArtifact(
      first.artifact,
      [makeValidDelta("EDIT", "research_thread", null, { anchors: ["§2"] })],
      "Agent",
      "2025-01-01T00:01:00Z",
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    const rtAnchors = second.artifact.sections.research_thread?.anchors ?? [];
    expect(rtAnchors).toEqual(expect.arrayContaining(["§1", "§2"]));
  });

  test("renderArtifactMarkdown renders empty contributors list and killed blocks + experiment result fields", () => {
    const artifact = createEmptyArtifact("TEST-RENDER-EXTRA");
    // Keep contributors empty to hit YAML 'contributors: []' branch.
    artifact.metadata.contributors = [];

    artifact.sections.research_thread = {
      id: "RT",
      statement: "Statement",
      context: "Context",
      why_it_matters: "Why",
      anchors: ["§1"],
    };

    artifact.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "C", mechanism: "M", anchors: ["§2"], killed: true, killed_by: "Agent", killed_at: "t", kill_reason: "r" },
      { id: "HXYZ", name: "Third Alternative", claim: "Both wrong", mechanism: "?", anchors: ["inference"], third_alternative: true },
    ] as unknown as HypothesisItem[];

    artifact.sections.predictions_table = [
      { id: "P1", condition: "Cond", predictions: { H1: "X", hxyz: "A" } },
    ] as unknown as PredictionItem[];

    artifact.sections.discriminative_tests = [
      {
        id: "T1",
        name: "Test 1",
        procedure: "P",
        discriminates: "H1 vs HXYZ",
        expected_outcomes: { H1: "A", HXYZ: "B" },
        potency_check: "Potency (no §50)",
        score: { likelihood_ratio: 1, cost: 1, speed: 1, ambiguity: 1 },
        status: "blocked",
        last_run: {
          result_id: "XR-001",
          run_at: "2025-01-01T00:00:00Z",
          exit_code: 1,
          timed_out: true,
          duration_ms: 1234,
          summary: "Boom",
          result_path: "results/XR-001.json",
        },
        actual_outcomes: { H1: "observed A" },
      },
    ] as unknown as TestItem[];

    artifact.sections.anomaly_register = [
      { id: "X1", name: "Anomaly", observation: "Obs", conflicts_with: ["H1"], status: "active", resolution_plan: "Plan" },
    ] as unknown as AnomalyItem[];

    artifact.sections.assumption_ledger = [
      { id: "A1", name: "A1", statement: "S", load: "L", test: "T", scale_check: true, calculation: "1e3" },
    ] as unknown as AssumptionItem[];

    artifact.sections.adversarial_critique = [
      { id: "C1", name: "C1", attack: "Attack", evidence: "Evidence", current_status: "active", real_third_alternative: true },
    ] as unknown as CritiqueItem[];

    const md = renderArtifactMarkdown(artifact);
    expect(md).toContain("contributors:");
    expect(md).toContain("  []");
    expect(md).toContain("**Killed**: true");
    expect(md).toContain("**Last run**:");
    expect(md).toContain("**Actual outcomes**:");
    expect(md).toContain("## 6. Anomaly Register");
    expect(md).toContain("### X1: Anomaly");
    expect(md).toContain("**Observation**:");
  });

  test("lintArtifact flags a wide set of metadata + section violations and report formatters cover all sections", () => {
    const artifact = createEmptyArtifact(" ");
    artifact.metadata.status = "weird" as unknown as ArtifactMetadata["status"];
    artifact.metadata.created_at = "not-a-date";
    artifact.metadata.updated_at = "2000-01-02T00:00:00Z";
    artifact.metadata.version = 1.5;
    artifact.metadata.contributors = [];

    artifact.sections.research_thread = {
      id: "RT",
      statement: "",
      context: "",
      why_it_matters: "",
      anchors: [],
    };

    artifact.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "", mechanism: "M", anchors: ["§999"], unresolvedCritiqueCount: 0 },
      { id: "H2", name: "H2", claim: "C", mechanism: "M", anchors: ["[inference]"], unresolvedCritiqueCount: 0 },
      { id: "H3", name: "H3", claim: "C", mechanism: "M", anchors: [], unresolvedCritiqueCount: 0 },
      { id: "H4", name: "H4", claim: "C", mechanism: "M", anchors: ["§1"], unresolvedCritiqueCount: 0 },
      { id: "H5", name: "H5", claim: "C", mechanism: "M", anchors: ["§1"], unresolvedCritiqueCount: 0 },
      { id: "H6", name: "H6", claim: "C", mechanism: "M", anchors: ["§1"], unresolvedCritiqueCount: 0 },
      { id: "H7", name: "H7", claim: "C", mechanism: "M", anchors: ["§1"], unresolvedCritiqueCount: 0 },
    ] as unknown as HypothesisItem[];

    artifact.sections.predictions_table = [
      { id: "P1", condition: "Cond", predictions: { H1: "X", H2: "X" } },
    ] as unknown as PredictionItem[];

    artifact.sections.discriminative_tests = [
      { id: "T1", name: "T1", procedure: "", discriminates: "", expected_outcomes: {}, potency_check: "", score: undefined },
      { id: "T2", name: "T2", procedure: "P", discriminates: "H1 vs H2", expected_outcomes: { H1: "X" }, potency_check: "Has potency but no §50", score: { likelihood_ratio: 3, cost: 3, speed: 3, ambiguity: 3 } },
      { id: "T3", name: "T3", procedure: "P", discriminates: "H1 vs H2", expected_outcomes: { H1: "X" }, potency_check: "Has potency but no §50", score: { likelihood_ratio: 1, cost: 1, speed: 1, ambiguity: 1 } },
    ] as unknown as TestItem[];

    artifact.sections.assumption_ledger = [
      { id: "A1", name: "A1", statement: "", load: "L", test: "T", scale_check: true, calculation: "" },
      { id: "A2", name: "A2", statement: "S", load: "L", test: "T" },
      { id: "A3", name: "A3", statement: "S", load: "L", test: "T" },
    ] as unknown as AssumptionItem[];

    artifact.sections.adversarial_critique = [
      { id: "C1", name: "C1", attack: "", evidence: "", current_status: "" },
      { id: "C2", name: "C2", attack: "Attack", evidence: "", current_status: "" },
    ] as unknown as CritiqueItem[];

    const report = lintArtifact(artifact);
    expect(report.valid).toBe(false);
    expect(report.violations.length).toBeGreaterThan(0);

    const human = formatLintReportHuman(report, "TEST");
    expect(human).toContain("Artifact Linter Report");

    const json = formatLintReportJson(report, "TEST");
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

// ============================================================================
// Tests: Artifact Semantic Diff
// ============================================================================

import { diffArtifacts, formatDiffHuman, formatDiffJson } from "./artifact-merge";

describe("diffArtifacts", () => {
  test("detects added hypotheses", () => {
    const v1 = createEmptyArtifact("TEST-DIFF");
    v1.metadata.version = 1;
    v1.sections.hypothesis_slate = [
      { id: "H1", name: "Hypothesis 1", claim: "Claim 1", mechanism: "Mechanism 1" },
    ];

    const v2 = createEmptyArtifact("TEST-DIFF");
    v2.metadata.version = 2;
    v2.sections.hypothesis_slate = [
      { id: "H1", name: "Hypothesis 1", claim: "Claim 1", mechanism: "Mechanism 1" },
      { id: "H2", name: "Hypothesis 2", claim: "Claim 2", mechanism: "Mechanism 2" },
    ];

    const diff = diffArtifacts(v1, v2);

    expect(diff.from_version).toBe(1);
    expect(diff.to_version).toBe(2);
    expect(diff.changes.hypothesis_slate.added).toHaveLength(1);
    expect(diff.changes.hypothesis_slate.added[0].id).toBe("H2");
    expect(diff.changes.hypothesis_slate.added[0].name).toBe("Hypothesis 2");
    expect(diff.summary.hypotheses_added).toBe(1);
    expect(diff.summary.hypotheses_net).toBe(1);
  });

  test("detects killed hypotheses with rationale", () => {
    const v1 = createEmptyArtifact("TEST-DIFF");
    v1.metadata.version = 1;
    v1.sections.hypothesis_slate = [
      { id: "H1", name: "Hypothesis 1", claim: "Claim 1", mechanism: "Mechanism 1" },
      { id: "H2", name: "Hypothesis 2", claim: "Claim 2", mechanism: "Mechanism 2" },
    ];

    const v2 = createEmptyArtifact("TEST-DIFF");
    v2.metadata.version = 2;
    v2.sections.hypothesis_slate = [
      { id: "H1", name: "Hypothesis 1", claim: "Claim 1", mechanism: "Mechanism 1" },
      {
        id: "H2",
        name: "Hypothesis 2",
        claim: "Claim 2",
        mechanism: "Mechanism 2",
        killed: true,
        killed_by: "TestAgent",
        killed_at: "2025-01-01T00:00:00Z",
        kill_reason: "Refuted by T1 results",
      },
    ];

    const diff = diffArtifacts(v1, v2);

    expect(diff.changes.hypothesis_slate.killed).toHaveLength(1);
    expect(diff.changes.hypothesis_slate.killed[0].id).toBe("H2");
    expect(diff.changes.hypothesis_slate.killed[0].rationale).toBe("Refuted by T1 results");
    expect(diff.changes.hypothesis_slate.killed[0].by_agent).toBe("TestAgent");
    expect(diff.summary.hypotheses_killed).toBe(1);
  });

  test("detects edited fields", () => {
    const v1 = createEmptyArtifact("TEST-DIFF");
    v1.metadata.version = 1;
    v1.sections.hypothesis_slate = [
      { id: "H1", name: "Hypothesis 1", claim: "Original claim", mechanism: "Mechanism 1" },
    ];

    const v2 = createEmptyArtifact("TEST-DIFF");
    v2.metadata.version = 2;
    v2.sections.hypothesis_slate = [
      { id: "H1", name: "Hypothesis 1", claim: "Updated claim", mechanism: "Mechanism 1" },
    ];

    const diff = diffArtifacts(v1, v2);

    expect(diff.changes.hypothesis_slate.edited).toHaveLength(1);
    expect(diff.changes.hypothesis_slate.edited[0].id).toBe("H1");
    expect(diff.changes.hypothesis_slate.edited[0].field).toBe("claim");
    expect(diff.changes.hypothesis_slate.edited[0].old_value).toBe("Original claim");
    expect(diff.changes.hypothesis_slate.edited[0].new_value).toBe("Updated claim");
  });

  test("detects added tests with targets", () => {
    const v1 = createEmptyArtifact("TEST-DIFF");
    v1.metadata.version = 1;
    v1.sections.discriminative_tests = [];

    const v2 = createEmptyArtifact("TEST-DIFF");
    v2.metadata.version = 2;
    v2.sections.discriminative_tests = [
      {
        id: "T1",
        name: "Digital handle task",
        procedure: "Run test",
        discriminates: "H1, H2",
        expected_outcomes: { H1: "X", H2: "Y" },
        potency_check: "Control check",
      },
    ];

    const diff = diffArtifacts(v1, v2);

    expect(diff.changes.discriminative_tests.added).toHaveLength(1);
    expect(diff.changes.discriminative_tests.added[0].id).toBe("T1");
    expect(diff.changes.discriminative_tests.added[0].targets).toEqual(["H1", "H2"]);
    expect(diff.summary.tests_added).toBe(1);
  });

  test("detects resolved critiques", () => {
    const v1 = createEmptyArtifact("TEST-DIFF");
    v1.metadata.version = 1;
    v1.sections.adversarial_critique = [
      { id: "C1", name: "Missing potency check", attack: "No control", evidence: "T1 lacks control", current_status: "active" },
    ];

    const v2 = createEmptyArtifact("TEST-DIFF");
    v2.metadata.version = 2;
    v2.sections.adversarial_critique = [
      { id: "C1", name: "Missing potency check", attack: "No control", evidence: "T1 lacks control", current_status: "resolved - addressed by T1 edit" },
    ];

    const diff = diffArtifacts(v1, v2);

    expect(diff.changes.adversarial_critique.resolved).toHaveLength(1);
    expect(diff.changes.adversarial_critique.resolved[0].id).toBe("C1");
    expect(diff.changes.adversarial_critique.resolved[0].resolution).toBe("resolved - addressed by T1 edit");
  });

  test("detects assumption status changes (challenged)", () => {
    const v1 = createEmptyArtifact("TEST-DIFF");
    v1.metadata.version = 1;
    v1.sections.assumption_ledger = [
      { id: "A1", name: "Stable chromatin", statement: "Cells have stable chromatin", load: "If false, mechanism breaks", test: "Check inheritance", status: "unchecked" },
    ];

    const v2 = createEmptyArtifact("TEST-DIFF");
    v2.metadata.version = 2;
    v2.sections.assumption_ledger = [
      { id: "A1", name: "Stable chromatin", statement: "Cells have stable chromatin", load: "If false, mechanism breaks", test: "Check inheritance", status: "falsified" },
    ];

    const diff = diffArtifacts(v1, v2);

    expect(diff.changes.assumption_ledger.challenged).toHaveLength(1);
    expect(diff.changes.assumption_ledger.challenged[0].id).toBe("A1");
  });

  test("detects research thread edits", () => {
    const v1 = createEmptyArtifact("TEST-DIFF");
    v1.metadata.version = 1;
    v1.sections.research_thread = {
      id: "RT",
      statement: "Original question",
      context: "Context",
      why_it_matters: "Importance",
    };

    const v2 = createEmptyArtifact("TEST-DIFF");
    v2.metadata.version = 2;
    v2.sections.research_thread = {
      id: "RT",
      statement: "Refined question",
      context: "Context",
      why_it_matters: "Importance",
    };

    const diff = diffArtifacts(v1, v2);

    expect(diff.changes.research_thread.edited).toHaveLength(1);
    expect(diff.changes.research_thread.edited[0].field).toBe("statement");
  });

  test("detects anomaly promotions", () => {
    const v1 = createEmptyArtifact("TEST-DIFF");
    v1.metadata.version = 1;
    v1.sections.anomaly_register = [
      { id: "X1", name: "Anomaly", observation: "Obs", conflicts_with: [], status: "active" },
    ];

    const v2 = createEmptyArtifact("TEST-DIFF");
    v2.metadata.version = 2;
    v2.sections.anomaly_register = [
      { id: "X1", name: "Anomaly", observation: "Obs", conflicts_with: [], status: "resolved", resolution_plan: "Promoted to new hypothesis" },
    ];

    const diff = diffArtifacts(v1, v2);

    expect(diff.changes.anomaly_register.promoted).toHaveLength(1);
    expect(diff.changes.anomaly_register.promoted[0].id).toBe("X1");
    expect(diff.changes.anomaly_register.promoted[0].promoted_to).toBe("hypothesis");
  });

  test("calculates progress score based on changes", () => {
    const v1 = createEmptyArtifact("TEST-DIFF");
    v1.metadata.version = 1;
    v1.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "C1", mechanism: "M1" },
      { id: "H2", name: "H2", claim: "C2", mechanism: "M2" },
    ];
    v1.sections.adversarial_critique = [
      { id: "C1", name: "Critique 1", attack: "A", evidence: "E", current_status: "active" },
      { id: "C2", name: "Critique 2", attack: "A", evidence: "E", current_status: "active" },
    ];
    v1.sections.anomaly_register = [
      { id: "X1", name: "Anomaly", observation: "Obs", conflicts_with: [], status: "active" },
    ];

    const v2 = createEmptyArtifact("TEST-DIFF");
    v2.metadata.version = 2;
    // Kill and add hypotheses (refinement)
    v2.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "C1", mechanism: "M1" },
      { id: "H2", name: "H2", claim: "C2", mechanism: "M2", killed: true, kill_reason: "Refuted" },
      { id: "H3", name: "H3", claim: "C3", mechanism: "M3" },
    ];
    // Add multiple tests
    v2.sections.discriminative_tests = [
      { id: "T1", name: "T1", procedure: "P", discriminates: "H1", expected_outcomes: {}, potency_check: "PC" },
      { id: "T2", name: "T2", procedure: "P", discriminates: "H1", expected_outcomes: {}, potency_check: "PC" },
    ];
    // Resolve multiple critiques
    v2.sections.adversarial_critique = [
      { id: "C1", name: "Critique 1", attack: "A", evidence: "E", current_status: "resolved" },
      { id: "C2", name: "Critique 2", attack: "A", evidence: "E", current_status: "resolved" },
    ];
    // Resolve anomaly
    v2.sections.anomaly_register = [
      { id: "X1", name: "Anomaly", observation: "Obs", conflicts_with: [], status: "resolved", resolution_plan: "Explained" },
    ];

    const diff = diffArtifacts(v1, v2);

    // Should have GOOD or better progress (refinement + test + critique resolved)
    expect(["GOOD", "EXCELLENT"]).toContain(diff.summary.progress_score);
  });

  test("handles items removed from artifact (not killed)", () => {
    const v1 = createEmptyArtifact("TEST-DIFF");
    v1.metadata.version = 1;
    v1.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "C1", mechanism: "M1" },
      { id: "H2", name: "H2", claim: "C2", mechanism: "M2" },
    ];

    const v2 = createEmptyArtifact("TEST-DIFF");
    v2.metadata.version = 2;
    // H2 is completely gone (not killed, just removed)
    v2.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "C1", mechanism: "M1" },
    ];

    const diff = diffArtifacts(v1, v2);

    expect(diff.changes.hypothesis_slate.killed).toHaveLength(1);
    expect(diff.changes.hypothesis_slate.killed[0].id).toBe("H2");
    expect(diff.changes.hypothesis_slate.killed[0].rationale).toBe("Removed from artifact");
  });
});

describe("formatDiffHuman", () => {
  test("formats diff with all change types", () => {
    const v1 = createEmptyArtifact("TEST-FORMAT");
    v1.metadata.version = 1;
    v1.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "C1", mechanism: "M1" },
      { id: "H2", name: "H2", claim: "C2", mechanism: "M2" },
    ];
    v1.sections.discriminative_tests = [];
    v1.sections.adversarial_critique = [
      { id: "C1", name: "Critique 1", attack: "A", evidence: "E", current_status: "active" },
      { id: "C2", name: "Critique 2", attack: "A", evidence: "E", current_status: "active" },
    ];
    v1.sections.anomaly_register = [
      { id: "X1", name: "Anomaly", observation: "Obs", conflicts_with: [], status: "active" },
      { id: "X2", name: "Anomaly2", observation: "Obs2", conflicts_with: [], status: "active" },
    ];

    const v2 = createEmptyArtifact("TEST-FORMAT");
    v2.metadata.version = 2;
    // Kill one hypothesis, add a new one (refinement)
    v2.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "Updated claim", mechanism: "M1" },
      { id: "H2", name: "H2", claim: "C2", mechanism: "M2", killed: true, kill_reason: "Refuted" },
      { id: "H3", name: "H3", claim: "C3", mechanism: "M3" },
    ];
    // Add multiple tests
    v2.sections.discriminative_tests = [
      { id: "T1", name: "T1", procedure: "P", discriminates: "H1", expected_outcomes: {}, potency_check: "PC" },
      { id: "T2", name: "T2", procedure: "P", discriminates: "H1", expected_outcomes: {}, potency_check: "PC" },
    ];
    // Resolve multiple critiques
    v2.sections.adversarial_critique = [
      { id: "C1", name: "Critique 1", attack: "A", evidence: "E", current_status: "resolved" },
      { id: "C2", name: "Critique 2", attack: "A", evidence: "E", current_status: "resolved" },
    ];
    // Resolve anomaly
    v2.sections.anomaly_register = [
      { id: "X1", name: "Anomaly", observation: "Obs", conflicts_with: [], status: "resolved", resolution_plan: "Explained by H3" },
      { id: "X2", name: "Anomaly2", observation: "Obs2", conflicts_with: [], status: "deferred" },
    ];

    const diff = diffArtifacts(v1, v2);
    const output = formatDiffHuman(diff);

    expect(output).toContain("=== Artifact Diff: v1 → v2 ===");
    expect(output).toContain("HYPOTHESES");
    expect(output).toContain("+ [H3] H3");
    expect(output).toContain("✗ [H2] H2 - KILLED");
    expect(output).toContain("~ [H1] edited: claim changed");
    expect(output).toContain("TESTS");
    expect(output).toContain("+ [T1] T1");
    expect(output).toContain("+ [T2] T2");
    expect(output).toContain("ANOMALIES");
    expect(output).toContain("↑ [X1] PROMOTED TO");
    expect(output).toContain("○ [X2] dismissed:");
    expect(output).toContain("SUMMARY:");
    expect(output).toContain("Progress:");
  });

  test("formats summary with correct pluralization", () => {
    const v1 = createEmptyArtifact("TEST-PLURAL");
    v1.metadata.version = 1;

    const v2 = createEmptyArtifact("TEST-PLURAL");
    v2.metadata.version = 2;
    v2.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "C", mechanism: "M" },
    ];
    v2.sections.discriminative_tests = [
      { id: "T1", name: "T1", procedure: "P", discriminates: "H1", expected_outcomes: {}, potency_check: "PC" },
      { id: "T2", name: "T2", procedure: "P", discriminates: "H1", expected_outcomes: {}, potency_check: "PC" },
    ];

    const diff = diffArtifacts(v1, v2);
    const output = formatDiffHuman(diff);

    expect(output).toContain("+1 hypothesis");
    expect(output).toContain("+2 tests");
  });

  test("shows 'No significant changes' when nothing changed", () => {
    const v1 = createEmptyArtifact("TEST-EMPTY");
    v1.metadata.version = 1;

    const v2 = createEmptyArtifact("TEST-EMPTY");
    v2.metadata.version = 2;

    const diff = diffArtifacts(v1, v2);
    const output = formatDiffHuman(diff);

    expect(output).toContain("No significant changes");
  });

  test("formats anomaly promoted and dismissed correctly", () => {
    const v1 = createEmptyArtifact("TEST-ANOMALY-FORMAT");
    v1.metadata.version = 1;
    v1.sections.anomaly_register = [
      { id: "X1", name: "Anomaly1", observation: "Obs1", conflicts_with: [], status: "active" },
      { id: "X2", name: "Anomaly2", observation: "Obs2", conflicts_with: [], status: "active" },
    ];

    const v2 = createEmptyArtifact("TEST-ANOMALY-FORMAT");
    v2.metadata.version = 2;
    v2.sections.anomaly_register = [
      {
        id: "X1",
        name: "Anomaly1",
        observation: "Obs1",
        conflicts_with: [],
        status: "resolved",
        resolution_plan: "Promoted to H5",
      },
      { id: "X2", name: "Anomaly2", observation: "Obs2", conflicts_with: [], status: "deferred" },
    ];

    const diff = diffArtifacts(v1, v2);
    const output = formatDiffHuman(diff);

    expect(output).toContain("ANOMALIES");
    expect(output).toContain("↑ [X1] PROMOTED TO");
    expect(output).toContain("○ [X2] dismissed:");
  });

  test("formats summary with anomalies_resolved count", () => {
    const v1 = createEmptyArtifact("TEST-ANOMALY-SUMMARY");
    v1.metadata.version = 1;
    v1.sections.anomaly_register = [
      { id: "X1", name: "Anomaly1", observation: "Obs", conflicts_with: [], status: "active" },
      { id: "X2", name: "Anomaly2", observation: "Obs", conflicts_with: [], status: "active" },
    ];

    const v2 = createEmptyArtifact("TEST-ANOMALY-SUMMARY");
    v2.metadata.version = 2;
    v2.sections.anomaly_register = [
      { id: "X1", name: "Anomaly1", observation: "Obs", conflicts_with: [], status: "resolved", resolution_plan: "Explained" },
      { id: "X2", name: "Anomaly2", observation: "Obs", conflicts_with: [], status: "deferred" },
    ];

    const diff = diffArtifacts(v1, v2);
    const output = formatDiffHuman(diff);

    expect(output).toContain("2 anomalies resolved");
  });

  test("formats single anomaly resolved with correct pluralization", () => {
    const v1 = createEmptyArtifact("TEST-ANOMALY-SINGLE");
    v1.metadata.version = 1;
    v1.sections.anomaly_register = [
      { id: "X1", name: "Anomaly1", observation: "Obs", conflicts_with: [], status: "active" },
    ];

    const v2 = createEmptyArtifact("TEST-ANOMALY-SINGLE");
    v2.metadata.version = 2;
    v2.sections.anomaly_register = [
      { id: "X1", name: "Anomaly1", observation: "Obs", conflicts_with: [], status: "resolved", resolution_plan: "Explained" },
    ];

    const diff = diffArtifacts(v1, v2);
    const output = formatDiffHuman(diff);

    expect(output).toContain("1 anomaly resolved");
  });
});

describe("formatDiffJson", () => {
  test("produces valid JSON output", () => {
    const v1 = createEmptyArtifact("TEST-JSON");
    v1.metadata.version = 1;

    const v2 = createEmptyArtifact("TEST-JSON");
    v2.metadata.version = 2;
    v2.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "C", mechanism: "M" },
    ];

    const diff = diffArtifacts(v1, v2);
    const json = formatDiffJson(diff);

    expect(() => JSON.parse(json)).not.toThrow();

    const parsed = JSON.parse(json);
    expect(parsed.from_version).toBe(1);
    expect(parsed.to_version).toBe(2);
    expect(parsed.changes.hypothesis_slate.added).toHaveLength(1);
    expect(parsed.summary.hypotheses_added).toBe(1);
  });
});

// Additional coverage for diffArtifacts edge cases
describe("diffArtifacts edge cases", () => {
  test("handles research thread creation from null", () => {
    const v1 = createEmptyArtifact("TEST-RT-NULL");
    v1.metadata.version = 1;
    v1.sections.research_thread = null;

    const v2 = createEmptyArtifact("TEST-RT-NULL");
    v2.metadata.version = 2;
    v2.sections.research_thread = {
      id: "RT",
      statement: "New question",
      context: "Context",
      why_it_matters: "Importance",
    };

    const diff = diffArtifacts(v1, v2);
    expect(diff.changes.research_thread.edited).toHaveLength(1);
    expect(diff.changes.research_thread.edited[0].field).toBe("statement");
    expect(diff.changes.research_thread.edited[0].old_value).toBe("");
  });

  test("handles anomaly deferred status", () => {
    const v1 = createEmptyArtifact("TEST-ANOMALY-DEFERRED");
    v1.metadata.version = 1;
    v1.sections.anomaly_register = [
      { id: "X1", name: "Anomaly", observation: "Obs", conflicts_with: [], status: "active" },
    ];

    const v2 = createEmptyArtifact("TEST-ANOMALY-DEFERRED");
    v2.metadata.version = 2;
    v2.sections.anomaly_register = [
      { id: "X1", name: "Anomaly", observation: "Obs", conflicts_with: [], status: "deferred" },
    ];

    const diff = diffArtifacts(v1, v2);
    expect(diff.changes.anomaly_register.dismissed).toHaveLength(1);
    expect(diff.changes.anomaly_register.dismissed[0].reason).toContain("Deferred");
  });

  test("handles anomaly resolved without promotion", () => {
    const v1 = createEmptyArtifact("TEST-ANOMALY-RESOLVED");
    v1.metadata.version = 1;
    v1.sections.anomaly_register = [
      { id: "X1", name: "Anomaly", observation: "Obs", conflicts_with: [], status: "active" },
    ];

    const v2 = createEmptyArtifact("TEST-ANOMALY-RESOLVED");
    v2.metadata.version = 2;
    v2.sections.anomaly_register = [
      { id: "X1", name: "Anomaly", observation: "Obs", conflicts_with: [], status: "resolved", resolution_plan: "Measurement error - dismissed" },
    ];

    const diff = diffArtifacts(v1, v2);
    expect(diff.changes.anomaly_register.dismissed).toHaveLength(1);
    expect(diff.changes.anomaly_register.dismissed[0].reason).toBe("Measurement error - dismissed");
  });

  test("handles killed tests", () => {
    const v1 = createEmptyArtifact("TEST-KILLED-TEST");
    v1.metadata.version = 1;
    v1.sections.discriminative_tests = [
      { id: "T1", name: "Test 1", procedure: "P", discriminates: "H1", expected_outcomes: {}, potency_check: "PC" },
    ];

    const v2 = createEmptyArtifact("TEST-KILLED-TEST");
    v2.metadata.version = 2;
    v2.sections.discriminative_tests = [
      { id: "T1", name: "Test 1", procedure: "P", discriminates: "H1", expected_outcomes: {}, potency_check: "PC", killed: true, kill_reason: "Obsolete" },
    ];

    const diff = diffArtifacts(v1, v2);
    expect(diff.changes.discriminative_tests.killed).toHaveLength(1);
    expect(diff.summary.tests_killed).toBe(1);
  });

  test("handles killed assumptions", () => {
    const v1 = createEmptyArtifact("TEST-KILLED-ASSUMPTION");
    v1.metadata.version = 1;
    v1.sections.assumption_ledger = [
      { id: "A1", name: "Assumption", statement: "S", load: "L", test: "T" },
    ];

    const v2 = createEmptyArtifact("TEST-KILLED-ASSUMPTION");
    v2.metadata.version = 2;
    v2.sections.assumption_ledger = [
      { id: "A1", name: "Assumption", statement: "S", load: "L", test: "T", killed: true, kill_reason: "Invalid" },
    ];

    const diff = diffArtifacts(v1, v2);
    expect(diff.changes.assumption_ledger.killed).toHaveLength(1);
    expect(diff.summary.assumptions_killed).toBe(1);
  });

  test("handles killed critiques", () => {
    const v1 = createEmptyArtifact("TEST-KILLED-CRITIQUE");
    v1.metadata.version = 1;
    v1.sections.adversarial_critique = [
      { id: "C1", name: "Critique", attack: "A", evidence: "E", current_status: "active" },
    ];

    const v2 = createEmptyArtifact("TEST-KILLED-CRITIQUE");
    v2.metadata.version = 2;
    v2.sections.adversarial_critique = [
      { id: "C1", name: "Critique", attack: "A", evidence: "E", current_status: "active", killed: true, kill_reason: "Withdrawn" },
    ];

    const diff = diffArtifacts(v1, v2);
    expect(diff.changes.adversarial_critique.killed).toHaveLength(1);
  });

  test("handles killed predictions", () => {
    const v1 = createEmptyArtifact("TEST-KILLED-PRED");
    v1.metadata.version = 1;
    v1.sections.predictions_table = [
      { id: "P1", condition: "Cond 1", predictions: { H1: "X" } },
    ];

    const v2 = createEmptyArtifact("TEST-KILLED-PRED");
    v2.metadata.version = 2;
    v2.sections.predictions_table = [
      { id: "P1", condition: "Cond 1", predictions: { H1: "X" }, killed: true, kill_reason: "Replaced" },
    ];

    const diff = diffArtifacts(v1, v2);
    expect(diff.changes.predictions_table.killed).toHaveLength(1);
  });

  test("handles killed anomalies", () => {
    const v1 = createEmptyArtifact("TEST-KILLED-ANOMALY");
    v1.metadata.version = 1;
    v1.sections.anomaly_register = [
      { id: "X1", name: "Anomaly", observation: "Obs", conflicts_with: [], status: "active" },
    ];

    const v2 = createEmptyArtifact("TEST-KILLED-ANOMALY");
    v2.metadata.version = 2;
    v2.sections.anomaly_register = [
      { id: "X1", name: "Anomaly", observation: "Obs", conflicts_with: [], status: "active", killed: true, kill_reason: "Artifact" },
    ];

    const diff = diffArtifacts(v1, v2);
    expect(diff.changes.anomaly_register.killed).toHaveLength(1);
  });

  test("handles added predictions", () => {
    const v1 = createEmptyArtifact("TEST-ADDED-PRED");
    v1.metadata.version = 1;

    const v2 = createEmptyArtifact("TEST-ADDED-PRED");
    v2.metadata.version = 2;
    v2.sections.predictions_table = [
      { id: "P1", condition: "New prediction", predictions: { H1: "X" } },
    ];

    const diff = diffArtifacts(v1, v2);
    expect(diff.changes.predictions_table.added).toHaveLength(1);
    expect(diff.changes.predictions_table.added[0].condition).toBe("New prediction");
  });

  test("handles edited predictions", () => {
    const v1 = createEmptyArtifact("TEST-EDITED-PRED");
    v1.metadata.version = 1;
    v1.sections.predictions_table = [
      { id: "P1", condition: "Original condition", predictions: { H1: "X" } },
    ];

    const v2 = createEmptyArtifact("TEST-EDITED-PRED");
    v2.metadata.version = 2;
    v2.sections.predictions_table = [
      { id: "P1", condition: "Updated condition", predictions: { H1: "X" } },
    ];

    const diff = diffArtifacts(v1, v2);
    expect(diff.changes.predictions_table.edited).toHaveLength(1);
    expect(diff.changes.predictions_table.edited[0].field).toBe("condition");
  });

  test("handles test with empty discriminates", () => {
    const v1 = createEmptyArtifact("TEST-EMPTY-DISC");
    v1.metadata.version = 1;

    const v2 = createEmptyArtifact("TEST-EMPTY-DISC");
    v2.metadata.version = 2;
    v2.sections.discriminative_tests = [
      { id: "T1", name: "Test", procedure: "P", discriminates: "", expected_outcomes: {}, potency_check: "PC" },
    ];

    const diff = diffArtifacts(v1, v2);
    expect(diff.changes.discriminative_tests.added[0].targets).toEqual([]);
  });

  test("handles test removed from artifact", () => {
    const v1 = createEmptyArtifact("TEST-REMOVED-TEST");
    v1.metadata.version = 1;
    v1.sections.discriminative_tests = [
      { id: "T1", name: "Test 1", procedure: "P", discriminates: "H1", expected_outcomes: {}, potency_check: "PC" },
    ];

    const v2 = createEmptyArtifact("TEST-REMOVED-TEST");
    v2.metadata.version = 2;
    v2.sections.discriminative_tests = [];

    const diff = diffArtifacts(v1, v2);
    expect(diff.changes.discriminative_tests.killed).toHaveLength(1);
    expect(diff.changes.discriminative_tests.killed[0].rationale).toBe("Removed from artifact");
  });

  test("handles assumption removed from artifact", () => {
    const v1 = createEmptyArtifact("TEST-REMOVED-ASSUMPTION");
    v1.metadata.version = 1;
    v1.sections.assumption_ledger = [
      { id: "A1", name: "Assumption", statement: "S", load: "L", test: "T" },
    ];

    const v2 = createEmptyArtifact("TEST-REMOVED-ASSUMPTION");
    v2.metadata.version = 2;
    v2.sections.assumption_ledger = [];

    const diff = diffArtifacts(v1, v2);
    expect(diff.changes.assumption_ledger.killed).toHaveLength(1);
    expect(diff.changes.assumption_ledger.killed[0].rationale).toBe("Removed from artifact");
  });

  test("handles anomaly removed from artifact", () => {
    const v1 = createEmptyArtifact("TEST-REMOVED-ANOMALY");
    v1.metadata.version = 1;
    v1.sections.anomaly_register = [
      { id: "X1", name: "Anomaly", observation: "Obs", conflicts_with: [], status: "active" },
    ];

    const v2 = createEmptyArtifact("TEST-REMOVED-ANOMALY");
    v2.metadata.version = 2;
    v2.sections.anomaly_register = [];

    const diff = diffArtifacts(v1, v2);
    expect(diff.changes.anomaly_register.killed).toHaveLength(1);
    expect(diff.changes.anomaly_register.killed[0].rationale).toBe("Removed from artifact");
  });

  test("handles critique removed from artifact", () => {
    const v1 = createEmptyArtifact("TEST-REMOVED-CRITIQUE");
    v1.metadata.version = 1;
    v1.sections.adversarial_critique = [
      { id: "C1", name: "Critique", attack: "A", evidence: "E", current_status: "active" },
    ];

    const v2 = createEmptyArtifact("TEST-REMOVED-CRITIQUE");
    v2.metadata.version = 2;
    v2.sections.adversarial_critique = [];

    const diff = diffArtifacts(v1, v2);
    expect(diff.changes.adversarial_critique.killed).toHaveLength(1);
    expect(diff.changes.adversarial_critique.killed[0].rationale).toBe("Removed from artifact");
  });

  test("handles prediction removed from artifact", () => {
    const v1 = createEmptyArtifact("TEST-REMOVED-PRED");
    v1.metadata.version = 1;
    v1.sections.predictions_table = [
      { id: "P1", condition: "Cond", predictions: {} },
    ];

    const v2 = createEmptyArtifact("TEST-REMOVED-PRED");
    v2.metadata.version = 2;
    v2.sections.predictions_table = [];

    const diff = diffArtifacts(v1, v2);
    expect(diff.changes.predictions_table.killed).toHaveLength(1);
    expect(diff.changes.predictions_table.killed[0].rationale).toBe("Removed from artifact");
  });

  test("handles MINIMAL progress level", () => {
    const v1 = createEmptyArtifact("TEST-MINIMAL");
    v1.metadata.version = 1;

    const v2 = createEmptyArtifact("TEST-MINIMAL");
    v2.metadata.version = 2;
    v2.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "C", mechanism: "M" },
    ];

    const diff = diffArtifacts(v1, v2);
    expect(diff.summary.progress_score).toBe("MINIMAL");
  });

  test("formats diff with anomalies section", () => {
    const v1 = createEmptyArtifact("TEST-FORMAT-ANOMALY");
    v1.metadata.version = 1;

    const v2 = createEmptyArtifact("TEST-FORMAT-ANOMALY");
    v2.metadata.version = 2;
    v2.sections.anomaly_register = [
      { id: "X1", name: "New Anomaly", observation: "Very long observation that exceeds sixty characters when displayed in output", conflicts_with: [], status: "active" },
    ];

    const diff = diffArtifacts(v1, v2);
    const output = formatDiffHuman(diff);
    expect(output).toContain("ANOMALIES");
    expect(output).toContain("+ [X1]");
  });

  test("formats diff with assumptions section", () => {
    const v1 = createEmptyArtifact("TEST-FORMAT-ASSUMPTION");
    v1.metadata.version = 1;

    const v2 = createEmptyArtifact("TEST-FORMAT-ASSUMPTION");
    v2.metadata.version = 2;
    v2.sections.assumption_ledger = [
      { id: "A1", name: "New Assumption", statement: "Statement", load: "L", test: "T" },
    ];

    const diff = diffArtifacts(v1, v2);
    const output = formatDiffHuman(diff);
    expect(output).toContain("ASSUMPTIONS");
    expect(output).toContain("+ [A1]");
  });

  test("formats negative hypothesis net change", () => {
    const v1 = createEmptyArtifact("TEST-NEG-NET");
    v1.metadata.version = 1;
    v1.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "C", mechanism: "M" },
      { id: "H2", name: "H2", claim: "C", mechanism: "M" },
    ];

    const v2 = createEmptyArtifact("TEST-NEG-NET");
    v2.metadata.version = 2;
    v2.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "C", mechanism: "M" },
      { id: "H2", name: "H2", claim: "C", mechanism: "M", killed: true, kill_reason: "Refuted" },
    ];

    const diff = diffArtifacts(v1, v2);
    expect(diff.changes.hypothesis_slate.killed).toHaveLength(1);
    expect(diff.changes.hypothesis_slate.killed[0].rationale).toBe("Refuted");
    expect(diff.summary.hypotheses_net).toBe(-1);
  });

  test("handles critique with addressed status", () => {
    const v1 = createEmptyArtifact("TEST-ADDRESSED");
    v1.metadata.version = 1;
    v1.sections.adversarial_critique = [
      { id: "C1", name: "Critique", attack: "A", evidence: "E", current_status: "active" },
    ];

    const v2 = createEmptyArtifact("TEST-ADDRESSED");
    v2.metadata.version = 2;
    v2.sections.adversarial_critique = [
      { id: "C1", name: "Critique", attack: "A", evidence: "E", current_status: "addressed in v2" },
    ];

    const diff = diffArtifacts(v1, v2);
    expect(diff.changes.adversarial_critique.resolved).toHaveLength(1);
    expect(diff.changes.adversarial_critique.resolved[0].id).toBe("C1");
  });

  test("handles critique with fixed status", () => {
    const v1 = createEmptyArtifact("TEST-FIXED");
    v1.metadata.version = 1;
    v1.sections.adversarial_critique = [
      { id: "C1", name: "Critique", attack: "A", evidence: "E", current_status: "active" },
    ];

    const v2 = createEmptyArtifact("TEST-FIXED");
    v2.metadata.version = 2;
    v2.sections.adversarial_critique = [
      { id: "C1", name: "Critique", attack: "A", evidence: "E", current_status: "fixed" },
    ];

    const diff = diffArtifacts(v1, v2);
    expect(diff.changes.adversarial_critique.resolved).toHaveLength(1);
    expect(diff.changes.adversarial_critique.resolved[0].id).toBe("C1");
  });

  test("handles anomaly promoted with explicit H number", () => {
    const v1 = createEmptyArtifact("TEST-H-MATCH");
    v1.metadata.version = 1;
    v1.sections.anomaly_register = [
      { id: "X1", name: "Anomaly", observation: "Obs", conflicts_with: [], status: "active" },
    ];

    const v2 = createEmptyArtifact("TEST-H-MATCH");
    v2.metadata.version = 2;
    v2.sections.anomaly_register = [
      { id: "X1", name: "Anomaly", observation: "Obs", conflicts_with: [], status: "resolved", resolution_plan: "Spawned H5 to explain this" },
    ];

    const diff = diffArtifacts(v1, v2);
    expect(diff.changes.anomaly_register.promoted).toHaveLength(1);
    expect(diff.changes.anomaly_register.promoted[0].id).toBe("X1");
    expect(diff.changes.anomaly_register.promoted[0].promoted_to).toBe("H5");
  });

  test("handles anomaly promoted with just 'promoted' keyword", () => {
    const v1 = createEmptyArtifact("TEST-PROMOTED-KW");
    v1.metadata.version = 1;
    v1.sections.anomaly_register = [
      { id: "X1", name: "Anomaly", observation: "Obs", conflicts_with: [], status: "active" },
    ];

    const v2 = createEmptyArtifact("TEST-PROMOTED-KW");
    v2.metadata.version = 2;
    v2.sections.anomaly_register = [
      { id: "X1", name: "Anomaly", observation: "Obs", conflicts_with: [], status: "resolved", resolution_plan: "Promoted to new hypothesis" },
    ];

    const diff = diffArtifacts(v1, v2);
    expect(diff.changes.anomaly_register.promoted).toHaveLength(1);
    expect(diff.changes.anomaly_register.promoted[0].id).toBe("X1");
    expect(diff.changes.anomaly_register.promoted[0].promoted_to).toBe("hypothesis");
  });

  test("handles EXCELLENT progress with all positive indicators", () => {
    const v1 = createEmptyArtifact("TEST-EXCELLENT");
    v1.metadata.version = 1;
    v1.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "C", mechanism: "M" },
      { id: "H2", name: "H2", claim: "C", mechanism: "M" },
    ];
    v1.sections.adversarial_critique = [
      { id: "C1", name: "Critique 1", attack: "A", evidence: "E", current_status: "active" },
      { id: "C2", name: "Critique 2", attack: "A", evidence: "E", current_status: "active" },
    ];
    v1.sections.anomaly_register = [
      { id: "X1", name: "Anomaly", observation: "Obs", conflicts_with: [], status: "active" },
    ];

    const v2 = createEmptyArtifact("TEST-EXCELLENT");
    v2.metadata.version = 2;
    // Kill and add hypotheses (refinement)
    v2.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "C", mechanism: "M" },
      { id: "H2", name: "H2", claim: "C", mechanism: "M", killed: true, kill_reason: "Refuted" },
      { id: "H3", name: "H3", claim: "C", mechanism: "M" },
    ];
    // Add multiple tests
    v2.sections.discriminative_tests = [
      { id: "T1", name: "T1", procedure: "P", discriminates: "H1", expected_outcomes: {}, potency_check: "PC" },
      { id: "T2", name: "T2", procedure: "P", discriminates: "H1", expected_outcomes: {}, potency_check: "PC" },
    ];
    // Resolve multiple critiques
    v2.sections.adversarial_critique = [
      { id: "C1", name: "Critique 1", attack: "A", evidence: "E", current_status: "resolved" },
      { id: "C2", name: "Critique 2", attack: "A", evidence: "E", current_status: "resolved" },
    ];
    // Resolve anomaly
    v2.sections.anomaly_register = [
      { id: "X1", name: "Anomaly", observation: "Obs", conflicts_with: [], status: "resolved", resolution_plan: "Explained" },
    ];

    const diff = diffArtifacts(v1, v2);
    expect(diff.summary.progress_score).toBe("EXCELLENT");
  });

  test("handles field comparison with null values", () => {
    const v1 = createEmptyArtifact("TEST-NULL-FIELD");
    v1.metadata.version = 1;
    v1.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "C", mechanism: "M", third_alternative: null } as unknown as HypothesisItem,
    ];

    const v2 = createEmptyArtifact("TEST-NULL-FIELD");
    v2.metadata.version = 2;
    v2.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "C", mechanism: "M", third_alternative: null } as unknown as HypothesisItem,
    ];

    const diff = diffArtifacts(v1, v2);
    // No edits expected for null -> null
    expect(diff.changes.hypothesis_slate.edited.filter(e => e.field === "third_alternative")).toHaveLength(0);
  });

  test("handles undefined to defined field transition", () => {
    const v1 = createEmptyArtifact("TEST-UNDEF-FIELD");
    v1.metadata.version = 1;
    v1.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "C", mechanism: "M" },
    ];

    const v2 = createEmptyArtifact("TEST-UNDEF-FIELD");
    v2.metadata.version = 2;
    v2.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "C", mechanism: "M", third_alternative: true },
    ];

    const diff = diffArtifacts(v1, v2);
    expect(diff.changes.hypothesis_slate.edited.some(e => e.field === "third_alternative")).toBe(true);
  });

  test("truncates long field values in edit changes", () => {
    const longValue = "A".repeat(200);
    const v1 = createEmptyArtifact("TEST-LONG");
    v1.metadata.version = 1;
    v1.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: longValue, mechanism: "M" },
    ];

    const v2 = createEmptyArtifact("TEST-LONG");
    v2.metadata.version = 2;
    v2.sections.hypothesis_slate = [
      { id: "H1", name: "H1", claim: "Short", mechanism: "M" },
    ];

    const diff = diffArtifacts(v1, v2);
    expect(diff.changes.hypothesis_slate.edited[0].old_value.length).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// Tests: Cross-Session References
// ============================================================================

describe("Cross-Session References", () => {
  describe("extractReferences", () => {
    test("extracts references from hypothesis slate", () => {
      const artifact = createEmptyArtifact("TEST-REF");
      artifact.sections.hypothesis_slate = [
        {
          id: "H1",
          name: "H1",
          claim: "C",
          mechanism: "M",
          references: [
            { session: "RS-20251230-prior", item: "H2", relation: "extends" },
          ],
        },
      ];

      const refs = extractReferences(artifact);
      expect(refs.size).toBe(1);
      expect(refs.get("H1")).toEqual([
        { session: "RS-20251230-prior", item: "H2", relation: "extends" },
      ]);
    });

    test("extracts references from multiple sections", () => {
      const artifact = createEmptyArtifact("TEST-REF-MULTI");
      artifact.sections.hypothesis_slate = [
        {
          id: "H1",
          name: "H1",
          claim: "C",
          mechanism: "M",
          references: [{ session: "PREV", item: "H1", relation: "refines" }],
        },
      ];
      artifact.sections.discriminative_tests = [
        {
          id: "T1",
          name: "T1",
          procedure: "P",
          discriminates: "H1",
          expected_outcomes: {},
          potency_check: "PC",
          references: [{ session: "PREV", item: "T2", relation: "replicates" }],
        },
      ];

      const refs = extractReferences(artifact);
      expect(refs.size).toBe(2);
      expect(refs.has("H1")).toBe(true);
      expect(refs.has("T1")).toBe(true);
    });

    test("returns empty map for artifact with no references", () => {
      const artifact = createEmptyArtifact("TEST-NO-REF");
      artifact.sections.hypothesis_slate = [
        { id: "H1", name: "H1", claim: "C", mechanism: "M" },
      ];

      const refs = extractReferences(artifact);
      expect(refs.size).toBe(0);
    });

    test("ignores items with empty references array", () => {
      const artifact = createEmptyArtifact("TEST-EMPTY-REF");
      artifact.sections.hypothesis_slate = [
        { id: "H1", name: "H1", claim: "C", mechanism: "M", references: [] },
      ];

      const refs = extractReferences(artifact);
      expect(refs.size).toBe(0);
    });
  });

  describe("validateArtifact with references", () => {
    test("returns no warnings for valid references", () => {
      const artifact = createEmptyArtifact("TEST-VALID-REF");
      // Add Research Thread for completeness
      artifact.sections.research_thread = {
          id: "RT", statement: "S", context: "C", why_it_matters: "W", anchors: ["§1"]
      };

      // Add minimum items to avoid other warnings
      artifact.sections.hypothesis_slate = [
        { id: "H1", name: "H1", claim: "C", mechanism: "M", third_alternative: true, anchors: ["§1"] },
        { id: "H2", name: "H2", claim: "C", mechanism: "M", anchors: ["§1"] },
        {
          id: "H3",
          name: "H3",
          claim: "C",
          mechanism: "M",
          anchors: ["§1"],
          references: [
            { session: "RS-20251230-prior", item: "H1", relation: "extends" },
            { session: "RS-20251229-earlier", item: "H2", relation: "refutes" },
          ],
        },
      ];
      artifact.sections.predictions_table = [
        { id: "P1", condition: "C", predictions: { H1: "O1" } },
        { id: "P2", condition: "C", predictions: { H1: "O1" } },
        { id: "P3", condition: "C", predictions: { H1: "O1" } },
      ];
      artifact.sections.discriminative_tests = [
        { id: "T1", name: "T1", procedure: "P", discriminates: "H1 vs H2", expected_outcomes: {}, potency_check: "Control", score: { likelihood_ratio: 1, cost: 1, speed: 1, ambiguity: 1 } },
        { id: "T2", name: "T2", procedure: "P", discriminates: "H1 vs H2", expected_outcomes: {}, potency_check: "Control", score: { likelihood_ratio: 1, cost: 1, speed: 1, ambiguity: 1 } },
      ];
      artifact.sections.assumption_ledger = [
        { id: "A1", name: "A1", statement: "S1", load: "L1", test: "T1", scale_check: true, calculation: "C" },
        { id: "A2", name: "A2", statement: "S2", load: "L2", test: "T2" },
        { id: "A3", name: "A3", statement: "S3", load: "L3", test: "T3", killed: true },
      ];
      artifact.sections.adversarial_critique = [
        { id: "C1", name: "C1", attack: "A", evidence: "E", current_status: "active", real_third_alternative: true },
        { id: "C2", name: "C2", attack: "A", evidence: "E", current_status: "active" },
      ];

      const report = lintArtifact(artifact);
      const refWarnings = report.violations.filter((w) => w.id.startsWith("ER-REF"));
      expect(refWarnings).toHaveLength(0);
    });

    test("warns on invalid reference relation type", () => {
      const artifact = createEmptyArtifact("TEST-BAD-REL");
      // Add RT
      artifact.sections.research_thread = { id: "RT", statement: "S", context: "C", why_it_matters: "W", anchors: ["§1"] };

      artifact.sections.hypothesis_slate = [
        {
          id: "H1",
          name: "H1",
          claim: "C",
          mechanism: "M",
          anchors: ["§1"],
          references: [
            { session: "PREV", item: "H1", relation: "invalid_relation" as unknown as ReferenceRelation },
          ],
        },
      ];

      const report = lintArtifact(artifact);
      const refWarnings = report.violations.filter((w) => w.id === "ER-REF-005");
      expect(refWarnings.length).toBeGreaterThan(0);
      expect(refWarnings[0].message).toContain("relation");
    });

    test("warns on missing session field", () => {
      const artifact = createEmptyArtifact("TEST-NO-SESSION");
      // Add RT
      artifact.sections.research_thread = { id: "RT", statement: "S", context: "C", why_it_matters: "W", anchors: ["§1"] };

      artifact.sections.hypothesis_slate = [
        {
          id: "H1",
          name: "H1",
          claim: "C",
          mechanism: "M",
          anchors: ["§1"],
          references: [{ item: "H1", relation: "extends" } as unknown as Reference],
        },
      ];

      const report = lintArtifact(artifact);
      const refWarnings = report.violations.filter((w) => w.id === "ER-REF-003");
      expect(refWarnings.length).toBeGreaterThan(0);
      expect(refWarnings[0].message).toContain("session");
    });

    test("warns on missing item field", () => {
      const artifact = createEmptyArtifact("TEST-NO-ITEM");
      // Add RT
      artifact.sections.research_thread = { id: "RT", statement: "S", context: "C", why_it_matters: "W", anchors: ["§1"] };

      artifact.sections.hypothesis_slate = [
        {
          id: "H1",
          name: "H1",
          claim: "C",
          mechanism: "M",
          anchors: ["§1"],
          references: [{ session: "PREV", relation: "extends" } as unknown as Reference],
        },
      ];

      const report = lintArtifact(artifact);
      const refWarnings = report.violations.filter((w) => w.id === "ER-REF-004");
      expect(refWarnings.length).toBeGreaterThan(0);
      expect(refWarnings[0].message).toContain("item");
    });

    test("warns on non-array references field", () => {
      const artifact = createEmptyArtifact("TEST-REF-OBJ");
      // Add RT
      artifact.sections.research_thread = { id: "RT", statement: "S", context: "C", why_it_matters: "W", anchors: ["§1"] };

      artifact.sections.hypothesis_slate = [
        {
          id: "H1",
          name: "H1",
          claim: "C",
          mechanism: "M",
          anchors: ["§1"],
          references: { session: "PREV", item: "H1", relation: "extends" } as unknown as Reference[],
        },
      ];

      const report = lintArtifact(artifact);
      const refWarnings = report.violations.filter((w) => w.id === "ER-REF-001");
      expect(refWarnings.length).toBeGreaterThan(0);
      expect(refWarnings[0].message).toContain("array");
    });

    test("warns on non-object reference in array", () => {
      const artifact = createEmptyArtifact("TEST-REF-STR");
      // Add RT
      artifact.sections.research_thread = { id: "RT", statement: "S", context: "C", why_it_matters: "W", anchors: ["§1"] };

      artifact.sections.hypothesis_slate = [
        {
          id: "H1",
          name: "H1",
          claim: "C",
          mechanism: "M",
          anchors: ["§1"],
          references: ["RS-20251230:H1:extends"] as unknown as Reference[],
        },
      ];

      const report = lintArtifact(artifact);
      const refWarnings = report.violations.filter((w) => w.id === "ER-REF-002");
      expect(refWarnings.length).toBeGreaterThan(0);
      expect(refWarnings[0].message).toContain("object");
    });

    test("validates all reference relation types", () => {
      const validRelations: Array<Reference["relation"]> = [
        "extends",
        "refines",
        "refutes",
        "informed_by",
        "supersedes",
        "replicates",
      ];

      for (const relation of validRelations) {
        const artifact = createEmptyArtifact(`TEST-REL-${relation}`);
        // Add RT
        artifact.sections.research_thread = { id: "RT", statement: "S", context: "C", why_it_matters: "W", anchors: ["§1"] };

        artifact.sections.hypothesis_slate = [
          {
            id: "H1",
            name: "H1",
            claim: "C",
            mechanism: "M",
            anchors: ["§1"],
            references: [{ session: "PREV", item: "H1", relation }],
          },
        ];

        const report = lintArtifact(artifact);
        const refWarnings = report.violations.filter((w) => w.id.startsWith("ER-REF"));
        expect(refWarnings).toHaveLength(0);
      }
    });

    test("validates references in all section types", () => {
      const artifact = createEmptyArtifact("TEST-ALL-SECTIONS");
      // Add RT
      artifact.sections.research_thread = { id: "RT", statement: "S", context: "C", why_it_matters: "W", anchors: ["§1"] };
      const ref: Reference = { session: "PREV", item: "X1", relation: "informed_by" };

      artifact.sections.hypothesis_slate = [
        { id: "H1", name: "H1", claim: "C", mechanism: "M", anchors: ["§1"], references: [ref] },
      ];
      artifact.sections.predictions_table = [
        { id: "P1", condition: "C", predictions: {}, references: [ref] },
      ];
      artifact.sections.discriminative_tests = [
        { id: "T1", name: "T", procedure: "P", discriminates: "H1", expected_outcomes: {}, potency_check: "PC", score: { likelihood_ratio: 1, cost: 1, speed: 1, ambiguity: 1 }, references: [ref] },
      ];
      artifact.sections.assumption_ledger = [
        { id: "A1", name: "A", statement: "S", load: "L", test: "T", scale_check: true, calculation: "1e3", references: [ref] },
      ];
      artifact.sections.anomaly_register = [
        { id: "X1", name: "X", observation: "O", conflicts_with: [], references: [ref] },
      ];
      artifact.sections.adversarial_critique = [
        { id: "C1", name: "C1", attack: "A", evidence: "E", current_status: "active", references: [ref] },
      ];

      const report = lintArtifact(artifact);
      const refWarnings = report.violations.filter((w) => w.id.startsWith("ER-REF"));
      expect(refWarnings).toHaveLength(0);
    });
  });
});

// ============================================================================
// Intervention Metadata
// ============================================================================

describe("createInterventionMetadata", () => {
  test("creates metadata from empty summary", () => {
    const summary = createEmptyInterventionSummary();
    const metadata = createInterventionMetadata(summary);

    expect(metadata.count).toBe(0);
    expect(metadata.has_major).toBe(false);
    expect(metadata.by_severity).toEqual({
      minor: 0,
      moderate: 0,
      major: 0,
      critical: 0,
    });
    expect(metadata.operators).toBeUndefined();
  });

  test("creates metadata with intervention counts", () => {
    const summary: InterventionSummary = {
      total_count: 5,
      by_severity: { minor: 2, moderate: 1, major: 1, critical: 1 },
      by_type: {
        artifact_edit: 2,
        delta_exclusion: 1,
        delta_injection: 1,
        decision_override: 0,
        session_control: 1,
        role_reassignment: 0,
      },
      has_major_interventions: true,
      operators: ["alice", "bob"],
      first_intervention_at: "2025-12-30T10:00:00+00:00",
      last_intervention_at: "2025-12-30T14:00:00+00:00",
    };

    const metadata = createInterventionMetadata(summary);

    expect(metadata.count).toBe(5);
    expect(metadata.has_major).toBe(true);
    expect(metadata.by_severity?.minor).toBe(2);
    expect(metadata.by_severity?.critical).toBe(1);
    expect(metadata.operators).toEqual(["alice", "bob"]);
  });

  test("omits operators when empty", () => {
    const summary = createEmptyInterventionSummary();
    summary.total_count = 1;
    summary.by_severity.minor = 1;

    const metadata = createInterventionMetadata(summary);

    expect(metadata.operators).toBeUndefined();
  });
});

// ============================================================================
// Runtime error containment (brenner_bot upstream fix 44319ab) — session_state.json
// is hand-editable between HITL rounds; a bad manual edit that leaves a section
// malformed must not crash the entire merge for every agent's deltas in the batch.
// ============================================================================

describe("mergeArtifact runtime error containment", () => {
  test("does not throw when a section on disk is corrupted (not an array)", () => {
    const artifact = createEmptyArtifact("TEST-001");
    // Simulate a session_state.json that was hand-edited into a bad shape between rounds.
    (artifact.sections as unknown as Record<string, unknown>).hypothesis_slate = null;

    const delta = makeValidDelta("ADD", "hypothesis_slate", null, {
      name: "Test Hypothesis",
      claim: "Something is true",
    });

    expect(() =>
      mergeArtifact(artifact, [delta], "TestAgent", "2025-01-01T00:00:00Z"),
    ).not.toThrow();
  });

  test("still applies other agents' valid deltas in the same batch after one throws", () => {
    const artifact = createEmptyArtifact("TEST-001");
    (artifact.sections as unknown as Record<string, unknown>).hypothesis_slate = null;

    const badDelta = makeValidDelta("ADD", "hypothesis_slate", null, { name: "Bad" });
    const goodDelta = makeValidDelta("ADD", "predictions_table", null, {
      statement: "If X then Y",
      linked_hypotheses: [],
    });

    const result = mergeArtifact(
      artifact,
      [badDelta, goodDelta],
      "TestAgent",
      "2025-01-01T00:00:00Z",
    );

    expect(result.artifact.sections.predictions_table).toHaveLength(1);
  });
});
