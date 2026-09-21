/**
 * Failure Analytics Tests
 *
 * Tests for the failure mode learning module.
 * Philosophy: NO mocks - test real computation with realistic fixtures.
 */

import { describe, expect, it } from "vitest";
import {
  computeFailureAnalytics,
  type FailureAnalytics,
  STRUCTURAL_PATTERNS,
  summarizeFailureAnalytics,
} from "./failure-analytics";
import type { HypothesisCard, Session } from "./types";

// ============================================================================
// Test Fixtures
// ============================================================================

function makeHypothesis(overrides: Partial<HypothesisCard> = {}): HypothesisCard {
  return {
    id: overrides.id ?? "H-TEST-001-v1",
    version: overrides.version ?? 1,
    statement: overrides.statement ?? "Test hypothesis statement",
    mechanism: overrides.mechanism ?? "Test mechanism",
    domain: overrides.domain ?? ["psychology"],
    predictionsIfTrue: overrides.predictionsIfTrue ?? ["Prediction A"],
    predictionsIfFalse: overrides.predictionsIfFalse ?? ["Counter-prediction B"],
    impossibleIfTrue: overrides.impossibleIfTrue ?? ["Falsification criterion"],
    confounds: overrides.confounds ?? [],
    assumptions: overrides.assumptions ?? [],
    confidence: overrides.confidence ?? 50,
    createdAt: overrides.createdAt ?? new Date("2026-01-01T00:00:00Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-01-01T00:00:00Z"),
  };
}

function makeSession(overrides: Partial<Session> = {}): Session {
  const id = overrides.id ?? "RS-TEST-001";
  const hypothesisId = `H-${id}-001-v1`;

  return {
    id,
    _version: 1,
    researchQuestion: overrides.researchQuestion ?? "What causes X?",
    primaryHypothesisId: overrides.primaryHypothesisId ?? hypothesisId,
    alternativeHypothesisIds: overrides.alternativeHypothesisIds ?? [],
    archivedHypothesisIds: overrides.archivedHypothesisIds ?? [],
    hypothesisCards: overrides.hypothesisCards ?? {
      [hypothesisId]: makeHypothesis({ id: hypothesisId }),
    },
    hypothesisEvolution: overrides.hypothesisEvolution ?? [],
    operatorApplications: overrides.operatorApplications ?? {
      levelSplit: [],
      exclusionTest: [],
      objectTranspose: [],
      scaleCheck: [],
    },
    phase: overrides.phase ?? "intake",
    predictionIds: [],
    testIds: overrides.testIds ?? [],
    assumptionIds: [],
    pendingAgentRequests: [],
    agentResponses: overrides.agentResponses ?? [],
    evidenceLedger: [],
    artifacts: [],
    commits: [],
    headCommitId: "",
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
    createdBy: overrides.createdBy ?? "test-user",
    attachedQuotes: overrides.attachedQuotes ?? [],
  };
}

// ============================================================================
// computeFailureAnalytics
// ============================================================================

describe("computeFailureAnalytics", () => {
  it("handles empty sessions array", () => {
    const result = computeFailureAnalytics({ sessions: [] });

    expect(result.sessionsAnalyzed).toBe(0);
    expect(result.hypothesesAnalyzed).toBe(0);
    expect(result.overallFailureRate).toBe(0);
    expect(result.byDomain).toHaveLength(0);
    expect(result.insights).toHaveLength(0);
  });

  it("computes overall failure rate", () => {
    const failedHypothesis = makeHypothesis({
      id: "H-FAIL-001",
      confidence: 10, // Very low = failed
    });
    const successHypothesis = makeHypothesis({
      id: "H-SUCCESS-001",
      confidence: 70,
    });

    const sessions = [
      makeSession({
        id: "RS-001",
        hypothesisCards: { "H-FAIL-001": failedHypothesis },
      }),
      makeSession({
        id: "RS-002",
        hypothesisCards: { "H-SUCCESS-001": successHypothesis },
      }),
    ];

    const result = computeFailureAnalytics({ sessions });

    expect(result.hypothesesAnalyzed).toBe(2);
    expect(result.overallFailureRate).toBe(0.5); // 1 failed out of 2
  });

  it("identifies archived hypotheses as failures", () => {
    const archivedHypothesis = makeHypothesis({
      id: "H-ARCHIVED-001",
      confidence: 60, // Good confidence but archived
    });

    const session = makeSession({
      hypothesisCards: { "H-ARCHIVED-001": archivedHypothesis },
      archivedHypothesisIds: ["H-ARCHIVED-001"],
    });

    const result = computeFailureAnalytics({ sessions: [session] });

    expect(result.overallFailureRate).toBe(1); // Archived = failed
  });

  it("computes domain failure distribution", () => {
    // Create multiple psychology hypotheses with mixed outcomes
    const sessions = [
      makeSession({
        id: "RS-001",
        hypothesisCards: {
          "H-001": makeHypothesis({ id: "H-001", domain: ["psychology"], confidence: 10 }), // Failed
        },
      }),
      makeSession({
        id: "RS-002",
        hypothesisCards: {
          "H-002": makeHypothesis({ id: "H-002", domain: ["psychology"], confidence: 70 }), // Success
        },
      }),
      makeSession({
        id: "RS-003",
        hypothesisCards: {
          "H-003": makeHypothesis({ id: "H-003", domain: ["psychology"], confidence: 15 }), // Failed
        },
      }),
      makeSession({
        id: "RS-004",
        hypothesisCards: {
          "H-004": makeHypothesis({ id: "H-004", domain: ["biology"], confidence: 60 }), // Success
        },
      }),
    ];

    const result = computeFailureAnalytics({ sessions });

    // Psychology: 2 failed out of 3
    const psychDomain = result.byDomain.find((d) => d.domain === "psychology");
    expect(psychDomain).toBeDefined();
    expect(psychDomain?.totalHypotheses).toBe(3);
    expect(psychDomain?.falsifiedCount).toBe(2);
    expect(psychDomain?.failureRate).toBeCloseTo(0.667, 2);

    // Biology has only 1 hypothesis, below MIN_DOMAIN_SAMPLE_SIZE
    const bioDomain = result.byDomain.find((d) => d.domain === "biology");
    expect(bioDomain).toBeUndefined();
  });

  it("computes operator failure patterns", () => {
    // Session with exclusion_test applied - no failure
    const sessionWithOperator = makeSession({
      id: "RS-001",
      hypothesisCards: {
        "H-001": makeHypothesis({ id: "H-001", confidence: 70 }),
      },
      operatorApplications: {
        levelSplit: [],
        exclusionTest: [
          { appliedAt: "2026-01-01", appliedBy: "user", designedTests: [], rejectedTests: [] },
        ],
        objectTranspose: [],
        scaleCheck: [],
      },
    });

    // Session without exclusion_test - failure
    const sessionWithoutOperator = makeSession({
      id: "RS-002",
      hypothesisCards: {
        "H-002": makeHypothesis({ id: "H-002", confidence: 10 }),
      },
      // Uses default empty operatorApplications from makeSession
    });

    const result = computeFailureAnalytics({
      sessions: [sessionWithOperator, sessionWithoutOperator],
    });

    const exclusionPattern = result.byOperator.find((p) => p.operator === "exclusion_test");
    expect(exclusionPattern).toBeDefined();
    expect(exclusionPattern?.totalApplications).toBe(1);
    // Negative correlation = operator helps
    expect(exclusionPattern?.failureCorrelation).toBeLessThan(0);
  });

  it("generates insights for high failure domains", () => {
    // Create a domain with 100% failure rate
    // Need 6+ hypotheses for confidence threshold (0.6 = 6/10)
    const sessions = [
      makeSession({
        id: "RS-001",
        hypothesisCards: {
          "H-001": makeHypothesis({ id: "H-001", domain: ["astrology"], confidence: 5 }),
        },
      }),
      makeSession({
        id: "RS-002",
        hypothesisCards: {
          "H-002": makeHypothesis({ id: "H-002", domain: ["astrology"], confidence: 10 }),
        },
      }),
      makeSession({
        id: "RS-003",
        hypothesisCards: {
          "H-003": makeHypothesis({ id: "H-003", domain: ["astrology"], confidence: 15 }),
        },
      }),
      makeSession({
        id: "RS-004",
        hypothesisCards: {
          "H-004": makeHypothesis({ id: "H-004", domain: ["astrology"], confidence: 8 }),
        },
      }),
      makeSession({
        id: "RS-005",
        hypothesisCards: {
          "H-005": makeHypothesis({ id: "H-005", domain: ["astrology"], confidence: 12 }),
        },
      }),
      makeSession({
        id: "RS-006",
        hypothesisCards: {
          "H-006": makeHypothesis({ id: "H-006", domain: ["astrology"], confidence: 18 }),
        },
      }),
    ];

    const result = computeFailureAnalytics({ sessions });

    // Should have a critical insight about astrology
    const astrologyInsight = result.insights.find((i) =>
      i.message.toLowerCase().includes("astrology"),
    );
    expect(astrologyInsight).toBeDefined();
    expect(astrologyInsight?.severity).toBe("critical");
  });

  it("includes userId and computedAt", () => {
    const now = new Date("2026-01-05T12:00:00Z");
    const result = computeFailureAnalytics({
      sessions: [],
      userId: "test-user-123",
      now,
    });

    expect(result.userId).toBe("test-user-123");
    expect(result.computedAt).toBe("2026-01-05T12:00:00.000Z");
  });
});

// ============================================================================
// STRUCTURAL_PATTERNS
// ============================================================================

describe("STRUCTURAL_PATTERNS", () => {
  it("detects missing falsification criteria", () => {
    const pattern = STRUCTURAL_PATTERNS.find((p) => p.name === "Missing Falsification Criteria");
    expect(pattern).toBeDefined();

    const noFalsification = makeHypothesis({ impossibleIfTrue: [] });
    const hasFalsification = makeHypothesis({ impossibleIfTrue: ["X cannot happen"] });

    expect(pattern?.detector(noFalsification)).toBe(true);
    expect(pattern?.detector(hasFalsification)).toBe(false);
  });

  it("detects missing mechanism", () => {
    const pattern = STRUCTURAL_PATTERNS.find((p) => p.name === "Missing Mechanism");
    expect(pattern).toBeDefined();

    const noMechanism = makeHypothesis({ mechanism: "" });
    const hasMechanism = makeHypothesis({ mechanism: "Via pathway X" });

    expect(pattern?.detector(noMechanism)).toBe(true);
    expect(pattern?.detector(hasMechanism)).toBe(false);
  });

  it("detects low initial confidence", () => {
    const pattern = STRUCTURAL_PATTERNS.find((p) => p.name === "Low Initial Confidence");
    expect(pattern).toBeDefined();

    const lowConfidenceV1 = makeHypothesis({ confidence: 20, version: 1 });
    const lowConfidenceV2 = makeHypothesis({ confidence: 20, version: 2 }); // Evolved to low, not initial
    const normalConfidence = makeHypothesis({ confidence: 50, version: 1 });

    expect(pattern?.detector(lowConfidenceV1)).toBe(true);
    expect(pattern?.detector(lowConfidenceV2)).toBe(false); // Version > 1, not initial
    expect(pattern?.detector(normalConfidence)).toBe(false);
  });

  it("detects high initial confidence without evidence", () => {
    const pattern = STRUCTURAL_PATTERNS.find((p) => p.name === "High Initial Confidence");
    expect(pattern).toBeDefined();

    const highConfidenceV1 = makeHypothesis({ confidence: 90, version: 1 });
    const highConfidenceV2 = makeHypothesis({ confidence: 90, version: 2 });
    const normalConfidence = makeHypothesis({ confidence: 60, version: 1 });

    expect(pattern?.detector(highConfidenceV1)).toBe(true);
    expect(pattern?.detector(highConfidenceV2)).toBe(false); // Version > 1, has evidence
    expect(pattern?.detector(normalConfidence)).toBe(false);
  });

  it("detects single domain hypotheses", () => {
    const pattern = STRUCTURAL_PATTERNS.find((p) => p.name === "Single Domain");
    expect(pattern).toBeDefined();

    const singleDomain = makeHypothesis({ domain: ["psychology"] });
    const multiDomain = makeHypothesis({ domain: ["psychology", "neuroscience"] });
    const noDomain = makeHypothesis({ domain: [] });

    expect(pattern?.detector(singleDomain)).toBe(true);
    expect(pattern?.detector(multiDomain)).toBe(false);
    expect(pattern?.detector(noDomain)).toBe(true); // Empty also triggers
  });
});

// ============================================================================
// summarizeFailureAnalytics
// ============================================================================

describe("summarizeFailureAnalytics", () => {
  it("generates readable summary", () => {
    const analytics: FailureAnalytics = {
      computedAt: "2026-01-05T12:00:00.000Z",
      userId: "test-user",
      sessionsAnalyzed: 10,
      hypothesesAnalyzed: 25,
      overallFailureRate: 0.32,
      byDomain: [
        {
          domain: "psychology",
          totalHypotheses: 15,
          falsifiedCount: 6,
          failureRate: 0.4,
          failuresByPhase: {},
          commonFailureModes: [],
        },
      ],
      byOperator: [],
      byStructure: [],
      insights: [
        {
          id: "insight-1",
          severity: "warning",
          message: "Psychology hypotheses have high failure rate",
          confidence: 0.8,
          suggestion: "Add more rigor",
        },
      ],
    };

    const summary = summarizeFailureAnalytics(analytics);

    expect(summary).toContain("10 sessions");
    expect(summary).toContain("25 hypotheses");
    expect(summary).toContain("32.0%"); // Overall failure rate
    expect(summary).toContain("psychology");
    expect(summary).toContain("40%"); // Domain failure rate
  });

  it("handles empty analytics gracefully", () => {
    const analytics: FailureAnalytics = {
      computedAt: "2026-01-05T12:00:00.000Z",
      userId: "test-user",
      sessionsAnalyzed: 0,
      hypothesesAnalyzed: 0,
      overallFailureRate: 0,
      byDomain: [],
      byOperator: [],
      byStructure: [],
      insights: [],
    };

    const summary = summarizeFailureAnalytics(analytics);

    expect(summary).toContain("0 sessions");
    expect(summary).toContain("0.0%");
  });
});
