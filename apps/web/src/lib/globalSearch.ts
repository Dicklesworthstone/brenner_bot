/**
 * Global Search Service
 *
 * Provides comprehensive full-text search across all corpus documents:
 * - Transcript sections (236 segments)
 * - Quote bank entries
 * - Final distillations (GPT, Opus, Gemini)
 * - Raw model responses
 * - Metaprompts
 *
 * Features:
 * - In-memory caching for blazing-fast repeated searches
 * - Intelligent relevance scoring with multiple signals
 * - Match highlighting with context extraction
 * - Category filtering
 * - Debounce-friendly (returns quickly for partial queries)
 *
 * NOTE: This file uses Node.js APIs and must only be imported from server code.
 * Client components should use the server action in globalSearchAction.ts instead.
 */

import {
  makeDistillationSectionDomId,
  makeTranscriptSectionDomId,
  quoteBankDomIdFromSectionId,
  slugifyHeadingForAnchor,
} from "./anchors";
import { CORPUS_DOCS, type CorpusDoc, readCorpusDoc } from "./corpus";
import { parseDistillation } from "./distillation-parser";
import type {
  DocCategory,
  GlobalSearchHit,
  GlobalSearchResult,
  SearchCategory,
} from "./globalSearchTypes";
import { parseQuoteBank as parseQuoteBankDoc } from "./quotebank-parser";
import { parseTranscript } from "./transcriptParser";

export { getCategoryInfo } from "./globalSearchTypes";
// Re-export types for server-side usage
export type { DocCategory, GlobalSearchHit, GlobalSearchResult, SearchCategory };

interface IndexedChunk {
  id: string;
  docId: string;
  docTitle: string;
  category: DocCategory;
  model?: "gpt" | "opus" | "gemini";
  title: string;
  content: string;
  contentLower: string;
  titleLower: string;
  anchor?: string;
  url: string;
  wordCount: number;
}

// ============================================================================
// Search Index Cache
// ============================================================================

let indexCache: IndexedChunk[] | null = null;
let indexTimestamp: number | null = null;
let indexPromise: Promise<IndexedChunk[]> | null = null;

/**
 * Build or retrieve the search index.
 */
async function getIndex(): Promise<IndexedChunk[]> {
  if (indexCache) return indexCache;
  if (indexPromise) return indexPromise;

  indexPromise = (async () => {
    try {
      const chunks: IndexedChunk[] = [];

      for (const doc of CORPUS_DOCS) {
        try {
          const { content } = await readCorpusDoc(doc.id);

          if (doc.id === "transcript") {
            // Parse transcript into sections
            const { sections } = parseTranscript(content);
            for (const section of sections) {
              const domId = makeTranscriptSectionDomId(section.sectionNumber);
              chunks.push({
                id: `${doc.id}:${section.anchor}`,
                docId: doc.id,
                docTitle: doc.title,
                category: doc.category,
                model: doc.model,
                title: section.title,
                content: section.plainText,
                contentLower: section.plainText.toLowerCase(),
                titleLower: section.title.toLowerCase(),
                anchor: section.anchor,
                url: `/corpus/transcript#${domId}`,
                wordCount: section.wordCount,
              });
            }
          } else if (doc.id === "quote-bank") {
            // Parse quote bank into individual quotes
            const quoteChunks = parseQuoteBankChunks(content, doc);
            chunks.push(...quoteChunks);
          } else if (doc.category === "distillation") {
            const distillationChunks = parseDistillationChunks(content, doc);
            chunks.push(...distillationChunks);
          } else {
            // General document - parse into sections by headers
            const docChunks = parseDocumentSections(content, doc);
            chunks.push(...docChunks);
          }
        } catch (err) {
          console.warn(`Failed to index ${doc.id}:`, err);
        }
      }

      indexCache = chunks;
      indexTimestamp = Date.now();
      return chunks;
    } finally {
      // Clear promise so future calls (e.g. after cache clear) can retry or re-init
      indexPromise = null;
    }
  })();

  return indexPromise;
}

/**
 * Parse quote bank into searchable chunks.
 */
function parseQuoteBankChunks(content: string, doc: CorpusDoc): IndexedChunk[] {
  const chunks: IndexedChunk[] = [];
  const parsed = parseQuoteBankDoc(content);

  for (const quote of parsed.quotes) {
    const fullText = [quote.quote, quote.context, quote.tags.join(" ")].filter(Boolean).join(" ");
    const domId = quoteBankDomIdFromSectionId(quote.sectionId);
    chunks.push({
      id: `${doc.id}:${quote.sectionId}`,
      docId: doc.id,
      docTitle: doc.title,
      category: doc.category,
      model: doc.model,
      title: quote.title,
      content: fullText,
      contentLower: fullText.toLowerCase(),
      titleLower: quote.title.toLowerCase(),
      anchor: quote.sectionId,
      url: `/corpus/quote-bank#${domId}`,
      wordCount: fullText.split(/\s+/).filter(Boolean).length,
    });
  }

  return chunks;
}

/**
 * Parse distillation docs into searchable chunks that match viewer DOM ids.
 */
function parseDistillationChunks(content: string, doc: CorpusDoc): IndexedChunk[] {
  const chunks: IndexedChunk[] = [];
  const parsed = parseDistillation(content, doc.id);
  const includePartPrefix = parsed.parts.length > 1;

  let sectionIndex = 0;
  for (const part of parsed.parts) {
    for (const section of part.sections) {
      const textParts: string[] = [];
      for (const block of section.content) {
        switch (block.type) {
          case "paragraph":
          case "quote":
          case "emphasis":
          case "code":
            textParts.push(block.text);
            break;
          case "list":
            textParts.push(block.items.join(" "));
            break;
        }
      }

      const fullText = textParts.join(" ").trim();
      const domId = makeDistillationSectionDomId({
        title: section.title,
        partNumber: includePartPrefix ? part.number : undefined,
        index: sectionIndex++,
      });

      chunks.push({
        id: `${doc.id}:${domId}`,
        docId: doc.id,
        docTitle: doc.title,
        category: doc.category,
        model: doc.model,
        title: section.title,
        content: fullText,
        contentLower: fullText.toLowerCase(),
        titleLower: section.title.toLowerCase(),
        anchor: domId,
        url: `${getDocUrl(doc)}#${domId}`,
        wordCount: fullText.split(/\s+/).filter(Boolean).length,
      });
    }
  }

  if (parsed.preamble) {
    const fullText = parsed.preamble.trim();
    if (fullText) {
      chunks.push({
        id: `${doc.id}:introduction`,
        docId: doc.id,
        docTitle: doc.title,
        category: doc.category,
        model: doc.model,
        title: "Introduction",
        content: fullText,
        contentLower: fullText.toLowerCase(),
        titleLower: "introduction",
        anchor: "introduction",
        url: `${getDocUrl(doc)}#introduction`,
        wordCount: fullText.split(/\s+/).filter(Boolean).length,
      });
    }
  }

  return chunks;
}

/**
 * Parse general markdown documents into sections by headers.
 */
function parseDocumentSections(content: string, doc: CorpusDoc): IndexedChunk[] {
  const chunks: IndexedChunk[] = [];

  // Split by ## headers
  const sectionRegex = /^##\s+(.+)$/gm;
  const matches = [...content.matchAll(sectionRegex)];

  if (matches.length === 0) {
    // No sections - treat whole doc as one chunk
    const plainText = content
      .replace(/^#\s+.+$/gm, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .trim();

    chunks.push({
      id: `${doc.id}:main`,
      docId: doc.id,
      docTitle: doc.title,
      category: doc.category,
      model: doc.model,
      title: doc.title,
      content: plainText.slice(0, 5000), // Limit size
      contentLower: plainText.slice(0, 5000).toLowerCase(),
      titleLower: doc.title.toLowerCase(),
      url: getDocUrl(doc),
      wordCount: plainText.split(/\s+/).filter(Boolean).length,
    });
  } else {
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const title = match[1].trim();
      const startIndex = (match.index ?? 0) + match[0].length;
      const endIndex = matches[i + 1]?.index ?? content.length;
      const sectionContent = content.slice(startIndex, endIndex).trim();

      // Clean markdown
      const plainText = sectionContent
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .slice(0, 3000);

      const slug = slugifyHeadingForAnchor(title) || `section-${i}`;

      chunks.push({
        id: `${doc.id}:${slug}`,
        docId: doc.id,
        docTitle: doc.title,
        category: doc.category,
        model: doc.model,
        title,
        content: plainText,
        contentLower: plainText.toLowerCase(),
        titleLower: title.toLowerCase(),
        anchor: slug,
        url: `${getDocUrl(doc)}#${slug}`,
        wordCount: plainText.split(/\s+/).filter(Boolean).length,
      });
    }
  }

  return chunks;
}

/**
 * Get the URL for a document.
 */
function getDocUrl(doc: CorpusDoc): string {
  switch (doc.id) {
    case "transcript":
      return "/corpus/transcript";
    case "quote-bank":
      return "/corpus/quote-bank";
    case "distillation-opus-45":
      return "/corpus/distillation-opus-45";
    case "distillation-gpt-52":
      return "/corpus/distillation-gpt-52";
    case "distillation-gemini-3":
      return "/corpus/distillation-gemini-3";
    default:
      if (doc.id.startsWith("raw-")) {
        // Link to corpus page for raw responses
        return `/corpus/${doc.id}`;
      }
      return `/corpus/${doc.id}`;
  }
}

// ============================================================================
// Search Implementation
// ============================================================================

/**
 * Perform a global search across all corpus documents.
 */
export async function globalSearch(
  query: string,
  options: {
    limit?: number;
    category?: SearchCategory;
    model?: "gpt" | "opus" | "gemini";
    docIds?: string[];
  } = {},
): Promise<GlobalSearchResult> {
  const { limit = 20, category = "all", model, docIds } = options;
  const startTime = performance.now();

  const normalizedQuery = query.trim().toLowerCase();
  const emptyCategories: Record<DocCategory, number> = {
    transcript: 0,
    "quote-bank": 0,
    distillation: 0,
    metaprompt: 0,
    "raw-response": 0,
  };

  if (!normalizedQuery) {
    return {
      query,
      hits: [],
      totalMatches: 0,
      searchTimeMs: 0,
      categories: { ...emptyCategories },
    };
  }

  // Debounce-friendly behavior: ignore queries that would otherwise match everything.
  // We currently treat 1-character terms as noise, so if no meaningful terms remain,
  // return empty quickly (prevents `[].every(...) === true` from matching all chunks).
  const queryTerms = normalizedQuery.split(/\s+/).filter((t) => t.length > 1);
  if (queryTerms.length === 0) {
    const endTime = performance.now();
    return {
      query,
      hits: [],
      totalMatches: 0,
      searchTimeMs: Math.round(endTime - startTime),
      categories: { ...emptyCategories },
    };
  }

  const index = await getIndex();

  // Filter by category and model
  let candidates = index;
  if (category !== "all") {
    candidates = candidates.filter((c) => c.category === category);
  }
  if (model) {
    candidates = candidates.filter((c) => c.model === model);
  }
  if (docIds) {
    const allowed = new Set(docIds.map((id) => id.trim()).filter(Boolean));
    if (allowed.size > 0) {
      candidates = candidates.filter((c) => allowed.has(c.docId));
    }
  }

  // Search and score
  const scoredHits: Array<{
    chunk: IndexedChunk;
    score: number;
    matchType: "title" | "body" | "both";
  }> = [];
  const categoryCounts: Record<DocCategory, number> = {
    transcript: 0,
    "quote-bank": 0,
    distillation: 0,
    metaprompt: 0,
    "raw-response": 0,
  };

  for (const chunk of candidates) {
    const inTitle =
      chunk.titleLower.includes(normalizedQuery) ||
      (queryTerms.length > 0 && queryTerms.every((term) => chunk.titleLower.includes(term)));
    const inBody =
      chunk.contentLower.includes(normalizedQuery) ||
      (queryTerms.length > 0 && queryTerms.every((term) => chunk.contentLower.includes(term)));

    if (!inTitle && !inBody) continue;

    categoryCounts[chunk.category]++;

    const score = computeScore(chunk, normalizedQuery, queryTerms, inTitle, inBody);
    const matchType = inTitle && inBody ? "both" : inTitle ? "title" : "body";

    scoredHits.push({ chunk, score, matchType });
  }

  // Sort by score
  scoredHits.sort((a, b) => b.score - a.score);

  // Build results
  const hits: GlobalSearchHit[] = scoredHits.slice(0, limit).map(({ chunk, score, matchType }) => ({
    id: chunk.id,
    docId: chunk.docId,
    docTitle: chunk.docTitle,
    category: chunk.category,
    model: chunk.model,
    title: chunk.title,
    snippet: extractSnippet(chunk.content, normalizedQuery, queryTerms),
    score,
    matchType,
    anchor: chunk.anchor,
    url: chunk.url,
    highlights: extractHighlights(chunk.content, queryTerms),
  }));

  const endTime = performance.now();

  return {
    query,
    hits,
    totalMatches: scoredHits.length,
    searchTimeMs: Math.round(endTime - startTime),
    categories: categoryCounts,
  };
}

/**
 * Compute relevance score for a chunk.
 */
function computeScore(
  chunk: IndexedChunk,
  query: string,
  terms: string[],
  inTitle: boolean,
  inBody: boolean,
): number {
  let score = 0.1; // Base score

  // Title match bonus
  if (inTitle) {
    score += 0.35;
    // Exact title match
    if (chunk.titleLower === query) {
      score += 0.2;
    }
    // Title starts with query
    else if (chunk.titleLower.startsWith(query)) {
      score += 0.1;
    }
  }

  // Body match bonus
  if (inBody) {
    score += 0.15;
  }

  // Frequency bonus (how many times the query appears)
  const fullContent = chunk.titleLower + " " + chunk.contentLower;
  let occurrences = 0;
  for (const term of terms.length > 0 ? terms : [query]) {
    let pos = 0;
    while ((pos = fullContent.indexOf(term, pos)) !== -1) {
      occurrences++;
      pos += term.length;
    }
  }
  score += Math.min(occurrences / 15, 1) * 0.2;

  // Position bonus (earlier match is better)
  const firstIndex = chunk.contentLower.indexOf(query);
  if (firstIndex !== -1 && firstIndex < 300) {
    score += 0.1 * (1 - firstIndex / 300);
  }

  // Category bonus (transcript is most relevant)
  if (chunk.category === "transcript") {
    score += 0.05;
  } else if (chunk.category === "quote-bank") {
    score += 0.03;
  }

  // Term coverage bonus (for multi-word queries)
  if (terms.length > 1) {
    const termMatches = terms.filter(
      (t) => chunk.titleLower.includes(t) || chunk.contentLower.includes(t),
    ).length;
    score += (termMatches / terms.length) * 0.1;
  }

  return Math.min(score, 1);
}

/**
 * Extract a snippet around the first match with context.
 */
function extractSnippet(text: string, query: string, terms: string[], maxLength = 200): string {
  const lowerText = text.toLowerCase();

  // Find best match position
  let matchIndex = lowerText.indexOf(query);
  if (matchIndex === -1 && terms.length > 0) {
    // Find first term match
    for (const term of terms) {
      matchIndex = lowerText.indexOf(term);
      if (matchIndex !== -1) break;
    }
  }

  if (matchIndex === -1) {
    return text.slice(0, maxLength) + (text.length > maxLength ? "..." : "");
  }

  // Calculate window
  const contextBefore = 60;
  let start = Math.max(0, matchIndex - contextBefore);
  let end = Math.min(text.length, start + maxLength);

  // Adjust to word boundaries
  if (start > 0) {
    const spaceIndex = text.indexOf(" ", start);
    if (spaceIndex !== -1 && spaceIndex < matchIndex) {
      start = spaceIndex + 1;
    }
  }

  if (end < text.length) {
    const spaceIndex = text.lastIndexOf(" ", end);
    if (spaceIndex !== -1 && spaceIndex > matchIndex) {
      end = spaceIndex;
    }
  }

  let snippet = text.slice(start, end);

  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";

  return snippet;
}

/**
 * Extract matching terms for highlighting.
 */
function extractHighlights(text: string, terms: string[]): string[] {
  const highlights: string[] = [];
  const lowerText = text.toLowerCase();

  for (const term of terms) {
    let pos = 0;
    while (true) {
      const index = lowerText.indexOf(term, pos);
      if (index === -1) break;

      // Get original case from text
      highlights.push(text.slice(index, index + term.length));
      pos = index + term.length;
    }
  }

  return [...new Set(highlights)]; // Dedup
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get index stats for debugging.
 */
export function getIndexStats(): {
  indexed: boolean;
  chunkCount: number;
  timestamp: number | null;
  categoryCounts: Record<DocCategory, number>;
} {
  if (!indexCache) {
    return {
      indexed: false,
      chunkCount: 0,
      timestamp: null,
      categoryCounts: {
        transcript: 0,
        "quote-bank": 0,
        distillation: 0,
        metaprompt: 0,
        "raw-response": 0,
      },
    };
  }

  const counts: Record<DocCategory, number> = {
    transcript: 0,
    "quote-bank": 0,
    distillation: 0,
    metaprompt: 0,
    "raw-response": 0,
  };

  for (const chunk of indexCache) {
    counts[chunk.category]++;
  }

  return {
    indexed: true,
    chunkCount: indexCache.length,
    timestamp: indexTimestamp,
    categoryCounts: counts,
  };
}

/**
 * Pre-warm the search index.
 */
export async function warmIndex(): Promise<void> {
  await getIndex();
}

/**
 * Clear the search index (for testing).
 */
export function clearIndex(): void {
  indexCache = null;
  indexTimestamp = null;
}
