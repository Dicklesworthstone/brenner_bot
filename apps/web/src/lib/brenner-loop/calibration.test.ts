import { describe, expect, it } from "vitest";
import {
  binPredictions,
  calculateBias,
  calculateBrierScore,
  calculateCalibrationError,
  calculateCalibrationMetrics,
  calculateDomainAccuracy,
  calculateSharpness,
  createPredictionRecord,
  DEFAULT_BIN_BOUNDARIES,
  formatBrierScore,
  formatCalibrationError,
  generatePredictionId,
  generateResolutionFeedback,
  getCalibrationAtConfidence,
  getCalibrationQualityAssessment,
  identifyCalibrationStrengths,
  isPredictionOutcome,
  isPredictionRecord,
  MIN_PREDICTIONS_FOR_METRICS,
  type PredictionRecord,
  resolvePrediction,
  trackCalibrationProgress,
} from "./calibration";

// ============================================================================
// Test Fixtures
// ============================================================================

function createResolvedPrediction(
  confidence: number,
  outcome: "correct" | "incorrect",
  overrides: Partial<PredictionRecord> = {},
): PredictionRecord {
  return {
    id: generatePredictionId(),
    hypothesisId: "hypo-1",
    sessionId: "session-1",
    prediction: "Test prediction",
    statedConfidence: confidence,
    outcome,
    predictedAt: new Date().toISOString(),
    resolvedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createPerfectlyCalibrated(count: number): PredictionRecord[] {
  const predictions: PredictionRecord[] = [];
  // Create predictions at different confidence levels with matching accuracy
  for (let conf = 10; conf <= 90; conf += 10) {
    const numAtLevel = Math.floor(count / 9);
    const correctCount = Math.round(numAtLevel * (conf / 100));
    for (let i = 0; i < correctCount; i++) {
      predictions.push(createResolvedPrediction(conf, "correct"));
    }
    for (let i = 0; i < numAtLevel - correctCount; i++) {
      predictions.push(createResolvedPrediction(conf, "incorrect"));
    }
  }
  return predictions;
}

function createOverconfidentSet(count: number): PredictionRecord[] {
  // All predictions at 90% confidence, but only 50% correct
  const predictions: PredictionRecord[] = [];
  for (let i = 0; i < count; i++) {
    predictions.push(createResolvedPrediction(90, i < count / 2 ? "correct" : "incorrect"));
  }
  return predictions;
}

function createUnderconfidentSet(count: number): PredictionRecord[] {
  // All predictions at 30% confidence, but 80% correct
  const predictions: PredictionRecord[] = [];
  for (let i = 0; i < count; i++) {
    predictions.push(createResolvedPrediction(30, i < count * 0.8 ? "correct" : "incorrect"));
  }
  return predictions;
}

// ============================================================================
// Tests: Prediction Record Creation
// ============================================================================

describe("Prediction Record Creation", () => {
  it("generates unique prediction IDs", () => {
    const id1 = generatePredictionId();
    const id2 = generatePredictionId();
    expect(id1).toMatch(/^PRED-/);
    expect(id2).toMatch(/^PRED-/);
    expect(id1).not.toBe(id2);
  });

  it("creates a prediction record with correct defaults", () => {
    const record = createPredictionRecord({
      hypothesisId: "hypo-1",
      sessionId: "session-1",
      prediction: "The experiment will succeed",
      statedConfidence: 75,
    });

    expect(record.id).toMatch(/^PRED-/);
    expect(record.hypothesisId).toBe("hypo-1");
    expect(record.sessionId).toBe("session-1");
    expect(record.prediction).toBe("The experiment will succeed");
    expect(record.statedConfidence).toBe(75);
    expect(record.outcome).toBe("unresolved");
    expect(record.predictedAt).toBeDefined();
    expect(record.resolvedAt).toBeUndefined();
  });

  it("creates a prediction record with domain", () => {
    const record = createPredictionRecord({
      hypothesisId: "hypo-1",
      sessionId: "session-1",
      prediction: "Test",
      statedConfidence: 50,
      domain: "psychology",
    });

    expect(record.domain).toBe("psychology");
  });

  it("rejects invalid confidence values", () => {
    expect(() =>
      createPredictionRecord({
        hypothesisId: "hypo-1",
        sessionId: "session-1",
        prediction: "Test",
        statedConfidence: -10,
      }),
    ).toThrow(/Invalid statedConfidence/);

    expect(() =>
      createPredictionRecord({
        hypothesisId: "hypo-1",
        sessionId: "session-1",
        prediction: "Test",
        statedConfidence: 110,
      }),
    ).toThrow(/Invalid statedConfidence/);
  });
});

describe("Prediction Resolution", () => {
  it("resolves a prediction with outcome", () => {
    const original = createPredictionRecord({
      hypothesisId: "hypo-1",
      sessionId: "session-1",
      prediction: "Test",
      statedConfidence: 75,
    });

    const resolved = resolvePrediction(original, "correct", "Experiment confirmed hypothesis");

    expect(resolved.outcome).toBe("correct");
    expect(resolved.resolvedAt).toBeDefined();
    expect(resolved.notes).toBe("Experiment confirmed hypothesis");
    // Original should be unchanged
    expect(original.outcome).toBe("unresolved");
  });
});

// ============================================================================
// Tests: Brier Score
// ============================================================================

describe("Brier Score Calculation", () => {
  it("returns 0 for empty predictions", () => {
    expect(calculateBrierScore([])).toBe(0);
  });

  it("returns 0 for perfect predictions", () => {
    const predictions = [
      createResolvedPrediction(100, "correct"),
      createResolvedPrediction(0, "incorrect"),
    ];
    expect(calculateBrierScore(predictions)).toBe(0);
  });

  it("returns 1 for worst predictions", () => {
    const predictions = [
      createResolvedPrediction(100, "incorrect"),
      createResolvedPrediction(0, "correct"),
    ];
    expect(calculateBrierScore(predictions)).toBe(1);
  });

  it("returns ~0.25 for random predictions at 50%", () => {
    const predictions = [
      createResolvedPrediction(50, "correct"),
      createResolvedPrediction(50, "incorrect"),
    ];
    expect(calculateBrierScore(predictions)).toBe(0.25);
  });

  it("ignores unresolved predictions", () => {
    const predictions: PredictionRecord[] = [
      createResolvedPrediction(100, "correct"),
      {
        id: "unresolved",
        hypothesisId: "hypo-1",
        sessionId: "session-1",
        prediction: "Test",
        statedConfidence: 0,
        outcome: "unresolved",
        predictedAt: new Date().toISOString(),
      },
    ];
    expect(calculateBrierScore(predictions)).toBe(0);
  });
});

// ============================================================================
// Tests: Calibration Binning
// ============================================================================

describe("Calibration Binning", () => {
  it("creates correct bin structure", () => {
    const bins = binPredictions([]);
    expect(bins).toHaveLength(DEFAULT_BIN_BOUNDARIES.length - 1);
    expect(bins[0].lowerBound).toBe(0);
    expect(bins[0].upperBound).toBe(10);
    expect(bins[bins.length - 1].lowerBound).toBe(90);
    expect(bins[bins.length - 1].upperBound).toBe(100);
  });

  it("assigns predictions to correct bins", () => {
    const predictions = [
      createResolvedPrediction(5, "correct"),
      createResolvedPrediction(15, "correct"),
      createResolvedPrediction(95, "incorrect"),
    ];

    const bins = binPredictions(predictions);

    expect(bins[0].count).toBe(1); // 0-10 bin
    expect(bins[1].count).toBe(1); // 10-20 bin
    expect(bins[9].count).toBe(1); // 90-100 bin
  });

  it("calculates bin accuracy correctly", () => {
    const predictions = [
      createResolvedPrediction(75, "correct"),
      createResolvedPrediction(75, "correct"),
      createResolvedPrediction(75, "incorrect"),
    ];

    const bins = binPredictions(predictions);
    const bin70to80 = bins.find((b) => b.lowerBound === 70)!;

    expect(bin70to80.count).toBe(3);
    expect(bin70to80.correct).toBe(2);
    expect(bin70to80.actualAccuracy).toBeCloseTo(0.667, 2);
    expect(bin70to80.expectedAccuracy).toBe(0.75);
  });
});

// ============================================================================
// Tests: Calibration Error
// ============================================================================

describe("Calibration Error", () => {
  it("returns 0 for empty bins", () => {
    expect(calculateCalibrationError([])).toBe(0);
  });

  it("returns low error for well-calibrated predictions", () => {
    const predictions = createPerfectlyCalibrated(90);
    const bins = binPredictions(predictions);
    const error = calculateCalibrationError(bins);
    expect(error).toBeLessThan(0.15);
  });

  it("returns high error for poorly calibrated predictions", () => {
    const predictions = createOverconfidentSet(20);
    const bins = binPredictions(predictions);
    const error = calculateCalibrationError(bins);
    expect(error).toBeGreaterThan(0.2);
  });
});

// ============================================================================
// Tests: Bias Calculation
// ============================================================================

describe("Bias Calculation", () => {
  it("returns 0 for empty predictions", () => {
    expect(calculateBias([])).toBe(0);
  });

  it("returns positive bias for overconfident predictions", () => {
    const predictions = createOverconfidentSet(20);
    const bias = calculateBias(predictions);
    expect(bias).toBeGreaterThan(0);
  });

  it("returns negative bias for underconfident predictions", () => {
    const predictions = createUnderconfidentSet(20);
    const bias = calculateBias(predictions);
    expect(bias).toBeLessThan(0);
  });

  it("returns near-zero bias for well-calibrated predictions", () => {
    const predictions = createPerfectlyCalibrated(90);
    const bias = calculateBias(predictions);
    expect(Math.abs(bias)).toBeLessThan(0.15);
  });
});

// ============================================================================
// Tests: Sharpness
// ============================================================================

describe("Sharpness Calculation", () => {
  it("returns 0 for insufficient predictions", () => {
    expect(calculateSharpness([])).toBe(0);
    expect(calculateSharpness([createResolvedPrediction(50, "correct")])).toBe(0);
  });

  it("returns 0 for all same confidence", () => {
    const predictions = [
      createResolvedPrediction(50, "correct"),
      createResolvedPrediction(50, "incorrect"),
      createResolvedPrediction(50, "correct"),
    ];
    expect(calculateSharpness(predictions)).toBe(0);
  });

  it("returns high value for varied confidences", () => {
    const predictions = [
      createResolvedPrediction(10, "incorrect"),
      createResolvedPrediction(90, "correct"),
    ];
    const sharpness = calculateSharpness(predictions);
    expect(sharpness).toBeGreaterThan(30);
  });
});

// ============================================================================
// Tests: Domain Accuracy
// ============================================================================

describe("Domain Accuracy", () => {
  it("returns empty for predictions without domains", () => {
    const predictions = [createResolvedPrediction(50, "correct")];
    const domainAccuracy = calculateDomainAccuracy(predictions);
    expect(Object.keys(domainAccuracy)).toHaveLength(0);
  });

  it("calculates domain-specific accuracy", () => {
    const predictions = [
      createResolvedPrediction(50, "correct", { domain: "psychology" }),
      createResolvedPrediction(50, "correct", { domain: "psychology" }),
      createResolvedPrediction(50, "incorrect", { domain: "psychology" }),
      createResolvedPrediction(50, "incorrect", { domain: "biology" }),
      createResolvedPrediction(50, "incorrect", { domain: "biology" }),
    ];

    const domainAccuracy = calculateDomainAccuracy(predictions);

    expect(domainAccuracy.psychology.total).toBe(3);
    expect(domainAccuracy.psychology.correct).toBe(2);
    expect(domainAccuracy.psychology.accuracy).toBeCloseTo(0.667, 2);

    expect(domainAccuracy.biology.total).toBe(2);
    expect(domainAccuracy.biology.correct).toBe(0);
    expect(domainAccuracy.biology.accuracy).toBe(0);
  });
});

// ============================================================================
// Tests: Comprehensive Metrics
// ============================================================================

describe("Comprehensive Calibration Metrics", () => {
  it("calculates all metrics correctly", () => {
    const predictions = createPerfectlyCalibrated(90);
    const metrics = calculateCalibrationMetrics(predictions);

    expect(metrics.totalPredictions).toBeGreaterThan(0);
    expect(metrics.overallAccuracy).toBeGreaterThan(0);
    expect(metrics.brierScore).toBeDefined();
    expect(metrics.calibrationError).toBeDefined();
    expect(metrics.bias).toBeDefined();
    expect(metrics.sharpness).toBeDefined();
    expect(metrics.bins).toHaveLength(DEFAULT_BIN_BOUNDARIES.length - 1);
  });

  it("correctly assesses overconfidence", () => {
    const predictions = createOverconfidentSet(20);
    const metrics = calculateCalibrationMetrics(predictions);
    expect(metrics.biasAssessment).toBe("overconfident");
  });

  it("correctly assesses underconfidence", () => {
    const predictions = createUnderconfidentSet(20);
    const metrics = calculateCalibrationMetrics(predictions);
    expect(metrics.biasAssessment).toBe("underconfident");
  });
});

// ============================================================================
// Tests: Feedback Generation
// ============================================================================

describe("Resolution Feedback", () => {
  it("generates feedback for correct prediction", () => {
    const allPredictions = [
      createResolvedPrediction(80, "correct"),
      createResolvedPrediction(80, "correct"),
      createResolvedPrediction(80, "incorrect"),
    ];
    const resolved = allPredictions[0];

    const feedback = generateResolutionFeedback(resolved, allPredictions);

    expect(feedback.wasCorrect).toBe(true);
    expect(feedback.summary).toContain("Correct");
    expect(feedback.calibrationAtThisLevel.statedConfidence).toBe(80);
    expect(feedback.advice).toBeDefined();
  });

  it("generates feedback for incorrect prediction", () => {
    const resolved = createResolvedPrediction(90, "incorrect");
    const allPredictions = [resolved, createResolvedPrediction(90, "incorrect")];

    const feedback = generateResolutionFeedback(resolved, allPredictions);

    expect(feedback.wasCorrect).toBe(false);
    expect(feedback.summary).toContain("Incorrect");
  });

  it("provides appropriate advice for overconfidence", () => {
    const predictions = createOverconfidentSet(20);
    const resolved = predictions[10];

    const feedback = generateResolutionFeedback(resolved, predictions);

    expect(feedback.calibrationAtThisLevel.assessment).toContain("Overconfident");
    expect(feedback.advice).toContain("less certain");
  });
});

// ============================================================================
// Tests: Calibration at Confidence Level
// ============================================================================

describe("Calibration at Confidence Level", () => {
  it("returns target confidence for no data", () => {
    const result = getCalibrationAtConfidence([], 80);
    expect(result.actualAccuracy).toBe(0.8);
    expect(result.sampleSize).toBe(0);
  });

  it("calculates accuracy within tolerance", () => {
    const predictions = [
      createResolvedPrediction(78, "correct"),
      createResolvedPrediction(82, "correct"),
      createResolvedPrediction(80, "incorrect"),
    ];

    const result = getCalibrationAtConfidence(predictions, 80, 5);

    expect(result.sampleSize).toBe(3);
    expect(result.actualAccuracy).toBeCloseTo(0.667, 2);
  });
});

// ============================================================================
// Tests: Progress Tracking
// ============================================================================

describe("Calibration Progress Tracking", () => {
  it("returns insufficient data for small sets", () => {
    const predictions = createPerfectlyCalibrated(10);
    const progress = trackCalibrationProgress(predictions);

    expect(progress.assessment).toBe("insufficient_data");
    expect(progress.early).toBeNull();
    expect(progress.recent).toBeNull();
  });

  it("tracks improvement over time", () => {
    // Need MIN_PREDICTIONS_FOR_METRICS * 2 total resolved predictions
    // Early predictions: overconfident (more than minimum needed)
    const earlyPredictions = createOverconfidentSet(MIN_PREDICTIONS_FOR_METRICS + 5);
    earlyPredictions.forEach((p, i) => {
      p.predictedAt = new Date(Date.now() - 1000000 + i).toISOString();
    });

    // Recent predictions: also create enough
    const recentPredictions: PredictionRecord[] = [];
    for (let i = 0; i < MIN_PREDICTIONS_FOR_METRICS + 5; i++) {
      recentPredictions.push(
        createResolvedPrediction(
          50,
          i < (MIN_PREDICTIONS_FOR_METRICS + 5) / 2 ? "correct" : "incorrect",
        ),
      );
    }
    recentPredictions.forEach((p, i) => {
      p.predictedAt = new Date(Date.now() + i).toISOString();
    });

    const allPredictions = [...earlyPredictions, ...recentPredictions];
    const progress = trackCalibrationProgress(allPredictions);

    expect(progress.early).not.toBeNull();
    expect(progress.recent).not.toBeNull();
    expect(progress.brierScoreChange).not.toBeNull();
  });
});

// ============================================================================
// Tests: Quality Assessment
// ============================================================================

describe("Calibration Quality Assessment", () => {
  it("identifies excellent calibration", () => {
    const predictions = createPerfectlyCalibrated(50);
    const metrics = calculateCalibrationMetrics(predictions);
    const assessment = getCalibrationQualityAssessment(metrics);

    expect(["excellent", "good"]).toContain(assessment.quality);
  });

  it("identifies poor calibration", () => {
    // Create very overconfident predictions
    const predictions = Array(20)
      .fill(null)
      .map(() => createResolvedPrediction(95, "incorrect"));
    const metrics = calculateCalibrationMetrics(predictions);
    const assessment = getCalibrationQualityAssessment(metrics);

    expect(assessment.quality).toBe("poor");
  });

  it("handles insufficient data gracefully", () => {
    const predictions = [createResolvedPrediction(50, "correct")];
    const metrics = calculateCalibrationMetrics(predictions);
    const assessment = getCalibrationQualityAssessment(metrics);

    expect(assessment.quality).toBe("fair");
    expect(assessment.description).toContain("Not enough predictions");
  });
});

// ============================================================================
// Tests: Utility Functions
// ============================================================================

describe("Formatting Functions", () => {
  it("formats Brier score correctly", () => {
    expect(formatBrierScore(0.123456)).toBe("0.123");
    expect(formatBrierScore(0)).toBe("0.000");
  });

  it("formats calibration error as percentage", () => {
    expect(formatCalibrationError(0.15)).toBe("15.0%");
    expect(formatCalibrationError(0.052)).toBe("5.2%");
  });
});

describe("Calibration Strengths Identification", () => {
  it("identifies domain strengths and weaknesses", () => {
    const predictions = [
      // Strong in psychology (90% accuracy)
      ...Array(10)
        .fill(null)
        .map((_, i) =>
          createResolvedPrediction(50, i < 9 ? "correct" : "incorrect", {
            domain: "psychology",
          }),
        ),
      // Weak in economics (20% accuracy)
      ...Array(10)
        .fill(null)
        .map((_, i) =>
          createResolvedPrediction(50, i < 2 ? "correct" : "incorrect", {
            domain: "economics",
          }),
        ),
    ];

    const metrics = calculateCalibrationMetrics(predictions);
    const { strengths, weaknesses } = identifyCalibrationStrengths(metrics);

    expect(strengths).toContain("psychology");
    expect(weaknesses).toContain("economics");
  });
});

// ============================================================================
// Tests: Type Guards
// ============================================================================

describe("Type Guards", () => {
  it("validates prediction outcomes", () => {
    expect(isPredictionOutcome("correct")).toBe(true);
    expect(isPredictionOutcome("incorrect")).toBe(true);
    expect(isPredictionOutcome("unresolved")).toBe(true);
    expect(isPredictionOutcome("invalid")).toBe(false);
    expect(isPredictionOutcome(null)).toBe(false);
  });

  it("validates prediction records", () => {
    const validRecord = createResolvedPrediction(50, "correct");
    expect(isPredictionRecord(validRecord)).toBe(true);

    expect(isPredictionRecord(null)).toBe(false);
    expect(isPredictionRecord({})).toBe(false);
    expect(isPredictionRecord({ id: "test" })).toBe(false);
  });
});
