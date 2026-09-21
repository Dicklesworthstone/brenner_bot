/**
 * DistillationViewer Component Tests
 *
 * Tests the distillation document viewer using real DOM rendering via happy-dom.
 * Philosophy: NO mocks - test real component behavior with realistic data.
 *
 * Run with: cd apps/web && bun run test -- src/components/distillation/DistillationViewer.test.tsx
 */

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  DistillationPart,
  DistillationSection,
  ParsedDistillation,
} from "@/lib/distillation-parser";
import { DistillationHero, DistillationViewer } from "./DistillationViewer";

// ============================================================================
// Test Fixtures - Realistic ParsedDistillation data
// ============================================================================

function createTestSection(
  level: 1 | 2 | 3 | 4,
  title: string,
  content: DistillationSection["content"] = [],
): DistillationSection {
  return { level, title, content };
}

function createTestPart(
  number: number,
  title: string,
  sections: DistillationSection[] = [],
): DistillationPart {
  return { number, title, sections };
}

/**
 * Minimal distillation fixture for basic rendering tests.
 */
const minimalDistillation: ParsedDistillation = {
  title: "Brenner Method Distillation",
  author: "Opus 4.5",
  subtitle: "A synthesis of scientific methodology",
  wordCount: 5000,
  parts: [
    createTestPart(1, "Introduction", [
      createTestSection(1, "The Two Axioms", [
        {
          type: "paragraph",
          text: "Reality has a generative grammar. The world is produced by causal machinery.",
        },
        { type: "quote", text: "You've forgotten there's a third alternative.", reference: "§103" },
      ]),
    ]),
  ],
};

/**
 * Comprehensive distillation with multiple parts and sections.
 */
const comprehensiveDistillation: ParsedDistillation = {
  title: "Final Distillation of the Brenner Method",
  author: "Claude Opus 4.5",
  subtitle: "Deep philosophical synthesis",
  preamble: "This document synthesizes Sydney Brenner's methodology.",
  wordCount: 12500,
  parts: [
    createTestPart(1, "Foundations", [
      createTestSection(1, "Two Axioms of the Method", [
        { type: "paragraph", text: "Brenner's approach rests on two fundamental assumptions." },
        {
          type: "list",
          items: ["Axiom 1: Reality has structure", "Axiom 2: Structure is discoverable"],
          ordered: true,
        },
      ]),
      createTestSection(2, "Operator Algebra", [
        { type: "paragraph", text: "The method employs a set of mental operators." },
        { type: "list", items: ["⊘ Level-split", "✂ Exclusion-test", "𝓛 Recode"], ordered: false },
      ]),
    ]),
    createTestPart(2, "Practice", [
      createTestSection(1, "The Brenner Loop", [
        { type: "paragraph", text: "The loop consists of hunt, formulate, test, and kill phases." },
        {
          type: "quote",
          text: "Exclusion is always a tremendously good thing in science.",
          reference: "§105",
        },
      ]),
      createTestSection(2, "Discriminative Tests", [
        { type: "paragraph", text: "Design tests that can exclude, not just confirm." },
        { type: "paragraph", text: "The key is evidence per week." },
      ]),
      createTestSection(3, "Third Alternative", [
        { type: "paragraph", text: "Always ask: what if both options are wrong?" },
        { type: "quote", text: "Both could be wrong.", reference: "§103" },
      ]),
    ]),
    createTestPart(3, "Applications", [
      createTestSection(1, "Model Organism Selection", [
        { type: "paragraph", text: "C. elegans was chosen for specific reasons." },
        { type: "code", text: "959 somatic cells, exactly determined" },
      ]),
    ]),
  ],
};

/**
 * Distillation with only raw content (fallback mode).
 */
const rawContentDistillation: ParsedDistillation = {
  title: "Unparsed Distillation",
  author: "Test",
  wordCount: 500,
  parts: [],
  rawContent: "This is raw unparsed content that should be displayed as a fallback.",
};

// ============================================================================
// DistillationHero Component Tests
// ============================================================================

describe("DistillationHero", () => {
  it("renders title correctly", () => {
    render(
      <DistillationHero
        title="Brenner Method Distillation"
        wordCount={5000}
        docId="distillation-opus-45"
      />,
    );

    expect(screen.getByText("Brenner Method Distillation")).toBeInTheDocument();
  });

  it("calculates and displays read time", () => {
    render(<DistillationHero title="Test" wordCount={5000} docId="distillation-opus-45" />);

    // 5000 words / 200 wpm = 25 min read
    expect(screen.getByText("25 min")).toBeInTheDocument();
  });

  it("displays word count formatted", () => {
    render(<DistillationHero title="Test" wordCount={12500} docId="distillation-opus-45" />);

    // Should show formatted word count
    expect(screen.getByText(/12/)).toBeInTheDocument();
  });

  it("shows model name for opus-45", () => {
    render(<DistillationHero title="Test" wordCount={1000} docId="distillation-opus-45" />);

    expect(screen.getByText("Claude Opus 4.5")).toBeInTheDocument();
  });

  it("shows model name for gpt-52", () => {
    render(<DistillationHero title="Test" wordCount={1000} docId="distillation-gpt-52" />);

    expect(screen.getByText("GPT-5.2")).toBeInTheDocument();
  });

  it("shows model name for gemini-3", () => {
    render(<DistillationHero title="Test" wordCount={1000} docId="distillation-gemini-3" />);

    expect(screen.getByText("Gemini 3")).toBeInTheDocument();
  });

  it("displays key strengths", () => {
    render(<DistillationHero title="Test" wordCount={1000} docId="distillation-opus-45" />);

    // Opus 4.5 has specific strengths defined
    expect(screen.getByText(/third alternative/i)).toBeInTheDocument();
  });
});

// ============================================================================
// DistillationViewer Component Tests
// ============================================================================

describe("DistillationViewer", () => {
  // Mock window scroll for testing
  beforeEach(() => {
    // Reset scroll position
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 2000,
      writable: true,
    });
    Object.defineProperty(window, "innerHeight", { value: 800, writable: true });

    // Mock location hash
    Object.defineProperty(window, "location", {
      value: { hash: "" },
      writable: true,
    });

    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  describe("basic rendering", () => {
    it("renders minimal distillation", () => {
      render(<DistillationViewer data={minimalDistillation} docId="distillation-opus-45" />);

      // Check title is rendered
      expect(screen.getByText("Brenner Method Distillation")).toBeInTheDocument();
    });

    it("renders section titles", () => {
      render(<DistillationViewer data={minimalDistillation} docId="distillation-opus-45" />);

      expect(screen.getByText("The Two Axioms")).toBeInTheDocument();
    });

    it("renders paragraph content", () => {
      const { container } = render(
        <DistillationViewer data={minimalDistillation} docId="distillation-opus-45" />,
      );

      // Content may be split by JargonText spans, so check container HTML
      expect(container.textContent).toContain("Reality has a generative grammar");
    });

    it("renders quote content with reference", () => {
      const { container } = render(
        <DistillationViewer data={minimalDistillation} docId="distillation-opus-45" />,
      );

      // Content may be split by JargonText spans
      expect(container.textContent).toContain("third alternative");
    });
  });

  describe("comprehensive content", () => {
    it("renders multiple parts", () => {
      const { container } = render(
        <DistillationViewer data={comprehensiveDistillation} docId="distillation-opus-45" />,
      );

      // Parts appear in TOC and as headings, so check container text content
      // which will have them all rendered
      expect(container.textContent).toContain("Foundations");
      expect(container.textContent).toContain("Practice");
      expect(container.textContent).toContain("Applications");

      // Verify we have the expected number of h2 part headings
      const partHeadings = container.querySelectorAll("h2");
      expect(partHeadings.length).toBeGreaterThanOrEqual(3);
    });

    it("renders ordered lists", () => {
      const { container } = render(
        <DistillationViewer data={comprehensiveDistillation} docId="distillation-opus-45" />,
      );

      // List items may be wrapped by JargonText spans, check full container
      expect(container.textContent).toContain("Axiom 1: Reality has structure");
      expect(container.textContent).toContain("Axiom 2: Structure is discoverable");

      // Also verify there's an ordered list element
      const orderedLists = container.querySelectorAll("ol");
      expect(orderedLists.length).toBeGreaterThan(0);
    });

    it("renders unordered lists", () => {
      const { container } = render(
        <DistillationViewer data={comprehensiveDistillation} docId="distillation-opus-45" />,
      );

      // List items may be wrapped by JargonText spans
      expect(container.textContent).toContain("⊘ Level-split");
      expect(container.textContent).toContain("✂ Exclusion-test");

      // Also verify there's an unordered list element
      const unorderedLists = container.querySelectorAll("ul");
      expect(unorderedLists.length).toBeGreaterThan(0);
    });

    it("renders code blocks", () => {
      const { container } = render(
        <DistillationViewer data={comprehensiveDistillation} docId="distillation-opus-45" />,
      );

      expect(container.textContent).toContain("959 somatic cells");
    });

    it("renders all paragraph content including key phrases", () => {
      const { container } = render(
        <DistillationViewer data={comprehensiveDistillation} docId="distillation-opus-45" />,
      );

      // Key Brenner phrase should be present
      expect(container.textContent).toContain("evidence per week");
    });
  });

  describe("table of contents", () => {
    it("shows TOC for documents with many sections", () => {
      const { container } = render(
        <DistillationViewer data={comprehensiveDistillation} docId="distillation-opus-45" />,
      );

      // TOC should be visible for documents with > 3 sections
      // The TOC contains section titles
      const nav = container.querySelector("nav");
      expect(nav).toBeInTheDocument();
    });

    it("hides TOC for documents with few sections", () => {
      const { container } = render(
        <DistillationViewer data={minimalDistillation} docId="distillation-opus-45" />,
      );

      // Minimal distillation has only 1 section, TOC should be hidden
      // The TOC nav element should not be present for small documents
      const nav = container.querySelector("nav");
      expect(nav).not.toBeInTheDocument();
    });
  });

  describe("raw content fallback", () => {
    it("renders raw content when no parts available", () => {
      render(<DistillationViewer data={rawContentDistillation} docId="distillation-opus-45" />);

      expect(screen.getByText(/raw unparsed content/)).toBeInTheDocument();
    });
  });

  describe("progress indicator", () => {
    it("renders progress bar", () => {
      const { container } = render(
        <DistillationViewer data={comprehensiveDistillation} docId="distillation-opus-45" />,
      );

      // Progress bar should exist
      const progressBar = container.querySelector(".fixed.top-0");
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe("model theming", () => {
    it("applies opus theme colors", () => {
      const { container } = render(
        <DistillationViewer data={minimalDistillation} docId="distillation-opus-45" />,
      );

      // Check for violet theme class (opus theme)
      expect(container.innerHTML).toContain("violet");
    });

    it("applies gpt theme colors", () => {
      const { container } = render(
        <DistillationViewer data={minimalDistillation} docId="distillation-gpt-52" />,
      );

      // Check for emerald theme class (gpt theme)
      expect(container.innerHTML).toContain("emerald");
    });

    it("applies gemini theme colors", () => {
      const { container } = render(
        <DistillationViewer data={minimalDistillation} docId="distillation-gemini-3" />,
      );

      // Check for blue theme class (gemini theme)
      expect(container.innerHTML).toContain("blue");
    });
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

describe("DistillationViewer Accessibility", () => {
  it("has proper heading hierarchy", () => {
    render(<DistillationViewer data={comprehensiveDistillation} docId="distillation-opus-45" />);

    // Should have h1 for title
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toBeInTheDocument();
  });

  it("uses semantic list elements", () => {
    const { container } = render(
      <DistillationViewer data={comprehensiveDistillation} docId="distillation-opus-45" />,
    );

    // Should have ordered and unordered lists
    const orderedLists = container.querySelectorAll("ol");
    const unorderedLists = container.querySelectorAll("ul");

    expect(orderedLists.length).toBeGreaterThan(0);
    expect(unorderedLists.length).toBeGreaterThan(0);
  });

  it("blockquotes have proper semantics", () => {
    const { container } = render(
      <DistillationViewer data={minimalDistillation} docId="distillation-opus-45" />,
    );

    const blockquotes = container.querySelectorAll("blockquote");
    expect(blockquotes.length).toBeGreaterThan(0);
  });
});
