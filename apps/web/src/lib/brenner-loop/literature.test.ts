/**
 * Tests for Literature Integration Module
 *
 * @see brenner_bot-njjo.7 (Literature Integration)
 */

import { describe, expect, it } from "vitest";
import type { HypothesisCard } from "./hypothesis";
import type { BibTeXEntry, PaperResult } from "./literature";
import {
  bibTeXToPaperResult,
  // Relevance scoring
  calculateRelevance,
  // Factory functions
  createLiteratureSearch,
  createPaperResult,
  doiToUrl,
  extractDOI,
  // Evidence recording
  formatCitation,
  formatPaperSource,
  generatePaperId,
  // ID generation
  generateSearchId,
  // Search query generation
  generateSearchQueries,
  getPaperAgeCategory,
  getRelevanceColor,
  getRelevanceLabel,
  isLiteratureSearch,
  // Type guards
  isPaperResult,
  // DOI utilities
  isValidDOI,
  // Citation parsing
  parseBibTeX,
  preparePaperEvidenceData,
  RELEVANCE_THRESHOLDS,
  rankByRelevance,
  // Utility functions
  summarizePaper,
} from "./literature";

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockHypothesis(overrides: Partial<HypothesisCard> = {}): HypothesisCard {
  const now = new Date();
  return {
    id: "HC-test-001-v1",
    version: 1,
    statement:
      "Social media algorithm-driven content selection causes increased depression in teenagers",
    mechanism: "Algorithm amplifies negative content which increases rumination",
    domain: ["psychology", "technology"],
    predictionsIfTrue: [
      "Teens with higher social media usage will report more depressive symptoms",
      "Disabling algorithmic feeds should reduce depression scores",
    ],
    predictionsIfFalse: [
      "Depression rates should be similar regardless of social media usage patterns",
    ],
    impossibleIfTrue: ["Teens using social media extensively show improved mental health outcomes"],
    confounds: [
      {
        id: "CF-001",
        name: "Reverse Causation",
        description: "Pre-existing depression predisposes to social media use",
        likelihood: 0.6,
        domain: "psychology",
        addressed: false,
      },
    ],
    assumptions: ["Social media usage is measurable and quantifiable"],
    confidence: 50,
    tags: ["social-media", "mental-health", "teenagers"],
    createdAt: now,
    updatedAt: now,
    createdBy: "test-user",
    ...overrides,
  };
}

function createMockPaper(overrides: Partial<PaperResult> = {}): PaperResult {
  return {
    id: "doi:10.1234/test.2023",
    title: "Social Media Use and Adolescent Mental Health: A Systematic Review",
    authors: ["Smith, J.", "Jones, A.", "Williams, B."],
    year: 2023,
    abstract:
      "This systematic review examines the relationship between social media use and mental health outcomes in adolescents. We find significant correlations between algorithm-driven content consumption and depression symptoms in teenagers.",
    citationCount: 150,
    url: "https://doi.org/10.1234/test.2023",
    doi: "10.1234/test.2023",
    venue: "Journal of Adolescent Health",
    relevanceScore: 0.75,
    ...overrides,
  };
}

// ============================================================================
// ID Generation Tests
// ============================================================================

describe("generateSearchId", () => {
  it("generates a unique ID", () => {
    const id1 = generateSearchId();
    const id2 = generateSearchId();

    // Accepts UUID format (primary) or timestamp fallback
    expect(id1).toMatch(/^LS-([0-9a-f-]{36}|[a-z0-9]+-[a-z0-9]+)$/);
    expect(id2).toMatch(/^LS-([0-9a-f-]{36}|[a-z0-9]+-[a-z0-9]+)$/);
    expect(id1).not.toBe(id2);
  });
});

describe("generatePaperId", () => {
  it("uses DOI when available", () => {
    const id = generatePaperId({ doi: "10.1234/test.2023" });
    expect(id).toBe("doi:10.1234/test.2023");
  });

  it("generates hash-based ID when no DOI", () => {
    const id = generatePaperId({ title: "Test Paper", year: 2023 });
    expect(id).toMatch(/^paper:[a-z0-9]+-2023$/);
  });

  it("handles missing data gracefully", () => {
    const id = generatePaperId({});
    expect(id).toMatch(/^paper:[a-z0-9]+$/);
  });
});

// ============================================================================
// Search Query Generation Tests
// ============================================================================

describe("generateSearchQueries", () => {
  it("generates primary query from hypothesis statement", () => {
    const hypothesis = createMockHypothesis();
    const suggestions = generateSearchQueries(hypothesis);

    expect(suggestions.hypothesisId).toBe(hypothesis.id);
    expect(suggestions.primaryQuery).toBeTruthy();
    expect(suggestions.primaryQuery.length).toBeGreaterThan(10);
  });

  it("generates alternative queries", () => {
    const hypothesis = createMockHypothesis();
    const suggestions = generateSearchQueries(hypothesis);

    expect(suggestions.alternativeQueries.length).toBeGreaterThan(0);
    expect(suggestions.alternativeQueries.length).toBeLessThanOrEqual(5);
  });

  it("extracts keywords from hypothesis", () => {
    const hypothesis = createMockHypothesis();
    const suggestions = generateSearchQueries(hypothesis);

    expect(suggestions.keywords.length).toBeGreaterThan(0);
    // Should include substantive words, not stop words
    expect(suggestions.keywords).toContain("social");
    expect(suggestions.keywords).toContain("media");
    expect(suggestions.keywords).toContain("depression");
    expect(suggestions.keywords).not.toContain("the");
    expect(suggestions.keywords).not.toContain("in");
  });

  it("includes mechanism-related queries when available", () => {
    const hypothesis = createMockHypothesis({
      mechanism: "Algorithm amplifies negative content",
    });
    const suggestions = generateSearchQueries(hypothesis);

    const hasAlgorithmQuery = suggestions.alternativeQueries.some(
      (q) => q.toLowerCase().includes("algorithm") || q.toLowerCase().includes("amplif"),
    );
    expect(hasAlgorithmQuery).toBe(true);
  });
});

// ============================================================================
// Relevance Scoring Tests
// ============================================================================

describe("calculateRelevance", () => {
  it("returns high score for highly relevant paper", () => {
    const hypothesis = createMockHypothesis();
    const paper = createMockPaper({
      title: "Social Media Algorithm Effects on Teen Depression",
      abstract:
        "This study examines how algorithmic content curation on social media platforms affects depression rates in teenagers. We find that algorithm-driven feeds increase exposure to negative content.",
    });

    const { score, rationale } = calculateRelevance(paper, hypothesis);

    expect(score).toBeGreaterThan(RELEVANCE_THRESHOLDS.MODERATE);
    expect(rationale).toBeTruthy();
  });

  it("returns lower score for tangentially related paper", () => {
    const hypothesis = createMockHypothesis();
    const paper = createMockPaper({
      title: "Economic Impacts of Digital Advertising",
      abstract:
        "This paper analyzes the economic effects of digital advertising on small businesses. We examine revenue models and market dynamics.",
    });

    const { score, rationale } = calculateRelevance(paper, hypothesis);

    expect(score).toBeLessThan(RELEVANCE_THRESHOLDS.HIGH);
    expect(rationale).toBeTruthy();
  });
});

describe("rankByRelevance", () => {
  it("sorts papers by relevance score descending", () => {
    const papers = [
      createMockPaper({ id: "1", relevanceScore: 0.3 }),
      createMockPaper({ id: "2", relevanceScore: 0.8 }),
      createMockPaper({ id: "3", relevanceScore: 0.5 }),
    ];

    const ranked = rankByRelevance(papers);

    expect(ranked[0].id).toBe("2");
    expect(ranked[1].id).toBe("3");
    expect(ranked[2].id).toBe("1");
  });

  it("filters papers below minimum score", () => {
    const papers = [
      createMockPaper({ id: "1", relevanceScore: 0.3 }),
      createMockPaper({ id: "2", relevanceScore: 0.8 }),
      createMockPaper({ id: "3", relevanceScore: 0.1 }),
    ];

    const ranked = rankByRelevance(papers, 0.25);

    expect(ranked.length).toBe(2);
    expect(ranked.some((p) => p.id === "3")).toBe(false);
  });
});

describe("getRelevanceLabel", () => {
  it("returns correct labels for score ranges", () => {
    expect(getRelevanceLabel(0.8)).toBe("High");
    expect(getRelevanceLabel(0.5)).toBe("Moderate");
    expect(getRelevanceLabel(0.3)).toBe("Low");
    expect(getRelevanceLabel(0.1)).toBe("Minimal");
  });
});

describe("getRelevanceColor", () => {
  it("returns correct colors for score ranges", () => {
    expect(getRelevanceColor(0.8)).toBe("text-green-600");
    expect(getRelevanceColor(0.5)).toBe("text-amber-600");
    expect(getRelevanceColor(0.3)).toBe("text-orange-600");
    expect(getRelevanceColor(0.1)).toBe("text-red-600");
  });
});

// ============================================================================
// BibTeX Parsing Tests
// ============================================================================

describe("parseBibTeX", () => {
  it("parses a simple article entry", () => {
    const bibtex = `@article{smith2023social,
      title = {Social Media and Depression},
      author = {Smith, John and Jones, Jane},
      year = {2023},
      journal = {Journal of Psychology},
      doi = {10.1234/jp.2023.001}
    }`;

    const entry = parseBibTeX(bibtex);

    expect(entry).not.toBeNull();
    expect(entry!.entryType).toBe("article");
    expect(entry!.citationKey).toBe("smith2023social");
    expect(entry!.title).toBe("Social Media and Depression");
    expect(entry!.author).toBe("Smith, John and Jones, Jane");
    expect(entry!.year).toBe("2023");
    expect(entry!.journal).toBe("Journal of Psychology");
    expect(entry!.doi).toBe("10.1234/jp.2023.001");
  });

  it("handles entries with quoted values", () => {
    const bibtex = `@article{test2023,
      title = "A Quoted Title",
      year = 2023
    }`;

    const entry = parseBibTeX(bibtex);

    expect(entry).not.toBeNull();
    expect(entry!.title).toBe("A Quoted Title");
    expect(entry!.year).toBe("2023");
  });

  it("handles nested braces in values", () => {
    const bibtex = `@article{test2023,
      title = {A {Special} Title with {Nested} Braces}
    }`;

    const entry = parseBibTeX(bibtex);

    expect(entry).not.toBeNull();
    expect(entry!.title).toBe("A Special Title with Nested Braces");
  });

  it("returns null for invalid BibTeX", () => {
    const entry = parseBibTeX("not valid bibtex");
    expect(entry).toBeNull();
  });
});

describe("bibTeXToPaperResult", () => {
  it("converts BibTeX entry to PaperResult", () => {
    const entry: BibTeXEntry = {
      entryType: "article",
      citationKey: "smith2023",
      title: "Test Paper",
      author: "Smith, John and Jones, Jane",
      year: "2023",
      journal: "Test Journal",
      doi: "10.1234/test",
      abstract: "Test abstract",
    };

    const paper = bibTeXToPaperResult(entry);

    expect(paper.title).toBe("Test Paper");
    expect(paper.authors).toEqual(["Smith, John", "Jones, Jane"]);
    expect(paper.year).toBe(2023);
    expect(paper.venue).toBe("Test Journal");
    expect(paper.doi).toBe("10.1234/test");
    expect(paper.abstract).toBe("Test abstract");
  });

  it("calculates relevance when hypothesis provided", () => {
    const entry: BibTeXEntry = {
      entryType: "article",
      citationKey: "smith2023",
      title: "Social Media and Teen Depression",
      author: "Smith, John",
      year: "2023",
      abstract: "This study examines social media effects on adolescent mental health.",
    };

    const hypothesis = createMockHypothesis();
    const paper = bibTeXToPaperResult(entry, hypothesis);

    expect(paper.relevanceScore).toBeGreaterThan(0);
    expect(paper.relevanceRationale).toBeTruthy();
  });
});

// ============================================================================
// DOI Utilities Tests
// ============================================================================

describe("isValidDOI", () => {
  it("validates correct DOIs", () => {
    expect(isValidDOI("10.1234/test.2023")).toBe(true);
    expect(isValidDOI("10.1000/xyz123")).toBe(true);
    expect(isValidDOI("10.12345/something-with-dashes")).toBe(true);
  });

  it("rejects invalid DOIs", () => {
    expect(isValidDOI("not a doi")).toBe(false);
    expect(isValidDOI("https://example.com")).toBe(false);
    expect(isValidDOI("10.12/short")).toBe(false);
  });
});

describe("extractDOI", () => {
  it("extracts DOI from direct string", () => {
    expect(extractDOI("10.1234/test.2023")).toBe("10.1234/test.2023");
  });

  it("extracts DOI from doi.org URL", () => {
    expect(extractDOI("https://doi.org/10.1234/test.2023")).toBe("10.1234/test.2023");
  });

  it("extracts DOI from dx.doi.org URL", () => {
    expect(extractDOI("https://dx.doi.org/10.1234/test.2023")).toBe("10.1234/test.2023");
  });

  it("returns null when no DOI found", () => {
    expect(extractDOI("not a doi")).toBeNull();
    expect(extractDOI("https://example.com")).toBeNull();
  });
});

describe("doiToUrl", () => {
  it("generates correct DOI URL", () => {
    expect(doiToUrl("10.1234/test.2023")).toBe("https://doi.org/10.1234/test.2023");
  });
});

// ============================================================================
// Evidence Recording Tests
// ============================================================================

describe("formatCitation", () => {
  it("formats citation with multiple authors", () => {
    const paper = createMockPaper();
    const citation = formatCitation(paper);

    expect(citation).toContain("Smith, J.");
    expect(citation).toContain("Jones, A.");
    expect(citation).toContain("Williams, B.");
    expect(citation).toContain("2023");
    expect(citation).toContain(paper.title);
  });

  it("uses et al. for more than 3 authors", () => {
    const paper = createMockPaper({
      authors: ["Smith, J.", "Jones, A.", "Williams, B.", "Brown, C."],
    });
    const citation = formatCitation(paper);

    expect(citation).toContain("Smith, J. et al.");
    expect(citation).not.toContain("Jones, A.");
  });

  it("handles papers with no authors", () => {
    const paper = createMockPaper({ authors: [] });
    const citation = formatCitation(paper);

    expect(citation).toContain("Unknown");
  });
});

describe("formatPaperSource", () => {
  it("formats source with DOI when available", () => {
    const paper = createMockPaper();
    const source = formatPaperSource(paper);

    expect(source).toBe("DOI:10.1234/test.2023");
  });

  it("formats source without DOI", () => {
    const paper = createMockPaper({ doi: undefined });
    const source = formatPaperSource(paper);

    expect(source).toContain("Smith, J.");
    expect(source).toContain("2023");
    expect(source).toContain(paper.title);
  });
});

describe("preparePaperEvidenceData", () => {
  it("prepares evidence data from paper", () => {
    const paper = createMockPaper();
    const input = {
      paper,
      sessionId: "session-001",
      hypothesisId: "HYP-001",
      result: "supports" as const,
      keyFinding: "The study found significant correlation",
      interpretation: "This supports our hypothesis about algorithm effects",
      discriminativePower: 4 as const,
      confidenceBefore: 50,
      confidenceAfter: 62,
    };

    const data = preparePaperEvidenceData(input);

    expect(data.test.type).toBe("literature");
    expect(data.test.discriminativePower).toBe(4);
    expect(data.observation).toBe(input.keyFinding);
    expect(data.interpretation).toBe(input.interpretation);
    expect(data.result).toBe("supports");
    expect(data.source).toContain("DOI");
    expect(data.tags).toContain("literature");
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe("createLiteratureSearch", () => {
  it("creates a search with default filters", () => {
    const search = createLiteratureSearch({
      query: "social media depression",
      source: "google_scholar",
    });

    expect(search.id).toMatch(/^LS-/);
    expect(search.query).toBe("social media depression");
    expect(search.source).toBe("google_scholar");
    expect(search.filters).toEqual({});
    expect(search.results).toEqual([]);
    expect(search.searchedAt).toBeInstanceOf(Date);
  });

  it("includes optional context", () => {
    const search = createLiteratureSearch({
      query: "test query",
      source: "pubmed",
      hypothesisId: "HYP-001",
      testId: "TEST-001",
      filters: { yearFrom: 2020 },
    });

    expect(search.hypothesisId).toBe("HYP-001");
    expect(search.testId).toBe("TEST-001");
    expect(search.filters.yearFrom).toBe(2020);
  });
});

describe("createPaperResult", () => {
  it("creates paper result with generated ID", () => {
    const paper = createPaperResult({
      title: "Test Paper",
      authors: ["Smith, J."],
      year: 2023,
      abstract: "Test abstract",
      citationCount: 10,
      url: "https://example.com",
    });

    expect(paper.id).toMatch(/^paper:/);
    expect(paper.title).toBe("Test Paper");
    expect(paper.relevanceScore).toBe(0);
  });

  it("calculates relevance when hypothesis provided", () => {
    const hypothesis = createMockHypothesis();
    const paper = createPaperResult(
      {
        title: "Social Media and Depression in Teens",
        authors: ["Smith, J."],
        year: 2023,
        abstract: "Examining algorithm effects on adolescent mental health",
        citationCount: 10,
        url: "https://example.com",
      },
      hypothesis,
    );

    expect(paper.relevanceScore).toBeGreaterThan(0);
    expect(paper.relevanceRationale).toBeTruthy();
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe("summarizePaper", () => {
  it("returns full abstract if short", () => {
    const paper = createMockPaper({ abstract: "Short abstract" });
    expect(summarizePaper(paper)).toBe("Short abstract");
  });

  it("truncates long abstracts", () => {
    const longAbstract = "A".repeat(300);
    const paper = createMockPaper({ abstract: longAbstract });
    const summary = summarizePaper(paper, 100);

    expect(summary.length).toBe(100);
    expect(summary.endsWith("...")).toBe(true);
  });
});

describe("getPaperAgeCategory", () => {
  const currentYear = new Date().getFullYear();

  it("categorizes recent papers", () => {
    expect(getPaperAgeCategory(currentYear)).toBe("Recent");
    expect(getPaperAgeCategory(currentYear - 1)).toBe("Recent");
    expect(getPaperAgeCategory(currentYear - 2)).toBe("Recent");
  });

  it("categorizes recent-ish papers", () => {
    expect(getPaperAgeCategory(currentYear - 3)).toBe("Recent-ish");
    expect(getPaperAgeCategory(currentYear - 5)).toBe("Recent-ish");
  });

  it("categorizes established papers", () => {
    expect(getPaperAgeCategory(currentYear - 6)).toBe("Established");
    expect(getPaperAgeCategory(currentYear - 10)).toBe("Established");
  });

  it("categorizes classic papers", () => {
    expect(getPaperAgeCategory(currentYear - 11)).toBe("Classic");
    expect(getPaperAgeCategory(2000)).toBe("Classic");
  });
});

// ============================================================================
// Type Guard Tests
// ============================================================================

describe("isPaperResult", () => {
  it("returns true for valid PaperResult", () => {
    const paper = createMockPaper();
    expect(isPaperResult(paper)).toBe(true);
  });

  it("returns false for invalid objects", () => {
    expect(isPaperResult(null)).toBe(false);
    expect(isPaperResult({})).toBe(false);
    expect(isPaperResult({ id: "test" })).toBe(false);
    expect(isPaperResult({ ...createMockPaper(), id: 123 })).toBe(false);
  });
});

describe("isLiteratureSearch", () => {
  it("returns true for valid LiteratureSearch", () => {
    const search = createLiteratureSearch({
      query: "test",
      source: "google_scholar",
    });
    expect(isLiteratureSearch(search)).toBe(true);
  });

  it("returns false for invalid objects", () => {
    expect(isLiteratureSearch(null)).toBe(false);
    expect(isLiteratureSearch({})).toBe(false);
    expect(isLiteratureSearch({ id: "test" })).toBe(false);
  });
});
