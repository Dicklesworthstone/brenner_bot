/**
 * Tests for Jargon component
 *
 * Tests the Jargon tooltip/bottom-sheet component using real jargon dictionary data.
 * Following the "no mocks" philosophy - only mocking browser APIs that don't exist in test env.
 *
 * Note: Some interaction tests are simplified due to portal/animation complexity in jsdom.
 */

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getJargon, jargonDictionary } from "@/lib/jargon";
import { Jargon, JargonInline } from "./jargon";

// Get a real term from the dictionary for testing
const realTermKey = "level-split";
const realTerm = getJargon(realTermKey);
if (!realTerm) {
  throw new Error(`Missing jargon term for key: ${realTermKey}`);
}

// Mock matchMedia for mobile detection - required since jsdom doesn't support it
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

// Mock framer-motion to avoid animation timing issues in tests
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const MockDiv = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    function MockDiv({ children, ...props }, ref) {
      return React.createElement("div", { ...props, ref }, children);
    },
  );
  const MockSpan = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
    function MockSpan({ children, ...props }, ref) {
      return React.createElement("span", { ...props, ref }, children);
    },
  );
  const MockP = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    function MockP({ children, ...props }, ref) {
      return React.createElement("p", { ...props, ref }, children);
    },
  );
  return {
    motion: {
      div: MockDiv,
      span: MockSpan,
      p: MockP,
    },
    AnimatePresence: function MockAnimatePresence({ children }: { children: React.ReactNode }) {
      return React.createElement(React.Fragment, null, children);
    },
  };
});

describe("Jargon", () => {
  beforeEach(() => {
    // Default to desktop
    mockMatchMedia(false);
    // Clear any portaled content
    document.body.innerHTML = "";
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
  });

  describe("basic rendering", () => {
    it("renders the term text from dictionary", () => {
      render(<Jargon term={realTermKey} />);
      expect(screen.getByText(realTerm.term)).toBeInTheDocument();
    });

    it("renders custom children when provided", () => {
      render(<Jargon term={realTermKey}>Custom Text</Jargon>);
      expect(screen.getByText("Custom Text")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(<Jargon term={realTermKey} className="custom-class" />);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
    });

    it("renders as plain span for unknown terms", () => {
      render(<Jargon term="definitely-not-a-real-term-xyz" />);
      const span = screen.getByText("definitely-not-a-real-term-xyz");
      expect(span.tagName).toBe("SPAN");
    });

    it("has proper accessibility attributes", () => {
      render(<Jargon term={realTermKey} />);
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label", `Learn about ${realTerm.term}`);
      expect(button).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("desktop tooltip interaction", () => {
    beforeEach(() => {
      mockMatchMedia(false); // Desktop
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("updates aria-expanded state on click", async () => {
      render(<Jargon term={realTermKey} />);
      const button = screen.getByRole("button");

      expect(button).toHaveAttribute("aria-expanded", "false");

      await act(async () => {
        fireEvent.click(button);
      });

      // After click, aria-expanded should be true (internal state changed)
      expect(button).toHaveAttribute("aria-expanded", "true");
    });

    it("sets up hover delay timeout on mouseEnter", async () => {
      render(<Jargon term={realTermKey} />);
      const button = screen.getByRole("button");

      await act(async () => {
        fireEvent.mouseEnter(button);
      });

      // Initially not expanded
      expect(button).toHaveAttribute("aria-expanded", "false");

      // After hover delay, state should change
      await act(async () => {
        vi.advanceTimersByTime(450);
      });

      expect(button).toHaveAttribute("aria-expanded", "true");
    });

    it("cancels hover timeout on mouseLeave", async () => {
      render(<Jargon term={realTermKey} />);
      const button = screen.getByRole("button");

      await act(async () => {
        fireEvent.mouseEnter(button);
      });

      // Leave before delay completes
      await act(async () => {
        vi.advanceTimersByTime(200);
        fireEvent.mouseLeave(button);
        vi.advanceTimersByTime(300);
      });

      // Should still be closed
      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    it("opens on focus for desktop", async () => {
      render(<Jargon term={realTermKey} />);
      const button = screen.getByRole("button");

      await act(async () => {
        fireEvent.focus(button);
      });

      expect(button).toHaveAttribute("aria-expanded", "true");
    });

    it("closes on escape key", async () => {
      render(<Jargon term={realTermKey} />);
      const button = screen.getByRole("button");

      // Open
      await act(async () => {
        fireEvent.click(button);
      });
      expect(button).toHaveAttribute("aria-expanded", "true");

      // Press escape
      await act(async () => {
        fireEvent.keyDown(document, { key: "Escape" });
      });

      expect(button).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("mobile bottom sheet", () => {
    beforeEach(() => {
      mockMatchMedia(true); // Mobile
    });

    it("opens on click for mobile", async () => {
      render(<Jargon term={realTermKey} />);
      const button = screen.getByRole("button");

      expect(button).toHaveAttribute("aria-expanded", "false");

      await act(async () => {
        fireEvent.click(button);
      });

      expect(button).toHaveAttribute("aria-expanded", "true");
    });

    it("does not open on hover for mobile", async () => {
      vi.useFakeTimers();
      render(<Jargon term={realTermKey} />);
      const button = screen.getByRole("button");

      await act(async () => {
        fireEvent.mouseEnter(button);
        vi.advanceTimersByTime(500);
      });

      // Mobile ignores hover
      expect(button).toHaveAttribute("aria-expanded", "false");
      vi.useRealTimers();
    });

    it("shows sheet content when open", async () => {
      render(<Jargon term={realTermKey} />);
      const button = screen.getByRole("button");

      await act(async () => {
        fireEvent.click(button);
      });

      // The portal should render the sheet content
      await waitFor(
        () => {
          expect(screen.getByText(realTerm.long)).toBeInTheDocument();
        },
        { timeout: 1000 },
      );
    });

    it("shows close button in sheet", async () => {
      render(<Jargon term={realTermKey} />);
      const button = screen.getByRole("button");

      await act(async () => {
        fireEvent.click(button);
      });

      await waitFor(
        () => {
          expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
        },
        { timeout: 1000 },
      );
    });

    it("closes on escape key", async () => {
      render(<Jargon term={realTermKey} />);
      const button = screen.getByRole("button");

      await act(async () => {
        fireEvent.click(button);
      });
      expect(button).toHaveAttribute("aria-expanded", "true");

      await act(async () => {
        fireEvent.keyDown(document, { key: "Escape" });
      });

      expect(button).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("with different dictionary terms", () => {
    // Test with multiple real terms to ensure component works with various data shapes
    const termKeys = Object.keys(jargonDictionary).slice(0, 5);

    it.each(termKeys)("renders term '%s' correctly", (termKey) => {
      const term = getJargon(termKey);
      if (!term) {
        throw new Error(`Missing jargon term for key: ${termKey}`);
      }
      render(<Jargon term={termKey} />);
      expect(screen.getByText(term.term)).toBeInTheDocument();
    });
  });
});

describe("JargonInline", () => {
  beforeEach(() => {
    mockMatchMedia(false);
    document.body.innerHTML = "";
  });

  afterEach(() => {
    cleanup();
  });

  it("renders with font-normal class for inline styling", () => {
    render(<JargonInline term={realTermKey} />);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("font-normal");
  });

  it("accepts additional className", () => {
    render(<JargonInline term={realTermKey} className="extra-class" />);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("font-normal");
    expect(button).toHaveClass("extra-class");
  });
});
