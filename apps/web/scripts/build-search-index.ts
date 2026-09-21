#!/usr/bin/env bun
/**
 * Search Index Generation Script
 *
 * Builds a MiniSearch index from the corpus at build time.
 * Run with: bun scripts/build-search-index.ts
 *
 * @see brenner_bot-719
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import MiniSearch from "minisearch";
import {
  makeDistillationSectionDomId,
  makeTranscriptSectionDomId,
  quoteBankDomIdFromSectionId,
  slugifyHeadingForAnchor,
} from "../src/lib/anchors";
import { CORPUS_DOCS, type DocCategory } from "../src/lib/corpus";
import { parseDistillation } from "../src/lib/distillation-parser";
import { parseMetaprompt } from "../src/lib/metaprompt-parser";
import { parseQuoteBank } from "../src/lib/quotebank-parser";
// Import parsers - use relative paths for build script
import { parseTranscript } from "../src/lib/transcript-parser";

// ============================================================================
// Types
// ============================================================================

export interface SearchEntry {
  /** Unique identifier for this entry */
  id: string;
  /** Document ID for linking (e.g., "transcript", "distillation-opus-45") */
  docId: string;
  /** Document title for display */
  docTitle: string;
  /** Section title if applicable */
  sectionTitle?: string;
  /** Searchable text content */
  content: string;
  /** URL anchor for deep linking (e.g., "#section-42") */
  anchor?: string;
  /** Document category for filtering */
  category: DocCategory;
  /** Section number for transcripts */
  sectionNumber?: number;
  /** Quote reference for quote bank (e.g., "§57") */
  reference?: string;
}

interface IndexStats {
  totalEntries: number;
  byCategory: Record<string, number>;
  indexSizeBytes: number;
}

// ============================================================================
// Configuration
// ============================================================================

// Use import.meta.url for cross-runtime compatibility (works in Bun and Node).
// NOTE: fileURLToPath avoids Windows "/C:/" paths and percent-encoded characters in URL.pathname.
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");
const OUTPUT_DIR = resolve(__dirname, "../public/search");
const OUTPUT_FILE = join(OUTPUT_DIR, "index.json");
const STATS_FILE = join(OUTPUT_DIR, "stats.json");
const SECTIONS_FILE = join(OUTPUT_DIR, "sections.json");

// Section metadata for tooltips (number -> { title, excerpt })
interface SectionMeta {
  t: string; // title (shortened key for file size)
  e: string; // excerpt (shortened key for file size)
}

// Documents to index (skip raw responses for cleaner search)
const INDEXABLE_CATEGORIES: DocCategory[] = [
  "transcript",
  "quote-bank",
  "distillation",
  "metaprompt",
];

// ============================================================================
// Document Processing
// ============================================================================

const readCorpusFile = (filename: string): string => {
  // Try public/_corpus first (for build process)
  const publicPath = join(__dirname, "../public/_corpus", filename);
  if (existsSync(publicPath)) {
    return readFileSync(publicPath, "utf-8");
  }

  // Try repo root (for development)
  const repoPath = join(REPO_ROOT, filename);
  if (existsSync(repoPath)) {
    return readFileSync(repoPath, "utf-8");
  }

  throw new Error(`Corpus file not found: ${filename}`);
};

const processTranscript = (docId: string, docTitle: string, content: string): SearchEntry[] => {
  const entries: SearchEntry[] = [];
  const parsed = parseTranscript(content);

  for (const section of parsed.sections) {
    // Combine all content in the section
    const textParts: string[] = [];
    for (const item of section.content) {
      textParts.push(item.text);
    }

    entries.push({
      id: `${docId}-section-${section.number}`,
      docId,
      docTitle,
      sectionTitle: section.title,
      content: textParts.join(" "),
      anchor: `#${makeTranscriptSectionDomId(section.number)}`,
      category: "transcript",
      sectionNumber: section.number,
    });
  }

  return entries;
};

const processDistillation = (docId: string, docTitle: string, content: string): SearchEntry[] => {
  const entries: SearchEntry[] = [];
  const parsed = parseDistillation(content, docId);
  const includePartPrefix = parsed.parts.length > 1;

  let entryIndex = 0;
  for (const part of parsed.parts) {
    for (const section of part.sections) {
      // Extract text from content blocks
      const textParts: string[] = [];
      for (const block of section.content) {
        if (block.type === "paragraph") {
          textParts.push(block.text);
        } else if (block.type === "quote") {
          textParts.push(block.text);
        } else if (block.type === "list") {
          textParts.push(block.items.join(" "));
        } else if (block.type === "emphasis" || block.type === "code") {
          textParts.push(block.text);
        }
      }

      const domId = makeDistillationSectionDomId({
        title: section.title,
        partNumber: includePartPrefix ? part.number : undefined,
        index: entryIndex,
      });

      entries.push({
        id: `${docId}-section-${entryIndex++}`,
        docId,
        docTitle,
        sectionTitle: section.title,
        content: textParts.join(" "),
        anchor: `#${domId}`,
        category: "distillation",
      });
    }
  }

  // Also add preamble if present
  if (parsed.preamble) {
    entries.push({
      id: `${docId}-preamble`,
      docId,
      docTitle,
      sectionTitle: "Introduction",
      content: parsed.preamble,
      anchor: "#introduction",
      category: "distillation",
    });
  }

  return entries;
};

const processQuoteBank = (docId: string, docTitle: string, content: string): SearchEntry[] => {
  const entries: SearchEntry[] = [];
  const parsed = parseQuoteBank(content);

  let entryIndex = 0;
  for (const quote of parsed.quotes) {
    const domId = quoteBankDomIdFromSectionId(quote.sectionId);

    entries.push({
      id: `${docId}-${entryIndex++}-${quote.sectionId}`,
      docId,
      docTitle,
      sectionTitle: quote.title,
      content: `${quote.quote} ${quote.context} ${quote.tags.join(" ")}`,
      anchor: `#${domId}`,
      category: "quote-bank",
      reference: quote.sectionId,
    });
  }

  return entries;
};

const processMetaprompt = (docId: string, docTitle: string, content: string): SearchEntry[] => {
  const entries: SearchEntry[] = [];
  const parsed = parseMetaprompt(content);

  let entryIndex = 0;
  for (const section of parsed.sections) {
    const sectionAnchor = slugifyHeadingForAnchor(section.title) || `section-${entryIndex}`;

    entries.push({
      id: `${docId}-section-${entryIndex++}`,
      docId,
      docTitle,
      sectionTitle: section.title,
      content: section.content,
      anchor: `#${sectionAnchor}`,
      category: "metaprompt",
    });
  }

  return entries;
};

// ============================================================================
// Index Building
// ============================================================================

/**
 * Extract first N words from content as an excerpt
 */
const makeExcerpt = (content: string, wordLimit = 40): string => {
  const words = content.split(/\s+/).slice(0, wordLimit);
  let excerpt = words.join(" ");
  if (content.split(/\s+/).length > wordLimit) {
    excerpt += "…";
  }
  return excerpt;
};

/**
 * Build section metadata for tooltips from transcript entries
 */
const buildSectionsMeta = (entries: SearchEntry[]): Record<number, SectionMeta> => {
  const sections: Record<number, SectionMeta> = {};

  for (const entry of entries) {
    if (entry.category === "transcript" && entry.sectionNumber !== undefined) {
      sections[entry.sectionNumber] = {
        t: entry.sectionTitle || `Section ${entry.sectionNumber}`,
        e: makeExcerpt(entry.content, 50),
      };
    }
  }

  return sections;
};

const buildIndex = (): {
  entries: SearchEntry[];
  miniSearchIndex: object;
  stats: IndexStats;
  buildTimeMs: number;
  sectionsMeta: Record<number, SectionMeta>;
} => {
  const startTime = Date.now();
  const entries: SearchEntry[] = [];
  const byCategory: Record<string, number> = {};

  console.log("Building search index...\n");

  // Process each document
  for (const doc of CORPUS_DOCS) {
    if (!INDEXABLE_CATEGORIES.includes(doc.category)) {
      console.log(`  Skipping ${doc.id} (category: ${doc.category})`);
      continue;
    }

    console.log(`  Processing ${doc.id}...`);

    try {
      const content = readCorpusFile(doc.filename);
      let docEntries: SearchEntry[] = [];

      switch (doc.category) {
        case "transcript":
          docEntries = processTranscript(doc.id, doc.title, content);
          break;
        case "distillation":
          docEntries = processDistillation(doc.id, doc.title, content);
          break;
        case "quote-bank":
          docEntries = processQuoteBank(doc.id, doc.title, content);
          break;
        case "metaprompt":
          docEntries = processMetaprompt(doc.id, doc.title, content);
          break;
      }

      entries.push(...docEntries);
      byCategory[doc.category] = (byCategory[doc.category] || 0) + docEntries.length;
      console.log(`    → ${docEntries.length} entries`);
    } catch (error) {
      console.error(`    ✗ Error: ${error}`);
    }
  }

  console.log(`\n  Total entries: ${entries.length}`);

  // Build MiniSearch index
  console.log("\n  Building MiniSearch index...");

  const miniSearch = new MiniSearch<SearchEntry>({
    fields: ["content", "sectionTitle", "docTitle"],
    storeFields: [
      "docId",
      "docTitle",
      "sectionTitle",
      "anchor",
      "category",
      "sectionNumber",
      "reference",
    ],
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      boost: { sectionTitle: 2, docTitle: 1.5, content: 1 },
    },
  });

  miniSearch.addAll(entries);

  const miniSearchIndex = miniSearch.toJSON();
  const indexJson = JSON.stringify(miniSearchIndex);
  const buildTimeMs = Date.now() - startTime;

  const stats: IndexStats = {
    totalEntries: entries.length,
    byCategory,
    indexSizeBytes: Buffer.byteLength(indexJson, "utf-8"),
  };

  console.log(`  Index size: ${(stats.indexSizeBytes / 1024).toFixed(2)} KB`);
  console.log(`  Build time: ${buildTimeMs}ms`);

  // Build section metadata for tooltips
  console.log("\n  Building section metadata for tooltips...");
  const sectionsMeta = buildSectionsMeta(entries);
  console.log(`    → ${Object.keys(sectionsMeta).length} sections`);

  return { entries, miniSearchIndex, stats, buildTimeMs, sectionsMeta };
};

// ============================================================================
// Main
// ============================================================================

const main = (): void => {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║           SEARCH INDEX BUILDER                           ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}\n`);
  }

  // Build the index
  const { miniSearchIndex, stats, buildTimeMs, sectionsMeta } = buildIndex();

  // Write index file
  writeFileSync(OUTPUT_FILE, JSON.stringify(miniSearchIndex) + "\n");
  console.log(`\n✓ Index written to: ${OUTPUT_FILE}`);

  // Write stats file
  writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2) + "\n");
  console.log(`✓ Stats written to: ${STATS_FILE}`);

  // Write sections metadata file
  const sectionsJson = JSON.stringify(sectionsMeta);
  writeFileSync(SECTIONS_FILE, sectionsJson + "\n");
  console.log(
    `✓ Sections written to: ${SECTIONS_FILE} (${(Buffer.byteLength(sectionsJson, "utf-8") / 1024).toFixed(2)} KB)`,
  );

  // Summary
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║                    BUILD COMPLETE                        ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log(`║  Total entries: ${String(stats.totalEntries).padEnd(42)}║`);
  console.log(`║  Index size: ${((stats.indexSizeBytes / 1024).toFixed(2) + " KB").padEnd(45)}║`);
  console.log(`║  Build time: ${(buildTimeMs + "ms").padEnd(45)}║`);
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  By category:                                            ║");
  for (const [category, count] of Object.entries(stats.byCategory)) {
    console.log(`║    ${category}: ${String(count).padEnd(48)}║`);
  }
  console.log("╚══════════════════════════════════════════════════════════╝\n");
};

main();
