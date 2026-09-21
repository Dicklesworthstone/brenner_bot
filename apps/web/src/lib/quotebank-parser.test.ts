/**
 * Unit Tests for quotebank-parser.ts
 *
 * Tests the markdown parsing logic for the quote bank.
 * Uses real data fixtures - no mocks.
 */

import { describe, expect, it } from "vitest";
import { filterQuotesByTag, parseQuoteBank, searchQuotes } from "./quotebank-parser";

// ============================================================================
// Test Fixtures
// ============================================================================

const SIMPLE_QUOTE_BANK = `# Brenner Quote Bank

Curated quotes from the Sydney Brenner interview.

## §42 — The Right Problem

> "The key is to find the right problem. If you have the right problem,
> the rest follows. If you have the wrong problem, nothing you do will help."

Why it matters: Problem selection is foundational to productive research.

Tags: \`problem-selection\`, \`strategy\`

## §58-59 — Model Organism Choice

> "The choice of **C. elegans** was crucial. It's transparent—you can see
> every cell. It has exactly 959 somatic cells."

Why it matters: Model selection enables experimental access.

Tags: \`model-selection\`, \`experimental-design\`, \`C-elegans\`
`;

const EMPTY_QUOTE_BANK = "";

const SINGLE_QUOTE = `# Quote Bank

A single quote.

## §1 — First Quote

> "This is the only quote."

Why it matters: It matters because reasons.

Tags: \`important\`
`;

const MALFORMED_QUOTE_BANK = `# Quote Bank

Some intro text.

## §99 — No Quote Content

Why it matters: Missing the blockquote.

Tags: \`broken\`

## §100 — Has Quote

> "This one works."

Why it matters: This is valid.

Tags: \`works\`
`;

// ============================================================================
// Tests: parseQuoteBank
// ============================================================================

describe("parseQuoteBank", () => {
  describe("basic parsing", () => {
    it("extracts title from H1 header", () => {
      const result = parseQuoteBank(SIMPLE_QUOTE_BANK);
      expect(result.title).toBe("Brenner Quote Bank");
    });

    it("extracts description from first paragraph", () => {
      const result = parseQuoteBank(SIMPLE_QUOTE_BANK);
      expect(result.description).toBe("Curated quotes from the Sydney Brenner interview.");
    });

    it("counts quotes correctly", () => {
      const result = parseQuoteBank(SIMPLE_QUOTE_BANK);
      expect(result.quotes.length).toBe(2);
    });

    it("collects all unique tags", () => {
      const result = parseQuoteBank(SIMPLE_QUOTE_BANK);
      expect(result.allTags).toContain("problem-selection");
      expect(result.allTags).toContain("strategy");
      expect(result.allTags).toContain("model-selection");
      expect(result.allTags).toContain("C-elegans");
    });

    it("sorts tags alphabetically", () => {
      const result = parseQuoteBank(SIMPLE_QUOTE_BANK);
      const sorted = [...result.allTags].sort();
      expect(result.allTags).toEqual(sorted);
    });
  });

  describe("quote parsing", () => {
    it("extracts quote reference (§N format)", () => {
      const result = parseQuoteBank(SIMPLE_QUOTE_BANK);
      expect(result.quotes[0]?.sectionId).toBe("§42");
    });

    it("handles range references (§N-M format)", () => {
      const result = parseQuoteBank(SIMPLE_QUOTE_BANK);
      expect(result.quotes[1]?.sectionId).toBe("§58-59");
    });

    it("extracts quote title", () => {
      const result = parseQuoteBank(SIMPLE_QUOTE_BANK);
      expect(result.quotes[0]?.title).toBe("The Right Problem");
    });

    it("extracts quote text from blockquote", () => {
      const result = parseQuoteBank(SIMPLE_QUOTE_BANK);
      expect(result.quotes[0]?.quote).toContain("The key is to find the right problem");
    });

    it("joins multi-line blockquotes", () => {
      const result = parseQuoteBank(SIMPLE_QUOTE_BANK);
      // Multi-line quotes should be joined into single text
      expect(result.quotes[0]?.quote).toContain("If you have the right problem");
    });

    it("strips markdown formatting from quote text", () => {
      const result = parseQuoteBank(SIMPLE_QUOTE_BANK);
      // Bold markers should be removed
      expect(result.quotes[1]?.quote).not.toContain("**");
      expect(result.quotes[1]?.quote).toContain("C. elegans");
    });

    it("extracts 'Why it matters' section", () => {
      const result = parseQuoteBank(SIMPLE_QUOTE_BANK);
      expect(result.quotes[0]?.context).toContain("Problem selection");
    });

    it("extracts tags for each quote", () => {
      const result = parseQuoteBank(SIMPLE_QUOTE_BANK);
      expect(result.quotes[0]?.tags).toContain("problem-selection");
      expect(result.quotes[0]?.tags).toContain("strategy");
      expect(result.quotes[1]?.tags).toContain("model-selection");
    });
  });

  describe("edge cases", () => {
    it("handles empty input", () => {
      const result = parseQuoteBank(EMPTY_QUOTE_BANK);
      expect(result.title).toBe("Quote Bank");
      expect(result.quotes.length).toBe(0);
      expect(result.allTags.length).toBe(0);
    });

    it("handles single quote", () => {
      const result = parseQuoteBank(SINGLE_QUOTE);
      expect(result.quotes.length).toBe(1);
      expect(result.quotes[0]?.sectionId).toBe("§1");
    });

    it("skips quotes without blockquote content", () => {
      const result = parseQuoteBank(MALFORMED_QUOTE_BANK);
      // Should only include the quote that has actual content
      expect(result.quotes.length).toBe(1);
      expect(result.quotes[0]?.sectionId).toBe("§100");
    });

    it("handles quotes with missing 'Why it matters'", () => {
      const noWhy = `# Quote Bank

## §1 — Test

> "Quote text."

Tags: \`test\`
`;
      const result = parseQuoteBank(noWhy);
      expect(result.quotes[0]?.context).toBe("");
    });

    it("handles quotes with no tags", () => {
      const noTags = `# Quote Bank

## §1 — Test

> "Quote text."

Why it matters: Important.
`;
      const result = parseQuoteBank(noTags);
      expect(result.quotes[0]?.tags).toEqual([]);
    });
  });

  describe("title format variations", () => {
    it("handles section with dash separator", () => {
      const result = parseQuoteBank(SIMPLE_QUOTE_BANK);
      expect(result.quotes[0]?.title).toBe("The Right Problem");
    });

    it("handles section with em-dash separator", () => {
      const withEmDash = `# Bank

## §1 — Title Here

> "Quote."

Tags: \`tag\`
`;
      const result = parseQuoteBank(withEmDash);
      expect(result.quotes[0]?.title).toBe("Title Here");
    });

    it("handles section with en-dash separator", () => {
      const withEnDash = `# Bank

## §1 – Title Here

> "Quote."

Tags: \`tag\`
`;
      const result = parseQuoteBank(withEnDash);
      expect(result.quotes[0]?.title).toBe("Title Here");
    });
  });
});

// ============================================================================
// Tests: filterQuotesByTag
// ============================================================================

describe("filterQuotesByTag", () => {
  const parsed = parseQuoteBank(SIMPLE_QUOTE_BANK);

  it("returns all quotes when tag is empty", () => {
    const filtered = filterQuotesByTag(parsed.quotes, "");
    expect(filtered.length).toBe(2);
  });

  it("filters by exact tag match", () => {
    const filtered = filterQuotesByTag(parsed.quotes, "problem-selection");
    expect(filtered.length).toBe(1);
    expect(filtered[0]?.sectionId).toBe("§42");
  });

  it("returns empty array when tag not found", () => {
    const filtered = filterQuotesByTag(parsed.quotes, "nonexistent-tag");
    expect(filtered.length).toBe(0);
  });

  it("handles quotes with multiple matching tags", () => {
    const filtered = filterQuotesByTag(parsed.quotes, "model-selection");
    expect(filtered.length).toBe(1);
    expect(filtered[0]?.tags).toContain("model-selection");
  });
});

// ============================================================================
// Tests: searchQuotes
// ============================================================================

describe("searchQuotes", () => {
  const parsed = parseQuoteBank(SIMPLE_QUOTE_BANK);

  it("finds quotes by title match", () => {
    const results = searchQuotes(parsed.quotes, "Problem");
    expect(results.length).toBe(1);
    expect(results[0]?.title).toContain("Problem");
  });

  it("finds quotes by text content", () => {
    const results = searchQuotes(parsed.quotes, "elegans");
    expect(results.length).toBe(1);
    expect(results[0]?.quote).toContain("elegans");
  });

  it("finds quotes by 'why it matters' content", () => {
    const results = searchQuotes(parsed.quotes, "foundational");
    expect(results.length).toBe(1);
  });

  it("finds quotes by tag content", () => {
    const results = searchQuotes(parsed.quotes, "strategy");
    expect(results.length).toBe(1);
  });

  it("search is case-insensitive", () => {
    const results = searchQuotes(parsed.quotes, "RIGHT PROBLEM");
    expect(results.length).toBe(1);
  });

  it("returns empty array for no matches", () => {
    const results = searchQuotes(parsed.quotes, "xyznonexistent");
    expect(results.length).toBe(0);
  });

  it("matches partial words", () => {
    const results = searchQuotes(parsed.quotes, "trans");
    expect(results.length).toBe(1);
    expect(results[0]?.quote).toContain("transparent");
  });
});

// ============================================================================
// Tests: Real corpus integration
// ============================================================================

describe("real corpus integration", () => {
  it("parses a realistic quote bank excerpt", () => {
    const realLike = `# Brenner Primitives: Restored Quote Bank

A curated collection of methodological primitives from Sydney Brenner's interviews.

## §57 — The Decision Experiment

> "The experiment should tell you something you didn't know before.
> It should discriminate between hypotheses. If it can't do that,
> don't waste your time."

Why it matters: This encapsulates the core principle of experimental design—experiments must have discriminative power.

Tags: \`decision-experiment\`, \`hypothesis-testing\`, \`experimental-design\`

## §112-115 — Scale Prison Warning

> "People get trapped by their technology. They keep doing what they
> can do rather than what they should do. The tools become the master."

Why it matters: A warning against technology-driven rather than question-driven research.

Tags: \`scale-prison\`, \`tooling\`, \`anti-pattern\`
`;

    const result = parseQuoteBank(realLike);

    expect(result.title).toBe("Brenner Primitives: Restored Quote Bank");
    expect(result.quotes.length).toBe(2);

    // First quote
    expect(result.quotes[0]?.sectionId).toBe("§57");
    expect(result.quotes[0]?.title).toBe("The Decision Experiment");
    expect(result.quotes[0]?.quote).toContain("discriminate between hypotheses");
    expect(result.quotes[0]?.context).toContain("discriminative power");
    expect(result.quotes[0]?.tags).toContain("decision-experiment");

    // Second quote
    expect(result.quotes[1]?.sectionId).toBe("§112-115");
    expect(result.quotes[1]?.title).toBe("Scale Prison Warning");
    expect(result.quotes[1]?.tags).toContain("scale-prison");
    expect(result.quotes[1]?.tags).toContain("anti-pattern");

    // All tags collected
    expect(result.allTags).toContain("decision-experiment");
    expect(result.allTags).toContain("scale-prison");
    expect(result.allTags).toContain("tooling");
  });
});
