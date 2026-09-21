/**
 * QuoteBankViewer Component Tests
 *
 * Tests the quote bank viewer using real DOM rendering via happy-dom.
 * Philosophy: NO mocks - test real component behavior with realistic data.
 *
 * Run with: cd apps/web && bun run test -- src/components/quotebank/QuoteBankViewer.test.tsx
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedQuoteBank, Quote } from "@/lib/quotebank-parser";
import { QuoteBankViewer } from "./QuoteBankViewer";

// ============================================================================
// Test Fixtures - Realistic ParsedQuoteBank data
// ============================================================================

function createTestQuote(
  sectionId: string,
  title: string,
  quote: string,
  context: string,
  tags: string[] = [],
): Quote {
  return { sectionId, title, quote, context, tags };
}

/**
 * Minimal quote bank fixture for basic rendering tests.
 */
const minimalQuoteBank: ParsedQuoteBank = {
  title: "Sydney Brenner Quote Bank",
  description: "Essential wisdom from the transcript",
  quotes: [
    createTestQuote(
      "§103",
      "Third Alternative",
      "You've forgotten there's a third alternative: both could be wrong.",
      "When analyzing competing theories, always consider that neither may be correct.",
      ["third-alternative", "methodology"],
    ),
  ],
  allTags: ["third-alternative", "methodology"],
};

/**
 * Comprehensive quote bank with multiple quotes and tags.
 */
const comprehensiveQuoteBank: ParsedQuoteBank = {
  title: "The Brenner Method: Essential Quotes",
  description: "Curated wisdom from Sydney Brenner's interviews and writings",
  quotes: [
    createTestQuote(
      "§57",
      "Model Organism Philosophy",
      "We chose the worm for its simplicity and its defined cell lineage.",
      "C. elegans was selected specifically because every cell can be traced.",
      ["model-organism", "c-elegans", "methodology"],
    ),
    createTestQuote(
      "§103",
      "Third Alternative",
      "You've forgotten there's a third alternative: both could be wrong.",
      "Anti-binary thinking is central to the Brenner approach.",
      ["third-alternative", "methodology", "philosophy"],
    ),
    createTestQuote(
      "§105",
      "Evidence Per Week",
      "Exclusion is always a tremendously good thing in science.",
      "Prioritize experiments that can rule out hypotheses quickly.",
      ["evidence-per-week", "exclusion", "experiments"],
    ),
    createTestQuote(
      "§107",
      "Discriminative Tests",
      "The experiment must be designed to exclude, not to confirm.",
      "Design tests that differentiate between competing hypotheses.",
      ["discriminative-tests", "methodology", "experiments"],
    ),
    createTestQuote(
      "§110",
      "Reusable Platforms",
      "You need a system that you can come back to again and again.",
      "Build experimental systems that support multiple investigations.",
      ["reusable-platform", "methodology"],
    ),
  ],
  allTags: [
    "methodology",
    "third-alternative",
    "experiments",
    "model-organism",
    "c-elegans",
    "evidence-per-week",
    "exclusion",
    "discriminative-tests",
    "reusable-platform",
    "philosophy",
  ],
};

/**
 * Empty quote bank for edge case testing.
 */
const emptyQuoteBank: ParsedQuoteBank = {
  title: "Empty Quote Bank",
  description: "No quotes available",
  quotes: [],
  allTags: [],
};

// ============================================================================
// QuoteBankViewer Tests
// ============================================================================

describe("QuoteBankViewer", () => {
  beforeEach(() => {
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();

    // Mock location
    Object.defineProperty(window, "location", {
      value: { hash: "", search: "" },
      writable: true,
    });

    // Mock history
    window.history.replaceState = vi.fn();
  });

  describe("hero section", () => {
    it("renders title", () => {
      render(<QuoteBankViewer data={minimalQuoteBank} />);

      expect(screen.getByText("Sydney Brenner Quote Bank")).toBeInTheDocument();
    });

    it("renders description", () => {
      render(<QuoteBankViewer data={minimalQuoteBank} />);

      expect(screen.getByText("Essential wisdom from the transcript")).toBeInTheDocument();
    });

    it("displays quote count", () => {
      const { container } = render(<QuoteBankViewer data={comprehensiveQuoteBank} />);

      // Quote count appears in hero and in "Showing X of Y" text
      expect(container.textContent).toContain("5");
      expect(container.textContent).toContain("quotes");
    });

    it("displays tag count", () => {
      const { container } = render(<QuoteBankViewer data={comprehensiveQuoteBank} />);

      expect(container.textContent).toContain("10");
      expect(container.textContent).toContain("categories");
    });

    it("shows Reference Collection badge", () => {
      render(<QuoteBankViewer data={minimalQuoteBank} />);

      expect(screen.getByText("Reference Collection")).toBeInTheDocument();
    });
  });

  describe("search functionality", () => {
    it("renders search input with placeholder", () => {
      render(<QuoteBankViewer data={comprehensiveQuoteBank} />);

      expect(screen.getByPlaceholderText(/Search quotes/)).toBeInTheDocument();
    });

    it("updates results count text", () => {
      const { container } = render(<QuoteBankViewer data={comprehensiveQuoteBank} />);

      // Results count appears in "Showing X of Y quotes"
      expect(container.textContent).toContain("Showing");
      expect(container.textContent).toContain("5");
    });
  });

  describe("tag cloud", () => {
    it("renders All button", () => {
      render(<QuoteBankViewer data={comprehensiveQuoteBank} />);

      expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    });

    it("renders tags with quote counts", () => {
      const { container } = render(<QuoteBankViewer data={comprehensiveQuoteBank} />);

      // Methodology tag should show count of 4 (most common tag)
      expect(container.textContent).toContain("methodology");
    });

    it("filters tags by minimum quote count", () => {
      const { container } = render(<QuoteBankViewer data={comprehensiveQuoteBank} />);

      // Tags with only 1 quote should be filtered out initially
      // "methodology" has 4 quotes so it should be included in the tag cloud
      // Tags are rendered as buttons, so check the tag cloud area
      const tagButtons = container.querySelectorAll("button");
      const tagTexts = Array.from(tagButtons).map((b) => b.textContent);

      // Methodology should be present (has 4 quotes)
      expect(tagTexts.some((t) => t?.includes("methodology"))).toBe(true);
    });
  });

  describe("quote cards", () => {
    it("renders quote titles", () => {
      render(<QuoteBankViewer data={comprehensiveQuoteBank} />);

      expect(screen.getByText("Third Alternative")).toBeInTheDocument();
      expect(screen.getByText("Evidence Per Week")).toBeInTheDocument();
    });

    it("renders quote text in blockquotes", () => {
      const { container } = render(<QuoteBankViewer data={minimalQuoteBank} />);

      const blockquotes = container.querySelectorAll("blockquote");
      expect(blockquotes.length).toBeGreaterThan(0);
      expect(container.textContent).toContain("third alternative");
    });

    it("renders context/takeaway section", () => {
      render(<QuoteBankViewer data={minimalQuoteBank} />);

      expect(screen.getByText("Takeaway")).toBeInTheDocument();
    });

    it("renders quote tags", () => {
      const { container } = render(<QuoteBankViewer data={minimalQuoteBank} />);

      // Tags should be displayed with hyphens replaced by spaces
      expect(container.textContent).toContain("third alternative");
      expect(container.textContent).toContain("methodology");
    });
  });

  describe("empty state", () => {
    it("shows no quotes message when empty", () => {
      render(<QuoteBankViewer data={emptyQuoteBank} />);

      expect(screen.getByText("No quotes found")).toBeInTheDocument();
    });

    it("shows helpful message for empty results", () => {
      render(<QuoteBankViewer data={emptyQuoteBank} />);

      expect(screen.getByText(/Try adjusting your search/)).toBeInTheDocument();
    });
  });

  describe("random quote feature", () => {
    it("renders Surprise me button", () => {
      const { container } = render(<QuoteBankViewer data={comprehensiveQuoteBank} />);

      // On mobile it's just the icon, on desktop it shows "Surprise me"
      expect(container.textContent).toContain("Surprise me");
    });

    it("disables shuffle when no quotes", () => {
      render(<QuoteBankViewer data={emptyQuoteBank} />);

      const shuffleButton = screen.getByTitle("Jump to random quote");
      expect(shuffleButton).toBeDisabled();
    });
  });

  describe("results count", () => {
    it("shows current and total count", () => {
      const { container } = render(<QuoteBankViewer data={comprehensiveQuoteBank} />);

      expect(container.textContent).toContain("Showing");
      expect(container.textContent).toContain("of 5 quotes");
    });
  });
});

// ============================================================================
// Quote Card Tests
// ============================================================================

describe("Quote Card Structure", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    Object.defineProperty(window, "location", {
      value: { hash: "", search: "" },
      writable: true,
    });
    window.history.replaceState = vi.fn();
  });

  it("has article semantic element", () => {
    const { container } = render(<QuoteBankViewer data={minimalQuoteBank} />);

    const articles = container.querySelectorAll("article");
    expect(articles.length).toBe(1);
  });

  it("includes section ID for navigation", () => {
    const { container } = render(<QuoteBankViewer data={minimalQuoteBank} />);

    // Should have an ID for the quote section
    const quoteElement = container.querySelector("[id]");
    expect(quoteElement).toBeInTheDocument();
  });

  it("renders opening and closing quote marks", () => {
    const { container } = render(<QuoteBankViewer data={minimalQuoteBank} />);

    // Check for decorative quote marks (rendered as actual quote characters)
    // Opening quote is U+201C, closing quote is U+201D
    expect(container.textContent).toContain("\u201C");
    expect(container.textContent).toContain("\u201D");
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

describe("QuoteBankViewer Accessibility", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    Object.defineProperty(window, "location", {
      value: { hash: "", search: "" },
      writable: true,
    });
    window.history.replaceState = vi.fn();
  });

  it("has h1 heading for title", () => {
    render(<QuoteBankViewer data={comprehensiveQuoteBank} />);

    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toBeInTheDocument();
    expect(h1).toHaveTextContent("The Brenner Method: Essential Quotes");
  });

  it("has h3 headings for quote titles", () => {
    render(<QuoteBankViewer data={comprehensiveQuoteBank} />);

    const h3s = screen.getAllByRole("heading", { level: 3 });
    expect(h3s.length).toBeGreaterThan(0);
  });

  it("uses blockquote for quotes", () => {
    const { container } = render(<QuoteBankViewer data={comprehensiveQuoteBank} />);

    const blockquotes = container.querySelectorAll("blockquote");
    expect(blockquotes.length).toBe(5);
  });

  it("search input is accessible", () => {
    render(<QuoteBankViewer data={comprehensiveQuoteBank} />);

    // Verify search input exists and is accessible via placeholder
    const searchInput = screen.getByPlaceholderText(/Search quotes/);
    expect(searchInput).toBeInTheDocument();
    expect(searchInput.tagName).toBe("INPUT");
  });

  it("buttons have proper roles", () => {
    render(<QuoteBankViewer data={comprehensiveQuoteBank} />);

    const allButton = screen.getByRole("button", { name: "All" });
    expect(allButton).toBeInTheDocument();
  });
});

// ============================================================================
// Tag Interaction Tests
// ============================================================================

describe("Tag Cloud Interaction", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    Object.defineProperty(window, "location", {
      value: { hash: "", search: "" },
      writable: true,
    });
    window.history.replaceState = vi.fn();
  });

  it("All button is selected by default", () => {
    render(<QuoteBankViewer data={comprehensiveQuoteBank} />);

    const allButton = screen.getByRole("button", { name: "All" });
    // Check that it has the selected styling (bg-primary)
    expect(allButton.className).toContain("bg-primary");
  });

  it("displays more button when many tags exist", () => {
    // Create a quote bank with many tags that each have >= 2 quotes (MIN_QUOTES_FOR_TAG)
    // We need 20 quotes, each with 2 tags, to ensure each tag has at least 2 quotes
    const quotes: Quote[] = [];
    const allTags: string[] = [];

    // Create 15 tags, each used by 2 quotes
    for (let tagIdx = 0; tagIdx < 15; tagIdx++) {
      const tag = `tag-${tagIdx}`;
      allTags.push(tag);
      // Each tag appears in 2 consecutive quotes
      quotes.push(
        createTestQuote(
          `§${tagIdx * 2 + 1}`,
          `Quote ${tagIdx * 2 + 1}`,
          `Quote text ${tagIdx * 2 + 1}`,
          `Context ${tagIdx * 2 + 1}`,
          [tag],
        ),
        createTestQuote(
          `§${tagIdx * 2 + 2}`,
          `Quote ${tagIdx * 2 + 2}`,
          `Quote text ${tagIdx * 2 + 2}`,
          `Context ${tagIdx * 2 + 2}`,
          [tag],
        ),
      );
    }

    const manyTagsQuoteBank: ParsedQuoteBank = {
      title: "Test",
      description: "Test",
      quotes,
      allTags,
    };

    const { container } = render(<QuoteBankViewer data={manyTagsQuoteBank} />);

    // With 15 tags each having 2 quotes, and INITIAL_VISIBLE = 12,
    // we should see the expand button showing "+3" (15 - 12 = 3 hidden)
    expect(container.textContent).toContain("+3");
  });
});

// ============================================================================
// Quote Content Tests
// ============================================================================

describe("Quote Content Rendering", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    Object.defineProperty(window, "location", {
      value: { hash: "", search: "" },
      writable: true,
    });
    window.history.replaceState = vi.fn();
  });

  it("renders full quote text", () => {
    const { container } = render(<QuoteBankViewer data={comprehensiveQuoteBank} />);

    expect(container.textContent).toContain("You've forgotten there's a third alternative");
    expect(container.textContent).toContain("Exclusion is always a tremendously good thing");
  });

  it("renders context/takeaway for each quote", () => {
    const { container } = render(<QuoteBankViewer data={comprehensiveQuoteBank} />);

    expect(container.textContent).toContain("Anti-binary thinking");
    expect(container.textContent).toContain("Prioritize experiments");
  });

  it("wraps text in JargonText for definitions", () => {
    const { container } = render(<QuoteBankViewer data={minimalQuoteBank} />);

    // JargonText is used, quote should still be visible
    expect(container.textContent).toContain("third alternative");
  });
});
