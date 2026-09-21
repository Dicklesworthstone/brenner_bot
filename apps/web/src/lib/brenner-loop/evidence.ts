/**
 * Evidence Ledger Data Model
 *
 * Core data structures for recording evidence and tracking its impact
 * on hypothesis confidence in the Brenner Loop system.
 *
 * Evidence entries capture:
 * - The test that was executed
 * - Predictions made before the test
 * - Observed results
 * - Impact on confidence
 * - Metadata for audit trails
 *
 * @see brenner_bot-njjo.1 (bead)
 * @see brenner_bot-njjo (parent epic: Evidence Ledger)
 * @module brenner-loop/evidence
 */

// ============================================================================
// Test Types
// ============================================================================

/**
 * Types of tests that can generate evidence.
 *
 * Each test type has different discriminative power and appropriate contexts:
 *
 * - natural_experiment: Observational study with natural variation
 * - controlled_study: Experiment with controlled conditions
 * - cross_context: Testing hypothesis in different contexts/systems
 * - mechanism_block: Testing by blocking proposed mechanism
 * - dose_response: Testing for dose-dependent effects
 * - literature: Evidence from published literature
 * - observation: Direct observational data
 * - temporal_analysis: Analysis of temporal patterns
 */
export type TestType =
  | "natural_experiment"
  | "controlled_study"
  | "cross_context"
  | "mechanism_block"
  | "dose_response"
  | "literature"
  | "observation"
  | "temporal_analysis";

/**
 * All valid test types for type guard
 */
const VALID_TEST_TYPES: TestType[] = [
  "natural_experiment",
  "controlled_study",
  "cross_context",
  "mechanism_block",
  "dose_response",
  "literature",
  "observation",
  "temporal_analysis",
];

/**
 * Human-readable labels for test types
 */
export const TEST_TYPE_LABELS: Record<TestType, string> = {
  natural_experiment: "Natural Experiment",
  controlled_study: "Controlled Study",
  cross_context: "Cross-Context Test",
  mechanism_block: "Mechanism Block",
  dose_response: "Dose-Response",
  literature: "Literature Evidence",
  observation: "Direct Observation",
  temporal_analysis: "Temporal Analysis",
};

/**
 * Type guard for TestType
 */
export function isTestType(value: unknown): value is TestType {
  return typeof value === "string" && VALID_TEST_TYPES.includes(value as TestType);
}

// ============================================================================
// Evidence Result Types
// ============================================================================

/**
 * Result of a test/evidence evaluation.
 *
 * - supports: Evidence is consistent with hypothesis being true
 * - challenges: Evidence contradicts the hypothesis
 * - inconclusive: Evidence doesn't clearly support or challenge
 */
export type EvidenceResult = "supports" | "challenges" | "inconclusive";

/**
 * Type guard for EvidenceResult
 */
export function isEvidenceResult(value: unknown): value is EvidenceResult {
  return value === "supports" || value === "challenges" || value === "inconclusive";
}

// ============================================================================
// Discriminative Power
// ============================================================================

/**
 * Discriminative power of a test (1-5 scale).
 *
 * 1: Low - test doesn't strongly distinguish hypotheses
 * 2: Moderate-low - some discriminative value
 * 3: Moderate - reasonable discriminative power
 * 4: High - strongly distinguishes between hypotheses
 * 5: Decisive - can definitively rule out hypotheses
 */
export type DiscriminativePower = 1 | 2 | 3 | 4 | 5;

/**
 * Valid discriminative power values for type guard
 */
const VALID_DISCRIMINATIVE_POWERS: readonly number[] = [1, 2, 3, 4, 5];

/**
 * Type guard for DiscriminativePower
 */
export function isDiscriminativePower(value: unknown): value is DiscriminativePower {
  return typeof value === "number" && VALID_DISCRIMINATIVE_POWERS.includes(value);
}

/**
 * Human-readable labels for discriminative power
 */
export const DISCRIMINATIVE_POWER_LABELS: Record<DiscriminativePower, string> = {
  1: "Low",
  2: "Moderate-Low",
  3: "Moderate",
  4: "High",
  5: "Decisive",
};

// ============================================================================
// Test Description (Embedded in EvidenceEntry)
// ============================================================================

/**
 * Description of the test that generated the evidence.
 * Embedded within EvidenceEntry for context.
 */
export interface TestDescription {
  /** Test ID (references TestRecord registry) */
  id: string;

  /** Human-readable description of the test */
  description: string;

  /** Type of test */
  type: TestType;

  /** How well this test discriminates between hypotheses (1-5) */
  discriminativePower: DiscriminativePower;
}

// ============================================================================
// EvidenceEntry Interface (Comprehensive Version)
// ============================================================================

/**
 * A COMPREHENSIVE record of evidence collected during hypothesis testing.
 *
 * **IMPORTANT**: This is the FULL evidence interface with complete audit trails.
 * It is exported as `FullEvidenceEntry` from the brenner-loop module to
 * distinguish it from the simplified `EvidenceEntry` in `types.ts`.
 *
 * **Why two interfaces exist:**
 * - This interface (`FullEvidenceEntry`): Complete evidence tracking with test
 *   descriptions, pre-registered predictions, confidence tracking, and full
 *   metadata. Use for evidence analysis, validation, and detailed reporting.
 *
 * - `EvidenceEntry` (in types.ts): Simplified interface for lightweight evidence
 *   tracking within `Session.evidenceLedger`. Use for session-embedded storage.
 *
 * Each entry captures:
 * - The test that was performed (with full TestDescription)
 * - Pre-registered predictions (if true/if false)
 * - The observed outcome
 * - Impact on confidence (before/after)
 * - Metadata for audit trails
 *
 * Key Brenner insight: Evidence without pre-registered predictions
 * is much weaker than evidence that confirms/refutes a prediction.
 *
 * @see EvidenceEntry in types.ts - Simplified session-embedded version
 */
export interface EvidenceEntry {
  /** Unique identifier for this evidence entry */
  id: string;

  /** Session ID this evidence belongs to */
  sessionId: string;

  /** Hypothesis version being tested (HypothesisCard ID) */
  hypothesisVersion: string;

  // === The Test ===

  /** Description of the test that generated this evidence */
  test: TestDescription;

  // === Predictions (Pre-registered) ===

  /**
   * What was predicted if the hypothesis is TRUE.
   * Pre-registration is key to honest testing.
   */
  predictionIfTrue: string;

  /**
   * What was predicted if the hypothesis is FALSE.
   * Required for discriminative testing.
   */
  predictionIfFalse: string;

  // === Result ===

  /**
   * Does this evidence support, challenge, or inconclusively relate
   * to the hypothesis?
   */
  result: EvidenceResult;

  /**
   * The actual observation or finding.
   * Should be factual, not interpretive.
   */
  observation: string;

  /**
   * Citation or reference for the evidence.
   * Could be a paper DOI, experiment ID, data file path, etc.
   */
  source?: string;

  // === Impact ===

  /**
   * Confidence level before this evidence was recorded (0-100).
   */
  confidenceBefore: number;

  /**
   * Confidence level after incorporating this evidence (0-100).
   */
  confidenceAfter: number;

  /**
   * Interpretation of how this evidence affects our beliefs.
   * Should explain why confidence changed (or didn't).
   */
  interpretation: string;

  // === Metadata ===

  /** When this evidence was recorded */
  recordedAt: Date;

  /** Who recorded this evidence (agent name or "user") */
  recordedBy?: string;

  /** Additional notes */
  notes?: string;

  /** Tags for categorization */
  tags?: string[];
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Result of validating an EvidenceEntry
 */
export interface EvidenceValidationResult {
  /** Whether the entry is valid */
  valid: boolean;

  /** List of validation errors */
  errors: EvidenceValidationError[];

  /** List of validation warnings */
  warnings: EvidenceValidationWarning[];
}

/**
 * A validation error for EvidenceEntry
 */
export interface EvidenceValidationError {
  /** Field that failed validation */
  field: keyof EvidenceEntry | string;

  /** Error message */
  message: string;

  /** Error code */
  code: EvidenceValidationErrorCode;
}

/**
 * A validation warning for EvidenceEntry
 */
export interface EvidenceValidationWarning {
  /** Field with the warning */
  field: keyof EvidenceEntry | string;

  /** Warning message */
  message: string;

  /** Warning code */
  code: EvidenceValidationWarningCode;
}

/**
 * Error codes for evidence validation
 */
export type EvidenceValidationErrorCode =
  | "MISSING_REQUIRED"
  | "INVALID_TYPE"
  | "INVALID_RANGE"
  | "INVALID_FORMAT"
  | "TEST_INVALID";

/**
 * Warning codes for evidence validation
 */
export type EvidenceValidationWarningCode =
  | "LOW_DISCRIMINATIVE_POWER"
  | "NO_SOURCE"
  | "NO_INTERPRETATION"
  | "SMALL_CONFIDENCE_CHANGE";

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if a value is a valid Date or ISO date string.
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
 * Validate a TestDescription object
 */
function validateTestDescription(test: unknown, errors: EvidenceValidationError[]): boolean {
  if (typeof test !== "object" || test === null) {
    errors.push({
      field: "test",
      message: "Test description is required and must be an object",
      code: "MISSING_REQUIRED",
    });
    return false;
  }

  const t = test as Record<string, unknown>;
  let valid = true;

  if (!t.id || typeof t.id !== "string" || t.id.trim().length === 0) {
    errors.push({
      field: "test.id",
      message: "Test ID is required",
      code: "TEST_INVALID",
    });
    valid = false;
  }

  if (!t.description || typeof t.description !== "string" || t.description.trim().length === 0) {
    errors.push({
      field: "test.description",
      message: "Test description is required",
      code: "TEST_INVALID",
    });
    valid = false;
  }

  if (!isTestType(t.type)) {
    errors.push({
      field: "test.type",
      message: `Test type must be one of: ${VALID_TEST_TYPES.join(", ")}`,
      code: "TEST_INVALID",
    });
    valid = false;
  }

  if (!isDiscriminativePower(t.discriminativePower)) {
    errors.push({
      field: "test.discriminativePower",
      message: "Discriminative power must be an integer from 1-5",
      code: "TEST_INVALID",
    });
    valid = false;
  }

  return valid;
}

/**
 * Validate an EvidenceEntry for completeness and correctness.
 *
 * Validation rules:
 * - id: required
 * - sessionId: required
 * - hypothesisVersion: required
 * - test: required, must be valid TestDescription
 * - predictionIfTrue: required
 * - predictionIfFalse: required
 * - result: required, must be valid EvidenceResult
 * - observation: required
 * - confidenceBefore: 0-100
 * - confidenceAfter: 0-100
 * - interpretation: required
 * - recordedAt: valid date
 *
 * @param entry - The EvidenceEntry to validate
 * @returns EvidenceValidationResult with errors and warnings
 */
export function validateEvidenceEntry(entry: EvidenceEntry): EvidenceValidationResult {
  const errors: EvidenceValidationError[] = [];
  const warnings: EvidenceValidationWarning[] = [];

  // === Required String Fields ===

  if (!entry.id || entry.id.trim().length === 0) {
    errors.push({
      field: "id",
      message: "ID is required",
      code: "MISSING_REQUIRED",
    });
  }

  if (!entry.sessionId || entry.sessionId.trim().length === 0) {
    errors.push({
      field: "sessionId",
      message: "Session ID is required",
      code: "MISSING_REQUIRED",
    });
  }

  if (!entry.hypothesisVersion || entry.hypothesisVersion.trim().length === 0) {
    errors.push({
      field: "hypothesisVersion",
      message: "Hypothesis version is required",
      code: "MISSING_REQUIRED",
    });
  }

  // === Test Description ===

  validateTestDescription(entry.test, errors);

  // === Predictions ===

  if (!entry.predictionIfTrue || entry.predictionIfTrue.trim().length === 0) {
    errors.push({
      field: "predictionIfTrue",
      message: "Prediction if true is required for discriminative testing",
      code: "MISSING_REQUIRED",
    });
  }

  if (!entry.predictionIfFalse || entry.predictionIfFalse.trim().length === 0) {
    errors.push({
      field: "predictionIfFalse",
      message: "Prediction if false is required for discriminative testing",
      code: "MISSING_REQUIRED",
    });
  }

  // === Result ===

  if (!isEvidenceResult(entry.result)) {
    errors.push({
      field: "result",
      message: "Result must be 'supports', 'challenges', or 'inconclusive'",
      code: "INVALID_TYPE",
    });
  }

  if (!entry.observation || entry.observation.trim().length === 0) {
    errors.push({
      field: "observation",
      message: "Observation is required when recording evidence",
      code: "MISSING_REQUIRED",
    });
  }

  // === Confidence ===

  if (typeof entry.confidenceBefore !== "number" || !Number.isFinite(entry.confidenceBefore)) {
    errors.push({
      field: "confidenceBefore",
      message: "Confidence before must be a finite number",
      code: "INVALID_TYPE",
    });
  } else if (entry.confidenceBefore < 0 || entry.confidenceBefore > 100) {
    errors.push({
      field: "confidenceBefore",
      message: `Confidence before must be between 0 and 100 (got ${entry.confidenceBefore})`,
      code: "INVALID_RANGE",
    });
  }

  if (typeof entry.confidenceAfter !== "number" || !Number.isFinite(entry.confidenceAfter)) {
    errors.push({
      field: "confidenceAfter",
      message: "Confidence after must be a finite number",
      code: "INVALID_TYPE",
    });
  } else if (entry.confidenceAfter < 0 || entry.confidenceAfter > 100) {
    errors.push({
      field: "confidenceAfter",
      message: `Confidence after must be between 0 and 100 (got ${entry.confidenceAfter})`,
      code: "INVALID_RANGE",
    });
  }

  // === Interpretation ===

  if (!entry.interpretation || entry.interpretation.trim().length === 0) {
    errors.push({
      field: "interpretation",
      message: "Interpretation is required to explain confidence change",
      code: "MISSING_REQUIRED",
    });
  }

  // === Date ===

  if (!isValidDateOrString(entry.recordedAt)) {
    errors.push({
      field: "recordedAt",
      message: "recordedAt must be a valid Date or ISO date string",
      code: "INVALID_TYPE",
    });
  }

  // === Warnings ===

  // Warn if discriminative power is low
  if (
    entry.test &&
    typeof entry.test === "object" &&
    isDiscriminativePower((entry.test as TestDescription).discriminativePower) &&
    (entry.test as TestDescription).discriminativePower < 3
  ) {
    warnings.push({
      field: "test.discriminativePower",
      message: "Low discriminative power - consider designing more decisive tests",
      code: "LOW_DISCRIMINATIVE_POWER",
    });
  }

  // Warn if no source provided
  if (!entry.source || entry.source.trim().length === 0) {
    warnings.push({
      field: "source",
      message: "Consider providing a source reference for this evidence",
      code: "NO_SOURCE",
    });
  }

  // Warn if confidence change is very small
  if (
    typeof entry.confidenceBefore === "number" &&
    typeof entry.confidenceAfter === "number" &&
    Math.abs(entry.confidenceAfter - entry.confidenceBefore) < 1
  ) {
    warnings.push({
      field: "confidenceAfter",
      message:
        "Very small confidence change - verify this evidence is being weighted appropriately",
      code: "SMALL_CONFIDENCE_CHANGE",
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
 * Type guard for TestDescription
 */
export function isTestDescription(obj: unknown): obj is TestDescription {
  if (typeof obj !== "object" || obj === null) return false;

  const t = obj as Record<string, unknown>;

  if (typeof t.id !== "string") return false;
  if (typeof t.description !== "string") return false;
  if (!isTestType(t.type)) return false;
  if (!isDiscriminativePower(t.discriminativePower)) return false;

  return true;
}

/**
 * Type guard for EvidenceEntry.
 *
 * Handles both fresh objects (with Date instances) and deserialized
 * objects (with ISO date strings from JSON).
 */
export function isEvidenceEntry(obj: unknown): obj is EvidenceEntry {
  if (typeof obj !== "object" || obj === null) return false;

  const e = obj as Record<string, unknown>;

  // Check required string fields
  if (typeof e.id !== "string") return false;
  if (typeof e.sessionId !== "string") return false;
  if (typeof e.hypothesisVersion !== "string") return false;

  // Check test description
  if (!isTestDescription(e.test)) return false;

  // Check predictions
  if (typeof e.predictionIfTrue !== "string") return false;
  if (typeof e.predictionIfFalse !== "string") return false;

  // Check result
  if (!isEvidenceResult(e.result)) return false;
  if (typeof e.observation !== "string") return false;

  // Check confidence (use Number.isFinite to catch NaN/Infinity)
  if (typeof e.confidenceBefore !== "number" || !Number.isFinite(e.confidenceBefore)) return false;
  if (typeof e.confidenceAfter !== "number" || !Number.isFinite(e.confidenceAfter)) return false;
  if (e.confidenceBefore < 0 || e.confidenceBefore > 100) return false;
  if (e.confidenceAfter < 0 || e.confidenceAfter > 100) return false;

  // Check interpretation
  if (typeof e.interpretation !== "string") return false;

  // Check date (handles both Date objects and ISO strings)
  if (!isValidDateOrString(e.recordedAt)) return false;

  // Check optional fields have correct types if present
  if (e.source !== undefined && typeof e.source !== "string") return false;
  if (e.recordedBy !== undefined && typeof e.recordedBy !== "string") return false;
  if (e.notes !== undefined && typeof e.notes !== "string") return false;
  if (e.tags !== undefined) {
    if (!Array.isArray(e.tags)) return false;
    if (!e.tags.every((t) => typeof t === "string")) return false;
  }

  return true;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Pattern for valid session IDs in evidence entries.
 * Allows alphanumeric characters and hyphens, must start with alphanumeric.
 */
const SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]*$/;

/**
 * Pattern for EvidenceEntry IDs.
 * Format: EV-{sessionId}-{sequence}
 */
export const EVIDENCE_ID_PATTERN = /^EV-[A-Za-z0-9][A-Za-z0-9-]*-\d{3}$/;

/**
 * Generate a new EvidenceEntry ID.
 *
 * @param sessionId - The session this evidence belongs to (alphanumeric with hyphens)
 * @param sequence - The sequence number within the session (0-999)
 * @returns A formatted evidence ID
 * @throws Error if inputs are invalid
 */
export function generateEvidenceId(sessionId: string, sequence: number): string {
  if (!sessionId || !SESSION_ID_PATTERN.test(sessionId)) {
    throw new Error(
      `Invalid sessionId: must be alphanumeric with optional hyphens, starting with alphanumeric (got "${sessionId}")`,
    );
  }

  if (!Number.isInteger(sequence) || sequence < 0 || sequence > 999) {
    throw new Error(`Invalid sequence: must be an integer from 0-999 (got ${sequence})`);
  }

  const paddedSeq = sequence.toString().padStart(3, "0");
  return `EV-${sessionId}-${paddedSeq}`;
}

/**
 * Create a new EvidenceEntry with required fields.
 *
 * @param input - The input fields for the new evidence entry
 * @returns A fully populated EvidenceEntry
 * @throws Error if validation fails
 */
export function createEvidenceEntry(input: {
  id: string;
  sessionId: string;
  hypothesisVersion: string;
  test: TestDescription;
  predictionIfTrue: string;
  predictionIfFalse: string;
  result: EvidenceResult;
  observation: string;
  confidenceBefore: number;
  confidenceAfter: number;
  interpretation: string;
  source?: string;
  recordedBy?: string;
  notes?: string;
  tags?: string[];
}): EvidenceEntry {
  const entry: EvidenceEntry = {
    id: input.id,
    sessionId: input.sessionId,
    hypothesisVersion: input.hypothesisVersion,
    test: input.test,
    predictionIfTrue: input.predictionIfTrue,
    predictionIfFalse: input.predictionIfFalse,
    result: input.result,
    observation: input.observation,
    confidenceBefore: input.confidenceBefore,
    confidenceAfter: input.confidenceAfter,
    interpretation: input.interpretation,
    source: input.source,
    recordedAt: new Date(),
    recordedBy: input.recordedBy,
    notes: input.notes,
    tags: input.tags,
  };

  // Validate the created entry
  const result = validateEvidenceEntry(entry);
  if (!result.valid) {
    const errorMessages = result.errors.map((e) => `${e.field}: ${e.message}`);
    throw new Error(`Invalid EvidenceEntry: ${errorMessages.join("; ")}`);
  }

  return entry;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate the confidence delta from an evidence entry.
 */
export function calculateConfidenceDelta(entry: EvidenceEntry): number {
  return entry.confidenceAfter - entry.confidenceBefore;
}

/**
 * Get a human-readable summary of the evidence result.
 */
export function summarizeEvidenceResult(entry: EvidenceEntry): string {
  const delta = calculateConfidenceDelta(entry);
  const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;

  switch (entry.result) {
    case "supports":
      return `Supports hypothesis (${deltaStr}% confidence)`;
    case "challenges":
      return `Challenges hypothesis (${deltaStr}% confidence)`;
    case "inconclusive":
      return `Inconclusive (${deltaStr}% confidence)`;
  }
}

/**
 * Get the result color for UI display.
 */
export function getResultColor(result: EvidenceResult): string {
  switch (result) {
    case "supports":
      return "green";
    case "challenges":
      return "red";
    case "inconclusive":
      return "yellow";
  }
}
