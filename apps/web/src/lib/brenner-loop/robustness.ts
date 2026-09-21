/**
 * Robustness Score Calculation
 *
 * Quantifies how well a hypothesis has survived testing, providing a meaningful
 * confidence indicator based on discriminative power of tests.
 *
 * Key insight: Confidence shouldn't be vibes. A hypothesis that survives strong
 * discriminative tests is genuinely more robust than one that's never been challenged.
 *
 * @see brenner_bot-an1n.4 (bead)
 * @see brenner_bot-an1n (parent epic: Hypothesis Engine)
 * @module brenner-loop/robustness
 */

import type { EvidenceResult } from "./evidence";
import type { HypothesisCard } from "./hypothesis";

// ============================================================================
// Types
// ============================================================================

/**
 * Flexible evidence input that supports both:
 * - FullEvidenceEntry (from evidence.ts)
 * - EvidenceEntry (from types.ts)
 */
export interface RobustnessEvidenceInput {
  id?: string;
  result?: EvidenceResult;
  test?: { discriminativePower: number };
  testId?: string;
  hypothesisVersion?: string;
  matchedHypothesisId?: string;
}

/**
 * Interpretation of a hypothesis's robustness based on testing history.
 *
 * - robust: Hypothesis has survived multiple high-power tests
 * - shaky: Hypothesis has mixed results or low survival rate
 * - falsified: At least one test has falsified the hypothesis
 * - untested: Hypothesis has not been subjected to meaningful tests yet
 */
export type RobustnessInterpretation = "robust" | "shaky" | "falsified" | "untested";

/**
 * Component scores that contribute to the overall robustness score.
 * Each component measures a different aspect of hypothesis quality.
 */
export interface RobustnessComponents {
  /** Number of tests attempted on this hypothesis version */
  testsAttempted: number;

  /** Number of tests that support (or don't contradict) the hypothesis */
  testsSurvived: number;

  /** Number of tests that challenge the hypothesis */
  testsFailed: number;

  /** Number of inconclusive tests */
  testsInconclusive: number;

  /**
   * Survival score weighted by discriminative power (0-1).
   * High-power tests that support contribute more than low-power tests.
   */
  weightedSurvival: number;

  /**
   * How testable is this hypothesis? (0-100)
   * Based on presence of falsification conditions and prediction specificity.
   */
  falsifiabilityScore: number;

  /**
   * How precise are the predictions? (0-100)
   * Vague predictions score lower than specific, measurable ones.
   */
  specificityScore: number;

  /**
   * Average discriminative power of tests faced (1-5 or 0 if untested).
   */
  averageTestPower: number;
}

/**
 * Complete robustness assessment for a hypothesis.
 *
 * The overall score combines:
 * - Weighted survival: How well has it survived testing? (60% weight)
 * - Falsifiability: Is it structured to be testable? (20% weight)
 * - Specificity: Are predictions precise? (20% weight)
 */
export interface RobustnessScore {
  /** Overall robustness score (0-100) */
  overall: number;

  /** Component breakdown of the score */
  components: RobustnessComponents;

  /** Human-readable interpretation of the robustness level */
  interpretation: RobustnessInterpretation;

  /** Explanation text for display */
  explanation: string;

  /** ID of the hypothesis version this score applies to */
  hypothesisVersionId: string;

  /** Timestamp when this score was calculated */
  calculatedAt: Date;
}

/**
 * Configuration for robustness calculation.
 * Allows tuning the weights and thresholds.
 */
export interface RobustnessConfig {
  /** Weight for survival component (default: 0.6) */
  survivalWeight: number;

  /** Weight for falsifiability component (default: 0.2) */
  falsifiabilityWeight: number;

  /** Weight for specificity component (default: 0.2) */
  specificityWeight: number;

  /** Threshold for "robust" interpretation (default: 0.7) */
  robustThreshold: number;

  /** Threshold for "shaky" interpretation (default: 0.4) */
  shakyThreshold: number;

  /** Base score for untested hypotheses (default: 50) */
  untestedBaseScore: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default configuration for robustness calculation.
 */
export const DEFAULT_ROBUSTNESS_CONFIG: RobustnessConfig = {
  survivalWeight: 0.6,
  falsifiabilityWeight: 0.2,
  specificityWeight: 0.2,
  robustThreshold: 0.7,
  shakyThreshold: 0.4,
  untestedBaseScore: 50,
};

/**
 * Labels and colors for interpretation display.
 */
export const ROBUSTNESS_LABELS: Record<
  RobustnessInterpretation,
  { label: string; color: string; description: string }
> = {
  robust: {
    label: "Robust",
    color: "green",
    description: "Hypothesis has survived meaningful discriminative testing",
  },
  shaky: {
    label: "Shaky",
    color: "yellow",
    description: "Mixed results or weak testing - needs more scrutiny",
  },
  falsified: {
    label: "Falsified",
    color: "red",
    description: "Evidence contradicts the hypothesis",
  },
  untested: {
    label: "Untested",
    color: "gray",
    description: "No meaningful tests have been applied yet",
  },
};

// ============================================================================
// Core Algorithm
// ============================================================================

/**
 * Compute specificity score based on the precision of predictions.
 *
 * Factors considered:
 * - Number of predictions (more specific = more testable)
 * - Average length (longer = more detailed)
 * - Presence of quantitative terms (numbers, comparisons)
 *
 * @param predictions - Array of prediction strings
 * @returns Score from 0-100
 */
export function computeSpecificityScore(predictions: string[]): number {
  if (predictions.length === 0) {
    return 0;
  }

  // Factor 1: Number of predictions (more = better, up to a point)
  const countScore = Math.min(predictions.length / 3, 1) * 30;

  // Factor 2: Average length (longer = more specific)
  const avgLength = predictions.reduce((sum, p) => sum + p.length, 0) / predictions.length;
  const lengthScore = Math.min(avgLength / 100, 1) * 30;

  // Factor 3: Quantitative indicators
  const quantitativePatterns = [
    /\d+/, // numbers
    /more than|less than|at least|at most/i,
    /increase|decrease|higher|lower/i,
    /percent|%/i,
    /significant|measurable/i,
    /within \d/i, // timeframes
  ];

  let quantitativeScore = 0;
  for (const prediction of predictions) {
    for (const pattern of quantitativePatterns) {
      if (pattern.test(prediction)) {
        quantitativeScore += 10 / predictions.length;
      }
    }
  }
  quantitativeScore = Math.min(quantitativeScore, 40);

  return Math.round(countScore + lengthScore + quantitativeScore);
}

/**
 * Compute falsifiability score based on hypothesis structure.
 *
 * Key factors:
 * - Presence of impossibleIfTrue statements (required for good score)
 * - Number and quality of falsification conditions
 * - Prediction structure (both if-true and if-false)
 *
 * @param hypothesis - The hypothesis card to evaluate
 * @returns Score from 0-100
 */
export function computeFalsifiabilityScore(hypothesis: HypothesisCard): number {
  let score = 0;

  // Factor 1: Has impossibleIfTrue statements (critical - 40 points)
  if (hypothesis.impossibleIfTrue && hypothesis.impossibleIfTrue.length > 0) {
    // Base points for having any
    score += 25;
    // Additional points for multiple conditions (up to 3)
    score += Math.min(hypothesis.impossibleIfTrue.length, 3) * 5;
  }

  // Factor 2: Has predictionsIfFalse (helps design tests - 25 points)
  if (hypothesis.predictionsIfFalse && hypothesis.predictionsIfFalse.length > 0) {
    score += 15;
    // Bonus for multiple predictions
    score += Math.min(hypothesis.predictionsIfFalse.length, 2) * 5;
  }

  // Factor 3: Has predictionsIfTrue (testable predictions - 20 points)
  if (hypothesis.predictionsIfTrue && hypothesis.predictionsIfTrue.length > 0) {
    score += 10;
    score += Math.min(hypothesis.predictionsIfTrue.length, 2) * 5;
  }

  // Factor 4: Has explicit mechanism (mechanistic thinking - 15 points)
  if (hypothesis.mechanism && hypothesis.mechanism.length >= 20) {
    score += 15;
  }

  return Math.min(score, 100);
}

/**
 * Compute weighted survival score from evidence ledger.
 *
 * Tests weighted by discriminative power:
 * - 5-star test: 5 points
 * - 1-star test: 1 point
 *
 * @param evidence - Array of evidence entries for this hypothesis
 * @param testLookup - Optional lookup for test power (testId -> power)
 * @returns Object with weighted survival ratio and related stats
 */
function computeWeightedSurvival(
  evidence: RobustnessEvidenceInput[],
  testLookup?: Record<string, { discriminativePower: number }>,
): {
  weightedSurvival: number;
  testsAttempted: number;
  testsSurvived: number;
  testsFailed: number;
  testsInconclusive: number;
  totalPower: number;
  averageTestPower: number;
} {
  if (evidence.length === 0) {
    return {
      weightedSurvival: 0,
      testsAttempted: 0,
      testsSurvived: 0,
      testsFailed: 0,
      testsInconclusive: 0,
      totalPower: 0,
      averageTestPower: 0,
    };
  }

  let totalPower = 0;
  let survivalPower = 0;
  let testsAttempted = 0;
  let testsSurvived = 0;
  let testsFailed = 0;
  let testsInconclusive = 0;

  for (const entry of evidence) {
    // Determine power: embedded test object > lookup > default (1)
    let power = 1;
    if (entry.test?.discriminativePower) {
      power = entry.test.discriminativePower;
    } else if (entry.testId && testLookup && testLookup[entry.testId]) {
      power = testLookup[entry.testId].discriminativePower;
    }

    testsAttempted++;
    totalPower += power;

    switch (entry.result) {
      case "supports":
        survivalPower += power;
        testsSurvived++;
        break;
      case "challenges":
        testsFailed++;
        // Challenging tests don't add to survival power
        break;
      case "inconclusive":
        // Inconclusive tests add partial credit (50% of power)
        survivalPower += power * 0.5;
        testsInconclusive++;
        break;
    }
  }

  return {
    weightedSurvival: totalPower > 0 ? survivalPower / totalPower : 0,
    testsAttempted,
    testsSurvived,
    testsFailed,
    testsInconclusive,
    totalPower,
    averageTestPower: testsAttempted > 0 ? totalPower / testsAttempted : 0,
  };
}

/**
 * Determine the interpretation based on test results and survival rate.
 *
 * @param survival - Weighted survival stats
 * @param config - Configuration with thresholds
 * @returns Interpretation label
 */
function determineInterpretation(
  survival: ReturnType<typeof computeWeightedSurvival>,
  config: RobustnessConfig,
): RobustnessInterpretation {
  // If any test has failed (challenged), hypothesis is falsified
  if (survival.testsFailed > 0) {
    return "falsified";
  }

  // If no meaningful tests, it's untested
  if (survival.testsAttempted === 0 || survival.totalPower === 0) {
    return "untested";
  }

  // Determine based on survival rate
  if (survival.weightedSurvival >= config.robustThreshold) {
    return "robust";
  }

  return "shaky";
}

/**
 * Generate explanation text for the robustness score.
 *
 * @param score - The computed robustness score
 * @param hypothesis - The hypothesis being evaluated
 * @returns Human-readable explanation
 */
function generateExplanation(
  score: Omit<RobustnessScore, "explanation">,
  hypothesis: HypothesisCard,
): string {
  void hypothesis;
  const { components, interpretation } = score;

  if (interpretation === "untested") {
    return (
      `This hypothesis has not been subjected to meaningful testing yet. ` +
      `Consider designing discriminative tests to challenge it.`
    );
  }

  if (interpretation === "falsified") {
    return (
      `This hypothesis failed ${components.testsFailed} test(s). ` +
      `${components.testsSurvived} test(s) supported it before falsification. ` +
      `Consider revising or abandoning in favor of alternatives.`
    );
  }

  const totalTests = components.testsAttempted;
  const avgPowerLabel = getTestPowerLabel(components.averageTestPower);

  if (interpretation === "robust") {
    return (
      `Hypothesis survived ${components.testsSurvived}/${totalTests} tests ` +
      `(average power: ${avgPowerLabel}). ` +
      `Weighted survival rate: ${(components.weightedSurvival * 100).toFixed(0)}%. ` +
      `This is a well-tested hypothesis.`
    );
  }

  // shaky
  return (
    `Mixed results: ${components.testsSurvived} supporting, ` +
    `${components.testsInconclusive} inconclusive out of ${totalTests} tests ` +
    `(average power: ${avgPowerLabel}). ` +
    `Consider more decisive tests to clarify the hypothesis status.`
  );
}

/**
 * Get human-readable label for average test power.
 */
function getTestPowerLabel(avgPower: number): string {
  if (avgPower >= 4.5) return "decisive";
  if (avgPower >= 3.5) return "high";
  if (avgPower >= 2.5) return "moderate";
  if (avgPower >= 1.5) return "low";
  return "minimal";
}

/**
 * Compute the full robustness score for a hypothesis.
 *
 * This is the main entry point for robustness calculation.
 *
 * @param hypothesis - The hypothesis card to evaluate
 * @param evidenceLedger - All evidence entries (will be filtered to this hypothesis version)
 * @param config - Optional configuration overrides
 * @param testLookup - Optional lookup for test power (testId -> { discriminativePower: number })
 * @returns Complete RobustnessScore with components and interpretation
 *
 * @example
 * const robustness = computeRobustness(hypothesis, allEvidence);
 * console.log(`Score: ${robustness.overall}, Status: ${robustness.interpretation}`);
 */
export function computeRobustness(
  hypothesis: HypothesisCard,
  evidenceLedger: RobustnessEvidenceInput[],
  config: Partial<RobustnessConfig> = {},
  testLookup?: Record<string, { discriminativePower: number }>,
): RobustnessScore {
  const cfg: RobustnessConfig = { ...DEFAULT_ROBUSTNESS_CONFIG, ...config };

  // Filter evidence to this hypothesis version
  const relevantEvidence = evidenceLedger.filter(
    (e) => e.hypothesisVersion === hypothesis.id || e.matchedHypothesisId === hypothesis.id,
  );

  // Compute component scores
  const survival = computeWeightedSurvival(relevantEvidence, testLookup);
  const falsifiabilityScore = computeFalsifiabilityScore(hypothesis);
  const specificityScore = computeSpecificityScore(hypothesis.predictionsIfTrue || []);

  // Build components object
  const components: RobustnessComponents = {
    testsAttempted: survival.testsAttempted,
    testsSurvived: survival.testsSurvived,
    testsFailed: survival.testsFailed,
    testsInconclusive: survival.testsInconclusive,
    weightedSurvival: survival.weightedSurvival,
    falsifiabilityScore,
    specificityScore,
    averageTestPower: survival.averageTestPower,
  };

  // Determine interpretation
  const interpretation = determineInterpretation(survival, cfg);

  // Calculate overall score
  let overall: number;

  if (interpretation === "untested") {
    // Untested hypotheses get base score adjusted by structural quality
    overall =
      cfg.untestedBaseScore +
      (falsifiabilityScore * cfg.falsifiabilityWeight) / 2 +
      (specificityScore * cfg.specificityWeight) / 2;
  } else if (interpretation === "falsified") {
    // Falsified hypotheses get low score based on how badly they failed
    // But structural quality still matters for learning
    const failureRatio = survival.testsFailed / survival.testsAttempted;
    overall = Math.max(
      5,
      20 * (1 - failureRatio) +
        (falsifiabilityScore * cfg.falsifiabilityWeight) / 4 +
        (specificityScore * cfg.specificityWeight) / 4,
    );
  } else {
    // Normal calculation: weighted sum of components
    overall =
      survival.weightedSurvival * 100 * cfg.survivalWeight +
      falsifiabilityScore * cfg.falsifiabilityWeight +
      specificityScore * cfg.specificityWeight;
  }

  // Build the score object (without explanation)
  const scoreWithoutExplanation = {
    overall: Math.round(Math.min(100, Math.max(0, overall))),
    components,
    interpretation,
    hypothesisVersionId: hypothesis.id,
    calculatedAt: new Date(),
  };

  // Generate explanation
  const explanation = generateExplanation(scoreWithoutExplanation, hypothesis);

  return {
    ...scoreWithoutExplanation,
    explanation,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Type guard for RobustnessInterpretation.
 */
export function isRobustnessInterpretation(value: unknown): value is RobustnessInterpretation {
  return value === "robust" || value === "shaky" || value === "falsified" || value === "untested";
}

/**
 * Type guard for RobustnessScore.
 */
export function isRobustnessScore(obj: unknown): obj is RobustnessScore {
  if (typeof obj !== "object" || obj === null) return false;

  const s = obj as Record<string, unknown>;

  if (typeof s.overall !== "number") return false;
  if (!isRobustnessInterpretation(s.interpretation)) return false;
  if (typeof s.explanation !== "string") return false;
  if (typeof s.hypothesisVersionId !== "string") return false;
  if (typeof s.components !== "object" || s.components === null) return false;

  return true;
}

/**
 * Get display information for a robustness interpretation.
 */
export function getRobustnessDisplay(interpretation: RobustnessInterpretation): {
  label: string;
  color: string;
  description: string;
} {
  return ROBUSTNESS_LABELS[interpretation];
}

/**
 * Format overall score for display with label.
 */
export function formatRobustnessScore(score: RobustnessScore): string {
  const { label } = ROBUSTNESS_LABELS[score.interpretation];
  return `${score.overall} (${label})`;
}

/**
 * Get a compact summary for UI display.
 */
export function summarizeRobustness(score: RobustnessScore): string {
  const { components } = score;

  if (score.interpretation === "untested") {
    return "No tests recorded";
  }

  const parts: string[] = [];

  if (components.testsSurvived > 0) {
    parts.push(`${components.testsSurvived} passed`);
  }
  if (components.testsFailed > 0) {
    parts.push(`${components.testsFailed} failed`);
  }
  if (components.testsInconclusive > 0) {
    parts.push(`${components.testsInconclusive} inconclusive`);
  }

  return parts.join(", ");
}

/**
 * Compare two robustness scores.
 * Useful for sorting hypotheses by robustness.
 *
 * @returns Positive if a > b, negative if a < b, 0 if equal
 */
export function compareRobustness(a: RobustnessScore, b: RobustnessScore): number {
  // Primary: interpretation priority (robust > shaky > untested > falsified)
  const interpretationOrder: Record<RobustnessInterpretation, number> = {
    robust: 4,
    shaky: 3,
    untested: 2,
    falsified: 1,
  };

  const interpDiff = interpretationOrder[a.interpretation] - interpretationOrder[b.interpretation];
  if (interpDiff !== 0) return interpDiff;

  // Secondary: overall score
  return a.overall - b.overall;
}

/**
 * Calculate aggregate robustness across multiple hypotheses.
 * Useful for session-level reporting.
 */
export function aggregateRobustness(scores: RobustnessScore[]): {
  averageScore: number;
  counts: Record<RobustnessInterpretation, number>;
  totalTests: number;
  overallTestsFailed: number;
} {
  if (scores.length === 0) {
    return {
      averageScore: 0,
      counts: { robust: 0, shaky: 0, falsified: 0, untested: 0 },
      totalTests: 0,
      overallTestsFailed: 0,
    };
  }

  const counts: Record<RobustnessInterpretation, number> = {
    robust: 0,
    shaky: 0,
    falsified: 0,
    untested: 0,
  };

  let totalScore = 0;
  let totalTests = 0;
  let overallTestsFailed = 0;

  for (const score of scores) {
    counts[score.interpretation]++;
    totalScore += score.overall;
    totalTests += score.components.testsAttempted;
    overallTestsFailed += score.components.testsFailed;
  }

  return {
    averageScore: Math.round(totalScore / scores.length),
    counts,
    totalTests,
    overallTestsFailed,
  };
}
