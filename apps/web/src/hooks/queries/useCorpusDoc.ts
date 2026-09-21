"use client";

/**
 * useCorpusDoc - Query Hook for Single Corpus Document
 *
 * Fetches and caches a single corpus document by ID.
 * Uses TanStack Query for automatic caching, refetching, and state management.
 *
 * @example
 * ```tsx
 * function TranscriptViewer() {
 *   const { data, isLoading, error } = useCorpusDoc("transcript");
 *
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <ErrorMessage error={error} />;
 *
 *   return <MarkdownRenderer content={data.content} />;
 * }
 * ```
 */

import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import type { CorpusDoc } from "@/lib/corpus";
import { fetchCorpusDoc } from "@/lib/corpusActions";

// ============================================================================
// Types
// ============================================================================

export interface CorpusDocData {
  doc: CorpusDoc;
  content: string;
}

export interface UseCorpusDocOptions
  extends Omit<
    UseQueryOptions<CorpusDocData, Error, CorpusDocData, readonly ["corpus", "doc", string]>,
    "queryKey" | "queryFn"
  > {
  /** Document ID (e.g., "transcript", "distillation-opus-45") */
  id: string;
}

// ============================================================================
// Query Key Factory
// ============================================================================

/**
 * Query key factory for corpus documents.
 * Using a factory pattern enables type-safe key generation and invalidation.
 */
export const corpusDocKeys = {
  all: ["corpus", "doc"] as const,
  detail: (id: string) => ["corpus", "doc", id] as const,
};

// ============================================================================
// Hook
// ============================================================================

/**
 * Fetch and cache a single corpus document.
 *
 * Features:
 * - Automatic caching (5 min stale, 30 min gc)
 * - Type-safe return value
 * - Built-in loading/error states
 * - Deduplication of concurrent requests
 *
 * @param id - Document ID from CORPUS_DOCS
 * @param options - Additional TanStack Query options
 * @returns Query result with doc metadata and content
 */
export function useCorpusDoc(id: string, options?: Omit<UseCorpusDocOptions, "id">) {
  // User can only make enabled MORE restrictive, not less
  const userEnabled = options?.enabled ?? true;

  return useQuery({
    // User options first (as defaults)
    ...options,
    // Required settings that must not be overridden
    queryKey: corpusDocKeys.detail(id),
    queryFn: () => fetchCorpusDoc(id),
    // Enable query only if id is provided AND user hasn't disabled
    enabled: Boolean(id) && userEnabled,
  });
}

/**
 * Prefetch a corpus document for faster navigation.
 * Call this in advance to populate the cache.
 *
 * @example
 * ```tsx
 * // In a list component
 * const queryClient = useQueryClient();
 * const handleHover = (id: string) => {
 *   prefetchCorpusDoc(queryClient, id);
 * };
 * ```
 */
export async function prefetchCorpusDoc(
  queryClient: import("@tanstack/react-query").QueryClient,
  id: string,
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: corpusDocKeys.detail(id),
    queryFn: () => fetchCorpusDoc(id),
  });
}
