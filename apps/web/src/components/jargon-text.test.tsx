/**
 * Unit tests for JargonText components
 *
 * Tests the automatic jargon detection and highlighting system including
 * JargonText, JargonParagraph, and JargonBlockquote components.
 *
 * @see brenner_bot-it7r (bead)
 * @see @/components/jargon-text.tsx
 */

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JargonBlockquote, JargonParagraph, JargonText } from "./jargon-text";

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the jargon library to return predictable matches
vi.mock("@/lib/jargon", () => ({
  findJargonInText: vi.fn((text: string) => {
    const matches: { start: number; end: number; termKey: string }[] = [];

    // Simulate detection of known jargon terms
    const terms = [
      { pattern: /level-split/gi, key: "level-split" },
      { pattern: /third alternative/gi, key: "third-alternative" },
      { pattern: /potency/gi, key: "potency" },
      { pattern: /C\. elegans/gi, key: "c-elegans" },
      { pattern: /decision experiment/gi, key: "decision-experiment" },
    ];

    for (const { pattern, key } of terms) {
      let match;
      // Reset lastIndex for global regex
      pattern.lastIndex = 0;
      while ((match = pattern.exec(text)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          termKey: key,
        });
      }
    }

    // Sort by start position
    matches.sort((a, b) => a.start - b.start);
    return matches;
  }),
}));

// Mock the Jargon component to simplify testing
vi.mock("@/components/jargon", () => ({
  Jargon: ({
    term,
    children,
    className,
  }: {
    term: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <span data-testid={`jargon-${term}`} data-jargon-term={term} className={className}>
      {children}
    </span>
  ),
}));

// Mock matchMedia for tests
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ============================================================================
// JargonText Tests
// ============================================================================

describe("JargonText", () => {
  describe("rendering", () => {
    it("renders as span by default", () => {
      const { container } = render(<JargonText>Simple text</JargonText>);

      expect(container.firstChild?.nodeName).toBe("SPAN");
    });

    it("renders as custom element via 'as' prop", () => {
      const { container } = render(<JargonText as="p">Paragraph text</JargonText>);

      expect(container.firstChild?.nodeName).toBe("P");
    });

    it("renders as div when specified", () => {
      const { container } = render(<JargonText as="div">Div text</JargonText>);

      expect(container.firstChild?.nodeName).toBe("DIV");
    });

    it("applies custom className", () => {
      const { container } = render(<JargonText className="custom-class">Text</JargonText>);

      expect(container.firstChild).toHaveClass("custom-class");
    });

    it("passes through additional props", () => {
      const { container } = render(
        <JargonText data-testid="jargon-wrapper" id="test-id">
          Text
        </JargonText>,
      );

      expect(container.firstChild).toHaveAttribute("data-testid", "jargon-wrapper");
      expect(container.firstChild).toHaveAttribute("id", "test-id");
    });
  });

  describe("jargon detection", () => {
    it("wraps detected jargon terms with Jargon component", () => {
      render(<JargonText>The level-split operator is important.</JargonText>);

      const jargonElement = screen.getByTestId("jargon-level-split");
      expect(jargonElement).toBeInTheDocument();
      expect(jargonElement).toHaveTextContent("level-split");
    });

    it("detects multiple jargon terms in text", () => {
      render(
        <JargonText>Level-split and third alternative are both important concepts.</JargonText>,
      );

      expect(screen.getByTestId("jargon-level-split")).toBeInTheDocument();
      expect(screen.getByTestId("jargon-third-alternative")).toBeInTheDocument();
    });

    it("preserves non-jargon text", () => {
      render(<JargonText>The word potency appears here.</JargonText>);

      expect(screen.getByText(/The word/)).toBeInTheDocument();
      expect(screen.getByText(/appears here/)).toBeInTheDocument();
    });

    it("handles text with no jargon", () => {
      render(<JargonText>This is plain text without special terms.</JargonText>);

      expect(screen.getByText("This is plain text without special terms.")).toBeInTheDocument();
    });

    it("handles text that is only jargon", () => {
      render(<JargonText>potency</JargonText>);

      expect(screen.getByTestId("jargon-potency")).toBeInTheDocument();
    });
  });

  describe("enableJargon prop", () => {
    it("detects jargon by default (enableJargon=true)", () => {
      render(<JargonText>The potency check is important.</JargonText>);

      expect(screen.getByTestId("jargon-potency")).toBeInTheDocument();
    });

    it("skips jargon detection when enableJargon=false", () => {
      render(<JargonText enableJargon={false}>The potency check is important.</JargonText>);

      expect(screen.queryByTestId("jargon-potency")).not.toBeInTheDocument();
      expect(screen.getByText(/The potency check is important/)).toBeInTheDocument();
    });
  });

  describe("highlights prop", () => {
    it("highlights specified terms", () => {
      render(<JargonText highlights={["important"]}>This is an important message.</JargonText>);

      const highlight = screen.getByText("important");
      expect(highlight).toHaveClass("font-semibold", "text-primary");
    });

    it("highlights multiple terms", () => {
      render(<JargonText highlights={["first", "second"]}>The first and second items.</JargonText>);

      expect(screen.getByText("first")).toHaveClass("font-semibold");
      expect(screen.getByText("second")).toHaveClass("font-semibold");
    });

    it("handles overlapping jargon and highlights", () => {
      render(<JargonText highlights={["potency"]}>Check the potency value.</JargonText>);

      // Should have both jargon and highlight styling
      const element = screen.getByTestId("jargon-potency");
      expect(element).toBeInTheDocument();
      expect(element).toHaveClass("font-semibold", "text-primary");
    });

    it("handles empty highlights array", () => {
      render(<JargonText highlights={[]}>Simple text here.</JargonText>);

      expect(screen.getByText(/Simple text here/)).toBeInTheDocument();
    });

    it("handles case-insensitive highlighting", () => {
      render(<JargonText highlights={["IMPORTANT"]}>This is important to know.</JargonText>);

      expect(screen.getByText("important")).toHaveClass("font-semibold");
    });

    it("ignores whitespace-only highlight terms", () => {
      render(<JargonText highlights={["  ", ""]}>Normal text without issues.</JargonText>);

      expect(screen.getByText(/Normal text without issues/)).toBeInTheDocument();
    });
  });

  describe("special characters", () => {
    it("handles C. elegans with dot", () => {
      render(<JargonText>Sydney Brenner studied C. elegans extensively.</JargonText>);

      expect(screen.getByTestId("jargon-c-elegans")).toBeInTheDocument();
    });

    it("handles multi-word jargon terms", () => {
      render(<JargonText>The decision experiment proves the point.</JargonText>);

      expect(screen.getByTestId("jargon-decision-experiment")).toBeInTheDocument();
    });
  });

  describe("memoization", () => {
    it("does not re-render unnecessarily with same props", () => {
      const { rerender } = render(<JargonText>Static text</JargonText>);

      // Rerender with same content
      rerender(<JargonText>Static text</JargonText>);

      expect(screen.getByText(/Static text/)).toBeInTheDocument();
    });
  });
});

// ============================================================================
// JargonParagraph Tests
// ============================================================================

describe("JargonParagraph", () => {
  describe("rendering", () => {
    it("renders as paragraph element", () => {
      const { container } = render(<JargonParagraph>Paragraph content</JargonParagraph>);

      expect(container.firstChild?.nodeName).toBe("P");
    });

    it("applies custom className", () => {
      const { container } = render(
        <JargonParagraph className="custom-paragraph">Content</JargonParagraph>,
      );

      expect(container.firstChild).toHaveClass("custom-paragraph");
    });

    it("detects jargon in paragraph", () => {
      render(<JargonParagraph>The potency is key.</JargonParagraph>);

      expect(screen.getByTestId("jargon-potency")).toBeInTheDocument();
    });

    it("supports highlights prop", () => {
      render(<JargonParagraph highlights={["key"]}>The key point is here.</JargonParagraph>);

      expect(screen.getByText("key")).toHaveClass("font-semibold");
    });
  });

  describe("additional props", () => {
    it("passes through HTML paragraph props", () => {
      const { container } = render(
        <JargonParagraph id="para-1" data-section="intro">
          Content
        </JargonParagraph>,
      );

      expect(container.firstChild).toHaveAttribute("id", "para-1");
      expect(container.firstChild).toHaveAttribute("data-section", "intro");
    });
  });
});

// ============================================================================
// JargonBlockquote Tests
// ============================================================================

describe("JargonBlockquote", () => {
  describe("rendering", () => {
    it("renders as blockquote element", () => {
      const { container } = render(<JargonBlockquote>Quote content</JargonBlockquote>);

      expect(container.firstChild?.nodeName).toBe("BLOCKQUOTE");
    });

    it("applies custom className", () => {
      const { container } = render(
        <JargonBlockquote className="custom-quote">Content</JargonBlockquote>,
      );

      expect(container.firstChild).toHaveClass("custom-quote");
    });

    it("detects jargon in blockquote", () => {
      render(<JargonBlockquote>The third alternative is crucial.</JargonBlockquote>);

      expect(screen.getByTestId("jargon-third-alternative")).toBeInTheDocument();
    });

    it("supports highlights prop", () => {
      render(
        <JargonBlockquote highlights={["crucial"]}>This is a crucial quote.</JargonBlockquote>,
      );

      expect(screen.getByText("crucial")).toHaveClass("font-semibold");
    });
  });

  describe("additional props", () => {
    it("passes through HTML blockquote props", () => {
      const { container } = render(
        <JargonBlockquote cite="source.html" id="quote-1">
          Content
        </JargonBlockquote>,
      );

      expect(container.firstChild).toHaveAttribute("cite", "source.html");
      expect(container.firstChild).toHaveAttribute("id", "quote-1");
    });
  });
});

// ============================================================================
// Segment Rendering Tests
// ============================================================================

describe("Text Segmentation", () => {
  describe("segment types", () => {
    it("renders plain text segments as spans", () => {
      const { container } = render(<JargonText>Plain text only</JargonText>);

      const spans = container.querySelectorAll("span span");
      expect(spans.length).toBeGreaterThan(0);
    });

    it("renders jargon segments with Jargon component", () => {
      render(<JargonText>Contains potency term.</JargonText>);

      const jargon = screen.getByTestId("jargon-potency");
      expect(jargon).toHaveAttribute("data-jargon-term", "potency");
    });

    it("renders highlight segments with highlight classes", () => {
      render(<JargonText highlights={["special"]}>A special word here.</JargonText>);

      const highlight = screen.getByText("special");
      expect(highlight).toHaveClass("bg-primary/10", "px-0.5", "rounded");
    });

    it("renders jargon-highlight segments with both treatments", () => {
      render(<JargonText highlights={["potency"]}>Check potency levels.</JargonText>);

      const element = screen.getByTestId("jargon-potency");
      expect(element).toHaveClass("font-semibold");
      expect(element).toHaveTextContent("potency");
    });
  });

  describe("complex text", () => {
    it("handles text with multiple segment types", () => {
      render(
        <JargonText highlights={["important"]}>
          The level-split is important for understanding potency.
        </JargonText>,
      );

      // Has jargon
      expect(screen.getByTestId("jargon-level-split")).toBeInTheDocument();
      expect(screen.getByTestId("jargon-potency")).toBeInTheDocument();

      // Has highlight
      expect(screen.getByText("important")).toHaveClass("font-semibold");
    });

    it("preserves text order correctly", () => {
      render(<JargonText>Before potency after</JargonText>);

      const text = screen.getByText(/Before/).closest("span");
      expect(text?.textContent).toContain("Before");
      expect(text?.parentElement?.textContent).toContain("potency");
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      const { container } = render(<JargonText>{""}</JargonText>);

      expect(container.firstChild).toBeInTheDocument();
      expect(container.firstChild?.textContent).toBe("");
    });

    it("handles single character", () => {
      render(<JargonText>X</JargonText>);

      expect(screen.getByText("X")).toBeInTheDocument();
    });

    it("handles text with only whitespace", () => {
      const { container } = render(<JargonText>{"   "}</JargonText>);

      // Should render without error; whitespace is preserved in the DOM
      expect(container.firstChild).toBeInTheDocument();
      expect(container.textContent).toBe("   ");
    });

    it("handles consecutive jargon terms", () => {
      render(<JargonText>potency level-split together</JargonText>);

      expect(screen.getByTestId("jargon-potency")).toBeInTheDocument();
      expect(screen.getByTestId("jargon-level-split")).toBeInTheDocument();
    });
  });
});
