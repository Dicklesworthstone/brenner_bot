import { z } from "zod";

/**
 * Research Program Schema
 *
 * Aggregates research progress across multiple sessions into a coherent
 * program view. Enables researchers to understand overall state without
 * reading every session artifact.
 *
 * A Research Program groups related sessions and provides:
 * - Hypothesis funnel (by state and origin type)
 * - Registry health metrics (assumptions, anomalies, critiques)
 * - Test execution status
 * - Timeline of major events
 * - Health check warnings
 *
 * @see brenner_bot-2qyl (bead)
 */

// ============================================================================
// ID Patterns
// ============================================================================

/**
 * Research Program ID format: RP-{slug}-{sequence}
 * Examples: RP-CELL-FATE-001, RP-EMBRYO-DEV-002
 *
 * The slug portion allows alphanumeric with dashes.
 * The sequence is a 3-digit zero-padded number.
 */
const programIdPattern = /^RP-[A-Za-z0-9][\w-]*-\d{3}$/;

/**
 * Session ID format - flexible to match various existing patterns:
 * - RS20251230 (no dashes)
 * - RS-20251230 (with dash)
 * - RS-20251230-test (with suffix)
 * - RS-CELL-FATE-001 (alphanumeric with dashes)
 */
const sessionIdPattern = /^RS[A-Za-z0-9-][\w-]*$/;

// ============================================================================
// Enums
// ============================================================================

/**
 * Research program status states.
 *
 * - active: Program is being actively worked on
 * - paused: Temporarily paused (e.g., waiting for resources)
 * - completed: Research goals achieved
 * - abandoned: Program discontinued (document why!)
 */
export const ProgramStatusSchema = z.enum(["active", "paused", "completed", "abandoned"]);

export type ProgramStatus = z.infer<typeof ProgramStatusSchema>;

// ============================================================================
// Health Warning Types
// ============================================================================

/**
 * Health check warning severity levels.
 */
export const WarningSeveritySchema = z.enum(["info", "warning", "critical"]);

export type WarningSeverity = z.infer<typeof WarningSeveritySchema>;

/**
 * Health check warning schema.
 */
export const HealthWarningSchema = z.object({
  /**
   * Warning code for programmatic handling.
   */
  code: z.string(),

  /**
   * Severity level.
   */
  severity: WarningSeveritySchema,

  /**
   * Human-readable warning message.
   */
  message: z.string(),

  /**
   * Related entity IDs (hypotheses, tests, etc.)
   */
  relatedIds: z.array(z.string()).optional(),

  /**
   * Suggested action to resolve.
   */
  suggestion: z.string().optional(),
});

export type HealthWarning = z.infer<typeof HealthWarningSchema>;

// ============================================================================
// Dashboard Metrics Types
// ============================================================================

/**
 * Hypothesis funnel metrics.
 */
export const HypothesisFunnelSchema = z.object({
  proposed: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  underAttack: z.number().int().nonnegative(),
  assumptionUndermined: z.number().int().nonnegative(),
  killed: z.number().int().nonnegative(),
  validated: z.number().int().nonnegative(),
  dormant: z.number().int().nonnegative(),
  refined: z.number().int().nonnegative(),
  /** Breakdown by origin */
  byOrigin: z.object({
    original: z.number().int().nonnegative(),
    thirdAlternative: z.number().int().nonnegative(),
    anomalySpawned: z.number().int().nonnegative(),
  }),
});

export type HypothesisFunnel = z.infer<typeof HypothesisFunnelSchema>;

/**
 * Registry health summary for one registry type.
 */
export const RegistryHealthSchema = z.object({
  total: z.number().int().nonnegative(),
  byStatus: z.record(z.string(), z.number().int().nonnegative()),
  /** Registry-specific metrics */
  metrics: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).optional(),
});

export type RegistryHealth = z.infer<typeof RegistryHealthSchema>;

/**
 * Test execution summary.
 */
export const TestExecutionSummarySchema = z.object({
  designed: z.number().int().nonnegative(),
  inProgress: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
  /** Potency check coverage */
  potencyCoverage: z.number().min(0).max(1),
  /** Average evidence-per-week score (0-12) */
  avgEvidenceScore: z.number().min(0).max(12).optional(),
});

export type TestExecutionSummary = z.infer<typeof TestExecutionSummarySchema>;

/**
 * Timeline event for the program.
 */
export const TimelineEventSchema = z.object({
  /**
   * Event timestamp (ISO 8601).
   */
  timestamp: z.string().datetime(),

  /**
   * Event type for categorization.
   */
  eventType: z.enum([
    "session_started",
    "hypothesis_proposed",
    "hypothesis_killed",
    "hypothesis_validated",
    "test_executed",
    "assumption_verified",
    "assumption_falsified",
    "anomaly_recorded",
    "anomaly_resolved",
    "critique_raised",
    "critique_addressed",
    "program_status_changed",
  ]),

  /**
   * Human-readable description.
   */
  description: z.string(),

  /**
   * Related entity ID (H-xxx, T-xxx, etc.)
   */
  entityId: z.string().optional(),

  /**
   * Session where this occurred.
   */
  sessionId: z.string().optional(),
});

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

/**
 * Full dashboard data structure.
 */
export const ProgramDashboardSchema = z.object({
  /**
   * Timestamp when dashboard was generated.
   */
  generatedAt: z.string().datetime(),

  /**
   * Hypothesis funnel metrics.
   */
  hypothesisFunnel: HypothesisFunnelSchema,

  /**
   * Registry health summaries.
   */
  registryHealth: z.object({
    hypotheses: RegistryHealthSchema,
    assumptions: RegistryHealthSchema,
    anomalies: RegistryHealthSchema,
    critiques: RegistryHealthSchema,
  }),

  /**
   * Test execution summary.
   */
  testExecution: TestExecutionSummarySchema,

  /**
   * Active health warnings.
   */
  warnings: z.array(HealthWarningSchema),

  /**
   * Recent timeline events.
   */
  recentEvents: z.array(TimelineEventSchema),
});

export type ProgramDashboard = z.infer<typeof ProgramDashboardSchema>;

// ============================================================================
// Main Schema
// ============================================================================

/**
 * Research Program schema.
 *
 * A Research Program groups related sessions and tracks aggregate progress.
 */
export const ResearchProgramSchema = z.object({
  /**
   * Stable ID: RP-{slug}-{sequence}
   * @example "RP-CELL-FATE-001"
   */
  id: z.string().regex(programIdPattern, "Invalid program ID format (expected RP-SLUG-NNN)"),

  /**
   * Human-readable name for the research program.
   */
  name: z.string().min(3, "Name must be at least 3 characters"),

  /**
   * Description of the research program goals.
   */
  description: z.string().min(10, "Description must be at least 10 characters"),

  /**
   * Session IDs included in this program.
   * Order matters - first session is the origin session.
   */
  sessions: z.array(
    z.string().regex(sessionIdPattern, "Invalid session ID format (expected RS...)"),
  ),

  /**
   * Current program status.
   */
  status: ProgramStatusSchema,

  /**
   * Optional free-form notes.
   */
  notes: z.string().optional(),

  /**
   * Creation timestamp (ISO 8601).
   */
  createdAt: z.string().datetime(),

  /**
   * Last update timestamp (ISO 8601).
   */
  updatedAt: z.string().datetime(),

  /**
   * Completion timestamp (ISO 8601) - set when status becomes 'completed' or 'abandoned'.
   */
  closedAt: z.string().datetime().optional(),

  /**
   * If abandoned, reason why.
   */
  abandonedReason: z.string().optional(),
});

export type ResearchProgram = z.infer<typeof ResearchProgramSchema>;

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Options for creating a new research program.
 */
export interface CreateProgramOptions {
  id: string;
  name: string;
  description: string;
  sessions?: string[];
  notes?: string;
}

/**
 * Create a new research program with validated defaults.
 */
export function createResearchProgram(options: CreateProgramOptions): ResearchProgram {
  const now = new Date().toISOString();

  const program = {
    id: options.id,
    name: options.name,
    description: options.description,
    sessions: options.sessions ?? [],
    status: "active" as const,
    notes: options.notes,
    createdAt: now,
    updatedAt: now,
  };

  return ResearchProgramSchema.parse(program);
}

/**
 * Generate a research program ID from a slug and existing IDs.
 *
 * @param slug - Base slug for the ID (e.g., "CELL-FATE")
 * @param existingIds - Existing program IDs to avoid collision
 * @returns A new unique program ID (e.g., "RP-CELL-FATE-001")
 */
export function generateProgramId(slug: string, existingIds: string[]): string {
  // Sanitize slug: uppercase, alphanumeric + dashes only
  const sanitizedSlug = slug
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!sanitizedSlug) {
    throw new Error("Slug must contain at least one alphanumeric character");
  }

  const prefix = `RP-${sanitizedSlug}-`;
  const existing = existingIds.filter((id) => id.startsWith(prefix));

  if (existing.length >= 999) {
    throw new Error(`Too many programs with slug ${sanitizedSlug} (max 999)`);
  }

  const usedSequences = new Set(
    existing.map((id) => {
      const match = id.match(/-(\d{3})$/);
      return match ? parseInt(match[1], 10) : 0;
    }),
  );

  for (let seq = 1; seq <= 999; seq++) {
    if (!usedSequences.has(seq)) {
      return `${prefix}${String(seq).padStart(3, "0")}`;
    }
  }

  throw new Error(`No available sequence numbers for slug ${sanitizedSlug}`);
}

// ============================================================================
// Transition Functions
// ============================================================================

/**
 * Add a session to a research program.
 */
export function addSessionToProgram(program: ResearchProgram, sessionId: string): ResearchProgram {
  if (!sessionIdPattern.test(sessionId)) {
    throw new Error(`Invalid session ID format: ${sessionId}`);
  }

  if (program.sessions.includes(sessionId)) {
    throw new Error(`Session ${sessionId} is already in program ${program.id}`);
  }

  const now = new Date().toISOString();

  return ResearchProgramSchema.parse({
    ...program,
    sessions: [...program.sessions, sessionId],
    updatedAt: now,
  });
}

/**
 * Remove a session from a research program.
 */
export function removeSessionFromProgram(
  program: ResearchProgram,
  sessionId: string,
): ResearchProgram {
  if (!program.sessions.includes(sessionId)) {
    throw new Error(`Session ${sessionId} is not in program ${program.id}`);
  }

  const now = new Date().toISOString();

  return ResearchProgramSchema.parse({
    ...program,
    sessions: program.sessions.filter((s) => s !== sessionId),
    updatedAt: now,
  });
}

/**
 * Pause a research program.
 */
export function pauseProgram(program: ResearchProgram, reason?: string): ResearchProgram {
  if (program.status === "completed" || program.status === "abandoned") {
    throw new Error(`Cannot pause a ${program.status} program`);
  }

  const now = new Date().toISOString();

  return ResearchProgramSchema.parse({
    ...program,
    status: "paused",
    notes: reason ? `${program.notes || ""}\n\nPaused: ${reason}`.trim() : program.notes,
    updatedAt: now,
  });
}

/**
 * Resume a paused research program.
 */
export function resumeProgram(program: ResearchProgram): ResearchProgram {
  if (program.status !== "paused") {
    throw new Error(`Cannot resume a ${program.status} program (must be paused)`);
  }

  const now = new Date().toISOString();

  return ResearchProgramSchema.parse({
    ...program,
    status: "active",
    updatedAt: now,
  });
}

/**
 * Complete a research program.
 */
export function completeProgram(program: ResearchProgram, summary?: string): ResearchProgram {
  if (program.status === "completed" || program.status === "abandoned") {
    throw new Error(`Program is already ${program.status}`);
  }

  const now = new Date().toISOString();

  return ResearchProgramSchema.parse({
    ...program,
    status: "completed",
    notes: summary ? `${program.notes || ""}\n\nCompleted: ${summary}`.trim() : program.notes,
    closedAt: now,
    updatedAt: now,
  });
}

/**
 * Abandon a research program.
 */
export function abandonProgram(program: ResearchProgram, reason: string): ResearchProgram {
  if (program.status === "completed" || program.status === "abandoned") {
    throw new Error(`Program is already ${program.status}`);
  }

  if (!reason || reason.trim().length < 10) {
    throw new Error("Abandonment reason must be at least 10 characters");
  }

  const now = new Date().toISOString();

  return ResearchProgramSchema.parse({
    ...program,
    status: "abandoned",
    abandonedReason: reason,
    closedAt: now,
    updatedAt: now,
  });
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if a string is a valid program ID.
 */
export function isValidProgramId(id: string): boolean {
  return programIdPattern.test(id);
}

/**
 * Check if a string is a valid session ID.
 */
export function isValidSessionId(id: string): boolean {
  return sessionIdPattern.test(id);
}
