"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { JargonText } from "@/components/jargon-text";
import { SectionReference } from "@/components/section-reference";

// ============================================================================
// TYPES
// ============================================================================

interface ParsedSection {
  id: string;
  level: number;
  title: string;
  content: string;
}

interface RawResponseData {
  title: string;
  model: "gpt" | "opus" | "gemini";
  batchLabel: string;
  readTime: string;
  wordCount: number;
  sections: ParsedSection[];
  rawContent: string;
}

interface RawResponseViewerProps {
  data: RawResponseData;
}

// ============================================================================
// MODEL CONFIG
// ============================================================================

const modelConfig = {
  gpt: {
    name: "GPT-5.2 Pro",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    gradientFrom: "from-emerald-500/20",
    gradientTo: "to-teal-500/10",
    icon: GPTIcon,
  },
  opus: {
    name: "Claude Opus 4.5",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    gradientFrom: "from-amber-500/20",
    gradientTo: "to-orange-500/10",
    icon: ClaudeIcon,
  },
  gemini: {
    name: "Gemini 3 Deep Think",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    gradientFrom: "from-blue-500/20",
    gradientTo: "to-indigo-500/10",
    icon: GeminiIcon,
  },
};

// ============================================================================
// ICONS
// ============================================================================

function GPTIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.392.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
  );
}

function ClaudeIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
    </svg>
  );
}

function GeminiIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

function ClockIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function DocumentIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function ListIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
      />
    </svg>
  );
}

function ChevronUpIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    </svg>
  );
}

// ============================================================================
// INLINE MARKDOWN RENDERER
// ============================================================================

function normalizeMarkdownHref(rawHref: string): { href: string; external: boolean } | null {
  const href = rawHref.trim();
  if (!href) return null;

  // Allow same-page anchors and same-origin paths.
  if (href.startsWith("#")) return { href, external: false };
  if (href.startsWith("/") && !href.startsWith("//")) return { href, external: false };

  // Allow only safe external protocols.
  try {
    const url = new URL(href);
    if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:") {
      return { href: url.toString(), external: true };
    }
  } catch {
    // ignore invalid URLs
  }

  return null;
}

function renderInlineMarkdown(text: string): ReactNode {
  // Parse inline formatting and return React elements
  const parts: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text**
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      parts.push(
        <strong key={key++} className="font-semibold text-foreground">
          {renderInlineMarkdown(boldMatch[1])}
        </strong>,
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic: *text* (but not **)
    const italicMatch = remaining.match(/^\*([^*]+?)\*/);
    if (italicMatch) {
      parts.push(
        <em key={key++} className="italic text-foreground/90">
          {renderInlineMarkdown(italicMatch[1])}
        </em>,
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Code: `text`
    const codeMatch = remaining.match(/^`([^`]+?)`/);
    if (codeMatch) {
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded-md bg-muted font-mono text-[0.9em] text-foreground/95"
        >
          {codeMatch[1]}
        </code>,
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Link: [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const normalized = normalizeMarkdownHref(linkMatch[2]);
      if (!normalized) {
        // Invalid link - render text with jargon detection
        parts.push(<JargonText key={key++}>{linkMatch[1]}</JargonText>);
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      parts.push(
        <a
          key={key++}
          href={normalized.href}
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          target={normalized.external ? "_blank" : undefined}
          rel={normalized.external ? "noopener noreferrer" : undefined}
        >
          <JargonText>{linkMatch[1]}</JargonText>
        </a>,
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Section reference: §42
    const sectionRefMatch = remaining.match(/^§(\d+)/);
    if (sectionRefMatch) {
      parts.push(<SectionReference key={key++} sectionNumber={parseInt(sectionRefMatch[1], 10)} />);
      remaining = remaining.slice(sectionRefMatch[0].length);
      continue;
    }

    // Find next special character or end
    const nextSpecial = remaining.search(/[*`[§]/);
    if (nextSpecial === -1) {
      // Apply jargon detection to remaining text
      parts.push(<JargonText key={key++}>{remaining}</JargonText>);
      break;
    } else if (nextSpecial === 0) {
      // Special char at start but didn't match patterns above - treat as literal
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      // Apply jargon detection to text segment
      parts.push(<JargonText key={key++}>{remaining.slice(0, nextSpecial)}</JargonText>);
      remaining = remaining.slice(nextSpecial);
    }
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// ============================================================================
// CONTENT PARSER
// ============================================================================

interface ContentBlock {
  type: "paragraph" | "heading" | "list" | "blockquote" | "code" | "hr";
  level?: number;
  text?: string;
  items?: string[];
  ordered?: boolean;
  language?: string;
}

function parseContentBlocks(content: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line - skip
    if (!trimmed) {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Heading
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      i++;
      continue;
    }

    // Code block
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: "code",
        text: codeLines.join("\n"),
        language: lang || undefined,
      });
      i++; // skip closing ```
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ""));
        i++;
      }
      blocks.push({
        type: "blockquote",
        text: quoteLines.join(" "),
      });
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", items, ordered: false });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", items, ordered: true });
      continue;
    }

    // Paragraph - collect consecutive non-empty lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().startsWith(">") &&
      !lines[i].trim().startsWith("```") &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^[-*_]{3,}$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", text: paraLines.join(" ") });
    }
  }

  return blocks;
}

// ============================================================================
// CONTENT BLOCK RENDERER
// ============================================================================

function ContentBlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "hr":
      return <hr className="my-8 sm:my-10 border-border/50" />;

    case "heading": {
      const level = Math.min(block.level || 2, 6);
      const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      const sizeClasses: Record<number, string> = {
        1: "text-2xl sm:text-3xl font-bold mt-10 sm:mt-12 mb-4 sm:mb-5",
        2: "text-xl sm:text-2xl font-bold mt-8 sm:mt-10 mb-3 sm:mb-4",
        3: "text-lg sm:text-xl font-semibold mt-6 sm:mt-8 mb-2 sm:mb-3",
        4: "text-base sm:text-lg font-semibold mt-5 sm:mt-6 mb-2",
        5: "text-sm sm:text-base font-semibold mt-4 sm:mt-5 mb-1.5",
        6: "text-sm font-semibold mt-4 mb-1.5",
      };
      const sizeClass = sizeClasses[level] || sizeClasses[2];
      const id =
        block.text
          ?.toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || undefined;
      return (
        <Tag id={id} className={`${sizeClass} text-foreground scroll-mt-24`}>
          {renderInlineMarkdown(block.text || "")}
        </Tag>
      );
    }

    case "paragraph":
      return (
        <p className="text-[15px] sm:text-base lg:text-[17px] leading-[1.8] sm:leading-[1.85] text-foreground/90 mb-4 sm:mb-5">
          {renderInlineMarkdown(block.text || "")}
        </p>
      );

    case "blockquote":
      return (
        <blockquote className="my-5 sm:my-6 pl-4 sm:pl-5 py-3 sm:py-4 border-l-4 border-primary/40 bg-primary/5 rounded-r-xl text-foreground/85 italic">
          <p className="text-[15px] sm:text-base leading-relaxed">
            {renderInlineMarkdown(block.text || "")}
          </p>
        </blockquote>
      );

    case "list":
      if (block.ordered) {
        return (
          <ol className="my-4 sm:my-5 ml-1 space-y-2 sm:space-y-2.5">
            {block.items?.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mt-0.5">
                  {i + 1}
                </span>
                <span className="text-[15px] sm:text-base leading-relaxed text-foreground/90">
                  {renderInlineMarkdown(item)}
                </span>
              </li>
            ))}
          </ol>
        );
      }
      return (
        <ul className="my-4 sm:my-5 ml-1 space-y-2 sm:space-y-2.5">
          {block.items?.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 size-1.5 rounded-full bg-primary mt-2.5" />
              <span className="text-[15px] sm:text-base leading-relaxed text-foreground/90">
                {renderInlineMarkdown(item)}
              </span>
            </li>
          ))}
        </ul>
      );

    case "code":
      return (
        <div className="my-5 sm:my-6 rounded-xl overflow-hidden border border-border/50 bg-[#0d1117] dark:bg-[#0d1117]">
          {block.language && (
            <div className="px-4 py-2 bg-[#161b22] border-b border-border/30 text-xs text-muted-foreground font-mono">
              {block.language}
            </div>
          )}
          <pre className="p-4 sm:p-5 overflow-x-auto">
            <code className="text-xs sm:text-sm font-mono text-[#c9d1d9] leading-relaxed">
              {block.text}
            </code>
          </pre>
        </div>
      );

    default:
      return null;
  }
}

// ============================================================================
// HERO SECTION
// ============================================================================

interface HeroProps {
  data: RawResponseData;
}

function Hero({ data }: HeroProps) {
  const config = modelConfig[data.model];
  const Icon = config.icon;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border ${config.borderColor} bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} to-transparent mb-8 sm:mb-10 lg:mb-12`}
    >
      {/* Decorative orbs */}
      <div
        className={`absolute -top-20 -right-20 w-64 h-64 ${config.bgColor} rounded-full blur-3xl opacity-50`}
      />
      <div
        className={`absolute -bottom-20 -left-20 w-48 h-48 ${config.bgColor} rounded-full blur-3xl opacity-30`}
      />

      <div className="relative px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        {/* Model badge */}
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bgColor} border ${config.borderColor} ${config.color} text-sm font-medium mb-5`}
        >
          <Icon className="size-4" />
          <span>{config.name}</span>
          <span className="mx-1 text-current/30">•</span>
          <span className="opacity-80">{data.batchLabel}</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4 max-w-3xl">
          {data.title}
        </h1>

        {/* Meta stats */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ClockIcon className="size-4" />
            <span>{data.readTime}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <DocumentIcon className="size-4" />
            <span>{data.wordCount.toLocaleString()} words</span>
          </span>
          <span className="flex items-center gap-1.5">
            <ListIcon className="size-4" />
            <span>{data.sections.length} sections</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TABLE OF CONTENTS (Desktop sidebar)
// ============================================================================

interface TOCProps {
  sections: ParsedSection[];
  activeId: string | null;
}

function TableOfContents({ sections, activeId }: TOCProps) {
  const topLevelSections = sections.filter((s) => s.level <= 2);

  if (topLevelSections.length === 0) return null;

  return (
    <nav className="sticky top-24 overflow-y-auto pr-4 -mr-4 toc-nav-scroll">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        On this page
      </h3>
      <ul className="space-y-1">
        {topLevelSections.map((section) => {
          const isActive = activeId === section.id;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={`block py-1.5 text-sm transition-colors ${
                  section.level === 2 ? "pl-3" : ""
                } ${
                  isActive
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {section.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ============================================================================
// MOBILE TOC
// ============================================================================

interface MobileTOCProps {
  sections: ParsedSection[];
  isOpen: boolean;
  onToggle: () => void;
}

function MobileTOC({ sections, isOpen, onToggle }: MobileTOCProps) {
  const topLevelSections = sections.filter((s) => s.level <= 2);

  if (topLevelSections.length === 0) return null;

  return (
    <div className="lg:hidden mb-6">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-muted/50 border border-border/50 text-sm font-medium text-foreground touch-manipulation active:scale-[0.98] active:bg-muted/70 transition-all"
      >
        <span className="flex items-center gap-2">
          <ListIcon className="size-4" />
          Table of Contents
        </span>
        <ChevronUpIcon className={`size-4 transition-transform ${isOpen ? "" : "rotate-180"}`} />
      </button>

      {isOpen && (
        <div className="mt-2 p-4 rounded-xl bg-card border border-border/50">
          <ul className="space-y-1">
            {topLevelSections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={onToggle}
                  className={`block py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors ${
                    section.level === 2 ? "pl-3" : ""
                  }`}
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// READING PROGRESS BAR
// ============================================================================

function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollTop = window.scrollY;
      const newProgress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, newProgress)));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted/30">
      <div
        className="h-full bg-primary transition-[width] duration-100 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// ============================================================================
// BACK TO TOP BUTTON
// ============================================================================

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-40 size-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 flex items-center justify-center hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 touch-manipulation"
      aria-label="Back to top"
    >
      <ChevronUpIcon className="size-5" />
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RawResponseViewer({ data }: RawResponseViewerProps) {
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Parse content into blocks
  const contentBlocks = useMemo(() => parseContentBlocks(data.rawContent), [data.rawContent]);

  // Track active section for TOC highlighting
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );

    const headings = contentRef.current?.querySelectorAll("h1, h2, h3");
    headings?.forEach((heading) => {
      if (heading.id) observer.observe(heading);
    });

    return () => observer.disconnect();
  }, [contentBlocks]);

  return (
    <>
      <ReadingProgress />
      <BackToTop />

      <Hero data={data} />

      <MobileTOC
        sections={data.sections}
        isOpen={mobileTocOpen}
        onToggle={() => setMobileTocOpen(!mobileTocOpen)}
      />

      <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-10 xl:gap-14">
        {/* Main content */}
        <article ref={contentRef} className="max-w-3xl">
          {contentBlocks.map((block, i) => (
            <ContentBlockRenderer key={i} block={block} />
          ))}
        </article>

        {/* Desktop TOC sidebar */}
        <aside className="hidden lg:block">
          <TableOfContents sections={data.sections} activeId={activeId} />
        </aside>
      </div>
    </>
  );
}

// ============================================================================
// PARSER HELPER - Called from DocumentContentClient
// ============================================================================

/**
 * Strip inline markdown formatting for clean plaintext display (e.g., TOC titles).
 */
function stripInlineMarkdownForTOC(text: string): string {
  return (
    text
      // Remove bold: **text** or __text__
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/__(.+?)__/g, "$1")
      // Remove italic: *text* or _text_
      .replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, "$1")
      .replace(/(?<!_)_([^_\n]+?)_(?!_)/g, "$1")
      // Remove inline code: `text`
      .replace(/`([^`]+?)`/g, "$1")
      // Convert links [text](url) to just text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Clean up any double spaces
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function parseRawResponse(content: string, docId: string): RawResponseData {
  // Determine model from docId
  let model: "gpt" | "opus" | "gemini" = "gpt";
  if (docId.includes("opus")) model = "opus";
  else if (docId.includes("gemini")) model = "gemini";

  // Determine batch label
  let batchLabel = "Response";
  if (docId.includes("batch-1")) batchLabel = "Batch 1";
  else if (docId.includes("batch-2")) batchLabel = "Batch 2";
  else if (docId.includes("batch-3")) batchLabel = "Batch 3";
  else if (docId.includes("truncated")) batchLabel = "Extended";

  // Read time based on model
  const readTimes = {
    gpt: "40-50 min",
    opus: "12-15 min",
    gemini: "6-8 min",
  };

  // Count words
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  // Generate title
  const modelNames = {
    gpt: "GPT-5.2 Pro",
    opus: "Claude Opus 4.5",
    gemini: "Gemini 3",
  };
  const title = `${modelNames[model]} Analysis — ${batchLabel}`;

  // Extract sections (headings) for TOC
  const sections: ParsedSection[] = [];
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const rawTitle = match[2];
    // Strip markdown formatting for clean TOC display
    const titleText = stripInlineMarkdownForTOC(rawTitle);
    const id = titleText
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    sections.push({ id, level, title: titleText, content: "" });
  }

  return {
    title,
    model,
    batchLabel,
    readTime: readTimes[model],
    wordCount,
    sections,
    rawContent: content,
  };
}
