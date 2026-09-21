"use client";

/**
 * HypothesisArena Component
 *
 * UI component for displaying and interacting with competing hypotheses.
 * Shows the arena with active competitors, tests, and the comparison matrix.
 *
 * Features:
 * - Add/remove competing hypotheses
 * - Record test results per hypothesis
 * - Visualize comparison matrix
 * - Track eliminations
 * - Declare champion when resolved
 *
 * @see brenner_bot-an1n.6 (bead)
 * @see apps/web/src/lib/brenner-loop/hypothesis-arena.ts
 */

import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type {
  ArenaHypothesis,
  ArenaHypothesisStatus,
  ComparisonMatrix,
  HypothesisArena as HypothesisArenaType,
  TestResultType,
} from "@/lib/brenner-loop/hypothesis-arena";
import {
  buildComparisonMatrix,
  calculateDiscriminativePower,
  getActiveHypotheses,
  getEliminatedHypotheses,
  getLeader,
  SOURCE_LABELS,
  STATUS_CONFIG,
} from "@/lib/brenner-loop/hypothesis-arena";
import { cn } from "@/lib/utils";
import { HypothesisCard } from "./HypothesisCard";

// ============================================================================
// Types
// ============================================================================

export interface HypothesisArenaProps {
  /** The arena data to display */
  arena: HypothesisArenaType;

  /** Callback when adding a competitor */
  onAddCompetitor?: () => void;

  /** Callback when creating a new test */
  onCreateTest?: (targetHypotheses: string[]) => void;

  /** Callback when recording a test result */
  onRecordResult?: (testId: string, hypothesisId: string, result: TestResultType) => void;

  /** Callback when eliminating a hypothesis */
  onEliminate?: (hypothesisId: string) => void;

  /** Callback when declaring a champion */
  onResolve?: (championId: string) => void;

  /** Callback when clicking a hypothesis */
  onHypothesisClick?: (hypothesisId: string) => void;

  /** Whether the arena is read-only */
  readonly?: boolean;

  /** Additional className */
  className?: string;
}

// ============================================================================
// Icons
// ============================================================================

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const TrophyIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
    />
  </svg>
);

const XMarkIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const MinusIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
  </svg>
);

const SkullIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513c0 1.037.73 1.929 1.753 2.13 1.274.25 2.594.387 3.947.388m0-7.144c1.355 0 2.697.055 4.024.166C16.155 8.51 17 9.473 17 10.608v2.513c0 1.037-.73 1.929-1.753 2.13-1.274.25-2.594.387-3.947.388m0-7.144V13.5M9 13.5h1.5m2.25 0H14m-7.5 6h9"
    />
  </svg>
);

const BeakerIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-5", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
    />
  </svg>
);

// ============================================================================
// Status Badge
// ============================================================================

interface StatusBadgeProps {
  status: ArenaHypothesisStatus;
  className?: string;
}

function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      variant={
        status === "champion" ? "default" : status === "eliminated" ? "destructive" : "secondary"
      }
      className={cn(
        "text-xs",
        status === "champion" && "bg-primary",
        status === "active" && "bg-green-500/10 text-green-600 border-green-500/30",
        status === "suspended" && "bg-amber-500/10 text-amber-600 border-amber-500/30",
        className,
      )}
    >
      {status === "champion" && <TrophyIcon className="size-3 mr-1" />}
      {status === "eliminated" && <SkullIcon className="size-3 mr-1" />}
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Test Result Cell
// ============================================================================

interface ResultCellProps {
  result: TestResultType | "pending";
  onClick?: () => void;
  readonly?: boolean;
}

function ResultCell({ result, onClick, readonly }: ResultCellProps) {
  const canClick = !readonly && onClick;

  const getResultStyles = (r: TestResultType | "pending") => {
    switch (r) {
      case "supports":
        return "bg-green-500/20 text-green-600 border-green-500/30";
      case "challenges":
        return "bg-orange-500/20 text-orange-600 border-orange-500/30";
      case "eliminates":
        return "bg-red-500/20 text-red-600 border-red-500/30";
      case "neutral":
        return "bg-muted text-muted-foreground";
      case "pending":
        return "bg-muted/50 text-muted-foreground/50 border-dashed";
    }
  };

  const getResultIcon = (r: TestResultType | "pending") => {
    switch (r) {
      case "supports":
        return <CheckIcon className="size-4" />;
      case "challenges":
        return <XMarkIcon className="size-4" />;
      case "eliminates":
        return <SkullIcon className="size-4" />;
      case "neutral":
        return <MinusIcon className="size-4" />;
      case "pending":
        return <span className="text-xs">?</span>;
    }
  };

  return (
    <button
      type="button"
      onClick={canClick ? onClick : undefined}
      disabled={!canClick}
      className={cn(
        "flex items-center justify-center size-8 rounded-md border transition-all",
        getResultStyles(result),
        canClick && "hover:scale-110 cursor-pointer",
        !canClick && "cursor-default",
      )}
      title={result}
    >
      {getResultIcon(result)}
    </button>
  );
}

// ============================================================================
// Competitor Card
// ============================================================================

interface CompetitorCardProps {
  competitor: ArenaHypothesis;
  isLeader: boolean;
  onEliminate?: () => void;
  onResolve?: () => void;
  onClick?: () => void;
  readonly?: boolean;
}

function CompetitorCard({
  competitor,
  isLeader,
  onEliminate,
  onResolve,
  onClick,
  readonly,
}: CompetitorCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "rounded-xl border bg-card overflow-hidden",
        competitor.status === "eliminated" && "opacity-60",
        competitor.status === "champion" && "ring-2 ring-primary border-primary",
        isLeader && competitor.status === "active" && "border-green-500/50",
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-semibold">
            H<sub>{competitor.hypothesis.version}</sub>
          </span>
          <StatusBadge status={competitor.status} />
          {isLeader && competitor.status === "active" && (
            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">
              Leader
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{SOURCE_LABELS[competitor.source]}</span>
          <span
            className={cn(
              "font-semibold text-sm",
              competitor.score > 0 && "text-green-600",
              competitor.score < 0 && "text-red-600",
            )}
          >
            {competitor.score > 0 ? "+" : ""}
            {competitor.score}
          </span>
        </div>
      </div>

      {/* Body */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="p-4">
          <p
            className={cn(
              "text-sm line-clamp-2",
              onClick && "cursor-pointer hover:text-primary transition-colors",
            )}
            onClick={onClick}
            onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
          >
            {competitor.hypothesis.statement}
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span>Tests: {competitor.testsApplied}</span>
            <span className="text-green-600">+{competitor.testsSupporting}</span>
            <span className="text-red-600">-{competitor.testsChallenging}</span>
            <span>Confidence: {competitor.hypothesis.confidence}%</span>
          </div>

          {/* Elimination info */}
          {competitor.status === "eliminated" && competitor.eliminationReason && (
            <div className="mt-3 p-2 rounded-lg bg-red-500/10 text-sm text-red-600">
              <strong>Eliminated:</strong> {competitor.eliminationReason}
            </div>
          )}
        </div>

        <CollapsibleTrigger
          showChevron={false}
          className="w-full py-2 px-4 border-t border-border bg-muted/20 hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDownIcon className="size-4" />
            </motion.div>
            {isExpanded ? "Collapse" : "Expand details"}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 border-t border-border">
            <HypothesisCard
              hypothesis={competitor.hypothesis}
              mode="view"
              showConfounds={true}
              showStructure={true}
            />

            {/* Actions */}
            {!readonly && competitor.status === "active" && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                {onEliminate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onEliminate}
                    className="text-red-600"
                  >
                    <SkullIcon className="size-4 mr-1" />
                    Eliminate
                  </Button>
                )}
                {onResolve && (
                  <Button variant="default" size="sm" onClick={onResolve}>
                    <TrophyIcon className="size-4 mr-1" />
                    Declare Champion
                  </Button>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}

// ============================================================================
// Comparison Matrix Table
// ============================================================================

interface ComparisonMatrixTableProps {
  matrix: ComparisonMatrix;
  onCellClick?: (testId: string, hypothesisId: string) => void;
  readonly?: boolean;
}

function ComparisonMatrixTable({ matrix, onCellClick, readonly }: ComparisonMatrixTableProps) {
  if (matrix.tests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BeakerIcon className="size-8 mx-auto mb-2 opacity-50" />
        <p>No tests applied yet</p>
        <p className="text-xs">Create tests to compare hypotheses</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 font-medium">Hypothesis</th>
            {matrix.tests.map((test) => (
              <th key={test.id} className="py-2 px-3 font-medium text-center min-w-[80px]">
                <div className="truncate max-w-[100px]" title={test.name}>
                  {test.name}
                </div>
              </th>
            ))}
            <th className="py-2 px-3 font-medium text-right">Score</th>
            <th className="py-2 px-3 font-medium text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((row) => (
            <tr
              key={row.hypothesisId}
              className={cn(
                "border-b border-border/50 hover:bg-muted/30 transition-colors",
                row.status === "eliminated" && "opacity-50",
              )}
            >
              <td className="py-2 px-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    H{row.hypothesisId.split("-v")[1] || "1"}
                  </span>
                  <span className="truncate max-w-[200px]" title={row.statement}>
                    {row.statement}
                  </span>
                </div>
              </td>
              {matrix.tests.map((test) => (
                <td key={test.id} className="py-2 px-3 text-center">
                  <div className="flex justify-center">
                    <ResultCell
                      result={row.testResults[test.id] || "pending"}
                      onClick={
                        onCellClick && row.status === "active"
                          ? () => onCellClick(test.id, row.hypothesisId)
                          : undefined
                      }
                      readonly={readonly || row.status !== "active"}
                    />
                  </div>
                </td>
              ))}
              <td className="py-2 px-3 text-right">
                <span
                  className={cn(
                    "font-semibold",
                    row.score > 0 && "text-green-600",
                    row.score < 0 && "text-red-600",
                  )}
                >
                  {row.score > 0 ? "+" : ""}
                  {row.score}
                </span>
              </td>
              <td className="py-2 px-3 text-center">
                <StatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function HypothesisArena({
  arena,
  onAddCompetitor,
  onCreateTest,
  onRecordResult,
  onEliminate,
  onResolve,
  onHypothesisClick,
  readonly = false,
  className,
}: HypothesisArenaProps) {
  const activeHypotheses = getActiveHypotheses(arena);
  const eliminatedHypotheses = getEliminatedHypotheses(arena);
  const leader = getLeader(arena);
  const discriminativePower = calculateDiscriminativePower(arena);
  const matrix = buildComparisonMatrix(arena);

  const [showGraveyard, setShowGraveyard] = React.useState(false);

  // Cycle through result types: pending -> supports -> challenges -> eliminates -> neutral -> supports...
  const handleCellClick = React.useCallback(
    (testId: string, hypothesisId: string) => {
      if (!onRecordResult) return;

      // Find current result from matrix
      const row = matrix.rows.find((r) => r.hypothesisId === hypothesisId);
      const current = row?.testResults[testId] || "pending";

      let next: TestResultType;
      switch (current) {
        case "pending":
          next = "supports";
          break;
        case "supports":
          next = "challenges";
          break;
        case "challenges":
          next = "eliminates";
          break;
        case "eliminates":
          next = "neutral";
          break;
        case "neutral":
          next = "supports";
          break;
        default:
          next = "supports";
      }

      onRecordResult(testId, hypothesisId, next);
    },
    [onRecordResult, matrix],
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">Hypothesis Arena</h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-xl">{arena.question}</p>
        </div>
        {arena.status === "resolved" && arena.championId && (
          <Badge className="bg-primary">
            <TrophyIcon className="size-4 mr-1" />
            Resolved
          </Badge>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 p-4 rounded-lg border border-border bg-muted/30">
        <div>
          <div className="text-2xl font-bold">{activeHypotheses.length}</div>
          <div className="text-xs text-muted-foreground">Active</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{eliminatedHypotheses.length}</div>
          <div className="text-xs text-muted-foreground">Eliminated</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{arena.tests.length}</div>
          <div className="text-xs text-muted-foreground">Tests</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{Math.round(discriminativePower * 100)}%</div>
          <div className="text-xs text-muted-foreground">Discriminative Power</div>
        </div>
        {leader && (
          <div className="ml-auto">
            <div className="text-xs text-muted-foreground mb-1">Current Leader</div>
            <div className="font-medium text-sm truncate max-w-[200px]">
              {leader.hypothesis.statement.length > 50
                ? `${leader.hypothesis.statement.slice(0, 50)}...`
                : leader.hypothesis.statement}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {!readonly && arena.status === "open" && (
        <div className="flex items-center gap-2">
          {onAddCompetitor && (
            <Button variant="outline" size="sm" onClick={onAddCompetitor}>
              <PlusIcon className="size-4 mr-1" />
              Add Competitor
            </Button>
          )}
          {onCreateTest && activeHypotheses.length >= 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCreateTest(activeHypotheses.map((h) => h.hypothesisId))}
            >
              <BeakerIcon className="size-4 mr-1" />
              Create Test
            </Button>
          )}
        </div>
      )}

      {/* Comparison Matrix */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="font-semibold">Comparison Matrix</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Test results across competing hypotheses
          </p>
        </div>
        <div className="p-4">
          <ComparisonMatrixTable
            matrix={matrix}
            onCellClick={onRecordResult ? handleCellClick : undefined}
            readonly={readonly}
          />
        </div>
      </div>

      {/* Active Competitors */}
      <div>
        <h3 className="font-semibold mb-3">Active Competitors ({activeHypotheses.length})</h3>
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {activeHypotheses.map((competitor) => (
              <CompetitorCard
                key={competitor.hypothesisId}
                competitor={competitor}
                isLeader={leader?.hypothesisId === competitor.hypothesisId}
                onEliminate={onEliminate ? () => onEliminate(competitor.hypothesisId) : undefined}
                onResolve={onResolve ? () => onResolve(competitor.hypothesisId) : undefined}
                onClick={
                  onHypothesisClick ? () => onHypothesisClick(competitor.hypothesisId) : undefined
                }
                readonly={readonly || arena.status === "resolved"}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Graveyard (eliminated hypotheses) */}
      {eliminatedHypotheses.length > 0 && (
        <Collapsible open={showGraveyard} onOpenChange={setShowGraveyard}>
          <CollapsibleTrigger
            showChevron={false}
            className="w-full py-3 px-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SkullIcon className="size-5 text-muted-foreground" />
                <span className="font-medium">Graveyard</span>
                <span className="text-sm text-muted-foreground">
                  ({eliminatedHypotheses.length} eliminated)
                </span>
              </div>
              <motion.div
                animate={{ rotate: showGraveyard ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDownIcon className="size-4 text-muted-foreground" />
              </motion.div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-4 grid gap-4">
              <AnimatePresence mode="popLayout">
                {eliminatedHypotheses.map((competitor) => (
                  <CompetitorCard
                    key={competitor.hypothesisId}
                    competitor={competitor}
                    isLeader={false}
                    readonly={true}
                    onClick={
                      onHypothesisClick
                        ? () => onHypothesisClick(competitor.hypothesisId)
                        : undefined
                    }
                  />
                ))}
              </AnimatePresence>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Empty state */}
      {arena.competitors.length < 2 && (
        <div className="text-center py-8 p-6 rounded-xl border-2 border-dashed border-border">
          <BeakerIcon className="size-10 mx-auto mb-3 text-muted-foreground/50" />
          <h3 className="font-medium mb-1">Add Competing Hypotheses</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            The Brenner method requires comparing alternatives. Add at least one more hypothesis to
            start discriminative testing.
          </p>
          {onAddCompetitor && !readonly && (
            <Button variant="outline" className="mt-4" onClick={onAddCompetitor}>
              <PlusIcon className="size-4 mr-1" />
              Add Competitor
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default HypothesisArena;
