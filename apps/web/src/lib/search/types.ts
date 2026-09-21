/**
 * Search Types
 *
 * Type definitions for the search system.
 * @see brenner_bot-3vc
 */

/**
 * Document category type for client-side use.
 * Must stay in sync with DocCategory in corpus.ts (which uses Node.js APIs).
 */
export type SearchDocCategory =
  | "transcript"
  | "quote-bank"
  | "distillation"
  | "metaprompt"
  | "raw-response";

/**
 * Search scope options for filtering results.
 */
export type SearchScope = "all" | "transcript" | "distillation" | "quote-bank" | "metaprompt";

/**
 * A stored search entry from the index.
 * These fields are stored in the MiniSearch index.
 */
export interface StoredSearchEntry {
  /** Document ID for linking (e.g., "transcript", "distillation-opus-45") */
  docId: string;
  /** Document title for display */
  docTitle: string;
  /** Section title if applicable */
  sectionTitle?: string;
  /** URL anchor for deep linking (e.g., "#section-42") */
  anchor?: string;
  /** Document category for filtering */
  category: SearchDocCategory;
  /** Section number for transcripts */
  sectionNumber?: number;
  /** Quote reference for quote bank (e.g., "§57") */
  reference?: string;
}

/**
 * A search result with relevance information.
 */
export interface SearchResult extends StoredSearchEntry {
  /** Unique identifier for this result */
  id: string;
  /** Relevance score from MiniSearch (higher is better) */
  score: number;
  /** Text snippet with context around match */
  snippet: string;
  /** Match positions within the snippet for highlighting */
  matchPositions: Array<[number, number]>;
  /** Full URL to navigate to this result */
  url: string;
}

/**
 * Search options passed to the search function.
 */
export interface SearchOptions {
  /** Filter by document scope */
  scope?: SearchScope;
  /** Maximum number of results */
  limit?: number;
  /** Whether to include fuzzy matches */
  fuzzy?: boolean | number;
  /** Whether to include prefix matches */
  prefix?: boolean;
}

/**
 * Search state returned by the useSearch hook.
 */
export interface SearchState {
  /** Current search query */
  query: string;
  /** Search results */
  results: SearchResult[];
  /** Whether a search is in progress */
  isSearching: boolean;
  /** Whether the index is loaded */
  isIndexLoaded: boolean;
  /** Current search scope */
  scope: SearchScope;
  /** Error message if search failed */
  error: string | null;
}

/**
 * Search actions returned by the useSearch hook.
 */
export interface SearchActions {
  /** Execute a search */
  search: (query: string) => void;
  /** Clear search results */
  clearSearch: () => void;
  /** Set search scope */
  setScope: (scope: SearchScope) => void;
}

/**
 * Combined search hook return type.
 */
export type UseSearchReturn = SearchState & SearchActions;

/**
 * Index metadata/stats.
 */
export interface IndexStats {
  totalEntries: number;
  byCategory: Record<string, number>;
  indexSizeBytes: number;
  buildTimeMs: number;
}
