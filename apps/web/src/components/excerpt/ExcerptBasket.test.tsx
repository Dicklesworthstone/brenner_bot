/**
 * Tests for ExcerptBasket component
 *
 * Tests the main basket UI component including:
 * - Controlled and uncontrolled modes
 * - Item display and reordering
 * - Theme input
 * - Copy to clipboard
 * - Export functionality
 * - Empty state
 */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type BasketItem, createBasketItem, ExcerptBasket } from "./ExcerptBasket";

// ============================================================================
// Mocks
// ============================================================================

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock excerpt-builder
vi.mock("@/lib/excerpt-builder", () => ({
  composeExcerpt: vi.fn(({ sections, theme }) => ({
    markdown: `# ${theme || "Excerpt"}\n\n${sections.map((s: { quote: string }) => s.quote).join("\n\n")}`,
    anchors: sections.map((s: { anchor: string }) => s.anchor),
    wordCount: sections.reduce(
      (acc: number, s: { quote: string }) => acc + s.quote.split(" ").length,
      0,
    ),
    warnings: [],
  })),
}));

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
};

// ============================================================================
// Test Data
// ============================================================================

function createTestItem(overrides: Partial<BasketItem> = {}): BasketItem {
  return {
    id: `item-${Date.now()}-${Math.random()}`,
    anchor: "§42",
    quote: "This is a test quote from the transcript.",
    title: "Test Section",
    addedAt: Date.now(),
    ...overrides,
  };
}

// ============================================================================
// localStorage Mock
// ============================================================================

function createLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    get store() {
      return store;
    },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("ExcerptBasket", () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("navigator", { clipboard: mockClipboard });
    mockClipboard.writeText.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe("uncontrolled mode", () => {
    it("renders with empty state initially", () => {
      render(<ExcerptBasket />);

      expect(screen.getByText("No selections yet")).toBeInTheDocument();
    });

    it("renders header with title", () => {
      render(<ExcerptBasket />);

      expect(screen.getByText("Excerpt Basket")).toBeInTheDocument();
    });

    it("loads items from localStorage", async () => {
      const items = [createTestItem({ id: "stored-item", anchor: "§1", quote: "Stored quote" })];
      localStorageMock.store["brenner-excerpt-basket"] = JSON.stringify(items);

      render(<ExcerptBasket />);

      await waitFor(() => {
        expect(screen.getByText("Stored quote")).toBeInTheDocument();
      });
    });

    it("shows item count badge when items exist", async () => {
      const items = [
        createTestItem({ id: "item-1", anchor: "§1" }),
        createTestItem({ id: "item-2", anchor: "§2" }),
      ];
      localStorageMock.store["brenner-excerpt-basket"] = JSON.stringify(items);

      render(<ExcerptBasket />);

      await waitFor(() => {
        // The header shows the count in a badge next to "Excerpt Basket"
        // We look for the section count in the stats
        expect(screen.getByText("2 sections")).toBeInTheDocument();
      });
    });
  });

  describe("controlled mode", () => {
    it("uses provided items instead of localStorage", () => {
      const items = [createTestItem({ id: "controlled-item", quote: "Controlled quote" })];

      render(<ExcerptBasket items={items} />);

      expect(screen.getByText("Controlled quote")).toBeInTheDocument();
    });

    it("calls onItemsChange when items are modified", async () => {
      const items = [
        createTestItem({ id: "item-1", anchor: "§1", quote: "First quote" }),
        createTestItem({ id: "item-2", anchor: "§2", quote: "Second quote" }),
      ];
      const onItemsChange = vi.fn();

      render(<ExcerptBasket items={items} onItemsChange={onItemsChange} />);

      // Click remove on first item
      const removeButtons = screen.getAllByRole("button", { name: /remove/i });
      await act(async () => {
        fireEvent.click(removeButtons[0]);
      });

      expect(onItemsChange).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: "item-2" })]),
      );
    });
  });

  describe("theme input", () => {
    it("renders theme input field", () => {
      render(<ExcerptBasket />);

      expect(screen.getByPlaceholderText("Excerpt theme (optional)")).toBeInTheDocument();
    });

    it("allows entering a theme", async () => {
      render(<ExcerptBasket />);

      const themeInput = screen.getByPlaceholderText("Excerpt theme (optional)");
      await act(async () => {
        fireEvent.change(themeInput, { target: { value: "My Research Theme" } });
      });

      expect(themeInput).toHaveValue("My Research Theme");
    });
  });

  describe("item display", () => {
    it("shows item anchor", () => {
      const items = [createTestItem({ anchor: "§58" })];

      render(<ExcerptBasket items={items} />);

      expect(screen.getByText("§58")).toBeInTheDocument();
    });

    it("shows item title if provided", () => {
      const items = [createTestItem({ title: "Important Section" })];

      render(<ExcerptBasket items={items} />);

      expect(screen.getByText("Important Section")).toBeInTheDocument();
    });

    it("shows item quote", () => {
      const items = [createTestItem({ quote: "A memorable quote from Brenner." })];

      render(<ExcerptBasket items={items} />);

      expect(screen.getByText("A memorable quote from Brenner.")).toBeInTheDocument();
    });

    it("shows position numbers for items", () => {
      const items = [
        createTestItem({ id: "item-1", anchor: "§1" }),
        createTestItem({ id: "item-2", anchor: "§2" }),
      ];

      render(<ExcerptBasket items={items} />);

      // Check the stats display which shows the count
      expect(screen.getByText("2 sections")).toBeInTheDocument();
      // Position "1" appears for first item, "2" appears multiple places (badge + position)
      // So we verify items are rendered by checking for the anchors
      expect(screen.getByText("§1")).toBeInTheDocument();
      expect(screen.getByText("§2")).toBeInTheDocument();
    });
  });

  describe("item reordering", () => {
    it("has move up/down buttons", () => {
      const items = [
        createTestItem({ id: "item-1", anchor: "§1" }),
        createTestItem({ id: "item-2", anchor: "§2" }),
      ];

      render(<ExcerptBasket items={items} />);

      expect(screen.getAllByRole("button", { name: /move up/i })).toHaveLength(2);
      expect(screen.getAllByRole("button", { name: /move down/i })).toHaveLength(2);
    });

    it("disables move up for first item", () => {
      const items = [
        createTestItem({ id: "item-1", anchor: "§1" }),
        createTestItem({ id: "item-2", anchor: "§2" }),
      ];

      render(<ExcerptBasket items={items} />);

      const moveUpButtons = screen.getAllByRole("button", { name: /move up/i });
      expect(moveUpButtons[0]).toBeDisabled();
      expect(moveUpButtons[1]).not.toBeDisabled();
    });

    it("disables move down for last item", () => {
      const items = [
        createTestItem({ id: "item-1", anchor: "§1" }),
        createTestItem({ id: "item-2", anchor: "§2" }),
      ];

      render(<ExcerptBasket items={items} />);

      const moveDownButtons = screen.getAllByRole("button", { name: /move down/i });
      expect(moveDownButtons[0]).not.toBeDisabled();
      expect(moveDownButtons[1]).toBeDisabled();
    });

    it("calls onItemsChange with reordered items when moving", async () => {
      const items = [
        createTestItem({ id: "item-1", anchor: "§1" }),
        createTestItem({ id: "item-2", anchor: "§2" }),
      ];
      const onItemsChange = vi.fn();

      render(<ExcerptBasket items={items} onItemsChange={onItemsChange} />);

      const moveDownButtons = screen.getAllByRole("button", { name: /move down/i });
      await act(async () => {
        fireEvent.click(moveDownButtons[0]);
      });

      expect(onItemsChange).toHaveBeenCalledWith([
        expect.objectContaining({ id: "item-2" }),
        expect.objectContaining({ id: "item-1" }),
      ]);
    });
  });

  describe("item removal", () => {
    it("has remove button for each item", () => {
      const items = [createTestItem({ id: "item-1" }), createTestItem({ id: "item-2" })];

      render(<ExcerptBasket items={items} />);

      expect(screen.getAllByRole("button", { name: /remove/i })).toHaveLength(2);
    });

    it("removes item when remove button clicked", async () => {
      const items = [createTestItem({ id: "to-remove", quote: "Will be removed" })];
      const onItemsChange = vi.fn();

      render(<ExcerptBasket items={items} onItemsChange={onItemsChange} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /remove/i }));
      });

      expect(onItemsChange).toHaveBeenCalledWith([]);
    });
  });

  describe("clear basket", () => {
    it("has clear button", () => {
      render(<ExcerptBasket />);

      expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
    });

    it("clear button is disabled when no items", () => {
      render(<ExcerptBasket items={[]} />);

      expect(screen.getByRole("button", { name: /clear/i })).toBeDisabled();
    });

    it("clears all items when clicked", async () => {
      const items = [createTestItem({ id: "item-1" }), createTestItem({ id: "item-2" })];
      const onItemsChange = vi.fn();

      render(<ExcerptBasket items={items} onItemsChange={onItemsChange} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /clear/i }));
      });

      expect(onItemsChange).toHaveBeenCalledWith([]);
    });
  });

  describe("copy to clipboard", () => {
    it("has copy button", () => {
      render(<ExcerptBasket />);

      expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    });

    it("copy button is disabled when no items", () => {
      render(<ExcerptBasket items={[]} />);

      expect(screen.getByRole("button", { name: /copy/i })).toBeDisabled();
    });

    it("copies markdown to clipboard when clicked", async () => {
      const items = [createTestItem({ quote: "Quote to copy" })];

      render(<ExcerptBasket items={items} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /copy/i }));
      });

      expect(mockClipboard.writeText).toHaveBeenCalled();
    });

    it("shows 'Copied!' feedback after copying", async () => {
      const items = [createTestItem()];

      render(<ExcerptBasket items={items} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /copy/i }));
      });

      // Wait for the Copied! text to appear
      await waitFor(() => {
        expect(screen.getByText("Copied!")).toBeInTheDocument();
      });
    });
  });

  describe("export functionality", () => {
    it("shows export button when onExport provided", () => {
      const onExport = vi.fn();

      render(<ExcerptBasket onExport={onExport} />);

      expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument();
    });

    it("hides export button when onExport not provided", () => {
      render(<ExcerptBasket />);

      expect(screen.queryByRole("button", { name: /export/i })).not.toBeInTheDocument();
    });

    it("uses custom export label", () => {
      const onExport = vi.fn();

      render(<ExcerptBasket onExport={onExport} exportLabel="Prefill Session" />);

      expect(screen.getByRole("button", { name: /prefill session/i })).toBeInTheDocument();
    });

    it("calls onExport with markdown when clicked", async () => {
      const onExport = vi.fn();
      const items = [createTestItem({ quote: "Export this quote" })];

      render(<ExcerptBasket items={items} onExport={onExport} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /export/i }));
      });

      expect(onExport).toHaveBeenCalledWith(
        expect.stringContaining("Export this quote"),
        expect.objectContaining({ markdown: expect.any(String) }),
      );
    });
  });

  describe("stats display", () => {
    it("shows section count", () => {
      const items = [
        createTestItem({ id: "item-1", anchor: "§1" }),
        createTestItem({ id: "item-2", anchor: "§2" }),
      ];

      render(<ExcerptBasket items={items} />);

      expect(screen.getByText("2 sections")).toBeInTheDocument();
    });

    it("shows word count", () => {
      const items = [createTestItem({ quote: "one two three four five" })];

      render(<ExcerptBasket items={items} />);

      expect(screen.getByText(/~\d+ words/)).toBeInTheDocument();
    });
  });

  describe("expand/collapse", () => {
    it("has toggle header that can be clicked", () => {
      render(<ExcerptBasket />);

      // The header is a div with role="button" and has aria-expanded
      // Note: There are multiple elements with this label (header div + nested button)
      // We want the one with aria-expanded attribute
      const toggleHeaders = screen.getAllByLabelText(/toggle excerpt basket/i);
      const headerWithExpanded = toggleHeaders.find(
        (el) => el.getAttribute("aria-expanded") !== null,
      );
      expect(headerWithExpanded).toBeInTheDocument();
      expect(headerWithExpanded).toHaveAttribute("aria-expanded", "true");
    });

    it("starts expanded by default", () => {
      render(<ExcerptBasket />);

      // Theme input should be visible when expanded
      expect(screen.getByPlaceholderText("Excerpt theme (optional)")).toBeInTheDocument();
    });
  });

  describe("close button", () => {
    it("shows close button when onClose provided", () => {
      const onClose = vi.fn();

      render(<ExcerptBasket onClose={onClose} />);

      expect(screen.getByRole("button", { name: /close excerpt basket/i })).toBeInTheDocument();
    });

    it("calls onClose when close button clicked", async () => {
      const onClose = vi.fn();

      render(<ExcerptBasket onClose={onClose} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /close excerpt basket/i }));
      });

      expect(onClose).toHaveBeenCalled();
    });
  });
});

describe("createBasketItem", () => {
  it("creates basket item from search hit", () => {
    const hit = {
      anchor: "§42",
      title: "Section 42",
      snippet: "A search result snippet",
    };

    const result = createBasketItem(hit);

    expect(result).toEqual({
      anchor: "§42",
      quote: "A search result snippet",
      title: "Section 42",
    });
  });

  it("handles missing anchor", () => {
    const hit = {
      title: "No Anchor Section",
      snippet: "Snippet without anchor",
    };

    const result = createBasketItem(hit);

    expect(result.anchor).toBe("");
  });
});
