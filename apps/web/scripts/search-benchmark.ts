/**
 * Search Library Benchmark Script
 *
 * Evaluates FlexSearch, MiniSearch, and Fuse.js for full-text search.
 * Run with: bun scripts/search-benchmark.ts
 */

import FlexSearch from "flexsearch";
import { readFileSync } from "fs";
import Fuse from "fuse.js";
import MiniSearch from "minisearch";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// ============================================================================
// Load Corpus
// ============================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS_DIR = join(__dirname, "../../../");

const corpusFiles = [
  "complete_brenner_transcript.md",
  "final_distillation_of_brenner_method_by_opus45.md",
  "final_distillation_of_brenner_method_by_gpt_52_extra_high_reasoning.md",
  "final_distillation_of_brenner_method_by_gemini3.md",
  "quote_bank_restored_primitives.md",
  "metaprompt_by_gpt_52.md",
];

interface Document {
  id: number;
  title: string;
  content: string;
  [key: string]: string | number; // Index signature for FlexSearch compatibility
}

function loadCorpus(): Document[] {
  const docs: Document[] = [];
  let id = 0;

  for (const file of corpusFiles) {
    try {
      const content = readFileSync(join(CORPUS_DIR, file), "utf-8");
      // Split into sections/paragraphs for more granular search
      const sections = content.split(/\n#{1,3}\s+/);
      for (const section of sections) {
        if (section.trim().length > 50) {
          docs.push({
            id: id++,
            title: file.replace(".md", ""),
            content: section.slice(0, 2000), // Limit section size
          });
        }
      }
    } catch (e) {
      console.error(`Failed to load ${file}:`, e);
    }
  }

  return docs;
}

// ============================================================================
// Benchmark Helpers
// ============================================================================

function measure<T>(name: string, fn: () => T): { result: T; time: number } {
  const start = performance.now();
  const result = fn();
  const time = performance.now() - start;
  return { result, time };
}

// ============================================================================
// Test Queries
// ============================================================================

const testQueries = [
  "C. elegans",
  "genetics",
  "exclusion testing",
  "molecular biology",
  "Sydney Brenner",
  "Nobel Prize",
  "worm",
  "hypothesis",
  "experiment",
  "level-splitting",
];

// ============================================================================
// FlexSearch Benchmark
// ============================================================================

async function benchmarkFlexSearch(docs: Document[]) {
  console.log("\n=== FlexSearch ===");

  // Build index
  const indexBuild = measure("Index Build", () => {
    const index = new FlexSearch.Document({
      document: {
        id: "id",
        index: ["title", "content"],
        store: ["title", "content"],
      },
      tokenize: "forward",
      cache: true,
    });

    for (const doc of docs) {
      index.add(doc);
    }

    return index;
  });

  console.log(`Index build time: ${indexBuild.time.toFixed(2)}ms`);

  // Search benchmarks
  const searchTimes: number[] = [];
  const results: Array<{ query: string; count: number }> = [];

  for (const query of testQueries) {
    const search = measure(query, () => {
      return indexBuild.result.search(query, { limit: 10 });
    });
    searchTimes.push(search.time);
    const resultCount = search.result.reduce((sum: number, item: unknown) => {
      if (!item || typeof item !== "object") return sum;
      const record = item as { result?: unknown };
      if (!Array.isArray(record.result)) return sum;
      return sum + record.result.length;
    }, 0);
    results.push({ query, count: resultCount });
  }

  const avgSearchTime = searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length;
  console.log(`Average search time: ${avgSearchTime.toFixed(2)}ms`);
  console.log(`Max search time: ${Math.max(...searchTimes).toFixed(2)}ms`);

  // Index size (approximate - FlexSearch export is complex)
  console.log(`Index size: N/A (FlexSearch uses async export)`);

  return { buildTime: indexBuild.time, avgSearchTime, results };
}

// ============================================================================
// MiniSearch Benchmark
// ============================================================================

function benchmarkMiniSearch(docs: Document[]) {
  console.log("\n=== MiniSearch ===");

  // Build index
  const indexBuild = measure("Index Build", () => {
    const miniSearch = new MiniSearch({
      fields: ["title", "content"],
      storeFields: ["title", "content"],
    });
    miniSearch.addAll(docs);
    return miniSearch;
  });

  console.log(`Index build time: ${indexBuild.time.toFixed(2)}ms`);

  // Search benchmarks
  const searchTimes: number[] = [];
  const results: Array<{ query: string; count: number }> = [];

  for (const query of testQueries) {
    const search = measure(query, () => {
      return indexBuild.result.search(query, { prefix: true });
    });
    searchTimes.push(search.time);
    results.push({ query, count: search.result.length });
  }

  const avgSearchTime = searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length;
  console.log(`Average search time: ${avgSearchTime.toFixed(2)}ms`);
  console.log(`Max search time: ${Math.max(...searchTimes).toFixed(2)}ms`);

  // Index size
  const exported = measure("Export", () => {
    return JSON.stringify(indexBuild.result.toJSON());
  });
  console.log(`Index size: ${(exported.result.length / 1024).toFixed(2)}KB`);

  return { buildTime: indexBuild.time, avgSearchTime, results };
}

// ============================================================================
// Fuse.js Benchmark
// ============================================================================

function benchmarkFuse(docs: Document[]) {
  console.log("\n=== Fuse.js ===");

  // Build index
  const indexBuild = measure("Index Build", () => {
    return new Fuse(docs, {
      keys: ["title", "content"],
      threshold: 0.3,
      includeScore: true,
    });
  });

  console.log(`Index build time: ${indexBuild.time.toFixed(2)}ms`);

  // Search benchmarks
  const searchTimes: number[] = [];
  const results: Array<{ query: string; count: number }> = [];

  for (const query of testQueries) {
    const search = measure(query, () => {
      return indexBuild.result.search(query);
    });
    searchTimes.push(search.time);
    results.push({ query, count: search.result.length });
  }

  const avgSearchTime = searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length;
  console.log(`Average search time: ${avgSearchTime.toFixed(2)}ms`);
  console.log(`Max search time: ${Math.max(...searchTimes).toFixed(2)}ms`);

  // Fuse doesn't have a serializable index in the same way
  console.log(`Index size: N/A (Fuse uses in-memory index)`);

  return { buildTime: indexBuild.time, avgSearchTime, results };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log("Loading corpus...");
  const docs = loadCorpus();
  console.log(`Loaded ${docs.length} documents`);
  console.log(`Total content size: ${docs.reduce((sum, d) => sum + d.content.length, 0)} chars`);

  const flexResults = await benchmarkFlexSearch(docs);
  const miniResults = benchmarkMiniSearch(docs);
  const fuseResults = benchmarkFuse(docs);

  // Summary table
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));
  console.log("\n| Library     | Build Time | Avg Search | Max Search |");
  console.log("|-------------|------------|------------|------------|");
  console.log(
    `| FlexSearch  | ${flexResults.buildTime.toFixed(0).padStart(7)}ms | ${flexResults.avgSearchTime.toFixed(2).padStart(7)}ms | ${Math.max(
      ...testQueries.map((_, i) => flexResults.results[i]?.count || 0),
    )
      .toString()
      .padStart(10)} |`,
  );
  console.log(
    `| MiniSearch  | ${miniResults.buildTime.toFixed(0).padStart(7)}ms | ${miniResults.avgSearchTime.toFixed(2).padStart(7)}ms | ${Math.max(
      ...testQueries.map((_, i) => miniResults.results[i]?.count || 0),
    )
      .toString()
      .padStart(10)} |`,
  );
  console.log(
    `| Fuse.js     | ${fuseResults.buildTime.toFixed(0).padStart(7)}ms | ${fuseResults.avgSearchTime.toFixed(2).padStart(7)}ms | ${Math.max(
      ...testQueries.map((_, i) => fuseResults.results[i]?.count || 0),
    )
      .toString()
      .padStart(10)} |`,
  );

  // Result counts per query
  console.log("\n| Query               | FlexSearch | MiniSearch | Fuse.js |");
  console.log("|---------------------|------------|------------|---------|");
  for (let i = 0; i < testQueries.length; i++) {
    const q = testQueries[i].padEnd(19);
    const f = (flexResults.results[i]?.count || 0).toString().padStart(10);
    const m = (miniResults.results[i]?.count || 0).toString().padStart(10);
    const fu = (fuseResults.results[i]?.count || 0).toString().padStart(7);
    console.log(`| ${q} | ${f} | ${m} | ${fu} |`);
  }

  // Recommendation
  console.log("\n" + "=".repeat(60));
  console.log("RECOMMENDATION");
  console.log("=".repeat(60));

  if (
    miniResults.avgSearchTime < flexResults.avgSearchTime &&
    miniResults.avgSearchTime < fuseResults.avgSearchTime
  ) {
    console.log("\nMiniSearch is recommended based on:");
    console.log("- Fastest average search time");
    console.log("- Smallest bundle size (~7KB gzipped)");
    console.log("- Simple, clean API");
    console.log("- Built-in prefix matching for search-as-you-type");
    console.log("- Easy serialization for prebuilt indexes");
  } else if (flexResults.avgSearchTime < miniResults.avgSearchTime) {
    console.log("\nFlexSearch is recommended based on:");
    console.log("- Fast search times");
    console.log("- Memory efficient for larger datasets");
    console.log("- Async search option for non-blocking");
  } else {
    console.log("\nFuse.js is recommended based on:");
    console.log("- Good fuzzy matching");
    console.log("- Simple API");
  }
}

main().catch(console.error);
