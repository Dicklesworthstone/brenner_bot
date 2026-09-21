/**
 * Unit tests for Session State Machine
 *
 * Tests the XState-style state machine governing session phase transitions.
 * Covers: phase transitions, guards, helper functions, and edge cases.
 *
 * @see brenner_bot-3385 (bead)
 * @see brenner-loop/session-machine.ts
 */

import { describe, expect, it } from "vitest";
import {
  canGoBack,
  canSend,
  canTransitionTo,
  getAvailableEvents,
  getDefaultNextPhase,
  getPhaseDescription,
  getPhaseName,
  getPhaseSymbol,
  getReachablePhases,
  hasAgentResponses,
  hasEvidence,
  hasPendingAgentRequests,
  hasPredictions,
  hasPrimaryHypothesis,
  isComplete,
  sessionMachineConfig,
  transition,
} from "./session-machine";
import type { HypothesisCard, Session, SessionPhase } from "./types";
import {
  CURRENT_SESSION_VERSION,
  createSession as createEmptySession,
  generateSessionId,
  isAgentRole,
  isSession,
  isSessionPhase,
  isValidTransition,
  toSimplifiedPhase,
} from "./types";

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
    predictionsIfTrue: ["Prediction 1 if true"],
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

function createTestSession(overrides: Partial<Session> = {}): Session {
  const hypothesisId = "HC-TEST-001-v1";
  const hypothesis = createTestHypothesisCard({ id: hypothesisId });

  return {
    id: "SESSION-20260101-001",
    _version: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    phase: "intake",
    primaryHypothesisId: hypothesisId,
    alternativeHypothesisIds: [],
    archivedHypothesisIds: [],
    hypothesisCards: { [hypothesisId]: hypothesis },
    hypothesisEvolution: [],
    operatorApplications: {
      levelSplit: [],
      exclusionTest: [],
      objectTranspose: [],
      scaleCheck: [],
    },
    predictionIds: [],
    testIds: [],
    assumptionIds: [],
    pendingAgentRequests: [],
    agentResponses: [],
    evidenceLedger: [],
    artifacts: [],
    commits: [],
    headCommitId: "",
    ...overrides,
  };
}

// ============================================================================
// Guard Function Tests
// ============================================================================

describe("Guard Functions", () => {
  describe("hasPrimaryHypothesis", () => {
    it("returns true when hypothesis exists", () => {
      const session = createTestSession();
      expect(hasPrimaryHypothesis(session, { type: "CONTINUE" })).toBe(true);
    });

    it("returns false when primaryHypothesisId is empty", () => {
      const session = createTestSession({ primaryHypothesisId: "" });
      expect(hasPrimaryHypothesis(session, { type: "CONTINUE" })).toBe(false);
    });

    it("returns false when hypothesis not in cards", () => {
      const session = createTestSession({
        primaryHypothesisId: "non-existent",
      });
      expect(hasPrimaryHypothesis(session, { type: "CONTINUE" })).toBe(false);
    });
  });

  describe("hasPredictions", () => {
    it("returns true when hypothesis has predictions", () => {
      const session = createTestSession();
      expect(hasPredictions(session, { type: "CONTINUE" })).toBe(true);
    });

    it("returns false when predictionsIfTrue is empty", () => {
      const hypothesis = createTestHypothesisCard({
        predictionsIfTrue: [],
      });
      const session = createTestSession({
        hypothesisCards: { [hypothesis.id]: hypothesis },
        primaryHypothesisId: hypothesis.id,
      });
      expect(hasPredictions(session, { type: "CONTINUE" })).toBe(false);
    });

    it("returns false when impossibleIfTrue is empty", () => {
      const hypothesis = createTestHypothesisCard({
        impossibleIfTrue: [],
      });
      const session = createTestSession({
        hypothesisCards: { [hypothesis.id]: hypothesis },
        primaryHypothesisId: hypothesis.id,
      });
      expect(hasPredictions(session, { type: "CONTINUE" })).toBe(false);
    });
  });

  describe("canTransitionTo", () => {
    it("allows valid transitions", () => {
      const session = createTestSession({ phase: "intake" });
      const guard = canTransitionTo("sharpening");
      expect(guard(session, { type: "CONTINUE" })).toBe(true);
    });

    it("rejects invalid transitions", () => {
      const session = createTestSession({ phase: "intake" });
      const guard = canTransitionTo("complete");
      expect(guard(session, { type: "CONTINUE" })).toBe(false);
    });
  });

  describe("hasPendingAgentRequests", () => {
    it("returns true when pending requests exist", () => {
      const session = createTestSession({
        pendingAgentRequests: [
          {
            threadId: "thread-1",
            agentName: "Skeptic",
            role: "adversarial_critic",
            status: "pending",
            requestedAt: "2026-01-01T00:00:00Z",
          },
        ],
      });
      expect(hasPendingAgentRequests(session, { type: "CONTINUE" })).toBe(true);
    });

    it("returns false when no pending requests", () => {
      const session = createTestSession({ pendingAgentRequests: [] });
      expect(hasPendingAgentRequests(session, { type: "CONTINUE" })).toBe(false);
    });

    it("returns false when all requests are completed", () => {
      const session = createTestSession({
        pendingAgentRequests: [
          {
            threadId: "thread-1",
            agentName: "Skeptic",
            role: "adversarial_critic",
            status: "completed",
            requestedAt: "2026-01-01T00:00:00Z",
          },
        ],
      });
      expect(hasPendingAgentRequests(session, { type: "CONTINUE" })).toBe(false);
    });
  });

  describe("hasAgentResponses", () => {
    it("returns true when responses exist", () => {
      const session = createTestSession({
        agentResponses: [
          {
            id: "resp-1",
            agentName: "Skeptic",
            role: "adversarial_critic",
            threadId: "thread-1",
            messageId: 100,
            receivedAt: "2026-01-01T00:00:00Z",
            acknowledged: false,
            summary: "Test response",
          },
        ],
      });
      expect(hasAgentResponses(session, { type: "CONTINUE" })).toBe(true);
    });

    it("returns false when no responses", () => {
      const session = createTestSession({ agentResponses: [] });
      expect(hasAgentResponses(session, { type: "CONTINUE" })).toBe(false);
    });
  });

  describe("hasEvidence", () => {
    it("returns true when evidence exists", () => {
      const session = createTestSession({
        evidenceLedger: [
          {
            id: "ev-1",
            testId: "T-1",
            recordedAt: "2026-01-01T00:00:00Z",
            observation: "Test evidence",
            result: "supports",
            potencyCheckPassed: true,
            recordedBy: "user",
          },
        ],
      });
      expect(hasEvidence(session, { type: "CONTINUE" })).toBe(true);
    });

    it("returns false when no evidence", () => {
      const session = createTestSession({ evidenceLedger: [] });
      expect(hasEvidence(session, { type: "CONTINUE" })).toBe(false);
    });
  });
});

// ============================================================================
// Phase Transition Tests
// ============================================================================

describe("transition", () => {
  describe("intake phase", () => {
    it("transitions to sharpening on SUBMIT_HYPOTHESIS", () => {
      const session = createTestSession({ phase: "intake" });
      const hypothesis = createTestHypothesisCard();
      const result = transition(session, {
        type: "SUBMIT_HYPOTHESIS",
        hypothesis,
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("sharpening");
    });

    it("updates primary hypothesis on SUBMIT_HYPOTHESIS", () => {
      const session = createTestSession({
        phase: "intake",
        primaryHypothesisId: "",
      });
      const hypothesis = createTestHypothesisCard();
      const result = transition(session, {
        type: "SUBMIT_HYPOTHESIS",
        hypothesis,
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("sharpening");
      expect(result.session.primaryHypothesisId).toBe(hypothesis.id);
      expect(result.session.hypothesisCards[hypothesis.id]).toBeDefined();
    });

    it("rejects invalid events", () => {
      const session = createTestSession({ phase: "intake" });
      const result = transition(session, { type: "BACK" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not valid");
    });
  });

  describe("sharpening phase", () => {
    it("stays in sharpening on REFINE", () => {
      const session = createTestSession({ phase: "sharpening" });
      const result = transition(session, {
        type: "REFINE",
        updates: { confidence: 60 },
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("sharpening");
    });

    it("transitions to level_split on CONTINUE with predictions", () => {
      const session = createTestSession({ phase: "sharpening" });
      const result = transition(session, { type: "CONTINUE" });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("level_split");
    });

    it("fails CONTINUE without predictions", () => {
      const hypothesis = createTestHypothesisCard({
        predictionsIfTrue: [],
      });
      const session = createTestSession({
        phase: "sharpening",
        hypothesisCards: { [hypothesis.id]: hypothesis },
        primaryHypothesisId: hypothesis.id,
      });
      const result = transition(session, { type: "CONTINUE" });

      expect(result.success).toBe(false);
    });

    it("transitions to agent_dispatch on SKIP_OPERATORS", () => {
      const session = createTestSession({ phase: "sharpening" });
      const result = transition(session, { type: "SKIP_OPERATORS" });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("agent_dispatch");
    });
  });

  describe("operator phases", () => {
    it("level_split -> exclusion_test on COMPLETE_OPERATOR", () => {
      const session = createTestSession({ phase: "level_split" });
      const result = transition(session, {
        type: "COMPLETE_OPERATOR",
        result: {},
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("exclusion_test");
    });

    it("level_split -> exclusion_test on SKIP_OPERATOR", () => {
      const session = createTestSession({ phase: "level_split" });
      const result = transition(session, { type: "SKIP_OPERATOR" });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("exclusion_test");
    });

    it("level_split -> sharpening on BACK", () => {
      const session = createTestSession({ phase: "level_split" });
      const result = transition(session, { type: "BACK" });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("sharpening");
    });

    it("exclusion_test -> object_transpose on COMPLETE_OPERATOR", () => {
      const session = createTestSession({ phase: "exclusion_test" });
      const result = transition(session, {
        type: "COMPLETE_OPERATOR",
        result: {},
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("object_transpose");
    });

    it("object_transpose -> scale_check on COMPLETE_OPERATOR", () => {
      const session = createTestSession({ phase: "object_transpose" });
      const result = transition(session, {
        type: "COMPLETE_OPERATOR",
        result: {},
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("scale_check");
    });

    it("scale_check -> agent_dispatch on COMPLETE_OPERATOR", () => {
      const session = createTestSession({ phase: "scale_check" });
      const result = transition(session, {
        type: "COMPLETE_OPERATOR",
        result: {},
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("agent_dispatch");
    });
  });

  describe("agent_dispatch phase", () => {
    it("stays in agent_dispatch on DISPATCH_AGENTS", () => {
      const session = createTestSession({ phase: "agent_dispatch" });
      const result = transition(session, { type: "DISPATCH_AGENTS" });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("agent_dispatch");
    });

    it("transitions to synthesis on RESPONSES_RECEIVED with responses", () => {
      const session = createTestSession({
        phase: "agent_dispatch",
        agentResponses: [
          {
            id: "resp-1",
            agentName: "Skeptic",
            role: "adversarial_critic",
            threadId: "thread-1",
            messageId: 100,
            receivedAt: "2026-01-01T00:00:00Z",
            acknowledged: false,
            summary: "Test response",
          },
        ],
      });
      const result = transition(session, { type: "RESPONSES_RECEIVED" });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("synthesis");
    });

    it("fails RESPONSES_RECEIVED without responses", () => {
      const session = createTestSession({
        phase: "agent_dispatch",
        agentResponses: [],
      });
      const result = transition(session, { type: "RESPONSES_RECEIVED" });

      expect(result.success).toBe(false);
    });

    it("transitions to evidence_gathering on SKIP_AGENTS", () => {
      const session = createTestSession({ phase: "agent_dispatch" });
      const result = transition(session, { type: "SKIP_AGENTS" });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("evidence_gathering");
    });
  });

  describe("synthesis phase", () => {
    it("transitions to evidence_gathering on COMPLETE_SYNTHESIS", () => {
      const session = createTestSession({ phase: "synthesis" });
      const result = transition(session, { type: "COMPLETE_SYNTHESIS" });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("evidence_gathering");
    });

    it("transitions to complete on COMPLETE_SESSION", () => {
      const session = createTestSession({ phase: "synthesis" });
      const result = transition(session, { type: "COMPLETE_SESSION" });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("complete");
    });
  });

  describe("evidence_gathering phase", () => {
    it("stays in evidence_gathering on ADD_EVIDENCE", () => {
      const session = createTestSession({ phase: "evidence_gathering" });
      const result = transition(session, {
        type: "ADD_EVIDENCE",
        evidence: {},
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("evidence_gathering");
    });

    it("transitions to revision on REVISE_HYPOTHESIS", () => {
      const session = createTestSession({ phase: "evidence_gathering" });
      const result = transition(session, { type: "REVISE_HYPOTHESIS" });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("revision");
    });

    it("transitions to complete on COMPLETE_SESSION", () => {
      const session = createTestSession({ phase: "evidence_gathering" });
      const result = transition(session, { type: "COMPLETE_SESSION" });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("complete");
    });
  });

  describe("revision phase", () => {
    it("transitions to evidence_gathering on SAVE_REVISION", () => {
      const session = createTestSession({ phase: "revision" });
      const result = transition(session, { type: "SAVE_REVISION" });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("evidence_gathering");
    });

    it("transitions to level_split on RESTART_OPERATORS", () => {
      const session = createTestSession({ phase: "revision" });
      const result = transition(session, { type: "RESTART_OPERATORS" });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("level_split");
    });

    it("transitions to complete on COMPLETE_SESSION", () => {
      const session = createTestSession({ phase: "revision" });
      const result = transition(session, { type: "COMPLETE_SESSION" });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("complete");
    });
  });

  describe("complete (final) state", () => {
    it("rejects all transitions", () => {
      const session = createTestSession({ phase: "complete" });
      const result = transition(session, { type: "BACK" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("final state");
    });
  });

  describe("GO_TO_PHASE event", () => {
    it("transitions to valid target phase", () => {
      const session = createTestSession({ phase: "sharpening" });
      const result = transition(session, {
        type: "GO_TO_PHASE",
        phase: "level_split",
      });

      expect(result.success).toBe(true);
      expect(result.newState).toBe("level_split");
    });

    it("fails for invalid target phase", () => {
      const session = createTestSession({ phase: "sharpening" });
      const result = transition(session, {
        type: "GO_TO_PHASE",
        phase: "complete",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot transition");
    });

    it("fails when GO_TO_PHASE not allowed", () => {
      const session = createTestSession({ phase: "intake" });
      const result = transition(session, {
        type: "GO_TO_PHASE",
        phase: "sharpening",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not allowed");
    });
  });

  describe("unknown state handling", () => {
    it("returns error for unknown state", () => {
      const session = createTestSession();
      // @ts-expect-error - Testing invalid state
      session.phase = "unknown_state";
      const result = transition(session, { type: "CONTINUE" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown state");
    });
  });

  describe("timestamp updates", () => {
    it("updates updatedAt on successful transition", () => {
      const session = createTestSession({
        phase: "intake",
        updatedAt: "2026-01-01T00:00:00Z",
      });
      const hypothesis = createTestHypothesisCard();
      const result = transition(session, {
        type: "SUBMIT_HYPOTHESIS",
        hypothesis,
      });

      expect(result.success).toBe(true);
      expect(result.session.updatedAt).not.toBe("2026-01-01T00:00:00Z");
    });
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("getAvailableEvents", () => {
  it("returns events for intake phase", () => {
    const session = createTestSession({ phase: "intake" });
    const events = getAvailableEvents(session);

    expect(events).toContain("SUBMIT_HYPOTHESIS");
  });

  it("returns events for sharpening phase", () => {
    const session = createTestSession({ phase: "sharpening" });
    const events = getAvailableEvents(session);

    expect(events).toContain("REFINE");
    expect(events).toContain("CONTINUE");
    expect(events).toContain("SKIP_OPERATORS");
    expect(events).toContain("GO_TO_PHASE");
  });

  it("returns empty array for final state", () => {
    const session = createTestSession({ phase: "complete" });
    const events = getAvailableEvents(session);

    expect(events).toEqual([]);
  });
});

describe("getReachablePhases", () => {
  it("returns reachable phases from sharpening", () => {
    const session = createTestSession({ phase: "sharpening" });
    const phases = getReachablePhases(session);

    expect(phases).toContain("sharpening"); // REFINE stays
    expect(phases).toContain("level_split"); // CONTINUE or GO_TO_PHASE
    expect(phases).toContain("agent_dispatch"); // SKIP_OPERATORS or GO_TO_PHASE
  });

  it("respects guard conditions", () => {
    const hypothesis = createTestHypothesisCard({
      predictionsIfTrue: [], // No predictions
    });
    const session = createTestSession({
      phase: "sharpening",
      hypothesisCards: { [hypothesis.id]: hypothesis },
      primaryHypothesisId: hypothesis.id,
    });
    const phases = getReachablePhases(session);

    // CONTINUE requires hasPredictions, so level_split should not be reachable
    expect(phases).toContain("sharpening"); // REFINE
  });

  it("returns empty for final state", () => {
    const session = createTestSession({ phase: "complete" });
    const phases = getReachablePhases(session);

    expect(phases).toEqual([]);
  });
});

describe("canSend", () => {
  it("returns true for valid event in state", () => {
    const session = createTestSession({ phase: "sharpening" });
    expect(canSend(session, "REFINE")).toBe(true);
  });

  it("returns false for invalid event in state", () => {
    const session = createTestSession({ phase: "intake" });
    expect(canSend(session, "BACK")).toBe(false);
  });

  it("returns false for final state", () => {
    const session = createTestSession({ phase: "complete" });
    expect(canSend(session, "BACK")).toBe(false);
  });

  it("respects guard conditions", () => {
    const hypothesis = createTestHypothesisCard({
      predictionsIfTrue: [],
    });
    const session = createTestSession({
      phase: "sharpening",
      hypothesisCards: { [hypothesis.id]: hypothesis },
      primaryHypothesisId: hypothesis.id,
    });
    // CONTINUE requires hasPredictions
    expect(canSend(session, "CONTINUE")).toBe(false);
  });
});

describe("canGoBack", () => {
  it("returns true when BACK is available", () => {
    const session = createTestSession({ phase: "level_split" });
    expect(canGoBack(session)).toBe(true);
  });

  it("returns false when BACK is not available", () => {
    const session = createTestSession({ phase: "intake" });
    expect(canGoBack(session)).toBe(false);
  });
});

describe("isComplete", () => {
  it("returns true for complete state", () => {
    const session = createTestSession({ phase: "complete" });
    expect(isComplete(session)).toBe(true);
  });

  it("returns false for non-complete states", () => {
    const phases: SessionPhase[] = [
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
    ];

    for (const phase of phases) {
      const session = createTestSession({ phase });
      expect(isComplete(session)).toBe(false);
    }
  });
});

describe("getDefaultNextPhase", () => {
  it("returns next phase for intake (no default)", () => {
    const session = createTestSession({ phase: "intake" });
    // intake doesn't have CONTINUE/COMPLETE_OPERATOR etc.
    expect(getDefaultNextPhase(session)).toBeNull();
  });

  it("returns level_split for sharpening with predictions", () => {
    const session = createTestSession({ phase: "sharpening" });
    expect(getDefaultNextPhase(session)).toBe("level_split");
  });

  it("returns null when guard fails", () => {
    const hypothesis = createTestHypothesisCard({
      predictionsIfTrue: [],
    });
    const session = createTestSession({
      phase: "sharpening",
      hypothesisCards: { [hypothesis.id]: hypothesis },
      primaryHypothesisId: hypothesis.id,
    });
    expect(getDefaultNextPhase(session)).toBeNull();
  });

  it("returns exclusion_test for level_split", () => {
    const session = createTestSession({ phase: "level_split" });
    expect(getDefaultNextPhase(session)).toBe("exclusion_test");
  });

  it("returns null for final state", () => {
    const session = createTestSession({ phase: "complete" });
    expect(getDefaultNextPhase(session)).toBeNull();
  });
});

describe("getPhaseName", () => {
  it("returns human-readable names for all phases", () => {
    expect(getPhaseName("intake")).toBe("Hypothesis Intake");
    expect(getPhaseName("sharpening")).toBe("Hypothesis Sharpening");
    expect(getPhaseName("level_split")).toBe("Level Split");
    expect(getPhaseName("exclusion_test")).toBe("Exclusion Test");
    expect(getPhaseName("object_transpose")).toBe("Object Transpose");
    expect(getPhaseName("scale_check")).toBe("Scale Check");
    expect(getPhaseName("agent_dispatch")).toBe("Agent Dispatch");
    expect(getPhaseName("synthesis")).toBe("Synthesis");
    expect(getPhaseName("evidence_gathering")).toBe("Evidence Gathering");
    expect(getPhaseName("revision")).toBe("Revision");
    expect(getPhaseName("complete")).toBe("Complete");
  });
});

describe("getPhaseDescription", () => {
  it("returns descriptions for all phases", () => {
    expect(getPhaseDescription("intake")).toContain("hypothesis");
    expect(getPhaseDescription("sharpening")).toContain("Refine");
    expect(getPhaseDescription("level_split")).toContain("levels");
    expect(getPhaseDescription("exclusion_test")).toContain("rule out");
    expect(getPhaseDescription("agent_dispatch")).toContain("agent");
    expect(getPhaseDescription("complete")).toContain("complete");
  });
});

describe("getPhaseSymbol", () => {
  it("returns symbols for operator phases", () => {
    expect(getPhaseSymbol("level_split")).toBe("⊘");
    expect(getPhaseSymbol("exclusion_test")).toBe("✂");
    expect(getPhaseSymbol("object_transpose")).toBe("⟂");
    expect(getPhaseSymbol("scale_check")).toBe("⊞");
  });

  it("returns null for non-operator phases", () => {
    expect(getPhaseSymbol("intake")).toBeNull();
    expect(getPhaseSymbol("sharpening")).toBeNull();
    expect(getPhaseSymbol("agent_dispatch")).toBeNull();
    expect(getPhaseSymbol("synthesis")).toBeNull();
    expect(getPhaseSymbol("complete")).toBeNull();
  });
});

// ============================================================================
// Machine Configuration Tests
// ============================================================================

describe("sessionMachineConfig", () => {
  it("has correct initial state", () => {
    expect(sessionMachineConfig.initial).toBe("intake");
  });

  it("has all 11 phases defined", () => {
    const phases: SessionPhase[] = [
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
    ];

    for (const phase of phases) {
      expect(sessionMachineConfig.states[phase]).toBeDefined();
    }
  });

  it("marks complete as final state", () => {
    expect(sessionMachineConfig.states.complete.final).toBe(true);
  });

  it("has transitions for all non-final states", () => {
    const phases: SessionPhase[] = [
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
    ];

    for (const phase of phases) {
      const state = sessionMachineConfig.states[phase];
      expect(Object.keys(state.on).length).toBeGreaterThan(0);
    }
  });

  it("complete state has no transitions", () => {
    const completeState = sessionMachineConfig.states.complete;
    expect(Object.keys(completeState.on).length).toBe(0);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Full Session Flow", () => {
  it("completes full operator sequence", () => {
    let session = createTestSession({ phase: "intake" });
    const hypothesis = createTestHypothesisCard();

    // intake -> sharpening
    let result = transition(session, { type: "SUBMIT_HYPOTHESIS", hypothesis });
    expect(result.success).toBe(true);
    session = result.session;

    // sharpening -> level_split
    result = transition(session, { type: "CONTINUE" });
    expect(result.success).toBe(true);
    session = result.session;

    // level_split -> exclusion_test
    result = transition(session, { type: "COMPLETE_OPERATOR", result: {} });
    expect(result.success).toBe(true);
    session = result.session;

    // exclusion_test -> object_transpose
    result = transition(session, { type: "COMPLETE_OPERATOR", result: {} });
    expect(result.success).toBe(true);
    session = result.session;

    // object_transpose -> scale_check
    result = transition(session, { type: "COMPLETE_OPERATOR", result: {} });
    expect(result.success).toBe(true);
    session = result.session;

    // scale_check -> agent_dispatch
    result = transition(session, { type: "COMPLETE_OPERATOR", result: {} });
    expect(result.success).toBe(true);
    session = result.session;
    expect(session.phase).toBe("agent_dispatch");
  });

  it("supports skipping operators", () => {
    let session = createTestSession({ phase: "intake" });
    const hypothesis = createTestHypothesisCard();

    // intake -> sharpening
    let result = transition(session, { type: "SUBMIT_HYPOTHESIS", hypothesis });
    session = result.session;

    // sharpening -> agent_dispatch (skip all operators)
    result = transition(session, { type: "SKIP_OPERATORS" });
    expect(result.success).toBe(true);
    session = result.session;
    expect(session.phase).toBe("agent_dispatch");
  });

  it("supports back navigation through operators", () => {
    let session = createTestSession({ phase: "exclusion_test" });

    // exclusion_test -> level_split
    let result = transition(session, { type: "BACK" });
    expect(result.success).toBe(true);
    session = result.session;

    // level_split -> sharpening
    result = transition(session, { type: "BACK" });
    expect(result.success).toBe(true);
    session = result.session;
    expect(session.phase).toBe("sharpening");
  });

  it("supports revision cycle back to operators", () => {
    const session = createTestSession({ phase: "revision" });

    // revision -> level_split
    const result = transition(session, { type: "RESTART_OPERATORS" });
    expect(result.success).toBe(true);
    expect(result.newState).toBe("level_split");
  });
});

describe("types utilities", () => {
  it("maps detailed phases and validates transitions", () => {
    expect(toSimplifiedPhase("intake")).toBe("intake");
    expect(toSimplifiedPhase("level_split")).toBe("refinement");
    expect(toSimplifiedPhase("agent_dispatch")).toBe("testing");
    expect(toSimplifiedPhase("complete")).toBe("synthesis");

    expect(isValidTransition("intake", "sharpening")).toBe(true);
    expect(isValidTransition("level_split", "sharpening")).toBe(true);
    expect(isValidTransition("exclusion_test", "level_split")).toBe(true);
    expect(isValidTransition("revision", "level_split")).toBe(true);
    expect(isValidTransition("intake", "complete")).toBe(false);
    expect(isValidTransition("complete", "intake")).toBe(false);
  });

  it("supports basic type guards and factories", () => {
    expect(isSessionPhase("intake")).toBe(true);
    expect(isSessionPhase("not-a-phase")).toBe(false);
    expect(isAgentRole("test_designer")).toBe(true);
    expect(isAgentRole("not-a-role")).toBe(false);

    const session = createEmptySession({ id: "SESSION-TYPES-001", researchQuestion: "Q" });
    expect(session._version).toBe(CURRENT_SESSION_VERSION);
    expect(isSession(session)).toBe(true);
    expect(isSession({})).toBe(false);

    // Test ID format matches pattern SESSION-YYYYMMDD-NNN
    const first = generateSessionId();
    expect(first).toMatch(/^SESSION-\d{8}-001$/);

    // Test sequence increment with existing IDs
    const next = generateSessionId([first, first.replace("-001", "-002")]);
    expect(next).toMatch(/^SESSION-\d{8}-003$/);
  });
});
