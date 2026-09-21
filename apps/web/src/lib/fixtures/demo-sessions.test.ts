/**
 * Tests for Demo Session Fixtures
 */

import { describe, expect, it } from "vitest";
import {
  DEMO_SESSIONS,
  type DemoMessage,
  type DemoSession,
  type DemoThreadSummary,
  getDemoSession,
  getDemoThreadMessages,
  getDemoThreadSummaries,
  isDemoSession,
} from "./demo-sessions";

describe("Demo Sessions Fixtures", () => {
  describe("DEMO_SESSIONS", () => {
    it("contains at least 2 demo sessions", () => {
      expect(DEMO_SESSIONS.length).toBeGreaterThanOrEqual(2);
    });

    it("each session has both summary and messages", () => {
      for (const session of DEMO_SESSIONS) {
        expect(session.summary).toBeDefined();
        expect(session.messages).toBeDefined();
        expect(session.messages.length).toBeGreaterThan(0);
      }
    });

    it("summaries have correct ThreadSummary shape", () => {
      for (const session of DEMO_SESSIONS) {
        const { summary } = session;
        expect(typeof summary.threadId).toBe("string");
        expect(typeof summary.messageCount).toBe("number");
        expect(typeof summary.firstMessageTs).toBe("string");
        expect(typeof summary.lastMessageTs).toBe("string");
        expect(typeof summary.phase).toBe("string");
        expect(typeof summary.hasArtifact).toBe("boolean");
        expect(typeof summary.pendingAcks).toBe("number");
        expect(Array.isArray(summary.participants)).toBe(true);
      }
    });

    it("threadIds are unique", () => {
      const ids = DEMO_SESSIONS.map((s) => s.summary.threadId);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("threadIds start with demo- prefix", () => {
      for (const session of DEMO_SESSIONS) {
        expect(session.summary.threadId).toMatch(/^demo-/);
      }
    });

    it("timestamps are valid ISO strings", () => {
      for (const session of DEMO_SESSIONS) {
        const first = new Date(session.summary.firstMessageTs);
        const last = new Date(session.summary.lastMessageTs);
        expect(first.getTime()).not.toBeNaN();
        expect(last.getTime()).not.toBeNaN();
        expect(last.getTime()).toBeGreaterThanOrEqual(first.getTime());
      }
    });

    it("includes sessions with different phases", () => {
      const phases = new Set(DEMO_SESSIONS.map((s) => s.summary.phase));
      expect(phases.size).toBeGreaterThan(1);
    });

    it("messages have required fields", () => {
      for (const session of DEMO_SESSIONS) {
        for (const msg of session.messages) {
          expect(msg.id).toBeDefined();
          expect(msg.thread_id).toBe(session.summary.threadId);
          expect(msg.subject).toBeDefined();
          expect(msg.body_md).toBeDefined();
          expect(msg.from).toBeDefined();
          expect(msg.created_ts).toBeDefined();
        }
      }
    });

    it("message counts match actual message arrays", () => {
      for (const session of DEMO_SESSIONS) {
        expect(session.summary.messageCount).toBe(session.messages.length);
      }
    });

    it("message timestamps are within summary timestamp range", () => {
      for (const session of DEMO_SESSIONS) {
        const first = new Date(session.summary.firstMessageTs).getTime();
        const last = new Date(session.summary.lastMessageTs).getTime();

        for (const msg of session.messages) {
          const msgTime = new Date(msg.created_ts).getTime();
          expect(msgTime).toBeGreaterThanOrEqual(first);
          expect(msgTime).toBeLessThanOrEqual(last);
        }
      }
    });

    it("compiled sessions have hasArtifact=true", () => {
      const compiledSessions = DEMO_SESSIONS.filter(
        (s) => s.summary.phase === "compiled" || s.summary.phase === "in_critique",
      );
      expect(compiledSessions.length).toBeGreaterThan(0);
      for (const session of compiledSessions) {
        expect(session.summary.hasArtifact).toBe(true);
      }
    });

    it("awaiting_responses sessions have pending acks", () => {
      const awaitingSessions = DEMO_SESSIONS.filter(
        (s) => s.summary.phase === "awaiting_responses",
      );
      for (const session of awaitingSessions) {
        expect(session.summary.pendingAcks).toBeGreaterThan(0);
      }
    });
  });

  describe("getDemoThreadSummaries", () => {
    it("returns all summaries", () => {
      const summaries = getDemoThreadSummaries();
      expect(summaries.length).toBe(DEMO_SESSIONS.length);
    });

    it("returns only summary objects (not full sessions)", () => {
      const summaries = getDemoThreadSummaries();
      for (const summary of summaries) {
        expect(summary).toHaveProperty("threadId");
        expect(summary).toHaveProperty("phase");
        expect(summary).not.toHaveProperty("messages");
      }
    });
  });

  describe("getDemoThreadMessages", () => {
    it("returns messages for valid demo threadId", () => {
      const validId = DEMO_SESSIONS[0].summary.threadId;
      const messages = getDemoThreadMessages(validId);
      expect(messages).not.toBeNull();
      expect(messages!.length).toBeGreaterThan(0);
    });

    it("returns null for non-existent demo threadId", () => {
      expect(getDemoThreadMessages("demo-nonexistent-999")).toBeNull();
    });

    it("returns null for non-demo threadId", () => {
      expect(getDemoThreadMessages("TKT-123")).toBeNull();
      expect(getDemoThreadMessages("SESSION-abc")).toBeNull();
    });

    it("returns correct messages for each session", () => {
      for (const session of DEMO_SESSIONS) {
        const messages = getDemoThreadMessages(session.summary.threadId);
        expect(messages).toEqual(session.messages);
      }
    });
  });

  describe("isDemoSession", () => {
    it("returns true for demo- prefixed ids", () => {
      expect(isDemoSession("demo-test-123")).toBe(true);
      expect(isDemoSession("demo-bio-nanochat-001")).toBe(true);
      expect(isDemoSession("demo-")).toBe(true);
    });

    it("returns false for non-demo ids", () => {
      expect(isDemoSession("TKT-123")).toBe(false);
      expect(isDemoSession("SESSION-abc")).toBe(false);
      expect(isDemoSession("DEMO-uppercase")).toBe(false); // Case sensitive
      expect(isDemoSession("xdemo-fake")).toBe(false);
      expect(isDemoSession("")).toBe(false);
    });

    it("returns true for all fixture threadIds", () => {
      for (const session of DEMO_SESSIONS) {
        expect(isDemoSession(session.summary.threadId)).toBe(true);
      }
    });
  });

  describe("getDemoSession", () => {
    it("returns full session for valid threadId", () => {
      const session = getDemoSession(DEMO_SESSIONS[0].summary.threadId);
      expect(session).not.toBeNull();
      expect(session).toHaveProperty("summary");
      expect(session).toHaveProperty("messages");
    });

    it("returns null for invalid threadId", () => {
      expect(getDemoSession("demo-nonexistent")).toBeNull();
      expect(getDemoSession("TKT-123")).toBeNull();
    });

    it("returns correct session for each threadId", () => {
      for (const session of DEMO_SESSIONS) {
        const retrieved = getDemoSession(session.summary.threadId);
        expect(retrieved).toEqual(session);
      }
    });
  });

  describe("data quality", () => {
    it("messages have meaningful content (not empty)", () => {
      for (const session of DEMO_SESSIONS) {
        for (const msg of session.messages) {
          expect(msg.subject.length).toBeGreaterThan(5);
          expect(msg.body_md.length).toBeGreaterThan(50);
        }
      }
    });

    it("participants list matches message senders", () => {
      for (const session of DEMO_SESSIONS) {
        const senders = new Set(session.messages.map((m) => m.from));
        for (const sender of senders) {
          expect(session.summary.participants).toContain(sender);
        }
      }
    });

    it("first message is a KICKOFF", () => {
      for (const session of DEMO_SESSIONS) {
        const firstMsg = session.messages[0];
        expect(firstMsg.subject).toMatch(/KICKOFF/i);
      }
    });

    it("compiled sessions have a COMPILED message", () => {
      const compiledSessions = DEMO_SESSIONS.filter(
        (s) => s.summary.phase === "compiled" || s.summary.phase === "in_critique",
      );
      for (const session of compiledSessions) {
        const hasCompiled = session.messages.some((m) => m.subject.match(/COMPILED/i));
        expect(hasCompiled).toBe(true);
      }
    });
  });
});
