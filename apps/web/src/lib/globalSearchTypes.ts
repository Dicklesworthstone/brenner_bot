/**
 * Global Search Types
 *
 * Shared types for the global search functionality.
 * This file contains no Node.js imports so it can be used in client components.
 *
 * SYNC NOTE: DocCategory is also defined in corpus.ts. If you modify one,
 * you must update the other to keep them in sync. The duplication exists
 * because corpus.ts uses Node.js APIs and cannot be imported in client code.
 */

export type DocCategory =
  | "transcript"
  | "quote-bank"
  | "distillation"
  | "metaprompt"
  | "raw-response";
export type SearchCategory = DocCategory | "all";

export interface GlobalSearchHit {
  id: string;
  docId: string;
  docTitle: string;
  category: DocCategory;
  model?: "gpt" | "opus" | "gemini";
  title: string;
  snippet: string;
  score: number;
  matchType: "title" | "body" | "both";
  anchor?: string;
  url: string;
  highlights: string[];
}

export interface GlobalSearchResult {
  query: string;
  hits: GlobalSearchHit[];
  totalMatches: number;
  searchTimeMs: number;
  categories: Record<DocCategory, number>;
}

/**
 * Get category display info (for use in client components).
 */
export function getCategoryInfo(category: DocCategory): {
  label: string;
  icon: string;
  color: string;
} {
  switch (category) {
    case "transcript":
      return { label: "Transcript", icon: "scroll", color: "primary" };
    case "quote-bank":
      return { label: "Quote Bank", icon: "quote", color: "amber" };
    case "distillation":
      return { label: "Distillation", icon: "sparkles", color: "purple" };
    case "metaprompt":
      return { label: "Metaprompt", icon: "terminal", color: "emerald" };
    case "raw-response":
      return { label: "Raw Response", icon: "file-text", color: "slate" };
  }
}
