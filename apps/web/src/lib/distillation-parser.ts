/**
 * Distillation Parser
 * Extracts structured data from the distillation markdown documents
 * for rendering with beautiful native React components
 */

export interface DistillationQuote {
  text: string;
  reference?: string; // § reference
}

export interface DistillationSection {
  level: 1 | 2 | 3 | 4;
  title: string;
  content: DistillationContent[];
}

export type DistillationContent =
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string; reference?: string }
  | { type: "list"; items: string[]; ordered: boolean }
  | { type: "emphasis"; text: string }
  | { type: "code"; text: string };

export interface DistillationPart {
  number: number;
  title: string;
  sections: DistillationSection[];
}

export interface ParsedDistillation {
  title: string;
  author: string;
  subtitle?: string;
  preamble?: string;
  parts: DistillationPart[];
  rawContent?: string;
  wordCount: number;
}

/**
 * Rich metadata for each distillation - hardcoded for beautiful display
 */
export interface DistillationMeta {
  name: string;
  color: string;
  icon: string;
  tagline: string;
  approach: string;
  strengths: string[];
  date: string;
}

const DISTILLATION_META: Record<string, DistillationMeta> = {
  "distillation-gpt-52": {
    name: "GPT-5.2",
    color: "from-emerald-500 to-teal-600",
    icon: "G",
    tagline: "Extra-high reasoning synthesis",
    approach: "Systematic operator extraction with Bayesian decision theory framing",
    strengths: [
      "Rigorous formalization of the evidence-per-week objective",
      "Clear loop structure with explicit decision procedures",
      "Strong emphasis on discriminative leverage and cheap experiments",
    ],
    date: "December 2025",
  },
  "distillation-opus-45": {
    name: "Claude Opus 4.5",
    color: "from-violet-500 to-purple-600",
    icon: "A",
    tagline: "Deep philosophical synthesis",
    approach: "Phenomenological analysis of Brenner's epistemological framework",
    strengths: [
      "Rich exploration of the 'third alternative' anti-binary thinking",
      "Emphasis on system selection and reusable experimental platforms",
      "Nuanced treatment of historical context and methodology evolution",
    ],
    date: "December 2025",
  },
  "distillation-gemini-3": {
    name: "Gemini 3",
    color: "from-blue-500 to-cyan-600",
    icon: "G",
    tagline: "Deep think distillation",
    approach: "Compact extraction focused on actionable operators and heuristics",
    strengths: [
      "Concise operator taxonomy with clear applicability",
      "Focus on practical decision-making frameworks",
      "Efficient synthesis of core methodological principles",
    ],
    date: "December 2025",
  },
};

/**
 * Get rich metadata for a distillation by ID
 */
export function getDistillationMeta(id: string): DistillationMeta {
  return (
    DISTILLATION_META[id] ?? {
      name: "AI Model",
      color: "from-gray-500 to-gray-600",
      icon: "?",
      tagline: "Model distillation",
      approach: "Synthesis of Brenner's methodology",
      strengths: ["Systematic analysis of the transcript"],
      date: "2025",
    }
  );
}

/**
 * Legacy function - get basic model info from ID
 */
export function getModelFromId(id: string): { name: string; color: string; icon: string } {
  const meta = getDistillationMeta(id);
  return { name: meta.name, color: meta.color, icon: meta.icon };
}

/**
 * Preserve inline formatting for content that will be rendered with styled elements.
 * Only trims whitespace, keeping markdown markers intact for the viewer.
 */
function parseInline(text: string): string {
  return text.trim();
}

/**
 * Extract § reference from quote if present
 */
function extractReference(text: string): { clean: string; reference?: string } {
  const refMatch = text.match(/\(§(\d+(?:-\d+)?)\)/);
  if (refMatch) {
    return {
      clean: text.replace(refMatch[0], "").trim(),
      reference: refMatch[1],
    };
  }
  // Also check for just § at end
  const simpleRef = text.match(/§(\d+(?:-\d+)?)/);
  if (simpleRef) {
    return {
      clean: text,
      reference: simpleRef[1],
    };
  }
  return { clean: text };
}

/**
 * Parse content blocks from lines
 */
function parseContentBlocks(lines: string[]): DistillationContent[] {
  const content: DistillationContent[] = [];
  let currentList: string[] = [];
  let listOrdered = false;
  let inQuote = false;
  let quoteLines: string[] = [];

  const flushList = () => {
    if (currentList.length > 0) {
      content.push({ type: "list", items: [...currentList], ordered: listOrdered });
      currentList = [];
    }
  };

  const flushQuote = () => {
    if (quoteLines.length > 0) {
      const fullQuote = quoteLines.join(" ");
      const { clean, reference } = extractReference(fullQuote);
      content.push({ type: "quote", text: parseInline(clean), reference });
      quoteLines = [];
      inQuote = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines (but might end blocks)
    if (!trimmed) {
      flushQuote();
      continue;
    }

    // Skip headers (handled separately)
    if (trimmed.startsWith("#")) {
      flushList();
      flushQuote();
      continue;
    }

    // Skip horizontal rules
    if (trimmed === "---" || trimmed === "***") {
      flushList();
      flushQuote();
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      flushList();
      inQuote = true;
      quoteLines.push(trimmed.replace(/^>\s*/, ""));
      continue;
    }

    // If we were in quote but hit non-quote line
    if (inQuote) {
      flushQuote();
    }

    // List item (unordered)
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (currentList.length > 0 && listOrdered) {
        flushList();
      }
      listOrdered = false;
      currentList.push(parseInline(trimmed.slice(2)));
      continue;
    }

    // List item (ordered)
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (orderedMatch) {
      if (currentList.length > 0 && !listOrdered) {
        flushList();
      }
      listOrdered = true;
      currentList.push(parseInline(orderedMatch[2]));
      continue;
    }

    // Regular paragraph
    flushList();
    content.push({ type: "paragraph", text: parseInline(trimmed) });
  }

  // Flush any remaining
  flushList();
  flushQuote();

  return content;
}

/**
 * Parse the distillation markdown
 */
export function parseDistillation(markdown: string, docId: string): ParsedDistillation {
  const model = getModelFromId(docId);

  // Extract title (first H1)
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1] ?? "Distillation";

  // Extract subtitle (first italic line)
  const subtitleMatch = markdown.match(/^\*([^*]+)\*$/m);
  const subtitle = subtitleMatch?.[1];

  // Count words
  const wordCount = markdown.split(/\s+/).filter(Boolean).length;

  // Find all PART headers
  const partRegex = /^#\s+PART\s+([IVXLC]+):\s+(.+)$/gm;
  const partMatches = [...markdown.matchAll(partRegex)];

  const parts: DistillationPart[] = [];

  // If no PART headers, treat whole doc as one part
  if (partMatches.length === 0) {
    // Parse sections directly
    const sectionRegex = /^(#{2,4})\s+(.+)$/gm;
    const sectionMatches = [...markdown.matchAll(sectionRegex)];

    const sections: DistillationSection[] = [];

    for (let i = 0; i < sectionMatches.length; i++) {
      const match = sectionMatches[i];
      const level = match[1].length as 2 | 3 | 4;
      const sectionTitle = match[2];

      const startIndex = (match.index ?? 0) + match[0].length;
      const endIndex = sectionMatches[i + 1]?.index ?? markdown.length;
      const sectionContent = markdown.slice(startIndex, endIndex);

      sections.push({
        level: (level - 1) as 1 | 2 | 3,
        title: sectionTitle,
        content: parseContentBlocks(sectionContent.split("\n")),
      });
    }

    if (sections.length > 0) {
      parts.push({ number: 1, title: "Main Content", sections });
    }
  } else {
    // Parse each PART
    const romanToNumber: Record<string, number> = {
      I: 1,
      II: 2,
      III: 3,
      IV: 4,
      V: 5,
      VI: 6,
      VII: 7,
      VIII: 8,
      IX: 9,
      X: 10,
    };

    for (let i = 0; i < partMatches.length; i++) {
      const match = partMatches[i];
      const partNum = romanToNumber[match[1]] || i + 1;
      const partTitle = match[2];

      const startIndex = (match.index ?? 0) + match[0].length;
      const endIndex = partMatches[i + 1]?.index ?? markdown.length;
      const partContent = markdown.slice(startIndex, endIndex);

      // Find sections within this part
      const sectionRegex = /^(#{2,4})\s+(.+)$/gm;
      const sectionMatches = [...partContent.matchAll(sectionRegex)];

      const sections: DistillationSection[] = [];

      for (let j = 0; j < sectionMatches.length; j++) {
        const secMatch = sectionMatches[j];
        const level = secMatch[1].length as 2 | 3 | 4;
        const sectionTitle = secMatch[2];

        // Skip if it's another PART header
        if (sectionTitle.startsWith("PART ")) continue;

        const secStart = (secMatch.index ?? 0) + secMatch[0].length;
        const secEnd = sectionMatches[j + 1]?.index ?? partContent.length;
        const sectionContent = partContent.slice(secStart, secEnd);

        sections.push({
          level: (level - 1) as 1 | 2 | 3,
          title: sectionTitle,
          content: parseContentBlocks(sectionContent.split("\n")),
        });
      }

      parts.push({ number: partNum, title: partTitle, sections });
    }
  }

  // Extract preamble (content between title and first PART/section)
  // Only use narrative preambles - skip technical metadata with lists/code
  let preamble: string | undefined;
  const preambleMatch = markdown.match(
    /^#\s+.+\n+(?:\*[^*]+\*\n+)?(?:---\n+)?([\s\S]+?)(?=^#\s+PART|^##\s+)/m,
  );
  if (preambleMatch) {
    const rawPreamble = preambleMatch[1].trim();
    // Skip if it contains bullet points, backticks, or looks like technical metadata
    const hasBullets = /^[-*]\s+/m.test(rawPreamble);
    const hasCode = /`[^`]+`/.test(rawPreamble);
    const hasFileRefs = /\.(md|ts|json|js)\b/.test(rawPreamble);
    if (!hasBullets && !hasCode && !hasFileRefs) {
      preamble = rawPreamble
        .replace(/^>\s*/gm, "") // Strip blockquote markers
        .replace(/^##\s+.+$/gm, "") // Strip section headers
        .replace(/^---+$/gm, "") // Strip horizontal rules
        .replace(/\*\*([^*]+)\*\*/g, "$1") // Strip bold markers
        .replace(/\*([^*]+)\*/g, "$1") // Strip italic markers
        .replace(/\n+/g, " ") // Join lines
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim();
      // Clear preamble if it ended up empty after stripping
      if (!preamble) preamble = undefined;
    }
  }

  const rawContent = parts.length === 0 ? markdown.trim() : undefined;

  return {
    title,
    author: model.name,
    subtitle,
    preamble,
    parts,
    rawContent,
    wordCount,
  };
}
