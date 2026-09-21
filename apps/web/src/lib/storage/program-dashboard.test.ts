import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { beforeEach, describe, expect, it } from "vitest";
import { AnomalySchema, createAnomaly } from "../schemas/anomaly";
import { AssumptionSchema, createAssumption } from "../schemas/assumption";
import { createCritique } from "../schemas/critique";
import { createHypothesis, createThirdAlternative, HypothesisSchema } from "../schemas/hypothesis";
import { createResearchProgram } from "../schemas/research-program";
import { createTestRecord, TestRecordSchema } from "../schemas/test-record";
import { AnomalyStorage } from "./anomaly-storage";
import { AssumptionStorage } from "./assumption-storage";
import { CritiqueStorage } from "./critique-storage";
import { HypothesisStorage } from "./hypothesis-storage";
import { DashboardAggregator } from "./program-dashboard";
import { TestStorage } from "./test-storage";

/**
 * Tests for Program Dashboard Aggregation
 *
 * Uses real storage layers and writes to a temp directory (no mocks).
 *
 * @see brenner_bot-2qyl (bead)
 */

let testDir: string;

async function createTestDir(): Promise<string> {
  const dir = join(
    tmpdir(),
    `program-dashboard-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

beforeEach(async () => {
  testDir = await createTestDir();
});

describe("DashboardAggregator", () => {
  it("aggregates funnel, health, warnings, and timeline across sessions", async () => {
    const session1 = "RS-20251230";
    const session2 = "RS-20251231";

    const hypothesisStorage = new HypothesisStorage({ baseDir: testDir });
    const assumptionStorage = new AssumptionStorage({ baseDir: testDir });
    const anomalyStorage = new AnomalyStorage({ baseDir: testDir });
    const critiqueStorage = new CritiqueStorage({ baseDir: testDir });
    const testStorage = new TestStorage({ baseDir: testDir });

    const h1 = HypothesisSchema.parse({
      ...createHypothesis({
        id: "H-RS-20251230-001",
        statement: "Hypothesis under attack.",
        sessionId: session1,
        category: "phenomenological",
      }),
      state: "active",
      unresolvedCritiqueCount: 2,
      createdAt: "2025-12-30T10:00:00Z",
      updatedAt: "2025-12-30T10:30:00Z",
    });

    const h2 = HypothesisSchema.parse({
      ...createHypothesis({
        id: "H-RS-20251230-002",
        statement: "Hypothesis undermined by falsified assumption.",
        sessionId: session1,
        category: "mechanistic",
        mechanism: "Some plausible mechanism.",
      }),
      state: "active",
      unresolvedCritiqueCount: 0,
      linkedAssumptions: ["A-RS-20251230-001"],
      createdAt: "2025-12-30T11:00:00Z",
      updatedAt: "2025-12-30T11:30:00Z",
    });

    const h3 = HypothesisSchema.parse({
      ...createHypothesis({
        id: "H-RS-20251231-001",
        statement: "Hypothesis that gets killed.",
        sessionId: session2,
        category: "phenomenological",
      }),
      state: "refuted",
      createdAt: "2025-12-31T09:00:00Z",
      updatedAt: "2025-12-31T12:00:00Z",
    });

    const h4 = HypothesisSchema.parse({
      ...createThirdAlternative({
        id: "H-RS-20251231-002",
        statement: "Third alternative hypothesis validated.",
        sessionId: session2,
        mechanism: "Alternative mechanism.",
      }),
      state: "confirmed",
      createdAt: "2025-12-31T09:30:00Z",
      updatedAt: "2025-12-31T13:00:00Z",
    });

    const h5 = HypothesisSchema.parse({
      ...createHypothesis({
        id: "H-RS-20251231-003",
        statement: "Anomaly-spawned hypothesis parked for later.",
        sessionId: session2,
        category: "boundary",
        origin: "anomaly_spawned",
      }),
      state: "deferred",
      spawnedFromAnomaly: "X-RS-20251231-001",
      createdAt: "2025-12-31T10:00:00Z",
      updatedAt: "2025-12-31T10:00:00Z",
    });

    const h6 = HypothesisSchema.parse({
      ...createHypothesis({
        id: "H-RS-20251231-004",
        statement: "Refinement that supersedes an earlier hypothesis.",
        sessionId: session2,
        category: "mechanistic",
        origin: "refinement",
        mechanism: "Refined mechanism.",
      }),
      state: "superseded",
      parentId: "H-RS-20251231-001",
      createdAt: "2025-12-31T11:00:00Z",
      updatedAt: "2025-12-31T11:15:00Z",
    });

    await hypothesisStorage.saveSessionHypotheses(session1, [h1, h2]);
    await hypothesisStorage.saveSessionHypotheses(session2, [h3, h4, h5, h6]);

    const a1 = AssumptionSchema.parse({
      ...createAssumption({
        id: "A-RS-20251230-001",
        statement: "Background assumption that is falsified.",
        type: "background",
        sessionId: session1,
        load: {
          affectedHypotheses: ["H-RS-20251230-002"],
          affectedTests: ["T-RS-20251230-001"],
          description: "H2 depends on this assumption.",
        },
      }),
      status: "falsified",
      createdAt: "2025-12-30T09:00:00Z",
      updatedAt: "2025-12-30T12:00:00Z",
    });

    await assumptionStorage.saveSessionAssumptions(session1, [a1]);
    await assumptionStorage.saveSessionAssumptions(session2, []);

    await anomalyStorage.saveSessionAnomalies(session1, []);
    await anomalyStorage.saveSessionAnomalies(session2, []);

    await critiqueStorage.saveSessionCritiques(session1, []);

    const c1 = createCritique({
      id: "C-RS-20251231-001",
      targetType: "hypothesis",
      targetId: "H-RS-20251231-002",
      attack: "Critical critique attack text that is long enough.",
      evidenceToConfirm: "Evidence needed to confirm the critique.",
      severity: "critical",
      sessionId: session2,
    });
    await critiqueStorage.saveSessionCritiques(session2, [c1]);

    const goodTest = createTestRecord({
      id: "T-RS-20251230-001",
      name: "Good potency check test",
      procedure: "A sufficiently detailed procedure for a discriminative test.",
      discriminates: ["H-RS-20251230-001", "H-RS-20251230-002"],
      expectedOutcomes: [
        {
          hypothesisId: "H-RS-20251230-001",
          outcome: "Positive result",
          resultType: "positive",
        },
        {
          hypothesisId: "H-RS-20251230-002",
          outcome: "Negative result",
          resultType: "negative",
        },
      ],
      potencyCheck: {
        positiveControl: "A specific positive control that is long enough.",
        sensitivityVerification: "Sensitivity verification long enough.",
        timingValidation: "Timing validation long enough.",
      },
      evidencePerWeekScore: { likelihoodRatio: 3, cost: 2, speed: 2, ambiguity: 3 },
      feasibility: { requirements: "Standard lab equipment", difficulty: "easy" },
      designedInSession: session1,
    });

    const blockedTest = TestRecordSchema.parse({
      ...createTestRecord({
        id: "T-RS-20251231-001",
        name: "Blocked test with weak potency check",
        procedure: "A sufficiently detailed procedure for a discriminative test.",
        discriminates: ["H-RS-20251231-001", "H-RS-20251231-002"],
        expectedOutcomes: [
          {
            hypothesisId: "H-RS-20251231-001",
            outcome: "Outcome A",
            resultType: "positive",
          },
          {
            hypothesisId: "H-RS-20251231-002",
            outcome: "Outcome B",
            resultType: "negative",
          },
        ],
        potencyCheck: {
          positiveControl: "short",
        },
        evidencePerWeekScore: { likelihoodRatio: 1, cost: 1, speed: 1, ambiguity: 1 },
        feasibility: {
          requirements: "Special equipment",
          difficulty: "very_hard",
          blockers: ["Needs equipment"],
        },
        designedInSession: session2,
      }),
      status: "blocked",
    });

    await testStorage.saveSessionTests(session1, [goodTest]);
    await testStorage.saveSessionTests(session2, [blockedTest]);

    const program = createResearchProgram({
      id: "RP-TEST-001",
      name: "Program Test",
      description: "A test program for dashboard aggregation.",
      sessions: [session1, session2],
    });

    const aggregator = new DashboardAggregator({ baseDir: testDir, maxTimelineEvents: 100 });
    const dashboard = await aggregator.generateDashboard(program);

    expect(dashboard.hypothesisFunnel).toEqual({
      proposed: 0,
      active: 0,
      underAttack: 1,
      assumptionUndermined: 1,
      killed: 1,
      validated: 1,
      dormant: 1,
      refined: 1,
      byOrigin: {
        original: 4,
        thirdAlternative: 1,
        anomalySpawned: 1,
      },
    });

    expect(dashboard.testExecution).toEqual({
      designed: 1,
      inProgress: 0,
      completed: 0,
      blocked: 1,
      potencyCoverage: 0.5,
      avgEvidenceScore: 7,
    });

    const warningCodes = new Set(dashboard.warnings.map((w) => w.code));
    expect(warningCodes.has("NO_SCALE_PHYSICS")).toBe(true);
    expect(warningCodes.has("HYPOTHESES_UNDER_ATTACK")).toBe(true);
    expect(warningCodes.has("CRITICAL_CRITIQUES_PENDING")).toBe(true);
    expect(warningCodes.has("TESTS_BLOCKED")).toBe(true);
    expect(warningCodes.has("ASSUMPTIONS_FALSIFIED")).toBe(true);

    const eventTypes = new Set(dashboard.recentEvents.map((e) => e.eventType));
    expect(eventTypes.has("hypothesis_killed")).toBe(true);
    expect(eventTypes.has("hypothesis_validated")).toBe(true);
    expect(eventTypes.has("assumption_falsified")).toBe(true);
    expect(eventTypes.has("critique_raised")).toBe(true);
  });

  it("counts proposed + plain active hypotheses and covers additional timeline branches", async () => {
    const session = "RS-20260101";

    const hypothesisStorage = new HypothesisStorage({ baseDir: testDir });
    const assumptionStorage = new AssumptionStorage({ baseDir: testDir });
    const anomalyStorage = new AnomalyStorage({ baseDir: testDir });
    const critiqueStorage = new CritiqueStorage({ baseDir: testDir });
    const testStorage = new TestStorage({ baseDir: testDir });

    const proposed = HypothesisSchema.parse({
      ...createHypothesis({
        id: "H-RS-20260101-001",
        statement: "A proposed hypothesis",
        sessionId: session,
        category: "phenomenological",
      }),
      state: "proposed",
      unresolvedCritiqueCount: 0,
      createdAt: "2026-01-01T10:00:00Z",
      updatedAt: "2026-01-01T10:00:00Z",
    });

    const active = HypothesisSchema.parse({
      ...createHypothesis({
        id: "H-RS-20260101-002",
        statement: "An active hypothesis with no critiques",
        sessionId: session,
        category: "mechanistic",
        mechanism: "Mechanism",
      }),
      state: "active",
      unresolvedCritiqueCount: 0,
      createdAt: "2026-01-01T11:00:00Z",
      updatedAt: "2026-01-01T11:00:00Z",
    });

    await hypothesisStorage.saveSessionHypotheses(session, [proposed, active]);

    const verifiedScale = AssumptionSchema.parse({
      ...createAssumption({
        id: "A-RS-20260101-001",
        statement: "Scale physics check that was verified later.",
        type: "scale_physics",
        sessionId: session,
        load: { affectedHypotheses: [], affectedTests: [], description: "load" },
      }),
      status: "verified",
      createdAt: "2026-01-01T09:00:00Z",
      updatedAt: "2026-01-01T12:00:00Z",
      calculation: {
        quantities: "L≈100µm, D≈10µm²/s",
        result: "τ≈1000s",
        units: "seconds, micrometers",
        implication: "Timescale is plausible",
      },
    });

    await assumptionStorage.saveSessionAssumptions(session, [verifiedScale]);

    const resolvedAnomaly = AnomalySchema.parse({
      ...createAnomaly({
        id: "X-RS-20260101-001",
        observation: "An anomaly that gets resolved.",
        source: { type: "discussion", anchors: ["§1"] },
        conflictsWith: {
          hypotheses: ["H-RS-20260101-002"],
          assumptions: [],
          description: "Conflicts with an active hypothesis.",
        },
        sessionId: session,
      }),
      quarantineStatus: "resolved",
      resolvedAt: "2026-01-01T12:30:00Z",
    });

    await anomalyStorage.saveSessionAnomalies(session, [resolvedAnomaly]);

    const addressedCritique = {
      ...createCritique({
        id: "C-RS-20260101-001",
        targetType: "hypothesis",
        targetId: "H-RS-20260101-002",
        attack: "A critique that gets accepted",
        evidenceToConfirm: "Evidence needed to confirm the critique.",
        severity: "minor",
        sessionId: session,
      }),
      status: "accepted" as const,
      createdAt: "2026-01-01T10:00:00Z",
      updatedAt: "2026-01-01T12:00:00Z",
    };

    await critiqueStorage.saveSessionCritiques(session, [addressedCritique]);

    const inProgress = TestRecordSchema.parse({
      ...createTestRecord({
        id: "T-RS-20260101-001",
        name: "In progress test",
        procedure: "Procedure long enough.",
        discriminates: ["H-RS-20260101-001", "H-RS-20260101-002"],
        expectedOutcomes: [
          { hypothesisId: "H-RS-20260101-001", outcome: "Alpha", resultType: "positive" },
          { hypothesisId: "H-RS-20260101-002", outcome: "Gamma", resultType: "negative" },
        ],
        potencyCheck: { positiveControl: "A specific positive control that is long enough." },
        evidencePerWeekScore: { likelihoodRatio: 2, cost: 2, speed: 2, ambiguity: 2 },
        feasibility: { requirements: "Standard", difficulty: "easy" },
        designedInSession: session,
      }),
      status: "in_progress",
    });

    const completed = TestRecordSchema.parse({
      ...createTestRecord({
        id: "T-RS-20260101-002",
        name: "Completed test",
        procedure: "Procedure long enough.",
        discriminates: ["H-RS-20260101-001", "H-RS-20260101-002"],
        expectedOutcomes: [
          { hypothesisId: "H-RS-20260101-001", outcome: "Alpha", resultType: "positive" },
          { hypothesisId: "H-RS-20260101-002", outcome: "Gamma", resultType: "negative" },
        ],
        potencyCheck: { positiveControl: "A specific positive control that is long enough." },
        evidencePerWeekScore: { likelihoodRatio: 1, cost: 1, speed: 1, ambiguity: 1 },
        feasibility: { requirements: "Standard", difficulty: "easy" },
        designedInSession: session,
      }),
      status: "completed",
      execution: {
        startedAt: "2026-01-01T12:00:00Z",
        completedAt: "2026-01-01T12:45:00Z",
        observedOutcome: "Observed",
        potencyCheckPassed: true,
      },
    });

    await testStorage.saveSessionTests(session, [inProgress, completed]);

    const program = createResearchProgram({
      id: "RP-TEST-002",
      name: "Program Test 2",
      description: "Covers additional branches.",
      sessions: [session],
    });

    const aggregator = new DashboardAggregator({ baseDir: testDir, maxTimelineEvents: 100 });
    const dashboard = await aggregator.generateDashboard(program);

    expect(dashboard.hypothesisFunnel.proposed).toBe(1);
    expect(dashboard.hypothesisFunnel.active).toBe(1);

    const eventTypes = new Set(dashboard.recentEvents.map((e) => e.eventType));
    expect(eventTypes.has("assumption_verified")).toBe(true);
    expect(eventTypes.has("anomaly_resolved")).toBe(true);
    expect(eventTypes.has("critique_addressed")).toBe(true);
    expect(eventTypes.has("test_executed")).toBe(true);

    expect(dashboard.testExecution.inProgress).toBe(1);
    expect(dashboard.testExecution.completed).toBe(1);
  });

  it("emits NO_SESSIONS warning for programs with no sessions", async () => {
    const program = createResearchProgram({
      id: "RP-EMPTY-001",
      name: "Empty Program",
      description: "No sessions",
      sessions: [],
    });

    const aggregator = new DashboardAggregator({ baseDir: testDir });
    const dashboard = await aggregator.generateDashboard(program);

    expect(dashboard.warnings.some((w) => w.code === "NO_SESSIONS")).toBe(true);
  });
});
