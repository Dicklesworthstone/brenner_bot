"use client";

/**
 * PredictionMatrix Component
 *
 * Displays discriminating tests between two hypotheses.
 *
 * @see brenner_bot-y8px (bead)
 */

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  buildEvidenceSummary,
  buildPredictionConflictMatrix,
  type PredictionConflictRow,
} from "@/lib/brenner-loop/comparison";
import type { ComparisonMatrix, TestResultType } from "@/lib/brenner-loop/hypothesis-arena";
import { cn } from "@/lib/utils";

export interface PredictionMatrixProps {
  matrix: ComparisonMatrix;
  hypothesisAId: string;
  hypothesisBId: string;
  className?: string;
}

function resultStyles(result: TestResultType | "pending") {
  switch (result) {
    case "supports":
      return "bg-emerald-500/15 text-emerald-700 border-emerald-500/40";
    case "challenges":
      return "bg-orange-500/15 text-orange-700 border-orange-500/40";
    case "eliminates":
      return "bg-red-500/15 text-red-700 border-red-500/40";
    case "neutral":
      return "bg-muted text-muted-foreground border-muted";
    case "pending":
      return "bg-muted/50 text-muted-foreground border-dashed";
  }
}

function resultLabel(result: TestResultType | "pending") {
  switch (result) {
    case "supports":
      return "Supports";
    case "challenges":
      return "Challenges";
    case "eliminates":
      return "Eliminates";
    case "neutral":
      return "Neutral";
    case "pending":
      return "Pending";
  }
}

function ResultBadge({ result }: { result: TestResultType | "pending" }) {
  return (
    <Badge variant="outline" className={cn("text-[11px] font-medium", resultStyles(result))}>
      {resultLabel(result)}
    </Badge>
  );
}

function DiscriminatingRow({ row }: { row: PredictionConflictRow }) {
  return (
    <div
      className={cn(
        "grid gap-3 rounded-lg border px-4 py-3 md:grid-cols-[1.5fr_1fr_1fr]",
        row.discriminating ? "border-emerald-500/40" : "border-muted",
      )}
    >
      <div className="space-y-1">
        <div className="text-sm font-semibold text-foreground">{row.testName}</div>
        <div className="text-xs text-muted-foreground">
          {row.discriminating ? "Discriminating" : "Non-discriminating"}
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Hypothesis A
        </div>
        <ResultBadge result={row.resultA} />
      </div>
      <div className="space-y-1">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Hypothesis B
        </div>
        <ResultBadge result={row.resultB} />
      </div>
    </div>
  );
}

export function PredictionMatrix({
  matrix,
  hypothesisAId,
  hypothesisBId,
  className,
}: PredictionMatrixProps) {
  const rows = React.useMemo(
    () => buildPredictionConflictMatrix(matrix, hypothesisAId, hypothesisBId),
    [matrix, hypothesisAId, hypothesisBId],
  );

  const summary = React.useMemo(() => buildEvidenceSummary(rows), [rows]);

  if (rows.length === 0) {
    return (
      <div
        className={cn("rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground", className)}
      >
        No shared tests recorded yet. Add discriminating tests to compare these hypotheses.
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-xl border bg-card p-4">
        <div className="text-sm font-semibold text-foreground">Evidence Summary</div>
        <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <div className="text-xs uppercase text-muted-foreground">Discriminating</div>
            <div className="text-lg font-semibold text-foreground">{summary.discriminating}</div>
          </div>
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <div className="text-xs uppercase text-muted-foreground">Favors A</div>
            <div className="text-lg font-semibold text-foreground">{summary.favorsA}</div>
          </div>
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <div className="text-xs uppercase text-muted-foreground">Favors B</div>
            <div className="text-lg font-semibold text-foreground">{summary.favorsB}</div>
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          {summary.pending} pending · {summary.ties} ties · {summary.total} total tests
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <DiscriminatingRow key={row.testId} row={row} />
        ))}
      </div>
    </div>
  );
}

export default PredictionMatrix;
