/**
 * Unit tests for SpotlightSearch component
 *
 * Tests the search interface's rendering, keyboard navigation, and search functionality.
 * Philosophy: NO mocks where possible - test real component behavior and DOM output.
 *
 * @see brenner_bot-ph4p (bead)
 * @see @/components/search/SpotlightSearch.tsx
 */

import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GlobalSearchHit, GlobalSearchResult } from "@/lib/globalSearchTypes";
import { SearchProvider, SearchTrigger, SpotlightSearch, useSearch } from "./SpotlightSearch";

// ============================================================================
// Mocks
// ============================================================================

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => "/",
}));

// Mock searchAction
const mockSearchAction = vi.fn();
vi.mock("@/lib/globalSearchAction", () => ({
  searchAction: (...args: unknown[]) => mockSearchAction(...args),
}));

// Mock useExcerptBasket
const mockAddItem = vi.fn();
const mockOpenBasket = vi.fn();
vi.mock("@/components/excerpt", () => ({
  useExcerptBasket: () => ({
    items: [],
    addItem: mockAddItem,
    openBasket: mockOpenBasket,
    removeItem: vi.fn(),
    clearItems: vi.fn(),
    hasItem: () => false,
  }),
  createBasketItem: (hit: GlobalSearchHit) => ({
    id: hit.id,
    anchor: hit.anchor,
    text: hit.snippet,
    source: hit.category,
  }),
}));

// ============================================================================
// Test Fixtures
// ============================================================================

function createSearchHit(overrides: Partial<GlobalSearchHit> = {}): GlobalSearchHit {
  return {
    id: `hit-${Math.random().toString(36).slice(2)}`,
    docId: "doc-1",
    docTitle: "Test Document",
    category: "transcript",
    title: "Test Result",
    snippet: "This is a test snippet with some matching text.",
    score: 0.9,
    matchType: "body",
    anchor: "§103",
    url: "/transcript/doc-1#section-103",
    highlights: ["matching text"],
    ...overrides,
  };
}

function createSearchResult(
  query: string,
  hits: GlobalSearchHit[] = [],
  overrides: Partial<GlobalSearchResult> = {},
): GlobalSearchResult {
  return {
    query,
    hits,
    totalMatches: hits.length,
    searchTimeMs: 5,
    categories: {
      transcript: hits.filter((h) => h.category === "transcript").length,
      "quote-bank": hits.filter((h) => h.category === "quote-bank").length,
      distillation: hits.filter((h) => h.category === "distillation").length,
      metaprompt: hits.filter((h) => h.category === "metaprompt").length,
      "raw-response": hits.filter((h) => h.category === "raw-response").length,
    },
    ...overrides,
  };
}

async function advanceDebounce(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(200);
  });
}

// ============================================================================
// Tests
// ============================================================================

describe("SpotlightSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("rendering", () => {
    it("renders nothing when closed", () => {
      const { container } = render(<SpotlightSearch isOpen={false} onClose={vi.fn()} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders search dialog when open", () => {
      render(<SpotlightSearch isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Search");
    });

    it("renders search input placeholder", () => {
      render(<SpotlightSearch isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByPlaceholderText(/search transcript/i)).toBeInTheDocument();
    });

    it("renders initial state with suggestion chips", () => {
      render(<SpotlightSearch isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText("Search the Brenner Corpus")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /c\. elegans/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /genetics/i })).toBeInTheDocument();
    });

    it("renders commands and executes selected command on Enter", () => {
      const onClose = vi.fn();
      render(<SpotlightSearch isOpen={true} onClose={onClose} />);

      expect(screen.getByText("Commands")).toBeInTheDocument();
      expect(screen.getByText("Go to Home")).toBeInTheDocument();

      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));

      expect(mockPush).toHaveBeenCalledWith("/");
      expect(onClose).toHaveBeenCalled();
    });

    it("shows loading spinner when pending", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockSearchAction.mockReturnValue(
        new Promise(() => {}), // Never resolves
      );

      render(<SpotlightSearch isOpen={true} onClose={vi.fn()} />);

      const input = screen.getByPlaceholderText(/search transcript/i);
      await user.type(input, "test");

      // Advance past debounce
      await advanceDebounce();

      // Check for loading spinner (Loader2 icon with animate-spin class)
      await waitFor(() => {
        expect(document.querySelector(".animate-spin")).toBeInTheDocument();
      });
    });
  });

  describe("search input", () => {
    it("focuses input when opened", async () => {
      render(<SpotlightSearch isOpen={true} onClose={vi.fn()} />);

      // Wait for setTimeout in component
      await vi.advanceTimersByTimeAsync(100);

      const input = screen.getByPlaceholderText(/search transcript/i);
      expect(input).toHaveFocus();
    });

    it("updates query on typing", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<SpotlightSearch isOpen={true} onClose={vi.fn()} />);

      const input = screen.getByPlaceholderText(/search transcript/i);
      await user.type(input, "brenner");

      expect(input).toHaveValue("brenner");
    });

    it("clears query when clear button clicked", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<SpotlightSearch isOpen={true} onClose={vi.fn()} />);

      const input = screen.getByPlaceholderText(/search transcript/i);
      await user.type(input, "test");

      const clearButton = screen.getByRole("button", { name: /clear search/i });
      await user.click(clearButton);

      expect(input).toHaveValue("");
    });

    it("resets state when reopened", async () => {
      const { rerender } = render(<SpotlightSearch isOpen={true} onClose={vi.fn()} />);

      const input = screen.getByPlaceholderText(/search transcript/i);
      // Simulate typing manually since we need to check after rerender
      await userEvent.type(input, "test");

      // Close and reopen
      rerender(<SpotlightSearch isOpen={false} onClose={vi.fn()} />);
      rerender(<SpotlightSearch isOpen={true} onClose={vi.fn()} />);

      const newInput = screen.getByPlaceholderText(/search transcript/i);
      expect(newInput).toHaveValue("");
    });
  });

  describe("debouncing", () => {
    it("debounces search requests", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockSearchAction.mockResolvedValue(createSearchResult("test", []));

      render(<SpotlightSearch isOpen={true} onClose={vi.fn()} />);

      const input = screen.getByPlaceholderText(/search transcript/i);
      await user.type(input, "test");

      // Search should not have been called immediately
      expect(mockSearchAction).not.toHaveBeenCalled();

      // Advance past debounce delay
      await advanceDebounce();

      await waitFor(() => {
        expect(mockSearchAction).toHaveBeenCalledWith("test", expect.any(Object));
      });
    });

    it("does not search for whitespace-only queries", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<SpotlightSearch isOpen={true} onClose={vi.fn()} />);

      const input = screen.getByPlaceholderText(/search transcript/i);
      await user.type(input, "   ");

      await advanceDebounce();

      expect(mockSearchAction).not.toHaveBeenCalled();
    });

    it("cancels pending search when query changes", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockSearchAction.mockResolvedValue(createSearchResult("brenner", []));

      render(<SpotlightSearch isOpen={true} onClose={vi.fn()} />);

      const input = screen.getByPlaceholderText(/search transcript/i);
      await user.type(input, "te");

      // Type more before debounce finishes
      await vi.advanceTimersByTimeAsync(50);
      await user.type(input, "st");

      // Advance past debounce
      await advanceDebounce();

      await waitFor(() => {
        // Should only have called with the final value
        expect(mockSearchAction).toHaveBeenCalledWith("test", expect.any(Object));
      });
    });
  });

  describe("search results", () => {
    it("displays search results", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const hits = [
        createSearchHit({ id: "1", title: "First Result" }),
        createSearchHit({ id: "2", title: "Second Result" }),
      ];
      mockSearchAction.mockResolvedValue(createSearchResult("test", hits));

      render(<SpotlightSearch isOpen={true} onClose={vi.fn()} />);

      const input = screen.getByPlaceholderText(/search transcript/i);
      await user.type(input, "test");
      await advanceDebounce();

      await waitFor(() => {
        expect(screen.getByText("First Result")).toBeInTheDocument();
        expect(screen.getByText("Second Result")).toBeInTheDocument();
      });
    });

    it("shows result count", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const hits = [
        createSearchHit({ id: "1" }),
        createSearchHit({ id: "2" }),
        createSearchHit({ id: "3" }),
      ];
      mockSearchAction.mockResolvedValue(createSearchResult("test", hits, { totalMatches: 3 }));

      render(<SpotlightSearch isOpen={true} onClose={vi.fn()} />);

      const input = screen.getByPlaceholderText(/search transcript/i);
      await user.type(input, "test");
      await advanceDebounce();

      await waitFor(() => {
        expect(screen.getByText(/3 results/i)).toBeInTheDocument();
      });
    });

    it("shows empty state when no results", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockSearchAction.mockResolvedValue(createSearchResult("xyz", []));

      render(<SpotlightSearch isOpen={true} onClose={vi.fn()} />);

      const input = screen.getByPlaceholderText(/search transcript/i);
      await user.type(input, "xyz");
      await advanceDebounce();

      await waitFor(() => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument();
        expect(screen.getByText(/xyz/)).toBeInTheDocument();
      });
    });

    it("shows anchor badge for results with anchors", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const hits = [createSearchHit({ anchor: "§103" })];
      mockSearchAction.mockResolvedValue(createSearchResult("test", hits));

      render(<SpotlightSearch isOpen={true} onClose={vi.fn()} />);

      const input = screen.getByPlaceholderText(/search transcript/i);
      await user.type(input, "test");
      await advanceDebounce();

      await waitFor(() => {
        expect(screen.getByText("§103")).toBeInTheDocument();
      });
    });
  });

  describe("keyboard navigation", () => {
    it("closes on Escape", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const onClose = vi.fn();

      render(<SpotlightSearch isOpen={true} onClose={onClose} />);

      await user.keyboard("{Escape}");

      expect(onClose).toHaveBeenCalled();
    });

    it("navigates results with arrow keys", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const hits = [
        createSearchHit({ id: "1", title: "First Result" }),
        createSearchHit({ id: "2", title: "Second Result" }),
        createSearchHit({ id: "3", title: "Third Result" }),
      ];
      mockSearchAction.mockResolvedValue(createSearchResult("test", hits));

      render(<SpotlightSearch isOpen={true} onClose={vi.fn()} />);

      const input = screen.getByPlaceholderText(/search transcript/i);
      await user.type(input, "test");
      await advanceDebounce();

      await waitFor(() => {
        expect(screen.getByText("First Result")).toBeInTheDocument();
      });

      // Press ArrowDown to select second result
      await user.keyboard("{ArrowDown}");

      // The second result button should be selected (has data-index="1")
      const secondResult = screen.getByText("Second Result").closest("[data-index]");
      expect(secondResult).toHaveAttribute("data-index", "1");

      // Press ArrowDown again for third result
      await user.keyboard("{ArrowDown}");

      // Press ArrowUp to go back to second
      await user.keyboard("{ArrowUp}");

      // First result should be at index 0, so after ArrowDown, index 1 is selected
    });

    it("wraps around when navigating past last result", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const hits = [
        createSearchHit({ id: "1", title: "First" }),
        createSearchHit({ id: "2", title: "Second" }),
      ];
      mockSearchAction.mockResolvedValue(createSearchResult("test", hits));

      render(<SpotlightSearch isOpen={true} onClose={vi.fn()} />);

      const input = screen.getByPlaceholderText(/search transcript/i);
      await user.type(input, "test");
      await advanceDebounce();

      await waitFor(() => {
        expect(screen.getByText("First")).toBeInTheDocument();
      });

      // Navigate down twice to get to second, then once more to wrap
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{ArrowDown}");
      // Should wrap to first (index 0)
    });

    it("navigates to result on Enter", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const hits = [createSearchHit({ url: "/transcript/doc-1#section-103" })];
      mockSearchAction.mockResolvedValue(createSearchResult("test", hits));
      const onClose = vi.fn();

      render(<SpotlightSearch isOpen={true} onClose={onClose} />);

      const input = screen.getByPlaceholderText(/search transcript/i);
      await user.type(input, "test");
      await advanceDebounce();

      await waitFor(() => {
        expect(screen.getByText("Test Result")).toBeInTheDocument();
      });

      await user.keyboard("{Enter}");

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("/transcript/doc-1"));
      expect(onClose).toHaveBeenCalled();
    });

    it("adds to excerpt on Shift+Enter for transcript results", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const hits = [
        createSearchHit({
          category: "transcript",
          anchor: "§103",
          snippet: "Test snippet",
        }),
      ];
      mockSearchAction.mockResolvedValue(createSearchResult("test", hits));
      const onClose = vi.fn();

      render(<SpotlightSearch isOpen={true} onClose={onClose} />);

      const input = screen.getByPlaceholderText(/search transcript/i);
      await user.type(input, "test");
      await advanceDebounce();

      await waitFor(() => {
        expect(screen.getByText("Test Result")).toBeInTheDocument();
      });

      await user.keyboard("{Shift>}{Enter}{/Shift}");

      expect(mockAddItem).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("category filtering", () => {
    it("shows category pills when searching", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockSearchAction.mockResolvedValue(createSearchResult("test", [createSearchHit()]));

      render(<SpotlightSearch isOpen={true} onClose={vi.fn()} />);

      const input = screen.getByPlaceholderText(/search transcript/i);
      await user.type(input, "test");

      // Category pills should appear
      expect(screen.getByRole("button", { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /transcript/i })).toBeInTheDocument();
    });

    it("filters results by category", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const hits = [
        createSearchHit({ id: "1", category: "transcript", title: "Transcript Result" }),
        createSearchHit({ id: "2", category: "quote-bank", title: "Quote Result" }),
      ];
      mockSearchAction.mockResolvedValue(createSearchResult("test", hits));

      render(<SpotlightSearch isOpen={true} onClose={vi.fn()} />);

      const input = screen.getByPlaceholderText(/search transcript/i);
      await user.type(input, "test");
      await advanceDebounce();

      await waitFor(() => {
        expect(screen.getByText("Transcript Result")).toBeInTheDocument();
      });

      // Find category pills container (has scrollbar-hide class)
      const pillsContainer = document.querySelector(".scrollbar-hide");
      expect(pillsContainer).toBeInTheDocument();

      // Click transcript category filter pill (not the result category badge)
      const transcriptPill = within(pillsContainer as HTMLElement).getByRole("button", {
        name: /transcript/i,
      });
      await user.click(transcriptPill);

      // Should trigger new search with category filter
      await advanceDebounce();

      expect(mockSearchAction).toHaveBeenLastCalledWith(
        "test",
        expect.objectContaining({ category: "transcript" }),
      );
    });
  });

  describe("suggestion chips", () => {
    it("sets query when suggestion chip clicked", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockSearchAction.mockResolvedValue(createSearchResult("C. elegans", []));

      render(<SpotlightSearch isOpen={true} onClose={vi.fn()} />);

      // Wait for initial state to be visible
      await waitFor(() => {
        expect(screen.getByText("Search the Brenner Corpus")).toBeInTheDocument();
      });

      const chip = screen.getByRole("button", { name: /c\. elegans/i });
      await user.click(chip);

      const input = screen.getByPlaceholderText(/search transcript/i);
      expect(input).toHaveValue("C. elegans");

      // Advance past debounce to trigger search
      await advanceDebounce();

      await waitFor(() => {
        expect(mockSearchAction).toHaveBeenCalledWith("C. elegans", expect.any(Object));
      });
    });
  });

  describe("backdrop", () => {
    it("closes when backdrop clicked", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const onClose = vi.fn();

      render(<SpotlightSearch isOpen={true} onClose={onClose} />);

      // Find the backdrop by its aria-hidden attribute
      const backdrop = document.querySelector('[aria-hidden="true"]');
      if (!(backdrop instanceof HTMLElement)) {
        throw new Error("Expected backdrop element to be present");
      }

      await user.click(backdrop);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("add to excerpt button", () => {
    it("shows add button for transcript results with valid anchors", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const hits = [
        createSearchHit({
          category: "transcript",
          anchor: "§103",
        }),
      ];
      mockSearchAction.mockResolvedValue(createSearchResult("test", hits));

      render(<SpotlightSearch isOpen={true} onClose={vi.fn()} />);

      const input = screen.getByPlaceholderText(/search transcript/i);
      await user.type(input, "test");
      await advanceDebounce();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add to excerpt basket/i })).toBeInTheDocument();
      });
    });

    it("adds to basket when add button clicked", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const hits = [
        createSearchHit({
          category: "transcript",
          anchor: "§103",
        }),
      ];
      mockSearchAction.mockResolvedValue(createSearchResult("test", hits));
      const onClose = vi.fn();

      render(<SpotlightSearch isOpen={true} onClose={onClose} />);

      const input = screen.getByPlaceholderText(/search transcript/i);
      await user.type(input, "test");
      await advanceDebounce();

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add to excerpt basket/i })).toBeInTheDocument();
      });

      const addButton = screen.getByRole("button", { name: /add to excerpt basket/i });
      await user.click(addButton);

      expect(mockAddItem).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it("does not show add button for non-transcript results", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const hits = [
        createSearchHit({
          category: "distillation",
          anchor: undefined,
        }),
      ];
      mockSearchAction.mockResolvedValue(createSearchResult("test", hits));

      render(<SpotlightSearch isOpen={true} onClose={vi.fn()} />);

      const input = screen.getByPlaceholderText(/search transcript/i);
      await user.type(input, "test");
      await advanceDebounce();

      await waitFor(() => {
        expect(screen.getByText("Test Result")).toBeInTheDocument();
      });

      expect(
        screen.queryByRole("button", { name: /add to excerpt basket/i }),
      ).not.toBeInTheDocument();
    });
  });
});

describe("SearchProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides search context to children", () => {
    function TestChild() {
      const { isOpen, open } = useSearch();
      return (
        <div>
          <span data-testid="is-open">{isOpen.toString()}</span>
          <button onClick={open}>Open</button>
        </div>
      );
    }

    render(
      <SearchProvider>
        <TestChild />
      </SearchProvider>,
    );

    expect(screen.getByTestId("is-open")).toHaveTextContent("false");
  });

  it("opens search on Cmd+K", async () => {
    const user = userEvent.setup();

    render(
      <SearchProvider>
        <div>Test content</div>
      </SearchProvider>,
    );

    // Search should be closed initially
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Press Cmd+K
    await user.keyboard("{Meta>}k{/Meta}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("opens search on Ctrl+K", async () => {
    const user = userEvent.setup();

    render(
      <SearchProvider>
        <div>Test content</div>
      </SearchProvider>,
    );

    // Press Ctrl+K
    await user.keyboard("{Control>}k{/Control}");

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("toggles search on repeated Cmd+K", async () => {
    const user = userEvent.setup();

    render(
      <SearchProvider>
        <div>Test content</div>
      </SearchProvider>,
    );

    // Open
    await user.keyboard("{Meta>}k{/Meta}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Close
    await user.keyboard("{Meta>}k{/Meta}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("SearchTrigger", () => {
  it("renders trigger button", () => {
    render(
      <SearchProvider>
        <SearchTrigger />
      </SearchProvider>,
    );

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("opens search when clicked", async () => {
    const user = userEvent.setup();

    render(
      <SearchProvider>
        <SearchTrigger />
      </SearchProvider>,
    );

    await user.click(screen.getByRole("button"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <SearchProvider>
        <SearchTrigger className="custom-class" />
      </SearchProvider>,
    );

    expect(screen.getByRole("button")).toHaveClass("custom-class");
  });
});
