import { describe, expect, it } from "vitest";
import {
  buildComparisonResults,
  buildEvidenceSummary,
  buildPredictionConflictMatrix,
  type ComparisonField,
} from "./comparison";
import type { HypothesisCard } from "./hypothesis";
import type { ComparisonMatrix } from "./hypothesis-arena";

function makeHypothesis(overrides: Partial<HypothesisCard>): HypothesisCard {
  return {
    id: overrides.id ?? "HC-TEST-001-v1",
    version: overrides.version ?? 1,
    statement: overrides.statement ?? "Baseline hypothesis",
    mechanism: overrides.mechanism ?? "Baseline mechanism",
    domain: overrides.domain ?? ["psychology"],
    predictionsIfTrue: overrides.predictionsIfTrue ?? ["Prediction A"],
    predictionsIfFalse: overrides.predictionsIfFalse ?? ["Prediction B"],
    impossibleIfTrue: overrides.impossibleIfTrue ?? ["Falsification"],
    confounds: overrides.confounds ?? [],
    assumptions: overrides.assumptions ?? [],
    confidence: overrides.confidence ?? 50,
    createdAt: overrides.createdAt ?? new Date("2026-01-01T00:00:00Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-01-01T00:00:00Z"),
    createdBy: overrides.createdBy,
    sessionId: overrides.sessionId,
    parentVersion: overrides.parentVersion,
    evolutionReason: overrides.evolutionReason,
  };
}

function makeMatrix(): ComparisonMatrix {
  return {
    arenaId: "AR-001",
    question: "Why does this happen?",
    tests: [
      { id: "T1", name: "Test 1", appliedAt: new Date("2026-01-01T00:00:00Z") },
      { id: "T2", name: "Test 2", appliedAt: new Date("2026-01-02T00:00:00Z") },
    ],
    rows: [
      {
        hypothesisId: "H1",
        statement: "Hypothesis A",
        status: "active",
        score: 10,
        testResults: { T1: "supports", T2: "neutral" },
        confidence: 60,
      },
      {
        hypothesisId: "H2",
        statement: "Hypothesis B",
        status: "active",
        score: -5,
        testResults: { T1: "challenges", T2: "neutral" },
        confidence: 45,
      },
    ],
    stats: {
      totalTests: 2,
      activeHypotheses: 2,
      eliminatedHypotheses: 0,
      averageScore: 2,
    },
  };
}

describe("comparison", () => {
  it("builds field-by-field comparison results", () => {
    const hypothesisA = makeHypothesis({
      id: "H1",
      statement: "Social media increases anxiety",
      predictionsIfTrue: ["Anxiety rises with usage"],
    });
    const hypothesisB = makeHypothesis({
      id: "H2",
      statement: "Social media increases anxiety",
      predictionsIfTrue: ["Anxiety falls with usage"],
    });

    const results = buildComparisonResults(hypothesisA, hypothesisB, [
      "statement",
      "predictionsIfTrue",
    ]);
    const statement = results.find((result) => result.field === "statement");
    const predictions = results.find((result) => result.field === "predictionsIfTrue");

    expect(statement?.similarity).toBe(1);
    expect(predictions?.similarity).toBeLessThan(0.8);
  });

  it("handles edge-case similarity and unknown fields", () => {
    const hypothesisA = makeHypothesis({
      id: "H-empty-a",
      statement: "",
      mechanism: "",
      confidence: Number.POSITIVE_INFINITY,
      predictionsIfTrue: [],
      predictionsIfFalse: [],
      impossibleIfTrue: [],
      assumptions: [],
    });
    const hypothesisB = makeHypothesis({
      id: "H-empty-b",
      statement: "",
      mechanism: "",
      confidence: Number.NaN,
      predictionsIfTrue: [],
      predictionsIfFalse: [],
      impossibleIfTrue: [],
      assumptions: [],
    });

    const results = buildComparisonResults(hypothesisA, hypothesisB, [
      "statement",
      "mechanism",
      "confidence",
      "assumptions",
      "not_real" as ComparisonField,
    ]);

    const statement = results.find((result) => result.field === "statement");
    expect(statement?.similarity).toBe(1);

    const mechanism = results.find((result) => result.field === "mechanism");
    expect(mechanism?.similarity).toBe(1);

    const confidence = results.find((result) => result.field === "confidence");
    expect(confidence?.valueA).toBe("");
    expect(confidence?.valueB).toBe("");

    const assumptions = results.find((result) => result.field === "assumptions");
    expect(assumptions?.valueA).toBe("");
    expect(assumptions?.valueB).toBe("");

    const unknown = results.find((result) => result.label === "not_real");
    expect(unknown?.valueA).toBe("");
    expect(unknown?.similarity).toBe(0);
  });

  it("covers all comparison field accessors", () => {
    const hypothesisA = makeHypothesis({
      id: "H-all-a",
      statement: "A -> B",
      mechanism: "Mechanism A",
      predictionsIfTrue: ["P1"],
      predictionsIfFalse: ["F1"],
      impossibleIfTrue: ["X cannot happen"],
      assumptions: ["Assume A"],
      confounds: [
        {
          id: "CF-1",
          name: "Confound",
          description: "Desc",
          likelihood: 0.2,
          domain: "testing",
        } as never,
      ],
      confidence: 70,
    });
    const hypothesisB = makeHypothesis({
      id: "H-all-b",
      statement: "A -> B",
      mechanism: "Mechanism B",
      predictionsIfTrue: ["P1"],
      predictionsIfFalse: ["F2"],
      impossibleIfTrue: ["X cannot happen"],
      assumptions: ["Assume A"],
      confounds: [
        {
          id: "CF-2",
          name: "Other",
          description: "Desc",
          likelihood: 0.2,
          domain: "testing",
        } as never,
      ],
      confidence: 65,
    });

    const results = buildComparisonResults(hypothesisA, hypothesisB);
    expect(results.length).toBeGreaterThanOrEqual(7);
    expect(results.some((result) => result.field === "confounds")).toBe(true);
  });

  it("builds prediction conflict matrix and summary", () => {
    const matrix = makeMatrix();
    const rows = buildPredictionConflictMatrix(matrix, "H1", "H2");
    expect(rows).toHaveLength(2);
    expect(rows[0].discriminating).toBe(true);

    const summary = buildEvidenceSummary(rows);
    expect(summary.discriminating).toBe(1);
    expect(summary.favorsA).toBe(1);
    expect(summary.favorsB).toBe(0);
  });

  it("handles null matrices, missing rows, and pending/ties", () => {
    expect(buildPredictionConflictMatrix(null, "H1", "H2")).toEqual([]);

    const missingRow = makeMatrix();
    expect(buildPredictionConflictMatrix(missingRow, "H1", "missing")).toEqual([]);

    const matrix = makeMatrix();
    matrix.rows[0]!.testResults = { T1: "supports" };
    matrix.rows[1]!.testResults = { T1: "supports", T2: "pending" as never };

    const rows = buildPredictionConflictMatrix(matrix, "H1", "H2");
    expect(rows.some((row) => row.resultA === "pending" || row.resultB === "pending")).toBe(true);

    const summary = buildEvidenceSummary(rows);
    expect(summary.pending).toBeGreaterThan(0);
    expect(summary.ties).toBeGreaterThan(0);
  });
});
