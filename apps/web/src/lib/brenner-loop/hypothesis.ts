/**
 * HypothesisCard Interface & Validation
 *
 * Core data model for the Brenner Loop hypothesis engine.
 * This represents hypotheses as living, evolving structures with explicit
 * discriminative predictions and falsification conditions.
 *
 * Key Brenner insight operationalized: A hypothesis is only as good as
 * its falsifiability. The `impossibleIfTrue` field forces users to articulate
 * what would disprove their hypothesis.
 *
 * @see brenner_bot-an1n.1 (bead)
 * @see brenner_bot-an1n (parent epic: Hypothesis Engine)
 * @module brenner-loop/hypothesis
 */

// ============================================================================
// Core Interfaces
// ============================================================================

/**
 * Identified confounding variable or alternative explanation.
 *
 * Confounds are potential alternative explanations that could explain
 * the same observations without the hypothesis being true. Different
 * domains have different common confounds (e.g., selection bias in
 * epidemiology, demand characteristics in psychology).
 */
export interface IdentifiedConfound {
  /** Unique identifier for this confound (within the hypothesis) */
  id: string;

  /** Short name for the confound (e.g., "Selection Bias", "Reverse Causation") */
  name: string;

  /** Detailed description of the confounding mechanism */
  description: string;

  /**
   * Estimated likelihood that this confound explains the observations.
   * Range: 0.0 (impossible) to 1.0 (certain).
   */
  likelihood: number;

  /** Domain where this confound is most relevant (e.g., "epidemiology", "psychology") */
  domain: string;

  /**
   * Whether this confound has been addressed (e.g., through study design
   * or additional evidence). Addressed confounds are tracked but not weighted.
   */
  addressed?: boolean;

  /** How the confound was addressed (if applicable) */
  addressedHow?: string;

  /** When the confound was addressed (if applicable) */
  addressedAt?: Date;
}

/**
 * The primary hypothesis unit for the Brenner Loop system.
 *
 * Each hypothesis is a card with:
 * - A core statement and proposed mechanism
 * - Explicit discriminative structure (predictions if true/false, falsification conditions)
 * - Identified weaknesses (confounds, assumptions)
 * - Version tracking for evolution
 * - Confidence tracking for Bayesian updates
 *
 * Design principles:
 * 1. **Immutable Versions**: Changes create new versions with links to parents
 * 2. **Explicit Falsifiability**: `impossibleIfTrue` is required (forces testability)
 * 3. **Domain-Aware**: Track which fields this hypothesis touches
 * 4. **Evolution-Tracked**: Every change has a reason
 */
export interface HypothesisCard {
  /**
   * Stable unique identifier.
   * Format: `HC-{session_id}-{sequence}-v{version}`
   * Example: `HC-RS20260104-001-v1`
   */
  id: string;

  /**
   * Version number, starting at 1.
   * Incremented each time the hypothesis evolves.
   */
  version: number;

  // === Core Statement ===

  /**
   * The hypothesis statement itself.
   * Should be specific, falsifiable, and testable.
   * Avoid vague claims like "X causes Y" without specificity.
   *
   * Length: 10-1000 characters
   */
  statement: string;

  /**
   * The proposed causal mechanism.
   * HOW would this work? What's the causal pathway?
   * Should avoid level conflation (program vs interpreter).
   *
   * Length: 10-500 characters
   */
  mechanism: string;

  /**
   * Research domains this hypothesis touches.
   * Examples: ["psychology", "epidemiology"], ["neuroscience", "computation"]
   */
  domain: string[];

  // === Discriminative Structure (THE KEY INNOVATION) ===

  /**
   * Predictions that MUST be true if the hypothesis is correct.
   * These are positive predictions: "If H is true, we'd observe X, Y, Z."
   *
   * At least 1 entry required.
   */
  predictionsIfTrue: string[];

  /**
   * Predictions that would be true if the hypothesis is WRONG.
   * Helps identify what to look for to falsify.
   *
   * At least 1 entry recommended for quality.
   */
  predictionsIfFalse: string[];

  /**
   * Observations that would DEFINITIVELY FALSIFY the hypothesis.
   * Not just weaken it, but rule it out entirely.
   *
   * This is the core Brenner insight: if you can't specify what would
   * prove you wrong, your hypothesis isn't testable yet.
   *
   * At least 1 entry required (enforced by validation).
   */
  impossibleIfTrue: string[];

  // === Identified Weaknesses ===

  /**
   * Known confounding variables or alternative explanations.
   * Each confound has a likelihood estimate and can be marked as addressed.
   */
  confounds: IdentifiedConfound[];

  /**
   * Background assumptions the hypothesis depends on.
   * These are load-bearing assumptions that, if false, would invalidate the hypothesis.
   * Examples: "Participants understood the survey questions", "Measurement is accurate"
   */
  assumptions: string[];

  // === Tracking ===

  /**
   * Current confidence level (0-100).
   * Updated via Bayesian reasoning based on evidence.
   *
   * Interpretation:
   * - 0-20: Very speculative
   * - 21-40: Interesting but untested
   * - 41-60: Reasonable, some support
   * - 61-80: Strong support, passed discriminative tests
   * - 81-100: Near-certain (rare in science)
   */
  confidence: number;

  /**
   * ID of the parent version this evolved from (if applicable).
   * Links to the previous version in the evolution graph.
   */
  parentVersion?: string;

  /**
   * Why this hypothesis evolved from its parent.
   * Examples: "Refined mechanism after Scale Check", "Split by Level Split operator"
   */
  evolutionReason?: string;

  // === Metadata ===

  /** When this version was created */
  createdAt: Date;

  /** When this version was last updated (metadata only; content is immutable) */
  updatedAt: Date;

  /** Agent or user who created this version */
  createdBy?: string;

  /** Session this hypothesis belongs to */
  sessionId?: string;

  /** Free-form tags for categorization */
  tags?: string[];

  /** Additional notes */
  notes?: string;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Result of validating a HypothesisCard.
 */
export interface ValidationResult {
  /** Whether the card is valid */
  valid: boolean;

  /** List of validation errors (if any) */
  errors: ValidationError[];

  /** List of validation warnings (non-blocking) */
  warnings: ValidationWarning[];
}

/**
 * A validation error that prevents the card from being accepted.
 */
export interface ValidationError {
  /** Field that failed validation */
  field: keyof HypothesisCard | string;

  /** Error message */
  message: string;

  /** Error code for programmatic handling */
  code: ValidationErrorCode;
}

/**
 * A validation warning that doesn't prevent acceptance but suggests improvement.
 */
export interface ValidationWarning {
  /** Field with the warning */
  field: keyof HypothesisCard | string;

  /** Warning message */
  message: string;

  /** Warning code */
  code: ValidationWarningCode;
}

/**
 * Error codes for validation failures.
 */
export type ValidationErrorCode =
  | "MISSING_REQUIRED"
  | "TOO_SHORT"
  | "TOO_LONG"
  | "INVALID_RANGE"
  | "EMPTY_ARRAY"
  | "INVALID_FORMAT"
  | "INVALID_TYPE"
  | "CONFOUND_INVALID";

/**
 * Warning codes for validation suggestions.
 */
export type ValidationWarningCode =
  | "NO_PREDICTIONS_IF_FALSE"
  | "LOW_CONFOUND_COUNT"
  | "NO_ASSUMPTIONS"
  | "NO_DOMAIN"
  | "HIGH_CONFIDENCE_NO_TESTS"
  | "GENERIC_MECHANISM";

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Regex pattern for HypothesisCard IDs.
 * Format: HC-{session_id}-{sequence}-v{version}
 * Example: HC-RS20260104-001-v1
 *
 * The session_id must start with an alphanumeric character and can
 * contain alphanumerics and hyphens. The sequence must be exactly
 * 3 digits (000-999). The pattern uses greedy matching but works
 * correctly via backtracking to find the last -NNN-vN suffix.
 */
const HYPOTHESIS_CARD_ID_PATTERN = /^HC-[A-Za-z0-9][A-Za-z0-9-]*-\d{3}-v\d+$/;

/**
 * Check if an array contains only non-empty strings.
 */
function hasOnlyNonEmptyStrings(arr: string[]): boolean {
  return arr.every((s) => typeof s === "string" && s.trim().length > 0);
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a HypothesisCard for completeness and correctness.
 *
 * Validation rules:
 * - id: required, must match format HC-{session}-{seq}-v{version}
 * - statement: required, 10-1000 chars
 * - mechanism: required, 10-500 chars
 * - predictionsIfTrue: at least 1 non-empty entry
 * - impossibleIfTrue: at least 1 non-empty entry (enforces falsifiability)
 * - confidence: 0-100
 * - confounds: each must have valid structure
 *
 * @param card - The HypothesisCard to validate
 * @returns ValidationResult with errors and warnings
 */
export function validateHypothesisCard(card: HypothesisCard): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // === ID Format ===

  if (!card.id || card.id.trim().length === 0) {
    errors.push({
      field: "id",
      message: "ID is required",
      code: "MISSING_REQUIRED",
    });
  } else if (!HYPOTHESIS_CARD_ID_PATTERN.test(card.id)) {
    errors.push({
      field: "id",
      message: `ID must match format HC-{session}-{seq}-v{version} (got "${card.id}")`,
      code: "INVALID_FORMAT",
    });
  }

  // === Required Fields ===
  // Use trimmed length consistently for all checks

  const statementTrimmed = card.statement?.trim() ?? "";
  if (statementTrimmed.length === 0) {
    errors.push({
      field: "statement",
      message: "Statement is required",
      code: "MISSING_REQUIRED",
    });
  } else if (statementTrimmed.length < 10) {
    errors.push({
      field: "statement",
      message: `Statement must be at least 10 characters (got ${statementTrimmed.length})`,
      code: "TOO_SHORT",
    });
  } else if (statementTrimmed.length > 1000) {
    errors.push({
      field: "statement",
      message: `Statement must be at most 1000 characters (got ${statementTrimmed.length})`,
      code: "TOO_LONG",
    });
  }

  const mechanismTrimmed = card.mechanism?.trim() ?? "";
  if (mechanismTrimmed.length === 0) {
    errors.push({
      field: "mechanism",
      message: "Mechanism is required",
      code: "MISSING_REQUIRED",
    });
  } else if (mechanismTrimmed.length < 10) {
    errors.push({
      field: "mechanism",
      message: `Mechanism must be at least 10 characters (got ${mechanismTrimmed.length})`,
      code: "TOO_SHORT",
    });
  } else if (mechanismTrimmed.length > 500) {
    errors.push({
      field: "mechanism",
      message: `Mechanism must be at most 500 characters (got ${mechanismTrimmed.length})`,
      code: "TOO_LONG",
    });
  }

  // === Discriminative Structure ===

  if (!card.predictionsIfTrue || card.predictionsIfTrue.length === 0) {
    errors.push({
      field: "predictionsIfTrue",
      message: "At least one prediction if true is required",
      code: "EMPTY_ARRAY",
    });
  } else if (!hasOnlyNonEmptyStrings(card.predictionsIfTrue)) {
    errors.push({
      field: "predictionsIfTrue",
      message: "All predictions must be non-empty strings",
      code: "INVALID_FORMAT",
    });
  }

  if (!card.impossibleIfTrue || card.impossibleIfTrue.length === 0) {
    errors.push({
      field: "impossibleIfTrue",
      message:
        "At least one falsification condition is required. If you can't specify what would prove you wrong, your hypothesis isn't testable yet.",
      code: "EMPTY_ARRAY",
    });
  } else if (!hasOnlyNonEmptyStrings(card.impossibleIfTrue)) {
    errors.push({
      field: "impossibleIfTrue",
      message: "All falsification conditions must be non-empty strings",
      code: "INVALID_FORMAT",
    });
  }

  // Warning for missing predictionsIfFalse (not required but recommended)
  if (!card.predictionsIfFalse || card.predictionsIfFalse.length === 0) {
    warnings.push({
      field: "predictionsIfFalse",
      message: "Consider adding predictions for when the hypothesis is wrong",
      code: "NO_PREDICTIONS_IF_FALSE",
    });
  } else if (!hasOnlyNonEmptyStrings(card.predictionsIfFalse)) {
    // Warn if array exists but contains empty strings
    warnings.push({
      field: "predictionsIfFalse",
      message: "Some predictions are empty - consider removing or filling them in",
      code: "NO_PREDICTIONS_IF_FALSE",
    });
  }

  // === Confidence ===

  if (typeof card.confidence !== "number" || !Number.isFinite(card.confidence)) {
    errors.push({
      field: "confidence",
      message: "Confidence must be a finite number",
      code: "INVALID_TYPE",
    });
  } else if (card.confidence < 0 || card.confidence > 100) {
    errors.push({
      field: "confidence",
      message: `Confidence must be between 0 and 100 (got ${card.confidence})`,
      code: "INVALID_RANGE",
    });
  }

  // === Version ===

  if (
    typeof card.version !== "number" ||
    !Number.isFinite(card.version) ||
    !Number.isInteger(card.version) ||
    card.version < 1
  ) {
    errors.push({
      field: "version",
      message: "Version must be a positive integer",
      code: "INVALID_RANGE",
    });
  }

  // === Date Fields ===

  if (!isValidDateOrString(card.createdAt)) {
    errors.push({
      field: "createdAt",
      message: "createdAt must be a valid Date or ISO date string",
      code: "INVALID_TYPE",
    });
  }

  if (!isValidDateOrString(card.updatedAt)) {
    errors.push({
      field: "updatedAt",
      message: "updatedAt must be a valid Date or ISO date string",
      code: "INVALID_TYPE",
    });
  }

  // === Confounds ===

  if (card.confounds && card.confounds.length > 0) {
    for (let i = 0; i < card.confounds.length; i++) {
      const confound = card.confounds[i];
      const prefix = `confounds[${i}]`;

      if (!confound.id || confound.id.trim().length === 0) {
        errors.push({
          field: `${prefix}.id`,
          message: "Confound ID is required",
          code: "CONFOUND_INVALID",
        });
      }

      if (!confound.name || confound.name.trim().length === 0) {
        errors.push({
          field: `${prefix}.name`,
          message: "Confound name is required",
          code: "CONFOUND_INVALID",
        });
      }

      if (!confound.description || confound.description.trim().length === 0) {
        errors.push({
          field: `${prefix}.description`,
          message: "Confound description is required",
          code: "CONFOUND_INVALID",
        });
      }

      if (
        typeof confound.likelihood !== "number" ||
        !Number.isFinite(confound.likelihood) ||
        confound.likelihood < 0 ||
        confound.likelihood > 1
      ) {
        errors.push({
          field: `${prefix}.likelihood`,
          message: "Confound likelihood must be a finite number between 0 and 1",
          code: "CONFOUND_INVALID",
        });
      }

      if (!confound.domain || confound.domain.trim().length === 0) {
        errors.push({
          field: `${prefix}.domain`,
          message: "Confound domain is required",
          code: "CONFOUND_INVALID",
        });
      }
    }
  } else {
    warnings.push({
      field: "confounds",
      message: "Consider identifying potential confounding variables",
      code: "LOW_CONFOUND_COUNT",
    });
  }

  // === Warnings for Quality ===

  if (!card.domain || card.domain.length === 0) {
    warnings.push({
      field: "domain",
      message: "Consider specifying which domains this hypothesis touches",
      code: "NO_DOMAIN",
    });
  }

  if (!card.assumptions || card.assumptions.length === 0) {
    warnings.push({
      field: "assumptions",
      message: "Consider listing the assumptions this hypothesis depends on",
      code: "NO_ASSUMPTIONS",
    });
  }

  // Check for generic mechanism patterns (use trimmed to match ^ correctly)
  const genericMechanismPatterns = [/^causes?\s/i, /^leads?\sto\s/i, /^results?\sin\s/i];
  if (
    mechanismTrimmed.length > 0 &&
    genericMechanismPatterns.some((p) => p.test(mechanismTrimmed))
  ) {
    warnings.push({
      field: "mechanism",
      message: "Mechanism appears generic. Consider specifying the causal pathway in more detail.",
      code: "GENERIC_MECHANISM",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate an IdentifiedConfound for completeness.
 *
 * @param confound - The confound to validate
 * @returns ValidationResult
 */
export function validateConfound(confound: IdentifiedConfound): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!confound.id || confound.id.trim().length === 0) {
    errors.push({
      field: "id",
      message: "Confound ID is required",
      code: "MISSING_REQUIRED",
    });
  }

  if (!confound.name || confound.name.trim().length === 0) {
    errors.push({
      field: "name",
      message: "Confound name is required",
      code: "MISSING_REQUIRED",
    });
  }

  if (!confound.description || confound.description.trim().length === 0) {
    errors.push({
      field: "description",
      message: "Confound description is required",
      code: "MISSING_REQUIRED",
    });
  }

  if (typeof confound.likelihood !== "number" || !Number.isFinite(confound.likelihood)) {
    errors.push({
      field: "likelihood",
      message: "Likelihood must be a finite number",
      code: "INVALID_TYPE",
    });
  } else if (confound.likelihood < 0 || confound.likelihood > 1) {
    errors.push({
      field: "likelihood",
      message: `Likelihood must be between 0 and 1 (got ${confound.likelihood})`,
      code: "INVALID_RANGE",
    });
  }

  if (!confound.domain || confound.domain.trim().length === 0) {
    errors.push({
      field: "domain",
      message: "Domain is required",
      code: "MISSING_REQUIRED",
    });
  }

  // Validate optional fields have correct types if present
  if (confound.addressed !== undefined && typeof confound.addressed !== "boolean") {
    errors.push({
      field: "addressed",
      message: "addressed must be a boolean if provided",
      code: "INVALID_TYPE",
    });
  }

  if (confound.addressedHow !== undefined && typeof confound.addressedHow !== "string") {
    errors.push({
      field: "addressedHow",
      message: "addressedHow must be a string if provided",
      code: "INVALID_TYPE",
    });
  }

  if (confound.addressedAt !== undefined && !isValidDateOrString(confound.addressedAt)) {
    errors.push({
      field: "addressedAt",
      message: "addressedAt must be a valid Date or ISO date string if provided",
      code: "INVALID_TYPE",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a valid Date or ISO date string.
 * Handles both Date objects and serialized date strings (from JSON).
 */
function isValidDateOrString(value: unknown): boolean {
  if (value instanceof Date) {
    return !isNaN(value.getTime());
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return !isNaN(parsed);
  }
  return false;
}

/**
 * Check if an array contains only strings.
 */
function isStringArray(arr: unknown[]): arr is string[] {
  return arr.every((item) => typeof item === "string");
}

/**
 * Type guard to check if an unknown value is a valid HypothesisCard.
 *
 * Handles both fresh objects (with Date instances) and deserialized
 * objects (with ISO date strings, e.g., from JSON/localStorage).
 *
 * @param obj - The value to check
 * @returns True if obj is a HypothesisCard
 */
export function isHypothesisCard(obj: unknown): obj is HypothesisCard {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const card = obj as Record<string, unknown>;

  // Check required fields exist with correct types
  if (typeof card.id !== "string") return false;
  if (typeof card.version !== "number") return false;
  if (typeof card.statement !== "string") return false;
  if (typeof card.mechanism !== "string") return false;
  if (typeof card.confidence !== "number") return false;

  // Check arrays exist and contain correct element types
  if (!Array.isArray(card.domain) || !isStringArray(card.domain)) return false;
  if (!Array.isArray(card.predictionsIfTrue) || !isStringArray(card.predictionsIfTrue))
    return false;
  if (!Array.isArray(card.predictionsIfFalse) || !isStringArray(card.predictionsIfFalse))
    return false;
  if (!Array.isArray(card.impossibleIfTrue) || !isStringArray(card.impossibleIfTrue)) return false;
  if (!Array.isArray(card.assumptions) || !isStringArray(card.assumptions)) return false;

  // Check confounds array contains valid IdentifiedConfound objects
  if (!Array.isArray(card.confounds)) return false;
  if (!card.confounds.every((c) => isIdentifiedConfound(c))) return false;

  // Handle both Date objects and ISO date strings (from JSON serialization)
  if (!isValidDateOrString(card.createdAt)) return false;
  if (!isValidDateOrString(card.updatedAt)) return false;

  // Validate ranges (use Number.isFinite to catch NaN/Infinity)
  if (!Number.isFinite(card.confidence) || card.confidence < 0 || card.confidence > 100)
    return false;
  if (!Number.isInteger(card.version) || card.version < 1) return false;

  // Validate optional fields have correct types if present
  if (card.parentVersion !== undefined && typeof card.parentVersion !== "string") return false;
  if (card.evolutionReason !== undefined && typeof card.evolutionReason !== "string") return false;
  if (card.createdBy !== undefined && typeof card.createdBy !== "string") return false;
  if (card.sessionId !== undefined && typeof card.sessionId !== "string") return false;
  if (card.notes !== undefined && typeof card.notes !== "string") return false;
  if (card.tags !== undefined && (!Array.isArray(card.tags) || !isStringArray(card.tags)))
    return false;

  return true;
}

/**
 * Type guard to check if an unknown value is a valid IdentifiedConfound.
 *
 * @param obj - The value to check
 * @returns True if obj is an IdentifiedConfound
 */
export function isIdentifiedConfound(obj: unknown): obj is IdentifiedConfound {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  const confound = obj as Record<string, unknown>;

  // Check required fields
  if (typeof confound.id !== "string") return false;
  if (typeof confound.name !== "string") return false;
  if (typeof confound.description !== "string") return false;
  if (typeof confound.likelihood !== "number") return false;
  if (typeof confound.domain !== "string") return false;

  // Validate range (use Number.isFinite to catch NaN/Infinity)
  if (!Number.isFinite(confound.likelihood) || confound.likelihood < 0 || confound.likelihood > 1)
    return false;

  // Validate optional fields have correct types if present
  if (confound.addressed !== undefined && typeof confound.addressed !== "boolean") return false;
  if (confound.addressedHow !== undefined && typeof confound.addressedHow !== "string")
    return false;
  if (confound.addressedAt !== undefined && !isValidDateOrString(confound.addressedAt))
    return false;

  return true;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Pattern for valid session IDs: must start with alphanumeric,
 * followed by alphanumerics or hyphens.
 */
const SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]*$/;

/**
 * Generate a new HypothesisCard ID.
 *
 * @param sessionId - The session this hypothesis belongs to (alphanumeric + hyphens)
 * @param sequence - The sequence number within the session (0-999)
 * @param version - The version number (default 1, must be positive integer)
 * @returns A formatted ID string
 * @throws Error if inputs are invalid
 */
export function generateHypothesisCardId(
  sessionId: string,
  sequence: number,
  version: number = 1,
): string {
  // Validate sessionId
  if (!sessionId || !SESSION_ID_PATTERN.test(sessionId)) {
    throw new Error(
      `Invalid sessionId: must start with alphanumeric and contain only alphanumerics/hyphens (got "${sessionId}")`,
    );
  }

  // Validate sequence (must be integer 0-999)
  if (!Number.isInteger(sequence) || sequence < 0 || sequence > 999) {
    throw new Error(`Invalid sequence: must be an integer from 0-999 (got ${sequence})`);
  }

  // Validate version (must be positive integer)
  if (!Number.isInteger(version) || version < 1) {
    throw new Error(`Invalid version: must be a positive integer (got ${version})`);
  }

  const paddedSeq = sequence.toString().padStart(3, "0");
  return `HC-${sessionId}-${paddedSeq}-v${version}`;
}

/**
 * Generate a new confound ID.
 *
 * @param hypothesisId - The parent hypothesis ID (must match HypothesisCard ID format)
 * @param sequence - The sequence number within the hypothesis (0-99)
 * @returns A formatted confound ID
 * @throws Error if inputs are invalid
 */
export function generateConfoundId(hypothesisId: string, sequence: number): string {
  // Validate hypothesisId matches the expected pattern
  if (!hypothesisId || !HYPOTHESIS_CARD_ID_PATTERN.test(hypothesisId)) {
    throw new Error(
      `Invalid hypothesisId: must match HC-{session}-{seq}-v{version} format (got "${hypothesisId}")`,
    );
  }

  // Validate sequence (must be integer 0-99)
  if (!Number.isInteger(sequence) || sequence < 0 || sequence > 99) {
    throw new Error(`Invalid sequence: must be an integer from 0-99 (got ${sequence})`);
  }

  return `${hypothesisId}-CF${sequence.toString().padStart(2, "0")}`;
}

/**
 * Create a new HypothesisCard with required fields and sensible defaults.
 *
 * @param input - The input fields for the new hypothesis
 * @returns A fully populated HypothesisCard
 * @throws Error if validation fails
 */
export function createHypothesisCard(input: {
  id: string;
  statement: string;
  mechanism: string;
  domain?: string[];
  predictionsIfTrue: string[];
  predictionsIfFalse?: string[];
  impossibleIfTrue: string[];
  confounds?: IdentifiedConfound[];
  assumptions?: string[];
  confidence?: number;
  parentVersion?: string;
  evolutionReason?: string;
  createdBy?: string;
  sessionId?: string;
  tags?: string[];
  notes?: string;
}): HypothesisCard {
  const now = new Date();

  const card: HypothesisCard = {
    id: input.id,
    version: 1,
    statement: input.statement,
    mechanism: input.mechanism,
    domain: input.domain ?? [],
    predictionsIfTrue: input.predictionsIfTrue,
    predictionsIfFalse: input.predictionsIfFalse ?? [],
    impossibleIfTrue: input.impossibleIfTrue,
    confounds: input.confounds ?? [],
    assumptions: input.assumptions ?? [],
    confidence: input.confidence ?? 50,
    parentVersion: input.parentVersion,
    evolutionReason: input.evolutionReason,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
    sessionId: input.sessionId,
    tags: input.tags,
    notes: input.notes,
  };

  // Validate the created card
  const result = validateHypothesisCard(card);
  if (!result.valid) {
    const errorMessages = result.errors.map((e) => `${e.field}: ${e.message}`);
    throw new Error(`Invalid HypothesisCard: ${errorMessages.join("; ")}`);
  }

  return card;
}

/**
 * Evolve a HypothesisCard to a new version.
 *
 * Creates a new card with incremented version, linked to the parent,
 * and the specified changes applied.
 *
 * @param current - The current hypothesis card
 * @param changes - Partial changes to apply
 * @param reason - Why the hypothesis is evolving
 * @param createdBy - Who is creating this new version
 * @returns A new HypothesisCard with incremented version
 */
export function evolveHypothesisCard(
  current: HypothesisCard,
  changes: Partial<
    Omit<
      HypothesisCard,
      | "id"
      | "version"
      | "parentVersion"
      | "createdAt"
      | "updatedAt"
      | "evolutionReason"
      | "createdBy"
    >
  >,
  reason: string,
  createdBy?: string,
): HypothesisCard {
  const now = new Date();

  // Parse the current ID to get base and increment version
  // Use the version from the ID (not the version field) to ensure ID consistency
  const idParts = current.id.match(/^(HC-.*-\d{3})-v(\d+)$/);
  if (!idParts) {
    throw new Error(`Invalid hypothesis ID format: ${current.id}`);
  }

  const baseId = idParts[1];
  const idVersion = parseInt(idParts[2], 10);
  const newVersion = idVersion + 1;
  const newId = `${baseId}-v${newVersion}`;

  const evolved: HypothesisCard = {
    ...current,
    ...changes,
    id: newId,
    version: newVersion,
    parentVersion: current.id,
    evolutionReason: reason,
    createdAt: now,
    updatedAt: now,
    createdBy: createdBy ?? current.createdBy,
  };

  // Validate the evolved card
  const result = validateHypothesisCard(evolved);
  if (!result.valid) {
    const errorMessages = result.errors.map((e) => `${e.field}: ${e.message}`);
    throw new Error(`Invalid evolved HypothesisCard: ${errorMessages.join("; ")}`);
  }

  return evolved;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate a falsifiability score based on the quality of impossibleIfTrue entries.
 *
 * Higher scores indicate better-defined falsification conditions.
 *
 * @param card - The hypothesis card to score
 * @returns A score from 0-100
 */
export function calculateFalsifiabilityScore(card: HypothesisCard): number {
  // Filter out empty/whitespace-only strings for accurate scoring
  const validConditions = (card.impossibleIfTrue || []).filter((s) => s.trim().length > 0);

  if (validConditions.length === 0) {
    return 0;
  }

  let score = 0;

  // Base score for having any falsification conditions
  score += 20;

  // Bonus for multiple conditions
  score += Math.min(validConditions.length * 10, 30);

  // Bonus for specificity (longer = more specific, up to a point)
  const avgLength =
    validConditions.reduce((sum, c) => sum + c.trim().length, 0) / validConditions.length;
  if (avgLength > 50) score += 20;
  else if (avgLength > 25) score += 10;

  // Bonus for having predictionsIfFalse as well
  const validPredictionsFalse = (card.predictionsIfFalse || []).filter((s) => s.trim().length > 0);
  if (validPredictionsFalse.length > 0) {
    score += 20;
  }

  // Penalty for very high confidence without many falsification conditions
  if (card.confidence > 80 && validConditions.length < 2) {
    score -= 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate a specificity score based on how precise the predictions are.
 *
 * @param card - The hypothesis card to score
 * @returns A score from 0-100
 */
export function calculateSpecificityScore(card: HypothesisCard): number {
  let score = 0;

  // Filter out empty/whitespace-only strings for accurate scoring
  // Use defensive access pattern for runtime safety (e.g., malformed JSON input)
  const validPredictions = (card.predictionsIfTrue || []).filter((s) => s.trim().length > 0);
  const validDomains = (card.domain || []).filter((s) => s.trim().length > 0);

  // Score based on predictions if true
  if (validPredictions.length > 0) {
    score += 20;
    score += Math.min(validPredictions.length * 5, 20);
  }

  // Score based on mechanism detail (use trimmed length)
  const mechanismLength = (card.mechanism || "").trim().length;
  if (mechanismLength > 100) score += 20;
  else if (mechanismLength > 50) score += 10;

  // Score based on domain specificity
  if (validDomains.length > 0) score += 10;
  if (validDomains.length > 1) score += 10;

  // Score based on confound identification
  const confoundsCount = (card.confounds || []).length;
  if (confoundsCount > 0) {
    score += 10;
    score += Math.min(confoundsCount * 5, 10);
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Get a human-readable interpretation of the confidence level.
 *
 * @param confidence - The confidence value (0-100)
 * @returns A string interpretation (or "Unknown confidence" for NaN/Infinity)
 */
export function interpretConfidence(confidence: number): string {
  // Guard against NaN/Infinity and return a safe label for UI rendering.
  if (!Number.isFinite(confidence)) {
    return "Unknown confidence";
  }

  // Clamp to valid range for interpretation
  const clamped = Math.max(0, Math.min(100, confidence));

  if (clamped < 20) return "Very speculative";
  if (clamped < 40) return "Interesting but untested";
  if (clamped < 60) return "Reasonable, some support";
  if (clamped < 80) return "Strong support";
  return "Near-certain";
}
