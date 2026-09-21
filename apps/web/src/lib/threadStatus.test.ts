/**
 * Tests for Thread Status Computation
 *
 * Tests the computeThreadStatus function and related helpers.
 */

import { describe, expect, it } from "vitest";
import type { AgentMailMessage } from "./agentMail";
import {
  computeThreadStatus,
  extractVersion,
  formatThreadStatusSummary,
  getPendingRoles,
  inferRoleFromProgram,
  parseSubjectType,
  type ThreadStatus,
  threadNeedsAttention,
} from "./threadStatus";

// ============================================================================
// Test Fixtures
// ============================================================================

function createMessage(
  overrides: Partial<AgentMailMessage> & { subject: string },
): AgentMailMessage {
  const { subject, created_ts, from, to, importance, ack_required, ...rest } = overrides;
  return {
    id: Math.floor(Math.random() * 10000),
    thread_id: "RS-20251230-test",
    subject,
    created_ts: created_ts ?? new Date().toISOString(),
    from: from ?? "TestAgent",
    to: to ?? [],
    importance: importance ?? "normal",
    ack_required: ack_required ?? false,
    ...rest,
  };
}

// ============================================================================
// parseSubjectType Tests
// ============================================================================

describe("parseSubjectType", () => {
  it("parses KICKOFF subjects", () => {
    const result = parseSubjectType("KICKOFF: Cell fate investigation");
    expect(result.type).toBe("kickoff");
    expect(result.role).toBeUndefined();
  });

  it("treats legacy bracketed kickoff subjects as kickoff", () => {
    const result = parseSubjectType("[RS-20251230-test] Brenner Loop kickoff");
    expect(result.type).toBe("kickoff");
  });

  it("parses DELTA[opus] as test_designer", () => {
    const result = parseSubjectType("DELTA[opus]: Added H3 third alternative");
    expect(result.type).toBe("delta");
    expect(result.role).toBe("test_designer");
    expect(result.shorthand).toBe("opus");
  });

  it("parses DELTA[gpt] as hypothesis_generator", () => {
    const result = parseSubjectType("DELTA[gpt]: Revised likelihood ratios");
    expect(result.type).toBe("delta");
    expect(result.role).toBe("hypothesis_generator");
    expect(result.shorthand).toBe("gpt");
  });

  it("parses DELTA[gemini] as adversarial_critic", () => {
    const result = parseSubjectType("DELTA[gemini]: Scale check failed");
    expect(result.type).toBe("delta");
    expect(result.role).toBe("adversarial_critic");
    expect(result.shorthand).toBe("gemini");
  });

  it("parses DELTA[claude] as test_designer", () => {
    const result = parseSubjectType("DELTA[claude]: Potency check added");
    expect(result.type).toBe("delta");
    expect(result.role).toBe("test_designer");
  });

  it("parses DELTA[codex] as hypothesis_generator", () => {
    const result = parseSubjectType("DELTA[codex]: Cross-domain insight");
    expect(result.type).toBe("delta");
    expect(result.role).toBe("hypothesis_generator");
  });

  it("parses DELTA[Test Designer] as test_designer", () => {
    const result = parseSubjectType("DELTA[Test Designer]: Potency checks");
    expect(result.type).toBe("delta");
    expect(result.role).toBe("test_designer");
    expect(result.shorthand).toBe("test_designer");
  });

  it("parses DELTA[Hypothesis Generator] as hypothesis_generator", () => {
    const result = parseSubjectType("DELTA[Hypothesis Generator]: Added H3");
    expect(result.type).toBe("delta");
    expect(result.role).toBe("hypothesis_generator");
    expect(result.shorthand).toBe("hypothesis_generator");
  });

  it("parses DELTA[Adversarial Critic] as adversarial_critic", () => {
    const result = parseSubjectType("DELTA[Adversarial Critic]: Scale check");
    expect(result.type).toBe("delta");
    expect(result.role).toBe("adversarial_critic");
    expect(result.shorthand).toBe("adversarial_critic");
  });

  it("parses TRIBUNAL subjects", () => {
    const result = parseSubjectType("TRIBUNAL[devils_advocate]: H-1023");
    expect(result.type).toBe("tribunal");
  });

  it("parses COMPILED subjects", () => {
    const result = parseSubjectType("COMPILED: v3 artifact with contributions");
    expect(result.type).toBe("compiled");
  });

  it("parses CRITIQUE subjects", () => {
    const result = parseSubjectType("CRITIQUE: Challenging A2 assumption");
    expect(result.type).toBe("critique");
  });

  it("parses ACK subjects", () => {
    const result = parseSubjectType("ACK: Received and understood");
    expect(result.type).toBe("ack");
  });

  it("parses CLAIM subjects", () => {
    const result = parseSubjectType("CLAIM: Taking brenner_bot-5so.3.4.2");
    expect(result.type).toBe("claim");
  });

  it("handles unknown subjects", () => {
    const result = parseSubjectType("Random subject line");
    expect(result.type).toBe("unknown");
  });

  it("parses HANDOFF subjects", () => {
    const result = parseSubjectType("HANDOFF: Passing work to next agent");
    expect(result.type).toBe("handoff");
  });

  it("parses BLOCKED subjects", () => {
    const result = parseSubjectType("BLOCKED: Waiting for resource access");
    expect(result.type).toBe("blocked");
  });

  it("parses QUESTION subjects", () => {
    const result = parseSubjectType("QUESTION: Need clarification on H2");
    expect(result.type).toBe("question");
  });

  it("parses INFO subjects", () => {
    const result = parseSubjectType("INFO: Background context for session");
    expect(result.type).toBe("info");
  });

  it("is case-insensitive for prefixes", () => {
    expect(parseSubjectType("kickoff: test").type).toBe("kickoff");
    expect(parseSubjectType("DELTA[OPUS]: test").type).toBe("delta");
    expect(parseSubjectType("tribunal[statistician]: test").type).toBe("tribunal");
    expect(parseSubjectType("Compiled: test").type).toBe("compiled");
  });
});

// ============================================================================
// extractVersion Tests
// ============================================================================

describe("extractVersion", () => {
  it("extracts version from COMPILED subject", () => {
    expect(extractVersion("COMPILED: v3 artifact")).toBe(3);
    expect(extractVersion("COMPILED: v12 with contributions")).toBe(12);
  });

  it("returns null when no version found", () => {
    expect(extractVersion("COMPILED: Final version")).toBeNull();
    expect(extractVersion("COMPILED: Updated artifact")).toBeNull();
  });

  it("extracts first version number", () => {
    expect(extractVersion("COMPILED: v2 (prev v1)")).toBe(2);
  });
});

// ============================================================================
// inferRoleFromProgram Tests
// ============================================================================

describe("inferRoleFromProgram", () => {
  it("returns null for undefined program", () => {
    expect(inferRoleFromProgram(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(inferRoleFromProgram("")).toBeNull();
  });

  it("returns test_designer for claude/opus programs", () => {
    expect(inferRoleFromProgram("claude-code")).toBe("test_designer");
    expect(inferRoleFromProgram("claude-3")).toBe("test_designer");
    expect(inferRoleFromProgram("opus-4.5")).toBe("test_designer");
  });

  it("returns hypothesis_generator for codex/gpt programs", () => {
    expect(inferRoleFromProgram("codex-cli")).toBe("hypothesis_generator");
    expect(inferRoleFromProgram("gpt-5.2")).toBe("hypothesis_generator");
  });

  it("returns adversarial_critic for gemini programs", () => {
    expect(inferRoleFromProgram("gemini-cli")).toBe("adversarial_critic");
    expect(inferRoleFromProgram("gemini-3")).toBe("adversarial_critic");
  });

  it("returns null for unknown programs", () => {
    expect(inferRoleFromProgram("custom-agent")).toBeNull();
    expect(inferRoleFromProgram("unknown")).toBeNull();
  });
});

// ============================================================================
// computeThreadStatus Tests
// ============================================================================

describe("computeThreadStatus", () => {
  it("returns not_started for empty messages", () => {
    const status = computeThreadStatus([]);
    expect(status.phase).toBe("not_started");
    expect(status.isComplete).toBe(false);
    expect(status.messageCount).toBe(0);
  });

  it("detects awaiting_responses after KICKOFF", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Cell fate investigation",
        from: "Operator",
        to: ["Codex", "Opus", "Gemini"],
        ack_required: true,
        created_ts: "2025-12-30T10:00:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    expect(status.phase).toBe("awaiting_responses");
    expect(status.kickoff).toBeTruthy();
    expect(status.acks.awaitingFrom).toContain("Codex");
    expect(status.acks.awaitingFrom).toContain("Opus");
    expect(status.acks.awaitingFrom).toContain("Gemini");
  });

  it("treats ACKs as case-insensitive to agent names", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Cell fate investigation",
        from: "Operator",
        to: ["Codex"],
        ack_required: true,
        created_ts: "2025-12-30T10:00:00Z",
      }),
      createMessage({
        subject: "DELTA[gpt]: Added hypotheses",
        from: "codex",
        created_ts: "2025-12-30T10:01:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    expect(status.acks.pendingCount).toBe(0);
    expect(status.acks.awaitingFrom).not.toContain("Codex");
  });

  it("detects awaiting_responses after legacy bracketed kickoff subject", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "[RS-20251230-test] Brenner Loop kickoff",
        from: "Operator",
        to: ["Codex", "Opus", "Gemini"],
        ack_required: true,
        created_ts: "2025-12-30T10:00:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    expect(status.phase).toBe("awaiting_responses");
    expect(status.kickoff).toBeTruthy();
  });

  it("tracks role completion from DELTA messages", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test session",
        from: "Operator",
        created_ts: "2025-12-30T10:00:00Z",
      }),
      createMessage({
        subject: "DELTA[gpt]: Added hypotheses",
        from: "CodexAgent",
        created_ts: "2025-12-30T10:05:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    expect(status.phase).toBe("partially_complete");
    expect(status.roles.hypothesis_generator.completed).toBe(true);
    expect(status.roles.hypothesis_generator.contributors).toContain("CodexAgent");
    expect(status.roles.test_designer.completed).toBe(false);
    expect(status.roles.adversarial_critic.completed).toBe(false);
  });

  it("tracks role completion from DELTA role-name subjects", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test session",
        from: "Operator",
        created_ts: "2025-12-30T10:00:00Z",
      }),
      createMessage({
        subject: "DELTA[Test Designer]: Added potency checks",
        from: "ClaudeAgent",
        created_ts: "2025-12-30T10:05:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    expect(status.phase).toBe("partially_complete");
    expect(status.roles.test_designer.completed).toBe(true);
    expect(status.roles.test_designer.contributors).toContain("ClaudeAgent");
  });

  it("detects awaiting_compilation when all roles responded", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test session",
        from: "Operator",
        created_ts: "2025-12-30T10:00:00Z",
      }),
      createMessage({
        subject: "DELTA[gpt]: Hypotheses",
        from: "CodexAgent",
        created_ts: "2025-12-30T10:05:00Z",
      }),
      createMessage({
        subject: "DELTA[opus]: Tests",
        from: "ClaudeAgent",
        created_ts: "2025-12-30T10:10:00Z",
      }),
      createMessage({
        subject: "DELTA[gemini]: Critiques",
        from: "GeminiAgent",
        created_ts: "2025-12-30T10:15:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    expect(status.phase).toBe("awaiting_compilation");
    expect(status.isComplete).toBe(true);
    expect(status.stats.totalDeltas).toBe(3);
  });

  it("detects compiled phase with artifact", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test session",
        from: "Operator",
        created_ts: "2025-12-30T10:00:00Z",
      }),
      createMessage({
        subject: "DELTA[gpt]: Hypotheses",
        from: "CodexAgent",
        created_ts: "2025-12-30T10:05:00Z",
      }),
      createMessage({
        subject: "COMPILED: v1 artifact",
        from: "Compiler",
        created_ts: "2025-12-30T10:20:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    expect(status.phase).toBe("compiled");
    expect(status.latestArtifact).toBeTruthy();
    expect(status.latestArtifact?.version).toBe(1);
    expect(status.latestArtifact?.contributors).toContain("CodexAgent");
  });

  it("detects in_critique phase after compiled", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test session",
        from: "Operator",
        created_ts: "2025-12-30T10:00:00Z",
      }),
      createMessage({
        subject: "COMPILED: v1 artifact",
        from: "Compiler",
        created_ts: "2025-12-30T10:20:00Z",
      }),
      createMessage({
        subject: "CRITIQUE: Challenge to A2",
        from: "Critic",
        created_ts: "2025-12-30T10:25:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    expect(status.phase).toBe("in_critique");
    expect(status.stats.totalCritiques).toBe(1);
  });

  it("tracks ACK messages and clears pending", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test session",
        from: "Operator",
        to: ["AgentA", "AgentB"],
        ack_required: true,
        created_ts: "2025-12-30T10:00:00Z",
      }),
      createMessage({
        subject: "ACK: Received",
        from: "AgentA",
        created_ts: "2025-12-30T10:02:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    expect(status.acks.awaitingFrom).not.toContain("AgentA");
    expect(status.acks.awaitingFrom).toContain("AgentB");
    expect(status.acks.pendingCount).toBe(1);
    expect(status.stats.totalAcks).toBe(1);
  });

  it("treats any post-kickoff reply as implicit acknowledgement", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test session",
        from: "Operator",
        to: ["AgentA", "AgentB"],
        ack_required: true,
        created_ts: "2025-12-30T10:00:00Z",
      }),
      createMessage({
        subject: "DELTA[gpt]: Hypotheses",
        from: "AgentA",
        created_ts: "2025-12-30T10:05:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    expect(status.acks.awaitingFrom).not.toContain("AgentA");
    expect(status.acks.awaitingFrom).toContain("AgentB");
    expect(status.acks.pendingCount).toBe(1);
  });

  it("tracks pending acks across multiple kickoff messages", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Session start",
        from: "Operator",
        to: ["AgentA"],
        ack_required: true,
        created_ts: "2025-12-30T10:00:00Z",
      }),
      createMessage({
        subject: "KICKOFF: Session start",
        from: "Operator",
        to: ["AgentB"],
        ack_required: true,
        created_ts: "2025-12-30T10:00:05Z",
      }),
      createMessage({
        subject: "DELTA[gpt]: Hypotheses",
        from: "AgentA",
        created_ts: "2025-12-30T10:02:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    expect(status.acks.awaitingFrom).not.toContain("AgentA");
    expect(status.acks.awaitingFrom).toContain("AgentB");
    expect(status.acks.pendingCount).toBe(1);
  });

  it("tracks multiple contributors per role", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "DELTA[opus]: First test design",
        from: "ClaudeA",
        created_ts: "2025-12-30T10:05:00Z",
      }),
      createMessage({
        subject: "DELTA[opus]: Second test design",
        from: "ClaudeB",
        created_ts: "2025-12-30T10:10:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    expect(status.roles.test_designer.contributors).toContain("ClaudeA");
    expect(status.roles.test_designer.contributors).toContain("ClaudeB");
    expect(status.roles.test_designer.latestDelta?.from).toBe("ClaudeB");
  });

  it("collects unique participants", () => {
    const messages: AgentMailMessage[] = [
      createMessage({ subject: "KICKOFF: Test", from: "Operator" }),
      createMessage({ subject: "DELTA[gpt]: A", from: "AgentA" }),
      createMessage({ subject: "DELTA[opus]: B", from: "AgentB" }),
      createMessage({ subject: "DELTA[gpt]: C", from: "AgentA" }), // Duplicate
    ];

    const status = computeThreadStatus(messages);
    expect(status.stats.participants).toContain("Operator");
    expect(status.stats.participants).toContain("AgentA");
    expect(status.stats.participants).toContain("AgentB");
    expect(status.stats.participants.length).toBe(3);
  });

  it("respects custom expected roles", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "DELTA[gpt]: Hypotheses",
        from: "Agent",
        created_ts: "2025-12-30T10:05:00Z",
      }),
    ];

    // With default roles (all 3), not complete
    const statusDefault = computeThreadStatus(messages);
    expect(statusDefault.isComplete).toBe(false);

    // With only hypothesis_generator expected, complete
    const statusCustom = computeThreadStatus(messages, {
      expectedRoles: ["hypothesis_generator"],
    });
    expect(statusCustom.isComplete).toBe(true);
  });
});

// ============================================================================
// Convenience Function Tests
// ============================================================================

describe("formatThreadStatusSummary", () => {
  it("formats a complete status summary", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test session",
        from: "Operator",
        thread_id: "RS-20251230-test",
        created_ts: "2025-12-30T10:00:00Z",
      }),
      createMessage({
        subject: "DELTA[gpt]: Hypotheses",
        from: "CodexAgent",
        thread_id: "RS-20251230-test",
        created_ts: "2025-12-30T10:05:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    const summary = formatThreadStatusSummary(status);

    expect(summary).toContain("RS-20251230-test");
    expect(summary).toContain("partially complete");
    expect(summary).toContain("hypothesis_generator");
    expect(summary).toContain("CodexAgent");
  });

  it("handles null threadId gracefully", () => {
    const status: ThreadStatus = {
      threadId: null,
      phase: "not_started",
      isComplete: false,
      roles: {
        hypothesis_generator: {
          completed: false,
          contributors: [],
          latestDelta: null,
          lastUpdated: null,
        },
        test_designer: { completed: false, contributors: [], latestDelta: null, lastUpdated: null },
        adversarial_critic: {
          completed: false,
          contributors: [],
          latestDelta: null,
          lastUpdated: null,
        },
      },
      acks: { pendingAcks: [], pendingCount: 0, awaitingFrom: [] },
      latestArtifact: null,
      kickoff: null,
      messageCount: 0,
      round: 0,
      deltasInCurrentRound: 0,
      critiquesInCurrentRound: 0,
      stats: { totalDeltas: 0, totalCritiques: 0, totalAcks: 0, participants: [] },
    };

    const summary = formatThreadStatusSummary(status);
    expect(summary).toContain("(no thread)");
  });

  it("includes round info when round > 0", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test session",
        from: "Operator",
        thread_id: "RS-test",
        created_ts: "2025-12-30T10:00:00Z",
      }),
      createMessage({
        subject: "COMPILED: v1",
        from: "Operator",
        thread_id: "RS-test",
        created_ts: "2025-12-30T10:05:00Z",
      }),
      createMessage({
        subject: "DELTA[gpt]: New hypotheses",
        from: "CodexAgent",
        thread_id: "RS-test",
        created_ts: "2025-12-30T10:10:00Z",
      }),
      createMessage({
        subject: "CRITIQUE: Issues with H2",
        from: "GeminiAgent",
        thread_id: "RS-test",
        created_ts: "2025-12-30T10:15:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    const summary = formatThreadStatusSummary(status);

    expect(summary).toContain("Round 1");
    expect(summary).toContain("1 new deltas");
    expect(summary).toContain("1 critiques");
  });

  it("handles artifact without version", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test session",
        from: "Operator",
        thread_id: "RS-test",
        created_ts: "2025-12-30T10:00:00Z",
      }),
      createMessage({
        subject: "COMPILED: Final artifact without version",
        from: "Operator",
        thread_id: "RS-test",
        created_ts: "2025-12-30T10:05:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    const summary = formatThreadStatusSummary(status);

    expect(summary).toContain("Compiled artifact: latest");
  });
});

describe("threadNeedsAttention", () => {
  it("returns true for pending acks", () => {
    const status: ThreadStatus = {
      threadId: "test",
      phase: "awaiting_responses",
      isComplete: false,
      roles: {
        hypothesis_generator: {
          completed: false,
          contributors: [],
          latestDelta: null,
          lastUpdated: null,
        },
        test_designer: { completed: false, contributors: [], latestDelta: null, lastUpdated: null },
        adversarial_critic: {
          completed: false,
          contributors: [],
          latestDelta: null,
          lastUpdated: null,
        },
      },
      acks: { pendingAcks: [], pendingCount: 2, awaitingFrom: ["A", "B"] },
      latestArtifact: null,
      kickoff: null,
      messageCount: 1,
      round: 0,
      deltasInCurrentRound: 0,
      critiquesInCurrentRound: 0,
      stats: { totalDeltas: 0, totalCritiques: 0, totalAcks: 0, participants: [] },
    };

    expect(threadNeedsAttention(status)).toBe(true);
  });

  it("returns false for compiled threads", () => {
    const status: ThreadStatus = {
      threadId: "test",
      phase: "compiled",
      isComplete: true,
      roles: {
        hypothesis_generator: {
          completed: true,
          contributors: ["A"],
          latestDelta: null,
          lastUpdated: null,
        },
        test_designer: {
          completed: true,
          contributors: ["B"],
          latestDelta: null,
          lastUpdated: null,
        },
        adversarial_critic: {
          completed: true,
          contributors: ["C"],
          latestDelta: null,
          lastUpdated: null,
        },
      },
      acks: { pendingAcks: [], pendingCount: 0, awaitingFrom: [] },
      latestArtifact: null,
      kickoff: null,
      messageCount: 5,
      round: 1,
      deltasInCurrentRound: 0,
      critiquesInCurrentRound: 0,
      stats: { totalDeltas: 3, totalCritiques: 0, totalAcks: 0, participants: [] },
    };

    expect(threadNeedsAttention(status)).toBe(false);
  });

  it("returns false for closed threads", () => {
    const status: ThreadStatus = {
      threadId: "test",
      phase: "closed",
      isComplete: true,
      roles: {
        hypothesis_generator: {
          completed: true,
          contributors: ["A"],
          latestDelta: null,
          lastUpdated: null,
        },
        test_designer: {
          completed: true,
          contributors: ["B"],
          latestDelta: null,
          lastUpdated: null,
        },
        adversarial_critic: {
          completed: true,
          contributors: ["C"],
          latestDelta: null,
          lastUpdated: null,
        },
      },
      acks: { pendingAcks: [], pendingCount: 0, awaitingFrom: [] },
      latestArtifact: null,
      kickoff: null,
      messageCount: 5,
      round: 1,
      deltasInCurrentRound: 0,
      critiquesInCurrentRound: 0,
      stats: { totalDeltas: 3, totalCritiques: 0, totalAcks: 0, participants: [] },
    };

    expect(threadNeedsAttention(status)).toBe(false);
  });

  it("returns false for not_started threads", () => {
    const status: ThreadStatus = {
      threadId: "test",
      phase: "not_started",
      isComplete: false,
      roles: {
        hypothesis_generator: {
          completed: false,
          contributors: [],
          latestDelta: null,
          lastUpdated: null,
        },
        test_designer: { completed: false, contributors: [], latestDelta: null, lastUpdated: null },
        adversarial_critic: {
          completed: false,
          contributors: [],
          latestDelta: null,
          lastUpdated: null,
        },
      },
      acks: { pendingAcks: [], pendingCount: 0, awaitingFrom: [] },
      latestArtifact: null,
      kickoff: null,
      messageCount: 0,
      round: 0,
      deltasInCurrentRound: 0,
      critiquesInCurrentRound: 0,
      stats: { totalDeltas: 0, totalCritiques: 0, totalAcks: 0, participants: [] },
    };

    expect(threadNeedsAttention(status)).toBe(false);
  });
});

describe("getPendingRoles", () => {
  it("returns roles that have not completed", () => {
    const status: ThreadStatus = {
      threadId: "test",
      phase: "partially_complete",
      isComplete: false,
      roles: {
        hypothesis_generator: {
          completed: true,
          contributors: ["A"],
          latestDelta: null,
          lastUpdated: null,
        },
        test_designer: { completed: false, contributors: [], latestDelta: null, lastUpdated: null },
        adversarial_critic: {
          completed: false,
          contributors: [],
          latestDelta: null,
          lastUpdated: null,
        },
      },
      acks: { pendingAcks: [], pendingCount: 0, awaitingFrom: [] },
      latestArtifact: null,
      kickoff: null,
      messageCount: 2,
      round: 0,
      deltasInCurrentRound: 1,
      critiquesInCurrentRound: 0,
      stats: { totalDeltas: 1, totalCritiques: 0, totalAcks: 0, participants: [] },
    };

    const pending = getPendingRoles(status);
    expect(pending).toContain("test_designer");
    expect(pending).toContain("adversarial_critic");
    expect(pending).not.toContain("hypothesis_generator");
  });
});

// ============================================================================
// Thread-Level Convenience Function Tests
// ============================================================================

import {
  computeThreadStatusFromThread,
  computeThreadStatusSummary,
  getAgentsWithPendingAcks,
  getPendingAgents,
  isWaitingForRole,
} from "./threadStatus";

describe("computeThreadStatusFromThread", () => {
  it("computes status from AgentMailThread object", () => {
    const thread = {
      project: "/test/project",
      thread_id: "RS-test",
      messages: [
        createMessage({
          subject: "KICKOFF: Test session",
          from: "Operator",
          thread_id: "RS-test",
        }),
        createMessage({
          subject: "DELTA[gpt]: Hypotheses",
          from: "CodexAgent",
          thread_id: "RS-test",
        }),
      ],
    };

    const status = computeThreadStatusFromThread(thread);
    expect(status.threadId).toBe("RS-test");
    expect(status.roles.hypothesis_generator.completed).toBe(true);
  });
});

describe("computeThreadStatusSummary", () => {
  it("returns minimal summary for list views", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test session",
        from: "Operator",
        thread_id: "RS-test",
      }),
      createMessage({
        subject: "DELTA[gpt]: Hypotheses",
        from: "CodexAgent",
        thread_id: "RS-test",
      }),
    ];

    const summary = computeThreadStatusSummary(messages);
    expect(summary.threadId).toBe("RS-test");
    expect(summary.phase).toBe("partially_complete");
    expect(summary.respondedRoleCount).toBe(1);
    expect(summary.totalRoleCount).toBe(3);
    expect(summary.isComplete).toBe(false);
    expect(summary.summary).toContain("1/3 roles");
  });
});

describe("isWaitingForRole", () => {
  it("returns true when role has not responded", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test",
        from: "Operator",
      }),
      createMessage({
        subject: "DELTA[gpt]: Hypotheses",
        from: "CodexAgent",
      }),
    ];

    expect(isWaitingForRole(messages, "hypothesis_generator")).toBe(false);
    expect(isWaitingForRole(messages, "test_designer")).toBe(true);
    expect(isWaitingForRole(messages, "adversarial_critic")).toBe(true);
  });
});

describe("getAgentsWithPendingAcks", () => {
  it("returns agents who have not acknowledged", () => {
    // Use explicit timestamps to ensure ACK is after KICKOFF
    const kickoffTime = "2025-01-01T10:00:00.000Z";
    const ackTime = "2025-01-01T10:05:00.000Z";

    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test",
        from: "Operator",
        to: ["AgentA", "AgentB"],
        ack_required: true,
        created_ts: kickoffTime,
      }),
      createMessage({
        subject: "ACK: Received",
        from: "AgentA",
        created_ts: ackTime,
      }),
    ];

    const pending = getAgentsWithPendingAcks(messages);
    expect(pending).toContain("AgentB");
    expect(pending).not.toContain("AgentA");
  });
});

describe("getPendingAgents", () => {
  it("returns agents who have not submitted DELTA", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test",
        from: "Operator",
      }),
      createMessage({
        subject: "DELTA[gpt]: Hypotheses",
        from: "AgentA",
      }),
      createMessage({
        subject: "ACK: Received",
        from: "AgentB",
      }),
    ];

    const pending = getPendingAgents(messages);
    // Operator and AgentB haven't submitted DELTA
    expect(pending).toContain("Operator");
    expect(pending).toContain("AgentB");
    expect(pending).not.toContain("AgentA");
  });
});

// ============================================================================
// Round Tracking Tests
// ============================================================================

import { getDeltaMessagesForCurrentRound, getMessagesInCurrentRound } from "./threadStatus";

describe("round tracking", () => {
  it("reports round 0 before any COMPILED messages", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test",
        from: "Operator",
        created_ts: "2025-01-01T00:00:00Z",
      }),
      createMessage({
        subject: "DELTA[gpt]: Hypotheses",
        from: "CodexAgent",
        created_ts: "2025-01-01T01:00:00Z",
      }),
      createMessage({
        subject: "DELTA[opus]: Tests",
        from: "ClaudeAgent",
        created_ts: "2025-01-01T02:00:00Z",
      }),
      createMessage({
        subject: "CRITIQUE: Premature critique",
        from: "GeminiAgent",
        created_ts: "2025-01-01T03:00:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    expect(status.round).toBe(0);
    expect(status.deltasInCurrentRound).toBe(2);
    expect(status.critiquesInCurrentRound).toBe(0);
  });

  it("reports round 1 after first COMPILED message", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test",
        from: "Operator",
        created_ts: "2025-01-01T00:00:00Z",
      }),
      createMessage({
        subject: "DELTA[gpt]: Hypotheses",
        from: "CodexAgent",
        created_ts: "2025-01-01T01:00:00Z",
      }),
      createMessage({
        subject: "COMPILED: v1 initial artifact",
        from: "Operator",
        created_ts: "2025-01-01T02:00:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    expect(status.round).toBe(1);
    expect(status.deltasInCurrentRound).toBe(0); // No deltas after COMPILED
    expect(status.critiquesInCurrentRound).toBe(0);
  });

  it("counts deltas and critiques in current round correctly", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test",
        from: "Operator",
        created_ts: "2025-01-01T00:00:00Z",
      }),
      createMessage({
        subject: "DELTA[gpt]: Initial hypotheses",
        from: "CodexAgent",
        created_ts: "2025-01-01T01:00:00Z",
      }),
      createMessage({
        subject: "COMPILED: v1 initial",
        from: "Operator",
        created_ts: "2025-01-01T02:00:00Z",
      }),
      createMessage({
        subject: "CRITIQUE: H2 mechanism issues",
        from: "GeminiAgent",
        created_ts: "2025-01-01T03:00:00Z",
      }),
      createMessage({
        subject: "DELTA[opus]: Revised H2",
        from: "ClaudeAgent",
        created_ts: "2025-01-01T04:00:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    expect(status.round).toBe(1);
    expect(status.deltasInCurrentRound).toBe(1); // Only the DELTA after COMPILED
    expect(status.critiquesInCurrentRound).toBe(1);
  });

  it("increments round with each COMPILED message", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test",
        from: "Operator",
        created_ts: "2025-01-01T00:00:00Z",
      }),
      createMessage({
        subject: "COMPILED: v1",
        from: "Operator",
        created_ts: "2025-01-01T01:00:00Z",
      }),
      createMessage({
        subject: "COMPILED: v2",
        from: "Operator",
        created_ts: "2025-01-01T02:00:00Z",
      }),
      createMessage({
        subject: "COMPILED: v3",
        from: "Operator",
        created_ts: "2025-01-01T03:00:00Z",
      }),
    ];

    const status = computeThreadStatus(messages);
    expect(status.round).toBe(3);
  });
});

describe("getMessagesInCurrentRound", () => {
  it("returns all DELTAs after KICKOFF when no COMPILED exists", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test",
        from: "Operator",
        created_ts: "2025-01-01T00:00:00Z",
      }),
      createMessage({
        subject: "DELTA[gpt]: Hypotheses",
        from: "CodexAgent",
        created_ts: "2025-01-01T01:00:00Z",
      }),
      createMessage({
        subject: "DELTA[opus]: Tests",
        from: "ClaudeAgent",
        created_ts: "2025-01-01T02:00:00Z",
      }),
      createMessage({
        subject: "CRITIQUE: Premature critique",
        from: "GeminiAgent",
        created_ts: "2025-01-01T03:00:00Z",
      }),
    ];

    const currentRound = getMessagesInCurrentRound(messages);
    expect(currentRound.length).toBe(2);
    expect(currentRound[0].subject).toContain("DELTA[gpt]");
    expect(currentRound[1].subject).toContain("DELTA[opus]");
  });

  it("returns only messages after latest COMPILED", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test",
        from: "Operator",
        created_ts: "2025-01-01T00:00:00Z",
      }),
      createMessage({
        subject: "DELTA[gpt]: Initial",
        from: "CodexAgent",
        created_ts: "2025-01-01T01:00:00Z",
      }),
      createMessage({
        subject: "COMPILED: v1",
        from: "Operator",
        created_ts: "2025-01-01T02:00:00Z",
      }),
      createMessage({
        subject: "CRITIQUE: Issues with H2",
        from: "GeminiAgent",
        created_ts: "2025-01-01T03:00:00Z",
      }),
      createMessage({
        subject: "DELTA[opus]: Revised",
        from: "ClaudeAgent",
        created_ts: "2025-01-01T04:00:00Z",
      }),
    ];

    const currentRound = getMessagesInCurrentRound(messages);
    expect(currentRound.length).toBe(2);
    expect(currentRound[0].subject).toContain("CRITIQUE");
    expect(currentRound[1].subject).toContain("DELTA[opus]");
  });

  it("filters out non-DELTA and non-CRITIQUE messages", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test",
        from: "Operator",
        created_ts: "2025-01-01T00:00:00Z",
      }),
      createMessage({
        subject: "COMPILED: v1",
        from: "Operator",
        created_ts: "2025-01-01T01:00:00Z",
      }),
      createMessage({
        subject: "ACK: Received",
        from: "Agent",
        created_ts: "2025-01-01T02:00:00Z",
      }),
      createMessage({
        subject: "DELTA[gpt]: New delta",
        from: "CodexAgent",
        created_ts: "2025-01-01T03:00:00Z",
      }),
    ];

    const currentRound = getMessagesInCurrentRound(messages);
    expect(currentRound.length).toBe(1);
    expect(currentRound[0].subject).toContain("DELTA[gpt]");
  });
});

describe("getDeltaMessagesForCurrentRound", () => {
  it("returns only DELTA messages (excludes CRITIQUE)", () => {
    const messages: AgentMailMessage[] = [
      createMessage({
        subject: "KICKOFF: Test",
        from: "Operator",
        created_ts: "2025-01-01T00:00:00Z",
      }),
      createMessage({
        subject: "COMPILED: v1",
        from: "Operator",
        created_ts: "2025-01-01T01:00:00Z",
      }),
      createMessage({
        subject: "CRITIQUE: Problems",
        from: "GeminiAgent",
        created_ts: "2025-01-01T02:00:00Z",
      }),
      createMessage({
        subject: "DELTA[opus]: Fixes",
        from: "ClaudeAgent",
        created_ts: "2025-01-01T03:00:00Z",
      }),
    ];

    const deltas = getDeltaMessagesForCurrentRound(messages);
    expect(deltas.length).toBe(1);
    expect(deltas[0].subject).toContain("DELTA[opus]");
  });
});
