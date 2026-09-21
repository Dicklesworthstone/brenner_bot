/**
 * Unit tests for Skeleton components
 *
 * Tests Skeleton, SkeletonText, SkeletonCard, SkeletonAvatar, SkeletonButton, SkeletonInput.
 * Philosophy: NO mocks - test real component behavior and DOM output.
 *
 * @see @/components/ui/skeleton.tsx
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Skeleton,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonCard,
  SkeletonInput,
  SkeletonText,
} from "./skeleton";

describe("Skeleton", () => {
  it("renders a div", () => {
    render(<Skeleton data-testid="skeleton" />);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });

  it("has shimmer animation class", () => {
    render(<Skeleton data-testid="skeleton" />);
    expect(screen.getByTestId("skeleton")).toHaveClass("animate-shimmer");
  });

  it("has rounded corners", () => {
    render(<Skeleton data-testid="skeleton" />);
    expect(screen.getByTestId("skeleton")).toHaveClass("rounded-lg");
  });

  it("applies custom className", () => {
    render(<Skeleton data-testid="skeleton" className="h-4 w-full" />);
    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveClass("h-4", "w-full");
  });
});

describe("SkeletonText", () => {
  it("renders default 3 lines", () => {
    render(<SkeletonText data-testid="skeleton-text" />);
    const container = screen.getByTestId("skeleton-text");
    const lines = container.querySelectorAll(".animate-shimmer");
    expect(lines).toHaveLength(3);
  });

  it("renders custom number of lines", () => {
    render(<SkeletonText data-testid="skeleton-text" lines={5} />);
    const container = screen.getByTestId("skeleton-text");
    const lines = container.querySelectorAll(".animate-shimmer");
    expect(lines).toHaveLength(5);
  });

  it("last line is shorter", () => {
    render(<SkeletonText data-testid="skeleton-text" lines={2} />);
    const container = screen.getByTestId("skeleton-text");
    const lines = container.querySelectorAll(".animate-shimmer");
    expect(lines[1]).toHaveClass("w-3/4");
  });

  it("applies custom className", () => {
    render(<SkeletonText data-testid="skeleton-text" className="custom-class" />);
    expect(screen.getByTestId("skeleton-text")).toHaveClass("custom-class");
  });
});

describe("SkeletonCard", () => {
  it("renders card structure", () => {
    render(<SkeletonCard data-testid="skeleton-card" />);
    expect(screen.getByTestId("skeleton-card")).toBeInTheDocument();
  });

  it("has card styling", () => {
    render(<SkeletonCard data-testid="skeleton-card" />);
    const card = screen.getByTestId("skeleton-card");
    expect(card).toHaveClass("rounded-xl", "border", "bg-card");
  });

  it("contains skeleton elements", () => {
    render(<SkeletonCard data-testid="skeleton-card" />);
    const card = screen.getByTestId("skeleton-card");
    const skeletons = card.querySelectorAll(".animate-shimmer");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("applies custom className", () => {
    render(<SkeletonCard data-testid="skeleton-card" className="custom-card" />);
    expect(screen.getByTestId("skeleton-card")).toHaveClass("custom-card");
  });
});

describe("SkeletonAvatar", () => {
  it("renders round skeleton", () => {
    render(<SkeletonAvatar data-testid="skeleton-avatar" />);
    expect(screen.getByTestId("skeleton-avatar")).toHaveClass("rounded-full");
  });

  it("has medium size by default", () => {
    render(<SkeletonAvatar data-testid="skeleton-avatar" />);
    expect(screen.getByTestId("skeleton-avatar")).toHaveClass("size-10");
  });

  it("supports small size", () => {
    render(<SkeletonAvatar data-testid="skeleton-avatar" size="sm" />);
    expect(screen.getByTestId("skeleton-avatar")).toHaveClass("size-8");
  });

  it("supports large size", () => {
    render(<SkeletonAvatar data-testid="skeleton-avatar" size="lg" />);
    expect(screen.getByTestId("skeleton-avatar")).toHaveClass("size-12");
  });

  it("applies custom className", () => {
    render(<SkeletonAvatar data-testid="skeleton-avatar" className="custom-avatar" />);
    expect(screen.getByTestId("skeleton-avatar")).toHaveClass("custom-avatar");
  });
});

describe("SkeletonButton", () => {
  it("renders button-shaped skeleton", () => {
    render(<SkeletonButton data-testid="skeleton-button" />);
    expect(screen.getByTestId("skeleton-button")).toHaveClass("rounded-lg");
  });

  it("has default size", () => {
    render(<SkeletonButton data-testid="skeleton-button" />);
    expect(screen.getByTestId("skeleton-button")).toHaveClass("h-10", "w-24");
  });

  it("supports small size", () => {
    render(<SkeletonButton data-testid="skeleton-button" size="sm" />);
    expect(screen.getByTestId("skeleton-button")).toHaveClass("h-8", "w-20");
  });

  it("supports large size", () => {
    render(<SkeletonButton data-testid="skeleton-button" size="lg" />);
    expect(screen.getByTestId("skeleton-button")).toHaveClass("h-12", "w-32");
  });

  it("applies custom className", () => {
    render(<SkeletonButton data-testid="skeleton-button" className="custom-button" />);
    expect(screen.getByTestId("skeleton-button")).toHaveClass("custom-button");
  });
});

describe("SkeletonInput", () => {
  it("renders input-shaped skeleton with label", () => {
    render(<SkeletonInput data-testid="skeleton-input" />);
    const container = screen.getByTestId("skeleton-input");
    const skeletons = container.querySelectorAll(".animate-shimmer");
    // Should have label skeleton and input skeleton
    expect(skeletons).toHaveLength(2);
  });

  it("has spaced layout", () => {
    render(<SkeletonInput data-testid="skeleton-input" />);
    expect(screen.getByTestId("skeleton-input")).toHaveClass("space-y-2");
  });

  it("applies custom className", () => {
    render(<SkeletonInput data-testid="skeleton-input" className="custom-input" />);
    expect(screen.getByTestId("skeleton-input")).toHaveClass("custom-input");
  });
});
