"use client";

import { JargonText } from "@/components/jargon-text";
import { slugifyHeadingForAnchor } from "@/lib/anchors";
import type { MetapromptSection, ParsedMetaprompt } from "@/lib/metaprompt-parser";

// ============================================================================
// HERO
// ============================================================================

interface MetapromptHeroProps {
  title: string;
  description?: string;
  wordCount: number;
}

function MetapromptHero({ title, description, wordCount }: MetapromptHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary/10 via-violet-500/5 to-transparent border border-primary/20 mb-8 sm:mb-12">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      {/* Code pattern decoration */}
      <div className="absolute bottom-4 right-8 font-mono text-xs text-primary/10 hidden lg:block">
        {"<metaprompt>"}
        <br />
        {"  <brenner-method />"}
        <br />
        {"</metaprompt>"}
      </div>

      <div className="relative px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-14">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-medium mb-4 sm:mb-6">
          <CodeIcon className="size-3.5 sm:size-4" />
          Structured Prompt
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-3 sm:mb-4 max-w-3xl">
          {title}
        </h1>

        {/* Description */}
        {description && (
          <p className="text-base sm:text-lg text-muted-foreground mb-5 sm:mb-6 max-w-2xl">
            {description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{wordCount}</span>
          <span>words</span>
          <span className="mx-1.5 sm:mx-2 text-border">•</span>
          <span className="font-semibold text-foreground">{Math.ceil(wordCount / 200)}</span>
          <span>min read</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SECTION
// ============================================================================

interface SectionProps {
  section: MetapromptSection;
  sectionId: string;
}

function Section({ section, sectionId }: SectionProps) {
  const HeadingTag = `h${section.level + 1}` as "h2" | "h3" | "h4";
  const headingClasses = {
    1: "text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4 mt-8 sm:mt-10 first:mt-0 text-foreground",
    2: "text-lg sm:text-xl lg:text-2xl font-semibold mb-2.5 sm:mb-3 mt-6 sm:mt-8 text-foreground",
    3: "text-base sm:text-lg lg:text-xl font-semibold mb-2 mt-5 sm:mt-6 text-foreground",
  };

  // Parse content into paragraphs, lists, and code blocks
  const contentParts = parseContent(section.content);

  return (
    <section id={sectionId} className="scroll-mt-20 sm:scroll-mt-24">
      <HeadingTag className={headingClasses[section.level as 1 | 2 | 3] || headingClasses[3]}>
        {section.title}
      </HeadingTag>

      <div className="space-y-3 sm:space-y-4">
        {contentParts.map((part, i) => (
          <ContentPart key={i} part={part} />
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// CONTENT PARSING
// ============================================================================

type ContentPart =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; ordered: boolean }
  | { type: "blockquote"; text: string }
  | { type: "code"; text: string };

function parseContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const lines = content.split("\n");

  let currentList: string[] = [];
  let listOrdered = false;
  let currentParagraph: string[] = [];
  let inBlockquote = false;
  let blockquoteLines: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(" ").trim();
      if (text) {
        parts.push({ type: "paragraph", text: cleanInline(text) });
      }
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (currentList.length > 0) {
      parts.push({ type: "list", items: [...currentList], ordered: listOrdered });
      currentList = [];
    }
  };

  const flushBlockquote = () => {
    if (blockquoteLines.length > 0) {
      parts.push({ type: "blockquote", text: cleanInline(blockquoteLines.join(" ")) });
      blockquoteLines = [];
      inBlockquote = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushBlockquote();
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      flushParagraph();
      flushList();
      inBlockquote = true;
      blockquoteLines.push(trimmed.replace(/^>\s*/, ""));
      continue;
    }

    if (inBlockquote) {
      flushBlockquote();
    }

    // Unordered list
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      flushParagraph();
      if (currentList.length > 0 && listOrdered) {
        flushList();
      }
      listOrdered = false;
      currentList.push(cleanInline(trimmed.slice(2)));
      continue;
    }

    // Ordered list
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      if (currentList.length > 0 && !listOrdered) {
        flushList();
      }
      listOrdered = true;
      currentList.push(cleanInline(orderedMatch[2]));
      continue;
    }

    // Regular text
    flushList();
    currentParagraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  flushBlockquote();

  return parts;
}

function cleanInline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function ContentPart({ part }: { part: ContentPart }) {
  switch (part.type) {
    case "paragraph":
      return (
        <p className="text-[15px] sm:text-base lg:text-lg leading-relaxed text-foreground/85">
          <JargonText>{part.text}</JargonText>
        </p>
      );

    case "blockquote":
      return (
        <blockquote className="pl-4 sm:pl-6 py-2.5 sm:py-3 border-l-4 border-primary/40 bg-primary/5 rounded-r-lg sm:rounded-r-xl italic text-foreground/80 text-[15px] sm:text-base">
          <JargonText>{part.text}</JargonText>
        </blockquote>
      );

    case "list":
      if (part.ordered) {
        return (
          <ol className="ml-2 sm:ml-4 space-y-1.5 sm:space-y-2">
            {part.items.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 sm:gap-3 text-[15px] sm:text-base lg:text-lg text-foreground/85"
              >
                <span className="flex-shrink-0 size-5 sm:size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] sm:text-xs font-bold mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-relaxed">
                  <JargonText>{item}</JargonText>
                </span>
              </li>
            ))}
          </ol>
        );
      }
      return (
        <ul className="ml-2 sm:ml-4 space-y-1.5 sm:space-y-2">
          {part.items.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2 sm:gap-3 text-[15px] sm:text-base lg:text-lg text-foreground/85"
            >
              <span className="flex-shrink-0 size-1.5 rounded-full bg-primary mt-2" />
              <span className="leading-relaxed">
                <JargonText>{item}</JargonText>
              </span>
            </li>
          ))}
        </ul>
      );

    case "code":
      return (
        <div className="relative -mx-2 sm:mx-0">
          <pre className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted border border-border overflow-x-auto">
            <code className="text-xs sm:text-sm font-mono text-foreground/90">{part.text}</code>
          </pre>
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-muted to-transparent pointer-events-none sm:hidden" />
        </div>
      );

    default:
      return null;
  }
}

// ============================================================================
// RAW CONTENT (for unstructured files)
// ============================================================================

function RawContent({ content }: { content: string }) {
  const contentParts = parseContent(content);

  return (
    <div className="space-y-4">
      {contentParts.map((part, i) => (
        <ContentPart key={i} part={part} />
      ))}
    </div>
  );
}

// ============================================================================
// MAIN VIEWER
// ============================================================================

interface MetapromptViewerProps {
  data: ParsedMetaprompt;
}

export function MetapromptViewer({ data }: MetapromptViewerProps) {
  return (
    <>
      <MetapromptHero
        title={data.title}
        description={data.description}
        wordCount={data.wordCount}
      />

      <div className="max-w-3xl mx-auto">
        {data.sections.length > 0 ? (
          data.sections.map((section, i) => (
            <Section
              key={i}
              section={section}
              sectionId={slugifyHeadingForAnchor(section.title) || `section-${i}`}
            />
          ))
        ) : data.rawContent ? (
          <RawContent content={data.rawContent} />
        ) : null}
      </div>
    </>
  );
}

// ============================================================================
// ICONS
// ============================================================================

function CodeIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
      />
    </svg>
  );
}
