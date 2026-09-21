/**
 * Quality Checkpoint Component
 *
 * Validates user input and catches common mistakes in coach mode.
 * Provides specific feedback and suggestions for improvement.
 *
 * @see brenner_bot-reew.8 (bead)
 */

"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Lightbulb,
  RefreshCw,
  XCircle,
} from "lucide-react";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCoach } from "@/lib/brenner-loop/coach-context";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type CheckSeverity = "error" | "warning" | "info";

export interface QualityIssue {
  /** Unique identifier for this issue type */
  id: string;

  /** Severity level */
  severity: CheckSeverity;

  /** Short description of the issue */
  message: string;

  /** Detailed explanation of why this is a problem */
  explanation?: string;

  /** Suggested fix */
  suggestion?: string;

  /** The problematic text (if applicable) */
  highlightText?: string;
}

export interface QualityCheckResult {
  /** Whether the check passed */
  passed: boolean;

  /** List of issues found */
  issues: QualityIssue[];

  /** Score from 0-100 */
  score: number;

  /** Positive feedback (if passed) */
  praise?: string;
}

export interface QualityCheckpointProps {
  /** Title for this checkpoint */
  title: string;

  /** Content being checked (for display) */
  contentLabel?: string;

  /** The check result */
  result: QualityCheckResult;

  /** Whether the user can proceed despite issues */
  allowBypass?: boolean;

  /** Called when user chooses to proceed */
  onProceed?: () => void;

  /** Called when user wants to go back and fix */
  onFix?: () => void;

  /** Called when user bypasses despite warnings */
  onBypass?: () => void;

  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function QualityCheckpoint({
  title,
  contentLabel,
  result,
  allowBypass = true,
  onProceed,
  onFix,
  onBypass,
  className,
}: QualityCheckpointProps): React.ReactElement | null {
  const { isCoachActive, recordCheckpointPassed, recordMistakeCaught } = useCoach();

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Hooks must be called unconditionally before any early returns
  const toggleExpanded = useCallback((issueId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(issueId)) {
        next.delete(issueId);
      } else {
        next.add(issueId);
      }
      return next;
    });
  }, []);

  const handleProceed = useCallback(() => {
    recordCheckpointPassed();
    onProceed?.();
  }, [recordCheckpointPassed, onProceed]);

  const handleBypass = useCallback(() => {
    recordMistakeCaught();
    onBypass?.();
  }, [recordMistakeCaught, onBypass]);

  // Don't render if coach is disabled
  if (!isCoachActive) {
    return null;
  }

  const errorCount = result.issues.filter((i) => i.severity === "error").length;
  const warningCount = result.issues.filter((i) => i.severity === "warning").length;
  const infoCount = result.issues.filter((i) => i.severity === "info").length;

  const hasBlockingErrors = errorCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-lg border",
        result.passed
          ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
          : hasBlockingErrors
            ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
            : "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30",
        className,
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-inherit">
        <div className="flex items-center gap-3">
          {result.passed ? (
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : hasBlockingErrors ? (
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          )}
          <div>
            <h3
              className={cn(
                "font-medium",
                result.passed
                  ? "text-green-900 dark:text-green-100"
                  : hasBlockingErrors
                    ? "text-red-900 dark:text-red-100"
                    : "text-orange-900 dark:text-orange-100",
              )}
            >
              {title}
            </h3>
            {contentLabel && <p className="text-sm opacity-70">{contentLabel}</p>}
          </div>
        </div>

        {/* Score badge */}
        <div
          className={cn(
            "px-3 py-1 rounded-full text-sm font-medium",
            result.score >= 80
              ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200"
              : result.score >= 50
                ? "bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200"
                : "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200",
          )}
        >
          {result.score}%
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-4">
        {/* Success message */}
        {result.passed && result.praise && (
          <div className="flex items-start gap-2 text-green-800 dark:text-green-200">
            <Lightbulb className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm">{result.praise}</p>
          </div>
        )}

        {/* Issue summary */}
        {!result.passed && (
          <div className="flex items-center gap-4 text-sm">
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-red-700 dark:text-red-300">
                <XCircle className="h-4 w-4" />
                {errorCount} error{errorCount !== 1 ? "s" : ""}
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1 text-orange-700 dark:text-orange-300">
                <AlertTriangle className="h-4 w-4" />
                {warningCount} warning{warningCount !== 1 ? "s" : ""}
              </span>
            )}
            {infoCount > 0 && (
              <span className="flex items-center gap-1 text-blue-700 dark:text-blue-300">
                <Lightbulb className="h-4 w-4" />
                {infoCount} suggestion{infoCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {/* Issues list */}
        {result.issues.length > 0 && (
          <div className="space-y-2">
            {result.issues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                expanded={expanded.has(issue.id)}
                onToggle={() => toggleExpanded(issue.id)}
              />
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-inherit">
          {result.passed ? (
            <Button onClick={handleProceed} className="bg-green-600 hover:bg-green-700 text-white">
              <ChevronRight className="h-4 w-4 mr-1" />
              Continue
            </Button>
          ) : hasBlockingErrors ? (
            <Button onClick={onFix} variant="destructive">
              <RefreshCw className="h-4 w-4 mr-1" />
              Fix Issues
            </Button>
          ) : (
            <>
              <Button onClick={onFix} variant="outline">
                <RefreshCw className="h-4 w-4 mr-1" />
                Fix Issues
              </Button>
              {allowBypass && (
                <Button
                  onClick={handleBypass}
                  variant="ghost"
                  className="text-orange-700 dark:text-orange-300"
                >
                  Continue anyway
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Issue Card Sub-component
// ============================================================================

interface IssueCardProps {
  issue: QualityIssue;
  expanded: boolean;
  onToggle: () => void;
}

function IssueCard({ issue, expanded, onToggle }: IssueCardProps): React.ReactElement {
  const severityStyles = {
    error: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-800 dark:text-red-200",
      icon: XCircle,
      iconColor: "text-red-600 dark:text-red-400",
    },
    warning: {
      bg: "bg-orange-100 dark:bg-orange-900/30",
      text: "text-orange-800 dark:text-orange-200",
      icon: AlertTriangle,
      iconColor: "text-orange-600 dark:text-orange-400",
    },
    info: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-800 dark:text-blue-200",
      icon: Lightbulb,
      iconColor: "text-blue-600 dark:text-blue-400",
    },
  };

  const style = severityStyles[issue.severity];
  const Icon = style.icon;

  return (
    <div className={cn("rounded-md", style.bg)}>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-start gap-2 px-3 py-2 text-left",
          "hover:opacity-80 transition-opacity",
        )}
      >
        <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", style.iconColor)} />
        <div className="flex-1">
          <p className={cn("text-sm font-medium", style.text)}>{issue.message}</p>
          {issue.highlightText && (
            <p className="text-xs opacity-70 mt-1 font-mono">&ldquo;{issue.highlightText}&rdquo;</p>
          )}
        </div>
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            style.iconColor,
            expanded && "rotate-90",
          )}
        />
      </button>

      <AnimatePresence>
        {expanded && (issue.explanation || issue.suggestion) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={cn("px-3 pb-3 space-y-2 text-sm", style.text)}>
              {issue.explanation && (
                <div>
                  <span className="font-medium">Why this matters: </span>
                  <span className="opacity-80">{issue.explanation}</span>
                </div>
              )}
              {issue.suggestion && (
                <div className="flex items-start gap-2 p-2 rounded bg-white/50 dark:bg-black/20">
                  <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{issue.suggestion}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Hypothesis Quality Checker
// ============================================================================

export interface HypothesisQualityCheckerProps {
  /** Hypothesis statement */
  statement: string;

  /** Proposed mechanism */
  mechanism?: string;

  /** Predictions if true */
  predictions?: string[];

  /** Falsification conditions */
  falsificationConditions?: string[];

  /** Called when check passes */
  onProceed?: () => void;

  /** Called when user wants to fix */
  onFix?: () => void;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Specialized quality checker for hypothesis formulation.
 */
export function HypothesisQualityChecker({
  statement,
  mechanism,
  predictions = [],
  falsificationConditions = [],
  onProceed,
  onFix,
  className,
}: HypothesisQualityCheckerProps): React.ReactElement | null {
  const { isCoachActive } = useCoach();

  const result = useMemo((): QualityCheckResult => {
    const issues: QualityIssue[] = [];
    let score = 100;

    // Check statement
    if (!statement || statement.trim().length < 20) {
      issues.push({
        id: "statement-too-short",
        severity: "error",
        message: "Hypothesis statement is too short",
        explanation:
          "A good hypothesis needs enough detail to be testable. One-liners are usually too vague.",
        suggestion: "Expand your statement to include what you believe and why you believe it.",
      });
      score -= 30;
    }

    // Check for vague terms
    const vagueTerms = ["affects", "impacts", "influences", "relates to", "causes"];
    const foundVague = vagueTerms.filter((term) => statement.toLowerCase().includes(term));
    if (foundVague.length > 0 && !mechanism) {
      issues.push({
        id: "vague-terms",
        severity: "warning",
        message: `Vague causal language detected: "${foundVague.join('", "')}"`,
        highlightText: foundVague[0],
        explanation: "Terms like 'affects' or 'causes' are vague without a specific mechanism.",
        suggestion: "Specify HOW the effect occurs. What is the causal chain?",
      });
      score -= 15;
    }

    // Check mechanism
    if (!mechanism || mechanism.trim().length < 10) {
      issues.push({
        id: "missing-mechanism",
        severity: "error",
        message: "No mechanism specified",
        explanation:
          "A hypothesis without a mechanism is just a correlation claim. You need to explain HOW it works.",
        suggestion: "Add a mechanism that explains the causal pathway from cause to effect.",
      });
      score -= 25;
    }

    // Check predictions
    if (predictions.length === 0) {
      issues.push({
        id: "no-predictions",
        severity: "warning",
        message: "No predictions specified",
        explanation: "If your hypothesis doesn't make predictions, it can't be tested.",
        suggestion:
          "Add at least one specific prediction that would follow if your hypothesis is true.",
      });
      score -= 15;
    }

    // Check falsification conditions
    if (falsificationConditions.length === 0) {
      issues.push({
        id: "no-falsification",
        severity: "warning",
        message: "No falsification conditions specified",
        explanation:
          "A hypothesis that can't be proven wrong is unfalsifiable—and therefore unscientific.",
        suggestion: "Add at least one condition that would DISPROVE your hypothesis.",
      });
      score -= 15;
    }

    // Check for unfalsifiable language
    const unfalsifiablePatterns = [
      /might be/i,
      /could possibly/i,
      /may sometimes/i,
      /in some cases/i,
    ];
    const foundUnfalsifiable = unfalsifiablePatterns.some((p) => p.test(statement));
    if (foundUnfalsifiable) {
      issues.push({
        id: "unfalsifiable-language",
        severity: "info",
        message: "Language may make hypothesis hard to falsify",
        explanation:
          "Hedging language like 'might' or 'sometimes' can make a hypothesis impossible to disprove.",
        suggestion: "Make a stronger, more specific claim that could actually be wrong.",
      });
      score -= 5;
    }

    score = Math.max(0, score);

    return {
      passed: issues.filter((i) => i.severity === "error").length === 0 && score >= 60,
      issues,
      score,
      praise:
        score >= 80
          ? "Excellent! Your hypothesis is well-formed and testable."
          : score >= 60
            ? "Good start! A few tweaks would make it even stronger."
            : undefined,
    };
  }, [statement, mechanism, predictions, falsificationConditions]);

  if (!isCoachActive) {
    return null;
  }

  return (
    <QualityCheckpoint
      title="Hypothesis Quality Check"
      contentLabel="Checking your hypothesis formulation"
      result={result}
      onProceed={onProceed}
      onFix={onFix}
      onBypass={onProceed} // Bypass also proceeds, but recordMistakeCaught is called first
      className={className}
    />
  );
}

// ============================================================================
// Exports
// ============================================================================

export default QualityCheckpoint;
