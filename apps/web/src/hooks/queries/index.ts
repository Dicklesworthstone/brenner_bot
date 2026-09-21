/**
 * TanStack Query Hooks for Corpus Data
 *
 * This module exports all query hooks for fetching and caching corpus data.
 * These hooks replace manual async calls with automatic caching via TanStack Query.
 *
 * Query Key Hierarchy:
 * - ['corpus'] - invalidates everything
 * - ['corpus', 'doc', id] - single document
 * - ['corpus', 'list'] - document list
 * - ['corpus', 'search', query, options] - search results
 *
 * @example
 * ```tsx
 * import {
 *   useCorpusDoc,
 *   useCorpusList,
 *   useCorpusSearch,
 * } from "@/hooks/queries";
 *
 * // Fetch single document
 * const { data } = useCorpusDoc("transcript");
 *
 * // Fetch document list
 * const { data: docs } = useCorpusList({ category: "distillation" });
 *
 * // Search corpus
 * const { data: results } = useCorpusSearch(query, { limit: 20 });
 * ```
 */

// Document hooks
export {
  type CorpusDocData,
  corpusDocKeys,
  prefetchCorpusDoc,
  type UseCorpusDocOptions,
  useCorpusDoc,
} from "./useCorpusDoc";

// List hooks
export {
  corpusListKeys,
  prefetchCorpusList,
  type UseCorpusListOptions,
  useCorpusList,
  useCorpusListGrouped,
} from "./useCorpusList";

// Search hooks
export {
  corpusSearchKeys,
  invalidateSearchResults,
  prefetchCorpusSearch,
  type SearchOptions,
  type UseCorpusSearchOptions,
  useCorpusSearch,
  useCorpusSearchInstant,
} from "./useCorpusSearch";

// ============================================================================
// Query Key Utilities
// ============================================================================

/**
 * Master key factory for all corpus queries.
 * Use for bulk invalidation.
 *
 * @example
 * ```tsx
 * // Invalidate all corpus data
 * queryClient.invalidateQueries({ queryKey: corpusKeys.all });
 * ```
 */
export const corpusKeys = {
  all: ["corpus"] as const,
  docs: ["corpus", "doc"] as const,
  list: ["corpus", "list"] as const,
  search: ["corpus", "search"] as const,
};
