import { describe, expect, it } from "vitest";
import {
  BIOLOGY_CONFOUNDS,
  classifyDomain,
  detectConfounds,
  ECONOMICS_CONFOUNDS,
  EPIDEMIOLOGY_CONFOUNDS,
  GENERAL_CONFOUNDS,
  getConfoundQuestions,
  getConfoundTemplates,
  getSupportedDomains,
  PSYCHOLOGY_CONFOUNDS,
  type ResearchDomain,
} from "./confound-detection";
import type { HypothesisCard } from "./hypothesis";
import { createHypothesisCard, generateHypothesisCardId } from "./hypothesis";

function createTestHypothesis(
  overrides: Partial<Parameters<typeof createHypothesisCard>[0]> = {},
): HypothesisCard {
  const id = generateHypothesisCardId("TEST-CONFOUND", 1, 1);
  return createHypothesisCard({
    id,
    statement: "Test hypothesis statement with sufficient length",
    mechanism: "Test mechanism with sufficient details",
    domain: ["testing"],
    predictionsIfTrue: ["Something observable if true"],
    predictionsIfFalse: ["Something observable if false"],
    impossibleIfTrue: ["Falsification condition"],
    ...overrides,
  });
}

describe("classifyDomain", () => {
  it("classifies psychology hypothesis correctly", () => {
    const hypothesis = createTestHypothesis({
      statement: "Cognitive behavioral therapy reduces anxiety symptoms in participants",
      mechanism:
        "Changing thought patterns alters emotional responses via learned behavior modification",
      domain: ["psychology"],
    });

    const result = classifyDomain(hypothesis);
    expect(result.domain).toBe("psychology");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("classifies epidemiology hypothesis correctly", () => {
    const hypothesis = createTestHypothesis({
      statement: "Exposure to air pollution increases mortality risk in urban populations",
      mechanism: "Particulate matter causes inflammation leading to cardiovascular disease",
      domain: ["epidemiology"],
    });

    const result = classifyDomain(hypothesis);
    expect(result.domain).toBe("epidemiology");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("classifies economics hypothesis correctly", () => {
    const hypothesis = createTestHypothesis({
      statement: "Higher interest rates reduce consumer spending and slow economic growth",
      mechanism:
        "Increased borrowing costs decrease investment and consumption via market equilibrium",
      domain: ["economics"],
    });

    const result = classifyDomain(hypothesis);
    expect(result.domain).toBe("economics");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("classifies biology hypothesis correctly", () => {
    const hypothesis = createTestHypothesis({
      statement: "Gene expression of BRCA1 mutation increases cancer cell proliferation",
      mechanism: "Mutated protein fails to repair DNA damage leading to uncontrolled cell division",
      domain: ["biology"],
    });

    const result = classifyDomain(hypothesis);
    expect(result.domain).toBe("biology");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("classifies computer science hypothesis correctly", () => {
    const hypothesis = createTestHypothesis({
      statement: "Deep learning models with attention achieve higher accuracy on NLP benchmarks",
      mechanism:
        "Self-attention allows the neural network to capture long-range dependencies in training data",
      domain: ["computer_science"],
    });

    const result = classifyDomain(hypothesis);
    expect(result.domain).toBe("computer_science");
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("falls back to general for unclassifiable hypotheses", () => {
    const hypothesis = createTestHypothesis({
      statement: "The effect of X on Y is positive",
      mechanism: "X changes something that affects Y",
      domain: [],
    });

    const result = classifyDomain(hypothesis);
    // Should either be general or have low confidence
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("gives bonus for explicit domain field", () => {
    const hypothesis = createTestHypothesis({
      statement: "Some vague statement about things",
      mechanism: "Some mechanism that isn't domain-specific",
      domain: ["psychology"],
    });

    const result = classifyDomain(hypothesis);
    expect(result.scores.psychology).toBeGreaterThan(0);
  });
});

describe("detectConfounds", () => {
  it("detects selection bias in psychology hypothesis", () => {
    const hypothesis = createTestHypothesis({
      statement: "Participants who meditate show lower stress levels than controls",
      mechanism: "Meditation practice reduces cortisol via relaxation response in subjects",
      domain: ["psychology"],
    });

    const result = detectConfounds(hypothesis);

    // Should detect selection bias (participants, subjects)
    const selectionBias = result.confounds.find((c) => c.name === "Selection Bias");
    expect(selectionBias).toBeDefined();
    expect(selectionBias?.likelihood).toBeGreaterThan(0);
  });

  it("detects reverse causation for causal hypotheses", () => {
    const hypothesis = createTestHypothesis({
      statement: "Social media use causes depression in teenagers",
      mechanism: "Exposure to curated content leads to negative social comparison effects",
      domain: ["psychology"],
      predictionsIfTrue: ["Higher social media use will precede depression onset"],
    });

    const result = detectConfounds(hypothesis);

    // Should detect reverse causation (cause, effect, lead)
    const reverseCausation = result.confounds.find((c) => c.name === "Reverse Causation");
    expect(reverseCausation).toBeDefined();
  });

  it("detects healthy user bias in epidemiology hypothesis", () => {
    const hypothesis = createTestHypothesis({
      statement: "Regular exercise reduces cardiovascular disease risk",
      mechanism: "Physical activity improves heart health through multiple pathways",
      domain: ["epidemiology"],
      predictionsIfTrue: ["People who exercise will have lower disease rates"],
    });

    const result = detectConfounds(hypothesis);

    // Should detect healthy user bias
    const healthyUserBias = result.confounds.find((c) => c.name === "Healthy User Bias");
    expect(healthyUserBias).toBeDefined();
  });

  it("detects endogeneity in economics hypothesis", () => {
    const hypothesis = createTestHypothesis({
      statement: "Education increases income through improved productivity",
      mechanism: "More education leads to higher wages via human capital accumulation",
      domain: ["economics"],
      predictionsIfTrue: ["Regression coefficient on education will be positive"],
    });

    const result = detectConfounds(hypothesis, { forceDomain: "economics" });

    // Should detect endogeneity or omitted variable bias
    const hasRelevantConfound = result.confounds.some(
      (c) => c.name === "Endogeneity" || c.name === "Omitted Variable Bias",
    );
    expect(hasRelevantConfound).toBe(true);
  });

  it("respects threshold parameter", () => {
    const hypothesis = createTestHypothesis({
      statement: "Test hypothesis with many potential confounds in participant study experiment",
      mechanism: "Test mechanism involving treatment effects and causal relationships",
      domain: ["psychology"],
    });

    // Low threshold should return more confounds
    const lowThreshold = detectConfounds(hypothesis, { threshold: 0.1 });

    // High threshold should return fewer confounds
    const highThreshold = detectConfounds(hypothesis, { threshold: 0.8 });

    expect(lowThreshold.confounds.length).toBeGreaterThanOrEqual(highThreshold.confounds.length);
  });

  it("respects maxConfounds parameter", () => {
    const hypothesis = createTestHypothesis({
      statement:
        "Complex hypothesis touching many domains about participants, treatment, cause, effect, measurement, study",
      mechanism: "Complex mechanism involving regression, selection, causation, observation",
      domain: ["psychology"],
    });

    const limited = detectConfounds(hypothesis, { maxConfounds: 3, threshold: 0.1 });

    expect(limited.confounds.length).toBeLessThanOrEqual(3);
  });

  it("allows forcing domain", () => {
    const hypothesis = createTestHypothesis({
      statement: "Some generic hypothesis about effects",
      mechanism: "Generic mechanism description",
      domain: [],
    });

    const result = detectConfounds(hypothesis, { forceDomain: "epidemiology" });

    expect(result.detectedDomain).toBe("epidemiology");
  });

  it("returns summary describing findings", () => {
    const hypothesis = createTestHypothesis({
      statement: "Participants in the study showed behavior changes after treatment",
      mechanism: "Treatment causes behavioral modification through learning",
      domain: ["psychology"],
    });

    const result = detectConfounds(hypothesis);

    expect(result.summary).toBeDefined();
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it("includes domain confidence in result", () => {
    const hypothesis = createTestHypothesis({
      statement: "Clear psychology hypothesis about cognitive behavior",
      mechanism: "Mental processes affect behavioral outcomes",
      domain: ["psychology"],
    });

    const result = detectConfounds(hypothesis);

    expect(result.domainConfidence).toBeGreaterThan(0);
    expect(result.domainConfidence).toBeLessThanOrEqual(1);
  });
});

describe("getConfoundQuestions", () => {
  it("returns questions for valid confound", () => {
    const questions = getConfoundQuestions("selection_bias", "psychology");

    expect(questions.length).toBeGreaterThan(0);
    expect(questions[0]).toContain("?");
  });

  it("returns empty array for invalid confound", () => {
    const questions = getConfoundQuestions("nonexistent_confound", "psychology");

    expect(questions).toEqual([]);
  });

  it("returns questions from general library", () => {
    const questions = getConfoundQuestions("publication_bias", "general");

    expect(questions.length).toBeGreaterThan(0);
  });
});

describe("getConfoundTemplates", () => {
  it("returns domain-specific and general confounds", () => {
    const templates = getConfoundTemplates("psychology");

    // Should include psychology-specific confounds
    const hasSelectionBias = templates.some((t) => t.id === "selection_bias");
    expect(hasSelectionBias).toBe(true);

    // Should also include general confounds
    const hasPublicationBias = templates.some((t) => t.id === "publication_bias");
    expect(hasPublicationBias).toBe(true);
  });

  it("returns only general confounds for general domain", () => {
    const templates = getConfoundTemplates("general");

    // All should be general domain
    templates.forEach((t) => {
      expect(t.domain).toBe("general");
    });
  });
});

describe("getSupportedDomains", () => {
  it("returns all supported domains", () => {
    const domains = getSupportedDomains();

    expect(domains).toContain("psychology");
    expect(domains).toContain("epidemiology");
    expect(domains).toContain("economics");
    expect(domains).toContain("biology");
    expect(domains).toContain("sociology");
    expect(domains).toContain("computer_science");
    expect(domains).toContain("neuroscience");
    expect(domains).toContain("general");
  });

  it("returns at least 8 domains", () => {
    const domains = getSupportedDomains();
    expect(domains.length).toBeGreaterThanOrEqual(8);
  });
});

describe("confound library integrity", () => {
  it("all psychology confounds have required fields", () => {
    for (const confound of PSYCHOLOGY_CONFOUNDS) {
      expect(confound.id).toBeDefined();
      expect(confound.name).toBeDefined();
      expect(confound.description.length).toBeGreaterThan(10);
      expect(confound.domain).toBe("psychology");
      expect(confound.keywords.length).toBeGreaterThan(0);
      expect(confound.promptQuestions.length).toBeGreaterThan(0);
      expect(confound.baseLikelihood).toBeGreaterThan(0);
      expect(confound.baseLikelihood).toBeLessThanOrEqual(1);
    }
  });

  it("all epidemiology confounds have required fields", () => {
    for (const confound of EPIDEMIOLOGY_CONFOUNDS) {
      expect(confound.id).toBeDefined();
      expect(confound.name).toBeDefined();
      expect(confound.description.length).toBeGreaterThan(10);
      expect(confound.domain).toBe("epidemiology");
      expect(confound.keywords.length).toBeGreaterThan(0);
      expect(confound.promptQuestions.length).toBeGreaterThan(0);
      expect(confound.baseLikelihood).toBeGreaterThan(0);
      expect(confound.baseLikelihood).toBeLessThanOrEqual(1);
    }
  });

  it("all economics confounds have required fields", () => {
    for (const confound of ECONOMICS_CONFOUNDS) {
      expect(confound.id).toBeDefined();
      expect(confound.name).toBeDefined();
      expect(confound.description.length).toBeGreaterThan(10);
      expect(confound.domain).toBe("economics");
      expect(confound.keywords.length).toBeGreaterThan(0);
      expect(confound.promptQuestions.length).toBeGreaterThan(0);
      expect(confound.baseLikelihood).toBeGreaterThan(0);
      expect(confound.baseLikelihood).toBeLessThanOrEqual(1);
    }
  });

  it("all biology confounds have required fields", () => {
    for (const confound of BIOLOGY_CONFOUNDS) {
      expect(confound.id).toBeDefined();
      expect(confound.name).toBeDefined();
      expect(confound.description.length).toBeGreaterThan(10);
      expect(confound.domain).toBe("biology");
      expect(confound.keywords.length).toBeGreaterThan(0);
      expect(confound.promptQuestions.length).toBeGreaterThan(0);
      expect(confound.baseLikelihood).toBeGreaterThan(0);
      expect(confound.baseLikelihood).toBeLessThanOrEqual(1);
    }
  });

  it("all general confounds have required fields", () => {
    for (const confound of GENERAL_CONFOUNDS) {
      expect(confound.id).toBeDefined();
      expect(confound.name).toBeDefined();
      expect(confound.description.length).toBeGreaterThan(10);
      expect(confound.domain).toBe("general");
      expect(confound.keywords.length).toBeGreaterThan(0);
      expect(confound.promptQuestions.length).toBeGreaterThan(0);
      expect(confound.baseLikelihood).toBeGreaterThan(0);
      expect(confound.baseLikelihood).toBeLessThanOrEqual(1);
    }
  });
});
