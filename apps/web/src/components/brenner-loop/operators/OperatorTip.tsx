"use client";

/**
 * OperatorTip - Inline contextual tips for operator forms
 *
 * Provides lightweight, inline tips that can be placed near form fields
 * to guide users through operator steps. More focused than OperatorHelp
 * which shows full documentation.
 *
 * @see brenner_bot-yh1c (bead)
 * @module components/brenner-loop/operators/OperatorTip
 */

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ChevronDown, ChevronUp, HelpCircle, Lightbulb } from "lucide-react";
import * as React from "react";
import { getStepTip, type OperatorStepTip } from "@/lib/brenner-loop/operators/docs";
import type { OperatorType } from "@/lib/brenner-loop/operators/framework";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface OperatorTipProps {
  /** The operator type */
  operatorType: OperatorType;
  /** The step ID to get tip for */
  stepId: string;
  /** Variant style */
  variant?: "inline" | "card" | "minimal";
  /** Whether to show the example */
  showExample?: boolean;
  /** Whether to show the anti-pattern */
  showAntiPattern?: boolean;
  /** Allow user to collapse/expand */
  collapsible?: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export interface CustomTipProps {
  /** Tip headline */
  headline: string;
  /** Tip content */
  content: string;
  /** Optional example */
  example?: string;
  /** Optional anti-pattern */
  antiPattern?: string;
  /** Variant style */
  variant?: "inline" | "card" | "minimal";
  /** Allow user to collapse/expand */
  collapsible?: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Inline Tip (appears next to form fields)
// ============================================================================

interface InlineTipProps {
  tip: OperatorStepTip;
  showExample?: boolean;
  showAntiPattern?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

function InlineTip({
  tip,
  showExample = false,
  showAntiPattern = false,
  collapsible = false,
  defaultCollapsed = true,
  className,
}: InlineTipProps) {
  const [expanded, setExpanded] = React.useState(!defaultCollapsed);
  const hasExpandableContent = (showExample && tip.example) || (showAntiPattern && tip.antiPattern);

  const content = (
    <>
      <div className="flex items-start gap-2">
        <Lightbulb className="size-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{tip.headline}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{tip.guidance}</p>
        </div>

        {collapsible && hasExpandableContent && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex-shrink-0 p-1 rounded hover:bg-muted transition-colors"
            aria-label={expanded ? "Collapse tip" : "Expand tip"}
          >
            {expanded ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && hasExpandableContent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2 ml-6">
              {showExample && tip.example && (
                <div className="p-2 rounded bg-muted/50 border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Example</p>
                  <p className="text-xs italic text-muted-foreground">{tip.example}</p>
                </div>
              )}

              {showAntiPattern && tip.antiPattern && (
                <div className="p-2 rounded bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50">
                  <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Avoid</p>
                  <p className="text-xs text-red-700 dark:text-red-300">{tip.antiPattern}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  return (
    <div
      className={cn(
        "p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50",
        className,
      )}
    >
      {content}
    </div>
  );
}

// ============================================================================
// Card Tip (more prominent, for step headers)
// ============================================================================

interface CardTipProps {
  tip: OperatorStepTip;
  showExample?: boolean;
  showAntiPattern?: boolean;
  className?: string;
}

function CardTip({ tip, showExample = true, showAntiPattern = true, className }: CardTipProps) {
  return (
    <div
      className={cn(
        "p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Lightbulb className="size-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm mb-1">{tip.headline}</h4>
          <p className="text-sm text-muted-foreground">{tip.guidance}</p>
        </div>
      </div>

      {(showExample && tip.example) || (showAntiPattern && tip.antiPattern) ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {showExample && tip.example && (
            <div className="p-3 rounded-lg bg-background/50 border border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Example
              </p>
              <p className="text-sm italic">{tip.example}</p>
            </div>
          )}

          {showAntiPattern && tip.antiPattern && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50">
              <div className="flex items-center gap-1 mb-1">
                <AlertTriangle className="size-3 text-red-500" />
                <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">
                  Avoid
                </p>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">{tip.antiPattern}</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ============================================================================
// Minimal Tip (just text, for tight spaces)
// ============================================================================

function MinimalTip({ tip, className }: { tip: OperatorStepTip; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
      <HelpCircle className="size-3 flex-shrink-0" />
      <span>{tip.guidance}</span>
    </div>
  );
}

// ============================================================================
// Main OperatorTip Component
// ============================================================================

export function OperatorTip({
  operatorType,
  stepId,
  variant = "inline",
  showExample = true,
  showAntiPattern = true,
  collapsible = false,
  defaultCollapsed = true,
  className,
}: OperatorTipProps) {
  const tip = getStepTip(operatorType, stepId);

  if (!tip) {
    return null;
  }

  switch (variant) {
    case "inline":
      return (
        <InlineTip
          tip={tip}
          showExample={showExample}
          showAntiPattern={showAntiPattern}
          collapsible={collapsible}
          defaultCollapsed={defaultCollapsed}
          className={className}
        />
      );
    case "card":
      return (
        <CardTip
          tip={tip}
          showExample={showExample}
          showAntiPattern={showAntiPattern}
          className={className}
        />
      );
    case "minimal":
      return <MinimalTip tip={tip} className={className} />;
    default:
      return null;
  }
}

// ============================================================================
// Custom Tip Component (for non-step-specific tips)
// ============================================================================

export function CustomTip({
  headline,
  content,
  example,
  antiPattern,
  variant = "inline",
  collapsible = false,
  defaultCollapsed = true,
  className,
}: CustomTipProps) {
  const tip: OperatorStepTip = {
    headline,
    guidance: content,
    example,
    antiPattern,
  };

  switch (variant) {
    case "inline":
      return (
        <InlineTip
          tip={tip}
          showExample={!!example}
          showAntiPattern={!!antiPattern}
          collapsible={collapsible}
          defaultCollapsed={defaultCollapsed}
          className={className}
        />
      );
    case "card":
      return (
        <CardTip
          tip={tip}
          showExample={!!example}
          showAntiPattern={!!antiPattern}
          className={className}
        />
      );
    case "minimal":
      return <MinimalTip tip={tip} className={className} />;
    default:
      return null;
  }
}

export default OperatorTip;
