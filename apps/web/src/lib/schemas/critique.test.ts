import { describe, expect, test } from "vitest";
import {
  acceptCritique,
  // Response functions
  addressCritique,
  type Critique,
  CritiqueActionSchema,
  CritiqueResponseSchema,
  CritiqueSchema,
  CritiqueSeveritySchema,
  CritiqueStatusSchema,
  CritiqueTargetTypeSchema,
  countUnaddressedCritiques,
  // Factory functions
  createCritique,
  createFramingCritique,
  createHypothesisCritique,
  createTestCritique,
  dismissCritique,
  // Validation helpers
  evaluateKillJustification,
  evaluateThirdAlternative,
  // ID functions
  generateCritiqueId,
  isValidAnchor,
  isValidCritiqueId,
  type ProposedAlternative,
  ProposedAlternativeSchema,
  reopenCritique,
  requiresResponse,
} from "./critique";

/**
 * Tests for Critique Registry Schema
 *
 * @see brenner_bot-f5wy.1 (bead)
 */

// ============================================================================
// Test Helpers
// ============================================================================

function createValidCritique(overrides: Partial<Critique> = {}): Critique {
  const defaults = {
    id: "C-TEST-001",
    targetType: "hypothesis" as const,
    targetId: "H-TEST-001",
    attack: "This hypothesis fails to account for the observed phenomenon in multiple ways",
    evidenceToConfirm: "Run experiment X and observe result Y",
    status: "active" as const,
    severity: "moderate" as const,
    sessionId: "TEST",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return CritiqueSchema.parse({ ...defaults, ...overrides });
}

function createValidAlternative(overrides: Partial<ProposedAlternative> = {}): ProposedAlternative {
  const defaults = {
    description: "An alternative explanation that accounts for the anomalies",
    mechanism: "The alternative works via mechanism Z",
    testable: true,
    predictions: ["Prediction A", "Prediction B"],
  };

  return ProposedAlternativeSchema.parse({ ...defaults, ...overrides });
}

// ============================================================================
// Enum Schema Tests
// ============================================================================

describe("CritiqueTargetTypeSchema", () => {
  test("accepts valid target types", () => {
    expect(CritiqueTargetTypeSchema.parse("hypothesis")).toBe("hypothesis");
    expect(CritiqueTargetTypeSchema.parse("test")).toBe("test");
    expect(CritiqueTargetTypeSchema.parse("assumption")).toBe("assumption");
    expect(CritiqueTargetTypeSchema.parse("framing")).toBe("framing");
    expect(CritiqueTargetTypeSchema.parse("methodology")).toBe("methodology");
  });

  test("rejects invalid target types", () => {
    expect(() => CritiqueTargetTypeSchema.parse("invalid")).toThrow();
    expect(() => CritiqueTargetTypeSchema.parse("")).toThrow();
  });
});

describe("CritiqueStatusSchema", () => {
  test("accepts valid statuses", () => {
    expect(CritiqueStatusSchema.parse("active")).toBe("active");
    expect(CritiqueStatusSchema.parse("addressed")).toBe("addressed");
    expect(CritiqueStatusSchema.parse("dismissed")).toBe("dismissed");
    expect(CritiqueStatusSchema.parse("accepted")).toBe("accepted");
  });

  test("rejects invalid statuses", () => {
    expect(() => CritiqueStatusSchema.parse("pending")).toThrow();
    expect(() => CritiqueStatusSchema.parse("")).toThrow();
  });
});

describe("CritiqueSeveritySchema", () => {
  test("accepts valid severities", () => {
    expect(CritiqueSeveritySchema.parse("minor")).toBe("minor");
    expect(CritiqueSeveritySchema.parse("moderate")).toBe("moderate");
    expect(CritiqueSeveritySchema.parse("serious")).toBe("serious");
    expect(CritiqueSeveritySchema.parse("critical")).toBe("critical");
  });

  test("rejects invalid severities", () => {
    expect(() => CritiqueSeveritySchema.parse("low")).toThrow();
    expect(() => CritiqueSeveritySchema.parse("high")).toThrow();
  });
});

describe("CritiqueActionSchema", () => {
  test("accepts valid actions", () => {
    expect(CritiqueActionSchema.parse("none")).toBe("none");
    expect(CritiqueActionSchema.parse("modified")).toBe("modified");
    expect(CritiqueActionSchema.parse("killed")).toBe("killed");
    expect(CritiqueActionSchema.parse("new_test")).toBe("new_test");
  });

  test("rejects invalid actions", () => {
    expect(() => CritiqueActionSchema.parse("deleted")).toThrow();
  });
});

// ============================================================================
// Sub-Schema Tests
// ============================================================================

describe("ProposedAlternativeSchema", () => {
  test("accepts valid alternative with all fields", () => {
    const alt = createValidAlternative();
    expect(alt.description).toContain("alternative");
    expect(alt.mechanism).toBeDefined();
    expect(alt.testable).toBe(true);
    expect(alt.predictions).toHaveLength(2);
  });

  test("accepts minimal alternative", () => {
    const alt = ProposedAlternativeSchema.parse({
      description: "A minimal alternative explanation",
      testable: false,
    });
    expect(alt.description).toBeDefined();
    expect(alt.mechanism).toBeUndefined();
  });

  test("rejects alternative with too short description", () => {
    expect(() =>
      ProposedAlternativeSchema.parse({
        description: "Short",
        testable: false,
      }),
    ).toThrow(/at least 10 characters/);
  });
});

describe("CritiqueResponseSchema", () => {
  test("accepts valid response", () => {
    const response = CritiqueResponseSchema.parse({
      text: "This is a detailed response to the critique",
      respondedBy: "TestAgent",
      respondedAt: new Date().toISOString(),
      actionTaken: "modified",
    });
    expect(response.text).toContain("response");
    expect(response.actionTaken).toBe("modified");
  });

  test("accepts response with new test", () => {
    const response = CritiqueResponseSchema.parse({
      text: "Created a new test to address this critique",
      respondedAt: new Date().toISOString(),
      actionTaken: "new_test",
      newTestId: "T-TEST-001",
    });
    expect(response.newTestId).toBe("T-TEST-001");
  });

  test("rejects response with too short text", () => {
    expect(() =>
      CritiqueResponseSchema.parse({
        text: "Short",
        respondedAt: new Date().toISOString(),
      }),
    ).toThrow(/at least 10 characters/);
  });
});

// ============================================================================
// Main Schema Tests
// ============================================================================

describe("CritiqueSchema", () => {
  describe("valid critiques", () => {
    test("accepts valid hypothesis critique", () => {
      const critique = createValidCritique();
      expect(critique.id).toBe("C-TEST-001");
      expect(critique.targetType).toBe("hypothesis");
      expect(critique.targetId).toBe("H-TEST-001");
    });

    test("accepts valid test critique", () => {
      const critique = createValidCritique({
        id: "C-TEST-002",
        targetType: "test",
        targetId: "T-TEST-001",
      });
      expect(critique.targetType).toBe("test");
    });

    test("accepts valid assumption critique", () => {
      const critique = createValidCritique({
        id: "C-TEST-003",
        targetType: "assumption",
        targetId: "A-TEST-001",
      });
      expect(critique.targetType).toBe("assumption");
    });

    test("accepts framing critique without targetId", () => {
      const critique = createValidCritique({
        targetType: "framing",
        targetId: undefined,
      });
      expect(critique.targetType).toBe("framing");
      expect(critique.targetId).toBeUndefined();
    });

    test("accepts methodology critique without targetId", () => {
      const critique = createValidCritique({
        targetType: "methodology",
        targetId: undefined,
      });
      expect(critique.targetType).toBe("methodology");
    });

    test("accepts critique with proposed alternative", () => {
      const critique = createValidCritique({
        proposedAlternative: createValidAlternative(),
      });
      expect(critique.proposedAlternative).toBeDefined();
      expect(critique.proposedAlternative?.testable).toBe(true);
    });

    test("accepts critique with anchors", () => {
      const critique = createValidCritique({
        anchors: ["§103", "§147-150"],
      });
      expect(critique.anchors).toHaveLength(2);
    });

    test("accepts critique with tags", () => {
      const critique = createValidCritique({
        tags: ["third-alternative", "scale-check"],
      });
      expect(critique.tags).toHaveLength(2);
    });
  });

  describe("invalid critiques", () => {
    test("rejects invalid ID format", () => {
      expect(() =>
        CritiqueSchema.parse({
          ...createValidCritique(),
          id: "invalid-id",
        }),
      ).toThrow(/Invalid critique ID format/);
    });

    test("rejects hypothesis critique without targetId", () => {
      expect(() =>
        CritiqueSchema.parse({
          id: "C-TEST-001",
          targetType: "hypothesis",
          attack: "This hypothesis fails to account for the observed phenomenon",
          evidenceToConfirm: "Run experiment X",
          severity: "moderate",
          sessionId: "TEST",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ).toThrow(/targetId is required/);
    });

    test("rejects hypothesis critique with wrong targetId format", () => {
      expect(() =>
        CritiqueSchema.parse({
          id: "C-TEST-001",
          targetType: "hypothesis",
          targetId: "T-TEST-001", // Wrong prefix - should be H-
          attack: "This hypothesis fails to account for the observed phenomenon",
          evidenceToConfirm: "Run experiment X",
          severity: "moderate",
          sessionId: "TEST",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ).toThrow(/targetId is required and must match the format/);
    });

    test("rejects attack that is too short", () => {
      expect(() =>
        CritiqueSchema.parse({
          ...createValidCritique(),
          attack: "Too short",
        }),
      ).toThrow(/at least 20 characters/);
    });

    test("rejects evidenceToConfirm that is too short", () => {
      expect(() =>
        CritiqueSchema.parse({
          ...createValidCritique(),
          evidenceToConfirm: "Short",
        }),
      ).toThrow(/at least 10 characters/);
    });

    test("rejects invalid anchor format", () => {
      expect(() =>
        createValidCritique({
          anchors: ["invalid-anchor"],
        }),
      ).toThrow(/Invalid anchor format/);
    });
  });
});

// ============================================================================
// Validation Helper Tests
// ============================================================================

describe("evaluateKillJustification", () => {
  test("returns score 1 for minimal valid critique", () => {
    // Minimum valid lengths: attack >= 20, evidenceToConfirm >= 10
    const critique = createValidCritique({
      attack: "This is barely valid attack text",
      evidenceToConfirm: "Evidence X",
    });
    const result = evaluateKillJustification(critique);
    expect(result.score).toBe(1); // Score 1 for basic critique
  });

  test("returns score 1 for basic critique", () => {
    const critique = createValidCritique();
    const result = evaluateKillJustification(critique);
    expect(result.score).toBeGreaterThanOrEqual(1);
  });

  test("returns score 3 for complete critique with anchors and alternative", () => {
    const critique = createValidCritique({
      attack:
        "This hypothesis completely fails to account for the observed phenomenon. The predictions are contradicted by experimental evidence from multiple independent sources, and there is no plausible rescue mechanism.",
      evidenceToConfirm:
        "Perform experiments A, B, and C. If results show X, Y, and Z respectively, the hypothesis is definitively falsified.",
      anchors: ["§103", "§147"],
      proposedAlternative: createValidAlternative(),
    });
    const result = evaluateKillJustification(critique);
    expect(result.score).toBe(3);
  });

  test("includes issues for brief attack", () => {
    const critique = createValidCritique({
      attack: "Brief attack that is too short",
    });
    const result = evaluateKillJustification(critique);
    expect(result.issues.some((i) => i.includes("brief"))).toBe(true);
  });
});

describe("evaluateThirdAlternative", () => {
  test("returns score 0 for critique without alternative", () => {
    const critique = createValidCritique();
    const result = evaluateThirdAlternative(critique);
    expect(result.score).toBe(0);
    expect(result.explanation).toContain("skepticism");
  });

  test("returns score 1 for vague alternative", () => {
    const critique = createValidCritique({
      proposedAlternative: {
        description: "Maybe something else",
        testable: false,
      },
    });
    const result = evaluateThirdAlternative(critique);
    expect(result.score).toBe(1);
  });

  test("returns score 2 for specific but incomplete alternative", () => {
    const critique = createValidCritique({
      proposedAlternative: {
        description: "A specific alternative explanation that addresses the anomalies",
        testable: true,
        // Missing mechanism and predictions
      },
    });
    const result = evaluateThirdAlternative(critique);
    expect(result.score).toBe(2);
  });

  test("returns score 3 for complete alternative", () => {
    const critique = createValidCritique({
      proposedAlternative: createValidAlternative(),
    });
    const result = evaluateThirdAlternative(critique);
    expect(result.score).toBe(3);
    expect(result.explanation).toContain("Concrete alternative");
  });
});

describe("requiresResponse", () => {
  test("returns true for active serious critique", () => {
    const critique = createValidCritique({ severity: "serious" });
    expect(requiresResponse(critique)).toBe(true);
  });

  test("returns true for active critical critique", () => {
    const critique = createValidCritique({ severity: "critical" });
    expect(requiresResponse(critique)).toBe(true);
  });

  test("returns false for active minor critique", () => {
    const critique = createValidCritique({ severity: "minor" });
    expect(requiresResponse(critique)).toBe(false);
  });

  test("returns false for addressed serious critique", () => {
    const critique = createValidCritique({
      severity: "serious",
      status: "addressed",
      response: {
        text: "This has been addressed with modifications",
        respondedAt: new Date().toISOString(),
      },
    });
    expect(requiresResponse(critique)).toBe(false);
  });
});

describe("countUnaddressedCritiques", () => {
  test("counts active critiques for target type", () => {
    const critiques = [
      createValidCritique({ id: "C-TEST-001", status: "active" }),
      createValidCritique({ id: "C-TEST-002", status: "active" }),
      createValidCritique({ id: "C-TEST-003", status: "addressed" }),
    ];
    expect(countUnaddressedCritiques(critiques, "hypothesis")).toBe(2);
  });

  test("counts active critiques for specific target", () => {
    const critiques = [
      createValidCritique({ id: "C-TEST-001", targetId: "H-TEST-001" }),
      createValidCritique({ id: "C-TEST-002", targetId: "H-TEST-002" }),
      createValidCritique({ id: "C-TEST-003", targetId: "H-TEST-001" }),
    ];
    expect(countUnaddressedCritiques(critiques, "hypothesis", "H-TEST-001")).toBe(2);
  });
});

// ============================================================================
// ID Function Tests
// ============================================================================

describe("generateCritiqueId", () => {
  test("generates first ID for session", () => {
    const id = generateCritiqueId("TEST", []);
    expect(id).toBe("C-TEST-001");
  });

  test("generates next sequential ID", () => {
    const id = generateCritiqueId("TEST", ["C-TEST-001", "C-TEST-002"]);
    expect(id).toBe("C-TEST-003");
  });

  test("handles gaps in sequence", () => {
    const id = generateCritiqueId("TEST", ["C-TEST-001", "C-TEST-005"]);
    expect(id).toBe("C-TEST-006");
  });

  test("throws on sequence overflow", () => {
    const existingIds = Array.from(
      { length: 999 },
      (_, i) => `C-TEST-${(i + 1).toString().padStart(3, "0")}`,
    );
    expect(() => generateCritiqueId("TEST", existingIds)).toThrow(/sequence overflow/);
  });
});

describe("isValidCritiqueId", () => {
  test("returns true for valid IDs", () => {
    expect(isValidCritiqueId("C-TEST-001")).toBe(true);
    expect(isValidCritiqueId("C-RS20251230-042")).toBe(true);
    expect(isValidCritiqueId("C-my-session-999")).toBe(true);
  });

  test("returns false for invalid IDs", () => {
    expect(isValidCritiqueId("C-TEST")).toBe(false);
    expect(isValidCritiqueId("H-TEST-001")).toBe(false);
    expect(isValidCritiqueId("C-TEST-1")).toBe(false);
    expect(isValidCritiqueId("invalid")).toBe(false);
  });
});

describe("isValidAnchor", () => {
  test("returns true for valid anchors", () => {
    expect(isValidAnchor("§1")).toBe(true);
    expect(isValidAnchor("§103")).toBe(true);
    expect(isValidAnchor("§147-150")).toBe(true);
  });

  test("returns false for invalid anchors", () => {
    expect(isValidAnchor("103")).toBe(false);
    expect(isValidAnchor("§")).toBe(false);
    expect(isValidAnchor("section103")).toBe(false);
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe("createCritique", () => {
  test("creates critique with defaults", () => {
    const critique = createCritique({
      id: "C-TEST-001",
      targetType: "hypothesis",
      targetId: "H-TEST-001",
      attack: "This is a substantive attack on the hypothesis",
      evidenceToConfirm: "Evidence that would confirm this critique",
      severity: "moderate",
      sessionId: "TEST",
    });

    expect(critique.status).toBe("active");
    expect(critique.createdAt).toBeDefined();
    expect(critique.updatedAt).toBeDefined();
  });

  test("creates critique with all optional fields", () => {
    const critique = createCritique({
      id: "C-TEST-001",
      targetType: "hypothesis",
      targetId: "H-TEST-001",
      attack: "This is a substantive attack on the hypothesis",
      evidenceToConfirm: "Evidence that would confirm this critique",
      severity: "critical",
      sessionId: "TEST",
      proposedAlternative: createValidAlternative(),
      raisedBy: "TestAgent",
      anchors: ["§103"],
      tags: ["important"],
      notes: "Additional notes",
    });

    expect(critique.proposedAlternative).toBeDefined();
    expect(critique.raisedBy).toBe("TestAgent");
    expect(critique.anchors).toHaveLength(1);
    expect(critique.tags).toHaveLength(1);
  });
});

describe("createHypothesisCritique", () => {
  test("creates hypothesis critique", () => {
    const critique = createHypothesisCritique({
      id: "C-TEST-001",
      hypothesisId: "H-TEST-001",
      attack: "This hypothesis is fundamentally flawed",
      evidenceToConfirm: "Evidence X would confirm this",
      severity: "serious",
      sessionId: "TEST",
    });

    expect(critique.targetType).toBe("hypothesis");
    expect(critique.targetId).toBe("H-TEST-001");
  });
});

describe("createTestCritique", () => {
  test("creates test critique", () => {
    const critique = createTestCritique({
      id: "C-TEST-001",
      testId: "T-TEST-001",
      attack: "This test is not discriminative enough",
      evidenceToConfirm: "Show that both hypotheses predict the same outcome",
      severity: "moderate",
      sessionId: "TEST",
    });

    expect(critique.targetType).toBe("test");
    expect(critique.targetId).toBe("T-TEST-001");
  });
});

describe("createFramingCritique", () => {
  test("creates framing critique without targetId", () => {
    const critique = createFramingCritique({
      id: "C-TEST-001",
      attack: "The research question itself is flawed",
      evidenceToConfirm: "Show that the question cannot be answered",
      severity: "critical",
      sessionId: "TEST",
    });

    expect(critique.targetType).toBe("framing");
    expect(critique.targetId).toBeUndefined();
  });
});

// ============================================================================
// Response Function Tests
// ============================================================================

describe("addressCritique", () => {
  test("addresses an active critique", async () => {
    const critique = createValidCritique();
    // Wait 1ms to ensure timestamp difference
    await new Promise((r) => setTimeout(r, 1));
    const addressed = addressCritique(critique, {
      text: "This critique has been addressed by modifying the hypothesis",
      respondedBy: "TestAgent",
      actionTaken: "modified",
    });

    expect(addressed.status).toBe("addressed");
    expect(addressed.response).toBeDefined();
    expect(addressed.response?.actionTaken).toBe("modified");
    expect(addressed.response?.respondedBy).toBe("TestAgent");
    expect(addressed.response?.respondedAt).toBeDefined();
  });

  test("throws when addressing non-active critique", () => {
    const critique = createValidCritique({ status: "dismissed" });
    expect(() =>
      addressCritique(critique, {
        text: "Trying to address dismissed critique",
      }),
    ).toThrow(/current status is dismissed/);
  });
});

describe("dismissCritique", () => {
  test("dismisses an active critique", () => {
    const critique = createValidCritique();
    const dismissed = dismissCritique(critique, "This critique is based on a misunderstanding");

    expect(dismissed.status).toBe("dismissed");
    expect(dismissed.dismissalReason).toContain("misunderstanding");
    expect(dismissed.response).toBeDefined();
  });

  test("throws when dismissing non-active critique", () => {
    const critique = createValidCritique({ status: "accepted" });
    expect(() => dismissCritique(critique, "Reason")).toThrow(/current status is accepted/);
  });
});

describe("acceptCritique", () => {
  test("accepts critique with modification action", () => {
    const critique = createValidCritique();
    const accepted = acceptCritique(
      critique,
      "modified",
      "The hypothesis was modified to address this critique",
      "TestAgent",
    );

    expect(accepted.status).toBe("accepted");
    expect(accepted.response?.actionTaken).toBe("modified");
  });

  test("accepts critique with kill action", () => {
    const critique = createValidCritique();
    const accepted = acceptCritique(
      critique,
      "killed",
      "The hypothesis was killed due to this critique",
    );

    expect(accepted.response?.actionTaken).toBe("killed");
  });

  test("accepts critique with new test action", () => {
    const critique = createValidCritique();
    const accepted = acceptCritique(
      critique,
      "new_test",
      "A new test was designed to address this",
      "TestAgent",
      "T-TEST-001",
    );

    expect(accepted.response?.actionTaken).toBe("new_test");
    expect(accepted.response?.newTestId).toBe("T-TEST-001");
  });

  test("throws when accepting non-active critique", () => {
    const critique = createValidCritique({ status: "addressed" });
    expect(() => acceptCritique(critique, "none", "Response")).toThrow(
      /current status is addressed/,
    );
  });
});

describe("reopenCritique", () => {
  test("reopens a dismissed critique", () => {
    const dismissed = createValidCritique({ status: "dismissed" });
    const reopened = reopenCritique(dismissed, "New evidence requires reconsideration");

    expect(reopened.status).toBe("active");
    expect(reopened.notes).toContain("Reopened");
  });

  test("reopens an addressed critique", () => {
    const addressed = createValidCritique({ status: "addressed" });
    const reopened = reopenCritique(addressed);

    expect(reopened.status).toBe("active");
  });

  test("returns same critique if already active", () => {
    const active = createValidCritique();
    const result = reopenCritique(active);

    expect(result).toBe(active);
  });
});
