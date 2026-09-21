import { z } from "zod";
import {
  type Assumption,
  type AssumptionCriticality,
  type AssumptionStatus,
  AssumptionStatusSchema,
  getAffectedByFalsification,
} from "./assumption";

/**
 * Assumption Lifecycle State Machine
 *
 * Implements the state transitions for assumptions following the Brenner method:
 * - §58: "The imprisoned imagination" — scale constraints are load-bearing
 * - §147: Exclusion requires knowing WHAT you're assuming
 *
 * State machine:
 *   unchecked → {challenged, verified, falsified}
 *   challenged → {verified, falsified}
 *   verified → {challenged} (can be re-challenged by new evidence)
 *   falsified → (terminal - triggers propagation cascade)
 *
 * CRITICAL: When an assumption is falsified:
 * 1. All linked hypotheses get flagged as "assumption-undermined"
 * 2. All linked tests get flagged as "assumption-invalidated"
 * 3. User must decide: revise hypothesis, re-evaluate test, or accept risk
 *
 * @see brenner_bot-5kr7.3 (bead)
 */

// ============================================================================
// State Machine Types
// ============================================================================

/**
 * Triggers that cause assumption state transitions.
 *
 * - challenge: Question an unchecked or verified assumption
 * - verify: Evidence supports the assumption (for now)
 * - falsify: Evidence contradicts the assumption (triggers propagation!)
 */
export const AssumptionTriggerSchema = z.enum(["challenge", "verify", "falsify"]);

export type AssumptionTrigger = z.infer<typeof AssumptionTriggerSchema>;

/**
 * Valid state transitions for assumptions.
 *
 * State machine:
 *
 *              ┌─────────────┐
 *              │  unchecked  │
 *              └──────┬──────┘
 *         challenge ╱ │ ╲ falsify
 *                 ╱   │verify  ╲
 *                ╱    │         ╲
 *               ▼     ▼          ▼
 *     ┌──────────┐ ┌──────────┐ ┌──────────┐
 *     │challenged│ │ verified │ │falsified │
 *     └────┬─────┘ └────┬─────┘ └──────────┘
 *          │ verify     │ challenge  (terminal)
 *          │            │
 *          ▼            ▼
 *     ┌──────────┐ ┌──────────┐
 *     │ verified │ │challenged│
 *     └──────────┘ └──────────┘
 *
 * Terminal state: falsified (triggers propagation cascade)
 * Note: verified can be re-challenged by new evidence
 */
export const VALID_ASSUMPTION_TRANSITIONS: Record<
  AssumptionStatus,
  Partial<Record<AssumptionTrigger, AssumptionStatus>>
> = {
  unchecked: {
    challenge: "challenged",
    verify: "verified",
    falsify: "falsified",
  },
  challenged: {
    verify: "verified",
    falsify: "falsified",
  },
  verified: {
    challenge: "challenged", // New evidence can re-challenge a verified assumption
  },
  falsified: {
    // Terminal state - no transitions allowed
    // Falsification triggers propagation cascade to linked hypotheses/tests
  },
} as const;

// ============================================================================
// Transition Record
// ============================================================================

/**
 * A record of an assumption state transition.
 * Every state change is logged for audit and history.
 */
export const AssumptionTransitionSchema = z.object({
  /** Unique ID for this transition event */
  id: z.string().uuid(),

  /** The assumption that transitioned */
  assumptionId: z.string(),

  /** State before the transition */
  fromState: AssumptionStatusSchema,

  /** State after the transition */
  toState: AssumptionStatusSchema,

  /** What triggered this transition */
  trigger: AssumptionTriggerSchema,

  /** Who or what triggered the transition */
  triggeredBy: z.string().optional(),

  /** Evidence or test that caused this transition */
  evidenceRef: z.string().optional(),

  /** Human-readable reason for the transition */
  reason: z.string().optional(),

  /** When this transition occurred */
  timestamp: z.string().datetime(),

  /** Session where this transition happened */
  sessionId: z.string().optional(),
});

export type AssumptionTransition = z.infer<typeof AssumptionTransitionSchema>;

/**
 * An assumption with its transition history attached.
 */
export interface AssumptionWithHistory extends Assumption {
  transitionHistory: AssumptionTransition[];
}

// ============================================================================
// Propagation Types
// ============================================================================

/**
 * Result of a falsification propagation.
 * When an assumption is falsified, this describes the cascade effect.
 */
export interface PropagationResult {
  /** The assumption that was falsified */
  falsifiedAssumptionId: string;

  /** Hypotheses that are now undermined (depend on this assumption) */
  undermindedHypotheses: string[];

  /** Tests that are now invalidated (require this assumption) */
  invalidatedTests: string[];

  /** Human-readable summary of the cascade */
  summary: string;

  /** When the propagation was computed */
  timestamp: string;
}

/**
 * Result of a dependency cascade analysis across assumptions.
 */
export interface AssumptionCascadeResult {
  rootAssumptionId: string;
  affectedAssumptionIds: string[];
  byCriticality: Record<AssumptionCriticality, number>;
}

// ============================================================================
// Transition Errors
// ============================================================================

/**
 * Error codes for assumption transition failures.
 */
export const AssumptionTransitionErrorCode = {
  INVALID_TRANSITION: "INVALID_TRANSITION",
  TERMINAL_STATE: "TERMINAL_STATE",
  MISSING_EVIDENCE: "MISSING_EVIDENCE",
} as const;

export type AssumptionTransitionErrorCode =
  (typeof AssumptionTransitionErrorCode)[keyof typeof AssumptionTransitionErrorCode];

export interface AssumptionTransitionError {
  code: AssumptionTransitionErrorCode;
  message: string;
  fromState: AssumptionStatus;
  toState: AssumptionStatus;
  trigger: AssumptionTrigger;
}

export type AssumptionTransitionResult =
  | {
      success: true;
      assumption: Assumption;
      transition: AssumptionTransition;
      propagation?: PropagationResult;
    }
  | { success: false; error: AssumptionTransitionError };

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if a transition is valid according to the state machine.
 */
export function isValidAssumptionTransition(
  fromState: AssumptionStatus,
  trigger: AssumptionTrigger,
): boolean {
  const transitions = VALID_ASSUMPTION_TRANSITIONS[fromState];
  return trigger in transitions;
}

/**
 * Get the target state for a transition, or null if invalid.
 */
export function getAssumptionTargetState(
  fromState: AssumptionStatus,
  trigger: AssumptionTrigger,
): AssumptionStatus | null {
  const transitions = VALID_ASSUMPTION_TRANSITIONS[fromState];
  return (transitions[trigger] as AssumptionStatus) ?? null;
}

/**
 * Get all valid triggers from a given state.
 */
export function getValidAssumptionTriggers(fromState: AssumptionStatus): AssumptionTrigger[] {
  const transitions = VALID_ASSUMPTION_TRANSITIONS[fromState];
  return Object.keys(transitions) as AssumptionTrigger[];
}

/**
 * Check if a state is terminal (no further transitions allowed).
 */
export function isTerminalAssumptionState(state: AssumptionStatus): boolean {
  return state === "falsified";
}

/**
 * Validate transition requirements.
 *
 * Falsification should ideally include evidence reference.
 */
export function validateAssumptionTransitionRequirements(
  trigger: AssumptionTrigger,
  options: {
    evidenceRef?: string;
  },
): { valid: boolean; warning?: string } {
  if (trigger === "falsify" && !options.evidenceRef) {
    return {
      valid: true, // Allow without evidence, but warn
      warning:
        "Falsifying an assumption without evidence reference. Consider providing evidenceRef for audit trail.",
    };
  }

  if (trigger === "verify" && !options.evidenceRef) {
    return {
      valid: true, // Allow without evidence, but warn
      warning:
        "Verifying an assumption without evidence reference. Consider providing evidenceRef for audit trail.",
    };
  }

  return { valid: true };
}

// ============================================================================
// Propagation Logic
// ============================================================================

/**
 * Compute the propagation cascade when an assumption is falsified.
 *
 * This is the CRITICAL function that implements:
 * 1. Flag all linked hypotheses as "assumption-undermined"
 * 2. Flag all linked tests as "assumption-invalidated"
 *
 * Note: This function computes what SHOULD be affected.
 * The actual update to hypothesis/test records must be done by the caller.
 */
export function computeFalsificationPropagation(assumption: Assumption): PropagationResult {
  const affected = getAffectedByFalsification(assumption);

  const undermindedCount = affected.hypotheses.length;
  const invalidatedCount = affected.tests.length;

  let summary = `Assumption ${assumption.id} falsified.`;
  if (undermindedCount > 0) {
    summary += ` ${undermindedCount} hypothesis(es) undermined: ${affected.hypotheses.join(", ")}.`;
  }
  if (invalidatedCount > 0) {
    summary += ` ${invalidatedCount} test(s) invalidated: ${affected.tests.join(", ")}.`;
  }
  if (undermindedCount === 0 && invalidatedCount === 0) {
    summary += " No linked hypotheses or tests affected.";
  }

  return {
    falsifiedAssumptionId: assumption.id,
    undermindedHypotheses: affected.hypotheses,
    invalidatedTests: affected.tests,
    summary,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Compute the downstream assumption cascade if a given assumption fails.
 * This uses the dependsOn graph across assumptions.
 */
export function computeAssumptionCascade(
  assumptions: Assumption[],
  rootAssumptionId: string,
): AssumptionCascadeResult {
  const assumptionById = new Map(assumptions.map((assumption) => [assumption.id, assumption]));
  const dependents = new Map<string, string[]>();

  for (const assumption of assumptions) {
    for (const dependency of assumption.dependsOn ?? []) {
      const existing = dependents.get(dependency) ?? [];
      existing.push(assumption.id);
      dependents.set(dependency, existing);
    }
  }

  const visited = new Set<string>();
  const queue = [...(dependents.get(rootAssumptionId) ?? [])];

  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    if (!current || current === rootAssumptionId || visited.has(current)) continue;
    visited.add(current);
    const next = dependents.get(current);
    if (next && next.length > 0) {
      queue.push(...next);
    }
  }

  const byCriticality: Record<AssumptionCriticality, number> = {
    foundational: 0,
    important: 0,
    minor: 0,
  };

  for (const id of visited) {
    const assumption = assumptionById.get(id);
    if (!assumption) continue;
    byCriticality[assumption.criticality] += 1;
  }

  return {
    rootAssumptionId,
    affectedAssumptionIds: Array.from(visited),
    byCriticality,
  };
}

// ============================================================================
// Transition Functions
// ============================================================================

/**
 * Generate a unique transition ID.
 */
function generateTransitionId(): string {
  return crypto.randomUUID();
}

/**
 * Attempt to transition an assumption to a new state.
 *
 * This function:
 * 1. Validates the transition is allowed
 * 2. Creates a transition record
 * 3. If falsifying, computes propagation cascade
 * 4. Returns the updated assumption
 *
 * @example
 * ```typescript
 * const result = transitionAssumption(assumption, "falsify", {
 *   evidenceRef: "T-RS20251230-001",
 *   reason: "Test showed assumption doesn't hold at scale",
 * });
 * if (result.success) {
 *   console.log(`Transitioned to ${result.assumption.status}`);
 *   if (result.propagation) {
 *     console.log(`Cascade: ${result.propagation.summary}`);
 *   }
 * }
 * ```
 */
export function transitionAssumption(
  assumption: Assumption,
  trigger: AssumptionTrigger,
  options: {
    triggeredBy?: string;
    evidenceRef?: string;
    reason?: string;
    sessionId?: string;
  } = {},
): AssumptionTransitionResult {
  const fromState = assumption.status;

  // Check if transition is valid
  const toState = getAssumptionTargetState(fromState, trigger);
  if (!toState) {
    // Check if it's a terminal state
    if (isTerminalAssumptionState(fromState)) {
      return {
        success: false,
        error: {
          code: AssumptionTransitionErrorCode.TERMINAL_STATE,
          message: `Cannot transition from terminal state '${fromState}'. Assumption ${assumption.id} has been falsified and cannot change.`,
          fromState,
          toState: fromState,
          trigger,
        },
      };
    }

    return {
      success: false,
      error: {
        code: AssumptionTransitionErrorCode.INVALID_TRANSITION,
        message: `Invalid transition: cannot ${trigger} from state '${fromState}'. Valid triggers: ${getValidAssumptionTriggers(fromState).join(", ") || "none"}`,
        fromState,
        toState: fromState,
        trigger,
      },
    };
  }

  // Validate requirements (soft validation - returns warnings)
  // Result intentionally unused; could be logged in future if needed
  validateAssumptionTransitionRequirements(trigger, options);

  // Create transition record
  const transition: AssumptionTransition = {
    id: generateTransitionId(),
    assumptionId: assumption.id,
    fromState,
    toState,
    trigger,
    triggeredBy: options.triggeredBy,
    evidenceRef: options.evidenceRef,
    reason: options.reason,
    timestamp: new Date().toISOString(),
    sessionId: options.sessionId,
  };

  // Update assumption state
  const updatedAssumption: Assumption = {
    ...assumption,
    status: toState,
    updatedAt: transition.timestamp,
  };

  // Compute propagation if falsifying
  let propagation: PropagationResult | undefined;
  if (trigger === "falsify") {
    propagation = computeFalsificationPropagation(updatedAssumption);
  }

  return {
    success: true,
    assumption: updatedAssumption,
    transition,
    propagation,
  };
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Challenge an unchecked or verified assumption.
 * This moves it to the "challenged" state, indicating it needs evaluation.
 */
export function challengeAssumption(
  assumption: Assumption,
  options: {
    triggeredBy?: string;
    evidenceRef?: string;
    reason?: string;
    sessionId?: string;
  } = {},
): AssumptionTransitionResult {
  return transitionAssumption(assumption, "challenge", options);
}

/**
 * Verify an assumption with supporting evidence.
 * This moves it to the "verified" state (can still be re-challenged later).
 */
export function verifyAssumption(
  assumption: Assumption,
  options: {
    triggeredBy?: string;
    evidenceRef?: string;
    reason?: string;
    sessionId?: string;
  } = {},
): AssumptionTransitionResult {
  return transitionAssumption(assumption, "verify", options);
}

/**
 * Falsify an assumption with contradicting evidence.
 * This is a terminal state and triggers propagation cascade!
 *
 * CRITICAL: When this succeeds, the caller should:
 * 1. Check result.propagation for affected hypotheses/tests
 * 2. Update those hypotheses/tests to reflect the undermined state
 * 3. Notify the user about the cascade effect
 */
export function falsifyAssumption(
  assumption: Assumption,
  options: {
    triggeredBy?: string;
    evidenceRef?: string;
    reason?: string;
    sessionId?: string;
  } = {},
): AssumptionTransitionResult {
  return transitionAssumption(assumption, "falsify", options);
}

// ============================================================================
// History Management
// ============================================================================

/**
 * Create an assumption transition history store.
 * In-memory for now; can be backed by persistent storage.
 */
export class AssumptionTransitionHistoryStore {
  private history: Map<string, AssumptionTransition[]> = new Map();

  /**
   * Add a transition to the history.
   */
  add(transition: AssumptionTransition): void {
    const existing = this.history.get(transition.assumptionId) ?? [];
    existing.push(transition);
    this.history.set(transition.assumptionId, existing);
  }

  /**
   * Get all transitions for an assumption.
   */
  getHistory(assumptionId: string): AssumptionTransition[] {
    return this.history.get(assumptionId) ?? [];
  }

  /**
   * Get the most recent transition for an assumption.
   */
  getLatestTransition(assumptionId: string): AssumptionTransition | null {
    const transitions = this.getHistory(assumptionId);
    return transitions.length > 0 ? transitions[transitions.length - 1] : null;
  }

  /**
   * Get all assumptions that were falsified.
   */
  getFalsifiedAssumptions(): string[] {
    const result: string[] = [];
    for (const [assumptionId, transitions] of this.history.entries()) {
      if (transitions.some((t) => t.trigger === "falsify")) {
        result.push(assumptionId);
      }
    }
    return result;
  }

  /**
   * Get all transitions triggered by a specific evidence reference.
   */
  getTransitionsByEvidence(evidenceRef: string): AssumptionTransition[] {
    const result: AssumptionTransition[] = [];
    for (const transitions of this.history.values()) {
      for (const t of transitions) {
        if (t.evidenceRef === evidenceRef) {
          result.push(t);
        }
      }
    }
    return result;
  }

  /**
   * Get all transitions in chronological order.
   */
  getAllTransitions(): AssumptionTransition[] {
    const all: AssumptionTransition[] = [];
    for (const transitions of this.history.values()) {
      all.push(...transitions);
    }
    return all.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  /**
   * Clear all history (useful for testing).
   */
  clear(): void {
    this.history.clear();
  }

  /**
   * Export history to a serializable format.
   */
  export(): Record<string, AssumptionTransition[]> {
    const result: Record<string, AssumptionTransition[]> = {};
    for (const [key, value] of this.history.entries()) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Import history from a serialized format.
   */
  import(data: Record<string, AssumptionTransition[]>): void {
    this.history.clear();
    for (const [key, value] of Object.entries(data)) {
      // Validate each transition
      const validated = value.map((t) => AssumptionTransitionSchema.parse(t));
      this.history.set(key, validated);
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export { type AssumptionStatus, AssumptionStatusSchema } from "./assumption";
