import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { parseQuoteBank, type Quote } from "./quotebank-parser";

/**
 * Operator Library Loader + Parser
 *
 * NOTE: This file uses Node.js APIs and must only be imported from server code.
 * Client components should fetch operator data via a server action/route.
 */

export type OperatorCardKind = "core" | "derived";

export type OperatorCard = {
  kind: OperatorCardKind;
  symbol: string;
  title: string;
  canonicalTag: string;
  quoteBankAnchors: string[];
  definition: string;
  whenToUseTriggers: string[];
  failureModes: string[];
  transcriptAnchors: string;
  promptModule: string | null;
};

// Backwards compatibility alias (formerly the core-only type)
export type OperatorDefinition = OperatorCard;

export type OperatorWithQuotes = OperatorCard & {
  quotes: Quote[];
  supportingQuotes: Quote[];
};

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function tryReadFromFilesystem(relativePathFromRepoRoot: string): Promise<string | null> {
  const cwd = process.cwd();

  const candidates = [
    // 1. Repo root direct access (CLI from root)
    resolve(cwd, relativePathFromRepoRoot),
    // 2. apps/web/public/_corpus (CLI from root, if corpus copied)
    resolve(cwd, "apps/web/public/_corpus", relativePathFromRepoRoot),
    // 3. public/_corpus (Next.js runtime / standard corpus location)
    resolve(cwd, "public/_corpus", relativePathFromRepoRoot),
    // 4. Repo root from inside apps/web (dev environment)
    resolve(cwd, "../..", relativePathFromRepoRoot),
  ];

  for (const path of candidates) {
    if (await fileExists(path)) {
      return readFile(path, "utf8");
    }
  }

  return null;
}

async function fetchFromPublicUrl(relativePathFromCorpusRoot: string): Promise<string> {
  const baseUrl = getTrustedPublicBaseUrl();
  const safePath = relativePathFromCorpusRoot.replace(/^\//, "");

  const url = new URL(`/_corpus/${safePath}`, baseUrl);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch operator library from ${url.toString()} (${response.status})`);
  }

  return response.text();
}

function getTrustedPublicBaseUrl(): string {
  const explicitBaseUrl = process.env.BRENNER_PUBLIC_BASE_URL?.trim();
  if (explicitBaseUrl) {
    return normalizeBaseUrl(explicitBaseUrl, "BRENNER_PUBLIC_BASE_URL");
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl}`;

  if (process.env.NODE_ENV === "development") return "http://localhost:3000";

  return "https://brennerbot.org";
}

function normalizeBaseUrl(value: string, envName: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${envName} must be an absolute http(s) URL (got "${value}")`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${envName} must be an absolute http(s) URL (got "${value}")`);
  }

  url.pathname = "";
  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

export async function readOperatorLibraryMarkdown(): Promise<string> {
  const relativePath = "specs/operator_library_v0.1.md";

  const fromFs = await tryReadFromFilesystem(relativePath);
  if (fromFs !== null) return fromFs;

  return fetchFromPublicUrl(relativePath);
}

export async function readQuoteBankMarkdown(): Promise<string> {
  const relativePath = "quote_bank_restored_primitives.md";

  const fromFs = await tryReadFromFilesystem(relativePath);
  if (fromFs !== null) return fromFs;

  return fetchFromPublicUrl(relativePath);
}

function parseBullets(markdown: string): string[] {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

function normalizeOperatorTitle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function parsePromptModule(block: string): string | null {
  const match = block.match(
    /\*\*Prompt module \(copy\/paste\)\*\*:\s*\n~~~text\n([\s\S]*?)\n~~~\s*/m,
  );
  return match ? match[1].trim() : null;
}

const DERIVED_CANONICAL_TAG_BY_SYMBOL: Record<string, string> = {
  "⚡": "quickie",
  "👁": "hal",
  "🎭": "potency-check",
};

function parseOperatorCardsFromSection(args: {
  kind: OperatorCardKind;
  sectionMarkdown: string;
  requireQuoteBankAnchors: boolean;
}): OperatorCard[] {
  const operatorHeaderRegex = /^###\s+(.+)$/gm;
  const headerMatches = [...args.sectionMarkdown.matchAll(operatorHeaderRegex)];

  const operators: OperatorCard[] = [];

  for (let i = 0; i < headerMatches.length; i++) {
    const match = headerMatches[i];
    const headerLine = match[1]?.trim();
    if (!headerLine) continue;

    const startIndex = (match.index ?? 0) + match[0].length;
    const endIndex = headerMatches[i + 1]?.index ?? args.sectionMarkdown.length;
    const block = args.sectionMarkdown.slice(startIndex, endIndex);

    const [symbol, ...titleParts] = headerLine.split(/\s+/);
    const title = titleParts.join(" ").trim();

    const definitionMatch = block.match(
      /\*\*Definition\*\*:\s*([\s\S]*?)(?=\n\s*\*\*When-to-Use Triggers\*\*:)/i,
    );
    const triggersMatch = block.match(
      /\*\*When-to-Use Triggers\*\*:\s*([\s\S]*?)(?=\n\s*\*\*Failure Modes\*\*:)/i,
    );
    const failureModesMatch = block.match(
      /\*\*Failure Modes\*\*:\s*([\s\S]*?)(?=\n\s*\*\*(?:Prompt module \(copy\/paste\)|Canonical tag)\*\*:)/i,
    );
    const promptModule = parsePromptModule(block);

    // Allow optional backticks for canonical tag
    // Match value on same line OR next line (but not spanning to next section)
    // Pattern: **Canonical tag**: [optional content on same line]\n[content on next line if not a section header]
    const canonicalTagMatch = block.match(
      /\*\*Canonical tag\*\*:[ \t]*`?([^`\n]*)`?(?:\r?\n(?!\*\*)([^\n]+))?/i,
    );
    const quoteBankAnchorsMatch = block.match(/\*\*Quote-bank anchors\*\*:\s*([^\n]+)/i);
    const transcriptAnchorsMatch = block.match(/\*\*Transcript Anchors\*\*:\s*([^\n]+)/i);

    if (!symbol || !title) {
      throw new Error(`Operator library: failed to parse header line: ${headerLine}`);
    }
    if (!definitionMatch) {
      throw new Error(`Operator library: missing Definition block for ${headerLine}`);
    }
    if (!triggersMatch) {
      throw new Error(`Operator library: missing When-to-Use Triggers block for ${headerLine}`);
    }
    if (!failureModesMatch) {
      throw new Error(`Operator library: missing Failure Modes block for ${headerLine}`);
    }
    if (!transcriptAnchorsMatch) {
      throw new Error(`Operator library: missing Transcript Anchors for ${headerLine}`);
    }

    // Group 1 is same-line content, group 2 is next-line content
    // Prefer same-line content if non-empty, otherwise use next-line
    const canonicalTag = canonicalTagMatch
      ? canonicalTagMatch[1]?.trim() || canonicalTagMatch[2]?.trim()
      : (DERIVED_CANONICAL_TAG_BY_SYMBOL[symbol] ?? null);

    if (!canonicalTag) {
      throw new Error(`Operator library: missing Canonical tag for ${headerLine}`);
    }

    const quoteBankAnchors = quoteBankAnchorsMatch
      ? quoteBankAnchorsMatch[1]
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean)
      : [];

    if (args.requireQuoteBankAnchors && quoteBankAnchors.length === 0) {
      throw new Error(`Operator library: missing Quote-bank anchors for ${headerLine}`);
    }

    operators.push({
      kind: args.kind,
      symbol,
      title,
      canonicalTag,
      quoteBankAnchors,
      definition: definitionMatch[1].trim().replace(/\s+/g, " "),
      whenToUseTriggers: parseBullets(triggersMatch[1]),
      failureModes: parseBullets(failureModesMatch[1]),
      transcriptAnchors: transcriptAnchorsMatch[1].trim(),
      promptModule,
    });
  }

  return operators;
}

export function parseOperatorCards(markdown: string): OperatorCard[] {
  const coreStart = markdown.indexOf("## Core Operators");
  if (coreStart === -1) {
    throw new Error("Operator library: missing '## Core Operators' section");
  }

  const derivedStart = markdown.indexOf("## Derived Operators", coreStart);
  const coreSection = markdown.slice(
    coreStart,
    derivedStart === -1 ? markdown.length : derivedStart,
  );

  const derivedSectionStart = derivedStart === -1 ? null : derivedStart;
  const compositionsStart =
    derivedSectionStart === null
      ? -1
      : markdown.indexOf("## Operator Compositions", derivedSectionStart);
  const derivedSection =
    derivedSectionStart === null
      ? ""
      : markdown.slice(
          derivedSectionStart,
          compositionsStart === -1 ? markdown.length : compositionsStart,
        );

  const cards: OperatorCard[] = [];
  cards.push(
    ...parseOperatorCardsFromSection({
      kind: "core",
      sectionMarkdown: coreSection,
      requireQuoteBankAnchors: true,
    }),
  );

  if (derivedSectionStart !== null) {
    cards.push(
      ...parseOperatorCardsFromSection({
        kind: "derived",
        sectionMarkdown: derivedSection,
        requireQuoteBankAnchors: false,
      }),
    );
  }

  return cards;
}

/**
 * Legacy compatibility wrapper.
 * Returns only core operators to match old behavior, but uses new parser.
 * @deprecated Use parseOperatorCards instead.
 */
export function parseOperatorLibrary(markdown: string): OperatorDefinition[] {
  // Ensure we still validate '## Core Operators' existence which parseOperatorCards does.
  const cards = parseOperatorCards(markdown);
  return cards.filter((c) => c.kind === "core");
}

export function resolveOperatorCard(cards: OperatorCard[], query: string): OperatorCard | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const lowered = trimmed.toLowerCase().replace(/`/g, "");
  const symbolToken = trimmed.split(/\s+/)[0] ?? "";
  const normalizedQuery = normalizeOperatorTitle(trimmed);

  const byCanonicalTag = cards.find((c) => c.canonicalTag?.toLowerCase() === lowered);
  if (byCanonicalTag) return byCanonicalTag;

  const bySymbol = cards.find((c) => c.symbol === symbolToken);
  if (bySymbol) return bySymbol;

  const byNormalizedTitle = cards.find((c) => normalizeOperatorTitle(c.title) === normalizedQuery);
  if (byNormalizedTitle) return byNormalizedTitle;

  const byContains = cards.find(
    (c) => normalizeOperatorTitle(`${c.symbol} ${c.title}`) === normalizedQuery,
  );
  if (byContains) return byContains;

  return null;
}

let operatorPaletteCache: OperatorWithQuotes[] | null = null;

/** Reset the operator palette cache (useful for testing) */
export function resetOperatorPaletteCache(): void {
  operatorPaletteCache = null;
}

export async function getOperatorPalette(): Promise<OperatorWithQuotes[]> {
  if (operatorPaletteCache) return operatorPaletteCache;

  const [operatorMd, quoteBankMd] = await Promise.all([
    readOperatorLibraryMarkdown(),
    readQuoteBankMarkdown(),
  ]);

  const operators = parseOperatorCards(operatorMd);
  const quoteBank = parseQuoteBank(quoteBankMd);

  const palette = operators.map((operator) => {
    const quotes = quoteBank.quotes.filter((q) => q.tags.includes(operator.canonicalTag));
    const supportingQuotes = quotes.filter((q) => operator.quoteBankAnchors.includes(q.sectionId));

    return {
      ...operator,
      quotes,
      supportingQuotes,
    };
  });

  operatorPaletteCache = palette;
  return palette;
}

export const __private = {
  fileExists,
  tryReadFromFilesystem,
  fetchFromPublicUrl,
  getTrustedPublicBaseUrl,
  normalizeBaseUrl,
  parseBullets,
  normalizeOperatorTitle,
  parsePromptModule,
};
