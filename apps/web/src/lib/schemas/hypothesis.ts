import { z } from "zod";

/**
 * Hypothesis Registry Schema
 *
 * Canonical data schema for tracking hypotheses across research sessions.
 * This is foundational infrastructure for the Research Intelligence System.
 *
 * @see specs/artifact_schema_v0.1.md - Section 2: Hypothesis Slate
 * @see specs/evaluation_rubric_v0.1.md - Criteria 4, 5, 6
 * @see brenner_bot-lm3b (bead)
 */

// ============================================================================
// ID Patterns
// ============================================================================

/**
 * Hypothesis ID format: H-{session_id}-{sequence} OR simple H{n}
 * Examples: H-RS20251230-001, H1, H42
 *
 * The session_id portion allows alphanumeric with dashes.
 * The sequence is a 3-digit zero-padded number.
 * Simple format matches artifact-merge generation.
 */
const hypothesisIdPattern = /^H-[A-Za-z0-9][\w.-]*-\d{3}$|^H\d+$/;

/**
 * Assumption ID format: A-{session_id}-{sequence} or simple A{n}
 */
const assumptionIdPattern = /^A-[A-Za-z0-9][\w.-]*-\d{3}$|^A\d+$/;

/**
 * Anomaly ID format: X-{session_id}-{sequence} or simple X{n}
 */
const anomalyIdPattern = /^X-[A-Za-z0-9][\w.-]*-\d{3}$|^X\d+$/;

/**
 * Transcript anchor format: §n or §n-m for ranges
 */
const anchorPattern = /^§\d+(-\d+)?$/;

// ============================================================================
// Enums
// ============================================================================

/**
 * Confidence levels for hypothesis assertions.
 *
 * - high: Strong theoretical/empirical backing
 * - medium: Reasonable but untested
 * - low: Speculative but grounded
 * - speculative: Wild idea worth exploring
 */
export const HypothesisConfidenceSchema = z.enum(["high", "medium", "low", "speculative"]);

export type HypothesisConfidence = z.infer<typeof HypothesisConfidenceSchema>;

/**
 * Categories of hypothesis types.
 *
 * From evaluation rubric - Level Separation (Criteria 4):
 * - mechanistic: Proposes a causal mechanism (HOW)
 * - phenomenological: Describes a pattern without mechanism (WHAT)
 * - boundary: Defines scope/applicability (WHERE/WHEN)
 * - auxiliary: Supporting hypothesis (not the main question)
 * - third_alternative: The "both could be wrong" option (MUST be genuinely orthogonal)
 */
export const HypothesisCategorySchema = z.enum([
  "mechanistic",
  "phenomenological",
  "boundary",
  "auxiliary",
  "third_alternative",
]);

export type HypothesisCategory = z.infer<typeof HypothesisCategorySchema>;

/**
 * How the hypothesis was created/originated.
 *
 * - proposed: Directly proposed by an agent
 * - third_alternative: Created as the required third alternative
 * - refinement: Refined from a parent hypothesis
 * - anomaly_spawned: Created to explain a quarantined anomaly
 */
export const HypothesisOriginSchema = z.enum([
  "proposed",
  "third_alternative",
  "refinement",
  "anomaly_spawned",
]);

export type HypothesisOrigin = z.infer<typeof HypothesisOriginSchema>;

/**
 * Hypothesis lifecycle states.
 *
 * State machine:
 *   proposed -> active -> {confirmed, refuted, superseded, deferred}
 *
 * - proposed: Initial state, not yet evaluated
 * - active: Under active investigation
 * - confirmed: Evidence strongly supports (rare - science is asymmetric)
 * - refuted: Evidence falsifies this hypothesis
 * - superseded: Replaced by a more specific/general hypothesis
 * - deferred: Parked for later (e.g., depends on blocked work)
 */
export const HypothesisStateSchema = z.enum([
  "proposed",
  "active",
  "confirmed",
  "refuted",
  "superseded",
  "deferred",
]);

export type HypothesisState = z.infer<typeof HypothesisStateSchema>;

// ============================================================================
// Main Schema
// ============================================================================

/**
 * The canonical Hypothesis schema.
 *
 * Design principles:
 * 1. Provenance is explicit (anchors, isInference)
 * 2. Links are bidirectional (assumptions, anomalies, critiques)
 * 3. Third alternative is enforced at the set level (see validation helpers)
 * 4. Mechanism is required for mechanistic hypotheses (level separation)
 */
export const HypothesisSchema = z.object({
  // === IDENTITY ===

  /**
   * Stable ID format: H-{session_id}-{sequence}
   * @example "H-RS20251230-001"
   */
  id: z
    .string()
    .regex(hypothesisIdPattern, "Invalid hypothesis ID format (expected H-{session}-{seq})"),

  /**
   * Human-readable claim statement.
   * Should be falsifiable and specific.
   */
  statement: z
    .string()
    .min(10, "Statement must be at least 10 characters")
    .max(500, "Statement must be at most 500 characters"),

  /**
   * HOW would this work? The causal mechanism.
   * REQUIRED for mechanistic hypotheses (enforced via refinement).
   * Should avoid level conflation (program vs interpreter).
   */
  mechanism: z.string().max(1000, "Mechanism description is too long").optional(),

  // === CLASSIFICATION ===

  /**
   * How this hypothesis was created.
   */
  origin: HypothesisOriginSchema,

  /**
   * Type of hypothesis.
   */
  category: HypothesisCategorySchema,

  /**
   * Confidence level.
   */
  confidence: HypothesisConfidenceSchema,

  // === RELATIONSHIPS ===

  /**
   * If this is a refinement/alternative, link to parent hypothesis.
   */
  parentId: z.string().regex(hypothesisIdPattern, "Invalid parent hypothesis ID").optional(),

  /**
   * If spawned from an anomaly, link to the anomaly.
   */
  spawnedFromAnomaly: z.string().regex(anomalyIdPattern, "Invalid anomaly ID format").optional(),

  /**
   * Session where this hypothesis was created.
   */
  sessionId: z.string().min(1, "Session ID is required"),

  /**
   * Agent that proposed this hypothesis.
   */
  proposedBy: z.string().optional(),

  /**
   * Current lifecycle state.
   */
  state: HypothesisStateSchema,

  // === PROVENANCE ===

  /**
   * §n transcript anchors for grounding.
   * Use when this hypothesis derives from transcript content.
   */
  anchors: z
    .array(z.string().regex(anchorPattern, "Invalid anchor format (expected §n or §n-m)"))
    .optional(),

  /**
   * Is this an inference? (not directly from Brenner)
   * If true, should be marked [inference] in artifact rendering.
   */
  isInference: z.boolean().default(false),

  // === LINKS TO OTHER REGISTRIES ===

  /**
   * Which assumptions does this hypothesis depend on?
   * IDs from the Assumption Registry (A-xxx format).
   */
  linkedAssumptions: z
    .array(z.string().regex(assumptionIdPattern, "Invalid assumption ID format"))
    .optional(),

  /**
   * Which anomalies does this hypothesis attempt to explain?
   * IDs from the Anomaly Registry (X-xxx format).
   */
  linkedAnomalies: z
    .array(z.string().regex(anomalyIdPattern, "Invalid anomaly ID format"))
    .optional(),

  /**
   * Count of unresolved critiques targeting this hypothesis.
   * Computed/cached field - do not set directly in most cases.
   */
  unresolvedCritiqueCount: z.number().int().nonnegative().default(0),

  // === TIMESTAMPS ===

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  // === METADATA ===

  /**
   * Tags for categorization and filtering.
   */
  tags: z.array(z.string()).optional(),

  /**
   * Free-form notes.
   */
  notes: z.string().max(2000, "Notes too long").optional(),
});

export type Hypothesis = z.infer<typeof HypothesisSchema>;

/**
 * Check if a mechanistic hypothesis is missing its mechanism.
 * This is a soft validation - call this separately to generate warnings.
 */
export function warnMissingMechanism(hypothesis: Hypothesis): string | null {
  if (hypothesis.category === "mechanistic" && !hypothesis.mechanism) {
    return `Hypothesis ${hypothesis.id}: Mechanistic hypotheses should include a mechanism description`;
  }
  return null;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Level conflation detection patterns.
 * From evaluation rubric "Level Separation" (Criteria 4).
 *
 * These phrases suggest program/interpreter conflation:
 * - "The gene tells the cell to..." (anthropomorphizing)
 * - "The organism decides to..." (agency confusion)
 * - Confusing "won't" (chastity) with "can't" (impotence)
 */
export const LEVEL_CONFLATION_PATTERNS = [
  /the gene (?:tells?|instructs?|commands?|makes?)/i,
  /the (?:organism|cell|protein) (?:decides?|chooses?|wants?)/i,
  /(?:dna|rna|gene) (?:knows?|remembers?|learns?)/i,
  /(?:it|this) (?:wants to|tries to|needs to)/i,
] as const;

/**
 * Placeholder patterns that indicate a low-quality third alternative.
 * These suggest "both could be wrong" without specificity.
 */
const PLACEHOLDER_PATTERNS = [
  /both (?:could be|are|might be) wrong/i,
  /neither (?:is|may be) correct/i,
  /question (?:is|may be) misspecified/i,
] as const;

/**
 * Indicators of a genuinely orthogonal third alternative.
 * These suggest a different causal structure, not just a blend.
 */
const ORTHOGONAL_INDICATORS = [
  /different causal structure/i,
  /shared assumption/i,
  /cross-domain/i,
  /neither.*nor/i,
  /entirely different/i,
  /orthogonal/i,
] as const;

/**
 * Check if text contains level conflation red flags.
 * Returns matching patterns if found.
 */
export function detectLevelConflation(text: string): string[] {
  const matches: string[] = [];
  for (const pattern of LEVEL_CONFLATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      matches.push(match[0]);
    }
  }
  return matches;
}

/**
 * Validate that a hypothesis set includes a third alternative.
 * From evaluation rubric "Third Alternative Presence" (Criteria 5).
 *
 * Quality levels:
 * - 0: No third alternative
 * - 1: Placeholder ("both could be wrong")
 * - 2: Derivative (special case of H1/H2)
 * - 3: Genuinely orthogonal
 */
export function validateThirdAlternative(hypotheses: Hypothesis[]): {
  present: boolean;
  quality: 0 | 1 | 2 | 3;
  message: string;
} {
  const thirdAlt = hypotheses.find((h) => h.category === "third_alternative");

  if (!thirdAlt) {
    return {
      present: false,
      quality: 0,
      message: "No third alternative hypothesis found. Every hypothesis set MUST include one.",
    };
  }

  // Combine statement and mechanism for pattern matching
  // (patterns use /i flag so no need to lowercase)
  const combinedText = `${thirdAlt.statement} ${thirdAlt.mechanism ?? ""}`;

  // Check for placeholder patterns (suggests low quality)
  const isPlaceholder = PLACEHOLDER_PATTERNS.some((p) => p.test(combinedText));

  // Check for orthogonal indicators (suggests high quality)
  const isOrthogonal = ORTHOGONAL_INDICATORS.some((p) => p.test(combinedText));

  // Placeholder without mechanism = quality 1
  if (isPlaceholder && !thirdAlt.mechanism) {
    return {
      present: true,
      quality: 1,
      message:
        "Third alternative is a placeholder. Provide a specific mechanism or alternative framing.",
    };
  }

  if (isOrthogonal) {
    return {
      present: true,
      quality: 3,
      message: "Third alternative appears genuinely orthogonal.",
    };
  }

  if (thirdAlt.mechanism) {
    return {
      present: true,
      quality: 2,
      message:
        "Third alternative has a mechanism but may be derivative. Consider if it truly invalidates both other hypotheses.",
    };
  }

  return {
    present: true,
    quality: 1,
    message: "Third alternative present but quality unclear. Add more specificity.",
  };
}

/**
 * Maximum sequence number for hypothesis IDs.
 * IDs use 3-digit sequences (001-999).
 */
const MAX_HYPOTHESIS_SEQUENCE = 999;

/**
 * Generate a new hypothesis ID for a session.
 * IDs are monotonically increasing within a session.
 *
 * @throws Error if the session already has 999 hypotheses (sequence overflow)
 */
export function generateHypothesisId(sessionId: string, existingIds: string[]): string {
  // Extract sequence numbers for this session
  const prefix = `H-${sessionId}-`;
  const sequences = existingIds
    .filter((id) => id.startsWith(prefix))
    .map((id) => {
      const match = id.match(/-(\d{3})$/);
      return match ? parseInt(match[1], 10) : 0;
    });

  const nextSeq = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;

  if (nextSeq > MAX_HYPOTHESIS_SEQUENCE) {
    throw new Error(
      `Hypothesis sequence overflow for session "${sessionId}": maximum ${MAX_HYPOTHESIS_SEQUENCE} hypotheses per session exceeded`,
    );
  }

  return `${prefix}${nextSeq.toString().padStart(3, "0")}`;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for hypothesis ID format.
 */
export function isValidHypothesisId(id: string): boolean {
  return hypothesisIdPattern.test(id);
}

/**
 * Type guard for anchor format.
 */
export function isValidAnchor(anchor: string): boolean {
  return anchorPattern.test(anchor);
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new hypothesis with required fields and sensible defaults.
 */
export function createHypothesis(input: {
  id: string;
  statement: string;
  sessionId: string;
  category: HypothesisCategory;
  origin?: HypothesisOrigin;
  confidence?: HypothesisConfidence;
  mechanism?: string;
  proposedBy?: string;
  anchors?: string[];
  isInference?: boolean;
}): Hypothesis {
  const now = new Date().toISOString();
  return HypothesisSchema.parse({
    id: input.id,
    statement: input.statement,
    mechanism: input.mechanism,
    origin: input.origin ?? "proposed",
    category: input.category,
    confidence: input.confidence ?? "medium",
    sessionId: input.sessionId,
    proposedBy: input.proposedBy,
    state: "proposed",
    anchors: input.anchors,
    isInference: input.isInference ?? false,
    unresolvedCritiqueCount: 0,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Create a third alternative hypothesis (convenience factory).
 */
export function createThirdAlternative(input: {
  id: string;
  statement: string;
  sessionId: string;
  mechanism: string; // Required for quality third alternatives
  proposedBy?: string;
  anchors?: string[];
}): Hypothesis {
  return createHypothesis({
    ...input,
    category: "third_alternative",
    origin: "third_alternative",
    confidence: "medium",
    isInference: true, // Third alternatives are typically inferences
  });
}
