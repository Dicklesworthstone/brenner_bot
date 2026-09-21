/**
 * What-If Scenario Explorer
 *
 * Enables simulation of evidence impact before running tests.
 * Helps users prioritize which tests to pursue first by showing
 * potential outcomes for each scenario.
 *
 * Key Features:
 * - Single test what-if analysis (extends analyzeWhatIf)
 * - Multi-test scenario building
 * - Test comparison and ranking
 * - Decision support recommendations
 *
 * @see brenner_bot-njjo.6 (bead)
 * @see brenner_bot-njjo (parent epic: Evidence Ledger)
 * @module brenner-loop/what-if
 */

import {
  analyzeWhatIf,
  type BatchEvidenceItem,
  type ConfidenceUpdateConfig,
  computeBatchConfidenceUpdate,
  type TestInput,
  type WhatIfAnalysis,
} from "./confidence";
import type { DiscriminativePower, EvidenceResult } from "./evidence";
import type { TestQueueItem } from "./test-queue";

// ============================================================================
// Types
// ============================================================================

/**
 * A single assumed test result for scenario building
 */
export interface AssumedTestResult {
  /** Reference to the test queue item */
  testId: string;

  /** The assumed outcome */
  assumedResult: EvidenceResult;

  /** Test's discriminative power for the calculation */
  discriminativePower: DiscriminativePower;

  /** Human-readable test name for display */
  testName: string;
}

/**
 * A complete what-if scenario with multiple assumed test results
 */
export interface WhatIfScenario {
  /** Unique ID for this scenario */
  id: string;

  /** Human-readable name for the scenario */
  name: string;

  /** Session this scenario belongs to */
  sessionId: string;

  /** Hypothesis being evaluated */
  hypothesisId: string;

  /** Starting confidence before any tests */
  startingConfidence: number;

  /** List of assumed test results */
  assumedTests: AssumedTestResult[];

  /** Projected final confidence after all tests */
  projectedConfidence: number;

  /** Total confidence delta from start to projected end */
  confidenceDelta: number;

  /** When this scenario was created */
  createdAt: Date;
}

/**
 * Comparison of a single test's potential outcomes
 */
export interface TestComparison {
  /** Test queue item ID */
  testId: string;

  /** Test name for display */
  testName: string;

  /** Discriminative power (1-5) */
  discriminativePower: DiscriminativePower;

  /** Full what-if analysis for this test */
  analysis: WhatIfAnalysis;

  /** Maximum potential impact (absolute) */
  maxImpact: number;

  /** Information value (range of possible outcomes) */
  informationValue: number;

  /** Asymmetry ratio: |challenge delta| / |support delta| */
  asymmetryRatio: number;

  /** Recommendation rating (1-5 stars) */
  recommendationRating: 1 | 2 | 3 | 4 | 5;
}

/**
 * Result of comparing multiple tests
 */
export interface TestComparisonResult {
  /** Current confidence before any tests */
  currentConfidence: number;

  /** Tests ranked by information value */
  rankedTests: TestComparison[];

  /** Top recommendation with explanation */
  recommendation: {
    testId: string;
    testName: string;
    reason: string;
  } | null;

  /** Summary statistics */
  summary: {
    totalTests: number;
    highValueTests: number;
    lowValueTests: number;
    averageInformationValue: number;
  };
}

/**
 * Scenario analysis with best/worst case projections
 */
export interface ScenarioAnalysis {
  /** The scenario being analyzed */
  scenario: WhatIfScenario;

  /** Best case: all tests support */
  bestCase: {
    confidence: number;
    delta: number;
  };

  /** Worst case: all tests challenge */
  worstCase: {
    confidence: number;
    delta: number;
  };

  /** Most likely outcome based on current confidence */
  expectedCase: {
    confidence: number;
    delta: number;
    explanation: string;
  };

  /** Which test in the scenario has the most impact? */
  mostImpactfulTest: {
    testId: string;
    testName: string;
    maxImpact: number;
  } | null;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Thresholds for recommendation ratings
 */
const RECOMMENDATION_THRESHOLDS = {
  FIVE_STAR: 25, // Information value >= 25%
  FOUR_STAR: 18,
  THREE_STAR: 12,
  TWO_STAR: 6,
  // Below 6% = 1 star
};

/**
 * Labels for recommendation ratings
 */
export const RECOMMENDATION_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "Low Value",
  2: "Some Value",
  3: "Moderate Value",
  4: "High Value",
  5: "Critical Test",
};

// ============================================================================
// Single Test Analysis
// ============================================================================

/**
 * Analyze what-if for a test queue item.
 * Wraps the core analyzeWhatIf with TestQueueItem support.
 */
export function analyzeTestQueueItem(
  currentConfidence: number,
  item: TestQueueItem,
  config?: Partial<ConfidenceUpdateConfig>,
): WhatIfAnalysis {
  const testInput: TestInput = {
    discriminativePower: item.discriminativePower,
  };
  return analyzeWhatIf(currentConfidence, testInput, config);
}

/**
 * Calculate recommendation rating based on information value
 */
export function calculateRecommendationRating(informationValue: number): 1 | 2 | 3 | 4 | 5 {
  if (informationValue >= RECOMMENDATION_THRESHOLDS.FIVE_STAR) return 5;
  if (informationValue >= RECOMMENDATION_THRESHOLDS.FOUR_STAR) return 4;
  if (informationValue >= RECOMMENDATION_THRESHOLDS.THREE_STAR) return 3;
  if (informationValue >= RECOMMENDATION_THRESHOLDS.TWO_STAR) return 2;
  return 1;
}

// ============================================================================
// Multi-Test Scenarios
// ============================================================================

/**
 * Create a new what-if scenario
 */
export function createScenario(input: {
  name: string;
  sessionId: string;
  hypothesisId: string;
  startingConfidence: number;
  assumedTests?: AssumedTestResult[];
}): WhatIfScenario {
  const uuid = globalThis.crypto?.randomUUID?.();
  const id = uuid
    ? `WIF-${uuid}`
    : `WIF-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const scenario: WhatIfScenario = {
    id,
    name: input.name,
    sessionId: input.sessionId,
    hypothesisId: input.hypothesisId,
    startingConfidence: input.startingConfidence,
    assumedTests: input.assumedTests ?? [],
    projectedConfidence: input.startingConfidence,
    confidenceDelta: 0,
    createdAt: new Date(),
  };

  // Calculate projected confidence if tests are provided
  if (scenario.assumedTests.length > 0) {
    const result = calculateScenarioOutcome(scenario);
    scenario.projectedConfidence = result.projectedConfidence;
    scenario.confidenceDelta = result.confidenceDelta;
  }

  return scenario;
}

/**
 * Add a test to an existing scenario
 */
export function addTestToScenario(
  scenario: WhatIfScenario,
  test: AssumedTestResult,
): WhatIfScenario {
  const updated: WhatIfScenario = {
    ...scenario,
    assumedTests: [...scenario.assumedTests, test],
  };

  const result = calculateScenarioOutcome(updated);
  updated.projectedConfidence = result.projectedConfidence;
  updated.confidenceDelta = result.confidenceDelta;

  return updated;
}

/**
 * Remove a test from a scenario
 */
export function removeTestFromScenario(scenario: WhatIfScenario, testId: string): WhatIfScenario {
  const updated: WhatIfScenario = {
    ...scenario,
    assumedTests: scenario.assumedTests.filter((t) => t.testId !== testId),
  };

  const result = calculateScenarioOutcome(updated);
  updated.projectedConfidence = result.projectedConfidence;
  updated.confidenceDelta = result.confidenceDelta;

  return updated;
}

/**
 * Update a test's assumed result in a scenario
 */
export function updateTestInScenario(
  scenario: WhatIfScenario,
  testId: string,
  newResult: EvidenceResult,
): WhatIfScenario {
  const updated: WhatIfScenario = {
    ...scenario,
    assumedTests: scenario.assumedTests.map((t) =>
      t.testId === testId ? { ...t, assumedResult: newResult } : t,
    ),
  };

  const result = calculateScenarioOutcome(updated);
  updated.projectedConfidence = result.projectedConfidence;
  updated.confidenceDelta = result.confidenceDelta;

  return updated;
}

/**
 * Calculate the projected outcome of a scenario
 */
export function calculateScenarioOutcome(
  scenario: WhatIfScenario,
  config?: Partial<ConfidenceUpdateConfig>,
): { projectedConfidence: number; confidenceDelta: number } {
  if (scenario.assumedTests.length === 0) {
    return {
      projectedConfidence: scenario.startingConfidence,
      confidenceDelta: 0,
    };
  }

  // Convert assumed tests to batch evidence items
  const evidenceItems: BatchEvidenceItem[] = scenario.assumedTests.map((t) => ({
    test: { discriminativePower: t.discriminativePower },
    result: t.assumedResult,
  }));

  const result = computeBatchConfidenceUpdate(scenario.startingConfidence, evidenceItems, config);

  return {
    projectedConfidence: result.finalConfidence,
    confidenceDelta: result.totalDelta,
  };
}

// ============================================================================
// Scenario Analysis
// ============================================================================

/**
 * Analyze a scenario with best/worst case projections
 */
export function analyzeScenario(
  scenario: WhatIfScenario,
  config?: Partial<ConfidenceUpdateConfig>,
): ScenarioAnalysis {
  // Best case: all tests support
  const bestCaseItems: BatchEvidenceItem[] = scenario.assumedTests.map((t) => ({
    test: { discriminativePower: t.discriminativePower },
    result: "supports" as EvidenceResult,
  }));

  const bestCaseResult =
    scenario.assumedTests.length > 0
      ? computeBatchConfidenceUpdate(scenario.startingConfidence, bestCaseItems, config)
      : { finalConfidence: scenario.startingConfidence, totalDelta: 0 };

  // Worst case: all tests challenge
  const worstCaseItems: BatchEvidenceItem[] = scenario.assumedTests.map((t) => ({
    test: { discriminativePower: t.discriminativePower },
    result: "challenges" as EvidenceResult,
  }));

  const worstCaseResult =
    scenario.assumedTests.length > 0
      ? computeBatchConfidenceUpdate(scenario.startingConfidence, worstCaseItems, config)
      : { finalConfidence: scenario.startingConfidence, totalDelta: 0 };

  // Find most impactful test
  let mostImpactfulTest: ScenarioAnalysis["mostImpactfulTest"] = null;
  if (scenario.assumedTests.length > 0) {
    let maxImpact = 0;

    for (const test of scenario.assumedTests) {
      const analysis = analyzeWhatIf(
        scenario.startingConfidence,
        { discriminativePower: test.discriminativePower },
        config,
      );

      if (analysis.maxImpact > maxImpact) {
        maxImpact = analysis.maxImpact;
        mostImpactfulTest = {
          testId: test.testId,
          testName: test.testName,
          maxImpact,
        };
      }
    }
  }

  // Expected case explanation based on current confidence
  const currentConfidence = scenario.startingConfidence;
  let expectedExplanation: string;

  if (currentConfidence >= 70) {
    expectedExplanation =
      "With high starting confidence, supporting evidence will have modest impact while " +
      "challenging evidence could significantly reduce confidence.";
  } else if (currentConfidence <= 30) {
    expectedExplanation =
      "With low starting confidence, challenging evidence will have modest additional impact " +
      "while supporting evidence could significantly raise confidence.";
  } else {
    expectedExplanation =
      "With moderate confidence, both outcomes will have meaningful impact. " +
      "The asymmetry favors disconfirmation.";
  }

  return {
    scenario,
    bestCase: {
      confidence: bestCaseResult.finalConfidence,
      delta: bestCaseResult.totalDelta,
    },
    worstCase: {
      confidence: worstCaseResult.finalConfidence,
      delta: worstCaseResult.totalDelta,
    },
    expectedCase: {
      confidence: scenario.projectedConfidence,
      delta: scenario.confidenceDelta,
      explanation: expectedExplanation,
    },
    mostImpactfulTest,
  };
}

// ============================================================================
// Test Comparison
// ============================================================================

/**
 * Compare multiple tests to identify the most valuable ones to run
 */
export function compareTests(
  currentConfidence: number,
  tests: TestQueueItem[],
  config?: Partial<ConfidenceUpdateConfig>,
): TestComparisonResult {
  if (tests.length === 0) {
    return {
      currentConfidence,
      rankedTests: [],
      recommendation: null,
      summary: {
        totalTests: 0,
        highValueTests: 0,
        lowValueTests: 0,
        averageInformationValue: 0,
      },
    };
  }

  // Analyze each test
  const comparisons: TestComparison[] = tests.map((item) => {
    const analysis = analyzeWhatIf(
      currentConfidence,
      { discriminativePower: item.discriminativePower },
      config,
    );

    const asymmetryRatio =
      Math.abs(analysis.ifSupports.delta) > 0
        ? Math.abs(analysis.ifChallenges.delta) / Math.abs(analysis.ifSupports.delta)
        : Infinity;

    return {
      testId: item.id,
      testName: item.test.name,
      discriminativePower: item.discriminativePower,
      analysis,
      maxImpact: analysis.maxImpact,
      informationValue: analysis.informationValue,
      asymmetryRatio,
      recommendationRating: calculateRecommendationRating(analysis.informationValue),
    };
  });

  // Sort by information value (highest first)
  const rankedTests = [...comparisons].sort((a, b) => b.informationValue - a.informationValue);

  // Generate recommendation
  const topTest = rankedTests[0];
  let recommendation: TestComparisonResult["recommendation"] = null;

  if (topTest) {
    let reason: string;

    if (topTest.recommendationRating >= 4) {
      reason =
        `This test has high discriminative power (${topTest.discriminativePower}★) ` +
        `with ${topTest.informationValue.toFixed(1)}% information value. ` +
        "Running it first will maximize learning.";
    } else if (topTest.recommendationRating >= 3) {
      reason =
        `This test offers moderate value (${topTest.informationValue.toFixed(1)}%). ` +
        "Consider whether a more discriminative test could be designed.";
    } else {
      reason =
        "All available tests have low information value. " +
        "Consider designing more discriminative tests before proceeding.";
    }

    recommendation = {
      testId: topTest.testId,
      testName: topTest.testName,
      reason,
    };
  }

  // Calculate summary stats
  const totalInformationValue = comparisons.reduce((sum, t) => sum + t.informationValue, 0);
  const highValueTests = comparisons.filter((t) => t.recommendationRating >= 4).length;
  const lowValueTests = comparisons.filter((t) => t.recommendationRating <= 2).length;

  return {
    currentConfidence,
    rankedTests,
    recommendation,
    summary: {
      totalTests: tests.length,
      highValueTests,
      lowValueTests,
      averageInformationValue: tests.length > 0 ? totalInformationValue / tests.length : 0,
    },
  };
}

// ============================================================================
// Preset Scenarios
// ============================================================================

/**
 * Generate a "best case" scenario where all tests support
 */
export function createBestCaseScenario(
  sessionId: string,
  hypothesisId: string,
  currentConfidence: number,
  tests: TestQueueItem[],
): WhatIfScenario {
  const assumedTests: AssumedTestResult[] = tests.map((t) => ({
    testId: t.id,
    testName: t.test.name,
    discriminativePower: t.discriminativePower,
    assumedResult: "supports",
  }));

  return createScenario({
    name: "Best Case",
    sessionId,
    hypothesisId,
    startingConfidence: currentConfidence,
    assumedTests,
  });
}

/**
 * Generate a "worst case" scenario where all tests challenge
 */
export function createWorstCaseScenario(
  sessionId: string,
  hypothesisId: string,
  currentConfidence: number,
  tests: TestQueueItem[],
): WhatIfScenario {
  const assumedTests: AssumedTestResult[] = tests.map((t) => ({
    testId: t.id,
    testName: t.test.name,
    discriminativePower: t.discriminativePower,
    assumedResult: "challenges",
  }));

  return createScenario({
    name: "Worst Case",
    sessionId,
    hypothesisId,
    startingConfidence: currentConfidence,
    assumedTests,
  });
}

/**
 * Generate a "mixed" scenario with specified results per test
 */
export function createMixedScenario(
  sessionId: string,
  hypothesisId: string,
  currentConfidence: number,
  testsWithResults: Array<{ test: TestQueueItem; result: EvidenceResult }>,
): WhatIfScenario {
  const assumedTests: AssumedTestResult[] = testsWithResults.map(({ test, result }) => ({
    testId: test.id,
    testName: test.test.name,
    discriminativePower: test.discriminativePower,
    assumedResult: result,
  }));

  return createScenario({
    name: "Custom Scenario",
    sessionId,
    hypothesisId,
    startingConfidence: currentConfidence,
    assumedTests,
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format information value for display
 */
export function formatInformationValue(value: number): string {
  if (value >= 30) return `±${value.toFixed(0)}% (Very High)`;
  if (value >= 20) return `±${value.toFixed(0)}% (High)`;
  if (value >= 10) return `±${value.toFixed(0)}% (Moderate)`;
  return `±${value.toFixed(0)}% (Low)`;
}

/**
 * Get star rating display for recommendation
 */
export function getRecommendationStars(rating: 1 | 2 | 3 | 4 | 5): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

/**
 * Get color class for recommendation rating
 */
export function getRecommendationColor(rating: 1 | 2 | 3 | 4 | 5): string {
  switch (rating) {
    case 5:
      return "text-green-600";
    case 4:
      return "text-lime-600";
    case 3:
      return "text-yellow-600";
    case 2:
      return "text-orange-600";
    case 1:
      return "text-red-600";
  }
}

/**
 * Summarize a scenario for display
 */
export function summarizeScenario(scenario: WhatIfScenario): string {
  const testCount = scenario.assumedTests.length;
  const supports = scenario.assumedTests.filter((t) => t.assumedResult === "supports").length;
  const challenges = scenario.assumedTests.filter((t) => t.assumedResult === "challenges").length;
  const inconclusive = testCount - supports - challenges;

  const parts: string[] = [];
  if (supports > 0) parts.push(`${supports} support${supports !== 1 ? "s" : ""}`);
  if (challenges > 0) parts.push(`${challenges} challenge${challenges !== 1 ? "s" : ""}`);
  if (inconclusive > 0) parts.push(`${inconclusive} inconclusive`);

  const deltaStr =
    scenario.confidenceDelta >= 0
      ? `+${scenario.confidenceDelta.toFixed(1)}%`
      : `${scenario.confidenceDelta.toFixed(1)}%`;

  return `${testCount} test${testCount !== 1 ? "s" : ""} (${parts.join(", ")}): ${scenario.startingConfidence.toFixed(0)}% → ${scenario.projectedConfidence.toFixed(0)}% (${deltaStr})`;
}
