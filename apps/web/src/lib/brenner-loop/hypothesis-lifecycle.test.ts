/**
 * Unit tests for Hypothesis Lifecycle State Machine
 *
 * Tests the state machine for hypothesis evolution through states:
 * draft -> active -> testing -> supported/falsified/superseded
 *
 * @see brenner_bot-arzl (bead)
 * @see brenner-loop/hypothesis-lifecycle.ts
 */

import { describe, expect, it } from "vitest";
import type { HypothesisCard } from "./hypothesis";
import {
  calculateLifecycleStats,
  canTransition,
  canTransitionWithEvent,
  createHypothesisWithLifecycle,
  getAvailableTransitions,
  getStateColors,
  getStateDescription,
  getStateIcon,
  getStateLabel,
  HYPOTHESIS_STATE_CONFIG,
  type HypothesisState,
  type HypothesisWithLifecycle,
  isHypothesisState,
  isHypothesisWithLifecycle,
  isResolvable,
  isStateDeletable,
  isStateEditable,
  isTerminalState,
  shouldBeDormant,
  transitionHypothesis,
  upgradeToLifecycle,
} from "./hypothesis-lifecycle";

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestHypothesisCard(overrides: Partial<HypothesisCard> = {}): HypothesisCard {
  return {
    id: "HC-TEST-001-v1",
    version: 1,
    statement: "Test hypothesis statement that is sufficiently long",
    mechanism: "Test mechanism description that is sufficiently long",
    domain: ["test-domain"],
    predictionsIfTrue: ["Prediction 1 if true", "Prediction 2 if true"],
    predictionsIfFalse: ["Prediction 1 if false"],
    impossibleIfTrue: ["This would be impossible if hypothesis is true"],
    confounds: [],
    assumptions: ["Assumption 1"],
    confidence: 50,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function createTestHypothesisWithLifecycle(
  overrides: Partial<HypothesisWithLifecycle> = {},
): HypothesisWithLifecycle {
  const card = createTestHypothesisCard();
  return {
    ...card,
    state: "draft",
    stateEnteredAt: new Date("2026-01-01T00:00:00Z"),
    lockedPredictions: [],
    lastActivityAt: new Date("2026-01-01T00:00:00Z"),
    dormancyThresholdDays: 30,
    ...overrides,
  };
}

// ============================================================================
// Factory Function Tests
// ============================================================================

describe("createHypothesisWithLifecycle", () => {
  it("creates a hypothesis in draft state", () => {
    const card = createTestHypothesisCard();
    const result = createHypothesisWithLifecycle(card);

    expect(result.state).toBe("draft");
    expect(result.lockedPredictions).toEqual([]);
    expect(result.dormancyThresholdDays).toBe(30);
  });

  it("preserves all card fields", () => {
    const card = createTestHypothesisCard({
      statement: "Custom statement for testing purposes",
    });
    const result = createHypothesisWithLifecycle(card);

    expect(result.statement).toBe("Custom statement for testing purposes");
    expect(result.mechanism).toBe(card.mechanism);
    expect(result.predictionsIfTrue).toEqual(card.predictionsIfTrue);
  });

  it("allows custom dormancy threshold", () => {
    const card = createTestHypothesisCard();
    const result = createHypothesisWithLifecycle(card, {
      dormancyThresholdDays: 14,
    });

    expect(result.dormancyThresholdDays).toBe(14);
  });

  it("sets stateEnteredAt and lastActivityAt to current time", () => {
    const before = new Date();
    const card = createTestHypothesisCard();
    const result = createHypothesisWithLifecycle(card);
    const after = new Date();

    expect(result.stateEnteredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.stateEnteredAt.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(result.lastActivityAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });
});

describe("upgradeToLifecycle", () => {
  it("upgrades card to draft state by default", () => {
    const card = createTestHypothesisCard();
    const result = upgradeToLifecycle(card);

    expect(result.state).toBe("draft");
    expect(result.lockedPredictions).toEqual([]);
  });

  it("can specify initial state", () => {
    const card = createTestHypothesisCard();
    const result = upgradeToLifecycle(card, "active");

    expect(result.state).toBe("active");
  });

  it("handles Date updatedAt", () => {
    const card = createTestHypothesisCard({
      updatedAt: new Date("2026-01-02T00:00:00Z"),
    });
    const result = upgradeToLifecycle(card);

    expect(result.lastActivityAt).toEqual(new Date("2026-01-02T00:00:00Z"));
  });

  it("handles string updatedAt (from JSON deserialization)", () => {
    const card = createTestHypothesisCard();
    // Simulate JSON deserialization
    const serialized = JSON.parse(JSON.stringify(card));
    const result = upgradeToLifecycle(serialized);

    expect(result.lastActivityAt instanceof Date).toBe(true);
  });
});

// ============================================================================
// State Transition Tests
// ============================================================================

describe("transitionHypothesis", () => {
  describe("LOCK_PREDICTION", () => {
    it("transitions from draft to active when locking first prediction", () => {
      const hypothesis = createTestHypothesisWithLifecycle({ state: "draft" });
      const result = transitionHypothesis(hypothesis, {
        type: "LOCK_PREDICTION",
        predictionIndex: 0,
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("active");
      expect(result.hypothesis.lockedPredictions).toContain("0");
    });

    it("stays active when locking additional predictions", () => {
      const hypothesis = createTestHypothesisWithLifecycle({
        state: "active",
        lockedPredictions: ["0"],
      });
      const result = transitionHypothesis(hypothesis, {
        type: "LOCK_PREDICTION",
        predictionIndex: 1,
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("active");
      expect(result.hypothesis.lockedPredictions).toEqual(["0", "1"]);
    });

    it("rejects locking already-locked prediction", () => {
      const hypothesis = createTestHypothesisWithLifecycle({
        state: "active",
        lockedPredictions: ["0"],
      });
      const result = transitionHypothesis(hypothesis, {
        type: "LOCK_PREDICTION",
        predictionIndex: 0,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("already locked");
    });

    it("rejects invalid prediction index", () => {
      const hypothesis = createTestHypothesisWithLifecycle({ state: "draft" });
      const result = transitionHypothesis(hypothesis, {
        type: "LOCK_PREDICTION",
        predictionIndex: 99,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid prediction index");
    });

    it("rejects negative prediction index", () => {
      const hypothesis = createTestHypothesisWithLifecycle({ state: "draft" });
      const result = transitionHypothesis(hypothesis, {
        type: "LOCK_PREDICTION",
        predictionIndex: -1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid prediction index");
    });

    it("rejects locking when no predictions exist", () => {
      const hypothesis = createTestHypothesisWithLifecycle({
        state: "draft",
        predictionsIfTrue: [],
        predictionsIfFalse: [],
      });
      const result = transitionHypothesis(hypothesis, {
        type: "LOCK_PREDICTION",
        predictionIndex: 0,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No predictions available");
    });
  });

  describe("START_TESTING", () => {
    it("transitions from active to testing", () => {
      const hypothesis = createTestHypothesisWithLifecycle({
        state: "active",
        lockedPredictions: ["0"],
      });
      const result = transitionHypothesis(hypothesis, { type: "START_TESTING" });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("testing");
    });

    it("transitions from supported back to testing", () => {
      const hypothesis = createTestHypothesisWithLifecycle({
        state: "supported",
        lockedPredictions: ["0"],
      });
      const result = transitionHypothesis(hypothesis, { type: "START_TESTING" });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("testing");
    });

    it("rejects when no predictions are locked", () => {
      const hypothesis = createTestHypothesisWithLifecycle({
        state: "active",
        lockedPredictions: [],
      });
      const result = transitionHypothesis(hypothesis, { type: "START_TESTING" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("lock at least one prediction");
    });

    it("rejects when no falsification conditions exist", () => {
      const hypothesis = createTestHypothesisWithLifecycle({
        state: "active",
        lockedPredictions: ["0"],
        impossibleIfTrue: [],
      });
      const result = transitionHypothesis(hypothesis, { type: "START_TESTING" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("falsification conditions");
    });
  });

  describe("RECORD_SUPPORT", () => {
    it("transitions from testing to supported", () => {
      const hypothesis = createTestHypothesisWithLifecycle({ state: "testing" });
      const result = transitionHypothesis(hypothesis, {
        type: "RECORD_SUPPORT",
        confidence: 75,
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("supported");
    });

    it("rejects from non-testing state", () => {
      const hypothesis = createTestHypothesisWithLifecycle({ state: "active" });
      const result = transitionHypothesis(hypothesis, {
        type: "RECORD_SUPPORT",
        confidence: 75,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot RECORD_SUPPORT from state 'active'");
    });
  });

  describe("RECORD_FALSIFICATION", () => {
    it("transitions from testing to falsified", () => {
      const hypothesis = createTestHypothesisWithLifecycle({ state: "testing" });
      const result = transitionHypothesis(hypothesis, {
        type: "RECORD_FALSIFICATION",
        reason: "Evidence contradicted prediction",
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("falsified");
      expect(result.hypothesis.falsificationReason).toBe("Evidence contradicted prediction");
    });

    it("generates archive side effect", () => {
      const hypothesis = createTestHypothesisWithLifecycle({ state: "testing" });
      const result = transitionHypothesis(hypothesis, {
        type: "RECORD_FALSIFICATION",
        reason: "Test failed",
      });

      expect(result.success).toBe(true);
      expect(result.sideEffects).toBeDefined();
      expect(result.sideEffects?.some((e) => e.type === "archive")).toBe(true);
    });
  });

  describe("CREATE_SUCCESSOR", () => {
    it("transitions from active to superseded", () => {
      const hypothesis = createTestHypothesisWithLifecycle({ state: "active" });
      const result = transitionHypothesis(hypothesis, {
        type: "CREATE_SUCCESSOR",
        successorId: "HC-TEST-002-v1",
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("superseded");
      expect(result.hypothesis.successorId).toBe("HC-TEST-002-v1");
    });

    it("transitions from testing to superseded", () => {
      const hypothesis = createTestHypothesisWithLifecycle({ state: "testing" });
      const result = transitionHypothesis(hypothesis, {
        type: "CREATE_SUCCESSOR",
        successorId: "HC-TEST-002-v1",
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("superseded");
    });

    it("transitions from supported to superseded", () => {
      const hypothesis = createTestHypothesisWithLifecycle({ state: "supported" });
      const result = transitionHypothesis(hypothesis, {
        type: "CREATE_SUCCESSOR",
        successorId: "HC-TEST-002-v1",
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("superseded");
    });

    it("generates successor link side effect", () => {
      const hypothesis = createTestHypothesisWithLifecycle({ state: "active" });
      const result = transitionHypothesis(hypothesis, {
        type: "CREATE_SUCCESSOR",
        successorId: "HC-TEST-002-v1",
      });

      expect(result.success).toBe(true);
      const linkEffect = result.sideEffects?.find((e) => e.type === "create_successor_link");
      expect(linkEffect).toBeDefined();
      expect(linkEffect?.payload.toId).toBe("HC-TEST-002-v1");
    });
  });

  describe("PAUSE", () => {
    it("transitions from active to dormant", () => {
      const hypothesis = createTestHypothesisWithLifecycle({ state: "active" });
      const result = transitionHypothesis(hypothesis, { type: "PAUSE" });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("dormant");
    });

    it("rejects from draft state", () => {
      const hypothesis = createTestHypothesisWithLifecycle({ state: "draft" });
      const result = transitionHypothesis(hypothesis, { type: "PAUSE" });

      expect(result.success).toBe(false);
    });
  });

  describe("RESUME", () => {
    it("transitions from dormant to active", () => {
      const hypothesis = createTestHypothesisWithLifecycle({ state: "dormant" });
      const result = transitionHypothesis(hypothesis, { type: "RESUME" });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("active");
    });

    it("updates lastActivityAt", () => {
      const oldDate = new Date("2025-01-01");
      const hypothesis = createTestHypothesisWithLifecycle({
        state: "dormant",
        lastActivityAt: oldDate,
      });
      const result = transitionHypothesis(hypothesis, { type: "RESUME" });

      expect(result.success).toBe(true);
      expect(result.hypothesis.lastActivityAt.getTime()).toBeGreaterThan(oldDate.getTime());
    });
  });

  describe("REACTIVATE", () => {
    it("transitions from dormant to draft", () => {
      const hypothesis = createTestHypothesisWithLifecycle({
        state: "dormant",
        lockedPredictions: ["0", "1"],
      });
      const result = transitionHypothesis(hypothesis, { type: "REACTIVATE" });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("draft");
      expect(result.hypothesis.lockedPredictions).toEqual([]);
    });

    it("clears state-specific fields", () => {
      const hypothesis = createTestHypothesisWithLifecycle({
        state: "dormant",
        successorId: "old-successor",
        falsificationReason: "old-reason",
      });
      const result = transitionHypothesis(hypothesis, { type: "REACTIVATE" });

      expect(result.success).toBe(true);
      expect(result.hypothesis.successorId).toBeUndefined();
      expect(result.hypothesis.falsificationReason).toBeUndefined();
    });
  });

  describe("ABANDON", () => {
    it("transitions from draft to falsified", () => {
      const hypothesis = createTestHypothesisWithLifecycle({ state: "draft" });
      const result = transitionHypothesis(hypothesis, {
        type: "ABANDON",
        reason: "User decided not to pursue",
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("falsified");
      expect(result.hypothesis.falsificationReason).toBe("User decided not to pursue");
    });

    it("transitions from dormant to falsified", () => {
      const hypothesis = createTestHypothesisWithLifecycle({ state: "dormant" });
      const result = transitionHypothesis(hypothesis, {
        type: "ABANDON",
        reason: "No longer relevant",
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("falsified");
    });

    it("uses default reason when not provided", () => {
      const hypothesis = createTestHypothesisWithLifecycle({ state: "draft" });
      const result = transitionHypothesis(hypothesis, {
        type: "ABANDON",
        reason: "",
      });

      expect(result.success).toBe(true);
      expect(result.hypothesis.falsificationReason).toBe("Abandoned by user");
    });
  });

  describe("Invalid transitions", () => {
    it("rejects transition from terminal falsified state", () => {
      const hypothesis = createTestHypothesisWithLifecycle({ state: "falsified" });
      const result = transitionHypothesis(hypothesis, { type: "RESUME" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot RESUME from state 'falsified'");
    });

    it("rejects transition from terminal superseded state", () => {
      const hypothesis = createTestHypothesisWithLifecycle({ state: "superseded" });
      const result = transitionHypothesis(hypothesis, { type: "REACTIVATE" });

      expect(result.success).toBe(false);
    });

    it("rejects unknown event type", () => {
      const hypothesis = createTestHypothesisWithLifecycle({ state: "draft" });
      // @ts-expect-error - Testing invalid event type
      const result = transitionHypothesis(hypothesis, { type: "INVALID_EVENT" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown event type");
    });
  });

  describe("Timestamp updates", () => {
    it("updates stateEnteredAt on transition", () => {
      const oldDate = new Date("2025-01-01");
      const hypothesis = createTestHypothesisWithLifecycle({
        stateEnteredAt: oldDate,
      });
      const result = transitionHypothesis(hypothesis, {
        type: "LOCK_PREDICTION",
        predictionIndex: 0,
      });

      expect(result.success).toBe(true);
      expect(result.hypothesis.stateEnteredAt.getTime()).toBeGreaterThan(oldDate.getTime());
    });

    it("updates lastActivityAt on transition", () => {
      const oldDate = new Date("2025-01-01");
      const hypothesis = createTestHypothesisWithLifecycle({
        lastActivityAt: oldDate,
      });
      const result = transitionHypothesis(hypothesis, {
        type: "LOCK_PREDICTION",
        predictionIndex: 0,
      });

      expect(result.success).toBe(true);
      expect(result.hypothesis.lastActivityAt.getTime()).toBeGreaterThan(oldDate.getTime());
    });

    it("updates updatedAt on transition", () => {
      const oldDate = new Date("2025-01-01");
      const hypothesis = createTestHypothesisWithLifecycle({
        updatedAt: oldDate,
      });
      const result = transitionHypothesis(hypothesis, {
        type: "LOCK_PREDICTION",
        predictionIndex: 0,
      });

      expect(result.success).toBe(true);
      expect(result.hypothesis.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
    });
  });
});

// ============================================================================
// Query Function Tests
// ============================================================================

describe("getAvailableTransitions", () => {
  it("returns correct transitions for draft state", () => {
    const hypothesis = createTestHypothesisWithLifecycle({ state: "draft" });
    const transitions = getAvailableTransitions(hypothesis);

    expect(transitions).toContain("LOCK_PREDICTION");
    expect(transitions).toContain("ABANDON");
    expect(transitions).not.toContain("START_TESTING");
  });

  it("returns correct transitions for active state", () => {
    const hypothesis = createTestHypothesisWithLifecycle({ state: "active" });
    const transitions = getAvailableTransitions(hypothesis);

    expect(transitions).toContain("LOCK_PREDICTION");
    expect(transitions).toContain("START_TESTING");
    expect(transitions).toContain("CREATE_SUCCESSOR");
    expect(transitions).toContain("PAUSE");
  });

  it("returns empty array for terminal states", () => {
    const falsified = createTestHypothesisWithLifecycle({ state: "falsified" });
    const superseded = createTestHypothesisWithLifecycle({ state: "superseded" });

    expect(getAvailableTransitions(falsified)).toEqual([]);
    expect(getAvailableTransitions(superseded)).toEqual([]);
  });
});

describe("canTransition", () => {
  it("returns true for valid state-based transitions", () => {
    const hypothesis = createTestHypothesisWithLifecycle({ state: "draft" });

    expect(canTransition(hypothesis, "LOCK_PREDICTION")).toBe(true);
    expect(canTransition(hypothesis, "ABANDON")).toBe(true);
  });

  it("returns false for invalid state-based transitions", () => {
    const hypothesis = createTestHypothesisWithLifecycle({ state: "draft" });

    expect(canTransition(hypothesis, "START_TESTING")).toBe(false);
    expect(canTransition(hypothesis, "PAUSE")).toBe(false);
  });

  it("returns false for unknown event types", () => {
    const hypothesis = createTestHypothesisWithLifecycle({ state: "draft" });

    // @ts-expect-error - Testing invalid event type
    expect(canTransition(hypothesis, "UNKNOWN")).toBe(false);
  });
});

describe("canTransitionWithEvent", () => {
  it("validates full event including parameters", () => {
    const hypothesis = createTestHypothesisWithLifecycle({ state: "draft" });

    expect(
      canTransitionWithEvent(hypothesis, {
        type: "LOCK_PREDICTION",
        predictionIndex: 0,
      }),
    ).toBe(true);

    expect(
      canTransitionWithEvent(hypothesis, {
        type: "LOCK_PREDICTION",
        predictionIndex: 99,
      }),
    ).toBe(false);
  });

  it("runs all guards", () => {
    const hypothesis = createTestHypothesisWithLifecycle({
      state: "active",
      lockedPredictions: [],
      impossibleIfTrue: [],
    });

    // Missing locked predictions should fail
    expect(canTransitionWithEvent(hypothesis, { type: "START_TESTING" })).toBe(false);
  });
});

describe("isTerminalState", () => {
  it("identifies falsified as terminal", () => {
    expect(isTerminalState("falsified")).toBe(true);
  });

  it("identifies superseded as terminal", () => {
    expect(isTerminalState("superseded")).toBe(true);
  });

  it("identifies non-terminal states correctly", () => {
    expect(isTerminalState("draft")).toBe(false);
    expect(isTerminalState("active")).toBe(false);
    expect(isTerminalState("testing")).toBe(false);
    expect(isTerminalState("supported")).toBe(false);
    expect(isTerminalState("dormant")).toBe(false);
  });
});

describe("isResolvable", () => {
  it("returns true for states that can reach terminal", () => {
    expect(isResolvable("draft")).toBe(true);
    expect(isResolvable("active")).toBe(true);
    expect(isResolvable("testing")).toBe(true);
    expect(isResolvable("supported")).toBe(true);
  });

  it("returns false for terminal states", () => {
    expect(isResolvable("falsified")).toBe(false);
    expect(isResolvable("superseded")).toBe(false);
  });

  it("returns false for dormant state", () => {
    expect(isResolvable("dormant")).toBe(false);
  });
});

describe("shouldBeDormant", () => {
  it("returns true when active and past threshold", () => {
    const now = new Date();
    const oldDate = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000); // 31 days ago
    const hypothesis = createTestHypothesisWithLifecycle({
      state: "active",
      lastActivityAt: oldDate,
      dormancyThresholdDays: 30,
    });

    expect(shouldBeDormant(hypothesis, now)).toBe(true);
  });

  it("returns false when active but within threshold", () => {
    const now = new Date();
    const recentDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
    const hypothesis = createTestHypothesisWithLifecycle({
      state: "active",
      lastActivityAt: recentDate,
      dormancyThresholdDays: 30,
    });

    expect(shouldBeDormant(hypothesis, now)).toBe(false);
  });

  it("returns false for non-active states", () => {
    const now = new Date();
    const oldDate = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
    const hypothesis = createTestHypothesisWithLifecycle({
      state: "draft",
      lastActivityAt: oldDate,
      dormancyThresholdDays: 30,
    });

    expect(shouldBeDormant(hypothesis, now)).toBe(false);
  });

  it("handles string dates from JSON deserialization", () => {
    const now = new Date();
    const oldDate = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
    const hypothesis = createTestHypothesisWithLifecycle({
      state: "active",
      dormancyThresholdDays: 30,
    });
    // Simulate JSON serialization/deserialization
    const serialized = JSON.parse(JSON.stringify(hypothesis));
    serialized.lastActivityAt = oldDate.toISOString();

    expect(shouldBeDormant(serialized, now)).toBe(true);
  });
});

// ============================================================================
// Type Guard Tests
// ============================================================================

describe("isHypothesisState", () => {
  it("accepts valid states", () => {
    const validStates: HypothesisState[] = [
      "draft",
      "active",
      "testing",
      "supported",
      "falsified",
      "superseded",
      "dormant",
    ];

    for (const state of validStates) {
      expect(isHypothesisState(state)).toBe(true);
    }
  });

  it("rejects invalid states", () => {
    expect(isHypothesisState("invalid")).toBe(false);
    expect(isHypothesisState("pending")).toBe(false);
    expect(isHypothesisState("")).toBe(false);
    expect(isHypothesisState(null)).toBe(false);
    expect(isHypothesisState(undefined)).toBe(false);
    expect(isHypothesisState(123)).toBe(false);
  });
});

describe("isHypothesisWithLifecycle", () => {
  it("accepts valid HypothesisWithLifecycle objects", () => {
    const hypothesis = createTestHypothesisWithLifecycle();
    expect(isHypothesisWithLifecycle(hypothesis)).toBe(true);
  });

  it("accepts objects with ISO date strings (from JSON)", () => {
    const hypothesis = createTestHypothesisWithLifecycle();
    const serialized = JSON.parse(JSON.stringify(hypothesis));
    expect(isHypothesisWithLifecycle(serialized)).toBe(true);
  });

  it("rejects null and undefined", () => {
    expect(isHypothesisWithLifecycle(null)).toBe(false);
    expect(isHypothesisWithLifecycle(undefined)).toBe(false);
  });

  it("rejects objects missing lifecycle fields", () => {
    const card = createTestHypothesisCard();
    expect(isHypothesisWithLifecycle(card)).toBe(false);
  });

  it("rejects objects with invalid state", () => {
    const hypothesis = createTestHypothesisWithLifecycle();
    // @ts-expect-error - Testing invalid state
    hypothesis.state = "invalid";
    expect(isHypothesisWithLifecycle(hypothesis)).toBe(false);
  });

  it("rejects objects with invalid date", () => {
    const hypothesis = createTestHypothesisWithLifecycle();
    // @ts-expect-error - Testing invalid date
    hypothesis.stateEnteredAt = "not-a-date";
    expect(isHypothesisWithLifecycle(hypothesis)).toBe(false);
  });

  it("rejects objects with non-array lockedPredictions", () => {
    const hypothesis = createTestHypothesisWithLifecycle();
    // @ts-expect-error - Testing invalid type
    hypothesis.lockedPredictions = "not-an-array";
    expect(isHypothesisWithLifecycle(hypothesis)).toBe(false);
  });

  it("rejects objects with non-number dormancyThresholdDays", () => {
    const hypothesis = createTestHypothesisWithLifecycle();
    // @ts-expect-error - Testing invalid type
    hypothesis.dormancyThresholdDays = "30";
    expect(isHypothesisWithLifecycle(hypothesis)).toBe(false);
  });
});

// ============================================================================
// Display Helper Tests
// ============================================================================

describe("getStateLabel", () => {
  it("returns correct labels for all states", () => {
    expect(getStateLabel("draft")).toBe("Draft");
    expect(getStateLabel("active")).toBe("Active");
    expect(getStateLabel("testing")).toBe("Testing");
    expect(getStateLabel("supported")).toBe("Supported");
    expect(getStateLabel("falsified")).toBe("Falsified");
    expect(getStateLabel("superseded")).toBe("Superseded");
    expect(getStateLabel("dormant")).toBe("Dormant");
  });
});

describe("getStateDescription", () => {
  it("returns descriptions for all states", () => {
    expect(getStateDescription("draft")).toContain("editable");
    expect(getStateDescription("testing")).toContain("Evidence");
    expect(getStateDescription("falsified")).toContain("refuted");
  });
});

describe("getStateIcon", () => {
  it("returns icon names for all states", () => {
    expect(getStateIcon("draft")).toBe("pencil");
    expect(getStateIcon("active")).toBe("play");
    expect(getStateIcon("testing")).toBe("beaker");
    expect(getStateIcon("supported")).toBe("check-circle");
    expect(getStateIcon("falsified")).toBe("x-circle");
    expect(getStateIcon("superseded")).toBe("arrow-right");
    expect(getStateIcon("dormant")).toBe("pause");
  });
});

describe("getStateColors", () => {
  it("returns color objects for all states", () => {
    const draftColors = getStateColors("draft");
    expect(draftColors).toHaveProperty("bg");
    expect(draftColors).toHaveProperty("text");
    expect(draftColors).toHaveProperty("border");
  });

  it("returns different colors for different states", () => {
    const draftBg = getStateColors("draft").bg;
    const activeBg = getStateColors("active").bg;
    const falsifiedBg = getStateColors("falsified").bg;

    expect(draftBg).not.toBe(activeBg);
    expect(activeBg).not.toBe(falsifiedBg);
  });
});

describe("isStateEditable", () => {
  it("returns true only for draft state", () => {
    expect(isStateEditable("draft")).toBe(true);
    expect(isStateEditable("active")).toBe(false);
    expect(isStateEditable("testing")).toBe(false);
    expect(isStateEditable("supported")).toBe(false);
    expect(isStateEditable("falsified")).toBe(false);
    expect(isStateEditable("superseded")).toBe(false);
    expect(isStateEditable("dormant")).toBe(false);
  });
});

describe("isStateDeletable", () => {
  it("returns true for draft and dormant", () => {
    expect(isStateDeletable("draft")).toBe(true);
    expect(isStateDeletable("dormant")).toBe(true);
  });

  it("returns false for other states", () => {
    expect(isStateDeletable("active")).toBe(false);
    expect(isStateDeletable("testing")).toBe(false);
    expect(isStateDeletable("supported")).toBe(false);
    expect(isStateDeletable("falsified")).toBe(false);
    expect(isStateDeletable("superseded")).toBe(false);
  });
});

// ============================================================================
// Statistics Tests
// ============================================================================

describe("calculateLifecycleStats", () => {
  it("calculates stats for empty array", () => {
    const stats = calculateLifecycleStats([]);

    expect(stats.totalHypotheses).toBe(0);
    expect(stats.avgDaysInDraft).toBe(0);
    expect(stats.avgDaysToResolution).toBe(0);
    expect(stats.falsificationRate).toBe(0);
    expect(stats.supersessionRate).toBe(0);
  });

  it("counts hypotheses by state", () => {
    const hypotheses = [
      createTestHypothesisWithLifecycle({ state: "draft" }),
      createTestHypothesisWithLifecycle({ state: "active" }),
      createTestHypothesisWithLifecycle({ state: "active" }),
      createTestHypothesisWithLifecycle({ state: "falsified" }),
    ];

    const stats = calculateLifecycleStats(hypotheses);

    expect(stats.totalHypotheses).toBe(4);
    expect(stats.byState.draft).toBe(1);
    expect(stats.byState.active).toBe(2);
    expect(stats.byState.falsified).toBe(1);
    expect(stats.byState.testing).toBe(0);
  });

  it("calculates falsification rate", () => {
    const hypotheses = [
      createTestHypothesisWithLifecycle({ state: "draft" }),
      createTestHypothesisWithLifecycle({ state: "falsified" }),
      createTestHypothesisWithLifecycle({ state: "falsified" }),
      createTestHypothesisWithLifecycle({ state: "supported" }),
    ];

    const stats = calculateLifecycleStats(hypotheses);

    expect(stats.falsificationRate).toBe(0.5); // 2 out of 4
  });

  it("calculates supersession rate", () => {
    const hypotheses = [
      createTestHypothesisWithLifecycle({ state: "active" }),
      createTestHypothesisWithLifecycle({ state: "superseded" }),
      createTestHypothesisWithLifecycle({ state: "supported" }),
      createTestHypothesisWithLifecycle({ state: "supported" }),
    ];

    const stats = calculateLifecycleStats(hypotheses);

    expect(stats.supersessionRate).toBe(0.25); // 1 out of 4
  });

  it("calculates average days to resolution", () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const hypotheses = [
      createTestHypothesisWithLifecycle({
        state: "falsified",
        createdAt: twoWeeksAgo,
        stateEnteredAt: oneWeekAgo, // 7 days to resolution
      }),
    ];

    const stats = calculateLifecycleStats(hypotheses);

    expect(stats.avgDaysToResolution).toBeCloseTo(7, 0);
  });

  it("handles JSON-serialized dates", () => {
    const hypothesis = createTestHypothesisWithLifecycle({ state: "active" });
    const serialized = JSON.parse(JSON.stringify([hypothesis]));

    const stats = calculateLifecycleStats(serialized);

    expect(stats.totalHypotheses).toBe(1);
    expect(stats.byState.active).toBe(1);
  });
});

// ============================================================================
// State Config Tests
// ============================================================================

describe("HYPOTHESIS_STATE_CONFIG", () => {
  it("has configuration for all states", () => {
    const states: HypothesisState[] = [
      "draft",
      "active",
      "testing",
      "supported",
      "falsified",
      "superseded",
      "dormant",
    ];

    for (const state of states) {
      expect(HYPOTHESIS_STATE_CONFIG[state]).toBeDefined();
      expect(HYPOTHESIS_STATE_CONFIG[state].label).toBeDefined();
      expect(HYPOTHESIS_STATE_CONFIG[state].description).toBeDefined();
      expect(HYPOTHESIS_STATE_CONFIG[state].icon).toBeDefined();
      expect(HYPOTHESIS_STATE_CONFIG[state].color).toBeDefined();
      expect(typeof HYPOTHESIS_STATE_CONFIG[state].editable).toBe("boolean");
      expect(typeof HYPOTHESIS_STATE_CONFIG[state].deletable).toBe("boolean");
      expect(Array.isArray(HYPOTHESIS_STATE_CONFIG[state].transitions)).toBe(true);
    }
  });

  it("terminal states have no transitions", () => {
    expect(HYPOTHESIS_STATE_CONFIG.falsified.transitions).toEqual([]);
    expect(HYPOTHESIS_STATE_CONFIG.superseded.transitions).toEqual([]);
  });
});
