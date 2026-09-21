"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { getJargon, type JargonTerm } from "@/lib/jargon";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface JargonProps {
  /** Term key to look up in dictionary */
  term: string;
  /** Override display text (defaults to term.term) */
  children?: React.ReactNode;
  /** Additional styling */
  className?: string;
}

// ============================================================================
// Icons
// ============================================================================

const CloseIcon = () => (
  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

// ============================================================================
// Desktop Tooltip Component
// ============================================================================

interface TooltipProps {
  term: JargonTerm;
  triggerRect: DOMRect | null;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function JargonTooltip({ term, triggerRect, onClose, onMouseEnter, onMouseLeave }: TooltipProps) {
  const [position, setPosition] = React.useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [isBelow, setIsBelow] = React.useState(false);
  const tooltipRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!triggerRect || !tooltipRef.current) return;

    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const padding = 12;

    // Determine if tooltip should be above or below
    const spaceAbove = triggerRect.top;
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const showBelow = spaceAbove < tooltipRect.height + padding && spaceBelow > spaceAbove;
    setIsBelow(showBelow);

    // Calculate vertical position
    const top = showBelow ? triggerRect.bottom + 8 : triggerRect.top - tooltipRect.height - 8;

    // Calculate horizontal position (centered, but clamped to viewport)
    let left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
    left = Math.max(padding, Math.min(left, viewportWidth - tooltipRect.width - padding));

    setPosition({ top, left });
  }, [triggerRect]);

  if (!triggerRect) return null;

  return createPortal(
    <div
      ref={tooltipRef}
      role="tooltip"
      className={cn(
        "fixed z-50 max-w-xs",
        "rounded-xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl",
        "p-4",
        "animate-fade-in-scale",
        isBelow ? "origin-top" : "origin-bottom",
      )}
      style={{ top: position.top, left: position.left }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Arrow */}
      <div
        className={cn(
          "absolute size-3 bg-card/95 border border-border/50 rotate-45",
          isBelow
            ? "-top-1.5 left-1/2 -translate-x-1/2 border-b-0 border-r-0"
            : "-bottom-1.5 left-1/2 -translate-x-1/2 border-t-0 border-l-0",
        )}
      />

      {/* Term name */}
      <div className="font-semibold text-foreground mb-1">{term.term}</div>

      {/* Short definition */}
      <p className="text-sm text-muted-foreground leading-relaxed">{term.short}</p>

      {/* Analogy (if present) */}
      {term.analogy && <p className="text-sm text-primary/80 mt-2 italic">{term.analogy}</p>}

      {/* View in glossary link */}
      <div className="mt-3 pt-2 border-t border-border/50">
        <a
          href={`/glossary#${term.term.toLowerCase().replace(/\s+/g, "-")}`}
          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 active:scale-95 transition-all touch-manipulation rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onClose}
        >
          View in glossary
          <ArrowRightIcon />
        </a>
      </div>
    </div>,
    document.body,
  );
}

// ============================================================================
// Mobile Bottom Sheet Component
// ============================================================================

interface BottomSheetProps {
  term: JargonTerm;
  open: boolean;
  onClose: () => void;
}

function JargonBottomSheet({ term, open, onClose }: BottomSheetProps) {
  const [exiting, setExiting] = React.useState(false);
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const startY = React.useRef<number>(0);
  const currentY = React.useRef<number>(0);

  const handleClose = React.useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setExiting(false);
      onClose();
    }, 200);
  }, [onClose]);

  // Handle escape key and body scroll lock
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        handleClose();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleClose]);

  // Touch handlers for swipe-to-dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0]?.clientY ?? 0;
    currentY.current = startY.current;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    currentY.current = e.touches[0]?.clientY ?? 0;
    const deltaY = currentY.current - startY.current;

    if (deltaY > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  };

  const handleTouchEnd = () => {
    const deltaY = currentY.current - startY.current;

    if (sheetRef.current) {
      sheetRef.current.style.transform = "";

      if (deltaY > 100) {
        handleClose();
      }
    }
  };

  if (!open) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
          "animate-fade-in",
          exiting && "animate-fade-out",
        )}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="jargon-sheet-title"
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "max-h-[85vh] overflow-y-auto overscroll-contain",
          "bg-card rounded-t-3xl shadow-2xl",
          "animate-sheet-up",
          exiting && "animate-sheet-down",
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="sticky top-0 bg-card pt-3 pb-1">
          <div className="mx-auto w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Gradient accent line */}
        <div className="h-1 bg-gradient-to-r from-primary/50 via-accent/50 to-primary/50" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <h2 id="jargon-sheet-title" className="text-xl font-semibold text-foreground">
            {term.term}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="size-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 touch-manipulation active:scale-[0.92]"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5 pb-safe">
          {/* Short definition */}
          <div>
            <p className="text-base text-muted-foreground leading-relaxed">{term.short}</p>
          </div>

          {/* Long explanation */}
          <div>
            <h3 className="text-sm font-medium text-foreground/60 uppercase tracking-wide mb-2">
              Full Explanation
            </h3>
            <p className="text-foreground leading-relaxed">{term.long}</p>
          </div>

          {/* Analogy */}
          {term.analogy && (
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
              <h3 className="text-sm font-medium text-primary mb-2">Think of it like...</h3>
              <p className="text-foreground/90 leading-relaxed">{term.analogy}</p>
            </div>
          )}

          {/* Why this matters */}
          {term.why && (
            <div>
              <h3 className="text-sm font-medium text-foreground/60 uppercase tracking-wide mb-2">
                Why It Matters
              </h3>
              <p className="text-foreground leading-relaxed">{term.why}</p>
            </div>
          )}

          {/* Related terms */}
          {term.related && term.related.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground/60 uppercase tracking-wide mb-3">
                Related Terms
              </h3>
              <div className="flex flex-wrap gap-2">
                {term.related.map((relatedKey) => {
                  const relatedTerm = getJargon(relatedKey);
                  return (
                    <a
                      key={relatedKey}
                      href={`/glossary#${relatedKey}`}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm bg-muted hover:bg-muted/80 text-foreground transition-all duration-150 touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={handleClose}
                    >
                      {relatedTerm?.term ?? relatedKey}
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category badge */}
          <div className="pt-3 border-t border-border/50">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-accent/10 text-accent-foreground capitalize">
              {term.category}
            </span>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

// ============================================================================
// Main Jargon Component
// ============================================================================

/**
 * Inline jargon component with hover tooltip (desktop) and tap bottom sheet (mobile).
 *
 * @example
 * ```tsx
 * <Jargon term="c-elegans">C. elegans</Jargon>
 * <Jargon term="level-split" />
 * ```
 */
export function Jargon({ term: termKey, children, className }: JargonProps) {
  const term = getJargon(termKey);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  // State
  const [isTooltipVisible, setIsTooltipVisible] = React.useState(false);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [triggerRect, setTriggerRect] = React.useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = React.useState(false);

  // Timeout refs for hover delay
  const showTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Hover delay before showing tooltip (UX best practice: 300-500ms)
  const HOVER_DELAY_MS = 400;

  // Detect mobile
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia("(max-width: 768px)").matches);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Clean up timeouts
  React.useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  // If term not found, render children without jargon styling
  if (!term) {
    return <span className={className}>{children ?? termKey}</span>;
  }

  const handleMouseEnter = () => {
    if (isMobile) return;

    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);

    showTimeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        setTriggerRect(triggerRef.current.getBoundingClientRect());
        setIsTooltipVisible(true);
      }
    }, HOVER_DELAY_MS);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;

    // Cancel any pending show
    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);

    hideTimeoutRef.current = setTimeout(() => {
      setIsTooltipVisible(false);
    }, 150);
  };

  const handleTooltipMouseEnter = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
  };

  const handleTooltipMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsTooltipVisible(false);
    }, 150);
  };

  const handleClick = () => {
    if (isMobile) {
      setIsSheetOpen(true);
    }
  };

  const handleFocus = () => {
    if (!isMobile && triggerRef.current) {
      setTriggerRect(triggerRef.current.getBoundingClientRect());
      setIsTooltipVisible(true);
    }
  };

  const handleBlur = () => {
    if (!isMobile) {
      setIsTooltipVisible(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (isMobile) {
        setIsSheetOpen(true);
      }
    }
    if (e.key === "Escape") {
      setIsTooltipVisible(false);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "inline cursor-help",
          "decoration-primary/30 decoration-dotted underline underline-offset-[3px]",
          "hover:decoration-primary/60 hover:text-primary/90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "transition-colors",
          className,
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        aria-describedby={isTooltipVisible ? `jargon-tooltip-${termKey}` : undefined}
      >
        {children ?? term.term}
      </button>

      {/* Desktop tooltip */}
      {isTooltipVisible && !isMobile && (
        <JargonTooltip
          term={term}
          triggerRect={triggerRect}
          onClose={() => setIsTooltipVisible(false)}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        />
      )}

      {/* Mobile bottom sheet */}
      <JargonBottomSheet term={term} open={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
    </>
  );
}

export default Jargon;
