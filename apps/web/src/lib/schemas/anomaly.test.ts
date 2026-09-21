import { describe, expect, it } from "vitest";
import {
  type Anomaly,
  type AnomalyConflictsWith,
  AnomalyConflictsWithSchema,
  AnomalySchema,
  type AnomalySource,
  AnomalySourceSchema,
  canSpawnHypothesis,
  createAnomaly,
  createExperimentalAnomaly,
  createLiteratureAnomaly,
  deferAnomaly,
  generateAnomalyId,
  isValidAnomalyId,
  linkSpawnedHypothesis,
  markParadigmShifting,
  QuarantineStatusSchema,
  reactivateAnomaly,
  resolveAnomaly,
  validateQuarantineDiscipline,
} from "./anomaly";

// ============================================================================
// Test Fixtures
// ============================================================================

function createValidAnomalyData(): Partial<Anomaly> {
  return {
    id: "X-RS20251230-001",
    observation: "AB lineage shows position-dependent fates, but EMS does not",
    source: {
      type: "experiment",
      reference: "T-RS20251230-001",
    },
    conflictsWith: {
      hypotheses: ["H-RS20251230-001", "H-RS20251230-002"],
      assumptions: [],
      description: "This contradicts both lineage determination hypotheses",
    },
    quarantineStatus: "active",
    sessionId: "RS-20251230",
    createdAt: "2025-12-30T10:00:00Z",
    updatedAt: "2025-12-30T10:00:00Z",
  };
}

function createMinimalAnomaly(): Anomaly {
  return AnomalySchema.parse(createValidAnomalyData());
}

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("AnomalySchema", () => {
  describe("valid cases", () => {
    it("accepts valid anomaly with all required fields", () => {
      const data = createValidAnomalyData();
      const result = AnomalySchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("accepts anomaly with optional fields", () => {
      const data = {
        ...createValidAnomalyData(),
        name: "Position-dependent fate anomaly",
        resolutionPlan: "Design experiment to test gradient signaling",
        resolvedBy: "H-RS20251230-003",
        resolvedAt: "2025-12-31T10:00:00Z",
        spawnedHypotheses: ["H-RS20251230-004"],
        recordedBy: "BlueLake",
        isInference: true,
        tags: ["lineage", "cell-fate"],
        notes: "This is a critical observation",
        severity: 2,
      };
      const result = AnomalySchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("accepts all quarantine statuses", () => {
      const statuses = ["active", "resolved", "deferred", "paradigm_shifting"] as const;
      for (const status of statuses) {
        const data = { ...createValidAnomalyData(), quarantineStatus: status };
        const result = AnomalySchema.safeParse(data);
        expect(result.success, `Status ${status} should be valid`).toBe(true);
      }
    });

    it("accepts all source types", () => {
      const types = ["experiment", "literature", "discussion", "calculation"] as const;
      for (const type of types) {
        const data = {
          ...createValidAnomalyData(),
          source: { type },
        };
        const result = AnomalySchema.safeParse(data);
        expect(result.success, `Source type ${type} should be valid`).toBe(true);
      }
    });
  });

  describe("invalid cases", () => {
    it("rejects invalid anomaly ID format", () => {
      const invalidIds = [
        "X-123", // Missing session-seq format
        "H-RS20251230-001", // Wrong prefix (hypothesis)
        "A-RS20251230-001", // Wrong prefix (assumption)
        "X-001", // Missing session
        "X-RS20251230-1", // Non-padded sequence
        "X-RS20251230-1000", // Sequence too long
      ];

      for (const id of invalidIds) {
        const data = { ...createValidAnomalyData(), id };
        const result = AnomalySchema.safeParse(data);
        expect(result.success, `ID ${id} should be invalid`).toBe(false);
      }
    });

    it("rejects observation shorter than 10 characters", () => {
      const data = { ...createValidAnomalyData(), observation: "Too short" };
      const result = AnomalySchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects missing sessionId", () => {
      const data = { ...createValidAnomalyData() };
      delete (data as Record<string, unknown>).sessionId;
      const result = AnomalySchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects invalid hypothesis ID in conflictsWith", () => {
      const data = {
        ...createValidAnomalyData(),
        conflictsWith: {
          hypotheses: ["invalid-id"],
          assumptions: [],
          description: "This should fail",
        },
      };
      const result = AnomalySchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects invalid assumption ID in conflictsWith", () => {
      const data = {
        ...createValidAnomalyData(),
        conflictsWith: {
          hypotheses: [],
          assumptions: ["invalid-assumption"],
          description: "This should fail too",
        },
      };
      const result = AnomalySchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects invalid anchor format in source", () => {
      const data = {
        ...createValidAnomalyData(),
        source: {
          type: "discussion" as const,
          anchors: ["invalid-anchor"],
        },
      };
      const result = AnomalySchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects invalid resolvedBy hypothesis ID", () => {
      const data = {
        ...createValidAnomalyData(),
        quarantineStatus: "resolved" as const,
        resolvedBy: "not-a-valid-id",
      };
      const result = AnomalySchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects severity outside 1-5 range", () => {
      const invalidSeverities = [0, 6, -1, 100];
      for (const severity of invalidSeverities) {
        const data = { ...createValidAnomalyData(), severity };
        const result = AnomalySchema.safeParse(data);
        expect(result.success, `Severity ${severity} should be invalid`).toBe(false);
      }
    });

    it("rejects notes longer than 2000 characters", () => {
      const data = { ...createValidAnomalyData(), notes: "x".repeat(2001) };
      const result = AnomalySchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});

describe("QuarantineStatusSchema", () => {
  it("accepts all valid statuses", () => {
    const statuses = ["active", "resolved", "deferred", "paradigm_shifting"];
    for (const status of statuses) {
      expect(QuarantineStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it("rejects invalid statuses", () => {
    const invalid = ["ACTIVE", "pending", "closed", ""];
    for (const status of invalid) {
      expect(QuarantineStatusSchema.safeParse(status).success).toBe(false);
    }
  });
});

describe("AnomalySourceSchema", () => {
  it("accepts valid source with anchors", () => {
    const source: AnomalySource = {
      type: "discussion",
      reference: "Session RS-20251230",
      anchors: ["§42", "§103-105"],
    };
    expect(AnomalySourceSchema.safeParse(source).success).toBe(true);
  });

  it("accepts source with citation", () => {
    const source: AnomalySource = {
      type: "literature",
      citation: "Brenner, S. (2002). Nature, 420(6912), 12.",
    };
    expect(AnomalySourceSchema.safeParse(source).success).toBe(true);
  });

  it("rejects invalid anchor format", () => {
    const source = {
      type: "discussion",
      anchors: ["section 42"], // Invalid format
    };
    expect(AnomalySourceSchema.safeParse(source).success).toBe(false);
  });
});

describe("AnomalyConflictsWithSchema", () => {
  it("accepts valid conflicts", () => {
    const conflicts: AnomalyConflictsWith = {
      hypotheses: ["H-RS20251230-001"],
      assumptions: ["A-RS20251230-001"],
      description: "This conflicts with both the hypothesis and the assumption",
    };
    expect(AnomalyConflictsWithSchema.safeParse(conflicts).success).toBe(true);
  });

  it("accepts empty hypothesis and assumption arrays", () => {
    const conflicts: AnomalyConflictsWith = {
      hypotheses: [],
      assumptions: [],
      description: "General observation that conflicts with our framework",
    };
    expect(AnomalyConflictsWithSchema.safeParse(conflicts).success).toBe(true);
  });

  it("rejects description shorter than 10 characters", () => {
    const conflicts = {
      hypotheses: [],
      assumptions: [],
      description: "Too short",
    };
    expect(AnomalyConflictsWithSchema.safeParse(conflicts).success).toBe(false);
  });
});

// ============================================================================
// ID Generation Tests
// ============================================================================

describe("generateAnomalyId", () => {
  it("generates first ID for a session", () => {
    const id = generateAnomalyId("RS20251230", []);
    expect(id).toBe("X-RS20251230-001");
  });

  it("increments sequence for existing IDs", () => {
    const existing = ["X-RS20251230-001", "X-RS20251230-002"];
    const id = generateAnomalyId("RS20251230", existing);
    expect(id).toBe("X-RS20251230-003");
  });

  it("ignores IDs from other sessions", () => {
    const existing = ["X-OTHER-001", "X-OTHER-002"];
    const id = generateAnomalyId("RS20251230", existing);
    expect(id).toBe("X-RS20251230-001");
  });

  it("handles mixed session IDs", () => {
    const existing = ["X-RS20251230-001", "X-OTHER-002", "X-RS20251230-002"];
    const id = generateAnomalyId("RS20251230", existing);
    expect(id).toBe("X-RS20251230-003");
  });

  it("throws on sequence overflow", () => {
    const existing = Array.from(
      { length: 999 },
      (_, i) => `X-RS20251230-${(i + 1).toString().padStart(3, "0")}`,
    );
    expect(() => generateAnomalyId("RS20251230", existing)).toThrow(/sequence overflow/i);
  });
});

describe("isValidAnomalyId", () => {
  it("validates correct IDs", () => {
    const validIds = ["X-RS20251230-001", "X-CELL-FATE-002", "X-session123-999"];
    for (const id of validIds) {
      expect(isValidAnomalyId(id), `${id} should be valid`).toBe(true);
    }
  });

  it("rejects invalid IDs", () => {
    const invalidIds = ["X-001", "H-RS20251230-001", "X-RS20251230-1", "anomaly-123"];
    for (const id of invalidIds) {
      expect(isValidAnomalyId(id), `${id} should be invalid`).toBe(false);
    }
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe("createAnomaly", () => {
  it("creates valid anomaly with required fields", () => {
    const anomaly = createAnomaly({
      id: "X-RS20251230-001",
      observation: "Unexpected pattern in cell division timing",
      source: { type: "experiment", reference: "T-RS20251230-001" },
      conflictsWith: {
        hypotheses: ["H-RS20251230-001"],
        assumptions: [],
        description: "This conflicts with our timing hypothesis",
      },
      sessionId: "RS-20251230",
    });

    expect(anomaly.id).toBe("X-RS20251230-001");
    expect(anomaly.quarantineStatus).toBe("active");
    expect(anomaly.isInference).toBe(false);
    expect(anomaly.createdAt).toBeDefined();
    expect(anomaly.updatedAt).toBeDefined();
  });

  it("creates anomaly with optional fields", () => {
    const anomaly = createAnomaly({
      id: "X-RS20251230-002",
      observation: "Another unexpected observation",
      source: { type: "literature" },
      conflictsWith: {
        hypotheses: [],
        assumptions: [],
        description: "General conflict",
      },
      sessionId: "RS-20251230",
      name: "Named Anomaly",
      recordedBy: "GreenCastle",
      resolutionPlan: "Plan to resolve",
      severity: 3,
      tags: ["important"],
    });

    expect(anomaly.name).toBe("Named Anomaly");
    expect(anomaly.recordedBy).toBe("GreenCastle");
    expect(anomaly.resolutionPlan).toBe("Plan to resolve");
    expect(anomaly.severity).toBe(3);
    expect(anomaly.tags).toEqual(["important"]);
  });
});

describe("createExperimentalAnomaly", () => {
  it("creates anomaly from experiment", () => {
    const anomaly = createExperimentalAnomaly({
      id: "X-RS20251230-001",
      observation: "Test result contradicts expected outcome",
      testReference: "T-RS20251230-001",
      conflictsWithHypotheses: ["H-RS20251230-001", "H-RS20251230-002"],
      conflictDescription: "Both hypotheses predicted different outcomes",
      sessionId: "RS-20251230",
      recordedBy: "BlueLake",
    });

    expect(anomaly.source.type).toBe("experiment");
    expect(anomaly.source.reference).toBe("T-RS20251230-001");
    expect(anomaly.conflictsWith.hypotheses).toHaveLength(2);
    expect(anomaly.recordedBy).toBe("BlueLake");
  });
});

describe("createLiteratureAnomaly", () => {
  it("creates anomaly from literature", () => {
    const anomaly = createLiteratureAnomaly({
      id: "X-RS20251230-001",
      observation: "Published finding contradicts our model",
      citation: "Smith et al. (2025). Nature.",
      conflictsWithHypotheses: ["H-RS20251230-001"],
      conflictsWithAssumptions: ["A-RS20251230-001"],
      conflictDescription: "This paper shows our assumption is wrong",
      sessionId: "RS-20251230",
    });

    expect(anomaly.source.type).toBe("literature");
    expect(anomaly.source.citation).toBe("Smith et al. (2025). Nature.");
    expect(anomaly.conflictsWith.assumptions).toHaveLength(1);
  });
});

// ============================================================================
// Transition Function Tests
// ============================================================================

describe("resolveAnomaly", () => {
  it("resolves active anomaly", () => {
    const anomaly = createMinimalAnomaly();
    const resolved = resolveAnomaly(anomaly, "H-RS20251230-003");

    expect(resolved.quarantineStatus).toBe("resolved");
    expect(resolved.resolvedBy).toBe("H-RS20251230-003");
    expect(resolved.resolvedAt).toBeDefined();
    expect(new Date(resolved.updatedAt) > new Date(anomaly.updatedAt)).toBe(true);
  });

  it("throws when resolving already resolved anomaly", () => {
    const anomaly = createMinimalAnomaly();
    const resolved = resolveAnomaly(anomaly, "H-RS20251230-003");

    expect(() => resolveAnomaly(resolved, "H-RS20251230-004")).toThrow(/already resolved/i);
  });

  it("preserves notes when resolving", () => {
    const anomaly = { ...createMinimalAnomaly(), notes: "Original notes" };
    const resolved = resolveAnomaly(anomaly, "H-RS20251230-003");

    expect(resolved.notes).toBe("Original notes");
  });

  it("allows adding notes when resolving", () => {
    const anomaly = createMinimalAnomaly();
    const resolved = resolveAnomaly(anomaly, "H-RS20251230-003", {
      notes: "Resolved with new insight",
    });

    expect(resolved.notes).toBe("Resolved with new insight");
  });
});

describe("deferAnomaly", () => {
  it("defers active anomaly", () => {
    const anomaly = createMinimalAnomaly();
    const deferred = deferAnomaly(anomaly, "Waiting for more data");

    expect(deferred.quarantineStatus).toBe("deferred");
    expect(deferred.resolutionPlan).toBe("Waiting for more data");
  });

  it("throws when deferring resolved anomaly", () => {
    const anomaly = {
      ...createMinimalAnomaly(),
      quarantineStatus: "resolved" as const,
    };

    expect(() => deferAnomaly(anomaly, "Reason")).toThrow(/cannot defer resolved/i);
  });
});

describe("markParadigmShifting", () => {
  it("marks anomaly as paradigm-shifting", () => {
    const anomaly = createMinimalAnomaly();
    const paradigmShifting = markParadigmShifting(anomaly, "This changes everything");

    expect(paradigmShifting.quarantineStatus).toBe("paradigm_shifting");
    expect(paradigmShifting.notes).toBe("This changes everything");
  });
});

describe("reactivateAnomaly", () => {
  it("reactivates deferred anomaly", () => {
    const anomaly = {
      ...createMinimalAnomaly(),
      quarantineStatus: "deferred" as const,
    };
    const reactivated = reactivateAnomaly(anomaly);

    expect(reactivated.quarantineStatus).toBe("active");
  });

  it("throws when reactivating non-deferred anomaly", () => {
    const anomaly = createMinimalAnomaly(); // status = active

    expect(() => reactivateAnomaly(anomaly)).toThrow(/expected 'deferred'/i);
  });
});

describe("linkSpawnedHypothesis", () => {
  it("links spawned hypothesis to anomaly", () => {
    const anomaly = createMinimalAnomaly();
    const linked = linkSpawnedHypothesis(anomaly, "H-RS20251230-003");

    expect(linked.spawnedHypotheses).toContain("H-RS20251230-003");
  });

  it("does not duplicate existing links", () => {
    const anomaly = {
      ...createMinimalAnomaly(),
      spawnedHypotheses: ["H-RS20251230-003"],
    };
    const linked = linkSpawnedHypothesis(anomaly, "H-RS20251230-003");

    expect(linked.spawnedHypotheses).toHaveLength(1);
  });

  it("appends to existing spawned hypotheses", () => {
    const anomaly = {
      ...createMinimalAnomaly(),
      spawnedHypotheses: ["H-RS20251230-003"],
    };
    const linked = linkSpawnedHypothesis(anomaly, "H-RS20251230-004");

    expect(linked.spawnedHypotheses).toHaveLength(2);
    expect(linked.spawnedHypotheses).toContain("H-RS20251230-003");
    expect(linked.spawnedHypotheses).toContain("H-RS20251230-004");
  });
});

// ============================================================================
// Validation Helper Tests
// ============================================================================

describe("validateQuarantineDiscipline", () => {
  it("gives score 0 for brief observation", () => {
    const anomaly = {
      ...createMinimalAnomaly(),
      observation: "Too short", // < 20 chars
    } as Anomaly;
    // Need to bypass schema for this test
    const result = validateQuarantineDiscipline(anomaly);

    expect(result.score).toBe(0);
    expect(result.issues.some((issue) => /too brief/i.test(issue))).toBe(true);
  });

  it("gives score 1 for basic anomaly", () => {
    const anomaly = {
      ...createMinimalAnomaly(),
      conflictsWith: {
        hypotheses: [],
        assumptions: [],
        description: "Short desc", // < 20 chars
      },
    };
    const result = validateQuarantineDiscipline(anomaly);

    expect(result.score).toBe(1);
  });

  it("gives score 2 for anomaly with proper conflict description", () => {
    const anomaly = createMinimalAnomaly();
    const result = validateQuarantineDiscipline(anomaly);

    expect(result.score).toBeGreaterThanOrEqual(2);
  });

  it("gives score 3 for fully tracked anomaly", () => {
    const anomaly = {
      ...createMinimalAnomaly(),
      resolutionPlan: "Will run additional test T-002",
      conflictsWith: {
        hypotheses: ["H-RS20251230-001"],
        assumptions: [],
        description: "This contradicts our main hypothesis",
      },
      source: {
        type: "experiment" as const,
        reference: "T-RS20251230-001",
      },
    };
    const result = validateQuarantineDiscipline(anomaly);

    expect(result.score).toBe(3);
  });

  it("warns about deferred without resolution plan", () => {
    const anomaly = {
      ...createMinimalAnomaly(),
      quarantineStatus: "deferred" as const,
      resolutionPlan: undefined,
    };
    const result = validateQuarantineDiscipline(anomaly);

    expect(result.issues.some((issue) => /occam's broom/i.test(issue))).toBe(true);
  });
});

describe("canSpawnHypothesis", () => {
  it("returns true for paradigm-shifting anomaly", () => {
    const anomaly = {
      ...createMinimalAnomaly(),
      quarantineStatus: "paradigm_shifting" as const,
    };
    const result = canSpawnHypothesis(anomaly);

    expect(result.canSpawn).toBe(true);
    expect(result.reason).toMatch(/paradigm-shifting/i);
  });

  it("returns true for active anomaly with conflicts", () => {
    const anomaly = createMinimalAnomaly();
    const result = canSpawnHypothesis(anomaly);

    expect(result.canSpawn).toBe(true);
    expect(result.reason).toMatch(/third alternative/i);
  });

  it("returns false for resolved anomaly", () => {
    const anomaly = {
      ...createMinimalAnomaly(),
      quarantineStatus: "resolved" as const,
    };
    const result = canSpawnHypothesis(anomaly);

    expect(result.canSpawn).toBe(false);
    expect(result.reason).toMatch(/resolved/i);
  });

  it("returns true if already has spawned hypotheses", () => {
    const anomaly = {
      ...createMinimalAnomaly(),
      spawnedHypotheses: ["H-RS20251230-003"],
    };
    const result = canSpawnHypothesis(anomaly);

    expect(result.canSpawn).toBe(true);
    expect(result.reason).toMatch(/already spawned/i);
  });

  it("returns false for deferred anomaly", () => {
    const anomaly = {
      ...createMinimalAnomaly(),
      quarantineStatus: "deferred" as const,
    };
    const result = canSpawnHypothesis(anomaly);

    expect(result.canSpawn).toBe(false);
    expect(result.reason).toMatch(/deferred/i);
  });
});
