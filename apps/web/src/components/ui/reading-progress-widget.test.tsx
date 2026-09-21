/**
 * Unit tests for ReadingProgressWidget components
 *
 * Tests the reading progress indicators that show scroll position
 * and estimated reading time remaining.
 *
 * @see brenner_bot-e7u9 (bead)
 * @see @/components/ui/reading-progress-widget.tsx
 */

import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReadingProgressInline, ReadingProgressWidget } from "./reading-progress-widget";

// ============================================================================
// Mock Setup
// ============================================================================

let scrollY = 0;
let scrollListeners: Array<(e: Event) => void> = [];

// Capture original querySelector before any mocking
const originalDocumentQuerySelector = document.querySelector.bind(document);

function triggerScroll(newScrollY: number) {
  scrollY = newScrollY;
  scrollListeners.forEach((handler) => handler(new Event("scroll")));
}

beforeEach(() => {
  scrollY = 0;
  scrollListeners = [];

  // Mock window.scrollY
  Object.defineProperty(window, "scrollY", {
    get: () => scrollY,
    configurable: true,
  });

  // Mock addEventListener/removeEventListener for scroll
  const originalAddEventListener = window.addEventListener;
  const originalRemoveEventListener = window.removeEventListener;

  vi.spyOn(window, "addEventListener").mockImplementation((type, handler, options) => {
    if (type === "scroll") {
      scrollListeners.push(handler as (e: Event) => void);
    } else {
      originalAddEventListener.call(window, type, handler, options);
    }
  });

  vi.spyOn(window, "removeEventListener").mockImplementation((type, handler, options) => {
    if (type === "scroll") {
      const index = scrollListeners.indexOf(handler as (e: Event) => void);
      if (index > -1) scrollListeners.splice(index, 1);
    } else {
      originalRemoveEventListener.call(window, type, handler, options);
    }
  });

  // Mock document.documentElement.scrollHeight (total document height)
  Object.defineProperty(document.documentElement, "scrollHeight", {
    value: 2000,
    configurable: true,
  });

  // Mock window.innerHeight (viewport height)
  Object.defineProperty(window, "innerHeight", {
    value: 800,
    configurable: true,
  });

  // Mock document.querySelector for main content (used for word count)
  // Falls back to original for other selectors to avoid breaking library internals
  vi.spyOn(document, "querySelector").mockImplementation((selector: string) => {
    if (selector === "main") {
      return {
        textContent: "word ".repeat(1000), // 1000 words
      } as unknown as Element;
    }
    return originalDocumentQuerySelector(selector);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// ReadingProgressWidget Tests
// ============================================================================

describe("ReadingProgressWidget", () => {
  describe("rendering", () => {
    it("renders the widget with reading-widget class", () => {
      const { container } = render(<ReadingProgressWidget />);

      const widget = container.querySelector(".reading-widget");
      expect(widget).toBeInTheDocument();
    });

    it("displays 0% progress initially", () => {
      render(<ReadingProgressWidget />);

      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("includes SVG progress ring with two circles", () => {
      const { container } = render(<ReadingProgressWidget />);

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();

      // Should have two circles (background and progress bar)
      const circles = container.querySelectorAll("circle");
      expect(circles.length).toBe(2);
    });

    it("applies custom className", () => {
      const { container } = render(<ReadingProgressWidget className="custom-class" />);

      const widget = container.querySelector(".reading-widget");
      expect(widget).toHaveClass("custom-class");
    });
  });

  describe("scroll progress calculation", () => {
    it("updates progress percentage on scroll", async () => {
      render(<ReadingProgressWidget />);

      // Document is 2000px, viewport is 800px, so scrollable height is 1200px
      // Scroll to 50% (600px)
      await act(async () => {
        triggerScroll(600);
      });

      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    it("shows 100% at bottom of page", async () => {
      render(<ReadingProgressWidget />);

      // Scroll to bottom (1200px scrollable height)
      await act(async () => {
        triggerScroll(1200);
      });

      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("clamps progress between 0 and 100", async () => {
      render(<ReadingProgressWidget />);

      // Scroll beyond document height (shouldn't happen but test edge case)
      await act(async () => {
        triggerScroll(2000);
      });

      // Should be clamped to 100%
      expect(screen.getByText("100%")).toBeInTheDocument();
    });
  });

  describe("visibility", () => {
    it("becomes visible after scrolling past 200px", async () => {
      const { container } = render(<ReadingProgressWidget />);

      const widget = container.querySelector(".reading-widget");

      // Initially not visible (no "visible" class)
      expect(widget?.classList.contains("visible")).toBe(false);

      // Scroll past threshold
      await act(async () => {
        triggerScroll(250);
      });

      expect(widget?.classList.contains("visible")).toBe(true);
    });

    it("hides when scrolling back to top", async () => {
      const { container } = render(<ReadingProgressWidget />);

      const widget = container.querySelector(".reading-widget");

      // Scroll down first
      await act(async () => {
        triggerScroll(300);
      });
      expect(widget?.classList.contains("visible")).toBe(true);

      // Scroll back up
      await act(async () => {
        triggerScroll(100);
      });
      expect(widget?.classList.contains("visible")).toBe(false);
    });
  });

  describe("time estimate", () => {
    it("shows time remaining when showTimeEstimate is true and scrolled", async () => {
      const { container } = render(<ReadingProgressWidget showTimeEstimate={true} />);

      // Scroll partway to make widget visible and calculate time
      await act(async () => {
        triggerScroll(250);
      });

      const timeElement = container.querySelector(".reading-widget-time");
      expect(timeElement).toBeInTheDocument();
    });

    it("hides time estimate when showTimeEstimate is false", async () => {
      const { container } = render(<ReadingProgressWidget showTimeEstimate={false} />);

      await act(async () => {
        triggerScroll(250);
      });

      const timeElement = container.querySelector(".reading-widget-time");
      expect(timeElement).not.toBeInTheDocument();
    });

    it("shows plural 'min left' for multiple minutes", async () => {
      // With 1000 words at 200 wpm = 5 min total
      const { container } = render(<ReadingProgressWidget wordsPerMinute={200} />);

      // At 0% progress, should show 5 min left
      // But we need to scroll to make widget visible
      await act(async () => {
        triggerScroll(250); // 250/1200 = ~21% scrolled, ~79% remaining
      });

      const timeElement = container.querySelector(".reading-widget-time");
      expect(timeElement?.textContent).toMatch(/\d+ min left/);
    });
  });

  describe("cleanup", () => {
    it("removes scroll listener on unmount", () => {
      const { unmount } = render(<ReadingProgressWidget />);

      expect(scrollListeners.length).toBe(1);

      unmount();

      expect(scrollListeners.length).toBe(0);
    });
  });
});

// ============================================================================
// ReadingProgressInline Tests
// ============================================================================

describe("ReadingProgressInline", () => {
  describe("rendering", () => {
    it("returns null when progress is 0", () => {
      const { container } = render(<ReadingProgressInline />);

      // Should render nothing at 0 progress
      expect(container.firstChild).toBeNull();
    });

    it("renders progress bar when scrolled", async () => {
      render(<ReadingProgressInline />);

      await act(async () => {
        triggerScroll(300);
      });

      expect(screen.getByText(/\d+%/)).toBeInTheDocument();
    });

    it("applies custom className when visible", async () => {
      const { container } = render(<ReadingProgressInline className="custom-inline" />);

      await act(async () => {
        triggerScroll(300);
      });

      // The custom class should be on the container div
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper?.classList.contains("custom-inline")).toBe(true);
    });
  });

  describe("progress display", () => {
    it("shows percentage text", async () => {
      render(<ReadingProgressInline />);

      await act(async () => {
        triggerScroll(600); // 50%
      });

      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    it("has progress bar element with bg-primary class", async () => {
      const { container } = render(<ReadingProgressInline />);

      await act(async () => {
        triggerScroll(300);
      });

      const progressBar = container.querySelector(".bg-primary");
      expect(progressBar).toBeInTheDocument();
    });

    it("updates progress bar width based on scroll", async () => {
      const { container } = render(<ReadingProgressInline />);

      await act(async () => {
        triggerScroll(600); // 50%
      });

      const progressBar = container.querySelector(".bg-primary") as HTMLElement;
      expect(progressBar?.style.width).toBe("50%");
    });
  });

  describe("cleanup", () => {
    it("removes scroll listener on unmount", async () => {
      const { unmount } = render(<ReadingProgressInline />);

      // Need to scroll first to ensure component is mounted with listener
      await act(async () => {
        triggerScroll(100);
      });

      const listenersBefore = scrollListeners.length;

      unmount();

      expect(scrollListeners.length).toBeLessThan(listenersBefore);
    });
  });
});
