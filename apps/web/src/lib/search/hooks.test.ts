/**
 * search/hooks.ts Unit Tests
 *
 * Tests React hooks for search functionality.
 * Philosophy: NO mocks for business logic - test real implementations with real DOM.
 *
 * Approach: Uses mocked fetch that returns real index data from disk. This avoids
 * network dependencies while testing against actual corpus data (same approach as
 * engine.test.ts).
 *
 * Run with: cd apps/web && bun run test -- src/lib/search/hooks.test.ts
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { searchEngine } from "./engine";
import { useSearch, useSearchIndex, useSearchResult } from "./hooks";
import type { SearchResult } from "./types";

// Load real index data before tests
let mockIndexData: unknown = null;

beforeAll(async () => {
  // Read the real search index
  const indexContent = await readFile(resolve(process.cwd(), "public/search/index.json"), "utf8");
  mockIndexData = JSON.parse(indexContent);

  // Mock fetch to return our real index data
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => mockIndexData,
  } as Response);
});

afterAll(() => {
  vi.restoreAllMocks();
});

// ============================================================================
// useSearchResult Tests (Pure computation - no async)
// ============================================================================

describe("useSearchResult", () => {
  const createMockResult = (overrides: Partial<SearchResult> = {}): SearchResult => ({
    id: "transcript",
    docId: "transcript",
    docTitle: "Complete Transcript Collection",
    category: "transcript",
    snippet: "Test snippet with some content",
    matchPositions: [],
    score: 1.0,
    url: "/corpus/transcript",
    ...overrides,
  });

  describe("category labels and icons", () => {
    it("returns correct label for transcript", () => {
      const result = createMockResult({ category: "transcript" });
      const { result: hookResult } = renderHook(() => useSearchResult(result));

      expect(hookResult.current.categoryLabel).toBe("Transcript");
      expect(hookResult.current.categoryIcon).toBe("📜");
    });

    it("returns correct label for quote-bank", () => {
      const result = createMockResult({ category: "quote-bank" });
      const { result: hookResult } = renderHook(() => useSearchResult(result));

      expect(hookResult.current.categoryLabel).toBe("Quote");
      expect(hookResult.current.categoryIcon).toBe("💬");
    });

    it("returns correct label for distillation", () => {
      const result = createMockResult({ category: "distillation" });
      const { result: hookResult } = renderHook(() => useSearchResult(result));

      expect(hookResult.current.categoryLabel).toBe("Distillation");
      expect(hookResult.current.categoryIcon).toBe("🧪");
    });

    it("returns correct label for metaprompt", () => {
      const result = createMockResult({ category: "metaprompt" });
      const { result: hookResult } = renderHook(() => useSearchResult(result));

      expect(hookResult.current.categoryLabel).toBe("Metaprompt");
      expect(hookResult.current.categoryIcon).toBe("🎯");
    });

    it("returns correct label for raw-response", () => {
      const result = createMockResult({ category: "raw-response" });
      const { result: hookResult } = renderHook(() => useSearchResult(result));

      expect(hookResult.current.categoryLabel).toBe("Response");
      expect(hookResult.current.categoryIcon).toBe("📝");
    });

    it("falls back for unknown category", () => {
      const result = createMockResult({ category: "unknown" as never });
      const { result: hookResult } = renderHook(() => useSearchResult(result));

      expect(hookResult.current.categoryLabel).toBe("unknown");
      expect(hookResult.current.categoryIcon).toBe("📄");
    });
  });

  describe("snippet highlighting", () => {
    it("returns escaped snippet when no match positions", () => {
      const result = createMockResult({
        snippet: "Plain text without highlights",
        matchPositions: [],
      });
      const { result: hookResult } = renderHook(() => useSearchResult(result));

      expect(hookResult.current.highlightedSnippet).toBe("Plain text without highlights");
    });

    it("wraps matched text in mark tags", () => {
      const result = createMockResult({
        snippet: "Find the word here",
        matchPositions: [[5, 8]], // "the"
      });
      const { result: hookResult } = renderHook(() => useSearchResult(result));

      expect(hookResult.current.highlightedSnippet).toContain(
        '<mark class="search-highlight">the</mark>',
      );
    });

    it("handles multiple match positions", () => {
      const result = createMockResult({
        snippet: "the quick brown the fox",
        matchPositions: [
          [0, 3], // first "the"
          [16, 19], // second "the"
        ],
      });
      const { result: hookResult } = renderHook(() => useSearchResult(result));

      const highlighted = hookResult.current.highlightedSnippet;
      const markCount = (highlighted.match(/<mark/g) || []).length;
      expect(markCount).toBe(2);
    });

    it("escapes HTML in snippet", () => {
      const result = createMockResult({
        snippet: "<script>alert('xss')</script>",
        matchPositions: [],
      });
      const { result: hookResult } = renderHook(() => useSearchResult(result));

      expect(hookResult.current.highlightedSnippet).not.toContain("<script>");
      expect(hookResult.current.highlightedSnippet).toContain("&lt;script&gt;");
    });

    it("escapes HTML within highlighted portions", () => {
      const result = createMockResult({
        snippet: "test <b>bold</b> end",
        matchPositions: [[5, 8]], // "<b>"
      });
      const { result: hookResult } = renderHook(() => useSearchResult(result));

      expect(hookResult.current.highlightedSnippet).toContain("&lt;b&gt;");
      expect(hookResult.current.highlightedSnippet).not.toContain("< b>");
    });

    it("escapes ampersands", () => {
      const result = createMockResult({
        snippet: "Tom & Jerry",
        matchPositions: [],
      });
      const { result: hookResult } = renderHook(() => useSearchResult(result));

      expect(hookResult.current.highlightedSnippet).toContain("&amp;");
    });

    it("escapes quotes", () => {
      const result = createMockResult({
        snippet: 'He said "hello"',
        matchPositions: [],
      });
      const { result: hookResult } = renderHook(() => useSearchResult(result));

      expect(hookResult.current.highlightedSnippet).toContain("&quot;");
    });
  });

  describe("memoization", () => {
    it("returns same reference for same result", () => {
      const result = createMockResult();
      const { result: hookResult, rerender } = renderHook(() => useSearchResult(result));

      const first = hookResult.current;
      rerender();
      const second = hookResult.current;

      // Should be same object reference (memoized)
      expect(first.highlightedSnippet).toBe(second.highlightedSnippet);
    });
  });
});

// ============================================================================
// useSearchIndex Tests
// ============================================================================

describe("useSearchIndex", () => {
  it("returns initial state", () => {
    const { result } = renderHook(() => useSearchIndex());

    // Index should be loaded from beforeAll setup
    expect(typeof result.current.isLoaded).toBe("boolean");
    expect(typeof result.current.isLoading).toBe("boolean");
    expect(result.current.load).toBeDefined();
  });

  it("reports loaded state as boolean", async () => {
    const { result } = renderHook(() => useSearchIndex());

    // isLoaded should be a boolean (either true or false depending on engine state)
    expect(typeof result.current.isLoaded).toBe("boolean");
  });

  it("load function returns early if already loaded", async () => {
    const { result } = renderHook(() => useSearchIndex());

    // Load should be a no-op since already loaded
    await act(async () => {
      await result.current.load();
    });

    expect(result.current.isLoaded).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("load hits the early-return branch when searchEngine is already loaded before calling load()", async () => {
    searchEngine.clear();
    await searchEngine.load(); // uses the fetch stub from beforeAll

    const { result } = renderHook(() => useSearchIndex());

    await act(async () => {
      await result.current.load();
    });

    expect(result.current.isLoaded).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("load function is stable across renders", () => {
    const { result, rerender } = renderHook(() => useSearchIndex());

    const firstLoad = result.current.load;
    rerender();
    const secondLoad = result.current.load;

    expect(firstLoad).toBe(secondLoad);
  });

  it("sets error when index load fails", async () => {
    searchEngine.clear();
    vi.mocked(fetch).mockRejectedValueOnce(new Error("load-failed"));

    try {
      const { result } = renderHook(() => useSearchIndex());

      await act(async () => {
        await result.current.load();
      });

      expect(result.current.isLoaded).toBe(false);
      expect(result.current.error).toContain("load-failed");
    } finally {
      // Ensure later tests can reload successfully (loadPromise resets)
      searchEngine.clear();
    }
  });
});

// ============================================================================
// useSearch Tests
// ============================================================================

describe("useSearch", () => {
  describe("initial state", () => {
    it("starts with empty query", () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.query).toBe("");
    });

    it("starts with empty results", () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.results).toEqual([]);
    });

    it("starts with all scope", () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.scope).toBe("all");
    });

    it("has no error initially", () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.error).toBeNull();
    });
  });

  describe("search action", () => {
    it("updates query when search is called", async () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.search("brenner");
      });

      expect(result.current.query).toBe("brenner");
    });

    it("clearSearch resets query", async () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.search("brenner");
      });

      expect(result.current.query).toBe("brenner");

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.query).toBe("");
    });
  });

  describe("scope action", () => {
    it("updates scope when setScope is called", () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setScope("transcript");
      });

      expect(result.current.scope).toBe("transcript");
    });
  });

  describe("search results", () => {
    it("returns results after query is debounced", async () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.search("brenner");
      });

      // Wait for debounce and search to complete
      await waitFor(
        () => {
          expect(result.current.results.length).toBeGreaterThan(0);
        },
        { timeout: 2000 },
      );

      // Results should have expected shape (from SearchResult type)
      const firstResult = result.current.results[0];
      expect(firstResult).toHaveProperty("id");
      expect(firstResult).toHaveProperty("docId");
      expect(firstResult).toHaveProperty("docTitle");
      expect(firstResult).toHaveProperty("category");
      expect(firstResult).toHaveProperty("snippet");
      expect(firstResult).toHaveProperty("score");
      expect(firstResult).toHaveProperty("url");
    });

    it("returns empty results for empty query", async () => {
      const { result } = renderHook(() => useSearch());

      // Should have no results with empty query
      await waitFor(() => {
        expect(result.current.results).toEqual([]);
      });
    });

    it("respects limit option", async () => {
      const { result } = renderHook(() => useSearch({ limit: 5 }));

      act(() => {
        result.current.search("the"); // Common word that should have many results
      });

      await waitFor(
        () => {
          expect(result.current.results.length).toBeGreaterThan(0);
          expect(result.current.results.length).toBeLessThanOrEqual(5);
        },
        { timeout: 2000 },
      );
    });

    it("respects scope filtering", async () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setScope("transcript");
        result.current.search("brenner");
      });

      await waitFor(() => {
        expect(result.current.results.length).toBeGreaterThan(0);
      });

      expect(result.current.results.every((r) => r.category === "transcript")).toBe(true);
    });

    it("returns empty results for whitespace-only query", async () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.search("   ");
      });

      await waitFor(() => {
        expect(result.current.results).toEqual([]);
      });
    });

    it("returns an error when searchEngine.search throws", async () => {
      searchEngine.clear();
      await searchEngine.load(); // ensure isIndexLoaded can become true

      const searchSpy = vi.spyOn(searchEngine, "search").mockImplementation(() => {
        throw new Error("search-boom");
      });

      try {
        const { result } = renderHook(() => useSearch());

        act(() => {
          result.current.search("brenner");
        });

        await waitFor(() => {
          expect(result.current.error).toContain("search-boom");
        });

        expect(result.current.results).toEqual([]);
      } finally {
        searchSpy.mockRestore();
        searchEngine.clear();
      }
    });
  });

  describe("load errors", () => {
    it("exposes loadError via error and returns no results", async () => {
      searchEngine.clear();
      vi.mocked(fetch).mockRejectedValueOnce(new Error("boom"));

      try {
        const { result } = renderHook(() => useSearch());

        await waitFor(() => {
          expect(typeof result.current.error).toBe("string");
          expect(result.current.error).toContain("boom");
        });

        expect(result.current.results).toEqual([]);
        expect(result.current.isIndexLoaded).toBe(false);
      } finally {
        // Ensure later tests can reload successfully (loadPromise resets)
        searchEngine.clear();
      }
    });
  });

  describe("action stability", () => {
    it("search function is stable across renders", () => {
      const { result, rerender } = renderHook(() => useSearch());

      const firstSearch = result.current.search;
      rerender();
      const secondSearch = result.current.search;

      expect(firstSearch).toBe(secondSearch);
    });

    it("clearSearch function is stable across renders", () => {
      const { result, rerender } = renderHook(() => useSearch());

      const first = result.current.clearSearch;
      rerender();
      const second = result.current.clearSearch;

      expect(first).toBe(second);
    });

    it("setScope function is stable across renders", () => {
      const { result, rerender } = renderHook(() => useSearch());

      const first = result.current.setScope;
      rerender();
      const second = result.current.setScope;

      expect(first).toBe(second);
    });
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe("hook return types", () => {
  it("useSearch returns expected shape", () => {
    const { result } = renderHook(() => useSearch());

    // State
    expect(typeof result.current.query).toBe("string");
    expect(Array.isArray(result.current.results)).toBe(true);
    expect(typeof result.current.isSearching).toBe("boolean");
    expect(typeof result.current.isIndexLoaded).toBe("boolean");
    expect(typeof result.current.scope).toBe("string");

    // Actions
    expect(typeof result.current.search).toBe("function");
    expect(typeof result.current.clearSearch).toBe("function");
    expect(typeof result.current.setScope).toBe("function");
  });

  it("useSearchIndex returns expected shape", () => {
    const { result } = renderHook(() => useSearchIndex());

    expect(typeof result.current.isLoaded).toBe("boolean");
    expect(typeof result.current.isLoading).toBe("boolean");
    expect(typeof result.current.load).toBe("function");
  });

  it("useSearchResult returns expected shape", () => {
    const mockResult: SearchResult = {
      id: "test",
      docId: "test",
      docTitle: "Test",
      category: "transcript",
      snippet: "Test snippet",
      matchPositions: [],
      score: 1.0,
      url: "/test",
    };

    const { result } = renderHook(() => useSearchResult(mockResult));

    expect(typeof result.current.highlightedSnippet).toBe("string");
    expect(typeof result.current.categoryLabel).toBe("string");
    expect(typeof result.current.categoryIcon).toBe("string");
  });
});
