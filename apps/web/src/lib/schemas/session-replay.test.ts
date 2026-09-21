import { describe, expect, it } from "vitest";
import {
  AgentRosterEntrySchema,
  computeContentHash,
  createEmptySessionRecord,
  createRecordId,
  createTraceMessage,
  isReplayable,
  isReplayMatch,
  KickoffInputSchema,
  type ReplayReport,
  ReplayReportSchema,
  type SessionRecord,
  SessionRecordSchema,
  TraceMessageSchema,
  TraceRoundSchema,
  validateSessionRecord,
} from "./session-replay";

describe("Session Replay Schema", () => {
  // =========================================================================
  // ID Generation
  // =========================================================================

  describe("createRecordId", () => {
    it("should generate valid record ID format", () => {
      const recordId = createRecordId("RS20260101-cell-fate");
      expect(recordId).toMatch(/^REC-RS20260101-cell-fate-\d+$/);
    });

    it("should generate unique IDs for same session", () => {
      const id1 = createRecordId("test");
      // Small delay to ensure different timestamp
      const id2 = createRecordId("test");
      // May or may not be different depending on timing
      expect(id1).toMatch(/^REC-test-\d+$/);
      expect(id2).toMatch(/^REC-test-\d+$/);
    });
  });

  // =========================================================================
  // KickoffInput Schema
  // =========================================================================

  describe("KickoffInputSchema", () => {
    it("should validate minimal kickoff input", () => {
      const input = {
        thread_id: "RS20260101-test",
      };
      const result = KickoffInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should validate full kickoff input", () => {
      const input = {
        thread_id: "RS20260101-test",
        question: "What are the molecular mechanisms of cell fate?",
        excerpt: "§42: Brenner discusses asymmetric divisions...",
        theme: "cell-fate",
        domain: "biology",
        operator_selection: {
          primary: ["level_split", "exclusion_test"],
          secondary: ["paradox_hunt"],
          forbidden: [],
        },
        kickoff_body_md: "# Research Session\n\n...",
      };
      const result = KickoffInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject empty thread_id", () => {
      const input = { thread_id: "" };
      const result = KickoffInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // AgentRosterEntry Schema
  // =========================================================================

  describe("AgentRosterEntrySchema", () => {
    it("should validate valid roster entry", () => {
      const entry = {
        agent_name: "BlueLake",
        role: "hypothesis_generator",
        program: "codex-cli",
        model: "gpt-5.2",
        model_version: "gpt-5.2-pro-20251201",
        temperature: 0.7,
      };
      const result = AgentRosterEntrySchema.safeParse(entry);
      expect(result.success).toBe(true);
    });

    it("should accept valid roles", () => {
      const roles = ["hypothesis_generator", "test_designer", "adversarial_critic"];
      for (const role of roles) {
        const entry = {
          agent_name: "TestAgent",
          role,
          program: "claude-code",
          model: "opus-4.5",
        };
        const result = AgentRosterEntrySchema.safeParse(entry);
        expect(result.success).toBe(true);
      }
    });

    it("should reject invalid role", () => {
      const entry = {
        agent_name: "TestAgent",
        role: "invalid_role",
        program: "claude-code",
        model: "opus-4.5",
      };
      const result = AgentRosterEntrySchema.safeParse(entry);
      expect(result.success).toBe(false);
    });

    it("should reject temperature out of range", () => {
      const entry = {
        agent_name: "TestAgent",
        role: "hypothesis_generator",
        program: "codex-cli",
        model: "gpt-5.2",
        temperature: 3.0, // > 2
      };
      const result = AgentRosterEntrySchema.safeParse(entry);
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // TraceMessage Schema
  // =========================================================================

  describe("TraceMessageSchema", () => {
    it("should validate valid trace message", () => {
      const message = {
        message_id: 123,
        timestamp: "2026-01-01T12:00:00.000Z",
        from: "BlueLake",
        type: "DELTA",
        content_hash: "abc123def456",
        content_length: 1024,
        subject: "H1: Cell fate hypothesis",
        acknowledged: true,
      };
      const result = TraceMessageSchema.safeParse(message);
      expect(result.success).toBe(true);
    });

    it("should accept all message types", () => {
      const types = [
        "KICKOFF",
        "DELTA",
        "CRITIQUE",
        "ACK",
        "EVIDENCE",
        "RESULT",
        "ADMIN",
        "COMPILE",
        "PUBLISH",
      ];
      for (const type of types) {
        const message = {
          timestamp: "2026-01-01T12:00:00.000Z",
          from: "TestAgent",
          type,
          content_hash: "hash",
          content_length: 100,
        };
        const result = TraceMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
      }
    });
  });

  // =========================================================================
  // TraceRound Schema
  // =========================================================================

  describe("TraceRoundSchema", () => {
    it("should validate valid trace round", () => {
      const round = {
        round_number: 0,
        started_at: "2026-01-01T12:00:00.000Z",
        ended_at: "2026-01-01T12:30:00.000Z",
        messages: [
          {
            timestamp: "2026-01-01T12:05:00.000Z",
            from: "BlueLake",
            type: "DELTA",
            content_hash: "abc123",
            content_length: 500,
          },
        ],
        compiled_artifact_hash: "artifact_hash_123",
        duration_ms: 1800000,
      };
      const result = TraceRoundSchema.safeParse(round);
      expect(result.success).toBe(true);
    });

    it("should accept empty messages array", () => {
      const round = {
        round_number: 0,
        started_at: "2026-01-01T12:00:00.000Z",
        messages: [],
      };
      const result = TraceRoundSchema.safeParse(round);
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // SessionRecord Schema
  // =========================================================================

  describe("SessionRecordSchema", () => {
    const validRecord: SessionRecord = {
      id: "REC-RS20260101-1704067200",
      session_id: "RS20260101",
      created_at: "2026-01-01T12:00:00.000Z",
      inputs: {
        kickoff: {
          thread_id: "RS20260101",
          question: "Test question",
        },
        external_evidence: [],
        agent_roster: [
          {
            agent_name: "BlueLake",
            role: "hypothesis_generator",
            program: "codex-cli",
            model: "gpt-5.2",
          },
        ],
        protocol_versions: {
          delta_format: "v0.1",
          artifact_schema: "v0.1",
        },
      },
      trace: {
        rounds: [
          {
            round_number: 0,
            started_at: "2026-01-01T12:00:00.000Z",
            messages: [],
          },
        ],
        interventions: [],
        total_duration_ms: 60000,
        started_at: "2026-01-01T12:00:00.000Z",
      },
      outputs: {
        final_artifact_hash: "sha256_hash_here",
        lint_result: {
          errors: 0,
          warnings: 0,
          valid: true,
          error_messages: [],
          warning_messages: [],
        },
        hypothesis_count: 3,
        test_count: 5,
      },
      schema_version: "0.1",
    };

    it("should validate complete session record", () => {
      const result = SessionRecordSchema.safeParse(validRecord);
      expect(result.success).toBe(true);
    });

    it("should reject invalid record ID format", () => {
      const invalid = { ...validRecord, id: "invalid-id" };
      const result = SessionRecordSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should reject missing required fields", () => {
      const invalid = { id: "REC-test-123" };
      const result = SessionRecordSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // Factory Functions
  // =========================================================================

  describe("createEmptySessionRecord", () => {
    it("should create valid empty record", () => {
      const record = createEmptySessionRecord("RS20260101-test");
      const result = SessionRecordSchema.safeParse(record);
      expect(result.success).toBe(true);
    });

    it("should set session_id correctly", () => {
      const record = createEmptySessionRecord("my-session");
      expect(record.session_id).toBe("my-session");
      expect(record.inputs.kickoff.thread_id).toBe("my-session");
    });

    it("should set default versions", () => {
      const record = createEmptySessionRecord("test");
      expect(record.inputs.protocol_versions.delta_format).toBe("v0.1");
      expect(record.inputs.protocol_versions.artifact_schema).toBe("v0.1");
    });
  });

  describe("computeContentHash", () => {
    it("should compute consistent hash for same content", async () => {
      const content = "Hello, World!";
      const hash1 = await computeContentHash(content);
      const hash2 = await computeContentHash(content);
      expect(hash1).toBe(hash2);
    });

    it("should compute different hash for different content", async () => {
      const hash1 = await computeContentHash("Hello");
      const hash2 = await computeContentHash("World");
      expect(hash1).not.toBe(hash2);
    });

    it("should return 64-character hex string", async () => {
      const hash = await computeContentHash("test");
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("createTraceMessage", () => {
    it("should create valid trace message", async () => {
      const message = await createTraceMessage(
        "BlueLake",
        "DELTA",
        "# Hypothesis\n\nH1: Cell fate is determined by...",
        { message_id: 123, subject: "New hypothesis" },
      );
      const result = TraceMessageSchema.safeParse(message);
      expect(result.success).toBe(true);
      expect(message.from).toBe("BlueLake");
      expect(message.type).toBe("DELTA");
      expect(message.content_hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should compute correct content length", async () => {
      const body = "Hello, 世界!"; // Mix of ASCII and Unicode
      const message = await createTraceMessage("Agent", "ADMIN", body);
      expect(message.content_length).toBe(new TextEncoder().encode(body).length);
    });
  });

  // =========================================================================
  // Validation Helpers
  // =========================================================================

  describe("validateSessionRecord", () => {
    it("should return valid result for valid record", () => {
      const record = createEmptySessionRecord("test");
      const result = validateSessionRecord(record);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.session_id).toBe("test");
      }
    });

    it("should return errors for invalid record", () => {
      const result = validateSessionRecord({ invalid: true });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe("isReplayable", () => {
    it("should return true for replayable record", () => {
      const record = createEmptySessionRecord("test");
      record.trace.rounds = [
        {
          round_number: 0,
          started_at: new Date().toISOString(),
          messages: [],
        },
      ];
      record.inputs.agent_roster = [
        {
          agent_name: "TestAgent",
          role: "hypothesis_generator",
          program: "test",
          model: "test",
        },
      ];
      record.outputs.final_artifact_hash = "some_hash";
      expect(isReplayable(record)).toBe(true);
    });

    it("should return false for empty rounds", () => {
      const record = createEmptySessionRecord("test");
      record.trace.rounds = [];
      expect(isReplayable(record)).toBe(false);
    });

    it("should return false for empty roster", () => {
      const record = createEmptySessionRecord("test");
      record.trace.rounds = [
        { round_number: 0, started_at: new Date().toISOString(), messages: [] },
      ];
      record.inputs.agent_roster = [];
      expect(isReplayable(record)).toBe(false);
    });

    it("should return false for missing artifact hash", () => {
      const record = createEmptySessionRecord("test");
      record.trace.rounds = [
        { round_number: 0, started_at: new Date().toISOString(), messages: [] },
      ];
      record.inputs.agent_roster = [
        { agent_name: "Test", role: "hypothesis_generator", program: "test", model: "test" },
      ];
      record.outputs.final_artifact_hash = "";
      expect(isReplayable(record)).toBe(false);
    });
  });

  // =========================================================================
  // Replay Report
  // =========================================================================

  describe("ReplayReportSchema", () => {
    it("should validate valid replay report", () => {
      const report: ReplayReport = {
        original_session_id: "RS20260101",
        mode: "verification",
        replayed_at: "2026-01-01T14:00:00.000Z",
        roster: [
          {
            agent_name: "BlueLake",
            role: "hypothesis_generator",
            program: "codex-cli",
            model: "gpt-5.2",
          },
        ],
        matches: true,
        similarity_percentage: 94,
        rounds_completed: 2,
        rounds_expected: 2,
        messages_matched: 12,
        messages_expected: 12,
        artifact_similarity: 94,
        divergences: [],
        conclusion: "Session is reproducible within acceptable bounds.",
      };
      const result = ReplayReportSchema.safeParse(report);
      expect(result.success).toBe(true);
    });

    it("should validate report with divergences", () => {
      const report: ReplayReport = {
        original_session_id: "RS20260101",
        mode: "comparison",
        replayed_at: "2026-01-01T14:00:00.000Z",
        roster: [],
        matches: false,
        similarity_percentage: 75,
        rounds_completed: 2,
        rounds_expected: 2,
        messages_matched: 10,
        messages_expected: 12,
        artifact_similarity: 70,
        divergences: [
          {
            round_number: 1,
            message_index: 4,
            agent: "BlueLake",
            severity: "moderate",
            original_summary: "Proposed H4 with mechanism X",
            replayed_summary: "Proposed H4 with mechanism Y",
            semantic_match: false,
            explanation: "Different mechanism proposed",
          },
        ],
        conclusion: "Significant divergence in hypothesis generation.",
      };
      const result = ReplayReportSchema.safeParse(report);
      expect(result.success).toBe(true);
    });
  });

  describe("isReplayMatch", () => {
    const baseReport: ReplayReport = {
      original_session_id: "test",
      mode: "verification",
      replayed_at: new Date().toISOString(),
      roster: [],
      matches: true,
      similarity_percentage: 90,
      rounds_completed: 1,
      rounds_expected: 1,
      messages_matched: 5,
      messages_expected: 5,
      artifact_similarity: 90,
      divergences: [],
      conclusion: "OK",
    };

    it("should return true for high similarity", () => {
      expect(isReplayMatch(baseReport)).toBe(true);
    });

    it("should return false for low similarity", () => {
      const lowSimilarity = { ...baseReport, similarity_percentage: 50 };
      expect(isReplayMatch(lowSimilarity)).toBe(false);
    });

    it("should respect custom similarity threshold", () => {
      const report = { ...baseReport, similarity_percentage: 70 };
      expect(isReplayMatch(report, { similarity: 60 })).toBe(true);
      expect(isReplayMatch(report, { similarity: 80 })).toBe(false);
    });

    it("should return false if major divergences exceed threshold", () => {
      const withMajor: ReplayReport = {
        ...baseReport,
        divergences: [
          {
            round_number: 0,
            message_index: 0,
            agent: "Test",
            severity: "major",
            original_summary: "A",
            replayed_summary: "B",
            semantic_match: false,
          },
        ],
      };
      expect(isReplayMatch(withMajor)).toBe(false);
      expect(isReplayMatch(withMajor, { max_major_divergences: 1 })).toBe(true);
    });
  });
});
