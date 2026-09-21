/**
 * Unit tests for Jargon component
 *
 * Tests the Jargon component's rendering, tooltip behavior, bottom sheet,
 * and accessibility features.
 * Philosophy: NO mocks - test real component behavior with real dictionary data.
 *
 * @see @/components/jargon.tsx
 */

import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Jargon } from "@/components/jargon";
import { getJargon, jargonDictionary } from "@/lib/jargon";

// Mock matchMedia for mobile detection
function mockMatchMedia(isMobile: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(max-width: 768px)" ? isMobile : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function requireJargonTerm(term: ReturnType<typeof getJargon>, key: string) {
  if (!term) {
    throw new Error(`Expected jargon term to exist: ${key}`);
  }
  return term;
}

describe("Jargon", () => {
  beforeEach(() => {
    // Default to desktop mode
    mockMatchMedia(false);
  });

  describe("rendering", () => {
    it("renders known term with dotted underline styling", () => {
      render(<Jargon term="c-elegans" />);
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass("decoration-dotted");
      expect(button).toHaveClass("underline");
    });

    it("displays term name from dictionary by default", () => {
      const term = requireJargonTerm(getJargon("c-elegans"), "c-elegans");
      render(<Jargon term="c-elegans" />);
      expect(screen.getByRole("button")).toHaveTextContent(term.term);
    });

    it("renders unknown term without jargon styling", () => {
      const { container } = render(<Jargon term="nonexistent-term">Fallback Text</Jargon>);
      const span = within(container).getByText("Fallback Text");
      expect(span.tagName).toBe("SPAN");
      expect(span).not.toHaveClass("decoration-dotted");
    });

    it("uses children as fallback for unknown terms", () => {
      render(<Jargon term="unknown">Custom Text</Jargon>);
      expect(screen.getByText("Custom Text")).toBeInTheDocument();
    });

    it("uses term key as fallback if no children provided for unknown term", () => {
      render(<Jargon term="unknown-key" />);
      expect(screen.getByText("unknown-key")).toBeInTheDocument();
    });

    it("allows custom children to override default display", () => {
      render(<Jargon term="c-elegans">Worm</Jargon>);
      expect(screen.getByRole("button")).toHaveTextContent("Worm");
    });

    it("applies custom className", () => {
      render(<Jargon term="c-elegans" className="custom-class" />);
      expect(screen.getByRole("button")).toHaveClass("custom-class");
    });

    it("has cursor-help styling", () => {
      render(<Jargon term="level-split" />);
      expect(screen.getByRole("button")).toHaveClass("cursor-help");
    });
  });

  describe("desktop tooltip behavior", () => {
    beforeEach(() => {
      mockMatchMedia(false); // Desktop mode
    });

    it("shows tooltip on focus", async () => {
      render(<Jargon term="recode" />);
      const button = screen.getByRole("button");

      act(() => {
        button.focus();
      });

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /view full entry/i })).toBeInTheDocument();
      });
    });

    it("displays analogy section when present", async () => {
      const term = requireJargonTerm(getJargon("level-split"), "level-split");
      expect(term.analogy).toBeTruthy();

      render(<Jargon term="level-split" />);

      act(() => {
        screen.getByRole("button").focus();
      });

      await waitFor(() => {
        expect(screen.getByText(/think of it like:/i)).toBeInTheDocument();
      });
    });

    it("displays short definition in tooltip", async () => {
      const term = requireJargonTerm(getJargon("level-split"), "level-split");
      render(<Jargon term="level-split" />);

      act(() => {
        screen.getByRole("button").focus();
      });

      await waitFor(() => {
        expect(screen.getByText(term.short)).toBeInTheDocument();
      });
    });

    it("hides tooltip on blur", async () => {
      render(<Jargon term="recode" />);
      const button = screen.getByRole("button");

      act(() => {
        button.focus();
      });

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /view full entry/i })).toBeInTheDocument();
      });

      act(() => {
        button.blur();
      });

      await waitFor(() => {
        expect(screen.queryByRole("link", { name: /view full entry/i })).not.toBeInTheDocument();
      });
    });

    it("includes glossary link in tooltip", async () => {
      render(<Jargon term="potency" />);

      act(() => {
        screen.getByRole("button").focus();
      });

      await waitFor(() => {
        const link = screen.getByRole("link", { name: /view full entry/i });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", expect.stringContaining("/glossary#"));
      });
    });
  });

  describe("mobile bottom sheet behavior", () => {
    beforeEach(() => {
      mockMatchMedia(true); // Mobile mode
    });

    it("opens sheet on tap", async () => {
      const user = userEvent.setup();
      render(<Jargon term="c-elegans" />);

      await user.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });
    });

    it("displays term name as sheet title", async () => {
      const user = userEvent.setup();
      const term = requireJargonTerm(getJargon("c-elegans"), "c-elegans");
      render(<Jargon term="c-elegans" />);

      await user.click(screen.getByRole("button"));

      await waitFor(() => {
        // Term appears in both button and sheet title - check for heading
        const heading = screen.getByRole("heading", { name: term.term });
        expect(heading).toBeInTheDocument();
      });
    });

    it("displays full long explanation in sheet", async () => {
      const user = userEvent.setup();
      const term = requireJargonTerm(getJargon("c-elegans"), "c-elegans");
      render(<Jargon term="c-elegans" />);

      await user.click(screen.getByRole("button"));

      await waitFor(() => {
        expect(screen.getByText(term.long)).toBeInTheDocument();
      });
    });

    it("closes sheet on X button click", async () => {
      const user = userEvent.setup();
      render(<Jargon term="recode" />);

      // Open sheet
      await user.click(screen.getByRole("button", { name: /recode/i }));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Close with X button
      await user.click(screen.getByRole("button", { name: /close/i }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("displays analogy section when present", async () => {
      const user = userEvent.setup();
      const term = requireJargonTerm(getJargon("level-split"), "level-split");
      render(<Jargon term="level-split" />);

      await user.click(screen.getByRole("button"));

      // Term should have an analogy, check for its content
      expect(term.analogy).toBeTruthy();
      await waitFor(() => {
        // The section heading is "Think of it like..."
        expect(screen.getByText("Think of it like...")).toBeInTheDocument();
      });
    });

    it("displays why section when present", async () => {
      const user = userEvent.setup();
      const term = requireJargonTerm(getJargon("c-elegans"), "c-elegans");
      render(<Jargon term="c-elegans" />);

      await user.click(screen.getByRole("button"));

      // Term should have a why field
      expect(term.why).toBeTruthy();
      await waitFor(() => {
        expect(screen.getByText(/why it matters/i)).toBeInTheDocument();
      });
    });

    it("displays related terms when present", async () => {
      const user = userEvent.setup();
      const term = requireJargonTerm(getJargon("level-split"), "level-split");
      render(<Jargon term="level-split" />);

      await user.click(screen.getByRole("button"));

      if (term.related && term.related.length > 0) {
        await waitFor(() => {
          expect(screen.getByText(/related terms/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe("accessibility", () => {
    it("has button role for trigger", () => {
      render(<Jargon term="potency" />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("sheet has proper dialog role and aria-modal", async () => {
      const user = userEvent.setup();
      mockMatchMedia(true);
      render(<Jargon term="c-elegans" />);

      await user.click(screen.getByRole("button"));

      const dialog = await screen.findByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
    });

    it("sheet has aria-labelledby pointing to title", async () => {
      const user = userEvent.setup();
      mockMatchMedia(true);
      render(<Jargon term="c-elegans" />);

      await user.click(screen.getByRole("button"));

      const dialog = await screen.findByRole("dialog");
      const labelledBy = dialog.getAttribute("aria-labelledby");
      expect(labelledBy).toMatch(/^jargon-sheet-title-/);
      if (!labelledBy) throw new Error("Expected dialog to have aria-labelledby");
      expect(document.getElementById(labelledBy)).toBeTruthy();
    });

    it("has proper focus ring styles", () => {
      render(<Jargon term="potency" />);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("focus-visible:ring-2");
      expect(button).toHaveClass("focus-visible:ring-primary");
    });
  });

  describe("edge cases", () => {
    it("handles terms with spaces in the key", () => {
      // This shouldn't happen in practice since keys use hyphens,
      // but component should handle gracefully
      render(<Jargon term="level split">Level Split</Jargon>);
      expect(screen.getByRole("button")).toHaveTextContent("Level Split");
    });

    it("renders multiple Jargon components independently", () => {
      render(
        <div>
          <Jargon term="c-elegans" />
          <Jargon term="level-split" />
          <Jargon term="recode" />
        </div>,
      );

      expect(screen.getAllByRole("button")).toHaveLength(3);
    });

    it("dictionary contains expected number of terms", () => {
      const count = Object.keys(jargonDictionary).length;
      expect(count).toBeGreaterThanOrEqual(50);
    });

    it("all dictionary terms have required fields", () => {
      for (const [key, term] of Object.entries(jargonDictionary)) {
        expect(term.term, `${key} missing term`).toBeTruthy();
        expect(term.short, `${key} missing short`).toBeTruthy();
        expect(term.long, `${key} missing long`).toBeTruthy();
        expect(term.category, `${key} missing category`).toBeTruthy();
      }
    });
  });

  describe("dictionary coverage", () => {
    it("includes all Brenner operators", () => {
      const operators = [
        "level-split",
        "recode",
        "invariant-extract",
        "exclusion-test",
        "object-transpose",
        "amplify",
        "democratize",
        "exception-quarantine",
        "dephase",
        "unentrain",
        "cross-domain-import",
        "paradox-hunt",
        "theory-kill",
        "materialize",
        "diy",
        "scale-prison",
      ];

      for (const op of operators) {
        expect(getJargon(op), `Missing operator: ${op}`).toBeDefined();
      }
    });

    it("includes core biology terms", () => {
      const biologyTerms = ["c-elegans", "genetic-code", "mrna", "phenotype", "genotype"];

      for (const term of biologyTerms) {
        expect(getJargon(term), `Missing biology term: ${term}`).toBeDefined();
      }
    });

    it("includes project-specific terms", () => {
      const projectTerms = ["agent-mail", "thread", "kickoff", "artifact", "corpus", "beads"];

      for (const term of projectTerms) {
        expect(getJargon(term), `Missing project term: ${term}`).toBeDefined();
      }
    });
  });
});
