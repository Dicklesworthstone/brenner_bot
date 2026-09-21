"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import type { AttachedQuote } from "@/lib/brenner-loop/types";
import { searchAction } from "@/lib/globalSearchAction";
import type { GlobalSearchHit, GlobalSearchResult, SearchCategory } from "@/lib/globalSearchTypes";
import { cn } from "@/lib/utils";

// ============================================================================
// Icons
// ============================================================================

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-4", className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6 6a7.5 7.5 0 0 0 10.65 10.65Z"
      />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-4", className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6v6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14 21 3" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-4", className)}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("size-4 animate-spin", className)} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ============================================================================
// Types
// ============================================================================

export interface CorpusSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hypothesisId?: string;
  onAttachQuote?: (quote: Omit<AttachedQuote, "id" | "attachedAt">) => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

const SESSION_CATEGORIES: SearchCategory[] = ["all", "transcript", "quote-bank", "distillation"];

export function CorpusSearchDialog({
  open,
  onOpenChange,
  hypothesisId,
  onAttachQuote,
  className,
}: CorpusSearchDialogProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, isPending] = useDebounce(query, 150);
  const [activeCategory, setActiveCategory] = React.useState<SearchCategory>("transcript");
  const [results, setResults] = React.useState<GlobalSearchResult | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);

  const isLoading = isPending || isSearching;
  const canAttach = Boolean(hypothesisId && onAttachQuote);

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults(null);
    setIsSearching(false);
    setActiveCategory("transcript");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    if (!debouncedQuery.trim()) {
      setResults(null);
      setIsSearching(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setIsSearching(true);
      try {
        const result = await searchAction(debouncedQuery, {
          limit: 25,
          category: activeCategory,
        });
        if (!cancelled) {
          setResults(result);
        }
      } catch {
        if (!cancelled) {
          setResults(null);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, activeCategory, open]);

  const handleOpenHit = React.useCallback((hit: GlobalSearchHit) => {
    try {
      window.open(hit.url, "_blank", "noopener,noreferrer");
    } catch {
      // best-effort only
    }
  }, []);

  const handleAttachHit = React.useCallback(
    (hit: GlobalSearchHit) => {
      if (!canAttach || !hypothesisId || !onAttachQuote) return;

      onAttachQuote({
        hypothesisId,
        field: "general",
        docId: hit.docId,
        docTitle: hit.docTitle,
        category: hit.category,
        model: hit.model,
        title: hit.title,
        snippet: hit.snippet,
        anchor: hit.anchor,
        url: hit.url,
      });
    },
    [canAttach, hypothesisId, onAttachQuote],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className={cn("gap-3", className)}>
        <DialogHeader separated>
          <DialogTitle>Search Brenner Corpus</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Search transcript, quote bank, and the three distillations. Attach excerpts to your
            current hypothesis for provenance.
          </p>
        </DialogHeader>

        <DialogBody scrollable>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {isLoading ? <SpinnerIcon /> : <SearchIcon />}
                </div>
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What did Brenner say about…"
                  className="pl-10"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {SESSION_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={cn(
                      "px-3 py-2 rounded-lg border text-sm transition-colors",
                      activeCategory === category
                        ? "border-primary/30 bg-primary/10 text-foreground"
                        : "border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted",
                    )}
                  >
                    {category === "all"
                      ? "All"
                      : category === "quote-bank"
                        ? "Quote Bank"
                        : category === "distillation"
                          ? "Distillations"
                          : "Transcript"}
                  </button>
                ))}
              </div>
            </div>

            {results && results.hits.length === 0 && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                No results for “{results.query}”.
              </div>
            )}

            {results && results.hits.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  {results.totalMatches} match{results.totalMatches === 1 ? "" : "es"} ·{" "}
                  {results.searchTimeMs}ms
                </div>
                <div className="space-y-2">
                  {results.hits.map((hit) => (
                    <div key={hit.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="truncate font-medium text-foreground">{hit.title}</div>
                            {hit.anchor && (
                              <span className="flex-shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">
                                {hit.anchor}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">{hit.docTitle}</div>
                        </div>

                        <div className="flex flex-shrink-0 items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenHit(hit)}
                            className="gap-1.5"
                          >
                            <ExternalLinkIcon />
                            View
                          </Button>
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={() => handleAttachHit(hit)}
                            disabled={!canAttach}
                            className="gap-1.5"
                            title={
                              canAttach
                                ? "Attach excerpt to current hypothesis"
                                : "Start/select a hypothesis to enable attachments"
                            }
                          >
                            <PlusIcon />
                            Attach
                          </Button>
                        </div>
                      </div>

                      <div className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        {hit.snippet}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter separated>
          <div className="flex w-full items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              Attachments are stored in the session and included in exports.
            </div>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
