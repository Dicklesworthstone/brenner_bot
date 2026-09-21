import { z } from "zod";

/**
 * Operator Intervention Audit Trail Schema
 *
 * Tracks human operator interventions during Brenner Loop sessions,
 * enabling reproducibility, trust verification, and learning from overrides.
 *
 * From the Brenner method:
 * - Transparency and honesty about what was done and why
 * - Avoiding "Occam's Broom" (hiding inconvenient facts)
 * - Lab notebook discipline for reproducibility
 *
 * @see specs/artifact_schema_v0.1.md
 * @see brenner_bot-mqg7 (bead)
 */

// ============================================================================
// ID Patterns
// ============================================================================

/**
 * Intervention ID format: INT-{session_id}-{sequence}
 * @example "INT-RS20251230-001"
 */
const interventionIdPattern = /^INT-[A-Za-z0-9][\w.-]*-\d{3}$|^INT\d+$/;

// ============================================================================
// Enums
// ============================================================================

/**
 * Types of operator interventions.
 *
 * - artifact_edit: Direct edit to compiled artifact before publish
 * - delta_exclusion: Excluded a delta from compilation
 * - delta_injection: Added a delta not from an agent
 * - decision_override: Overrode a protocol decision
 * - session_control: Terminated, forked, or reset session
 * - role_reassignment: Changed agent-role mappings mid-session
 */
export const InterventionTypeSchema = z.enum([
  "artifact_edit",
  "delta_exclusion",
  "delta_injection",
  "decision_override",
  "session_control",
  "role_reassignment",
]);

export type InterventionType = z.infer<typeof InterventionTypeSchema>;

/**
 * Intervention severity levels.
 *
 * - minor: Typo fixes, formatting adjustments
 * - moderate: Delta exclusion, small edits
 * - major: Killing hypotheses, adding tests, role changes
 * - critical: Session termination, protocol bypass
 */
export const InterventionSeveritySchema = z.enum(["minor", "moderate", "major", "critical"]);

export type InterventionSeverity = z.infer<typeof InterventionSeveritySchema>;

/**
 * Session control action types.
 */
export const SessionControlActionSchema = z.enum([
  "terminate_early",
  "force_rerun",
  "fork_session",
  "reset_to_checkpoint",
  "pause",
  "resume",
]);

export type SessionControlAction = z.infer<typeof SessionControlActionSchema>;

// ============================================================================
// Intervention Target Schema
// ============================================================================

/**
 * Target of the intervention.
 * Identifies what was affected by the operator action.
 */
export const InterventionTargetSchema = z.object({
  /** Message ID for delta exclusion/injection */
  message_id: z.number().int().positive().optional(),

  /** Artifact version number affected */
  artifact_version: z.number().int().nonnegative().optional(),

  /** Item ID (hypothesis, test, assumption, etc.) */
  item_id: z.string().optional(),

  /** Item type (hypothesis, test, assumption, anomaly, critique) */
  item_type: z
    .enum([
      "hypothesis",
      "test",
      "prediction",
      "assumption",
      "anomaly",
      "critique",
      "research_thread",
    ])
    .optional(),

  /** Agent name for role reassignment */
  agent_name: z.string().optional(),

  /** Role for role reassignment */
  role: z.string().optional(),
});

export type InterventionTarget = z.infer<typeof InterventionTargetSchema>;

// ============================================================================
// State Change Schema
// ============================================================================

/**
 * Captures the before/after state of an intervention.
 */
export const StateChangeSchema = z.object({
  /** State before intervention (JSON stringified or description) */
  before: z.string().optional(),

  /** State after intervention (JSON stringified or description) */
  after: z.string().optional(),

  /** Hash of before state for verification */
  before_hash: z.string().optional(),

  /** Hash of after state for verification */
  after_hash: z.string().optional(),
});

export type StateChange = z.infer<typeof StateChangeSchema>;

// ============================================================================
// Main Operator Intervention Schema
// ============================================================================

/**
 * Complete Operator Intervention record.
 *
 * Records a human operator's intervention during a Brenner Loop session,
 * including what was changed, who changed it, why, and when.
 */
export const OperatorInterventionSchema = z.object({
  /** Unique intervention ID (format: INT-{session}-{seq}) */
  id: z.string().regex(interventionIdPattern, {
    message: "Intervention ID must match format: INT-{session}-{seq}",
  }),

  /** Session ID where intervention occurred */
  session_id: z.string().min(1),

  /** ISO 8601 timestamp of intervention */
  timestamp: z.string().datetime({ offset: true }),

  /** Operator identifier (agent name or "human") */
  operator_id: z.string().min(1),

  /** Type of intervention */
  type: InterventionTypeSchema,

  /** Severity level of the intervention */
  severity: InterventionSeveritySchema,

  /** Target of the intervention */
  target: InterventionTargetSchema,

  /** State change (before/after) */
  state_change: StateChangeSchema.optional(),

  /** Required rationale explaining WHY the operator made this intervention */
  rationale: z.string().min(10, {
    message: "Rationale must be at least 10 characters",
  }),

  /** Session control action (if type is session_control) */
  session_control_action: SessionControlActionSchema.optional(),

  /** Whether this intervention can be reversed */
  reversible: z.boolean().default(true),

  /** Timestamp when reversed (if applicable) */
  reversed_at: z.string().datetime({ offset: true }).optional(),

  /** Who reversed the intervention */
  reversed_by: z.string().optional(),

  /** Optional metadata/tags */
  tags: z.array(z.string()).default([]),

  /** Optional notes for additional context */
  notes: z.string().optional(),
});

export type OperatorIntervention = z.infer<typeof OperatorInterventionSchema>;

// ============================================================================
// Intervention Summary Schema
// ============================================================================

/**
 * Summary of interventions for a session.
 * Included in compiled artifact metadata.
 */
export const InterventionSummarySchema = z.object({
  /** Total number of interventions */
  total_count: z.number().int().nonnegative(),

  /** Count by severity */
  by_severity: z.object({
    minor: z.number().int().nonnegative(),
    moderate: z.number().int().nonnegative(),
    major: z.number().int().nonnegative(),
    critical: z.number().int().nonnegative(),
  }),

  /** Count by type */
  by_type: z.object({
    artifact_edit: z.number().int().nonnegative(),
    delta_exclusion: z.number().int().nonnegative(),
    delta_injection: z.number().int().nonnegative(),
    decision_override: z.number().int().nonnegative(),
    session_control: z.number().int().nonnegative(),
    role_reassignment: z.number().int().nonnegative(),
  }),

  /** Whether session has any major+ interventions */
  has_major_interventions: z.boolean(),

  /** List of operator IDs who intervened */
  operators: z.array(z.string()),

  /** Earliest intervention timestamp */
  first_intervention_at: z.string().datetime({ offset: true }).optional(),

  /** Latest intervention timestamp */
  last_intervention_at: z.string().datetime({ offset: true }).optional(),
});

export type InterventionSummary = z.infer<typeof InterventionSummarySchema>;

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a new intervention ID.
 */
export function createInterventionId(sessionId: string, sequence: number): string {
  return `INT-${sessionId}-${sequence.toString().padStart(3, "0")}`;
}

/**
 * Determines intervention severity based on type and target.
 */
export function determineInterventionSeverity(
  type: InterventionType,
  target: InterventionTarget,
): InterventionSeverity {
  // Critical: session control actions
  if (type === "session_control") {
    return "critical";
  }

  // Major: role reassignment, decision overrides, or item modifications
  if (
    type === "role_reassignment" ||
    type === "decision_override" ||
    (type === "artifact_edit" && target.item_type === "hypothesis") ||
    (type === "delta_injection" && target.item_type === "hypothesis")
  ) {
    return "major";
  }

  // Moderate: delta exclusion, test/assumption edits
  if (type === "delta_exclusion" || (type === "artifact_edit" && target.item_type)) {
    return "moderate";
  }

  // Minor: everything else (formatting, typos)
  return "minor";
}

/**
 * Creates an empty intervention summary.
 */
export function createEmptyInterventionSummary(): InterventionSummary {
  return {
    total_count: 0,
    by_severity: {
      minor: 0,
      moderate: 0,
      major: 0,
      critical: 0,
    },
    by_type: {
      artifact_edit: 0,
      delta_exclusion: 0,
      delta_injection: 0,
      decision_override: 0,
      session_control: 0,
      role_reassignment: 0,
    },
    has_major_interventions: false,
    operators: [],
  };
}

/**
 * Aggregates interventions into a summary.
 */
export function aggregateInterventions(interventions: OperatorIntervention[]): InterventionSummary {
  const summary = createEmptyInterventionSummary();

  if (interventions.length === 0) {
    return summary;
  }

  const operators = new Set<string>();
  let firstTimestamp: string | undefined;
  let lastTimestamp: string | undefined;

  for (const intervention of interventions) {
    summary.total_count++;
    summary.by_severity[intervention.severity]++;
    summary.by_type[intervention.type]++;
    operators.add(intervention.operator_id);

    // Track timestamps
    if (!firstTimestamp || intervention.timestamp < firstTimestamp) {
      firstTimestamp = intervention.timestamp;
    }
    if (!lastTimestamp || intervention.timestamp > lastTimestamp) {
      lastTimestamp = intervention.timestamp;
    }

    // Check for major interventions
    if (intervention.severity === "major" || intervention.severity === "critical") {
      summary.has_major_interventions = true;
    }
  }

  summary.operators = Array.from(operators).sort();
  summary.first_intervention_at = firstTimestamp;
  summary.last_intervention_at = lastTimestamp;

  return summary;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates an intervention record.
 */
export function validateIntervention(
  intervention: unknown,
): { valid: true; data: OperatorIntervention } | { valid: false; errors: string[] } {
  const result = OperatorInterventionSchema.safeParse(intervention);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return {
    valid: false,
    errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
  };
}

/**
 * Checks if a session is "clean" (no major+ interventions).
 */
export function isCleanSession(summary: InterventionSummary): boolean {
  return !summary.has_major_interventions;
}
