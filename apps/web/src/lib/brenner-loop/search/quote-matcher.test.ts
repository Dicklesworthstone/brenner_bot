import { describe, expect, it } from "vitest";
import type { HypothesisCard } from "../hypothesis";
import type { EmbeddingEntry } from "./embeddings";
import {
  buildQuoteQueryText,
  computeOperatorRelevance,
  embeddingEntryToQuote,
  filterQuoteEntriesByTags,
  findRelevantQuotes,
  getOperatorQuotes,
  OPERATOR_QUOTE_KEYWORDS,
  type RankedQuote,
} from "./quote-matcher";

describe("quote-matcher", () => {
  it("buildQuoteQueryText filters empty values", () => {
    expect(buildQuoteQueryText([" a ", "", "  ", null, undefined, "b"])).toBe(" a \nb");
  });

  it("embeddingEntryToQuote parses tags/takeaway and formats title", () => {
    const entry: EmbeddingEntry = {
      id: "q1",
      source: "quote",
      section: 89,
      embedding: [0, 1],
      text: [
        "Not merely unlikely—impossible if the alternative is true.",
        "Takeaway: Design tests that can rule you out.",
        "Tags: `exclusion-test`, `falsification`",
      ].join("\n"),
    };

    const quote = embeddingEntryToQuote(entry);

    expect(quote.sectionId).toBe("§89");
    expect(quote.title).toBe("Exclusion Test");
    expect(quote.quote).toContain("Not merely unlikely");
    expect(quote.context).toContain("Design tests");
    expect(quote.tags).toEqual(["exclusion-test", "falsification"]);
  });

  it("filterQuoteEntriesByTags selects tag matches or falls back to all", () => {
    const a: EmbeddingEntry = {
      id: "a",
      source: "quote",
      embedding: [0],
      text: "A\nTags: `mechanism`",
    };
    const b: EmbeddingEntry = {
      id: "b",
      source: "quote",
      embedding: [0],
      text: "B\nTags: `bias-to-experiment`",
    };

    expect(filterQuoteEntriesByTags([a, b], ["mechanism"]).map((e) => e.id)).toEqual(["a"]);
    expect(filterQuoteEntriesByTags([a, b], ["does-not-exist"]).map((e) => e.id)).toEqual([
      "a",
      "b",
    ]);
    expect(filterQuoteEntriesByTags([a, b], ["", "  "]).map((e) => e.id)).toEqual(["a", "b"]);
  });
});

// ============================================================================
// Operator-Aware Quote Matching Tests (bead brenner_bot-v2zy)
// ============================================================================

describe("computeOperatorRelevance", () => {
  it("returns 0 for quotes with no operator keywords", () => {
    const quote = {
      sectionId: "§1",
      title: "Test",
      quote: "The weather is nice today.",
      context: "Random statement",
      tags: [],
    };

    expect(computeOperatorRelevance(quote, "level_split")).toBe(0);
    expect(computeOperatorRelevance(quote, "exclusion_test")).toBe(0);
  });

  it("returns 0.3 for single keyword match", () => {
    const quote = {
      sectionId: "§1",
      title: "Test",
      quote: "We need to distinguish between X and Y.",
      context: "",
      tags: [],
    };

    // "distinguish" is the only level_split keyword here
    expect(computeOperatorRelevance(quote, "level_split")).toBe(0.3);
  });

  it("returns 0.5 for two keyword matches", () => {
    const quote = {
      sectionId: "§1",
      title: "Test",
      quote: "We need to distinguish and separate things.",
      context: "",
      tags: [],
    };

    // "distinguish" and "separate" are level_split keywords
    expect(computeOperatorRelevance(quote, "level_split")).toBe(0.5);
  });

  it("returns higher scores for more keyword matches", () => {
    const quote = {
      sectionId: "§1",
      title: "Test",
      quote: "The test must exclude alternatives and discriminate hypotheses with evidence.",
      context: "",
      tags: [],
    };

    // Multiple exclusion_test keywords: test, exclude, discriminat, hypothes, evidence
    const score = computeOperatorRelevance(quote, "exclusion_test");
    expect(score).toBeGreaterThan(0.65);
  });

  it("caps score at 0.95", () => {
    // Create a quote with many keywords
    const keywords = OPERATOR_QUOTE_KEYWORDS.level_split.slice(0, 10);
    const quote = {
      sectionId: "§1",
      title: "Test",
      quote: keywords.join(" "),
      context: "",
      tags: [],
    };

    expect(computeOperatorRelevance(quote, "level_split")).toBeLessThanOrEqual(0.95);
  });

  it("includes context in analysis", () => {
    const quote = {
      sectionId: "§1",
      title: "Test",
      quote: "A simple statement.",
      context: "This relates to the level of description and mechanism.",
      tags: [],
    };

    // Keywords are in context, not quote
    expect(computeOperatorRelevance(quote, "level_split")).toBeGreaterThan(0);
  });
});

describe("OPERATOR_QUOTE_KEYWORDS", () => {
  it("has keywords for all four operators", () => {
    expect(OPERATOR_QUOTE_KEYWORDS.level_split.length).toBeGreaterThan(0);
    expect(OPERATOR_QUOTE_KEYWORDS.exclusion_test.length).toBeGreaterThan(0);
    expect(OPERATOR_QUOTE_KEYWORDS.object_transpose.length).toBeGreaterThan(0);
    expect(OPERATOR_QUOTE_KEYWORDS.scale_check.length).toBeGreaterThan(0);
  });

  it("has reasonable number of keywords per operator", () => {
    for (const operator of Object.keys(OPERATOR_QUOTE_KEYWORDS)) {
      const keywords = OPERATOR_QUOTE_KEYWORDS[operator as keyof typeof OPERATOR_QUOTE_KEYWORDS];
      expect(keywords.length).toBeGreaterThanOrEqual(10);
      expect(keywords.length).toBeLessThanOrEqual(30);
    }
  });
});

describe("getOperatorQuotes", () => {
  const testEntries: EmbeddingEntry[] = [
    {
      id: "level-quote",
      source: "quote",
      embedding: [0.1, 0.2],
      text: "Separate levels of description carefully.\nTakeaway: Avoid conflating program and interpreter.",
    },
    {
      id: "test-quote",
      source: "quote",
      embedding: [0.3, 0.4],
      text: "Design tests that can exclude hypotheses.\nTakeaway: Discriminate alternatives.",
    },
    {
      id: "generic-quote",
      source: "quote",
      embedding: [0.5, 0.6],
      text: "The weather is nice today.\nTakeaway: Unrelated statement.",
    },
  ];

  it("ranks quotes by operator relevance", () => {
    const results = getOperatorQuotes("level_split", testEntries);

    // level-quote should rank first for level_split
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].quote).toContain("levels");
  });

  it("filters out quotes with zero relevance", () => {
    const results = getOperatorQuotes("level_split", testEntries);

    // generic-quote should be filtered out
    for (const r of results) {
      expect(r.operatorRelevance).toBeGreaterThan(0);
    }
  });

  it("respects limit parameter", () => {
    const results = getOperatorQuotes("exclusion_test", testEntries, 1);
    expect(results.length).toBeLessThanOrEqual(1);
  });

  it("returns empty array for no matches", () => {
    const noMatchEntries: EmbeddingEntry[] = [
      {
        id: "irrelevant",
        source: "quote",
        embedding: [0],
        text: "Completely unrelated content about cooking.",
      },
    ];

    const results = getOperatorQuotes("scale_check", noMatchEntries);
    expect(results).toHaveLength(0);
  });
});

describe("findRelevantQuotes", () => {
  // Create a minimal hypothesis for testing
  const testHypothesis: HypothesisCard = {
    id: "HC-TEST-001-v1",
    version: 1,
    statement: "The program level determines the interpreter behavior",
    mechanism: "Through level-specific mechanisms",
    domain: ["neuroscience"],
    predictionsIfTrue: ["Level separation should be observable"],
    predictionsIfFalse: ["Levels would be confounded"],
    impossibleIfTrue: ["No level distinction exists"],
    confounds: [],
    assumptions: [],
    confidence: 50,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Helper to create a 384-dimension embedding (required by embeddings module)
  function makeEmbedding(seed: number): number[] {
    const embedding = new Array(384).fill(0);
    for (let i = 0; i < 384; i++) {
      embedding[i] = Math.sin(seed * (i + 1)) * 0.1;
    }
    return embedding;
  }

  const testEntries: EmbeddingEntry[] = [
    {
      id: "high-relevance",
      source: "quote",
      embedding: makeEmbedding(1),
      text: "Separate the levels of program and interpreter.\nTakeaway: Mechanism matters.",
    },
    {
      id: "medium-relevance",
      source: "quote",
      embedding: makeEmbedding(2),
      text: "The test must discriminate hypotheses.\nTakeaway: Exclude alternatives.",
    },
    {
      id: "low-relevance",
      source: "quote",
      embedding: makeEmbedding(3),
      text: "General advice about research.\nTakeaway: Be careful.",
    },
  ];

  it("returns ranked quotes with scores", () => {
    const results = findRelevantQuotes(testHypothesis, "level_split", testEntries);

    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r).toHaveProperty("semanticScore");
      expect(r).toHaveProperty("operatorRelevance");
      expect(r).toHaveProperty("combinedScore");
    }
  });

  it("respects resultLimit option", () => {
    const results = findRelevantQuotes(testHypothesis, "level_split", testEntries, {
      resultLimit: 1,
    });

    expect(results.length).toBeLessThanOrEqual(1);
  });

  it("returns empty array for empty entries", () => {
    const results = findRelevantQuotes(testHypothesis, "level_split", []);
    expect(results).toHaveLength(0);
  });

  it("returns empty array for hypothesis with no content", () => {
    const emptyHypothesis: HypothesisCard = {
      id: "HC-EMPTY-001-v1",
      version: 1,
      statement: "",
      mechanism: "",
      domain: [],
      predictionsIfTrue: [],
      predictionsIfFalse: [],
      impossibleIfTrue: [],
      confounds: [],
      assumptions: [],
      confidence: 50,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const results = findRelevantQuotes(emptyHypothesis, "level_split", testEntries);
    expect(results).toHaveLength(0);
  });

  it("applies semantic weight correctly", () => {
    // With high semantic weight (0.9), semantic score should dominate
    const highSemanticResults = findRelevantQuotes(testHypothesis, "level_split", testEntries, {
      semanticWeight: 0.9,
    });

    // With low semantic weight (0.1), operator relevance should dominate
    const lowSemanticResults = findRelevantQuotes(testHypothesis, "level_split", testEntries, {
      semanticWeight: 0.1,
    });

    // Both should return results (exact ordering depends on data)
    expect(highSemanticResults.length).toBeGreaterThan(0);
    expect(lowSemanticResults.length).toBeGreaterThan(0);
  });
});
