import { describe, expect, it } from "vitest";
import {
  createBinaryPrediction,
  createPrediction,
  estimateDiscriminativePower,
  generatePredictionId,
  type HypothesisPrediction,
  HypothesisPredictionSchema,
  isValidPredictionId,
  type Prediction,
  PredictionSchema,
  PredictionStatusSchema,
  validateDiscriminativePower,
} from "./prediction";

describe("Prediction Schema", () => {
  // ============================================================================
  // ID Validation
  // ============================================================================
  describe("ID patterns", () => {
    it("accepts valid prediction IDs", () => {
      expect(isValidPredictionId("P-RS20251230-001")).toBe(true);
      expect(isValidPredictionId("P-sess1-100")).toBe(true);
      expect(isValidPredictionId("P-my_session-999")).toBe(true);
    });

    it("rejects invalid prediction IDs", () => {
      expect(isValidPredictionId("P-001")).toBe(false); // missing session
      expect(isValidPredictionId("H-RS20251230-001")).toBe(false); // wrong prefix
      expect(isValidPredictionId("P-RS20251230-1")).toBe(false); // not 3 digits
      expect(isValidPredictionId("P--001")).toBe(false); // empty session
    });
  });

  describe("generatePredictionId", () => {
    it("generates first ID as -001", () => {
      const id = generatePredictionId("RS20251230", []);
      expect(id).toBe("P-RS20251230-001");
    });

    it("increments from existing IDs", () => {
      const existing = ["P-RS20251230-001", "P-RS20251230-002"];
      const id = generatePredictionId("RS20251230", existing);
      expect(id).toBe("P-RS20251230-003");
    });

    it("ignores IDs from other sessions", () => {
      const existing = ["P-OTHER-001", "P-OTHER-002"];
      const id = generatePredictionId("RS20251230", existing);
      expect(id).toBe("P-RS20251230-001");
    });
  });

  // ============================================================================
  // HypothesisPrediction Sub-Schema
  // ============================================================================
  describe("HypothesisPredictionSchema", () => {
    it("validates a minimal prediction", () => {
      const hp: HypothesisPrediction = {
        hypothesisId: "H-RS20251230-001",
        prediction: "Effect present",
      };
      expect(() => HypothesisPredictionSchema.parse(hp)).not.toThrow();
    });

    it("validates a full prediction", () => {
      const hp: HypothesisPrediction = {
        hypothesisId: "H-RS20251230-001",
        prediction: "Signal increases by 50%",
        rationale: "Pathway activation leads to increased expression",
        type: "quantitative",
        expectedValue: ">50% increase",
      };
      expect(() => HypothesisPredictionSchema.parse(hp)).not.toThrow();
    });

    it("rejects invalid hypothesis ID", () => {
      const hp = {
        hypothesisId: "invalid-id",
        prediction: "Effect present",
      };
      expect(() => HypothesisPredictionSchema.parse(hp)).toThrow();
    });

    it("rejects too-short prediction text", () => {
      const hp = {
        hypothesisId: "H-RS20251230-001",
        prediction: "Yes",
      };
      expect(() => HypothesisPredictionSchema.parse(hp)).toThrow();
    });
  });

  // ============================================================================
  // PredictionStatus
  // ============================================================================
  describe("PredictionStatusSchema", () => {
    it("accepts all valid statuses", () => {
      const statuses = ["untested", "pending", "confirmed", "inconclusive", "invalidated"];
      for (const s of statuses) {
        expect(() => PredictionStatusSchema.parse(s)).not.toThrow();
      }
    });

    it("rejects invalid status", () => {
      expect(() => PredictionStatusSchema.parse("active")).toThrow();
    });
  });

  // ============================================================================
  // Full Prediction Schema
  // ============================================================================
  describe("PredictionSchema", () => {
    const validPrediction: Prediction = {
      id: "P-RS20251230-001",
      condition: "When Wnt signaling is activated in neural crest cells",
      hypothesisPredictions: [
        { hypothesisId: "H-RS20251230-001", prediction: "Increased migration speed" },
        { hypothesisId: "H-RS20251230-002", prediction: "No change in migration" },
      ],
      sessionId: "RS20251230",
      isDiscriminative: true,
      isInference: false,
      status: "untested",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("validates a correct prediction", () => {
      expect(() => PredictionSchema.parse(validPrediction)).not.toThrow();
    });

    it("requires at least 2 hypothesis predictions", () => {
      const invalid = {
        ...validPrediction,
        hypothesisPredictions: [{ hypothesisId: "H-RS20251230-001", prediction: "Effect present" }],
      };
      expect(() => PredictionSchema.parse(invalid)).toThrow(/at least 2/);
    });

    it("requires condition to be at least 10 chars", () => {
      const invalid = {
        ...validPrediction,
        condition: "Short",
      };
      expect(() => PredictionSchema.parse(invalid)).toThrow(/at least 10/);
    });

    it("accepts optional fields", () => {
      const full = {
        ...validPrediction,
        name: "Wnt migration test",
        discriminativePower: 3,
        discriminationNotes: "Binary outcome expected",
        linkedTests: ["T-RS20251230-001"],
        anchors: ["§42", "§43-45"],
        proposedBy: "Brenner",
        confirmedHypothesisId: "H-RS20251230-001",
        statusReason: "Test showed clear positive",
        tags: ["migration", "wnt"],
        notes: "Key discriminative test",
      };
      expect(() => PredictionSchema.parse(full)).not.toThrow();
    });

    it("validates anchor format", () => {
      const invalid = {
        ...validPrediction,
        anchors: ["42"], // missing §
      };
      expect(() => PredictionSchema.parse(invalid)).toThrow();
    });

    it("validates linkedTests format", () => {
      const invalid = {
        ...validPrediction,
        linkedTests: ["invalid-test-id"],
      };
      expect(() => PredictionSchema.parse(invalid)).toThrow();
    });
  });

  // ============================================================================
  // validateDiscriminativePower
  // ============================================================================
  describe("validateDiscriminativePower", () => {
    it("returns isDiscriminative true for different predictions", () => {
      const prediction: Prediction = {
        id: "P-RS20251230-001",
        condition: "When X is applied to Y cells",
        hypothesisPredictions: [
          { hypothesisId: "H-RS20251230-001", prediction: "Cells will survive" },
          { hypothesisId: "H-RS20251230-002", prediction: "Cells will die" },
        ],
        sessionId: "RS20251230",
        isDiscriminative: true,
        isInference: false,
        status: "untested",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = validateDiscriminativePower(prediction);
      expect(result.isDiscriminative).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("returns isDiscriminative false for identical predictions", () => {
      const prediction: Prediction = {
        id: "P-RS20251230-001",
        condition: "When X is applied to Y cells",
        hypothesisPredictions: [
          { hypothesisId: "H-RS20251230-001", prediction: "Cells will change" },
          { hypothesisId: "H-RS20251230-002", prediction: "Cells will change" },
        ],
        sessionId: "RS20251230",
        isDiscriminative: true,
        isInference: false,
        status: "untested",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = validateDiscriminativePower(prediction);
      expect(result.isDiscriminative).toBe(false);
      expect(result.issues).toContain(
        "Some hypotheses have identical predictions - not discriminative",
      );
    });

    it("flags vague predictions", () => {
      const prediction: Prediction = {
        id: "P-RS20251230-001",
        condition: "When X is applied to Y cells",
        hypothesisPredictions: [
          { hypothesisId: "H-RS20251230-001", prediction: "Cells might show some effect" },
          { hypothesisId: "H-RS20251230-002", prediction: "Cells could possibly change" },
        ],
        sessionId: "RS20251230",
        isDiscriminative: true,
        isInference: false,
        status: "untested",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = validateDiscriminativePower(prediction);
      expect(result.issues.some((i) => i.includes("vague"))).toBe(true);
    });
  });

  // ============================================================================
  // estimateDiscriminativePower
  // ============================================================================
  describe("estimateDiscriminativePower", () => {
    it("returns 3 for binary opposite predictions", () => {
      const prediction: Prediction = {
        id: "P-RS20251230-001",
        condition: "When X is applied to Y cells",
        hypothesisPredictions: [
          { hypothesisId: "H-RS20251230-001", prediction: "Gene X will be present" },
          { hypothesisId: "H-RS20251230-002", prediction: "Gene X will be absent" },
        ],
        sessionId: "RS20251230",
        isDiscriminative: true,
        isInference: false,
        status: "untested",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(estimateDiscriminativePower(prediction)).toBe(3);
    });

    it("returns 3 for alive/dead opposites", () => {
      const prediction: Prediction = {
        id: "P-RS20251230-001",
        condition: "After treatment with compound Z",
        hypothesisPredictions: [
          { hypothesisId: "H-RS20251230-001", prediction: "Cells remain alive" },
          { hypothesisId: "H-RS20251230-002", prediction: "Cells are dead" },
        ],
        sessionId: "RS20251230",
        isDiscriminative: true,
        isInference: false,
        status: "untested",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(estimateDiscriminativePower(prediction)).toBe(3);
    });

    it("returns 2 for quantitative predictions", () => {
      const prediction: Prediction = {
        id: "P-RS20251230-001",
        condition: "When X is applied to Y cells",
        hypothesisPredictions: [
          { hypothesisId: "H-RS20251230-001", prediction: "Expression will increase" },
          { hypothesisId: "H-RS20251230-002", prediction: "Expression remains baseline" },
        ],
        sessionId: "RS20251230",
        isDiscriminative: true,
        isInference: false,
        status: "untested",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(estimateDiscriminativePower(prediction)).toBe(2);
    });

    it("returns 1 for qualitative non-binary predictions", () => {
      const prediction: Prediction = {
        id: "P-RS20251230-001",
        condition: "When X is applied to Y cells",
        hypothesisPredictions: [
          { hypothesisId: "H-RS20251230-001", prediction: "Pattern A morphology" },
          { hypothesisId: "H-RS20251230-002", prediction: "Pattern B morphology" },
        ],
        sessionId: "RS20251230",
        isDiscriminative: true,
        isInference: false,
        status: "untested",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(estimateDiscriminativePower(prediction)).toBe(1);
    });

    it("returns 0 for single hypothesis prediction", () => {
      // Create a minimal prediction that bypasses schema validation
      const prediction = {
        id: "P-RS20251230-001",
        condition: "When X is applied",
        hypothesisPredictions: [
          { hypothesisId: "H-RS20251230-001", prediction: "Effect observed" },
        ],
        sessionId: "RS20251230",
        isDiscriminative: false,
        isInference: false,
        status: "untested",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Prediction;

      expect(estimateDiscriminativePower(prediction)).toBe(0);
    });
  });

  // ============================================================================
  // createPrediction
  // ============================================================================
  describe("createPrediction", () => {
    it("creates a valid prediction with required fields", () => {
      const prediction = createPrediction({
        id: "P-RS20251230-001",
        condition: "When compound X is added to culture",
        hypothesisPredictions: [
          { hypothesisId: "H-RS20251230-001", prediction: "Cells proliferate faster" },
          { hypothesisId: "H-RS20251230-002", prediction: "Cells die within 24h" },
        ],
        sessionId: "RS20251230",
      });

      expect(prediction.id).toBe("P-RS20251230-001");
      expect(prediction.status).toBe("untested");
      expect(prediction.isDiscriminative).toBe(true);
      expect(prediction.isInference).toBe(false);
      expect(prediction.createdAt).toBeDefined();
      expect(prediction.updatedAt).toBeDefined();
    });

    it("accepts optional fields", () => {
      const prediction = createPrediction({
        id: "P-RS20251230-001",
        condition: "When compound X is added to culture",
        hypothesisPredictions: [
          { hypothesisId: "H-RS20251230-001", prediction: "Cells proliferate faster" },
          { hypothesisId: "H-RS20251230-002", prediction: "Cells die within 24h" },
        ],
        sessionId: "RS20251230",
        name: "Compound X effect",
        proposedBy: "Brenner",
        anchors: ["§15", "§16-18"],
        isInference: true,
      });

      expect(prediction.name).toBe("Compound X effect");
      expect(prediction.proposedBy).toBe("Brenner");
      expect(prediction.anchors).toEqual(["§15", "§16-18"]);
      expect(prediction.isInference).toBe(true);
    });
  });

  // ============================================================================
  // createBinaryPrediction
  // ============================================================================
  describe("createBinaryPrediction", () => {
    it("creates a valid binary prediction with opposite outcomes", () => {
      const prediction = createBinaryPrediction({
        id: "P-RS20251230-001",
        condition: "When gene X is knocked out in embryos",
        hypothesis1: { id: "H-RS20251230-001", predictsPositive: true },
        hypothesis2: { id: "H-RS20251230-002", predictsPositive: false },
        sessionId: "RS20251230",
      });

      expect(prediction.hypothesisPredictions).toHaveLength(2);
      expect(prediction.hypothesisPredictions[0].prediction).toContain("Effect present");
      expect(prediction.hypothesisPredictions[1].prediction).toContain("No effect");
    });

    it("throws error when both hypotheses predict positive", () => {
      expect(() =>
        createBinaryPrediction({
          id: "P-RS20251230-001",
          condition: "When gene X is knocked out in embryos",
          hypothesis1: { id: "H-RS20251230-001", predictsPositive: true },
          hypothesis2: { id: "H-RS20251230-002", predictsPositive: true },
          sessionId: "RS20251230",
        }),
      ).toThrow(/not discriminative.*both hypotheses predict positive/);
    });

    it("throws error when both hypotheses predict negative", () => {
      expect(() =>
        createBinaryPrediction({
          id: "P-RS20251230-001",
          condition: "When gene X is knocked out in embryos",
          hypothesis1: { id: "H-RS20251230-001", predictsPositive: false },
          hypothesis2: { id: "H-RS20251230-002", predictsPositive: false },
          sessionId: "RS20251230",
        }),
      ).toThrow(/not discriminative.*both hypotheses predict negative/);
    });

    it("accepts optional fields", () => {
      const prediction = createBinaryPrediction({
        id: "P-RS20251230-001",
        condition: "When gene X is knocked out in embryos",
        hypothesis1: {
          id: "H-RS20251230-001",
          predictsPositive: true,
          rationale: "Gene X activates the pathway",
        },
        hypothesis2: {
          id: "H-RS20251230-002",
          predictsPositive: false,
          rationale: "Gene X is not involved",
        },
        sessionId: "RS20251230",
        name: "Gene X knockout test",
        proposedBy: "Brenner",
      });

      expect(prediction.name).toBe("Gene X knockout test");
      expect(prediction.proposedBy).toBe("Brenner");
      expect(prediction.hypothesisPredictions[0].rationale).toBe("Gene X activates the pathway");
    });
  });
});
