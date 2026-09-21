import { z } from "zod";
import { type Hypothesis, type HypothesisState, HypothesisStateSchema } from "./hypothesis";

/**
 * Hypothesis Lifecycle State Machine
 *
 * Implements the state transitions for hypotheses following the Brenner method:
 * - §229: "When they go ugly, kill them. Get rid of them." — Hypotheses MUST be killable
 * - §103: "Both could be wrong" — Third alternatives are first-class citizens
 * - §147: "Exclusion is always a tremendously good thing" — The goal is to reduce hypothesis space
 *
 * A hypothesis is not a thing to be proven, but a thing to be tested and, ideally, eliminated.
 *
 * @see brenner_bot-6n4e (bead)
 * @see specs/evaluation_rubric_v0.1.md
 */

// ============================================================================
// State Machine Types
// ============================================================================

/**
 * Triggers that cause state transitions.
 *
 * - activate: Move from proposed to active investigation
 * - refute: Kill hypothesis with test evidence
 * - confirm: Hypothesis survived a discriminative test
 * - supersede: Replace with a more refined hypothesis
 * - defer: Park for later (not killed, just paused)
 * - reactivate: Resume investigation of a deferred hypothesis
 */
export const TransitionTriggerSchema = z.enum([
  "activate",
  "refute",
  "confirm",
  "supersede",
  "defer",
  "reactivate",
]);

export type TransitionTrigger = z.infer<typeof TransitionTriggerSchema>;

/**
 * Valid state transitions.
 *
 * State machine:
 *
 *                    ┌─────────────┐
 *                    │  proposed   │
 *                    └──────┬──────┘
 *                           │ activate
 *                           ▼
 *                    ┌─────────────┐
 *            ┌───────│   active    │───────┐
 *            │       └──────┬──────┘       │
 *            │ supersede    │              │ defer
 *            ▼              │              ▼
 *     ┌─────────────┐       │       ┌─────────────┐
 *     │ superseded  │       │       │  deferred   │
 *     └─────────────┘       │       └─────────────┘
 *                           │              │
 *              ┌────────────┼──────────────┘
 *              │            │         reactivate
 *              ▼            ▼
 *     ┌─────────────┐ ┌─────────────┐
 *     │  refuted    │ │  confirmed  │
 *     └─────────────┘ └─────────────┘
 *
 * Terminal states: refuted, superseded (no further transitions allowed)
 * Confirmed can still be superseded or refuted by new evidence
 */
export const VALID_TRANSITIONS: Record<
  HypothesisState,
  Partial<Record<TransitionTrigger, HypothesisState>>
> = {
  proposed: {
    activate: "active",
    defer: "deferred",
  },
  active: {
    refute: "refuted",
    confirm: "confirmed",
    supersede: "superseded",
    defer: "deferred",
  },
  confirmed: {
    supersede: "superseded",
    refute: "refuted", // New test can invalidate
  },
  refuted: {
    // Terminal state - no transitions allowed
    // §229: "When they go ugly, kill them. Get rid of them."
  },
  superseded: {
    // Terminal state - hypothesis is replaced, not resurrected
  },
  deferred: {
    reactivate: "active",
  },
} as const;

// ============================================================================
// Transition Record
// ============================================================================

/**
 * A record of a state transition.
 * Every state change is logged for audit and history.
 */
export const StateTransitionSchema = z.object({
  /** Unique ID for this transition event */
  id: z.string().uuid(),

  /** The hypothesis that transitioned */
  hypothesisId: z.string(),

  /** State before the transition */
  fromState: HypothesisStateSchema,

  /** State after the transition */
  toState: HypothesisStateSchema,

  /** What triggered this transition */
  trigger: TransitionTriggerSchema,

  /** Who or what triggered the transition */
  triggeredBy: z.string().optional(),

  /** For refute/confirm: link to the test result that caused this */
  testResultId: z.string().optional(),

  /** For supersede: link to the child hypothesis that replaces this one */
  childHypothesisId: z.string().optional(),

  /** Human-readable reason for the transition */
  reason: z.string().optional(),

  /** When this transition occurred */
  timestamp: z.string().datetime(),

  /** Session where this transition happened */
  sessionId: z.string().optional(),
});

export type StateTransition = z.infer<typeof StateTransitionSchema>;

/**
 * A hypothesis with its transition history attached.
 */
export interface HypothesisWithHistory extends Hypothesis {
  transitionHistory: StateTransition[];
}

// ============================================================================
// Transition Errors
// ============================================================================

/**
 * Error codes for transition failures.
 */
export const TransitionErrorCode = {
  INVALID_TRANSITION: "INVALID_TRANSITION",
  MISSING_TEST_RESULT: "MISSING_TEST_RESULT",
  MISSING_CHILD_HYPOTHESIS: "MISSING_CHILD_HYPOTHESIS",
  TERMINAL_STATE: "TERMINAL_STATE",
} as const;

export type TransitionErrorCode = (typeof TransitionErrorCode)[keyof typeof TransitionErrorCode];

export interface TransitionError {
  code: TransitionErrorCode;
  message: string;
  fromState: HypothesisState;
  toState: HypothesisState;
  trigger: TransitionTrigger;
}

export type TransitionResult =
  | { success: true; hypothesis: Hypothesis; transition: StateTransition }
  | { success: false; error: TransitionError };

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if a transition is valid according to the state machine.
 */
export function isValidTransition(fromState: HypothesisState, trigger: TransitionTrigger): boolean {
  const transitions = VALID_TRANSITIONS[fromState];
  return trigger in transitions;
}

/**
 * Get the target state for a transition, or null if invalid.
 */
export function getTargetState(
  fromState: HypothesisState,
  trigger: TransitionTrigger,
): HypothesisState | null {
  const transitions = VALID_TRANSITIONS[fromState];
  return (transitions[trigger] as HypothesisState) ?? null;
}

/**
 * Get all valid triggers from a given state.
 */
export function getValidTriggers(fromState: HypothesisState): TransitionTrigger[] {
  const transitions = VALID_TRANSITIONS[fromState];
  return Object.keys(transitions) as TransitionTrigger[];
}

/**
 * Check if a state is terminal (no further transitions allowed).
 */
export function isTerminalState(state: HypothesisState): boolean {
  return state === "refuted" || state === "superseded";
}

/**
 * Validate transition requirements.
 *
 * Some transitions have requirements:
 * - refute/confirm: Must provide testResultId
 * - supersede: Must provide childHypothesisId
 */
export function validateTransitionRequirements(
  trigger: TransitionTrigger,
  options: {
    testResultId?: string;
    childHypothesisId?: string;
  },
): { valid: boolean; error?: string } {
  switch (trigger) {
    case "refute":
    case "confirm":
      if (!options.testResultId) {
        return {
          valid: false,
          error: `${trigger} transition requires a testResultId linking to the test that ${trigger === "refute" ? "invalidated" : "supported"} the hypothesis`,
        };
      }
      break;

    case "supersede":
      if (!options.childHypothesisId) {
        return {
          valid: false,
          error:
            "supersede transition requires a childHypothesisId linking to the replacement hypothesis",
        };
      }
      break;
  }

  return { valid: true };
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
 * Attempt to transition a hypothesis to a new state.
 *
 * This function:
 * 1. Validates the transition is allowed
 * 2. Validates any requirements (testResultId, childHypothesisId)
 * 3. Creates a transition record
 * 4. Returns the updated hypothesis
 *
 * @example
 * ```typescript
 * const result = transitionHypothesis(hypothesis, "activate");
 * if (result.success) {
 *   console.log(`Transitioned to ${result.hypothesis.state}`);
 * } else {
 *   console.error(result.error.message);
 * }
 * ```
 */
export function transitionHypothesis(
  hypothesis: Hypothesis,
  trigger: TransitionTrigger,
  options: {
    triggeredBy?: string;
    testResultId?: string;
    childHypothesisId?: string;
    reason?: string;
    sessionId?: string;
  } = {},
): TransitionResult {
  const fromState = hypothesis.state;

  // Check if transition is valid
  const toState = getTargetState(fromState, trigger);
  if (!toState) {
    // Check if it's a terminal state
    if (isTerminalState(fromState)) {
      return {
        success: false,
        error: {
          code: TransitionErrorCode.TERMINAL_STATE,
          message: `Cannot transition from terminal state '${fromState}'. Hypothesis ${hypothesis.id} has been ${fromState} and cannot change.`,
          fromState,
          toState: fromState, // No valid target
          trigger,
        },
      };
    }

    return {
      success: false,
      error: {
        code: TransitionErrorCode.INVALID_TRANSITION,
        message: `Invalid transition: cannot ${trigger} from state '${fromState}'. Valid triggers: ${getValidTriggers(fromState).join(", ") || "none"}`,
        fromState,
        toState: fromState, // No valid target
        trigger,
      },
    };
  }

  // Validate requirements
  const reqCheck = validateTransitionRequirements(trigger, options);
  if (!reqCheck.valid) {
    const errorCode =
      trigger === "supersede"
        ? TransitionErrorCode.MISSING_CHILD_HYPOTHESIS
        : TransitionErrorCode.MISSING_TEST_RESULT;

    return {
      success: false,
      error: {
        code: errorCode,
        message: reqCheck.error ?? "Missing transition requirement.",
        fromState,
        toState,
        trigger,
      },
    };
  }

  // Create transition record
  const transition: StateTransition = {
    id: generateTransitionId(),
    hypothesisId: hypothesis.id,
    fromState,
    toState,
    trigger,
    triggeredBy: options.triggeredBy,
    testResultId: options.testResultId,
    childHypothesisId: options.childHypothesisId,
    reason: options.reason,
    timestamp: new Date().toISOString(),
    sessionId: options.sessionId,
  };

  // Update hypothesis state
  const updatedHypothesis: Hypothesis = {
    ...hypothesis,
    state: toState,
    updatedAt: transition.timestamp,
  };

  return {
    success: true,
    hypothesis: updatedHypothesis,
    transition,
  };
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Activate a proposed hypothesis (move to active investigation).
 */
export function activateHypothesis(
  hypothesis: Hypothesis,
  options: { triggeredBy?: string; reason?: string; sessionId?: string } = {},
): TransitionResult {
  return transitionHypothesis(hypothesis, "activate", options);
}

/**
 * Refute a hypothesis with test evidence.
 * §229: "When they go ugly, kill them. Get rid of them."
 */
export function refuteHypothesis(
  hypothesis: Hypothesis,
  testResultId: string,
  options: { triggeredBy?: string; reason?: string; sessionId?: string } = {},
): TransitionResult {
  return transitionHypothesis(hypothesis, "refute", {
    ...options,
    testResultId,
  });
}

/**
 * Confirm a hypothesis (survived a discriminative test).
 * This is rare - science is asymmetric, confirmation is provisional.
 */
export function confirmHypothesis(
  hypothesis: Hypothesis,
  testResultId: string,
  options: { triggeredBy?: string; reason?: string; sessionId?: string } = {},
): TransitionResult {
  return transitionHypothesis(hypothesis, "confirm", {
    ...options,
    testResultId,
  });
}

/**
 * Supersede a hypothesis with a more refined version.
 */
export function supersedeHypothesis(
  hypothesis: Hypothesis,
  childHypothesisId: string,
  options: { triggeredBy?: string; reason?: string; sessionId?: string } = {},
): TransitionResult {
  return transitionHypothesis(hypothesis, "supersede", {
    ...options,
    childHypothesisId,
  });
}

/**
 * Defer a hypothesis for later investigation.
 */
export function deferHypothesis(
  hypothesis: Hypothesis,
  options: { triggeredBy?: string; reason?: string; sessionId?: string } = {},
): TransitionResult {
  return transitionHypothesis(hypothesis, "defer", options);
}

/**
 * Reactivate a deferred hypothesis.
 */
export function reactivateHypothesis(
  hypothesis: Hypothesis,
  options: { triggeredBy?: string; reason?: string; sessionId?: string } = {},
): TransitionResult {
  return transitionHypothesis(hypothesis, "reactivate", options);
}

// ============================================================================
// History Management
// ============================================================================

/**
 * Create a transition history store.
 * In-memory for now; can be backed by persistent storage.
 */
export class TransitionHistoryStore {
  private history: Map<string, StateTransition[]> = new Map();

  /**
   * Add a transition to the history.
   */
  add(transition: StateTransition): void {
    const existing = this.history.get(transition.hypothesisId) ?? [];
    existing.push(transition);
    this.history.set(transition.hypothesisId, existing);
  }

  /**
   * Get all transitions for a hypothesis.
   */
  getHistory(hypothesisId: string): StateTransition[] {
    return this.history.get(hypothesisId) ?? [];
  }

  /**
   * Get the most recent transition for a hypothesis.
   */
  getLatestTransition(hypothesisId: string): StateTransition | null {
    const transitions = this.getHistory(hypothesisId);
    return transitions.length > 0 ? transitions[transitions.length - 1] : null;
  }

  /**
   * Get all transitions triggered by a specific test result.
   */
  getTransitionsByTestResult(testResultId: string): StateTransition[] {
    const result: StateTransition[] = [];
    for (const transitions of this.history.values()) {
      for (const t of transitions) {
        if (t.testResultId === testResultId) {
          result.push(t);
        }
      }
    }
    return result;
  }

  /**
   * Get all hypotheses that were refuted.
   */
  getRefutedHypotheses(): string[] {
    const result: string[] = [];
    for (const [hypothesisId, transitions] of this.history.entries()) {
      if (transitions.some((t) => t.trigger === "refute")) {
        result.push(hypothesisId);
      }
    }
    return result;
  }

  /**
   * Get all transitions in chronological order.
   */
  getAllTransitions(): StateTransition[] {
    const all: StateTransition[] = [];
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
  export(): Record<string, StateTransition[]> {
    const result: Record<string, StateTransition[]> = {};
    for (const [key, value] of this.history.entries()) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Import history from a serialized format.
   */
  import(data: Record<string, StateTransition[]>): void {
    this.history.clear();
    for (const [key, value] of Object.entries(data)) {
      // Validate each transition
      const validated = value.map((t) => StateTransitionSchema.parse(t));
      this.history.set(key, validated);
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export {
  type HypothesisState,
  HypothesisStateSchema,
} from "./hypothesis";
