"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { JargonText } from "@/components/jargon-text";
import { CopyButton, ReferenceCopyButton } from "@/components/ui/copy-button";
import { useDebounce } from "@/hooks/useDebounce";
import { quoteBankDomIdFromSectionId, quoteBankSectionIdFromDomId } from "@/lib/anchors";
import type { ParsedQuoteBank, Quote } from "@/lib/quotebank-parser";
import { filterQuotesByTag, searchQuotes } from "@/lib/quotebank-parser";

// ============================================================================
// HERO
// ============================================================================

interface QuoteBankHeroProps {
  title: string;
  description: string;
  quoteCount: number;
  tagCount: number;
}

function QuoteBankHero({ title, description, quoteCount, tagCount }: QuoteBankHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 mb-8 sm:mb-12">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-48 sm:w-80 h-48 sm:h-80 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-40 sm:w-64 h-40 sm:h-64 bg-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

      {/* Quote decoration */}
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 text-[100px] sm:text-[180px] font-serif text-amber-500/10 leading-none select-none hidden sm:block">
        &ldquo;
      </div>

      <div className="relative px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs sm:text-sm font-medium mb-4 sm:mb-6">
          <QuoteIcon className="size-3.5 sm:size-4" />
          Reference Collection
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-3 sm:mb-4">
          {title}
        </h1>

        {/* Description */}
        <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-2xl">
          {description}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 text-sm">
            <span className="text-xl sm:text-2xl font-bold text-foreground">{quoteCount}</span>
            <span className="text-muted-foreground text-xs sm:text-sm">quotes</span>
          </div>
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 text-sm">
            <span className="text-xl sm:text-2xl font-bold text-foreground">{tagCount}</span>
            <span className="text-muted-foreground text-xs sm:text-sm">categories</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TAG CLOUD - Compact, sorted by popularity, filtered for usefulness
// ============================================================================

interface TagCloudProps {
  tags: string[];
  selectedTag: string | null;
  onTagSelect: (tag: string | null) => void;
  quoteCounts: Record<string, number>;
}

// Only show tags with at least this many quotes (singletons are useless for filtering)
const MIN_QUOTES_FOR_TAG = 2;
// Show this many popular tags by default
const INITIAL_VISIBLE = 12;

function TagCloud({ tags, selectedTag, onTagSelect, quoteCounts }: TagCloudProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter out useless singleton tags, then sort by popularity (most quotes first)
  const meaningfulTags = useMemo(() => {
    return tags
      .filter((tag) => (quoteCounts[tag] || 0) >= MIN_QUOTES_FOR_TAG)
      .sort((a, b) => (quoteCounts[b] || 0) - (quoteCounts[a] || 0));
  }, [tags, quoteCounts]);

  // Determine visible tags
  const visibleTags = isExpanded ? meaningfulTags : meaningfulTags.slice(0, INITIAL_VISIBLE);
  const hiddenCount = meaningfulTags.length - INITIAL_VISIBLE;
  const showExpandButton = hiddenCount > 0;

  // If selected tag is not in visible tags (but is meaningful), always show it
  const selectedTagInHidden =
    selectedTag && !visibleTags.includes(selectedTag) && meaningfulTags.includes(selectedTag);

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-2">
        {/* All button */}
        <button
          type="button"
          onClick={() => onTagSelect(null)}
          className={`
            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
            transition-all duration-150 touch-manipulation active:scale-95
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
            ${
              selectedTag === null
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }
          `}
        >
          All
        </button>

        {/* If selected tag is hidden, show it first */}
        {selectedTagInHidden && (
          <button
            type="button"
            onClick={() => onTagSelect(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
              bg-primary text-primary-foreground shadow-sm
              transition-all duration-150 touch-manipulation active:scale-95
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            {selectedTag.replace(/-/g, " ")}
            <span className="text-xs opacity-70">{quoteCounts[selectedTag] || 0}</span>
          </button>
        )}

        {/* Visible tags */}
        {visibleTags.map((tag) => {
          // Skip if this is the selected tag shown above
          if (selectedTagInHidden && tag === selectedTag) return null;

          return (
            <button
              type="button"
              key={tag}
              onClick={() => onTagSelect(tag === selectedTag ? null : tag)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                transition-all duration-150 touch-manipulation active:scale-95
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
                ${
                  selectedTag === tag
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }
              `}
            >
              {tag.replace(/-/g, " ")}
              <span className={`text-xs ${selectedTag === tag ? "opacity-70" : "opacity-50"}`}>
                {quoteCounts[tag] || 0}
              </span>
            </button>
          );
        })}

        {/* Expand/collapse button */}
        {showExpandButton && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium
              bg-transparent text-primary hover:bg-primary/10
              transition-all duration-150 touch-manipulation active:scale-95
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            {isExpanded ? (
              <>
                <ChevronUpIcon className="size-3.5" />
                Less
              </>
            ) : (
              <>
                +{hiddenCount}
                <ChevronDownIcon className="size-3.5" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
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

function ChevronDownIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

// ============================================================================
// SEARCH
// ============================================================================

interface SearchProps {
  value: string;
  onChange: (value: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

function Search({ value, onChange, inputRef }: SearchProps) {
  return (
    <div className="relative mb-6 sm:mb-8">
      <SearchIcon className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 size-4 sm:size-5 text-muted-foreground pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search quotes... (press / to focus)"
        className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-base"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground active:scale-90 transition-all touch-manipulation rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Clear search"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// QUOTE CARD
// ============================================================================

interface QuoteCardProps {
  quote: Quote;
  isHighlighted?: boolean;
  onTagClick?: (tag: string) => void;
}

function QuoteCard({ quote, isHighlighted, onTagClick }: QuoteCardProps) {
  return (
    <article
      className={`
        group relative rounded-2xl border bg-card overflow-hidden
        transition-all duration-300 ease-out
        ${
          isHighlighted
            ? "ring-2 ring-primary/50 bg-primary/5 border-primary/30 shadow-xl shadow-primary/10"
            : "border-border hover:border-primary/20 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20"
        }
      `}
    >
      {/* Accent gradient bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500 via-orange-500 to-amber-600 opacity-60 group-hover:opacity-100 transition-opacity" />

      {/* Reference badge - clickable to copy */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
        <ReferenceCopyButton
          reference={quote.sectionId}
          quoteText={quote.quote}
          source="Sydney Brenner"
        />
      </div>

      <div className="p-4 pl-5 sm:p-6 sm:pl-7 lg:p-8 lg:pl-9">
        {/* Title - increased right padding to prevent overlap with copy button */}
        <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground mb-3 sm:mb-4 pr-16 sm:pr-20 lg:pr-24 group-hover:text-primary transition-colors duration-200 leading-snug">
          {quote.title}
        </h3>

        {/* Quote text - always show full quote */}
        <div className="relative">
          {/* Opening quote mark */}
          <div className="absolute -left-1 -top-1 sm:-left-2 sm:-top-2 text-4xl sm:text-5xl text-primary/15 font-serif select-none leading-none">
            &ldquo;
          </div>
          <blockquote className="pl-4 sm:pl-5 pr-2 text-[15px] sm:text-base lg:text-lg leading-[1.75] text-foreground/90 italic font-serif">
            <JargonText>{quote.quote}</JargonText>
          </blockquote>
          {/* Closing quote mark */}
          <div className="text-right -mt-2 mr-2 text-3xl sm:text-4xl text-primary/15 font-serif select-none leading-none">
            &rdquo;
          </div>
          {/* Copy button - appears on hover */}
          <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <CopyButton
              text={quote.quote}
              attribution={`— Sydney Brenner, ${quote.sectionId}`}
              variant="ghost"
              size="sm"
              showPreview={true}
            />
          </div>
        </div>

        {/* Why it matters */}
        {quote.context && (
          <div className="mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-border/50">
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div className="flex-shrink-0 size-6 sm:size-7 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                <LightbulbIcon className="size-3.5 sm:size-4 text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] sm:text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1.5">
                  Takeaway
                </div>
                <p className="text-sm sm:text-[15px] text-foreground/80 leading-relaxed">
                  <JargonText>{quote.context}</JargonText>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tags - horizontal scroll on mobile, clickable to filter */}
        {quote.tags.length > 0 && (
          <div className="mt-4 sm:mt-5 -mx-4 px-4 sm:mx-0 sm:px-0 relative">
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto sm:flex-wrap scrollbar-hide">
              {quote.tags.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => onTagClick?.(tag)}
                  className="flex-shrink-0 px-2.5 py-1 text-xs rounded-full bg-muted/70 text-muted-foreground whitespace-nowrap
                    hover:bg-primary/10 hover:text-primary active:scale-95
                    transition-all duration-150 touch-manipulation
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {tag.replace(/-/g, " ")}
                </button>
              ))}
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent pointer-events-none sm:hidden" />
          </div>
        )}
      </div>
    </article>
  );
}

// ============================================================================
// MAIN VIEWER
// ============================================================================

interface QuoteBankViewerProps {
  data: ParsedQuoteBank;
}

export function QuoteBankViewer({ data }: QuoteBankViewerProps) {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [forceUnfiltered, setForceUnfiltered] = useState(false);
  const [highlightedSectionId, setHighlightedSectionId] = useState<string | null>(null);
  const pendingScrollSectionIdRef = useRef<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Debounce search query for better performance
  const [debouncedQuery] = useDebounce(searchQuery, 200);

  // Keyboard shortcut: "/" to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if already in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Calculate quote counts per tag
  const quoteCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    data.quotes.forEach((q) => {
      q.tags.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return counts;
  }, [data.quotes]);

  const quoteSectionIdSet = useMemo(() => {
    return new Set(data.quotes.map((q) => q.sectionId));
  }, [data.quotes]);

  // Filter and search (using debounced query)
  const filteredQuotes = useMemo(() => {
    let result = data.quotes;
    if (selectedTag) {
      result = filterQuotesByTag(result, selectedTag);
    }
    const effectiveQuery = forceUnfiltered ? "" : debouncedQuery;
    if (effectiveQuery.trim()) {
      result = searchQuotes(result, effectiveQuery);
    }
    return result;
  }, [data.quotes, selectedTag, debouncedQuery, forceUnfiltered]);

  const scheduleScrollToSectionId = useCallback((sectionId: string) => {
    pendingScrollSectionIdRef.current = sectionId;
    setForceUnfiltered(true);
    setSelectedTag(null);
    setSearchQuery("");
  }, []);

  // Handle URL hash navigation (supports both "#section-N" and legacy "#§N")
  useEffect(() => {
    if (typeof window === "undefined") return;

    const parseTargetFromHash = (hash: string): string | null => {
      if (!hash.startsWith("#")) return null;
      let decoded: string;
      try {
        decoded = decodeURIComponent(hash.slice(1));
      } catch {
        return null;
      }
      if (!decoded) return null;
      if (decoded.startsWith("section-")) {
        try {
          return quoteBankSectionIdFromDomId(decoded);
        } catch {
          return null;
        }
      }
      if (decoded.startsWith("§")) return decoded;
      return null;
    };

    const handleHash = () => {
      const target = parseTargetFromHash(window.location.hash);
      if (!target) return;
      if (!quoteSectionIdSet.has(target)) return;
      // Defer to avoid setState synchronously within effect
      queueMicrotask(() => scheduleScrollToSectionId(target));
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [scheduleScrollToSectionId, quoteSectionIdSet]);

  // Perform pending scroll once the target exists in the current filtered list.
  useEffect(() => {
    const targetSectionId = pendingScrollSectionIdRef.current;
    if (!targetSectionId) return;

    const index = filteredQuotes.findIndex((q) => q.sectionId === targetSectionId);
    if (index < 0) {
      if (forceUnfiltered) {
        pendingScrollSectionIdRef.current = null;
        // Defer setState to avoid synchronous call within effect
        queueMicrotask(() => setForceUnfiltered(false));
      }
      return;
    }

    pendingScrollSectionIdRef.current = null;
    // Defer setState to avoid synchronous call within effect
    queueMicrotask(() => setForceUnfiltered(false));

    requestAnimationFrame(() => {
      try {
        const domId = quoteBankDomIdFromSectionId(targetSectionId);
        const element = document.getElementById(domId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        window.history.replaceState(null, "", `#${domId}`);
      } catch {
        // ignore
      }
      setHighlightedSectionId(targetSectionId);
      window.setTimeout(() => setHighlightedSectionId(null), 3000);
    });
  }, [filteredQuotes, forceUnfiltered]);

  // Random quote shuffle
  const handleRandomQuote = useCallback(() => {
    if (filteredQuotes.length === 0) return;
    const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
    const randomQuote = filteredQuotes[randomIndex];
    if (randomQuote) {
      const domId = quoteBankDomIdFromSectionId(randomQuote.sectionId);
      const element = document.getElementById(domId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setHighlightedSectionId(randomQuote.sectionId);
      setTimeout(() => setHighlightedSectionId(null), 3000);
    }
  }, [filteredQuotes]);

  return (
    <>
      <QuoteBankHero
        title={data.title}
        description={data.description}
        quoteCount={data.quotes.length}
        tagCount={data.allTags.length}
      />

      <div className="max-w-4xl mx-auto">
        <Search value={searchQuery} onChange={setSearchQuery} inputRef={searchInputRef} />

        <TagCloud
          tags={data.allTags}
          selectedTag={selectedTag}
          onTagSelect={setSelectedTag}
          quoteCounts={quoteCounts}
        />

        {/* Results count with actions */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filteredQuotes.length}</span> of{" "}
            {data.quotes.length} quotes
            {selectedTag && (
              <span className="ml-1.5">
                in{" "}
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className="inline-flex items-center gap-1 text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  {selectedTag.replace(/-/g, " ")}
                  <XIcon className="size-3" />
                </button>
              </span>
            )}
          </div>

          {/* Random quote button */}
          <button
            type="button"
            onClick={handleRandomQuote}
            disabled={filteredQuotes.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              text-muted-foreground hover:text-foreground hover:bg-muted/70
              active:scale-95 transition-all duration-150 touch-manipulation
              disabled:opacity-40 disabled:pointer-events-none
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Jump to random quote"
          >
            <ShuffleIcon className="size-4" />
            <span className="hidden sm:inline">Surprise me</span>
          </button>
        </div>

        {/* Quote list */}
        {filteredQuotes.length > 0 ? (
          <div className="space-y-6 sm:space-y-8">
            {filteredQuotes.map((quote) => {
              const domId = quoteBankDomIdFromSectionId(quote.sectionId);
              return (
                <div key={quote.sectionId} id={domId} style={{ contain: "layout style" }}>
                  <QuoteCard
                    quote={quote}
                    isHighlighted={highlightedSectionId === quote.sectionId}
                    onTagClick={setSelectedTag}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 px-4">
            <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-muted/50 mb-4">
              <SearchIcon className="size-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No quotes found</h3>
            <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
              Try adjusting your search or filter criteria to discover more wisdom
            </p>
            {(searchQuery || selectedTag) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTag(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium
                  hover:bg-primary/90 active:scale-95 transition-all duration-150 touch-manipulation
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================================
// ICONS
// ============================================================================

function QuoteIcon({ className = "" }: { className?: string }) {
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
        d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
      />
    </svg>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
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
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

function XIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function LightbulbIcon({ className = "" }: { className?: string }) {
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
        d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
      />
    </svg>
  );
}

function ShuffleIcon({ className = "size-4" }: { className?: string }) {
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
        d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
      />
    </svg>
  );
}
