"use client";

/**
 * HypothesisIntake Component
 *
 * Multi-step wizard for hypothesis entry with Socratic refinement.
 * Guides users through proper hypothesis formulation by requiring:
 * - A clear statement
 * - A specific mechanism
 * - Predictions if true/false
 * - Falsification conditions (the key Brenner insight)
 * - Initial confidence assessment
 *
 * @see brenner_bot-an1n.5 (bead)
 * @see apps/web/src/lib/brenner-loop/hypothesis.ts
 */

import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { HypothesisCard } from "@/lib/brenner-loop/hypothesis";
import { createHypothesisCard, generateHypothesisCardId } from "@/lib/brenner-loop/hypothesis";
import type {
  ExclusionTest,
  ExclusionTestCategory,
  TestFeasibility,
} from "@/lib/brenner-loop/operators/exclusion-test";
import {
  CATEGORY_DEFAULT_POWER,
  EXCLUSION_TEST_CATEGORY_LABELS,
  FEASIBILITY_LABELS,
  generateTestId,
} from "@/lib/brenner-loop/operators/exclusion-test";
import { upsertAssumptionLedger } from "@/lib/brenner-loop/storage";
import { addManualQueueItem } from "@/lib/brenner-loop/test-queue";
import { type AssumptionCriticality, generateAssumptionId } from "@/lib/schemas/assumption";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface HypothesisIntakeProps {
  /** Session ID for the hypothesis */
  sessionId: string;

  /** Sequence number for ID generation */
  sequence?: number;

  /** Callback when hypothesis is complete */
  onComplete: (hypothesis: HypothesisCard) => void;

  /** Callback when cancelled */
  onCancel?: () => void;

  /** Initial values for editing (optional) */
  initialValues?: Partial<IntakeFormData>;

  /** Optional callback with structured assumption ladder details */
  onAssumptionsCaptured?: (assumptions: AssumptionDraft[]) => void;

  /** Who is creating this hypothesis */
  createdBy?: string;

  /** Additional className */
  className?: string;
}

interface IntakeFormData {
  statement: string;
  mechanism: string;
  selectedMechanismType: string | null;
  domain: string[];
  predictionsIfTrue: string[];
  predictionsIfFalse: string[];
  impossibleIfTrue: string[];
  assumptions: string[];
  assumptionDetails: AssumptionDraft[];
  confidence: number;
}

export interface AssumptionDraft {
  id: string;
  statement: string;
  criticality: AssumptionCriticality;
  dependsOn: string[];
  testDrafts: ExclusionTest[];
}

type IntakeStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

// ============================================================================
// Constants
// ============================================================================

const STEPS: { number: IntakeStep; title: string; description: string }[] = [
  { number: 1, title: "Initial Statement", description: "Enter your hypothesis" },
  { number: 2, title: "Mechanism", description: "What specific mechanism are you proposing?" },
  {
    number: 3,
    title: "Predictions If True",
    description: "What would we observe if you're right?",
  },
  {
    number: 4,
    title: "Predictions If False",
    description: "What would we observe if you're wrong?",
  },
  { number: 5, title: "Falsification Conditions", description: "What would prove you wrong?" },
  { number: 6, title: "Assumptions", description: "What are you assuming is true?" },
  { number: 7, title: "Initial Confidence", description: "How confident are you?" },
];

/**
 * Sydney Brenner quotes relevant to each step of hypothesis formulation.
 * These appear to guide and encourage proper scientific thinking.
 */
const BRENNER_QUOTES: Record<IntakeStep, { quote: string; context: string }> = {
  1: {
    quote: "The purpose of a hypothesis is not to be right, but to be useful.",
    context: "A good hypothesis should be specific enough to test and clear enough to disprove.",
  },
  2: {
    quote: "Don't confuse the program with the interpreter.",
    context: "Be specific about the mechanism. What is the causal pathway you're proposing?",
  },
  3: {
    quote: "If the hypothesis is true, what would have to be true about the world?",
    context: "Strong predictions are specific, observable, and discriminative.",
  },
  4: {
    quote: "Consider seriously what would happen if you're wrong.",
    context: "Understanding what would be true if you're wrong helps design better tests.",
  },
  5: {
    quote: "A theory that cannot be refuted by any conceivable event is non-scientific.",
    context:
      "This is the most important step. If you can't specify what would prove you wrong, your hypothesis isn't testable yet.",
  },
  6: {
    quote: "Exclusion is always a tremendously good thing in science.",
    context: "Hidden assumptions are where bad hypotheses hide. Make them explicit.",
  },
  7: {
    quote: "High confidence should mean you've already thought about how you could be wrong.",
    context: "Be honest with yourself. Overconfidence is the enemy of good science.",
  },
};

/** Common mechanism types for quick selection */
const MECHANISM_TYPES = [
  { id: "exposure_outcome", label: "Exposure → Outcome", description: "Direct causal pathway" },
  { id: "mediation", label: "Mediating Variable", description: "A → B → C pathway" },
  { id: "moderation", label: "Moderation Effect", description: "A affects B, moderated by C" },
  { id: "feedback_loop", label: "Feedback Loop", description: "Bidirectional or recursive" },
  { id: "threshold", label: "Threshold Effect", description: "Effect only above/below threshold" },
  { id: "other", label: "Other", description: "Describe your own mechanism" },
];

const ASSUMPTION_CRITICALITY_OPTIONS: {
  value: AssumptionCriticality;
  label: string;
  hint: string;
}[] = [
  { value: "foundational", label: "Foundational", hint: "If wrong, hypothesis fails outright" },
  { value: "important", label: "Important", hint: "If wrong, hypothesis is weakened or narrowed" },
  { value: "minor", label: "Minor", hint: "If wrong, hypothesis needs small adjustment" },
];

const deriveAssumptionStatements = (assumptions: AssumptionDraft[]): string[] =>
  assumptions
    .map((assumption) => assumption.statement.trim())
    .filter((statement) => statement.length > 0);

const buildAssumptionDraftsFromStatements = (
  sessionId: string,
  statements: string[],
): AssumptionDraft[] => {
  const drafts: AssumptionDraft[] = [];
  for (const statement of statements) {
    const id = generateAssumptionId(
      sessionId,
      drafts.map((assumption) => assumption.id),
    );
    drafts.push({
      id,
      statement,
      criticality: "important",
      dependsOn: [],
      testDrafts: [],
    });
  }
  return drafts;
};

const persistAssumptionsToLedger = (sessionId: string, assumptions: AssumptionDraft[]): void => {
  const now = new Date().toISOString();
  const entries = assumptions.map((assumption) => ({
    id: assumption.id,
    statement: assumption.statement,
    criticality: assumption.criticality,
    dependsOn: assumption.dependsOn,
    createdAt: now,
    updatedAt: now,
  }));

  upsertAssumptionLedger(sessionId, entries);
};

const computeAssumptionCascadePreview = (
  assumptions: AssumptionDraft[],
  rootAssumptionId: string,
): { affectedAssumptionIds: string[]; byCriticality: Record<AssumptionCriticality, number> } => {
  const assumptionById = new Map(assumptions.map((assumption) => [assumption.id, assumption]));
  const dependents = new Map<string, string[]>();

  for (const assumption of assumptions) {
    for (const dependency of assumption.dependsOn) {
      const existing = dependents.get(dependency) ?? [];
      existing.push(assumption.id);
      dependents.set(dependency, existing);
    }
  }

  const visited = new Set<string>();
  const queue = [...(dependents.get(rootAssumptionId) ?? [])];

  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    if (!current || current === rootAssumptionId || visited.has(current)) continue;
    visited.add(current);
    const next = dependents.get(current);
    if (next && next.length > 0) {
      queue.push(...next);
    }
  }

  const byCriticality: Record<AssumptionCriticality, number> = {
    foundational: 0,
    important: 0,
    minor: 0,
  };

  for (const id of visited) {
    const assumption = assumptionById.get(id);
    if (!assumption) continue;
    byCriticality[assumption.criticality] += 1;
  }

  return { affectedAssumptionIds: Array.from(visited), byCriticality };
};

// ============================================================================
// Icons
// ============================================================================

const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
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

const PlusIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-4", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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

const LightBulbIcon = ({ className }: { className?: string }) => (
  <svg
    className={cn("size-5", className)}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
    />
  </svg>
);

const ExclamationTriangleIcon = ({ className }: { className?: string }) => (
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
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    />
  </svg>
);

// ============================================================================
// Progress Indicator
// ============================================================================

interface ProgressIndicatorProps {
  currentStep: IntakeStep;
  totalSteps: number;
  completedSteps: Set<IntakeStep>;
}

function ProgressIndicator({ currentStep, totalSteps, completedSteps }: ProgressIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((step, index) => {
        const isCompleted = completedSteps.has(step.number);
        const isCurrent = step.number === currentStep;
        const isPast = step.number < currentStep;

        return (
          <React.Fragment key={step.number}>
            <div className="flex flex-col items-center">
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                  backgroundColor:
                    isCompleted || isPast
                      ? "oklch(0.72 0.19 145)"
                      : isCurrent
                        ? "oklch(0.58 0.19 195)"
                        : "oklch(0.4 0 0)",
                }}
                className={cn(
                  "flex items-center justify-center size-8 rounded-full text-xs font-medium transition-colors",
                  (isCompleted || isPast) && "text-white",
                  isCurrent &&
                    "text-white ring-2 ring-offset-2 ring-offset-background ring-primary",
                  !isCompleted && !isCurrent && !isPast && "text-muted-foreground",
                )}
              >
                {isCompleted ? <CheckIcon className="size-4" /> : step.number}
              </motion.div>
              <span
                className={cn(
                  "text-xs mt-1 hidden sm:block max-w-[80px] text-center leading-tight",
                  isCurrent ? "text-foreground font-medium" : "text-muted-foreground",
                )}
              >
                {step.title}
              </span>
            </div>
            {index < totalSteps - 1 && (
              <div
                className={cn(
                  "h-0.5 w-6 sm:w-10 transition-colors",
                  isPast || (isCompleted && !isCurrent) ? "bg-[oklch(0.72_0.19_145)]" : "bg-muted",
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ============================================================================
// Brenner Quote Box
// ============================================================================

interface QuoteBoxProps {
  step: IntakeStep;
}

function QuoteBox({ step }: QuoteBoxProps) {
  const { quote, context } = BRENNER_QUOTES[step];

  return (
    <motion.div
      key={step}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-lg border border-primary/20 bg-primary/5 p-4"
    >
      <div className="flex items-start gap-3">
        <LightBulbIcon className="text-primary flex-shrink-0 mt-0.5" />
        <div>
          <blockquote className="text-sm font-medium italic text-foreground">
            &ldquo;{quote}&rdquo;
          </blockquote>
          <p className="text-xs text-muted-foreground mt-2">— {context}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// List Input Component (for predictions, falsification conditions)
// ============================================================================

interface ListInputProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  minItems?: number;
  addButtonText?: string;
  emptyMessage?: string;
  error?: string;
}

function ListInput({
  items,
  onChange,
  placeholder,
  minItems = 0,
  addButtonText = "Add item",
  emptyMessage = "No items yet",
  error,
}: ListInputProps) {
  const [newItem, setNewItem] = React.useState("");

  const addItem = () => {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()]);
      setNewItem("");
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addItem();
    }
  };

  return (
    <div className="space-y-3">
      {/* Input row */}
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          error={error && items.length < minItems ? error : undefined}
          className="flex-1"
        />
        <Button type="button" variant="outline" onClick={addItem} disabled={!newItem.trim()}>
          <PlusIcon className="size-4" />
          <span className="sr-only sm:not-sr-only sm:ml-1">{addButtonText}</span>
        </Button>
      </div>

      {/* Items list */}
      <AnimatePresence mode="popLayout">
        {items.length > 0 ? (
          <ul className="space-y-2">
            {items.map((item, index) => (
              <motion.li
                key={`${item}-${index}`}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10, height: 0 }}
                className="flex items-start gap-2 p-3 rounded-lg border border-border bg-card"
              >
                <span className="text-muted-foreground text-sm mt-0.5">{index + 1}.</span>
                <span className="flex-1 text-sm">{item}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  className="text-muted-foreground hover:text-destructive -mr-1 h-6 w-6 p-0"
                >
                  <XMarkIcon className="size-4" />
                </Button>
              </motion.li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic py-4 text-center">{emptyMessage}</p>
        )}
      </AnimatePresence>

      {minItems > 0 && items.length < minItems && (
        <p className="text-xs text-muted-foreground">
          Add at least {minItems} {minItems === 1 ? "item" : "items"}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Assumption Ladder Input Component
// ============================================================================

interface AssumptionLadderInputProps {
  sessionId: string;
  assumptions: AssumptionDraft[];
  onChange: (assumptions: AssumptionDraft[]) => void;
}

interface AssumptionDependencyMapProps {
  assumptions: AssumptionDraft[];
}

function AssumptionDependencyMap({ assumptions }: AssumptionDependencyMapProps) {
  const dependents = new Map<string, string[]>();

  for (const assumption of assumptions) {
    for (const dependency of assumption.dependsOn) {
      const existing = dependents.get(dependency) ?? [];
      existing.push(assumption.id);
      dependents.set(dependency, existing);
    }
  }

  if (assumptions.length <= 1) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Add at least two assumptions to visualize dependency links.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Dependency map
      </div>
      <div className="space-y-3">
        {assumptions.map((assumption) => {
          const upstream = assumption.dependsOn;
          const downstream = dependents.get(assumption.id) ?? [];
          const statementLabel = assumption.statement.trim() || "Untitled assumption";

          return (
            <div key={assumption.id} className="rounded-md border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">{assumption.id}</div>
                <span className="text-xs text-muted-foreground capitalize">
                  {assumption.criticality}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {statementLabel}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="text-xs">
                  <span className="font-medium text-muted-foreground">Depends on:</span>{" "}
                  {upstream.length === 0 ? (
                    <span className="text-muted-foreground">None</span>
                  ) : (
                    <span className="text-foreground">{upstream.join(", ")}</span>
                  )}
                </div>
                <div className="text-xs">
                  <span className="font-medium text-muted-foreground">Enables:</span>{" "}
                  {downstream.length === 0 ? (
                    <span className="text-muted-foreground">None</span>
                  ) : (
                    <span className="text-foreground">{downstream.join(", ")}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AssumptionLadderInput({ sessionId, assumptions, onChange }: AssumptionLadderInputProps) {
  const [draftingAssumptionId, setDraftingAssumptionId] = React.useState<string | null>(null);
  const [draftTest, setDraftTest] = React.useState<ExclusionTest | null>(null);
  const [draftError, setDraftError] = React.useState<string | null>(null);

  const startDraftTest = (assumption: AssumptionDraft) => {
    setDraftError(null);
    setDraftingAssumptionId(assumption.id);

    const statement = assumption.statement.trim();
    const label = statement.length > 0 ? statement.slice(0, 60) : assumption.id;

    setDraftTest({
      id: generateTestId(),
      name:
        statement.length > 0
          ? `Test: ${label}${statement.length > 60 ? "…" : ""}`
          : `Test ${assumption.id}`,
      description: statement.length > 0 ? `Discriminative test for assumption: ${statement}` : "",
      category: "custom",
      discriminativePower: CATEGORY_DEFAULT_POWER.custom,
      falsificationCondition: "",
      supportCondition: "",
      rationale: "",
      feasibility: "medium",
      isCustom: true,
    });
  };

  const cancelDraftTest = () => {
    setDraftingAssumptionId(null);
    setDraftTest(null);
    setDraftError(null);
  };

  const saveDraftTest = () => {
    if (!draftingAssumptionId || !draftTest) return;

    const name = draftTest.name.trim();
    const support = draftTest.supportCondition.trim();
    const falsification = draftTest.falsificationCondition.trim();
    const rationale = draftTest.rationale.trim();

    if (name.length === 0) {
      setDraftError("Test name is required.");
      return;
    }
    if (support.length === 0) {
      setDraftError("Add what you’d expect to observe if the assumption is true.");
      return;
    }
    if (falsification.length === 0) {
      setDraftError("Add what would convince you the assumption is false.");
      return;
    }
    if (rationale.length === 0) {
      setDraftError("Add a short rationale for why this test is discriminative.");
      return;
    }

    const cleaned: ExclusionTest = {
      ...draftTest,
      id: draftTest.id || generateTestId(),
      name,
      description: draftTest.description.trim(),
      supportCondition: support,
      falsificationCondition: falsification,
      rationale,
      feasibilityNotes: draftTest.feasibilityNotes?.trim() || undefined,
      isCustom: true,
    };

    updateAssumption(draftingAssumptionId, (assumption) => {
      const existing = Array.isArray(assumption.testDrafts) ? assumption.testDrafts : [];
      const withoutDupes = existing.filter((t) => t.id !== cleaned.id);
      return { ...assumption, testDrafts: [...withoutDupes, cleaned] };
    });

    cancelDraftTest();
  };

  const removeDraftTest = (assumptionId: string, testId: string) => {
    updateAssumption(assumptionId, (assumption) => ({
      ...assumption,
      testDrafts: assumption.testDrafts.filter((test) => test.id !== testId),
    }));
  };

  const addAssumption = () => {
    const id = generateAssumptionId(
      sessionId,
      assumptions.map((assumption) => assumption.id),
    );
    onChange([
      ...assumptions,
      {
        id,
        statement: "",
        criticality: "important",
        dependsOn: [],
        testDrafts: [],
      },
    ]);
  };

  const updateAssumption = (
    id: string,
    updater: (assumption: AssumptionDraft) => AssumptionDraft,
  ) => {
    onChange(
      assumptions.map((assumption) => (assumption.id === id ? updater(assumption) : assumption)),
    );
  };

  const removeAssumption = (id: string) => {
    const filtered = assumptions.filter((assumption) => assumption.id !== id);
    const cleaned = filtered.map((assumption) => ({
      ...assumption,
      dependsOn: assumption.dependsOn.filter((dependency) => dependency !== id),
    }));
    onChange(cleaned);
  };

  const toggleDependency = (assumptionId: string, dependencyId: string) => {
    updateAssumption(assumptionId, (assumption) => {
      const nextDependsOn = assumption.dependsOn.includes(dependencyId)
        ? assumption.dependsOn.filter((dep) => dep !== dependencyId)
        : [...assumption.dependsOn, dependencyId];
      return { ...assumption, dependsOn: nextDependsOn };
    });
  };

  if (assumptions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          No assumptions captured yet. Add at least one load-bearing assumption.
        </p>
        <Button type="button" variant="outline" onClick={addAssumption}>
          <PlusIcon className="size-4" />
          <span className="ml-2">Add assumption</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Use criticality to mark how load-bearing each assumption is. Dependencies reveal cascade
          risk.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={addAssumption}>
          <PlusIcon className="size-4" />
          <span className="ml-1">Add</span>
        </Button>
      </div>

      <div className="space-y-4">
        {assumptions.map((assumption, index) => {
          const otherAssumptions = assumptions.filter((item) => item.id !== assumption.id);
          const cascade = computeAssumptionCascadePreview(assumptions, assumption.id);
          const hasCascade = cascade.affectedAssumptionIds.length > 0;
          const criticalityHint = ASSUMPTION_CRITICALITY_OPTIONS.find(
            (option) => option.value === assumption.criticality,
          )?.hint;

          return (
            <div
              key={assumption.id}
              className="rounded-lg border border-border bg-card p-4 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <div className="text-xs text-muted-foreground">
                    Assumption {index + 1} · {assumption.id}
                  </div>
                  <Textarea
                    value={assumption.statement}
                    onChange={(e) =>
                      updateAssumption(assumption.id, (current) => ({
                        ...current,
                        statement: e.target.value,
                      }))
                    }
                    placeholder="Describe the assumption that must hold for this hypothesis."
                    rows={2}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAssumption(assumption.id)}
                  className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                >
                  <XMarkIcon className="size-4" />
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Criticality
                  </label>
                  <select
                    value={assumption.criticality}
                    onChange={(e) =>
                      updateAssumption(assumption.id, (current) => ({
                        ...current,
                        criticality: e.target.value as AssumptionCriticality,
                      }))
                    }
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                  >
                    {ASSUMPTION_CRITICALITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {criticalityHint && (
                    <p className="text-xs text-muted-foreground">{criticalityHint}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Depends On
                  </label>
                  {otherAssumptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Add another assumption to define dependencies.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {otherAssumptions.map((candidate) => (
                        <label key={candidate.id} className="flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={assumption.dependsOn.includes(candidate.id)}
                            onChange={() => toggleDependency(assumption.id, candidate.id)}
                            className="mt-0.5 h-4 w-4 rounded border-border"
                          />
                          <span className="flex-1">
                            <span className="font-medium">{candidate.id}</span>
                            <span className="block text-xs text-muted-foreground line-clamp-1">
                              {candidate.statement || "Untitled assumption"}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Assumption Tests
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Draft a discriminative test that could invalidate this assumption. Tests are
                      added to the Test Queue after you finish intake.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => startDraftTest(assumption)}
                  >
                    <PlusIcon className="size-4" />
                    <span className="ml-1">Draft test</span>
                  </Button>
                </div>

                {assumption.testDrafts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No tests drafted yet.</p>
                ) : (
                  <div className="space-y-2">
                    {assumption.testDrafts.map((test) => (
                      <div
                        key={test.id}
                        className="rounded-md border border-border bg-background px-3 py-2 flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{test.name}</div>
                          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                            <span>{EXCLUSION_TEST_CATEGORY_LABELS[test.category]}</span>
                            <span>Power: {test.discriminativePower}/5</span>
                            <span className="capitalize">{test.feasibility}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeDraftTest(assumption.id, test.id)}
                          aria-label={`Remove ${test.name}`}
                        >
                          <XMarkIcon className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {draftingAssumptionId === assumption.id && draftTest && (
                  <div className="rounded-lg border border-border bg-background p-4 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">Draft Test</div>
                      <Button type="button" variant="ghost" size="sm" onClick={cancelDraftTest}>
                        Cancel
                      </Button>
                    </div>

                    {draftError && (
                      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                        {draftError}
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Category
                        </Label>
                        <select
                          value={draftTest.category}
                          onChange={(e) => {
                            const category = e.target.value as ExclusionTestCategory;
                            setDraftTest((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    category,
                                    discriminativePower: CATEGORY_DEFAULT_POWER[category],
                                  }
                                : prev,
                            );
                          }}
                          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                        >
                          {Object.entries(EXCLUSION_TEST_CATEGORY_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Feasibility
                        </Label>
                        <select
                          value={draftTest.feasibility}
                          onChange={(e) => {
                            const feasibility = e.target.value as TestFeasibility;
                            setDraftTest((prev) => (prev ? { ...prev, feasibility } : prev));
                          }}
                          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                        >
                          {Object.entries(FEASIBILITY_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Test Name
                      </Label>
                      <Input
                        value={draftTest.name}
                        onChange={(e) =>
                          setDraftTest((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                        }
                        placeholder="Short descriptive name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Description (optional)
                      </Label>
                      <Textarea
                        value={draftTest.description}
                        onChange={(e) =>
                          setDraftTest((prev) =>
                            prev ? { ...prev, description: e.target.value } : prev,
                          )
                        }
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        If assumption is true… (support)
                      </Label>
                      <Textarea
                        value={draftTest.supportCondition}
                        onChange={(e) =>
                          setDraftTest((prev) =>
                            prev ? { ...prev, supportCondition: e.target.value } : prev,
                          )
                        }
                        rows={2}
                        placeholder="What would you expect to observe?"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        If assumption is false… (falsify)
                      </Label>
                      <Textarea
                        value={draftTest.falsificationCondition}
                        onChange={(e) =>
                          setDraftTest((prev) =>
                            prev ? { ...prev, falsificationCondition: e.target.value } : prev,
                          )
                        }
                        rows={2}
                        placeholder="What would force you to abandon the assumption?"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Rationale
                      </Label>
                      <Textarea
                        value={draftTest.rationale}
                        onChange={(e) =>
                          setDraftTest((prev) =>
                            prev ? { ...prev, rationale: e.target.value } : prev,
                          )
                        }
                        rows={2}
                        placeholder="Why is this test discriminative?"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={cancelDraftTest}>
                        Cancel
                      </Button>
                      <Button type="button" onClick={saveDraftTest}>
                        Save test
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                {hasCascade ? (
                  <>
                    Cascade impact: {cascade.affectedAssumptionIds.length} downstream assumption(s)
                    (foundational: {cascade.byCriticality.foundational}, important:{" "}
                    {cascade.byCriticality.important}, minor: {cascade.byCriticality.minor}).
                  </>
                ) : (
                  "Cascade impact: none (no downstream dependencies)."
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AssumptionDependencyMap assumptions={assumptions} />
    </div>
  );
}

// ============================================================================
// Confidence Slider Component
// ============================================================================

interface ConfidenceSliderProps {
  value: number;
  onChange: (value: number) => void;
}

function ConfidenceSlider({ value, onChange }: ConfidenceSliderProps) {
  const getConfidenceColor = (val: number) => {
    if (val < 20) return "bg-red-500";
    if (val < 40) return "bg-orange-500";
    if (val < 60) return "bg-yellow-500";
    if (val < 80) return "bg-lime-500";
    return "bg-green-500";
  };

  const getConfidenceLabel = (val: number) => {
    if (val < 20) return "Very speculative";
    if (val < 40) return "Interesting but untested";
    if (val < 60) return "Reasonable, some support";
    if (val < 80) return "Strong support";
    return "Near-certain (rare in science)";
  };

  return (
    <div className="space-y-4">
      {/* Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">0%</span>
          <span className="font-semibold text-lg">{value}%</span>
          <span className="text-muted-foreground">100%</span>
        </div>
        <div className="relative">
          <input
            type="range"
            min="0"
            max="100"
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value, 10))}
            className="w-full h-3 rounded-full appearance-none cursor-pointer bg-muted [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:shadow-lg"
          />
          {/* Progress fill */}
          <div
            className={cn(
              "absolute left-0 top-0 h-3 rounded-full pointer-events-none",
              getConfidenceColor(value),
            )}
            style={{ width: `${value}%` }}
          />
        </div>
      </div>

      {/* Label */}
      <div
        className={cn(
          "text-center p-3 rounded-lg",
          value < 20 && "bg-red-500/10 text-red-600",
          value >= 20 && value < 40 && "bg-orange-500/10 text-orange-600",
          value >= 40 && value < 60 && "bg-yellow-500/10 text-yellow-700 dark:text-yellow-500",
          value >= 60 && value < 80 && "bg-lime-500/10 text-lime-700 dark:text-lime-500",
          value >= 80 && "bg-green-500/10 text-green-600",
        )}
      >
        <span className="font-medium">{getConfidenceLabel(value)}</span>
      </div>

      {/* Warning for high confidence */}
      {value >= 80 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10"
        >
          <ExclamationTriangleIcon className="size-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-500">
            Confidence above 80% is rare in science. Make sure you&apos;ve thoroughly considered how
            you could be wrong before claiming near-certainty.
          </p>
        </motion.div>
      )}
    </div>
  );
}

// ============================================================================
// Step Content Components
// ============================================================================

interface StepContentProps {
  sessionId: string;
  formData: IntakeFormData;
  setFormData: React.Dispatch<React.SetStateAction<IntakeFormData>>;
  errors: Record<string, string>;
}

function Step1Content({ formData, setFormData, errors }: StepContentProps) {
  return (
    <div className="space-y-4">
      <Textarea
        label="Enter your hypothesis"
        value={formData.statement}
        onChange={(e) => setFormData((prev) => ({ ...prev, statement: e.target.value }))}
        placeholder="Social media usage among adolescents leads to increased rates of depression through the mechanism of social comparison..."
        hint="Be specific and testable. Avoid vague claims like 'X causes Y' without specificity."
        error={errors.statement}
        autoResize
        className="min-h-[150px]"
      />
      <p className="text-xs text-muted-foreground">{formData.statement.length}/1000 characters</p>
    </div>
  );
}

function Step2Content({ formData, setFormData, errors }: StepContentProps) {
  return (
    <div className="space-y-4">
      {/* Mechanism type selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">What type of mechanism are you proposing?</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MECHANISM_TYPES.map((mech) => (
            <button
              key={mech.id}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, selectedMechanismType: mech.id }))}
              className={cn(
                "p-3 rounded-lg border text-left transition-all",
                formData.selectedMechanismType === mech.id
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/30",
              )}
            >
              <div className="font-medium text-sm">{mech.label}</div>
              <div className="text-xs text-muted-foreground">{mech.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Mechanism description */}
      <Textarea
        label="Describe the specific mechanism"
        value={formData.mechanism}
        onChange={(e) => setFormData((prev) => ({ ...prev, mechanism: e.target.value }))}
        placeholder={
          formData.selectedMechanismType === "exposure_outcome"
            ? "e.g., 'Viewing curated social media content triggers upward social comparison, leading to decreased self-esteem and increased depressive symptoms'"
            : formData.selectedMechanismType === "mediation"
              ? "e.g., 'Social media → Social comparison → Self-esteem → Depression'"
              : "Describe the causal pathway you're proposing..."
        }
        hint="How would this work? What's the causal pathway?"
        error={errors.mechanism}
        autoResize
        className="min-h-[120px]"
      />
      <p className="text-xs text-muted-foreground">{formData.mechanism.length}/500 characters</p>
    </div>
  );
}

function Step3Content({ formData, setFormData, errors }: StepContentProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-1">
          If your hypothesis is CORRECT, what would we observe?
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Add specific, observable predictions. These should be things that MUST be true if
          you&apos;re right.
        </p>
      </div>

      <ListInput
        items={formData.predictionsIfTrue}
        onChange={(items) => setFormData((prev) => ({ ...prev, predictionsIfTrue: items }))}
        placeholder="e.g., 'Adolescents with higher social media use will report more frequent social comparisons'"
        minItems={1}
        addButtonText="Add"
        emptyMessage="Add at least one prediction"
        error={errors.predictionsIfTrue}
      />
    </div>
  );
}

function Step4Content({ formData, setFormData }: StepContentProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-1">
          If your hypothesis is WRONG, what would we observe?
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          These help identify what to look for to falsify your hypothesis. Optional but recommended.
        </p>
      </div>

      <ListInput
        items={formData.predictionsIfFalse}
        onChange={(items) => setFormData((prev) => ({ ...prev, predictionsIfFalse: items }))}
        placeholder="e.g., 'Social media users would show no correlation between usage and social comparison frequency'"
        addButtonText="Add"
        emptyMessage="No predictions added yet (optional)"
      />
    </div>
  );
}

function Step5Content({ formData, setFormData, errors }: StepContentProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-1">What observation would PROVE YOU WRONG?</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Not just weaken your hypothesis, but <strong>definitively rule it out</strong>. This is
          the most critical step.
        </p>
      </div>

      {/* Emphasis box */}
      <div className="p-4 rounded-lg border-2 border-dashed border-destructive/30 bg-destructive/5">
        <p className="text-sm font-medium text-destructive mb-2">
          If you can&apos;t answer this, your hypothesis isn&apos;t testable yet.
        </p>
        <p className="text-xs text-muted-foreground">
          Every scientific hypothesis must have falsification conditions. What evidence would force
          you to abandon this hypothesis entirely?
        </p>
      </div>

      <ListInput
        items={formData.impossibleIfTrue}
        onChange={(items) => setFormData((prev) => ({ ...prev, impossibleIfTrue: items }))}
        placeholder="e.g., 'If adolescents report decreased or unchanged social comparison despite heavy social media use'"
        minItems={1}
        addButtonText="Add"
        emptyMessage="Add at least one falsification condition"
        error={errors.impossibleIfTrue}
      />
    </div>
  );
}

function Step6Content({ formData, setFormData, errors, sessionId }: StepContentProps) {
  const assumptionCount = deriveAssumptionStatements(formData.assumptionDetails).length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-1">What assumptions does this hypothesis rest on?</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Capture the load-bearing assumptions. Set criticality and dependencies to surface cascade
          risk.
        </p>
      </div>

      <AssumptionLadderInput
        sessionId={sessionId}
        assumptions={formData.assumptionDetails}
        onChange={(assumptions) =>
          setFormData((prev) => ({
            ...prev,
            assumptionDetails: assumptions,
            assumptions: deriveAssumptionStatements(assumptions),
          }))
        }
      />

      {errors.assumptions && <p className="text-xs text-destructive">{errors.assumptions}</p>}

      <p className="text-xs text-muted-foreground">
        {assumptionCount === 0
          ? "Add at least one assumption before moving on."
          : `${assumptionCount} assumption${assumptionCount === 1 ? "" : "s"} captured so far.`}
      </p>
    </div>
  );
}

function Step7Content({ formData, setFormData }: StepContentProps) {
  const assumptionCount = deriveAssumptionStatements(formData.assumptionDetails).length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-1">How confident are you in this hypothesis?</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Be honest. This confidence will be updated as you gather evidence.
        </p>
      </div>

      <ConfidenceSlider
        value={formData.confidence}
        onChange={(val) => setFormData((prev) => ({ ...prev, confidence: val }))}
      />

      {/* Summary preview */}
      <div className="mt-6 p-4 rounded-lg border border-border bg-muted/30">
        <h4 className="text-sm font-medium mb-3">Hypothesis Summary</h4>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Statement: </span>
            <span className="line-clamp-2">{formData.statement || "Not entered"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Mechanism: </span>
            <span className="line-clamp-1">{formData.mechanism || "Not entered"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Predictions if true: </span>
            <span>{formData.predictionsIfTrue.length} item(s)</span>
          </div>
          <div>
            <span className="text-muted-foreground">Falsification conditions: </span>
            <span>{formData.impossibleIfTrue.length} item(s)</span>
          </div>
          <div>
            <span className="text-muted-foreground">Assumptions: </span>
            <span>{assumptionCount} item(s)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

const INITIAL_FORM_DATA: IntakeFormData = {
  statement: "",
  mechanism: "",
  selectedMechanismType: null,
  domain: [],
  predictionsIfTrue: [],
  predictionsIfFalse: [],
  impossibleIfTrue: [],
  assumptions: [],
  assumptionDetails: [],
  confidence: 50,
};

const normalizeAssumptionDrafts = (
  sessionId: string,
  drafts: AssumptionDraft[],
): AssumptionDraft[] => {
  const usedIds = new Set<string>();
  return drafts.map((draft) => {
    const id =
      draft.id && !usedIds.has(draft.id)
        ? draft.id
        : generateAssumptionId(sessionId, Array.from(usedIds));
    usedIds.add(id);
    return {
      id,
      statement: draft.statement ?? "",
      criticality: draft.criticality ?? "important",
      dependsOn: draft.dependsOn ?? [],
      testDrafts: Array.isArray(draft.testDrafts) ? draft.testDrafts : [],
    };
  });
};

const buildInitialFormData = (
  sessionId: string,
  initialValues?: Partial<IntakeFormData>,
): IntakeFormData => {
  const seeded = { ...INITIAL_FORM_DATA, ...initialValues };
  const assumptionDetails = initialValues?.assumptionDetails?.length
    ? normalizeAssumptionDrafts(sessionId, initialValues.assumptionDetails)
    : buildAssumptionDraftsFromStatements(sessionId, seeded.assumptions ?? []);

  return {
    ...seeded,
    assumptionDetails,
    assumptions: deriveAssumptionStatements(assumptionDetails),
  };
};

export function HypothesisIntake({
  sessionId,
  sequence = 1,
  onComplete,
  onCancel,
  initialValues,
  onAssumptionsCaptured,
  createdBy,
  className,
}: HypothesisIntakeProps) {
  const [currentStep, setCurrentStep] = React.useState<IntakeStep>(1);
  const [formData, setFormData] = React.useState<IntakeFormData>(() =>
    buildInitialFormData(sessionId, initialValues),
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [completedSteps, setCompletedSteps] = React.useState<Set<IntakeStep>>(new Set());
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Validate current step
  const validateStep = (step: IntakeStep): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1: {
        const trimmedStatement = formData.statement.trim();
        if (!trimmedStatement) {
          newErrors.statement = "Statement is required";
        } else if (trimmedStatement.length < 10) {
          newErrors.statement = "Statement must be at least 10 characters";
        } else if (trimmedStatement.length > 1000) {
          newErrors.statement = "Statement must be at most 1000 characters";
        }
        break;
      }

      case 2: {
        const trimmedMechanism = formData.mechanism.trim();
        if (!trimmedMechanism) {
          newErrors.mechanism = "Mechanism is required";
        } else if (trimmedMechanism.length < 10) {
          newErrors.mechanism = "Mechanism must be at least 10 characters";
        } else if (trimmedMechanism.length > 500) {
          newErrors.mechanism = "Mechanism must be at most 500 characters";
        }
        break;
      }

      case 3:
        if (formData.predictionsIfTrue.length === 0) {
          newErrors.predictionsIfTrue = "Add at least one prediction";
        }
        break;

      case 4:
        // Step 4 is optional, no validation required
        break;

      case 5:
        if (formData.impossibleIfTrue.length === 0) {
          newErrors.impossibleIfTrue = "Add at least one falsification condition";
        }
        break;

      case 6:
        if (deriveAssumptionStatements(formData.assumptionDetails).length === 0) {
          newErrors.assumptions = "Add at least one explicit assumption";
        }
        break;

      case 7:
        // Confidence is always valid (0-100 range enforced by slider)
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle next step
  const handleNext = () => {
    if (!validateStep(currentStep)) return;

    setCompletedSteps((prev) => new Set([...prev, currentStep]));

    if (currentStep < 7) {
      setCurrentStep((prev) => (prev + 1) as IntakeStep);
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as IntakeStep);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);

    try {
      // Generate hypothesis ID
      const id = generateHypothesisCardId(sessionId, sequence);
      const assumptionDrafts = formData.assumptionDetails
        .map((assumption) => ({
          ...assumption,
          statement: assumption.statement.trim(),
        }))
        .filter((assumption) => assumption.statement.length > 0);
      const assumptions = assumptionDrafts.map((assumption) => assumption.statement);

      // Create the hypothesis card
      const hypothesis = createHypothesisCard({
        id,
        statement: formData.statement,
        mechanism: formData.mechanism,
        domain: formData.domain,
        predictionsIfTrue: formData.predictionsIfTrue,
        predictionsIfFalse: formData.predictionsIfFalse,
        impossibleIfTrue: formData.impossibleIfTrue,
        assumptions,
        confidence: formData.confidence,
        createdBy,
        sessionId,
      });

      if (assumptionDrafts.length > 0) {
        try {
          persistAssumptionsToLedger(sessionId, assumptionDrafts);
        } catch (error) {
          console.error("Failed to persist assumption ledger:", error);
        }
      }

      const draftedTests = assumptionDrafts.flatMap((assumption) =>
        Array.isArray(assumption.testDrafts) ? assumption.testDrafts : [],
      );

      if (draftedTests.length > 0) {
        try {
          for (const assumption of assumptionDrafts) {
            for (const test of assumption.testDrafts) {
              const cleaned: ExclusionTest = {
                ...test,
                id: test.id || generateTestId(),
                name: test.name.trim(),
                description: test.description.trim(),
                falsificationCondition: test.falsificationCondition.trim(),
                supportCondition: test.supportCondition.trim(),
                rationale: test.rationale.trim(),
                feasibilityNotes: test.feasibilityNotes?.trim() || undefined,
                isCustom: true,
              };

              if (
                cleaned.name.length === 0 ||
                cleaned.supportCondition.length === 0 ||
                cleaned.falsificationCondition.length === 0 ||
                cleaned.rationale.length === 0
              ) {
                continue;
              }

              addManualQueueItem({
                sessionId,
                hypothesisId: id,
                assumptionIds: [assumption.id],
                test: cleaned,
                source: "manual",
              });
            }
          }
        } catch (error) {
          console.error("Failed to add assumption tests to Test Queue:", error);
        }
      }
      onAssumptionsCaptured?.(assumptionDrafts);

      // Call completion handler
      onComplete(hypothesis);
    } catch (error) {
      console.error("Failed to create hypothesis:", error);
      setErrors({
        submit: error instanceof Error ? error.message : "Failed to create hypothesis",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get step content
  const renderStepContent = () => {
    const props: StepContentProps = { formData, setFormData, errors, sessionId };

    switch (currentStep) {
      case 1:
        return <Step1Content {...props} />;
      case 2:
        return <Step2Content {...props} />;
      case 3:
        return <Step3Content {...props} />;
      case 4:
        return <Step4Content {...props} />;
      case 5:
        return <Step5Content {...props} />;
      case 6:
        return <Step6Content {...props} />;
      case 7:
        return <Step7Content {...props} />;
    }
  };

  const isLastStep = currentStep === 7;
  // Note: canProceed must match validation logic (use trim() for text fields)
  const canProceed =
    currentStep === 4 || // Step 4 is optional
    (currentStep === 1 && formData.statement.trim().length >= 10) ||
    (currentStep === 2 && formData.mechanism.trim().length >= 10) ||
    (currentStep === 3 && formData.predictionsIfTrue.length > 0) ||
    (currentStep === 5 && formData.impossibleIfTrue.length > 0) ||
    (currentStep === 6 && deriveAssumptionStatements(formData.assumptionDetails).length > 0) ||
    currentStep === 7;

  return (
    <div className={cn("max-w-2xl mx-auto", className)}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-center mb-6">Hypothesis Intake</h1>
        <ProgressIndicator
          currentStep={currentStep}
          totalSteps={7}
          completedSteps={completedSteps}
        />
      </div>

      {/* Step content */}
      <div className="space-y-6">
        {/* Brenner Quote */}
        <AnimatePresence mode="wait">
          <QuoteBox step={currentStep} />
        </AnimatePresence>

        {/* Step Title */}
        <div className="text-center">
          <h2 className="text-lg font-semibold">
            Step {currentStep}: {STEPS[currentStep - 1].title}
          </h2>
          <p className="text-sm text-muted-foreground">{STEPS[currentStep - 1].description}</p>
        </div>

        {/* Form Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="min-h-[300px]"
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>

        {/* Submit error */}
        {errors.submit && (
          <div className="p-3 rounded-lg border border-destructive bg-destructive/10 text-destructive text-sm">
            {errors.submit}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ChevronLeftIcon className="size-4" />
              <span className="hidden sm:inline ml-1">Previous</span>
            </Button>

            {isLastStep ? (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !canProceed}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="size-4 border-2 border-background border-t-transparent rounded-full"
                  />
                ) : (
                  <>
                    <CheckIcon className="size-4" />
                    <span className="ml-1">Create Hypothesis</span>
                  </>
                )}
              </Button>
            ) : (
              <Button type="button" onClick={handleNext} disabled={!canProceed}>
                <span className="hidden sm:inline mr-1">Next</span>
                <ChevronRightIcon className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HypothesisIntake;
