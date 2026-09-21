/**
 * Tests for graveyard.ts - Hypothesis Graveyard (Falsification Tracking)
 *
 * Tests the "death certificate" system for falsified hypotheses.
 *
 * @see brenner_bot-7usw (bead)
 */
import { describe, expect, it } from "vitest";
import type { EvidenceEntry } from "./evidence";
import {
  addContributedTo,
  addSuccessor,
  analyzeFailurePatterns,
  BRENNER_FALSIFICATION_QUOTES,
  calculateGraveyardStats,
  createFalsifiedHypothesis,
  DEATH_TYPE_DESCRIPTIONS,
  DEATH_TYPE_ICONS,
  DEATH_TYPE_LABELS,
  type DeathType,
  type FalsificationLearning,
  type FalsifiedHypothesis,
  formatFalsificationDate,
  GRAVEYARD_ID_PATTERN,
  generateGraveyardId,
  getDeathTypeDisplay,
  getRandomBrennerQuote,
  isDeathType,
  isFalsifiedHypothesis,
  summarizeFalsification,
  updateEpitaph,
  updateLearning,
  validateFalsifiedHypothesis,
} from "./graveyard";
import type { HypothesisCard } from "./hypothesis";
import { createHypothesisCard, generateHypothesisCardId } from "./hypothesis";

// ============================================================================
// Test Fixtures
// ============================================================================

function makeHypothesis(overrides: Partial<HypothesisCard> = {}): HypothesisCard {
  const sessionId = overrides.sessionId ?? "TEST-SESSION";
  return createHypothesisCard({
    id: overrides.id ?? generateHypothesisCardId(sessionId, 1),
    statement: overrides.statement ?? "Test hypothesis",
    mechanism: overrides.mechanism ?? "Test mechanism",
    domain: overrides.domain ?? ["test"],
    predictionsIfTrue: overrides.predictionsIfTrue ?? ["Prediction 1"],
    predictionsIfFalse: overrides.predictionsIfFalse ?? ["Prediction 2"],
    impossibleIfTrue: overrides.impossibleIfTrue ?? ["Falsifier 1"],
    confidence: overrides.confidence,
    sessionId,
  });
}

function makeEvidence(sessionId = "TEST-SESSION"): EvidenceEntry {
  return {
    id: `EV-${sessionId}-001`,
    sessionId,
    hypothesisVersion: `HC-${sessionId}-001-v1`,
    test: {
      id: "T-1",
      description: "The killing blow test",
      type: "mechanism_block",
      discriminativePower: 5,
    },
    predictionIfTrue: "Expected outcome if hypothesis correct",
    predictionIfFalse: "Expected outcome if hypothesis wrong",
    result: "challenges",
    observation: "Observed the falsifying result",
    confidenceBefore: 60,
    confidenceAfter: 20,
    interpretation: "Evidence strongly challenges the hypothesis",
    notes: "Test result notes",
    recordedAt: new Date(),
  };
}

function makeLearning(): FalsificationLearning {
  return {
    lessonsLearned: ["Lesson 1", "Lesson 2"],
    whatWeNowKnow: ["Fact 1"],
    whatRemainsOpen: ["Question 1"],
    suggestedNextSteps: ["Step 1"],
  };
}

function makeFalsifiedHypothesis(
  overrides: Partial<FalsifiedHypothesis> = {},
): FalsifiedHypothesis {
  const sessionId = "TEST-SESSION";
  return {
    id: overrides.id ?? generateGraveyardId(sessionId, 1),
    hypothesis: overrides.hypothesis ?? makeHypothesis({ sessionId }),
    sessionId,
    falsifiedAt: overrides.falsifiedAt ?? new Date(),
    killingBlow: overrides.killingBlow ?? makeEvidence(sessionId),
    deathType: overrides.deathType ?? "direct_falsification",
    deathSummary: overrides.deathSummary ?? "The hypothesis was falsified by evidence",
    learning: overrides.learning ?? makeLearning(),
    successorHypothesisIds: overrides.successorHypothesisIds ?? [],
    contributedToIds: overrides.contributedToIds ?? [],
    epitaph: overrides.epitaph ?? "A brave hypothesis, valiantly tested",
    brennerQuote: overrides.brennerQuote ?? "This is not a failure. This is progress.",
    ...overrides,
  };
}

// ============================================================================
// Death Type Tests
// ============================================================================

describe("graveyard death types", () => {
  it("validates death types with isDeathType()", () => {
    expect(isDeathType("direct_falsification")).toBe(true);
    expect(isDeathType("mechanism_failure")).toBe(true);
    expect(isDeathType("effect_size_collapse")).toBe(true);
    expect(isDeathType("superseded")).toBe(true);
    expect(isDeathType("unmeasurable")).toBe(true);
    expect(isDeathType("scope_reduction")).toBe(true);

    expect(isDeathType("invalid")).toBe(false);
    expect(isDeathType(null)).toBe(false);
    expect(isDeathType(undefined)).toBe(false);
    expect(isDeathType(123)).toBe(false);
  });

  it("has labels for all death types", () => {
    const deathTypes: DeathType[] = [
      "direct_falsification",
      "mechanism_failure",
      "effect_size_collapse",
      "superseded",
      "unmeasurable",
      "scope_reduction",
    ];

    for (const dt of deathTypes) {
      expect(DEATH_TYPE_LABELS[dt]).toBeDefined();
      expect(DEATH_TYPE_LABELS[dt].length).toBeGreaterThan(0);
    }
  });

  it("has descriptions for all death types", () => {
    const deathTypes: DeathType[] = [
      "direct_falsification",
      "mechanism_failure",
      "effect_size_collapse",
      "superseded",
      "unmeasurable",
      "scope_reduction",
    ];

    for (const dt of deathTypes) {
      expect(DEATH_TYPE_DESCRIPTIONS[dt]).toBeDefined();
      expect(DEATH_TYPE_DESCRIPTIONS[dt].length).toBeGreaterThan(10);
    }
  });

  it("has icons for all death types", () => {
    const deathTypes: DeathType[] = [
      "direct_falsification",
      "mechanism_failure",
      "effect_size_collapse",
      "superseded",
      "unmeasurable",
      "scope_reduction",
    ];

    for (const dt of deathTypes) {
      expect(DEATH_TYPE_ICONS[dt]).toBeDefined();
    }
  });

  it("returns display info with getDeathTypeDisplay()", () => {
    const display = getDeathTypeDisplay("direct_falsification");
    expect(display.label).toBe("Direct Falsification");
    expect(display.description).toContain("impossible");
    expect(display.icon).toBe("💀");
  });
});

// ============================================================================
// Brenner Quotes Tests
// ============================================================================

describe("graveyard Brenner quotes", () => {
  it("has quotes for all death types", () => {
    const deathTypes: DeathType[] = [
      "direct_falsification",
      "mechanism_failure",
      "effect_size_collapse",
      "superseded",
      "unmeasurable",
      "scope_reduction",
    ];

    for (const dt of deathTypes) {
      expect(BRENNER_FALSIFICATION_QUOTES[dt]).toBeDefined();
      expect(BRENNER_FALSIFICATION_QUOTES[dt].length).toBeGreaterThan(0);
    }
  });

  it("returns a quote with getRandomBrennerQuote()", () => {
    const quote = getRandomBrennerQuote("direct_falsification");
    expect(quote).toBeDefined();
    expect(quote.length).toBeGreaterThan(0);
    expect(BRENNER_FALSIFICATION_QUOTES["direct_falsification"]).toContain(quote);
  });
});

// ============================================================================
// ID Generation Tests
// ============================================================================

describe("graveyard ID generation", () => {
  it("generates valid IDs with generateGraveyardId()", () => {
    const id = generateGraveyardId("SESSION-1", 1);
    expect(id).toBe("GY-SESSION-1-001");
    expect(GRAVEYARD_ID_PATTERN.test(id)).toBe(true);
  });

  it("pads sequence numbers to 3 digits", () => {
    expect(generateGraveyardId("S", 1)).toBe("GY-S-001");
    expect(generateGraveyardId("S", 10)).toBe("GY-S-010");
    expect(generateGraveyardId("S", 100)).toBe("GY-S-100");
  });

  it("validates ID format with pattern", () => {
    expect(GRAVEYARD_ID_PATTERN.test("GY-SESSION-001")).toBe(true);
    expect(GRAVEYARD_ID_PATTERN.test("GY-test-session-123")).toBe(true);
    expect(GRAVEYARD_ID_PATTERN.test("INVALID")).toBe(false);
    expect(GRAVEYARD_ID_PATTERN.test("GY--001")).toBe(false);
  });

  it("throws for invalid sessionId and sequence", () => {
    expect(() => generateGraveyardId("", 1)).toThrow(/Invalid sessionId/);
    expect(() => generateGraveyardId(" bad", 1)).toThrow(/Invalid sessionId/);
    expect(() => generateGraveyardId("S", -1)).toThrow(/Invalid sequence/);
    expect(() => generateGraveyardId("S", 1000)).toThrow(/Invalid sequence/);
    expect(() => generateGraveyardId("S", 1.5 as never)).toThrow(/Invalid sequence/);
  });
});

// ============================================================================
// Creation Tests
// ============================================================================

describe("graveyard creation", () => {
  it("creates a falsified hypothesis with createFalsifiedHypothesis()", () => {
    const hypothesis = makeHypothesis();
    const evidence = makeEvidence();
    const learning = makeLearning();

    const entry = createFalsifiedHypothesis({
      id: generateGraveyardId("TEST-SESSION", 1),
      sessionId: "TEST-SESSION",
      hypothesis,
      killingBlow: evidence,
      deathType: "direct_falsification",
      deathSummary: "The impossible happened",
      learning,
    });

    expect(entry.id).toBe("GY-TEST-SESSION-001");
    expect(entry.hypothesis).toEqual(hypothesis);
    expect(entry.killingBlow).toEqual(evidence);
    expect(entry.deathType).toBe("direct_falsification");
    expect(entry.successorHypothesisIds).toEqual([]);
    expect(entry.contributedToIds).toEqual([]);
    expect(entry.brennerQuote).toBeDefined();
  });

  it("defaults to empty epitaph if not provided", () => {
    const entry = createFalsifiedHypothesis({
      id: generateGraveyardId("TEST-SESSION", 2),
      sessionId: "TEST-SESSION",
      hypothesis: makeHypothesis(),
      killingBlow: makeEvidence(),
      deathType: "mechanism_failure",
      deathSummary: "Mechanism didn't work",
      learning: makeLearning(),
    });

    // Epitaph defaults to empty string
    expect(entry.epitaph).toBe("");
  });

  it("uses provided epitaph when given", () => {
    const entry = createFalsifiedHypothesis({
      id: generateGraveyardId("TEST-SESSION", 3),
      sessionId: "TEST-SESSION",
      hypothesis: makeHypothesis(),
      killingBlow: makeEvidence(),
      deathType: "superseded",
      deathSummary: "Superseded by better hypothesis",
      learning: makeLearning(),
      epitaph: "A brave hypothesis that paved the way",
    });

    expect(entry.epitaph).toBe("A brave hypothesis that paved the way");
  });

  it("throws when creating an invalid entry", () => {
    expect(() =>
      createFalsifiedHypothesis({
        id: generateGraveyardId("TEST-SESSION", 4),
        sessionId: "TEST-SESSION",
        hypothesis: makeHypothesis(),
        killingBlow: makeEvidence(),
        deathType: "direct_falsification",
        deathSummary: "",
        learning: makeLearning(),
      }),
    ).toThrow(/Invalid FalsifiedHypothesis/);
  });
});

// ============================================================================
// Mutation Tests
// ============================================================================

describe("graveyard mutations", () => {
  it("adds successor with addSuccessor()", () => {
    const entry = makeFalsifiedHypothesis();
    const updated = addSuccessor(entry, "HC-NEW-001-v1");

    expect(updated.successorHypothesisIds).toContain("HC-NEW-001-v1");
    expect(entry.successorHypothesisIds).not.toContain("HC-NEW-001-v1"); // original unchanged
  });

  it("does not duplicate successors", () => {
    const entry = makeFalsifiedHypothesis({ successorHypothesisIds: ["HC-NEW-001-v1"] });
    const updated = addSuccessor(entry, "HC-NEW-001-v1");
    expect(updated).toBe(entry);
  });

  it("adds contributedTo with addContributedTo()", () => {
    const entry = makeFalsifiedHypothesis();
    const updated = addContributedTo(entry, "HC-OTHER-001-v1");

    expect(updated.contributedToIds).toContain("HC-OTHER-001-v1");
    expect(entry.contributedToIds).not.toContain("HC-OTHER-001-v1"); // original unchanged
  });

  it("does not duplicate contributedTo links", () => {
    const entry = makeFalsifiedHypothesis({ contributedToIds: ["HC-OTHER-001-v1"] });
    const updated = addContributedTo(entry, "HC-OTHER-001-v1");
    expect(updated).toBe(entry);
  });

  it("updates epitaph with updateEpitaph()", () => {
    const entry = makeFalsifiedHypothesis();
    const updated = updateEpitaph(entry, "New epitaph");

    expect(updated.epitaph).toBe("New epitaph");
    expect(entry.epitaph).not.toBe("New epitaph"); // original unchanged
  });

  it("updates learning with updateLearning()", () => {
    const entry = makeFalsifiedHypothesis();
    const newLearning: FalsificationLearning = {
      lessonsLearned: ["New lesson"],
      whatWeNowKnow: ["New fact"],
      whatRemainsOpen: ["New question"],
      suggestedNextSteps: ["New step"],
    };
    const updated = updateLearning(entry, newLearning);

    expect(updated.learning.lessonsLearned).toContain("New lesson");
    expect(entry.learning.lessonsLearned).not.toContain("New lesson"); // original unchanged
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe("graveyard validation", () => {
  it("validates a complete FalsifiedHypothesis", () => {
    const entry = makeFalsifiedHypothesis();
    const result = validateFalsifiedHypothesis(entry);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("detects missing required fields", () => {
    const entry = makeFalsifiedHypothesis();
    const invalid = { ...entry, id: "" };
    const result = validateFalsifiedHypothesis(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "id")).toBe(true);
  });

  it("warns when death summary is short", () => {
    const entry = makeFalsifiedHypothesis({ deathSummary: "Too short" });
    const result = validateFalsifiedHypothesis(entry);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.code === "SHORT_DEATH_SUMMARY")).toBe(true);
  });

  it("detects invalid death type", () => {
    const entry = makeFalsifiedHypothesis();
    const invalid = { ...entry, deathType: "invalid" as DeathType };
    const result = validateFalsifiedHypothesis(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "deathType")).toBe(true);
  });

  it("detects invalid falsifiedAt values", () => {
    const entry = makeFalsifiedHypothesis();
    const invalidDate = { ...entry, falsifiedAt: new Date("not-a-date") } as never;
    const invalidString = { ...entry, falsifiedAt: "not-a-date" } as never;

    expect(
      validateFalsifiedHypothesis(invalidDate).errors.some((e) => e.field === "falsifiedAt"),
    ).toBe(true);
    expect(
      validateFalsifiedHypothesis(invalidString).errors.some((e) => e.field === "falsifiedAt"),
    ).toBe(true);
  });

  it("flags missing learning object and missing session id", () => {
    const entry = makeFalsifiedHypothesis();
    const invalid = { ...entry, sessionId: "", learning: null } as never;
    const result = validateFalsifiedHypothesis(invalid);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === "sessionId")).toBe(true);
    expect(result.errors.some((e) => e.field === "learning")).toBe(true);
  });

  it("does not warn about successors when deathType is unmeasurable", () => {
    const entry = makeFalsifiedHypothesis({
      deathType: "unmeasurable",
      successorHypothesisIds: [],
    });

    const result = validateFalsifiedHypothesis(entry);
    expect(result.warnings.some((w) => w.code === "NO_SUCCESSORS")).toBe(false);
  });

  it("warns on missing lessons", () => {
    const entry = makeFalsifiedHypothesis({
      learning: {
        lessonsLearned: [],
        whatWeNowKnow: [],
        whatRemainsOpen: [],
        suggestedNextSteps: [],
      },
    });
    const result = validateFalsifiedHypothesis(entry);

    expect(result.warnings.some((w) => w.code === "NO_LESSONS")).toBe(true);
  });

  it("type guards with isFalsifiedHypothesis()", () => {
    const entry = makeFalsifiedHypothesis();
    expect(isFalsifiedHypothesis(entry)).toBe(true);

    expect(isFalsifiedHypothesis(null)).toBe(false);
    expect(isFalsifiedHypothesis(undefined)).toBe(false);
    expect(isFalsifiedHypothesis({})).toBe(false);
    expect(isFalsifiedHypothesis({ id: "test" })).toBe(false);
  });

  it("type guard rejects near-miss objects (bad deathType, date, arrays)", () => {
    const base = makeFalsifiedHypothesis();

    expect(isFalsifiedHypothesis({ ...base, deathType: "invalid" } as never)).toBe(false);
    expect(isFalsifiedHypothesis({ ...base, falsifiedAt: "not-a-date" } as never)).toBe(false);
    expect(isFalsifiedHypothesis({ ...base, successorHypothesisIds: "nope" } as never)).toBe(false);
  });

  it("accepts ISO string dates in isFalsifiedHypothesis", () => {
    const base = makeFalsifiedHypothesis();
    const ok = { ...base, falsifiedAt: "2026-01-05T12:00:00Z" } as never;
    expect(isFalsifiedHypothesis(ok)).toBe(true);
  });
});

// ============================================================================
// Stats Tests
// ============================================================================

describe("graveyard stats", () => {
  it("calculates stats with calculateGraveyardStats()", () => {
    const entries = [
      makeFalsifiedHypothesis({ deathType: "direct_falsification" }),
      makeFalsifiedHypothesis({ id: "GY-TEST-002", deathType: "direct_falsification" }),
      makeFalsifiedHypothesis({ id: "GY-TEST-003", deathType: "mechanism_failure" }),
    ];

    const stats = calculateGraveyardStats(entries);

    expect(stats.totalFalsified).toBe(3);
    expect(stats.byDeathType["direct_falsification"]).toBe(2);
    expect(stats.byDeathType["mechanism_failure"]).toBe(1);
  });

  it("calculates stats for empty array", () => {
    const stats = calculateGraveyardStats([]);

    expect(stats.totalFalsified).toBe(0);
  });
});

// ============================================================================
// Failure Pattern Analysis Tests
// ============================================================================

describe("graveyard failure patterns", () => {
  it("analyzes failure patterns with analyzeFailurePatterns()", () => {
    const entries = [
      makeFalsifiedHypothesis({ deathType: "direct_falsification" }),
      makeFalsifiedHypothesis({ id: "GY-TEST-002", deathType: "direct_falsification" }),
    ];

    const patterns = analyzeFailurePatterns(entries);

    expect(patterns.length).toBeGreaterThan(0);
    // Should have name, frequency, description, and matchingEntryIds
    const firstPattern = patterns[0];
    expect(firstPattern.name).toBeDefined();
    expect(firstPattern.frequency).toBeGreaterThanOrEqual(0);
    expect(firstPattern.description).toBeDefined();
    expect(firstPattern.matchingEntryIds).toBeDefined();
  });

  it("reports productive + unprocessed failures when present", () => {
    const entries = [
      makeFalsifiedHypothesis({
        id: "GY-TEST-001",
        successorHypothesisIds: ["HC-NEW-001-v1"],
        epitaph: "",
      }),
      makeFalsifiedHypothesis({ id: "GY-TEST-002", epitaph: "" }),
      makeFalsifiedHypothesis({ id: "GY-TEST-003", epitaph: "Learned a lot" }),
    ];

    const patterns = analyzeFailurePatterns(entries);
    const names = new Set(patterns.map((p) => p.name));

    expect(names.has("Productive Failures")).toBe(true);
    expect(names.has("Unprocessed Failures")).toBe(true);
  });

  it("omits frequent-death-type pattern when no type dominates", () => {
    const entries: FalsifiedHypothesis[] = [
      makeFalsifiedHypothesis({ id: "GY-TEST-001", deathType: "direct_falsification" }),
      makeFalsifiedHypothesis({ id: "GY-TEST-002", deathType: "mechanism_failure" }),
      makeFalsifiedHypothesis({ id: "GY-TEST-003", deathType: "effect_size_collapse" }),
      makeFalsifiedHypothesis({ id: "GY-TEST-004", deathType: "superseded" }),
      makeFalsifiedHypothesis({ id: "GY-TEST-005", deathType: "scope_reduction" }),
    ];

    const patterns = analyzeFailurePatterns(entries);
    expect(patterns.some((p) => p.name.startsWith("Frequent "))).toBe(false);
  });

  it("returns empty patterns for empty array", () => {
    const patterns = analyzeFailurePatterns([]);
    expect(patterns).toHaveLength(0);
  });
});

// ============================================================================
// Display Helper Tests
// ============================================================================

describe("graveyard display helpers", () => {
  it("formats date with formatFalsificationDate()", () => {
    const date = new Date("2026-01-05T12:00:00Z");
    const formatted = formatFalsificationDate(date);

    expect(formatted).toContain("2026");
  });

  it("formats date from string", () => {
    const formatted = formatFalsificationDate("2026-01-05T12:00:00Z");
    expect(formatted).toContain("2026");
  });

  it("summarizes falsification with summarizeFalsification()", () => {
    const entry = makeFalsifiedHypothesis({
      deathType: "direct_falsification",
      deathSummary: "Test summary",
    });

    const summary = summarizeFalsification(entry);

    expect(summary).toContain("Direct Falsification");
  });
});
