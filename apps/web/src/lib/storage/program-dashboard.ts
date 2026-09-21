import type { Anomaly } from "../schemas/anomaly";
import type { Assumption } from "../schemas/assumption";
import type { Critique } from "../schemas/critique";
import type { Hypothesis } from "../schemas/hypothesis";
import type {
  HealthWarning,
  HypothesisFunnel,
  ProgramDashboard,
  RegistryHealth,
  ResearchProgram,
  TestExecutionSummary,
  TimelineEvent,
} from "../schemas/research-program";
import { calculateTotalScore, type TestRecord, validatePotencyCheck } from "../schemas/test-record";
import { AnomalyStorage } from "./anomaly-storage";
import { AssumptionStorage } from "./assumption-storage";
import { CritiqueStorage } from "./critique-storage";
import { HypothesisStorage } from "./hypothesis-storage";
import { TestStorage } from "./test-storage";

/**
 * Program Dashboard Aggregation
 *
 * Aggregates research data across all sessions in a program to build
 * a comprehensive dashboard view.
 *
 * @see brenner_bot-2qyl (bead)
 */

/**
 * Truncate a string with ellipsis only if it exceeds maxLength.
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength) + "...";
}

// ============================================================================
// Types
// ============================================================================

export interface DashboardAggregatorConfig {
  /** Base directory for storage (defaults to cwd) */
  baseDir?: string;
  /** Maximum timeline events to include (default: 50) */
  maxTimelineEvents?: number;
}

// ============================================================================
// Dashboard Aggregator Class
// ============================================================================

export class DashboardAggregator {
  private baseDir: string;
  private maxTimelineEvents: number;
  private hypothesisStorage: HypothesisStorage;
  private assumptionStorage: AssumptionStorage;
  private anomalyStorage: AnomalyStorage;
  private critiqueStorage: CritiqueStorage;
  private testStorage: TestStorage;

  constructor(config: DashboardAggregatorConfig = {}) {
    this.baseDir = config.baseDir ?? process.cwd();
    this.maxTimelineEvents = config.maxTimelineEvents ?? 50;

    // Initialize all storage instances with same base directory
    this.hypothesisStorage = new HypothesisStorage({ baseDir: this.baseDir });
    this.assumptionStorage = new AssumptionStorage({ baseDir: this.baseDir });
    this.anomalyStorage = new AnomalyStorage({ baseDir: this.baseDir });
    this.critiqueStorage = new CritiqueStorage({ baseDir: this.baseDir });
    this.testStorage = new TestStorage({ baseDir: this.baseDir });
  }

  // ============================================================================
  // Main Aggregation
  // ============================================================================

  /**
   * Generate a complete dashboard for a research program.
   */
  async generateDashboard(program: ResearchProgram): Promise<ProgramDashboard> {
    const sessionIds = program.sessions;

    // Load all data for the program's sessions
    const [hypotheses, assumptions, anomalies, critiques, tests] = await Promise.all([
      this.loadHypothesesForSessions(sessionIds),
      this.loadAssumptionsForSessions(sessionIds),
      this.loadAnomaliesForSessions(sessionIds),
      this.loadCritiquesForSessions(sessionIds),
      this.loadTestsForSessions(sessionIds),
    ]);

    // Build dashboard components
    const hypothesisFunnel = this.buildHypothesisFunnel(hypotheses, assumptions);
    const registryHealth = this.buildRegistryHealth(hypotheses, assumptions, anomalies, critiques);
    const testExecution = this.buildTestExecutionSummary(tests);
    const recentEvents = this.buildTimelineEvents(
      hypotheses,
      assumptions,
      anomalies,
      critiques,
      tests,
    );
    const warnings = this.generateHealthWarnings(
      program,
      hypotheses,
      assumptions,
      anomalies,
      critiques,
      tests,
    );

    return {
      generatedAt: new Date().toISOString(),
      hypothesisFunnel,
      registryHealth,
      testExecution,
      warnings,
      recentEvents,
    };
  }

  // ============================================================================
  // Data Loading
  // ============================================================================

  private async loadHypothesesForSessions(sessionIds: string[]): Promise<Hypothesis[]> {
    const results: Hypothesis[] = [];
    for (const sessionId of sessionIds) {
      const hypotheses = await this.hypothesisStorage.loadSessionHypotheses(sessionId);
      results.push(...hypotheses);
    }
    return results;
  }

  private async loadAssumptionsForSessions(sessionIds: string[]): Promise<Assumption[]> {
    const results: Assumption[] = [];
    for (const sessionId of sessionIds) {
      const assumptions = await this.assumptionStorage.loadSessionAssumptions(sessionId);
      results.push(...assumptions);
    }
    return results;
  }

  private async loadAnomaliesForSessions(sessionIds: string[]): Promise<Anomaly[]> {
    const results: Anomaly[] = [];
    for (const sessionId of sessionIds) {
      const anomalies = await this.anomalyStorage.loadSessionAnomalies(sessionId);
      results.push(...anomalies);
    }
    return results;
  }

  private async loadCritiquesForSessions(sessionIds: string[]): Promise<Critique[]> {
    const results: Critique[] = [];
    for (const sessionId of sessionIds) {
      const critiques = await this.critiqueStorage.loadSessionCritiques(sessionId);
      results.push(...critiques);
    }
    return results;
  }

  private async loadTestsForSessions(sessionIds: string[]): Promise<TestRecord[]> {
    const results: TestRecord[] = [];
    for (const sessionId of sessionIds) {
      const tests = await this.testStorage.loadSessionTests(sessionId);
      results.push(...tests);
    }
    return results;
  }

  // ============================================================================
  // Hypothesis Funnel
  // ============================================================================

  private buildHypothesisFunnel(
    hypotheses: Hypothesis[],
    assumptions: Assumption[],
  ): HypothesisFunnel {
    // Build set of hypothesis IDs affected by falsified assumptions
    const underminedByAssumption = new Set<string>();
    for (const a of assumptions) {
      if (a.status === "falsified") {
        for (const hId of a.load.affectedHypotheses) {
          underminedByAssumption.add(hId);
        }
      }
    }

    const funnel: HypothesisFunnel = {
      proposed: 0,
      active: 0,
      underAttack: 0,
      assumptionUndermined: 0,
      killed: 0,
      validated: 0,
      dormant: 0,
      refined: 0,
      byOrigin: {
        original: 0,
        thirdAlternative: 0,
        anomalySpawned: 0,
      },
    };

    for (const h of hypotheses) {
      // Check if this hypothesis is undermined by a falsified assumption
      // This takes precedence over other states for funnel counting
      if (underminedByAssumption.has(h.id) && h.state !== "refuted" && h.state !== "confirmed") {
        funnel.assumptionUndermined++;
      } else {
        // Map actual hypothesis states to funnel categories
        // Actual states: proposed, active, confirmed, refuted, superseded, deferred
        switch (h.state) {
          case "proposed":
            funnel.proposed++;
            break;
          case "active":
            // Check if under attack (has unresolved critiques)
            if (h.unresolvedCritiqueCount > 0) {
              funnel.underAttack++;
            } else {
              funnel.active++;
            }
            break;
          case "refuted":
            // Refuted maps to killed
            funnel.killed++;
            break;
          case "confirmed":
            // Confirmed maps to validated
            funnel.validated++;
            break;
          case "superseded":
            // Superseded maps to refined
            funnel.refined++;
            break;
          case "deferred":
            // Deferred maps to dormant
            funnel.dormant++;
            break;
        }
      }

      // Count by origin (always count, regardless of assumption status)
      switch (h.origin) {
        case "anomaly_spawned":
          funnel.byOrigin.anomalySpawned++;
          break;
        case "third_alternative":
          funnel.byOrigin.thirdAlternative++;
          break;
        // "proposed" and "refinement" both count as non-anomaly, non-third-alternative origins here.
        default:
          funnel.byOrigin.original++;
          break;
      }
    }

    return funnel;
  }

  // ============================================================================
  // Registry Health
  // ============================================================================

  private buildRegistryHealth(
    hypotheses: Hypothesis[],
    assumptions: Assumption[],
    anomalies: Anomaly[],
    critiques: Critique[],
  ): {
    hypotheses: RegistryHealth;
    assumptions: RegistryHealth;
    anomalies: RegistryHealth;
    critiques: RegistryHealth;
  } {
    return {
      hypotheses: this.buildHypothesisHealth(hypotheses),
      assumptions: this.buildAssumptionHealth(assumptions),
      anomalies: this.buildAnomalyHealth(anomalies),
      critiques: this.buildCritiqueHealth(critiques),
    };
  }

  private buildHypothesisHealth(hypotheses: Hypothesis[]): RegistryHealth {
    const byStatus: Record<string, number> = {};
    for (const h of hypotheses) {
      byStatus[h.state] = (byStatus[h.state] || 0) + 1;
    }

    // Additional metrics
    const withMechanism = hypotheses.filter((h) => !!h.mechanism).length;
    const avgCritiques =
      hypotheses.length > 0
        ? hypotheses.reduce((sum, h) => sum + h.unresolvedCritiqueCount, 0) / hypotheses.length
        : 0;

    return {
      total: hypotheses.length,
      byStatus,
      metrics: {
        withMechanism,
        avgUnresolvedCritiques: Math.round(avgCritiques * 100) / 100,
      },
    };
  }

  private buildAssumptionHealth(assumptions: Assumption[]): RegistryHealth {
    const byStatus: Record<string, number> = {};
    for (const a of assumptions) {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    }

    // Count scale_physics assumptions (mandatory per Brenner method)
    const scalePhysics = assumptions.filter((a) => a.type === "scale_physics").length;
    const withCalculations = assumptions.filter((a) => !!a.calculation).length;

    return {
      total: assumptions.length,
      byStatus,
      metrics: {
        scalePhysics,
        withCalculations,
      },
    };
  }

  private buildAnomalyHealth(anomalies: Anomaly[]): RegistryHealth {
    const byStatus: Record<string, number> = {};
    for (const a of anomalies) {
      byStatus[a.quarantineStatus] = (byStatus[a.quarantineStatus] || 0) + 1;
    }

    const withSpawnedHypotheses = anomalies.filter(
      (a) => a.spawnedHypotheses && a.spawnedHypotheses.length > 0,
    ).length;
    const paradigmShifting = anomalies.filter(
      (a) => a.quarantineStatus === "paradigm_shifting",
    ).length;

    return {
      total: anomalies.length,
      byStatus,
      metrics: {
        withSpawnedHypotheses,
        paradigmShifting,
      },
    };
  }

  private buildCritiqueHealth(critiques: Critique[]): RegistryHealth {
    const byStatus: Record<string, number> = {};
    for (const c of critiques) {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    }

    const bySeverity: Record<string, number> = {};
    for (const c of critiques) {
      bySeverity[c.severity] = (bySeverity[c.severity] || 0) + 1;
    }

    const withAlternatives = critiques.filter((c) => c.proposedAlternative).length;

    return {
      total: critiques.length,
      byStatus,
      metrics: {
        ...bySeverity,
        withAlternatives,
      },
    };
  }

  // ============================================================================
  // Test Execution Summary
  // ============================================================================

  private buildTestExecutionSummary(tests: TestRecord[]): TestExecutionSummary {
    let designed = 0;
    let inProgress = 0;
    let completed = 0;
    let blocked = 0;
    let potencySufficient = 0;
    let totalEvidenceScore = 0;
    let testsWithScore = 0;

    for (const t of tests) {
      switch (t.status) {
        case "designed":
        case "ready":
          designed++;
          break;
        case "in_progress":
          inProgress++;
          break;
        case "completed":
          completed++;
          break;
        case "blocked":
          blocked++;
          break;
        // abandoned tests are not counted
      }

      // Potency check coverage (quality threshold, not mere existence)
      const potency = validatePotencyCheck(t);
      if (potency.valid && potency.score >= 2) {
        potencySufficient++;
      }

      // Evidence per week score (4 dimensions, 0-12 total)
      if (t.evidencePerWeekScore) {
        totalEvidenceScore += calculateTotalScore(t.evidencePerWeekScore);
        testsWithScore++;
      }
    }

    const potencyCoverage = tests.length > 0 ? potencySufficient / tests.length : 0;
    const avgEvidenceScore = testsWithScore > 0 ? totalEvidenceScore / testsWithScore : undefined;

    return {
      designed,
      inProgress,
      completed,
      blocked,
      potencyCoverage: Math.round(potencyCoverage * 100) / 100,
      avgEvidenceScore:
        avgEvidenceScore !== undefined ? Math.round(avgEvidenceScore * 10) / 10 : undefined,
    };
  }

  // ============================================================================
  // Timeline Events
  // ============================================================================

  private buildTimelineEvents(
    hypotheses: Hypothesis[],
    assumptions: Assumption[],
    anomalies: Anomaly[],
    critiques: Critique[],
    tests: TestRecord[],
  ): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    // Hypothesis events
    for (const h of hypotheses) {
      events.push({
        timestamp: h.createdAt,
        eventType: "hypothesis_proposed",
        description: `Hypothesis ${h.id} proposed: ${truncate(h.statement, 50)}`,
        entityId: h.id,
        sessionId: h.sessionId,
      });

      // Map refuted → killed for timeline
      if (h.state === "refuted" && h.updatedAt !== h.createdAt) {
        events.push({
          timestamp: h.updatedAt,
          eventType: "hypothesis_killed",
          description: `Hypothesis ${h.id} refuted`,
          entityId: h.id,
          sessionId: h.sessionId,
        });
      }

      // Map confirmed → validated for timeline
      if (h.state === "confirmed" && h.updatedAt !== h.createdAt) {
        events.push({
          timestamp: h.updatedAt,
          eventType: "hypothesis_validated",
          description: `Hypothesis ${h.id} confirmed`,
          entityId: h.id,
          sessionId: h.sessionId,
        });
      }
    }

    // Assumption events
    for (const a of assumptions) {
      if (a.status === "verified" && a.updatedAt !== a.createdAt) {
        events.push({
          timestamp: a.updatedAt,
          eventType: "assumption_verified",
          description: `Assumption ${a.id} verified`,
          entityId: a.id,
          sessionId: a.sessionId,
        });
      }

      if (a.status === "falsified" && a.updatedAt !== a.createdAt) {
        events.push({
          timestamp: a.updatedAt,
          eventType: "assumption_falsified",
          description: `Assumption ${a.id} falsified: ${truncate(a.statement, 40)}`,
          entityId: a.id,
          sessionId: a.sessionId,
        });
      }
    }

    // Anomaly events
    for (const a of anomalies) {
      events.push({
        timestamp: a.createdAt,
        eventType: "anomaly_recorded",
        description: `Anomaly ${a.id} recorded: ${truncate(a.observation, 40)}`,
        entityId: a.id,
        sessionId: a.sessionId,
      });

      if (a.quarantineStatus === "resolved" && a.resolvedAt) {
        events.push({
          timestamp: a.resolvedAt,
          eventType: "anomaly_resolved",
          description: `Anomaly ${a.id} resolved`,
          entityId: a.id,
          sessionId: a.sessionId,
        });
      }
    }

    // Critique events
    for (const c of critiques) {
      events.push({
        timestamp: c.createdAt,
        eventType: "critique_raised",
        description: `${c.severity} critique on ${c.targetType}: ${truncate(c.attack, 40)}`,
        entityId: c.id,
        sessionId: c.sessionId,
      });

      if ((c.status === "addressed" || c.status === "accepted") && c.updatedAt !== c.createdAt) {
        events.push({
          timestamp: c.updatedAt,
          eventType: "critique_addressed",
          description: `Critique ${c.id} ${c.status}`,
          entityId: c.id,
          sessionId: c.sessionId,
        });
      }
    }

    // Test events
    for (const t of tests) {
      if (t.execution?.completedAt) {
        events.push({
          timestamp: t.execution.completedAt,
          eventType: "test_executed",
          description: `Test ${t.id} completed: ${truncate(t.name, 40)}`,
          entityId: t.id,
          sessionId: t.designedInSession,
        });
      }
    }

    // Sort by timestamp descending and limit
    events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return events.slice(0, this.maxTimelineEvents);
  }

  // ============================================================================
  // Health Warnings
  // ============================================================================

  private generateHealthWarnings(
    program: ResearchProgram,
    hypotheses: Hypothesis[],
    assumptions: Assumption[],
    anomalies: Anomaly[],
    critiques: Critique[],
    tests: TestRecord[],
  ): HealthWarning[] {
    const warnings: HealthWarning[] = [];

    // Check for no scale_physics assumptions (CRITICAL per Brenner method)
    const scalePhysics = assumptions.filter((a) => a.type === "scale_physics");
    if (scalePhysics.length === 0) {
      warnings.push({
        code: "NO_SCALE_PHYSICS",
        severity: "critical",
        message:
          "No scale_physics assumption found. Every research program MUST have at least one.",
        suggestion: "Create a scale_physics assumption with back-of-envelope calculations.",
      });
    }

    // Check for active hypotheses with unresolved critiques
    const underAttack = hypotheses.filter(
      (h) => h.state === "active" && h.unresolvedCritiqueCount > 0,
    );
    if (underAttack.length > 0) {
      warnings.push({
        code: "HYPOTHESES_UNDER_ATTACK",
        severity: "warning",
        message: `${underAttack.length} hypothesis(es) have unresolved critiques.`,
        relatedIds: underAttack.map((h) => h.id),
        suggestion: "Address critiques or design discriminative tests.",
      });
    }

    // Check for active anomalies that haven't spawned hypotheses
    const activeAnomalies = anomalies.filter(
      (a) =>
        a.quarantineStatus === "active" &&
        (!a.spawnedHypotheses || a.spawnedHypotheses.length === 0),
    );
    if (activeAnomalies.length > 3) {
      warnings.push({
        code: "UNPROCESSED_ANOMALIES",
        severity: "warning",
        message: `${activeAnomalies.length} active anomalies have not spawned hypotheses.`,
        relatedIds: activeAnomalies.map((a) => a.id),
        suggestion: "Consider whether these anomalies should generate alternative hypotheses.",
      });
    }

    // Check for unaddressed critical critiques
    const criticalCritiques = critiques.filter(
      (c) => c.severity === "critical" && c.status === "active",
    );
    if (criticalCritiques.length > 0) {
      warnings.push({
        code: "CRITICAL_CRITIQUES_PENDING",
        severity: "critical",
        message: `${criticalCritiques.length} critical critique(s) remain unaddressed.`,
        relatedIds: criticalCritiques.map((c) => c.id),
        suggestion: "Address critical critiques before proceeding with testing.",
      });
    }

    // Check for blocked tests
    const blockedTests = tests.filter((t) => t.status === "blocked");
    if (blockedTests.length > 0) {
      warnings.push({
        code: "TESTS_BLOCKED",
        severity: "warning",
        message: `${blockedTests.length} test(s) are blocked.`,
        relatedIds: blockedTests.map((t) => t.id),
        suggestion: "Review blockers and address resource/dependency issues.",
      });
    }

    // Check for no active hypotheses
    const active = hypotheses.filter((h) => h.state === "active" || h.state === "proposed");
    if (active.length === 0 && hypotheses.length > 0) {
      warnings.push({
        code: "NO_ACTIVE_HYPOTHESES",
        severity: "info",
        message:
          "No active hypotheses. All hypotheses are confirmed, refuted, deferred, or superseded.",
        suggestion: "Consider proposing new hypotheses or revisiting deferred ones.",
      });
    }

    // Check for stale program (no recent activity)
    if (program.sessions.length === 0) {
      warnings.push({
        code: "NO_SESSIONS",
        severity: "info",
        message: "Program has no sessions associated yet.",
        suggestion: "Add sessions to track research progress.",
      });
    }

    // Check for falsified assumptions that may affect hypotheses
    const falsified = assumptions.filter((a) => a.status === "falsified");
    if (falsified.length > 0) {
      const affectedHypotheses = new Set<string>();
      for (const a of falsified) {
        for (const hId of a.load.affectedHypotheses) {
          affectedHypotheses.add(hId);
        }
      }
      if (affectedHypotheses.size > 0) {
        warnings.push({
          code: "ASSUMPTIONS_FALSIFIED",
          severity: "warning",
          message: `${falsified.length} falsified assumption(s) may affect ${affectedHypotheses.size} hypothesis(es).`,
          relatedIds: Array.from(affectedHypotheses),
          suggestion:
            "Review affected hypotheses - they may need to be re-evaluated due to falsified dependencies.",
        });
      }
    }

    return warnings;
  }
}

// ============================================================================
// Default Instance
// ============================================================================

/**
 * Default aggregator instance using current working directory.
 */
export const dashboardAggregator = new DashboardAggregator();
