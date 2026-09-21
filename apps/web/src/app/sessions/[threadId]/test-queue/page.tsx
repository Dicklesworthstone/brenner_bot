"use client";

/**
 * Test Queue Page (Planning → Execution)
 *
 * LocalStorage-backed backlog of discriminative tests that have been generated
 * (typically via Exclusion Test ⊘) but not yet executed or fully researched.
 *
 * Core invariant: predictions must be locked before progressing to execution.
 *
 * @see brenner_bot-njjo.5
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { DemoFeaturePreview } from "@/components/sessions/DemoFeaturePreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { recordSessionResumeEntry } from "@/lib/brenner-loop";
import { createHypothesisCard, generateHypothesisCardId } from "@/lib/brenner-loop/hypothesis";
import type { ExclusionTest } from "@/lib/brenner-loop/operators/exclusion-test";
import {
  EXCLUSION_TEST_CATEGORY_LABELS,
  generateExclusionTests,
  getDiscriminativePowerStars,
  getFeasibilityColor,
} from "@/lib/brenner-loop/operators/exclusion-test";
import { type AssumptionLedgerEntry, loadAssumptionLedger } from "@/lib/brenner-loop/storage";
import {
  addExclusionTestsToQueue,
  clearTestQueue,
  getTestQueueStats,
  isPredictionsLocked,
  loadTestQueue,
  lockQueueItemPredictions,
  type TestQueueItem,
  type TestQueuePriority,
  type TestQueueStatus,
  updateQueueItem,
} from "@/lib/brenner-loop/test-queue";
import { isDemoThreadId } from "@/lib/demo-mode";
import { cn } from "@/lib/utils";

// ============================================================================//
// Helpers
// ============================================================================//

const PRIORITY_ORDER: TestQueuePriority[] = ["urgent", "high", "medium", "low", "someday"];

const PRIORITY_LABELS: Record<TestQueuePriority, string> = {
  urgent: "★★★★★ Urgent",
  high: "★★★★☆ High",
  medium: "★★★☆☆ Medium",
  low: "★★☆☆☆ Low",
  someday: "★☆☆☆☆ Someday",
};

const STATUS_LABELS: Record<TestQueueStatus, string> = {
  queued: "Queued",
  researching: "Researching",
  designing: "Designing",
  in_progress: "In Progress",
  awaiting_results: "Awaiting Results",
  completed: "Completed",
  infeasible: "Infeasible",
  deferred: "Deferred",
};

const STATUSES_REQUIRING_LOCK: Set<TestQueueStatus> = new Set([
  "researching",
  "designing",
  "in_progress",
  "awaiting_results",
  "completed",
]);

function getThreadIdParam(params: ReturnType<typeof useParams>): string {
  const raw = params.threadId;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw[0] ?? "";
  return "";
}

function toSafeHypothesisSessionId(threadId: string): string {
  const normalized = threadId
    .replace(/[^A-Za-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  if (normalized.length === 0) return "SESSION";
  if (!/^[A-Za-z0-9]/.test(normalized)) return `S-${normalized}`;
  return normalized;
}

function groupByPriority(items: TestQueueItem[]): Record<TestQueuePriority, TestQueueItem[]> {
  const grouped: Record<TestQueuePriority, TestQueueItem[]> = {
    urgent: [],
    high: [],
    medium: [],
    low: [],
    someday: [],
  };

  for (const item of items) grouped[item.priority].push(item);

  for (const priority of PRIORITY_ORDER) {
    grouped[priority].sort((a, b) => {
      if (a.status !== b.status) return a.status.localeCompare(b.status);
      return Date.parse(b.addedAt) - Date.parse(a.addedAt);
    });
  }

  return grouped;
}

// ============================================================================//
// Page
// ============================================================================//

export default function TestQueuePage() {
  const params = useParams();
  const threadId = getThreadIdParam(params);

  if (isDemoThreadId(threadId)) {
    return (
      <DemoFeaturePreview
        threadId={threadId}
        featureName="Test Queue"
        featureDescription="Manage and prioritize discriminative tests, track execution status, and lock predictions before running experiments."
      />
    );
  }

  return <TestQueuePageContent threadId={threadId} />;
}

function TestQueuePageContent({ threadId }: { threadId: string }) {
  React.useEffect(() => {
    recordSessionResumeEntry(threadId, "test-queue");
  }, [threadId]);

  const queueSessionId = threadId;
  const hypothesisSessionId = React.useMemo(() => toSafeHypothesisSessionId(threadId), [threadId]);

  const [items, setItems] = React.useState<TestQueueItem[]>([]);
  const [statement, setStatement] = React.useState("");
  const [mechanism, setMechanism] = React.useState("");
  const [generatedTests, setGeneratedTests] = React.useState<ExclusionTest[]>([]);
  const [selectedTestIds, setSelectedTestIds] = React.useState<Set<string>>(new Set());
  const [activeHypothesisId, setActiveHypothesisId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [assumptionLedger, setAssumptionLedger] = React.useState<AssumptionLedgerEntry[]>([]);

  React.useEffect(() => {
    if (!queueSessionId) return;
    setItems(loadTestQueue(queueSessionId));
  }, [queueSessionId]);

  React.useEffect(() => {
    if (!queueSessionId) return;
    setAssumptionLedger(loadAssumptionLedger(queueSessionId));
  }, [queueSessionId]);

  const assumptionById = React.useMemo(() => {
    const map = new Map<string, AssumptionLedgerEntry>();
    for (const entry of assumptionLedger) map.set(entry.id, entry);
    return map;
  }, [assumptionLedger]);

  const stats = React.useMemo(() => getTestQueueStats(items), [items]);
  const grouped = React.useMemo(() => groupByPriority(items), [items]);

  const canGenerate =
    statement.trim().length >= 10 &&
    mechanism.trim().length >= 10 &&
    hypothesisSessionId.length > 0;

  const toggleSelected = (testId: string) => {
    setSelectedTestIds((prev) => {
      const next = new Set(prev);
      if (next.has(testId)) next.delete(testId);
      else next.add(testId);
      return next;
    });
  };

  const handleGenerate = () => {
    setError(null);
    if (!canGenerate) return;

    try {
      const hypothesisId = generateHypothesisCardId(hypothesisSessionId, 1, 1);
      const hypothesis = createHypothesisCard({
        id: hypothesisId,
        sessionId: hypothesisSessionId,
        statement: statement.trim(),
        mechanism: mechanism.trim(),
        predictionsIfTrue: [
          "If this hypothesis is true, we should observe patterns consistent with the proposed causal pathway.",
        ],
        predictionsIfFalse: [
          "If this hypothesis is false, observations should be better explained by an alternative mechanism or confound.",
        ],
        impossibleIfTrue: [
          "If a decisive falsification condition occurs, the hypothesis must be rejected or revised.",
        ],
        confidence: 50,
      });

      const tests = generateExclusionTests(hypothesis);
      setGeneratedTests(tests);
      setSelectedTestIds(new Set());
      setActiveHypothesisId(hypothesis.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate exclusion tests.");
    }
  };

  const handleAddSelectedToQueue = () => {
    setError(null);
    if (!queueSessionId) return;
    if (!activeHypothesisId) {
      setError("Generate tests first (hypothesis ID missing).");
      return;
    }

    const selected = generatedTests.filter((t) => selectedTestIds.has(t.id));
    if (selected.length === 0) return;

    try {
      const next = addExclusionTestsToQueue({
        sessionId: queueSessionId,
        hypothesisId: activeHypothesisId,
        tests: selected,
        source: "exclusion_test",
      });
      setItems(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add tests to queue.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link href={`/sessions/${threadId}`} className="text-sm text-primary hover:underline">
              ← Back to Session
            </Link>
            <span className="text-xs text-muted-foreground font-mono">{threadId}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Test Queue</h1>
          <p className="text-sm text-muted-foreground">
            Convert planned discriminative tests into executed evidence — with pre-registered
            predictions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-border bg-card px-4 py-2">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-lg font-bold">{stats.total}</div>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-2">
            <div className="text-xs text-muted-foreground">Locked</div>
            <div className="text-lg font-bold">{stats.locked}</div>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              clearTestQueue(queueSessionId);
              setItems([]);
            }}
            disabled={stats.total === 0}
          >
            Clear Queue
          </Button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-4">
            <span>Generate Exclusion Tests (⊘)</span>
            <Badge variant="secondary">adds to queue</Badge>
          </CardTitle>
          <CardDescription>
            Provide a minimal hypothesis statement and mechanism, then select high-discriminative
            tests to enqueue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="statement">Hypothesis Statement</Label>
              <Textarea
                id="statement"
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                placeholder="e.g., Increased X causes Y via mechanism M"
                className="min-h-[110px]"
              />
              <div className="text-xs text-muted-foreground">Minimum 10 characters.</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mechanism">Mechanism</Label>
              <Textarea
                id="mechanism"
                value={mechanism}
                onChange={(e) => setMechanism(e.target.value)}
                placeholder="How would X produce Y? What is the causal pathway?"
                className="min-h-[110px]"
              />
              <div className="text-xs text-muted-foreground">Minimum 10 characters.</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleGenerate} disabled={!canGenerate}>
              Generate Tests
            </Button>
            <Button
              variant="secondary"
              onClick={handleAddSelectedToQueue}
              disabled={selectedTestIds.size === 0 || !activeHypothesisId}
            >
              Add Selected to Queue ({selectedTestIds.size})
            </Button>
            {activeHypothesisId && (
              <span className="text-xs text-muted-foreground font-mono">
                hypothesis {activeHypothesisId}
              </span>
            )}
          </div>

          {generatedTests.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-semibold">Generated Tests</div>
              <div className="space-y-2">
                {generatedTests.map((test) => {
                  const selected = selectedTestIds.has(test.id);
                  return (
                    <button
                      key={test.id}
                      type="button"
                      onClick={() => toggleSelected(test.id)}
                      className={cn(
                        "w-full text-left rounded-xl border p-4 transition-colors",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:bg-muted/30",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground">{test.name}</span>
                            <Badge variant="secondary" className="font-mono">
                              {getDiscriminativePowerStars(test.discriminativePower)}
                            </Badge>
                            <Badge variant="outline">
                              {EXCLUSION_TEST_CATEGORY_LABELS[test.category]}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={getFeasibilityColor(test.feasibility)}
                            >
                              {test.feasibility}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">{test.description}</div>
                        </div>
                        <div
                          className={cn(
                            "shrink-0 size-6 rounded-md border flex items-center justify-center text-xs font-bold",
                            selected
                              ? "border-primary text-primary bg-primary/10"
                              : "border-border text-muted-foreground",
                          )}
                        >
                          {selected ? "✓" : "+"}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg border border-border bg-muted/20 p-3">
                          <div className="text-xs text-muted-foreground mb-1">
                            If Hypothesis True
                          </div>
                          <div className="text-foreground">{test.supportCondition}</div>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/20 p-3">
                          <div className="text-xs text-muted-foreground mb-1">
                            If Hypothesis False
                          </div>
                          <div className="text-foreground">{test.falsificationCondition}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold tracking-tight">Queue</h2>
          <div className="text-xs text-muted-foreground">
            Tip: Lock predictions before progressing beyond{" "}
            <span className="font-mono text-foreground">queued</span>.
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No tests in the queue yet. Generate exclusion tests above and add the best ones.
          </div>
        ) : (
          <div className="space-y-6">
            {PRIORITY_ORDER.map((priority) => {
              const groupItems = grouped[priority];
              if (groupItems.length === 0) return null;

              return (
                <div key={priority} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{PRIORITY_LABELS[priority]}</div>
                    <Badge variant="secondary">{groupItems.length}</Badge>
                  </div>

                  <div className="space-y-3">
                    {groupItems.map((item) => {
                      const locked = isPredictionsLocked(item);
                      const lockDisabled =
                        locked ||
                        item.predictionIfTrue.trim().length === 0 ||
                        item.predictionIfFalse.trim().length === 0;

                      return (
                        <Card key={item.id} className="overflow-hidden">
                          <CardHeader className="pb-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-1 min-w-0">
                                <CardTitle className="text-base">{item.test.name}</CardTitle>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="secondary" className="font-mono">
                                    {getDiscriminativePowerStars(item.discriminativePower)}
                                  </Badge>
                                  <Badge variant="outline">
                                    {EXCLUSION_TEST_CATEGORY_LABELS[item.test.category]}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={getFeasibilityColor(item.test.feasibility)}
                                  >
                                    {item.test.feasibility}
                                  </Badge>
                                  {locked ? (
                                    <Badge
                                      variant="outline"
                                      className="border-success/40 text-success"
                                    >
                                      Predictions locked
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="border-warning/40 text-warning"
                                    >
                                      Predictions unlocked
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant={locked ? "secondary" : "default"}
                                  onClick={() =>
                                    setItems(lockQueueItemPredictions(queueSessionId, item.id))
                                  }
                                  disabled={lockDisabled}
                                >
                                  {locked ? "Locked" : "Lock Predictions"}
                                </Button>
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-5">
                            {assumptionLedger.length > 0 && (
                              <div className="space-y-2">
                                <Label>Linked Assumptions</Label>
                                {item.assumptionIds.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">
                                    None yet. Link assumptions to make each test’s target explicit.
                                  </p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {item.assumptionIds.map((assumptionId) => {
                                      const entry = assumptionById.get(assumptionId);
                                      return (
                                        <Badge
                                          key={assumptionId}
                                          variant="outline"
                                          className="max-w-full gap-2"
                                        >
                                          <span className="font-mono text-[11px]">
                                            {assumptionId}
                                          </span>
                                          {entry?.statement && (
                                            <span className="text-[11px] text-muted-foreground line-clamp-1">
                                              {entry.statement}
                                            </span>
                                          )}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                )}

                                <details className="rounded-lg border border-border bg-muted/20 p-3">
                                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                                    Link / unlink assumptions
                                  </summary>
                                  <div className="mt-3 space-y-2">
                                    {assumptionLedger.map((assumption) => (
                                      <label
                                        key={assumption.id}
                                        className="flex items-start gap-2 text-sm"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={item.assumptionIds.includes(assumption.id)}
                                          onChange={() => {
                                            const next = item.assumptionIds.includes(assumption.id)
                                              ? item.assumptionIds.filter(
                                                  (id) => id !== assumption.id,
                                                )
                                              : [...item.assumptionIds, assumption.id];
                                            setItems(
                                              updateQueueItem(queueSessionId, item.id, {
                                                assumptionIds: next,
                                              }),
                                            );
                                          }}
                                          className="mt-0.5 h-4 w-4 rounded border-border"
                                        />
                                        <span className="flex-1">
                                          <span className="font-mono text-xs">{assumption.id}</span>
                                          <span className="block text-xs text-muted-foreground line-clamp-2">
                                            {assumption.statement}
                                          </span>
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </details>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Prediction if True</Label>
                                <Textarea
                                  defaultValue={item.predictionIfTrue}
                                  disabled={locked}
                                  className="min-h-[90px]"
                                  onBlur={(e) => {
                                    const nextValue = e.currentTarget.value;
                                    if (nextValue !== item.predictionIfTrue) {
                                      setItems(
                                        updateQueueItem(queueSessionId, item.id, {
                                          predictionIfTrue: nextValue,
                                        }),
                                      );
                                    }
                                  }}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Prediction if False</Label>
                                <Textarea
                                  defaultValue={item.predictionIfFalse}
                                  disabled={locked}
                                  className="min-h-[90px]"
                                  onBlur={(e) => {
                                    const nextValue = e.currentTarget.value;
                                    if (nextValue !== item.predictionIfFalse) {
                                      setItems(
                                        updateQueueItem(queueSessionId, item.id, {
                                          predictionIfFalse: nextValue,
                                        }),
                                      );
                                    }
                                  }}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                  value={item.status}
                                  onValueChange={(value) => {
                                    const nextStatus = value as TestQueueStatus;
                                    setItems(
                                      updateQueueItem(queueSessionId, item.id, {
                                        status: nextStatus,
                                      }),
                                    );
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(Object.keys(STATUS_LABELS) as TestQueueStatus[]).map(
                                      (status) => {
                                        const disabled =
                                          !locked && STATUSES_REQUIRING_LOCK.has(status);
                                        return (
                                          <SelectItem
                                            key={status}
                                            value={status}
                                            disabled={disabled}
                                          >
                                            {STATUS_LABELS[status]}
                                            {!locked && disabled ? " (lock required)" : ""}
                                          </SelectItem>
                                        );
                                      },
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>Priority</Label>
                                <Select
                                  value={item.priority}
                                  onValueChange={(value) => {
                                    setItems(
                                      updateQueueItem(queueSessionId, item.id, {
                                        priority: value as TestQueuePriority,
                                      }),
                                    );
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select priority" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PRIORITY_ORDER.map((p) => (
                                      <SelectItem key={p} value={p}>
                                        {PRIORITY_LABELS[p]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>Assigned To</Label>
                                <Input
                                  defaultValue={item.assignedTo ?? ""}
                                  placeholder="(optional)"
                                  onBlur={(e) => {
                                    const nextValue = e.currentTarget.value.trim();
                                    if (nextValue !== (item.assignedTo ?? "")) {
                                      setItems(
                                        updateQueueItem(queueSessionId, item.id, {
                                          assignedTo: nextValue || undefined,
                                        }),
                                      );
                                    }
                                  }}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Due Date</Label>
                                <Input
                                  type="date"
                                  defaultValue={item.dueDate ?? ""}
                                  onBlur={(e) => {
                                    const nextValue = e.currentTarget.value;
                                    if (nextValue !== (item.dueDate ?? "")) {
                                      setItems(
                                        updateQueueItem(queueSessionId, item.id, {
                                          dueDate: nextValue || undefined,
                                        }),
                                      );
                                    }
                                  }}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Estimated Effort</Label>
                                <Input
                                  defaultValue={item.estimatedEffort ?? ""}
                                  placeholder="hours / days / weeks"
                                  onBlur={(e) => {
                                    const nextValue = e.currentTarget.value.trim();
                                    if (nextValue !== (item.estimatedEffort ?? "")) {
                                      setItems(
                                        updateQueueItem(queueSessionId, item.id, {
                                          estimatedEffort: nextValue || undefined,
                                        }),
                                      );
                                    }
                                  }}
                                />
                              </div>
                            </div>

                            <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
                              <div className="text-xs text-muted-foreground mb-1">
                                Test Description
                              </div>
                              <div className="text-foreground">{item.test.description}</div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
