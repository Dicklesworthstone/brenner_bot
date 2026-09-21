"use client";

/**
 * TutorialStep - Container for step content
 *
 * Adapted from ACFS wizard step patterns.
 *
 * Provides:
 * - Step header with number, title, and time estimate (with float animation)
 * - Learning objectives and action checklist
 * - Main content area
 * - Collapsible "More details" and "Troubleshooting" sections
 * - Back/Next navigation footer with directional hover animations
 * - Stagger reveal animations for premium feel
 */

import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Target,
  Wrench,
  Zap,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { TroubleshootingItem, TutorialStep as TutorialStepType } from "@/lib/tutorial-types";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface TutorialStepProps {
  /** Step data */
  step: TutorialStepType;
  /** Total number of steps in this path */
  totalSteps: number;
  /** Navigation callbacks */
  onBack?: () => void;
  onNext?: () => void;
  /** Whether back navigation is disabled */
  disableBack?: boolean;
  /** Whether next navigation is disabled */
  disableNext?: boolean;
  /** Main content of the step */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

function LearningObjectives({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <Collapsible
      defaultOpen
      className="group/learn rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden"
    >
      <CollapsibleTrigger className="w-full px-4 py-3 flex items-center gap-3 text-left transition-colors hover:bg-primary/5">
        <motion.div
          className="relative flex items-center justify-center size-9 rounded-xl bg-gradient-to-br from-primary/30 to-primary/20 text-primary shadow-sm"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Subtle glow */}
          <div className="absolute inset-0 rounded-xl bg-primary/20 blur-sm" />
          <Target className="size-5 relative z-10" />
        </motion.div>
        <div className="flex-1">
          <span className="text-sm font-semibold text-primary">What you&apos;ll learn</span>
          <span className="ml-2 text-xs text-primary/60">({items.length} objectives)</span>
        </div>
        <div className="text-primary/50">
          <ChevronRight className="size-4 transition-transform group-data-[state=open]/learn:rotate-90" />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <motion.ul
          className="px-4 pb-4 space-y-2.5"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.05 } },
          }}
        >
          {items.map((item, i) => (
            <motion.li
              key={i}
              className="flex items-start gap-3 text-sm text-muted-foreground"
              variants={{
                hidden: { opacity: 0, x: -10 },
                visible: { opacity: 1, x: 0 },
              }}
            >
              <span className="flex items-center justify-center size-5 rounded-full bg-primary/10 shrink-0 mt-0.5">
                <BookOpen className="size-3 text-primary/70" />
              </span>
              <span>{item}</span>
            </motion.li>
          ))}
        </motion.ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ActionChecklist({ items }: { items: string[] }) {
  const [checkedItems, setCheckedItems] = React.useState<Set<number>>(new Set());

  if (items.length === 0) return null;

  const toggleItem = (index: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const completedCount = checkedItems.size;
  const progress = (completedCount / items.length) * 100;

  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-card to-muted/20 p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <motion.div
            className="flex items-center justify-center size-7 rounded-lg bg-[oklch(0.72_0.19_145/0.15)] text-[oklch(0.72_0.19_145)]"
            animate={completedCount === items.length ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Zap className="size-4" />
          </motion.div>
          <span>What you&apos;ll do</span>
        </div>
        {completedCount > 0 && (
          <motion.span
            className="text-xs font-mono text-[oklch(0.72_0.19_145)]"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {completedCount}/{items.length}
          </motion.span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-[oklch(0.72_0.19_145)] to-[oklch(0.65_0.19_145)]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </div>

      <ul className="space-y-2">
        {items.map((item, i) => {
          const isChecked = checkedItems.has(i);
          return (
            <motion.li
              key={i}
              className={cn(
                "flex items-center gap-3 text-sm rounded-lg p-2 -mx-2 transition-colors cursor-pointer",
                isChecked ? "text-muted-foreground/60" : "text-muted-foreground hover:bg-muted/50",
              )}
              onClick={() => toggleItem(i)}
              whileTap={{ scale: 0.98 }}
            >
              <motion.span
                className={cn(
                  "flex items-center justify-center size-5 rounded-md border-2 shrink-0 transition-colors",
                  isChecked
                    ? "bg-[oklch(0.72_0.19_145)] border-[oklch(0.72_0.19_145)]"
                    : "border-muted-foreground/30 hover:border-[oklch(0.72_0.19_145/0.5)]",
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <AnimatePresence mode="wait">
                  {isChecked && (
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    >
                      <Check className="size-3 text-[oklch(0.15_0.02_145)]" strokeWidth={3} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.span>
              <span className={cn(isChecked && "line-through")}>{item}</span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

function TroubleshootingSection({ items }: { items: TroubleshootingItem[] }) {
  if (items.length === 0) return null;

  return (
    <Collapsible className="group/trouble rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-amber-500/10 overflow-hidden">
      <CollapsibleTrigger className="w-full px-4 py-3 flex items-center gap-3 text-left transition-colors hover:bg-amber-500/5">
        <motion.div
          className="relative flex items-center justify-center size-9 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-500/20 text-amber-600 dark:text-amber-400 shadow-sm"
          whileHover={{ scale: 1.05, rotate: 10 }}
          whileTap={{ scale: 0.95 }}
        >
          <Wrench className="size-5" />
        </motion.div>
        <div className="flex-1">
          <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
            Troubleshooting
          </span>
          <span className="text-xs text-muted-foreground ml-2">({items.length} common issues)</span>
        </div>
        <motion.div className="text-amber-500/50">
          <ChevronRight className="size-4 transition-transform group-data-[state=open]/trouble:rotate-90" />
        </motion.div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 space-y-4">
          {items.map((item, i) => (
            <motion.div
              key={i}
              className="p-3 rounded-lg bg-card/50 border border-amber-500/10 space-y-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="flex items-center justify-center size-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-mono">
                  {i + 1}
                </span>
                {item.problem}
              </p>
              {item.symptoms && item.symptoms.length > 0 && (
                <ul className="text-xs text-muted-foreground space-y-1.5 ml-7">
                  {item.symptoms.map((symptom, j) => (
                    <li key={j} className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-amber-500/60" />
                      {symptom}
                    </li>
                  ))}
                </ul>
              )}
              <div className="ml-7 pt-2 border-t border-amber-500/10">
                <p className="text-sm text-muted-foreground flex items-start gap-2">
                  <ArrowRight className="size-4 text-[oklch(0.72_0.19_145)] shrink-0 mt-0.5" />
                  <span>{item.solution}</span>
                </p>
              </div>
              {item.commands && item.commands.length > 0 && (
                <div className="ml-7 space-y-1.5">
                  {item.commands.map((cmd, j) => (
                    <code
                      key={j}
                      className="block px-3 py-2 rounded-lg bg-[oklch(0.12_0.015_260)] border border-border/50 text-xs font-mono text-foreground"
                    >
                      <span className="text-[oklch(0.72_0.19_145)]">$</span> {cmd}
                    </code>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// Animation Variants
// ============================================================================

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
  exit: { opacity: 0, y: -20 },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
};

// ============================================================================
// Main Component
// ============================================================================

export function TutorialStep({
  step,
  totalSteps,
  onBack,
  onNext,
  disableBack = false,
  disableNext = false,
  children,
  className,
}: TutorialStepProps) {
  const [isHoveringBack, setIsHoveringBack] = React.useState(false);
  const [isHoveringNext, setIsHoveringNext] = React.useState(false);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn("space-y-6", className)}
    >
      {/* Header with floating icon and premium styling */}
      <motion.div variants={itemVariants} className="space-y-3">
        <div className="flex items-start gap-4 sm:gap-5">
          <motion.div
            className="relative flex items-center justify-center size-14 sm:size-16 rounded-2xl bg-gradient-to-br from-primary/30 via-primary/20 to-accent/30 shadow-xl shadow-primary/20"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Outer glow ring */}
            <motion.div
              className="absolute inset-0 rounded-2xl"
              animate={{
                boxShadow: [
                  "0 0 0 0 oklch(0.58 0.19 195 / 0.3)",
                  "0 0 0 8px oklch(0.58 0.19 195 / 0)",
                  "0 0 0 0 oklch(0.58 0.19 195 / 0.3)",
                ],
              }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
            {/* Inner gradient glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent" />
            {/* Orbiting sparkle */}
            <motion.div
              className="absolute -top-1 -right-1"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="size-4 text-primary" />
              </motion.div>
            </motion.div>
            <Sparkles className="size-6 sm:size-7 text-primary relative z-10" />
          </motion.div>
          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
              {step.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-sm text-muted-foreground">
              <motion.span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20"
                whileHover={{ scale: 1.02 }}
              >
                <span className="inline-flex items-center justify-center size-5 rounded-full bg-primary text-primary-foreground font-mono text-xs font-bold">
                  {step.stepNumber}
                </span>
                <span className="text-primary font-medium">of {totalSteps}</span>
              </motion.span>
              <span className="size-1 rounded-full bg-muted-foreground/30 hidden sm:block" />
              <motion.span
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50"
                whileHover={{ scale: 1.02 }}
              >
                <Clock className="size-3.5" />
                <span>{step.estimatedTime}</span>
              </motion.span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Learning objectives */}
      <motion.div variants={itemVariants}>
        <LearningObjectives items={step.whatYouLearn} />
      </motion.div>

      {/* Action checklist */}
      <motion.div variants={itemVariants}>
        <ActionChecklist items={step.whatYouDo} />
      </motion.div>

      {/* Main content */}
      <motion.div variants={itemVariants} className="prose prose-sm dark:prose-invert max-w-none">
        {children}
      </motion.div>

      {/* More details (if provided) */}
      {step.moreDetails && (
        <motion.div variants={itemVariants}>
          <Collapsible className="rounded-xl border border-border bg-muted/30 hover:border-border/80 transition-colors">
            <CollapsibleTrigger className="w-full px-4 py-3 flex items-center gap-3 text-left group">
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                More details
              </span>
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 text-sm text-muted-foreground">{step.moreDetails}</div>
            </CollapsibleContent>
          </Collapsible>
        </motion.div>
      )}

      {/* Troubleshooting */}
      {step.troubleshooting && step.troubleshooting.length > 0 && (
        <motion.div variants={itemVariants}>
          <TroubleshootingSection items={step.troubleshooting} />
        </motion.div>
      )}

      {/* Navigation with directional hover animations */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between pt-6 border-t border-border/50"
      >
        <motion.div
          onHoverStart={() => setIsHoveringBack(true)}
          onHoverEnd={() => setIsHoveringBack(false)}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            variant="ghost"
            onClick={onBack}
            disabled={disableBack || !onBack}
            className="text-muted-foreground hover:text-foreground group min-w-[100px] min-h-[44px] rounded-xl"
          >
            <motion.div
              animate={{ x: isHoveringBack ? -4 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <ChevronLeft className="size-5 mr-1" />
            </motion.div>
            <span>Back</span>
          </Button>
        </motion.div>

        <motion.div
          onHoverStart={() => setIsHoveringNext(true)}
          onHoverEnd={() => setIsHoveringNext(false)}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={onNext}
            disabled={disableNext || !onNext}
            className={cn(
              "relative min-w-[130px] min-h-[44px] group rounded-xl overflow-hidden",
              step.stepNumber === totalSteps
                ? "bg-gradient-to-r from-[oklch(0.72_0.19_145)] to-[oklch(0.65_0.19_145)] hover:from-[oklch(0.68_0.19_145)] hover:to-[oklch(0.60_0.19_145)] text-[oklch(0.15_0.02_145)] shadow-lg shadow-[oklch(0.72_0.19_145/0.3)]"
                : "shadow-md",
            )}
          >
            {/* Shimmer effect on final step */}
            {step.stepNumber === totalSteps && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
              />
            )}
            <span className="relative z-10 font-semibold">
              {step.stepNumber === totalSteps ? "Complete" : "Next"}
            </span>
            <motion.div
              className="relative z-10"
              animate={{ x: isHoveringNext ? 4 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {step.stepNumber === totalSteps ? (
                <Check className="size-5 ml-1" />
              ) : (
                <ChevronRight className="size-5 ml-1" />
              )}
            </motion.div>
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// Type is already exported with the interface definition above
