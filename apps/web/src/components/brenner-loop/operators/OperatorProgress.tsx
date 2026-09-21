"use client";

/**
 * OperatorProgress - Visual step indicator for operator sessions
 *
 * Shows progress through operator steps with connected nodes.
 * Adapts between desktop (vertical) and mobile (horizontal) layouts.
 *
 * @see brenner_bot-vw6p.6 (bead)
 * @module components/brenner-loop/operators/OperatorProgress
 */

import { motion } from "framer-motion";
import { Check, Circle } from "lucide-react";
import * as React from "react";
import type { OperatorStepState } from "@/lib/brenner-loop/operators/framework";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface OperatorProgressProps {
  /** All steps in the operator session */
  steps: OperatorStepState[];
  /** Current step index (0-based) */
  currentStepIndex: number;
  /** Callback when a step is clicked */
  onStepClick?: (stepIndex: number) => void;
  /** Force a specific variant (otherwise responsive) */
  variant?: "vertical" | "horizontal";
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Vertical Progress (Desktop Sidebar)
// ============================================================================

function VerticalProgress({
  steps,
  currentStepIndex,
  onStepClick,
  className,
}: OperatorProgressProps) {
  return (
    <nav className={cn("flex flex-col gap-1", className)} aria-label="Operator progress">
      <ol className="flex flex-col" role="list">
        {steps.map((step, index) => {
          const isCurrent = index === currentStepIndex;
          const isCompleted = step.complete;
          const isSkipped = step.skipped;
          const isLast = index === steps.length - 1;
          const canClick = onStepClick && (isCompleted || isSkipped || index <= currentStepIndex);

          return (
            <motion.li
              key={step.config.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 25 }}
              className={cn(!isLast && "pb-2")}
            >
              <button
                type="button"
                onClick={() => canClick && onStepClick?.(index)}
                disabled={!canClick}
                className={cn(
                  "group relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  isCurrent && "bg-primary/10",
                  (isCompleted || isSkipped) && !isCurrent && "hover:bg-muted/50",
                  !isCompleted &&
                    !isSkipped &&
                    !isCurrent &&
                    (canClick ? "hover:bg-muted/30" : "opacity-50 cursor-not-allowed"),
                  canClick && "cursor-pointer touch-manipulation active:scale-[0.98]",
                )}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Step ${index + 1}: ${step.config.name}${isCompleted ? " (completed)" : ""}${isSkipped ? " (skipped)" : ""}${isCurrent ? " (current)" : ""}`}
              >
                {/* Connection line to next step */}
                {!isLast && (
                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: index * 0.05 + 0.1, duration: 0.3 }}
                    className={cn(
                      "absolute left-[22px] top-[40px] h-[calc(100%-12px)] w-px origin-top",
                      isCompleted || isSkipped
                        ? "bg-gradient-to-b from-[oklch(0.72_0.19_145)] to-[oklch(0.72_0.19_145/0.3)]"
                        : "bg-gradient-to-b from-border/50 to-transparent",
                    )}
                  />
                )}

                {/* Step indicator */}
                <motion.div
                  className={cn(
                    "relative z-10 flex items-center justify-center size-8 rounded-full shrink-0 text-sm font-medium transition-all duration-200",
                    isCurrent && "bg-primary text-primary-foreground shadow-md shadow-primary/30",
                    (isCompleted || isSkipped) &&
                      !isCurrent &&
                      "bg-[oklch(0.72_0.19_145)] text-[oklch(0.15_0.02_145)]",
                    !isCompleted && !isSkipped && !isCurrent && "bg-muted text-muted-foreground",
                  )}
                  whileHover={canClick && !isCurrent ? { scale: 1.1 } : undefined}
                  whileTap={canClick ? { scale: 0.95 } : undefined}
                >
                  {/* Pulse ring for current step */}
                  {isCurrent && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      animate={{
                        boxShadow: [
                          "0 0 0 0 oklch(0.58 0.19 195 / 0.4)",
                          "0 0 0 6px oklch(0.58 0.19 195 / 0)",
                          "0 0 0 0 oklch(0.58 0.19 195 / 0.4)",
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}

                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                      <Check className="size-4" strokeWidth={2.5} />
                    </motion.div>
                  ) : isSkipped ? (
                    <span className="text-xs">—</span>
                  ) : isCurrent ? (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Circle className="size-3 fill-current" />
                    </motion.div>
                  ) : (
                    <span className="font-mono text-xs">{index + 1}</span>
                  )}
                </motion.div>

                {/* Step info */}
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "text-sm font-medium truncate transition-colors duration-200",
                      isCurrent && "text-foreground",
                      (isCompleted || isSkipped) && !isCurrent && "text-muted-foreground",
                      !isCompleted && !isSkipped && !isCurrent && "text-muted-foreground",
                    )}
                  >
                    {step.config.name}
                  </div>
                  {isCurrent && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-0.5 text-xs text-primary font-medium"
                    >
                      In progress
                    </motion.div>
                  )}
                  {isSkipped && !isCurrent && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-0.5 text-xs text-muted-foreground"
                    >
                      Skipped
                    </motion.div>
                  )}
                </div>
              </button>
            </motion.li>
          );
        })}
      </ol>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: steps.length * 0.05 + 0.2 }}
        className="px-3 pt-4 pb-2"
      >
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
            initial={{ width: 0 }}
            animate={{
              width: `${(steps.filter((s) => s.complete || s.skipped).length / steps.length) * 100}%`,
            }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
          <span>
            {steps.filter((s) => s.complete || s.skipped).length} of {steps.length} complete
          </span>
          <span className="font-mono font-semibold">
            {Math.round((steps.filter((s) => s.complete || s.skipped).length / steps.length) * 100)}
            %
          </span>
        </div>
      </motion.div>
    </nav>
  );
}

// ============================================================================
// Horizontal Progress (Mobile Header)
// ============================================================================

function HorizontalProgress({
  steps,
  currentStepIndex,
  onStepClick,
  className,
}: OperatorProgressProps) {
  return (
    <nav
      className={cn(
        "flex flex-col gap-3 px-4 py-3 bg-card/95 backdrop-blur-md border-b border-border/50",
        className,
      )}
      aria-label="Operator progress"
    >
      {/* Progress bar */}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
          initial={false}
          animate={{
            width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </div>

      {/* Step dots */}
      <div className="relative flex items-center justify-center gap-3">
        {steps.map((step, index) => {
          const isCurrent = index === currentStepIndex;
          const isCompleted = step.complete;
          const isSkipped = step.skipped;
          const canClick = onStepClick && (isCompleted || isSkipped || index <= currentStepIndex);

          return (
            <motion.button
              key={step.config.id}
              type="button"
              onClick={canClick ? () => onStepClick?.(index) : undefined}
              disabled={!canClick}
              className={cn(
                "relative flex items-center justify-center touch-manipulation",
                canClick ? "cursor-pointer" : "cursor-not-allowed",
              )}
              style={{ minWidth: 44, minHeight: 44 }}
              aria-label={`Go to step ${index + 1}: ${step.config.name}`}
              aria-current={isCurrent ? "step" : undefined}
              whileTap={canClick ? { scale: 0.85 } : undefined}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: canClick ? 1 : 0.4, scale: 1 }}
              transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 25 }}
            >
              <motion.div
                className={cn(
                  "rounded-full transition-colors",
                  (isCompleted || isSkipped) && "bg-[oklch(0.72_0.19_145)]",
                  isCurrent && !isCompleted && !isSkipped && "bg-primary",
                  !isCompleted && !isSkipped && !isCurrent && "bg-muted-foreground/30",
                )}
                initial={false}
                animate={{
                  width: isCurrent ? 14 : isCompleted || isSkipped ? 12 : 8,
                  height: isCurrent ? 14 : isCompleted || isSkipped ? 12 : 8,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              />

              {/* Active step pulse */}
              {isCurrent && (
                <motion.div
                  className="absolute rounded-full border-2 border-primary/50"
                  initial={{ width: 14, height: 14, opacity: 0.8 }}
                  animate={{
                    width: [14, 28, 14],
                    height: [14, 28, 14],
                    opacity: [0.8, 0, 0.8],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}

              {/* Completed checkmark */}
              {isCompleted && (
                <motion.div
                  className="absolute flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                >
                  <Check className="size-2 text-[oklch(0.15_0.02_145)]" strokeWidth={3} />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Current step label */}
      <div className="text-center">
        <motion.span
          key={currentStepIndex}
          className="block text-sm font-semibold text-foreground"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {steps[currentStepIndex]?.config.name}
        </motion.span>
        <span className="text-xs text-muted-foreground font-mono">
          {currentStepIndex + 1}/{steps.length}
        </span>
      </div>
    </nav>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function OperatorProgress({ variant, ...props }: OperatorProgressProps) {
  if (variant === "horizontal") {
    return <HorizontalProgress {...props} />;
  }

  if (variant === "vertical") {
    return <VerticalProgress {...props} />;
  }

  // Default: render both with responsive visibility
  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <VerticalProgress {...props} />
      </div>
      {/* Mobile header */}
      <div className="lg:hidden">
        <HorizontalProgress {...props} />
      </div>
    </>
  );
}

export default OperatorProgress;
