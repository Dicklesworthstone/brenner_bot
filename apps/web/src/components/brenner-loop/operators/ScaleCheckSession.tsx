"use client";

/**
 * ScaleCheckSession - Interactive Scale Check (⊙) Operator Session
 *
 * Guides users through considering effect sizes, measurement precision,
 * and the distinction between statistical and practical significance.
 *
 * Steps:
 * 1. Quantify the Effect - Specify effect size or magnitude estimate
 * 2. Contextualize the Scale - Compare to domain norms
 * 3. Measurement Precision - Assess detectability
 * 4. Practical Significance - Is the effect meaningful?
 * 5. Population vs Individual - Consider heterogeneity
 *
 * @see brenner_bot-vw6p.5 (bead)
 * @module components/brenner-loop/operators/ScaleCheckSession
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Calculator,
  Check,
  Lightbulb,
  Minus,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { useOperatorSession } from "@/hooks/useOperatorSession";
import type { HypothesisCard } from "@/lib/brenner-loop/hypothesis";
import type {
  ContextComparison,
  EffectDirection,
  EffectMagnitude,
  EffectSizeSpec,
  EffectSizeType,
  MeasurementAssessment,
  PopulationConsideration,
  PracticalSignificance,
  ScaleCheckResult,
} from "@/lib/brenner-loop/operators/scale-check";
import {
  approximateSampleSize,
  EFFECT_SIZE_CONVENTIONS,
  generateContextComparison,
  generatePopulationConsiderations,
  getDomainContext,
  SCALE_CHECK_FALLBACK_QUOTES,
  SCALE_CHECK_STEP_IDS,
  SCALE_CHECK_STEPS,
} from "@/lib/brenner-loop/operators/scale-check";
import type { Quote } from "@/lib/quotebank-parser";
import { cn } from "@/lib/utils";
import { OperatorShell } from "./OperatorShell";

// ============================================================================
// Types
// ============================================================================

export interface ScaleCheckSessionProps {
  /** The hypothesis to apply Scale Check to */
  hypothesis: HypothesisCard;
  /** Brenner quotes for this operator (optional) */
  quotes?: Quote[];
  /** Callback when session completes */
  onComplete?: (result: ScaleCheckResult) => void;
  /** Callback when session is abandoned */
  onAbandon?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Step 1: Quantify Effect Component
// ============================================================================

interface QuantifyEffectProps {
  effectSize: EffectSizeSpec | null;
  onChange: (spec: EffectSizeSpec) => void;
}

function QuantifyEffect({ effectSize, onChange }: QuantifyEffectProps) {
  const [useEstimate, setUseEstimate] = React.useState(true);

  const effectTypes: { value: EffectSizeType; label: string; description: string }[] = [
    { value: "r", label: "Correlation (r)", description: "-1 to +1" },
    { value: "d", label: "Cohen's d", description: "Standardized mean difference" },
    { value: "OR", label: "Odds Ratio", description: "For binary outcomes" },
    { value: "percentage", label: "Percentage", description: "% change" },
  ];

  const magnitudes: { value: EffectMagnitude; label: string; color: string }[] = [
    { value: "negligible", label: "Negligible", color: "bg-gray-200 dark:bg-gray-700" },
    { value: "small", label: "Small", color: "bg-blue-200 dark:bg-blue-800" },
    { value: "medium", label: "Medium", color: "bg-yellow-200 dark:bg-yellow-800" },
    { value: "large", label: "Large", color: "bg-orange-200 dark:bg-orange-800" },
    { value: "very_large", label: "Very Large", color: "bg-red-200 dark:bg-red-800" },
  ];

  const directions: { value: EffectDirection; label: string; icon: React.ReactNode }[] = [
    { value: "increase", label: "Increase", icon: <TrendingUp className="size-4" /> },
    { value: "decrease", label: "Decrease", icon: <TrendingDown className="size-4" /> },
    { value: "change", label: "Change (either)", icon: <Minus className="size-4" /> },
  ];

  const currentType = effectSize?.type ?? "d";
  const currentEstimate = effectSize?.estimate ?? "medium";
  const currentDirection = effectSize?.direction ?? "change";
  const currentValue = effectSize?.value;

  const handleTypeChange = (type: EffectSizeType) => {
    onChange({
      type,
      estimate: useEstimate ? currentEstimate : undefined,
      value: useEstimate ? undefined : currentValue,
      direction: currentDirection,
    });
  };

  const handleEstimateChange = (estimate: EffectMagnitude) => {
    onChange({
      type: currentType,
      estimate,
      direction: currentDirection,
    });
  };

  const handleValueChange = (value: number) => {
    onChange({
      type: currentType,
      value,
      direction: currentDirection,
    });
  };

  const handleDirectionChange = (direction: EffectDirection) => {
    onChange({
      type: effectSize?.type ?? "d",
      estimate: effectSize?.estimate,
      value: effectSize?.value,
      direction,
    });
  };

  return (
    <div className="space-y-6">
      {/* Tip box */}
      <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
        <div className="flex items-start gap-3">
          <Scale className="size-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-sm text-orange-800 dark:text-orange-200">
              Quantify Your Claim
            </h3>
            <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
              Most hypotheses are vague about effect magnitude. Even a rough estimate helps assess
              plausibility and guides experimental design.
            </p>
          </div>
        </div>
      </div>

      {/* Input mode toggle */}
      <div className="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setUseEstimate(true)}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-all",
            useEstimate
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Estimate
        </button>
        <button
          type="button"
          onClick={() => setUseEstimate(false)}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-md transition-all",
            !useEstimate
              ? "bg-background shadow text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Precise Value
        </button>
      </div>

      {/* Effect type selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Effect Size Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {effectTypes.map((type) => (
            <motion.button
              key={type.value}
              type="button"
              onClick={() => handleTypeChange(type.value)}
              className={cn(
                "flex flex-col items-start p-3 rounded-lg border text-left transition-all",
                "hover:border-primary/50",
                currentType === type.value
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border bg-card",
              )}
              whileTap={{ scale: 0.98 }}
            >
              <span className="font-medium text-sm">{type.label}</span>
              <span className="text-xs text-muted-foreground">{type.description}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Magnitude or Value */}
      {useEstimate ? (
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Estimated Magnitude
          </label>
          <div className="flex flex-wrap gap-2">
            {magnitudes.map((mag) => (
              <motion.button
                key={mag.value}
                type="button"
                onClick={() => handleEstimateChange(mag.value)}
                className={cn(
                  "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                  "hover:border-primary/50",
                  currentEstimate === mag.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card",
                )}
                whileTap={{ scale: 0.95 }}
              >
                {mag.label}
              </motion.button>
            ))}
          </div>

          {/* Show what this means */}
          {currentEstimate && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 rounded-lg bg-muted/50 border border-border"
            >
              <p className="text-sm text-muted-foreground">
                For <span className="font-medium">{currentType}</span>, &quot;{currentEstimate}
                &quot; means approximately{" "}
                <span className="font-mono font-medium">
                  {EFFECT_SIZE_CONVENTIONS[currentType][currentEstimate]}
                </span>
              </p>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Effect Size Value
          </label>
          <input
            type="number"
            step="0.01"
            value={currentValue ?? ""}
            onChange={(e) => handleValueChange(parseFloat(e.target.value) || 0)}
            placeholder={`Enter ${currentType} value`}
            className={cn(
              "w-full px-4 py-3 rounded-lg border bg-card text-foreground",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
            )}
          />
        </div>
      )}

      {/* Direction */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Direction of Effect
        </label>
        <div className="flex flex-wrap gap-2">
          {directions.map((dir) => (
            <motion.button
              key={dir.value}
              type="button"
              onClick={() => handleDirectionChange(dir.value)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                "hover:border-primary/50",
                currentDirection === dir.value
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card",
              )}
              whileTap={{ scale: 0.95 }}
            >
              {dir.icon}
              {dir.label}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Step 2: Context Comparison Component
// ============================================================================

interface ContextComparisonDisplayProps {
  effectSize: EffectSizeSpec;
  comparison: ContextComparison | null;
  domainName: string;
}

function ContextComparisonDisplay({
  effectSize,
  comparison,
  domainName,
}: ContextComparisonDisplayProps) {
  if (!comparison) {
    return (
      <div className="p-8 text-center text-muted-foreground">Generating context comparison...</div>
    );
  }

  const normLabels: Record<ContextComparison["relativeToNorm"], { label: string; color: string }> =
    {
      below_typical: {
        label: "Below Typical",
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      },
      typical: {
        label: "Typical",
        color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      },
      above_typical: {
        label: "Above Typical",
        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      },
      exceptional: {
        label: "Exceptional",
        color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      },
    };

  const norm = normLabels[comparison.relativeToNorm];

  return (
    <div className="space-y-6">
      {/* Overall rating */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">Your effect is:</span>
        <Badge className={cn("text-sm px-3 py-1", norm.color)}>{norm.label}</Badge>
        <span className="text-sm text-muted-foreground">for {domainName}</span>
      </div>

      {/* Variance explained (for correlations) */}
      {comparison.varianceExplained !== undefined && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-muted/50 border border-border"
        >
          <div className="flex items-start gap-3">
            <Calculator className="size-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Variance Explained</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your correlation of r = {effectSize.value?.toFixed(2) ?? "?"} explains{" "}
                <span className="font-mono font-medium text-foreground">
                  {comparison.varianceExplained.toFixed(1)}%
                </span>{" "}
                of the variance. The remaining{" "}
                <span className="font-mono">
                  {(100 - comparison.varianceExplained).toFixed(1)}%
                </span>{" "}
                is due to other factors.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Benchmarks */}
      {comparison.benchmarksWithComparisons.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Benchmark Comparisons
          </h4>
          <div className="space-y-2">
            {comparison.benchmarksWithComparisons.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
              >
                <span className="text-sm">{b.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{b.value}</span>
                  {b.comparison && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        b.comparison === "smaller" && "border-blue-500 text-blue-600",
                        b.comparison === "similar" && "border-green-500 text-green-600",
                        b.comparison === "larger" && "border-orange-500 text-orange-600",
                      )}
                    >
                      Your effect is {b.comparison}
                    </Badge>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {comparison.insights.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Insights
          </h4>
          {comparison.insights.map((insight, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-3 rounded-lg bg-primary/5 border border-primary/20"
            >
              <div className="flex items-start gap-2">
                <Lightbulb className="size-4 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{insight}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {comparison.warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Warnings
          </h4>
          {comparison.warnings.map((warning, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">{warning}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Step 3: Measurement Precision Component
// ============================================================================

interface MeasurementPrecisionProps {
  effectSize: EffectSizeSpec;
  assessment: MeasurementAssessment | null;
  onChange: (assessment: MeasurementAssessment) => void;
}

function MeasurementPrecision({ effectSize, assessment, onChange }: MeasurementPrecisionProps) {
  // Calculate suggested sample size
  const suggestedN = React.useMemo(() => {
    const value =
      effectSize.value ??
      (effectSize.estimate ? EFFECT_SIZE_CONVENTIONS[effectSize.type][effectSize.estimate] : 0.5);

    // Convert to d-like metric for sample size calculation
    let dEquivalent = value;
    if (effectSize.type === "r") {
      // Convert r to d: d = 2r / sqrt(1 - r^2)
      // Guard against division by zero when |r| >= 1
      const absValue = Math.abs(value);
      if (absValue >= 1) {
        dEquivalent = Infinity;
      } else {
        dEquivalent = (2 * value) / Math.sqrt(1 - value * value);
      }
    }

    return approximateSampleSize(Math.abs(dEquivalent));
  }, [effectSize]);

  const handleDetectableChange = (isDetectable: boolean | null) => {
    onChange({
      isDetectable,
      powerNotes: assessment?.powerNotes ?? "",
      requiredSampleSize: assessment?.requiredSampleSize,
      warnings: assessment?.warnings ?? [],
    });
  };

  const handleNotesChange = (powerNotes: string) => {
    onChange({
      isDetectable: assessment?.isDetectable ?? null,
      powerNotes,
      requiredSampleSize: suggestedN,
      warnings: assessment?.warnings ?? [],
    });
  };

  return (
    <div className="space-y-6">
      {/* Power calculation info */}
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-start gap-3">
          <Calculator className="size-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Sample Size Guidance</p>
            <p className="text-sm text-muted-foreground mt-1">
              To detect an effect of this size with 80% power, you would need approximately{" "}
              <span className="font-mono font-medium text-foreground">
                {suggestedN === Infinity ? "∞ (effect too small)" : `n ≈ ${suggestedN}`}
              </span>{" "}
              participants per group.
            </p>
          </div>
        </div>
      </div>

      {/* Detectability assessment */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Can you detect this effect?
        </label>
        <div className="flex flex-wrap gap-2">
          <motion.button
            type="button"
            onClick={() => handleDetectableChange(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
              "hover:border-primary/50",
              assessment?.isDetectable === true
                ? "border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                : "border-border bg-card",
            )}
            whileTap={{ scale: 0.95 }}
          >
            <Check className="size-4" />
            Yes, detectable
          </motion.button>
          <motion.button
            type="button"
            onClick={() => handleDetectableChange(false)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
              "hover:border-primary/50",
              assessment?.isDetectable === false
                ? "border-red-500 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
                : "border-border bg-card",
            )}
            whileTap={{ scale: 0.95 }}
          >
            <AlertTriangle className="size-4" />
            No, too small
          </motion.button>
          <motion.button
            type="button"
            onClick={() => handleDetectableChange(null)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
              "hover:border-primary/50",
              assessment?.isDetectable === null
                ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300"
                : "border-border bg-card",
            )}
            whileTap={{ scale: 0.95 }}
          >
            Uncertain
          </motion.button>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Measurement Considerations
        </label>
        <textarea
          value={assessment?.powerNotes ?? ""}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Describe your measurement precision, sample size, and any concerns about detectability..."
          rows={4}
          className={cn(
            "w-full px-4 py-3 rounded-lg border bg-card text-foreground resize-none",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
          )}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Step 4: Practical Significance Component
// ============================================================================

interface PracticalSignificanceInputProps {
  significance: PracticalSignificance | null;
  onChange: (significance: PracticalSignificance) => void;
}

function PracticalSignificanceInput({ significance, onChange }: PracticalSignificanceInputProps) {
  const handleMeaningfulChange = (isPracticallyMeaningful: boolean | null) => {
    onChange({
      isPracticallyMeaningful,
      stakeholders: significance?.stakeholders ?? [],
      reasoning: significance?.reasoning ?? "",
    });
  };

  const handleReasoningChange = (reasoning: string) => {
    onChange({
      isPracticallyMeaningful: significance?.isPracticallyMeaningful ?? null,
      stakeholders: significance?.stakeholders ?? [],
      reasoning,
    });
  };

  const handleStakeholderToggle = (stakeholder: string) => {
    const current = significance?.stakeholders ?? [];
    const updated = current.includes(stakeholder)
      ? current.filter((s) => s !== stakeholder)
      : [...current, stakeholder];
    onChange({
      isPracticallyMeaningful: significance?.isPracticallyMeaningful ?? null,
      stakeholders: updated,
      reasoning: significance?.reasoning ?? "",
    });
  };

  const stakeholderOptions = [
    "Researchers in this field",
    "Practitioners/clinicians",
    "Policy makers",
    "Individual users/patients",
    "Industry/businesses",
    "General public",
  ];

  return (
    <div className="space-y-6">
      {/* Question box */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-3">
          <Target className="size-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">The Practical Significance Test</p>
            <p className="text-sm text-muted-foreground mt-1">
              Statistical significance ≠ practical importance. A tiny effect can be
              &quot;significant&quot; with enough data but meaningless in practice.
            </p>
          </div>
        </div>
      </div>

      {/* Is it meaningful? */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Is this effect practically meaningful?
        </label>
        <div className="flex flex-wrap gap-2">
          <motion.button
            type="button"
            onClick={() => handleMeaningfulChange(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
              "hover:border-primary/50",
              significance?.isPracticallyMeaningful === true
                ? "border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                : "border-border bg-card",
            )}
            whileTap={{ scale: 0.95 }}
          >
            Yes, meaningful
          </motion.button>
          <motion.button
            type="button"
            onClick={() => handleMeaningfulChange(false)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
              "hover:border-primary/50",
              significance?.isPracticallyMeaningful === false
                ? "border-red-500 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
                : "border-border bg-card",
            )}
            whileTap={{ scale: 0.95 }}
          >
            No, too small
          </motion.button>
          <motion.button
            type="button"
            onClick={() => handleMeaningfulChange(null)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
              "hover:border-primary/50",
              significance?.isPracticallyMeaningful === null
                ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300"
                : "border-border bg-card",
            )}
            whileTap={{ scale: 0.95 }}
          >
            Uncertain
          </motion.button>
        </div>
      </div>

      {/* Stakeholders */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Who would care about this effect?
        </label>
        <div className="flex flex-wrap gap-2">
          {stakeholderOptions.map((stakeholder) => {
            const isSelected = significance?.stakeholders?.includes(stakeholder) ?? false;
            return (
              <motion.button
                key={stakeholder}
                type="button"
                onClick={() => handleStakeholderToggle(stakeholder)}
                className={cn(
                  "px-3 py-1.5 rounded-full border text-sm transition-all",
                  "hover:border-primary/50",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card",
                )}
                whileTap={{ scale: 0.95 }}
              >
                {stakeholder}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Reasoning */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Your Reasoning
        </label>
        <textarea
          value={significance?.reasoning ?? ""}
          onChange={(e) => handleReasoningChange(e.target.value)}
          placeholder="Explain why this effect size is or isn't practically meaningful. What decisions would change based on this effect? At what threshold would it become actionable?"
          rows={4}
          className={cn(
            "w-full px-4 py-3 rounded-lg border bg-card text-foreground resize-none",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
          )}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Step 5: Population Considerations Component
// ============================================================================

interface PopulationConsiderationsProps {
  considerations: PopulationConsideration[];
  onChange: (considerations: PopulationConsideration[]) => void;
}

function PopulationConsiderationsInput({
  considerations,
  onChange,
}: PopulationConsiderationsProps) {
  const handleToggle = (index: number) => {
    const updated = considerations.map((c, i) =>
      i === index ? { ...c, addressed: !c.addressed } : c,
    );
    onChange(updated);
  };

  const handleNotesChange = (index: number, notes: string) => {
    const updated = considerations.map((c, i) => (i === index ? { ...c, notes } : c));
    onChange(updated);
  };

  const typeIcons: Record<PopulationConsideration["type"], React.ReactNode> = {
    subgroup_variation: <Users className="size-4" />,
    individual_response: <TrendingUp className="size-4" />,
    distribution: <Scale className="size-4" />,
    heterogeneity: <Target className="size-4" />,
  };

  return (
    <div className="space-y-6">
      {/* Info box */}
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-start gap-3">
          <Users className="size-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Beyond the Average</p>
            <p className="text-sm text-muted-foreground mt-1">
              An average effect of zero could mean everyone has zero effect, or half the people are
              harmed and half are helped equally. These are very different realities.
            </p>
          </div>
        </div>
      </div>

      {/* Considerations list */}
      <div className="space-y-4">
        {considerations.map((consideration, index) => (
          <motion.div
            key={consideration.type}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "p-4 rounded-lg border transition-all",
              consideration.addressed ? "border-primary bg-primary/5" : "border-border bg-card",
            )}
          >
            <div className="flex items-start gap-3">
              <motion.button
                type="button"
                onClick={() => handleToggle(index)}
                className={cn(
                  "flex items-center justify-center size-6 rounded border flex-shrink-0 mt-0.5 transition-colors",
                  consideration.addressed
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground/30 hover:border-primary/50",
                )}
                whileTap={{ scale: 0.9 }}
              >
                {consideration.addressed && <Check className="size-4" strokeWidth={3} />}
              </motion.button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-muted-foreground">{typeIcons[consideration.type]}</span>
                  <p className="text-sm font-medium">{consideration.description}</p>
                </div>

                <AnimatePresence>
                  {consideration.addressed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <textarea
                        value={consideration.notes ?? ""}
                        onChange={(e) => handleNotesChange(index, e.target.value)}
                        placeholder="Your notes on this consideration..."
                        rows={2}
                        className={cn(
                          "w-full px-3 py-2 mt-2 rounded-lg border bg-background text-foreground text-sm resize-none",
                          "placeholder:text-muted-foreground",
                          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                        )}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Session Component
// ============================================================================

export function ScaleCheckSession({
  hypothesis,
  quotes,
  onComplete,
  onAbandon,
  className,
}: ScaleCheckSessionProps) {
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
  } = useOperatorSession<ScaleCheckResult>({
    operatorType: "scale_check",
    hypothesis,
    stepConfigs: SCALE_CHECK_STEPS,
    onComplete: (session) => {
      if (onComplete && session.result) {
        onComplete(session.result);
      }
    },
    onAbandon: () => {
      onAbandon?.();
    },
  });

  // Get domain context
  const domainContext = React.useMemo(() => getDomainContext(hypothesis), [hypothesis]);

  // Initialize effect size on first render
  React.useEffect(() => {
    const existing = getSelection<EffectSizeSpec>(SCALE_CHECK_STEP_IDS.QUANTIFY);
    if (!existing) {
      setSelection(SCALE_CHECK_STEP_IDS.QUANTIFY, {
        type: "d" as EffectSizeType,
        estimate: "medium" as EffectMagnitude,
        direction: "change" as EffectDirection,
      });
    }
  }, [getSelection, setSelection]);

  // Initialize measurement assessment
  React.useEffect(() => {
    const existing = getSelection<MeasurementAssessment>(SCALE_CHECK_STEP_IDS.PRECISION);
    if (!existing) {
      setSelection(SCALE_CHECK_STEP_IDS.PRECISION, {
        isDetectable: null,
        powerNotes: "",
        warnings: [],
      });
    }
  }, [getSelection, setSelection]);

  // Initialize practical significance
  React.useEffect(() => {
    const existing = getSelection<PracticalSignificance>(SCALE_CHECK_STEP_IDS.PRACTICAL);
    if (!existing) {
      setSelection(SCALE_CHECK_STEP_IDS.PRACTICAL, {
        isPracticallyMeaningful: null,
        stakeholders: [],
        reasoning: "",
      });
    }
  }, [getSelection, setSelection]);

  // Initialize population considerations
  React.useEffect(() => {
    const existing = getSelection<PopulationConsideration[]>(SCALE_CHECK_STEP_IDS.POPULATION);
    if (!existing) {
      setSelection(SCALE_CHECK_STEP_IDS.POPULATION, generatePopulationConsiderations());
    }
  }, [getSelection, setSelection]);

  // Get current state
  const effectSize = getSelection<EffectSizeSpec>(SCALE_CHECK_STEP_IDS.QUANTIFY);
  const contextComparison = getContent<ContextComparison>(SCALE_CHECK_STEP_IDS.CONTEXTUALIZE);
  const measurementAssessment = getSelection<MeasurementAssessment>(SCALE_CHECK_STEP_IDS.PRECISION);
  const practicalSignificance = getSelection<PracticalSignificance>(SCALE_CHECK_STEP_IDS.PRACTICAL);
  const emptyPopulationConsiderations = React.useMemo(() => [] as PopulationConsideration[], []);
  const populationConsiderations =
    getSelection<PopulationConsideration[]>(SCALE_CHECK_STEP_IDS.POPULATION) ??
    emptyPopulationConsiderations;

  // Generate context comparison when entering that step
  React.useEffect(() => {
    if (currentStepConfig?.id === SCALE_CHECK_STEP_IDS.CONTEXTUALIZE && effectSize) {
      const existingComparison = getContent<ContextComparison>(SCALE_CHECK_STEP_IDS.CONTEXTUALIZE);
      if (!existingComparison) {
        const comparison = generateContextComparison(effectSize, domainContext);
        setContent(SCALE_CHECK_STEP_IDS.CONTEXTUALIZE, comparison);
      }
    }
  }, [currentStepConfig?.id, effectSize, domainContext, getContent, setContent]);

  // Handlers
  const handleEffectSizeChange = React.useCallback(
    (spec: EffectSizeSpec) => {
      setSelection(SCALE_CHECK_STEP_IDS.QUANTIFY, spec);
    },
    [setSelection],
  );

  const handleMeasurementChange = React.useCallback(
    (assessment: MeasurementAssessment) => {
      setSelection(SCALE_CHECK_STEP_IDS.PRECISION, assessment);
    },
    [setSelection],
  );

  const handlePracticalChange = React.useCallback(
    (significance: PracticalSignificance) => {
      setSelection(SCALE_CHECK_STEP_IDS.PRACTICAL, significance);
    },
    [setSelection],
  );

  const handlePopulationChange = React.useCallback(
    (considerations: PopulationConsideration[]) => {
      setSelection(SCALE_CHECK_STEP_IDS.POPULATION, considerations);
    },
    [setSelection],
  );

  // Handle completion
  const handleComplete = React.useCallback(() => {
    const result: ScaleCheckResult = {
      effectSize: effectSize ?? {
        type: "estimate",
        estimate: "medium",
        direction: "change",
      },
      contextComparison: contextComparison ?? {
        relativeToNorm: "typical",
        benchmarksWithComparisons: [],
        warnings: [],
        insights: [],
      },
      measurementAssessment: measurementAssessment ?? {
        isDetectable: null,
        powerNotes: "",
        warnings: [],
      },
      practicalSignificance: practicalSignificance ?? {
        isPracticallyMeaningful: null,
        stakeholders: [],
        reasoning: "",
      },
      populationConsiderations,
      overallPlausibility: "needs_more_info",
      summaryNotes: session.notes ?? "",
    };

    // Determine overall plausibility
    const hasWarnings =
      (contextComparison?.warnings.length ?? 0) > 0 ||
      (measurementAssessment?.warnings.length ?? 0) > 0;
    const isDetectable = measurementAssessment?.isDetectable;
    const isPractical = practicalSignificance?.isPracticallyMeaningful;

    if (isDetectable === false || isPractical === false) {
      result.overallPlausibility = "implausible";
    } else if (hasWarnings || contextComparison?.relativeToNorm === "exceptional") {
      result.overallPlausibility = "questionable";
    } else if (isDetectable === true && isPractical === true) {
      result.overallPlausibility = "plausible";
    }

    complete(result);
  }, [
    effectSize,
    contextComparison,
    measurementAssessment,
    practicalSignificance,
    populationConsiderations,
    session.notes,
    complete,
  ]);

  // Render step content based on current step
  const renderStepContent = () => {
    switch (currentStepConfig?.id) {
      case SCALE_CHECK_STEP_IDS.QUANTIFY:
        return <QuantifyEffect effectSize={effectSize ?? null} onChange={handleEffectSizeChange} />;

      case SCALE_CHECK_STEP_IDS.CONTEXTUALIZE:
        return effectSize ? (
          <ContextComparisonDisplay
            effectSize={effectSize}
            comparison={contextComparison ?? null}
            domainName={domainContext.domain}
          />
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            Please specify an effect size first.
          </div>
        );

      case SCALE_CHECK_STEP_IDS.PRECISION:
        return effectSize ? (
          <MeasurementPrecision
            effectSize={effectSize}
            assessment={measurementAssessment ?? null}
            onChange={handleMeasurementChange}
          />
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            Please specify an effect size first.
          </div>
        );

      case SCALE_CHECK_STEP_IDS.PRACTICAL:
        return (
          <PracticalSignificanceInput
            significance={practicalSignificance ?? null}
            onChange={handlePracticalChange}
          />
        );

      case SCALE_CHECK_STEP_IDS.POPULATION:
        return (
          <PopulationConsiderationsInput
            considerations={populationConsiderations}
            onChange={handlePopulationChange}
          />
        );

      default:
        return <div className="p-8 text-center text-muted-foreground">Unknown step</div>;
    }
  };

  // Use quotes or fallback
  const displayQuotes = quotes && quotes.length > 0 ? quotes : SCALE_CHECK_FALLBACK_QUOTES;

  return (
    <OperatorShell
      operatorType="scale_check"
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

export default ScaleCheckSession;
