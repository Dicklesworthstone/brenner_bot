/**
 * Unit tests for ComparisonView components
 *
 * Tests the multi-pane comparison views with synchronized scrolling,
 * model badges, and layout helpers.
 *
 * @see brenner_bot-e7u9 (bead)
 * @see @/components/ui/comparison-view.tsx
 */

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ComparisonView,
  ModelBadge,
  ThreeModelComparison,
  TwoColumnComparison,
} from "./comparison-view";

// ============================================================================
// Mock Setup
// ============================================================================

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// ComparisonView Tests
// ============================================================================

describe("ComparisonView", () => {
  describe("rendering", () => {
    it("returns null when panes array is empty", () => {
      const { container } = render(<ComparisonView panes={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders panes with titles", () => {
      render(
        <ComparisonView
          panes={[
            { id: "1", title: "First Pane", content: <p>Content 1</p> },
            { id: "2", title: "Second Pane", content: <p>Content 2</p> },
          ]}
        />,
      );

      expect(screen.getByText("First Pane")).toBeInTheDocument();
      expect(screen.getByText("Second Pane")).toBeInTheDocument();
    });

    it("renders pane content", () => {
      render(
        <ComparisonView panes={[{ id: "1", title: "Pane 1", content: <p>Hello World</p> }]} />,
      );

      expect(screen.getByText("Hello World")).toBeInTheDocument();
    });

    it("applies custom className to container", () => {
      const { container } = render(
        <ComparisonView
          panes={[{ id: "1", title: "Pane", content: <p>Content</p> }]}
          className="custom-comparison"
        />,
      );

      const wrapper = container.querySelector(".comparison-container");
      expect(wrapper).toHaveClass("custom-comparison");
    });

    it("renders color indicator when pane has color", () => {
      const { container } = render(
        <ComparisonView
          panes={[{ id: "1", title: "Colored Pane", content: <p>Content</p>, color: "#ff0000" }]}
        />,
      );

      // Should have a color indicator dot
      const colorDot = container.querySelector(".rounded-full");
      expect(colorDot).toBeInTheDocument();
      expect(colorDot).toHaveStyle({ background: "#ff0000" });
    });

    it("renders icon when pane has icon", () => {
      render(
        <ComparisonView
          panes={[
            {
              id: "1",
              title: "Icon Pane",
              content: <p>Content</p>,
              icon: <span data-testid="test-icon">★</span>,
            },
          ]}
        />,
      );

      expect(screen.getByTestId("test-icon")).toBeInTheDocument();
    });
  });

  describe("sync scroll indicator", () => {
    it("renders sync indicator when syncScroll is true", () => {
      const { container } = render(
        <ComparisonView
          panes={[
            { id: "1", title: "Pane 1", content: <p>Content 1</p> },
            { id: "2", title: "Pane 2", content: <p>Content 2</p> },
          ]}
          syncScroll={true}
        />,
      );

      const syncIndicator = container.querySelector(".comparison-sync-indicator");
      expect(syncIndicator).toBeInTheDocument();
      expect(syncIndicator).toHaveTextContent("Syncing scroll");
    });

    it("does not render sync indicator when syncScroll is false", () => {
      const { container } = render(
        <ComparisonView
          panes={[
            { id: "1", title: "Pane 1", content: <p>Content 1</p> },
            { id: "2", title: "Pane 2", content: <p>Content 2</p> },
          ]}
          syncScroll={false}
        />,
      );

      const syncIndicator = container.querySelector(".comparison-sync-indicator");
      expect(syncIndicator).not.toBeInTheDocument();
    });
  });

  describe("multiple panes", () => {
    it("renders correct number of panes", () => {
      const { container } = render(
        <ComparisonView
          panes={[
            { id: "1", title: "Pane 1", content: <p>Content 1</p> },
            { id: "2", title: "Pane 2", content: <p>Content 2</p> },
            { id: "3", title: "Pane 3", content: <p>Content 3</p> },
          ]}
        />,
      );

      const panes = container.querySelectorAll(".comparison-pane");
      expect(panes.length).toBe(3);
    });

    it("preserves pane order", () => {
      render(
        <ComparisonView
          panes={[
            { id: "a", title: "Alpha", content: <p>A</p> },
            { id: "b", title: "Beta", content: <p>B</p> },
            { id: "c", title: "Gamma", content: <p>C</p> },
          ]}
        />,
      );

      const titles = screen.getAllByRole("heading", { level: 3 });
      expect(titles[0]).toHaveTextContent("Alpha");
      expect(titles[1]).toHaveTextContent("Beta");
      expect(titles[2]).toHaveTextContent("Gamma");
    });
  });
});

// ============================================================================
// ModelBadge Tests
// ============================================================================

describe("ModelBadge", () => {
  describe("model types", () => {
    it("renders opus badge with correct label", () => {
      render(<ModelBadge model="opus" />);
      expect(screen.getByText("Opus 4.5")).toBeInTheDocument();
    });

    it("renders gpt badge with correct label", () => {
      render(<ModelBadge model="gpt" />);
      expect(screen.getByText("GPT-5.2")).toBeInTheDocument();
    });

    it("renders gemini badge with correct label", () => {
      render(<ModelBadge model="gemini" />);
      expect(screen.getByText("Gemini 3")).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("applies model-specific class for opus", () => {
      const { container } = render(<ModelBadge model="opus" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass("model-badge-opus");
    });

    it("applies model-specific class for gpt", () => {
      const { container } = render(<ModelBadge model="gpt" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass("model-badge-gpt");
    });

    it("applies model-specific class for gemini", () => {
      const { container } = render(<ModelBadge model="gemini" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass("model-badge-gemini");
    });

    it("applies custom className", () => {
      const { container } = render(<ModelBadge model="opus" className="extra-class" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass("extra-class");
    });

    it("has base badge styling classes", () => {
      const { container } = render(<ModelBadge model="opus" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveClass(
        "inline-flex",
        "items-center",
        "rounded-full",
        "text-xs",
        "font-medium",
      );
    });
  });
});

// ============================================================================
// TwoColumnComparison Tests
// ============================================================================

describe("TwoColumnComparison", () => {
  describe("rendering", () => {
    it("renders left and right panes", () => {
      render(
        <TwoColumnComparison
          left={{ title: "Left Side", content: <p>Left content</p> }}
          right={{ title: "Right Side", content: <p>Right content</p> }}
        />,
      );

      expect(screen.getByText("Left Side")).toBeInTheDocument();
      expect(screen.getByText("Right Side")).toBeInTheDocument();
      expect(screen.getByText("Left content")).toBeInTheDocument();
      expect(screen.getByText("Right content")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(
        <TwoColumnComparison
          left={{ title: "Left", content: <p>L</p> }}
          right={{ title: "Right", content: <p>R</p> }}
          className="two-col-custom"
        />,
      );

      const wrapper = container.querySelector(".comparison-container");
      expect(wrapper).toHaveClass("two-col-custom");
    });

    it("renders colors when provided", () => {
      const { container } = render(
        <TwoColumnComparison
          left={{ title: "Left", content: <p>L</p>, color: "#ff0000" }}
          right={{ title: "Right", content: <p>R</p>, color: "#00ff00" }}
        />,
      );

      const colorDots = container.querySelectorAll(".rounded-full");
      expect(colorDots.length).toBe(2);
    });
  });
});

// ============================================================================
// ThreeModelComparison Tests
// ============================================================================

describe("ThreeModelComparison", () => {
  describe("rendering", () => {
    it("renders all three model sections", () => {
      render(
        <ThreeModelComparison
          opus={<p>Opus content</p>}
          gpt={<p>GPT content</p>}
          gemini={<p>Gemini content</p>}
        />,
      );

      expect(screen.getByText("Opus 4.5")).toBeInTheDocument();
      expect(screen.getByText("GPT-5.2")).toBeInTheDocument();
      expect(screen.getByText("Gemini 3")).toBeInTheDocument();
    });

    it("renders content for each model", () => {
      render(
        <ThreeModelComparison
          opus={<p>Opus analysis</p>}
          gpt={<p>GPT analysis</p>}
          gemini={<p>Gemini analysis</p>}
        />,
      );

      expect(screen.getByText("Opus analysis")).toBeInTheDocument();
      expect(screen.getByText("GPT analysis")).toBeInTheDocument();
      expect(screen.getByText("Gemini analysis")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(
        <ThreeModelComparison
          opus={<p>O</p>}
          gpt={<p>G</p>}
          gemini={<p>Gem</p>}
          className="three-model-custom"
        />,
      );

      // The className is applied to the outer wrapper div
      expect(container.firstChild).toHaveClass("three-model-custom");
    });

    it("renders color indicators for all models", () => {
      const { container } = render(
        <ThreeModelComparison opus={<p>O</p>} gpt={<p>G</p>} gemini={<p>Gem</p>} />,
      );

      // Should have 3 color dots (one for each model)
      const colorDots = container.querySelectorAll(".rounded-full");
      expect(colorDots.length).toBe(3);
    });

    it("renders sparkle icons for all models", () => {
      const { container } = render(
        <ThreeModelComparison opus={<p>O</p>} gpt={<p>G</p>} gemini={<p>Gem</p>} />,
      );

      // Should have SVG icons for each model
      const svgs = container.querySelectorAll("svg");
      expect(svgs.length).toBeGreaterThanOrEqual(3);
    });
  });
});
