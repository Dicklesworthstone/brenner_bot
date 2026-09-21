import { z } from "zod";

/**
 * Prediction Registry Schema
 *
 * Predictions are first-class entities that sit between hypotheses and tests.
 * A Prediction states: "Under condition X, H1 predicts Y, H2 predicts Z"
 * A Test executes the condition and observes the result.
 *
 * This separation matters because:
 * - Multiple tests might address the same prediction
 * - A prediction might be tested multiple times with different methods
 * - Predictions can be formulated before tests are designed
 *
 * @see specs/artifact_schema_v0.1.md - Section 3: Predictions Table
 * @see brenner_bot-m6yw (bead)
 */

// ============================================================================
// ID Patterns
// ============================================================================

/**
 * Prediction ID format: P-{session_id}-{sequence}
 * @example "P-RS20251230-001"
 */
const predictionIdPattern = /^P-[A-Za-z0-9][\w-]*-\d{3}$/;

/**
 * Hypothesis ID format (for references)
 */
const hypothesisIdPattern = /^H-[A-Za-z0-9][\w-]*-\d{3}$/;

/**
 * Test ID format (for references)
 */
const testIdPattern = /^T-[A-Za-z0-9][\w-]*-\d{3}$/;

/**
 * Transcript anchor format
 */
const anchorPattern = /^§\d+(-\d+)?$/;

// ============================================================================
// Sub-Schemas
// ============================================================================

/**
 * What a specific hypothesis predicts for this condition.
 */
export const HypothesisPredictionSchema = z.object({
  /** Reference to hypothesis */
  hypothesisId: z.string().regex(hypothesisIdPattern, "Invalid hypothesis ID format"),

  /** What this hypothesis predicts will happen */
  prediction: z.string().min(5, "Prediction must be at least 5 characters"),

  /** Why does this hypothesis make this prediction? */
  rationale: z.string().optional(),

  /** Is this prediction qualitative or quantitative? */
  type: z.enum(["qualitative", "quantitative"]).optional(),

  /** For quantitative predictions: expected value or range */
  expectedValue: z.string().optional(),
});

export type HypothesisPrediction = z.infer<typeof HypothesisPredictionSchema>;

/**
 * Prediction status tracking
 */
export const PredictionStatusSchema = z.enum([
  "untested", // No test has been run yet
  "pending", // Test is in progress
  "confirmed", // Test matched one hypothesis's prediction
  "inconclusive", // Test was ambiguous
  "invalidated", // Prediction was based on false assumption
]);

export type PredictionStatus = z.infer<typeof PredictionStatusSchema>;

// ============================================================================
// Main Schema
// ============================================================================

/**
 * A Prediction captures what different hypotheses would expect
 * to observe under specific conditions.
 *
 * From artifact schema Section 3 (Predictions Table):
 * "Each row maps a condition to per-hypothesis predictions"
 */
export const PredictionSchema = z.object({
  // === IDENTITY ===

  /**
   * Stable ID format: P-{session_id}-{sequence}
   * @example "P-RS20251230-001"
   */
  id: z.string().regex(predictionIdPattern, "Invalid prediction ID format"),

  /**
   * Short name for the prediction (for display)
   */
  name: z.string().min(3).max(100).optional(),

  // === THE PREDICTION ===

  /**
   * The observable condition under which predictions differ.
   * This should be specific enough to design a test.
   * @example "In zebrafish embryos with ectopic Wnt expression"
   */
  condition: z.string().min(10, "Condition must be at least 10 characters"),

  /**
   * What each hypothesis predicts will happen under this condition.
   * Must have at least 2 entries to be discriminative.
   */
  hypothesisPredictions: z
    .array(HypothesisPredictionSchema)
    .min(2, "Prediction must discriminate at least 2 hypotheses"),

  // === DISCRIMINATIVE POWER ===

  /**
   * Are the predictions different enough to discriminate?
   * true = clearly different outcomes
   * false = similar or overlapping predictions
   */
  isDiscriminative: z.boolean().default(true),

  /**
   * Estimated discriminative power (0-3)
   * 0 = predictions are the same
   * 1 = weak difference (2:1 likelihood ratio)
   * 2 = moderate difference (10:1)
   * 3 = strong difference (100:1+, digital)
   */
  discriminativePower: z.number().min(0).max(3).optional(),

  /**
   * Notes on why predictions differ (or don't)
   */
  discriminationNotes: z.string().optional(),

  // === RELATIONSHIPS ===

  /**
   * Session where this prediction was formulated
   */
  sessionId: z.string().min(1, "Session ID is required"),

  /**
   * Which tests address this prediction?
   * Tests are linked here when they're designed to evaluate this prediction.
   */
  linkedTests: z.array(z.string().regex(testIdPattern, "Invalid test ID format")).optional(),

  // === PROVENANCE ===

  /**
   * §n transcript anchors supporting this prediction
   */
  anchors: z.array(z.string().regex(anchorPattern, "Invalid anchor format")).optional(),

  /**
   * Is this prediction derived from inference vs transcript?
   */
  isInference: z.boolean().default(false),

  /**
   * Who formulated this prediction?
   */
  proposedBy: z.string().optional(),

  // === STATUS ===

  /**
   * Current status of the prediction
   */
  status: PredictionStatusSchema.default("untested"),

  /**
   * If confirmed: which hypothesis's prediction matched?
   * Should reference a hypothesis from hypothesisPredictions.
   */
  confirmedHypothesisId: z
    .string()
    .regex(hypothesisIdPattern, "Invalid hypothesis ID format")
    .optional(),

  /**
   * If inconclusive or invalidated: why?
   */
  statusReason: z.string().optional(),

  // === TIMESTAMPS ===

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  // === METADATA ===

  tags: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),
});

export type Prediction = z.infer<typeof PredictionSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if a prediction is actually discriminative.
 * Returns issues if predictions are too similar.
 */
export function validateDiscriminativePower(prediction: Prediction): {
  isDiscriminative: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const predictions = prediction.hypothesisPredictions;

  if (predictions.length < 2) {
    issues.push("Must have at least 2 hypothesis predictions to be discriminative");
    return { isDiscriminative: false, issues };
  }

  // Check for identical predictions
  const predictionTexts = predictions.map((p) => p.prediction.toLowerCase().trim());
  const uniquePredictions = new Set(predictionTexts);

  if (uniquePredictions.size < predictions.length) {
    issues.push("Some hypotheses have identical predictions - not discriminative");
    return { isDiscriminative: false, issues };
  }

  // Check for vague predictions
  const vaguePhrases = ["might", "could", "possibly", "maybe", "some effect", "changes"];
  for (const hp of predictions) {
    for (const phrase of vaguePhrases) {
      if (hp.prediction.toLowerCase().includes(phrase)) {
        issues.push(`Prediction for ${hp.hypothesisId} uses vague language: "${phrase}"`);
      }
    }
  }

  return {
    isDiscriminative: issues.length === 0,
    issues,
  };
}

/**
 * Estimate discriminative power from prediction text.
 * This is heuristic; actual power depends on the test design.
 */
export function estimateDiscriminativePower(prediction: Prediction): number {
  const predictions = prediction.hypothesisPredictions;

  if (predictions.length < 2) return 0;

  // Binary opposite pairs for detection
  const binaryOppositePairs: [string, string][] = [
    ["present", "absent"],
    ["alive", "dead"],
    ["positive", "negative"],
    ["yes", "no"],
    ["increase", "decrease"],
    ["higher", "lower"],
    ["active", "inactive"],
  ];

  // Check for binary/digital predictions (high power)
  let hasBinaryOpposites = false;
  for (let i = 0; i < predictions.length; i++) {
    for (let j = i + 1; j < predictions.length; j++) {
      const p1 = predictions[i].prediction.toLowerCase();
      const p2 = predictions[j].prediction.toLowerCase();

      // Check each opposite pair
      for (const [term1, term2] of binaryOppositePairs) {
        if (
          (p1.includes(term1) && p2.includes(term2)) ||
          (p1.includes(term2) && p2.includes(term1))
        ) {
          hasBinaryOpposites = true;
          break;
        }
      }
      if (hasBinaryOpposites) break;
    }
    if (hasBinaryOpposites) break;
  }

  if (hasBinaryOpposites) return 3;

  // Check for quantitative differences (moderate power)
  const quantIndicators = ["increase", "decrease", "higher", "lower", ">", "<", "%"];
  let hasQuantitative = false;
  for (const hp of predictions) {
    if (quantIndicators.some((q) => hp.prediction.toLowerCase().includes(q))) {
      hasQuantitative = true;
      break;
    }
  }

  if (hasQuantitative) return 2;

  // Default: qualitative difference (low power)
  return 1;
}

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate a new prediction ID for a session.
 */
export function generatePredictionId(sessionId: string, existingIds: string[]): string {
  const prefix = `P-${sessionId}-`;
  const sequences = existingIds
    .filter((id) => id.startsWith(prefix))
    .map((id) => {
      const match = id.match(/-(\d{3})$/);
      return match ? parseInt(match[1], 10) : 0;
    });

  const nextSeq = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
  return `${prefix}${nextSeq.toString().padStart(3, "0")}`;
}

/**
 * Type guard for prediction ID format
 */
export function isValidPredictionId(id: string): boolean {
  return predictionIdPattern.test(id);
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new prediction with required fields and sensible defaults.
 */
export function createPrediction(input: {
  id: string;
  condition: string;
  hypothesisPredictions: HypothesisPrediction[];
  sessionId: string;
  name?: string;
  proposedBy?: string;
  anchors?: string[];
  isInference?: boolean;
}): Prediction {
  const now = new Date().toISOString();
  return PredictionSchema.parse({
    id: input.id,
    name: input.name,
    condition: input.condition,
    hypothesisPredictions: input.hypothesisPredictions,
    sessionId: input.sessionId,
    proposedBy: input.proposedBy,
    anchors: input.anchors,
    isInference: input.isInference ?? false,
    isDiscriminative: true,
    status: "untested",
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Create a binary prediction (yes/no, present/absent).
 * These are preferred for high discriminative power.
 *
 * @throws Error if both hypotheses predict the same outcome (not discriminative)
 */
export function createBinaryPrediction(input: {
  id: string;
  condition: string;
  hypothesis1: { id: string; predictsPositive: boolean; rationale?: string };
  hypothesis2: { id: string; predictsPositive: boolean; rationale?: string };
  sessionId: string;
  name?: string;
  proposedBy?: string;
}): Prediction {
  // Validate that hypotheses predict different outcomes
  if (input.hypothesis1.predictsPositive === input.hypothesis2.predictsPositive) {
    throw new Error(
      `Binary prediction is not discriminative: both hypotheses predict ${
        input.hypothesis1.predictsPositive ? "positive" : "negative"
      }. For a discriminative prediction, hypotheses must predict different outcomes.`,
    );
  }

  const h1Prediction = input.hypothesis1.predictsPositive
    ? "Effect present / positive result"
    : "No effect / negative result";
  const h2Prediction = input.hypothesis2.predictsPositive
    ? "Effect present / positive result"
    : "No effect / negative result";

  return createPrediction({
    id: input.id,
    name: input.name,
    condition: input.condition,
    hypothesisPredictions: [
      {
        hypothesisId: input.hypothesis1.id,
        prediction: h1Prediction,
        rationale: input.hypothesis1.rationale,
        type: "qualitative",
      },
      {
        hypothesisId: input.hypothesis2.id,
        prediction: h2Prediction,
        rationale: input.hypothesis2.rationale,
        type: "qualitative",
      },
    ],
    sessionId: input.sessionId,
    proposedBy: input.proposedBy,
  });
}
