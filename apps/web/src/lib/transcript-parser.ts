/**
 * Transcript Parser
 * Extracts structured data from the Brenner transcript markdown
 * for rendering with beautiful native React components
 */

export interface TranscriptContent {
  type: "brenner-quote" | "interviewer-question" | "paragraph";
  text: string;
  /** Bold text segments within the content */
  highlights?: string[];
}

export interface TranscriptSection {
  number: number;
  title: string;
  content: TranscriptContent[];
}

export interface ParsedTranscript {
  title: string;
  subtitle: string;
  totalSections: number;
  sections: TranscriptSection[];
  rawContent?: string; // Fallback for unstructured content
}

/**
 * Parse inline markdown (bold, italic) and return clean text with metadata
 */
function parseInlineFormatting(text: string): { clean: string; highlights: string[] } {
  const highlights: string[] = [];

  // Extract bold text for highlights
  // Use [\s\S] to match newlines, and strict boundaries (?=\S)...(\S) to avoid math *
  const boldMatches = text.matchAll(/\*\*(?=\S)([\s\S]*?\S)\*\*/g);
  for (const match of boldMatches) {
    highlights.push(match[1]);
  }

  // Clean the text (remove markdown formatting, [sic] markers preserved as-is)
  const clean = text
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "$1") // Remove bold markers
    .replace(/\*(?=\S)([\s\S]*?\S)\*/g, "$1") // Remove italic markers
    .trim();

  return { clean, highlights };
}

/**
 * Parse a single section's content into typed content blocks
 */
function parseSectionContent(lines: string[]): TranscriptContent[] {
  const content: TranscriptContent[] = [];
  let currentQuote: string[] = [];
  let inQuote = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      // Empty line might end a quote block
      if (inQuote && currentQuote.length > 0) {
        const fullQuote = currentQuote.join("\n\n");
        const { clean, highlights } = parseInlineFormatting(fullQuote);
        content.push({
          type: "brenner-quote",
          text: clean,
          highlights: highlights.length > 0 ? highlights : undefined,
        });
        currentQuote = [];
        inQuote = false;
      }
      continue;
    }

    // Blockquote (Brenner's words)
    if (trimmed.startsWith(">")) {
      inQuote = true;
      const quoteText = trimmed.replace(/^>\s*/, "");
      if (quoteText) {
        currentQuote.push(quoteText);
      }
      continue;
    }

    // If we were in a quote and hit non-quote line, end the quote
    if (inQuote && currentQuote.length > 0) {
      const fullQuote = currentQuote.join("\n\n");
      const { clean, highlights } = parseInlineFormatting(fullQuote);
      content.push({
        type: "brenner-quote",
        text: clean,
        highlights: highlights.length > 0 ? highlights : undefined,
      });
      currentQuote = [];
      inQuote = false;
    }

    // Interviewer question (italic with [Q])
    if (trimmed.startsWith("*[Q]") || trimmed.includes("[Q]")) {
      const questionText = trimmed
        .replace(/^\*?\[Q\]\s*/, "")
        .replace(/\*$/, "")
        .replace(/^\*/, "")
        .trim();
      if (questionText) {
        content.push({
          type: "interviewer-question",
          text: questionText,
        });
      }
      continue;
    }

    // Skip horizontal rules and empty paragraphs
    if (trimmed === "---" || trimmed === "***") {
      continue;
    }

    // Regular paragraph (rare in transcript, mostly questions without [Q])
    if (!trimmed.startsWith("#")) {
      const { clean, highlights } = parseInlineFormatting(trimmed);
      if (clean) {
        content.push({
          type: "paragraph",
          text: clean,
          highlights: highlights.length > 0 ? highlights : undefined,
        });
      }
    }
  }

  // Don't forget any remaining quote
  if (currentQuote.length > 0) {
    const fullQuote = currentQuote.join("\n\n");
    const { clean, highlights } = parseInlineFormatting(fullQuote);
    content.push({
      type: "brenner-quote",
      text: clean,
      highlights: highlights.length > 0 ? highlights : undefined,
    });
  }

  return content;
}

/**
 * Parse the complete transcript markdown into structured data
 */
export function parseTranscript(markdown: string): ParsedTranscript {
  // Extract title (first H1)
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1] ?? "Sydney Brenner Transcript";

  // Extract subtitle (first italic line after title)
  const subtitleMatch = markdown.match(/^\*([^*]+)\*$/m);
  const subtitle = subtitleMatch?.[1] ?? "";

  // Find all section headers (## N. Title)
  const sectionRegex = /^##\s+(\d+)\.\s+(.+)$/gm;
  const sectionMatches = [...markdown.matchAll(sectionRegex)];

  const sections: TranscriptSection[] = [];

  for (let i = 0; i < sectionMatches.length; i++) {
    const match = sectionMatches[i];
    const number = parseInt(match[1], 10);
    const sectionTitle = match[2];

    // Find the start and end positions for this section's content
    const startIndex = (match.index ?? 0) + match[0].length;
    const endIndex = sectionMatches[i + 1]?.index ?? markdown.length;

    // Extract the content between this header and the next
    const sectionContent = markdown.slice(startIndex, endIndex);
    const sectionLines = sectionContent.split("\n");

    sections.push({
      number,
      title: sectionTitle,
      content: parseSectionContent(sectionLines),
    });
  }

  // If no sections found, include raw content as fallback
  const rawContent = sections.length === 0 ? markdown.trim() : undefined;

  return {
    title,
    subtitle,
    totalSections: sections.length,
    sections,
    rawContent,
  };
}

/**
 * Get a subset of sections (for pagination or lazy loading)
 */
export function getTranscriptSections(
  parsed: ParsedTranscript,
  start: number,
  count: number,
): TranscriptSection[] {
  return parsed.sections.slice(start, start + count);
}

/**
 * Search transcript for a query
 */
export function searchTranscript(parsed: ParsedTranscript, query: string): TranscriptSection[] {
  const lowerQuery = query.toLowerCase();
  return parsed.sections.filter((section) => {
    if (section.title.toLowerCase().includes(lowerQuery)) return true;
    return section.content.some((c) => c.text.toLowerCase().includes(lowerQuery));
  });
}
