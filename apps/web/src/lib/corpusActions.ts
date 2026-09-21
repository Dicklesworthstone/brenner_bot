"use server";

/**
 * Server Actions for Corpus Operations
 *
 * This file provides server-side access to corpus data.
 * The corpus functions use Node.js file system APIs and must run on the server.
 * These actions are consumed by the TanStack Query hooks in @/hooks/queries.
 */

import { type CorpusDoc, listCorpusDocs, readCorpusDoc } from "./corpus";

/**
 * Fetch the list of all corpus documents.
 * Returns metadata only (no content).
 */
export async function fetchCorpusList(): Promise<CorpusDoc[]> {
  return listCorpusDocs();
}

/**
 * Fetch a single corpus document by ID.
 * Returns both metadata and full content.
 */
export async function fetchCorpusDoc(id: string): Promise<{ doc: CorpusDoc; content: string }> {
  return readCorpusDoc(id);
}

/**
 * Fetch multiple corpus documents by ID.
 * Useful for prefetching or batch loading.
 */
export async function fetchCorpusDocs(
  ids: string[],
): Promise<{ doc: CorpusDoc; content: string }[]> {
  return Promise.all(ids.map((id) => readCorpusDoc(id)));
}
