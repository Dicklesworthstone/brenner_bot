"use server";

/**
 * Server Action for Global Search
 *
 * This file contains the server-side search implementation that handles
 * file system access. It's used by the client-side SpotlightSearch component.
 */

import {
  type GlobalSearchResult,
  globalSearch as performSearch,
  type SearchCategory,
  warmIndex,
} from "./globalSearch";

export async function searchAction(
  query: string,
  options?: {
    limit?: number;
    category?: SearchCategory;
    model?: "gpt" | "opus" | "gemini";
  },
): Promise<GlobalSearchResult> {
  return performSearch(query, options);
}

export async function warmSearchIndex(): Promise<void> {
  await warmIndex();
}
