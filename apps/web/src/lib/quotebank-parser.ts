/**
 * Quote Bank Parser
 * Extracts structured quote data from the quote bank markdown
 */

export interface Quote {
  sectionId: string; // e.g., "§57"
  title: string;
  quote: string;
  context: string;
  tags: string[];
}

export interface ParsedQuoteBank {
  title: string;
  description: string;
  quotes: Quote[];
  allTags: string[];
}

/**
 * Parse a single quote section
 */
function parseQuoteSection(content: string): Omit<Quote, "sectionId" | "title"> | null {
  // Extract quote text (blockquote) - find all lines starting with >
  const lines = content.split("\n");
  const quoteLines: string[] = [];
  let foundQuote = false;

  for (const line of lines) {
    if (line.trim().startsWith(">")) {
      foundQuote = true;
      quoteLines.push(line.replace(/^>\s*/, "").trim());
    } else if (foundQuote && !line.trim()) {
      break; // End of quote block
    } else if (foundQuote) {
      break; // Non-quote content
    }
  }

  if (quoteLines.length === 0) return null;

  const quote = quoteLines
    .filter(Boolean)
    .join(" ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");

  // Extract "Takeaway" or "Why it matters" (both formats exist in the corpus)
  const takeawayMatch = content.match(/(?:Takeaway|Why it matters):\s*([\s\S]*?)(?:\n\s*Tags:|$)/);
  const context = takeawayMatch?.[1]?.trim().replace(/\s+/g, " ") ?? "";

  // Extract tags
  const tags: string[] = [];
  const tagsLine = content.match(/^Tags:\s*(.+)$/m)?.[1];
  if (tagsLine) {
    for (const match of tagsLine.matchAll(/`([^`]+)`/g)) {
      const tag = match[1]?.trim();
      if (tag && !tags.includes(tag)) tags.push(tag);
    }
  }

  return { quote, context, tags };
}

/**
 * Parse the complete quote bank
 */
export function parseQuoteBank(markdown: string): ParsedQuoteBank {
  // Extract title
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1] ?? "Quote Bank";

  // Extract description (first paragraph after title)
  const descMatch = markdown.match(/^#\s+.+\n+([^#\n][^\n]+)/m);
  const description = descMatch?.[1]?.trim() ?? "";

  // Find all quote sections (## §N — Title)
  const sectionRegex = /^##\s+(§\d+(?:-\d+)?)\s*[—–-]\s*(.+)$/gm;
  const sectionMatches = [...markdown.matchAll(sectionRegex)];

  const quotes: Quote[] = [];
  const allTags = new Set<string>();

  for (let i = 0; i < sectionMatches.length; i++) {
    const match = sectionMatches[i];
    const sectionId = match[1]; // §57
    const sectionTitle = match[2].trim();

    // Get content between this header and the next
    const startIndex = (match.index ?? 0) + match[0].length;
    const endIndex = sectionMatches[i + 1]?.index ?? markdown.length;
    const sectionContent = markdown.slice(startIndex, endIndex);

    const parsed = parseQuoteSection(sectionContent);
    if (parsed && parsed.quote) {
      quotes.push({
        sectionId,
        title: sectionTitle,
        quote: parsed.quote,
        context: parsed.context,
        tags: parsed.tags,
      });

      parsed.tags.forEach((tag) => allTags.add(tag));
    }
  }

  return {
    title,
    description,
    quotes,
    allTags: Array.from(allTags).sort(),
  };
}

/**
 * Filter quotes by tag
 */
export function filterQuotesByTag(quotes: Quote[], tag: string): Quote[] {
  if (!tag) return quotes;
  return quotes.filter((q) => q.tags.includes(tag));
}

/**
 * Search quotes
 */
export function searchQuotes(quotes: Quote[], query: string): Quote[] {
  const lower = query.toLowerCase();
  return quotes.filter(
    (q) =>
      q.title.toLowerCase().includes(lower) ||
      q.quote.toLowerCase().includes(lower) ||
      q.context.toLowerCase().includes(lower) ||
      q.tags.some((t) => t.toLowerCase().includes(lower)),
  );
}
