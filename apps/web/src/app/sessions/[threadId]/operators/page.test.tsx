import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSession, sessionStorage } from "@/lib/brenner-loop";
import OperatorsPage from "./page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ threadId: "SESSION-OPS-1" }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("OperatorsPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders operator palette and toggles between Quick Notes and Guided Interactive Wizard", async () => {
    const session = createSession({ id: "SESSION-OPS-1" });
    await sessionStorage.save(session);

    render(<OperatorsPage />);

    expect(screen.getByRole("heading", { name: "Operators" })).toBeDefined();
    expect(screen.getAllByText("Level Split").length).toBeGreaterThan(0);

    // Switch to Guided Interactive Wizard
    const wizardBtn = screen.getByRole("button", { name: "Guided Interactive Wizard" });
    fireEvent.click(wizardBtn);

    await waitFor(() => {
      // LevelSplitSession renders a multi-step wizard for Level Split
      expect(screen.getByText(/Step 1/i)).toBeDefined();
    });

    // Switch back to Quick Notes, fill in Level Split fields, and Mark Complete
    fireEvent.click(screen.getByRole("button", { name: "Quick Notes" }));

    fireEvent.change(
      screen.getByPlaceholderText(/What level is your hypothesis currently operating at/i),
      { target: { value: "Organismal anxiety behavior" } },
    );
    fireEvent.change(
      screen.getByPlaceholderText(/What other levels might be relevant/i),
      { target: { value: "Molecular dopamine receptor signaling and social peer networks" } },
    );
    fireEvent.change(
      screen.getByPlaceholderText(/What confounds arise from level confusion/i),
      { target: { value: "Conflating acute notification arousal with chronic mood disorder" } },
    );

    const completeBtn = screen.getByRole("button", { name: /Mark Complete/i });
    fireEvent.click(completeBtn);

    await waitFor(async () => {
      const updated = await sessionStorage.load("SESSION-OPS-1");
      expect(updated?.operatorApplications.levelSplit.length).toBe(1);
    });
  });
});
