/**
 * Transcript Parser
 *
 * Parses the Brenner transcript (complete_brenner_transcript.md) into
 * structured sections following corpus_data_model_v0.1.md specification.
 */

// ============================================================================
// Types (from corpus_data_model_v0.1.md)
// ============================================================================

export interface Section {
  // === Identity ===
  id: string; // Stable ID: "{sourceId}:§{n}" e.g., "transcript:§42"
  sectionNumber: number; // The integer N in §N (1-236 for main transcript)
  anchor: string; // The display anchor: "§42"

  // === Content ===
  title: string; // Section heading, e.g., "Coming from Eastern European stock"
  body: string; // Full markdown body (blockquotes, questions, etc.)
  plainText: string; // Body stripped of markdown for search indexing

  // === Source ===
  sourceId: string; // Parent document ID: "transcript", "quote-bank", etc.
  sourceTitle: string; // Parent document title for display

  // === Metadata ===
  lineStart: number; // 1-indexed line number where section starts in source
  lineEnd: number; // 1-indexed line number where section ends
  charStart: number; // 0-indexed character offset in source
  charEnd: number; // 0-indexed character offset (exclusive)
  wordCount: number; // Approximate word count of body
}

export interface ParseResult {
  sections: Section[];
  errors: ParseError[];
  stats: ParseStats;
}

export interface ParseError {
  type: "warning" | "error";
  message: string;
  line?: number;
}

export interface ParseStats {
  sectionCount: number;
  totalWordCount: number;
  parseTimeMs: number;
}

// ============================================================================
// Constants
// ============================================================================

const SECTION_HEADER_REGEX = /^##\s+(\d+)\.\s+(.+)$/;
const EXPECTED_SECTION_COUNT = 236;
const SOURCE_ID = "transcript";
const SOURCE_TITLE = "Complete Transcript Collection";

// ============================================================================
// Parser Implementation
// ============================================================================

/**
 * Parse transcript content into structured sections.
 *
 * @param content - Raw markdown content of the transcript
 * @returns ParseResult with sections, errors, and stats
 */
export function parseTranscript(content: string): ParseResult {
  const startTime = performance.now();
  const errors: ParseError[] = [];
  const sections: Section[] = [];

  const lines = content.split("\n");
  let currentSection: Partial<Section> | null = null;
  let bodyLines: string[] = [];
  let charOffset = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1; // 1-indexed
    const match = line.match(SECTION_HEADER_REGEX);

    if (match) {
      // Save previous section if exists
      if (currentSection) {
        const body = cleanBody(bodyLines);
        sections.push(finalizeSection(currentSection, body, lineNumber - 1, charOffset));
      }

      // Start new section
      const sectionNumber = parseInt(match[1], 10);
      const title = match[2].trim();

      // Validate section number sequence
      const expectedNumber = sections.length + 1;
      if (sectionNumber !== expectedNumber) {
        errors.push({
          type: "warning",
          message: `Section number ${sectionNumber} at line ${lineNumber}, expected ${expectedNumber}`,
          line: lineNumber,
        });
      }

      currentSection = {
        sectionNumber,
        title,
        lineStart: lineNumber,
        charStart: charOffset,
        sourceId: SOURCE_ID,
        sourceTitle: SOURCE_TITLE,
      };
      bodyLines = [];
    } else if (currentSection) {
      // Skip separator lines at section boundaries
      if (line.trim() !== "---") {
        bodyLines.push(line);
      }
    }

    charOffset += line.length + 1; // +1 for newline
  }

  // Don't forget the last section
  if (currentSection) {
    const body = cleanBody(bodyLines);
    sections.push(finalizeSection(currentSection, body, lines.length, charOffset));
  }

  // Validate section count
  if (sections.length !== EXPECTED_SECTION_COUNT) {
    errors.push({
      type: "error",
      message: `Expected ${EXPECTED_SECTION_COUNT} sections, found ${sections.length}`,
    });
  }

  const endTime = performance.now();

  return {
    sections,
    errors,
    stats: {
      sectionCount: sections.length,
      totalWordCount: sections.reduce((sum, s) => sum + s.wordCount, 0),
      parseTimeMs: Math.round(endTime - startTime),
    },
  };
}

/**
 * Clean the body content by removing leading/trailing whitespace from lines
 * and collapsing multiple blank lines.
 */
function cleanBody(lines: string[]): string {
  // Remove leading blank lines
  while (lines.length > 0 && lines[0].trim() === "") {
    lines.shift();
  }

  // Remove trailing blank lines
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  return lines.join("\n");
}

/**
 * Finalize a section by computing derived fields.
 */
function finalizeSection(
  partial: Partial<Section>,
  body: string,
  lineEnd: number,
  charEnd: number,
): Section {
  const sectionNumber = partial.sectionNumber;
  const title = partial.title;
  const sourceId = partial.sourceId;
  const sourceTitle = partial.sourceTitle;
  const lineStart = partial.lineStart;
  const charStart = partial.charStart;

  if (
    sectionNumber === undefined ||
    title === undefined ||
    sourceId === undefined ||
    sourceTitle === undefined ||
    lineStart === undefined ||
    charStart === undefined
  ) {
    throw new Error("TranscriptParser: missing required section metadata while finalizing section");
  }

  const anchor = `§${sectionNumber}`;
  const id = `${sourceId}:${anchor}`;
  const plainText = stripMarkdown(body);
  const wordCount = countWords(plainText);

  return {
    id,
    sectionNumber,
    anchor,
    title,
    body,
    plainText,
    sourceId,
    sourceTitle,
    lineStart,
    lineEnd,
    charStart,
    charEnd,
    wordCount,
  };
}

/**
 * Strip markdown formatting for plain text indexing.
 */
function stripMarkdown(text: string): string {
  return (
    text
      // Remove blockquote markers
      .replace(/^>\s?/gm, "")
      // Remove italic markers for questions (handle *[Q])
      .replace(/\*\[Q\]\s*/g, "[Q] ")
      // Remove bold markers (strict: **text**)
      .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "$1")
      // Remove italic markers (strict: *text*)
      .replace(/\*(?=\S)([\s\S]*?\S)\*/g, "$1")
      // Remove inline code
      .replace(/`([^`]+)`/g, "$1")
      // Normalize whitespace
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/**
 * Count words in plain text.
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get a section by its anchor (e.g., "§42").
 */
export function getSectionByAnchor(sections: Section[], anchor: string): Section | undefined {
  return sections.find((s) => s.anchor === anchor);
}

/**
 * Get a section by its number (e.g., 42).
 */
export function getSectionByNumber(sections: Section[], num: number): Section | undefined {
  return sections.find((s) => s.sectionNumber === num);
}

/**
 * Search sections by title (case-insensitive substring match).
 */
export function searchSectionsByTitle(sections: Section[], query: string): Section[] {
  const lowerQuery = query.toLowerCase();
  return sections.filter((s) => s.title.toLowerCase().includes(lowerQuery));
}

/**
 * Search sections by body content (case-insensitive substring match).
 */
export function searchSectionsByContent(sections: Section[], query: string): Section[] {
  const lowerQuery = query.toLowerCase();
  return sections.filter((s) => s.plainText.toLowerCase().includes(lowerQuery));
}

/**
 * Validate that parsed sections match expected structure.
 */
export function validateSections(sections: Section[]): ParseError[] {
  const errors: ParseError[] = [];

  // Check count
  if (sections.length !== EXPECTED_SECTION_COUNT) {
    errors.push({
      type: "error",
      message: `Expected ${EXPECTED_SECTION_COUNT} sections, got ${sections.length}`,
    });
  }

  // Check sequential numbering
  for (let i = 0; i < sections.length; i++) {
    const expected = i + 1;
    const actual = sections[i].sectionNumber;
    if (actual !== expected) {
      errors.push({
        type: "error",
        message: `Section at index ${i} has number ${actual}, expected ${expected}`,
      });
    }
  }

  // Check for empty bodies
  for (const section of sections) {
    if (section.body.trim().length === 0) {
      errors.push({
        type: "warning",
        message: `Section ${section.anchor} has empty body`,
      });
    }
  }

  // Check for empty titles
  for (const section of sections) {
    if (section.title.trim().length === 0) {
      errors.push({
        type: "error",
        message: `Section ${section.anchor} has empty title`,
      });
    }
  }

  return errors;
}
