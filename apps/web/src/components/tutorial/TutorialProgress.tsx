"use client";

/**
 * TutorialProgress - Step progress indicator
 *
 * Adapted from agentic_coding_flywheel_setup's battle-tested stepper component.
 *
 * Shows the user's progress through a tutorial path:
 * - Desktop: Vertical step list in sidebar with connection lines
 * - Mobile: Touch-friendly dots (44px targets) with swipe gesture navigation
 *
 * Features:
 * - Current step highlighted with pulse animation
 * - Completed steps show animated checkmarks
 * - Swipe gestures on mobile with rubber-band feedback
 * - Click-to-navigate with completion gating
 * - Keyboard navigation for accessibility
 * - Stagger animations on mount for visual delight
 * - Estimated time remaining
 */

import { useDrag } from "@use-gesture/react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import { Check, ChevronDown, ChevronUp, Circle, Clock, Sparkles } from "lucide-react";
import * as React from "react";
import type { TutorialStepMeta } from "@/lib/tutorial-types";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface TutorialProgressProps {
  /** All steps in the tutorial */
  steps: TutorialStepMeta[];
  /** Current step index (0-based) */
  currentStep: number;
  /** Set of completed step indices */
  completedSteps: number[];
  /** Callback when a step is clicked */
  onStepClick?: (stepIndex: number) => void;
  /** Whether to allow jumping ahead to uncompleted steps */
  allowJumpAhead?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Force a specific variant (otherwise responsive) */
  variant?: "sidebar" | "header";
}

// ============================================================================
// Helpers
// ============================================================================

function calculateTimeRemaining(steps: TutorialStepMeta[], completedSteps: number[]): string {
  const completedSet = new Set(completedSteps);
  let totalMinutes = 0;

  for (let i = 0; i < steps.length; i++) {
    if (!completedSet.has(i)) {
      // Parse "~5 min" or "5 min" or "5m"
      const match = steps[i].estimatedTime.match(/(\d+)/);
      if (match) {
        totalMinutes += parseInt(match[1], 10);
      }
    }
  }

  if (totalMinutes === 0) return "Complete!";
  if (totalMinutes < 60) return `~${totalMinutes} min left`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `~${hours}h ${mins}m left` : `~${hours}h left`;
}

// ============================================================================
// Animation Variants
// ============================================================================

const stepItemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.08,
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  }),
};

const connectionLineVariants: Variants = {
  hidden: { scaleY: 0, originY: 0 },
  visible: (i: number) => ({
    scaleY: 1,
    transition: {
      delay: i * 0.08 + 0.15,
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

// ============================================================================
// Sidebar Variant (Desktop)
// ============================================================================

function SidebarProgress({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  allowJumpAhead = false,
  className,
}: TutorialProgressProps) {
  const completedSet = new Set(completedSteps);
  const timeRemaining = calculateTimeRemaining(steps, completedSteps);
  const listRef = React.useRef<HTMLOListElement>(null);
  const containerRef = React.useRef<HTMLElement>(null);
  // Calculate once outside the map loop for efficiency
  const highestCompleted = completedSteps.length > 0 ? Math.max(...completedSteps) : -1;

  // Cursor-following spotlight effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const spotlightOpacity = useMotionValue(0);

  // Smooth spring animations for spotlight
  const smoothX = useSpring(mouseX, { stiffness: 300, damping: 30 });
  const smoothY = useSpring(mouseY, { stiffness: 300, damping: 30 });
  const smoothOpacity = useSpring(spotlightOpacity, { stiffness: 300, damping: 30 });

  // Transform to gradient position
  const spotlightBackground = useTransform(
    [smoothX, smoothY],
    ([x, y]) =>
      `radial-gradient(300px circle at ${x}px ${y}px, oklch(0.58 0.19 195 / 0.08), transparent 60%)`,
  );

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    },
    [mouseX, mouseY],
  );

  const handleMouseEnter = React.useCallback(() => {
    spotlightOpacity.set(1);
  }, [spotlightOpacity]);

  const handleMouseLeave = React.useCallback(() => {
    spotlightOpacity.set(0);
  }, [spotlightOpacity]);

  // Track recently completed steps for celebration animation
  const [celebratingStep, setCelebratingStep] = React.useState<number | null>(null);
  const prevCompletedRef = React.useRef(completedSteps);

  React.useEffect(() => {
    const newlyCompleted = completedSteps.filter((s) => !prevCompletedRef.current.includes(s));
    if (newlyCompleted.length > 0) {
      setCelebratingStep(newlyCompleted[newlyCompleted.length - 1]);
      const timer = setTimeout(() => setCelebratingStep(null), 1500);
      prevCompletedRef.current = completedSteps;
      return () => clearTimeout(timer);
    }
    prevCompletedRef.current = completedSteps;
  }, [completedSteps]);

  // Keyboard navigation
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const buttons = listRef.current?.querySelectorAll("button:not([disabled])");
      if (!buttons) return;

      const currentIndex = Array.from(buttons).findIndex((btn) => btn === e.currentTarget);
      const nextIndex =
        e.key === "ArrowDown"
          ? Math.min(currentIndex + 1, buttons.length - 1)
          : Math.max(currentIndex - 1, 0);

      (buttons[nextIndex] as HTMLButtonElement)?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      const buttons = listRef.current?.querySelectorAll("button:not([disabled])");
      (buttons?.[0] as HTMLButtonElement)?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      const buttons = listRef.current?.querySelectorAll("button:not([disabled])");
      if (buttons) (buttons[buttons.length - 1] as HTMLButtonElement)?.focus();
    }
  }, []);

  return (
    <motion.nav
      ref={containerRef}
      className={cn(
        "relative flex flex-col gap-2 rounded-2xl p-2",
        "bg-card/50 backdrop-blur-sm border border-border/50",
        "shadow-lg shadow-black/5",
        className,
      )}
      aria-label="Tutorial progress"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Cursor-following spotlight effect */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{
          background: spotlightBackground,
          opacity: smoothOpacity,
        }}
      />

      {/* Subtle ambient glow at top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      {/* Time remaining with icon animation */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 25 }}
        className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-2"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Clock className="size-4" />
        </motion.div>
        <span>{timeRemaining}</span>
      </motion.div>

      {/* Step list with connection lines (ACFS pattern) */}
      <ol ref={listRef} className="flex flex-col" role="list">
        {steps.map((step, index) => {
          const isCompleted = completedSet.has(index);
          const isCurrent = index === currentStep;
          const isLast = index === steps.length - 1;
          const canClick =
            onStepClick &&
            (isCompleted || isCurrent || index <= highestCompleted + 1 || allowJumpAhead);

          return (
            <motion.li
              key={step.id}
              custom={index}
              initial="hidden"
              animate="visible"
              variants={stepItemVariants}
              className={cn(!isLast && "pb-1")}
            >
              <button
                type="button"
                onClick={() => canClick && onStepClick?.(index)}
                onKeyDown={(e) => handleKeyDown(e)}
                disabled={!canClick}
                className={cn(
                  "group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isCurrent && "bg-primary/10 shadow-sm shadow-primary/5",
                  isCompleted && !isCurrent && "hover:bg-muted/50 hover:translate-x-1",
                  !isCompleted &&
                    !isCurrent &&
                    (canClick
                      ? "hover:bg-muted/30 hover:translate-x-1"
                      : "opacity-40 cursor-not-allowed"),
                  canClick && !isCurrent && "cursor-pointer",
                  canClick && "touch-manipulation active:scale-[0.98]",
                )}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={`Step ${step.stepNumber}: ${step.title}${isCompleted ? " (completed)" : ""}${isCurrent ? " (current)" : ""}`}
              >
                {/* Animated connection line to next step */}
                {!isLast && (
                  <motion.div
                    custom={index}
                    initial="hidden"
                    animate="visible"
                    variants={connectionLineVariants}
                    className={cn(
                      "absolute left-[22px] top-[42px] h-[calc(100%-16px)] w-px",
                      isCompleted
                        ? "bg-gradient-to-b from-[oklch(0.72_0.19_145)] to-[oklch(0.72_0.19_145/0.3)]"
                        : "bg-gradient-to-b from-border/50 to-transparent",
                    )}
                  />
                )}

                {/* Step indicator with enhanced animations */}
                <motion.div
                  className={cn(
                    "relative z-10 flex items-center justify-center size-8 rounded-full shrink-0 text-sm font-medium transition-all duration-300",
                    isCurrent && "bg-primary text-primary-foreground shadow-md shadow-primary/30",
                    isCompleted &&
                      !isCurrent &&
                      "bg-[oklch(0.72_0.19_145)] text-[oklch(0.15_0.02_145)] shadow-sm shadow-[oklch(0.72_0.19_145/0.3)]",
                    !isCompleted &&
                      !isCurrent &&
                      "bg-muted text-muted-foreground group-hover:bg-muted/80",
                  )}
                  whileHover={canClick && !isCurrent ? { scale: 1.1 } : undefined}
                  whileTap={canClick ? { scale: 0.95 } : undefined}
                >
                  {/* Glow ring for current step */}
                  {isCurrent && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      animate={{
                        boxShadow: [
                          "0 0 0 0 oklch(0.58 0.19 195 / 0.4)",
                          "0 0 0 8px oklch(0.58 0.19 195 / 0)",
                          "0 0 0 0 oklch(0.58 0.19 195 / 0.4)",
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}

                  {/* Celebration sparkles when step completes */}
                  <AnimatePresence>
                    {celebratingStep === index && (
                      <>
                        {[0, 1, 2, 3].map((i) => (
                          <motion.div
                            key={i}
                            className="absolute"
                            initial={{ opacity: 1, scale: 0 }}
                            animate={{
                              opacity: [1, 1, 0],
                              scale: [0, 1, 0.5],
                              x: [0, (i % 2 === 0 ? 1 : -1) * (15 + i * 5)],
                              y: [0, (i < 2 ? -1 : 1) * (15 + i * 3)],
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6, delay: i * 0.05 }}
                          >
                            <Sparkles className="size-3 text-[oklch(0.72_0.19_145)]" />
                          </motion.div>
                        ))}
                      </>
                    )}
                  </AnimatePresence>

                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                      <Check className="size-4" strokeWidth={2.5} />
                    </motion.div>
                  ) : isCurrent ? (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Circle className="size-3 fill-current" />
                    </motion.div>
                  ) : (
                    <span className="font-mono text-xs">{step.stepNumber}</span>
                  )}
                </motion.div>

                {/* Step info with text reveal */}
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "text-sm font-medium truncate transition-colors duration-200",
                      isCurrent && "text-foreground",
                      isCompleted &&
                        !isCurrent &&
                        "text-muted-foreground group-hover:text-foreground",
                      !isCompleted && !isCurrent && "text-muted-foreground",
                    )}
                  >
                    {step.title}
                  </div>
                  <AnimatePresence mode="wait">
                    {isCurrent && !isCompleted && (
                      <motion.div
                        key="in-progress"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-0.5 text-xs text-primary font-medium"
                      >
                        In progress
                      </motion.div>
                    )}
                    {isCompleted && (
                      <motion.div
                        key="complete"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-0.5 text-xs text-[oklch(0.72_0.19_145)]"
                      >
                        Complete
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Enhanced hover effect with gradient border */}
                {canClick && !isCurrent && (
                  <div className="absolute inset-0 rounded-xl border border-transparent transition-all duration-300 group-hover:border-primary/20 group-hover:shadow-sm group-hover:shadow-primary/5" />
                )}
              </button>
            </motion.li>
          );
        })}
      </ol>

      {/* Enhanced progress bar with gradient and shimmer */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: steps.length * 0.08 + 0.2 }}
        className="px-3 pt-4 pb-2"
      >
        <div className="relative h-2.5 bg-muted rounded-full overflow-hidden shadow-inner">
          <motion.div
            className="h-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] rounded-full"
            initial={{ width: 0 }}
            animate={{
              width: `${(completedSteps.length / steps.length) * 100}%`,
              backgroundPosition: ["0% 0%", "100% 0%", "0% 0%"],
            }}
            transition={{
              width: { type: "spring", stiffness: 100, damping: 20 },
              backgroundPosition: { duration: 4, repeat: Infinity, ease: "linear" },
            }}
          />
          {/* Shimmer overlay on progress */}
          {completedSteps.length > 0 && (
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
              style={{ width: `${(completedSteps.length / steps.length) * 100}%` }}
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
            />
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
          <span>
            {completedSteps.length} of {steps.length} complete
          </span>
          <motion.span
            className="font-mono font-semibold"
            key={completedSteps.length}
            initial={{ scale: 1.2, color: "oklch(0.72 0.19 145)" }}
            animate={{ scale: 1, color: "oklch(0.556 0 0)" }}
            transition={{ duration: 0.3 }}
          >
            {Math.round((completedSteps.length / steps.length) * 100)}%
          </motion.span>
        </div>
      </motion.div>
    </motion.nav>
  );
}

// ============================================================================
// Header Variant (Mobile) - 44px touch targets + swipe gestures
// ============================================================================

function HeaderProgress({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  allowJumpAhead = false,
  className,
}: TutorialProgressProps) {
  const completedSet = new Set(completedSteps);
  const highestCompleted = completedSteps.length > 0 ? Math.max(...completedSteps) : -1;
  const progress = ((currentStep + 1) / steps.length) * 100;
  const [swipeOffset, setSwipeOffset] = React.useState(0);
  const [showGestureHint, setShowGestureHint] = React.useState(true);

  // Hide gesture hint after first swipe
  React.useEffect(() => {
    if (currentStep > 0) {
      setShowGestureHint(false);
    }
  }, [currentStep]);

  // Swipe gesture handler with rubber-band feedback
  const bind = useDrag(
    ({ direction: [dx], velocity: [vx], active, movement: [mx] }) => {
      if (active) {
        // Rubber-band effect: reduce movement at edges
        const isAtStart = currentStep === 0 && mx > 0;
        const isAtEnd = currentStep === steps.length - 1 && mx < 0;
        const dampening = isAtStart || isAtEnd ? 0.2 : 1;
        setSwipeOffset(mx * dampening * 0.3);
      } else {
        // Snap back and potentially navigate
        setSwipeOffset(0);

        if (onStepClick && (Math.abs(vx) > 0.3 || Math.abs(mx) > 50)) {
          if (dx > 0 && currentStep > 0) {
            // Swipe right = go back
            const prevStep = currentStep - 1;
            if (completedSet.has(prevStep) || prevStep <= highestCompleted + 1 || allowJumpAhead) {
              onStepClick(prevStep);
            }
          } else if (dx < 0 && currentStep < steps.length - 1) {
            // Swipe left = go forward
            const nextStep = currentStep + 1;
            if (completedSet.has(nextStep) || nextStep <= highestCompleted + 1 || allowJumpAhead) {
              onStepClick(nextStep);
            }
          }
        }
      }
    },
    { axis: "x", filterTaps: true, threshold: 10 },
  );

  return (
    <div {...bind()} className="touch-pan-x select-none">
      <motion.nav
        className={cn(
          "relative flex flex-col gap-3 px-4 py-4 bg-card/95 backdrop-blur-md border-b border-border/50",
          "shadow-lg shadow-black/5",
          className,
        )}
        aria-label="Tutorial progress"
        animate={{ x: swipeOffset }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        {/* Premium gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-accent/5 pointer-events-none" />

        {/* Top highlight line */}
        <motion.div
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        />

        {/* Progress bar with shimmer effect */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted shadow-inner">
          <motion.div
            className="h-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] rounded-full"
            initial={false}
            animate={{
              width: `${progress}%`,
              backgroundPosition: ["0% 0%", "100% 0%"],
            }}
            transition={{
              width: { type: "spring", stiffness: 300, damping: 30 },
              backgroundPosition: { duration: 3, repeat: Infinity, ease: "linear" },
            }}
          />
          {/* Shimmer overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
          />
        </div>

        {/* Touch-friendly step dots with connecting line */}
        <div className="relative flex items-center justify-center">
          {/* Connecting line behind dots */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-0.5 bg-muted rounded-full"
            style={{ width: `${Math.max(0, (steps.length - 1) * 44 - 10)}px` }}
          />
          {/* Progress line overlay */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-primary to-accent rounded-full origin-left"
            style={{
              width: `${Math.max(0, (steps.length - 1) * 44 - 10)}px`,
              marginLeft: `-${Math.max(0, (steps.length - 1) * 44 - 10) / 2}px`,
            }}
            initial={false}
            animate={{ scaleX: currentStep / Math.max(1, steps.length - 1) }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />

          {steps.map((step, index) => {
            const isCompleted = completedSet.has(index);
            const isCurrent = index === currentStep;
            const canClick =
              onStepClick &&
              (isCompleted || isCurrent || index <= highestCompleted + 1 || allowJumpAhead);

            return (
              <motion.button
                key={step.id}
                type="button"
                onClick={canClick ? () => onStepClick?.(index) : undefined}
                disabled={!canClick}
                className={cn(
                  "relative z-10 flex items-center justify-center touch-manipulation",
                  canClick ? "cursor-pointer" : "cursor-not-allowed",
                )}
                style={{ minWidth: 44, minHeight: 44 }}
                aria-label={`Go to step ${index + 1}: ${step.title}`}
                aria-current={isCurrent ? "step" : undefined}
                whileTap={canClick ? { scale: 0.85 } : undefined}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: canClick ? 1 : 0.4, scale: 1 }}
                transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 25 }}
              >
                {/* The visible dot with shadow */}
                <motion.div
                  className={cn(
                    "rounded-full transition-colors shadow-sm",
                    isCompleted && "bg-[oklch(0.72_0.19_145)] shadow-[oklch(0.72_0.19_145/0.4)]",
                    isCurrent && !isCompleted && "bg-primary shadow-primary/40",
                    !isCompleted && !isCurrent && "bg-muted-foreground/30",
                  )}
                  initial={false}
                  animate={{
                    width: isCurrent ? 16 : isCompleted ? 12 : 10,
                    height: isCurrent ? 16 : isCompleted ? 12 : 10,
                    boxShadow: isCurrent ? "0 0 12px oklch(0.58 0.19 195 / 0.5)" : "none",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                />

                {/* Active step pulse ring */}
                {isCurrent && (
                  <motion.div
                    className="absolute rounded-full border-2 border-primary/50"
                    initial={{ width: 16, height: 16, opacity: 0.8 }}
                    animate={{
                      width: [16, 32, 16],
                      height: [16, 32, 16],
                      opacity: [0.8, 0, 0.8],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}

                {/* Tap ripple effect */}
                <motion.div
                  className="absolute rounded-full bg-primary/20"
                  initial={{ width: 0, height: 0, opacity: 0 }}
                  whileTap={{ width: 40, height: 40, opacity: [0, 0.3, 0] }}
                  transition={{ duration: 0.3 }}
                />

                {/* Completed checkmark overlay */}
                {isCompleted && (
                  <motion.div
                    className="absolute flex items-center justify-center"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  >
                    <Check className="size-2.5 text-[oklch(0.15_0.02_145)]" strokeWidth={3} />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Current step label with slide animation */}
        <div className="text-center relative z-10">
          <AnimatePresence mode="wait">
            <motion.span
              key={currentStep}
              className="block text-sm font-semibold text-foreground"
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {steps[currentStep]?.title}
            </motion.span>
          </AnimatePresence>
          <div className="flex items-center justify-center gap-2 mt-1.5 text-xs text-muted-foreground">
            <motion.span
              className="font-mono font-medium px-2 py-0.5 rounded-full bg-muted/50"
              key={currentStep}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
            >
              {currentStep + 1}/{steps.length}
            </motion.span>
            {/* Animated gesture hint that fades out after first use */}
            <AnimatePresence>
              {showGestureHint && (
                <motion.span
                  className="flex items-center gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="size-1 rounded-full bg-muted-foreground/30" />
                  <motion.span
                    className="flex items-center gap-0.5"
                    animate={{ x: [-2, 2, -2] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ChevronUp className="size-3 rotate-[-90deg]" />
                    <span>Swipe</span>
                    <ChevronDown className="size-3 rotate-[-90deg]" />
                  </motion.span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.nav>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TutorialProgress({ variant, ...props }: TutorialProgressProps) {
  // If variant is specified, use it; otherwise this is controlled by parent
  if (variant === "header") {
    return <HeaderProgress {...props} />;
  }

  if (variant === "sidebar") {
    return <SidebarProgress {...props} />;
  }

  // Default: render both with responsive visibility
  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <SidebarProgress {...props} />
      </div>
      {/* Mobile header */}
      <div className="lg:hidden">
        <HeaderProgress {...props} />
      </div>
    </>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { HeaderProgress, SidebarProgress };
