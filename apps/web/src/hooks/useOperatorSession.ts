/**
 * useOperatorSession Hook
 *
 * React hook for managing operator session state in the Brenner Loop.
 * Provides a clean API for components to interact with operator sessions.
 *
 * @see brenner_bot-vw6p.1 (bead)
 * @see brenner_bot-vw6p (parent epic: Operator Application System)
 * @module hooks/useOperatorSession
 */

"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { trackSystemEvent } from "@/lib/analytics";
import type { HypothesisCard } from "@/lib/brenner-loop/hypothesis";
import type {
  OperatorInsight,
  OperatorMetadata,
  OperatorSession,
  OperatorStepConfig,
  OperatorStepState,
  OperatorType,
  StepValidation,
} from "@/lib/brenner-loop/operators/framework";
import {
  canGoBack,
  canProceedToNext,
  canSkipCurrent,
  createSession,
  deserializeSession,
  getCurrentStep,
  getCurrentStepConfig,
  getProgress,
  getSessionSummary,
  OPERATOR_METADATA,
  serializeSession,
  sessionReducer,
} from "@/lib/brenner-loop/operators/framework";

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for the hook
 */
export interface UseOperatorSessionConfig<TResult = unknown> {
  /** The operator type to use */
  operatorType: OperatorType;

  /** The input hypothesis */
  hypothesis: HypothesisCard;

  /** Step configurations for this operator */
  stepConfigs: OperatorStepConfig[];

  /** Who is starting the session (optional) */
  startedBy?: string;

  /** Callback when session completes */
  onComplete?: (session: OperatorSession<TResult>) => void;

  /** Callback when session is abandoned */
  onAbandon?: (session: OperatorSession<TResult>) => void;

  /** Callback on any state change */
  onChange?: (session: OperatorSession<TResult>) => void;

  /** Auto-save to localStorage (key) */
  persistKey?: string;
}

/**
 * Return type of the hook
 */
export interface UseOperatorSessionResult<TResult = unknown> {
  // Session state
  session: OperatorSession<TResult>;

  // Current step info
  currentStep: OperatorStepState | undefined;
  currentStepConfig: OperatorStepConfig | undefined;

  // Navigation state
  canNext: boolean;
  canPrev: boolean;
  canSkip: boolean;
  validation: StepValidation | undefined;

  // Progress
  progress: number;
  summary: ReturnType<typeof getSessionSummary>;

  // Operator metadata
  metadata: OperatorMetadata;

  // Navigation actions
  next: () => boolean;
  prev: () => void;
  skip: () => boolean;
  goToStep: (stepIndex: number) => void;

  // Content actions
  setContent: (key: string, value: unknown) => void;
  getContent: <T>(key: string) => T | undefined;

  // Selection actions
  setSelection: (key: string, value: unknown) => void;
  getSelection: <T>(key: string) => T | undefined;
  clearSelection: (key: string) => void;

  // Insight actions
  addInsight: (insight: Omit<OperatorInsight, "id" | "createdAt">) => void;

  // Session lifecycle
  setNotes: (notes: string) => void;
  complete: (result?: TResult) => void;
  abandon: () => void;
  reset: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing operator session state
 */
export function useOperatorSession<TResult = unknown>(
  config: UseOperatorSessionConfig<TResult>,
): UseOperatorSessionResult<TResult> {
  const {
    operatorType,
    hypothesis,
    stepConfigs,
    startedBy,
    onComplete,
    onAbandon,
    onChange,
    persistKey,
  } = config;

  // Try to restore from localStorage if persistKey provided
  const getInitialSession = useCallback((): OperatorSession<TResult> => {
    if (persistKey && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(persistKey);
        if (saved) {
          const restored = deserializeSession<TResult>(saved);
          if (restored && restored.status === "in_progress") {
            return restored;
          }
        }
      } catch {
        // Ignore localStorage errors
      }
    }

    return createSession<TResult>(operatorType, hypothesis, stepConfigs, startedBy);
  }, [operatorType, hypothesis, stepConfigs, startedBy, persistKey]);

  // Session state
  const [session, dispatch] = useReducer(
    sessionReducer as typeof sessionReducer<TResult>,
    undefined,
    getInitialSession,
  );

  // Track if session just started
  const isFirstRender = useRef(true);

  // Set status to in_progress on first render
  useEffect(() => {
    if (isFirstRender.current && session.status === "initializing") {
      dispatch({ type: "NEXT_STEP" }); // This sets status to in_progress
      dispatch({ type: "PREV_STEP" }); // Go back to step 0
      isFirstRender.current = false;
    }
  }, [session.status]);

  // Auto-save to localStorage
  useEffect(() => {
    if (persistKey && typeof window !== "undefined" && session.status === "in_progress") {
      try {
        localStorage.setItem(persistKey, serializeSession(session));
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [session, persistKey]);

  // Call onChange when session changes
  const previousSessionRef = useRef<OperatorSession<TResult> | null>(null);
  useEffect(() => {
    if (previousSessionRef.current !== session && onChange) {
      onChange(session);
    }
    previousSessionRef.current = session;
  }, [session, onChange]);

  // Computed values
  const currentStep = useMemo(() => getCurrentStep(session), [session]);
  const currentStepConfig = useMemo(() => getCurrentStepConfig(session), [session]);
  const progress = useMemo(() => getProgress(session), [session]);
  const summary = useMemo(() => getSessionSummary(session), [session]);
  const metadata = OPERATOR_METADATA[operatorType];

  const { canProceed: canNext, validation } = useMemo(() => canProceedToNext(session), [session]);
  const canPrev = useMemo(() => canGoBack(session), [session]);
  const canSkip = useMemo(() => canSkipCurrent(session), [session]);

  // Navigation actions
  const next = useCallback((): boolean => {
    const { canProceed } = canProceedToNext(session);
    if (!canProceed) {
      return false;
    }

    dispatch({ type: "NEXT_STEP" });
    return true;
  }, [session]);

  const prev = useCallback((): void => {
    dispatch({ type: "PREV_STEP" });
  }, []);

  const skip = useCallback((): boolean => {
    if (!canSkipCurrent(session)) {
      return false;
    }

    dispatch({ type: "SKIP_STEP" });
    return true;
  }, [session]);

  const goToStep = useCallback((stepIndex: number): void => {
    dispatch({ type: "GO_TO_STEP", stepIndex });
  }, []);

  // Content actions
  const setContent = useCallback((key: string, value: unknown): void => {
    dispatch({ type: "SET_CONTENT", key, value });
  }, []);

  const getContent = useCallback(
    <T>(key: string): T | undefined => {
      return session.generatedContent[key] as T | undefined;
    },
    [session.generatedContent],
  );

  // Selection actions
  const setSelection = useCallback((key: string, value: unknown): void => {
    dispatch({ type: "SET_SELECTION", key, value });
  }, []);

  const getSelection = useCallback(
    <T>(key: string): T | undefined => {
      return session.userSelections[key] as T | undefined;
    },
    [session.userSelections],
  );

  const clearSelection = useCallback((key: string): void => {
    dispatch({ type: "CLEAR_SELECTION", key });
  }, []);

  // Insight actions
  const addInsight = useCallback((insight: Omit<OperatorInsight, "id" | "createdAt">): void => {
    dispatch({ type: "ADD_INSIGHT", insight });
  }, []);

  // Session lifecycle
  const setNotes = useCallback((notes: string): void => {
    dispatch({ type: "SET_NOTES", notes });
  }, []);

  const complete = useCallback(
    (result?: TResult): void => {
      dispatch({ type: "COMPLETE" });

      // Build the completed session manually since React state updates are async
      // and we need to pass the completed state to the callback immediately
      const completedSession: OperatorSession<TResult> = {
        ...session,
        result: result ?? session.result,
        status: "completed",
        completedAt: new Date().toISOString(),
      };

      // Clear localStorage
      if (persistKey && typeof window !== "undefined") {
        try {
          localStorage.removeItem(persistKey);
        } catch {
          // Ignore
        }
      }

      trackSystemEvent("operator_session_complete", {
        operator: operatorType,
        steps_total: session.steps.length,
      });
      onComplete?.(completedSession);
    },
    [session, persistKey, onComplete, operatorType],
  );

  const abandon = useCallback((): void => {
    dispatch({ type: "ABANDON" });

    // Build the abandoned session manually since React state updates are async
    // and we need to pass the abandoned state to the callback immediately
    const abandonedSession: OperatorSession<TResult> = {
      ...session,
      status: "abandoned",
      completedAt: new Date().toISOString(),
    };

    // Clear localStorage
    if (persistKey && typeof window !== "undefined") {
      try {
        localStorage.removeItem(persistKey);
      } catch {
        // Ignore
      }
    }

    trackSystemEvent("operator_session_abandoned", {
      operator: operatorType,
      steps_total: session.steps.length,
      step_index: session.currentStepIndex,
    });
    onAbandon?.(abandonedSession);
  }, [session, persistKey, onAbandon, operatorType]);

  const reset = useCallback((): void => {
    // Clear localStorage
    if (persistKey && typeof window !== "undefined") {
      try {
        localStorage.removeItem(persistKey);
      } catch {
        // Ignore
      }
    }

    // Create new session (requires re-initializing component)
    // This is a no-op here; parent should remount component
  }, [persistKey]);

  return {
    session,
    currentStep,
    currentStepConfig,
    canNext,
    canPrev,
    canSkip,
    validation,
    progress,
    summary,
    metadata,
    next,
    prev,
    skip,
    goToStep,
    setContent,
    getContent,
    setSelection,
    getSelection,
    clearSelection,
    addInsight,
    setNotes,
    complete,
    abandon,
    reset,
  };
}

export default useOperatorSession;
