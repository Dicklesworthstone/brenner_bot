import { z } from "zod";
import type { Artifact } from "../artifact-merge";

/**
 * Brenner Method Scorecard Schema
 *
 * Implements the 14-criterion evaluation rubric for scoring Brenner method
 * contributions. Provides per-session and per-contribution scores on method
 * adherence with actionable feedback.
 *
 * @see specs/evaluation_rubric_v0.1.md - The authoritative source
 * @see brenner_bot-nihv (bead)
 */

// ============================================================================
// Score Types
// ============================================================================

/**
 * Standard 0-3 score range used by most criteria.
 */
export const ScoreSchema = z.number().int().min(0).max(3);
export type Score = z.infer<typeof ScoreSchema>;

/**
 * 0-2 score range used by optional/conditional criteria.
 */
export const OptionalScoreSchema = z.number().int().min(0).max(2);
export type OptionalScore = z.infer<typeof OptionalScoreSchema>;

// ============================================================================
// Role Types
// ============================================================================

/**
 * Roles in the Brenner method that produce contributions.
 *
 * - hypothesis_generator: Creates and manages hypotheses (typically Codex)
 * - test_designer: Designs discriminative tests (typically Opus)
 * - adversarial_critic: Challenges and validates work (typically Gemini)
 */
export const RoleSchema = z.enum(["hypothesis_generator", "test_designer", "adversarial_critic"]);
export type Role = z.infer<typeof RoleSchema>;

// ============================================================================
// Universal Criteria (1-3)
// ============================================================================

/**
 * Criterion 1: Structural Correctness (0-3)
 * Does the output follow the delta format specification?
 */
export const StructuralCorrectnessSchema = z.object({
  score: ScoreSchema,
  validJson: z.boolean(),
  hasRequiredFields: z.boolean(),
  sectionOperationMatch: z.boolean(),
  notes: z.string().optional(),
});
export type StructuralCorrectness = z.infer<typeof StructuralCorrectnessSchema>;

/**
 * Criterion 2: Citation Compliance (0-3)
 * Are transcript anchors and inference markers used correctly?
 */
export const CitationComplianceSchema = z.object({
  score: ScoreSchema,
  anchorCount: z.number().int().min(0),
  validAnchors: z.number().int().min(0),
  hasInferenceMarkers: z.boolean(),
  fakeAnchorDetected: z.boolean(),
  notes: z.string().optional(),
});
export type CitationCompliance = z.infer<typeof CitationComplianceSchema>;

/**
 * Criterion 3: Rationale Quality (0-3)
 * Does the rationale explain the contribution effectively?
 */
export const RationaleQualitySchema = z.object({
  score: ScoreSchema,
  hasRationale: z.boolean(),
  mentionsOperators: z.boolean(),
  explainsWhy: z.boolean(),
  notes: z.string().optional(),
});
export type RationaleQuality = z.infer<typeof RationaleQualitySchema>;

// ============================================================================
// Hypothesis Generator Criteria (4-6)
// ============================================================================

/**
 * Criterion 4: Level Separation (0-3)
 * Has the contributor applied ⊘ Level-Split correctly?
 *
 * Level conflation red flags:
 * - "The gene tells the cell to..."
 * - "The organism decides to..."
 * - Confusing "won't" (chastity) with "can't" (impotence)
 */
export const LevelSeparationSchema = z.object({
  score: ScoreSchema,
  conflationDetected: z.boolean(),
  conflationPatterns: z.array(z.string()).optional(),
  mechanismTyped: z.boolean(),
  notes: z.string().optional(),
});
export type LevelSeparation = z.infer<typeof LevelSeparationSchema>;

/**
 * Criterion 5: Third Alternative Presence (0-3)
 * Is a genuine third alternative included?
 *
 * Quality indicators:
 * - Proposes a different causal structure, not a blend
 * - Comes from cross-domain transfer (⊕)
 * - Identifies a shared assumption that could be false
 */
export const ThirdAlternativePresenceSchema = z.object({
  score: ScoreSchema,
  hasThirdAlternative: z.boolean(),
  isGenuinelyOrthogonal: z.boolean(),
  isPlaceholder: z.boolean(), // "both could be wrong" without specifics
  notes: z.string().optional(),
});
export type ThirdAlternativePresence = z.infer<typeof ThirdAlternativePresenceSchema>;

/**
 * Criterion 6: Paradox Exploitation (0-2, optional)
 * Does the contribution leverage paradoxes productively?
 */
export const ParadoxExploitationSchema = z.object({
  score: OptionalScoreSchema,
  applicable: z.boolean(),
  paradoxIdentified: z.boolean(),
  hypothesisDerivedFromParadox: z.boolean(),
  notes: z.string().optional(),
});
export type ParadoxExploitation = z.infer<typeof ParadoxExploitationSchema>;

// ============================================================================
// Test Designer Criteria (7-10)
// ============================================================================

/**
 * Criterion 7: Discriminative Power (0-3)
 * Does the test actually distinguish hypotheses?
 *
 * Checklist:
 * - Expected outcomes differ for each hypothesis
 * - Difference is binary or quantitatively large
 * - Both outcomes are actually observable
 */
export const DiscriminativePowerSchema = z.object({
  score: ScoreSchema,
  hypothesesDiscriminated: z.number().int().min(0),
  outcomesAreDifferent: z.boolean(),
  outcomesAreObservable: z.boolean(),
  likelihoodRatioEstimate: z.string().optional(), // e.g., ">100:1"
  notes: z.string().optional(),
});
export type DiscriminativePower = z.infer<typeof DiscriminativePowerSchema>;

/**
 * Criterion 8: Potency Check Sufficiency (0-3)
 * Can we distinguish "no effect" from "assay failed"?
 *
 * Components:
 * - Positive control that would show the effect if present
 * - Sensitivity verification that detection threshold is adequate
 * - Timing validation that the assay window is correct
 */
export const PotencyCheckSufficiencySchema = z.object({
  score: ScoreSchema,
  hasPotencyCheck: z.boolean(),
  hasPositiveControl: z.boolean(),
  hasSensitivityVerification: z.boolean(),
  hasTimingValidation: z.boolean(),
  notes: z.string().optional(),
});
export type PotencyCheckSufficiency = z.infer<typeof PotencyCheckSufficiencySchema>;

/**
 * Criterion 9: Object Transposition Considered (0-2, optional)
 * Has the contributor considered alternative experimental systems?
 */
export const ObjectTranspositionSchema = z.object({
  score: OptionalScoreSchema,
  applicable: z.boolean(),
  alternativesConsidered: z.boolean(),
  costBenefitProvided: z.boolean(),
  notes: z.string().optional(),
});
export type ObjectTransposition = z.infer<typeof ObjectTranspositionSchema>;

/**
 * Criterion 10: Score Calibration Honesty (0-2)
 * Is the 4-dimension score realistic?
 */
export const ScoreCalibrationHonestySchema = z.object({
  score: OptionalScoreSchema,
  hasEvidenceScore: z.boolean(),
  isInflated: z.boolean(), // All 3s is suspicious
  isConservative: z.boolean(),
  notes: z.string().optional(),
});
export type ScoreCalibrationHonesty = z.infer<typeof ScoreCalibrationHonestySchema>;

// ============================================================================
// Adversarial Critic Criteria (11-14)
// ============================================================================

/**
 * Criterion 11: Scale Check Rigor (0-3)
 * Are physical constraints calculated, not assumed?
 *
 * Components:
 * - Actual numbers (not "fast" or "slow")
 * - Units and dimensional analysis
 * - Comparison to relevant physical constraint
 * - Explicit conclusion about what violates the constraint
 */
export const ScaleCheckRigorSchema = z.object({
  score: ScoreSchema,
  hasScaleCheck: z.boolean(),
  hasCalculation: z.boolean(),
  hasUnits: z.boolean(),
  hasConclusion: z.boolean(),
  notes: z.string().optional(),
});
export type ScaleCheckRigor = z.infer<typeof ScaleCheckRigorSchema>;

/**
 * Criterion 12: Anomaly Quarantine Discipline (0-3)
 * Are anomalies tracked explicitly rather than swept or destroyed?
 *
 * Discipline:
 * - Anomaly explicitly named and described
 * - Conflict with specific hypotheses/assumptions noted
 * - Resolution plan or deferral reason stated
 * - Neither hidden nor allowed to destroy coherent framework
 */
export const AnomalyQuarantineDisciplineSchema = z.object({
  score: ScoreSchema,
  anomalyCount: z.number().int().min(0),
  quarantinedCount: z.number().int().min(0),
  hasResolutionPlans: z.boolean(),
  prematurelyDestroys: z.boolean(),
  notes: z.string().optional(),
});
export type AnomalyQuarantineDiscipline = z.infer<typeof AnomalyQuarantineDisciplineSchema>;

/**
 * Criterion 13: Theory Kill Justification (0-3, when KILL operation used)
 * Is the kill justified with sufficient evidence?
 *
 * Unjustified kill indicators:
 * - "This seems unlikely"
 * - "We don't need this anymore"
 * - "This is getting complicated"
 */
export const TheoryKillJustificationSchema = z.object({
  score: ScoreSchema,
  applicable: z.boolean(), // Only applies for KILL operations
  hasEvidence: z.boolean(),
  evidenceIsDecisive: z.boolean(),
  rescueMovesConsidered: z.boolean(),
  unjustifiedPatternDetected: z.boolean(),
  notes: z.string().optional(),
});
export type TheoryKillJustification = z.infer<typeof TheoryKillJustificationSchema>;

/**
 * Criterion 14: Real Third Alternative (0-3)
 * Does the critique propose a constructive alternative?
 */
export const RealThirdAlternativeSchema = z.object({
  score: ScoreSchema,
  hasAlternative: z.boolean(),
  isSpecific: z.boolean(),
  hasMechanism: z.boolean(),
  hasTestablePredictions: z.boolean(),
  notes: z.string().optional(),
});
export type RealThirdAlternative = z.infer<typeof RealThirdAlternativeSchema>;

// ============================================================================
// Composite Score Schemas
// ============================================================================

/**
 * Universal criteria that apply to all roles.
 */
export const UniversalCriteriaSchema = z.object({
  structuralCorrectness: StructuralCorrectnessSchema,
  citationCompliance: CitationComplianceSchema,
  rationaleQuality: RationaleQualitySchema,
});
export type UniversalCriteria = z.infer<typeof UniversalCriteriaSchema>;

/**
 * Hypothesis Generator (Codex) role-specific criteria.
 *
 * Score formula:
 *   (Structural × 1.0) + (Citation × 1.0) + (Rationale × 0.5) +
 *   (Level-Sep × 1.5) + (Third-Alt × 2.0) + (Paradox × 0.5)
 * Max = 19 points
 */
export const HypothesisGeneratorCriteriaSchema = z.object({
  levelSeparation: LevelSeparationSchema,
  thirdAlternativePresence: ThirdAlternativePresenceSchema,
  paradoxExploitation: ParadoxExploitationSchema,
});
export type HypothesisGeneratorCriteria = z.infer<typeof HypothesisGeneratorCriteriaSchema>;

/**
 * Test Designer (Opus) role-specific criteria.
 *
 * Score formula:
 *   (Structural × 1.0) + (Citation × 1.0) + (Rationale × 0.5) +
 *   (Discriminative × 2.0) + (Potency × 2.0) + (Object-Trans × 0.5) + (Calibration × 0.5)
 * Max = 21.5 points
 */
export const TestDesignerCriteriaSchema = z.object({
  discriminativePower: DiscriminativePowerSchema,
  potencyCheckSufficiency: PotencyCheckSufficiencySchema,
  objectTransposition: ObjectTranspositionSchema,
  scoreCalibrationHonesty: ScoreCalibrationHonestySchema,
});
export type TestDesignerCriteria = z.infer<typeof TestDesignerCriteriaSchema>;

/**
 * Adversarial Critic (Gemini) role-specific criteria.
 *
 * Score formula:
 *   (Structural × 1.0) + (Citation × 1.0) + (Rationale × 0.5) +
 *   (Scale × 1.5) + (Quarantine × 1.5) + [Kill-Justify × 1.5]* + (Real-Third × 1.5)
 * *Kill-Justify only applies for KILL operations
 *
 * Max (with KILL) = 25.5 points
 * Max (ADD/EDIT)  = 21 points
 */
export const AdversarialCriticCriteriaSchema = z.object({
  scaleCheckRigor: ScaleCheckRigorSchema,
  anomalyQuarantineDiscipline: AnomalyQuarantineDisciplineSchema,
  theoryKillJustification: TheoryKillJustificationSchema,
  realThirdAlternative: RealThirdAlternativeSchema,
});
export type AdversarialCriticCriteria = z.infer<typeof AdversarialCriticCriteriaSchema>;

// ============================================================================
// Contribution Score
// ============================================================================

/**
 * Complete score for a single contribution (delta).
 */
export const ContributionScoreSchema = z.object({
  /** ID of the contribution being scored */
  contributionId: z.string(),

  /** Session this contribution belongs to */
  sessionId: z.string(),

  /** Role that produced this contribution */
  role: RoleSchema,

  /** Universal criteria scores */
  universal: UniversalCriteriaSchema,

  /** Role-specific criteria (only one will be populated based on role) */
  hypothesisGenerator: HypothesisGeneratorCriteriaSchema.optional(),
  testDesigner: TestDesignerCriteriaSchema.optional(),
  adversarialCritic: AdversarialCriticCriteriaSchema.optional(),

  /** Computed weighted composite score */
  compositeScore: z.number().min(0),

  /** Maximum possible score for this contribution */
  maxScore: z.number().min(0),

  /** Percentage score (compositeScore / maxScore) */
  percentage: z.number().min(0).max(100),

  /** Pass/fail gates */
  passFailGates: z.object({
    passed: z.boolean(),
    failures: z.array(
      z.object({
        gate: z.string(),
        reason: z.string(),
      }),
    ),
  }),

  /** Warnings for low-scoring areas */
  warnings: z.array(
    z.object({
      criterion: z.string(),
      message: z.string(),
      suggestion: z.string().optional(),
      brennerQuote: z.string().optional(),
    }),
  ),

  /** When this score was computed */
  scoredAt: z.string().datetime(),
});
export type ContributionScore = z.infer<typeof ContributionScoreSchema>;

// ============================================================================
// Session Score
// ============================================================================

/**
 * Aggregated score for an entire session.
 */
export const SessionScoreSchema = z.object({
  /** Session ID */
  sessionId: z.string(),

  /** Individual contribution scores */
  contributions: z.array(ContributionScoreSchema),

  /** Per-role aggregations */
  roleAggregations: z.object({
    hypothesisGenerator: z
      .object({
        count: z.number().int().min(0),
        meanScore: z.number().min(0),
        meanPercentage: z.number().min(0).max(100),
      })
      .optional(),
    testDesigner: z
      .object({
        count: z.number().int().min(0),
        meanScore: z.number().min(0),
        meanPercentage: z.number().min(0).max(100),
      })
      .optional(),
    adversarialCritic: z
      .object({
        count: z.number().int().min(0),
        meanScore: z.number().min(0),
        meanPercentage: z.number().min(0).max(100),
      })
      .optional(),
  }),

  /** Session-level metrics */
  sessionMetrics: z.object({
    /** Total valid contributions */
    totalContributions: z.number().int().min(0),

    /** Did quality improve over rounds? */
    progression: z.enum(["improving", "stable", "declining", "unknown"]),

    /** Did hypotheses narrow (kills > adds by end)? */
    convergence: z.object({
      addCount: z.number().int().min(0),
      killCount: z.number().int().min(0),
      converging: z.boolean(),
    }),

    /** Were all operators used? */
    operatorCoverage: z.object({
      used: z.array(z.string()),
      missing: z.array(z.string()),
      coveragePercentage: z.number().min(0).max(100),
    }),
  }),

  /** Overall session quality */
  overallScore: z.number().min(0),
  overallPercentage: z.number().min(0).max(100),

  /** When this score was computed */
  scoredAt: z.string().datetime(),
});
export type SessionScore = z.infer<typeof SessionScoreSchema>;

// ============================================================================
// Weight Configuration
// ============================================================================

/**
 * Weight configuration for composite score calculation.
 * Based on evaluation_rubric_v0.1.md.
 */
export const SCORE_WEIGHTS = {
  // Universal criteria (all roles)
  structuralCorrectness: 1.0,
  citationCompliance: 1.0,
  rationaleQuality: 0.5,

  // Hypothesis Generator criteria
  levelSeparation: 1.5,
  thirdAlternativePresence: 2.0,
  paradoxExploitation: 0.5,

  // Test Designer criteria
  discriminativePower: 2.0,
  potencyCheckSufficiency: 2.0,
  objectTransposition: 0.5,
  scoreCalibrationHonesty: 0.5,

  // Adversarial Critic criteria
  scaleCheckRigor: 1.5,
  anomalyQuarantineDiscipline: 1.5,
  theoryKillJustification: 1.5,
  realThirdAlternative: 1.5,
} as const;

/**
 * Maximum scores per criterion.
 */
export const MAX_SCORES = {
  // Standard criteria (0-3)
  structuralCorrectness: 3,
  citationCompliance: 3,
  rationaleQuality: 3,
  levelSeparation: 3,
  thirdAlternativePresence: 3,
  discriminativePower: 3,
  potencyCheckSufficiency: 3,
  scaleCheckRigor: 3,
  anomalyQuarantineDiscipline: 3,
  theoryKillJustification: 3,
  realThirdAlternative: 3,

  // Optional criteria (0-2)
  paradoxExploitation: 2,
  objectTransposition: 2,
  scoreCalibrationHonesty: 2,
} as const;

/**
 * Maximum possible weighted scores per role.
 *
 * Hypothesis Generator: 3 + 3 + 1.5 + 4.5 + 6 + 1 = 19
 * Test Designer: 3 + 3 + 1.5 + 6 + 6 + 1 + 1 = 21.5
 * Adversarial Critic (with KILL): 3 + 3 + 1.5 + 4.5 + 4.5 + 4.5 + 4.5 = 25.5
 * Adversarial Critic (ADD/EDIT): 3 + 3 + 1.5 + 4.5 + 4.5 + 4.5 = 21
 */
export const MAX_ROLE_SCORES = {
  hypothesis_generator: 19,
  test_designer: 21.5,
  adversarial_critic_with_kill: 25.5,
  adversarial_critic_no_kill: 21,
} as const;

// ============================================================================
// Scoring Functions
// ============================================================================

/**
 * Calculate weighted score for universal criteria.
 */
export function calculateUniversalScore(criteria: UniversalCriteria): number {
  return (
    criteria.structuralCorrectness.score * SCORE_WEIGHTS.structuralCorrectness +
    criteria.citationCompliance.score * SCORE_WEIGHTS.citationCompliance +
    criteria.rationaleQuality.score * SCORE_WEIGHTS.rationaleQuality
  );
}

/**
 * Calculate weighted score for Hypothesis Generator criteria.
 */
export function calculateHypothesisGeneratorScore(
  universal: UniversalCriteria,
  specific: HypothesisGeneratorCriteria,
): { score: number; maxScore: number } {
  const universalScore = calculateUniversalScore(universal);

  const specificScore =
    specific.levelSeparation.score * SCORE_WEIGHTS.levelSeparation +
    specific.thirdAlternativePresence.score * SCORE_WEIGHTS.thirdAlternativePresence +
    (specific.paradoxExploitation.applicable
      ? specific.paradoxExploitation.score * SCORE_WEIGHTS.paradoxExploitation
      : 0);

  // Adjust max score if paradox exploitation is not applicable
  const maxScore = specific.paradoxExploitation.applicable
    ? MAX_ROLE_SCORES.hypothesis_generator
    : MAX_ROLE_SCORES.hypothesis_generator -
      MAX_SCORES.paradoxExploitation * SCORE_WEIGHTS.paradoxExploitation;

  return {
    score: universalScore + specificScore,
    maxScore,
  };
}

/**
 * Calculate weighted score for Test Designer criteria.
 */
export function calculateTestDesignerScore(
  universal: UniversalCriteria,
  specific: TestDesignerCriteria,
): { score: number; maxScore: number } {
  const universalScore = calculateUniversalScore(universal);

  const specificScore =
    specific.discriminativePower.score * SCORE_WEIGHTS.discriminativePower +
    specific.potencyCheckSufficiency.score * SCORE_WEIGHTS.potencyCheckSufficiency +
    (specific.objectTransposition.applicable
      ? specific.objectTransposition.score * SCORE_WEIGHTS.objectTransposition
      : 0) +
    (specific.scoreCalibrationHonesty.hasEvidenceScore
      ? specific.scoreCalibrationHonesty.score * SCORE_WEIGHTS.scoreCalibrationHonesty
      : 0);

  // Adjust max score for non-applicable criteria
  let maxScore = MAX_ROLE_SCORES.test_designer;
  if (!specific.objectTransposition.applicable) {
    maxScore -= MAX_SCORES.objectTransposition * SCORE_WEIGHTS.objectTransposition;
  }
  if (!specific.scoreCalibrationHonesty.hasEvidenceScore) {
    maxScore -= MAX_SCORES.scoreCalibrationHonesty * SCORE_WEIGHTS.scoreCalibrationHonesty;
  }

  return {
    score: universalScore + specificScore,
    maxScore,
  };
}

/**
 * Calculate weighted score for Adversarial Critic criteria.
 */
export function calculateAdversarialCriticScore(
  universal: UniversalCriteria,
  specific: AdversarialCriticCriteria,
): { score: number; maxScore: number } {
  const universalScore = calculateUniversalScore(universal);

  const specificScore =
    specific.scaleCheckRigor.score * SCORE_WEIGHTS.scaleCheckRigor +
    specific.anomalyQuarantineDiscipline.score * SCORE_WEIGHTS.anomalyQuarantineDiscipline +
    (specific.theoryKillJustification.applicable
      ? specific.theoryKillJustification.score * SCORE_WEIGHTS.theoryKillJustification
      : 0) +
    specific.realThirdAlternative.score * SCORE_WEIGHTS.realThirdAlternative;

  const maxScore = specific.theoryKillJustification.applicable
    ? MAX_ROLE_SCORES.adversarial_critic_with_kill
    : MAX_ROLE_SCORES.adversarial_critic_no_kill;

  return {
    score: universalScore + specificScore,
    maxScore,
  };
}

// ============================================================================
// Pass/Fail Gate Definitions
// ============================================================================

/**
 * Pass/fail gate definitions.
 * Certain failures are disqualifying regardless of other scores.
 */
export const PASS_FAIL_GATES = {
  invalidJson: {
    check: (score: ContributionScore) => score.universal.structuralCorrectness.validJson,
    message: "Invalid JSON in delta block",
  },
  missingRequiredFields: {
    check: (score: ContributionScore) => score.universal.structuralCorrectness.hasRequiredFields,
    message: "Missing required fields in delta",
  },
  missingPotencyCheck: {
    check: (score: ContributionScore) =>
      score.role !== "test_designer" ||
      (score.testDesigner?.potencyCheckSufficiency.hasPotencyCheck ?? true),
    message: "Missing potency check in test design",
  },
  fakeAnchor: {
    check: (score: ContributionScore) => !score.universal.citationCompliance.fakeAnchorDetected,
    message: "Fake transcript anchor detected (§n that doesn't exist)",
  },
  killWithoutRationale: {
    check: (score: ContributionScore) =>
      score.role !== "adversarial_critic" ||
      !score.adversarialCritic?.theoryKillJustification.applicable ||
      score.adversarialCritic.theoryKillJustification.hasEvidence,
    message: "KILL operation without evidence/rationale",
  },
} as const;

// ============================================================================
// Warning Threshold Definitions
// ============================================================================

/**
 * Warning thresholds for low-scoring areas.
 */
export const WARNING_THRESHOLDS = {
  lowQualityContribution: {
    check: (score: ContributionScore) => score.percentage < 50,
    message: "Low-quality contribution (< 50% of max score)",
    criterion: "composite",
  },
  missingScaleCheck: {
    check: (score: ContributionScore) =>
      score.role === "adversarial_critic" &&
      (score.adversarialCritic?.scaleCheckRigor.score ?? 0) === 0,
    message: "Scale check missing for mechanism claim",
    criterion: "scaleCheckRigor",
  },
  weakPotency: {
    check: (score: ContributionScore) =>
      score.role === "test_designer" &&
      (score.testDesigner?.potencyCheckSufficiency.score ?? 0) < 2,
    message: "Weak assay design (potency score < 2)",
    criterion: "potencyCheckSufficiency",
  },
} as const;

// ============================================================================
// Session-Level Warning Definitions
// ============================================================================

/**
 * Session-level warning thresholds.
 * These require the full session context to evaluate.
 */
export const SESSION_WARNING_THRESHOLDS = {
  hypothesisSprawl: {
    check: (session: SessionScore) =>
      session.sessionMetrics.convergence.addCount > 3 &&
      session.sessionMetrics.convergence.killCount === 0,
    message: "> 3 ADDs without KILL indicates possible hypothesis sprawl",
    criterion: "convergence",
  },
  lowConvergence: {
    check: (session: SessionScore) =>
      session.sessionMetrics.totalContributions >= 5 &&
      !session.sessionMetrics.convergence.converging,
    message: "Session has not converged (more ADDs than KILLs at end)",
    criterion: "convergence",
  },
  lowOperatorCoverage: {
    check: (session: SessionScore) =>
      session.sessionMetrics.operatorCoverage.coveragePercentage < 50,
    message: "Less than 50% of operators used in session",
    criterion: "operatorCoverage",
  },
  decliningQuality: {
    check: (session: SessionScore) => session.sessionMetrics.progression === "declining",
    message: "Quality is declining over the session",
    criterion: "progression",
  },
} as const;

/**
 * Generate warnings for a session.
 */
export function generateSessionWarnings(
  session: SessionScore,
): SessionScore["contributions"][0]["warnings"] {
  const warnings: SessionScore["contributions"][0]["warnings"] = [];

  for (const [, threshold] of Object.entries(SESSION_WARNING_THRESHOLDS)) {
    if (threshold.check(session)) {
      warnings.push({
        criterion: threshold.criterion,
        message: threshold.message,
      });
    }
  }

  return warnings;
}

// ============================================================================
// Brenner Quotes for Feedback
// ============================================================================

/**
 * Sydney Brenner quotes to include in feedback, keyed by criterion.
 */
export const BRENNER_QUOTES: Record<string, string> = {
  levelSeparation: "Programs don't have wants. Interpreters do. (§58)",
  thirdAlternativePresence: "Both could be wrong. (§103)",
  scaleCheckRigor: "The imprisoned imagination — scale constraints are load-bearing. (§58)",
  anomalyQuarantineDiscipline: "We didn't conceal them; we put them in an appendix. (§110)",
  theoryKillJustification: "When they go ugly, kill them. Get rid of them. (§229)",
  discriminativePower: "Exclusion is always a tremendously good thing. (§147)",
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a score passes all gates.
 */
export function checkPassFailGates(score: ContributionScore): {
  passed: boolean;
  failures: { gate: string; reason: string }[];
} {
  const failures: { gate: string; reason: string }[] = [];

  for (const [gateName, gate] of Object.entries(PASS_FAIL_GATES)) {
    if (!gate.check(score)) {
      failures.push({ gate: gateName, reason: gate.message });
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Generate warnings for a score.
 */
export function generateWarnings(score: ContributionScore): ContributionScore["warnings"] {
  const warnings: ContributionScore["warnings"] = [];

  for (const [, threshold] of Object.entries(WARNING_THRESHOLDS)) {
    if (threshold.check(score)) {
      warnings.push({
        criterion: threshold.criterion,
        message: threshold.message,
        brennerQuote: BRENNER_QUOTES[threshold.criterion],
      });
    }
  }

  return warnings;
}

/**
 * Create an empty score for a criterion with score 0.
 */
export function createEmptyStructuralCorrectness(): StructuralCorrectness {
  return {
    score: 0,
    validJson: false,
    hasRequiredFields: false,
    sectionOperationMatch: false,
  };
}

export function createEmptyCitationCompliance(): CitationCompliance {
  return {
    score: 0,
    anchorCount: 0,
    validAnchors: 0,
    hasInferenceMarkers: false,
    fakeAnchorDetected: false,
  };
}

export function createEmptyRationaleQuality(): RationaleQuality {
  return {
    score: 0,
    hasRationale: false,
    mentionsOperators: false,
    explainsWhy: false,
  };
}

// ============================================================================
// Session-Level Dimension Scoring (7 Dimensions)
// ============================================================================
// This section implements the 7-dimension session scoring as specified in
// brenner_bot-yh8l. These dimensions aggregate session-level metrics rather
// than per-contribution scores.

/**
 * A signal that contributes to a dimension score.
 */
export interface ScoreSignal {
  signal: string;
  points: number;
  found: boolean;
  evidence?: string;
}

/**
 * Score for a single dimension.
 */
export interface DimensionScore {
  dimension: string;
  points: number;
  maxPoints: number;
  percentage: number;
  signals: ScoreSignal[];
}

/**
 * Session data for scoring - includes artifact and optional transition history.
 */
export interface SessionData {
  sessionId: string;
  researchQuestion?: string;
  artifact: Artifact;
  hypothesisTransitions?: HypothesisTransition[];
}

/**
 * Hypothesis state transition record for kill rate scoring.
 */
export interface HypothesisTransition {
  hypothesisId: string;
  fromState: string;
  toState: string;
  triggeredBy?: string;
  reason?: string;
  timestamp: string;
}

/**
 * Complete session-level dimension score.
 */
export interface SessionDimensionScore {
  sessionId: string;
  scoredAt: string;
  dimensions: {
    paradoxGrounding: DimensionScore;
    hypothesisKillRate: DimensionScore;
    testDiscriminability: DimensionScore;
    assumptionTracking: DimensionScore;
    thirdAlternativeDiscovery: DimensionScore;
    experimentalFeasibility: DimensionScore;
    adversarialPressure: DimensionScore;
  };
  totalScore: number;
  maxScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
}

// ============================================================================
// Dimension Scoring Functions
// ============================================================================

/**
 * Compute a dimension score from signals.
 */
function computeDimensionScore(
  dimension: string,
  signals: ScoreSignal[],
  maxPoints: number,
): DimensionScore {
  const points = signals.filter((s) => s.found).reduce((sum, s) => sum + s.points, 0);

  return {
    dimension,
    points: Math.min(points, maxPoints), // Cap at maxPoints
    maxPoints,
    percentage: maxPoints > 0 ? Math.round((Math.min(points, maxPoints) / maxPoints) * 100) : 0,
    signals,
  };
}

/**
 * Keywords indicating paradox/puzzle in research question.
 */
const PARADOX_KEYWORDS = [
  "paradox",
  "puzzle",
  "surprising",
  "unexpected",
  "contradiction",
  "anomaly",
  "mystery",
  "counterintuitive",
  "but",
  "yet",
  "however",
  "despite",
  "although",
];

/**
 * Check if text contains paradox-related keywords.
 */
function checkForParadoxKeywords(text: string | undefined): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return PARADOX_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Check if text challenges existing paradigm.
 */
function checkForParadigmChallenge(text: string | undefined): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  const challengeKeywords = [
    "challenge",
    "question",
    "rethink",
    "reconsider",
    "alternative",
    "contrary to",
    "unlike",
    "different from",
    "not as assumed",
    "wrong",
    "incorrect",
    "mistaken",
  ];
  return challengeKeywords.some((kw) => lower.includes(kw));
}

/**
 * Score Dimension 1: Paradox Grounding (0-20)
 *
 * Measures whether the session starts from a genuine paradox or puzzle.
 * Signals:
 * - Research question contains explicit paradox/puzzle (5 pts)
 * - At least one surprising observation cited (5 pts)
 * - Question challenges existing paradigm (5 pts)
 * - Foundational assumptions questioned (5 pts)
 */
export function scoreParadoxGrounding(session: SessionData): DimensionScore {
  const researchThread = session.artifact.sections.research_thread;
  const questionText = session.researchQuestion ?? researchThread?.statement ?? "";

  const anomalies = session.artifact.sections.anomaly_register ?? [];
  const assumptions = session.artifact.sections.assumption_ledger ?? [];

  const signals: ScoreSignal[] = [
    {
      signal: "Research question contains explicit paradox/puzzle",
      points: 5,
      found: checkForParadoxKeywords(questionText),
      evidence: checkForParadoxKeywords(questionText) ? "Keywords detected" : undefined,
    },
    {
      signal: "At least one surprising observation cited",
      points: 5,
      found: anomalies.length > 0,
      evidence: anomalies.length > 0 ? `${anomalies.length} anomalies registered` : undefined,
    },
    {
      signal: "Question challenges existing paradigm",
      points: 5,
      found: checkForParadigmChallenge(questionText),
      evidence: checkForParadigmChallenge(questionText) ? "Challenge language detected" : undefined,
    },
    {
      signal: "Foundational assumptions questioned",
      points: 5,
      found: assumptions.some((a) => a.status === "falsified"),
      evidence:
        assumptions.filter((a) => a.status === "falsified").length > 0
          ? `${assumptions.filter((a) => a.status === "falsified").length} assumptions falsified`
          : undefined,
    },
  ];

  return computeDimensionScore("paradoxGrounding", signals, 20);
}

/**
 * Score Dimension 2: Hypothesis Kill Rate (0-20)
 *
 * Measures how effectively hypotheses are being eliminated.
 * "When they go ugly, kill them. Get rid of them." (§229)
 *
 * Signals:
 * - At least one hypothesis killed in session (10 pts)
 * - Kill linked to specific test result (5 pts)
 * - Kill reasoning documented (5 pts)
 *
 * Penalty:
 * - No hypothesis transitions (static session) (-5 pts)
 */
export function scoreHypothesisKillRate(session: SessionData): DimensionScore {
  const transitions = session.hypothesisTransitions ?? [];
  const hypotheses = session.artifact.sections.hypothesis_slate ?? [];

  // Count kills from transitions or from killed flag on hypotheses
  const killsFromTransitions = transitions.filter(
    (t) => t.toState === "refuted" || t.toState === "killed",
  );
  const killsFromFlags = hypotheses.filter((h) => h.killed);
  const totalKills = Math.max(killsFromTransitions.length, killsFromFlags.length);

  // Check if kills are linked to test results (from transitions)
  const killsWithTestLink = killsFromTransitions.filter(
    (t) => t.triggeredBy?.startsWith("T-") || t.triggeredBy?.startsWith("test-"),
  );
  // Check if flagged kills are linked to test results (via killed_by field)
  const flaggedKillsWithTestLink = killsFromFlags.filter(
    (h) => h.killed_by?.startsWith("T-") || h.killed_by?.startsWith("test-"),
  );
  const totalKillsWithTestLink = killsWithTestLink.length + flaggedKillsWithTestLink.length;

  // Check if kill reasoning is documented
  const killsWithReasoning = killsFromTransitions.filter((t) => t.reason && t.reason.length >= 10);
  const flaggedKillsWithReasoning = killsFromFlags.filter(
    (h) => h.kill_reason && h.kill_reason.length >= 10,
  );
  const totalKillsWithReasoning = killsWithReasoning.length + flaggedKillsWithReasoning.length;

  const signals: ScoreSignal[] = [
    {
      signal: "At least one hypothesis killed in session",
      points: 10,
      found: totalKills > 0,
      evidence: totalKills > 0 ? `${totalKills} hypotheses killed` : undefined,
    },
    {
      signal: "Kill linked to specific test result",
      points: 5,
      found: totalKillsWithTestLink > 0,
      evidence:
        totalKillsWithTestLink > 0 ? `${totalKillsWithTestLink} kills linked to tests` : undefined,
    },
    {
      signal: "Kill reasoning documented",
      points: 5,
      found: totalKillsWithReasoning > 0,
      evidence:
        totalKillsWithReasoning > 0 ? `${totalKillsWithReasoning} kills with reasoning` : undefined,
    },
  ];

  // Penalty for static session (no transitions at all)
  if (transitions.length === 0 && hypotheses.length > 0) {
    signals.push({
      signal: "No hypothesis transitions (static session)",
      points: -5,
      found: true,
      evidence: `${hypotheses.length} hypotheses but no transitions`,
    });
  }

  return computeDimensionScore("hypothesisKillRate", signals, 20);
}

/**
 * Score Dimension 3: Test Discriminability (0-20)
 *
 * Measures whether tests actually distinguish hypotheses.
 * "Exclusion is always a tremendously good thing." (§147)
 *
 * Signals:
 * - Tests have different predictions for hypotheses (8 pts)
 * - Outcomes are observable/measurable (4 pts)
 * - Potency checks included (8 pts)
 */
export function scoreTestDiscriminability(session: SessionData): DimensionScore {
  const tests = session.artifact.sections.discriminative_tests ?? [];

  // Check for different predictions
  const testsWithDifferentPredictions = tests.filter(
    (t) => t.expected_outcomes && Object.keys(t.expected_outcomes).length >= 2,
  );

  // Check for observable outcomes (look for measurement language)
  const observableKeywords = [
    "measure",
    "observe",
    "detect",
    "count",
    "quantify",
    "assay",
    "analyze",
    "sequence",
    "image",
    "stain",
  ];
  const testsWithObservableOutcomes = tests.filter((t) => {
    const procedureLower = (t.procedure ?? "").toLowerCase();
    return observableKeywords.some((kw) => procedureLower.includes(kw));
  });

  // Check for potency checks
  const testsWithPotencyChecks = tests.filter(
    (t) => t.potency_check && t.potency_check.length > 10,
  );

  const signals: ScoreSignal[] = [
    {
      signal: "Tests have different predictions for hypotheses",
      points: 8,
      found: testsWithDifferentPredictions.length > 0,
      evidence:
        testsWithDifferentPredictions.length > 0
          ? `${testsWithDifferentPredictions.length}/${tests.length} tests discriminate`
          : undefined,
    },
    {
      signal: "Outcomes are observable/measurable",
      points: 4,
      found: testsWithObservableOutcomes.length > 0,
      evidence:
        testsWithObservableOutcomes.length > 0
          ? `${testsWithObservableOutcomes.length} tests with observable procedures`
          : undefined,
    },
    {
      signal: "Potency checks included",
      points: 8,
      found: testsWithPotencyChecks.length === tests.length && tests.length > 0,
      evidence:
        testsWithPotencyChecks.length > 0
          ? `${testsWithPotencyChecks.length}/${tests.length} tests have potency checks`
          : undefined,
    },
  ];

  return computeDimensionScore("testDiscriminability", signals, 20);
}

/**
 * Score Dimension 4: Assumption Tracking (0-15)
 *
 * Measures whether assumptions are tracked and challenged.
 * "The imprisoned imagination" — scale constraints are load-bearing. (§58)
 *
 * Signals:
 * - Assumptions are recorded (5 pts)
 * - Assumptions linked to hypotheses (5 pts)
 * - Scale/physics checks performed (5 pts)
 */
export function scoreAssumptionTracking(session: SessionData): DimensionScore {
  const assumptions = session.artifact.sections.assumption_ledger ?? [];

  // Check for recorded assumptions
  const hasAssumptions = assumptions.length > 0;

  // Check for linked assumptions (load field references hypothesis)
  const linkedAssumptions = assumptions.filter((a) => a.load && a.load.length > 5);

  // Check for scale/physics checks
  const scaleChecks = assumptions.filter((a) => a.scale_check === true);

  const signals: ScoreSignal[] = [
    {
      signal: "Assumptions are recorded",
      points: 5,
      found: hasAssumptions,
      evidence: hasAssumptions ? `${assumptions.length} assumptions recorded` : undefined,
    },
    {
      signal: "Assumptions linked to hypotheses",
      points: 5,
      found: linkedAssumptions.length > 0,
      evidence:
        linkedAssumptions.length > 0
          ? `${linkedAssumptions.length} assumptions have load-bearing links`
          : undefined,
    },
    {
      signal: "Scale/physics checks performed",
      points: 5,
      found: scaleChecks.length > 0,
      evidence: scaleChecks.length > 0 ? `${scaleChecks.length} scale checks performed` : undefined,
    },
  ];

  return computeDimensionScore("assumptionTracking", signals, 15);
}

/**
 * Score Dimension 5: Third Alternative Discovery (0-15)
 *
 * Measures whether third alternatives are explored.
 * "Both could be wrong." (§103)
 *
 * Signals:
 * - Third alternatives proposed (5 pts)
 * - Third alternatives are genuinely orthogonal (5 pts)
 * - Third alternatives have different causal structure (5 pts)
 */
export function scoreThirdAlternativeDiscovery(session: SessionData): DimensionScore {
  const hypotheses = session.artifact.sections.hypothesis_slate ?? [];

  // Count hypotheses marked as third alternatives
  const thirdAlts = hypotheses.filter((h) => h.third_alternative === true);

  // Check if third alternatives are orthogonal (different mechanism)
  // Heuristic: check if mechanism text is substantially different from other hypotheses
  const isOrthogonal = thirdAlts.some((ta) => {
    const taMech = (ta.mechanism ?? "").toLowerCase();
    const otherMechs = hypotheses
      .filter((h) => h.id !== ta.id && !h.third_alternative)
      .map((h) => (h.mechanism ?? "").toLowerCase());

    // Simple heuristic: check word overlap is low
    const taWords = new Set(taMech.split(/\s+/).filter((w) => w.length > 3));
    if (taWords.size === 0) return false;

    for (const om of otherMechs) {
      const omWords = new Set(om.split(/\s+/).filter((w) => w.length > 3));
      const overlap = [...taWords].filter((w) => omWords.has(w)).length;
      const overlapRatio = overlap / Math.max(taWords.size, 1);
      if (overlapRatio < 0.3) return true; // Low overlap = orthogonal
    }
    return false;
  });

  // Check for different causal structure (look for distinct causal keywords)
  const causalKeywords = [
    "because",
    "causes",
    "leads to",
    "results in",
    "triggers",
    "enables",
    "prevents",
  ];
  const thirdAltsWithCausalStructure = thirdAlts.filter((ta) => {
    const mechLower = (ta.mechanism ?? "").toLowerCase();
    return causalKeywords.some((kw) => mechLower.includes(kw));
  });

  const signals: ScoreSignal[] = [
    {
      signal: "Third alternatives proposed",
      points: 5,
      found: thirdAlts.length > 0,
      evidence: thirdAlts.length > 0 ? `${thirdAlts.length} third alternatives` : undefined,
    },
    {
      signal: "Third alternatives are genuinely orthogonal",
      points: 5,
      found: isOrthogonal,
      evidence: isOrthogonal ? "Mechanism differs substantially from main hypotheses" : undefined,
    },
    {
      signal: "Third alternatives have different causal structure",
      points: 5,
      found: thirdAltsWithCausalStructure.length > 0,
      evidence:
        thirdAltsWithCausalStructure.length > 0
          ? `${thirdAltsWithCausalStructure.length} with distinct causal structure`
          : undefined,
    },
  ];

  return computeDimensionScore("thirdAlternativeDiscovery", signals, 15);
}

/**
 * Score Dimension 6: Experimental Feasibility (0-10)
 *
 * Measures whether tests are actually feasible to run.
 *
 * Signals:
 * - Tests have feasibility assessment (5 pts)
 * - Tests have been executed (5 pts)
 */
export function scoreExperimentalFeasibility(session: SessionData): DimensionScore {
  const tests = session.artifact.sections.discriminative_tests ?? [];

  // Check for feasibility assessments
  const testsWithFeasibility = tests.filter((t) => t.feasibility && t.feasibility.length > 10);

  // Check for executed tests
  const executedTests = tests.filter((t) => t.status && t.status !== "untested");

  const signals: ScoreSignal[] = [
    {
      signal: "Tests have feasibility assessment",
      points: 5,
      found: testsWithFeasibility.length > 0,
      evidence:
        testsWithFeasibility.length > 0
          ? `${testsWithFeasibility.length}/${tests.length} tests have feasibility notes`
          : undefined,
    },
    {
      signal: "Tests have been executed",
      points: 5,
      found: executedTests.length > 0,
      evidence:
        executedTests.length > 0
          ? `${executedTests.length}/${tests.length} tests executed`
          : undefined,
    },
  ];

  return computeDimensionScore("experimentalFeasibility", signals, 10);
}

/**
 * Score Dimension 7: Adversarial Pressure (0-20)
 *
 * Measures whether adversarial critique has been applied.
 *
 * Signals:
 * - Critiques have been logged (8 pts)
 * - Critiques have evidence backing (6 pts)
 * - Real third alternatives proposed from critique (6 pts)
 */
export function scoreAdversarialPressure(session: SessionData): DimensionScore {
  const critiques = session.artifact.sections.adversarial_critique ?? [];

  // Check for logged critiques
  const hasCritiques = critiques.length > 0;

  // Check for evidence-backed critiques
  const critiquesWithEvidence = critiques.filter((c) => c.evidence && c.evidence.length > 20);

  // Check for real third alternatives from critique
  const realThirdAlts = critiques.filter((c) => c.real_third_alternative === true);

  const signals: ScoreSignal[] = [
    {
      signal: "Critiques have been logged",
      points: 8,
      found: hasCritiques,
      evidence: hasCritiques ? `${critiques.length} critiques logged` : undefined,
    },
    {
      signal: "Critiques have evidence backing",
      points: 6,
      found: critiquesWithEvidence.length > 0,
      evidence:
        critiquesWithEvidence.length > 0
          ? `${critiquesWithEvidence.length}/${critiques.length} critiques have evidence`
          : undefined,
    },
    {
      signal: "Real third alternatives proposed from critique",
      points: 6,
      found: realThirdAlts.length > 0,
      evidence:
        realThirdAlts.length > 0
          ? `${realThirdAlts.length} real third alternatives from critique`
          : undefined,
    },
  ];

  return computeDimensionScore("adversarialPressure", signals, 20);
}

// ============================================================================
// Session Scoring Aggregation
// ============================================================================

/**
 * Compute overall grade from total score percentage.
 */
export function computeGrade(totalScore: number, maxScore: number): "A" | "B" | "C" | "D" | "F" {
  if (maxScore === 0) return "F";
  const percentage = (totalScore / maxScore) * 100;
  if (percentage >= 90) return "A";
  if (percentage >= 80) return "B";
  if (percentage >= 70) return "C";
  if (percentage >= 60) return "D";
  return "F";
}

/**
 * Score a complete session across all 7 dimensions.
 *
 * Returns a SessionDimensionScore with individual dimension scores,
 * total score, max possible score, and letter grade.
 */
export function scoreSession(session: SessionData): SessionDimensionScore {
  const paradoxGrounding = scoreParadoxGrounding(session);
  const hypothesisKillRate = scoreHypothesisKillRate(session);
  const testDiscriminability = scoreTestDiscriminability(session);
  const assumptionTracking = scoreAssumptionTracking(session);
  const thirdAlternativeDiscovery = scoreThirdAlternativeDiscovery(session);
  const experimentalFeasibility = scoreExperimentalFeasibility(session);
  const adversarialPressure = scoreAdversarialPressure(session);

  const totalScore =
    paradoxGrounding.points +
    hypothesisKillRate.points +
    testDiscriminability.points +
    assumptionTracking.points +
    thirdAlternativeDiscovery.points +
    experimentalFeasibility.points +
    adversarialPressure.points;

  const maxScore =
    paradoxGrounding.maxPoints +
    hypothesisKillRate.maxPoints +
    testDiscriminability.maxPoints +
    assumptionTracking.maxPoints +
    thirdAlternativeDiscovery.maxPoints +
    experimentalFeasibility.maxPoints +
    adversarialPressure.maxPoints;

  return {
    sessionId: session.sessionId,
    scoredAt: new Date().toISOString(),
    dimensions: {
      paradoxGrounding,
      hypothesisKillRate,
      testDiscriminability,
      assumptionTracking,
      thirdAlternativeDiscovery,
      experimentalFeasibility,
      adversarialPressure,
    },
    totalScore,
    maxScore,
    grade: computeGrade(totalScore, maxScore),
  };
}
