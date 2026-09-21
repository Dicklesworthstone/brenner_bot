/**
 * Unit tests for StatsSection component
 *
 * Tests the stats section with animated counters that display
 * key project metrics on the home page.
 *
 * @see brenner_bot-e7u9 (bead)
 * @see @/components/home/stats-section.tsx
 */

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StatsSection } from "./stats-section";

// ============================================================================
// Mock Setup
// ============================================================================

// Mock IntersectionObserver for AnimatedCounter
class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  elements: Element[] = [];

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe(element: Element) {
    this.elements.push(element);
  }

  unobserve(element: Element) {
    void element;
  }

  disconnect() {
    this.elements = [];
  }
}

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ============================================================================
// StatsSection Tests
// ============================================================================

describe("StatsSection", () => {
  describe("rendering", () => {
    it("renders a section element", () => {
      render(<StatsSection />);

      const section = document.querySelector("section");
      expect(section).toBeInTheDocument();
    });

    it("renders four stat cards", () => {
      const { container } = render(<StatsSection />);

      // The stats grid should contain 4 stat cards
      const statCards = container.querySelectorAll(".text-center");
      expect(statCards.length).toBe(4);
    });

    it("displays all stat labels", () => {
      render(<StatsSection />);

      expect(screen.getByText("Interview Segments")).toBeInTheDocument();
      expect(screen.getByText("Model Distillations")).toBeInTheDocument();
      expect(screen.getByText("Operator Types")).toBeInTheDocument();
      expect(screen.getByText("Words of Wisdom")).toBeInTheDocument();
    });
  });

  describe("grid layout", () => {
    it("uses grid layout for stats", () => {
      const { container } = render(<StatsSection />);

      const grid = container.querySelector(".grid");
      expect(grid).toBeInTheDocument();
      expect(grid).toHaveClass("grid-cols-2", "lg:grid-cols-4");
    });
  });

  describe("stat values", () => {
    it("renders AnimatedCounter components for each stat", () => {
      const { container } = render(<StatsSection />);

      // Each stat card should contain a span (AnimatedCounter renders a span)
      const statCards = container.querySelectorAll(".text-center");
      statCards.forEach((card) => {
        const span = card.querySelector("span");
        expect(span).toBeInTheDocument();
      });
    });

    it("starts with initial values (0) before animation", () => {
      render(<StatsSection />);

      // AnimatedCounter starts at 0 before intersection triggers animation
      // There should be 4 instances of "0" (one for each stat)
      const zeros = screen.getAllByText("0");
      expect(zeros.length).toBeGreaterThanOrEqual(2); // At least some show 0
    });

    it("displays suffixes correctly with initial values", () => {
      render(<StatsSection />);

      // The suffixes should be visible even at 0
      // "0+" for Operator Types and "0k+" for Words of Wisdom
      expect(screen.getByText("0+")).toBeInTheDocument();
      expect(screen.getByText("0k+")).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("applies hover and transition classes to stat cards", () => {
      const { container } = render(<StatsSection />);

      const statCards = container.querySelectorAll(".text-center");
      statCards.forEach((card) => {
        expect(card).toHaveClass("transition-all", "duration-300");
      });
    });

    it("applies stagger animation classes", () => {
      const { container } = render(<StatsSection />);

      const statCards = container.querySelectorAll(".text-center");
      expect(statCards[0]).toHaveClass("stagger-1");
      expect(statCards[1]).toHaveClass("stagger-2");
      expect(statCards[2]).toHaveClass("stagger-3");
      expect(statCards[3]).toHaveClass("stagger-4");
    });

    it("applies fade-in animation class", () => {
      const { container } = render(<StatsSection />);

      const statCards = container.querySelectorAll(".text-center");
      statCards.forEach((card) => {
        expect(card).toHaveClass("animate-fade-in");
      });
    });
  });

  describe("responsive design", () => {
    it("has responsive padding classes on section", () => {
      const { container } = render(<StatsSection />);

      const section = container.querySelector("section");
      expect(section).toHaveClass("py-6", "sm:py-8");
    });

    it("has responsive gap classes on grid", () => {
      const { container } = render(<StatsSection />);

      const grid = container.querySelector(".grid");
      expect(grid).toHaveClass("gap-4", "sm:gap-6", "lg:gap-8");
    });
  });
});
