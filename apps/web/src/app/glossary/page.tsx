"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Jargon } from "@/components/jargon";
import {
  getCategoryCounts,
  getTermCount,
  type JargonCategory,
  type JargonTerm,
  jargonDictionary,
  searchJargon,
} from "@/lib/jargon";

// ============================================================================
// TYPES
// ============================================================================

type FilterCategory = JargonCategory | "all";

// ============================================================================
// ICONS
// ============================================================================

const BookOpenIcon = ({ className = "size-5" }: { className?: string }) => (
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
      d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
    />
  </svg>
);

const SearchIcon = ({ className = "size-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
    />
  </svg>
);

const ChevronDownIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const LightbulbIcon = ({ className = "size-4" }: { className?: string }) => (
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
      d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
    />
  </svg>
);

const SparklesIcon = ({ className = "size-4" }: { className?: string }) => (
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
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
    />
  </svg>
);

const MagnifyingGlassIcon = ({ className = "size-12" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
    />
  </svg>
);

// ============================================================================
// HIGHLIGHT HELPER
// ============================================================================

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) {
    return <>{text}</>;
  }

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "i");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-primary/20 text-foreground rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_LABELS: Record<FilterCategory, string> = {
  all: "All",
  operators: "Operators",
  brenner: "Brenner",
  biology: "Biology",
  bayesian: "Bayesian",
  method: "Method",
  project: "Project",
};

const CATEGORY_COLORS: Record<JargonCategory, string> = {
  operators: "bg-primary/10 text-primary border-primary/20",
  brenner: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  biology: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  bayesian: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  method: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  project: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

// ============================================================================
// COMPONENTS
// ============================================================================

interface TermCardProps {
  termKey: string;
  term: JargonTerm;
  isExpanded: boolean;
  onToggle: () => void;
  searchQuery: string;
}

function TermCard({ termKey, term, isExpanded, onToggle, searchQuery }: TermCardProps) {
  return (
    <motion.div
      id={termKey}
      layout
      className={`rounded-xl border bg-card overflow-hidden transition-colors duration-200 ${
        isExpanded
          ? "border-primary/30 shadow-lg"
          : "border-border hover:border-border/80 hover:shadow-sm"
      }`}
      initial={false}
    >
      {/* Header - always visible */}
      <motion.button
        onClick={onToggle}
        className="w-full p-4 flex items-start justify-between gap-4 text-left touch-manipulation"
        whileTap={{ scale: 0.995 }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="font-semibold text-foreground">
              <HighlightedText text={term.term} query={searchQuery} />
            </span>
            <span
              className={`px-2 py-0.5 text-xs rounded-full border ${CATEGORY_COLORS[term.category]}`}
            >
              {CATEGORY_LABELS[term.category]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            <HighlightedText text={term.short} query={searchQuery} />
          </p>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="flex-shrink-0 mt-1"
        >
          <ChevronDownIcon className="size-5 text-muted-foreground" />
        </motion.div>
      </motion.button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border/50 pt-4">
              {/* Full explanation */}
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.05 }}
              >
                <p className="text-sm text-foreground leading-relaxed">{term.long}</p>
              </motion.div>

              {/* Why box */}
              {term.why && (
                <motion.div
                  className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3"
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                    <LightbulbIcon className="size-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">
                      Why it matters
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{term.why}</p>
                </motion.div>
              )}

              {/* Analogy box */}
              {term.analogy && (
                <motion.div
                  className="rounded-lg border border-primary/20 bg-primary/5 p-3"
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <SparklesIcon className="size-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">
                      Think of it like...
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{term.analogy}</p>
                </motion.div>
              )}

              {/* Related terms */}
              {term.related && term.related.length > 0 && (
                <motion.div
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Related terms:
                  </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {term.related.map((relatedKey) => {
                      const relatedTerm = jargonDictionary[relatedKey];
                      if (!relatedTerm) return null;
                      return (
                        <Link
                          key={relatedKey}
                          href={`#${relatedKey}`}
                          className="text-sm px-2 py-0.5 rounded-full border border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground hover:border-primary/30 active:scale-95 transition-all touch-manipulation"
                        >
                          {relatedTerm.term}
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function GlossaryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("all");
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());

  const totalCount = getTermCount();
  const categoryCounts = useMemo(() => getCategoryCounts(), []);

  // Filter terms based on search and category
  const filteredTerms = useMemo(() => {
    let entries: [string, JargonTerm][];

    if (searchQuery.trim()) {
      entries = searchJargon(searchQuery);
    } else {
      entries = Object.entries(jargonDictionary);
    }

    if (activeCategory !== "all") {
      entries = entries.filter(([, term]) => term.category === activeCategory);
    }

    // Sort alphabetically by term name
    return entries.sort((a, b) => a[1].term.localeCompare(b[1].term));
  }, [searchQuery, activeCategory]);

  // Handle toggle
  const toggleTerm = useCallback((key: string) => {
    setExpandedTerms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Handle deep linking
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && jargonDictionary[hash]) {
        // Clear filters to ensure the term is visible
        setSearchQuery("");
        setActiveCategory("all");
        // Expand the term
        setExpandedTerms((prev) => new Set(prev).add(hash));
        // Scroll to it (wait for filters to clear and re-render)
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
      }
    };

    // Check on mount
    handleHashChange();

    // Listen for changes
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-12 rounded-xl bg-primary/10 text-primary">
            <BookOpenIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Glossary</h1>
            <p className="text-muted-foreground">Plain-English definitions for technical terms</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Many dotted-underline terms throughout the site link here. Browse by category—from{" "}
          <Jargon term="operators">Brenner operators</Jargon> to{" "}
          <Jargon term="bayesian-update">Bayesian reasoning</Jargon>—or search for specific
          concepts.
        </p>
      </header>

      {/* Search + Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative group/search">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-muted-foreground group-focus-within/search:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search terms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 sm:h-11 pl-11 pr-4 text-base sm:text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label="Clear search"
            >
              <svg
                className="size-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1.5 text-sm rounded-full border transition-all touch-manipulation active:scale-[0.97] ${
              activeCategory === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground hover:border-border active:bg-muted/50"
            }`}
          >
            All ({totalCount})
          </button>
          {categoryCounts.map(([category, count]) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-all touch-manipulation active:scale-[0.97] ${
                activeCategory === category
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground hover:border-border active:bg-muted/50"
              }`}
            >
              {CATEGORY_LABELS[category]} ({count})
            </button>
          ))}
        </div>

        {/* Result count */}
        <p className="text-sm text-muted-foreground">
          Showing {filteredTerms.length} of {totalCount} terms
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      </div>

      {/* Term cards */}
      <div className="space-y-3">
        {filteredTerms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 space-y-4"
          >
            <div className="flex justify-center">
              <div className="size-20 rounded-full bg-muted/50 flex items-center justify-center">
                <MagnifyingGlassIcon className="size-10 text-muted-foreground/50" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-foreground">No terms found</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {searchQuery
                  ? `No results for "${searchQuery}". Try a different search term or browse by category.`
                  : "No terms match the selected category."}
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <svg
                className="size-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              Clear all filters
            </button>
          </motion.div>
        ) : (
          filteredTerms.map(([key, term]) => (
            <TermCard
              key={key}
              termKey={key}
              term={term}
              isExpanded={expandedTerms.has(key)}
              onToggle={() => toggleTerm(key)}
              searchQuery={searchQuery}
            />
          ))
        )}
      </div>
    </div>
  );
}
