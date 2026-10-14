import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sessionStorage } from "@/lib/brenner-loop";
import HypothesisPage from "./page";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ threadId: "SESSION-20261014-001" }),
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe("HypothesisPage integration", () => {
  beforeEach(() => {
    pushMock.mockReset();
    window.localStorage.clear();
  });

  it("edits, saves to sessionStorage, locks predictions, evolves version, and opens Templates & Falsification Ceremony", async () => {
    render(<HypothesisPage />);

    expect(
      await screen.findByText(/Competing Hypotheses Arena & Comparison Matrix/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Compare Hypotheses/i).length).toBeGreaterThan(0);

    // Edit and save hypothesis statement
    const editBtn = screen.getByRole("button", { name: /^Edit$/i });
    fireEvent.click(editBtn);

    const statementInput = screen.getByLabelText(/Hypothesis statement/i);
    fireEvent.change(statementInput, {
      target: {
        value:
          "Lineage-specific transcription factor gradients specify neural fate via bistable toggle switches.",
      },
    });

    const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(async () => {
      const saved = await sessionStorage.load("SESSION-20261014-001");
      expect(saved).not.toBeNull();
      const primary = saved?.hypothesisCards[saved.primaryHypothesisId];
      expect(primary?.statement).toContain("bistable toggle switches");
    });

    // Lock all predictions
    const lockAllBtn = screen.getByRole("button", { name: /Lock All Predictions/i });
    fireEvent.click(lockAllBtn);

    await waitFor(() => {
      expect(screen.getByText(/6 Locked/i)).toBeInTheDocument();
    });

    // Evolve hypothesis
    const evolveBtn = screen.getByRole("button", { name: /^Evolve$/i });
    fireEvent.click(evolveBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/v4/i).length).toBeGreaterThan(0);
    });

    // Open Template Selector
    const templatesBtn = screen.getByRole("button", { name: /^Templates$/i });
    fireEvent.click(templatesBtn);
    expect(await screen.findByText(/Hypothesis Template Library/i)).toBeInTheDocument();

    // Open Falsification Ceremony
    const falsifyBtn = screen.getByRole("button", { name: /Falsify/i });
    fireEvent.click(falsifyBtn);
    expect(
      await screen.findByText(/Theory-Kill & Falsification Ceremony/i),
    ).toBeInTheDocument();
  });
});
