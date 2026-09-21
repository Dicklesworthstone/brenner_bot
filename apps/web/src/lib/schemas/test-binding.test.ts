/**
 * Unit tests for Test→Prediction Binding Logic
 *
 * Tests the core functions that connect test results to hypothesis transitions:
 * - recordTestExecution: Validate and record test executions
 * - suggestTransitionsFromExecution: Suggest hypothesis kills/validates
 * - applyTransitionSuggestions: Apply transitions to hypotheses
 *
 * @see brenner_bot-evxc (bead)
 * @see @/lib/schemas/test-binding.ts
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { Hypothesis } from "./hypothesis";
import type { Prediction } from "./prediction";
import {
  applyTransitionSuggestions,
  categorizePredictions,
  type ExecutionInput,
  processTestExecution,
  recordTestExecution,
  suggestTransitionsFromExecution,
  type TransitionSuggestion,
} from "./test-binding";
import type { TestRecord } from "./test-record";

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestHypothesis(overrides: Partial<Hypothesis> = {}): Hypothesis {
  const now = new Date().toISOString();
  return {
    id: "H-TEST-001",
    statement: "Test hypothesis statement",
    origin: "proposed",
    category: "mechanistic",
    confidence: "medium",
    sessionId: "TEST",
    state: "active",
    isInference: false,
    unresolvedCritiqueCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createTestPrediction(overrides: Partial<Prediction> = {}): Prediction {
  const now = new Date().toISOString();
  return {
    id: "P-TEST-001",
    condition: "Under test conditions",
    hypothesisPredictions: [
      { hypothesisId: "H-TEST-001", prediction: "Effect present" },
      { hypothesisId: "H-TEST-002", prediction: "Effect absent" },
    ],
    sessionId: "TEST",
    isDiscriminative: true,
    isInference: false,
    status: "untested",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createTestRecord(overrides: Partial<TestRecord> = {}): TestRecord {
  const now = new Date().toISOString();
  return {
    id: "T-TEST-001",
    name: "Test procedure",
    procedure: "Execute test and observe results",
    discriminates: ["H-TEST-001", "H-TEST-002"],
    expectedOutcomes: [
      { hypothesisId: "H-TEST-001", outcome: "Positive result" },
      { hypothesisId: "H-TEST-002", outcome: "Negative result" },
    ],
    potencyCheck: {
      positiveControl: "Include known positive control sample",
    },
    evidencePerWeekScore: {
      likelihoodRatio: 3,
      cost: 2,
      speed: 2,
      ambiguity: 3,
    },
    feasibility: {
      requirements: "Standard lab equipment",
      difficulty: "moderate",
    },
    designedInSession: "TEST",
    status: "designed",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createExecutionInput(overrides: Partial<ExecutionInput> = {}): ExecutionInput {
  return {
    testId: "T-TEST-001",
    result: "Effect present - positive result observed",
    matchedPredictions: ["P-TEST-001"],
    violatedPredictions: [],
    confidence: "high",
    potencyCheckPassed: true,
    ...overrides,
  };
}

// ============================================================================
// recordTestExecution Tests
// ============================================================================

describe("recordTestExecution", () => {
  let test: TestRecord;
  let predictions: Prediction[];

  beforeEach(() => {
    test = createTestRecord();
    predictions = [createTestPrediction()];
  });

  describe("validation", () => {
    it("returns error for invalid test ID format", () => {
      const input = createExecutionInput({ testId: "invalid-id" });
      const result = recordTestExecution(input, test, predictions);

      expect(result.success).toBe(false);
      expect(result.errors).toContain("testId: Invalid test ID format");
    });

    it("returns error for empty result", () => {
      const input = createExecutionInput({ result: "" });
      const result = recordTestExecution(input, test, predictions);

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes("Result is required"))).toBe(true);
    });

    it("returns error for test ID mismatch", () => {
      const input = createExecutionInput({ testId: "T-OTHER-001" });
      const result = recordTestExecution(input, test, predictions);

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes("Test ID mismatch"))).toBe(true);
    });

    it("returns error for unknown matched prediction", () => {
      const input = createExecutionInput({ matchedPredictions: ["P-UNKNOWN-001"] });
      const result = recordTestExecution(input, test, predictions);

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes("P-UNKNOWN-001 not found"))).toBe(true);
    });

    it("returns error for unknown violated prediction", () => {
      const input = createExecutionInput({
        matchedPredictions: [],
        violatedPredictions: ["P-UNKNOWN-001"],
      });
      const result = recordTestExecution(input, test, predictions);

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes("P-UNKNOWN-001 not found"))).toBe(true);
    });

    it("returns error for prediction in both matched and violated", () => {
      const input = createExecutionInput({
        matchedPredictions: ["P-TEST-001"],
        violatedPredictions: ["P-TEST-001"],
      });
      const result = recordTestExecution(input, test, predictions);

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes("cannot be both matched and violated"))).toBe(
        true,
      );
    });
  });

  describe("potency check handling", () => {
    it("adds warning when potency check fails", () => {
      const input = createExecutionInput({ potencyCheckPassed: false });
      const result = recordTestExecution(input, test, predictions);

      expect(result.success).toBe(true);
      expect(result.warnings.some((w) => w.includes("Potency check failed"))).toBe(true);
    });

    it("no warning when potency check passes", () => {
      const input = createExecutionInput({ potencyCheckPassed: true });
      const result = recordTestExecution(input, test, predictions);

      expect(result.success).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("successful recording", () => {
    it("creates execution record with correct fields", () => {
      const input = createExecutionInput({
        executedBy: "TestAgent",
        notes: "Test notes",
        potencyCheckNotes: "Control passed",
      });
      const result = recordTestExecution(input, test, predictions);

      expect(result.success).toBe(true);
      expect(result.execution).toBeDefined();
      expect(result.execution!.observedOutcome).toBe(input.result);
      expect(result.execution!.executedBy).toBe("TestAgent");
      expect(result.execution!.potencyCheckPassed).toBe(true);
      expect(result.execution!.potencyCheckNotes).toBe("Control passed");
    });

    it("sets timestamps on execution", () => {
      const input = createExecutionInput();
      const result = recordTestExecution(input, test, predictions);

      expect(result.success).toBe(true);
      expect(result.execution!.startedAt).toBeDefined();
      expect(result.execution!.completedAt).toBeDefined();
    });
  });
});

// ============================================================================
// suggestTransitionsFromExecution Tests
// ============================================================================

describe("suggestTransitionsFromExecution", () => {
  let predictions: Prediction[];
  let hypotheses: Hypothesis[];

  beforeEach(() => {
    predictions = [
      createTestPrediction({
        id: "P-TEST-001",
        hypothesisPredictions: [
          { hypothesisId: "H-TEST-001", prediction: "Effect present" },
          { hypothesisId: "H-TEST-002", prediction: "Effect absent" },
        ],
      }),
    ];
    hypotheses = [
      createTestHypothesis({ id: "H-TEST-001", state: "active" }),
      createTestHypothesis({ id: "H-TEST-002", state: "active" }),
    ];
  });

  describe("kill suggestions", () => {
    it("suggests kill for hypothesis with violated prediction", () => {
      // When prediction is violated, ALL hypotheses in it are violated
      const input = createExecutionInput({
        result: "Unexpected outcome - neither hypothesis was correct",
        matchedPredictions: [],
        violatedPredictions: ["P-TEST-001"],
      });

      const result = suggestTransitionsFromExecution(input, predictions, hypotheses);

      expect(result.suggestions).toHaveLength(2);
      const killSuggestions = result.suggestions.filter((s) => s.suggestedAction === "kill");
      expect(killSuggestions).toHaveLength(2); // Both hypotheses violated
    });

    it("includes reason with violated prediction IDs", () => {
      const input = createExecutionInput({
        result: "Unexpected result",
        matchedPredictions: [],
        violatedPredictions: ["P-TEST-001"],
      });

      const result = suggestTransitionsFromExecution(input, predictions, hypotheses);
      const killSuggestion = result.suggestions.find((s) => s.suggestedAction === "kill");

      expect(killSuggestion).toBeDefined();
      expect(killSuggestion!.reason).toContain("P-TEST-001");
      expect(killSuggestion!.reason).toContain("violated");
    });

    it("tracks supporting predictions for kill", () => {
      const input = createExecutionInput({
        result: "Unexpected result",
        matchedPredictions: [],
        violatedPredictions: ["P-TEST-001"],
      });

      const result = suggestTransitionsFromExecution(input, predictions, hypotheses);
      const killSuggestion = result.suggestions.find((s) => s.suggestedAction === "kill");

      expect(killSuggestion!.supportingPredictions).toContain("P-TEST-001");
    });
  });

  describe("matched prediction logic", () => {
    it("correctly attributes match/violation based on result polarity", () => {
      // When result says "present", H-TEST-001 (predicts present) matches
      // and H-TEST-002 (predicts absent) is violated
      const input = createExecutionInput({
        result: "Effect present - positive observation",
        matchedPredictions: ["P-TEST-001"],
        violatedPredictions: [],
      });

      const result = suggestTransitionsFromExecution(input, predictions, hypotheses);

      expect(result.suggestions).toHaveLength(2);

      const h1Suggestion = result.suggestions.find((s) => s.hypothesisId === "H-TEST-001");
      const h2Suggestion = result.suggestions.find((s) => s.hypothesisId === "H-TEST-002");

      expect(h1Suggestion!.suggestedAction).toBe("validate");
      expect(h2Suggestion!.suggestedAction).toBe("kill");
    });

    it("correctly handles negative result matching negative prediction", () => {
      // When result says "absent", H-TEST-002 (predicts absent) matches
      // and H-TEST-001 (predicts present) is violated
      const input = createExecutionInput({
        result: "Effect absent - no observation",
        matchedPredictions: ["P-TEST-001"],
        violatedPredictions: [],
      });

      const result = suggestTransitionsFromExecution(input, predictions, hypotheses);

      const h1Suggestion = result.suggestions.find((s) => s.hypothesisId === "H-TEST-001");
      const h2Suggestion = result.suggestions.find((s) => s.hypothesisId === "H-TEST-002");

      expect(h1Suggestion!.suggestedAction).toBe("kill");
      expect(h2Suggestion!.suggestedAction).toBe("validate");
    });
  });

  describe("validate suggestions", () => {
    it("suggests validate for hypothesis whose prediction matches result", () => {
      const input = createExecutionInput({
        result: "Effect observed - present",
        matchedPredictions: ["P-TEST-001"],
        violatedPredictions: [],
      });

      const result = suggestTransitionsFromExecution(input, predictions, hypotheses);

      const validateSuggestions = result.suggestions.filter(
        (s) => s.suggestedAction === "validate",
      );
      expect(validateSuggestions).toHaveLength(1);
      expect(validateSuggestions[0].hypothesisId).toBe("H-TEST-001");
    });

    it("includes reason with matched prediction IDs", () => {
      const input = createExecutionInput({
        result: "Effect detected - positive",
        matchedPredictions: ["P-TEST-001"],
        violatedPredictions: [],
      });

      const result = suggestTransitionsFromExecution(input, predictions, hypotheses);
      const validateSuggestion = result.suggestions.find((s) => s.suggestedAction === "validate");

      expect(validateSuggestion).toBeDefined();
      expect(validateSuggestion!.reason).toContain("P-TEST-001");
      expect(validateSuggestion!.reason).toContain("matched");
    });
  });

  describe("state restrictions", () => {
    it("warns when trying to kill proposed hypothesis", () => {
      hypotheses[0].state = "proposed";
      const input = createExecutionInput({
        result: "Unexpected outcome",
        matchedPredictions: [],
        violatedPredictions: ["P-TEST-001"],
      });

      const result = suggestTransitionsFromExecution(input, predictions, hypotheses);

      expect(result.warnings.some((w) => w.includes("H-TEST-001"))).toBe(true);
      expect(result.suggestions.every((s) => s.hypothesisId !== "H-TEST-001")).toBe(true);
    });

    it("warns when trying to kill already refuted hypothesis", () => {
      hypotheses[0].state = "refuted";
      const input = createExecutionInput({
        result: "Unexpected outcome",
        matchedPredictions: [],
        violatedPredictions: ["P-TEST-001"],
      });

      const result = suggestTransitionsFromExecution(input, predictions, hypotheses);

      expect(result.warnings.some((w) => w.includes("already refuted"))).toBe(true);
    });

    it("warns when trying to validate non-active hypothesis", () => {
      hypotheses[0].state = "confirmed";
      const input = createExecutionInput({
        result: "Effect present - matches H-TEST-001",
        matchedPredictions: ["P-TEST-001"],
        violatedPredictions: [],
      });

      const result = suggestTransitionsFromExecution(input, predictions, hypotheses);

      expect(result.warnings.some((w) => w.includes("must be in 'active' state"))).toBe(true);
    });
  });

  describe("confidence derivation", () => {
    it("reduces confidence when potency check fails", () => {
      const input = createExecutionInput({
        result: "Effect present",
        matchedPredictions: ["P-TEST-001"],
        violatedPredictions: [],
        confidence: "high",
        potencyCheckPassed: false,
      });

      const result = suggestTransitionsFromExecution(input, predictions, hypotheses);

      // Should be reduced from high by at least 2 levels
      const suggestion = result.suggestions.find((s) => s.suggestedAction === "validate");
      expect(suggestion).toBeDefined();
      expect(["low", "speculative"]).toContain(suggestion!.confidence);
    });

    it("preserves high confidence with passing potency check", () => {
      const input = createExecutionInput({
        result: "Effect present",
        matchedPredictions: ["P-TEST-001"],
        violatedPredictions: [],
        confidence: "high",
        potencyCheckPassed: true,
      });

      const result = suggestTransitionsFromExecution(input, predictions, hypotheses);

      const suggestion = result.suggestions.find((s) => s.suggestedAction === "validate");
      expect(suggestion!.confidence).toBe("high");
    });
  });

  describe("missing data handling", () => {
    it("warns when prediction references unknown hypothesis", () => {
      // Add a hypothesis prediction with clear polarity that will be matched/violated
      predictions[0].hypothesisPredictions.push({
        hypothesisId: "H-UNKNOWN-001",
        prediction: "Effect present", // Clear positive polarity
      });
      const input = createExecutionInput({
        result: "Effect present",
        matchedPredictions: ["P-TEST-001"],
        violatedPredictions: [],
      });

      const result = suggestTransitionsFromExecution(input, predictions, hypotheses);

      // H-UNKNOWN-001 should generate a warning since it's not in the hypotheses list
      expect(result.warnings.some((w) => w.includes("H-UNKNOWN-001"))).toBe(true);
    });

    it("warns for unknown hypotheses even with ambiguous predictions", () => {
      // Add a hypothesis prediction with ambiguous polarity for a non-existent hypothesis
      predictions[0].hypothesisPredictions.push({
        hypothesisId: "H-UNKNOWN-001",
        prediction: "Something unclear", // Ambiguous - no polarity indicators
      });
      const input = createExecutionInput({
        result: "Effect present",
        matchedPredictions: ["P-TEST-001"],
        violatedPredictions: [],
      });

      const result = suggestTransitionsFromExecution(input, predictions, hypotheses);

      // No suggestion is generated for ambiguous predictions (they have no action)
      expect(result.suggestions.every((s) => s.hypothesisId !== "H-UNKNOWN-001")).toBe(true);

      // But a warning IS generated because the hypothesis doesn't exist
      // This is correct behavior - we want to catch data integrity issues
      expect(result.warnings.some((w) => w.includes("H-UNKNOWN-001"))).toBe(true);
    });

    it("generates 'none' suggestion for existing hypothesis with ambiguous prediction", () => {
      // Replace the original prediction with one that has ONLY ambiguous predictions
      predictions = [
        createTestPrediction({
          id: "P-TEST-001",
          hypothesisPredictions: [
            { hypothesisId: "H-TEST-001", prediction: "Something unclear" },
            { hypothesisId: "H-TEST-002", prediction: "Another ambiguous statement" },
          ],
        }),
      ];

      // Use an ambiguous result (no polarity indicators like "observed", "present", etc.)
      const input = createExecutionInput({
        result: "Inconclusive data - cannot determine outcome", // Truly ambiguous
        matchedPredictions: ["P-TEST-001"],
        violatedPredictions: [],
      });

      const result = suggestTransitionsFromExecution(input, predictions, hypotheses);

      // Both hypotheses should get "none" suggestions since everything is ambiguous
      const h1Suggestion = result.suggestions.find((s) => s.hypothesisId === "H-TEST-001");
      const h2Suggestion = result.suggestions.find((s) => s.hypothesisId === "H-TEST-002");
      expect(h1Suggestion).toBeDefined();
      expect(h2Suggestion).toBeDefined();
      expect(h1Suggestion!.suggestedAction).toBe("none");
      expect(h2Suggestion!.suggestedAction).toBe("none");

      // No warnings since both hypotheses exist
      expect(result.warnings).toHaveLength(0);
    });
  });
});

// ============================================================================
// applyTransitionSuggestions Tests
// ============================================================================

describe("applyTransitionSuggestions", () => {
  let hypotheses: Hypothesis[];
  let suggestions: TransitionSuggestion[];

  beforeEach(() => {
    hypotheses = [
      createTestHypothesis({ id: "H-TEST-001", state: "active" }),
      createTestHypothesis({ id: "H-TEST-002", state: "active" }),
    ];
    suggestions = [
      {
        hypothesisId: "H-TEST-001",
        currentState: "active",
        suggestedAction: "kill",
        reason: "Prediction violated",
        confidence: "high",
        testId: "T-TEST-001",
        supportingPredictions: ["P-TEST-001"],
      },
    ];
  });

  describe("applying kills", () => {
    it("successfully applies kill transition", () => {
      const result = applyTransitionSuggestions(suggestions, hypotheses);

      expect(result.applied).toHaveLength(1);
      expect(result.applied[0].success).toBe(true);
      expect(result.applied[0].transition).toBeDefined();
      expect(result.applied[0].transition!.trigger).toBe("refute");
    });

    it("records transition with correct testResultId", () => {
      const result = applyTransitionSuggestions(suggestions, hypotheses);

      expect(result.applied[0].transition!.testResultId).toContain("T-TEST-001");
      expect(result.applied[0].transition!.testResultId).toContain("P-TEST-001");
    });
  });

  describe("applying validates", () => {
    it("successfully applies validate transition", () => {
      const validateSuggestions: TransitionSuggestion[] = [
        {
          hypothesisId: "H-TEST-001",
          currentState: "active",
          suggestedAction: "validate",
          reason: "Prediction matched",
          confidence: "high",
          testId: "T-TEST-001",
          supportingPredictions: ["P-TEST-001"],
        },
      ];

      const result = applyTransitionSuggestions(validateSuggestions, hypotheses);

      expect(result.applied).toHaveLength(1);
      expect(result.applied[0].success).toBe(true);
      expect(result.applied[0].transition!.trigger).toBe("confirm");
    });
  });

  describe("filtering", () => {
    it("skips 'none' actions", () => {
      const noneSuggestions: TransitionSuggestion[] = [
        {
          hypothesisId: "H-TEST-001",
          currentState: "active",
          suggestedAction: "none",
          reason: "No action needed",
          confidence: "high",
          testId: "T-TEST-001",
          supportingPredictions: [],
        },
      ];

      const result = applyTransitionSuggestions(noneSuggestions, hypotheses);

      expect(result.applied).toHaveLength(0);
      expect(result.skipped).toContain("H-TEST-001");
    });

    it("filters by minimum confidence", () => {
      suggestions[0].confidence = "low";

      const result = applyTransitionSuggestions(suggestions, hypotheses, {
        minConfidence: "medium",
      });

      expect(result.applied).toHaveLength(0);
      expect(result.skipped).toContain("H-TEST-001");
    });

    it("applies when confidence meets minimum", () => {
      suggestions[0].confidence = "medium";

      const result = applyTransitionSuggestions(suggestions, hypotheses, {
        minConfidence: "medium",
      });

      expect(result.applied).toHaveLength(1);
      expect(result.applied[0].success).toBe(true);
    });

    it("filters validate when killsOnly is true", () => {
      const mixedSuggestions: TransitionSuggestion[] = [
        {
          hypothesisId: "H-TEST-001",
          currentState: "active",
          suggestedAction: "kill",
          reason: "Violated",
          confidence: "high",
          testId: "T-TEST-001",
          supportingPredictions: ["P-TEST-001"],
        },
        {
          hypothesisId: "H-TEST-002",
          currentState: "active",
          suggestedAction: "validate",
          reason: "Matched",
          confidence: "high",
          testId: "T-TEST-001",
          supportingPredictions: ["P-TEST-002"],
        },
      ];

      const result = applyTransitionSuggestions(mixedSuggestions, hypotheses, {
        killsOnly: true,
      });

      expect(result.applied).toHaveLength(1);
      expect(result.applied[0].hypothesisId).toBe("H-TEST-001");
      expect(result.skipped).toContain("H-TEST-002");
    });
  });

  describe("error handling", () => {
    it("reports error for missing hypothesis", () => {
      suggestions[0].hypothesisId = "H-MISSING-001";

      const result = applyTransitionSuggestions(suggestions, hypotheses);

      expect(result.errors.some((e) => e.includes("H-MISSING-001"))).toBe(true);
    });

    it("reports error for invalid transition", () => {
      hypotheses[0].state = "proposed";
      suggestions[0].currentState = "proposed";

      const result = applyTransitionSuggestions(suggestions, hypotheses);

      expect(result.applied).toHaveLength(1);
      expect(result.applied[0].success).toBe(false);
      expect(result.applied[0].error).toBeDefined();
    });
  });

  describe("options", () => {
    it("uses triggeredBy option", () => {
      const result = applyTransitionSuggestions(suggestions, hypotheses, {
        triggeredBy: "TestRunner",
      });

      expect(result.applied[0].transition!.triggeredBy).toBe("TestRunner");
    });

    it("uses sessionId option", () => {
      const result = applyTransitionSuggestions(suggestions, hypotheses, {
        sessionId: "SESSION-001",
      });

      expect(result.applied[0].transition!.sessionId).toBe("SESSION-001");
    });
  });
});

// ============================================================================
// processTestExecution Tests
// ============================================================================

describe("processTestExecution", () => {
  let test: TestRecord;
  let predictions: Prediction[];
  let hypotheses: Hypothesis[];

  beforeEach(() => {
    test = createTestRecord();
    predictions = [createTestPrediction()];
    hypotheses = [
      createTestHypothesis({ id: "H-TEST-001", state: "active" }),
      createTestHypothesis({ id: "H-TEST-002", state: "active" }),
    ];
  });

  it("returns only record result when recording fails", () => {
    const input = createExecutionInput({ testId: "invalid" });

    const result = processTestExecution(input, test, predictions, hypotheses);

    expect(result.recordResult.success).toBe(false);
    expect(result.suggestResult).toBeUndefined();
    expect(result.applyResult).toBeUndefined();
  });

  it("returns record and suggest results when autoApply is false", () => {
    const input = createExecutionInput();

    const result = processTestExecution(input, test, predictions, hypotheses, {
      autoApply: false,
    });

    expect(result.recordResult.success).toBe(true);
    expect(result.suggestResult).toBeDefined();
    expect(result.applyResult).toBeUndefined();
  });

  it("applies transitions when autoApply is true", () => {
    const input = createExecutionInput({
      matchedPredictions: [],
      violatedPredictions: ["P-TEST-001"],
    });

    const result = processTestExecution(input, test, predictions, hypotheses, {
      autoApply: true,
    });

    expect(result.recordResult.success).toBe(true);
    expect(result.suggestResult).toBeDefined();
    expect(result.applyResult).toBeDefined();
    expect(result.applyResult!.applied.length).toBeGreaterThan(0);
  });

  it("passes options through to apply step", () => {
    const input = createExecutionInput({
      matchedPredictions: [],
      violatedPredictions: ["P-TEST-001"],
    });

    const result = processTestExecution(input, test, predictions, hypotheses, {
      autoApply: true,
      triggeredBy: "TestAgent",
      sessionId: "SESSION-001",
    });

    const appliedWithTransition = result.applyResult!.applied.find(
      (a) => a.success && a.transition,
    );
    expect(appliedWithTransition?.transition?.triggeredBy).toBe("TestAgent");
    expect(appliedWithTransition?.transition?.sessionId).toBe("SESSION-001");
  });
});

// ============================================================================
// categorizePredictions Tests
// ============================================================================

describe("categorizePredictions", () => {
  let predictions: Prediction[];

  beforeEach(() => {
    predictions = [
      createTestPrediction({
        id: "P-TEST-001",
        hypothesisPredictions: [{ hypothesisId: "H-TEST-001", prediction: "Effect present" }],
      }),
      createTestPrediction({
        id: "P-TEST-002",
        hypothesisPredictions: [{ hypothesisId: "H-TEST-001", prediction: "No effect / absent" }],
      }),
    ];
  });

  it("categorizes positive result matching positive prediction", () => {
    const result = categorizePredictions("Effect observed, positive", predictions, "H-TEST-001");

    expect(result.matched).toContain("P-TEST-001");
    expect(result.violated).toContain("P-TEST-002");
  });

  it("categorizes negative result matching negative prediction", () => {
    const result = categorizePredictions("No effect detected", predictions, "H-TEST-001");

    expect(result.matched).toContain("P-TEST-002");
    expect(result.violated).toContain("P-TEST-001");
  });

  it("marks ambiguous results appropriately", () => {
    const result = categorizePredictions("Unclear results", predictions, "H-TEST-001");

    expect(result.ambiguous).toContain("P-TEST-001");
    expect(result.ambiguous).toContain("P-TEST-002");
  });

  it("ignores predictions for other hypotheses", () => {
    predictions[0].hypothesisPredictions = [
      { hypothesisId: "H-OTHER-001", prediction: "Something" },
    ];

    const result = categorizePredictions("Effect present", predictions, "H-TEST-001");

    expect(result.matched).not.toContain("P-TEST-001");
    expect(result.matched).toHaveLength(0);
  });

  it("handles various positive indicators", () => {
    const indicators = [
      { result: "detected", prediction: "Effect present" },
      { result: "observed effect", prediction: "positive result" },
      { result: "true response", prediction: "yes, effect" },
    ];

    for (const { result: r, prediction: p } of indicators) {
      predictions[0].hypothesisPredictions = [{ hypothesisId: "H-TEST-001", prediction: p }];
      const categorized = categorizePredictions(r, predictions, "H-TEST-001");
      expect(categorized.matched).toContain("P-TEST-001");
    }
  });

  it("handles various negative indicators", () => {
    const indicators = [
      { result: "not detected", prediction: "absent" },
      { result: "not observed", prediction: "negative result" },
      { result: "false response", prediction: "no effect" },
    ];

    for (const { result: r, prediction: p } of indicators) {
      predictions[0].hypothesisPredictions = [{ hypothesisId: "H-TEST-001", prediction: p }];
      const categorized = categorizePredictions(r, predictions, "H-TEST-001");
      expect(categorized.matched).toContain("P-TEST-001");
    }
  });
});

// ============================================================================
// Integration Scenarios
// ============================================================================

describe("integration scenarios", () => {
  describe("Brenner workflow: hypothesis killed by test", () => {
    it("follows full workflow from execution to refutation", () => {
      const test = createTestRecord();
      const predictions = [
        createTestPrediction({
          id: "P-TEST-001",
          hypothesisPredictions: [
            { hypothesisId: "H-TEST-001", prediction: "Effect present" },
            { hypothesisId: "H-TEST-002", prediction: "Effect absent" },
          ],
        }),
      ];
      const hypotheses = [
        createTestHypothesis({ id: "H-TEST-001", state: "active" }),
        createTestHypothesis({ id: "H-TEST-002", state: "active" }),
      ];

      // Execute test - result is "absent" which matches H-TEST-002 and violates H-TEST-001
      // Using matchedPredictions because the prediction was tested (not an unexpected outcome)
      const input = createExecutionInput({
        result: "Effect absent - negative result observed",
        matchedPredictions: ["P-TEST-001"],
        violatedPredictions: [],
        confidence: "high",
        potencyCheckPassed: true,
      });

      const result = processTestExecution(input, test, predictions, hypotheses, {
        autoApply: true,
        triggeredBy: "LabTech",
      });

      // Verify execution recorded
      expect(result.recordResult.success).toBe(true);

      // Verify H-TEST-001 is killed (its prediction of "present" was violated by "absent" result)
      const h1Suggestion = result.suggestResult!.suggestions.find(
        (s) => s.hypothesisId === "H-TEST-001",
      );
      expect(h1Suggestion!.suggestedAction).toBe("kill");

      // Verify H-TEST-002 is validated (its prediction of "absent" matched the result)
      const h2Suggestion = result.suggestResult!.suggestions.find(
        (s) => s.hypothesisId === "H-TEST-002",
      );
      expect(h2Suggestion!.suggestedAction).toBe("validate");

      // Verify transitions applied
      const killApplied = result.applyResult!.applied.find(
        (a) => a.success && a.transition?.trigger === "refute",
      );
      expect(killApplied).toBeDefined();
    });
  });

  describe("Brenner workflow: hypothesis validated by test", () => {
    it("follows full workflow from execution to confirmation", () => {
      const test = createTestRecord();
      const predictions = [
        createTestPrediction({
          id: "P-TEST-001",
          hypothesisPredictions: [
            { hypothesisId: "H-TEST-001", prediction: "Effect present" },
            { hypothesisId: "H-TEST-002", prediction: "Effect absent" },
          ],
        }),
      ];
      const hypotheses = [
        createTestHypothesis({ id: "H-TEST-001", state: "active" }),
        createTestHypothesis({ id: "H-TEST-002", state: "active" }),
      ];

      // Execute test - result is "present" which matches H-TEST-001's prediction
      const input = createExecutionInput({
        result: "Effect observed - positive result present",
        matchedPredictions: ["P-TEST-001"],
        violatedPredictions: [],
        confidence: "high",
        potencyCheckPassed: true,
      });

      const result = processTestExecution(input, test, predictions, hypotheses, {
        autoApply: true,
      });

      // Verify H-TEST-001 is validated (its prediction matched)
      const h1Suggestion = result.suggestResult!.suggestions.find(
        (s) => s.hypothesisId === "H-TEST-001",
      );
      expect(h1Suggestion!.suggestedAction).toBe("validate");

      // Verify transition applied
      const confirmApplied = result.applyResult!.applied.find(
        (a) => a.success && a.transition?.trigger === "confirm",
      );
      expect(confirmApplied).toBeDefined();
    });
  });

  describe("conservative mode: kills only", () => {
    it("skips validations when killsOnly is set", () => {
      const test = createTestRecord();
      const predictions = [
        createTestPrediction({
          id: "P-TEST-001",
          hypothesisPredictions: [{ hypothesisId: "H-TEST-001", prediction: "Effect present" }],
        }),
      ];
      const hypotheses = [createTestHypothesis({ id: "H-TEST-001", state: "active" })];

      // Result matches H-TEST-001's prediction, but killsOnly will skip it
      const input = createExecutionInput({
        result: "Effect detected - present",
        matchedPredictions: ["P-TEST-001"],
        violatedPredictions: [],
      });

      const result = processTestExecution(input, test, predictions, hypotheses, {
        autoApply: true,
        killsOnly: true,
      });

      expect(result.applyResult!.applied).toHaveLength(0);
      expect(result.applyResult!.skipped).toContain("H-TEST-001");
    });
  });

  describe("failed potency check handling", () => {
    it("reduces confidence when potency check fails", () => {
      const test = createTestRecord();
      const predictions = [createTestPrediction()];
      const hypotheses = [
        createTestHypothesis({ id: "H-TEST-001", state: "active" }),
        createTestHypothesis({ id: "H-TEST-002", state: "active" }),
      ];

      const input = createExecutionInput({
        result: "Effect present",
        confidence: "high",
        potencyCheckPassed: false,
        matchedPredictions: ["P-TEST-001"],
        violatedPredictions: [],
      });

      const result = processTestExecution(input, test, predictions, hypotheses);

      expect(result.recordResult.warnings.some((w) => w.includes("Potency check failed"))).toBe(
        true,
      );

      // Confidence should be reduced
      const suggestion = result.suggestResult!.suggestions[0];
      expect(["low", "speculative"]).toContain(suggestion.confidence);
    });
  });
});
