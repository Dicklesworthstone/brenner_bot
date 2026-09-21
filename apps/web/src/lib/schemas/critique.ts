import { z } from "zod";

/**
 * Critique Registry Schema
 *
 * Tracks adversarial critiques as first-class entities with targets,
 * responses, and resolution status. This enables the "Adversarial Critic"
 * role to have persistent, trackable output.
 *
 * From the Brenner method:
 * - Artifact Schema Section 7: Adversarial Critique
 * - Evaluation rubric: "Theory Kill Justification" (0-3), "Real Third Alternative" (0-3)
 * - §229: "When they go ugly, kill them" — but kills should be JUSTIFIED by critiques!
 *
 * @see specs/artifact_schema_v0.1.md - Section 7: Adversarial Critique
 * @see specs/evaluation_rubric_v0.1.md
 * @see brenner_bot-f5wy.1 (bead)
 */

// ============================================================================
// ID Patterns
// ============================================================================

/**
 * Critique ID format: C-{session_id}-{sequence}
 * @example "C-RS20251230-001"
 */
const critiqueIdPattern = /^C-[A-Za-z0-9][\w.-]*-\d{3}$|^C\d+$/;

/**
 * Hypothesis ID format for targets/references
 */
const hypothesisIdPattern = /^H-[A-Za-z0-9][\w.-]*-\d{3}$|^H\d+$/;

/**
 * Test ID format for targets/references
 * Supports both T-{session}-{seq} and simple T{n} format for backwards compatibility.
 */
const testIdPattern = /^T-[A-Za-z0-9][\w.-]*-\d{3}$|^T\d+$/;

/**
 * Assumption ID format for targets/references
 * Supports both A-{session}-{seq} and simple A{n} format for backwards compatibility.
 */
const assumptionIdPattern = /^A-[A-Za-z0-9][\w.-]*-\d{3}$|^A\d+$/;

/**
 * Transcript anchor format: §n or §n-m for ranges
 */
const anchorPattern = /^§\d+(-\d+)?$/;

// ============================================================================
// Enums
// ============================================================================

/**
 * Types of things a critique can target.
 *
 * From the Brenner method, critiques can attack:
 * - hypothesis: A specific candidate explanation
 * - test: A test design (is it really discriminative?)
 * - assumption: A load-bearing assumption
 * - framing: The research thread itself (wrong question?)
 * - methodology: The overall approach
 */
export const CritiqueTargetTypeSchema = z.enum([
  "hypothesis",
  "test",
  "assumption",
  "framing",
  "methodology",
]);

export type CritiqueTargetType = z.infer<typeof CritiqueTargetTypeSchema>;

/**
 * Status of the critique.
 *
 * - active: Critique not yet addressed
 * - addressed: Response provided
 * - dismissed: Rejected as invalid
 * - accepted: Critique accepted, changes made
 */
export const CritiqueStatusSchema = z.enum(["active", "addressed", "dismissed", "accepted"]);

export type CritiqueStatus = z.infer<typeof CritiqueStatusSchema>;

/**
 * Severity of the critique.
 *
 * - minor: Small issue, not blocking
 * - moderate: Significant but not fatal
 * - serious: Major problem requiring attention
 * - critical: Potentially fatal flaw
 */
export const CritiqueSeveritySchema = z.enum(["minor", "moderate", "serious", "critical"]);

export type CritiqueSeverity = z.infer<typeof CritiqueSeveritySchema>;

/**
 * Actions that can be taken in response to a critique.
 */
export const CritiqueActionSchema = z.enum([
  "none", // No action taken
  "modified", // Target was modified
  "killed", // Target was killed/removed
  "new_test", // New test designed to address critique
]);

export type CritiqueAction = z.infer<typeof CritiqueActionSchema>;

// ============================================================================
// Sub-Schemas
// ============================================================================

/**
 * Proposed alternative - does the critique offer a constructive alternative?
 *
 * From evaluation rubric "Real Third Alternative" (0-3):
 * - 0: Pure skepticism ("we don't know")
 * - 1: Alternative is vague
 * - 2: Specific alternative but not fully developed
 * - 3: Concrete alternative with mechanism and testable predictions
 */
export const ProposedAlternativeSchema = z.object({
  /**
   * Description of the alternative
   */
  description: z.string().min(10, "Alternative description must be at least 10 characters"),

  /**
   * Proposed mechanism (optional but increases rigor)
   */
  mechanism: z.string().optional(),

  /**
   * Is this alternative testable?
   * If true, should have testable predictions.
   */
  testable: z.boolean(),

  /**
   * What predictions does this alternative make?
   * Required if testable is true.
   */
  predictions: z.array(z.string()).optional(),
});

export type ProposedAlternative = z.infer<typeof ProposedAlternativeSchema>;

/**
 * Response to a critique.
 */
export const CritiqueResponseSchema = z.object({
  /**
   * The response text
   */
  text: z.string().min(10, "Response must be at least 10 characters"),

  /**
   * Who responded?
   */
  respondedBy: z.string().optional(),

  /**
   * When was this responded to?
   */
  respondedAt: z.string().datetime(),

  /**
   * What action was taken?
   */
  actionTaken: CritiqueActionSchema.optional(),

  /**
   * If action was 'new_test', link to the test ID
   */
  newTestId: z.string().regex(testIdPattern, "Invalid test ID format").optional(),
});

export type CritiqueResponse = z.infer<typeof CritiqueResponseSchema>;

// ============================================================================
// Main Schema
// ============================================================================

/**
 * A Critique is an adversarial attack on some aspect of the research.
 *
 * Critiques are CRITICAL for the Brenner method because they:
 * 1. Force explicit justification for theory kills
 * 2. Ensure third alternatives are considered
 * 3. Prevent premature convergence on a hypothesis
 * 4. Create a record of adversarial pressure
 */
export const CritiqueSchema = z
  .object({
    // === IDENTITY ===

    /**
     * Stable ID format: C-{session_id}-{sequence}
     * @example "C-RS20251230-001"
     */
    id: z
      .string()
      .regex(critiqueIdPattern, "Invalid critique ID format (expected C-{session}-{seq})"),

    // === TARGET ===

    /**
     * What type of thing is being attacked?
     */
    targetType: CritiqueTargetTypeSchema,

    /**
     * The ID of what's being attacked.
     * Required for hypothesis, test, assumption targets.
     * Optional for framing and methodology (attacks the research thread itself).
     */
    targetId: z.string().optional(),

    // === THE ATTACK ===

    /**
     * The attack: how could this be fundamentally wrong?
     * Should be specific and actionable.
     */
    attack: z.string().min(20, "Attack must be at least 20 characters"),

    /**
     * What evidence would confirm this critique?
     * This makes the critique falsifiable.
     */
    evidenceToConfirm: z.string().min(10, "Evidence description must be at least 10 characters"),

    // === CONSTRUCTIVE ALTERNATIVE ===

    /**
     * Does this propose a constructive alternative?
     * Higher rigor critiques offer alternatives, not just objections.
     */
    proposedAlternative: ProposedAlternativeSchema.optional(),

    // === STATUS ===

    /**
     * Current status of the critique.
     */
    status: CritiqueStatusSchema.default("active"),

    /**
     * Response to the critique (if addressed, dismissed, or accepted).
     */
    response: CritiqueResponseSchema.optional(),

    /**
     * If dismissed, why?
     */
    dismissalReason: z.string().optional(),

    // === SEVERITY ===

    /**
     * How serious is this threat?
     */
    severity: CritiqueSeveritySchema,

    // === PROVENANCE ===

    /**
     * Session where this critique was raised.
     */
    sessionId: z.string().min(1, "Session ID is required"),

    /**
     * Who raised this critique?
     * Usually an agent name.
     */
    raisedBy: z.string().optional(),

    /**
     * §n transcript anchors if grounded in Brenner.
     */
    anchors: z
      .array(z.string().regex(anchorPattern, "Invalid anchor format (expected §n or §n-m)"))
      .optional(),

    // === TIMESTAMPS ===

    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),

    // === METADATA ===

    /**
     * Tags for categorization and filtering
     */
    tags: z.array(z.string()).optional(),

    /**
     * Free-form notes
     */
    notes: z.string().max(2000, "Notes too long").optional(),
  })
  .refine(
    (data) => {
      // If targetType requires an ID, validate it
      if (["hypothesis", "test", "assumption"].includes(data.targetType)) {
        if (!data.targetId) {
          return false;
        }
        // Validate ID format based on target type
        if (data.targetType === "hypothesis" && !hypothesisIdPattern.test(data.targetId)) {
          return false;
        }
        if (data.targetType === "test" && !testIdPattern.test(data.targetId)) {
          return false;
        }
        if (data.targetType === "assumption" && !assumptionIdPattern.test(data.targetId)) {
          return false;
        }
      }
      return true;
    },
    {
      message: "targetId is required and must match the format for the target type",
    },
  );

// Note: dismissalReason enforcement is handled by dismissCritique() function
// which always sets dismissalReason when dismissing. Schema-level validation
// is not appropriate here since dismissed status can only be set via that function.

export type Critique = z.infer<typeof CritiqueSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Evaluate the "Theory Kill Justification" quality of a critique.
 *
 * From evaluation rubric (0-3):
 * - 0: Kill based on aesthetic preference or convenience
 * - 1: Kill based on single piece of weak evidence
 * - 2: Kill with multiple evidence points but room for doubt
 * - 3: Kill is decisive: direct contradiction, no rescue moves
 */
export function evaluateKillJustification(critique: Critique): {
  score: 0 | 1 | 2 | 3;
  issues: string[];
  explanation: string;
} {
  const issues: string[] = [];

  // Check attack quality
  if (critique.attack.length < 50) {
    issues.push("Attack is too brief for a decisive kill");
  }

  // Check evidence specification
  if (critique.evidenceToConfirm.length < 30) {
    issues.push("Evidence to confirm is vague");
  }

  // Score based on completeness
  let score: 0 | 1 | 2 | 3 = 0;

  if (critique.attack.length >= 20 && critique.evidenceToConfirm.length >= 10) {
    score = 1;
  }

  if (score >= 1 && critique.attack.length >= 50 && critique.evidenceToConfirm.length >= 30) {
    score = 2;
  }

  if (
    score >= 2 &&
    critique.anchors &&
    critique.anchors.length > 0 &&
    critique.proposedAlternative
  ) {
    score = 3;
  }

  const explanations = [
    "Kill based on aesthetic preference or convenience",
    "Kill based on single piece of weak evidence",
    "Kill with multiple evidence points but room for doubt",
    "Kill is decisive: direct contradiction, no rescue moves",
  ];

  return {
    score,
    issues,
    explanation: explanations[score],
  };
}

/**
 * Evaluate the "Real Third Alternative" quality of a critique.
 *
 * From evaluation rubric (0-3):
 * - 0: Pure skepticism ("we don't know")
 * - 1: Alternative is vague
 * - 2: Specific alternative but not fully developed
 * - 3: Concrete alternative with mechanism and testable predictions
 */
export function evaluateThirdAlternative(critique: Critique): {
  score: 0 | 1 | 2 | 3;
  issues: string[];
  explanation: string;
} {
  const issues: string[] = [];

  // No alternative proposed
  if (!critique.proposedAlternative) {
    return {
      score: 0,
      issues: ["No alternative proposed - pure skepticism"],
      explanation: 'Pure skepticism ("we don\'t know")',
    };
  }

  const alt = critique.proposedAlternative;

  // Check for vague alternative
  if (alt.description.length < 30) {
    issues.push("Alternative description is vague");
    return {
      score: 1,
      issues,
      explanation: "Alternative is vague",
    };
  }

  // Check for mechanism
  if (!alt.mechanism) {
    issues.push("No mechanism proposed");
  }

  // Check for testability
  if (!alt.testable) {
    issues.push("Alternative is not testable");
  }

  // Check for predictions
  if (alt.testable && (!alt.predictions || alt.predictions.length === 0)) {
    issues.push("Testable alternative but no predictions specified");
  }

  // Score based on completeness
  let score: 0 | 1 | 2 | 3 = 2; // At least specific if we got here

  if (alt.mechanism && alt.testable && alt.predictions && alt.predictions.length > 0) {
    score = 3;
  }

  const explanations = [
    'Pure skepticism ("we don\'t know")',
    "Alternative is vague",
    "Specific alternative but not fully developed",
    "Concrete alternative with mechanism and testable predictions",
  ];

  return {
    score,
    issues,
    explanation: explanations[score],
  };
}

/**
 * Check if a critique requires a response.
 */
export function requiresResponse(critique: Critique): boolean {
  return (
    critique.status === "active" &&
    (critique.severity === "serious" || critique.severity === "critical")
  );
}

/**
 * Count unaddressed critiques for a target.
 */
export function countUnaddressedCritiques(
  critiques: Critique[],
  targetType: CritiqueTargetType,
  targetId?: string,
): number {
  return critiques.filter(
    (c) =>
      c.status === "active" &&
      c.targetType === targetType &&
      (targetId === undefined || c.targetId === targetId),
  ).length;
}

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Maximum sequence number for critique IDs.
 * IDs use 3-digit sequences (001-999).
 */
const MAX_CRITIQUE_SEQUENCE = 999;

/**
 * Generate a new critique ID for a session.
 * IDs are monotonically increasing within a session.
 *
 * @throws Error if the session already has 999 critiques (sequence overflow)
 */
export function generateCritiqueId(sessionId: string, existingIds: string[]): string {
  const prefix = `C-${sessionId}-`;
  const sequences = existingIds
    .filter((id) => id.startsWith(prefix))
    .map((id) => {
      const match = id.match(/-(\d{3})$/);
      return match ? parseInt(match[1], 10) : 0;
    });

  const nextSeq = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;

  if (nextSeq > MAX_CRITIQUE_SEQUENCE) {
    throw new Error(
      `Critique sequence overflow for session "${sessionId}": maximum ${MAX_CRITIQUE_SEQUENCE} critiques per session exceeded`,
    );
  }

  return `${prefix}${nextSeq.toString().padStart(3, "0")}`;
}

/**
 * Type guard for critique ID format.
 */
export function isValidCritiqueId(id: string): boolean {
  return critiqueIdPattern.test(id);
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
 * Create a new critique with required fields and sensible defaults.
 */
export function createCritique(input: {
  id: string;
  targetType: CritiqueTargetType;
  targetId?: string;
  attack: string;
  evidenceToConfirm: string;
  severity: CritiqueSeverity;
  sessionId: string;
  proposedAlternative?: ProposedAlternative;
  raisedBy?: string;
  anchors?: string[];
  tags?: string[];
  notes?: string;
}): Critique {
  const now = new Date().toISOString();
  return CritiqueSchema.parse({
    id: input.id,
    targetType: input.targetType,
    targetId: input.targetId,
    attack: input.attack,
    evidenceToConfirm: input.evidenceToConfirm,
    proposedAlternative: input.proposedAlternative,
    status: "active",
    severity: input.severity,
    sessionId: input.sessionId,
    raisedBy: input.raisedBy,
    anchors: input.anchors,
    tags: input.tags,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Create a critique targeting a hypothesis.
 */
export function createHypothesisCritique(input: {
  id: string;
  hypothesisId: string;
  attack: string;
  evidenceToConfirm: string;
  severity: CritiqueSeverity;
  sessionId: string;
  proposedAlternative?: ProposedAlternative;
  raisedBy?: string;
  anchors?: string[];
}): Critique {
  return createCritique({
    ...input,
    targetType: "hypothesis",
    targetId: input.hypothesisId,
  });
}

/**
 * Create a critique targeting a test design.
 */
export function createTestCritique(input: {
  id: string;
  testId: string;
  attack: string;
  evidenceToConfirm: string;
  severity: CritiqueSeverity;
  sessionId: string;
  raisedBy?: string;
}): Critique {
  return createCritique({
    ...input,
    targetType: "test",
    targetId: input.testId,
  });
}

/**
 * Create a critique targeting the research framing.
 */
export function createFramingCritique(input: {
  id: string;
  attack: string;
  evidenceToConfirm: string;
  severity: CritiqueSeverity;
  sessionId: string;
  proposedAlternative?: ProposedAlternative;
  raisedBy?: string;
  anchors?: string[];
}): Critique {
  return createCritique({
    ...input,
    targetType: "framing",
  });
}

// ============================================================================
// Response Functions
// ============================================================================

/**
 * Address a critique with a response.
 */
export function addressCritique(
  critique: Critique,
  response: Omit<CritiqueResponse, "respondedAt">,
): Critique {
  if (critique.status !== "active") {
    throw new Error(
      `Cannot address critique ${critique.id} - current status is ${critique.status}`,
    );
  }

  const now = new Date().toISOString();
  const updated = {
    ...critique,
    status: "addressed",
    response: {
      ...response,
      respondedAt: now,
    },
    updatedAt: now,
  };

  return CritiqueSchema.parse(updated);
}

/**
 * Dismiss a critique as invalid.
 */
export function dismissCritique(
  critique: Critique,
  reason: string,
  respondedBy?: string,
): Critique {
  if (critique.status !== "active") {
    throw new Error(
      `Cannot dismiss critique ${critique.id} - current status is ${critique.status}`,
    );
  }

  const now = new Date().toISOString();
  const updated = {
    ...critique,
    status: "dismissed",
    dismissalReason: reason,
    response: {
      text: reason,
      respondedBy,
      respondedAt: now,
    },
    updatedAt: now,
  };

  return CritiqueSchema.parse(updated);
}

/**
 * Accept a critique and record the action taken.
 */
export function acceptCritique(
  critique: Critique,
  action: CritiqueAction,
  responseText: string,
  respondedBy?: string,
  newTestId?: string,
): Critique {
  if (critique.status !== "active") {
    throw new Error(`Cannot accept critique ${critique.id} - current status is ${critique.status}`);
  }

  const now = new Date().toISOString();
  const updated = {
    ...critique,
    status: "accepted",
    response: {
      text: responseText,
      respondedBy,
      respondedAt: now,
      actionTaken: action,
      newTestId: action === "new_test" ? newTestId : undefined,
    },
    updatedAt: now,
  };

  return CritiqueSchema.parse(updated);
}

/**
 * Reopen a previously addressed/dismissed critique.
 */
export function reopenCritique(critique: Critique, reason?: string): Critique {
  if (critique.status === "active") {
    return critique; // Already active
  }

  const now = new Date().toISOString();
  const updated = {
    ...critique,
    status: "active",
    notes: reason ? `${critique.notes || ""}\n\nReopened: ${reason}`.trim() : critique.notes,
    updatedAt: now,
  };

  return CritiqueSchema.parse(updated);
}
