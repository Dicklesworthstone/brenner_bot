import { z } from "zod";

/**
 * Assumption Registry Schema
 *
 * Canonical data schema for tracking assumptions as first-class entities
 * with lifecycle states, dependency links, and scale/physics checks.
 *
 * This fills a CRITICAL gap in the Brenner method implementation:
 * - §58: "The imprisoned imagination" — scale constraints are load-bearing
 * - §147: Exclusion requires knowing WHAT you're assuming
 * - Artifact Schema Section 5: Assumption Ledger
 *
 * @see specs/artifact_schema_v0.1.md - Section 5: Assumption Ledger
 * @see brenner_bot-5kr7.1 (bead)
 */

// ============================================================================
// ID Patterns
// ============================================================================

/**
 * Assumption ID format: A-{session_id}-{sequence} or simple A{n}
 * Examples: A-RS20251230-001, A-CELL-FATE-001-002, A1, A42
 *
 * The session_id portion allows alphanumeric with dashes.
 * The sequence is a 3-digit zero-padded number.
 * Simple A{n} format supported for backwards compatibility.
 */
const assumptionIdPattern = /^A-[A-Za-z0-9][\w-]*-\d{3}$|^A\d+$/;

/**
 * Hypothesis ID format for links: H-{session_id}-{sequence}
 */
const hypothesisIdPattern = /^H-[A-Za-z0-9][\w-]*-\d{3}$/;

/**
 * Test ID format for links: T-{session_id}-{sequence} or simple T{n}
 * Simple T{n} format supported for backwards compatibility.
 */
const testIdPattern = /^T-[A-Za-z0-9][\w-]*-\d{3}$|^T\d+$/;

/**
 * Transcript anchor format: §n or §n-m for ranges
 */
const anchorPattern = /^§\d+(-\d+)?$/;

// ============================================================================
// Enums
// ============================================================================

/**
 * Types of assumptions in the Brenner method.
 *
 * From the artifact schema and evaluation rubric:
 * - background: Domain knowledge assumed true (e.g., "cells divide")
 * - methodological: Assumptions about experimental approach
 * - boundary: Scope/applicability assumptions (WHERE/WHEN)
 * - scale_physics: Physical/mathematical constraints (MANDATORY to have at least one!)
 *
 * The scale_physics type is special - it represents the "imprisoned imagination"
 * constraint from Brenner. Every research program MUST have at least one.
 */
export const AssumptionTypeSchema = z.enum([
  "background",
  "methodological",
  "boundary",
  "scale_physics",
]);

export type AssumptionType = z.infer<typeof AssumptionTypeSchema>;

/**
 * Lifecycle states for assumptions.
 *
 * State machine:
 *   unchecked -> {challenged, verified, falsified}
 *   challenged -> {verified, falsified}
 *
 * When an assumption is **falsified**:
 * 1. All linked hypotheses get flagged as "assumption-undermined"
 * 2. All linked tests get flagged as "assumption-invalidated"
 * 3. User must decide: revise hypothesis, re-evaluate test, or accept risk
 *
 * - unchecked: Not yet validated (default state)
 * - challenged: Someone has questioned it
 * - verified: Evidence supports it
 * - falsified: Evidence contradicts it (triggers propagation!)
 */
export const AssumptionStatusSchema = z.enum(["unchecked", "challenged", "verified", "falsified"]);

export type AssumptionStatus = z.infer<typeof AssumptionStatusSchema>;

/**
 * How load-bearing this assumption is.
 */
export const AssumptionCriticalitySchema = z.enum(["foundational", "important", "minor"]);

export type AssumptionCriticality = z.infer<typeof AssumptionCriticalitySchema>;

// ============================================================================
// Sub-schemas
// ============================================================================

/**
 * Load schema - what breaks if this assumption is wrong?
 *
 * This is critical for propagating invalidation when an assumption
 * is falsified. Links to hypotheses and tests that depend on this assumption.
 */
export const AssumptionLoadSchema = z.object({
  /**
   * Hypothesis IDs that depend on this assumption (H-{session}-{seq} format).
   */
  affectedHypotheses: z.array(
    z.string().regex(hypothesisIdPattern, "Invalid hypothesis ID format"),
  ),

  /**
   * Test IDs that require this assumption (T-{session}-{seq} or T{n} format).
   */
  affectedTests: z.array(z.string().regex(testIdPattern, "Invalid test ID format")),

  /**
   * Human-readable description of what depends on this assumption.
   */
  description: z.string().min(1, "Load description is required"),
});

export type AssumptionLoad = z.infer<typeof AssumptionLoadSchema>;

/**
 * Calculation schema - for scale_physics assumptions.
 *
 * From the evaluation rubric, scale checks are scored 0-3:
 * - 0: No scale check or hand-waved
 * - 1: Qualitative reasoning without calculation
 * - 2: Calculation present but incomplete
 * - 3: Full calculation with units, result, and implications
 *
 * A complete calculation has all fields filled.
 */
export const ScaleCalculationSchema = z.object({
  /**
   * The quantities involved and their values.
   * @example "D ≈ 10 μm²/s, L ≈ 100 μm"
   */
  quantities: z.string().min(1, "Quantities are required"),

  /**
   * The calculated result.
   * @example "τ ≈ L²/D ≈ 1000s ≈ 17 min"
   */
  result: z.string().min(1, "Result is required"),

  /**
   * Units used in the calculation.
   * @example "seconds, micrometers"
   */
  units: z.string().min(1, "Units are required"),

  /**
   * What the calculation implies for the research.
   * @example "Gradient-based signaling is physically plausible"
   */
  implication: z.string().min(1, "Implication is required"),

  /**
   * What this calculation rules out (optional).
   * @example "Rules out H3 if τ > cell cycle"
   */
  whatItRulesOut: z.string().optional(),
});

export type ScaleCalculation = z.infer<typeof ScaleCalculationSchema>;

// ============================================================================
// Main Schema
// ============================================================================

/**
 * The canonical Assumption schema.
 *
 * Design principles:
 * 1. Load tracking is mandatory - we must know what breaks
 * 2. scale_physics type requires a calculation
 * 3. Lifecycle state changes trigger propagation
 * 4. Provenance via anchors for traceability
 */
export const AssumptionSchema = z.object({
  // === IDENTITY ===

  /**
   * Stable ID format: A-{session_id}-{sequence}
   * @example "A-RS20251230-001"
   */
  id: z
    .string()
    .regex(
      assumptionIdPattern,
      "Invalid assumption ID format (expected A-{session}-{seq} or A{n})",
    ),

  /**
   * What are we assuming is true?
   * Should be clear and specific.
   */
  statement: z
    .string()
    .min(10, "Statement must be at least 10 characters")
    .max(500, "Statement must be at most 500 characters"),

  // === CLASSIFICATION ===

  /**
   * Type of assumption.
   */
  type: AssumptionTypeSchema,

  /**
   * How load-bearing this assumption is.
   */
  criticality: AssumptionCriticalitySchema.default("important"),

  /**
   * Current lifecycle status.
   */
  status: AssumptionStatusSchema,

  /**
   * Other assumptions that must hold for this assumption to remain valid.
   */
  dependsOn: z
    .array(
      z
        .string()
        .regex(
          assumptionIdPattern,
          "Invalid assumption ID format (expected A-{session}-{seq} or A{n})",
        ),
    )
    .default([]),

  // === LOAD TRACKING ===

  /**
   * What breaks if this assumption is wrong?
   * Links to dependent hypotheses and tests.
   */
  load: AssumptionLoadSchema,

  // === TEST METHOD ===

  /**
   * How could this assumption be checked?
   * Describes how to verify or falsify this assumption.
   */
  testMethod: z.string().max(1000, "Test method description is too long").optional(),

  // === SCALE CALCULATION (for scale_physics type) ===

  /**
   * For scale_physics type: the actual calculation.
   * REQUIRED when type is scale_physics.
   */
  calculation: ScaleCalculationSchema.optional(),

  // === PROVENANCE ===

  /**
   * §n transcript anchors for grounding.
   * Use when this assumption derives from transcript content.
   */
  anchors: z
    .array(z.string().regex(anchorPattern, "Invalid anchor format (expected §n or §n-m)"))
    .optional(),

  // === SESSION CONTEXT ===

  /**
   * Session where this assumption was recorded.
   */
  sessionId: z.string().min(1, "Session ID is required"),

  /**
   * Agent that recorded this assumption.
   */
  recordedBy: z.string().optional(),

  // === TIMESTAMPS ===

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  // === METADATA ===

  /**
   * Free-form notes.
   */
  notes: z.string().max(2000, "Notes too long").optional(),
});

export type Assumption = z.infer<typeof AssumptionSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if a scale_physics assumption is missing its calculation.
 * This is a soft validation - call this separately to generate warnings.
 */
export function warnMissingCalculation(assumption: Assumption): string | null {
  if (assumption.type === "scale_physics" && !assumption.calculation) {
    return `Assumption ${assumption.id}: scale_physics assumptions should include a calculation for full rigor`;
  }
  return null;
}

/**
 * Evaluate the rigor of a scale calculation.
 *
 * From the evaluation rubric "Scale Check Rigor" dimension:
 * - 0: No calculation
 * - 1: Has calculation but missing fields
 * - 2: Has all required fields but no implication
 * - 3: Complete calculation with implication
 */
export function evaluateScaleRigor(calculation?: ScaleCalculation): 0 | 1 | 2 | 3 {
  if (!calculation) return 0;

  const hasQuantities = Boolean(calculation.quantities?.trim());
  const hasResult = Boolean(calculation.result?.trim());
  const hasUnits = Boolean(calculation.units?.trim());
  const hasImplication = Boolean(calculation.implication?.trim());

  if (!hasQuantities || !hasResult) return 1;
  if (!hasUnits || !hasImplication) return 2;
  return 3;
}

/**
 * Check if a research program has at least one scale_physics assumption.
 * This is MANDATORY per the Brenner method.
 */
export function validateScaleAssumptionPresence(assumptions: Assumption[]): {
  present: boolean;
  count: number;
  rigorLevels: (0 | 1 | 2 | 3)[];
  message: string;
} {
  const scaleAssumptions = assumptions.filter((a) => a.type === "scale_physics");

  if (scaleAssumptions.length === 0) {
    return {
      present: false,
      count: 0,
      rigorLevels: [],
      message: "No scale_physics assumption found. Every research program MUST have at least one.",
    };
  }

  const rigorLevels = scaleAssumptions.map((a) => evaluateScaleRigor(a.calculation));
  const maxRigor = Math.max(...rigorLevels) as 0 | 1 | 2 | 3;

  return {
    present: true,
    count: scaleAssumptions.length,
    rigorLevels,
    message:
      maxRigor === 3
        ? "Scale_physics assumptions present with full rigor."
        : `Scale_physics assumptions present but max rigor is ${maxRigor}/3. Consider adding full calculations.`,
  };
}

/**
 * Get all assumptions that would be affected by falsifying a given assumption.
 * For now, this just returns the linked hypotheses and tests.
 * In a full implementation, this would recursively trace dependencies.
 */
export function getAffectedByFalsification(assumption: Assumption): {
  hypotheses: string[];
  tests: string[];
} {
  return {
    hypotheses: assumption.load.affectedHypotheses,
    tests: assumption.load.affectedTests,
  };
}

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Maximum sequence number for assumption IDs.
 * IDs use 3-digit sequences (001-999).
 */
const MAX_ASSUMPTION_SEQUENCE = 999;

/**
 * Generate a new assumption ID for a session.
 * IDs are monotonically increasing within a session.
 *
 * @throws Error if the session already has 999 assumptions (sequence overflow)
 */
export function generateAssumptionId(sessionId: string, existingIds: string[]): string {
  const prefix = `A-${sessionId}-`;
  const sequences = existingIds
    .filter((id) => id.startsWith(prefix))
    .map((id) => {
      const match = id.match(/-(\d{3})$/);
      return match ? parseInt(match[1], 10) : 0;
    });

  const nextSeq = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;

  if (nextSeq > MAX_ASSUMPTION_SEQUENCE) {
    throw new Error(
      `Assumption sequence overflow for session "${sessionId}": maximum ${MAX_ASSUMPTION_SEQUENCE} assumptions per session exceeded`,
    );
  }

  return `${prefix}${nextSeq.toString().padStart(3, "0")}`;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for assumption ID format.
 */
export function isValidAssumptionId(id: string): boolean {
  return assumptionIdPattern.test(id);
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
 * Create a new assumption with required fields and sensible defaults.
 */
export function createAssumption(input: {
  id: string;
  statement: string;
  type: AssumptionType;
  sessionId: string;
  load: AssumptionLoad;
  criticality?: AssumptionCriticality;
  status?: AssumptionStatus;
  dependsOn?: string[];
  testMethod?: string;
  calculation?: ScaleCalculation;
  anchors?: string[];
  recordedBy?: string;
  notes?: string;
}): Assumption {
  const now = new Date().toISOString();
  return AssumptionSchema.parse({
    id: input.id,
    statement: input.statement,
    type: input.type,
    criticality: input.criticality ?? "important",
    status: input.status ?? "unchecked",
    dependsOn: input.dependsOn ?? [],
    load: input.load,
    testMethod: input.testMethod,
    calculation: input.calculation,
    anchors: input.anchors,
    sessionId: input.sessionId,
    recordedBy: input.recordedBy,
    createdAt: now,
    updatedAt: now,
    notes: input.notes,
  });
}

/**
 * Create a scale_physics assumption (convenience factory).
 * Calculation is required for full rigor.
 */
export function createScaleAssumption(input: {
  id: string;
  statement: string;
  sessionId: string;
  load: AssumptionLoad;
  calculation: ScaleCalculation;
  criticality?: AssumptionCriticality;
  dependsOn?: string[];
  testMethod?: string;
  anchors?: string[];
  recordedBy?: string;
  notes?: string;
}): Assumption {
  return createAssumption({
    ...input,
    type: "scale_physics",
    status: "unchecked",
  });
}
