/**
 * Unit tests for Robustness Score Calculation
 *
 * Tests the algorithm that computes how well a hypothesis has survived testing.
 *
 * @see brenner_bot-an1n.4 (bead)
 * @see brenner-loop/robustness.ts
 */

import { describe, expect, it } from "vitest";
import type { EvidenceEntry } from "./evidence";
import type { HypothesisCard } from "./hypothesis";
import {
  aggregateRobustness,
  compareRobustness,
  computeFalsifiabilityScore,
  computeRobustness,
  computeSpecificityScore,
  DEFAULT_ROBUSTNESS_CONFIG,
  formatRobustnessScore,
  getRobustnessDisplay,
  isRobustnessInterpretation,
  isRobustnessScore,
  ROBUSTNESS_LABELS,
  type RobustnessScore,
  summarizeRobustness,
} from "./robustness";

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestHypothesis(overrides: Partial<HypothesisCard> = {}): HypothesisCard {
  return {
    id: "HC-TEST-001-v1",
    version: 1,
    statement: "Test hypothesis statement",
    mechanism:
      "This is a detailed mechanism explaining how the effect occurs through specific pathways",
    domain: ["testing"],
    predictionsIfTrue: [
      "If true, we would observe a 20% increase in metric X",
      "The effect should be measurable within 2 weeks",
    ],
    predictionsIfFalse: ["If false, metric X would remain unchanged"],
    impossibleIfTrue: ["Observation Y would be impossible if this hypothesis is true"],
    confounds: [],
    assumptions: ["Measurement accuracy is sufficient"],
    confidence: 60,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createTestEvidence(overrides: Partial<EvidenceEntry> = {}): EvidenceEntry {
  return {
    id: "EV-TEST-001",
    sessionId: "TEST-SESSION",
    hypothesisVersion: "HC-TEST-001-v1",
    test: {
      id: "TEST-001",
      description: "Test description",
      type: "controlled_study",
      discriminativePower: 3,
    },
    predictionIfTrue: "Expected outcome if true",
    predictionIfFalse: "Expected outcome if false",
    result: "supports",
    observation: "Observed outcome",
    confidenceBefore: 50,
    confidenceAfter: 60,
    interpretation: "Result supports hypothesis",
    recordedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// computeSpecificityScore Tests
// ============================================================================

describe("computeSpecificityScore", () => {
  it("returns 0 for empty predictions", () => {
    expect(computeSpecificityScore([])).toBe(0);
  });

  it("scores higher for more predictions", () => {
    const one = computeSpecificityScore(["Single prediction"]);
    const three = computeSpecificityScore([
      "First prediction",
      "Second prediction",
      "Third prediction",
    ]);
    expect(three).toBeGreaterThan(one);
  });

  it("scores higher for longer predictions", () => {
    const short = computeSpecificityScore(["Short"]);
    const long = computeSpecificityScore([
      "This is a much longer and more detailed prediction that provides specific information about expected outcomes",
    ]);
    expect(long).toBeGreaterThan(short);
  });

  it("scores higher for quantitative predictions", () => {
    const vague = computeSpecificityScore(["Something will happen"]);
    const quantitative = computeSpecificityScore([
      "We expect a 25% increase in the metric within 2 weeks",
    ]);
    expect(quantitative).toBeGreaterThan(vague);
  });

  it("recognizes comparison terms", () => {
    const plain = computeSpecificityScore(["Effect observed"]);
    const comparison = computeSpecificityScore(["Effect more than baseline, higher than control"]);
    expect(comparison).toBeGreaterThan(plain);
  });
});

// ============================================================================
// computeFalsifiabilityScore Tests
// ============================================================================

describe("computeFalsifiabilityScore", () => {
  it("gives low score for hypothesis without impossibleIfTrue", () => {
    const hypothesis = createTestHypothesis({
      impossibleIfTrue: [],
      predictionsIfFalse: [],
      predictionsIfTrue: [],
      mechanism: "",
    });
    expect(computeFalsifiabilityScore(hypothesis)).toBeLessThan(30);
  });

  it("gives high score for well-structured hypothesis", () => {
    const hypothesis = createTestHypothesis({
      impossibleIfTrue: ["Condition A would be impossible", "Condition B would be impossible"],
      predictionsIfFalse: ["If false, we'd see X", "If false, we'd see Y"],
      predictionsIfTrue: ["If true, we'd see Z", "If true, we'd see W"],
      mechanism: "Detailed mechanism explaining the causal pathway",
    });
    expect(computeFalsifiabilityScore(hypothesis)).toBeGreaterThan(70);
  });

  it("caps score at 100", () => {
    const hypothesis = createTestHypothesis({
      impossibleIfTrue: ["A", "B", "C", "D", "E"],
      predictionsIfFalse: ["X", "Y", "Z"],
      predictionsIfTrue: ["1", "2", "3"],
      mechanism: "Very detailed mechanism with lots of content explaining everything",
    });
    expect(computeFalsifiabilityScore(hypothesis)).toBeLessThanOrEqual(100);
  });
});

// ============================================================================
// computeRobustness Tests
// ============================================================================

describe("computeRobustness", () => {
  describe("untested hypotheses", () => {
    it("returns untested interpretation when no evidence", () => {
      const hypothesis = createTestHypothesis();
      const result = computeRobustness(hypothesis, []);

      expect(result.interpretation).toBe("untested");
      expect(result.components.testsAttempted).toBe(0);
    });

    it("returns base score for untested with good structure", () => {
      const hypothesis = createTestHypothesis();
      const result = computeRobustness(hypothesis, []);

      expect(result.overall).toBeGreaterThan(40);
      expect(result.overall).toBeLessThan(70);
    });

    it("filters evidence to correct hypothesis version", () => {
      const hypothesis = createTestHypothesis({ id: "HC-OTHER" });
      const evidence = [createTestEvidence({ hypothesisVersion: "HC-TEST-001-v1" })];
      const result = computeRobustness(hypothesis, evidence);

      expect(result.interpretation).toBe("untested");
    });
  });

  describe("tested hypotheses", () => {
    it("returns robust for hypothesis surviving high-power tests", () => {
      const hypothesis = createTestHypothesis();
      const evidence = [
        createTestEvidence({ test: { ...createTestEvidence().test, discriminativePower: 5 } }),
        createTestEvidence({
          test: { ...createTestEvidence().test, discriminativePower: 4 },
          id: "EV-002",
        }),
      ];
      const result = computeRobustness(hypothesis, evidence);

      expect(result.interpretation).toBe("robust");
      expect(result.components.testsSurvived).toBe(2);
    });

    it("returns falsified when any test challenges", () => {
      const hypothesis = createTestHypothesis();
      const evidence = [
        createTestEvidence({ result: "supports" }),
        createTestEvidence({ result: "challenges", id: "EV-002" }),
      ];
      const result = computeRobustness(hypothesis, evidence);

      expect(result.interpretation).toBe("falsified");
      expect(result.components.testsFailed).toBe(1);
    });

    it("weighs higher-power tests more heavily", () => {
      const hypothesis = createTestHypothesis();

      const lowPowerEvidence = [
        createTestEvidence({ test: { ...createTestEvidence().test, discriminativePower: 1 } }),
      ];
      const highPowerEvidence = [
        createTestEvidence({ test: { ...createTestEvidence().test, discriminativePower: 5 } }),
      ];

      const lowResult = computeRobustness(hypothesis, lowPowerEvidence);
      const highResult = computeRobustness(hypothesis, highPowerEvidence);

      // Both should be robust, but high power contributes more to survival
      expect(highResult.components.averageTestPower).toBeGreaterThan(
        lowResult.components.averageTestPower,
      );
    });

    it("handles inconclusive tests with partial credit", () => {
      const hypothesis = createTestHypothesis();
      const evidence = [createTestEvidence({ result: "inconclusive" })];
      const result = computeRobustness(hypothesis, evidence);

      expect(result.components.testsInconclusive).toBe(1);
      expect(result.components.weightedSurvival).toBeGreaterThan(0);
      expect(result.components.weightedSurvival).toBeLessThan(1);
    });
  });

  describe("score calculation", () => {
    it("includes all component scores", () => {
      const hypothesis = createTestHypothesis();
      const evidence = [createTestEvidence()];
      const result = computeRobustness(hypothesis, evidence);

      expect(result.components.falsifiabilityScore).toBeGreaterThan(0);
      expect(result.components.specificityScore).toBeGreaterThan(0);
      expect(result.components.weightedSurvival).toBe(1); // 100% survival
    });

    it("generates meaningful explanation", () => {
      const hypothesis = createTestHypothesis();
      const evidence = [createTestEvidence()];
      const result = computeRobustness(hypothesis, evidence);

      expect(result.explanation).toBeTruthy();
      expect(result.explanation.length).toBeGreaterThan(20);
    });

    it("records hypothesis version ID", () => {
      const hypothesis = createTestHypothesis({ id: "MY-CUSTOM-ID" });
      const result = computeRobustness(hypothesis, []);

      expect(result.hypothesisVersionId).toBe("MY-CUSTOM-ID");
    });

    it("records calculation timestamp", () => {
      const hypothesis = createTestHypothesis();
      const before = new Date();
      const result = computeRobustness(hypothesis, []);
      const after = new Date();

      expect(result.calculatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.calculatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe("configuration", () => {
    it("respects custom robustness threshold", () => {
      const hypothesis = createTestHypothesis();
      // Create evidence with 50% survival (1 support, 1 inconclusive)
      const evidence = [
        createTestEvidence({
          result: "supports",
          test: { ...createTestEvidence().test, discriminativePower: 3 },
        }),
        createTestEvidence({
          result: "inconclusive",
          id: "EV-002",
          test: { ...createTestEvidence().test, discriminativePower: 3 },
        }),
      ];

      // With strict threshold (0.9), 75% survival (supports + half of inconclusive) is not enough
      const strictResult = computeRobustness(hypothesis, evidence, { robustThreshold: 0.9 });
      // With lenient threshold (0.5), 75% survival is enough
      const lenientResult = computeRobustness(hypothesis, evidence, { robustThreshold: 0.5 });

      expect(strictResult.interpretation).toBe("shaky");
      expect(lenientResult.interpretation).toBe("robust");
    });

    it("uses default config when none provided", () => {
      const hypothesis = createTestHypothesis();
      const result = computeRobustness(hypothesis, []);

      // Untested score starts at base (50) and adds half of structure scores
      // With good hypothesis structure, expect score between 50 and 80
      expect(result.overall).toBeGreaterThanOrEqual(50);
      expect(result.overall).toBeLessThanOrEqual(80);
      expect(result.interpretation).toBe("untested");
    });
  });
});

// ============================================================================
// Type Guard Tests
// ============================================================================

describe("isRobustnessInterpretation", () => {
  it("returns true for valid interpretations", () => {
    expect(isRobustnessInterpretation("robust")).toBe(true);
    expect(isRobustnessInterpretation("shaky")).toBe(true);
    expect(isRobustnessInterpretation("falsified")).toBe(true);
    expect(isRobustnessInterpretation("untested")).toBe(true);
  });

  it("returns false for invalid values", () => {
    expect(isRobustnessInterpretation("invalid")).toBe(false);
    expect(isRobustnessInterpretation(123)).toBe(false);
    expect(isRobustnessInterpretation(null)).toBe(false);
  });
});

describe("isRobustnessScore", () => {
  it("returns true for valid score object", () => {
    const hypothesis = createTestHypothesis();
    const score = computeRobustness(hypothesis, []);
    expect(isRobustnessScore(score)).toBe(true);
  });

  it("returns false for invalid objects", () => {
    expect(isRobustnessScore(null)).toBe(false);
    expect(isRobustnessScore({})).toBe(false);
    expect(isRobustnessScore({ overall: "not a number" })).toBe(false);
  });
});

// ============================================================================
// Display Helper Tests
// ============================================================================

describe("getRobustnessDisplay", () => {
  it("returns correct display info for each interpretation", () => {
    const robust = getRobustnessDisplay("robust");
    expect(robust.label).toBe("Robust");
    expect(robust.color).toBe("green");

    const falsified = getRobustnessDisplay("falsified");
    expect(falsified.label).toBe("Falsified");
    expect(falsified.color).toBe("red");
  });
});

describe("formatRobustnessScore", () => {
  it("formats score with label", () => {
    const hypothesis = createTestHypothesis();
    const score = computeRobustness(hypothesis, []);

    const formatted = formatRobustnessScore(score);
    expect(formatted).toContain(score.overall.toString());
    expect(formatted).toContain("Untested");
  });
});

describe("summarizeRobustness", () => {
  it("returns 'No tests recorded' for untested", () => {
    const hypothesis = createTestHypothesis();
    const score = computeRobustness(hypothesis, []);

    expect(summarizeRobustness(score)).toBe("No tests recorded");
  });

  it("summarizes test counts for tested hypothesis", () => {
    const hypothesis = createTestHypothesis();
    const evidence = [
      createTestEvidence({ result: "supports" }),
      createTestEvidence({ result: "inconclusive", id: "EV-002" }),
    ];
    const score = computeRobustness(hypothesis, evidence);

    const summary = summarizeRobustness(score);
    expect(summary).toContain("1 passed");
    expect(summary).toContain("1 inconclusive");
  });
});

// ============================================================================
// Comparison & Aggregation Tests
// ============================================================================

describe("compareRobustness", () => {
  it("ranks robust higher than shaky", () => {
    const hypothesis = createTestHypothesis();

    const robustEvidence = [
      createTestEvidence({ test: { ...createTestEvidence().test, discriminativePower: 5 } }),
    ];
    const shakyEvidence = [
      createTestEvidence({
        result: "inconclusive",
        test: { ...createTestEvidence().test, discriminativePower: 2 },
      }),
    ];

    const robust = computeRobustness(hypothesis, robustEvidence);
    const shaky = computeRobustness(hypothesis, shakyEvidence);

    expect(compareRobustness(robust, shaky)).toBeGreaterThan(0);
    expect(compareRobustness(shaky, robust)).toBeLessThan(0);
  });

  it("ranks falsified lowest", () => {
    const hypothesis = createTestHypothesis();

    const falsifiedEvidence = [createTestEvidence({ result: "challenges" })];
    const untestedEvidence: EvidenceEntry[] = [];

    const falsified = computeRobustness(hypothesis, falsifiedEvidence);
    const untested = computeRobustness(hypothesis, untestedEvidence);

    expect(compareRobustness(untested, falsified)).toBeGreaterThan(0);
  });

  it("uses overall score as tiebreaker", () => {
    const hypothesis1 = createTestHypothesis({
      impossibleIfTrue: ["A", "B", "C"],
    });
    const hypothesis2 = createTestHypothesis({
      impossibleIfTrue: ["A"],
    });

    const score1 = computeRobustness(hypothesis1, []);
    const score2 = computeRobustness(hypothesis2, []);

    // Both untested, but hypothesis1 has better structure
    if (score1.overall !== score2.overall) {
      expect(compareRobustness(score1, score2)).toBe(score1.overall - score2.overall);
    }
  });
});

describe("aggregateRobustness", () => {
  it("returns zeros for empty array", () => {
    const result = aggregateRobustness([]);

    expect(result.averageScore).toBe(0);
    expect(result.totalTests).toBe(0);
    expect(result.counts.robust).toBe(0);
  });

  it("counts interpretations correctly", () => {
    const hypothesis = createTestHypothesis();

    const scores: RobustnessScore[] = [
      computeRobustness(hypothesis, [createTestEvidence()]), // robust
      computeRobustness(hypothesis, []), // untested
      computeRobustness(hypothesis, [createTestEvidence({ result: "challenges" })]), // falsified
    ];

    const result = aggregateRobustness(scores);

    expect(result.counts.robust).toBe(1);
    expect(result.counts.untested).toBe(1);
    expect(result.counts.falsified).toBe(1);
  });

  it("calculates average score", () => {
    const hypothesis = createTestHypothesis();
    const scores = [
      computeRobustness(hypothesis, []),
      computeRobustness(hypothesis, [createTestEvidence()]),
    ];

    const result = aggregateRobustness(scores);
    const [first, second] = scores;
    if (!first || !second) {
      throw new Error("Expected two robustness scores for average calculation");
    }
    const expectedAvg = (first.overall + second.overall) / 2;

    expect(result.averageScore).toBe(Math.round(expectedAvg));
  });

  it("sums total tests and failures", () => {
    const hypothesis = createTestHypothesis();
    const evidence = [
      createTestEvidence({ result: "supports" }),
      createTestEvidence({ result: "challenges", id: "EV-002" }),
    ];
    const score = computeRobustness(hypothesis, evidence);

    const result = aggregateRobustness([score]);

    expect(result.totalTests).toBe(2);
    expect(result.overallTestsFailed).toBe(1);
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("ROBUSTNESS_LABELS", () => {
  it("has entries for all interpretations", () => {
    expect(ROBUSTNESS_LABELS.robust).toBeDefined();
    expect(ROBUSTNESS_LABELS.shaky).toBeDefined();
    expect(ROBUSTNESS_LABELS.falsified).toBeDefined();
    expect(ROBUSTNESS_LABELS.untested).toBeDefined();
  });

  it("each entry has required fields", () => {
    for (const value of Object.values(ROBUSTNESS_LABELS)) {
      expect(value.label).toBeTruthy();
      expect(value.color).toBeTruthy();
      expect(value.description).toBeTruthy();
    }
  });
});

describe("DEFAULT_ROBUSTNESS_CONFIG", () => {
  it("weights sum to 1.0", () => {
    const sum =
      DEFAULT_ROBUSTNESS_CONFIG.survivalWeight +
      DEFAULT_ROBUSTNESS_CONFIG.falsifiabilityWeight +
      DEFAULT_ROBUSTNESS_CONFIG.specificityWeight;

    expect(sum).toBeCloseTo(1.0);
  });

  it("has valid thresholds", () => {
    expect(DEFAULT_ROBUSTNESS_CONFIG.robustThreshold).toBeGreaterThan(0);
    expect(DEFAULT_ROBUSTNESS_CONFIG.robustThreshold).toBeLessThanOrEqual(1);
    expect(DEFAULT_ROBUSTNESS_CONFIG.shakyThreshold).toBeLessThan(
      DEFAULT_ROBUSTNESS_CONFIG.robustThreshold,
    );
  });
});
