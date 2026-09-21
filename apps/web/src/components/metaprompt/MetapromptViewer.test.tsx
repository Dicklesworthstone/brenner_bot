/**
 * MetapromptViewer Component Tests
 *
 * Tests the metaprompt document viewer using real DOM rendering via happy-dom.
 * Philosophy: NO mocks - test real component behavior with realistic data.
 *
 * Run with: cd apps/web && bun run test -- src/components/metaprompt/MetapromptViewer.test.tsx
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MetapromptSection, ParsedMetaprompt } from "@/lib/metaprompt-parser";
import { MetapromptViewer } from "./MetapromptViewer";

// ============================================================================
// Test Fixtures - Realistic ParsedMetaprompt data
// ============================================================================

function createTestSection(level: number, title: string, content: string): MetapromptSection {
  return { level, title, content };
}

/**
 * Minimal metaprompt fixture for basic rendering tests.
 */
const minimalMetaprompt: ParsedMetaprompt = {
  title: "Research Session Metaprompt",
  wordCount: 500,
  sections: [
    createTestSection(1, "Purpose", "Guide agents through Brenner Method research sessions."),
  ],
};

/**
 * Comprehensive metaprompt with multiple sections and content types.
 */
const comprehensiveMetaprompt: ParsedMetaprompt = {
  title: "Brenner Method Research Protocol",
  description: "A structured prompt for conducting rigorous scientific inquiry",
  wordCount: 2500,
  sections: [
    createTestSection(
      1,
      "Core Principles",
      `The Brenner Method emphasizes discriminative testing over confirmatory approaches.

> Exclusion is always a tremendously good thing in science.

Key principles include:
- Design tests that can exclude hypotheses
- Prioritize evidence per week
- Always consider the third alternative`,
    ),
    createTestSection(
      2,
      "Hypothesis Formation",
      `When formulating hypotheses:

1. State the claim clearly
2. Identify the mechanism
3. List testable predictions
4. Consider what would falsify each hypothesis`,
    ),
    createTestSection(
      1,
      "Discriminative Tests",
      `Tests should discriminate between competing hypotheses.

A good test satisfies these criteria:
- Clear expected outcomes for each hypothesis
- Potency check to verify test sensitivity
- Feasibility within resource constraints`,
    ),
    createTestSection(
      2,
      "Test Design Patterns",
      `Common patterns for discriminative tests:

- A/B comparison with clear predictions
- Elimination cascades
- Orthogonal tests for independent verification`,
    ),
    createTestSection(
      3,
      "Evidence Per Week",
      `The "evidence per week" metric prioritizes experiments that:

1. Yield results quickly
2. Have high discriminative power
3. Are resource efficient`,
    ),
  ],
};

/**
 * Metaprompt with only raw content (fallback mode).
 */
const rawContentMetaprompt: ParsedMetaprompt = {
  title: "Unparsed Metaprompt",
  wordCount: 200,
  sections: [],
  rawContent: `This is raw unparsed content that should be displayed as a fallback.

It includes multiple paragraphs and should still be parsed for display.

- First item
- Second item

The content continues here.`,
};

/**
 * Empty metaprompt for edge case testing.
 */
const emptyMetaprompt: ParsedMetaprompt = {
  title: "Empty Metaprompt",
  wordCount: 0,
  sections: [],
};

// ============================================================================
// MetapromptViewer Hero Tests
// ============================================================================

describe("MetapromptViewer Hero", () => {
  it("renders title correctly", () => {
    render(<MetapromptViewer data={minimalMetaprompt} />);

    expect(screen.getByText("Research Session Metaprompt")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(<MetapromptViewer data={comprehensiveMetaprompt} />);

    expect(
      screen.getByText("A structured prompt for conducting rigorous scientific inquiry"),
    ).toBeInTheDocument();
  });

  it("hides description when not provided", () => {
    render(<MetapromptViewer data={minimalMetaprompt} />);

    // No description in minimalMetaprompt
    expect(screen.queryByText("A structured prompt")).not.toBeInTheDocument();
  });

  it("displays word count", () => {
    const { container } = render(<MetapromptViewer data={comprehensiveMetaprompt} />);

    expect(container.textContent).toContain("2500");
    expect(container.textContent).toContain("words");
  });

  it("calculates and displays read time", () => {
    const { container } = render(<MetapromptViewer data={comprehensiveMetaprompt} />);

    // 2500 words / 200 wpm = 12.5, rounded up to 13 min
    expect(container.textContent).toContain("13");
    expect(container.textContent).toContain("min read");
  });

  it("shows Structured Prompt badge", () => {
    render(<MetapromptViewer data={minimalMetaprompt} />);

    expect(screen.getByText("Structured Prompt")).toBeInTheDocument();
  });

  it("has h1 heading for title", () => {
    render(<MetapromptViewer data={minimalMetaprompt} />);

    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toBeInTheDocument();
    expect(h1).toHaveTextContent("Research Session Metaprompt");
  });
});

// ============================================================================
// Section Rendering Tests
// ============================================================================

describe("MetapromptViewer Sections", () => {
  it("renders section titles", () => {
    render(<MetapromptViewer data={comprehensiveMetaprompt} />);

    expect(screen.getByText("Core Principles")).toBeInTheDocument();
    expect(screen.getByText("Hypothesis Formation")).toBeInTheDocument();
    expect(screen.getByText("Discriminative Tests")).toBeInTheDocument();
  });

  it("renders h2 for level 1 sections", () => {
    render(<MetapromptViewer data={comprehensiveMetaprompt} />);

    const h2Headings = screen.getAllByRole("heading", { level: 2 });
    const h2Texts = h2Headings.map((h) => h.textContent);

    expect(h2Texts).toContain("Core Principles");
    expect(h2Texts).toContain("Discriminative Tests");
  });

  it("renders h3 for level 2 sections", () => {
    render(<MetapromptViewer data={comprehensiveMetaprompt} />);

    const h3Headings = screen.getAllByRole("heading", { level: 3 });
    const h3Texts = h3Headings.map((h) => h.textContent);

    expect(h3Texts).toContain("Hypothesis Formation");
    expect(h3Texts).toContain("Test Design Patterns");
  });

  it("renders h4 for level 3 sections", () => {
    render(<MetapromptViewer data={comprehensiveMetaprompt} />);

    const h4Headings = screen.getAllByRole("heading", { level: 4 });
    const h4Texts = h4Headings.map((h) => h.textContent);

    expect(h4Texts).toContain("Evidence Per Week");
  });

  it("renders paragraph content", () => {
    const { container } = render(<MetapromptViewer data={minimalMetaprompt} />);

    expect(container.textContent).toContain(
      "Guide agents through Brenner Method research sessions",
    );
  });

  it("assigns section IDs for navigation", () => {
    const { container } = render(<MetapromptViewer data={comprehensiveMetaprompt} />);

    // Section IDs should be slugified titles
    expect(container.querySelector("#core-principles")).toBeInTheDocument();
    expect(container.querySelector("#hypothesis-formation")).toBeInTheDocument();
  });
});

// ============================================================================
// Content Type Tests
// ============================================================================

describe("MetapromptViewer Content Types", () => {
  it("renders blockquotes", () => {
    const { container } = render(<MetapromptViewer data={comprehensiveMetaprompt} />);

    const blockquotes = container.querySelectorAll("blockquote");
    expect(blockquotes.length).toBeGreaterThan(0);
    expect(container.textContent).toContain(
      "Exclusion is always a tremendously good thing in science",
    );
  });

  it("renders unordered lists", () => {
    const { container } = render(<MetapromptViewer data={comprehensiveMetaprompt} />);

    const unorderedLists = container.querySelectorAll("ul");
    expect(unorderedLists.length).toBeGreaterThan(0);
    expect(container.textContent).toContain("Design tests that can exclude hypotheses");
  });

  it("renders ordered lists", () => {
    const { container } = render(<MetapromptViewer data={comprehensiveMetaprompt} />);

    const orderedLists = container.querySelectorAll("ol");
    expect(orderedLists.length).toBeGreaterThan(0);
    expect(container.textContent).toContain("State the claim clearly");
  });

  it("renders list items with proper content", () => {
    const { container } = render(<MetapromptViewer data={comprehensiveMetaprompt} />);

    expect(container.textContent).toContain("Prioritize evidence per week");
    expect(container.textContent).toContain("Always consider the third alternative");
  });

  it("strips markdown formatting from content", () => {
    const metapromptWithFormatting: ParsedMetaprompt = {
      title: "Test",
      wordCount: 100,
      sections: [
        createTestSection(1, "Formatting", "This has **bold** and *italic* and `code` text."),
      ],
    };

    const { container } = render(<MetapromptViewer data={metapromptWithFormatting} />);

    // Markdown formatting should be stripped
    expect(container.textContent).toContain("This has bold and italic and code text");
    expect(container.textContent).not.toContain("**");
    expect(container.textContent).not.toContain("`");
  });
});

// ============================================================================
// Raw Content Fallback Tests
// ============================================================================

describe("MetapromptViewer Raw Content", () => {
  it("renders raw content when no sections available", () => {
    const { container } = render(<MetapromptViewer data={rawContentMetaprompt} />);

    expect(container.textContent).toContain("This is raw unparsed content");
    expect(container.textContent).toContain("should be displayed as a fallback");
  });

  it("parses raw content into paragraphs", () => {
    const { container } = render(<MetapromptViewer data={rawContentMetaprompt} />);

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs.length).toBeGreaterThan(0);
  });

  it("parses raw content lists", () => {
    const { container } = render(<MetapromptViewer data={rawContentMetaprompt} />);

    expect(container.textContent).toContain("First item");
    expect(container.textContent).toContain("Second item");
  });

  it("renders nothing when empty and no raw content", () => {
    const { container } = render(<MetapromptViewer data={emptyMetaprompt} />);

    // Should only have hero, no section content
    expect(container.textContent).toContain("Empty Metaprompt");
    // But shouldn't have any section content or raw content
    const sections = container.querySelectorAll("section");
    expect(sections.length).toBe(0);
  });
});

// ============================================================================
// Edge Case Tests
// ============================================================================

describe("MetapromptViewer Edge Cases", () => {
  it("handles single section", () => {
    render(<MetapromptViewer data={minimalMetaprompt} />);

    expect(screen.getByText("Purpose")).toBeInTheDocument();
    expect(screen.getByText("Research Session Metaprompt")).toBeInTheDocument();
  });

  it("handles zero word count", () => {
    const { container } = render(<MetapromptViewer data={emptyMetaprompt} />);

    expect(container.textContent).toContain("0");
    expect(container.textContent).toContain("words");
  });

  it("handles very long content", () => {
    const longContent = "This is a long paragraph. ".repeat(50);
    const longMetaprompt: ParsedMetaprompt = {
      title: "Long Content",
      wordCount: 300,
      sections: [createTestSection(1, "Long Section", longContent)],
    };

    const { container } = render(<MetapromptViewer data={longMetaprompt} />);

    expect(container.textContent).toContain("This is a long paragraph");
  });

  it("handles deeply nested section levels", () => {
    const nestedMetaprompt: ParsedMetaprompt = {
      title: "Nested Sections",
      wordCount: 100,
      sections: [
        createTestSection(1, "Level 1", "First level content"),
        createTestSection(2, "Level 2", "Second level content"),
        createTestSection(3, "Level 3", "Third level content"),
      ],
    };

    render(<MetapromptViewer data={nestedMetaprompt} />);

    expect(screen.getByRole("heading", { level: 2, name: "Level 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Level 2" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "Level 3" })).toBeInTheDocument();
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

describe("MetapromptViewer Accessibility", () => {
  it("has proper heading hierarchy", () => {
    render(<MetapromptViewer data={comprehensiveMetaprompt} />);

    // H1 for title
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toBeInTheDocument();

    // H2 for level 1 sections
    const h2s = screen.getAllByRole("heading", { level: 2 });
    expect(h2s.length).toBeGreaterThan(0);

    // H3 for level 2 sections
    const h3s = screen.getAllByRole("heading", { level: 3 });
    expect(h3s.length).toBeGreaterThan(0);
  });

  it("uses semantic blockquote elements", () => {
    const { container } = render(<MetapromptViewer data={comprehensiveMetaprompt} />);

    const blockquotes = container.querySelectorAll("blockquote");
    expect(blockquotes.length).toBeGreaterThan(0);
  });

  it("uses semantic list elements", () => {
    const { container } = render(<MetapromptViewer data={comprehensiveMetaprompt} />);

    expect(container.querySelectorAll("ul").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("ol").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("li").length).toBeGreaterThan(0);
  });

  it("uses section elements with IDs for navigation", () => {
    const { container } = render(<MetapromptViewer data={comprehensiveMetaprompt} />);

    const sections = container.querySelectorAll("section[id]");
    expect(sections.length).toBeGreaterThan(0);
  });
});
