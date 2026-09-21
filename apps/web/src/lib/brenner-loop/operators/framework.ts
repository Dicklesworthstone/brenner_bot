/**
 * Operator Session Framework
 *
 * Provides the foundational framework for all Brenner Loop operators.
 * Each operator (Level Split, Exclusion Test, Object Transpose, Scale Check)
 * shares common patterns: input hypothesis, step-by-step progression,
 * content generation, user selection, and output production.
 *
 * @see brenner_bot-vw6p.1 (bead)
 * @see brenner_bot-vw6p (parent epic: Operator Application System)
 * @module brenner-loop/operators/framework
 */

import type { HypothesisCard } from "../hypothesis";

// ============================================================================
// Core Types
// ============================================================================

/**
 * The four Brenner operators.
 *
 * - level_split (Sigma): Identify confused levels of explanation
 * - exclusion_test (Exclusion): Design discriminative tests
 * - object_transpose (Object): Change experimental system
 * - scale_check (Scale): Verify physical/mathematical plausibility
 */
export type OperatorType = "level_split" | "exclusion_test" | "object_transpose" | "scale_check";

/**
 * All valid operator types for type guard
 */
const VALID_OPERATOR_TYPES: readonly OperatorType[] = [
  "level_split",
  "exclusion_test",
  "object_transpose",
  "scale_check",
];

/**
 * Type guard for OperatorType
 */
export function isOperatorType(value: unknown): value is OperatorType {
  return typeof value === "string" && VALID_OPERATOR_TYPES.includes(value as OperatorType);
}

/**
 * Operator metadata for display and configuration
 */
export interface OperatorMetadata {
  /** Operator type */
  type: OperatorType;

  /** Display name */
  name: string;

  /** Symbol used in specs */
  symbol: string;

  /** Short description */
  description: string;

  /** Color for UI (Tailwind color) */
  color: string;

  /** Icon (emoji) */
  icon: string;
}

/**
 * Metadata for all operators
 */
export const OPERATOR_METADATA: Record<OperatorType, OperatorMetadata> = {
  level_split: {
    type: "level_split",
    name: "Level Split",
    symbol: "\u03A3", // Σ
    description: "Identify confused levels of explanation (program vs interpreter)",
    color: "blue",
    icon: "\u{1F50D}", // Magnifying glass
  },
  exclusion_test: {
    type: "exclusion_test",
    name: "Exclusion Test",
    symbol: "\u2298", // ⊘
    description: "Design tests that can rule out hypotheses",
    color: "green",
    icon: "\u{1F9EA}", // Test tube
  },
  object_transpose: {
    type: "object_transpose",
    name: "Object Transpose",
    symbol: "\u27F3", // ⟳
    description: "Change experimental system to reveal invariants",
    color: "purple",
    icon: "\u{1F504}", // Cycle
  },
  scale_check: {
    type: "scale_check",
    name: "Scale Check",
    symbol: "\u2299", // ⊙
    description: "Verify physical and mathematical plausibility",
    color: "orange",
    icon: "\u{1F4CF}", // Ruler
  },
};

/**
 * Status of an operator session
 */
export type OperatorSessionStatus =
  | "initializing" // Setting up
  | "in_progress" // User is working through steps
  | "completed" // All steps complete, result generated
  | "abandoned"; // User quit early

/**
 * An insight generated during operator application
 */
export interface OperatorInsight {
  /** Unique ID */
  id: string;

  /** Insight category */
  category: "discovery" | "warning" | "recommendation" | "question";

  /** Short title */
  title: string;

  /** Detailed content */
  content: string;

  /** Which step generated this */
  stepId: string;

  /** Timestamp */
  createdAt: string;
}

// ============================================================================
// Step Types
// ============================================================================

/**
 * Configuration for a single operator step
 */
export interface OperatorStepConfig {
  /** Unique step identifier */
  id: string;

  /** Display name */
  name: string;

  /** Description shown to user */
  description: string;

  /** Help text (markdown) */
  helpText?: string;

  /** Can this step be skipped? */
  canSkip?: boolean;

  /** Should this step be shown? (based on session state) */
  shouldShow?: (session: OperatorSession) => boolean;

  /** Is this step complete? (based on session state) */
  isComplete?: (session: OperatorSession) => boolean;

  /** Validate before proceeding to next step */
  validate?: (session: OperatorSession) => StepValidation;
}

/**
 * Result of step validation
 */
export interface StepValidation {
  /** Is the step valid? */
  valid: boolean;

  /** Error messages if invalid */
  errors: string[];

  /** Warning messages (non-blocking) */
  warnings: string[];
}

/**
 * Runtime state of a step
 */
export interface OperatorStepState {
  /** Step configuration */
  config: OperatorStepConfig;

  /** Is step complete? */
  complete: boolean;

  /** Was step skipped? */
  skipped: boolean;

  /** When step was completed */
  completedAt?: string;
}

// ============================================================================
// Session Types
// ============================================================================

/**
 * The main operator session state.
 *
 * This is the core data structure that tracks an entire operator application,
 * from initial hypothesis input through all steps to final output.
 */
export interface OperatorSession<TResult = unknown> {
  /** Unique session ID */
  id: string;

  /** Which operator is being applied */
  operatorType: OperatorType;

  /** The hypothesis being operated on */
  inputHypothesis: HypothesisCard;

  // === Step Management ===

  /** Configured steps for this operator */
  steps: OperatorStepState[];

  /** Current step index (0-based) */
  currentStepIndex: number;

  // === Content & Selections ===

  /**
   * Generated content from the system.
   * Keyed by step ID or content type.
   */
  generatedContent: Record<string, unknown>;

  /**
   * User selections and inputs.
   * Keyed by step ID or input type.
   */
  userSelections: Record<string, unknown>;

  // === Output ===

  /** The final result of the operator (type depends on operator) */
  result?: TResult;

  /** Modified hypothesis after operator application (if applicable) */
  outputHypothesis?: HypothesisCard;

  /** Insights generated during the session */
  insights: OperatorInsight[];

  // === Metadata ===

  /** Current session status */
  status: OperatorSessionStatus;

  /** When session started */
  startedAt: string;

  /** When session completed (if completed) */
  completedAt?: string;

  /** Who started the session */
  startedBy?: string;

  /** Session notes */
  notes?: string;
}

// ============================================================================
// Session Actions
// ============================================================================

/**
 * Actions that can be performed on an operator session
 */
export type OperatorSessionAction =
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "SKIP_STEP" }
  | { type: "GO_TO_STEP"; stepIndex: number }
  | { type: "SET_CONTENT"; key: string; value: unknown }
  | { type: "SET_SELECTION"; key: string; value: unknown }
  | { type: "CLEAR_SELECTION"; key: string }
  | { type: "ADD_INSIGHT"; insight: Omit<OperatorInsight, "id" | "createdAt"> }
  | { type: "SET_NOTES"; notes: string }
  | { type: "COMPLETE" }
  | { type: "ABANDON" };

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Generate a unique session ID
 */
export function generateSessionId(operatorType: OperatorType): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `OP-${operatorType}-${crypto.randomUUID()}`;
  }
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 6);
  return `OP-${operatorType}-${timestamp}-${random}`;
}

/**
 * Generate a unique insight ID
 */
export function generateInsightId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `INS-${crypto.randomUUID()}`;
  }
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 6);
  return `INS-${timestamp}-${random}`;
}

/**
 * Create initial step states from step configurations
 */
export function createStepStates(configs: OperatorStepConfig[]): OperatorStepState[] {
  return configs.map((config) => ({
    config,
    complete: false,
    skipped: false,
  }));
}

/**
 * Create a new operator session
 */
export function createSession<TResult = unknown>(
  operatorType: OperatorType,
  inputHypothesis: HypothesisCard,
  stepConfigs: OperatorStepConfig[],
  startedBy?: string,
): OperatorSession<TResult> {
  return {
    id: generateSessionId(operatorType),
    operatorType,
    inputHypothesis,
    steps: createStepStates(stepConfigs),
    currentStepIndex: 0,
    generatedContent: {},
    userSelections: {},
    insights: [],
    status: "initializing",
    startedAt: new Date().toISOString(),
    startedBy,
  };
}

// ============================================================================
// Session Reducer
// ============================================================================

/**
 * Pure reducer for operator session state.
 * Handles all session actions and returns new state.
 */
export function sessionReducer<TResult = unknown>(
  session: OperatorSession<TResult>,
  action: OperatorSessionAction,
): OperatorSession<TResult> {
  switch (action.type) {
    case "NEXT_STEP": {
      const nextIndex = session.currentStepIndex + 1;
      if (nextIndex >= session.steps.length) {
        return session; // Already at last step
      }

      // Mark current step as complete
      const updatedSteps = [...session.steps];
      updatedSteps[session.currentStepIndex] = {
        ...updatedSteps[session.currentStepIndex],
        complete: true,
        completedAt: new Date().toISOString(),
      };

      return {
        ...session,
        steps: updatedSteps,
        currentStepIndex: nextIndex,
        status: "in_progress",
      };
    }

    case "PREV_STEP": {
      const prevIndex = session.currentStepIndex - 1;
      if (prevIndex < 0) {
        return session; // Already at first step
      }

      return {
        ...session,
        currentStepIndex: prevIndex,
      };
    }

    case "SKIP_STEP": {
      const currentStep = session.steps[session.currentStepIndex];
      if (!currentStep?.config.canSkip) {
        return session; // Can't skip this step
      }

      const nextIndex = session.currentStepIndex + 1;
      if (nextIndex >= session.steps.length) {
        return session;
      }

      const updatedSteps = [...session.steps];
      updatedSteps[session.currentStepIndex] = {
        ...updatedSteps[session.currentStepIndex],
        skipped: true,
        completedAt: new Date().toISOString(),
      };

      return {
        ...session,
        steps: updatedSteps,
        currentStepIndex: nextIndex,
        status: "in_progress",
      };
    }

    case "GO_TO_STEP": {
      const { stepIndex } = action;
      if (stepIndex < 0 || stepIndex >= session.steps.length) {
        return session;
      }

      // Can only go to previous steps or current step
      if (stepIndex > session.currentStepIndex) {
        return session;
      }

      return {
        ...session,
        currentStepIndex: stepIndex,
      };
    }

    case "SET_CONTENT": {
      return {
        ...session,
        generatedContent: {
          ...session.generatedContent,
          [action.key]: action.value,
        },
      };
    }

    case "SET_SELECTION": {
      return {
        ...session,
        userSelections: {
          ...session.userSelections,
          [action.key]: action.value,
        },
      };
    }

    case "CLEAR_SELECTION": {
      const { [action.key]: removed, ...rest } = session.userSelections;
      void removed;
      return {
        ...session,
        userSelections: rest,
      };
    }

    case "ADD_INSIGHT": {
      const insight: OperatorInsight = {
        id: generateInsightId(),
        createdAt: new Date().toISOString(),
        ...action.insight,
      };

      return {
        ...session,
        insights: [...session.insights, insight],
      };
    }

    case "SET_NOTES": {
      return {
        ...session,
        notes: action.notes,
      };
    }

    case "COMPLETE": {
      // Mark all remaining steps as complete
      const updatedSteps = session.steps.map((step, index) => {
        if (index <= session.currentStepIndex && !step.complete && !step.skipped) {
          return {
            ...step,
            complete: true,
            completedAt: new Date().toISOString(),
          };
        }
        return step;
      });

      return {
        ...session,
        steps: updatedSteps,
        status: "completed",
        completedAt: new Date().toISOString(),
      };
    }

    case "ABANDON": {
      return {
        ...session,
        status: "abandoned",
        completedAt: new Date().toISOString(),
      };
    }

    default:
      return session;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the current step state
 */
export function getCurrentStep<TResult>(
  session: OperatorSession<TResult>,
): OperatorStepState | undefined {
  return session.steps[session.currentStepIndex];
}

/**
 * Get the current step configuration
 */
export function getCurrentStepConfig<TResult>(
  session: OperatorSession<TResult>,
): OperatorStepConfig | undefined {
  return session.steps[session.currentStepIndex]?.config;
}

/**
 * Check if session can proceed to next step
 */
export function canProceedToNext<TResult>(session: OperatorSession<TResult>): {
  canProceed: boolean;
  validation?: StepValidation;
} {
  if (session.currentStepIndex >= session.steps.length - 1) {
    return { canProceed: false };
  }

  const currentStep = session.steps[session.currentStepIndex];
  if (!currentStep) {
    return { canProceed: false };
  }

  // Check if step is complete
  if (currentStep.config.isComplete) {
    const isComplete = currentStep.config.isComplete(session);
    if (!isComplete) {
      return {
        canProceed: false,
        validation: { valid: false, errors: ["Step not complete"], warnings: [] },
      };
    }
  }

  // Run validation if provided
  if (currentStep.config.validate) {
    const validation = currentStep.config.validate(session);
    return { canProceed: validation.valid, validation };
  }

  return { canProceed: true };
}

/**
 * Check if session can go back to previous step
 */
export function canGoBack<TResult>(session: OperatorSession<TResult>): boolean {
  return session.currentStepIndex > 0;
}

/**
 * Check if current step can be skipped
 */
export function canSkipCurrent<TResult>(session: OperatorSession<TResult>): boolean {
  const currentStep = session.steps[session.currentStepIndex];
  return currentStep?.config.canSkip ?? false;
}

/**
 * Get session progress as a percentage
 */
export function getProgress<TResult>(session: OperatorSession<TResult>): number {
  if (session.steps.length === 0) return 0;
  const completedCount = session.steps.filter((s) => s.complete || s.skipped).length;
  return (completedCount / session.steps.length) * 100;
}

/**
 * Get summary of session state
 */
export function getSessionSummary<TResult>(session: OperatorSession<TResult>): {
  operatorName: string;
  status: OperatorSessionStatus;
  progress: number;
  currentStep: string;
  totalSteps: number;
  insightCount: number;
  duration: number;
} {
  const metadata = OPERATOR_METADATA[session.operatorType];
  const currentStepConfig = getCurrentStepConfig(session);

  const startTime = new Date(session.startedAt).getTime();
  const endTime = session.completedAt ? new Date(session.completedAt).getTime() : Date.now();

  return {
    operatorName: metadata.name,
    status: session.status,
    progress: getProgress(session),
    currentStep: currentStepConfig?.name ?? "Unknown",
    totalSteps: session.steps.length,
    insightCount: session.insights.length,
    duration: endTime - startTime,
  };
}

/**
 * Serialize session to JSON-safe format
 */
export function serializeSession<TResult>(session: OperatorSession<TResult>): string {
  return JSON.stringify(session);
}

/**
 * Deserialize session from JSON
 */
export function deserializeSession<TResult>(json: string): OperatorSession<TResult> | null {
  try {
    return JSON.parse(json) as OperatorSession<TResult>;
  } catch {
    return null;
  }
}
