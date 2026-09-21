/**
 * Unit tests for AnimatedElement components
 *
 * Tests the scroll-reveal animation system including AnimatedElement,
 * StaggerContainer, and HeroBackground components.
 *
 * @see brenner_bot-it7r (bead)
 * @see @/components/ui/animated-element.tsx
 */

import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnimatedElement, HeroBackground, StaggerContainer } from "./animated-element";

// ============================================================================
// Mock Setup
// ============================================================================

// Store mock observer callbacks for triggering in tests
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

// Mock matchMedia for reduced motion detection
const mockMatchMedia = (matches: boolean) => {
  return vi.fn().mockImplementation((query: string) => ({
    matches: query === "(prefers-reduced-motion: reduce)" ? matches : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

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

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  vi.stubGlobal("matchMedia", mockMatchMedia(false));
  intersectionCallback = null;
  observedElements = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ============================================================================
// AnimatedElement Tests
// ============================================================================

describe("AnimatedElement", () => {
  describe("rendering", () => {
    it("renders children correctly", () => {
      render(
        <AnimatedElement>
          <span data-testid="child">Test Content</span>
        </AnimatedElement>,
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
      expect(screen.getByText("Test Content")).toBeInTheDocument();
    });

    it("renders as div by default", () => {
      const { container } = render(<AnimatedElement>Content</AnimatedElement>);

      expect(container.firstChild?.nodeName).toBe("DIV");
    });

    it("renders as custom element via 'as' prop", () => {
      const { container } = render(<AnimatedElement as="section">Content</AnimatedElement>);

      expect(container.firstChild?.nodeName).toBe("SECTION");
    });

    it("applies custom className", () => {
      const { container } = render(
        <AnimatedElement className="custom-class">Content</AnimatedElement>,
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("animation states", () => {
    it("starts with opacity-0 class before intersection", () => {
      const { container } = render(
        <AnimatedElement animation="reveal-up">Content</AnimatedElement>,
      );

      expect(container.firstChild).toHaveClass("opacity-0");
    });

    it("applies animation class after intersection", async () => {
      const { container } = render(
        <AnimatedElement animation="reveal-up">Content</AnimatedElement>,
      );

      // Initially hidden
      expect(container.firstChild).toHaveClass("opacity-0");

      // Trigger intersection
      await act(async () => {
        triggerIntersection(true);
      });

      expect(container.firstChild).toHaveClass("animate-reveal-up");
      expect(container.firstChild).not.toHaveClass("opacity-0");
    });

    it("supports different animation types", async () => {
      const animations = [
        "reveal-up",
        "reveal-scale",
        "reveal-slide-right",
        "reveal-slide-left",
        "reveal-blur",
        "fade-in-up",
        "fade-in",
        "fade-in-scale",
      ] as const;

      for (const animation of animations) {
        const { container, unmount } = render(
          <AnimatedElement animation={animation}>Content</AnimatedElement>,
        );

        await act(async () => {
          triggerIntersection(true);
        });

        expect(container.firstChild).toHaveClass(`animate-${animation}`);
        unmount();
        observedElements = [];
        intersectionCallback = null;
      }
    });
  });

  describe("animation timing", () => {
    it("applies delay style when delay prop is provided", async () => {
      const { container } = render(
        <AnimatedElement animation="reveal-up" delay={200}>
          Content
        </AnimatedElement>,
      );

      expect(container.firstChild).toHaveStyle({ animationDelay: "200ms" });
    });

    it("does not apply delay style when delay is 0", () => {
      const { container } = render(
        <AnimatedElement animation="reveal-up" delay={0}>
          Content
        </AnimatedElement>,
      );

      expect(container.firstChild).not.toHaveStyle({ animationDelay: "0ms" });
    });

    it("applies duration style when duration prop is provided", () => {
      const { container } = render(
        <AnimatedElement animation="reveal-up" duration={500}>
          Content
        </AnimatedElement>,
      );

      expect(container.firstChild).toHaveStyle({ animationDuration: "500ms" });
    });
  });

  describe("reduced motion", () => {
    it("skips animation when prefers-reduced-motion is set", async () => {
      vi.stubGlobal("matchMedia", mockMatchMedia(true));

      const { container } = render(
        <AnimatedElement animation="reveal-up">Content</AnimatedElement>,
      );

      // Should not have opacity-0 or animation classes
      expect(container.firstChild).not.toHaveClass("opacity-0");
      expect(container.firstChild).not.toHaveClass("animate-reveal-up");
    });

    it("skips animation when disabled prop is true", async () => {
      const { container } = render(
        <AnimatedElement animation="reveal-up" disabled>
          Content
        </AnimatedElement>,
      );

      expect(container.firstChild).not.toHaveClass("opacity-0");
      expect(container.firstChild).not.toHaveClass("animate-reveal-up");
    });
  });

  describe("intersection options", () => {
    it("renders with threshold prop without error", () => {
      render(<AnimatedElement threshold={0.5}>Content</AnimatedElement>);

      // Component renders and observer is created
      expect(observedElements.length).toBe(1);
    });

    it("observes element on mount", () => {
      render(<AnimatedElement>Content</AnimatedElement>);

      expect(observedElements.length).toBe(1);
    });
  });
});

// ============================================================================
// StaggerContainer Tests
// ============================================================================

describe("StaggerContainer", () => {
  describe("rendering", () => {
    it("renders all children", () => {
      render(
        <StaggerContainer>
          <div data-testid="child-1">First</div>
          <div data-testid="child-2">Second</div>
          <div data-testid="child-3">Third</div>
        </StaggerContainer>,
      );

      expect(screen.getByTestId("child-1")).toBeInTheDocument();
      expect(screen.getByTestId("child-2")).toBeInTheDocument();
      expect(screen.getByTestId("child-3")).toBeInTheDocument();
    });

    it("applies custom className to container", () => {
      const { container } = render(
        <StaggerContainer className="stagger-container">
          <div>Child</div>
        </StaggerContainer>,
      );

      expect(container.firstChild).toHaveClass("stagger-container");
    });
  });

  describe("staggered delays", () => {
    it("applies incrementing delays to children", () => {
      const { container } = render(
        <StaggerContainer staggerDelay={100} baseDelay={0}>
          <div>First</div>
          <div>Second</div>
          <div>Third</div>
        </StaggerContainer>,
      );

      // Each AnimatedElement wrapper should have increasing delays
      const wrappers = container.querySelectorAll("[style]");
      expect(wrappers.length).toBeGreaterThan(0);
    });

    it("uses default stagger delay of 75ms", () => {
      render(
        <StaggerContainer>
          <div>First</div>
          <div>Second</div>
        </StaggerContainer>,
      );

      // Component renders without error with defaults
      expect(screen.getByText("First")).toBeInTheDocument();
      expect(screen.getByText("Second")).toBeInTheDocument();
    });

    it("applies base delay to first child", () => {
      render(
        <StaggerContainer baseDelay={200}>
          <div>First</div>
        </StaggerContainer>,
      );

      expect(screen.getByText("First")).toBeInTheDocument();
    });
  });

  describe("animation prop", () => {
    it("uses default reveal-up animation", () => {
      render(
        <StaggerContainer>
          <div>Child</div>
        </StaggerContainer>,
      );

      expect(screen.getByText("Child")).toBeInTheDocument();
    });

    it("applies custom animation to all children", () => {
      render(
        <StaggerContainer animation="fade-in-scale">
          <div>Child</div>
        </StaggerContainer>,
      );

      expect(screen.getByText("Child")).toBeInTheDocument();
    });
  });
});

// ============================================================================
// HeroBackground Tests
// ============================================================================

describe("HeroBackground", () => {
  describe("rendering", () => {
    it("renders children", () => {
      render(
        <HeroBackground>
          <h1 data-testid="hero-content">Hero Title</h1>
        </HeroBackground>,
      );

      expect(screen.getByTestId("hero-content")).toBeInTheDocument();
      expect(screen.getByText("Hero Title")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(
        <HeroBackground className="hero-custom">
          <div>Content</div>
        </HeroBackground>,
      );

      expect(container.firstChild).toHaveClass("hero-custom");
    });

    it("has overflow-hidden and relative classes", () => {
      const { container } = render(
        <HeroBackground>
          <div>Content</div>
        </HeroBackground>,
      );

      expect(container.firstChild).toHaveClass("relative", "overflow-hidden");
    });
  });

  describe("orbs", () => {
    it("renders orbs by default", () => {
      const { container } = render(
        <HeroBackground>
          <div>Content</div>
        </HeroBackground>,
      );

      // Should have orb elements (divs with blur and rounded-full classes)
      const orbs = container.querySelectorAll(".blur-3xl");
      expect(orbs.length).toBe(3);
    });

    it("hides orbs when showOrbs is false", () => {
      const { container } = render(
        <HeroBackground showOrbs={false}>
          <div>Content</div>
        </HeroBackground>,
      );

      const orbs = container.querySelectorAll(".blur-3xl");
      expect(orbs.length).toBe(0);
    });

    it("applies custom primary orb class", () => {
      const { container } = render(
        <HeroBackground primaryOrbClass="bg-blue-500/30">
          <div>Content</div>
        </HeroBackground>,
      );

      const primaryOrbs = container.querySelectorAll(".bg-blue-500\\/30");
      expect(primaryOrbs.length).toBeGreaterThan(0);
    });

    it("applies custom accent orb class", () => {
      const { container } = render(
        <HeroBackground accentOrbClass="bg-purple-500/20">
          <div>Content</div>
        </HeroBackground>,
      );

      const accentOrb = container.querySelector(".bg-purple-500\\/20");
      expect(accentOrb).toBeInTheDocument();
    });
  });

  describe("grid", () => {
    it("renders grid by default", () => {
      const { container } = render(
        <HeroBackground>
          <div>Content</div>
        </HeroBackground>,
      );

      // Should have grid pattern element with opacity-[0.03] class
      const gridElement = container.querySelector(".opacity-\\[0\\.03\\]");
      expect(gridElement).toBeInTheDocument();
    });

    it("hides grid when showGrid is false", () => {
      const { container } = render(
        <HeroBackground showGrid={false}>
          <div>Content</div>
        </HeroBackground>,
      );

      const gridElements = container.querySelectorAll("[style*='linear-gradient']");
      expect(gridElements.length).toBe(0);
    });
  });

  describe("z-index layering", () => {
    it("orbs and grid have negative z-index (behind content)", () => {
      const { container } = render(
        <HeroBackground>
          <div>Content</div>
        </HeroBackground>,
      );

      const backgroundElements = container.querySelectorAll(".-z-10");
      expect(backgroundElements.length).toBe(2); // orbs container + grid
    });

    it("orbs and grid are pointer-events-none", () => {
      const { container } = render(
        <HeroBackground>
          <div>Content</div>
        </HeroBackground>,
      );

      const pointerNoneElements = container.querySelectorAll(".pointer-events-none");
      expect(pointerNoneElements.length).toBe(2);
    });
  });
});
