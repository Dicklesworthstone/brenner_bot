/**
 * useSessionMachine Hook
 *
 * React hook that integrates the session state machine with the session context.
 * Provides a clean API for session phase transitions.
 *
 * @see brenner_bot-reew.3 (bead)
 * @module brenner-loop/use-session-machine
 */

import { useCallback, useMemo } from "react";
import type { SessionEvent, SessionEventType, TransitionResult } from "./session-machine";
import {
  canGoBack,
  canSend,
  getAvailableEvents,
  getDefaultNextPhase,
  getPhaseDescription,
  getPhaseName,
  getPhaseSymbol,
  getReachablePhases,
  isComplete,
  transition,
} from "./session-machine";
import type { HypothesisCard, Session, SessionPhase } from "./types";

// ============================================================================
// Types
// ============================================================================

/**
 * Return type for the useSessionMachine hook.
 */
export interface SessionMachineState {
  // === Current State ===

  /** Current session phase */
  phase: SessionPhase;

  /** Human-readable phase name */
  phaseName: string;

  /** Phase description */
  phaseDescription: string;

  /** Operator symbol (if operator phase) */
  phaseSymbol: string | null;

  /** Whether session is in final state */
  isComplete: boolean;

  // === Transition Helpers ===

  /** Events that can be sent in current state */
  availableEvents: SessionEventType[];

  /** Phases reachable from current state */
  reachablePhases: SessionPhase[];

  /** Whether we can go back */
  canGoBack: boolean;

  /** The default next phase (for "Next" button) */
  nextPhase: SessionPhase | null;

  // === Actions ===

  /** Send an event to the machine */
  send: (event: SessionEvent) => TransitionResult;

  /** Check if an event can be sent */
  canSend: (eventType: SessionEventType) => boolean;

  /** Go back to previous phase */
  goBack: () => TransitionResult;

  /** Advance to next phase (default progression) */
  advance: () => TransitionResult;

  /** Go to a specific phase */
  goToPhase: (phase: SessionPhase) => TransitionResult;

  // === Convenience Actions ===

  /** Submit hypothesis (from intake) */
  submitHypothesis: (hypothesis: HypothesisCard) => TransitionResult;

  /** Continue to next operator phase */
  continueToOperators: () => TransitionResult;

  /** Skip remaining operators */
  skipToAgents: () => TransitionResult;

  /** Complete current operator */
  completeOperator: (result: unknown) => TransitionResult;

  /** Skip current operator */
  skipOperator: () => TransitionResult;

  /** Complete the session */
  completeSession: () => TransitionResult;
}

/**
 * Options for the useSessionMachine hook.
 */
export interface UseSessionMachineOptions {
  /** Callback when session updates after transition */
  onSessionUpdate?: (session: Session) => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing session state machine transitions.
 *
 * This hook provides a clean API for transitioning between session phases.
 * It does NOT manage session state directly - you should use this with
 * useSession() and call onSessionUpdate to persist changes.
 *
 * @param session - The current session
 * @param options - Hook options
 * @returns SessionMachineState with current state and actions
 *
 * @example
 * ```tsx
 * const { session, updateSession } = useSession();
 * const machine = useSessionMachine(session, {
 *   onSessionUpdate: (updated) => {
 *     // Session context will handle the update
 *     // This is called internally
 *   },
 * });
 *
 * // In a button handler
 * const result = machine.advance();
 * if (result.success) {
 *   updateSession(result.session);
 * }
 * ```
 */
export function useSessionMachine(
  session: Session | null,
  options: UseSessionMachineOptions = {},
): SessionMachineState | null {
  const { onSessionUpdate } = options;

  // === Memoized Values ===

  const phase = session?.phase ?? "intake";

  const phaseName = useMemo(() => getPhaseName(phase), [phase]);
  const phaseDescription = useMemo(() => getPhaseDescription(phase), [phase]);
  const phaseSymbol = useMemo(() => getPhaseSymbol(phase), [phase]);
  const sessionIsComplete = useMemo(() => (session ? isComplete(session) : false), [session]);

  const availableEvents = useMemo(() => (session ? getAvailableEvents(session) : []), [session]);

  const reachablePhases = useMemo(() => (session ? getReachablePhases(session) : []), [session]);

  const sessionCanGoBack = useMemo(() => (session ? canGoBack(session) : false), [session]);

  const nextPhase = useMemo(() => (session ? getDefaultNextPhase(session) : null), [session]);

  // === Actions ===

  const send = useCallback(
    (event: SessionEvent): TransitionResult => {
      if (!session) {
        return {
          success: false,
          newState: "intake",
          session: session as unknown as Session,
          error: "No session loaded",
        };
      }

      const result = transition(session, event);
      if (result.success && onSessionUpdate) {
        onSessionUpdate(result.session);
      }
      return result;
    },
    [session, onSessionUpdate],
  );

  const checkCanSend = useCallback(
    (eventType: SessionEventType): boolean => {
      return session ? canSend(session, eventType) : false;
    },
    [session],
  );

  const goBack = useCallback((): TransitionResult => {
    return send({ type: "BACK" });
  }, [send]);

  const advance = useCallback((): TransitionResult => {
    if (!session) {
      return {
        success: false,
        newState: "intake",
        session: session as unknown as Session,
        error: "No session loaded",
      };
    }

    // Try common "advance" events in priority order
    const advanceEvents: SessionEventType[] = [
      "CONTINUE",
      "COMPLETE_OPERATOR",
      "RESPONSES_RECEIVED",
      "COMPLETE_SYNTHESIS",
      "COMPLETE_SESSION",
    ];

    for (const eventType of advanceEvents) {
      if (canSend(session, eventType)) {
        return send({ type: eventType } as SessionEvent);
      }
    }

    return {
      success: false,
      newState: session.phase,
      session,
      error: "No valid advance action available",
    };
  }, [session, send]);

  const goToPhase = useCallback(
    (targetPhase: SessionPhase): TransitionResult => {
      return send({ type: "GO_TO_PHASE", phase: targetPhase });
    },
    [send],
  );

  // === Convenience Actions ===

  const submitHypothesis = useCallback(
    (hypothesis: HypothesisCard): TransitionResult => {
      return send({ type: "SUBMIT_HYPOTHESIS", hypothesis });
    },
    [send],
  );

  const continueToOperators = useCallback((): TransitionResult => {
    return send({ type: "CONTINUE" });
  }, [send]);

  const skipToAgents = useCallback((): TransitionResult => {
    return send({ type: "SKIP_OPERATORS" });
  }, [send]);

  const completeOperator = useCallback(
    (result: unknown): TransitionResult => {
      return send({ type: "COMPLETE_OPERATOR", result });
    },
    [send],
  );

  const skipOperator = useCallback((): TransitionResult => {
    return send({ type: "SKIP_OPERATOR" });
  }, [send]);

  const completeSession = useCallback((): TransitionResult => {
    return send({ type: "COMPLETE_SESSION" });
  }, [send]);

  // === Return null if no session ===

  if (!session) {
    return null;
  }

  // === Build Return Value ===

  return {
    phase,
    phaseName,
    phaseDescription,
    phaseSymbol,
    isComplete: sessionIsComplete,

    availableEvents,
    reachablePhases,
    canGoBack: sessionCanGoBack,
    nextPhase,

    send,
    canSend: checkCanSend,
    goBack,
    advance,
    goToPhase,

    submitHypothesis,
    continueToOperators,
    skipToAgents,
    completeOperator,
    skipOperator,
    completeSession,
  };
}

// ============================================================================
// Helper Components (for convenience)
// ============================================================================

/**
 * Get CSS class for phase status in timeline.
 */
export function getPhaseStatusClass(
  currentPhase: SessionPhase,
  targetPhase: SessionPhase,
  reachablePhases: SessionPhase[],
): "complete" | "current" | "upcoming" | "locked" {
  const phaseOrder = [
    "intake",
    "sharpening",
    "level_split",
    "exclusion_test",
    "object_transpose",
    "scale_check",
    "agent_dispatch",
    "synthesis",
    "evidence_gathering",
    "revision",
    "complete",
  ] as const;

  const currentIndex = phaseOrder.indexOf(currentPhase);
  const targetIndex = phaseOrder.indexOf(targetPhase);

  if (targetPhase === currentPhase) {
    return "current";
  }

  if (targetIndex < currentIndex) {
    return "complete";
  }

  if (reachablePhases.includes(targetPhase)) {
    return "upcoming";
  }

  return "locked";
}

/**
 * Get progress percentage through the session.
 */
export function getSessionProgress(phase: SessionPhase): number {
  const phaseWeights: Record<SessionPhase, number> = {
    intake: 0,
    sharpening: 10,
    level_split: 20,
    exclusion_test: 30,
    object_transpose: 40,
    scale_check: 50,
    agent_dispatch: 60,
    synthesis: 70,
    evidence_gathering: 80,
    revision: 90,
    complete: 100,
  };

  return phaseWeights[phase] ?? 0;
}
