"use client";

/**
 * EvidenceTimeline - Timeline View of Evidence Events
 *
 * Displays a chronological timeline of evidence entries showing:
 * - Confidence changes with direction indicators
 * - Test power ratings (star display)
 * - Click-to-expand detail popovers
 *
 * @see brenner_bot-njjo.4 (bead)
 * @module components/brenner-loop/evidence/EvidenceTimeline
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  FileText,
  HelpCircle,
  Minus,
  TestTube,
  TrendingDown,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  formatConfidence,
  formatDelta,
  getConfidenceAssessment,
  getStarRating,
} from "@/lib/brenner-loop/confidence";
import type { EvidenceEntry, EvidenceResult } from "@/lib/brenner-loop/evidence";
import { calculateConfidenceDelta, TEST_TYPE_LABELS } from "@/lib/brenner-loop/evidence";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface EvidenceTimelineProps {
  /** Evidence entries to display */
  entries: EvidenceEntry[];
  /** Optional: currently selected entry ID (controlled mode) */
  selectedId?: string;
  /** Callback when an entry is selected */
  onSelectEntry?: (entry: EvidenceEntry) => void;
  /** Callback when detail panel is closed (required in controlled mode for X button to work) */
  onCloseDetail?: () => void;
  /** Whether to show the timeline in compact mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Result indicator icon with color
 */
function ResultIcon({ result, className }: { result: EvidenceResult; className?: string }) {
  const config = {
    supports: {
      icon: CheckCircle2,
      color: "text-green-500",
    },
    challenges: {
      icon: XCircle,
      color: "text-red-500",
    },
    inconclusive: {
      icon: HelpCircle,
      color: "text-amber-500",
    },
  };

  const cfg = config[result];
  const Icon = cfg.icon;

  return <Icon className={cn("size-4", cfg.color, className)} />;
}

/**
 * Confidence change indicator with arrow
 */
function DeltaIndicator({ delta, className }: { delta: number; className?: string }) {
  if (delta > 0) {
    return (
      <div className={cn("flex items-center gap-1 text-green-500", className)}>
        <TrendingUp className="size-3" />
        <span className="text-xs font-medium">{formatDelta(delta)}</span>
      </div>
    );
  }

  if (delta < 0) {
    return (
      <div className={cn("flex items-center gap-1 text-red-500", className)}>
        <TrendingDown className="size-3" />
        <span className="text-xs font-medium">{formatDelta(delta)}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1 text-muted-foreground", className)}>
      <Minus className="size-3" />
      <span className="text-xs font-medium">±0%</span>
    </div>
  );
}

/**
 * Timeline node for a single evidence entry
 */
function TimelineNode({
  entry,
  isFirst,
  isLast,
  isSelected,
  onClick,
  compact,
}: {
  entry: EvidenceEntry;
  isFirst: boolean;
  isLast: boolean;
  isSelected: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const delta = calculateConfidenceDelta(entry);
  const stars = getStarRating(entry.test.discriminativePower);

  // Get the result-based colors for the node
  const nodeColors = {
    supports: "bg-green-500 ring-green-500/30",
    challenges: "bg-red-500 ring-red-500/30",
    inconclusive: "bg-amber-500 ring-amber-500/30",
  };

  const lineColors = {
    supports: "bg-green-200",
    challenges: "bg-red-200",
    inconclusive: "bg-amber-200",
  };

  return (
    <div className="flex gap-4">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        {/* Top line */}
        {!isFirst && <div className={cn("w-0.5 h-4", lineColors[entry.result])} />}
        {isFirst && <div className="h-4" />}

        {/* Node */}
        <motion.button
          onClick={onClick}
          className={cn(
            "relative size-4 rounded-full transition-all",
            nodeColors[entry.result],
            isSelected && "ring-4",
          )}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.95 }}
          title={`${entry.result}: ${entry.test.description}`}
        />

        {/* Bottom line */}
        {!isLast && <div className={cn("w-0.5 flex-1 min-h-8", lineColors[entry.result])} />}
        {isLast && <div className="flex-1" />}
      </div>

      {/* Content card */}
      <motion.div
        className={cn("flex-1 pb-4", isLast && "pb-0")}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.05 }}
      >
        <motion.button
          onClick={onClick}
          className={cn(
            "w-full p-3 rounded-lg border text-left transition-all",
            isSelected
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border hover:border-primary/50 hover:bg-muted/30",
          )}
          whileTap={{ scale: 0.99 }}
        >
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <ResultIcon result={entry.result} />
              <span className="text-sm font-medium truncate">
                {entry.test.description.length > 40
                  ? `${entry.test.description.slice(0, 40)}...`
                  : entry.test.description}
              </span>
            </div>
            <DeltaIndicator delta={delta} />
          </div>

          {/* Confidence row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <span>{formatConfidence(entry.confidenceBefore)}</span>
              <span className="text-muted-foreground/50">→</span>
              <span className="font-medium text-foreground">
                {formatConfidence(entry.confidenceAfter)}
              </span>
            </div>
            <span className="text-primary">{stars}</span>
          </div>

          {!compact && (
            <>
              {/* Observation preview */}
              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{entry.observation}</p>

              {/* Date */}
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground/70">
                <Calendar className="size-3" />
                <span>
                  {new Date(entry.recordedAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}

/**
 * Detail popover for selected evidence entry
 */
function EvidenceDetail({ entry, onClose }: { entry: EvidenceEntry; onClose: () => void }) {
  const delta = calculateConfidenceDelta(entry);
  const assessment = getConfidenceAssessment(entry.confidenceAfter);
  const stars = getStarRating(entry.test.discriminativePower);

  const resultLabels = {
    supports: "Supports Hypothesis",
    challenges: "Challenges Hypothesis",
    inconclusive: "Inconclusive",
  };

  const resultColors = {
    supports: "bg-green-500/10 text-green-600 border-green-200",
    challenges: "bg-red-500/10 text-red-600 border-red-200",
    inconclusive: "bg-amber-500/10 text-amber-600 border-amber-200",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="rounded-lg border border-border bg-background shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <TestTube className="size-5 text-primary" />
          <h3 className="font-semibold">Evidence Detail</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Result badge */}
        <div
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border",
            resultColors[entry.result],
          )}
        >
          <ResultIcon result={entry.result} className="size-4" />
          {resultLabels[entry.result]}
        </div>

        {/* Test info */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wide">Test</label>
          <p className="mt-1 text-sm font-medium">{entry.test.description}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{TEST_TYPE_LABELS[entry.test.type]}</span>
            <span>•</span>
            <span className="text-primary">{stars}</span>
          </div>
        </div>

        {/* Confidence change */}
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">Before</div>
              <div className="text-lg font-bold">{formatConfidence(entry.confidenceBefore)}</div>
            </div>

            <DeltaIndicator delta={delta} className="text-base" />

            <div className="text-center">
              <div className="text-xs text-muted-foreground">After</div>
              <div className="text-lg font-bold">{formatConfidence(entry.confidenceAfter)}</div>
            </div>
          </div>

          {/* Assessment */}
          <div className="mt-2 pt-2 border-t border-border">
            <div
              className={cn(
                "inline-block px-2 py-0.5 rounded text-xs font-medium",
                assessment.color === "green" && "bg-green-500/10 text-green-600",
                assessment.color === "lime" && "bg-lime-500/10 text-lime-600",
                assessment.color === "yellow" && "bg-yellow-500/10 text-yellow-600",
                assessment.color === "orange" && "bg-orange-500/10 text-orange-600",
                assessment.color === "red" && "bg-red-500/10 text-red-600",
              )}
            >
              {assessment.label}
            </div>
          </div>
        </div>

        {/* Predictions */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="text-xs text-green-700 dark:text-green-400 font-medium mb-1">
              If True
            </div>
            <p className="text-xs text-green-600 dark:text-green-300 line-clamp-3">
              {entry.predictionIfTrue}
            </p>
          </div>
          <div className="p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="text-xs text-red-700 dark:text-red-400 font-medium mb-1">If False</div>
            <p className="text-xs text-red-600 dark:text-red-300 line-clamp-3">
              {entry.predictionIfFalse}
            </p>
          </div>
        </div>

        {/* Observation */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wide">
            Observation
          </label>
          <p className="mt-1 text-sm">{entry.observation}</p>
          {entry.source && (
            <p className="mt-1 text-xs text-muted-foreground">Source: {entry.source}</p>
          )}
        </div>

        {/* Interpretation */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wide">
            Interpretation
          </label>
          <p className="mt-1 text-sm">{entry.interpretation}</p>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 pt-2 border-t border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="size-3" />
            {new Date(entry.recordedAt).toLocaleString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          {entry.recordedBy && (
            <div className="flex items-center gap-1">
              <FileText className="size-3" />
              {entry.recordedBy}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyTimeline() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <TestTube className="size-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-lg mb-1">No Evidence Yet</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Run tests and record evidence to see your hypothesis journey visualized here.
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function EvidenceTimeline({
  entries,
  selectedId,
  onSelectEntry,
  onCloseDetail,
  compact = false,
  className,
}: EvidenceTimelineProps) {
  const [internalSelectedId, setInternalSelectedId] = React.useState<string | null>(null);

  // Determine if we're in controlled mode (parent manages selection via selectedId prop)
  // Note: onSelectEntry alone doesn't make it controlled - it's just a callback
  const isControlled = selectedId !== undefined;

  // Use controlled or uncontrolled selection
  const effectiveSelectedId = selectedId ?? internalSelectedId;

  const selectedEntry = React.useMemo(() => {
    return entries.find((e) => e.id === effectiveSelectedId) ?? null;
  }, [entries, effectiveSelectedId]);

  const handleSelect = (entry: EvidenceEntry) => {
    if (onSelectEntry) {
      onSelectEntry(entry);
    } else {
      setInternalSelectedId(entry.id === internalSelectedId ? null : entry.id);
    }
  };

  const handleCloseDetail = () => {
    if (isControlled) {
      // In controlled mode, call the parent's close handler if provided
      onCloseDetail?.();
    } else {
      // In uncontrolled mode, clear internal state
      setInternalSelectedId(null);
    }
  };

  // Sort entries by date (newest first for timeline)
  const sortedEntries = React.useMemo(() => {
    return [...entries].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    );
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className={className}>
        <EmptyTimeline />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col lg:flex-row gap-6", className)}>
      {/* Timeline */}
      <div className="flex-1 min-w-0">
        <div className="space-y-0">
          {sortedEntries.map((entry, index) => (
            <TimelineNode
              key={entry.id}
              entry={entry}
              isFirst={index === 0}
              isLast={index === sortedEntries.length - 1}
              isSelected={entry.id === effectiveSelectedId}
              onClick={() => handleSelect(entry)}
              compact={compact}
            />
          ))}
        </div>
      </div>

      {/* Detail panel (desktop) */}
      <AnimatePresence>
        {selectedEntry && !compact && (
          <div key={`desktop-${selectedEntry.id}`} className="hidden lg:block w-96 flex-shrink-0">
            <div className="sticky top-4">
              <EvidenceDetail entry={selectedEntry} onClose={handleCloseDetail} />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail overlay (mobile) */}
      <AnimatePresence>
        {selectedEntry && !compact && (
          <div
            key={`mobile-${selectedEntry.id}`}
            className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={(e) => {
              // Close when clicking the backdrop (not the detail panel)
              if (e.target === e.currentTarget) {
                handleCloseDetail();
              }
            }}
          >
            <div className="absolute inset-4 top-auto max-h-[80vh] overflow-auto">
              <EvidenceDetail entry={selectedEntry} onClose={handleCloseDetail} />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default EvidenceTimeline;
