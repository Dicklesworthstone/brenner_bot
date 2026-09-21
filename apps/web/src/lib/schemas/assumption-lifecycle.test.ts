import { beforeEach, describe, expect, it } from "vitest";
import { type Assumption, createAssumption } from "./assumption";
import {
  type AssumptionTransition,
  AssumptionTransitionErrorCode,
  AssumptionTransitionHistoryStore,
  AssumptionTransitionSchema,
  AssumptionTriggerSchema,
  challengeAssumption,
  computeAssumptionCascade,
  computeFalsificationPropagation,
  falsifyAssumption,
  getAssumptionTargetState,
  getValidAssumptionTriggers,
  isTerminalAssumptionState,
  isValidAssumptionTransition,
  transitionAssumption,
  VALID_ASSUMPTION_TRANSITIONS,
  validateAssumptionTransitionRequirements,
  verifyAssumption,
} from "./assumption-lifecycle";

// ============================================================================
// Test Fixtures
// ============================================================================

const createTestAssumption = (overrides: Partial<Assumption> = {}): Assumption => {
  const base = createAssumption({
    id: "A-TEST-001",
    statement: "Test assumption for lifecycle validation tests.",
    type: "background",
    sessionId: "TEST",
    load: {
      affectedHypotheses: ["H-TEST-001", "H-TEST-002"],
      affectedTests: ["T-TEST-001"],
      description: "Test load description for validation",
    },
  });
  return { ...base, ...overrides };
};

type FalsificationPropagation = ReturnType<typeof computeFalsificationPropagation>;

function requirePropagation(result: {
  propagation?: FalsificationPropagation;
}): FalsificationPropagation {
  if (!result.propagation) {
    throw new Error("Expected propagation to be defined");
  }
  return result.propagation;
}

// ============================================================================
// Schema Tests
// ============================================================================

describe("AssumptionTriggerSchema", () => {
  it("validates all trigger types", () => {
    const triggers = ["challenge", "verify", "falsify"];
    for (const trigger of triggers) {
      expect(AssumptionTriggerSchema.safeParse(trigger).success).toBe(true);
    }
  });

  it("rejects invalid triggers", () => {
    expect(AssumptionTriggerSchema.safeParse("invalid").success).toBe(false);
    expect(AssumptionTriggerSchema.safeParse("kill").success).toBe(false);
    expect(AssumptionTriggerSchema.safeParse("").success).toBe(false);
  });
});

describe("AssumptionTransitionSchema", () => {
  it("validates a complete transition record", () => {
    const transition: AssumptionTransition = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      assumptionId: "A-TEST-001",
      fromState: "unchecked",
      toState: "challenged",
      trigger: "challenge",
      triggeredBy: "BlueLake",
      reason: "Evidence suggests this needs review",
      timestamp: "2025-12-30T20:00:00Z",
      sessionId: "TEST",
    };
    const result = AssumptionTransitionSchema.safeParse(transition);
    expect(result.success).toBe(true);
  });

  it("validates minimal transition record", () => {
    const transition = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      assumptionId: "A-TEST-001",
      fromState: "unchecked",
      toState: "verified",
      trigger: "verify",
      timestamp: "2025-12-30T20:00:00Z",
    };
    const result = AssumptionTransitionSchema.safeParse(transition);
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID", () => {
    const transition = {
      id: "not-a-uuid",
      assumptionId: "A-TEST-001",
      fromState: "unchecked",
      toState: "verified",
      trigger: "verify",
      timestamp: "2025-12-30T20:00:00Z",
    };
    const result = AssumptionTransitionSchema.safeParse(transition);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Valid Transitions Tests
// ============================================================================

describe("VALID_ASSUMPTION_TRANSITIONS", () => {
  describe("from unchecked", () => {
    it("can challenge to challenged", () => {
      expect(VALID_ASSUMPTION_TRANSITIONS.unchecked.challenge).toBe("challenged");
    });

    it("can verify to verified", () => {
      expect(VALID_ASSUMPTION_TRANSITIONS.unchecked.verify).toBe("verified");
    });

    it("can falsify to falsified", () => {
      expect(VALID_ASSUMPTION_TRANSITIONS.unchecked.falsify).toBe("falsified");
    });
  });

  describe("from challenged", () => {
    it("can verify to verified", () => {
      expect(VALID_ASSUMPTION_TRANSITIONS.challenged.verify).toBe("verified");
    });

    it("can falsify to falsified", () => {
      expect(VALID_ASSUMPTION_TRANSITIONS.challenged.falsify).toBe("falsified");
    });

    it("cannot challenge again", () => {
      expect(VALID_ASSUMPTION_TRANSITIONS.challenged.challenge).toBeUndefined();
    });
  });

  describe("from verified", () => {
    it("can be re-challenged by new evidence", () => {
      expect(VALID_ASSUMPTION_TRANSITIONS.verified.challenge).toBe("challenged");
    });

    it("cannot verify again", () => {
      expect(VALID_ASSUMPTION_TRANSITIONS.verified.verify).toBeUndefined();
    });

    it("cannot directly falsify", () => {
      expect(VALID_ASSUMPTION_TRANSITIONS.verified.falsify).toBeUndefined();
    });
  });

  describe("from falsified (terminal)", () => {
    it("has no valid transitions", () => {
      const triggers = Object.keys(VALID_ASSUMPTION_TRANSITIONS.falsified);
      expect(triggers.length).toBe(0);
    });
  });
});

// ============================================================================
// Validation Function Tests
// ============================================================================

describe("isValidAssumptionTransition", () => {
  it("returns true for valid transitions", () => {
    expect(isValidAssumptionTransition("unchecked", "challenge")).toBe(true);
    expect(isValidAssumptionTransition("unchecked", "verify")).toBe(true);
    expect(isValidAssumptionTransition("unchecked", "falsify")).toBe(true);
    expect(isValidAssumptionTransition("challenged", "verify")).toBe(true);
    expect(isValidAssumptionTransition("challenged", "falsify")).toBe(true);
    expect(isValidAssumptionTransition("verified", "challenge")).toBe(true);
  });

  it("returns false for invalid transitions", () => {
    expect(isValidAssumptionTransition("falsified", "challenge")).toBe(false);
    expect(isValidAssumptionTransition("falsified", "verify")).toBe(false);
    expect(isValidAssumptionTransition("verified", "verify")).toBe(false);
    expect(isValidAssumptionTransition("challenged", "challenge")).toBe(false);
  });
});

describe("getAssumptionTargetState", () => {
  it("returns target state for valid transitions", () => {
    expect(getAssumptionTargetState("unchecked", "challenge")).toBe("challenged");
    expect(getAssumptionTargetState("unchecked", "verify")).toBe("verified");
    expect(getAssumptionTargetState("challenged", "falsify")).toBe("falsified");
  });

  it("returns null for invalid transitions", () => {
    expect(getAssumptionTargetState("falsified", "verify")).toBeNull();
    expect(getAssumptionTargetState("verified", "falsify")).toBeNull();
  });
});

describe("getValidAssumptionTriggers", () => {
  it("returns valid triggers for each state", () => {
    expect(getValidAssumptionTriggers("unchecked")).toEqual(
      expect.arrayContaining(["challenge", "verify", "falsify"]),
    );
    expect(getValidAssumptionTriggers("challenged")).toEqual(
      expect.arrayContaining(["verify", "falsify"]),
    );
    expect(getValidAssumptionTriggers("verified")).toEqual(expect.arrayContaining(["challenge"]));
    expect(getValidAssumptionTriggers("falsified")).toEqual([]);
  });
});

describe("isTerminalAssumptionState", () => {
  it("identifies falsified as terminal", () => {
    expect(isTerminalAssumptionState("falsified")).toBe(true);
  });

  it("identifies other states as non-terminal", () => {
    expect(isTerminalAssumptionState("unchecked")).toBe(false);
    expect(isTerminalAssumptionState("challenged")).toBe(false);
    expect(isTerminalAssumptionState("verified")).toBe(false);
  });
});

describe("validateAssumptionTransitionRequirements", () => {
  it("returns warning when falsifying without evidence", () => {
    const result = validateAssumptionTransitionRequirements("falsify", {});
    expect(result.valid).toBe(true);
    expect(result.warning).toBeDefined();
    expect(result.warning).toContain("evidence");
  });

  it("returns warning when verifying without evidence", () => {
    const result = validateAssumptionTransitionRequirements("verify", {});
    expect(result.valid).toBe(true);
    expect(result.warning).toBeDefined();
  });

  it("returns no warning when evidence is provided", () => {
    const result = validateAssumptionTransitionRequirements("falsify", {
      evidenceRef: "T-TEST-001",
    });
    expect(result.valid).toBe(true);
    expect(result.warning).toBeUndefined();
  });

  it("allows challenge without evidence", () => {
    const result = validateAssumptionTransitionRequirements("challenge", {});
    expect(result.valid).toBe(true);
    expect(result.warning).toBeUndefined();
  });
});

// ============================================================================
// Transition Function Tests
// ============================================================================

describe("transitionAssumption", () => {
  describe("valid transitions", () => {
    it("challenges an unchecked assumption", () => {
      const assumption = createTestAssumption({ status: "unchecked" });
      const result = transitionAssumption(assumption, "challenge", {
        reason: "New evidence questions this assumption",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.assumption.status).toBe("challenged");
        expect(result.transition.trigger).toBe("challenge");
        expect(result.transition.fromState).toBe("unchecked");
        expect(result.transition.toState).toBe("challenged");
        expect(result.propagation).toBeUndefined();
      }
    });

    it("verifies a challenged assumption", () => {
      const assumption = createTestAssumption({ status: "challenged" });
      const result = transitionAssumption(assumption, "verify", {
        evidenceRef: "T-TEST-001",
        reason: "Test confirmed the assumption holds",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.assumption.status).toBe("verified");
        expect(result.transition.evidenceRef).toBe("T-TEST-001");
      }
    });

    it("falsifies an assumption and computes propagation", () => {
      const assumption = createTestAssumption({
        status: "unchecked",
        load: {
          affectedHypotheses: ["H-TEST-001", "H-TEST-002"],
          affectedTests: ["T-TEST-001", "T-TEST-002"],
          description: "These depend on this assumption",
        },
      });
      const result = transitionAssumption(assumption, "falsify", {
        evidenceRef: "T-TEST-003",
        reason: "Test disproved the assumption",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.assumption.status).toBe("falsified");
        expect(result.propagation).toBeDefined();
        const propagation = requirePropagation(result);
        expect(propagation.undermindedHypotheses).toHaveLength(2);
        expect(propagation.invalidatedTests).toHaveLength(2);
        expect(propagation.summary).toContain("2 hypothesis(es) undermined");
        expect(propagation.summary).toContain("2 test(s) invalidated");
      }
    });

    it("re-challenges a verified assumption", () => {
      const assumption = createTestAssumption({ status: "verified" });
      const result = transitionAssumption(assumption, "challenge", {
        reason: "New contradicting evidence emerged",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.assumption.status).toBe("challenged");
      }
    });
  });

  describe("invalid transitions", () => {
    it("rejects transitions from terminal state", () => {
      const assumption = createTestAssumption({ status: "falsified" });
      const result = transitionAssumption(assumption, "verify");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(AssumptionTransitionErrorCode.TERMINAL_STATE);
        expect(result.error.message).toContain("terminal state");
      }
    });

    it("rejects invalid transition from verified to verified", () => {
      const assumption = createTestAssumption({ status: "verified" });
      const result = transitionAssumption(assumption, "verify");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(AssumptionTransitionErrorCode.INVALID_TRANSITION);
      }
    });

    it("rejects invalid transition from verified to falsified", () => {
      const assumption = createTestAssumption({ status: "verified" });
      const result = transitionAssumption(assumption, "falsify");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(AssumptionTransitionErrorCode.INVALID_TRANSITION);
        expect(result.error.message).toContain("Valid triggers: challenge");
      }
    });
  });
});

// ============================================================================
// Convenience Function Tests
// ============================================================================

describe("challengeAssumption", () => {
  it("challenges an unchecked assumption", () => {
    const assumption = createTestAssumption({ status: "unchecked" });
    const result = challengeAssumption(assumption, { reason: "Question raised" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.assumption.status).toBe("challenged");
    }
  });
});

describe("verifyAssumption", () => {
  it("verifies a challenged assumption", () => {
    const assumption = createTestAssumption({ status: "challenged" });
    const result = verifyAssumption(assumption, {
      evidenceRef: "T-TEST-001",
      reason: "Evidence supports it",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.assumption.status).toBe("verified");
    }
  });
});

describe("falsifyAssumption", () => {
  it("falsifies an assumption with propagation", () => {
    const assumption = createTestAssumption({ status: "unchecked" });
    const result = falsifyAssumption(assumption, {
      evidenceRef: "T-TEST-001",
      reason: "Evidence contradicts it",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.assumption.status).toBe("falsified");
      expect(result.propagation).toBeDefined();
    }
  });
});

// ============================================================================
// Propagation Tests
// ============================================================================

describe("computeFalsificationPropagation", () => {
  it("returns affected hypotheses and tests", () => {
    const assumption = createTestAssumption({
      id: "A-TEST-001",
      load: {
        affectedHypotheses: ["H-TEST-001", "H-TEST-002"],
        affectedTests: ["T-TEST-001"],
        description: "These depend on this assumption",
      },
    });

    const propagation = computeFalsificationPropagation(assumption);

    expect(propagation.falsifiedAssumptionId).toBe("A-TEST-001");
    expect(propagation.undermindedHypotheses).toEqual(["H-TEST-001", "H-TEST-002"]);
    expect(propagation.invalidatedTests).toEqual(["T-TEST-001"]);
    expect(propagation.summary).toContain("2 hypothesis(es) undermined");
    expect(propagation.summary).toContain("1 test(s) invalidated");
  });

  it("handles assumption with no linked items", () => {
    const assumption = createTestAssumption({
      load: {
        affectedHypotheses: [],
        affectedTests: [],
        description: "No dependencies",
      },
    });

    const propagation = computeFalsificationPropagation(assumption);

    expect(propagation.undermindedHypotheses).toEqual([]);
    expect(propagation.invalidatedTests).toEqual([]);
    expect(propagation.summary).toContain("No linked hypotheses or tests affected");
  });
});

// ============================================================================
// History Store Tests
// ============================================================================

describe("AssumptionTransitionHistoryStore", () => {
  let store: AssumptionTransitionHistoryStore;

  beforeEach(() => {
    store = new AssumptionTransitionHistoryStore();
  });

  describe("add and getHistory", () => {
    it("stores and retrieves transitions", () => {
      const assumption = createTestAssumption({ status: "unchecked" });
      const result = transitionAssumption(assumption, "challenge");

      expect(result.success).toBe(true);
      if (result.success) {
        store.add(result.transition);
        const history = store.getHistory("A-TEST-001");
        expect(history).toHaveLength(1);
        expect(history[0].trigger).toBe("challenge");
      }
    });

    it("returns empty array for unknown assumption", () => {
      const history = store.getHistory("A-UNKNOWN-001");
      expect(history).toEqual([]);
    });
  });

  describe("getLatestTransition", () => {
    it("returns the most recent transition", () => {
      const assumption1 = createTestAssumption({ status: "unchecked" });
      const result1 = transitionAssumption(assumption1, "challenge");

      if (result1.success) {
        store.add(result1.transition);
        const result2 = transitionAssumption(result1.assumption, "verify");
        if (result2.success) {
          store.add(result2.transition);
        }
      }

      const latest = store.getLatestTransition("A-TEST-001");
      expect(latest?.trigger).toBe("verify");
    });

    it("returns null for unknown assumption", () => {
      const latest = store.getLatestTransition("A-UNKNOWN-001");
      expect(latest).toBeNull();
    });
  });

  describe("getFalsifiedAssumptions", () => {
    it("returns IDs of falsified assumptions", () => {
      const assumption = createTestAssumption({ status: "unchecked" });
      const result = transitionAssumption(assumption, "falsify");

      if (result.success) {
        store.add(result.transition);
      }

      const falsified = store.getFalsifiedAssumptions();
      expect(falsified).toContain("A-TEST-001");
    });

    it("returns empty array when no falsifications", () => {
      const assumption = createTestAssumption({ status: "unchecked" });
      const result = transitionAssumption(assumption, "verify");

      if (result.success) {
        store.add(result.transition);
      }

      const falsified = store.getFalsifiedAssumptions();
      expect(falsified).toEqual([]);
    });
  });

  describe("getTransitionsByEvidence", () => {
    it("finds transitions by evidence reference", () => {
      const assumption = createTestAssumption({ status: "unchecked" });
      const result = transitionAssumption(assumption, "falsify", {
        evidenceRef: "T-TEST-001",
      });

      if (result.success) {
        store.add(result.transition);
      }

      const byEvidence = store.getTransitionsByEvidence("T-TEST-001");
      expect(byEvidence).toHaveLength(1);
      expect(byEvidence[0].assumptionId).toBe("A-TEST-001");
    });
  });

  describe("getAllTransitions", () => {
    it("returns all transitions in chronological order", () => {
      const assumption1 = createTestAssumption({ id: "A-TEST-001", status: "unchecked" });
      const assumption2 = createTestAssumption({ id: "A-TEST-002", status: "unchecked" });

      const result1 = transitionAssumption(assumption1, "challenge");
      const result2 = transitionAssumption(assumption2, "verify");

      if (result1.success) store.add(result1.transition);
      if (result2.success) store.add(result2.transition);

      const all = store.getAllTransitions();
      expect(all).toHaveLength(2);
      // Check they're in chronological order
      expect(new Date(all[0].timestamp).getTime()).toBeLessThanOrEqual(
        new Date(all[1].timestamp).getTime(),
      );
    });
  });

  describe("clear", () => {
    it("removes all history", () => {
      const assumption = createTestAssumption({ status: "unchecked" });
      const result = transitionAssumption(assumption, "challenge");

      if (result.success) {
        store.add(result.transition);
      }

      store.clear();
      expect(store.getHistory("A-TEST-001")).toEqual([]);
    });
  });

  describe("export and import", () => {
    it("round-trips history through export/import", () => {
      const assumption = createTestAssumption({ status: "unchecked" });
      const result = transitionAssumption(assumption, "challenge", {
        reason: "Testing export",
      });

      if (result.success) {
        store.add(result.transition);
      }

      const exported = store.export();
      store.clear();
      expect(store.getHistory("A-TEST-001")).toEqual([]);

      store.import(exported);
      const history = store.getHistory("A-TEST-001");
      expect(history).toHaveLength(1);
      expect(history[0].trigger).toBe("challenge");
    });
  });
});

// ============================================================================
// End-to-End Falsification Cascade Tests
// ============================================================================

describe("Falsification Cascade (end-to-end)", () => {
  describe("cascade scenarios", () => {
    it("falsifying assumption produces correct cascade for multiple hypotheses and tests", () => {
      const assumption = createTestAssumption({
        id: "A-SCALE-001",
        type: "scale_physics",
        status: "unchecked",
        load: {
          affectedHypotheses: ["H-GRADIENT-001", "H-GRADIENT-002", "H-GRADIENT-003"],
          affectedTests: ["T-DIFF-001", "T-DIFF-002"],
          description: "All gradient-based hypotheses depend on diffusion timescale",
        },
      });

      const result = falsifyAssumption(assumption, {
        triggeredBy: "BlueLake",
        evidenceRef: "T-MEASUREMENT-001",
        reason: "Measured diffusion coefficient was 100x slower than assumed",
        sessionId: "SCALE-CHECK-SESSION",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.assumption.status).toBe("falsified");
        expect(result.propagation).toBeDefined();
        const propagation = requirePropagation(result);
        expect(propagation.undermindedHypotheses).toHaveLength(3);
        expect(propagation.invalidatedTests).toHaveLength(2);
        expect(propagation.summary).toContain("3 hypothesis(es) undermined");
        expect(propagation.summary).toContain("2 test(s) invalidated");
        expect(propagation.summary).toContain("H-GRADIENT-001");
        expect(propagation.summary).toContain("T-DIFF-001");
      }
    });

    it("cascade is empty when assumption has no dependencies", () => {
      const assumption = createTestAssumption({
        id: "A-ISOLATED-001",
        type: "background",
        status: "unchecked",
        load: {
          affectedHypotheses: [],
          affectedTests: [],
          description: "Standalone assumption with no dependencies",
        },
      });

      const result = falsifyAssumption(assumption, {
        reason: "New literature contradicts this assumption",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const propagation = requirePropagation(result);
        expect(propagation.undermindedHypotheses).toEqual([]);
        expect(propagation.invalidatedTests).toEqual([]);
        expect(propagation.summary).toContain("No linked hypotheses or tests affected");
      }
    });

    it("cascade only affects tests when no hypotheses linked", () => {
      const assumption = createTestAssumption({
        id: "A-METHOD-001",
        type: "methodological",
        status: "challenged",
        load: {
          affectedHypotheses: [],
          affectedTests: ["T1", "T2", "T3"],
          description: "Method assumption affecting tests only",
        },
      });

      const result = falsifyAssumption(assumption);

      expect(result.success).toBe(true);
      if (result.success) {
        const propagation = requirePropagation(result);
        expect(propagation.undermindedHypotheses).toEqual([]);
        expect(propagation.invalidatedTests).toEqual(["T1", "T2", "T3"]);
        expect(propagation.summary).toContain("3 test(s) invalidated");
        expect(propagation.summary).not.toContain("hypothesis");
      }
    });
  });

  describe("full lifecycle flow", () => {
    it("tracks complete lifecycle: unchecked -> challenged -> verified", () => {
      const store = new AssumptionTransitionHistoryStore();
      let assumption = createTestAssumption({ id: "A-LIFECYCLE-001", status: "unchecked" });

      // Step 1: Challenge the assumption
      const challenge = challengeAssumption(assumption, {
        triggeredBy: "RedMountain",
        reason: "Literature review found conflicting evidence",
      });
      expect(challenge.success).toBe(true);
      if (challenge.success) {
        store.add(challenge.transition);
        assumption = challenge.assumption;
      }

      // Step 2: Verify after investigation
      const verify = verifyAssumption(assumption, {
        triggeredBy: "GreenValley",
        evidenceRef: "T-VERIFY-001",
        reason: "Experimental confirmation of assumption",
      });
      expect(verify.success).toBe(true);
      if (verify.success) {
        store.add(verify.transition);
        assumption = verify.assumption;
      }

      // Check final state
      expect(assumption.status).toBe("verified");
      const history = store.getHistory("A-LIFECYCLE-001");
      expect(history).toHaveLength(2);
      expect(history[0].trigger).toBe("challenge");
      expect(history[1].trigger).toBe("verify");
    });

    it("tracks lifecycle: unchecked -> challenged -> falsified with cascade", () => {
      const store = new AssumptionTransitionHistoryStore();
      let assumption = createTestAssumption({
        id: "A-DOOMED-001",
        status: "unchecked",
        load: {
          affectedHypotheses: ["H-MAIN-001"],
          affectedTests: ["T-MAIN-001"],
          description: "Core assumption for main hypothesis",
        },
      });

      // Step 1: Challenge
      const challenge = challengeAssumption(assumption, { reason: "Questioned by reviewer" });
      expect(challenge.success).toBe(true);
      if (challenge.success) {
        store.add(challenge.transition);
        assumption = challenge.assumption;
      }

      // Step 2: Falsify
      const falsify = falsifyAssumption(assumption, {
        evidenceRef: "T-CRITICAL-001",
        reason: "Critical test disproved assumption",
      });
      expect(falsify.success).toBe(true);
      if (falsify.success) {
        store.add(falsify.transition);
        assumption = falsify.assumption;
        const propagation = requirePropagation(falsify);
        expect(propagation.undermindedHypotheses).toContain("H-MAIN-001");
        expect(propagation.invalidatedTests).toContain("T-MAIN-001");
      }

      // Check terminal state - cannot transition further
      const rechallenge = challengeAssumption(assumption);
      expect(rechallenge.success).toBe(false);
      if (!rechallenge.success) {
        expect(rechallenge.error.code).toBe(AssumptionTransitionErrorCode.TERMINAL_STATE);
      }

      // Verify history
      const history = store.getHistory("A-DOOMED-001");
      expect(history).toHaveLength(2);
      expect(store.getFalsifiedAssumptions()).toContain("A-DOOMED-001");
    });

    it("verified assumption can be re-challenged and then falsified", () => {
      const store = new AssumptionTransitionHistoryStore();
      let assumption = createTestAssumption({
        id: "A-REVISED-001",
        status: "verified",
        load: {
          affectedHypotheses: ["H-REVISED-001"],
          affectedTests: [],
          description: "Previously verified assumption",
        },
      });

      // Step 1: Re-challenge verified assumption
      const rechallenge = challengeAssumption(assumption, {
        reason: "New evidence contradicts previous verification",
        evidenceRef: "PAPER-2025-001",
      });
      expect(rechallenge.success).toBe(true);
      if (rechallenge.success) {
        store.add(rechallenge.transition);
        assumption = rechallenge.assumption;
        expect(assumption.status).toBe("challenged");
      }

      // Step 2: Falsify after re-evaluation
      const falsify = falsifyAssumption(assumption, {
        reason: "Re-evaluation confirmed falsification",
      });
      expect(falsify.success).toBe(true);
      if (falsify.success) {
        store.add(falsify.transition);
        assumption = falsify.assumption;
        const propagation = requirePropagation(falsify);
        expect(propagation.undermindedHypotheses).toContain("H-REVISED-001");
      }

      // Check complete history
      const history = store.getHistory("A-REVISED-001");
      expect(history).toHaveLength(2);
      expect(history[0].fromState).toBe("verified");
      expect(history[0].toState).toBe("challenged");
      expect(history[1].fromState).toBe("challenged");
      expect(history[1].toState).toBe("falsified");
    });
  });

  describe("transition metadata", () => {
    it("preserves all metadata through transitions", () => {
      const assumption = createTestAssumption({ status: "unchecked" });

      const result = transitionAssumption(assumption, "falsify", {
        triggeredBy: "ExperimentBot",
        evidenceRef: "T-CRITICAL-999",
        reason: "Scale calculation was off by 3 orders of magnitude",
        sessionId: "SESSION-2025-12-31",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.transition.triggeredBy).toBe("ExperimentBot");
        expect(result.transition.evidenceRef).toBe("T-CRITICAL-999");
        expect(result.transition.reason).toContain("3 orders of magnitude");
        expect(result.transition.sessionId).toBe("SESSION-2025-12-31");
        expect(result.transition.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        );
        expect(result.transition.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    });

    it("updates assumption.updatedAt on transition", () => {
      const assumption = createTestAssumption({ status: "unchecked" });
      const originalUpdatedAt = assumption.updatedAt;

      // Small delay to ensure different timestamp
      const result = transitionAssumption(assumption, "challenge");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(new Date(result.assumption.updatedAt).getTime()).toBeGreaterThanOrEqual(
          new Date(originalUpdatedAt).getTime(),
        );
      }
    });
  });

  describe("edge cases", () => {
    it("handles assumption with many dependencies", () => {
      const manyHypotheses = Array.from(
        { length: 20 },
        (_, i) => `H-MULTI-${String(i + 1).padStart(3, "0")}`,
      );
      const manyTests = Array.from(
        { length: 15 },
        (_, i) => `T-MULTI-${String(i + 1).padStart(3, "0")}`,
      );

      const assumption = createTestAssumption({
        id: "A-CENTRAL-001",
        status: "unchecked",
        load: {
          affectedHypotheses: manyHypotheses,
          affectedTests: manyTests,
          description: "Central assumption with many dependencies",
        },
      });

      const result = falsifyAssumption(assumption);

      expect(result.success).toBe(true);
      if (result.success) {
        const propagation = requirePropagation(result);
        expect(propagation.undermindedHypotheses).toHaveLength(20);
        expect(propagation.invalidatedTests).toHaveLength(15);
        expect(propagation.summary).toContain("20 hypothesis(es) undermined");
        expect(propagation.summary).toContain("15 test(s) invalidated");
      }
    });

    it("computeFalsificationPropagation includes timestamp", () => {
      const assumption = createTestAssumption({ status: "falsified" });
      const propagation = computeFalsificationPropagation(assumption);

      expect(propagation.timestamp).toBeDefined();
      expect(new Date(propagation.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
});

// ============================================================================
// Dependency Cascade Tests
// ============================================================================

describe("computeAssumptionCascade", () => {
  it("collects transitive dependents with criticality counts", () => {
    const assumptions: Assumption[] = [
      createTestAssumption({ id: "A-ROOT-001" }),
      createTestAssumption({
        id: "A-DEP-001",
        criticality: "foundational",
        dependsOn: ["A-ROOT-001"],
      }),
      createTestAssumption({
        id: "A-DEP-002",
        criticality: "important",
        dependsOn: ["A-ROOT-001"],
      }),
      createTestAssumption({ id: "A-DEP-003", criticality: "minor", dependsOn: ["A-DEP-001"] }),
    ];

    const result = computeAssumptionCascade(assumptions, "A-ROOT-001");

    expect(result.affectedAssumptionIds).toEqual(
      expect.arrayContaining(["A-DEP-001", "A-DEP-002", "A-DEP-003"]),
    );
    expect(result.byCriticality.foundational).toBe(1);
    expect(result.byCriticality.important).toBe(1);
    expect(result.byCriticality.minor).toBe(1);
  });

  it("returns empty cascade when no dependents exist", () => {
    const assumptions: Assumption[] = [
      createTestAssumption({ id: "A-ROOT-ONLY" }),
      createTestAssumption({ id: "A-OTHER-001" }),
    ];

    const result = computeAssumptionCascade(assumptions, "A-ROOT-ONLY");

    expect(result.affectedAssumptionIds).toEqual([]);
    expect(result.byCriticality.foundational).toBe(0);
    expect(result.byCriticality.important).toBe(0);
    expect(result.byCriticality.minor).toBe(0);
  });
});
