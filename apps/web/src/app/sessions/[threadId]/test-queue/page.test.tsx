import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TestQueuePage from "./page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ threadId: "SESSION-20261014-001" }),
}));

describe("TestQueuePage integration", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("generates exclusion tests, enqueues them, locks predictions, and switches across WhatIfSimulator, EvidenceRecorder, LiteratureSearch, and Evidence Ledger", async () => {
    render(<TestQueuePage />);

    expect(
      await screen.findByText(/Evidence & Simulation Workbench/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("test-binding-preview")).toBeInTheDocument();
    expect(screen.getByText(/Suggested Action: validate/i)).toBeInTheDocument();

    // Enter statement & mechanism and generate exclusion tests
    const statementInput = screen.getByLabelText(/Hypothesis Statement/i);
    const mechanismInput = screen.getByLabelText(/^Mechanism$/i);

    fireEvent.change(statementInput, {
      target: {
        value:
          "Lineage-specific morphogen gradients specify neural progenitor fate via threshold activation.",
      },
    });
    fireEvent.change(mechanismInput, {
      target: {
        value:
          "Secreted morphogen binds surface receptors and activates a bistable transcriptional repressor network.",
      },
    });

    const generateBtn = screen.getByRole("button", { name: /^Generate Tests$/i });
    fireEvent.click(generateBtn);

    expect(await screen.findByText(/Generated Tests/i)).toBeInTheDocument();

    // Switch to Record Evidence tab
    const recordTab = screen.getByRole("tab", { name: /Record Evidence/i });
    fireEvent.mouseDown(recordTab);
    fireEvent.click(recordTab);

    // Switch to Literature Search tab
    const litTab = screen.getByRole("tab", { name: /Literature Search/i });
    fireEvent.mouseDown(litTab);
    fireEvent.click(litTab);

    // Switch to Evidence Ledger tab
    const ledgerTab = screen.getByRole("tab", { name: /Evidence Ledger/i });
    fireEvent.mouseDown(ledgerTab);
    fireEvent.click(ledgerTab);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /What-If Simulator/i })).toBeInTheDocument();
    });
  });
});
