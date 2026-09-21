"use client";

/**
 * ComparisonView Component
 *
 * High-level view for comparing two competing hypotheses side-by-side.
 *
 * @see brenner_bot-y8px (bead)
 */

import * as React from "react";
import { Button } from "@/components/ui/button";
import type { HypothesisCard } from "@/lib/brenner-loop/hypothesis";
import type { ComparisonMatrix, HypothesisArena } from "@/lib/brenner-loop/hypothesis-arena";
import { buildComparisonMatrix } from "@/lib/brenner-loop/hypothesis-arena";
import { cn } from "@/lib/utils";
import { HypothesisDiff } from "./HypothesisDiff";
import { PredictionMatrix } from "./PredictionMatrix";

export interface ComparisonViewProps {
  hypothesisA: HypothesisCard;
  hypothesisB: HypothesisCard;
  arena?: HypothesisArena;
  matrix?: ComparisonMatrix;
  readonly?: boolean;
  onExit?: () => void;
  onDesignTest?: (hypothesisIds: [string, string]) => void;
  onResolve?: (winnerId: string, loserId: string) => void;
  className?: string;
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value < 40 ? "bg-orange-500" : value < 70 ? "bg-yellow-500" : "bg-emerald-500";

  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div
        className={cn("h-2 rounded-full", color)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function HypothesisSummary({ label, hypothesis }: { label: string; hypothesis: HypothesisCard }) {
  const keyPrediction = hypothesis.predictionsIfTrue[0] ?? "";

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-foreground">{hypothesis.statement}</div>
      <div className="mt-3 text-xs text-muted-foreground">Mechanism</div>
      <div className="text-sm text-foreground">{hypothesis.mechanism}</div>
      <div className="mt-3 text-xs text-muted-foreground">Key Prediction</div>
      <div className="text-sm text-foreground">{keyPrediction || "Not specified"}</div>
      <div className="mt-4 space-y-2">
        <div className="text-xs text-muted-foreground">Confidence</div>
        <ConfidenceBar value={hypothesis.confidence} />
        <div className="text-xs font-medium text-foreground">{hypothesis.confidence}%</div>
      </div>
    </div>
  );
}

export function ComparisonView({
  hypothesisA,
  hypothesisB,
  arena,
  matrix: matrixProp,
  readonly,
  onExit,
  onDesignTest,
  onResolve,
  className,
}: ComparisonViewProps) {
  const matrix = React.useMemo(() => {
    if (matrixProp) return matrixProp;
    if (arena) return buildComparisonMatrix(arena);
    return null;
  }, [matrixProp, arena]);

  const [winnerId, setWinnerId] = React.useState<string | null>(null);

  const handleResolve = () => {
    if (!winnerId || !onResolve) return;
    const loserId = winnerId === hypothesisA.id ? hypothesisB.id : hypothesisA.id;
    onResolve(winnerId, loserId);
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-foreground">Compare Hypotheses</div>
          <div className="text-sm text-muted-foreground">Side-by-side discriminating view</div>
        </div>
        {onExit && (
          <Button variant="outline" size="sm" onClick={onExit}>
            Exit Compare
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <HypothesisSummary label="Hypothesis A" hypothesis={hypothesisA} />
        <HypothesisSummary label="Hypothesis B" hypothesis={hypothesisB} />
      </div>

      <HypothesisDiff hypothesisA={hypothesisA} hypothesisB={hypothesisB} />

      {matrix ? (
        <PredictionMatrix
          matrix={matrix}
          hypothesisAId={hypothesisA.id}
          hypothesisBId={hypothesisB.id}
        />
      ) : (
        <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
          No comparison matrix provided yet. Add tests to see discriminating evidence.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">Resolve Competition</div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="winner"
                value={hypothesisA.id}
                disabled={readonly}
                checked={winnerId === hypothesisA.id}
                onChange={() => setWinnerId(hypothesisA.id)}
              />
              {hypothesisA.statement.slice(0, 40)}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="winner"
                value={hypothesisB.id}
                disabled={readonly}
                checked={winnerId === hypothesisB.id}
                onChange={() => setWinnerId(hypothesisB.id)}
              />
              {hypothesisB.statement.slice(0, 40)}
            </label>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {onDesignTest && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDesignTest([hypothesisA.id, hypothesisB.id])}
              disabled={readonly}
            >
              Design New Test
            </Button>
          )}
          {onResolve && (
            <Button size="sm" onClick={handleResolve} disabled={readonly || !winnerId}>
              Resolve Competition
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ComparisonView;
