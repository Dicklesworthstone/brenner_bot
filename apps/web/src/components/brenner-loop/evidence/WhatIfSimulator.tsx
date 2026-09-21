"use client";

/**
 * WhatIfSimulator - Evidence Impact Simulation Tool
 *
 * Allows users to explore "what if" scenarios before running tests.
 * Helps prioritize which tests to run first by showing potential outcomes.
 *
 * Views:
 * - Single Test: See impact of one test with all possible outcomes
 * - Scenario Builder: Build multi-test scenarios with assumed results
 * - Test Comparison: Compare multiple tests by information value
 *
 * @see brenner_bot-njjo.6 (bead)
 * @module components/brenner-loop/evidence/WhatIfSimulator
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  ChevronRight,
  FlaskConical,
  Info,
  Layers,
  Minus,
  Plus,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatConfidence, formatDelta, getStarRating } from "@/lib/brenner-loop/confidence";
import type { EvidenceResult } from "@/lib/brenner-loop/evidence";
import type { TestQueueItem } from "@/lib/brenner-loop/test-queue";
import {
  type AssumedTestResult,
  addTestToScenario,
  analyzeScenario,
  analyzeTestQueueItem,
  compareTests,
  createScenario,
  formatInformationValue,
  getRecommendationColor,
  getRecommendationStars,
  RECOMMENDATION_LABELS,
  removeTestFromScenario,
  summarizeScenario,
  updateTestInScenario,
  type WhatIfScenario,
} from "@/lib/brenner-loop/what-if";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface WhatIfSimulatorProps {
  /** Current session ID */
  sessionId: string;
  /** Hypothesis ID being evaluated */
  hypothesisId: string;
  /** Current confidence level */
  currentConfidence: number;
  /** Available tests from the queue */
  tests: TestQueueItem[];
  /** Callback when user wants to run a test */
  onRunTest?: (test: TestQueueItem) => void;
  /** Additional CSS classes */
  className?: string;
}

type SimulatorView = "single" | "scenario" | "comparison";

// ============================================================================
// Constants
// ============================================================================

const RESULT_CONFIG: Record<
  EvidenceResult,
  { icon: typeof TrendingUp; label: string; color: string; hoverColor: string }
> = {
  supports: {
    icon: TrendingUp,
    label: "Supports",
    color: "text-green-600",
    hoverColor: "hover:text-green-600",
  },
  challenges: {
    icon: TrendingDown,
    label: "Challenges",
    color: "text-red-600",
    hoverColor: "hover:text-red-600",
  },
  inconclusive: {
    icon: Minus,
    label: "Inconclusive",
    color: "text-amber-600",
    hoverColor: "hover:text-amber-600",
  },
};

// ============================================================================
// Single Test What-If View
// ============================================================================

interface SingleTestViewProps {
  currentConfidence: number;
  tests: TestQueueItem[];
  onRunTest?: (test: TestQueueItem) => void;
}

function SingleTestView({ currentConfidence, tests, onRunTest }: SingleTestViewProps) {
  const [selectedTestId, setSelectedTestId] = React.useState<string | null>(
    tests.length > 0 ? tests[0].id : null,
  );

  const selectedTest = tests.find((t) => t.id === selectedTestId);
  const analysis = selectedTest ? analyzeTestQueueItem(currentConfidence, selectedTest) : null;

  if (tests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <FlaskConical className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No Tests Available</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Add tests to your queue from the Exclusion Test operator to see what-if projections.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Test selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Select a Test</label>
        <div className="flex flex-wrap gap-2">
          {tests.map((test) => (
            <button
              key={test.id}
              onClick={() => setSelectedTestId(test.id)}
              className={cn(
                "px-3 py-2 rounded-lg border text-sm transition-colors",
                selectedTestId === test.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              <span className="font-medium">{test.test.name}</span>
              <span className="ml-2 text-muted-foreground">
                {getStarRating(test.discriminativePower)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Analysis display */}
      {analysis && selectedTest && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Current confidence */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Current confidence:</span>
            <span className="font-medium">{formatConfidence(currentConfidence)}</span>
          </div>

          {/* Outcome projections */}
          <div className="grid gap-3">
            {(["supports", "challenges", "inconclusive"] as EvidenceResult[]).map((result) => {
              const config = RESULT_CONFIG[result];
              const outcome =
                result === "supports"
                  ? analysis.ifSupports
                  : result === "challenges"
                    ? analysis.ifChallenges
                    : analysis.ifInconclusive;
              const Icon = config.icon;

              return (
                <div
                  key={result}
                  className={cn(
                    "p-4 rounded-lg border",
                    result === "supports" &&
                      "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900",
                    result === "challenges" &&
                      "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900",
                    result === "inconclusive" &&
                      "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900",
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("size-4", config.color)} />
                      <span className={cn("font-medium", config.color)}>
                        If result {config.label.toLowerCase()}:
                      </span>
                    </div>
                    <span className={cn("text-lg font-bold", config.color)}>
                      {formatConfidence(outcome.newConfidence)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {formatConfidence(currentConfidence)} →{" "}
                      {formatConfidence(outcome.newConfidence)}
                    </span>
                    <span className={cn("font-medium", config.color)}>
                      {formatDelta(outcome.delta)}
                    </span>
                  </div>

                  {outcome.significant && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {outcome.explanation.split(".").slice(-1)[0].trim()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Test info */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Discriminative Power</span>
              <span className="font-medium">
                {getStarRating(selectedTest.discriminativePower)} (
                {selectedTest.discriminativePower}/5)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Information Value</span>
              <span className="font-medium">
                {formatInformationValue(analysis.informationValue)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Max Potential Impact</span>
              <span className="font-medium">±{analysis.maxImpact.toFixed(1)}%</span>
            </div>
          </div>

          {/* Run test button */}
          {onRunTest && (
            <Button onClick={() => onRunTest(selectedTest)} className="w-full">
              <FlaskConical className="size-4 mr-2" />
              Run This Test
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ============================================================================
// Scenario Builder View
// ============================================================================

interface ScenarioBuilderViewProps {
  sessionId: string;
  hypothesisId: string;
  currentConfidence: number;
  tests: TestQueueItem[];
}

function ScenarioBuilderView({
  sessionId,
  hypothesisId,
  currentConfidence,
  tests,
}: ScenarioBuilderViewProps) {
  const [scenario, setScenario] = React.useState<WhatIfScenario>(() =>
    createScenario({
      name: "Custom Scenario",
      sessionId,
      hypothesisId,
      startingConfidence: currentConfidence,
    }),
  );

  // Get tests not yet in scenario
  const availableTests = tests.filter(
    (t) => !scenario.assumedTests.some((at) => at.testId === t.id),
  );

  const analysis = analyzeScenario(scenario);

  const handleAddTest = (test: TestQueueItem, result: EvidenceResult) => {
    const assumed: AssumedTestResult = {
      testId: test.id,
      testName: test.test.name,
      discriminativePower: test.discriminativePower,
      assumedResult: result,
    };
    setScenario((prev) => addTestToScenario(prev, assumed));
  };

  const handleRemoveTest = (testId: string) => {
    setScenario((prev) => removeTestFromScenario(prev, testId));
  };

  const handleUpdateResult = (testId: string, result: EvidenceResult) => {
    setScenario((prev) => updateTestInScenario(prev, testId, result));
  };

  const handleClearScenario = () => {
    setScenario(
      createScenario({
        name: "Custom Scenario",
        sessionId,
        hypothesisId,
        startingConfidence: currentConfidence,
      }),
    );
  };

  return (
    <div className="space-y-6">
      {/* Scenario summary */}
      <div className="p-4 rounded-lg border bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="size-5 text-indigo-600" />
            <span className="font-medium">Scenario Projection</span>
          </div>
          {scenario.assumedTests.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearScenario}>
              Clear All
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">
              {formatConfidence(scenario.startingConfidence)}
            </div>
            <div className="text-xs text-muted-foreground">Start</div>
          </div>

          <ChevronRight className="size-5 text-muted-foreground" />

          <div className="text-center">
            <div
              className={cn(
                "text-2xl font-bold",
                scenario.confidenceDelta > 0 && "text-green-600",
                scenario.confidenceDelta < 0 && "text-red-600",
              )}
            >
              {formatConfidence(scenario.projectedConfidence)}
            </div>
            <div className="text-xs text-muted-foreground">
              {scenario.confidenceDelta >= 0 ? "+" : ""}
              {scenario.confidenceDelta.toFixed(1)}%
            </div>
          </div>
        </div>

        {scenario.assumedTests.length > 0 && (
          <div className="mt-3 text-sm text-muted-foreground">{summarizeScenario(scenario)}</div>
        )}
      </div>

      {/* Best/Worst case */}
      {scenario.assumedTests.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-900">
            <div className="text-xs text-green-600 mb-1">Best Case (all support)</div>
            <div className="text-lg font-bold text-green-700">
              {formatConfidence(analysis.bestCase.confidence)}
            </div>
            <div className="text-xs text-green-600">
              {analysis.bestCase.delta >= 0 ? "+" : ""}
              {analysis.bestCase.delta.toFixed(1)}%
            </div>
          </div>
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900">
            <div className="text-xs text-red-600 mb-1">Worst Case (all challenge)</div>
            <div className="text-lg font-bold text-red-700">
              {formatConfidence(analysis.worstCase.confidence)}
            </div>
            <div className="text-xs text-red-600">
              {analysis.worstCase.delta >= 0 ? "+" : ""}
              {analysis.worstCase.delta.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Tests in scenario */}
      {scenario.assumedTests.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Tests in Scenario</label>
          <div className="space-y-2">
            {scenario.assumedTests.map((test) => {
              return (
                <div
                  key={test.testId}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-background"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{test.testName}</div>
                    <div className="text-xs text-muted-foreground">
                      {getStarRating(test.discriminativePower)}
                    </div>
                  </div>

                  {/* Result toggle */}
                  <div className="flex gap-1">
                    {(["supports", "challenges", "inconclusive"] as EvidenceResult[]).map(
                      (result) => {
                        const rc = RESULT_CONFIG[result];
                        const isActive = test.assumedResult === result;
                        const ResultIcon = rc.icon;
                        return (
                          <TooltipProvider key={result}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleUpdateResult(test.testId, result)}
                                  className={cn(
                                    "p-1.5 rounded transition-colors",
                                    isActive
                                      ? cn("bg-primary/10", rc.color)
                                      : "text-muted-foreground hover:bg-muted",
                                  )}
                                >
                                  <ResultIcon className="size-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom">
                                <p>{rc.label}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      },
                    )}
                  </div>

                  <button
                    onClick={() => handleRemoveTest(test.testId)}
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add tests */}
      {availableTests.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Add Tests to Scenario</label>
          <div className="space-y-2">
            {availableTests.map((test) => (
              <div
                key={test.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{test.test.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {getStarRating(test.discriminativePower)}
                  </div>
                </div>

                <div className="flex gap-1">
                  {(["supports", "challenges", "inconclusive"] as EvidenceResult[]).map(
                    (result) => {
                      const rc = RESULT_CONFIG[result];
                      return (
                        <TooltipProvider key={result}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleAddTest(test, result)}
                                className={cn(
                                  "p-1.5 rounded text-muted-foreground hover:bg-muted transition-colors",
                                  rc.hoverColor,
                                )}
                              >
                                <Plus className="size-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <p>Add as {rc.label.toLowerCase()}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    },
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {tests.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Layers className="size-8 mx-auto mb-2 opacity-50" />
          <p>No tests available to build scenarios.</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Test Comparison View
// ============================================================================

interface TestComparisonViewProps {
  currentConfidence: number;
  tests: TestQueueItem[];
  onRunTest?: (test: TestQueueItem) => void;
}

function TestComparisonView({ currentConfidence, tests, onRunTest }: TestComparisonViewProps) {
  const comparison = compareTests(currentConfidence, tests);

  if (tests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <BarChart3 className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No Tests to Compare</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Add tests to your queue to see which ones would be most valuable to run.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recommendation */}
      {comparison.recommendation && (
        <div className="p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-start gap-3">
            <Sparkles className="size-5 text-indigo-600 mt-0.5" />
            <div>
              <div className="font-medium mb-1">Recommendation</div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {comparison.recommendation.testName}
                </span>
                {" - "}
                {comparison.recommendation.reason}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold">{comparison.summary.totalTests}</div>
          <div className="text-xs text-muted-foreground">Total Tests</div>
        </div>
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
          <div className="text-2xl font-bold text-green-600">
            {comparison.summary.highValueTests}
          </div>
          <div className="text-xs text-muted-foreground">High Value</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="text-2xl font-bold">
            {comparison.summary.averageInformationValue.toFixed(1)}%
          </div>
          <div className="text-xs text-muted-foreground">Avg Info Value</div>
        </div>
      </div>

      {/* Ranked tests table */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Tests Ranked by Information Value</label>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Test</th>
                <th className="px-3 py-2 text-center font-medium">Power</th>
                <th className="px-3 py-2 text-center font-medium">Info Value</th>
                <th className="px-3 py-2 text-center font-medium">Rating</th>
                <th className="px-3 py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {comparison.rankedTests.map((item, idx) => (
                <tr key={item.testId} className="hover:bg-muted/30">
                  <td className="px-3 py-3">
                    <div className="font-medium">{item.testName}</div>
                    {idx === 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-indigo-600">
                        <Sparkles className="size-3" />
                        Top pick
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-amber-500">
                      {getStarRating(item.discriminativePower)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="font-medium">±{item.informationValue.toFixed(1)}%</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <span className={getRecommendationColor(item.recommendationRating)}>
                            {getRecommendationStars(item.recommendationRating)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{RECOMMENDATION_LABELS[item.recommendationRating]}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {onRunTest && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const test = tests.find((t) => t.id === item.testId);
                          if (test) onRunTest(test);
                        }}
                      >
                        Run
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asymmetry explanation */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
        <Info className="size-4 mt-0.5 text-muted-foreground flex-shrink-0" />
        <p className="text-muted-foreground">
          Tests are ranked by <em>information value</em> - how much your confidence could change
          based on the result. Higher-ranked tests will teach you more about your hypothesis.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function WhatIfSimulator({
  sessionId,
  hypothesisId,
  currentConfidence,
  tests,
  onRunTest,
  className,
}: WhatIfSimulatorProps) {
  const [activeView, setActiveView] = React.useState<SimulatorView>("single");

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Scale className="size-5 text-indigo-600" />
        <h3 className="text-lg font-semibold">What-If Simulator</h3>
      </div>

      {/* View tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as SimulatorView)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="single" className="gap-2">
            <FlaskConical className="size-4" />
            <span className="hidden sm:inline">Single Test</span>
          </TabsTrigger>
          <TabsTrigger value="scenario" className="gap-2">
            <Layers className="size-4" />
            <span className="hidden sm:inline">Scenario</span>
          </TabsTrigger>
          <TabsTrigger value="comparison" className="gap-2">
            <BarChart3 className="size-4" />
            <span className="hidden sm:inline">Compare</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <TabsContent value="single" className="mt-0">
                <SingleTestView
                  currentConfidence={currentConfidence}
                  tests={tests}
                  onRunTest={onRunTest}
                />
              </TabsContent>

              <TabsContent value="scenario" className="mt-0">
                <ScenarioBuilderView
                  sessionId={sessionId}
                  hypothesisId={hypothesisId}
                  currentConfidence={currentConfidence}
                  tests={tests}
                />
              </TabsContent>

              <TabsContent value="comparison" className="mt-0">
                <TestComparisonView
                  currentConfidence={currentConfidence}
                  tests={tests}
                  onRunTest={onRunTest}
                />
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </div>
      </Tabs>
    </div>
  );
}

export default WhatIfSimulator;
