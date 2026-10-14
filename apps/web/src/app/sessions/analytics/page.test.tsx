import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createHypothesisCard,
  createSession,
  generateHypothesisCardId,
  sessionStorage,
} from "@/lib/brenner-loop";
import PersonalAnalyticsPage from "./page";

describe("PersonalAnalyticsPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("computes and renders personal analytics, failure mode structural vulnerability scan, and Brier score calibration", async () => {
    const session = createSession({
      id: "SESSION-ANALYTICS-1",
      domain: "Psychology",
      createdBy: "analyst",
    });
    const cardId = generateHypothesisCardId("SESSION-ANALYTICS-1", 1, 1);
    const card = createHypothesisCard({
      id: cardId,
      statement: "Dopamine notifications drive adolescent anxiety",
      mechanism: "Intermittent variable rewards",
      domain: ["Psychology"],
      predictionsIfTrue: ["Reduced screen time lowers cortisol"],
      predictionsIfFalse: ["Cortisol unchanged"],
      impossibleIfTrue: ["Heavy notification exposure lowers salivary cortisol"],
      confidence: 85,
      sessionId: "SESSION-ANALYTICS-1",
    });
    session.hypothesisCards[cardId] = card;
    session.primaryHypothesisId = cardId;
    session.phase = "complete";
    session.evidenceLedger.push({
      id: "EV-1",
      testId: "T-1",
      recordedAt: new Date().toISOString(),
      observation: "Observed 22% drop in salivary cortisol after 14-day notification block",
      result: "supports",
      potencyCheckPassed: true,
      recordedBy: "analyst",
      confidenceDelta: 15,
      matchedHypothesisId: cardId,
    });
    await sessionStorage.save(session);

    render(<PersonalAnalyticsPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Failure Mode & Structural Pattern Analytics/i),
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/Confidence Calibration & Brier Score/i)).toBeInTheDocument();
    expect(screen.getByText(/Missing Falsification Criteria/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Brier Score/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Calibration Bias Assessment/i)).toBeInTheDocument();
  });
});
