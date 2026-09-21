"use client";

/**
 * OperatorShell - Common UI shell for all operator sessions
 *
 * Wraps operator-specific content with consistent navigation, progress
 * tracking, and Brenner quote integration. Provides keyboard navigation
 * and responsive layout for desktop/mobile.
 *
 * @see brenner_bot-vw6p.6 (bead)
 * @module components/brenner-loop/operators/OperatorShell
 */

import { AnimatePresence, motion } from "framer-motion";
import { HelpCircle, X } from "lucide-react";
import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type {
  OperatorStepState,
  OperatorType,
  StepValidation,
} from "@/lib/brenner-loop/operators/framework";
import { OPERATOR_METADATA } from "@/lib/brenner-loop/operators/framework";
import type { Quote } from "@/lib/quotebank-parser";
import { cn } from "@/lib/utils";
import { BrennerQuoteSidebar } from "./BrennerQuoteSidebar";
import { OperatorHelp } from "./OperatorHelp";
import { OperatorNavigation } from "./OperatorNavigation";
import { OperatorProgress } from "./OperatorProgress";

// ============================================================================
// Types
// ============================================================================

export interface OperatorShellProps {
  /** The operator type being applied */
  operatorType: OperatorType;
  /** Current step index (0-based) */
  currentStepIndex: number;
  /** All steps in the session */
  steps: OperatorStepState[];
  /** Navigation handlers */
  onPrev: () => void;
  onNext: () => boolean;
  onSkip?: () => boolean;
  onStepClick?: (stepIndex: number) => void;
  /** Navigation state */
  canPrev: boolean;
  canNext: boolean;
  canSkip: boolean;
  validation?: StepValidation;
  /** Brenner quotes for context */
  brennerQuotes: Quote[];
  /** Session lifecycle */
  onAbandon?: () => void;
  onComplete?: () => void;
  /** Loading state */
  loading?: boolean;
  /** The operator step content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Keyboard Navigation Hook
// ============================================================================

function useKeyboardNavigation({
  canPrev,
  canNext,
  canSkip,
  onPrev,
  onNext,
  onSkip,
  onAbandon,
  steps,
  onStepClick,
}: {
  canPrev: boolean;
  canNext: boolean;
  canSkip: boolean;
  onPrev: () => void;
  onNext: () => boolean;
  onSkip?: () => boolean;
  onAbandon?: () => void;
  steps: OperatorStepState[];
  onStepClick?: (stepIndex: number) => void;
}) {
  React.useEffect(() => {
    const firstIncompleteIndex = steps.findIndex((step) => !step.complete && !step.skipped);
    const lastReachableIndex =
      firstIncompleteIndex === -1 ? steps.length - 1 : firstIncompleteIndex;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          if (canPrev) {
            e.preventDefault();
            onPrev();
          }
          break;
        case "ArrowRight":
          if (canNext) {
            e.preventDefault();
            onNext();
          }
          break;
        case "s":
        case "S":
          if (canSkip && onSkip) {
            e.preventDefault();
            onSkip();
          }
          break;
        case "Escape":
          if (onAbandon) {
            e.preventDefault();
            // Could show confirmation dialog here
            onAbandon();
          }
          break;
        default: {
          // Number keys 1-9 for step navigation
          const num = parseInt(e.key, 10);
          if (num >= 1 && num <= 9 && num <= steps.length && onStepClick) {
            const targetIndex = num - 1;
            const targetStep = steps[targetIndex];
            // Can only navigate to completed, skipped, or current/previous steps
            if (targetStep?.complete || targetStep?.skipped || targetIndex <= lastReachableIndex) {
              e.preventDefault();
              onStepClick(targetIndex);
            }
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canPrev, canNext, canSkip, onPrev, onNext, onSkip, onAbandon, steps, onStepClick]);
}

// ============================================================================
// Header Component
// ============================================================================

interface OperatorHeaderProps {
  operatorType: OperatorType;
  currentStepIndex: number;
  totalSteps: number;
  currentStepId?: string;
  onAbandon?: () => void;
}

function OperatorHeader({
  operatorType,
  currentStepIndex,
  totalSteps,
  currentStepId,
  onAbandon,
}: OperatorHeaderProps) {
  const metadata = OPERATOR_METADATA[operatorType];

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {/* Operator symbol */}
        <div
          className={cn(
            "flex items-center justify-center size-10 rounded-xl text-lg font-semibold",
            operatorType === "level_split" && "bg-blue-500/10 text-blue-500",
            operatorType === "exclusion_test" && "bg-green-500/10 text-green-500",
            operatorType === "object_transpose" && "bg-purple-500/10 text-purple-500",
            operatorType === "scale_check" && "bg-orange-500/10 text-orange-500",
          )}
        >
          {metadata.symbol}
        </div>

        <div>
          <h1 className="text-lg font-semibold">{metadata.name}</h1>
          <p className="text-xs text-muted-foreground">
            Step {currentStepIndex + 1} of {totalSteps}
          </p>
        </div>
      </div>

      {/* Help and close buttons */}
      <div className="flex items-center gap-1">
        <OperatorHelp operatorType={operatorType} currentStepId={currentStepId} variant="icon" />
        {onAbandon && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onAbandon}
            aria-label="Close session"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </Button>
        )}
      </div>
    </header>
  );
}

// ============================================================================
// Help Panel Component
// ============================================================================

interface HelpPanelProps {
  helpText?: string;
  className?: string;
}

function HelpPanel({ helpText, className }: HelpPanelProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  if (!helpText) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger
        showChevron={false}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <HelpCircle className="size-4" />
        <span>{isOpen ? "Hide help" : "Show help"}</span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 p-4 rounded-lg bg-muted/50 border border-border"
        >
          <div className="text-sm text-muted-foreground prose prose-sm dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{helpText}</ReactMarkdown>
          </div>
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// Main Shell Component
// ============================================================================

export function OperatorShell({
  operatorType,
  currentStepIndex,
  steps,
  onPrev,
  onNext,
  onSkip,
  onStepClick,
  canPrev,
  canNext,
  canSkip,
  validation,
  brennerQuotes,
  onAbandon,
  onComplete,
  loading = false,
  children,
  className,
}: OperatorShellProps) {
  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  // Setup keyboard navigation
  useKeyboardNavigation({
    canPrev,
    canNext,
    canSkip,
    onPrev,
    onNext,
    onSkip,
    onAbandon,
    steps,
    onStepClick,
  });

  return (
    <div className={cn("flex flex-col h-full min-h-screen bg-background", className)}>
      {/* Header */}
      <OperatorHeader
        operatorType={operatorType}
        currentStepIndex={currentStepIndex}
        totalSteps={steps.length}
        currentStepId={currentStep?.config.id}
        onAbandon={onAbandon}
      />

      {/* Mobile progress (shows on small screens) */}
      <div className="lg:hidden">
        <OperatorProgress
          steps={steps}
          currentStepIndex={currentStepIndex}
          onStepClick={onStepClick}
          variant="horizontal"
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop sidebar with progress (hidden on mobile) */}
        <aside className="hidden lg:flex flex-col w-64 xl:w-72 border-r border-border bg-card/30 p-4 overflow-y-auto">
          <OperatorProgress
            steps={steps}
            currentStepIndex={currentStepIndex}
            onStepClick={onStepClick}
            variant="vertical"
          />
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            {/* Step content */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
              <div className="max-w-3xl mx-auto">
                {/* Step header */}
                {currentStep && (
                  <motion.div
                    key={currentStep.config.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mb-6"
                  >
                    <h2 className="text-xl font-semibold mb-2">{currentStep.config.name}</h2>
                    <p className="text-muted-foreground">{currentStep.config.description}</p>

                    {/* Help panel */}
                    <HelpPanel helpText={currentStep.config.helpText} className="mt-4" />
                  </motion.div>
                )}

                {/* Operator step content (children) */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStepIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Desktop quote sidebar (hidden on mobile) */}
            <aside className="hidden xl:block w-80 border-l border-border bg-card/30 p-4 overflow-y-auto">
              <BrennerQuoteSidebar quotes={brennerQuotes} currentStepId={currentStep?.config.id} />
            </aside>
          </div>

          {/* Mobile quote accordion (shown on smaller screens) */}
          <div className="xl:hidden px-4 pb-2">
            <BrennerQuoteSidebar
              quotes={brennerQuotes}
              currentStepId={currentStep?.config.id}
              defaultCollapsed
            />
          </div>

          {/* Navigation footer */}
          <footer className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
            <div className="max-w-3xl mx-auto">
              <OperatorNavigation
                canPrev={canPrev}
                canNext={canNext}
                canSkip={canSkip}
                validation={validation}
                onPrev={onPrev}
                onNext={onNext}
                onSkip={onSkip ?? (() => {})}
                isLastStep={isLastStep}
                showComplete={isLastStep}
                onComplete={onComplete}
                loading={loading}
              />
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default OperatorShell;
