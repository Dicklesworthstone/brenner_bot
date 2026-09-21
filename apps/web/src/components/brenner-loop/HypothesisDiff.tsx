"use client";

/**
 * HypothesisDiff Component
 *
 * Displays field-by-field differences between two hypotheses.
 *
 * @see brenner_bot-y8px (bead)
 */

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { buildComparisonResults, type ComparisonField } from "@/lib/brenner-loop/comparison";
import type { HypothesisCard } from "@/lib/brenner-loop/hypothesis";
import { cn } from "@/lib/utils";

export interface HypothesisDiffProps {
  hypothesisA: HypothesisCard;
  hypothesisB: HypothesisCard;
  fields?: ComparisonField[];
  className?: string;
}

function SimilarityBadge({ similarity }: { similarity: number }) {
  const percent = Math.round(similarity * 100);
  const variant = similarity >= 0.75 ? "default" : similarity >= 0.4 ? "secondary" : "destructive";

  return (
    <Badge variant={variant} className="text-[11px]">
      {percent}% similar
    </Badge>
  );
}

function renderValue(value: string) {
  if (!value.trim()) {
    return <span className="text-xs text-muted-foreground">Not provided</span>;
  }

  const lines = value.split("\n").filter(Boolean);
  if (lines.length <= 1) {
    return <span className="text-sm text-foreground leading-relaxed">{value}</span>;
  }

  return (
    <ul className="space-y-1 text-sm text-foreground">
      {lines.map((line, index) => (
        <li key={`${line}-${index}`} className="flex gap-2">
          <span className="text-muted-foreground">•</span>
          <span>{line}</span>
        </li>
      ))}
    </ul>
  );
}

export function HypothesisDiff({
  hypothesisA,
  hypothesisB,
  fields,
  className,
}: HypothesisDiffProps) {
  const results = React.useMemo(
    () => buildComparisonResults(hypothesisA, hypothesisB, fields),
    [hypothesisA, hypothesisB, fields],
  );

  return (
    <div className={cn("space-y-4", className)}>
      {results.map((result) => (
        <div
          key={result.field}
          className={cn(
            "rounded-xl border bg-card shadow-sm",
            result.isConflicting && "border-orange-500/40",
          )}
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="text-sm font-semibold text-foreground">{result.label}</div>
            <SimilarityBadge similarity={result.similarity} />
          </div>
          <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Hypothesis A
              </div>
              {renderValue(result.valueA)}
            </div>
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Hypothesis B
              </div>
              {renderValue(result.valueB)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default HypothesisDiff;
