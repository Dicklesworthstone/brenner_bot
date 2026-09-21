"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { JargonText } from "@/components/jargon-text";
import { SectionReference } from "@/components/section-reference";
import { CopyButton, ReferenceCopyButton } from "@/components/ui/copy-button";
import { makeDistillationSectionDomId } from "@/lib/anchors";
import type {
  DistillationContent,
  DistillationPart,
  DistillationSection,
  ParsedDistillation,
} from "@/lib/distillation-parser";
import { getDistillationMeta } from "@/lib/distillation-parser";

// ============================================================================
// MODEL THEME SYSTEM - Stripe-level color consistency
// ============================================================================

type ModelTheme = {
  // Primary accent colors with proper contrast
  accent: string;
  accentLight: string;
  accentDark: string;
  // Background treatments
  bgGradient: string;
  bgSubtle: string;
  // Text colors that work in both modes
  textOnAccent: string;
  // Border and shadow
  borderAccent: string;
  shadowAccent: string;
  // Glow effect
  glowColor: string;
};

const MODEL_THEMES: Record<string, ModelTheme> = {
  "distillation-gpt-52": {
    accent: "bg-emerald-500",
    accentLight: "bg-emerald-400",
    accentDark: "bg-emerald-600",
    bgGradient: "from-emerald-500/15 via-emerald-600/10 to-teal-500/5",
    bgSubtle: "bg-emerald-500/8",
    textOnAccent: "text-white",
    borderAccent: "border-emerald-500/30",
    shadowAccent: "shadow-emerald-500/20",
    glowColor: "emerald",
  },
  "distillation-opus-45": {
    accent: "bg-violet-500",
    accentLight: "bg-violet-400",
    accentDark: "bg-violet-600",
    bgGradient: "from-violet-500/15 via-violet-600/10 to-purple-500/5",
    bgSubtle: "bg-violet-500/8",
    textOnAccent: "text-white",
    borderAccent: "border-violet-500/30",
    shadowAccent: "shadow-violet-500/20",
    glowColor: "violet",
  },
  "distillation-gemini-3": {
    accent: "bg-blue-500",
    accentLight: "bg-blue-400",
    accentDark: "bg-blue-600",
    bgGradient: "from-blue-500/15 via-blue-600/10 to-cyan-500/5",
    bgSubtle: "bg-blue-500/8",
    textOnAccent: "text-white",
    borderAccent: "border-blue-500/30",
    shadowAccent: "shadow-blue-500/20",
    glowColor: "blue",
  },
};

function getModelTheme(docId: string): ModelTheme {
  return MODEL_THEMES[docId] ?? MODEL_THEMES["distillation-opus-45"];
}

// ============================================================================
// DISTILLATION HERO - Stripe-level polish
// ============================================================================

interface DistillationHeroProps {
  title: string;
  wordCount: number;
  docId: string;
}

export function DistillationHero({ title, wordCount, docId }: DistillationHeroProps) {
  const meta = getDistillationMeta(docId);
  const theme = getModelTheme(docId);
  const readTime = Math.ceil(wordCount / 200);

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl mb-8 sm:mb-12 border border-border/50">
      {/* Layered gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.bgGradient}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-background/30" />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Accent glow orbs */}
      <div
        className={`absolute -top-16 -right-16 sm:-top-24 sm:-right-24 size-48 sm:size-80 rounded-full ${theme.accent} opacity-15 blur-[80px]`}
      />
      <div
        className={`absolute -bottom-12 -left-12 sm:-bottom-20 sm:-left-20 size-36 sm:size-60 rounded-full ${theme.accent} opacity-10 blur-[60px]`}
      />

      <div className="relative px-5 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {/* Top row: Model identity + Date */}
        <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
          {/* Model identity */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Model icon */}
            <div
              className={`size-10 sm:size-12 rounded-lg sm:rounded-xl ${theme.accent} flex items-center justify-center ${theme.textOnAccent} text-lg sm:text-xl font-bold shadow-lg ${theme.shadowAccent}`}
            >
              {meta.icon}
            </div>

            <div className="space-y-0">
              {/* Model name */}
              <h2 className="text-base sm:text-lg font-semibold text-foreground tracking-tight">
                {meta.name}
              </h2>

              {/* Tagline */}
              <p className="text-xs sm:text-sm text-foreground/60">{meta.tagline}</p>
            </div>
          </div>

          {/* Date badge */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-foreground/[0.03] border border-border/40">
            <CalendarIcon className="size-3 text-muted-foreground/60" />
            <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
              {meta.date}
            </span>
          </div>
        </div>

        {/* Document title */}
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground mb-4 sm:mb-5 max-w-3xl leading-[1.2]">
          {title}
        </h1>

        {/* Approach description */}
        <p className="text-sm sm:text-base lg:text-[17px] leading-relaxed text-foreground/70 max-w-2xl mb-6 sm:mb-8">
          {meta.approach}
        </p>

        {/* Key Strengths */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-[10px] sm:text-xs font-semibold text-foreground/50 uppercase tracking-wider">
              Key Strengths
            </span>
          </div>

          {/* Horizontal scroll on mobile, wrap on desktop */}
          <div className="relative -mx-5 sm:mx-0">
            <div className="flex gap-3 overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap scrollbar-hide px-5 sm:px-0 snap-x snap-mandatory">
              {meta.strengths.map((strength, i) => (
                <StrengthPill key={i} strength={strength} theme={theme} index={i} />
              ))}
            </div>
            {/* Fade hint on mobile */}
            <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none sm:hidden" />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-4 sm:pt-5 border-t border-border/30">
          <StatChip icon={<ClockIcon />} value={`${readTime} min`} label="read" />
          <StatChip icon={<DocumentIcon />} value={formatNumber(wordCount)} label="words" />
          <StatChip icon={<SparklesIcon />} value="Frontier" label="model" accent />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STRENGTH PILL - Premium badge design
// ============================================================================

interface StrengthPillProps {
  strength: string;
  theme: ModelTheme;
  index: number;
}

function StrengthPill({ strength, theme, index }: StrengthPillProps) {
  return (
    <div
      className={`
        flex-shrink-0 snap-start
        flex items-center gap-2
        px-3 py-2 sm:px-3.5 sm:py-2
        rounded-lg
        ${theme.bgSubtle} border ${theme.borderAccent}
        transition-colors duration-150
        max-w-[260px] sm:max-w-none
      `}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Minimal checkmark */}
      <CheckIcon className={`size-3.5 flex-shrink-0 ${theme.accent.replace("bg-", "text-")}`} />

      {/* Strength text - tighter */}
      <span className="text-xs sm:text-[13px] text-foreground/80 leading-snug">{strength}</span>
    </div>
  );
}

// ============================================================================
// STAT CHIP - Clean, minimal stats
// ============================================================================

interface StatChipProps {
  icon: ReactNode;
  value: string;
  label: string;
  accent?: boolean;
}

function StatChip({ icon, value, label, accent }: StatChipProps) {
  return (
    <div
      className={`
      inline-flex items-center gap-1.5 sm:gap-2
      px-2.5 sm:px-3 py-1.5 sm:py-2
      rounded-md
      ${accent ? "bg-primary/8 border-primary/15" : "bg-foreground/[0.03] border-border/40"}
      border
      transition-colors
    `}
    >
      <span className={`size-3.5 ${accent ? "text-primary/70" : "text-muted-foreground/60"}`}>
        {icon}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="font-medium text-foreground/90 text-xs sm:text-sm">{value}</span>
        <span className="text-muted-foreground/70 text-[10px] sm:text-xs">{label}</span>
      </div>
    </div>
  );
}

// ============================================================================
// UTILITY
// ============================================================================

function formatNumber(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return n.toString();
}

function generateAnchorId(title: string, partNumber?: number, index?: number): string {
  return makeDistillationSectionDomId({ title, partNumber, index });
}

// ============================================================================
// TABLE OF CONTENTS
// ============================================================================

interface TocEntry {
  id: string;
  title: string;
  level: number;
  partNumber?: number;
  partTitle?: string;
}

function extractTocEntries(data: ParsedDistillation): TocEntry[] {
  const entries: TocEntry[] = [];
  let sectionIndex = 0;

  if (data.preamble) {
    entries.push({
      id: "introduction",
      title: "Introduction",
      level: 1,
    });
  }

  for (const part of data.parts) {
    // Add part as entry if multiple parts
    if (data.parts.length > 1) {
      entries.push({
        id: `part-${part.number}`,
        title: part.title,
        level: 0,
        partNumber: part.number,
      });
    }

    // Add sections
    for (const section of part.sections) {
      entries.push({
        id: generateAnchorId(
          section.title,
          data.parts.length > 1 ? part.number : undefined,
          sectionIndex,
        ),
        title: section.title,
        level: section.level,
        partNumber: data.parts.length > 1 ? part.number : undefined,
        partTitle: data.parts.length > 1 ? part.title : undefined,
      });
      sectionIndex++;
    }
  }

  return entries;
}

interface DistillationTOCProps {
  entries: TocEntry[];
  activeSection: string;
  onSectionClick: (id: string) => void;
  docId: string;
}

function DistillationTOC({ entries, activeSection, onSectionClick, docId }: DistillationTOCProps) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = getModelTheme(docId);

  return (
    <nav className="lg:sticky lg:top-24 lg:overflow-y-auto lg:toc-nav-scroll">
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden w-full flex items-center justify-between px-4 py-3 rounded-xl bg-card border border-border mb-2 touch-manipulation active:scale-[0.99] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="text-sm font-medium text-foreground">Table of Contents</span>
        <ChevronIcon
          className={`size-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* TOC list */}
      <div className={`${isOpen ? "block" : "hidden"} lg:block`}>
        <div className="px-4 py-3 rounded-xl bg-card/50 border border-border/50 lg:bg-transparent lg:border-0 lg:p-0">
          <h3 className="hidden lg:block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Contents
          </h3>
          <ul className="space-y-1">
            {entries.map((entry) => {
              const isActive = activeSection === entry.id;
              const isPart = entry.level === 0;

              return (
                <li key={entry.id}>
                  <button
                    onClick={() => {
                      onSectionClick(entry.id);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg text-sm transition-all touch-manipulation active:scale-[0.98]
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset
                      ${isPart ? "font-semibold" : "font-normal"}
                      ${
                        isActive
                          ? `${theme.bgSubtle} text-foreground`
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }
                    `}
                    style={{ paddingLeft: isPart ? undefined : `${12 + (entry.level - 1) * 12}px` }}
                  >
                    {entry.title}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}

// ============================================================================
// ICONS - Clean, consistent
// ============================================================================

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
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
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
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
        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
      />
    </svg>
  );
}

// ============================================================================
// PART HEADER
// ============================================================================

interface PartHeaderProps {
  part: DistillationPart;
  docId: string;
}

function PartHeader({ part, docId }: PartHeaderProps) {
  const theme = getModelTheme(docId);

  return (
    <div className="relative my-8 sm:my-10 py-6 sm:py-8">
      {/* Decorative line */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

      {/* Part badge */}
      <div className="relative flex flex-col items-center gap-2 sm:gap-3">
        <div
          className={`
          relative inline-flex items-center gap-2 px-4 py-2 rounded-lg
          ${theme.bgSubtle} border ${theme.borderAccent}
        `}
        >
          <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-foreground/60">
            Part
          </span>
          <span className="text-base sm:text-lg font-bold text-foreground">
            {toRoman(part.number)}
          </span>
        </div>
        <h2 className="text-lg sm:text-xl font-semibold text-center text-foreground tracking-tight px-4">
          {part.title}
        </h2>
      </div>
    </div>
  );
}

function toRoman(num: number): string {
  const romans: [number, string][] = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let result = "";
  for (const [value, symbol] of romans) {
    while (num >= value) {
      result += symbol;
      num -= value;
    }
  }
  return result;
}

// ============================================================================
// SECTION
// ============================================================================

interface SectionProps {
  section: DistillationSection;
  docId: string;
  sectionId: string;
}

function Section({ section, docId, sectionId }: SectionProps) {
  const [copied, setCopied] = useState(false);
  const HeadingTag = `h${Math.min(section.level + 1, 6)}` as "h2" | "h3" | "h4" | "h5" | "h6";
  // Refined typography: tighter, more elegant heading hierarchy
  const headingClasses: Record<number, string> = {
    1: "text-lg sm:text-xl font-semibold mb-4 mt-8 first:mt-0 tracking-tight",
    2: "text-base sm:text-lg font-semibold mb-3 mt-6 tracking-tight",
    3: "text-base font-medium mb-2 mt-5 tracking-tight",
    4: "text-sm font-medium mb-2 mt-4 uppercase tracking-wide text-foreground/80",
  };
  const headingClass = headingClasses[section.level] ?? headingClasses[4];

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#${sectionId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id={sectionId} className="scroll-mt-24 group/section">
      <div className="flex items-start gap-2">
        <HeadingTag className={`text-foreground tracking-tight ${headingClass} flex-1`}>
          {section.title}
        </HeadingTag>
        <button
          onClick={handleCopyLink}
          className="opacity-0 group-hover/section:opacity-100 transition-opacity mt-2 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          title={copied ? "Copied!" : "Copy link to section"}
        >
          {copied ? <CheckIcon className="size-4" /> : <LinkIcon className="size-4" />}
        </button>
      </div>

      <div className="space-y-3">
        {section.content.map((content, i) => (
          <ContentRenderer key={i} content={content} docId={docId} />
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// INLINE FORMATTING - Renders bold, italic, code, section refs as styled JSX
// ============================================================================

function renderFormattedText(text: string): ReactNode {
  if (!text) return null;

  // Tokenize: find all formatting markers and section references
  const tokens: Array<{
    type: "text" | "bold" | "italic" | "code" | "section-ref";
    content: string;
  }> = [];
  // Order matters: check bold (**) before italic (*) since bold uses double asterisks
  // Also capture section references like §42, §106, or ranges like §106-108
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|§\d+(?:-\d+)?)/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add any text before this match
    if (match.index > lastIndex) {
      tokens.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }

    const matched = match[0];
    if (matched.startsWith("**") && matched.endsWith("**")) {
      tokens.push({ type: "bold", content: matched.slice(2, -2) });
    } else if (matched.startsWith("`") && matched.endsWith("`")) {
      tokens.push({ type: "code", content: matched.slice(1, -1) });
    } else if (matched.startsWith("§")) {
      tokens.push({ type: "section-ref", content: matched.slice(1) }); // Store just the number
    } else if (matched.startsWith("*") && matched.endsWith("*")) {
      tokens.push({ type: "italic", content: matched.slice(1, -1) });
    }

    lastIndex = match.index + matched.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    tokens.push({ type: "text", content: text.slice(lastIndex) });
  }

  // Return plain text with jargon detection if no formatting found
  if (tokens.length === 0) return <JargonText>{text}</JargonText>;

  // Build React elements
  return tokens.map((token, i) => {
    switch (token.type) {
      case "bold":
        return (
          <strong key={i} className="font-semibold text-foreground">
            <JargonText>{token.content}</JargonText>
          </strong>
        );
      case "italic":
        return (
          <em key={i} className="italic text-foreground/95">
            <JargonText>{token.content}</JargonText>
          </em>
        );
      case "code":
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 mx-0.5 rounded-md bg-muted/70 font-mono text-[0.9em] text-foreground/90"
          >
            {token.content}
          </code>
        );
      case "section-ref":
        return <SectionReference key={i} sectionNumber={parseInt(token.content, 10)} />;
      default:
        // Apply jargon detection to plain text segments
        return <JargonText key={i}>{token.content}</JargonText>;
    }
  });
}

// ============================================================================
// CONTENT RENDERER
// ============================================================================

interface ContentRendererProps {
  content: DistillationContent;
  docId: string;
}

function ContentRenderer({ content, docId }: ContentRendererProps) {
  const theme = getModelTheme(docId);

  switch (content.type) {
    case "paragraph":
      return (
        <p className="text-[15px] sm:text-base leading-[1.7] text-foreground/90">
          {renderFormattedText(content.text)}
        </p>
      );

    case "quote":
      return (
        <figure className="my-4 group">
          <blockquote className="relative pl-4 sm:pl-5 pr-3 py-3 rounded-lg border-l-3 border-primary/60 bg-primary/[0.04]">
            {/* Copy button - appears on hover */}
            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyButton
                text={content.text}
                attribution={
                  content.reference ? `— Sydney Brenner, §${content.reference}` : "— Sydney Brenner"
                }
                variant="ghost"
                size="sm"
                showPreview={true}
              />
            </div>
            <p className="text-[15px] sm:text-base leading-[1.65] text-foreground/85 italic pr-8">
              {renderFormattedText(content.text)}
            </p>
          </blockquote>
          {content.reference && (
            <figcaption className="mt-2 text-sm text-muted-foreground text-right">
              <ReferenceCopyButton
                reference={`§${content.reference}`}
                quoteText={content.text}
                source="Sydney Brenner"
              />
            </figcaption>
          )}
        </figure>
      );

    case "list":
      if (content.ordered) {
        return (
          <ol className="my-3 space-y-2 ml-1">
            {content.items.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-[15px] sm:text-base text-foreground/90"
              >
                <span
                  className={`
                  flex-shrink-0 size-5 rounded-md
                  ${theme.bgSubtle} text-foreground/70
                  flex items-center justify-center text-xs font-medium
                `}
                >
                  {i + 1}
                </span>
                <span className="leading-[1.65] pt-px">{renderFormattedText(item)}</span>
              </li>
            ))}
          </ol>
        );
      }
      return (
        <ul className="my-3 space-y-1.5 ml-1">
          {content.items.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 text-[15px] sm:text-base text-foreground/90"
            >
              <span className={`flex-shrink-0 size-1 rounded-full ${theme.accent} mt-[0.6em]`} />
              <span className="leading-[1.65]">{renderFormattedText(item)}</span>
            </li>
          ))}
        </ul>
      );

    case "code":
      return (
        <pre className="my-5 p-4 rounded-xl bg-muted/50 border border-border overflow-x-auto">
          <code className="text-sm font-mono text-foreground/90">{content.text}</code>
        </pre>
      );

    default:
      return null;
  }
}

// ============================================================================
// RAW CONTENT FALLBACK (for unstructured files)
// ============================================================================

function RawContentFallback({ content }: { content: string }) {
  const paragraphs = content.split(/\n\n+/).filter(Boolean);

  return (
    <div className="max-w-none">
      {paragraphs.map((para, i) => (
        <p key={i} className="text-[15px] sm:text-base leading-[1.7] text-foreground/90 mb-3">
          <JargonText>{para}</JargonText>
        </p>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN VIEWER
// ============================================================================

interface DistillationViewerProps {
  data: ParsedDistillation;
  docId: string;
}

export function DistillationViewer({ data, docId }: DistillationViewerProps) {
  const [progress, setProgress] = useState(0);
  const [activeSection, setActiveSection] = useState("");
  const theme = getModelTheme(docId);
  const includePartPrefix = data.parts.length > 1;

  // Extract TOC entries
  const tocEntries = useMemo(() => extractTocEntries(data), [data]);

  // Track scroll for progress bar and active section
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, scrollPercent)));

      // Find active section based on scroll position
      const sections = tocEntries
        .map((entry) => ({ id: entry.id, el: document.getElementById(entry.id) }))
        .filter((item): item is { id: string; el: HTMLElement } => Boolean(item.el));
      const viewportCenter = scrollTop + window.innerHeight * 0.3;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section.el.offsetTop <= viewportCenter) {
          setActiveSection(section.id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial call
    return () => window.removeEventListener("scroll", handleScroll);
  }, [tocEntries]);

  // Handle URL hash on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.slice(1);
    if (hash) {
      const element = document.getElementById(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, []);

  // Scroll to section from TOC
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      // Update URL hash
      window.history.replaceState(null, "", `#${id}`);
    }
  };

  // Check if we have enough sections for a TOC
  const showTOC = tocEntries.length > 3;

  let sectionIndexForRender = 0;
  const renderPartSections = (part: DistillationPart) => {
    return part.sections.map((section) => {
      const sectionIndex = sectionIndexForRender++;
      const sectionId = generateAnchorId(
        section.title,
        includePartPrefix ? part.number : undefined,
        sectionIndex,
      );

      return (
        <Section
          key={`${sectionId}:${sectionIndex}`}
          section={section}
          docId={docId}
          sectionId={sectionId}
        />
      );
    });
  };

  return (
    <>
      {/* Reading progress */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-border/30">
        <div
          className={`h-full ${theme.accent} transition-all duration-150`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <DistillationHero title={data.title} wordCount={data.wordCount} docId={docId} />

      {data.parts.length > 0 ? (
        showTOC ? (
          <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8 xl:gap-12 max-w-6xl mx-auto">
            {/* Sidebar TOC (desktop) */}
            <aside className="hidden lg:block">
              <DistillationTOC
                entries={tocEntries}
                activeSection={activeSection}
                onSectionClick={scrollToSection}
                docId={docId}
              />
            </aside>

            {/* Mobile TOC */}
            <div className="lg:hidden mb-8">
              <DistillationTOC
                entries={tocEntries}
                activeSection={activeSection}
                onSectionClick={scrollToSection}
                docId={docId}
              />
            </div>

            {/* Main content */}
            <main className="max-w-3xl">
              {data.preamble && (
                <section id="introduction" className="scroll-mt-24 mb-12">
                  <h2 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-4">
                    Introduction
                  </h2>
                  <p className="text-[15px] sm:text-base lg:text-lg leading-relaxed text-foreground/85">
                    <JargonText>{data.preamble}</JargonText>
                  </p>
                </section>
              )}
              {data.parts.map((part) => (
                <div
                  key={part.number}
                  id={data.parts.length > 1 ? `part-${part.number}` : undefined}
                >
                  {data.parts.length > 1 && <PartHeader part={part} docId={docId} />}

                  {renderPartSections(part)}
                </div>
              ))}
            </main>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {data.preamble && (
              <section id="introduction" className="scroll-mt-24 mb-12">
                <h2 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight mb-4">
                  Introduction
                </h2>
                <p className="text-[15px] sm:text-base lg:text-lg leading-relaxed text-foreground/85">
                  <JargonText>{data.preamble}</JargonText>
                </p>
              </section>
            )}
            {data.parts.map((part) => (
              <div key={part.number} id={data.parts.length > 1 ? `part-${part.number}` : undefined}>
                {data.parts.length > 1 && <PartHeader part={part} docId={docId} />}

                {renderPartSections(part)}
              </div>
            ))}
          </div>
        )
      ) : data.rawContent ? (
        <div className="max-w-3xl mx-auto">
          <RawContentFallback content={data.rawContent} />
        </div>
      ) : null}
    </>
  );
}
