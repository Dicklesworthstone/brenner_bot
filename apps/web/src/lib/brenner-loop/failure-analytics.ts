/**
 * Failure Mode Analytics
 *
 * Tracks how hypotheses fail and surfaces patterns to help users avoid common pitfalls.
 * Provides insights like: "Hypotheses in psychology that don't address selection bias
 * fail 73% of the time at the Exclusion Test phase."
 *
 * This module builds on the existing analytics.ts infrastructure.
 *
 * @see brenner_bot-4lv6 (bead)
 * @see brenner_bot-ukd1 (parent epic: Semantic Search & Intelligence)
 * @module brenner-loop/failure-analytics
 */

import type { OperatorType } from "./operators/framework";
import type { HypothesisCard, Session, SessionPhase } from "./types";

// ============================================================================
// Types
// ============================================================================

/**
 * Describes a specific failure mode pattern.
 */
export interface FailureMode {
  /** Unique identifier for this failure mode */
  id: string;

  /** Human-readable name (e.g., "Unaddressed Selection Bias") */
  name: string;

  /** Detailed description of the failure mode */
  description: string;

  /** Which phase the failure typically manifests in */
  failurePhase: SessionPhase;

  /** How common this failure is (0-1) */
  prevalence: number;

  /** Common triggers or preconditions */
  triggers: string[];

  /** Suggested remediation steps */
  remediation: string[];
}

/**
 * Failure distribution for a specific domain.
 */
export interface DomainFailureDistribution {
  /** Domain name (e.g., "psychology", "biology") */
  domain: string;

  /** Total hypotheses in this domain */
  totalHypotheses: number;

  /** Number of falsified hypotheses */
  falsifiedCount: number;

  /** Falsification rate (0-1) */
  failureRate: number;

  /** Which phases failures occur in */
  failuresByPhase: Partial<Record<SessionPhase, number>>;

  /** Most common failure modes in this domain */
  commonFailureModes: FailureModeOccurrence[];
}

/**
 * Occurrence of a failure mode with frequency data.
 */
export interface FailureModeOccurrence {
  /** Reference to the failure mode */
  modeId: string;

  /** Human-readable name */
  modeName: string;

  /** How many times this failure occurred */
  count: number;

  /** Percentage of failures in context (0-1) */
  percentage: number;
}

/**
 * Failure patterns related to specific operators.
 */
export interface OperatorFailurePattern {
  /** Which operator */
  operator: OperatorType;

  /** Total applications of this operator */
  totalApplications: number;

  /** How many led to subsequent failure */
  failuresAfterApplication: number;

  /** How many skipped this operator and then failed */
  failuresWithoutApplication: number;

  /** Correlation strength (-1 to 1, negative = helps prevent failure) */
  failureCorrelation: number;

  /** Key insight about this operator's relationship to failure */
  insight: string;
}

/**
 * Pattern failures based on hypothesis structure.
 *
 * Note: The `detector` function is included for runtime re-analysis but will
 * be lost if this object is serialized to JSON. Use STRUCTURAL_PATTERNS to
 * access detectors by pattern name if needed after deserialization.
 */
export interface StructuralPatternFailure {
  /** Pattern name (e.g., "Missing Falsification Criteria") */
  patternName: string;

  /** Pattern description */
  description: string;

  /** How to detect this pattern (not JSON-serializable) */
  detector: (hypothesis: HypothesisCard) => boolean;

  /** How many hypotheses match this pattern */
  matchCount: number;

  /** How many matching hypotheses failed */
  failureCount: number;

  /** Failure rate for hypotheses with this pattern (0-1) */
  failureRate: number;
}

/**
 * Complete failure analytics for a user.
 */
export interface FailureAnalytics {
  /** When these analytics were computed */
  computedAt: string;

  /** User ID */
  userId: string;

  /** Total sessions analyzed */
  sessionsAnalyzed: number;

  /** Total hypotheses analyzed */
  hypothesesAnalyzed: number;

  /** Overall failure rate (0-1) */
  overallFailureRate: number;

  /** Failure distribution by domain */
  byDomain: DomainFailureDistribution[];

  /** Failure patterns by operator */
  byOperator: OperatorFailurePattern[];

  /** Structural pattern failures */
  byStructure: StructuralPatternFailure[];

  /** Generated insights based on failure patterns */
  insights: FailureInsight[];
}

/**
 * A surfaced insight about failure patterns.
 */
export interface FailureInsight {
  /** Unique identifier */
  id: string;

  /** Severity: how important is this insight */
  severity: "info" | "warning" | "critical";

  /** The insight message */
  message: string;

  /** Which domain(s) this applies to */
  domains?: string[];

  /** Which operator(s) this relates to */
  operators?: OperatorType[];

  /** Confidence in this insight (0-1) */
  confidence: number;

  /** Suggested action */
  suggestion: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Minimum hypotheses required for meaningful domain analytics */
const MIN_DOMAIN_SAMPLE_SIZE = 3;

/** Minimum hypotheses required for meaningful pattern analytics */
const MIN_PATTERN_SAMPLE_SIZE = 5;

/** Confidence threshold for generating insights */
const INSIGHT_CONFIDENCE_THRESHOLD = 0.6;

/** Failure rate threshold for generating warnings */
const HIGH_FAILURE_RATE_THRESHOLD = 0.5;

/** Failure rate threshold for critical insights */
const CRITICAL_FAILURE_RATE_THRESHOLD = 0.75;

// ============================================================================
// Structural Pattern Detectors
// ============================================================================

/**
 * Built-in structural patterns to detect in hypotheses.
 */
export const STRUCTURAL_PATTERNS: Array<{
  name: string;
  description: string;
  detector: (h: HypothesisCard) => boolean;
}> = [
  {
    name: "Missing Falsification Criteria",
    description: "Hypothesis lacks 'impossible if true' conditions",
    detector: (h) => !h.impossibleIfTrue || h.impossibleIfTrue.length === 0,
  },
  {
    name: "No Positive Predictions",
    description: "Hypothesis lacks 'predictions if true' conditions",
    detector: (h) => !h.predictionsIfTrue || h.predictionsIfTrue.length === 0,
  },
  {
    name: "Missing Mechanism",
    description: "Hypothesis has no proposed mechanism",
    detector: (h) => !h.mechanism || h.mechanism.trim().length === 0,
  },
  {
    name: "Low Initial Confidence",
    description: "Hypothesis started with very low confidence (< 30)",
    detector: (h) => h.confidence < 30 && h.version === 1,
  },
  {
    name: "High Initial Confidence",
    description: "Hypothesis started with very high confidence (> 80) without evidence",
    detector: (h) => h.confidence > 80 && h.version === 1,
  },
  {
    name: "No Confounds Identified",
    description: "No confounding variables were identified",
    detector: (h) => !h.confounds || h.confounds.length === 0,
  },
  {
    name: "No Assumptions Listed",
    description: "No underlying assumptions were explicitly stated",
    detector: (h) => !h.assumptions || h.assumptions.length === 0,
  },
  {
    name: "Single Domain",
    description: "Hypothesis covers only one domain (may lack interdisciplinary perspective)",
    detector: (h) => !h.domain || h.domain.length <= 1,
  },
];

// ============================================================================
// Core Analytics Functions
// ============================================================================

/**
 * Classify a hypothesis as failed or successful based on session state.
 * A hypothesis is considered "failed" if:
 * - Its confidence dropped below 20
 * - It was archived (abandoned)
 * - The session was abandoned before completion
 */
function isHypothesisFailed(
  hypothesis: HypothesisCard,
  session: Session,
  hypothesisId: string,
): boolean {
  // Archived = explicitly abandoned
  if (session.archivedHypothesisIds?.includes(hypothesisId)) {
    return true;
  }

  // Very low confidence = effectively falsified
  if (hypothesis.confidence < 20) {
    return true;
  }

  return false;
}

/**
 * Extract domains from a hypothesis.
 */
function getHypothesisDomains(hypothesis: HypothesisCard): string[] {
  return hypothesis.domain ?? [];
}

/**
 * Check which operators were applied in a session.
 */
function getAppliedOperators(session: Session): Set<OperatorType> {
  const applied = new Set<OperatorType>();
  const apps = session.operatorApplications;
  if (!apps) return applied;

  if (Array.isArray(apps.levelSplit) && apps.levelSplit.length > 0) {
    applied.add("level_split");
  }
  if (Array.isArray(apps.exclusionTest) && apps.exclusionTest.length > 0) {
    applied.add("exclusion_test");
  }
  if (Array.isArray(apps.objectTranspose) && apps.objectTranspose.length > 0) {
    applied.add("object_transpose");
  }
  if (Array.isArray(apps.scaleCheck) && apps.scaleCheck.length > 0) {
    applied.add("scale_check");
  }

  return applied;
}

/**
 * Compute failure analytics by domain.
 */
function computeDomainFailures(sessions: Session[]): DomainFailureDistribution[] {
  const domainStats = new Map<
    string,
    {
      total: number;
      failed: number;
      failuresByPhase: Partial<Record<SessionPhase, number>>;
    }
  >();

  for (const session of sessions) {
    const cards = session.hypothesisCards;
    if (!cards) continue;

    for (const [hypothesisId, hypothesis] of Object.entries(cards)) {
      if (!hypothesis) continue;

      const domains = getHypothesisDomains(hypothesis);
      const failed = isHypothesisFailed(hypothesis, session, hypothesisId);

      for (const domain of domains) {
        const normalizedDomain = domain.toLowerCase().trim();
        if (!normalizedDomain) continue;

        let stats = domainStats.get(normalizedDomain);
        if (!stats) {
          stats = { total: 0, failed: 0, failuresByPhase: {} };
          domainStats.set(normalizedDomain, stats);
        }

        stats.total++;
        if (failed) {
          stats.failed++;
          const phase = session.phase;
          stats.failuresByPhase[phase] = (stats.failuresByPhase[phase] ?? 0) + 1;
        }
      }
    }
  }

  return Array.from(domainStats.entries())
    .filter(([, stats]) => stats.total >= MIN_DOMAIN_SAMPLE_SIZE)
    .map(([domain, stats]) => ({
      domain,
      totalHypotheses: stats.total,
      falsifiedCount: stats.failed,
      failureRate: stats.total > 0 ? stats.failed / stats.total : 0,
      failuresByPhase: stats.failuresByPhase,
      commonFailureModes: [], // Populated separately if we have predefined modes
    }))
    .sort((a, b) => b.failureRate - a.failureRate);
}

/**
 * Compute failure analytics by operator.
 */
function computeOperatorFailures(sessions: Session[]): OperatorFailurePattern[] {
  const operators: OperatorType[] = [
    "level_split",
    "exclusion_test",
    "object_transpose",
    "scale_check",
  ];

  return operators.map((operator) => {
    let totalApplications = 0;
    let failuresAfterApplication = 0;
    let failuresWithoutApplication = 0;
    let successesAfterApplication = 0;
    let successesWithoutApplication = 0;

    for (const session of sessions) {
      const appliedOperators = getAppliedOperators(session);
      const wasApplied = appliedOperators.has(operator);
      if (wasApplied) totalApplications++;

      const cards = session.hypothesisCards;
      if (!cards) continue;

      for (const [hypothesisId, hypothesis] of Object.entries(cards)) {
        if (!hypothesis) continue;

        const failed = isHypothesisFailed(hypothesis, session, hypothesisId);

        if (wasApplied) {
          if (failed) {
            failuresAfterApplication++;
          } else {
            successesAfterApplication++;
          }
        } else {
          if (failed) {
            failuresWithoutApplication++;
          } else {
            successesWithoutApplication++;
          }
        }
      }
    }

    // Compute correlation: negative = operator helps prevent failure
    const withOperatorTotal = failuresAfterApplication + successesAfterApplication;
    const withoutOperatorTotal = failuresWithoutApplication + successesWithoutApplication;

    const withOperatorFailureRate =
      withOperatorTotal > 0 ? failuresAfterApplication / withOperatorTotal : 0;
    const withoutOperatorFailureRate =
      withoutOperatorTotal > 0 ? failuresWithoutApplication / withoutOperatorTotal : 0;

    // Correlation: difference in failure rates
    // Negative = operator reduces failures, Positive = operator correlates with failures
    const correlation = withOperatorFailureRate - withoutOperatorFailureRate;

    // Generate insight
    let insight: string;
    if (correlation < -0.2) {
      insight = `Using ${formatOperatorName(operator)} is associated with ${Math.abs(correlation * 100).toFixed(0)}% fewer failures.`;
    } else if (correlation > 0.2) {
      insight = `Hypotheses tend to fail more often when ${formatOperatorName(operator)} is applied (may indicate complex hypotheses).`;
    } else {
      insight = `${formatOperatorName(operator)} usage shows no strong correlation with hypothesis outcomes.`;
    }

    return {
      operator,
      totalApplications,
      failuresAfterApplication,
      failuresWithoutApplication,
      failureCorrelation: correlation,
      insight,
    };
  });
}

/**
 * Compute structural pattern failures.
 */
function computeStructuralFailures(sessions: Session[]): StructuralPatternFailure[] {
  return STRUCTURAL_PATTERNS.map((pattern) => {
    let matchCount = 0;
    let failureCount = 0;

    for (const session of sessions) {
      const cards = session.hypothesisCards;
      if (!cards) continue;

      for (const [hypothesisId, hypothesis] of Object.entries(cards)) {
        if (!hypothesis) continue;

        if (pattern.detector(hypothesis)) {
          matchCount++;
          if (isHypothesisFailed(hypothesis, session, hypothesisId)) {
            failureCount++;
          }
        }
      }
    }

    return {
      patternName: pattern.name,
      description: pattern.description,
      detector: pattern.detector,
      matchCount,
      failureCount,
      failureRate: matchCount > 0 ? failureCount / matchCount : 0,
    };
  }).filter((p) => p.matchCount >= MIN_PATTERN_SAMPLE_SIZE);
}

/**
 * Generate insights from failure patterns.
 */
function generateInsights(params: {
  byDomain: DomainFailureDistribution[];
  byOperator: OperatorFailurePattern[];
  byStructure: StructuralPatternFailure[];
  overallFailureRate: number;
}): FailureInsight[] {
  const insights: FailureInsight[] = [];
  let insightId = 0;

  // Domain-based insights
  for (const domain of params.byDomain) {
    if (domain.failureRate >= CRITICAL_FAILURE_RATE_THRESHOLD) {
      insights.push({
        id: `insight-${++insightId}`,
        severity: "critical",
        message: `Hypotheses in ${domain.domain} fail ${(domain.failureRate * 100).toFixed(0)}% of the time.`,
        domains: [domain.domain],
        confidence: Math.min(1, domain.totalHypotheses / 10),
        suggestion: `Review your approach to ${domain.domain} hypotheses. Consider adding more falsification criteria or confound analysis.`,
      });
    } else if (domain.failureRate >= HIGH_FAILURE_RATE_THRESHOLD) {
      insights.push({
        id: `insight-${++insightId}`,
        severity: "warning",
        message: `Hypotheses in ${domain.domain} have a ${(domain.failureRate * 100).toFixed(0)}% failure rate.`,
        domains: [domain.domain],
        confidence: Math.min(1, domain.totalHypotheses / 10),
        suggestion: `Consider applying more rigorous operators to ${domain.domain} hypotheses.`,
      });
    }
  }

  // Operator-based insights
  for (const op of params.byOperator) {
    if (op.failureCorrelation < -0.3 && op.totalApplications >= 3) {
      insights.push({
        id: `insight-${++insightId}`,
        severity: "info",
        message: op.insight,
        operators: [op.operator],
        confidence: Math.min(1, op.totalApplications / 10),
        suggestion: `Continue using ${formatOperatorName(op.operator)} - it appears to improve hypothesis quality.`,
      });
    }
  }

  // Structure-based insights
  for (const pattern of params.byStructure) {
    if (
      pattern.failureRate >= HIGH_FAILURE_RATE_THRESHOLD &&
      pattern.matchCount >= MIN_PATTERN_SAMPLE_SIZE
    ) {
      insights.push({
        id: `insight-${++insightId}`,
        severity: pattern.failureRate >= CRITICAL_FAILURE_RATE_THRESHOLD ? "critical" : "warning",
        message: `"${pattern.patternName}" is associated with ${(pattern.failureRate * 100).toFixed(0)}% failure rate.`,
        confidence: Math.min(1, pattern.matchCount / 10),
        suggestion: pattern.description + " - addressing this may improve outcomes.",
      });
    }
  }

  // Sort by severity and confidence
  return insights
    .filter((i) => i.confidence >= INSIGHT_CONFIDENCE_THRESHOLD)
    .sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.confidence - a.confidence;
    });
}

/**
 * Format operator name for display.
 */
function formatOperatorName(operator: OperatorType): string {
  const names: Record<OperatorType, string> = {
    level_split: "Level Split (Σ)",
    exclusion_test: "Exclusion Test (⊘)",
    object_transpose: "Object Transpose (⟳)",
    scale_check: "Scale Check (⊙)",
  };
  return names[operator] ?? operator;
}

// ============================================================================
// Main API
// ============================================================================

/**
 * Compute comprehensive failure analytics from session data.
 *
 * @param params - Parameters including sessions and optional user ID
 * @returns Complete failure analytics with insights
 */
export function computeFailureAnalytics(params: {
  sessions: Session[];
  userId?: string;
  now?: Date;
}): FailureAnalytics {
  const now = params.now ?? new Date();
  const sessions = params.sessions;

  // Count totals
  let hypothesesAnalyzed = 0;
  let hypothesesFailed = 0;

  for (const session of sessions) {
    const cards = session.hypothesisCards;
    if (!cards) continue;

    for (const [hypothesisId, hypothesis] of Object.entries(cards)) {
      if (!hypothesis) continue;
      hypothesesAnalyzed++;
      if (isHypothesisFailed(hypothesis, session, hypothesisId)) {
        hypothesesFailed++;
      }
    }
  }

  const overallFailureRate = hypothesesAnalyzed > 0 ? hypothesesFailed / hypothesesAnalyzed : 0;

  // Compute breakdowns
  const byDomain = computeDomainFailures(sessions);
  const byOperator = computeOperatorFailures(sessions);
  const byStructure = computeStructuralFailures(sessions);

  // Generate insights
  const insights = generateInsights({
    byDomain,
    byOperator,
    byStructure,
    overallFailureRate,
  });

  return {
    computedAt: now.toISOString(),
    userId: params.userId ?? "local",
    sessionsAnalyzed: sessions.length,
    hypothesesAnalyzed,
    overallFailureRate,
    byDomain,
    byOperator,
    byStructure,
    insights,
  };
}

/**
 * Get a human-readable summary of failure analytics.
 */
export function summarizeFailureAnalytics(analytics: FailureAnalytics): string {
  const lines: string[] = [];

  lines.push(
    `Failure Analytics Summary (${analytics.sessionsAnalyzed} sessions, ${analytics.hypothesesAnalyzed} hypotheses)`,
  );
  lines.push(`Overall failure rate: ${(analytics.overallFailureRate * 100).toFixed(1)}%`);
  lines.push("");

  if (analytics.byDomain.length > 0) {
    lines.push("Top Failure Domains:");
    for (const domain of analytics.byDomain.slice(0, 3)) {
      lines.push(
        `  - ${domain.domain}: ${(domain.failureRate * 100).toFixed(0)}% failure rate (n=${domain.totalHypotheses})`,
      );
    }
    lines.push("");
  }

  if (analytics.insights.length > 0) {
    lines.push("Key Insights:");
    for (const insight of analytics.insights.slice(0, 5)) {
      const icon =
        insight.severity === "critical" ? "🚨" : insight.severity === "warning" ? "⚠️" : "ℹ️";
      lines.push(`  ${icon} ${insight.message}`);
    }
  }

  return lines.join("\n");
}
