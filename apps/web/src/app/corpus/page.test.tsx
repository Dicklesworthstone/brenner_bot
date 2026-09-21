/**
 * Unit tests for Corpus Index page
 *
 * Tests the corpus page rendering, document cards, search functionality,
 * category filtering, and collapsible sections.
 *
 * @see @/app/corpus/page.tsx
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CorpusIndexPage from "./page";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock IntersectionObserver for AnimatedElement
vi.mock("@/components/ui/animated-element", () => ({
  AnimatedElement: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  HeroBackground: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

describe("CorpusIndexPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial render", () => {
    it("displays the page title", () => {
      render(<CorpusIndexPage />);

      expect(screen.getByRole("heading", { name: /corpus/i, level: 1 })).toBeInTheDocument();
    });

    it("shows the subtitle", () => {
      render(<CorpusIndexPage />);

      expect(screen.getByText(/complete brenner document collection/i)).toBeInTheDocument();
    });

    it("displays search input with placeholder", () => {
      render(<CorpusIndexPage />);

      const searchInput = screen.getByPlaceholderText(/filter by title/i);
      expect(searchInput).toBeInTheDocument();
    });

    it("shows category filter pills", () => {
      render(<CorpusIndexPage />);

      // Should show All, Primary Sources, Model Distillations, Metaprompts
      // Use getAllByRole since category names appear as both filter pills and section headers
      const allButtons = screen.getAllByRole("button", { name: /all/i });
      expect(allButtons.length).toBeGreaterThan(0);

      const primaryButtons = screen.getAllByRole("button", { name: /primary sources/i });
      expect(primaryButtons.length).toBeGreaterThan(0);

      const distButtons = screen.getAllByRole("button", { name: /model distillations/i });
      expect(distButtons.length).toBeGreaterThan(0);

      const promptButtons = screen.getAllByRole("button", { name: /metaprompts/i });
      expect(promptButtons.length).toBeGreaterThan(0);
    });

    it("shows all document cards", () => {
      render(<CorpusIndexPage />);

      // Primary sources
      expect(screen.getByText("Complete Brenner Transcript")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /quote bank/i })).toBeInTheDocument();

      // Distillations
      expect(screen.getByText("Opus 4.5 Distillation")).toBeInTheDocument();
      expect(screen.getByText("GPT-5.2 Distillation")).toBeInTheDocument();
      expect(screen.getByText("Gemini 3 Distillation")).toBeInTheDocument();

      // Metaprompts
      expect(screen.getByText("Metaprompt Template")).toBeInTheDocument();
      expect(screen.getByText("Initial Metaprompt")).toBeInTheDocument();
    });

    it("shows model badges on distillation cards", () => {
      render(<CorpusIndexPage />);

      const opusBadges = screen.getAllByText("Claude Opus 4.5");
      expect(opusBadges.length).toBeGreaterThan(0);
      const gptBadges = screen.getAllByText("GPT-5.2 Pro");
      expect(gptBadges.length).toBeGreaterThan(0);
      const geminiBadges = screen.getAllByText("Gemini 3");
      expect(geminiBadges.length).toBeGreaterThan(0);
    });

    it("shows read time estimates", () => {
      render(<CorpusIndexPage />);

      // Check that we have multiple time estimates displayed
      // Some times may appear multiple times (e.g., "45 min" for both quote bank and opus)
      expect(screen.getByText("2+ hours")).toBeInTheDocument(); // transcript only
      const fortyfiveMin = screen.getAllByText("45 min");
      expect(fortyfiveMin.length).toBeGreaterThan(0);
      const tenMin = screen.getAllByText("10 min");
      expect(tenMin.length).toBeGreaterThan(0);
    });
  });

  describe("document cards", () => {
    it("each card links to correct document page", () => {
      render(<CorpusIndexPage />);

      // Find all links and verify we have links to the expected document pages
      const links = screen.getAllByRole("link");
      const hrefs = links.map((link) => link.getAttribute("href"));

      expect(hrefs).toContain("/corpus/transcript");
      expect(hrefs).toContain("/corpus/quote-bank");
      expect(hrefs).toContain("/corpus/distillation-opus-45");
      expect(hrefs).toContain("/corpus/distillation-gpt-52");
      expect(hrefs).toContain("/corpus/distillation-gemini-3");
      expect(hrefs).toContain("/corpus/metaprompt");
      expect(hrefs).toContain("/corpus/initial-metaprompt");
    });

    it("shows document descriptions", () => {
      render(<CorpusIndexPage />);

      expect(screen.getByText(/236 interview segments.*web of stories/i)).toBeInTheDocument();
      expect(screen.getByText(/curated verbatim quotes indexed by operator/i)).toBeInTheDocument();
    });
  });

  describe("search functionality", () => {
    it("filters documents by title when typing", async () => {
      const user = userEvent.setup();
      render(<CorpusIndexPage />);

      const searchInput = screen.getByPlaceholderText(/filter by title/i);
      await user.type(searchInput, "transcript");

      await waitFor(() => {
        expect(screen.getByText(/1 result/i)).toBeInTheDocument();
      });

      expect(screen.getByText("Complete Brenner Transcript")).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /quote bank/i })).not.toBeInTheDocument();
    });

    it("filters by description content", async () => {
      const user = userEvent.setup();
      render(<CorpusIndexPage />);

      const searchInput = screen.getByPlaceholderText(/filter by title/i);
      await user.type(searchInput, "236");

      await waitFor(() => {
        expect(screen.getByText("Complete Brenner Transcript")).toBeInTheDocument();
      });
    });

    it("shows empty state when no results", async () => {
      const user = userEvent.setup();
      render(<CorpusIndexPage />);

      const searchInput = screen.getByPlaceholderText(/filter by title/i);
      await user.type(searchInput, "xyznonexistent123");

      await waitFor(() => {
        expect(screen.getByText(/no documents found/i)).toBeInTheDocument();
      });
    });

    it("shows clear filters button when no results", async () => {
      const user = userEvent.setup();
      render(<CorpusIndexPage />);

      const searchInput = screen.getByPlaceholderText(/filter by title/i);
      await user.type(searchInput, "xyznonexistent123");

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
      });
    });

    it("clears search and shows all docs when clear button clicked", async () => {
      const user = userEvent.setup();
      render(<CorpusIndexPage />);

      const searchInput = screen.getByPlaceholderText(/filter by title/i);
      await user.type(searchInput, "xyznonexistent123");

      await waitFor(() => {
        expect(screen.getByText(/no documents found/i)).toBeInTheDocument();
      });

      const clearButton = screen.getByRole("button", { name: /clear filters/i });
      await user.click(clearButton);

      await waitFor(() => {
        expect(screen.getByText("Complete Brenner Transcript")).toBeInTheDocument();
        expect(screen.queryByText(/no documents found/i)).not.toBeInTheDocument();
      });
    });

    it("shows result count while searching", async () => {
      const user = userEvent.setup();
      render(<CorpusIndexPage />);

      const searchInput = screen.getByPlaceholderText(/filter by title/i);
      await user.type(searchInput, "distillation");

      await waitFor(() => {
        expect(screen.getByText(/3 results/i)).toBeInTheDocument();
      });
    });

    it("clears search with X button", async () => {
      const user = userEvent.setup();
      render(<CorpusIndexPage />);

      const searchInput = screen.getByPlaceholderText(/filter by title/i);
      await user.type(searchInput, "transcript");

      await waitFor(() => {
        expect(screen.getByText(/1 result/i)).toBeInTheDocument();
      });

      // Find and click the X button (inside the search bar)
      const searchContainer = searchInput.closest("div");
      const parentElement = searchContainer?.parentElement;
      if (!parentElement) throw new Error("Expected parent element");
      const clearButton = within(parentElement).getByRole("button");
      await user.click(clearButton);

      await waitFor(() => {
        expect(searchInput).toHaveValue("");
      });
    });
  });

  describe("category filtering", () => {
    it("filters to primary sources when clicked", async () => {
      const user = userEvent.setup();
      render(<CorpusIndexPage />);

      // Get the first matching button (the filter pill, not the section header)
      const primaryButtons = screen.getAllByRole("button", {
        name: /primary sources/i,
      });
      const primaryButton = primaryButtons[0];
      if (!primaryButton) throw new Error("Expected primary sources filter button");
      await user.click(primaryButton);

      await waitFor(() => {
        // Primary sources should be visible
        expect(screen.getByText("Complete Brenner Transcript")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /quote bank/i })).toBeInTheDocument();

        // Distillations and metaprompts should be hidden
        expect(screen.queryByText("Opus 4.5 Distillation")).not.toBeInTheDocument();
        expect(screen.queryByText("Metaprompt Template")).not.toBeInTheDocument();
      });
    });

    it("filters to distillations when clicked", async () => {
      const user = userEvent.setup();
      render(<CorpusIndexPage />);

      // Get the first matching button (the filter pill)
      const distButtons = screen.getAllByRole("button", {
        name: /model distillations/i,
      });
      const distButton = distButtons[0];
      if (!distButton) throw new Error("Expected model distillations filter button");
      await user.click(distButton);

      await waitFor(() => {
        // Distillations should be visible
        expect(screen.getByText("Opus 4.5 Distillation")).toBeInTheDocument();
        expect(screen.getByText("GPT-5.2 Distillation")).toBeInTheDocument();
        expect(screen.getByText("Gemini 3 Distillation")).toBeInTheDocument();

        // Others should be hidden
        expect(screen.queryByText("Complete Brenner Transcript")).not.toBeInTheDocument();
        expect(screen.queryByText("Metaprompt Template")).not.toBeInTheDocument();
      });
    });

    it("filters to metaprompts when clicked", async () => {
      const user = userEvent.setup();
      render(<CorpusIndexPage />);

      // Get the first matching button (the filter pill)
      const promptsButtons = screen.getAllByRole("button", {
        name: /metaprompts/i,
      });
      const promptsButton = promptsButtons[0];
      if (!promptsButton) throw new Error("Expected metaprompts filter button");
      await user.click(promptsButton);

      await waitFor(() => {
        expect(screen.getByText("Metaprompt Template")).toBeInTheDocument();
        expect(screen.getByText("Initial Metaprompt")).toBeInTheDocument();
        expect(screen.queryByText("Complete Brenner Transcript")).not.toBeInTheDocument();
      });
    });

    it("returns to all when All is clicked", async () => {
      const user = userEvent.setup();
      render(<CorpusIndexPage />);

      // First filter to distillations
      const distButtons = screen.getAllByRole("button", {
        name: /model distillations/i,
      });
      const distButton = distButtons[0];
      if (!distButton) throw new Error("Expected model distillations filter button");
      await user.click(distButton);

      // Then click All
      const allButtons = screen.getAllByRole("button", { name: /all/i });
      const allButton = allButtons[0];
      if (!allButton) throw new Error("Expected All filter button");
      await user.click(allButton);

      await waitFor(() => {
        expect(screen.getByText("Complete Brenner Transcript")).toBeInTheDocument();
        expect(screen.getByText("Opus 4.5 Distillation")).toBeInTheDocument();
        expect(screen.getByText("Metaprompt Template")).toBeInTheDocument();
      });
    });

    it("combines search and category filter", async () => {
      const user = userEvent.setup();
      render(<CorpusIndexPage />);

      // Filter to distillations
      const distButtons = screen.getAllByRole("button", {
        name: /model distillations/i,
      });
      const distButton = distButtons[0];
      if (!distButton) throw new Error("Expected model distillations filter button");
      await user.click(distButton);

      // Then search within
      const searchInput = screen.getByPlaceholderText(/filter by title/i);
      await user.type(searchInput, "opus");

      await waitFor(() => {
        expect(screen.getByText(/1 result/i)).toBeInTheDocument();
        expect(screen.getByText("Opus 4.5 Distillation")).toBeInTheDocument();
        expect(screen.queryByText("GPT-5.2 Distillation")).not.toBeInTheDocument();
      });
    });
  });

  describe("category sections", () => {
    it("displays category section headers", () => {
      render(<CorpusIndexPage />);

      // Category names appear in both filter pills and section headers
      // Use getAllByText and check that we have the expected count
      const primarySources = screen.getAllByText("Primary Sources");
      expect(primarySources.length).toBeGreaterThanOrEqual(2); // pill + header

      const distillations = screen.getAllByText("Model Distillations");
      expect(distillations.length).toBeGreaterThanOrEqual(2);

      const metaprompts = screen.getAllByText("Metaprompts");
      expect(metaprompts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("reading tips", () => {
    it("shows reading tips section when not filtering", () => {
      render(<CorpusIndexPage />);

      expect(screen.getByText("Reading Tips")).toBeInTheDocument();
      // Verify the reading tips contain the key sections by looking for numbered steps
      // The tips are: 1. Start with Distillation, 2. Use Quote Bank, 3. Dive into Transcript
      const listItems = screen.getAllByRole("listitem");
      expect(listItems.length).toBeGreaterThanOrEqual(3);
    });

    it("hides reading tips when searching", async () => {
      const user = userEvent.setup();
      render(<CorpusIndexPage />);

      const searchInput = screen.getByPlaceholderText(/filter by title/i);
      await user.type(searchInput, "test");

      await waitFor(() => {
        expect(screen.queryByText("Reading Tips")).not.toBeInTheDocument();
      });
    });

    it("hides reading tips when category is filtered", async () => {
      const user = userEvent.setup();
      render(<CorpusIndexPage />);

      const distButtons = screen.getAllByRole("button", {
        name: /model distillations/i,
      });
      const distButton = distButtons[0];
      if (!distButton) throw new Error("Expected model distillations filter button");
      await user.click(distButton);

      await waitFor(() => {
        expect(screen.queryByText("Reading Tips")).not.toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("search input has type text", () => {
      render(<CorpusIndexPage />);

      const searchInput = screen.getByPlaceholderText(/filter by title/i);
      expect(searchInput).toHaveAttribute("type", "text");
    });

    it("category buttons are keyboard accessible", () => {
      render(<CorpusIndexPage />);

      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toBeEnabled();
      });
    });

    it("has proper heading hierarchy", () => {
      render(<CorpusIndexPage />);

      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1).toHaveTextContent(/corpus/i);

      const h2s = screen.getAllByRole("heading", { level: 2 });
      expect(h2s.length).toBeGreaterThan(0);
    });
  });
});
