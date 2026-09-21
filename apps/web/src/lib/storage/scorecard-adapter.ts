/**
 * Scorecard Adapter
 *
 * Bridges the gap between storage layer data (Assumption, Anomaly, Critique,
 * Hypothesis, Test registries) and the Scorecard dimension scoring functions.
 *
 * The scorecard expects SessionData with artifact.sections, but our storage
 * layers use more structured types. This adapter converts between formats.
 *
 * @see brenner_bot-nihv.1 (bead)
 * @see specs/artifact_schema_v0.1.md
 */

import type {
  AnomalyItem,
  Artifact,
  AssumptionItem,
  CritiqueItem,
  HypothesisItem,
  TestItem,
} from "../artifact-merge";
import type { Anomaly } from "../schemas/anomaly";
import type { Assumption } from "../schemas/assumption";
import type { Critique } from "../schemas/critique";
import type { Hypothesis } from "../schemas/hypothesis";
import type { HypothesisTransition, SessionData } from "../schemas/scorecard";
import type { TestRecord } from "../schemas/test-record";
import { AnomalyStorage } from "./anomaly-storage";
import { AssumptionStorage } from "./assumption-storage";
import { CritiqueStorage } from "./critique-storage";
import { HypothesisStorage } from "./hypothesis-storage";
import { TestStorage } from "./test-storage";

// ============================================================================
// Adapter Configuration
// ============================================================================

export interface ScorecardAdapterConfig {
  /** Base directory for storage (defaults to cwd) */
  baseDir?: string;
}

// ============================================================================
// Type Converters: Storage → Artifact Section Format
// ============================================================================

/**
 * Convert storage Assumption to artifact AssumptionItem format.
 *
 * Mapping:
 * - Assumption Registry type field → score dimension:
 *   - scale_physics → Scale Check Rigor dimension
 *   - background/methodological/boundary → Assumption Tracking dimension
 */
export function assumptionToArtifactItem(a: Assumption): AssumptionItem {
  return {
    id: a.id,
    // Use statement as both name and statement (artifact format is simpler)
    name: a.statement.substring(0, 50) + (a.statement.length > 50 ? "..." : ""),
    statement: a.statement,
    load: a.load.affectedHypotheses.join(", "),
    test: a.testMethod ?? "",
    status:
      a.status === "unchecked"
        ? "unchecked"
        : a.status === "verified"
          ? "verified"
          : a.status === "falsified"
            ? "falsified"
            : undefined,
    scale_check: a.type === "scale_physics",
    calculation: a.calculation?.result,
    implication: a.calculation?.implication,
  };
}

/**
 * Convert storage Anomaly to artifact AnomalyItem format.
 *
 * Mapping:
 * - Anomaly Registry → Paradox Grounding dimension (surprising observations)
 * - Quarantine status → Anomaly Quarantine Discipline dimension
 */
export function anomalyToArtifactItem(a: Anomaly): AnomalyItem {
  // Truncate observation for name with ellipsis if needed (consistent with other converters)
  const truncatedObs = a.observation.substring(0, 50) + (a.observation.length > 50 ? "..." : "");
  return {
    id: a.id,
    name: a.name ?? truncatedObs,
    observation: a.observation,
    conflicts_with: a.conflictsWith?.hypotheses ?? [],
  };
}

/**
 * Convert storage Critique to artifact CritiqueItem format.
 *
 * Mapping:
 * - Critique Registry → Adversarial Pressure dimension
 * - real_third_alternative flag → Third Alternative Discovery dimension
 */
export function critiqueToArtifactItem(c: Critique): CritiqueItem {
  // Check if proposed alternative suggests a third alternative via category/origin indicators
  const hasThirdAlt =
    c.proposedAlternative &&
    (c.proposedAlternative.description?.toLowerCase().includes("third alternative") ||
      c.proposedAlternative.description?.toLowerCase().includes("orthogonal"));

  return {
    id: c.id,
    name: c.targetId ? `Critique of ${c.targetId}` : `Critique of ${c.targetType}`,
    attack: c.attack,
    evidence: c.evidenceToConfirm ?? "",
    // Map critique status: active, addressed, dismissed, accepted
    // "accepted" means changes were made, so map to "addressed" (not "dismissed")
    current_status:
      c.status === "active"
        ? "active"
        : c.status === "addressed" || c.status === "accepted"
          ? "addressed"
          : "dismissed",
    ...(hasThirdAlt && { real_third_alternative: true }),
    ...(c.proposedAlternative?.description && {
      proposed_alternative: c.proposedAlternative.description,
    }),
  };
}

/**
 * Convert storage Hypothesis to artifact HypothesisItem format.
 */
export function hypothesisToArtifactItem(h: Hypothesis): HypothesisItem {
  return {
    id: h.id,
    // Use statement as both name and claim (artifact format is simpler)
    name: h.statement.substring(0, 50) + (h.statement.length > 50 ? "..." : ""),
    claim: h.statement,
    mechanism: h.mechanism ?? "",
    ...(h.origin === "third_alternative" && { third_alternative: true }),
    ...(h.state === "refuted" && { killed: true }),
    // Use notes as kill_reason if refuted (notes can contain the kill reason)
    ...(h.state === "refuted" && h.notes && { kill_reason: h.notes }),
  };
}

/**
 * Convert storage TestRecord to artifact TestItem format.
 */
export function testToArtifactItem(t: TestRecord): TestItem {
  // Convert expectedOutcomes array to record format
  const expectedOutcomesRecord: Record<string, string> = {};
  for (const eo of t.expectedOutcomes ?? []) {
    expectedOutcomesRecord[eo.hypothesisId] = eo.outcome;
  }

  // Map TestRecord status to artifact TestStatus
  // TestRecord: designed, ready, in_progress, completed, blocked, abandoned
  // TestItem: untested, passed, failed, blocked, error
  const mapStatus = (
    s: string | undefined,
  ): "untested" | "passed" | "failed" | "blocked" | "error" | undefined => {
    if (!s) return undefined;
    switch (s) {
      case "designed":
      case "ready":
        return "untested";
      case "completed":
        return "passed"; // Completed tests are assumed passed unless noted
      case "blocked":
        return "blocked";
      case "abandoned":
        return "error";
      default:
        return undefined;
    }
  };

  // Map status, checking the mapped value (not input) to avoid including undefined
  const mappedStatus = mapStatus(t.status);

  return {
    id: t.id,
    name: t.name,
    procedure: t.procedure ?? "",
    discriminates: t.discriminates?.join(" vs ") ?? "",
    expected_outcomes: expectedOutcomesRecord,
    potency_check: t.potencyCheck?.positiveControl ?? "",
    ...(mappedStatus && { status: mappedStatus }),
    ...(t.feasibility && { feasibility: t.feasibility.requirements }),
  };
}

// ============================================================================
// Hypothesis Transition Extraction
// ============================================================================

/**
 * Extract hypothesis transitions from hypothesis data.
 *
 * This builds the HypothesisTransition[] needed by scoreHypothesisKillRate.
 * Since the Hypothesis schema doesn't track transitions explicitly, we infer
 * from the current state.
 */
export function extractHypothesisTransitions(hypotheses: Hypothesis[]): HypothesisTransition[] {
  const transitions: HypothesisTransition[] = [];

  for (const h of hypotheses) {
    // If hypothesis was refuted, create a transition record
    if (h.state === "refuted") {
      // Use notes as the reason if available
      const reason = h.notes ?? "Refuted";
      // Try to extract test ID from notes
      const testMatch = reason.match(/T-[\w-]+/);
      transitions.push({
        hypothesisId: h.id,
        fromState: "active",
        toState: "refuted",
        triggeredBy: testMatch ? testMatch[0] : undefined,
        reason,
        timestamp: h.updatedAt,
      });
    }

    // If hypothesis was superseded, create a transition
    if (h.state === "superseded") {
      transitions.push({
        hypothesisId: h.id,
        fromState: "active",
        toState: "superseded",
        reason: h.notes ?? "Superseded by refinement",
        timestamp: h.updatedAt,
      });
    }
  }

  return transitions;
}

// ============================================================================
// Scorecard Adapter Class
// ============================================================================

/**
 * Adapter that loads data from storage layers and converts to SessionData
 * format for scorecard dimension scoring.
 */
export class ScorecardAdapter {
  private baseDir: string;
  private hypothesisStorage: HypothesisStorage;
  private assumptionStorage: AssumptionStorage;
  private anomalyStorage: AnomalyStorage;
  private critiqueStorage: CritiqueStorage;
  private testStorage: TestStorage;

  constructor(config: ScorecardAdapterConfig = {}) {
    this.baseDir = config.baseDir ?? process.cwd();

    this.hypothesisStorage = new HypothesisStorage({ baseDir: this.baseDir });
    this.assumptionStorage = new AssumptionStorage({ baseDir: this.baseDir });
    this.anomalyStorage = new AnomalyStorage({ baseDir: this.baseDir });
    this.critiqueStorage = new CritiqueStorage({ baseDir: this.baseDir });
    this.testStorage = new TestStorage({ baseDir: this.baseDir });
  }

  // ============================================================================
  // Main Conversion Methods
  // ============================================================================

  /**
   * Load data from storage for a session and convert to SessionData.
   *
   * This is the main entry point for integrating storage registries
   * with the scorecard dimension scoring functions.
   */
  async buildSessionData(sessionId: string, researchQuestion?: string): Promise<SessionData> {
    // Load all data from storage
    const [hypotheses, assumptions, anomalies, critiques, tests] = await Promise.all([
      this.hypothesisStorage.loadSessionHypotheses(sessionId),
      this.assumptionStorage.loadSessionAssumptions(sessionId),
      this.anomalyStorage.loadSessionAnomalies(sessionId),
      this.critiqueStorage.loadSessionCritiques(sessionId),
      this.testStorage.loadSessionTests(sessionId),
    ]);

    // Build artifact from storage data
    const artifact = this.buildArtifactFromStorage(
      sessionId,
      hypotheses,
      assumptions,
      anomalies,
      critiques,
      tests,
    );

    // Extract hypothesis transitions for kill rate scoring
    const hypothesisTransitions = extractHypothesisTransitions(hypotheses);

    return {
      sessionId,
      researchQuestion,
      artifact,
      hypothesisTransitions,
    };
  }

  /**
   * Build SessionData from pre-loaded storage data.
   *
   * Use this when you already have the data loaded (e.g., in dashboard).
   */
  buildSessionDataFromLoaded(
    sessionId: string,
    hypotheses: Hypothesis[],
    assumptions: Assumption[],
    anomalies: Anomaly[],
    critiques: Critique[],
    tests: TestRecord[],
    researchQuestion?: string,
  ): SessionData {
    const artifact = this.buildArtifactFromStorage(
      sessionId,
      hypotheses,
      assumptions,
      anomalies,
      critiques,
      tests,
    );

    const hypothesisTransitions = extractHypothesisTransitions(hypotheses);

    return {
      sessionId,
      researchQuestion,
      artifact,
      hypothesisTransitions,
    };
  }

  /**
   * Build artifact from storage layer data.
   */
  private buildArtifactFromStorage(
    sessionId: string,
    hypotheses: Hypothesis[],
    assumptions: Assumption[],
    anomalies: Anomaly[],
    critiques: Critique[],
    tests: TestRecord[],
  ): Artifact {
    return {
      metadata: {
        session_id: sessionId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        contributors: [],
        status: "active",
      },
      sections: {
        research_thread: null,
        hypothesis_slate: hypotheses.map(hypothesisToArtifactItem),
        predictions_table: [],
        discriminative_tests: tests.map(testToArtifactItem),
        assumption_ledger: assumptions.map(assumptionToArtifactItem),
        anomaly_register: anomalies.map(anomalyToArtifactItem),
        adversarial_critique: critiques.map(critiqueToArtifactItem),
      },
    };
  }

  // ============================================================================
  // Multi-Session Support (for Program-level Scoring)
  // ============================================================================

  /**
   * Build aggregated SessionData across multiple sessions.
   *
   * Useful for program-level scorecard dimensions.
   */
  async buildProgramSessionData(
    sessionIds: string[],
    researchQuestion?: string,
  ): Promise<SessionData> {
    // Handle empty sessionIds gracefully
    if (sessionIds.length === 0) {
      return this.buildSessionDataFromLoaded("program-empty", [], [], [], [], [], researchQuestion);
    }

    // Load all sessions in parallel for efficiency
    const sessionDataPromises = sessionIds.map((sessionId) =>
      Promise.all([
        this.hypothesisStorage.loadSessionHypotheses(sessionId),
        this.assumptionStorage.loadSessionAssumptions(sessionId),
        this.anomalyStorage.loadSessionAnomalies(sessionId),
        this.critiqueStorage.loadSessionCritiques(sessionId),
        this.testStorage.loadSessionTests(sessionId),
      ]),
    );

    const allSessionData = await Promise.all(sessionDataPromises);

    // Aggregate all data from all sessions
    const allHypotheses: Hypothesis[] = [];
    const allAssumptions: Assumption[] = [];
    const allAnomalies: Anomaly[] = [];
    const allCritiques: Critique[] = [];
    const allTests: TestRecord[] = [];

    for (const [hypotheses, assumptions, anomalies, critiques, tests] of allSessionData) {
      allHypotheses.push(...hypotheses);
      allAssumptions.push(...assumptions);
      allAnomalies.push(...anomalies);
      allCritiques.push(...critiques);
      allTests.push(...tests);
    }

    // Use aggregated session ID
    const aggregatedSessionId =
      sessionIds.length === 1 ? sessionIds[0] : `program-${sessionIds[0]}-${sessionIds.length}`;

    return this.buildSessionDataFromLoaded(
      aggregatedSessionId,
      allHypotheses,
      allAssumptions,
      allAnomalies,
      allCritiques,
      allTests,
      researchQuestion,
    );
  }
}

// ============================================================================
// Default Instance
// ============================================================================

/**
 * Default adapter instance using current working directory.
 */
export const scorecardAdapter = new ScorecardAdapter();
