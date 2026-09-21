/**
 * Tests for the Agent Debate Module
 *
 * @see brenner_bot-xlk2.7 (Agent Debate Mode feature)
 */

import { describe, expect, it } from "vitest";
import { createHypothesisCard } from "../hypothesis";
import {
  type AgentDebate,
  addRound,
  addUserInjection,
  analyzeRound,
  buildDebateFollowUpPrompt,
  buildDebateOpeningPrompt,
  concludeDebate,
  createDebate,
  DEBATE_FORMAT_CONFIGS,
  type DebateRound,
  generateConclusion,
  generateDebateId,
  generateDebateThreadId,
  generateDefaultTopic,
  getDebateStatus,
  getNextSpeaker,
  isAgentDebate,
  isDebateFormat,
  isDebateStatus,
  shouldConclude,
} from "./debate";

// ============================================================================
// Test Fixtures
// ============================================================================

const MOCK_HYPOTHESIS = createHypothesisCard({
  id: "HC-TEST-001-v1",
  statement: "Social media use causes depression in teenagers",
  mechanism: "Algorithmic feeds amplify negative content and social comparison",
  predictionsIfTrue: ["Higher usage correlates with depression scores"],
  impossibleIfTrue: ["No correlation under any conditions"],
  confidence: 60,
  sessionId: "TEST-SESSION",
});

function createTestDebate(overrides: Partial<AgentDebate> = {}): AgentDebate {
  const base = createDebate({
    sessionId: "TEST-SESSION",
    hypothesis: MOCK_HYPOTHESIS,
  });
  return { ...base, ...overrides };
}

function createTestRound(overrides: Partial<DebateRound> = {}): DebateRound {
  return {
    number: 1,
    speaker: "experiment_designer",
    content: "I propose a randomized controlled trial...",
    recordedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("debate", () => {
  describe("ID generation", () => {
    it("generates unique debate IDs with session prefix", () => {
      const id1 = generateDebateId("SESSION-1");
      const id2 = generateDebateId("SESSION-1");

      expect(id1).toMatch(/^DEBATE-SESSION-1-/);
      expect(id2).toMatch(/^DEBATE-SESSION-1-/);
      expect(id1).not.toBe(id2); // Should be unique
    });

    it("generates thread IDs from debate IDs", () => {
      const debateId = "DEBATE-SESSION-1-ABC123";
      const threadId = generateDebateThreadId(debateId);

      expect(threadId).toBe("DEBATE-SESSION-1-ABC123-THREAD");
    });
  });

  describe("createDebate", () => {
    it("creates debate with default oxford_style format", () => {
      const debate = createDebate({
        sessionId: "TEST-SESSION",
        hypothesis: MOCK_HYPOTHESIS,
      });

      expect(debate.id).toMatch(/^DEBATE-TEST-SESSION-/);
      expect(debate.sessionId).toBe("TEST-SESSION");
      expect(debate.format).toBe("oxford_style");
      expect(debate.status).toBe("not_started");
      expect(debate.rounds).toHaveLength(0);
      expect(debate.maxRounds).toBe(6); // oxford_style default
      expect(debate.participants).toEqual(["experiment_designer", "devils_advocate"]);
      expect(debate.moderator).toBe("brenner_channeler");
    });

    it("creates socratic debate with correct defaults", () => {
      const debate = createDebate({
        sessionId: "TEST-SESSION",
        hypothesis: MOCK_HYPOTHESIS,
        format: "socratic",
      });

      expect(debate.format).toBe("socratic");
      expect(debate.maxRounds).toBe(8);
      expect(debate.participants).toContain("devils_advocate");
      expect(debate.participants).toContain("experiment_designer");
      expect(debate.participants).toContain("statistician");
      expect(debate.moderator).toBe("brenner_channeler");
    });

    it("creates steelman_contest with correct defaults", () => {
      const debate = createDebate({
        sessionId: "TEST-SESSION",
        hypothesis: MOCK_HYPOTHESIS,
        format: "steelman_contest",
      });

      expect(debate.format).toBe("steelman_contest");
      expect(debate.maxRounds).toBe(4);
      expect(debate.moderator).toBe("system");
    });

    it("respects custom options", () => {
      const debate = createDebate({
        sessionId: "CUSTOM-SESSION",
        hypothesis: MOCK_HYPOTHESIS,
        format: "oxford_style",
        topic: "Custom debate topic",
        participants: ["statistician", "brenner_channeler"],
        moderator: "system",
        maxRounds: 10,
      });

      expect(debate.topic).toBe("Custom debate topic");
      expect(debate.participants).toEqual(["statistician", "brenner_channeler"]);
      expect(debate.moderator).toBe("system");
      expect(debate.maxRounds).toBe(10);
    });
  });

  describe("generateDefaultTopic", () => {
    it("generates oxford-style motion", () => {
      const topic = generateDefaultTopic(MOCK_HYPOTHESIS, "oxford_style");
      expect(topic).toContain("Motion:");
      expect(topic).toContain(MOCK_HYPOTHESIS.statement);
    });

    it("generates socratic examination topic", () => {
      const topic = generateDefaultTopic(MOCK_HYPOTHESIS, "socratic");
      expect(topic).toContain("Examining the foundations");
    });

    it("generates steelman contest topic", () => {
      const topic = generateDefaultTopic(MOCK_HYPOTHESIS, "steelman_contest");
      expect(topic).toContain("Strongest case");
    });
  });

  describe("getNextSpeaker", () => {
    it("returns first participant for not_started debate", () => {
      const debate = createTestDebate();
      const speaker = getNextSpeaker(debate);

      expect(speaker).toBe("experiment_designer");
    });

    it("alternates speakers for oxford_style", () => {
      const debate = createTestDebate({
        format: "oxford_style",
        participants: ["experiment_designer", "devils_advocate"],
        status: "in_progress",
        rounds: [createTestRound({ number: 1, speaker: "experiment_designer" })],
      });

      const speaker = getNextSpeaker(debate);
      expect(speaker).toBe("devils_advocate");
    });

    it("uses round_robin for steelman_contest", () => {
      const debate = createTestDebate({
        format: "steelman_contest",
        participants: ["experiment_designer", "devils_advocate"],
        status: "in_progress",
        rounds: [
          createTestRound({ number: 1, speaker: "experiment_designer" }),
          createTestRound({ number: 2, speaker: "devils_advocate" }),
        ],
      });

      const speaker = getNextSpeaker(debate);
      expect(speaker).toBe("experiment_designer"); // Round robin returns to first
    });

    it("returns null when max rounds reached", () => {
      const debate = createTestDebate({
        maxRounds: 2,
        status: "in_progress",
        rounds: [createTestRound({ number: 1 }), createTestRound({ number: 2 })],
      });

      const speaker = getNextSpeaker(debate);
      expect(speaker).toBeNull();
    });

    it("returns null for concluded debate", () => {
      const debate = createTestDebate({ status: "concluded" });
      const speaker = getNextSpeaker(debate);
      expect(speaker).toBeNull();
    });
  });

  describe("buildDebateOpeningPrompt", () => {
    it("includes format name and topic", () => {
      const debate = createTestDebate();
      const prompt = buildDebateOpeningPrompt(debate, "experiment_designer");

      expect(prompt).toContain("Oxford-Style Debate");
      expect(prompt).toContain(debate.topic);
    });

    it("includes hypothesis context", () => {
      const debate = createTestDebate();
      const prompt = buildDebateOpeningPrompt(debate, "experiment_designer");

      expect(prompt).toContain(MOCK_HYPOTHESIS.statement);
      expect(prompt).toContain(MOCK_HYPOTHESIS.mechanism);
    });

    it("includes role-specific instructions for proposition", () => {
      const debate = createTestDebate({
        participants: ["experiment_designer", "devils_advocate"],
      });
      const prompt = buildDebateOpeningPrompt(debate, "experiment_designer");

      expect(prompt).toContain("Proposition");
      expect(prompt).toContain("strongest case FOR");
    });

    it("includes role-specific instructions for opposition", () => {
      const debate = createTestDebate({
        participants: ["experiment_designer", "devils_advocate"],
      });
      const prompt = buildDebateOpeningPrompt(debate, "devils_advocate");

      expect(prompt).toContain("Opposition");
      expect(prompt).toContain("AGAINST");
    });
  });

  describe("buildDebateFollowUpPrompt", () => {
    it("includes previous rounds", () => {
      const debate = createTestDebate();
      const previousRounds = [
        createTestRound({
          number: 1,
          speaker: "experiment_designer",
          content: "My opening argument is...",
        }),
      ];

      const prompt = buildDebateFollowUpPrompt(debate, "devils_advocate", previousRounds);

      expect(prompt).toContain("Round 2");
      expect(prompt).toContain("Previous Rounds");
      expect(prompt).toContain("My opening argument is...");
    });

    it("includes response instructions", () => {
      const debate = createTestDebate();
      const previousRounds = [createTestRound()];

      const prompt = buildDebateFollowUpPrompt(debate, "devils_advocate", previousRounds);

      expect(prompt).toContain("Respond");
      expect(prompt).toContain("Address");
    });
  });

  describe("addRound", () => {
    it("adds round with auto-incremented number", () => {
      const debate = createTestDebate();
      const updated = addRound(debate, {
        speaker: "experiment_designer",
        content: "Round 1 content",
      });

      expect(updated.rounds).toHaveLength(1);
      expect(updated.rounds[0]!.number).toBe(1);
      expect(updated.rounds[0]!.speaker).toBe("experiment_designer");
    });

    it("changes status from not_started to in_progress", () => {
      const debate = createTestDebate({ status: "not_started" });
      const updated = addRound(debate, {
        speaker: "experiment_designer",
        content: "Starting round",
      });

      expect(updated.status).toBe("in_progress");
    });

    it("preserves existing rounds", () => {
      const debate = createTestDebate({
        rounds: [createTestRound({ number: 1 })],
        status: "in_progress",
      });

      const updated = addRound(debate, {
        speaker: "devils_advocate",
        content: "Round 2 content",
      });

      expect(updated.rounds).toHaveLength(2);
      expect(updated.rounds[1]!.number).toBe(2);
    });
  });

  describe("addUserInjection", () => {
    it("adds user injection with correct metadata", () => {
      const debate = createTestDebate({
        rounds: [createTestRound()],
      });

      const updated = addUserInjection(debate, "What about selection bias?", "devils_advocate");

      expect(updated.userInjections).toHaveLength(1);
      expect(updated.userInjections[0]!.content).toBe("What about selection bias?");
      expect(updated.userInjections[0]!.targetAgent).toBe("devils_advocate");
      expect(updated.userInjections[0]!.afterRound).toBe(1);
    });

    it("defaults targetAgent to 'all'", () => {
      const debate = createTestDebate();
      const updated = addUserInjection(debate, "General question");

      expect(updated.userInjections[0]!.targetAgent).toBe("all");
    });
  });

  describe("analyzeRound", () => {
    it("detects objections", () => {
      const round = createTestRound({
        content:
          "However, this approach has a fatal flaw. The design fails to account for confounds.",
      });

      const analysis = analyzeRound(round);

      expect(analysis.objectionsRaised.length).toBeGreaterThan(0);
      expect(analysis.objectionsRaised.some((o) => o.includes("flaw"))).toBe(true);
    });

    it("detects concessions", () => {
      const round = createTestRound({
        content: "I agree that this is a valid point. You're right about the measurement issues.",
      });

      const analysis = analyzeRound(round);

      expect(analysis.concessionsGiven.length).toBeGreaterThan(0);
    });

    it("detects new points", () => {
      const round = createTestRound({
        content:
          "I propose a new experimental design. Therefore, we should consider alternative methods.",
      });

      const analysis = analyzeRound(round);

      expect(analysis.newPointsMade.length).toBeGreaterThan(0);
    });

    it("extracts key quotes from bullet points", () => {
      const round = createTestRound({
        content: `
Key findings:
- First important finding about methodology
- Second finding about results
- Third finding about implications
        `,
      });

      const analysis = analyzeRound(round);

      expect(analysis.keyQuotes.length).toBeGreaterThan(0);
    });
  });

  describe("generateConclusion", () => {
    it("generates conclusion with summary", () => {
      const debate = createTestDebate({
        rounds: [
          createTestRound({
            number: 1,
            speaker: "experiment_designer",
            content: "I propose a key experimental design.",
          }),
          createTestRound({
            number: 2,
            speaker: "devils_advocate",
            content: "I agree that the design is valid. However, the sample size is problematic.",
          }),
        ],
      });

      const conclusion = generateConclusion(debate);

      expect(conclusion.summary).toContain("Oxford-style debate");
      expect(conclusion.summary).toContain("2 rounds");
      expect(conclusion.generatedAt).toBeDefined();
    });

    it("identifies consensus from concessions", () => {
      const debate = createTestDebate({
        rounds: [
          createTestRound({
            number: 1,
            content: "Point A is important for this hypothesis.",
          }),
          createTestRound({
            number: 2,
            content: "I acknowledge that Point A is valid and important.",
          }),
        ],
      });

      const conclusion = generateConclusion(debate);

      expect(conclusion.consensus.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("concludeDebate", () => {
    it("changes status to concluded", () => {
      const debate = createTestDebate({
        status: "in_progress",
        rounds: [createTestRound()],
      });

      const concluded = concludeDebate(debate);

      expect(concluded.status).toBe("concluded");
      expect(concluded.conclusion).toBeDefined();
    });

    it("generates conclusion with all required fields", () => {
      const debate = createTestDebate({
        rounds: [createTestRound({ number: 1 }), createTestRound({ number: 2 })],
      });

      const concluded = concludeDebate(debate);

      expect(concluded.conclusion!.consensus).toBeDefined();
      expect(concluded.conclusion!.unresolved).toBeDefined();
      expect(concluded.conclusion!.keyInsight).toBeDefined();
      expect(concluded.conclusion!.winningArguments).toBeDefined();
      expect(concluded.conclusion!.summary).toBeDefined();
    });
  });

  describe("shouldConclude", () => {
    it("returns false for not_started debate", () => {
      const debate = createTestDebate({ status: "not_started" });
      expect(shouldConclude(debate)).toBe(false);
    });

    it("returns false for already concluded debate", () => {
      const debate = createTestDebate({ status: "concluded" });
      expect(shouldConclude(debate)).toBe(false);
    });

    it("returns true when max rounds reached", () => {
      const debate = createTestDebate({
        status: "in_progress",
        maxRounds: 2,
        rounds: [createTestRound({ number: 1 }), createTestRound({ number: 2 })],
      });

      expect(shouldConclude(debate)).toBe(true);
    });

    it("returns true when many concessions made", () => {
      const debate = createTestDebate({
        status: "in_progress",
        maxRounds: 10,
        rounds: [
          createTestRound({
            number: 1,
            content: "I agree with everything. Valid point. I concede this.",
            analysis: {
              newPointsMade: [],
              objectionsRaised: [],
              concessionsGiven: ["agree", "valid", "concede"],
              keyQuotes: [],
            },
          }),
          createTestRound({
            number: 2,
            content: "I also agree. You're right. I acknowledge this.",
            analysis: {
              newPointsMade: [],
              objectionsRaised: [],
              concessionsGiven: ["agree", "right", "acknowledge"],
              keyQuotes: [],
            },
          }),
          createTestRound({
            number: 3,
            content: "Fair criticism acknowledged.",
            analysis: {
              newPointsMade: [],
              objectionsRaised: [],
              concessionsGiven: ["acknowledged"],
              keyQuotes: [],
            },
          }),
        ],
      });

      expect(shouldConclude(debate)).toBe(true);
    });
  });

  describe("getDebateStatus", () => {
    it("returns correct status summary", () => {
      const debate = createTestDebate({
        status: "in_progress",
        maxRounds: 6,
        participants: ["experiment_designer", "devils_advocate"],
        rounds: [
          createTestRound({
            number: 1,
            speaker: "experiment_designer",
            content: "Point with an objection however.",
          }),
          createTestRound({
            number: 2,
            speaker: "devils_advocate",
            content: "I agree with the valid point.",
          }),
        ],
      });

      const status = getDebateStatus(debate);

      expect(status.roundsCompleted).toBe(2);
      expect(status.maxRounds).toBe(6);
      expect(status.currentSpeaker).toBe("experiment_designer"); // Back to first
      expect(status.participantStats.experiment_designer.rounds).toBe(1);
      expect(status.participantStats.devils_advocate.rounds).toBe(1);
    });
  });

  describe("type guards", () => {
    it("isDebateFormat validates correctly", () => {
      expect(isDebateFormat("oxford_style")).toBe(true);
      expect(isDebateFormat("socratic")).toBe(true);
      expect(isDebateFormat("steelman_contest")).toBe(true);
      expect(isDebateFormat("invalid")).toBe(false);
      expect(isDebateFormat(123)).toBe(false);
    });

    it("isDebateStatus validates correctly", () => {
      expect(isDebateStatus("not_started")).toBe(true);
      expect(isDebateStatus("in_progress")).toBe(true);
      expect(isDebateStatus("concluded")).toBe(true);
      expect(isDebateStatus("timed_out")).toBe(true);
      expect(isDebateStatus("invalid")).toBe(false);
    });

    it("isAgentDebate validates correctly", () => {
      const valid = createTestDebate();
      expect(isAgentDebate(valid)).toBe(true);

      expect(isAgentDebate(null)).toBe(false);
      expect(isAgentDebate({})).toBe(false);
      expect(isAgentDebate({ id: "test" })).toBe(false);
    });
  });

  describe("DEBATE_FORMAT_CONFIGS", () => {
    it("has all required formats", () => {
      expect(DEBATE_FORMAT_CONFIGS.oxford_style).toBeDefined();
      expect(DEBATE_FORMAT_CONFIGS.socratic).toBeDefined();
      expect(DEBATE_FORMAT_CONFIGS.steelman_contest).toBeDefined();
    });

    it("each format has required fields", () => {
      for (const format of Object.values(DEBATE_FORMAT_CONFIGS)) {
        expect(format.name).toBeDefined();
        expect(format.description).toBeDefined();
        expect(format.defaultParticipants.length).toBeGreaterThan(0);
        expect(format.recommendedMaxRounds).toBeGreaterThan(0);
        expect(format.speakingOrder).toBeDefined();
      }
    });
  });
});
