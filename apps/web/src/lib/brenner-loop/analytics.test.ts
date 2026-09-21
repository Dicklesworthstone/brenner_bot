import { describe, expect, it } from "vitest";
import { computePersonalAnalytics } from "./analytics";
import type { HypothesisCard } from "./hypothesis";
import { createHypothesisCard, generateHypothesisCardId } from "./hypothesis";
import type { Session } from "./types";
import { createSession } from "./types";

function createTestHypothesis(
  sessionId: string,
  sequence: number,
  overrides: Partial<Parameters<typeof createHypothesisCard>[0]> = {},
): HypothesisCard {
  const id = generateHypothesisCardId(sessionId, sequence, 1);
  return createHypothesisCard({
    id,
    statement: `Hypothesis ${sequence} statement with details`,
    mechanism: `Mechanism ${sequence} via causal path`,
    domain: ["testing"],
    predictionsIfTrue: [`Predict true ${sequence}`],
    predictionsIfFalse: [`Predict false ${sequence}`],
    impossibleIfTrue: [`Falsify ${sequence} if we observe something`],
    sessionId,
    ...overrides,
  });
}

function sessionWithPrimaryHypothesis(
  sessionId: string,
  createdAt: string,
  phase: Session["phase"],
): Session {
  const session = createSession({ id: sessionId });
  session.createdAt = createdAt;
  session.updatedAt = createdAt;
  session.phase = phase;

  const hypothesis = createTestHypothesis(sessionId, 1, { confidence: 60 });
  session.primaryHypothesisId = hypothesis.id;
  session.hypothesisCards[hypothesis.id] = hypothesis;

  return session;
}

describe("computePersonalAnalytics", () => {
  it("computes core counts and operator usage", () => {
    const now = new Date("2026-01-05T12:00:00.000Z");

    const sessionA = sessionWithPrimaryHypothesis(
      "SESSION-A",
      "2026-01-04T10:00:00.000Z",
      "complete",
    );
    sessionA.testIds = ["T-1", "T-2"];
    sessionA.operatorApplications.levelSplit.push({} as never);
    sessionA.operatorApplications.exclusionTest.push({} as never);

    const sessionB = sessionWithPrimaryHypothesis(
      "SESSION-B",
      "2026-01-05T11:00:00.000Z",
      "intake",
    );
    sessionB.testIds = [];
    sessionB.operatorApplications.objectTranspose.push({} as never);
    sessionB.alternativeHypothesisIds = ["ALT-1"];

    const analytics = computePersonalAnalytics({ sessions: [sessionA, sessionB], now });

    expect(analytics.sessionsTotal).toBe(2);
    expect(analytics.sessionsCompleted).toBe(1);
    expect(analytics.completionRate).toBeCloseTo(0.5);

    expect(analytics.testsRecorded).toBe(2);
    expect(analytics.hypothesesTested).toBe(2); // 1 per session
    expect(analytics.hypothesesWithCompetitors).toBe(1);

    expect(analytics.operatorsUsedDistribution.level_split).toBe(1);
    expect(analytics.operatorsUsedDistribution.exclusion_test).toBe(1);
    expect(analytics.operatorsUsedDistribution.object_transpose).toBe(1);
    expect(analytics.operatorsUsedDistribution.scale_check).toBe(0);

    expect(analytics.trendsOver30Days.windowDays).toBe(30);
    expect(analytics.trendsOver90Days.windowDays).toBe(90);
    expect(analytics.trendsOver30Days.points).toHaveLength(30);
    expect(analytics.trendsOver90Days.points).toHaveLength(90);
  });

  it("returns empty analytics for no sessions", () => {
    const now = new Date("2026-01-05T12:00:00.000Z");
    const analytics = computePersonalAnalytics({ sessions: [], now });

    expect(analytics.sessionsTotal).toBe(0);
    expect(analytics.sessionsCompleted).toBe(0);
    expect(analytics.completionRate).toBe(0);
    expect(analytics.insights[0]).toMatch(/No local Brenner Loop sessions/i);
  });

  it("counts hypothesis outcomes: falsified, robust, abandoned", () => {
    const now = new Date("2026-01-05T12:00:00.000Z");

    // Session with falsified hypothesis (confidence < 20)
    const sessionFalsified = sessionWithPrimaryHypothesis(
      "SESSION-FALSIFIED",
      "2026-01-04T10:00:00.000Z",
      "complete",
    );
    sessionFalsified.hypothesisCards[sessionFalsified.primaryHypothesisId].confidence = 10;

    // Session with robust hypothesis (confidence > 80 and complete)
    const sessionRobust = sessionWithPrimaryHypothesis(
      "SESSION-ROBUST",
      "2026-01-04T11:00:00.000Z",
      "complete",
    );
    sessionRobust.hypothesisCards[sessionRobust.primaryHypothesisId].confidence = 90;

    // Session with abandoned hypothesis
    const sessionAbandoned = sessionWithPrimaryHypothesis(
      "SESSION-ABANDONED",
      "2026-01-04T12:00:00.000Z",
      "intake",
    );
    const abandonedHypothesis = createTestHypothesis("SESSION-ABANDONED", 2, { confidence: 50 });
    sessionAbandoned.hypothesisCards[abandonedHypothesis.id] = abandonedHypothesis;
    sessionAbandoned.archivedHypothesisIds = [abandonedHypothesis.id];

    // Session with in-progress hypothesis (confidence 50, not complete)
    const sessionInProgress = sessionWithPrimaryHypothesis(
      "SESSION-INPROGRESS",
      "2026-01-04T13:00:00.000Z",
      "intake",
    );

    const analytics = computePersonalAnalytics({
      sessions: [sessionFalsified, sessionRobust, sessionAbandoned, sessionInProgress],
      now,
    });

    expect(analytics.hypothesesFalsified).toBe(1); // Only the low-confidence one
    expect(analytics.hypothesesRobust).toBe(1); // Only high-confidence in completed session
    expect(analytics.hypothesesAbandoned).toBe(1); // Archived hypothesis
  });

  it("counts revisions after evidence", () => {
    const now = new Date("2026-01-05T12:00:00.000Z");

    const session = sessionWithPrimaryHypothesis(
      "SESSION-REVISIONS",
      "2026-01-04T10:00:00.000Z",
      "revision",
    );
    session.hypothesisEvolution = [
      {
        fromVersionId: "HC-SESSION-REVISIONS-001-v1",
        toVersionId: "HC-SESSION-REVISIONS-001-v2",
        reason: "Evidence showed mechanism was different",
        trigger: "evidence",
        timestamp: "2026-01-04T11:00:00.000Z",
      },
      {
        fromVersionId: "HC-SESSION-REVISIONS-001-v2",
        toVersionId: "HC-SESSION-REVISIONS-001-v3",
        reason: "Refined after scale check",
        trigger: "level_split",
        timestamp: "2026-01-04T12:00:00.000Z",
      },
      {
        fromVersionId: "HC-SESSION-REVISIONS-001-v3",
        toVersionId: "HC-SESSION-REVISIONS-001-v4",
        reason: "Updated after new evidence",
        trigger: "evidence",
        timestamp: "2026-01-04T13:00:00.000Z",
      },
    ];

    const analytics = computePersonalAnalytics({ sessions: [session], now });

    expect(analytics.revisionsAfterEvidence).toBe(2); // Two evidence-triggered evolutions
  });

  it("uses externally provided objection stats", () => {
    const now = new Date("2026-01-05T12:00:00.000Z");
    const session = sessionWithPrimaryHypothesis(
      "SESSION-OBJECTIONS",
      "2026-01-04T10:00:00.000Z",
      "synthesis",
    );

    const analytics = computePersonalAnalytics({
      sessions: [session],
      now,
      objectionStats: { addressed: 5, accepted: 2 },
    });

    expect(analytics.objectionsAddressed).toBe(5);
    expect(analytics.objectionsAccepted).toBe(2);
  });

  it("defaults objection stats to zero when not provided", () => {
    const now = new Date("2026-01-05T12:00:00.000Z");
    const session = sessionWithPrimaryHypothesis(
      "SESSION-NO-OBJECTIONS",
      "2026-01-04T10:00:00.000Z",
      "intake",
    );

    const analytics = computePersonalAnalytics({ sessions: [session], now });

    expect(analytics.objectionsAddressed).toBe(0);
    expect(analytics.objectionsAccepted).toBe(0);
  });

  it("includes hypothesis-related achievements", () => {
    const now = new Date("2026-01-05T12:00:00.000Z");

    // Create sessions with enough falsified and robust hypotheses to unlock achievements
    const sessions: Session[] = [];
    for (let i = 0; i < 5; i++) {
      const session = sessionWithPrimaryHypothesis(
        `SESSION-FALSIFIED-${i}`,
        "2026-01-04T10:00:00.000Z",
        "complete",
      );
      session.hypothesisCards[session.primaryHypothesisId].confidence = 10;
      sessions.push(session);
    }
    for (let i = 0; i < 3; i++) {
      const session = sessionWithPrimaryHypothesis(
        `SESSION-ROBUST-${i}`,
        "2026-01-04T10:00:00.000Z",
        "complete",
      );
      session.hypothesisCards[session.primaryHypothesisId].confidence = 90;
      sessions.push(session);
    }

    const analytics = computePersonalAnalytics({ sessions, now });

    const hypothesisHunter = analytics.achievements.find((a) => a.id === "hypothesis-hunter");
    const robustThinker = analytics.achievements.find((a) => a.id === "robust-thinker");

    expect(hypothesisHunter).toBeDefined();
    expect(hypothesisHunter?.unlocked).toBe(true);
    expect(robustThinker).toBeDefined();
    expect(robustThinker?.unlocked).toBe(true);
  });
});
