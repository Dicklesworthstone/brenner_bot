import { describe, expect, it } from "vitest";
import { createHypothesisCard } from "./hypothesis";
import {
  addCompetitor,
  assessPredictionBoldness,
  calculateScoreDelta,
  createArena,
  createArenaHypothesis,
  generateArenaId,
  generateArenaTestId,
  generateTestResultId,
  isHypothesisArena,
  recordTestResult,
} from "./hypothesis-arena";

const MOCK_HYPOTHESIS = createHypothesisCard({
  id: "HC-RS20260105-001-v1",
  statement: "Mock hypothesis statement",
  mechanism: "Mock mechanism description that is long enough",
  predictionsIfTrue: ["Prediction 1"],
  impossibleIfTrue: ["Falsification 1"],
  confidence: 50,
  sessionId: "RS20260105",
});

describe("hypothesis-arena", () => {
  describe("ID generation", () => {
    it("generates UUID-based Arena IDs with prefix", () => {
      const id = generateArenaId();
      expect(id).toMatch(/^ARENA-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it("generates UUID-based Test Result IDs", () => {
      const id = generateTestResultId();
      expect(id).toMatch(/^TR-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it("generates UUID-based Arena Test IDs", () => {
      const id = generateArenaTestId();
      expect(id).toMatch(/^AT-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });

  describe("Arena creation and manipulation", () => {
    it("creates a new arena with primary hypothesis", () => {
      const arena = createArena({
        question: "Research Question?",
        primaryHypothesis: MOCK_HYPOTHESIS,
      });

      expect(isHypothesisArena(arena)).toBe(true);
      expect(arena.competitors).toHaveLength(1);
      expect(arena.competitors[0].hypothesisId).toBe(MOCK_HYPOTHESIS.id);
      expect(arena.status).toBe("open");
    });

    it("adds competitors", () => {
      const arena = createArena({
        question: "Q?",
        primaryHypothesis: MOCK_HYPOTHESIS,
      });

      const h2 = createHypothesisCard({
        ...MOCK_HYPOTHESIS,
        id: "HC-RS20260105-002-v1",
        statement: "Hypothesis 2",
      });

      const updated = addCompetitor(arena, h2, "agent_suggested");
      expect(updated.competitors).toHaveLength(2);
      expect(updated.competitors[1].hypothesisId).toBe(h2.id);
      expect(updated.competitors[1].source).toBe("agent_suggested");
    });

    it("prevents duplicate competitors", () => {
      const arena = createArena({
        question: "Q?",
        primaryHypothesis: MOCK_HYPOTHESIS,
      });

      expect(() => addCompetitor(arena, MOCK_HYPOTHESIS, "user_added")).toThrow(
        /already in this arena/,
      );
    });
  });

  describe("Scoring logic", () => {
    it("calculates score deltas correctly", () => {
      // Base scores: supports=10, challenges=-10, eliminates=-100
      // Multipliers: vague=0.5, specific=1.0, precise=2.0, surprising=3.0

      expect(calculateScoreDelta("supports", "specific")).toBe(10);
      expect(calculateScoreDelta("supports", "vague")).toBe(5);
      expect(calculateScoreDelta("supports", "surprising")).toBe(30);

      expect(calculateScoreDelta("challenges", "specific")).toBe(-10);
      expect(calculateScoreDelta("challenges", "precise")).toBe(-20);

      expect(calculateScoreDelta("eliminates", "specific")).toBe(-100);
    });

    it("assesses prediction boldness", () => {
      expect(assessPredictionBoldness("It will increase by 50%")).toBe("precise"); // matches number%
      expect(assessPredictionBoldness("X will increase")).toBe("specific");
      expect(assessPredictionBoldness("Contrary to belief, X happens")).toBe("surprising");
      expect(assessPredictionBoldness("Something good happens")).toBe("vague");
    });
  });
});
