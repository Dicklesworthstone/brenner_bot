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

    // Toggle Markdown Preview via Quick Action
    const previewBtn = screen.getByRole("button", { name: /Preview/i });
    fireEvent.click(previewBtn);

    await waitFor(() => {
      expect(screen.getByTestId("brief-markdown-preview")).toBeDefined();
    });
  });
});
