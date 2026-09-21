import { describe, expect, it } from "vitest";
import {
  type Assumption,
  AssumptionCriticalitySchema,
  AssumptionLoadSchema,
  AssumptionSchema,
  AssumptionStatusSchema,
  AssumptionTypeSchema,
  createAssumption,
  createScaleAssumption,
  evaluateScaleRigor,
  generateAssumptionId,
  getAffectedByFalsification,
  isValidAnchor,
  isValidAssumptionId,
  type ScaleCalculation,
  ScaleCalculationSchema,
  validateScaleAssumptionPresence,
  warnMissingCalculation,
} from "./assumption";

describe("AssumptionSchema", () => {
  const validAssumption = {
    id: "A-RS20251230-001",
    statement: "Diffusion is the dominant transport mechanism at this scale.",
    type: "scale_physics" as const,
    criticality: "foundational" as const,
    status: "unchecked" as const,
    dependsOn: ["A1"],
    load: {
      affectedHypotheses: ["H-RS20251230-001"],
      affectedTests: ["T-RS20251230-001"],
      description: "All gradient-based hypotheses depend on this.",
    },
    testMethod: "Measure diffusion coefficients and compare with convection rates.",
    calculation: {
      quantities: "D ≈ 10 μm²/s, L ≈ 100 μm",
      result: "τ ≈ L²/D ≈ 1000s ≈ 17 min",
      units: "seconds, micrometers",
      implication: "Gradient-based signaling is physically plausible",
      whatItRulesOut: "Rules out H3 if τ > cell cycle",
    },
    anchors: ["§58", "§147"],
    sessionId: "RS20251230",
    recordedBy: "GreenCastle",
    createdAt: "2025-12-30T19:00:00Z",
    updatedAt: "2025-12-30T19:00:00Z",
    notes: "From Brenner transcript discussion of scale constraints.",
  };

  it("parses a valid assumption", () => {
    const result = AssumptionSchema.safeParse(validAssumption);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("A-RS20251230-001");
      expect(result.data.type).toBe("scale_physics");
      expect(result.data.status).toBe("unchecked");
      expect(result.data.criticality).toBe("foundational");
      expect(result.data.dependsOn).toEqual(["A1"]);
    }
  });

  it("rejects invalid assumption ID format", () => {
    const invalid = { ...validAssumption, id: "invalid-id" };
    const result = AssumptionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects assumption ID without proper sequence", () => {
    const invalid = { ...validAssumption, id: "A-RS20251230-1" }; // needs 3 digits
    const result = AssumptionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("accepts alternative valid ID formats", () => {
    const variations = [
      "A-CELL-FATE-001-001",
      "A-test-session-999",
      "A-ABC123-001",
      // Simple format for backwards compatibility
      "A1",
      "A42",
      "A999",
    ];
    for (const id of variations) {
      const data = { ...validAssumption, id };
      const result = AssumptionSchema.safeParse(data);
      expect(result.success, `Expected ${id} to be valid`).toBe(true);
    }
  });

  it("rejects statement that is too short", () => {
    const invalid = { ...validAssumption, statement: "Short" };
    const result = AssumptionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("validates anchor format", () => {
    const validAnchors = ["§1", "§123", "§45-50", "§1-999"];
    const invalidAnchors = ["#1", "S1", "§", "§-1", "1"];

    for (const anchor of validAnchors) {
      const data = { ...validAssumption, anchors: [anchor] };
      const result = AssumptionSchema.safeParse(data);
      expect(result.success, `Expected ${anchor} to be valid`).toBe(true);
    }

    for (const anchor of invalidAnchors) {
      const data = { ...validAssumption, anchors: [anchor] };
      const result = AssumptionSchema.safeParse(data);
      expect(result.success, `Expected ${anchor} to be invalid`).toBe(false);
    }
  });

  it("accepts assumption without optional fields", () => {
    const minimal = {
      id: "A-RS20251230-001",
      statement: "This is a minimal assumption statement.",
      type: "background" as const,
      status: "unchecked" as const,
      load: {
        affectedHypotheses: [],
        affectedTests: [],
        description: "No dependencies yet.",
      },
      sessionId: "RS20251230",
      createdAt: "2025-12-30T19:00:00Z",
      updatedAt: "2025-12-30T19:00:00Z",
    };
    const result = AssumptionSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.criticality).toBe("important");
      expect(result.data.dependsOn).toEqual([]);
    }
  });

  it("requires load field", () => {
    const withoutLoad = { ...validAssumption };
    delete (withoutLoad as Record<string, unknown>).load;
    const result = AssumptionSchema.safeParse(withoutLoad);
    expect(result.success).toBe(false);
  });

  it("validates load.affectedHypotheses format", () => {
    const invalidLoad = {
      ...validAssumption,
      load: {
        ...validAssumption.load,
        affectedHypotheses: ["invalid-id"],
      },
    };
    const result = AssumptionSchema.safeParse(invalidLoad);
    expect(result.success).toBe(false);
  });

  it("validates load.affectedTests format", () => {
    const invalidLoad = {
      ...validAssumption,
      load: {
        ...validAssumption.load,
        affectedTests: ["invalid-id"],
      },
    };
    const result = AssumptionSchema.safeParse(invalidLoad);
    expect(result.success).toBe(false);
  });

  it("rejects invalid dependsOn IDs", () => {
    const invalid = { ...validAssumption, dependsOn: ["bad-id"] };
    const result = AssumptionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe("Enum schemas", () => {
  it("validates assumption types", () => {
    expect(AssumptionTypeSchema.safeParse("background").success).toBe(true);
    expect(AssumptionTypeSchema.safeParse("methodological").success).toBe(true);
    expect(AssumptionTypeSchema.safeParse("boundary").success).toBe(true);
    expect(AssumptionTypeSchema.safeParse("scale_physics").success).toBe(true);
    expect(AssumptionTypeSchema.safeParse("unknown").success).toBe(false);
  });

  it("validates status types", () => {
    expect(AssumptionStatusSchema.safeParse("unchecked").success).toBe(true);
    expect(AssumptionStatusSchema.safeParse("challenged").success).toBe(true);
    expect(AssumptionStatusSchema.safeParse("verified").success).toBe(true);
    expect(AssumptionStatusSchema.safeParse("falsified").success).toBe(true);
    expect(AssumptionStatusSchema.safeParse("invalid").success).toBe(false);
  });

  it("validates criticality types", () => {
    expect(AssumptionCriticalitySchema.safeParse("foundational").success).toBe(true);
    expect(AssumptionCriticalitySchema.safeParse("important").success).toBe(true);
    expect(AssumptionCriticalitySchema.safeParse("minor").success).toBe(true);
    expect(AssumptionCriticalitySchema.safeParse("critical").success).toBe(false);
  });
});

describe("AssumptionLoadSchema", () => {
  it("validates a complete load object", () => {
    const load = {
      affectedHypotheses: ["H-RS20251230-001", "H-RS20251230-002"],
      affectedTests: ["T-RS20251230-001"],
      description: "Gradient hypotheses depend on this.",
    };
    const result = AssumptionLoadSchema.safeParse(load);
    expect(result.success).toBe(true);
  });

  it("accepts empty arrays for hypotheses and tests", () => {
    const load = {
      affectedHypotheses: [],
      affectedTests: [],
      description: "No dependencies yet.",
    };
    const result = AssumptionLoadSchema.safeParse(load);
    expect(result.success).toBe(true);
  });

  it("accepts simple format test IDs for backwards compatibility", () => {
    const load = {
      affectedHypotheses: ["H-RS20251230-001"],
      affectedTests: ["T1", "T42", "T999"],
      description: "Using simple test ID format.",
    };
    const result = AssumptionLoadSchema.safeParse(load);
    expect(result.success).toBe(true);
  });

  it("rejects empty description", () => {
    const load = {
      affectedHypotheses: [],
      affectedTests: [],
      description: "",
    };
    const result = AssumptionLoadSchema.safeParse(load);
    expect(result.success).toBe(false);
  });
});

describe("ScaleCalculationSchema", () => {
  it("validates a complete calculation", () => {
    const calculation = {
      quantities: "D ≈ 10 μm²/s, L ≈ 100 μm",
      result: "τ ≈ L²/D ≈ 1000s",
      units: "seconds, micrometers",
      implication: "Gradient-based signaling is plausible",
      whatItRulesOut: "Rules out fast transport",
    };
    const result = ScaleCalculationSchema.safeParse(calculation);
    expect(result.success).toBe(true);
  });

  it("accepts calculation without whatItRulesOut", () => {
    const calculation = {
      quantities: "D ≈ 10 μm²/s",
      result: "τ ≈ 1000s",
      units: "seconds",
      implication: "Gradient-based signaling is plausible",
    };
    const result = ScaleCalculationSchema.safeParse(calculation);
    expect(result.success).toBe(true);
  });

  it("rejects calculation without required fields", () => {
    const missingQuantities = {
      result: "τ ≈ 1000s",
      units: "seconds",
      implication: "Gradient-based signaling is plausible",
    };
    expect(ScaleCalculationSchema.safeParse(missingQuantities).success).toBe(false);

    const missingResult = {
      quantities: "D ≈ 10 μm²/s",
      units: "seconds",
      implication: "Gradient-based signaling is plausible",
    };
    expect(ScaleCalculationSchema.safeParse(missingResult).success).toBe(false);
  });
});

describe("warnMissingCalculation", () => {
  const baseAssumption = (overrides: Partial<Assumption>): Assumption => ({
    id: "A-TEST-001",
    statement: "Test statement for assumption.",
    type: "scale_physics",
    criticality: "important",
    status: "unchecked",
    dependsOn: [],
    load: {
      affectedHypotheses: [],
      affectedTests: [],
      description: "No dependencies.",
    },
    sessionId: "TEST",
    createdAt: "2025-12-30T19:00:00Z",
    updatedAt: "2025-12-30T19:00:00Z",
    ...overrides,
  });

  it("returns warning for scale_physics without calculation", () => {
    const assumption = baseAssumption({ type: "scale_physics", calculation: undefined });
    const warning = warnMissingCalculation(assumption);
    expect(warning).not.toBeNull();
    expect(warning).toContain("should include a calculation");
  });

  it("returns null for scale_physics with calculation", () => {
    const assumption = baseAssumption({
      type: "scale_physics",
      calculation: {
        quantities: "D ≈ 10 μm²/s",
        result: "τ ≈ 1000s",
        units: "seconds",
        implication: "Gradient signaling plausible",
      },
    });
    const warning = warnMissingCalculation(assumption);
    expect(warning).toBeNull();
  });

  it("returns null for non-scale_physics without calculation", () => {
    const assumption = baseAssumption({ type: "background", calculation: undefined });
    const warning = warnMissingCalculation(assumption);
    expect(warning).toBeNull();
  });
});

describe("evaluateScaleRigor", () => {
  it("returns 0 for no calculation", () => {
    expect(evaluateScaleRigor(undefined)).toBe(0);
  });

  it("returns 1 for incomplete calculation", () => {
    const incomplete: ScaleCalculation = {
      quantities: "D ≈ 10 μm²/s",
      result: "",
      units: "",
      implication: "",
    };
    expect(evaluateScaleRigor(incomplete)).toBe(1);
  });

  it("returns 2 for calculation missing implication", () => {
    const missingImplication: ScaleCalculation = {
      quantities: "D ≈ 10 μm²/s",
      result: "τ ≈ 1000s",
      units: "seconds",
      implication: "",
    };
    expect(evaluateScaleRigor(missingImplication)).toBe(2);
  });

  it("returns 3 for complete calculation", () => {
    const complete: ScaleCalculation = {
      quantities: "D ≈ 10 μm²/s",
      result: "τ ≈ 1000s",
      units: "seconds",
      implication: "Gradient signaling is plausible",
    };
    expect(evaluateScaleRigor(complete)).toBe(3);
  });
});

describe("validateScaleAssumptionPresence", () => {
  const baseAssumption = (overrides: Partial<Assumption>): Assumption => ({
    id: "A-TEST-001",
    statement: "Test statement for assumption.",
    type: "background",
    criticality: "important",
    status: "unchecked",
    dependsOn: [],
    load: {
      affectedHypotheses: [],
      affectedTests: [],
      description: "No dependencies.",
    },
    sessionId: "TEST",
    createdAt: "2025-12-30T19:00:00Z",
    updatedAt: "2025-12-30T19:00:00Z",
    ...overrides,
  });

  it("returns present=false when no scale_physics assumption", () => {
    const assumptions = [
      baseAssumption({ id: "A-TEST-001", type: "background" }),
      baseAssumption({ id: "A-TEST-002", type: "methodological" }),
    ];
    const result = validateScaleAssumptionPresence(assumptions);
    expect(result.present).toBe(false);
    expect(result.count).toBe(0);
    expect(result.message).toContain("MUST have at least one");
  });

  it("returns present=true with rigor levels for scale_physics assumptions", () => {
    const assumptions = [
      baseAssumption({
        id: "A-TEST-001",
        type: "scale_physics",
        calculation: {
          quantities: "D ≈ 10 μm²/s",
          result: "τ ≈ 1000s",
          units: "seconds",
          implication: "Gradient signaling plausible",
        },
      }),
    ];
    const result = validateScaleAssumptionPresence(assumptions);
    expect(result.present).toBe(true);
    expect(result.count).toBe(1);
    expect(result.rigorLevels).toContain(3);
  });

  it("handles multiple scale_physics assumptions", () => {
    const assumptions = [
      baseAssumption({
        id: "A-TEST-001",
        type: "scale_physics",
        calculation: undefined,
      }),
      baseAssumption({
        id: "A-TEST-002",
        type: "scale_physics",
        calculation: {
          quantities: "D ≈ 10 μm²/s",
          result: "τ ≈ 1000s",
          units: "seconds",
          implication: "Gradient signaling plausible",
        },
      }),
    ];
    const result = validateScaleAssumptionPresence(assumptions);
    expect(result.present).toBe(true);
    expect(result.count).toBe(2);
    expect(result.rigorLevels).toContain(0);
    expect(result.rigorLevels).toContain(3);
  });
});

describe("getAffectedByFalsification", () => {
  it("returns linked hypotheses and tests", () => {
    const assumption: Assumption = {
      id: "A-TEST-001",
      statement: "Test assumption.",
      type: "background",
      criticality: "important",
      status: "unchecked",
      dependsOn: [],
      load: {
        affectedHypotheses: ["H-TEST-001", "H-TEST-002"],
        affectedTests: ["T-TEST-001"],
        description: "Dependencies.",
      },
      sessionId: "TEST",
      createdAt: "2025-12-30T19:00:00Z",
      updatedAt: "2025-12-30T19:00:00Z",
    };

    const affected = getAffectedByFalsification(assumption);
    expect(affected.hypotheses).toEqual(["H-TEST-001", "H-TEST-002"]);
    expect(affected.tests).toEqual(["T-TEST-001"]);
  });
});

describe("generateAssumptionId", () => {
  it("generates first ID for empty session", () => {
    const id = generateAssumptionId("RS20251230", []);
    expect(id).toBe("A-RS20251230-001");
  });

  it("generates sequential IDs", () => {
    const existing = ["A-RS20251230-001", "A-RS20251230-002"];
    const id = generateAssumptionId("RS20251230", existing);
    expect(id).toBe("A-RS20251230-003");
  });

  it("handles gaps in sequence", () => {
    const existing = ["A-RS20251230-001", "A-RS20251230-005"];
    const id = generateAssumptionId("RS20251230", existing);
    expect(id).toBe("A-RS20251230-006");
  });

  it("ignores IDs from other sessions", () => {
    const existing = ["A-OTHER-001", "A-OTHER-002"];
    const id = generateAssumptionId("RS20251230", existing);
    expect(id).toBe("A-RS20251230-001");
  });

  it("pads sequence to 3 digits", () => {
    const id = generateAssumptionId("TEST", []);
    expect(id).toMatch(/-\d{3}$/);
  });

  it("throws error on sequence overflow (>999)", () => {
    const existing = ["A-TEST-999"];
    expect(() => generateAssumptionId("TEST", existing)).toThrow(/sequence overflow/i);
  });

  it("handles sequence 999 as valid (boundary case)", () => {
    const existing = ["A-TEST-998"];
    const id = generateAssumptionId("TEST", existing);
    expect(id).toBe("A-TEST-999");
  });
});

describe("isValidAssumptionId", () => {
  it("validates correct IDs", () => {
    expect(isValidAssumptionId("A-RS20251230-001")).toBe(true);
    expect(isValidAssumptionId("A-test-999")).toBe(true);
    expect(isValidAssumptionId("A-ABC-123-456")).toBe(true);
  });

  it("validates simple format IDs for backwards compatibility", () => {
    expect(isValidAssumptionId("A1")).toBe(true);
    expect(isValidAssumptionId("A42")).toBe(true);
    expect(isValidAssumptionId("A999")).toBe(true);
  });

  it("rejects invalid IDs", () => {
    expect(isValidAssumptionId("invalid")).toBe(false);
    expect(isValidAssumptionId("A-test")).toBe(false);
    expect(isValidAssumptionId("A-test-1")).toBe(false);
    expect(isValidAssumptionId("H-test-001")).toBe(false);
    expect(isValidAssumptionId("A")).toBe(false); // Just A without number
  });
});

describe("isValidAnchor", () => {
  it("validates correct anchors", () => {
    expect(isValidAnchor("§1")).toBe(true);
    expect(isValidAnchor("§123")).toBe(true);
    expect(isValidAnchor("§1-5")).toBe(true);
    expect(isValidAnchor("§100-200")).toBe(true);
  });

  it("rejects invalid anchors", () => {
    expect(isValidAnchor("1")).toBe(false);
    expect(isValidAnchor("#1")).toBe(false);
    expect(isValidAnchor("§")).toBe(false);
    expect(isValidAnchor("section 1")).toBe(false);
  });
});

describe("createAssumption", () => {
  it("creates a valid assumption with defaults", () => {
    const assumption = createAssumption({
      id: "A-TEST-001",
      statement: "This is a test assumption for validation.",
      type: "background",
      sessionId: "TEST",
      load: {
        affectedHypotheses: [],
        affectedTests: [],
        description: "No dependencies.",
      },
    });

    expect(assumption.id).toBe("A-TEST-001");
    expect(assumption.type).toBe("background");
    expect(assumption.status).toBe("unchecked");
    expect(assumption.createdAt).toBeDefined();
    expect(assumption.updatedAt).toBeDefined();
  });

  it("accepts optional fields", () => {
    const assumption = createAssumption({
      id: "A-TEST-001",
      statement: "This is a test assumption for validation.",
      type: "scale_physics",
      sessionId: "TEST",
      load: {
        affectedHypotheses: ["H-TEST-001"],
        affectedTests: [],
        description: "Hypothesis H-TEST-001 depends on this.",
      },
      calculation: {
        quantities: "D ≈ 10 μm²/s",
        result: "τ ≈ 1000s",
        units: "seconds",
        implication: "Gradient signaling plausible",
      },
      testMethod: "Measure diffusion coefficients.",
      recordedBy: "GreenCastle",
    });

    expect(assumption.calculation).toBeDefined();
    expect(assumption.testMethod).toBe("Measure diffusion coefficients.");
    expect(assumption.recordedBy).toBe("GreenCastle");
  });
});

describe("createScaleAssumption", () => {
  it("creates a scale_physics assumption with correct type", () => {
    const assumption = createScaleAssumption({
      id: "A-TEST-001",
      statement: "Diffusion is dominant at this scale.",
      sessionId: "TEST",
      load: {
        affectedHypotheses: [],
        affectedTests: [],
        description: "No dependencies yet.",
      },
      calculation: {
        quantities: "D ≈ 10 μm²/s, L ≈ 100 μm",
        result: "τ ≈ 1000s",
        units: "seconds, micrometers",
        implication: "Gradient-based signaling is plausible",
      },
    });

    expect(assumption.type).toBe("scale_physics");
    expect(assumption.status).toBe("unchecked");
    expect(assumption.calculation).toBeDefined();
  });
});

// ============================================================================
// Boundary Condition Tests
// ============================================================================

describe("Schema boundary conditions", () => {
  const validBase = {
    id: "A-TEST-001",
    type: "background" as const,
    status: "unchecked" as const,
    load: {
      affectedHypotheses: [],
      affectedTests: [],
      description: "No dependencies.",
    },
    sessionId: "TEST",
    createdAt: "2025-12-30T19:00:00Z",
    updatedAt: "2025-12-30T19:00:00Z",
  };

  describe("statement length boundaries", () => {
    it("accepts statement with exactly 10 characters (minimum)", () => {
      const data = { ...validBase, statement: "1234567890" }; // exactly 10
      const result = AssumptionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects statement with 9 characters (below minimum)", () => {
      const data = { ...validBase, statement: "123456789" }; // 9 chars
      const result = AssumptionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("accepts statement with exactly 500 characters (maximum)", () => {
      const data = { ...validBase, statement: "x".repeat(500) };
      const result = AssumptionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects statement with 501 characters (above maximum)", () => {
      const data = { ...validBase, statement: "x".repeat(501) };
      const result = AssumptionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("testMethod length boundaries", () => {
    it("accepts testMethod with exactly 1000 characters (maximum)", () => {
      const data = {
        ...validBase,
        statement: "Valid statement here.",
        testMethod: "x".repeat(1000),
      };
      const result = AssumptionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects testMethod with 1001 characters (above maximum)", () => {
      const data = {
        ...validBase,
        statement: "Valid statement here.",
        testMethod: "x".repeat(1001),
      };
      const result = AssumptionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("notes length boundaries", () => {
    it("accepts notes with exactly 2000 characters (maximum)", () => {
      const data = {
        ...validBase,
        statement: "Valid statement here.",
        notes: "x".repeat(2000),
      };
      const result = AssumptionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects notes with 2001 characters (above maximum)", () => {
      const data = {
        ...validBase,
        statement: "Valid statement here.",
        notes: "x".repeat(2001),
      };
      const result = AssumptionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("datetime validation", () => {
    it("rejects invalid datetime format for createdAt", () => {
      const data = {
        ...validBase,
        statement: "Valid statement here.",
        createdAt: "not-a-date",
      };
      const result = AssumptionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects invalid datetime format for updatedAt", () => {
      const data = {
        ...validBase,
        statement: "Valid statement here.",
        updatedAt: "2025-12-30",
      };
      const result = AssumptionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("sessionId validation", () => {
    it("rejects empty sessionId", () => {
      const data = {
        ...validBase,
        statement: "Valid statement here.",
        sessionId: "",
      };
      const result = AssumptionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});

describe("ID format edge cases", () => {
  it("rejects assumption ID with lowercase 'a' prefix", () => {
    expect(isValidAssumptionId("a-TEST-001")).toBe(false);
  });

  it("rejects assumption ID with spaces", () => {
    expect(isValidAssumptionId("A-TEST 001-001")).toBe(false);
  });

  it("validates complex session IDs with underscores", () => {
    expect(isValidAssumptionId("A-RS_2025_12_30-001")).toBe(true);
  });

  it("validates session IDs starting with numbers after first char", () => {
    expect(isValidAssumptionId("A-S20251230-001")).toBe(true);
  });
});

describe("Anchor format edge cases", () => {
  it("validates single digit anchors", () => {
    expect(isValidAnchor("§1")).toBe(true);
    expect(isValidAnchor("§0")).toBe(true);
  });

  it("validates multi-digit anchors", () => {
    expect(isValidAnchor("§12345")).toBe(true);
  });

  it("rejects anchor ranges in wrong order (still valid format)", () => {
    // Note: §50-1 is still a valid format, even if semantically odd
    expect(isValidAnchor("§50-1")).toBe(true);
  });

  it("rejects negative numbers in anchors", () => {
    expect(isValidAnchor("§-5")).toBe(false);
  });
});

describe("evaluateScaleRigor edge cases", () => {
  it("returns 1 when result is empty (quantities present, other fields ignored)", () => {
    // Per implementation: if (!hasQuantities || !hasResult) return 1
    // Even if units/implication are filled, missing result → rigor 1
    const calc: ScaleCalculation = {
      quantities: "D ≈ 10 μm²/s",
      result: "",
      units: "seconds",
      implication: "something",
    };
    expect(evaluateScaleRigor(calc)).toBe(1);
  });

  it("returns 2 when missing only units", () => {
    const calc: ScaleCalculation = {
      quantities: "D ≈ 10 μm²/s",
      result: "τ ≈ 1000s",
      units: "",
      implication: "something",
    };
    expect(evaluateScaleRigor(calc)).toBe(2);
  });

  it("handles whitespace-only fields as empty", () => {
    // Whitespace-only quantities is treated as empty via .trim()
    // So hasQuantities = false → returns 1 (regardless of other fields)
    const calc: ScaleCalculation = {
      quantities: "   ",
      result: "τ ≈ 1000s",
      units: "seconds",
      implication: "something",
    };
    expect(evaluateScaleRigor(calc)).toBe(1);
  });
});

describe("generateAssumptionId edge cases", () => {
  it("handles session IDs with special characters", () => {
    const id = generateAssumptionId("TEST_2025-12-30", []);
    expect(id).toBe("A-TEST_2025-12-30-001");
    expect(isValidAssumptionId(id)).toBe(true);
  });

  it("handles mixed existing ID formats", () => {
    const existing = [
      "A-TEST-001",
      "A-TEST-003",
      "A-OTHER-002",
      "A1", // simple format - should be ignored for this session
    ];
    const id = generateAssumptionId("TEST", existing);
    expect(id).toBe("A-TEST-004");
  });
});

describe("validateScaleAssumptionPresence edge cases", () => {
  const baseAssumption = (overrides: Partial<Assumption>): Assumption => ({
    id: "A-TEST-001",
    statement: "Test statement for assumption.",
    type: "background",
    criticality: "important",
    status: "unchecked",
    dependsOn: [],
    load: {
      affectedHypotheses: [],
      affectedTests: [],
      description: "No dependencies.",
    },
    sessionId: "TEST",
    createdAt: "2025-12-30T19:00:00Z",
    updatedAt: "2025-12-30T19:00:00Z",
    ...overrides,
  });

  it("returns empty array for empty assumptions list", () => {
    const result = validateScaleAssumptionPresence([]);
    expect(result.present).toBe(false);
    expect(result.count).toBe(0);
    expect(result.rigorLevels).toEqual([]);
  });

  it("correctly reports mixed rigor levels", () => {
    const assumptions = [
      baseAssumption({
        id: "A-TEST-001",
        type: "scale_physics",
        calculation: undefined, // rigor 0
      }),
      baseAssumption({
        id: "A-TEST-002",
        type: "scale_physics",
        calculation: {
          quantities: "D ≈ 10 μm²/s",
          result: "",
          units: "",
          implication: "",
        }, // rigor 1
      }),
    ];
    const result = validateScaleAssumptionPresence(assumptions);
    expect(result.rigorLevels).toContain(0);
    expect(result.rigorLevels).toContain(1);
    expect(result.message).toContain("max rigor is 1/3");
  });
});
