import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionList } from "@/components/brenner-loop/SessionList";
import { createSession, sessionStorage } from "@/lib/brenner-loop";
import { LocalSessionHub } from "./LocalSessionHub";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe("SessionList & LocalSessionHub integration", () => {
  beforeEach(async () => {
    pushMock.mockReset();
    window.localStorage.clear();
  });

  it("creates a new local session from SessionList using SessionTemplateSelector and DomainSelector", async () => {
    render(<SessionList />);

    const newSessionBtn = await screen.findByRole("button", { name: /\+ New Local Session/i });
    fireEvent.click(newSessionBtn);

    expect(await screen.findByText(/Configure New Local Brenner Session/i)).toBeInTheDocument();

    const questionInput = screen.getByLabelText(/Research Question/i);
    fireEvent.change(questionInput, {
      target: { value: "How does lineage specification occur in C. elegans?" },
    });

    const hypothesisInput = screen.getByLabelText(/Initial Hypothesis Statement/i);
    fireEvent.change(hypothesisInput, {
      target: { value: "Cell-autonomous asymmetric division drives fate commitment" },
    });

    const launchBtn = screen.getByRole("button", { name: /Launch Local Session/i });
    fireEvent.click(launchBtn);

    await waitFor(async () => {
      const list = await sessionStorage.list();
      expect(list.length).toBe(1);
      expect(list[0]?.researchQuestion).toBe(
        "How does lineage specification occur in C. elegans?",
      );
      expect(pushMock).toHaveBeenCalledWith(`/sessions/${list[0]?.id}`);
    });
  });

  it("renders LocalSessionHub and toggles between Overview and Interactive Phase Cockpit", async () => {
    const session = createSession({
      id: "SESSION-20261014-001",
      researchQuestion: "What controls synaptic pruning?",
      domain: "neuroscience",
    });
    await sessionStorage.save(session);

    render(<LocalSessionHub sessionId="SESSION-20261014-001" />);

    expect(await screen.findByText("SESSION-20261014-001")).toBeInTheDocument();
    expect(
      screen.getByText(/11-Phase Interactive Brenner Loop Cockpit/i),
    ).toBeInTheDocument();

    // Open Coach Settings modal and close it
    const coachBtn = screen.getByRole("button", { name: /Coach Settings/i });
    fireEvent.click(coachBtn);
    expect(await screen.findByText(/Brenner Coach Settings/i)).toBeInTheDocument();
    const closeCoachBtn = screen.getByRole("button", { name: /Close coach settings/i });
    fireEvent.click(closeCoachBtn);

    // Switch to Interactive Phase Cockpit
    const cockpitBtn = await screen.findByRole("button", { name: /Interactive Phase Cockpit/i });
    fireEvent.click(cockpitBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Intake/i).length).toBeGreaterThan(0);
    });
  });
});
