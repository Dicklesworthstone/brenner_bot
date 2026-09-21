/**
 * Tests for What-If Scenario Explorer
 *
 * @see brenner_bot-njjo.6 (bead)
 * @see @/lib/brenner-loop/what-if
 */

import { describe, expect, it } from "vitest";
import type { EvidenceResult } from "./evidence";
import type { TestQueueItem } from "./test-queue";
import {
  type AssumedTestResult,
  addTestToScenario,
  analyzeScenario,
  analyzeTestQueueItem,
  calculateRecommendationRating,
  calculateScenarioOutcome,
  compareTests,
  createBestCaseScenario,
  createMixedScenario,
  createScenario,
  createWorstCaseScenario,
  formatInformationValue,
  getRecommendationColor,
  getRecommendationStars,
  removeTestFromScenario,
  summarizeScenario,
  updateTestInScenario,
} from "./what-if";

// ============================================================================
// Test Helpers
// ============================================================================

function createMockTestQueueItem(overrides: Partial<TestQueueItem> = {}): TestQueueItem {
  const id = overrides.id ?? `TQ-test-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    sessionId: "test-session",
    hypothesisId: "HYP-1",
    assumptionIds: [],
    test: {
      id: `ET-${id}`,
      name: "Mock Test",
      description: "A mock test for testing",
      category: "natural_experiment",
      falsificationCondition: "If result is X",
      supportCondition: "If result is Y",
      rationale: "Because reasons",
      feasibility: "high",
      discriminativePower: 3,
    },
    discriminativePower: 3,
    status: "queued",
    priority: "medium",
    predictionIfTrue: "Prediction if true",
    predictionIfFalse: "Prediction if false",
    addedAt: new Date().toISOString(),
    source: "manual",
    ...overrides,
  };
}

function createMockAssumedTest(overrides: Partial<AssumedTestResult> = {}): AssumedTestResult {
  return {
    testId: `TQ-${Math.random().toString(36).slice(2, 8)}`,
    testName: "Mock Test",
    discriminativePower: 3,
    assumedResult: "supports",
    ...overrides,
  };
}

// ============================================================================
// createScenario
// ============================================================================

describe("createScenario", () => {
  it("creates a scenario with default values", () => {
    const scenario = createScenario({
      name: "Test Scenario",
      sessionId: "test-session",
      hypothesisId: "HYP-1",
      startingConfidence: 50,
    });

    expect(scenario.name).toBe("Test Scenario");
    expect(scenario.sessionId).toBe("test-session");
    expect(scenario.hypothesisId).toBe("HYP-1");
    expect(scenario.startingConfidence).toBe(50);
    expect(scenario.assumedTests).toEqual([]);
    expect(scenario.projectedConfidence).toBe(50);
    expect(scenario.confidenceDelta).toBe(0);
    expect(scenario.id).toMatch(/^WIF-/);
    expect(scenario.createdAt).toBeInstanceOf(Date);
  });

  it("calculates projected confidence when tests are provided", () => {
    const scenario = createScenario({
      name: "With Tests",
      sessionId: "test-session",
      hypothesisId: "HYP-1",
      startingConfidence: 50,
      assumedTests: [
        createMockAssumedTest({
          assumedResult: "supports",
          discriminativePower: 4,
        }),
      ],
    });

    // Supporting evidence should increase confidence
    expect(scenario.projectedConfidence).toBeGreaterThan(50);
    expect(scenario.confidenceDelta).toBeGreaterThan(0);
  });

  it("calculates decreasing confidence for challenging tests", () => {
    const scenario = createScenario({
      name: "Challenging",
      sessionId: "test-session",
      hypothesisId: "HYP-1",
      startingConfidence: 70,
      assumedTests: [
        createMockAssumedTest({
          assumedResult: "challenges",
          discriminativePower: 4,
        }),
      ],
    });

    expect(scenario.projectedConfidence).toBeLessThan(70);
    expect(scenario.confidenceDelta).toBeLessThan(0);
  });
});

// ============================================================================
// Scenario Manipulation
// ============================================================================

describe("addTestToScenario", () => {
  it("adds a test and recalculates confidence", () => {
    const initial = createScenario({
      name: "Initial",
      sessionId: "test-session",
      hypothesisId: "HYP-1",
      startingConfidence: 50,
    });

    const updated = addTestToScenario(
      initial,
      createMockAssumedTest({
        assumedResult: "supports",
        discriminativePower: 5,
      }),
    );

    expect(updated.assumedTests).toHaveLength(1);
    expect(updated.projectedConfidence).toBeGreaterThan(50);
  });
});

describe("removeTestFromScenario", () => {
  it("removes a test and recalculates confidence", () => {
    const testToRemove = createMockAssumedTest({ testId: "remove-me" });

    const initial = createScenario({
      name: "With Test",
      sessionId: "test-session",
      hypothesisId: "HYP-1",
      startingConfidence: 50,
      assumedTests: [testToRemove],
    });

    const updated = removeTestFromScenario(initial, "remove-me");

    expect(updated.assumedTests).toHaveLength(0);
    expect(updated.projectedConfidence).toBe(50);
    expect(updated.confidenceDelta).toBe(0);
  });
});

describe("updateTestInScenario", () => {
  it("updates a test result and recalculates", () => {
    const test = createMockAssumedTest({
      testId: "update-me",
      assumedResult: "supports",
      discriminativePower: 4,
    });

    const initial = createScenario({
      name: "To Update",
      sessionId: "test-session",
      hypothesisId: "HYP-1",
      startingConfidence: 50,
      assumedTests: [test],
    });

    const supportingConfidence = initial.projectedConfidence;

    // Change to challenges
    const updated = updateTestInScenario(initial, "update-me", "challenges");

    expect(updated.assumedTests[0].assumedResult).toBe("challenges");
    expect(updated.projectedConfidence).toBeLessThan(supportingConfidence);
  });
});

// ============================================================================
// calculateScenarioOutcome
// ============================================================================

describe("calculateScenarioOutcome", () => {
  it("returns unchanged confidence for empty scenario", () => {
    const scenario = createScenario({
      name: "Empty",
      sessionId: "test-session",
      hypothesisId: "HYP-1",
      startingConfidence: 60,
    });

    const result = calculateScenarioOutcome(scenario);

    expect(result.projectedConfidence).toBe(60);
    expect(result.confidenceDelta).toBe(0);
  });

  it("accumulates multiple test impacts", () => {
    const scenario = createScenario({
      name: "Multi",
      sessionId: "test-session",
      hypothesisId: "HYP-1",
      startingConfidence: 50,
      assumedTests: [
        createMockAssumedTest({ assumedResult: "supports", discriminativePower: 3 }),
        createMockAssumedTest({ assumedResult: "supports", discriminativePower: 3 }),
      ],
    });

    const result = calculateScenarioOutcome(scenario);

    // Two supporting tests should increase confidence more than one
    const singleTestScenario = createScenario({
      name: "Single",
      sessionId: "test-session",
      hypothesisId: "HYP-1",
      startingConfidence: 50,
      assumedTests: [createMockAssumedTest({ assumedResult: "supports", discriminativePower: 3 })],
    });

    const singleResult = calculateScenarioOutcome(singleTestScenario);

    expect(result.projectedConfidence).toBeGreaterThan(singleResult.projectedConfidence);
  });

  it("handles mixed results", () => {
    const scenario = createScenario({
      name: "Mixed",
      sessionId: "test-session",
      hypothesisId: "HYP-1",
      startingConfidence: 50,
      assumedTests: [
        createMockAssumedTest({ assumedResult: "supports", discriminativePower: 3 }),
        createMockAssumedTest({ assumedResult: "challenges", discriminativePower: 3 }),
      ],
    });

    const result = calculateScenarioOutcome(scenario);

    // Due to asymmetry, challenges have more impact, so mixed should trend down
    // But this depends on order and algorithm details
    expect(typeof result.projectedConfidence).toBe("number");
    expect(result.projectedConfidence).toBeGreaterThanOrEqual(1);
    expect(result.projectedConfidence).toBeLessThanOrEqual(99);
  });
});

// ============================================================================
// analyzeScenario
// ============================================================================

describe("analyzeScenario", () => {
  it("provides best and worst case projections", () => {
    const scenario = createScenario({
      name: "Analysis",
      sessionId: "test-session",
      hypothesisId: "HYP-1",
      startingConfidence: 50,
      assumedTests: [createMockAssumedTest({ assumedResult: "supports", discriminativePower: 4 })],
    });

    const analysis = analyzeScenario(scenario);

    expect(analysis.bestCase.confidence).toBeGreaterThan(50);
    expect(analysis.worstCase.confidence).toBeLessThan(50);
    expect(analysis.expectedCase.explanation).toBeTruthy();
  });

  it("identifies the most impactful test", () => {
    const scenario = createScenario({
      name: "Impact",
      sessionId: "test-session",
      hypothesisId: "HYP-1",
      startingConfidence: 50,
      assumedTests: [
        createMockAssumedTest({
          testId: "low-power",
          testName: "Low Power Test",
          assumedResult: "supports",
          discriminativePower: 2,
        }),
        createMockAssumedTest({
          testId: "high-power",
          testName: "High Power Test",
          assumedResult: "supports",
          discriminativePower: 5,
        }),
      ],
    });

    const analysis = analyzeScenario(scenario);

    expect(analysis.mostImpactfulTest).not.toBeNull();
    expect(analysis.mostImpactfulTest?.testId).toBe("high-power");
  });

  it("handles empty scenario", () => {
    const scenario = createScenario({
      name: "Empty",
      sessionId: "test-session",
      hypothesisId: "HYP-1",
      startingConfidence: 60,
    });

    const analysis = analyzeScenario(scenario);

    expect(analysis.bestCase.confidence).toBe(60);
    expect(analysis.worstCase.confidence).toBe(60);
    expect(analysis.mostImpactfulTest).toBeNull();
  });
});

// ============================================================================
// compareTests
// ============================================================================

describe("compareTests", () => {
  it("ranks tests by information value", () => {
    const tests = [
      createMockTestQueueItem({
        id: "low-dp",
        discriminativePower: 2,
        test: {
          id: "ET-low",
          name: "Low Power",
          description: "Low power test",
          category: "natural_experiment",
          falsificationCondition: "X",
          supportCondition: "Y",
          rationale: "R",
          feasibility: "high",
          discriminativePower: 2,
        },
      }),
      createMockTestQueueItem({
        id: "high-dp",
        discriminativePower: 5,
        test: {
          id: "ET-high",
          name: "High Power",
          description: "High power test",
          category: "natural_experiment",
          falsificationCondition: "X",
          supportCondition: "Y",
          rationale: "R",
          feasibility: "high",
          discriminativePower: 5,
        },
      }),
    ];

    const result = compareTests(50, tests);

    expect(result.rankedTests).toHaveLength(2);
    expect(result.rankedTests[0].testId).toBe("high-dp");
    expect(result.rankedTests[0].informationValue).toBeGreaterThan(
      result.rankedTests[1].informationValue,
    );
  });

  it("provides a recommendation", () => {
    const tests = [
      createMockTestQueueItem({
        discriminativePower: 4,
        test: {
          id: "ET-1",
          name: "Good Test",
          description: "A good test",
          category: "natural_experiment",
          falsificationCondition: "X",
          supportCondition: "Y",
          rationale: "R",
          feasibility: "high",
          discriminativePower: 4,
        },
      }),
    ];

    const result = compareTests(50, tests);

    expect(result.recommendation).not.toBeNull();
    expect(result.recommendation?.testName).toBe("Good Test");
    expect(result.recommendation?.reason).toBeTruthy();
  });

  it("handles empty test list", () => {
    const result = compareTests(50, []);

    expect(result.rankedTests).toHaveLength(0);
    expect(result.recommendation).toBeNull();
    expect(result.summary.totalTests).toBe(0);
  });

  it("calculates summary statistics", () => {
    const tests = [
      createMockTestQueueItem({ discriminativePower: 5 }),
      createMockTestQueueItem({ discriminativePower: 4 }),
      createMockTestQueueItem({ discriminativePower: 1 }),
    ];

    const result = compareTests(50, tests);

    expect(result.summary.totalTests).toBe(3);
    expect(result.summary.highValueTests).toBeGreaterThanOrEqual(0);
    expect(result.summary.lowValueTests).toBeGreaterThanOrEqual(0);
    expect(result.summary.averageInformationValue).toBeGreaterThan(0);
  });
});

// ============================================================================
// Preset Scenarios
// ============================================================================

describe("createBestCaseScenario", () => {
  it("creates scenario with all tests supporting", () => {
    const tests = [
      createMockTestQueueItem({ id: "test-1" }),
      createMockTestQueueItem({ id: "test-2" }),
    ];

    const scenario = createBestCaseScenario("session", "HYP-1", 50, tests);

    expect(scenario.name).toBe("Best Case");
    expect(scenario.assumedTests).toHaveLength(2);
    expect(scenario.assumedTests.every((t) => t.assumedResult === "supports")).toBe(true);
    expect(scenario.projectedConfidence).toBeGreaterThan(50);
  });
});

describe("createWorstCaseScenario", () => {
  it("creates scenario with all tests challenging", () => {
    const tests = [
      createMockTestQueueItem({ id: "test-1" }),
      createMockTestQueueItem({ id: "test-2" }),
    ];

    const scenario = createWorstCaseScenario("session", "HYP-1", 50, tests);

    expect(scenario.name).toBe("Worst Case");
    expect(scenario.assumedTests).toHaveLength(2);
    expect(scenario.assumedTests.every((t) => t.assumedResult === "challenges")).toBe(true);
    expect(scenario.projectedConfidence).toBeLessThan(50);
  });
});

describe("createMixedScenario", () => {
  it("creates scenario with specified results", () => {
    const tests = [
      { test: createMockTestQueueItem({ id: "test-1" }), result: "supports" as EvidenceResult },
      { test: createMockTestQueueItem({ id: "test-2" }), result: "challenges" as EvidenceResult },
    ];

    const scenario = createMixedScenario("session", "HYP-1", 50, tests);

    expect(scenario.name).toBe("Custom Scenario");
    expect(scenario.assumedTests).toHaveLength(2);
    expect(scenario.assumedTests[0].assumedResult).toBe("supports");
    expect(scenario.assumedTests[1].assumedResult).toBe("challenges");
  });
});

// ============================================================================
// Utility Functions
// ============================================================================

describe("calculateRecommendationRating", () => {
  it("returns 5 for very high information value", () => {
    expect(calculateRecommendationRating(30)).toBe(5);
    expect(calculateRecommendationRating(25)).toBe(5);
  });

  it("returns 4 for high information value", () => {
    expect(calculateRecommendationRating(20)).toBe(4);
    expect(calculateRecommendationRating(18)).toBe(4);
  });

  it("returns 3 for moderate information value", () => {
    expect(calculateRecommendationRating(15)).toBe(3);
    expect(calculateRecommendationRating(12)).toBe(3);
  });

  it("returns 2 for low information value", () => {
    expect(calculateRecommendationRating(8)).toBe(2);
    expect(calculateRecommendationRating(6)).toBe(2);
  });

  it("returns 1 for very low information value", () => {
    expect(calculateRecommendationRating(4)).toBe(1);
    expect(calculateRecommendationRating(0)).toBe(1);
  });
});

describe("formatInformationValue", () => {
  it("formats very high values", () => {
    expect(formatInformationValue(35)).toBe("±35% (Very High)");
  });

  it("formats high values", () => {
    expect(formatInformationValue(25)).toBe("±25% (High)");
  });

  it("formats moderate values", () => {
    expect(formatInformationValue(15)).toBe("±15% (Moderate)");
  });

  it("formats low values", () => {
    expect(formatInformationValue(5)).toBe("±5% (Low)");
  });
});

describe("getRecommendationStars", () => {
  it("returns correct star representation", () => {
    expect(getRecommendationStars(5)).toBe("★★★★★");
    expect(getRecommendationStars(4)).toBe("★★★★☆");
    expect(getRecommendationStars(3)).toBe("★★★☆☆");
    expect(getRecommendationStars(2)).toBe("★★☆☆☆");
    expect(getRecommendationStars(1)).toBe("★☆☆☆☆");
  });
});

describe("getRecommendationColor", () => {
  it("returns correct color classes", () => {
    expect(getRecommendationColor(5)).toBe("text-green-600");
    expect(getRecommendationColor(4)).toBe("text-lime-600");
    expect(getRecommendationColor(3)).toBe("text-yellow-600");
    expect(getRecommendationColor(2)).toBe("text-orange-600");
    expect(getRecommendationColor(1)).toBe("text-red-600");
  });
});

describe("summarizeScenario", () => {
  it("summarizes a scenario with tests", () => {
    const scenario = createScenario({
      name: "Test",
      sessionId: "session",
      hypothesisId: "HYP-1",
      startingConfidence: 50,
      assumedTests: [
        createMockAssumedTest({ assumedResult: "supports" }),
        createMockAssumedTest({ assumedResult: "challenges" }),
        createMockAssumedTest({ assumedResult: "inconclusive" }),
      ],
    });

    const summary = summarizeScenario(scenario);

    expect(summary).toContain("3 tests");
    expect(summary).toContain("1 support");
    expect(summary).toContain("1 challenge");
    expect(summary).toContain("1 inconclusive");
    expect(summary).toContain("50%");
  });

  it("handles singular forms correctly", () => {
    const scenario = createScenario({
      name: "Singular",
      sessionId: "session",
      hypothesisId: "HYP-1",
      startingConfidence: 50,
      assumedTests: [createMockAssumedTest({ assumedResult: "supports" })],
    });

    const summary = summarizeScenario(scenario);

    expect(summary).toContain("1 test");
    expect(summary).toContain("1 support");
    expect(summary).not.toContain("supports");
  });
});

describe("analyzeTestQueueItem", () => {
  it("analyzes a test queue item", () => {
    const item = createMockTestQueueItem({ discriminativePower: 4 });
    const analysis = analyzeTestQueueItem(50, item);

    expect(analysis.currentConfidence).toBe(50);
    expect(analysis.ifSupports.newConfidence).toBeGreaterThan(50);
    expect(analysis.ifChallenges.newConfidence).toBeLessThan(50);
    expect(analysis.ifInconclusive.newConfidence).toBe(50);
    expect(analysis.maxImpact).toBeGreaterThan(0);
    expect(analysis.informationValue).toBeGreaterThan(0);
  });
});
