/**
 * Local-first embeddings utilities for Brenner semantic search.
 *
 * Uses a deterministic hashing-based embedding to avoid external API calls.
 * This provides a baseline semantic signal suitable for client-side similarity search.
 *
 * @see brenner_bot-ukd1.1 (Vector Embeddings for Brenner Corpus)
 */

// ============================================================================
// Types
// ============================================================================

export type EmbeddingSource = "transcript" | "distillation" | "quote" | "operator";

export interface EmbeddingEntry {
  id: string;
  text: string;
  section?: number;
  source: EmbeddingSource;
  embedding: number[];
}

export interface EmbeddingIndex {
  version: number;
  dimension: number;
  entries: EmbeddingEntry[];
}

export interface EmbeddingMatch extends EmbeddingEntry {
  score: number;
}

// ============================================================================
// Constants
// ============================================================================

export const EMBEDDING_DIMENSION = 384;
export const EMBEDDING_INDEX_VERSION = 1;

const TOKEN_MIN_LENGTH = 2;
const TOKEN_MAX_LENGTH = 48;

// ============================================================================
// Public API
// ============================================================================

export function embedText(text: string, dimension: number = EMBEDDING_DIMENSION): number[] {
  const tokens = tokenize(text);
  const vector = new Array<number>(dimension).fill(0);

  for (const token of tokens) {
    const hash = fnv1a(token);
    const index = hash % dimension;
    const sign = (hash & 1) === 0 ? 1 : -1;
    vector[index] += sign;
  }

  return normalizeVector(vector);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embedding vectors must have matching dimensions.");
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    const av = a[i];
    const bv = b[i];
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / Math.sqrt(normA * normB);
}

export function findSimilar(
  query: string | number[],
  entries: EmbeddingEntry[],
  topK: number = 5,
): EmbeddingMatch[] {
  const queryEmbedding = Array.isArray(query) ? query : embedText(query);

  const scored = entries.map((entry) => ({
    ...entry,
    score: cosineSimilarity(queryEmbedding, entry.embedding),
  }));

  return scored.sort((a, b) => b.score - a.score).slice(0, Math.max(topK, 1));
}

export async function loadEmbeddings(url: string = "/embeddings.json"): Promise<EmbeddingIndex> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load embeddings: ${response.status}`);
  }
  return (await response.json()) as EmbeddingIndex;
}

// ============================================================================
// Helpers
// ============================================================================

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= TOKEN_MIN_LENGTH && token.length <= TOKEN_MAX_LENGTH);
}

function normalizeVector(vector: number[]): number[] {
  let norm = 0;
  for (const value of vector) {
    norm += value * value;
  }

  if (norm === 0) return vector;
  const scale = 1 / Math.sqrt(norm);
  return vector.map((value) => value * scale);
}

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
