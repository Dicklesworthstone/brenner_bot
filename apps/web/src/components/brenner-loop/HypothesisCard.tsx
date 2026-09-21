"use client";

/**
 * HypothesisCard Component
 *
 * Primary UI component for displaying and interacting with hypothesis cards
 * in the Brenner Loop system.
 *
 * Features:
 * - Statement and mechanism display
 * - Confidence visualization with progress bar
 * - Collapsible discriminative structure
 * - Confounds display
 * - Edit, evolve, and history actions
 *
 * @see brenner_bot-an1n.3 (bead)
 * @see apps/web/src/lib/brenner-loop/hypothesis.ts
 */

import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type {
  HypothesisCard as HypothesisCardType,
  IdentifiedConfound,
} from "@/lib/brenner-loop/hypothesis";
import { calculateFalsifiabilityScore, interpretConfidence } from "@/lib/brenner-loop/hypothesis";
import { cn } from "@/lib/utils";

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

const ExclamationIcon = ({ className }: { className?: string }) => (
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
      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
    />
  </svg>
);

const PencilIcon = ({ className }: { className?: string }) => (
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
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
    />
  </svg>
);

const ArrowPathIcon = ({ className }: { className?: string }) => (
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
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
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
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// ============================================================================
// Types
// ============================================================================

export type HypothesisCardMode = "view" | "edit" | "compact";

export interface HypothesisCardProps {
  /** The hypothesis data to display */
  hypothesis: HypothesisCardType;

  /** Display mode */
  mode?: HypothesisCardMode;

  /** Callback when edit is requested (edit mode only) */
  onEdit?: (updates: Partial<HypothesisCardType>) => void;

  /** Callback when evolve is requested */
  onEvolve?: () => void;

  /** Callback when view history is requested */
  onViewHistory?: () => void;

  /** Whether to show confounds section */
  showConfounds?: boolean;

  /** Whether to show discriminative structure */
  showStructure?: boolean;

  /** Whether the card is selected */
  isSelected?: boolean;

  /** Callback when card is clicked */
  onClick?: () => void;

  /** Additional className */
  className?: string;
}

// ============================================================================
// Confidence Bar Component
// ============================================================================

interface ConfidenceBarProps {
  value: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

function ConfidenceBar({ value, size = "md", showLabel = true, className }: ConfidenceBarProps) {
  // Determine color based on confidence level
  const getColorClass = (confidence: number) => {
    if (confidence < 20) return "bg-red-500";
    if (confidence < 40) return "bg-orange-500";
    if (confidence < 60) return "bg-yellow-500";
    if (confidence < 80) return "bg-lime-500";
    return "bg-green-500";
  };

  const heightClass = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  }[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("flex-1 bg-muted rounded-full overflow-hidden", heightClass)}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn("h-full rounded-full", getColorClass(value))}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground min-w-[3ch] text-right">
          {value}%
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Discriminative Structure Section
// ============================================================================

interface DiscriminativeStructureProps {
  predictionsIfTrue: string[];
  predictionsIfFalse: string[];
  impossibleIfTrue: string[];
  defaultOpen?: boolean;
}

function DiscriminativeStructure({
  predictionsIfTrue,
  predictionsIfFalse,
  impossibleIfTrue,
  defaultOpen = false,
}: DiscriminativeStructureProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        showChevron={false}
        className="w-full py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Discriminative Structure</span>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDownIcon className="text-muted-foreground" />
          </motion.div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-3 pt-2 px-1">
          {/* Predictions if true */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[oklch(0.72_0.19_145)]">
              <CheckIcon className="size-3.5" />
              If True
            </div>
            <ul className="space-y-1 pl-5">
              {predictionsIfTrue.map((pred, i) => (
                <li key={i} className="text-sm text-muted-foreground list-disc">
                  {pred}
                </li>
              ))}
            </ul>
          </div>

          {/* Predictions if false */}
          {predictionsIfFalse.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-orange-500">
                <XMarkIcon className="size-3.5" />
                If False
              </div>
              <ul className="space-y-1 pl-5">
                {predictionsIfFalse.map((pred, i) => (
                  <li key={i} className="text-sm text-muted-foreground list-disc">
                    {pred}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Falsification conditions */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
              <ExclamationIcon className="size-3.5" />
              Would Falsify
            </div>
            <ul className="space-y-1 pl-5">
              {impossibleIfTrue.map((cond, i) => (
                <li key={i} className="text-sm text-muted-foreground list-disc">
                  {cond}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// Confounds Section
// ============================================================================

interface ConfoundsSectionProps {
  confounds: IdentifiedConfound[];
  defaultOpen?: boolean;
}

function ConfoundsSection({ confounds, defaultOpen = false }: ConfoundsSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  if (confounds.length === 0) {
    return <div className="text-xs text-muted-foreground italic py-2">No confounds identified</div>;
  }

  const unaddressedCount = confounds.filter((c) => !c.addressed).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        showChevron={false}
        className="w-full py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <ExclamationIcon className="size-4 text-amber-500" />
            <span className="font-medium">
              {confounds.length} Confound{confounds.length !== 1 ? "s" : ""}
            </span>
            {unaddressedCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                {unaddressedCount} unaddressed
              </span>
            )}
          </div>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDownIcon className="text-muted-foreground" />
          </motion.div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-2 pt-2 px-1">
          {confounds.map((confound) => (
            <div
              key={confound.id}
              className={cn(
                "p-2.5 rounded-lg border text-sm",
                confound.addressed
                  ? "border-[oklch(0.72_0.19_145/0.3)] bg-[oklch(0.72_0.19_145/0.05)]"
                  : "border-amber-500/30 bg-amber-500/5",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium">{confound.name}</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    {Math.round(confound.likelihood * 100)}%
                  </span>
                  {confound.addressed && (
                    <CheckIcon className="size-3.5 text-[oklch(0.72_0.19_145)]" />
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{confound.description}</p>
              {confound.addressed && confound.addressedHow && (
                <p className="text-xs text-[oklch(0.72_0.19_145)] mt-1">
                  Addressed: {confound.addressedHow}
                </p>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// Main HypothesisCard Component
// ============================================================================

export function HypothesisCard({
  hypothesis,
  mode = "view",
  onEdit,
  onEvolve,
  onViewHistory,
  showConfounds = true,
  showStructure = true,
  isSelected = false,
  onClick,
  className,
}: HypothesisCardProps) {
  // Extract version number from ID (e.g., HC-RS20260104-001-v3 -> 3)
  const versionMatch = hypothesis.id.match(/-v(\d+)$/);
  const versionNum = versionMatch ? parseInt(versionMatch[1], 10) : hypothesis.version;

  // Calculate quality metrics
  const falsifiabilityScore = calculateFalsifiabilityScore(hypothesis);
  const confidenceInterpretation = interpretConfidence(hypothesis.confidence);

  // Compact mode: minimal display
  if (mode === "compact") {
    return (
      <div
        onClick={onClick}
        className={cn(
          "group p-3 rounded-lg border bg-card transition-all cursor-pointer",
          isSelected
            ? "border-primary ring-2 ring-primary/20"
            : "border-border hover:border-primary/30 hover:shadow-sm",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground">H v{versionNum}</span>
              <ConfidenceBar
                value={hypothesis.confidence}
                size="sm"
                showLabel={false}
                className="flex-1 max-w-[60px]"
              />
              <span className="text-xs text-muted-foreground">{hypothesis.confidence}%</span>
            </div>
            <p className="text-sm font-medium line-clamp-2">{hypothesis.statement}</p>
          </div>
        </div>
      </div>
    );
  }

  // Full view/edit mode
  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden transition-all",
        isSelected
          ? "border-primary ring-2 ring-primary/20 shadow-lg"
          : "border-border hover:border-primary/30",
        className,
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-semibold text-primary">
              H<sub>{versionNum}</sub>
            </span>
            <span className="text-xs text-muted-foreground">(v{versionNum})</span>
            {hypothesis.parentVersion && (
              <span className="text-xs text-muted-foreground">
                from{" "}
                {hypothesis.parentVersion.split("-v")[1] &&
                  `v${hypothesis.parentVersion.split("-v")[1]}`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{confidenceInterpretation}</span>
            <span className="font-semibold text-sm">{hypothesis.confidence}%</span>
          </div>
        </div>
        <ConfidenceBar value={hypothesis.confidence} size="md" showLabel={false} className="mt-2" />
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Statement */}
        <div>
          <p className="text-base font-medium leading-relaxed">{hypothesis.statement}</p>
        </div>

        {/* Mechanism */}
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Mechanism
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{hypothesis.mechanism}</p>
        </div>

        {/* Domain tags */}
        {hypothesis.domain.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {hypothesis.domain.map((d, i) => (
              <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                {d}
              </span>
            ))}
          </div>
        )}

        {/* Discriminative Structure */}
        {showStructure && (
          <div className="border-t border-border pt-3">
            <DiscriminativeStructure
              predictionsIfTrue={hypothesis.predictionsIfTrue}
              predictionsIfFalse={hypothesis.predictionsIfFalse}
              impossibleIfTrue={hypothesis.impossibleIfTrue}
            />
          </div>
        )}

        {/* Confounds */}
        {showConfounds && (
          <div className="border-t border-border pt-3">
            <ConfoundsSection confounds={hypothesis.confounds} />
          </div>
        )}

        {/* Assumptions */}
        {hypothesis.assumptions.length > 0 && (
          <div className="border-t border-border pt-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Assumptions
            </div>
            <ul className="space-y-1">
              {hypothesis.assumptions.map((assumption, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-muted-foreground/50 mt-0.5">&bull;</span>
                  {assumption}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quality Metrics */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
          <div className="flex items-center gap-1">
            <span className="font-medium">Falsifiability:</span>
            <span>{falsifiabilityScore}/100</span>
          </div>
          {hypothesis.evolutionReason && (
            <div className="flex items-center gap-1" title={hypothesis.evolutionReason}>
              <ArrowPathIcon className="size-3" />
              <span className="truncate max-w-[200px]">{hypothesis.evolutionReason}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions Footer */}
      <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          <ClockIcon className="size-3 inline mr-1" />
          {new Date(hypothesis.updatedAt).toLocaleDateString()}
        </div>
        <div className="flex items-center gap-2">
          {onViewHistory && (
            <Button variant="ghost" size="sm" onClick={onViewHistory} className="text-xs">
              <ClockIcon className="size-3.5" />
              History
            </Button>
          )}
          {mode === "view" && onEdit && (
            <Button variant="ghost" size="sm" onClick={() => onEdit({})} className="text-xs">
              <PencilIcon className="size-3.5" />
              Edit
            </Button>
          )}
          {onEvolve && (
            <Button variant="outline" size="sm" onClick={onEvolve} className="text-xs">
              <ArrowPathIcon className="size-3.5" />
              Evolve
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HypothesisCard List Component
// ============================================================================

interface HypothesisCardListProps {
  hypotheses: HypothesisCardType[];
  mode?: HypothesisCardMode;
  selectedId?: string;
  onSelect?: (id: string) => void;
  onEdit?: (id: string, updates: Partial<HypothesisCardType>) => void;
  onEvolve?: (id: string) => void;
  onViewHistory?: (id: string) => void;
  className?: string;
}

export function HypothesisCardList({
  hypotheses,
  mode = "compact",
  selectedId,
  onSelect,
  onEdit,
  onEvolve,
  onViewHistory,
  className,
}: HypothesisCardListProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <AnimatePresence mode="popLayout">
        {hypotheses.map((hypothesis) => (
          <motion.div
            key={hypothesis.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <HypothesisCard
              hypothesis={hypothesis}
              mode={mode}
              isSelected={selectedId === hypothesis.id}
              onClick={() => onSelect?.(hypothesis.id)}
              onEdit={onEdit ? (updates) => onEdit(hypothesis.id, updates) : undefined}
              onEvolve={onEvolve ? () => onEvolve(hypothesis.id) : undefined}
              onViewHistory={onViewHistory ? () => onViewHistory(hypothesis.id) : undefined}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      {hypotheses.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">No hypotheses yet</div>
      )}
    </div>
  );
}

export default HypothesisCard;
