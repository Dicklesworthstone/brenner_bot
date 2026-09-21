/**
 * Quote matching helpers for Brenner semantic search.
 *
 * Converts embedded quote entries from `embeddings.json` into `Quote` objects
 * and provides lightweight helpers to build queries and filter candidates.
 *
 * Extended with operator-aware matching (bead brenner_bot-v2zy) to rank
 * quotes by relevance to the current operator context.
 *
 * @see brenner_bot-v2zy (Operator-aware Quote Matching)
 * @see brenner_bot-ukd1 (Semantic Search EPIC)
 */

import type { Quote } from "@/lib/quotebank-parser";
import type { HypothesisCard } from "../hypothesis";
import type { OperatorType } from "../operators/framework";
import { type EmbeddingEntry, findSimilar } from "./embeddings";

// ============================================================================
// Parsing / conversion
// ============================================================================

function parseEmbeddedQuoteText(text: string): Pick<Quote, "quote" | "context" | "tags"> {
  const tags: string[] = [];
  const tagsLine = text.match(/^Tags:\s*(.+)$/m)?.[1];
  if (tagsLine) {
    for (const match of tagsLine.matchAll(/`([^`]+)`/g)) {
      const tag = match[1]?.trim();
      if (tag && !tags.includes(tag)) tags.push(tag);
    }
  }

  const contextMatch = text.match(/(?:Takeaway|Why it matters):\s*([\s\S]*?)(?:\n\s*Tags:|$)/m);
  const context = contextMatch?.[1]?.trim().replace(/\s+/g, " ") ?? "";

  const quote =
    text
      .split(/\n(?:Takeaway|Why it matters):/i)[0]
      ?.trim()
      .replace(/\s+/g, " ") ?? "";

  return { quote, context, tags };
}

function titleCaseFromTag(tag: string): string {
  return tag
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => (word.length > 0 ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}

export function embeddingEntryToQuote(entry: EmbeddingEntry): Quote {
  const sectionId = typeof entry.section === "number" ? `§${entry.section}` : "§?";
  const parsed = parseEmbeddedQuoteText(entry.text);
  const title = parsed.tags.length > 0 ? titleCaseFromTag(parsed.tags[0]!) : "Quote Bank";

  return {
    sectionId,
    title,
    quote: parsed.quote,
    context: parsed.context,
    tags: parsed.tags,
  };
}

// ============================================================================
// Query helpers
// ============================================================================

export function buildQuoteQueryText(parts: Array<string | undefined | null>): string {
  return parts
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("\n");
}

export function filterQuoteEntriesByTags(
  entries: EmbeddingEntry[],
  tags: string[],
): EmbeddingEntry[] {
  const normalizedTags = tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
  if (normalizedTags.length === 0) return entries;

  const tagged = entries.filter((entry) =>
    normalizedTags.some((tag) => entry.text.includes(`\`${tag}\``)),
  );

  return tagged.length > 0 ? tagged : entries;
}

export function findSimilarQuotes(
  query: string,
  entries: EmbeddingEntry[],
  topK: number = 3,
): Quote[] {
  return findSimilar(query, entries, topK).map(embeddingEntryToQuote);
}

// ============================================================================
// Operator-Aware Quote Matching (bead brenner_bot-v2zy)
// ============================================================================

/**
 * A quote ranked by both semantic similarity and operator relevance.
 */
export interface RankedQuote extends Quote {
  /** Semantic similarity score (0-1, from embeddings) */
  semanticScore: number;

  /** Operator relevance score (0-1, from keyword matching) */
  operatorRelevance: number;

  /** Combined score for final ranking */
  combinedScore: number;
}

/**
 * Keywords and phrases that indicate relevance to each operator.
 * Quotes containing these terms score higher when that operator is active.
 */
export const OPERATOR_QUOTE_KEYWORDS: Record<OperatorType, string[]> = {
  level_split: [
    "level",
    "levels",
    "conflat",
    "program",
    "interpreter",
    "mechanism",
    "implementation",
    "substrate",
    "abstraction",
    "separate",
    "distinguish",
    "hierarchy",
    "layer",
    "software",
    "hardware",
    "algorithm",
    "computation",
    "functional",
    "physical",
    "description",
    "explanation",
    "top-down",
    "bottom-up",
    "emergence",
    "reduction",
  ],
  exclusion_test: [
    "test",
    "exclude",
    "exclusion",
    "discriminat",
    "falsif",
    "rule out",
    "ruling out",
    "eliminate",
    "predict",
    "observation",
    "experiment",
    "evidence",
    "potency",
    "control",
    "benchmark",
    "positive control",
    "negative control",
    "diagnostic",
    "critical experiment",
    "crucial experiment",
    "hypothesis",
    "alternative",
    "differential diagnosis",
  ],
  object_transpose: [
    "object",
    "transpose",
    "system",
    "model",
    "organism",
    "experimental system",
    "approach",
    "assay",
    "method",
    "zebrafish",
    "drosophila",
    "c. elegans",
    "mouse",
    "yeast",
    "in vitro",
    "in vivo",
    "cell culture",
    "organoid",
    "invariant",
    "transfer",
    "translate",
    "generalize",
    "conserve",
    "homolog",
    "analog",
    "parallel",
  ],
  scale_check: [
    "scale",
    "order of magnitude",
    "dimensional",
    "unit",
    "calculation",
    "estimate",
    "plausib",
    "feasib",
    "energy",
    "time",
    "size",
    "concentration",
    "rate",
    "physics",
    "thermodynamic",
    "kinetic",
    "diffusion",
    "constraint",
    "limit",
    "bound",
    "maximum",
    "minimum",
    "back of envelope",
    "rough calculation",
    "sanity check",
  ],
};

/**
 * Compute how relevant a quote is to a specific operator context.
 *
 * Scores are based on keyword matching - quotes that discuss concepts
 * relevant to the operator (e.g., "levels" for level_split) rank higher.
 *
 * @param quote - The quote to score
 * @param operator - The current operator context
 * @returns Score from 0 to 1
 */
export function computeOperatorRelevance(quote: Quote, operator: OperatorType): number {
  const keywords = OPERATOR_QUOTE_KEYWORDS[operator];
  if (!keywords || keywords.length === 0) return 0;

  // Combine quote text and context for analysis
  const textToAnalyze = `${quote.quote} ${quote.context || ""}`.toLowerCase();

  // Count keyword matches (partial matching for stems like "conflat" -> "conflation")
  let matchCount = 0;
  for (const keyword of keywords) {
    if (textToAnalyze.includes(keyword.toLowerCase())) {
      matchCount++;
    }
  }

  // Normalize by keyword count, with diminishing returns
  // 1 match = 0.3, 2 = 0.5, 3 = 0.65, 4+ = 0.75-0.95
  if (matchCount === 0) return 0;
  if (matchCount === 1) return 0.3;
  if (matchCount === 2) return 0.5;
  if (matchCount === 3) return 0.65;

  // Diminishing returns for 4+, max out at 0.95
  return Math.min(0.95, 0.65 + (matchCount - 3) * 0.1);
}

/**
 * Find quotes relevant to a hypothesis in a specific operator context.
 *
 * This combines:
 * 1. Semantic similarity (from embeddings)
 * 2. Operator relevance (from keyword matching)
 *
 * Quotes are ranked by a weighted combination of both scores.
 *
 * @param hypothesis - The hypothesis being analyzed
 * @param operator - The current operator (level_split, exclusion_test, etc.)
 * @param entries - The embedding entries to search
 * @param options - Configuration options
 * @returns Ranked quotes sorted by combined score
 */
export function findRelevantQuotes(
  hypothesis: HypothesisCard,
  operator: OperatorType,
  entries: EmbeddingEntry[],
  options: {
    /** How many candidate quotes to consider (default: 20) */
    candidateLimit?: number;
    /** How many results to return (default: 5) */
    resultLimit?: number;
    /** Weight for semantic score vs operator relevance (default: 0.6) */
    semanticWeight?: number;
  } = {},
): RankedQuote[] {
  const { candidateLimit = 20, resultLimit = 5, semanticWeight = 0.6 } = options;

  // Build query from hypothesis context
  const queryText = buildQuoteQueryText([
    hypothesis.statement,
    hypothesis.mechanism,
    ...(hypothesis.predictionsIfTrue || []),
  ]);

  if (!queryText || entries.length === 0) {
    return [];
  }

  // Get semantic candidates (more than we need, to allow reranking)
  const candidates = findSimilar(queryText, entries, candidateLimit);

  // Convert and score each candidate
  const rankedQuotes: RankedQuote[] = candidates.map((entry, index) => {
    const quote = embeddingEntryToQuote(entry);

    // Semantic score: inversely proportional to rank (top result = 1.0)
    const semanticScore = 1 - index / candidateLimit;

    // Operator relevance from keyword matching
    const operatorRelevance = computeOperatorRelevance(quote, operator);

    // Combined score with configurable weighting
    const operatorWeight = 1 - semanticWeight;
    const combinedScore = semanticScore * semanticWeight + operatorRelevance * operatorWeight;

    return {
      ...quote,
      semanticScore,
      operatorRelevance,
      combinedScore,
    };
  });

  // Sort by combined score and return top results
  return rankedQuotes.sort((a, b) => b.combinedScore - a.combinedScore).slice(0, resultLimit);
}

/**
 * Get quotes relevant to a specific operator (without hypothesis context).
 *
 * Useful for showing "example quotes" or "Brenner says about level split..."
 *
 * @param operator - The operator to find quotes for
 * @param entries - The embedding entries to search
 * @param limit - How many quotes to return (default: 5)
 * @returns Quotes ranked by operator relevance
 */
export function getOperatorQuotes(
  operator: OperatorType,
  entries: EmbeddingEntry[],
  limit: number = 5,
): RankedQuote[] {
  // Score all entries by operator relevance
  const scored: RankedQuote[] = entries.map((entry) => {
    const quote = embeddingEntryToQuote(entry);
    const operatorRelevance = computeOperatorRelevance(quote, operator);

    return {
      ...quote,
      semanticScore: 0, // Not using semantic search
      operatorRelevance,
      combinedScore: operatorRelevance,
    };
  });

  // Return top matches
  return scored
    .filter((q) => q.operatorRelevance > 0)
    .sort((a, b) => b.operatorRelevance - a.operatorRelevance)
    .slice(0, limit);
}
