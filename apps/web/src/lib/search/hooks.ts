/**
 * Search Hooks
 *
 * React hooks for search functionality.
 *
 * @see brenner_bot-3vc
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebounce } from "../../hooks/useDebounce";
import { loadSearchIndex, searchEngine } from "./engine";
import type {
  SearchActions,
  SearchResult,
  SearchScope,
  SearchState,
  UseSearchReturn,
} from "./types";

// ============================================================================
// Configuration
// ============================================================================

const DEBOUNCE_DELAY = 150; // ms
const DEFAULT_LIMIT = 20;

// ============================================================================
// useSearch Hook
// ============================================================================

/**
 * Main search hook that provides search state and actions.
 *
 * Features:
 * - Lazy index loading on first search
 * - Debounced search input
 * - Scope filtering
 * - Loading and error states
 *
 * @example
 * ```tsx
 * function SearchComponent() {
 *   const { query, results, isSearching, search, clearSearch } = useSearch();
 *
 *   return (
 *     <div>
 *       <input
 *         value={query}
 *         onChange={(e) => search(e.target.value)}
 *         placeholder="Search..."
 *       />
 *       {isSearching && <Spinner />}
 *       {results.map(result => (
 *         <SearchResult key={result.id} result={result} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSearch(options: { limit?: number } = {}): UseSearchReturn {
  const { limit = DEFAULT_LIMIT } = options;

  // State
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [isIndexLoaded, setIsIndexLoaded] = useState(() => searchEngine.isLoaded);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Debounce the query
  const [debouncedQuery, isPending] = useDebounce(query, DEBOUNCE_DELAY);

  // Load index on mount
  useEffect(() => {
    let mounted = true;

    // Check if already loaded
    if (searchEngine.isLoaded) {
      return;
    }

    // Load the index
    loadSearchIndex()
      .then(() => {
        if (mounted) {
          setIsIndexLoaded(true);
          setLoadError(null);
        }
      })
      .catch((err) => {
        if (mounted) {
          setLoadError(err.message || "Failed to load search index");
          setIsIndexLoaded(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const { results, error } = useMemo<{ results: SearchResult[]; error: string | null }>(() => {
    if (loadError) return { results: [], error: loadError };
    if (!isIndexLoaded) return { results: [], error: null };
    if (!debouncedQuery.trim()) return { results: [], error: null };

    try {
      const searchResults = searchEngine.search(debouncedQuery, {
        scope,
        limit,
      });
      return { results: searchResults, error: null };
    } catch (err) {
      return {
        results: [],
        error: err instanceof Error ? err.message : "Search failed",
      };
    }
  }, [debouncedQuery, scope, limit, isIndexLoaded, loadError]);

  // Actions
  const search = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery("");
  }, []);

  const updateScope = useCallback((newScope: SearchScope) => {
    setScope(newScope);
  }, []);

  // Combined state
  const state: SearchState = useMemo(
    () => ({
      query,
      results,
      isSearching: isPending,
      isIndexLoaded,
      scope,
      error,
    }),
    [query, results, isPending, isIndexLoaded, scope, error],
  );

  const actions: SearchActions = useMemo(
    () => ({
      search,
      clearSearch,
      setScope: updateScope,
    }),
    [search, clearSearch, updateScope],
  );

  return { ...state, ...actions };
}

// ============================================================================
// useSearchIndex Hook
// ============================================================================

/**
 * Hook for preloading the search index.
 * Use this to load the index before the user opens search.
 *
 * @example
 * ```tsx
 * function App() {
 *   // Preload index on app mount
 *   useSearchIndex();
 *   return <Main />;
 * }
 * ```
 */
export function useSearchIndex(): {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
} {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check initial state
  useEffect(() => {
    setIsLoaded(searchEngine.isLoaded);
  }, []);

  const load = useCallback(async () => {
    if (searchEngine.isLoaded) {
      setIsLoaded(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await loadSearchIndex();
      setIsLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load search index");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoaded, isLoading, error, load };
}

// ============================================================================
// useSearchResult Hook
// ============================================================================

/**
 * Hook for rendering a single search result with highlight information.
 *
 * @example
 * ```tsx
 * function ResultItem({ result }: { result: SearchResult }) {
 *   const { highlightedSnippet, categoryLabel, icon } = useSearchResult(result);
 *
 *   return (
 *     <div>
 *       <span>{icon}</span>
 *       <span>{categoryLabel}</span>
 *       <div dangerouslySetInnerHTML={{ __html: highlightedSnippet }} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useSearchResult(result: SearchResult): {
  highlightedSnippet: string;
  categoryLabel: string;
  categoryIcon: string;
} {
  // Generate highlighted snippet HTML
  const highlightedSnippet = useMemo(() => {
    if (!result.matchPositions.length) {
      return escapeHtml(result.snippet);
    }

    let html = "";
    let lastEnd = 0;

    for (const [start, end] of result.matchPositions) {
      // Add text before highlight
      html += escapeHtml(result.snippet.slice(lastEnd, start));
      // Add highlighted text
      html += `<mark class="search-highlight">${escapeHtml(result.snippet.slice(start, end))}</mark>`;
      lastEnd = end;
    }

    // Add remaining text
    html += escapeHtml(result.snippet.slice(lastEnd));

    return html;
  }, [result.snippet, result.matchPositions]);

  // Category display info
  const categoryInfo = useMemo(() => {
    const labels: Record<string, { label: string; icon: string }> = {
      transcript: { label: "Transcript", icon: "📜" },
      "quote-bank": { label: "Quote", icon: "💬" },
      distillation: { label: "Distillation", icon: "🧪" },
      metaprompt: { label: "Metaprompt", icon: "🎯" },
      "raw-response": { label: "Response", icon: "📝" },
    };

    return labels[result.category] ?? { label: result.category, icon: "📄" };
  }, [result.category]);

  return {
    highlightedSnippet,
    categoryLabel: categoryInfo.label,
    categoryIcon: categoryInfo.icon,
  };
}

// ============================================================================
// Utilities
// ============================================================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
