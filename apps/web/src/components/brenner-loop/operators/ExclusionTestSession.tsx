"use client";

/**
 * ExclusionTestSession - Interactive Exclusion Test (⊘) Operator Session
 *
 * THE key operator in the Brenner approach. Guides users through designing
 * discriminative tests that can falsify their hypothesis.
 *
 * Steps:
 * 1. Review Hypothesis - See predictions and mechanism
 * 2. Generate Tests - System generates ranked falsification tests
 * 3. Select Tests - Choose which tests to pursue
 * 4. Design Protocols - Define how to run selected tests
 * 5. Record Tests - Confirm tests for the session
 *
 * @see brenner_bot-vw6p.3 (bead)
 * @module components/brenner-loop/operators/ExclusionTestSession
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Beaker,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Star,
  Target,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useOperatorSession } from "@/hooks/useOperatorSession";
import type { HypothesisCard } from "@/lib/brenner-loop/hypothesis";
import type {
  ExclusionTest,
  ExclusionTestResult,
  TestProtocol,
} from "@/lib/brenner-loop/operators/exclusion-test";
import {
  createCustomTest,
  EXCLUSION_TEST_CATEGORY_LABELS,
  EXCLUSION_TEST_FALLBACK_QUOTES,
  EXCLUSION_TEST_STEP_IDS,
  EXCLUSION_TEST_STEPS,
  generateExclusionTests,
  getCategoryColor,
  getDiscriminativePowerLabel,
  getDiscriminativePowerStars,
  getFeasibilityColor,
} from "@/lib/brenner-loop/operators/exclusion-test";
import type { Quote } from "@/lib/quotebank-parser";
import { cn } from "@/lib/utils";
import { OperatorShell } from "./OperatorShell";

// ============================================================================
// Types
// ============================================================================

export interface ExclusionTestSessionProps {
  /** The hypothesis to design tests for */
  hypothesis: HypothesisCard;
  /** Brenner quotes for this operator (optional) */
  quotes?: Quote[];
  /** Callback when session completes */
  onComplete?: (result: ExclusionTestResult) => void;
  /** Callback when session is abandoned */
  onAbandon?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Step Components
// ============================================================================

/**
 * Display the hypothesis for review
 */
interface HypothesisReviewProps {
  hypothesis: HypothesisCard;
}

function HypothesisReview({ hypothesis }: HypothesisReviewProps) {
  return (
    <div className="space-y-6">
      {/* Main Statement */}
      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Hypothesis
        </h3>
        <p className="text-lg font-medium">{hypothesis.statement}</p>
      </div>

      {/* Mechanism */}
      {hypothesis.mechanism && (
        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Proposed Mechanism
          </h3>
          <p className="text-sm">{hypothesis.mechanism}</p>
        </div>
      )}

      {/* Predictions Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* If True */}
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
          <h3 className="text-sm font-medium text-green-700 dark:text-green-400 uppercase tracking-wide mb-2">
            If True, We Should See
          </h3>
          <ul className="space-y-1">
            {(hypothesis.predictionsIfTrue || []).map((pred, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <Check className="size-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>{pred}</span>
              </li>
            ))}
            {(!hypothesis.predictionsIfTrue || hypothesis.predictionsIfTrue.length === 0) && (
              <li className="text-sm text-muted-foreground italic">No predictions specified</li>
            )}
          </ul>
        </div>

        {/* If False */}
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
          <h3 className="text-sm font-medium text-red-700 dark:text-red-400 uppercase tracking-wide mb-2">
            If False, We Should See
          </h3>
          <ul className="space-y-1">
            {(hypothesis.predictionsIfFalse || []).map((pred, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <AlertTriangle className="size-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{pred}</span>
              </li>
            ))}
            {(!hypothesis.predictionsIfFalse || hypothesis.predictionsIfFalse.length === 0) && (
              <li className="text-sm text-muted-foreground italic">No predictions specified</li>
            )}
          </ul>
        </div>
      </div>

      {/* Falsification Conditions */}
      {hypothesis.impossibleIfTrue && hypothesis.impossibleIfTrue.length > 0 && (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
          <h3 className="text-sm font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2 flex items-center gap-2">
            <Target className="size-4" />
            Would Falsify Hypothesis
          </h3>
          <ul className="space-y-1">
            {hypothesis.impossibleIfTrue.map((cond, i) => (
              <li key={i} className="text-sm">
                {cond}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Test card component
 */
interface TestCardProps {
  test: ExclusionTest;
  onToggle: () => void;
  showDetails?: boolean;
}

function TestCard({ test, onToggle, showDetails = false }: TestCardProps) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <motion.div
      className={cn(
        "p-4 rounded-lg border transition-all",
        test.selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border bg-card hover:border-primary/30",
      )}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-start gap-3">
        {/* Selection checkbox */}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "flex items-center justify-center size-6 rounded border flex-shrink-0 mt-0.5 transition-colors",
            test.selected
              ? "bg-primary border-primary text-primary-foreground"
              : "border-muted-foreground/30 hover:border-primary/50",
          )}
        >
          {test.selected && <Check className="size-4" strokeWidth={3} />}
        </button>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="font-medium text-sm">{test.name}</h4>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                    getCategoryColor(test.category),
                  )}
                >
                  {EXCLUSION_TEST_CATEGORY_LABELS[test.category]}
                </span>
                <span
                  className="inline-flex items-center text-xs text-amber-600 dark:text-amber-400"
                  title={`Discriminative Power: ${getDiscriminativePowerLabel(test.discriminativePower)}`}
                >
                  {getDiscriminativePowerStars(test.discriminativePower)}
                </span>
                <span className={cn("text-xs", getFeasibilityColor(test.feasibility))}>
                  {test.feasibility} feasibility
                </span>
              </div>
            </div>

            {/* Expand button */}
            {showDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="flex-shrink-0"
              >
                {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </Button>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground mt-2">{test.description}</p>

          {/* Expanded details */}
          <AnimatePresence>
            {(expanded || !showDetails) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid md:grid-cols-2 gap-3 mt-4">
                  <div className="p-3 rounded bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50">
                    <h5 className="text-xs font-medium text-red-700 dark:text-red-400 uppercase tracking-wide mb-1">
                      Falsifies If
                    </h5>
                    <p className="text-xs">{test.falsificationCondition}</p>
                  </div>
                  <div className="p-3 rounded bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/50">
                    <h5 className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wide mb-1">
                      Supports If
                    </h5>
                    <p className="text-xs">{test.supportCondition}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 italic">{test.rationale}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Test list with selection
 */
interface TestListProps {
  tests: ExclusionTest[];
  onToggle: (testId: string) => void;
  showDetails?: boolean;
}

function TestList({ tests, onToggle, showDetails = false }: TestListProps) {
  // Group tests by discriminative power
  const groupedTests = React.useMemo(() => {
    const groups: Record<string, ExclusionTest[]> = {
      "5": [],
      "3-4": [],
      "1-2": [],
    };

    for (const test of tests) {
      if (test.discriminativePower === 5) {
        groups["5"].push(test);
      } else if (test.discriminativePower >= 3) {
        groups["3-4"].push(test);
      } else {
        groups["1-2"].push(test);
      }
    }

    return groups;
  }, [tests]);

  const groupLabels: Record<string, { label: string; description: string }> = {
    "5": { label: "Strongest Tests", description: "Can definitively falsify the hypothesis" },
    "3-4": { label: "Moderate Tests", description: "Provide meaningful discrimination" },
    "1-2": { label: "Weaker Tests", description: "Suggestive but not definitive" },
  };

  return (
    <div className="space-y-8">
      {Object.entries(groupedTests).map(([key, groupTests]) => {
        if (groupTests.length === 0) return null;

        return (
          <div key={key}>
            <div className="flex items-center gap-2 mb-3">
              <Star
                className={cn(
                  "size-5",
                  key === "5"
                    ? "text-amber-500"
                    : key === "3-4"
                      ? "text-amber-400"
                      : "text-gray-400",
                )}
                fill={key === "5" ? "currentColor" : "none"}
              />
              <div>
                <h3 className="font-medium text-sm">{groupLabels[key].label}</h3>
                <p className="text-xs text-muted-foreground">{groupLabels[key].description}</p>
              </div>
            </div>
            <div className="space-y-3">
              {groupTests.map((test) => (
                <TestCard
                  key={test.id}
                  test={test}
                  onToggle={() => onToggle(test.id)}
                  showDetails={showDetails}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Custom test form
 */
interface CustomTestFormProps {
  onAdd: (test: ExclusionTest) => void;
}

function CustomTestForm({ onAdd }: CustomTestFormProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [falsificationCondition, setFalsificationCondition] = React.useState("");
  const [supportCondition, setSupportCondition] = React.useState("");
  const [power, setPower] = React.useState<1 | 2 | 3 | 4 | 5>(3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !falsificationCondition || !supportCondition) return;

    const test = createCustomTest(
      name,
      description,
      falsificationCondition,
      supportCondition,
      power,
    );
    test.selected = true;
    onAdd(test);

    // Reset form
    setName("");
    setDescription("");
    setFalsificationCondition("");
    setSupportCondition("");
    setPower(3);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Button variant="outline" onClick={() => setIsOpen(true)} className="w-full">
        <Plus className="size-4 mr-2" />
        Add Custom Test
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 rounded-lg border border-dashed border-primary/50 bg-primary/5 space-y-4"
    >
      <div>
        <label className="text-sm font-medium">Test Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Cross-cultural comparison"
          className="mt-1"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this test involve?"
          rows={2}
          className="mt-1"
        />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-red-600">Falsifies If</label>
          <Textarea
            value={falsificationCondition}
            onChange={(e) => setFalsificationCondition(e.target.value)}
            placeholder="What result would falsify the hypothesis?"
            rows={2}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-green-600">Supports If</label>
          <Textarea
            value={supportCondition}
            onChange={(e) => setSupportCondition(e.target.value)}
            placeholder="What result would support the hypothesis?"
            rows={2}
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Discriminative Power</label>
        <div className="flex items-center gap-2 mt-1">
          {([1, 2, 3, 4, 5] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPower(p)}
              className={cn(
                "size-8 rounded border text-sm font-medium transition-colors",
                power === p
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-border hover:border-primary/50",
              )}
            >
              {p}
            </button>
          ))}
          <span className="text-sm text-muted-foreground ml-2">
            {getDiscriminativePowerStars(power)} {getDiscriminativePowerLabel(power)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          disabled={!name || !description || !falsificationCondition || !supportCondition}
        >
          Add Test
        </Button>
        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/**
 * Protocol editor
 */
interface ProtocolEditorProps {
  test: ExclusionTest;
  protocol: TestProtocol;
  onChange: (protocol: TestProtocol) => void;
}

function ProtocolEditor({ test, protocol, onChange }: ProtocolEditorProps) {
  const [expanded, setExpanded] = React.useState(true);

  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Beaker className="size-5 text-primary" />
          <span className="font-medium text-sm">{test.name}</span>
        </div>
        {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 mt-4 pt-4 border-t border-border">
              <div>
                <label className="text-sm font-medium">What data do you need?</label>
                <Textarea
                  value={protocol.dataRequired}
                  onChange={(e) => onChange({ ...protocol, dataRequired: e.target.value })}
                  placeholder="Describe the data needed to run this test..."
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Where can you find it?</label>
                <Input
                  value={protocol.dataSources.join(", ")}
                  onChange={(e) =>
                    onChange({
                      ...protocol,
                      dataSources: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Public datasets, surveys, existing studies..."
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Separate sources with commas</p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-green-600">Passing Criteria</label>
                  <Textarea
                    value={protocol.passingCriteria}
                    onChange={(e) => onChange({ ...protocol, passingCriteria: e.target.value })}
                    placeholder="What counts as 'passing' (hypothesis survives)?"
                    rows={2}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-red-600">Failing Criteria</label>
                  <Textarea
                    value={protocol.failingCriteria}
                    onChange={(e) => onChange({ ...protocol, failingCriteria: e.target.value })}
                    placeholder="What counts as 'failing' (hypothesis falsified)?"
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Limitations & Confounds</label>
                <Input
                  value={protocol.limitations.join(", ")}
                  onChange={(e) =>
                    onChange({
                      ...protocol,
                      limitations: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="What could go wrong or confound results?"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={protocol.notes || ""}
                  onChange={(e) => onChange({ ...protocol, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Summary of selected tests
 */
interface TestSummaryProps {
  tests: ExclusionTest[];
  protocols: TestProtocol[];
}

function TestSummary({ tests, protocols }: TestSummaryProps) {
  const protocolMap = new Map(protocols.map((p) => [p.testId, p]));

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-3">
          <Target className="size-5 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Ready to Record</p>
            <p className="text-sm text-muted-foreground mt-1">
              {tests.length} test{tests.length !== 1 ? "s" : ""} will be added to your
              session&apos;s test plan.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {tests.map((test, index) => {
          const protocol = protocolMap.get(test.id);

          return (
            <motion.div
              key={test.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-lg border border-border bg-card"
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center size-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">{test.name}</h4>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="text-amber-600 dark:text-amber-400">
                      {getDiscriminativePowerStars(test.discriminativePower)}
                    </span>
                    <span className={cn(getFeasibilityColor(test.feasibility))}>
                      {test.feasibility} feasibility
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {test.falsificationCondition}
                  </p>
                  {protocol?.dataRequired && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Data needed: {protocol.dataRequired.slice(0, 100)}
                      {protocol.dataRequired.length > 100 ? "..." : ""}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Main Session Component
// ============================================================================

export function ExclusionTestSession({
  hypothesis,
  quotes,
  onComplete,
  onAbandon,
  className,
}: ExclusionTestSessionProps) {
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
  } = useOperatorSession<ExclusionTestResult>({
    operatorType: "exclusion_test",
    hypothesis,
    stepConfigs: EXCLUSION_TEST_STEPS,
    onComplete: (session) => {
      if (onComplete && session.result) {
        onComplete(session.result);
      }
    },
    onAbandon: () => {
      onAbandon?.();
    },
  });

  // Generate tests when entering the generate step
  React.useEffect(() => {
    if (currentStepConfig?.id === EXCLUSION_TEST_STEP_IDS.GENERATE_TESTS) {
      const existingTests = getContent<ExclusionTest[]>(EXCLUSION_TEST_STEP_IDS.GENERATE_TESTS);
      if (!existingTests || existingTests.length === 0) {
        const tests = generateExclusionTests(hypothesis);
        setContent(EXCLUSION_TEST_STEP_IDS.GENERATE_TESTS, tests);
      }
    }
  }, [currentStepConfig?.id, hypothesis, getContent, setContent]);

  // Copy generated tests to selection when entering select step
  React.useEffect(() => {
    if (currentStepConfig?.id === EXCLUSION_TEST_STEP_IDS.SELECT_TESTS) {
      const existingSelection = getSelection<ExclusionTest[]>(EXCLUSION_TEST_STEP_IDS.SELECT_TESTS);
      if (!existingSelection) {
        const generatedTests =
          getContent<ExclusionTest[]>(EXCLUSION_TEST_STEP_IDS.GENERATE_TESTS) ?? [];
        setSelection(EXCLUSION_TEST_STEP_IDS.SELECT_TESTS, generatedTests);
      }
    }
  }, [currentStepConfig?.id, getContent, getSelection, setSelection]);

  // Generate protocols when entering protocol step
  // Must regenerate if selected tests changed (e.g., user went back and selected more)
  React.useEffect(() => {
    if (currentStepConfig?.id === EXCLUSION_TEST_STEP_IDS.GENERATE_PROTOCOLS) {
      const selectedTests =
        getSelection<ExclusionTest[]>(EXCLUSION_TEST_STEP_IDS.SELECT_TESTS) ?? [];
      const existingProtocols =
        getContent<TestProtocol[]>(EXCLUSION_TEST_STEP_IDS.GENERATE_PROTOCOLS) ?? [];
      const testsNeedingProtocols = selectedTests.filter((t) => t.selected);

      // Check if we need to regenerate: count mismatch (tests added/removed), or new test without protocol
      const existingTestIds = new Set(existingProtocols.map((p) => p.testId));
      const selectedTestIds = testsNeedingProtocols.map((t) => t.id);
      const needsRegeneration =
        existingProtocols.length !== testsNeedingProtocols.length ||
        selectedTestIds.some((id) => !existingTestIds.has(id));

      if (needsRegeneration) {
        // Preserve any existing protocol data for tests that already have protocols
        const existingProtocolMap = new Map(existingProtocols.map((p) => [p.testId, p]));
        const protocols = testsNeedingProtocols.map((test) => {
          const existing = existingProtocolMap.get(test.id);
          if (existing) return existing;
          return {
            testId: test.id,
            dataRequired: "",
            dataSources: [],
            passingCriteria: test.supportCondition,
            failingCriteria: test.falsificationCondition,
            limitations: [],
            estimatedEffort:
              test.feasibility === "high"
                ? "days"
                : test.feasibility === "medium"
                  ? "weeks"
                  : "months",
            notes: "",
          } as TestProtocol;
        });
        setContent(EXCLUSION_TEST_STEP_IDS.GENERATE_PROTOCOLS, protocols);
      }
    }
  }, [currentStepConfig?.id, getSelection, getContent, setContent]);

  // Get current state
  const testsRaw = getContent<ExclusionTest[]>(EXCLUSION_TEST_STEP_IDS.GENERATE_TESTS);
  const generatedTests = React.useMemo(() => testsRaw ?? [], [testsRaw]);

  const selectedTestsRaw = getSelection<ExclusionTest[]>(EXCLUSION_TEST_STEP_IDS.SELECT_TESTS);
  const selectedTests = React.useMemo(() => selectedTestsRaw ?? [], [selectedTestsRaw]);

  const protocolsRaw = getContent<TestProtocol[]>(EXCLUSION_TEST_STEP_IDS.GENERATE_PROTOCOLS);
  const protocols = React.useMemo(() => protocolsRaw ?? [], [protocolsRaw]);

  const confirmed = getSelection<boolean>(EXCLUSION_TEST_STEP_IDS.RECORD_TESTS) ?? false;

  // Toggle test selection
  const toggleTest = React.useCallback(
    (testId: string) => {
      const updated = selectedTests.map((t) =>
        t.id === testId ? { ...t, selected: !t.selected } : t,
      );
      setSelection(EXCLUSION_TEST_STEP_IDS.SELECT_TESTS, updated);
    },
    [selectedTests, setSelection],
  );

  // Add custom test
  const addCustomTest = React.useCallback(
    (test: ExclusionTest) => {
      setSelection(EXCLUSION_TEST_STEP_IDS.SELECT_TESTS, [...selectedTests, test]);
    },
    [selectedTests, setSelection],
  );

  // Update protocol
  const updateProtocol = React.useCallback(
    (updated: TestProtocol) => {
      const newProtocols = protocols.map((p) => (p.testId === updated.testId ? updated : p));
      setContent(EXCLUSION_TEST_STEP_IDS.GENERATE_PROTOCOLS, newProtocols);
    },
    [protocols, setContent],
  );

  // Toggle confirmation
  const toggleConfirmation = React.useCallback(() => {
    setSelection(EXCLUSION_TEST_STEP_IDS.RECORD_TESTS, !confirmed);
  }, [confirmed, setSelection]);

  // Handle completion
  const handleComplete = React.useCallback(() => {
    const testsForSession = selectedTests.filter((t) => t.selected);
    const result: ExclusionTestResult = {
      generatedTests,
      selectedTestIds: testsForSession.map((t) => t.id),
      protocols,
      testsForSession,
    };
    complete(result);
  }, [generatedTests, selectedTests, protocols, complete]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStepConfig?.id) {
      case EXCLUSION_TEST_STEP_IDS.REVIEW_HYPOTHESIS:
        return <HypothesisReview hypothesis={hypothesis} />;

      case EXCLUSION_TEST_STEP_IDS.GENERATE_TESTS:
        return (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-3">
                <Beaker className="size-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Tests Generated</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {generatedTests.length} potential falsification tests have been generated based
                    on your hypothesis.
                  </p>
                </div>
              </div>
            </div>
            <TestList tests={generatedTests} onToggle={() => {}} showDetails />
          </div>
        );

      case EXCLUSION_TEST_STEP_IDS.SELECT_TESTS:
        return (
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground">
                Select the tests you want to pursue. Focus on 2-3 high-power tests that are feasible
                to conduct.
              </p>
            </div>
            <TestList tests={selectedTests} onToggle={toggleTest} showDetails />
            <div className="pt-4 border-t border-border">
              <CustomTestForm onAdd={addCustomTest} />
            </div>
          </div>
        );

      case EXCLUSION_TEST_STEP_IDS.GENERATE_PROTOCOLS: {
        const testsWithProtocols = selectedTests.filter((t) => t.selected);
        return (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground">
                Define how you&apos;ll run each selected test. Be specific about data needs and
                success criteria.
              </p>
            </div>
            <div className="space-y-4">
              {testsWithProtocols.map((test) => {
                const protocol = protocols.find((p) => p.testId === test.id);
                if (!protocol) return null;
                return (
                  <ProtocolEditor
                    key={test.id}
                    test={test}
                    protocol={protocol}
                    onChange={updateProtocol}
                  />
                );
              })}
            </div>
          </div>
        );
      }

      case EXCLUSION_TEST_STEP_IDS.RECORD_TESTS: {
        const testsToRecord = selectedTests.filter((t) => t.selected);
        return (
          <div className="space-y-6">
            <TestSummary tests={testsToRecord} protocols={protocols} />
            <div className="pt-4 border-t border-border">
              <motion.button
                type="button"
                onClick={toggleConfirmation}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-lg border transition-all",
                  confirmed
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border bg-card hover:border-primary/30",
                )}
                whileTap={{ scale: 0.99 }}
              >
                <div
                  className={cn(
                    "flex items-center justify-center size-6 rounded border flex-shrink-0 transition-colors",
                    confirmed
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/30",
                  )}
                >
                  {confirmed && <Check className="size-4" strokeWidth={3} />}
                </div>
                <span className="font-medium text-sm">
                  Confirm: Add these tests to my session&apos;s test plan
                </span>
              </motion.button>
            </div>
          </div>
        );
      }

      default:
        return <div className="p-8 text-center text-muted-foreground">Unknown step</div>;
    }
  };

  // Use quotes or fallback
  const displayQuotes = quotes && quotes.length > 0 ? quotes : EXCLUSION_TEST_FALLBACK_QUOTES;

  return (
    <OperatorShell
      operatorType="exclusion_test"
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

export default ExclusionTestSession;
