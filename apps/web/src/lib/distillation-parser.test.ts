/**
 * Unit Tests for distillation-parser.ts
 *
 * Tests the markdown parsing logic for distillation documents.
 * Uses real data fixtures - no mocks.
 */

import { describe, expect, it } from "vitest";
import {
  type DistillationContent,
  getDistillationMeta,
  getModelFromId,
  parseDistillation,
} from "./distillation-parser";

// Type helpers for narrowing DistillationContent union
type ListContent = Extract<DistillationContent, { type: "list" }>;
type QuoteContent = Extract<DistillationContent, { type: "quote" }>;

// ============================================================================
// Test Fixtures
// ============================================================================

const SIMPLE_DISTILLATION = `# The Brenner Method

*A synthesis of scientific methodology*

## Introduction

This is an introduction paragraph.

> "The key is finding the right problem." (§42)

## Core Principles

1. First principle
2. Second principle
3. Third principle

- Unordered item one
- Unordered item two

Another paragraph here.
`;

const MULTI_PART_DISTILLATION = `# Complete Distillation

*Full synthesis*

# PART I: Foundations

## Section A

Content for section A.

## Section B

Content for section B.

# PART II: Applications

## Section C

Content for section C.

> Quote with §58-59 reference.
`;

const EMPTY_DISTILLATION = "";

const NO_SECTIONS_DISTILLATION = `# Just a Title

Some content without any sections or parts.
`;

// ============================================================================
// Tests: getDistillationMeta
// ============================================================================

describe("getDistillationMeta", () => {
  it("returns GPT-5.2 metadata for gpt ID", () => {
    const meta = getDistillationMeta("distillation-gpt-52");
    expect(meta.name).toBe("GPT-5.2");
    expect(meta.color).toBe("from-emerald-500 to-teal-600");
    expect(meta.icon).toBe("G");
    expect(meta.tagline).toBe("Extra-high reasoning synthesis");
    expect(meta.strengths.length).toBe(3);
  });

  it("returns Opus metadata for opus ID", () => {
    const meta = getDistillationMeta("distillation-opus-45");
    expect(meta.name).toBe("Claude Opus 4.5");
    expect(meta.color).toBe("from-violet-500 to-purple-600");
    expect(meta.icon).toBe("A");
  });

  it("returns Gemini metadata for gemini ID", () => {
    const meta = getDistillationMeta("distillation-gemini-3");
    expect(meta.name).toBe("Gemini 3");
    expect(meta.color).toBe("from-blue-500 to-cyan-600");
  });

  it("returns fallback for unknown ID", () => {
    const meta = getDistillationMeta("unknown-model");
    expect(meta.name).toBe("AI Model");
    expect(meta.icon).toBe("?");
    expect(meta.strengths.length).toBe(1);
  });
});

// ============================================================================
// Tests: getModelFromId (legacy function)
// ============================================================================

describe("getModelFromId", () => {
  it("returns basic model info for known IDs", () => {
    const gpt = getModelFromId("distillation-gpt-52");
    expect(gpt.name).toBe("GPT-5.2");
    expect(gpt.color).toBeDefined();
    expect(gpt.icon).toBe("G");
  });

  it("returns fallback for unknown IDs", () => {
    const unknown = getModelFromId("unknown");
    expect(unknown.name).toBe("AI Model");
    expect(unknown.icon).toBe("?");
  });

  it("handles partial ID matches", () => {
    // Should use exact ID matching
    const partial = getModelFromId("gpt");
    expect(partial.name).toBe("AI Model"); // No match
  });
});

// ============================================================================
// Tests: parseDistillation - Basic Parsing
// ============================================================================

describe("parseDistillation", () => {
  describe("basic parsing", () => {
    it("extracts title from H1 header", () => {
      const result = parseDistillation(SIMPLE_DISTILLATION, "test-doc");
      expect(result.title).toBe("The Brenner Method");
    });

    it("extracts subtitle from italic line", () => {
      const result = parseDistillation(SIMPLE_DISTILLATION, "test-doc");
      expect(result.subtitle).toBe("A synthesis of scientific methodology");
    });

    it("sets author from model ID", () => {
      const result = parseDistillation(SIMPLE_DISTILLATION, "distillation-opus-45");
      expect(result.author).toBe("Claude Opus 4.5");
    });

    it("counts words correctly", () => {
      const result = parseDistillation(SIMPLE_DISTILLATION, "test-doc");
      expect(result.wordCount).toBeGreaterThan(0);
    });
  });

  describe("section parsing without PARTS", () => {
    it("creates single part with all sections", () => {
      const result = parseDistillation(SIMPLE_DISTILLATION, "test-doc");
      expect(result.parts.length).toBe(1);
      expect(result.parts[0]?.title).toBe("Main Content");
    });

    it("parses section titles correctly", () => {
      const result = parseDistillation(SIMPLE_DISTILLATION, "test-doc");
      const sections = result.parts[0]?.sections ?? [];
      expect(sections.some((s) => s.title === "Introduction")).toBe(true);
      expect(sections.some((s) => s.title === "Core Principles")).toBe(true);
    });

    it("sets section levels correctly", () => {
      const result = parseDistillation(SIMPLE_DISTILLATION, "test-doc");
      const sections = result.parts[0]?.sections ?? [];
      // ## headers become level 1 (level = hashCount - 1)
      sections.forEach((s) => {
        expect([1, 2, 3]).toContain(s.level);
      });
    });
  });

  describe("PART parsing", () => {
    it("identifies multiple PARTS", () => {
      const result = parseDistillation(MULTI_PART_DISTILLATION, "test-doc");
      expect(result.parts.length).toBe(2);
    });

    it("converts Roman numerals to numbers", () => {
      const result = parseDistillation(MULTI_PART_DISTILLATION, "test-doc");
      expect(result.parts[0]?.number).toBe(1);
      expect(result.parts[1]?.number).toBe(2);
    });

    it("extracts PART titles correctly", () => {
      const result = parseDistillation(MULTI_PART_DISTILLATION, "test-doc");
      expect(result.parts[0]?.title).toBe("Foundations");
      expect(result.parts[1]?.title).toBe("Applications");
    });

    it("assigns sections to correct PARTS", () => {
      const result = parseDistillation(MULTI_PART_DISTILLATION, "test-doc");
      const part1Sections = result.parts[0]?.sections ?? [];
      const part2Sections = result.parts[1]?.sections ?? [];

      expect(part1Sections.some((s) => s.title === "Section A")).toBe(true);
      expect(part1Sections.some((s) => s.title === "Section B")).toBe(true);
      expect(part2Sections.some((s) => s.title === "Section C")).toBe(true);
    });
  });

  describe("content type detection", () => {
    it("identifies paragraphs", () => {
      const result = parseDistillation(SIMPLE_DISTILLATION, "test-doc");
      const allContent = result.parts.flatMap((p) => p.sections.flatMap((s) => s.content));
      const paragraphs = allContent.filter((c) => c.type === "paragraph");
      expect(paragraphs.length).toBeGreaterThan(0);
    });

    it("identifies blockquotes", () => {
      const result = parseDistillation(SIMPLE_DISTILLATION, "test-doc");
      const allContent = result.parts.flatMap((p) => p.sections.flatMap((s) => s.content));
      const quotes = allContent.filter((c) => c.type === "quote");
      expect(quotes.length).toBeGreaterThan(0);
    });

    it("identifies ordered lists", () => {
      const result = parseDistillation(SIMPLE_DISTILLATION, "test-doc");
      const allContent = result.parts.flatMap((p) => p.sections.flatMap((s) => s.content));
      const orderedLists = allContent.filter(
        (c): c is ListContent => c.type === "list" && c.ordered,
      );
      expect(orderedLists.length).toBeGreaterThan(0);
      expect(orderedLists[0]?.items.length).toBe(3);
    });

    it("identifies unordered lists", () => {
      const result = parseDistillation(SIMPLE_DISTILLATION, "test-doc");
      const allContent = result.parts.flatMap((p) => p.sections.flatMap((s) => s.content));
      const unorderedLists = allContent.filter(
        (c): c is ListContent => c.type === "list" && !c.ordered,
      );
      expect(unorderedLists.length).toBeGreaterThan(0);
      expect(unorderedLists[0]?.items.length).toBe(2);
    });
  });

  describe("reference extraction", () => {
    it("extracts § references from quotes", () => {
      const result = parseDistillation(SIMPLE_DISTILLATION, "test-doc");
      const allContent = result.parts.flatMap((p) => p.sections.flatMap((s) => s.content));
      const quotesWithRef = allContent.filter(
        (c): c is QuoteContent => c.type === "quote" && !!c.reference,
      );
      expect(quotesWithRef.length).toBeGreaterThan(0);
      expect(quotesWithRef[0]?.reference).toBe("42");
    });

    it("extracts range references (§58-59)", () => {
      const result = parseDistillation(MULTI_PART_DISTILLATION, "test-doc");
      const allContent = result.parts.flatMap((p) => p.sections.flatMap((s) => s.content));
      const quotesWithRef = allContent.filter(
        (c): c is QuoteContent => c.type === "quote" && !!c.reference,
      );
      expect(quotesWithRef.some((q) => q.reference === "58-59")).toBe(true);
    });
  });

  describe("inline formatting", () => {
    // NOTE: Markdown markers are now preserved in content blocks.
    // The DistillationViewer's renderFormattedText() parses and styles them at render time.
    // This allows for proper React component rendering of bold, italic, code, and section refs.

    it("preserves bold markers for rendering", () => {
      const withBold = `# Test
## Section
This has **bold text** in it.
`;
      const result = parseDistillation(withBold, "test-doc");
      const paragraphs = result.parts[0]?.sections[0]?.content.filter(
        (c) => c.type === "paragraph",
      );
      expect(paragraphs?.[0]?.text).toContain("**bold text**");
    });

    it("preserves italic markers for rendering", () => {
      const withItalic = `# Test
## Section
This has *italic text* in it.
`;
      const result = parseDistillation(withItalic, "test-doc");
      const paragraphs = result.parts[0]?.sections[0]?.content.filter(
        (c) => c.type === "paragraph",
      );
      expect(paragraphs?.[0]?.text).toContain("*italic text*");
    });

    it("preserves backticks for inline code rendering", () => {
      const withCode = `# Test
## Section
This has \`inline code\` in it.
`;
      const result = parseDistillation(withCode, "test-doc");
      const paragraphs = result.parts[0]?.sections[0]?.content.filter(
        (c) => c.type === "paragraph",
      );
      expect(paragraphs?.[0]?.text).toContain("`inline code`");
    });
  });

  describe("edge cases", () => {
    it("handles empty input", () => {
      const result = parseDistillation(EMPTY_DISTILLATION, "test-doc");
      expect(result.title).toBe("Distillation");
      expect(result.parts.length).toBe(0);
      expect(result.wordCount).toBe(0);
    });

    it("provides rawContent when no sections found", () => {
      const result = parseDistillation(NO_SECTIONS_DISTILLATION, "test-doc");
      expect(result.parts.length).toBe(0);
      expect(result.rawContent).toBeDefined();
      expect(result.rawContent).toContain("Just a Title");
    });

    it("handles horizontal rules", () => {
      const withHR = `# Test
## Section
Content before.
---
Content after.
`;
      const result = parseDistillation(withHR, "test-doc");
      const allContent = result.parts.flatMap((p) => p.sections.flatMap((s) => s.content));
      expect(allContent.some((c) => c.type === "paragraph" && c.text === "---")).toBe(false);
    });
  });

  describe("Roman numeral handling", () => {
    it("handles Roman numerals I through X", () => {
      const manyParts = `# Test

# PART I: One
## A
Content.

# PART V: Five
## B
Content.

# PART X: Ten
## C
Content.
`;
      const result = parseDistillation(manyParts, "test-doc");
      expect(result.parts.find((p) => p.number === 1)).toBeDefined();
      expect(result.parts.find((p) => p.number === 5)).toBeDefined();
      expect(result.parts.find((p) => p.number === 10)).toBeDefined();
    });
  });
});

// ============================================================================
// Tests: Integration with real-like content
// ============================================================================

describe("real content integration", () => {
  it("parses a realistic distillation excerpt", () => {
    const realLike = `# The Brenner Method: A Unified Distillation

*Synthesized from 236 transcript segments*

This distillation captures the essential methodology.

# PART I: Core Axioms

## Axiom 1: Generative Grammars

> "Every biological system has a grammar—a set of rules that generate its behavior." (§12)

The key insight is that understanding the grammar allows prediction.

## Axiom 2: Reconstruction over Description

Rather than cataloging phenomena, we seek to reconstruct the system.

# PART II: Operators

## The Level-Split Operator (⊘)

1. Identify the phenomenon
2. Separate levels of explanation
3. Find the grammar at each level

- Physical level
- Logical level
- Computational level
`;

    const result = parseDistillation(realLike, "distillation-opus-45");

    expect(result.title).toBe("The Brenner Method: A Unified Distillation");
    expect(result.subtitle).toBe("Synthesized from 236 transcript segments");
    expect(result.author).toBe("Claude Opus 4.5");
    expect(result.parts.length).toBe(2);

    // Part I
    expect(result.parts[0]?.number).toBe(1);
    expect(result.parts[0]?.title).toBe("Core Axioms");
    expect(result.parts[0]?.sections.length).toBe(2);

    // Part II
    expect(result.parts[1]?.number).toBe(2);
    expect(result.parts[1]?.title).toBe("Operators");

    // Check content types
    const allContent = result.parts.flatMap((p) => p.sections.flatMap((s) => s.content));
    expect(allContent.filter((c) => c.type === "quote").length).toBeGreaterThan(0);
    expect(allContent.filter((c) => c.type === "list").length).toBe(2);

    // Check reference extraction
    const quotesWithRef = allContent.filter(
      (c): c is QuoteContent => c.type === "quote" && !!c.reference,
    );
    expect(quotesWithRef[0]?.reference).toBe("12");
  });
});
