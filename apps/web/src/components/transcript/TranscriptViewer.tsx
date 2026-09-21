"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { JargonText } from "@/components/jargon-text";
import { useSearch as useGlobalSearch } from "@/components/search";
import { CopyButton } from "@/components/ui/copy-button";
import { useReadingPosition } from "@/hooks/useReadingPosition";
import { useSearch as useLocalSearch } from "@/lib/search";
import type {
  ParsedTranscript,
  TranscriptContent,
  TranscriptSection as TSection,
} from "@/lib/transcript-parser";

const CANONICAL_SITE_BASE_URL = "https://brennerbot.org";

function buildTranscriptSectionUrl(sectionNumber: number): string {
  return `${CANONICAL_SITE_BASE_URL}/corpus/transcript#section-${sectionNumber}`;
}

function buildTranscriptSectionCitation(section: Pick<TSection, "number" | "title">): string {
  const url = buildTranscriptSectionUrl(section.number);
  return `[Sydney Brenner transcript §${section.number}: ${section.title}](${url})`;
}

// ============================================================================
// TRANSCRIPT HERO
// ============================================================================

interface TranscriptHeroProps {
  title: string;
  subtitle: string;
  totalSections: number;
  estimatedReadTime: string;
  wordCount: string;
  isCollapsed?: boolean;
}

export function TranscriptHero({
  title,
  subtitle,
  totalSections,
  estimatedReadTime,
  wordCount,
  isCollapsed = false,
}: TranscriptHeroProps) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 mb-8 sm:mb-12
        transition-all duration-500 ease-out origin-top
        ${isCollapsed ? "max-h-0 opacity-0 scale-y-0 mb-0 border-transparent" : "max-h-[600px] opacity-100 scale-y-100"}
      `}
      aria-hidden={isCollapsed}
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-48 sm:w-96 h-48 sm:h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-40 sm:w-64 h-40 sm:h-64 bg-amber-500/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-medium mb-4 sm:mb-6">
          <span className="size-1.5 sm:size-2 rounded-full bg-primary animate-pulse" />
          Primary Source
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-foreground mb-3 sm:mb-4 max-w-4xl">
          {title}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl">
            {subtitle}
          </p>
        )}

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 lg:gap-6">
          <Stat icon={<SectionIcon />} label="Sections" value={totalSections.toString()} />
          <Stat icon={<ClockIcon />} label="Read time" value={estimatedReadTime} />
          <Stat icon={<WordIcon />} label="Words" value={wordCount} />
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-background/50 backdrop-blur-sm border border-border/50">
      <div className="text-primary [&>svg]:size-4 sm:[&>svg]:size-5">{icon}</div>
      <div>
        <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
          {label}
        </div>
        <div className="text-sm sm:text-lg font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}

// ============================================================================
// TABLE OF CONTENTS
// ============================================================================

interface TableOfContentsProps {
  sections: TSection[];
  activeSection: number;
  onSectionClick: (index: number) => void;
}

export function TableOfContents({ sections, activeSection, onSectionClick }: TableOfContentsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="lg:hidden w-full flex items-center justify-between px-4 py-3 rounded-xl bg-card border border-border mb-2 hover:bg-card/80 active:bg-muted/50 active:scale-[0.99] transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="font-medium">Table of Contents</span>
        <ChevronIcon className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </button>

      {/* TOC list */}
      <nav
        className={`
          lg:block bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 overflow-hidden
          ${isExpanded ? "block" : "hidden"}
        `}
      >
        <div className="p-4 border-b border-border/50">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            Contents
          </h3>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-0.5">
          {sections.map((section, index) => (
            <button
              key={section.number}
              onClick={() => {
                onSectionClick(index);
                setIsExpanded(false);
              }}
              className={`
                w-full text-left px-3 py-2 rounded-lg text-sm transition-all
                ${
                  activeSection === index
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }
              `}
            >
              <span className="inline-block w-8 font-mono text-xs opacity-60">
                {section.number}.
              </span>
              <span className="line-clamp-1">{section.title}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

// ============================================================================
// TRANSCRIPT SEARCH
// ============================================================================

interface TranscriptSearchProps {
  sections: TSection[];
  onResultClick: (sectionIndex: number) => void;
  onSearchChange: (query: string) => void;
}

export function TranscriptSearch({
  sections,
  onResultClick,
  onSearchChange,
}: TranscriptSearchProps) {
  const { query, results, isSearching, search, clearSearch, setScope } = useLocalSearch({
    limit: 20,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Set scope to transcript only on mount
  useEffect(() => {
    setScope("transcript");
  }, [setScope]);

  // Notify parent of search query changes for highlighting
  useEffect(() => {
    onSearchChange(query);
  }, [query, onSearchChange]);

  // Filter results to find matching sections
  const matchingSections = useMemo(() => {
    if (!results.length) return [];

    return results
      .filter((r) => r.category === "transcript" && r.sectionNumber !== undefined)
      .map((r) => {
        const sectionIndex = sections.findIndex((s) => s.number === r.sectionNumber);
        return {
          result: r,
          sectionIndex,
          section: sectionIndex >= 0 ? sections[sectionIndex] : null,
        };
      })
      .filter((m) => m.section !== null);
  }, [results, sections]);

  const handleResultClick = (sectionIndex: number) => {
    onResultClick(sectionIndex);
    setIsOpen(false);
  };

  const handleClear = () => {
    clearSearch();
    inputRef.current?.focus();
  };

  return (
    <div className="relative mb-4">
      {/* Search Input */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            search(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => query && setIsOpen(true)}
          placeholder="Search transcript..."
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <CloseIcon className="size-4" />
          </button>
        )}
        {isSearching && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <div className="size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && query && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-80 overflow-y-auto">
          {matchingSections.length > 0 ? (
            <>
              <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border/50 bg-muted/30">
                {matchingSections.length} result{matchingSections.length !== 1 ? "s" : ""} found
              </div>
              {matchingSections.map(({ result, sectionIndex, section }) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(sectionIndex)}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-b-0"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      §{section?.number}
                    </span>
                    <span className="text-sm font-medium text-foreground line-clamp-1">
                      {section?.title}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {result.snippet || "Click to view this section"}
                  </p>
                </button>
              ))}
            </>
          ) : !isSearching ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : null}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
    </div>
  );
}

// ============================================================================
// STICKY SECTION INDICATOR - Shows current section on mobile while scrolling
// ============================================================================

interface StickySectionIndicatorProps {
  currentSection: TSection | null;
  totalSections: number;
  onTocClick: () => void;
}

function StickySectionIndicator({
  currentSection,
  totalSections,
  onTocClick,
}: StickySectionIndicatorProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show indicator after scrolling past the hero section
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // CSS lg:hidden handles desktop hiding; render on server for hydration safety
  if (!visible || !currentSection) return null;

  return (
    <div className="lg:hidden sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 -mx-4 px-4 py-2">
      <button
        onClick={onTocClick}
        className="w-full flex items-center justify-between gap-2 touch-manipulation"
        aria-label="Open table of contents"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
            §{currentSection.number}
          </span>
          <span className="text-sm font-medium text-foreground truncate">
            {currentSection.title}
          </span>
        </div>
        <div className="flex-shrink-0 flex items-center gap-1 text-xs text-muted-foreground">
          <CopyButton
            text={buildTranscriptSectionCitation(currentSection)}
            variant="ghost"
            size="sm"
            label={`Copy citation for §${currentSection.number}`}
            successMessage={`Copied citation for §${currentSection.number}`}
            showPreview={false}
            className="text-muted-foreground hover:text-foreground"
          />
          <span>
            {currentSection.number}/{totalSections}
          </span>
          <ChevronIcon className="size-4" />
        </div>
      </button>
    </div>
  );
}

// ============================================================================
// READING PROGRESS
// ============================================================================

interface ReadingProgressProps {
  /** Progress percentage (0-100), when provided skips internal scroll tracking */
  progress?: number;
}

export function ReadingProgress({ progress: externalProgress }: ReadingProgressProps) {
  const [internalProgress, setInternalProgress] = useState(0);
  const progress = externalProgress ?? internalProgress;

  useEffect(() => {
    // Skip internal scroll tracking if external progress is provided
    if (externalProgress !== undefined) return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setInternalProgress(Math.min(100, Math.max(0, scrollPercent)));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [externalProgress]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-border/30">
      <div
        className="h-full bg-gradient-to-r from-primary to-amber-500 transition-all duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// ============================================================================
// SECTION COMPONENT
// ============================================================================

function truncateToWords(text: string, maxWords: number): string {
  const normalized = text.replace(/\s+/g, " ").trim().replaceAll('"', "'");
  const words = normalized.split(/\s+/);
  if (words.length <= maxWords) {
    return normalized;
  }
  return words.slice(0, maxWords).join(" ") + "...";
}

function extractSectionQuote(section: TSection, maxWords: number = 150): string {
  const brennerQuote = section.content.find((c) => c.type === "brenner-quote");
  if (brennerQuote) {
    return truncateToWords(brennerQuote.text, maxWords);
  }

  const allText = section.content.map((c) => c.text).join(" ");
  return truncateToWords(allText, maxWords);
}

function buildSectionExcerptBlock(section: TSection): string {
  const anchor = `§${section.number}`;
  const quote = extractSectionQuote(section, 150);
  const title = section.title.trim();

  const lines = [`> **${anchor}**: "${quote}"`];
  if (title) {
    lines.push(`> — *${title}*`);
  }
  return lines.join("\n");
}

interface TranscriptSectionProps {
  section: TSection;
  isActive: boolean;
  isHighlighted?: boolean;
  searchHighlights?: string[];
}

export function TranscriptSection({
  section,
  isActive,
  isHighlighted,
  searchHighlights,
}: TranscriptSectionProps) {
  const anchor = `§${section.number}`;
  const citation = buildTranscriptSectionCitation(section);
  const excerptBlock = useMemo(() => buildSectionExcerptBlock(section), [section]);

  return (
    <section
      id={`section-${section.number}`}
      className={`
        scroll-mt-24 transition-all duration-500 relative group/section
        ${isActive ? "opacity-100" : "opacity-90"}
        ${isHighlighted ? "animate-highlight-flash" : ""}
      `}
    >
      {/* Flash highlight overlay */}
      {isHighlighted && (
        <div className="absolute inset-0 -mx-4 rounded-2xl bg-primary/10 border-2 border-primary/40 pointer-events-none animate-highlight-fade" />
      )}
      {/* Section Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4 min-w-0">
          <div className="flex-shrink-0 flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 text-primary font-bold text-xl">
            {section.number}
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
              {section.title}
            </h2>
            <div className="mt-1 text-sm text-muted-foreground">
              Section {section.number} of the interview
            </div>
          </div>
        </div>

        {/* Copy actions (always visible on mobile, hover-to-show on desktop) */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1 opacity-100 lg:opacity-0 lg:group-hover/section:opacity-100 lg:group-focus-within/section:opacity-100 transition-opacity">
          <CopyButton
            text={citation}
            variant="badge"
            size="sm"
            label={anchor}
            showPreview={false}
            successMessage={`Copied citation for ${anchor}`}
          />
          <CopyButton
            text={excerptBlock}
            variant="badge"
            size="sm"
            label="Excerpt"
            successMessage={`Copied ${anchor} excerpt`}
            showPreview={false}
          />
        </div>
      </div>

      {/* Section Content */}
      <div className="space-y-6 pl-0 lg:pl-[4.5rem] max-w-4xl">
        {section.content.map((content, i) => (
          <ContentBlock key={i} content={content} searchHighlights={searchHighlights} />
        ))}
      </div>

      {/* Section Divider */}
      <div className="my-16 flex items-center gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="size-2 rounded-full bg-primary/30" />
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>
    </section>
  );
}

// ============================================================================
// CONTENT BLOCKS
// ============================================================================

function ContentBlock({
  content,
  searchHighlights,
}: {
  content: TranscriptContent;
  searchHighlights?: string[];
}) {
  // Merge content highlights with search highlights
  const mergedHighlights = useMemo(() => {
    const baseHighlights = content.highlights ?? [];
    if (!searchHighlights?.length) return baseHighlights.length > 0 ? baseHighlights : undefined;
    return [...baseHighlights, ...searchHighlights];
  }, [content.highlights, searchHighlights]);

  switch (content.type) {
    case "brenner-quote":
      return <BrennerQuote text={content.text} highlights={mergedHighlights} />;
    case "interviewer-question":
      return <InterviewerQuestion text={content.text} highlights={searchHighlights} />;
    case "paragraph":
      return <Paragraph text={content.text} highlights={mergedHighlights} />;
    default:
      return null;
  }
}

// ============================================================================
// BRENNER QUOTE - The star component
// ============================================================================

interface BrennerQuoteProps {
  text: string;
  highlights?: string[];
}

function BrennerQuote({ text, highlights }: BrennerQuoteProps) {
  // Split into paragraphs
  const paragraphs = text.split(/\n\n+/);

  return (
    <div className="group relative">
      {/* Quote decoration */}
      <div className="absolute -left-4 top-0 text-6xl font-serif text-primary/20 select-none leading-none">
        &ldquo;
      </div>

      {/* Quote card */}
      <div className="relative pl-8 pr-6 py-6 rounded-2xl bg-gradient-to-br from-primary/[0.03] to-transparent border-l-4 border-primary/40 hover:border-primary/60 transition-colors">
        {/* Speaker badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center text-sm font-bold text-primary">
              SB
            </div>
            <span className="text-sm font-medium text-primary">Sydney Brenner</span>
          </div>
          {/* Copy button - appears on hover */}
          <CopyButton
            text={text}
            attribution="— Sydney Brenner"
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            showPreview={true}
          />
        </div>

        {/* Quote text with jargon tooltips */}
        <div className="space-y-4">
          {paragraphs.map((para, i) => (
            <JargonText
              key={i}
              as="p"
              highlights={highlights}
              className="text-lg lg:text-xl leading-relaxed text-foreground/90 font-serif"
            >
              {para}
            </JargonText>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// INTERVIEWER QUESTION
// ============================================================================

function InterviewerQuestion({ text, highlights }: { text: string; highlights?: string[] }) {
  return (
    <div className="flex items-start gap-3 py-4 px-5 rounded-xl bg-muted/30 border border-border/50">
      <div className="flex-shrink-0 size-7 rounded-full bg-muted flex items-center justify-center">
        <span className="text-xs font-bold text-muted-foreground">Q</span>
      </div>
      <JargonText
        as="p"
        highlights={highlights}
        className="text-base text-muted-foreground italic leading-relaxed"
      >
        {text}
      </JargonText>
    </div>
  );
}

// ============================================================================
// PARAGRAPH
// ============================================================================

function Paragraph({ text, highlights }: { text: string; highlights?: string[] }) {
  return (
    <JargonText
      as="p"
      highlights={highlights}
      className="text-lg leading-relaxed text-foreground/80"
    >
      {text}
    </JargonText>
  );
}

// ============================================================================
// MAIN VIEWER COMPONENT (VIRTUALIZED)
// ============================================================================

interface TranscriptViewerProps {
  data: ParsedTranscript;
  estimatedReadTime: string;
  wordCount: string;
}

// Progressive loading for mobile performance - load sections incrementally
const MOBILE_INITIAL_SECTIONS = 8;
const MOBILE_LOAD_INCREMENT = 8;

// Threshold in pixels before hero collapses
const HERO_COLLAPSE_THRESHOLD = 80;

export function TranscriptViewer({ data, estimatedReadTime, wordCount }: TranscriptViewerProps) {
  const [activeSection, setActiveSection] = useState(0);
  const [readingProgress, setReadingProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedSection, setHighlightedSection] = useState<number | null>(null);
  const [searchNavQuery, setSearchNavQuery] = useState<string | null>(null);
  const [isMobileTocOpen, setIsMobileTocOpen] = useState(false);
  const [mobileSectionsLoaded, setMobileSectionsLoaded] = useState(MOBILE_INITIAL_SECTIONS);
  const [isHeroCollapsed, setIsHeroCollapsed] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const initialScrollHandledRef = useRef(false);

  // Current section for sticky indicator
  const currentSection = data.sections[activeSection] ?? null;

  // Global search context for opening search modal
  const { open: openGlobalSearch } = useGlobalSearch();

  // Reading position persistence
  const {
    position,
    save: savePosition,
    canRestore,
    markRestored,
  } = useReadingPosition("transcript", {
    maxSection: data.sections.length - 1,
  });

  // Handle search query change for highlighting
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Convert search query to highlights array
  const searchHighlights = useMemo(() => {
    if (!searchQuery.trim()) return undefined;
    // Split query into words for highlighting
    return searchQuery
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 2);
  }, [searchQuery]);

  // Virtualizer for efficient rendering of large section lists
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual hook is stable; skip compiler memoization warning.
  const virtualizer = useVirtualizer({
    count: data.sections.length,
    getScrollElement: () => scrollContainerRef.current,
    // Estimate average section height (varies greatly, will be measured)
    estimateSize: () => 400,
    // Render extra items above/below viewport for smoother scrolling
    overscan: 3,
  });

  // Track active section based on scroll position
  // Mobile uses window scroll, desktop uses container scroll
  useEffect(() => {
    // Check if we're on mobile (lg breakpoint is 1024px)
    const checkIsMobile = () => window.innerWidth < 1024;
    let isMobile = checkIsMobile();
    const container = scrollContainerRef.current;

    // Mobile scroll handler - uses window scroll
    const handleMobileScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;

      // Update reading progress
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setReadingProgress(Math.min(100, Math.max(0, progress)));

      // Find active section by checking element positions
      const sectionElements = document.querySelectorAll("[id^='section-']");
      const viewportTop = scrollTop + window.innerHeight * 0.3;

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const el = sectionElements[i] as HTMLElement;
        if (el.offsetTop <= viewportTop) {
          const sectionNum = parseInt(el.id.replace("section-", ""), 10);
          const sectionIndex = data.sections.findIndex((s) => s.number === sectionNum);
          if (sectionIndex >= 0) {
            setActiveSection(sectionIndex);
            savePosition(scrollTop, sectionIndex);
          }
          break;
        }
      }
    };

    // Desktop scroll handler - uses container scroll with virtualizer
    const handleDesktopScroll = () => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight - container.clientHeight;

      // Update reading progress
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      setReadingProgress(Math.min(100, Math.max(0, progress)));

      // Find active section based on which virtual item is in view
      const virtualItems = virtualizer.getVirtualItems();
      if (virtualItems.length === 0) return;

      // Find the first item whose bottom edge is past the viewport center
      const viewportCenter = scrollTop + container.clientHeight * 0.3;
      for (const item of virtualItems) {
        const itemBottom = item.start + item.size;
        if (itemBottom > viewportCenter) {
          setActiveSection(item.index);
          savePosition(scrollTop, item.index);
          break;
        }
      }
    };

    // Handle resize to switch between mobile/desktop handlers
    const handleResize = () => {
      const wasMobile = isMobile;
      isMobile = checkIsMobile();

      if (wasMobile !== isMobile) {
        // Switched modes - update listeners
        if (wasMobile) {
          window.removeEventListener("scroll", handleMobileScroll);
          scrollContainerRef.current?.addEventListener("scroll", handleDesktopScroll, {
            passive: true,
          });
        } else {
          scrollContainerRef.current?.removeEventListener("scroll", handleDesktopScroll);
          window.addEventListener("scroll", handleMobileScroll, { passive: true });
        }
      }
    };

    // Set up initial listeners
    if (isMobile) {
      window.addEventListener("scroll", handleMobileScroll, { passive: true });
      handleMobileScroll();
    } else {
      if (container) {
        container.addEventListener("scroll", handleDesktopScroll, { passive: true });
        handleDesktopScroll();
      }
    }

    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleMobileScroll);
      window.removeEventListener("resize", handleResize);
      container?.removeEventListener("scroll", handleDesktopScroll);
    };
  }, [virtualizer, savePosition, data.sections]);

  // Hero collapse effect - tracks scroll position on both mobile and desktop
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isMobile = () => window.innerWidth < 1024;
    const container = scrollContainerRef.current;

    const checkHeroCollapse = () => {
      let scrollTop: number;

      if (isMobile()) {
        scrollTop = window.scrollY;
      } else if (container) {
        scrollTop = container.scrollTop;
      } else {
        return;
      }

      setIsHeroCollapsed(scrollTop > HERO_COLLAPSE_THRESHOLD);
    };

    // Listen to both window and container scroll
    window.addEventListener("scroll", checkHeroCollapse, { passive: true });
    container?.addEventListener("scroll", checkHeroCollapse, { passive: true });

    // Check initial state
    checkHeroCollapse();

    return () => {
      window.removeEventListener("scroll", checkHeroCollapse);
      container?.removeEventListener("scroll", checkHeroCollapse);
    };
  }, []);

  // Progressive loading: IntersectionObserver to load more sections on mobile
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 1024) return;

    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && mobileSectionsLoaded < data.sections.length) {
          setMobileSectionsLoaded((n) => Math.min(n + MOBILE_LOAD_INCREMENT, data.sections.length));
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [mobileSectionsLoaded, data.sections.length]);

  // Handle URL hash OR restore saved position on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (initialScrollHandledRef.current) return;

    const hash = window.location.hash;
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get("q");
    const isMobile = window.innerWidth < 1024;

    // Store query param for back-to-search and highlighting
    if (queryParam) {
      setSearchNavQuery(queryParam);
      // Also set as search query for text highlighting
      setSearchQuery(queryParam);
    }

    // URL hash takes priority over saved position
    if (hash.startsWith("#section-")) {
      const sectionNum = parseInt(hash.replace("#section-", ""), 10);
      const sectionIndex = data.sections.findIndex((s) => s.number === sectionNum);

      if (sectionIndex >= 0) {
        initialScrollHandledRef.current = true;

        // Delay to ensure DOM/virtualizer is initialized
        setTimeout(() => {
          if (isMobile) {
            // Mobile: ensure the target section is loaded before scrolling (progressive loading)
            if (sectionIndex >= mobileSectionsLoaded) {
              setMobileSectionsLoaded(
                Math.min(sectionIndex + MOBILE_LOAD_INCREMENT, data.sections.length),
              );
            }

            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                const el = document.getElementById(`section-${sectionNum}`);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              });
            });
          } else {
            // Desktop: use virtualizer
            virtualizer.scrollToIndex(sectionIndex, { align: "start", behavior: "smooth" });
          }
          // Set flash highlight on the target section
          setHighlightedSection(sectionIndex);
          // Clear highlight after 3 seconds
          setTimeout(() => setHighlightedSection(null), 3000);
        }, 100);
        return;
      }
    }

    // Restore saved position if no hash and we have a saved position
    if (canRestore && position) {
      initialScrollHandledRef.current = true;

      setTimeout(() => {
        if (isMobile) {
          // Mobile: ensure the saved section is loaded before scrolling (progressive loading)
          if (position.activeSection >= mobileSectionsLoaded) {
            setMobileSectionsLoaded(
              Math.min(position.activeSection + MOBILE_LOAD_INCREMENT, data.sections.length),
            );

            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                const section = data.sections[position.activeSection];
                if (section) {
                  const el = document.getElementById(`section-${section.number}`);
                  if (el) {
                    el.scrollIntoView({ block: "start" });
                  }
                }
                markRestored();
              });
            });

            return;
          }

          const section = data.sections[position.activeSection];
          if (section) {
            const el = document.getElementById(`section-${section.number}`);
            if (el) {
              el.scrollIntoView({ block: "start" });
            }
          }
        } else {
          // Desktop: use virtualizer
          virtualizer.scrollToIndex(position.activeSection, { align: "start" });
        }
        markRestored();
      }, 100);
    }
  }, [data.sections, virtualizer, canRestore, position, markRestored, mobileSectionsLoaded]);

  // Handle hash navigation while staying on the transcript page (desktop uses a scroll container,
  // so native anchor scrolling does not work reliably).
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleHashChange = () => {
      const hash = window.location.hash;
      if (!hash.startsWith("#section-")) return;

      const sectionNum = parseInt(hash.replace("#section-", ""), 10);
      if (!Number.isFinite(sectionNum)) return;

      const sectionIndex = data.sections.findIndex((s) => s.number === sectionNum);
      if (sectionIndex < 0) return;

      const isMobile = window.innerWidth < 1024;

      if (isMobile) {
        if (sectionIndex >= mobileSectionsLoaded) {
          setMobileSectionsLoaded(
            Math.min(sectionIndex + MOBILE_LOAD_INCREMENT, data.sections.length),
          );
        }

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const el = document.getElementById(`section-${sectionNum}`);
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        });
      } else {
        virtualizer.scrollToIndex(sectionIndex, { align: "start", behavior: "smooth" });
      }

      setHighlightedSection(sectionIndex);
      setTimeout(() => setHighlightedSection(null), 3000);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [data.sections, mobileSectionsLoaded, virtualizer]);

  // Scroll to section from TOC
  // Mobile: scroll element into view, Desktop: use virtualizer
  const scrollToSection = useCallback(
    (index: number) => {
      const isMobile = window.innerWidth < 1024;

      if (isMobile) {
        // Mobile: ensure section is loaded first (progressive loading)
        if (index >= mobileSectionsLoaded) {
          // Load up to the target section plus a buffer
          setMobileSectionsLoaded(Math.min(index + MOBILE_LOAD_INCREMENT, data.sections.length));
          // Wait for DOM update then scroll
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const section = data.sections[index];
              if (section) {
                const el = document.getElementById(`section-${section.number}`);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }
            });
          });
        } else {
          // Section already loaded, scroll directly
          const section = data.sections[index];
          if (section) {
            const el = document.getElementById(`section-${section.number}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }
        }
      } else {
        // Desktop: use virtualizer
        virtualizer.scrollToIndex(index, { align: "start", behavior: "smooth" });
      }
    },
    [virtualizer, data.sections, mobileSectionsLoaded],
  );

  // Memoize virtual items to avoid recalculation
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <>
      <ReadingProgress progress={readingProgress} />

      <TranscriptHero
        title={data.title}
        subtitle={data.subtitle}
        totalSections={data.totalSections}
        estimatedReadTime={estimatedReadTime}
        wordCount={wordCount}
        isCollapsed={isHeroCollapsed}
      />

      {data.sections.length > 0 ? (
        <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8 xl:gap-12">
          {/* Sidebar with Search + TOC (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 z-30 space-y-4">
              <TranscriptSearch
                sections={data.sections}
                onResultClick={scrollToSection}
                onSearchChange={handleSearchChange}
              />
              <TableOfContents
                sections={data.sections}
                activeSection={activeSection}
                onSectionClick={scrollToSection}
              />
            </div>
          </aside>

          {/* Mobile Search + collapsible TOC */}
          <div className="lg:hidden mb-8 space-y-4">
            <TranscriptSearch
              sections={data.sections}
              onResultClick={(index) => {
                scrollToSection(index);
                setIsMobileTocOpen(false);
              }}
              onSearchChange={handleSearchChange}
            />
            {/* Collapsed TOC - only shows when toggled */}
            {isMobileTocOpen && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <TableOfContents
                  sections={data.sections}
                  activeSection={activeSection}
                  onSectionClick={(index) => {
                    scrollToSection(index);
                    setIsMobileTocOpen(false);
                  }}
                />
              </div>
            )}
          </div>

          {/* Sticky section indicator for mobile - shows current position while reading */}
          <StickySectionIndicator
            currentSection={currentSection}
            totalSections={data.totalSections}
            onTocClick={() => setIsMobileTocOpen(!isMobileTocOpen)}
          />

          {/* Main content - normal flow on mobile, virtualized container on desktop */}
          <main className="scroll-smooth">
            {/* Mobile: progressive loading - render sections incrementally */}
            <div className="lg:hidden">
              {data.sections.slice(0, mobileSectionsLoaded).map((section, index) => (
                <TranscriptSection
                  key={section.number}
                  section={section}
                  isActive={activeSection === index}
                  isHighlighted={highlightedSection === index}
                  searchHighlights={searchHighlights}
                />
              ))}
              {/* Sentinel for loading more sections */}
              {mobileSectionsLoaded < data.sections.length && (
                <div
                  ref={loadMoreSentinelRef}
                  className="flex items-center justify-center py-8 text-muted-foreground"
                >
                  <div className="flex items-center gap-2">
                    <div className="size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span className="text-sm">Loading more sections...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop: virtualized scroll container */}
            <div
              ref={scrollContainerRef}
              className="hidden lg:block overflow-y-auto scroll-smooth transcript-scroll"
            >
              {/* Total height spacer for virtualization */}
              <div
                style={{
                  height: virtualizer.getTotalSize(),
                  width: "100%",
                  position: "relative",
                }}
              >
                {/* Only render visible items */}
                {virtualItems.map((virtualRow) => {
                  const section = data.sections[virtualRow.index];
                  return (
                    <div
                      key={section.number}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <TranscriptSection
                        section={section}
                        isActive={activeSection === virtualRow.index}
                        isHighlighted={highlightedSection === virtualRow.index}
                        searchHighlights={searchHighlights}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </main>
        </div>
      ) : data.rawContent ? (
        <div className="max-w-3xl mx-auto">
          <RawContentFallback content={data.rawContent} />
        </div>
      ) : null}

      {/* Back to Search - floating button when coming from search */}
      {searchNavQuery && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-fade-in-up">
          <button
            onClick={openGlobalSearch}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-105"
          >
            <BackToSearchIcon />
            <span className="font-medium">Back to Search</span>
            <kbd className="px-1.5 py-0.5 rounded bg-primary-foreground/20 text-xs font-mono">
              ⌘K
            </kbd>
          </button>
        </div>
      )}
    </>
  );
}

// ============================================================================
// ICONS
// ============================================================================

function BackToSearchIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

function SectionIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function WordIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
      className={`size-5 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`size-4 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

function CloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`size-4 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ============================================================================
// RAW CONTENT FALLBACK (for unstructured files)
// ============================================================================

function RawContentFallback({ content }: { content: string }) {
  const paragraphs = content.split(/\n\n+/).filter(Boolean);

  return (
    <div className="prose prose-lg dark:prose-invert max-w-none">
      {paragraphs.map((para, i) => (
        <p key={i} className="text-base lg:text-lg leading-relaxed text-foreground/85 mb-4">
          <JargonText>{para}</JargonText>
        </p>
      ))}
    </div>
  );
}
