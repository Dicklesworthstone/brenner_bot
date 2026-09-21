/**
 * Session State Machine
 *
 * Formal state machine governing session phase transitions.
 * Uses XState-style patterns without the XState dependency.
 *
 * Key features:
 * - All 11 session phases as states
 * - Explicit event-driven transitions
 * - Guards for conditional transitions
 * - Skip/Back navigation support
 * - Integration with session context
 *
 * @see brenner_bot-reew.3 (bead)
 * @module brenner-loop/session-machine
 */

import type {
  EvidenceEntry,
  ExclusionTestResult,
  HypothesisCard,
  LevelSplitResult,
  ObjectTransposeResult,
  ScaleCheckResult,
  Session,
  SessionPhase,
} from "./types";
import { isValidTransition } from "./types";

// ============================================================================
// Event Types
// ============================================================================

/**
 * All possible events that can trigger state transitions.
 */
export type SessionEvent =
  // Intake phase
  | { type: "SUBMIT_HYPOTHESIS"; hypothesis: HypothesisCard }

  // Sharpening phase
  | { type: "REFINE"; updates: Partial<HypothesisCard> }
  | { type: "CONTINUE" }
  | { type: "SKIP_OPERATORS" }

  // Operator phases (level_split, exclusion_test, object_transpose, scale_check)
  | { type: "COMPLETE_OPERATOR"; result: unknown }
  | { type: "SKIP_OPERATOR" }
  | { type: "BACK" }

  // Agent dispatch phase
  | { type: "DISPATCH_AGENTS" }
  | { type: "RESPONSES_RECEIVED" }
  | { type: "SKIP_AGENTS" }

  // Synthesis phase
  | { type: "COMPLETE_SYNTHESIS" }

  // Evidence gathering phase
  | { type: "ADD_EVIDENCE"; evidence: unknown }
  | { type: "REVISE_HYPOTHESIS" }

  // Revision phase
  | { type: "SAVE_REVISION" }
  | { type: "RESTART_OPERATORS" }

  // General
  | { type: "COMPLETE_SESSION" }
  | { type: "GO_TO_PHASE"; phase: SessionPhase };

/**
 * Extract event type string
 */
export type SessionEventType = SessionEvent["type"];

// ============================================================================
// State Configuration Types
// ============================================================================

/**
 * Guard function type - determines if a transition is allowed
 */
export type TransitionGuard = (session: Session, event: SessionEvent) => boolean;

/**
 * Action function type - side effects to run on transition
 */
export type TransitionAction = (session: Session, event: SessionEvent) => Session;

/**
 * A transition definition
 */
export interface TransitionDef {
  /** Target state */
  target: SessionPhase;
  /** Guard condition (optional) */
  guard?: TransitionGuard;
  /** Action to run on transition (optional) */
  action?: TransitionAction;
}

/**
 * State configuration for a single phase
 */
export interface StateConfig {
  /** Valid transitions from this state, keyed by event type */
  on: Partial<Record<SessionEventType, TransitionDef | TransitionDef[]>>;
  /** Entry action (optional) */
  onEntry?: TransitionAction;
  /** Exit action (optional) */
  onExit?: TransitionAction;
  /** Whether this is a final state */
  final?: boolean;
}

/**
 * Complete machine configuration
 */
export interface SessionMachineConfig {
  id: string;
  initial: SessionPhase;
  states: Record<SessionPhase, StateConfig>;
}

// ============================================================================
// Actions
// ============================================================================

const submitHypothesisAction: TransitionAction = (session, event) => {
  if (event.type !== "SUBMIT_HYPOTHESIS") return session;
  const { hypothesis } = event;
  return {
    ...session,
    primaryHypothesisId: hypothesis.id,
    hypothesisCards: {
      ...session.hypothesisCards,
      [hypothesis.id]: hypothesis,
    },
  };
};

const refineAction: TransitionAction = (session, event) => {
  if (event.type !== "REFINE") return session;
  const currentId = session.primaryHypothesisId;
  const currentCard = session.hypothesisCards[currentId];
  if (!currentCard) return session;

  const updatedCard = { ...currentCard, ...event.updates, updatedAt: new Date() };
  return {
    ...session,
    hypothesisCards: {
      ...session.hypothesisCards,
      [currentId]: updatedCard,
    },
  };
};

const completeOperatorAction: TransitionAction = (session, event) => {
  if (event.type !== "COMPLETE_OPERATOR") return session;
  const { result } = event;
  const phase = session.phase;

  // Deep clone operator applications to avoid mutation
  const apps = { ...session.operatorApplications };

  if (phase === "level_split") {
    apps.levelSplit = [...apps.levelSplit, result as LevelSplitResult];
  } else if (phase === "exclusion_test") {
    apps.exclusionTest = [...apps.exclusionTest, result as ExclusionTestResult];
  } else if (phase === "object_transpose") {
    apps.objectTranspose = [...apps.objectTranspose, result as ObjectTransposeResult];
  } else if (phase === "scale_check") {
    apps.scaleCheck = [...apps.scaleCheck, result as ScaleCheckResult];
  }

  return { ...session, operatorApplications: apps };
};

const addEvidenceAction: TransitionAction = (session, event) => {
  if (event.type !== "ADD_EVIDENCE") return session;
  return {
    ...session,
    evidenceLedger: [...session.evidenceLedger, event.evidence as EvidenceEntry],
  };
};

// ============================================================================
// Guards
// ============================================================================

/**
 * Guard: Has a primary hypothesis been set?
 */
const hasPrimaryHypothesis: TransitionGuard = (session) => {
  return !!session.primaryHypothesisId && !!session.hypothesisCards[session.primaryHypothesisId];
};

/**
 * Guard: Has at least one prediction been defined?
 */
const hasPredictions: TransitionGuard = (session) => {
  const hypothesis = session.hypothesisCards[session.primaryHypothesisId];
  return (
    !!hypothesis &&
    hypothesis.predictionsIfTrue.length > 0 &&
    hypothesis.impossibleIfTrue.length > 0
  );
};

/**
 * Guard: Has the target phase been validated?
 */
const canTransitionTo = (target: SessionPhase): TransitionGuard => {
  return (session) => isValidTransition(session.phase, target);
};

/**
 * Guard: Are there pending agent requests?
 */
const hasPendingAgentRequests: TransitionGuard = (session) => {
  return session.pendingAgentRequests.some((r) => r.status === "pending");
};

/**
 * Guard: Are there agent responses to synthesize?
 */
const hasAgentResponses: TransitionGuard = (session) => {
  return session.agentResponses.length > 0;
};

/**
 * Guard: Has evidence been collected?
 */
const hasEvidence: TransitionGuard = (session) => {
  return session.evidenceLedger.length > 0;
};

// ============================================================================
// Machine Definition
// ============================================================================

/**
 * The session state machine configuration.
 *
 * This defines all valid states and transitions for a Brenner Loop session.
 */
export const sessionMachineConfig: SessionMachineConfig = {
  id: "brenner-session",
  initial: "intake",

  states: {
    intake: {
      on: {
        SUBMIT_HYPOTHESIS: {
          target: "sharpening",
          action: submitHypothesisAction,
        },
      },
    },

    sharpening: {
      on: {
        REFINE: {
          target: "sharpening",
          action: refineAction,
        },
        CONTINUE: {
          target: "level_split",
          guard: hasPredictions,
        },
        SKIP_OPERATORS: {
          target: "agent_dispatch",
          guard: hasPredictions,
        },
        GO_TO_PHASE: [
          {
            target: "level_split",
            guard: canTransitionTo("level_split"),
          },
          {
            target: "exclusion_test",
            guard: canTransitionTo("exclusion_test"),
          },
          {
            target: "agent_dispatch",
            guard: canTransitionTo("agent_dispatch"),
          },
        ],
      },
    },

    level_split: {
      on: {
        COMPLETE_OPERATOR: {
          target: "exclusion_test",
          action: completeOperatorAction,
        },
        SKIP_OPERATOR: {
          target: "exclusion_test",
        },
        BACK: {
          target: "sharpening",
        },
        GO_TO_PHASE: [
          {
            target: "exclusion_test",
            guard: canTransitionTo("exclusion_test"),
          },
          {
            target: "object_transpose",
            guard: canTransitionTo("object_transpose"),
          },
          {
            target: "scale_check",
            guard: canTransitionTo("scale_check"),
          },
          {
            target: "agent_dispatch",
            guard: canTransitionTo("agent_dispatch"),
          },
        ],
      },
    },

    exclusion_test: {
      on: {
        COMPLETE_OPERATOR: {
          target: "object_transpose",
          action: completeOperatorAction,
        },
        SKIP_OPERATOR: {
          target: "object_transpose",
        },
        BACK: {
          target: "level_split",
        },
        GO_TO_PHASE: [
          {
            target: "object_transpose",
            guard: canTransitionTo("object_transpose"),
          },
          {
            target: "scale_check",
            guard: canTransitionTo("scale_check"),
          },
          {
            target: "agent_dispatch",
            guard: canTransitionTo("agent_dispatch"),
          },
        ],
      },
    },

    object_transpose: {
      on: {
        COMPLETE_OPERATOR: {
          target: "scale_check",
          action: completeOperatorAction,
        },
        SKIP_OPERATOR: {
          target: "scale_check",
        },
        BACK: {
          target: "exclusion_test",
        },
        GO_TO_PHASE: [
          {
            target: "scale_check",
            guard: canTransitionTo("scale_check"),
          },
          {
            target: "agent_dispatch",
            guard: canTransitionTo("agent_dispatch"),
          },
        ],
      },
    },

    scale_check: {
      on: {
        COMPLETE_OPERATOR: {
          target: "agent_dispatch",
          action: completeOperatorAction,
        },
        SKIP_OPERATOR: {
          target: "agent_dispatch",
        },
        BACK: {
          target: "object_transpose",
        },
        GO_TO_PHASE: [
          {
            target: "agent_dispatch",
            guard: canTransitionTo("agent_dispatch"),
          },
        ],
      },
    },

    agent_dispatch: {
      on: {
        DISPATCH_AGENTS: {
          target: "agent_dispatch", // Stay while waiting
        },
        RESPONSES_RECEIVED: {
          target: "synthesis",
          guard: hasAgentResponses,
        },
        SKIP_AGENTS: {
          target: "evidence_gathering",
        },
        BACK: {
          target: "scale_check",
        },
        GO_TO_PHASE: [
          {
            target: "synthesis",
            guard: canTransitionTo("synthesis"),
          },
          {
            target: "evidence_gathering",
            guard: canTransitionTo("evidence_gathering"),
          },
        ],
      },
    },

    synthesis: {
      on: {
        COMPLETE_SYNTHESIS: {
          target: "evidence_gathering",
        },
        CONTINUE: {
          target: "evidence_gathering",
        },
        BACK: {
          target: "agent_dispatch",
        },
        COMPLETE_SESSION: {
          target: "complete",
        },
        GO_TO_PHASE: [
          {
            target: "evidence_gathering",
            guard: canTransitionTo("evidence_gathering"),
          },
          {
            target: "revision",
            guard: canTransitionTo("revision"),
          },
          {
            target: "complete",
            guard: canTransitionTo("complete"),
          },
        ],
      },
    },

    evidence_gathering: {
      on: {
        ADD_EVIDENCE: {
          target: "evidence_gathering", // Stay
          action: addEvidenceAction,
        },
        REVISE_HYPOTHESIS: {
          target: "revision",
        },
        COMPLETE_SESSION: {
          target: "complete",
        },
        BACK: {
          target: "synthesis",
        },
        GO_TO_PHASE: [
          {
            target: "revision",
            guard: canTransitionTo("revision"),
          },
          {
            target: "synthesis",
            guard: canTransitionTo("synthesis"),
          },
        ],
      },
    },

    revision: {
      on: {
        SAVE_REVISION: {
          target: "evidence_gathering",
        },
        RESTART_OPERATORS: {
          target: "level_split",
        },
        COMPLETE_SESSION: {
          target: "complete",
        },
        GO_TO_PHASE: [
          {
            target: "agent_dispatch",
            guard: canTransitionTo("agent_dispatch"),
          },
          {
            target: "synthesis",
            guard: canTransitionTo("synthesis"),
          },
          {
            target: "complete",
            guard: canTransitionTo("complete"),
          },
        ],
      },
    },

    complete: {
      final: true,
      on: {},
    },
  },
};

// ============================================================================
// Machine Interpreter
// ============================================================================

/**
 * Result of attempting a transition
 */
export interface TransitionResult {
  /** Whether the transition was successful */
  success: boolean;
  /** New state after transition (same as before if failed) */
  newState: SessionPhase;
  /** Updated session (same as before if failed) */
  session: Session;
  /** Error message if transition failed */
  error?: string;
}

/**
 * Attempt to transition based on an event.
 *
 * @param session - Current session state
 * @param event - The event to process
 * @returns TransitionResult with new state and session
 */
export function transition(session: Session, event: SessionEvent): TransitionResult {
  const currentState = session.phase;
  const stateConfig = sessionMachineConfig.states[currentState];

  if (!stateConfig) {
    return {
      success: false,
      newState: currentState,
      session,
      error: `Unknown state: ${currentState}`,
    };
  }

  // Check if this state is final
  if (stateConfig.final) {
    return {
      success: false,
      newState: currentState,
      session,
      error: "Cannot transition from final state",
    };
  }

  // Handle GO_TO_PHASE specially
  if (event.type === "GO_TO_PHASE") {
    const targetPhase = event.phase;
    const transitions = stateConfig.on.GO_TO_PHASE;

    if (!transitions) {
      return {
        success: false,
        newState: currentState,
        session,
        error: `GO_TO_PHASE not allowed from ${currentState}`,
      };
    }

    // Find matching transition for target phase
    const transitionDefs = Array.isArray(transitions) ? transitions : [transitions];
    const matchingTransition = transitionDefs.find(
      (t) => t.target === targetPhase && (!t.guard || t.guard(session, event)),
    );

    if (!matchingTransition) {
      return {
        success: false,
        newState: currentState,
        session,
        error: `Cannot transition to ${targetPhase} from ${currentState}`,
      };
    }

    const updatedSession = applyTransition(session, matchingTransition, event);
    return {
      success: true,
      newState: matchingTransition.target,
      session: updatedSession,
    };
  }

  // Look up transition for this event
  const transitionDef = stateConfig.on[event.type];

  if (!transitionDef) {
    return {
      success: false,
      newState: currentState,
      session,
      error: `Event ${event.type} not valid in state ${currentState}`,
    };
  }

  // Handle array of transitions (find first matching guard)
  const defs = Array.isArray(transitionDef) ? transitionDef : [transitionDef];
  const matchingDef = defs.find((d) => !d.guard || d.guard(session, event));

  if (!matchingDef) {
    return {
      success: false,
      newState: currentState,
      session,
      error: `Guard failed for event ${event.type} in state ${currentState}`,
    };
  }

  const updatedSession = applyTransition(session, matchingDef, event);
  return {
    success: true,
    newState: matchingDef.target,
    session: updatedSession,
  };
}

/**
 * Apply a transition, running actions and updating state.
 */
function applyTransition(session: Session, def: TransitionDef, event: SessionEvent): Session {
  const now = new Date().toISOString();

  let updatedSession: Session = {
    ...session,
    phase: def.target,
    updatedAt: now,
  };

  // Run transition action if defined
  if (def.action) {
    updatedSession = def.action(updatedSession, event);
  }

  return updatedSession;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all events that are valid in the current state.
 */
export function getAvailableEvents(session: Session): SessionEventType[] {
  const stateConfig = sessionMachineConfig.states[session.phase];
  if (!stateConfig || stateConfig.final) {
    return [];
  }

  return Object.keys(stateConfig.on) as SessionEventType[];
}

/**
 * Get all phases that can be reached from the current state.
 */
export function getReachablePhases(session: Session): SessionPhase[] {
  const stateConfig = sessionMachineConfig.states[session.phase];
  if (!stateConfig || stateConfig.final) {
    return [];
  }

  const phases = new Set<SessionPhase>();

  for (const eventType of Object.keys(stateConfig.on) as SessionEventType[]) {
    const defs = stateConfig.on[eventType];
    if (!defs) continue;

    const defArray = Array.isArray(defs) ? defs : [defs];
    for (const def of defArray) {
      // Only include phases where the guard passes (or no guard)
      if (!def.guard || def.guard(session, { type: eventType } as SessionEvent)) {
        phases.add(def.target);
      }
    }
  }

  return Array.from(phases);
}

/**
 * Check if a specific event can be sent in the current state.
 */
export function canSend(session: Session, eventType: SessionEventType): boolean {
  const stateConfig = sessionMachineConfig.states[session.phase];
  if (!stateConfig || stateConfig.final) {
    return false;
  }

  const defs = stateConfig.on[eventType];
  if (!defs) {
    return false;
  }

  const defArray = Array.isArray(defs) ? defs : [defs];
  return defArray.some(
    (def) => !def.guard || def.guard(session, { type: eventType } as SessionEvent),
  );
}

/**
 * Check if we can go back from the current state.
 */
export function canGoBack(session: Session): boolean {
  return canSend(session, "BACK");
}

/**
 * Check if the session is in a final state.
 */
export function isComplete(session: Session): boolean {
  const stateConfig = sessionMachineConfig.states[session.phase];
  return stateConfig?.final ?? false;
}

/**
 * Get the next phase in the default progression (for simple "next" button).
 */
export function getDefaultNextPhase(session: Session): SessionPhase | null {
  const stateConfig = sessionMachineConfig.states[session.phase];
  if (!stateConfig || stateConfig.final) {
    return null;
  }

  // Priority order for "next" button
  const priorityEvents: SessionEventType[] = [
    "CONTINUE",
    "COMPLETE_OPERATOR",
    "RESPONSES_RECEIVED",
    "COMPLETE_SYNTHESIS",
    "COMPLETE_SESSION",
  ];

  for (const eventType of priorityEvents) {
    const defs = stateConfig.on[eventType];
    if (!defs) continue;

    const defArray = Array.isArray(defs) ? defs : [defs];
    const matchingDef = defArray.find(
      (def) => !def.guard || def.guard(session, { type: eventType } as SessionEvent),
    );

    if (matchingDef) {
      return matchingDef.target;
    }
  }

  return null;
}

/**
 * Get human-readable phase name.
 */
export function getPhaseName(phase: SessionPhase): string {
  const names: Record<SessionPhase, string> = {
    intake: "Hypothesis Intake",
    sharpening: "Hypothesis Sharpening",
    level_split: "Level Split",
    exclusion_test: "Exclusion Test",
    object_transpose: "Object Transpose",
    scale_check: "Scale Check",
    agent_dispatch: "Agent Dispatch",
    synthesis: "Synthesis",
    evidence_gathering: "Evidence Gathering",
    revision: "Revision",
    complete: "Complete",
  };
  return names[phase] ?? phase;
}

/**
 * Get phase description.
 */
export function getPhaseDescription(phase: SessionPhase): string {
  const descriptions: Record<SessionPhase, string> = {
    intake: "Enter your initial hypothesis and research question.",
    sharpening: "Refine your hypothesis with predictions and falsification conditions.",
    level_split: "Identify different levels of explanation that might be conflated.",
    exclusion_test: "Design tests that could definitively rule out your hypothesis.",
    object_transpose: "Consider alternative experimental systems or reference frames.",
    scale_check: "Verify physical and mathematical plausibility.",
    agent_dispatch: "Send hypothesis to AI agents for analysis.",
    synthesis: "Synthesize agent responses and identify consensus.",
    evidence_gathering: "Execute tests and collect evidence.",
    revision: "Revise hypothesis based on evidence.",
    complete: "Session complete. Generate research brief.",
  };
  return descriptions[phase] ?? "";
}

/**
 * Get operator symbol for operator phases.
 */
export function getPhaseSymbol(phase: SessionPhase): string | null {
  const symbols: Partial<Record<SessionPhase, string>> = {
    level_split: "⊘",
    exclusion_test: "✂",
    object_transpose: "⟂",
    scale_check: "⊞",
  };
  return symbols[phase] ?? null;
}

// ============================================================================
// Exports
// ============================================================================

export {
  canTransitionTo,
  hasAgentResponses,
  hasEvidence,
  hasPendingAgentRequests,
  hasPredictions,
  hasPrimaryHypothesis,
};
