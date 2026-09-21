/**
 * TranscriptViewer Component Tests
 *
 * Tests the transcript document viewer using real DOM rendering via happy-dom.
 * Philosophy: NO mocks - test real component behavior with realistic data.
 *
 * Run with: cd apps/web && bun run test -- src/components/transcript/TranscriptViewer.test.tsx
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ParsedTranscript,
  TranscriptContent,
  TranscriptSection as TSection,
} from "@/lib/transcript-parser";
import {
  ReadingProgress,
  TableOfContents,
  TranscriptHero,
  TranscriptSection,
} from "./TranscriptViewer";

// ============================================================================
// Test Fixtures - Realistic ParsedTranscript data
// ============================================================================

function createTestContent(
  type: "brenner-quote" | "interviewer-question" | "paragraph",
  text: string,
  highlights?: string[],
): TranscriptContent {
  return { type, text, highlights };
}

function createTestSection(
  number: number,
  title: string,
  content: TranscriptContent[] = [],
): TSection {
  return { number, title, content };
}

/**
 * Comprehensive transcript with multiple sections and content types.
 */
const comprehensiveTranscript: ParsedTranscript = {
  title: "A Life in Science",
  subtitle: "Sydney Brenner in Conversation with Lewis Wolpert",
  totalSections: 8,
  sections: [
    createTestSection(58, "Reducing Complexity", [
      createTestContent(
        "brenner-quote",
        "The key thing about the genetics of behaviour is that you can make behaviour by just deleting things.",
      ),
      createTestContent("paragraph", "This insight led to the choice of C. elegans."),
    ]),
    createTestSection(103, "Third Alternative", [
      createTestContent("interviewer-question", "What about the two competing theories?"),
      createTestContent(
        "brenner-quote",
        "You've forgotten there's a third alternative: both could be wrong.",
      ),
      createTestContent(
        "paragraph",
        "This anti-binary thinking is central to Brenner's methodology.",
      ),
    ]),
    createTestSection(105, "Evidence Per Week", [
      createTestContent(
        "brenner-quote",
        "Exclusion is always a tremendously good thing in science.",
        ["Exclusion"],
      ),
      createTestContent("paragraph", "The emphasis on rapid iteration and falsification."),
    ]),
    createTestSection(107, "Model Organism Selection", [
      createTestContent(
        "brenner-quote",
        "We needed something with a nervous system simple enough to trace.",
      ),
      createTestContent("paragraph", "C. elegans has exactly 959 somatic cells."),
    ]),
    createTestSection(110, "Experimental Platform", [
      createTestContent("interviewer-question", "How did you design your experiments?"),
      createTestContent(
        "brenner-quote",
        "The experiment must be designed to exclude, not to confirm.",
      ),
    ]),
  ],
};

// Note: rawContentTranscript fixture removed - TranscriptViewer component
// exports individual subcomponents (TranscriptHero, TableOfContents, etc.)
// rather than a unified viewer with raw content fallback handling.

// ============================================================================
// TranscriptHero Component Tests
// ============================================================================

describe("TranscriptHero", () => {
  it("renders title correctly", () => {
    render(
      <TranscriptHero
        title="A Life in Science"
        subtitle="Sydney Brenner in Conversation"
        totalSections={8}
        estimatedReadTime="45 min"
        wordCount="12.5k"
      />,
    );

    expect(screen.getByText("A Life in Science")).toBeInTheDocument();
  });

  it("renders subtitle", () => {
    render(
      <TranscriptHero
        title="Test"
        subtitle="Sydney Brenner in Conversation"
        totalSections={8}
        estimatedReadTime="45 min"
        wordCount="12.5k"
      />,
    );

    expect(screen.getByText("Sydney Brenner in Conversation")).toBeInTheDocument();
  });

  it("displays section count", () => {
    render(
      <TranscriptHero
        title="Test"
        subtitle="Subtitle"
        totalSections={8}
        estimatedReadTime="45 min"
        wordCount="12.5k"
      />,
    );

    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("displays read time", () => {
    render(
      <TranscriptHero
        title="Test"
        subtitle="Subtitle"
        totalSections={8}
        estimatedReadTime="45 min"
        wordCount="12.5k"
      />,
    );

    expect(screen.getByText("45 min")).toBeInTheDocument();
  });

  it("displays word count", () => {
    render(
      <TranscriptHero
        title="Test"
        subtitle="Subtitle"
        totalSections={8}
        estimatedReadTime="45 min"
        wordCount="12.5k"
      />,
    );

    expect(screen.getByText("12.5k")).toBeInTheDocument();
  });

  it("shows Primary Source badge", () => {
    render(
      <TranscriptHero
        title="Test"
        subtitle="Subtitle"
        totalSections={8}
        estimatedReadTime="45 min"
        wordCount="12.5k"
      />,
    );

    expect(screen.getByText("Primary Source")).toBeInTheDocument();
  });

  it("collapses when isCollapsed is true", () => {
    const { container } = render(
      <TranscriptHero
        title="Test"
        subtitle="Subtitle"
        totalSections={8}
        estimatedReadTime="45 min"
        wordCount="12.5k"
        isCollapsed={true}
      />,
    );

    // Check for collapse classes
    expect(container.innerHTML).toContain("max-h-0");
    expect(container.innerHTML).toContain("opacity-0");
  });
});

// ============================================================================
// TableOfContents Component Tests
// ============================================================================

describe("TableOfContents", () => {
  const sections = comprehensiveTranscript.sections;
  const mockOnSectionClick = vi.fn();

  beforeEach(() => {
    mockOnSectionClick.mockClear();
  });

  it("renders all section titles", () => {
    const { container } = render(
      <TableOfContents sections={sections} activeSection={0} onSectionClick={mockOnSectionClick} />,
    );

    expect(container.textContent).toContain("Reducing Complexity");
    expect(container.textContent).toContain("Third Alternative");
    expect(container.textContent).toContain("Evidence Per Week");
  });

  it("renders section numbers", () => {
    const { container } = render(
      <TableOfContents sections={sections} activeSection={0} onSectionClick={mockOnSectionClick} />,
    );

    expect(container.textContent).toContain("58.");
    expect(container.textContent).toContain("103.");
    expect(container.textContent).toContain("105.");
  });

  it("shows Contents header", () => {
    render(
      <TableOfContents sections={sections} activeSection={0} onSectionClick={mockOnSectionClick} />,
    );

    expect(screen.getByText("Contents")).toBeInTheDocument();
  });

  it("has mobile toggle button", () => {
    render(
      <TableOfContents sections={sections} activeSection={0} onSectionClick={mockOnSectionClick} />,
    );

    expect(screen.getByText("Table of Contents")).toBeInTheDocument();
  });
});

// ============================================================================
// ReadingProgress Component Tests
// ============================================================================

describe("ReadingProgress", () => {
  it("renders progress bar at 0%", () => {
    const { container } = render(<ReadingProgress progress={0} />);

    const progressBar = container.querySelector(".fixed.top-0");
    expect(progressBar).toBeInTheDocument();
  });

  it("renders progress bar at 50%", () => {
    const { container } = render(<ReadingProgress progress={50} />);

    expect(container.innerHTML).toContain("width: 50%");
  });

  it("renders progress bar at 100%", () => {
    const { container } = render(<ReadingProgress progress={100} />);

    expect(container.innerHTML).toContain("width: 100%");
  });

  it("uses gradient styling", () => {
    const { container } = render(<ReadingProgress progress={50} />);

    expect(container.innerHTML).toContain("bg-gradient-to-r");
    expect(container.innerHTML).toContain("from-primary");
  });
});

// ============================================================================
// TranscriptSection Component Tests
// ============================================================================

describe("TranscriptSection", () => {
  const testSection = createTestSection(103, "Third Alternative", [
    createTestContent("interviewer-question", "What about the two competing theories?"),
    createTestContent(
      "brenner-quote",
      "You've forgotten there's a third alternative: both could be wrong.",
    ),
    createTestContent(
      "paragraph",
      "This anti-binary thinking is central to Brenner's methodology.",
    ),
  ]);

  beforeEach(() => {
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("renders section title", () => {
    render(<TranscriptSection section={testSection} isActive={false} />);

    expect(screen.getByText("Third Alternative")).toBeInTheDocument();
  });

  it("renders section number prominently", () => {
    render(<TranscriptSection section={testSection} isActive={false} />);

    expect(screen.getByText("103")).toBeInTheDocument();
  });

  it("renders Brenner quote with SB badge", () => {
    const { container } = render(<TranscriptSection section={testSection} isActive={false} />);

    // Brenner quote content
    expect(container.textContent).toContain("third alternative");
    // Sydney Brenner badge
    expect(screen.getByText("SB")).toBeInTheDocument();
    expect(screen.getByText("Sydney Brenner")).toBeInTheDocument();
  });

  it("renders interviewer question with Q badge", () => {
    render(<TranscriptSection section={testSection} isActive={false} />);

    expect(screen.getByText("Q")).toBeInTheDocument();
  });

  it("renders paragraph content", () => {
    const { container } = render(<TranscriptSection section={testSection} isActive={false} />);

    expect(container.textContent).toContain("anti-binary thinking");
  });

  it("has proper section ID for navigation", () => {
    const { container } = render(<TranscriptSection section={testSection} isActive={false} />);

    const sectionEl = container.querySelector("#section-103");
    expect(sectionEl).toBeInTheDocument();
  });

  it("renders copy buttons for citation and excerpt", () => {
    const { container } = render(<TranscriptSection section={testSection} isActive={false} />);

    // Should have copy buttons (they render with § anchor text)
    expect(container.textContent).toContain("§103");
    expect(container.textContent).toContain("Excerpt");
  });

  it("applies highlight flash when isHighlighted is true", () => {
    const { container } = render(
      <TranscriptSection section={testSection} isActive={false} isHighlighted={true} />,
    );

    expect(container.innerHTML).toContain("animate-highlight-flash");
  });
});

// ============================================================================
// Content Type Tests
// ============================================================================

describe("TranscriptSection Content Types", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("renders multiple brenner quotes", () => {
    const section = createTestSection(1, "Test", [
      createTestContent("brenner-quote", "First quote from Brenner."),
      createTestContent("brenner-quote", "Second quote from Brenner."),
    ]);

    const { container } = render(<TranscriptSection section={section} isActive={false} />);

    expect(container.textContent).toContain("First quote from Brenner");
    expect(container.textContent).toContain("Second quote from Brenner");
  });

  it("renders highlighted text in quotes", () => {
    const section = createTestSection(1, "Test", [
      createTestContent("brenner-quote", "Exclusion is key.", ["Exclusion"]),
    ]);

    const { container } = render(<TranscriptSection section={section} isActive={false} />);

    expect(container.textContent).toContain("Exclusion is key");
  });

  it("renders search highlights when provided", () => {
    const section = createTestSection(1, "Test", [
      createTestContent("paragraph", "The evidence per week concept."),
    ]);

    const { container } = render(
      <TranscriptSection section={section} isActive={false} searchHighlights={["evidence"]} />,
    );

    expect(container.textContent).toContain("evidence per week");
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

describe("TranscriptViewer Accessibility", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("TranscriptHero has h1 heading", () => {
    render(
      <TranscriptHero
        title="A Life in Science"
        subtitle="Subtitle"
        totalSections={8}
        estimatedReadTime="45 min"
        wordCount="12.5k"
      />,
    );

    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toBeInTheDocument();
    expect(h1).toHaveTextContent("A Life in Science");
  });

  it("TranscriptSection has h2 heading for section title", () => {
    const section = createTestSection(1, "Test Section", []);

    render(<TranscriptSection section={section} isActive={false} />);

    const h2 = screen.getByRole("heading", { level: 2 });
    expect(h2).toBeInTheDocument();
    expect(h2).toHaveTextContent("Test Section");
  });

  it("TableOfContents uses nav element", () => {
    const { container } = render(
      <TableOfContents
        sections={comprehensiveTranscript.sections}
        activeSection={0}
        onSectionClick={vi.fn()}
      />,
    );

    const nav = container.querySelector("nav");
    expect(nav).toBeInTheDocument();
  });

  it("collapsed hero has aria-hidden", () => {
    const { container } = render(
      <TranscriptHero
        title="Test"
        subtitle="Subtitle"
        totalSections={8}
        estimatedReadTime="45 min"
        wordCount="12.5k"
        isCollapsed={true}
      />,
    );

    const heroContainer = container.firstChild as HTMLElement;
    expect(heroContainer).toHaveAttribute("aria-hidden", "true");
  });
});
