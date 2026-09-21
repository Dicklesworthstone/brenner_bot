/**
 * Hypothesis Similarity Search
 *
 * Finds similar hypotheses across sessions using semantic embeddings.
 * Helps users discover related past work, identify duplicates, and
 * surface relevant prior research.
 *
 * Uses the existing hash-based embedding infrastructure for client-side
 * similarity computation without external API calls.
 *
 * @see brenner_bot-c2u8 (bead)
 * @see brenner_bot-ukd1 (parent epic: Semantic Search & Intelligence)
 * @module brenner-loop/search/hypothesis-similarity
 */

import type { Hypothesis } from "../../schemas/hypothesis";
import type { HypothesisCard } from "../hypothesis";
import { cosineSimilarity, EMBEDDING_DIMENSION, embedText } from "./embeddings";

// ============================================================================
// Types
// ============================================================================

/**
 * Lightweight hypothesis representation for similarity indexing.
 * Contains only the fields needed for embedding and display.
 */
export interface IndexedHypothesis {
  /** Unique hypothesis ID */
  id: string;

  /** Session this hypothesis belongs to */
  sessionId: string;

  /** The hypothesis statement */
  statement: string;

  /** The proposed mechanism */
  mechanism: string;

  /** Research domains */
  domain: string[];

  /** Confidence level (0-100) */
  confidence: number;

  /** Version number */
  version: number;

  /** Pre-computed embedding vector */
  embedding?: number[];

  /** Optional timestamp for recency weighting */
  createdAt?: string;
}

/**
 * Result of a similarity search.
 */
export interface SimilarityMatch {
  /** The matched hypothesis */
  hypothesis: IndexedHypothesis;

  /** Overall similarity score (0-1) */
  score: number;

  /** Breakdown of similarity components */
  breakdown: {
    /** Statement similarity (0-1) */
    statement: number;
    /** Mechanism similarity (0-1) */
    mechanism: number;
    /** Domain overlap (0-1) */
    domain: number;
    /** Combined content similarity (0-1) */
    content: number;
  };

  /** Why this match is relevant */
  reason: string;
}

/**
 * Configuration for similarity search.
 */
export interface SimilaritySearchConfig {
  /** Minimum similarity score to include (0-1, default: 0.3) */
  minScore?: number;

  /** Maximum results to return (default: 10) */
  maxResults?: number;

  /** Weight for statement similarity (default: 0.5) */
  statementWeight?: number;

  /** Weight for mechanism similarity (default: 0.3) */
  mechanismWeight?: number;

  /** Weight for domain overlap (default: 0.2) */
  domainWeight?: number;

  /** Whether to exclude the query hypothesis from results */
  excludeQuery?: boolean;

  /** Filter by specific session IDs */
  sessionFilter?: string[];

  /** Filter by minimum confidence level */
  minConfidence?: number;
}

// ============================================================================
// Embedding Helpers
// ============================================================================

/**
 * Create a searchable text representation of a hypothesis.
 * Combines statement, mechanism, and domains for comprehensive matching.
 */
export function hypothesisToSearchText(hypothesis: IndexedHypothesis): string {
  const parts: string[] = [];

  if (hypothesis.statement) {
    parts.push(hypothesis.statement);
  }

  if (hypothesis.mechanism) {
    parts.push(hypothesis.mechanism);
  }

  if (hypothesis.domain && hypothesis.domain.length > 0) {
    parts.push(hypothesis.domain.join(" "));
  }

  return parts.join("\n");
}

/**
 * Compute embedding for a hypothesis.
 * Caches the result on the hypothesis object for reuse.
 */
export function embedHypothesis(hypothesis: IndexedHypothesis): number[] {
  if (hypothesis.embedding) {
    return hypothesis.embedding;
  }

  const text = hypothesisToSearchText(hypothesis);
  const embedding = embedText(text, EMBEDDING_DIMENSION);
  hypothesis.embedding = embedding;
  return embedding;
}

/**
 * Convert a HypothesisCard to IndexedHypothesis for similarity search.
 *
 * Handles both fresh HypothesisCard objects (where createdAt is a Date)
 * and deserialized objects from JSON (where createdAt is an ISO string).
 */
export function cardToIndexed(card: HypothesisCard, sessionId?: string): IndexedHypothesis {
  // Handle both Date objects and ISO strings (from JSON deserialization)
  let createdAtStr: string | undefined;
  if (card.createdAt instanceof Date) {
    createdAtStr = card.createdAt.toISOString();
  } else if (typeof card.createdAt === "string") {
    createdAtStr = card.createdAt;
  }

  return {
    id: card.id,
    sessionId: sessionId ?? card.sessionId ?? "unknown",
    statement: card.statement,
    mechanism: card.mechanism,
    domain: card.domain,
    confidence: card.confidence,
    version: card.version,
    createdAt: createdAtStr,
  };
}

// ============================================================================
// Domain Similarity
// ============================================================================

/**
 * Compute domain overlap between two hypotheses.
 * Uses Jaccard similarity for set overlap.
 */
export function domainSimilarity(domains1: string[], domains2: string[]): number {
  if (domains1.length === 0 && domains2.length === 0) {
    return 1.0; // Both empty = same (generic)
  }

  if (domains1.length === 0 || domains2.length === 0) {
    return 0.5; // One empty = partial match
  }

  const set1 = new Set(domains1.map((d) => d.toLowerCase()));
  const set2 = new Set(domains2.map((d) => d.toLowerCase()));

  let intersection = 0;
  for (const d of set1) {
    if (set2.has(d)) {
      intersection++;
    }
  }

  const union = set1.size + set2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// ============================================================================
// Similarity Computation
// ============================================================================

const DEFAULT_CONFIG: Required<SimilaritySearchConfig> = {
  minScore: 0.3,
  maxResults: 10,
  statementWeight: 0.5,
  mechanismWeight: 0.3,
  domainWeight: 0.2,
  excludeQuery: true,
  sessionFilter: [],
  minConfidence: 0,
};

/**
 * Compute similarity between two hypotheses.
 */
export function computeSimilarity(
  query: IndexedHypothesis,
  candidate: IndexedHypothesis,
  config: SimilaritySearchConfig = {},
): SimilarityMatch {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Compute individual similarities
  const queryStatementEmbed = embedText(query.statement, EMBEDDING_DIMENSION);
  const candidateStatementEmbed = embedText(candidate.statement, EMBEDDING_DIMENSION);
  const statementSim = cosineSimilarity(queryStatementEmbed, candidateStatementEmbed);

  const queryMechEmbed = embedText(query.mechanism || "", EMBEDDING_DIMENSION);
  const candidateMechEmbed = embedText(candidate.mechanism || "", EMBEDDING_DIMENSION);
  const mechanismSim =
    query.mechanism && candidate.mechanism
      ? cosineSimilarity(queryMechEmbed, candidateMechEmbed)
      : 0;

  const domainSim = domainSimilarity(query.domain, candidate.domain);

  // Full content similarity (for combined signal)
  const queryEmbed = embedHypothesis(query);
  const candidateEmbed = embedHypothesis(candidate);
  const contentSim = cosineSimilarity(queryEmbed, candidateEmbed);

  // Weighted score
  const score =
    cfg.statementWeight * statementSim +
    cfg.mechanismWeight * mechanismSim +
    cfg.domainWeight * domainSim;

  // Generate reason
  const reasons: string[] = [];
  if (statementSim > 0.6) {
    reasons.push("similar statement");
  }
  if (mechanismSim > 0.5) {
    reasons.push("related mechanism");
  }
  if (domainSim > 0.5) {
    reasons.push("overlapping domains");
  }
  if (reasons.length === 0 && score > 0.3) {
    reasons.push("general similarity");
  }

  return {
    hypothesis: candidate,
    score,
    breakdown: {
      statement: statementSim,
      mechanism: mechanismSim,
      domain: domainSim,
      content: contentSim,
    },
    reason: reasons.join(", ") || "weak match",
  };
}

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Find hypotheses similar to a query hypothesis.
 *
 * @param query - The hypothesis to find similar matches for
 * @param candidates - Pool of hypotheses to search
 * @param config - Search configuration
 * @returns Sorted array of similar hypotheses
 */
export function findSimilarHypotheses(
  query: IndexedHypothesis,
  candidates: IndexedHypothesis[],
  config: SimilaritySearchConfig = {},
): SimilarityMatch[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Filter candidates
  let filtered = candidates;

  if (cfg.excludeQuery) {
    filtered = filtered.filter((c) => c.id !== query.id);
  }

  if (cfg.sessionFilter && cfg.sessionFilter.length > 0) {
    const sessionSet = new Set(cfg.sessionFilter);
    filtered = filtered.filter((c) => sessionSet.has(c.sessionId));
  }

  if (cfg.minConfidence > 0) {
    filtered = filtered.filter((c) => c.confidence >= cfg.minConfidence);
  }

  // Compute similarities
  const matches = filtered.map((candidate) => computeSimilarity(query, candidate, cfg));

  // Filter by minimum score and sort
  return matches
    .filter((m) => m.score >= cfg.minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, cfg.maxResults);
}

/**
 * Find hypotheses similar to a free-text query.
 *
 * @param queryText - Free-form text to match against
 * @param candidates - Pool of hypotheses to search
 * @param config - Search configuration
 * @returns Sorted array of matching hypotheses
 */
export function searchHypothesesByText(
  queryText: string,
  candidates: IndexedHypothesis[],
  config: SimilaritySearchConfig = {},
): SimilarityMatch[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Create a pseudo-hypothesis from the query text
  const queryHypothesis: IndexedHypothesis = {
    id: "__query__",
    sessionId: "__search__",
    statement: queryText,
    mechanism: "",
    domain: [],
    confidence: 0,
    version: 0,
  };

  // Use statementWeight only for text search
  const textConfig = {
    ...cfg,
    statementWeight: 1.0,
    mechanismWeight: 0,
    domainWeight: 0,
    excludeQuery: false,
  };

  return findSimilarHypotheses(queryHypothesis, candidates, textConfig);
}

/**
 * Group similar hypotheses into clusters.
 *
 * @param hypotheses - Hypotheses to cluster
 * @param threshold - Similarity threshold for same cluster (default: 0.5)
 * @returns Array of clusters, each containing similar hypotheses
 */
export function clusterSimilarHypotheses(
  hypotheses: IndexedHypothesis[],
  threshold: number = 0.5,
): IndexedHypothesis[][] {
  if (hypotheses.length === 0) return [];

  const clusters: IndexedHypothesis[][] = [];
  const assigned = new Set<string>();

  for (const hypothesis of hypotheses) {
    if (assigned.has(hypothesis.id)) continue;

    // Start new cluster with this hypothesis
    const cluster = [hypothesis];
    assigned.add(hypothesis.id);

    // Find all similar hypotheses
    const similar = findSimilarHypotheses(hypothesis, hypotheses, {
      minScore: threshold,
      excludeQuery: true,
      maxResults: 100,
    });

    for (const match of similar) {
      if (!assigned.has(match.hypothesis.id)) {
        cluster.push(match.hypothesis);
        assigned.add(match.hypothesis.id);
      }
    }

    clusters.push(cluster);
  }

  // Sort clusters by size (largest first)
  return clusters.sort((a, b) => b.length - a.length);
}

/**
 * Find potential duplicate hypotheses.
 * Returns pairs of hypotheses that are very similar.
 *
 * @param hypotheses - Hypotheses to check for duplicates
 * @param threshold - Similarity threshold for duplicate (default: 0.8)
 * @returns Array of duplicate pairs with similarity scores
 */
export function findDuplicates(
  hypotheses: IndexedHypothesis[],
  threshold: number = 0.8,
): Array<{ pair: [IndexedHypothesis, IndexedHypothesis]; score: number }> {
  const duplicates: Array<{
    pair: [IndexedHypothesis, IndexedHypothesis];
    score: number;
  }> = [];

  const seen = new Set<string>();

  for (let i = 0; i < hypotheses.length; i++) {
    const h1 = hypotheses[i];
    if (!h1) continue;

    const similar = findSimilarHypotheses(h1, hypotheses.slice(i + 1), {
      minScore: threshold,
      excludeQuery: true,
      maxResults: 100,
    });

    for (const match of similar) {
      const pairKey = [h1.id, match.hypothesis.id].sort().join(":");
      if (!seen.has(pairKey)) {
        seen.add(pairKey);
        duplicates.push({
          pair: [h1, match.hypothesis],
          score: match.score,
        });
      }
    }
  }

  return duplicates.sort((a, b) => b.score - a.score);
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get statistics about hypothesis similarity in a collection.
 */
export function getSimilarityStats(hypotheses: IndexedHypothesis[]): {
  totalHypotheses: number;
  clusterCount: number;
  averageClusterSize: number;
  potentialDuplicates: number;
  domainDistribution: Record<string, number>;
} {
  const clusters = clusterSimilarHypotheses(hypotheses, 0.5);
  const duplicates = findDuplicates(hypotheses, 0.8);

  const domainDistribution: Record<string, number> = {};
  for (const h of hypotheses) {
    for (const domain of h.domain) {
      domainDistribution[domain] = (domainDistribution[domain] || 0) + 1;
    }
  }

  return {
    totalHypotheses: hypotheses.length,
    clusterCount: clusters.length,
    averageClusterSize: clusters.length > 0 ? hypotheses.length / clusters.length : 0,
    potentialDuplicates: duplicates.length,
    domainDistribution,
  };
}

// ============================================================================
// Storage Integration
// ============================================================================

/**
 * Confidence level to numeric mapping for IndexedHypothesis.
 */
const CONFIDENCE_MAP: Record<string, number> = {
  high: 90,
  medium: 60,
  low: 30,
  speculative: 10,
};

/**
 * Convert a storage Hypothesis to IndexedHypothesis for similarity search.
 *
 * The storage schema uses:
 * - tags[] as domains
 * - confidence enum ("high"|"medium"|"low"|"speculative") -> numeric
 * - version is not tracked, defaults to 1
 */
export function storageToIndexed(hypothesis: Hypothesis): IndexedHypothesis {
  return {
    id: hypothesis.id,
    sessionId: hypothesis.sessionId,
    statement: hypothesis.statement,
    mechanism: hypothesis.mechanism ?? "",
    domain: hypothesis.tags ?? [],
    confidence: CONFIDENCE_MAP[hypothesis.confidence] ?? 50,
    version: 1, // Storage doesn't track versions
    createdAt: hypothesis.createdAt,
  };
}

/**
 * Convert multiple storage hypotheses to IndexedHypothesis format.
 */
export function storageToIndexedBatch(hypotheses: Hypothesis[]): IndexedHypothesis[] {
  return hypotheses.map(storageToIndexed);
}
