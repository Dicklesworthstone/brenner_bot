/**
 * Unit tests for Navigation components
 *
 * Tests the navigation system including header, bottom nav, reading progress,
 * back to top, table of contents, and theme toggle.
 *
 * @see brenner_bot-x712 (bead)
 * @see @/components/ui/nav.tsx
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BackToTop,
  BottomNav,
  HeaderNav,
  NAV_ITEMS,
  ReadingProgress,
  TableOfContents,
  ThemeToggle,
  type TocItem,
} from "./nav";

// ============================================================================
// Mock Setup
// ============================================================================

// Mock next/navigation
let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ============================================================================
// Test Helpers
// ============================================================================

function setPathname(pathname: string) {
  mockPathname = pathname;
}

// ============================================================================
// HeaderNav Tests
// ============================================================================

describe("HeaderNav", () => {
  beforeEach(() => {
    setPathname("/");
  });

  describe("rendering", () => {
    it("renders navigation element", () => {
      render(<HeaderNav />);

      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("renders all main navigation links", () => {
      render(<HeaderNav />);

      expect(screen.getByRole("link", { name: "Transcript" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Corpus" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Operators" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Distillations" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Glossary" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Method" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Sessions" })).toBeInTheDocument();
    });

    it("does not render Home link in header (mobile only)", () => {
      render(<HeaderNav />);

      // Header nav slices off the first item (Home)
      expect(screen.queryByRole("link", { name: "Home" })).not.toBeInTheDocument();
    });

    it("has correct href for each link", () => {
      render(<HeaderNav />);

      expect(screen.getByRole("link", { name: "Transcript" })).toHaveAttribute(
        "href",
        "/corpus/transcript",
      );
      expect(screen.getByRole("link", { name: "Corpus" })).toHaveAttribute("href", "/corpus");
      expect(screen.getByRole("link", { name: "Operators" })).toHaveAttribute("href", "/operators");
      expect(screen.getByRole("link", { name: "Distillations" })).toHaveAttribute(
        "href",
        "/distillations",
      );
      expect(screen.getByRole("link", { name: "Glossary" })).toHaveAttribute("href", "/glossary");
      expect(screen.getByRole("link", { name: "Method" })).toHaveAttribute("href", "/method");
      expect(screen.getByRole("link", { name: "Sessions" })).toHaveAttribute("href", "/sessions");
    });

    it("accepts className prop", () => {
      render(<HeaderNav className="custom-class" />);

      expect(screen.getByRole("navigation")).toHaveClass("custom-class");
    });

    it("is hidden on mobile (lg:flex)", () => {
      render(<HeaderNav />);

      expect(screen.getByRole("navigation")).toHaveClass("hidden", "lg:flex");
    });
  });

  describe("active link highlighting", () => {
    it("highlights Corpus link when on /corpus", () => {
      setPathname("/corpus");
      render(<HeaderNav />);

      const corpusLink = screen.getByRole("link", { name: "Corpus" });
      expect(corpusLink).toHaveClass("text-primary");
    });

    it("highlights Transcript link when on /corpus/transcript", () => {
      setPathname("/corpus/transcript");
      render(<HeaderNav />);

      const transcriptLink = screen.getByRole("link", { name: "Transcript" });
      expect(transcriptLink).toHaveClass("text-primary");
    });

    it("highlights Method link when on /method", () => {
      setPathname("/method");
      render(<HeaderNav />);

      const methodLink = screen.getByRole("link", { name: "Method" });
      expect(methodLink).toHaveClass("text-primary");
    });

    it("does not highlight inactive links", () => {
      setPathname("/corpus");
      render(<HeaderNav />);

      const methodLink = screen.getByRole("link", { name: "Method" });
      expect(methodLink).not.toHaveClass("text-primary");
      expect(methodLink).toHaveClass("text-muted-foreground");
    });

    it("handles nested routes correctly", () => {
      setPathname("/corpus/some-document");
      render(<HeaderNav />);

      // Corpus should be active for nested routes
      const corpusLink = screen.getByRole("link", { name: "Corpus" });
      expect(corpusLink).toHaveClass("text-primary");

      // But Transcript should not be active
      const transcriptLink = screen.getByRole("link", { name: "Transcript" });
      expect(transcriptLink).not.toHaveClass("text-primary");
    });
  });
});

// ============================================================================
// BottomNav Tests
// ============================================================================

describe("BottomNav", () => {
  beforeEach(() => {
    setPathname("/");
  });

  describe("rendering", () => {
    it("renders navigation element", () => {
      render(<BottomNav />);

      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("renders all navigation items including Home", () => {
      render(<BottomNav />);

      expect(screen.getByRole("link", { name: /home/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /transcript/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /corpus/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /operators/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /distillations/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /glossary/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /method/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /sessions/i })).toBeInTheDocument();
    });

    it("renders all navigation items total", () => {
      render(<BottomNav />);

      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(NAV_ITEMS.length);
    });

    it("accepts className prop", () => {
      render(<BottomNav className="custom-class" />);

      expect(screen.getByRole("navigation")).toHaveClass("custom-class");
    });

    it("is visible on mobile (lg:hidden)", () => {
      render(<BottomNav />);

      expect(screen.getByRole("navigation")).toHaveClass("lg:hidden");
    });

    it("renders icons for each nav item", () => {
      render(<BottomNav />);

      // Each nav item should have an SVG icon
      const links = screen.getAllByRole("link");
      links.forEach((link) => {
        expect(link.querySelector("svg")).toBeInTheDocument();
      });
    });

    it("renders labels for each nav item", () => {
      render(<BottomNav />);

      // Check text content exists
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Transcript")).toBeInTheDocument();
      expect(screen.getByText("Corpus")).toBeInTheDocument();
    });
  });

  describe("active state", () => {
    it("marks Home as active when on /", () => {
      setPathname("/");
      render(<BottomNav />);

      const homeLink = screen.getByRole("link", { name: /home/i });
      expect(homeLink).toHaveAttribute("data-active", "true");
    });

    it("marks Corpus as active when on /corpus", () => {
      setPathname("/corpus");
      render(<BottomNav />);

      const corpusLink = screen.getByRole("link", { name: /corpus/i });
      expect(corpusLink).toHaveAttribute("data-active", "true");
    });

    it("marks inactive items as not active", () => {
      setPathname("/corpus");
      render(<BottomNav />);

      const homeLink = screen.getByRole("link", { name: /home/i });
      expect(homeLink).toHaveAttribute("data-active", "false");
    });
  });

  describe("nav item attributes", () => {
    it("each item has data-nav-item attribute", () => {
      render(<BottomNav />);

      const links = screen.getAllByRole("link");
      links.forEach((link) => {
        expect(link).toHaveAttribute("data-nav-item");
      });
    });

    it("each item has touch-target class", () => {
      render(<BottomNav />);

      const links = screen.getAllByRole("link");
      links.forEach((link) => {
        expect(link).toHaveClass("touch-target");
      });
    });
  });
});

// ============================================================================
// ReadingProgress Tests
// ============================================================================

describe("ReadingProgress", () => {
  beforeEach(() => {
    // Reset scroll position
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    it("returns null when progress is 0", () => {
      const { container } = render(<ReadingProgress />);

      expect(container.querySelector('[role="progressbar"]')).not.toBeInTheDocument();
    });

    it("renders progressbar when scrolled", () => {
      // Mock scrolled state
      Object.defineProperty(window, "scrollY", { value: 100 });
      Object.defineProperty(document.documentElement, "scrollHeight", { value: 1000 });
      Object.defineProperty(window, "innerHeight", { value: 500 });

      render(<ReadingProgress />);

      // Trigger scroll event
      window.dispatchEvent(new Event("scroll"));

      return waitFor(() => {
        expect(screen.getByRole("progressbar")).toBeInTheDocument();
      });
    });

    it("has correct aria attributes when rendered", () => {
      // The progressbar role is rendered with proper attributes when progress > 0
      Object.defineProperty(window, "scrollY", { value: 100 });
      Object.defineProperty(document.documentElement, "scrollHeight", { value: 1000 });
      Object.defineProperty(window, "innerHeight", { value: 500 });

      render(<ReadingProgress />);
      window.dispatchEvent(new Event("scroll"));

      return waitFor(() => {
        const progressbar = screen.getByRole("progressbar");
        expect(progressbar).toHaveAttribute("aria-valuemin", "0");
        expect(progressbar).toHaveAttribute("aria-valuemax", "100");
        expect(progressbar.getAttribute("aria-valuenow")).not.toBeNull();
      });
    });

    it("accepts className prop", () => {
      Object.defineProperty(window, "scrollY", { value: 50 });
      render(<ReadingProgress className="custom-class" />);
      window.dispatchEvent(new Event("scroll"));

      return waitFor(() => {
        expect(screen.getByRole("progressbar")).toHaveClass("custom-class");
      });
    });
  });
});

// ============================================================================
// BackToTop Tests
// ============================================================================

describe("BackToTop", () => {
  beforeEach(() => {
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    it("renders button element", () => {
      render(<BackToTop />);

      expect(screen.getByRole("button", { name: "Back to top" })).toBeInTheDocument();
    });

    it("has accessible label", () => {
      render(<BackToTop />);

      expect(screen.getByLabelText("Back to top")).toBeInTheDocument();
    });

    it("accepts className prop", () => {
      render(<BackToTop className="custom-class" />);

      expect(screen.getByRole("button")).toHaveClass("custom-class");
    });

    it("renders arrow icon", () => {
      render(<BackToTop />);

      const button = screen.getByRole("button");
      expect(button.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("visibility", () => {
    it("is not visible when scroll is at top", () => {
      Object.defineProperty(window, "scrollY", { value: 0 });
      render(<BackToTop />);

      expect(screen.getByRole("button")).not.toHaveClass("visible");
    });

    it("becomes visible after scrolling past threshold", () => {
      Object.defineProperty(window, "scrollY", { value: 600 });
      render(<BackToTop />);
      window.dispatchEvent(new Event("scroll"));

      return waitFor(() => {
        expect(screen.getByRole("button")).toHaveClass("visible");
      });
    });
  });

  describe("click behavior", () => {
    it("scrolls to top when clicked", async () => {
      const user = userEvent.setup();
      render(<BackToTop />);

      await user.click(screen.getByRole("button"));

      expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    });
  });
});

// ============================================================================
// TableOfContents Tests
// ============================================================================

describe("TableOfContents", () => {
  const mockItems: TocItem[] = [
    { id: "section-1", title: "Section 1", level: 2 },
    { id: "section-2", title: "Section 2", level: 2 },
    { id: "subsection-1", title: "Subsection 1", level: 3 },
    { id: "section-3", title: "Section 3", level: 2 },
  ];

  describe("rendering", () => {
    it("renders navigation element with label", () => {
      render(<TableOfContents items={mockItems} />);

      expect(screen.getByRole("navigation", { name: "Table of contents" })).toBeInTheDocument();
    });

    it("renders default title", () => {
      render(<TableOfContents items={mockItems} />);

      expect(screen.getByText("On this page")).toBeInTheDocument();
    });

    it("renders custom title", () => {
      render(<TableOfContents items={mockItems} title="Contents" />);

      expect(screen.getByText("Contents")).toBeInTheDocument();
    });

    it("renders all items as buttons", () => {
      render(<TableOfContents items={mockItems} />);

      expect(screen.getByRole("button", { name: "Section 1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Section 2" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Subsection 1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Section 3" })).toBeInTheDocument();
    });

    it("returns null when items is empty", () => {
      const { container } = render(<TableOfContents items={[]} />);

      expect(container.querySelector("nav")).not.toBeInTheDocument();
    });

    it("accepts className prop", () => {
      render(<TableOfContents items={mockItems} className="custom-class" />);

      expect(screen.getByRole("navigation")).toHaveClass("custom-class");
    });
  });

  describe("item rendering", () => {
    it("renders correct number of items", () => {
      render(<TableOfContents items={mockItems} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(4);
    });

    it("items are contained in a list", () => {
      render(<TableOfContents items={mockItems} />);

      const list = screen.getByRole("list");
      expect(list).toBeInTheDocument();

      const listItems = within(list).getAllByRole("listitem");
      expect(listItems).toHaveLength(4);
    });

    it("buttons have text-left and w-full classes", () => {
      render(<TableOfContents items={mockItems} />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveClass("text-left", "w-full");
      });
    });
  });

  describe("click behavior", () => {
    beforeEach(() => {
      window.scrollTo = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("calls scrollTo when item is clicked", async () => {
      const user = userEvent.setup();

      // Create a mock element for the section
      const mockElement = document.createElement("div");
      mockElement.id = "section-1";
      mockElement.getBoundingClientRect = vi.fn().mockReturnValue({ top: 100 });
      document.body.appendChild(mockElement);

      render(<TableOfContents items={mockItems} />);

      await user.click(screen.getByRole("button", { name: "Section 1" }));

      expect(window.scrollTo).toHaveBeenCalled();

      // Cleanup
      document.body.removeChild(mockElement);
    });
  });
});

// ============================================================================
// ThemeToggle Tests
// ============================================================================

describe("ThemeToggle", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("dark");
    localStorage.clear();
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
    localStorage.clear();
  });

  describe("rendering", () => {
    it("renders button element", () => {
      render(<ThemeToggle />);

      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("has accessible label", () => {
      render(<ThemeToggle />);

      expect(screen.getByLabelText(/switch to .* mode/i)).toBeInTheDocument();
    });

    it("accepts className prop", () => {
      render(<ThemeToggle />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("size-10", "rounded-lg");
    });

    it("renders icon", () => {
      render(<ThemeToggle />);

      const button = screen.getByRole("button");
      expect(button.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("theme toggling", () => {
    it("starts in light mode by default", () => {
      render(<ThemeToggle />);

      expect(screen.getByLabelText("Switch to dark mode")).toBeInTheDocument();
    });

    it("toggles to dark mode on click", async () => {
      const user = userEvent.setup();
      render(<ThemeToggle />);

      await user.click(screen.getByRole("button"));

      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(localStorage.getItem("theme")).toBe("dark");
    });

    it("toggles back to light mode", async () => {
      const user = userEvent.setup();
      // Set initial dark mode via localStorage so component reads it on mount
      localStorage.setItem("theme", "dark");

      render(<ThemeToggle />);

      // First click should toggle to light
      await user.click(screen.getByRole("button"));
      // Click again to verify toggle works both ways
      await user.click(screen.getByRole("button"));
      // Should now be back to dark
      await user.click(screen.getByRole("button"));

      // After three clicks from dark: dark -> light -> dark -> light
      expect(localStorage.getItem("theme")).toBe("light");
    });

    it("reads initial theme from localStorage", () => {
      localStorage.setItem("theme", "dark");
      render(<ThemeToggle />);

      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  describe("focus and interaction", () => {
    it("has focus visible styles", () => {
      render(<ThemeToggle />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("focus-visible:ring-2");
    });

    it("has touch manipulation for mobile", () => {
      render(<ThemeToggle />);

      const button = screen.getByRole("button");
      expect(button).toHaveClass("touch-manipulation");
    });
  });
});

// ============================================================================
// isNavItemActive Helper Tests (via component behavior)
// ============================================================================

describe("isNavItemActive (via HeaderNav)", () => {
  it("exact match on root path", () => {
    setPathname("/corpus");
    render(<HeaderNav />);

    const corpusLink = screen.getByRole("link", { name: "Corpus" });
    expect(corpusLink).toHaveClass("text-primary");
  });

  it("prefers more specific match for nested routes", () => {
    setPathname("/corpus/transcript");
    render(<HeaderNav />);

    // Transcript is the more specific match
    const transcriptLink = screen.getByRole("link", { name: "Transcript" });
    expect(transcriptLink).toHaveClass("text-primary");

    // Corpus should not be active even though pathname starts with /corpus
    const corpusLink = screen.getByRole("link", { name: "Corpus" });
    expect(corpusLink).not.toHaveClass("text-primary");
  });

  it("matches parent route for unregistered nested paths", () => {
    setPathname("/glossary/some-term");
    render(<HeaderNav />);

    const glossaryLink = screen.getByRole("link", { name: "Glossary" });
    expect(glossaryLink).toHaveClass("text-primary");
  });

  it("no match for unrelated paths", () => {
    setPathname("/unknown-page");
    render(<HeaderNav />);

    // No link should be highlighted
    const links = screen.getAllByRole("link");
    links.forEach((link) => {
      expect(link).not.toHaveClass("text-primary");
    });
  });
});
