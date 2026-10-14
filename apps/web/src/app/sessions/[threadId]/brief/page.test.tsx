import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHypothesisCard, createSession, sessionStorage } from "@/lib/brenner-loop";
import BriefPage from "./page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ threadId: "SESSION-BRIEF-1" }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("BriefPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("hydrates brief sections from sessionStorage and toggles Markdown Preview", async () => {
    const session = createSession({ id: "SESSION-BRIEF-1" });
    const card = createHypothesisCard({
      id: "HC-SESSION-BRIEF-1-001-v1",
      statement: "Morphogen gradients regulate neural crest migration speed",
      mechanism: "Concentration-dependent receptor activation",
      domain: ["developmental_biology"],
      predictionsIfTrue: ["Steeper gradient increases migration velocity"],
      predictionsIfFalse: ["Uniform concentration yields identical velocity"],
      impossibleIfTrue: ["Migration occurs normally in receptor-null mutants"],
      confidence: 75,
    });
    session.primaryHypothesisId = card.id;
    session.hypothesisCards = { [card.id]: card };
    await sessionStorage.save(session);

    render(<BriefPage />);

    expect(screen.getByRole("heading", { name: "Research Brief" })).toBeDefined();

    await waitFor(() => {
      expect(
        screen.getByText(/Morphogen gradients regulate neural crest migration speed/i),
      ).toBeDefined();
    });

    // Verify Procedural Memory (cm) Rules Extracted panel is rendered
    expect(screen.getByTestId("brief-memory-rules")).toBeDefined();
    expect(screen.getByText(/Procedural Memory \(cm\) Rules Extracted/i)).toBeDefined();

    // Verify 7-Dimension Brenner Method Scorecard and Session Replay & Assumption Cascade Audit
    expect(screen.getByTestId("brief-brenner-scorecard")).toBeDefined();
    expect(screen.getByText(/7-Dimension Brenner Method Scorecard/i)).toBeDefined();
    expect(screen.getByText(/Paradox Grounding/i)).toBeDefined();
    expect(screen.getByTestId("brief-replay-cascade-audit")).toBeDefined();
    expect(screen.getByText(/Session Replay & Assumption Cascade Audit/i)).toBeDefined();
    expect(screen.getByText(/Replay Verified/i)).toBeDefined();
    expect(screen.getByText(/What-If Falsification Cascade/i)).toBeDefined();

    // Toggle Review Markdown in Procedural Memory panel
    const reviewBtn = screen.getByRole("button", { name: /Review Markdown/i });
    fireEvent.click(reviewBtn);

    await waitFor(() => {
      expect(screen.getByTestId("brief-memory-review-markdown")).toBeDefined();
    });

    // Toggle Markdown Preview via Quick Action
    const previewBtn = screen.getByRole("button", { name: /^Preview$/i });
    fireEvent.click(previewBtn);

    await waitFor(() => {
      const preview = screen.getByTestId("brief-markdown-preview");
      expect(preview).toBeDefined();
      expect(preview.textContent).toContain("type: research_brief");
      expect(preview.textContent).toContain("## References");
    });

    // Verify Confidence Calibration & Brier Score Audit card
    const calibrationCard = screen.getByTestId("brief-calibration-card");
    expect(calibrationCard).toBeDefined();
    expect(calibrationCard.textContent).toContain("Confidence Calibration & Brier Score Audit");
    expect(calibrationCard.textContent).toContain("Brier");

    // Verify Checksummed Export & Citation Index Inspector
    const exportPanel = screen.getByTestId("research-brief-export-panel");
    expect(exportPanel).toBeDefined();

    const inspectCitationsBtn = screen.getByRole("button", { name: /Inspect Citation Index/i });
    fireEvent.click(inspectCitationsBtn);

    await waitFor(() => {
      const citationInspector = screen.getByTestId("brief-citation-index-inspector");
      expect(citationInspector).toBeDefined();
      expect(citationInspector.textContent).toContain("Structured Citation Index");
      expect(citationInspector.textContent).toContain("## References");
    });

    const verifyJsonBtn = screen.getByRole("button", {
      name: /Verify SHA-256 JSON Round-Trip/i,
    });
    fireEvent.click(verifyJsonBtn);

    await waitFor(() => {
      const status = screen.getByTestId("brief-import-verification-status");
      expect(status.textContent).toContain("Verified brenner-research-brief-v1");
    });

    // Verify LaTeX (.tex) export format is enabled and no Coming Soon placeholder remains
    expect(screen.getByText(".tex")).toBeDefined();
    expect(screen.queryByText(/Coming Soon/i)).toBeNull();
  });
});

