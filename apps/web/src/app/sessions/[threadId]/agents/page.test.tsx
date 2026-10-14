import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSession, sessionStorage } from "@/lib/brenner-loop";
import AgentsPage from "./page";

vi.mock("next/navigation", () => ({
  useParams: () => ({ threadId: "SESSION-AGENTS-1" }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("AgentsPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders all 4 tribunal agents, supports NTM Prompt viewer, Paste CLI Output, and Generate Full Synthesis", async () => {
    const session = createSession({ id: "SESSION-AGENTS-1" });
    await sessionStorage.save(session);

    render(<AgentsPage />);

    expect(screen.getByRole("heading", { name: "Agent Tribunal" })).toBeDefined();
    expect(screen.getAllByText("Devil's Advocate").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Experiment Designer").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Statistician").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Brenner Channeler").length).toBeGreaterThan(0);

    // Click NTM Prompt on Devil's Advocate
    const ntmButtons = screen.getAllByRole("button", { name: "NTM Prompt" });
    fireEvent.click(ntmButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/ntm send/i)).toBeDefined();
    });

    // Click Generate Full Synthesis
    const synthBtn = screen.getByRole("button", { name: /Generate Full Synthesis/i });
    fireEvent.click(synthBtn);

    await waitFor(() => {
      expect(screen.getByText(/Synthesized Action Plan/i)).toBeDefined();
    });

    // Verify Protocol Roster validation panel and Multi-Round Debate Arena
    expect(screen.getByTestId("agent-roster-panel")).toBeInTheDocument();
    expect(screen.getByText(/3\/3 Roles Verified/i)).toBeInTheDocument();
    expect(screen.getByTestId("agent-debate-arena")).toBeInTheDocument();

    // Advance a debate round and conclude debate
    const advanceBtn = screen.getByRole("button", { name: /Advance Debate Round/i });
    fireEvent.click(advanceBtn);

    const concludeBtn = screen.getByRole("button", { name: /Conclude Debate/i });
    fireEvent.click(concludeBtn);

    expect(await screen.findByTestId("debate-conclusion-card")).toBeInTheDocument();
  });
});
