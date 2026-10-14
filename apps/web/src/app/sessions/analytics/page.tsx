"use client";

import Link from "next/link";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  computePersonalAnalytics,
  findThreadIdsForSession,
  loadObjectionStatsFromStorage,
  type PersonalAnalytics,
  type Session,
  sessionStorage,
} from "@/lib/brenner-loop";
import {
  type CalibrationMetrics,
  calculateCalibrationMetrics,
  type PredictionRecord,
} from "@/lib/brenner-loop/calibration";
import {
  computeFailureAnalytics,
  type FailureAnalytics,
  STRUCTURAL_PATTERNS,
} from "@/lib/brenner-loop/failure-analytics";
import {
  calculateLifecycleStats,
  HYPOTHESIS_STATE_CONFIG,
  type HypothesisState,
  type HypothesisWithLifecycle,
  type LifecycleStats,
  upgradeToLifecycle,
} from "@/lib/brenner-loop/hypothesis-lifecycle";
import { OPERATOR_METADATA, type OperatorType } from "@/lib/brenner-loop/operators";
import { cn } from "@/lib/utils";

interface StructuralPatternCheckCount {
  name: string;
  description: string;
  matchCount: number;
}

function buildLifecycleHypothesesFromSessions(sessions: Session[]): HypothesisWithLifecycle[] {
  const result: HypothesisWithLifecycle[] = [];
  for (const session of sessions) {
    const cards = Object.values(session.hypothesisCards ?? {});
    for (const card of cards) {
      if (!card) continue;
      let inferredState: HypothesisState = "draft";
      if (card.confidence < 20 || session.archivedHypothesisIds?.includes(card.id)) {
        inferredState = "falsified";
      } else if (session.phase === "complete" && card.confidence >= 80) {
        inferredState = "supported";
      } else if ((session.evidenceLedger?.length ?? 0) > 0) {
        inferredState = "testing";
      } else if (card.predictionsIfTrue.length > 0) {
        inferredState = "active";
      }
      result.push(upgradeToLifecycle(card, inferredState));
    }
  }
  return result;
}

function buildPredictionRecordsFromSessions(sessions: Session[]): PredictionRecord[] {
  const records: PredictionRecord[] = [];

  for (const session of sessions) {
    const cards = Object.values(session.hypothesisCards ?? {});
    const primary =
      (session.primaryHypothesisId && session.hypothesisCards?.[session.primaryHypothesisId]) ||
      cards[0];

    for (const entry of session.evidenceLedger ?? []) {
      if (entry.result !== "supports" && entry.result !== "challenges") continue;
      records.push({
        id: `PRED-EV-${entry.id}`,
        hypothesisId: entry.matchedHypothesisId ?? primary?.id ?? "H1",
        sessionId: session.id,
        prediction: entry.observation || `Test ${entry.testId}`,
        statedConfidence: primary?.confidence ?? 50,
        outcome: entry.result === "supports" ? "correct" : "incorrect",
        domain: primary?.domain?.[0] ?? session.domain,
        predictedAt: session.createdAt,
        resolvedAt: entry.recordedAt,
      });
    }

    for (const card of cards) {
      if (!card) continue;
      const isFalsified =
        card.confidence < 20 || session.archivedHypothesisIds?.includes(card.id);
      const isValidated = session.phase === "complete" && card.confidence >= 80;
      if (isFalsified || isValidated) {
        records.push({
          id: `PRED-HYP-${session.id}-${card.id}`,
          hypothesisId: card.id,
          sessionId: session.id,
          prediction: card.statement,
          statedConfidence: card.confidence,
          outcome: isValidated ? "correct" : "incorrect",
          domain: card.domain?.[0] ?? session.domain,
          predictedAt: session.createdAt,
          resolvedAt: session.updatedAt,
        });
      }
    }
  }

  return records;
}

function computeAllStructuralPatternCounts(sessions: Session[]): StructuralPatternCheckCount[] {
  return STRUCTURAL_PATTERNS.map((pattern) => {
    let matchCount = 0;
    for (const session of sessions) {
      for (const card of Object.values(session.hypothesisCards ?? {})) {
        if (card && pattern.detector(card)) {
          matchCount++;
        }
      }
    }
    return {
      name: pattern.name,
      description: pattern.description,
      matchCount,
    };
  });
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function formatMinutes(value: number): string {
  if (!Number.isFinite(value)) return "0 min";
  const rounded = Math.round(Math.max(0, value));
  return `${rounded} min`;
}

function operatorBarWidth(params: { usedCount: number; sessionsTotal: number }): string {
  const pct = params.sessionsTotal > 0 ? params.usedCount / params.sessionsTotal : 0;
  return `${Math.round(Math.max(0, Math.min(1, pct)) * 100)}%`;
}

function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function OperatorRow({
  operatorType,
  usedCount,
  sessionsTotal,
}: {
  operatorType: OperatorType;
  usedCount: number;
  sessionsTotal: number;
}) {
  const meta = OPERATOR_METADATA[operatorType];
  const width = operatorBarWidth({ usedCount, sessionsTotal });
  const pct = sessionsTotal > 0 ? usedCount / sessionsTotal : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-base leading-none">
            {meta.icon}
          </span>
          <span className="font-medium">{meta.name}</span>
          <span className="text-xs text-muted-foreground font-mono">{meta.symbol}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="font-mono text-foreground">{usedCount}</span> / {sessionsTotal} (
          {formatPercent(pct)})
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full",
            operatorType === "scale_check" ? "bg-purple-500/70" : "bg-primary/70",
          )}
          style={{ width }}
        />
      </div>
    </div>
  );
}

export default function PersonalAnalyticsPage() {
  const [state, setState] = React.useState<
    | { status: "loading" }
    | {
        status: "ready";
        analytics: PersonalAnalytics;
        failureAnalytics: FailureAnalytics;
        calibration: CalibrationMetrics;
        structuralCounts: StructuralPatternCheckCount[];
        lifecycleStats: LifecycleStats;
      }
    | { status: "error"; message: string }
  >({ status: "loading" });

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const summaries = await sessionStorage.list();
        const maybeSessions = await Promise.all(summaries.map((s) => sessionStorage.load(s.id)));
        const sessions = maybeSessions.filter((s): s is Session => s !== null);

        // Load objection stats from localStorage
        const threadIds = sessions.flatMap((s) => findThreadIdsForSession(s.id));
        const objectionStats = loadObjectionStatsFromStorage(threadIds);

        const analytics = computePersonalAnalytics({ sessions, objectionStats });
        const failureAnalytics = computeFailureAnalytics({ sessions });
        const predictionRecords = buildPredictionRecordsFromSessions(sessions);
        const calibration = calculateCalibrationMetrics(predictionRecords);
        const structuralCounts = computeAllStructuralPatternCounts(sessions);
        const lifecycleStats = calculateLifecycleStats(
          buildLifecycleHypothesesFromSessions(sessions),
        );
        if (!cancelled) {
          setState({
            status: "ready",
            analytics,
            failureAnalytics,
            calibration,
            structuralCounts,
            lifecycleStats,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!cancelled) setState({ status: "error", message });
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-3xl space-y-6 animate-fade-in-up">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Personal Analytics</h1>
          <p className="text-sm text-muted-foreground">
            This dashboard reads from your local in-browser Brenner Loop sessions.
          </p>
        </div>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          Failed to load sessions: <span className="font-mono">{state.message}</span>
        </div>
        <Button asChild variant="outline">
          <Link href="/sessions">Back to Sessions</Link>
        </Button>
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div className="mx-auto max-w-3xl space-y-6 animate-fade-in-up">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Personal Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Computing metrics from your local session history…
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading…
        </div>
      </div>
    );
  }

  const analytics = state.analytics;
  const sessionsTotal = analytics.sessionsTotal;
  const operators = (Object.keys(analytics.operatorsUsedDistribution) as OperatorType[])
    .map((op) => ({ op, count: analytics.operatorsUsedDistribution[op] }))
    .sort((a, b) => b.count - a.count);

  const trendPoints = analytics.trendsOver30Days.points.slice(-14);
  const maxTrendValue = Math.max(1, ...trendPoints.map((p) => p.averageFalsifiabilityScore));
  const trendStartAvg =
    analytics.trendsOver30Days.points
      .slice(0, 15)
      .reduce((sum, p) => sum + p.averageFalsifiabilityScore, 0) / 15;
  const trendEndAvg =
    analytics.trendsOver30Days.points
      .slice(-15)
      .reduce((sum, p) => sum + p.averageFalsifiabilityScore, 0) / 15;
  const trendDelta = Math.round(trendEndAvg - trendStartAvg);

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-fade-in-up">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Personal Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Local-only view of your Brenner Loop session history and operator usage.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-border bg-muted/40 text-muted-foreground">
            computed {new Date(analytics.computedAt).toLocaleString()}
          </Badge>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              const date = analytics.computedAt.slice(0, 10);
              downloadJson(`brenner-personal-analytics-${date}.json`, analytics);
            }}
          >
            Download JSON
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/sessions">Back to Sessions</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{analytics.sessionsCompleted}</div>
            <div className="text-xs text-muted-foreground">
              of <span className="font-mono">{sessionsTotal}</span> total (
              {formatPercent(analytics.completionRate)})
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hypotheses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{analytics.hypothesesTested}</div>
            <div className="text-xs text-muted-foreground">
              <span className="font-mono">{analytics.hypothesesWithCompetitors}</span> with
              competitors
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{analytics.testsRecorded}</div>
            <div className="text-xs text-muted-foreground">Recorded across all sessions</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {formatMinutes(analytics.averageSessionDurationMinutes)}
            </div>
            <div className="text-xs text-muted-foreground">Based on createdAt → updatedAt</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Quality Signals</CardTitle>
            <p className="text-sm text-muted-foreground">
              Computed from your primary hypothesis cards.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">Avg falsifiability</div>
              <div className="text-sm font-semibold">
                {Math.round(analytics.averageFalsifiabilityScore)}/100
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">Avg specificity</div>
              <div className="text-sm font-semibold">
                {Math.round(analytics.averageSpecificityScore)}/100
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  30-day falsifiability trend
                </div>
                <div
                  className={cn(
                    "text-xs font-mono",
                    trendDelta > 0
                      ? "text-success"
                      : trendDelta < 0
                        ? "text-destructive"
                        : "text-muted-foreground",
                  )}
                >
                  {trendDelta >= 0 ? "+" : ""}
                  {trendDelta}
                </div>
              </div>

              <div
                className="flex items-end gap-1 h-16"
                aria-label="Falsifiability score trend over last 14 days"
              >
                {trendPoints.map((point) => {
                  const heightPct = Math.max(
                    0,
                    Math.min(100, (point.averageFalsifiabilityScore / maxTrendValue) * 100),
                  );
                  const title = `${point.date}: ${Math.round(point.averageFalsifiabilityScore)}/100 (${point.sessionsCreated} sessions)`;
                  return (
                    <div key={point.date} className="flex-1">
                      <div
                        className="w-full rounded-sm bg-primary/60"
                        style={{ height: `${heightPct}%` }}
                        title={title}
                        role="img"
                        aria-label={title}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="text-xs text-muted-foreground">
                Showing last 14 days of average falsifiability (by session created date).
              </div>
            </div>
            {analytics.insights.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Insights
                </div>
                <ul className="space-y-1 text-sm text-foreground">
                  {analytics.insights.map((insight, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span aria-hidden="true" className="text-muted-foreground">
                        •
                      </span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Operator Usage</CardTitle>
            <p className="text-sm text-muted-foreground">
              How often each operator appears across sessions.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessionsTotal === 0 ? (
              <div className="text-sm text-muted-foreground">
                No sessions yet. Once you create Brenner Loop sessions, this will populate
                automatically.
              </div>
            ) : (
              operators.map(({ op, count }) => (
                <OperatorRow
                  key={op}
                  operatorType={op}
                  usedCount={count}
                  sessionsTotal={sessionsTotal}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hypothesis Outcomes & Learning Metrics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Hypothesis Outcomes</CardTitle>
            <p className="text-sm text-muted-foreground">
              Track how your hypotheses fare through testing.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/30 border border-border">
                <div className="text-2xl font-semibold text-destructive">
                  {analytics.hypothesesFalsified}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Falsified</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30 border border-border">
                <div className="text-2xl font-semibold text-success">
                  {analytics.hypothesesRobust}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Robust</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30 border border-border">
                <div className="text-2xl font-semibold text-muted-foreground">
                  {analytics.hypothesesAbandoned}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Abandoned</div>
              </div>
            </div>
            {(analytics.hypothesesFalsified > 0 || analytics.hypothesesRobust > 0) && (
              <div className="text-xs text-muted-foreground">
                Falsified = confidence &lt; 20% | Robust = confidence &gt; 80% in completed sessions
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Learning Metrics</CardTitle>
            <p className="text-sm text-muted-foreground">
              How you respond to evidence and objections.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <div>
                <div className="text-sm font-medium">Revisions After Evidence</div>
                <div className="text-xs text-muted-foreground">
                  Hypotheses updated based on evidence
                </div>
              </div>
              <div className="text-xl font-semibold">{analytics.revisionsAfterEvidence}</div>
            </div>
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <div>
                <div className="text-sm font-medium">Objections Addressed</div>
                <div className="text-xs text-muted-foreground">
                  Tribunal objections you resolved
                </div>
              </div>
              <div className="text-xl font-semibold">{analytics.objectionsAddressed}</div>
            </div>
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <div>
                <div className="text-sm font-medium">Objections Accepted</div>
                <div className="text-xs text-muted-foreground">Objections you incorporated</div>
              </div>
              <div className="text-xl font-semibold">{analytics.objectionsAccepted}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Failure Mode Analytics & Confidence Calibration */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">
              Failure Mode &amp; Structural Pattern Analytics
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Structural vulnerabilities and domain failure patterns across{" "}
              <span className="font-mono">{state.failureAnalytics.hypothesesAnalyzed}</span>{" "}
              analyzed hypotheses.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <div>
                <div className="text-sm font-medium">Overall Hypothesis Failure Rate</div>
                <div className="text-xs text-muted-foreground">
                  Archived or confidence &lt; 20%
                </div>
              </div>
              <div className="text-xl font-semibold font-mono">
                {formatPercent(state.failureAnalytics.overallFailureRate)}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Structural Vulnerability Scan
              </div>
              <div className="space-y-1.5">
                {state.structuralCounts.slice(0, 5).map((pattern) => (
                  <div
                    key={pattern.name}
                    className="flex items-center justify-between gap-2 text-xs rounded-md border border-border/60 bg-background/50 px-3 py-2"
                  >
                    <div>
                      <div className="font-medium text-foreground">{pattern.name}</div>
                      <div className="text-muted-foreground">{pattern.description}</div>
                    </div>
                    <Badge
                      variant={pattern.matchCount > 0 ? "secondary" : "outline"}
                      className="font-mono shrink-0"
                    >
                      {pattern.matchCount} match{pattern.matchCount === 1 ? "" : "es"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {state.failureAnalytics.insights.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  Failure Pattern Insights
                </div>
                {state.failureAnalytics.insights.slice(0, 3).map((ins) => (
                  <p key={ins.id} className="text-xs text-foreground">
                    • {ins.message} <span className="text-muted-foreground">({ins.suggestion})</span>
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Confidence Calibration &amp; Brier Score</CardTitle>
            <p className="text-sm text-muted-foreground">
              Measures how closely your stated confidence matches empirical outcomes.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
                <div className="text-xl font-semibold font-mono">
                  {state.calibration.brierScore.toFixed(3)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Brier Score</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
                <div className="text-xl font-semibold font-mono">
                  {formatPercent(state.calibration.calibrationError)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Calib. Error (ECE)</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
                <div className="text-xl font-semibold font-mono">
                  {Math.round(state.calibration.sharpness)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Sharpness (σ)</div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <div>
                <div className="text-sm font-medium">Calibration Bias Assessment</div>
                <div className="text-xs text-muted-foreground">
                  Based on {state.calibration.totalPredictions} resolved prediction
                  {state.calibration.totalPredictions === 1 ? "" : "s"}
                </div>
              </div>
              <Badge variant="outline" className="capitalize">
                {state.calibration.biasAssessment.replace("_", " ")}
              </Badge>
            </div>

            <div className="text-xs text-muted-foreground">
              Brier Score ranges from 0.000 (perfect calibration) to 1.000. Record test outcomes in
              the Evidence Ledger to refine your calibration curve.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="analytics-lifecycle-funnel">
        <CardHeader className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Hypothesis Lifecycle Funnel</CardTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {state.lifecycleStats.totalHypotheses} total hypotheses
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            State distribution across the formal Brenner hypothesis lifecycle state machine.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {(Object.keys(HYPOTHESIS_STATE_CONFIG) as HypothesisState[]).map((st) => {
              const cfg = HYPOTHESIS_STATE_CONFIG[st];
              const count = state.lifecycleStats.byState[st] ?? 0;
              return (
                <div
                  key={st}
                  className={cn(
                    "rounded-lg border p-3 text-center space-y-1",
                    count > 0
                      ? cn(cfg.color.bg, cfg.color.border)
                      : "border-border bg-muted/20",
                  )}
                >
                  <div
                    className={cn(
                      "text-xl font-semibold font-mono",
                      count > 0 ? cfg.color.text : "text-muted-foreground",
                    )}
                  >
                    {count}
                  </div>
                  <div className="text-xs font-medium text-foreground">{cfg.label}</div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground pt-2 border-t border-border/60">
            <span>
              Lifecycle Falsification Rate:{" "}
              <strong className="font-mono text-foreground">
                {formatPercent(state.lifecycleStats.falsificationRate)}
              </strong>
            </span>
            <span>
              Supersession Rate:{" "}
              <strong className="font-mono text-foreground">
                {formatPercent(state.lifecycleStats.supersessionRate)}
              </strong>
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">Achievements</CardTitle>
          <p className="text-sm text-muted-foreground">
            Lightweight milestones to make progress visible.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {analytics.achievements.map((a) => (
            <div
              key={a.id}
              className={cn(
                "rounded-xl border p-4",
                a.unlocked ? "border-success/25 bg-success/10" : "border-border bg-muted/20",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm font-semibold">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{a.description}</div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0",
                    a.unlocked
                      ? "border-success/30 bg-success/15 text-success"
                      : "border-border bg-muted/40 text-muted-foreground",
                  )}
                >
                  {a.unlocked ? "Unlocked" : "Locked"}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
