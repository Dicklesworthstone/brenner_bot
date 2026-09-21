"use client";

/**
 * OperatorNavigation - Previous/Skip/Next navigation for operator sessions
 *
 * Provides navigation controls with proper disabled states and
 * validation feedback for step-by-step operator progression.
 *
 * @see brenner_bot-vw6p.6 (bead)
 * @module components/brenner-loop/operators/OperatorNavigation
 */

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check, ChevronLeft, ChevronRight, SkipForward } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import type { StepValidation } from "@/lib/brenner-loop/operators/framework";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface OperatorNavigationProps {
  /** Whether previous button is enabled */
  canPrev: boolean;
  /** Whether next button is enabled */
  canNext: boolean;
  /** Whether skip button is enabled */
  canSkip: boolean;
  /** Validation result for current step */
  validation?: StepValidation;
  /** Callback for previous button */
  onPrev: () => void;
  /** Callback for next button */
  onNext: () => void;
  /** Callback for skip button */
  onSkip: () => void;
  /** Whether this is the last step */
  isLastStep?: boolean;
  /** Whether to show completion button instead of next */
  showComplete?: boolean;
  /** Callback for completion */
  onComplete?: () => void;
  /** Loading state */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Validation Feedback Component
// ============================================================================

interface ValidationFeedbackProps {
  validation?: StepValidation;
  className?: string;
}

function ValidationFeedback({ validation, className }: ValidationFeedbackProps) {
  if (!validation) return null;

  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;

  if (!hasErrors && !hasWarnings) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className={cn("flex flex-col gap-2", className)}
      >
        {/* Errors */}
        {hasErrors && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="size-4 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">Cannot proceed</p>
              <ul className="mt-1 space-y-1">
                {validation.errors.map((error, i) => (
                  <li key={i} className="text-xs text-destructive/80">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Warnings */}
        {hasWarnings && !hasErrors && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="size-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Proceed with caution
              </p>
              <ul className="mt-1 space-y-1">
                {validation.warnings.map((warning, i) => (
                  <li key={i} className="text-xs text-amber-600/80 dark:text-amber-400/80">
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// Main Navigation Component
// ============================================================================

export function OperatorNavigation({
  canPrev,
  canNext,
  canSkip,
  validation,
  onPrev,
  onNext,
  onSkip,
  isLastStep = false,
  showComplete = false,
  onComplete,
  loading = false,
  className,
}: OperatorNavigationProps) {
  // Determine if we should show completion UI
  const shouldShowComplete = isLastStep && showComplete && onComplete;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Validation feedback */}
      <ValidationFeedback validation={validation} />

      {/* Navigation buttons */}
      <div className="flex items-center justify-between gap-4">
        {/* Previous button */}
        <Button variant="outline" onClick={onPrev} disabled={!canPrev || loading} className="gap-2">
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>

        {/* Center: Skip button (when available) */}
        <AnimatePresence mode="wait">
          {canSkip && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Button
                variant="ghost"
                onClick={onSkip}
                disabled={loading}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <SkipForward className="size-4" />
                <span className="hidden sm:inline">Skip</span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next/Complete button */}
        {shouldShowComplete ? (
          <Button
            variant="glow"
            onClick={onComplete}
            disabled={!canNext || loading}
            loading={loading}
            className="gap-2"
          >
            <Check className="size-4" />
            <span>Complete</span>
          </Button>
        ) : (
          <Button
            variant="default"
            onClick={onNext}
            disabled={!canNext || loading}
            loading={loading}
            className="gap-2"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>

      {/* Keyboard hints (desktop only) */}
      <div className="hidden md:flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">←</kbd> Previous
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">→</kbd> Next
        </span>
        {canSkip && (
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">S</kbd> Skip
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Compact Navigation (for tight spaces)
// ============================================================================

export interface CompactNavigationProps {
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  currentStep: number;
  totalSteps: number;
  loading?: boolean;
  className?: string;
}

export function CompactNavigation({
  canPrev,
  canNext,
  onPrev,
  onNext,
  currentStep,
  totalSteps,
  loading = false,
  className,
}: CompactNavigationProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={onPrev}
        disabled={!canPrev || loading}
        aria-label="Previous step"
      >
        <ChevronLeft className="size-4" />
      </Button>

      <span className="text-sm text-muted-foreground font-mono min-w-[4ch] text-center">
        {currentStep + 1}/{totalSteps}
      </span>

      <Button
        variant="outline"
        size="icon-sm"
        onClick={onNext}
        disabled={!canNext || loading}
        aria-label="Next step"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

export default OperatorNavigation;
