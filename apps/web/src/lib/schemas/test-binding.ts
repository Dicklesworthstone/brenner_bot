import { z } from "zod";
import type { Hypothesis, HypothesisConfidence, HypothesisState } from "./hypothesis";
import {
  type StateTransition,
  type TransitionResult,
  transitionHypothesis,
} from "./hypothesis-lifecycle";
import type { HypothesisPrediction, Prediction } from "./prediction";
import type { TestExecution, TestRecord } from "./test-record";

/**
 * Test→Prediction Binding Logic
 *
 * This module connects test results to hypothesis state transitions.
 * When a test is executed, predictions are matched or violated,
 * and hypotheses are updated accordingly.
 *
 * From Brenner §229: "When they go ugly, kill them. Get rid of them."
 * The goal is to use test results to eliminate hypotheses efficiently.
 *
 * @see brenner_bot-evxc (bead)
 * @see specs/artifact_schema_v0.1.md
 * @see specs/evaluation_rubric_v0.1.md
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Confidence levels for execution results.
 * Matches HypothesisConfidence for consistency.
 */
export type ExecutionConfidence = HypothesisConfidence;

/**
 * Input for recording a test execution.
 */
export interface ExecutionInput {
  /** ID of the test that was executed */
  testId: string;

  /** The observed result of the test */
  result: string;

  /** Prediction IDs that were matched by this result */
  matchedPredictions: string[];

  /** Prediction IDs that were violated by this result */
  violatedPredictions: string[];

  /** Confidence in the result interpretation */
  confidence: ExecutionConfidence;

  /** Who executed the test */
  executedBy?: string;

  /** Additional notes about the execution */
  notes?: string;

  /** References to artifacts (files, data, etc.) */
  artifacts?: string[];

  /** Did the potency check pass? */
  potencyCheckPassed: boolean;

  /** Notes on potency check results */
  potencyCheckNotes?: string;
}

/**
 * Result of recording an execution.
 */
export interface ExecutionRecordResult {
  success: boolean;
  execution?: TestExecution;
  errors: string[];
  warnings: string[];
}

/**
 * Suggested action for a hypothesis based on test results.
 */
export type SuggestedAction = "kill" | "validate" | "none";

/**
 * A suggestion for transitioning a hypothesis based on test results.
 */
export interface TransitionSuggestion {
  /** The hypothesis to potentially transition */
  hypothesisId: string;

  /** Current state of the hypothesis */
  currentState: HypothesisState;

  /** Suggested action based on test results */
  suggestedAction: SuggestedAction;

  /** Human-readable reason for the suggestion */
  reason: string;

  /** Confidence in the suggestion */
  confidence: ExecutionConfidence;

  /** The test that produced this suggestion */
  testId: string;

  /** Prediction IDs that support this suggestion */
  supportingPredictions: string[];
}

/**
 * Result of suggesting transitions.
 */
export interface SuggestTransitionsResult {
  suggestions: TransitionSuggestion[];
  warnings: string[];
}

/**
 * Result of applying a single transition.
 */
export interface ApplyResult {
  hypothesisId: string;
  success: boolean;
  transition?: StateTransition;
  error?: string;
}

/**
 * Result of applying multiple transition suggestions.
 */
export interface ApplyTransitionsResult {
  applied: ApplyResult[];
  skipped: string[];
  errors: string[];
}

// ============================================================================
// Validation Schemas
// ============================================================================

const ExecutionInputSchema = z.object({
  testId: z.string().regex(/^T-[A-Za-z0-9][\w-]*-\d{3}$/, "Invalid test ID format"),
  result: z.string().min(1, "Result is required"),
  matchedPredictions: z.array(z.string()),
  violatedPredictions: z.array(z.string()),
  confidence: z.enum(["high", "medium", "low", "speculative"]),
  executedBy: z.string().optional(),
  notes: z.string().optional(),
  artifacts: z.array(z.string()).optional(),
  potencyCheckPassed: z.boolean(),
  potencyCheckNotes: z.string().optional(),
});

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Record a test execution and validate the hypothesis links.
 *
 * This function:
 * 1. Validates the input
 * 2. Checks that the test exists
 * 3. Validates prediction references
 * 4. Creates a TestExecution record
 *
 * @param input - The execution data to record
 * @param test - The test that was executed
 * @param predictions - All predictions for validation
 * @returns ExecutionRecordResult with the created execution or errors
 */
export function recordTestExecution(
  input: ExecutionInput,
  test: TestRecord,
  predictions: Prediction[],
): ExecutionRecordResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate input against schema
  const parseResult = ExecutionInputSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      errors: parseResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
      warnings: [],
    };
  }

  // Validate test ID matches
  if (input.testId !== test.id) {
    errors.push(`Test ID mismatch: input has ${input.testId}, test has ${test.id}`);
  }

  // Validate potency check
  if (!input.potencyCheckPassed) {
    warnings.push(
      "Potency check failed - results may be uninterpretable. " +
        'From Brenner: without potency check, negative results are meaningless ("was the assay broken?")',
    );
  }

  // Build prediction ID set for validation
  const predictionIds = new Set(predictions.map((p) => p.id));

  // Validate matched predictions exist
  for (const pId of input.matchedPredictions) {
    if (!predictionIds.has(pId)) {
      errors.push(`Matched prediction ${pId} not found in predictions registry`);
    }
  }

  // Validate violated predictions exist
  for (const pId of input.violatedPredictions) {
    if (!predictionIds.has(pId)) {
      errors.push(`Violated prediction ${pId} not found in predictions registry`);
    }
  }

  // Check for overlap between matched and violated
  const matchedSet = new Set(input.matchedPredictions);
  const violatedSet = new Set(input.violatedPredictions);
  const overlap = [...matchedSet].filter((id) => violatedSet.has(id));
  if (overlap.length > 0) {
    errors.push(`Predictions cannot be both matched and violated: ${overlap.join(", ")}`);
  }

  // If there are errors, return early
  if (errors.length > 0) {
    return { success: false, errors, warnings };
  }

  // Create the execution record
  const now = new Date().toISOString();
  const execution: TestExecution = {
    startedAt: now,
    completedAt: now,
    executedBy: input.executedBy,
    observedOutcome: input.result,
    potencyCheckPassed: input.potencyCheckPassed,
    potencyCheckNotes: input.potencyCheckNotes,
    notes: input.notes,
  };

  return {
    success: true,
    execution,
    errors: [],
    warnings,
  };
}

/**
 * Suggest hypothesis transitions based on test execution results.
 *
 * This function analyzes matched and violated predictions to determine
 * which hypotheses should be killed (refuted) or validated (confirmed).
 *
 * Key logic:
 * - A hypothesis is suggested for KILL if any of its predictions were violated
 * - A hypothesis is suggested for VALIDATE if its predictions were matched
 *   AND no predictions were violated
 * - Suggestions respect the current hypothesis state (can't kill already-refuted)
 *
 * @param input - The execution input with matched/violated predictions
 * @param predictions - All predictions to analyze
 * @param hypotheses - All hypotheses for state checking
 * @returns TransitionSuggestion array with recommended actions
 */
export function suggestTransitionsFromExecution(
  input: ExecutionInput,
  predictions: Prediction[],
  hypotheses: Hypothesis[],
): SuggestTransitionsResult {
  const suggestions: TransitionSuggestion[] = [];
  const warnings: string[] = [];

  // Build lookup maps
  const predictionMap = new Map(predictions.map((p) => [p.id, p]));
  const hypothesisMap = new Map(hypotheses.map((h) => [h.id, h]));

  // Track which hypotheses are affected by matched/violated predictions
  const hypothesisToMatchedPredictions = new Map<string, string[]>();
  const hypothesisToViolatedPredictions = new Map<string, string[]>();

  // Process matched predictions
  // When a prediction is "matched", we need to determine which hypothesis within
  // that prediction actually had their prediction confirmed by the result.
  // We use simple heuristics to match the result to individual hypothesis predictions.
  for (const pId of input.matchedPredictions) {
    const prediction = predictionMap.get(pId);
    if (!prediction) continue;

    // Use result-based matching to determine which hypothesis's prediction was matched
    const categorized = categorizeHypothesesByResult(
      input.result,
      prediction.hypothesisPredictions,
    );

    for (const hId of categorized.matched) {
      const existing = hypothesisToMatchedPredictions.get(hId) ?? [];
      existing.push(pId);
      hypothesisToMatchedPredictions.set(hId, existing);
    }
    for (const hId of categorized.violated) {
      const existing = hypothesisToViolatedPredictions.get(hId) ?? [];
      existing.push(pId);
      hypothesisToViolatedPredictions.set(hId, existing);
    }
    // Track ambiguous hypotheses too (for validation/warning purposes)
    for (const hId of categorized.ambiguous) {
      // Add to matched map with empty array if not already tracked
      // This ensures we check the hypothesis exists even if result was ambiguous
      if (!hypothesisToMatchedPredictions.has(hId) && !hypothesisToViolatedPredictions.has(hId)) {
        hypothesisToMatchedPredictions.set(hId, []);
      }
    }
  }

  // Process violated predictions
  // When a prediction is "violated", it means the test result was unexpected.
  // We still need to attribute this to specific hypotheses based on the result.
  for (const pId of input.violatedPredictions) {
    const prediction = predictionMap.get(pId);
    if (!prediction) continue;

    // All hypotheses in a violated prediction have their predictions violated
    // (something unexpected happened that none of them predicted)
    for (const hp of prediction.hypothesisPredictions) {
      const existing = hypothesisToViolatedPredictions.get(hp.hypothesisId) ?? [];
      existing.push(pId);
      hypothesisToViolatedPredictions.set(hp.hypothesisId, existing);
    }
  }

  // Collect all affected hypothesis IDs
  const affectedHypothesisIds = new Set([
    ...hypothesisToMatchedPredictions.keys(),
    ...hypothesisToViolatedPredictions.keys(),
  ]);

  // Generate suggestions for each affected hypothesis
  for (const hId of affectedHypothesisIds) {
    const hypothesis = hypothesisMap.get(hId);
    if (!hypothesis) {
      warnings.push(`Hypothesis ${hId} referenced in predictions but not found`);
      continue;
    }

    const matchedPreds = hypothesisToMatchedPredictions.get(hId) ?? [];
    const violatedPreds = hypothesisToViolatedPredictions.get(hId) ?? [];

    // Determine suggested action
    let suggestedAction: SuggestedAction;
    let reason: string;
    let supportingPredictions: string[];

    if (violatedPreds.length > 0) {
      // Violation takes precedence - suggest killing the hypothesis
      // Per Brenner §229: "When they go ugly, kill them."
      suggestedAction = "kill";
      reason =
        `Prediction(s) ${violatedPreds.join(", ")} violated by test result. ` +
        "Hypothesis makes predictions inconsistent with observed outcome.";
      supportingPredictions = violatedPreds;
    } else if (matchedPreds.length > 0) {
      // Only matched predictions (no violations) - suggest validation
      // Note: Confirmation is provisional in science
      suggestedAction = "validate";
      reason =
        `Prediction(s) ${matchedPreds.join(", ")} matched by test result. ` +
        "Hypothesis predictions consistent with observed outcome.";
      supportingPredictions = matchedPreds;
    } else {
      // Ambiguous case: neither result nor prediction had clear polarity indicators
      // No action can be suggested without clearer data
      suggestedAction = "none";
      reason = "Result or prediction polarity unclear - no action suggested.";
      supportingPredictions = [];
    }

    // Check if the hypothesis is in a state that can be transitioned
    const canTransition = canSuggestTransition(hypothesis.state, suggestedAction);

    if (!canTransition.allowed) {
      if (suggestedAction !== "none") {
        warnings.push(`Cannot ${suggestedAction} hypothesis ${hId}: ${canTransition.reason}`);
      }
      continue;
    }

    // Determine confidence based on input confidence and number of predictions
    const suggestionConfidence = deriveConfidence(
      input.confidence,
      supportingPredictions.length,
      input.potencyCheckPassed,
    );

    suggestions.push({
      hypothesisId: hId,
      currentState: hypothesis.state,
      suggestedAction,
      reason,
      confidence: suggestionConfidence,
      testId: input.testId,
      supportingPredictions,
    });
  }

  return { suggestions, warnings };
}

/**
 * Apply transition suggestions to hypotheses.
 *
 * This function takes the suggestions from suggestTransitionsFromExecution
 * and applies the transitions using the hypothesis-lifecycle module.
 *
 * NOTE: The original hypotheses array is NOT mutated. Updated hypothesis objects
 * are available via the returned ApplyResult.transition.hypothesis for successful
 * transitions. Callers should use these if they need the updated state.
 *
 * @param suggestions - The transition suggestions to apply
 * @param hypotheses - The hypotheses to transition (used for lookup, not mutated)
 * @param options - Additional options for the transitions
 * @returns ApplyTransitionsResult with applied transitions and errors
 */
export function applyTransitionSuggestions(
  suggestions: TransitionSuggestion[],
  hypotheses: Hypothesis[],
  options: {
    triggeredBy?: string;
    sessionId?: string;
    /** Only apply suggestions at or above this confidence level */
    minConfidence?: ExecutionConfidence;
    /** Skip 'validate' actions (only apply kills) */
    killsOnly?: boolean;
  } = {},
): ApplyTransitionsResult {
  const applied: ApplyResult[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  // Build hypothesis map
  const hypothesisMap = new Map(hypotheses.map((h) => [h.id, h]));

  // Confidence ordering for filtering
  const confidenceOrder: ExecutionConfidence[] = ["high", "medium", "low", "speculative"];
  const minConfidenceIndex = options.minConfidence
    ? confidenceOrder.indexOf(options.minConfidence)
    : confidenceOrder.length - 1;

  for (const suggestion of suggestions) {
    // Skip "none" actions
    if (suggestion.suggestedAction === "none") {
      skipped.push(suggestion.hypothesisId);
      continue;
    }

    // Filter by confidence
    const suggestionConfidenceIndex = confidenceOrder.indexOf(suggestion.confidence);
    if (suggestionConfidenceIndex > minConfidenceIndex) {
      skipped.push(suggestion.hypothesisId);
      continue;
    }

    // Filter validate actions if killsOnly is set
    if (options.killsOnly && suggestion.suggestedAction === "validate") {
      skipped.push(suggestion.hypothesisId);
      continue;
    }

    // Get the hypothesis
    const hypothesis = hypothesisMap.get(suggestion.hypothesisId);
    if (!hypothesis) {
      errors.push(`Hypothesis ${suggestion.hypothesisId} not found`);
      continue;
    }

    // Map action to trigger
    const trigger = suggestion.suggestedAction === "kill" ? "refute" : "confirm";

    // Create a synthetic test result ID for the transition
    const testResultId = `${suggestion.testId}:${suggestion.supportingPredictions.join(",")}`;

    // Apply the transition
    const result: TransitionResult = transitionHypothesis(hypothesis, trigger, {
      triggeredBy: options.triggeredBy ?? "test-binding",
      testResultId,
      reason: suggestion.reason,
      sessionId: options.sessionId,
    });

    if (result.success) {
      // Update the hypothesis in the map for subsequent operations
      hypothesisMap.set(suggestion.hypothesisId, result.hypothesis);

      applied.push({
        hypothesisId: suggestion.hypothesisId,
        success: true,
        transition: result.transition,
      });
    } else {
      applied.push({
        hypothesisId: suggestion.hypothesisId,
        success: false,
        error: result.error.message,
      });
      errors.push(`${suggestion.hypothesisId}: ${result.error.message}`);
    }
  }

  return { applied, skipped, errors };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a transition can be suggested for a hypothesis in a given state.
 */
function canSuggestTransition(
  state: HypothesisState,
  action: SuggestedAction,
): { allowed: boolean; reason?: string } {
  if (action === "none") {
    return { allowed: true };
  }

  // Terminal states cannot be transitioned
  if (state === "refuted") {
    return {
      allowed: false,
      reason: "Hypothesis is already refuted (terminal state)",
    };
  }

  if (state === "superseded") {
    return {
      allowed: false,
      reason: "Hypothesis has been superseded (terminal state)",
    };
  }

  // Kill action requires refute trigger (active or confirmed states)
  if (action === "kill") {
    if (state === "proposed") {
      return {
        allowed: false,
        reason: "Hypothesis must be activated before it can be refuted",
      };
    }
    if (state === "deferred") {
      return {
        allowed: false,
        reason: "Hypothesis is deferred - reactivate before refuting",
      };
    }
    // active and confirmed can be refuted
    return { allowed: true };
  }

  // Validate action requires confirm trigger (only from active)
  if (action === "validate") {
    if (state !== "active") {
      return {
        allowed: false,
        reason: `Hypothesis must be in 'active' state to be confirmed (current: ${state})`,
      };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: "Unknown action" };
}

/**
 * Categorize hypotheses within a prediction by comparing result to their predictions.
 * Returns which hypothesis IDs had their predictions matched vs violated.
 */
function categorizeHypothesesByResult(
  result: string,
  hypothesisPredictions: HypothesisPrediction[],
): { matched: string[]; violated: string[]; ambiguous: string[] } {
  const matched: string[] = [];
  const violated: string[] = [];
  const ambiguous: string[] = [];

  const resultPolarity = detectPolarity(result);

  for (const hp of hypothesisPredictions) {
    const predictionPolarity = detectPolarity(hp.prediction);

    if (resultPolarity === "ambiguous" || predictionPolarity === "ambiguous") {
      ambiguous.push(hp.hypothesisId);
    } else if (resultPolarity === predictionPolarity) {
      matched.push(hp.hypothesisId);
    } else {
      violated.push(hp.hypothesisId);
    }
  }

  return { matched, violated, ambiguous };
}

/**
 * Detect whether text expresses a positive or negative outcome.
 * Uses word boundary-aware matching to avoid false positives.
 */
function detectPolarity(text: string): "positive" | "negative" | "ambiguous" {
  const lowerText = text.toLowerCase();

  // Negative phrases take precedence (check these first)
  // These are specific multi-word phrases that indicate negative outcomes
  const negativePatterns = [
    /\bnot detected\b/,
    /\bnot observed\b/,
    /\bnot present\b/,
    /\bno effect\b/,
    /\babsent\b/,
    /\bnegative\b/,
    /\bnone\b/,
    /\bfalse\b/,
  ];

  // Positive patterns (only match if no negative pattern matched)
  const positivePatterns = [
    /\bdetected\b/,
    /\bobserved\b/,
    /\bpresent\b/,
    /\beffect\b/,
    /\bpositive\b/,
    /\byes\b/,
    /\btrue\b/,
  ];

  const hasNegative = negativePatterns.some((p) => p.test(lowerText));
  const hasPositive = positivePatterns.some((p) => p.test(lowerText));

  // Negative takes precedence because "not present" contains "present"
  if (hasNegative) return "negative";
  if (hasPositive) return "positive";
  return "ambiguous";
}

/**
 * Derive confidence for a suggestion based on input factors.
 */
function deriveConfidence(
  inputConfidence: ExecutionConfidence,
  predictionCount: number,
  potencyCheckPassed: boolean,
): ExecutionConfidence {
  const confidenceOrder: ExecutionConfidence[] = ["high", "medium", "low", "speculative"];
  let index = confidenceOrder.indexOf(inputConfidence);

  // Potency check failure reduces confidence
  if (!potencyCheckPassed) {
    index = Math.min(index + 2, confidenceOrder.length - 1);
  }

  // Multiple predictions increase confidence (up to one level)
  if (predictionCount >= 3 && index > 0) {
    index -= 1;
  }

  return confidenceOrder[index];
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Full execution workflow: record, suggest, and optionally apply.
 *
 * This is a convenience function that combines all three steps.
 */
export function processTestExecution(
  input: ExecutionInput,
  test: TestRecord,
  predictions: Prediction[],
  hypotheses: Hypothesis[],
  options: {
    autoApply?: boolean;
    triggeredBy?: string;
    sessionId?: string;
    minConfidence?: ExecutionConfidence;
    killsOnly?: boolean;
  } = {},
): {
  recordResult: ExecutionRecordResult;
  suggestResult?: SuggestTransitionsResult;
  applyResult?: ApplyTransitionsResult;
} {
  // Step 1: Record the execution
  const recordResult = recordTestExecution(input, test, predictions);

  if (!recordResult.success) {
    return { recordResult };
  }

  // Step 2: Suggest transitions
  const suggestResult = suggestTransitionsFromExecution(input, predictions, hypotheses);

  if (!options.autoApply) {
    return { recordResult, suggestResult };
  }

  // Step 3: Apply transitions
  const applyResult = applyTransitionSuggestions(suggestResult.suggestions, hypotheses, {
    triggeredBy: options.triggeredBy,
    sessionId: options.sessionId,
    minConfidence: options.minConfidence,
    killsOnly: options.killsOnly,
  });

  return { recordResult, suggestResult, applyResult };
}

/**
 * Find predictions that would be matched or violated by a given result.
 *
 * This is a heuristic function that helps categorize predictions
 * based on an observed outcome. Real usage would require domain-specific
 * logic for matching predictions to outcomes.
 */
export function categorizePredictions(
  result: string,
  predictions: Prediction[],
  hypothesisId: string,
): {
  matched: string[];
  violated: string[];
  ambiguous: string[];
} {
  const matched: string[] = [];
  const violated: string[] = [];
  const ambiguous: string[] = [];

  const resultPolarity = detectPolarity(result);

  for (const prediction of predictions) {
    // Find the hypothesis's prediction within this prediction
    const hp = prediction.hypothesisPredictions.find((p) => p.hypothesisId === hypothesisId);

    if (!hp) continue;

    const predictionPolarity = detectPolarity(hp.prediction);

    if (resultPolarity === "ambiguous" || predictionPolarity === "ambiguous") {
      ambiguous.push(prediction.id);
    } else if (resultPolarity === predictionPolarity) {
      matched.push(prediction.id);
    } else {
      violated.push(prediction.id);
    }
  }

  return { matched, violated, ambiguous };
}
