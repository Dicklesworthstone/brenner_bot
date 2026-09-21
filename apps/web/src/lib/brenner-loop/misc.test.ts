import { describe, expect, it } from "vitest";
import { renderResearchBriefTemplate } from "./artifacts/research-brief-template";
import {
  analyzeWhatIf,
  computeBatchConfidenceUpdate,
  computeConfidenceUpdate,
  formatConfidence,
  formatDelta,
  getAsymmetryExplanation,
  getConfidenceAssessment,
  getStarRating,
} from "./confidence";
import {
  createEvidenceEntry,
  generateEvidenceId,
  getResultColor,
  isDiscriminativePower,
  isEvidenceEntry,
  isEvidenceResult,
  isTestDescription,
  isTestType,
  summarizeEvidenceResult,
  validateEvidenceEntry,
} from "./evidence";
import type { HypothesisCard } from "./hypothesis";
import { createHypothesisCard, generateHypothesisCardId } from "./hypothesis";
import {
  addCompetitor,
  assessPredictionBoldness,
  buildComparisonMatrix,
  calculateDiscriminativePower,
  createArena,
  createArenaTest,
  eliminateHypothesis,
  generateArenaId,
  getActiveHypotheses,
  getEliminatedHypotheses,
  getLeader,
  getRankedHypotheses,
  isArenaHypothesis,
  isHypothesisArena,
  recordTestResult,
  resolveArena,
  scorePredictions,
} from "./hypothesis-arena";

function makeHypothesis(overrides: Partial<HypothesisCard> = {}): HypothesisCard {
  const sessionId = overrides.sessionId ?? "TEST-SESSION";
  return createHypothesisCard({
    id: overrides.id ?? generateHypothesisCardId(sessionId, 1),
    statement: overrides.statement ?? "X causes Y",
    mechanism: overrides.mechanism ?? "Because mechanism",
    domain: overrides.domain ?? ["psychology"],
    predictionsIfTrue: overrides.predictionsIfTrue ?? ["If X then Y"],
    predictionsIfFalse: overrides.predictionsIfFalse ?? ["If not X then not Y"],
    impossibleIfTrue: overrides.impossibleIfTrue ?? ["Y without X"],
    confidence: overrides.confidence,
    sessionId,
  });
}

describe("evidence", () => {
  it("validates types and builds evidence entries", () => {
    expect(isTestType("dose_response")).toBe(true);
    expect(isTestType("nope")).toBe(false);
    expect(isEvidenceResult("supports")).toBe(true);
    expect(isEvidenceResult("unknown")).toBe(false);
    expect(isDiscriminativePower(5)).toBe(true);
    expect(isDiscriminativePower(6)).toBe(false);

    const testId = generateEvidenceId("SESSION-1", 7);
    expect(testId).toBe("EV-SESSION-1-007");

    const entry = createEvidenceEntry({
      id: testId,
      sessionId: "SESSION-1",
      hypothesisVersion: "HC-SESSION-1-001-v1",
      test: {
        id: "T-1",
        description: "Mechanism block",
        type: "mechanism_block",
        discriminativePower: 5,
      },
      predictionIfTrue: "Outcome changes",
      predictionIfFalse: "Outcome unchanged",
      result: "supports",
      observation: "Outcome changed",
      confidenceBefore: 40,
      confidenceAfter: 55,
      interpretation: "Consistent with mechanism",
    });

    expect(validateEvidenceEntry(entry).valid).toBe(true);
    expect(isTestDescription(entry.test)).toBe(true);
    expect(isEvidenceEntry(entry)).toBe(true);
    expect(summarizeEvidenceResult(entry)).toContain("Supports hypothesis");
    expect(getResultColor("challenges")).toBe("red");
  });

  it("emits warnings for weak evidence hygiene", () => {
    const entry = createEvidenceEntry({
      id: generateEvidenceId("SESSION-2", 1),
      sessionId: "SESSION-2",
      hypothesisVersion: "HC-SESSION-2-001-v1",
      test: {
        id: "T-2",
        description: "Low power observation",
        type: "observation",
        discriminativePower: 2,
      },
      predictionIfTrue: "X increases",
      predictionIfFalse: "X does not increase",
      result: "inconclusive",
      observation: "Mixed results",
      confidenceBefore: 50,
      confidenceAfter: 50.5,
      interpretation: "Not enough signal",
    });

    const validation = validateEvidenceEntry(entry);
    expect(validation.valid).toBe(true);

    const warningCodes = new Set(validation.warnings.map((w) => w.code));
    expect(warningCodes.has("LOW_DISCRIMINATIVE_POWER")).toBe(true);
    expect(warningCodes.has("NO_SOURCE")).toBe(true);
    expect(warningCodes.has("SMALL_CONFIDENCE_CHANGE")).toBe(true);

    expect(summarizeEvidenceResult(entry)).toContain("Inconclusive");
    expect(getResultColor("inconclusive")).toBe("yellow");
  });

  it("rejects invalid evidence identifiers and malformed guards", () => {
    expect(() => generateEvidenceId(" bad", 1)).toThrow(/Invalid sessionId/);
    expect(() => generateEvidenceId("SESSION-3", -1)).toThrow(/Invalid sequence/);
    expect(() => generateEvidenceId("SESSION-3", 1000)).toThrow(/Invalid sequence/);

    expect(isTestDescription({})).toBe(false);
    expect(
      isEvidenceEntry({
        id: "EV-SESSION-3-001",
        sessionId: "SESSION-3",
        hypothesisVersion: "HC-SESSION-3-001-v1",
        test: { id: "T-1", description: "x", type: "observation", discriminativePower: 3 },
        predictionIfTrue: "a",
        predictionIfFalse: "b",
        result: "supports",
        observation: "obs",
        confidenceBefore: 50,
        confidenceAfter: 51,
        interpretation: "ok",
        recordedAt: "not-a-date",
      }),
    ).toBe(false);

    expect(() =>
      createEvidenceEntry({
        id: "EV-SESSION-3-002",
        sessionId: "SESSION-3",
        hypothesisVersion: "HC-SESSION-3-001-v1",
        test: { id: "T-1", description: "x", type: "observation", discriminativePower: 3 },
        predictionIfTrue: "",
        predictionIfFalse: "b",
        result: "supports",
        observation: "obs",
        confidenceBefore: 50,
        confidenceAfter: 51,
        interpretation: "ok",
      }),
    ).toThrow(/Invalid EvidenceEntry/);
  });

  it("covers test-description validation and date parsing branches", () => {
    const base = {
      id: "EV-SESSION-4-001",
      sessionId: "SESSION-4",
      hypothesisVersion: "HC-SESSION-4-001-v1",
      test: { id: "T-1", description: "ok", type: "observation", discriminativePower: 3 },
      predictionIfTrue: "a",
      predictionIfFalse: "b",
      result: "supports",
      observation: "obs",
      confidenceBefore: 50,
      confidenceAfter: 55,
      interpretation: "ok",
      recordedAt: "2026-01-01T00:00:00Z",
    };

    const missingTest = validateEvidenceEntry({ ...base, test: null } as never);
    expect(missingTest.valid).toBe(false);
    expect(missingTest.errors.some((e) => e.field === "test")).toBe(true);

    const invalidTest = validateEvidenceEntry({
      ...base,
      test: { id: "", description: "", type: "nope", discriminativePower: 0 },
    } as never);
    expect(invalidTest.valid).toBe(false);
    expect(invalidTest.errors.some((e) => e.field === "test.type")).toBe(true);
    expect(invalidTest.errors.some((e) => e.field === "test.discriminativePower")).toBe(true);

    const invalidDate = validateEvidenceEntry({ ...base, recordedAt: "not-a-date" } as never);
    expect(invalidDate.valid).toBe(false);
    expect(invalidDate.errors.some((e) => e.field === "recordedAt")).toBe(true);

    const validEntry = createEvidenceEntry({
      id: generateEvidenceId("SESSION-4", 2),
      sessionId: "SESSION-4",
      hypothesisVersion: "HC-SESSION-4-001-v1",
      test: { id: "T-2", description: "ok", type: "observation", discriminativePower: 3 },
      predictionIfTrue: "a",
      predictionIfFalse: "b",
      result: "challenges",
      observation: "obs",
      confidenceBefore: 55,
      confidenceAfter: 40,
      interpretation: "lower confidence",
      source: "paper",
    });

    expect(summarizeEvidenceResult(validEntry)).toContain("Challenges");
    expect(getResultColor("supports")).toBe("green");

    expect(isEvidenceEntry({ ...validEntry, tags: ["ok", 123] } as never)).toBe(false);
  });

  it("reports validation failures for malformed evidence", () => {
    const bad = {
      id: "EV-SESSION-1-000",
      sessionId: "SESSION-1",
      hypothesisVersion: "HC-SESSION-1-001-v1",
      test: { id: "T-1", description: "", type: "observation", discriminativePower: 3 },
      predictionIfTrue: "",
      predictionIfFalse: "",
      result: "supports",
      observation: "",
      confidenceBefore: 110,
      confidenceAfter: -10,
      interpretation: "",
      recordedAt: new Date(),
    };

    const result = validateEvidenceEntry(bad as never);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("confidence", () => {
  it("computes confidence updates with asymmetry and utility helpers", () => {
    const supports = computeConfidenceUpdate(60, { discriminativePower: 5 }, "supports");
    expect(supports.newConfidence).toBeGreaterThan(60);
    expect(supports.delta).toBeGreaterThan(0);

    const challenges = computeConfidenceUpdate(60, { discriminativePower: 5 }, "challenges");
    expect(challenges.newConfidence).toBeLessThan(60);
    expect(challenges.delta).toBeLessThan(0);

    const inconclusive = computeConfidenceUpdate(60, { discriminativePower: 3 }, "inconclusive");
    expect(inconclusive.delta).toBe(0);

    const batch = computeBatchConfidenceUpdate(50, [
      { test: { discriminativePower: 3 }, result: "supports" },
      { test: { discriminativePower: 5 }, result: "challenges" },
    ]);
    expect(batch.updates).toHaveLength(2);
    expect(batch.summary.supports).toBe(1);
    expect(batch.summary.challenges).toBe(1);

    const whatIf = analyzeWhatIf(55, { discriminativePower: 4 });
    expect(whatIf.informationValue).toBeGreaterThan(0);

    expect(getConfidenceAssessment(85).label).toBe("High");
    expect(formatConfidence(42)).toContain("%");
    expect(formatConfidence(42.25)).toBe("42.3%");
    expect(formatDelta(-12.5)).toContain("-");
    expect(formatDelta(0)).toContain("±0%");
    expect(formatDelta(12.34)).toContain("↑ +12.3%");
    expect(getStarRating(5)).toContain("★");
    expect(getAsymmetryExplanation()).toContain("twice the impact");
  });

  it("keeps delta consistent when confidence is clamped", () => {
    const cappedSupport = computeConfidenceUpdate(99, { discriminativePower: 5 }, "supports");
    expect(cappedSupport.newConfidence).toBe(99);
    expect(cappedSupport.delta).toBe(0);

    const flooredChallenge = computeConfidenceUpdate(1, { discriminativePower: 5 }, "challenges");
    expect(flooredChallenge.newConfidence).toBe(1);
    expect(flooredChallenge.delta).toBe(0);
  });

  it("throws on invalid discriminativePower", () => {
    expect(() =>
      computeConfidenceUpdate(50, { discriminativePower: 0 as never }, "supports"),
    ).toThrow("Invalid discriminativePower");

    expect(() =>
      computeConfidenceUpdate(50, { discriminativePower: 6 as never }, "challenges"),
    ).toThrow("Invalid discriminativePower");
  });
});

describe("hypothesis-arena", () => {
  it("runs a basic arena lifecycle and builds a comparison matrix", () => {
    const primary = makeHypothesis({
      id: "HC-SESSION-1-001-v1",
      statement: "A causes B",
      confidence: 50,
    });
    const arena0 = createArena({
      question: "Why?",
      primaryHypothesis: primary,
      sessionId: "SESSION-1",
    });
    expect(arena0.id).toMatch(/^ARENA-/);
    expect(generateArenaId("X")).toMatch(/^X-/);

    const competitor = makeHypothesis({
      id: "HC-SESSION-1-002-v1",
      statement: "B causes A",
      confidence: 40,
    });
    const arena1 = addCompetitor(arena0, competitor, "object_transpose");
    expect(arena1.competitors).toHaveLength(2);

    const { arena: arena2, test } = createArenaTest(arena1, {
      name: "Test 1",
      targetHypotheses: [primary.id, competitor.id],
    });
    const arena3 = recordTestResult(arena2, test.id, primary.id, "supports", {
      confidence: 0.8,
      boldness: "specific",
    });
    const arena4 = recordTestResult(arena3, test.id, competitor.id, "eliminates", {
      notes: "ruled out",
    });

    expect(getEliminatedHypotheses(arena4)).toHaveLength(1);
    expect(getActiveHypotheses(arena4).length).toBeGreaterThan(0);
    expect(getLeader(arena4)?.hypothesisId).toBe(primary.id);

    const matrix = buildComparisonMatrix(arena4);
    expect(matrix.rows).toHaveLength(2);
    expect(matrix.tests).toHaveLength(1);

    expect(calculateDiscriminativePower(arena4)).toBeGreaterThanOrEqual(0);
    expect(getRankedHypotheses(arena4)[0]?.score).toBeGreaterThanOrEqual(
      getRankedHypotheses(arena4)[1]?.score ?? -Infinity,
    );

    const resolved = resolveArena(arena4, primary.id, "done");
    expect(resolved.status).toBe("resolved");

    expect(isHypothesisArena(resolved)).toBe(true);
    expect(isArenaHypothesis(resolved.competitors[0])).toBe(true);
  });

  it("covers arena scoring helpers", () => {
    expect(assessPredictionBoldness("Unexpectedly, X decreases Y")).toBe("surprising");
    expect(assessPredictionBoldness("Exactly 10% of samples change")).toBe("precise");
    expect(assessPredictionBoldness("Increase in Y after X")).toBe("specific");
    expect(assessPredictionBoldness("Maybe it changes")).toBe("vague");

    const scored = scorePredictions("HC-1", ["Strong claim", "Maybe claim"]);
    expect(scored.length).toBe(2);
    expect(scored[0]?.hypothesisId).toBe("HC-1");
  });

  it("supports manual elimination path", () => {
    const primary = makeHypothesis({ id: "HC-SESSION-2-001-v1" });
    const arena0 = createArena({ question: "Q", primaryHypothesis: primary });
    const eliminated = eliminateHypothesis(arena0, primary.id, "external evidence", "user");
    expect(getEliminatedHypotheses(eliminated)).toHaveLength(1);
  });
});

describe("research-brief-template", () => {
  it("renders a stable markdown template with placeholders", () => {
    const markdown = renderResearchBriefTemplate();
    expect(markdown).toContain("---");
    expect(markdown).toContain("type: research_brief");
    expect(markdown).toContain("# Research Brief");
    expect(markdown).toContain("_Summarize the hypothesis");

    const filled = renderResearchBriefTemplate({
      metadata: { sessionId: "S-1", finalConfidence: 72, brennerCitations: ["§42"] },
      executiveSummary: "Summary",
      objectionRegister: {
        objections: [
          {
            id: "123:0",
            type: "reverse_causation",
            severity: "fatal",
            status: "open",
            summary: "Reverse causation is plausible.",
            source: { agentName: "DevilBot", role: "devils_advocate", messageId: 123 },
          },
          {
            id: "124:0",
            type: "missing_evidence",
            severity: "moderate",
            status: "addressed",
            summary: "Claim needs evidence.",
            source: { agentName: "StatsBot", role: "statistician", messageId: 124 },
          },
        ],
      },
      recommendedNextSteps: ["Run the discriminative test", "Update confidence"],
    });
    expect(filled).toContain("session_id: S-1");
    expect(filled).toContain("final_confidence: 72%");
    expect(filled).toContain("- §42");
    expect(filled).toContain("## Objection Register");
    expect(filled).toContain("Unresolved objections:** 1");
    expect(filled).toContain("[Open]");
    expect(filled).toContain("1. Run the discriminative test");
  });
});
