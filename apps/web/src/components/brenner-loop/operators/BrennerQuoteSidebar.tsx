"use client";

/**
 * BrennerQuoteSidebar - Contextual Brenner quotes for operator sessions
 *
 * Displays relevant quotes from Sydney Brenner that rotate based on
 * the current operator step. Provides wisdom and guidance during
 * hypothesis testing.
 *
 * @see brenner_bot-vw6p.6 (bead)
 * @module components/brenner-loop/operators/BrennerQuoteSidebar
 */

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Quote as QuoteIcon, Sparkles } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { Quote } from "@/lib/quotebank-parser";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface BrennerQuoteSidebarProps {
  /** Quotes to display */
  quotes: Quote[];
  /** Current step ID for quote rotation */
  currentStepId?: string;
  /** Whether to auto-rotate quotes */
  autoRotate?: boolean;
  /** Rotation interval in ms (default: 10000) */
  rotationInterval?: number;
  /** Additional CSS classes */
  className?: string;
  /** Force collapsed state (for mobile accordion) */
  defaultCollapsed?: boolean;
}

// ============================================================================
// Quote Card Component
// ============================================================================

interface QuoteCardProps {
  quote: Quote;
  isActive?: boolean;
}

function parseSectionNumber(sectionId: string): number | null {
  const match = sectionId.match(/§(\d+)/);
  if (!match) return null;
  const num = Number.parseInt(match[1], 10);
  return Number.isFinite(num) ? num : null;
}

function QuoteCard({ quote, isActive = true }: QuoteCardProps) {
  const sectionNumber = parseSectionNumber(quote.sectionId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isActive ? 1 : 0.5, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "p-4 rounded-xl border bg-card/50 backdrop-blur-sm",
        isActive ? "border-primary/30 shadow-sm" : "border-border/50",
      )}
    >
      {/* Quote icon */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 p-1.5 rounded-lg bg-primary/10">
          <QuoteIcon className="size-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-primary">{quote.sectionId}</span>
          <span className="mx-2 text-muted-foreground">—</span>
          <span className="text-xs text-muted-foreground">{quote.title}</span>
        </div>
      </div>

      {/* Quote text */}
      <blockquote className="text-sm leading-relaxed text-foreground italic pl-4 border-l-2 border-primary/30">
        &ldquo;{quote.quote}&rdquo;
      </blockquote>

      {/* Context */}
      {quote.context && (
        <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{quote.context}</p>
      )}

      {/* Tags */}
      {quote.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {quote.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-[10px] rounded-full bg-muted text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {quote.tags.length > 3 && (
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-muted text-muted-foreground">
              +{quote.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {sectionNumber !== null && (
        <div className="mt-3">
          <Link
            href={`/corpus/transcript#section-${sectionNumber}`}
            className="text-xs text-primary hover:underline"
          >
            Read more →
          </Link>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Main Sidebar Component
// ============================================================================

export function BrennerQuoteSidebar({
  quotes,
  currentStepId,
  autoRotate = true,
  rotationInterval = 10000,
  className,
  defaultCollapsed = false,
}: BrennerQuoteSidebarProps) {
  const [currentQuoteIndex, setCurrentQuoteIndex] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(!defaultCollapsed);

  // Reset to first quote when step changes
  React.useEffect(() => {
    setCurrentQuoteIndex(0);
  }, [currentStepId]);

  // Auto-rotate quotes
  React.useEffect(() => {
    if (!autoRotate || isPaused || quotes.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, rotationInterval);

    return () => clearInterval(timer);
  }, [autoRotate, isPaused, quotes.length, rotationInterval]);

  // No quotes to display
  if (quotes.length === 0) {
    return (
      <div
        className={cn("p-4 rounded-xl border border-dashed border-border bg-muted/30", className)}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="size-4" />
          <span className="text-sm">Brenner wisdom loading...</span>
        </div>
      </div>
    );
  }

  const currentQuote = quotes[currentQuoteIndex];

  // Collapsed/accordion variant for mobile
  if (defaultCollapsed) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
        <CollapsibleTrigger
          showChevron={false}
          className="w-full p-3 rounded-xl border border-border bg-card/50 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QuoteIcon className="size-4 text-primary" />
              <span className="text-sm font-medium">Brenner Says</span>
              {quotes.length > 1 && (
                <span className="text-xs text-muted-foreground">
                  ({currentQuoteIndex + 1}/{quotes.length})
                </span>
              )}
            </div>
            <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="size-4 text-muted-foreground" />
            </motion.div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div
            className="mt-2"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <AnimatePresence mode="wait">
              {currentQuote && <QuoteCard key={currentQuote.sectionId} quote={currentQuote} />}
            </AnimatePresence>

            {/* Quote navigation */}
            {quotes.length > 1 && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentQuoteIndex((prev) => (prev === 0 ? quotes.length - 1 : prev - 1))
                  }
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Previous quote"
                >
                  <ChevronUp className="size-4 rotate-[-90deg]" />
                </button>

                <div className="flex gap-1">
                  {quotes.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setCurrentQuoteIndex(index)}
                      className={cn(
                        "size-1.5 rounded-full transition-all",
                        index === currentQuoteIndex
                          ? "bg-primary w-4"
                          : "bg-muted-foreground/30 hover:bg-muted-foreground/50",
                      )}
                      aria-label={`Go to quote ${index + 1}`}
                      aria-current={index === currentQuoteIndex}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Next quote"
                >
                  <ChevronDown className="size-4 rotate-[-90deg]" />
                </button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Full sidebar variant for desktop
  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-4 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm",
        className,
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <QuoteIcon className="size-4 text-primary" />
          </div>
          <span className="text-sm font-semibold">Brenner Says</span>
        </div>
        {quotes.length > 1 && (
          <span className="text-xs text-muted-foreground font-mono">
            {currentQuoteIndex + 1}/{quotes.length}
          </span>
        )}
      </div>

      {/* Quote display */}
      <AnimatePresence mode="wait">
        {currentQuote && <QuoteCard key={currentQuote.sectionId} quote={currentQuote} />}
      </AnimatePresence>

      {/* Quote navigation */}
      {quotes.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() =>
              setCurrentQuoteIndex((prev) => (prev === 0 ? quotes.length - 1 : prev - 1))
            }
            className="p-2 rounded-lg hover:bg-muted transition-colors touch-manipulation"
            aria-label="Previous quote"
          >
            <ChevronUp className="size-4 rotate-[-90deg]" />
          </button>

          <div className="flex gap-1.5">
            {quotes.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentQuoteIndex(index)}
                className={cn(
                  "size-2 rounded-full transition-all duration-200",
                  index === currentQuoteIndex
                    ? "bg-primary w-6"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50",
                )}
                aria-label={`Go to quote ${index + 1}`}
                aria-current={index === currentQuoteIndex}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length)}
            className="p-2 rounded-lg hover:bg-muted transition-colors touch-manipulation"
            aria-label="Next quote"
          >
            <ChevronDown className="size-4 rotate-[-90deg]" />
          </button>
        </div>
      )}

      {/* Auto-rotate indicator */}
      {autoRotate && quotes.length > 1 && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <motion.div
            className="size-1.5 rounded-full bg-primary/50"
            animate={isPaused ? {} : { opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span>{isPaused ? "Paused" : "Auto-rotating"}</span>
        </div>
      )}
    </div>
  );
}

export default BrennerQuoteSidebar;
