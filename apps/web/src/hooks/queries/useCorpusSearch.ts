"use client";

/**
 * useCorpusSearch - Query Hook for Corpus Full-Text Search
 *
 * Provides reactive search across all corpus documents with automatic caching.
 * Replaces the manual caching in globalSearch.ts with TanStack Query.
 *
 * Features:
 * - Automatic result caching
 * - Debounce-friendly (use with useDebounce for input)
 * - Category and model filtering
 * - Loading and error states
 *
 * @example
 * ```tsx
 * function SearchResults() {
 *   const [query, setQuery] = useState("");
 *   const debouncedQuery = useDebounce(query, 300);
 *
 *   const { data, isLoading, isFetching } = useCorpusSearch(debouncedQuery, {
 *     category: "distillation",
 *     limit: 20,
 *   });
 *
 *   return (
 *     <div>
 *       <input value={query} onChange={(e) => setQuery(e.target.value)} />
 *       {isFetching && <Spinner />}
 *       {data?.hits.map((hit) => <SearchHit key={hit.id} hit={hit} />)}
 *     </div>
 *   );
 * }
 * ```
 */

import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { searchAction } from "@/lib/globalSearchAction";
import type { GlobalSearchResult, SearchCategory } from "@/lib/globalSearchTypes";

// ============================================================================
// Types
// ============================================================================

export interface SearchOptions {
  /** Maximum results to return */
  limit?: number;
  /** Filter by category */
  category?: SearchCategory;
  /** Filter by model */
  model?: "gpt" | "opus" | "gemini";
}

export interface UseCorpusSearchOptions
  extends Omit<
    UseQueryOptions<
      GlobalSearchResult,
      Error,
      GlobalSearchResult,
      readonly (string | SearchOptions)[]
    >,
    "queryKey" | "queryFn"
  > {
  /** Search query string */
  query: string;
  /** Search options */
  searchOptions?: SearchOptions;
}

// ============================================================================
// Query Key Factory (imported from shared keys file for RSC compatibility)
// ============================================================================

import { corpusSearchKeys } from "./keys";

export { corpusSearchKeys };

// ============================================================================
// Hook
// ============================================================================

/**
 * Search the corpus with automatic caching.
 *
 * Features:
 * - Results cached by query + options
 * - Disabled for empty queries
 * - Shorter stale time (search may update with new content)
 * - Includes search metadata (timing, category counts)
 *
 * @param query - Search query string
 * @param options - Search and query options
 * @returns Query result with search hits and metadata
 */
export function useCorpusSearch(
  query: string,
  options?: SearchOptions & Omit<UseCorpusSearchOptions, "query" | "searchOptions">,
) {
  const { limit, category, model, ...queryOptions } = options ?? {};
  // Build searchOptions without undefined values to ensure consistent cache keys
  // (e.g., {} should match {} not { limit: undefined, category: undefined, model: undefined })
  const searchOptions: SearchOptions = {
    ...(limit !== undefined && { limit }),
    ...(category !== undefined && { category }),
    ...(model !== undefined && { model }),
  };

  // User can only make enabled MORE restrictive, not less
  const userEnabled = queryOptions?.enabled ?? true;

  return useQuery({
    // User options first (as defaults)
    ...queryOptions,
    // Required settings that must not be overridden
    queryKey: corpusSearchKeys.query(query, searchOptions as Record<string, unknown>),
    queryFn: () => searchAction(query, searchOptions),
    // Only run search if query is non-empty (at least 2 chars) AND user hasn't disabled
    enabled: query.length >= 2 && userEnabled,
    // Customizable defaults
    staleTime: queryOptions?.staleTime ?? 2 * 60 * 1000, // 2 minutes default
    placeholderData: queryOptions?.placeholderData ?? ((previousData) => previousData),
  });
}

/**
 * Hook variant with debounced query handling.
 * Use this when you want Query to handle the loading states
 * but still want responsive UI during typing.
 *
 * @param query - Raw query (will be disabled if < 2 chars)
 * @param options - Search options
 * @returns Query result with isFetching for loading indicator
 */
export function useCorpusSearchInstant(query: string, options?: SearchOptions) {
  const { limit, category, model } = options ?? {};
  // Build searchOptions without undefined values to ensure consistent cache keys
  const searchOptions: SearchOptions = {
    ...(limit !== undefined && { limit }),
    ...(category !== undefined && { category }),
    ...(model !== undefined && { model }),
  };

  return useQuery({
    queryKey: corpusSearchKeys.query(query, searchOptions as Record<string, unknown>),
    queryFn: () => searchAction(query, searchOptions),
    enabled: query.length >= 2,
    staleTime: 2 * 60 * 1000,
    // Keep showing previous results while typing
    placeholderData: (previousData) => previousData,
    // Don't retry on user typos
    retry: false,
  });
}

/**
 * Prefetch search results (useful for common queries).
 */
export async function prefetchCorpusSearch(
  queryClient: import("@tanstack/react-query").QueryClient,
  query: string,
  options?: SearchOptions,
): Promise<void> {
  if (query.length < 2) return;

  await queryClient.prefetchQuery({
    queryKey: corpusSearchKeys.query(query, options as Record<string, unknown> | undefined),
    queryFn: () => searchAction(query, options),
  });
}

/**
 * Invalidate all search results.
 * Call this when corpus content changes.
 */
export function invalidateSearchResults(
  queryClient: import("@tanstack/react-query").QueryClient,
): Promise<void> {
  return queryClient.invalidateQueries({
    queryKey: corpusSearchKeys.all,
  });
}
