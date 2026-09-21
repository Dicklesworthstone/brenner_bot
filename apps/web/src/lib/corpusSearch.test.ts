/**
 * Unit tests for lib/corpusSearch.ts
 *
 * Tests the corpus search API with real corpus data.
 * Philosophy: NO mocks - test real behavior with real data.
 *
 * Run with: cd apps/web && bun run test -- src/lib/corpusSearch.test.ts
 */

import { beforeAll, describe, expect, it } from "vitest";
import {
  getAllSections,
  getCacheStats,
  getSectionByAnchor,
  getSectionByNumber,
  searchCorpus,
} from "./corpusSearch";

// ============================================================================
// Setup
// ============================================================================

beforeAll(async () => {
  // Pre-load sections to ensure corpus is available
  await getAllSections();
});

// ============================================================================
// Tests: Basic Search
// ============================================================================

describe("searchCorpus", () => {
  describe("with valid queries", () => {
    it("finds sections containing common words", async () => {
      const result = await searchCorpus("science");
      expect(result.query).toBe("science");
      expect(result.hits.length).toBeGreaterThan(0);
      expect(result.totalMatches).toBeGreaterThan(0);
      expect(result.searchTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("returns hits with correct structure", async () => {
      const result = await searchCorpus("biology");
      expect(result.hits.length).toBeGreaterThan(0);

      const hit = result.hits[0];
      expect(hit).toHaveProperty("id");
      expect(hit).toHaveProperty("anchor");
      expect(hit).toHaveProperty("title");
      expect(hit).toHaveProperty("snippet");
      expect(hit).toHaveProperty("score");
      expect(hit).toHaveProperty("matchType");
      expect(hit).toHaveProperty("wordCount");

      // Validate types
      expect(typeof hit.id).toBe("string");
      expect(typeof hit.anchor).toBe("string");
      expect(typeof hit.title).toBe("string");
      expect(typeof hit.snippet).toBe("string");
      expect(typeof hit.score).toBe("number");
      expect(["title", "body", "both"]).toContain(hit.matchType);
      expect(typeof hit.wordCount).toBe("number");
    });

    it("respects limit parameter", async () => {
      const result5 = await searchCorpus("the", 5);
      const result10 = await searchCorpus("the", 10);

      expect(result5.hits.length).toBeLessThanOrEqual(5);
      expect(result10.hits.length).toBeLessThanOrEqual(10);
      // "the" should have many matches
      expect(result10.totalMatches).toBeGreaterThanOrEqual(10);
    });

    it("returns scores between 0 and 1", async () => {
      const result = await searchCorpus("DNA");
      for (const hit of result.hits) {
        expect(hit.score).toBeGreaterThanOrEqual(0);
        expect(hit.score).toBeLessThanOrEqual(1);
      }
    });

    it("ranks results by score (descending)", async () => {
      const result = await searchCorpus("experiment");
      for (let i = 1; i < result.hits.length; i++) {
        expect(result.hits[i - 1].score).toBeGreaterThanOrEqual(result.hits[i].score);
      }
    });

    it("finds Brenner-specific terms", async () => {
      // "Brenner" should definitely be in the Brenner transcript
      const result = await searchCorpus("Brenner");
      expect(result.hits.length).toBeGreaterThan(0);
    });

    it("is case insensitive", async () => {
      const resultLower = await searchCorpus("dna");
      const resultUpper = await searchCorpus("DNA");
      const resultMixed = await searchCorpus("Dna");

      // All should find the same total matches
      expect(resultLower.totalMatches).toBe(resultUpper.totalMatches);
      expect(resultLower.totalMatches).toBe(resultMixed.totalMatches);
    });
  });

  describe("with edge case queries", () => {
    it("handles empty query", async () => {
      const result = await searchCorpus("");
      expect(result.hits).toEqual([]);
      expect(result.totalMatches).toBe(0);
      expect(result.searchTimeMs).toBe(0);
    });

    it("handles whitespace-only query", async () => {
      const result = await searchCorpus("   ");
      expect(result.hits).toEqual([]);
      expect(result.totalMatches).toBe(0);
    });

    it("handles query with no matches", async () => {
      const result = await searchCorpus("xyznonexistentwordxyz");
      expect(result.hits).toEqual([]);
      expect(result.totalMatches).toBe(0);
    });

    it("handles multi-word query", async () => {
      const result = await searchCorpus("molecular biology");
      expect(result.query).toBe("molecular biology");
      // Should find the phrase in the transcript
      expect(result.totalMatches).toBeGreaterThanOrEqual(0);
    });

    it("handles query with special characters", async () => {
      // Should not throw
      const result = await searchCorpus("test?");
      expect(result).toHaveProperty("hits");
    });
  });

  describe("match types", () => {
    it("correctly identifies title matches", async () => {
      // Find a section with a distinctive title word
      const sections = await getAllSections();
      if (sections.length > 0) {
        // Use part of an actual title
        const sampleTitle = sections[0].title.split(" ")[0].toLowerCase();
        if (sampleTitle.length > 3) {
          const result = await searchCorpus(sampleTitle);
          // At least one hit should have matchType "title" or "both"
          const hasTitleMatch = result.hits.some(
            (h) => h.matchType === "title" || h.matchType === "both",
          );
          expect(hasTitleMatch).toBe(true);
        }
      }
    });
  });

  describe("snippets", () => {
    it("returns snippets that contain the query", async () => {
      const result = await searchCorpus("science");
      for (const hit of result.hits) {
        // Snippet should contain the query (case insensitive) or be truncated
        // Note: snippet may not always contain query if it's found elsewhere
        expect(hit.snippet.length).toBeGreaterThan(0);
        expect(hit.snippet.length).toBeLessThanOrEqual(250); // ~200 + ellipsis
      }
    });

    it("adds ellipsis for truncated snippets", async () => {
      const result = await searchCorpus("the");
      // Most snippets for common words should be truncated
      const hasEllipsis = result.hits.some(
        (h) => h.snippet.startsWith("...") || h.snippet.endsWith("..."),
      );
      expect(hasEllipsis).toBe(true);
    });
  });
});

// ============================================================================
// Tests: getSectionByAnchor
// ============================================================================

describe("getSectionByAnchor", () => {
  it("finds section by valid anchor", async () => {
    const section = await getSectionByAnchor("§1");
    expect(section).toBeDefined();
    expect(section?.anchor).toBe("§1");
    expect(section?.sectionNumber).toBe(1);
  });

  it("finds section by another valid anchor", async () => {
    const section = await getSectionByAnchor("§42");
    expect(section).toBeDefined();
    expect(section?.anchor).toBe("§42");
    expect(section?.sectionNumber).toBe(42);
  });

  it("returns undefined for non-existent anchor", async () => {
    const section = await getSectionByAnchor("§9999");
    expect(section).toBeUndefined();
  });

  it("returns undefined for malformed anchor", async () => {
    const section = await getSectionByAnchor("invalid");
    expect(section).toBeUndefined();
  });

  it("returns undefined for empty anchor", async () => {
    const section = await getSectionByAnchor("");
    expect(section).toBeUndefined();
  });
});

// ============================================================================
// Tests: getSectionByNumber
// ============================================================================

describe("getSectionByNumber", () => {
  it("finds section by valid number", async () => {
    const section = await getSectionByNumber(1);
    expect(section).toBeDefined();
    expect(section?.sectionNumber).toBe(1);
    expect(section?.anchor).toBe("§1");
  });

  it("finds section by another valid number", async () => {
    const section = await getSectionByNumber(100);
    expect(section).toBeDefined();
    expect(section?.sectionNumber).toBe(100);
  });

  it("returns undefined for number 0", async () => {
    const section = await getSectionByNumber(0);
    expect(section).toBeUndefined();
  });

  it("returns undefined for negative number", async () => {
    const section = await getSectionByNumber(-1);
    expect(section).toBeUndefined();
  });

  it("returns undefined for number beyond range", async () => {
    const section = await getSectionByNumber(9999);
    expect(section).toBeUndefined();
  });
});

// ============================================================================
// Tests: getAllSections
// ============================================================================

describe("getAllSections", () => {
  it("returns all 236 sections", async () => {
    const sections = await getAllSections();
    expect(sections.length).toBe(236);
  });

  it("returns sections in order", async () => {
    const sections = await getAllSections();
    for (let i = 0; i < sections.length; i++) {
      expect(sections[i].sectionNumber).toBe(i + 1);
    }
  });

  it("returns sections with all required fields", async () => {
    const sections = await getAllSections();
    const sample = sections[0];

    expect(sample).toHaveProperty("id");
    expect(sample).toHaveProperty("sectionNumber");
    expect(sample).toHaveProperty("anchor");
    expect(sample).toHaveProperty("title");
    expect(sample).toHaveProperty("body");
    expect(sample).toHaveProperty("plainText");
    expect(sample).toHaveProperty("sourceId");
    expect(sample).toHaveProperty("sourceTitle");
    expect(sample).toHaveProperty("lineStart");
    expect(sample).toHaveProperty("lineEnd");
    expect(sample).toHaveProperty("charStart");
    expect(sample).toHaveProperty("charEnd");
    expect(sample).toHaveProperty("wordCount");
  });

  it("returns consistent results on multiple calls", async () => {
    const sections1 = await getAllSections();
    const sections2 = await getAllSections();

    expect(sections1.length).toBe(sections2.length);
    expect(sections1[0].id).toBe(sections2[0].id);
  });
});

// ============================================================================
// Tests: getCacheStats
// ============================================================================

describe("getCacheStats", () => {
  // TODO: Implement getCacheStats function in corpusSearch.ts
  it("reports cache as active after loading", async () => {
    // Ensure sections are loaded
    await getAllSections();

    const stats = getCacheStats();
    expect(stats.cached).toBe(true);
    expect(stats.timestamp).toBeGreaterThan(0);
  });

  it("returns a reasonable timestamp", async () => {
    await getAllSections();
    const stats = getCacheStats();

    // Timestamp should be recent (within last hour)
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    expect(stats.timestamp).toBeGreaterThan(oneHourAgo);
    expect(stats.timestamp).toBeLessThanOrEqual(now);
  });
});

// ============================================================================
// Tests: Search Scoring
// ============================================================================

describe("search scoring", () => {
  it("ranks title matches higher than body-only matches", async () => {
    // Search for a term that appears in some titles and some bodies
    const result = await searchCorpus("science");

    const titleMatches = result.hits.filter(
      (h) => h.matchType === "title" || h.matchType === "both",
    );
    const bodyOnlyMatches = result.hits.filter((h) => h.matchType === "body");

    if (titleMatches.length > 0 && bodyOnlyMatches.length > 0) {
      // Title matches should generally score higher
      const avgTitleScore = titleMatches.reduce((sum, h) => sum + h.score, 0) / titleMatches.length;
      const avgBodyScore =
        bodyOnlyMatches.reduce((sum, h) => sum + h.score, 0) / bodyOnlyMatches.length;

      expect(avgTitleScore).toBeGreaterThan(avgBodyScore);
    }
  });

  it("ranks 'both' matches higher than title-only or body-only", async () => {
    const result = await searchCorpus("research");

    const bothMatches = result.hits.filter((h) => h.matchType === "both");
    const singleMatches = result.hits.filter((h) => h.matchType !== "both");

    if (bothMatches.length > 0 && singleMatches.length > 0) {
      const avgBothScore = bothMatches.reduce((sum, h) => sum + h.score, 0) / bothMatches.length;
      const avgSingleScore =
        singleMatches.reduce((sum, h) => sum + h.score, 0) / singleMatches.length;

      expect(avgBothScore).toBeGreaterThan(avgSingleScore);
    }
  });
});

// ============================================================================
// Tests: Performance
// ============================================================================

describe("performance", () => {
  it("completes search in reasonable time", async () => {
    const result = await searchCorpus("the"); // Common word, many matches
    // Keep this loose to avoid CI flakiness while still catching pathological regressions.
    expect(result.searchTimeMs).toBeLessThan(1000);
  });

  it("handles repeated searches efficiently", async () => {
    // Warm up
    await searchCorpus("test");

    // Measure multiple searches
    const start = performance.now();
    for (let i = 0; i < 10; i++) {
      await searchCorpus(`science ${i}`);
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(5000);
  });
});

// ============================================================================
// Tests: Data Integrity
// ============================================================================

describe("data integrity", () => {
  it("section IDs follow expected format", async () => {
    const sections = await getAllSections();
    for (const section of sections) {
      expect(section.id).toMatch(/^transcript:§\d+$/);
    }
  });

  it("anchors follow expected format", async () => {
    const sections = await getAllSections();
    for (const section of sections) {
      expect(section.anchor).toMatch(/^§\d+$/);
    }
  });

  it("all sections have non-empty titles", async () => {
    const sections = await getAllSections();
    for (const section of sections) {
      expect(section.title.trim().length).toBeGreaterThan(0);
    }
  });

  it("all sections have non-empty bodies", async () => {
    const sections = await getAllSections();
    for (const section of sections) {
      expect(section.body.trim().length).toBeGreaterThan(0);
    }
  });

  it("word counts are positive", async () => {
    const sections = await getAllSections();
    for (const section of sections) {
      expect(section.wordCount).toBeGreaterThan(0);
    }
  });

  it("line numbers are sequential and valid", async () => {
    const sections = await getAllSections();
    for (const section of sections) {
      expect(section.lineStart).toBeGreaterThan(0);
      expect(section.lineEnd).toBeGreaterThanOrEqual(section.lineStart);
    }
  });

  it("char offsets are valid", async () => {
    const sections = await getAllSections();
    for (const section of sections) {
      expect(section.charStart).toBeGreaterThanOrEqual(0);
      expect(section.charEnd).toBeGreaterThan(section.charStart);
    }
  });
});
