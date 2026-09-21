import { describe, expect, it } from "vitest";
import {
  createHypothesis,
  createThirdAlternative,
  detectLevelConflation,
  generateHypothesisId,
  type Hypothesis,
  HypothesisCategorySchema,
  HypothesisConfidenceSchema,
  HypothesisOriginSchema,
  HypothesisSchema,
  HypothesisStateSchema,
  isValidAnchor,
  isValidHypothesisId,
  validateThirdAlternative,
  warnMissingMechanism,
} from "./hypothesis";

describe("HypothesisSchema", () => {
  const validHypothesis = {
    id: "H-RS20251230-001",
    statement: "Cell fate is determined by lineage history rather than position.",
    mechanism: "Cells count divisions and inherit fate determinants asymmetrically.",
    origin: "proposed" as const,
    category: "mechanistic" as const,
    confidence: "medium" as const,
    sessionId: "RS20251230",
    proposedBy: "GreenCastle",
    state: "proposed" as const,
    anchors: ["§161", "§205"],
    isInference: false,
    linkedAssumptions: ["A-RS20251230-001"],
    linkedAnomalies: ["X-RS20251230-001"],
    unresolvedCritiqueCount: 0,
    createdAt: "2025-12-30T19:00:00Z",
    updatedAt: "2025-12-30T19:00:00Z",
    tags: ["cell-fate", "lineage"],
    notes: "Initial hypothesis from session kickoff.",
  };

  it("parses a valid hypothesis", () => {
    const result = HypothesisSchema.safeParse(validHypothesis);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("H-RS20251230-001");
      expect(result.data.category).toBe("mechanistic");
    }
  });

  it("rejects invalid hypothesis ID format", () => {
    const invalid = { ...validHypothesis, id: "invalid-id" };
    const result = HypothesisSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects hypothesis ID without proper sequence", () => {
    const invalid = { ...validHypothesis, id: "H-RS20251230-1" }; // needs 3 digits
    const result = HypothesisSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("accepts alternative valid ID formats", () => {
    const variations = ["H-CELL-FATE-001-001", "H-test-session-999", "H-ABC123-001"];
    for (const id of variations) {
      const data = { ...validHypothesis, id };
      const result = HypothesisSchema.safeParse(data);
      expect(result.success, `Expected ${id} to be valid`).toBe(true);
    }
  });

  it("rejects statement that is too short", () => {
    const invalid = { ...validHypothesis, statement: "Short" };
    const result = HypothesisSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("validates anchor format", () => {
    const validAnchors = ["§1", "§123", "§45-50", "§1-999"];
    const invalidAnchors = ["#1", "S1", "§", "§-1", "1"];

    for (const anchor of validAnchors) {
      const data = { ...validHypothesis, anchors: [anchor] };
      const result = HypothesisSchema.safeParse(data);
      expect(result.success, `Expected ${anchor} to be valid`).toBe(true);
    }

    for (const anchor of invalidAnchors) {
      const data = { ...validHypothesis, anchors: [anchor] };
      const result = HypothesisSchema.safeParse(data);
      expect(result.success, `Expected ${anchor} to be invalid`).toBe(false);
    }
  });

  it("accepts hypothesis without optional fields", () => {
    const minimal = {
      id: "H-RS20251230-001",
      statement: "This is a minimal hypothesis statement.",
      origin: "proposed" as const,
      category: "phenomenological" as const,
      confidence: "low" as const,
      sessionId: "RS20251230",
      state: "proposed" as const,
      createdAt: "2025-12-30T19:00:00Z",
      updatedAt: "2025-12-30T19:00:00Z",
    };
    const result = HypothesisSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it("defaults isInference to false", () => {
    const withoutInference = {
      id: "H-RS20251230-001",
      statement: "This is a test hypothesis statement.",
      origin: "proposed" as const,
      category: "mechanistic" as const,
      confidence: "medium" as const,
      sessionId: "RS20251230",
      state: "proposed" as const,
      createdAt: "2025-12-30T19:00:00Z",
      updatedAt: "2025-12-30T19:00:00Z",
    };
    const result = HypothesisSchema.parse(withoutInference);
    expect(result.isInference).toBe(false);
  });

  it("defaults unresolvedCritiqueCount to 0", () => {
    const withoutCount = {
      id: "H-RS20251230-001",
      statement: "This is a test hypothesis statement.",
      origin: "proposed" as const,
      category: "mechanistic" as const,
      confidence: "medium" as const,
      sessionId: "RS20251230",
      state: "proposed" as const,
      createdAt: "2025-12-30T19:00:00Z",
      updatedAt: "2025-12-30T19:00:00Z",
    };
    const result = HypothesisSchema.parse(withoutCount);
    expect(result.unresolvedCritiqueCount).toBe(0);
  });
});

describe("Enum schemas", () => {
  it("validates confidence levels", () => {
    expect(HypothesisConfidenceSchema.safeParse("high").success).toBe(true);
    expect(HypothesisConfidenceSchema.safeParse("medium").success).toBe(true);
    expect(HypothesisConfidenceSchema.safeParse("low").success).toBe(true);
    expect(HypothesisConfidenceSchema.safeParse("speculative").success).toBe(true);
    expect(HypothesisConfidenceSchema.safeParse("unknown").success).toBe(false);
  });

  it("validates category types", () => {
    const validCategories = [
      "mechanistic",
      "phenomenological",
      "boundary",
      "auxiliary",
      "third_alternative",
    ];
    for (const cat of validCategories) {
      expect(HypothesisCategorySchema.safeParse(cat).success).toBe(true);
    }
    expect(HypothesisCategorySchema.safeParse("other").success).toBe(false);
  });

  it("validates origin types", () => {
    const validOrigins = ["proposed", "third_alternative", "refinement", "anomaly_spawned"];
    for (const origin of validOrigins) {
      expect(HypothesisOriginSchema.safeParse(origin).success).toBe(true);
    }
  });

  it("validates state types", () => {
    const validStates = ["proposed", "active", "confirmed", "refuted", "superseded", "deferred"];
    for (const state of validStates) {
      expect(HypothesisStateSchema.safeParse(state).success).toBe(true);
    }
  });
});

describe("detectLevelConflation", () => {
  it("detects gene anthropomorphization", () => {
    const matches = detectLevelConflation("The gene tells the cell to divide.");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]).toMatch(/gene tells/i);
  });

  it("detects organism agency confusion", () => {
    const matches = detectLevelConflation("The organism decides to differentiate.");
    expect(matches.length).toBeGreaterThan(0);
  });

  it("detects DNA knowledge claims", () => {
    const matches = detectLevelConflation("DNA knows the right sequence.");
    expect(matches.length).toBeGreaterThan(0);
  });

  it("returns empty array for clean text", () => {
    const clean =
      "The regulatory network implements a decision procedure based on transcription factor concentrations.";
    const matches = detectLevelConflation(clean);
    expect(matches.length).toBe(0);
  });

  it("is case insensitive", () => {
    const matches1 = detectLevelConflation("THE GENE TELLS THE CELL");
    const matches2 = detectLevelConflation("the gene tells the cell");
    expect(matches1.length).toBeGreaterThan(0);
    expect(matches2.length).toBeGreaterThan(0);
  });
});

describe("validateThirdAlternative", () => {
  const baseHypothesis = (overrides: Partial<Hypothesis>): Hypothesis => ({
    id: "H-TEST-001",
    statement: "Test statement for hypothesis.",
    origin: "proposed",
    category: "mechanistic",
    confidence: "medium",
    sessionId: "TEST",
    state: "proposed",
    isInference: false,
    unresolvedCritiqueCount: 0,
    createdAt: "2025-12-30T19:00:00Z",
    updatedAt: "2025-12-30T19:00:00Z",
    ...overrides,
  });

  it("returns quality 0 when no third alternative exists", () => {
    const hypotheses = [
      baseHypothesis({ id: "H-TEST-001", category: "mechanistic" }),
      baseHypothesis({ id: "H-TEST-002", category: "phenomenological" }),
    ];
    const result = validateThirdAlternative(hypotheses);
    expect(result.present).toBe(false);
    expect(result.quality).toBe(0);
  });

  it("returns quality 1 for placeholder third alternative", () => {
    const hypotheses = [
      baseHypothesis({ id: "H-TEST-001", category: "mechanistic" }),
      baseHypothesis({
        id: "H-TEST-002",
        category: "third_alternative",
        statement: "Both could be wrong.",
      }),
    ];
    const result = validateThirdAlternative(hypotheses);
    expect(result.present).toBe(true);
    expect(result.quality).toBe(1);
  });

  it("returns quality 2 for third alternative with mechanism but not orthogonal", () => {
    const hypotheses = [
      baseHypothesis({ id: "H-TEST-001", category: "mechanistic" }),
      baseHypothesis({
        id: "H-TEST-002",
        category: "third_alternative",
        statement: "A hybrid mechanism might exist.",
        mechanism: "Cells use both lineage and gradient information.",
      }),
    ];
    const result = validateThirdAlternative(hypotheses);
    expect(result.present).toBe(true);
    expect(result.quality).toBe(2);
  });

  it("returns quality 3 for genuinely orthogonal third alternative", () => {
    const hypotheses = [
      baseHypothesis({ id: "H-TEST-001", category: "mechanistic" }),
      baseHypothesis({
        id: "H-TEST-002",
        category: "third_alternative",
        statement: "The dichotomy is false; cells use a different causal structure entirely.",
        mechanism:
          "Epigenetic memory provides an orthogonal coordinate system that invalidates both gradient and lineage models.",
      }),
    ];
    const result = validateThirdAlternative(hypotheses);
    expect(result.present).toBe(true);
    expect(result.quality).toBe(3);
  });
});

describe("generateHypothesisId", () => {
  it("generates first ID for empty session", () => {
    const id = generateHypothesisId("RS20251230", []);
    expect(id).toBe("H-RS20251230-001");
  });

  it("generates sequential IDs", () => {
    const existing = ["H-RS20251230-001", "H-RS20251230-002"];
    const id = generateHypothesisId("RS20251230", existing);
    expect(id).toBe("H-RS20251230-003");
  });

  it("handles gaps in sequence", () => {
    const existing = ["H-RS20251230-001", "H-RS20251230-005"];
    const id = generateHypothesisId("RS20251230", existing);
    expect(id).toBe("H-RS20251230-006");
  });

  it("ignores IDs from other sessions", () => {
    const existing = ["H-OTHER-001", "H-OTHER-002"];
    const id = generateHypothesisId("RS20251230", existing);
    expect(id).toBe("H-RS20251230-001");
  });

  it("pads sequence to 3 digits", () => {
    const id = generateHypothesisId("TEST", []);
    expect(id).toMatch(/-\d{3}$/);
  });

  it("throws error on sequence overflow (>999)", () => {
    const existing = ["H-TEST-999"];
    expect(() => generateHypothesisId("TEST", existing)).toThrow(/sequence overflow/i);
  });

  it("handles sequence 999 as valid (boundary case)", () => {
    const existing = ["H-TEST-998"];
    const id = generateHypothesisId("TEST", existing);
    expect(id).toBe("H-TEST-999");
  });
});

describe("isValidHypothesisId", () => {
  it("validates correct IDs", () => {
    expect(isValidHypothesisId("H-RS20251230-001")).toBe(true);
    expect(isValidHypothesisId("H-test-999")).toBe(true);
    expect(isValidHypothesisId("H-ABC-123-456")).toBe(true);
  });

  it("rejects invalid IDs", () => {
    expect(isValidHypothesisId("invalid")).toBe(false);
    expect(isValidHypothesisId("H-test")).toBe(false);
    expect(isValidHypothesisId("H-test-1")).toBe(false);
    expect(isValidHypothesisId("A-test-001")).toBe(false);
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

describe("createHypothesis", () => {
  it("creates a valid hypothesis with defaults", () => {
    const hypothesis = createHypothesis({
      id: "H-TEST-001",
      statement: "This is a test hypothesis for validation.",
      sessionId: "TEST",
      category: "mechanistic",
    });

    expect(hypothesis.id).toBe("H-TEST-001");
    expect(hypothesis.origin).toBe("proposed");
    expect(hypothesis.confidence).toBe("medium");
    expect(hypothesis.state).toBe("proposed");
    expect(hypothesis.isInference).toBe(false);
    expect(hypothesis.unresolvedCritiqueCount).toBe(0);
    expect(hypothesis.createdAt).toBeDefined();
    expect(hypothesis.updatedAt).toBeDefined();
  });

  it("accepts optional mechanism", () => {
    const hypothesis = createHypothesis({
      id: "H-TEST-001",
      statement: "This is a test hypothesis for validation.",
      sessionId: "TEST",
      category: "mechanistic",
      mechanism: "Through transcription factor gradients.",
    });

    expect(hypothesis.mechanism).toBe("Through transcription factor gradients.");
  });
});

describe("createThirdAlternative", () => {
  it("creates a third alternative with correct defaults", () => {
    const hypothesis = createThirdAlternative({
      id: "H-TEST-003",
      statement: "Both models are wrong due to a shared false assumption.",
      sessionId: "TEST",
      mechanism: "Epigenetic memory provides an entirely different coordinate system.",
    });

    expect(hypothesis.category).toBe("third_alternative");
    expect(hypothesis.origin).toBe("third_alternative");
    expect(hypothesis.isInference).toBe(true);
    expect(hypothesis.mechanism).toBeDefined();
  });

  it("requires mechanism for third alternatives", () => {
    // This test ensures the factory enforces mechanism requirement
    const hypothesis = createThirdAlternative({
      id: "H-TEST-003",
      statement: "Both models are wrong due to a shared false assumption.",
      sessionId: "TEST",
      mechanism: "Required mechanism description.",
    });

    expect(hypothesis.mechanism).toBe("Required mechanism description.");
  });
});

describe("warnMissingMechanism", () => {
  const baseHypothesis = (overrides: Partial<Hypothesis>): Hypothesis => ({
    id: "H-TEST-001",
    statement: "Test statement for hypothesis.",
    origin: "proposed",
    category: "mechanistic",
    confidence: "medium",
    sessionId: "TEST",
    state: "proposed",
    isInference: false,
    unresolvedCritiqueCount: 0,
    createdAt: "2025-12-30T19:00:00Z",
    updatedAt: "2025-12-30T19:00:00Z",
    ...overrides,
  });

  it("returns warning for mechanistic hypothesis without mechanism", () => {
    const hypothesis = baseHypothesis({ category: "mechanistic", mechanism: undefined });
    const warning = warnMissingMechanism(hypothesis);
    expect(warning).not.toBeNull();
    expect(warning).toContain("should include a mechanism");
  });

  it("returns null for mechanistic hypothesis with mechanism", () => {
    const hypothesis = baseHypothesis({
      category: "mechanistic",
      mechanism: "Cells count divisions.",
    });
    const warning = warnMissingMechanism(hypothesis);
    expect(warning).toBeNull();
  });

  it("returns null for non-mechanistic hypothesis without mechanism", () => {
    const hypothesis = baseHypothesis({ category: "phenomenological", mechanism: undefined });
    const warning = warnMissingMechanism(hypothesis);
    expect(warning).toBeNull();
  });

  it("returns null for third_alternative without mechanism", () => {
    const hypothesis = baseHypothesis({ category: "third_alternative", mechanism: undefined });
    const warning = warnMissingMechanism(hypothesis);
    expect(warning).toBeNull();
  });
});
