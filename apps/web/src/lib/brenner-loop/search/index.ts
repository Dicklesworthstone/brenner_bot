/**
 * Search Module Index
 *
 * Re-exports public APIs for semantic search and similarity functions.
 *
 * @module brenner-loop/search
 */

// Embeddings
export {
  cosineSimilarity,
  EMBEDDING_DIMENSION,
  embedText,
} from "./embeddings";

// Hypothesis Similarity
export {
  cardToIndexed,
  clusterSimilarHypotheses,
  // Similarity computation
  computeSimilarity,
  // Domain similarity
  domainSimilarity,
  embedHypothesis,
  findDuplicates,
  // Search functions
  findSimilarHypotheses,
  getSimilarityStats,
  // Embedding helpers
  hypothesisToSearchText,
  // Types
  type IndexedHypothesis,
  type SimilarityMatch,
  type SimilaritySearchConfig,
  searchHypothesesByText,
  // Storage integration
  storageToIndexed,
  storageToIndexedBatch,
} from "./hypothesis-similarity";

// Quote matching
export {
  buildQuoteQueryText,
  computeOperatorRelevance,
  embeddingEntryToQuote,
  filterQuoteEntriesByTags,
  findRelevantQuotes,
  findSimilarQuotes,
  getOperatorQuotes,
  OPERATOR_QUOTE_KEYWORDS,
  // Operator-aware quote matching (bead brenner_bot-v2zy)
  type RankedQuote,
} from "./quote-matcher";
