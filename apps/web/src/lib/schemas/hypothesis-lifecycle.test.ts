import { beforeEach, describe, expect, it } from "vitest";
import type { Hypothesis } from "./hypothesis";
import {
  activateHypothesis,
  confirmHypothesis,
  deferHypothesis,
  getTargetState,
  getValidTriggers,
  isTerminalState,
  isValidTransition,
  reactivateHypothesis,
  refuteHypothesis,
  type StateTransition,
  StateTransitionSchema,
  supersedeHypothesis,
  TransitionErrorCode,
  TransitionHistoryStore,
  TransitionTriggerSchema,
  transitionHypothesis,
  VALID_TRANSITIONS,
  validateTransitionRequirements,
} from "./hypothesis-lifecycle";

// ============================================================================
// Test Fixtures
// ============================================================================

const createTestHypothesis = (overrides: Partial<Hypothesis> = {}): Hypothesis => ({
  id: "H-TEST-001",
  statement: "Test hypothesis for lifecycle validation.",
  origin: "proposed",
  category: "mechanistic",
  confidence: "medium",
  sessionId: "TEST",
  state: "proposed",
  isInference: false,
  unresolvedCritiqueCount: 0,
  createdAt: "2025-12-30T19:00:00Z",
  updatedAt: "2025-12-30T19:00:00Z",
  ...overrides,
});

// ============================================================================
// Schema Tests
// ============================================================================

describe("TransitionTriggerSchema", () => {
  it("validates all trigger types", () => {
    const triggers = ["activate", "refute", "confirm", "supersede", "defer", "reactivate"];
    for (const trigger of triggers) {
      expect(TransitionTriggerSchema.safeParse(trigger).success).toBe(true);
    }
  });

  it("rejects invalid triggers", () => {
    expect(TransitionTriggerSchema.safeParse("invalid").success).toBe(false);
    expect(TransitionTriggerSchema.safeParse("kill").success).toBe(false);
    expect(TransitionTriggerSchema.safeParse("").success).toBe(false);
  });
});

describe("StateTransitionSchema", () => {
  it("validates a complete transition record", () => {
    const transition: StateTransition = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      hypothesisId: "H-TEST-001",
      fromState: "proposed",
      toState: "active",
      trigger: "activate",
      triggeredBy: "GreenCastle",
      reason: "Starting investigation",
      timestamp: "2025-12-30T20:00:00Z",
      sessionId: "TEST",
    };
    const result = StateTransitionSchema.safeParse(transition);
    expect(result.success).toBe(true);
  });

  it("validates minimal transition record", () => {
    const transition = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      hypothesisId: "H-TEST-001",
      fromState: "proposed",
      toState: "active",
      trigger: "activate",
      timestamp: "2025-12-30T20:00:00Z",
    };
    const result = StateTransitionSchema.safeParse(transition);
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID", () => {
    const transition = {
      id: "not-a-uuid",
      hypothesisId: "H-TEST-001",
      fromState: "proposed",
      toState: "active",
      trigger: "activate",
      timestamp: "2025-12-30T20:00:00Z",
    };
    const result = StateTransitionSchema.safeParse(transition);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Valid Transitions Tests
// ============================================================================

describe("VALID_TRANSITIONS", () => {
  describe("from proposed", () => {
    it("can activate to active", () => {
      expect(VALID_TRANSITIONS.proposed.activate).toBe("active");
    });

    it("can defer to deferred", () => {
      expect(VALID_TRANSITIONS.proposed.defer).toBe("deferred");
    });

    it("cannot directly refute", () => {
      expect(VALID_TRANSITIONS.proposed.refute).toBeUndefined();
    });
  });

  describe("from active", () => {
    it("can refute to refuted", () => {
      expect(VALID_TRANSITIONS.active.refute).toBe("refuted");
    });

    it("can confirm to confirmed", () => {
      expect(VALID_TRANSITIONS.active.confirm).toBe("confirmed");
    });

    it("can supersede to superseded", () => {
      expect(VALID_TRANSITIONS.active.supersede).toBe("superseded");
    });

    it("can defer to deferred", () => {
      expect(VALID_TRANSITIONS.active.defer).toBe("deferred");
    });
  });

  describe("from confirmed", () => {
    it("can be superseded by new evidence", () => {
      expect(VALID_TRANSITIONS.confirmed.supersede).toBe("superseded");
    });

    it("can be refuted by new test", () => {
      expect(VALID_TRANSITIONS.confirmed.refute).toBe("refuted");
    });
  });

  describe("from refuted (terminal)", () => {
    it("has no valid transitions", () => {
      const triggers = Object.keys(VALID_TRANSITIONS.refuted);
      expect(triggers.length).toBe(0);
    });
  });

  describe("from superseded (terminal)", () => {
    it("has no valid transitions", () => {
      const triggers = Object.keys(VALID_TRANSITIONS.superseded);
      expect(triggers.length).toBe(0);
    });
  });

  describe("from deferred", () => {
    it("can reactivate to active", () => {
      expect(VALID_TRANSITIONS.deferred.reactivate).toBe("active");
    });

    it("cannot directly refute", () => {
      expect(VALID_TRANSITIONS.deferred.refute).toBeUndefined();
    });
  });
});

// ============================================================================
// Validation Function Tests
// ============================================================================

describe("isValidTransition", () => {
  it("returns true for valid transitions", () => {
    expect(isValidTransition("proposed", "activate")).toBe(true);
    expect(isValidTransition("active", "refute")).toBe(true);
    expect(isValidTransition("active", "confirm")).toBe(true);
    expect(isValidTransition("deferred", "reactivate")).toBe(true);
  });

  it("returns false for invalid transitions", () => {
    expect(isValidTransition("proposed", "refute")).toBe(false);
    expect(isValidTransition("refuted", "activate")).toBe(false);
    expect(isValidTransition("superseded", "reactivate")).toBe(false);
  });
});

describe("getTargetState", () => {
  it("returns correct target state for valid transitions", () => {
    expect(getTargetState("proposed", "activate")).toBe("active");
    expect(getTargetState("active", "refute")).toBe("refuted");
    expect(getTargetState("active", "confirm")).toBe("confirmed");
  });

  it("returns null for invalid transitions", () => {
    expect(getTargetState("proposed", "refute")).toBeNull();
    expect(getTargetState("refuted", "activate")).toBeNull();
  });
});

describe("getValidTriggers", () => {
  it("returns all valid triggers for a state", () => {
    const proposedTriggers = getValidTriggers("proposed");
    expect(proposedTriggers).toContain("activate");
    expect(proposedTriggers).toContain("defer");
    expect(proposedTriggers).not.toContain("refute");
  });

  it("returns empty array for terminal states", () => {
    expect(getValidTriggers("refuted")).toEqual([]);
    expect(getValidTriggers("superseded")).toEqual([]);
  });

  it("returns correct triggers for active state", () => {
    const activeTriggers = getValidTriggers("active");
    expect(activeTriggers).toContain("refute");
    expect(activeTriggers).toContain("confirm");
    expect(activeTriggers).toContain("supersede");
    expect(activeTriggers).toContain("defer");
  });
});

describe("isTerminalState", () => {
  it("identifies refuted as terminal", () => {
    expect(isTerminalState("refuted")).toBe(true);
  });

  it("identifies superseded as terminal", () => {
    expect(isTerminalState("superseded")).toBe(true);
  });

  it("identifies non-terminal states correctly", () => {
    expect(isTerminalState("proposed")).toBe(false);
    expect(isTerminalState("active")).toBe(false);
    expect(isTerminalState("confirmed")).toBe(false);
    expect(isTerminalState("deferred")).toBe(false);
  });
});

describe("validateTransitionRequirements", () => {
  it("requires testResultId for refute", () => {
    const result = validateTransitionRequirements("refute", {});
    expect(result.valid).toBe(false);
    expect(result.error).toContain("testResultId");
  });

  it("accepts refute with testResultId", () => {
    const result = validateTransitionRequirements("refute", {
      testResultId: "T-TEST-001",
    });
    expect(result.valid).toBe(true);
  });

  it("requires testResultId for confirm", () => {
    const result = validateTransitionRequirements("confirm", {});
    expect(result.valid).toBe(false);
  });

  it("accepts confirm with testResultId", () => {
    const result = validateTransitionRequirements("confirm", {
      testResultId: "T-TEST-001",
    });
    expect(result.valid).toBe(true);
  });

  it("requires childHypothesisId for supersede", () => {
    const result = validateTransitionRequirements("supersede", {});
    expect(result.valid).toBe(false);
    expect(result.error).toContain("childHypothesisId");
  });

  it("accepts supersede with childHypothesisId", () => {
    const result = validateTransitionRequirements("supersede", {
      childHypothesisId: "H-TEST-002",
    });
    expect(result.valid).toBe(true);
  });

  it("accepts activate without requirements", () => {
    const result = validateTransitionRequirements("activate", {});
    expect(result.valid).toBe(true);
  });

  it("accepts defer without requirements", () => {
    const result = validateTransitionRequirements("defer", {});
    expect(result.valid).toBe(true);
  });

  it("accepts reactivate without requirements", () => {
    const result = validateTransitionRequirements("reactivate", {});
    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// Transition Function Tests
// ============================================================================

describe("transitionHypothesis", () => {
  it("successfully activates a proposed hypothesis", () => {
    const hypothesis = createTestHypothesis({ state: "proposed" });
    const result = transitionHypothesis(hypothesis, "activate");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.hypothesis.state).toBe("active");
      expect(result.transition.fromState).toBe("proposed");
      expect(result.transition.toState).toBe("active");
      expect(result.transition.trigger).toBe("activate");
    }
  });

  it("fails for invalid transitions", () => {
    const hypothesis = createTestHypothesis({ state: "proposed" });
    const result = transitionHypothesis(hypothesis, "refute");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(TransitionErrorCode.INVALID_TRANSITION);
      expect(result.error.fromState).toBe("proposed");
    }
  });

  it("fails when refuting without testResultId", () => {
    const hypothesis = createTestHypothesis({ state: "active" });
    const result = transitionHypothesis(hypothesis, "refute");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(TransitionErrorCode.MISSING_TEST_RESULT);
    }
  });

  it("succeeds when refuting with testResultId", () => {
    const hypothesis = createTestHypothesis({ state: "active" });
    const result = transitionHypothesis(hypothesis, "refute", {
      testResultId: "T-TEST-001",
      reason: "Test showed contradictory evidence",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.hypothesis.state).toBe("refuted");
      expect(result.transition.testResultId).toBe("T-TEST-001");
    }
  });

  it("fails when superseding without childHypothesisId", () => {
    const hypothesis = createTestHypothesis({ state: "active" });
    const result = transitionHypothesis(hypothesis, "supersede");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(TransitionErrorCode.MISSING_CHILD_HYPOTHESIS);
    }
  });

  it("fails for terminal states", () => {
    const hypothesis = createTestHypothesis({ state: "refuted" });
    const result = transitionHypothesis(hypothesis, "activate");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe(TransitionErrorCode.TERMINAL_STATE);
      expect(result.error.message).toContain("terminal state");
    }
  });

  it("updates the updatedAt timestamp", () => {
    const hypothesis = createTestHypothesis({ state: "proposed" });
    const originalUpdatedAt = hypothesis.updatedAt;

    const result = transitionHypothesis(hypothesis, "activate");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.hypothesis.updatedAt).not.toBe(originalUpdatedAt);
    }
  });

  it("records triggeredBy when provided", () => {
    const hypothesis = createTestHypothesis({ state: "proposed" });
    const result = transitionHypothesis(hypothesis, "activate", {
      triggeredBy: "GreenCastle",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.transition.triggeredBy).toBe("GreenCastle");
    }
  });

  it("records sessionId when provided", () => {
    const hypothesis = createTestHypothesis({ state: "proposed" });
    const result = transitionHypothesis(hypothesis, "activate", {
      sessionId: "RS-20251230-test",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.transition.sessionId).toBe("RS-20251230-test");
    }
  });
});

// ============================================================================
// Convenience Function Tests
// ============================================================================

describe("activateHypothesis", () => {
  it("activates a proposed hypothesis", () => {
    const hypothesis = createTestHypothesis({ state: "proposed" });
    const result = activateHypothesis(hypothesis);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.hypothesis.state).toBe("active");
    }
  });

  it("fails for already active hypothesis", () => {
    const hypothesis = createTestHypothesis({ state: "active" });
    const result = activateHypothesis(hypothesis);

    expect(result.success).toBe(false);
  });
});

describe("refuteHypothesis", () => {
  it("refutes an active hypothesis with test result", () => {
    const hypothesis = createTestHypothesis({ state: "active" });
    const result = refuteHypothesis(hypothesis, "T-TEST-001", {
      reason: "Test demonstrated impossibility",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.hypothesis.state).toBe("refuted");
      expect(result.transition.testResultId).toBe("T-TEST-001");
      expect(result.transition.reason).toBe("Test demonstrated impossibility");
    }
  });
});

describe("confirmHypothesis", () => {
  it("confirms an active hypothesis with test result", () => {
    const hypothesis = createTestHypothesis({ state: "active" });
    const result = confirmHypothesis(hypothesis, "T-TEST-001");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.hypothesis.state).toBe("confirmed");
      expect(result.transition.testResultId).toBe("T-TEST-001");
    }
  });
});

describe("supersedeHypothesis", () => {
  it("supersedes an active hypothesis with child", () => {
    const hypothesis = createTestHypothesis({ state: "active" });
    const result = supersedeHypothesis(hypothesis, "H-TEST-002");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.hypothesis.state).toBe("superseded");
      expect(result.transition.childHypothesisId).toBe("H-TEST-002");
    }
  });

  it("can supersede a confirmed hypothesis", () => {
    const hypothesis = createTestHypothesis({ state: "confirmed" });
    const result = supersedeHypothesis(hypothesis, "H-TEST-002");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.hypothesis.state).toBe("superseded");
    }
  });
});

describe("deferHypothesis", () => {
  it("defers a proposed hypothesis", () => {
    const hypothesis = createTestHypothesis({ state: "proposed" });
    const result = deferHypothesis(hypothesis, {
      reason: "Need more data first",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.hypothesis.state).toBe("deferred");
    }
  });

  it("defers an active hypothesis", () => {
    const hypothesis = createTestHypothesis({ state: "active" });
    const result = deferHypothesis(hypothesis);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.hypothesis.state).toBe("deferred");
    }
  });
});

describe("reactivateHypothesis", () => {
  it("reactivates a deferred hypothesis", () => {
    const hypothesis = createTestHypothesis({ state: "deferred" });
    const result = reactivateHypothesis(hypothesis);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.hypothesis.state).toBe("active");
    }
  });

  it("fails for non-deferred hypothesis", () => {
    const hypothesis = createTestHypothesis({ state: "proposed" });
    const result = reactivateHypothesis(hypothesis);

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Transition History Store Tests
// ============================================================================

describe("TransitionHistoryStore", () => {
  let store: TransitionHistoryStore;

  beforeEach(() => {
    store = new TransitionHistoryStore();
  });

  const createTransition = (overrides: Partial<StateTransition> = {}): StateTransition => ({
    id: crypto.randomUUID(),
    hypothesisId: "H-TEST-001",
    fromState: "proposed",
    toState: "active",
    trigger: "activate",
    timestamp: new Date().toISOString(),
    ...overrides,
  });

  describe("add and getHistory", () => {
    it("adds and retrieves transitions", () => {
      const transition = createTransition();
      store.add(transition);

      const history = store.getHistory("H-TEST-001");
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(transition);
    });

    it("maintains order for multiple transitions", () => {
      const t1 = createTransition({ timestamp: "2025-12-30T01:00:00Z" });
      const t2 = createTransition({
        fromState: "active",
        toState: "refuted",
        trigger: "refute",
        timestamp: "2025-12-30T02:00:00Z",
      });

      store.add(t1);
      store.add(t2);

      const history = store.getHistory("H-TEST-001");
      expect(history).toHaveLength(2);
      expect(history[0].toState).toBe("active");
      expect(history[1].toState).toBe("refuted");
    });

    it("separates history by hypothesis", () => {
      const t1 = createTransition({ hypothesisId: "H-TEST-001" });
      const t2 = createTransition({ hypothesisId: "H-TEST-002" });

      store.add(t1);
      store.add(t2);

      expect(store.getHistory("H-TEST-001")).toHaveLength(1);
      expect(store.getHistory("H-TEST-002")).toHaveLength(1);
      expect(store.getHistory("H-TEST-003")).toHaveLength(0);
    });
  });

  describe("getLatestTransition", () => {
    it("returns the most recent transition", () => {
      store.add(createTransition({ timestamp: "2025-12-30T01:00:00Z" }));
      store.add(
        createTransition({
          fromState: "active",
          toState: "confirmed",
          trigger: "confirm",
          timestamp: "2025-12-30T02:00:00Z",
        }),
      );

      const latest = store.getLatestTransition("H-TEST-001");
      expect(latest?.toState).toBe("confirmed");
    });

    it("returns null for unknown hypothesis", () => {
      const latest = store.getLatestTransition("H-UNKNOWN-001");
      expect(latest).toBeNull();
    });
  });

  describe("getTransitionsByTestResult", () => {
    it("finds transitions triggered by a test result", () => {
      store.add(createTransition()); // No test result
      store.add(
        createTransition({
          hypothesisId: "H-TEST-002",
          fromState: "active",
          toState: "refuted",
          trigger: "refute",
          testResultId: "T-RESULT-001",
        }),
      );

      const transitions = store.getTransitionsByTestResult("T-RESULT-001");
      expect(transitions).toHaveLength(1);
      expect(transitions[0].hypothesisId).toBe("H-TEST-002");
    });
  });

  describe("getRefutedHypotheses", () => {
    it("returns list of refuted hypothesis IDs", () => {
      store.add(createTransition({ hypothesisId: "H-TEST-001" }));
      store.add(
        createTransition({
          hypothesisId: "H-TEST-001",
          fromState: "active",
          toState: "refuted",
          trigger: "refute",
        }),
      );
      store.add(createTransition({ hypothesisId: "H-TEST-002" }));

      const refuted = store.getRefutedHypotheses();
      expect(refuted).toContain("H-TEST-001");
      expect(refuted).not.toContain("H-TEST-002");
    });
  });

  describe("getAllTransitions", () => {
    it("returns all transitions sorted chronologically", () => {
      store.add(
        createTransition({
          hypothesisId: "H-TEST-002",
          timestamp: "2025-12-30T02:00:00Z",
        }),
      );
      store.add(
        createTransition({
          hypothesisId: "H-TEST-001",
          timestamp: "2025-12-30T01:00:00Z",
        }),
      );

      const all = store.getAllTransitions();
      expect(all).toHaveLength(2);
      expect(all[0].hypothesisId).toBe("H-TEST-001"); // Earlier
      expect(all[1].hypothesisId).toBe("H-TEST-002"); // Later
    });
  });

  describe("clear", () => {
    it("removes all history", () => {
      store.add(createTransition());
      store.clear();

      expect(store.getHistory("H-TEST-001")).toHaveLength(0);
    });
  });

  describe("export and import", () => {
    it("exports history to JSON-serializable format", () => {
      const t1 = createTransition();
      store.add(t1);

      const exported = store.export();
      expect(exported["H-TEST-001"]).toHaveLength(1);
    });

    it("imports history from JSON", () => {
      const data = {
        "H-TEST-001": [
          {
            id: crypto.randomUUID(),
            hypothesisId: "H-TEST-001",
            fromState: "proposed" as const,
            toState: "active" as const,
            trigger: "activate" as const,
            timestamp: "2025-12-30T01:00:00Z",
          },
        ],
      };

      store.import(data);
      expect(store.getHistory("H-TEST-001")).toHaveLength(1);
    });

    it("validates imported data", () => {
      const invalidData = {
        "H-TEST-001": [
          {
            id: "not-a-uuid", // Invalid
            hypothesisId: "H-TEST-001",
            fromState: "proposed" as const,
            toState: "active" as const,
            trigger: "activate" as const,
            timestamp: "2025-12-30T01:00:00Z",
          },
        ],
      };

      expect(() => store.import(invalidData)).toThrow();
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Lifecycle Integration", () => {
  it("completes a full lifecycle: proposed -> active -> refuted", () => {
    let hypothesis = createTestHypothesis({ state: "proposed" });
    const store = new TransitionHistoryStore();

    // Activate
    let result = activateHypothesis(hypothesis, { triggeredBy: "Agent1" });
    expect(result.success).toBe(true);
    if (result.success) {
      hypothesis = result.hypothesis;
      store.add(result.transition);
    }

    // Refute
    result = refuteHypothesis(hypothesis, "T-RESULT-001", {
      triggeredBy: "Agent2",
      reason: "Contradicted by experimental evidence",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      hypothesis = result.hypothesis;
      store.add(result.transition);
    }

    // Verify final state
    expect(hypothesis.state).toBe("refuted");

    // Verify history
    const history = store.getHistory("H-TEST-001");
    expect(history).toHaveLength(2);
    expect(history[0].trigger).toBe("activate");
    expect(history[1].trigger).toBe("refute");

    // Cannot transition from refuted
    result = activateHypothesis(hypothesis);
    expect(result.success).toBe(false);
  });

  it("completes lifecycle with supersede: proposed -> active -> superseded", () => {
    let hypothesis = createTestHypothesis({ state: "proposed" });

    // Activate
    let result = activateHypothesis(hypothesis);
    expect(result.success).toBe(true);
    if (result.success) hypothesis = result.hypothesis;

    // Supersede with refined hypothesis
    result = supersedeHypothesis(hypothesis, "H-TEST-002", {
      reason: "Replaced with more specific mechanism",
    });
    expect(result.success).toBe(true);
    if (result.success) hypothesis = result.hypothesis;

    expect(hypothesis.state).toBe("superseded");

    // Cannot transition from superseded
    result = reactivateHypothesis(hypothesis);
    expect(result.success).toBe(false);
  });

  it("handles defer and reactivate cycle", () => {
    let hypothesis = createTestHypothesis({ state: "proposed" });

    // Activate
    let result = activateHypothesis(hypothesis);
    expect(result.success).toBe(true);
    if (result.success) hypothesis = result.hypothesis;

    // Defer
    result = deferHypothesis(hypothesis, { reason: "Waiting for data" });
    expect(result.success).toBe(true);
    if (result.success) hypothesis = result.hypothesis;
    expect(hypothesis.state).toBe("deferred");

    // Reactivate
    result = reactivateHypothesis(hypothesis, { reason: "Data available" });
    expect(result.success).toBe(true);
    if (result.success) hypothesis = result.hypothesis;
    expect(hypothesis.state).toBe("active");
  });

  it("handles confirmed -> refuted by new evidence", () => {
    let hypothesis = createTestHypothesis({ state: "active" });

    // Confirm initially
    let result = confirmHypothesis(hypothesis, "T-RESULT-001");
    expect(result.success).toBe(true);
    if (result.success) hypothesis = result.hypothesis;
    expect(hypothesis.state).toBe("confirmed");

    // Later refuted by new test
    result = refuteHypothesis(hypothesis, "T-RESULT-002", {
      reason: "New test contradicts previous findings",
    });
    expect(result.success).toBe(true);
    if (result.success) hypothesis = result.hypothesis;
    expect(hypothesis.state).toBe("refuted");
  });
});
