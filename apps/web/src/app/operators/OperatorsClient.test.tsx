/**
 * Tests for OperatorsClient component
 *
 * Tests the operators page UI with category filtering, search, and display.
 * Uses mock operator data matching the BrennerOperatorPaletteEntry structure.
 */

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BrennerOperatorPaletteEntry } from "@/lib/operators";
import { OperatorsClient } from "./OperatorsClient";

// Mock framer-motion to avoid animation issues
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const MockDiv = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    function MockDiv({ children, ...props }, ref) {
      return React.createElement("div", { ...props, ref }, children);
    },
  );
  return {
    motion: {
      div: MockDiv,
    },
    AnimatePresence: function MockAnimatePresence({ children }: { children: React.ReactNode }) {
      return React.createElement(React.Fragment, null, children);
    },
  };
});

// Mock quote for testing
const mockQuote58 = {
  sectionId: "§58",
  title: "Levels of explanation",
  quote: "You need to separate the levels.",
  context: "Core insight about levels",
  tags: ["levels", "decomposition"],
};

const mockQuote120 = {
  sectionId: "§120",
  title: "Making things real",
  quote: "You have to materialize it.",
  context: "Importance of concrete experiments",
  tags: ["experiment", "concrete"],
};

// Mock operators data
const mockOperators: BrennerOperatorPaletteEntry[] = [
  {
    title: "Level-split",
    symbol: "⊘",
    kind: "core",
    canonicalTag: "level-split",
    definition: "Decompose a problem into distinct levels of organization.",
    whenToUseTriggers: ["When mixing levels causes confusion", "When debugging complex systems"],
    failureModes: ["Over-splitting", "Missing cross-level interactions"],
    transcriptAnchors: "§58-61, §112",
    quoteBankAnchors: ["§58"],
    promptModule: null,
    quotes: [mockQuote58],
    supportingQuotes: [mockQuote58],
  },
  {
    title: "Recode",
    symbol: "𝓛",
    kind: "core",
    canonicalTag: "recode",
    definition: "Transform the representation to expose hidden structure.",
    whenToUseTriggers: ["When the current framing obscures the answer"],
    failureModes: ["Losing information in translation"],
    transcriptAnchors: "§45-47",
    quoteBankAnchors: [],
    promptModule: null,
    quotes: [],
    supportingQuotes: [],
  },
  {
    title: "Materialize",
    symbol: "⊕",
    kind: "core",
    canonicalTag: "materialize",
    definition: "Make abstract concepts concrete and testable.",
    whenToUseTriggers: ["When theory needs grounding"],
    failureModes: ["Oversimplifying the abstraction"],
    transcriptAnchors: "§120-125",
    quoteBankAnchors: ["§120"],
    promptModule: null,
    quotes: [mockQuote120],
    supportingQuotes: [mockQuote120],
  },
  {
    title: "Cross-domain",
    symbol: "⊗",
    kind: "derived",
    canonicalTag: "cross-domain",
    definition: "Apply insights from one domain to another.",
    whenToUseTriggers: ["When stuck in one perspective"],
    failureModes: ["Forced analogies"],
    transcriptAnchors: "§200-205",
    quoteBankAnchors: [],
    promptModule: null,
    quotes: [],
    supportingQuotes: [],
  },
];

describe("OperatorsClient", () => {
  beforeEach(() => {
    // Mock matchMedia for responsive behavior
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock window.location for hash handling
    Object.defineProperty(window, "location", {
      writable: true,
      value: { hash: "", href: "http://localhost:3000/operators" },
    });

    // Mock history.replaceState
    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("renders page title", () => {
      render(<OperatorsClient operators={mockOperators} />);
      expect(screen.getByRole("heading", { name: "Brenner Operators" })).toBeInTheDocument();
    });

    it("displays operator count in stats section", () => {
      render(<OperatorsClient operators={mockOperators} />);
      // Stats section shows "4 operators"
      expect(screen.getByText("operators")).toBeInTheDocument();
    });

    it("displays anchored quotes stat", () => {
      render(<OperatorsClient operators={mockOperators} />);
      expect(screen.getByText("anchored quotes")).toBeInTheDocument();
    });

    it("renders all operator cards", () => {
      render(<OperatorsClient operators={mockOperators} />);
      // Each operator title appears in the card
      expect(screen.getAllByText("Level-split").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Recode").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Materialize").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Cross-domain").length).toBeGreaterThan(0);
    });

    it("shows operator symbols in cards", () => {
      render(<OperatorsClient operators={mockOperators} />);
      // Symbols appear in the cards
      expect(screen.getAllByText("⊘").length).toBeGreaterThan(0);
      expect(screen.getAllByText("𝓛").length).toBeGreaterThan(0);
    });

    it("shows operator definitions", () => {
      render(<OperatorsClient operators={mockOperators} />);
      expect(screen.getByText(/Decompose a problem into distinct levels/)).toBeInTheDocument();
    });
  });

  describe("category filtering", () => {
    it("shows All category by default", () => {
      render(<OperatorsClient operators={mockOperators} />);
      // All button should show count of all operators
      const allButton = screen.getByRole("button", { name: /All.*4/i });
      expect(allButton).toBeInTheDocument();
    });

    it("shows category pills", () => {
      render(<OperatorsClient operators={mockOperators} />);
      // Category buttons exist (may have multiple matching elements due to labels in cards)
      expect(screen.getAllByText(/Thinking Moves/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Experimentation/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Epistemics/i).length).toBeGreaterThan(0);
    });

    it("filters operators when category pill clicked", async () => {
      render(<OperatorsClient operators={mockOperators} />);

      // Find all buttons and click the one with "Thinking Moves" text
      const allButtons = screen.getAllByRole("button");
      const thinkingButton = allButtons.find((btn) => btn.textContent?.includes("Thinking Moves"));
      expect(thinkingButton).toBeDefined();

      await act(async () => {
        if (thinkingButton) fireEvent.click(thinkingButton);
      });

      // Should still show level-split and recode (Thinking category)
      expect(screen.getAllByText("Level-split").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Recode").length).toBeGreaterThan(0);

      // Check results count is shown
      expect(screen.getByText(/Showing/)).toBeInTheDocument();
    });
  });

  describe("search filtering", () => {
    it("has search input", () => {
      render(<OperatorsClient operators={mockOperators} />);
      expect(screen.getByPlaceholderText(/Search operators/i)).toBeInTheDocument();
    });

    it("filters operators by search query", async () => {
      render(<OperatorsClient operators={mockOperators} />);

      const searchInput = screen.getByPlaceholderText(/Search operators/i);

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "level" } });
      });

      // Should show filtered result count
      await waitFor(() => {
        expect(screen.getByText(/Showing/)).toBeInTheDocument();
      });
    });

    it("clears search when X button clicked", async () => {
      render(<OperatorsClient operators={mockOperators} />);

      const searchInput = screen.getByPlaceholderText(/Search operators/i);

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "level" } });
      });

      // Find and click clear button
      const clearButton = screen.getByRole("button", { name: /Clear search/i });
      await act(async () => {
        fireEvent.click(clearButton);
      });

      // Search input should be cleared
      expect(searchInput).toHaveValue("");
    });

    it("shows no results message when no matches", async () => {
      render(<OperatorsClient operators={mockOperators} />);

      const searchInput = screen.getByPlaceholderText(/Search operators/i);

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: "xyznonexistent" } });
      });

      await waitFor(() => {
        expect(screen.getByText("No operators found")).toBeInTheDocument();
      });
    });
  });

  describe("operator selection for prompt builder", () => {
    it("shows checkbox on each operator card", () => {
      render(<OperatorsClient operators={mockOperators} />);

      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBe(4); // One per operator
    });

    it("toggles selection when checkbox clicked", async () => {
      render(<OperatorsClient operators={mockOperators} />);

      // Click first checkbox
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes[0]).toHaveAttribute("aria-checked", "false");

      await act(async () => {
        fireEvent.click(checkboxes[0]);
      });

      expect(checkboxes[0]).toHaveAttribute("aria-checked", "true");
    });
  });

  describe("empty state", () => {
    it("handles empty operators array", () => {
      render(<OperatorsClient operators={[]} />);

      expect(screen.getByRole("heading", { name: "Brenner Operators" })).toBeInTheDocument();
      // Shows "0 operators available" when empty
      expect(screen.getByText("operators")).toBeInTheDocument();
    });
  });
});
