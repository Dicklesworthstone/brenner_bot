/**
 * Unit tests for Home page
 *
 * Tests the landing page rendering, hero section, feature cards,
 * stats display, and lab mode conditional rendering.
 *
 * @see @/app/page.tsx
 */

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Import after mocks
import Home from "./page";

// Helper to set BRENNER_LAB_MODE
function withEnv(overrides: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(overrides)) {
    saved[key] = process.env[key];
    if (overrides[key] === undefined) delete process.env[key];
    else process.env[key] = overrides[key];
  }

  try {
    fn();
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

describe("Home Page", () => {
  beforeEach(() => {
    // Clear BRENNER_LAB_MODE before each test
    delete process.env.BRENNER_LAB_MODE;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("hero section", () => {
    it("displays the main title", () => {
      render(<Home />);

      expect(screen.getByRole("heading", { name: /brennerbot/i, level: 1 })).toBeInTheDocument();
    });

    it("shows the lab mode badge", () => {
      render(<Home />);

      expect(screen.getByText(/brennerbot lab mode/i)).toBeInTheDocument();
    });

    it("displays the subtitle/description", () => {
      render(<Home />);

      expect(screen.getByText(/coordinate claude.*gpt.*gemini/i)).toBeInTheDocument();
    });

    it("includes primary CTA links", () => {
      render(<Home />);

      // There may be multiple "Get started" links (hero + onboarding), so check the one in hero
      const tutorialLinks = screen.getAllByRole("link", { name: /get started/i });
      const heroTutorialLink = tutorialLinks.find(
        (link) => link.getAttribute("href") === "/tutorial",
      );
      expect(heroTutorialLink).toBeDefined();

      expect(screen.getByRole("link", { name: /read the method/i })).toHaveAttribute(
        "href",
        "/method",
      );

      expect(screen.getByRole("link", { name: /view distillations/i })).toHaveAttribute(
        "href",
        "/distillations",
      );
    });
  });

  describe("features section", () => {
    it("displays the What's Inside heading", () => {
      render(<Home />);

      expect(screen.getByRole("heading", { name: /what's inside/i })).toBeInTheDocument();
    });

    it("displays all three feature cards", () => {
      render(<Home />);

      // Find by card titles
      expect(screen.getByText("Corpus")).toBeInTheDocument();
      expect(screen.getByText("Distillations")).toBeInTheDocument();
      expect(screen.getByText("Method")).toBeInTheDocument();
    });

    it("feature cards link to correct pages", () => {
      render(<Home />);

      // Corpus link
      const corpusCard = screen.getByText("Corpus").closest("a");
      expect(corpusCard).toHaveAttribute("href", "/corpus");

      // Distillations link
      const distillationsCard = screen.getByText("Distillations").closest("a");
      expect(distillationsCard).toHaveAttribute("href", "/distillations");

      // Method link
      const methodCard = screen.getByText("Method").closest("a");
      expect(methodCard).toHaveAttribute("href", "/method");
    });

    it("shows feature descriptions", () => {
      render(<Home />);

      expect(screen.getByText(/complete brenner transcript collection/i)).toBeInTheDocument();
      // Distillations description - text may be split across Jargon components
      // Find paragraph elements specifically to avoid matching parent containers
      expect(
        screen.getByText((_, element) => {
          if (element?.tagName.toLowerCase() !== "p") return false;
          return element?.textContent?.toLowerCase().includes("three frontier model") ?? false;
        }),
      ).toBeInTheDocument();
      // Operators/loop structure - text may be split across Jargon components
      expect(
        screen.getByText((_, element) => {
          if (element?.tagName.toLowerCase() !== "p") return false;
          const text = element?.textContent?.toLowerCase() ?? "";
          return text.includes("operators") && text.includes("loop structure");
        }),
      ).toBeInTheDocument();
    });

    it("shows feature labels", () => {
      render(<Home />);

      expect(screen.getByText("Browse")).toBeInTheDocument();
      expect(screen.getByText("Compare")).toBeInTheDocument();
      expect(screen.getByText("Learn")).toBeInTheDocument();
    });
  });

  describe("stats section", () => {
    it("displays all four stat labels", () => {
      render(<Home />);

      // The numbers are animated via AnimatedCounter and start at 0 in tests
      // So we check for the labels only
      expect(screen.getByText("Interview Segments")).toBeInTheDocument();
      expect(screen.getByText("Model Distillations")).toBeInTheDocument();
      expect(screen.getByText("Operator Types")).toBeInTheDocument();
      expect(screen.getByText("Words of Wisdom")).toBeInTheDocument();
    });
  });

  describe("quote section", () => {
    it("displays the Brenner quote", () => {
      render(<Home />);

      const quote = screen.getByText((_content, element) => {
        if (!element || element.tagName.toLowerCase() !== "p") return false;
        return /classical approach[\s\S]*studying a problem/i.test(element.textContent ?? "");
      });
      expect(quote).toBeInTheDocument();
    });

    it("shows quote attribution", () => {
      render(<Home />);

      // Sydney Brenner appears in multiple places (hero, quote, onboarding)
      // Verify at least one instance exists
      const brennerMentions = screen.getAllByText(/Sydney Brenner/);
      expect(brennerMentions.length).toBeGreaterThan(0);

      // Verify the Nobel attribution is present
      expect(screen.getByText(/nobel laureate.*physiology.*medicine.*2002/i)).toBeInTheDocument();
    });
  });

  describe("lab mode", () => {
    it("does not show lab mode card when BRENNER_LAB_MODE is not set", () => {
      render(<Home />);

      expect(screen.queryByText(/start a research session/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/lab mode active/i)).not.toBeInTheDocument();
    });

    it("does not show lab mode card when BRENNER_LAB_MODE is false", () => {
      withEnv({ BRENNER_LAB_MODE: "false" }, () => {
        render(<Home />);
      });

      expect(screen.queryByText(/start a research session/i)).not.toBeInTheDocument();
    });

    it("does not show lab mode card when BRENNER_LAB_MODE is 0", () => {
      withEnv({ BRENNER_LAB_MODE: "0" }, () => {
        render(<Home />);
      });

      expect(screen.queryByText(/start a research session/i)).not.toBeInTheDocument();
    });

    it("shows lab mode card when BRENNER_LAB_MODE is true", () => {
      withEnv({ BRENNER_LAB_MODE: "true" }, () => {
        render(<Home />);

        expect(screen.getByText(/lab mode active/i)).toBeInTheDocument();
        expect(screen.getByText(/start a research session/i)).toBeInTheDocument();
      });
    });

    it("shows lab mode card when BRENNER_LAB_MODE is 1", () => {
      withEnv({ BRENNER_LAB_MODE: "1" }, () => {
        render(<Home />);

        expect(screen.getByText(/lab mode active/i)).toBeInTheDocument();
      });
    });

    it("lab mode card links to sessions/new", () => {
      withEnv({ BRENNER_LAB_MODE: "true" }, () => {
        render(<Home />);

        const labModeCard = screen.getByText(/start a research session/i).closest("a");
        expect(labModeCard).toHaveAttribute("href", "/sessions/new");
      });
    });

    it("handles BRENNER_LAB_MODE with whitespace", () => {
      withEnv({ BRENNER_LAB_MODE: "  true  " }, () => {
        render(<Home />);

        expect(screen.getByText(/lab mode active/i)).toBeInTheDocument();
      });
    });

    it("handles BRENNER_LAB_MODE with mixed case", () => {
      withEnv({ BRENNER_LAB_MODE: "TRUE" }, () => {
        render(<Home />);

        expect(screen.getByText(/lab mode active/i)).toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("has a proper heading hierarchy", () => {
      render(<Home />);

      // H1 for main title
      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1).toBeInTheDocument();

      // H2 for section headings
      const h2s = screen.getAllByRole("heading", { level: 2 });
      expect(h2s.length).toBeGreaterThan(0);
    });

    it("all links are keyboard accessible", () => {
      render(<Home />);

      const links = screen.getAllByRole("link");
      links.forEach((link) => {
        expect(link).toBeVisible();
        // Links should have href
        expect(link).toHaveAttribute("href");
      });
    });
  });
});
