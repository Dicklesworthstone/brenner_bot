/**
 * Unit tests for TutorialPathCard component
 *
 * Tests the TutorialPathCard component's rendering, status variants,
 * navigation behavior, and accessibility.
 * Philosophy: NO mocks - test real component behavior and DOM output.
 *
 * @see @/components/tutorial/TutorialPathCard.tsx
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TutorialPath } from "@/lib/tutorial-types";
import { TutorialPathCard, TutorialPathGrid } from "./TutorialPathCard";

const mockPath: TutorialPath = {
  id: "quick-start",
  title: "Quick Start",
  description: "Get up and running in 5 minutes",
  difficulty: "beginner",
  estimatedDuration: "~5 min",
  totalSteps: 3,
  href: "/tutorial/quick-start",
};

const mockAdvancedPath: TutorialPath = {
  id: "multi-agent-cockpit",
  title: "Multi-Agent Cockpit",
  description: "Coordinate multiple AI agents",
  difficulty: "advanced",
  estimatedDuration: "~45 min",
  totalSteps: 8,
  prerequisites: ["Quick Start", "Agent Basics"],
  href: "/tutorial/multi-agent",
};

describe("TutorialPathCard", () => {
  describe("rendering", () => {
    it("renders path title", () => {
      render(<TutorialPathCard path={mockPath} status="available" />);
      expect(screen.getByText("Quick Start")).toBeInTheDocument();
    });

    it("renders path description", () => {
      render(<TutorialPathCard path={mockPath} status="available" />);
      expect(screen.getByText("Get up and running in 5 minutes")).toBeInTheDocument();
    });

    it("renders estimated duration", () => {
      render(<TutorialPathCard path={mockPath} status="available" />);
      expect(screen.getByText("~5 min")).toBeInTheDocument();
    });

    it("renders step count", () => {
      render(<TutorialPathCard path={mockPath} status="available" />);
      expect(screen.getByText("3 steps")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(
        <TutorialPathCard path={mockPath} status="available" className="custom-class" />,
      );
      // The className is applied to the inner card div
      const card = container.querySelector(".custom-class");
      expect(card).toBeInTheDocument();
    });
  });

  describe("difficulty badges", () => {
    it("renders beginner difficulty badge", () => {
      render(<TutorialPathCard path={mockPath} status="available" />);
      expect(screen.getByText("beginner")).toBeInTheDocument();
    });

    it("renders intermediate difficulty badge", () => {
      const intermediatePath = { ...mockPath, difficulty: "intermediate" as const };
      render(<TutorialPathCard path={intermediatePath} status="available" />);
      expect(screen.getByText("intermediate")).toBeInTheDocument();
    });

    it("renders advanced difficulty badge", () => {
      render(<TutorialPathCard path={mockAdvancedPath} status="available" />);
      expect(screen.getByText("advanced")).toBeInTheDocument();
    });
  });

  describe("status variants", () => {
    it("renders available status with primary styling", () => {
      const { container } = render(<TutorialPathCard path={mockPath} status="available" />);
      const card = container.querySelector(".border-primary\\/30");
      expect(card).toBeInTheDocument();
    });

    it("renders completed status with success styling", () => {
      const { container } = render(<TutorialPathCard path={mockPath} status="completed" />);
      // Using OKLCH color for completed status
      const card = container.querySelector('[class*="border-[oklch(0.72_0.19_145"]');
      expect(card).toBeInTheDocument();
    });

    it("renders locked status with muted styling", () => {
      const { container } = render(<TutorialPathCard path={mockAdvancedPath} status="locked" />);
      const card = container.querySelector(".opacity-60");
      expect(card).toBeInTheDocument();
    });

    it("shows prerequisites when locked", () => {
      render(<TutorialPathCard path={mockAdvancedPath} status="locked" />);
      expect(screen.getByText(/Prerequisites:/)).toBeInTheDocument();
      expect(screen.getByText(/Quick Start, Agent Basics/)).toBeInTheDocument();
    });

    it("does not show prerequisites when not locked", () => {
      render(<TutorialPathCard path={mockAdvancedPath} status="available" />);
      expect(screen.queryByText(/Prerequisites:/)).not.toBeInTheDocument();
    });
  });

  describe("recommended badge", () => {
    it("shows recommended badge when recommended prop is true", () => {
      render(<TutorialPathCard path={mockPath} status="available" recommended />);
      expect(screen.getByText("Recommended")).toBeInTheDocument();
    });

    it("does not show recommended badge when locked", () => {
      render(<TutorialPathCard path={mockPath} status="locked" recommended />);
      expect(screen.queryByText("Recommended")).not.toBeInTheDocument();
    });

    it("does not show recommended badge by default", () => {
      render(<TutorialPathCard path={mockPath} status="available" />);
      expect(screen.queryByText("Recommended")).not.toBeInTheDocument();
    });
  });

  describe("navigation", () => {
    it("renders as link when available with href", () => {
      render(<TutorialPathCard path={mockPath} status="available" />);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/tutorial/quick-start");
    });

    it("does not render as link when locked", () => {
      render(<TutorialPathCard path={mockPath} status="locked" />);
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("calls onClick when available and clicked", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      const pathWithoutHref = { ...mockPath, href: undefined };

      render(<TutorialPathCard path={pathWithoutHref} status="available" onClick={handleClick} />);

      const button = screen.getByRole("button");
      await user.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("does not call onClick when locked", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<TutorialPathCard path={mockPath} status="locked" onClick={handleClick} />);

      // Card is not interactive when locked
      const card = screen.getByText("Quick Start").closest("div");
      if (card) {
        await user.click(card);
      }
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("has cursor-pointer when accessible", () => {
      const { container } = render(<TutorialPathCard path={mockPath} status="available" />);
      const card = container.querySelector(".cursor-pointer");
      expect(card).toBeInTheDocument();
    });

    it("has cursor-not-allowed when locked", () => {
      const { container } = render(<TutorialPathCard path={mockPath} status="locked" />);
      const card = container.querySelector(".cursor-not-allowed");
      expect(card).toBeInTheDocument();
    });
  });
});

describe("TutorialPathGrid", () => {
  const paths: TutorialPath[] = [
    mockPath,
    {
      id: "agent-assisted",
      title: "Agent Assisted",
      description: "Let AI guide you",
      difficulty: "intermediate",
      estimatedDuration: "~15 min",
      totalSteps: 5,
      href: "/tutorial/agent-assisted",
    },
    mockAdvancedPath,
  ];

  const pathStatus = {
    "quick-start": "available" as const,
    "agent-assisted": "locked" as const,
    "multi-agent-cockpit": "locked" as const,
  };

  it("renders all paths", () => {
    render(<TutorialPathGrid paths={paths} pathStatus={pathStatus} />);

    expect(screen.getByText("Quick Start")).toBeInTheDocument();
    expect(screen.getByText("Agent Assisted")).toBeInTheDocument();
    expect(screen.getByText("Multi-Agent Cockpit")).toBeInTheDocument();
  });

  it("applies correct status to each path", () => {
    const { container } = render(<TutorialPathGrid paths={paths} pathStatus={pathStatus} />);

    // Quick Start should be available (has link)
    expect(screen.getByRole("link")).toHaveAttribute("href", "/tutorial/quick-start");

    // Other paths should be locked (have opacity-60)
    const lockedCards = container.querySelectorAll(".opacity-60");
    expect(lockedCards.length).toBe(2);
  });

  it("marks recommended path", () => {
    render(
      <TutorialPathGrid paths={paths} pathStatus={pathStatus} recommendedPathId="quick-start" />,
    );

    expect(screen.getByText("Recommended")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <TutorialPathGrid paths={paths} pathStatus={pathStatus} className="custom-grid-class" />,
    );

    expect(container.firstChild).toHaveClass("custom-grid-class");
  });

  it("uses 2-column grid for 2 or fewer paths", () => {
    const twoPaths = paths.slice(0, 2);
    const { container } = render(<TutorialPathGrid paths={twoPaths} pathStatus={pathStatus} />);

    expect(container.firstChild).toHaveClass("sm:grid-cols-2");
    expect(container.firstChild).not.toHaveClass("lg:grid-cols-3");
  });

  it("uses 3-column grid for 3 or more paths", () => {
    const { container } = render(<TutorialPathGrid paths={paths} pathStatus={pathStatus} />);

    expect(container.firstChild).toHaveClass("lg:grid-cols-3");
  });
});
