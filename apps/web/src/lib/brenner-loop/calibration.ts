/**
 * Confidence Calibration Tracking
 *
 * Track user's prediction accuracy over time to improve their ability
 * to estimate probabilities accurately.
 *
 * Key Concept: When you say "80% confident," you should be right 80% of the time.
 * This module tracks how well-calibrated users are and provides feedback.
 *
 * @see brenner_bot-x3xg (bead)
 * @module brenner-loop/calibration
 */

// ============================================================================
// Types
// ============================================================================

/**
 * A single prediction record with stated confidence and outcome.
 */
export interface PredictionRecord {
  /** Unique identifier for this prediction */
  id: string;
  /** The hypothesis ID this prediction relates to */
  hypothesisId: string;
  /** Session ID where this prediction was made */
  sessionId: string;
  /** What was predicted (the claim) */
  prediction: string;
  /** Stated confidence when prediction was made (0-100) */
  statedConfidence: number;
  /** Whether the prediction was ultimately correct */
  outcome: "correct" | "incorrect" | "unresolved";
  /** Optional domain/category for domain-specific calibration */
  domain?: string;
  /** When the prediction was made */
  predictedAt: string;
  /** When the outcome was recorded (null if unresolved) */
  resolvedAt?: string;
  /** Optional notes about the resolution */
  notes?: string;
}

/**
 * A calibration bin groups predictions by stated confidence range.
 */
export interface CalibrationBin {
  /** Lower bound of confidence range (inclusive) */
  lowerBound: number;
  /** Upper bound of confidence range (exclusive, except for 100) */
  upperBound: number;
  /** Number of predictions in this bin */
  count: number;
  /** Number of correct predictions */
  correct: number;
  /** Actual accuracy (correct/count) */
  actualAccuracy: number;
  /** Expected accuracy (midpoint of bin) */
  expectedAccuracy: number;
  /** Calibration error for this bin (actual - expected) */
  error: number;
}

/**
 * Comprehensive calibration metrics for a set of predictions.
 */
export interface CalibrationMetrics {
  /** Total predictions analyzed (only resolved ones) */
  totalPredictions: number;
  /** Number of correct predictions */
  correctPredictions: number;
  /** Overall accuracy (correct/total) */
  overallAccuracy: number;

  /**
   * Brier Score: Mean squared error of probability estimates.
   * Lower is better. Perfect = 0, worst = 1.
   * Formula: (1/n) * Σ(forecast - outcome)²
   */
  brierScore: number;

  /**
   * Expected Calibration Error (ECE): Weighted average of per-bin calibration errors.
   * Lower is better. Perfect = 0.
   */
  calibrationError: number;

  /**
   * Systematic bias direction.
   * Positive = overconfident (predictions too high)
   * Negative = underconfident (predictions too low)
   */
  bias: number;

  /**
   * Assessment of the bias direction.
   */
  biasAssessment: "overconfident" | "underconfident" | "well_calibrated";

  /**
   * Sharpness: How much of the 0-100% range is used.
   * Measured as standard deviation of stated confidences.
   * Higher = sharper (more discriminating) predictions.
   */
  sharpness: number;

  /**
   * Calibration bins for plotting the calibration curve.
   */
  bins: CalibrationBin[];

  /**
   * Domain-specific accuracy if domains are provided.
   */
  domainAccuracy?: Record<string, { total: number; correct: number; accuracy: number }>;
}

/**
 * Feedback after resolving a prediction.
 */
export interface ResolutionFeedback {
  /** The prediction that was resolved */
  prediction: PredictionRecord;
  /** Was the prediction correct? */
  wasCorrect: boolean;
  /** Summary of the resolution */
  summary: string;
  /** How calibrated is the user at this confidence level? */
  calibrationAtThisLevel: {
    statedConfidence: number;
    actualAccuracy: number;
    sampleSize: number;
    assessment: string;
  };
  /** Advice for improving calibration */
  advice: string;
}

/**
 * Progress tracking over time.
 */
export interface CalibrationProgress {
  /** Metrics for the first half of predictions */
  early: CalibrationMetrics | null;
  /** Metrics for the second half of predictions */
  recent: CalibrationMetrics | null;
  /** Change in Brier score (negative = improvement) */
  brierScoreChange: number | null;
  /** Change in calibration error (negative = improvement) */
  calibrationErrorChange: number | null;
  /** Assessment of progress */
  assessment: "improving" | "declining" | "stable" | "insufficient_data";
  /** Human-readable summary */
  summary: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default bin boundaries for calibration curve.
 * Using 10% intervals: 0-10, 10-20, ..., 90-100
 */
export const DEFAULT_BIN_BOUNDARIES = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

/**
 * Threshold for considering calibration "good enough"
 */
export const CALIBRATION_ERROR_THRESHOLD = 0.1; // 10%

/**
 * Minimum predictions needed for meaningful statistics
 */
export const MIN_PREDICTIONS_FOR_METRICS = 10;

/**
 * Minimum predictions per bin for meaningful bin statistics
 */
export const MIN_PREDICTIONS_PER_BIN = 3;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Generate a unique prediction ID.
 */
export function generatePredictionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `PRED-${crypto.randomUUID()}`;
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const rnd = new Uint32Array(1);
    crypto.getRandomValues(rnd);
    return `PRED-${Date.now().toString(36)}-${rnd[0].toString(36).slice(0, 6)}`;
  }

  // Last resort
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `PRED-${timestamp}-${random}`;
}

/**
 * Create a new prediction record.
 */
export function createPredictionRecord(input: {
  hypothesisId: string;
  sessionId: string;
  prediction: string;
  statedConfidence: number;
  domain?: string;
}): PredictionRecord {
  if (input.statedConfidence < 0 || input.statedConfidence > 100) {
    throw new Error(`Invalid statedConfidence: must be 0-100 (got ${input.statedConfidence})`);
  }

  return {
    id: generatePredictionId(),
    hypothesisId: input.hypothesisId,
    sessionId: input.sessionId,
    prediction: input.prediction,
    statedConfidence: input.statedConfidence,
    outcome: "unresolved",
    domain: input.domain,
    predictedAt: new Date().toISOString(),
  };
}

/**
 * Resolve a prediction with an outcome.
 */
export function resolvePrediction(
  record: PredictionRecord,
  outcome: "correct" | "incorrect",
  notes?: string,
): PredictionRecord {
  return {
    ...record,
    outcome,
    resolvedAt: new Date().toISOString(),
    notes: notes ?? record.notes,
  };
}

// ============================================================================
// Calibration Calculation
// ============================================================================

/**
 * Assign predictions to calibration bins.
 */
export function binPredictions(
  predictions: PredictionRecord[],
  boundaries: number[] = DEFAULT_BIN_BOUNDARIES,
): CalibrationBin[] {
  const resolved = predictions.filter((p) => p.outcome !== "unresolved");
  const bins: CalibrationBin[] = [];

  for (let i = 0; i < boundaries.length - 1; i++) {
    const lower = boundaries[i];
    const upper = boundaries[i + 1];

    const inBin = resolved.filter((p) => {
      // Last bin includes upper bound (100)
      if (i === boundaries.length - 2) {
        return p.statedConfidence >= lower && p.statedConfidence <= upper;
      }
      return p.statedConfidence >= lower && p.statedConfidence < upper;
    });

    const correct = inBin.filter((p) => p.outcome === "correct").length;
    const count = inBin.length;
    const actualAccuracy = count > 0 ? correct / count : 0;
    const expectedAccuracy = (lower + upper) / 2 / 100; // Midpoint as expected accuracy

    bins.push({
      lowerBound: lower,
      upperBound: upper,
      count,
      correct,
      actualAccuracy,
      expectedAccuracy,
      error: count > 0 ? actualAccuracy - expectedAccuracy : 0,
    });
  }

  return bins;
}

/**
 * Calculate the Brier score for a set of predictions.
 * Lower is better. 0 = perfect, 1 = worst.
 */
export function calculateBrierScore(predictions: PredictionRecord[]): number {
  const resolved = predictions.filter((p) => p.outcome !== "unresolved");
  if (resolved.length === 0) return 0;

  const sumSquaredError = resolved.reduce((sum, p) => {
    const forecast = p.statedConfidence / 100; // Normalize to 0-1
    const outcome = p.outcome === "correct" ? 1 : 0;
    return sum + (forecast - outcome) ** 2;
  }, 0);

  return sumSquaredError / resolved.length;
}

/**
 * Calculate Expected Calibration Error (ECE).
 * Weighted average of per-bin calibration errors.
 */
export function calculateCalibrationError(bins: CalibrationBin[]): number {
  const totalCount = bins.reduce((sum, bin) => sum + bin.count, 0);
  if (totalCount === 0) return 0;

  const weightedError = bins.reduce((sum, bin) => {
    const weight = bin.count / totalCount;
    return sum + weight * Math.abs(bin.error);
  }, 0);

  return weightedError;
}

/**
 * Calculate the systematic bias direction.
 * Positive = overconfident, Negative = underconfident.
 */
export function calculateBias(predictions: PredictionRecord[]): number {
  const resolved = predictions.filter((p) => p.outcome !== "unresolved");
  if (resolved.length === 0) return 0;

  const sumBias = resolved.reduce((sum, p) => {
    const forecast = p.statedConfidence / 100;
    const outcome = p.outcome === "correct" ? 1 : 0;
    return sum + (forecast - outcome);
  }, 0);

  return sumBias / resolved.length;
}

/**
 * Calculate sharpness (standard deviation of stated confidences).
 */
export function calculateSharpness(predictions: PredictionRecord[]): number {
  if (predictions.length < 2) return 0;

  const confidences = predictions.map((p) => p.statedConfidence);
  const mean = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
  const variance = confidences.reduce((sum, c) => sum + (c - mean) ** 2, 0) / confidences.length;

  return Math.sqrt(variance);
}

/**
 * Calculate domain-specific accuracy.
 */
export function calculateDomainAccuracy(
  predictions: PredictionRecord[],
): Record<string, { total: number; correct: number; accuracy: number }> {
  const resolved = predictions.filter((p) => p.outcome !== "unresolved" && p.domain);
  const domains: Record<string, { total: number; correct: number; accuracy: number }> = {};

  for (const p of resolved) {
    if (!p.domain) continue;
    if (!domains[p.domain]) {
      domains[p.domain] = { total: 0, correct: 0, accuracy: 0 };
    }
    domains[p.domain].total++;
    if (p.outcome === "correct") {
      domains[p.domain].correct++;
    }
  }

  // Calculate accuracy for each domain
  for (const domain of Object.keys(domains)) {
    const d = domains[domain];
    d.accuracy = d.total > 0 ? d.correct / d.total : 0;
  }

  return domains;
}

/**
 * Calculate comprehensive calibration metrics.
 */
export function calculateCalibrationMetrics(
  predictions: PredictionRecord[],
  binBoundaries: number[] = DEFAULT_BIN_BOUNDARIES,
): CalibrationMetrics {
  const resolved = predictions.filter((p) => p.outcome !== "unresolved");
  const correct = resolved.filter((p) => p.outcome === "correct").length;

  const bins = binPredictions(predictions, binBoundaries);
  const brierScore = calculateBrierScore(predictions);
  const calibrationError = calculateCalibrationError(bins);
  const bias = calculateBias(predictions);
  const sharpness = calculateSharpness(predictions);
  const domainAccuracy = calculateDomainAccuracy(predictions);

  // Determine bias assessment
  let biasAssessment: "overconfident" | "underconfident" | "well_calibrated";
  if (Math.abs(bias) <= 0.05) {
    biasAssessment = "well_calibrated";
  } else if (bias > 0) {
    biasAssessment = "overconfident";
  } else {
    biasAssessment = "underconfident";
  }

  return {
    totalPredictions: resolved.length,
    correctPredictions: correct,
    overallAccuracy: resolved.length > 0 ? correct / resolved.length : 0,
    brierScore,
    calibrationError,
    bias,
    biasAssessment,
    sharpness,
    bins,
    domainAccuracy: Object.keys(domainAccuracy).length > 0 ? domainAccuracy : undefined,
  };
}

// ============================================================================
// Feedback Generation
// ============================================================================

/**
 * Get calibration data for a specific confidence level.
 */
export function getCalibrationAtConfidence(
  predictions: PredictionRecord[],
  targetConfidence: number,
  tolerance: number = 10,
): { actualAccuracy: number; sampleSize: number } {
  const lower = Math.max(0, targetConfidence - tolerance);
  const upper = Math.min(100, targetConfidence + tolerance);

  const resolved = predictions.filter(
    (p) => p.outcome !== "unresolved" && p.statedConfidence >= lower && p.statedConfidence <= upper,
  );

  const correct = resolved.filter((p) => p.outcome === "correct").length;

  return {
    actualAccuracy: resolved.length > 0 ? correct / resolved.length : targetConfidence / 100,
    sampleSize: resolved.length,
  };
}

/**
 * Generate feedback after resolving a prediction.
 */
export function generateResolutionFeedback(
  resolvedPrediction: PredictionRecord,
  allPredictions: PredictionRecord[],
): ResolutionFeedback {
  const wasCorrect = resolvedPrediction.outcome === "correct";
  const confidence = resolvedPrediction.statedConfidence;

  // Get calibration at this confidence level
  const calibrationData = getCalibrationAtConfidence(allPredictions, confidence);
  const expectedCorrectRate = confidence / 100;
  const diff = calibrationData.actualAccuracy - expectedCorrectRate;

  // Generate assessment
  let assessment: string;
  if (calibrationData.sampleSize < MIN_PREDICTIONS_PER_BIN) {
    assessment = "Not enough data yet to assess calibration at this confidence level.";
  } else if (Math.abs(diff) <= 0.1) {
    assessment = `Well-calibrated at ${confidence}% confidence.`;
  } else if (diff > 0) {
    assessment = `Underconfident at ${confidence}%: you're actually right ${(calibrationData.actualAccuracy * 100).toFixed(0)}% of the time.`;
  } else {
    assessment = `Overconfident at ${confidence}%: you're only right ${(calibrationData.actualAccuracy * 100).toFixed(0)}% of the time.`;
  }

  // Generate advice
  let advice: string;
  if (calibrationData.sampleSize < MIN_PREDICTIONS_PER_BIN) {
    advice = "Keep making predictions to build up calibration data.";
  } else if (Math.abs(diff) <= 0.1) {
    advice = "Your calibration is good at this confidence level. Keep it up!";
  } else if (diff > 0) {
    advice = `Consider being more confident in your predictions. You tend to underestimate your accuracy at this level.`;
  } else {
    advice = `Consider gathering more evidence before making high-confidence predictions. Try being less certain, or wait for more discriminative tests.`;
  }

  return {
    prediction: resolvedPrediction,
    wasCorrect,
    summary: wasCorrect
      ? `Correct! You said ${confidence}% confident and were right.`
      : `Incorrect. You said ${confidence}% confident but were wrong.`,
    calibrationAtThisLevel: {
      statedConfidence: confidence,
      actualAccuracy: calibrationData.actualAccuracy,
      sampleSize: calibrationData.sampleSize,
      assessment,
    },
    advice,
  };
}

// ============================================================================
// Progress Tracking
// ============================================================================

/**
 * Track calibration progress over time by comparing early vs recent predictions.
 */
export function trackCalibrationProgress(predictions: PredictionRecord[]): CalibrationProgress {
  const resolved = predictions
    .filter((p) => p.outcome !== "unresolved")
    .sort((a, b) => new Date(a.predictedAt).getTime() - new Date(b.predictedAt).getTime());

  if (resolved.length < MIN_PREDICTIONS_FOR_METRICS * 2) {
    return {
      early: null,
      recent: null,
      brierScoreChange: null,
      calibrationErrorChange: null,
      assessment: "insufficient_data",
      summary: `Need at least ${MIN_PREDICTIONS_FOR_METRICS * 2} resolved predictions to track progress. Currently have ${resolved.length}.`,
    };
  }

  const midpoint = Math.floor(resolved.length / 2);
  const earlyPredictions = resolved.slice(0, midpoint);
  const recentPredictions = resolved.slice(midpoint);

  const early = calculateCalibrationMetrics(earlyPredictions);
  const recent = calculateCalibrationMetrics(recentPredictions);

  const brierScoreChange = recent.brierScore - early.brierScore;
  const calibrationErrorChange = recent.calibrationError - early.calibrationError;

  // Determine assessment
  let assessment: CalibrationProgress["assessment"];
  const improvementThreshold = 0.02; // 2% improvement is meaningful

  if (brierScoreChange < -improvementThreshold || calibrationErrorChange < -improvementThreshold) {
    assessment = "improving";
  } else if (
    brierScoreChange > improvementThreshold ||
    calibrationErrorChange > improvementThreshold
  ) {
    assessment = "declining";
  } else {
    assessment = "stable";
  }

  // Generate summary
  let summary: string;
  switch (assessment) {
    case "improving":
      summary = `Your calibration is improving! Brier score decreased from ${early.brierScore.toFixed(3)} to ${recent.brierScore.toFixed(3)}.`;
      break;
    case "declining":
      summary = `Your calibration has declined slightly. Consider reviewing your recent predictions and being more careful with confidence estimates.`;
      break;
    case "stable":
      summary = `Your calibration is stable. Keep practicing to continue developing your judgment.`;
      break;
    default:
      summary = "Not enough data to assess progress.";
  }

  return {
    early,
    recent,
    brierScoreChange,
    calibrationErrorChange,
    assessment,
    summary,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format a Brier score for display.
 */
export function formatBrierScore(score: number): string {
  return score.toFixed(3);
}

/**
 * Format calibration error for display (as percentage).
 */
export function formatCalibrationError(error: number): string {
  return `${(error * 100).toFixed(1)}%`;
}

/**
 * Get a textual assessment of calibration quality.
 */
export function getCalibrationQualityAssessment(metrics: CalibrationMetrics): {
  quality: "excellent" | "good" | "fair" | "poor";
  description: string;
} {
  const { calibrationError, brierScore, totalPredictions } = metrics;

  if (totalPredictions < MIN_PREDICTIONS_FOR_METRICS) {
    return {
      quality: "fair",
      description: `Not enough predictions yet (${totalPredictions}/${MIN_PREDICTIONS_FOR_METRICS} needed for reliable assessment).`,
    };
  }

  if (calibrationError <= 0.05 && brierScore <= 0.15) {
    return {
      quality: "excellent",
      description: "Your probability estimates are highly accurate and well-calibrated.",
    };
  }

  if (calibrationError <= 0.1 && brierScore <= 0.25) {
    return {
      quality: "good",
      description: "Your calibration is solid. You have a good sense of uncertainty.",
    };
  }

  if (calibrationError <= 0.15 || brierScore <= 0.35) {
    return {
      quality: "fair",
      description:
        "Your calibration needs some work. Pay attention to the feedback after each prediction.",
    };
  }

  return {
    quality: "poor",
    description:
      "Your confidence estimates are significantly off. Consider being more humble in your predictions.",
  };
}

/**
 * Identify domains where the user is well-calibrated vs not.
 */
export function identifyCalibrationStrengths(metrics: CalibrationMetrics): {
  strengths: string[];
  weaknesses: string[];
} {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (!metrics.domainAccuracy) {
    return { strengths, weaknesses };
  }

  for (const [domain, data] of Object.entries(metrics.domainAccuracy)) {
    if (data.total < MIN_PREDICTIONS_PER_BIN) continue;

    // Classify based on accuracy thresholds
    if (data.accuracy >= 0.7) {
      strengths.push(domain);
    } else if (data.accuracy < 0.3) {
      weaknesses.push(domain);
    }
  }

  return { strengths, weaknesses };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a valid prediction outcome.
 */
export function isPredictionOutcome(value: unknown): value is PredictionRecord["outcome"] {
  return value === "correct" || value === "incorrect" || value === "unresolved";
}

/**
 * Check if a value is a valid PredictionRecord.
 */
export function isPredictionRecord(value: unknown): value is PredictionRecord {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.hypothesisId === "string" &&
    typeof v.sessionId === "string" &&
    typeof v.prediction === "string" &&
    typeof v.statedConfidence === "number" &&
    isPredictionOutcome(v.outcome) &&
    typeof v.predictedAt === "string"
  );
}
