import { describe, expect, it } from "vitest";
import type { HypothesisCard, IdentifiedConfound } from "./hypothesis";
import {
  calculateFalsifiabilityScore,
  calculateSpecificityScore,
  createHypothesisCard,
  evolveHypothesisCard,
  generateConfoundId,
  generateHypothesisCardId,
  interpretConfidence,
  isHypothesisCard,
  isIdentifiedConfound,
  validateConfound,
  validateHypothesisCard,
} from "./hypothesis";

function makeValidHypothesis(
  overrides: Partial<Parameters<typeof createHypothesisCard>[0]> = {},
): HypothesisCard {
  const sessionId = overrides.sessionId ?? "RS20260105";
  const id = overrides.id ?? generateHypothesisCardId(sessionId, 1, 1);

  return createHypothesisCard({
    id,
    statement: "Caffeine consumption increases sleep latency in adults",
    mechanism: "Adenosine receptor antagonism delays sleep onset and reduces homeostatic pressure",
    domain: ["psychology", "sleep"],
    predictionsIfTrue: ["Higher caffeine predicts longer sleep latency"],
    predictionsIfFalse: ["Sleep latency is unchanged across caffeine doses"],
    impossibleIfTrue: ["Sleep latency decreases as caffeine increases"],
    assumptions: ["Sleep latency is measured consistently across participants"],
    confounds: [],
    confidence: 55,
    sessionId,
    ...overrides,
  });
}

describe("hypothesis id generators", () => {
  it("generates hypothesis ids and validates inputs", () => {
    expect(generateHypothesisCardId("RS-2026", 0)).toBe("HC-RS-2026-000-v1");

    expect(() => generateHypothesisCardId(" bad", 0)).toThrow(/Invalid sessionId/);
    expect(() => generateHypothesisCardId("RS-2026", -1)).toThrow(/Invalid sequence/);
    expect(() => generateHypothesisCardId("RS-2026", 0, 0)).toThrow(/Invalid version/);
  });

  it("generates confound ids and validates inputs", () => {
    const hid = generateHypothesisCardId("RS-2026", 2);
    expect(generateConfoundId(hid, 0)).toBe(`${hid}-CF00`);

    expect(() => generateConfoundId("not-a-hypothesis-id", 0)).toThrow(/Invalid hypothesisId/);
    expect(() => generateConfoundId(hid, 100)).toThrow(/Invalid sequence/);
  });
});

describe("confound validation + type guards", () => {
  it("validates confounds with required fields and ranges", () => {
    const confound: IdentifiedConfound = {
      id: "CF-1",
      name: "Selection Bias",
      description: "Participants self-select into exposure",
      likelihood: 0.4,
      domain: "epidemiology",
      addressed: false,
    };

    const ok = validateConfound(confound);
    expect(ok.valid).toBe(true);
    expect(isIdentifiedConfound(confound)).toBe(true);

    const bad = validateConfound({
      ...confound,
      name: "",
      likelihood: 2,
      domain: "",
    });
    expect(bad.valid).toBe(false);
    expect(bad.errors.length).toBeGreaterThan(0);
  });

  it("rejects malformed confound-like objects", () => {
    expect(isIdentifiedConfound({})).toBe(false);
    expect(
      isIdentifiedConfound({ id: "x", name: "n", description: "d", likelihood: NaN, domain: "x" }),
    ).toBe(false);
    expect(
      isIdentifiedConfound({
        id: "x",
        name: "n",
        description: "d",
        likelihood: 0.1,
        domain: "x",
        addressedAt: 123,
      }),
    ).toBe(false);
  });
});

describe("hypothesis validation", () => {
  it("flags missing/invalid id and required fields", () => {
    const base = makeValidHypothesis();

    const missingId = validateHypothesisCard({ ...base, id: "" });
    expect(missingId.valid).toBe(false);
    expect(missingId.errors.some((e) => e.code === "MISSING_REQUIRED" && e.field === "id")).toBe(
      true,
    );

    const invalidId = validateHypothesisCard({ ...base, id: "HC-BAD" });
    expect(invalidId.errors.some((e) => e.code === "INVALID_FORMAT" && e.field === "id")).toBe(
      true,
    );

    const tooShort = validateHypothesisCard({ ...base, statement: "short" });
    expect(tooShort.errors.some((e) => e.code === "TOO_SHORT" && e.field === "statement")).toBe(
      true,
    );

    const tooLongStatement = validateHypothesisCard({ ...base, statement: "x".repeat(1200) });
    expect(
      tooLongStatement.errors.some((e) => e.code === "TOO_LONG" && e.field === "statement"),
    ).toBe(true);

    const tooShortMechanism = validateHypothesisCard({ ...base, mechanism: "too short" });
    expect(
      tooShortMechanism.errors.some((e) => e.code === "TOO_SHORT" && e.field === "mechanism"),
    ).toBe(true);
  });

  it("validates discriminative structure and emits quality warnings", () => {
    const base = makeValidHypothesis({
      predictionsIfFalse: [],
      confounds: [],
      assumptions: [],
      domain: [],
      mechanism: "causes insomnia", // triggers GENERIC_MECHANISM warning
    });

    const result = validateHypothesisCard(base);
    expect(result.valid).toBe(true);

    const warningCodes = new Set(result.warnings.map((w) => w.code));
    expect(warningCodes.has("NO_PREDICTIONS_IF_FALSE")).toBe(true);
    expect(warningCodes.has("LOW_CONFOUND_COUNT")).toBe(true);
    expect(warningCodes.has("NO_DOMAIN")).toBe(true);
    expect(warningCodes.has("NO_ASSUMPTIONS")).toBe(true);
    expect(warningCodes.has("GENERIC_MECHANISM")).toBe(true);
  });

  it("rejects empty arrays and invalid confidence values", () => {
    const base = makeValidHypothesis();

    const noPredictions = validateHypothesisCard({ ...base, predictionsIfTrue: [] });
    expect(noPredictions.valid).toBe(false);
    expect(
      noPredictions.errors.some((e) => e.code === "EMPTY_ARRAY" && e.field === "predictionsIfTrue"),
    ).toBe(true);

    const badEntries = validateHypothesisCard({ ...base, predictionsIfTrue: ["", "   "] });
    expect(badEntries.errors.some((e) => e.code === "INVALID_FORMAT")).toBe(true);

    const noFalsification = validateHypothesisCard({ ...base, impossibleIfTrue: [] });
    expect(noFalsification.valid).toBe(false);
    expect(
      noFalsification.errors.some(
        (e) => e.code === "EMPTY_ARRAY" && e.field === "impossibleIfTrue",
      ),
    ).toBe(true);

    const badType = validateHypothesisCard({ ...base, confidence: "high" as never });
    expect(badType.errors.some((e) => e.code === "INVALID_TYPE" && e.field === "confidence")).toBe(
      true,
    );

    const outOfRange = validateHypothesisCard({ ...base, confidence: 200 });
    expect(
      outOfRange.errors.some((e) => e.code === "INVALID_RANGE" && e.field === "confidence"),
    ).toBe(true);
  });

  it("validates confound structures inside hypothesis", () => {
    const base = makeValidHypothesis();

    const invalidConfound = validateHypothesisCard({
      ...base,
      confounds: [
        {
          id: "",
          name: "",
          description: "",
          likelihood: 2,
          domain: "",
        },
      ] as never,
    });

    expect(invalidConfound.valid).toBe(false);
    expect(invalidConfound.errors.some((e) => e.code === "CONFOUND_INVALID")).toBe(true);
  });
});

describe("type guards + evolution + scoring helpers", () => {
  it("detects valid hypothesis cards and evolves versions safely", () => {
    const card = makeValidHypothesis({ confidence: 90, impossibleIfTrue: ["A", "B"] });
    expect(isHypothesisCard(card)).toBe(true);
    expect(isHypothesisCard({})).toBe(false);

    const evolved = evolveHypothesisCard(
      card,
      { confidence: 75 },
      "Adjusted after evidence",
      "BlueLake",
    );
    expect(evolved.parentVersion).toBe(card.id);
    expect(evolved.version).toBe(card.version + 1);
    expect(evolved.id).not.toBe(card.id);

    expect(() => evolveHypothesisCard({ ...card, id: "BAD" }, {}, "reason")).toThrow(
      /Invalid hypothesis ID format/,
    );
  });

  it("throws when creating invalid hypothesis cards", () => {
    expect(() =>
      createHypothesisCard({
        id: "HC-RS20260105-001-v1",
        statement: "too short",
        mechanism: "too short",
        predictionsIfTrue: [],
        impossibleIfTrue: [],
      }),
    ).toThrow(/Invalid HypothesisCard/);
  });

  it("scores falsifiability/specificity and interprets confidence", () => {
    const low = { ...makeValidHypothesis({ predictionsIfFalse: [] }), impossibleIfTrue: [""] };
    expect(calculateFalsifiabilityScore(low)).toBe(0);

    const high = makeValidHypothesis({
      confidence: 90,
      predictionsIfFalse: ["Alternative observation"],
      impossibleIfTrue: [
        "If caffeine increases, sleep latency must decrease dramatically in a controlled trial with adequate power",
        "If adenosine receptor blockade is absent, the effect should vanish",
      ],
      confounds: [
        {
          id: "CF-1",
          name: "Stress",
          description: "Confound",
          likelihood: 0.2,
          domain: "psychology",
        },
      ],
    });

    expect(calculateFalsifiabilityScore(high)).toBeGreaterThan(40);
    expect(calculateSpecificityScore(high)).toBeGreaterThan(20);

    expect(interpretConfidence(10)).toBe("Very speculative");
    expect(interpretConfidence(30)).toBe("Interesting but untested");
    expect(interpretConfidence(50)).toBe("Reasonable, some support");
    expect(interpretConfidence(70)).toBe("Strong support");
    expect(interpretConfidence(200)).toBe("Near-certain"); // clamped
    expect(interpretConfidence(Number.NaN)).toBe("Unknown confidence");
  });
});
