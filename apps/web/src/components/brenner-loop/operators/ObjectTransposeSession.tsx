"use client";

/**
 * ObjectTransposeSession - Interactive Object Transpose (⟳) Operator Session
 *
 * Guides users through generating and evaluating alternative explanations
 * for their hypothesis.
 *
 * Steps:
 * 1. State Current Hypothesis - Review the X → Y claim
 * 2. Generate Alternatives - Review reverse causation, third variables, etc.
 * 3. Rate Plausibility - Score each alternative's plausibility
 * 4. Identify Tests - Generate discriminating tests for high-plausibility alternatives
 *
 * @see brenner_bot-vw6p.4 (bead)
 * @module components/brenner-loop/operators/ObjectTransposeSession
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRightLeft,
  GitBranch,
  HelpCircle,
  Lightbulb,
  RefreshCw,
  Star,
  TestTube,
  Users,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { useOperatorSession } from "@/hooks/useOperatorSession";
import type { HypothesisCard } from "@/lib/brenner-loop/hypothesis";
import type {
  AlternativeExplanation,
  AlternativeType,
  DiscriminatingTest,
  ObjectTransposeResult,
  PlausibilityRating,
} from "@/lib/brenner-loop/operators/object-transpose";
import {
  generateAlternatives,
  generateDiscriminatingTests,
  OBJECT_TRANSPOSE_FALLBACK_QUOTES,
  OBJECT_TRANSPOSE_STEP_IDS,
  OBJECT_TRANSPOSE_STEPS,
} from "@/lib/brenner-loop/operators/object-transpose";
import type { Quote } from "@/lib/quotebank-parser";
import { cn } from "@/lib/utils";
import { OperatorShell } from "./OperatorShell";

// ============================================================================
// Types
// ============================================================================

export interface ObjectTransposeSessionProps {
  /** The hypothesis to apply Object Transpose to */
  hypothesis: HypothesisCard;
  /** Brenner quotes for this operator (optional) */
  quotes?: Quote[];
  /** Callback when session completes */
  onComplete?: (result: ObjectTransposeResult) => void;
  /** Callback when session is abandoned */
  onAbandon?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Icon for alternative type
 */
function AlternativeIcon({ type }: { type: AlternativeType }) {
  switch (type) {
    case "reverse_causation":
      return <ArrowRightLeft className="size-5" />;
    case "third_variable":
      return <GitBranch className="size-5" />;
    case "selection":
      return <Users className="size-5" />;
    case "bidirectional":
      return <RefreshCw className="size-5" />;
    case "coincidence":
      return <HelpCircle className="size-5" />;
    default:
      return <Lightbulb className="size-5" />;
  }
}

/**
 * Color for alternative type
 */
function getTypeColor(type: AlternativeType): string {
  switch (type) {
    case "reverse_causation":
      return "text-blue-500";
    case "third_variable":
      return "text-purple-500";
    case "selection":
      return "text-amber-500";
    case "bidirectional":
      return "text-green-500";
    case "coincidence":
      return "text-gray-500";
    default:
      return "text-primary";
  }
}

// ============================================================================
// Step Components
// ============================================================================

/**
 * Hypothesis statement display
 */
interface HypothesisDisplayProps {
  hypothesis: HypothesisCard;
}

function HypothesisDisplay({ hypothesis }: HypothesisDisplayProps) {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-primary/10 text-primary flex-shrink-0">
            <ArrowRightLeft className="size-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-lg mb-2">Your Current Hypothesis</h3>
            <p className="text-base leading-relaxed">{hypothesis.statement}</p>
            {hypothesis.domain.length > 0 && (
              <div className="flex gap-2 mt-3">
                {hypothesis.domain.map((d) => (
                  <span
                    key={d}
                    className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-start gap-3">
          <Lightbulb className="size-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm">
              <strong>Your hypothesis proposes: X → Y</strong>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              In the next step, we&apos;ll generate alternative explanations that could account for
              the same observations. Consider: How confident are you that X actually causes Y,
              rather than some other relationship?
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Alternative explanations list
 */
interface AlternativeListProps {
  alternatives: AlternativeExplanation[];
  showDetails?: boolean;
}

function AlternativeList({ alternatives, showDetails = true }: AlternativeListProps) {
  if (alternatives.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">No alternatives generated yet.</div>
    );
  }

  return (
    <div className="space-y-4">
      {alternatives.map((alt, index) => (
        <motion.div
          key={alt.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className={cn("p-2 rounded-lg bg-muted flex-shrink-0", getTypeColor(alt.type))}>
              <AlternativeIcon type={alt.type} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm">{alt.name}</h4>
              <p className="text-sm text-muted-foreground mt-1">{alt.description}</p>
              {showDetails && alt.implications.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Implications
                  </p>
                  <ul className="space-y-1">
                    {alt.implications.slice(0, 3).map((imp, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Plausibility rating component
 */
interface PlausibilityRaterProps {
  alternatives: AlternativeExplanation[];
  ratings: PlausibilityRating[];
  onRate: (
    alternativeId: string,
    plausibility: number,
    discrimination: "poor" | "moderate" | "good",
  ) => void;
}

function PlausibilityRater({ alternatives, ratings, onRate }: PlausibilityRaterProps) {
  const getRating = (altId: string): PlausibilityRating | undefined => {
    return ratings.find((r) => r.alternativeId === altId);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-sm text-muted-foreground">
          Rate each alternative&apos;s plausibility (1-5 stars) and how well existing evidence
          discriminates between it and your original hypothesis.
        </p>
      </div>

      <div className="space-y-4">
        {alternatives.map((alt, index) => {
          const rating = getRating(alt.id);
          const plausibility = rating?.plausibility ?? 0;
          const discrimination = rating?.evidenceDiscrimination ?? "poor";

          return (
            <motion.div
              key={alt.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "p-4 rounded-lg border transition-all",
                plausibility >= 3 ? "border-amber-500/50 bg-amber-500/5" : "border-border bg-card",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn("p-2 rounded-lg bg-muted flex-shrink-0", getTypeColor(alt.type))}
                >
                  <AlternativeIcon type={alt.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">{alt.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {alt.description}
                  </p>

                  {/* Plausibility stars */}
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground mr-2">Plausibility:</span>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => onRate(alt.id, star, discrimination)}
                          className={cn(
                            "p-0.5 transition-colors",
                            star <= plausibility
                              ? "text-amber-500"
                              : "text-muted-foreground/30 hover:text-muted-foreground/60",
                          )}
                        >
                          <Star
                            className="size-5"
                            fill={star <= plausibility ? "currentColor" : "none"}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Evidence discrimination */}
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-muted-foreground">Evidence discriminates:</span>
                    <div className="flex gap-1">
                      {(["poor", "moderate", "good"] as const).map((level) => (
                        <Button
                          key={level}
                          type="button"
                          variant={discrimination === level ? "default" : "outline"}
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => onRate(alt.id, plausibility || 1, level)}
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Discriminating tests display
 */
interface TestListProps {
  tests: DiscriminatingTest[];
  alternatives: AlternativeExplanation[];
  onPriorityChange?: (testId: string, priority: number) => void;
}

function TestList({ tests, alternatives, onPriorityChange }: TestListProps) {
  const getAlternative = (altId: string) => alternatives.find((a) => a.id === altId);

  if (tests.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <TestTube className="size-12 mx-auto mb-4 opacity-50" />
        <p>No high-plausibility alternatives to generate tests for.</p>
        <p className="text-sm mt-2">
          Rate at least one alternative with 3+ stars in the previous step.
        </p>
      </div>
    );
  }

  const feasibilityColors = {
    easy: "text-green-500 bg-green-500/10",
    moderate: "text-amber-500 bg-amber-500/10",
    difficult: "text-orange-500 bg-orange-500/10",
    impractical: "text-red-500 bg-red-500/10",
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-3">
          <TestTube className="size-5 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Discriminating Tests</p>
            <p className="text-sm text-muted-foreground mt-1">
              These tests could help distinguish between your original hypothesis and the
              high-plausibility alternatives.
            </p>
          </div>
        </div>
      </div>

      {tests.map((test, index) => {
        const alt = getAlternative(test.alternativeId);

        return (
          <motion.div
            key={test.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 rounded-lg border border-border bg-card"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "px-2 py-0.5 text-xs rounded-full",
                    feasibilityColors[test.feasibility],
                  )}
                >
                  {test.feasibility}
                </span>
                <span className="text-xs text-muted-foreground">
                  Tests: {alt?.name ?? test.alternativeId}
                </span>
              </div>
              {onPriorityChange && (
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onPriorityChange(test.id, p)}
                      className={cn(
                        "size-6 rounded text-xs font-medium transition-colors",
                        test.priority === p
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80",
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <p className="text-sm font-medium mb-3">{test.description}</p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 rounded bg-green-500/5 border border-green-500/20">
                <p className="font-medium text-green-600 mb-1">Supports Original</p>
                <p className="text-muted-foreground">{test.originalSupport}</p>
              </div>
              <div className="p-2 rounded bg-amber-500/5 border border-amber-500/20">
                <p className="font-medium text-amber-600 mb-1">Supports Alternative</p>
                <p className="text-muted-foreground">{test.alternativeSupport}</p>
              </div>
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

export function ObjectTransposeSession({
  hypothesis,
  quotes,
  onComplete,
  onAbandon,
  className,
}: ObjectTransposeSessionProps) {
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
  } = useOperatorSession<ObjectTransposeResult>({
    operatorType: "object_transpose",
    hypothesis,
    stepConfigs: OBJECT_TRANSPOSE_STEPS,
    onComplete: (session) => {
      if (onComplete && session.result) {
        onComplete(session.result);
      }
    },
    onAbandon: () => {
      onAbandon?.();
    },
  });

  // Generate alternatives when entering that step
  React.useEffect(() => {
    if (currentStepConfig?.id === OBJECT_TRANSPOSE_STEP_IDS.GENERATE_ALTERNATIVES) {
      const existing = getContent<AlternativeExplanation[]>(
        OBJECT_TRANSPOSE_STEP_IDS.GENERATE_ALTERNATIVES,
      );
      if (!existing || existing.length === 0) {
        const alts = generateAlternatives(hypothesis);
        setContent(OBJECT_TRANSPOSE_STEP_IDS.GENERATE_ALTERNATIVES, alts);
      }
    }
  }, [currentStepConfig?.id, hypothesis, getContent, setContent]);

  // Get current state with stable references
  const alternativesRaw = getContent<AlternativeExplanation[]>(
    OBJECT_TRANSPOSE_STEP_IDS.GENERATE_ALTERNATIVES,
  );
  const alternatives = React.useMemo(() => alternativesRaw ?? [], [alternativesRaw]);

  const ratingsRaw = getSelection<PlausibilityRating[]>(
    OBJECT_TRANSPOSE_STEP_IDS.RATE_PLAUSIBILITY,
  );
  const ratings = React.useMemo(() => ratingsRaw ?? [], [ratingsRaw]);

  const testsRaw = getContent<DiscriminatingTest[]>(OBJECT_TRANSPOSE_STEP_IDS.IDENTIFY_TESTS);
  const tests = React.useMemo(() => testsRaw ?? [], [testsRaw]);

  // Handle rating an alternative
  const handleRate = React.useCallback(
    (alternativeId: string, plausibility: number, discrimination: "poor" | "moderate" | "good") => {
      const existingIndex = ratings.findIndex((r) => r.alternativeId === alternativeId);
      const newRating: PlausibilityRating = {
        alternativeId,
        plausibility,
        evidenceDiscrimination: discrimination,
      };

      let updated: PlausibilityRating[];
      if (existingIndex >= 0) {
        updated = [...ratings];
        updated[existingIndex] = newRating;
      } else {
        updated = [...ratings, newRating];
      }

      setSelection(OBJECT_TRANSPOSE_STEP_IDS.RATE_PLAUSIBILITY, updated);
    },
    [ratings, setSelection],
  );

  // Generate tests when entering that step
  React.useEffect(() => {
    if (currentStepConfig?.id === OBJECT_TRANSPOSE_STEP_IDS.IDENTIFY_TESTS) {
      const existingTests = getContent<DiscriminatingTest[]>(
        OBJECT_TRANSPOSE_STEP_IDS.IDENTIFY_TESTS,
      );
      const highPlausibilityCount = ratings.filter((r) => r.plausibility >= 3).length;

      // Regenerate if we have ratings and either no tests or different count
      if (
        ratings.length > 0 &&
        (!existingTests || existingTests.length !== highPlausibilityCount)
      ) {
        const newTests = generateDiscriminatingTests(alternatives, ratings);
        setContent(OBJECT_TRANSPOSE_STEP_IDS.IDENTIFY_TESTS, newTests);
      }
    }
  }, [currentStepConfig?.id, alternatives, ratings, getContent, setContent]);

  // Handle test priority change
  const handlePriorityChange = React.useCallback(
    (testId: string, priority: number) => {
      const updated = tests.map((t) => (t.id === testId ? { ...t, priority } : t));
      setContent(OBJECT_TRANSPOSE_STEP_IDS.IDENTIFY_TESTS, updated);
    },
    [tests, setContent],
  );

  // Handle completion
  const handleComplete = React.useCallback(() => {
    const highPriorityAlternativeIds = ratings
      .filter((r) => r.plausibility >= 3)
      .map((r) => r.alternativeId);

    const selectedTestIds = tests.filter((t) => t.priority && t.priority > 0).map((t) => t.id);

    const result: ObjectTransposeResult = {
      alternatives,
      userRatings: ratings,
      discriminatingTests: tests,
      highPriorityAlternativeIds,
      selectedTestIds,
    };

    complete(result);
  }, [alternatives, ratings, tests, complete]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStepConfig?.id) {
      case OBJECT_TRANSPOSE_STEP_IDS.STATE_HYPOTHESIS:
        return <HypothesisDisplay hypothesis={hypothesis} />;

      case OBJECT_TRANSPOSE_STEP_IDS.GENERATE_ALTERNATIVES:
        return (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground">
                Here are alternative explanations for your observed relationship. Each represents a
                different causal story that could explain the same data.
              </p>
            </div>
            <AlternativeList alternatives={alternatives} showDetails />
          </div>
        );

      case OBJECT_TRANSPOSE_STEP_IDS.RATE_PLAUSIBILITY:
        return (
          <PlausibilityRater alternatives={alternatives} ratings={ratings} onRate={handleRate} />
        );

      case OBJECT_TRANSPOSE_STEP_IDS.IDENTIFY_TESTS:
        return (
          <TestList
            tests={tests}
            alternatives={alternatives}
            onPriorityChange={handlePriorityChange}
          />
        );

      default:
        return <div className="p-8 text-center text-muted-foreground">Unknown step</div>;
    }
  };

  // Use quotes or fallback
  const displayQuotes = quotes && quotes.length > 0 ? quotes : OBJECT_TRANSPOSE_FALLBACK_QUOTES;

  return (
    <OperatorShell
      operatorType="object_transpose"
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

export default ObjectTransposeSession;
