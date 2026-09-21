"use client";

/**
 * LevelSplitSession - Interactive Level Split (Σ) Operator Session
 *
 * Guides users through separating confounded levels in their hypothesis.
 *
 * Steps:
 * 1. Identify X Levels - Select applicable levels for the cause
 * 2. Identify Y Levels - Select applicable levels for the effect
 * 3. Review Matrix - Select which X-Y combinations to investigate
 * 4. Generate Sub-Hypotheses - Create focused hypotheses for each combination
 * 5. Choose Focus - Select which sub-hypothesis to pursue first
 *
 * @see brenner_bot-vw6p.2 (bead)
 * @module components/brenner-loop/operators/LevelSplitSession
 */

import { AnimatePresence, motion } from "framer-motion";
import { Check, Lightbulb, Plus, Target } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { useOperatorSession } from "@/hooks/useOperatorSession";
import type { HypothesisCard } from "@/lib/brenner-loop/hypothesis";
import type {
  Level,
  LevelCombination,
  LevelSplitResult,
  SubHypothesis,
} from "@/lib/brenner-loop/operators/level-split";
import {
  generateCombinationMatrix,
  generateSubHypothesis,
  generateXLevels,
  generateYLevels,
  LEVEL_SPLIT_FALLBACK_QUOTES,
  LEVEL_SPLIT_STEP_IDS,
  LEVEL_SPLIT_STEPS,
} from "@/lib/brenner-loop/operators/level-split";
import type { Quote } from "@/lib/quotebank-parser";
import { cn } from "@/lib/utils";
import { OperatorShell } from "./OperatorShell";

// ============================================================================
// Types
// ============================================================================

export interface LevelSplitSessionProps {
  /** The hypothesis to apply Level Split to */
  hypothesis: HypothesisCard;
  /** Brenner quotes for this operator (optional) */
  quotes?: Quote[];
  /** Callback when session completes */
  onComplete?: (result: LevelSplitResult) => void;
  /** Callback when session is abandoned */
  onAbandon?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Step Components
// ============================================================================

/**
 * Level selection checklist component
 */
interface LevelChecklistProps {
  levels: Level[];
  onToggle: (levelId: string) => void;
  title: string;
  description: string;
}

function LevelChecklist({ levels, onToggle, title, description }: LevelChecklistProps) {
  // Group levels by category
  const groupedLevels = React.useMemo(() => {
    const groups: Record<string, Level[]> = {};
    for (const level of levels) {
      if (!groups[level.category]) {
        groups[level.category] = [];
      }
      groups[level.category].push(level);
    }
    return groups;
  }, [levels]);

  const categoryLabels: Record<string, string> = {
    temporal: "Temporal",
    measurement: "Measurement",
    population: "Population",
    mechanism: "Mechanism",
    implementation: "Implementation",
    scale: "Scale",
    other: "Other",
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-start gap-3">
          <Lightbulb className="size-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-sm">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
      </div>

      {Object.entries(groupedLevels).map(([category, categoryLevels]) => (
        <div key={category} className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {categoryLabels[category] ?? category}
          </h4>
          <div className="space-y-2">
            {categoryLevels.map((level) => (
              <motion.button
                key={level.id}
                type="button"
                onClick={() => onToggle(level.id)}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                  "hover:border-primary/50 hover:bg-muted/30",
                  level.selected ? "border-primary bg-primary/5" : "border-border bg-card",
                )}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className={cn(
                    "flex items-center justify-center size-5 rounded border flex-shrink-0 mt-0.5 transition-colors",
                    level.selected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/30",
                  )}
                >
                  {level.selected && <Check className="size-3" strokeWidth={3} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{level.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{level.description}</div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Matrix visualization for level combinations
 */
interface CombinationMatrixProps {
  combinations: LevelCombination[];
  onToggle: (xLevelId: string, yLevelId: string) => void;
}

function CombinationMatrix({ combinations, onToggle }: CombinationMatrixProps) {
  // Get unique X and Y levels
  const xLevels = React.useMemo(() => {
    const seen = new Set<string>();
    return combinations
      .map((c) => c.xLevel)
      .filter((l) => {
        if (seen.has(l.id)) return false;
        seen.add(l.id);
        return true;
      });
  }, [combinations]);

  const yLevels = React.useMemo(() => {
    const seen = new Set<string>();
    return combinations
      .map((c) => c.yLevel)
      .filter((l) => {
        if (seen.has(l.id)) return false;
        seen.add(l.id);
        return true;
      });
  }, [combinations]);

  // Build lookup map
  const combinationMap = React.useMemo(() => {
    const map = new Map<string, LevelCombination>();
    for (const c of combinations) {
      map.set(`${c.xLevel.id}-${c.yLevel.id}`, c);
    }
    return map;
  }, [combinations]);

  if (xLevels.length === 0 || yLevels.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No levels selected. Go back to select X and Y levels.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left text-xs font-medium text-muted-foreground uppercase">
              X / Y
            </th>
            {yLevels.map((y) => (
              <th key={y.id} className="p-2 text-center text-xs font-medium text-muted-foreground">
                <div className="max-w-[100px]">
                  <div className="truncate">{y.name}</div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {xLevels.map((x) => (
            <tr key={x.id}>
              <td className="p-2 text-sm font-medium border-t border-border">
                <div className="max-w-[120px]">
                  <div className="truncate">{x.name}</div>
                </div>
              </td>
              {yLevels.map((y) => {
                const combination = combinationMap.get(`${x.id}-${y.id}`);
                const isSelected = combination?.selected ?? false;

                return (
                  <td key={`${x.id}-${y.id}`} className="p-2 text-center border-t border-border">
                    <motion.button
                      type="button"
                      onClick={() => onToggle(x.id, y.id)}
                      className={cn(
                        "size-8 rounded-lg border flex items-center justify-center mx-auto transition-all",
                        "hover:border-primary/50",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border bg-muted/30 hover:bg-muted/50",
                      )}
                      whileTap={{ scale: 0.9 }}
                    >
                      {isSelected ? (
                        <Check className="size-4" strokeWidth={2.5} />
                      ) : (
                        <Plus className="size-4 text-muted-foreground" />
                      )}
                    </motion.button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="size-4 rounded border border-primary bg-primary" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded border border-border bg-muted/30" />
          <span>Not selected</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Sub-hypothesis list component
 */
interface SubHypothesisListProps {
  subHypotheses: SubHypothesis[];
  focusedId: string | null;
  onSelectFocus: (id: string) => void;
  isSelectable?: boolean;
}

function SubHypothesisList({
  subHypotheses,
  focusedId,
  onSelectFocus,
  isSelectable = false,
}: SubHypothesisListProps) {
  if (subHypotheses.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">No sub-hypotheses generated yet.</div>
    );
  }

  return (
    <div className="space-y-3">
      {subHypotheses.map((sub, index) => {
        const isFocused = sub.id === focusedId;

        return (
          <motion.div
            key={sub.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "p-4 rounded-lg border transition-all",
              isFocused
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border bg-card hover:border-primary/30",
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex items-center justify-center size-8 rounded-full flex-shrink-0 text-sm font-bold",
                  isFocused
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                H<sub>{index + 1}</sub>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed">{sub.statement}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <span>X: {sub.xLevelId}</span>
                  <span>&rarr;</span>
                  <span>Y: {sub.yLevelId}</span>
                </div>
              </div>

              {isSelectable && (
                <Button
                  variant={isFocused ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSelectFocus(sub.id)}
                  className="flex-shrink-0"
                >
                  {isFocused ? (
                    <>
                      <Target className="size-4 mr-1" />
                      Focused
                    </>
                  ) : (
                    "Focus"
                  )}
                </Button>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Session Component
// ============================================================================

export function LevelSplitSession({
  hypothesis,
  quotes,
  onComplete,
  onAbandon,
  className,
}: LevelSplitSessionProps) {
  // Initialize the session
  const {
    session,
    currentStepConfig,
    canNext,
    canPrev,
    canSkip,
    validation,
    next,
    prev,
    skip,
    goToStep,
    setContent,
    getContent,
    setSelection,
    getSelection,
    complete,
    abandon,
  } = useOperatorSession<LevelSplitResult>({
    operatorType: "level_split",
    hypothesis,
    stepConfigs: LEVEL_SPLIT_STEPS,
    onComplete: (session) => {
      if (onComplete && session.result) {
        onComplete(session.result);
      }
    },
    onAbandon: () => {
      onAbandon?.();
    },
  });

  // Initialize X levels on first render
  React.useEffect(() => {
    const existingXLevels = getSelection<Level[]>(LEVEL_SPLIT_STEP_IDS.IDENTIFY_X);
    if (!existingXLevels) {
      const xLevels = generateXLevels(hypothesis);
      setSelection(LEVEL_SPLIT_STEP_IDS.IDENTIFY_X, xLevels);
    }
  }, [hypothesis, getSelection, setSelection]);

  // Initialize Y levels on first render
  React.useEffect(() => {
    const existingYLevels = getSelection<Level[]>(LEVEL_SPLIT_STEP_IDS.IDENTIFY_Y);
    if (!existingYLevels) {
      const yLevels = generateYLevels(hypothesis);
      setSelection(LEVEL_SPLIT_STEP_IDS.IDENTIFY_Y, yLevels);
    }
  }, [hypothesis, getSelection, setSelection]);

  // Get current state with stable references
  const xLevelsRaw = getSelection<Level[]>(LEVEL_SPLIT_STEP_IDS.IDENTIFY_X);
  const xLevels = React.useMemo(() => xLevelsRaw ?? [], [xLevelsRaw]);

  const yLevelsRaw = getSelection<Level[]>(LEVEL_SPLIT_STEP_IDS.IDENTIFY_Y);
  const yLevels = React.useMemo(() => yLevelsRaw ?? [], [yLevelsRaw]);

  const combinationsRaw = getSelection<LevelCombination[]>(LEVEL_SPLIT_STEP_IDS.REVIEW_MATRIX);
  const combinations = React.useMemo(() => combinationsRaw ?? [], [combinationsRaw]);

  const subHypothesesRaw = getContent<SubHypothesis[]>(LEVEL_SPLIT_STEP_IDS.GENERATE_SUB);
  const subHypotheses = React.useMemo(() => subHypothesesRaw ?? [], [subHypothesesRaw]);

  const focusedId = getSelection<string>(LEVEL_SPLIT_STEP_IDS.CHOOSE_FOCUS) ?? null;

  // Toggle X level selection
  const toggleXLevel = React.useCallback(
    (levelId: string) => {
      const updated = xLevels.map((l) => (l.id === levelId ? { ...l, selected: !l.selected } : l));
      setSelection(LEVEL_SPLIT_STEP_IDS.IDENTIFY_X, updated);
    },
    [xLevels, setSelection],
  );

  // Toggle Y level selection
  const toggleYLevel = React.useCallback(
    (levelId: string) => {
      const updated = yLevels.map((l) => (l.id === levelId ? { ...l, selected: !l.selected } : l));
      setSelection(LEVEL_SPLIT_STEP_IDS.IDENTIFY_Y, updated);
    },
    [yLevels, setSelection],
  );

  // Generate combinations when entering matrix step
  React.useEffect(() => {
    if (currentStepConfig?.id === LEVEL_SPLIT_STEP_IDS.REVIEW_MATRIX) {
      const existingCombinations = getSelection<LevelCombination[]>(
        LEVEL_SPLIT_STEP_IDS.REVIEW_MATRIX,
      );
      if (!existingCombinations || existingCombinations.length === 0) {
        const newCombinations = generateCombinationMatrix(xLevels, yLevels);
        setSelection(LEVEL_SPLIT_STEP_IDS.REVIEW_MATRIX, newCombinations);
      }
    }
  }, [currentStepConfig?.id, xLevels, yLevels, getSelection, setSelection]);

  // Toggle combination selection
  const toggleCombination = React.useCallback(
    (xLevelId: string, yLevelId: string) => {
      const updated = combinations.map((c) =>
        c.xLevel.id === xLevelId && c.yLevel.id === yLevelId ? { ...c, selected: !c.selected } : c,
      );
      setSelection(LEVEL_SPLIT_STEP_IDS.REVIEW_MATRIX, updated);
    },
    [combinations, setSelection],
  );

  // Generate sub-hypotheses when entering that step
  React.useEffect(() => {
    if (currentStepConfig?.id === LEVEL_SPLIT_STEP_IDS.GENERATE_SUB) {
      const selectedCombinations = combinations.filter((c) => c.selected);
      const existingSubs = getContent<SubHypothesis[]>(LEVEL_SPLIT_STEP_IDS.GENERATE_SUB);
      if (!existingSubs || existingSubs.length !== selectedCombinations.length) {
        const newSubs = selectedCombinations.map((c) => generateSubHypothesis(hypothesis, c));
        setContent(LEVEL_SPLIT_STEP_IDS.GENERATE_SUB, newSubs);
      }
    }
  }, [currentStepConfig?.id, combinations, hypothesis, getContent, setContent]);

  // Set focus
  const setFocus = React.useCallback(
    (id: string) => {
      setSelection(LEVEL_SPLIT_STEP_IDS.CHOOSE_FOCUS, id);
    },
    [setSelection],
  );

  // Handle completion
  const handleComplete = React.useCallback(() => {
    const result: LevelSplitResult = {
      xLevels: xLevels.filter((l) => l.selected),
      yLevels: yLevels.filter((l) => l.selected),
      selectedCombinations: combinations.filter((c) => c.selected),
      subHypotheses,
      focusedHypothesisId: focusedId,
    };
    complete(result);
  }, [xLevels, yLevels, combinations, subHypotheses, focusedId, complete]);

  // Render step content based on current step
  const renderStepContent = () => {
    switch (currentStepConfig?.id) {
      case LEVEL_SPLIT_STEP_IDS.IDENTIFY_X:
        return (
          <LevelChecklist
            levels={xLevels}
            onToggle={toggleXLevel}
            title="What could X refer to?"
            description={`Your hypothesis involves "${hypothesis.statement.split(" ").slice(0, 5).join(" ")}..." - which levels of X are relevant?`}
          />
        );

      case LEVEL_SPLIT_STEP_IDS.IDENTIFY_Y:
        return (
          <LevelChecklist
            levels={yLevels}
            onToggle={toggleYLevel}
            title="What could Y refer to?"
            description="Now consider the outcome - which levels are you measuring?"
          />
        );

      case LEVEL_SPLIT_STEP_IDS.REVIEW_MATRIX:
        return (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground">
                Select which X→Y combinations you&apos;re actually investigating. Not every
                combination may be relevant to your study.
              </p>
            </div>
            <CombinationMatrix combinations={combinations} onToggle={toggleCombination} />
          </div>
        );

      case LEVEL_SPLIT_STEP_IDS.GENERATE_SUB:
        return (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-3">
                <Lightbulb className="size-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Sub-Hypotheses Generated</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Each selected combination becomes a distinct, testable hypothesis.
                  </p>
                </div>
              </div>
            </div>
            <SubHypothesisList
              subHypotheses={subHypotheses}
              focusedId={null}
              onSelectFocus={() => {}}
              isSelectable={false}
            />
          </div>
        );

      case LEVEL_SPLIT_STEP_IDS.CHOOSE_FOCUS:
        return (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-start gap-3">
                <Target className="size-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Choose Your Focus</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Which sub-hypothesis will you pursue first? Select the one that is most
                    tractable and most likely to provide discriminative information.
                  </p>
                </div>
              </div>
            </div>
            <SubHypothesisList
              subHypotheses={subHypotheses}
              focusedId={focusedId}
              onSelectFocus={setFocus}
              isSelectable
            />
          </div>
        );

      default:
        return <div className="p-8 text-center text-muted-foreground">Unknown step</div>;
    }
  };

  // Use quotes or fallback
  const displayQuotes = quotes && quotes.length > 0 ? quotes : LEVEL_SPLIT_FALLBACK_QUOTES;

  return (
    <OperatorShell
      operatorType="level_split"
      currentStepIndex={session.currentStepIndex}
      steps={session.steps}
      onPrev={prev}
      onNext={next}
      onSkip={skip}
      onStepClick={goToStep}
      canPrev={canPrev}
      canNext={canNext}
      canSkip={canSkip}
      validation={validation}
      brennerQuotes={displayQuotes}
      onAbandon={abandon}
      onComplete={handleComplete}
      className={className}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepConfig?.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderStepContent()}
        </motion.div>
      </AnimatePresence>
    </OperatorShell>
  );
}

export default LevelSplitSession;
