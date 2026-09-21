/**
 * Unit Tests for transcript-parser.ts
 *
 * Tests the markdown parsing logic for the Brenner transcript.
 * Uses real data fixtures - no mocks.
 */

import { describe, expect, it } from "vitest";
import { getTranscriptSections, parseTranscript, searchTranscript } from "./transcript-parser";

// ============================================================================
// Test Fixtures
// ============================================================================

const SIMPLE_TRANSCRIPT = `# Sydney Brenner Interview

*A conversation about science and discovery*

## 1. Introduction

> This is what I always tell people.
> The key is to find the right problem.

*[Q] How did you choose your problems?*

> I looked for systems where the question
> could actually be answered.

## 2. C. elegans Selection

> The choice of **C. elegans** was crucial.
> It's transparent—you can see every cell.

---

Some additional context here.
`;

const EMPTY_TRANSCRIPT = "";

const NO_SECTIONS_TRANSCRIPT = `# Just a Title

Some content without any sections.

> A quote without structure.
`;

const MULTI_QUOTE_SECTION = `# Test

## 1. Quotes

> First quote line.
> Second quote line.

> Another separate quote.

*[Q] A question in between*

> Third quote after question.
`;

// ============================================================================
// Tests: parseTranscript
// ============================================================================

describe("parseTranscript", () => {
  describe("basic parsing", () => {
    it("extracts title from H1 header", () => {
      const result = parseTranscript(SIMPLE_TRANSCRIPT);
      expect(result.title).toBe("Sydney Brenner Interview");
    });

    it("extracts subtitle from italic line", () => {
      const result = parseTranscript(SIMPLE_TRANSCRIPT);
      expect(result.subtitle).toBe("A conversation about science and discovery");
    });

    it("counts sections correctly", () => {
      const result = parseTranscript(SIMPLE_TRANSCRIPT);
      expect(result.totalSections).toBe(2);
    });

    it("parses section numbers correctly", () => {
      const result = parseTranscript(SIMPLE_TRANSCRIPT);
      expect(result.sections[0]?.number).toBe(1);
      expect(result.sections[1]?.number).toBe(2);
    });

    it("parses section titles correctly", () => {
      const result = parseTranscript(SIMPLE_TRANSCRIPT);
      expect(result.sections[0]?.title).toBe("Introduction");
      expect(result.sections[1]?.title).toBe("C. elegans Selection");
    });
  });

  describe("content type detection", () => {
    it("identifies blockquotes as brenner-quote", () => {
      const result = parseTranscript(SIMPLE_TRANSCRIPT);
      const introSection = result.sections[0];
      const quotes = introSection?.content.filter((c) => c.type === "brenner-quote");
      expect(quotes?.length).toBeGreaterThan(0);
    });

    it("identifies [Q] lines as interviewer-question", () => {
      const result = parseTranscript(SIMPLE_TRANSCRIPT);
      const introSection = result.sections[0];
      const questions = introSection?.content.filter((c) => c.type === "interviewer-question");
      expect(questions?.length).toBe(1);
      expect(questions?.[0]?.text).toBe("How did you choose your problems?");
    });

    it("identifies regular text as paragraph", () => {
      const result = parseTranscript(SIMPLE_TRANSCRIPT);
      const section2 = result.sections[1];
      const paragraphs = section2?.content.filter((c) => c.type === "paragraph");
      expect(paragraphs?.length).toBeGreaterThan(0);
    });
  });

  describe("inline formatting", () => {
    it("extracts bold text as highlights", () => {
      const result = parseTranscript(SIMPLE_TRANSCRIPT);
      const section2 = result.sections[1];
      const quoteWithHighlight = section2?.content.find(
        (c) => c.type === "brenner-quote" && c.highlights?.includes("C. elegans"),
      );
      expect(quoteWithHighlight).toBeDefined();
    });

    it("removes markdown formatting from text", () => {
      const result = parseTranscript(SIMPLE_TRANSCRIPT);
      const section2 = result.sections[1];
      const quote = section2?.content.find((c) => c.type === "brenner-quote");
      // Text should not contain ** markers
      expect(quote?.text).not.toContain("**");
    });

    it("preserves [sic] markers in text", () => {
      const withSic = `# Test
## 1. Section
> He said it was [sic] correct.
`;
      const result = parseTranscript(withSic);
      const quote = result.sections[0]?.content.find((c) => c.type === "brenner-quote");
      expect(quote?.text).toContain("[sic]");
    });
  });

  describe("multi-line quotes", () => {
    it("joins consecutive blockquote lines", () => {
      const result = parseTranscript(MULTI_QUOTE_SECTION);
      const quotes = result.sections[0]?.content.filter((c) => c.type === "brenner-quote");
      // First quote should combine the two consecutive lines
      expect(quotes?.[0]?.text).toContain("First quote line");
      expect(quotes?.[0]?.text).toContain("Second quote line");
    });

    it("separates non-consecutive quotes", () => {
      const result = parseTranscript(MULTI_QUOTE_SECTION);
      const quotes = result.sections[0]?.content.filter((c) => c.type === "brenner-quote");
      // Should have 3 separate quotes
      expect(quotes?.length).toBe(3);
    });

    it("ends a quote block when a non-quote line appears without an empty line separator", () => {
      const transcript = `# Test
## 1. Section
> A quoted line
Paragraph immediately after quote
`;

      const result = parseTranscript(transcript);
      const section = result.sections[0];
      const quote = section?.content.find((c) => c.type === "brenner-quote");
      const paragraph = section?.content.find((c) => c.type === "paragraph");

      expect(quote?.text).toContain("A quoted line");
      expect(paragraph?.text).toContain("Paragraph immediately after quote");
    });

    it("flushes a trailing quote at end-of-section without a final blank line", () => {
      const transcript = "# Test\n## 1. Section\n> Trailing quote with no final newline";
      const result = parseTranscript(transcript);
      const quotes = result.sections[0]?.content.filter((c) => c.type === "brenner-quote");
      expect(quotes).toHaveLength(1);
      expect(quotes?.[0]?.text).toContain("Trailing quote");
    });
  });

  describe("regex robustness", () => {
    it("parses nested formatting (bold containing italic)", () => {
      const input = `# Test
## 1. Nested
> This is **bold *italic* text**.
`;
      const result = parseTranscript(input);
      const quote = result.sections[0]?.content[0];

      // Ideally, we want the text to be clean: "This is bold italic text."
      // And highlights to contain: "bold *italic* text" (inner content)

      expect(quote?.text).not.toContain("**");
      expect(quote?.text).toBe("This is bold italic text.");
      expect(quote?.highlights).toContain("bold *italic* text");
    });

    it("safely handles mathematical asterisks", () => {
      const input = `# Test
## 1. Math
> 2 * 3 = 6 and 4 * 5 = 20.
`;
      const result = parseTranscript(input);
      const quote = result.sections[0]?.content[0];

      // Should NOT strip the * or the content between them
      expect(quote?.text).toContain("2 * 3");
      expect(quote?.text).toContain("4 * 5");
      expect(quote?.text).not.toContain("2  3");
    });
  });

  describe("edge cases", () => {
    it("handles empty input", () => {
      const result = parseTranscript(EMPTY_TRANSCRIPT);
      expect(result.title).toBe("Sydney Brenner Transcript");
      expect(result.subtitle).toBe("");
      expect(result.totalSections).toBe(0);
      expect(result.sections).toEqual([]);
    });

    it("provides rawContent when no sections found", () => {
      const result = parseTranscript(NO_SECTIONS_TRANSCRIPT);
      expect(result.totalSections).toBe(0);
      expect(result.rawContent).toBeDefined();
      expect(result.rawContent).toContain("Just a Title");
    });

    it("skips horizontal rules", () => {
      const result = parseTranscript(SIMPLE_TRANSCRIPT);
      const allContent = result.sections.flatMap((s) => s.content);
      const hrContent = allContent.find((c) => c.text === "---" || c.text === "***");
      expect(hrContent).toBeUndefined();
    });

    it("handles sections with only quotes", () => {
      const onlyQuotes = `# Test
## 1. All Quotes
> Quote one.
> Quote two.
`;
      const result = parseTranscript(onlyQuotes);
      expect(result.sections[0]?.content.length).toBeGreaterThan(0);
      expect(result.sections[0]?.content.every((c) => c.type === "brenner-quote")).toBe(true);
    });
  });
});

// ============================================================================
// Tests: getTranscriptSections
// ============================================================================

describe("getTranscriptSections", () => {
  const parsed = parseTranscript(SIMPLE_TRANSCRIPT);

  it("returns subset from start", () => {
    const subset = getTranscriptSections(parsed, 0, 1);
    expect(subset.length).toBe(1);
    expect(subset[0]?.number).toBe(1);
  });

  it("returns subset from middle", () => {
    const subset = getTranscriptSections(parsed, 1, 1);
    expect(subset.length).toBe(1);
    expect(subset[0]?.number).toBe(2);
  });

  it("handles count larger than remaining", () => {
    const subset = getTranscriptSections(parsed, 1, 10);
    expect(subset.length).toBe(1);
  });

  it("returns empty for out of range start", () => {
    const subset = getTranscriptSections(parsed, 100, 1);
    expect(subset.length).toBe(0);
  });

  it("returns all when count covers all", () => {
    const subset = getTranscriptSections(parsed, 0, 100);
    expect(subset.length).toBe(parsed.totalSections);
  });
});

// ============================================================================
// Tests: searchTranscript
// ============================================================================

describe("searchTranscript", () => {
  const parsed = parseTranscript(SIMPLE_TRANSCRIPT);

  it("finds sections by title match", () => {
    const results = searchTranscript(parsed, "Introduction");
    expect(results.length).toBe(1);
    expect(results[0]?.number).toBe(1);
  });

  it("finds sections by content match", () => {
    const results = searchTranscript(parsed, "elegans");
    expect(results.length).toBe(1);
    expect(results[0]?.number).toBe(2);
  });

  it("search is case-insensitive", () => {
    const results = searchTranscript(parsed, "INTRODUCTION");
    expect(results.length).toBe(1);
  });

  it("returns empty for no matches", () => {
    const results = searchTranscript(parsed, "nonexistent term xyz");
    expect(results.length).toBe(0);
  });

  it("finds multiple matching sections", () => {
    const results = searchTranscript(parsed, "the");
    expect(results.length).toBeGreaterThan(0);
  });

  it("matches partial words", () => {
    const results = searchTranscript(parsed, "prob");
    expect(results.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Tests: Real Corpus (integration)
// ============================================================================

describe("real corpus integration", () => {
  it("parses real transcript excerpt", () => {
    const realExcerpt = `# The Sydney Brenner Interview

*Recorded 2015*

## 58. Reducing Complexity

> What we did was to reduce the problem to one dimension.
> Instead of having a three-dimensional puzzle of cells, we could now
> treat it as a linear sequence.

*[Q] Why was that important?*

> The cell lineage is essentially a program that runs, and we can read it.

## 59. Choice of Model Organism

> The choice of **C. elegans** was crucial. It's transparent—
> you can see every cell. It has exactly **959 somatic cells**, and every
> animal develops identically. It's eutelic.
`;

    const result = parseTranscript(realExcerpt);

    expect(result.title).toBe("The Sydney Brenner Interview");
    expect(result.subtitle).toBe("Recorded 2015");
    expect(result.totalSections).toBe(2);

    // Section 58
    expect(result.sections[0]?.number).toBe(58);
    expect(result.sections[0]?.title).toBe("Reducing Complexity");

    // Section 59
    expect(result.sections[1]?.number).toBe(59);
    expect(result.sections[1]?.title).toBe("Choice of Model Organism");

    // Check highlights
    const section59 = result.sections[1];
    const quoteWithHighlights = section59?.content.find((c) => c.highlights?.length);
    expect(quoteWithHighlights?.highlights).toContain("C. elegans");
    expect(quoteWithHighlights?.highlights).toContain("959 somatic cells");
  });
});
