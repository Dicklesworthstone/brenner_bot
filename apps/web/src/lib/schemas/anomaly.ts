import { z } from "zod";

/**
 * Anomaly Registry Schema
 *
 * Tracks anomalies (surprising observations) as first-class entities with
 * quarantine status and resolution tracking. Anomalies are CRITICAL for
 * the Brenner method - they reveal when framings are inadequate.
 *
 * From §103: "Both could be wrong" — anomalies reveal when framings are inadequate
 * From §147: "Exclusion is always a tremendously good thing" — but you can't
 * exclude if you don't track what you're excluding!
 *
 * @see specs/artifact_schema_v0.1.md - Section 6: Anomaly Register
 * @see specs/evaluation_rubric_v0.1.md - "Anomaly Quarantine Discipline" (0-3)
 * @see brenner_bot-vxd3 (bead)
 */

// ============================================================================
// ID Patterns
// ============================================================================

/**
 * Anomaly ID format: X-{session_id}-{sequence}
 * @example "X-RS20251230-001"
 */
const anomalyIdPattern = /^X-[A-Za-z0-9][\w-]*-\d{3}$/;

/**
 * Hypothesis ID format (for references)
 */
const hypothesisIdPattern = /^H-[A-Za-z0-9][\w-]*-\d{3}$/;

/**
 * Assumption ID format (for references)
 */
const assumptionIdPattern = /^A-[A-Za-z0-9][\w-]*-\d{3}$|^A\d+$/;

/**
 * Transcript anchor format: §n or §n-m for ranges
 */
const anchorPattern = /^§\d+(-\d+)?$/;

// ============================================================================
// Enums
// ============================================================================

/**
 * Quarantine status for anomalies.
 *
 * From evaluation rubric "Anomaly Quarantine Discipline" (0-3):
 * - 0: Anomalies ignored or used to prematurely kill frameworks
 * - 1: Anomalies mentioned but not formally quarantined
 * - 2: Formal quarantine with resolution plan
 * - 3: Explicit tracking, status updates, and Occam's broom awareness
 *
 * Key insight: "Neither hidden nor allowed to destroy coherent framework"
 */
export const QuarantineStatusSchema = z.enum([
  "active", // Anomaly not yet resolved (default)
  "resolved", // Explained by a hypothesis (link to which one)
  "deferred", // Parked until core question settled
  "paradigm_shifting", // So significant it changes the research thread
]);

export type QuarantineStatus = z.infer<typeof QuarantineStatusSchema>;

/**
 * Source type for where the anomaly observation came from.
 */
export const AnomalySourceTypeSchema = z.enum([
  "experiment", // Observed in a test/experiment
  "literature", // Found in published literature
  "discussion", // Emerged during session discussion
  "calculation", // Derived from calculations/analysis
]);

export type AnomalySourceType = z.infer<typeof AnomalySourceTypeSchema>;

// ============================================================================
// Sub-Schemas
// ============================================================================

/**
 * Source of the anomaly observation.
 * Tracks where the anomaly was first observed.
 */
export const AnomalySourceSchema = z.object({
  /** Type of source */
  type: AnomalySourceTypeSchema,

  /** Reference to source (paper DOI, session ID, etc.) */
  reference: z.string().optional(),

  /** §n transcript anchors if grounded in Brenner */
  anchors: z
    .array(z.string().regex(anchorPattern, "Invalid anchor format (expected §n or §n-m)"))
    .optional(),

  /** Additional citation details */
  citation: z.string().optional(),
});

export type AnomalySource = z.infer<typeof AnomalySourceSchema>;

/**
 * What the anomaly conflicts with.
 * Tracks which hypotheses and assumptions this challenges.
 */
export const AnomalyConflictsWithSchema = z.object({
  /** Hypothesis IDs that this anomaly challenges */
  hypotheses: z
    .array(z.string().regex(hypothesisIdPattern, "Invalid hypothesis ID format"))
    .default([]),

  /** Assumption IDs that this anomaly challenges */
  assumptions: z
    .array(z.string().regex(assumptionIdPattern, "Invalid assumption ID format"))
    .default([]),

  /** Human-readable explanation of the conflict */
  description: z.string().min(10, "Conflict description must be at least 10 characters"),
});

export type AnomalyConflictsWith = z.infer<typeof AnomalyConflictsWithSchema>;

// ============================================================================
// Main Schema
// ============================================================================

/**
 * An Anomaly is a surprising observation that doesn't fit the current framework.
 *
 * Anomalies are CRITICAL for the Brenner method because they:
 * 1. Reveal when framings are inadequate
 * 2. Can spawn new hypotheses (paradox grounding)
 * 3. Must be quarantined - neither hidden nor allowed to destroy coherent framework
 *
 * The artifact schema Section 6 is the Anomaly Register.
 */
export const AnomalySchema = z.object({
  // === IDENTITY ===

  /**
   * Stable ID format: X-{session_id}-{sequence}
   * @example "X-RS20251230-001"
   */
  id: z.string().regex(anomalyIdPattern, "Invalid anomaly ID format (expected X-{session}-{seq})"),

  /**
   * Short name for the anomaly (for display)
   */
  name: z.string().min(3).max(100).optional(),

  // === THE OBSERVATION ===

  /**
   * What was observed that doesn't fit?
   * Should be specific and falsifiable.
   */
  observation: z.string().min(10, "Observation must be at least 10 characters"),

  /**
   * Source: where did this observation come from?
   */
  source: AnomalySourceSchema,

  /**
   * What does this conflict with?
   */
  conflictsWith: AnomalyConflictsWithSchema,

  // === QUARANTINE STATUS ===

  /**
   * Current quarantine status
   */
  quarantineStatus: QuarantineStatusSchema.default("active"),

  /**
   * Resolution plan or deferral reason
   */
  resolutionPlan: z.string().optional(),

  /**
   * If resolved: which hypothesis explains it?
   */
  resolvedBy: z.string().regex(hypothesisIdPattern, "Invalid hypothesis ID format").optional(),

  /**
   * When was this resolved?
   */
  resolvedAt: z.string().datetime().optional(),

  // === HYPOTHESIS SPAWNING ===

  /**
   * Can this anomaly spawn new hypotheses?
   * Links to hypotheses that were created to explain this anomaly.
   *
   * This is the "paradox grounding" mechanism:
   * Anomaly X1 -> spawns -> H3 (third alternative)
   */
  spawnedHypotheses: z
    .array(z.string().regex(hypothesisIdPattern, "Invalid hypothesis ID format"))
    .optional(),

  // === SESSION & PROVENANCE ===

  /**
   * Session where this anomaly was recorded
   */
  sessionId: z.string().min(1, "Session ID is required"),

  /**
   * Who recorded this anomaly?
   */
  recordedBy: z.string().optional(),

  /**
   * Is this derived from transcript content?
   */
  isInference: z.boolean().default(false),

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

  /**
   * Priority/severity of the anomaly (lower = more important)
   */
  severity: z.number().int().min(1).max(5).optional(),
});

export type Anomaly = z.infer<typeof AnomalySchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate anomaly quarantine discipline.
 * From evaluation rubric "Anomaly Quarantine Discipline" (0-3)
 *
 * @returns Score 0-3 and any issues found
 */
export function validateQuarantineDiscipline(anomaly: Anomaly): {
  score: 0 | 1 | 2 | 3;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score: 0 | 1 | 2 | 3 = 0;

  // Check if observation is substantive
  if (anomaly.observation.length < 20) {
    issues.push("Observation is too brief - anomalies should be well-documented");
    return { score: 0, issues, suggestions };
  }

  // Score 1: Anomaly mentioned but not formally quarantined
  score = 1;

  // Check for formal quarantine (status tracking)
  if (anomaly.quarantineStatus !== "active" || anomaly.conflictsWith.description.length >= 20) {
    score = 2;
  }

  // Check for resolution plan (shows active tracking)
  if (anomaly.quarantineStatus === "active" && !anomaly.resolutionPlan) {
    suggestions.push("Consider adding a resolution plan for this active anomaly");
  }

  // Score 3: Full tracking with Occam's broom awareness
  if (
    anomaly.resolutionPlan &&
    anomaly.conflictsWith.hypotheses.length > 0 &&
    (anomaly.source.reference || (anomaly.source.anchors && anomaly.source.anchors.length > 0))
  ) {
    score = 3;
  }

  // Check for potential Occam's broom violation (hiding inconvenient anomalies)
  if (anomaly.quarantineStatus === "deferred" && !anomaly.resolutionPlan) {
    issues.push("Deferred anomaly without resolution plan - potential Occam's broom violation");
  }

  return { score, issues, suggestions };
}

/**
 * Check if an anomaly can spawn a hypothesis.
 * Anomalies that are paradigm-shifting or have clear conflicts are good candidates.
 */
export function canSpawnHypothesis(anomaly: Anomaly): {
  canSpawn: boolean;
  reason: string;
} {
  // Already spawned hypotheses
  if (anomaly.spawnedHypotheses && anomaly.spawnedHypotheses.length > 0) {
    return {
      canSpawn: true,
      reason: `Already spawned ${anomaly.spawnedHypotheses.length} hypothesis(es)`,
    };
  }

  // Resolved anomalies shouldn't spawn new hypotheses
  if (anomaly.quarantineStatus === "resolved") {
    return {
      canSpawn: false,
      reason: "Anomaly is resolved - no need to spawn new hypotheses",
    };
  }

  // Paradigm-shifting anomalies are prime candidates
  if (anomaly.quarantineStatus === "paradigm_shifting") {
    return {
      canSpawn: true,
      reason: "Paradigm-shifting anomaly - strong candidate for spawning new research thread",
    };
  }

  // Active anomalies with clear conflicts can spawn hypotheses
  if (anomaly.quarantineStatus === "active" && anomaly.conflictsWith.hypotheses.length >= 1) {
    return {
      canSpawn: true,
      reason: "Active anomaly challenging hypotheses - can spawn third alternative",
    };
  }

  // Deferred anomalies might spawn later
  if (anomaly.quarantineStatus === "deferred") {
    return {
      canSpawn: false,
      reason: "Deferred - consider reactivating before spawning hypotheses",
    };
  }

  return {
    canSpawn: false,
    reason: "Anomaly does not have sufficient conflict context for spawning",
  };
}

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Maximum sequence number for anomaly IDs.
 * IDs use 3-digit sequences (001-999).
 */
const MAX_ANOMALY_SEQUENCE = 999;

/**
 * Generate a new anomaly ID for a session.
 * IDs are monotonically increasing within a session.
 *
 * @throws Error if the session already has 999 anomalies (sequence overflow)
 */
export function generateAnomalyId(sessionId: string, existingIds: string[]): string {
  const prefix = `X-${sessionId}-`;
  const sequences = existingIds
    .filter((id) => id.startsWith(prefix))
    .map((id) => {
      const match = id.match(/-(\d{3})$/);
      return match ? parseInt(match[1], 10) : 0;
    });

  const nextSeq = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;

  if (nextSeq > MAX_ANOMALY_SEQUENCE) {
    throw new Error(
      `Anomaly sequence overflow for session "${sessionId}": maximum ${MAX_ANOMALY_SEQUENCE} anomalies per session exceeded`,
    );
  }

  return `${prefix}${nextSeq.toString().padStart(3, "0")}`;
}

/**
 * Type guard for anomaly ID format.
 */
export function isValidAnomalyId(id: string): boolean {
  return anomalyIdPattern.test(id);
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new anomaly with required fields and sensible defaults.
 */
export function createAnomaly(input: {
  id: string;
  observation: string;
  source: AnomalySource;
  conflictsWith: AnomalyConflictsWith;
  sessionId: string;
  name?: string;
  recordedBy?: string;
  resolutionPlan?: string;
  severity?: number;
  tags?: string[];
}): Anomaly {
  const now = new Date().toISOString();
  return AnomalySchema.parse({
    id: input.id,
    name: input.name,
    observation: input.observation,
    source: input.source,
    conflictsWith: input.conflictsWith,
    quarantineStatus: "active",
    resolutionPlan: input.resolutionPlan,
    sessionId: input.sessionId,
    recordedBy: input.recordedBy,
    isInference: false,
    severity: input.severity,
    tags: input.tags,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Create an anomaly from experimental observation.
 */
export function createExperimentalAnomaly(input: {
  id: string;
  observation: string;
  testReference: string;
  conflictsWithHypotheses: string[];
  conflictDescription: string;
  sessionId: string;
  recordedBy?: string;
}): Anomaly {
  return createAnomaly({
    id: input.id,
    observation: input.observation,
    source: {
      type: "experiment",
      reference: input.testReference,
    },
    conflictsWith: {
      hypotheses: input.conflictsWithHypotheses,
      assumptions: [],
      description: input.conflictDescription,
    },
    sessionId: input.sessionId,
    recordedBy: input.recordedBy,
  });
}

/**
 * Create an anomaly from literature.
 */
export function createLiteratureAnomaly(input: {
  id: string;
  observation: string;
  citation: string;
  conflictsWithHypotheses: string[];
  conflictsWithAssumptions?: string[];
  conflictDescription: string;
  sessionId: string;
  recordedBy?: string;
}): Anomaly {
  return createAnomaly({
    id: input.id,
    observation: input.observation,
    source: {
      type: "literature",
      citation: input.citation,
    },
    conflictsWith: {
      hypotheses: input.conflictsWithHypotheses,
      assumptions: input.conflictsWithAssumptions ?? [],
      description: input.conflictDescription,
    },
    sessionId: input.sessionId,
    recordedBy: input.recordedBy,
  });
}

// ============================================================================
// Transition Functions
// ============================================================================

/**
 * Resolve an anomaly with a hypothesis explanation.
 */
export function resolveAnomaly(
  anomaly: Anomaly,
  resolvedByHypothesisId: string,
  options?: { notes?: string },
): Anomaly {
  if (anomaly.quarantineStatus === "resolved") {
    throw new Error(`Anomaly ${anomaly.id} is already resolved`);
  }

  const now = new Date().toISOString();
  return {
    ...anomaly,
    quarantineStatus: "resolved",
    resolvedBy: resolvedByHypothesisId,
    resolvedAt: now,
    notes: options?.notes ?? anomaly.notes,
    updatedAt: now,
  };
}

/**
 * Defer an anomaly for later consideration.
 */
export function deferAnomaly(anomaly: Anomaly, reason: string): Anomaly {
  if (anomaly.quarantineStatus === "resolved") {
    throw new Error(`Cannot defer resolved anomaly ${anomaly.id}`);
  }

  const now = new Date().toISOString();
  return {
    ...anomaly,
    quarantineStatus: "deferred",
    resolutionPlan: reason,
    updatedAt: now,
  };
}

/**
 * Mark an anomaly as paradigm-shifting.
 */
export function markParadigmShifting(anomaly: Anomaly, notes?: string): Anomaly {
  const now = new Date().toISOString();
  return {
    ...anomaly,
    quarantineStatus: "paradigm_shifting",
    notes: notes ?? anomaly.notes,
    updatedAt: now,
  };
}

/**
 * Reactivate a deferred anomaly.
 */
export function reactivateAnomaly(anomaly: Anomaly): Anomaly {
  if (anomaly.quarantineStatus !== "deferred") {
    throw new Error(
      `Cannot reactivate anomaly ${anomaly.id} - current status is ${anomaly.quarantineStatus}, expected 'deferred'`,
    );
  }

  const now = new Date().toISOString();
  return {
    ...anomaly,
    quarantineStatus: "active",
    updatedAt: now,
  };
}

/**
 * Link a spawned hypothesis to an anomaly.
 */
export function linkSpawnedHypothesis(anomaly: Anomaly, hypothesisId: string): Anomaly {
  const existing = anomaly.spawnedHypotheses ?? [];
  if (existing.includes(hypothesisId)) {
    return anomaly; // Already linked
  }

  const now = new Date().toISOString();
  return {
    ...anomaly,
    spawnedHypotheses: [...existing, hypothesisId],
    updatedAt: now,
  };
}
