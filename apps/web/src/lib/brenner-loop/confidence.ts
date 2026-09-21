/**
 * Confidence Update Algorithm
 *
 * Implements the Bayesian-inspired algorithm for updating hypothesis confidence
 * based on evidence, weighted by discriminative power.
 *
 * Key Brenner Insight: "It's easier to disprove than prove."
 * Therefore, challenging evidence has more impact than supporting evidence.
 *
 * @see brenner_bot-njjo.2 (bead)
 * @see brenner_bot-njjo (parent epic: Evidence Ledger)
 * @module brenner-loop/confidence
 */

import { type DiscriminativePower, type EvidenceResult, isDiscriminativePower } from "./evidence";

// ============================================================================
// Types
// ============================================================================

/**
 * Input for the confidence update algorithm.
 * Represents a test with its discriminative power and result.
 */
export interface TestInput {
  /** How well this test discriminates between hypotheses (1-5 stars) */
  discriminativePower: DiscriminativePower;
}

/**
 * Result of a confidence update computation.
 * Includes the new confidence, delta, and human-readable explanation.
 */
export interface ConfidenceUpdateResult {
  /** The new confidence value after update (1-99) */
  newConfidence: number;

  /** The change in confidence (can be positive, negative, or zero) */
  delta: number;

  /** Human-readable explanation of the update */
  explanation: string;

  /** Whether this was a significant update (>5% change) */
  significant: boolean;
}

/**
 * Configuration for the confidence update algorithm.
 * Allows tuning the impact multipliers if needed.
 */
export interface ConfidenceUpdateConfig {
  /**
   * Multiplier for supporting evidence impact.
   * Lower values mean weaker confirmation effects.
   * Default: 0.15
   */
  supportMultiplier: number;

  /**
   * Multiplier for challenging evidence impact.
   * Higher values mean stronger disconfirmation effects.
   * Default: 0.3
   */
  challengeMultiplier: number;

  /**
   * Minimum confidence floor (never go below this).
   * Default: 1
   */
  minConfidence: number;

  /**
   * Maximum confidence ceiling (never go above this).
   * Default: 99
   */
  maxConfidence: number;

  /**
   * Threshold for considering an update "significant".
   * Default: 5
   */
  significanceThreshold: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default configuration for confidence updates.
 * These values are calibrated based on Brenner's insights about
 * the asymmetry between confirmation and disconfirmation.
 */
export const DEFAULT_CONFIG: ConfidenceUpdateConfig = {
  supportMultiplier: 0.15, // Supporting evidence has moderate impact
  challengeMultiplier: 0.3, // Challenging evidence has 2x impact (asymmetry)
  minConfidence: 1, // Never be 100% sure it's false
  maxConfidence: 99, // Never be 100% sure it's true
  significanceThreshold: 5, // >5% change is significant
};

/**
 * Star emoji representations for discriminative power
 */
const STAR_RATINGS: Record<DiscriminativePower, string> = {
  1: "\u2606\u2606\u2606\u2606\u2606", // All empty stars
  2: "\u2605\u2606\u2606\u2606\u2606", // 1 filled
  3: "\u2605\u2605\u2606\u2606\u2606", // 2 filled
  4: "\u2605\u2605\u2605\u2606\u2606", // 3 filled
  5: "\u2605\u2605\u2605\u2605\u2605", // All filled
};

/**
 * Power level labels for explanations
 */
const POWER_LABELS: Record<DiscriminativePower, string> = {
  1: "weak",
  2: "moderate-low",
  3: "moderate",
  4: "high",
  5: "decisive",
};

// ============================================================================
// Core Algorithm
// ============================================================================

/**
 * Compute the confidence update based on evidence.
 *
 * This implements a Bayesian-inspired algorithm where:
 * 1. Supporting evidence moves confidence toward 100
 * 2. Challenging evidence moves confidence toward 0
 * 3. Inconclusive evidence leaves confidence unchanged
 * 4. Impact is weighted by discriminative power (1-5)
 * 5. Challenging evidence has 2x the impact of supporting evidence
 *
 * The asymmetry is intentional: per Brenner, it's easier to disprove than prove.
 *
 * @param currentConfidence - Current confidence level (0-100)
 * @param test - The test with its discriminative power
 * @param result - Whether the evidence supports, challenges, or is inconclusive
 * @param config - Optional configuration overrides
 * @returns ConfidenceUpdateResult with new confidence, delta, and explanation
 *
 * @example
 * // High-power test that challenges hypothesis
 * const update = computeConfidenceUpdate(
 *   72,
 *   { discriminativePower: 5 },
 *   'challenges'
 * );
 * // => { newConfidence: 50.4, delta: -21.6, explanation: "...", significant: true }
 */
export function computeConfidenceUpdate(
  currentConfidence: number,
  test: TestInput,
  result: EvidenceResult,
  config: Partial<ConfidenceUpdateConfig> = {},
): ConfidenceUpdateResult {
  const cfg: ConfidenceUpdateConfig = { ...DEFAULT_CONFIG, ...config };

  // Validate inputs
  if (!Number.isFinite(currentConfidence)) {
    throw new Error(
      `Invalid currentConfidence: must be a finite number (got ${currentConfidence})`,
    );
  }
  if (currentConfidence < 0 || currentConfidence > 100) {
    throw new Error(
      `Invalid currentConfidence: must be between 0 and 100 (got ${currentConfidence})`,
    );
  }
  if (!isDiscriminativePower(test.discriminativePower)) {
    throw new Error(`Invalid discriminativePower: must be 1-5 (got ${test.discriminativePower})`);
  }

  // Normalize power to 0.2-1.0 range
  const power = test.discriminativePower / 5;
  const stars = STAR_RATINGS[test.discriminativePower];
  const powerLabel = POWER_LABELS[test.discriminativePower];

  // Handle inconclusive result
  if (result === "inconclusive") {
    return {
      newConfidence: currentConfidence,
      delta: 0,
      explanation: `${stars} test was inconclusive. Confidence unchanged at ${currentConfidence.toFixed(1)}%.`,
      significant: false,
    };
  }

  // Calculate update based on result
  let delta: number;
  let newConfidence: number;
  let explanation: string;

  if (result === "supports") {
    // Weak update toward 100
    // Supporting evidence is inherently weaker than challenging evidence
    // because many things can be consistent with a hypothesis
    const rawDelta = (100 - currentConfidence) * power * cfg.supportMultiplier;
    newConfidence = Math.min(currentConfidence + rawDelta, cfg.maxConfidence);
    delta = newConfidence - currentConfidence;

    explanation =
      `${stars} ${powerLabel} test supports hypothesis. ` +
      `Confidence ${currentConfidence.toFixed(1)}% \u2192 ${newConfidence.toFixed(1)}% ` +
      `(+${delta.toFixed(1)}%).`;
  } else {
    // result === "challenges"
    // Strong update toward 0
    // Discriminative tests that challenge are very informative
    // because they can rule out possibilities
    const rawDelta = -(currentConfidence * power * cfg.challengeMultiplier);
    newConfidence = Math.max(currentConfidence + rawDelta, cfg.minConfidence);
    delta = newConfidence - currentConfidence;

    explanation =
      `${stars} ${powerLabel} test challenges hypothesis. ` +
      `Confidence ${currentConfidence.toFixed(1)}% \u2192 ${newConfidence.toFixed(1)}% ` +
      `(${delta.toFixed(1)}%).`;
  }

  // Determine if this update is significant
  const significant = Math.abs(delta) >= cfg.significanceThreshold;

  // Add significance note if applicable
  if (significant && result === "challenges") {
    explanation += " This is a major blow to the hypothesis.";
  } else if (significant && result === "supports") {
    explanation += " Hypothesis survives a meaningful test.";
  }

  return {
    newConfidence,
    delta,
    explanation,
    significant,
  };
}

// ============================================================================
// Batch Processing
// ============================================================================

/**
 * A single evidence item for batch processing
 */
export interface BatchEvidenceItem {
  test: TestInput;
  result: EvidenceResult;
}

/**
 * Result of batch confidence updates
 */
export interface BatchUpdateResult {
  /** Starting confidence */
  initialConfidence: number;

  /** Final confidence after all updates */
  finalConfidence: number;

  /** Total delta from start to finish */
  totalDelta: number;

  /** Individual updates in order */
  updates: ConfidenceUpdateResult[];

  /** Summary of results */
  summary: {
    supports: number;
    challenges: number;
    inconclusive: number;
    significantChanges: number;
  };
}

/**
 * Apply multiple evidence items sequentially.
 *
 * Each update is applied in order, with the new confidence
 * becoming the input for the next update.
 *
 * @param initialConfidence - Starting confidence level (0-100)
 * @param evidenceItems - Array of evidence to process
 * @param config - Optional configuration overrides
 * @returns BatchUpdateResult with all individual updates and summary
 */
export function computeBatchConfidenceUpdate(
  initialConfidence: number,
  evidenceItems: BatchEvidenceItem[],
  config: Partial<ConfidenceUpdateConfig> = {},
): BatchUpdateResult {
  let currentConfidence = initialConfidence;
  const updates: ConfidenceUpdateResult[] = [];

  const summary = {
    supports: 0,
    challenges: 0,
    inconclusive: 0,
    significantChanges: 0,
  };

  for (const item of evidenceItems) {
    const update = computeConfidenceUpdate(currentConfidence, item.test, item.result, config);
    updates.push(update);
    currentConfidence = update.newConfidence;

    // Track summary
    if (item.result === "supports") summary.supports++;
    else if (item.result === "challenges") summary.challenges++;
    else summary.inconclusive++;

    if (update.significant) summary.significantChanges++;
  }

  return {
    initialConfidence,
    finalConfidence: currentConfidence,
    totalDelta: currentConfidence - initialConfidence,
    updates,
    summary,
  };
}

// ============================================================================
// What-If Analysis
// ============================================================================

/**
 * Result of what-if analysis for a potential test
 */
export interface WhatIfAnalysis {
  /** Current confidence before any test */
  currentConfidence: number;

  /** What happens if the test supports the hypothesis */
  ifSupports: ConfidenceUpdateResult;

  /** What happens if the test challenges the hypothesis */
  ifChallenges: ConfidenceUpdateResult;

  /** What happens if the test is inconclusive */
  ifInconclusive: ConfidenceUpdateResult;

  /** Maximum potential change (absolute value) */
  maxImpact: number;

  /** Information value - how much could we learn? */
  informationValue: number;
}

/**
 * Analyze what would happen for each possible test outcome.
 *
 * This helps users decide which tests to run first by showing
 * the potential impact of each outcome.
 *
 * @param currentConfidence - Current confidence level
 * @param test - The test being considered
 * @param config - Optional configuration overrides
 * @returns WhatIfAnalysis with projections for each outcome
 */
export function analyzeWhatIf(
  currentConfidence: number,
  test: TestInput,
  config: Partial<ConfidenceUpdateConfig> = {},
): WhatIfAnalysis {
  const ifSupports = computeConfidenceUpdate(currentConfidence, test, "supports", config);
  const ifChallenges = computeConfidenceUpdate(currentConfidence, test, "challenges", config);
  const ifInconclusive = computeConfidenceUpdate(currentConfidence, test, "inconclusive", config);

  // Calculate maximum potential impact
  const maxImpact = Math.max(Math.abs(ifSupports.delta), Math.abs(ifChallenges.delta));

  // Information value is the range of possible confidence outcomes
  // Higher range = more informative test
  const informationValue = Math.abs(ifSupports.newConfidence - ifChallenges.newConfidence);

  return {
    currentConfidence,
    ifSupports,
    ifChallenges,
    ifInconclusive,
    maxImpact,
    informationValue,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get a textual assessment of the confidence level.
 */
export function getConfidenceAssessment(confidence: number): {
  label: string;
  color: string;
  description: string;
} {
  if (confidence >= 80) {
    return {
      label: "High",
      color: "green",
      description: "Strong confidence - hypothesis has survived serious testing",
    };
  }
  if (confidence >= 60) {
    return {
      label: "Moderate-High",
      color: "lime",
      description: "Good confidence - hypothesis is holding up well",
    };
  }
  if (confidence >= 40) {
    return {
      label: "Moderate",
      color: "yellow",
      description: "Uncertain - more discriminative testing needed",
    };
  }
  if (confidence >= 20) {
    return {
      label: "Low",
      color: "orange",
      description: "Weak confidence - hypothesis is under pressure",
    };
  }
  return {
    label: "Very Low",
    color: "red",
    description: "Hypothesis is nearly falsified - consider alternatives",
  };
}

/**
 * Format a confidence value for display with appropriate precision.
 */
export function formatConfidence(confidence: number): string {
  if (confidence === Math.floor(confidence)) {
    return `${confidence}%`;
  }
  return `${confidence.toFixed(1)}%`;
}

/**
 * Format a delta value for display with sign and direction arrow.
 */
export function formatDelta(delta: number): string {
  if (delta === 0) {
    return "\u00b10%"; // ±0%
  }
  const arrow = delta > 0 ? "\u2191" : "\u2193"; // ↑ or ↓
  const sign = delta > 0 ? "+" : "";
  return `${arrow} ${sign}${delta.toFixed(1)}%`;
}

/**
 * Get the star rating string for a discriminative power level.
 */
export function getStarRating(power: DiscriminativePower): string {
  return STAR_RATINGS[power];
}

/**
 * Explain why the algorithm is asymmetric (for UI tooltips).
 */
export function getAsymmetryExplanation(): string {
  return (
    "Challenging evidence has twice the impact of supporting evidence. " +
    "This reflects Brenner's insight that disproving is more informative than confirming. " +
    "Many observations can be consistent with a hypothesis, but strong disconfirming " +
    "evidence rules out possibilities. This asymmetry keeps users honest about their beliefs."
  );
}
