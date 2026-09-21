/**
 * Literature Integration Module
 *
 * Enables searching for relevant papers, importing citations, and
 * recording literature evidence in the Evidence Ledger.
 *
 * Features:
 * - Hypothesis-aware search query generation
 * - Paper relevance scoring using embeddings
 * - Citation import from DOI and BibTeX
 * - Quick recording from papers to Evidence Ledger
 *
 * @see brenner_bot-njjo.7 (bead)
 * @see brenner_bot-njjo (parent epic: Evidence Ledger)
 * @module brenner-loop/literature
 */

import type { DiscriminativePower, EvidenceResult } from "./evidence";
import type { HypothesisCard } from "./hypothesis";
import { cosineSimilarity, embedText } from "./search/embeddings";

// ============================================================================
// Types
// ============================================================================

/**
 * Supported literature search sources
 */
export type LiteratureSource =
  | "google_scholar"
  | "pubmed"
  | "semantic_scholar"
  | "crossref"
  | "manual";

/**
 * Human-readable labels for literature sources
 */
export const LITERATURE_SOURCE_LABELS: Record<LiteratureSource, string> = {
  google_scholar: "Google Scholar",
  pubmed: "PubMed",
  semantic_scholar: "Semantic Scholar",
  crossref: "CrossRef",
  manual: "Manual Entry",
};

/**
 * Filter options for literature search
 */
export interface LiteratureSearchFilters {
  /** Filter papers published after this year */
  yearFrom?: number;

  /** Filter papers published before this year */
  yearTo?: number;

  /** Only include open access papers */
  openAccessOnly?: boolean;

  /** Minimum citation count */
  minCitations?: number;

  /** Specific journal or venue filter */
  venue?: string;

  /** Author name filter */
  author?: string;
}

/**
 * A literature search query with results
 */
export interface LiteratureSearch {
  /** Unique ID for this search */
  id: string;

  /** Search query text */
  query: string;

  /** Source to search */
  source: LiteratureSource;

  /** Applied filters */
  filters: LiteratureSearchFilters;

  /** Search results */
  results: PaperResult[];

  /** When the search was performed */
  searchedAt: Date;

  /** Context: which hypothesis prompted this search */
  hypothesisId?: string;

  /** Context: which test prompted this search */
  testId?: string;
}

/**
 * A paper result from literature search
 */
export interface PaperResult {
  /** Unique identifier (DOI or generated) */
  id: string;

  /** Paper title */
  title: string;

  /** Author list */
  authors: string[];

  /** Publication year */
  year: number;

  /** Abstract text */
  abstract: string;

  /** Number of citations */
  citationCount: number;

  /** URL to full paper */
  url: string;

  /** Digital Object Identifier */
  doi?: string;

  /** Journal or venue name */
  venue?: string;

  /** Is this open access? */
  isOpenAccess?: boolean;

  /** Keywords from the paper */
  keywords?: string[];

  // === Relevance to current hypothesis ===

  /** Relevance score (0-1, computed from embeddings) */
  relevanceScore: number;

  /** Human-readable explanation of relevance */
  relevanceRationale?: string;
}

/**
 * Input for importing a paper from DOI
 */
export interface DOIImportInput {
  /** The DOI to look up */
  doi: string;
}

/**
 * Parsed BibTeX entry
 */
export interface BibTeXEntry {
  /** Entry type (article, book, inproceedings, etc.) */
  entryType: string;

  /** Citation key */
  citationKey: string;

  /** Title */
  title?: string;

  /** Authors (raw string) */
  author?: string;

  /** Year */
  year?: string;

  /** Journal/Venue */
  journal?: string;

  /** DOI */
  doi?: string;

  /** URL */
  url?: string;

  /** Abstract */
  abstract?: string;

  /** Volume */
  volume?: string;

  /** Pages */
  pages?: string;

  /** Publisher */
  publisher?: string;
}

/**
 * Input for recording a paper as evidence
 */
export interface RecordPaperAsEvidenceInput {
  /** The paper to record */
  paper: PaperResult;

  /** Session ID for the evidence entry */
  sessionId: string;

  /** Hypothesis ID being tested */
  hypothesisId: string;

  /** Does this paper support, challenge, or inconclusively relate? */
  result: EvidenceResult;

  /** Key finding from the paper */
  keyFinding: string;

  /** How this applies to the specific hypothesis */
  interpretation: string;

  /** Discriminative power assessment */
  discriminativePower: DiscriminativePower;

  /** Current confidence before this evidence */
  confidenceBefore: number;

  /** Computed confidence after this evidence */
  confidenceAfter: number;

  /** Optional prediction if true (for pre-registered tests) */
  predictionIfTrue?: string;

  /** Optional prediction if false */
  predictionIfFalse?: string;
}

/**
 * Suggested search queries generated from a hypothesis
 */
export interface SuggestedSearches {
  /** The hypothesis these suggestions are for */
  hypothesisId: string;

  /** Primary search query derived from hypothesis statement */
  primaryQuery: string;

  /** Alternative search queries for different angles */
  alternativeQueries: string[];

  /** Suggested keywords extracted from hypothesis */
  keywords: string[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Pattern for valid literature search IDs (supports UUID and timestamp formats)
 */
export const LITERATURE_SEARCH_ID_PATTERN = /^LS-([0-9a-f-]{36}|[a-z0-9]+-[a-z0-9]+)$/;

/**
 * Pattern for valid DOIs
 */
export const DOI_PATTERN = /^10\.\d{4,}\/[^\s]+$/;

/**
 * Maximum number of search results to return
 */
export const MAX_SEARCH_RESULTS = 50;

/**
 * Relevance score thresholds
 */
export const RELEVANCE_THRESHOLDS = {
  HIGH: 0.7,
  MODERATE: 0.4,
  LOW: 0.2,
};

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate a unique ID for a literature search
 */
export function generateSearchId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `LS-${crypto.randomUUID()}`;
  }
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 6);
  return `LS-${timestamp}-${random}`;
}

/**
 * Generate an ID for a paper result (uses DOI if available)
 */
export function generatePaperId(paper: Partial<PaperResult>): string {
  if (paper.doi) {
    // Normalize DOI as ID
    return `doi:${paper.doi.toLowerCase().replace(/\s/g, "")}`;
  }
  // Generate from title hash
  const titleHash = hashString(paper.title || "unknown");
  const yearPart = paper.year ? `-${paper.year}` : "";
  return `paper:${titleHash}${yearPart}`;
}

// ============================================================================
// Search Query Generation
// ============================================================================

/**
 * Generate suggested search queries from a hypothesis.
 *
 * This extracts key terms and generates variations that might
 * find relevant literature.
 */
export function generateSearchQueries(hypothesis: HypothesisCard): SuggestedSearches {
  const statement = hypothesis.statement.toLowerCase();
  const mechanism = hypothesis.mechanism.toLowerCase();
  const scope = [...hypothesis.domain, ...(hypothesis.tags ?? [])]
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .join(" ");

  // Extract keywords from the hypothesis
  const keywords = extractKeywords(statement);

  // Generate primary query from the main statement
  const primaryQuery = cleanQueryString(statement);

  // Generate alternative queries
  const alternativeQueries: string[] = [];

  // Add mechanism-focused query if available
  if (mechanism.trim().length > 0) {
    alternativeQueries.push(cleanQueryString(mechanism));
  }

  // Add scope-focused query
  if (scope) {
    alternativeQueries.push(`${keywords.slice(0, 3).join(" ")} ${scope}`);
  }

  // Add keyword combinations
  if (keywords.length >= 3) {
    // First 3 keywords
    alternativeQueries.push(keywords.slice(0, 3).join(" "));

    // Keywords with "causation" or "effect"
    alternativeQueries.push(`${keywords.slice(0, 2).join(" ")} causation`);
    alternativeQueries.push(`${keywords.slice(0, 2).join(" ")} effect mechanism`);
  }

  // Add domain-specific variations if confounds suggest domains
  for (const confound of hypothesis.confounds) {
    const confoundKeywords = extractKeywords(confound.description);
    if (confoundKeywords.length > 0) {
      alternativeQueries.push(
        `${keywords[0] || ""} ${confoundKeywords.slice(0, 2).join(" ")} alternative explanation`,
      );
    }
  }

  // Deduplicate and limit
  const uniqueAlternatives = [...new Set(alternativeQueries)]
    .filter((q) => q !== primaryQuery && q.trim().length > 10)
    .slice(0, 5);

  return {
    hypothesisId: hypothesis.id,
    primaryQuery,
    alternativeQueries: uniqueAlternatives,
    keywords,
  };
}

/**
 * Extract keywords from text for search query building
 */
function extractKeywords(text: string): string[] {
  // Remove common stop words and extract significant terms
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
    "shall",
    "can",
    "need",
    "dare",
    "ought",
    "used",
    "to",
    "of",
    "in",
    "for",
    "on",
    "with",
    "at",
    "by",
    "from",
    "as",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "between",
    "under",
    "again",
    "further",
    "then",
    "once",
    "here",
    "there",
    "when",
    "where",
    "why",
    "how",
    "all",
    "each",
    "few",
    "more",
    "most",
    "other",
    "some",
    "such",
    "no",
    "nor",
    "not",
    "only",
    "own",
    "same",
    "so",
    "than",
    "too",
    "very",
    "just",
    "also",
    "now",
    "that",
    "this",
    "these",
    "those",
    "which",
    "who",
    "whom",
    "what",
    "whose",
    "and",
    "but",
    "or",
    "if",
    "because",
    "while",
    "although",
    "though",
    "whether",
    "both",
    "either",
    "neither",
    "i",
    "my",
    "me",
    "we",
    "our",
    "you",
    "your",
    "he",
    "she",
    "it",
    "they",
    "them",
    "his",
    "her",
    "its",
    "their",
    "causes",
    "cause",
    "caused",
    "causing",
    "leads",
    "lead",
    "results",
    "result",
    "due",
    "effect",
    "effects",
    "affects",
    "affect",
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !stopWords.has(word))
    .slice(0, 15);
}

/**
 * Clean a string for use as a search query
 */
function cleanQueryString(text: string): string {
  return text
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

// ============================================================================
// Relevance Scoring
// ============================================================================

/**
 * Calculate relevance score between a paper and a hypothesis.
 *
 * Uses embedding similarity on title + abstract vs hypothesis statement.
 */
export function calculateRelevance(
  paper: Partial<PaperResult>,
  hypothesis: HypothesisCard,
): { score: number; rationale: string } {
  // Combine paper text
  const paperText = [
    paper.title || "",
    paper.abstract || "",
    (paper.keywords || []).join(" "),
  ].join(" ");

  // Combine hypothesis text
  const hypothesisText = [
    hypothesis.statement,
    hypothesis.mechanism,
    hypothesis.domain.join(" "),
    hypothesis.confounds.map((c) => c.description).join(" "),
    (hypothesis.assumptions ?? []).join(" "),
    (hypothesis.tags ?? []).join(" "),
    hypothesis.notes ?? "",
  ].join(" ");

  // Generate embeddings and calculate similarity
  const paperEmbedding = embedText(paperText);
  const hypothesisEmbedding = embedText(hypothesisText);
  const score = cosineSimilarity(paperEmbedding, hypothesisEmbedding);

  // Generate rationale based on score
  let rationale: string;
  if (score >= RELEVANCE_THRESHOLDS.HIGH) {
    rationale =
      "Highly relevant - strong semantic overlap with hypothesis statement and mechanism.";
  } else if (score >= RELEVANCE_THRESHOLDS.MODERATE) {
    rationale =
      "Moderately relevant - addresses related concepts but may focus on different aspects.";
  } else if (score >= RELEVANCE_THRESHOLDS.LOW) {
    rationale = "Low relevance - tangentially related or focuses on peripheral topics.";
  } else {
    rationale = "Minimal relevance - may not directly address the hypothesis.";
  }

  return { score, rationale };
}

/**
 * Sort and filter paper results by relevance
 */
export function rankByRelevance(papers: PaperResult[], minScore: number = 0): PaperResult[] {
  return papers
    .filter((p) => p.relevanceScore >= minScore)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Get relevance category label
 */
export function getRelevanceLabel(score: number): string {
  if (score >= RELEVANCE_THRESHOLDS.HIGH) return "High";
  if (score >= RELEVANCE_THRESHOLDS.MODERATE) return "Moderate";
  if (score >= RELEVANCE_THRESHOLDS.LOW) return "Low";
  return "Minimal";
}

/**
 * Get relevance color for UI display
 */
export function getRelevanceColor(score: number): string {
  if (score >= RELEVANCE_THRESHOLDS.HIGH) return "text-green-600";
  if (score >= RELEVANCE_THRESHOLDS.MODERATE) return "text-amber-600";
  if (score >= RELEVANCE_THRESHOLDS.LOW) return "text-orange-600";
  return "text-red-600";
}

// ============================================================================
// Citation Parsing
// ============================================================================

/**
 * Parse a BibTeX entry into structured data
 */
export function parseBibTeX(bibtex: string): BibTeXEntry | null {
  // Match entry type and key: @article{key,
  const entryMatch = bibtex.match(/@(\w+)\s*\{\s*([^,\s]+)\s*,/);
  if (!entryMatch) return null;

  const entry: BibTeXEntry = {
    entryType: entryMatch[1].toLowerCase(),
    citationKey: entryMatch[2],
  };

  // Match field = {value} or field = "value" or field = value
  const fieldRegex = /(\w+)\s*=\s*(?:\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}|"([^"]*)"|(\d+))/g;
  let match;

  while ((match = fieldRegex.exec(bibtex)) !== null) {
    const fieldName = match[1].toLowerCase();
    const value = match[2] || match[3] || match[4];

    switch (fieldName) {
      case "title":
        entry.title = cleanBibTeXValue(value);
        break;
      case "author":
        entry.author = cleanBibTeXValue(value);
        break;
      case "year":
        entry.year = value;
        break;
      case "journal":
      case "booktitle":
        entry.journal = cleanBibTeXValue(value);
        break;
      case "doi":
        entry.doi = cleanBibTeXValue(value);
        break;
      case "url":
        entry.url = cleanBibTeXValue(value);
        break;
      case "abstract":
        entry.abstract = cleanBibTeXValue(value);
        break;
      case "volume":
        entry.volume = value;
        break;
      case "pages":
        entry.pages = value;
        break;
      case "publisher":
        entry.publisher = cleanBibTeXValue(value);
        break;
    }
  }

  return entry;
}

/**
 * Convert a BibTeX entry to a PaperResult
 */
export function bibTeXToPaperResult(entry: BibTeXEntry, hypothesis?: HypothesisCard): PaperResult {
  const paper: PaperResult = {
    id: entry.doi ? `doi:${entry.doi}` : `bibtex:${entry.citationKey}`,
    title: entry.title || "Untitled",
    authors: parseAuthors(entry.author || ""),
    year: parseInt(entry.year || "0", 10) || new Date().getFullYear(),
    abstract: entry.abstract || "",
    citationCount: 0, // Not available from BibTeX
    url: entry.url || (entry.doi ? `https://doi.org/${entry.doi}` : ""),
    doi: entry.doi,
    venue: entry.journal,
    relevanceScore: 0,
  };

  // Calculate relevance if hypothesis provided
  if (hypothesis) {
    const { score, rationale } = calculateRelevance(paper, hypothesis);
    paper.relevanceScore = score;
    paper.relevanceRationale = rationale;
  }

  return paper;
}

/**
 * Parse author string into array of names
 */
function parseAuthors(authorString: string): string[] {
  return authorString
    .split(/\s+and\s+/i)
    .map((author) => author.replace(/\{|\}/g, "").trim())
    .filter((a) => a.length > 0);
}

/**
 * Clean BibTeX field value (remove braces, extra whitespace)
 */
function cleanBibTeXValue(value: string): string {
  return value.replace(/\{|\}/g, "").replace(/\s+/g, " ").trim();
}

// ============================================================================
// DOI Utilities
// ============================================================================

/**
 * Validate a DOI string
 */
export function isValidDOI(doi: string): boolean {
  return DOI_PATTERN.test(doi.trim());
}

/**
 * Extract DOI from a URL or string
 */
export function extractDOI(input: string): string | null {
  // Try direct DOI pattern
  const directMatch = input.match(DOI_PATTERN);
  if (directMatch) return directMatch[0];

  // Try extracting from DOI URLs
  const urlPatterns = [/doi\.org\/(10\.\d{4,}\/[^\s]+)/, /dx\.doi\.org\/(10\.\d{4,}\/[^\s]+)/];

  for (const pattern of urlPatterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Generate a DOI URL
 */
export function doiToUrl(doi: string): string {
  return `https://doi.org/${doi}`;
}

// ============================================================================
// Evidence Recording
// ============================================================================

/**
 * Format a paper citation for display
 */
export function formatCitation(paper: PaperResult): string {
  const authorPart =
    paper.authors.length > 0
      ? paper.authors.length > 3
        ? `${paper.authors[0]} et al.`
        : paper.authors.join(", ")
      : "Unknown";

  const venuePart = paper.venue ? `. ${paper.venue}` : "";
  const doiPart = paper.doi ? ` DOI: ${paper.doi}` : "";

  return `${authorPart} (${paper.year}). ${paper.title}${venuePart}.${doiPart}`;
}

/**
 * Format a paper as a source string for evidence entry
 */
export function formatPaperSource(paper: PaperResult): string {
  if (paper.doi) {
    return `DOI:${paper.doi}`;
  }
  return `${paper.authors[0] || "Unknown"} (${paper.year}). ${paper.title}`;
}

/**
 * Create evidence entry data from a paper recording.
 *
 * This returns the data needed to create an EvidenceEntry via createEvidenceEntry().
 * Note: This doesn't create the entry directly to avoid circular dependencies.
 */
export function preparePaperEvidenceData(input: RecordPaperAsEvidenceInput): {
  test: {
    id: string;
    description: string;
    type: "literature";
    discriminativePower: DiscriminativePower;
  };
  predictionIfTrue: string;
  predictionIfFalse: string;
  observation: string;
  source: string;
  interpretation: string;
  result: EvidenceResult;
  confidenceBefore: number;
  confidenceAfter: number;
  tags: string[];
} {
  return {
    test: {
      id: `LIT-${input.paper.id.replace(/[^a-zA-Z0-9-]/g, "-")}`,
      description: `Literature evidence from: ${input.paper.title}`,
      type: "literature",
      discriminativePower: input.discriminativePower,
    },
    predictionIfTrue: input.predictionIfTrue || "Literature would show supporting findings",
    predictionIfFalse: input.predictionIfFalse || "Literature would show contradicting findings",
    observation: input.keyFinding,
    source: formatPaperSource(input.paper),
    interpretation: input.interpretation,
    result: input.result,
    confidenceBefore: input.confidenceBefore,
    confidenceAfter: input.confidenceAfter,
    tags: ["literature", input.paper.venue || ""].filter(Boolean),
  };
}

// ============================================================================
// Search Factory
// ============================================================================

/**
 * Create a new literature search object
 */
export function createLiteratureSearch(input: {
  query: string;
  source: LiteratureSource;
  filters?: LiteratureSearchFilters;
  hypothesisId?: string;
  testId?: string;
}): LiteratureSearch {
  return {
    id: generateSearchId(),
    query: input.query,
    source: input.source,
    filters: input.filters || {},
    results: [],
    searchedAt: new Date(),
    hypothesisId: input.hypothesisId,
    testId: input.testId,
  };
}

/**
 * Create a paper result (typically from API response)
 */
export function createPaperResult(
  input: Omit<PaperResult, "id" | "relevanceScore">,
  hypothesis?: HypothesisCard,
): PaperResult {
  const paper: PaperResult = {
    ...input,
    id: generatePaperId(input),
    relevanceScore: 0,
  };

  if (hypothesis) {
    const { score, rationale } = calculateRelevance(paper, hypothesis);
    paper.relevanceScore = score;
    paper.relevanceRationale = rationale;
  }

  return paper;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Simple string hash for ID generation
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Summarize a paper for display
 */
export function summarizePaper(paper: PaperResult, maxLength: number = 200): string {
  const abstract = paper.abstract || "";
  if (abstract.length <= maxLength) return abstract;
  return abstract.slice(0, maxLength - 3) + "...";
}

/**
 * Get paper age category
 */
export function getPaperAgeCategory(year: number): string {
  const currentYear = new Date().getFullYear();
  const age = currentYear - year;

  if (age <= 2) return "Recent";
  if (age <= 5) return "Recent-ish";
  if (age <= 10) return "Established";
  return "Classic";
}

/**
 * Type guard for PaperResult
 */
export function isPaperResult(obj: unknown): obj is PaperResult {
  if (typeof obj !== "object" || obj === null) return false;

  const p = obj as Record<string, unknown>;

  return (
    typeof p.id === "string" &&
    typeof p.title === "string" &&
    Array.isArray(p.authors) &&
    typeof p.year === "number" &&
    typeof p.abstract === "string" &&
    typeof p.citationCount === "number" &&
    typeof p.url === "string" &&
    typeof p.relevanceScore === "number"
  );
}

/**
 * Type guard for LiteratureSearch
 */
export function isLiteratureSearch(obj: unknown): obj is LiteratureSearch {
  if (typeof obj !== "object" || obj === null) return false;

  const s = obj as Record<string, unknown>;

  return (
    typeof s.id === "string" &&
    typeof s.query === "string" &&
    typeof s.source === "string" &&
    Array.isArray(s.results) &&
    (s.searchedAt instanceof Date || typeof s.searchedAt === "string")
  );
}
