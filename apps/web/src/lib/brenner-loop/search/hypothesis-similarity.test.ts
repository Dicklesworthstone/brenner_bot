/**
 * Hypothesis Similarity Search Tests
 *
 * @see brenner_bot-c2u8 (bead)
 */

import { describe, expect, it } from "vitest";
import type { HypothesisCard } from "../hypothesis";
import {
  cardToIndexed,
  clusterSimilarHypotheses,
  computeSimilarity,
  domainSimilarity,
  embedHypothesis,
  findDuplicates,
  findSimilarHypotheses,
  getSimilarityStats,
  hypothesisToSearchText,
  type IndexedHypothesis,
  searchHypothesesByText,
} from "./hypothesis-similarity";

// ============================================================================
// Test Fixtures
// ============================================================================

const createTestHypothesis = (
  id: string,
  statement: string,
  mechanism: string,
  domain: string[],
  sessionId: string = "RS-TEST",
): IndexedHypothesis => ({
  id,
  sessionId,
  statement,
  mechanism,
  domain,
  confidence: 50,
  version: 1,
});

const socialMediaHypothesis = createTestHypothesis(
  "H1",
  "Social media use causes depression in teenagers through negative social comparison",
  "Curated content triggers upward social comparison, releasing cortisol and reducing dopamine sensitivity",
  ["psychology", "social-media"],
  "RS-001",
);

const airPollutionHypothesis = createTestHypothesis(
  "H2",
  "Air pollution increases cognitive decline through neuroinflammation",
  "PM2.5 particles cross the blood-brain barrier, triggering inflammatory cascades",
  ["epidemiology", "neuroscience"],
  "RS-002",
);

const socialMediaVariant = createTestHypothesis(
  "H3",
  "Instagram use leads to anxiety in adolescents via social comparison",
  "Image-based content creates unrealistic expectations, triggering anxiety responses",
  ["psychology", "social-media"],
  "RS-003",
);

const economicsHypothesis = createTestHypothesis(
  "H4",
  "Higher education increases income through signaling to employers",
  "Degrees signal unobservable ability, leading to higher wage offers",
  ["economics", "labor"],
  "RS-004",
);

const duplicateSocialMedia = createTestHypothesis(
  "H5",
  "Social media usage causes depression in teens through negative social comparison",
  "Curated content triggers upward social comparison, releasing cortisol and reducing dopamine",
  ["psychology", "social-media"],
  "RS-005",
);

// ============================================================================
// hypothesisToSearchText
// ============================================================================

describe("hypothesisToSearchText", () => {
  it("combines statement, mechanism, and domains", () => {
    const text = hypothesisToSearchText(socialMediaHypothesis);

    expect(text).toContain("Social media use causes depression");
    expect(text).toContain("Curated content triggers");
    expect(text).toContain("psychology");
    expect(text).toContain("social-media");
  });

  it("handles missing mechanism", () => {
    const hypothesis = {
      ...socialMediaHypothesis,
      mechanism: "",
    };
    const text = hypothesisToSearchText(hypothesis);

    expect(text).toContain("Social media use causes depression");
    expect(text).not.toContain("Curated content");
  });

  it("handles empty domains", () => {
    const hypothesis = {
      ...socialMediaHypothesis,
      domain: [],
    };
    const text = hypothesisToSearchText(hypothesis);

    expect(text).toContain("Social media use causes depression");
    expect(text).toContain("Curated content triggers");
  });
});

// ============================================================================
// embedHypothesis
// ============================================================================

describe("embedHypothesis", () => {
  it("returns embedding vector", () => {
    const embedding = embedHypothesis(socialMediaHypothesis);

    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBe(384); // EMBEDDING_DIMENSION
  });

  it("caches embedding on hypothesis", () => {
    const hypothesis = { ...socialMediaHypothesis };
    const embedding1 = embedHypothesis(hypothesis);
    const embedding2 = embedHypothesis(hypothesis);

    expect(embedding1).toBe(embedding2); // Same reference
  });

  it("produces normalized vectors", () => {
    const embedding = embedHypothesis(socialMediaHypothesis);
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));

    expect(magnitude).toBeCloseTo(1.0, 5);
  });
});

// ============================================================================
// cardToIndexed
// ============================================================================

describe("cardToIndexed", () => {
  it("converts HypothesisCard to IndexedHypothesis", () => {
    const card: HypothesisCard = {
      id: "HC-RS-001-v1",
      version: 1,
      statement: "Test statement",
      mechanism: "Test mechanism",
      domain: ["psychology"],
      predictionsIfTrue: ["prediction"],
      predictionsIfFalse: ["counter"],
      impossibleIfTrue: ["falsifier"],
      confounds: [],
      assumptions: [],
      confidence: 60,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      sessionId: "RS-001",
    };

    const indexed = cardToIndexed(card);

    expect(indexed.id).toBe("HC-RS-001-v1");
    expect(indexed.sessionId).toBe("RS-001");
    expect(indexed.statement).toBe("Test statement");
    expect(indexed.mechanism).toBe("Test mechanism");
    expect(indexed.confidence).toBe(60);
  });

  it("uses provided sessionId over card sessionId", () => {
    const card: HypothesisCard = {
      id: "HC-RS-001-v1",
      version: 1,
      statement: "Test",
      mechanism: "Test",
      domain: [],
      predictionsIfTrue: [],
      predictionsIfFalse: [],
      impossibleIfTrue: ["x"],
      confounds: [],
      assumptions: [],
      confidence: 50,
      createdAt: new Date(),
      updatedAt: new Date(),
      sessionId: "RS-OLD",
    };

    const indexed = cardToIndexed(card, "RS-NEW");

    expect(indexed.sessionId).toBe("RS-NEW");
  });

  it("handles createdAt as ISO string (from JSON deserialization)", () => {
    // Simulate a HypothesisCard that was deserialized from JSON
    // where Date fields become ISO strings
    const jsonDeserialized = {
      id: "HC-RS-001-v1",
      version: 1,
      statement: "Test statement",
      mechanism: "Test mechanism",
      domain: ["psychology"],
      predictionsIfTrue: ["prediction"],
      predictionsIfFalse: ["counter"],
      impossibleIfTrue: ["falsifier"],
      confounds: [],
      assumptions: [],
      confidence: 60,
      createdAt: "2026-01-01T00:00:00.000Z", // ISO string, not Date
      updatedAt: "2026-01-01T00:00:00.000Z",
      sessionId: "RS-001",
    } as unknown as HypothesisCard;

    const indexed = cardToIndexed(jsonDeserialized);

    expect(indexed.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("handles missing createdAt", () => {
    const card = {
      id: "HC-RS-001-v1",
      version: 1,
      statement: "Test",
      mechanism: "Test",
      domain: [],
      predictionsIfTrue: [],
      predictionsIfFalse: [],
      impossibleIfTrue: ["x"],
      confounds: [],
      assumptions: [],
      confidence: 50,
      updatedAt: new Date(),
      sessionId: "RS-001",
    } as unknown as HypothesisCard;

    const indexed = cardToIndexed(card);

    expect(indexed.createdAt).toBeUndefined();
  });
});

// ============================================================================
// domainSimilarity
// ============================================================================

describe("domainSimilarity", () => {
  it("returns 1.0 for identical domains", () => {
    const sim = domainSimilarity(["psychology", "social-media"], ["psychology", "social-media"]);
    expect(sim).toBe(1.0);
  });

  it("returns 0 for completely different domains", () => {
    const sim = domainSimilarity(["psychology"], ["economics"]);
    expect(sim).toBe(0);
  });

  it("returns partial overlap for shared domains", () => {
    const sim = domainSimilarity(["psychology", "social-media"], ["psychology", "neuroscience"]);
    // Jaccard: 1 / 3 = 0.333
    expect(sim).toBeCloseTo(0.333, 2);
  });

  it("returns 1.0 for both empty", () => {
    const sim = domainSimilarity([], []);
    expect(sim).toBe(1.0);
  });

  it("returns 0.5 when one is empty", () => {
    const sim = domainSimilarity(["psychology"], []);
    expect(sim).toBe(0.5);
  });

  it("is case-insensitive", () => {
    const sim = domainSimilarity(["Psychology"], ["psychology"]);
    expect(sim).toBe(1.0);
  });
});

// ============================================================================
// computeSimilarity
// ============================================================================

describe("computeSimilarity", () => {
  it("computes similarity between hypotheses", () => {
    const result = computeSimilarity(socialMediaHypothesis, socialMediaVariant);

    expect(result.score).toBeGreaterThan(0.4); // Related topics (hash embeddings have lower ceilings)
    expect(result.breakdown.statement).toBeGreaterThan(0);
    expect(result.breakdown.mechanism).toBeGreaterThan(0);
    expect(result.breakdown.domain).toBe(1.0); // Same domains
  });

  it("returns lower scores for unrelated hypotheses", () => {
    const result = computeSimilarity(socialMediaHypothesis, airPollutionHypothesis);

    expect(result.score).toBeLessThan(0.3);
  });

  it("returns high scores for near-duplicates", () => {
    const result = computeSimilarity(socialMediaHypothesis, duplicateSocialMedia);

    expect(result.score).toBeGreaterThan(0.8);
  });

  it("provides meaningful reasons", () => {
    const result = computeSimilarity(socialMediaHypothesis, socialMediaVariant);

    expect(result.reason).toBeTruthy();
    expect(result.reason.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// findSimilarHypotheses
// ============================================================================

describe("findSimilarHypotheses", () => {
  const allHypotheses = [
    socialMediaHypothesis,
    airPollutionHypothesis,
    socialMediaVariant,
    economicsHypothesis,
    duplicateSocialMedia,
  ];

  it("finds similar hypotheses", () => {
    const results = findSimilarHypotheses(socialMediaHypothesis, allHypotheses);

    expect(results.length).toBeGreaterThan(0);
    // Should find the variant and duplicate, not air pollution or economics
    const ids = results.map((r) => r.hypothesis.id);
    expect(ids).toContain("H3"); // variant
    expect(ids).toContain("H5"); // duplicate
  });

  it("excludes query hypothesis by default", () => {
    const results = findSimilarHypotheses(socialMediaHypothesis, allHypotheses);

    const ids = results.map((r) => r.hypothesis.id);
    expect(ids).not.toContain("H1");
  });

  it("respects maxResults", () => {
    const results = findSimilarHypotheses(socialMediaHypothesis, allHypotheses, {
      maxResults: 1,
    });

    expect(results.length).toBe(1);
  });

  it("respects minScore filter", () => {
    const results = findSimilarHypotheses(socialMediaHypothesis, allHypotheses, {
      minScore: 0.9,
    });

    // Only near-duplicates should pass
    expect(results.every((r) => r.score >= 0.9)).toBe(true);
  });

  it("respects sessionFilter", () => {
    const results = findSimilarHypotheses(socialMediaHypothesis, allHypotheses, {
      sessionFilter: ["RS-003"],
    });

    expect(results.every((r) => r.hypothesis.sessionId === "RS-003")).toBe(true);
  });

  it("respects minConfidence filter", () => {
    const hypothesesWithConfidence = [
      { ...socialMediaVariant, confidence: 70 },
      { ...economicsHypothesis, confidence: 30 },
    ];

    const results = findSimilarHypotheses(socialMediaHypothesis, hypothesesWithConfidence, {
      minConfidence: 50,
    });

    expect(results.every((r) => r.hypothesis.confidence >= 50)).toBe(true);
  });

  it("sorts by score descending", () => {
    const results = findSimilarHypotheses(socialMediaHypothesis, allHypotheses);

    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1];
      const curr = results[i];
      expect(prev && curr && prev.score >= curr.score).toBe(true);
    }
  });
});

// ============================================================================
// searchHypothesesByText
// ============================================================================

describe("searchHypothesesByText", () => {
  const allHypotheses = [
    socialMediaHypothesis,
    airPollutionHypothesis,
    socialMediaVariant,
    economicsHypothesis,
  ];

  it("finds hypotheses matching text query", () => {
    const results = searchHypothesesByText("social media depression teenagers", allHypotheses);

    expect(results.length).toBeGreaterThan(0);
    const ids = results.map((r) => r.hypothesis.id);
    expect(ids).toContain("H1"); // social media hypothesis
  });

  it("matches domain-specific queries", () => {
    const results = searchHypothesesByText("air pollution brain inflammation", allHypotheses);

    const ids = results.map((r) => r.hypothesis.id);
    expect(ids).toContain("H2"); // air pollution hypothesis
  });

  it("returns empty for unrelated queries", () => {
    const results = searchHypothesesByText("quantum entanglement black holes", allHypotheses, {
      minScore: 0.5,
    });

    expect(results.length).toBe(0);
  });
});

// ============================================================================
// clusterSimilarHypotheses
// ============================================================================

describe("clusterSimilarHypotheses", () => {
  const allHypotheses = [
    socialMediaHypothesis,
    airPollutionHypothesis,
    socialMediaVariant,
    economicsHypothesis,
    duplicateSocialMedia,
  ];

  it("groups similar hypotheses into clusters", () => {
    const clusters = clusterSimilarHypotheses(allHypotheses, 0.4);

    // Should have at least 2 clusters (social media related vs others)
    expect(clusters.length).toBeGreaterThanOrEqual(2);
  });

  it("puts similar hypotheses in same cluster", () => {
    const clusters = clusterSimilarHypotheses(allHypotheses, 0.4);

    // Find the cluster containing H1 (social media)
    const socialMediaCluster = clusters.find((c) => c.some((h) => h.id === "H1"));

    expect(socialMediaCluster).toBeDefined();
    if (socialMediaCluster) {
      const ids = socialMediaCluster.map((h) => h.id);
      // Should contain H1, H3, and H5 (all social media related)
      expect(ids).toContain("H1");
      // At least one of the variants
      expect(ids.includes("H3") || ids.includes("H5")).toBe(true);
    }
  });

  it("sorts clusters by size", () => {
    const clusters = clusterSimilarHypotheses(allHypotheses, 0.4);

    for (let i = 1; i < clusters.length; i++) {
      const prev = clusters[i - 1];
      const curr = clusters[i];
      expect(prev && curr && prev.length >= curr.length).toBe(true);
    }
  });

  it("handles empty input", () => {
    const clusters = clusterSimilarHypotheses([]);
    expect(clusters).toEqual([]);
  });
});

// ============================================================================
// findDuplicates
// ============================================================================

describe("findDuplicates", () => {
  const allHypotheses = [socialMediaHypothesis, airPollutionHypothesis, duplicateSocialMedia];

  it("finds duplicate hypotheses", () => {
    const duplicates = findDuplicates(allHypotheses, 0.7);

    expect(duplicates.length).toBeGreaterThan(0);
    const pairIds = duplicates[0]?.pair.map((h) => h.id);
    expect(pairIds).toContain("H1");
    expect(pairIds).toContain("H5");
  });

  it("returns empty when no duplicates", () => {
    const uniqueHypotheses = [socialMediaHypothesis, airPollutionHypothesis, economicsHypothesis];

    const duplicates = findDuplicates(uniqueHypotheses, 0.9);
    expect(duplicates.length).toBe(0);
  });

  it("sorts by score descending", () => {
    const duplicates = findDuplicates(allHypotheses, 0.5);

    for (let i = 1; i < duplicates.length; i++) {
      const prev = duplicates[i - 1];
      const curr = duplicates[i];
      expect(prev && curr && prev.score >= curr.score).toBe(true);
    }
  });

  it("does not duplicate pairs", () => {
    const duplicates = findDuplicates(allHypotheses, 0.5);

    const pairKeys = duplicates.map((d) =>
      d.pair
        .map((h) => h.id)
        .sort()
        .join(":"),
    );
    const uniqueKeys = new Set(pairKeys);
    expect(pairKeys.length).toBe(uniqueKeys.size);
  });
});

// ============================================================================
// getSimilarityStats
// ============================================================================

describe("getSimilarityStats", () => {
  const allHypotheses = [
    socialMediaHypothesis,
    airPollutionHypothesis,
    socialMediaVariant,
    economicsHypothesis,
    duplicateSocialMedia,
  ];

  it("returns total hypothesis count", () => {
    const stats = getSimilarityStats(allHypotheses);
    expect(stats.totalHypotheses).toBe(5);
  });

  it("returns cluster count", () => {
    const stats = getSimilarityStats(allHypotheses);
    expect(stats.clusterCount).toBeGreaterThan(0);
    expect(stats.clusterCount).toBeLessThanOrEqual(5);
  });

  it("returns average cluster size", () => {
    const stats = getSimilarityStats(allHypotheses);
    expect(stats.averageClusterSize).toBeGreaterThan(0);
  });

  it("counts potential duplicates", () => {
    const stats = getSimilarityStats(allHypotheses);
    expect(stats.potentialDuplicates).toBeGreaterThanOrEqual(0);
  });

  it("returns domain distribution", () => {
    const stats = getSimilarityStats(allHypotheses);

    expect(stats.domainDistribution["psychology"]).toBe(3);
    expect(stats.domainDistribution["social-media"]).toBe(3);
    expect(stats.domainDistribution["epidemiology"]).toBe(1);
    expect(stats.domainDistribution["economics"]).toBe(1);
  });

  it("handles empty input", () => {
    const stats = getSimilarityStats([]);

    expect(stats.totalHypotheses).toBe(0);
    expect(stats.clusterCount).toBe(0);
    expect(stats.averageClusterSize).toBe(0);
    expect(stats.potentialDuplicates).toBe(0);
    expect(Object.keys(stats.domainDistribution).length).toBe(0);
  });
});

// ============================================================================
// Storage Integration
// ============================================================================

import type { Hypothesis } from "../../schemas/hypothesis";
import { storageToIndexed, storageToIndexedBatch } from "./hypothesis-similarity";

describe("storageToIndexed", () => {
  const storageHypothesis: Hypothesis = {
    id: "H-RS20251230-001",
    statement: "Social media usage affects adolescent mental health through comparison mechanisms",
    mechanism:
      "Users compare themselves to idealized portrayals, leading to negative self-evaluation",
    origin: "proposed",
    category: "mechanistic",
    confidence: "high",
    sessionId: "RS20251230",
    state: "active",
    isInference: false,
    unresolvedCritiqueCount: 0,
    createdAt: "2025-12-30T10:00:00Z",
    updatedAt: "2025-12-30T10:00:00Z",
    tags: ["psychology", "social-media"],
  };

  it("converts storage hypothesis to indexed format", () => {
    const indexed = storageToIndexed(storageHypothesis);

    expect(indexed.id).toBe("H-RS20251230-001");
    expect(indexed.sessionId).toBe("RS20251230");
    expect(indexed.statement).toBe(storageHypothesis.statement);
    expect(indexed.mechanism).toBe(storageHypothesis.mechanism);
    expect(indexed.domain).toEqual(["psychology", "social-media"]);
    expect(indexed.confidence).toBe(90); // high -> 90
    expect(indexed.version).toBe(1);
    expect(indexed.createdAt).toBe("2025-12-30T10:00:00Z");
  });

  it("maps confidence levels correctly", () => {
    const highConfidence = storageToIndexed({ ...storageHypothesis, confidence: "high" });
    expect(highConfidence.confidence).toBe(90);

    const mediumConfidence = storageToIndexed({ ...storageHypothesis, confidence: "medium" });
    expect(mediumConfidence.confidence).toBe(60);

    const lowConfidence = storageToIndexed({ ...storageHypothesis, confidence: "low" });
    expect(lowConfidence.confidence).toBe(30);

    const speculative = storageToIndexed({ ...storageHypothesis, confidence: "speculative" });
    expect(speculative.confidence).toBe(10);
  });

  it("handles missing mechanism", () => {
    const noMechanism: Hypothesis = { ...storageHypothesis, mechanism: undefined };
    const indexed = storageToIndexed(noMechanism);

    expect(indexed.mechanism).toBe("");
  });

  it("handles missing tags", () => {
    const noTags: Hypothesis = { ...storageHypothesis, tags: undefined };
    const indexed = storageToIndexed(noTags);

    expect(indexed.domain).toEqual([]);
  });
});

describe("storageToIndexedBatch", () => {
  const hypotheses: Hypothesis[] = [
    {
      id: "H-RS20251230-001",
      statement: "Test hypothesis 1",
      origin: "proposed",
      category: "mechanistic",
      confidence: "high",
      sessionId: "RS20251230",
      state: "active",
      isInference: false,
      unresolvedCritiqueCount: 0,
      createdAt: "2025-12-30T10:00:00Z",
      updatedAt: "2025-12-30T10:00:00Z",
    },
    {
      id: "H-RS20251230-002",
      statement: "Test hypothesis 2",
      origin: "proposed",
      category: "phenomenological",
      confidence: "medium",
      sessionId: "RS20251230",
      state: "proposed",
      isInference: false,
      unresolvedCritiqueCount: 0,
      createdAt: "2025-12-30T11:00:00Z",
      updatedAt: "2025-12-30T11:00:00Z",
    },
  ];

  it("converts batch of hypotheses", () => {
    const indexed = storageToIndexedBatch(hypotheses);

    expect(indexed.length).toBe(2);
    expect(indexed[0]?.id).toBe("H-RS20251230-001");
    expect(indexed[1]?.id).toBe("H-RS20251230-002");
  });

  it("handles empty batch", () => {
    const indexed = storageToIndexedBatch([]);
    expect(indexed).toEqual([]);
  });
});
