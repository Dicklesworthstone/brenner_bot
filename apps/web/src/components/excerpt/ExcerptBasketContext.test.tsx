/**
 * Tests for ExcerptBasketContext
 *
 * Tests the context provider, hook, and trigger component for the excerpt basket:
 * - Provider state management (addItem, removeItem, clearItems)
 * - localStorage persistence
 * - Open/close basket drawer
 * - useExcerptBasket hook behavior
 * - ExcerptBasketTrigger component
 */

import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import type * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ExcerptBasketProvider,
  ExcerptBasketTrigger,
  useExcerptBasket,
} from "./ExcerptBasketContext";

// ============================================================================
// Mocks
// ============================================================================

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock ExcerptBasket component since we're testing the context, not the basket UI
vi.mock("./ExcerptBasket", () => ({
  ExcerptBasket: ({ items, onClose }: { items: unknown[]; onClose: () => void }) => (
    <div data-testid="excerpt-basket">
      <span data-testid="basket-item-count">{items.length}</span>
      <button data-testid="close-basket" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}));

// ============================================================================
// Test Consumer Components
// ============================================================================

function BasketConsumer() {
  const { items, addItem, removeItem, clearItems, isOpen, openBasket, closeBasket } =
    useExcerptBasket();

  return (
    <div>
      <span data-testid="item-count">{items.length}</span>
      <span data-testid="is-open">{isOpen ? "open" : "closed"}</span>
      <ul data-testid="items">
        {items.map((item) => (
          <li key={item.id} data-testid={`item-${item.id}`}>
            {item.quote}
          </li>
        ))}
      </ul>
      <button
        data-testid="add-item"
        onClick={() =>
          addItem({
            anchor: "§42",
            quote: "Test quote",
            title: "Test title",
          })
        }
      >
        Add Item
      </button>
      <button
        data-testid="add-duplicate"
        onClick={() =>
          addItem({
            anchor: "§42",
            quote: "Duplicate quote",
            title: "Duplicate title",
          })
        }
      >
        Add Duplicate
      </button>
      <button
        data-testid="remove-first"
        onClick={() => {
          if (items.length > 0) {
            removeItem(items[0].id);
          }
        }}
      >
        Remove First
      </button>
      <button data-testid="clear-items" onClick={clearItems}>
        Clear
      </button>
      <button data-testid="open-basket" onClick={openBasket}>
        Open
      </button>
      <button data-testid="close-basket-btn" onClick={closeBasket}>
        Close
      </button>
    </div>
  );
}

// ============================================================================
// localStorage Mock Helpers
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

describe("ExcerptBasketProvider", () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal("localStorage", localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("renders children", () => {
    render(
      <ExcerptBasketProvider>
        <div data-testid="child">Hello</div>
      </ExcerptBasketProvider>,
    );

    expect(screen.getByTestId("child")).toHaveTextContent("Hello");
  });

  it("provides empty items initially", () => {
    render(
      <ExcerptBasketProvider>
        <BasketConsumer />
      </ExcerptBasketProvider>,
    );

    expect(screen.getByTestId("item-count")).toHaveTextContent("0");
  });

  it("starts with basket closed", () => {
    render(
      <ExcerptBasketProvider>
        <BasketConsumer />
      </ExcerptBasketProvider>,
    );

    expect(screen.getByTestId("is-open")).toHaveTextContent("closed");
  });

  it("adds items to the basket", async () => {
    render(
      <ExcerptBasketProvider>
        <BasketConsumer />
      </ExcerptBasketProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("add-item"));
    });

    expect(screen.getByTestId("item-count")).toHaveTextContent("1");
  });

  it("auto-opens basket when adding items", async () => {
    render(
      <ExcerptBasketProvider>
        <BasketConsumer />
      </ExcerptBasketProvider>,
    );

    expect(screen.getByTestId("is-open")).toHaveTextContent("closed");

    await act(async () => {
      fireEvent.click(screen.getByTestId("add-item"));
    });

    expect(screen.getByTestId("is-open")).toHaveTextContent("open");
  });

  it("prevents duplicate items with same anchor", async () => {
    render(
      <ExcerptBasketProvider>
        <BasketConsumer />
      </ExcerptBasketProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("add-item"));
    });

    expect(screen.getByTestId("item-count")).toHaveTextContent("1");

    await act(async () => {
      fireEvent.click(screen.getByTestId("add-duplicate"));
    });

    // Should still be 1 since anchor is same
    expect(screen.getByTestId("item-count")).toHaveTextContent("1");
  });

  it("removes items from the basket", async () => {
    render(
      <ExcerptBasketProvider>
        <BasketConsumer />
      </ExcerptBasketProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("add-item"));
    });

    expect(screen.getByTestId("item-count")).toHaveTextContent("1");

    await act(async () => {
      fireEvent.click(screen.getByTestId("remove-first"));
    });

    expect(screen.getByTestId("item-count")).toHaveTextContent("0");
  });

  it("clears all items from the basket", async () => {
    render(
      <ExcerptBasketProvider>
        <BasketConsumer />
      </ExcerptBasketProvider>,
    );

    // Add multiple items by using different anchors
    await act(async () => {
      fireEvent.click(screen.getByTestId("add-item"));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("clear-items"));
    });

    expect(screen.getByTestId("item-count")).toHaveTextContent("0");
  });

  it("opens and closes the basket", async () => {
    render(
      <ExcerptBasketProvider>
        <BasketConsumer />
      </ExcerptBasketProvider>,
    );

    expect(screen.getByTestId("is-open")).toHaveTextContent("closed");

    await act(async () => {
      fireEvent.click(screen.getByTestId("open-basket"));
    });

    expect(screen.getByTestId("is-open")).toHaveTextContent("open");

    await act(async () => {
      fireEvent.click(screen.getByTestId("close-basket-btn"));
    });

    expect(screen.getByTestId("is-open")).toHaveTextContent("closed");
  });

  it("persists items to localStorage", async () => {
    render(
      <ExcerptBasketProvider>
        <BasketConsumer />
      </ExcerptBasketProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId("add-item"));
    });

    // Wait for effect to persist
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "brenner-excerpt-basket",
        expect.any(String),
      );
    });

    // Verify the stored data
    const stored = localStorageMock.store["brenner-excerpt-basket"];
    expect(stored).toBeDefined();
    const parsed = JSON.parse(stored);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);
    expect(parsed[0].anchor).toBe("§42");
  });

  it("loads items from localStorage on mount", async () => {
    // Pre-populate localStorage
    const existingItems = [
      {
        id: "existing-1",
        anchor: "§1",
        quote: "Existing quote",
        title: "Existing title",
        addedAt: Date.now(),
      },
    ];
    localStorageMock.store["brenner-excerpt-basket"] = JSON.stringify(existingItems);

    render(
      <ExcerptBasketProvider>
        <BasketConsumer />
      </ExcerptBasketProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("item-count")).toHaveTextContent("1");
    });
  });

  it("handles localStorage errors gracefully", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Make localStorage throw
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error("localStorage unavailable");
    });

    render(
      <ExcerptBasketProvider>
        <BasketConsumer />
      </ExcerptBasketProvider>,
    );

    // Should render without crashing
    expect(screen.getByTestId("item-count")).toHaveTextContent("0");
    expect(consoleWarnSpy).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });
});

describe("useExcerptBasket hook", () => {
  it("throws error when used outside provider", () => {
    // Suppress console.error from React
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useExcerptBasket());
    }).toThrow("useExcerptBasket must be used within an ExcerptBasketProvider");

    consoleErrorSpy.mockRestore();
  });

  it("works correctly when used within provider", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ExcerptBasketProvider>{children}</ExcerptBasketProvider>
    );

    // Mock localStorage for the provider
    const localStorageMock = createLocalStorageMock();
    vi.stubGlobal("localStorage", localStorageMock);

    const { result } = renderHook(() => useExcerptBasket(), { wrapper });

    expect(result.current.items).toEqual([]);
    expect(result.current.isOpen).toBe(false);
    expect(typeof result.current.addItem).toBe("function");
    expect(typeof result.current.removeItem).toBe("function");
    expect(typeof result.current.clearItems).toBe("function");
    expect(typeof result.current.openBasket).toBe("function");
    expect(typeof result.current.closeBasket).toBe("function");

    vi.unstubAllGlobals();
  });
});

describe("ExcerptBasketTrigger", () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal("localStorage", localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("renders the trigger button", () => {
    render(
      <ExcerptBasketProvider>
        <ExcerptBasketTrigger />
      </ExcerptBasketProvider>,
    );

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("shows item count badge when items exist", async () => {
    const existingItems = [
      {
        id: "item-1",
        anchor: "§1",
        quote: "Quote 1",
        addedAt: Date.now(),
      },
      {
        id: "item-2",
        anchor: "§2",
        quote: "Quote 2",
        addedAt: Date.now(),
      },
    ];
    localStorageMock.store["brenner-excerpt-basket"] = JSON.stringify(existingItems);

    render(
      <ExcerptBasketProvider>
        <ExcerptBasketTrigger />
      </ExcerptBasketProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  it("opens basket when clicked", async () => {
    render(
      <ExcerptBasketProvider>
        <ExcerptBasketTrigger />
        <BasketConsumer />
      </ExcerptBasketProvider>,
    );

    expect(screen.getByTestId("is-open")).toHaveTextContent("closed");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /excerpt/i }));
    });

    expect(screen.getByTestId("is-open")).toHaveTextContent("open");
  });

  it("has correct aria-label with item count", async () => {
    const existingItems = [
      {
        id: "item-1",
        anchor: "§1",
        quote: "Quote 1",
        addedAt: Date.now(),
      },
    ];
    localStorageMock.store["brenner-excerpt-basket"] = JSON.stringify(existingItems);

    render(
      <ExcerptBasketProvider>
        <ExcerptBasketTrigger />
      </ExcerptBasketProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-label",
        "Open excerpt basket (1 item)",
      );
    });
  });
});
