import { z } from "zod";

/**
 * Test Record Schema
 *
 * Tests are the experimental procedures that evaluate predictions.
 * A Test executes the condition from a Prediction and observes the result.
 *
 * CRITICAL: Every test MUST have a potency check. Without one,
 * a negative result is uninterpretable ("was the assay broken?").
 *
 * @see specs/artifact_schema_v0.1.md - Section 4: Discriminative Tests
 * @see specs/evaluation_rubric_v0.1.md - Criteria 7, 8, 9, 10
 * @see brenner_bot-m6yw (bead)
 */

// ============================================================================
// ID Patterns
// ============================================================================

const testIdPattern = /^T-[A-Za-z0-9][\w.-]*-\d{3}$|^T\d+$/;
const hypothesisIdPattern = /^H-[A-Za-z0-9][\w.-]*-\d{3}$|^H\d+$/;
const predictionIdPattern = /^P-[A-Za-z0-9][\w.-]*-\d{3}$|^P\d+$/;
const assumptionIdPattern = /^A-[A-Za-z0-9][\w.-]*-\d{3}$|^A\d+$/;
const anchorPattern = /^§\d+(-\d+)?$/;

// ============================================================================
// Potency Check Schema
// ============================================================================

/**
 * A potency check distinguishes "no effect" from "assay failed".
 *
 * From evaluation rubric "Potency Check Sufficiency" (0-3):
 * - 0: No potency check included → AUTOMATIC FAILURE
 * - 1: Potency check mentioned but would not detect assay failure
 * - 2: Adequate potency check with minor gaps
 * - 3: Complete: positive control, sensitivity verification, timing validation
 *
 * This is MANDATORY for all tests.
 */
export const PotencyCheckSchema = z.object({
  /**
   * Positive control that would show the effect if present.
   * "What would I see if this were working?"
   * @example "Include wells with known activator as positive control"
   */
  positiveControl: z.string().max(2000),

  /**
   * How do we verify detection threshold is adequate?
   * "Can I detect the expected signal strength?"
   * @example "Titration series confirms detection down to 1nM"
   */
  sensitivityVerification: z.string().optional(),

  /**
   * How do we know the assay window is correct?
   * "Am I measuring at the right time?"
   * @example "Time course shows peak response at 24h"
   */
  timingValidation: z.string().optional(),

  /**
   * Overall potency score (0-3).
   * Computed from the components above.
   */
  score: z.number().min(0).max(3).optional(),
});

export type PotencyCheck = z.infer<typeof PotencyCheckSchema>;

/**
 * Calculate potency check score from components.
 */
export function calculatePotencyScore(check: PotencyCheck): number {
  let score = 0;

  // Positive control is required (1 point if present)
  if (check.positiveControl.trim().length >= 10) {
    score += 1;
  }

  // Sensitivity verification (1 point)
  if ((check.sensitivityVerification ?? "").trim().length >= 10) {
    score += 1;
  }

  // Timing validation (1 point)
  if ((check.timingValidation ?? "").trim().length >= 10) {
    score += 1;
  }

  return score;
}

// ============================================================================
// Evidence-Per-Week Score
// ============================================================================

/**
 * The 4-dimension scoring system for test quality.
 *
 * From artifact schema: tests have a 12-point score across 4 dimensions.
 * Higher is better for all dimensions.
 */
export const EvidencePerWeekScoreSchema = z.object({
  /**
   * How discriminative is the test? (Likelihood ratio)
   * 0 = <2:1 (barely discriminative)
   * 1 = 2:1 to 10:1 (weak)
   * 2 = 10:1 to 100:1 (good)
   * 3 = >100:1 (digital/binary, excellent)
   */
  likelihoodRatio: z.number().min(0).max(3),

  /**
   * How expensive is the test?
   * 0 = >$100K
   * 1 = $10K-$100K
   * 2 = $1K-$10K
   * 3 = <$1K
   */
  cost: z.number().min(0).max(3),

  /**
   * How fast can we get results?
   * 0 = >1 year
   * 1 = 1-6 months
   * 2 = 1 week - 1 month
   * 3 = <1 week
   */
  speed: z.number().min(0).max(3),

  /**
   * How clear is the readout?
   * 0 = Many confounds, interpretation required
   * 1 = Some confounds
   * 2 = Mostly clear
   * 3 = Digital readout (yes/no, present/absent)
   */
  ambiguity: z.number().min(0).max(3),
});

export type EvidencePerWeekScore = z.infer<typeof EvidencePerWeekScoreSchema>;

/**
 * Calculate total score (0-12)
 */
export function calculateTotalScore(score: EvidencePerWeekScore): number {
  return score.likelihoodRatio + score.cost + score.speed + score.ambiguity;
}

/**
 * Check if scores look inflated (all 3s is suspicious).
 * From evaluation rubric "Score Calibration Honesty" (0-2)
 */
export function detectInflatedScores(score: EvidencePerWeekScore): {
  inflated: boolean;
  message: string;
} {
  const total = calculateTotalScore(score);

  if (total === 12) {
    return {
      inflated: true,
      message: "All scores are maximum (12/12). This is suspicious - real tests have trade-offs.",
    };
  }

  if (total >= 11) {
    return {
      inflated: true,
      message: "Scores are very high (11+/12). Consider if this is realistic or optimistic.",
    };
  }

  // Check if any dimension seems unrealistic
  if (score.cost === 3 && score.speed === 3) {
    return {
      inflated: true,
      message: "Cheap AND fast is rare. Verify these scores are accurate.",
    };
  }

  return { inflated: false, message: "" };
}

// ============================================================================
// Object Transposition
// ============================================================================

/**
 * Object transposition tracking.
 *
 * From evaluation rubric "Object Transposition Considered" (0-2):
 * - 0: Experimental object treated as given, not designed
 * - 1: Brief mention of alternative systems
 * - 2: Explicit reasoning with cost/benefit
 *
 * This asks: "Could we do this test in a different system?"
 */
export const ObjectTranspositionSchema = z.object({
  /**
   * Was object transposition considered?
   */
  considered: z.boolean(),

  /**
   * Alternative experimental systems considered
   */
  alternatives: z
    .array(
      z.object({
        /** The alternative system (organism, cell line, etc.) */
        system: z.string(),
        /** Advantages of this system */
        pros: z.string(),
        /** Disadvantages of this system */
        cons: z.string(),
      }),
    )
    .optional(),

  /**
   * Why was the chosen system selected?
   */
  chosenRationale: z.string().optional(),
});

export type ObjectTransposition = z.infer<typeof ObjectTranspositionSchema>;

// ============================================================================
// Test Feasibility
// ============================================================================

export const TestFeasibilitySchema = z.object({
  /**
   * What's required to run this test?
   */
  requirements: z.string(),

  /**
   * How difficult is this test?
   */
  difficulty: z.enum(["easy", "moderate", "hard", "very_hard"]),

  /**
   * What would block this test?
   */
  blockers: z.array(z.string()).optional(),

  /**
   * Estimated time to complete
   */
  estimatedDuration: z.string().optional(),

  /**
   * Estimated cost
   */
  estimatedCost: z.string().optional(),
});

export type TestFeasibility = z.infer<typeof TestFeasibilitySchema>;

// ============================================================================
// Expected Outcome
// ============================================================================

export const ExpectedOutcomeSchema = z.object({
  /** Which hypothesis is this outcome for */
  hypothesisId: z.string().regex(hypothesisIdPattern, "Invalid hypothesis ID"),

  /** What would we observe if this hypothesis is true? */
  outcome: z.string().min(5),

  /** Is this a positive or negative result? */
  resultType: z.enum(["positive", "negative", "neutral"]).optional(),

  /** Confidence in this prediction */
  confidence: z.enum(["high", "medium", "low"]).optional(),
});

export type ExpectedOutcome = z.infer<typeof ExpectedOutcomeSchema>;

// ============================================================================
// Test Execution Record
// ============================================================================

/**
 * Record of a test that has been executed.
 */
export const TestExecutionSchema = z.object({
  /** When was the test started? */
  startedAt: z.string().datetime(),

  /** When was the test completed? */
  completedAt: z.string().datetime().optional(),

  /** Who ran the test? */
  executedBy: z.string().optional(),

  /** What was observed? */
  observedOutcome: z.string(),

  /** Did potency checks pass? */
  potencyCheckPassed: z.boolean(),

  /** Notes on potency check results */
  potencyCheckNotes: z.string().optional(),

  /** Raw data reference (file path, URL, etc.) */
  rawDataRef: z.string().optional(),

  /** Which hypothesis's prediction was matched? */
  matchedHypothesisId: z
    .string()
    .regex(/^H-[A-Za-z0-9][\w-]*-\d{3}$/, "Invalid hypothesis ID format")
    .optional(),

  /** Execution notes */
  notes: z.string().optional(),

  /** Any unexpected observations */
  unexpectedObservations: z.array(z.string()).optional(),
});

export type TestExecution = z.infer<typeof TestExecutionSchema>;

// ============================================================================
// Test Status
// ============================================================================

export const TestStatusSchema = z.enum([
  "designed", // Test has been designed but not started
  "ready", // Test is ready to run (all requirements met)
  "in_progress", // Test is currently being executed
  "completed", // Test has been completed with results
  "blocked", // Test cannot proceed (missing requirements)
  "abandoned", // Test was abandoned (no longer relevant)
]);

export type TestStatus = z.infer<typeof TestStatusSchema>;

// ============================================================================
// Main Test Schema
// ============================================================================

/**
 * A Test is an experimental procedure designed to evaluate predictions
 * and discriminate between hypotheses.
 *
 * CRITICAL REQUIREMENTS:
 * 1. Must discriminate at least 2 hypotheses
 * 2. MUST have a potency check (automatic failure without one)
 * 3. Should have evidence-per-week scoring
 */
export const TestRecordSchema = z.object({
  // === IDENTITY ===

  /**
   * Stable ID format: T-{session_id}-{sequence}
   * @example "T-RS20251230-001"
   */
  id: z.string().regex(testIdPattern, "Invalid test ID format"),

  /**
   * Human-readable test name
   */
  name: z.string().min(5).max(200),

  // === THE TEST ===

  /**
   * Full procedure description.
   * Should be detailed enough to reproduce.
   */
  procedure: z.string().min(20, "Procedure must be at least 20 characters"),

  /**
   * Which hypotheses does this test discriminate?
   * Must have at least 2.
   */
  discriminates: z
    .array(z.string().regex(hypothesisIdPattern, "Invalid hypothesis ID"))
    .min(2, "Test must discriminate at least 2 hypotheses"),

  /**
   * Expected outcomes for each hypothesis.
   * What would we observe if each hypothesis is true?
   */
  expectedOutcomes: z.array(ExpectedOutcomeSchema).min(2),

  /**
   * Which predictions does this test address?
   */
  addressesPredictions: z
    .array(z.string().regex(predictionIdPattern, "Invalid prediction ID"))
    .optional(),

  // === POTENCY CHECK (MANDATORY) ===

  /**
   * Potency check is REQUIRED.
   * Without it, negative results are uninterpretable.
   */
  potencyCheck: PotencyCheckSchema,

  // === SCORING ===

  /**
   * 4-dimension evidence-per-week scoring
   */
  evidencePerWeekScore: EvidencePerWeekScoreSchema,

  // === OBJECT TRANSPOSITION ===

  /**
   * Was alternative experimental system considered?
   */
  objectTransposition: ObjectTranspositionSchema.optional(),

  // === FEASIBILITY ===

  /**
   * Feasibility assessment
   */
  feasibility: TestFeasibilitySchema,

  // === ASSUMPTIONS ===

  /**
   * Which assumptions must hold for this test to be valid?
   */
  requiredAssumptions: z
    .array(z.string().regex(assumptionIdPattern, "Invalid assumption ID"))
    .optional(),

  // === SESSION & STATUS ===

  /**
   * Session where this test was designed
   */
  designedInSession: z.string(),

  /**
   * Who designed this test?
   */
  designedBy: z.string().optional(),

  /**
   * Current test status
   */
  status: TestStatusSchema.default("designed"),

  /**
   * If completed, the execution record
   */
  execution: TestExecutionSchema.optional(),

  // === PROVENANCE ===

  /**
   * §n transcript anchors
   */
  anchors: z.array(z.string().regex(anchorPattern)).optional(),

  // === TIMESTAMPS ===

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  // === METADATA ===

  tags: z.array(z.string()).optional(),
  notes: z.string().max(2000).optional(),

  /**
   * Priority/ranking among tests (lower = higher priority)
   */
  priority: z.number().int().optional(),
});

export type TestRecord = z.infer<typeof TestRecordSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate test discriminative power.
 * From evaluation rubric "Discriminative Power" (0-3)
 */
export function validateDiscriminativePower(test: TestRecord): {
  valid: boolean;
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 0;

  // Check basic requirements
  if (test.discriminates.length < 2) {
    issues.push("Test must discriminate at least 2 hypotheses");
    return { valid: false, score: 0, issues };
  }

  if (test.expectedOutcomes.length < 2) {
    issues.push("Test must have expected outcomes for at least 2 hypotheses");
    return { valid: false, score: 0, issues };
  }

  // Check that discriminated hypotheses have outcomes
  const outcomesMap = new Map(test.expectedOutcomes.map((o) => [o.hypothesisId, o]));
  for (const hId of test.discriminates) {
    if (!outcomesMap.has(hId)) {
      issues.push(`Missing expected outcome for hypothesis ${hId}`);
    }
  }

  if (issues.length > 0) {
    return { valid: false, score: 0, issues };
  }

  // Check for identical outcomes (not discriminative)
  const outcomes = test.expectedOutcomes.map((o) => o.outcome.toLowerCase().trim());
  const uniqueOutcomes = new Set(outcomes);
  if (uniqueOutcomes.size === 1) {
    issues.push("All expected outcomes are the same - test is not discriminative");
    return { valid: false, score: 0, issues };
  }

  // Score based on outcome clarity
  const hasBinaryOutcome = test.expectedOutcomes.some(
    (o) =>
      o.resultType === "positive" ||
      o.resultType === "negative" ||
      /present|absent|yes|no/i.test(o.outcome),
  );

  if (hasBinaryOutcome && uniqueOutcomes.size === test.expectedOutcomes.length) {
    score = 3; // Digital discrimination
  } else if (uniqueOutcomes.size === test.expectedOutcomes.length) {
    score = 2; // Clear different predictions
  } else {
    score = 1; // Weak discrimination
  }

  return { valid: true, score, issues };
}

/**
 * Validate potency check sufficiency.
 * From evaluation rubric "Potency Check Sufficiency" (0-3)
 *
 * AUTOMATIC FAILURE if no potency check!
 */
export function validatePotencyCheck(test: TestRecord): {
  valid: boolean;
  score: number;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  const check = test.potencyCheck;

  // Note: potencyCheck is required by TestRecordSchema, so it's always present.
  // This validation focuses on quality, not existence.

  if (check.positiveControl.trim().length < 10) {
    issues.push("Potency check must have a specific positive control");
    return { valid: false, score: 0, issues, suggestions };
  }

  const score = calculatePotencyScore(check);

  // Add suggestions for improving potency score (these are NOT errors)
  if (score < 3) {
    if (
      !check.sensitivityVerification?.trim() ||
      check.sensitivityVerification.trim().length < 10
    ) {
      suggestions.push(
        "Consider adding sensitivity verification for a more complete potency check",
      );
    }
    if (!check.timingValidation?.trim() || check.timingValidation.trim().length < 10) {
      suggestions.push("Consider adding timing validation for a more complete potency check");
    }
  }

  return {
    valid: true,
    score,
    issues,
    suggestions,
  };
}

/**
 * Full test validation.
 * Returns all issues found.
 */
export function validateTest(test: TestRecord): {
  valid: boolean;
  discriminativePower: number;
  potencyScore: number;
  scoreInflated: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Validate discriminative power
  const discResult = validateDiscriminativePower(test);
  issues.push(...discResult.issues);

  // Validate potency check (CRITICAL)
  const potencyResult = validatePotencyCheck(test);
  issues.push(...potencyResult.issues);
  warnings.push(...potencyResult.suggestions);

  // Check for inflated scores
  const inflated = detectInflatedScores(test.evidencePerWeekScore);
  if (inflated.inflated) {
    warnings.push(inflated.message);
  }

  // Check object transposition
  if (!test.objectTransposition?.considered) {
    warnings.push("Consider object transposition: could this test be done in a different system?");
  }

  return {
    valid: issues.length === 0,
    discriminativePower: discResult.score,
    potencyScore: potencyResult.score,
    scoreInflated: inflated.inflated,
    issues,
    warnings,
  };
}

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate a new test ID for a session.
 */
export function generateTestId(sessionId: string, existingIds: string[]): string {
  const prefix = `T-${sessionId}-`;
  const sequences = existingIds
    .filter((id) => id.startsWith(prefix))
    .map((id) => {
      const match = id.match(/-(\d{3})$/);
      return match ? parseInt(match[1], 10) : 0;
    });

  const nextSeq = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
  return `${prefix}${nextSeq.toString().padStart(3, "0")}`;
}

export function isValidTestId(id: string): boolean {
  return testIdPattern.test(id);
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new test record with required fields and defaults.
 */
export function createTestRecord(input: {
  id: string;
  name: string;
  procedure: string;
  discriminates: string[];
  expectedOutcomes: ExpectedOutcome[];
  potencyCheck: PotencyCheck;
  evidencePerWeekScore: EvidencePerWeekScore;
  feasibility: TestFeasibility;
  designedInSession: string;
  addressesPredictions?: string[];
  objectTransposition?: ObjectTransposition;
  requiredAssumptions?: string[];
  designedBy?: string;
  anchors?: string[];
  priority?: number;
}): TestRecord {
  const now = new Date().toISOString();
  return TestRecordSchema.parse({
    id: input.id,
    name: input.name,
    procedure: input.procedure,
    discriminates: input.discriminates,
    expectedOutcomes: input.expectedOutcomes,
    addressesPredictions: input.addressesPredictions,
    potencyCheck: input.potencyCheck,
    evidencePerWeekScore: input.evidencePerWeekScore,
    objectTransposition: input.objectTransposition,
    feasibility: input.feasibility,
    requiredAssumptions: input.requiredAssumptions,
    designedInSession: input.designedInSession,
    designedBy: input.designedBy,
    status: "designed",
    anchors: input.anchors,
    priority: input.priority,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Create a simple binary test (yes/no readout).
 * These have the highest discriminative power.
 */
export function createBinaryTest(input: {
  id: string;
  name: string;
  procedure: string;
  hypothesis1: { id: string; predictsPositive: boolean };
  hypothesis2: { id: string; predictsPositive: boolean };
  potencyCheck: PotencyCheck;
  feasibility: TestFeasibility;
  designedInSession: string;
  cost?: 0 | 1 | 2 | 3;
  speed?: 0 | 1 | 2 | 3;
}): TestRecord {
  // Validate that hypotheses predict different outcomes
  if (input.hypothesis1.predictsPositive === input.hypothesis2.predictsPositive) {
    throw new Error(
      `Binary test is not discriminative: both hypotheses predict ${
        input.hypothesis1.predictsPositive ? "positive" : "negative"
      }. For a discriminative test, hypotheses must predict different outcomes.`,
    );
  }

  return createTestRecord({
    id: input.id,
    name: input.name,
    procedure: input.procedure,
    discriminates: [input.hypothesis1.id, input.hypothesis2.id],
    expectedOutcomes: [
      {
        hypothesisId: input.hypothesis1.id,
        outcome: input.hypothesis1.predictsPositive ? "Positive result" : "Negative result",
        resultType: input.hypothesis1.predictsPositive ? "positive" : "negative",
      },
      {
        hypothesisId: input.hypothesis2.id,
        outcome: input.hypothesis2.predictsPositive ? "Positive result" : "Negative result",
        resultType: input.hypothesis2.predictsPositive ? "positive" : "negative",
      },
    ],
    potencyCheck: input.potencyCheck,
    evidencePerWeekScore: {
      likelihoodRatio: 3, // Binary tests have high LR
      cost: input.cost ?? 2,
      speed: input.speed ?? 2,
      ambiguity: 3, // Binary = low ambiguity
    },
    feasibility: input.feasibility,
    designedInSession: input.designedInSession,
  });
}
