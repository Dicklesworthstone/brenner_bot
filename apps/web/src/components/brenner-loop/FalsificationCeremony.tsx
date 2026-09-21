"use client";

/**
 * Falsification Ceremony Component
 *
 * A dignified "death ceremony" UI for when a hypothesis is falsified.
 * Guides users through:
 * 1. Acknowledging the falsification
 * 2. Documenting what was learned
 * 3. Identifying successor hypotheses
 * 4. Writing an epitaph
 *
 * @see brenner_bot-an1n.7 (bead)
 */

import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { EvidenceEntry } from "@/lib/brenner-loop/evidence";
import {
  DEATH_TYPE_DESCRIPTIONS,
  DEATH_TYPE_ICONS,
  DEATH_TYPE_LABELS,
  type DeathType,
  type FalsificationLearning,
  getRandomBrennerQuote,
} from "@/lib/brenner-loop/graveyard";
import type { HypothesisCard } from "@/lib/brenner-loop/hypothesis";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface FalsificationCeremonyProps {
  /** The hypothesis being falsified */
  hypothesis: HypothesisCard;
  /** The evidence that killed the hypothesis */
  killingBlow: EvidenceEntry;
  /** Callback when ceremony is complete */
  onComplete: (result: FalsificationCeremonyResult) => void;
  /** Callback to cancel */
  onCancel?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export interface FalsificationCeremonyResult {
  deathType: DeathType;
  deathSummary: string;
  learning: FalsificationLearning;
  epitaph: string;
  brennerQuote: string;
  successorIdeas: string[];
}

type CeremonyStep = "acknowledge" | "classify" | "learn" | "epitaph" | "complete";

// ============================================================================
// Icons
// ============================================================================

function GravestoneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2C8 2 5 5 5 8v14h14V8c0-3-3-6-7-6z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h6M9 12h6M9 15h4" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

// ============================================================================
// Step Components
// ============================================================================

interface StepAcknowledgeProps {
  hypothesis: HypothesisCard;
  killingBlow: EvidenceEntry;
  onNext: () => void;
  onCancel?: () => void;
}

function StepAcknowledge({ hypothesis, killingBlow, onNext, onCancel }: StepAcknowledgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto size-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <GravestoneIcon className="size-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Hypothesis Falsified</h2>
        <p className="text-muted-foreground mt-1">This is not a failure. This is progress.</p>
      </div>

      {/* The hypothesis */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-2">The Hypothesis</p>
          <p className="font-medium text-foreground">{hypothesis.statement}</p>
        </CardContent>
      </Card>

      {/* The killing blow */}
      <Card className="border-warning/20 bg-warning/5">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-2">The Killing Blow</p>
          <p className="font-medium text-foreground">{killingBlow.observation}</p>
          <p className="text-sm text-muted-foreground mt-2">Test: {killingBlow.test.description}</p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={onNext} className="ml-auto gap-2">
          Begin Ceremony
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
    </motion.div>
  );
}

interface StepClassifyProps {
  deathType: DeathType | null;
  deathSummary: string;
  onDeathTypeChange: (type: DeathType) => void;
  onDeathSummaryChange: (summary: string) => void;
  onNext: () => void;
  onBack: () => void;
}

function StepClassify({
  deathType,
  deathSummary,
  onDeathTypeChange,
  onDeathSummaryChange,
  onNext,
  onBack,
}: StepClassifyProps) {
  const deathTypes: DeathType[] = [
    "direct_falsification",
    "mechanism_failure",
    "effect_size_collapse",
    "superseded",
    "unmeasurable",
    "scope_reduction",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-semibold text-foreground">How did it die?</h2>
        <p className="text-muted-foreground mt-1">
          Understanding the mode of failure helps extract the right lessons.
        </p>
      </div>

      {/* Death type selection */}
      <div className="grid gap-3">
        {deathTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onDeathTypeChange(type)}
            className={cn(
              "flex items-start gap-4 p-4 rounded-xl border text-left transition-all",
              deathType === type
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border hover:border-primary/30",
            )}
          >
            <span className="text-2xl">{DEATH_TYPE_ICONS[type]}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">{DEATH_TYPE_LABELS[type]}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {DEATH_TYPE_DESCRIPTIONS[type]}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Death summary */}
      <div className="space-y-2">
        <label htmlFor="death-summary" className="text-sm font-medium text-foreground">
          Brief summary of the falsification
        </label>
        <textarea
          id="death-summary"
          value={deathSummary}
          onChange={(e) => onDeathSummaryChange(e.target.value)}
          placeholder="Describe what happened in a sentence or two..."
          className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeftIcon className="size-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!deathType || deathSummary.trim().length < 10}
          className="gap-2"
        >
          Next
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
    </motion.div>
  );
}

interface StepLearnProps {
  learning: FalsificationLearning;
  successorIdeas: string[];
  onLearningChange: (learning: FalsificationLearning) => void;
  onSuccessorIdeasChange: (ideas: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

function StepLearn({
  learning,
  successorIdeas,
  onLearningChange,
  onSuccessorIdeasChange,
  onNext,
  onBack,
}: StepLearnProps) {
  const addLesson = () => {
    onLearningChange({
      ...learning,
      lessonsLearned: [...learning.lessonsLearned, ""],
    });
  };

  const updateLesson = (index: number, value: string) => {
    const updated = [...learning.lessonsLearned];
    updated[index] = value;
    onLearningChange({ ...learning, lessonsLearned: updated });
  };

  const removeLesson = (index: number) => {
    const updated = learning.lessonsLearned.filter((_, i) => i !== index);
    onLearningChange({ ...learning, lessonsLearned: updated });
  };

  const addSuccessor = () => {
    onSuccessorIdeasChange([...successorIdeas, ""]);
  };

  const updateSuccessor = (index: number, value: string) => {
    const updated = [...successorIdeas];
    updated[index] = value;
    onSuccessorIdeasChange(updated);
  };

  const removeSuccessor = (index: number) => {
    onSuccessorIdeasChange(successorIdeas.filter((_, i) => i !== index));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-semibold text-foreground">What did we learn?</h2>
        <p className="text-muted-foreground mt-1">Extract maximum value from this falsification.</p>
      </div>

      {/* Lessons Learned */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">Lessons Learned</label>
          <Button variant="outline" size="sm" onClick={addLesson}>
            + Add Lesson
          </Button>
        </div>

        {learning.lessonsLearned.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No lessons added yet. What did you learn from this failure?
          </p>
        ) : (
          <div className="space-y-2">
            {learning.lessonsLearned.map((lesson, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={lesson}
                  onChange={(e) => updateLesson(index, e.target.value)}
                  placeholder="What did you learn?"
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLesson(index)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Successor Ideas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">What should we try next?</label>
          <Button variant="outline" size="sm" onClick={addSuccessor}>
            + Add Idea
          </Button>
        </div>

        {successorIdeas.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No successor ideas yet. What hypotheses should emerge from this failure?
          </p>
        ) : (
          <div className="space-y-2">
            {successorIdeas.map((idea, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={idea}
                  onChange={(e) => updateSuccessor(index, e.target.value)}
                  placeholder="Describe a successor hypothesis..."
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSuccessor(index)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* What Remains Open */}
      <div className="space-y-2">
        <label htmlFor="remains-open" className="text-sm font-medium text-foreground">
          What questions remain open?
        </label>
        <textarea
          id="remains-open"
          value={learning.whatRemainsOpen.join("\n")}
          onChange={(e) =>
            onLearningChange({
              ...learning,
              whatRemainsOpen: e.target.value.split("\n").filter((s) => s.trim().length > 0),
            })
          }
          placeholder="One question per line..."
          className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeftIcon className="size-4" />
          Back
        </Button>
        <Button onClick={onNext} className="gap-2">
          Next
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
    </motion.div>
  );
}

interface StepEpitaphProps {
  deathType: DeathType;
  epitaph: string;
  brennerQuote: string;
  onEpitaphChange: (epitaph: string) => void;
  onBrennerQuoteChange: (quote: string) => void;
  onComplete: () => void;
  onBack: () => void;
}

function StepEpitaph({
  deathType,
  epitaph,
  brennerQuote,
  onEpitaphChange,
  onBrennerQuoteChange,
  onComplete,
  onBack,
}: StepEpitaphProps) {
  const refreshQuote = () => {
    onBrennerQuoteChange(getRandomBrennerQuote(deathType));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-semibold text-foreground">Write the Epitaph</h2>
        <p className="text-muted-foreground mt-1">
          A final summary for the graveyard. What should future you remember?
        </p>
      </div>

      {/* Brenner Quote */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Brenner says:</p>
              <p className="italic text-foreground">&ldquo;{brennerQuote}&rdquo;</p>
            </div>
            <Button variant="ghost" size="sm" onClick={refreshQuote}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Epitaph */}
      <div className="space-y-2">
        <label htmlFor="epitaph" className="text-sm font-medium text-foreground">
          Your epitaph for this hypothesis
        </label>
        <textarea
          id="epitaph"
          value={epitaph}
          onChange={(e) => onEpitaphChange(e.target.value)}
          placeholder="In a few sentences, what should be remembered about this hypothesis and its failure?"
          className="w-full min-h-[120px] px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ChevronLeftIcon className="size-4" />
          Back
        </Button>
        <Button onClick={onComplete} className="gap-2">
          Archive to Graveyard
          <GravestoneIcon className="size-4" />
        </Button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function FalsificationCeremony({
  hypothesis,
  killingBlow,
  onComplete,
  onCancel,
  className,
}: FalsificationCeremonyProps) {
  const [step, setStep] = React.useState<CeremonyStep>("acknowledge");
  const [deathType, setDeathType] = React.useState<DeathType | null>(null);
  const [deathSummary, setDeathSummary] = React.useState("");
  const [learning, setLearning] = React.useState<FalsificationLearning>({
    lessonsLearned: [],
    whatWeNowKnow: [],
    whatRemainsOpen: [],
    suggestedNextSteps: [],
  });
  const [successorIdeas, setSuccessorIdeas] = React.useState<string[]>([]);
  const [epitaph, setEpitaph] = React.useState("");
  const [brennerQuote, setBrennerQuote] = React.useState("");

  // Initialize Brenner quote when death type is selected
  React.useEffect(() => {
    if (deathType && !brennerQuote) {
      setBrennerQuote(getRandomBrennerQuote(deathType));
    }
  }, [deathType, brennerQuote]);

  const handleComplete = () => {
    if (!deathType) return;

    onComplete({
      deathType,
      deathSummary,
      learning,
      epitaph,
      brennerQuote,
      successorIdeas: successorIdeas.filter((s) => s.trim().length > 0),
    });
  };

  return (
    <div className={cn("max-w-2xl mx-auto", className)}>
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {(["acknowledge", "classify", "learn", "epitaph"] as CeremonyStep[]).map((s, i) => (
          <React.Fragment key={s}>
            <div
              className={cn(
                "size-3 rounded-full transition-colors",
                step === s
                  ? "bg-primary"
                  : ["acknowledge", "classify", "learn", "epitaph"].indexOf(step) > i
                    ? "bg-primary/50"
                    : "bg-muted",
              )}
            />
            {i < 3 && <div className="w-8 h-0.5 bg-muted" />}
          </React.Fragment>
        ))}
      </div>

      {/* Steps */}
      <AnimatePresence mode="wait">
        {step === "acknowledge" && (
          <StepAcknowledge
            key="acknowledge"
            hypothesis={hypothesis}
            killingBlow={killingBlow}
            onNext={() => setStep("classify")}
            onCancel={onCancel}
          />
        )}

        {step === "classify" && (
          <StepClassify
            key="classify"
            deathType={deathType}
            deathSummary={deathSummary}
            onDeathTypeChange={setDeathType}
            onDeathSummaryChange={setDeathSummary}
            onNext={() => setStep("learn")}
            onBack={() => setStep("acknowledge")}
          />
        )}

        {step === "learn" && (
          <StepLearn
            key="learn"
            learning={learning}
            successorIdeas={successorIdeas}
            onLearningChange={setLearning}
            onSuccessorIdeasChange={setSuccessorIdeas}
            onNext={() => setStep("epitaph")}
            onBack={() => setStep("classify")}
          />
        )}

        {step === "epitaph" && deathType && (
          <StepEpitaph
            key="epitaph"
            deathType={deathType}
            epitaph={epitaph}
            brennerQuote={brennerQuote}
            onEpitaphChange={setEpitaph}
            onBrennerQuoteChange={setBrennerQuote}
            onComplete={handleComplete}
            onBack={() => setStep("learn")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
