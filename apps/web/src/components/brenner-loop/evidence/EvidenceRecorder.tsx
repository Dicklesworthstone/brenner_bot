"use client";

/**
 * EvidenceRecorder - Multi-step Evidence Recording Interface
 *
 * Guides users through recording evidence from tests they've run.
 *
 * Steps:
 * 1. Select or Create Test - Choose from generated tests or add custom
 * 2. Record Predictions - Set what you expect if true/false
 * 3. Record Observation - Document what was actually observed
 * 4. Classify Result - Does it support, challenge, or inconclusive?
 * 5. Interpret - Explain what this means for the hypothesis
 * 6. Confirm Update - Preview and confirm the confidence update
 *
 * @see brenner_bot-njjo.3 (bead)
 * @module components/brenner-loop/evidence/EvidenceRecorder
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  HelpCircle,
  Lightbulb,
  Minus,
  Plus,
  TestTube,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  computeConfidenceUpdate,
  formatConfidence,
  formatDelta,
  getAsymmetryExplanation,
  getConfidenceAssessment,
  getStarRating,
} from "@/lib/brenner-loop/confidence";
import type {
  DiscriminativePower,
  EvidenceEntry,
  EvidenceResult,
  TestDescription,
  TestType,
} from "@/lib/brenner-loop/evidence";
import { generateEvidenceId, TEST_TYPE_LABELS } from "@/lib/brenner-loop/evidence";
import type {
  ExclusionTest,
  ExclusionTestCategory,
} from "@/lib/brenner-loop/operators/exclusion-test";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface EvidenceRecorderProps {
  /** Current session ID */
  sessionId: string;
  /** Hypothesis ID being tested */
  hypothesisId: string;
  /** Current confidence level */
  currentConfidence: number;
  /** Pre-defined tests from Exclusion Test phase */
  predefinedTests?: ExclusionTest[];
  /** Number of existing evidence entries (for ID generation) */
  evidenceCount?: number;
  /** Callback when evidence is recorded */
  onRecordEvidence: (entry: EvidenceEntry) => void;
  /** Callback when user cancels */
  onCancel?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/** The recording steps */
type RecordingStep =
  | "select-test"
  | "record-predictions"
  | "record-observation"
  | "classify-result"
  | "interpret"
  | "confirm";

/** Step configuration */
interface StepConfig {
  id: RecordingStep;
  title: string;
  description: string;
}

const STEPS: StepConfig[] = [
  {
    id: "select-test",
    title: "Select Test",
    description: "Choose or create the test you ran",
  },
  {
    id: "record-predictions",
    title: "Predictions",
    description: "What did you predict?",
  },
  {
    id: "record-observation",
    title: "Observation",
    description: "What did you observe?",
  },
  {
    id: "classify-result",
    title: "Classify",
    description: "How does it relate?",
  },
  {
    id: "interpret",
    title: "Interpret",
    description: "What does it mean?",
  },
  {
    id: "confirm",
    title: "Confirm",
    description: "Review and confirm",
  },
];

/** Form state for the recorder */
interface RecorderState {
  /** Selected or custom test */
  test: TestDescription | null;
  /** Original ExclusionTest if from predefined */
  originalTest: ExclusionTest | null;
  /** Prediction if hypothesis is true */
  predictionIfTrue: string;
  /** Prediction if hypothesis is false */
  predictionIfFalse: string;
  /** Actual observation */
  observation: string;
  /** Optional source/citation */
  source: string;
  /** Result classification */
  result: EvidenceResult | null;
  /** User's interpretation */
  interpretation: string;
  /** Creating custom test? */
  isCreatingCustom: boolean;
  /** Custom test fields */
  customTest: {
    name: string;
    description: string;
    type: TestType;
    discriminativePower: DiscriminativePower;
  };
}

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Step indicator showing progress
 */
function StepIndicator({
  steps,
  currentIndex,
  onStepClick,
}: {
  steps: StepConfig[];
  currentIndex: number;
  onStepClick?: (index: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <React.Fragment key={step.id}>
            <button
              type="button"
              onClick={() => onStepClick?.(index)}
              disabled={!onStepClick || index > currentIndex}
              className={cn(
                "flex items-center justify-center size-8 rounded-full text-xs font-medium transition-all",
                isCompleted && "bg-primary text-primary-foreground",
                isCurrent && "bg-primary/20 text-primary ring-2 ring-primary",
                !isCompleted && !isCurrent && "bg-muted text-muted-foreground",
                onStepClick &&
                  index <= currentIndex &&
                  "cursor-pointer hover:ring-2 hover:ring-primary/50",
              )}
              title={step.title}
            >
              {isCompleted ? <Check className="size-4" /> : index + 1}
            </button>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-6 h-0.5 rounded",
                  index < currentIndex ? "bg-primary" : "bg-muted",
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * Result classification button
 */
function ResultButton({
  result,
  selected,
  onClick,
}: {
  result: EvidenceResult;
  selected: boolean;
  onClick: () => void;
}) {
  const config = {
    supports: {
      icon: CheckCircle2,
      label: "Supports",
      description: "Matches prediction if true",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500",
    },
    challenges: {
      icon: XCircle,
      label: "Challenges",
      description: "Matches prediction if false",
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500",
    },
    inconclusive: {
      icon: HelpCircle,
      label: "Inconclusive",
      description: "Doesn't clearly match either",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500",
    },
  };

  const cfg = config[result];
  const Icon = cfg.icon;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 p-4 rounded-lg border-2 text-left transition-all",
        selected ? `${cfg.bgColor} ${cfg.borderColor}` : "border-border hover:border-primary/50",
      )}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn("size-6", selected ? cfg.color : "text-muted-foreground")} />
        <div>
          <div className={cn("font-medium", selected && cfg.color)}>{cfg.label}</div>
          <div className="text-xs text-muted-foreground">{cfg.description}</div>
        </div>
      </div>
    </motion.button>
  );
}

/**
 * Confidence update preview
 */
function ConfidencePreview({
  currentConfidence,
  newConfidence,
  delta,
  explanation,
  significant,
}: {
  currentConfidence: number;
  newConfidence: number;
  delta: number;
  explanation: string;
  significant: boolean;
}) {
  const assessment = getConfidenceAssessment(newConfidence);

  return (
    <div className="space-y-4">
      {/* Confidence change visualization */}
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Before</div>
            <div className="text-2xl font-bold">{formatConfidence(currentConfidence)}</div>
          </div>

          <div className="flex items-center gap-2">
            {delta > 0 ? (
              <TrendingUp className="size-6 text-green-500" />
            ) : delta < 0 ? (
              <TrendingDown className="size-6 text-red-500" />
            ) : (
              <Minus className="size-6 text-muted-foreground" />
            )}
            <span
              className={cn(
                "text-lg font-bold",
                delta > 0 && "text-green-500",
                delta < 0 && "text-red-500",
                delta === 0 && "text-muted-foreground",
              )}
            >
              {formatDelta(delta)}
            </span>
          </div>

          <div className="text-center">
            <div className="text-sm text-muted-foreground">After</div>
            <div className="text-2xl font-bold">{formatConfidence(newConfidence)}</div>
          </div>
        </div>

        {/* Confidence bar */}
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: `${currentConfidence}%` }}
            animate={{ width: `${newConfidence}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        {/* Assessment */}
        <div className="flex items-center gap-2 mt-3">
          <div
            className={cn(
              "px-2 py-0.5 rounded text-xs font-medium",
              assessment.color === "green" && "bg-green-500/10 text-green-600",
              assessment.color === "lime" && "bg-lime-500/10 text-lime-600",
              assessment.color === "yellow" && "bg-yellow-500/10 text-yellow-600",
              assessment.color === "orange" && "bg-orange-500/10 text-orange-600",
              assessment.color === "red" && "bg-red-500/10 text-red-600",
            )}
          >
            {assessment.label}
          </div>
          <span className="text-xs text-muted-foreground">{assessment.description}</span>
        </div>
      </div>

      {/* Explanation */}
      <div className="p-4 rounded-lg border border-border">
        <p className="text-sm">{explanation}</p>
      </div>

      {/* Significance badge */}
      {significant && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <AlertCircle className="size-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            This is a significant update ({Math.abs(delta) >= 10 ? "major" : "notable"} change)
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function EvidenceRecorder({
  sessionId,
  hypothesisId,
  currentConfidence,
  predefinedTests = [],
  evidenceCount = 0,
  onRecordEvidence,
  onCancel,
  className,
}: EvidenceRecorderProps) {
  // Current step
  const [stepIndex, setStepIndex] = React.useState(0);
  const currentStep = STEPS[stepIndex];

  // Form state
  const [state, setState] = React.useState<RecorderState>({
    test: null,
    originalTest: null,
    predictionIfTrue: "",
    predictionIfFalse: "",
    observation: "",
    source: "",
    result: null,
    interpretation: "",
    isCreatingCustom: false,
    customTest: {
      name: "",
      description: "",
      type: "observation",
      discriminativePower: 3,
    },
  });

  // Computed confidence update
  const confidenceUpdate = React.useMemo(() => {
    if (!state.test || !state.result) return null;

    return computeConfidenceUpdate(
      currentConfidence,
      { discriminativePower: state.test.discriminativePower },
      state.result,
    );
  }, [currentConfidence, state.test, state.result]);

  // Select a predefined test
  const selectTest = (test: ExclusionTest) => {
    const testDesc: TestDescription = {
      id: test.id,
      description: test.description,
      type: categoryToTestType(test.category),
      discriminativePower: test.discriminativePower,
    };

    setState((prev) => ({
      ...prev,
      test: testDesc,
      originalTest: test,
      // Pre-fill predictions from test conditions
      predictionIfTrue: test.supportCondition,
      predictionIfFalse: test.falsificationCondition,
      isCreatingCustom: false,
    }));
  };

  // Start custom test creation
  const startCustomTest = () => {
    setState((prev) => ({
      ...prev,
      test: null,
      originalTest: null,
      isCreatingCustom: true,
    }));
  };

  // Confirm custom test
  const confirmCustomTest = () => {
    if (!state.customTest.name || !state.customTest.description) return;

    const testDesc: TestDescription = {
      id: `custom-${Date.now()}`,
      description: state.customTest.description,
      type: state.customTest.type,
      discriminativePower: state.customTest.discriminativePower,
    };

    setState((prev) => ({
      ...prev,
      test: testDesc,
      isCreatingCustom: false,
    }));
  };

  // Navigation
  const canGoNext = React.useMemo(() => {
    switch (currentStep.id) {
      case "select-test":
        return state.test !== null;
      case "record-predictions":
        return state.predictionIfTrue.trim() !== "" && state.predictionIfFalse.trim() !== "";
      case "record-observation":
        return state.observation.trim() !== "";
      case "classify-result":
        return state.result !== null;
      case "interpret":
        return state.interpretation.trim() !== "";
      case "confirm":
        return true;
      default:
        return false;
    }
  }, [currentStep.id, state]);

  const goNext = () => {
    if (stepIndex < STEPS.length - 1 && canGoNext) {
      setStepIndex((i) => i + 1);
    }
  };

  const goPrev = () => {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
    }
  };

  // Submit evidence
  const handleConfirm = () => {
    if (!state.test || !state.result || !confidenceUpdate) return;

    const entry: EvidenceEntry = {
      id: generateEvidenceId(sessionId, evidenceCount),
      sessionId,
      hypothesisVersion: hypothesisId,
      test: state.test,
      predictionIfTrue: state.predictionIfTrue,
      predictionIfFalse: state.predictionIfFalse,
      result: state.result,
      observation: state.observation,
      source: state.source || undefined,
      confidenceBefore: currentConfidence,
      confidenceAfter: confidenceUpdate.newConfidence,
      interpretation: state.interpretation,
      recordedAt: new Date(),
      recordedBy: "user",
    };

    onRecordEvidence(entry);
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep.id) {
      case "select-test":
        return (
          <div className="space-y-4">
            {/* Predefined tests */}
            {predefinedTests.length > 0 && !state.isCreatingCustom && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Select from Generated Tests</Label>
                {predefinedTests.map((test) => (
                  <motion.button
                    key={test.id}
                    type="button"
                    onClick={() => selectTest(test)}
                    className={cn(
                      "w-full p-4 rounded-lg border text-left transition-all",
                      state.test?.id === test.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50",
                    )}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-start gap-3">
                      <TestTube className="size-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{test.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {getStarRating(test.discriminativePower)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {test.description}
                        </p>
                      </div>
                      {state.test?.id === test.id && (
                        <Check className="size-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            )}

            {/* Custom test creation */}
            {state.isCreatingCustom ? (
              <div className="space-y-4 p-4 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="size-4 text-primary" />
                  <span className="font-medium text-sm">Create Custom Test</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="test-name">Test Name</Label>
                    <Input
                      id="test-name"
                      value={state.customTest.name}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          customTest: { ...prev.customTest, name: e.target.value },
                        }))
                      }
                      placeholder="e.g., Check temporal sequence"
                    />
                  </div>

                  <div>
                    <Label htmlFor="test-desc">Description</Label>
                    <Textarea
                      id="test-desc"
                      value={state.customTest.description}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          customTest: { ...prev.customTest, description: e.target.value },
                        }))
                      }
                      placeholder="What did you test?"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Test Type</Label>
                      <Select
                        value={state.customTest.type}
                        onValueChange={(v) =>
                          setState((prev) => ({
                            ...prev,
                            customTest: { ...prev.customTest, type: v as TestType },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TEST_TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Discriminative Power</Label>
                      <Select
                        value={state.customTest.discriminativePower.toString()}
                        onValueChange={(v) =>
                          setState((prev) => ({
                            ...prev,
                            customTest: {
                              ...prev.customTest,
                              discriminativePower: parseInt(v) as DiscriminativePower,
                            },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">{getStarRating(1)} Low</SelectItem>
                          <SelectItem value="2">{getStarRating(2)} Moderate-Low</SelectItem>
                          <SelectItem value="3">{getStarRating(3)} Moderate</SelectItem>
                          <SelectItem value="4">{getStarRating(4)} High</SelectItem>
                          <SelectItem value="5">{getStarRating(5)} Decisive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setState((prev) => ({ ...prev, isCreatingCustom: false }))}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={confirmCustomTest}
                      disabled={!state.customTest.name || !state.customTest.description}
                    >
                      Use This Test
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={startCustomTest} className="w-full">
                <Plus className="size-4 mr-2" />
                Add Custom Test
              </Button>
            )}
          </div>
        );

      case "record-predictions":
        return (
          <div className="space-y-4">
            {state.originalTest && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">
                  Pre-filled from your selected test. Edit if needed.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="pred-true">What did you predict if the hypothesis is TRUE?</Label>
              <Textarea
                id="pred-true"
                value={state.predictionIfTrue}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, predictionIfTrue: e.target.value }))
                }
                placeholder="If the hypothesis is true, I would expect to see..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pred-false">What did you predict if the hypothesis is FALSE?</Label>
              <Textarea
                id="pred-false"
                value={state.predictionIfFalse}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, predictionIfFalse: e.target.value }))
                }
                placeholder="If the hypothesis is false, I would expect to see..."
                rows={3}
              />
            </div>

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-2">
                <Lightbulb className="size-4 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  <strong>Pre-registration matters:</strong> Specifying predictions before observing
                  results is key to honest testing. This prevents post-hoc rationalization.
                </p>
              </div>
            </div>
          </div>
        );

      case "record-observation":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="observation">What did you actually observe?</Label>
              <Textarea
                id="observation"
                value={state.observation}
                onChange={(e) => setState((prev) => ({ ...prev, observation: e.target.value }))}
                placeholder="Describe the factual observation, not interpretation..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Source/Citation (optional)</Label>
              <Input
                id="source"
                value={state.source}
                onChange={(e) => setState((prev) => ({ ...prev, source: e.target.value }))}
                placeholder="Paper DOI, experiment ID, data file..."
              />
            </div>

            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-start gap-2">
                <Eye className="size-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Keep observations factual. Save interpretation for the next steps.
                </p>
              </div>
            </div>
          </div>
        );

      case "classify-result":
        return (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm mb-3">How does your observation relate to your predictions?</p>
              <div className="grid grid-cols-1 gap-3 text-xs">
                <div className="flex gap-2">
                  <span className="font-medium">If true:</span>
                  <span className="text-muted-foreground">{state.predictionIfTrue}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-medium">If false:</span>
                  <span className="text-muted-foreground">{state.predictionIfFalse}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <ResultButton
                result="supports"
                selected={state.result === "supports"}
                onClick={() => setState((prev) => ({ ...prev, result: "supports" }))}
              />
              <ResultButton
                result="challenges"
                selected={state.result === "challenges"}
                onClick={() => setState((prev) => ({ ...prev, result: "challenges" }))}
              />
              <ResultButton
                result="inconclusive"
                selected={state.result === "inconclusive"}
                onClick={() => setState((prev) => ({ ...prev, result: "inconclusive" }))}
              />
            </div>
          </div>
        );

      case "interpret":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="interpretation">How should we interpret this evidence?</Label>
              <Textarea
                id="interpretation"
                value={state.interpretation}
                onChange={(e) => setState((prev) => ({ ...prev, interpretation: e.target.value }))}
                placeholder="What does this mean for the hypothesis? Why does it support or challenge it?"
                rows={4}
              />
            </div>

            {state.result && confidenceUpdate && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>Preview:</strong> {confidenceUpdate.explanation}
                </p>
                {state.result === "challenges" && (
                  <p className="text-xs text-amber-600">
                    {getAsymmetryExplanation().slice(0, 100)}...
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case "confirm":
        return (
          <div className="space-y-4">
            {confidenceUpdate && (
              <ConfidencePreview
                currentConfidence={currentConfidence}
                newConfidence={confidenceUpdate.newConfidence}
                delta={confidenceUpdate.delta}
                explanation={confidenceUpdate.explanation}
                significant={confidenceUpdate.significant}
              />
            )}

            {/* Summary */}
            <div className="p-4 rounded-lg border border-border space-y-3">
              <h4 className="font-medium text-sm">Evidence Summary</h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Test:</span>
                  <p className="font-medium">
                    {state.test ? `${state.test.description.slice(0, 50)}...` : "No test selected"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Power:</span>
                  <p className="font-medium">
                    {state.test ? getStarRating(state.test.discriminativePower) : "N/A"}
                  </p>
                </div>
              </div>

              <div className="text-xs">
                <span className="text-muted-foreground">Observation:</span>
                <p className="mt-1">{state.observation}</p>
              </div>

              <div className="text-xs">
                <span className="text-muted-foreground">Interpretation:</span>
                <p className="mt-1">{state.interpretation}</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-lg mb-2">Record Evidence</h3>
        <StepIndicator
          steps={STEPS}
          currentIndex={stepIndex}
          onStepClick={(i) => i < stepIndex && setStepIndex(i)}
        />
      </div>

      {/* Step content */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="mb-4">
          <h4 className="font-medium">{currentStep.title}</h4>
          <p className="text-sm text-muted-foreground">{currentStep.description}</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer navigation */}
      <div className="p-4 border-t border-border flex items-center justify-between">
        <div>
          {stepIndex > 0 ? (
            <Button variant="outline" onClick={goPrev}>
              <ArrowLeft className="size-4 mr-2" />
              Back
            </Button>
          ) : onCancel ? (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
        </div>

        <div>
          {stepIndex < STEPS.length - 1 ? (
            <Button onClick={goNext} disabled={!canGoNext}>
              Next
              <ArrowRight className="size-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleConfirm} disabled={!canGoNext}>
              <Check className="size-4 mr-2" />
              Confirm & Record
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Convert ExclusionTest category to TestType
 */
function categoryToTestType(category: ExclusionTestCategory): TestType {
  const mapping: Record<ExclusionTestCategory, TestType> = {
    natural_experiment: "natural_experiment",
    cross_context: "cross_context",
    mechanism_block: "mechanism_block",
    dose_response: "dose_response",
    temporal_sequence: "temporal_analysis",
    specificity: "observation",
    coherence: "literature",
    custom: "observation",
  };
  return mapping[category];
}

export default EvidenceRecorder;
