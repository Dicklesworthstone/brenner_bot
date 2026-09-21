"use client";

/**
 * Session Dashboard Component
 *
 * Main dashboard layout for active Brenner Loop sessions.
 * Displays phase timeline, current phase content, hypothesis card,
 * and Brenner quote sidebar.
 *
 * @see brenner_bot-reew.1 (bead)
 * @module components/brenner-loop/SessionDashboard
 */

import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Skeleton, SkeletonButton, SkeletonCard } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { useAsyncOperation } from "@/hooks/useAsyncOperation";
import {
  type AlternativeSystem,
  exportSession,
  getSessionProgress,
  type HypothesisCard as HypothesisCardModel,
  type LevelIdentification,
  PHASE_ORDER,
  type ScaleCalculation,
  type Session,
  type EvidenceEntry as SessionEvidenceEntry,
  type ExclusionTestResult as SessionExclusionTestResult,
  type LevelSplitResult as SessionLevelSplitResult,
  type ObjectTransposeResult as SessionObjectTransposeResult,
  type SessionPhase,
  type ScaleCheckResult as SessionScaleCheckResult,
  usePhaseNavigation,
  useSession,
  useSessionMachine,
} from "@/lib/brenner-loop";
import {
  type EvidenceEntry as FullEvidenceEntry,
  isEvidenceEntry,
} from "@/lib/brenner-loop/evidence";
import type { ExclusionTestResult as UiExclusionTestResult } from "@/lib/brenner-loop/operators/exclusion-test";
import type { LevelSplitResult as UiLevelSplitResult } from "@/lib/brenner-loop/operators/level-split";
import type {
  AlternativeExplanation as UiAlternativeExplanation,
  ObjectTransposeResult as UiObjectTransposeResult,
} from "@/lib/brenner-loop/operators/object-transpose";
import type { ScaleCheckResult as UiScaleCheckResult } from "@/lib/brenner-loop/operators/scale-check";
import { cn } from "@/lib/utils";
import { AgentTribunalPanel } from "./agents/AgentTribunalPanel";
import { ObjectionRegisterPanel } from "./agents/ObjectionRegisterPanel";
import { CorpusSearchDialog } from "./CorpusSearch";
import { ConfidenceChart } from "./evidence/ConfidenceChart";
import { EvidenceTimeline } from "./evidence/EvidenceTimeline";
import { HypothesisCard } from "./HypothesisCard";
import { HypothesisIntake } from "./HypothesisIntake";
import { ExclusionTestSession } from "./operators/ExclusionTestSession";
import { LevelSplitSession } from "./operators/LevelSplitSession";
import { ObjectTransposeSession } from "./operators/ObjectTransposeSession";
import { ScaleCheckSession } from "./operators/ScaleCheckSession";
import { PhaseTimeline } from "./PhaseTimeline";

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

const SearchIcon = ({ className }: { className?: string }) => (
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
      d="m21 21-4.35-4.35m0 0A7.5 7.5 0 1 0 6 6a7.5 7.5 0 0 0 10.65 10.65Z"
    />
  </svg>
);

const DocumentIcon = ({ className }: { className?: string }) => (
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
      d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
    />
  </svg>
);

const CodeBracketIcon = ({ className }: { className?: string }) => (
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
      d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
    />
  </svg>
);

// ============================================================================
// Phase Configuration
// ============================================================================

interface PhaseConfig {
  name: string;
  shortName: string;
  symbol?: string;
  description: string;
  quote?: {
    text: string;
    anchor: string;
  };
}

const PHASE_CONFIG: Record<SessionPhase, PhaseConfig> = {
  intake: {
    name: "Hypothesis Intake",
    shortName: "Intake",
    description: "Enter your initial hypothesis and research question.",
    quote: {
      text: "The secret of asking the right question is just to know what question to ask.",
      anchor: "§23",
    },
  },
  sharpening: {
    name: "Hypothesis Sharpening",
    shortName: "Sharpening",
    description: "Refine your hypothesis with predictions and falsification conditions.",
    quote: {
      text: "You have to sharpen your hypothesis to the point where it makes a unique prediction.",
      anchor: "§89",
    },
  },
  level_split: {
    name: "Level Split",
    shortName: "Levels",
    symbol: "⊘",
    description: "Identify different levels of explanation that might be conflated.",
    quote: {
      text: "The confusion of levels is the most profound error in biology.",
      anchor: "§147",
    },
  },
  exclusion_test: {
    name: "Exclusion Test",
    shortName: "Exclude",
    symbol: "✂",
    description: "Design tests that could definitively rule out your hypothesis.",
    quote: {
      text: "Not merely unlikely—impossible if the alternative is true.",
      anchor: "§89",
    },
  },
  object_transpose: {
    name: "Object Transpose",
    shortName: "Transpose",
    symbol: "⟂",
    description: "Consider alternative experimental systems or reference frames.",
    quote: {
      text: "Change the object. Use a different experimental system where the problem is cleaner.",
      anchor: "§112",
    },
  },
  scale_check: {
    name: "Scale Check",
    shortName: "Scale",
    symbol: "⊞",
    description: "Verify physical and mathematical plausibility.",
    quote: {
      text: "Before you start, do your sums.",
      anchor: "§58",
    },
  },
  agent_dispatch: {
    name: "Agent Dispatch",
    shortName: "Agents",
    description: "Send hypothesis to AI agents for analysis.",
    quote: {
      text: "Get multiple perspectives before committing to a path.",
      anchor: "§200",
    },
  },
  synthesis: {
    name: "Synthesis",
    shortName: "Synthesis",
    description: "Synthesize agent responses and identify consensus.",
    quote: {
      text: "Listen to the disagreements—that's where the interesting problems hide.",
      anchor: "§215",
    },
  },
  evidence_gathering: {
    name: "Evidence Gathering",
    shortName: "Evidence",
    description: "Execute tests and collect evidence.",
    quote: {
      text: "The experiment must be potent—capable of excluding.",
      anchor: "§134",
    },
  },
  revision: {
    name: "Revision",
    shortName: "Revision",
    description: "Revise hypothesis based on evidence.",
    quote: {
      text: "If the evidence contradicts your hypothesis, change your hypothesis.",
      anchor: "§178",
    },
  },
  complete: {
    name: "Complete",
    shortName: "Done",
    description: "Session complete. Generate research brief.",
    quote: {
      text: "The goal is not to be right, but to be less wrong.",
      anchor: "§256",
    },
  },
};

// ============================================================================
// BrennerQuote Component
// ============================================================================

interface BrennerQuoteProps {
  phase: SessionPhase;
  className?: string;
}

function BrennerQuote({ phase, className }: BrennerQuoteProps) {
  const config = PHASE_CONFIG[phase];

  if (!config.quote) return null;

  return (
    <Card className={cn("bg-muted/50", className)}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-2">
          <span className="text-2xl leading-none" aria-hidden="true">
            &ldquo;
          </span>
          <div className="flex-1">
            <blockquote className="text-sm italic text-muted-foreground">
              {config.quote.text}
            </blockquote>
            <footer className="mt-2 text-xs text-muted-foreground/70">
              — Sydney Brenner, {config.quote.anchor}
            </footer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// PhaseContent Component
// ============================================================================

interface PhaseContentProps {
  phase: SessionPhase;
  className?: string;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return (
    target.closest(
      'input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"]',
    ) !== null
  );
}

function ShortcutRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

function getAppliedBy(session: Session | null): string {
  const candidate = session?.createdBy?.trim() ?? "";
  return candidate.length > 0 ? candidate : "user";
}

function toDiscriminativePower_0_3(power_1_5: number): number {
  if (!Number.isFinite(power_1_5)) return 0;
  const clamped = Math.max(1, Math.min(5, Math.round(power_1_5)));
  if (clamped <= 2) return 1;
  if (clamped === 3) return 2;
  return 3;
}

function toSessionLevelSplitResult(args: {
  result: UiLevelSplitResult;
  hypothesisId: string;
  appliedAt: string;
  appliedBy: string;
}): SessionLevelSplitResult {
  const selectedX = args.result.xLevels.filter((level) => level.selected);
  const selectedY = args.result.yLevels.filter((level) => level.selected);

  const levels: LevelIdentification[] = [
    ...selectedX.map(
      (level): LevelIdentification => ({
        name: `X: ${level.name}`,
        description: `${level.description} (category: ${level.category})`,
        hypothesisIds: [args.hypothesisId],
        levelType: "unclear",
      }),
    ),
    ...selectedY.map(
      (level): LevelIdentification => ({
        name: `Y: ${level.name}`,
        description: `${level.description} (category: ${level.category})`,
        hypothesisIds: [args.hypothesisId],
        levelType: "unclear",
      }),
    ),
  ];

  const conflationDetected = selectedX.length > 1 || selectedY.length > 1;
  const conflationDescription = conflationDetected
    ? `Selected ${selectedX.length} X levels and ${selectedY.length} Y levels; hypothesis may conflate multiple explanatory levels.`
    : undefined;

  return {
    appliedAt: args.appliedAt,
    appliedBy: args.appliedBy,
    levels,
    conflationDetected,
    conflationDescription,
  };
}

function toSessionExclusionTestResult(args: {
  result: UiExclusionTestResult;
  hypothesisId: string;
  appliedAt: string;
  appliedBy: string;
}): SessionExclusionTestResult {
  const selectedIds = new Set(args.result.selectedTestIds ?? []);
  const designedTests = (args.result.generatedTests ?? []).map((test) => ({
    name: test.name,
    procedure: test.description,
    couldExclude: [args.hypothesisId],
    discriminativePower: toDiscriminativePower_0_3(test.discriminativePower),
  }));

  const rejectedTests = (args.result.generatedTests ?? [])
    .filter((test) => !selectedIds.has(test.id))
    .map((test) => ({ name: test.name, reason: "Not selected" }));

  return {
    appliedAt: args.appliedAt,
    appliedBy: args.appliedBy,
    designedTests,
    rejectedTests,
    notes: args.result.testsForSession?.length
      ? `Selected ${args.result.testsForSession.length} test(s) for session recording.`
      : undefined,
  };
}

function pickObjectTransposeSelection(
  alternatives: UiAlternativeExplanation[],
): UiAlternativeExplanation | null {
  const selected = alternatives.find((alt) => alt.selected);
  if (selected) return selected;

  const withPlausibility = alternatives.filter((alt) => typeof alt.plausibility === "number");
  if (withPlausibility.length === 0) return null;

  let best: UiAlternativeExplanation | null = null;
  let bestScore = -Infinity;

  for (const alt of withPlausibility) {
    const score = alt.plausibility ?? 0;
    if (score > bestScore) {
      bestScore = score;
      best = alt;
    }
  }

  return best;
}

function toSessionObjectTransposeResult(args: {
  result: UiObjectTransposeResult;
  hypothesisStatement: string;
  appliedAt: string;
  appliedBy: string;
}): SessionObjectTransposeResult {
  const alternatives = args.result.alternatives ?? [];
  const selection = pickObjectTransposeSelection(alternatives);

  const alternativeSystems: AlternativeSystem[] = alternatives.map((alt) => ({
    name: alt.name,
    pros: alt.implications.length > 0 ? alt.implications : [alt.description],
    cons: [],
  }));

  return {
    appliedAt: args.appliedAt,
    appliedBy: args.appliedBy,
    originalSystem: args.hypothesisStatement,
    alternativeSystems,
    selectedSystem: selection?.name,
    selectionRationale: selection?.description,
    notes:
      alternatives.length > 0
        ? `Generated ${alternatives.length} alternative explanation(s).`
        : undefined,
  };
}

function toScaleCalculation(args: {
  name: string;
  quantities: string;
  result: string;
  units: string;
  implication: string;
}): ScaleCalculation {
  return {
    name: args.name,
    quantities: args.quantities,
    result: args.result,
    units: args.units,
    implication: args.implication,
  };
}

function toSessionScaleCheckResult(args: {
  result: UiScaleCheckResult;
  hypothesisId: string;
  appliedAt: string;
  appliedBy: string;
}): SessionScaleCheckResult {
  const effect = args.result.effectSize;
  const context = args.result.contextComparison;
  const precision = args.result.measurementAssessment;
  const practical = args.result.practicalSignificance;

  const calculations: ScaleCalculation[] = [
    toScaleCalculation({
      name: "Effect size",
      quantities: `direction: ${effect.direction}`,
      result:
        typeof effect.value === "number"
          ? effect.value.toString()
          : (effect.estimate ?? "unspecified"),
      units: effect.type,
      implication:
        context.warnings.length > 0
          ? context.warnings.join(" ")
          : context.insights.length > 0
            ? context.insights.join(" ")
            : `Relative to norms: ${context.relativeToNorm}.`,
    }),
    ...(typeof context.varianceExplained === "number"
      ? [
          toScaleCalculation({
            name: "Variance explained",
            quantities: "r² × 100",
            result: context.varianceExplained.toString(),
            units: "%",
            implication:
              context.relativeToNorm === "below_typical"
                ? "Small explanatory power; may be hard to detect or act on."
                : "Meaningful explanatory power in context.",
          }),
        ]
      : []),
    ...(typeof precision.minimumDetectableEffect === "number"
      ? [
          toScaleCalculation({
            name: "Minimum detectable effect",
            quantities: "design + noise floor",
            result: precision.minimumDetectableEffect.toString(),
            units: effect.type,
            implication:
              precision.isDetectable === false
                ? "Claimed effect may be below detection threshold."
                : "Effect appears detectable with appropriate design.",
          }),
        ]
      : []),
    ...(typeof precision.requiredSampleSize === "number"
      ? [
          toScaleCalculation({
            name: "Required sample size",
            quantities: "power target → N",
            result: precision.requiredSampleSize.toString(),
            units: "samples",
            implication: "Use as a feasibility sanity check for proposed studies.",
          }),
        ]
      : []),
    toScaleCalculation({
      name: "Practical significance",
      quantities: "stakeholders + threshold",
      result:
        practical.isPracticallyMeaningful === null
          ? "unknown"
          : practical.isPracticallyMeaningful
            ? "meaningful"
            : "not meaningful",
      units: "",
      implication:
        practical.reasoning.length > 0
          ? practical.reasoning
          : "Assess whether the effect would change decisions.",
    }),
  ];

  const plausible = args.result.overallPlausibility === "plausible";
  const ruledOutByScale =
    args.result.overallPlausibility === "implausible" ? [args.hypothesisId] : [];

  return {
    appliedAt: args.appliedAt,
    appliedBy: args.appliedBy,
    calculations,
    plausible,
    ruledOutByScale,
    notes: args.result.summaryNotes?.trim() ? args.result.summaryNotes.trim() : undefined,
  };
}

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function joinLines(values: string[] | undefined): string {
  if (!values || values.length === 0) return "";
  return values.join("\n");
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function HypothesisEditorPanel({
  mode,
  hypothesis,
  onSave,
}: {
  mode: "sharpening" | "revision";
  hypothesis: HypothesisCardModel | null;
  onSave: (updates: Partial<HypothesisCardModel>) => void;
}) {
  const [statement, setStatement] = React.useState(hypothesis?.statement ?? "");
  const [mechanism, setMechanism] = React.useState(hypothesis?.mechanism ?? "");
  const [predictionsIfTrue, setPredictionsIfTrue] = React.useState(
    joinLines(hypothesis?.predictionsIfTrue),
  );
  const [predictionsIfFalse, setPredictionsIfFalse] = React.useState(
    joinLines(hypothesis?.predictionsIfFalse),
  );
  const [falsifiers, setFalsifiers] = React.useState(joinLines(hypothesis?.impossibleIfTrue));
  const [assumptions, setAssumptions] = React.useState(joinLines(hypothesis?.assumptions));
  const [confidence, setConfidence] = React.useState<number>(hypothesis?.confidence ?? 0);

  React.useEffect(() => {
    setStatement(hypothesis?.statement ?? "");
    setMechanism(hypothesis?.mechanism ?? "");
    setPredictionsIfTrue(joinLines(hypothesis?.predictionsIfTrue));
    setPredictionsIfFalse(joinLines(hypothesis?.predictionsIfFalse));
    setFalsifiers(joinLines(hypothesis?.impossibleIfTrue));
    setAssumptions(joinLines(hypothesis?.assumptions));
    setConfidence(hypothesis?.confidence ?? 0);
  }, [hypothesis?.id, mode]);

  const handleSave = React.useCallback(() => {
    onSave({
      statement: statement.trim(),
      mechanism: mechanism.trim(),
      predictionsIfTrue: splitLines(predictionsIfTrue),
      predictionsIfFalse: splitLines(predictionsIfFalse),
      impossibleIfTrue: splitLines(falsifiers),
      assumptions: splitLines(assumptions),
      confidence: clampConfidence(confidence),
    });
  }, [
    assumptions,
    confidence,
    falsifiers,
    mechanism,
    onSave,
    predictionsIfFalse,
    predictionsIfTrue,
    statement,
  ]);

  if (!hypothesis) {
    return <p className="text-sm text-muted-foreground">No hypothesis loaded.</p>;
  }

  return (
    <div className="space-y-6" data-testid={`hypothesis-${mode}-editor`}>
      <div className="space-y-2 text-sm text-muted-foreground">
        {mode === "sharpening" ? (
          <p>Sharpen the hypothesis by tightening mechanisms, predictions, and falsifiers.</p>
        ) : (
          <p>Revise the hypothesis in light of evidence and agent feedback.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${mode}-statement`}>Statement</Label>
        <Textarea
          id={`${mode}-statement`}
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          placeholder="State the hypothesis in a single crisp sentence."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${mode}-mechanism`}>Mechanism</Label>
        <Textarea
          id={`${mode}-mechanism`}
          value={mechanism}
          onChange={(e) => setMechanism(e.target.value)}
          placeholder="What causal mechanism generates the effect?"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${mode}-pred-true`}>Predictions if true (one per line)</Label>
          <Textarea
            id={`${mode}-pred-true`}
            value={predictionsIfTrue}
            onChange={(e) => setPredictionsIfTrue(e.target.value)}
            placeholder={"If true, we should observe...\n(one prediction per line)"}
            className="min-h-[140px]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-pred-false`}>Predictions if false (one per line)</Label>
          <Textarea
            id={`${mode}-pred-false`}
            value={predictionsIfFalse}
            onChange={(e) => setPredictionsIfFalse(e.target.value)}
            placeholder={"If false, we should observe...\n(one prediction per line)"}
            className="min-h-[140px]"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${mode}-falsifiers`}>Would falsify (one per line)</Label>
        <Textarea
          id={`${mode}-falsifiers`}
          value={falsifiers}
          onChange={(e) => setFalsifiers(e.target.value)}
          placeholder={
            "What observation would make the hypothesis impossible?\n(one falsifier per line)"
          }
          className="min-h-[120px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${mode}-assumptions`}>Explicit assumptions (one per line)</Label>
        <Textarea
          id={`${mode}-assumptions`}
          value={assumptions}
          onChange={(e) => setAssumptions(e.target.value)}
          placeholder={
            "What must be true for this hypothesis to even make sense?\n(one assumption per line)"
          }
          className="min-h-[120px]"
        />
      </div>

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <Label htmlFor={`${mode}-confidence`}>Confidence (0–100)</Label>
          <Input
            id={`${mode}-confidence`}
            type="number"
            min={0}
            max={100}
            value={confidence}
            onChange={(e) => setConfidence(Number.parseInt(e.target.value || "0", 10))}
            className="w-28"
          />
        </div>

        <Button type="button" onClick={handleSave} data-testid={`hypothesis-${mode}-save`}>
          {mode === "revision" ? "Save revision" : "Save sharpening"}
        </Button>
      </div>
    </div>
  );
}

function PhaseContent({ phase, className }: PhaseContentProps) {
  const config = PHASE_CONFIG[phase];
  const { session, primaryHypothesis, updateHypothesis, advancePhase, appendOperatorApplication } =
    useSession();

  const appliedBy = React.useMemo(() => getAppliedBy(session), [session]);

  // Normalize evidence ledger entries for visualization
  const evidenceEntries = React.useMemo<FullEvidenceEntry[]>(() => {
    const ledger = session?.evidenceLedger ?? [];
    if (ledger.length === 0) return [];

    const clampConfidence = (value: number) => Math.min(100, Math.max(0, value));
    const coerceDate = (value: string | Date | undefined) => {
      if (value instanceof Date) return value;
      const parsed = new Date(value ?? "");
      return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    const initialConfidence = primaryHypothesis?.confidence ?? 50;
    let runningConfidence = initialConfidence;

    const sorted = [...ledger].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    );

    return sorted.map((entry) => {
      if (isEvidenceEntry(entry)) {
        runningConfidence = entry.confidenceAfter;
        return entry;
      }

      const simplified = entry as SessionEvidenceEntry;
      const delta = typeof simplified.confidenceDelta === "number" ? simplified.confidenceDelta : 0;
      const confidenceBefore = runningConfidence;
      const confidenceAfter = clampConfidence(confidenceBefore + delta);
      runningConfidence = confidenceAfter;

      const testId =
        typeof simplified.testId === "string" && simplified.testId.trim().length > 0
          ? simplified.testId
          : "unknown";

      return {
        id: simplified.id,
        sessionId: session?.id ?? "unknown",
        hypothesisVersion: simplified.matchedHypothesisId ?? primaryHypothesis?.id ?? "unknown",
        test: {
          id: testId,
          description: `Test ${testId}`,
          type: "observation",
          discriminativePower: 3,
        },
        predictionIfTrue: "",
        predictionIfFalse: "",
        result: simplified.result ?? "inconclusive",
        observation: simplified.observation ?? "",
        source: simplified.rawDataRef ?? undefined,
        confidenceBefore,
        confidenceAfter,
        interpretation: simplified.notes ?? "",
        recordedAt: coerceDate(simplified.recordedAt),
        recordedBy: simplified.recordedBy ?? undefined,
        notes: simplified.notes ?? undefined,
      };
    });
  }, [session?.evidenceLedger, session?.id, primaryHypothesis?.confidence, primaryHypothesis?.id]);

  const handleIntakeComplete = React.useCallback(
    (hypothesis: {
      statement: string;
      mechanism: string;
      domain: string[];
      predictionsIfTrue: string[];
      predictionsIfFalse: string[];
      impossibleIfTrue: string[];
      assumptions: string[];
      confidence: number;
    }) => {
      updateHypothesis({
        statement: hypothesis.statement,
        mechanism: hypothesis.mechanism,
        domain: hypothesis.domain,
        predictionsIfTrue: hypothesis.predictionsIfTrue,
        predictionsIfFalse: hypothesis.predictionsIfFalse,
        impossibleIfTrue: hypothesis.impossibleIfTrue,
        assumptions: hypothesis.assumptions,
        confidence: hypothesis.confidence,
      });
      advancePhase();
    },
    [advancePhase, updateHypothesis],
  );

  return (
    <Card className={cn("flex-1", className)}>
      <CardHeader>
        <div className="flex items-center gap-3">
          {config.symbol && (
            <span className="text-2xl font-mono text-primary">{config.symbol}</span>
          )}
          <div>
            <CardTitle>{config.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {phase === "intake" && session ? (
          <HypothesisIntake
            sessionId={session.id}
            initialValues={
              primaryHypothesis
                ? {
                    statement: primaryHypothesis.statement,
                    mechanism: primaryHypothesis.mechanism,
                    domain: primaryHypothesis.domain,
                    predictionsIfTrue: primaryHypothesis.predictionsIfTrue,
                    predictionsIfFalse: primaryHypothesis.predictionsIfFalse,
                    impossibleIfTrue: primaryHypothesis.impossibleIfTrue,
                    assumptions: primaryHypothesis.assumptions ?? [],
                    confidence: primaryHypothesis.confidence ?? 0,
                  }
                : undefined
            }
            createdBy={appliedBy}
            onComplete={(hypothesis) => handleIntakeComplete(hypothesis)}
          />
        ) : null}

        {phase === "sharpening" ? (
          <HypothesisEditorPanel
            mode="sharpening"
            hypothesis={primaryHypothesis}
            onSave={updateHypothesis}
          />
        ) : null}

        {phase === "level_split" ? (
          primaryHypothesis ? (
            <LevelSplitSession
              hypothesis={primaryHypothesis}
              onComplete={(result: UiLevelSplitResult) => {
                const appliedAt = new Date().toISOString();
                appendOperatorApplication(
                  "levelSplit",
                  toSessionLevelSplitResult({
                    result,
                    hypothesisId: primaryHypothesis.id,
                    appliedAt,
                    appliedBy,
                  }),
                );
                advancePhase();
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No hypothesis loaded.</p>
          )
        ) : null}

        {phase === "exclusion_test" ? (
          primaryHypothesis ? (
            <ExclusionTestSession
              hypothesis={primaryHypothesis}
              onComplete={(result: UiExclusionTestResult) => {
                const appliedAt = new Date().toISOString();
                appendOperatorApplication(
                  "exclusionTest",
                  toSessionExclusionTestResult({
                    result,
                    hypothesisId: primaryHypothesis.id,
                    appliedAt,
                    appliedBy,
                  }),
                );
                advancePhase();
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No hypothesis loaded.</p>
          )
        ) : null}

        {phase === "object_transpose" ? (
          primaryHypothesis ? (
            <ObjectTransposeSession
              hypothesis={primaryHypothesis}
              onComplete={(result: UiObjectTransposeResult) => {
                const appliedAt = new Date().toISOString();
                appendOperatorApplication(
                  "objectTranspose",
                  toSessionObjectTransposeResult({
                    result,
                    hypothesisStatement: primaryHypothesis.statement,
                    appliedAt,
                    appliedBy,
                  }),
                );
                advancePhase();
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No hypothesis loaded.</p>
          )
        ) : null}

        {phase === "scale_check" ? (
          primaryHypothesis ? (
            <ScaleCheckSession
              hypothesis={primaryHypothesis}
              onComplete={(result: UiScaleCheckResult) => {
                const appliedAt = new Date().toISOString();
                appendOperatorApplication(
                  "scaleCheck",
                  toSessionScaleCheckResult({
                    result,
                    hypothesisId: primaryHypothesis.id,
                    appliedAt,
                    appliedBy,
                  }),
                );
                advancePhase();
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No hypothesis loaded.</p>
          )
        ) : null}

        {phase === "agent_dispatch" && session ? (
          <div className="space-y-4">
            <AgentTribunalPanel threadId={session.id} messages={[]} />
            <ObjectionRegisterPanel threadId={session.id} messages={[]} />
          </div>
        ) : null}

        {phase === "synthesis" && session ? (
          <div className="space-y-4">
            <AgentTribunalPanel threadId={session.id} messages={[]} />
            <ObjectionRegisterPanel threadId={session.id} messages={[]} />
          </div>
        ) : null}

        {phase === "evidence_gathering" ? (
          <div className="space-y-6">
            <ConfidenceChart
              entries={evidenceEntries}
              initialConfidence={primaryHypothesis?.confidence ?? 0}
            />
            <EvidenceTimeline entries={evidenceEntries} />
          </div>
        ) : null}

        {phase === "revision" ? (
          <HypothesisEditorPanel
            mode="revision"
            hypothesis={primaryHypothesis}
            onSave={updateHypothesis}
          />
        ) : null}

        {phase === "complete" ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Session complete. Use Export JSON/Markdown to download artifacts.</p>
          </div>
        ) : null}

        {phase !== "intake" &&
        phase !== "sharpening" &&
        phase !== "level_split" &&
        phase !== "exclusion_test" &&
        phase !== "object_transpose" &&
        phase !== "scale_check" &&
        phase !== "agent_dispatch" &&
        phase !== "synthesis" &&
        phase !== "evidence_gathering" &&
        phase !== "revision" &&
        phase !== "complete" ? (
          <div className="min-h-[200px] flex items-center justify-center text-muted-foreground">
            <p>Phase content for &ldquo;{config.name}&rdquo; will appear here.</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

async function exportSessionToFile(session: Session, format: "json" | "markdown"): Promise<void> {
  const blob = await exportSession(session, format);
  const url = URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = `brenner-session-${session.id}.${format === "json" ? "json" : "md"}`;
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ============================================================================
// SessionDashboard Component
// ============================================================================

export interface SessionDashboardProps {
  /** Optional CSS class name */
  className?: string;
  /** Callback when edit hypothesis is requested */
  onEditHypothesis?: () => void;
  /** Callback when evolve hypothesis is requested */
  onEvolveHypothesis?: () => void;
  /** Callback when view history is requested */
  onViewHistory?: () => void;
}

export function SessionDashboard({
  className,
  onEditHypothesis,
  onEvolveHypothesis,
  onViewHistory,
}: SessionDashboardProps) {
  const {
    session,
    primaryHypothesis,
    isLoading,
    error,
    attachQuote,
    isDirty,
    saveState,
    saveSession,
  } = useSession();
  const exportOperation = useAsyncOperation();
  const [isCorpusSearchOpen, setIsCorpusSearchOpen] = React.useState(false);
  const [isKeyboardHelpOpen, setIsKeyboardHelpOpen] = React.useState(false);
  const lastSaveErrorRef = React.useRef<string | null>(null);

  // useSessionMachine provides computed values (reachablePhases, isComplete, etc.)
  const machine = useSessionMachine(session);

  // usePhaseNavigation provides navigation actions that persist to storage
  const { prev, next, canPrev, canNext, goTo } = usePhaseNavigation();

  const handleExport = React.useCallback(
    async (format: "json" | "markdown") => {
      const currentSession = session;
      if (!currentSession) return;

      await exportOperation.run(() => exportSessionToFile(currentSession, format), {
        message: "Exporting session...",
        estimatedDuration: 3,
        onError: (error) => {
          toast.error("Export failed", error.message);
        },
      });
    },
    [exportOperation, session],
  );

  // Save status indicator - must be before early returns per React hooks rules
  const saveStatus = React.useMemo(() => {
    if (saveState.status === "saving") {
      return { label: "Saving changes...", tone: "muted" as const };
    }
    if (saveState.status === "error") {
      return { label: "Save failed. Try again.", tone: "destructive" as const };
    }
    if (isDirty) {
      return { label: "Unsaved changes", tone: "muted" as const };
    }
    if (saveState.status === "saved") {
      return { label: "All changes saved", tone: "muted" as const };
    }
    return null;
  }, [isDirty, saveState]);

  React.useEffect(() => {
    if (saveState.status === "error") {
      const message = saveState.error?.message ?? "Failed to save session.";
      if (message !== lastSaveErrorRef.current) {
        toast.error("Save failed", message);
        lastSaveErrorRef.current = message;
      }
      return;
    }
    lastSaveErrorRef.current = null;
  }, [saveState.status, saveState.error]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.isComposing) return;
      if (!session || !machine) return;
      if (exportOperation.isLoading) return;

      const key = event.key;
      const lowerKey = key.toLowerCase();
      const isTyping = isEditableTarget(event.target);

      // While typing (or while corpus search is open), only allow modifier-based shortcuts (e.g., Cmd/Ctrl+S)
      if ((isTyping || isCorpusSearchOpen) && !(event.metaKey || event.ctrlKey)) return;

      // Help dialog toggle
      if (!event.metaKey && !event.ctrlKey && !event.altKey && key === "?") {
        event.preventDefault();
        setIsKeyboardHelpOpen((prev) => !prev);
        return;
      }

      if (isKeyboardHelpOpen) return;

      // Save
      if ((event.metaKey || event.ctrlKey) && !event.altKey && lowerKey === "s") {
        event.preventDefault();
        void saveSession().catch(() => {});
        return;
      }

      // Export (Shift+Cmd/Ctrl+E exports JSON; otherwise Markdown)
      if ((event.metaKey || event.ctrlKey) && !event.altKey && lowerKey === "e") {
        event.preventDefault();
        void handleExport(event.shiftKey ? "json" : "markdown");
        return;
      }

      // Hypothesis shortcuts
      if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        if (lowerKey === "e" && onEditHypothesis) {
          event.preventDefault();
          onEditHypothesis();
          return;
        }

        if (lowerKey === "h" && onViewHistory) {
          event.preventDefault();
          onViewHistory();
          return;
        }
      }

      // Phase navigation
      if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        if (key === "ArrowLeft" && canPrev) {
          event.preventDefault();
          prev();
          return;
        }

        if (key === "ArrowRight" && canNext && !machine.isComplete) {
          event.preventDefault();
          next();
          return;
        }

        if (/^[1-9]$/.test(key)) {
          const index = Number.parseInt(key, 10) - 1;
          const phase = PHASE_ORDER[index];
          if (!phase) return;
          if (phase === session.phase) return;
          if (!machine.reachablePhases.includes(phase)) return;
          event.preventDefault();
          goTo(phase);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canNext,
    canPrev,
    exportOperation.isLoading,
    goTo,
    handleExport,
    isCorpusSearchOpen,
    isKeyboardHelpOpen,
    machine,
    next,
    onEditHypothesis,
    onViewHistory,
    prev,
    saveSession,
    session,
  ]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-6", className)}>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <SkeletonButton size="sm" />
            <SkeletonButton size="sm" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="flex flex-col gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("flex items-center justify-center min-h-[400px]", className)}>
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-destructive font-medium">Error loading session</p>
            <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
            <div className="mt-4">
              <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No session loaded
  if (!session || !machine) {
    return (
      <div className={cn("flex items-center justify-center min-h-[400px]", className)}>
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No session loaded</p>
            <Button className="mt-4">Start New Session</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handlePhaseClick = (phase: SessionPhase) => {
    // Use navigation's goTo which handles persistence
    goTo(phase);
  };

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <LoadingOverlay
        visible={exportOperation.isLoading}
        message={exportOperation.state.message ?? "Exporting session..."}
        detail="Preparing your research brief for download."
        progress={exportOperation.state.progress}
        cancellable={exportOperation.state.cancellable}
      />

      <CorpusSearchDialog
        open={isCorpusSearchOpen}
        onOpenChange={setIsCorpusSearchOpen}
        hypothesisId={session.primaryHypothesisId || undefined}
        onAttachQuote={attachQuote}
      />

      <Dialog open={isKeyboardHelpOpen} onOpenChange={setIsKeyboardHelpOpen}>
        <DialogContent size="lg" closeButtonLabel="Close keyboard shortcuts">
          <DialogHeader separated>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>
              Non-modifier shortcuts are disabled while typing; Cmd/Ctrl shortcuts still work.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Session
              </div>
              <ShortcutRow label="Help">
                <kbd className="kbd">?</kbd>
              </ShortcutRow>
              <ShortcutRow label="Save session">
                <kbd className="kbd">Ctrl/⌘</kbd>
                <kbd className="kbd">S</kbd>
              </ShortcutRow>
              <ShortcutRow label="Export (Markdown)">
                <kbd className="kbd">Ctrl/⌘</kbd>
                <kbd className="kbd">E</kbd>
              </ShortcutRow>
              <ShortcutRow label="Export (JSON)">
                <kbd className="kbd">Ctrl/⌘</kbd>
                <kbd className="kbd">⇧</kbd>
                <kbd className="kbd">E</kbd>
              </ShortcutRow>
            </div>
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Navigation
              </div>
              <ShortcutRow label="Previous/Next phase">
                <kbd className="kbd">←</kbd>
                <kbd className="kbd">→</kbd>
              </ShortcutRow>
              <ShortcutRow label="Jump to phase">
                <kbd className="kbd">1</kbd>
                <span className="text-xs text-muted-foreground">…</span>
                <kbd className="kbd">9</kbd>
              </ShortcutRow>
              <ShortcutRow label="Edit hypothesis">
                <kbd className="kbd">E</kbd>
              </ShortcutRow>
              <ShortcutRow label="View history">
                <kbd className="kbd">H</kbd>
              </ShortcutRow>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tip: Use the phase timeline buttons for arrow-key focus navigation and{" "}
                <kbd className="kbd">Enter</kbd> to activate.
              </p>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <a
        href="#session-main"
        className={cn(
          "sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60]",
          "rounded-md bg-background px-3 py-2 text-sm text-foreground shadow-lg ring-1 ring-border",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        )}
      >
        Skip to main content
      </a>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Current phase: {PHASE_CONFIG[session.phase]?.name ?? session.phase}
      </div>
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between sm:block">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">BrennerBot Lab</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Session: {session.id}</p>
          </div>
          {/* Mobile progress badge */}
          <span className="sm:hidden text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
            {Math.round(getSessionProgress(session.phase))}%
          </span>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Shortcuts button - icon only on mobile */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsKeyboardHelpOpen(true)}
              aria-keyshortcuts="?"
              className="h-9 w-9 p-0 sm:h-auto sm:w-auto sm:px-3 sm:py-2"
              aria-label="Keyboard shortcuts"
            >
              <span aria-hidden="true" className="font-mono">
                ?
              </span>
              <span className="hidden sm:inline ml-2">Shortcuts</span>
            </Button>
            {/* Search button - icon only on mobile */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCorpusSearchOpen(true)}
              className="h-9 w-9 p-0 sm:h-auto sm:w-auto sm:px-3 sm:py-2 gap-2"
              aria-label="Search corpus"
            >
              <SearchIcon />
              <span className="hidden sm:inline">Search Corpus</span>
            </Button>
            {/* Export JSON - icon only on mobile */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("json")}
              disabled={exportOperation.isLoading}
              aria-keyshortcuts="Control+Shift+E Meta+Shift+E"
              className="h-9 w-9 p-0 sm:h-auto sm:w-auto sm:px-3 sm:py-2"
              aria-label="Export JSON"
              title="Export JSON"
            >
              <CodeBracketIcon />
              <span className="hidden sm:inline ml-2">Export JSON</span>
            </Button>
            {/* Export Markdown - icon only on mobile */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("markdown")}
              disabled={exportOperation.isLoading}
              aria-keyshortcuts="Control+E Meta+E"
              className="h-9 w-9 p-0 sm:h-auto sm:w-auto sm:px-3 sm:py-2"
              aria-label="Export Markdown"
              title="Export Markdown"
            >
              <DocumentIcon />
              <span className="hidden sm:inline ml-2">Export Markdown</span>
            </Button>
            {/* Desktop progress text */}
            <span className="hidden sm:inline text-sm text-muted-foreground">
              {Math.round(getSessionProgress(session.phase))}% complete
            </span>
          </div>
          {exportOperation.isError && (
            <p className="text-xs text-destructive">Export failed. Please try again.</p>
          )}
          {saveStatus && (
            <p
              className={cn(
                "text-xs",
                saveStatus.tone === "destructive" ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {saveStatus.label}
            </p>
          )}
        </div>
      </header>

      {/* Phase Timeline */}
      <nav aria-label="Session phases">
        <PhaseTimeline
          currentPhase={session.phase}
          phases={PHASE_ORDER}
          completedPhases={PHASE_ORDER.slice(0, Math.max(0, PHASE_ORDER.indexOf(session.phase)))}
          availablePhases={machine.reachablePhases}
          skippedPhases={[]}
          onPhaseClick={handlePhaseClick}
        />
      </nav>

      {/* Main Content Grid */}
      <main id="session-main" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Phase Content (2/3 width on desktop) */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={session.phase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <PhaseContent phase={session.phase} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Sidebar (1/3 width on desktop) */}
        <aside className="flex flex-col gap-4" aria-label="Session sidebar">
          {/* Hypothesis Card */}
          {primaryHypothesis && (
            <HypothesisCard
              hypothesis={primaryHypothesis}
              mode="compact"
              onEdit={onEditHypothesis ? () => onEditHypothesis() : undefined}
              onEvolve={onEvolveHypothesis}
              onViewHistory={onViewHistory}
              showConfounds={false}
              showStructure={false}
            />
          )}

          {/* Brenner Quote */}
          <BrennerQuote phase={session.phase} />
        </aside>
      </main>

      {/* Navigation Footer */}
      <nav
        className="flex items-center justify-between pt-4 border-t"
        aria-label="Phase navigation"
      >
        <Button variant="outline" onClick={prev} disabled={!canPrev} aria-keyshortcuts="ArrowLeft">
          <ChevronLeftIcon className="size-4 mr-2" />
          Previous
        </Button>

        <Button
          onClick={next}
          disabled={!canNext || machine?.isComplete}
          aria-keyshortcuts="ArrowRight"
        >
          {machine?.isComplete ? "Complete" : "Next"}
          {!machine?.isComplete && <ChevronRightIcon className="size-4 ml-2" />}
        </Button>
      </nav>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export { BrennerQuote, PHASE_CONFIG, PhaseContent, PhaseTimeline };
