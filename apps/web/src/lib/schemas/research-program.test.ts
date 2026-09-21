import { describe, expect, it } from "vitest";
import {
  abandonProgram,
  addSessionToProgram,
  completeProgram,
  createResearchProgram,
  generateProgramId,
  HealthWarningSchema,
  HypothesisFunnelSchema,
  isValidProgramId,
  isValidSessionId,
  ProgramDashboardSchema,
  ProgramStatusSchema,
  pauseProgram,
  RegistryHealthSchema,
  type ResearchProgram,
  ResearchProgramSchema,
  removeSessionFromProgram,
  resumeProgram,
  TestExecutionSummarySchema,
  TimelineEventSchema,
} from "./research-program";

// ============================================================================
// Test Fixtures
// ============================================================================

function createValidProgramData(): Partial<ResearchProgram> {
  return {
    id: "RP-CELL-FATE-001",
    name: "Cell Fate Determination Study",
    description: "Investigating mechanisms of cell fate determination in C. elegans embryo",
    sessions: ["RS20251230", "RS20251231"],
    status: "active",
    createdAt: "2025-12-30T10:00:00Z",
    updatedAt: "2025-12-30T10:00:00Z",
  };
}

function createMinimalProgram(): ResearchProgram {
  return ResearchProgramSchema.parse(createValidProgramData());
}

// ============================================================================
// Enum Tests
// ============================================================================

describe("ProgramStatusSchema", () => {
  it("accepts all valid statuses", () => {
    const statuses = ["active", "paused", "completed", "abandoned"] as const;
    for (const status of statuses) {
      const result = ProgramStatusSchema.safeParse(status);
      expect(result.success, `Status ${status} should be valid`).toBe(true);
    }
  });

  it("rejects invalid statuses", () => {
    const invalidStatuses = ["running", "finished", "cancelled", ""];
    for (const status of invalidStatuses) {
      const result = ProgramStatusSchema.safeParse(status);
      expect(result.success, `Status ${status} should be invalid`).toBe(false);
    }
  });
});

// ============================================================================
// Sub-Schema Tests
// ============================================================================

describe("HypothesisFunnelSchema", () => {
  it("accepts valid funnel data", () => {
    const funnel = {
      proposed: 12,
      active: 5,
      underAttack: 2,
      assumptionUndermined: 1,
      killed: 6,
      validated: 0,
      dormant: 1,
      refined: 2,
      byOrigin: {
        original: 8,
        thirdAlternative: 3,
        anomalySpawned: 1,
      },
    };
    const result = HypothesisFunnelSchema.safeParse(funnel);
    expect(result.success).toBe(true);
  });

  it("rejects negative counts", () => {
    const funnel = {
      proposed: -1,
      active: 5,
      underAttack: 2,
      assumptionUndermined: 1,
      killed: 6,
      validated: 0,
      dormant: 1,
      refined: 2,
      byOrigin: {
        original: 8,
        thirdAlternative: 3,
        anomalySpawned: 1,
      },
    };
    const result = HypothesisFunnelSchema.safeParse(funnel);
    expect(result.success).toBe(false);
  });
});

describe("RegistryHealthSchema", () => {
  it("accepts valid registry health data", () => {
    const health = {
      total: 10,
      byStatus: {
        unchecked: 5,
        verified: 3,
        falsified: 2,
      },
      metrics: {
        scalePhysicsCount: 2,
        coverageRate: 0.75,
      },
    };
    const result = RegistryHealthSchema.safeParse(health);
    expect(result.success).toBe(true);
  });
});

describe("TestExecutionSummarySchema", () => {
  it("accepts valid test summary", () => {
    const summary = {
      designed: 8,
      inProgress: 2,
      completed: 3,
      blocked: 1,
      potencyCoverage: 0.75,
      avgEvidenceScore: 7.5,
    };
    const result = TestExecutionSummarySchema.safeParse(summary);
    expect(result.success).toBe(true);
  });

  it("rejects potency coverage above 1", () => {
    const summary = {
      designed: 8,
      inProgress: 2,
      completed: 3,
      blocked: 1,
      potencyCoverage: 1.5,
    };
    const result = TestExecutionSummarySchema.safeParse(summary);
    expect(result.success).toBe(false);
  });

  it("rejects evidence score above 12", () => {
    const summary = {
      designed: 8,
      inProgress: 2,
      completed: 3,
      blocked: 1,
      potencyCoverage: 0.75,
      avgEvidenceScore: 15,
    };
    const result = TestExecutionSummarySchema.safeParse(summary);
    expect(result.success).toBe(false);
  });
});

describe("TimelineEventSchema", () => {
  it("accepts all event types", () => {
    const eventTypes = [
      "session_started",
      "hypothesis_proposed",
      "hypothesis_killed",
      "hypothesis_validated",
      "test_executed",
      "assumption_verified",
      "assumption_falsified",
      "anomaly_recorded",
      "anomaly_resolved",
      "critique_raised",
      "critique_addressed",
      "program_status_changed",
    ] as const;

    for (const eventType of eventTypes) {
      const event = {
        timestamp: "2025-12-30T10:00:00Z",
        eventType,
        description: "Test event",
      };
      const result = TimelineEventSchema.safeParse(event);
      expect(result.success, `Event type ${eventType} should be valid`).toBe(true);
    }
  });
});

describe("HealthWarningSchema", () => {
  it("accepts valid warning", () => {
    const warning = {
      code: "NO_SCALE_PHYSICS",
      severity: "critical",
      message: "No scale_physics assumptions recorded",
      relatedIds: ["A-RS20251230-001"],
      suggestion: "Add at least one scale/physics assumption",
    };
    const result = HealthWarningSchema.safeParse(warning);
    expect(result.success).toBe(true);
  });

  it("accepts all severity levels", () => {
    const severities = ["info", "warning", "critical"] as const;
    for (const severity of severities) {
      const warning = {
        code: "TEST",
        severity,
        message: "Test message",
      };
      const result = HealthWarningSchema.safeParse(warning);
      expect(result.success, `Severity ${severity} should be valid`).toBe(true);
    }
  });
});

// ============================================================================
// Main Schema Tests
// ============================================================================

describe("ResearchProgramSchema", () => {
  describe("valid cases", () => {
    it("accepts valid program with all required fields", () => {
      const data = createValidProgramData();
      const result = ResearchProgramSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("accepts program with optional fields", () => {
      const data = {
        ...createValidProgramData(),
        notes: "This is a detailed study",
        closedAt: "2025-12-31T10:00:00Z",
        abandonedReason: "Superseded by new approach",
      };
      const result = ResearchProgramSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("accepts program with empty sessions array", () => {
      const data = {
        ...createValidProgramData(),
        sessions: [],
      };
      const result = ResearchProgramSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("accepts all valid statuses", () => {
      const statuses = ["active", "paused", "completed", "abandoned"] as const;
      for (const status of statuses) {
        const data = { ...createValidProgramData(), status };
        const result = ResearchProgramSchema.safeParse(data);
        expect(result.success, `Status ${status} should be valid`).toBe(true);
      }
    });
  });

  describe("invalid cases", () => {
    it("rejects missing required fields", () => {
      const data = { id: "RP-CELL-FATE-001" };
      const result = ResearchProgramSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects invalid ID format", () => {
      const invalidIds = [
        "CELL-FATE-001", // Missing RP- prefix
        "RP-001", // Missing slug
        "RP-CELL-FATE", // Missing sequence
        "RP-CELL-FATE-1", // Sequence not zero-padded
        "RP--FATE-001", // Empty slug part (starts with -)
      ];

      for (const id of invalidIds) {
        const data = { ...createValidProgramData(), id };
        const result = ResearchProgramSchema.safeParse(data);
        expect(result.success, `ID ${id} should be invalid`).toBe(false);
      }
    });

    it("rejects name too short", () => {
      const data = { ...createValidProgramData(), name: "AB" };
      const result = ResearchProgramSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects description too short", () => {
      const data = { ...createValidProgramData(), description: "Short" };
      const result = ResearchProgramSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects invalid session ID format", () => {
      const data = {
        ...createValidProgramData(),
        sessions: ["invalid-session"],
      };
      const result = ResearchProgramSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects invalid status", () => {
      const data = { ...createValidProgramData(), status: "running" };
      const result = ResearchProgramSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects invalid timestamp format", () => {
      const data = { ...createValidProgramData(), createdAt: "not-a-timestamp" };
      const result = ResearchProgramSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe("createResearchProgram", () => {
  it("creates program with required fields", () => {
    const program = createResearchProgram({
      id: "RP-TEST-001",
      name: "Test Program",
      description: "A program for testing purposes",
    });

    expect(program.id).toBe("RP-TEST-001");
    expect(program.name).toBe("Test Program");
    expect(program.description).toBe("A program for testing purposes");
    expect(program.status).toBe("active");
    expect(program.sessions).toEqual([]);
    expect(program.createdAt).toBeDefined();
    expect(program.updatedAt).toBeDefined();
  });

  it("creates program with optional fields", () => {
    const program = createResearchProgram({
      id: "RP-TEST-001",
      name: "Test Program",
      description: "A program for testing purposes",
      sessions: ["RS20251230"],
      notes: "Some notes",
    });

    expect(program.sessions).toEqual(["RS20251230"]);
    expect(program.notes).toBe("Some notes");
  });
});

describe("generateProgramId", () => {
  it("generates ID from simple slug", () => {
    const id = generateProgramId("cell-fate", []);
    expect(id).toBe("RP-CELL-FATE-001");
  });

  it("generates ID with sanitized slug", () => {
    const id = generateProgramId("Cell Fate Study!", []);
    expect(id).toBe("RP-CELL-FATE-STUDY-001");
  });

  it("avoids collision with existing IDs", () => {
    const existing = ["RP-CELL-FATE-001", "RP-CELL-FATE-002"];
    const id = generateProgramId("cell-fate", existing);
    expect(id).toBe("RP-CELL-FATE-003");
  });

  it("fills gaps in sequence", () => {
    const existing = ["RP-CELL-FATE-001", "RP-CELL-FATE-003"];
    const id = generateProgramId("cell-fate", existing);
    expect(id).toBe("RP-CELL-FATE-002");
  });

  it("throws on empty slug", () => {
    expect(() => generateProgramId("", [])).toThrow();
  });

  it("throws on slug with only special characters", () => {
    expect(() => generateProgramId("!!!", [])).toThrow();
  });
});

// ============================================================================
// Transition Function Tests
// ============================================================================

describe("addSessionToProgram", () => {
  it("adds a new session", () => {
    const program = createMinimalProgram();
    const updated = addSessionToProgram(program, "RS20260101");

    expect(updated.sessions).toContain("RS20260101");
    expect(updated.updatedAt).not.toBe(program.updatedAt);
  });

  it("throws on duplicate session", () => {
    const program = createMinimalProgram();
    expect(() => addSessionToProgram(program, "RS20251230")).toThrow();
  });

  it("throws on invalid session ID", () => {
    const program = createMinimalProgram();
    expect(() => addSessionToProgram(program, "invalid")).toThrow();
  });
});

describe("removeSessionFromProgram", () => {
  it("removes an existing session", () => {
    const program = createMinimalProgram();
    const updated = removeSessionFromProgram(program, "RS20251230");

    expect(updated.sessions).not.toContain("RS20251230");
    expect(updated.sessions).toContain("RS20251231");
  });

  it("throws when session not found", () => {
    const program = createMinimalProgram();
    expect(() => removeSessionFromProgram(program, "RS99999999")).toThrow();
  });
});

describe("pauseProgram", () => {
  it("pauses an active program", () => {
    const program = createMinimalProgram();
    const paused = pauseProgram(program, "Resource constraints");

    expect(paused.status).toBe("paused");
    expect(paused.notes).toContain("Paused: Resource constraints");
  });

  it("pauses program without reason", () => {
    const program = createMinimalProgram();
    const paused = pauseProgram(program);

    expect(paused.status).toBe("paused");
  });

  it("throws when pausing completed program", () => {
    const program = ResearchProgramSchema.parse({
      ...createValidProgramData(),
      status: "completed",
    });
    expect(() => pauseProgram(program)).toThrow();
  });

  it("throws when pausing abandoned program", () => {
    const program = ResearchProgramSchema.parse({
      ...createValidProgramData(),
      status: "abandoned",
    });
    expect(() => pauseProgram(program)).toThrow();
  });
});

describe("resumeProgram", () => {
  it("resumes a paused program", () => {
    const program = ResearchProgramSchema.parse({
      ...createValidProgramData(),
      status: "paused",
    });
    const resumed = resumeProgram(program);

    expect(resumed.status).toBe("active");
  });

  it("throws when resuming non-paused program", () => {
    const program = createMinimalProgram();
    expect(() => resumeProgram(program)).toThrow();
  });
});

describe("completeProgram", () => {
  it("completes an active program", () => {
    const program = createMinimalProgram();
    const completed = completeProgram(program, "Goals achieved");

    expect(completed.status).toBe("completed");
    expect(completed.closedAt).toBeDefined();
    expect(completed.notes).toContain("Completed: Goals achieved");
  });

  it("completes program without summary", () => {
    const program = createMinimalProgram();
    const completed = completeProgram(program);

    expect(completed.status).toBe("completed");
    expect(completed.closedAt).toBeDefined();
  });

  it("throws when completing already completed program", () => {
    const program = ResearchProgramSchema.parse({
      ...createValidProgramData(),
      status: "completed",
    });
    expect(() => completeProgram(program)).toThrow();
  });
});

describe("abandonProgram", () => {
  it("abandons an active program", () => {
    const program = createMinimalProgram();
    const abandoned = abandonProgram(program, "Superseded by new approach with better methodology");

    expect(abandoned.status).toBe("abandoned");
    expect(abandoned.abandonedReason).toBe("Superseded by new approach with better methodology");
    expect(abandoned.closedAt).toBeDefined();
  });

  it("throws on short abandonment reason", () => {
    const program = createMinimalProgram();
    expect(() => abandonProgram(program, "Short")).toThrow();
  });

  it("throws when abandoning already abandoned program", () => {
    const program = ResearchProgramSchema.parse({
      ...createValidProgramData(),
      status: "abandoned",
    });
    expect(() => abandonProgram(program, "Another reason for abandoning this program")).toThrow();
  });
});

// ============================================================================
// Validation Helper Tests
// ============================================================================

describe("isValidProgramId", () => {
  it("returns true for valid IDs", () => {
    expect(isValidProgramId("RP-CELL-FATE-001")).toBe(true);
    expect(isValidProgramId("RP-AB-999")).toBe(true);
    expect(isValidProgramId("RP-LONG-SLUG-NAME-123")).toBe(true);
  });

  it("returns false for invalid IDs", () => {
    expect(isValidProgramId("CELL-FATE-001")).toBe(false); // Missing RP- prefix
    expect(isValidProgramId("RP-001")).toBe(false); // Missing slug
    expect(isValidProgramId("RP--FATE-001")).toBe(false); // Dash after RP- (not alphanumeric)
    expect(isValidProgramId("")).toBe(false);
  });
});

describe("isValidSessionId", () => {
  it("returns true for valid session IDs", () => {
    expect(isValidSessionId("RS20251230")).toBe(true);
    expect(isValidSessionId("RS-20251230")).toBe(true); // with dash after RS
    expect(isValidSessionId("RSa20251230")).toBe(true); // alphanumeric after RS
    expect(isValidSessionId("RS20251230-1")).toBe(true); // dashes allowed after initial char
  });

  it("returns false for invalid session IDs", () => {
    expect(isValidSessionId("invalid")).toBe(false);
    expect(isValidSessionId("20251230")).toBe(false);
    expect(isValidSessionId("")).toBe(false);
  });
});

// ============================================================================
// Dashboard Schema Tests
// ============================================================================

describe("ProgramDashboardSchema", () => {
  it("accepts valid dashboard data", () => {
    const dashboard = {
      generatedAt: "2025-12-30T10:00:00Z",
      hypothesisFunnel: {
        proposed: 12,
        active: 5,
        underAttack: 2,
        assumptionUndermined: 1,
        killed: 6,
        validated: 0,
        dormant: 1,
        refined: 2,
        byOrigin: {
          original: 8,
          thirdAlternative: 3,
          anomalySpawned: 1,
        },
      },
      registryHealth: {
        hypotheses: { total: 12, byStatus: { active: 5, killed: 6, dormant: 1 } },
        assumptions: { total: 8, byStatus: { unchecked: 3, verified: 5 } },
        anomalies: { total: 3, byStatus: { active: 2, resolved: 1 } },
        critiques: { total: 5, byStatus: { active: 2, addressed: 3 } },
      },
      testExecution: {
        designed: 8,
        inProgress: 2,
        completed: 3,
        blocked: 1,
        potencyCoverage: 0.75,
        avgEvidenceScore: 7.5,
      },
      warnings: [
        {
          code: "LOW_POTENCY",
          severity: "warning",
          message: "Potency coverage below 80%",
        },
      ],
      recentEvents: [
        {
          timestamp: "2025-12-30T09:00:00Z",
          eventType: "hypothesis_killed",
          description: "H1 killed by T1",
          entityId: "H-RS20251230-001",
          sessionId: "RS20251230",
        },
      ],
    };

    const result = ProgramDashboardSchema.safeParse(dashboard);
    expect(result.success).toBe(true);
  });
});
