/**
 * Tests for Undo/Redo Manager
 *
 * @see brenner_bot-sedg (Undo/Redo System)
 */

import { beforeEach, describe, expect, it } from "vitest";
import type { Session } from "./types";
import {
  applyCommand,
  canRedo,
  canUndo,
  clearHistory,
  createAddTagCommand,
  createArchiveCommand,
  createConfidenceCommand,
  createEvidenceCommand,
  createNotesCommand,
  createPhaseCommand,
  createRemoveTagCommand,
  createRestoreCommand,
  createSetPrimaryCommand,
  createUndoStack,
  deserializeUndoStack,
  executeCommand,
  generateCommandId,
  getNextRedoDescription,
  getNextUndoDescription,
  getRecentHistory,
  isConfidenceCommand,
  isEvidenceCommand,
  isHypothesisStateCommand,
  isPhaseCommand,
  redo,
  reverseCommand,
  serializeUndoStack,
  undo,
} from "./undoManager";

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestSession(): Session {
  const testDate = new Date("2026-01-05T00:00:00Z");
  return {
    id: "SESSION-2026-01-05-001",
    _version: 1,
    createdAt: "2026-01-05T00:00:00Z",
    updatedAt: "2026-01-05T00:00:00Z",
    phase: "sharpening",
    primaryHypothesisId: "hypo-1",
    alternativeHypothesisIds: ["hypo-2", "hypo-3"],
    archivedHypothesisIds: [],
    hypothesisCards: {
      "hypo-1": {
        id: "hypo-1",
        sessionId: "SESSION-2026-01-05-001",
        version: 1,
        createdAt: testDate,
        updatedAt: testDate,
        statement: "Test hypothesis 1: testing domain, unit tests context",
        mechanism: "Test mechanism 1",
        domain: ["testing"],
        predictionsIfTrue: ["Prediction 1"],
        predictionsIfFalse: ["Prediction 2"],
        impossibleIfTrue: ["Falsification condition 1"],
        confidence: 50,
        confounds: [],
        assumptions: [],
        tags: [],
      },
      "hypo-2": {
        id: "hypo-2",
        sessionId: "SESSION-2026-01-05-001",
        version: 1,
        createdAt: testDate,
        updatedAt: testDate,
        statement: "Test hypothesis 2: testing domain, unit tests context",
        mechanism: "Test mechanism 2",
        domain: ["testing"],
        predictionsIfTrue: ["Prediction 1"],
        predictionsIfFalse: ["Prediction 2"],
        impossibleIfTrue: ["Falsification condition 1"],
        confidence: 60,
        confounds: [],
        assumptions: [],
        tags: [],
      },
      "hypo-3": {
        id: "hypo-3",
        sessionId: "SESSION-2026-01-05-001",
        version: 1,
        createdAt: testDate,
        updatedAt: testDate,
        statement: "Test hypothesis 3: testing domain, unit tests context",
        mechanism: "Test mechanism 3",
        domain: ["testing"],
        predictionsIfTrue: ["Prediction 1"],
        predictionsIfFalse: ["Prediction 2"],
        impossibleIfTrue: ["Falsification condition 1"],
        confidence: 40,
        confounds: [],
        assumptions: [],
        tags: [],
      },
    },
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
    tags: ["test"],
    notes: "Test session",
  };
}

// ============================================================================
// Tests: Stack Creation and State
// ============================================================================

describe("UndoStack creation", () => {
  it("creates an empty stack with default maxHistory", () => {
    const stack = createUndoStack();
    expect(stack.history).toHaveLength(0);
    expect(stack.redoStack).toHaveLength(0);
    expect(stack.maxHistory).toBe(50);
  });

  it("creates a stack with custom maxHistory", () => {
    const stack = createUndoStack(100);
    expect(stack.maxHistory).toBe(100);
  });

  it("canUndo returns false for empty stack", () => {
    const stack = createUndoStack();
    expect(canUndo(stack)).toBe(false);
  });

  it("canRedo returns false for empty stack", () => {
    const stack = createUndoStack();
    expect(canRedo(stack)).toBe(false);
  });
});

// ============================================================================
// Tests: Command Creation
// ============================================================================

describe("Command creation", () => {
  it("generates command IDs with a stable prefix", () => {
    const id = generateCommandId();
    // Accepts UUID format (primary) or timestamp fallback
    expect(id).toMatch(/^CMD-([0-9a-f-]{36}|\d+-[a-z0-9]{6})$/);
  });

  it("creates a confidence command", () => {
    const cmd = createConfidenceCommand("hypo-1", 50, 75, "New evidence");
    expect(cmd.type).toBe("update_confidence");
    expect(cmd.description).toContain("50%");
    expect(cmd.description).toContain("75%");
    expect(cmd.executeData.confidence).toBe(75);
    expect(cmd.undoData.confidence).toBe(50);
  });

  it("creates a set primary command", () => {
    const cmd = createSetPrimaryCommand("hypo-2", "hypo-1");
    expect(cmd.type).toBe("set_primary_hypothesis");
    expect(cmd.executeData.hypothesisId).toBe("hypo-2");
    expect(cmd.undoData.hypothesisId).toBe("hypo-1");
  });

  it("creates an archive command", () => {
    const cmd = createArchiveCommand("hypo-3", "Not relevant");
    expect(cmd.type).toBe("archive_hypothesis");
    expect(cmd.executeData.hypothesisId).toBe("hypo-3");
    expect(cmd.executeData.reason).toBe("Not relevant");
  });

  it("creates a restore command", () => {
    const cmd = createRestoreCommand("hypo-3");
    expect(cmd.type).toBe("restore_hypothesis");
    expect(cmd.executeData.hypothesisId).toBe("hypo-3");
  });

  it("creates an evidence command", () => {
    const evidence = {
      id: "EV-1",
      type: "observation",
      content: "Observed outcome",
      addedAt: new Date().toISOString(),
    } as never;

    const cmd = createEvidenceCommand(evidence);
    expect(cmd.type).toBe("record_evidence");
    expect((cmd.executeData as { evidence: { id: string } }).evidence.id).toBe("EV-1");
  });

  it("creates a phase command", () => {
    const cmd = createPhaseCommand("sharpening", "level_split");
    expect(cmd.type).toBe("phase_transition");
    expect(cmd.executeData.phase).toBe("level_split");
    expect(cmd.undoData.phase).toBe("sharpening");
  });

  it("creates a notes command", () => {
    const cmd = createNotesCommand("old notes", "new notes");
    expect(cmd.type).toBe("update_notes");
    expect(cmd.executeData.notes).toBe("new notes");
    expect(cmd.undoData.notes).toBe("old notes");
  });

  it("creates add/remove tag commands", () => {
    const addCmd = createAddTagCommand("important");
    expect(addCmd.type).toBe("add_tag");
    expect(addCmd.executeData.tag).toBe("important");

    const removeCmd = createRemoveTagCommand("important");
    expect(removeCmd.type).toBe("remove_tag");
    expect(removeCmd.executeData.tag).toBe("important");
  });

  it("supports command type guards", () => {
    const confidence = createConfidenceCommand("hypo-1", 50, 60, "reason");
    const phase = createPhaseCommand("intake", "sharpening");
    const archive = createArchiveCommand("hypo-1", "Test archive reason");
    const evidence = createEvidenceCommand({
      id: "EV-2",
      testId: "T-1",
      recordedAt: new Date().toISOString(),
      observation: "Observed X",
      result: "supports",
      potencyCheckPassed: true,
      recordedBy: "user",
    });

    expect(isConfidenceCommand(confidence)).toBe(true);
    expect(isConfidenceCommand(phase)).toBe(false);
    expect(isHypothesisStateCommand(archive)).toBe(true);
    expect(isHypothesisStateCommand(confidence)).toBe(false);
    expect(isEvidenceCommand(evidence)).toBe(true);
    expect(isEvidenceCommand(archive)).toBe(false);
    expect(isPhaseCommand(phase)).toBe(true);
    expect(isPhaseCommand(evidence)).toBe(false);
  });
});

// ============================================================================
// Tests: Command Execution
// ============================================================================

describe("Command execution", () => {
  let session: Session;
  let stack: ReturnType<typeof createUndoStack>;

  beforeEach(() => {
    session = createTestSession();
    stack = createUndoStack();
  });

  it("executes confidence update", () => {
    const cmd = createConfidenceCommand("hypo-1", 50, 75, "New evidence");
    const result = executeCommand(session, stack, cmd);

    expect(result.session.hypothesisCards["hypo-1"].confidence).toBe(75);
    expect(result.stack.history).toHaveLength(1);
    expect(result.stack.redoStack).toHaveLength(0);
  });

  it("executes evidence recording and supports reversing it", () => {
    const evidence = {
      id: "EV-3",
      type: "observation",
      content: "Observed",
      addedAt: new Date().toISOString(),
    } as never;

    const cmd = createEvidenceCommand(evidence);
    const applied = applyCommand(session, cmd);
    expect(applied.evidenceLedger.length).toBe(session.evidenceLedger.length + 1);

    const reversed = reverseCommand(applied, cmd);
    expect(
      reversed.evidenceLedger.find((e) => (e as { id: string }).id === "EV-3"),
    ).toBeUndefined();
  });

  it("returns the original session for unknown/invalid commands", () => {
    const unknown = {
      id: "CMD-unknown",
      type: "update_prediction",
      timestamp: new Date().toISOString(),
      description: "noop",
      executeData: { predictionId: "P-1", field: "x", value: 1 },
      undoData: { predictionId: "P-1", field: "x", value: 0 },
    } as never;

    expect(applyCommand(session, unknown)).toEqual(session);
    expect(reverseCommand(session, unknown)).toEqual(session);
  });

  it("executes set primary hypothesis", () => {
    const cmd = createSetPrimaryCommand("hypo-2", "hypo-1");
    const result = executeCommand(session, stack, cmd);

    expect(result.session.primaryHypothesisId).toBe("hypo-2");
    expect(result.session.alternativeHypothesisIds).toContain("hypo-1");
    expect(result.session.alternativeHypothesisIds).not.toContain("hypo-2");
  });

  it("executes archive hypothesis", () => {
    const cmd = createArchiveCommand("hypo-2", "Not relevant");
    const result = executeCommand(session, stack, cmd);

    expect(result.session.alternativeHypothesisIds).not.toContain("hypo-2");
    expect(result.session.archivedHypothesisIds).toContain("hypo-2");
  });

  it("executes restore hypothesis", () => {
    // First archive
    let current = session;
    current = {
      ...current,
      alternativeHypothesisIds: current.alternativeHypothesisIds.filter((id) => id !== "hypo-2"),
      archivedHypothesisIds: [...current.archivedHypothesisIds, "hypo-2"],
    };

    const cmd = createRestoreCommand("hypo-2");
    const result = executeCommand(current, stack, cmd);

    expect(result.session.archivedHypothesisIds).not.toContain("hypo-2");
    expect(result.session.alternativeHypothesisIds).toContain("hypo-2");
  });

  it("executes phase transition", () => {
    const cmd = createPhaseCommand("sharpening", "level_split");
    const result = executeCommand(session, stack, cmd);

    expect(result.session.phase).toBe("level_split");
  });

  it("executes notes update", () => {
    const cmd = createNotesCommand("Test session", "Updated notes");
    const result = executeCommand(session, stack, cmd);

    expect(result.session.notes).toBe("Updated notes");
  });

  it("executes add tag", () => {
    const cmd = createAddTagCommand("important");
    const result = executeCommand(session, stack, cmd);

    expect(result.session.tags).toContain("important");
  });

  it("executes remove tag", () => {
    const cmd = createRemoveTagCommand("test");
    const result = executeCommand(session, stack, cmd);

    expect(result.session.tags).not.toContain("test");
  });

  it("handles set primary when no previous primary exists", () => {
    // Create a session with no primary
    const sessionNoPrimary = {
      ...session,
      primaryHypothesisId: "",
      alternativeHypothesisIds: ["hypo-1", "hypo-2"],
    };

    const cmd = createSetPrimaryCommand("hypo-1", "");
    const result = executeCommand(sessionNoPrimary, stack, cmd);

    // hypo-1 should be primary
    expect(result.session.primaryHypothesisId).toBe("hypo-1");
    // Empty string should NOT be in alternatives
    expect(result.session.alternativeHypothesisIds).not.toContain("");
    // hypo-2 should still be in alternatives
    expect(result.session.alternativeHypothesisIds).toContain("hypo-2");
    // hypo-1 should NOT be in alternatives (it's now primary)
    expect(result.session.alternativeHypothesisIds).not.toContain("hypo-1");
  });

  it("clears redo stack on new command", () => {
    const cmd1 = createConfidenceCommand("hypo-1", 50, 60, "First");
    const result1 = executeCommand(session, stack, cmd1);

    const undoResult = undo(result1.session, result1.stack);
    expect(undoResult!.stack.redoStack).toHaveLength(1);

    const cmd2 = createConfidenceCommand("hypo-1", 50, 70, "Second");
    const result2 = executeCommand(undoResult!.session, undoResult!.stack, cmd2);

    expect(result2.stack.redoStack).toHaveLength(0);
  });

  it("trims history when over maxHistory", () => {
    const smallStack = createUndoStack(3);
    let current = session;
    let currentStack = smallStack;

    for (let i = 0; i < 5; i++) {
      const cmd = createConfidenceCommand("hypo-1", 50 + i, 51 + i, `Update ${i}`);
      const result = executeCommand(current, currentStack, cmd);
      current = result.session;
      currentStack = result.stack;
    }

    expect(currentStack.history).toHaveLength(3);
  });
});

// ============================================================================
// Tests: Undo/Redo
// ============================================================================

describe("Undo/Redo", () => {
  let session: Session;
  let stack: ReturnType<typeof createUndoStack>;

  beforeEach(() => {
    session = createTestSession();
    stack = createUndoStack();
  });

  it("undoes confidence update", () => {
    const cmd = createConfidenceCommand("hypo-1", 50, 75, "New evidence");
    const { session: s1, stack: st1 } = executeCommand(session, stack, cmd);

    expect(s1.hypothesisCards["hypo-1"].confidence).toBe(75);

    const undoResult = undo(s1, st1);
    expect(undoResult).not.toBeNull();
    expect(undoResult!.session.hypothesisCards["hypo-1"].confidence).toBe(50);
    expect(undoResult!.stack.history).toHaveLength(0);
    expect(undoResult!.stack.redoStack).toHaveLength(1);
  });

  it("redoes confidence update", () => {
    const cmd = createConfidenceCommand("hypo-1", 50, 75, "New evidence");
    const { session: s1, stack: st1 } = executeCommand(session, stack, cmd);
    const undoResult = undo(s1, st1);
    const redoResult = redo(undoResult!.session, undoResult!.stack);

    expect(redoResult).not.toBeNull();
    expect(redoResult!.session.hypothesisCards["hypo-1"].confidence).toBe(75);
    expect(redoResult!.stack.history).toHaveLength(1);
    expect(redoResult!.stack.redoStack).toHaveLength(0);
  });

  it("undoes set primary", () => {
    const cmd = createSetPrimaryCommand("hypo-2", "hypo-1");
    const { session: s1, stack: st1 } = executeCommand(session, stack, cmd);

    expect(s1.primaryHypothesisId).toBe("hypo-2");

    const undoResult = undo(s1, st1);
    expect(undoResult!.session.primaryHypothesisId).toBe("hypo-1");
  });

  it("undoes archive", () => {
    const cmd = createArchiveCommand("hypo-2", "Not relevant");
    const { session: s1, stack: st1 } = executeCommand(session, stack, cmd);

    expect(s1.archivedHypothesisIds).toContain("hypo-2");

    const undoResult = undo(s1, st1);
    expect(undoResult!.session.archivedHypothesisIds).not.toContain("hypo-2");
    expect(undoResult!.session.alternativeHypothesisIds).toContain("hypo-2");
  });

  it("undoes phase transition", () => {
    const cmd = createPhaseCommand("sharpening", "level_split");
    const { session: s1, stack: st1 } = executeCommand(session, stack, cmd);

    expect(s1.phase).toBe("level_split");

    const undoResult = undo(s1, st1);
    expect(undoResult!.session.phase).toBe("sharpening");
  });

  it("returns null when nothing to undo", () => {
    const result = undo(session, stack);
    expect(result).toBeNull();
  });

  it("returns null when nothing to redo", () => {
    const result = redo(session, stack);
    expect(result).toBeNull();
  });

  it("handles multiple undo/redo operations", () => {
    const cmd1 = createConfidenceCommand("hypo-1", 50, 60, "First");
    const { session: s1, stack: st1 } = executeCommand(session, stack, cmd1);

    const cmd2 = createConfidenceCommand("hypo-1", 60, 70, "Second");
    const { session: s2, stack: st2 } = executeCommand(s1, st1, cmd2);

    expect(s2.hypothesisCards["hypo-1"].confidence).toBe(70);

    // Undo twice
    const undo1 = undo(s2, st2);
    expect(undo1!.session.hypothesisCards["hypo-1"].confidence).toBe(60);

    const undo2 = undo(undo1!.session, undo1!.stack);
    expect(undo2!.session.hypothesisCards["hypo-1"].confidence).toBe(50);

    // Redo twice
    const redo1 = redo(undo2!.session, undo2!.stack);
    expect(redo1!.session.hypothesisCards["hypo-1"].confidence).toBe(60);

    const redo2 = redo(redo1!.session, redo1!.stack);
    expect(redo2!.session.hypothesisCards["hypo-1"].confidence).toBe(70);
  });
});

// ============================================================================
// Tests: Stack Queries
// ============================================================================

describe("Stack queries", () => {
  it("getNextUndoDescription returns null for empty stack", () => {
    const stack = createUndoStack();
    expect(getNextUndoDescription(stack)).toBeNull();
  });

  it("getNextRedoDescription returns null for empty redo stack", () => {
    const stack = createUndoStack();
    expect(getNextRedoDescription(stack)).toBeNull();
  });

  it("getNextUndoDescription returns last command description", () => {
    const session = createTestSession();
    const stack = createUndoStack();
    const cmd = createConfidenceCommand("hypo-1", 50, 75, "Test");
    const { stack: st1 } = executeCommand(session, stack, cmd);

    expect(getNextUndoDescription(st1)).toContain("50%");
    expect(getNextUndoDescription(st1)).toContain("75%");
  });

  it("getRecentHistory returns commands in reverse order", () => {
    const session = createTestSession();
    let stack = createUndoStack();
    let current = session;

    for (let i = 1; i <= 5; i++) {
      const cmd = createConfidenceCommand("hypo-1", 50 + i - 1, 50 + i, `Update ${i}`);
      const result = executeCommand(current, stack, cmd);
      current = result.session;
      stack = result.stack;
    }

    const history = getRecentHistory(stack, 3);
    expect(history).toHaveLength(3);
    expect(history[0].description).toContain("55%"); // Most recent
    expect(history[2].description).toContain("53%"); // Third most recent
  });

  it("clearHistory removes all history", () => {
    const session = createTestSession();
    const stack = createUndoStack();

    const cmd = createConfidenceCommand("hypo-1", 50, 75, "Test");
    const result = executeCommand(session, stack, cmd);

    expect(result.stack.history).toHaveLength(1);

    const cleared = clearHistory(result.stack);
    expect(cleared.history).toHaveLength(0);
    expect(cleared.redoStack).toHaveLength(0);
  });
});

// ============================================================================
// Tests: Serialization
// ============================================================================

describe("Serialization", () => {
  it("serializes and deserializes empty stack", () => {
    const stack = createUndoStack();
    const serialized = serializeUndoStack(stack);
    const deserialized = deserializeUndoStack(serialized);

    expect(deserialized).not.toBeNull();
    expect(deserialized!.history).toHaveLength(0);
    expect(deserialized!.redoStack).toHaveLength(0);
    expect(deserialized!.maxHistory).toBe(50);
  });

  it("serializes and deserializes stack with commands", () => {
    const session = createTestSession();
    const stack = createUndoStack();

    const cmd = createConfidenceCommand("hypo-1", 50, 75, "Test");
    const result = executeCommand(session, stack, cmd);

    const serialized = serializeUndoStack(result.stack);
    const deserialized = deserializeUndoStack(serialized);

    expect(deserialized).not.toBeNull();
    expect(deserialized!.history).toHaveLength(1);
    expect(deserialized!.history[0].type).toBe("update_confidence");
  });

  it("returns null for invalid JSON", () => {
    expect(deserializeUndoStack("invalid json")).toBeNull();
  });

  it("returns null for missing fields", () => {
    expect(deserializeUndoStack('{"history": []}')).toBeNull();
    expect(deserializeUndoStack('{"redoStack": []}')).toBeNull();
  });
});
