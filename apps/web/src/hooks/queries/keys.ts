/**
 * Query Key Factories for TanStack Query
 *
 * These are plain data structures (no React/client dependencies)
 * so they can be safely imported by both server and client components.
 */

// ============================================================================
// Corpus Document Keys
// ============================================================================

export const corpusDocKeys = {
  all: ["corpus", "doc"] as const,
  detail: (id: string) => ["corpus", "doc", id] as const,
};

// ============================================================================
// Corpus List Keys
// ============================================================================

export const corpusListKeys = {
  all: ["corpus", "list"] as const,
  filtered: (filters?: { category?: string }) => ["corpus", "list", filters ?? {}] as const,
};

// ============================================================================
// Corpus Search Keys
// ============================================================================

export const corpusSearchKeys = {
  all: ["corpus", "search"] as const,
  query: <T extends Record<string, unknown>>(query: string, options?: T) =>
    ["corpus", "search", query, options ?? {}] as const,
};

// ============================================================================
// Master Keys (for bulk invalidation)
// ============================================================================

export const corpusKeys = {
  all: ["corpus"] as const,
  docs: ["corpus", "doc"] as const,
  list: ["corpus", "list"] as const,
  search: ["corpus", "search"] as const,
};
