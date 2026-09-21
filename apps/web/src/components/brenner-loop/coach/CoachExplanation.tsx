/**
 * Coach Explanation Component
 *
 * Displays inline explanations for concepts in coach mode.
 * Adapts to user level and tracks which concepts have been seen.
 *
 * @see brenner_bot-reew.8 (bead)
 */

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Check, ChevronDown, ChevronUp, ExternalLink, Lightbulb, X } from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { type ConceptId, useCoach } from "@/lib/brenner-loop/coach-context";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface CoachExplanationProps {
  /** Concept being explained */
  conceptId: ConceptId;

  /** Title of the explanation */
  title: string;

  /** Short explanation (always visible when open) */
  brief: string;

  /** Full explanation (shown for beginners or on request) */
  full?: string;

  /** Key learning points */
  keyPoints?: string[];

  /** Related Brenner quote */
  brennerQuote?: {
    text: string;
    section: string;
  };

  /** Example for context */
  example?: string;

  /** Whether to start expanded */
  defaultExpanded?: boolean;

  /** Callback when user dismisses */
  onDismiss?: () => void;

  /** Callback when user requests more info */
  onShowMore?: () => void;

  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function CoachExplanation({
  conceptId,
  title,
  brief,
  full,
  keyPoints,
  brennerQuote,
  example,
  defaultExpanded = true,
  onDismiss,
  onShowMore,
  className,
}: CoachExplanationProps): React.ReactElement | null {
  const { isCoachActive, effectiveLevel, shouldShowExplanation, markConceptSeen, settings } =
    useCoach();

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showFull, setShowFull] = useState(effectiveLevel === "beginner");

  // Hooks must be called unconditionally before any early returns
  const handleGotIt = useCallback(() => {
    markConceptSeen(conceptId);
    onDismiss?.();
  }, [markConceptSeen, conceptId, onDismiss]);

  const handleShowMore = useCallback(() => {
    setShowFull(true);
    onShowMore?.();
  }, [onShowMore]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Don't render if coach is disabled or shouldn't show explanation
  if (!isCoachActive || !shouldShowExplanation(conceptId)) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
        "overflow-hidden",
        className,
      )}
    >
      {/* Header */}
      <button
        onClick={toggleExpanded}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3",
          "text-left hover:bg-amber-100 dark:hover:bg-amber-900/30",
          "transition-colors",
        )}
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <span className="font-medium text-amber-900 dark:text-amber-100">COACH: {title}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        )}
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Brief explanation */}
              <p className="text-sm text-amber-800 dark:text-amber-200">{brief}</p>

              {/* Full explanation (conditional) */}
              {showFull && full && (
                <div className="rounded-md bg-white/50 dark:bg-black/20 p-3 space-y-2">
                  <p className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-line">
                    {full}
                  </p>
                </div>
              )}

              {/* Key points */}
              {keyPoints && keyPoints.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Key Points
                  </h4>
                  <ul className="space-y-1">
                    {keyPoints.map((point, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200"
                      >
                        <span className="text-amber-600 dark:text-amber-400 mt-1">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Brenner quote */}
              {settings.showBrennerQuotes && brennerQuote && (
                <blockquote className="border-l-2 border-amber-400 pl-3 italic text-sm text-amber-700 dark:text-amber-300">
                  &ldquo;{brennerQuote.text}&rdquo;
                  <cite className="block text-xs not-italic mt-1 text-amber-600 dark:text-amber-400">
                    — {brennerQuote.section}
                  </cite>
                </blockquote>
              )}

              {/* Example */}
              {settings.showExamples && example && (
                <div className="rounded-md bg-amber-100/50 dark:bg-amber-900/30 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      Example
                    </span>
                  </div>
                  <p className="text-sm text-amber-800 dark:text-amber-200">{example}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGotIt}
                  className="border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/50"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Got it!
                </Button>

                {!showFull && full && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleShowMore}
                    className="text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Tell me more
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// Compact Variant
// ============================================================================

export interface CoachTipProps {
  /** Tip content */
  children: React.ReactNode;

  /** Whether this is a warning */
  variant?: "info" | "warning" | "success";

  /** Whether dismissible */
  dismissible?: boolean;

  /** Callback when dismissed */
  onDismiss?: () => void;

  /** Additional CSS classes */
  className?: string;
}

export function CoachTip({
  children,
  variant = "info",
  dismissible = true,
  onDismiss,
  className,
}: CoachTipProps): React.ReactElement | null {
  const { isCoachActive, settings } = useCoach();
  const [dismissed, setDismissed] = useState(false);

  // Hook must be called unconditionally before early return
  const handleDismiss = useCallback(() => {
    setDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  if (!isCoachActive || !settings.showProgressTips || dismissed) {
    return null;
  }

  const variantStyles = {
    info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100",
    warning:
      "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-100",
    success:
      "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/30 dark:text-green-100",
  };

  const iconColors = {
    info: "text-blue-600 dark:text-blue-400",
    warning: "text-orange-600 dark:text-orange-400",
    success: "text-green-600 dark:text-green-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2",
        variantStyles[variant],
        className,
      )}
    >
      <Lightbulb className={cn("h-4 w-4 mt-0.5 shrink-0", iconColors[variant])} />
      <div className="flex-1 text-sm">{children}</div>
      {dismissible && (
        <button onClick={handleDismiss} className="shrink-0 hover:opacity-70 transition-opacity">
          <X className="h-4 w-4" />
        </button>
      )}
    </motion.div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default CoachExplanation;
