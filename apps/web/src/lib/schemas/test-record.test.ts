import { describe, expect, it } from "vitest";
import {
  calculatePotencyScore,
  calculateTotalScore,
  createBinaryTest,
  createTestRecord,
  detectInflatedScores,
  type EvidencePerWeekScore,
  EvidencePerWeekScoreSchema,
  type ExpectedOutcome,
  ExpectedOutcomeSchema,
  generateTestId,
  isValidTestId,
  type PotencyCheck,
  PotencyCheckSchema,
  type TestFeasibility,
  TestFeasibilitySchema,
  type TestRecord,
  TestRecordSchema,
  TestStatusSchema,
  validateDiscriminativePower,
  validatePotencyCheck,
  validateTest,
} from "./test-record";

describe("Test Record Schema", () => {
  // ============================================================================
  // ID Validation
  // ============================================================================
  describe("ID patterns", () => {
    it("accepts valid test IDs", () => {
      expect(isValidTestId("T-RS20251230-001")).toBe(true);
      expect(isValidTestId("T-sess1-100")).toBe(true);
      expect(isValidTestId("T-my_session-999")).toBe(true);
    });

    it("rejects invalid test IDs", () => {
      expect(isValidTestId("T-001")).toBe(false);
      expect(isValidTestId("P-RS20251230-001")).toBe(false); // wrong prefix
      expect(isValidTestId("T-RS20251230-1")).toBe(false); // not 3 digits
    });
  });

  describe("generateTestId", () => {
    it("generates first ID as -001", () => {
      const id = generateTestId("RS20251230", []);
      expect(id).toBe("T-RS20251230-001");
    });

    it("increments from existing IDs", () => {
      const existing = ["T-RS20251230-001", "T-RS20251230-002"];
      const id = generateTestId("RS20251230", existing);
      expect(id).toBe("T-RS20251230-003");
    });
  });

  // ============================================================================
  // PotencyCheck
  // ============================================================================
  describe("PotencyCheckSchema", () => {
    it("validates a minimal potency check", () => {
      const check: PotencyCheck = {
        positiveControl: "Include wells with known activator as positive control",
      };
      expect(() => PotencyCheckSchema.parse(check)).not.toThrow();
    });

    it("validates a full potency check", () => {
      const check: PotencyCheck = {
        positiveControl: "Include wells with known activator as positive control",
        sensitivityVerification: "Titration series confirms detection down to 1nM",
        timingValidation: "Time course shows peak response at 24h",
        score: 3,
      };
      expect(() => PotencyCheckSchema.parse(check)).not.toThrow();
    });

    it("rejects missing positive control", () => {
      expect(() => PotencyCheckSchema.parse({})).toThrow();
    });
  });

  describe("calculatePotencyScore", () => {
    it("returns 0 for empty check", () => {
      const check: PotencyCheck = { positiveControl: "" };
      expect(calculatePotencyScore(check)).toBe(0);
    });

    it("returns 1 for positive control only", () => {
      const check: PotencyCheck = {
        positiveControl: "Include known positive control samples",
      };
      expect(calculatePotencyScore(check)).toBe(1);
    });

    it("returns 2 for positive control + sensitivity", () => {
      const check: PotencyCheck = {
        positiveControl: "Include known positive control samples",
        sensitivityVerification: "Verified detection at expected concentration",
      };
      expect(calculatePotencyScore(check)).toBe(2);
    });

    it("returns 3 for complete potency check", () => {
      const check: PotencyCheck = {
        positiveControl: "Include known positive control samples",
        sensitivityVerification: "Verified detection at expected concentration",
        timingValidation: "Time course confirms optimal measurement window",
      };
      expect(calculatePotencyScore(check)).toBe(3);
    });
  });

  // ============================================================================
  // EvidencePerWeekScore
  // ============================================================================
  describe("EvidencePerWeekScoreSchema", () => {
    it("validates scores in range 0-3", () => {
      const score: EvidencePerWeekScore = {
        likelihoodRatio: 2,
        cost: 1,
        speed: 3,
        ambiguity: 2,
      };
      expect(() => EvidencePerWeekScoreSchema.parse(score)).not.toThrow();
    });

    it("rejects scores out of range", () => {
      expect(() =>
        EvidencePerWeekScoreSchema.parse({
          likelihoodRatio: 4,
          cost: 1,
          speed: 1,
          ambiguity: 1,
        }),
      ).toThrow();
    });
  });

  describe("calculateTotalScore", () => {
    it("sums all dimensions", () => {
      const score: EvidencePerWeekScore = {
        likelihoodRatio: 2,
        cost: 1,
        speed: 3,
        ambiguity: 2,
      };
      expect(calculateTotalScore(score)).toBe(8);
    });

    it("returns 12 for all max scores", () => {
      const score: EvidencePerWeekScore = {
        likelihoodRatio: 3,
        cost: 3,
        speed: 3,
        ambiguity: 3,
      };
      expect(calculateTotalScore(score)).toBe(12);
    });
  });

  describe("detectInflatedScores", () => {
    it("flags perfect 12/12 as inflated", () => {
      const score: EvidencePerWeekScore = {
        likelihoodRatio: 3,
        cost: 3,
        speed: 3,
        ambiguity: 3,
      };
      const result = detectInflatedScores(score);
      expect(result.inflated).toBe(true);
      expect(result.message).toContain("12/12");
    });

    it("flags 11/12 as inflated", () => {
      const score: EvidencePerWeekScore = {
        likelihoodRatio: 3,
        cost: 2,
        speed: 3,
        ambiguity: 3,
      };
      const result = detectInflatedScores(score);
      expect(result.inflated).toBe(true);
      expect(result.message).toContain("11+");
    });

    it("flags cheap AND fast as suspicious", () => {
      const score: EvidencePerWeekScore = {
        likelihoodRatio: 1,
        cost: 3,
        speed: 3,
        ambiguity: 1,
      };
      const result = detectInflatedScores(score);
      expect(result.inflated).toBe(true);
      expect(result.message).toContain("Cheap AND fast");
    });

    it("accepts realistic scores", () => {
      const score: EvidencePerWeekScore = {
        likelihoodRatio: 2,
        cost: 1,
        speed: 2,
        ambiguity: 2,
      };
      const result = detectInflatedScores(score);
      expect(result.inflated).toBe(false);
    });
  });

  // ============================================================================
  // TestFeasibility
  // ============================================================================
  describe("TestFeasibilitySchema", () => {
    it("validates feasibility assessment", () => {
      const feasibility: TestFeasibility = {
        requirements: "Standard cell culture equipment",
        difficulty: "moderate",
      };
      expect(() => TestFeasibilitySchema.parse(feasibility)).not.toThrow();
    });

    it("accepts all difficulty levels", () => {
      const difficulties = ["easy", "moderate", "hard", "very_hard"];
      for (const d of difficulties) {
        expect(() =>
          TestFeasibilitySchema.parse({
            requirements: "Standard equipment needed",
            difficulty: d,
          }),
        ).not.toThrow();
      }
    });
  });

  // ============================================================================
  // ExpectedOutcome
  // ============================================================================
  describe("ExpectedOutcomeSchema", () => {
    it("validates expected outcome", () => {
      const outcome: ExpectedOutcome = {
        hypothesisId: "H-RS20251230-001",
        outcome: "Cells proliferate",
      };
      expect(() => ExpectedOutcomeSchema.parse(outcome)).not.toThrow();
    });

    it("accepts optional fields", () => {
      const outcome: ExpectedOutcome = {
        hypothesisId: "H-RS20251230-001",
        outcome: "Cells proliferate",
        resultType: "positive",
        confidence: "high",
      };
      expect(() => ExpectedOutcomeSchema.parse(outcome)).not.toThrow();
    });
  });

  // ============================================================================
  // TestStatus
  // ============================================================================
  describe("TestStatusSchema", () => {
    it("accepts all valid statuses", () => {
      const statuses = ["designed", "ready", "in_progress", "completed", "blocked", "abandoned"];
      for (const s of statuses) {
        expect(() => TestStatusSchema.parse(s)).not.toThrow();
      }
    });
  });

  // ============================================================================
  // Full TestRecord Schema
  // ============================================================================
  describe("TestRecordSchema", () => {
    const validTest: TestRecord = {
      id: "T-RS20251230-001",
      name: "Wnt activation migration assay",
      procedure: "Add Wnt3a to culture, measure cell migration distance over 24h",
      discriminates: ["H-RS20251230-001", "H-RS20251230-002"],
      expectedOutcomes: [
        { hypothesisId: "H-RS20251230-001", outcome: "Migration increases 2-fold" },
        { hypothesisId: "H-RS20251230-002", outcome: "No change in migration" },
      ],
      potencyCheck: {
        positiveControl: "Include known Wnt agonist as positive control for pathway activation",
      },
      evidencePerWeekScore: {
        likelihoodRatio: 2,
        cost: 2,
        speed: 2,
        ambiguity: 2,
      },
      feasibility: {
        requirements: "Cell culture facility",
        difficulty: "moderate",
      },
      designedInSession: "RS20251230",
      status: "designed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("validates a correct test record", () => {
      expect(() => TestRecordSchema.parse(validTest)).not.toThrow();
    });

    it("requires at least 2 discriminated hypotheses", () => {
      const invalid = {
        ...validTest,
        discriminates: ["H-RS20251230-001"],
      };
      expect(() => TestRecordSchema.parse(invalid)).toThrow(/at least 2/);
    });

    it("requires at least 2 expected outcomes", () => {
      const invalid = {
        ...validTest,
        expectedOutcomes: [{ hypothesisId: "H-RS20251230-001", outcome: "Some outcome" }],
      };
      expect(() => TestRecordSchema.parse(invalid)).toThrow();
    });

    it("requires potencyCheck", () => {
      const { potencyCheck, ...withoutPotency } = validTest;
      void potencyCheck;
      expect(() => TestRecordSchema.parse(withoutPotency)).toThrow();
    });
  });

  // ============================================================================
  // validateDiscriminativePower
  // ============================================================================
  describe("validateDiscriminativePower", () => {
    const baseTest: TestRecord = {
      id: "T-RS20251230-001",
      name: "Test",
      procedure: "Run the test procedure here",
      discriminates: ["H-RS20251230-001", "H-RS20251230-002"],
      expectedOutcomes: [
        { hypothesisId: "H-RS20251230-001", outcome: "Cells survive" },
        { hypothesisId: "H-RS20251230-002", outcome: "Cells die" },
      ],
      potencyCheck: { positiveControl: "Include positive control wells" },
      evidencePerWeekScore: {
        likelihoodRatio: 2,
        cost: 2,
        speed: 2,
        ambiguity: 2,
      },
      feasibility: { requirements: "Lab access", difficulty: "easy" },
      designedInSession: "RS20251230",
      status: "designed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("validates test with different outcomes", () => {
      const result = validateDiscriminativePower(baseTest);
      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThan(0);
    });

    it("fails test with identical outcomes", () => {
      const test = {
        ...baseTest,
        expectedOutcomes: [
          { hypothesisId: "H-RS20251230-001", outcome: "Cells change" },
          { hypothesisId: "H-RS20251230-002", outcome: "Cells change" },
        ],
      };
      const result = validateDiscriminativePower(test);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain(
        "All expected outcomes are the same - test is not discriminative",
      );
    });

    it("flags missing outcomes for discriminated hypotheses", () => {
      const test = {
        ...baseTest,
        discriminates: ["H-RS20251230-001", "H-RS20251230-002", "H-RS20251230-003"],
      };
      const result = validateDiscriminativePower(test);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes("Missing expected outcome"))).toBe(true);
    });

    it("gives high score to binary outcomes", () => {
      const test = {
        ...baseTest,
        expectedOutcomes: [
          {
            hypothesisId: "H-RS20251230-001",
            outcome: "Gene present",
            resultType: "positive" as const,
          },
          {
            hypothesisId: "H-RS20251230-002",
            outcome: "Gene absent",
            resultType: "negative" as const,
          },
        ],
      };
      const result = validateDiscriminativePower(test);
      expect(result.score).toBe(3);
    });
  });

  // ============================================================================
  // validatePotencyCheck
  // ============================================================================
  describe("validatePotencyCheck", () => {
    const baseTest: TestRecord = {
      id: "T-RS20251230-001",
      name: "Test",
      procedure: "Run the test procedure here",
      discriminates: ["H-RS20251230-001", "H-RS20251230-002"],
      expectedOutcomes: [
        { hypothesisId: "H-RS20251230-001", outcome: "Cells survive" },
        { hypothesisId: "H-RS20251230-002", outcome: "Cells die" },
      ],
      potencyCheck: { positiveControl: "Include positive control wells" },
      evidencePerWeekScore: {
        likelihoodRatio: 2,
        cost: 2,
        speed: 2,
        ambiguity: 2,
      },
      feasibility: { requirements: "Lab access", difficulty: "easy" },
      designedInSession: "RS20251230",
      status: "designed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("validates test with potency check", () => {
      const result = validatePotencyCheck(baseTest);
      expect(result.valid).toBe(true);
    });

    it("fails test with short positive control", () => {
      const test = {
        ...baseTest,
        potencyCheck: { positiveControl: "Control" },
      };
      const result = validatePotencyCheck(test);
      expect(result.valid).toBe(false);
      expect(result.issues.some((i) => i.includes("specific positive control"))).toBe(true);
    });

    it("gives higher score for complete potency check", () => {
      const test = {
        ...baseTest,
        potencyCheck: {
          positiveControl: "Include known activator wells",
          sensitivityVerification: "Titration confirms detection threshold",
          timingValidation: "Time course validates measurement window",
        },
      };
      const result = validatePotencyCheck(test);
      expect(result.score).toBe(3);
    });
  });

  // ============================================================================
  // validateTest (full validation)
  // ============================================================================
  describe("validateTest", () => {
    const validTest: TestRecord = {
      id: "T-RS20251230-001",
      name: "Complete test",
      procedure: "Full procedure with all details",
      discriminates: ["H-RS20251230-001", "H-RS20251230-002"],
      expectedOutcomes: [
        {
          hypothesisId: "H-RS20251230-001",
          outcome: "Signal present",
          resultType: "positive",
        },
        {
          hypothesisId: "H-RS20251230-002",
          outcome: "Signal absent",
          resultType: "negative",
        },
      ],
      potencyCheck: {
        positiveControl: "Include known positive samples",
        sensitivityVerification: "Verified detection sensitivity",
        timingValidation: "Validated measurement timing",
      },
      evidencePerWeekScore: {
        likelihoodRatio: 3,
        cost: 2,
        speed: 2,
        ambiguity: 3,
      },
      objectTransposition: {
        considered: true,
        alternatives: [{ system: "Zebrafish", pros: "Fast", cons: "Less relevant" }],
        chosenRationale: "Mouse is most relevant model",
      },
      feasibility: { requirements: "Mouse facility", difficulty: "moderate" },
      designedInSession: "RS20251230",
      status: "designed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("validates a complete test", () => {
      const result = validateTest(validTest);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("warns when object transposition not considered", () => {
      const test = { ...validTest, objectTransposition: undefined };
      const result = validateTest(test);
      expect(result.warnings.some((w) => w.includes("object transposition"))).toBe(true);
    });

    it("warns about inflated scores", () => {
      const test = {
        ...validTest,
        evidencePerWeekScore: {
          likelihoodRatio: 3,
          cost: 3,
          speed: 3,
          ambiguity: 3,
        },
      };
      const result = validateTest(test);
      expect(result.scoreInflated).toBe(true);
    });

    it("is valid with incomplete but acceptable potency check", () => {
      // This test verifies the bug fix: tests with valid but incomplete
      // potency checks (score 1 or 2) should still be marked as valid.
      // The "Consider adding..." suggestions should be warnings, not errors.
      const test = {
        ...validTest,
        potencyCheck: {
          positiveControl: "Include known positive samples", // score 1, no sensitivity or timing
        },
      };
      const result = validateTest(test);
      expect(result.valid).toBe(true); // Should be valid despite incomplete potency check
      expect(result.potencyScore).toBe(1);
      expect(result.issues).toHaveLength(0); // No errors
      expect(result.warnings.some((w) => w.includes("sensitivity verification"))).toBe(true);
      expect(result.warnings.some((w) => w.includes("timing validation"))).toBe(true);
    });
  });

  // ============================================================================
  // createTestRecord
  // ============================================================================
  describe("createTestRecord", () => {
    it("creates a valid test record", () => {
      const test = createTestRecord({
        id: "T-RS20251230-001",
        name: "Migration assay",
        procedure: "Measure cell migration over time",
        discriminates: ["H-RS20251230-001", "H-RS20251230-002"],
        expectedOutcomes: [
          { hypothesisId: "H-RS20251230-001", outcome: "Faster migration" },
          { hypothesisId: "H-RS20251230-002", outcome: "No change" },
        ],
        potencyCheck: { positiveControl: "Include positive control conditions" },
        evidencePerWeekScore: {
          likelihoodRatio: 2,
          cost: 2,
          speed: 2,
          ambiguity: 2,
        },
        feasibility: { requirements: "Cell culture", difficulty: "easy" },
        designedInSession: "RS20251230",
      });

      expect(test.id).toBe("T-RS20251230-001");
      expect(test.status).toBe("designed");
      expect(test.createdAt).toBeDefined();
    });
  });

  // ============================================================================
  // createBinaryTest
  // ============================================================================
  describe("createBinaryTest", () => {
    it("creates a valid binary test with opposite predictions", () => {
      const test = createBinaryTest({
        id: "T-RS20251230-001",
        name: "Gene knockout survival test",
        procedure: "Knock out gene and observe survival",
        hypothesis1: { id: "H-RS20251230-001", predictsPositive: true },
        hypothesis2: { id: "H-RS20251230-002", predictsPositive: false },
        potencyCheck: { positiveControl: "Include wild-type as positive control" },
        feasibility: { requirements: "CRISPR facility", difficulty: "hard" },
        designedInSession: "RS20251230",
      });

      expect(test.discriminates).toEqual(["H-RS20251230-001", "H-RS20251230-002"]);
      expect(test.expectedOutcomes[0].resultType).toBe("positive");
      expect(test.expectedOutcomes[1].resultType).toBe("negative");
      expect(test.evidencePerWeekScore.likelihoodRatio).toBe(3);
      expect(test.evidencePerWeekScore.ambiguity).toBe(3);
    });

    it("throws error when both hypotheses predict positive", () => {
      expect(() =>
        createBinaryTest({
          id: "T-RS20251230-001",
          name: "Test",
          procedure: "Run the test procedure here",
          hypothesis1: { id: "H-RS20251230-001", predictsPositive: true },
          hypothesis2: { id: "H-RS20251230-002", predictsPositive: true },
          potencyCheck: { positiveControl: "Include positive control" },
          feasibility: { requirements: "Lab", difficulty: "easy" },
          designedInSession: "RS20251230",
        }),
      ).toThrow(/not discriminative.*both hypotheses predict positive/);
    });

    it("throws error when both hypotheses predict negative", () => {
      expect(() =>
        createBinaryTest({
          id: "T-RS20251230-001",
          name: "Test",
          procedure: "Run the test procedure here",
          hypothesis1: { id: "H-RS20251230-001", predictsPositive: false },
          hypothesis2: { id: "H-RS20251230-002", predictsPositive: false },
          potencyCheck: { positiveControl: "Include positive control" },
          feasibility: { requirements: "Lab", difficulty: "easy" },
          designedInSession: "RS20251230",
        }),
      ).toThrow(/not discriminative.*both hypotheses predict negative/);
    });

    it("accepts optional cost and speed scores", () => {
      const test = createBinaryTest({
        id: "T-RS20251230-001",
        name: "Cheap fast test",
        procedure: "Quick and inexpensive procedure",
        hypothesis1: { id: "H-RS20251230-001", predictsPositive: true },
        hypothesis2: { id: "H-RS20251230-002", predictsPositive: false },
        potencyCheck: { positiveControl: "Include positive control samples" },
        feasibility: { requirements: "Bench", difficulty: "easy" },
        designedInSession: "RS20251230",
        cost: 3,
        speed: 3,
      });

      expect(test.evidencePerWeekScore.cost).toBe(3);
      expect(test.evidencePerWeekScore.speed).toBe(3);
    });
  });
});
