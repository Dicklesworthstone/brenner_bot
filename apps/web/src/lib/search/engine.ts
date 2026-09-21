/**
 * Search Engine Module
 *
 * Client-side search engine wrapper for MiniSearch.
 * Handles lazy index loading, search execution, and snippet generation.
 *
 * @see brenner_bot-3vc
 */

import MiniSearch from "minisearch";
import type {
  SearchDocCategory,
  SearchOptions,
  SearchResult,
  SearchScope,
  StoredSearchEntry,
} from "./types";

// ============================================================================
// Configuration
// ============================================================================

const INDEX_URL = "/search/index.json";
const DEFAULT_LIMIT = 20;

// Map scopes to categories for filtering
const SCOPE_TO_CATEGORIES: Record<SearchScope, SearchDocCategory[] | null> = {
  all: null,
  transcript: ["transcript"],
  distillation: ["distillation"],
  "quote-bank": ["quote-bank"],
  metaprompt: ["metaprompt"],
};

// Map doc IDs to their URL paths (must match Next.js routes in app/)
const DOC_ID_TO_PATH: Record<string, string> = {
  transcript: "/corpus/transcript",
  "quote-bank": "/corpus/quote-bank",
  metaprompt: "/corpus/metaprompt",
  "initial-metaprompt": "/corpus/initial-metaprompt",
  "distillation-gpt-52": "/corpus/distillation-gpt-52",
  "distillation-opus-45": "/corpus/distillation-opus-45",
  "distillation-gemini-3": "/corpus/distillation-gemini-3",
};

// ============================================================================
// Search Engine Class
// ============================================================================

/**
 * Search engine singleton that manages index loading and search execution.
 */
class SearchEngine {
  private miniSearch: MiniSearch<StoredSearchEntry> | null = null;
  private loadPromise: Promise<void> | null = null;
  private loadError: Error | null = null;

  /**
   * Check if the index is loaded.
   */
  get isLoaded(): boolean {
    return this.miniSearch !== null;
  }

  /**
   * Check if index loading failed.
   */
  get hasError(): boolean {
    return this.loadError !== null;
  }

  /**
   * Get the load error message.
   */
  get errorMessage(): string | null {
    return this.loadError?.message ?? null;
  }

  /**
   * Load the search index from the server.
   * Returns immediately if already loaded or loading.
   */
  async load(): Promise<void> {
    // Already loaded
    if (this.miniSearch) return;

    // Already loading - wait for existing promise
    if (this.loadPromise) return this.loadPromise;

    // Start loading
    this.loadPromise = this.doLoad();
    return this.loadPromise;
  }

  private async doLoad(): Promise<void> {
    try {
      const response = await fetch(INDEX_URL);
      if (!response.ok) {
        throw new Error(`Failed to load search index: ${response.status}`);
      }

      const indexData = await response.json();

      // Create MiniSearch instance and load the index
      this.miniSearch = MiniSearch.loadJSON(JSON.stringify(indexData), {
        fields: ["content", "sectionTitle", "docTitle"],
        storeFields: [
          "docId",
          "docTitle",
          "sectionTitle",
          "anchor",
          "category",
          "sectionNumber",
          "reference",
        ],
        searchOptions: {
          prefix: true,
          fuzzy: 0.2,
          boost: { sectionTitle: 2, docTitle: 1.5, content: 1 },
        },
      });

      // Extract content from index for snippet generation
      // MiniSearch stores documents internally, we can access them
      // through the documentCount and iterate
      this.loadError = null;
    } catch (error) {
      this.loadError = error instanceof Error ? error : new Error("Failed to load search index");
      this.miniSearch = null;
      throw this.loadError;
    } finally {
      // Allow retry after transient failures (and avoid holding onto a settled promise).
      this.loadPromise = null;
    }
  }

  /**
   * Execute a search query.
   */
  search(query: string, options: SearchOptions = {}): SearchResult[] {
    if (!this.miniSearch || !query.trim()) {
      return [];
    }

    const { scope = "all", limit = DEFAULT_LIMIT, fuzzy = 0.2, prefix = true } = options;

    // Get allowed categories for this scope
    const allowedCategories = SCOPE_TO_CATEGORIES[scope];

    // Execute search
    const rawResults = this.miniSearch.search(query, {
      prefix,
      fuzzy,
      ...(allowedCategories && {
        filter: (result) => allowedCategories.includes(result.category as SearchDocCategory),
      }),
    });

    // Transform results
    const results: SearchResult[] = rawResults.slice(0, limit).map((result) => {
      const stored = result as unknown as StoredSearchEntry & {
        id: string;
        score: number;
        match: Record<string, string[]>;
      };

      // Generate snippet and match positions from stored metadata
      const { snippet, matchPositions } = this.generateSnippet(stored, query);

      // Build URL (fallback to /corpus/ path if not in map)
      const basePath = DOC_ID_TO_PATH[stored.docId] ?? `/corpus/${stored.docId}`;
      const url = stored.anchor ? `${basePath}${stored.anchor}` : basePath;

      return {
        id: stored.id,
        docId: stored.docId,
        docTitle: stored.docTitle,
        sectionTitle: stored.sectionTitle,
        anchor: stored.anchor,
        category: stored.category,
        sectionNumber: stored.sectionNumber,
        reference: stored.reference,
        score: result.score,
        snippet,
        matchPositions,
        url,
      };
    });

    return results;
  }

  /**
   * Generate a text snippet with match positions for highlighting.
   *
   * Note: Since MiniSearch doesn't store the original content (only metadata),
   * we generate a contextual snippet from the stored fields. For full content
   * snippets, use the server-side globalSearch which has access to the corpus.
   */
  private generateSnippet(
    stored: StoredSearchEntry,
    query: string,
  ): { snippet: string; matchPositions: Array<[number, number]> } {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matchPositions: Array<[number, number]> = [];

    // Build a meaningful snippet from stored metadata
    const parts: string[] = [];
    if (stored.sectionTitle) {
      parts.push(stored.sectionTitle);
    }
    if (stored.reference) {
      parts.push(`(${stored.reference})`);
    }
    parts.push(`in ${stored.docTitle}`);

    const snippet = parts.join(" ");

    // Find positions of query terms in the snippet for highlighting
    const lowerSnippet = snippet.toLowerCase();
    for (const term of queryTerms) {
      let pos = 0;
      while ((pos = lowerSnippet.indexOf(term, pos)) !== -1) {
        matchPositions.push([pos, pos + term.length]);
        pos += term.length;
      }
    }

    // Sort positions by start index
    matchPositions.sort((a, b) => a[0] - b[0]);

    // Merge overlapping positions to prevent duplicate text in highlights
    const mergedPositions: Array<[number, number]> = [];
    for (const [start, end] of matchPositions) {
      if (mergedPositions.length === 0) {
        mergedPositions.push([start, end]);
      } else {
        const last = mergedPositions[mergedPositions.length - 1];
        if (start <= last[1]) {
          // Overlapping or adjacent - extend the previous range
          last[1] = Math.max(last[1], end);
        } else {
          mergedPositions.push([start, end]);
        }
      }
    }

    return { snippet, matchPositions: mergedPositions };
  }

  /**
   * Clear the loaded index (useful for testing or memory management).
   */
  clear(): void {
    this.miniSearch = null;
    this.loadPromise = null;
    this.loadError = null;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Global search engine instance.
 * Use this for all search operations to avoid loading the index multiple times.
 */
export const searchEngine = new SearchEngine();

/**
 * Convenience function to load the search index.
 */
export async function loadSearchIndex(): Promise<void> {
  return searchEngine.load();
}

/**
 * Convenience function to execute a search.
 */
export function search(query: string, options?: SearchOptions): SearchResult[] {
  return searchEngine.search(query, options);
}

/**
 * Check if the search index is loaded.
 */
export function isSearchIndexLoaded(): boolean {
  return searchEngine.isLoaded;
}

/**
 * Get search index loading error if any.
 */
export function getSearchError(): string | null {
  return searchEngine.errorMessage;
}
