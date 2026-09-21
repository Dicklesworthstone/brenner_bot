/**
 * Search Module
 *
 * Public API for the client-side search system.
 *
 * @example
 * ```tsx
 * import { useSearch } from "@/lib/search";
 *
 * function SearchPage() {
 *   const { query, results, search, clearSearch } = useSearch();
 *   // ...
 * }
 * ```
 *
 * @see brenner_bot-3vc
 */

// Engine (for direct access)
export {
  getSearchError,
  isSearchIndexLoaded,
  loadSearchIndex,
  search,
  searchEngine,
} from "./engine";
// Hooks (primary API)
export { useSearch, useSearchIndex, useSearchResult } from "./hooks";
// Types
export type {
  IndexStats,
  SearchActions,
  SearchDocCategory,
  SearchOptions,
  SearchResult,
  SearchScope,
  SearchState,
  StoredSearchEntry,
  UseSearchReturn,
} from "./types";
