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
import {
  ConfidenceChart,
  EvidenceRecorder,
  EvidenceTimeline,
  LiteratureSearch,
  WhatIfSimulator,
} from "@/components/brenner-loop/evidence";
import type { RecordLiteratureEvidencePayload } from "@/components/brenner-loop/evidence/LiteratureSearch";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createSession,
  type HypothesisCard,
  recordSessionResumeEntry,
  sessionStorage,
} from "@/lib/brenner-loop";
import { computeConfidenceUpdate } from "@/lib/brenner-loop/confidence";
import {
  type EvidenceEntry,
  generateEvidenceId,
  isEvidenceEntry,
} from "@/lib/brenner-loop/evidence";
import { createHypothesisCard, generateHypothesisCardId } from "@/lib/brenner-loop/hypothesis";
import { preparePaperEvidenceData } from "@/lib/brenner-loop/literature";
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
import type { Hypothesis } from "@/lib/schemas/hypothesis";
import type { Prediction } from "@/lib/schemas/prediction";
import { categorizePredictions, processTestExecution } from "@/lib/schemas/test-binding";
import type { TestRecord } from "@/lib/schemas/test-record";
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
  const [activeWorkbenchTab, setActiveWorkbenchTab] = React.useState<
    "what-if" | "record" | "literature" | "ledger"
  >("what-if");

  const [currentHypothesis, setCurrentHypothesis] = React.useState<HypothesisCard>(() =>
    createHypothesisCard({
      id: generateHypothesisCardId(hypothesisSessionId, 1, 1),
      sessionId: hypothesisSessionId,
      statement:
        "Social media usage causes increased anxiety in teenagers through dopamine-driven feedback loops.",
      mechanism:
        "Intermittent variable reward schedules in notifications trigger compulsive checking and acute cortisol elevation.",
      domain: ["Psychology", "Neuroscience"],
      predictionsIfTrue: [
        "Removing social media for 2 weeks reduces adolescent anxiety scores by 20%+",
      ],
      predictionsIfFalse: [
        "Anxiety biomarkers remain unchanged after notification removal",
      ],
      impossibleIfTrue: [
        "Heavy users show lower baseline cortisol than non-users under identical sleep schedules",
      ],
      confidence: 65,
    }),
  );

  const [evidenceEntries, setEvidenceEntries] = React.useState<EvidenceEntry[]>([]);

  React.useEffect(() => {
    if (!queueSessionId) return;
    setItems(loadTestQueue(queueSessionId));
  }, [queueSessionId]);

  React.useEffect(() => {
    if (!queueSessionId) return;
    setAssumptionLedger(loadAssumptionLedger(queueSessionId));
  }, [queueSessionId]);

  React.useEffect(() => {
    let cancelled = false;
    const hydrateFromSession = async () => {
      try {
        const loaded = await sessionStorage.load(threadId);
        if (cancelled || !loaded) return;

        const primaryId = loaded.primaryHypothesisId;
        const primary =
          (primaryId && loaded.hypothesisCards[primaryId]) ||
          Object.values(loaded.hypothesisCards)[0];

        if (primary) {
          const normalizedCard: HypothesisCard = {
            ...primary,
            createdAt:
              primary.createdAt instanceof Date ? primary.createdAt : new Date(primary.createdAt),
            updatedAt:
              primary.updatedAt instanceof Date ? primary.updatedAt : new Date(primary.updatedAt),
          };
          setCurrentHypothesis(normalizedCard);
          setActiveHypothesisId(normalizedCard.id);
          setStatement((prev) => prev || normalizedCard.statement);
          setMechanism((prev) => prev || normalizedCard.mechanism);
        }
      } catch {
        // Fallback to local state
      }

      if (typeof window !== "undefined") {
        try {
          const rawLedger = window.localStorage.getItem(`brenner-evidence-ledger-${threadId}`);
          if (rawLedger) {
            const parsed = JSON.parse(rawLedger) as EvidenceEntry[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              setEvidenceEntries(
                parsed
                  .filter(isEvidenceEntry)
                  .map((entry) => ({
                    ...entry,
                    recordedAt: new Date(entry.recordedAt),
                  })),
              );
            }
          }
        } catch {
          // Ignore malformed ledger
        }
      }
    };
    void hydrateFromSession();
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  const persistEvidenceEntry = React.useCallback(
    async (entry: EvidenceEntry) => {
      const nextEntries = [...evidenceEntries, entry];
      setEvidenceEntries(nextEntries);
      setCurrentHypothesis((prev) => ({
        ...prev,
        confidence: entry.confidenceAfter,
        updatedAt: new Date(),
      }));

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            `brenner-evidence-ledger-${threadId}`,
            JSON.stringify(nextEntries),
          );
        } catch {
          // Ignore
        }
      }

      try {
        const existing =
          (await sessionStorage.load(threadId)) ??
          createSession({
            id: threadId,
            domain: currentHypothesis.domain[0] ?? "Psychology",
            createdBy: "local-operator",
          });
        const updatedCard: HypothesisCard = {
          ...currentHypothesis,
          confidence: entry.confidenceAfter,
          updatedAt: new Date(),
        };
        existing.hypothesisCards[updatedCard.id] = updatedCard;
        existing.primaryHypothesisId = updatedCard.id;
        existing.evidenceLedger.push({
          id: entry.id,
          testId: entry.test.id,
          result: entry.result,
          observation: entry.observation,
          potencyCheckPassed: true,
          matchedHypothesisId: updatedCard.id,
          confidenceDelta: entry.confidenceAfter - entry.confidenceBefore,
          recordedAt: entry.recordedAt.toISOString(),
          recordedBy: entry.recordedBy ?? "local-operator",
          notes: entry.interpretation,
          rawDataRef: entry.source,
        });
        existing.updatedAt = new Date().toISOString();
        await sessionStorage.save(existing);
      } catch {
        // Best-effort persistence
      }
    },
    [evidenceEntries, threadId, currentHypothesis],
  );

  const handleRecordLiteratureEvidence = React.useCallback(
    (payload: RecordLiteratureEvidencePayload) => {
      const update = computeConfidenceUpdate(
        currentHypothesis.confidence,
        { discriminativePower: payload.discriminativePower },
        payload.result,
      );
      const prepared = preparePaperEvidenceData({
        paper: payload.paper,
        sessionId: hypothesisSessionId,
        hypothesisId: currentHypothesis.id,
        result: payload.result,
        keyFinding: payload.keyFinding,
        interpretation: payload.interpretation,
        discriminativePower: payload.discriminativePower,
        confidenceBefore: currentHypothesis.confidence,
        confidenceAfter: update.newConfidence,
        predictionIfTrue: currentHypothesis.predictionsIfTrue[0],
        predictionIfFalse: currentHypothesis.predictionsIfFalse[0],
      });
      const entry: EvidenceEntry = {
        id: generateEvidenceId(hypothesisSessionId, evidenceEntries.length + 1),
        sessionId: hypothesisSessionId,
        hypothesisVersion: currentHypothesis.id,
        ...prepared,
        recordedAt: new Date(),
      };
      void persistEvidenceEntry(entry);
      setActiveWorkbenchTab("ledger");
    },
    [currentHypothesis, hypothesisSessionId, evidenceEntries.length, persistEvidenceEntry],
  );

  const assumptionById = React.useMemo(() => {
    const map = new Map<string, AssumptionLedgerEntry>();
    for (const entry of assumptionLedger) map.set(entry.id, entry);
    return map;
  }, [assumptionLedger]);

  const stats = React.useMemo(() => getTestQueueStats(items), [items]);
  const grouped = React.useMemo(() => groupByPriority(items), [items]);

  const testBindingPreview = React.useMemo(() => {
    const nowIso = new Date().toISOString();
    const safeSess = hypothesisSessionId || "SESSION";
    const hPrimaryId = `H-${safeSess}-001`;
    const hAltId = `H-${safeSess}-002`;
    const predId = `P-${safeSess}-001`;
    const testId = `T-${safeSess}-001`;

    const primaryHypRecord: Hypothesis = {
      id: hPrimaryId,
      statement: currentHypothesis.statement,
      mechanism: currentHypothesis.mechanism,
      origin: "proposed",
      category: "mechanistic",
      confidence: currentHypothesis.confidence >= 70 ? "high" : "medium",
      sessionId: safeSess,
      state: "active",
      isInference: false,
      unresolvedCritiqueCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const altHypRecord: Hypothesis = {
      id: hAltId,
      statement: `Alternative / Null to ${currentHypothesis.statement.slice(0, 60)}`,
      mechanism: "Observed variation is driven by an upstream confounder or baseline noise.",
      origin: "third_alternative",
      category: "third_alternative",
      confidence: "medium",
      sessionId: safeSess,
      state: "active",
      isInference: true,
      unresolvedCritiqueCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const leadQueueItem = items[0];
    const predTrueText =
      leadQueueItem?.predictionIfTrue ||
      currentHypothesis.predictionsIfTrue[0] ||
      "Effect detected in target outcome";
    const predFalseText =
      leadQueueItem?.predictionIfFalse ||
      currentHypothesis.predictionsIfFalse[0] ||
      "No effect observed in target outcome";

    const predictionRecord: Prediction = {
      id: predId,
      name: leadQueueItem?.test.name ?? "Primary Discriminative Prediction",
      condition:
        leadQueueItem?.test.description ??
        "Under controlled intervention targeting the proposed causal mechanism",
      hypothesisPredictions: [
        {
          hypothesisId: hPrimaryId,
          prediction: `Positive effect observed: ${predTrueText}`,
        },
        {
          hypothesisId: hAltId,
          prediction: `No effect observed: ${predFalseText}`,
        },
      ],
      isDiscriminative: true,
      discriminativePower: 3,
      sessionId: safeSess,
      status: "untested",
      isInference: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const testRecord: TestRecord = {
      id: testId,
      name: leadQueueItem?.test.name ?? "Primary Exclusion Test",
      procedure:
        leadQueueItem?.test.description ??
        "Execute pre-registered discriminative intervention with positive potency control.",
      discriminates: [hPrimaryId, hAltId],
      expectedOutcomes: [
        {
          hypothesisId: hPrimaryId,
          outcome: `Positive effect observed: ${predTrueText}`,
          resultType: "positive",
        },
        {
          hypothesisId: hAltId,
          outcome: `No effect observed: ${predFalseText}`,
          resultType: "negative",
        },
      ],
      addressesPredictions: [predId],
      potencyCheck: {
        positiveControl: "Positive control confirms assay sensitivity and intervention delivery.",
        score: 2,
      },
      evidencePerWeekScore: {
        likelihoodRatio: 3,
        cost: 2,
        speed: 2,
        ambiguity: 3,
      },
      feasibility: {
        requirements: "Standard session experimental protocol",
        difficulty: "moderate",
      },
      designedInSession: safeSess,
      status: "ready",
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const latestEvidence = evidenceEntries[evidenceEntries.length - 1];
    const observedResult =
      latestEvidence?.result === "challenges"
        ? `No effect observed: ${latestEvidence.observation}`
        : `Positive effect observed: ${latestEvidence?.observation ?? predTrueText}`;

    const categorized = categorizePredictions(observedResult, [predictionRecord], hPrimaryId);

    const executionOutcome = processTestExecution(
      {
        testId,
        result: observedResult,
        matchedPredictions: categorized.matched.length > 0 ? categorized.matched : [predId],
        violatedPredictions: categorized.violated,
        confidence: "high",
        potencyCheckPassed: true,
        executedBy: "local-operator",
      },
      testRecord,
      [predictionRecord],
      [primaryHypRecord, altHypRecord],
      {
        autoApply: false,
        sessionId: safeSess,
      },
    );

    const primarySuggestion = executionOutcome.suggestResult?.suggestions.find(
      (s) => s.hypothesisId === hPrimaryId,
    );

    return {
      categorized,
      executionOutcome,
      primarySuggestion,
      testName: testRecord.name,
      hasRecordedEvidence: Boolean(latestEvidence),
    };
  }, [hypothesisSessionId, currentHypothesis, items, evidenceEntries]);

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
        confidence: currentHypothesis.confidence,
      });

      const tests = generateExclusionTests(hypothesis);
      setGeneratedTests(tests);
      setSelectedTestIds(new Set());
      setActiveHypothesisId(hypothesis.id);
      setCurrentHypothesis(hypothesis);
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

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Evidence &amp; Simulation Workbench
            </h2>
            <p className="text-xs text-muted-foreground">
              Simulate test impact, record experimental observations, import literature citations,
              and track Bayesian confidence updates.
            </p>
          </div>
          <Badge variant="outline" className="font-mono">
            Confidence: {currentHypothesis.confidence}%
          </Badge>
        </div>

        <div
          data-testid="test-binding-preview"
          className="rounded-xl border border-border bg-muted/20 p-4 space-y-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Test → Hypothesis Lifecycle Binding (§229)
              </span>
              <Badge variant="outline" className="font-mono text-xs">
                {testBindingPreview.hasRecordedEvidence ? "Live Evidence" : "Pre-Execution Preview"}
              </Badge>
            </div>
            {testBindingPreview.primarySuggestion && (
              <Badge
                variant={
                  testBindingPreview.primarySuggestion.suggestedAction === "kill"
                    ? "destructive"
                    : "secondary"
                }
                className="font-mono text-xs uppercase"
              >
                Suggested Action: {testBindingPreview.primarySuggestion.suggestedAction}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{testBindingPreview.testName}:</span>{" "}
            {testBindingPreview.primarySuggestion?.reason ??
              "Pre-registered predictions bound to primary and third-alternative hypotheses with potency check validation."}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs
              value={activeWorkbenchTab}
              onValueChange={(val) =>
                setActiveWorkbenchTab(
                  val as "what-if" | "record" | "literature" | "ledger",
                )
              }
            >
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
                <TabsTrigger value="what-if">What-If Simulator</TabsTrigger>
                <TabsTrigger value="record">Record Evidence</TabsTrigger>
                <TabsTrigger value="literature">Literature Search</TabsTrigger>
                <TabsTrigger value="ledger">
                  Evidence Ledger ({evidenceEntries.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="what-if">
                <WhatIfSimulator
                  sessionId={hypothesisSessionId}
                  hypothesisId={currentHypothesis.id}
                  currentConfidence={currentHypothesis.confidence}
                  tests={items}
                  onRunTest={() => setActiveWorkbenchTab("record")}
                />
              </TabsContent>

              <TabsContent value="record">
                <EvidenceRecorder
                  sessionId={hypothesisSessionId}
                  hypothesisId={currentHypothesis.id}
                  currentConfidence={currentHypothesis.confidence}
                  predefinedTests={
                    items.length > 0 ? items.map((item) => item.test) : generatedTests
                  }
                  evidenceCount={evidenceEntries.length}
                  onRecordEvidence={(entry) => {
                    void persistEvidenceEntry(entry);
                    setActiveWorkbenchTab("ledger");
                  }}
                />
              </TabsContent>

              <TabsContent value="literature">
                <LiteratureSearch
                  sessionId={hypothesisSessionId}
                  hypothesis={currentHypothesis}
                  currentConfidence={currentHypothesis.confidence}
                  onRecordEvidence={handleRecordLiteratureEvidence}
                />
              </TabsContent>

              <TabsContent value="ledger" className="space-y-6">
                <ConfidenceChart
                  entries={evidenceEntries}
                  initialConfidence={65}
                />
                <EvidenceTimeline entries={evidenceEntries} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
