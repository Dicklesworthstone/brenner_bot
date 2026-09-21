/**
 * corpus.ts Unit Tests
 *
 * Tests corpus configuration and document loading with real implementations.
 * Philosophy: NO mocks - test against real corpus files on disk.
 *
 * Run with: cd apps/web && bun run test -- src/lib/corpus.test.ts
 */

import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  __private,
  CORPUS_DOCS,
  type CorpusDoc,
  type DocCategory,
  listCorpusDocs,
  readCorpusDoc,
} from "./corpus";

// ============================================================================
// Test Setup - Verify corpus files exist
// ============================================================================

const REQUIRED_CORPUS_FILES = [
  "complete_brenner_transcript.md",
  "quote_bank_restored_primitives.md",
  "metaprompt_by_gpt_52.md",
];

beforeAll(async () => {
  // Verify at least the core corpus files exist
  const publicCorpusDir = resolve(process.cwd(), "public/_corpus");
  for (const filename of REQUIRED_CORPUS_FILES) {
    const fullPath = resolve(publicCorpusDir, filename);
    try {
      await access(fullPath);
    } catch {
      throw new Error(
        `Required corpus file not found: ${fullPath}. ` +
          `Ensure 'bun run build' has been executed to copy corpus files.`,
      );
    }
  }
});

// ============================================================================
// CORPUS_DOCS Static Configuration Tests
// ============================================================================

describe("CORPUS_DOCS", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(CORPUS_DOCS)).toBe(true);
    expect(CORPUS_DOCS.length).toBeGreaterThan(0);
  });

  it("contains expected number of documents (17+)", () => {
    // Documented in README: "17+ files"
    expect(CORPUS_DOCS.length).toBeGreaterThanOrEqual(17);
  });

  it("every entry has required fields", () => {
    for (const doc of CORPUS_DOCS) {
      expect(doc.id).toBeTruthy();
      expect(typeof doc.id).toBe("string");
      expect(doc.title).toBeTruthy();
      expect(typeof doc.title).toBe("string");
      expect(doc.filename).toBeTruthy();
      expect(typeof doc.filename).toBe("string");
      expect(doc.category).toBeTruthy();
      expect(typeof doc.category).toBe("string");
    }
  });

  it("all document IDs are unique", () => {
    const ids = CORPUS_DOCS.map((d) => d.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("all filenames are unique", () => {
    const filenames = CORPUS_DOCS.map((d) => d.filename);
    const uniqueFilenames = new Set(filenames);
    expect(uniqueFilenames.size).toBe(filenames.length);
  });

  describe("categories are valid", () => {
    const validCategories: DocCategory[] = [
      "transcript",
      "quote-bank",
      "distillation",
      "metaprompt",
      "raw-response",
    ];

    it("all documents have valid category values", () => {
      for (const doc of CORPUS_DOCS) {
        expect(validCategories).toContain(doc.category);
      }
    });
  });

  describe("contains required primary sources", () => {
    it("has transcript document", () => {
      const transcript = CORPUS_DOCS.find((d) => d.id === "transcript");
      expect(transcript).toBeDefined();
      expect(transcript?.category).toBe("transcript");
      expect(transcript?.filename).toBe("complete_brenner_transcript.md");
    });

    it("has quote-bank document", () => {
      const quoteBank = CORPUS_DOCS.find((d) => d.id === "quote-bank");
      expect(quoteBank).toBeDefined();
      expect(quoteBank?.category).toBe("quote-bank");
      expect(quoteBank?.filename).toBe("quote_bank_restored_primitives.md");
    });

    it("has metaprompt document", () => {
      const metaprompt = CORPUS_DOCS.find((d) => d.id === "metaprompt");
      expect(metaprompt).toBeDefined();
      expect(metaprompt?.category).toBe("metaprompt");
    });
  });

  describe("contains distillations from all three models", () => {
    const expectedModels = ["gpt", "opus", "gemini"];

    for (const model of expectedModels) {
      it(`has distillation from ${model}`, () => {
        const distillation = CORPUS_DOCS.find(
          (d) => d.category === "distillation" && d.model === model,
        );
        expect(distillation).toBeDefined();
        expect(distillation?.title).toContain("Final Distillation");
      });
    }
  });

  describe("raw responses", () => {
    it("has raw responses from multiple models", () => {
      const rawResponses = CORPUS_DOCS.filter((d) => d.category === "raw-response");
      expect(rawResponses.length).toBeGreaterThan(0);

      const models = new Set(rawResponses.map((d) => d.model));
      expect(models.size).toBeGreaterThanOrEqual(3); // gpt, opus, gemini
    });
  });
});

// ============================================================================
// listCorpusDocs Tests
// ============================================================================

describe("listCorpusDocs", () => {
  it("returns the CORPUS_DOCS array", async () => {
    const docs = await listCorpusDocs();
    expect(docs).toBe(CORPUS_DOCS);
  });

  it("returns same array on multiple calls", async () => {
    const docs1 = await listCorpusDocs();
    const docs2 = await listCorpusDocs();
    expect(docs1).toBe(docs2);
  });

  it("returns a non-empty array", async () => {
    const docs = await listCorpusDocs();
    expect(docs.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// readCorpusDoc Tests
// ============================================================================

describe("readCorpusDoc", () => {
  describe("valid document IDs", () => {
    it("reads transcript document", async () => {
      const result = await readCorpusDoc("transcript");

      expect(result.doc).toBeDefined();
      expect(result.doc.id).toBe("transcript");
      expect(result.content).toBeTruthy();
      expect(typeof result.content).toBe("string");
    });

    it("returns correct doc metadata for transcript", async () => {
      const result = await readCorpusDoc("transcript");

      expect(result.doc.id).toBe("transcript");
      expect(result.doc.title).toBe("Complete Transcript Collection");
      expect(result.doc.filename).toBe("complete_brenner_transcript.md");
      expect(result.doc.category).toBe("transcript");
    });

    it("transcript content contains expected sections", async () => {
      const result = await readCorpusDoc("transcript");

      // Transcript has 236 sections per README, formatted as ## N. Title
      expect(result.content).toMatch(/## \d+\./); // Should have numbered sections
    });

    it("reads quote-bank document", async () => {
      const result = await readCorpusDoc("quote-bank");

      expect(result.doc).toBeDefined();
      expect(result.doc.id).toBe("quote-bank");
      expect(result.content).toBeTruthy();
    });

    it("reads metaprompt document", async () => {
      const result = await readCorpusDoc("metaprompt");

      expect(result.doc).toBeDefined();
      expect(result.doc.id).toBe("metaprompt");
      expect(result.content).toBeTruthy();
    });

    it("reads distillation documents", async () => {
      const distillationIds = [
        "distillation-gpt-52",
        "distillation-opus-45",
        "distillation-gemini-3",
      ];

      for (const id of distillationIds) {
        const result = await readCorpusDoc(id);
        expect(result.doc).toBeDefined();
        expect(result.doc.id).toBe(id);
        expect(result.content).toBeTruthy();
        expect(result.doc.category).toBe("distillation");
      }
    });

    it("content is markdown (starts with expected patterns)", async () => {
      const result = await readCorpusDoc("transcript");

      // Markdown typically starts with # heading or other markdown patterns
      expect(result.content).toMatch(/^(#|\*|>|[\w\s])/);
    });
  });

  describe("invalid document IDs", () => {
    it("throws for unknown document ID", async () => {
      await expect(readCorpusDoc("nonexistent-doc-id")).rejects.toThrow("Unknown doc");
    });

    it("throws for empty string ID", async () => {
      await expect(readCorpusDoc("")).rejects.toThrow("Unknown doc");
    });

    it("error message includes the invalid ID", async () => {
      await expect(readCorpusDoc("invalid-xyz")).rejects.toThrow("invalid-xyz");
    });
  });

  describe("document content integrity", () => {
    it("transcript contains significant content (not empty)", async () => {
      const result = await readCorpusDoc("transcript");
      // Transcript should be substantial (236 sections = many KB)
      expect(result.content.length).toBeGreaterThan(10000);
    });

    it("quote-bank contains quotes", async () => {
      const result = await readCorpusDoc("quote-bank");
      // Quote bank should contain quoted text
      expect(result.content).toMatch(/[""'']|>/);
    });

    it("metaprompt contains instructions", async () => {
      const result = await readCorpusDoc("metaprompt");
      // Metaprompt should contain instructional language
      expect(result.content.toLowerCase()).toMatch(/you|your|brenner|method/i);
    });
  });
});

// ============================================================================
// Type Export Tests
// ============================================================================

describe("type exports", () => {
  it("CorpusDoc type has correct shape", () => {
    const doc: CorpusDoc = {
      id: "test-id",
      title: "Test Title",
      filename: "test.md",
      category: "transcript",
    };

    expect(doc.id).toBe("test-id");
    expect(doc.title).toBe("Test Title");
    expect(doc.filename).toBe("test.md");
    expect(doc.category).toBe("transcript");
  });

  it("CorpusDoc accepts optional fields", () => {
    const doc: CorpusDoc = {
      id: "test-id",
      title: "Test Title",
      filename: "test.md",
      category: "distillation",
      description: "Optional description",
      model: "gpt",
    };

    expect(doc.description).toBe("Optional description");
    expect(doc.model).toBe("gpt");
  });

  it("DocCategory accepts valid values", () => {
    const categories: DocCategory[] = [
      "transcript",
      "quote-bank",
      "distillation",
      "metaprompt",
      "raw-response",
    ];

    for (const cat of categories) {
      expect(typeof cat).toBe("string");
    }
  });
});

// ============================================================================
// Category Filtering Tests
// ============================================================================

describe("category filtering", () => {
  it("can filter documents by transcript category", () => {
    const transcripts = CORPUS_DOCS.filter((d) => d.category === "transcript");
    expect(transcripts.length).toBeGreaterThan(0);
    expect(transcripts.every((d) => d.category === "transcript")).toBe(true);
  });

  it("can filter documents by distillation category", () => {
    const distillations = CORPUS_DOCS.filter((d) => d.category === "distillation");
    expect(distillations.length).toBe(3); // One per model
    expect(distillations.every((d) => d.category === "distillation")).toBe(true);
  });

  it("can filter documents by model", () => {
    const gptDocs = CORPUS_DOCS.filter((d) => d.model === "gpt");
    expect(gptDocs.length).toBeGreaterThan(0);
    expect(gptDocs.every((d) => d.model === "gpt")).toBe(true);
  });
});

// ============================================================================
// Internal helpers (for coverage + correctness)
// ============================================================================

describe("__private (internal helpers)", () => {
  it("normalizeBaseUrl strips path/query/hash and trailing slash", () => {
    expect(__private.normalizeBaseUrl("https://example.com/a/b?x=1#y", "X")).toBe(
      "https://example.com",
    );
    expect(__private.normalizeBaseUrl("http://example.com/", "X")).toBe("http://example.com");
  });

  it("normalizeBaseUrl rejects non-absolute or non-http(s) URLs", () => {
    expect(() => __private.normalizeBaseUrl("/relative", "X")).toThrow(/absolute http/);
    expect(() => __private.normalizeBaseUrl("ftp://example.com", "X")).toThrow(/absolute http/);
  });

  it("tryReadFromFilesystem returns content for known corpus file", async () => {
    const content = await __private.tryReadFromFilesystem("complete_brenner_transcript.md");
    expect(typeof content === "string" && content.length > 1000).toBe(true);
  });

  it("tryReadFromFilesystem can read from repo root when public/_corpus is missing the file", async () => {
    // README.md exists at repo root, but is not a corpus public asset.
    const content = await __private.tryReadFromFilesystem("README.md");
    expect(typeof content).toBe("string");
    expect(content).toContain("Brenner");
  });

  it("tryReadFromFilesystem returns null for unknown file", async () => {
    const content = await __private.tryReadFromFilesystem("definitely-not-a-real-corpus-file.md");
    expect(content).toBeNull();
  });

  it("getTrustedPublicBaseUrl prefers BRENNER_PUBLIC_BASE_URL, then VERCEL_URL, then NODE_ENV=development, else production default", () => {
    const saved = {
      BRENNER_PUBLIC_BASE_URL: process.env.BRENNER_PUBLIC_BASE_URL,
      VERCEL_URL: process.env.VERCEL_URL,
      NODE_ENV: process.env.NODE_ENV,
    };

    // Cast to mutable record for test manipulation
    const env = process.env as Record<string, string | undefined>;
    try {
      env.BRENNER_PUBLIC_BASE_URL = "https://example.com/path?x=1#y";
      delete env.VERCEL_URL;
      delete env.NODE_ENV;
      expect(__private.getTrustedPublicBaseUrl()).toBe("https://example.com");

      delete env.BRENNER_PUBLIC_BASE_URL;
      env.VERCEL_URL = "brennerbot-example.vercel.app";
      expect(__private.getTrustedPublicBaseUrl()).toBe("https://brennerbot-example.vercel.app");

      delete env.VERCEL_URL;
      env.NODE_ENV = "development";
      expect(__private.getTrustedPublicBaseUrl()).toBe("http://localhost:3000");

      env.NODE_ENV = "production";
      expect(__private.getTrustedPublicBaseUrl()).toBe("https://brennerbot.org");
    } finally {
      if (saved.BRENNER_PUBLIC_BASE_URL === undefined) delete env.BRENNER_PUBLIC_BASE_URL;
      else env.BRENNER_PUBLIC_BASE_URL = saved.BRENNER_PUBLIC_BASE_URL;
      if (saved.VERCEL_URL === undefined) delete env.VERCEL_URL;
      else env.VERCEL_URL = saved.VERCEL_URL;
      if (saved.NODE_ENV === undefined) delete env.NODE_ENV;
      else env.NODE_ENV = saved.NODE_ENV;
    }
  });

  it("fetchFromPublicUrl fetches corpus content from BRENNER_PUBLIC_BASE_URL", async () => {
    vi.stubGlobal("fetch", async (input: unknown) => {
      expect(String(input)).toContain("/_corpus/test-corpus.md");
      return new Response("hello from corpus", {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    });

    const saved = process.env.BRENNER_PUBLIC_BASE_URL;
    process.env.BRENNER_PUBLIC_BASE_URL = "https://example.com";

    try {
      const content = await __private.fetchFromPublicUrl("test-corpus.md");
      expect(content).toBe("hello from corpus");
    } finally {
      if (saved === undefined) delete process.env.BRENNER_PUBLIC_BASE_URL;
      else process.env.BRENNER_PUBLIC_BASE_URL = saved;
      vi.unstubAllGlobals();
    }
  });

  it("fetchFromPublicUrl throws on non-OK responses", async () => {
    vi.stubGlobal("fetch", async () => {
      return new Response("not found", { status: 404, headers: { "content-type": "text/plain" } });
    });

    const saved = process.env.BRENNER_PUBLIC_BASE_URL;
    process.env.BRENNER_PUBLIC_BASE_URL = "https://example.com";

    try {
      await expect(__private.fetchFromPublicUrl("missing.md")).rejects.toThrow(
        /Failed to fetch corpus file/,
      );
    } finally {
      if (saved === undefined) delete process.env.BRENNER_PUBLIC_BASE_URL;
      else process.env.BRENNER_PUBLIC_BASE_URL = saved;
      vi.unstubAllGlobals();
    }
  });
});
