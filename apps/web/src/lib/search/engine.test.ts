/**
 * search/engine.ts Unit Tests
 *
 * Tests search engine functionality with real index data where possible.
 * Philosophy: Minimal mocks - test real behavior and edge cases.
 *
 * Run with: cd apps/web && bun run test -- src/lib/search/engine.test.ts
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSearchError,
  isSearchIndexLoaded,
  loadSearchIndex,
  search,
  searchEngine,
} from "./engine";
import type { SearchOptions, SearchResult, SearchScope } from "./types";

function parseSearchIndexJson(indexContent: string): unknown {
  try {
    return JSON.parse(indexContent) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse public/search/index.json: ${message}`);
  }
}

// ============================================================================
// Test Setup
// ============================================================================

// Reset the search engine state before each test
beforeEach(() => {
  searchEngine.clear();
});

afterEach(() => {
  searchEngine.clear();
  vi.restoreAllMocks();
});

// ============================================================================
// Initial State Tests
// ============================================================================

describe("SearchEngine initial state", () => {
  it("starts with isLoaded = false", () => {
    expect(searchEngine.isLoaded).toBe(false);
  });

  it("starts with hasError = false", () => {
    expect(searchEngine.hasError).toBe(false);
  });

  it("starts with errorMessage = null", () => {
    expect(searchEngine.errorMessage).toBeNull();
  });
});

// ============================================================================
// isSearchIndexLoaded Tests
// ============================================================================

describe("isSearchIndexLoaded", () => {
  it("returns false before loading", () => {
    expect(isSearchIndexLoaded()).toBe(false);
  });

  it("matches searchEngine.isLoaded property", () => {
    expect(isSearchIndexLoaded()).toBe(searchEngine.isLoaded);
  });
});

// ============================================================================
// getSearchError Tests
// ============================================================================

describe("getSearchError", () => {
  it("returns null when no error", () => {
    expect(getSearchError()).toBeNull();
  });

  it("matches searchEngine.errorMessage property", () => {
    expect(getSearchError()).toBe(searchEngine.errorMessage);
  });
});

// ============================================================================
// search() Without Index Tests
// ============================================================================

describe("search without loaded index", () => {
  it("returns empty array when index not loaded", () => {
    const results = search("brenner");
    expect(results).toEqual([]);
  });

  it("returns empty array for empty query", () => {
    const results = search("");
    expect(results).toEqual([]);
  });

  it("returns empty array for whitespace-only query", () => {
    const results = search("   ");
    expect(results).toEqual([]);
  });

  it("handles search with options when index not loaded", () => {
    const options: SearchOptions = {
      scope: "transcript",
      limit: 10,
    };
    const results = search("test", options);
    expect(results).toEqual([]);
  });
});

// ============================================================================
// clear() Tests
// ============================================================================

describe("searchEngine.clear", () => {
  it("resets isLoaded to false", () => {
    searchEngine.clear();
    expect(searchEngine.isLoaded).toBe(false);
  });

  it("resets hasError to false", () => {
    searchEngine.clear();
    expect(searchEngine.hasError).toBe(false);
  });

  it("resets errorMessage to null", () => {
    searchEngine.clear();
    expect(searchEngine.errorMessage).toBeNull();
  });

  it("can be called multiple times safely", () => {
    searchEngine.clear();
    searchEngine.clear();
    searchEngine.clear();
    expect(searchEngine.isLoaded).toBe(false);
  });
});

// ============================================================================
// load() Error Handling Tests
// ============================================================================

describe("loadSearchIndex error handling", () => {
  it("sets hasError when fetch fails", async () => {
    // Mock fetch to fail
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));

    try {
      await loadSearchIndex();
    } catch {
      // Expected to throw
    }

    expect(searchEngine.hasError).toBe(true);
    expect(searchEngine.errorMessage).toBe("Network error");
  });

  it("sets hasError when response is not ok", async () => {
    // Mock fetch to return non-ok response
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    try {
      await loadSearchIndex();
    } catch {
      // Expected to throw
    }

    expect(searchEngine.hasError).toBe(true);
    expect(searchEngine.errorMessage).toContain("404");
  });

  it("preserves error state until cleared", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Test error"));

    try {
      await loadSearchIndex();
    } catch {
      // Expected
    }

    expect(searchEngine.hasError).toBe(true);

    // Clear should reset error state
    searchEngine.clear();
    expect(searchEngine.hasError).toBe(false);
    expect(searchEngine.errorMessage).toBeNull();
  });

  it("allows retry after transient fetch failure", async () => {
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const indexContent = await readFile(resolve(process.cwd(), "public/search/index.json"), "utf8");
    const indexData = parseSearchIndexJson(indexContent);

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("Temporary network error"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => indexData,
      } as Response);

    await expect(loadSearchIndex()).rejects.toThrow(/temporary network error/i);
    expect(searchEngine.isLoaded).toBe(false);
    expect(searchEngine.hasError).toBe(true);

    await loadSearchIndex();
    expect(searchEngine.isLoaded).toBe(true);
    expect(searchEngine.hasError).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

// ============================================================================
// SearchOptions Type Tests
// ============================================================================

describe("SearchOptions", () => {
  it("accepts scope option", () => {
    const options: SearchOptions = { scope: "transcript" };
    expect(options.scope).toBe("transcript");
  });

  it("accepts all valid scopes", () => {
    const scopes: SearchScope[] = ["all", "transcript", "distillation", "quote-bank", "metaprompt"];
    for (const scope of scopes) {
      const options: SearchOptions = { scope };
      expect(options.scope).toBe(scope);
    }
  });

  it("accepts limit option", () => {
    const options: SearchOptions = { limit: 10 };
    expect(options.limit).toBe(10);
  });

  it("accepts fuzzy option as boolean", () => {
    const options: SearchOptions = { fuzzy: true };
    expect(options.fuzzy).toBe(true);
  });

  it("accepts fuzzy option as number", () => {
    const options: SearchOptions = { fuzzy: 0.3 };
    expect(options.fuzzy).toBe(0.3);
  });

  it("accepts prefix option", () => {
    const options: SearchOptions = { prefix: false };
    expect(options.prefix).toBe(false);
  });

  it("accepts combined options", () => {
    const options: SearchOptions = {
      scope: "distillation",
      limit: 20,
      fuzzy: 0.2,
      prefix: true,
    };
    expect(options.scope).toBe("distillation");
    expect(options.limit).toBe(20);
    expect(options.fuzzy).toBe(0.2);
    expect(options.prefix).toBe(true);
  });
});

// ============================================================================
// SearchResult Type Tests
// ============================================================================

describe("SearchResult type", () => {
  it("has required fields", () => {
    const result: SearchResult = {
      id: "test-1",
      docId: "transcript",
      docTitle: "Complete Transcript",
      category: "transcript",
      score: 5.5,
      snippet: "Test snippet",
      matchPositions: [[0, 4]],
      url: "/corpus/transcript#section-1",
    };

    expect(result.id).toBe("test-1");
    expect(result.docId).toBe("transcript");
    expect(result.docTitle).toBe("Complete Transcript");
    expect(result.category).toBe("transcript");
    expect(result.score).toBe(5.5);
    expect(result.snippet).toBe("Test snippet");
    expect(result.matchPositions).toEqual([[0, 4]]);
    expect(result.url).toBe("/corpus/transcript#section-1");
  });

  it("accepts optional fields", () => {
    const result: SearchResult = {
      id: "test-2",
      docId: "transcript",
      docTitle: "Transcript",
      category: "transcript",
      score: 3.0,
      snippet: "Snippet",
      matchPositions: [],
      url: "/corpus/transcript",
      sectionTitle: "Section 42",
      anchor: "#section-42",
      sectionNumber: 42,
      reference: "§42",
    };

    expect(result.sectionTitle).toBe("Section 42");
    expect(result.anchor).toBe("#section-42");
    expect(result.sectionNumber).toBe(42);
    expect(result.reference).toBe("§42");
  });
});

// ============================================================================
// Load with Real Index (Integration-style test)
// ============================================================================

describe("loadSearchIndex with real index", () => {
  it("loads index successfully when available", async () => {
    // Read the real index file to use in our mock
    // This tests that our code correctly parses the real index format

    // Mock fetch to return the real index from the file system
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const indexContent = await readFile(resolve(process.cwd(), "public/search/index.json"), "utf8");
    const indexData = parseSearchIndexJson(indexContent);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => indexData,
    } as Response);

    await loadSearchIndex();

    expect(searchEngine.isLoaded).toBe(true);
    expect(searchEngine.hasError).toBe(false);
    expect(isSearchIndexLoaded()).toBe(true);
  });

  it("can search after loading real index", async () => {
    // Load real index via mock
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const indexContent = await readFile(resolve(process.cwd(), "public/search/index.json"), "utf8");
    const indexData = parseSearchIndexJson(indexContent);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => indexData,
    } as Response);

    await loadSearchIndex();

    // Search for a term that should be in the transcript
    const results = search("brenner");

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);

    // Verify result structure
    const firstResult = results[0];
    expect(firstResult.id).toBeTruthy();
    expect(firstResult.docId).toBeTruthy();
    expect(firstResult.docTitle).toBeTruthy();
    expect(typeof firstResult.score).toBe("number");
    expect(firstResult.snippet).toBeTruthy();
    expect(Array.isArray(firstResult.matchPositions)).toBe(true);
    expect(firstResult.url).toBeTruthy();
  });

  it("respects scope filter", async () => {
    // Load real index via mock
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const indexContent = await readFile(resolve(process.cwd(), "public/search/index.json"), "utf8");
    const indexData = parseSearchIndexJson(indexContent);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => indexData,
    } as Response);

    await loadSearchIndex();

    // Search with transcript scope
    const results = search("method", { scope: "transcript" });

    // All results should be from transcript category
    for (const result of results) {
      expect(result.category).toBe("transcript");
    }
  });

  it("respects limit option", async () => {
    // Load real index
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const indexContent = await readFile(resolve(process.cwd(), "public/search/index.json"), "utf8");
    const indexData = parseSearchIndexJson(indexContent);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => indexData,
    } as Response);

    await loadSearchIndex();

    const results = search("science", { limit: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("returns results sorted by score (descending)", async () => {
    // Load real index
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const indexContent = await readFile(resolve(process.cwd(), "public/search/index.json"), "utf8");
    const indexData = parseSearchIndexJson(indexContent);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => indexData,
    } as Response);

    await loadSearchIndex();

    const results = search("biology", { limit: 10 });

    // Verify descending score order
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });
});

// ============================================================================
// Snippet Generation Tests
// ============================================================================

describe("snippet generation", () => {
  it("generates snippets with match positions", async () => {
    // Load real index
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const indexContent = await readFile(resolve(process.cwd(), "public/search/index.json"), "utf8");
    const indexData = parseSearchIndexJson(indexContent);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => indexData,
    } as Response);

    await loadSearchIndex();

    const results = search("dna");

    if (results.length > 0) {
      const result = results[0];
      expect(result.snippet).toBeTruthy();
      expect(Array.isArray(result.matchPositions)).toBe(true);

      // Match positions should be valid ranges within the snippet
      for (const [start, end] of result.matchPositions) {
        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeGreaterThan(start);
        expect(end).toBeLessThanOrEqual(result.snippet.length);
      }
    }
  });
});

// ============================================================================
// URL Generation Tests
// ============================================================================

describe("URL generation", () => {
  it("generates valid URLs for results", async () => {
    // Load real index
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const indexContent = await readFile(resolve(process.cwd(), "public/search/index.json"), "utf8");
    const indexData = parseSearchIndexJson(indexContent);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => indexData,
    } as Response);

    await loadSearchIndex();

    const results = search("research");

    for (const result of results) {
      expect(result.url).toBeTruthy();
      expect(result.url).toMatch(/^\/corpus\//);

      // If there's an anchor, it should be included
      if (result.anchor) {
        expect(result.url).toContain(result.anchor);
      }
    }
  });
});
