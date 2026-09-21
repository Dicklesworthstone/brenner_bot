/**
 * Generate embeddings for Brenner corpus content.
 *
 * This script builds a deterministic, local-first embedding index that can be
 * loaded by the web app for semantic search without external API calls.
 */

import { readFile, writeFile } from "fs/promises";
import path from "path";
import { OPERATOR_DOCUMENTATION } from "../src/lib/brenner-loop/operators/docs";
import {
  EMBEDDING_DIMENSION,
  EMBEDDING_INDEX_VERSION,
  type EmbeddingEntry,
  type EmbeddingIndex,
  embedText,
} from "../src/lib/brenner-loop/search/embeddings";

interface SectionBlock {
  section: number;
  lines: string[];
}

interface DistillationBlock {
  heading: string;
  lines: string[];
}

const REPO_ROOT = path.resolve(process.cwd(), "../..");
const OUTPUT_PATH = path.resolve(process.cwd(), "public", "embeddings.json");

const TRANSCRIPT_PATH = path.join(REPO_ROOT, "complete_brenner_transcript.md");
const QUOTE_BANK_PATH = path.join(REPO_ROOT, "quote_bank_restored_primitives.md");
const DISTILLATION_PATHS = [
  {
    source: "gpt",
    path: path.join(
      REPO_ROOT,
      "final_distillation_of_brenner_method_by_gpt_52_extra_high_reasoning.md",
    ),
  },
  {
    source: "gemini",
    path: path.join(REPO_ROOT, "final_distillation_of_brenner_method_by_gemini3.md"),
  },
  {
    source: "opus",
    path: path.join(REPO_ROOT, "final_distillation_of_brenner_method_by_opus45.md"),
  },
];

async function main(): Promise<void> {
  const [transcriptText, quoteBankText, distillationTexts] = await Promise.all([
    readFile(TRANSCRIPT_PATH, "utf8"),
    readFile(QUOTE_BANK_PATH, "utf8"),
    Promise.all(
      DISTILLATION_PATHS.map(async (entry) => ({
        source: entry.source,
        text: await readFile(entry.path, "utf8"),
      })),
    ),
  ]);

  const transcriptEntries = buildTranscriptEntries(transcriptText);
  const quoteEntries = buildQuoteEntries(quoteBankText);
  const distillationEntries = distillationTexts.flatMap((entry) =>
    buildDistillationEntries(entry.text, entry.source),
  );
  const operatorEntries = buildOperatorEntries();

  const entries: EmbeddingEntry[] = [
    ...transcriptEntries,
    ...distillationEntries,
    ...quoteEntries,
    ...operatorEntries,
  ];

  const index: EmbeddingIndex = {
    version: EMBEDDING_INDEX_VERSION,
    dimension: EMBEDDING_DIMENSION,
    entries,
  };

  await writeFile(OUTPUT_PATH, JSON.stringify(index));

  console.log("Embeddings generated:");
  console.log(`- Transcript chunks: ${transcriptEntries.length}`);
  console.log(`- Distillation chunks: ${distillationEntries.length}`);
  console.log(`- Quote entries: ${quoteEntries.length}`);
  console.log(`- Operator entries: ${operatorEntries.length}`);
  console.log(`- Total entries: ${entries.length}`);
  console.log(`- Output: ${OUTPUT_PATH}`);
}

function buildTranscriptEntries(markdown: string): EmbeddingEntry[] {
  const sections = parseSections(markdown);
  const entries: EmbeddingEntry[] = [];

  for (const block of sections) {
    const paragraphs = toParagraphs(block.lines);
    let paragraphIndex = 0;

    for (const paragraph of paragraphs) {
      const cleaned = normalizeText(paragraph);
      if (!isMeaningful(cleaned)) continue;

      paragraphIndex += 1;
      entries.push({
        id: `transcript-${block.section}-${paragraphIndex}`,
        text: cleaned,
        section: block.section,
        source: "transcript",
        embedding: embedText(cleaned),
      });
    }
  }

  return entries;
}

function buildQuoteEntries(markdown: string): EmbeddingEntry[] {
  const sections = parseSections(markdown);
  const entries: EmbeddingEntry[] = [];

  for (const block of sections) {
    const lines = block.lines;
    const quoteLines = lines.filter((line) => line.trim().startsWith(">"));
    const takeawayLine = lines.find((line) => line.trim().startsWith("Takeaway:"));
    const tagsLine = lines.find((line) => line.trim().startsWith("Tags:"));

    const quoteText = normalizeText(stripBlockquotes(quoteLines.join("\n")));
    const takeawayText = takeawayLine
      ? normalizeText(takeawayLine.trim().replace(/^Takeaway:\s*/, ""))
      : "";
    const tagsText = tagsLine ? normalizeText(tagsLine.trim().replace(/^Tags:\s*/, "")) : "";

    const combined = [
      quoteText,
      takeawayText && `Takeaway: ${takeawayText}`,
      tagsText && `Tags: ${tagsText}`,
    ]
      .filter(Boolean)
      .join("\n");

    if (!isMeaningful(combined)) continue;

    entries.push({
      id: `quote-${block.section}`,
      text: combined,
      section: block.section,
      source: "quote",
      embedding: embedText(combined),
    });
  }

  return entries;
}

function buildDistillationEntries(markdown: string, source: string): EmbeddingEntry[] {
  const blocks = parseDistillationBlocks(markdown);
  const entries: EmbeddingEntry[] = [];

  blocks.forEach((block, index) => {
    const combined = normalizeText([block.heading, ...block.lines].join("\n"));
    if (!isMeaningful(combined)) return;

    entries.push({
      id: `distillation-${source}-${index + 1}`,
      text: combined,
      source: "distillation",
      embedding: embedText(combined),
    });
  });

  return entries;
}

function buildOperatorEntries(): EmbeddingEntry[] {
  return Object.values(OPERATOR_DOCUMENTATION).map((doc) => {
    const combined = normalizeText(
      [
        doc.concept,
        doc.explanation,
        `Key question: ${doc.keyQuestion}`,
        `When to use: ${doc.whenToUse.join("; ")}`,
        doc.whenNotToUse?.length ? `When not to use: ${doc.whenNotToUse.join("; ")}` : "",
        `Brenner example: ${doc.brennerExample.title}. ${doc.brennerExample.description}`,
        doc.commonMistakes.length ? `Common mistakes: ${doc.commonMistakes.join("; ")}` : "",
        doc.successCriteria.length ? `Success criteria: ${doc.successCriteria.join("; ")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );

    return {
      id: `operator-${doc.type}`,
      text: combined,
      source: "operator",
      embedding: embedText(combined),
    };
  });
}

function parseSections(markdown: string): SectionBlock[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: SectionBlock[] = [];
  let current: SectionBlock | null = null;

  for (const line of lines) {
    const match = line.match(/^##\s+(?:§)?(\d+)\b/);
    if (match) {
      if (current) blocks.push(current);
      current = { section: Number(match[1]), lines: [] };
      continue;
    }

    if (current) {
      current.lines.push(line);
    }
  }

  if (current) blocks.push(current);
  return blocks;
}

function parseDistillationBlocks(markdown: string): DistillationBlock[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: DistillationBlock[] = [];
  let current: DistillationBlock | null = null;

  for (const line of lines) {
    const match = line.match(/^#{2,4}\s+(.+)/);
    if (match) {
      if (current) blocks.push(current);
      current = { heading: match[1].trim(), lines: [] };
      continue;
    }

    if (current) {
      current.lines.push(line);
    }
  }

  if (current) blocks.push(current);
  return blocks;
}

function toParagraphs(lines: string[]): string[] {
  const raw = lines.join("\n");
  return raw
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

function stripBlockquotes(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/^>\s?/, "").trim())
    .join(" ");
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function isMeaningful(text: string): boolean {
  return text.replace(/[^a-z0-9]/gi, "").length >= 40;
}

main().catch((error) => {
  console.error("Embedding generation failed:", error);
  process.exitCode = 1;
});
