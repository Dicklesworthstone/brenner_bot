"use client";

import { motion } from "framer-motion";
import * as React from "react";
import {
  getPhaseName,
  getPhaseSymbol,
  getSessionProgress,
  PHASE_ORDER,
  type SessionPhase,
} from "@/lib/brenner-loop";
import { cn } from "@/lib/utils";

export interface PhaseTimelineProps {
  phases?: SessionPhase[];
  currentPhase: SessionPhase;
  completedPhases: SessionPhase[];
  availablePhases: SessionPhase[];
  skippedPhases: SessionPhase[];
  onPhaseClick: (phase: SessionPhase) => void;
  className?: string;
}

type PhaseStatus = "complete" | "current" | "available" | "locked" | "skipped";

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

const LockClosedIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-3", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
    />
  </svg>
);

function getPhaseStatus(params: {
  phase: SessionPhase;
  currentPhase: SessionPhase;
  completed: Set<SessionPhase>;
  available: Set<SessionPhase>;
  skipped: Set<SessionPhase>;
}): PhaseStatus {
  const { phase, currentPhase, completed, available, skipped } = params;
  if (skipped.has(phase)) return "skipped";
  if (phase === currentPhase) return "current";
  if (completed.has(phase)) return "complete";
  if (available.has(phase)) return "available";
  return "locked";
}

function getShortLabel(phase: SessionPhase): string {
  const labels: Record<SessionPhase, string> = {
    intake: "Intake",
    sharpening: "Sharpen",
    level_split: "⊘ Split",
    exclusion_test: "✂ Exclude",
    object_transpose: "⟂ Transpose",
    scale_check: "⊞ Scale",
    agent_dispatch: "Agents",
    synthesis: "Synthesis",
    evidence_gathering: "Evidence",
    revision: "Revise",
    complete: "Done",
  };
  return labels[phase] ?? phase;
}

export function PhaseTimeline({
  phases,
  currentPhase,
  completedPhases,
  availablePhases,
  skippedPhases,
  onPhaseClick,
  className,
}: PhaseTimelineProps) {
  const phaseOrder = phases?.length ? phases : PHASE_ORDER;

  const completed = React.useMemo(() => new Set(completedPhases), [completedPhases]);
  const available = React.useMemo(() => new Set(availablePhases), [availablePhases]);
  const skipped = React.useMemo(() => new Set(skippedPhases), [skippedPhases]);

  const isClickable = React.useCallback(
    (phase: SessionPhase) => {
      if (skipped.has(phase)) return false;
      if (phase === currentPhase) return false;
      return available.has(phase);
    },
    [available, skipped, currentPhase],
  );

  const focusablePhases = React.useMemo(() => {
    return phaseOrder.filter((phase) => phase === currentPhase || isClickable(phase));
  }, [phaseOrder, currentPhase, isClickable]);

  const buttonRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const [focusedPhase, setFocusedPhase] = React.useState<SessionPhase>(() => {
    const fallback = focusablePhases[0] ?? currentPhase;
    return focusablePhases.includes(currentPhase) ? currentPhase : fallback;
  });

  React.useEffect(() => {
    setFocusedPhase(currentPhase);
  }, [currentPhase]);

  const moveFocus = React.useCallback(
    (direction: -1 | 1) => {
      if (focusablePhases.length === 0) return;
      const currentIndex = Math.max(0, focusablePhases.indexOf(focusedPhase));
      const nextIndex =
        (currentIndex + direction + focusablePhases.length) % focusablePhases.length;
      const nextPhase = focusablePhases[nextIndex] ?? focusablePhases[0] ?? currentPhase;
      setFocusedPhase(nextPhase);
      buttonRefs.current[nextPhase]?.focus();
    },
    [focusablePhases, focusedPhase, currentPhase],
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, phase: SessionPhase) => {
      const { key } = event;

      if (key === "ArrowRight" || key === "ArrowDown") {
        event.preventDefault();
        moveFocus(1);
        return;
      }

      if (key === "ArrowLeft" || key === "ArrowUp") {
        event.preventDefault();
        moveFocus(-1);
        return;
      }

      if (key === "Home") {
        event.preventDefault();
        const first = focusablePhases[0];
        if (!first) return;
        setFocusedPhase(first);
        buttonRefs.current[first]?.focus();
        return;
      }

      if (key === "End") {
        event.preventDefault();
        const last = focusablePhases.at(-1);
        if (!last) return;
        setFocusedPhase(last);
        buttonRefs.current[last]?.focus();
        return;
      }

      if (key === "Enter" || key === " ") {
        if (!isClickable(phase)) return;
        event.preventDefault();
        onPhaseClick(phase);
        return;
      }
    },
    [focusablePhases, isClickable, moveFocus, onPhaseClick],
  );

  return (
    <div className={cn("w-full", className)}>
      <div className="relative h-1 bg-muted rounded-full mb-4 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${getSessionProgress(currentPhase)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start sm:gap-1">
        {phaseOrder.map((phase, index) => {
          const status = getPhaseStatus({
            phase,
            currentPhase,
            completed,
            available,
            skipped,
          });

          const clickable = isClickable(phase);
          const disabled = status === "locked" || status === "skipped";
          const focusable = phase === currentPhase || clickable;
          const symbol = getPhaseSymbol(phase);
          const label = getShortLabel(phase);
          const fullName = getPhaseName(phase);

          return (
            <div
              key={phase}
              className="flex items-center gap-3 sm:flex-col sm:items-center sm:flex-1 sm:min-w-0"
            >
              <button
                ref={(el) => {
                  buttonRefs.current[phase] = el;
                }}
                type="button"
                onFocus={() => setFocusedPhase(phase)}
                onKeyDown={(event) => handleKeyDown(event, phase)}
                onClick={() => clickable && onPhaseClick(phase)}
                disabled={disabled}
                tabIndex={focusable && focusedPhase === phase ? 0 : -1}
                aria-label={fullName}
                aria-current={status === "current" ? "step" : undefined}
                className={cn(
                  "relative size-9 sm:size-8 rounded-full flex items-center justify-center transition-all cursor-default",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  status === "complete" && "bg-emerald-500 text-emerald-950 dark:text-emerald-50",
                  status === "current" &&
                    "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
                  status === "available" &&
                    "bg-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/30 cursor-pointer",
                  status === "locked" && "bg-muted text-muted-foreground/50 cursor-not-allowed",
                  status === "skipped" && "bg-muted text-muted-foreground/50",
                )}
                title={fullName}
              >
                {status === "complete" ? (
                  <CheckIcon />
                ) : status === "locked" ? (
                  <LockClosedIcon />
                ) : symbol ? (
                  <span className="text-xs font-bold">{symbol}</span>
                ) : (
                  <span className="text-xs font-medium">{index + 1}</span>
                )}
              </button>

              <span
                className={cn(
                  "text-sm sm:text-xs sm:text-center sm:truncate sm:w-full",
                  status === "current" && "font-semibold text-foreground",
                  (status === "complete" || status === "available") && "text-muted-foreground",
                  status === "locked" && "text-muted-foreground/50",
                  status === "skipped" && "text-muted-foreground/50 line-through",
                )}
              >
                <span className="sm:hidden">{fullName}</span>
                <span className="hidden sm:inline">{label}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
