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
import { OPERATOR_METADATA, type OperatorType } from "@/lib/brenner-loop/operators";
import { cn } from "@/lib/utils";

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
    | { status: "ready"; analytics: PersonalAnalytics }
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
        if (!cancelled) setState({ status: "ready", analytics });
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
