"use client";

/**
 * AgentProgress Component
 *
 * Shows step-by-step progress for long-running agent tasks.
 *
 * @see brenner_bot-ik2s (bead)
 */

import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface AgentProgressProps {
  agent: string;
  steps: string[];
  currentStep: number;
  status?: "idle" | "working" | "complete" | "error";
  className?: string;
}

function stepIcon(state: "pending" | "active" | "complete") {
  if (state === "complete") {
    return <CheckCircle2 className="size-4 text-emerald-600" />;
  }
  if (state === "active") {
    return <Loader2 className="size-4 text-primary animate-spin" />;
  }
  return <Circle className="size-3 text-muted-foreground" />;
}

export function AgentProgress({
  agent,
  steps,
  currentStep,
  status = "working",
  className,
}: AgentProgressProps) {
  const normalizedStep = Math.max(0, Math.min(steps.length - 1, currentStep));
  const effectiveStep = status === "complete" ? steps.length : normalizedStep;
  const progress = steps.length > 0 ? Math.min(1, effectiveStep / steps.length) : 0;
  const statusLabel =
    status === "complete"
      ? "Complete"
      : status === "error"
        ? "Error"
        : status === "idle"
          ? "Idle"
          : "In progress";
  const headline =
    status === "complete"
      ? `${agent.replace(/_/g, " ")} completed`
      : status === "error"
        ? `${agent.replace(/_/g, " ")} hit an error`
        : status === "idle"
          ? `${agent.replace(/_/g, " ")} is idle`
          : `${agent.replace(/_/g, " ")} is working`;

  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-foreground">{headline}</div>
        <span className="text-xs text-muted-foreground">{statusLabel}</span>
      </div>

      <div className="mt-3 h-2 w-full rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <div className="mt-4 space-y-2">
        {steps.map((step, index) => {
          const state =
            index < effectiveStep ? "complete" : index === effectiveStep ? "active" : "pending";
          return (
            <div key={`${step}-${index}`} className="flex items-center gap-2 text-sm">
              {stepIcon(state)}
              <span
                className={cn(
                  "text-muted-foreground",
                  state === "active" && "text-foreground",
                  state === "complete" && "text-foreground",
                )}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AgentProgress;
