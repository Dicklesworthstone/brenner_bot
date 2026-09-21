import { describe, expect, it } from "vitest";
import type { HypothesisCard } from "../hypothesis";
import { createHypothesisCard, generateHypothesisCardId } from "../hypothesis";
import {
  getCommonMistakes,
  getOperatorDocumentation,
  getStepTip,
  getSuccessCriteria,
} from "./docs";
import {
  buildExclusionTestResult,
  CATEGORY_DEFAULT_POWER,
  createCustomTest,
  EXCLUSION_TEST_STEP_IDS,
  EXCLUSION_TEST_STEPS,
  generateExclusionTests,
  generateProtocols,
  generateProtocolTemplate,
  getCategoryColor,
  getDiscriminativePowerLabel,
  getDiscriminativePowerStars,
  getFeasibilityColor,
} from "./exclusion-test";
import type { OperatorSession, OperatorStepConfig } from "./framework";
import {
  canGoBack,
  canProceedToNext,
  canSkipCurrent,
  createSession,
  createStepStates,
  deserializeSession,
  generateInsightId,
  generateSessionId,
  getCurrentStep,
  getCurrentStepConfig,
  getProgress,
  getSessionSummary,
  isOperatorType,
  OPERATOR_METADATA,
  serializeSession,
  sessionReducer,
} from "./framework";
import {
  buildLevelSplitResult,
  generateCombinationMatrix,
  generateSubHypothesis,
  generateXLevels,
  generateYLevels,
  LEVEL_SPLIT_STEP_IDS,
  LEVEL_SPLIT_STEPS,
  type LevelSplitResult,
} from "./level-split";
import {
  type AlternativeExplanation,
  buildObjectTransposeResult,
  generateAlternatives,
  generateDiscriminatingTests,
  generateThirdVariables,
  OBJECT_TRANSPOSE_STEP_IDS,
  OBJECT_TRANSPOSE_STEPS,
  type PlausibilityRating,
} from "./object-transpose";
import {
  approximateSampleSize,
  buildScaleCheckResult,
  classifyEffectSize,
  estimateToValue,
  generateContextComparison,
  generatePopulationConsiderations,
  getDomainContext,
  SCALE_CHECK_STEP_IDS,
  SCALE_CHECK_STEPS,
  varianceExplained,
} from "./scale-check";

function makeHypothesis(overrides: Partial<HypothesisCard> = {}): HypothesisCard {
  const sessionId = overrides.sessionId ?? "TEST-SESSION";

  return createHypothesisCard({
    id: overrides.id ?? generateHypothesisCardId(sessionId, 1),
    statement:
      overrides.statement ?? "Caffeine causes insomnia through adenosine receptor blockade",
    mechanism: overrides.mechanism ?? "Adenosine signaling disruption",
    domain: overrides.domain ?? ["psychology"],
    predictionsIfTrue: overrides.predictionsIfTrue ?? [
      "Higher caffeine intake predicts worse sleep quality",
    ],
    predictionsIfFalse: overrides.predictionsIfFalse ?? [
      "Sleep quality is unrelated to caffeine intake",
    ],
    impossibleIfTrue: overrides.impossibleIfTrue ?? [
      "Insomnia persists when caffeine is eliminated",
    ],
    confidence: overrides.confidence,
    sessionId,
    tags: overrides.tags,
    notes: overrides.notes,
  });
}

describe("operators/framework", () => {
  it("validates OperatorType values", () => {
    expect(isOperatorType("level_split")).toBe(true);
    expect(isOperatorType("exclusion_test")).toBe(true);
    expect(isOperatorType("object_transpose")).toBe(true);
    expect(isOperatorType("scale_check")).toBe(true);
    expect(isOperatorType("not-a-real-operator")).toBe(false);
    expect(isOperatorType(123)).toBe(false);
  });

  it("supports step gating + reducer transitions", () => {
    const hypothesis = makeHypothesis();

    const stepConfigs: OperatorStepConfig[] = [
      {
        id: "step-1",
        name: "Step 1",
        description: "First step",
        canSkip: true,
        isComplete: (session) => session.userSelections["done"] === true,
        validate: () => ({ valid: true, errors: [], warnings: [] }),
      },
      {
        id: "step-2",
        name: "Step 2",
        description: "Second step",
      },
    ];

    let session = createSession("level_split", hypothesis, stepConfigs, "BlueLake");
    expect(session.status).toBe("initializing");
    expect(OPERATOR_METADATA[session.operatorType].name).toBeTruthy();

    // Not complete → cannot proceed.
    expect(canProceedToNext(session).canProceed).toBe(false);

    // Mark step complete and proceed.
    session = sessionReducer(session, { type: "SET_SELECTION", key: "done", value: true });
    expect(canProceedToNext(session).canProceed).toBe(true);

    session = sessionReducer(session, { type: "NEXT_STEP" });
    expect(session.currentStepIndex).toBe(1);
    expect(session.steps[0]?.complete).toBe(true);
    expect(getProgress(session)).toBeGreaterThan(0);

    // Can't jump forward.
    session = sessionReducer(session, { type: "GO_TO_STEP", stepIndex: 10 });
    expect(session.currentStepIndex).toBe(1);

    // Can go back.
    session = sessionReducer(session, { type: "PREV_STEP" });
    expect(session.currentStepIndex).toBe(0);

    // Skip step moves forward when allowed.
    session = sessionReducer(session, { type: "SKIP_STEP" });
    expect(session.currentStepIndex).toBe(1);

    session = sessionReducer(session, { type: "CLEAR_SELECTION", key: "done" });
    expect("done" in session.userSelections).toBe(false);

    session = sessionReducer(session, {
      type: "ADD_INSIGHT",
      insight: { category: "discovery", title: "Test", content: "Insight", stepId: "step-1" },
    });
    expect(session.insights).toHaveLength(1);
    expect(session.insights[0]?.id).toMatch(/^INS-/);
  });

  it("covers framework utilities, validation failures, and terminal states", () => {
    expect(generateSessionId("level_split")).toMatch(/^OP-level_split-/);
    expect(generateInsightId()).toMatch(/^INS-/);

    const hypothesis = makeHypothesis();
    const configs: OperatorStepConfig[] = [
      {
        id: "a",
        name: "A",
        description: "A",
        validate: () => ({ valid: false, errors: ["bad"], warnings: ["warn"] }),
      },
      { id: "b", name: "B", description: "B", canSkip: true },
    ];

    const steps = createStepStates(configs);
    expect(steps[0]?.complete).toBe(false);
    expect(steps[0]?.config.id).toBe("a");

    let session = createSession("exclusion_test", hypothesis, configs);
    expect(getCurrentStep(session)?.config.id).toBe("a");
    expect(getCurrentStepConfig(session)?.id).toBe("a");
    expect(canProceedToNext(session).canProceed).toBe(false);
    expect(canProceedToNext(session).validation?.errors).toContain("bad");
    expect(canGoBack(session)).toBe(false);
    expect(canSkipCurrent(session)).toBe(false);

    session = sessionReducer(session, { type: "NEXT_STEP" });
    expect(session.currentStepIndex).toBe(1);
    expect(canGoBack(session)).toBe(true);
    expect(canSkipCurrent(session)).toBe(true);

    session = sessionReducer(session, { type: "SET_NOTES", notes: "hello" });
    expect(session.notes).toBe("hello");

    session = sessionReducer(session, { type: "COMPLETE" });
    expect(session.status).toBe("completed");

    const abandoned = sessionReducer(session, { type: "ABANDON" });
    expect(abandoned.status).toBe("abandoned");

    const summary = getSessionSummary({ ...session, steps: [], currentStepIndex: 0 });
    expect(summary.operatorName).toBe(OPERATOR_METADATA[session.operatorType].name);
    expect(summary.currentStep).toBe("Unknown");
    expect(summary.totalSteps).toBe(0);
  });

  it("serializes and deserializes sessions", () => {
    const hypothesis = makeHypothesis();
    const session = createSession("scale_check", hypothesis, []);

    const json = serializeSession(session);
    expect(typeof json).toBe("string");
    expect(deserializeSession(json)?.operatorType).toBe("scale_check");
    expect(deserializeSession("not-json")).toBeNull();
  });
});

describe("operators/docs", () => {
  it("returns operator documentation, tips, mistakes, and success criteria", () => {
    const docs = getOperatorDocumentation("level_split");
    expect(docs.type).toBe("level_split");
    expect(docs.explanation.length).toBeGreaterThan(0);

    const tip = getStepTip("level_split", "identify-x-levels");
    expect(tip?.headline).toBeTruthy();

    expect(getStepTip("level_split", "unknown-step")).toBeUndefined();
    expect(getCommonMistakes("scale_check").length).toBeGreaterThan(0);
    expect(getSuccessCriteria("exclusion_test").length).toBeGreaterThan(0);
  });

  it("falls back safely for invalid operator types", () => {
    expect(getStepTip("not-a-real-operator" as never, "identify-x-levels")).toBeUndefined();
    expect(getCommonMistakes("not-a-real-operator" as never)).toEqual([]);
    expect(getSuccessCriteria("not-a-real-operator" as never)).toEqual([]);
  });
});

describe("operators/level-split", () => {
  it("generates levels and sub-hypotheses from selections", () => {
    const hypothesis = makeHypothesis({ domain: ["psychology"] });
    const xLevels = generateXLevels(hypothesis);
    const yLevels = generateYLevels(hypothesis);

    expect(xLevels.length).toBeGreaterThan(0);
    expect(yLevels.length).toBeGreaterThan(0);

    const selectedX = xLevels.slice(0, 2).map((level) => ({ ...level, selected: true }));
    const selectedY = yLevels.slice(0, 2).map((level) => ({ ...level, selected: true }));

    const combos = generateCombinationMatrix(selectedX, selectedY);
    expect(combos).toHaveLength(4);

    const sub = generateSubHypothesis(hypothesis, combos[0]);
    expect(sub.id).toContain(combos[0].xLevel.id);
    expect(sub.statement).toContain("Specifically regarding");

    let session = createSession("level_split", hypothesis, LEVEL_SPLIT_STEPS);
    session = sessionReducer(session, {
      type: "SET_SELECTION",
      key: LEVEL_SPLIT_STEP_IDS.IDENTIFY_X,
      value: selectedX,
    });
    session = sessionReducer(session, {
      type: "SET_SELECTION",
      key: LEVEL_SPLIT_STEP_IDS.IDENTIFY_Y,
      value: selectedY,
    });
    session = sessionReducer(session, {
      type: "SET_SELECTION",
      key: LEVEL_SPLIT_STEP_IDS.REVIEW_MATRIX,
      value: combos.map((combo) => ({
        ...combo,
        selected: combo.xLevel.id === combos[0].xLevel.id,
      })),
    });
    session = sessionReducer(session, {
      type: "SET_CONTENT",
      key: LEVEL_SPLIT_STEP_IDS.GENERATE_SUB,
      value: [sub],
    });
    session = sessionReducer(session, {
      type: "SET_SELECTION",
      key: LEVEL_SPLIT_STEP_IDS.CHOOSE_FOCUS,
      value: sub.id,
    });

    const result = buildLevelSplitResult(session as OperatorSession<LevelSplitResult>);
    expect(result.xLevels).toHaveLength(2);
    expect(result.yLevels).toHaveLength(2);
    expect(result.selectedCombinations.length).toBeGreaterThan(0);
    expect(result.subHypotheses).toHaveLength(1);
    expect(result.focusedHypothesisId).toBe(sub.id);
  });

  it("adds implementation levels for tech domains (and omits population)", () => {
    const hypothesis = makeHypothesis({ domain: ["technology"] });
    const xLevels = generateXLevels(hypothesis);
    const yLevels = generateYLevels(hypothesis);

    expect(xLevels.some((l) => l.category === "implementation")).toBe(true);
    expect(xLevels.some((l) => l.category === "population")).toBe(false);
    expect(yLevels.some((l) => l.category === "population")).toBe(false);
  });

  it("builds empty result when session has no selections", () => {
    const session = {
      userSelections: {},
      generatedContent: {},
    } as unknown as Parameters<typeof buildLevelSplitResult>[0];

    const result = buildLevelSplitResult(session);
    expect(result.xLevels).toEqual([]);
    expect(result.yLevels).toEqual([]);
    expect(result.selectedCombinations).toEqual([]);
    expect(result.subHypotheses).toEqual([]);
    expect(result.focusedHypothesisId).toBeNull();
  });

  it("validates matrix step when no combinations are selected", () => {
    const hypothesis = makeHypothesis();
    const session = createSession("level_split", hypothesis, LEVEL_SPLIT_STEPS);

    const matrixStep = session.steps[2]?.config;
    const validation = matrixStep?.validate?.(session);

    expect(validation?.valid).toBe(false);
    expect(validation?.errors).toContain("Select at least one X-Y combination");
  });

  it("tracks completion for generated sub-hypotheses and chosen focus", () => {
    const hypothesis = makeHypothesis();
    let session = createSession("level_split", hypothesis, LEVEL_SPLIT_STEPS);

    const generateSubsStep = session.steps[3]?.config;
    const focusStep = session.steps[4]?.config;

    expect(generateSubsStep?.isComplete?.(session)).toBe(false);
    expect(focusStep?.isComplete?.(session)).toBe(false);

    session = sessionReducer(session, {
      type: "SET_CONTENT",
      key: LEVEL_SPLIT_STEP_IDS.GENERATE_SUB,
      value: [{ id: "sub-1", statement: "Sub hypothesis statement", xLevelId: "x", yLevelId: "y" }],
    });
    expect(generateSubsStep?.isComplete?.(session)).toBe(true);

    session = sessionReducer(session, {
      type: "SET_SELECTION",
      key: LEVEL_SPLIT_STEP_IDS.CHOOSE_FOCUS,
      value: "sub-1",
    });
    expect(focusStep?.isComplete?.(session)).toBe(true);
  });

  it("validates step completion for level-split steps", () => {
    const hypothesis = makeHypothesis();
    let session = createSession("level_split", hypothesis, LEVEL_SPLIT_STEPS);

    // X levels not selected - validation should fail
    const xStep = session.steps[0]?.config;
    expect(xStep?.validate?.(session).valid).toBe(false);
    expect(xStep?.validate?.(session).errors).toContain("Select at least one level for X");

    // Add X levels
    const xLevels = generateXLevels(hypothesis);
    session = sessionReducer(session, {
      type: "SET_SELECTION",
      key: LEVEL_SPLIT_STEP_IDS.IDENTIFY_X,
      value: xLevels.slice(0, 1).map((l) => ({ ...l, selected: true })),
    });
    expect(xStep?.validate?.(session).valid).toBe(true);

    // Y levels not selected - validation should fail
    const yStep = session.steps[1]?.config;
    expect(yStep?.validate?.(session).valid).toBe(false);

    // Add Y levels
    const yLevels = generateYLevels(hypothesis);
    session = sessionReducer(session, {
      type: "SET_SELECTION",
      key: LEVEL_SPLIT_STEP_IDS.IDENTIFY_Y,
      value: yLevels.slice(0, 1).map((l) => ({ ...l, selected: true })),
    });
    expect(yStep?.validate?.(session).valid).toBe(true);
  });

  it("warns when too many combinations selected", () => {
    const hypothesis = makeHypothesis();
    const xLevels = generateXLevels(hypothesis);
    const yLevels = generateYLevels(hypothesis);

    const selectedX = xLevels.slice(0, 3).map((level) => ({ ...level, selected: true }));
    const selectedY = yLevels.slice(0, 3).map((level) => ({ ...level, selected: true }));
    const combos = generateCombinationMatrix(selectedX, selectedY);

    let session = createSession("level_split", hypothesis, LEVEL_SPLIT_STEPS);
    session = sessionReducer(session, {
      type: "SET_SELECTION",
      key: LEVEL_SPLIT_STEP_IDS.REVIEW_MATRIX,
      value: combos.map((c) => ({ ...c, selected: true })), // All 9 selected
    });

    const matrixStep = session.steps[2]?.config;
    const validation = matrixStep?.validate?.(session);
    expect(validation?.warnings.some((w) => w.includes("fewer combinations"))).toBe(true);
  });

  it("validates choose focus step", () => {
    const hypothesis = makeHypothesis();
    let session = createSession("level_split", hypothesis, LEVEL_SPLIT_STEPS);

    const focusStep = session.steps[4]?.config;
    expect(focusStep?.validate?.(session).valid).toBe(false);
    expect(focusStep?.validate?.(session).errors).toContain("Choose a sub-hypothesis to focus on");

    session = sessionReducer(session, {
      type: "SET_SELECTION",
      key: LEVEL_SPLIT_STEP_IDS.CHOOSE_FOCUS,
      value: "sub-hyp-1",
    });
    expect(focusStep?.validate?.(session).valid).toBe(true);
  });
});

describe("operators/exclusion-test", () => {
  it("generates tests + protocols and builds result", () => {
    const hypothesis = makeHypothesis();
    const tests = generateExclusionTests(hypothesis);
    expect(tests.length).toBeGreaterThan(0);
    expect(tests[0].discriminativePower).toBeGreaterThanOrEqual(
      tests.at(-1)?.discriminativePower ?? 0,
    );

    const custom = createCustomTest("Custom", "Desc", "Falsify", "Support", 5, "high");
    expect(custom.category).toBe("custom");
    expect(custom.isCustom).toBe(true);

    const protocols = [
      generateProtocolTemplate({ ...custom, feasibility: "high" }),
      generateProtocolTemplate({ ...custom, feasibility: "medium" }),
      generateProtocolTemplate({ ...custom, feasibility: "low" }),
    ];
    expect(protocols[0].estimatedEffort).toBe("days");
    expect(protocols[1].estimatedEffort).toBe("weeks");
    expect(protocols[2].estimatedEffort).toBe("months");

    const selected = tests.slice(0, 2).map((t, idx) => ({ ...t, selected: idx === 0 }));
    const generatedProtocols = generateProtocols(selected);
    expect(generatedProtocols).toHaveLength(1);

    const session = {
      generatedContent: {
        [EXCLUSION_TEST_STEP_IDS.GENERATE_TESTS]: tests,
        [EXCLUSION_TEST_STEP_IDS.GENERATE_PROTOCOLS]: generatedProtocols,
      },
      userSelections: {
        [EXCLUSION_TEST_STEP_IDS.SELECT_TESTS]: selected,
      },
    } as unknown as Parameters<typeof buildExclusionTestResult>[0];

    const result = buildExclusionTestResult(session);
    expect(result.generatedTests).toHaveLength(tests.length);
    expect(result.testsForSession).toHaveLength(1);
    expect(result.selectedTestIds).toEqual([selected[0].id]);

    expect(getDiscriminativePowerStars(3)).toBe("★★★☆☆");
    expect(getDiscriminativePowerLabel(5)).toBe("Decisive");
    expect(getFeasibilityColor("high")).toContain("green");
    expect(getCategoryColor("natural_experiment")).toContain("green");
    expect(getCategoryColor("dose_response")).toContain("yellow");
    expect(getCategoryColor("specificity")).toContain("gray");
    expect(CATEGORY_DEFAULT_POWER.custom).toBe(3);
  });

  it("covers all discriminative power levels", () => {
    expect(getDiscriminativePowerLabel(1)).toBe("Minimal");
    expect(getDiscriminativePowerLabel(2)).toBe("Weak");
    expect(getDiscriminativePowerLabel(3)).toBe("Moderate");
    expect(getDiscriminativePowerLabel(4)).toBe("Strong");
    expect(getDiscriminativePowerLabel(5)).toBe("Decisive");

    expect(getDiscriminativePowerStars(1)).toBe("★☆☆☆☆");
    expect(getDiscriminativePowerStars(2)).toBe("★★☆☆☆");
    expect(getDiscriminativePowerStars(4)).toBe("★★★★☆");
    expect(getDiscriminativePowerStars(5)).toBe("★★★★★");
  });

  it("covers all feasibility colors", () => {
    expect(getFeasibilityColor("high")).toContain("green");
    expect(getFeasibilityColor("medium")).toContain("yellow");
    expect(getFeasibilityColor("low")).toContain("red");
  });

  it("covers all category colors", () => {
    expect(getCategoryColor("natural_experiment")).toBeTruthy();
    expect(getCategoryColor("cross_context")).toBeTruthy();
    expect(getCategoryColor("mechanism_block")).toBeTruthy();
    expect(getCategoryColor("dose_response")).toBeTruthy();
    expect(getCategoryColor("temporal_sequence")).toBeTruthy();
    expect(getCategoryColor("specificity")).toBeTruthy();
    expect(getCategoryColor("coherence")).toBeTruthy();
    expect(getCategoryColor("custom")).toBeTruthy();
  });

  it("builds result with empty session", () => {
    const emptySession = {
      generatedContent: {},
      userSelections: {},
    } as unknown as Parameters<typeof buildExclusionTestResult>[0];

    const result = buildExclusionTestResult(emptySession);
    expect(result.generatedTests).toEqual([]);
    expect(result.selectedTestIds).toEqual([]);
    expect(result.testsForSession).toEqual([]);
    expect(result.protocols).toEqual([]);
  });

  it("generates protocols only for selected tests", () => {
    const hypothesis = makeHypothesis();
    const tests = generateExclusionTests(hypothesis);

    // None selected
    const noneSelected = tests.map((t) => ({ ...t, selected: false }));
    expect(generateProtocols(noneSelected)).toHaveLength(0);

    // Multiple selected
    const multiSelected = tests.slice(0, 3).map((t) => ({ ...t, selected: true }));
    const protocols = generateProtocols(multiSelected);
    expect(protocols).toHaveLength(3);
  });

  it("exercises step gating and validation branches", () => {
    const hypothesis = makeHypothesis({
      statement: "Caffeine causes insomnia",
      mechanism: "Adenosine receptor antagonism disrupts sleep drive",
    });

    let session = createSession("exclusion_test", hypothesis, EXCLUSION_TEST_STEPS);

    // Informational step is always complete.
    expect(session.steps[0]?.config.isComplete?.(session)).toBe(true);

    // Tests not generated yet.
    expect(session.steps[1]?.config.isComplete?.(session)).toBe(false);

    const generatedTests = generateExclusionTests(hypothesis);
    session = sessionReducer(session, {
      type: "SET_CONTENT",
      key: EXCLUSION_TEST_STEP_IDS.GENERATE_TESTS,
      value: generatedTests,
    });
    expect(session.steps[1]?.config.isComplete?.(session)).toBe(true);

    // No selection -> invalid.
    const selectStep = session.steps[2]?.config;
    expect(selectStep?.validate?.(session).valid).toBe(false);

    // Select many tests -> warning branch.
    const manySelected = generatedTests.slice(0, 6).map((t) => ({ ...t, selected: true }));
    session = sessionReducer(session, {
      type: "SET_SELECTION",
      key: EXCLUSION_TEST_STEP_IDS.SELECT_TESTS,
      value: manySelected,
    });
    const selectionValidation = selectStep?.validate?.(session);
    expect(selectionValidation?.valid).toBe(true);
    expect(selectionValidation?.warnings.length).toBeGreaterThan(0);

    // Protocols step completion toggles via generated content.
    const protocolStep = session.steps[3]?.config;
    expect(protocolStep?.isComplete?.(session)).toBe(false);

    const protocols = generateProtocols(manySelected);
    session = sessionReducer(session, {
      type: "SET_CONTENT",
      key: EXCLUSION_TEST_STEP_IDS.GENERATE_PROTOCOLS,
      value: protocols,
    });
    expect(protocolStep?.isComplete?.(session)).toBe(true);

    // Recording requires explicit confirmation.
    const recordStep = session.steps[4]?.config;
    expect(recordStep?.validate?.(session).valid).toBe(false);
    session = sessionReducer(session, {
      type: "SET_SELECTION",
      key: EXCLUSION_TEST_STEP_IDS.RECORD_TESTS,
      value: true,
    });
    expect(recordStep?.validate?.(session).valid).toBe(true);
  });

  it("extracts hypothesis terms with and without causal phrasing", () => {
    const hypothesis = makeHypothesis({
      statement: "Caffeine causes insomnia",
      mechanism: "Adenosine blockade",
    });
    const tests1 = generateExclusionTests(hypothesis);
    expect(tests1.some((t) => t.name.includes("Caffeine"))).toBe(true);

    const fallback = { ...hypothesis, statement: "Caffeine and insomnia are correlated" };
    const tests2 = generateExclusionTests(fallback);
    expect(tests2.some((t) => t.name.includes("Caffeine"))).toBe(true);

    const missingMechanism = { ...hypothesis, mechanism: "" } as HypothesisCard;
    const tests3 = generateExclusionTests(missingMechanism);
    expect(JSON.stringify(tests3)).toContain("the proposed mechanism");
  });
});

describe("operators/object-transpose", () => {
  it("generates alternatives, tests, and result projections", () => {
    const hypothesis = makeHypothesis();
    const alternatives = generateAlternatives(hypothesis);
    expect(alternatives.length).toBeGreaterThan(0);

    const ratings = alternatives.slice(0, 2).map((alt, idx) => ({
      alternativeId: alt.id,
      plausibility: idx === 0 ? 4 : 2,
      evidenceDiscrimination: (idx === 0 ? "poor" : "good") as "poor" | "moderate" | "good",
      notes: "",
    }));

    const tests = generateDiscriminatingTests(alternatives, ratings);
    expect(tests.length).toBeGreaterThan(0);
    expect(tests.every((t) => t.alternativeId)).toBe(true);

    const session = {
      generatedContent: {
        [OBJECT_TRANSPOSE_STEP_IDS.GENERATE_ALTERNATIVES]: alternatives,
        [OBJECT_TRANSPOSE_STEP_IDS.IDENTIFY_TESTS]: tests.map((t, idx) => ({
          ...t,
          priority: idx === 0 ? 1 : undefined,
          feasibility: idx === 0 ? "easy" : t.feasibility,
        })),
      },
      userSelections: {
        [OBJECT_TRANSPOSE_STEP_IDS.RATE_PLAUSIBILITY]: ratings,
      },
    } as unknown as Parameters<typeof buildObjectTransposeResult>[0];

    const result = buildObjectTransposeResult(session);
    expect(result.highPriorityAlternativeIds).toEqual([ratings[0].alternativeId]);
    expect(result.selectedTestIds.length).toBeGreaterThan(0);
  });

  it("builds result with empty session", () => {
    const emptySession = {
      generatedContent: {},
      userSelections: {},
    } as unknown as Parameters<typeof buildObjectTransposeResult>[0];

    const result = buildObjectTransposeResult(emptySession);
    expect(result.alternatives).toEqual([]);
    expect(result.discriminatingTests).toEqual([]);
    expect(result.highPriorityAlternativeIds).toEqual([]);
    expect(result.selectedTestIds).toEqual([]);
  });

  it("generates alternatives with various types", () => {
    const hypothesis = makeHypothesis({
      statement: "Social media causes depression through comparison",
      mechanism: "Upward social comparison leads to reduced self-esteem",
    });

    const alternatives = generateAlternatives(hypothesis);

    // Should include different types: reverse_cause, third_variable, etc.
    const types = new Set(alternatives.map((a) => a.type));
    expect(types.size).toBeGreaterThan(1);
  });

  it("generates domain-specific third-variable alternatives", () => {
    const hypothesis = makeHypothesis({ domain: ["psychology", "social", "health", "technology"] });
    const thirdVars = generateThirdVariables(hypothesis);

    expect(thirdVars.length).toBeGreaterThan(0);
    expect(thirdVars.length).toBeLessThanOrEqual(4);
    expect(thirdVars.every((alt) => alt.type === "third_variable")).toBe(true);
  });

  it("validates plausibility step and warns when some alternatives are unrated", () => {
    const hypothesis = makeHypothesis();
    const session = createSession("object_transpose", hypothesis, OBJECT_TRANSPOSE_STEPS);

    const rateStep = session.steps[2]?.config;
    expect(rateStep?.validate?.(session).valid).toBe(false);

    const alternatives = generateAlternatives(hypothesis);
    const ratings = [
      {
        alternativeId: alternatives[0]?.id,
        plausibility: 3,
        evidenceDiscrimination: "poor",
        notes: "",
      },
    ];

    const partiallyRated = {
      ...session,
      generatedContent: {
        [OBJECT_TRANSPOSE_STEP_IDS.GENERATE_ALTERNATIVES]: alternatives.slice(0, 2),
      },
      userSelections: {
        [OBJECT_TRANSPOSE_STEP_IDS.RATE_PLAUSIBILITY]: ratings,
      },
    } as unknown as typeof session;

    const validation = rateStep?.validate?.(partiallyRated);
    expect(validation?.valid).toBe(true);
    expect(validation?.warnings.length).toBeGreaterThan(0);
  });

  it("generates discriminating tests for rated alternatives", () => {
    const hypothesis = makeHypothesis();
    const alternatives = generateAlternatives(hypothesis);

    // Test with all alternatives rated
    const allRatings = alternatives.map((alt, idx) => ({
      alternativeId: alt.id,
      plausibility: 3,
      evidenceDiscrimination: (idx % 2 === 0 ? "good" : "poor") as "poor" | "moderate" | "good",
      notes: "",
    }));

    const tests = generateDiscriminatingTests(alternatives, allRatings);
    expect(tests.length).toBeGreaterThan(0);

    // Each test should target an alternative
    for (const test of tests) {
      expect(test.alternativeId).toBeTruthy();
      expect(test.description).toBeTruthy();
    }
  });

  it("handles empty alternatives for discriminating tests", () => {
    const tests = generateDiscriminatingTests([], []);
    expect(tests).toEqual([]);
  });

  it("skips alternatives with no discriminating test template", () => {
    const alternatives: AlternativeExplanation[] = [
      { id: "alt-other", type: "other", name: "Other", description: "Other", implications: [] },
    ];
    const ratings: PlausibilityRating[] = [
      { alternativeId: "alt-other", plausibility: 4, evidenceDiscrimination: "poor", notes: "" },
    ];

    const tests = generateDiscriminatingTests(alternatives, ratings);
    expect(tests).toEqual([]);
  });
});

describe("operators/scale-check", () => {
  it("computes basic scale utilities and builds result defaults", () => {
    expect(estimateToValue("small", "r")).toBeGreaterThan(0);
    expect(classifyEffectSize(0.1, "r")).toBe("small");
    expect(varianceExplained(0.5)).toBeCloseTo(25, 5);

    const hypothesis = makeHypothesis({ domain: ["technology"] });
    const context = getDomainContext(hypothesis);
    expect(context.domain).toContain("Tech");

    const comparison = generateContextComparison(
      { type: "r", value: 0.95, direction: "increase" },
      context,
    );
    expect(comparison.relativeToNorm).toBe("exceptional");
    expect(comparison.warnings.length).toBeGreaterThan(0);

    const population = generatePopulationConsiderations();
    expect(population.every((c) => c.addressed === false)).toBe(true);

    const session = {
      generatedContent: {
        [SCALE_CHECK_STEP_IDS.CONTEXTUALIZE]: comparison,
      },
      userSelections: {
        [SCALE_CHECK_STEP_IDS.QUANTIFY]: {
          type: "estimate",
          estimate: "medium",
          direction: "change",
        },
        [SCALE_CHECK_STEP_IDS.PRECISION]: {
          isDetectable: false,
          powerNotes: "low power",
          warnings: [],
        },
        [SCALE_CHECK_STEP_IDS.PRACTICAL]: {
          isPracticallyMeaningful: true,
          stakeholders: ["users"],
          reasoning: "ok",
        },
        [SCALE_CHECK_STEP_IDS.POPULATION]: population,
      },
      notes: "summary",
    } as unknown as Parameters<typeof buildScaleCheckResult>[0];

    const result = buildScaleCheckResult(session);
    expect(result.overallPlausibility).toBe("implausible");
    expect(result.summaryNotes).toBe("summary");
  });

  it("approximates sample sizes for different power levels", () => {
    expect(approximateSampleSize(0)).toBe(Infinity);
    expect(approximateSampleSize(0.3)).toBeGreaterThan(0);
    expect(approximateSampleSize(0.3, 0.9)).toBeGreaterThan(approximateSampleSize(0.3, 0.8));
  });

  it("classifies effect sizes for all effect types (r, d, OR, RR, percentage)", () => {
    // Test r (correlation) - uses absolute value
    expect(classifyEffectSize(0.05, "r")).toBe("negligible");
    expect(classifyEffectSize(-0.15, "r")).toBe("small");
    expect(classifyEffectSize(0.35, "r")).toBe("medium");
    expect(classifyEffectSize(-0.55, "r")).toBe("large");
    expect(classifyEffectSize(0.75, "r")).toBe("very_large");

    // Test d (Cohen's d) - uses absolute value
    expect(classifyEffectSize(0.05, "d")).toBe("negligible");
    expect(classifyEffectSize(-0.25, "d")).toBe("small");
    expect(classifyEffectSize(0.55, "d")).toBe("medium");
    expect(classifyEffectSize(-0.85, "d")).toBe("large");
    expect(classifyEffectSize(1.5, "d")).toBe("very_large");

    // Test OR (Odds Ratio) - distance from 1
    expect(classifyEffectSize(1.1, "OR")).toBe("negligible");
    expect(classifyEffectSize(1.6, "OR")).toBe("small");
    expect(classifyEffectSize(2.5, "OR")).toBe("medium");
    expect(classifyEffectSize(4.0, "OR")).toBe("large");
    expect(classifyEffectSize(6.0, "OR")).toBe("very_large");
    // Test OR with value < 1
    expect(classifyEffectSize(0.5, "OR")).toBe("medium");
    expect(classifyEffectSize(0.2, "OR")).toBe("very_large");

    // Test RR (Risk Ratio)
    expect(classifyEffectSize(1.05, "RR")).toBe("negligible");
    expect(classifyEffectSize(1.3, "RR")).toBe("small");
    expect(classifyEffectSize(1.7, "RR")).toBe("medium");
    expect(classifyEffectSize(2.5, "RR")).toBe("large");
    expect(classifyEffectSize(4.0, "RR")).toBe("very_large");

    // Test percentage
    expect(classifyEffectSize(0.5, "percentage")).toBe("negligible");
    expect(classifyEffectSize(8, "percentage")).toBe("small");
    expect(classifyEffectSize(20, "percentage")).toBe("medium");
    expect(classifyEffectSize(40, "percentage")).toBe("large");
    expect(classifyEffectSize(60, "percentage")).toBe("very_large");
  });

  it("generates context comparison with estimate instead of value", () => {
    const context = getDomainContext(makeHypothesis({ domain: ["psychology"] }));

    // Test with estimate only
    const comparison = generateContextComparison(
      { type: "d", estimate: "large", direction: "increase" },
      context,
    );
    expect(comparison.relativeToNorm).toBe("above_typical");
  });

  it("generates context comparison with no value specified", () => {
    const context = getDomainContext(makeHypothesis({ domain: ["psychology"] }));

    // Test with neither value nor estimate
    const comparison = generateContextComparison({ type: "r", direction: "increase" }, context);
    expect(comparison.warnings).toContain("Effect size not fully specified");
  });

  it("generates variance explained insight for r type", () => {
    const context = getDomainContext(makeHypothesis({ domain: ["psychology"] }));

    const comparison = generateContextComparison(
      { type: "r", value: 0.3, direction: "increase" },
      context,
    );
    expect(comparison.varianceExplained).toBeCloseTo(9, 1);
    expect(comparison.insights.some((i) => i.includes("variance"))).toBe(true);
  });

  it("triggers domain warning threshold for d type", () => {
    const context = getDomainContext(makeHypothesis({ domain: ["psychology"] }));

    const comparison = generateContextComparison(
      { type: "d", value: 1.0, direction: "increase" },
      context,
    );
    expect(comparison.warnings.some((w) => w.includes("exceeds typical maximum"))).toBe(true);
  });

  it("marks small effects as below typical and skips domain threshold for OR/RR types", () => {
    const psych = getDomainContext(makeHypothesis({ domain: ["psychology"] }));
    const below = generateContextComparison(
      { type: "r", value: 0.05, direction: "increase" },
      psych,
    );
    expect(below.relativeToNorm).toBe("below_typical");
    expect(below.benchmarksWithComparisons.some((b) => b.comparison === "smaller")).toBe(true);

    const med = getDomainContext(makeHypothesis({ domain: ["medicine"] }));
    const orResult = generateContextComparison(
      { type: "OR", value: 0.9, direction: "change" },
      med,
    );
    expect(orResult.relativeToNorm).toBe("below_typical");
    expect(orResult.warnings.some((w) => w.includes("exceeds typical maximum"))).toBe(false);
  });

  it("gets domain context for different domains", () => {
    expect(getDomainContext(makeHypothesis({ domain: ["medicine"] })).domain).toBe("Medicine");
    expect(getDomainContext(makeHypothesis({ domain: ["education"] })).domain).toBe("Education");
    expect(getDomainContext(makeHypothesis({ domain: ["social_science"] })).domain).toBe(
      "Social Science",
    );
    expect(getDomainContext(makeHypothesis({ domain: ["unknown_domain"] })).domain).toBe("General");
  });

  it("builds scale check result with different plausibility outcomes", () => {
    // Test needs_more_info when isDetectable is null
    const sessionNeedsInfo = {
      generatedContent: {},
      userSelections: {
        [SCALE_CHECK_STEP_IDS.QUANTIFY]: {
          type: "estimate",
          estimate: "medium",
          direction: "change",
        },
        [SCALE_CHECK_STEP_IDS.PRECISION]: {
          isDetectable: null,
          powerNotes: "pending",
          warnings: [],
        },
        [SCALE_CHECK_STEP_IDS.PRACTICAL]: {
          isPracticallyMeaningful: null,
          stakeholders: [],
          reasoning: "tbd",
        },
        [SCALE_CHECK_STEP_IDS.POPULATION]: [],
      },
      notes: "",
    } as unknown as Parameters<typeof buildScaleCheckResult>[0];

    const resultNeedsInfo = buildScaleCheckResult(sessionNeedsInfo);
    expect(resultNeedsInfo.overallPlausibility).toBe("needs_more_info");

    // Test questionable when has warnings
    const sessionQuestionable = {
      generatedContent: {
        [SCALE_CHECK_STEP_IDS.CONTEXTUALIZE]: {
          relativeToNorm: "typical",
          benchmarksWithComparisons: [],
          warnings: ["Some warning"],
          insights: [],
        },
      },
      userSelections: {
        [SCALE_CHECK_STEP_IDS.QUANTIFY]: {
          type: "estimate",
          estimate: "medium",
          direction: "change",
        },
        [SCALE_CHECK_STEP_IDS.PRECISION]: { isDetectable: true, powerNotes: "ok", warnings: [] },
        [SCALE_CHECK_STEP_IDS.PRACTICAL]: {
          isPracticallyMeaningful: true,
          stakeholders: ["users"],
          reasoning: "ok",
        },
        [SCALE_CHECK_STEP_IDS.POPULATION]: [],
      },
      notes: "",
    } as unknown as Parameters<typeof buildScaleCheckResult>[0];

    const resultQuestionable = buildScaleCheckResult(sessionQuestionable);
    expect(resultQuestionable.overallPlausibility).toBe("questionable");

    // Test plausible when all clear
    const sessionPlausible = {
      generatedContent: {
        [SCALE_CHECK_STEP_IDS.CONTEXTUALIZE]: {
          relativeToNorm: "typical",
          benchmarksWithComparisons: [],
          warnings: [],
          insights: [],
        },
      },
      userSelections: {
        [SCALE_CHECK_STEP_IDS.QUANTIFY]: {
          type: "estimate",
          estimate: "medium",
          direction: "change",
        },
        [SCALE_CHECK_STEP_IDS.PRECISION]: {
          isDetectable: true,
          powerNotes: "adequate",
          warnings: [],
        },
        [SCALE_CHECK_STEP_IDS.PRACTICAL]: {
          isPracticallyMeaningful: true,
          stakeholders: ["users"],
          reasoning: "clear",
        },
        [SCALE_CHECK_STEP_IDS.POPULATION]: [],
      },
      notes: "",
    } as unknown as Parameters<typeof buildScaleCheckResult>[0];

    const resultPlausible = buildScaleCheckResult(sessionPlausible);
    expect(resultPlausible.overallPlausibility).toBe("plausible");
  });

  it("builds result with empty session", () => {
    const emptySession = {
      generatedContent: {},
      userSelections: {},
      notes: undefined,
    } as unknown as Parameters<typeof buildScaleCheckResult>[0];

    const result = buildScaleCheckResult(emptySession);
    expect(result.effectSize.type).toBe("estimate");
    expect(result.summaryNotes).toBe("");
  });

  it("covers step completion + validation for quantify and population steps", () => {
    const hypothesis = makeHypothesis();
    let session = createSession("scale_check", hypothesis, SCALE_CHECK_STEPS);

    const quantifyStep = session.steps[0]?.config;
    expect(quantifyStep?.validate?.(session).valid).toBe(false);
    expect(quantifyStep?.isComplete?.(session)).toBe(false);

    session = sessionReducer(session, {
      type: "SET_SELECTION",
      key: SCALE_CHECK_STEP_IDS.QUANTIFY,
      value: { type: "r", value: 0.15, direction: "increase" },
    });
    expect(quantifyStep?.validate?.(session).valid).toBe(true);
    expect(quantifyStep?.isComplete?.(session)).toBe(true);

    const contextStep = session.steps[1]?.config;
    expect(contextStep?.isComplete?.(session)).toBe(false);
    session = sessionReducer(session, {
      type: "SET_CONTENT",
      key: SCALE_CHECK_STEP_IDS.CONTEXTUALIZE,
      value: generateContextComparison(
        { type: "r", value: 0.05, direction: "increase" },
        getDomainContext(hypothesis),
      ),
    });
    expect(contextStep?.isComplete?.(session)).toBe(true);

    const precisionStep = session.steps[2]?.config;
    expect(precisionStep?.isComplete?.(session)).toBe(false);
    session = sessionReducer(session, {
      type: "SET_SELECTION",
      key: SCALE_CHECK_STEP_IDS.PRECISION,
      value: { isDetectable: true, powerNotes: "ok", warnings: [] },
    });
    expect(precisionStep?.isComplete?.(session)).toBe(true);

    const practicalStep = session.steps[3]?.config;
    expect(practicalStep?.isComplete?.(session)).toBe(false);
    session = sessionReducer(session, {
      type: "SET_SELECTION",
      key: SCALE_CHECK_STEP_IDS.PRACTICAL,
      value: { isPracticallyMeaningful: true, stakeholders: ["users"], reasoning: "matters" },
    });
    expect(practicalStep?.isComplete?.(session)).toBe(true);

    const populationStep = session.steps[4]?.config;
    expect(populationStep?.validate?.(session).valid).toBe(false);

    const considerations = generatePopulationConsiderations();
    considerations[0] = { ...considerations[0], addressed: true, notes: "Checked" };
    session = sessionReducer(session, {
      type: "SET_SELECTION",
      key: SCALE_CHECK_STEP_IDS.POPULATION,
      value: considerations,
    });
    expect(populationStep?.validate?.(session).valid).toBe(true);
    expect(populationStep?.isComplete?.(session)).toBe(true);
  });
});
