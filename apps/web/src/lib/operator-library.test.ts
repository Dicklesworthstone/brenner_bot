/**
 * Unit tests for operator-library.ts
 *
 * Uses the real operator library spec + quote bank to ensure the UI data source
 * stays schema-consistent and stays linked to tagged quotes.
 */

import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __private,
  getOperatorPalette,
  parseOperatorCards,
  parseOperatorLibrary,
  readOperatorLibraryMarkdown,
  readQuoteBankMarkdown,
  resetOperatorPaletteCache,
  resolveOperatorCard,
} from "./operator-library";

async function findRepoRoot(): Promise<string> {
  const cwd = process.cwd();
  // Check if we're running from the repo root (has specs/)
  try {
    await access(resolve(cwd, "specs/operator_library_v0.1.md"));
    return cwd;
  } catch {
    // Try apps/web's parent (../../)
    try {
      const parent = resolve(cwd, "../..");
      await access(resolve(parent, "specs/operator_library_v0.1.md"));
      return parent;
    } catch {
      // Fallback to cwd
      return cwd;
    }
  }
}

describe("operator-library", () => {
  it("parses core operators (canonical tag + quote-bank anchors)", async () => {
    const repoRoot = await findRepoRoot();
    const markdown = await readFile(resolve(repoRoot, "specs/operator_library_v0.1.md"), "utf8");

    const operators = parseOperatorLibrary(markdown);
    expect(operators.length).toBeGreaterThanOrEqual(10);

    const tags = operators.map((o) => o.canonicalTag);
    expect(tags).toContain("level-split");
    expect(tags).toContain("recode");
    expect(tags).toContain("materialize");
    expect(tags).toContain("invariant-extract");
    expect(tags).toContain("exclusion-test");
    expect(tags).toContain("scale-check");

    for (const operator of operators) {
      expect(operator.symbol.length).toBeGreaterThan(0);
      expect(operator.title.length).toBeGreaterThan(0);
      expect(operator.definition.length).toBeGreaterThan(0);
      expect(operator.quoteBankAnchors.length).toBeGreaterThan(0);
      expect(operator.whenToUseTriggers.length).toBeGreaterThan(0);
      expect(operator.failureModes.length).toBeGreaterThan(0);
      expect(operator.transcriptAnchors.length).toBeGreaterThan(0);
    }
  });

  it("parseOperatorLibrary excludes prompt-module bullets from failure modes", () => {
    const markdown = [
      "## Core Operators",
      "",
      "### ⊘ Level-Split",
      "",
      "**Definition**:",
      "X",
      "",
      "**When-to-Use Triggers**:",
      "- A",
      "",
      "**Failure Modes**:",
      "- Real failure mode",
      "",
      "**Prompt module (copy/paste)**:",
      "~~~text",
      "- hypothesis_slate (ADD)",
      "~~~",
      "",
      "**Canonical tag**: `level-split`",
      "",
      "**Quote-bank anchors**: §1",
      "",
      "**Transcript Anchors**: §1",
      "",
      "## Derived Operators",
    ].join("\n");

    const operators = parseOperatorLibrary(markdown);
    expect(operators[0]?.failureModes).toEqual(["Real failure mode"]);
  });

  it("links each operator to at least one supporting quote", async () => {
    resetOperatorPaletteCache(); // Clear any cached data from other tests
    const palette = await getOperatorPalette();
    expect(palette.length).toBeGreaterThanOrEqual(10);

    for (const operator of palette) {
      // Derived operators might not have explicit quote bank anchors yet
      if (operator.kind === "core") {
        expect(
          operator.supportingQuotes.length,
          `Operator ${operator.canonicalTag} has no supporting quotes`,
        ).toBeGreaterThan(0);
      }
      for (const quote of operator.supportingQuotes) {
        expect(quote.tags).toContain(operator.canonicalTag);
        expect(operator.quoteBankAnchors).toContain(quote.sectionId);
      }
    }
  });

  it("parses operator cards including derived operators and prompt modules", async () => {
    const repoRoot = await findRepoRoot();
    const markdown = await readFile(resolve(repoRoot, "specs/operator_library_v0.1.md"), "utf8");

    const cards = parseOperatorCards(markdown);
    expect(cards.length).toBeGreaterThanOrEqual(13); // core + derived

    const potency = cards.find((c) => c.symbol === "🎭");
    expect(potency).toBeDefined();
    expect(potency?.canonicalTag).toBe("potency-check");
    expect(potency?.promptModule).toContain("[OPERATOR: 🎭 Chastity-vs-Impotence Check]");

    const resolved = resolveOperatorCard(cards, "🎭 Potency-Check");
    expect(resolved?.symbol).toBe("🎭");
  });

  it("readOperatorLibraryMarkdown reads the operator spec markdown", async () => {
    const md = await readOperatorLibraryMarkdown();
    expect(md).toContain("## Core Operators");
  });

  it("readQuoteBankMarkdown reads the quote bank markdown", async () => {
    const md = await readQuoteBankMarkdown();
    expect(md).toMatch(/## §\d+/);
  });

  it("parseOperatorLibrary throws when Core Operators section is missing", () => {
    expect(() => parseOperatorLibrary("# Not an operator doc")).toThrow(
      /missing '## Core Operators'/,
    );
  });

  it("parseOperatorLibrary throws when required operator blocks are missing", () => {
    const minimal = [
      "## Core Operators",
      "",
      "### ⊘ Level-Split",
      "",
      "**Definition**: X",
      "",
      "**When-to-Use Triggers**:",
      "- A",
      "",
      "## Derived Operators",
    ].join("\n");

    expect(() => parseOperatorLibrary(minimal)).toThrow(/When-to-Use Triggers/);
  });

  it("parseOperatorLibrary throws when Canonical tag is missing", () => {
    const minimal = [
      "## Core Operators",
      "",
      "### ⊘ Level-Split",
      "",
      "**Definition**:",
      "X",
      "",
      "**When-to-Use Triggers**:",
      "- A",
      "",
      "**Failure Modes**:",
      "- B",
      "",
      "**Canonical tag**:",
      "",
      "**Quote-bank anchors**: §1",
      "",
      "**Transcript Anchors**: §1",
      "",
      "## Derived Operators",
    ].join("\n");

    expect(() => parseOperatorLibrary(minimal)).toThrow(/missing Canonical tag/);
  });

  it("parseOperatorLibrary throws when Quote-bank anchors are missing", () => {
    const minimal = [
      "## Core Operators",
      "",
      "### ⊘ Level-Split",
      "",
      "**Definition**:",
      "X",
      "",
      "**When-to-Use Triggers**:",
      "- A",
      "",
      "**Failure Modes**:",
      "- B",
      "",
      "**Canonical tag**: `level-split`",
      "",
      "**Transcript Anchors**: §1",
      "",
      "## Derived Operators",
    ].join("\n");

    expect(() => parseOperatorLibrary(minimal)).toThrow(/missing Quote-bank anchors/);
  });

  it("parseOperatorLibrary throws when Transcript Anchors are missing", () => {
    const minimal = [
      "## Core Operators",
      "",
      "### ⊘ Level-Split",
      "",
      "**Definition**:",
      "X",
      "",
      "**When-to-Use Triggers**:",
      "- A",
      "",
      "**Failure Modes**:",
      "- B",
      "",
      "**Canonical tag**: `level-split`",
      "",
      "**Quote-bank anchors**: §1",
      "",
      "## Derived Operators",
    ].join("\n");

    expect(() => parseOperatorLibrary(minimal)).toThrow(/missing Transcript Anchors/);
  });

  it("__private.normalizeBaseUrl strips path/query/hash and rejects bad protocols", () => {
    expect(__private.normalizeBaseUrl("https://example.com/a?b=1#c", "X")).toBe(
      "https://example.com",
    );
    expect(() => __private.normalizeBaseUrl("ftp://example.com", "X")).toThrow(/absolute http/);
  });

  it("__private.fileExists returns false for missing paths", async () => {
    await expect(__private.fileExists("/definitely-not-a-real-path")).resolves.toBe(false);
  });

  it("__private.tryReadFromFilesystem can read from repo root when public/_corpus is missing the file", async () => {
    const content = await __private.tryReadFromFilesystem("README.md");
    expect(typeof content).toBe("string");
    expect(content).toContain("Brenner");
  });

  it("__private.tryReadFromFilesystem returns null for unknown file", async () => {
    const content = await __private.tryReadFromFilesystem("definitely-not-a-real-file.md");
    expect(content).toBeNull();
  });

  it("__private.getTrustedPublicBaseUrl prefers BRENNER_PUBLIC_BASE_URL, then VERCEL_URL, then NODE_ENV=development, else production default", () => {
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

  it("__private.fetchFromPublicUrl fetches operator content from BRENNER_PUBLIC_BASE_URL", async () => {
    // Save the original fetch
    const originalFetch = globalThis.fetch;

    // Mock fetch for this test
    globalThis.fetch = async (input: unknown) => {
      const url = String(input);
      expect(url).toContain("/_corpus/specs/operator_library_v0.1.md");
      return new Response(
        "## Core Operators\n\n### ⊘ Level-Split\n\n**Definition**:\nX\n\n**When-to-Use Triggers**:\n- A\n\n**Failure Modes**:\n- B\n\n**Canonical tag**: `level-split`\n\n**Quote-bank anchors**: §1\n\n**Transcript Anchors**: §1\n",
        {
          status: 200,
          headers: { "content-type": "text/plain" },
        },
      );
    };

    const saved = process.env.BRENNER_PUBLIC_BASE_URL;
    process.env.BRENNER_PUBLIC_BASE_URL = "https://example.com";

    try {
      const md = await __private.fetchFromPublicUrl("specs/operator_library_v0.1.md");
      expect(md).toContain("## Core Operators");
    } finally {
      if (saved === undefined) delete process.env.BRENNER_PUBLIC_BASE_URL;
      else process.env.BRENNER_PUBLIC_BASE_URL = saved;
      globalThis.fetch = originalFetch;
    }
  });
});
