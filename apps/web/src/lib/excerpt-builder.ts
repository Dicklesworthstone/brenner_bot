/**
 * Excerpt Builder
 *
 * Composes transcript sections into formatted excerpt blocks for session kickoffs.
 * Implements excerpt_format_v0.1.md specification.
 *
 * @example
 * ```typescript
 * import { composeExcerpt, type ExcerptSection } from "./excerpt-builder";
 *
 * const sections: ExcerptSection[] = [
 *   { anchor: "§42", quote: "The question is not whether...", title: "On Discriminative Tests" },
 *   { anchor: "§45", quote: "You need a chastity control...", title: "Potency Checks" },
 * ];
 *
 * const excerpt = composeExcerpt({ theme: "Experimental Design", sections });
 * console.log(excerpt.markdown);
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export interface ExcerptSection {
  /** Section anchor in §n format (e.g., "§42") */
  anchor: string;
  /** The selected quote text */
  quote: string;
  /** Section title for attribution (optional) */
  title?: string;
}

export interface ExcerptConfig {
  /** Theme or title for the excerpt block */
  theme?: string;
  /** Selected sections to include */
  sections: ExcerptSection[];
  /** Ordering strategy: relevance (default) or chronological */
  ordering?: "relevance" | "chronological";
  /** Maximum total words (default: 800) */
  maxTotalWords?: number;
}

export interface ComposedExcerpt {
  /** Full excerpt block as markdown */
  markdown: string;
  /** List of included anchors */
  anchors: string[];
  /** Total word count */
  wordCount: number;
  /** Validation warnings */
  warnings: string[];
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_WORDS = 800;
const MAX_SECTIONS = 7;
const MIN_SECTIONS = 2;

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate anchor format (§ followed by number, no ranges)
 */
function isValidAnchor(anchor: string): boolean {
  return /^§\d+$/.test(anchor);
}

/**
 * Extract section number from anchor for sorting
 */
function extractSectionNumber(anchor: string): number {
  const match = anchor.match(/^§(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ============================================================================
// Composition
// ============================================================================

/**
 * Compose an excerpt block from selected sections.
 *
 * @param config - Excerpt configuration
 * @returns Composed excerpt with markdown, metadata, and warnings
 */
export function composeExcerpt(config: ExcerptConfig): ComposedExcerpt {
  const { theme, sections, ordering = "relevance", maxTotalWords = DEFAULT_MAX_WORDS } = config;

  const warnings: string[] = [];

  // Validate sections
  if (sections.length < MIN_SECTIONS) {
    warnings.push(`Excerpt has fewer than ${MIN_SECTIONS} sections (has ${sections.length})`);
  }

  if (sections.length > MAX_SECTIONS) {
    warnings.push(`Excerpt has more than ${MAX_SECTIONS} sections (has ${sections.length})`);
  }

  // Validate anchors
  for (const section of sections) {
    if (!isValidAnchor(section.anchor)) {
      warnings.push(`Invalid anchor format: "${section.anchor}" (expected §n)`);
    }
  }

  // Check for duplicates
  const anchors = sections.map((s) => s.anchor);
  const uniqueAnchors = new Set(anchors);
  if (uniqueAnchors.size !== anchors.length) {
    warnings.push("Excerpt contains duplicate anchors");
  }

  // Sort sections if chronological ordering requested
  const orderedSections =
    ordering === "chronological"
      ? [...sections].sort(
          (a, b) => extractSectionNumber(a.anchor) - extractSectionNumber(b.anchor),
        )
      : sections;

  // Build markdown
  const lines: string[] = [];

  // Heading
  const heading = theme ? `### Excerpt: ${theme}` : "### Excerpt";
  lines.push(heading);
  lines.push("");

  // Quotes
  for (const section of orderedSections) {
    lines.push(`> **${section.anchor}**: "${section.quote}"`);
    if (section.title) {
      lines.push(`> — *${section.title}*`);
    }
    lines.push("");
  }

  // Footer metadata
  const anchorList = orderedSections.map((s) => s.anchor).join(", ");
  lines.push(`**Sections included**: ${anchorList}`);

  // Calculate word count
  const totalWords = orderedSections.reduce((sum, section) => sum + countWords(section.quote), 0);
  lines.push(`**Total words**: ~${totalWords} words`);

  // Check word limit
  if (totalWords > maxTotalWords) {
    warnings.push(`Excerpt exceeds ${maxTotalWords} word limit (has ${totalWords})`);
  }

  return {
    markdown: lines.join("\n"),
    anchors: orderedSections.map((s) => s.anchor),
    wordCount: totalWords,
    warnings,
  };
}

/**
 * Parse an excerpt markdown block back into structured data.
 * Useful for editing or recomposing excerpts.
 *
 * @param markdown - Excerpt markdown block
 * @returns Parsed sections or null if invalid format
 */
export function parseExcerpt(markdown: string): ExcerptSection[] | null {
  const sections: ExcerptSection[] = [];
  const lines = markdown.split("\n");

  let currentAnchor: string | null = null;
  let currentQuoteLines: string[] = [];
  let currentTitle: string | undefined;

  // Regex to detect start of a quote block: > **§n**: "text...
  const quoteStartRegex = /^>\s*(?:\*\*)?(§\d+)(?:\*\*)?:?\s*(.*)$/;
  // Regex to detect attribution: > — *Title*
  const attrRegex = /^>\s*—\s*\*([^*]+)\*/;
  // Regex for continuation lines: > text...
  const quoteLineRegex = /^>\s*(.*)$/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for start of new quote
    const startMatch = trimmed.match(quoteStartRegex);
    if (startMatch) {
      // If we were building a quote, push it
      if (currentAnchor) {
        sections.push({
          anchor: currentAnchor,
          quote: cleanQuote(currentQuoteLines),
          title: currentTitle,
        });
      }

      // Start new quote
      currentAnchor = startMatch[1];
      currentQuoteLines = [startMatch[2]]; // Content after anchor
      currentTitle = undefined;
      continue;
    }

    // Check for attribution
    const attrMatch = trimmed.match(attrRegex);
    if (attrMatch) {
      currentTitle = attrMatch[1];
      continue;
    }

    // Check for continuation of quote
    if (currentAnchor && !currentTitle) {
      const lineMatch = trimmed.match(quoteLineRegex);
      if (lineMatch) {
        currentQuoteLines.push(lineMatch[1]);
      }
    }
  }

  // Push final quote
  if (currentAnchor) {
    sections.push({
      anchor: currentAnchor,
      quote: cleanQuote(currentQuoteLines),
      title: currentTitle,
    });
  }

  return sections.length > 0 ? sections : null;
}

function cleanQuote(lines: string[]): string {
  let text = lines.join(" ").trim();
  // Strip surrounding quotes if present
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1);
  }
  return text.trim();
}

/**
 * Extract just the anchors from an excerpt markdown block.
 * Lightweight alternative to full parsing.
 *
 * @param markdown - Excerpt markdown block
 * @returns Array of anchors found
 */
export function extractAnchorsFromExcerpt(markdown: string): string[] {
  const anchors: string[] = [];
  // Note: § is Unicode U+00A7, needs proper Unicode regex
  const pattern = /\*\*(§\d+)\*\*/gu;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(markdown)) !== null) {
    anchors.push(match[1]);
  }

  return [...new Set(anchors)]; // Deduplicate
}

// ============================================================================
// Transcript Integration
// ============================================================================

import type { ParsedTranscript, TranscriptSection } from "./transcript-parser";

/**
 * Extract the primary quote from a transcript section.
 * Prefers the first brenner-quote, falls back to paragraph content.
 */
function extractSectionQuote(section: TranscriptSection, maxWords: number = 150): string {
  // Find the first brenner-quote
  const brennerQuote = section.content.find((c) => c.type === "brenner-quote");
  if (brennerQuote) {
    return truncateToWords(brennerQuote.text, maxWords);
  }

  // Fall back to concatenating all content
  const allText = section.content.map((c) => c.text).join(" ");
  return truncateToWords(allText, maxWords);
}

/**
 * Truncate text to a maximum number of words.
 */
function truncateToWords(text: string, maxWords: number): string {
  const normalized = text.replace(/\s+/g, " ").trim().replaceAll('"', "'");
  const words = normalized.split(/\s+/);
  if (words.length <= maxWords) {
    return normalized;
  }
  return words.slice(0, maxWords).join(" ") + "...";
}

/**
 * Parse section ID(s) from various formats.
 * Accepts: "§42", "42", "§42-45", ["§42", "§45"]
 */
export function parseSectionIds(input: string | string[]): number[] {
  const ids: number[] = [];
  const seen = new Set<number>();
  const items = Array.isArray(input) ? input : [input];

  for (const rawItem of items) {
    const item = rawItem.trim();
    if (!item) continue;

    // Handle range format: "§42-45" or "42-45"
    const rangeMatch = item.match(/^§?(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const startRaw = parseInt(rangeMatch[1], 10);
      const endRaw = parseInt(rangeMatch[2], 10);
      if (!Number.isFinite(startRaw) || !Number.isFinite(endRaw)) continue;

      const [start, end] = startRaw <= endRaw ? [startRaw, endRaw] : [endRaw, startRaw];
      for (let i = start; i <= end; i++) {
        if (seen.has(i)) continue;
        seen.add(i);
        ids.push(i);
      }
      continue;
    }

    // Handle single section: "§42" or "42"
    const singleMatch = item.match(/^§?(\d+)$/);
    if (singleMatch) {
      const id = parseInt(singleMatch[1], 10);
      if (!Number.isFinite(id)) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
      continue;
    }

    // Forgiving fallback: first number found
    const firstNumber = item.match(/(\d+)/)?.[1];
    if (!firstNumber) continue;
    const id = parseInt(firstNumber, 10);
    if (!Number.isFinite(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  return ids;
}

/**
 * Build an excerpt from transcript sections given section IDs.
 *
 * This is the primary integration point between the transcript parser
 * and the excerpt formatter. Use this for both web and CLI.
 *
 * @example
 * ```typescript
 * import { parseTranscript } from "./transcript-parser";
 * import { buildExcerptFromSections } from "./excerpt-builder";
 *
 * const transcript = parseTranscript(markdownContent);
 * const excerpt = buildExcerptFromSections(transcript, ["§42", "§45", "§58"]);
 * console.log(excerpt.markdown);
 * ```
 */
export function buildExcerptFromSections(
  transcript: ParsedTranscript,
  sectionIds: string | string[],
  options: {
    theme?: string;
    ordering?: "relevance" | "chronological";
    maxTotalWords?: number;
    maxQuoteWords?: number;
  } = {},
): ComposedExcerpt {
  const { theme, ordering = "relevance", maxTotalWords = 800, maxQuoteWords = 150 } = options;

  // Parse section IDs
  const ids = parseSectionIds(sectionIds);

  // Build ExcerptSection array from transcript
  const excerptSections: ExcerptSection[] = [];
  const notFound: string[] = [];

  for (const id of ids) {
    const section = transcript.sections.find((s) => s.number === id);
    if (section) {
      excerptSections.push({
        anchor: `§${section.number}`,
        quote: extractSectionQuote(section, maxQuoteWords),
        title: section.title,
      });
    } else {
      notFound.push(`§${id}`);
    }
  }

  // Compose the excerpt
  const result = composeExcerpt({
    theme,
    sections: excerptSections,
    ordering,
    maxTotalWords,
  });

  // Add warnings for missing sections
  if (notFound.length > 0) {
    result.warnings.push(`Sections not found: ${notFound.join(", ")}`);
  }

  return result;
}

/**
 * Build an excerpt from search results.
 * Extracts section IDs from search hits and builds a themed excerpt.
 */
export function buildExcerptFromSearchHits(
  transcript: ParsedTranscript,
  hits: Array<{ sectionNumber: number; snippet?: string }>,
  theme?: string,
): ComposedExcerpt {
  const excerptSections: ExcerptSection[] = [];
  const notFound: string[] = [];
  const seen = new Set<number>();

  for (const hit of hits) {
    if (seen.has(hit.sectionNumber)) continue;
    seen.add(hit.sectionNumber);

    const section = transcript.sections.find((s) => s.number === hit.sectionNumber);
    if (!section) {
      notFound.push(`§${hit.sectionNumber}`);
      continue;
    }

    const quoteSource =
      hit.snippet && hit.snippet.trim().length > 0
        ? hit.snippet
        : extractSectionQuote(section, 150);

    excerptSections.push({
      anchor: `§${section.number}`,
      quote: truncateToWords(quoteSource, 150),
      title: section.title,
    });
  }

  const result = composeExcerpt({
    theme,
    sections: excerptSections,
    ordering: "relevance",
    maxTotalWords: 800,
  });

  if (notFound.length > 0) {
    result.warnings.push(`Sections not found: ${notFound.join(", ")}`);
  }

  return result;
}
