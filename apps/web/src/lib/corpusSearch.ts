/**
 * Corpus Search API
 *
 * Implements runtime parsing with in-memory search following
 * search_approach_decision_v0.1.md.
 */

import { readCorpusDoc } from "./corpus";
import { parseTranscript, type Section } from "./transcriptParser";

// ============================================================================
// Types
// ============================================================================

export interface SearchHit {
  id: string; // Section ID: "transcript:§42"
  anchor: string; // Display anchor: "§42"
  title: string; // Section title
  snippet: string; // Highlighted excerpt (max ~200 chars)
  score: number; // Relevance score (0-1)
  matchType: "title" | "body" | "both";
  wordCount: number; // Section word count for context
}

export interface SearchResult {
  query: string;
  hits: SearchHit[];
  totalMatches: number;
  searchTimeMs: number;
  loadTimeMs?: number;
}

/**
 * Internal enriched section for faster search.
 */
interface EnrichedSection extends Section {
  lowerTitle: string;
  lowerPlainText: string;
}

// ============================================================================
// Section Loading
// ============================================================================

let sectionsCache: EnrichedSection[] | null = null;
let cacheTimestamp: number | null = null;
let loadPromise: Promise<EnrichedSection[]> | null = null;

/**
 * Load all transcript sections from the corpus.
 *
 * Uses a promise lock to prevent thundering herd race conditions.
 * Caches in-memory for repeated server-side calls.
 *
 * @returns Promise resolving to array of enriched sections
 */
async function loadSections(): Promise<EnrichedSection[]> {
  if (sectionsCache) return sectionsCache;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const { content } = await readCorpusDoc("transcript");
      const { sections } = parseTranscript(content);

      // Pre-compute lowercase strings for search optimization
      const enriched = sections.map((s) => ({
        ...s,
        lowerTitle: s.title.toLowerCase(),
        lowerPlainText: s.plainText.toLowerCase(),
      }));

      sectionsCache = enriched;
      cacheTimestamp = Date.now();
      return enriched;
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

// ============================================================================
// Search Implementation
// ============================================================================

/**
 * Search the corpus for matching sections.
 *
 * Optimized single-pass implementation.
 *
 * @param query - Search query string
 * @param limit - Maximum number of results (default 10)
 * @returns SearchResult with ranked hits
 */
export async function searchCorpus(query: string, limit = 10): Promise<SearchResult> {
  const startLoad = performance.now();
  const sections = await loadSections();
  const endLoad = performance.now();
  const loadTimeMs = Math.round(endLoad - startLoad);

  const startTime = performance.now();

  // Normalize query
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return {
      query,
      hits: [],
      totalMatches: 0,
      searchTimeMs: 0,
      loadTimeMs,
    };
  }

  // Single pass filtering and scoring
  const scoredHits: {
    section: EnrichedSection;
    score: number;
    matchType: "title" | "body" | "both";
  }[] = [];

  for (const section of sections) {
    const inTitle = section.lowerTitle.includes(normalizedQuery);
    const inBody = section.lowerPlainText.includes(normalizedQuery);

    if (inTitle || inBody) {
      scoredHits.push({
        section,
        score: computeScore(section, normalizedQuery, inTitle, inBody),
        matchType: inTitle && inBody ? "both" : inTitle ? "title" : "body",
      });
    }
  }

  // Sort by score descending
  scoredHits.sort((a, b) => b.score - a.score);

  // Build result (extract snippets only for top hits)
  const hits: SearchHit[] = scoredHits.slice(0, limit).map(({ section, score, matchType }) => ({
    id: section.id,
    anchor: section.anchor,
    title: section.title,
    snippet: extractSnippet(section.plainText, normalizedQuery),
    score,
    matchType,
    wordCount: section.wordCount,
  }));

  const endTime = performance.now();

  return {
    query,
    hits,
    totalMatches: scoredHits.length,
    searchTimeMs: Math.round(endTime - startTime),
    loadTimeMs,
  };
}

/**
 * Compute relevance score for a section.
 *
 * Scoring factors:
 * - Title match: 0.4 boost
 * - Body match: 0.2 boost
 * - Query frequency: up to 0.3 based on occurrences
 * - Position: 0.1 boost if query appears early in text
 */
function computeScore(
  section: EnrichedSection,
  query: string,
  inTitle: boolean,
  inBody: boolean,
): number {
  let score = 0;

  // Base score for any match
  score += 0.1;

  // Title match bonus
  if (inTitle) {
    score += 0.4;
    // Exact title match bonus
    if (section.lowerTitle === query) {
      score += 0.2;
    }
  }

  // Body match bonus
  if (inBody) {
    score += 0.2;
  }

  // Frequency bonus (capped)
  // Use pre-computed lowerPlainText
  const occurrences = countOccurrences(section.lowerPlainText, query);
  const frequencyScore = Math.min(occurrences / 10, 1) * 0.3;
  score += frequencyScore;

  // Position bonus (early match)
  const firstIndex = section.lowerPlainText.indexOf(query);
  if (firstIndex !== -1 && firstIndex < 500) {
    score += 0.1 * (1 - firstIndex / 500);
  }

  return Math.min(score, 1); // Cap at 1
}

/**
 * Count occurrences of query in text.
 */
function countOccurrences(text: string, query: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(query, pos)) !== -1) {
    count++;
    pos += query.length;
  }
  return count;
}

/**
 * Extract a snippet around the first match with context.
 *
 * @param text - Full plain text (original case)
 * @param query - Search query (lowercased)
 * @param maxLength - Maximum snippet length (default 200)
 * @returns Snippet with ellipsis and highlighted match
 */
function extractSnippet(text: string, query: string, maxLength = 200): string {
  const lowerText = text.toLowerCase();
  const matchIndex = lowerText.indexOf(query);

  if (matchIndex === -1) {
    // No match, return start of text
    return text.slice(0, maxLength) + (text.length > maxLength ? "..." : "");
  }

  // Calculate window around match
  const contextBefore = 50;
  const contextAfter = maxLength - contextBefore - query.length;

  let start = Math.max(0, matchIndex - contextBefore);
  let end = Math.min(text.length, matchIndex + query.length + contextAfter);

  // Adjust to word boundaries
  if (start > 0) {
    const spaceIndex = text.indexOf(" ", start);
    if (spaceIndex !== -1 && spaceIndex < matchIndex) {
      start = spaceIndex + 1;
    }
  }

  if (end < text.length) {
    const spaceIndex = text.lastIndexOf(" ", end);
    if (spaceIndex !== -1 && spaceIndex > matchIndex + query.length) {
      end = spaceIndex;
    }
  }

  let snippet = text.slice(start, end);

  // Add ellipsis
  if (start > 0) {
    snippet = "..." + snippet;
  }
  if (end < text.length) {
    snippet = snippet + "...";
  }

  return snippet;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get a specific section by anchor.
 */
export async function getSectionByAnchor(anchor: string): Promise<Section | undefined> {
  const sections = await loadSections();
  return sections.find((s) => s.anchor === anchor);
}

/**
 * Get a specific section by number.
 */
export async function getSectionByNumber(num: number): Promise<Section | undefined> {
  const sections = await loadSections();
  return sections.find((s) => s.sectionNumber === num);
}

/**
 * Get all sections (for listing/browsing).
 */
export async function getAllSections(): Promise<Section[]> {
  return loadSections();
}

/**
 * Return basic cache stats for diagnostics/tests.
 */
export function getCacheStats(): { cached: boolean; timestamp: number } {
  return {
    cached: Boolean(sectionsCache),
    timestamp: cacheTimestamp ?? 0,
  };
}

/**
 * Load all sections directly (exposed for use with TanStack Query).
 */
export { loadSections };
