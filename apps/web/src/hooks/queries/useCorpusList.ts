"use client";

/**
 * useCorpusList - Query Hook for Corpus Document List
 *
 * Fetches and caches the list of all corpus documents.
 * Returns metadata only (no content) for fast listing.
 *
 * @example
 * ```tsx
 * function CorpusBrowser() {
 *   const { data: docs, isLoading } = useCorpusList();
 *
 *   if (isLoading) return <Skeleton count={10} />;
 *
 *   return (
 *     <ul>
 *       {docs?.map((doc) => (
 *         <li key={doc.id}>{doc.title}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */

import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import type { CorpusDoc, DocCategory } from "@/lib/corpus";
import { fetchCorpusList } from "@/lib/corpusActions";

// ============================================================================
// Types
// ============================================================================

export interface UseCorpusListOptions
  extends Omit<
    UseQueryOptions<CorpusDoc[], Error, CorpusDoc[], readonly ["corpus", "list"]>,
    "queryKey" | "queryFn" | "select"
  > {
  /** Filter by category (optional) */
  category?: DocCategory;
  /** Filter by model (optional) */
  model?: "gpt" | "opus" | "gemini";
}

// ============================================================================
// Query Key Factory
// ============================================================================

/**
 * Query key factory for corpus list.
 */
export const corpusListKeys = {
  all: ["corpus", "list"] as const,
  filtered: (filters: { category?: DocCategory; model?: "gpt" | "opus" | "gemini" }) =>
    ["corpus", "list", filters] as const,
};

// ============================================================================
// Hook
// ============================================================================

/**
 * Fetch and cache the corpus document list.
 *
 * Features:
 * - Automatic caching (list changes rarely - 10 min stale)
 * - Optional client-side filtering by category/model
 * - Type-safe CorpusDoc[] return
 *
 * @param options - Query options including optional filters
 * @returns Query result with array of corpus documents
 */
export function useCorpusList(options?: UseCorpusListOptions) {
  const { category, model, ...queryOptions } = options ?? {};

  return useQuery({
    // User options first (can be overridden by our required settings)
    ...queryOptions,
    // Required settings that should not be overridden
    queryKey: corpusListKeys.all,
    queryFn: fetchCorpusList,
    // List changes less frequently than individual docs
    staleTime: queryOptions?.staleTime ?? 10 * 60 * 1000, // 10 minutes default
    // Apply client-side filtering via select (not user-overridable)
    select: (data) => {
      let filtered = data;
      if (category) {
        filtered = filtered.filter((doc) => doc.category === category);
      }
      if (model) {
        filtered = filtered.filter((doc) => doc.model === model);
      }
      return filtered;
    },
  });
}

/**
 * Get documents grouped by category.
 *
 * @example
 * ```tsx
 * const { data: grouped } = useCorpusListGrouped();
 * // grouped.transcript, grouped.distillation, etc.
 * ```
 */
export function useCorpusListGrouped() {
  return useQuery({
    queryKey: corpusListKeys.all,
    queryFn: fetchCorpusList,
    staleTime: 10 * 60 * 1000,
    select: (data) => {
      const grouped: Record<DocCategory, CorpusDoc[]> = {
        transcript: [],
        "quote-bank": [],
        distillation: [],
        metaprompt: [],
        "raw-response": [],
      };
      for (const doc of data) {
        grouped[doc.category].push(doc);
      }
      return grouped;
    },
  });
}

/**
 * Prefetch the corpus list for faster page loads.
 */
export async function prefetchCorpusList(
  queryClient: import("@tanstack/react-query").QueryClient,
): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: corpusListKeys.all,
    queryFn: fetchCorpusList,
  });
}
