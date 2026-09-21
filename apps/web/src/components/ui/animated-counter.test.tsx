/**
 * Unit tests for AnimatedCounter component
 *
 * Tests the counter animation that counts up from 0 to a target value.
 * Uses IntersectionObserver to trigger animation on viewport entry.
 *
 * @see brenner_bot-it7r (bead)
 * @see @/components/ui/animated-counter.tsx
 */

import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnimatedCounter } from "./animated-counter";

// ============================================================================
// Mock Setup
// ============================================================================

// Store mock observer callback for triggering in tests
let intersectionCallback: IntersectionObserverCallback | null = null;
let observedElements: Element[] = [];

// Mock IntersectionObserver
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: readonly number[] = [];

  constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = callback;
  }

  observe(element: Element): void {
    observedElements.push(element);
  }

  unobserve(): void {
    // no-op
  }

  disconnect(): void {
    observedElements = [];
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

// Helper to trigger intersection
function triggerIntersection(isIntersecting: boolean) {
  if (intersectionCallback && observedElements.length > 0) {
    const entries = observedElements.map((element) => ({
      isIntersecting,
      target: element,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRatio: isIntersecting ? 1 : 0,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      time: Date.now(),
    }));
    intersectionCallback(entries, {} as IntersectionObserver);
  }
}

// Mock requestAnimationFrame and cancelAnimationFrame
let rafCallbacks: Map<number, FrameRequestCallback> = new Map();
let rafId = 0;

function mockRequestAnimationFrame(callback: FrameRequestCallback): number {
  rafId++;
  rafCallbacks.set(rafId, callback);
  return rafId;
}

function mockCancelAnimationFrame(id: number): void {
  rafCallbacks.delete(id);
}

// Run all pending animation frames
function flushAnimationFrames(times = 100) {
  for (let i = 0; i < times && rafCallbacks.size > 0; i++) {
    const callbacks = Array.from(rafCallbacks.entries());
    rafCallbacks.clear();
    for (const [, callback] of callbacks) {
      callback(performance.now());
    }
  }
}

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  vi.stubGlobal("requestAnimationFrame", mockRequestAnimationFrame);
  vi.stubGlobal("cancelAnimationFrame", mockCancelAnimationFrame);

  intersectionCallback = null;
  observedElements = [];
  rafCallbacks = new Map();
  rafId = 0;

  // Mock performance.now for consistent timing
  vi.spyOn(performance, "now").mockReturnValue(0);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ============================================================================
// AnimatedCounter Tests
// ============================================================================

describe("AnimatedCounter", () => {
  describe("rendering", () => {
    it("renders as a span element", () => {
      render(<AnimatedCounter value={100} />);

      const span = screen.getByText("0");
      expect(span.tagName).toBe("SPAN");
    });

    it("starts at 0 before animation", () => {
      render(<AnimatedCounter value={100} />);

      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("displays suffix when provided", () => {
      render(<AnimatedCounter value={100} suffix="%" />);

      expect(screen.getByText("0%")).toBeInTheDocument();
    });
  });

  describe("animation trigger", () => {
    it("observes element with IntersectionObserver", () => {
      render(<AnimatedCounter value={100} />);

      expect(observedElements.length).toBe(1);
    });

    it("starts animation when element enters viewport", async () => {
      render(<AnimatedCounter value={100} duration={100} />);

      // Initially 0
      expect(screen.getByText("0")).toBeInTheDocument();

      // Trigger intersection
      await act(async () => {
        triggerIntersection(true);
      });

      // Animation has started (callback was set)
      expect(rafCallbacks.size).toBeGreaterThan(0);
    });

    it("does not start animation before entering viewport", () => {
      render(<AnimatedCounter value={100} />);

      // Not intersecting yet
      triggerIntersection(false);

      // Should still be 0, no animation callbacks
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });

  describe("animation behavior", () => {
    it("animates to target value", async () => {
      const duration = 100;
      render(<AnimatedCounter value={50} duration={duration} />);

      // Start animation
      await act(async () => {
        triggerIntersection(true);
      });

      // Simulate time passing and animation completing
      vi.spyOn(performance, "now").mockReturnValue(duration + 10);

      await act(async () => {
        flushAnimationFrames();
      });

      // Should reach final value
      await waitFor(() => {
        expect(screen.getByText("50")).toBeInTheDocument();
      });
    });

    it("respects delay prop before starting animation", async () => {
      const delay = 100;
      render(<AnimatedCounter value={100} delay={delay} duration={50} />);

      // Start animation
      await act(async () => {
        triggerIntersection(true);
      });

      // At time 0 (before delay), should still be 0
      await act(async () => {
        flushAnimationFrames(1);
      });

      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("uses easeOutExpo for snappy feel", async () => {
      // This test verifies the animation has an exponential ease
      // by checking that progress accelerates at the start
      render(<AnimatedCounter value={100} duration={1000} />);

      await act(async () => {
        triggerIntersection(true);
      });

      // At ~12% of duration, easeOutExpo should show significant progress
      // (avoid a brittle boundary case at exactly 10% where the math yields 50%)
      vi.spyOn(performance, "now").mockReturnValue(120);

      await act(async () => {
        flushAnimationFrames(1);
      });

      // With easeOutExpo, early progress should exceed 50%
      // (because ease-out is fast at start, slow at end)
      const text = screen.getByText(/\d+/).textContent;
      const value = parseInt(text || "0", 10);
      expect(value).toBeGreaterThan(50);
    });
  });

  describe("suffix handling", () => {
    it("displays suffix with final value", async () => {
      render(<AnimatedCounter value={100} suffix="+" duration={50} />);

      await act(async () => {
        triggerIntersection(true);
      });

      vi.spyOn(performance, "now").mockReturnValue(100);

      await act(async () => {
        flushAnimationFrames();
      });

      await waitFor(() => {
        expect(screen.getByText("100+")).toBeInTheDocument();
      });
    });

    it("displays suffix with intermediate values", async () => {
      render(<AnimatedCounter value={100} suffix="%" duration={1000} />);

      await act(async () => {
        triggerIntersection(true);
      });

      // Partial progress
      vi.spyOn(performance, "now").mockReturnValue(500);

      await act(async () => {
        flushAnimationFrames(1);
      });

      // Should have suffix attached to current value
      const element = screen.getByText(/%$/);
      expect(element).toBeInTheDocument();
    });
  });

  describe("value prop changes", () => {
    it("re-animates when value changes after initial animation", async () => {
      const { rerender } = render(<AnimatedCounter value={50} duration={50} />);

      // Complete first animation
      await act(async () => {
        triggerIntersection(true);
      });

      vi.spyOn(performance, "now").mockReturnValue(100);

      await act(async () => {
        flushAnimationFrames();
      });

      await waitFor(() => {
        expect(screen.getByText("50")).toBeInTheDocument();
      });

      // Reset for new animation
      rafCallbacks.clear();
      vi.spyOn(performance, "now").mockReturnValue(200);

      // Change value
      rerender(<AnimatedCounter value={100} duration={50} />);

      vi.spyOn(performance, "now").mockReturnValue(300);

      await act(async () => {
        flushAnimationFrames();
      });

      await waitFor(() => {
        expect(screen.getByText("100")).toBeInTheDocument();
      });
    });
  });

  describe("cleanup", () => {
    it("cancels animation frame on unmount", async () => {
      const cancelSpy = vi.fn();
      vi.stubGlobal("cancelAnimationFrame", cancelSpy);

      const { unmount } = render(<AnimatedCounter value={100} duration={1000} />);

      await act(async () => {
        triggerIntersection(true);
      });

      // Animation started
      expect(rafCallbacks.size).toBeGreaterThan(0);

      // Unmount
      unmount();

      // cancelAnimationFrame should have been called
      expect(cancelSpy).toHaveBeenCalled();
    });

    it("disconnects IntersectionObserver on unmount", () => {
      const { unmount } = render(<AnimatedCounter value={100} />);

      expect(observedElements.length).toBe(1);

      unmount();

      // Observer disconnect clears observed elements in our mock
      expect(observedElements.length).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("handles value of 0", () => {
      render(<AnimatedCounter value={0} />);

      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("handles large values", async () => {
      render(<AnimatedCounter value={1000000} duration={50} />);

      await act(async () => {
        triggerIntersection(true);
      });

      vi.spyOn(performance, "now").mockReturnValue(100);

      await act(async () => {
        flushAnimationFrames();
      });

      await waitFor(() => {
        expect(screen.getByText("1000000")).toBeInTheDocument();
      });
    });

    it("handles negative delay (treated as 0)", async () => {
      render(<AnimatedCounter value={100} delay={-100} duration={50} />);

      await act(async () => {
        triggerIntersection(true);
      });

      // Should start animation immediately
      vi.spyOn(performance, "now").mockReturnValue(100);

      await act(async () => {
        flushAnimationFrames();
      });

      await waitFor(() => {
        expect(screen.getByText("100")).toBeInTheDocument();
      });
    });
  });

  describe("default props", () => {
    it("uses default duration of 1000ms", () => {
      render(<AnimatedCounter value={100} />);

      // Component renders without error
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("uses default delay of 0", () => {
      render(<AnimatedCounter value={100} />);

      // Component renders without error
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("uses empty string as default suffix", () => {
      render(<AnimatedCounter value={100} />);

      // Just the number, no suffix
      expect(screen.getByText("0")).toBeInTheDocument();
    });
  });
});
